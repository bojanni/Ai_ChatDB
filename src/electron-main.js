
const { app, BrowserWindow, ipcMain, shell, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

// MCP SDK Imports
const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} = require('@modelcontextprotocol/sdk/types.js');

let mainWindow;
let db;

/**
 * Database Initialization
 */
function initDatabase() {
  const dbPath = path.join(app.getPath('userData'), 'chronicle.db');
  db = new Database(dbPath);
  
  db.pragma('journal_mode = WAL');

  // Create core table
  db.prepare(`
    CREATE TABLE IF NOT EXISTS chats (
      id TEXT PRIMARY KEY,
      type TEXT DEFAULT 'chat',
      title TEXT,
      content TEXT,
      summary TEXT,
      tags TEXT,
      source TEXT,
      createdAt INTEGER,
      updatedAt INTEGER,
      fileName TEXT,
      embedding BLOB
    )
  `).run();

  // Migration: Add columns if they don't exist
  try { db.prepare("ALTER TABLE chats ADD COLUMN type TEXT DEFAULT 'chat'").run(); } catch(e) {}
  try { db.prepare("ALTER TABLE chats ADD COLUMN updatedAt INTEGER").run(); } catch(e) {}

  // Create Links Table (Strategie 1: Many-to-Many)
  db.prepare(`
    CREATE TABLE IF NOT EXISTS links (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      from_id TEXT NOT NULL,
      to_id TEXT NOT NULL,
      link_type TEXT,
      created_at INTEGER,
      FOREIGN KEY (from_id) REFERENCES chats(id) ON DELETE CASCADE,
      FOREIGN KEY (to_id) REFERENCES chats(id) ON DELETE CASCADE,
      UNIQUE(from_id, to_id)
    )
  `).run();

  db.prepare('CREATE INDEX IF NOT EXISTS idx_links_from ON links(from_id)').run();
  db.prepare('CREATE INDEX IF NOT EXISTS idx_links_to ON links(to_id)').run();

  // Optimized Indexes
  db.prepare('CREATE INDEX IF NOT EXISTS idx_createdAt ON chats(createdAt)').run();
  db.prepare('CREATE INDEX IF NOT EXISTS idx_source ON chats(source)').run();
  db.prepare('CREATE INDEX IF NOT EXISTS idx_type ON chats(type)').run();

  // Full-Text Search (FTS5) Initialization
  db.prepare(`
    CREATE VIRTUAL TABLE IF NOT EXISTS chats_fts USING fts5(
      title, content, summary, tags,
      content='chats',
      content_rowid='rowid'
    )
  `).run();

  const triggers = [
    `CREATE TRIGGER IF NOT EXISTS chats_ai AFTER INSERT ON chats BEGIN
      INSERT INTO chats_fts(rowid, title, content, summary, tags)
      VALUES (new.rowid, new.title, new.content, new.summary, new.tags);
    END;`,
    `CREATE TRIGGER IF NOT EXISTS chats_ad AFTER DELETE ON chats BEGIN
      INSERT INTO chats_fts(chats_fts, rowid, title, content, summary, tags)
      VALUES('delete', old.rowid, old.title, old.content, old.summary, old.tags);
    END;`,
    `CREATE TRIGGER IF NOT EXISTS chats_au AFTER UPDATE ON chats BEGIN
      INSERT INTO chats_fts(chats_fts, rowid, title, content, summary, tags)
      VALUES('delete', old.rowid, old.title, old.content, old.summary, old.tags);
      INSERT INTO chats_fts(rowid, title, content, summary, tags)
      VALUES (new.rowid, new.title, new.content, new.summary, new.tags);
    END;`
  ];
  triggers.forEach(sql => db.prepare(sql).run());
}

/**
 * Helper to calculate cosine similarity
 */
function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
  let dotProduct = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    magA += vecA[i] * vecA[i];
    magB += vecB[i] * vecB[i];
  }
  const denominator = Math.sqrt(magA) * Math.sqrt(magB);
  return denominator === 0 ? 0 : dotProduct / denominator;
}

function bufferToFloat32Array(buffer) {
  if (!buffer) return null;
  return new Float32Array(buffer.buffer, buffer.byteOffset, buffer.byteLength / 4);
}

/**
 * MCP Server Implementation
 */
