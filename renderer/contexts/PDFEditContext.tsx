// --- contexts/PDFEditContext.tsx ---

import React, { createContext, Dispatch, useCallback, useContext, useMemo, useReducer } from 'react';
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
  preferredTextFontSize: number;
  elements: PDFEditElement[];
  elementsByPage: Record<number, PDFEditElement[]>;
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

const MAX_HISTORY_ENTRIES = 50;
const initialElements: PDFEditElement[] = [];

const initialState: PDFEditState = {
  pdfFile: null,
  pdfUrl: null,
  numPages: 0,
  currentPage: 1,
  preferredTextFontSize: 20,
  elements: initialElements,
  elementsByPage: {},
  selectedElementId: null,
  pendingElementType: null,
  history: [initialElements],
  historyIndex: 0,
  clipboard: null,
};

const appendHistory = (
  history: PDFEditElement[][],
  historyIndex: number,
  elements: PDFEditElement[],
) => {
  const nextHistory = [...history.slice(0, historyIndex + 1), elements];
  const trimmedHistory = nextHistory.slice(-MAX_HISTORY_ENTRIES);

  return {
    history: trimmedHistory,
    historyIndex: trimmedHistory.length - 1,
  };
};

const buildElementsByPage = (elements: PDFEditElement[]): Record<number, PDFEditElement[]> => {
  const grouped: Record<number, PDFEditElement[]> = {};

  elements.forEach((element) => {
    if (!grouped[element.page]) {
      grouped[element.page] = [];
    }

    grouped[element.page].push(element);
  });

  return grouped;
};

