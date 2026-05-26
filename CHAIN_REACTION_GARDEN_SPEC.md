# Chain Reaction Garden — Build Specification

A minimalist HTML5 puzzle game built around a single rule of a cellular automaton.
This document is the complete specification. Build the game to match it exactly.
When in doubt between deviating from this spec and adding polish, follow the spec.

All level designs in section 11 have been verified solvable by a brute-force search.
Do not change starting states, goals, seed counts, or tick budgets without re-verifying.

---

## 1. Concept

The player sees a 5×5 grid of circular cells. Each cell is either empty or alive.
A target pattern is drawn as an outline overlay on top of the same grid.

The player has a limited inventory of seeds and a limited number of ticks. On each
turn the player may either place one seed in any empty cell, or advance the
simulation by one tick. The grid evolves under one fixed rule. The level is solved
when the live cells match the target pattern.

The puzzle is about predicting how seed placements will propagate through the garden
under a deterministic rule.

---

## 2. The Rule

There is exactly one rule. It applies uniformly to every cell on every tick.

> A cell is alive on the next tick if and only if it has exactly two living neighbors on the current tick.

This is the cellular automaton B2/S2 in the Moore neighborhood (8 neighbors including
diagonals). Edge cells have fewer neighbors. Out-of-grid positions count as dead.

Concretely:
- An empty cell with exactly 2 living neighbors becomes alive next tick.
- A living cell with exactly 2 living neighbors stays alive next tick.
- All other cells become or stay dead next tick.

A seed placed during the turn is alive immediately. If a tick follows, the seed
participates in that tick's neighbor counts.

Do not add any other rules, special cell types, or exceptions.

---

## 3. Turn Structure

On each turn the player can:

- Tap an empty cell to place a seed (only if `seedsLeft > 0`). The cell becomes alive
  immediately. `seedsLeft` decreases by 1.
- Tap the Tick button to advance the simulation (only if `ticksLeft > 0`). The whole
  grid updates simultaneously using the rule in section 2. `ticksLeft` decreases by 1.

The player can interleave placements and ticks freely. They can place several seeds
in a row, then tick. They can tick first and then place. They can skip seeds entirely
and only tick (if the level allows).

The game checks the win condition after every state change (both placement and tick).
The level is solved the moment the grid matches the goal, regardless of how many
seeds or ticks remain.

The level is lost when both `seedsLeft === 0` and `ticksLeft === 0` and the grid does
not match the goal.

---

## 4. Cell Visual States

Each cell is rendered in exactly one visual state:

| State | Condition | Appearance |
|---|---|---|
| `empty` | not alive, not in target | dashed outline, 20% opacity |
| `target-empty` | not alive, target says empty (`.` in goal) | same as `empty` |
| `target-alive` | not alive, target says alive (`X` in goal) | solid outline ring, transparent fill |
| `alive` | alive, not in target | filled circle, `--alive` color |
| `alive-on-target` | alive, target says alive | filled circle with outline ring, `--alive` + `--target` |
| `alive-off-target` | alive, target says empty | filled circle with thin red border, `--alive` + `--error` |

The target overlay is always visible. The player must see both current and goal at
once.

Treat `empty` and `target-empty` as visually identical in MVP. They differ only
internally for the win check.

---

## 5. Data Structures

### Level (static, hand-authored)

```js
{
  id: 1,                   // 1-indexed integer
  title: "Two",            // short string
  start: [                 // 5 rows, 5 chars each: '.' = empty, 'X' = alive
    ".....",
    ".....",
    ".....",
    ".....",
    "....."
  ],
  goal: [                  // same format; '.' = must be empty, 'X' = must be alive
    ".....",
    ".....",
    "..XX.",
    ".....",
    "....."
  ],
  seeds: 2,
  maxTicks: 0,
  hint: "Just tap two empty cells."
}
```

### Runtime game state

```js
{
  view: "menu" | "level" | "win" | "lose",
  levelId: number,
  current: number[5][5],   // 0 or 1
  seedsLeft: number,
  ticksLeft: number,
  history: Array<Snapshot>, // for undo
  solvedLevels: Set<number> // persisted to localStorage
}
```

