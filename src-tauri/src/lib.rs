use tauri::{Emitter, Manager};

mod db;
mod commands;

use db::Database;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .setup(|app| {
            // Close → minimize to tray
            let window = app.get_webview_window("main").unwrap();
            let window_clone = window.clone();
            window.on_window_event(move |event| {
                if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                    api.prevent_close();
                    let _ = window_clone.hide();
                }
            });

            let app_data_dir = app.path().app_data_dir().expect("failed to get app data dir");
            let database = Database::new(app_data_dir).expect("failed to initialize database");
            app.manage(database);

            // ── System Tray ──
            use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
            use tauri::menu::{MenuBuilder, MenuItemBuilder};

            let show_hide = MenuItemBuilder::with_id("show_hide", "显示/隐藏").build(app)?;
            let separator = tauri::menu::PredefinedMenuItem::separator(app)?;
            let quit = MenuItemBuilder::with_id("quit", "退出").build(app)?;
            let menu = MenuBuilder::new(app)
                .item(&show_hide)
                .item(&separator)
                .item(&quit)
                .build()?;

            let _tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().cloned().unwrap())
                .menu(&menu)
                .tooltip("FocusTask")
                .on_menu_event(move |app, event| {
                    match event.id().as_ref() {
                        "show_hide" => {
                            if let Some(window) = app.get_webview_window("main") {
                                if window.is_visible().unwrap_or(false) {
                                    let _ = window.hide();
                                } else {
                                    let _ = window.show();
                                    let _ = window.set_focus();
                                }
                            }
                        }
                        "quit" => {
                            app.exit(0);
                        }
                        _ => {}
                    }
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            if window.is_visible().unwrap_or(false) {
                                let _ = window.hide();
                            } else {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                    }
                })
                .build(app)?;

            // Register global shortcut: Ctrl+Shift+N for quick add
            use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};
            let app_handle = app.handle().clone();
            let shortcut = Shortcut::new(Some(Modifiers::CONTROL | Modifiers::SHIFT), Code::KeyN);
            let _ = app_handle.global_shortcut().on_shortcut(shortcut, move |app, _sc, event| {
                if event.state == ShortcutState::Pressed {
                    let _ = app.emit("quick-add", true);
                }
            });

            // Register global shortcut: Ctrl+Shift+M for quick note
            let app_handle2 = app.handle().clone();
            let note_shortcut = Shortcut::new(Some(Modifiers::CONTROL | Modifiers::SHIFT), Code::KeyM);
            let _ = app_handle2.global_shortcut().on_shortcut(note_shortcut, move |app, _sc, event| {
                if event.state == ShortcutState::Pressed {
                    let _ = app.emit("quick-note", true);
                }
            });

            // Start reminder poller
            commands::reminder::start_reminder_poller(app.handle().clone());

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::tasks::get_task,
            commands::tasks::get_subtasks,
            commands::tasks::search_tasks,
            commands::tasks::create_task,
            commands::tasks::get_tasks,
            commands::tasks::update_task,
            commands::tasks::delete_task,
            commands::tasks::complete_task,
            commands::tasks::update_task_order,
            commands::lists::create_list,
            commands::lists::get_lists,
            commands::lists::update_list,
            commands::lists::delete_list,
            commands::lists::archive_list,
            commands::sync::export_all_json,
            commands::sync::import_json,
            commands::sync::export_csv,
            commands::notes::create_note,
            commands::notes::get_notes,
            commands::notes::get_note,
            commands::notes::update_note,
            commands::notes::delete_note,
            commands::notes::search_notes,
        ])
        .run(tauri::generate_context!())
        .expect("error while running FocusTask");
}
