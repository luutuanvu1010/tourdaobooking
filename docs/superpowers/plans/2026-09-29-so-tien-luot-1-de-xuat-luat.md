# Đề xuất sửa tệp luật — sổ tiền lượt 1 (Task 11)

> **Trạng thái: ĐỀ XUẤT, chưa áp.** Người thi công không tự sửa tệp luật (Hiến pháp N9; `CLAUDE.md` §3). Chủ dự án duyệt từng mục (được / không / sửa) rồi một phiên khác áp đúng chữ dưới đây.
> Kế hoạch: `docs/superpowers/plans/2026-09-29-so-tien-luot-1-ke-hoach.md` Task 11. Sổ thi công: `docs/superpowers/plans/2026-09-30-so-tien-luot-1-thi-cong-nhat-ky.md`.
> Mã mà các dòng dưới mô tả nằm trên nhánh `worktree-agent-aa1fab0316112d404` (chưa gộp `main`, chưa lên production).

Tóm tắt lời thường: sổ tiền lượt 1 thêm một module có bảng (`billing`, nghiêm), một module KHÔNG có bảng (`receipt`, biên nhận), một bài kiểm thân trigger và vài hàng rào mới. Các tệp luật đang mô tả kiến trúc theo danh sách module cũ — cần thêm cho khớp. Không mục nào NỚI luật.

---

## Mục 1 — `docs/ARCHITECTURE.md` Phần I, bảng thi hành

**1a. Dòng 5.3 (Modular monolith)** — cột "Cơ chế" thêm hai rào; cột "Chưa phủ" bỏ câu "trigger đọc chéo module chưa có bài kiểm".

```diff
-| 5.3 Modular monolith | `architecture.test.ts` (import, cạnh, view, `EXPLAIN` SQL module nghiêm; từ 2026-09-26 quét thêm hạng `KHONG_DB` — module không dùng cơ sở dữ liệu, hôm nay chỉ `bangtin`) | module `LEGACY` (…) …; trigger đọc chéo module **chưa có bài kiểm**; riêng trigger `vc_` …
+| 5.3 Modular monolith | `architecture.test.ts` (import, cạnh, view, `EXPLAIN` SQL module nghiêm; từ 2026-09-26 quét thêm hạng `KHONG_DB` — module không dùng cơ sở dữ liệu, hôm nay chỉ `bangtin`; từ sổ tiền lượt 1 thêm hạng `KHONG_BANG` — module không bảng, không SQL, hôm nay chỉ `receipt` — và bài "thân trigger chỉ chạm bảng của module chủ + view công bố" chạy `EXPLAIN` trên MỌI trigger) | module `LEGACY` (…) …; riêng trigger `vc_` …
```

**1b. Dòng 5.14 (Hai trục thời gian; khoá kỳ)** — lệch có chủ ý tới lượt 2 (rủi ro R12 của kế hoạch).

```diff
-| 5.14 Hai trục thời gian; khoá kỳ | **chưa có** | sổ tiền chưa có; bảng hiện có dùng `created_at` + ngày dân sự riêng lẻ | Enterprise OS |
+| 5.14 Hai trục thời gian; khoá kỳ | sổ tiền lượt 1: mọi lần thu / phiếu có `occurred_date` (ngày phát sinh, giờ VN, bắt buộc) tách khỏi `created_at`; chỉ Kế toán / Toàn quyền chọn ngày khác hôm nay, không chọn ngày tương lai | **khoá kỳ chưa có — LỆCH CÓ CHỦ Ý tới lượt 2 sổ tiền** (ADR-0024 lượt 2; ghi ở `docs/SYSTEM-DESIGN.md` §16); bảng ngoài sổ vẫn dùng `created_at` + ngày dân sự riêng lẻ | Enterprise OS, ADR-0024 |
```

**1c. Dòng 5.17 (Sổ vàng)** — lớp 2 nay chạy trên mã.

```diff
-| 5.17 Sổ vàng | `golden/` + `src/so-vang.test.ts` (…) | các ca **chờ chủ/Kế toán xác nhận**; **chưa chạy trên mã sổ** (sổ công nợ chưa có) | Enterprise OS |
+| 5.17 Sổ vàng | `golden/` + `src/so-vang.test.ts` (…); LỚP 2 chạy các ca ĐÃ xác nhận (SV-HT-06, SV-HT-07) trên `billing/rules.ts`; định dạng chuỗi sự kiện `golden/so-cong-no-luot-1.json` | các ca **chờ chủ/Kế toán xác nhận** (SV-SC-01..04 lượt 1 in "chưa áp dụng"); lượt 2 (giá vốn, hoa hồng) chưa có mã | Enterprise OS |
```

