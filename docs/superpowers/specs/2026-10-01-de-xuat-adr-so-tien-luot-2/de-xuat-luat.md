# Sổ tiền lượt 2 — đề xuất sửa luật (CHƯA DUYỆT)

- **Ngày:** 2026-10-01. **Người soạn:** AI (vai lập kế hoạch), theo yêu cầu sửa CAO-4 (1) của người kiểm độc lập.
- **Vì sao có tệp này:** Hiến pháp N9 — AI không tự sửa luật chi phối chính mình; **Điều 9.4** — hàng rào đã duyệt chỉ được **siết**, muốn **nới** phải có chủ duyệt. Khuôn: `docs/superpowers/plans/2026-09-28-t2b-de-xuat-luat.md` (đã duyệt), chú thích "NỚI hàng rào đã duyệt (Điều 9.4) — đã duyệt …, xem …" ở `src/architecture.test.ts:30-33`, `:56-58`.
- **Trạng thái:** **CHƯA DUYỆT.** Chủ trả lời ở `cau-hoi-chu.md` câu **C12** (lời thường). Mã **chưa** có diff nào dưới đây (bản nháp ADR, không thi công). Khi thi công: mỗi chú thích ghi "CHỜ CHỦ DUYỆT ở <tệp này>" tới khi duyệt, rồi đổi thành "đã duyệt <ngày>".
- **Mốc dòng:** `src/architecture.test.ts` @`8f647226`.

---

## Mục 1 — NỚI đồ thị module: module mới `ky-so` + hai cạnh tới nó (ADR-00xx-D điều 2)

```diff
   // `src/architecture.test.ts:25`
-  billing: ["orders", "parties", "staff", "dispatch", "audit"],
+  // ADR-00xx-D (sổ tiền lượt 2): khoá kỳ đọc v_ky_closed_period trong trigger bil_; route khoá tháng gọi câu chưa chạy của ky-so.
+  // NỚI hàng rào đã duyệt (Điều 9.4) — CHỜ CHỦ DUYỆT ở docs/superpowers/specs/2026-10-01-de-xuat-adr-so-tien-luot-2/de-xuat-luat.md.
+  billing: ["orders", "parties", "staff", "dispatch", "audit", "ky-so"],
+  // ADR-00xx-D: khoá kỳ tháng dùng chung (sổ công nợ + chi phí chuyến) — lá, chỉ ghi nhật ký. Đặt thấp hơn cả billing lẫn van-chuyen để KHÔNG tạo
+  // cạnh billing ↔ van-chuyen (Q12 của ADR-0057 còn để ngỏ). NỚI (Điều 9.4) — CHỜ CHỦ DUYỆT ở <tệp này>.
+  "ky-so": ["audit"],
   …
-  "van-chuyen": ["parties", "audit", "orders", "locations"],
+  // ADR-00xx-D + ADR-0057 L-T1: trigger chi phí chuyến đọc v_ky_closed_period. NỚI (Điều 9.4) — CHỜ CHỦ DUYỆT ở <tệp này>.
+  "van-chuyen": ["parties", "audit", "orders", "locations", "ky-so"],
```

```diff
 // `STRICT` (`:68`)
+  { module: "ky-so", file: "modules/ky-so/repository.ts" }, // ADR-00xx-D: nghiêm từ ngày đầu (SIẾT — không cần duyệt)
+  { module: "pricing", file: "modules/pricing/repository.ts" }, // ADR-0024 điều 1: nghiêm từ ngày đầu, nay có bảng (SIẾT)
```

| Cạnh / mục | Nguồn | Dùng để | Nếu chủ KHÔNG duyệt |
|---|---|---|---|
| module `ky-so` → `audit` | ADR-00xx-D điều 2 | ghi nhật ký khoá tháng | khoá kỳ đặt ở `billing` ⇒ trigger chi phí chuyến phải đọc `billing` ⇒ đặt sẵn Q12 = (A) của ADR-0057 |
| `billing → ky-so` | ADR-00xx-D điều 2–4 | trigger chặn ghi vào tháng đã khoá; route khoá tháng | không có lớp CSDL cho khoá kỳ ⇒ lệch 5.1 |
| `van-chuyen → ky-so` | ADR-00xx-D điều 3, ADR-0057 L-T1 | trigger chặn ghi chi phí chuyến vào tháng đã khoá | L-T1 không gỡ được đúng hạn |

Không vòng: `ky-so` chỉ tới `audit` (lá). Bài "không module nào import `van-chuyen`" **không đổi**.

## Mục 2 — NỚI tiền tố bảng / view (ADR-00xx-A điều 5, ADR-00xx-D điều 2)

