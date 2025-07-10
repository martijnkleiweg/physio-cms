/* -----------------------------------------------------------
   server.js – Physio CMS API + Admin UI  (card + optional hero)
----------------------------------------------------------- */

const express   = require('express');
const path      = require('path');
const fs        = require('fs');
const cors      = require('cors');
const marked    = require('marked');
const basicAuth = require('express-basic-auth');
const multer    = require('multer');
const sharp     = require('sharp');
const db        = require('./db');

const app = express();

/* ---------- global middleware ---------- */
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));   // /uploads + admin assets
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

/* ---------- upload config (temp folder) ---------- */
const tmpDir = path.join(__dirname, 'public/uploads/tmp');
fs.mkdirSync(tmpDir, { recursive: true });
const upload = multer({ dest: tmpDir });

/* ===========================================================
   PUBLIC API – consumed by the static front-end
=========================================================== */
app.get('/api/posts', (_ ,res) => res.json(db.all()));

app.get('/api/posts/:slug', (req, res) => {
  const row = db.find(req.params.slug);
  if (!row) return res.sendStatus(404);
  res.json({ ...row, content_html: marked.parse(row.content_md) });
});

/* ===========================================================
   Admin area guarded by Basic-Auth
=========================================================== */
app.use('/admin', basicAuth({
  users     : { editor: process.env.ADMIN_PW || 'ChangeMe123' },
  challenge : true,
  realm     : 'PhysioCMS'
}));

/* ---------- editor UI ---------- */
app.get('/admin',       (_ ,res) => res.render('editor', { post: null }));
app.get('/admin/:slug', (req,res) => {
  const post = db.find(req.params.slug);
  if (!post) return res.redirect('/admin');
  res.render('editor', { post });
});

/* ===========================================================
   CRUD
=========================================================== */
app.post('/admin/save', (req, res) => {
  const p = req.body;
  p.published = p.published ? 1 : 0;
  p.category  = p.category  || 'news';
  p.image_url = p.image_url || '';
  p.hero_url  = p.hero_url  || '';          // <── NEW

  if (db.find(p.slug)) db.update(p);
  else                 db.insert(p);

  res.json({ ok:true });
});

app.delete('/admin/:slug', (req,res) => {
  db.del(req.params.slug);
  res.json({ ok:true });
});

/* ===========================================================
   Image upload
   • Accepts one file
   • Creates 1280×720  -hero.jpg  & 400×250  -card.jpg
   • Responds with      { basename, hero, card }
=========================================================== */
app.post('/admin/upload', upload.single('file'), async (req, res) => {
  try {
    const srcPath  = req.file.path;
    const outDir   = path.join(__dirname, 'public/uploads');
    const basename = Date.now().toString();               // unique ID

    /* hero 1280×720 */
    const heroName = `${basename}-hero.jpg`;
    await sharp(srcPath)
      .resize(1280, 720, { fit:'cover' })
      .jpeg({ quality:80 })
      .toFile(path.join(outDir, heroName));

    /* card 400×250 */
    const cardName = `${basename}-card.jpg`;
    await sharp(srcPath)
      .resize(400, 250, { fit:'cover' })
      .jpeg({ quality:80 })
      .toFile(path.join(outDir, cardName));

    fs.unlinkSync(srcPath);                               // delete temp upload

    // Editor JS can build URLs from hero/card …or just use the helpers here
    res.json({
      basename,
      hero : `/uploads/${heroName}`,
      card : `/uploads/${cardName}`
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error:'Image processing failed' });
  }
});

/* ---------- inline image for EasyMDE (optional) ---------- */
app.post('/admin/upload-inline', upload.single('file'), async (req,res) => {
  try {
    const srcPath  = req.file.path;
    const outDir   = path.join(__dirname, 'public/uploads');
    const name     = `${Date.now()}-body.jpg`;

    await sharp(srcPath)
      .resize({ width:800 })
      .jpeg({ quality:82 })
      .toFile(path.join(outDir, name));

    fs.unlinkSync(srcPath);
    res.json({ url:`/uploads/${name}` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error:'Inline upload failed' });
  }
});

/* ===========================================================
   Boot
=========================================================== */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`Physio CMS running on http://localhost:${PORT}`));
