// server.js — Express API + admin editor
const express = require('express');
const path    = require('path');
const cors    = require('cors');
const marked  = require('marked');
const db      = require('./db');

const app = express();
app.use(cors());
app.use(express.json());                 // built-in JSON body parser
app.use(express.static('public'));       // serve any admin JS/CSS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

/* ---------- API consumed by the public site ---------- */
app.get('/api/posts',       (_, res)      => res.json(db.all()));
app.get('/api/posts/:slug', (req, res)    => {
  const row = db.find(req.params.slug);
  if (!row) return res.sendStatus(404);
  res.json({ ...row, content_html: marked.parse(row.content_md) });
});

/* ---------- Admin login ---------- */
const basicAuth = require('express-basic-auth');

app.use('/admin', basicAuth({
  users     : { 'editor': process.env.ADMIN_PW || 'ChangeMe123' },
  challenge : true,            // browser shows login box
  realm     : 'PhysioCMS'
}));

/* ---------- Admin UI ---------- */
app.get('/admin',            (_, res)     => res.render('editor', { post: null }));
app.get('/admin/:slug',     (req, res)    => {
  const post = db.find(req.params.slug);
  if (!post) return res.redirect('/admin');
  res.render('editor', { post });
});

/* Save or update a post */
app.post('/admin/save',     (req, res)    => {
  const p = req.body;
  p.published = p.published ? 1 : 0;
  if (db.find(p.slug)) db.update(p); else db.insert(p);
  res.json({ ok: true });
});

/* Delete a post */
app.delete('/admin/:slug',  (req, res)    => {
  db.del(req.params.slug);
  res.json({ ok: true });
});

const PORT = 3000;
app.listen(PORT, () => console.log(`CMS running at http://localhost:${PORT}`));
