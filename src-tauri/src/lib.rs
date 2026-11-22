mod projects;

use tracing_subscriber::EnvFilter;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tracing_subscriber::fmt()
        .with_env_filter(EnvFilter::try_from_default_env().unwrap_or_else(|_| {
            EnvFilter::new(if cfg!(debug_assertions) {
                "info,symbiote_lib=debug"
            } else {
                "info"
            })
        }))
        .init();

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            projects::list_projects,
            projects::default_project_dir,
            projects::create_project,
            projects::open_project,
            projects::forget_project,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
