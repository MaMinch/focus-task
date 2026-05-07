use crate::db::Database;
use serde::{Deserialize, Serialize};
use tauri::State;
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, Clone)]
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

fn row_to_task(row: &rusqlite::Row) -> rusqlite::Result<Task> {
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
}

const TASK_COLS: &str = "id, title, description, priority, status, due_date, reminder_time, repeat_rule, parent_id, list_id, tags, sort_order, created_at, updated_at, completed_at";

#[tauri::command]
pub fn get_task(db: State<Database>, id: String) -> Result<Option<Task>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(&format!("SELECT {} FROM tasks WHERE id = ?1", TASK_COLS))
        .map_err(|e| e.to_string())?;
    let mut rows = stmt
        .query_map(rusqlite::params![id], row_to_task)
        .map_err(|e| e.to_string())?;
    match rows.next() {
        Some(Ok(task)) => Ok(Some(task)),
        Some(Err(e)) => Err(e.to_string()),
        None => Ok(None),
    }
}

#[tauri::command]
pub fn get_subtasks(db: State<Database>, parent_id: String) -> Result<Vec<Task>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(&format!(
            "SELECT {} FROM tasks WHERE parent_id = ?1 ORDER BY sort_order ASC, created_at DESC",
            TASK_COLS
        ))
        .map_err(|e| e.to_string())?;
    let tasks = stmt
        .query_map(rusqlite::params![parent_id], row_to_task)
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<Task>, _>>()
        .map_err(|e| e.to_string())?;
    Ok(tasks)
}

