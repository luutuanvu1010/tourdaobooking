# Giao diện công ty — Toàn quyền tự chỉnh màu, phông, cỡ chữ, độ đậm

- **Ngày:** 2026-10-02. **Trạng thái:** đặc tả **chờ chủ duyệt**; kèm bản nháp **ADR-0087** (mục 9) — chưa thi công.
- **Lời giao việc (chủ dự án, 2026-10-02):** "đổi trong token design luôn để sau này có tạo những giao diện mới thì mặc định đã tham chiếu đến những giá trị mong muốn theo đúng cách, nhưng tôi đang nghĩ là cho tôi tuỳ biến trong bảng điều khiển của Super Admin đi, từ màu nền, thanh tác vụ, nút hành động, cỡ chữ, độ đậm, phông chữ, các heading, body…"
- **Chủ đã chốt (2026-10-02, qua câu hỏi):**
  1. **Một bộ giao diện chung** cho cả công ty, Toàn quyền chỉnh. Tuỳ chọn từng người (kế hoạch "3 tông" 1/10) để sau — bảng điều khiển này dùng lại được cho nó.
  2. **Màu tự do, máy chặn chữ khó đọc** (tương phản dưới chuẩn thì không cho lưu); có nút "Về mặc định".
  3. **Phông chọn trong danh sách phông tiếng Việt đã kiểm**, tải sẵn trong app; chọn riêng cho tiêu đề và nội dung.
  4. **Cỡ chữ và độ đậm theo vai**: tiêu đề, nội dung, nhãn, nút.
- **Nền đã có (nhánh `thanh-sang-chu-manh`, bản 1.65):** màu thanh / nút chính / mục đang chọn / mảng đậm và độ đậm chữ đã gom thành token theo VAI ở `:root` của `public/app.css` (khối "MÀU THEO VAI", "ĐỘ ĐẬM CHỮ"), có bài `src/token-giao-dien.test.ts`. Bảng điều khiển chỉ việc **ghi đè giá trị các token đó** — không đụng luật CSS của từng màn.
- **Đã tra:** Hiến chương (`docs/ARCHITECTURE.md` Phần I) và `docs/adr/` không có điều nào về giao diện tuỳ chỉnh ⇒ cần ADR mới (chạm dữ liệu: bảng mới; chạm quyền: ai được đổi). `docs/quyen-hoan.json` không có phát hiện HIGH nào đang mở (không "xây trên lỗ đang hở").
- **Không cần trang ghép** (CLAUDE.md §9): một quyết định, một bảng mới chỉ chứa một loại dữ liệu, dùng lại một ô quyền có sẵn.

## 1. Kết quả mong muốn (kiểm được)

1. Toàn quyền mở **"Giao diện"** (thanh bên nhóm Quản trị + dòng ở trang Tôi), đổi một màu / phông / cỡ / độ đậm → **thấy ngay** trên chính trang đó (chỉ máy mình), chưa ai khác thấy.
2. Bấm **"Áp dụng cho mọi người"** → mọi người dùng (kể cả màn Đăng nhập) thấy giao diện mới ở lần mở trang kế tiếp, **không nháy** màu cũ trước.
3. Chọn cặp màu khó đọc (ví dụ chữ thanh xám nhạt trên nền thanh trắng) → ô đó báo đỏ "Chữ trên thanh đầu khó đọc (2,1:1, cần ít nhất 4,5:1)", nút áp dụng bị khoá; máy chủ **cũng** từ chối (400) nếu gửi thẳng.
4. **"Về mặc định"** → trở lại đúng giá trị trong `app.css` (bản 1.65).
5. Người không giữ quyền Toàn quyền: không thấy mục; gọi thẳng API ghi → 403.
6. Mất mạng / máy chủ lỗi → app vẫn hiện bằng giao diện mặc định, không vỡ.
7. Mỗi lần áp dụng ghi một dòng nhật ký (ai, lúc nào, đổi những ô nào).

## 2. Các "núm" chỉnh (danh sách ĐÓNG — mỗi núm = một token)

Mỗi núm là một khoá cố định, máy chủ chỉ nhận khoá trong danh sách. Thêm núm sau này = thêm một dòng vào danh sách (`src/shared/giao-dien.ts`).

**Màu** (ô chọn màu, giá trị `#rrggbb`):

| Nhóm | Núm (nhãn) | Token |
|---|---|---|
| Nền | Nền trang · Nền thẻ | `--c-surface-alt` · `--c-surface` |
| Chữ | Chữ chính · Chữ phụ · Viền | `--c-text` · `--c-text-muted` · `--c-border` |
| Thương hiệu | Màu chính (tiêu đề, liên kết, chữ nhấn) · Màu chính nhạt | `--c-primary` · `--c-primary-soft` |
| Thanh tác vụ | Nền thanh trên · Chữ thanh trên · Nền thanh bên · Chữ thanh bên · Nền mục đang chọn · Chữ mục đang chọn | `--c-bar-bg` · `--c-on-bar` · `--c-sidebar-bg` · `--c-sidebar-item` · `--c-sidebar-active` · `--c-sidebar-text-on` |
| Nút | Nền nút chính · Chữ nút chính · Nền nút hành động chốt (Tạo đơn, Xác nhận) | `--c-btn-primary-bg` · `--c-btn-primary-text` · `--c-accent` |

