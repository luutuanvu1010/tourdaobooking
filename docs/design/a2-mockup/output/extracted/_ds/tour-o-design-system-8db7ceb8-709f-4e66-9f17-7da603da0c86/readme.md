# Tour Đảo — Design System

Hệ thiết kế của **Công ty TNHH Tour Đảo** (Nha Trang, Khánh Hoà): công ty bán tour
biển đảo trong vịnh Nha Trang, đón khách tận khách sạn, chốt chỗ qua Zalo. Website
là một site du lịch một ngôn ngữ chính (tiếng Việt, khung sẵn cho en/zh/ko/ru), dựng
trên Astro + Sanity + Cloudflare Pages.

Hệ này **không phải bản thiết kế mới**. Nó là bản trích nguyên văn thứ đang chạy
production, để mọi thiết kế sau bám đúng token và đúng luật hệ thống.

## Nguồn

| Nguồn | Vai trò |
|---|---|
| `github.com/luutuanvu1010/tourdaovn` (nhánh `main`) | **Nguồn sự thật.** Code Astro, token, tài liệu quản trị |
| `src/styles/tokens.css` | Nguồn token DUY NHẤT của site — mọi màu, chữ, khoảng cách ở đây |
| `src/layouts/BaseLayout.astro` | Chỗ nạp chữ (4 `@font-face`) và class `.container` |
| `docs/design-context/DESIGN_SURFACE_MAP.md` | Bản đồ bề mặt: sửa thứ gì thì sờ file nào |
| `docs/design-context/COMPONENT_INVENTORY.md` | Danh mục 60 component + props, sinh tự động từ code |
| `docs/core-specs/06-BINDING_MAP.md`, `07-DESIGN_TOKENS.md` | Đặc tả vùng/field và token |
| `playbook/CONSTITUTION.md`, `GOVERNANCE.md` | Luật hệ thống — luật thắng code khi hai bên mâu thuẫn |
| `uploads/logo round tourdao.png` | Logo chính thức do chủ dự án cung cấp |

Người đọc có quyền truy cập repo nên đọc thêm `docs/DRIFT_LOG.md` và `docs/adr/`:
mỗi giá trị trong hệ này đều có một phiếu quyết định đứng sau, và các phiếu đó giải
thích **vì sao** chứ không chỉ **là gì**.

## Thứ tự thẩm quyền

`playbook/` (luật) → `docs/core-specs/` (đặc tả) → `tokens.css` + component (mã).
Đặc tả thắng về *ý định*; mã thắng về *thứ đang chạy*. Lệch nhau thì ghi phiếu drift,
không âm thầm chọn một bên.

---

## NỀN TẢNG THỊ GIÁC

### Màu

Bảng màu **biển đảo**, không phải bảng màu "du lịch nói chung". Ở bản v2
(2026-08-06) toàn bộ token đất liền — ruộng lúa, đồi núi, đường bình độ — đã bị gỡ:
đó là nhận diện của một site du lịch bất kỳ, không phải của một công ty tour đảo.

- **Xanh biển sâu** `--c-primary #0C4A6E` — điều hướng, tiêu đề mục, dải màu đậm.
  Bản đậm `--c-primary-strong #082F49` cho gradient hero; `--c-primary-soft #F0F7FC`
  cho ô icon, viên lọc, nền ảnh chờ.
- **San hô** `--c-accent #C0392B` — CTA và nhãn giá, **chỉ hai vai đó**. Chữ trắng
  trên màu này đạt 5.44:1 (AA).
- **Cát** `--c-sand #F5A623` — gạch chân tiêu đề mục, nút trên nền xanh đậm, ô icon
  hub. Không dùng làm nền chữ trắng (chỉ 3.28:1).
- **Ngọc lam** `--c-sea / --c-green #0E7490` — sắc vịnh nông, dùng trong gradient.
- **Xanh lá** `--c-green-soft/-text` — CHỈ cho "miễn phí" và nhãn tác giả.
- **Nền trang TRẮNG THUẦN** `#FFFFFF`. Đây là quyết định có chủ ý (DR-003): ảnh biển
  đảo thật là thứ mang màu, nền không tranh việc đó.

