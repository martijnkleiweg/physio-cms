// /js/partials.js

// Load elements with data-include="/partials/xyz.html" into the page
async function loadPartials() {
  const nodes = Array.from(document.querySelectorAll('[data-include]'));
  await Promise.all(nodes.map(async el => {
    const url = el.getAttribute('data-include');
    try {
      const res = await fetch(url, { cache: 'no-cache' });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      const html = await res.text();
      const tpl = document.createElement('template');
      tpl.innerHTML = html;
      el.replaceWith(tpl.content.cloneNode(true));
    } catch (e) {
      console.error('Partial load failed:', url, e);
      el.outerHTML = `<!-- failed to load ${url} -->`;
    }
  }));

  // Year in footer(s)
  const y = String(new Date().getFullYear());
  document.querySelectorAll('.js-year').forEach(el => { el.textContent = y; });

  // Offset sticky navbar by top-bar height
  function setStickyOffset(){
    const topbar = document.querySelector('.js-topbar');
    const header = document.querySelector('header.sticky-top');
    if (!header) return;

    let top = 0;
    if (topbar) {
      const pos = getComputedStyle(topbar).position;
      if (pos === 'fixed' || pos === 'sticky') {
        top = Math.round(topbar.getBoundingClientRect().height);
      }
    }
    header.style.top = `${top}px`;
    header.style.position = 'sticky'; // belt & suspenders
  }

  // run now, after render, and on resize (debounced)
  setStickyOffset();
  requestAnimationFrame(setStickyOffset);
  window.addEventListener('resize', (() => {
    let t; return () => { clearTimeout(t); t = setTimeout(setStickyOffset, 100); };
  })());


  // Wire off-canvas menu links to navigate after the menu fully closes
  initOffcanvasNav();
}

function initOffcanvasNav(){
  const ocEl = document.getElementById('mobileMenu');
  if (!ocEl || !window.bootstrap) return;

  const oc = bootstrap.Offcanvas.getOrCreateInstance(ocEl);

  // Delegate clicks inside the off-canvas
  ocEl.addEventListener('click', (ev) => {
    const a = ev.target.closest('a.nav-link, a.btn');
    if (!a) return;

    const href = a.getAttribute('href');
    if (!href) return;

    // Absolute URL from possibly relative href
    const url = new URL(href, location.origin);

    // Same-page anchor? Let the browser handle the scroll; just make sure the menu closes.
    const isSamePageAnchor =
      href.startsWith('#') ||
      (url.pathname === location.pathname && url.hash);

    if (isSamePageAnchor) {
      // Keep default navigation but ensure the drawer closes
      // (data-bs-dismiss may already be on the link—this is just extra safety)
      oc.hide();
      return; // no preventDefault so the anchor still scrolls
    }

    // Navigating to another page:
    // Prevent immediate navigation; wait until the off-canvas is hidden.
    ev.preventDefault();
    ocEl.addEventListener('hidden.bs.offcanvas', () => {
      window.location.assign(url.toString());
    }, { once: true });

    oc.hide();
  }, { passive: false });
}

document.addEventListener('DOMContentLoaded', loadPartials);