A `Snapshot` is `{ current, seedsLeft, ticksLeft }`. Push a snapshot before every
mutation. Undo pops the latest.

---

## 6. The Engine

A single pure function. Place it in `engine.js`.

```js
export function step(grid) {
  const rows = grid.length;
  const cols = grid[0].length;
  const next = Array.from({ length: rows }, () => new Array(cols).fill(0));
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      let n = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const ny = y + dy;
          const nx = x + dx;
          if (ny >= 0 && ny < rows && nx >= 0 && nx < cols) {
            n += grid[ny][nx];
          }
        }
      }
      next[y][x] = n === 2 ? 1 : 0;
    }
  }
  return next;
}
```

Verify by running these test cases in a script and asserting equality:

```js
// Test 1: a domino (two adjacent cells) becomes two parallel rows of two
const t1 = parseGrid([".....",".....","..XX.",".....","....."]);
const t1_after = step(t1);
assert(t1_after[1][2] === 1 && t1_after[1][3] === 1);
assert(t1_after[3][2] === 1 && t1_after[3][3] === 1);
assert(t1_after[2][2] === 0 && t1_after[2][3] === 0);

// Test 2: a single isolated cell dies (0 neighbors)
const t2 = parseGrid([".....",".....","..X..",".....","....."]);
const t2_after = step(t2);
assert(t2_after.flat().every(c => c === 0));

// Test 3: empty grid stays empty
const t3 = parseGrid([".....",".....",".....",".....","....."]);
const t3_after = step(t3);
assert(JSON.stringify(t3) === JSON.stringify(t3_after));
```

---

## 7. Win Condition

After every state change (placement or tick), compare `current` to `goal`:

```js
function isWin(current, goal) {
  for (let y = 0; y < 5; y++) {
    for (let x = 0; x < 5; x++) {
      const target = goal[y][x] === 'X' ? 1 : 0;
      if (current[y][x] !== target) return false;
    }
  }
  return true;
}
```

If `isWin()` returns true, transition `view` to `"win"`. Add `levelId` to
`solvedLevels` and persist to localStorage.

If `seedsLeft === 0` AND `ticksLeft === 0` AND `!isWin()`, transition to `"lose"`.

---

## 8. UI Layout

Single page, no routing. One screen at a time, switched by the `view` variable.

### Title screen (`view === "menu"`)

```
+--------------------------------+
|                                |
|     CHAIN REACTION             |
|     GARDEN                     |
|                                |
|     [ Play ]                   |
|                                |
|     Levels                     |
|     [1] [2] [3] [4] [5]        |
|     [6] [7] [8] [9] [10]       |
|                                |
|                          🔇    |
+--------------------------------+
```

Solved levels: number shown with `--alive` color background. Unsolved: outline only.
The first unsolved level (or level 1 if none solved) is highlighted as next-to-play.
Mute toggle in the bottom corner.

### Level screen (`view === "level"`)

Mobile-first vertical layout (~380px viewport):

```
+--------------------------------+
|  ← Menu              Level 3   |
|                                |
|  "Born"                        |
|  Place two seeds vertically... |
|                                |
|        [ 5x5 garden ]          |
|                                |
|   Seeds: 2     Ticks: 1        |
|                                |
|   [ Undo ]      [ Tick ]       |
|                                |
|            [ Restart ]         |
+--------------------------------+
```

The garden cells are circles, 56px diameter on mobile, with 12px gutters. Total grid
width ≈ 5 × 56 + 4 × 12 = 328px. Center it horizontally.

On desktop, max width of the entire play area is 480px, centered with generous
margins. Background fills the viewport.

### Win overlay (`view === "win"`)

Translucent backdrop over the level screen. Centered card:
- Heading: "Level N solved"
- Buttons: [Next level] [Replay]
- After level 10: heading "Garden complete" + [Back to menu]

### Lose overlay (`view === "lose"`)

Same layout as win:
- Heading: "Try again"
- Buttons: [Restart] [Back to menu]

---

## 9. Visual Design

### Palette

