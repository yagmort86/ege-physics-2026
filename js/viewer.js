/**
 * EGE Physics Interactive Manual - Page Viewer
 * High-performance image viewer with zoom, pan, preloading and dual-page spread support.
 */

class PageViewer {
  constructor(options) {
    this.container = options.container;
    this.totalPages = options.totalPages || 488;
    this.pagesDir = options.pagesDir || "pages";
    this.currentPage = options.initialPage || 1;
    this.zoomLevel = 1.0;
    this.minZoom = 0.5;
    this.maxZoom = 3.0;
    this.isDualView = false;
    this.fitMode = "width"; // 'width', 'height', 'custom'
    this.onPageChange = options.onPageChange || (() => {});

    // Panning state
    this.isPanning = false;
    this.startX = 0;
    this.startY = 0;
    this.scrollLeft = 0;
    this.scrollTop = 0;

    // Image preloading cache
    this.cache = new Map();

    this.initDOM();
    this.bindEvents();
    this.goToPage(this.currentPage, false);
  }

  initDOM() {
    this.container.innerHTML = `
      <div class="viewer-viewport" id="viewer-viewport">
        <div class="viewer-canvas" id="viewer-canvas">
          <div class="page-wrapper left-page" id="left-page-wrap">
            <img class="page-img" id="page-img-left" alt="Страница книги" draggable="false" />
            <div class="page-number-tag" id="tag-left">Стр. 1</div>
          </div>
          <div class="page-wrapper right-page" id="right-page-wrap" style="display: none;">
            <img class="page-img" id="page-img-right" alt="Страница книги" draggable="false" />
            <div class="page-number-tag" id="tag-right">Стр. 2</div>
          </div>
        </div>
      </div>
    `;

    this.viewport = this.container.querySelector("#viewer-viewport");
    this.canvas = this.container.querySelector("#viewer-canvas");
    this.leftWrap = this.container.querySelector("#left-page-wrap");
    this.rightWrap = this.container.querySelector("#right-page-wrap");
    this.imgLeft = this.container.querySelector("#page-img-left");
    this.imgRight = this.container.querySelector("#page-img-right");
    this.tagLeft = this.container.querySelector("#tag-left");
    this.tagRight = this.container.querySelector("#tag-right");
  }

  bindEvents() {
    // Mouse drag for panning
    this.viewport.addEventListener("mousedown", (e) => {
      if (e.target.tagName.toLowerCase() === "input" || e.button !== 0) return;
      this.isPanning = true;
      this.viewport.classList.add("is-panning");
      this.startX = e.pageX - this.viewport.offsetLeft;
      this.startY = e.pageY - this.viewport.offsetTop;
      this.scrollLeft = this.viewport.scrollLeft;
      this.scrollTop = this.viewport.scrollTop;
    });

    window.addEventListener("mousemove", (e) => {
      if (!this.isPanning) return;
      e.preventDefault();
      const x = e.pageX - this.viewport.offsetLeft;
      const y = e.pageY - this.viewport.offsetTop;
      const walkX = (x - this.startX) * 1.2;
      const walkY = (y - this.startY) * 1.2;
      this.viewport.scrollLeft = this.scrollLeft - walkX;
      this.viewport.scrollTop = this.scrollTop - walkY;
    });

    window.addEventListener("mouseup", () => {
      this.isPanning = false;
      this.viewport.classList.remove("is-panning");
    });

    // Mouse wheel with Ctrl for zoom
    this.viewport.addEventListener(
      "wheel",
      (e) => {
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          const delta = e.deltaY > 0 ? -0.1 : 0.1;
          this.setZoom(this.zoomLevel + delta);
        }
      },
      { passive: false }
    );

    // Double click to toggle fit
    this.canvas.addEventListener("dblclick", () => {
      if (this.fitMode === "width") {
        this.setFitMode("height");
      } else {
        this.setFitMode("width");
      }
    });

