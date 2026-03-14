document.addEventListener("DOMContentLoaded", function () {
  var is360 = window.location.pathname.includes('360');

  var overlay = document.createElement("div");
  overlay.id = "lightbox";
  overlay.innerHTML = '<div id="lightbox-inner"><button id="lightbox-close">\u2715</button><iframe id="lightbox-iframe" allowfullscreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin"></iframe></div>';
  document.body.appendChild(overlay);
  var iframe = document.getElementById("lightbox-iframe");

  function openLightbox(id) {
    iframe.src = "https://www.youtube.com/embed/" + id + "?rel=0";
    overlay.classList.add("active");
    document.body.style.overflow = "hidden";
  }
  function closeLightbox() {
    overlay.classList.remove("active");
    iframe.src = "";
    document.body.style.overflow = "";
  }
  document.getElementById("lightbox-close").addEventListener("click", closeLightbox);
  overlay.addEventListener("click", function(e) { if (e.target === overlay) closeLightbox(); });
  document.addEventListener("keydown", function(e) { if (e.key === "Escape") closeLightbox(); });

  function buildGrid(containerId, videos) {
    var grid = document.getElementById(containerId);
    if (!grid) return;
    videos.forEach(function(video) {
      var card = document.createElement("div");
      card.className = "video";
      var thumb = document.createElement("img");
      thumb.className = "thumb";
      thumb.alt = video.title || "";
      thumb.loading = "lazy";
      thumb.src = "https://img.youtube.com/vi/" + video.id + "/hqdefault.jpg";
      var play = document.createElement("div");
      play.className = "play-icon";
      play.innerHTML = "\u25B6";
      card.appendChild(thumb);
      card.appendChild(play);
      card.addEventListener("click", function() { openLightbox(video.id); });
      var info = document.createElement("div");
      info.className = "video-info";
      var title = document.createElement("p");
      title.className = "video-title";
      title.textContent = video.title || "";
      info.appendChild(title);
      card.appendChild(info);
      grid.appendChild(card);
    });
  }

  function initSearch(videos) {
    var input = document.getElementById("searchInput");
    var results = document.getElementById("searchResults");
    if (!input || !results) return;
    input.addEventListener("input", function() {
      var q = this.value.trim().toLowerCase();
      results.innerHTML = "";
      if (q.length < 2) { results.classList.remove("active"); return; }
      var matches = videos.filter(function(v) { return v.title.toLowerCase().indexOf(q) !== -1; }).slice(0, 8);
      if (!matches.length) {
        results.innerHTML = '<div class="search-no-results">No results found</div>';
        results.classList.add("active");
        return;
      }
      matches.forEach(function(v) {
        var item = document.createElement("div");
        item.className = "search-result-item";
        item.innerHTML = '<img class="search-result-thumb" src="https://img.youtube.com/vi/' + v.id + '/mqdefault.jpg" loading="lazy"><span class="search-result-title">' + v.title + '</span>';
        item.addEventListener("click", function() { openLightbox(v.id); input.value = ""; results.classList.remove("active"); });
        results.appendChild(item);
      });
      results.classList.add("active");
    });
    document.addEventListener("click", function(e) {
      if (!input.contains(e.target) && !results.contains(e.target)) results.classList.remove("active");
    });
    input.addEventListener("keydown", function(e) {
      if (e.key === "Escape") { results.classList.remove("active"); input.blur(); }
    });
  }

  fetch("videos.json?t=" + Date.now())
    .then(function(r) { return r.json(); })
    .then(function(data) {
      var videos = data.videos || [];
      videos = is360 ? videos.filter(function(v) { return v.type === "360"; }) : videos.filter(function(v) { return v.type === "4k" || !v.type; });
      videos.sort(function(a, b) { return (b.show_date || b.published) > (a.show_date || a.published) ? 1 : -1; });
      buildGrid("allVideosGrid", videos);
      initSearch(videos);
    })
    .catch(function() {
      var grid = document.getElementById("allVideosGrid");
      if (grid) grid.innerHTML = '<p style="color:#888;padding:40px">Video archive loading...</p>';
    });

  var scrollBtn = document.getElementById("scrollTopBtn");
  if (scrollBtn) {
    window.addEventListener("scroll", function() {
      scrollBtn.style.opacity = window.scrollY > 300 ? 1 : 0;
      scrollBtn.style.visibility = window.scrollY > 300 ? "visible" : "hidden";
    });
    scrollBtn.addEventListener("click", function() { window.scrollTo({ top: 0, behavior: "smooth" }); });
  }
});