CSS variables at root. Do not introduce other colors. No gradients. No shadows except
the one specified for the Tick button.

```css
:root {
  --bg: #F4EFE6;          /* warm off-white */
  --bg-elevated: #EBE5D8; /* card background */
  --ink: #1F1B16;         /* primary text */
  --ink-soft: #6B5F4E;    /* secondary text */
  --alive: #2E4A1F;       /* living cell, deep moss green */
  --target: #1F1B16;      /* target ring color */
  --accent: #B8542E;      /* terracotta, used only for the Tick CTA */
  --accent-soft: #D9A57F; /* hover state */
  --error: #8B2E2E;       /* alive-off-target border */
}
```

### Typography

Load from Google Fonts via `<link>` in `<head>`. Three families:

- **Fraunces** (weight 500-600, opsz 24) for the game title and level titles
- **JetBrains Mono** (weight 500) for numeric counters
- **IBM Plex Sans** (weight 400, 500, 600) for body text and buttons

Sizes:
- Game title: Fraunces 600, 40px on title screen, 24px in headers
- Level title: Fraunces 500, italic, 20px
- Hint: Plex Sans 400, 14px, color `--ink-soft`
- Counters: JetBrains Mono 500, 16px, `font-variant-numeric: tabular-nums`
- Button label: Plex Sans 600, 15px
- Body: Plex Sans 400, 14px

### Cells

Every cell is a `<button>` element. Use buttons for accessibility and touch handling.

```css
.cell {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: transparent;
  border: 1px dashed rgba(107, 95, 78, 0.2);
  padding: 0;
  cursor: pointer;
  transition:
    background-color 280ms cubic-bezier(0.4, 0, 0.2, 1),
    border-color 280ms ease,
    transform 200ms ease;
}
.cell.alive {
  background: var(--alive);
  border: none;
}
.cell.target {
  border: 2px solid var(--target);
  border-style: solid;
}
.cell.alive.target {
  background: var(--alive);
  border: 2px solid var(--target);
}
.cell.alive.off-target {
  background: var(--alive);
  border: 2px solid var(--error);
}
.cell:hover:not(.alive) {
  background: rgba(217, 165, 127, 0.15);
}
.cell:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
```

### Animation

One important animation: the bloom when a cell becomes alive.

```css
@keyframes bloom {
  0% { transform: scale(0.4); }
  60% { transform: scale(1.08); }
  100% { transform: scale(1); }
}
.cell.alive {
  animation: bloom 280ms cubic-bezier(0.34, 1.56, 0.64, 1);
}
```

When a tick runs, all cells transition simultaneously. The CSS transition on
`background-color` handles dying cells (fade to transparent). The `bloom` keyframe
handles new-alive cells.

On win: stagger a 600ms pulse from top row to bottom row (40ms delay per row).

```css
@keyframes win-pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.15); }
}
.cell.win-pulse {
  animation: win-pulse 600ms ease;
}
```

### Buttons

Tick button (primary):
```css
.btn-primary {
  background: var(--accent);
  color: var(--bg);
  font: 600 15px/1 'IBM Plex Sans', sans-serif;
  border: none;
  border-radius: 999px;
  padding: 14px 36px;
  cursor: pointer;
  box-shadow: 0 2px 0 0 rgba(31, 27, 22, 0.2);
  transition: transform 80ms ease, box-shadow 80ms ease;
}
.btn-primary:active {
  transform: translateY(2px);
  box-shadow: 0 0 0 0 rgba(31, 27, 22, 0.2);
}
.btn-primary:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
```

Secondary buttons (Undo, Restart, Menu):
```css
.btn-secondary {
  background: transparent;
  color: var(--ink-soft);
  font: 500 14px/1 'IBM Plex Sans', sans-serif;
  border: 1px solid rgba(107, 95, 78, 0.3);
  border-radius: 999px;
  padding: 12px 24px;
  cursor: pointer;
  transition: border-color 200ms ease, color 200ms ease;
}
.btn-secondary:hover {
  border-color: var(--ink-soft);
  color: var(--ink);
}
.btn-secondary:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
```

