// 予定調整カレンダー — three people mark each day ○ / △ / ✕ and the calendar shows the combined result.
// Answers are shared by everyone through textdb.online (no account) and cached in localStorage.
"use strict";

(() => {
  const PEOPLE = [
    { id: "u", name: "梅田", color: "#b23a6f" }, // 紅梅
    { id: "t", name: "辻高", color: "#2d4f8a" }, // 藍
    { id: "n", name: "典子", color: "#6e4a9e" }, // 藤
  ];
  const MARKS = { o: "○", a: "△", x: "✕" };
  const BRUSHES = [
    { id: "o", label: "○" },
    { id: "a", label: "△" },
    { id: "x", label: "✕" },
    { id: "", label: "空白" },
  ];
  const WEEKDAYS = "月火水木金土日";
  // Only these two months exist on this page, each with its own theme
  const MONTHS = [
    { y: 2026, m: 11, theme: "xmas", tab: "12月", tabSub: "Christmas", kicker: "Merry Christmas", title: "12月の予定", color: "#0e2a22" },
    { y: 2027, m: 0, theme: "newyear", tab: "1月", tabSub: "お正月", kicker: "謹賀新年", title: "1月の予定", color: "#f6f0e4" },
  ];
  // Small ornaments on special days
  const SPECIALS = {
    "2026-12-24": { kind: "star", label: "クリスマスイブ" },
    "2026-12-25": { kind: "star", label: "クリスマス" },
    "2026-12-31": { kind: "bell", label: "大晦日" },
    "2027-01-01": { kind: "sun", label: "" },
    "2027-01-02": { kind: "plum", label: "三が日" },
    "2027-01-03": { kind: "plum", label: "三が日" },
  };
  const STORAGE_KEY = "ume-calendar:answers"; // { "YYYY-MM-DD": { u: "o", t: "a", n: "x" } }
  const PERSON_KEY = "ume-calendar:person";
  const TEXTDB = "https://textdb.online";
  const SHARED_KEY = "ume-cal-7Qm2Vx9LpR4sKd8Hn3Wt"; // one textdb value shared by everyone
  const POLL_MS = 15000;

  const $ = (id) => document.getElementById(id);
  const grid = $("grid");
  const monthLabel = $("month-label");
  const undoBtn = $("undo");
  const detail = $("detail");
  const bestDays = $("best-days");
  const syncStatus = $("sync-status");
  const toast = $("toast");

  const isObject = (v) => v && typeof v === "object" && !Array.isArray(v);

  // ---- State ----
  let today = new Date();
  let monthIndex = today.getFullYear() === 2027 ? 1 : 0; // January once it arrives, December before that
  let year = MONTHS[monthIndex].y;
  let month = MONTHS[monthIndex].m;
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
  // ◎ all three ○ / ✕ anyone ✕ / △ everyone answered, no ✕, at least one △ / – someone still to answer
  function summarize(date) {
    const marks = PEOPLE.map((p) => getAnswer(answers, date, p.id));
    if (marks.every((m) => !m)) return "";
    if (marks.includes("x")) return "no";
    if (marks.includes("")) return "wait";
    return marks.every((m) => m === "o") ? "best" : "maybe";
  }
  const SUMMARY_MARK = { best: "◎", maybe: "△", no: "✕", wait: "–" };
  const SUMMARY_LABEL = { best: "全員参加できる", maybe: "△あり", no: "✕あり", wait: "未入力あり", "": "未入力" };

  // ---- Rendering ----
  // View mode: big mark = combined result (colour = result only).
  // Edit mode: big mark = the editor's own answer, "–" while still unanswered.
  function updateDay(cell) {
    const date = cell.dataset.date;
    const sum = summarize(date);
    const mine = person ? getAnswer(answers, date, person) : "";
    cell.className = cell.className.replace(/\b(is-sum|mine)-\w+/g, "").replace(/\s+/g, " ").trim();
    if (person) cell.classList.add(mine ? `mine-${mine}` : "mine-empty");
    else if (sum) cell.classList.add(`is-sum-${sum}`);
    cell.querySelector(".day-sum").textContent = person ? MARKS[mine] || "–" : SUMMARY_MARK[sum] || "";
    cell.querySelector(".day-people").hidden = !sum; // nobody answered yet: keep the cell clean
    cell.querySelectorAll(".day-person").forEach((el) => {
      const m = getAnswer(answers, date, el.dataset.person);
      el.dataset.mark = m || "none";
      el.lastChild.textContent = MARKS[m] || "–";
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
    const special = SPECIALS[cell.dataset.date];
    const note = [holiday, special && special.label].filter(Boolean).join(" ");
    cell.dataset.label = `${month + 1}月${d}日（${WEEKDAYS[weekday]}）${note ? ` ${note}` : ""}`;
    if (special) cell.classList.add("is-special", `is-special-${special.kind}`);
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
      (note ? `<span class="day-holiday" aria-hidden="true">${note}</span>` : "") +
      `<span class="day-sum" aria-hidden="true"></span>` +
      `<span class="day-people" aria-hidden="true">${PEOPLE.map((p) =>
        `<span class="day-person" data-person="${p.id}"><i>${p.name[0]}</i><b></b></span>`).join("")}</span>`;
    updateDay(cell);
    return cell;
  }

  function render() {
    const isThisMonth = year === today.getFullYear() && month === today.getMonth();
    monthLabel.innerHTML = `<span class="month-year">${year}</span><span class="month-num">${month + 1}</span><span class="month-unit">月</span>`;
    applyTheme();

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
      return `<span class="nowrap">${p.name} ${n}/${days.length}日</span>`;
    }).join("　");
    renderProgress(days);
    bestDays.innerHTML = (lines.length ? lines.map(escapeHTML).join("<br>") : "まだ候補日はありません") +
      `<span class="progress">入力済み：${progress}</span>`; // names are constants, safe to inline
  }

  function renderProgress(days) {
    const el = $("my-progress");
    if (!person) return;
    const p = PEOPLE.find((x) => x.id === person);
    const done = days.filter((c) => getAnswer(answers, c.dataset.date, person)).length;
    const left = days.length - done;
    el.classList.toggle("is-done", left === 0);
    el.innerHTML = `<b>${p.name}さん</b>　` + (left
      ? `${month + 1}月 あと <b class="left">${left}</b>日 <span class="count">（${done}/${days.length}）</span>`
      : `✓ ${month + 1}月は全部入力済み`) +
      `<span class="bar"><span style="width:${((done / days.length) * 100).toFixed(1)}%"></span></span>`;
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
      [{ id: "", name: "結果を見る" }, ...PEOPLE]
        .map((p) => `<button type="button" role="radio" data-person="${p.id}" aria-checked="${p.id === person}"` +
          (p.color ? ` style="--pc:${p.color}"` : "") + `>${p.name}</button>`)
        .join("");
    $("brushes").innerHTML = BRUSHES
      .map((b) => `<button type="button" role="radio" data-brush="${b.id}" class="brush brush--${b.id || "clear"}" aria-checked="${b.id === brush}">${b.label}</button>`)
      .join("");
    PEOPLE.forEach((p) => document.documentElement.style.setProperty(`--p-${p.id}`, p.color));
    applyPerson();
  }

  function applyPerson() {
    $("who-label").textContent = person ? "入力中の人（タップで切り替え）" : "名前をタップして、自分の予定を入力";
    document.body.classList.toggle("is-editing", Boolean(person));
    document.body.dataset.person = person;
    const me = PEOPLE.find((p) => p.id === person);
    document.body.style.setProperty("--me", me ? me.color : "transparent");
    $("people").querySelectorAll("button").forEach((b) => b.setAttribute("aria-checked", String(b.dataset.person === person)));
    if (grid.firstChild) refreshDays();
  }

  $("people").addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    person = btn.dataset.person;
    writeStorage(PERSON_KEY, person);
    undoStack = [];
    undoBtn.disabled = true;
    applyPerson();
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
      const cell = grid.querySelector(`[data-date="${date}"]`);
      if (cell) updateDay(cell);
    }
  }

  // Queue a finished edit for saving (strokes are only saved once the finger lifts)
  function commit(step) {
    if (!step.length) return;
    for (const { date, person: who } of step) unsynced[`${date}|${who}`] = getAnswer(answers, date, who);
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
    savedNote = "ひとつ戻";
  });

  document.querySelectorAll("[data-bulk]").forEach((btn) => {
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
      if (step.length) savedNote = `${step.length}日を「${label}」に`;
      else showToast("変更はありません");
    });
  });

  // Tap a day to set it; drag across days to set them all. Starting on a day that already
  // has the chosen mark clears instead, so a tap toggles.
  let stroke = null; // { value, step, seen }

  function dayAt(x, y) {
    const el = document.elementFromPoint(x, y);
    return el && el.closest ? el.closest(".day") : null;
  }

  // View mode: tap a day to see everyone's answers. Uses click, which Safari skips after a scroll.
  grid.addEventListener("click", (e) => {
    const cell = e.target.closest(".day");
    if (!cell || person) return;
    selectedDate = selectedDate === cell.dataset.date ? "" : cell.dataset.date;
    grid.querySelectorAll(".is-selected").forEach((c) => c.classList.remove("is-selected"));
    if (selectedDate) cell.classList.add("is-selected");
    renderDetail();
  });

  // Edit mode. The grid allows vertical panning (touch-action: pan-y), so a vertical swipe
  // scrolls the page: Safari then sends pointercancel and the stroke is rolled back.
  grid.addEventListener("pointerdown", (e) => {
    const cell = e.target.closest(".day");
    if (!cell || !person || !e.isPrimary) return;
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

  function cancelStroke() {
    if (!stroke) return;
    for (const { date, person: who, before } of stroke.step.reverse()) setAnswer(answers, date, who, before);
    stroke = null;
    refreshDays();
  }
  window.addEventListener("pointerup", endStroke);
  window.addEventListener("pointercancel", cancelStroke);

  // ---- Toast ----
  let toastTimer = 0;
  let savedNote = ""; // describes the last bulk/undo action; shown together with "保存しました"
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
    const res = await fetch(`${TEXTDB}/${SHARED_KEY}?t=${Date.now()}`, { cache: "no-store", signal: AbortSignal.timeout(10000) });
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
        signal: AbortSignal.timeout(10000), // a request frozen by Safari suspending the tab must not stall the queue
        body: new URLSearchParams({ key: SHARED_KEY, value: JSON.stringify(data) }),
      });
      if (!res.ok || (await res.json()).status !== 1) throw new Error("write failed");
      for (const [key, value] of Object.entries(batch)) if (unsynced[key] === value) delete unsynced[key];
      setSyncStatus(true);
      if (!Object.keys(unsynced).length) {
        showToast(`✓ ${savedNote ? `${savedNote}して` : ""}保存しました`);
        savedNote = "";
      }
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

  // ---- Months and themes ----
  function renderTabs() {
    $("months").innerHTML = MONTHS.map((mo, i) =>
      `<button type="button" role="tab" data-index="${i}" aria-selected="${i === monthIndex}">` +
      `<span class="tab-main">${mo.tab}</span><span class="tab-sub">${mo.tabSub}</span></button>`).join("");
  }

  function applyTheme() {
    const mo = MONTHS[monthIndex];
    document.body.dataset.theme = mo.theme;
    document.querySelector('meta[name="theme-color"]').content = mo.color;
    $("hero-kicker").textContent = mo.kicker;
    $("hero-title").textContent = mo.title;
    $("hero-art").innerHTML = mo.theme === "xmas" ? wreathSvg() : sunriseSvg();
    $("months").querySelectorAll("button").forEach((b) => b.setAttribute("aria-selected", String(Number(b.dataset.index) === monthIndex)));
    $("snow").hidden = mo.theme !== "xmas";
  }

  function wreathSvg() {
    const leaves = [];
    for (let i = 0; i < 28; i++) {
      const a = i * (360 / 28);
      const fill = ["#24503d", "#3a6e52", "#2d5e47"][i % 3];
      leaves.push(`<ellipse cx="60" cy="24" rx="5.5" ry="12" fill="${fill}" transform="rotate(${a} 60 60) rotate(${i % 2 ? 28 : -28} 60 24)"/>`);
    }
    const berries = [20, 75, 130, 200, 250, 310].map((a) => {
      const r = (a * Math.PI) / 180;
      return `<circle cx="${(60 + 36 * Math.sin(r)).toFixed(1)}" cy="${(60 - 36 * Math.cos(r)).toFixed(1)}" r="3.2" fill="#a3263a"/>`;
    });
    const gold = [45, 105, 165, 225, 285, 345].map((a) => {
      const r = (a * Math.PI) / 180;
      return `<circle cx="${(60 + 40 * Math.sin(r)).toFixed(1)}" cy="${(60 - 40 * Math.cos(r)).toFixed(1)}" r="1.8" fill="#d8b86a"/>`;
    });
    return `<svg viewBox="0 0 120 120">${leaves.join("")}${berries.join("")}${gold.join("")}` +
      `<g fill="#9b2335"><path d="M60 96 L44 88 Q40 96 44 104 Z"/><path d="M60 96 L76 88 Q80 96 76 104 Z"/>` +
      `<path d="M58 97 L50 116 L55 113 L58 118 L60 98 Z"/><path d="M62 97 L70 116 L65 113 L62 118 L60 98 Z"/></g>` +
      `<circle cx="60" cy="96" r="4" fill="#b83246"/></svg>`;
  }

  function sunriseSvg() {
    const plum = (x, y, s) => {
      const petals = [0, 72, 144, 216, 288].map((a) =>
        `<circle cx="${x}" cy="${y - 5 * s}" r="${4.2 * s}" transform="rotate(${a} ${x} ${y})"/>`).join("");
      return `<g fill="#f2c4c4">${petals}</g><circle cx="${x}" cy="${y}" r="${1.8 * s}" fill="#d4a94f"/>`;
    };
    return `<svg viewBox="0 0 180 110">` +
      `<circle cx="90" cy="54" r="32" fill="#c0392b"/>` +
      `<g fill="#d8b86a"><rect x="22" y="62" width="78" height="8" rx="4"/><rect x="74" y="76" width="86" height="8" rx="4"/>` +
      `<rect x="40" y="90" width="56" height="6" rx="3" opacity=".7"/></g>` +
      `<path d="M8 30 Q20 22 30 30" stroke="#5a3a2a" stroke-width="1.6" fill="none"/>` +
      plum(30, 30, 1) + plum(16, 44, 0.8) + plum(160, 26, 0.9) + `</svg>`;
  }

  function makeSnow() {
    const flakes = [];
    for (let i = 0; i < 28; i++) {
      const size = (2 + Math.random() * 3.5).toFixed(1);
      flakes.push(`<span style="left:${(Math.random() * 100).toFixed(1)}%;width:${size}px;height:${size}px;` +
        `animation-duration:${(9 + Math.random() * 10).toFixed(1)}s,${(3 + Math.random() * 3).toFixed(1)}s;` +
        `animation-delay:-${(Math.random() * 18).toFixed(1)}s,-${(Math.random() * 3).toFixed(1)}s;opacity:${(0.35 + Math.random() * 0.5).toFixed(2)}"></span>`);
    }
    $("snow").innerHTML = flakes.join("");
  }

  $("months").addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn || Number(btn.dataset.index) === monthIndex) return;
    monthIndex = Number(btn.dataset.index);
    year = MONTHS[monthIndex].y;
    month = MONTHS[monthIndex].m;
    selectedDate = "";
    undoStack = [];
    undoBtn.disabled = true;
    render();
  });

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

  makeSnow();
  renderTabs();
  renderPickers();
  render();
  pull();
})();
