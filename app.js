// 梅田のスケジュール — infinite month calendar, tap a day to toggle ○ (参加できる) / × (参加できない)
"use strict";

(() => {
  const STORAGE_KEY = "ume:free-days"; // array of "YYYY-MM-DD" marked ○; everything else is ×

  // ---- Bikini Bottom fish (Fred-style: bullet head, googly eyes, droopy lips, belt + trousers) ----
  const INK = "#1b1b1b";
  const CREAM = "#eadcb4";
  const STRIPE = "#9c8a5c";
  const FISH = [
    { skin: "#a39459" }, // Fred
    { skin: "#8fbcd0", shirt: "#9b7fd0" },
    { skin: "#86b46c", shirt: "#f1eee4", hat: "#3e5f9e" },
    { skin: "#ec9fbc", shirt: "#6fb7dc", hair: true, lips: "#e2557f" },
    { skin: "#b0a0dc", shirt: "#6f9f78" },
    { skin: "#f2a25c", shirt: "#4f80c2", glasses: true },
    { skin: "#a8d4c2", shirt: "#c8605a", hat: "#6b4a35" },
    { skin: "#7d6a4f", shirt: "#7a3550" },
  ];

  function arm(d) {
    return `<path d="${d}" fill="none" stroke="${INK}" stroke-width="10" stroke-linecap="round"/>` +
      `<path d="${d}" fill="none" stroke="${CREAM}" stroke-width="6" stroke-linecap="round"/>`;
  }

  // bust = head and shoulders only (for day cells); otherwise the full figure
  function fishSvg(fish, bust) {
    const line = `stroke="${INK}" stroke-width="3" stroke-linejoin="round"`;
    const parts = [
      `<path d="M60 8Q86 22 84 60Q82 86 70 100L72 40Q70 18 60 8Z" fill="${CREAM}" ${line}/>`,
      `<path d="M69 22l10-4M72 36l11-2M73 52h10M73 68l9 2M72 84l7 4" stroke="${STRIPE}" stroke-width="2"/>`,
      `<path d="M30 116L28 52Q27 6 54 5Q75 7 74 46L72 116Z" fill="${fish.skin}" ${line}/>`,
      `<path d="M38 70q-1 12 2 22M47 69q-1 12 1 24" stroke="${INK}" stroke-width="1.6" fill="none"/>`,
      fish.shirt ? `<path d="M29 86Q50 80 73 84L72 116H30Z" fill="${fish.shirt}" ${line}/>` : "",
      fish.hair ? `<path d="M40 8Q60-6 78 14Q82 34 76 48Q74 26 62 16Q52 12 40 8Z" fill="#f7d64a" ${line}/>` : "",
      `<path d="M27 58Q42 50 58 58Q60 66 64 78L58 64Q44 64 29 63Z" fill="${fish.lips || fish.skin}" ${line}/>`,
      `<circle cx="37" cy="47" r="1.6" fill="${INK}"/><circle cx="44" cy="46" r="1.6" fill="${INK}"/>`,
      `<ellipse cx="35" cy="30" rx="11" ry="10" fill="#fff" ${line}/><ellipse cx="56" cy="27" rx="12" ry="11" fill="#fff" ${line}/>`,
      `<ellipse cx="34" cy="31" rx="5.5" ry="3.6" fill="${INK}" transform="rotate(-15 34 31)"/><ellipse cx="56" cy="28" rx="6" ry="3.8" fill="${INK}" transform="rotate(-10 56 28)"/>`,
      fish.glasses ? `<circle cx="35" cy="30" r="13" fill="none" ${line}/><circle cx="56" cy="27" r="14" fill="none" ${line}/>` : "",
      fish.hat ? `<path d="M37 9Q36-8 52-8Q68-8 67 9Z" fill="${fish.hat}" ${line}/><ellipse cx="52" cy="9" rx="27" ry="5" fill="${fish.hat}" ${line}/>` : "",
      arm("M31 94Q14 106 6 94Q3 82 14 77"),
      arm("M71 82Q92 92 92 104Q88 112 74 114"),
      `<rect x="29" y="112" width="44" height="7" fill="${INK}"/><rect x="45" y="112" width="11" height="7" fill="#f6c440" stroke="${INK}" stroke-width="1.5"/>`,
    ];
    if (!bust) {
      parts.push(
        `<path d="M29 118H73L75 142L70 188H61L56 146H50L45 188H36L30 142Z" fill="${fish.pants || "#8a4a24"}" ${line}/>`,
        `<path d="M36 188L26 195H45V188ZM61 188L60 195H79L70 188Z" fill="${CREAM}" ${line}/>`
      );
    }
    const viewBox = bust ? "0 -10 100 125" : "0 -10 100 210";
    return `<svg viewBox="${viewBox}" aria-hidden="true">${parts.join("")}</svg>`;
  }

  function flowerSvg(color) {
    const petals = [0, 72, 144, 216, 288]
      .map((a) => `<ellipse cx="20" cy="9" rx="6" ry="9" transform="rotate(${a} 20 20)"/>`)
      .join("");
    return `<svg viewBox="0 0 40 40" aria-hidden="true"><g fill="none" stroke="${color}" stroke-width="2.5">${petals}<circle cx="20" cy="20" r="4"/></g></svg>`;
  }

  const FLOWER_COLORS = ["#8fd3f0", "#f5df6b", "#a9e3c2", "#f3a9c8"];

  const grid = document.getElementById("calendar-grid");
  const monthLabel = document.getElementById("month-label");
  const summary = document.getElementById("month-summary");
  const todayBtn = document.getElementById("today-btn");
  const fishLeft = document.getElementById("fish-left");
  const speech = document.getElementById("speech");

  // ---- State ----
  const today = new Date();
  let year = today.getFullYear();
  let month = today.getMonth();
  const freeDays = loadFreeDays();

  function loadFreeDays() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return new Set(Array.isArray(parsed) ? parsed : []);
    } catch {
      return new Set();
    }
  }

  function saveFreeDays() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...freeDays].sort()));
    } catch {
      // storage full or blocked: keep working in memory
    }
  }

  function pad(n) {
    return String(n).padStart(2, "0");
  }

  function dateKey(y, m, d) {
    return `${y}-${pad(m + 1)}-${pad(d)}`;
  }

  function isCurrentMonth() {
    return year === today.getFullYear() && month === today.getMonth();
  }

  // ---- Rendering ----
  function updateDay(btn) {
    const free = freeDays.has(btn.dataset.date);
    btn.classList.toggle("is-free", free);
    btn.setAttribute("aria-pressed", String(free));
    const date = new Date(btn.dataset.date + "T00:00");
    const text = date.toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric", weekday: "short" });
    btn.setAttribute("aria-label", `${text}：${free ? "参加できる" : "参加できない"}`);
  }

  function updateSummary() {
    const prefix = dateKey(year, month, 1).slice(0, 8);
    const count = [...freeDays].filter((key) => key.startsWith(prefix)).length;
    summary.textContent = count === 0 ? "今月の参加できる日はまだありません" : `今月の参加できる日：${count}日`;
  }

  function blankCell(i) {
    const blank = document.createElement("span");
    blank.className = "day-blank";
    blank.innerHTML = flowerSvg(FLOWER_COLORS[i % FLOWER_COLORS.length]);
    return blank;
  }

  function render() {
    monthLabel.textContent = `${year}年${month + 1}月`;
    todayBtn.hidden = isCurrentMonth();
    grid.replaceChildren();

    const leading = new Date(year, month, 1).getDay(); // Sun-first
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    for (let i = 0; i < leading; i++) grid.append(blankCell(i));

    for (let d = 1; d <= daysInMonth; d++) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "day";
      btn.dataset.date = dateKey(year, month, d);
      const weekday = (leading + d - 1) % 7;
      if (weekday === 0) btn.classList.add("is-sun");
      if (weekday === 6) btn.classList.add("is-sat");
      if (isCurrentMonth() && d === today.getDate()) {
        btn.classList.add("is-today");
        btn.setAttribute("aria-current", "date");
      }
      const fish = FISH[(d * 5 + month * 3) % FISH.length];
      btn.innerHTML = `<span class="day-num">${d}</span><span class="mark" aria-hidden="true"></span><span class="day-fish">${fishSvg(fish, true)}</span>`;
      updateDay(btn);
      grid.append(btn);
    }

    const trailing = (7 - ((leading + daysInMonth) % 7)) % 7;
    for (let i = 0; i < trailing; i++) grid.append(blankCell(i + 1));
    updateSummary();
  }

  function cheer() {
    for (const el of [fishLeft, speech]) {
      el.classList.remove("is-cheering");
      void el.offsetWidth; // restart the animation
      el.classList.add("is-cheering");
    }
  }

  // ---- Events ----
  function shiftMonth(delta) {
    const next = new Date(year, month + delta, 1);
    year = next.getFullYear();
    month = next.getMonth();
    render();
  }

  grid.addEventListener("click", (e) => {
    const btn = e.target.closest(".day");
    if (!btn) return;
    const key = btn.dataset.date;
    if (freeDays.has(key)) freeDays.delete(key);
    else freeDays.add(key);
    saveFreeDays();
    updateDay(btn);
    updateSummary();
    if (freeDays.has(key)) cheer();
  });

  document.getElementById("prev-month").addEventListener("click", () => shiftMonth(-1));
  document.getElementById("next-month").addEventListener("click", () => shiftMonth(1));
  todayBtn.addEventListener("click", () => {
    year = today.getFullYear();
    month = today.getMonth();
    render();
  });

  fishLeft.innerHTML = fishSvg(FISH[0], false);
  document.getElementById("fish-right").innerHTML = fishSvg(FISH[2], false);
  render();
})();
