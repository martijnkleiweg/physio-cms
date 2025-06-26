// db.js – SQLite wrapper for Physio CMS
const path     = require('path');
const Database = require('better-sqlite3');

// --------------------------------------------------
// open / create DB file
// --------------------------------------------------
const dbPath = path.join(__dirname, 'data', 'physio.sqlite');
const db     = new Database(dbPath);

// --------------------------------------------------
// ensure table exists
// --------------------------------------------------
db.exec(`
CREATE TABLE IF NOT EXISTS posts (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  title       TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  content_md  TEXT NOT NULL,
  excerpt     TEXT,
  category    TEXT DEFAULT 'news',
  img_base    TEXT,                     -- <id>  (use -card / -hero suffix in front-end)
  published   INTEGER DEFAULT 0,        -- 0 = draft, 1 = live
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);
`);

// --------------------------------------------------
// prepared statements
// --------------------------------------------------
const STMT = {
  all   : db.prepare(`SELECT * FROM posts ORDER BY created_at DESC`),
  get   : db.prepare(`SELECT * FROM posts WHERE slug = ? LIMIT 1`),

  insert: db.prepare(`
    INSERT INTO posts
      (title, slug, content_md, excerpt, category, img_base, published)
    VALUES
      (@title, @slug, @content_md, @excerpt, @category, @img_base, @published)
  `),

  update: db.prepare(`
    UPDATE posts SET
      title       = @title,
      content_md  = @content_md,
      excerpt     = @excerpt,
      category    = @category,
      img_base    = @img_base,
      published   = @published,
      updated_at  = CURRENT_TIMESTAMP
    WHERE slug = @slug
  `),

  del   : db.prepare(`DELETE FROM posts WHERE slug = ?`)
};

// --------------------------------------------------
// public API
// --------------------------------------------------
module.exports = {
  /** @returns {array} all posts newest-first */
  all () {
    return STMT.all.all();
  },

  /** @param {string} slug */
  find (slug) {
    return STMT.get.get(slug);
  },

  /** @param {object} p – must contain slug,title,content_md,category,img_base,published */
  insert (p) {
    STMT.insert.run(p);
  },

  /** @param {object} p – same keys as insert */
  update (p) {
    STMT.update.run(p);
  },

  /** @param {string} slug */
  del (slug) {
    STMT.del.run(slug);
  }
};
