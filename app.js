const STORAGE_KEY = "goal-forge-v2";
const LEGACY_STORAGE_KEY = "goal-forge-v1";
const THEME_KEY = "goal-forge-theme-v1";
const HABIT_COMPLETION_WINDOW_DAYS = 30;
const STAGE_COMPLETION_WINDOW_DAYS = 30;
const TIMEBLOCK_START_HOUR = 6;
const TIMEBLOCK_END_HOUR = 22;
const TIMEBLOCK_STEP_MINUTES = 15;
const TIMEBLOCK_MIN_DURATION_MINUTES = 30;
const TIMEBLOCK_DEFAULT_DURATION_MINUTES = 45;
const TIMEBLOCK_HOUR_HEIGHT = 34;
const TIMEBLOCK_TOTAL_MINUTES = (TIMEBLOCK_END_HOUR - TIMEBLOCK_START_HOUR) * 60;
const CALENDAR_WEEKDAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sab", "Dom"];
const COLOR_POOL = ["#111111", "#262626", "#3a3a3a", "#4d4d4d", "#616161", "#757575"];
const LIGHT_CHART_THEME = {
  accent: "#111111",
  accentLine: "#262626",
  accentFill: "rgba(17, 17, 17, 0.2)",
  point: "#383838",
  remainder: "rgba(96, 96, 96, 0.25)",
  tooltipBg: "rgba(255, 255, 255, 0.98)",
  tooltipBorder: "rgba(44, 44, 44, 0.28)",
  tooltipText: "#191919",
  axis: "#484848",
  grid: "rgba(58, 58, 58, 0.16)",
};
const DARK_CHART_THEME = {
  accent: "#f2f2f2",
  accentLine: "#d0d0d0",
  accentFill: "rgba(242, 242, 242, 0.24)",
  point: "#ffffff",
  remainder: "rgba(255, 255, 255, 0.22)",
  tooltipBg: "rgba(34, 34, 34, 0.98)",
  tooltipBorder: "rgba(255, 255, 255, 0.24)",
  tooltipText: "#f1f1f1",
  axis: "#d7d7d7",
  grid: "rgba(255, 255, 255, 0.18)",
};

const state = loadState();
const charts = {};
const route = {
  view: "dashboard",
  goalId: null,
  stageId: null,
};
let timeblockInteraction = null;
let draggedGoalId = null;


const elements = {
  navDashboard: document.getElementById("nav-dashboard"),
  navGoals: document.getElementById("nav-goals"),
  themeToggle: document.getElementById("theme-toggle"),
  form: document.getElementById("item-form"),
  nameInput: document.getElementById("item-name"),
  typeInput: document.getElementById("item-type"),
  dailyChecklistForm: document.getElementById("daily-checklist-form"),
  dailyChecklistInput: document.getElementById("daily-checklist-input"),
  todayList: document.getElementById("today-list"),
  weeklyTable: document.getElementById("weekly-table"),
  todayLabel: document.getElementById("today-label"),
  calendarGrid: document.getElementById("calendar-grid"),
  calendarMonthLabel: document.getElementById("calendar-month-label"),
  calendarPrev: document.getElementById("calendar-prev"),
  calendarNext: document.getElementById("calendar-next"),
  statToday: document.getElementById("stat-today"),
  statWeek: document.getElementById("stat-week"),
  statStreak: document.getElementById("stat-streak"),
  statProjects: document.getElementById("stat-projects"),
  seedButton: document.getElementById("seed-button"),
  clearButton: document.getElementById("clear-button"),
  completionNumber: document.getElementById("completion-number"),
  dailyChecklistPieCanvas: document.getElementById("daily-checklist-pie-chart"),
  dailyChecklistPieNumber: document.getElementById("daily-checklist-pie-number"),
  timeblockHours: document.getElementById("timeblock-hours"),
  timeblockLane: document.getElementById("timeblock-lane"),
  dailyCanvas: document.getElementById("daily-chart"),
  weeklyCanvas: document.getElementById("weekly-chart"),
  completionCanvas: document.getElementById("completion-chart"),
  goalsList: document.getElementById("goals-list"),
  goalBackButton: document.getElementById("goal-back-button"),
  goalRemoveButton: document.getElementById("goal-remove-button"),
  goalDetailTitle: document.getElementById("goal-detail-title"),
  goalDetailSubtitle: document.getElementById("goal-detail-subtitle"),
  goalChecklistForm: document.getElementById("goal-checklist-form"),
  goalChecklistInput: document.getElementById("goal-checklist-input"),
  goalChecklistList: document.getElementById("goal-checklist-list"),
  stageForm: document.getElementById("stage-form"),
  stageNameInput: document.getElementById("stage-name-input"),
  stagesList: document.getElementById("stages-list"),
  goalStageCanvas: document.getElementById("goal-stage-chart"),
  goalWeeklyCanvas: document.getElementById("goal-weekly-chart"),
  goalCompletionCanvas: document.getElementById("goal-completion-chart"),
  goalCompletionNumber: document.getElementById("goal-completion-number"),
  weeklyPrev: document.getElementById("weekly-prev"),
  weeklyNext: document.getElementById("weekly-next"),
  stageBackButton: document.getElementById("stage-back-button"),
  stageTitle: document.getElementById("stage-title"),
  stageParentTitle: document.getElementById("stage-parent-title"),
  stageTodayCheck: document.getElementById("stage-today-check"),
  stageProgressText: document.getElementById("stage-progress-text"),
  stageNotes: document.getElementById("stage-notes"),
  stageChecklistForm: document.getElementById("stage-checklist-form"),
  stageChecklistInput: document.getElementById("stage-checklist-input"),
  stageChecklistList: document.getElementById("stage-checklist-list"),
};

init();

function init() {
  state.weeklyOffsetWeeks = 0;
  loadThemePreference();
  bindEvents();
  pruneOrphanLogs();

  if (!window.location.hash) {
    window.location.hash = "#dashboard";
  } else {
    handleHashChange();
  }

  window.addEventListener("hashchange", handleHashChange);
}

