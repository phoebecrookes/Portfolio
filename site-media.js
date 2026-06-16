(function() {
  function isVideoSrc(src) {
    return /\.(mp4|webm|mov)(\?|$)/i.test(src);
  }

  function getMediaFromCell(cell) {
    var vimeoIframe = cell.querySelector('.gallery-vimeo iframe, iframe[src*="player.vimeo.com"]');
    if (vimeoIframe) {
      return {
        type: 'vimeo',
        src: vimeoIframe.getAttribute('src'),
        alt: vimeoIframe.getAttribute('title') || ''
      };
    }

    var video = cell.querySelector('video');
    if (video) {
      var src = video.getAttribute('src');
      if (!src) {
        var source = video.querySelector('source');
        src = source && source.getAttribute('src');
      }
      if (src) return { type: 'video', src: src, alt: '' };
    }

    var img = cell.querySelector('img');
    if (img && img.getAttribute('src')) {
      var imgSrc = img.getAttribute('src');
      if (isVideoSrc(imgSrc)) {
        return { type: 'video', src: imgSrc, alt: img.alt || '' };
      }
      return { type: 'image', src: imgSrc, alt: img.alt || '' };
    }

    return null;
  }

  function extractGalleryMedia(html) {
    var doc = new DOMParser().parseFromString(html, 'text/html');
    var cells = doc.querySelectorAll('.project-gallery .gallery-cell');
    var media = [];

    cells.forEach(function(cell) {
      var item = getMediaFromCell(cell);
      if (item) media.push(item);
    });

    return media;
  }

  function preloadMediaItem(item) {
    if (!item || !item.src || item.type === 'vimeo') return;
    if (item.type === 'video') {
      var video = document.createElement('video');
      video.preload = 'auto';
      video.muted = true;
      video.setAttribute('playsinline', '');
      video.src = item.src;
      video.load();
      return;
    }
    var image = new Image();
    image.src = item.src;
  }

  function preloadMediaList(media) {
    media.forEach(preloadMediaItem);
  }

  function setupOverlay(overlayEl) {
    var img = overlayEl.querySelector('img');
    var video = overlayEl.querySelector('video');
    var vimeo = overlayEl.querySelector('iframe.vimeo-overlay');

    if (!video) {
      video = document.createElement('video');
      video.setAttribute('muted', '');
      video.setAttribute('loop', '');
      video.setAttribute('playsinline', '');
      video.setAttribute('preload', 'auto');
      overlayEl.appendChild(video);
    }

    if (!vimeo) {
      vimeo = document.createElement('iframe');
      vimeo.className = 'vimeo-overlay';
      vimeo.setAttribute('allow', 'autoplay; fullscreen; picture-in-picture');
      vimeo.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
      vimeo.style.display = 'none';
      overlayEl.appendChild(vimeo);
    }

    function hideAll() {
      img.style.display = 'none';
      video.pause();
      video.style.display = 'none';
      vimeo.style.display = 'none';
    }

    return {
      show: function(item) {
        if (!item || !item.src) return;

        if (item.type === 'vimeo') {
          hideAll();
          vimeo.style.display = 'block';
          if (vimeo.getAttribute('src') !== item.src) {
            vimeo.setAttribute('src', item.src);
          }
          return;
        }

        if (item.type === 'video') {
          vimeo.style.display = 'none';
          img.style.display = 'none';
          video.style.display = 'block';
          if (video.getAttribute('src') !== item.src) {
            video.setAttribute('src', item.src);
            video.load();
          }
          video.play().catch(function() {});
        } else {
          vimeo.style.display = 'none';
          video.pause();
          video.style.display = 'none';
          img.style.display = 'block';
          img.src = item.src;
          img.alt = item.alt || '';
        }
      },
      hide: function() {
        video.pause();
        video.style.display = 'none';
        vimeo.style.display = 'none';
        img.style.display = 'block';
      }
    };
  }

  function getVimeoPlayer(iframe) {
    if (!iframe || !window.Vimeo) return null;
    if (!iframe._vimeoPlayer) {
      iframe._vimeoPlayer = new Vimeo.Player(iframe);
    }
    return iframe._vimeoPlayer;
  }

  function syncCellMedia(cells) {
    cells.forEach(function(cell) {
      var video = cell.querySelector('video');
      if (video) {
        if (cell.classList.contains('current')) {
          video.play().catch(function() {});
        } else {
          video.pause();
          video.currentTime = 0;
        }
      }

      var vimeoIframe = cell.querySelector('.gallery-vimeo iframe, iframe[src*="player.vimeo.com"]');
      if (!vimeoIframe) return;

      var player = getVimeoPlayer(vimeoIframe);
      if (!player) return;

      if (cell.classList.contains('current')) {
        player.play().catch(function() {});
      } else {
        player.pause().catch(function() {});
      }
    });
  }

  function initProjectGallery() {
    var overlay = document.getElementById('imageOverlay');
    var gallery = document.querySelector('.project-gallery');
    var projectContent = document.querySelector('.project-content');
    if (!overlay || !gallery) return;

    var overlayMedia = setupOverlay(overlay);
    var cells = document.querySelectorAll('.project-gallery .gallery-cell');
    if (cells.length === 0) return;

    var captionDisplay = document.querySelector('.gallery-caption-display');
    if (!captionDisplay && projectContent) {
      captionDisplay = document.createElement('p');
      captionDisplay.className = 'gallery-caption-display';
      projectContent.appendChild(captionDisplay);
    }

    var isProjectPage = document.body.classList.contains('project-page');
    var navWrap = null;
    var navPrev = null;
    var navNext = null;

    if (isProjectPage && cells.length > 1 && projectContent) {
      navWrap = document.createElement('div');
      navWrap.className = 'gallery-nav';
      navWrap.innerHTML =
        '<button type="button" class="gallery-nav-prev" aria-label="Previous image">' +
          '<svg width="32" height="24" viewBox="0 0 32 24" aria-hidden="true">' +
            '<path d="M2 12 L18 12 M18 12 L12 6 M18 12 L12 18" fill="none" stroke="#000" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>' +
            '<path d="M2 12 L18 12 M18 12 L12 6 M18 12 L12 18" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>' +
          '</svg>' +
        '</button>' +
        '<button type="button" class="gallery-nav-next" aria-label="Next image">' +
          '<svg width="32" height="24" viewBox="0 0 32 24" aria-hidden="true">' +
            '<path d="M2 12 L18 12 M18 12 L12 6 M18 12 L12 18" fill="none" stroke="#000" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>' +
            '<path d="M2 12 L18 12 M18 12 L12 6 M18 12 L12 18" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>' +
          '</svg>' +
        '</button>';
      projectContent.appendChild(navWrap);
      navPrev = navWrap.querySelector('.gallery-nav-prev');
      navNext = navWrap.querySelector('.gallery-nav-next');
    }

    function getCurrentIndex() {
      var current = gallery.querySelector('.gallery-cell.current');
      return Array.prototype.indexOf.call(cells, current);
    }

    function getCaptionGap() {
      if (!projectContent) return 0;
      var gap = getComputedStyle(projectContent).getPropertyValue('--gallery-caption-gap');
      return parseFloat(gap) || 0;
    }

    function positionCaption() {
      if (!captionDisplay || !projectContent) return;

      var current = gallery.querySelector('.gallery-cell.current');
      if (!current) return;

      var caption = current.querySelector('.gallery-caption');
      var text = caption ? caption.innerHTML.trim() : '';
      var media = current.querySelector('img, video, .gallery-vimeo');
      if (!media) return;

      var contentRect = projectContent.getBoundingClientRect();
      var mediaRect = media.getBoundingClientRect();
      if (mediaRect.height < 1) {
        captionDisplay.hidden = true;
        return;
      }

      var gap = getCaptionGap();
      var navWidth = navWrap && !navWrap.hidden ? navWrap.offsetWidth : 0;
      var navGap = navWidth ? 8 : 0;

      captionDisplay.style.left = (mediaRect.left - contentRect.left) + 'px';
      captionDisplay.style.top = (mediaRect.bottom - contentRect.top + gap) + 'px';
      captionDisplay.style.maxWidth = Math.max(0, mediaRect.width - navWidth - navGap) + 'px';
      captionDisplay.hidden = !text;
    }

    function positionNav() {
      if (!navWrap || !projectContent) return;

      var current = gallery.querySelector('.gallery-cell.current');
      if (!current) return;

      var media = current.querySelector('img, video, .gallery-vimeo');
      if (!media) return;

      var contentRect = projectContent.getBoundingClientRect();
      var mediaRect = media.getBoundingClientRect();
      if (mediaRect.height < 1) {
        navWrap.hidden = true;
        return;
      }

      var gap = getCaptionGap();

      navWrap.style.top = (mediaRect.bottom - contentRect.top + gap) + 'px';
      navWrap.style.left = (mediaRect.right - contentRect.left) + 'px';
      navWrap.hidden = false;
      positionCaption();
    }

    function positionGalleryChrome() {
      positionNav();
      if (!navWrap) positionCaption();
    }

    function updateCaption() {
      if (!captionDisplay) return;
      var current = gallery.querySelector('.gallery-cell.current');
      var caption = current && current.querySelector('.gallery-caption');
      var text = caption ? caption.innerHTML.trim() : '';
      captionDisplay.innerHTML = text;
      captionDisplay.hidden = true;
      if (text) {
        requestAnimationFrame(positionGalleryChrome);
      } else if (navWrap) {
        requestAnimationFrame(positionNav);
      }
    }

    function bindMediaReady(media) {
      function onMediaReady() {
        if (media.closest('.gallery-cell.current')) {
          positionGalleryChrome();
        }
      }

      if (media.classList && media.classList.contains('gallery-vimeo')) {
        var iframe = media.querySelector('iframe');
        if (iframe) {
          iframe.addEventListener('load', onMediaReady);
        }
        if (window.ResizeObserver) {
          var resizeObserver = new ResizeObserver(onMediaReady);
          resizeObserver.observe(media);
        }
        requestAnimationFrame(function() {
          requestAnimationFrame(onMediaReady);
        });
        return;
      }

      if (media.tagName === 'IMG') {
        media.addEventListener('load', onMediaReady);
        if (media.complete) onMediaReady();
        return;
      }

      if (media.tagName === 'VIDEO') {
        ['loadedmetadata', 'loadeddata', 'canplay'].forEach(function(eventName) {
          media.addEventListener(eventName, onMediaReady);
        });
        if (media.readyState >= 1) {
          onMediaReady();
        }
      }
    }

    gallery.querySelectorAll('img, video, .gallery-vimeo').forEach(bindMediaReady);

    window.addEventListener('resize', positionGalleryChrome);

    cells[0].classList.add('current');
    syncCellMedia(cells);

    if (gallery.querySelector('iframe[src*="vimeo.com"]') && window.Vimeo) {
      gallery.querySelectorAll('.gallery-vimeo iframe, iframe[src*="player.vimeo.com"]').forEach(function(iframe) {
        getVimeoPlayer(iframe);
      });
    } else if (gallery.querySelector('iframe[src*="vimeo.com"]')) {
      var vimeoScript = document.querySelector('script[src*="player.vimeo.com"]');
      if (vimeoScript) {
        vimeoScript.addEventListener('load', function() {
          syncCellMedia(cells);
        });
      }
    }
    cells.forEach(function(cell) {
      var item = getMediaFromCell(cell);
      if (item) preloadMediaItem(item);
    });
    updateCaption();

    function showOverlayWithCurrent() {
      var current = gallery.querySelector('.gallery-cell.current');
      if (!current) return;
      var item = getMediaFromCell(current);
      if (!item || item.type === 'vimeo') {
        overlayMedia.hide();
        overlay.classList.remove('is-visible');
        overlay.setAttribute('aria-hidden', 'true');
        return;
      }
      overlayMedia.show(item);
      overlay.classList.add('is-visible');
      overlay.setAttribute('aria-hidden', 'false');
    }

    function goToIndex(idx) {
      var current = gallery.querySelector('.gallery-cell.current');
      if (!current || !cells[idx]) return;
      current.classList.remove('current');
      cells[idx].classList.add('current');
      syncCellMedia(cells);
      updateCaption();
      showOverlayWithCurrent();
    }

    gallery.addEventListener('mouseenter', showOverlayWithCurrent);
    gallery.addEventListener('mouseleave', function() {
      overlayMedia.hide();
      overlay.classList.remove('is-visible');
      overlay.setAttribute('aria-hidden', 'true');
    });

    if (navPrev && navNext) {
      navPrev.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        var idx = getCurrentIndex();
        goToIndex((idx - 1 + cells.length) % cells.length);
      });

      navNext.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        var idx = getCurrentIndex();
        goToIndex((idx + 1) % cells.length);
      });
    }
  }

  function initHomeHover() {
    var overlay = document.getElementById('imageOverlay');
    if (!overlay) return;

    var overlayMedia = setupOverlay(overlay);
    var cards = document.querySelectorAll('.project-card');
    var mediaCache = {};
    var cycleTimer = null;
    var activeCard = null;
    var CYCLE_MS = 1100;

    function loadProjectMedia(href) {
      if (mediaCache[href]) {
        preloadMediaList(mediaCache[href]);
        return Promise.resolve(mediaCache[href]);
      }
      return fetch(href)
        .then(function(res) { return res.text(); })
        .then(function(html) {
          var media = extractGalleryMedia(html);
          mediaCache[href] = media;
          preloadMediaList(media);
          return media;
        })
        .catch(function() {
          mediaCache[href] = [];
          return [];
        });
    }

    function stopCycle() {
      if (cycleTimer) {
        clearInterval(cycleTimer);
        cycleTimer = null;
      }
    }

    function startCycle(card, media, startIndex) {
      stopCycle();
      if (!media.length) return;

      var idx = startIndex || 0;
      overlayMedia.show(media[idx]);
      overlay.classList.add('is-visible');
      overlay.setAttribute('aria-hidden', 'false');

      if (media.length <= 1) return;

      cycleTimer = setInterval(function() {
        if (activeCard !== card) return;
        idx = (idx + 1) % media.length;
        overlayMedia.show(media[idx]);
      }, CYCLE_MS);
    }

    function thumbFromCard(card) {
      var wrap = card.querySelector('.project-image-wrap');
      if (!wrap) return null;

      var video = wrap.querySelector('video');
      if (video) {
        var videoSrc = video.getAttribute('src');
        if (videoSrc) return { type: 'video', src: videoSrc, alt: '' };
      }

      var thumb = wrap.querySelector('img');
      if (!thumb || !thumb.src) return null;
      if (isVideoSrc(thumb.src)) {
        return { type: 'video', src: thumb.src, alt: thumb.alt || '' };
      }
      return { type: 'image', src: thumb.src, alt: thumb.alt || '' };
    }

    function mediaSrcKey(item) {
      if (!item || !item.src) return '';
      try {
        return new URL(item.src, window.location.href).href;
      } catch (error) {
        return item.src;
      }
    }

    function isSameMedia(a, b) {
      if (!a || !b) return false;
      return a.type === b.type && mediaSrcKey(a) === mediaSrcKey(b);
    }

    function buildHoverMedia(thumb, galleryMedia) {
      var media = [];
      if (thumb) media.push(thumb);

      (galleryMedia || []).forEach(function(item) {
        if (media.some(function(existing) { return isSameMedia(existing, item); })) return;
        media.push(item);
      });

      return media;
    }

    cards.forEach(function(card) {
      var href = card.getAttribute('href');
      if (href) loadProjectMedia(href);

      card.addEventListener('mouseenter', function() {
        activeCard = card;
        var thumb = thumbFromCard(card);

        if (!href) {
          startCycle(card, buildHoverMedia(thumb, []), 0);
          return;
        }

        if (mediaCache[href] && mediaCache[href].length) {
          startCycle(card, buildHoverMedia(thumb, mediaCache[href]), 0);
          return;
        }

        if (thumb) overlayMedia.show(thumb);
        overlay.classList.add('is-visible');
        overlay.setAttribute('aria-hidden', 'false');

        loadProjectMedia(href).then(function(media) {
          if (activeCard !== card) return;
          startCycle(card, buildHoverMedia(thumb, media), 0);
        });
      });

      card.addEventListener('mouseleave', function() {
        if (activeCard === card) activeCard = null;
        stopCycle();
        overlayMedia.hide();
        overlay.classList.remove('is-visible');
        overlay.setAttribute('aria-hidden', 'true');
      });
    });
  }

  if (document.body.classList.contains('home')) {
    initHomeHover();
  }

  if (document.body.classList.contains('project-page') || document.body.classList.contains('about-page')) {
    initProjectGallery();
  }
})();
