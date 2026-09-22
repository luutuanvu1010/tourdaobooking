# Bằng chứng: Đợt C — Đăng nhập / Tôi / Góp ý (2026-09-22)

Artifact của Task 4 (task cuối) kế hoạch "Thiết kế lại giao diện — Đợt C"
(`docs/superpowers/sdd/2026-09-22-thiet-ke-lai-giao-dien-dot-c/`). Hiến pháp §8.2: bằng chứng thay cho lời khai.
**Mã được đo: commit `8587cad`** (thêm chính kịch bản này) trên nhánh `thiet-ke-lai-giao-dien`, đứng sau ba task
Đăng nhập (`540038e`), Tôi (`9e72723`+`c5f69d4`), Góp ý (`925ce4d`+`2a08997`+`93f7d55`).

Đo trên `wrangler dev` cục bộ với D1 tạm và tài khoản ADMIN thử (`0900000204`), bằng Chrome headless, hai khổ:
máy tính 1040×800 (`deviceScaleFactor: 1`) và điện thoại 390×844 (`deviceScaleFactor: 2`). **Không phải** đo trên
iPhone thật, mạng thật hay Workers Assets thật.

## Ký duyệt thị giác

**Chưa ký.** Chủ dự án xem `anh/` rồi ghi tại đây: ngày, ai ký, điểm cần sửa (nếu có).

## Đối chiếu ảnh

| Ảnh (`anh/`) | Trang | Khổ |
|---|---|---|
| `dang-nhap-may-tinh.png` / `dang-nhap-dien-thoai.png` | `/login` (Đăng nhập, chưa đăng nhập) | 1040×800 / 390×844 |
| `toi-may-tinh.png` / `toi-dien-thoai.png` | `/account` (Tôi, tài khoản ADMIN có đủ khối kể cả bảo trì) | 1040×800 / 390×844 |
| `gop-y-may-tinh.png` / `gop-y-dien-thoai.png` | `/feedback?id=<uuid>` (Góp ý, luồng đang mở) | 1040×800 / 390×844 |

6 ảnh (3 trang × 2 khổ, đúng tối thiểu theo brief). Không có ảnh nền trước/sau: ba trang này lần đầu có kịch bản
Chrome riêng (trước Đợt C chỉ được phủ gián tiếp qua `v1-dang-nhap.mjs`/`v1-bao-tri.mjs`, không phủ bố cục 2 cột mới).

## Kịch bản

`kich-ban/dot-c-smoke.mjs` — dùng lại nguyên cơ chế CDP của A2 (`startEnv`/`ACCOUNTS`/`ok` từ
`docs/evidence/2026-09-20-a2/kich-ban/a2-cdp.mjs`, không viết lại) theo đúng mẫu cấu trúc của
`docs/evidence/2026-09-22-buoc-2-dot-a/kich-ban/dot-a-smoke.mjs`. Với mỗi trong ba trang, ở cả hai khổ:

- **Đăng nhập** (`/login`, không đăng nhập trước): máy tính → `.login-brand` HIỆN thật
  (`getComputedStyle(...).display !== "none"` và `offsetParent !== null`), `.login-form-col` chứa `#login-form`;
  điện thoại → `.login-brand` ẨN (`display: none`, đúng mốc CSS `@media (max-width: 899px)`), `#phone`/`#pin`
  vẫn HIỆN và dùng được ở cả hai khổ.
- **Tôi** (`/account`, tài khoản ADMIN thử; trước khi mở trang, kịch bản tự đặt
  `mnt_setting.allowed_phones = '0900000204'` — giống `v1-bao-tri.mjs` — để mục "Chế độ bảo trì" thật sự hiện,
  không kiểm nhầm một phần tử đang ẩn): máy tính → `.account-layout` là `display: grid`, `#maintenance` ở
  `grid-column: 2` (cột phải), `#me` ở `grid-column: 1`, thứ tự DOM đúng gốc
  `#me, #myjobs, #links, #maintenance, #pin-form`; điện thoại → `.account-layout` là `display: block`, cùng thứ
  tự DOM (nên cũng đúng thứ tự hiển thị — không còn div bọc `.account-main`/`.account-side` từng đảo thứ tự ở
  vòng kiểm Task 2), không tràn ngang (`scrollWidth - clientWidth <= 1`).
