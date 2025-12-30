import initSqlJs from 'sql.js';

const DB_KEY = 'scambaiter_db';
let db = null;

export async function initDB() {
  if (db) return db;

  const SQL = await initSqlJs({
    locateFile: file => `https://sql.js.org/dist/${file}`
  });

  // Try to load existing database from localStorage
  const savedDb = localStorage.getItem(DB_KEY);
  if (savedDb) {
    const uint8Array = new Uint8Array(JSON.parse(savedDb));
    db = new SQL.Database(uint8Array);
  } else {
    db = new SQL.Database();
    // Create tables
    db.run(`
      CREATE TABLE IF NOT EXISTS conversations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        persona TEXT NOT NULL,
        persona_name TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    db.run(`
      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        conversation_id INTEGER NOT NULL,
        type TEXT NOT NULL,
        text TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (conversation_id) REFERENCES conversations(id)
      )
    `);
    saveDB();
  }

  return db;
}

function saveDB() {
  if (!db) return;
  const data = db.export();
  const arr = Array.from(data);
  localStorage.setItem(DB_KEY, JSON.stringify(arr));
}

export async function createConversation(persona, personaName) {
  await initDB();
  db.run(
    'INSERT INTO conversations (persona, persona_name) VALUES (?, ?)',
    [persona, personaName]
  );
  const result = db.exec('SELECT last_insert_rowid() as id');
  saveDB();
  return result[0].values[0][0];
}

export async function addMessage(conversationId, type, text) {
  await initDB();
  db.run(
    'INSERT INTO messages (conversation_id, type, text) VALUES (?, ?, ?)',
    [conversationId, type, text]
  );
  db.run(
    'UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [conversationId]
  );
  saveDB();
}

export async function getConversation(conversationId) {
  await initDB();
  const messages = db.exec(
    'SELECT type, text FROM messages WHERE conversation_id = ? ORDER BY id',
    [conversationId]
  );
  if (messages.length === 0) return [];
  return messages[0].values.map(([type, text]) => ({ type, text }));
}

export async function getAllConversations() {
  await initDB();
  const result = db.exec(`
    SELECT c.id, c.persona, c.persona_name, c.created_at, c.updated_at,
           (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id) as message_count,
           (SELECT text FROM messages WHERE conversation_id = c.id ORDER BY id LIMIT 1) as first_message
    FROM conversations c
    ORDER BY c.updated_at DESC
  `);
  if (result.length === 0) return [];
  return result[0].values.map(([id, persona, personaName, createdAt, updatedAt, messageCount, firstMessage]) => ({
    id,
    persona,
    personaName,
    createdAt,
    updatedAt,
    messageCount,
    firstMessage: firstMessage?.substring(0, 50) + (firstMessage?.length > 50 ? '...' : '')
  }));
}

export async function deleteConversation(conversationId) {
  await initDB();
  db.run('DELETE FROM messages WHERE conversation_id = ?', [conversationId]);
  db.run('DELETE FROM conversations WHERE id = ?', [conversationId]);
  saveDB();
}

export async function clearAllConversations() {
  await initDB();
  db.run('DELETE FROM messages');
  db.run('DELETE FROM conversations');
  saveDB();
}