- Token dẫn xuất (`--c-btn-primary-border`, `--c-selected-*`, `--c-band-*`, `--c-sidebar-badge*`, `--c-sidebar-title`, `--c-bar-border`…) **đi theo núm gốc** (ghi đè cùng giá trị hoặc giữ `var()` trỏ núm gốc) — chủ không phải chỉnh 30 ô. Bảng "núm → các token kéo theo" nằm trong `src/shared/giao-dien.ts`.
- **Không phải núm (giữ cố định):** màu nghĩa trạng thái (đỏ nguy hiểm, xanh lá đã xác nhận, cát nhắc nhở), chữ trắng trên nút chốt, ảnh xác nhận gửi khách, biểu tượng app.

**Chữ:**

| Vai | Núm | Token | Khoảng cho phép |
|---|---|---|---|
| Phông tiêu đề / Phông nội dung | danh sách phông | `--font-display` / `--font` | Be Vietnam Pro (mặc định), Nunito, Lexend, Noto Sans |
| Tiêu đề trang | cỡ · độ đậm | `--fs-h1` (mới, nếu chưa có) · `--fw-heading` (mới, luật nền `h1–h6` trỏ vào) | 20–32px · 400–700 |
| Tiêu đề mục | cỡ | `--fs-h2` | 16–24px |
| Nội dung | cỡ · độ đậm | `--fs-step-5` (cỡ `body`) · `--fw-regular` | 14–18px · 300–500 |
| Nhãn, chữ phụ | cỡ | `--fs-label` | 12–16px |
| Nút, tên, số tiền (chữ nhấn) | độ đậm | `--fw-semibold`, `--fw-bold`, `--fw-heavy` (một núm kéo cả ba) | 400–700 |

- **Ô gõ luôn ≥ 16px** (iPhone tự phóng to nếu nhỏ hơn) — không phải núm; luật ô gõ đọc token riêng không bị kéo theo cỡ nội dung.
- Độ đậm chỉ nhận giá trị **có tệp phông thật** của phông đang chọn (không để trình duyệt tô đậm giả — luật `src/phong-chu.test.ts`).
- Cỡ chữ khác thang `--fs-step-*` được phép trong khoảng trên (thang 30/9 vẫn là mặc định).

## 3. Lưu trữ (cần ADR — mục 9)

- **Module mới `giao-dien`** (nghiêm: `defineSql`, câu tĩnh), tiền tố bảng `gd_`.
- **Bảng `gd_setting`** (migration **0069** — `0068` đã có trên nhánh `van-chuyen-dot-1`; kiểm lại lúc thi công): MỘT dòng `id = 'default'` như `mnt_setting`.
  - `tokens TEXT NOT NULL` — JSON `{ "<khoá núm>": "<giá trị>" }`, chỉ các núm đã đổi khỏi mặc định (rỗng `{}` = mặc định).
  - `version INTEGER NOT NULL` — khoá lạc quan: hai Toàn quyền cùng sửa, người lưu sau nhận 409 "Giao diện vừa được người khác đổi — tải lại".
  - `updated_by`, `updated_at`.
- Không bảng lịch sử: **nhật ký** giữ lịch sử (`giao_dien_changed`, chi tiết = danh sách khoá đổi + giá trị cũ → mới; màu/phông/cỡ không phải dữ liệu cá nhân).
- `docs/data-dictionary.json` + `npm run dict`; `ALLOWED_EDGES`, `STRICT`, mảng `modules`.

## 4. Quyền (cần ADR)

- **Dùng lại ô có sẵn `settings.ops`** (chỉ Toàn quyền có `any` — `src/shared/permissions.ts:141`; cùng ô với Chế độ bảo trì, Trợ lý Hỗ trợ). Không thêm mã thao tác mới ⇒ không đổi bản đồ quyền, không nhân bài "tập con quyền".
- `PUT /api/giao-dien` — cổng `admin`, `if (!can(staff, "settings.ops"))` viết thẳng (hàng rào `src/route-write-guard.test.ts`), kiểm trước khi đọc thân.
- Đọc giao diện: **công khai** (mục 5) — chỉ chứa màu/phông/cỡ, không có gì nhạy cảm; trang Đăng nhập cần nó trước khi có phiên.

## 5. Đưa giao diện tới mọi trang — không nháy, không vỡ khi mất mạng

