# Tour Đảo Booking — Design System

Design system for **Tour Đảo Booking** (in-app name since v1.x: **Island Booking System**) — the internal CRM/booking PWA of **Công ty TNHH Tour Đảo** (Nha Trang, Khánh Hoà). Staff create tour-service orders, record trip info (pickup time/place), confirm orders and send a confirmation image to the customer; admins manage staff, permissions, the service/price catalog (synced from Google Sheet), customer/agency profiles and locations. It runs at `https://booking.tourdao.vn` (Cloudflare Worker + D1) and is installed on iPhones as a PWA.

The visual language is borrowed from the public marketing site **tourdaovn** (token names/values copied, not imported) plus an app-only layer for forms, danger states and phone chrome.

## Sources
- GitHub: **https://github.com/luutuanvu1010/tourdaobooking** (branch `main`). Key files: `public/app.css` (all tokens + component CSS — copied here as `reference/app.css`), `web/icons.ts`, `web/shell.ts` (sidebar/tab bar), `web/home.ts`, `web/order-card.ts`, `public/*.html`, `docs/design/` (Claude Design mockups + `a2-mockup/refs/tourdaovn-design-brief.md`), `web/CLAUDE.md` (UI rules).
- Upload: `uploads/logo tour dao 96.png` (same mark as `assets/logo-96.png`).
- Explore the repo further for page specs (`docs/superpowers/specs/`), screenshots of the real app (`docs/evidence/*/anh/`) and the full mockup set (`docs/design/mockup-by-ClaudeDesign/*.dc.html` — 14 screens incl. Nhân viên, Hồ sơ, Dịch vụ và giá, Địa điểm, Tôi, Nhật ký, Góp ý) to build more screens faithfully.

## Products
One product: the **staff booking PWA**, with two layouts of the same screens:
- **Phone (≤640px)** — navy top bar (logo or ‹ back + title, sand initials avatar), white bottom tab bar with a coral "Tạo đơn" circle.
- **Desktop (≥641px)** — navy-strong left sidebar (BÁN HÀNG / QUẢN TRỊ / TÔI) + white 60px work bar (breadcrumb, search, coral "Tạo đơn").

## Index
- `styles.css` — entry point (imports only) → `tokens/{fonts,colors,typography,spacing,effects,layout,base}.css`
- `assets/` — `logo-96.png`, `icon-192.png`, `icon-512.png`, `apple-touch-icon.png`, `fonts/*.woff2`, `icons/*.svg` (24 icons)
- `guidelines/` — foundation specimen cards (Colors, Type, Spacing, Brand)
- `components/` — React primitives (see below), one `*.card.html` per folder
- `ui_kits/booking-app/` — interactive recreation (Login, Trang chủ, Đơn hàng, Chi tiết đơn, Tạo đơn; desktop/phone toggle)
- `reference/app.css` — verbatim production stylesheet (not shipped; read it for exact values)
- `SKILL.md`, `github.md`, `thumbnail.html`

