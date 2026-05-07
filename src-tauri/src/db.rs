use rusqlite::{Connection, Result as SqliteResult};
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;

pub struct Database {
    pub conn: Mutex<Connection>,
}

impl Database {
    pub fn new(app_data_dir: PathBuf) -> SqliteResult<Self> {
        fs::create_dir_all(&app_data_dir).ok();
        let db_path = app_data_dir.join("focus-task.db");
        let conn = Connection::open(&db_path)?;
        conn.execute_batch("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;")?;
        let db = Database {
            conn: Mutex::new(conn),
        };
        db.run_migrations()?;
        Ok(db)
    }

    fn run_migrations(&self) -> SqliteResult<()> {
        let conn = self.conn.lock().unwrap();

        conn.execute_batch(
            "CREATE TABLE IF NOT EXISTS lists (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                color TEXT DEFAULT '#6366f1',
                icon TEXT DEFAULT '📋',
                sort_order REAL DEFAULT 0,
                archived INTEGER DEFAULT 0,
                created_at TEXT DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS tasks (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                description TEXT DEFAULT '',
                priority INTEGER DEFAULT 2,
                status TEXT DEFAULT 'todo',
                due_date TEXT,
                reminder_time TEXT,
                repeat_rule TEXT,
                parent_id TEXT,
                list_id TEXT,
                tags TEXT DEFAULT '[]',
                sort_order REAL DEFAULT 0,
                created_at TEXT DEFAULT (datetime('now')),
                updated_at TEXT DEFAULT (datetime('now')),
                completed_at TEXT
            );

            CREATE INDEX IF NOT EXISTS idx_tasks_list_id ON tasks(list_id);
            CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
            CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
            CREATE INDEX IF NOT EXISTS idx_tasks_parent_id ON tasks(parent_id);

            CREATE VIRTUAL TABLE IF NOT EXISTS tasks_fts USING fts5(
                title,
                description,
                content='tasks',
                content_rowid='rowid'
            );

            -- FTS sync triggers
            CREATE TRIGGER IF NOT EXISTS tasks_ai AFTER INSERT ON tasks BEGIN
                INSERT INTO tasks_fts(rowid, title, description) VALUES (new.rowid, new.title, new.description);
            END;

            CREATE TRIGGER IF NOT EXISTS tasks_ad AFTER DELETE ON tasks BEGIN
                INSERT INTO tasks_fts(tasks_fts, rowid, title, description) VALUES('delete', old.rowid, old.title, old.description);
            END;

            CREATE TRIGGER IF NOT EXISTS tasks_au AFTER UPDATE ON tasks BEGIN
                INSERT INTO tasks_fts(tasks_fts, rowid, title, description) VALUES('delete', old.rowid, old.title, old.description);
                INSERT INTO tasks_fts(rowid, title, description) VALUES (new.rowid, new.title, new.description);
            END;",
        )?;

        // Insert default lists if not exist
        conn.execute_batch(
            "INSERT OR IGNORE INTO lists (id, name, color, icon, sort_order) VALUES
                ('list-default', '收集箱', '#6366f1', '📥', 0);
            INSERT OR IGNORE INTO lists (id, name, color, icon, sort_order) VALUES
                ('list-work', '工作', '#f59e0b', '💼', 1);
            INSERT OR IGNORE INTO lists (id, name, color, icon, sort_order) VALUES
                ('list-personal', '个人', '#10b981', '🏠', 2);
            INSERT OR IGNORE INTO lists (id, name, color, icon, sort_order) VALUES
                ('list-learning', '学习', '#8b5cf6', '📚', 3);",
        )?;

        Ok(())
    }
}