### Page chrome

Below the level title, render one horizontal divider:
```css
.divider {
  width: 100%;
  max-width: 328px;
  height: 1px;
  background: rgba(107, 95, 78, 0.12);
  margin: 16px auto 32px;
}
```

That's the only decorative element. No backgrounds on cards, no noise textures, no
shadows besides the Tick button's.

### Sounds (optional)

Three short Web Audio API sounds. Generate procedurally (no audio files):
- On seed placement: 80ms sine wave at 660 Hz with fast decay
- On tick: 150ms white noise burst with low-pass filter
- On win: short sequence (C5, E5, G5) plucked sine waves over 600ms

Mute toggle on title screen, state in localStorage as `mr_muted: "1" | "0"`.

---

## 10. Interaction Rules

- Tap an empty cell → place a seed if `seedsLeft > 0`. Push undo snapshot first.
- Tap an alive cell → no-op. Do not allow manually killing cells.
- Tap Tick → push undo snapshot, run `step()`, decrement `ticksLeft`, run win/lose check.
- Tap Undo → restore latest snapshot. Disabled if history empty.
- Tap Restart → reset to level start, clear history. No confirmation dialog needed.
- Tap Menu → go to title screen. No confirmation.

Keyboard:
- Tab navigates cells in row-major order, then buttons.
- Enter / Space on a focused cell places a seed.
- `T` triggers Tick.
- `U` triggers Undo.
- `R` triggers Restart.
- `Esc` goes to menu.

Each cell has `aria-label`:
```
"Cell row 3 column 2, alive, part of target"
```
Update on every render.

---

## 11. Levels (verified)

All 10 levels below have been verified solvable by exhaustive search. The included
"verified solution" line proves at least one solution exists. The player may find
alternate solutions. Do not modify start, goal, seeds, or ticks without re-verifying.

```js
const LEVELS = [
  {
    id: 1,
    title: "Two",
    start: [".....",".....",".....",".....","....."],
    goal:  [".....",".....","..XX.",".....","....."],
    seeds: 2, maxTicks: 0,
    hint: "Just tap two empty cells."
    // Verified: place(2,2) → place(3,2)
  },
  {
    id: 2,
    title: "Triangle",
    start: [".....",".....",".....",".....","....."],
    goal:  [".....","..X..",".X.X.",".....","....."],
    seeds: 3, maxTicks: 0,
    hint: "Tap the three cells the goal shows."
    // Verified: place(2,1) → place(1,2) → place(3,2)
  },
  {
    id: 3,
    title: "Born",
    start: [".....",".....",".....",".....","....."],
    goal:  [".....",".....",".XXX.",".....","....."],
    seeds: 2, maxTicks: 1,
    hint: "Place two seeds vertically across the center row, then tick."
    // Verified: place(2,1) → place(2,3) → tick
  },
  {
    id: 4,
    title: "Cross",
    start: [".....",".....",".....",".....","....."],
    goal:  [".....",".X.X.","..X..",".X.X.","....."],
    seeds: 2, maxTicks: 2,
    hint: "Two seeds, two ticks. Symmetry helps."
    // Verified: place(2,1) → place(2,3) → tick → tick
  },
  {
    id: 5,
    title: "Pillar",
    start: [".....",".....",".....",".....","....."],
    goal:  ["..X..","..X..","..X..","..X..","..X.."],
    seeds: 2, maxTicks: 5,
    hint: "Two seeds will grow into a column. Pick the right ones."
    // Verified: place(2,1) → place(2,2) → tick × 4
  },
  {
    id: 6,
    title: "Spread",
    start: [".....",".....",".....",".....","....."],
    goal:  [".....",".....","XXXXX",".....","....."],
    seeds: 2, maxTicks: 4,
    hint: "A pair of seeds becomes the whole row."
    // Verified: place(1,2) → place(2,2) → tick × 4
  },
  {
    id: 7,
    title: "Compass",
    start: [".....",".....",".....",".....","....."],
    goal:  ["..X..",".....","X...X",".....","..X.."],
    seeds: 2, maxTicks: 3,
    hint: "Cells on the middle axis can reach the corners."
    // Verified: place(2,1) → place(2,3) → tick × 3
  },
  {
    id: 8,
    title: "Mirror",
    start: [".....",".....",".....",".....","....."],
    goal:  [".....",".X.X.",".X.X.",".....","....."],
    seeds: 2, maxTicks: 2,
    hint: "Two seeds, vertically stacked."
    // Verified: place(2,1) → place(2,2) → tick
  },
  {
    id: 9,
    title: "Echo",
    start: [".....","..X..",".....","..X..","....."],
    goal:  [".....",".X.X.","..X..",".X.X.","....."],
    seeds: 2, maxTicks: 2,
    hint: "Sometimes the garden grows on its own."
    // Verified: tick → tick (the player can keep their seeds)
  },
  {
    id: 10,
    title: "Bloom",
    start: [".....",".....",".....",".....","....."],
    goal:  [".X.X.",".....",".X.X.",".....","....."],
    seeds: 2, maxTicks: 3,
    hint: "Two seeds high in the grid. Three ticks. Watch it travel."
    // Verified: place(2,0) → place(2,1) → tick × 3
  },
];
```

