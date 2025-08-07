/* -----------------------------------------------------------
   db.js – SQLite wrapper voor Physio CMS
   Bevat tabellen:
     • posts
     • appointments  (online afspraak­formulier)
     • contacts      (contactformulier)
----------------------------------------------------------- */
const path     = require('path');
const Database = require('better-sqlite3');

const dbPath = path.join(__dirname, 'data', 'physio.sqlite');
const db     = new Database(dbPath);

/* ======================= POSTS ======================= */
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

function addColumnIfMissing(sql) {
  try { db.exec(sql); }
  catch (e) { if (!/duplicate column name/i.test(e.message)) throw e; }
}
addColumnIfMissing(`ALTER TABLE posts ADD COLUMN image_url TEXT DEFAULT ''`);
addColumnIfMissing(`ALTER TABLE posts ADD COLUMN hero_url  TEXT DEFAULT ''`);
addColumnIfMissing(`ALTER TABLE posts ADD COLUMN hero_pos  TEXT DEFAULT 'center'`);
addColumnIfMissing(`ALTER TABLE posts ADD COLUMN featured  INTEGER DEFAULT 0`);
addColumnIfMissing(`ALTER TABLE posts ADD COLUMN published INTEGER DEFAULT 0`);

const POST = {
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

function fillPostDefaults (p){
  if (p.image_url === undefined) p.image_url = '';
  if (p.hero_url  === undefined) p.hero_url  = '';
  if (p.hero_pos  === undefined) p.hero_pos  = 'center';
  if (p.featured  === undefined) p.featured  = 0;
  if (p.published === undefined) p.published = 0;
  p.featured  = p.featured ? 1 : 0;
  p.published = p.published ? 1 : 0;
  if (!['top','center','bottom'].includes(p.hero_pos)) p.hero_pos = 'center';
  return p;
}

/* =================== APPOINTMENTS =================== */
db.exec(`
CREATE TABLE IF NOT EXISTS appointments (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  email      TEXT NOT NULL,
  phone      TEXT NOT NULL,
  date       TEXT NOT NULL,
  period     TEXT NOT NULL,
  message    TEXT,
  ip         TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
`);

const APPOINT = {
  insert: db.prepare(`
    INSERT INTO appointments
      (name, email, phone, date, period, message, ip)
    VALUES
      (@name, @email, @phone, @date, @period, @message, @ip)
  `),
  all   : db.prepare(`SELECT * FROM appointments ORDER BY created_at DESC`)
};

/* ======================= CONTACTS ======================= */
db.exec(`
CREATE TABLE IF NOT EXISTS contacts (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  email      TEXT NOT NULL,
  phone      TEXT,
  subject    TEXT,
  message    TEXT NOT NULL,
  ip         TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
`);

const CONTACT = {
  insert: db.prepare(`
    INSERT INTO contacts
      (name, email, phone, subject, message, ip)
    VALUES
      (@name, @email, @phone, @subject, @message, @ip)
  `),
  all   : db.prepare(`SELECT * FROM contacts ORDER BY created_at DESC`)
};

/* ======================= PUBLIC API ======================= */
module.exports = {
  /* posts */
  allPosts ()           { return POST.all.all(); },
  findPost (slug)       { return POST.get.get(slug); },
  insertPost (p)        { POST.insert.run(fillPostDefaults(p)); },
  updatePost (p)        { POST.update.run(fillPostDefaults(p)); },
  deletePost (slug)     { POST.del.run(slug); },

  /* appointments */
  saveAppointment (d)   {
    APPOINT.insert.run({
      name   : (d.name   || '').trim(),
      email  : (d.email  || '').trim(),
      phone  : (d.phone  || '').trim(),
      date   : (d.date   || '').trim(),
      period : (d.period || '').trim(),
      message: (d.message|| '').trim(),
      ip     : d.ip || null
    });
  },
  allAppointments ()    { return APPOINT.all.all(); },

  /* contacts */
  saveContact (d) {
    CONTACT.insert.run({
      name   : (d.name   || '').trim(),
      email  : (d.email  || '').trim(),
      phone  : (d.phone  || '').trim(),
      subject: (d.subject|| '').trim(),
      message: (d.message|| '').trim(),
      ip     : d.ip || null
    });
  },
  allContacts ()        { return CONTACT.all.all(); }
};
