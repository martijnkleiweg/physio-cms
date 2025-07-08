/* -----------------------------------------------------------
   server.js – Physio CMS API + Admin UI
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
app.use(express.static(path.join(__dirname, 'public'))); // /admin JS/CSS + /uploads
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

/* ---------- file-upload (tmp folder) ---------- */
const tmpDir = path.join(__dirname, 'public/uploads/tmp');
fs.mkdirSync(tmpDir, { recursive: true });
const upload = multer({ dest: tmpDir });

/* ---------- API consumed by front-end ---------- */
app.get('/api/posts', (_, res) => {
  res.json(db.all());                    // all rows newest-first
});

app.get('/api/posts/:slug', (req, res) => {
  const row = db.find(req.params.slug);
  if (!row) return res.sendStatus(404);
  res.json({ ...row, content_html: marked.parse(row.content_md) });
});

/* ---------- basic-auth for /admin ---------- */
app.use('/admin', basicAuth({
  users    : { editor: process.env.ADMIN_PW || 'ChangeMe123' },
  challenge: true,
  realm    : 'PhysioCMS'
}));

/* ---------- Admin UI ---------- */
app.get('/admin',        (_,   res) => res.render('editor', { post: null }));
app.get('/admin/:slug',  (req, res) => {
  const post = db.find(req.params.slug);
  if (!post) return res.redirect('/admin');
  res.render('editor', { post });
});

/* ---------- Save / Update ---------- */
app.post('/admin/save', (req, res) => {
  const p = req.body;
  p.published = p.published ? 1 : 0;
  p.category  = p.category  || 'news';
  p.img_base  = p.img_base  || '';      // <-- STORE img_base, not image_url

  if (db.find(p.slug)) db.update(p);
  else                 db.insert(p);

  res.json({ ok: true });
});

/* ---------- Delete ---------- */
app.delete('/admin/:slug', (req, res) => {
  db.del(req.params.slug);
  res.json({ ok: true });
});

/* ---------- Image upload → resize hero & card ---------- */
app.post('/admin/upload', upload.single('file'), async (req, res) => {
  try {
    const srcPath  = req.file.path;
    const outDir   = path.join(__dirname, 'public/uploads');
    const basename = Date.now().toString();          // unique id

    // hero 1280×720
    await sharp(srcPath)
      .resize(1280, 720, { fit: 'cover' })
      .jpeg({ quality: 80 })
      .toFile(path.join(outDir, `${basename}-hero.jpg`));

    // card 400×250
    await sharp(srcPath)
      .resize(400, 250, { fit: 'cover' })
      .jpeg({ quality: 80 })
      .toFile(path.join(outDir, `${basename}-card.jpg`));

    fs.unlinkSync(srcPath);                          // remove temp file
    res.json({ basename });                          // => { "basename": "17195..." }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Image processing failed' });
  }
});

/* === inline-image upload for EasyMDE ================================= */
app.post('/admin/upload-inline', upload.single('file'), async (req, res) => {
  try {
    const srcPath  = req.file.path;
    const basename = Date.now();                                // unique id
    const outDir   = path.join(__dirname, 'public/uploads');

    // 800px wide “body” image (keeps aspect)
    const bodyName = `${basename}-body.jpg`;
    await sharp(srcPath)
      .resize({ width: 800 })
      .jpeg({ quality: 82 })
      .toFile(path.join(outDir, bodyName));

    fs.unlinkSync(srcPath);                                     // remove temp
    res.json({ url: `/uploads/${bodyName}` });                  // 👈 EasyMDE needs {url:"…"}
  } catch (err) {
    console.error(err);
    res.status(500).json({ error:'inline upload failed' });
  }
});


/* ---------- Boot ---------- */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Physio CMS running on http://localhost:${PORT}`));
