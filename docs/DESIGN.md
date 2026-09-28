# Design system

The as-built visual language of TutorDisco. Tokens live in `src/shared/theme/theme.ts`;
components in `src/shared/ui`. When this file and the code disagree, the code wins — fix
this file.

**Direction:** a tutor's well-kept notebook. Warm paper neutrals, ink text, hairline rules
instead of shadows, a serif reserved for titles and hero numbers, and one indigo accent
used only for actions and the current selection.

**The test for any feature or control:** what problem does it solve for the tutor? If it
duplicates another control, answers no question the tutor has, or is decoration, cut it.

---

## Tokens

Components use **semantic** keys from `useTheme().colors`, never palette values or hex.
Light and dark map the same keys; every text pair is measured (ratios are commented in
`theme.ts`) — body text ≥ 4.5:1, UI ≥ 3:1.

| Key | Use |
|---|---|
| `background` / `surface` / `surfaceMuted` | page paper / cards, inputs / table headers, tracks |
| `border` / `borderStrong` | hairline rules / input borders, emphasized rules |
| `text` / `textMuted` / `textSubtle` | body / secondary (AA) / large or UI text only |
| `primary` / `primaryMuted` / `onPrimary` | fills (buttons, checked boxes) / tints / text on fills |
| `primaryText` | indigo as **text** (links, selected labels) — dark mode needs a lighter indigo than the fill |
| `success` `warning` `danger` `info` (+ `…Muted`) | status ink / its tint. Always paired with a label or icon |
| `focusRing` | focused input border |

- **Spacing:** 4pt grid — `theme.space.xs 4 · sm 8 · md 12 · lg 16 · xl 24 · 2xl 32 · 3xl 48`.
  No raw numbers in screens.
- **Radii:** `sm 4 · md 6 · lg 10 · xl 14 · pill`.
- **Shadows:** none by default. `md` for menus and drag lift, `lg` for modals. Dark mode has
  no shadows — elevation is a surface step plus a border.
- **Layout:** `theme.layout.pageMaxWidth` 1120, gutters 16 / 24 / 32 by breakpoint, sidebar 232.
- **Icons:** `theme.iconSize.sm 16 · md 20 · lg 24`, one stroke width (`iconStroke` 1.75).

## Type

| Variant | Face | Use |
|---|---|---|
| `display` `h1` `h2` | Newsreader (serif) | page titles, the wordmark, hero figures |
| `h3` `title` `bodyStrong` | Plus Jakarta Sans 600 | modal titles, names, emphasis |
| `body` `label` `caption` | Plus Jakarta Sans 400/500 | text, field labels, meta |
| `eyebrow` | Jakarta 600, 11pt uppercase +0.6 | section labels, table headers, stat labels |
| `mono` | platform mono | codes, pasted JSON |

- Weight is chosen by **font family**, not `fontWeight` (Android ignores weight on custom
  faces; web would faux-bold). Use `<Text weight=…>`; it maps through `fontFor()`.
- Money, dates and counts in columns get `<Text tabular>`.
- Fonts load in `FontGate` from per-weight subpaths (only the 5 faces used are bundled).

## Components (`src/shared/ui`)

- **Layout:** `Page` (the one screen container: scroll, gutter, max width, 32pt section
  rhythm, left-aligned; `safeTop` when there's no native header, `narrow` for reading
  screens), `PageHeader` (serif title, subtitle, `leading`, `meta`, right-aligned
  `actions`), `Section` (eyebrow title + description + action).
- **Surfaces:** `Card` (hairline; `title` is an eyebrow unless `titleStyle="heading"`),
  `ListRow`, `DataTable`, `DraggableList`, `StatCard` / `StatGroup` (rule-divided tiles).
- **Controls:** `Button` (`primary` — one per screen · `secondary` · `subtle` · `ghost` ·
  `link` · `danger`; `icon` / `trailingIcon`), `IconButton` (label required), `Menu`
  (anchored overflow; `checked`, `separatorBefore`, `destructive`), `SegmentedControl`,
  `Chip`, `Checkbox`, `Switch`, `TextField` (`leadingIcon`, `revealable`, `monospace`),
  `Select`, `TimeField`, `CalendarPicker`.
- **Feedback:** `Badge`/`StatusPill` (dot + label), `InlineNotice`, `ConfirmDialog`,
  `EmptyState` (icon, plain title, one next step), `Skeleton`, `Spinner`.
- **Data:** `BarChart` (gridlines, hover/tap readout, empty state), `RankBars` (`filled`
  for collected-of-billed).

## Rules

- **Icons are lucide**, through `Icon` / `IconButton` / a `Button` `icon`. No emoji or
  unicode glyphs (`× ▾ ✓ ≡ ↑`) as icons.
- **Status text goes through `labelFor()`** (`shared/utils/labels.ts`) — never render a raw
  enum like `no_show`.
- **One primary action per screen**, in the `PageHeader`. Rarer actions go in a `Menu`.
  Destructive actions are last, red, and confirmed (`ConfirmDialog` or an inline
  Keep / Delete bar).
- **Show the next step, not every step.** A row offers the one action that moves it
  forward (e.g. a session: Mark complete → Mark paid → nothing); other changes live in a
  picker or menu.
- **Whole rows are the tap target** for opening a record. Controls inside a row stop
  propagation (`Button`, `IconButton`, `Checkbox`, `Menu` already do; custom `Pressable`s
  must call `e.stopPropagation?.()`).
- **Pressable rows use `rowRole`**, not `accessibilityRole="button"`: react-native-web
  renders the button role as a real `<button>`, which can't contain other buttons.
- **Touch targets ≥ 44pt.** Small buttons/icons extend with `hitSlop` (built in).
- **Empty and loading states are designed:** `EmptyState` with a next step; `Skeleton`
  shaped like the content, not a spinner.
- **Copy is plain.** Say what happened and what to do next; no jokes, no filler.
- **Motion:** 150–220ms, opacity/background only on press; `Skeleton` respects
  reduce-motion.

## Navigation shell

Tabs: Students, Payments, Revenue, Settings (`src/app/navigation/tabMeta.ts`). Phones get a
bottom bar; ≥ 1024 wide gets `Sidebar` (wordmark, destinations, account + Sign out).
Top-level screens hide the native header and render a `PageHeader`; pushed screens keep
the native back button with an empty title (the `PageHeader` is the title) and set
`title` for the browser tab.
