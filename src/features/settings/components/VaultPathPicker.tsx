import { open } from "@tauri-apps/plugin-dialog";
import styles from "./VaultPathPicker.module.css";

interface Props {
  vaultPath: string;
  onSaveVaultPath: (path: string) => void;
}

export function VaultPathPicker({ vaultPath, onSaveVaultPath }: Props) {
  async function handleChooseFolder() {
    try {
      const selected = await open({ directory: true, multiple: false });
      if (typeof selected === "string" && selected) {
        onSaveVaultPath(selected);
      }
    } catch (e) {
      console.error("[VaultPathPicker] dialog failed:", e);
    }
  }

  return (
    <div className={styles.picker}>
      <button className={styles.chooseBtn} onClick={handleChooseFolder}>
        Choose Folder…
      </button>
      {vaultPath ? (
        <p className={styles.path} title={vaultPath}>
          {vaultPath}
        </p>
      ) : (
        <p className={styles.pathEmpty}>No folder selected</p>
      )}
    </div>
  );
}
