/* -----------------------------------------------------------
   server.js – Physio CMS
   • posts         (blog / behandelingen / nieuws)
   • appointments  (“Maak een afspraak”-formulier)
   • contact       (contactformulier)
----------------------------------------------------------- */

require('dotenv').config();               // load .env if present
const express     = require('express');
const path        = require('path');
const fs          = require('fs');
const cors        = require('cors');
const marked      = require('marked');
const basicAuth   = require('express-basic-auth');
const multer      = require('multer');
const sharp       = require('sharp');
const nodemailer  = require('nodemailer');
const rateLimit   = require('express-rate-limit');
const db          = require('./db');

const app = express();

/* If behind a reverse proxy (nginx), trust it for correct req.ip, etc. */
app.set('trust proxy', true);

/* ===========================================================
   GLOBAL MIDDLEWARE
=========================================================== */
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

/* ===========================================================
   FILE UPLOADS (multer temp dir)
=========================================================== */
const tmpDir = path.join(__dirname, 'public/uploads/tmp');
fs.mkdirSync(tmpDir, { recursive: true });
const upload = multer({ dest: tmpDir });

/* ===========================================================
   PUBLIC API – POSTS
=========================================================== */
app.get('/api/posts', (_ , res) => res.json(db.allPosts()));

app.get('/api/posts/:slug', (req, res) => {
  const row = db.findPost(req.params.slug);
  if (!row) return res.sendStatus(404);
  res.json({ ...row, content_html: marked.parse(row.content_md) });
});

/* ===========================================================
   SHARED: MAILER
=========================================================== */
function envBool(v, def=false){
  if (v === undefined) return def;
  const s = String(v).trim().toLowerCase();
  return s === '1' || s === 'true' || s === 'yes';
}

const hasSMTP = !!process.env.SMTP_HOST;

const transporter = hasSMTP
  ? nodemailer.createTransport({
      host      : process.env.SMTP_HOST,
      port      : Number(process.env.SMTP_PORT || 587),
      // secure=true only for implicit TLS (port 465). For STARTTLS on 587 keep false.
      secure    : envBool(process.env.SMTP_SECURE, false),
      auth      : (process.env.SMTP_USER && process.env.SMTP_PASS)
                  ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
                  : undefined,
      requireTLS: true,
      tls       : { minVersion: 'TLSv1.2' }
    })
  : { sendMail: opts => { console.log('[dev-mail]', opts); return Promise.resolve(); } };

if (hasSMTP) {
  transporter.verify((err) => {
    if (err) console.error('[mail] SMTP verify failed:', err);
    else     console.log('[mail] SMTP connection OK');
  });
}

/* ===========================================================
   PUBLIC API – APPOINTMENTS
=========================================================== */

/* --- IP-rate-limit: max 3 requests / 10 min per IP --- */
const apptLimiter = rateLimit({
  windowMs : 10 * 60 * 1000,
  max      : 3,
  message  : { error: 'Te veel aanvragen – probeer het later opnieuw.' }
});

app.post('/api/appointments', apptLimiter, async (req, res) => {
  const { name='', email='', phone='', date='', period='', message='' } = req.body || {};
  const errors = [];

  if (!name.trim())                                  errors.push('Naam is verplicht.');
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))     errors.push('Ongeldig e-mailadres.');
  if (!phone.trim())                                 errors.push('Telefoonnummer is verplicht.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date))             errors.push('Datumformaat moet YYYY-MM-DD zijn.');
  if (!['ochtend','middag','namiddag'].includes((period || '').toLowerCase()))
                                                     errors.push('Ongeldig dagdeel.');

  if (errors.length) return res.status(400).json({ errors });

  // save
  db.saveAppointment({
    name, email, phone, date, period: period.toLowerCase(), message,
    ip: req.ip
  });

  // email
  const mailTo   = process.env.MAIL_TO   || 'you@example.com';
  const mailFrom = process.env.MAIL_FROM || process.env.SMTP_USER || `no-reply@${process.env.DOMAIN || 'localhost'}`;

  try {
    await transporter.sendMail({
      from   : mailFrom,
      to     : mailTo,
      replyTo: email,
      subject: `Nieuwe afspraak: ${name} op ${date} (${period})`,
      text   : `
Naam     : ${name}
E-mail   : ${email}
Telefoon : ${phone}
Datum    : ${date}
Dagdeel  : ${period}
Bericht  : ${message || '-'}
IP       : ${req.ip}
`.trim()
    });
  } catch (err) {
    console.error('Mail failed:', err);
    return res.status(200).json({ ok:true, warn:'Afspraak opgeslagen, maar e-mail kon niet worden verzonden.' });
  }

  res.json({ ok:true });
});

/* ===========================================================
   PUBLIC API – CONTACT (NEW)
=========================================================== */