- **Góp ý** (`/feedback?id=<id>`, tài khoản ADMIN thử; `id` lấy từ một yêu cầu tạo trước bằng `POST /api/feedback`
  thật): máy tính → CẢ `#list-card` VÀ `#thread` đều `hidden === false` và hiện thật, `#list-card` có nội dung
  thật (`#list .list-row`/`#list p` ≥ 1, không trống — đúng hành vi sau khi Task 3 vòng kiểm thêm `loadList()`
  khi mở luồng ở ≥900px); điện thoại → `#list-card` phải `hidden === true` (ẩn thật), chỉ `#thread` hiện.
- Mỗi trang × mỗi khổ: `axe-core` chạy trên toàn trang, không có vi phạm mức `critical`/`serious` (đúng ngưỡng
  `dot-a-smoke.mjs` đã dùng). Không lỗi console ở bất kỳ bước nào.

Chạy (từ gốc repo, sau `npm run build:web`):
```
AXE_JS=<đường dẫn axe.min.js> CHROME_BIN=<đường dẫn chrome-wrap.sh> \
  node docs/evidence/2026-09-22-thiet-ke-lai-giao-dien-dot-c/kich-ban/dot-c-smoke.mjs
```
Lần chạy ghi bằng chứng này dùng `axe-core@4.13.0` (`npm install axe-core@4.13.0 --no-save` vào một thư mục tạm
ngoài repo — axe-core không nằm trong repo, không phải dependency runtime) và
`CHROME_BIN=docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh` (đường dẫn tương đối, chỉ đúng khi chạy từ gốc
repo — script gốc trỏ thẳng "/Applications/Google Chrome.app/..." nên `chrome-wrap.sh` chỉ là một lớp bọc để
CHROME_BIN nhận một đường dẫn thực thi được).

**Kết quả lần chạy ghi bằng chứng này:** 6/6 bước ✓ (3 trang × 2 khổ), thoát mã 0, không phải sửa mã Task 1–3
nào để qua. Chạy lại thêm một lần (sau khi hoàn nguyên bước P16 dưới đây và `npm run build:web` lại): vẫn 6/6 ✓.

## P16 — đã quan sát cơ chế kiểm chặn thật một lần

Trước khi ghi "đạt", đã cố ý phá mốc CSS của cột thương hiệu để xem kịch bản có bắt được không: sửa tạm
`public/app.css` dòng `@media (max-width: 899px) { .login-brand { display: none; } }` thành
`@media (max-width: 100px) { .login-brand { display: none; } }` (không cần `build:web`, CSS phục vụ tĩnh), chạy
lại kịch bản → **đỏ** ngay ở bước điện thoại của trang Đăng nhập:

```
AssertionError [ERR_ASSERTION]: Đăng nhập (điện thoại): .login-brand phải ẨN (display:none) —
{"brandDisplay":"block","brandVisible":true,"formColHasForm":true,"phoneUsable":true,"pinUsable":true}
'block' !== 'none'
```

Sau đó `git checkout -- public/app.css` hoàn nguyên, `npm run build:web` lại rồi chạy lại: 6/6 ✓ như cũ. Cơ chế
kiểm được coi là hoạt động thật (không chỉ "dựa vào kỷ luật").

## Chưa kiểm

- iPhone thật (bàn phím, an toàn màn hình…) — chưa đo, giống mọi bằng chứng Chrome headless khác trong repo.
- Tài khoản KHÔNG phải ADMIN ở `/account` (cột phải trống hẳn hay có gì khác — brief để "tự quyết lúc thi công",
  chưa kiểm bằng kịch bản) và ở `/feedback?id=` của chính mình (không thấy tab "Hàng đợi") — brief giao việc này
  cho lượt kiểm độc lập sau Task 4, không phải Task 4 tự kiểm.
- Đúng biên 899px/900px (viewport 899 vs 900) — kịch bản chỉ đo ở 1040 và 390, chưa đo sát mốc.
- Widget Turnstile ở khổ hẹp giáp ranh 900px (che/đẩy lệch bởi cột thương hiệu) — brief giao việc này cho lượt
  kiểm độc lập sau Task 4.
- Chưa có ai ngoài người thi công xem qua `anh/` hay chạy lại kịch bản (kiểm độc lập là việc của điều phối sau
  Task 4, không tự làm ở đây — N8).

`npm test` (490/490) và `npm run typecheck` (0 lỗi) đã chạy xanh ở commit đo bằng chứng này.
