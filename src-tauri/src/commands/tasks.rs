use crate::db::Database;
use serde::{Deserialize, Serialize};
use tauri::State;
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize)]
pub struct Task {
    pub id: String,
    pub title: String,
    pub description: String,
    pub priority: i32,
    pub status: String,
    pub due_date: Option<String>,
    pub reminder_time: Option<String>,
    pub repeat_rule: Option<String>,
    pub parent_id: Option<String>,
    pub list_id: Option<String>,
    pub tags: String,
    pub sort_order: f64,
    pub created_at: String,
    pub updated_at: String,
    pub completed_at: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateTaskInput {
    pub title: String,
    pub description: Option<String>,
    pub priority: Option<i32>,
    pub due_date: Option<String>,
    pub reminder_time: Option<String>,
    pub repeat_rule: Option<String>,
    pub parent_id: Option<String>,
    pub list_id: Option<String>,
    pub tags: Option<Vec<String>>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateTaskInput {
    pub id: String,
    pub title: Option<String>,
    pub description: Option<String>,
    pub priority: Option<i32>,
    pub status: Option<String>,
    pub due_date: Option<String>,
    pub reminder_time: Option<String>,
    pub repeat_rule: Option<String>,
    pub parent_id: Option<String>,
    pub list_id: Option<String>,
    pub tags: Option<Vec<String>>,
    pub sort_order: Option<f64>,
}

#[tauri::command]
pub fn create_task(db: State<Database>, input: CreateTaskInput) -> Result<Task, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let id = Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();
    let tags = serde_json::to_string(&input.tags.unwrap_or_default()).unwrap_or_default();
    let priority = input.priority.unwrap_or(2);
    let description = input.description.unwrap_or_default();

    conn.execute(
        "INSERT INTO tasks (id, title, description, priority, due_date, reminder_time, repeat_rule, parent_id, list_id, tags, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)",
        rusqlite::params![id, input.title, description, priority, input.due_date, input.reminder_time, input.repeat_rule, input.parent_id, input.list_id, tags, now, now],
    ).map_err(|e| e.to_string())?;

    Ok(Task {
        id,
        title: input.title,
        description,
        priority,
        status: "todo".to_string(),
        due_date: input.due_date,
        reminder_time: input.reminder_time,
        repeat_rule: input.repeat_rule,
        parent_id: input.parent_id,
        list_id: input.list_id,
        tags,
        sort_order: 0.0,
        created_at: now.clone(),
        updated_at: now,
        completed_at: None,
    })
}

#[tauri::command]
pub fn get_tasks(
    db: State<Database>,
    list_id: Option<String>,
    status: Option<String>,
    priority: Option<i32>,
) -> Result<Vec<Task>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;

    let mut sql = "SELECT id, title, description, priority, status, due_date, reminder_time, repeat_rule, parent_id, list_id, tags, sort_order, created_at, updated_at, completed_at FROM tasks WHERE 1=1".to_string();
    let mut params: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();

    if let Some(ref lid) = list_id {
        sql.push_str(" AND list_id = ?");
        params.push(Box::new(lid.clone()));
    }
    if let Some(ref s) = status {
        // "all" means no status filter; "active" means todo + in_progress
        if s == "active" {
            sql.push_str(" AND status IN ('todo', 'in_progress')");
        } else if s != "all" {
            sql.push_str(" AND status = ?");
            params.push(Box::new(s.clone()));
        }
    }
    if let Some(p) = priority {
        sql.push_str(" AND priority = ?");
        params.push(Box::new(p));
    }

    sql.push_str(" ORDER BY sort_order ASC, created_at DESC");