## Components
- **core/** — `Button` (default/primary/accent/danger/link/pill/pill-danger; md/lg), `Badge` (Nháp/Đã xác nhận/Đã huỷ), `Chip` + `PriceTag`, `Card` + `CardHead` + `RowLink`, `Avatar` (+`initials`), `Icon` (+`ICON_NAMES`)
- **forms/** — `Field` (input/select/textarea, default/login), `Counter` + `GuestRow`
- **feedback/** — `Banner` (danger/warning/info/ok), `Note`, `Skeleton`, `Sheet`
- **orders/** — `OrderCard` (+`vnd`), `StatTile` + `RevenueChart`, `SummaryBand` + `KV`
- **navigation/** — `Sidebar` + `Topbar`, `TabBar` + `MobileBar`

### Intentional additions
- `Icon` — React wrapper around the app's own `web/icons.ts` shapes (source builds them with `createElementNS`).
- Component names are ours; the source is vanilla TS + CSS classes (`.btn`, `.badge`, `.order-card`, `.dash-stat`, `.sheet`…). Each component maps 1:1 to one of those class families.

---

## CONTENT FUNDAMENTALS
- **Language:** Vietnamese only, always with full diacritics. Never show English or raw codes to users (`cancelled` → "Đã huỷ"). Note the house spelling **"huỷ"** (not "hủy"), "Khánh Hoà".
- **Voice:** plain, practical, office-to-colleague. Addresses the user as **"bạn"**; the user's own space is **"Tôi" / "Của tôi" / "Việc của tôi"**. Greeting: "Chào Trang" (last word of the name).
- **Casing:** sentence case everywhere ("Chuyến đón hôm nay", "Sửa thông tin chuyến"). UPPERCASE only for tiny group/stat labels (BÁN HÀNG, CÒN THIẾU TIỀN), always with `--ls-eyebrow` .08em.
- **Buttons are verbs + object:** "Tạo đơn", "Lưu đơn nháp", "Xác nhận đơn", "Huỷ đơn", "Đổi người phụ trách", "Xem tất cả" (short form "Tất cả" on phones), "Thử lại", "Tải thêm".
- **Status & errors say what happened and what to do:** "Không tải được Trang chủ. Thử tải lại trang.", "Không có kết nối mạng. Kiểm tra Wi-Fi hoặc 4G rồi mở lại app.", "Đang ở chế độ bảo trì — chỉ bạn dùng được". Empty states are one sentence: "Chưa có đơn nào khớp.", "Không có chuyến nào hôm nay."
- **Numbers:** money `1.350.000 ₫` (vi-VN dots, space, ₫); short form on phones `1,35tr ₫`. Dates `12/10`, `12/10/2026`; times `07:30`; full weekday "Chủ nhật, 12/10/2026". Guests `05 NL · 02 TE · 01 EB` (full) / `2NL 1TE` (short) — NL người lớn, TE trẻ em, NCT người cao tuổi, EB em bé. Order codes `TD-20261012-0003`.
- **Separators:** middle dot " · " between facts; em dash " — " for explanations; "…" for truncation and in-progress ("Đang đăng nhập…").
- **"Price first, words after"** — money is shown early and bold.
- **No emoji.** Unicode only for ▾ (expand), ‹ (back), − / + (counter), ₫.

## VISUAL FOUNDATIONS
- **Colour:** cool sea palette. Page = pale blue `--c-surface-alt #EAF2F8`; content on **white cards**. Navy `#0C4A6E` for headings, links, primary buttons, focus rings and the one big colour band (order summary); navy-strong `#082F49` for the desktop sidebar and hover. **Coral `#C0392B` is the only warm action colour** — reserved for the committing action (Tạo đơn, Xác nhận đơn) and price tags; money due uses coral-strong. **Sand** for drafts, warnings, avatars, "due" figures on navy — never a button fill. Green only for confirmed/paid. A separate crimson danger set for errors/cancel/delete (coral is never used for destruction).
- **Type:** Be Vietnam Pro 700/800 for headings, numbers, times, order codes; Nunito (variable) for everything else — body 16/1.5, labels 14/600, badges 12/700. Letter-spacing 0 except uppercase eyebrows. Inputs ≥16px (iOS zoom guard); login inputs 17px/600.
- **Spacing:** 4-8-12-16-24-32-48 scale only. Cards pad 12–16px; order cards stack with 8px gaps; page padding 16px; 44px minimum tap target everywhere (counter buttons, close, back, toggles).
- **Backgrounds:** flat. No images, no gradients, no textures, no illustrations. Colour area comes from the navy band/sidebar and the pale-blue page. Light theme only; no dark mode.
- **Corners:** 8px buttons/inputs/banners, 12px cards/order cards/summary band, 18px sheets (top corners only on phones), pill for badges/chips/avatars/support phone, iOS squircle (22.37%) for the app icon.
- **Borders & shadows:** 1px `#D3E1EC` hairlines do most of the work (card borders, row dividers, tab bar top). Only two shadows: `--shadow-card` (0 1px 3px, 8%) on dashboard tiles/service cards and `--shadow-overlay` (0 12px 32px, 16%) on sheets/dialogs. No inner shadows.
- **Cards:** white, 1px border, 12px radius, optional hairline shadow. List cards have a header row (icon + display title + count badge + right link) and rows divided by 1px lines. No coloured left borders.
- **Hover/press:** hover on order cards = 2px navy outline; primary/submit hover → navy-strong; outline buttons hover → `#F0F7FC`. Press = `filter: brightness(.94)`. No scale/shrink.
- **Focus:** 2px navy outline, 2px offset (`:focus-visible`); login fields use navy border + 3px soft-blue ring.
- **Motion:** minimal and functional — 180ms for chevron rotation/colour, 300ms for sheet slide-up (phone) / fade+rise 16px (desktop), 700ms spinner, pulse skeleton. Ease timing. Everything disabled under reduced motion. No autoplay.
- **Transparency/blur:** only the scrim `rgba(15,23,42,.45)` behind sheets and white alphas (.72/.14/.12/.18) inside the sidebar. No backdrop blur.
- **Layout:** phone — sticky top bar + fixed bottom tab bar (hidden on the order form, which gets a sticky save bar with "Còn thu" instead). Desktop — 236px sticky sidebar, content max 1200px left-aligned, two-column forms/detail with a 340px sticky summary column ≥900px. Tables become card lists below 900px.
- **Imagery:** none in-app except the logo; the only photographic warmth lives on the marketing site.

## ICONOGRAPHY
- The app ships its **own 24×24 stroke icon set** in `web/icons.ts` (built via `createElementNS`, no icon font, no CDN library). Copied here as `assets/icons/*.svg` and the `Icon` component (same shapes).
- Style: 1.8px stroke (2.2 for `plus` and `back`), round caps/joins, `currentColor`, **never filled**. Sizes: 14 (inline pin), 16 (labels, phone, stat tiles), 17 (review badges), 18 (sidebar), 24 (tab bar), 26 (back).
- Icons are **decorative and always accompany text** (`aria-hidden`), except the Face ID login button and back chevron which carry `aria-label`s.
- Names: home, orders, plus, me, services, staff, back, next, lock, alert, close, contact-card, pin, history, chat, doc-check, money, assign, clock, chart, handset, guests, face, help.
- No emoji. Unicode glyphs used as UI: ▾ (expand toggles, rotates 180°), ‹, −, +, ✕.
- **Logo:** `assets/logo-96.png` / `icon-192.png` — yellow sail + blue hull on a coral-red square. Shown round (30px) in bars, squircle (48/72px) on login.

## Fonts
Real files copied from the repo (`assets/fonts/`): Nunito variable (latin + vietnamese subsets) and Be Vietnam Pro 700 & 800 (latin + vietnamese). No substitutions.
