// Bikini Bottom Availability — infinite month calendar, tap a day to toggle O (free) / X (busy)
"use strict";

(() => {
  const STORAGE_KEY = "ume:free-days"; // array of "YYYY-MM-DD" marked O; everything else is X
  const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  // ---- The incidental fish of Bikini Bottom (one featured per month) ----
  const INK = "#13324a";
  const CAST = [
    {
      name: "Fred",
      body: "#f28c5b", fin: "#d9643a",
      extra: `<path d="M48 64v12h-8M70 64v12h8" stroke="${INK}" stroke-width="3" fill="none" stroke-linecap="round"/><rect x="43" y="68" width="10" height="5" rx="2" fill="#fff" stroke="${INK}" stroke-width="1.5"/>`,
      hello: "Welcome to Bikini Bottom! Just watch where you tap.",
      free: "A free day? Finally, my leg gets a rest.",
      busy: "MY LEG!",
    },
    {
      name: "Tom",
      body: "#8fc7a2", fin: "#5f9e77",
      extra: `<path d="M98 46q8 3 12-2" stroke="#6b3b1f" stroke-width="5" fill="none" stroke-linecap="round"/>`,
      hello: "Tap a day. Any day. Do it for the chocolate.",
      free: "CHOCOLATE! I mean… free day!",
      busy: "Busy?! No chocolate today…",
    },
    {
      name: "Bubble Bass",
      body: "#6f9fd8", fin: "#4a78b3", big: true,
      extra: `<path d="M92 50q-6 6-14 2M92 50q6 6 14 2" stroke="${INK}" stroke-width="3" fill="${INK}"/>`,
      hello: "I'll be checking every single date. Thoroughly.",
      free: "Free. Hm. Suspiciously free.",
      busy: "Busy? You forgot the pickles!",
    },
    {
      name: "Scooter",
      body: "#ffb84d", fin: "#e8902a",
      extra: `<path d="M70 16q4-14 14-10q-6 2-4 8q6-6 12-2q-8 2-8 8" fill="#fff36b" stroke="${INK}" stroke-width="2"/>`,
      hello: "Whoa, dude! Gnarly calendar!",
      free: "Free day, dude! Surf's up!",
      busy: "Bummer, dude. Totally busy.",
    },
    {
      name: "Harold",
      body: "#b2d35a", fin: "#86a838",
      extra: `<circle cx="86" cy="32" r="11" fill="none" stroke="${INK}" stroke-width="3"/><path d="M75 30h-8" stroke="${INK}" stroke-width="3"/>`,
      hello: "Harold here. I've reviewed your schedule.",
      free: "Free. Duly noted.",
      busy: "Busy. As expected.",
    },
    {
      name: "Nancy",
      body: "#f59ac0", fin: "#e06b9d",
      extra: `<path d="M56 14l-10-8v16zM56 14l10-8v16z" fill="#ff4f9a" stroke="${INK}" stroke-width="2"/><circle cx="56" cy="14" r="3" fill="${INK}"/>`,
      hello: "Ooh, a calendar! Let's fill it with O's.",
      free: "Yay, a free day!",
      busy: "Aww, busy again?",
    },
    {
      name: "Old Man Jenkins",
      body: "#b9b1a6", fin: "#958b7e",
      extra: `<path d="M78 21l14 3" stroke="#fff" stroke-width="4" stroke-linecap="round"/><path d="M104 50q-6 10-16 6" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round"/>`,
      hello: "Back in my day, calendars only had X's.",
      free: "Free? In my day we called that a nap.",
      busy: "Busy, busy… just like the old days.",
    },
  ];

  function fishSvg(fish) {
    const rx = fish.big ? 44 : 38;
    const ry = fish.big ? 30 : 24;
    return `<svg viewBox="0 0 120 84" width="120" height="84">
      <path d="M26 42 6 22l5 20-5 20z" fill="${fish.fin}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
      <path d="M48 ${42 - ry + 2}q14-16 28 0" fill="${fish.fin}" stroke="${INK}" stroke-width="3"/>
      <ellipse cx="64" cy="42" rx="${rx}" ry="${ry}" fill="${fish.body}" stroke="${INK}" stroke-width="3"/>
      <path d="M58 46q4 8 10 0" fill="${fish.fin}" stroke="${INK}" stroke-width="2.5"/>
      <circle cx="86" cy="32" r="8" fill="#fff" stroke="${INK}" stroke-width="2.5"/>
      <circle cx="88" cy="32" r="3.5" fill="${INK}"/>
      <path d="M96 48q5 3 9-1" stroke="${INK}" stroke-width="3" fill="none" stroke-linecap="round"/>
      ${fish.extra}
    </svg>`;
  }

  const grid = document.getElementById("calendar-grid");
  const monthLabel = document.getElementById("month-label");
  const summary = document.getElementById("month-summary");
  const todayBtn = document.getElementById("today-btn");
  const castArt = document.getElementById("cast-art");
  const castName = document.getElementById("cast-name");
  const castLine = document.getElementById("cast-line");

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
  function featuredFish() {
    return CAST[(year * 12 + month) % CAST.length];
  }

  function renderCast() {
    const fish = featuredFish();
    castArt.innerHTML = fishSvg(fish);
    castName.textContent = fish.name;
    castLine.textContent = fish.hello;
  }

  function react(free) {
    castLine.textContent = featuredFish()[free ? "free" : "busy"];
    castArt.classList.remove("is-wiggling");
    void castArt.offsetWidth; // restart the animation
    castArt.classList.add("is-wiggling");
  }

  function dayLabel(date, free) {
    const text = date.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
    return `${text}: ${free ? "free" : "busy"}`;
  }

  function updateDay(btn) {
    const free = freeDays.has(btn.dataset.date);
    btn.classList.toggle("is-free", free);
    btn.setAttribute("aria-pressed", String(free));
    btn.querySelector(".mark").textContent = free ? "O" : "X";
    btn.setAttribute("aria-label", dayLabel(new Date(btn.dataset.date + "T00:00"), free));
  }

  function updateSummary() {
    const prefix = dateKey(year, month, 1).slice(0, 8);
    const count = [...freeDays].filter((key) => key.startsWith(prefix)).length;
    summary.textContent = count === 0 ? "No free days yet." : `${count} free day${count === 1 ? "" : "s"}`;
  }

  function render() {
    monthLabel.textContent = `${MONTHS[month]} ${year}`;
    todayBtn.hidden = isCurrentMonth();
    grid.replaceChildren();

    const leading = (new Date(year, month, 1).getDay() + 6) % 7; // Mon-first offset
    for (let i = 0; i < leading; i++) {
      const blank = document.createElement("span");
      blank.className = "day-blank";
      grid.append(blank);
    }

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "day";
      btn.dataset.date = dateKey(year, month, d);
      if (isCurrentMonth() && d === today.getDate()) {
        btn.classList.add("is-today");
        btn.setAttribute("aria-current", "date");
      }
      btn.innerHTML = `<span class="day-num">${d}</span><span class="mark" aria-hidden="true"></span>`;
      updateDay(btn);
      grid.append(btn);
    }
    updateSummary();
    renderCast();
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
    react(freeDays.has(key));
  });

  document.getElementById("prev-month").addEventListener("click", () => shiftMonth(-1));
  document.getElementById("next-month").addEventListener("click", () => shiftMonth(1));
  todayBtn.addEventListener("click", () => {
    year = today.getFullYear();
    month = today.getMonth();
    render();
  });

  render();
})();