async function runMCPServer() {
  if (!db) initDatabase();
  const server = new Server(
    { name: 'chronicle-desktop-mcp', version: '2.6.0' },
    { capabilities: { resources: {}, tools: {} } }
  );

  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    try {
      const rows = db.prepare('SELECT id, title, summary, type FROM chats ORDER BY createdAt DESC').all();
      return {
        resources: rows.map(chat => ({
          uri: `chronicle://archive/${chat.id}`,
          name: `[${chat.type.toUpperCase()}] ${chat.title || 'Untitled'}`,
          description: chat.summary || 'No summary',
          mimeType: 'text/markdown',
        })),
      };
    } catch (err) { return { resources: [] }; }
  });

  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    try {
      const url = new URL(request.params.uri);
      const id = url.pathname.replace(/^\//, '');
      const chat = db.prepare('SELECT * FROM chats WHERE id = ?').get(id);
      if (!chat) throw new Error('Not found');
      const md = `# ${chat.title}\n**Type:** ${chat.type}\n**Date:** ${new Date(chat.createdAt).toLocaleDateString()}\n\n${chat.content}`;
      return { contents: [{ uri: request.params.uri, mimeType: 'text/markdown', text: md }] };
    } catch (err) { throw err; }
  });

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: 'search_archive',
          description: 'Search personal archive using FTS5.',
          inputSchema: {
            type: 'object',
            properties: { query: { type: 'string' } },
            required: ['query'],
          },
        }
      ],
    };
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

const isMCPServerMode = process.argv.includes('--mcp');
if (isMCPServerMode) { app.whenReady().then(runMCPServer); } 
else {
  app.whenReady().then(() => { initDatabase(); createWindow(); });
  function createWindow() {
    mainWindow = new BrowserWindow({
      width: 1200, height: 800,
      titleBarStyle: 'hiddenInset',
      backgroundColor: '#fefef9',
      webPreferences: { preload: path.join(__dirname, 'electron-preload.js'), contextIsolation: true },
    });
    mainWindow.loadFile('index.html');
  }
}

// IPC Handlers for Links
ipcMain.handle('add-link', async (event, { fromId, toId, type }) => {
  const insert = db.prepare(`
    INSERT OR IGNORE INTO links (from_id, to_id, link_type, created_at)
    VALUES (?, ?, ?, ?)
  `);
  try {
    insert.run(fromId, toId, type || 'related', Date.now());
    return true;
  } catch (err) { return false; }
});

ipcMain.handle('remove-link', async (event, { fromId, toId }) => {
  const del = db.prepare(`
    DELETE FROM links WHERE (from_id = ? AND to_id = ?) OR (from_id = ? AND to_id = ?)
  `);
  try {
    del.run(fromId, toId, toId, fromId);
    return true;
  } catch (err) { return false; }
});

ipcMain.handle('load-links', async () => {
  try {
    const rows = db.prepare('SELECT from_id as fromId, to_id as toId, link_type as type, created_at as createdAt FROM links').all();
    return rows;
  } catch (err) { return []; }
});

ipcMain.handle('save-database', async (event, items) => {
  const insert = db.prepare(`
    INSERT OR REPLACE INTO chats (id, type, title, content, summary, tags, source, createdAt, updatedAt, fileName, embedding)
    VALUES (@id, @type, @title, @content, @summary, @tags, @source, @createdAt, @updatedAt, @fileName, @embedding)
  `);
  const transaction = db.transaction((data) => {
    for (const item of data) {
      insert.run({
        ...item,
        type: item.type || 'chat',
        updatedAt: item.updatedAt || item.createdAt,
        tags: JSON.stringify(item.tags),
        embedding: item.embedding ? Buffer.from(new Float32Array(item.embedding).buffer) : null
      });
    }
  });
  try { transaction(items); return true; } catch (err) { return false; }
});

ipcMain.handle('load-database', async () => {
  try {
    const rows = db.prepare('SELECT * FROM chats ORDER BY createdAt DESC').all();
    return rows.map(r => ({
      ...r,
      tags: JSON.parse(r.tags || '[]'),
      embedding: r.embedding ? Array.from(bufferToFloat32Array(r.embedding)) : undefined
    }));
  } catch (err) { return []; }
});

ipcMain.handle('export-chats', async (event, { chats, format }) => {
  const { filePath } = await dialog.showSaveDialog(mainWindow, {
    title: 'Export Archive',
    defaultPath: `chronicle_export.${format}`,
    filters: [{ name: format.toUpperCase(), extensions: [format] }]
  });
  if (!filePath) return { success: false, cancelled: true };
  const content = format === 'json' ? JSON.stringify(chats, null, 2) : chats.map(c => `# ${c.title}\n\n${c.content}`).join('\n\n---\n\n');
  fs.writeFileSync(filePath, content);
  return { success: true, path: filePath };
});

ipcMain.handle('import-chats', async (event, existingIds) => {
  const { filePaths } = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile', 'multiSelections'],
    filters: [{ name: 'JSON', extensions: ['json'] }]
  });
  if (!filePaths?.length) return { success: false, cancelled: true };
  let imported = [];
  for (const fp of filePaths) {
    try {
      const data = JSON.parse(fs.readFileSync(fp, 'utf8'));
      if (Array.isArray(data)) imported.push(...data);
    } catch (e) {}
  }
  const unique = imported.filter(c => !existingIds.includes(c.id));
  return { success: true, chats: unique, skipped: imported.length - unique.length };
});

ipcMain.on('notify', (event, { title, body }) => {
  const { Notification } = require('electron');
  if (Notification.isSupported()) new Notification({ title, body }).show();
});
