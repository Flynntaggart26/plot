// Windows'ta release derlemesinde konsol penceresi açılmasın.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{Emitter, Manager};
use tauri_plugin_global_shortcut::ShortcutState;

/// Kullanıcının seçtiği yola metin yazar (dışa aktarma).
///
/// Yol, yerel kaydetme penceresinden geldiği için fs eklentisinin kapsam
/// kurallarına takılmaz; yazma işi doğrudan std::fs ile yapılır.
#[tauri::command]
fn write_text_file(path: String, contents: String) -> Result<(), String> {
    std::fs::write(&path, contents).map_err(|error| error.to_string())
}

/// Kullanıcının seçtiği dosyayı okur (içe aktarma).
#[tauri::command]
fn read_text_file(path: String) -> Result<String, String> {
    std::fs::read_to_string(&path).map_err(|error| error.to_string())
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_shortcut("Ctrl+Shift+Space")
                .expect("Hızlı yakalama kısayolu geçersiz")
                .with_handler(|app, _shortcut, event| {
                    if event.state() != ShortcutState::Pressed {
                        return;
                    }

                    // Uygulama arka planda olsa bile pencereyi öne getir,
                    // sonra arayüze "yakalama sayfasını aç" sinyali gönder.
                    if let Some(window) = app.get_webview_window("main") {
                        let _ = window.unminimize();
                        let _ = window.show();
                        let _ = window.set_focus();
                    }
                    let _ = app.emit("plot:quick-capture", ());
                })
                .build(),
        )
        .invoke_handler(tauri::generate_handler![write_text_file, read_text_file])
        .run(tauri::generate_context!())
        .expect("Plot açılırken hata oluştu");
}
