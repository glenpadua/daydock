import { invoke } from "@tauri-apps/api/core";
import { useEffect } from "react";

export function useFileWatcher(path: string | null) {
  useEffect(() => {
    if (!path) return;
    invoke("start_file_watch", { path }).catch(console.error);
  }, [path]);
}
