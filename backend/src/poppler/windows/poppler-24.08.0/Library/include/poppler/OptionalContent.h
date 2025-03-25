//========================================================================
//
// OptionalContent.h
//
// Copyright 2007 Brad Hards <bradh@kde.org>
// Copyright 2008 Carlos Garcia Campos <carlosgc@gnome.org>
// Copyright 2013, 2018, 2019, 2021 Albert Astals Cid <aacid@kde.org>
// Copyright 2018 Adam Reichold <adam.reichold@t-online.de>
// Copyright 2019 Oliver Sander <oliver.sander@tu-dresden.de>
//
// Released under the GPL (version 2, or later, at your option)
//
//========================================================================

#ifndef OPTIONALCONTENT_H
#define OPTIONALCONTENT_H

#include "Object.h"
#include "CharTypes.h"
#include "poppler_private_export.h"
#include <unordered_map>
#include <memory>

class GooString;
class XRef;

class OptionalContentGroup;

//------------------------------------------------------------------------

class POPPLER_PRIVATE_EXPORT OCGs
{
public:
    OCGs(Object *ocgObject, XRef *xref);

    OCGs(const OCGs &) = delete;
    OCGs &operator=(const OCGs &) = delete;

    // Is OCGS valid?
    bool isOk() const { return ok; }

    bool hasOCGs() const;
    const std::unordered_map<Ref, std::unique_ptr<OptionalContentGroup>> &getOCGs() const { return optionalContentGroups; }

    OptionalContentGroup *findOcgByRef(const Ref ref);

    Array *getOrderArray() { return (order.isArray() && order.arrayGetLength() > 0) ? order.getArray() : nullptr; }
    Array *getRBGroupsArray() { return (rbgroups.isArray() && rbgroups.arrayGetLength()) ? rbgroups.getArray() : nullptr; }

    bool optContentIsVisible(const Object *dictRef);

private:
    bool ok;

    bool evalOCVisibilityExpr(const Object *expr, int recursion);
    bool allOn(Array *ocgArray);
    bool allOff(Array *ocgArray);
    bool anyOn(Array *ocgArray);
    bool anyOff(Array *ocgArray);

    std::unordered_map<Ref, std::unique_ptr<OptionalContentGroup>> optionalContentGroups;

    Object order;
    Object rbgroups;
    XRef *m_xref;
};

//------------------------------------------------------------------------

class POPPLER_PRIVATE_EXPORT OptionalContentGroup
{
public:
    enum State
    {
        On,
        Off
    };

    // Values from the optional content usage dictionary.
    enum UsageState
    {
        ocUsageOn,
        ocUsageOff,
        ocUsageUnset
    };

    explicit OptionalContentGroup(Dict *dict);

    explicit OptionalContentGroup(GooString *label);

    ~OptionalContentGroup();

    OptionalContentGroup(const OptionalContentGroup &) = delete;
    OptionalContentGroup &operator=(const OptionalContentGroup &) = delete;

    const GooString *getName() const;

    Ref getRef() const;
    void setRef(const Ref ref);

    State getState() const { return m_state; };
    void setState(State state) { m_state = state; };

    UsageState getViewState() const { return viewState; }
    UsageState getPrintState() const { return printState; }

private:
    GooString *m_name;
    Ref m_ref;
    State m_state;
    UsageState viewState; // suggested state when viewing
    UsageState printState; // suggested state when printing
};

//------------------------------------------------------------------------

#endif
