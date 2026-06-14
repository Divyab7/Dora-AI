"use client";

import React, { createContext, useContext, useReducer, useCallback, useEffect } from "react";
import type { ToastProps } from "@/components/ui/Toast";

// ============================================
// Types
// ============================================

interface Toast extends ToastProps {
  id: string;
  duration: number;
}

interface UIState {
  theme: "dark" | "light";
  activeModal: string | null;
  modalData: Record<string, unknown> | null;
  toasts: Toast[];
  sidebarOpen: boolean;
  bottomNavVisible: boolean;
  isMobile: boolean;
  isLoading: boolean;
}

type UIAction =
  | { type: "SET_THEME"; payload: "dark" | "light" }
  | { type: "OPEN_MODAL"; payload: { name: string; data?: Record<string, unknown> } }
  | { type: "CLOSE_MODAL" }
  | { type: "ADD_TOAST"; payload: Omit<Toast, "id"> }
  | { type: "DISMISS_TOAST"; payload: string }
  | { type: "TOGGLE_SIDEBAR" }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_MOBILE"; payload: boolean }
  | { type: "SET_BOTTOM_NAV_VISIBLE"; payload: boolean };

interface UIContextValue extends UIState {
  setTheme: (theme: "dark" | "light") => void;
  openModal: (name: string, data?: Record<string, unknown>) => void;
  closeModal: () => void;
  addToast: (toast: Omit<Toast, "id">) => void;
  dismissToast: (id: string) => void;
  toggleSidebar: () => void;
  setLoading: (loading: boolean) => void;
}

// ============================================
// Initial State
// ============================================

const initialState: UIState = {
  theme: "dark",
  activeModal: null,
  modalData: null,
  toasts: [],
  sidebarOpen: false,
  bottomNavVisible: true,
  isMobile: false,
  isLoading: false,
};

// ============================================
// Reducer
// ============================================

function uiReducer(state: UIState, action: UIAction): UIState {
  switch (action.type) {
    case "SET_THEME":
      return { ...state, theme: action.payload };

    case "OPEN_MODAL":
      return {
        ...state,
        activeModal: action.payload.name,
        modalData: action.payload.data ?? null,
      };

    case "CLOSE_MODAL":
      return { ...state, activeModal: null, modalData: null };

    case "ADD_TOAST": {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      return {
        ...state,
        toasts: [...state.toasts, { ...action.payload, id }],
      };
    }

    case "DISMISS_TOAST":
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.payload),
      };

    case "TOGGLE_SIDEBAR":
      return { ...state, sidebarOpen: !state.sidebarOpen };

    case "SET_LOADING":
      return { ...state, isLoading: action.payload };

    case "SET_MOBILE":
      return { ...state, isMobile: action.payload };

    case "SET_BOTTOM_NAV_VISIBLE":
      return { ...state, bottomNavVisible: action.payload };

    default:
      return state;
  }
}

// ============================================
// Context
// ============================================

const UIContext = createContext<UIContextValue | undefined>(undefined);

export function UIContextProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(uiReducer, initialState);

  // Detect mobile viewport
  useEffect(() => {
    function checkMobile() {
      const isMobileView = window.innerWidth < 768;
      dispatch({ type: "SET_MOBILE", payload: isMobileView });
    }

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Apply theme to <html>
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", state.theme);
  }, [state.theme]);

  // Auto-dismiss toasts
  useEffect(() => {
    state.toasts.forEach((toast) => {
      if (toast.duration > 0) {
        const timer = setTimeout(() => {
          dispatch({ type: "DISMISS_TOAST", payload: toast.id });
        }, toast.duration);
        return () => clearTimeout(timer);
      }
    });
  }, [state.toasts]);

  const setTheme = useCallback((theme: "dark" | "light") => {
    dispatch({ type: "SET_THEME", payload: theme });
  }, []);

  const openModal = useCallback(
    (name: string, data?: Record<string, unknown>) => {
      dispatch({ type: "OPEN_MODAL", payload: { name, data } });
    },
    []
  );

  const closeModal = useCallback(() => {
    dispatch({ type: "CLOSE_MODAL" });
  }, []);

  const addToast = useCallback(
    (toast: Omit<Toast, "id">) => {
      dispatch({ type: "ADD_TOAST", payload: toast });
    },
    []
  );

  const dismissToast = useCallback((id: string) => {
    dispatch({ type: "DISMISS_TOAST", payload: id });
  }, []);

  const toggleSidebar = useCallback(() => {
    dispatch({ type: "TOGGLE_SIDEBAR" });
  }, []);

  const setLoading = useCallback((loading: boolean) => {
    dispatch({ type: "SET_LOADING", payload: loading });
  }, []);

  const value: UIContextValue = {
    ...state,
    setTheme,
    openModal,
    closeModal,
    addToast,
    dismissToast,
    toggleSidebar,
    setLoading,
  };

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
}

// ============================================
// Hook
// ============================================

export function useUI(): UIContextValue {
  const context = useContext(UIContext);
  if (!context) {
    throw new Error("useUI must be used within a UIContextProvider");
  }
  return context;
}

export { UIContext };
export type { Toast, UIState };
