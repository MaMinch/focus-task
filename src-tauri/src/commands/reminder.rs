use crate::db::Database;
use chrono::Utc;
use std::thread;
use std::time::Duration;
use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_notification::NotificationExt;

/// Start the background reminder poller.
/// Checks every 30 seconds for tasks with reminder_time <= now() that are not yet done.
pub fn start_reminder_poller(app_handle: AppHandle) {
    let db = app_handle.state::<Database>();
    let conn = db.conn.clone();

    thread::spawn(move || {
        // Skip the first immediate tick
        thread::sleep(Duration::from_secs(30));

        loop {
            let now = Utc::now().to_rfc3339();

            let triggered: Vec<(String, String)> = match conn.lock() {
                Ok(c) => {
                    let mut stmt = match c.prepare(
                        "SELECT id, title FROM tasks WHERE reminder_time IS NOT NULL AND reminder_time <= ?1 AND status != 'done' AND status != 'archived'"
                    ) {
                        Ok(s) => s,
                        Err(_) => {
                            thread::sleep(Duration::from_secs(30));
                            continue;
                        }
                    };

                    let rows = stmt.query_map(rusqlite::params![now], |row| {
                        Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
                    });

                    match rows {
                        Ok(mapped) => {
                            let results: Vec<(String, String)> = mapped
                                .filter_map(|r| r.ok())
                                .collect();

                            // Clear reminder_time for triggered tasks so they don't fire again
                            for (task_id, _) in &results {
                                let _ = c.execute(
                                    "UPDATE tasks SET reminder_time = NULL, updated_at = ?1 WHERE id = ?2",
                                    rusqlite::params![now, task_id],
                                );
                            }

                            results
                        }
                        Err(_) => {
                            thread::sleep(Duration::from_secs(30));
                            continue;
                        }
                    }
                }
                Err(_) => {
                    thread::sleep(Duration::from_secs(30));
                    continue;
                }
            };

            for (_task_id, title) in &triggered {
                let _ = app_handle
                    .notification()
                    .builder()
                    .title("⏰ 任务提醒")
                    .body(title)
                    .show();
            }

            if !triggered.is_empty() {
                let _ = app_handle.emit("reminder-triggered", true);
            }

            thread::sleep(Duration::from_secs(30));
        }
    });
}