function bindEvents() {
  elements.navDashboard.addEventListener("click", () => {
    window.location.hash = "#dashboard";
  });

  elements.navGoals.addEventListener("click", () => {
    window.location.hash = "#goals";
  });

  if (elements.themeToggle) {
    elements.themeToggle.addEventListener("click", () => {
      const nextTheme = document.body.classList.contains("theme-dark") ? "light" : "dark";
      applyTheme(nextTheme, true);
      renderAll();
    });
  }

  elements.form.addEventListener("submit", (event) => {
    event.preventDefault();
    const name = elements.nameInput.value.trim();
    if (!name) {
      return;
    }

    const type = elements.typeInput.value;
    const color = COLOR_POOL[state.items.length % COLOR_POOL.length];

    if (type === "goal") {
      const goal = createGoalItem(name, color);
      state.items.push(goal);
      elements.form.reset();
      elements.typeInput.value = "habit";
      saveState();
      window.location.hash = `#goal/${encodeURIComponent(goal.id)}`;
      return;
    }

    state.items.push(createHabitItem(name, color));
    elements.form.reset();
    elements.typeInput.value = "habit";
    persistAndRender();
  });

  if (elements.dailyChecklistForm) {
    elements.dailyChecklistForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const text = elements.dailyChecklistInput.value.trim();
      if (!text) {
        return;
      }
      const selectedDate = getSelectedDate();
      ensureDailyChecklist(selectedDate).push({
        id: createId(),
        text,
        done: false,
        createdAt: getLocalISODate(new Date()),
      });
      elements.dailyChecklistInput.value = "";
      persistAndRender();
    });
  }

  elements.todayList.addEventListener("change", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) {
      return;
    }
    if (!target.matches('input[type="checkbox"][data-daily-check-id]')) {
      return;
    }

    const itemId = target.dataset.dailyCheckId;
    if (!itemId) {
      return;
    }

    const selectedDate = getSelectedDate();
    const checklist = ensureDailyChecklist(selectedDate);
    const entry = checklist.find((item) => item.id === itemId);
    if (!entry) {
      return;
    }
    entry.done = target.checked;
    persistAndRender();
  });

  elements.todayList.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }
    if (!target.matches("button[data-remove-daily-check-id]")) {
      return;
    }

    const itemId = target.dataset.removeDailyCheckId;
    if (!itemId) {
      return;
    }

    const selectedDate = getSelectedDate();
    const checklist = ensureDailyChecklist(selectedDate);
    const next = checklist.filter((entry) => entry.id !== itemId);
    state.dailyChecklistsByDate[selectedDate] = next;
    removeTimeBlockEntry(selectedDate, itemId);
    persistAndRender();
  });

  elements.weeklyTable.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLButtonElement)) {
      return;
    }

    if (target.matches(".toggle-day")) {
      const date = target.dataset.date;
      const habitId = target.dataset.habitId;
      if (!date || !habitId) {
        return;
      }
      const checked = isHabitChecked(date, habitId);
      setHabitLog(date, habitId, !checked);
      persistAndRender();
      return;
    }

    if (target.matches(".remove-habit-btn")) {
      const habitId = target.dataset.removeHabitId;
      if (!habitId) {
        return;
      }
      const ok = window.confirm("Deseja remover este habito?");
      if (!ok) {
        return;
      }
      removeItem(habitId);
    }
  });

  if (elements.timeblockLane) {
    elements.timeblockLane.addEventListener("click", handleTimeblockLaneClick);
    elements.timeblockLane.addEventListener("pointerdown", handleTimeblockPointerDown);
  }

  if (elements.calendarGrid) {
    elements.calendarGrid.addEventListener("click", handleCalendarGridClick);
  }
  if (elements.calendarPrev) {
    elements.calendarPrev.addEventListener("click", () => {
      const visible = getVisibleMonthDate();
      setVisibleMonth(formatMonthKey(addMonths(visible, -1)));
      saveState();
      renderAll();
    });
  }
  if (elements.calendarNext) {
    elements.calendarNext.addEventListener("click", () => {
      const visible = getVisibleMonthDate();
      setVisibleMonth(formatMonthKey(addMonths(visible, 1)));
      saveState();
      renderAll();
    });
  }

  elements.seedButton.addEventListener("click", () => {
    if (state.items.length > 0) {
      const ok = window.confirm("Ja existem itens cadastrados. Deseja adicionar o exemplo mesmo assim?");
      if (!ok) {
        return;
      }
    }
    fillExampleData();
    persistAndRender();
  });

  elements.clearButton.addEventListener("click", () => {
    const ok = window.confirm("Isso vai remover todos os dados. Deseja continuar?");
    if (!ok) {
      return;
    }
    state.items = [];
    state.logs = {};
    state.stageLogs = {};
    state.dailyChecklistsByDate = {};
    state.calendarState = createDefaultCalendarState();
    state.timeBlocksByDate = {};
    persistAndRender();
  });

  elements.goalsList.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    const openButton = target.closest("[data-open-goal-id]");
    if (openButton instanceof HTMLElement) {
      const goalId = openButton.dataset.openGoalId;
      if (goalId) {
        window.location.hash = `#goal/${encodeURIComponent(goalId)}`;
      }
    }
  });

  elements.goalBackButton.addEventListener("click", () => {
    window.location.hash = "#goals";
  });

  elements.goalRemoveButton.addEventListener("click", () => {
    if (!route.goalId) {
      return;
    }
    const ok = window.confirm("Deseja remover este objetivo e todas as etapas?");
    if (!ok) {
      return;
    }
    removeItem(route.goalId);
  });

  if (elements.goalChecklistForm && elements.goalChecklistInput) {
    elements.goalChecklistForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const goal = getCurrentGoal();
      if (!goal) {
        return;
      }

      const text = elements.goalChecklistInput.value.trim();
      if (!text) {
        return;
      }

      goal.goalTasks.push({
        id: createId(),
        text,
        done: false,
      });

      elements.goalChecklistInput.value = "";
      persistAndRender();
    });
  }

  if (elements.goalChecklistList) {
    elements.goalChecklistList.addEventListener("change", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement)) {
        return;
      }

      if (!target.matches('input[type="checkbox"][data-goal-task-id]')) {
        return;
      }

      const goal = getCurrentGoal();
      if (!goal) {
        return;
      }

      const taskId = target.dataset.goalTaskId;
      if (!taskId) {
        return;
      }

      const task = goal.goalTasks.find((entry) => entry.id === taskId);
      if (!task) {
        return;
      }

      task.done = target.checked;
      persistAndRender();
    });

    elements.goalChecklistList.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) {
        return;
      }

      if (!target.matches("button[data-remove-goal-task-id]")) {
        return;
      }

      const goal = getCurrentGoal();
      if (!goal) {
        return;
      }

      const taskId = target.dataset.removeGoalTaskId;
      if (!taskId) {
        return;
      }

      goal.goalTasks = goal.goalTasks.filter((entry) => entry.id !== taskId);
      persistAndRender();
    });
  }

  elements.stageForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const goal = getCurrentGoal();
    if (!goal) {
      return;
    }

    const name = elements.stageNameInput.value.trim();
    if (!name) {
      return;
    }

    goal.stages.push(createStage(name));

    elements.stageNameInput.value = "";
    persistAndRender();
  });

  elements.stagesList.addEventListener("change", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) {
      return;
    }
    if (!target.matches('input[type="checkbox"][data-stage-today-id]')) {
      return;
    }

    const goal = getCurrentGoal();
    if (!goal) {
      return;
    }

    const stageId = target.dataset.stageTodayId;
    if (!stageId) {
      return;
    }

    const today = getLocalISODate(new Date());
    setStageLog(today, goal.id, stageId, target.checked);
    persistAndRender();
  });

  elements.stagesList.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    const openButton = target.closest("[data-open-stage-id]");
    if (openButton instanceof HTMLElement) {
      const stageId = openButton.dataset.openStageId;
      if (stageId && route.goalId) {
        window.location.hash = `#goal/${encodeURIComponent(route.goalId)}/stage/${encodeURIComponent(stageId)}`;
      }
      return;
    }

    const removeButton = target.closest("[data-remove-stage-id]");
    if (removeButton instanceof HTMLElement) {
      const stageId = removeButton.dataset.removeStageId;
      if (!stageId || !route.goalId) {
        return;
      }
      const ok = window.confirm("Deseja remover esta etapa?");
      if (!ok) {
        return;
      }
      removeStage(route.goalId, stageId);
    }
  });

  elements.stageBackButton.addEventListener("click", () => {
    if (!route.goalId) {
      window.location.hash = "#goals";
      return;
    }
    window.location.hash = `#goal/${encodeURIComponent(route.goalId)}`;
  });

  elements.stageTodayCheck.addEventListener("change", () => {
    const current = getCurrentGoalAndStage();
    if (!current) {
      return;
    }
    const today = getLocalISODate(new Date());
    setStageLog(today, current.goal.id, current.stage.id, elements.stageTodayCheck.checked);
    persistAndRender();
  });

  elements.stageNotes.addEventListener("input", () => {
    const current = getCurrentGoalAndStage();
    if (!current) {
      return;
    }
    current.stage.notes = elements.stageNotes.value;
    saveState();
  });

  elements.stageChecklistForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const current = getCurrentGoalAndStage();
    if (!current) {
      return;
    }
    const text = elements.stageChecklistInput.value.trim();
    if (!text) {
      return;
    }
    current.stage.checklist.push({
      id: createId(),
      text,
      done: false,
    });
    elements.stageChecklistInput.value = "";
    persistAndRender();
  });

  elements.stageChecklistList.addEventListener("change", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) {
      return;
    }
    if (!target.matches('input[type="checkbox"][data-stage-check-item-id]')) {
      return;
    }

    const current = getCurrentGoalAndStage();
    if (!current) {
      return;
    }

    const itemId = target.dataset.stageCheckItemId;
    if (!itemId) {
      return;
    }

    const item = current.stage.checklist.find((entry) => entry.id === itemId);
    if (!item) {
      return;
    }

    item.done = target.checked;
    persistAndRender();
  });

  elements.stageChecklistList.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }
    if (!target.matches("button[data-remove-stage-check-item-id]")) {
      return;
    }

    const current = getCurrentGoalAndStage();
    if (!current) {
      return;
    }

    const itemId = target.dataset.removeStageCheckItemId;
    if (!itemId) {
      return;
    }

    current.stage.checklist = current.stage.checklist.filter((entry) => entry.id !== itemId);
    persistAndRender();
  });

  if (elements.weeklyPrev) {
    elements.weeklyPrev.addEventListener("click", () => {
      state.weeklyOffsetWeeks -= 1;
      persistAndRender();
    });
  }
  if (elements.weeklyNext) {
    elements.weeklyNext.addEventListener("click", () => {
      state.weeklyOffsetWeeks += 1;
      persistAndRender();
    });
  }
}

function handleHashChange() {
  const parsed = parseHash();
  route.view = parsed.view;
  route.goalId = parsed.goalId || null;
  route.stageId = parsed.stageId || null;

  if (route.view === "goal") {
    const goal = getGoalById(route.goalId);
    if (!goal) {
      window.location.hash = "#goals";
      return;
    }
  }

  if (route.view === "stage") {
    const current = getCurrentGoalAndStage();
    if (!current) {
      if (route.goalId && getGoalById(route.goalId)) {
        window.location.hash = `#goal/${encodeURIComponent(route.goalId)}`;
      } else {
        window.location.hash = "#goals";
      }
      return;
    }
  }

  renderAll();
}