Ba bộ giao diện chọn được trong Sanity Studio (`data-theme` trên `<html>`):
`bien-sau` (mặc định), `cat-bien` (nền kem #FDFAF5), `ngoc-lam`. Mỗi bộ chỉ đổi
bốn màu gốc; chữ, khoảng cách, bo góc giữ nguyên. Sửa sắc độ phải sửa cả ba.

**Bệnh đã chữa và đừng tái phát:** `--c-surface` #FFFFFF và `--c-surface-alt`
#F8FAFC chỉ lệch ~4% độ sáng, nên nếu cả trang chỉ dùng hai nền này thì đọc thành
một mảng trắng liền. Cách chữa là **diện tích màu**: dùng `--c-band-bg` (= primary)
cho một hai khối quan trọng để thẻ trắng nổi hẳn lên. Không phải thêm màu mới.

### Chữ

Hai vai, hai bộ, đều đủ dấu tiếng Việt:

- `--font-display` **Be Vietnam Pro** (700, 800) — tiêu đề. Vuông vắn, dứt khoát.
- `--font-ui` **Nunito** (biến thiên 400–800) — nội dung và giao diện. Tròn đầu nét,
  mắt người Việt đã quen nên không thấy lạ.

Hai token tách rời vì chúng là hai VAI: đổi vai này không kéo theo vai kia.

Thang cỡ đang chạy có **14 bậc phân biệt**: 11 · 12 · 14 · 15 · **17 (nội dung)** ·
18 · 20 · 21 · 26 · **32 (tiêu đề mục)** · 40 · 42 · **46 (hero)** · 60. Thang cũ dồn
cục ở khoảng giữa (17/18/18/20 — bốn bậc trong 3px) nên mắt không phân biệt được cấp;
đợt giãn thang là để chữa đúng chuyện đó.

Ba luật chữ tiếng Việt, không thoả hiệp:
1. `html { font-size: 100% }` — tôn trọng cỡ chữ người dùng đặt trong trình duyệt.
   Đặt `--fs-base` lên `html` sẽ nhân MỌI token rem thêm 17/16 (DR-034).
2. Chữ hiển thị lớn (h1 hero, số của dải số liệu) dùng `--lh-display: 1.22`. Ở cỡ
   46px, line-height 1.16 làm dấu ngã dòng dưới chạm dấu nặng dòng trên.
3. `letter-spacing` luôn là **0**, trừ nhãn CHỮ HOA (`--ls-eyebrow .08em`) — và
   nhãn chữ hoa thì BẮT BUỘC kèm `--lh-eyebrow 1.5`, vì chữ hoa tiếng Việt vẫn mang
   dấu. Tracking âm ép dấu của chữ này vào thân chữ bên.

### Khoảng cách, bo góc, bóng

Thang 9 bậc: 4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96. Giá trị ngoài thang là nguồn
sự thật thứ hai — đã có tiền lệ (gạch chân 34px) bị gỡ vì lý do này.

Nhịp dọc chuẩn của một mục: đệm `--s7` (48px) trên dưới, đầu mục cách nội dung
`--s6` (32px), tiêu đề cách gạch chân `--s3` (12px), lưới thẻ `--s5` (24px).

Bo góc: **8** (nút vuông, ô nhỏ) · **12** (thẻ, khối — mặc định) · **18** (hero, thẻ
hub) · **pill 999** (nút CTA, huy hiệu, viên lọc). Khung trang `--container 1200px`,
bề rộng đọc 70ch, cột phụ 340px cố định.

Bốn cấp bóng: `--shadow-card` (thẻ khi nghỉ, gần như phẳng) → `--shadow-raised`
(hover) → `--shadow-lg` (thẻ hub trên nền đậm) → `--shadow-overlay` (lớp nổi).
Bóng có tông xanh (`rgba(0,91,150,…)`), không phải xám trung tính.

### Nền, ảnh, hoạ tiết

- Nền trang trắng; khối xen kẽ `--c-surface-alt`; khối quan trọng `--c-primary`.
- Hoạ tiết duy nhất được phép là **dải sóng SVG** (`WaveDivider`, opacity .08) ở mép
  khối màu đậm. Không texture, không grain, không pattern lặp.
- Gradient chỉ ở ba chỗ: lớp phủ hero (đáy lên, `--c-primary-strong` → trong suốt
  55%), header trang danh sách (primary-soft → sand-soft), và ô ảnh chờ.
- Chất ảnh: **ảnh biển đảo thật**, nắng trưa, xanh lam–ngọc, tương phản cao. Không
  ảnh đơn sắc, không filter lạnh, không grain. Ảnh là thứ mang màu cho cả trang.
- Chân trang có ảnh nền thì lớp phủ màu chân trang **đục 88%** là bắt buộc — đó là
  lớp giữ tương phản AA, không phải hiệu ứng thẩm mỹ.
- Blur chỉ dùng một chỗ: `backdrop-filter: blur(4px)` trên huy hiệu trong hero ảnh.

### Chuyển động và trạng thái

- **180ms ease** (`--m-fast`): màu, viền, bóng, nhấc thẻ. **300ms ease**
  (`--m-base`): ảnh `scale(1.05)`, chevron xoay 180°. Một hàm easing cho cả site —
  không bounce, không spring, không cubic-bezier riêng.
- **Hover thẻ:** `translateY(-3px)` + `--shadow-raised` + viền chuyển `--c-primary`.
- **Hover nút:** đổi sang cấp đậm hơn (`--c-accent` → `--c-accent-strong`). Không
  đổi opacity, không scale.
- **Hover link điều hướng:** chữ `--c-primary` + nền `--c-primary-soft`. Link chân
  trang chuyển sang `--c-sand`.
- Không có press state riêng ngoài mặc định trình duyệt; không có ripple.
- `prefers-reduced-motion` tắt sạch animation và transition (khai trong `base.css`).

---

## NỀN TẢNG NỘI DUNG

Giọng: **nói việc cụ thể, không tô vẽ.** Đây là văn của người vận hành tour, không
phải văn quảng cáo.

- **Câu khẳng định ngắn, có con số và có mốc giờ.** "07:45 xe đón tại khách sạn nội
  thành." — không "đón khách siêu tiện lợi".
- **Nói cả cái mình không làm.** "Không bắt khách tự ra bến." · "Giá trên trang là
  giá bạn trả." · "Không bao gồm: đồ uống ngoài bữa trưa, dịch vụ tắm bùn, tiền tip."
- **Nói thẳng khi có rủi ro.** "Cảng cấm ra khơi thì chuyển ngày hoặc hoàn tiền,
  không thu thêm phí."
- **"Chúng tôi" khi nói về công ty, "bạn" khi nói với khách.** Không "quý khách",
  không "chúng ta".
- **Không dấu chấm than.** Không "ngay", "liền tay", "cực kỳ", "đẳng cấp",
  "thiên đường". Không viết hoa nhấn mạnh giữa câu.
- **Nhãn nút là động từ + đối tượng:** "Đặt vé qua Zalo", "Mua vé", "Gọi ngay",
  "Xem tất cả 7 tour". Nhãn có con số thì con số phải thật.
- **Minh bạch nguồn.** Mỗi trang chi tiết có dòng "Cập nhật {ngày}" và "Nguồn tham
  khảo: {host}". Khối đánh giá có dòng nói rõ đánh giá không được phát cho công cụ
  tìm kiếm.
- **Casing:** câu thường (sentence case) ở mọi tiêu đề. CHỮ HOA chỉ cho eyebrow và
  tiêu đề cột chân trang.
- **Emoji:** dùng, nhưng **chỉ làm icon** trong ô icon và trong nhãn Thông tin nhanh
  (🚐 🧭 🏷️ 💬 ⏱️ 📍). Không bao giờ trong câu văn.

Ví dụ nguyên văn từ `HOME_COPY`:

> "Không bắt khách tự ra bến. Tài xế nhận khách ngay tại khách sạn theo giờ đã hẹn."
> "Có người chịu trách nhiệm suốt chuyến, từ lúc lên xe đến lúc về lại khách sạn."
> "Báo giá trọn gói, không phụ thu phát sinh trong ngày. Giá trên trang là giá bạn trả."
> "Chốt qua Zalo với người thật, thống nhất cách thanh toán trước khi giữ chỗ."

---

## ICONOGRAPHY

Site **không có icon font, không có sprite, không có bộ SVG**. Hệ icon thật là hai
tầng, và hai tầng này không lẫn nhau:

1. **Emoji trong chuỗi** — đây là hệ chính. `FactStrip`, `InfoCard`,
   `HomeTrustBar`, `HomeHubGrid` đều khai `icon: string` và chỗ gọi truyền một ký
   tự emoji. Ví dụ đang chạy: 🚐 xe đón · 🧭 hướng dẫn viên · 🏷️ giá · 💬 Zalo ·
   🏛️ khám phá · 🛏️ lưu trú · 🚌 đi lại · 📞 gọi · 📍 vị trí · 🔗 nguồn.
   Cỡ 1.25rem trong Thông tin nhanh, 1rem trong thẻ thông tin, `--fs-h4` trong ô
   icon 48px.
2. **SVG inline vẽ tay trong component** — chỉ cho chrome, nơi emoji không phù hợp:
   hamburger, chevron, đồng hồ "Cập nhật", la bàn của trạng thái rỗng, dải sóng.
   Stroke 1.5–2.5px, `stroke-linecap: round`, `fill: none`, màu `currentColor`.

Không thêm bộ icon nào (Lucide, Heroicons…) vào hệ này: repo không dùng, và thay
emoji bằng icon vẽ sẽ đổi hẳn tông của site. `assets/favicon.svg` là favicon thật
chép từ repo. Logo là file chủ dự án cung cấp — **không có phiên bản SVG**, chỉ có
PNG tròn; `SiteLogo` có khối SVG dự phòng (thuyền cát trên tròn xanh) đúng như repo.

---

## SAI LỆCH PHÁT HIỆN

Ghi theo yêu cầu: nếu thấy lệch giữa Binding map / đặc tả / mã thì phải báo. Bốn
điểm dưới đây **đã có trong `docs/DRIFT_LOG.md` của repo** — hệ này theo MÃ và ghi
rõ chỗ lệch, không âm thầm chọn một bên.

1. **DR-050 / DR-051 — `07-DESIGN_TOKENS` §2 mô tả sai bộ chữ và thang cỡ đang
   chạy.** Đặc tả khai Nunito cho tiêu đề và thang 8 bậc; mã chạy Be Vietnam Pro cho
   tiêu đề và 14 bậc phân biệt. Design system này lấy theo mã. Cần chủ dự án chốt bộ
   chữ để đóng hai phiếu.
2. **DR-052 — hai file font 800 ship lên mà chưa từng được khai.**
   `be-vietnam-pro-latin-viet-800.woff2` (13.380 B) và `-vietnamese-800.woff2`
   (5.144 B) nằm trong `public/fonts/` và lên `dist/`, nhưng cả bốn `@font-face` ở
   `BaseLayout.astro` chỉ khai `font-weight: 700`. Hệ quả: 18.524 byte (21% ngân
   sách font) tải mà không dùng, và ≥12 component xin `--fw-800`/`--fw-900` trên
   `--font-display` bị trình duyệt **bôi đậm giả trên dấu tiếng Việt**.
   **Đã sửa trong hệ này:** `tokens/fonts.css` khai đủ cả 700 và 800. Cần một PR
   tương ứng vào `BaseLayout.astro` — nếu không, site production vẫn đậm giả.
3. **`--fw-900` không có mặt chữ thật.** Nunito biến thiên tối đa 800, Be Vietnam
   Pro tự lưu trữ 700/800. Token `--fw-900` vẫn tồn tại và `.hubs-title` đang dùng;
   trình duyệt kẹp về 800. Chạy được nhưng là token gây nhầm — nên gỡ hoặc đổi tên.
4. **Nhãn CTA có hai nguồn, dễ dùng lẫn.** `uiCopy.bookTicket` = "Đặt vé"
   (`AttractionDetail` truyền cho `BookingCTA`) và
   `PRICE_CTA_LABELS.attraction` = "Mua vé" (`PriceDisplay`). Hai nhãn khác nhau
   trên CÙNG một trang. Hệ này giữ nguyên hành vi và ghi rõ trong
   `AttractionDetail.prompt.md`; nếu chủ dự án muốn một nhãn thì phải sửa ở kho chữ,
   không sửa ở component.

Ngoài ra, hai điểm **không phải lệch mà là nợ có chủ ý** trong repo, đã tôn trọng:
prop `infoBarItems` của `DetailLayout` đã `@deprecated` nhưng còn giữ (DR-046), và
slot `info` của `Sidebar` chỉ còn ba template dùng.

---

## Chỉ mục

| Đường dẫn | Nội dung |
|---|---|
| `styles.css` | Điểm nạp duy nhất — chỉ `@import` |
| `tokens/` | `fonts` · `colors` · `themes` · `typography` · `spacing` · `effects` · `layout` · `base` |
| `guidelines/` | 21 thẻ nền tảng (Colors · Type · Spacing · Brand) |
| `components/` | Component React + `.d.ts` + `.prompt.md` theo nhóm |
| `ui_kits/website/` | UI kit website — 6 màn click-thru (`index.html`) |
| `templates/trang-tour/` | Template dùng được cho project tiêu thụ: trang chi tiết tour |
| `assets/` | `logo-tourdao.png` · `favicon.svg` · `fonts/` (6 woff2) · `img/` (6 ảnh) |
| `SKILL.md` | Bản dùng được như Agent Skill trong Claude Code |
| `github.md` | Liên kết repo nguồn và bản đồ màn hình |

### Components

**chrome/** — `SiteLogo` · `Header` · `Footer` · `FooterBadges` · `Breadcrumb`

**layout/** — `Hero` · `Section` · `Sidebar` · `DetailLayout` · `WaveDivider`

**content/** — `Card` · `FactStrip` · `InfoCard` · `Body` · `FAQ` · `Gallery` ·
`NearbySection` · `SkeletonCard` · `AuthorityMeta`

**feedback/** — `EmptyState`

**action/** — `BookingCTA` · `PriceDisplay` · `ContactCTA` · `ContactChannels`

**map/** — `MapView` · `RouteMap`

**listing/** — `EntityIndex`

**home/** — `HomeHero` · `HomeTourGrid` · `HomeHubGrid` · `HomeTrustBar` ·
`HomeStatsBand`

**templates/** — `TourDetail` · `AttractionDetail` · `ArticleDetail`

### Không dựng, và vì sao

Repo có 60 component. Phạm vi lượt này (chủ dự án chốt): 28 primitive dùng chung +
một template đại diện mỗi nhóm.

- **`RouteDispatch`** — không có bề mặt thị giác, chỉ định tuyến.
- **`SiteHome`, `TouristDestinationHub`** — là *bố cục trang*, không phải primitive.
  Đã dựng lại bên trong UI kit thay vì làm component.
- **10 template chi tiết còn lại** (`PlaceDetail`, `ExperienceDetail`,
  `LodgingDetail`, `HotelDetail`, `ResortDetail`, `RestaurantDetail`,
  `SpecialtyDetail`, `EventDetail`, `OrganizationDetail`, `PersonDetail`) — cùng
  khung `DetailLayout`, chỉ khác delta field.
- **9 khối trang chủ còn lại** (`HomeAreaGrid`, `HomeBannerGrid`, `HomeFacts`,
  `HomeGroupQuote`, `HomeGuideGrid`, `HomeMetaBar`, `HomePartners`,
  `HomeRollupSection`, `HomeTestimonials`).
- **4 trang danh sách còn lại** (`EventIndex`, `HubIndex`, `TermIndex`,
  `TourIndex`) — `HubIndex` đã dựng lại trong UI kit.

Nói một câu là mở rộng được — thứ tự đề nghị: `HubIndex` + `TourIndex` →
`LodgingDetail` (mở nhánh khách sạn/resort) → 9 khối trang chủ còn lại.

### Bổ sung có chủ ý

Không có. Mọi component trong hệ này đều có đối ứng 1–1 trong
`COMPONENT_INVENTORY.md`. Prop bị đổi tên khi chuyển từ Astro slot sang React
children (ví dụ `sidebarSlots` → `sidebarCards`, `slots` → `cards`) — đó là thích
nghi kỹ thuật, không phải API mới; `.d.ts` ghi rõ từng chỗ.
