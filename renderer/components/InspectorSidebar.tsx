// --- components/InspectorSidebar.tsx ---

import React from 'react';
import { usePDFEdit, PDFEditElement } from '../contexts/PDFEditContext';
import { useTranslation } from 'react-i18next';
import TextEditTool from './TextEditTool';
import SignatureEditTool from './SignatureEditTool';
import CheckboxEditTool from './CheckboxEditTool';

const InspectorSidebar = () => {
    const { state, updateElement, removeElement } = usePDFEdit();
    const { t } = useTranslation("editor");

    const selectedElement = state.elements.find(el => el.id === state.selectedElementId);

    const handleUpdate = (data: Partial<PDFEditElement>) => {
        if (!selectedElement) return;
        const updatedElement = { ...selectedElement, ...data } as PDFEditElement;
        updateElement(updatedElement, true);
    };

    const handleDelete = () => {
        if (selectedElement) {
            removeElement(selectedElement.id);
        }
    }
    
    const renderEditForm = () => {
        if (!selectedElement) return null;

        switch (selectedElement.type) {
            case 'text':
                return <TextEditTool editingElement={selectedElement} onUpdate={handleUpdate} />;
            case 'signature':
                return <SignatureEditTool editingElement={selectedElement} onUpdate={handleUpdate} />;
            case 'checkbox':
                return <CheckboxEditTool editingElement={selectedElement} onUpdate={handleUpdate} />;
            default:
                return null;
        }
    };

    return (
        <aside
            className="bg-panel-bg flex flex-col theme-transition h-full"
        >
            <div className="p-4 border-b border-border">
                <h2 className="text-lg font-semibold text-text theme-transition">{t("properties")}</h2>
            </div>
            <div className="flex-1 p-4 overflow-y-auto">
                {selectedElement ? (
                    renderEditForm()
                ) : (
                    <div className="text-center text-button-text pt-10 theme-transition">
                        <p>{t("selectElementPrompt")}</p>
                    </div>
                )}
            </div>
            {selectedElement && (
                <div className="p-4 border-t border-border">
                    <button
                        onClick={handleDelete}
                        className="w-full px-3 py-2 rounded-md bg-red-600 hover:bg-red-700 text-white theme-transition"
                    >
                        {t("deleteElement", "Delete Element")}
                    </button>
                </div>
            )}
        </aside>
    );
};

export default InspectorSidebar;