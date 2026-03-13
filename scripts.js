document.addEventListener("DOMContentLoaded", function () {
  const overlay = document.createElement("div");
  overlay.id = "lightbox";
  overlay.innerHTML = `<div id="lightbox-inner"><button id="lightbox-close">\u2715</button><iframe id="lightbox-iframe" allowfullscreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin"></iframe></div>`;
  document.body.appendChild(overlay);
  const iframe = document.getElementById("lightbox-iframe");
  function openLightbox(videoId) {
    iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1`;
    overlay.classList.add("active");
    document.body.style.overflow = "hidden";
  }
  function closeLightbox() {
    overlay.classList.remove("active");
    iframe.src = "";
    document.body.style.overflow = "";
  }
  document.getElementById("lightbox-close").addEventListener("click", closeLightbox);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) closeLightbox(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeLightbox(); });
  function buildGrid(containerId, videos) {
    const grid = document.getElementById(containerId);
    if (!grid) return;
    videos.forEach(video => {
      const card = document.createElement("div");
      card.className = "video";
      const thumb = document.createElement("img");
      thumb.className = "thumb";
      thumb.alt = video.title || "";
      thumb.loading = "lazy";
      thumb.src = `https://img.youtube.com/vi/${video.id}/hqdefault.jpg`;
      const playIcon = document.createElement("div");
      playIcon.className = "play-icon";
      playIcon.innerHTML = "\u25B6";
      card.appendChild(thumb);
      card.appendChild(playIcon);
      card.addEventListener("click", () => openLightbox(video.id));
      const info = document.createElement("div");
      info.className = "video-info";
      const title = document.createElement("p");
      title.className = "video-title";
      title.textContent = video.title || "";
      info.appendChild(title);
      if (video.views) {
        const views = document.createElement("p");
        views.className = "video-views";
        views.textContent = formatViews(video.views) + " views";
        info.appendChild(views);
      }
      card.appendChild(info);
      grid.appendChild(card);
    });
  }
  function formatViews(n) {
    n = parseInt(n, 10);
    if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
    if (n >= 1000) return (n / 1000).toFixed(1) + "K";
    return n.toString();
  }
  fetch("videos.json?t=" + Date.now())
    .then(r => r.json())
    .then(data => {
      const videos = data.videos || [];
      videos.sort((a, b) => (b.show_date || b.published) > (a.show_date || a.published) ? 1 : -1);
      buildGrid("allVideosGrid", videos);
    })
    .catch(() => {
      const grid = document.getElementById("allVideosGrid");
      if (grid) grid.innerHTML = '<p style="color:#888;padding:40px">Video archive loading...</p>';
    });
  const scrollBtn = document.getElementById("scrollTopBtn");
  if (scrollBtn) {
    window.addEventListener("scroll", () => {
      scrollBtn.style.opacity = window.scrollY > 300 ? 1 : 0;
      scrollBtn.style.visibility = window.scrollY > 300 ? "visible" : "hidden";
    });
    scrollBtn.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
  }
});
