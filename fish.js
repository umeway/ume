// Bikini Bottom background fish: a seeded random generator, so a seed (e.g. a date) always draws the same fish
"use strict";

const Fish = (() => {
  const INK = "#1b1b1b";
  const CREAM = "#eadcb4";
  const STRIPE = "#9c8a5c";
  const PRESET_CHANCE = 0.3;
  const SKINS = ["#a39459", "#f0784a", "#8fc0d8", "#b9a7dc", "#9fd0a8", "#f2b56b", "#e98fb0", "#c9c25e", "#6fc4c9", "#e86a5a", "#d8c7a0", "#7fb3e8", "#8fcf6a", "#f4a3a3"];
  const FINS = [CREAM, CREAM, "#c5d98a", "#f6c2a0", "#b8d8f0", "#d9c8f2", "#f3d27a"];
  const SHIRTS = ["#9b7fd0", "#6fb7dc", "#e85a4f", "#5fae6e", "#f4c542", "#ffffff", "#f08fb5", "#4a5fae", "#43b3a0", "#9ccbea", "#ff9f43", "#7a3550"];
  const BOTTOM_COLORS = ["#4b3a8c", "#e8473c", "#2f7d5b", "#2b4d9b", "#e0569a", "#f08c2e"];
  const PANTS = ["#8a4a24", "#5b4a3a", "#3e4f7a", "#6b6b6b"];

  // Body outline, left/right edge at the waist, eye anchors and mouth anchor
  const SHAPES = {
    bullet: { d: "M30 118L28 52Q27 6 54 5Q75 7 74 46L72 118Z", l: 29, r: 73, eyes: [[36, 28], [57, 25]], mouth: [44, 56] },
    round: { d: "M22 118Q12 74 22 40Q34 8 60 8Q86 12 86 52Q88 96 78 118Z", l: 20, r: 82, eyes: [[38, 30], [61, 26]], mouth: [43, 60] },
    slim: { d: "M36 118L35 48Q35 8 52 6Q67 8 66 42L64 118Z", l: 35, r: 65, eyes: [[44, 22], [61, 22]], mouth: [48, 50] },
  };

  // Where legs start and where the hem sits for each kind of bottom (trousers draw their own legs)
  const BOTTOMS = { trunks: { leg: 140, hem: 144 }, shorts: { leg: 136, hem: 138 }, skirt: { leg: 134 } };

  // Hand-tuned regulars from the show's background crowd
  const PRESETS = [
    { // Fred
      shape: "bullet", skin: "#a39459", fin: CREAM, eyeR: 11, eyeTop: false, eyeWhite: "#fff", look: [-0.3, 0.2],
      mouth: "frown", top: "none", bottom: "trousers", pants: "#8a4a24", arms: "bent", feet: "flipper", nostrils: true, chin: true,
    },
    { // duck lips, spotted trunks, flip-flops
      shape: "bullet", skin: "#b5aa5c", fin: "#c5d98a", eyeR: 11, eyeTop: true, eyeWhite: "#fff", look: [0.2, 0],
      mouth: "duck", top: "none", bottom: "trunks", bottomColor: "#4b3a8c", bottomSpots: true, arms: "flap", feet: "flipflop", spots: true,
    },
    { // orange fish in a blue shirt
      shape: "slim", skin: "#f0784a", fin: CREAM, eyeR: 10, eyeTop: true, eyeWhite: "#fdf3b0", look: [0, 0],
      mouth: "leaf", top: "shirt", shirt: "#9ccbea", bottom: "shorts", bottomColor: "#f0784a", arms: "flap", feet: "flipper",
    },
    { // lashes, shell top, ruffled skirt
      shape: "round", skin: "#f0b866", fin: "#f6dcc0", eyeR: 11, eyeTop: false, eyeWhite: "#fff", look: [0.3, 0], lashes: true,
      mouth: "smile", top: "shellbra", bottom: "skirt", bottomColor: "#9b5fcf", arms: "flap", feet: "sandal",
    },
  ];

  // FNV-1a hash + avalanche, then mulberry32: neighbouring seeds give unrelated sequences
  function seededRandom(seed) {
    let h = 2166136261;
    for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
    h ^= h >>> 16;
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

  function make(seed) {
    const rand = seededRandom(seed);
    const pick = (list) => list[Math.floor(rand() * list.length)];
    if (rand() < PRESET_CHANCE) return pick(PRESETS);
    const lashes = rand() < 0.25;
    const lady = lashes && rand() < 0.6;
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
      top: lady ? pick(["shellbra", "shirt"]) : pick(["none", "shirt", "shirt", "shirt", "stripes"]),
      shirt: pick(SHIRTS),
      bottom: lady ? "skirt" : pick(["trousers", "trunks", "trunks", "shorts"]),
      bottomColor: pick(BOTTOM_COLORS),
      bottomSpots: rand() < 0.4,
      pants: pick(PANTS),
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

  // ---- SVG drawing ----
  const LINE = `stroke="${INK}" stroke-width="2.6" stroke-linejoin="round"`;
  const ROUND = `stroke-linecap="round" stroke-linejoin="round"`;
  let uid = 0; // unique clipPath ids across the page

  // Striped tube for arms and legs: ink outline, coloured fill, faint stripe
  function limb(d, color) {
    return `<path d="${d}" fill="none" stroke="${INK}" stroke-width="9" ${ROUND}/>` +
      `<path d="${d}" fill="none" stroke="${color}" stroke-width="5.5" ${ROUND}/>` +
      `<path d="${d}" fill="none" stroke="${STRIPE}" stroke-width="0.8" opacity="0.6"/>`;
  }

  function backFins(f, { r }) {
    const tail = f.bottom === "trousers" ? "" :
      `<path d="M${r - 4} 124Q${r + 16} 116 ${r + 20} 134Q${r + 10} 138 ${r + 16} 154Q${r + 2} 146 ${r - 4} 140Z" fill="${f.fin}" ${LINE}/>`;
    return `<path d="M${r - 12} 8Q${r + 14} 22 ${r + 12} 60Q${r + 10} 88 ${r - 2} 104L${r - 1} 40Q${r - 3} 18 ${r - 12} 8Z" fill="${f.fin}" ${LINE}/>` +
      `<path d="M${r - 4} 24l9-3M${r} 40l10-1M${r} 56h10M${r} 72l9 2M${r - 1} 88l7 4" stroke="${STRIPE}" stroke-width="1.6"/>` + tail;
  }

  function legs(f, mid) {
    const top = BOTTOMS[f.bottom]?.leg;
    if (!top) return "";
    return [-1, 1].map((side) => {
      const x = mid + side * 8;
      const fx = mid + side * 16;
      const shoe = f.feet === "flipflop" ? `<ellipse cx="${fx}" cy="193" rx="10" ry="3.5" fill="#3a9ad9" ${LINE}/>` :
        f.feet === "sandal" ? `<ellipse cx="${fx}" cy="193" rx="9" ry="3.5" fill="${INK}"/>` : "";
      return limb(`M${x} ${top}Q${x + side * 4} ${top + 22} ${x - side * 2} ${top + 34}L${fx} 189`, f.fin) + shoe +
        `<path d="M${fx} 188l${side * 10} 5h${-side * 13}Z" fill="${f.fin}" ${LINE}/>`;
    }).join("");
  }

  function body(f, s, id) {
    const { l, r } = s;
    const mid = (l + r) / 2;
    const clip = `clip-path="url(#${id})"`;
    let out = `<path d="${s.d}" fill="${f.skin}"/>`;
    if (f.top === "none" && f.bottom !== "trousers") out += `<ellipse cx="${mid}" cy="96" rx="${(r - l) / 3}" ry="14" fill="#fff" opacity="0.18" ${clip}/>`;
    if (f.spots) out += `<g fill="#000" opacity="0.18"><circle cx="${r - 12}" cy="22" r="3"/><circle cx="${r - 6}" cy="30" r="2.5"/><circle cx="${r - 14}" cy="33" r="2.2"/></g>`;
    if (f.chin) out += `<path d="M${mid - 10} 72q-1 12 2 22M${mid - 2} 70q-1 12 1 24" stroke="${INK}" stroke-width="1.4" fill="none"/>`;
    if (f.top === "shirt" || f.top === "stripes") {
      const stripes = f.top === "stripes" ? `<path d="M0 92H100M0 102H100M0 112H100" stroke="${INK}" stroke-width="5"/>` : "";
      out += `<g ${clip}><path d="M0 84Q50 76 100 82V120H0Z" fill="${f.shirt}" ${LINE}/>${stripes}</g>`;
    }
    if (f.top === "shellbra") {
      out += `<path d="M${l} 90Q${mid} 96 ${r} 88" stroke="${INK}" stroke-width="1.6" fill="none" ${clip}/>`;
      for (const x of [mid - 9, mid + 9]) {
        out += `<path d="M${x - 7} 96Q${x} 82 ${x + 7} 96Z" fill="#b57ad8" ${LINE}/><path d="M${x} 94V88M${x - 3} 94l-2-4M${x + 3} 94l2-4" stroke="#7d3fa8" stroke-width="1.2"/>`;
      }
    }
    return out + `<path d="${s.d}" fill="none" ${LINE}/>`;
  }

  function mouth(f, mx, my) {
    switch (f.mouth) {
      case "duck":
        return `<path d="M${mx - 22} ${my}Q${mx} ${my - 9} ${mx + 22} ${my - 5}Q${mx + 25} ${my + 1} ${mx + 18} ${my + 2}Q${mx} ${my + 1} ${mx - 17} ${my + 8}Q${mx - 26} ${my + 6} ${mx - 22} ${my}Z" fill="#ffb347" ${LINE}/>` +
          `<path d="M${mx - 18} ${my + 3}Q${mx} ${my - 3} ${mx + 19} ${my - 1}" stroke="#e07b00" stroke-width="2" fill="none"/>`;
      case "smile":
        return `<path d="M${mx - 18} ${my - 4}Q${mx + 2} ${my + 16} ${mx + 22} ${my - 3}Q${mx + 4} ${my + 6} ${mx - 18} ${my - 4}Z" fill="#e2483f" ${LINE}/>` +
          `<path d="M${mx - 12} ${my}Q${mx + 3} ${my + 8} ${mx + 17} ${my - 1}" stroke="#a8261f" stroke-width="1.6" fill="none"/>`;
      case "leaf":
        return `<path d="M${mx - 14} ${my}Q${mx + 4} ${my - 9} ${mx + 22} ${my - 3}Q${mx + 6} ${my + 6} ${mx - 14} ${my}Z" fill="#a8a050" ${LINE}/>` +
          `<path d="M${mx - 14} ${my}l-5 7" ${LINE} fill="none"/>`;
      case "open":
        return `<ellipse cx="${mx + 2}" cy="${my + 2}" rx="8" ry="6" fill="#7a2a3a" ${LINE}/>`;
      default: // frown with a droopy lip (Fred)
        return `<path d="M${mx - 17} ${my + 2}Q${mx - 2} ${my - 6} ${mx + 14} ${my + 2}Q${mx + 16} ${my + 10} ${mx + 20} ${my + 22}L${mx + 14} ${my + 8}Q${mx} ${my + 8} ${mx - 15} ${my + 7}Z" fill="${f.skin}" ${LINE}/>`;
    }
  }

  function face(f, s) {
    const { l, r } = s;
    const mid = (l + r) / 2;
    const [mx, my] = s.mouth;
    let out = "";
    if (f.hair) out += `<path d="M${l + 8} 10Q${mid + 6} -8 ${r + 4} 14Q${r + 8} 34 ${r} 46Q${r - 2} 26 ${mid + 8} 16Q${mid - 4} 12 ${l + 8} 10Z" fill="${f.hair}" ${LINE}/>`;
    out += mouth(f, mx, my);
    if (f.nostrils) out += `<circle cx="${mx - 6}" cy="${my - 10}" r="1.5" fill="${INK}"/><circle cx="${mx + 1}" cy="${my - 11}" r="1.5" fill="${INK}"/>`;
    for (const [ex, baseY] of s.eyes) {
      const ey = f.eyeTop ? baseY - 16 : baseY;
      const er = f.eyeR;
      out += `<circle cx="${ex}" cy="${ey}" r="${er}" fill="${f.eyeWhite}" ${LINE}/>` +
        `<ellipse cx="${ex + f.look[0] * er * 0.6}" cy="${ey + f.look[1] * er * 0.6}" rx="${er * 0.42}" ry="${er * 0.34}" fill="${INK}"/>`;
      if (f.lashes) out += `<path d="M${ex - 5} ${ey - er + 1}l-3-5M${ex} ${ey - er}v-6M${ex + 5} ${ey - er + 1}l3-5" stroke="${INK}" stroke-width="1.8" stroke-linecap="round"/>`;
      if (f.glasses) out += `<rect x="${ex - er - 3}" y="${ey - er - 3}" width="${2 * er + 6}" height="${2 * er + 6}" rx="4" fill="none" stroke="${INK}" stroke-width="3"/>`;
    }
    if (f.hat) {
      const top = f.eyeTop ? -14 : -4;
      out += `<path d="M${mid - 15} ${top + 14}Q${mid - 16} ${top - 4} ${mid} ${top - 4}Q${mid + 16} ${top - 4} ${mid + 15} ${top + 14}Z" fill="${f.hat}" ${LINE}/>` +
        `<ellipse cx="${mid}" cy="${top + 14}" rx="27" ry="5" fill="${f.hat}" ${LINE}/>`;
    }
    return out;
  }

  function bottom(f, { l, r }, id, bust) {
    const mid = (l + r) / 2;
    if (f.bottom === "trousers") {
      const belt = `<rect x="${l}" y="112" width="${r - l}" height="7" fill="${INK}"/><rect x="${mid - 5}" y="112" width="11" height="7" fill="#f6c440" stroke="${INK}" stroke-width="1.5"/>`;
      if (bust) return belt;
      return belt +
        `<path d="M${l} 118H${r}L${r + 2} 142L${r - 3} 188H${mid + 9}L${mid + 4} 146H${mid - 2}L${mid - 7} 188H${l + 6}L${l + 1} 142Z" fill="${f.pants}" ${LINE}/>` +
        `<path d="M${l + 6} 188L${l - 4} 195H${l + 15}V188ZM${mid + 9} 188L${mid + 8} 195H${mid + 27}L${r - 3} 188Z" fill="${f.fin}" ${LINE}/>`;
    }
    if (f.bottom === "skirt") {
      return `<path d="M${l} 106H${r}L${r + 8} 132Q${r + 2} 137 ${r - 4} 133Q${mid + 8} 140 ${mid} 134Q${mid - 8} 140 ${l + 4} 134Q${l - 2} 138 ${l - 8} 132Z" fill="${f.bottomColor}" ${LINE}/>`;
    }
    const hem = BOTTOMS[f.bottom].hem;
    const shape = `M${l} 108H${r}L${r + 2} ${hem}H${mid + 2}L${mid} ${hem - 8}L${mid - 2} ${hem}H${l - 2}Z`;
    const spots = f.bottomSpots ?
      `<g fill="#fff" clip-path="url(#${id}t)"><path d="M${l + 2} 118q8-6 12 2t-4 10q-10 0-8-12Z"/><path d="M${mid + 6} 112q10-2 10 8t-8 8q-6-8-2-16Z"/><path d="M${l + 6} ${hem - 6}q6-6 10 0t-6 6Z"/></g>` : "";
    return `<defs><clipPath id="${id}t"><path d="${shape}"/></clipPath></defs><path d="${shape}" fill="${f.bottomColor}" ${LINE}/>` + spots;
  }

  function arms(f, { l, r }) {
    if (f.arms === "bent") {
      return limb(`M${l + 1} 94Q${l - 16} 106 ${l - 24} 94Q${l - 27} 82 ${l - 16} 77`, f.fin) +
        limb(`M${r - 1} 82Q${r + 20} 92 ${r + 20} 104Q${r + 16} 112 ${r + 2} 114`, f.fin);
    }
    return `<path d="M${l + 3} 66Q${l - 12} 90 ${l - 5} 116Q${l + 3} 98 ${l + 6} 72Z" fill="${f.fin}" ${LINE}/><path d="M${l + 1} 76Q${l - 6} 92 ${l - 3} 106" stroke="${STRIPE}" stroke-width="1.2" fill="none"/>` +
      `<path d="M${r - 3} 66Q${r + 12} 90 ${r + 5} 116Q${r - 3} 98 ${r - 6} 72Z" fill="${f.fin}" ${LINE}/><path d="M${r - 1} 76Q${r + 6} 92 ${r + 3} 106" stroke="${STRIPE}" stroke-width="1.2" fill="none"/>`;
  }

  // bust = head and shoulders only (day cells); otherwise the full figure (banner)
  function svg(f, bust) {
    const s = SHAPES[f.shape];
    const id = `fc${++uid}`;
    const viewBox = bust ? "-10 -20 120 136" : "-16 -22 132 222";
    return `<svg viewBox="${viewBox}" aria-hidden="true"><defs><clipPath id="${id}"><path d="${s.d}"/></clipPath></defs>` +
      backFins(f, s) + (bust ? "" : legs(f, (s.l + s.r) / 2)) + body(f, s, id) + face(f, s) + bottom(f, s, id, bust) + arms(f, s) +
      `</svg>`;
  }

  return { make, svg };
})();
