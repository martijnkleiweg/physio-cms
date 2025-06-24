// db.js — tiny SQLite helper
const Database = require('better-sqlite3');
const db = new Database('./data/physio.sqlite');

// bootstrap on first run
db.exec(`
CREATE TABLE IF NOT EXISTS posts (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  title       TEXT NOT NULL,
  slug        TEXT UNIQUE NOT NULL,
  content_md  TEXT NOT NULL,
  excerpt     TEXT,
  published   INTEGER DEFAULT 0,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);
`);

module.exports = {
  all   : ()        => db.prepare('SELECT * FROM posts ORDER BY created_at DESC').all(),
  find  : slug      => db.prepare('SELECT * FROM posts WHERE slug = ?').get(slug),
  insert: p         => db.prepare(`
      INSERT INTO posts (title, slug, content_md, excerpt, published)
      VALUES (@title, @slug, @content_md, @excerpt, @published)
  `).run(p),
  update: p         => db.prepare(`
      UPDATE posts SET
        title=@title, content_md=@content_md, excerpt=@excerpt,
        published=@published, updated_at=CURRENT_TIMESTAMP
      WHERE slug=@slug
  `).run(p),
  del   : slug      => db.prepare('DELETE FROM posts WHERE slug = ?').run(slug)
};
