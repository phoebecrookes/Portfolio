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

  var overlayVideoPool = {};

  function warmOverlayVideo(overlayEl, src) {
    if (!overlayEl || !src) return null;

    if (!overlayVideoPool[src]) {
      var video = document.createElement('video');
      video.setAttribute('muted', '');
      video.setAttribute('loop', '');
      video.setAttribute('playsinline', '');
      video.setAttribute('preload', 'auto');
      video.src = src;
      video.style.display = 'none';
      overlayEl.appendChild(video);
      overlayVideoPool[src] = video;
      video.load();
    }

    return overlayVideoPool[src];
  }

  function hideOverlayVideos(overlayEl) {
    if (!overlayEl) return;
    overlayEl.querySelectorAll('video').forEach(function(video) {
      video.pause();
      video.style.display = 'none';
    });
  }

  function playOverlayVideo(video) {
    if (!video) return;

    function start() {
      video.currentTime = 0;
      video.play().catch(function() {});
    }

    if (video.readyState >= 2) {
      start();
      return;
    }

    video.addEventListener('canplay', function onCanPlay() {
      video.removeEventListener('canplay', onCanPlay);
      start();
    });
  }

  function preloadMediaItem(item, overlayEl) {
    if (!item || !item.src || item.type === 'vimeo') return;
    if (item.type === 'video') {
      if (overlayEl) {
        warmOverlayVideo(overlayEl, item.src);
      } else {
        var detached = document.createElement('video');
        detached.preload = 'auto';
        detached.muted = true;
        detached.setAttribute('playsinline', '');
        detached.src = item.src;
        detached.load();
      }
      return;
    }
    var image = new Image();
    image.src = item.src;
  }

  function preloadMediaList(media, overlayEl) {
    media.forEach(function(item) {
      preloadMediaItem(item, overlayEl);
    });
  }

  function setupOverlay(overlayEl) {
    var img = overlayEl.querySelector('img');
    var vimeo = overlayEl.querySelector('iframe.vimeo-overlay');

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
      hideOverlayVideos(overlayEl);
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
          hideAll();
          var poolVideo = warmOverlayVideo(overlayEl, item.src);
          poolVideo.style.display = 'block';
          playOverlayVideo(poolVideo);
        } else {
          hideAll();
          img.style.display = 'block';
          if (img.src !== item.src) {
            img.src = item.src;
          }
          img.alt = item.alt || '';
        }
      },
      hide: function() {
        hideOverlayVideos(overlayEl);
        vimeo.style.display = 'none';
        img.style.display = 'none';
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
    var gallery = cells[0] && cells[0].closest('.project-gallery');
    var scrollMode = gallery && gallery.classList.contains('is-scroll');

    cells.forEach(function(cell) {
      var video = cell.querySelector('video');
      if (video) {
        if (scrollMode || cell.classList.contains('current')) {
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

      if (scrollMode || cell.classList.contains('current')) {
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
    var canNavigate = isProjectPage && cells.length > 1;
    var CURSOR_NEXT = 'url("cursor-arrow.svg") 6 18, pointer';
    var CURSOR_PREV = 'url("cursor-arrow-left.svg") 42 18, pointer';
    var navigationLock = false;

    if (isProjectPage && projectContent && !projectContent.querySelector('.mobile-project-nav')) {
      var mobileNav = document.createElement('nav');
      mobileNav.className = 'mobile-project-nav';
      mobileNav.setAttribute('aria-label', 'Site navigation');
      mobileNav.innerHTML =
        '<a href="about.html">About</a>' +
        '<a href="mailto:crookesphoebe@gmail.com">Contact</a>' +
        '<a href="index.html">&larr; Back to all projects</a>';
      projectContent.appendChild(mobileNav);
    }

    function isMobileGallery() {
      return window.matchMedia('(max-width: 768px)').matches;
    }

    function setGalleryMode() {
      if (!isProjectPage) return;

      if (isMobileGallery()) {
        gallery.classList.add('is-scroll');
        if (captionDisplay) captionDisplay.hidden = true;
      } else {
        gallery.classList.remove('is-scroll');
        var idx = getCurrentIndex();
        if (idx < 0) idx = 0;
        cells.forEach(function(cell, i) {
          cell.classList.toggle('current', i === idx);
        });
        updateCaption();
      }

      syncCellMedia(cells);
      bindCurrentMediaInteraction();
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
      if (gallery.classList.contains('is-scroll')) return;
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

      captionDisplay.style.left = (mediaRect.left - contentRect.left) + 'px';
      captionDisplay.style.top = (mediaRect.bottom - contentRect.top + gap) + 'px';
      captionDisplay.style.maxWidth = mediaRect.width + 'px';
      captionDisplay.hidden = !text;
    }

    function positionGalleryChrome() {
      positionCaption();
    }

    function updateCaption() {
      if (!captionDisplay) return;
      if (gallery.classList.contains('is-scroll')) {
        captionDisplay.hidden = true;
        return;
      }
      var current = gallery.querySelector('.gallery-cell.current');
      var caption = current && current.querySelector('.gallery-caption');
      var text = caption ? caption.innerHTML.trim() : '';
      captionDisplay.innerHTML = text;
      captionDisplay.hidden = true;
      if (text || canNavigate) {
        requestAnimationFrame(positionGalleryChrome);
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

    window.addEventListener('resize', function() {
      setGalleryMode();
      positionGalleryChrome();
    });
    window.addEventListener('scroll', positionGalleryChrome, { passive: true });

    if (isProjectPage) {
      setGalleryMode();
    } else {
      cells[0].classList.add('current');
      syncCellMedia(cells);
    }

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
      if (item) preloadMediaItem(item, overlay);
    });
    updateCaption();
    requestAnimationFrame(function() {
      requestAnimationFrame(positionGalleryChrome);
    });
    window.addEventListener('load', positionGalleryChrome);

    function showOverlayWithCurrent() {
      var current = gallery.querySelector('.gallery-cell.current');
      if (!current) return;
      var item = getMediaFromCell(current);
      if (!item || item.type === 'vimeo') {
        hideOverlay();
        return;
      }
      overlayMedia.show(item);
      overlay.classList.add('is-visible');
      overlay.setAttribute('aria-hidden', 'false');
    }

    function hideOverlay() {
      overlayMedia.hide();
      overlay.classList.remove('is-visible');
      overlay.setAttribute('aria-hidden', 'true');
    }

    function bindCurrentMediaInteraction() {
      if (gallery.classList.contains('is-scroll')) return;

      var current = gallery.querySelector('.gallery-cell.current');
      if (!current) return;

      current.querySelectorAll('img, video, .gallery-vimeo').forEach(function(media) {
        if (media._mediaInteractionBound) return;
        media._mediaInteractionBound = true;

        media.addEventListener('mouseenter', showOverlayWithCurrent);
        media.addEventListener('mouseleave', function() {
          if (navigationLock) return;
          hideOverlay();
          media.style.cursor = '';
        });

        if (!canNavigate) return;

        media.addEventListener('mousemove', function(e) {
          var rect = media.getBoundingClientRect();
          var isLeft = (e.clientX - rect.left) < rect.width / 2;
          media.style.cursor = isLeft ? CURSOR_PREV : CURSOR_NEXT;
        });

        media.addEventListener('click', function(e) {
          e.preventDefault();
          var rect = media.getBoundingClientRect();
          var idx = getCurrentIndex();
          if ((e.clientX - rect.left) < rect.width / 2) {
            goToIndex((idx - 1 + cells.length) % cells.length);
          } else {
            goToIndex((idx + 1) % cells.length);
          }
        });
      });
    }

    function goToIndex(idx) {
      if (gallery.classList.contains('is-scroll')) return;

      var current = gallery.querySelector('.gallery-cell.current');
      if (!current || !cells[idx]) return;

      var keepOverlay = overlay.classList.contains('is-visible');
      navigationLock = true;

      current.classList.remove('current');
      cells[idx].classList.add('current');
      syncCellMedia(cells);
      updateCaption();
      bindCurrentMediaInteraction();

      if (keepOverlay) {
        showOverlayWithCurrent();
      } else {
        requestAnimationFrame(function() {
          var media = cells[idx].querySelector('img, video, .gallery-vimeo');
          if (media && media.matches(':hover')) {
            showOverlayWithCurrent();
          }
        });
      }

      requestAnimationFrame(function() {
        navigationLock = false;
      });
    }

    bindCurrentMediaInteraction();
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
        preloadMediaList(mediaCache[href], overlay);
        return Promise.resolve(mediaCache[href]);
      }
      return fetch(href)
        .then(function(res) { return res.text(); })
        .then(function(html) {
          var media = extractGalleryMedia(html);
          mediaCache[href] = media;
          preloadMediaList(media, overlay);
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

      var thumb = thumbFromCard(card);
      if (thumb && thumb.type === 'video') {
        warmOverlayVideo(overlay, thumb.src);
      }

      var wrap = card.querySelector('.project-image-wrap');
      if (!wrap) return;

      function onImageEnter() {
        activeCard = card;
        var thumbItem = thumbFromCard(card);

        if (!href) {
          startCycle(card, buildHoverMedia(thumbItem, []), 0);
          return;
        }

        if (mediaCache[href] && mediaCache[href].length) {
          startCycle(card, buildHoverMedia(thumbItem, mediaCache[href]), 0);
          return;
        }

        if (thumbItem) overlayMedia.show(thumbItem);
        overlay.classList.add('is-visible');
        overlay.setAttribute('aria-hidden', 'false');

        loadProjectMedia(href).then(function(media) {
          if (activeCard !== card) return;
          startCycle(card, buildHoverMedia(thumbItem, media), 0);
        });
      }

      function onImageLeave() {
        if (activeCard !== card) return;
        activeCard = null;
        stopCycle();
        overlayMedia.hide();
        overlay.classList.remove('is-visible');
        overlay.setAttribute('aria-hidden', 'true');
      }

      wrap.querySelectorAll('img, video').forEach(function(mediaEl) {
        mediaEl.addEventListener('mouseenter', onImageEnter);
        mediaEl.addEventListener('mouseleave', onImageLeave);
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
