use crate::db::Database;
use serde::{Deserialize, Serialize};
use tauri::State;

#[derive(Debug, Serialize, Deserialize)]
pub struct ExportData {
    pub tasks: Vec<super::tasks::Task>,
    pub lists: Vec<super::lists::TaskList>,
    pub exported_at: String,
    pub version: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CsvTask {
    pub title: String,
    pub description: String,
    pub priority: String,
    pub status: String,
    pub due_date: String,
    pub list_name: String,
    pub tags: String,
    pub created_at: String,
    pub completed_at: String,
}

/// Export all data as JSON
#[tauri::command]
pub fn export_all_json(db: State<Database>) -> Result<String, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;

    let tasks: Vec<super::tasks::Task> = conn
        .prepare("SELECT id, title, description, priority, status, due_date, reminder_time, repeat_rule, parent_id, list_id, tags, sort_order, created_at, updated_at, completed_at FROM tasks")
        .map_err(|e| e.to_string())?
        .query_map([], super::tasks::row_to_task)
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    let lists: Vec<super::lists::TaskList> = conn
        .prepare("SELECT id, name, color, icon, sort_order, archived, created_at FROM lists")
        .map_err(|e| e.to_string())?
        .query_map([], super::lists::row_to_list)
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    let data = ExportData {
        tasks,
        lists,
        exported_at: chrono::Utc::now().to_rfc3339(),
        version: env!("CARGO_PKG_VERSION").to_string(),
    };

    serde_json::to_string_pretty(&data).map_err(|e| e.to_string())
}

/// Import tasks and lists from JSON data
#[tauri::command]
pub fn import_json(db: State<Database>, json_data: String) -> Result<String, String> {
    let data: ExportData = serde_json::from_str(&json_data).map_err(|e| e.to_string())?;
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let mut imported = 0;
    let now = chrono::Utc::now().to_rfc3339();

    // Import lists first (with ID mapping)
    for list in &data.lists {
        let exists: bool = conn
            .query_row(
                "SELECT COUNT(*) > 0 FROM lists WHERE id = ?1",
                rusqlite::params![list.id],
                |row| row.get(0),
            )
            .unwrap_or(false);
        if !exists {
            conn.execute(
                "INSERT INTO lists (id, name, color, icon, sort_order, archived, created_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
                rusqlite::params![list.id, list.name, list.color, list.icon, list.sort_order, list.archived, list.created_at],
            )
            .map_err(|e| e.to_string())?;
        }
    }

    // Import tasks (skip if same ID exists)
    for task in &data.tasks {
        let exists: bool = conn
            .query_row(
                "SELECT COUNT(*) > 0 FROM tasks WHERE id = ?1",
                rusqlite::params![task.id],
                |row| row.get(0),
            )
            .unwrap_or(false);
        if !exists {
            conn.execute(
                "INSERT INTO tasks (id, title, description, priority, status, due_date, reminder_time, repeat_rule, parent_id, list_id, tags, sort_order, created_at, updated_at, completed_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15)",
                rusqlite::params![
                    task.id, task.title, task.description, task.priority, task.status,
                    task.due_date, task.reminder_time, task.repeat_rule,
                    task.parent_id, task.list_id, task.tags, task.sort_order,
                    task.created_at, now, task.completed_at,
                ],
            )
            .map_err(|e| e.to_string())?;
            imported += 1;
        }
    }

    Ok(format!("导入了 {} 个任务，{} 个清单", imported, data.lists.len()))
}

/// Export tasks as CSV string
#[tauri::command]
pub fn export_csv(db: State<Database>) -> Result<String, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;

    let mut csv = String::from("标题,描述,优先级,状态,截止日期,清单,标签,创建时间,完成时间\n");

    let mut stmt = conn
        .prepare(
            "SELECT t.title, t.description, t.priority, t.status, t.due_date,
                    COALESCE(l.name, ''), t.tags, t.created_at, t.completed_at
             FROM tasks t LEFT JOIN lists l ON t.list_id = l.id
             ORDER BY t.created_at DESC",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([], |row| {
            Ok(CsvTask {
                title: row.get(0)?,
                description: row.get(1)?,
                priority: row.get::<_, i32>(2).map(|p| priority_label(p)).unwrap_or_default(),
                status: row.get::<_, String>(3).map(|s| status_label(&s)).unwrap_or_default(),
                due_date: row.get::<_, Option<String>>(4).unwrap_or_default().unwrap_or_default(),
                list_name: row.get(5)?,
                tags: row.get::<_, String>(6).unwrap_or_default(),
                created_at: row.get(7)?,
                completed_at: row.get::<_, Option<String>>(8).unwrap_or_default().unwrap_or_default(),
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    for row in &rows {
        csv.push_str(&format!(
            "\"{}\",\"{}\",\"{}\",\"{}\",\"{}\",\"{}\",\"{}\",\"{}\",\"{}\"\n",
            escape_csv(&row.title),
            escape_csv(&row.description),
            row.priority,
            row.status,
            row.due_date,
            escape_csv(&row.list_name),
            escape_csv(&row.tags),
            row.created_at,
            row.completed_at,
        ));
    }

    Ok(csv)
}

fn priority_label(p: i32) -> String {
    match p {
        0 => "P0 紧急".into(),
        1 => "P1 高".into(),
        2 => "P2 中".into(),
        3 => "P3 低".into(),
        _ => "未知".into(),
    }
}

fn status_label(s: &str) -> String {
    match s {
        "todo" => "待办".into(),
        "in_progress" => "进行中".into(),
        "done" => "已完成".into(),
        "archived" => "已归档".into(),
        _ => s.to_string(),
    }
}

fn escape_csv(s: &str) -> String {
    s.replace('"', "\"\"")
}