const pdfEditReducer = (state: PDFEditState, action: Action): PDFEditState => {
  switch (action.type) {
    case 'SET_PDF_FILE':
      return { ...initialState, pdfFile: action.payload.file, pdfUrl: action.payload.url };
    case 'SET_NUM_PAGES':
      return { ...state, numPages: action.payload };
    case 'SET_CURRENT_PAGE':
      return { ...state, currentPage: action.payload };
    case 'ADD_ELEMENT': {
      const nextElements = [...state.elements, action.payload];
      const newStateWithAdd = {
        ...state,
        elements: nextElements,
        elementsByPage: buildElementsByPage(nextElements),
        preferredTextFontSize: action.payload.type === 'text' ? action.payload.fontSize : state.preferredTextFontSize,
      };
      return {
        ...newStateWithAdd,
        ...appendHistory(state.history, state.historyIndex, newStateWithAdd.elements),
      };
    }
    case 'UPDATE_ELEMENT': {
      const elementId = action.payload.element.id;
      const currentElementIndex = state.elements.findIndex((el) => el.id === elementId);

      if (currentElementIndex === -1) {
        return state;
      }

      const previousElement = state.elements[currentElementIndex];
      const nextElements = [...state.elements];
      nextElements[currentElementIndex] = action.payload.element;

      let nextElementsByPage: Record<number, PDFEditElement[]>;

      if (previousElement.page === action.payload.element.page) {
        const currentPage = previousElement.page;
        const pageElements = state.elementsByPage[currentPage] || [];
        const pageElementIndex = pageElements.findIndex((el) => el.id === elementId);

        if (pageElementIndex === -1) {
          nextElementsByPage = {
            ...state.elementsByPage,
            [currentPage]: [...pageElements, action.payload.element],
          };
        } else {
          const nextPageElements = [...pageElements];
          nextPageElements[pageElementIndex] = action.payload.element;
          nextElementsByPage = {
            ...state.elementsByPage,
            [currentPage]: nextPageElements,
          };
        }
      } else {
        const previousPageElements = (state.elementsByPage[previousElement.page] || []).filter(
          (el) => el.id !== elementId,
        );
        const targetPageElements = (state.elementsByPage[action.payload.element.page] || []).filter(
          (el) => el.id !== elementId,
        );

        nextElementsByPage = {
          ...state.elementsByPage,
          [previousElement.page]: previousPageElements,
          [action.payload.element.page]: [...targetPageElements, action.payload.element],
        };
      }

      const newStateWithUpdate = {
        ...state,
        elements: nextElements,
        elementsByPage: nextElementsByPage,
        preferredTextFontSize: action.payload.element.type === 'text'
          ? action.payload.element.fontSize
          : state.preferredTextFontSize,
      };
      if (action.payload.saveHistory) {
        return {
          ...newStateWithUpdate,
          ...appendHistory(state.history, state.historyIndex, newStateWithUpdate.elements),
        };
      }
      return newStateWithUpdate;
    }
    case 'REMOVE_ELEMENT': {
      const newSelectedId = state.selectedElementId === action.payload ? null : state.selectedElementId;
      const nextElements = state.elements.filter((el) => el.id !== action.payload);
      const newStateWithRemove = {
        ...state,
        elements: nextElements,
        elementsByPage: buildElementsByPage(nextElements),
        selectedElementId: newSelectedId,
      };
      return {
        ...newStateWithRemove,
        ...appendHistory(state.history, state.historyIndex, newStateWithRemove.elements),
      };
    }
    case 'SET_SELECTED_ELEMENT_ID':
      return { ...state, selectedElementId: action.payload, pendingElementType: null };
    case 'SET_ELEMENTS':
        return { ...state, elements: action.payload, elementsByPage: buildElementsByPage(action.payload) };
    case 'SET_PENDING_ELEMENT_TYPE':
      return { ...state, pendingElementType: action.payload, selectedElementId: null };
    case 'UNDO':
      if (state.historyIndex > 0) {
        const previousIndex = state.historyIndex - 1;
        const previousElements = state.history[previousIndex];
        return {
          ...state,
          elements: previousElements,
          elementsByPage: buildElementsByPage(previousElements),
          historyIndex: previousIndex,
          selectedElementId: null,
        };
      }
      return state;
    case 'REDO':
      if (state.historyIndex < state.history.length - 1) {
        const nextIndex = state.historyIndex + 1;
        const nextElements = state.history[nextIndex];
        return {
          ...state,
          elements: nextElements,
          elementsByPage: buildElementsByPage(nextElements),
          historyIndex: nextIndex,
          selectedElementId: null,
        };
      }
      return state;
    case 'COPY_ELEMENT':
      return { ...state, clipboard: action.payload };
    case 'PASTE_ELEMENT': {
      if (state.clipboard) {
        const newElement = {
          ...state.clipboard,
          id: uuidv4(),
          x: action.payload.x,
          y: action.payload.y,
          page: action.payload.page,
        };
        const nextElements = [...state.elements, newElement];
        const newStateWithPaste = {
          ...state,
          elements: nextElements,
          elementsByPage: buildElementsByPage(nextElements),
        };
        return {
          ...newStateWithPaste,
          preferredTextFontSize: newElement.type === 'text' ? newElement.fontSize : state.preferredTextFontSize,
          ...appendHistory(state.history, state.historyIndex, newStateWithPaste.elements),
          selectedElementId: newElement.id,
        };
      }
      return state;
    }
    case 'SAVE_HISTORY': {
      const currentHistory = state.history[state.historyIndex];
      if (currentHistory !== state.elements) {
        return {
          ...state,
          ...appendHistory(state.history, state.historyIndex, state.elements),
        };
      }
      return state;
    }
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

  const setPdfFile = useCallback((file: File | null) => {
    const url = file ? URL.createObjectURL(file) : null;
    dispatch({ type: 'SET_PDF_FILE', payload: { file, url } });
  }, [dispatch]);

  const setNumPages = useCallback((payload: number) => {
    dispatch({ type: 'SET_NUM_PAGES', payload });
  }, [dispatch]);

  const setCurrentPage = useCallback((payload: number) => {
    dispatch({ type: 'SET_CURRENT_PAGE', payload });
  }, [dispatch]);

  const addElement = useCallback((payload: PDFEditElement) => {
    dispatch({ type: 'ADD_ELEMENT', payload });
  }, [dispatch]);

  const updateElement = useCallback((element: PDFEditElement, saveHistory: boolean = false) => {
    dispatch({ type: 'UPDATE_ELEMENT', payload: { element, saveHistory } });
  }, [dispatch]);

  const removeElement = useCallback((payload: string) => {
    dispatch({ type: 'REMOVE_ELEMENT', payload });
  }, [dispatch]);

  const setSelectedElementId = useCallback((payload: string | null) => {
    dispatch({ type: 'SET_SELECTED_ELEMENT_ID', payload });
  }, [dispatch]);

  const setElements = useCallback((payload: PDFEditElement[]) => {
    dispatch({ type: 'SET_ELEMENTS', payload });
  }, [dispatch]);

  const setPendingElementType = useCallback((payload: 'text' | 'signature' | 'checkbox' | null) => {
    dispatch({ type: 'SET_PENDING_ELEMENT_TYPE', payload });
  }, [dispatch]);

  const undo = useCallback(() => {
    dispatch({ type: 'UNDO' });
  }, [dispatch]);

  const redo = useCallback(() => {
    dispatch({ type: 'REDO' });
  }, [dispatch]);

  const copyElement = useCallback((element: PDFEditElement) => {
    dispatch({ type: 'COPY_ELEMENT', payload: element });
  }, [dispatch]);

  const pasteElement = useCallback((x: number, y: number, page: number) => {
    dispatch({ type: 'PASTE_ELEMENT', payload: { x, y, page } });
  }, [dispatch]);

  const saveHistory = useCallback(() => {
    dispatch({ type: 'SAVE_HISTORY' });
  }, [dispatch]);

  const canUndo = useCallback(() => state.historyIndex > 0, [state.historyIndex]);
  const canRedo = useCallback(() => state.historyIndex < state.history.length - 1, [state.historyIndex, state.history.length]);
  const hasClipboard = useCallback(() => !!state.clipboard, [state.clipboard]);

  return useMemo(() => ({
    state,
    setPdfFile,
    setNumPages,
    setCurrentPage,
    addElement,
    updateElement,
    removeElement,
    setSelectedElementId,
    setElements,
    setPendingElementType,
    undo,
    redo,
    copyElement,
    pasteElement,
    saveHistory,
    canUndo,
    canRedo,
    hasClipboard,
  }), [
    state,
    setPdfFile,
    setNumPages,
    setCurrentPage,
    addElement,
    updateElement,
    removeElement,
    setSelectedElementId,
    setElements,
    setPendingElementType,
    undo,
    redo,
    copyElement,
    pasteElement,
    saveHistory,
    canUndo,
    canRedo,
    hasClipboard,
  ]);
};