- **Route công khai `GET /api/giao-dien.css`** trả `text/css`: một khối `:root { --c-bar-bg: #…; … }` dựng từ `gd_setting.tokens` **đã kiểm lại** (chỉ khoá trong danh sách, giá trị đúng dạng — không bao giờ chép chuỗi thô vào CSS).
  - Mỗi `public/*.html` thêm `<link rel="stylesheet" href="/api/giao-dien.css">` **ngay sau** `/app.css` (33 trang; `tests/e2e/pwa.mjs` thêm vào `NEEDLES` để trang mới không quên). Thẻ `link` chặn vẽ ⇒ **không nháy** màu mặc định.
  - `ETag` = `version`; trình duyệt hỏi lại có điều kiện, máy chủ trả 304 nếu không đổi (một lần đọc D1 nhỏ mỗi lần mở trang).
  - Service worker **không** cache `/api/*` (luật hiện hành giữ nguyên). Mất mạng: thẻ `link` lỗi → trang dùng mặc định của `app.css`, không vỡ.
  - Đây là route đầu tiên trả không phải JSON: thêm một hàm `css()` cạnh `json()` ở `src/shared/http.ts`, có test. CSP không cần nới (`style-src 'self'`).
  - Bảo trì: route công khai đã bỏ qua cổng bảo trì (`router.ts:281`) ⇒ màn bảo trì cũng theo giao diện.
- **Phông:** mỗi phông trong danh sách có tệp `woff2` đủ chữ Việt cho từng độ đậm cho phép, ở `public/fonts/` (như Be Vietnam Pro 30/9). `@font-face` khai sẵn trong `app.css` (trình duyệt chỉ tải tệp của phông thật sự dùng). Chỉ Be Vietnam Pro nằm trong `PRECACHE`; phông khác tải khi cần.
- **Thanh trạng thái iPhone** giữ kiểu `default` (chữ đen nền trắng) — thẻ meta tĩnh, không đổi theo giao diện. Hệ quả có chủ ý: nếu chủ chọn nền thanh trên màu đậm, phía trên vẫn có một dải trắng chứa giờ/pin.

## 6. Kiểm hợp lệ — MỘT tệp thuần dùng chung máy chủ ↔ giao diện

`src/shared/giao-dien.ts` (thuần, có `giao-dien.test.ts` cạnh):
- `NUM` — danh sách núm: khoá, nhãn tiếng Việt, loại (màu / phông / cỡ / độ đậm), khoảng, token kéo theo, giá trị mặc định (đọc từ `app.css` bằng bài kiểm để không lệch).
- `kiemGiaoDien(tokens)` → danh sách lỗi tiếng Việt: khoá lạ, sai dạng `#rrggbb`, phông ngoài danh sách, cỡ / độ đậm ngoài khoảng hoặc không có tệp phông, và **tương phản** các cặp dưới 4,5:1:
  - chữ chính / nền trang, chữ chính / nền thẻ, chữ phụ / nền thẻ, màu chính / nền thẻ (liên kết),
  - chữ thanh trên / nền thanh trên, chữ thanh bên / nền thanh bên, chữ mục đang chọn / nền mục đang chọn,
  - chữ nút chính / nền nút chính, chữ trắng / nền nút chốt.
- `dungCss(tokens)` → chuỗi `:root{…}` (chỉ từ giá trị đã qua kiểm).
- Hàm đo tương phản dời từ `src/token-giao-dien.test.ts` vào đây (một nguồn).
- Máy chủ gọi `kiemGiaoDien` trước khi ghi (400 kèm danh sách lỗi); giao diện gọi cùng hàm khi người dùng kéo màu để báo ngay.

## 7. Màn "Giao diện" (trang riêng `/giao-dien`, chỉ `settings.ops`)

- Hai cột ở máy tính (ô chỉnh trái, **khung xem trước** phải), một cột ở điện thoại. Nhóm: Màu nền & chữ · Thanh tác vụ · Nút · Phông & cỡ chữ.
- Khung xem trước: thanh trên, mục thanh bên đang chọn, một thẻ đơn, nút chính / phụ / chốt, tiêu đề, đoạn nội dung — dựng bằng chính lớp CSS thật của app. Ngoài ra **cả trang** đổi theo ngay (ghi đè `:root` tạm trên máy người chỉnh) để thấy thật.
- Mỗi ô có dấu "đã đổi" + nút nhỏ "về mặc định" của riêng ô đó. Lỗi tương phản hiện ngay dưới ô.
- Nút dưới cùng: **"Áp dụng cho mọi người"** (hộp xác nhận ngay trong trang, không dùng `confirm()`), **"Bỏ thay đổi"**, **"Về mặc định toàn bộ"**.
- Đúng luật giao diện: dựng bằng `h()`, khai `PAGES` + `build:web`, ô gõ 16px, giao diện hỏi `can(staff, "settings.ops")`.

