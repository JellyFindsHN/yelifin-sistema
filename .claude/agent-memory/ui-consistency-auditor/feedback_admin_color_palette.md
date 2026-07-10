---
name: feedback-admin-color-palette
description: Admin panel must use platform token colors only — no hardcoded indigo/violet/cyan/amber per-card accents
metadata:
  type: feedback
---

Do not use per-card accent colors (indigo, violet, cyan, amber) in admin panel stat cards, progress bars, or chart fills. Use the platform's own design tokens instead.

**Why:** The admin panel was shipping `bg-indigo-50`, `bg-violet-50`, `bg-cyan-50` stat cards, `bg-indigo-500` progress bars, `text-violet-600`/`text-indigo-600`/`text-cyan-600` image breakdown numbers, and a 15-color hex array for chart bars. In dark mode these variants rendered poorly (e.g. `bg-indigo-950/20` is nearly invisible). The user explicitly requested: "too many colors, looks bad in dark mode, should use the platform's own color tokens".

**How to apply:**
- Stat card backgrounds: `bg-primary/5` (uniform across all cards in the same grid)
- Stat card/chart icons: `text-primary`
- Stat card numbers and image breakdown counts: `text-foreground`
- Progress bars: `bg-primary` (fill bar), `bg-muted` (track)
- Recharts bar fills: `fill="hsl(var(--primary))"` as a single prop on `<Bar>`, no `<Cell>` loop with a color array
- Only `bg-destructive/10` + `text-destructive` is allowed as a second accent color (for danger/negative states — already established elsewhere in the codebase)

See also: [[feedback-status-badge-colors]] for the STATUS_COLOR badge map (green/blue/red/amber/gray) — those are intentional semantic colors for subscription status and are not subject to this rule.
