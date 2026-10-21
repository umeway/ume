// Japanese public holidays, computed from the holiday law (祝日法) so any year works.
// Checked against holidays-jp for 2025–2027; equinox formula valid 1980–2099.
"use strict";

const Holidays = (() => {
  const cache = {};

  function nthMonday(y, m, n) {
    return 1 + ((8 - new Date(y, m, 1).getDay()) % 7) + (n - 1) * 7;
  }

  function forYear(y) {
    const list = {}; // "M-D" -> name
    const add = (m, d, name) => { list[`${m}-${d}`] = name; };
    const equinox = 0.242194 * (y - 1980) - Math.floor((y - 1980) / 4);
    // Tokyo Olympics moved three holidays in 2020 and 2021
    const olympics = {
      2020: { sea: [7, 23], sports: [7, 24], mountain: [8, 10] },
      2021: { sea: [7, 22], sports: [7, 23], mountain: [8, 8] },
    }[y];

    add(1, 1, "元日");
    add(1, nthMonday(y, 0, 2), "成人の日");
    add(2, 11, "建国記念の日");
    if (y >= 2020) add(2, 23, "天皇誕生日");
    add(3, Math.floor(20.8431 + equinox), "春分の日");
    add(4, 29, "昭和の日");
    add(5, 3, "憲法記念日");
    add(5, 4, "みどりの日");
    add(5, 5, "こどもの日");
    add(...(olympics ? olympics.sea : [7, nthMonday(y, 6, 3)]), "海の日");
    if (y >= 2016) add(...(olympics ? olympics.mountain : [8, 11]), "山の日");
    add(9, nthMonday(y, 8, 3), "敬老の日");
    add(9, Math.floor(23.2488 + equinox), "秋分の日");
    add(...(olympics ? olympics.sports : [10, nthMonday(y, 9, 2)]), y >= 2020 ? "スポーツの日" : "体育の日");
    add(11, 3, "文化の日");
    add(11, 23, "勤労感謝の日");
    if (y < 2019) add(12, 23, "天皇誕生日");
    if (y === 2019) {
      add(5, 1, "天皇の即位の日");
      add(10, 22, "即位礼正殿の儀");
    }

    const keyOf = (date) => `${date.getMonth() + 1}-${date.getDate()}`;
    const dayAfter = (key, n) => {
      const [m, d] = key.split("-").map(Number);
      return new Date(y, m - 1, d + n);
    };
    const named = Object.keys(list);
    // 国民の休日: a plain day sandwiched between two holidays
    for (const key of named) {
      const between = keyOf(dayAfter(key, 1));
      if (!list[between] && named.includes(keyOf(dayAfter(key, 2)))) list[between] = "国民の休日";
    }
    // 振替休日: a holiday on Sunday moves to the next day that isn't already a holiday
    for (const key of named) {
      if (dayAfter(key, 0).getDay() !== 0) continue;
      let n = 1;
      while (list[keyOf(dayAfter(key, n))]) n++;
      list[keyOf(dayAfter(key, n))] = "振替休日";
    }
    return list;
  }

  // Holiday name for a date (month is 0-based), or "" if it's a normal day
  function name(y, m, d) {
    cache[y] ||= forYear(y);
    return cache[y][`${m + 1}-${d}`] || "";
  }

  return { name };
})();