## 8. Kiểm (khi thi công)

- Đỏ trước, xanh sau: `giao-dien.test.ts` (khoá lạ, sai dạng, ngoài khoảng, tương phản, `dungCss` không lọt ký tự lạ như `;` `}` `<`), e2e `giao-dien.mjs` (403 với Bán hàng/Quản trị, 400 tương phản, 409 phiên bản, nhật ký không ghi gì ngoài khoá và giá trị, `GET /api/giao-dien.css` công khai + 304 theo ETag, "Về mặc định" trả `:root{}` rỗng).
- `tests/e2e/pwa.mjs`: mọi trang có thẻ `link` tới `/api/giao-dien.css` sau `/app.css`.
- Kịch bản Chrome: đổi nền thanh → trang khác của tài khoản khác thấy màu mới sau tải lại; mất mạng giả lập → mặc định; 390 + 1040.
- Việc lớn (dữ liệu + quyền) ⇒ **người kiểm độc lập** chỉ đọc trước khi báo đạt.

## 9. Bản nháp ADR-0087 — "Giao diện công ty do Toàn quyền chỉnh" (proposed)

> Số 0087: `ADR-0086` đã có trên nhánh `van-chuyen-dot-1` / `worktree-doi-chieu-phieu-giam-doc` (chưa gộp). Đặt ở đây (không ở `docs/adr/`) để chủ duyệt trước; duyệt xong chép sang `docs/adr/0087-giao-dien-cong-ty.md`.

**Bối cảnh.** Chủ dự án muốn tự chỉnh giao diện (màu, phông, cỡ, độ đậm) mà không cần lập trình viên, áp cho cả công ty. Từ 1.65 mọi màu thanh/nút và độ đậm đã đi qua token theo vai.

**Quyết định.**
1. Có MỘT bộ giao diện chung, lưu ở bảng một dòng `gd_setting` của module mới `giao-dien`; giá trị là tập GHI ĐÈ token (khoá trong danh sách đóng), rỗng = mặc định của `app.css`.
2. Chỉ người giữ ô `settings.ops` (Toàn quyền) đổi được; không thêm mã quyền mới.
3. Giao diện đọc công khai qua `GET /api/giao-dien.css` (text/css, ETag), nạp bằng thẻ `link` ngay sau `app.css` ở mọi trang; lỗi/mất mạng = mặc định.
4. Máy chủ kiểm hợp lệ bằng cùng một tệp thuần với giao diện, gồm tương phản ≥ 4,5:1 cho các cặp chữ/nền đã liệt kê; không đạt → 400, không lưu.
5. Phông chỉ chọn trong danh sách phông có tệp đủ chữ Việt nằm trong app; không nạp phông từ ngoài (CSP giữ nguyên).
6. Mỗi lần áp dụng ghi nhật ký `giao_dien_changed` (khoá + giá trị cũ → mới).
7. Ngoài phạm vi: tuỳ chọn theo từng người (kế hoạch 3 tông — làm sau, sẽ là lớp thứ hai đè lên lớp này), ảnh xác nhận gửi khách, biểu tượng / `theme-color`.

**Hệ quả.** + Chủ tự đổi giao diện tức thì, không cần phát hành. + Màn mới tự theo vì dùng token vai. − Mỗi lần mở trang thêm một yêu cầu nhỏ (304 phần lớn). − Một lựa chọn xấu (vẫn đạt tương phản) áp cho cả công ty ngay — giảm bằng xem trước + "Về mặc định". − Thêm 3 phông làm kho tệp tĩnh lớn thêm (~0,5–1 MB, không tải nếu không dùng).

**Phương án đã cân nhắc.** (a) Gửi giao diện trong `/api/auth/me` rồi áp bằng JS — bị nháy màu, trang Đăng nhập không có. (b) Lưu trong bộ nhớ máy (localStorage) — không chung cho công ty. (c) Sinh lại `app.css` khi lưu — Worker Assets là tệp tĩnh lúc deploy, không ghi được.

## 10. Điều chưa chắc / giả định (đảo ngược được)

- **G1** Danh sách phông: Be Vietnam Pro, Nunito, Lexend, Noto Sans — sẽ kiểm từng phông có đủ dấu tiếng Việt và hiển thị đúng trên Windows (bài học 30/9) trước khi đưa vào; phông nào trượt thì bỏ.
- **G2** Trang riêng `/giao-dien` thay vì một khối trên trang Tôi (nhiều ô, cần khung xem trước).
- **G3** Không làm "lưu nháp chia sẻ": thay đổi chưa áp dụng chỉ sống trên máy người đang chỉnh.
- **G4** Nền thanh trên màu đậm vẫn có dải trắng chứa giờ/pin trên iPhone (mục 5).
