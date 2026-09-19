# CompanionPal GUI: Porcelain style

Reference for redesigning the CompanionPal front end. This file is the
single source of truth for how the app looks. If any screen disagrees with
this file, change the screen, not the file.

## How to apply this file (instructions for the coding agent)

1. Create one shared stylesheet, `public/css/styles.css`, from the starter
   CSS in section 10. Every page links to it. Delete old, unused styles.
2. Restyle pages in this order: Login, Home, Explain this, Is this a scam,
   Step-by-step help, My day, Just chat. Stop after each group and wait for
   "continue".
3. Change only the look (HTML structure, CSS, icons, fonts). Do not touch
   login, sessions, API routes, or Gemini calls. Every feature must keep
   making real AI calls.
4. Use only the tokens in section 2. Never write a raw color, font size, or
   spacing value inside a component.
5. When done, tick the checklist in section 11 and show it as a short table.

## 1. Design idea

Quiet, generous, dignified. Like a well-made paper notebook: lots of empty
space, one clear task per screen, large calm type, nothing decorative. If
an element does not help an older person understand or act, remove it.

The one memorable thing: the large serif greeting on Home ("Good morning,
Margaret."). Everything else stays plain so that moment stands out.

Audience: adults 65+, many with reduced vision, slower reading pace, and
low confidence online. Tone: warm, plain, respectful, never childish.

## 2. Tokens

| Token | Value | Use |
|---|---|---|
| `--bg` | `#F6F8F7` | Page background (porcelain, not pure white) |
| `--surface` | `#FFFFFF` | Rows, inputs, answer boxes |
| `--ink` | `#16221F` | Main text |
| `--ink-soft` | `#4A5754` | Secondary text (about 7:1 on `--bg`) |
| `--line` | `#DDE4E1` | Hairlines and borders |
| `--primary` | `#0E5A5A` | Buttons, links, focus ring (about 8:1 on white) |
| `--primary-ink` | `#FFFFFF` | Text on primary |
| `--tint` | `#E4F0EE` | Hover, pressed, and user chat bubble |
| Safe | bg `#E7F5EC`, ink `#17643A` | Verdict "Looks safe" |
| Careful | bg `#FFF3D6`, ink `#7A4B00` | Verdict "Be careful" |
| Scam and errors | bg `#FDECEA`, ink `#A51D14` | Verdict "Likely a scam", error boxes |

Fonts: **Newsreader** (headings, regular 400 and semibold 600) and
**Atkinson Hyperlegible** (body and UI, regular 400 and bold 700). Load
from Google Fonts with `display=swap`, `preconnect`, and only those four
weights. Keep system fallbacks.

Scale (rem, so the text size control works): body 1.25rem (20px), then
1.5rem, 2rem, and greeting `clamp(2.25rem, 7vw, 3rem)`. Line height 1.6 for
body, 1.2 for headings. Smallest text anywhere is 1.125rem (18px).

Spacing: multiples of 8px only (8, 16, 24, 32, 48, 72). One corner radius
everywhere: 14px. Minimum tap target height: 60px.

## 3. Typography rules

- Sentence case everywhere. No ALL CAPS labels, no tiny captions, no
  italics for emphasis (use bold), no single highlighted word in a heading.
- Reading text width: 38rem maximum (about 60 characters).
- Buttons say the exact action: "Check message", "Read aloud", "Log in".
  Never "Submit". Never append arrows to button text.

## 4. Layout

- One column. Content width `min(100% - 32px, 40rem)`, left-aligned, centered
  on the page. No multi-column grids on any screen size.
- Page padding 24px on phones, 48px on desktop. 48px between sections, 16px
  inside a group.
- One task per screen. Order: title, one line of help, input or content,
  primary action, secondary actions.
- Top bar, 64px tall, plain background with a hairline under it: `Back` and
  `Home` on the left (icon plus word), `Log out` on the right as a text
  button. The text size (`A-`, `A+`) and contrast toggle sit in the same
  bar on wide screens, and in a row under it on phones. Nothing hidden in
  menus.
- No cards inside cards. No shadows anywhere.

## 5. Components

**Primary button:** full width on phones, 60px tall minimum, `--primary`
background, white bold text, 14px radius, icon left plus words. Pressed:
slightly darker and 1px down. One primary button per screen.

**Secondary button:** same size, transparent, 2px `--primary` border,
`--primary` text.

**Action row (Home):** full width, 76px tall minimum, `--surface`, 1px
`--line` border, 14px radius, 12px between rows. Left to right: 26px line
icon in `--primary`, then the title (bold) with one short help line below in
`--ink-soft` at 18px, then a small chevron on the far right. Hover and
press: background `--tint`.

**Input and textarea:** `--surface`, 2px `--line` border, 14px radius, 20px
text, 16px padding, a visible label above (never placeholder-only). The mic
button sits on the right, 48px round, with an `aria-label`.

**Answer box:** `--surface`, 1px `--line`, 14px radius, 24px padding, 16px
between paragraphs. Under it: `Read aloud` and `Copy` secondary buttons,
then "AI can make mistakes. Please double-check important things." at 18px
in `--ink-soft`.

**Verdict band (scam checker):** a wide band at the top of the answer box
with an icon and a word: "Looks safe", "Be careful", "Likely a scam".
Short reasons follow, then a bold "What to do" line.

**Step view:** one step at a time. Heading "Step 2 of 4", a 6px progress
bar, the instruction in 1.5rem, then `Back` and `Next` side by side. This is
the only place numbering appears.

**Chat:** one column. The user's message sits right in a `--tint` bubble,
the companion's message sits left on `--surface`. Max width 85%. The input
bar is fixed at the bottom with the mic and `Send`.

**My day:** reminders as a plain list with hairline dividers and the time in
bold on the left. `Add a reminder` is a secondary button. The daily
briefing sits above the list in an answer box.

**Loading:** the text "Thinking, one moment..." with a slow pulsing dot.
Disable the submit button while loading.

**Error:** scam-colored box, icon, two lines: what happened and what to do.
Example: "We couldn't reach the assistant. Check your internet and press Try
again." Never blame the user.

**Empty state:** one sentence that invites action. Example: "No reminders
yet. Add your first one below."

## 6. Screens

**Login:** centered panel. App name in the heading font, two large labeled
fields, one primary `Log in` button, a plain privacy line, and a small
"Demo login" box listing the dummy credentials.

**Home:**
```
Good morning, Margaret.              serif, the hero
Saturday, 19 September               --ink-soft

[icon] Explain this               >
       Letters and bills
[icon] Is this a scam?            >
       Check a message
[icon] Step-by-step help          >
       Learn something new
[icon] My day                     >
       Reminders for today
[icon] Just chat                  >
       Ask anything
```
One privacy line at the bottom in `--ink-soft`.

**Feature pages:** title (serif, 2rem), one line of help, the input, the
primary action, then the answer box. Nothing else.

## 7. Icons

One set only: inline SVG, 24px (26px on Home rows), 2px stroke, rounded
caps and joins, `currentColor`. Simple metaphors: document, shield, list,
calendar, speech bubble, mic, speaker, chevron, back arrow, home. No emoji.

## 8. Motion

- 150 to 200ms, ease-out, on color and background only.
- Allowed: the loading dot pulse, the progress bar filling, and the answer
  box fading in once.
- No entrance animations on sections, no hover lifts, no bounce, no
  parallax, nothing auto-playing.
- `prefers-reduced-motion: reduce` turns all of it off.

## 9. Accessibility floor (never trade away for looks)

- Text contrast 4.5:1 or better, aiming for 7:1 on body text.
- 3px visible focus outline on every interactive element.
- Tap targets 60px tall or more with 12px between them.
- Every icon-only button has an `aria-label`. Every input has a real label.
- Color is never the only signal: always icon plus word.
- Works at 200% browser zoom and at 360px wide with no sideways scrolling.
- The text size control and high-contrast mode change every page.

Never use: purple or blue gradients, glow, glassmorphism, grids of
identical cards, shadows, ALL CAPS eyebrow labels, light gray text, font
weights below 400, text under 18px, pop-ups, modals, hover-only tooltips,
carousels, or jargon ("Log in", not "Authenticate").

## 10. Starter CSS (`public/css/styles.css`)

```css
@import url("https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:wght@400;700&family=Newsreader:wght@400;600&display=swap");

:root {
  --bg: #F6F8F7; --surface: #FFFFFF; --ink: #16221F; --ink-soft: #4A5754;
  --line: #DDE4E1; --primary: #0E5A5A; --primary-ink: #FFFFFF; --tint: #E4F0EE;
  --safe-bg: #E7F5EC; --safe-ink: #17643A;
  --care-bg: #FFF3D6; --care-ink: #7A4B00;
  --scam-bg: #FDECEA; --scam-ink: #A51D14;
  --font-head: "Newsreader", Georgia, serif;
  --font-body: "Atkinson Hyperlegible", "Segoe UI", Arial, sans-serif;
  --scale: 1;
  --s1: 8px; --s2: 16px; --s3: 24px; --s4: 32px; --s5: 48px; --s6: 72px;
  --radius: 14px; --tap: 60px;
}
:root[data-contrast="high"] {
  --bg: #FFFFFF; --ink: #000000; --ink-soft: #1A1A1A; --line: #000000;
  --primary: #003F3F; --tint: #E6F2F0;
}

* { box-sizing: border-box; }
html { font-size: calc(16px * var(--scale)); }
body {
  margin: 0; background: var(--bg); color: var(--ink);
  font: 400 1.25rem/1.6 var(--font-body);
}
h1, h2 { font-family: var(--font-head); font-weight: 400; line-height: 1.2; margin: 0 0 var(--s1); }
h1 { font-size: 2rem; }
.greeting { font-family: var(--font-head); font-size: clamp(2.25rem, 7vw, 3rem); line-height: 1.15; margin: 0; }
p { margin: 0 0 var(--s2); max-width: 38rem; }
.soft { color: var(--ink-soft); }
.small { font-size: 1.125rem; color: var(--ink-soft); }

:focus-visible { outline: 3px solid var(--primary); outline-offset: 3px; }

.page { width: min(100% - 32px, 40rem); margin: 0 auto; padding: var(--s3) 0 var(--s5); }

.topbar {
  display: flex; align-items: center; justify-content: space-between; gap: var(--s2);
  min-height: 64px; padding: 0 var(--s2); border-bottom: 1px solid var(--line);
  font-size: 1.125rem;
}
.topbar .links { display: flex; gap: var(--s3); }
.linkbtn {
  display: inline-flex; align-items: center; gap: var(--s1); min-height: 48px;
  background: none; border: 0; color: var(--primary); font: inherit; font-weight: 700; cursor: pointer;
}

.btn {
  display: flex; align-items: center; justify-content: center; gap: var(--s1);
  width: 100%; min-height: var(--tap); padding: 0 var(--s3);
  border: 2px solid var(--primary); border-radius: var(--radius);
  background: var(--primary); color: var(--primary-ink);
  font: 700 1.25rem var(--font-body); cursor: pointer;
  transition: background-color 150ms ease-out;
}
.btn:active { transform: translateY(1px); filter: brightness(0.92); }
.btn.secondary { background: transparent; color: var(--primary); }
.btn.secondary:hover { background: var(--tint); }
.btn[aria-busy="true"] { pointer-events: none; opacity: 0.85; }
.actions { display: flex; gap: 12px; margin-top: var(--s2); }
.actions .btn { flex: 1; }

.row {
  display: flex; align-items: center; gap: 14px; min-height: 76px;
  padding: 12px var(--s2); margin-bottom: 12px;
  background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius);
  color: inherit; text-decoration: none; transition: background-color 150ms ease-out;
}
.row:hover, .row:active { background: var(--tint); }
.row .icon { width: 26px; height: 26px; color: var(--primary); flex: none; }
.row .title { display: block; font-weight: 700; }
.row .help { display: block; font-size: 1.125rem; line-height: 1.35; color: var(--ink-soft); }
.row .chev { margin-left: auto; width: 20px; height: 20px; color: var(--ink-soft); flex: none; }

label { display: block; font-weight: 700; margin-bottom: 6px; }
input, textarea {
  width: 100%; padding: var(--s2); font: inherit; color: var(--ink);
  background: var(--surface); border: 2px solid var(--line); border-radius: var(--radius);
}
textarea { min-height: 8rem; resize: vertical; }
.field { margin-bottom: var(--s2); }

.answer { background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius); overflow: hidden; margin-top: var(--s3); }
.answer .body { padding: var(--s3); }
.answer .body p:last-child { margin-bottom: 0; }
.verdict { display: flex; align-items: center; gap: var(--s1); padding: 12px var(--s3); font-weight: 700; }
.verdict.safe { background: var(--safe-bg); color: var(--safe-ink); }
.verdict.careful { background: var(--care-bg); color: var(--care-ink); }
.verdict.scam { background: var(--scam-bg); color: var(--scam-ink); }
.error { display: flex; gap: var(--s1); padding: var(--s2); border-radius: var(--radius); background: var(--scam-bg); color: var(--scam-ink); }

.progress { height: 6px; border-radius: 3px; background: var(--line); margin: 12px 0 var(--s3); }
.progress > i { display: block; height: 100%; border-radius: 3px; background: var(--primary); transition: width 200ms ease-out; }
.step-text { font-family: var(--font-head); font-size: 1.5rem; line-height: 1.4; margin-bottom: var(--s4); }

.chat { display: flex; flex-direction: column; gap: 12px; }
.bubble { max-width: 85%; padding: 12px var(--s2); border-radius: var(--radius); background: var(--surface); border: 1px solid var(--line); }
.bubble.user { align-self: flex-end; background: var(--tint); border-color: var(--tint); }

.loading::after {
  content: ""; display: inline-block; width: 10px; height: 10px; margin-left: 10px;
  border-radius: 50%; background: var(--primary); animation: pulse 1.6s ease-in-out infinite;
}
@keyframes pulse { 50% { opacity: 0.25; } }
.fade-in { animation: fade 200ms ease-out; }
@keyframes fade { from { opacity: 0; } }

@media (min-width: 720px) { .page { padding-top: var(--s5); } }
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation: none !important; transition: none !important; }
}
```

Text size control: set `--scale` on `<html>` to 1, 1.15, or 1.3. Contrast
toggle: set `data-contrast="high"` on `<html>`. Remember both choices in
`localStorage` so they stay between visits.

## 11. Definition of done

- [ ] Every page uses only tokens from section 2 and classes from section 10.
- [ ] Home matches the wireframe in section 6.
- [ ] One primary button per screen.
- [ ] Loading, empty, and error states exist for every feature.
- [ ] Text size control and high-contrast mode work on every page.
- [ ] No horizontal scroll at 360px width.
- [ ] Nothing from the "Never use" list in section 9 appears anywhere.
- [ ] Login, sessions, and all Gemini calls still work exactly as before.
