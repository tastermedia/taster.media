document.addEventListener("DOMContentLoaded", () => {
  // ─────────── Your two playlists (newest-first) ───────────
  const allIds = [
    "bDwJHLML1oQ",
    "RBV2Rm7RuoY",
    "zGZLec4CRfw",
    "WL7Xg8--k8U",
    "EklPeX4QiMw",
    "lUA7Fd4chF8",
    "awePJCjoNes",
    "9fr4NV-E7-w",
    "ZDEv_tcomcQ",
    "nFQafZQWYO8",
    "UExNYPOI0UU",
    "gcXg0gaUJCY",
    "cmRiw0ahuuc",
    "-vJyLUWFBtM",
    "MArDiSiZ20g",
    "Cwi9jKTVhU8",
    "OtwA4PBUZ6Y",
    "ObOaxdn7E8U",
    "WuUsgJqPnu4",
    "asVojYYSmyA",
    "RaUkKfppTIs"
  ];

  const frontPorchIds = [
    "nioEXdSpqak",
    "8YTzPisPEAM",
    "oqt5Ytju8VM",
    "swscjfyTW-E",
    "EbFw-EguGfU",
    "YIBWVaVe9Pg",
    "5vmijBomkcw",
    "OSzfWL11E80",
    "bsQkyVYA8I8",
    "18Gq18K467Q",
    "0kdjhSyPQ1k",
    "3N54tQj83zU",
    "Z0xwpslgi60",
    "Kki2nnAu8gg",
    "rbW9xQ--Y6A",    // corrected ID
    "r-VGJXAhe_8"
  ];

  // ─────────── Build each grid ───────────
  function populateGrid(ids, gridId) {
    const grid = document.getElementById(gridId);
    grid.innerHTML = ""; // clear

    ids.forEach((vid) => {
      const div = document.createElement("div");
      div.className = "video";
      div.innerHTML = `
        <img class="thumb" src="https://img.youtube.com/vi/${vid}/hqdefault.jpg" alt="Video thumbnail" />
        <iframe
          class="player"
          src="https://www.youtube.com/embed/${vid}?autoplay=1&mute=1"
          allow="autoplay; encrypted-media; picture-in-picture"
          allowfullscreen
        ></iframe>
      `;
      grid.appendChild(div);
    });
  }

  populateGrid(allIds, "allVideosGrid");
  populateGrid(frontPorchIds, "frontPorchGrid");

  // ─────────── Scroll-to-Top Button ───────────
  const scrollTopBtn = document.getElementById("scrollTopBtn");
  scrollTopBtn.style.opacity = 0;
  window.addEventListener("scroll", () => {
    scrollTopBtn.style.opacity = window.scrollY > 300 ? 1 : 0;
  });
  scrollTopBtn.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
});