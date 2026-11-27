// 予定調整カレンダー — three people mark each day ○ / △ / ✕ and the calendar shows the combined result.
// Answers are shared by everyone through textdb.online (no account) and cached in localStorage.
"use strict";

(() => {
  const PEOPLE = [
    { id: "u", name: "梅田" },
    { id: "t", name: "辻高" },
    { id: "n", name: "典子" },
  ];
  const MARKS = { o: "○", a: "△", x: "✕" };
  const BRUSHES = [
    { id: "o", label: "○" },
    { id: "a", label: "△" },
    { id: "x", label: "✕" },
    { id: "", label: "消す" },
  ];
  const WEEKDAYS = "月火水木金土日";
  const STORAGE_KEY = "ume-calendar:answers"; // { "YYYY-MM-DD": { u: "o", t: "a", n: "x" } }
  const PERSON_KEY = "ume-calendar:person";
  const TEXTDB = "https://textdb.online";
  const SHARED_KEY = "ume-cal-7Qm2Vx9LpR4sKd8Hn3Wt"; // one textdb value shared by everyone
  const POLL_MS = 15000;

  const $ = (id) => document.getElementById(id);
  const grid = $("grid");
  const monthLabel = $("month-label");
  const todayBtn = $("today-btn");
  const tools = $("tools");
  const undoBtn = $("undo");
  const detail = $("detail");
  const bestDays = $("best-days");
  const syncStatus = $("sync-status");
  const toast = $("toast");

  const isObject = (v) => v && typeof v === "object" && !Array.isArray(v);

  // ---- State ----
  let today = new Date();
  let year = today.getFullYear();
  let month = today.getMonth();
  let person = PEOPLE.some((p) => p.id === readStorage(PERSON_KEY)) ? readStorage(PERSON_KEY) : "";
  let brush = "o";
  let selectedDate = "";
  let undoStack = []; // each entry: [{ date, person, before }]
  const answers = onlyAnswers(parseJSON(readStorage(STORAGE_KEY)));

  function readStorage(key) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  function writeStorage(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch {
      // storage full or blocked: keep working in memory
    }
  }

  function parseJSON(text) {
    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  }

  // Keep only valid { date: { person: mark } } entries from untrusted data
  function onlyAnswers(data) {
    const out = {};
    if (!isObject(data)) return out;
    for (const [date, row] of Object.entries(data)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !isObject(row)) continue;
      for (const p of PEOPLE) if (MARKS[row[p.id]]) (out[date] ||= {})[p.id] = row[p.id];
    }
    return out;
  }

  const getAnswer = (data, date, who) => (data[date] && data[date][who]) || "";

  function setAnswer(data, date, who, value) {
    if (value) (data[date] ||= {})[who] = value;
    else if (data[date]) {
      delete data[date][who];
      if (!Object.keys(data[date]).length) delete data[date];
    }
  }

  const saveLocal = () => writeStorage(STORAGE_KEY, JSON.stringify(answers));
  const pad = (n) => String(n).padStart(2, "0");
  const dateKey = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;

  // ---- The combined result for a day ----
  // ◎ all three ○ / ✕ anyone ✕ / △ everyone answered, no ✕, at least one △ / ? someone still to answer
  function summarize(date) {
    const marks = PEOPLE.map((p) => getAnswer(answers, date, p.id));
    if (marks.every((m) => !m)) return "";
    if (marks.includes("x")) return "no";
    if (marks.includes("")) return "wait";
    return marks.every((m) => m === "o") ? "best" : "maybe";
  }
  const SUMMARY_MARK = { best: "◎", maybe: "△", no: "✕", wait: "?" };
  const SUMMARY_LABEL = { best: "全員参加できる", maybe: "△あり", no: "✕あり", wait: "未入力あり", "": "未入力" };

  // ---- Rendering ----
  function updateDay(cell) {
    const date = cell.dataset.date;
    const sum = summarize(date);
    cell.className = cell.className.replace(/\bis-sum-\w+/g, "").trim();
    if (sum) cell.classList.add(`is-sum-${sum}`);
    cell.querySelector(".day-sum").textContent = SUMMARY_MARK[sum] || "";
    cell.querySelectorAll(".day-person").forEach((el) => {
      el.textContent = MARKS[getAnswer(answers, date, el.dataset.person)] || "・";
    });
    const each = PEOPLE.map((p) => `${p.name}${MARKS[getAnswer(answers, date, p.id)] || "未入力"}`).join("、");
    cell.setAttribute("aria-label", `${cell.dataset.label}：${SUMMARY_LABEL[sum]}（${each}）`);
  }

  function dayCell(d, weekday, isToday) {
    const cell = document.createElement("button");
    const holiday = Holidays.name(year, month, d);
    cell.type = "button";
    cell.className = "day";
    cell.dataset.date = dateKey(year, month, d);
    cell.dataset.label = `${month + 1}月${d}日（${WEEKDAYS[weekday]}）${holiday ? ` ${holiday}` : ""}`;
    cell.dataset.weekend = weekday >= 5 || holiday ? "1" : "";
    if (weekday === 5) cell.classList.add("is-sat");
    if (weekday === 6 || holiday) cell.classList.add("is-sun");
    if (isToday) {
      cell.classList.add("is-today");
      cell.setAttribute("aria-current", "date");
    }
    if (cell.dataset.date === selectedDate) cell.classList.add("is-selected");
    cell.innerHTML =
      `<span class="day-num">${d}</span>` +
      (holiday ? `<span class="day-holiday" aria-hidden="true">${holiday}</span>` : "") +
      `<span class="day-sum" aria-hidden="true"></span>` +
      `<span class="day-people" aria-hidden="true">${PEOPLE.map((p) => `<span class="day-person" data-person="${p.id}"></span>`).join("")}</span>`;
    updateDay(cell);
    return cell;
  }

  function render() {
    const isThisMonth = year === today.getFullYear() && month === today.getMonth();
    monthLabel.textContent = `${year}年${month + 1}月`;
    todayBtn.hidden = isThisMonth;

    const leading = (new Date(year, month, 1).getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const trailing = (7 - ((leading + daysInMonth) % 7)) % 7;
    const cells = [];
    const blank = () => Object.assign(document.createElement("span"), { className: "day-blank" });
    for (let i = 0; i < leading; i++) cells.push(blank());
    for (let d = 1; d <= daysInMonth; d++) cells.push(dayCell(d, (leading + d - 1) % 7, isThisMonth && d === today.getDate()));
    for (let i = 0; i < trailing; i++) cells.push(blank());
    grid.replaceChildren(...cells);
    renderSummary();
    renderDetail();
  }

  function refreshDays() {
    grid.querySelectorAll(".day").forEach(updateDay);
    renderSummary();
    renderDetail();
  }

  function renderSummary() {
    const days = [...grid.querySelectorAll(".day")];
    const best = days.filter((c) => summarize(c.dataset.date) === "best");
    const maybe = days.filter((c) => summarize(c.dataset.date) === "maybe");
    const fmt = (list) => list.map((c) => `${Number(c.dataset.date.slice(8))}日`).join("・");
    const lines = [];
    if (best.length) lines.push(`◎ ${fmt(best)}`);
    if (maybe.length) lines.push(`△ ${fmt(maybe)}`);
    const progress = PEOPLE.map((p) => {
      const n = days.filter((c) => getAnswer(answers, c.dataset.date, p.id)).length;
      return `${p.name} ${n}/${days.length}日`;
    }).join("　");
    bestDays.innerHTML = (lines.length ? lines.map(escapeHTML).join("<br>") : "まだ候補日はありません") +
      `<span class="progress">入力済み：${escapeHTML(progress)}</span>`;
  }

  function renderDetail() {
    const cell = selectedDate && grid.querySelector(`[data-date="${selectedDate}"]`);
    if (!cell || person) {
      detail.hidden = true;
      return;
    }
    const sum = summarize(selectedDate);
    detail.hidden = false;
    detail.innerHTML =
      `<p class="detail-head"><b>${escapeHTML(cell.dataset.label)}</b>` +
      (sum ? `<span class="sum sum--${sum}">${SUMMARY_MARK[sum]}</span>` : "") + `</p>` +
      `<ul class="detail-list">${PEOPLE.map((p) => {
        const m = getAnswer(answers, selectedDate, p.id);
        return `<li><span>${p.name}</span><b class="mark mark--${m || "none"}">${MARKS[m] || "未入力"}</b></li>`;
      }).join("")}</ul>`;
  }

  function escapeHTML(s) {
    return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  }

  // ---- Person and brush pickers ----
  function renderPickers() {
    $("people").innerHTML =
      [{ id: "", name: "見るだけ" }, ...PEOPLE]
        .map((p) => `<button type="button" role="radio" data-person="${p.id}" aria-checked="${p.id === person}">${p.name}</button>`)
        .join("");
    $("brushes").innerHTML = BRUSHES
      .map((b) => `<button type="button" role="radio" data-brush="${b.id}" class="brush brush--${b.id || "clear"}" aria-checked="${b.id === brush}">${b.label}</button>`)
      .join("");
    $("people-order").textContent = `各日の小さい記号：左から ${PEOPLE.map((p) => p.name).join("・")}`;
    applyPerson();
  }

  function applyPerson() {
    tools.hidden = !person;
    document.body.classList.toggle("is-editing", Boolean(person));
    document.body.dataset.person = person;
    $("people").querySelectorAll("button").forEach((b) => b.setAttribute("aria-checked", String(b.dataset.person === person)));
    renderDetail();
  }

  $("people").addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    person = btn.dataset.person;
    writeStorage(PERSON_KEY, person);
    undoStack = [];
    undoBtn.disabled = true;
    applyPerson();
    showToast(person ? `${PEOPLE.find((p) => p.id === person).name}さんの予定を入力中` : "見るだけモード");
  });

  $("brushes").addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    brush = btn.dataset.brush;
    $("brushes").querySelectorAll("button").forEach((b) => b.setAttribute("aria-checked", String(b.dataset.brush === brush)));
  });

  // ---- Editing ----
  // Apply one mark to many days for the current person, recording a single undo step
  function paint(dates, value, step) {
    for (const date of dates) {
      const before = getAnswer(answers, date, person);
      if (before === value) continue;
      step.push({ date, person, before });
      setAnswer(answers, date, person, value);
      unsynced[`${date}|${person}`] = value;
      const cell = grid.querySelector(`[data-date="${date}"]`);
      if (cell) updateDay(cell);
    }
  }

  function commit(step) {
    if (!step.length) return;
    undoStack.push(step);
    if (undoStack.length > 30) undoStack.shift();
    undoBtn.disabled = false;
    saveLocal();
    renderSummary();
    writeGen++;
    flush();
  }

  undoBtn.addEventListener("click", () => {
    const step = undoStack.pop();
    undoBtn.disabled = !undoStack.length;
    if (!step) return;
    for (const { date, person: who, before } of step.reverse()) {
      setAnswer(answers, date, who, before);
      unsynced[`${date}|${who}`] = before;
    }
    saveLocal();
    refreshDays();
    writeGen++;
    flush();
    showToast("元に戻しました");
  });

  tools.querySelectorAll("[data-bulk]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const kind = btn.dataset.bulk;
      const days = [...grid.querySelectorAll(".day")].filter((c) =>
        kind === "all" ||
        (kind === "weekday" && !c.dataset.weekend) ||
        (kind === "weekend" && c.dataset.weekend) ||
        (kind === "empty" && !getAnswer(answers, c.dataset.date, person)));
      const step = [];
      paint(days.map((c) => c.dataset.date), brush, step);
      commit(step);
      const label = BRUSHES.find((b) => b.id === brush).label;
      showToast(step.length ? `${btn.textContent}を「${label}」にしました（${step.length}日）` : "変更はありません");
    });
  });

  // Tap a day to set it; drag across days to set them all. Starting on a day that already
  // has the chosen mark clears instead, so a tap toggles.
  let stroke = null; // { value, step, seen }

  function dayAt(x, y) {
    const el = document.elementFromPoint(x, y);
    return el && el.closest ? el.closest(".day") : null;
  }

  grid.addEventListener("pointerdown", (e) => {
    const cell = e.target.closest(".day");
    if (!cell) return;
    if (!person) {
      selectedDate = selectedDate === cell.dataset.date ? "" : cell.dataset.date;
      grid.querySelectorAll(".is-selected").forEach((c) => c.classList.remove("is-selected"));
      if (selectedDate) cell.classList.add("is-selected");
      renderDetail();
      return;
    }
    e.preventDefault();
    const value = getAnswer(answers, cell.dataset.date, person) === brush ? "" : brush;
    stroke = { value, step: [], seen: new Set([cell.dataset.date]) };
    paint([cell.dataset.date], value, stroke.step);
  });

  grid.addEventListener("pointermove", (e) => {
    if (!stroke) return;
    const cell = dayAt(e.clientX, e.clientY);
    if (!cell || stroke.seen.has(cell.dataset.date)) return;
    stroke.seen.add(cell.dataset.date);
    paint([cell.dataset.date], stroke.value, stroke.step);
  });

  function endStroke() {
    if (!stroke) return;
    commit(stroke.step);
    stroke = null;
  }
  window.addEventListener("pointerup", endStroke);
  window.addEventListener("pointercancel", endStroke);

  // ---- Toast ----
  let toastTimer = 0;
  function showToast(message) {
    toast.textContent = message;
    toast.classList.add("is-shown");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("is-shown"), 1800);
  }

  // ---- Shared storage (textdb.online) ----
  const unsynced = {}; // "date|person" -> mark ("" = cleared), not yet saved remotely
  let pending = 0; // writes queued or in flight; refreshes wait for them
  let writeGen = 0; // bumped on every edit so a refresh that started earlier is discarded
  let pullSeq = 0; // only the newest refresh may apply
  let writeQueue = Promise.resolve(); // one write at a time so writes don't overwrite each other
  let lastShown = "";

  function setSyncStatus(ok) {
    syncStatus.textContent = ok && !Object.keys(unsynced).length ? "" : "オフライン：変更はこの端末に保存し、つながり次第送ります";
  }

  async function fetchRemote() {
    const res = await fetch(`${TEXTDB}/${SHARED_KEY}?t=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) throw new Error(`GET ${res.status}`);
    const text = await res.text();
    const data = text ? JSON.parse(text) : {}; // an unused key reads as empty
    if (!isObject(data)) throw new Error("unexpected shared data");
    return data; // malformed data throws, so it is never overwritten
  }

  function applyUnsynced(data) {
    for (const [key, value] of Object.entries(unsynced)) {
      const [date, who] = key.split("|");
      setAnswer(data, date, who, value);
    }
  }

  // Show remote answers plus any local edits that haven't been saved yet
  function showRemote(data) {
    const merged = onlyAnswers(data);
    applyUnsynced(merged);
    const json = JSON.stringify(merged);
    if (json === lastShown) return;
    lastShown = json;
    for (const key of Object.keys(answers)) delete answers[key];
    Object.assign(answers, merged);
    saveLocal();
    refreshDays();
  }

  async function writeUnsynced() {
    const batch = { ...unsynced };
    if (!Object.keys(batch).length) return;
    try {
      const data = onlyAnswers(await fetchRemote()); // re-read so other people's changes are kept
      for (const [key, value] of Object.entries(batch)) {
        const [date, who] = key.split("|");
        setAnswer(data, date, who, value);
      }
      const res = await fetch(`${TEXTDB}/update`, {
        method: "POST",
        body: new URLSearchParams({ key: SHARED_KEY, value: JSON.stringify(data) }),
      });
      if (!res.ok || (await res.json()).status !== 1) throw new Error("write failed");
      for (const [key, value] of Object.entries(batch)) if (unsynced[key] === value) delete unsynced[key];
      setSyncStatus(true);
      if (pending === 1 && !stroke) showRemote(data);
    } catch {
      setSyncStatus(false);
    }
  }

  function flush() {
    pending++;
    writeQueue = writeQueue.then(writeUnsynced).finally(() => pending--);
  }

  async function pull() {
    if (document.hidden || pending || stroke) return;
    if (Object.keys(unsynced).length) return flush(); // retry earlier failed writes first
    const seq = ++pullSeq;
    const gen = writeGen;
    try {
      const data = await fetchRemote();
      if (seq === pullSeq && gen === writeGen && !pending && !stroke) showRemote(data);
      setSyncStatus(true);
    } catch {
      setSyncStatus(false);
    }
  }

  // ---- Navigation ----
  function goTo(y, m) {
    const first = new Date(y, m, 1);
    year = first.getFullYear();
    month = first.getMonth();
    undoStack = [];
    undoBtn.disabled = true;
    render();
  }

  $("prev-month").addEventListener("click", () => goTo(year, month - 1));
  $("next-month").addEventListener("click", () => goTo(year, month + 1));
  todayBtn.addEventListener("click", () => goTo(today.getFullYear(), today.getMonth()));

  function wake() {
    const now = new Date();
    if (now.toDateString() !== today.toDateString()) {
      today = now;
      render();
    }
    pull();
  }

  document.addEventListener("visibilitychange", wake);
  window.addEventListener("pageshow", wake); // Safari restores pages from its back/forward cache
  setInterval(wake, POLL_MS);

  renderPickers();
  render();
  pull();
})();
