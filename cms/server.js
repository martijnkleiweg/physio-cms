/* -----------------------------------------------------------
   server.js – Physio CMS API + Admin UI
   ----------------------------------------------------------- */

const express     = require('express');
const path        = require('path');
const fs          = require('fs');
const cors        = require('cors');
const marked      = require('marked');
const basicAuth   = require('express-basic-auth');
const multer      = require('multer');
const db          = require('./db');

const app = express();

/* ---------- global middleware ---------- */
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'))); // /admin JS/CSS + /uploads
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

/* ---------- file-upload config ---------- */
const uploadDir = path.join(__dirname, 'public/uploads');
fs.mkdirSync(uploadDir, { recursive: true });          // ensure dir exists
const upload = multer({ dest: uploadDir });

/* ---------- API consumed by front-end ---------- */
app.get('/api/posts', (_, res) => {
  res.json(db.all());                                  // returns every row
});

app.get('/api/posts/:slug', (req, res) => {
  const row = db.find(req.params.slug);
  if (!row) return res.sendStatus(404);
  res.json({ ...row, content_html: marked.parse(row.content_md) });
});

/* ---------- simple basic-auth for /admin ---------- */
app.use(
  '/admin',
  basicAuth({
    users: { editor: process.env.ADMIN_PW || 'ChangeMe123' },
    challenge: true,
    realm: 'PhysioCMS',
  })
);

/* ---------- Admin UI ---------- */
app.get('/admin', (_, res) => res.render('editor', { post: null }));

app.get('/admin/:slug', (req, res) => {
  const post = db.find(req.params.slug);
  if (!post) return res.redirect('/admin');
  res.render('editor', { post });
});

/* ---------- Save or update a post ---------- */
app.post('/admin/save', (req, res) => {
  const p = req.body;
  p.published = p.published ? 1 : 0;
  p.category = p.category || 'news';
  p.image_url = p.image_url || '';

  if (db.find(p.slug)) db.update(p);
  else db.insert(p);

  res.json({ ok: true });
});

/* ---------- Delete a post ---------- */
app.delete('/admin/:slug', (req, res) => {
  db.del(req.params.slug);
  res.json({ ok: true });
});

/* ---------- Image upload endpoint ---------- */
app.post('/admin/upload', upload.single('file'), (req, res) => {
  // return relative URL so the editor stores it
  res.json({ url: '/uploads/' + req.file.filename });
});

/* ---------- Boot ---------- */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Physio CMS running on http://localhost:${PORT}`));
