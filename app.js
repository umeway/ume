// Bikini Bottom Availability — infinite month calendar, tap a day to toggle O (free) / X (busy)
"use strict";

(() => {
  const STORAGE_KEY = "ume:free-days"; // array of "YYYY-MM-DD" marked O; everything else is X
  const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  const grid = document.getElementById("calendar-grid");
  const monthLabel = document.getElementById("month-label");
  const summary = document.getElementById("month-summary");
  const todayBtn = document.getElementById("today-btn");

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