    // Resize window
    window.addEventListener("resize", () => {
      if (this.fitMode !== "custom") {
        this.applyFitMode();
      }
    });
  }

  getPageUrl(pageNumber) {
    const padded = String(pageNumber).padStart(4, "0");
    return `${this.pagesDir}/${padded}.webp`;
  }

  preloadPage(pageNumber) {
    if (pageNumber < 1 || pageNumber > this.totalPages) return;
    if (!this.cache.has(pageNumber)) {
      const img = new Image();
      img.src = this.getPageUrl(pageNumber);
      this.cache.set(pageNumber, img);
    }
  }

  preloadSurroundings(current) {
    const range = [current - 2, current - 1, current + 1, current + 2];
    if (this.isDualView) {
      range.push(current + 3, current + 4);
    }
    for (const p of range) {
      this.preloadPage(p);
    }
    // Clean cache if too big (> 40 images)
    if (this.cache.size > 40) {
      for (const [k] of this.cache.entries()) {
        if (Math.abs(k - current) > 6) {
          this.cache.delete(k);
        }
      }
    }
  }

  goToPage(pageNumber, triggerCallback = true) {
    let p = parseInt(pageNumber, 10);
    if (isNaN(p) || p < 1) p = 1;
    if (p > this.totalPages) p = this.totalPages;

    this.currentPage = p;

    // Single or Dual view update
    if (this.isDualView) {
      // In dual view, left page is odd or chosen page, right is p + 1
      const leftPage = p % 2 === 0 ? p - 1 : p;
      const rightPage = leftPage + 1;

      this.imgLeft.src = this.getPageUrl(leftPage);
      this.tagLeft.textContent = `Стр. ${leftPage}`;

      if (rightPage <= this.totalPages) {
        this.rightWrap.style.display = "flex";
        this.imgRight.src = this.getPageUrl(rightPage);
        this.tagRight.textContent = `Стр. ${rightPage}`;
      } else {
        this.rightWrap.style.display = "none";
      }
    } else {
      this.rightWrap.style.display = "none";
      this.imgLeft.src = this.getPageUrl(p);
      this.tagLeft.textContent = `Стр. ${p} из ${this.totalPages}`;
    }

    this.applyFitMode();
    this.preloadSurroundings(p);

    if (triggerCallback) {
      this.onPageChange(this.currentPage);
    }
  }

  nextPage() {
    const step = this.isDualView ? 2 : 1;
    this.goToPage(this.currentPage + step);
  }

  prevPage() {
    const step = this.isDualView ? 2 : 1;
    this.goToPage(this.currentPage - step);
  }

  toggleDualView(force) {
    this.isDualView = force !== undefined ? force : !this.isDualView;
    this.goToPage(this.currentPage);
    return this.isDualView;
  }

  setZoom(val) {
    const clamped = Math.max(this.minZoom, Math.min(this.maxZoom, val));
    this.zoomLevel = parseFloat(clamped.toFixed(2));
    this.fitMode = "custom";
    this.updateZoomStyles();
  }

  zoomIn() {
    this.setZoom(this.zoomLevel + 0.15);
  }

  zoomOut() {
    this.setZoom(this.zoomLevel - 0.15);
  }

  resetZoom() {
    this.zoomLevel = 1.0;
    this.fitMode = "width";
    this.applyFitMode();
  }

  setFitMode(mode) {
    this.fitMode = mode;
    this.applyFitMode();
  }

  applyFitMode() {
    if (!this.viewport) return;
    const vpWidth = this.viewport.clientWidth - 40; // padding
    const vpHeight = this.viewport.clientHeight - 40;
    if (vpWidth <= 0 || vpHeight <= 0) return;

    // Standard aspect ratio for manual pages is ~ 1 : 1.41 (A4-ish)
    const pageAspectRatio = 1600 / 2250;
    const contentAspectRatio = this.isDualView ? pageAspectRatio * 2 : pageAspectRatio;

    if (this.fitMode === "width") {
      // Fit container width
      const targetWidth = vpWidth * (this.isDualView ? 0.95 : 0.88);
      // Base natural width is ~ 800px on 1.0 zoom
      this.zoomLevel = parseFloat(Math.min(2.5, Math.max(0.4, targetWidth / 850)).toFixed(2));
    } else if (this.fitMode === "height") {
      // Fit container height
      const targetHeight = vpHeight * 0.94;
      const targetWidth = targetHeight * contentAspectRatio;
      this.zoomLevel = parseFloat(Math.min(2.5, Math.max(0.4, targetWidth / 850)).toFixed(2));
    }

    this.updateZoomStyles();
  }

  updateZoomStyles() {
    if (!this.canvas) return;
    // Set custom CSS variable for page width scaling
    const baseWidth = this.isDualView ? 460 : 820;
    const computedWidth = Math.round(baseWidth * this.zoomLevel);

    this.leftWrap.style.width = `${computedWidth}px`;
    if (this.rightWrap) {
      this.rightWrap.style.width = `${computedWidth}px`;
    }

    // Fire zoom changed event if needed
    const event = new CustomEvent("zoomChanged", { detail: { zoom: this.zoomLevel, mode: this.fitMode } });
    this.container.dispatchEvent(event);
  }
}

window.PageViewer = PageViewer;
