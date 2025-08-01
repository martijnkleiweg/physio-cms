// Load elements with data-include="/partials/xyz.html" into the page
async function loadPartials() {
  const nodes = Array.from(document.querySelectorAll('[data-include]'));
  await Promise.all(nodes.map(async el => {
    const url = el.getAttribute('data-include');
    try {
      const res = await fetch(url, { cache: 'no-cache' });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      el.innerHTML = await res.text();
    } catch (e) {
      console.error('Partial load failed:', url, e);
      el.outerHTML = `<!-- failed to load ${url} -->`;
    }
  }));
}
document.addEventListener('DOMContentLoaded', loadPartials);
