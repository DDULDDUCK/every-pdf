import React, { useState } from 'react';
import PDFDropzone from './PDFDropzone';
import { useTranslation } from 'next-i18next';

interface SecurityPanelProps {
  selectedFile: File | null;
  onFileSelect: (files: File[]) => void;
  onEncrypt: (password: string) => void;
  onDecrypt: (password: string) => void;
  mode: 'encrypt' | 'decrypt';
  setMode: (mode: 'encrypt' | 'decrypt') => void;
}

export default function SecurityPanel({
  selectedFile,
  onFileSelect,
  onEncrypt,
  onDecrypt,
  mode,
  setMode
}: SecurityPanelProps) {
  const [password, setPassword] = useState('');
  const { t } = useTranslation('security');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'encrypt') {
      onEncrypt(password);
    } else {
      onDecrypt(password);
    }
    setPassword('');
  };

  return (
    <div className="w-72 p-4 rounded-lg flex flex-col gap-4 overflow-y-auto bg-panel-bg theme-transition">
      <div className="p-4 rounded-lg shadow-sm bg-card-bg theme-transition">
        <h3 className="text-lg font-semibold mb-4 text-text theme-transition">{t('title', 'PDF 보안')}</h3>
        <div className="space-y-3">
          <PDFDropzone
            onDrop={files => files[0] && onFileSelect([files[0]])}
            onDragOver={(e) => e.preventDefault()}
            className="h-32 mb-4"
            multiple={false}
            accept=".pdf"
          >
            <div className="text-button-text text-center text-sm">
              {t('dropzone', 'PDF 파일을 드래그하거나 클릭하여 선택하세요')}
            </div>
          </PDFDropzone>

          {selectedFile && (
            <div className="panel-selected-file">
              <p className="panel-selected-file-text" title={selectedFile.name}>
                {t('selectedFile', { file: selectedFile.name, defaultValue: '선택된 파일: {{file}}' })}
              </p>
            </div>
          )}

          <div className="mb-4 flex justify-center gap-2">
            <button
              className={`px-4 py-2 rounded-lg font-medium theme-transition ${
                mode === 'encrypt'
                  ? 'bg-primary text-button-text-selected'
                  : 'bg-button-bg text-button-text hover:bg-button-hover'
              }`}
              onClick={() => setMode('encrypt')}
            >
              {t('encrypt', '암호화')}
            </button>
            <button
              className={`px-4 py-2 rounded-lg font-medium theme-transition ${
                mode === 'decrypt'
                  ? 'bg-primary text-button-text-selected'
                  : 'bg-button-bg text-button-text hover:bg-button-hover'
              }`}
              onClick={() => setMode('decrypt')}
            >
              {t('decrypt', '복호화')}
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium mb-1 text-text theme-transition"
              >
                {t('password', '비밀번호')}
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="form-input w-full"
                required
              />
            </div>

            <button
              type="submit"
              disabled={!selectedFile}
              className={`w-full py-2 rounded-lg theme-transition ${
                !selectedFile 
                  ? 'bg-button-bg text-button-text opacity-60 cursor-not-allowed'
                  : 'bg-primary text-button-text-selected cursor-pointer'
              }`}
            >
              {mode === 'encrypt'
                ? t('encryptAction', '암호화하기')
                : t('decryptAction', '복호화하기')}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}