function parseHash() {
  const raw = window.location.hash.replace(/^#/, "").trim();
  if (!raw || raw === "dashboard") {
    return { view: "dashboard" };
  }
  if (raw === "goals") {
    return { view: "goals" };
  }

  const segments = raw.split("/");
  if (segments[0] === "goal" && segments[1]) {
    const goalId = decodeURIComponent(segments[1]);
    if (segments[2] === "stage" && segments[3]) {
      return {
        view: "stage",
        goalId,
        stageId: decodeURIComponent(segments[3]),
      };
    }
    return { view: "goal", goalId };
  }

  return { view: "dashboard" };
}

function loadThemePreference() {
  let theme = localStorage.getItem(THEME_KEY);
  if (theme !== "light" && theme !== "dark") {
    theme = "light";
  }
  applyTheme(theme, false);
}

function applyTheme(theme, savePreference) {
  const isDark = theme === "dark";
  document.body.classList.toggle("theme-dark", isDark);
  document.body.classList.toggle("theme-light", !isDark);

  if (elements.themeToggle) {
    const nextModeLabel = isDark ? "Ativar modo claro" : "Ativar modo escuro";
    elements.themeToggle.textContent = isDark ? "☀" : "☾";
    elements.themeToggle.setAttribute("aria-label", nextModeLabel);
    elements.themeToggle.setAttribute("title", nextModeLabel);
  }

  if (savePreference) {
    localStorage.setItem(THEME_KEY, isDark ? "dark" : "light");
  }
}

function getChartTheme() {
  return document.body.classList.contains("theme-dark") ? DARK_CHART_THEME : LIGHT_CHART_THEME;
}

function renderAll() {
  renderDailyChecklistPieInHero();
  renderGoalsOverview();
  updateNavActiveState();

  if (route.view === "dashboard") {
    showView("view-dashboard");
    renderDashboard();
    destroyChart("goal-stage");
    destroyChart("goal-weekly");
    destroyChart("goal-completion");
    return;
  }

  if (route.view === "goals") {
    showView("view-goals");
    destroyChart("daily");
    destroyChart("weekly");
    destroyChart("completion");
    destroyChart("goal-stage");
    destroyChart("goal-weekly");
    destroyChart("goal-completion");
    return;
  }

  if (route.view === "goal") {
    const goal = getGoalById(route.goalId);
    showView("view-goal-detail");
    renderGoalDetail(goal);
    destroyChart("daily");
    destroyChart("weekly");
    destroyChart("completion");
    return;
  }

  if (route.view === "stage") {
    const current = getCurrentGoalAndStage();
    showView("view-stage-detail");
    renderStageDetail(current.goal, current.stage);
    destroyChart("daily");
    destroyChart("weekly");
    destroyChart("completion");
    destroyChart("goal-stage");
    destroyChart("goal-weekly");
    destroyChart("goal-completion");
    return;
  }

  showView("view-dashboard");
  renderDashboard();
}

function renderDailyChecklistPieInHero() {
  if (!elements.dailyChecklistPieCanvas || !elements.dailyChecklistPieNumber) {
    return;
  }

  ensureCalendarState();
  const selectedDate = getSelectedDate();
  const completion = getDailyChecklistCompletionPercent(selectedDate);
  const chartTheme = getChartTheme();

  elements.dailyChecklistPieNumber.textContent = `${completion}%`;
  upsertChart("daily-checklist-hero-pie", elements.dailyChecklistPieCanvas, {
    type: "doughnut",
    data: {
      labels: ["Concluido", "Restante"],
      datasets: [
        {
          data: [completion, Math.max(0, 100 - completion)],
          backgroundColor: [chartTheme.accent, chartTheme.remainder],
          borderWidth: 0,
          hoverOffset: 2,
        },
      ],
    },
    options: createDoughnutOptions(),
  });
}

function updateNavActiveState() {
  const inGoalsArea = route.view === "goals" || route.view === "goal" || route.view === "stage";
  elements.navDashboard.classList.toggle("active", !inGoalsArea);
  elements.navGoals.classList.toggle("active", inGoalsArea);
}

function showView(viewId) {
  const views = document.querySelectorAll(".view");
  for (const view of views) {
    view.classList.remove("active");
  }
  const element = document.getElementById(viewId);
  if (element) {
    element.classList.add("active");
  }
}

function renderDashboard() {
  const habits = getHabits();
  ensureCalendarState();
  renderDateLabel();
  renderDashboardStats(habits);
  renderDailyChecklist();
  renderTimeBlocking();
  renderHabitCalendar();
  renderHabitsWeeklyTable(habits);
  renderHabitCharts(habits);
}

function renderDateLabel() {
  const selectedDate = parseLocalISODate(getSelectedDate());
  const formatted = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(selectedDate);
  elements.todayLabel.textContent = formatted;
}

function renderDashboardStats(habits) {
  const totalHabits = habits.length;
  const today = getLocalISODate(new Date());
  const todayDone = getHabitDoneCountByDate(today, habits);
  const todayRate = totalHabits > 0 ? Math.round((todayDone / totalHabits) * 100) : 0;
  const weekRate = getHabitWeekRatePercent(habits);
  const streak = getHabitStreak(habits);

  elements.statToday.textContent = `${todayRate}%`;
  elements.statWeek.textContent = `${weekRate}%`;
  elements.statStreak.textContent = `${streak} ${streak === 1 ? "dia" : "dias"}`;
  elements.statProjects.textContent = String(state.items.length);
}

function renderDailyChecklist() {
  const selectedDate = getSelectedDate();
  const checklist = getDailyChecklist(selectedDate);
  elements.todayList.innerHTML = "";

  if (checklist.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "Sem itens para esta data. Adicione atividades para planejar seu dia.";
    elements.todayList.appendChild(empty);
    return;
  }

  for (const item of checklist) {
    const li = document.createElement("li");
    li.className = "task-item";
    li.innerHTML = `
      <div class="task-head">
        <div class="task-left">
          <span class="type-dot" style="background:var(--accent)"></span>
          <div>
            <p class="task-title">${escapeHtml(item.text)}</p>
            <div class="task-meta">${item.done ? "Concluida" : "Pendente"}</div>
          </div>
        </div>
        <div class="task-controls">
          <label class="check-label">
            <input type="checkbox" data-daily-check-id="${item.id}" ${item.done ? "checked" : ""}>
            Feita
          </label>
          <button class="remove-btn" type="button" data-remove-daily-check-id="${item.id}">Remover</button>
        </div>
      </div>
    `;

    elements.todayList.appendChild(li);
  }
}

function renderTimeBlocking() {
  if (!elements.timeblockLane || !elements.timeblockHours) {
    return;
  }

  const laneHeight = timeMinutesToPixels(TIMEBLOCK_TOTAL_MINUTES);
  elements.timeblockHours.style.height = `${laneHeight}px`;
  elements.timeblockLane.style.height = `${laneHeight}px`;

  const hourLabels = [];
  const hourLines = [];
  for (let hour = TIMEBLOCK_START_HOUR; hour <= TIMEBLOCK_END_HOUR; hour += 1) {
    const offsetMinutes = (hour - TIMEBLOCK_START_HOUR) * 60;
    const top = timeMinutesToPixels(offsetMinutes);
    hourLabels.push(`<span class="time-hour-label" style="top:${top}px">${String(hour).padStart(2, "0")}:00</span>`);
    hourLines.push(`<div class="time-hour-line" style="top:${top}px"></div>`);
  }
  elements.timeblockHours.innerHTML = hourLabels.join("");

  const selectedDate = getSelectedDate();
  const checklist = getDailyChecklist(selectedDate);
  syncTimeBlocksWithDailyChecklist(checklist, selectedDate);

  if (checklist.length === 0) {
    elements.timeblockLane.innerHTML = `
      ${hourLines.join("")}
      <div class="timeblock-empty">Adicione itens no checklist da data para montar o cronograma.</div>
    `;
    return;
  }

  const timeBlocks = getTimeBlocksForDate(selectedDate);
  const blocks = checklist
    .map((item, index) => {
      const block = sanitizeTimeBlock(timeBlocks[item.id], index);
      const top = timeMinutesToPixels(block.startMin);
      const height = timeMinutesToPixels(block.durationMin);
      const startLabel = formatTimeblockClock(block.startMin);
      const endLabel = formatTimeblockClock(block.startMin + block.durationMin);

      return `
        <article class="time-block" data-timeblock-id="${item.id}" style="top:${top}px; height:${height}px; --block-color:var(--accent)">
          <div class="time-block-controls">
            <button class="timeblock-adjust-btn" type="button" data-timeblock-shrink-id="${item.id}" aria-label="Recolher tempo de ${escapeAttribute(item.text)}">-</button>
            <button class="timeblock-adjust-btn" type="button" data-timeblock-expand-id="${item.id}" aria-label="Expandir tempo de ${escapeAttribute(item.text)}">+</button>
          </div>
          <p class="time-block-title">${escapeHtml(item.text)}</p>
          <p class="time-block-time" data-timeblock-range>${startLabel} - ${endLabel}</p>
          <p class="time-block-duration" data-timeblock-duration>${formatDurationMinutes(block.durationMin)}</p>
          <div class="timeblock-resize" data-timeblock-resize-id="${item.id}" aria-hidden="true"></div>
        </article>
      `;
    })
    .join("");

  elements.timeblockLane.innerHTML = `${hourLines.join("")}${blocks}`;
}

function handleTimeblockLaneClick(event) {
  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return;
  }

  const shrinkButton = target.closest("[data-timeblock-shrink-id]");
  if (shrinkButton instanceof HTMLElement) {
    const checklistItemId = shrinkButton.dataset.timeblockShrinkId;
    if (checklistItemId && changeTimeBlockDuration(checklistItemId, -TIMEBLOCK_STEP_MINUTES)) {
      persistAndRender();
    }
    return;
  }

  const expandButton = target.closest("[data-timeblock-expand-id]");
  if (expandButton instanceof HTMLElement) {
    const checklistItemId = expandButton.dataset.timeblockExpandId;
    if (checklistItemId && changeTimeBlockDuration(checklistItemId, TIMEBLOCK_STEP_MINUTES)) {
      persistAndRender();
    }
  }
}

function handleTimeblockPointerDown(event) {
  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return;
  }
  if (target.closest("button")) {
    return;
  }

  const blockElement = target.closest("[data-timeblock-id]");
  if (!(blockElement instanceof HTMLElement)) {
    return;
  }

  const checklistItemId = blockElement.dataset.timeblockId;
  const selectedDate = getSelectedDate();
  const dayBlocks = getTimeBlocksForDate(selectedDate);
  if (!checklistItemId || !dayBlocks[checklistItemId]) {
    return;
  }

  const isResize = target.closest("[data-timeblock-resize-id]") instanceof HTMLElement;
  const block = dayBlocks[checklistItemId];
  timeblockInteraction = {
    pointerId: event.pointerId,
    date: selectedDate,
    checklistItemId,
    mode: isResize ? "resize" : "drag",
    startY: event.clientY,
    initialStartMin: block.startMin,
    initialDurationMin: block.durationMin,
    blockElement,
    moved: false,
  };

  blockElement.classList.add("dragging");
  document.body.classList.add("timeblock-dragging");
  try {
    blockElement.setPointerCapture(event.pointerId);
  } catch (_error) { }
  window.addEventListener("pointermove", handleTimeblockPointerMove);
  window.addEventListener("pointerup", handleTimeblockPointerEnd);
  window.addEventListener("pointercancel", handleTimeblockPointerEnd);
  event.preventDefault();
}

function handleTimeblockPointerMove(event) {
  if (!timeblockInteraction || event.pointerId !== timeblockInteraction.pointerId) {
    return;
  }

  const dayBlocks = getTimeBlocksForDate(timeblockInteraction.date);
  const block = dayBlocks[timeblockInteraction.checklistItemId];
  if (!block) {
    return;
  }

  const deltaY = event.clientY - timeblockInteraction.startY;
  const deltaMinutes = snapMinutes(pixelsToTimeMinutes(deltaY));

  if (timeblockInteraction.mode === "drag") {
    const maxStart = TIMEBLOCK_TOTAL_MINUTES - timeblockInteraction.initialDurationMin;
    const nextStartMin = clampAndSnapMinutes(timeblockInteraction.initialStartMin + deltaMinutes, 0, maxStart);
    if (nextStartMin !== block.startMin) {
      block.startMin = nextStartMin;
      timeblockInteraction.moved = true;
      updateTimeBlockElement(timeblockInteraction.blockElement, block);
    }
    return;
  }

  const maxDuration = TIMEBLOCK_TOTAL_MINUTES - timeblockInteraction.initialStartMin;
  const nextDurationMin = clampAndSnapMinutes(
    timeblockInteraction.initialDurationMin + deltaMinutes,
    TIMEBLOCK_MIN_DURATION_MINUTES,
    maxDuration
  );
  if (nextDurationMin !== block.durationMin) {
    block.durationMin = nextDurationMin;
    timeblockInteraction.moved = true;
    updateTimeBlockElement(timeblockInteraction.blockElement, block);
  }
}

function handleTimeblockPointerEnd(event) {
  if (!timeblockInteraction || event.pointerId !== timeblockInteraction.pointerId) {
    return;
  }

  const interaction = timeblockInteraction;
  timeblockInteraction = null;

  interaction.blockElement.classList.remove("dragging");
  document.body.classList.remove("timeblock-dragging");
  try {
    if (interaction.blockElement.hasPointerCapture(interaction.pointerId)) {
      interaction.blockElement.releasePointerCapture(interaction.pointerId);
    }
  } catch (_error) { }

  window.removeEventListener("pointermove", handleTimeblockPointerMove);
  window.removeEventListener("pointerup", handleTimeblockPointerEnd);
  window.removeEventListener("pointercancel", handleTimeblockPointerEnd);

  if (interaction.moved) {
    saveState();
  }
}

