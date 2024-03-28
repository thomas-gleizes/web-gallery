import { create } from "zustand";
import { FilesTypes } from "../../types";

export const useFileStore = create<{
  files: FilesTypes;
  loading: boolean;
  ready: boolean;
  init: () => void;
}>((set) => ({
  files: [],
  ready: false,
  loading: false,
  init: async () => {
    try {
      set({ loading: true });
      const response = await fetch("/api/scan");
      const files = await response.json();
      set({ files, ready: true, loading: false });
    } catch (error) {
      set({ ready: false, loading: false });
    }
  },
}));
