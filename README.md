# Fysiotherapie De Doelen — CMS & Website

This repository contains the website and content management system (CMS) for **Fysiotherapie De Doelen**.  
It combines a static front-end (HTML/CSS/JS) with a Node.js/Express backend to manage dynamic content such as blog/news articles and appointments.

---

## Features

- 🖥️ **Public website** with pages:
  - Home (`index.html`)
  - Over ons (`overons.html`)
  - Afspraak maken (`afspraak.html`)
  - Contact (`contact.html`)
  - Blog/news categories (`category.html`)
  - Single posts (`post.html`)

- 🔐 **Admin CMS**:
  - Login-protected dashboard
  - Create, edit, and delete articles/posts
  - View and manage appointment requests
  - Reusable partials (`partials/`) with EJS templating
  - Runs under `/admin` (reverse-proxied in production)

- 📱 **Responsive design** with Bootstrap and custom CSS  
- ⚡ Lightweight — no build step required

---

## Quick start (development)

1. Clone the repo
   ```bash
   git clone https://github.com/martijnkleiweg/physio-cms.git
   cd physio-cms
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Configure environment variables in `.env`
   ```ini
   PORT=3000
   SESSION_SECRET=your-secret
   ADMIN_USER=editor
   ADMIN_PASS=ChangeMe123
   ```

4. Start the app
   ```bash
   npm start
   ```
   The public site will be at `http://localhost:3000` and the CMS at `http://localhost:3000/admin`.

---

## Project structure

```
physio-cms/
├─ bootstrap/         # Bootstrap assets (CSS/JS)
├─ css/               # Custom styles
├─ js/                # Front-end JS
├─ images/            # Site images/icons
├─ partials/          # Shared EJS partials (header, footer, etc.)
├─ routes/            # Express routes (public + admin)
├─ views/             # EJS templates
├─ server.js          # Express server entry point
├─ package.json
└─ .env.example       # Example env vars
```

---

## Deployment

- **Production setup**:
  - Run with [PM2](https://pm2.keymetrics.io/) or systemd
  - Reverse-proxy `/` and `/admin` behind Nginx
  - Configure SSL (Let’s Encrypt recommended)
- **Static assets** (`css`, `js`, `images`) can be cached long-term
- **Security**:
  - Change default `ADMIN_USER` and `ADMIN_PASS`
  - Use HTTPS in production
  - Set a strong `SESSION_SECRET`

---

## Accessibility & performance checklist

- Alt text for images  
- Meta descriptions and titles per page  
- Compress images before upload  
- Lighthouse audits (Performance/Accessibility/SEO/Best Practices)  

---

## Contributing

1. Create a feature branch:  
   ```bash
   git checkout -b feature/xyz
   ```
2. Make changes and test locally  
3. Commit with clear messages  
4. Open a PR

---

## License

No license file currently in the repository — contributions default to “all rights reserved” by the author.  
Add a `LICENSE` (e.g., MIT) if you want to open-source it.

---