function updateTimeBlockElement(blockElement, block) {
  const top = timeMinutesToPixels(block.startMin);
  const height = timeMinutesToPixels(block.durationMin);
  blockElement.style.top = `${top}px`;
  blockElement.style.height = `${height}px`;

  const range = blockElement.querySelector("[data-timeblock-range]");
  if (range) {
    range.textContent = `${formatTimeblockClock(block.startMin)} - ${formatTimeblockClock(block.startMin + block.durationMin)}`;
  }

  const duration = blockElement.querySelector("[data-timeblock-duration]");
  if (duration) {
    duration.textContent = formatDurationMinutes(block.durationMin);
  }
}

function syncTimeBlocksWithDailyChecklist(checklist, dateIso) {
  const dayBlocks = ensureTimeBlocksForDate(dateIso);
  let changed = false;
  const checklistIds = new Set(checklist.map((item) => item.id));

  for (const checklistId of Object.keys(dayBlocks)) {
    if (!checklistIds.has(checklistId)) {
      delete dayBlocks[checklistId];
      changed = true;
    }
  }

  for (let index = 0; index < checklist.length; index += 1) {
    const item = checklist[index];
    const current = dayBlocks[item.id];
    const normalized = sanitizeTimeBlock(current, index);
    if (!current || current.startMin !== normalized.startMin || current.durationMin !== normalized.durationMin) {
      dayBlocks[item.id] = normalized;
      changed = true;
    }
  }

  if (changed) {
    saveState();
  }
}

function changeTimeBlockDuration(checklistItemId, deltaMinutes) {
  const dayBlocks = getTimeBlocksForDate(getSelectedDate());
  const block = dayBlocks[checklistItemId];
  if (!block) {
    return false;
  }

  const maxDuration = TIMEBLOCK_TOTAL_MINUTES - block.startMin;
  const nextDuration = clampAndSnapMinutes(
    block.durationMin + deltaMinutes,
    TIMEBLOCK_MIN_DURATION_MINUTES,
    maxDuration
  );
  if (nextDuration === block.durationMin) {
    return false;
  }
  block.durationMin = nextDuration;
  return true;
}

function sanitizeTimeBlock(rawBlock, fallbackIndex = 0) {
  const fallback = createDefaultTimeBlock(fallbackIndex);
  if (!rawBlock || typeof rawBlock !== "object") {
    return fallback;
  }

  const rawStart = Number(rawBlock.startMin);
  const rawDuration = Number(rawBlock.durationMin);

  const startMin = clampAndSnapMinutes(
    Number.isFinite(rawStart) ? rawStart : fallback.startMin,
    0,
    TIMEBLOCK_TOTAL_MINUTES - TIMEBLOCK_MIN_DURATION_MINUTES
  );
  const durationMin = clampAndSnapMinutes(
    Number.isFinite(rawDuration) ? rawDuration : fallback.durationMin,
    TIMEBLOCK_MIN_DURATION_MINUTES,
    TIMEBLOCK_TOTAL_MINUTES - startMin
  );

  return { startMin, durationMin };
}

function createDefaultTimeBlock(index) {
  const startMin = clampAndSnapMinutes(
    index * 60,
    0,
    TIMEBLOCK_TOTAL_MINUTES - TIMEBLOCK_MIN_DURATION_MINUTES
  );
  const durationMin = clampAndSnapMinutes(
    TIMEBLOCK_DEFAULT_DURATION_MINUTES,
    TIMEBLOCK_MIN_DURATION_MINUTES,
    TIMEBLOCK_TOTAL_MINUTES - startMin
  );
  return { startMin, durationMin };
}

function timeMinutesToPixels(minutes) {
  return Math.round((minutes / 60) * TIMEBLOCK_HOUR_HEIGHT);
}

function pixelsToTimeMinutes(pixels) {
  return Math.round((pixels / TIMEBLOCK_HOUR_HEIGHT) * 60);
}

function snapMinutes(minutes) {
  return Math.round(minutes / TIMEBLOCK_STEP_MINUTES) * TIMEBLOCK_STEP_MINUTES;
}

function clampAndSnapMinutes(minutes, minMinutes, maxMinutes) {
  return clamp(snapMinutes(minutes), minMinutes, maxMinutes);
}

function formatTimeblockClock(offsetMinutes) {
  const totalMinutes = TIMEBLOCK_START_HOUR * 60 + offsetMinutes;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function formatDurationMinutes(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0 && minutes > 0) {
    return `${hours}h ${minutes}min`;
  }
  if (hours > 0) {
    return `${hours}h`;
  }
  return `${minutes}min`;
}

function renderHabitCalendar() {
  if (!elements.calendarGrid || !elements.calendarMonthLabel) {
    return;
  }

  ensureCalendarState();
  const selectedDate = getSelectedDate();
  const visibleMonthDate = getVisibleMonthDate();
  const monthStart = new Date(visibleMonthDate.getFullYear(), visibleMonthDate.getMonth(), 1);
  const monthEnd = new Date(visibleMonthDate.getFullYear(), visibleMonthDate.getMonth() + 1, 0);
  const firstWeekday = (monthStart.getDay() + 6) % 7;
  const gridStart = addDays(monthStart, -firstWeekday);
  const todayIso = getLocalISODate(new Date());

  elements.calendarMonthLabel.textContent = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
  }).format(visibleMonthDate);

  const parts = [];
  for (const dayName of CALENDAR_WEEKDAYS) {
    parts.push(`<div class="calendar-weekday">${dayName}</div>`);
  }

  for (let i = 0; i < 42; i += 1) {
    const dayDate = addDays(gridStart, i);
    const dayIso = getLocalISODate(dayDate);
    const outside = dayDate < monthStart || dayDate > monthEnd;
    const isSelected = dayIso === selectedDate;
    const isToday = dayIso === todayIso;
    const hasItems = getDailyChecklist(dayIso).length > 0;
    const classes = [
      "calendar-day",
      outside ? "outside" : "",
      isSelected ? "selected" : "",
      isToday ? "today" : "",
      hasItems ? "has-items" : "",
    ]
      .filter(Boolean)
      .join(" ");

    parts.push(
      `<button class="${classes}" type="button" data-calendar-date="${dayIso}" aria-label="Selecionar ${dayIso}">${dayDate.getDate()}</button>`
    );
  }

  elements.calendarGrid.innerHTML = parts.join("");
}

function handleCalendarGridClick(event) {
  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return;
  }
  const button = target.closest("[data-calendar-date]");
  if (!(button instanceof HTMLElement)) {
    return;
  }
  const dateIso = button.dataset.calendarDate;
  if (!dateIso || !isValidISODate(dateIso)) {
    return;
  }
  setSelectedDate(dateIso);
  setVisibleMonth(formatMonthKey(parseLocalISODate(dateIso)));
  saveState();
  renderAll();
}

function renderHabitsWeeklyTable(habits) {
  const currentMonday = startOfWeek(new Date());
  const targetMonday = addDays(currentMonday, state.weeklyOffsetWeeks * 7);
  const targetSunday = addDays(targetMonday, 6);
  const dates = getPastDates(7, getLocalISODate(targetSunday));
  const headerCells = dates
    .map((date) => {
      const label = formatDateShort(date);
      const weekday = formatWeekdayShort(date);
      return `<th><div>${weekday}</div><div>${label}</div></th>`;
    })
    .join("");

  if (habits.length === 0) {
    elements.weeklyTable.innerHTML = `
      <thead>
        <tr>
          <th>Habito</th>
          ${headerCells}
        </tr>
      </thead>
      <tbody>
        <tr>
          <td colspan="8" class="empty-state">Sua matriz semanal de habitos aparece aqui.</td>
        </tr>
      </tbody>
    `;
    return;
  }

  const rows = habits
    .map((habit) => {
      const cells = dates
        .map((date) => {
          const checked = isHabitChecked(date, habit.id);
          return `<td><button class="toggle-day ${checked ? "checked" : ""}" data-habit-id="${habit.id}" data-date="${date}" title="Marcar ${escapeAttribute(
            habit.name
          )} em ${date}" aria-label="Marcar ${escapeAttribute(habit.name)} em ${date}"></button></td>`;
        })
        .join("");

      return `
        <tr>
          <td>
            <div class="row-title">
              <span class="mini-dot" style="background:${habit.color}"></span>
              ${escapeHtml(habit.name)}
              <button class="remove-habit-btn" type="button" data-remove-habit-id="${habit.id}" title="Remover habito" aria-label="Remover habito">&times;</button>
            </div>
          </td>
          ${cells}
        </tr>
      `;
    })
    .join("");

  elements.weeklyTable.innerHTML = `
    <thead>
      <tr>
        <th>Habito</th>
        ${headerCells}
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  `;
}

function renderHabitCharts(habits) {
  renderHabitDailyChart(habits);
  renderHabitWeeklyChart(habits);
  renderHabitCompletionChart(habits);
}

function renderHabitDailyChart(habits) {
  const chartTheme = getChartTheme();
  const dates = getHabitDailyChartDates(habits, 14);
  const labels = dates.map((date) => formatDateShort(date));
  const values = dates.map((date) => getHabitDoneCountByDate(date, habits));
  const maxDaily = values.length > 0 ? Math.max(...values) : 0;
  const yMax = Math.max(1, maxDaily + 1);

  upsertChart("daily", elements.dailyCanvas, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Habitos concluidos",
          data: values,
          backgroundColor: chartTheme.accent,
          borderRadius: 8,
          borderSkipped: false,
        },
      ],
    },
    options: createChartOptions({
      chartTheme,
      suggestedMax: yMax,
      yLabel: "Habitos",
      maxY: yMax,
    }),
  });
}

function renderHabitWeeklyChart(habits) {
  const chartTheme = getChartTheme();
  const weekly = getHabitWeeklySeries(habits, 12);
  const maxWeekly = weekly.values.length > 0 ? Math.max(...weekly.values) : 0;
  const yMax = Math.max(10, Math.min(100, Math.ceil(maxWeekly / 10) * 10 || 10));
  upsertChart("weekly", elements.weeklyCanvas, {
    type: "line",
    data: {
      labels: weekly.labels,
      datasets: [
        {
          label: "% da semana",
          data: weekly.values,
          borderColor: chartTheme.accentLine,
          backgroundColor: chartTheme.accentFill,
          fill: true,
          tension: 0.35,
          pointRadius: 3.5,
          pointHoverRadius: 5,
          pointBackgroundColor: chartTheme.point,
        },
      ],
    },
    options: createChartOptions({
      chartTheme,
      suggestedMax: yMax,
      yLabel: "%",
      maxY: yMax,
    }),
  });
}

