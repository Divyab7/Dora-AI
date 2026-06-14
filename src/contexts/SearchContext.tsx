"use client";

import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
} from "react";
import type {
  SearchStage,
  VisionAnalysisResult,
  ProductMatch,
  SearchHistoryEntry,
} from "@/types/search";

// ============================================
// Types
// ============================================

interface SearchState {
  stage: SearchStage;
  uploadedCid: string | null;
  imagePreview: string | null;
  analysisResult: VisionAnalysisResult | null;
  results: ProductMatch[];
  selectedProduct: ProductMatch | null;
  error: string | null;
  searchHistory: SearchHistoryEntry[];
}

type SearchAction =
  | { type: "START_CAPTURE" }
  | { type: "IMAGE_UPLOADED"; payload: { cid: string; preview: string } }
  | { type: "ANALYSIS_STARTED" }
  | { type: "ANALYSIS_COMPLETE"; payload: VisionAnalysisResult }
  | { type: "SEARCH_STARTED" }
  | { type: "SEARCH_COMPLETE"; payload: ProductMatch[] }
  | { type: "SELECT_PRODUCT"; payload: ProductMatch }
  | { type: "SEARCH_ERROR"; payload: string }
  | { type: "RESET" }
  | { type: "LOAD_HISTORY"; payload: SearchHistoryEntry[] };

interface SearchContextValue extends SearchState {
  startCapture: () => void;
  imageUploaded: (cid: string, preview: string) => void;
  startAnalysis: () => void;
  analysisComplete: (result: VisionAnalysisResult) => void;
  startSearch: () => void;
  searchComplete: (results: ProductMatch[]) => void;
  selectProduct: (product: ProductMatch) => void;
  searchError: (error: string) => void;
  resetSearch: () => void;
}

// ============================================
// Initial State
// ============================================

const initialState: SearchState = {
  stage: "idle",
  uploadedCid: null,
  imagePreview: null,
  analysisResult: null,
  results: [],
  selectedProduct: null,
  error: null,
  searchHistory: [],
};

// ============================================
// Reducer
// ============================================

function searchReducer(
  state: SearchState,
  action: SearchAction
): SearchState {
  switch (action.type) {
    case "START_CAPTURE":
      return { ...initialState, searchHistory: state.searchHistory, stage: "capturing" };

    case "IMAGE_UPLOADED":
      return {
        ...state,
        stage: "uploading",
        uploadedCid: action.payload.cid,
        imagePreview: action.payload.preview,
      };

    case "ANALYSIS_STARTED":
      return { ...state, stage: "analyzing" };

    case "ANALYSIS_COMPLETE":
      return {
        ...state,
        stage: "verify",
        analysisResult: action.payload,
      };

    case "SEARCH_STARTED":
      return { ...state, stage: "searching" };

    case "SEARCH_COMPLETE":
      return {
        ...state,
        stage: "results",
        results: action.payload,
      };

    case "SELECT_PRODUCT":
      return { ...state, selectedProduct: action.payload };

    case "SEARCH_ERROR":
      return { ...state, stage: "error", error: action.payload };

    case "RESET":
      return { ...initialState, searchHistory: state.searchHistory };

    case "LOAD_HISTORY":
      return { ...state, searchHistory: action.payload };

    default:
      return state;
  }
}

// ============================================
// Context
// ============================================

const SearchContext = createContext<SearchContextValue | undefined>(undefined);

export function SearchContextProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [state, dispatch] = useReducer(searchReducer, initialState);

  const startCapture = useCallback(() => {
    dispatch({ type: "START_CAPTURE" });
  }, []);

  const imageUploaded = useCallback((cid: string, preview: string) => {
    dispatch({ type: "IMAGE_UPLOADED", payload: { cid, preview } });
  }, []);

  const startAnalysis = useCallback(() => {
    dispatch({ type: "ANALYSIS_STARTED" });
  }, []);

  const analysisComplete = useCallback((result: VisionAnalysisResult) => {
    dispatch({ type: "ANALYSIS_COMPLETE", payload: result });
  }, []);

  const startSearch = useCallback(() => {
    dispatch({ type: "SEARCH_STARTED" });
  }, []);

  const searchComplete = useCallback((results: ProductMatch[]) => {
    dispatch({ type: "SEARCH_COMPLETE", payload: results });
  }, []);

  const selectProduct = useCallback((product: ProductMatch) => {
    dispatch({ type: "SELECT_PRODUCT", payload: product });
  }, []);

  const searchError = useCallback((error: string) => {
    dispatch({ type: "SEARCH_ERROR", payload: error });
  }, []);

  const resetSearch = useCallback(() => {
    dispatch({ type: "RESET" });
  }, []);

  const value: SearchContextValue = {
    ...state,
    startCapture,
    imageUploaded,
    startAnalysis,
    analysisComplete,
    startSearch,
    searchComplete,
    selectProduct,
    searchError,
    resetSearch,
  };

  return (
    <SearchContext.Provider value={value}>{children}</SearchContext.Provider>
  );
}

// ============================================
// Hook
// ============================================

export function useSearch(): SearchContextValue {
  const context = useContext(SearchContext);
  if (!context) {
    throw new Error("useSearch must be used within a SearchContextProvider");
  }
  return context;
}

export { SearchContext };