## Mục 2 — `docs/ARCHITECTURE.md` Phần II

**2a. Danh sách module nghiêm** (dòng "Ranh giới SQL của module nghiêm"): thêm `billing` vào danh sách `(auth, billing, company, dispatch, …)`.

**2b. Bullet mới ngay sau bullet `KHONG_DB`:**

```diff
+- **`KHONG_BANG`** ("module không bảng", ADR-0024 điều 1 — accepted 2026-09-29, sổ tiền lượt 1): chặt hơn `STRICT` — không bảng / view nào trong sổ dữ liệu thuộc module, không `.prepare(`/`.batch(`/`.exec(` ở BẤT KỲ tệp `.ts` không phải test; ĐƯỢC chuyển tay cầm `env.DB` cho hàm công bố của module khác (đó là đường đọc dữ liệu duy nhất). Hôm nay chỉ `receipt` (biên nhận theo danh sách trắng). Bài `architecture.test.ts` "KHONG_BANG".
+- **Thân trigger** (sổ tiền lượt 1, kế hoạch Task 1): trigger chỉ đọc / ghi bảng của CHÍNH module sở hữu bảng mà trigger gắn vào, cộng view công bố `v_<tiền tố>_*` của module khác. Bài `architecture.test.ts` chạy `EXPLAIN` từng trigger trên DB ranh giới (khoá ngoại TẮT để khỏi đếm quét bảng con của khoá ngoại).
```

**2c. Mục "Thêm một module mới", điểm 7:** thêm `KHONG_BANG` vào danh sách hạng (`STRICT`, `LEGACY`, `KHONG_DB`, `KHONG_BANG`).

## Mục 3 — `src/CLAUDE.md`

```diff
-- **Module "nghiêm"** (`auth`, `company`, `dispatch`, `feedback`, `locations`, `maintenance`, `parties`, `staff`, `thongbao`, `van-chuyen`): …
+- **Module "nghiêm"** (`auth`, `billing`, `company`, `dispatch`, `feedback`, `locations`, `maintenance`, `parties`, `staff`, `thongbao`, `van-chuyen`): … Module KHÔNG BẢNG (`receipt`): không SQL nào, đọc dữ liệu chỉ qua hàm công bố của module khác.
-- Thêm module: khai cạnh ở `ALLOWED_EDGES`, đưa vào `STRICT` hoặc `LEGACY` (kèm lý do), …
+- Thêm module: khai cạnh ở `ALLOWED_EDGES`, đưa vào `STRICT`, `LEGACY` (kèm lý do), `KHONG_DB` hoặc `KHONG_BANG`, …
```

Thêm một gạch (mục tiền):

```diff
+- Tiền "đã thu / còn lại" CHỈ tính ở `billing/rules.ts:conLai`; `orders` không đọc bảng `bil_` (bài `architecture.test.ts`), không ai đọc ba cột cọc cũ của `orders` (bài `src/coc-cu-khong-doc.test.ts`). Route GHI mới của `orders`/`dispatch` phải từ chối sau "Đã giao" và có ca trong `src/modules/billing/sau-da-giao.test.ts`.
```

## Mục 4 — `CLAUDE.md` gốc (tuỳ chủ — chỉ thêm, không đổi nghĩa)

§7 "Dữ liệu", sau câu tiền `INTEGER`:

```diff
+ "Đã thu / còn lại" của đơn chỉ do module `billing` tính (một hàm); sổ chỉ-thêm, sai thì ghi dòng đảo; sau "Đã giao – đã thu đủ" đơn khoá (trigger 0044).
```

§10 bẫy: một gạch trỏ `docs/CHANGE-GUIDE.md` bẫy 55 (năm bẫy sổ tiền).

## Mục 5 — `web/CLAUDE.md` (bảng "Sửa tệp nào thì chạy lại kịch bản Chrome nào")

```diff
+| Phần tiền của `web/order.ts` (khung tiền, "Đã giao – đã thu đủ", "Hoàn thành", ghi lần thu), `web/order-form.ts` (mục Thanh toán, bước hai ghi lần thu), `web/home.ts` / `web/orders.ts` / `web/order-card.ts` / `web/viec-cua-toi.ts` (số đã thu / còn lại qua billing) | `so-tien-smoke.mjs` (390 + 1040) ở `docs/evidence/2026-09-29-so-tien-luot-1/kich-ban/` — **CHƯA VIẾT** (xem sổ thi công) + ba `a2-smoke-*.mjs` |
```

## Không đề xuất

- `playbook/`, ADR đã duyệt: không đụng.
- `docs/SPEC-tourdao-sales.md` §1: không thấy mâu thuẫn mới (ADR-0004 đã mở sổ thu tiền).