function renderHabitCompletionChart(habits) {
  const chartTheme = getChartTheme();
  const completion = getHabitsGlobalCompletion(habits);
  elements.completionNumber.textContent = `${completion}%`;

  upsertChart("completion", elements.completionCanvas, {
    type: "doughnut",
    data: {
      labels: ["Concluido", "Restante"],
      datasets: [
        {
          data: [completion, Math.max(0, 100 - completion)],
          backgroundColor: [chartTheme.accent, chartTheme.remainder],
          borderWidth: 0,
          hoverOffset: 2,
        },
      ],
    },
    options: createDoughnutOptions(),
  });
}

function renderGoalsOverview() {
  const goals = getGoals();
  elements.goalsList.innerHTML = "";

  if (goals.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "Nenhum objetivo ainda. Crie um objetivo no Dashboard e abra aqui para gerenciar etapas.";
    elements.goalsList.appendChild(empty);
    return;
  }

  for (const goal of goals) {
    const completion = getGoalCompletion(goal);
    const doneTasks = goal.goalTasks.filter((entry) => entry.done).length;
    const doneStages = goal.stages.filter((stage) => getStageCompletion(goal.id, stage) >= 100).length;

    const card = document.createElement("article");
    card.className = "goal-card";
    card.draggable = true;
    card.dataset.id = goal.id;

    card.addEventListener("dragstart", handleGoalDragStart);
    card.addEventListener("dragover", handleGoalDragOver);
    card.addEventListener("dragleave", handleGoalDragLeave);
    card.addEventListener("drop", handleGoalDrop);
    card.addEventListener("dragend", handleGoalDragEnd);

    card.innerHTML = `
      <h3>${escapeHtml(goal.name)}</h3>
      <div class="meta">${goal.stages.length} etapas | ${doneStages} concluidas</div>
      <div class="meta">Checklist: ${doneTasks}/${goal.goalTasks.length}</div>
      <div class="progress-track">
        <div class="progress-fill" style="width:${completion}%; background:${goal.color}"></div>
      </div>
      <div class="meta">Progresso total: ${completion}%</div>
      <button class="btn-ghost" type="button" data-open-goal-id="${goal.id}">Abrir objetivo</button>
    `;
    elements.goalsList.appendChild(card);
  }
}

function renderGoalDetail(goal) {
  if (!goal) {
    elements.goalDetailTitle.textContent = "Objetivo nao encontrado";
    elements.goalDetailSubtitle.textContent = "";
    if (elements.goalChecklistList) {
      elements.goalChecklistList.innerHTML = '<li class="empty-state">Selecione um objetivo valido.</li>';
    }
    elements.stagesList.innerHTML = "";
    return;
  }

  elements.goalDetailTitle.textContent = goal.name;
  elements.goalDetailSubtitle.textContent = `${goal.stages.length} etapas`;

  if (elements.goalChecklistList) {
    renderGoalChecklist(goal);
  }
  renderGoalStages(goal);
  renderGoalCharts(goal);
}

function renderGoalChecklist(goal) {
  if (!elements.goalChecklistList) {
    return;
  }
  elements.goalChecklistList.innerHTML = "";

  if (goal.goalTasks.length === 0) {
    const empty = document.createElement("li");
    empty.className = "empty-state";
    empty.textContent = "Sem itens no checklist do objetivo.";
    elements.goalChecklistList.appendChild(empty);
    return;
  }

  for (const task of goal.goalTasks) {
    const li = document.createElement("li");
    li.className = "check-item";
    li.innerHTML = `
      <div class="check-head">
        <label class="check-label">
          <input type="checkbox" data-goal-task-id="${task.id}" ${task.done ? "checked" : ""}>
          ${escapeHtml(task.text)}
        </label>
        <button type="button" class="remove-btn" data-remove-goal-task-id="${task.id}">Remover</button>
      </div>
    `;
    elements.goalChecklistList.appendChild(li);
  }
}

function renderGoalStages(goal) {
  elements.stagesList.innerHTML = "";
  const today = getLocalISODate(new Date());

  if (goal.stages.length === 0) {
    const empty = document.createElement("li");
    empty.className = "empty-state";
    empty.textContent = "Sem etapas ainda. Crie uma etapa para iniciar o planejamento deste objetivo.";
    elements.stagesList.appendChild(empty);
    return;
  }

  for (const stage of goal.stages) {
    const checks = getStageCheckCount(goal.id, stage.id);
    const progress = getStageCompletion(goal.id, stage);
    const checklistDone = stage.checklist.filter((entry) => entry.done).length;
    const checklistTotal = stage.checklist.length;
    const checkedToday = isStageChecked(today, goal.id, stage.id);

    const li = document.createElement("li");
    li.className = "stage-item";
    li.innerHTML = `
      <div class="stage-item-top">
        <div>
          <h4>${escapeHtml(stage.name)}</h4>
          <div class="task-meta">${checks} dias marcados | checklist ${checklistDone}/${checklistTotal}</div>
        </div>
        <span class="hint">${progress}%</span>
      </div>
      <div class="progress-track">
        <div class="progress-fill" style="width:${progress}%; background:${goal.color}"></div>
      </div>
      <div class="stage-actions">
        <label class="check-label">
          <input type="checkbox" data-stage-today-id="${stage.id}" ${checkedToday ? "checked" : ""}>
          Feita hoje
        </label>
        <button class="open-btn" type="button" data-open-stage-id="${stage.id}">Abrir etapa</button>
        <button class="remove-btn" type="button" data-remove-stage-id="${stage.id}">Remover</button>
      </div>
    `;
    elements.stagesList.appendChild(li);
  }
}

function renderGoalCharts(goal) {
  const chartTheme = getChartTheme();
  const completion = getGoalCompletion(goal);
  elements.goalCompletionNumber.textContent = `${completion}%`;

  const stageLabels = goal.stages.map((stage) => stage.name);
  const stageValues = goal.stages.map((stage) => getStageCompletion(goal.id, stage));
  const hasStages = stageLabels.length > 0;

  upsertChart("goal-stage", elements.goalStageCanvas, {
    type: "bar",
    data: {
      labels: hasStages ? stageLabels : ["Sem etapas"],
      datasets: [
        {
          label: "% por etapa",
          data: hasStages ? stageValues : [0],
          backgroundColor: goal.color,
          borderRadius: 8,
          borderSkipped: false,
        },
      ],
    },
    options: createChartOptions({
      chartTheme,
      suggestedMax: 100,
      yLabel: "%",
      maxY: 100,
    }),
  });

  const weekly = getGoalWeeklySeries(goal, 12);
  upsertChart("goal-weekly", elements.goalWeeklyCanvas, {
    type: "line",
    data: {
      labels: weekly.labels,
      datasets: [
        {
          label: "% semanal",
          data: weekly.values,
          borderColor: chartTheme.accentLine,
          backgroundColor: chartTheme.accentFill,
          fill: true,
          tension: 0.35,
          pointRadius: 3.5,
          pointHoverRadius: 5,
          pointBackgroundColor: chartTheme.point,
        },
      ],
    },
    options: createChartOptions({
      chartTheme,
      suggestedMax: 100,
      yLabel: "%",
      maxY: 100,
    }),
  });

  upsertChart("goal-completion", elements.goalCompletionCanvas, {
    type: "doughnut",
    data: {
      labels: ["Concluido", "Restante"],
      datasets: [
        {
          data: [completion, Math.max(0, 100 - completion)],
          backgroundColor: [goal.color, chartTheme.remainder],
          borderWidth: 0,
          hoverOffset: 2,
        },
      ],
    },
    options: createDoughnutOptions(),
  });
}

function renderStageDetail(goal, stage) {
  elements.stageTitle.textContent = stage.name;
  elements.stageParentTitle.textContent = `Objetivo: ${goal.name}`;

  const today = getLocalISODate(new Date());
  elements.stageTodayCheck.checked = isStageChecked(today, goal.id, stage.id);

  const checks = getStageCheckCount(goal.id, stage.id);
  const completion = getStageCompletion(goal.id, stage);
  const checklistDone = stage.checklist.filter((entry) => entry.done).length;
  const checklistTotal = stage.checklist.length;
  elements.stageProgressText.textContent = `${completion}% | dias marcados ${checks} | checklist ${checklistDone}/${checklistTotal}`;

  elements.stageNotes.value = stage.notes || "";
  renderStageChecklist(stage);
}

function renderStageChecklist(stage) {
  elements.stageChecklistList.innerHTML = "";
  if (stage.checklist.length === 0) {
    const empty = document.createElement("li");
    empty.className = "empty-state";
    empty.textContent = "Sem itens ainda nesta etapa.";
    elements.stageChecklistList.appendChild(empty);
    return;
  }

  for (const item of stage.checklist) {
    const li = document.createElement("li");
    li.className = "check-item";
    li.innerHTML = `
      <div class="check-head">
        <label class="check-label">
          <input type="checkbox" data-stage-check-item-id="${item.id}" ${item.done ? "checked" : ""}>
          ${escapeHtml(item.text)}
        </label>
        <button type="button" class="remove-btn" data-remove-stage-check-item-id="${item.id}">Remover</button>
      </div>
    `;
    elements.stageChecklistList.appendChild(li);
  }
}

function removeItem(itemId) {
  const item = state.items.find((entry) => entry.id === itemId);
  if (!item) {
    return;
  }

  state.items = state.items.filter((entry) => entry.id !== itemId);
  removeItemFromHabitLogs(itemId);

  if (item.type === "goal") {
    removeGoalFromStageLogs(item.id);
    if (route.goalId === item.id) {
      saveState();
      window.location.hash = "#goals";
      return;
    }
  }

  persistAndRender();
}

function removeStage(goalId, stageId) {
  const goal = getGoalById(goalId);
  if (!goal) {
    return;
  }
  goal.stages = goal.stages.filter((stage) => stage.id !== stageId);
  removeStageFromLogs(goalId, stageId);

  if (route.view === "stage" && route.goalId === goalId && route.stageId === stageId) {
    saveState();
    window.location.hash = `#goal/${encodeURIComponent(goalId)}`;
    return;
  }

  persistAndRender();
}

function setHabitLog(date, habitId, value) {
  if (!state.logs[date]) {
    state.logs[date] = {};
  }
  if (value) {
    state.logs[date][habitId] = 1;
  } else {
    delete state.logs[date][habitId];
  }
  if (Object.keys(state.logs[date]).length === 0) {
    delete state.logs[date];
  }
}

function isHabitChecked(date, habitId) {
  return Boolean(state.logs[date] && state.logs[date][habitId]);
}

function setStageLog(date, goalId, stageId, value) {
  const key = getStageLogKey(goalId, stageId);
  if (!state.stageLogs[date]) {
    state.stageLogs[date] = {};
  }
  if (value) {
    state.stageLogs[date][key] = 1;
  } else {
    delete state.stageLogs[date][key];
  }
  if (Object.keys(state.stageLogs[date]).length === 0) {
    delete state.stageLogs[date];
  }
}

