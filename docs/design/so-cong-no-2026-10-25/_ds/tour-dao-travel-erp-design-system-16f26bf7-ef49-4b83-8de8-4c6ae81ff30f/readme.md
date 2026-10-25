# Tour Dao Travel ERP Design System
Original design system for **Tour Dao**, a travel-company ERP, across a **web app** (back-office) and a **web browser** customer site. Brand mark: `assets/logo-tour-dao.png` (sailboat, gold + blue on deep red; supplied by the user).

**Source studied (architecture only, no SAP branding copied):** https://github.com/SAP/fundamental-styles — explore it for deeper reference: BEM-style naming (`fd-{component}--{modifier}`), token layers, `docs/accessibility.json`, `docs/component-guidance.json`, `llms.txt` / `CLAUDE.md` AI-readable docs.

## Principles taken from the reference
- Token layers: base (`--td-red-600`) → semantic (`--color-brand`, `--surface-card`, `--status-error-fg`). Components only use semantic tokens.
- Density as a token mode: `[data-density="compact|comfy"]` rescales control and row heights.
- Data-first: tabular numerals, right-aligned amounts, mono codes, row hover/selected states.
- Accessibility: visible 2px focus ring (`--focus-ring`), status always paired with text (Badge dot + label), `role=tablist`.
- AI-readable: every component has `.d.ts` + `.prompt.md`; `SKILL.md` at root.

## Content fundamentals
Vietnamese-first, formal-friendly, concise. Sentence case ("Tạo booking", not "TẠO BOOKING"). Address user implicitly or "bạn" on the customer site; no pronouns in the ERP. Verbs lead buttons. Money: `12.450.000 ₫`; dates `dd/mm/yyyy`; booking codes `BK-0417`. No emoji.

## Visual foundations
- **Color:** deep red `#8B1E2D` brand, gold accent for the single highlight CTA, sky blue for info/focus/selection; warm grays; shell sidebar `--td-red-900`.
- **Type:** Be Vietnam Pro (UI/body) + Times New Roman (`--font-serif`: greetings, KPI numerals, page titles) + JetBrains Mono for codes. Base 14px.
- **Spacing:** 2/4/8/12/16/24/32/48. **Radius:** 3/6/10. **Shadows:** subtle 3-step; borders do most separation.
- **Cards:** white, 1px warm-gray border, 10px radius, shadow-1. **Hover:** brightness .92 on buttons, tinted row on tables. **Motion:** 100–180ms, ease `(.2,0,0,1)`, no bounces. No gradients, no textures; imagery slots are placeholders pending real tour photos.

## Iconography
**Lucide** (CDN `lucide@0.460.0`, 1.75 stroke, 16–22px) via `ui_kits/home/Icon.jsx` (`<Icon name="ticket"/>`). Icons are `currentColor`; always pair with labels in nav. No emoji.

## Index
- `styles.css` → `tokens/colors.css`, `typography.css`, `spacing.css`
- `guidelines/` specimen cards · `assets/` logo
- UI kits: `ui_kits/erp-app/` (bookings list, KPIs, density toggle), `ui_kits/booking-site/` (search hero, tour cards)
- `ui_kits/home/` — **Trang chủ** desktop (`desktop.html`) and iPhone (`iphone.html`)
- `SKILL.md`

## Components
Button, Badge, Input, Card, Tabs, DataTable — in `components/core/`. (No source inventory was given, so a standard ERP-relevant set was authored; Select, Checkbox, Dialog, Toast etc. not yet built.)
