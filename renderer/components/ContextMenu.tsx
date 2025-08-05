// --- components/ContextMenu.tsx ---

import React, { useState, useEffect } from 'react';
import { Menu, MenuItem, ListItemIcon, ListItemText, Divider } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ContentPasteIcon from '@mui/icons-material/ContentPaste';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import UndoIcon from '@mui/icons-material/Undo';
import RedoIcon from '@mui/icons-material/Redo';
import { PDFEditElement, usePDFEdit } from '../contexts/PDFEditContext';
import { useTranslation } from "react-i18next";

interface ContextMenuProps {
  anchorPosition: { left: number; top: number } | null;
  onClose: () => void;
  selectedElement?: PDFEditElement | null;
  onEditElement?: (element: PDFEditElement) => void;
  pastePosition?: { x: number; y: number; page: number } | null;
}

const ContextMenu: React.FC<ContextMenuProps> = ({
  anchorPosition,
  onClose,
  selectedElement,
  onEditElement,
  pastePosition,
}) => {
  const {
    undo,
    redo,
    copyElement,
    pasteElement,
    removeElement,
    canUndo,
    canRedo,
    hasClipboard
  } = usePDFEdit();
  const { t } = useTranslation("editor");

  // 플랫폼에 따른 키 표시
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const modifierKey = isMac ? 'Cmd' : 'Ctrl';
  const redoKey = isMac ? `${modifierKey}+Shift+Z` : 'Ctrl+Y';

  const handleUndo = () => {
    undo();
    onClose();
  };

  const handleRedo = () => {
    redo();
    onClose();
  };

  const handleCopy = () => {
    if (selectedElement) {
      copyElement(selectedElement);
    }
    onClose();
  };

  const handlePaste = () => {
    if (pastePosition && hasClipboard()) {
      pasteElement(pastePosition.x, pastePosition.y, pastePosition.page);
    }
    onClose();
  };

  const handleDelete = () => {
    if (selectedElement) {
      removeElement(selectedElement.id);
    }
    onClose();
  };

  const handleEdit = () => {
    if (selectedElement && onEditElement) {
      onEditElement(selectedElement);
    }
    onClose();
  };

  return (
    <Menu
      open={Boolean(anchorPosition)}
      onClose={onClose}
      anchorReference="anchorPosition"
      anchorPosition={anchorPosition || undefined}
      PaperProps={{
        className: 'theme-transition',
        style: {
          minWidth: 180,
          backgroundColor: 'var(--card-bg)',
          color: 'var(--text)',
          border: '1px solid var(--border)',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        },
      }}
    >
      {/* 되돌리기/다시하기 */}
      <MenuItem
        onClick={handleUndo}
        disabled={!canUndo()}
        sx={{
          color: 'var(--text)',
          '&:hover': {
            backgroundColor: 'var(--button-hover)',
          },
          '&.Mui-disabled': {
            color: 'var(--button-text)',
            opacity: 0.5,
          },
        }}
      >
        <ListItemIcon sx={{ color: 'inherit', minWidth: '36px' }}>
          <UndoIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText sx={{ color: 'inherit' }}>{t("undo")} ({modifierKey}+Z)</ListItemText>
      </MenuItem>
      
      <MenuItem
        onClick={handleRedo}
        disabled={!canRedo()}
        sx={{
          color: 'var(--text)',
          '&:hover': {
            backgroundColor: 'var(--button-hover)',
          },
          '&.Mui-disabled': {
            color: 'var(--button-text)',
            opacity: 0.5,
          },
        }}
      >
        <ListItemIcon sx={{ color: 'inherit', minWidth: '36px' }}>
          <RedoIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText sx={{ color: 'inherit' }}>{t("redo")} ({redoKey})</ListItemText>
      </MenuItem>

      <Divider sx={{ borderColor: 'var(--border)', margin: '4px 0' }} />

      {/* 선택된 엘리먼트가 있을 때의 메뉴들 */}
      {selectedElement && (
        <>
          <MenuItem
            onClick={handleEdit}
            sx={{
              color: 'var(--text)',
              '&:hover': {
                backgroundColor: 'var(--button-hover)',
              },
            }}
          >
            <ListItemIcon sx={{ color: 'inherit', minWidth: '36px' }}>
              <EditIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText sx={{ color: 'inherit' }}>{t("edit")}</ListItemText>
          </MenuItem>

          <MenuItem
            onClick={handleCopy}
            sx={{
              color: 'var(--text)',
              '&:hover': {
                backgroundColor: 'var(--button-hover)',
              },
            }}
          >
            <ListItemIcon sx={{ color: 'inherit', minWidth: '36px' }}>
              <ContentCopyIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText sx={{ color: 'inherit' }}>{t("copy")} ({modifierKey}+C)</ListItemText>
          </MenuItem>

          <MenuItem
            onClick={handleDelete}
            sx={{
              color: 'var(--danger)',
              '&:hover': {
                backgroundColor: 'var(--button-hover)',
              },
            }}
          >
            <ListItemIcon sx={{ color: 'inherit', minWidth: '36px' }}>
              <DeleteIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText sx={{ color: 'inherit' }}>{t("delete")} (Delete)</ListItemText>
          </MenuItem>
        </>
      )}

      {/* 붙여넣기 (클립보드에 데이터가 있고 붙여넣을 위치가 있을 때) */}
      {pastePosition && hasClipboard() && (
        <>
          {selectedElement && <Divider sx={{ borderColor: 'var(--border)', margin: '4px 0' }} />}
          <MenuItem
            onClick={handlePaste}
            sx={{
              color: 'var(--text)',
              '&:hover': {
                backgroundColor: 'var(--button-hover)',
              },
            }}
          >
            <ListItemIcon sx={{ color: 'inherit', minWidth: '36px' }}>
              <ContentPasteIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText sx={{ color: 'inherit' }}>{t("paste")} ({modifierKey}+V)</ListItemText>
          </MenuItem>
        </>
      )}
    </Menu>
  );
};

export default ContextMenu;