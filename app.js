// Cafe Dates 2027 — main app script (calendar first; plans coming next)
"use strict";

(() => {
  const MIN_MONTH = 0; // January 2027
  const MAX_MONTH = 11; // December 2027
  const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  const WEEKDAYS_LONG = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  // ---- State ----
  const now = new Date();
  // Start on the current month if today is in 2027, otherwise January.
  let month = now.getFullYear() === 2027 ? now.getMonth() : MIN_MONTH;

  // ---- Plans (hook for the next step) ----
  const plans = []; // future: { date: "2027-MM-DD", friends, place, time, note }

  function renderUpcoming() {
    // stub — fills #upcoming-list from `plans`; implemented in a later step
  }

  // ---- DOM ----
  const grid = document.getElementById("calendar-grid");
  const monthLabel = document.getElementById("month-label");
  const prevBtn = document.getElementById("prev-month");
  const nextBtn = document.getElementById("next-month");

  function pad(n) {
    return String(n).padStart(2, "0");
  }

  function render() {
    monthLabel.textContent = `${MONTHS[month]} 2027`;
    prevBtn.disabled = month === MIN_MONTH;
    nextBtn.disabled = month === MAX_MONTH;

    const first = new Date(2027, month, 1);
    const daysInMonth = new Date(2027, month + 1, 0).getDate();
    // getDay(): 0 = Sun … 6 = Sat → Monday-start leading blanks
    const leading = (first.getDay() + 6) % 7;

    const isToday = (d) =>
      now.getFullYear() === 2027 && now.getMonth() === month && now.getDate() === d;

    const frag = document.createDocumentFragment();
    for (let i = 0; i < leading; i += 1) {
      const blank = document.createElement("div");
      blank.className = "day day--empty";
      frag.append(blank);
    }
    for (let d = 1; d <= daysInMonth; d += 1) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "day";
      btn.dataset.date = `2027-${pad(month + 1)}-${pad(d)}`;
      btn.textContent = String(d);
      const dayName = WEEKDAYS_LONG[(new Date(2027, month, d).getDay() + 6) % 7];
      btn.setAttribute("aria-label", `${dayName} ${d} ${MONTHS[month]} 2027`);
      if (isToday(d)) {
        btn.classList.add("day--today");
      }
      frag.append(btn);
    }
    grid.replaceChildren(frag);
  }

  prevBtn.addEventListener("click", () => {
    if (month > MIN_MONTH) {
      month -= 1;
      render();
    }
  });

  nextBtn.addEventListener("click", () => {
    if (month < MAX_MONTH) {
      month += 1;
      render();
    }
  });

  renderUpcoming();
  render();
})();
