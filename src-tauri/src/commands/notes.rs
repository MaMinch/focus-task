use crate::db::Database;
use serde::{Deserialize, Serialize};
use tauri::State;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Note {
    pub id: String,
    pub title: String,
    pub content: String,
    pub language: String,
    pub task_id: Option<String>,
    pub list_id: Option<String>,
    pub tags: String,
    pub is_pinned: bool,
    pub is_archived: bool,
    pub sort_order: f64,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateNoteInput {
    pub title: String,
    pub content: Option<String>,
    pub language: Option<String>,
    pub task_id: Option<String>,
    pub list_id: Option<String>,
    pub tags: Option<Vec<String>>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateNoteInput {
    pub id: String,
    pub title: Option<String>,
    pub content: Option<String>,
    pub language: Option<String>,
    pub task_id: Option<String>,
    pub list_id: Option<String>,
    pub tags: Option<Vec<String>>,
    pub is_pinned: Option<bool>,
    pub is_archived: Option<bool>,
    pub sort_order: Option<f64>,
}

fn row_to_note(row: &rusqlite::Row) -> rusqlite::Result<Note> {
    Ok(Note {
        id: row.get(0)?,
        title: row.get(1)?,
        content: row.get(2)?,
        language: row.get(3)?,
        task_id: row.get(4)?,
        list_id: row.get(5)?,
        tags: row.get(6)?,
        is_pinned: row.get::<_, i32>(7)? != 0,
        is_archived: row.get::<_, i32>(8)? != 0,
        sort_order: row.get(9)?,
        created_at: row.get(10)?,
        updated_at: row.get(11)?,
    })
}

const NOTE_COLS: &str = "id, title, content, language, task_id, list_id, tags, is_pinned, is_archived, sort_order, created_at, updated_at";

#[tauri::command]
pub fn create_note(db: State<Database>, input: CreateNoteInput) -> Result<Note, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();
    let content = input.content.unwrap_or_default();
    let language = input.language.unwrap_or_else(|| "markdown".to_string());
    let tags = serde_json::to_string(&input.tags.unwrap_or_default()).unwrap_or_default();

    conn.execute(
        "INSERT INTO notes (id, title, content, language, task_id, list_id, tags, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
        rusqlite::params![id, input.title, content, language, input.task_id, input.list_id, tags, now, now],
    ).map_err(|e| e.to_string())?;

    Ok(Note {
        id,
        title: input.title,
        content,
        language,
        task_id: input.task_id,
        list_id: input.list_id,
        tags,
        is_pinned: false,
        is_archived: false,
        sort_order: 0.0,
        created_at: now.clone(),
        updated_at: now,
    })
}

#[tauri::command]
pub fn get_notes(
    db: State<Database>,
    archived: Option<bool>,
    task_id: Option<String>,
) -> Result<Vec<Note>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let show_archived = archived.unwrap_or(false);

    let mut sql = format!("SELECT {} FROM notes WHERE 1=1", NOTE_COLS);
    let mut params: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();

    if !show_archived {
        sql.push_str(" AND is_archived = 0");
    }
    if let Some(ref tid) = task_id {
        sql.push_str(" AND task_id = ?");
        params.push(Box::new(tid.clone()));
    }

    sql.push_str(" ORDER BY is_pinned DESC, sort_order ASC, updated_at DESC");

    let param_refs: Vec<&dyn rusqlite::types::ToSql> = params.iter().map(|p| p.as_ref()).collect();
    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
    let notes = stmt
        .query_map(param_refs.as_slice(), row_to_note)
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<Note>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(notes)
}

#[tauri::command]
pub fn get_note(db: State<Database>, id: String) -> Result<Option<Note>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(&format!("SELECT {} FROM notes WHERE id = ?1", NOTE_COLS))
        .map_err(|e| e.to_string())?;
    let mut rows = stmt
        .query_map(rusqlite::params![id], row_to_note)
        .map_err(|e| e.to_string())?;
    match rows.next() {
        Some(Ok(note)) => Ok(Some(note)),
        Some(Err(e)) => Err(e.to_string()),
        None => Ok(None),
    }
}

#[tauri::command]
pub fn update_note(db: State<Database>, input: UpdateNoteInput) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().to_rfc3339();

    let mut sql = String::from("UPDATE notes SET updated_at = ?1");
    let mut params: Vec<Box<dyn rusqlite::types::ToSql>> = vec![Box::new(now.clone())];

    let mut idx = 2;
    if let Some(ref v) = input.title {
        sql.push_str(&format!(", title = ?{}", idx));
        params.push(Box::new(v.clone()));
        idx += 1;
    }
    if let Some(ref v) = input.content {
        sql.push_str(&format!(", content = ?{}", idx));
        params.push(Box::new(v.clone()));
        idx += 1;
    }
    if let Some(ref v) = input.language {
        sql.push_str(&format!(", language = ?{}", idx));
        params.push(Box::new(v.clone()));
        idx += 1;
    }
    if let Some(ref v) = input.task_id {
        sql.push_str(&format!(", task_id = ?{}", idx));
        params.push(Box::new(v.clone()));
        idx += 1;
    }
    if let Some(ref v) = input.list_id {
        sql.push_str(&format!(", list_id = ?{}", idx));
        params.push(Box::new(v.clone()));
        idx += 1;
    }
    if let Some(ref v) = input.tags {
        let json = serde_json::to_string(v).unwrap_or_default();
        sql.push_str(&format!(", tags = ?{}", idx));
        params.push(Box::new(json));
        idx += 1;
    }
    if let Some(v) = input.is_pinned {
        sql.push_str(&format!(", is_pinned = ?{}", idx));
        params.push(Box::new(v as i32));
        idx += 1;
    }
    if let Some(v) = input.is_archived {
        sql.push_str(&format!(", is_archived = ?{}", idx));
        params.push(Box::new(v as i32));
        idx += 1;
    }
    if let Some(v) = input.sort_order {
        sql.push_str(&format!(", sort_order = ?{}", idx));
        params.push(Box::new(v));
        idx += 1;
    }

    sql.push_str(&format!(" WHERE id = ?{}", idx));
    params.push(Box::new(input.id));

    let param_refs: Vec<&dyn rusqlite::types::ToSql> = params.iter().map(|p| p.as_ref()).collect();
    conn.execute(&sql, param_refs.as_slice()).map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn delete_note(db: State<Database>, id: String) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM notes WHERE id = ?1", rusqlite::params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn search_notes(db: State<Database>, query: String) -> Result<Vec<Note>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let sanitized = query.replace('"', "");
    let fts_query = format!("\"{}\"", sanitized);

    let sql = format!(
        "SELECT n.{} FROM notes n INNER JOIN notes_fts fts ON n.rowid = fts.rowid WHERE notes_fts MATCH ?1 ORDER BY rank",
        NOTE_COLS
    );

    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
    let notes = stmt
        .query_map(rusqlite::params![fts_query], row_to_note)
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<Note>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(notes)
}
