/**
 * EGE Physics Interactive Manual - Tasks & Answer Engine
 * Handles answer input, fuzzy validation, hints, solutions, and local persistence.
 */

class TaskEngine {
  constructor(options) {
    this.container = options.container;
    this.role = options.role || 'student';
    this.answersData = window.EGE_ANSWERS || { page_tasks: {}, physics_hints: {} };
    this.tocData = window.EGE_TOC || [];
    this.currentPage = 1;
    this.isParentMode = false;
    this.storageKey = "ege_phys_progress_v1";
    this.notesKey = "ege_phys_notes_v1";
    this.customTasksKey = "ege_phys_custom_tasks_v1";

    this.progress = this.loadStorage(this.storageKey, {});
    this.notes = this.loadStorage(this.notesKey, {});
    this.customTasks = this.loadStorage(this.customTasksKey, {});

    this.onProgressUpdate = options.onProgressUpdate || (() => {});
    this.onOpenAnswerPage = options.onOpenAnswerPage || (() => {});
  }

  loadStorage(key, fallback) {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : fallback;
    } catch (e) {
      console.warn("LocalStorage load error:", e);
      return fallback;
    }
  }

  saveStorage(key, val) {
    try {
      localStorage.setItem(key, JSON.stringify(val));
    } catch (e) {
      console.warn("LocalStorage save error:", e);
    }
  }

  setParentMode(enabled) {
    this.isParentMode = enabled;
    this.renderPageTasks(this.currentPage);
  }

  /**
   * Find topic and corresponding answer page for a given book page number
   */
  getSectionForPage(pageNumber) {
    const p = parseInt(pageNumber, 10);
    for (const section of this.tocData) {
      if (p >= section.start && p <= section.end) {
        // Look inside sub-items
        if (section.items) {
          for (const item of section.items) {
            if (item.sub) {
              for (const subItem of item.sub) {
                if (subItem.page === p) {
                  return { section, item, subItem, ans_page: item.ans_page || section.ans_page };
                }
              }
            }
            if (item.page === p || (item.end && p >= item.page && p <= item.end)) {
              return { section, item, ans_page: item.ans_page || section.ans_page };
            }
          }
        }
        return { section, ans_page: section.ans_page };
      }
    }
    return { section: null, ans_page: 425 };
  }

  /**
   * Normalize answer string for comparison
   */
  normalizeAnswer(str) {
    if (str === null || str === undefined) return "";
    let s = String(str).trim().toLowerCase();
    // Normalize dashes & minuses
    s = s.replace(/[−—–]/g, "-");
    // Normalize decimal separators (both commas and dots to dot)
    s = s.replace(/,/g, ".");
    // Remove extra spaces inside numbers or lists
    s = s.replace(/\s+/g, "");
    return s;
  }

  /**
   * Check if student answer matches reference answer
   */
  checkAnswer(userAns, expectedAns, taskType = "number") {
    const u = this.normalizeAnswer(userAns);
    const e = this.normalizeAnswer(expectedAns);

    if (!u) return { isCorrect: false, score: 0, message: "Введите ответ" };

    // Direct match
    if (u === e) {
      return { isCorrect: true, score: 2, message: "Верно! Отличный результат!" };
    }

    // Try numeric tolerance (e.g. 0.25 vs 0.250 or float rounding)
    const numU = parseFloat(u);
    const numE = parseFloat(e);
    if (!isNaN(numU) && !isNaN(numE) && Math.abs(numU - numE) < 1e-4) {
      return { isCorrect: true, score: 2, message: "Верно!" };
    }

    // Choice / matching comparison (e.g. order of digits)
    if (taskType === "choice" || taskType === "matching") {
      // If student digits match expected digits set
      const uSorted = u.split("").sort().join("");
      const eSorted = e.split("").sort().join("");
      if (uSorted === eSorted) {
        return { isCorrect: true, score: 2, message: "Верно!" };
      }

      // Check partial credit (1 mistake = 1 point in exam)
      const uSet = new Set(u.split(""));
      const eSet = new Set(e.split(""));
      let common = 0;
      for (const char of uSet) {
        if (eSet.has(char)) common++;
      }
      if (common >= eSet.size - 1 && uSet.size <= eSet.size + 1 && common > 0) {
        return { isCorrect: false, isPartial: true, score: 1, message: "Частично верно (1 ошибка)" };
      }
    }

    return { isCorrect: false, score: 0, message: "Неверно. Попробуйте ещё раз или воспользуйтесь подсказкой!" };
  }

  /**
   * Render task panel for current page
   */
  renderPageTasks(pageNumber) {
    this.currentPage = pageNumber;
    const secInfo = this.getSectionForPage(pageNumber);
    const pageTasksData = this.answersData.page_tasks[String(pageNumber)];
    const customTasksData = this.customTasks[String(pageNumber)] || [];

    const ansPage = (pageTasksData && pageTasksData.ans_page) || (secInfo && secInfo.ans_page) || 425;
    const sectionTitle = secInfo && secInfo.section ? secInfo.section.title : "Раздел пособия";
    const topicTitle = (secInfo && secInfo.item && secInfo.item.title) || (pageTasksData && pageTasksData.title) || `Страница ${pageNumber}`;

    let html = `
      <div class="tasks-panel-header">
        <div class="tasks-topic-meta">
          <span class="tasks-badge-section">${sectionTitle}</span>
          <h3 class="tasks-topic-title">${topicTitle}</h3>
        </div>
        <div class="tasks-quick-actions">
          ${this.role === 'admin' ? `
          <button class="btn-action-ans" id="btn-open-ans-page" title="Открыть официальный лист ответов и решений к этой теме">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
            <span>Ответы к теме (стр. ${ansPage})</span>
          </button>
          ` : ''}
        </div>
      </div>
    `;

    // Tasks list
    html += `<div class="tasks-list" id="tasks-list-container">`;

    let totalTasks = 0;

    // Render registered page tasks
    if (pageTasksData && pageTasksData.tasks && pageTasksData.tasks.length > 0) {
      totalTasks += pageTasksData.tasks.length;
      pageTasksData.tasks.forEach((task) => {
        html += this.renderTaskCard(task, pageNumber);
      });
    }

    // Render custom user-added tasks for this page
    if (customTasksData.length > 0) {
      totalTasks += customTasksData.length;
      customTasksData.forEach((task) => {
        html += this.renderTaskCard(task, pageNumber, true);
      });
    }

    if (totalTasks === 0) {
      // Empty state with friendly quick-add
      html += `
        <div class="tasks-empty-state">
          <div class="empty-icon">📝</div>
          <h4>Активные поля для этой страницы</h4>
          <p>На этой странице можно решать задачи и сразу записывать ответы для проверки.</p>
          <div class="quick-add-box">
            <button class="btn btn-secondary btn-sm" id="btn-add-quick-task">
              <span>+ Добавить поле для Задания</span>
            </button>
          </div>
        </div>
      `;
    } else {
      // Button to add more tasks
      html += `
        <div class="add-task-row">
          <button class="btn btn-outline btn-sm" id="btn-add-quick-task">
            <span>+ Добавить еще одно задание на эту страницу</span>
          </button>
        </div>
      `;
    }

    html += `</div>`; // .tasks-list

    // Physics formulas / hints for the current section
    const hintsList = this.getHintsForSection(secInfo);
    if (hintsList && hintsList.length > 0) {
      html += `
        <div class="hints-accordion">
          <details class="hints-details">
            <summary class="hints-summary">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
              <span>Полезные формулы к этому разделу</span>
            </summary>
            <div class="hints-content">
              ${hintsList
                .map(
                  (h) => `
                <div class="hint-item">
                  <div class="hint-name">${h.name}</div>
                  <code class="hint-formula">${h.formula}</code>
                </div>
              `
                )
                .join("")}
            </div>
          </details>
        </div>
      `;
    }

    // Student notes / scratchpad for this page
    const pageNote = this.notes[String(pageNumber)] || "";
    html += `
      <div class="page-notes-card">
        <div class="notes-header">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          <span>Черновик и заметки к странице ${pageNumber}</span>
        </div>
        <textarea class="notes-textarea" id="page-note-input" placeholder="Запишите промежуточные расчеты, формулы или мысли...">${pageNote}</textarea>
      </div>
    `;

    this.container.innerHTML = html;
    this.bindTaskEvents(pageNumber, ansPage);
  }

  renderTaskCard(task, pageNumber, isCustom = false) {
    const saved = this.progress[task.id] || {};
    const userVal = saved.userAns || "";
    const isDone = saved.isDone || false;
    const isCorrect = saved.isCorrect || false;
    const isPartial = saved.isPartial || false;
    const attempts = saved.attempts || 0;

    let statusClass = "";
    let statusBadge = "";
    if (isDone) {
      if (isCorrect) {
        statusClass = "task-correct";
        statusBadge = `<span class="badge-status badge-success">✓ Верно!</span>`;
      } else if (isPartial) {
        statusClass = "task-partial";
        statusBadge = `<span class="badge-status badge-warning">~ Частично верно</span>`;
      } else {
        statusClass = "task-wrong";
        statusBadge = `<span class="badge-status badge-danger">✕ Неверно</span>`;
      }
    }

    const showAnswer = this.isParentMode || (isDone && !isCorrect && attempts >= 3);

    return `
      <div class="task-card ${statusClass}" data-task-id="${task.id}">
        <div class="task-card-header">
          <div class="task-title-wrap">
            <span class="task-badge-num">№ ${task.num}</span>
            <span class="task-type-label">${this.getTaskTypeLabel(task.type)}</span>
          </div>
          <div class="task-status-wrap">
            ${statusBadge}
            ${isCustom ? `<button class="btn-del-custom" data-del-id="${task.id}" title="Удалить поле">×</button>` : ""}
          </div>
        </div>

        <div class="task-card-body">
          <div class="task-input-group">
            <input 
              type="text" 
              class="task-input-field" 
              data-task-id="${task.id}" 
              placeholder="Введите ответ (число или цифры)..." 
              value="${userVal}"
              autocomplete="off"
              spellcheck="false"
            />
            <button class="btn-check-task" data-task-id="${task.id}">Проверить</button>
          </div>

          <div class="task-feedback" id="feedback-${task.id}">
            ${saved.message ? `<div class="feedback-msg">${saved.message}</div>` : ""}
          </div>

          ${
            showAnswer && task.ans
              ? `
            <div class="task-revealed-answer">
              <span class="lbl-ans">Правильный ответ:</span>
              <strong class="val-ans">${task.ans}</strong>
            </div>
          `
              : ""
          }

          ${
            task.hint
              ? `
            <div class="task-hint-box">
              <button class="btn-toggle-hint" data-hint-id="${task.id}">
                💡 Подсказка
              </button>
              <div class="hint-text" id="hint-text-${task.id}" style="display: none;">
                ${task.hint}
              </div>
            </div>
          `
              : ""
          }
        </div>
      </div>
    `;
  }

  getTaskTypeLabel(type) {
    switch (type) {
      case "choice":
        return "Выбор утверждений";
      case "matching":
        return "Соответствие";
      case "solution":
        return "Развернутый ответ";
      case "number":
      default:
        return "Краткий ответ";
    }
  }

  getHintsForSection(secInfo) {
    if (!secInfo || !secInfo.section) return [];
    const secId = secInfo.section.id;
    if (secId === "part1") return this.answersData.physics_hints.mechanics || [];
    if (secId === "part2") return this.answersData.physics_hints.thermal || [];
    if (secId === "part3") return this.answersData.physics_hints.electrodynamics || [];
    if (secId === "part4") return this.answersData.physics_hints.optics_quantum || [];
    return this.answersData.physics_hints.mechanics || [];
  }

  bindTaskEvents(pageNumber, ansPage) {
    // Open answer page button
    const btnAns = this.container.querySelector("#btn-open-ans-page");
    if (btnAns) {
      btnAns.addEventListener("click", () => {
        this.onOpenAnswerPage(ansPage);
      });
    }

    // Check task buttons
    const checkBtns = this.container.querySelectorAll(".btn-check-task");
    checkBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        const taskId = btn.getAttribute("data-task-id");
        this.handleTaskCheck(taskId, pageNumber);
      });
    });

    // Enter key inside inputs
    const inputs = this.container.querySelectorAll(".task-input-field");
    inputs.forEach((input) => {
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          const taskId = input.getAttribute("data-task-id");
          this.handleTaskCheck(taskId, pageNumber);
        }
      });
    });

    // Toggle hint buttons
    const hintBtns = this.container.querySelectorAll(".btn-toggle-hint");
    hintBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        const taskId = btn.getAttribute("data-hint-id");
        const hintEl = this.container.querySelector(`#hint-text-${taskId}`);
        if (hintEl) {
          hintEl.style.display = hintEl.style.display === "none" ? "block" : "none";
        }
      });
    });

    // Quick add task
    const addBtn = this.container.querySelector("#btn-add-quick-task");
    if (addBtn) {
      addBtn.addEventListener("click", () => {
        this.promptAddCustomTask(pageNumber);
      });
    }

    // Delete custom task
    const delBtns = this.container.querySelectorAll(".btn-del-custom");
    delBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        const delId = btn.getAttribute("data-del-id");
        this.removeCustomTask(delId, pageNumber);
      });
    });

    // Page notes auto-save
    const noteEl = this.container.querySelector("#page-note-input");
    if (noteEl) {
      noteEl.addEventListener("input", () => {
        this.notes[String(pageNumber)] = noteEl.value;
        this.saveStorage(this.notesKey, this.notes);
      });
    }
  }

  handleTaskCheck(taskId, pageNumber) {
    const input = this.container.querySelector(`.task-input-field[data-task-id="${taskId}"]`);
    if (!input) return;

    const userAns = input.value.trim();
    if (!userAns) {
      input.focus();
      return;
    }

    // Find task definition
    const taskDef = this.findTaskDefinition(taskId, pageNumber);
    if (!taskDef) return;

    const res = this.checkAnswer(userAns, taskDef.ans, taskDef.type);
    const prevSaved = this.progress[taskId] || { attempts: 0 };
    const newAttempts = (prevSaved.attempts || 0) + 1;

    this.progress[taskId] = {
      userAns,
      isDone: true,
      isCorrect: res.isCorrect,
      isPartial: res.isPartial || false,
      score: res.score,
      message: res.message,
      attempts: newAttempts,
      page: pageNumber,
      updatedAt: Date.now()
    };

    this.saveStorage(this.storageKey, this.progress);
    this.renderPageTasks(pageNumber);
    this.onProgressUpdate(this.getProgressStats());
    this.syncProgress(this.progress[taskId], taskId);
  }

  async syncProgress(progressItem, taskId) {
    const token = Auth.getToken();
    if (!token) return;
    try {
      await fetch('/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          progress: [{
            subject_id: 'physics',
            task_id: taskId,
            answer: progressItem.userAns,
            is_correct: progressItem.isCorrect
          }]
        })
      });
    } catch (e) {
      console.error("Sync failed:", e);
    }
  }

  findTaskDefinition(taskId, pageNumber) {
    const pageTasksData = this.answersData.page_tasks[String(pageNumber)];
    if (pageTasksData && pageTasksData.tasks) {
      const found = pageTasksData.tasks.find((t) => t.id === taskId);
      if (found) return found;
    }
    const customs = this.customTasks[String(pageNumber)] || [];
    return customs.find((t) => t.id === taskId) || null;
  }

  promptAddCustomTask(pageNumber) {
    const num = prompt("Введите номер задания (например, 1, 5 или 14):", "");
    if (!num) return;
    const ans = prompt("Введите эталонный ответ (или оставьте пустым для самопроверки):", "");

    const newId = `custom_${pageNumber}_${Date.now()}`;
    if (!this.customTasks[String(pageNumber)]) {
      this.customTasks[String(pageNumber)] = [];
    }
    this.customTasks[String(pageNumber)].push({
      id: newId,
      num: num.trim(),
      ans: ans ? ans.trim() : "",
      type: "number",
      hint: "Проверьте формулы в блоке подсказок ниже."
    });

    this.saveStorage(this.customTasksKey, this.customTasks);
    this.renderPageTasks(pageNumber);
  }

  removeCustomTask(taskId, pageNumber) {
    const arr = this.customTasks[String(pageNumber)];
    if (arr) {
      this.customTasks[String(pageNumber)] = arr.filter((t) => t.id !== taskId);
      this.saveStorage(this.customTasksKey, this.customTasks);
      delete this.progress[taskId];
      this.saveStorage(this.storageKey, this.progress);
      this.renderPageTasks(pageNumber);
      this.onProgressUpdate(this.getProgressStats());
    }
  }

  getProgressStats() {
    let attempted = 0;
    let correct = 0;
    let partial = 0;

    for (const key in this.progress) {
      const item = this.progress[key];
      if (item.isDone) {
        attempted++;
        if (item.isCorrect) correct++;
        else if (item.isPartial) partial++;
      }
    }

    const accuracy = attempted > 0 ? Math.round(((correct + partial * 0.5) / attempted) * 100) : 0;
    return { attempted, correct, partial, accuracy };
  }

  resetAllProgress() {
    this.progress = {};
    this.saveStorage(this.storageKey, this.progress);
    this.renderPageTasks(this.currentPage);
    this.onProgressUpdate(this.getProgressStats());
  }

  exportData() {
    return JSON.stringify(
      {
        progress: this.progress,
        notes: this.notes,
        customTasks: this.customTasks,
        exportDate: new Date().toISOString()
      },
      null,
      2
    );
  }

  importData(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      if (data.progress) this.progress = data.progress;
      if (data.notes) this.notes = data.notes;
      if (data.customTasks) this.customTasks = data.customTasks;

      this.saveStorage(this.storageKey, this.progress);
      this.saveStorage(this.notesKey, this.notes);
      this.saveStorage(this.customTasksKey, this.customTasks);

      this.renderPageTasks(this.currentPage);
      this.onProgressUpdate(this.getProgressStats());
      return true;
    } catch (e) {
      console.error("Import error:", e);
      return false;
    }
  }
}

window.TaskEngine = TaskEngine;
