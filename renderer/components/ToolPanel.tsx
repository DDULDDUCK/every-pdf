import React, { useState } from 'react';
import SecurityPanel from './SecurityPanel';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import PDFDropzone from './PDFDropzone';

interface ToolPanelProps {
  selectedAction: 'split' | 'merge' | 'rotate' | 'convert-to-pdf' | 'convert-from-pdf' | 'security' | null;
  onSplit: (pages: string) => void;
  onMerge: (files: File[]) => void;
  onRotate: (pages: string, angle: number, includeUnspecified: boolean) => void;
  onConvertToPDF: (files: File[], sourceFormat: 'txt' | 'html' | 'image') => void;
  onConvertFromPDF: (file: File, targetFormat: 'docx' | 'image', imageFormat?: 'jpg' | 'png') => void;
  onEncrypt?: (file: File, password: string, allowPrinting: boolean, allowCommenting: boolean) => void;
  onDecrypt?: (file: File, password: string) => void;
  isProcessing: boolean;
  selectedFiles: File[];
  selectedFile: File | null;
  onFileSelect: (files: File[]) => void;
  onRemoveFile: (index: number) => void;
  onFilePreview?: (file: File) => void;
  onReorderFiles?: (startIndex: number, endIndex: number) => void;
  selectedFormat: 'txt' | 'html' | 'image' | null;
  onFormatSelect: (format: 'txt' | 'html' | 'image' | null) => void;
}