#[tauri::command]
pub fn search_tasks(db: State<Database>, query: String) -> Result<Vec<Task>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;

    // Sanitize query: escape double-quotes, wrap in quotes for phrase search
    let sanitized = query.replace('"', "");
    let fts_query = format!("\"{}\"", sanitized);

    let sql = format!(
        "SELECT t.{} FROM tasks t INNER JOIN tasks_fts fts ON t.rowid = fts.rowid WHERE tasks_fts MATCH ?1 ORDER BY rank",
        TASK_COLS
    );

    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
    let tasks = stmt
        .query_map(rusqlite::params![fts_query], row_to_task)
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<Task>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(tasks)
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

    let mut sql = format!("SELECT {} FROM tasks WHERE parent_id IS NULL", TASK_COLS);
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
    let tasks = stmt.query_map(param_refs.as_slice(), row_to_task)
        .map_err(|e| e.to_string())?
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
    if let Some(ref s) = input.status {
        let completed_at = if s == "done" { Some(now.clone()) } else { None };
        conn.execute("UPDATE tasks SET status = ?1, completed_at = ?2, updated_at = ?3 WHERE id = ?4",
            rusqlite::params![s, completed_at, now, input.id]).map_err(|e| e.to_string())?;
    }
    if let Some(ref d) = input.due_date {
        conn.execute("UPDATE tasks SET due_date = ?1, updated_at = ?2 WHERE id = ?3",
            rusqlite::params![d, now, input.id]).map_err(|e| e.to_string())?;
    }
    if let Some(ref r) = input.reminder_time {
        conn.execute("UPDATE tasks SET reminder_time = ?1, updated_at = ?2 WHERE id = ?3",
            rusqlite::params![r, now, input.id]).map_err(|e| e.to_string())?;
    }
    if let Some(ref rp) = input.repeat_rule {
        conn.execute("UPDATE tasks SET repeat_rule = ?1, updated_at = ?2 WHERE id = ?3",
            rusqlite::params![rp, now, input.id]).map_err(|e| e.to_string())?;
    }
    if let Some(ref pid) = input.parent_id {
        conn.execute("UPDATE tasks SET parent_id = ?1, updated_at = ?2 WHERE id = ?3",
            rusqlite::params![pid, now, input.id]).map_err(|e| e.to_string())?;
    }
    if let Some(ref lid) = input.list_id {
        conn.execute("UPDATE tasks SET list_id = ?1, updated_at = ?2 WHERE id = ?3",
            rusqlite::params![lid, now, input.id]).map_err(|e| e.to_string())?;
    }
    if let Some(ref tags) = input.tags {
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
    // Cascade delete subtasks
    conn.execute("DELETE FROM tasks WHERE parent_id = ?1", rusqlite::params![id])
        .map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM tasks WHERE id = ?1", rusqlite::params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

/// Calculate the next due date based on a repeat rule.
/// Supported rules:
///   - "daily" -> +1 day
///   - "weekly" -> +7 days
///   - "monthly" -> +1 month
///   - "weekdays" -> next weekday (skips weekends)
///   - "N days" / "every N days" -> +N days
fn calc_next_due(current_due: Option<&str>, rule: &str) -> Option<String> {
    use chrono::{Datelike, Duration, NaiveDate, Timelike, Weekday};

    let rule = rule.trim().to_lowercase();

    // Determine the base date: use current due_date, or now
    let base = if let Some(ds) = current_due {
        // Parse as RFC3339 datetime
        chrono::DateTime::parse_from_rfc3339(ds)
            .ok()
            .map(|dt| dt.naive_utc())
            .or_else(|| {
                // Try date-only
                NaiveDate::parse_from_str(ds, "%Y-%m-%d")
                    .ok()
                    .map(|d| d.and_hms_opt(0, 0, 0).unwrap())
            })
    } else {
        None
    };

    let now_naive = chrono::Utc::now().naive_utc();
    let base = base.unwrap_or(now_naive);

    let next = match rule.as_str() {
        "daily" => base + Duration::days(1),
        "weekly" => base + Duration::days(7),
        "monthly" => {
            // Add ~30 days
            let next_date = base.date() + Duration::days(30);
            let h = base.time().hour();
            let m = base.time().minute();
            next_date.and_hms_opt(h, m, 0).unwrap_or(base + Duration::days(30))
        }
        "weekdays" => {
            let mut next = base + Duration::days(1);
            loop {
                match next.weekday() {
                    Weekday::Sat | Weekday::Sun => next = next + Duration::days(1),
                    _ => break,
                }
            }
            next
        }
        _ => {
            // Try "N days" or "every N days" pattern
            let num: i64 = rule
                .replace("days", "")
                .replace("day", "")
                .replace("every", "")
                .replace(" ", "")
                .trim()
                .parse()
                .unwrap_or(0);
            if num > 0 {
                base + Duration::days(num)
            } else {
                // Default: weekly
                base + Duration::days(7)
            }
        }
    };

    Some(next.and_utc().to_rfc3339())
}

#[tauri::command]
pub fn complete_task(db: State<Database>, id: String) -> Result<Option<Task>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().to_rfc3339();

    // First, read the task to check for repeat_rule
    let mut stmt = conn
        .prepare(&format!("SELECT {} FROM tasks WHERE id = ?1", TASK_COLS))
        .map_err(|e| e.to_string())?;
    let task = stmt
        .query_map(rusqlite::params![id], row_to_task)
        .map_err(|e| e.to_string())?
        .next()
        .transpose()
        .map_err(|e| e.to_string())?;

    let task = match task {
        Some(t) => t,
        None => return Err("Task not found".to_string()),
    };

    if let Some(ref rule) = task.repeat_rule {
        if !rule.trim().is_empty() {
            // Recurring task: calculate next due_date and reset status
            let next_due = calc_next_due(task.due_date.as_deref(), rule);
            conn.execute(
                "UPDATE tasks SET status = 'todo', completed_at = NULL, due_date = ?1, updated_at = ?2 WHERE id = ?3",
                rusqlite::params![next_due, now, id],
            )
            .map_err(|e| e.to_string())?;

            // Read updated task to return
            let mut stmt2 = conn
                .prepare(&format!("SELECT {} FROM tasks WHERE id = ?1", TASK_COLS))
                .map_err(|e| e.to_string())?;
            let updated = stmt2
                .query_map(rusqlite::params![id], row_to_task)
                .map_err(|e| e.to_string())?
                .next()
                .transpose()
                .map_err(|e| e.to_string())?;
            return Ok(updated);
        }
    }

    // Non-recurring: mark as done
    conn.execute(
        "UPDATE tasks SET status = 'done', completed_at = ?1, updated_at = ?1 WHERE id = ?2",
        rusqlite::params![now, id],
    )
    .map_err(|e| e.to_string())?;

    Ok(None)
}
