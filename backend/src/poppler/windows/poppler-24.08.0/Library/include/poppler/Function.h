//========================================================================
//
// Function.h
//
// Copyright 2001-2003 Glyph & Cog, LLC
//
//========================================================================

//========================================================================
//
// Modified under the Poppler project - http://poppler.freedesktop.org
//
// All changes made under the Poppler project to this file are licensed
// under GPL version 2 or later
//
// Copyright (C) 2009, 2010, 2018, 2019, 2021, 2024 Albert Astals Cid <aacid@kde.org>
// Copyright (C) 2010 Christian Feuersänger <cfeuersaenger@googlemail.com>
// Copyright (C) 2011 Andrea Canciani <ranma42@gmail.com>
// Copyright (C) 2012 Thomas Freitag <Thomas.Freitag@alfa.de>
// Copyright (C) 2012 Adam Reichold <adamreichold@myopera.com>
//
// To see a description of the changes please see the Changelog file that
// came with your tarball or type make ChangeLog if you are building from git
//
//========================================================================

#ifndef FUNCTION_H
#define FUNCTION_H

#include "Object.h"
#include <set>

class Dict;
class Stream;
struct PSObject;
class PSStack;

//------------------------------------------------------------------------
// Function
//------------------------------------------------------------------------

#define funcMaxInputs 32
#define funcMaxOutputs 32
#define sampledFuncMaxInputs 16

class POPPLER_PRIVATE_EXPORT Function
{
public:
    Function();

    virtual ~Function();

    Function(const Function &) = delete;
    Function &operator=(const Function &other) = delete;

    // Construct a function.  Returns NULL if unsuccessful.
    static Function *parse(Object *funcObj);

    // Initialize the entries common to all function types.
    bool init(Dict *dict);

    virtual Function *copy() const = 0;

    enum class Type
    {
        Identity,
        Sampled,
        Exponential,
        Stitching,
        PostScript
    };

    virtual Type getType() const = 0;

    // Return size of input and output tuples.
    int getInputSize() const { return m; }
    int getOutputSize() const { return n; }

    double getDomainMin(int i) const { return domain[i][0]; }
    double getDomainMax(int i) const { return domain[i][1]; }
    double getRangeMin(int i) const { return range[i][0]; }
    double getRangeMax(int i) const { return range[i][1]; }
    bool getHasRange() const { return hasRange; }
    virtual bool hasDifferentResultSet(const Function *func) const { return false; }

    // Transform an input tuple into an output tuple.
    virtual void transform(const double *in, double *out) const = 0;

    virtual bool isOk() const = 0;

protected:
    static Function *parse(Object *funcObj, std::set<int> *usedParents);

    explicit Function(const Function *func);

    int m, n; // size of input and output tuples
    double // min and max values for function domain
            domain[funcMaxInputs][2];
    double // min and max values for function range
            range[funcMaxOutputs][2];
    bool hasRange; // set if range is defined
};

//------------------------------------------------------------------------
// IdentityFunction
//------------------------------------------------------------------------

class IdentityFunction : public Function
{
public:
    IdentityFunction();
    ~IdentityFunction() override;
    Function *copy() const override { return new IdentityFunction(); }
    Type getType() const override { return Type::Identity; }
    void transform(const double *in, double *out) const override;
    bool isOk() const override { return true; }

private:
};

//------------------------------------------------------------------------
// SampledFunction
//------------------------------------------------------------------------

class SampledFunction : public Function
{
public:
    SampledFunction(Object *funcObj, Dict *dict);
    ~SampledFunction() override;
    Function *copy() const override { return new SampledFunction(this); }
    Type getType() const override { return Type::Sampled; }
    void transform(const double *in, double *out) const override;
    bool isOk() const override { return ok; }
    bool hasDifferentResultSet(const Function *func) const override;

    int getSampleSize(int i) const { return sampleSize[i]; }
    double getEncodeMin(int i) const { return encode[i][0]; }
    double getEncodeMax(int i) const { return encode[i][1]; }
    double getDecodeMin(int i) const { return decode[i][0]; }
    double getDecodeMax(int i) const { return decode[i][1]; }
    const double *getSamples() const { return samples; }
    int getSampleNumber() const { return nSamples; }

private:
    explicit SampledFunction(const SampledFunction *func);

    int // number of samples for each domain element
            sampleSize[funcMaxInputs];
    double // min and max values for domain encoder
            encode[funcMaxInputs][2];
    double // min and max values for range decoder
            decode[funcMaxOutputs][2];
    double // input multipliers
            inputMul[funcMaxInputs];
    int *idxOffset;
    double *samples; // the samples
    int nSamples; // size of the samples array
    double *sBuf; // buffer for the transform function
    mutable double cacheIn[funcMaxInputs];
    mutable double cacheOut[funcMaxOutputs];
    bool ok;
};

//------------------------------------------------------------------------
// ExponentialFunction
//------------------------------------------------------------------------

class ExponentialFunction : public Function
{
public:
    ExponentialFunction(Object *funcObj, Dict *dict);
    ~ExponentialFunction() override;
    Function *copy() const override { return new ExponentialFunction(this); }
    Type getType() const override { return Type::Exponential; }
    void transform(const double *in, double *out) const override;
    bool isOk() const override { return ok; }

    const double *getC0() const { return c0; }
    const double *getC1() const { return c1; }
    double getE() const { return e; }

private:
    explicit ExponentialFunction(const ExponentialFunction *func);

    double c0[funcMaxOutputs];
    double c1[funcMaxOutputs];
    double e;
    bool isLinear;
    bool ok;
};

//------------------------------------------------------------------------
// StitchingFunction
//------------------------------------------------------------------------

class StitchingFunction : public Function
{
public:
    StitchingFunction(Object *funcObj, Dict *dict, std::set<int> *usedParents);
    ~StitchingFunction() override;
    Function *copy() const override { return new StitchingFunction(this); }
    Type getType() const override { return Type::Stitching; }
    void transform(const double *in, double *out) const override;
    bool isOk() const override { return ok; }

    int getNumFuncs() const { return k; }
    const Function *getFunc(int i) const { return funcs[i]; }
    const double *getBounds() const { return bounds; }
    const double *getEncode() const { return encode; }
    const double *getScale() const { return scale; }

private:
    explicit StitchingFunction(const StitchingFunction *func);

    int k;
    Function **funcs;
    double *bounds;
    double *encode;
    double *scale;
    bool ok;
};

//------------------------------------------------------------------------
// PostScriptFunction
//------------------------------------------------------------------------

class PostScriptFunction : public Function
{
public:
    PostScriptFunction(Object *funcObj, Dict *dict);
    ~PostScriptFunction() override;
    Function *copy() const override { return new PostScriptFunction(this); }
    Type getType() const override { return Type::PostScript; }
    void transform(const double *in, double *out) const override;
    bool isOk() const override { return ok; }

    const GooString *getCodeString() const { return codeString; }

private:
    explicit PostScriptFunction(const PostScriptFunction *func);
    bool parseCode(Stream *str, int *codePtr);
    std::unique_ptr<GooString> getToken(Stream *str);
    void resizeCode(int newSize);
    void exec(PSStack *stack, int codePtr) const;

    GooString *codeString;
    PSObject *code;
    int codeSize;
    mutable double cacheIn[funcMaxInputs];
    mutable double cacheOut[funcMaxOutputs];
    bool ok;
};

#endif
