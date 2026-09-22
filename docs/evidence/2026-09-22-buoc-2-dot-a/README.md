# Bằng chứng: Bước 2 Đợt A — 5 trang bảng→thẻ (2026-09-22)

Artifact của Task 7 (kịch bản Chrome kiểm 5 trang vừa restyle: Nhân viên, Dịch vụ & giá, Địa điểm, Hồ sơ, Nhật ký — Task 1–6 của
"Bước 2 Đợt A", kế hoạch `docs/superpowers/sdd/2026-09-22-thiet-ke-lai-giao-dien-buoc-2-dot-a/`). Hiến pháp §8.2: bằng chứng thay
cho lời khai. **Mã được đo: commit `65dd4ec`** (thêm chính kịch bản này) trên nhánh `thiet-ke-lai-giao-dien`.

Đo trên `wrangler dev` cục bộ với D1 tạm và tài khoản ADMIN thử, bằng Chrome headless, hai khổ: điện thoại 390×844 (`deviceScaleFactor: 2`
— ảnh 2x, kích thước tệp gấp đôi khổ CSS, khác với ảnh 1x của `2026-09-20-a2`) và máy tính 1040×800 (`deviceScaleFactor: 1`). **Không phải**
đo trên iPhone thật, mạng thật hay Workers Assets thật.

## Ký duyệt thị giác

**Chưa ký.** Chủ dự án xem `anh/` rồi ghi tại đây: ngày, ai ký, điểm cần sửa (nếu có).

## Đối chiếu ảnh

| Ảnh (`anh/`) | Trang | Khổ |
|---|---|---|
| `nhan-vien-may-tinh.png` / `nhan-vien-dien-thoai.png` | `/staff` (Nhân viên) | 1040×800 / 390×844 |
| `dich-vu-may-tinh.png` / `dich-vu-dien-thoai.png` | `/catalog` (Dịch vụ & giá) | 1040×800 / 390×844 |
| `dia-diem-may-tinh.png` / `dia-diem-dien-thoai.png` | `/locations` (Địa điểm) | 1040×800 / 390×844 |
| `ho-so-may-tinh.png` / `ho-so-dien-thoai.png` | `/parties` (Hồ sơ) | 1040×800 / 390×844 |
| `nhat-ky-may-tinh.png` / `nhat-ky-dien-thoai.png` | `/audit` (Nhật ký) | 1040×800 / 390×844 |

10 ảnh, không có ảnh nền trước/sau (5 trang này chưa từng có bằng chứng khổ thẻ trước Đợt A).

## Kịch bản

`kich-ban/dot-a-smoke.mjs` — dùng lại nguyên cơ chế CDP của A2 (`startEnv`/`ACCOUNTS`/`ok` từ
`docs/evidence/2026-09-20-a2/kich-ban/a2-cdp.mjs`, không viết lại). Với mỗi trong 5 trang, ở cả hai khổ:
- Dựng dữ liệu tối thiểu bằng API thật trước khi mở trang (1 địa điểm, 1 hồ sơ, 1 đơn — chỉ để `/locations`, `/parties`, `/audit`
  có ít nhất một dòng; `/staff` và `/catalog` đã có sẵn từ seed của `startEnv()`).
- Máy tính: `table.items` phải HIỆN (`offsetParent !== null`), `.card-list` phải ẨN (`getComputedStyle(...).display === "none"`).
- Điện thoại: ngược lại, và `.card-list .card` phải có ít nhất 1 phần tử; chạy `axe-core`, không được có vi phạm mức `critical`/`serious`.
- Không lỗi console ở cả hai khổ.

Chạy: `npm run build:web && AXE_JS=<đường dẫn axe.min.js> CHROME_BIN=<đường dẫn chrome-wrap.sh> node docs/evidence/2026-09-22-buoc-2-dot-a/kich-ban/dot-a-smoke.mjs`.

**Kết quả lần chạy ghi bằng chứng này:** 10/10 bước ✓ (5 trang × 2 khổ), thoát mã 0, không phải sửa CSS/DOM của Task 1–6 nào để qua.

## P16 — đã quan sát cơ chế kiểm chặn thật một lần

Trước khi ghi "đạt", đã cố ý phá mốc bảng→thẻ để xem kịch bản có bắt được không: sửa tạm `public/app.css` dòng breakpoint
`@media (max-width: 899px) { .table-wrap { display: none; } }` thành `max-width: 100px` (không cần `build:web`, CSS phục vụ tĩnh),
chạy lại kịch bản → **đỏ** ngay ở bước đầu tiên của khổ điện thoại:

```
AssertionError [ERR_ASSERTION]: nhan-vien (điện thoại): table.items phải ẨN — {"tableVisible":true,"cardListDisplay":"grid","cardListVisible":true,"cardCount":4}
```

Sau đó `git checkout -- public/app.css` hoàn nguyên và chạy lại: 10/10 ✓ như cũ. Cơ chế kiểm được coi là hoạt động thật (không chỉ "dựa vào kỷ luật").

## Chưa kiểm

- iPhone thật (bàn phím, an toàn màn hình, `input[type=date]`…) — chưa đo, giống mọi bằng chứng Chrome headless khác trong repo.
- Không đối chiếu với mockup: 5 trang này restyle theo mốc CSS dùng chung (`.card-list`/`.card-col`), không có artboard mockup riêng cho từng trang như A2.
- Chưa có ai ngoài người thi công xem qua `anh/` hay chạy lại kịch bản (kiểm độc lập là việc của điều phối sau Task 7, không tự làm ở đây — N8).