    let param_refs: Vec<&dyn rusqlite::types::ToSql> = params.iter().map(|p| p.as_ref()).collect();
    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
    let tasks = stmt.query_map(param_refs.as_slice(), |row| {
        Ok(Task {
            id: row.get(0)?,
            title: row.get(1)?,
            description: row.get(2)?,
            priority: row.get(3)?,
            status: row.get(4)?,
            due_date: row.get(5)?,
            reminder_time: row.get(6)?,
            repeat_rule: row.get(7)?,
            parent_id: row.get(8)?,
            list_id: row.get(9)?,
            tags: row.get(10)?,
            sort_order: row.get(11)?,
            created_at: row.get(12)?,
            updated_at: row.get(13)?,
            completed_at: row.get(14)?,
        })
    }).map_err(|e| e.to_string())?
    .collect::<Result<Vec<Task>, _>>()
    .map_err(|e| e.to_string())?;

    Ok(tasks)
}

#[tauri::command]
pub fn update_task(db: State<Database>, input: UpdateTaskInput) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().to_rfc3339();

    if let Some(title) = &input.title {
        conn.execute("UPDATE tasks SET title = ?1, updated_at = ?2 WHERE id = ?3",
            rusqlite::params![title, now, input.id]).map_err(|e| e.to_string())?;
    }
    if let Some(desc) = &input.description {
        conn.execute("UPDATE tasks SET description = ?1, updated_at = ?2 WHERE id = ?3",
            rusqlite::params![desc, now, input.id]).map_err(|e| e.to_string())?;
    }
    if let Some(p) = input.priority {
        conn.execute("UPDATE tasks SET priority = ?1, updated_at = ?2 WHERE id = ?3",
            rusqlite::params![p, now, input.id]).map_err(|e| e.to_string())?;
    }
    if let Some(s) = &input.status {
        let completed_at = if s == "done" { Some(now.clone()) } else { None };
        conn.execute("UPDATE tasks SET status = ?1, completed_at = ?2, updated_at = ?3 WHERE id = ?4",
            rusqlite::params![s, completed_at, now, input.id]).map_err(|e| e.to_string())?;
    }
    if let Some(d) = &input.due_date {
        conn.execute("UPDATE tasks SET due_date = ?1, updated_at = ?2 WHERE id = ?3",
            rusqlite::params![d, now, input.id]).map_err(|e| e.to_string())?;
    }
    if let Some(r) = &input.reminder_time {
        conn.execute("UPDATE tasks SET reminder_time = ?1, updated_at = ?2 WHERE id = ?3",
            rusqlite::params![r, now, input.id]).map_err(|e| e.to_string())?;
    }
    if let Some(rp) = &input.repeat_rule {
        conn.execute("UPDATE tasks SET repeat_rule = ?1, updated_at = ?2 WHERE id = ?3",
            rusqlite::params![rp, now, input.id]).map_err(|e| e.to_string())?;
    }
    if let Some(pid) = &input.parent_id {
        conn.execute("UPDATE tasks SET parent_id = ?1, updated_at = ?2 WHERE id = ?3",
            rusqlite::params![pid, now, input.id]).map_err(|e| e.to_string())?;
    }
    if let Some(lid) = &input.list_id {
        conn.execute("UPDATE tasks SET list_id = ?1, updated_at = ?2 WHERE id = ?3",
            rusqlite::params![lid, now, input.id]).map_err(|e| e.to_string())?;
    }
    if let Some(tags) = &input.tags {
        let tags_json = serde_json::to_string(tags).unwrap_or_default();
        conn.execute("UPDATE tasks SET tags = ?1, updated_at = ?2 WHERE id = ?3",
            rusqlite::params![tags_json, now, input.id]).map_err(|e| e.to_string())?;
    }
    if let Some(so) = input.sort_order {
        conn.execute("UPDATE tasks SET sort_order = ?1, updated_at = ?2 WHERE id = ?3",
            rusqlite::params![so, now, input.id]).map_err(|e| e.to_string())?;
    }

    Ok(())
}

#[tauri::command]
pub fn delete_task(db: State<Database>, id: String) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM tasks WHERE id = ?1", rusqlite::params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn complete_task(db: State<Database>, id: String) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().to_rfc3339();

    conn.execute(
        "UPDATE tasks SET status = 'done', completed_at = ?1, updated_at = ?1 WHERE id = ?2",
        rusqlite::params![now, id],
    ).map_err(|e| e.to_string())?;

    Ok(())
}
