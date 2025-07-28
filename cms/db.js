/* -----------------------------------------------------------
   db.js – SQLite wrapper for Physio CMS
   Fields:
     - image_url (card image URL)
     - hero_url  (1280×720 banner URL)
     - hero_pos  ('top' | 'center' | 'bottom') – vertical focus for hero
     - featured  (0/1)
     - published (0/1)
----------------------------------------------------------- */
const path     = require('path');
const Database = require('better-sqlite3');

/* ---------- open / create DB file ---------- */
const dbPath = path.join(__dirname, 'data', 'physio.sqlite');
const db     = new Database(dbPath);

/* ---------- ensure table exists ---------- */
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
  hero_pos    TEXT DEFAULT 'center',
  featured    INTEGER DEFAULT 0,
  published   INTEGER DEFAULT 0,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);
`);

/* ---------- lightweight auto-migrations (idempotent) ---------- */
function addColumnIfMissing(sql) {
  try { db.exec(sql); }
  catch (e) {
    // Ignore "duplicate column name" errors; rethrow anything else
    if (!/duplicate column name/i.test(e.message)) throw e;
  }
}

// Ensure columns exist even if table was created before these fields
addColumnIfMissing(`ALTER TABLE posts ADD COLUMN image_url TEXT DEFAULT ''`);
addColumnIfMissing(`ALTER TABLE posts ADD COLUMN hero_url  TEXT DEFAULT ''`);
addColumnIfMissing(`ALTER TABLE posts ADD COLUMN hero_pos  TEXT DEFAULT 'center'`);
addColumnIfMissing(`ALTER TABLE posts ADD COLUMN featured  INTEGER DEFAULT 0`);
addColumnIfMissing(`ALTER TABLE posts ADD COLUMN published INTEGER DEFAULT 0`);

/* ---------- prepared statements ---------- */
const STMT = {
  all   : db.prepare(`SELECT * FROM posts ORDER BY created_at DESC`),
  get   : db.prepare(`SELECT * FROM posts WHERE slug = ? LIMIT 1`),

  insert: db.prepare(`
    INSERT INTO posts
      (title, slug, content_md, excerpt, category,
       image_url, hero_url, hero_pos, featured, published)
    VALUES
      (@title, @slug, @content_md, @excerpt, @category,
       @image_url, @hero_url, @hero_pos, @featured, @published)
  `),

  update: db.prepare(`
    UPDATE posts SET
      title       = @title,
      content_md  = @content_md,
      excerpt     = @excerpt,
      category    = @category,
      image_url   = @image_url,
      hero_url    = @hero_url,
      hero_pos    = @hero_pos,
      featured    = @featured,
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
  if (p.hero_pos  === undefined) p.hero_pos  = 'center';
  if (p.featured  === undefined) p.featured  = 0;
  if (p.published === undefined) p.published = 0;

  // normalize values
  p.featured  = p.featured ? 1 : 0;
  p.published = p.published ? 1 : 0;
  if (!['top','center','bottom'].includes(p.hero_pos)) p.hero_pos = 'center';
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
