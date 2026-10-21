// 梅田のスケジュール — infinite month calendar, tap a day to cycle 空欄 → ○ (参加できる) → × (参加できない)
"use strict";

(() => {
  const STORAGE_KEY = "ume:answers"; // { "YYYY-MM-DD": "o" | "x" }; missing = 空欄 (未回答)
  const LEGACY_KEY = "ume:free-days"; // older format: array of ○ dates
  const SHARED_KEY = "ume-N08FfL4x2R0fcgVGb683AHiM"; // textdb.online key shared by everyone; empty = this device only
  const POLL_MS = 15000;
  const NEXT = { "": "o", o: "x", x: "" };
  const LABELS = { "": "未回答", o: "参加できる", x: "参加できない" };

  // Theme colour per month (Jan–Dec): sea gradient, grid lines, weekday header
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

  // ---- Bikini Bottom fish: a seeded random generator, so each date always gets the same fish ----
  const INK = "#1b1b1b";
  const CREAM = "#eadcb4";
  const STRIPE = "#9c8a5c";
  const SKINS = ["#a39459", "#f0784a", "#8fc0d8", "#b9a7dc", "#9fd0a8", "#f2b56b", "#e98fb0", "#c9c25e", "#6fc4c9", "#e86a5a", "#d8c7a0", "#7fb3e8", "#8fcf6a", "#f4a3a3"];
  const FINS = [CREAM, CREAM, "#c5d98a", "#f6c2a0", "#b8d8f0", "#d9c8f2", "#f3d27a"];
  const CLOTHES = ["#9b7fd0", "#6fb7dc", "#e85a4f", "#5fae6e", "#f4c542", "#ffffff", "#f08fb5", "#4a5fae", "#43b3a0", "#9ccbea", "#ff9f43", "#7a3550"];
  const TRUNKS = ["#4b3a8c", "#e8473c", "#2f7d5b", "#2b4d9b", "#e0569a", "#f08c2e"];

  // Body shapes: outline, left/right edge at the waist, eye anchors and mouth anchor
  const SHAPES = {
    bullet: { d: "M30 118L28 52Q27 6 54 5Q75 7 74 46L72 118Z", l: 29, r: 73, eyes: [[36, 28], [57, 25]], mouth: [44, 56] },
    round: { d: "M22 118Q12 74 22 40Q34 8 60 8Q86 12 86 52Q88 96 78 118Z", l: 20, r: 82, eyes: [[38, 30], [61, 26]], mouth: [43, 60] },
    slim: { d: "M36 118L35 48Q35 8 52 6Q67 8 66 42L64 118Z", l: 35, r: 65, eyes: [[44, 22], [61, 22]], mouth: [48, 50] },
  };

  // Hand-tuned regulars from the show's background crowd
  const PRESETS = [
    { // Fred
      shape: "bullet", skin: "#a39459", fin: CREAM, eyeR: 11, eyeTop: false, eyeWhite: "#fff", look: [-0.3, 0.2],
      mouth: "frown", top: "none", bottom: "trousers", arms: "bent", feet: "flipper", nostrils: true, chin: true,
    },
    { // duck lips, spotted trunks, flip-flops
      shape: "bullet", skin: "#b5aa5c", fin: "#c5d98a", eyeR: 11, eyeTop: true, eyeWhite: "#fff", look: [0.2, 0],
      mouth: "duck", top: "none", bottom: "trunks", trunks: "#4b3a8c", spotsOnTrunks: true, arms: "flap", feet: "flipflop", spots: true,
    },
    { // orange fish in a blue shirt
      shape: "slim", skin: "#f0784a", fin: CREAM, eyeR: 10, eyeTop: true, eyeWhite: "#fdf3b0", look: [0, 0],
      mouth: "leaf", top: "shirt", shirt: "#9ccbea", bottom: "shorts", trunks: "#f0784a", arms: "flap", feet: "flipper",
    },
    { // lashes, shell top, ruffled skirt
      shape: "round", skin: "#f0b866", fin: "#f6dcc0", eyeR: 11, eyeTop: false, eyeWhite: "#fff", look: [0.3, 0], lashes: true,
      mouth: "smile", top: "shellbra", bottom: "skirt", trunks: "#9b5fcf", arms: "flap", feet: "sandal",
    },
  ];

  function seededRandom(seed) {
    let h = 2166136261;
    for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
    h ^= h >>> 16; // avalanche so neighbouring dates get unrelated fish
    h = Math.imul(h, 0x85ebca6b);
    h ^= h >>> 13;
    h = Math.imul(h, 0xc2b2ae35);
    h ^= h >>> 16;
    return () => {
      h = (h + 0x6d2b79f5) | 0;
      let t = Math.imul(h ^ (h >>> 15), 1 | h);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function makeFish(seed) {
    const rand = seededRandom(seed);
    const pick = (list) => list[Math.floor(rand() * list.length)];
    if (rand() < 0.3) return pick(PRESETS);
    const lashes = rand() < 0.25;
    const lady = lashes && rand() < 0.6;
    const top = lady ? pick(["shellbra", "shirt"]) : pick(["none", "shirt", "shirt", "shirt", "stripes"]);
    return {
      shape: pick(["bullet", "bullet", "round", "slim"]),
      skin: pick(SKINS),
      fin: pick(FINS),
      eyeR: 8 + rand() * 4,
      eyeTop: rand() < 0.35,
      eyeWhite: rand() < 0.2 ? "#fdf3b0" : "#fff",
      look: [rand() - 0.5, rand() - 0.5],
      lashes,
      mouth: pick(lady ? ["smile", "smile", "frown"] : ["frown", "frown", "duck", "smile", "leaf", "open"]),
      top,
      shirt: pick(CLOTHES),
      bottom: lady ? "skirt" : pick(["trousers", "trunks", "trunks", "shorts"]),
      trunks: pick(TRUNKS),
      spotsOnTrunks: rand() < 0.4,
      pants: pick(["#8a4a24", "#5b4a3a", "#3e4f7a", "#6b6b6b"]),
      arms: pick(["bent", "flap", "flap"]),
      feet: pick(["flipper", "flipflop", "sandal"]),
      hat: rand() < 0.14 ? pick(["#3e5f9e", "#6b4a35", "#e9d9a6", "#2f7d5b"]) : "",
      glasses: rand() < 0.14,
      hair: rand() < 0.1 ? pick(["#f7d64a", "#ffffff", "#8a5a3a"]) : "",
      spots: rand() < 0.25,
      nostrils: rand() < 0.5,
      chin: rand() < 0.3,
    };
  }

  let svgUid = 0; // unique clipPath ids across the page

  function limb(d, color) {
    return `<path d="${d}" fill="none" stroke="${INK}" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>` +
      `<path d="${d}" fill="none" stroke="${color}" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round"/>` +
      `<path d="${d}" fill="none" stroke="${STRIPE}" stroke-width="0.8" opacity="0.6"/>`;
  }

  function mouthSvg(f, mx, my, line) {
    switch (f.mouth) {
      case "duck":
        return `<path d="M${mx - 22} ${my}Q${mx} ${my - 9} ${mx + 22} ${my - 5}Q${mx + 25} ${my + 1} ${mx + 18} ${my + 2}Q${mx} ${my + 1} ${mx - 17} ${my + 8}Q${mx - 26} ${my + 6} ${mx - 22} ${my}Z" fill="#ffb347" ${line}/>` +
          `<path d="M${mx - 18} ${my + 3}Q${mx} ${my - 3} ${mx + 19} ${my - 1}" stroke="#e07b00" stroke-width="2" fill="none"/>`;
      case "smile":
        return `<path d="M${mx - 18} ${my - 4}Q${mx + 2} ${my + 16} ${mx + 22} ${my - 3}Q${mx + 4} ${my + 6} ${mx - 18} ${my - 4}Z" fill="#e2483f" ${line}/>` +
          `<path d="M${mx - 12} ${my}Q${mx + 3} ${my + 8} ${mx + 17} ${my - 1}" stroke="#a8261f" stroke-width="1.6" fill="none"/>`;
      case "leaf":
        return `<path d="M${mx - 14} ${my}Q${mx + 4} ${my - 9} ${mx + 22} ${my - 3}Q${mx + 6} ${my + 6} ${mx - 14} ${my}Z" fill="#a8a050" ${line}/>` +
          `<path d="M${mx - 14} ${my}l-5 7" ${line} fill="none"/>`;
      case "open":
        return `<ellipse cx="${mx + 2}" cy="${my + 2}" rx="8" ry="6" fill="#7a2a3a" ${line}/>`;
      default: // frown with a droopy lip (Fred)
        return `<path d="M${mx - 17} ${my + 2}Q${mx - 2} ${my - 6} ${mx + 14} ${my + 2}Q${mx + 16} ${my + 10} ${mx + 20} ${my + 22}L${mx + 14} ${my + 8}Q${mx} ${my + 8} ${mx - 15} ${my + 7}Z" fill="${f.skin}" ${line}/>`;
    }
  }

  // bust = head and shoulders only (for day cells); otherwise the full figure
  function fishSvg(f, bust) {
    const s = SHAPES[f.shape];
    const { l, r } = s;
    const mid = (l + r) / 2;
    const id = `fc${++svgUid}`;
    const line = `stroke="${INK}" stroke-width="2.6" stroke-linejoin="round"`;
    const clip = `clip-path="url(#${id})"`;
    const parts = [`<defs><clipPath id="${id}"><path d="${s.d}"/></clipPath></defs>`];

    // fins behind the body
    parts.push(
      `<path d="M${r - 12} 8Q${r + 14} 22 ${r + 12} 60Q${r + 10} 88 ${r - 2} 104L${r - 1} 40Q${r - 3} 18 ${r - 12} 8Z" fill="${f.fin}" ${line}/>`,
      `<path d="M${r - 4} 24l9-3M${r} 40l10-1M${r} 56h10M${r} 72l9 2M${r - 1} 88l7 4" stroke="${STRIPE}" stroke-width="1.6"/>`
    );
    if (f.bottom !== "trousers") {
      parts.push(`<path d="M${r - 4} 124Q${r + 16} 116 ${r + 20} 134Q${r + 10} 138 ${r + 16} 154Q${r + 2} 146 ${r - 4} 140Z" fill="${f.fin}" ${line}/>`);
    }

    // legs (under shorts/skirts)
    const legTop = { trunks: 140, shorts: 136, skirt: 134 }[f.bottom];
    if (legTop && !bust) {
      for (const side of [-1, 1]) {
        const x = mid + side * 8;
        const fx = mid + side * 16;
        parts.push(limb(`M${x} ${legTop}Q${x + side * 4} ${legTop + 22} ${x - side * 2} ${legTop + 34}L${fx} 189`, f.fin));
        if (f.feet === "flipflop") parts.push(`<ellipse cx="${fx}" cy="193" rx="10" ry="3.5" fill="#3a9ad9" ${line}/>`);
        else if (f.feet === "sandal") parts.push(`<ellipse cx="${fx}" cy="193" rx="9" ry="3.5" fill="${INK}"/>`);
        parts.push(`<path d="M${fx} 188l${side * 10} 5h${-side * 13}Z" fill="${f.fin}" ${line}/>`);
      }
    }

    // body + clothes clipped to it
    parts.push(`<path d="${s.d}" fill="${f.skin}"/>`);
    if (f.top === "none" && f.bottom !== "trousers") parts.push(`<ellipse cx="${mid}" cy="96" rx="${(r - l) / 3}" ry="14" fill="#fff" opacity="0.18" ${clip}/>`);
    if (f.spots) parts.push(`<g fill="#000" opacity="0.18"><circle cx="${r - 12}" cy="22" r="3"/><circle cx="${r - 6}" cy="30" r="2.5"/><circle cx="${r - 14}" cy="33" r="2.2"/></g>`);
    if (f.chin) parts.push(`<path d="M${mid - 10} 72q-1 12 2 22M${mid - 2} 70q-1 12 1 24" stroke="${INK}" stroke-width="1.4" fill="none"/>`);
    if (f.top === "shirt" || f.top === "stripes") {
      parts.push(`<g ${clip}><path d="M0 84Q50 76 100 82V120H0Z" fill="${f.shirt}" ${line}/>`);
      if (f.top === "stripes") parts.push(`<path d="M0 92H100M0 102H100M0 112H100" stroke="${INK}" stroke-width="5"/>`);
      parts.push(`</g>`);
    }
    if (f.top === "shellbra") {
      parts.push(`<path d="M${l} 90Q${mid} 96 ${r} 88" stroke="${INK}" stroke-width="1.6" fill="none" ${clip}/>`);
      for (const x of [mid - 9, mid + 9]) {
        parts.push(`<path d="M${x - 7} 96Q${x} 82 ${x + 7} 96Z" fill="#b57ad8" ${line}/><path d="M${x} 94V88M${x - 3} 94l-2-4M${x + 3} 94l2-4" stroke="#7d3fa8" stroke-width="1.2"/>`);
      }
    }
    parts.push(`<path d="${s.d}" fill="none" ${line}/>`);

    // face
    if (f.hair) parts.push(`<path d="M${l + 8} 10Q${mid + 6} -8 ${r + 4} 14Q${r + 8} 34 ${r} 46Q${r - 2} 26 ${mid + 8} 16Q${mid - 4} 12 ${l + 8} 10Z" fill="${f.hair}" ${line}/>`);
    const [mx, my] = s.mouth;
    parts.push(mouthSvg(f, mx, my, line));
    if (f.nostrils) parts.push(`<circle cx="${mx - 6}" cy="${my - 10}" r="1.5" fill="${INK}"/><circle cx="${mx + 1}" cy="${my - 11}" r="1.5" fill="${INK}"/>`);
    for (const [ex, ey0] of s.eyes) {
      const ey = f.eyeTop ? ey0 - 16 : ey0;
      const er = f.eyeR;
      parts.push(`<circle cx="${ex}" cy="${ey}" r="${er}" fill="${f.eyeWhite}" ${line}/>`);
      parts.push(`<ellipse cx="${ex + f.look[0] * er * 0.6}" cy="${ey + f.look[1] * er * 0.6}" rx="${er * 0.42}" ry="${er * 0.34}" fill="${INK}"/>`);
      if (f.lashes) parts.push(`<path d="M${ex - 5} ${ey - er + 1}l-3-5M${ex} ${ey - er}v-6M${ex + 5} ${ey - er + 1}l3-5" stroke="${INK}" stroke-width="1.8" stroke-linecap="round"/>`);
      if (f.glasses) parts.push(`<rect x="${ex - er - 3}" y="${ey - er - 3}" width="${2 * er + 6}" height="${2 * er + 6}" rx="4" fill="none" stroke="${INK}" stroke-width="3"/>`);
    }
    if (f.hat) {
      const top = f.eyeTop ? -14 : -4;
      parts.push(`<path d="M${mid - 15} ${top + 14}Q${mid - 16} ${top - 4} ${mid} ${top - 4}Q${mid + 16} ${top - 4} ${mid + 15} ${top + 14}Z" fill="${f.hat}" ${line}/><ellipse cx="${mid}" cy="${top + 14}" rx="27" ry="5" fill="${f.hat}" ${line}/>`);
    }

    // trousers / shorts / skirt
    if (f.bottom === "trousers") {
      parts.push(`<rect x="${l}" y="112" width="${r - l}" height="7" fill="${INK}"/><rect x="${mid - 5}" y="112" width="11" height="7" fill="#f6c440" stroke="${INK}" stroke-width="1.5"/>`);
      if (!bust) {
        parts.push(
          `<path d="M${l} 118H${r}L${r + 2} 142L${r - 3} 188H${mid + 9}L${mid + 4} 146H${mid - 2}L${mid - 7} 188H${l + 6}L${l + 1} 142Z" fill="${f.pants || "#8a4a24"}" ${line}/>`,
          `<path d="M${l + 6} 188L${l - 4} 195H${l + 15}V188ZM${mid + 9} 188L${mid + 8} 195H${mid + 27}L${r - 3} 188Z" fill="${f.fin}" ${line}/>`
        );
      }
    } else if (f.bottom === "skirt") {
      parts.push(`<path d="M${l} 106H${r}L${r + 8} 132Q${r + 2} 137 ${r - 4} 133Q${mid + 8} 140 ${mid} 134Q${mid - 8} 140 ${l + 4} 134Q${l - 2} 138 ${l - 8} 132Z" fill="${f.trunks}" ${line}/>`);
    } else {
      const bottomY = f.bottom === "trunks" ? 144 : 138;
      const shorts = `M${l} 108H${r}L${r + 2} ${bottomY}H${mid + 2}L${mid} ${bottomY - 8}L${mid - 2} ${bottomY}H${l - 2}Z`;
      parts.push(`<defs><clipPath id="${id}t"><path d="${shorts}"/></clipPath></defs><path d="${shorts}" fill="${f.trunks}" ${line}/>`);
      if (f.spotsOnTrunks) parts.push(`<g fill="#fff" clip-path="url(#${id}t)"><path d="M${l + 2} 118q8-6 12 2t-4 10q-10 0-8-12Z"/><path d="M${mid + 6} 112q10-2 10 8t-8 8q-6-8-2-16Z"/><path d="M${l + 6} ${bottomY - 6}q6-6 10 0t-6 6Z"/></g>`);
    }

    // fin-arms on top
    if (f.arms === "bent") {
      parts.push(limb(`M${l + 1} 94Q${l - 16} 106 ${l - 24} 94Q${l - 27} 82 ${l - 16} 77`, f.fin), limb(`M${r - 1} 82Q${r + 20} 92 ${r + 20} 104Q${r + 16} 112 ${r + 2} 114`, f.fin));
    } else {
      parts.push(
        `<path d="M${l + 3} 66Q${l - 12} 90 ${l - 5} 116Q${l + 3} 98 ${l + 6} 72Z" fill="${f.fin}" ${line}/><path d="M${l + 1} 76Q${l - 6} 92 ${l - 3} 106" stroke="${STRIPE}" stroke-width="1.2" fill="none"/>`,
        `<path d="M${r - 3} 66Q${r + 12} 90 ${r + 5} 116Q${r - 3} 98 ${r - 6} 72Z" fill="${f.fin}" ${line}/><path d="M${r - 1} 76Q${r + 6} 92 ${r + 3} 106" stroke="${STRIPE}" stroke-width="1.2" fill="none"/>`
      );
    }

    const viewBox = bust ? "-10 -20 120 136" : "-16 -22 132 222";
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
  const fishRight = document.getElementById("fish-right");
  const speech = document.getElementById("speech");
  const syncStatus = document.getElementById("sync-status");
  const themeColor = document.querySelector('meta[name="theme-color"]');

  // ---- State ----
  const today = new Date();
  let year = today.getFullYear();
  let month = today.getMonth();
  const answers = loadAnswers();

  function loadAnswers() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (parsed && typeof parsed === "object") return parsed;
      const legacy = JSON.parse(localStorage.getItem(LEGACY_KEY));
      return Array.isArray(legacy) ? Object.fromEntries(legacy.map((key) => [key, "o"])) : {};
    } catch {
      return {};
    }
  }

  function saveAnswers() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(answers));
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
    const answer = answers[btn.dataset.date] || "";
    btn.classList.toggle("is-free", answer === "o");
    btn.classList.toggle("is-busy", answer === "x");
    const date = new Date(btn.dataset.date + "T00:00");
    const text = date.toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric", weekday: "short" });
    btn.setAttribute("aria-label", `${text}：${LABELS[answer]}`);
  }

  function updateSummary() {
    const prefix = dateKey(year, month, 1).slice(0, 8);
    const values = Object.keys(answers).filter((key) => key.startsWith(prefix)).map((key) => answers[key]);
    const free = values.filter((v) => v === "o").length;
    const busy = values.length - free;
    summary.textContent = values.length === 0 ? "今月はまだ未回答です" : `○ ${free}日・× ${busy}日`;
  }

  function applyTheme() {
    const [seaTop, seaBottom, gridLine, headBg] = THEMES[month];
    const root = document.documentElement.style;
    root.setProperty("--sea-top", seaTop);
    root.setProperty("--sea-bottom", seaBottom);
    root.setProperty("--grid-line", gridLine);
    root.setProperty("--head-bg", headBg);
    themeColor.content = seaTop;
  }

  function blankCell(i) {
    const blank = document.createElement("span");
    blank.className = "day-blank";
    blank.innerHTML = flowerSvg(FLOWER_COLORS[i % FLOWER_COLORS.length]);
    return blank;
  }

  function render() {
    monthLabel.textContent = `${year}年${month + 1}月`;
    applyTheme();
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
      btn.innerHTML = `<span class="day-num">${d}</span><span class="mark" aria-hidden="true"></span><span class="day-fish">${fishSvg(makeFish(btn.dataset.date), true)}</span>`;
      updateDay(btn);
      grid.append(btn);
    }

    const trailing = (7 - ((leading + daysInMonth) % 7)) % 7;
    for (let i = 0; i < trailing; i++) grid.append(blankCell(i + 1));
    updateSummary();
    renderBanner();
  }

  // Two different banner fish each month
  function renderBanner() {
    const key = `${year}-${month}`;
    const left = makeFish(`banner-left-${key}`);
    let right = makeFish(`banner-right-${key}`);
    for (let i = 0; right === left; i++) right = makeFish(`banner-right-${key}-${i}`);
    fishLeft.innerHTML = fishSvg(left, false);
    fishRight.innerHTML = fishSvg(right, false);
  }

  function cheer() {
    for (const el of [fishLeft, speech]) {
      el.classList.remove("is-cheering");
      void el.offsetWidth; // restart the animation
      el.classList.add("is-cheering");
    }
  }

  // ---- Shared storage (textdb.online): one JSON text value for everyone, no account needed ----
  const TEXTDB = "https://textdb.online";
  let pending = 0; // local writes in flight; remote refreshes wait until they finish
  let writeQueue = Promise.resolve(); // writes run one at a time so they don't overwrite each other

  function setSyncStatus(ok) {
    syncStatus.textContent = ok ? "" : "オフライン：この端末にだけ保存しています";
  }

  async function fetchRemote() {
    const res = await fetch(`${TEXTDB}/${SHARED_KEY}?t=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) throw new Error(`GET ${res.status}`);
    const text = await res.text();
    const data = text ? JSON.parse(text) : {}; // an unused key reads as empty
    return data && typeof data === "object" ? data : {};
  }

  function replaceAnswers(data) {
    for (const key of Object.keys(answers)) delete answers[key];
    for (const [key, value] of Object.entries(data)) {
      if (value === "o" || value === "x") answers[key] = value;
    }
    saveAnswers();
    grid.querySelectorAll(".day").forEach(updateDay);
    updateSummary();
  }

  async function pull() {
    if (!SHARED_KEY || pending || document.hidden) return;
    try {
      const data = await fetchRemote();
      if (!pending) replaceAnswers(data);
      setSyncStatus(true);
    } catch {
      setSyncStatus(false);
    }
  }

  function push(key, value) {
    if (!SHARED_KEY) return;
    pending++;
    writeQueue = writeQueue.then(async () => {
      try {
        const data = await fetchRemote(); // re-read so other people's changes are kept
        if (value) data[key] = value;
        else delete data[key];
        const res = await fetch(`${TEXTDB}/update`, {
          method: "POST",
          body: new URLSearchParams({ key: SHARED_KEY, value: JSON.stringify(data) }),
        });
        const result = await res.json();
        if (result.status !== 1) throw new Error("textdb write failed");
        setSyncStatus(true);
        if (pending === 1) replaceAnswers(data);
      } catch {
        setSyncStatus(false);
      } finally {
        pending--;
      }
    });
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
    const next = NEXT[answers[key] || ""];
    if (next) answers[key] = next;
    else delete answers[key];
    saveAnswers();
    updateDay(btn);
    updateSummary();
    push(key, next);
    if (next === "o") cheer();
  });

  document.getElementById("prev-month").addEventListener("click", () => shiftMonth(-1));
  document.getElementById("next-month").addEventListener("click", () => shiftMonth(1));
  todayBtn.addEventListener("click", () => {
    year = today.getFullYear();
    month = today.getMonth();
    render();
  });

  render();
  pull();
  setInterval(pull, POLL_MS);
  document.addEventListener("visibilitychange", pull);
  window.addEventListener("pageshow", pull); // Safari restores pages from its back/forward cache
})();
