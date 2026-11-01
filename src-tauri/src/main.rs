// Windows'ta release derlemesinde konsol penceresi açılmasın.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::Serialize;
use tauri::{Emitter, Manager};
use tauri_plugin_global_shortcut::ShortcutState;
use tauri_plugin_updater::UpdaterExt;

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

/// Mevcut sürüm numarasını döndürür (örn. "0.7.7").
#[tauri::command]
fn current_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

/// Verilen URL'yi varsayılan tarayıcıda açar.
#[tauri::command]
fn open_external(url: String) -> Result<(), String> {
    if cfg!(target_os = "windows") {
        std::process::Command::new("cmd")
            .args(["/C", "start", &url])
            .spawn()
            .map_err(|error| error.to_string())?;
    } else {
        std::process::Command::new("open")
            .arg(&url)
            .spawn()
            .map_err(|error| error.to_string())?;
    }
    Ok(())
}

/// Arayüze dönen güncelleme bilgisi.
///
/// Alan adları `camelCase` olarak serileşir; arayüz `downloadUrl` bekler.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateInfo {
    pub version: String,
    pub notes: Option<String>,
    pub download_url: String,
}

/// İndirme ilerlemesi (yüzde hesabı arayüzde yapılır).
#[derive(Debug, Clone, Serialize)]
struct UpdateProgress {
    downloaded: u64,
    total: Option<u64>,
}

/// Yayınlanan en son sürümü denetler.
///
/// `latest.json` adresinden okunan sürüm, çalışan sürümden yeniyse bilgi döner.
/// Yeni sürüm yoksa `None` döner (hata değildir).
#[tauri::command]
async fn check_for_update(app: tauri::AppHandle) -> Result<Option<UpdateInfo>, String> {
    let updater = app.updater().map_err(|error| error.to_string())?;
    let update = updater.check().await.map_err(|error| error.to_string())?;

    Ok(update.map(|update| UpdateInfo {
        version: update.version,
        notes: update.body,
        download_url: update.download_url.to_string(),
    }))
}

/// Güncellemeyi indirir, imzasını doğrular ve kurar.
///
/// Windows'ta eklenti, kurulumu başlattıktan sonra uygulamayı kendisi kapatır;
/// NSIS kurulumu tamamlanınca uygulama yeniden açılır. SQLite verileri korunur
/// çünkü güncelleme yalnızca uygulama dosyalarını değiştirir.
#[tauri::command]
async fn install_update(app: tauri::AppHandle) -> Result<(), String> {
    let updater = app.updater().map_err(|error| error.to_string())?;
    let update = updater.check().await.map_err(|error| error.to_string())?;

    let Some(update) = update else {
        return Err("Güncelleme bulunamadı.".to_string());
    };

    let handle = app.clone();
    let mut downloaded: u64 = 0;

    update
        .download_and_install(
            move |chunk_length, total| {
                downloaded += chunk_length as u64;
                let _ = handle.emit(
                    "plot:update-progress",
                    UpdateProgress { downloaded, total },
                );
            },
            || {},
        )
        .await
        .map_err(|error| error.to_string())?;

    Ok(())
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
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
        .invoke_handler(tauri::generate_handler![
            write_text_file,
            read_text_file,
            current_version,
            open_external,
            check_for_update,
            install_update
        ])
        .run(tauri::generate_context!())
        .expect("Plot açılırken hata oluştu");
}
