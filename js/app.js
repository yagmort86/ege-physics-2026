/**
 * EGE Physics Interactive Manual - Main Application Coordinator
 */

document.addEventListener("DOMContentLoaded", () => {
  // Check Auth First
  if (!localStorage.getItem('token')) {
    document.getElementById("auth-modal").style.display = "flex";
  }

  const totalBookPages = 488;
  const initialPage = parseInt(localStorage.getItem("ege_phys_last_page") || "1", 10);

  window.handleLogin = async () => {
    const name = document.getElementById("auth-name").value;
    const surname = document.getElementById("auth-surname").value;
    const pass = document.getElementById("auth-pass").value;
    try {
      await Auth.login(name, surname, pass);
      document.getElementById("auth-modal").style.display = "none";
    } catch (e) { alert("Ошибка входа"); }
  };

  window.handleRegister = async () => {
    const name = document.getElementById("auth-name").value;
    const surname = document.getElementById("auth-surname").value;
    const pass = document.getElementById("auth-pass").value;
    try {
      const ok = await Auth.register(name, surname, pass);
      if (ok) alert("Зарегистрировано! Теперь войдите.");
    } catch (e) { alert("Ошибка регистрации"); }
  };

  // DOM Elements
  const viewerContainer = document.getElementById("viewer-container");
  const tasksContainer = document.getElementById("tasks-panel-content");
  const tocList = document.getElementById("toc-list");
  const tocSearch = document.getElementById("toc-search");
  const pageInput = document.getElementById("page-num-input");
  const pageTotalLabel = document.getElementById("page-total-label");
  const pageSlider = document.getElementById("page-slider");
  const btnPrev = document.getElementById("btn-prev-page");
  const btnNext = document.getElementById("btn-next-page");
  const btnZoomIn = document.getElementById("btn-zoom-in");
  const btnZoomOut = document.getElementById("btn-zoom-out");
  const btnZoomReset = document.getElementById("btn-zoom-reset");
  const zoomLevelLabel = document.getElementById("zoom-level-label");
  const btnDualView = document.getElementById("btn-dual-view");
  const btnFitWidth = document.getElementById("btn-fit-width");
  const btnFitHeight = document.getElementById("btn-fit-height");
  const btnToggleToc = document.getElementById("btn-toggle-toc");
  const btnToggleTasks = document.getElementById("btn-toggle-tasks");
  const btnThemeToggle = document.getElementById("btn-theme-toggle");
  const btnParentMode = document.getElementById("btn-parent-mode");
  const btnBookmark = document.getElementById("btn-bookmark-page");
  const btnStats = document.getElementById("btn-stats");
  const btnShareWifi = document.getElementById("btn-share-wifi");
  const statsBadge = document.getElementById("header-stats-badge");

  // Modals
  const modalAnswer = document.getElementById("modal-answer-view");
  const modalAnswerImg = document.getElementById("modal-answer-img");
  const modalAnswerTitle = document.getElementById("modal-answer-title");
  const btnCloseAnsModal = document.getElementById("btn-close-ans-modal");
  const modalStats = document.getElementById("modal-stats");
  const btnCloseStatsModal = document.getElementById("btn-close-stats-modal");
  const modalShare = document.getElementById("modal-share");
  const btnCloseShareModal = document.getElementById("btn-close-share-modal");

  // App Layout Shells
  const sidebarToc = document.getElementById("sidebar-toc");
  const panelTasks = document.getElementById("panel-tasks");

  // Bookmarks state
  let bookmarks = JSON.parse(localStorage.getItem("ege_phys_bookmarks_v1") || "[]");

  // 1. Initialize Page Viewer
  const viewer = new PageViewer({
    container: viewerContainer,
    totalPages: totalBookPages,
    pagesDir: "pages",
    initialPage: initialPage,
    onPageChange: (pno) => {
      onPageUpdated(pno);
    }
  });

  // 2. Initialize Task Engine
  const taskEngine = new TaskEngine({
    container: tasksContainer,
    role: Auth.getRole(),
    onProgressUpdate: (stats) => {
      updateStatsUI(stats);
    },
    onOpenAnswerPage: (ansPage) => {
      openAnswerModal(ansPage);
    }
  });

  // Page Updated Callback
  function onPageUpdated(pno) {
    localStorage.setItem("ege_phys_last_page", pno);
    pageInput.value = pno;
    pageSlider.value = pno;

    // Update bookmark star state
    updateBookmarkButton(pno);

    // Update active highlight in TOC
    highlightTocItem(pno);

    // Render tasks for active page
    taskEngine.renderPageTasks(pno);
  }

  // 3. Render Table of Contents Tree
  function renderTOC(filterText = "") {
    const list = window.EGE_TOC || [];
    const query = filterText.trim().toLowerCase();
    let html = "";

    list.forEach((section) => {
      let itemsHtml = "";
      let hasMatchingChild = false;

      if (section.items) {
        section.items.forEach((item) => {
          let subHtml = "";
          let itemMatches = !query || item.title.toLowerCase().includes(query);

          if (item.sub) {
            item.sub.forEach((sub) => {
              const subMatches = !query || sub.title.toLowerCase().includes(query);
              if (subMatches) {
                hasMatchingChild = true;
                itemMatches = true;
                subHtml += `
                  <li class="toc-subitem" data-page="${sub.page}">
                    <span class="toc-bullet">•</span>
                    <span class="toc-item-title">${sub.title}</span>
                    <span class="toc-item-pno">стр. ${sub.page}</span>
                  </li>
                `;
              }
            });
          }

          if (itemMatches) {
            hasMatchingChild = true;
            itemsHtml += `
              <li class="toc-item ${item.sub ? "has-sub" : ""}" data-page="${item.page || section.start}">
                <div class="toc-item-row">
                  <span class="toc-item-title">${item.title}</span>
                  <span class="toc-item-pno">стр. ${item.page || section.start}</span>
                </div>
                ${subHtml ? `<ul class="toc-sublist">${subHtml}</ul>` : ""}
              </li>
            `;
          }
        });
      }

      const secMatches = !query || section.title.toLowerCase().includes(query) || hasMatchingChild;

      if (secMatches) {
        html += `
          <div class="toc-section-group ${hasMatchingChild && query ? "open" : ""}">
            <div class="toc-section-header" data-page="${section.start}">
              <span class="toc-sec-title">${section.title}</span>
              <span class="toc-sec-pages">стр. ${section.start}–${section.end}</span>
            </div>
            ${itemsHtml ? `<ul class="toc-items-list">${itemsHtml}</ul>` : ""}
          </div>
        `;
      }
    });

    if (!html) {
      html = `<div class="toc-no-results">Ничего не найдено по запросу «${filterText}»</div>`;
    }

    tocList.innerHTML = html;

    // Bind click events on TOC items
    tocList.querySelectorAll("[data-page]").forEach((el) => {
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        const p = parseInt(el.getAttribute("data-page"), 10);
        if (p) {
          viewer.goToPage(p);
          // Auto close TOC on mobile
          if (window.innerWidth < 768) {
            sidebarToc.classList.remove("open");
          }
        }
      });
    });
  }

  // Highlight current TOC item
  function highlightTocItem(pno) {
    tocList.querySelectorAll(".is-active-item").forEach((el) => el.classList.remove("is-active-item"));
    let bestMatch = null;
    let minDiff = 9999;

    tocList.querySelectorAll("[data-page]").forEach((el) => {
      const p = parseInt(el.getAttribute("data-page"), 10);
      if (p <= pno && pno - p < minDiff) {
        minDiff = pno - p;
        bestMatch = el;
      }
    });

    if (bestMatch) {
      bestMatch.classList.add("is-active-item");
    }
  }

  // 4. Zoom Events & UI Updates
  viewerContainer.addEventListener("zoomChanged", (e) => {
    const zoomPct = Math.round(e.detail.zoom * 100);
    zoomLevelLabel.textContent = `${zoomPct}%`;
  });

  btnZoomIn.addEventListener("click", () => viewer.zoomIn());
  btnZoomOut.addEventListener("click", () => viewer.zoomOut());
  btnZoomReset.addEventListener("click", () => viewer.resetZoom());
  btnFitWidth.addEventListener("click", () => viewer.setFitMode("width"));
  btnFitHeight.addEventListener("click", () => viewer.setFitMode("height"));

  btnDualView.addEventListener("click", () => {
    const isDual = viewer.toggleDualView();
    btnDualView.classList.toggle("active", isDual);
    btnDualView.title = isDual ? "Переключить в 1 страницу" : "Переключить в 2 страницы (разворот)";
  });

  // 5. Navigation Events
  btnPrev.addEventListener("click", () => viewer.prevPage());
  btnNext.addEventListener("click", () => viewer.nextPage());

  pageInput.addEventListener("change", () => {
    viewer.goToPage(pageInput.value);
  });
  pageInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") viewer.goToPage(pageInput.value);
  });

  pageSlider.addEventListener("input", () => {
    viewer.goToPage(pageSlider.value);
  });

  // 6. Sidebar toggles
  btnToggleToc.addEventListener("click", () => {
    sidebarToc.classList.toggle("collapsed");
    setTimeout(() => viewer.applyFitMode(), 250);
  });

  btnToggleTasks.addEventListener("click", () => {
    panelTasks.classList.toggle("collapsed");
    setTimeout(() => viewer.applyFitMode(), 250);
  });

  // 7. Search in TOC
  tocSearch.addEventListener("input", () => {
    renderTOC(tocSearch.value);
    highlightTocItem(viewer.currentPage);
  });

  // 8. Bookmarks logic
  btnBookmark.addEventListener("click", () => {
    const p = viewer.currentPage;
    const idx = bookmarks.indexOf(p);
    if (idx > -1) {
      bookmarks.splice(idx, 1);
    } else {
      bookmarks.push(p);
      bookmarks.sort((a, b) => a - b);
    }
    localStorage.setItem("ege_phys_bookmarks_v1", JSON.stringify(bookmarks));
    updateBookmarkButton(p);
  });

  function updateBookmarkButton(pno) {
    const isBookmarked = bookmarks.includes(pno);
    btnBookmark.classList.toggle("bookmarked", isBookmarked);
    btnBookmark.title = isBookmarked ? "Удалить страницу из закладок" : "Добавить страницу в закладки";
  }

  // 9. Answer Modal Viewer (split preview of solutions from p.424-488)
  function openAnswerModal(ansPage) {
    modalAnswerTitle.textContent = `Официальный лист ответов и решений — Страница ${ansPage}`;
    modalAnswerImg.src = viewer.getPageUrl(ansPage);
    modalAnswer.style.display = "flex";
  }

  btnCloseAnsModal.addEventListener("click", () => {
    modalAnswer.style.display = "none";
  });
  modalAnswer.addEventListener("click", (e) => {
    if (e.target === modalAnswer) modalAnswer.style.display = "none";
  });

  // 10. Parent / Teacher Mode Toggle
  if (Auth.getRole() === 'admin') {
    btnParentMode.addEventListener("click", () => {
      taskEngine.setParentMode(!taskEngine.isParentMode);
      btnParentMode.classList.toggle("active", taskEngine.isParentMode);
      btnParentMode.textContent = taskEngine.isParentMode ? "👁️ Режим родителя: ВКЛ" : "🎓 Режим ученика";
    });
  } else {
    btnParentMode.style.display = 'none';
  }

  // 11. Dark / Light Theme
  const savedTheme = localStorage.getItem("ege_phys_theme") || "dark";
  document.documentElement.setAttribute("data-theme", savedTheme);
  updateThemeIcon(savedTheme);

  btnThemeToggle.addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme") || "dark";
    const next = current === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("ege_phys_theme", next);
    updateThemeIcon(next);
  });

  function updateThemeIcon(theme) {
    btnThemeToggle.textContent = theme === "dark" ? "☀️" : "🌙";
    btnThemeToggle.title = theme === "dark" ? "Включить светлую тему" : "Включить тёмную тему";
  }

  // 12. Stats & Progress UI
  function updateStatsUI(stats) {
    if (stats.attempted === 0) {
      statsBadge.textContent = "Решено: 0";
    } else {
      statsBadge.textContent = `Решено: ${stats.correct}/${stats.attempted} (${stats.accuracy}%)`;
    }
  }

  btnStats.addEventListener("click", () => {
    const stats = taskEngine.getProgressStats();
    document.getElementById("stat-total-attempted").textContent = stats.attempted;
    document.getElementById("stat-total-correct").textContent = stats.correct;
    document.getElementById("stat-total-partial").textContent = stats.partial;
    document.getElementById("stat-accuracy").textContent = `${stats.accuracy}%`;

    // Render bookmarks list inside stats
    const bkmListEl = document.getElementById("stats-bookmarks-list");
    if (bookmarks.length === 0) {
      bkmListEl.innerHTML = `<span class="empty-note">Закладок пока нет</span>`;
    } else {
      bkmListEl.innerHTML = bookmarks
        .map(
          (b) => `
        <button class="badge-bookmark" data-goto="${b}">Стр. ${b}</button>
      `
        )
        .join(" ");
      bkmListEl.querySelectorAll("[data-goto]").forEach((bBtn) => {
        bBtn.addEventListener("click", () => {
          viewer.goToPage(parseInt(bBtn.getAttribute("data-goto"), 10));
          modalStats.style.display = "none";
        });
      });
    }

    modalStats.style.display = "flex";
  });

  btnCloseStatsModal.addEventListener("click", () => {
    modalStats.style.display = "none";
  });
  modalStats.addEventListener("click", (e) => {
    if (e.target === modalStats) modalStats.style.display = "none";
  });

  // Export / Import progress
  document.getElementById("btn-export-progress").addEventListener("click", () => {
    const dataStr = taskEngine.exportData();
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ege_phys_progress_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });

  document.getElementById("btn-import-progress").addEventListener("click", () => {
    document.getElementById("input-import-file").click();
  });

  document.getElementById("input-import-file").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const ok = taskEngine.importData(evt.target.result);
      if (ok) {
        alert("Прогресс успешно загружен!");
      } else {
        alert("Ошибка импорта файла.");
      }
    };
    reader.readAsText(file);
  });

  document.getElementById("btn-reset-progress").addEventListener("click", () => {
    if (confirm("Вы уверены, что хотите сбросить все результаты и очистить ответы?")) {
      taskEngine.resetAllProgress();
      alert("Прогресс сброшен.");
      modalStats.style.display = "none";
    }
  });

  // 13. Wi-Fi Local Share Modal
  btnShareWifi.addEventListener("click", () => {
    modalShare.style.display = "flex";
  });
  btnCloseShareModal.addEventListener("click", () => {
    modalShare.style.display = "none";
  });
  modalShare.addEventListener("click", (e) => {
    if (e.target === modalShare) modalShare.style.display = "none";
  });

  // 14. Keyboard Shortcuts
  window.addEventListener("keydown", (e) => {
    // If active in an input/textarea, don't trigger global shortcuts
    const tag = document.activeElement ? document.activeElement.tagName.toLowerCase() : "";
    if (tag === "input" || tag === "textarea") return;

    if (e.key === "ArrowLeft" || e.key === "PageUp") {
      e.preventDefault();
      viewer.prevPage();
    } else if (e.key === "ArrowRight" || e.key === "PageDown") {
      e.preventDefault();
      viewer.nextPage();
    } else if (e.key === "Home") {
      e.preventDefault();
      viewer.goToPage(1);
    } else if (e.key === "End") {
      e.preventDefault();
      viewer.goToPage(totalBookPages);
    } else if (e.key === "d" || e.key === "в") {
      btnDualView.click();
    } else if (e.key === "+" || e.key === "=") {
      viewer.zoomIn();
    } else if (e.key === "-") {
      viewer.zoomOut();
    } else if (e.key === "0") {
      viewer.resetZoom();
    } else if (e.key === "Escape") {
      modalAnswer.style.display = "none";
      modalStats.style.display = "none";
      modalShare.style.display = "none";
    }
  });

  // Initial render
  renderTOC();
  taskEngine.renderPageTasks(viewer.currentPage);
  updateStatsUI(taskEngine.getProgressStats());
  onPageUpdated(viewer.currentPage);

  // User Menu
  const btnUserMenu = document.getElementById('btn-user-menu');
  const userMenu = document.getElementById('user-menu');
  btnUserMenu.addEventListener('click', (e) => {
    e.stopPropagation();
    userMenu.classList.toggle('active');
  });
  document.addEventListener('click', () => userMenu.classList.remove('active'));

  // Fill User Info
  document.getElementById('user-menu-name').textContent = localStorage.getItem('userName') || 'Ученик';
  document.getElementById('user-avatar').textContent = (localStorage.getItem('userName') || 'У')[0];
});
