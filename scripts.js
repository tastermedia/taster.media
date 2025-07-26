document.addEventListener("DOMContentLoaded", function () {
  // 🎥 Video lists (newest → oldest)
  const allVideos = [
    "https://www.youtube.com/embed/bDwJHLML1oQ",
    "https://www.youtube.com/embed/RBV2Rm7RuoY",
    "https://www.youtube.com/embed/zGZLec4CRfw",
    "https://www.youtube.com/embed/WL7Xg8--k8U",
    "https://www.youtube.com/embed/EklPeX4QiMw",
    "https://www.youtube.com/embed/lUA7Fd4chF8",
    "https://www.youtube.com/embed/awePJCjoNes",
    "https://www.youtube.com/embed/9fr4NV-E7-w",
    "https://www.youtube.com/embed/ZDEv_tcomcQ",
    "https://www.youtube.com/embed/nFQafZQWYO8",
    "https://www.youtube.com/embed/UExNYPOI0UU",
    "https://www.youtube.com/embed/gcXg0gaUJCY",
    "https://www.youtube.com/embed/cmRiw0ahuuc",
    "https://www.youtube.com/embed/-vJyLUWFBtM",
    "https://www.youtube.com/embed/MArDiSiZ20g",
    "https://www.youtube.com/embed/Cwi9jKTVhU8",
    "https://www.youtube.com/embed/OtwA4PBUZ6Y",
    "https://www.youtube.com/embed/ObOaxdn7E8U",
    "https://www.youtube.com/embed/WuUsgJqPnu4",
    "https://www.youtube.com/embed/asVojYYSmyA",
    "https://www.youtube.com/embed/RaUkKfppTIs"
  ];

  const frontPorchVideos = [
    "https://www.youtube.com/embed/nioEXdSpqak",
    "https://www.youtube.com/embed/8YTzPisPEAM",
    "https://www.youtube.com/embed/oqt5Ytju8VM",
    "https://www.youtube.com/embed/swscjfyTW-E",
    "https://www.youtube.com/embed/EbFw-EguGfU",
    "https://www.youtube.com/embed/YIBWVaVe9Pg",
    "https://www.youtube.com/embed/5vmijBomkcw",
    "https://www.youtube.com/embed/OSzfWL11E80",
    "https://www.youtube.com/embed/bsQkyVYA8I8",
    "https://www.youtube.com/embed/18Gq18K467Q",
    "https://www.youtube.com/embed/0kdjhSyPQ1k",
    "https://www.youtube.com/embed/3N54tQj83zU",
    "https://www.youtube.com/embed/Z0xwpslgi60",
    "https://www.youtube.com/embed/Kki2nnAu8gg",
    "https://www.youtube.com/embed/rbW9xQ--Y6A",
    "https://www.youtube.com/embed/r-VGJXAhe_8"
  ];

  function populateGrid(gridId, list) {
    const grid = document.getElementById(gridId);
    list.forEach(src => {
      const videoId = src.split('/').pop().split('?')[0];
      const thumbUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
      const wrapper = document.createElement("div");
      wrapper.className = "video";
      wrapper.innerHTML = `
        <img class="thumb" src="${thumbUrl}" alt="Video ${videoId}" />
        <iframe class="player" src="${src}?autoplay=1&mute=1" allowfullscreen></iframe>
      `;
      grid.appendChild(wrapper);
    });
  }

  populateGrid("allVideosGrid", allVideos);
  populateGrid("frontPorchGrid", frontPorchVideos);

  // 📝 Typewriter for subtitle
  const subtitleEl = document.getElementById("subtitle");
  const text = "Don’t just hear it. Taste it.";
  let idx = 0;
  function typeWriter() {
    if (idx < text.length) {
      subtitleEl.textContent += text[idx++];
      setTimeout(typeWriter, 100);
    }
  }
  if (subtitleEl) {
    subtitleEl.textContent = "";
    typeWriter();
  }
});