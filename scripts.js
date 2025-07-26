document.addEventListener("DOMContentLoaded", function() {
  // 🎥 All Videos (newest first)
  const allVideos = [
    'bDwJHLML1oQ','RBV2Rm7RuoY','zGZLec4CRfw','WL7Xg8--k8U','EklPeX4QiMw',
    'lUA7Fd4chF8','awePJCjoNes','9fr4NV-E7-w','ZDEv_tcomcQ','nFQafZQWYO8',
    'UExNYPOI0UU','gcXg0gaUJCY','cmRiw0ahuuc','-vJyLUWFBtM','MArDiSiZ20g',
    'Cwi9jKTVhU8','OtwA4PBUZ6Y','ObOaxdn7E8U','WuUsgJqPnu4','asVojYYSmyA',
    'RaUkKfppTIs'
  ];

  // 🎥 Front Porch Videos (newest first)
  const frontPorchVideos = [
    'nioEXdSpqak','8YTzPisPEAM','oqt5Ytju8VM','swscjfyTW-E','EbFw-EguGfU',
    'YIBWVaVe9Pg','5vmijBomkcw','OSzfWL11E80','bsQkyVYA8I8','18Gq18K467Q',
    '0kdjhSyPQ1k','3N54tQj83zU','Z0xwpslgi60','Kki2nnAu8gg','rbW9xQ--Y6A',
    'r-VGJXAhe_8'
  ];

  function createVideoCard(id) {
    const div = document.createElement('div');
    div.className = 'video';
    div.innerHTML = `
      <img  class="thumb"  src="https://img.youtube.com/vi/${id}/hqdefault.jpg" alt="Thumbnail">
      <iframe class="player"
              src="https://www.youtube.com/embed/${id}?autoplay=1&mute=1"
              frameborder="0"
              allow="autoplay; encrypted-media; picture-in-picture"
              allowfullscreen>
      </iframe>`;
    return div;
  }

  // Populate All Videos
  const allGrid   = document.getElementById('allVideosGrid');
  allVideos.forEach(id => allGrid.appendChild(createVideoCard(id)));

  // Populate Front Porch
  const porchGrid = document.getElementById('frontPorchGrid');
  frontPorchVideos.forEach(id => porchGrid.appendChild(createVideoCard(id)));

  // 📝 Typewriter for subtitle
  const subtitleEl = document.getElementById('subtitle');
  const text       = "Don't just hear it. Taste it.";
  let i = 0;
  function typeWriter() {
    if (i < text.length) {
      subtitleEl.textContent += text.charAt(i++);
      setTimeout(typeWriter, 100);
    }
  }
  subtitleEl.textContent = '';
  typeWriter();

  // 🔝 Scroll-to-top
  const btn = document.getElementById('scrollTopBtn');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 300) {
      btn.style.visibility = 'visible';
      btn.style.opacity    = '1';
    } else {
      btn.style.visibility = 'hidden';
      btn.style.opacity    = '0';
    }
  });
  btn.addEventListener('click', () =>
    window.scrollTo({ top: 0, behavior: 'smooth' })
  );
});