```diff
 // `:174-175`
-const TABLE_PREFIX = { ctl_: "catalog", prc_: "pricing", …, tl_: "tro-ly" };
+const TABLE_PREFIX = { ctl_: "catalog", prc_: "pricing", …, tl_: "tro-ly", ky_: "ky-so" };
-const VIEW_PREFIX = { prc: "pricing", pty: "parties", …, vc: "van-chuyen" };
+// ctl: ADR-00xx-A — view công bố v_ctl_service_group cho pricing (ADR-0058 "Hệ quả" hẹn thêm v_ctl_* bằng ADR). ky: ADR-00xx-D.
+// NỚI (Điều 9.4) — CHỜ CHỦ DUYỆT ở <tệp này>.
+const VIEW_PREFIX = { prc: "pricing", pty: "parties", …, vc: "van-chuyen", ctl: "catalog", ky: "ky-so" };
```

## Mục 3 — NỚI danh sách view thân trigger `vc_` được đọc (ADR-00xx-D điều 3; L-T1)

```diff
 // `:855-857` — "Thêm tên = NỚI (Điều 9.4)"
 const VIEW_CHO_TRIGGER_VC = [
   "v_ord_leg_key", "v_ord_order_flag", "v_ord_passenger_key", "v_ord_passenger_row", "v_pty_carrier_driver", "v_pty_carrier", "v_pty_owner_company",
+  "v_ky_closed_period", // ADR-00xx-D + ADR-0057 L-T1: chặn ghi chi phí chuyến vào tháng đã khoá. CHỜ CHỦ DUYỆT ở <tệp này>.
 ] as const;
```

Thân trigger `bil_`: **không** cần nới — luật ADR-0024 điều 5 đã cho đọc view công bố của module mà `billing` được phép phụ thuộc; Mục 1 thêm cạnh là đủ.

## Mục 4 — `docs/ARCHITECTURE.md`, bảng thi hành (tài liệu chuẩn tắc — AI không tự sửa)

```diff
-| 5.14 Hai trục thời gian; khoá kỳ | **chưa có** | sổ tiền chưa có; bảng hiện có dùng `created_at` + ngày dân sự riêng lẻ | Enterprise OS |
+| 5.14 Hai trục thời gian; khoá kỳ | `occurred_date` trên lần thu / phiếu sổ (0045); khoá kỳ: module `ky-so` (`ky_period_close`, trigger liền kề) + trigger `*_period_closed` ở `billing` và `van-chuyen` + `R-KY-1`, `R-KY-2` | — | Enterprise OS, ADR-0026, ADR-00xx-D |
```

```diff
-| 5.17 Sổ vàng | `golden/` + `src/so-vang.test.ts` (kiểm **nhất quán nội tại** của từng ca: tổng thu = giá bán, …, phần Tour Đảo giữ = giá bán − giá vốn − hoa hồng); …
+| 5.17 Sổ vàng | `golden/` + `src/so-vang.test.ts` (kiểm **nhất quán nội tại** của từng ca: tổng thu = giá bán lẻ − giảm giá, …, phần Tour Đảo giữ = giá bán lẻ trước giảm − giảm giá Tour Đảo chịu − giá vốn − hoa hồng — ADR-00xx-C); …
```

Lý do mục 4b: luật kiểm cũ "tổng thu = giá bán" sai ngay khi đơn đại lý có giảm giá do đại lý chịu (ADR-00xx-C ví dụ C-1). Đổi luật **trong** `src/so-vang.test.ts` là **siết đúng** (không nới), nhưng câu trong bảng thi hành là tệp luật ⇒ chủ duyệt.

Thêm hai dòng **lệch có chủ ý** vào cột "Lệch hiện có" của dòng **5.1** khi chủ duyệt C10, C11: `L-C1` (ADR-00xx-C điều 6) và "kéo dài lệch 5.1 của ADR-0029 cho trần giảm giá" (ADR-00xx-C điều 9).

## Mục 5 — `docs/SO-HANG-RAO.md` (đề xuất dòng; chỉ ghi khi đã thấy chặn thật một lần — P16)

Bốn dòng của ADR-00xx-E (bảng "Hàng rào đề xuất"), cộng các rào mới của A–D: trigger không chồng mức / chỉ đóng (A), trigger vai `SUPPLIER` + X3 (B), trigger `terms_missing` + câu ghi "Đã giao" của `orders` (C), trigger (i)–(iv) của L-C1 nếu C10 = A (C), trigger khoá kỳ ở ba bảng + trigger liền kề `ky-so` + bài thân trigger (D). Mỗi dòng ghi "Đã thấy chặn thật: chưa" cho tới khi thi công.
