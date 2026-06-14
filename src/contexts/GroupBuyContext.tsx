"use client";

import React, { createContext, useContext, useReducer, useCallback } from "react";
import type { GroupBuy, GroupBuyParticipant, GroupBuyStatus } from "@/types/groupbuy";

// ============================================
// Types
// ============================================

interface GroupBuyState {
  activeGroupBuys: GroupBuy[];
}

type GroupBuyAction =
  | { type: "CREATE_GROUP_BUY"; payload: GroupBuy }
  | { type: "JOIN_GROUP_BUY"; payload: { groupId: string; participant: GroupBuyParticipant } }
  | { type: "CONTRIBUTION_RECEIVED"; payload: { groupId: string; totalHbar: string } }
  | { type: "GROUP_BUY_EXECUTED"; payload: string }
  | { type: "GROUP_BUY_CANCELLED"; payload: string }
  | { type: "UPDATE_STATUS"; payload: { groupId: string; status: GroupBuyStatus } }
  | { type: "LOAD_GROUP_BUYS"; payload: GroupBuy[] };

interface GroupBuyContextValue extends GroupBuyState {
  createGroupBuy: (group: GroupBuy) => void;
  joinGroupBuy: (groupId: string, participant: GroupBuyParticipant) => void;
  recordContribution: (groupId: string, totalHbar: string) => void;
  executeGroupBuy: (groupId: string) => void;
  cancelGroupBuy: (groupId: string) => void;
}

// ============================================
// Initial State
// ============================================

const initialState: GroupBuyState = {
  activeGroupBuys: [],
};

// ============================================
// Reducer
// ============================================

function groupBuyReducer(state: GroupBuyState, action: GroupBuyAction): GroupBuyState {
  switch (action.type) {
    case "CREATE_GROUP_BUY":
      return {
        ...state,
        activeGroupBuys: [action.payload, ...state.activeGroupBuys],
      };

    case "JOIN_GROUP_BUY":
      return {
        ...state,
        activeGroupBuys: state.activeGroupBuys.map((gb) =>
          gb.groupId === action.payload.groupId
            ? {
                ...gb,
                participants: [...gb.participants, action.payload.participant],
              }
            : gb
        ),
      };

    case "CONTRIBUTION_RECEIVED":
      return {
        ...state,
        activeGroupBuys: state.activeGroupBuys.map((gb) =>
          gb.groupId === action.payload.groupId
            ? {
                ...gb,
                currentContributionsHbar: action.payload.totalHbar,
                fullyFunded:
                  BigInt(action.payload.totalHbar) >= BigInt(gb.totalAmountHbar),
              }
            : gb
        ),
      };

    case "GROUP_BUY_EXECUTED":
      return {
        ...state,
        activeGroupBuys: state.activeGroupBuys.map((gb) =>
          gb.groupId === action.payload
            ? { ...gb, status: "executed", executedAt: new Date().toISOString() }
            : gb
        ),
      };

    case "GROUP_BUY_CANCELLED":
      return {
        ...state,
        activeGroupBuys: state.activeGroupBuys.map((gb) =>
          gb.groupId === action.payload ? { ...gb, status: "cancelled" } : gb
        ),
      };

    case "UPDATE_STATUS":
      return {
        ...state,
        activeGroupBuys: state.activeGroupBuys.map((gb) =>
          gb.groupId === action.payload.groupId
            ? { ...gb, status: action.payload.status }
            : gb
        ),
      };

    case "LOAD_GROUP_BUYS":
      return { activeGroupBuys: action.payload };

    default:
      return state;
  }
}

// ============================================
// Context
// ============================================

const GroupBuyContext = createContext<GroupBuyContextValue | undefined>(undefined);

export function GroupBuyContextProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(groupBuyReducer, initialState);

  const createGroupBuy = useCallback((group: GroupBuy) => {
    dispatch({ type: "CREATE_GROUP_BUY", payload: group });
  }, []);

  const joinGroupBuy = useCallback((groupId: string, participant: GroupBuyParticipant) => {
    dispatch({ type: "JOIN_GROUP_BUY", payload: { groupId, participant } });
  }, []);

  const recordContribution = useCallback((groupId: string, totalHbar: string) => {
    dispatch({ type: "CONTRIBUTION_RECEIVED", payload: { groupId, totalHbar } });
  }, []);

  const executeGroupBuy = useCallback((groupId: string) => {
    dispatch({ type: "GROUP_BUY_EXECUTED", payload: groupId });
  }, []);

  const cancelGroupBuy = useCallback((groupId: string) => {
    dispatch({ type: "GROUP_BUY_CANCELLED", payload: groupId });
  }, []);

  return (
    <GroupBuyContext.Provider
      value={{
        ...state,
        createGroupBuy,
        joinGroupBuy,
        recordContribution,
        executeGroupBuy,
        cancelGroupBuy,
      }}
    >
      {children}
    </GroupBuyContext.Provider>
  );
}

export function useGroupBuy(): GroupBuyContextValue {
  const ctx = useContext(GroupBuyContext);
  if (!ctx) throw new Error("useGroupBuy must be within GroupBuyContextProvider");
  return ctx;
}