### Coordinate convention

`place(x, y)` means column `x` (0-leftmost) and row `y` (0-topmost). The grid is
indexed `grid[y][x]`. Be consistent throughout.

### Verifying any change

If you modify a level, run this brute-force solver to verify a solution exists:

```js
function verify(start, goal, seeds, maxTicks) {
  function parse(rows) { return rows.map(r => r.split('').map(c => c === 'X' ? 1 : 0)); }
  function eq(a,b) { return JSON.stringify(a) === JSON.stringify(b); }
  function clone(g) { return g.map(r => r.slice()); }
  const startG = parse(start);
  const goalG = parse(goal);
  const queue = [{grid: startG, seeds, ticks: maxTicks, path: []}];
  const seen = new Set();
  while (queue.length) {
    const {grid, seeds, ticks, path} = queue.shift();
    if (eq(grid, goalG)) return path;
    if (path.length >= 12) continue;
    const k = JSON.stringify(grid) + seeds + ticks;
    if (seen.has(k)) continue;
    seen.add(k);
    if (ticks > 0) queue.push({grid: step(grid), seeds, ticks: ticks-1, path: [...path, 'tick']});
    if (seeds > 0) {
      for (let y = 0; y < 5; y++) for (let x = 0; x < 5; x++) {
        if (grid[y][x] === 0) {
          const ng = clone(grid); ng[y][x] = 1;
          queue.push({grid: ng, seeds: seeds-1, ticks, path: [...path, `place(${x},${y})`]});
        }
      }
    }
  }
  return null;
}
```

---

## 12. Architecture

**Stack**: vanilla HTML, CSS, JavaScript. ES modules in the browser. No build step,
no framework, no dependencies (Google Fonts via `<link>` is fine).

**File layout**:

```
/
├── index.html
├── styles.css
├── engine.js     // step(), isWin(), parseGrid() — pure functions
├── levels.js     // export const LEVELS = [...]
├── audio.js      // Web Audio API sound generation, mute toggle
├── ui.js         // rendering, event handling, app state
└── README.md
```

**index.html**:
```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>Chain Reaction Garden</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=IBM+Plex+Sans:wght@400;500;600&family=JetBrains+Mono:wght@500&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <div id="app"></div>
  <script type="module" src="ui.js"></script>
</body>
</html>
```

**State management**: a single module-level `state` object in `ui.js`. All mutations
go through named functions (`placeSeed`, `runTick`, `undo`, `restart`, `loadLevel`,
`goToMenu`). Each mutation re-renders the affected view.

**Rendering**: do not diff or virtualize. Wipe the relevant container's innerHTML
and rebuild. The grid is 25 cells; this is fast.

**Persistence**: `localStorage` keys:
- `mr_solved`: JSON-stringified array of solved level IDs
- `mr_muted`: `"1"` or `"0"`

No mid-level save.

---

## 13. Performance

