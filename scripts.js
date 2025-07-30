// scripts.js
document.addEventListener("DOMContentLoaded", function() {
  // ▶️ All Videos (newest first)
  const allVideos = [
    'P6anEkCEDDQ','RBV2Rm7RuoY','zGZLec4CRfw','WL7Xg8--k8U','EklPeX4QiMw',
    'lUA7Fd4chF8','awePJCjoNes','9fr4NV-E7-w','ZDEv_tcomcQ','nFQafZQWYO8',
    'UExNYPOI0UU','gcXg0gaUJCY','cmRiw0ahuuc','-vJyLUWFBtM','MArDiSiZ20g',
    'Cwi9jKTVhU8','OtwA4PBUZ6Y','ObOaxdn7E8U','WuUsgJqPnu4','asVojYYSmyA',
    'RaUkKfppTIs'
  ];

  // 🚪 Front Porch (newest first)
  const frontPorch = [
    'nioEXdSpqak','8YTzPisPEAM','oqt5Ytju8VM','swscjfyTW-E','EbFw-EguGfU',
    'YIBWVaVe9Pg','5vmijBomkcw','OSzfWL11E80','bsQkyVYA8I8','18Gq18K467Q',
    '0kdjhSyPQ1k','3N54tQj83zU','Z0xwpslgi60','Kki2nnAu8gg','rbW9xQ--Y6A',
    'r-VGJXAhe_8'
  ];

  function buildGrid(containerId, videoIds) {
    const grid = document.getElementById(containerId);
    videoIds.forEach(id => {
      const card = document.createElement("div");
      card.className = "video";

      // thumbnail link
      const link = document.createElement("a");
      link.href = `https://youtu.be/${id}`;
      link.target = "_blank";
      link.rel = "noopener noreferrer";

      const thumb = document.createElement("img");
      thumb.className = "thumb";
      thumb.src = `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
      thumb.alt = "Video thumbnail";
      link.appendChild(thumb);
      card.appendChild(link);

      // hidden player
      const player = document.createElement("iframe");
      player.className = "player";
      player.src = `https://www.youtube.com/embed/${id}?autoplay=1`;
      player.allow =
        "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
      player.referrerPolicy = "strict-origin-when-cross-origin";
      player.allowFullscreen = true;
      card.appendChild(player);

      grid.appendChild(card);
    });
  }

  buildGrid("allVideosGrid", allVideos);
  buildGrid("frontPorchGrid", frontPorch);

  // scroll-to-top button logic (if you have it)
  const scrollBtn = document.getElementById("scrollTopBtn");
  if (scrollBtn) {
    window.addEventListener("scroll", () => {
      if (window.scrollY > 300) {
        scrollBtn.style.opacity = 1;
        scrollBtn.style.visibility = "visible";
      } else {
        scrollBtn.style.opacity = 0;
        scrollBtn.style.visibility = "hidden";
      }
    });
    scrollBtn.addEventListener("click", () =>
      window.scrollTo({ top: 0, behavior: "smooth" })
    );
  }
});