const ToolPanel: React.FC<ToolPanelProps> = ({
  selectedAction,
  onSplit,
  onMerge,
  onRotate,
  onConvertToPDF,
  onConvertFromPDF,
  onEncrypt,
  onDecrypt,
  isProcessing,
  selectedFiles,
  selectedFile,
  onFileSelect,
  onRemoveFile,
  onFilePreview,
  onReorderFiles,
  selectedFormat,
  onFormatSelect,
}) => {
  const [pages, setPages] = React.useState('');
  const [rotationPages, setRotationPages] = React.useState('');
  const [rotationAngle, setRotationAngle] = React.useState(90);
  const [rotationType, setRotationType] = React.useState<'all' | 'selected'>('all');
  const [includeUnspecified, setIncludeUnspecified] = React.useState(false);

  // 포맷 변경 시 선택된 파일 초기화
  React.useEffect(() => {
    // 여기서 상위 컴포넌트에 파일 초기화 알림
    if (selectedFormat === 'image') {
      // 이미지 포맷은 그대로 유지 (여러 파일 선택 가능)
    } else {
      // 다른 포맷으로 변경 시 파일 초기화
      onFileSelect([]);
    }
  }, [selectedFormat]);

  if (!selectedAction) return null;

  return (
    <div className="w-72 bg-gray-50 p-4 rounded-lg flex flex-col gap-4 overflow-y-auto">
      {selectedAction === 'split' && (
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">PDF 분할</h3>
          <div className="space-y-3">
            <PDFDropzone
              onDrop={files => files[0] && onFileSelect([files[0]])}
              onDragOver={(e) => e.preventDefault()}
              className="h-32 mb-4"
              multiple={false}
            >
              <div className="text-gray-500 text-center text-sm">
                PDF 파일을 드래그하거나 클릭하여 선택하세요
              </div>
            </PDFDropzone>

            {selectedFile && (
              <div className="p-2 bg-blue-50 rounded-md">
                <p className="text-sm text-blue-600 truncate">
                  선택된 파일: {selectedFile.name}
                </p>
              </div>
            )}

            <label className="block text-sm text-gray-600">페이지 범위</label>
            <input
              type="text"
              value={pages}
              onChange={(e) => setPages(e.target.value)}
              placeholder="예: 1-3,5,7-9"
              className="w-full p-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            />
            <button
              onClick={() => onSplit(pages)}
              disabled={isProcessing || !pages || !selectedFile}
              className="w-full py-2 bg-blue-500 text-white rounded-lg 
                       hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed
                       transition-colors duration-200"
            >
              분할하기
            </button>
          </div>
        </div>
      )}

      {selectedAction === 'merge' && (
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">PDF 병합</h3>
          <div className="space-y-3">
            <PDFDropzone
              onDrop={files => onFileSelect([...selectedFiles, ...files])}
              onDragOver={(e) => e.preventDefault()}
              className="h-32"
              multiple={true}
            >
              <div className="text-gray-500 text-center text-sm">
                PDF 파일을 드래그하거나 클릭하여 선택하세요<br />
                <span className="text-xs">(Shift 키를 누른 채로 여러 파일 선택 가능)</span>
              </div>
            </PDFDropzone>

            {selectedFiles.length > 0 && (
              <div className="mt-4 space-y-2">
                <h4 className="text-sm text-gray-600">
                  선택된 파일 ({selectedFiles.length})
                </h4>
                <DragDropContext
                  onDragEnd={(result: DropResult) => {
                    if (!result.destination || !onReorderFiles) return;
                    onReorderFiles(result.source.index, result.destination.index);
                  }}
                >
                  <Droppable droppableId="file-list">
                    {(provided) => (
                      <div
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                        className="max-h-40 overflow-y-auto border border-gray-200 rounded-md p-2 space-y-2"
                      >
                        {selectedFiles.map((file, index) => (
                          <Draggable key={file.name} draggableId={file.name} index={index}>
                            {(provided) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className="flex items-center justify-between p-2 bg-gray-50 rounded-md hover:bg-gray-100"
                              >
                                <div className="flex items-center flex-1 min-w-0">
                                  <span className="text-gray-400 mr-2">::</span>
                                  <button
                                    onClick={() => onFilePreview?.(file)}
                                    className="text-sm text-gray-700 truncate flex-1 text-left hover:text-blue-600"
                                    title={file.name}
                                  >
                                    {file.name}
                                  </button>
                                </div>
                                <button
                                  onClick={() => onRemoveFile(index)}
                                  className="ml-2 p-1 text-gray-500 hover:text-red-500
                                          hover:bg-gray-200 rounded transition-colors duration-200 flex-shrink-0"
                                >
                                  ✕
                                </button>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </DragDropContext>
                <button
                  onClick={() => onMerge(selectedFiles)}
                  disabled={isProcessing || selectedFiles.length < 2}
                  className="w-full py-2 bg-blue-500 text-white rounded-lg
                           hover:bg-blue-600 disabled:bg-gray-400 
                           disabled:cursor-not-allowed transition-colors duration-200"
                >
                  병합하기
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {selectedAction === 'rotate' && (
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">PDF 회전</h3>
          <div className="space-y-3">
            <PDFDropzone
              onDrop={files => files[0] && onFileSelect([files[0]])}
              onDragOver={(e) => e.preventDefault()}
              className="h-32 mb-4"
              multiple={false}
            >
              <div className="text-gray-500 text-center text-sm">
                PDF 파일을 드래그하거나 클릭하여 선택하세요
              </div>
            </PDFDropzone>

            {selectedFile && (
              <div className="p-2 bg-blue-50 rounded-md">
                <p
                  className="text-sm text-blue-600 truncate"
                  title={selectedFile.name}
                >
                  선택된 파일: {selectedFile.name}
                </p>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 mb-2">회전 범위</label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="all"
                      checked={rotationType === 'all'}
                      onChange={(e) => setRotationType(e.target.value as 'all')}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">전체 페이지</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="selected"
                      checked={rotationType === 'selected'}
                      onChange={(e) => setRotationType(e.target.value as 'selected')}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">선택한 페이지</span>
                  </label>
                </div>
              </div>

              {rotationType === 'selected' && (
                <div>
                  <label className="block text-sm text-gray-600 mb-1">페이지 범위</label>
                  <input
                    type="text"
                    value={rotationPages}
                    onChange={(e) => setRotationPages(e.target.value)}
                    placeholder="예: 1-3,5,7-9"
                    className="w-full p-2 border border-gray-200 rounded-md
                             focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  />
                  <div className="mt-2">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={includeUnspecified}
                        onChange={(e) => setIncludeUnspecified(e.target.checked)}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-600">지정하지 않은 페이지 포함하기</span>
                    </label>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm text-gray-600 mb-1">회전 각도</label>
                <select
                  value={rotationAngle}
                  onChange={(e) => setRotationAngle(Number(e.target.value))}
                  className="w-full p-2 border border-gray-200 rounded-md
                           focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                >
                  <option value={90}>90도</option>
                  <option value={180}>180도</option>
                  <option value={270}>270도</option>
                </select>
              </div>

              <button
                onClick={() => onRotate(
                  rotationType === 'all' ? 'all' : rotationPages,
                  rotationAngle,
                  includeUnspecified
                )}
                disabled={isProcessing || !selectedFile || (rotationType === 'selected' && !rotationPages)}
                className="w-full py-2 bg-blue-500 text-white rounded-lg
                          hover:bg-blue-600 disabled:bg-gray-400
                          disabled:cursor-not-allowed transition-colors duration-200"
              >
                회전하기
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedAction === 'convert-to-pdf' && (
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">PDF로 변환</h3>
          <div className="space-y-3">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-3">변환할 형식 선택</label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    className={`px-4 py-3 rounded-lg flex flex-col items-center justify-center transition-all ${
                      selectedFormat === 'txt'
                        ? 'bg-blue-100 border-2 border-blue-500 text-blue-700'
                        : 'bg-gray-100 border border-gray-200 text-gray-600 hover:bg-gray-200'
                    }`}
                    onClick={() => onFormatSelect('txt')}
                    disabled={isProcessing}
                  >
                    <span className="text-lg mb-1">📝</span>
                    <span className="font-medium">Text (TXT)</span>
                  </button>
                  <button
                    className={`px-4 py-3 rounded-lg flex flex-col items-center justify-center transition-all ${
                      selectedFormat === 'html'
                        ? 'bg-blue-100 border-2 border-blue-500 text-blue-700'
                        : 'bg-gray-100 border border-gray-200 text-gray-600 hover:bg-gray-200'
                    }`}
                    onClick={() => onFormatSelect('html')}
                    disabled={isProcessing}
                  >
                    <span className="text-lg mb-1">🌐</span>
                    <span className="font-medium">HTML</span>
                  </button>
                  <button
                    className={`px-4 py-3 rounded-lg flex flex-col items-center justify-center transition-all ${
                      selectedFormat === 'image'
                        ? 'bg-blue-100 border-2 border-blue-500 text-blue-700'
                        : 'bg-gray-100 border border-gray-200 text-gray-600 hover:bg-gray-200'
                    }`}
                    onClick={() => onFormatSelect('image')}
                    disabled={isProcessing}
                  >
                    <span className="text-lg mb-1">🖼️</span>
                    <span className="font-medium">이미지</span>
                  </button>
                </div>
              </div>

              {selectedFormat && (
                <div className="mt-4">
                  <PDFDropzone
                    onDrop={files => {
                      if (selectedFormat === 'image') {
                        // 이미지인 경우 selectedFiles 배열에 추가
                        onFileSelect(files);
                      } else {
                        // 다른 형식인 경우 단일 파일만 선택
                        files[0] && onFileSelect([files[0]]);
                      }
                    }}
                    onDragOver={(e) => e.preventDefault()}
                    className="h-32 mb-4"
                    multiple={selectedFormat === 'image'}
                    accept={
                      selectedFormat === 'txt' ? '.txt' :
                      selectedFormat === 'html' ? '.html' :
                      '.jpg,.jpeg,.png'
                    }
                  >
                    <div className="text-gray-500 text-center text-sm">
                      <p>파일을 드래그하거나 클릭하여 선택하세요</p>
                      <p className="text-xs mt-1">
                        지원 형식: {
                          selectedFormat === 'txt' ? 'TXT' :
                          selectedFormat === 'html' ? 'HTML' :
                          'JPG, JPEG, PNG'
                        }
                      </p>
                      {selectedFormat === 'image' && (
                        <p className="text-xs mt-1">(여러 장 선택 가능)</p>
                      )}
                    </div>
                  </PDFDropzone>

                  {((selectedFormat !== 'image' && selectedFile) ||
                    (selectedFormat === 'image' && selectedFiles.length > 0)) && (
                    <div className="p-2 bg-blue-50 rounded-md mb-4">
                      {selectedFormat !== 'image' ? (
                        <p className="text-sm text-blue-600 truncate" title={selectedFile?.name}>
                          선택된 파일: {selectedFile?.name}
                        </p>
                      ) : (
                        <p className="text-sm text-blue-600">
                          선택된 이미지: {selectedFiles.length}장
                        </p>
                      )}
                    </div>
                  )}

                  {/* 이미지 목록 표시 */}
                  {selectedFormat === 'image' && selectedFiles.length > 0 && (
                    <div className="mt-2 mb-4">
                      <h4 className="text-sm font-medium text-gray-600 mb-2">선택된 이미지</h4>
                      <div>
                        <DragDropContext
                          onDragEnd={(result: DropResult) => {
                            if (!result.destination || !onReorderFiles) return;
                            onReorderFiles(result.source.index, result.destination.index);
                          }}
                        >
                          <Droppable droppableId="image-list">
                            {(provided) => (
                              <div
                                {...provided.droppableProps}
                                ref={provided.innerRef}
                                className="max-h-40 overflow-y-auto border border-gray-200 rounded-md p-2 space-y-2"
                              >
                                {selectedFiles.map((file, index) => (
                                  <Draggable key={`${file.name}-${index}`} draggableId={`${file.name}-${index}`} index={index}>
                                    {(provided) => (
                                      <div
                                        ref={provided.innerRef}
                                        {...provided.draggableProps}
                                        {...provided.dragHandleProps}
                                        className="flex items-center justify-between p-2 bg-gray-50 rounded-md hover:bg-gray-100"
                                      >
                                        <div className="flex items-center flex-1 min-w-0">
                                          <span className="text-gray-400 mr-2">::</span>
                                          <button
                                            onClick={() => onFilePreview?.(file)}
                                            className="text-sm text-gray-700 truncate flex-1 text-left hover:text-blue-600"
                                            title={file.name}
                                          >
                                            {file.name}
                                          </button>
                                        </div>
                                        <button
                                          onClick={() => onRemoveFile(index)}
                                          className="ml-2 p-1 text-gray-500 hover:text-red-500 hover:bg-gray-200 rounded transition-colors duration-200 flex-shrink-0"
                                          title="삭제"
                                        >
                                          ✕
                                        </button>
                                      </div>
                                    )}
                                  </Draggable>
                                ))}
                                {provided.placeholder}
                              </div>
                            )}
                          </Droppable>
                        </DragDropContext>
                      </div>
                    </div>
                  )}

                  <button
                    className="w-full py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600
                              disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors duration-200"
                    onClick={() => {
                      if (selectedFormat === 'image' && selectedFiles.length > 0) {
                        onConvertToPDF(selectedFiles, 'image');
                      } else if (selectedFile) {
                        onConvertToPDF([selectedFile], selectedFormat);
                      }
                    }}
                    disabled={
                      isProcessing ||
                      (selectedFormat === 'image' ? selectedFiles.length === 0 : !selectedFile)
                    }
                  >
                    PDF로 변환하기
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {selectedAction === 'convert-from-pdf' && (
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">다른 형식으로 변환</h3>
          <div className="space-y-3">
            <PDFDropzone
              onDrop={files => files[0] && onFileSelect([files[0]])}
              onDragOver={(e) => e.preventDefault()}
              className="h-32 mb-4"
              multiple={false}
              accept=".pdf"
            >
              <div className="text-gray-500 text-center text-sm">
                <p>PDF 파일을 드래그하거나 클릭하여 선택하세요</p>
                <p className="text-xs mt-1">변환 가능: Word, JPG, PNG</p>
              </div>
            </PDFDropzone>

            {selectedFile && (
              <div className="p-2 bg-blue-50 rounded-md mb-4">
                <p className="text-sm text-blue-600 truncate" title={selectedFile.name}>
                  선택된 파일: {selectedFile.name}
                </p>
              </div>
            )}

            {selectedFile && (
              <div className="space-y-4 mt-4">
                <label className="block text-sm font-medium text-gray-600 mb-2">변환할 형식 선택</label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    className="p-3 rounded-lg flex flex-col items-center justify-center
                           bg-gray-100 border border-gray-200 text-gray-700 hover:bg-gray-200
                           disabled:opacity-50 disabled:cursor-not-allowed transition-all
                           focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    onClick={() => selectedFile && onConvertFromPDF(selectedFile, 'docx')}
                    disabled={!selectedFile || !selectedFile.name.toLowerCase().endsWith('.pdf') || isProcessing}
                  >
                    <span className="text-lg mb-1">📄</span>
                    <span className="font-medium">Word</span>
                    <span className="text-xs text-gray-500">(DOCX)</span>
                  </button>
                  
                  <button
                    className="p-3 rounded-lg flex flex-col items-center justify-center
                           bg-gray-100 border border-gray-200 text-gray-700 hover:bg-gray-200
                           disabled:opacity-50 disabled:cursor-not-allowed transition-all
                           focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    onClick={() => selectedFile && onConvertFromPDF(selectedFile, 'image', 'jpg')}
                    disabled={!selectedFile || !selectedFile.name.toLowerCase().endsWith('.pdf') || isProcessing}
                  >
                    <span className="text-lg mb-1">🖼️</span>
                    <span className="font-medium">이미지</span>
                    <span className="text-xs text-gray-500">(JPG)</span>
                  </button>
                  
                  <button
                    className="p-3 rounded-lg flex flex-col items-center justify-center
                           bg-gray-100 border border-gray-200 text-gray-700 hover:bg-gray-200
                           disabled:opacity-50 disabled:cursor-not-allowed transition-all
                           focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    onClick={() => selectedFile && onConvertFromPDF(selectedFile, 'image', 'png')}
                    disabled={!selectedFile || !selectedFile.name.toLowerCase().endsWith('.pdf') || isProcessing}
                  >
                    <span className="text-lg mb-1">🖼️</span>
                    <span className="font-medium">이미지</span>
                    <span className="text-xs text-gray-500">(PNG)</span>
                  </button>
                </div>
                
                <div className="pt-2 mt-2 border-t border-gray-100"></div>
                  <p className="text-xs text-gray-500 mb-2">* PDF를 이미지로 변환 시 각 페이지가 개별 이미지 파일로 저장됩니다</p>
                </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ToolPanel;