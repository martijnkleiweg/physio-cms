// Load elements with data-include="/partials/xyz.html" into the page
async function loadPartials() {
  const nodes = Array.from(document.querySelectorAll('[data-include]'));
  await Promise.all(
    nodes.map(async (el) => {
      const url = el.getAttribute('data-include');
      try {
        const res = await fetch(url, { cache: 'no-cache' });
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        el.innerHTML = await res.text();
      } catch (e) {
        console.error('Partial load failed:', url, e);
        el.outerHTML = `<!-- failed to load ${url} -->`;
      }
    })
  );
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
