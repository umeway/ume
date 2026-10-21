// 梅田のスケジュール — infinite month calendar; in edit mode a tap cycles 空欄 → ○ (参加できる) → × (参加できない).
// Answers are shared by everyone through textdb.online (no account) and cached in localStorage.
"use strict";

(() => {
  const STORAGE_KEY = "ume:answers"; // { "YYYY-MM-DD": "o" | "x" }; missing = 空欄 (未回答)
  const TEXTDB = "https://textdb.online";
  const SHARED_KEY = "ume-N08FfL4x2R0fcgVGb683AHiM"; // one textdb value shared by everyone
  const POLL_MS = 15000;
  const NEXT = { "": "o", o: "x", x: "" };
  const LABELS = { "": "未回答", o: "参加できる", x: "参加できない" };
  const WEEKDAYS = "月火水木金土日"; // Mon-first, so 土日 sit together
  const FLOWER_COLORS = ["#8fd3f0", "#f5df6b", "#a9e3c2", "#f3a9c8"];
  const THEME_VARS = ["--sea-top", "--sea-bottom", "--grid-line", "--head-bg"];

  // Theme colour per month (Jan–Dec), in THEME_VARS order
  const THEMES = [
    ["#3d7fd9", "#a9cdf5", "#a9c6ee", "#eaf2fd"],
    ["#f27aa8", "#fbc6db", "#f2b3cb", "#fdeef4"],
    ["#57c79a", "#bdeed8", "#a6dcc3", "#eaf8f1"],
    ["#f7a1c4", "#fde3ee", "#f3bfd4", "#fff0f6"],
    ["#6cc04a", "#c9ecb5", "#b5dca0", "#f0f9ea"],
    ["#8a7fe0", "#cfc9f7", "#c0b9ee", "#f2f0fd"],
    ["#2fb9e8", "#a6e6f8", "#a8d8ee", "#e8f6fc"],
    ["#19b3b0", "#9fe6e0", "#9fdbd6", "#e6f8f6"],
    ["#f2a33a", "#fbd9a4", "#f0cc96", "#fdf3e4"],
    ["#9a62d0", "#d8b8f2", "#cfb3ea", "#f5eefc"],
    ["#e0683f", "#f8c3a8", "#f0bba3", "#fdf0ea"],
    ["#2f9a63", "#a9dfc0", "#a3d6b8", "#ebf7f0"],
  ];

  const $ = (id) => document.getElementById(id);
  const grid = $("calendar-grid");
  const monthLabel = $("month-label");
  const summary = $("month-summary");
  const holidayList = $("month-holidays");
  const todayBtn = $("today-btn");
  const fishLeft = $("fish-left");
  const fishRight = $("fish-right");
  const speech = $("speech");
  const toast = $("toast");
  const syncStatus = $("sync-status");
  const themeColor = document.querySelector('meta[name="theme-color"]');

  // ---- State ----
  let today = new Date();
  let year = today.getFullYear();
  let month = today.getMonth();
  let editing = false; // everyone starts in view mode; the top-left fish toggles editing
  const answers = onlyAnswers(readLocal());

  function readLocal() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY));
    } catch {
      return null;
    }
  }

  function saveLocal() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(answers));
    } catch {
      // storage full or blocked: keep working in memory
    }
  }

  // Keep only valid "o"/"x" entries from untrusted data (localStorage or the shared store)
  function onlyAnswers(data) {
    const isObject = data && typeof data === "object" && !Array.isArray(data);
    return isObject ? Object.fromEntries(Object.entries(data).filter(([, v]) => v === "o" || v === "x")) : {};
  }

  function setAnswer(target, key, value) {
    if (value) target[key] = value;
    else delete target[key];
  }

  const pad = (n) => String(n).padStart(2, "0");
  const dateKey = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;

  // ---- Rendering ----
  function updateDay(btn) {
    const answer = answers[btn.dataset.date] || "";
    btn.classList.toggle("is-free", answer === "o");
    btn.classList.toggle("is-busy", answer === "x");
    btn.setAttribute("aria-label", `${btn.dataset.label}：${LABELS[answer]}`);
  }

  function updateSummary() {
    const prefix = `${year}-${pad(month + 1)}-`;
    const values = Object.keys(answers).filter((key) => key.startsWith(prefix)).map((key) => answers[key]);
    const free = values.filter((v) => v === "o").length;
    summary.textContent = values.length ? `○ ${free}日・× ${values.length - free}日` : "今月はまだ未回答です";
  }

  function refreshDays() {
    grid.querySelectorAll(".day").forEach(updateDay);
    updateSummary();
  }

  function applyTheme() {
    const root = document.documentElement.style;
    THEMES[month].forEach((color, i) => root.setProperty(THEME_VARS[i], color));
    themeColor.content = THEMES[month][0];
  }

  function blankCell(i) {
    const blank = document.createElement("span");
    blank.className = "day-blank";
    blank.innerHTML = flowerSvg(FLOWER_COLORS[i % FLOWER_COLORS.length]);
    return blank;
  }

  function flowerSvg(color) {
    const petals = [0, 72, 144, 216, 288]
      .map((a) => `<ellipse cx="20" cy="9" rx="6" ry="9" transform="rotate(${a} 20 20)"/>`)
      .join("");
    return `<svg viewBox="0 0 40 40" aria-hidden="true"><g fill="none" stroke="${color}" stroke-width="2.5">${petals}<circle cx="20" cy="20" r="4"/></g></svg>`;
  }

  function dayButton(d, weekday, isToday) {
    const btn = document.createElement("button");
    const holiday = Holidays.name(year, month, d);
    btn.type = "button";
    btn.className = "day";
    btn.dataset.date = dateKey(year, month, d);
    btn.dataset.label = `${month + 1}月${d}日（${WEEKDAYS[weekday]}）${holiday ? ` ${holiday}` : ""}`;
    btn.classList.toggle("is-sat", weekday === 5);
    btn.classList.toggle("is-sun", weekday === 6);
    btn.classList.toggle("is-holiday", Boolean(holiday));
    if (isToday) {
      btn.classList.add("is-today");
      btn.setAttribute("aria-current", "date");
    }
    btn.innerHTML = `<span class="day-num">${d}</span>` +
      (holiday ? `<span class="day-holiday" aria-hidden="true">${holiday}</span>` : "") +
      `<span class="mark" aria-hidden="true"></span><span class="day-fish">${Fish.svg(Fish.make(btn.dataset.date), true)}</span>`;
    updateDay(btn);
    return btn;
  }

  function render() {
    const isThisMonth = year === today.getFullYear() && month === today.getMonth();
    monthLabel.textContent = `${year}年${month + 1}月`;
    todayBtn.hidden = isThisMonth;
    applyTheme();

    const leading = (new Date(year, month, 1).getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const trailing = (7 - ((leading + daysInMonth) % 7)) % 7;
    const cells = [];
    const holidays = [];
    for (let i = 0; i < leading; i++) cells.push(blankCell(i));
    for (let d = 1; d <= daysInMonth; d++) {
      const btn = dayButton(d, (leading + d - 1) % 7, isThisMonth && d === today.getDate());
      if (btn.classList.contains("is-holiday")) holidays.push(`${d}日 ${Holidays.name(year, month, d)}`);
      cells.push(btn);
    }
    for (let i = 0; i < trailing; i++) cells.push(blankCell(leading + i)); // continue the flower colour cycle
    grid.replaceChildren(...cells);

    holidayList.textContent = holidays.length ? `祝日：${holidays.join("・")}` : "";
    updateSummary();
    renderBanner();
  }

  // Two banner fish that change every month
  function renderBanner() {
    const key = `${year}-${month}`;
    const left = Fish.make(`banner-left-${key}`);
    let right = Fish.make(`banner-right-${key}`);
    for (let i = 0; right === left; i++) right = Fish.make(`banner-right-${key}-${i}`); // only presets can repeat
    fishLeft.innerHTML = Fish.svg(left, false);
    fishRight.innerHTML = Fish.svg(right, false);
  }

  // Restart a one-shot CSS animation class
  function animate(el, className) {
    el.classList.remove(className);
    void el.offsetWidth;
    el.classList.add(className);
  }

  function goTo(y, m) {
    const first = new Date(y, m, 1);
    year = first.getFullYear();
    month = first.getMonth();
    render();
  }

  // Re-render if the date rolled over while the page was open or cached
  function checkToday() {
    const now = new Date();
    if (now.toDateString() === today.toDateString()) return;
    today = now;
    render();
  }

  // ---- View / edit mode: a hidden toggle on the top-left fish, confirmed only by a toast ----
  let toastTimer = 0;

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add("is-shown");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("is-shown"), 1800);
  }

  function setEditing(on) {
    editing = on;
    document.body.classList.toggle("is-editing", on);
    fishLeft.setAttribute("aria-pressed", String(on));
    showToast(on ? "✏️ 編集モード" : "👀 閲覧モード");
  }

  // ---- Shared storage (textdb.online) ----
  const unsynced = {}; // taps not yet saved remotely: key -> "o" | "x" | "" (cleared)
  let pending = 0; // writes queued or in flight; refreshes wait for them
  let writeGen = 0; // bumped on every tap so a refresh that started earlier is discarded
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
    if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("unexpected shared data");
    return data; // malformed data throws, so it is never overwritten
  }

  // Show remote answers plus any local taps that haven't been saved yet
  function showRemote(data) {
    const merged = onlyAnswers(data);
    for (const [key, value] of Object.entries(unsynced)) setAnswer(merged, key, value);
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
      const data = await fetchRemote(); // re-read so other people's changes are kept
      for (const [key, value] of Object.entries(batch)) setAnswer(data, key, value);
      const res = await fetch(`${TEXTDB}/update`, {
        method: "POST",
        body: new URLSearchParams({ key: SHARED_KEY, value: JSON.stringify(data) }),
      });
      if (!res.ok || (await res.json()).status !== 1) throw new Error("write failed");
      for (const [key, value] of Object.entries(batch)) if (unsynced[key] === value) delete unsynced[key];
      setSyncStatus(true);
      if (pending === 1) showRemote(data);
    } catch {
      setSyncStatus(false);
    }
  }

  function flush() {
    pending++;
    writeQueue = writeQueue.then(writeUnsynced).finally(() => pending--);
  }

  async function pull() {
    if (document.hidden || pending) return;
    if (Object.keys(unsynced).length) return flush(); // retry earlier failed writes first
    const seq = ++pullSeq;
    const gen = writeGen;
    try {
      const data = await fetchRemote();
      if (seq === pullSeq && gen === writeGen && !pending) showRemote(data);
      setSyncStatus(true);
    } catch {
      setSyncStatus(false);
    }
  }

  // ---- Events ----
  fishLeft.addEventListener("click", () => setEditing(!editing));

  grid.addEventListener("click", (e) => {
    const btn = e.target.closest(".day");
    if (!btn) return;
    if (!editing) return; // view mode: days are read-only
    const key = btn.dataset.date;
    const next = NEXT[answers[key] || ""];
    setAnswer(answers, key, next);
    saveLocal();
    updateDay(btn);
    updateSummary();
    unsynced[key] = next;
    writeGen++;
    flush();
    if (next === "o") {
      animate(fishLeft, "is-hopping");
      animate(speech, "is-popping");
    }
  });

  $("prev-month").addEventListener("click", () => goTo(year, month - 1));
  $("next-month").addEventListener("click", () => goTo(year, month + 1));
  todayBtn.addEventListener("click", () => goTo(today.getFullYear(), today.getMonth()));

  function wake() {
    checkToday();
    pull();
  }

  document.addEventListener("visibilitychange", wake);
  window.addEventListener("pageshow", wake); // Safari restores pages from its back/forward cache
  setInterval(wake, POLL_MS);

  render();
  pull();
})();