This game is tiny. Do not optimize. Do not memoize. Do not use
`requestAnimationFrame` for game logic. Use simple event listeners and DOM mutation.
CSS handles animation.

---

## 14. Accessibility

- Every cell is a `<button>` with descriptive `aria-label`, updated on each render.
- Buttons have accessible labels (visible text is sufficient for Tick/Undo/Restart/Menu).
- Focus is visible: `:focus-visible` outline 2px solid `--accent`, offset 2px.
- All colors in the chosen palette meet WCAG AA contrast against `--bg`.
- Game is fully playable with keyboard (see section 10 for shortcuts).
- The page works without animations: respect `prefers-reduced-motion: reduce` by
  setting all `animation` and `transition` durations to `0.01ms`.

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 15. Done Criteria

The build is done when all of the following are true:

1. All 10 levels load and play correctly.
2. Each level has at least one valid solution path that produces a win.
3. The engine matches the rule: verify with the three test cases in section 6.
4. Win triggers on state match. Lose triggers when both budgets reach 0.
5. Undo restores prior state for unlimited steps within a level.
6. Restart resets to the level's start state and clears history.
7. After winning level N (N < 10), the "Next level" button loads level N+1.
8. After winning level 10, the "Garden complete" screen appears with a "Back to menu" button.
9. Solved levels are marked in the menu and persist across reloads.
10. Mobile layout renders correctly at 380px viewport width with no horizontal scroll.
11. Desktop layout renders correctly at 1280px viewport width, content centered, max-width 480px.
12. Keyboard navigation works for all interactions.
13. `prefers-reduced-motion: reduce` disables animations.
14. No console errors or warnings on any flow.

---

## 16. Out of Scope

Do NOT build:
- More than one rule. No plant types, no special cells, no exceptions.
- Larger grids. 5×5 only.
- Multiplayer, accounts, leaderboards, online features.
- Dynamic hints, AI hints, or tutorial overlays beyond the per-level `hint` string.
- A level editor in the UI.
- Difficulty settings.
- Localization (English only for hackathon).
- Animations beyond what section 9 specifies.

---

## 17. Build Order

Recommended order for a 24-hour hackathon:

1. **Hour 0-1**: `engine.js` with `step()`, `isWin()`, `parseGrid()`. Verify with three test cases. No UI yet.
2. **Hour 1-2**: `index.html` and `styles.css` with the palette, fonts, and a static 5×5 grid rendered with hardcoded states. Make it look right before making it work.
3. **Hour 2-4**: `ui.js`: render real game state, wire up cell-tap → place seed, Tick button → tick. Implement win/lose check.
4. **Hour 4-5**: Undo and Restart.
5. **Hour 5-6**: Title screen with level menu, level loading, win/lose overlays.
6. **Hour 6-7**: All 10 levels from section 11. Verify each plays through to a win.
7. **Hour 7-9**: Animations (bloom, win pulse, button press). Polish the palette and typography.
8. **Hour 9-10**: localStorage for solved levels and mute. Keyboard shortcuts. Accessibility pass.
9. **Hour 10-11**: Sounds via Web Audio API. Mute toggle.
10. **Hour 11-12**: Test on a real phone or at 380px DevTools. Fix any layout bugs.
11. **Hour 12-14**: Buffer for bugs. Polish. Record demo video.
12. **Hour 14**: Deploy to GitHub Pages or any static host. Update README with the pitch.

If running behind schedule, cut in this order: sounds → keyboard shortcuts → reduced-motion support → win-pulse animation → level selector menu (just auto-advance through levels instead).

---

## 18. README Content (for the repo)

```markdown
# Chain Reaction Garden

A meditative puzzle game built around a single rule of a cellular automaton:

> A cell lives if it has exactly two neighbors.

From that one sentence emerges every puzzle in the game. Plant seeds. Predict the
cascade. Match the bloom.

## Play

Open `index.html` in a browser. No build step.

## Levels

Ten levels, hand-designed and verified solvable. Each adds one new idea: placement,
single-tick prediction, multi-tick chains, working with starting cells.

## Built for

A 24-hour HTML5 puzzle hackathon by the SayGames analytics team.
```
