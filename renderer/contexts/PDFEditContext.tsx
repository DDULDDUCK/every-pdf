// --- contexts/PDFEditContext.tsx ---

import React, { createContext, useReducer, useContext, Dispatch } from 'react';

// [수정] Text, Signature Element에 배경 관련 속성 추가
export type PDFTextElement = {
  id: string; type: 'text'; page: number; x: number; y: number;
  text: string; fontSize: number; color: string;
  hasBackground: boolean;
  backgroundColor: string;
};
export type PDFSignatureElement = {
  id:string; type: 'signature'; page: number; x: number; y: number;
  imageData: string; width: number; height: number;
  hasBackground: boolean;
  backgroundColor: string;
};
export type PDFCheckboxElement = {
    id: string; type: 'checkbox'; page: number; x: number; y: number;
    checked: boolean; size: number; color: string; borderColor: string;
    isTransparent: boolean; 
    hasBorder: boolean;     
};
export type PDFEditElement = PDFTextElement | PDFSignatureElement | PDFCheckboxElement;

type PDFEditState = {
  pdfFile: File | null;
  pdfUrl: string | null;
  numPages: number;
  currentPage: number;
  elements: PDFEditElement[];
  selectedElementId: string | null;
  pendingElementType: 'text' | 'signature' | 'checkbox' | null;
};

type Action =
  | { type: 'SET_PDF_FILE'; payload: { file: File | null, url: string | null } }
  | { type: 'SET_NUM_PAGES'; payload: number }
  | { type: 'SET_CURRENT_PAGE'; payload: number }
  | { type: 'ADD_ELEMENT'; payload: PDFEditElement }
  | { type: 'UPDATE_ELEMENT'; payload: PDFEditElement }
  | { type: 'REMOVE_ELEMENT'; payload: string }
  | { type: 'SET_SELECTED_ELEMENT_ID'; payload: string | null }
  | { type: 'SET_ELEMENTS'; payload: PDFEditElement[] }
  | { type: 'SET_PENDING_ELEMENT_TYPE', payload: 'text' | 'signature' | 'checkbox' | null };

const initialState: PDFEditState = {
  pdfFile: null,
  pdfUrl: null,
  numPages: 0,
  currentPage: 1,
  elements: [],
  selectedElementId: null,
  pendingElementType: null,
};

const pdfEditReducer = (state: PDFEditState, action: Action): PDFEditState => {
  switch (action.type) {
    case 'SET_PDF_FILE':
      return { ...initialState, pdfFile: action.payload.file, pdfUrl: action.payload.url };
    case 'SET_NUM_PAGES':
      return { ...state, numPages: action.payload };
    case 'SET_CURRENT_PAGE':
      return { ...state, currentPage: action.payload };
    case 'ADD_ELEMENT':
      return { ...state, elements: [...state.elements, action.payload] };
    case 'UPDATE_ELEMENT':
      return {
        ...state,
        elements: state.elements.map((el) =>
          el.id === action.payload.id ? action.payload : el
        ),
      };
    case 'REMOVE_ELEMENT':
      const newSelectedId = state.selectedElementId === action.payload ? null : state.selectedElementId;
      return {
        ...state,
        elements: state.elements.filter((el) => el.id !== action.payload),
        selectedElementId: newSelectedId,
      };
    case 'SET_SELECTED_ELEMENT_ID':
      return { ...state, selectedElementId: action.payload, pendingElementType: null };
    case 'SET_ELEMENTS':
      return { ...state, elements: action.payload };
    case 'SET_PENDING_ELEMENT_TYPE':
      return { ...state, pendingElementType: action.payload, selectedElementId: null };
    default:
      return state;
  }
};

const PDFEditContext = createContext<{
  state: PDFEditState;
  dispatch: Dispatch<Action>;
} | undefined>(undefined);

export const PDFEditProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(pdfEditReducer, initialState);
  return (
    <PDFEditContext.Provider value={{ state, dispatch }}>
      {children}
    </PDFEditContext.Provider>
  );
};

export const usePDFEdit = () => {
  const context = useContext(PDFEditContext);
  if (!context) {
    throw new Error('usePDFEdit must be used within a PDFEditProvider');
  }
  const { state, dispatch } = context;

  return {
    state,
    setPdfFile: (file: File | null) => {
        const url = file ? URL.createObjectURL(file) : null;
        dispatch({ type: 'SET_PDF_FILE', payload: { file, url } });
    },
    setNumPages: (payload: number) => dispatch({ type: 'SET_NUM_PAGES', payload }),
    setCurrentPage: (payload: number) => dispatch({ type: 'SET_CURRENT_PAGE', payload }),
    addElement: (payload: PDFEditElement) => dispatch({ type: 'ADD_ELEMENT', payload }),
    updateElement: (payload: PDFEditElement) => dispatch({ type: 'UPDATE_ELEMENT', payload }),
    removeElement: (payload: string) => dispatch({ type: 'REMOVE_ELEMENT', payload }),
    setSelectedElementId: (payload: string | null) => dispatch({ type: 'SET_SELECTED_ELEMENT_ID', payload }),
    setElements: (payload: PDFEditElement[]) => dispatch({ type: 'SET_ELEMENTS', payload }),
    setPendingElementType: (payload: 'text' | 'signature' | 'checkbox' | null) => dispatch({ type: 'SET_PENDING_ELEMENT_TYPE', payload }),
  };
};