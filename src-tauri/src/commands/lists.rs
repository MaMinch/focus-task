use crate::db::Database;
use serde::{Deserialize, Serialize};
use tauri::State;
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize)]
pub struct TaskList {
    pub id: String,
    pub name: String,
    pub color: String,
    pub icon: String,
    pub sort_order: f64,
    pub archived: bool,
    pub created_at: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateListInput {
    pub name: String,
    pub color: Option<String>,
    pub icon: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateListInput {
    pub id: String,
    pub name: Option<String>,
    pub color: Option<String>,
    pub icon: Option<String>,
    pub sort_order: Option<f64>,
    pub archived: Option<bool>,
}

#[tauri::command]
pub fn create_list(db: State<Database>, input: CreateListInput) -> Result<TaskList, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let id = Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();
    let color = input.color.unwrap_or_else(|| "#6366f1".to_string());
    let icon = input.icon.unwrap_or_else(|| "📋".to_string());

    conn.execute(
        "INSERT INTO lists (id, name, color, icon, created_at) VALUES (?1, ?2, ?3, ?4, ?5)",
        rusqlite::params![id, input.name, color, icon, now],
    ).map_err(|e| e.to_string())?;

    Ok(TaskList {
        id,
        name: input.name,
        color,
        icon,
        sort_order: 0.0,
        archived: false,
        created_at: now,
    })
}

#[tauri::command]
pub fn get_lists(db: State<Database>, include_archived: Option<bool>) -> Result<Vec<TaskList>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let include = include_archived.unwrap_or(false);

    let sql = if include {
        "SELECT id, name, color, icon, sort_order, archived, created_at FROM lists ORDER BY sort_order ASC"
    } else {
        "SELECT id, name, color, icon, sort_order, archived, created_at FROM lists WHERE archived = 0 ORDER BY sort_order ASC"
    };

    let mut stmt = conn.prepare(sql).map_err(|e| e.to_string())?;
    let lists = stmt.query_map([], |row| {
        Ok(TaskList {
            id: row.get(0)?,
            name: row.get(1)?,
            color: row.get(2)?,
            icon: row.get(3)?,
            sort_order: row.get(4)?,
            archived: row.get::<_, i32>(5)? != 0,
            created_at: row.get(6)?,
        })
    }).map_err(|e| e.to_string())?
    .collect::<Result<Vec<TaskList>, _>>()
    .map_err(|e| e.to_string())?;

    Ok(lists)
}

#[tauri::command]
pub fn update_list(db: State<Database>, input: UpdateListInput) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;

    if let Some(name) = &input.name {
        conn.execute("UPDATE lists SET name = ?1 WHERE id = ?2", rusqlite::params![name, input.id])
            .map_err(|e| e.to_string())?;
    }
    if let Some(color) = &input.color {
        conn.execute("UPDATE lists SET color = ?1 WHERE id = ?2", rusqlite::params![color, input.id])
            .map_err(|e| e.to_string())?;
    }
    if let Some(icon) = &input.icon {
        conn.execute("UPDATE lists SET icon = ?1 WHERE id = ?2", rusqlite::params![icon, input.id])
            .map_err(|e| e.to_string())?;
    }
    if let Some(so) = input.sort_order {
        conn.execute("UPDATE lists SET sort_order = ?1 WHERE id = ?2", rusqlite::params![so, input.id])
            .map_err(|e| e.to_string())?;
    }
    if let Some(arch) = input.archived {
        let a = if arch { 1 } else { 0 };
        conn.execute("UPDATE lists SET archived = ?1 WHERE id = ?2", rusqlite::params![a, input.id])
            .map_err(|e| e.to_string())?;
    }

    Ok(())
}

#[tauri::command]
pub fn delete_list(db: State<Database>, id: String) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    // Set tasks list_id to null before deleting list
    conn.execute("UPDATE tasks SET list_id = NULL WHERE list_id = ?1", rusqlite::params![id])
        .map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM lists WHERE id = ?1", rusqlite::params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn archive_list(db: State<Database>, id: String) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    conn.execute("UPDATE lists SET archived = 1 WHERE id = ?1", rusqlite::params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}
