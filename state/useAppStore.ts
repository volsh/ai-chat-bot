import { UserProfile } from "@/types";
import { create } from "zustand";
import { supabaseBrowserClient as supabase } from "@/libs/supabase";
import type { Session, User } from "@supabase/supabase-js";

interface AppState {
  session: Session | null;
  user: User | null;
  userProfile: UserProfile | null;
  loadingProfile: boolean;
  isSidebarOpen: boolean;

  // Snapshot / retry logic
  activeSnapshotId?: string;
  retryLocks: Record<string, boolean>;

  // Actions
  setSession: (s: Session | null) => void;
  setUserProfile: (profile: UserProfile | null) => void;
  setLoadingProfile: (loading: boolean) => void;
  toggleSidebar: () => void;

  setActiveSnapshot: (id?: string) => void;
  setRetryLock: (snapshotId: string, locked: boolean) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  session: null,
  user: null,
  userProfile: null,
  loadingProfile: true,

  setSession: (s) => set({ session: s }),
  setUserProfile: (profile) =>
    set({
      userProfile: profile,
      loadingProfile: !!profile ? false : true,
    }),
  setLoadingProfile: (loading) => set({ loadingProfile: loading }),

  isSidebarOpen: false,
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),

  activeSnapshotId: undefined,
  retryLocks: {},

  setActiveSnapshot: (id) => set({ activeSnapshotId: id }),
  setRetryLock: (snapshotId, locked) =>
    set((state) => ({
      retryLocks: {
        ...state.retryLocks,
        [snapshotId]: locked,
      },
    })),
}));