function isStageChecked(date, goalId, stageId) {
  const key = getStageLogKey(goalId, stageId);
  return Boolean(state.stageLogs[date] && state.stageLogs[date][key]);
}

function getHabitCheckCount(habitId) {
  let count = 0;
  for (const dayLogs of Object.values(state.logs)) {
    if (dayLogs[habitId]) {
      count += 1;
    }
  }
  return count;
}

function getStageCheckCount(goalId, stageId) {
  const key = getStageLogKey(goalId, stageId);
  let count = 0;
  for (const dayLogs of Object.values(state.stageLogs)) {
    if (dayLogs[key]) {
      count += 1;
    }
  }
  return count;
}

function getHabitCompletion(habit, anchorDateIso = getLocalISODate(new Date())) {
  const windowDays = getTrackingWindowDays(habit.createdAt, anchorDateIso, HABIT_COMPLETION_WINDOW_DAYS);
  const dates = getPastDates(windowDays, anchorDateIso);
  let done = 0;
  for (const date of dates) {
    if (isHabitChecked(date, habit.id)) {
      done += 1;
    }
  }
  return clamp(Math.round((done / windowDays) * 100), 0, 100);
}

function getStageCompletion(goalId, stage, anchorDateIso = getLocalISODate(new Date())) {
  const windowDays = getTrackingWindowDays(stage.createdAt, anchorDateIso, STAGE_COMPLETION_WINDOW_DAYS);
  const dates = getPastDates(windowDays, anchorDateIso);
  let done = 0;
  for (const date of dates) {
    if (isStageChecked(date, goalId, stage.id)) {
      done += 1;
    }
  }
  const checkPct = clamp(Math.round((done / windowDays) * 100), 0, 100);
  const checklistTotal = stage.checklist.length;
  if (checklistTotal === 0) {
    return checkPct;
  }
  const checklistDone = stage.checklist.filter((entry) => entry.done).length;
  const checklistPct = Math.round((checklistDone / checklistTotal) * 100);
  return clamp(Math.round((checkPct + checklistPct) / 2), 0, 100);
}

function getGoalCompletion(goal) {
  const stageScores = goal.stages.map((stage) => getStageCompletion(goal.id, stage));
  const hasStages = stageScores.length > 0;
  const stageAvg = hasStages ? Math.round(stageScores.reduce((acc, value) => acc + value, 0) / stageScores.length) : null;

  const hasGoalTasks = goal.goalTasks.length > 0;
  const goalTaskPct = hasGoalTasks
    ? Math.round((goal.goalTasks.filter((entry) => entry.done).length / goal.goalTasks.length) * 100)
    : null;

  if (stageAvg === null && goalTaskPct === null) {
    return 0;
  }
  if (stageAvg === null) {
    return goalTaskPct;
  }
  if (goalTaskPct === null) {
    return stageAvg;
  }
  return clamp(Math.round((stageAvg + goalTaskPct) / 2), 0, 100);
}

function getHabitsGlobalCompletion(habits, anchorDateIso = getLocalISODate(new Date())) {
  if (habits.length === 0) {
    return 0;
  }
  const totalPercent = habits.reduce((acc, habit) => acc + getHabitCompletion(habit, anchorDateIso), 0);
  return clamp(Math.round(totalPercent / habits.length), 0, 100);
}

function getHabitDoneCountByDate(date, habits) {
  const dayLogs = state.logs[date];
  if (!dayLogs) {
    return 0;
  }
  const habitIds = new Set(habits.map((habit) => habit.id));
  let count = 0;
  for (const key of Object.keys(dayLogs)) {
    if (habitIds.has(key)) {
      count += 1;
    }
  }
  return count;
}

function getHabitDailyPercentByDate(dateIso, habits) {
  if (habits.length === 0) {
    return 0;
  }
  return clamp(Math.round((getHabitDoneCountByDate(dateIso, habits) / habits.length) * 100), 0, 100);
}

function getTrackingWindowDays(createdAtIso, anchorDateIso, maxWindowDays) {
  if (!isValidISODate(anchorDateIso)) {
    return maxWindowDays;
  }
  if (!isValidISODate(createdAtIso)) {
    return maxWindowDays;
  }
  const createdAt = parseLocalISODate(createdAtIso);
  const anchor = parseLocalISODate(anchorDateIso);
  if (createdAt.getTime() > anchor.getTime()) {
    return 1;
  }
  const diffMs = anchor.getTime() - createdAt.getTime();
  const diffDays = Math.floor(diffMs / 86400000) + 1;
  return clamp(diffDays, 1, maxWindowDays);
}

function getHabitWeekRatePercent(habits, endDateIso = getLocalISODate(new Date())) {
  if (habits.length === 0) {
    return 0;
  }
  const dates = getPastDates(7, endDateIso);
  const done = dates.reduce((sum, date) => sum + getHabitDoneCountByDate(date, habits), 0);
  const possible = habits.length * 7;
  return possible > 0 ? Math.round((done / possible) * 100) : 0;
}

function getHabitStreak(habits, anchorDateIso = getLocalISODate(new Date())) {
  if (habits.length === 0) {
    return 0;
  }
  const anchor = parseLocalISODate(anchorDateIso);
  let streak = 0;
  for (let i = 0; i < 365; i += 1) {
    const date = getLocalISODate(addDays(anchor, -i));
    if (getHabitDoneCountByDate(date, habits) > 0) {
      streak += 1;
    } else {
      break;
    }
  }
  return streak;
}

function getHabitWeeklySeries(habits, totalWeeks, anchorDateIso = getLocalISODate(new Date())) {
  const labels = [];
  const values = [];
  const anchorWeekStart = startOfWeek(parseLocalISODate(anchorDateIso));
  const firstActivityDateIso = getEarliestHabitActivityDate(habits, anchorDateIso);
  const firstWeekStart = startOfWeek(parseLocalISODate(firstActivityDateIso));
  const weeksSinceStart = Math.floor((anchorWeekStart.getTime() - firstWeekStart.getTime()) / (7 * 86400000)) + 1;
  const weeksToShow = clamp(weeksSinceStart, 1, totalWeeks);

  for (let i = weeksToShow - 1; i >= 0; i -= 1) {
    const weekStart = addDays(anchorWeekStart, -7 * i);
    const weekDates = Array.from({ length: 7 }, (_, offset) => getLocalISODate(addDays(weekStart, offset)));
    const done = weekDates.reduce((sum, date) => sum + getHabitDoneCountByDate(date, habits), 0);
    const possible = habits.length * 7;
    const pct = possible > 0 ? Math.round((done / possible) * 100) : 0;
    labels.push(formatDateShort(getLocalISODate(weekStart)));
    values.push(pct);
  }

  return { labels, values };
}

function getHabitDailyChartDates(habits, maxDays, anchorDateIso = getLocalISODate(new Date())) {
  const firstActivityDateIso = getEarliestHabitActivityDate(habits, anchorDateIso);
  const first = parseLocalISODate(firstActivityDateIso);
  const anchor = parseLocalISODate(anchorDateIso);
  const diffDays = Math.floor((anchor.getTime() - first.getTime()) / 86400000) + 1;
  const totalDays = clamp(diffDays, 1, maxDays);
  return getPastDates(totalDays, anchorDateIso);
}

function getEarliestHabitActivityDate(habits, anchorDateIso = getLocalISODate(new Date())) {
  const candidates = [];
  const habitIdSet = new Set(habits.map((habit) => habit.id));

  for (const habit of habits) {
    if (isValidISODate(habit.createdAt)) {
      candidates.push(habit.createdAt);
    }
  }

  for (const date of Object.keys(state.logs)) {
    const dayLogs = state.logs[date];
    if (!dayLogs || !isValidISODate(date)) {
      continue;
    }
    const hasHabitLog = Object.keys(dayLogs).some((habitId) => habitIdSet.has(habitId));
    if (hasHabitLog) {
      candidates.push(date);
    }
  }

  if (candidates.length === 0) {
    return anchorDateIso;
  }

  candidates.sort();
  return candidates[0];
}

function getGoalWeeklySeries(goal, totalWeeks) {
  const labels = [];
  const values = [];
  const currentWeekStart = startOfWeek(new Date());

  for (let i = totalWeeks - 1; i >= 0; i -= 1) {
    const weekStart = addDays(currentWeekStart, -7 * i);
    const weekDates = Array.from({ length: 7 }, (_, offset) => getLocalISODate(addDays(weekStart, offset)));
    const done = weekDates.reduce((sum, date) => sum + getGoalStageDoneCountByDate(goal.id, date), 0);
    const possible = goal.stages.length * 7;
    const pct = possible > 0 ? Math.round((done / possible) * 100) : 0;
    labels.push(`S${String(getISOWeekNumber(weekStart)).padStart(2, "0")}`);
    values.push(pct);
  }

  return { labels, values };
}

function getGoalStageDoneCountByDate(goalId, date) {
  const dayLogs = state.stageLogs[date];
  if (!dayLogs) {
    return 0;
  }
  const prefix = `${goalId}::`;
  let count = 0;
  for (const key of Object.keys(dayLogs)) {
    if (key.startsWith(prefix)) {
      count += 1;
    }
  }
  return count;
}

function createChartOptions({ chartTheme, suggestedMax, yLabel, maxY }) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: chartTheme.tooltipBg,
        borderColor: chartTheme.tooltipBorder,
        borderWidth: 1,
        titleColor: chartTheme.tooltipText,
        bodyColor: chartTheme.tooltipText,
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: chartTheme.axis, maxRotation: 0 },
      },
      y: {
        beginAtZero: true,
        suggestedMax,
        max: maxY || undefined,
        grid: { color: chartTheme.grid },
        ticks: { color: chartTheme.axis },
        title: {
          display: true,
          text: yLabel,
          color: chartTheme.axis,
        },
      },
    },
  };
}

function createDoughnutOptions() {
  return {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "72%",
    plugins: {
      legend: { display: false },
    },
  };
}

function upsertChart(key, canvas, config) {
  if (!canvas) {
    return;
  }
  destroyChart(key);
  charts[key] = new Chart(canvas.getContext("2d"), config);
}

function destroyChart(key) {
  if (charts[key]) {
    charts[key].destroy();
    delete charts[key];
  }
}

function createHabitItem(name, color) {
  return {
    id: createId(),
    name,
    type: "habit",
    color,
    createdAt: getLocalISODate(new Date()),
  };
}

