# Nhật ký thi công ADR-0060 — dấu "đã nhập phần mềm kế toán" (2026-09-30)

- **Vai:** người thi công (không tự nghiệm thu — cần người kiểm độc lập chỉ-đọc, CLAUDE.md §3: việc lớn — dữ liệu + quyền).
- **Chuẩn tắc:** `docs/adr/ADR-0060-dau-nhap-phan-mem-ke-toan.md` (accepted 30/9); hồ sơ `docs/superpowers/specs/2026-09-30-de-xuat-adr-gop-y-d1-d3.md` (D2, A-3…A-7, A-12, A-13, trang ghép).
- **Điều kiện bắt đầu (5.13):** sổ tiền lượt 1 (module `billing`, `0044`/`0045`) đã có trên `main` @ `5f6fcbc2` — ĐẠT.
- **Migration:** `migrations/0051_billing_nhap_ke_toan.sql`. Ban đầu đặt `0050` theo lệnh điều phối; điều phối cấp lại **0051** (0050 đã là `0050_tro_ly.sql` trên main). Kiểm `origin/main` 30/9: số lớn nhất `0050`.

## Số đo giới hạn Cloudflare D1 (ADR-0060 điều 5 (3) — đo TRƯỚC khi viết truy vấn lọc)

Nguồn giới hạn: `developers.cloudflare.com/d1/platform/limits/` (đọc 30/9): tối đa **100 tham số** mỗi câu; câu SQL tối đa **100 KB**; chuỗi / BLOB / dòng tối đa **2 MB**; mỗi câu tối đa 30 giây.

Cách truyền tập id: MỘT tham số JSON đọc bằng `json_each` (khuôn `ordersWithHandler`, `receiptsOfOrders`) ⇒ **không** chạm trần 100 tham số, câu SQL giữ tĩnh (không phình theo số id) ⇒ không chạm trần 100 KB. Trần còn lại là 2 MB cho chuỗi JSON: UUID ≈ 39 byte/phần tử ⇒ ~50.000 id.

Trần chọn: `LOC_NHAP_TOI_DA_UNG_VIEN = 5000` (≈ 195 KB JSON, 10% trần 2 MB), vượt ⇒ 400 "thu hẹp khoảng ngày" (không cắt lặng lẽ). Khoảng ngày tối đa 92 ngày.

Đo trên D1 local (workerd của `wrangler dev`, kịch bản đo tạm — không commit), N đơn ứng viên cùng một ngày đi, một nửa đã đánh dấu, 5 lần mỗi ca:

| N | `nhapKeToan=chua` | `nhapKeToan=da` | không lọc dấu (so sánh) |
|---|---|---|---|
| 5.000 | 200 · 26–39 ms | 200 · 23–28 ms | 16 ms |
| 20.000 | 400 (vượt trần) · 53–62 ms | 400 · 93–201 ms | 163 ms |

**Chưa đo trên dữ liệu thật:** số đơn thật trong 92 ngày không đọc được (cấm đọc/ghi D1 remote từ phiên AI). Với ~30 nhân viên, ước vài trăm – vài nghìn đơn / quý ⇒ dưới trần; nếu vượt, người dùng thu hẹp khoảng ngày. Không vượt ngưỡng ⇒ không dừng.

## Quyết định bề mặt của người thi công (đảo ngược được — ghi để người kiểm / chủ xem)

1. **Nhãn trên thẻ:** chữ "Đã nhập phần mềm kế toán" (không kèm số hoá đơn) — ADR điều 5 định nghĩa hàm tiêm trả **tập id**; số hoá đơn ở chi tiết đơn và lịch sử đơn. Tiêu chí 1 có thể đọc là cần số trên thẻ — nếu chủ muốn, đổi hàm tiêm trả `Map<id, số>` (một câu SQL).
2. **Bảng tin:** loại `tien` (chỉ làm mới màn hình, không gõ cửa điện thoại — ADR-0045). Gửi trùng trạng thái ⇒ 200 `{ doi: false }`, không ghi, không báo.
3. **Lý do bỏ dấu:** tối đa 300 ký tự; CHẶN (400) dãy ≥ 8 chữ số (khuôn `text-guards.ts` cho chữ tự do đi vào bảng / nhật ký chỉ-thêm). Số hoá đơn giữ **nguyên văn** (tiêu chí 1), chỉ nhận chữ, số, dấu cách, `. / _ - #`, tối đa 50.
4. **Bỏ dấu khi chưa từng đánh dấu / đã bỏ:** coi là trùng trạng thái ⇒ 200 không đổi.
5. **Lọc ở màn Đơn hàng:** ô chọn "Nhập phần mềm kế toán" trong bảng "Lọc đơn" (chỉ người có ô xem `any`); bỏ chip ngày thì bỏ luôn lọc dấu; bộ lọc nhớ của tài khoản khác bị bỏ nếu người xem không có ô.
6. **Trạng thái "Đã giao" / "Hoàn thành":** không đổi `status` (vẫn `confirmed`) ⇒ đánh dấu được — có bài route.
7. **`R-BIL-AE1`** (kiểm định kỳ tuỳ chọn): CHƯA làm.

## Tiêu chí nghiệm thu (ADR-0060) — bằng chứng

| # | Tiêu chí | Bài |
|---|---|---|
| 1 | Người qua ô xem thấy "Đã nhập phần mềm kế toán · HD-000123" ở chi tiết, thẻ, lịch sử; chỉ-Đối tác không; lai SALES+PARTNER thấy | `src/modules/billing/nhap-ke-toan.test.ts` (ca tiêu chí 1, 3(ii), A-12); e2e `tests/e2e/nhap-ke-toan.mjs` |
| 2 | Quản trị, Bán hàng, HDV ghi ⇒ 403 | ca "tiêu chí 2"; e2e |
| 3 | Bỏ dấu không lý do 400; có lý do ⇒ dòng mới, dòng cũ còn (Kế toán xem) | ca "tiêu chí 3"; e2e |
| 4 | `UPDATE bil_accounting_entry` tay bị chặn | `src/migrations-nhap-ke-toan.test.ts` |
| 5 | Lọc thiếu khoảng ngày 400; `chua`/`da` đúng; phạm vi không đổi | ca "tiêu chí 5"; e2e |
| 6 | Sau Hoàn thành vẫn đánh dấu được | ca "tiêu chí 6" |
