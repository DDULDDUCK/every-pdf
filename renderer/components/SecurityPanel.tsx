import React, { useState } from 'react';
import { Switch } from '@headlessui/react';
import PDFDropzone from './PDFDropzone';

interface SecurityPanelProps {
  selectedFile: File | null;
  onFileSelect: (files: File[]) => void;
  onEncrypt: (password: string) => void; // Removed allowPrinting and allowCommenting
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'encrypt') {
      onEncrypt(password); // Removed allowPrinting and allowCommenting
    } else {
      onDecrypt(password);
    }
    setPassword('');
  };

  return (
    <div className="w-72 bg-gray-50 p-4 rounded-lg flex flex-col gap-4 overflow-y-auto">
      <div className="bg-white p-4 rounded-lg shadow-sm">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">PDF 보안</h3>
        <div className="space-y-3">
          <PDFDropzone
            onDrop={files => files[0] && onFileSelect([files[0]])}
            onDragOver={(e) => e.preventDefault()}
            className="h-32 mb-4"
            multiple={false}
            accept=".pdf"
          >
            <div className="text-gray-500 text-center text-sm">
              PDF 파일을 드래그하거나 클릭하여 선택하세요
            </div>
          </PDFDropzone>

          {selectedFile && (
            <div className="p-2 bg-blue-50 rounded-md mb-4">
              <p className="text-sm text-blue-600 truncate" title={selectedFile.name}>
                선택된 파일: {selectedFile.name}
              </p>
            </div>
          )}

          <div className="mb-4 flex justify-center gap-2">
            <button
              className={`px-4 py-2 rounded-lg font-medium transition-colors duration-200 ${
                mode === 'encrypt'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              onClick={() => setMode('encrypt')}
            >
              암호화
            </button>
            <button
              className={`px-4 py-2 rounded-lg font-medium transition-colors duration-200 ${
                mode === 'decrypt'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              onClick={() => setMode('decrypt')}
            >
              복호화
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                비밀번호
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            {/* Removed permission settings as pypdf doesn't support them */}

            <button
              type="submit"
              disabled={!selectedFile}
              className="w-full py-2 bg-blue-500 text-white rounded-lg 
                      hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed
                      transition-colors duration-200"
            >
              {mode === 'encrypt' ? '암호화하기' : '복호화하기'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}