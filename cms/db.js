/* -----------------------------------------------------------
   db.js – SQLite wrapper for Physio CMS
   Adds hero_url (1280×720 banner) alongside image_url (card).
----------------------------------------------------------- */
const path     = require('path');
const Database = require('better-sqlite3');

/* ---------- open / create DB file ---------- */
const dbPath = path.join(__dirname, 'data', 'physio.sqlite');
const db     = new Database(dbPath);

/* ---------- ensure table exists / evolved ---------- */
db.exec(`
CREATE TABLE IF NOT EXISTS posts (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  title       TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  content_md  TEXT NOT NULL,
  excerpt     TEXT,
  category    TEXT DEFAULT 'news',
  image_url   TEXT DEFAULT '',
  hero_url    TEXT DEFAULT '',
  published   INTEGER DEFAULT 0,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);
`);

/* ---------- prepared statements ---------- */
const STMT = {
  all   : db.prepare(`SELECT * FROM posts ORDER BY created_at DESC`),
  get   : db.prepare(`SELECT * FROM posts WHERE slug = ? LIMIT 1`),

  insert: db.prepare(`
    INSERT INTO posts
      (title, slug, content_md, excerpt, category,
       image_url, hero_url, published)
    VALUES
      (@title, @slug, @content_md, @excerpt, @category,
       @image_url, @hero_url, @published)
  `),

  update: db.prepare(`
    UPDATE posts SET
      title       = @title,
      content_md  = @content_md,
      excerpt     = @excerpt,
      category    = @category,
      image_url   = @image_url,
      hero_url    = @hero_url,
      published   = @published,
      updated_at  = CURRENT_TIMESTAMP
    WHERE slug = @slug
  `),

  del   : db.prepare(`DELETE FROM posts WHERE slug = ?`)
};

/* ---------- tiny helper to avoid “missing parameter” ---------- */
function fillDefaults (p){
  if (p.image_url === undefined) p.image_url = '';
  if (p.hero_url  === undefined) p.hero_url  = '';
  return p;
}

/* ---------- public API ---------- */
module.exports = {
  /** newest-first list */
  all () {
    return STMT.all.all();
  },

  /** single post by slug */
  find (slug) {
    return STMT.get.get(slug);
  },

  /** insert new row */
  insert (p) {
    STMT.insert.run(fillDefaults(p));
  },

  /** update existing row */
  update (p) {
    STMT.update.run(fillDefaults(p));
  },

  /** delete by slug */
  del (slug) {
    STMT.del.run(slug);
  }
};
