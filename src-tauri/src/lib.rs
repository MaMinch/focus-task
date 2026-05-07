use tauri::Manager;

mod db;
mod commands;

use db::Database;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .setup(|app| {
            let app_data_dir = app.path().app_data_dir().expect("failed to get app data dir");
            let database = Database::new(app_data_dir).expect("failed to initialize database");
            app.manage(database);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::tasks::create_task,
            commands::tasks::get_tasks,
            commands::tasks::update_task,
            commands::tasks::delete_task,
            commands::tasks::complete_task,
            commands::lists::create_list,
            commands::lists::get_lists,
            commands::lists::update_list,
            commands::lists::delete_list,
            commands::lists::archive_list,
        ])
        .run(tauri::generate_context!())
        .expect("error while running FocusTask");
}
