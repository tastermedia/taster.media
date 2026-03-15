document.addEventListener("DOMContentLoaded", function () {
  var is360 = window.location.pathname.includes('360');
  var overlay = document.createElement("div");
  overlay.id = "lightbox";
  overlay.innerHTML = '<div id="lightbox-inner"><button id="lightbox-close">✕</button><iframe id="lightbox-iframe" allowfullscreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin"></iframe></div>';
  document.body.appendChild(overlay);
  var iframe = document.getElementById("lightbox-iframe");
  function openLightbox(id) {
    if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) { window.open("https://www.youtube.com/watch?v=" + id, "_blank"); return; }
    iframe.src = "https://www.youtube.com/embed/" + id + "?rel=0";
    overlay.classList.add("active");
    document.body.style.overflow = "hidden";
  }
  function closeLightbox() { overlay.classList.remove("active"); iframe.src = ""; document.body.style.overflow = ""; }
  document.getElementById("lightbox-close").addEventListener("click", closeLightbox);
  overlay.addEventListener("click", function(e) { if (e.target === overlay) closeLightbox(); });
  document.addEventListener("keydown", function(e) { if (e.key === "Escape") closeLightbox(); });

  function buildGrid(containerId, videos) {
    var grid = document.getElementById(containerId);
    if (!grid) return;
    grid.innerHTML = "";
    videos.forEach(function(video) {
      var card = document.createElement("div"); card.className = "video";
      var thumb = document.createElement("img"); thumb.className = "thumb"; thumb.alt = video.title || ""; thumb.loading = "lazy"; thumb.src = "https://img.youtube.com/vi/" + video.id + "/hqdefault.jpg";
      var play = document.createElement("div"); play.className = "play-icon"; play.innerHTML = "▶";
      card.appendChild(thumb); card.appendChild(play);
      card.addEventListener("click", function() { openLightbox(video.id); });
      var info = document.createElement("div"); info.className = "video-info";
      var title = document.createElement("p"); title.className = "video-title"; title.textContent = video.title || "";
      info.appendChild(title); card.appendChild(info); grid.appendChild(card);
    });
  }

  function buildControls(allVideos) {
    var section = document.querySelector(".playlist-section");
    if (!section || document.getElementById("controlsBar")) return;
    var sortState = { field: "date", dir: "desc" };

    var bar = document.createElement("div"); bar.id = "controlsBar";
    bar.innerHTML = `
      <div class="controls-search">
        <input type="text" id="searchInput" class="search-input" placeholder="Search videos..." autocomplete="off" />
        <div id="searchResults" class="search-results"></div>
      </div>
      <div class="controls-sort">
        <span class="sort-label">Sort by</span>
        <div class="sort-buttons">
          <button class="sort-btn active" data-field="date">📅 Date ↓</button>
          <button class="sort-btn" data-field="views">👁 Views ↓</button>
        </div>
      </div>
    `;
    section.insertBefore(bar, section.firstChild);

    bar.querySelectorAll(".sort-btn").forEach(function(btn) {
      btn.addEventListener("click", function() {
        var field = btn.dataset.field;
        if (sortState.field === field) { sortState.dir = sortState.dir === "desc" ? "asc" : "desc"; }
        else { sortState.field = field; sortState.dir = "desc"; }
        bar.querySelectorAll(".sort-btn").forEach(function(b) {
          b.classList.remove("active");
          b.textContent = (b.dataset.field === "date" ? "📅 Date" : "👁 Views") + " ↓";
        });
        btn.classList.add("active");
        btn.textContent = (field === "date" ? "📅 Date" : "👁 Views") + (sortState.dir === "desc" ? " ↓" : " ↑");
        var sorted = allVideos.slice().sort(function(a, b) {
          if (field === "date") { var da = a.show_date || a.published, db = b.show_date || b.published; return sortState.dir === "desc" ? (db > da ? 1 : -1) : (da > db ? 1 : -1); }
          return sortState.dir === "desc" ? (b.views - a.views) : (a.views - b.views);
        });
        buildGrid("allVideosGrid", sorted);
      });
    });

    var input = document.getElementById("searchInput");
    var results = document.getElementById("searchResults");
    input.addEventListener("input", function() {
      var q = this.value.trim().toLowerCase(); results.innerHTML = "";
      if (q.length < 2) { results.classList.remove("active"); return; }
      var matches = allVideos.filter(function(v) { return v.title.toLowerCase().indexOf(q) !== -1; }).slice(0, 8);
      if (!matches.length) { results.innerHTML = '<div class="search-no-results">No results found</div>'; results.classList.add("active"); return; }
      matches.forEach(function(v) {
        var item = document.createElement("div"); item.className = "search-result-item";
        item.innerHTML = '<img class="search-result-thumb" src="https://img.youtube.com/vi/' + v.id + '/mqdefault.jpg" loading="lazy"><span class="search-result-title">' + v.title + '</span>';
        item.addEventListener("click", function() { openLightbox(v.id); input.value = ""; results.classList.remove("active"); });
        results.appendChild(item);
      });
      results.classList.add("active");
    });
    document.addEventListener("click", function(e) { if (!input.contains(e.target) && !results.contains(e.target)) results.classList.remove("active"); });
    input.addEventListener("keydown", function(e) { if (e.key === "Escape") { results.classList.remove("active"); input.blur(); } });
  }

  fetch("videos.json?t=" + Date.now())
    .then(function(r) { return r.json(); })
    .then(function(data) {
      var videos = data.videos || [];
      videos = is360 ? videos.filter(function(v) { return v.type === "360"; }) : videos.filter(function(v) { return v.type === "4k" || !v.type; });
      videos.sort(function(a, b) { return (b.show_date || b.published) > (a.show_date || a.published) ? 1 : -1; });
      buildGrid("allVideosGrid", videos);
      buildControls(videos);
    })
    .catch(function() { var grid = document.getElementById("allVideosGrid"); if (grid) grid.innerHTML = '<p style="color:#888;padding:40px">Video archive loading...</p>'; });

  var scrollBtn = document.getElementById("scrollTopBtn");
  if (scrollBtn) {
    window.addEventListener("scroll", function() { scrollBtn.style.opacity = window.scrollY > 300 ? 1 : 0; scrollBtn.style.visibility = window.scrollY > 300 ? "visible" : "hidden"; });
    scrollBtn.addEventListener("click", function() { window.scrollTo({ top: 0, behavior: "smooth" }); });
  }
});