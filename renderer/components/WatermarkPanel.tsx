import React, { useState, useEffect } from 'react';
import { SketchPicker } from 'react-color';
import PDFDropzone from './PDFDropzone';

type WatermarkPosition = 'center' | 'tile' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
type WatermarkType = 'text' | 'image';

interface WatermarkPanelProps {
  selectedFile: File | null;
  onFileSelect: (files: File[]) => void;
  isProcessing: boolean;
  onAddWatermark: (
    file: File,
    options: {
      watermarkType: WatermarkType;
      watermarkText?: string;
      watermarkImage?: File;
      opacity: number;
      rotation: number;
      position: WatermarkPosition;
      fontSize?: number;
      fontColor?: string;
      fontBold?: boolean;
      pages: string;
    }
  ) => void;
}

const WatermarkPanel: React.FC<WatermarkPanelProps> = ({
  selectedFile,
  onFileSelect,
  isProcessing,
  onAddWatermark,
}) => {
  const [watermarkType, setWatermarkType] = useState<WatermarkType>('text');
  const [watermarkText, setWatermarkText] = useState<string>('기밀 문서');
  const [watermarkImage, setWatermarkImage] = useState<File | null>(null);
  const [opacity, setOpacity] = useState<number>(0.5);
  const [rotation, setRotation] = useState<number>(45);
  const [position, setPosition] = useState<WatermarkPosition>('center');
  const [fontSize, setFontSize] = useState<number>(40);
  const [fontColor, setFontColor] = useState<string>('#888888');
  const [fontBold, setFontBold] = useState<boolean>(false);
  const [pages, setPages] = useState<string>('all');
  const [showColorPicker, setShowColorPicker] = useState<boolean>(false);

  const handleImageSelect = (files: File[]) => {
    if (files.length > 0) {
      setWatermarkImage(files[0]);
    }
  };

  const handleApplyWatermark = () => {
    if (!selectedFile) return;

    onAddWatermark(selectedFile, {
      watermarkType,
      watermarkText: watermarkType === 'text' ? watermarkText : undefined,
      watermarkImage: watermarkType === 'image' ? watermarkImage : undefined,
      opacity,
      rotation,
      position,
      fontSize: watermarkType === 'text' ? fontSize : undefined,
      fontColor: watermarkType === 'text' ? fontColor : undefined,
      fontBold: watermarkType === 'text' ? fontBold : undefined,
      pages,
    });
  };

  const positionLabels = {
    'center': '중앙',
    'tile': '바둑판식 배열',
    'top-left': '좌측 상단',
    'top-right': '우측 상단',
    'bottom-left': '좌측 하단',
    'bottom-right': '우측 하단',
  };

  return (
    <div className="bg-card-bg p-4 rounded-lg shadow-sm w-[400px] min-w-[400px] flex flex-col h-full theme-transition">
      <h3 className="text-lg font-semibold text-text mb-4 theme-transition">워터마크 추가</h3>
      
      <div className="space-y-4 flex-1 overflow-y-auto pr-2">
        {/* PDF 파일 선택 영역 */}
        <PDFDropzone
          onDrop={files => files[0] && onFileSelect([files[0]])}
          onDragOver={(e) => e.preventDefault()}
          className="h-32 mb-4"
          multiple={false}
        >
          <div className="text-button-text text-center text-sm">
            PDF 파일을 드래그하거나 클릭하여 선택하세요
          </div>
        </PDFDropzone>

        {selectedFile && (
          <div className="panel-selected-file">
            <p className="panel-selected-file-text">
              선택된 파일: {selectedFile.name}
            </p>
          </div>
        )}
        
        {/* 워터마크 유형 선택 */}
        <div>
          <label className="block text-sm font-medium text-text mb-2 theme-transition">워터마크 유형</label>
          <div className="flex space-x-4">
            <label className="flex items-center">
              <input
                type="radio"
                value="text"
                checked={watermarkType === 'text'}
                onChange={() => setWatermarkType('text')}
                className="mr-2"
              />
              <span className="text-sm text-text theme-transition">텍스트</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                value="image"
                checked={watermarkType === 'image'}
                onChange={() => setWatermarkType('image')}
                className="mr-2"
              />
              <span className="text-sm text-text theme-transition">이미지</span>
            </label>
          </div>
        </div>
        
        {/* 텍스트 워터마크 옵션 */}
        {watermarkType === 'text' && (
          <>
            <div>
              <label className="block text-sm font-medium text-text mb-2 theme-transition">워터마크 텍스트</label>
              <input
                type="text"
                value={watermarkText}
                onChange={(e) => setWatermarkText(e.target.value)}
                placeholder="워터마크 텍스트를 입력하세요"
                className="form-input w-full"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-text mb-2 theme-transition">폰트 크기</label>
              <div className="flex items-center">
                <input
                  type="range"
                  min="10"
                  max="100"
                  value={fontSize}
                  onChange={(e) => setFontSize(parseInt(e.target.value))}
                  className="w-full h-2 bg-button-bg rounded-lg appearance-none cursor-pointer theme-transition"
                />
                <span className="ml-2 text-sm text-text theme-transition w-8 text-center">{fontSize}</span>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-text mb-2 theme-transition">폰트 색상</label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowColorPicker(!showColorPicker)}
                  className="w-full p-2 border border-border rounded-md flex items-center justify-between bg-input-bg text-text theme-transition"
                >
                  <div className="flex items-center">
                    <div className="w-6 h-6 rounded mr-2" style={{ backgroundColor: fontColor }}></div>
                    <span>{fontColor}</span>
                  </div>
                  <span>{showColorPicker ? '닫기' : '색상 선택'}</span>
                </button>
                {showColorPicker && (
                  <div className="absolute z-10 mt-2">
                    <SketchPicker
                      color={fontColor}
                      onChange={(color) => setFontColor(color.hex)}
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center mt-4">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={fontBold}
                  onChange={(e) => setFontBold(e.target.checked)}
                  className="form-checkbox h-4 w-4 text-primary rounded border-border focus:ring-primary theme-transition"
                />
                <span className="ml-2 text-sm font-medium text-text theme-transition">굵은 글씨</span>
              </label>
            </div>
          </>
        )}
        
        {/* 이미지 워터마크 옵션 */}
        {watermarkType === 'image' && (
          <div>
            <label className="block text-sm font-medium text-text mb-2 theme-transition">워터마크 이미지</label>
            <PDFDropzone
              onDrop={handleImageSelect}
              onDragOver={(e) => e.preventDefault()}
              className="h-24 border-dashed border-border theme-transition"
              multiple={false}
              accept=".png,.jpg,.jpeg,.gif"
            >
              <div className="text-button-text text-center text-xs">
                {watermarkImage ? (
                  <p className="panel-selected-file-text">
                    선택된 이미지: {watermarkImage.name}
                  </p>
                ) : (
                  <>
                    <p>이미지 파일을 드래그하거나 클릭하여 선택하세요</p>
                    <p className="text-xs mt-1">지원 형식: PNG, JPG, JPEG, GIF</p>
                  </>
                )}
              </div>
            </PDFDropzone>
          </div>
        )}
        
        {/* 공통 워터마크 옵션 */}
        <div>
          <label className="block text-sm font-medium text-text mb-2 theme-transition">투명도</label>
          <div className="flex items-center">
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={opacity}
              onChange={(e) => setOpacity(parseFloat(e.target.value))}
              className="w-full h-2 bg-button-bg rounded-lg appearance-none cursor-pointer theme-transition"
            />
            <span className="ml-2 text-sm text-text theme-transition w-10 text-center">{Math.round(opacity * 100)}%</span>
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-text mb-2 theme-transition">회전 각도</label>
          <div className="flex items-center">
            <input
              type="range"
              min="0"
              max="360"
              step="5"
              value={rotation}
              onChange={(e) => setRotation(parseInt(e.target.value))}
              className="w-full h-2 bg-button-bg rounded-lg appearance-none cursor-pointer theme-transition"
            />
            <span className="ml-2 text-sm text-text theme-transition w-10 text-center">{rotation}°</span>
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-text mb-2 theme-transition">위치</label>
          <select
            value={position}
            onChange={(e) => setPosition(e.target.value as WatermarkPosition)}
            className="form-input w-full"
          >
            {Object.entries(positionLabels).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-text mb-2 theme-transition">페이지 범위</label>
          <input
            type="text"
            value={pages}
            onChange={(e) => setPages(e.target.value)}
            placeholder="예: 1-3,5,7-9 또는 'all'"
            className="form-input w-full"
          />
          <p className="mt-1 text-xs text-button-text">입력 예시: 1-3,5,7-9 또는 'all'(모든 페이지)</p>
        </div>
        
        <button
          onClick={handleApplyWatermark}
          disabled={isProcessing || !selectedFile || (watermarkType === 'image' && !watermarkImage)}
          className="w-full py-2 bg-primary text-button-text-selected rounded-lg hover:bg-primary-hover disabled:bg-button-bg disabled:text-button-text disabled:cursor-not-allowed transition-colors duration-200 theme-transition"
        >
          워터마크 적용하기
        </button>
      </div>
    </div>
  );
};

export default WatermarkPanel;
