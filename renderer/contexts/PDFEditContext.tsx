// --- contexts/PDFEditContext.tsx ---

import React, { createContext, useReducer, useContext, Dispatch } from 'react';
import { v4 as uuidv4 } from 'uuid';

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
  history: PDFEditElement[][];
  historyIndex: number;
  clipboard: PDFEditElement | null;
};

type Action =
  | { type: 'SET_PDF_FILE'; payload: { file: File | null, url: string | null } }
  | { type: 'SET_NUM_PAGES'; payload: number }
  | { type: 'SET_CURRENT_PAGE'; payload: number }
  | { type: 'ADD_ELEMENT'; payload: PDFEditElement }
  | { type: 'UPDATE_ELEMENT'; payload: { element: PDFEditElement, saveHistory: boolean } }
  | { type: 'REMOVE_ELEMENT'; payload: string }
  | { type: 'SET_SELECTED_ELEMENT_ID'; payload: string | null }
  | { type: 'SET_ELEMENTS'; payload: PDFEditElement[] }
  | { type: 'SET_PENDING_ELEMENT_TYPE', payload: 'text' | 'signature' | 'checkbox' | null }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'COPY_ELEMENT'; payload: PDFEditElement }
  | { type: 'PASTE_ELEMENT'; payload: { x: number; y: number; page: number } }
  | { type: 'SAVE_HISTORY' };

const initialState: PDFEditState = {
  pdfFile: null,
  pdfUrl: null,
  numPages: 0,
  currentPage: 1,
  elements: [],
  selectedElementId: null,
  pendingElementType: null,
  history: [[]],
  historyIndex: 0,
  clipboard: null,
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
      const newStateWithAdd = { ...state, elements: [...state.elements, action.payload] };
      return {
        ...newStateWithAdd,
        history: [...state.history.slice(0, state.historyIndex + 1), newStateWithAdd.elements],
        historyIndex: state.historyIndex + 1,
      };
    case 'UPDATE_ELEMENT':
      const newStateWithUpdate = {
        ...state,
        elements: state.elements.map((el) =>
          el.id === action.payload.element.id ? action.payload.element : el
        ),
      };
      if (action.payload.saveHistory) {
        return {
          ...newStateWithUpdate,
          history: [...state.history.slice(0, state.historyIndex + 1), newStateWithUpdate.elements],
          historyIndex: state.historyIndex + 1,
        };
      }
      return newStateWithUpdate;
    case 'REMOVE_ELEMENT':
      const newSelectedId = state.selectedElementId === action.payload ? null : state.selectedElementId;
      const newStateWithRemove = {
        ...state,
        elements: state.elements.filter((el) => el.id !== action.payload),
        selectedElementId: newSelectedId,
      };
      return {
        ...newStateWithRemove,
        history: [...state.history.slice(0, state.historyIndex + 1), newStateWithRemove.elements],
        historyIndex: state.historyIndex + 1,
      };
    case 'SET_SELECTED_ELEMENT_ID':
      return { ...state, selectedElementId: action.payload, pendingElementType: null };
    case 'SET_ELEMENTS':
        return { ...state, elements: action.payload };
    case 'SET_PENDING_ELEMENT_TYPE':
      return { ...state, pendingElementType: action.payload, selectedElementId: null };
    case 'UNDO':
      if (state.historyIndex > 0) {
        const previousIndex = state.historyIndex - 1;
        return {
          ...state,
          elements: state.history[previousIndex],
          historyIndex: previousIndex,
          selectedElementId: null,
        };
      }
      return state;
    case 'REDO':
      if (state.historyIndex < state.history.length - 1) {
        const nextIndex = state.historyIndex + 1;
        return {
          ...state,
          elements: state.history[nextIndex],
          historyIndex: nextIndex,
          selectedElementId: null,
        };
      }
      return state;
    case 'COPY_ELEMENT':
      return { ...state, clipboard: action.payload };
    case 'PASTE_ELEMENT':
      if (state.clipboard) {
        const newElement = {
          ...state.clipboard,
          id: uuidv4(),
          x: action.payload.x,
          y: action.payload.y,
          page: action.payload.page,
        };
        const newStateWithPaste = { ...state, elements: [...state.elements, newElement] };
        return {
          ...newStateWithPaste,
          history: [...state.history.slice(0, state.historyIndex + 1), newStateWithPaste.elements],
          historyIndex: state.historyIndex + 1,
          selectedElementId: newElement.id,
        };
      }
      return state;
    case 'SAVE_HISTORY':
      const currentHistory = state.history[state.historyIndex];
      if (JSON.stringify(currentHistory) !== JSON.stringify(state.elements)) {
        return {
          ...state,
          history: [...state.history.slice(0, state.historyIndex + 1), state.elements],
          historyIndex: state.historyIndex + 1,
        };
      }
      return state;
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
    updateElement: (element: PDFEditElement, saveHistory: boolean = false) => dispatch({ type: 'UPDATE_ELEMENT', payload: { element, saveHistory } }),
    removeElement: (payload: string) => dispatch({ type: 'REMOVE_ELEMENT', payload }),
    setSelectedElementId: (payload: string | null) => dispatch({ type: 'SET_SELECTED_ELEMENT_ID', payload }),
    setElements: (payload: PDFEditElement[]) => dispatch({ type: 'SET_ELEMENTS', payload }),
    setPendingElementType: (payload: 'text' | 'signature' | 'checkbox' | null) => dispatch({ type: 'SET_PENDING_ELEMENT_TYPE', payload }),
    undo: () => dispatch({ type: 'UNDO' }),
    redo: () => dispatch({ type: 'REDO' }),
    copyElement: (element: PDFEditElement) => dispatch({ type: 'COPY_ELEMENT', payload: element }),
    pasteElement: (x: number, y: number, page: number) => dispatch({ type: 'PASTE_ELEMENT', payload: { x, y, page } }),
    saveHistory: () => dispatch({ type: 'SAVE_HISTORY' }),
    canUndo: () => state.historyIndex > 0,
    canRedo: () => state.historyIndex < state.history.length - 1,
    hasClipboard: () => !!state.clipboard,
  };
};