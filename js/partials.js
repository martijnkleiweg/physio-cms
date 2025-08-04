// Load elements with data-include="/partials/xyz.html" into the page
async function loadPartials() {
  const placeholders = Array.from(document.querySelectorAll('[data-include]'));

  await Promise.all(placeholders.map(async (ph) => {
    const url = ph.getAttribute('data-include');
    try {
      const res = await fetch(url, { cache: 'no-cache' });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      const html = await res.text();

      // Replace the placeholder node entirely so there is NO wrapper
      const tpl = document.createElement('template');
      tpl.innerHTML = html.trim();
      ph.replaceWith(tpl.content);

    } catch (e) {
      console.error('Partial load failed:', url, e);
      ph.replaceWith(document.createComment(`failed to load ${url}`));
    }
  }));

  // Set current year in any injected footer(s)
  const y = String(new Date().getFullYear());
  document.querySelectorAll('.js-year').forEach(el => { el.textContent = y; });
}

// After partials are injected, run common UI setup
function afterPartialsInit() {
  setCurrentYear();
  setupOffcanvasAutoclose();
}

// Put current year in any .js-year element (e.g., footer)
function setCurrentYear() {
  const y = String(new Date().getFullYear());
  document.querySelectorAll('.js-year').forEach((el) => {
    el.textContent = y;
  });
}


// Close the mobile offcanvas menu when a nav link is clicked
function setupOffcanvasAutoclose() {
  const panel = document.querySelector('.offcanvas');
  if (!panel || typeof bootstrap === 'undefined') return;

  const offc = bootstrap.Offcanvas.getOrCreateInstance(panel);
  panel.querySelectorAll('.nav-link').forEach((a) => {
    a.addEventListener('click', () => offc.hide(), { passive: true });
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  await loadPartials();
  afterPartialsInit();
});
