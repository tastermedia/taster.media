// v21
document.addEventListener("DOMContentLoaded", function () {
  var overlay = document.createElement("div");
  overlay.id = "lightbox";
  overlay.innerHTML = '<div id="lightbox-inner"><button id="lightbox-close">✕</button><div id="lightbox-title"></div><button id="lightbox-prev">‹</button><button id="lightbox-next">›</button><iframe id="lightbox-iframe" allowfullscreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin"></iframe></div>';
  document.body.appendChild(overlay);
  var iframe = document.getElementById("lightbox-iframe");
  var lbTitle = null, lbPrev = null, lbNext = null;
  var currentVideoId = null, currentSortedList = [];
  var inner = document.getElementById("lightbox-inner");
  var isMob = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  function openLightbox(id, cardEl, title) {
    if (isMob) {
      var a=document.createElement('a');a.href="https://www.youtube.com/watch?v="+id;a.target="_blank";a.rel="noopener";document.body.appendChild(a);a.click();document.body.removeChild(a);return;
    }
    currentVideoId = id;
    if (!lbTitle) lbTitle = document.getElementById('lightbox-title');
    if (!lbPrev) { lbPrev = document.getElementById('lightbox-prev'); lbPrev.addEventListener('click', function(){ navLightbox(-1); }); }
    if (!lbNext) { lbNext = document.getElementById('lightbox-next'); lbNext.addEventListener('click', function(){ navLightbox(1); }); }
    if (lbTitle) lbTitle.textContent = title || '';
    // Update URL hash for deep linking
    if (history.replaceState) history.replaceState(null,'','#v='+id);
    iframe.src="https://www.youtube.com/embed/"+id+"?rel=0&autoplay=1";
    overlay.classList.add("active");
    document.body.style.overflow="hidden";
    // Animate inner panel expanding from thumbnail position
    var startScale = 0.05;
    if (cardEl) {
      var rect = cardEl.getBoundingClientRect();
      var vw = window.innerWidth, vh = window.innerHeight;
      // Set transform origin to thumbnail center relative to the lightbox-inner element
      // lightbox-inner is centered in viewport, so origin offset from its center
      var innerW = inner.offsetWidth, innerH = inner.offsetHeight;
      var innerLeft = (vw - innerW) / 2, innerTop = (vh - innerH) / 2;
      var ox = ((rect.left + rect.width/2 - innerLeft) / innerW * 100).toFixed(1) + '%';
      var oy = ((rect.top + rect.height/2 - innerTop) / innerH * 100).toFixed(1) + '%';
      inner.style.transformOrigin = ox + ' ' + oy;
      // Scale factor so animation starts at actual thumbnail size
      startScale = Math.max(rect.width / innerW, 0.04);
    } else {
      inner.style.transformOrigin = '50% 50%';
    }
    inner.animate([
      {transform: 'scale('+startScale+')', opacity: 0},
      {transform: 'scale(1)', opacity: 1}
    ], {duration: 500, easing: 'cubic-bezier(0.22,1,0.36,1)', fill: 'forwards'});
  }

  function closeLightbox() {
    if (history.replaceState) history.replaceState(null,'',window.location.pathname+window.location.search);
    currentVideoId = null;
    overlay.classList.add("closing");
    // Reverse the open animation back to origin
    inner.animate([
      {transform: 'scale(1)', opacity: 1},
      {transform: 'scale(0)', opacity: 0}
    ], {duration: 300, easing: 'cubic-bezier(0.55,0,0.45,1)', fill: 'forwards'})
      .onfinish = function() {
        overlay.classList.remove("active","closing");
        inner.style.animation = '';
        iframe.src = "";
        document.body.style.overflow = "";
      };
  }

  function navLightbox(dir) {
    if (!currentVideoId || !currentSortedList.length) return;
    var idx = currentSortedList.findIndex(function(v){ return v.id===currentVideoId; });
    if (idx === -1) return;
    var next = currentSortedList[idx + dir];
    if (!next) return;
    currentVideoId = null; // allow re-open
    // Find the card element for animation origin
    var cards = document.querySelectorAll('.video');
    var nextCard = null;
    cards.forEach(function(c,i){ if(currentSortedList[idx+dir] && i===(idx+dir)) nextCard=c; });
    if (history.replaceState) history.replaceState(null,'','#v='+next.id);
    if (lbTitle) lbTitle.textContent = next.title || '';
    currentVideoId = next.id;
    iframe.src = "https://www.youtube.com/embed/"+next.id+"?rel=0&autoplay=1";
  }
  document.getElementById("lightbox-close").addEventListener("click", closeLightbox);
  overlay.addEventListener("click", function(e){ if(e.target===overlay) closeLightbox(); });
  document.addEventListener("keydown", function(e){
    if(e.key==="Escape") closeLightbox();
    if(e.key==="ArrowLeft" && overlay.classList.contains("active")) navLightbox(-1);
    if(e.key==="ArrowRight" && overlay.classList.contains("active")) navLightbox(1);
  });

  // Intersection observer for card entrance animation
  var _observer = null;
  function observeCards() {
    if (_observer) _observer.disconnect();
    _observer = new IntersectionObserver(function(entries) {
      entries.forEach(function(e) {
        if (e.isIntersecting) { e.target.classList.add('visible'); _observer.unobserve(e.target); }
      });
    }, {threshold: 0.08, rootMargin: '0px 0px -20px 0px'});
    document.querySelectorAll('.video:not(.visible)').forEach(function(c) { _observer.observe(c); });
  }

  function buildGrid(videos) {
    var grid=document.getElementById("allVideosGrid"); if(!grid) return; grid.innerHTML="";
    videos.forEach(function(video,i) {
      var card=document.createElement("div"); card.className="video";
      if(video.featured) card.dataset.featured="true";
      var thumb=document.createElement("img"); thumb.className="thumb"; thumb.alt=video.title||"";
      thumb.loading=i<8?"eager":"lazy";
      thumb.onload=function(){this.classList.add('loaded');};
      if(thumb.complete) thumb.classList.add('loaded');
      thumb.src="https://img.youtube.com/vi/"+video.id+(isMob?"/mqdefault.jpg":"/hqdefault.jpg");
      var play=document.createElement("div"); play.className="play-icon"; play.innerHTML="▶";
      card.appendChild(thumb); card.appendChild(play);
      card.addEventListener("click", function(){ openLightbox(video.id, card, video.title); });
      // Hover info overlay
      var hoverInfo=document.createElement("div"); hoverInfo.className="hover-info";
      var hoverTitle=document.createElement("div"); hoverTitle.className="hover-title"; hoverTitle.textContent=video.title||"";
      var hoverViews=document.createElement("div"); hoverViews.className="hover-views";
      var hv=video.views||0;
      hoverViews.textContent=(hv>999999?(Math.round(hv/100000)/10)+'M':hv>999?(Math.round(hv/100)/10)+'K':hv)+' views';
      hoverInfo.appendChild(hoverTitle); hoverInfo.appendChild(hoverViews);
      card.appendChild(hoverInfo);
      var info=document.createElement("div"); info.className="video-info";
      var pt=parseTitle(video.title||"");
      var ae=document.createElement("div"); ae.className="video-artist";
      var artistLink=document.createElement("span"); artistLink.className="artist-link"; artistLink.textContent=pt.artist;
      artistLink.addEventListener("click",function(e){
        e.stopPropagation();
        typeFilter="all";
        searchQuery=pt.artist.toLowerCase();
        var inp=document.getElementById('searchInput');if(inp) inp.value=pt.artist;
        document.querySelectorAll('.type-btn').forEach(function(b){b.classList.remove('active');});
        var ab=document.querySelector('.type-btn[data-type="all"]');if(ab) ab.classList.add('active');
        refresh();
        window.scrollTo({top:0,behavior:'smooth'});
      });
      ae.appendChild(artistLink);
      var ve=document.createElement("div"); ve.className="video-venue"; ve.textContent=(pt.venue?pt.venue+' • ':'')+pt.details;
      var te=document.createElement("p"); te.className="video-title"; te.textContent=video.title||"";
      // View count + date badge
      var metaEl=document.createElement("div"); metaEl.className="video-meta";
      var views=video.views||0;
      var viewStr=views>999999?(Math.round(views/100000)/10)+'M views':views>999?(Math.round(views/100)/10)+'K views':views+' views';
      var showDate=video.show_date||video.published||'';
      var dateStr='';
      if(showDate){var d=new Date(showDate);dateStr=d.toLocaleDateString('en-US',{month:'short',year:'numeric'});}
      metaEl.textContent=(dateStr?dateStr+' • ':'')+viewStr;
      info.appendChild(ae); info.appendChild(ve); info.appendChild(metaEl); info.appendChild(te);
      card.appendChild(info); grid.appendChild(card);
    });
    requestAnimationFrame(function(){
      var cards=grid.querySelectorAll('.video');
      cards.forEach(function(c){ c.style.transform='translateZ(0)'; c.getBoundingClientRect(); c.style.transform=''; });
      // Hero: first card gets featured treatment
      // Use featured video as hero if present, otherwise first card
      var heroSet = false;
      cards.forEach(function(c,i){
        if(!heroSet && c.dataset && c.dataset.featured==='true'){ c.classList.add('hero-card'); heroSet=true; }
      });
      if(!heroSet && cards.length>0) cards[0].classList.add('hero-card');
      observeCards();
    });
  }

  function updateCount(n){ var el=document.getElementById("videoCount"); if(el) el.textContent=n+" video"+(n!==1?"s":""); }

  function getVideoType(v) {
    if(v.type==='360') return '360';
    var t=(v.title||'').toLowerCase();
    if(t.includes('single-cam')) return 'single';
    return 'multi';
  }
  function parseTitle(raw) {
    var artist='',venue='',details='';
    var lm=raw.match(/^(.+?)\s*\(live\)/i);
    artist=lm?lm[1].trim():raw.split(' - ')[0];
    var fm=raw.match(/from\s+(.+?)(?:\s+-\s+|\s+in\s+|$)/i);
    if(fm) venue=fm[1].trim();
    var di=raw.indexOf(' - ');
    if(di>-1) details=raw.slice(di+3);
    return {artist:artist,venue:venue,details:details};
  }

  function resetSortBtns(sortState) {
    document.querySelectorAll(".sort-btn").forEach(function(b){
      b.classList.remove("active");
      b.textContent=(b.dataset.field==="date"?"📅 Date":"👁 Views");
    });
    var active=document.querySelector('.sort-btn[data-field="'+sortState.field+'"]');
    if(active){ active.classList.add("active"); active.textContent=(sortState.field==="date"?"📅 Date":"👁 Views")+" "+(sortState.dir==="desc"?"↓":"↑"); }
  }

  // Show shimmer skeletons while loading
  (function(){
    var grid=document.getElementById("allVideosGrid");
    if(grid){
      grid.innerHTML='';
      for(var s=0;s<12;s++){
        grid.innerHTML+='<div class="skeleton"><div class="skeleton-thumb"></div><div class="skeleton-line"></div><div class="skeleton-line short"></div></div>';
      }
    }
  })();

  fetch("videos.json?d="+Math.floor(Date.now()/86400000))
    .then(function(r){ return r.json(); })
    .then(function(data) {
      var allVideos=data.videos||[];
      var sortState={field:"date",dir:"desc"};
      var searchQuery="";
      var typeFilter="all";
      var searchTimer=null;

      function getSorted(videos) {
        return videos.slice().sort(function(a,b){
          if(sortState.field==="date"){ var da=a.show_date||a.published,db=b.show_date||b.published; return sortState.dir==="desc"?(db>da?1:-1):(da>db?1:-1); }
          return sortState.dir==="desc"?(b.views-a.views):(a.views-b.views);
        });
      }

      function getFiltered() {
        return allVideos.filter(function(v){
          if(searchQuery&&v.title.toLowerCase().indexOf(searchQuery)===-1) return false;
          if(typeFilter!=="all"&&getVideoType(v)!==typeFilter) return false;
          return true;
        });
      }

      function refresh(){
        var filtered=getFiltered(),sorted=getSorted(filtered);
        currentSortedList = sorted;
        if(!sorted.length){
          var g=document.getElementById("allVideosGrid");
          if(g) g.innerHTML='<div class="no-results"><div class="no-results-icon">🎵</div><div class="no-results-text">No videos found</div><div class="no-results-sub">'+(searchQuery?'No results for “'+searchQuery+'”':'No videos match that filter')+'</div><button class="no-results-clear" onclick="clearAll()">Clear filters</button></div>';
          updateCount(0);
        } else { buildGrid(sorted); updateCount(filtered.length); }
      }
      refresh();

      // Pre-fill search from URL param e.g. index.html?q=front+porch
      (function(){
        var params=new URLSearchParams(window.location.search);
        var q=params.get('q');
        if(q){
          searchQuery=q.toLowerCase();
          var input=document.getElementById('searchInput');
          if(input) input.value=q;
          refresh();
        }
      })();
      // Deep link: open video from URL hash #v=videoId
      (function(){
        var hash=window.location.hash;
        var m=hash.match(/#v=([\w-]+)/);
        if(m){
          var vid=allVideos.find(function(v){return v.id===m[1];});
          if(vid) setTimeout(function(){ openLightbox(vid.id, null, vid.title); }, 400);
        }
      })();

      window.clearAll=function(){
        searchQuery="";typeFilter="all";
        var inp=document.getElementById('searchInput');if(inp) inp.value='';
        document.querySelectorAll('.type-btn').forEach(function(b){b.classList.remove('active');});
        var ab=document.querySelector('.type-btn[data-type="all"]');if(ab) ab.classList.add('active');
        refresh();
      };
      function initButtons() {
        document.querySelectorAll(".sort-btn").forEach(function(btn){
          btn.addEventListener("click", function(){
            var field=btn.dataset.field;
            if(sortState.field===field){ sortState.dir=sortState.dir==="desc"?"asc":"desc"; }
            else{ sortState.field=field; sortState.dir="desc"; }
            resetSortBtns(sortState);
            refresh();
          });
        });
        document.querySelectorAll(".type-btn").forEach(function(btn){
          btn.addEventListener("click", function(){
            typeFilter=btn.dataset.type;
            document.querySelectorAll(".type-btn").forEach(function(b){ b.classList.remove("active"); });
            btn.classList.add("active");
            refresh();
          });
        });
        var input=document.getElementById("searchInput");
        if(input){
          input.addEventListener("input", function(){
            clearTimeout(searchTimer);
            searchTimer=setTimeout(function(){ searchQuery=input.value.trim().toLowerCase(); refresh(); }, 150);
          });
          input.addEventListener("keydown", function(e){
            if(e.key==="Escape"){ input.value=""; searchQuery=""; refresh(); input.blur(); }
          });
        }
        resetSortBtns(sortState);
      }

      if(document.querySelector('.type-btn')){
        initButtons();
      } else {
        document.addEventListener("headerReady", function(){ initButtons(); }, {once:true});
      }
    })
    .catch(function(){ var grid=document.getElementById("allVideosGrid"); if(grid) grid.innerHTML='<p style="color:#888;padding:40px">Video archive loading...</p>'; });

  var scrollBtn=document.getElementById("scrollTopBtn");
  if(scrollBtn){
    window.addEventListener("scroll", function(){ scrollBtn.style.opacity=window.scrollY>300?1:0; scrollBtn.style.visibility=window.scrollY>300?"visible":"hidden"; });
    scrollBtn.addEventListener("click", function(){ window.scrollTo({top:0,behavior:"smooth"}); });
  }

  // ── Cursor trail ──
  (function(){
    var canvas=document.createElement('canvas');
    canvas.id='cursor-canvas';
    document.body.appendChild(canvas);
    var ctx=canvas.getContext('2d');
    var W=canvas.width=window.innerWidth, H=canvas.height=window.innerHeight;
    window.addEventListener('resize',function(){ W=canvas.width=window.innerWidth; H=canvas.height=window.innerHeight; });
    var particles=[];
    var mouse={x:-999,y:-999};
    window.addEventListener('mousemove',function(e){ mouse.x=e.clientX; mouse.y=e.clientY; });
    function Particle(x,y){
      this.x=x; this.y=y;
      this.size=Math.random()*3+1;
      this.alpha=0.7+Math.random()*0.3;
      this.vx=(Math.random()-0.5)*1.2;
      this.vy=(Math.random()-0.5)*1.2-0.4;
      this.hue=Math.random()<0.5?280:320; // purple or pink
    }
    Particle.prototype.update=function(){
      this.x+=this.vx; this.y+=this.vy;
      this.alpha-=0.022; this.size*=0.97;
    };
    var lastX=mouse.x, lastY=mouse.y;
    function loop(){
      requestAnimationFrame(loop);
      ctx.clearRect(0,0,W,H);
      if(Math.abs(mouse.x-lastX)>1||Math.abs(mouse.y-lastY)>1){
        for(var i=0;i<3;i++) particles.push(new Particle(mouse.x,mouse.y));
        lastX=mouse.x; lastY=mouse.y;
      }
      for(var j=particles.length-1;j>=0;j--){
        var p=particles[j];
        p.update();
        if(p.alpha<=0){ particles.splice(j,1); continue; }
        ctx.beginPath();
        ctx.arc(p.x,p.y,p.size,0,Math.PI*2);
        ctx.fillStyle='hsla('+p.hue+',100%,70%,'+p.alpha+')';
        ctx.fill();
      }
    }
    loop();
  })();
});
