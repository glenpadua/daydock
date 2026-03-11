use notify::{recommended_watcher, Event, EventKind, RecursiveMode, Result as NotifyResult, Watcher};
use std::sync::Mutex;
use tauri::Emitter;

struct WatcherState(Mutex<Option<notify::RecommendedWatcher>>);

fn expand_home(path: &str) -> String {
    if path.starts_with("~/") {
        if let Ok(home) = std::env::var("HOME") {
            return format!("{}{}", home, &path[1..]);
        }
    }
    path.to_string()
}

#[tauri::command]
fn read_daily_note(path: String) -> Result<String, String> {
    let expanded = expand_home(&path);
    std::fs::read_to_string(&expanded).map_err(|e| e.to_string())
}

#[tauri::command]
fn write_daily_note(path: String, content: String) -> Result<(), String> {
    let expanded = expand_home(&path);
    std::fs::write(&expanded, content.as_bytes()).map_err(|e| e.to_string())
}

#[tauri::command]
fn start_file_watch(
    app: tauri::AppHandle,
    path: String,
    state: tauri::State<'_, WatcherState>,
) -> Result<(), String> {
    let expanded = expand_home(&path);
    let mut guard = state.0.lock().map_err(|e| e.to_string())?;

    // Drop old watcher (stops previous watch)
    *guard = None;

    let app_handle = app.clone();
    let mut watcher =
        recommended_watcher(move |res: NotifyResult<Event>| {
            if let Ok(event) = res {
                if !matches!(event.kind, EventKind::Remove(_)) {
                    app_handle.emit("note-changed", ()).ok();
                }
            }
        })
        .map_err(|e| e.to_string())?;

    watcher
        .watch(
            std::path::Path::new(&expanded),
            RecursiveMode::NonRecursive,
        )
        .map_err(|e| e.to_string())?;

    *guard = Some(watcher);
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(WatcherState(Mutex::new(None)))
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_autostart::init(tauri_plugin_autostart::MacosLauncher::LaunchAgent, None))
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![read_daily_note, write_daily_note, start_file_watch])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
