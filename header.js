// header.js — single source of truth for injecting the site header
// and applying per-page setup. Replaces the old per-page inline injectors.
(function () {
  // Keep the footer copyright year current. Runs once the DOM is parsed
  // so the .footer-year spans exist.
  function fillYear() {
    var yr = new Date().getFullYear();
    document.querySelectorAll('.footer-year').forEach(function (el) { el.textContent = yr; });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fillYear);
  } else {
    fillYear();
  }

  function setupHeader() {
    var page = (location.pathname.split('/').pop() || 'index.html').replace('.html', '') || 'index';
    if (page !== 'index') {
      // Hide both control rows (Type and Sort both use .header-sort)
      document.querySelectorAll('.header-sort').forEach(function (row) {
        row.style.display = 'none';
      });
      // Replace the search box with a link back to the video index
      var sw = document.querySelector('.header-search-wrap');
      if (sw) {
        var lnk = document.createElement('a');
        lnk.href = 'index.html';
        lnk.className = 'nav-back-search';
        lnk.textContent = '🔎 Browse videos';
        sw.parentNode.replaceChild(lnk, sw);
      }
      // Relabel the Contact nav as a back-to-videos link
      var nav = document.querySelector('.nav-contact');
      if (nav) {
        nav.textContent = '← Videos';
        nav.href = 'index.html';
      }
    }
    document.dispatchEvent(new Event('headerReady'));
  }

  fetch('header.html?d=' + Math.floor(Date.now() / 86400000))
    .then(function (r) { return r.text(); })
    .then(function (h) {
      var ph = document.getElementById('header-placeholder');
      if (!ph) { document.dispatchEvent(new Event('headerReady')); return; }
      ph.outerHTML = h;
      setupHeader();
    })
    .catch(function () {
      var ph = document.getElementById('header-placeholder');
      if (ph) ph.innerHTML = '<nav style="padding:1rem"><a href="/">Taster Media</a></nav>';
      document.dispatchEvent(new Event('headerReady'));
    });
})();
