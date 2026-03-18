// v8
document.addEventListener("DOMContentLoaded", function () {
  var overlay = document.createElement("div");
  overlay.id = "lightbox";
  overlay.innerHTML = '<div id="lightbox-inner"><button id="lightbox-close">✕</button><iframe id="lightbox-iframe" allowfullscreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin"></iframe></div>';
  document.body.appendChild(overlay);
  var iframe = document.getElementById("lightbox-iframe");
  function openLightbox(id) {
    if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
      var a=document.createElement('a');a.href="https://www.youtube.com/watch?v="+id;a.target="_blank";a.rel="noopener";document.body.appendChild(a);a.click();document.body.removeChild(a);return;
    }
    iframe.src="https://www.youtube.com/embed/"+id+"?rel=0&autoplay=1";
    overlay.classList.add("active");document.body.style.overflow="hidden";
  }
  function closeLightbox(){overlay.classList.remove("active");iframe.src="";document.body.style.overflow="";}
  document.getElementById("lightbox-close").addEventListener("click",closeLightbox);
  overlay.addEventListener("click",function(e){if(e.target===overlay)closeLightbox();});
  document.addEventListener("keydown",function(e){if(e.key==="Escape")closeLightbox();});

  function buildGrid(videos){
    var grid=document.getElementById("allVideosGrid");if(!grid)return;grid.innerHTML="";
    videos.forEach(function(video){
      var card=document.createElement("div");card.className="video";
      var thumb=document.createElement("img");thumb.className="thumb";thumb.alt=video.title||"";thumb.loading="lazy";thumb.src="https://img.youtube.com/vi/"+video.id+"/hqdefault.jpg";
      var play=document.createElement("div");play.className="play-icon";play.innerHTML="▶";
      card.appendChild(thumb);card.appendChild(play);
      card.addEventListener("click",function(){openLightbox(video.id);});
      var info=document.createElement("div");info.className="video-info";
      var title=document.createElement("p");title.className="video-title";title.textContent=video.title||"";
      info.appendChild(title);card.appendChild(info);grid.appendChild(card);
    });
    requestAnimationFrame(function(){
      grid.querySelectorAll('.video').forEach(function(c){c.style.transform='translateZ(0)';c.getBoundingClientRect();c.style.transform='';});
    });
  }

  function updateCount(n){var el=document.getElementById("videoCount");if(el)el.textContent=n+" video"+(n!==1?"s":"");}

  function getVideoType(v){
    if(v.type==='360')return '360';
    var t=(v.title||'').toLowerCase();
    if(t.includes('single cam')||t.includes('single-cam'))return 'single';
    return 'multi';
  }

  function resetSortBtns(sortState){
    document.querySelectorAll(".sort-btn").forEach(function(b){
      b.classList.remove("active");
      b.textContent=(b.dataset.field==="date"?"📅 Date":"👁 Views")+(sortState.dir==="desc"&&sortState.field===b.dataset.field?" ↑":" ↓");
    });
    var activeSort=document.querySelector('.sort-btn[data-field="'+sortState.field+'"]');
    if(activeSort){
      activeSort.classList.add("active");
      activeSort.textContent=(sortState.field==="date"?"📅 Date":"👁 Views")+(sortState.dir==="desc"?" ↓":" ↑");
    }
  }

  fetch("videos.json?t="+Date.now())
    .then(function(r){return r.json();})
    .then(function(data){
      var allVideos=data.videos||[];
      var sortState={field:"date",dir:"desc"};
      var searchQuery="";
      var typeFilter="all";

      function getSorted(videos){
        return videos.slice().sort(function(a,b){
          if(sortState.field==="date"){var da=a.show_date||a.published,db=b.show_date||b.published;return sortState.dir==="desc"?(db>da?1:-1):(da>db?1:-1);}
          return sortState.dir==="desc"?(b.views-a.views):(a.views-b.views);
        });
      }
      function getFiltered(){
        return allVideos.filter(function(v){
          if(searchQuery&&v.title.toLowerCase().indexOf(searchQuery)===-1)return false;
          if(typeFilter!=="all"&&getVideoType(v)!==typeFilter)return false;
          return true;
        });
      }
      function refresh(){var filtered=getFiltered();buildGrid(getSorted(filtered));updateCount(filtered.length);}

      refresh();

      // Sort buttons (date/views)
      document.querySelectorAll(".sort-btn").forEach(function(btn){
        btn.addEventListener("click",function(){
          var field=btn.dataset.field;
          if(sortState.field===field){sortState.dir=sortState.dir==="desc"?"asc":"desc";}
          else{sortState.field=field;sortState.dir="desc";}
          resetSortBtns(sortState);
          refresh();
        });
      });

      // Type filter buttons
      document.querySelectorAll(".type-btn").forEach(function(btn){
        btn.addEventListener("click",function(){
          typeFilter=btn.dataset.type;
          // Reset sort to date desc
          sortState={field:"date",dir:"desc"};
          resetSortBtns(sortState);
          // Update active type btn
          document.querySelectorAll(".type-btn").forEach(function(b){b.classList.remove("active");});
          btn.classList.add("active");
          refresh();
        });
      });

      // Search
      var input=document.getElementById("searchInput"),results=document.getElementById("searchResults");
      if(input){
        input.addEventListener("input",function(){
          searchQuery=this.value.trim().toLowerCase();refresh();
          if(results){
            results.innerHTML="";
            if(searchQuery.length<2){results.classList.remove("active");return;}
            var isMobile=window.innerWidth<=600;
            var matches=allVideos.filter(function(v){return v.title.toLowerCase().indexOf(searchQuery)!==-1;}).slice(0,8);
            if(!matches.length){results.innerHTML='<div class="search-no-results">No results found</div>';results.classList.add("active");return;}
            matches.forEach(function(v){
              var item=document.createElement("div");item.className="search-result-item";
              if(isMobile){item.innerHTML='<span class="search-result-title">'+v.title+'</span>';}
              else{item.innerHTML='<img class="search-result-thumb" src="https://img.youtube.com/vi/'+v.id+'/mqdefault.jpg" loading="lazy"><span class="search-result-title">'+v.title+'</span>';}
              item.addEventListener("click",function(){openLightbox(v.id);input.value="";searchQuery="";results.classList.remove("active");refresh();});
              results.appendChild(item);
            });
            results.classList.add("active");
          }
        });
        input.addEventListener("keydown",function(e){if(e.key==="Escape"){input.value="";searchQuery="";refresh();if(results)results.classList.remove("active");input.blur();}});
        if(results){document.addEventListener("click",function(e){if(!input.contains(e.target)&&!results.contains(e.target))results.classList.remove("active");});}
      }
    })
    .catch(function(){var grid=document.getElementById("allVideosGrid");if(grid)grid.innerHTML='<p style="color:#888;padding:40px">Video archive loading...</p>';});

  var scrollBtn=document.getElementById("scrollTopBtn");
  if(scrollBtn){
    window.addEventListener("scroll",function(){scrollBtn.style.opacity=window.scrollY>300?1:0;scrollBtn.style.visibility=window.scrollY>300?"visible":"hidden";});
    scrollBtn.addEventListener("click",function(){window.scrollTo({top:0,behavior:"smooth"});});
  }
});