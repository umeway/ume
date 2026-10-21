# Prompt library for Qwen3.8 on the MacBook Air

Copy, fill in the <...>, paste into opencode (or after a slash command).
Good prompts for a slow local model are **small, concrete and testable**: name the file,
the IDs/classes, and what "done" looks like. One feature per prompt.

## 1. Start a site (use with /plan)
/plan A <type of site> for <audience>. Pages/sections: <list>. Look and feel: <palette, mood,
2-3 adjectives>, mobile-first for a 390px phone, dark mode. Interactions: <list>. Data: <static,
or saved in localStorage>.

Example:
/plan A one-page recipe box for home cooks. Sections: header, search, recipe cards, a recipe detail
sheet. Warm, calm, modern; olive and cream palette; mobile-first 390px; dark mode. Search filters
cards as you type; tapping a card opens the sheet. 8 sample recipes hard-coded in app.js.

## 2. Scaffold the page (first step, if not using /plan)
Create index.html and style.css only. index.html: viewport meta, <header> with <logo/title>,
<main> with <sections and their IDs>, <footer>. style.css: the full visual design (<palette>,
rounded cards, soft shadows, 44px tap targets, prefers-color-scheme dark). Leave app.js as an
empty file linked with defer.

## 3. Add one feature
Read index.html and app.js. Add <feature> to app.js with small edits: <exact behaviour>.
Use the existing IDs <#a, #b> and classes <.x, .y>. Add CSS only if a needed class is missing.

## 4. Fix a bug  (/fix ...)
/fix On a 390px screen <what you see> instead of <what you expect>. It happens when <steps>.

## 5. Visual polish (one area at a time)
Improve only the <header | cards | buttons> styling in style.css: <concrete change, e.g. larger
title, tighter letter-spacing, softer shadow, accent colour on hover>. Do not touch HTML or JS.

## 6. Accessibility pass
Check index.html and app.js for: missing labels, icon buttons without aria-label, focus not
returning after closing dialogs, contrast under 4.5:1 in light and dark. Fix with small edits.

## 7. Content
Replace the placeholder text in <section> with <your real text>. Keep the structure.

## Prompts that go badly on this machine
- "Build the whole app" in one prompt (thinks for an hour, writes nothing).
- "Make it look better" (vague: big rewrites, loses things). Name the area and the change.
- "Rewrite app.js" (slow; edits are 5-10x cheaper).
- Pasting big files into the prompt (slow prefill). Say "read <file>" instead.
