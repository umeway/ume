// Cafe Dates 2027 — calendar + plans (select a day, save a cafe date)
"use strict";

(() => {
  const MIN_MONTH = 0; // January 2027
  const MAX_MONTH = 11; // December 2027
  const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  const WEEKDAYS_LONG = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const STORAGE_KEY = "cafe-dates-2027:plans";

  // ---- State ----
  const now = new Date();
  // Start on the current month if today is in 2027, otherwise January.
  let month = now.getFullYear() === 2027 ? now.getMonth() : MIN_MONTH;
  let selectedDayBtn = null; // the .day button that opened the sheet, for focus return

  // ---- Plans ----
  // Each plan: { id, date: "2027-MM-DD", friends, place, time: "HH:MM", note }
  let plans = []; // populated from localStorage (loadPlans runs on init)

  const SEED_PLANS = [
    {
      date: "2027-03-14",
      friends: "Sam & Alex",
      place: "The little latte bar on 5th",
      time: "15:30",
      note: "Latte-art contest — claim the corner table with the plants.",
    },
    {
      date: "2027-06-19",
      friends: "Priya, Dev & Mia",
      place: "Sunrise Roasters",
      time: "11:00",
      note: "Try the matcha flight before the summer menu drops.",
    },
    {
      date: "2027-11-13",
      friends: "The Thursday crew",
      place: "Corner Cup",
      time: "17:00",
      note: "Holiday swap at the big round table near the window.",
    },
  ];

  function makeSeedId(plan) {
    return (
      "seed-" +
      plan.date +
      "-" +
      plan.time +
      "-" +
      String(plan.friends).toLowerCase().replace(/[^a-z0-9]+/g, "-")
    );
  }

  function savePlans() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(plans));
    } catch {
      // Storage unavailable (private mode / quota) — keep plans in memory.
    }
  }

  function loadPlans() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed)) {
          return parsed.filter(
            (p) => p && typeof p.id === "string" && typeof p.date === "string"
          );
        }
      }
    } catch {
      // Corrupt JSON — fall through and reseed.
    }
    // First load (or bad data): seed example 2027 plans.
    const seeded = SEED_PLANS.map((p) => ({ id: makeSeedId(p), ...p }));
    savePlans();
    return seeded;
  }

  function deletePlan(id) {
    const i = plans.findIndex((p) => p.id === id);
    if (i !== -1) {
      plans.splice(i, 1);
    }
    savePlans();
  }

  function addPlan(plan) {
    plans.push(plan);
    savePlans();
  }

  function sortedPlans() {
    return [...plans].sort((a, b) => {
      if (a.date < b.date) return -1;
      if (a.date > b.date) return 1;
      const at = a.time || "23:59";
      const bt = b.time || "23:59";
      if (at < bt) return -1;
      if (at > bt) return 1;
      return 0;
    });
  }

  // ---- DOM ----
  const grid = document.getElementById("calendar-grid");
  const monthLabel = document.getElementById("month-label");
  const prevBtn = document.getElementById("prev-month");
  const nextBtn = document.getElementById("next-month");
  const upcomingList = document.getElementById("upcoming-list");
  const upcomingEmpty = document.getElementById("upcoming-empty");
  const sheet = document.getElementById("plan-sheet");
  const planForm = document.getElementById("plan-form");
  const planCancel = document.getElementById("plan-cancel");

  function renderUpcoming() {
    const frag = document.createDocumentFragment();
    [...upcomingList.querySelectorAll(".plan-card")].forEach((el) => el.remove());

    const sorted = sortedPlans();
    if (sorted.length === 0) {
      upcomingEmpty.hidden = false;
      upcomingList.replaceChildren(frag);
      return;
    }
    upcomingEmpty.hidden = true;

    for (const plan of sorted) {
      const [, m, d] = plan.date.split("-");
      const mon = Number(m);
      const day = Number(d);

      const li = document.createElement("li");
      li.className = "plan-card";

      const date = document.createElement("div");
      date.className = "plan-date";
      const num = document.createElement("span");
      num.className = "plan-date__num";
      num.textContent = String(day);
      const mo = document.createElement("span");
      mo.className = "plan-date__month";
      mo.textContent = MONTHS_SHORT[mon - 1];
      date.append(num, mo);

      const body = document.createElement("div");
      body.className = "plan-body";

      const h3 = document.createElement("h3");
      const who = plan.friends || plan.place || "Cafe date";
      h3.textContent = plan.time ? `${plan.time} · ${who}` : who;

      const meta = document.createElement("p");
      meta.className = "plan-meta";
      meta.textContent = plan.place;
      const note = document.createElement("p");
      note.className = "plan-note";
      note.textContent = plan.note;

      const del = document.createElement("button");
      del.type = "button";
      del.className = "icon-btn";
      del.setAttribute("aria-label", `Delete plan on ${plan.date}${plan.time ? " at " + plan.time : ""}`);
      del.innerHTML = `
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M3 6h18"></path>
          <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2"></path>
          <path d="M5 6l1 14a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-14"></path>
          <path d="M10 11v6"></path>
          <path d="M14 11v6"></path>
        </svg>
      `;
      del.addEventListener("click", () => {
        deletePlan(plan.id);
        render();          // refresh .day--has-plan for the freed day
        renderUpcoming();  // refresh list + empty state
      });

      body.append(h3, meta, note, del);
      li.append(date, body);
      frag.append(li);
    }

    upcomingList.replaceChildren(frag);
  }

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
    const planDates = new Set(plans.map((p) => p.date));
    for (let d = 1; d <= daysInMonth; d += 1) {
      const dateStr = `2027-${pad(month + 1)}-${pad(d)}`;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "day";
      btn.dataset.date = dateStr;
      btn.textContent = String(d);
      const dayName = WEEKDAYS_LONG[(new Date(2027, month, d).getDay() + 6) % 7];
      btn.setAttribute("aria-label", `${dayName} ${d} ${MONTHS[month]} 2027`);
      if (isToday(d)) {
        btn.classList.add("day--today");
      }
      if (planDates.has(dateStr)) {
        btn.classList.add("day--has-plan");
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

  // ---- Plan sheet (day select → dialog → save/cancel/escape) ----

  grid.addEventListener("click", (e) => {
    const btn = e.target.closest(".day:not(.day--empty)");
    if (!btn) return;
    selectDay(btn);
  });

  function selectDay(btn) {
    selectedDayBtn = btn;
    [...grid.querySelectorAll(".day--selected")].forEach((el) => el.classList.remove("day--selected"));
    btn.classList.add("day--selected");
    btn.setAttribute("aria-expanded", "true");

    planForm.reset();
    sheet.showModal();
    // Put initial focus on the first field for quick typing.
    const friends = planForm.elements["friends"];
    if (friends) friends.focus();
  }

  function closeSheet() {
    if (sheet.open) sheet.close();
  }

  // Escape, Cancel, and backdrop close are handled natively by <dialog>;
  // always clear the selection and return focus to the day that opened it.
  sheet.addEventListener("close", () => {
    if (selectedDayBtn) {
      selectedDayBtn.classList.remove("day--selected");
      selectedDayBtn.removeAttribute("aria-expanded");
      selectedDayBtn.focus();
      selectedDayBtn = null;
    }
  });

  planForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const date = selectedDayBtn ? selectedDayBtn.dataset.date : null;
    if (!date) return closeSheet();

    const friends = planForm.elements["friends"].value.trim();
    const place = planForm.elements["place"].value.trim();
    const time = planForm.elements["time"].value;
    const note = planForm.elements["note"].value.trim();

    // Keep at least one core field filled so the plan is meaningful.
    if (!friends && !place) return;

    const id =
      (typeof globalThis.crypto !== "undefined" && crypto.randomUUID)
        ? crypto.randomUUID()
        : `plan-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    addPlan({ id, date, friends, place, time, note });
    render();          // refresh .day--has-plan for the new day
    renderUpcoming();  // refresh list
    closeSheet();
  });

  planCancel.addEventListener("click", closeSheet);

  // ---- Init ----
  plans = loadPlans();
  renderUpcoming();
  render();
})();