function createGoalItem(name, color) {
  return {
    id: createId(),
    name,
    type: "goal",
    color,
    createdAt: getLocalISODate(new Date()),
    goalTasks: [],
    stages: [createStage("Primeira etapa")],
  };
}

function createStage(name) {
  return {
    id: createId(),
    name,
    notes: "",
    checklist: [],
    createdAt: getLocalISODate(new Date()),
  };
}

function getHabits() {
  return state.items.filter((item) => item.type === "habit");
}

function getGoals() {
  return state.items.filter((item) => item.type === "goal");
}

function getGoalById(goalId) {
  return state.items.find((item) => item.type === "goal" && item.id === goalId) || null;
}

function getCurrentGoal() {
  if (!route.goalId) {
    return null;
  }
  return getGoalById(route.goalId);
}

function getCurrentGoalAndStage() {
  const goal = getCurrentGoal();
  if (!goal || !route.stageId) {
    return null;
  }
  const stage = goal.stages.find((entry) => entry.id === route.stageId);
  if (!stage) {
    return null;
  }
  return { goal, stage };
}

function getStageLogKey(goalId, stageId) {
  return `${goalId}::${stageId}`;
}

function createDefaultCalendarState() {
  const today = getLocalISODate(new Date());
  return {
    selectedDate: today,
    visibleMonth: formatMonthKey(parseLocalISODate(today)),
  };
}

function ensureCalendarState() {
  if (!state.calendarState || typeof state.calendarState !== "object") {
    state.calendarState = createDefaultCalendarState();
    return;
  }
  if (!isValidISODate(state.calendarState.selectedDate)) {
    state.calendarState.selectedDate = getLocalISODate(new Date());
  }
  if (!isValidMonthKey(state.calendarState.visibleMonth)) {
    state.calendarState.visibleMonth = formatMonthKey(parseLocalISODate(state.calendarState.selectedDate));
  }
}

function getSelectedDate() {
  ensureCalendarState();
  return state.calendarState.selectedDate;
}

function setSelectedDate(dateIso) {
  ensureCalendarState();
  state.calendarState.selectedDate = dateIso;
}

function setVisibleMonth(monthKey) {
  ensureCalendarState();
  state.calendarState.visibleMonth = monthKey;
}

function getVisibleMonthDate() {
  ensureCalendarState();
  return parseMonthKey(state.calendarState.visibleMonth);
}

function getDailyChecklist(dateIso) {
  if (!state.dailyChecklistsByDate || typeof state.dailyChecklistsByDate !== "object") {
    state.dailyChecklistsByDate = {};
  }
  const list = state.dailyChecklistsByDate[dateIso];
  return Array.isArray(list) ? list : [];
}

function getDailyChecklistCompletionPercent(dateIso) {
  const checklist = getDailyChecklist(dateIso);
  if (checklist.length === 0) {
    return 0;
  }
  const done = checklist.filter((entry) => entry.done).length;
  return clamp(Math.round((done / checklist.length) * 100), 0, 100);
}

function ensureDailyChecklist(dateIso) {
  if (!state.dailyChecklistsByDate || typeof state.dailyChecklistsByDate !== "object") {
    state.dailyChecklistsByDate = {};
  }
  const list = state.dailyChecklistsByDate[dateIso];
  if (Array.isArray(list)) {
    return list;
  }
  state.dailyChecklistsByDate[dateIso] = [];
  return state.dailyChecklistsByDate[dateIso];
}

function getTimeBlocksForDate(dateIso) {
  if (!state.timeBlocksByDate || typeof state.timeBlocksByDate !== "object") {
    state.timeBlocksByDate = {};
  }
  const entry = state.timeBlocksByDate[dateIso];
  if (entry && typeof entry === "object" && !Array.isArray(entry)) {
    return entry;
  }
  return {};
}

function ensureTimeBlocksForDate(dateIso) {
  if (!state.timeBlocksByDate || typeof state.timeBlocksByDate !== "object") {
    state.timeBlocksByDate = {};
  }
  const entry = state.timeBlocksByDate[dateIso];
  if (entry && typeof entry === "object" && !Array.isArray(entry)) {
    return entry;
  }
  state.timeBlocksByDate[dateIso] = {};
  return state.timeBlocksByDate[dateIso];
}

function removeTimeBlockEntry(dateIso, checklistItemId) {
  const dayBlocks = ensureTimeBlocksForDate(dateIso);
  if (dayBlocks[checklistItemId]) {
    delete dayBlocks[checklistItemId];
  }
}

function removeItemFromHabitLogs(itemId) {
  for (const date of Object.keys(state.logs)) {
    if (state.logs[date][itemId]) {
      delete state.logs[date][itemId];
    }
    if (Object.keys(state.logs[date]).length === 0) {
      delete state.logs[date];
    }
  }
}

function removeGoalFromStageLogs(goalId) {
  const prefix = `${goalId}::`;
  for (const date of Object.keys(state.stageLogs)) {
    for (const key of Object.keys(state.stageLogs[date])) {
      if (key.startsWith(prefix)) {
        delete state.stageLogs[date][key];
      }
    }
    if (Object.keys(state.stageLogs[date]).length === 0) {
      delete state.stageLogs[date];
    }
  }
}

function removeStageFromLogs(goalId, stageId) {
  const key = getStageLogKey(goalId, stageId);
  for (const date of Object.keys(state.stageLogs)) {
    if (state.stageLogs[date][key]) {
      delete state.stageLogs[date][key];
    }
    if (Object.keys(state.stageLogs[date]).length === 0) {
      delete state.stageLogs[date];
    }
  }
}

function pruneOrphanLogs() {
  const habitIds = new Set(getHabits().map((habit) => habit.id));
  if (!state.dailyChecklistsByDate || typeof state.dailyChecklistsByDate !== "object") {
    state.dailyChecklistsByDate = {};
  }
  if (!state.timeBlocksByDate || typeof state.timeBlocksByDate !== "object") {
    state.timeBlocksByDate = {};
  }
  ensureCalendarState();

  for (const date of Object.keys(state.logs)) {
    for (const key of Object.keys(state.logs[date])) {
      if (!habitIds.has(key)) {
        delete state.logs[date][key];
      }
    }
    if (Object.keys(state.logs[date]).length === 0) {
      delete state.logs[date];
    }
  }

  const stageKeys = new Set();
  for (const goal of getGoals()) {
    for (const stage of goal.stages) {
      stageKeys.add(getStageLogKey(goal.id, stage.id));
    }
  }

  for (const date of Object.keys(state.stageLogs)) {
    for (const key of Object.keys(state.stageLogs[date])) {
      if (!stageKeys.has(key)) {
        delete state.stageLogs[date][key];
      }
    }
    if (Object.keys(state.stageLogs[date]).length === 0) {
      delete state.stageLogs[date];
    }
  }

  for (const [date, checklist] of Object.entries(state.dailyChecklistsByDate)) {
    if (!Array.isArray(checklist)) {
      delete state.dailyChecklistsByDate[date];
      continue;
    }
    state.dailyChecklistsByDate[date] = checklist
      .map((entry) => ({
        id: typeof entry.id === "string" && entry.id ? entry.id : createId(),
        text: typeof entry.text === "string" ? entry.text.trim() : "",
        done: Boolean(entry.done),
        createdAt: typeof entry.createdAt === "string" ? entry.createdAt : getLocalISODate(new Date()),
      }))
      .filter((entry) => entry.text.length > 0);
    if (state.dailyChecklistsByDate[date].length === 0) {
      delete state.dailyChecklistsByDate[date];
    }
  }

  for (const [date, blocks] of Object.entries(state.timeBlocksByDate)) {
    if (!blocks || typeof blocks !== "object" || Array.isArray(blocks)) {
      delete state.timeBlocksByDate[date];
      continue;
    }
    const checklistIds = new Set(getDailyChecklist(date).map((entry) => entry.id));
    for (const key of Object.keys(blocks)) {
      if (!checklistIds.has(key)) {
        delete blocks[key];
        continue;
      }
      blocks[key] = sanitizeTimeBlock(blocks[key], 0);
    }
    if (Object.keys(blocks).length === 0) {
      delete state.timeBlocksByDate[date];
    }
  }

  saveState();
}

function fillExampleData() {
  const habitNames = [
    "Treinar 45 minutos",
    "Ler 20 paginas",
    "Dormir 7h+",
  ];

  for (const name of habitNames) {
    const color = COLOR_POOL[state.items.length % COLOR_POOL.length];
    state.items.push(createHabitItem(name, color));
  }

  const goalOne = createGoalItem("Lancar landing page do produto", COLOR_POOL[state.items.length % COLOR_POOL.length]);
  goalOne.goalTasks = [
    { id: createId(), text: "Definir escopo do MVP", done: true },
    { id: createId(), text: "Validar proposta com 5 usuarios", done: false },
    { id: createId(), text: "Publicar versao final", done: false },
  ];
  goalOne.stages = [
    createStage("Pesquisa e referencias"),
    createStage("Wireframe e copy"),
    createStage("Desenvolvimento"),
  ];
  goalOne.stages[0].checklist = [
    { id: createId(), text: "Mapear concorrentes", done: true },
    { id: createId(), text: "Escolher proposta visual", done: true },
  ];
  goalOne.stages[0].notes = "Direcao visual aprovada no time.";

  const goalTwo = createGoalItem("Estruturar funil de vendas", COLOR_POOL[(state.items.length + 1) % COLOR_POOL.length]);
  goalTwo.goalTasks = [
    { id: createId(), text: "Desenhar jornada completa", done: true },
    { id: createId(), text: "Implementar automacoes", done: false },
  ];
  goalTwo.stages = [
    createStage("Mapeamento"),
    createStage("Automacoes"),
    createStage("Testes e ajustes"),
  ];
  goalTwo.stages[1].checklist = [
    { id: createId(), text: "Criar sequencia de email", done: false },
    { id: createId(), text: "Integrar CRM", done: true },
  ];

  state.items.push(goalOne, goalTwo);

  const daysBack = 35;
  const habits = getHabits();
  const goals = getGoals();

  for (let i = 0; i < daysBack; i += 1) {
    const date = getLocalISODate(addDays(new Date(), -i));

    for (const habit of habits) {
      if (Math.random() <= 0.72) {
        setHabitLog(date, habit.id, true);
      }
    }

    for (const goal of goals) {
      for (const stage of goal.stages) {
        const chance = stage.name.toLowerCase().includes("desenvolvimento") ? 0.62 : 0.55;
        if (Math.random() <= chance) {
          setStageLog(date, goal.id, stage.id, true);
        }
      }
    }
  }
}

