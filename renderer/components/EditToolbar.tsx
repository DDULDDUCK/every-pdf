// --- components/EditToolbar.tsx ---

import React from "react";
import { Button, Stack, CircularProgress } from "@mui/material";
import SaveIcon from '@mui/icons-material/Save';
import TextFieldsIcon from '@mui/icons-material/TextFields';
import GestureIcon from '@mui/icons-material/Gesture';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { usePDFEdit } from "../contexts/PDFEditContext";
import { useTranslation } from "react-i18next";

type EditToolbarProps = {
  // [수정] onAddElement -> onSetPendingElement
  onSetPendingElement: (type: 'text' | 'signature' | 'checkbox') => void;
  onSave: () => void;
  isSaving: boolean;
  onUploadClick: () => void;
  onGoBack: () => void;
};

const EditToolbar = ({ onSetPendingElement, onSave, isSaving, onUploadClick, onGoBack }: EditToolbarProps) => {
  const { state } = usePDFEdit();
  const { t } = useTranslation("editor");

  return (
    <header className="py-4 px-6 border-b border-border theme-transition bg-card-bg">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <button
            onClick={onGoBack}
            className="group flex items-center gap-2 px-3 py-2 rounded-md bg-button-bg hover:bg-button-hover text-text theme-transition transform hover:scale-105 active:scale-95 shadow-sm hover:shadow-md"
          >
            <ArrowBackIcon className="w-4 h-4 group-hover:transform group-hover:-translate-x-0.5 transition-transform" />
            <span className="text-sm font-medium">{t("back")}</span>
          </button>
          <h1 className="text-2xl font-bold text-text theme-transition">{t("title")}</h1>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={onUploadClick}
            className="group flex items-center gap-2 px-4 py-2 rounded-md bg-primary hover:bg-primary-hover text-white theme-transition transform hover:scale-105 active:scale-95 shadow-sm hover:shadow-md"
          >
            <UploadFileIcon className="w-4 h-4 group-hover:transform group-hover:scale-110 transition-transform" />
            <span className="text-sm font-medium">{t("openPdf")}</span>
          </button>
          
          <div className="flex gap-2">
            <button
              onClick={() => onSetPendingElement('text')}
              disabled={!state.pdfFile}
              className="group flex items-center gap-2 px-3 py-2 rounded-md border border-border bg-card-bg hover:bg-button-hover hover:border-primary text-text theme-transition disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 transform hover:scale-105 active:scale-95 shadow-sm hover:shadow-md"
            >
              <TextFieldsIcon className="w-4 h-4 group-hover:text-primary transition-colors" />
              <span className="text-sm group-hover:text-primary transition-colors">{t("text")}</span>
            </button>
            <button
              onClick={() => onSetPendingElement('signature')}
              disabled={!state.pdfFile}
              className="group flex items-center gap-2 px-3 py-2 rounded-md border border-border bg-card-bg hover:bg-button-hover hover:border-primary text-text theme-transition disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 transform hover:scale-105 active:scale-95 shadow-sm hover:shadow-md"
            >
              <GestureIcon className="w-4 h-4 group-hover:text-primary transition-colors" />
              <span className="text-sm group-hover:text-primary transition-colors">{t("signature")}</span>
            </button>
            <button
              onClick={() => onSetPendingElement('checkbox')}
              disabled={!state.pdfFile}
              className="group flex items-center gap-2 px-3 py-2 rounded-md border border-border bg-card-bg hover:bg-button-hover hover:border-primary text-text theme-transition disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 transform hover:scale-105 active:scale-95 shadow-sm hover:shadow-md"
            >
              <CheckBoxOutlineBlankIcon className="w-4 h-4 group-hover:text-primary transition-colors" />
              <span className="text-sm group-hover:text-primary transition-colors">{t("checkbox")}</span>
            </button>
          </div>

          <button
            onClick={onSave}
            disabled={isSaving || !state.pdfFile}
            className="group flex items-center gap-2 px-4 py-2 rounded-md bg-primary hover:bg-primary-hover text-white theme-transition disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 transform hover:scale-105 active:scale-95 shadow-sm hover:shadow-md"
          >
            {isSaving ? (
              <CircularProgress size={16} color="inherit" />
            ) : (
              <SaveIcon className="w-4 h-4 group-hover:transform group-hover:scale-110 transition-transform" />
            )}
            <span className="text-sm font-medium">{isSaving ? t("saving") : t("save")}</span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default EditToolbar;