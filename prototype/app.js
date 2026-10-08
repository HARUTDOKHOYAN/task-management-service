/* Focus list: HTML/CSS/JS prototype of the design.
   Data lives in memory only (Phase 2 adds storage). Demo dates are relative to today. */
(function () {
  "use strict";

  /* ================= Dates ================= */
  const DAY = 864e5;
  function startOfDay(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
  const TODAY = startOfDay(new Date());
  function addDays(base, n) { const d = new Date(base); d.setDate(d.getDate() + n); return d; }
  function iso(d) { return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
  function parseISO(s) { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); }
  function rel(n) { return iso(addDays(TODAY, n)); }
  function nextMonday() { const add = ((8 - TODAY.getDay()) % 7) || 7; return addDays(TODAY, add); }
  const fmtDay = (d) => d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
  const fmtLong = (d) => d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
  const dayLetter = (d) => d.toLocaleDateString("en-GB", { weekday: "narrow" });

  /* ================= Colors (Atlassian accent "bolder") ================= */
  const COLORS = [
    { id: "blue", label: "Blue", hex: "#1868DB" },
    { id: "purple", label: "Purple", hex: "#964AC0" },
    { id: "teal", label: "Teal", hex: "#227D9B" },
    { id: "green", label: "Green", hex: "#1F845A" },
    { id: "lime", label: "Lime", hex: "#5B7F24" },
    { id: "orange", label: "Orange", hex: "#BD5B00" },
    { id: "magenta", label: "Magenta", hex: "#AE4787" },
    { id: "yellow", label: "Yellow", hex: "#946F00" },
    { id: "gray", label: "Gray", hex: "#6B6E76" }
  ];

  /* ================= Demo data ================= */
  let seq = 1;
  const id = (p) => p + (seq++);
  const state = {
    projects: [
      { id: "web", name: "Website redesign", color: "#1868DB", deadline: rel(4), note: "Reproduce the login bug in Safari, then fix the token check." },
      { id: "app", name: "Mobile app MVP", color: "#964AC0", deadline: rel(4), note: "Finish screen 3 of onboarding, the permissions screen." },
      { id: "report", name: "Marketing report", color: "#227D9B", deadline: rel(4), note: "" },
      { id: "handbook", name: "Team handbook", color: "#BD5B00", deadline: rel(6), note: "" }
    ],
    tasks: [],
    open: new Set(["web"])
  };
  function t(projectId, name, dayOffset, time, extra) {
    state.tasks.push(Object.assign({ id: id("t"), projectId, name, date: dayOffset == null ? "" : rel(dayOffset), time: time || "", pinned: false, done: false }, extra || {}));
  }
  t("web", "Fix login error", -1, "17:00");
  t("web", "Send homepage draft to client", 0, "14:00");
  t("web", "Test contact form on mobile", 1, "10:00");
  t("web", "Write About page text", 2);
  t("web", "Optimize images", 3);
  t("web", "Final check before launch", 4);
  t("web", "Choose color palette", -2, "", { done: true });
  t("app", "Finish onboarding screens", 0, "18:00");
  t("app", "Write API notes for backend", 1);
  t("app", "Design settings page", 2);
  t("app", "Write push notification texts", 2);
  t("app", "Fix crash on Android", 3);
  t("app", "Make App Store screenshots", 4);
  t("app", "Write release notes", 4);
  t("report", "Collect October numbers", 1, "12:00");
  t("report", "Make charts for the report", 3);
  t("report", "Write the summary", 4);
  t("report", "Check numbers with the team", 4);
  t("report", "Send report to manager", 4);
  t("report", "Get access to analytics", -3, "", { done: true });
  t("handbook", "Update holiday policy", 4);
  t("handbook", "Add onboarding checklist", 5);
  t("handbook", "Review security section", 6);
  t("handbook", "Fix broken links", null);

  /* ================= Priority rules =================
     Deadline = task date (+ time), else the project deadline.
     No time = end of day. Days left: 0-1 (or overdue) High, 2-3 Medium, 4+ Low.
     Pinned = always High. Done tasks are "done". */
  const project = (pid) => state.projects.find((p) => p.id === pid);

  function dueOf(task) {
    const p = project(task.projectId);
    const dateStr = task.date || (p && p.deadline) || "";
    if (!dateStr) return null;
    const date = parseISO(dateStr);
    const days = Math.round((date - TODAY) / DAY);
    const hasTime = !!(task.date && task.time);
    const at = new Date(date);
    if (hasTime) { const [h, m] = task.time.split(":").map(Number); at.setHours(h, m, 0, 0); }
    else at.setHours(23, 59, 59, 999);
    return { date, days, at, hasTime, fromProject: !task.date };
  }
  function levelOf(task, due) {
    if (task.done) return "done";
    if (task.pinned) return "high";
    if (!due) return "low";
    if (due.days <= 1) return "high";
    if (due.days <= 3) return "medium";
    return "low";
  }
  function info(task) {
    const due = dueOf(task);
    return { task, due, level: levelOf(task, due), overdue: !task.done && !!due && due.at < new Date() };
  }
  const ORDER = { high: 0, medium: 1, low: 2, done: 3 };
  const ts = (x) => (x.due ? x.due.at.getTime() : 8.64e15);
  const byPriority = (a, b) => ORDER[a.level] - ORDER[b.level] || ts(a) - ts(b);
  const LEVEL_LABEL = { high: "High", medium: "Medium", low: "Low", done: "Done" };

  function dueMain(x) {
    if (!x.due) return "No date";
    const time = x.due.hasTime ? " " + x.task.time : "";
    const d = x.due.days;
    if (d === 0) return "Today" + time;
    if (d === 1) return "Tomorrow" + time;
    if (d === -1) return "Yesterday" + time;
    if (d < -1) return -d + " days ago" + time;
    return fmtDay(x.due.date) + time;
  }
  function dueSub(x) {
    if (!x.due) return "";
    const d = x.due.days;
    let s = Math.abs(d) <= 1 ? fmtDay(x.due.date) : d > 1 ? "in " + d + " days" : fmtDay(x.due.date);
    if (!x.due.hasTime && Math.abs(d) <= 1) s += ", end of day";
    if (x.due.fromProject) s += " (project)";
    return s;
  }
  function deadlineLabel(dateStr) {
    const d = parseISO(dateStr);
    const days = Math.round((d - TODAY) / DAY);
    const when = days < 0 ? -days + " days late" : days === 0 ? "today" : days === 1 ? "tomorrow" : "in " + days + " days";
    return fmtDay(d) + " (" + when + ")";
  }

  /* ================= Helpers ================= */
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const plural = (n, w) => n + " " + w + (n === 1 ? "" : "s");
  const ICON_INFO = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#357DE8" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><circle cx="8" cy="8" r="6.25"/><path d="M8 7.25v4M8 4.75v.01"/></svg>';
  const ICON_CHEV = '<svg class="acc-chev" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#505258" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 4l4 4-4 4"/></svg>';
  const ICON_CHECK = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#FFFFFF" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 8.5l3 3 7-7"/></svg>';
  const lozenge = (level, text) => '<span class="lozenge lozenge--' + level + '">' + esc(text || LEVEL_LABEL[level]) + "</span>";
  const tile = (color, size) => '<span class="tile' + (size ? " tile--" + size : "") + '" style="background:' + esc(color) + '" aria-hidden="true"></span>';

  function taskRow(x, opts) {
    const o = opts || {};
    const late = x.overdue;
    let tags = "";
    if (late) tags += lozenge("overdue", "Overdue");
    if (o.showLevel) tags += lozenge(x.level);
    return '<div class="task' + (x.task.done ? " is-done" : "") + '">' +
      '<input type="checkbox" data-toggle="' + esc(x.task.id) + '"' + (x.task.done ? " checked" : "") + ' aria-label="' + (x.task.done ? "Mark not done: " : "Mark done: ") + esc(x.task.name) + '">' +
      '<span class="task-name">' + esc(x.task.name) + (x.task.pinned && !x.task.done ? ' <span class="small muted">(pinned)</span>' : "") + "</span>" +
      '<span class="task-meta">' + tags +
      '<span class="task-due"><b class="' + (late ? "is-late" : "") + '">' + esc(x.task.done ? "Done" : dueMain(x)) + "</b><span>" + esc(dueSub(x)) + "</span></span>" +
      "</span></div>";
  }

  /* ================= Main page ================= */
  function renderMain() {
    const all = state.tasks.map(info);
    const open = all.filter((x) => x.level !== "done");
    const groups = state.projects.map((p) => {
      const mine = open.filter((x) => x.task.projectId === p.id).sort(byPriority);
      return { p, high: mine.filter((x) => x.level === "high"), med: mine.filter((x) => x.level === "medium").length, low: mine.filter((x) => x.level === "low").length };
    });
    const active = groups.filter((g) => g.high.length).sort((a, b) => ts(a.high[0]) - ts(b.high[0]));
    const quiet = groups.filter((g) => !g.high.length);
    const highCount = active.reduce((s, g) => s + g.high.length, 0);
    const overdue = open.filter((x) => x.overdue).length;

    const headline = active.length ? "Start with " + active[0].p.name : "Nothing urgent right now";
    const summary = [overdue ? plural(overdue, "task") + " overdue." : "", highCount ? plural(highCount, "High task") + " across " + plural(active.length, "project") + "." : "No High tasks."].filter(Boolean).join(" ");

    let groupsHtml = active.map((g) => {
      const first = g.high[0];
      return '<section class="card group" aria-labelledby="g-' + esc(g.p.id) + '">' +
        '<div class="group-head">' + tile(g.p.color) +
        '<h2 id="g-' + esc(g.p.id) + '">' + esc(g.p.name) + "</h2>" + lozenge("high", g.high.length + " High") +
        '<span class="group-next">Next due <strong class="' + (first.overdue ? "is-late" : "") + '">' + esc(first.overdue ? dueMain(first) + " (overdue)" : dueMain(first)) + "</strong></span></div>" +
        (g.p.note ? '<div class="message">' + ICON_INFO + "<div><strong>Next step</strong>" + esc(g.p.note) + "</div></div>" : "") +
        g.high.map((x) => taskRow(x)).join("") +
        '<div class="group-foot"><button class="link-btn" type="button" data-open-project="' + esc(g.p.id) + '">Open project</button>' +
        '<span class="muted">' + g.med + " Medium, " + g.low + " Low</span></div></section>";
    }).join("");
    if (!active.length) groupsHtml = '<div class="card empty">No High tasks. Good time to plan ahead.</div>';
    groupsHtml += quiet.map((g) => '<div class="quiet">' + tile(g.p.color, "md") + "<span><strong>" + esc(g.p.name) + "</strong> has nothing urgent. Deadline " + esc(fmtDay(parseISO(g.p.deadline))) + ".</span></div>").join("");

    document.getElementById("app").innerHTML =
      '<main class="page">' +
        '<header style="display:flex;flex-direction:column;gap:8px"><div class="eyebrow-date">' + esc(fmtLong(TODAY)) + "</div>" +
        '<h1 class="h1">' + esc(headline) + '</h1><p class="lead">' + esc(summary) + "</p></header>" +
        '<div class="columns">' +
          '<aside class="col col-left" aria-label="This week\'s load">' + renderLoad(open) + "</aside>" +
          '<div class="col col-main">' + groupsHtml + "</div>" +
          '<aside class="col col-right">' + renderRules() + renderComingNext(open) + "</aside>" +
        "</div>" +
      "</main>";
  }

  function renderLoad(open) {
    const days = [0, 1, 2, 3, 4, 5, 6].map((i) => ({ date: addDays(TODAY, i), high: 0, medium: 0, low: 0 }));
    open.forEach((x) => {
      if (!x.due || x.due.days > 6) return;
      const i = Math.max(0, x.due.days); // overdue counts on today
      days[i][x.level] += 1;
    });
    const totals = { high: 0, medium: 0, low: 0 };
    days.forEach((d) => { totals.high += d.high; totals.medium += d.medium; totals.low += d.low; });
    const total = totals.high + totals.medium + totals.low;
    const max = Math.max(1, ...days.map((d) => d.high + d.medium + d.low));
    const unit = Math.min(24, 168 / max);
    const bar = ["high", "medium", "low"].map((k) => totals[k] ? '<span class="c-' + k + '" style="width:' + (totals[k] / total * 100).toFixed(1) + '%"></span>' : "").join("");
    const legend = ["high", "medium", "low"].map((k) => '<div class="legend-row"><span class="swatch c-' + k + '"></span><span>' + LEVEL_LABEL[k] + "</span><b>" + totals[k] + "</b></div>").join("");
    const desc = days.map((d, i) => (i === 0 ? "Today" : fmtDay(d.date)) + ": " + d.high + " High, " + d.medium + " Medium, " + d.low + " Low").join(". ");
    const cols = days.map((d, i) => {
      const segs = ["high", "medium", "low"].map((k) => d[k] ? '<span class="c-' + k + '" style="height:' + (d[k] * unit).toFixed(1) + 'px"></span>' : "").join("");
      return '<div class="load-col"><div class="load-track">' + segs + '</div><div class="load-label' + (i === 0 ? " is-today" : "") + '">' + esc(dayLetter(d.date)) + "<br>" + d.date.getDate() + "</div></div>";
    }).join("");
    return '<section class="card card--pad" style="display:flex;flex-direction:column;gap:16px">' +
      '<div><h2 class="card-title">This week\'s load</h2><p class="small muted" style="margin:4px 0 0">Open tasks due in the next 7 days, starting today</p></div>' +
      '<div class="load-bar" role="img" aria-label="' + esc(total + " open tasks: " + totals.high + " High, " + totals.medium + " Medium, " + totals.low + " Low") + '">' + bar + "</div>" +
      '<div class="legend">' + legend + "</div>" +
      '<div class="load-cols" role="img" aria-label="' + esc("Open tasks per day. " + desc) + '">' + cols + "</div>" +
      '<p class="small muted" style="margin:-8px 0 0"><span style="color:#1868DB;font-weight:653">Blue</span> = today. Overdue tasks count on today.</p>' +
      "</section>";
  }

  function renderRules() {
    return '<section class="card card--pad"><h2 class="card-title" style="margin-bottom:12px">How priority works</h2>' +
      '<div style="display:flex;flex-direction:column;gap:8px">' +
      '<div class="rule-row">' + lozenge("high") + "<span>overdue, today, tomorrow</span></div>" +
      '<div class="rule-row">' + lozenge("medium") + "<span>2-3 days left</span></div>" +
      '<div class="rule-row">' + lozenge("low") + "<span>4+ days left</span></div></div>" +
      '<p class="small muted" style="margin:12px 0 0">No time set means end of day. Pinned tasks stay High.</p></section>';
  }

  function renderComingNext(open) {
    const next = open.filter((x) => x.level === "medium").sort(byPriority).slice(0, 3);
    const body = next.length ? next.map((x) => {
      const p = project(x.task.projectId);
      return '<div class="next-item">' + tile(p.color, "sm") + "<div><div>" + esc(x.task.name) + '</div><div class="small muted">' + esc(p.name + ", " + fmtDay(x.due.date)) + "</div></div></div>";
    }).join("") : '<p class="muted" style="margin:0">Nothing in the next 2-3 days.</p>';
    return '<section class="card card--pad"><h2 class="card-title" style="margin-bottom:12px">Coming next</h2><div style="display:flex;flex-direction:column;gap:12px">' + body + "</div></section>";
  }

  /* ================= Projects page ================= */
  function renderProjects() {
    const items = state.projects.map((p) => {
      const list = state.tasks.filter((x) => x.projectId === p.id).map(info).sort(byPriority);
      const count = (lv) => list.filter((x) => x.level === lv).length;
      const done = count("done");
      const isOpen = state.open.has(p.id);
      const pct = list.length ? Math.round(done / list.length * 100) : 0;
      const counts = ["high", "medium", "low"].filter((lv) => count(lv)).map((lv) => lozenge(lv, count(lv) + " " + LEVEL_LABEL[lv])).join("");
      const panel = isOpen ?
        '<div class="acc-panel" id="panel-' + esc(p.id) + '" role="region" aria-labelledby="head-' + esc(p.id) + '">' +
          (p.note ? '<div class="message">' + ICON_INFO + "<div><strong>Next step</strong>" + esc(p.note) + "</div></div>" : "") +
          (list.length ? list.map((x) => taskRow(x, { showLevel: x.level !== "done" })).join("") : '<div class="empty">No tasks yet.</div>') +
          '<div class="group-foot"><button class="link-btn" type="button" data-add-task="' + esc(p.id) + '">Add task to this project</button><span class="muted muted-hint">Sorted by priority, then deadline</span></div>' +
        "</div>" : "";
      return '<section class="card">' +
        '<h2 class="acc-head"><button class="acc-btn" type="button" id="head-' + esc(p.id) + '" data-acc="' + esc(p.id) + '" aria-expanded="' + isOpen + '" aria-controls="panel-' + esc(p.id) + '">' +
          ICON_CHEV + tile(p.color) +
          '<span class="acc-title"><b>' + esc(p.name) + '</b><span class="small muted">Deadline ' + esc(deadlineLabel(p.deadline)) + "</span></span>" +
          '<span class="acc-counts">' + counts + "</span>" +
          '<span class="acc-progress"><span class="small" style="color:#505258">' + done + " of " + list.length + ' done</span><span class="progress"><span style="width:' + pct + '%"></span></span></span>' +
        "</button></h2>" + panel + "</section>";
    }).join("");

    document.getElementById("app").innerHTML =
      '<main class="page page--narrow">' +
        '<header class="page-head"><div style="display:flex;flex-direction:column;gap:8px"><h1 class="h1">Projects</h1>' +
        '<p class="lead">' + plural(state.projects.length, "project") + ". Click a project to see all its tasks.</p></div>" +
        '<div style="display:flex;gap:8px;flex-wrap:wrap">' +
          '<button class="btn" type="button" data-action="expand-all">Expand all</button>' +
          '<button class="btn" type="button" data-action="collapse-all">Collapse all</button>' +
          '<button class="btn" type="button" data-action="new-project">Create project</button>' +
        "</div></header>" +
        '<div class="accordion">' + items + "</div>" +
      "</main>";
  }

  /* ================= Router ================= */
  function route() { return location.hash.startsWith("#/projects") ? "projects" : "main"; }
  function render() {
    const r = route();
    document.querySelectorAll("[data-route]").forEach((a) => {
      if (a.dataset.route === r) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
    });
    if (r === "projects") renderProjects(); else renderMain();
  }
  window.addEventListener("hashchange", () => { render(); window.scrollTo(0, 0); });

  /* ================= Flag (toast with undo) ================= */
  let flagTimer = null;
  function flag(text, undo) {
    const host = document.getElementById("flagHost");
    host.innerHTML = '<div class="flag" role="status"><span>' + esc(text) + "</span>" + (undo ? '<button class="link-btn" type="button" id="flagUndo">Undo</button>' : "") + "</div>";
    if (undo) document.getElementById("flagUndo").addEventListener("click", () => { undo(); host.innerHTML = ""; });
    clearTimeout(flagTimer);
    flagTimer = setTimeout(() => { host.innerHTML = ""; }, 5000);
  }

  /* ================= Events ================= */
  document.addEventListener("change", (e) => {
    const cb = e.target.closest("[data-toggle]");
    if (!cb) return;
    const task = state.tasks.find((x) => x.id === cb.dataset.toggle);
    if (!task) return;
    task.done = cb.checked;
    render();
    if (task.done) flag("Task done: " + task.name, () => { task.done = false; render(); });
  });

  document.addEventListener("click", (e) => {
    const el = e.target.closest("[data-action],[data-acc],[data-open-project],[data-add-task],[data-close]");
    if (!el) return;
    if (el.dataset.close !== undefined) { el.closest("dialog").close(); return; }
    if (el.dataset.acc) {
      const pid = el.dataset.acc;
      if (state.open.has(pid)) state.open.delete(pid); else state.open.add(pid);
      render();
      const again = document.getElementById("head-" + pid);
      if (again) again.focus();
      return;
    }
    if (el.dataset.openProject) { state.open.add(el.dataset.openProject); location.hash = "#/projects"; return; }
    if (el.dataset.addTask) { openTaskDialog(el.dataset.addTask); return; }
    const a = el.dataset.action;
    if (a === "new-task") openTaskDialog();
    else if (a === "new-project") openProjectDialog();
    else if (a === "expand-all") { state.projects.forEach((p) => state.open.add(p.id)); render(); }
    else if (a === "collapse-all") { state.open.clear(); render(); }
  });

  /* ================= Create task dialog ================= */
  const taskDialog = document.getElementById("taskDialog");
  const tf = document.getElementById("taskForm");
  const tName = document.getElementById("tName"), tProject = document.getElementById("tProject");
  const tDate = document.getElementById("tDate"), tTime = document.getElementById("tTime"), tPin = document.getElementById("tPin");

  function draftTask() { return { projectId: tProject.value, name: tName.value, date: tDate.value, time: tDate.value ? tTime.value : "", pinned: tPin.checked, done: false }; }
  function updateTaskPreview() {
    const box = document.getElementById("tPreview");
    if (!tProject.value) { box.className = "preview-priority is-low"; box.textContent = "Choose a project to see the priority."; return; }
    const x = info(draftTask());
    const why = x.task.pinned ? "It is pinned." : !x.due ? "It has no deadline." :
      x.due.days < 0 ? "The deadline has passed." : x.due.days === 0 ? "The deadline is today." : x.due.days === 1 ? "The deadline is tomorrow." :
      "The deadline is in " + x.due.days + " days" + (x.due.fromProject ? " (project deadline)." : ".");
    box.className = "preview-priority is-" + x.level;
    box.innerHTML = lozenge(x.level) + "<span>This task will be <strong>" + LEVEL_LABEL[x.level] + "</strong>. " + esc(why) + "</span>";
  }
  function openTaskDialog(projectId) {
    tf.reset();
    tProject.innerHTML = '<option value="">Choose a project</option>' + state.projects.map((p) => '<option value="' + esc(p.id) + '">' + esc(p.name) + "</option>").join("");
    tProject.value = projectId || (state.projects[0] ? state.projects[0].id : "");
    tName.removeAttribute("aria-invalid");
    document.getElementById("tNameErr").hidden = true;
    tTime.disabled = true;
    updateTaskPreview();
    taskDialog.showModal();
    tName.focus();
  }
  [tProject, tDate, tTime, tPin].forEach((el) => el.addEventListener("input", () => { tTime.disabled = !tDate.value; updateTaskPreview(); }));
  tName.addEventListener("input", () => { if (tName.value.trim()) { tName.removeAttribute("aria-invalid"); document.getElementById("tNameErr").hidden = true; } });
  tf.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!tName.value.trim()) { tName.setAttribute("aria-invalid", "true"); document.getElementById("tNameErr").hidden = false; tName.focus(); return; }
    if (!tProject.value) { tProject.focus(); return; }
    const task = Object.assign(draftTask(), { id: id("t"), name: tName.value.trim() });
    state.tasks.push(task);
    taskDialog.close();
    render();
    flag("Task created: " + task.name);
  });

  /* ================= Create project dialog ================= */
  const projectDialog = document.getElementById("projectDialog");
  const pf = document.getElementById("projectForm");
  const pName = document.getElementById("pName"), pDate = document.getElementById("pDate"), pColors = document.getElementById("pColors");
  pColors.innerHTML = COLORS.map((c) => '<label class="swatch-opt"><input type="radio" name="color" value="' + c.id + '" aria-label="' + c.label + '"><span style="background-color:' + c.hex + '">' + ICON_CHECK + "</span></label>").join("");

  function pickedColor() { const r = pf.querySelector('input[name="color"]:checked'); return COLORS.find((c) => r && c.id === r.value) || COLORS[3]; }
  function updateProjectPreview() {
    const c = pickedColor();
    const name = pName.value.trim() || "New project";
    const due = pDate.value ? deadlineLabel(pDate.value) : "no deadline yet";
    document.getElementById("pPreview").innerHTML = tile(c.hex) + "<div><b>" + esc(name) + '</b><span class="small muted">Deadline ' + esc(due) + ", 0 tasks. Color: " + c.label + "</span></div>";
  }
  function openProjectDialog() {
    pf.reset();
    const used = new Set(state.projects.map((p) => p.color));
    const free = COLORS.find((c) => !used.has(c.hex)) || COLORS[0];
    pf.querySelector('input[value="' + free.id + '"]').checked = true;
    pDate.value = iso(nextMonday());
    pName.removeAttribute("aria-invalid");
    document.getElementById("pNameErr").hidden = true;
    updateProjectPreview();
    projectDialog.showModal();
    pName.focus();
  }
  pf.addEventListener("input", updateProjectPreview);
  pf.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!pName.value.trim()) { pName.setAttribute("aria-invalid", "true"); document.getElementById("pNameErr").hidden = false; pName.focus(); return; }
    if (!pDate.value) { pDate.focus(); return; }
    const p = { id: id("p"), name: pName.value.trim(), color: pickedColor().hex, deadline: pDate.value, note: "" };
    state.projects.push(p);
    state.open.add(p.id);
    projectDialog.close();
    if (route() !== "projects") location.hash = "#/projects"; else render();
    flag("Project created: " + p.name);
  });

  /* ================= Start ================= */
  render();
  setInterval(render, 60000); // overdue state follows the clock
})();