function persistAndRender() {
  saveState();
  renderAll();
}

function loadState() {
  try {
    const rawV2 = localStorage.getItem(STORAGE_KEY);
    const rawLegacy = localStorage.getItem(LEGACY_STORAGE_KEY);
    const source = rawV2 || rawLegacy;
    if (!source) {
      return {
        items: [],
        logs: {},
        stageLogs: {},
        dailyChecklistsByDate: {},
        calendarState: createDefaultCalendarState(),
        timeBlocksByDate: {},
        weeklyOffsetWeeks: 0,
      };
    }

    const parsed = JSON.parse(source);
    return normalizeState(parsed);
  } catch (error) {
    return {
      items: [],
      logs: {},
      stageLogs: {},
      dailyChecklistsByDate: {},
      calendarState: createDefaultCalendarState(),
      timeBlocksByDate: {},
      weeklyOffsetWeeks: 0,
    };
  }
}

function normalizeState(parsed) {
  const items = Array.isArray(parsed.items) ? parsed.items.map((item, index) => normalizeItem(item, index)) : [];
  return {
    items,
    logs: normalizeLogMap(parsed.logs),
    stageLogs: normalizeLogMap(parsed.stageLogs),
    dailyChecklistsByDate: normalizeDailyChecklistMap(parsed.dailyChecklistsByDate),
    calendarState: normalizeCalendarState(parsed.calendarState),
    timeBlocksByDate: normalizeTimeBlocksByDateMap(parsed.timeBlocksByDate, parsed.timeBlocks),
    weeklyOffsetWeeks: Number(parsed.weeklyOffsetWeeks) || 0,
  };
}

function normalizeItem(item, index) {
  const fallbackColor = COLOR_POOL[index % COLOR_POOL.length];
  const normalized = {
    id: typeof item.id === "string" && item.id ? item.id : createId(),
    name: typeof item.name === "string" && item.name.trim() ? item.name.trim() : "Item sem nome",
    type: item.type === "goal" ? "goal" : "habit",
    color: typeof item.color === "string" && item.color ? item.color : fallbackColor,
    createdAt: typeof item.createdAt === "string" ? item.createdAt : getLocalISODate(new Date()),
  };

  if (normalized.type !== "goal") {
    return normalized;
  }

  const rawTasks = Array.isArray(item.goalTasks) ? item.goalTasks : [];
  const rawStages = Array.isArray(item.stages) ? item.stages : [];

  const goalTasks = rawTasks
    .map((task) => ({
      id: typeof task.id === "string" && task.id ? task.id : createId(),
      text: typeof task.text === "string" ? task.text.trim() : "",
      done: Boolean(task.done),
    }))
    .filter((task) => task.text.length > 0);

  const stages = rawStages
    .map((stage, stageIndex) => normalizeStage(stage, stageIndex))
    .filter((stage) => stage.name.length > 0);

  return {
    ...normalized,
    goalTasks,
    stages: stages.length > 0 ? stages : [createStage("Primeira etapa")],
  };
}

function normalizeStage(stage, index) {
  const rawChecklist = Array.isArray(stage.checklist) ? stage.checklist : [];
  return {
    id: typeof stage.id === "string" && stage.id ? stage.id : createId(),
    name: typeof stage.name === "string" && stage.name.trim() ? stage.name.trim() : `Etapa ${index + 1}`,
    notes: typeof stage.notes === "string" ? stage.notes : "",
    checklist: rawChecklist
      .map((item) => ({
        id: typeof item.id === "string" && item.id ? item.id : createId(),
        text: typeof item.text === "string" ? item.text.trim() : "",
        done: Boolean(item.done),
      }))
      .filter((item) => item.text.length > 0),
    createdAt: typeof stage.createdAt === "string" ? stage.createdAt : getLocalISODate(new Date()),
  };
}

function normalizeLogMap(logMap) {
  const normalized = {};
  if (!logMap || typeof logMap !== "object") {
    return normalized;
  }

  for (const [date, rawEntry] of Object.entries(logMap)) {
    if (!rawEntry || typeof rawEntry !== "object") {
      continue;
    }
    const day = {};
    for (const [key, value] of Object.entries(rawEntry)) {
      if (value) {
        day[key] = 1;
      }
    }
    if (Object.keys(day).length > 0) {
      normalized[date] = day;
    }
  }
  return normalized;
}

function normalizeDailyChecklistMap(source) {
  const normalized = {};
  if (!source || typeof source !== "object") {
    return normalized;
  }
  for (const [date, entries] of Object.entries(source)) {
    if (!isValidISODate(date) || !Array.isArray(entries)) {
      continue;
    }
    const list = entries
      .map((entry) => ({
        id: typeof entry.id === "string" && entry.id ? entry.id : createId(),
        text: typeof entry.text === "string" ? entry.text.trim() : "",
        done: Boolean(entry.done),
        createdAt: typeof entry.createdAt === "string" ? entry.createdAt : getLocalISODate(new Date()),
      }))
      .filter((entry) => entry.text.length > 0);
    if (list.length > 0) {
      normalized[date] = list;
    }
  }
  return normalized;
}

function normalizeCalendarState(rawCalendarState) {
  const fallback = createDefaultCalendarState();
  if (!rawCalendarState || typeof rawCalendarState !== "object") {
    return fallback;
  }
  const selectedDate = isValidISODate(rawCalendarState.selectedDate) ? rawCalendarState.selectedDate : fallback.selectedDate;
  const visibleMonth = isValidMonthKey(rawCalendarState.visibleMonth)
    ? rawCalendarState.visibleMonth
    : formatMonthKey(parseLocalISODate(selectedDate));
  return { selectedDate, visibleMonth };
}

function normalizeTimeBlocksByDateMap(newSource, legacySource) {
  const normalized = {};

  if (newSource && typeof newSource === "object") {
    for (const [date, blocks] of Object.entries(newSource)) {
      if (!isValidISODate(date) || !blocks || typeof blocks !== "object" || Array.isArray(blocks)) {
        continue;
      }
      const day = {};
      let index = 0;
      for (const [checklistId, rawBlock] of Object.entries(blocks)) {
        if (typeof checklistId !== "string" || !checklistId) {
          continue;
        }
        day[checklistId] = sanitizeTimeBlock(rawBlock, index);
        index += 1;
      }
      if (Object.keys(day).length > 0) {
        normalized[date] = day;
      }
    }
    return normalized;
  }

  if (legacySource && typeof legacySource === "object") {
    const today = getLocalISODate(new Date());
    const day = {};
    let index = 0;
    for (const [key, rawBlock] of Object.entries(legacySource)) {
      if (typeof key !== "string" || !key) {
        continue;
      }
      day[key] = sanitizeTimeBlock(rawBlock, index);
      index += 1;
    }
    if (Object.keys(day).length > 0) {
      normalized[today] = day;
    }
  }

  return normalized;
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function getPastDates(totalDays, endDateIso = getLocalISODate(new Date())) {
  const endDate = parseLocalISODate(endDateIso);
  const dates = [];
  for (let i = totalDays - 1; i >= 0; i -= 1) {
    dates.push(getLocalISODate(addDays(endDate, -i)));
  }
  return dates;
}

function formatDateShort(dateIso) {
  const date = parseLocalISODate(dateIso);
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" }).format(date);
}

function formatWeekdayShort(dateIso) {
  const date = parseLocalISODate(dateIso);
  return new Intl.DateTimeFormat("pt-BR", { weekday: "short" }).format(date).replace(".", "");
}

function parseLocalISODate(dateIso) {
  const [year, month, day] = dateIso.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function getLocalISODate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function addDays(date, offset) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + offset);
  return copy;
}

function addMonths(date, offset) {
  const copy = new Date(date);
  copy.setDate(1);
  copy.setMonth(copy.getMonth() + offset);
  return copy;
}

function formatMonthKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function parseMonthKey(monthKey) {
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(year, month - 1, 1);
}

function isValidMonthKey(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}$/.test(value)) {
    return false;
  }
  const parsed = parseMonthKey(value);
  return Number.isFinite(parsed.getTime()) && formatMonthKey(parsed) === value;
}

function isValidISODate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const parsed = parseLocalISODate(value);
  return Number.isFinite(parsed.getTime()) && getLocalISODate(parsed) === value;
}

function startOfWeek(date) {
  const copy = new Date(date);
  const day = copy.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  copy.setHours(0, 0, 0, 0);
  copy.setDate(copy.getDate() + mondayOffset);
  return copy;
}

function getISOWeekNumber(date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  copy.setDate(copy.getDate() + 3 - ((copy.getDay() + 6) % 7));
  const week1 = new Date(copy.getFullYear(), 0, 4);
  return (
    1 +
    Math.round(
      ((copy.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7
    )
  );
}

function createId() {
  if (window.crypto && "randomUUID" in window.crypto) {
    return window.crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replaceAll("`", "&#96;");
}

function handleGoalDragStart(event) {
  draggedGoalId = event.currentTarget.dataset.id;
  event.currentTarget.classList.add("dragging");
  event.dataTransfer.effectAllowed = "move";
}

function handleGoalDragOver(event) {
  event.preventDefault();
  event.dataTransfer.dropEffect = "move";
  const card = event.currentTarget;
  if (card.dataset.id !== draggedGoalId) {
    card.classList.add("drag-over");
  }
}

function handleGoalDragLeave(event) {
  event.currentTarget.classList.remove("drag-over");
}

function handleGoalDrop(event) {
  event.preventDefault();
  const card = event.currentTarget;
  card.classList.remove("drag-over");
  const targetId = card.dataset.id;

  if (draggedGoalId && targetId && draggedGoalId !== targetId) {
    reorderGoals(draggedGoalId, targetId);
  }
}

function handleGoalDragEnd(event) {
  event.currentTarget.classList.remove("dragging");
  const cards = elements.goalsList.querySelectorAll(".goal-card");
  cards.forEach((c) => c.classList.remove("drag-over"));
  draggedGoalId = null;
}

function reorderGoals(draggedId, targetId) {
  const goals = state.items.filter((item) => item.type === "goal");
  const draggedInGoals = goals.findIndex((g) => g.id === draggedId);
  const targetInGoals = goals.findIndex((g) => g.id === targetId);

  if (draggedInGoals === -1 || targetInGoals === -1) {
    return;
  }

  const [draggedGoal] = goals.splice(draggedInGoals, 1);
  goals.splice(targetInGoals, 0, draggedGoal);

  let goalIdx = 0;
  state.items = state.items.map((item) => {
    if (item.type === "goal") {
      return goals[goalIdx++];
    }
    return item;
  });

  persistAndRender();
}
