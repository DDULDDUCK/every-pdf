// components/WatermarkViewer.tsx

import React, { useState, useEffect } from 'react';
import { Viewer, Worker, RenderPageProps } from '@react-pdf-viewer/core';
import { defaultLayoutPlugin } from '@react-pdf-viewer/default-layout';
import * as pdfjs from 'pdfjs-dist';
import { useTranslation } from "react-i18next";

// home.tsx와 공유할 타입
export interface WatermarkOptions {
  watermarkType: 'text' | 'image';
  watermarkText: string;
  watermarkImage: File | null;
  opacity: number;
  rotation: number;
  position: 'center' | 'tile' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  fontSize: number;
  fontColor: string;
  fontBold: boolean;
}

interface WatermarkViewerProps {
  file: File | null;
  options: WatermarkOptions;
  pagesToApply: string;
}

const WatermarkViewer: React.FC<WatermarkViewerProps> = ({ file, options, pagesToApply }) => {
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [pagesSet, setPagesSet] = useState<Set<number>>(new Set());
  const defaultLayoutPluginInstance = defaultLayoutPlugin();
  const { t } = useTranslation(["home"]);
  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      setFileUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    setFileUrl(null);
  }, [file]);

  useEffect(() => {
    if (options.watermarkImage) {
      const url = URL.createObjectURL(options.watermarkImage);
      setImagePreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    setImagePreviewUrl(null);
  }, [options.watermarkImage]);

  useEffect(() => {
    if (pagesToApply.toLowerCase() === 'all') {
      setPagesSet(new Set());
      return;
    }
    const newSet = new Set<number>();
    const ranges = pagesToApply.split(',');
    ranges.forEach(range => {
      if (range.includes('-')) {
        const [start, end] = range.split('-').map(Number);
        if (!isNaN(start) && !isNaN(end)) {
          for (let i = start; i <= end; i++) newSet.add(i);
        }
      } else {
        const pageNum = Number(range);
        if (!isNaN(pageNum)) newSet.add(pageNum);
      }
    });
    setPagesSet(newSet);
  }, [pagesToApply]);


  const renderPage = (props: RenderPageProps) => {
    const shouldApply = pagesSet.size === 0 || pagesSet.has(props.pageIndex + 1);
    if (!shouldApply) {
        return <>{props.canvasLayer.children}{props.textLayer.children}{props.annotationLayer.children}</>;
    }
    
    const { scale } = props;
    const margin = 50 * scale;

    // --- 여기가 핵심 수정 로직 ---

    const renderWatermarkContent = (isTile: boolean = false) => {
        // 1. 기본 스타일 정의 (확대/축소에 따라 크기 조절)
        let watermarkStyle: React.CSSProperties = {
            opacity: options.opacity,
            color: options.fontColor,
            fontWeight: options.fontBold ? 'bold' : 'normal',
            fontSize: `${options.fontSize * scale}px`,
            whiteSpace: 'nowrap',
            userSelect: 'none',
            pointerEvents: 'none',
            transform: `rotate(${options.rotation}deg)`,
            // 타일이 아닐 때만 absolute 포지셔닝
            position: isTile ? 'relative' : 'absolute',
        };

        // 2. 위치(position)에 따라 스타일 추가
        if (!isTile) {
            switch (options.position) {
                case 'center':
                    watermarkStyle.left = '50%';
                    watermarkStyle.top = '50%';
                    // transform을 덮어쓰지 않고 추가합니다.
                    watermarkStyle.transform = `translate(-50%, -50%) rotate(${options.rotation}deg)`;
                    break;
                case 'top-left':
                    watermarkStyle.left = `${margin}px`;
                    watermarkStyle.top = `${margin}px`;
                    break;
                case 'top-right':
                    watermarkStyle.right = `${margin}px`;
                    watermarkStyle.top = `${margin}px`;
                    break;
                case 'bottom-left':
                    watermarkStyle.left = `${margin}px`;
                    watermarkStyle.bottom = `${margin}px`;
                    break;
                case 'bottom-right':
                    watermarkStyle.right = `${margin}px`;
                    watermarkStyle.bottom = `${margin}px`;
                    break;
            }
        }
        
        // 3. 타입(text/image)에 따라 최종 렌더링
        if (options.watermarkType === 'image' && imagePreviewUrl) {
            return <img src={imagePreviewUrl} alt="Watermark Preview" style={{ ...watermarkStyle, width: `${150 * scale}px`, height: 'auto' }} />;
        }
        if (options.watermarkType === 'text' && options.watermarkText) {
            return <div style={watermarkStyle}>{options.watermarkText}</div>;
        }
        return null;
    };
    
    return (
      <>
        {props.canvasLayer.children}
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', overflow: 'hidden' }}>
            {options.position === 'tile' ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', width: '100%', height: '100%' }}>
                    {Array.from({ length: 16 }).map((_, i) => (
                        <div key={i} style={{ flex: '0 0 25%', height: '25%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                            {renderWatermarkContent(true)}
                        </div>
                    ))}
                </div>
            ) : (
                renderWatermarkContent(false)
            )}
        </div>
        {props.textLayer.children}
        {props.annotationLayer.children}
      </>
    );
  };
  
  if (!fileUrl) {
    return (
        <div className="h-full flex items-center justify-center text-text">
            {t('home:noFileSelected')}
        </div>
    );
  }

  return (
    <Worker workerUrl={`/static/pdf.worker.min.js`}>
        <div className="w-full h-full">
            <Viewer
                fileUrl={fileUrl}
                plugins={[defaultLayoutPluginInstance]}
                renderPage={renderPage}
                key={file?.name + pagesToApply} // 파일이나 페이지 범위가 바뀌면 뷰어 강제 리렌더링
            />
        </div>
    </Worker>
  );
};

export default WatermarkViewer;