/* --- IP-rate-limit: max 5 requests / 10 min per IP --- */
const contactLimiter = rateLimit({
  windowMs : 10 * 60 * 1000,
  max      : 5,
  message  : { error: 'Te veel berichten – probeer het later opnieuw.' }
});

app.post('/api/contact', contactLimiter, async (req, res) => {
  const { name='', email='', phone='', subject='', message='' } = req.body || {};
  const errors = [];

  if (!name.trim())                              errors.push('Naam is verplicht.');
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) errors.push('Ongeldig e-mailadres.');
  if (!message || message.trim().length < 5)     errors.push('Bericht is te kort.');

  if (errors.length) return res.status(400).json({ errors });

  // save
  db.saveContact({
    name, email, phone, subject, message,
    ip: req.ip
  });

  // email
  const mailTo   = process.env.MAIL_TO   || 'you@example.com';
  const mailFrom = process.env.MAIL_FROM || process.env.SMTP_USER || `no-reply@${process.env.DOMAIN || 'localhost'}`;

  try {
    await transporter.sendMail({
      from   : mailFrom,
      to     : mailTo,
      replyTo: email,
      subject: subject ? `[Contact] ${subject}` : '[Contact] Bericht via website',
      text   : `
Naam     : ${name}
E-mail   : ${email}
Telefoon : ${phone || '-'}
Onderwerp: ${subject || '-'}
Bericht  :
${message}

IP       : ${req.ip}
`.trim()
    });
  } catch (err) {
    console.error('Mail failed (contact):', err);
    return res.status(200).json({ ok:true, warn:'Bericht opgeslagen, maar e-mail kon niet worden verzonden.' });
  }

  res.json({ ok:true });
});

/* ===========================================================
   ADMIN AREA (basic-auth)
=========================================================== */
app.use('/admin', basicAuth({
  users     : { editor: process.env.ADMIN_PW || 'ChangeMe123' },
  challenge : true,
  realm     : 'PhysioCMS'
}));

/* ---------- editor UI ---------- */
app.get('/admin',       (_ ,res) => res.render('editor', { post: null }));
app.get('/admin/:slug', (req,res) => {
  const post = db.findPost(req.params.slug);
  if (!post) return res.redirect('/admin');
  res.render('editor', { post });
});

/* Simple list of appointments (JSON) for the appointments admin page */
app.get('/admin/api/appointments', (_req, res) => {
  try {
    res.json(db.allAppointments());
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Kon afspraken niet laden' });
  }
});

/* Appointments admin page (EJS) */
app.get('/admin/appointments', (_req, res) => {
  res.render('appointments');
});

/* ===========================================================
   CRUD (POSTS)
=========================================================== */
app.post('/admin/save', (req, res) => {
  const p = { ...req.body };

  p.published = p.published ? 1 : 0;
  p.featured  = p.featured  ? 1 : 0;
  p.category  = p.category  || 'news';
  p.image_url = p.image_url || '';
  p.hero_url  = p.hero_url  || '';
  p.hero_pos  = ['top','center','bottom'].includes(p.hero_pos) ? p.hero_pos : 'center';

  if (db.findPost(p.slug)) db.updatePost(p);
  else                      db.insertPost(p);

  res.json({ ok:true });
});

app.delete('/admin/:slug', (req,res) => {
  db.deletePost(req.params.slug);
  res.json({ ok:true });
});


/* ===========================================================
   IMAGE UPLOADS
=========================================================== */
app.post('/admin/upload', upload.single('file'), async (req, res) => {
  try {
    const srcPath  = req.file.path;
    const outDir   = path.join(__dirname, 'public/uploads');
    const basename = Date.now().toString();

    /* hero 1280×720 */
    const heroName = `${basename}-hero.jpg`;
    await sharp(srcPath)
      .resize(1280, 720, { fit: 'cover' })
      .jpeg({ quality: 82 })
      .toFile(path.join(outDir, heroName));

    /* card 400×250 */
    const cardName = `${basename}-card.jpg`;
    await sharp(srcPath)
      .resize(400, 250, { fit: 'cover' })
      .jpeg({ quality: 80 })
      .toFile(path.join(outDir, cardName));

    fs.unlinkSync(srcPath);

    res.json({
      basename,
      hero : `/uploads/${heroName}`,
      card : `/uploads/${cardName}`
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Image processing failed' });
  }
});

/* inline image upload (EasyMDE body images) */
app.post('/admin/upload-inline', upload.single('file'), async (req,res) => {
  try {
    const srcPath  = req.file.path;
    const outDir   = path.join(__dirname, 'public/uploads');
    const name     = `${Date.now()}-body.jpg`;

    await sharp(srcPath)
      .resize({ width: 800 })
      .jpeg({ quality: 82 })
      .toFile(path.join(outDir, name));

    fs.unlinkSync(srcPath);
    res.json({ url: `/uploads/${name}` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Inline upload failed' });
  }
});

/* ===========================================================
   START SERVER
=========================================================== */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`Physio CMS draait op http://localhost:${PORT}`));
