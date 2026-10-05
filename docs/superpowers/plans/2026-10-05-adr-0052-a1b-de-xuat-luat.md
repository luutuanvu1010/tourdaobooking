# ADR-0052 D5b (Vận chuyển Đợt 5 A-1b — tài xế bổ sung tên khách) — đề xuất sửa luật (ĐÃ DUYỆT 5/10)

- **Ngày:** 2026-10-05. **Người soạn:** làn thi công Đợt 5 (nhánh `worktree-agent-a51d501a3883b17a1`). Kế hoạch: `docs/superpowers/plans/2026-10-01-van-chuyen-con-lai-05-xe-dang-chay.md` Task 13, 14, 16. Trang ghép (bước ghép khi duyệt, `CLAUDE.md` §9): `docs/superpowers/specs/2026-10-05-trang-ghep-d5b-tai-xe-ghi-hanh-khach.md`.
- **Vì sao có tệp này:** Hiến pháp N9 (AI không tự sửa luật chi phối chính mình) và Điều 9.4 (hàng rào đã duyệt chỉ được siết; nới phải có chủ duyệt). ADR-0052 D5b đã có chữ, nhưng sửa hàng rào không tự thành được phép (tiền lệ `2026-09-29-adr-0049-de-xuat-luat.md`).
- **Trạng thái:** **ĐÃ DUYỆT 5/10** — chủ dự án, nguyên văn: "a- cho tài xế tự bổ sung tên khách, chỉ tài xế công ty. b- không, c-chấp nhận, d- bạn đã hiểu đúng, đối tác tự thu tiền, e- giữ". Vế (a) duyệt cả ba mục dưới; câu đi kèm mục 1 đã trả lời: CHỈ quyền `DRIVER` (tài xế công ty), `DRIVER_PARTNER` giữ `none`. Áp ở nhánh `dot5-tang3` (gộp tầng 3 lên `origin/main` 1.79, bản 1.80): `src/CLAUDE.md:22`, `docs/SO-HANG-RAO.md` (dòng R-ORD-11 + dòng `GHI_NGOAI` mới). Các vế (b)–(e) ghi ở nhật ký Đợt 5 mục "Lời chủ 5/10".
- **Trạng thái trước duyệt (lịch sử):** CHỜ CHỦ DUYỆT. Mã đã viết sẵn trong các commit gắn nhãn "CHỜ CHỦ DUYỆT" trên nhánh (T13 `34a13535`, T14 `08a2e096`, giao diện `eb88fe6c`, lưới lô thật `8d1a82c9`). **Không gộp các commit đó khi chủ chưa duyệt**; phần A-1 (`dot5-a1-xong`) và A-1b không nới (`dot5-a1b-khong-luat`) gộp được độc lập.
- **Cổng vào A-1b chưa đạt:** A-1 và Đợt 4 chưa lên `main` (nhật ký Task 0, Task 12). Đây là "xây trên nền chưa gộp", không phải lỗ an ninh đang hở.
- **Đúng 3 mục** (trần 3 quyết định chạm quyền / dữ liệu mỗi lượt duyệt — `CLAUDE.md` §9).

## Mục 1 — Ghim hàng DRIVER: thêm ô `trip.passenger.add: assigned` (ô assigned thứ ba) + câu `src/CLAUDE.md:22`

- **Mã (đã viết, CHỜ CHỦ DUYỆT):** `src/shared/permissions.ts` dòng `"trip.passenger.add": row("none","none","none","none","none","any","none","assigned","none","none")`; `src/shared/permissions.test.ts` bảng + ghim DRIVER (`"trip.passenger.add": "assigned"`) + ghim DRIVER_PARTNER / HR / Đối tác (`none`) + `ADMIN_NONE_OPS`; `src/tai-xe-cong.test.ts` dòng route mới (DRIVER 404 chuyến lạ, DRIVER_PARTNER 403).
- **Đã thấy chặn thật 2026-10-05:** thêm dòng MATRIX trước khi sửa bài → ĐỎ 4 bài ghim ("bản đồ quyền khớp TỪNG Ô…", "MỌI ô của Tài xế (DRIVER) — ghim nguyên dòng", "… DRIVER_PARTNER …", "… Nhân sự (HR) …") + 1 bài `ADMIN_NONE_OPS` + bài ghim Đối tác (`xem-don-theo-quyen.test.ts`) + "hàng rào 1: mọi ô của MATRIX được máy chủ hỏi" (tới khi route hỏi ô).
- **Diff đề xuất cho `src/CLAUDE.md:22` (tệp luật — ĐÃ ÁP 5/10, thêm vế "chỉ tài xế công ty"):**
  - Trước: "Quyền `DRIVER` (ADR-0049 D3) chỉ có `trip.view`, `trip.progress` phạm vi `assigned` = đang có dòng lái mở …"
  - Sau: "Quyền `DRIVER` (ADR-0049 D3; ADR-0052 D5b) chỉ có `trip.view`, `trip.progress`, `trip.passenger.add` phạm vi `assigned` = đang có dòng lái mở …; `trip.passenger.add` chỉ ở route `POST …/cuoc-cua-toi/:id/hanh-khach`, trong ngày chạy, suất khách chưa có tên."
- **Câu hỏi đi kèm (không tự chọn):** tài xế đối tác (`DRIVER_PARTNER`) có được bổ sung tên không? Mã hiện giữ `none` (mặc định từ chối); ADR-0053 ghi "assigned" cho Đợt 6. **Chủ trả lời 5/10: KHÔNG — "chỉ tài xế công ty".**

## Mục 2 — Ngoại lệ hẹp cho câu GHI do `orders` cấp trong lô `van-chuyen` (nhãn `GHI_NGOAI`) + danh sách đọc `audit_log` có gác

- **Vì sao:** luật thứ tự lô (3) đòi mọi câu sau nhật ký gác `last_cmd_id` của `vc_trip`; câu ghi dòng hành khách thuộc bảng `ord_passenger` của `orders` nên gác bằng ID NHẬT KÝ của lô (`EXISTS (SELECT 1 FROM audit_log WHERE id = ?)`, khuôn P7). Câu đó đọc `audit_log` ⇒ phải có tên trong danh sách đọc-có-gác của `src/architecture.test.ts`.
- **Mã (đã viết, CHỜ CHỦ DUYỆT):**
  - `src/modules/van-chuyen/thu-tu-lo.test.ts`: `CHO_GHI_NGOAI = ["loBoSungTen"]`; câu `GHI_NGOAI` phải có gác id nhật ký với tham số = dấu lệnh; hàm khác dùng nhãn → đỏ. Mẫu `loBoSungTen` ở `MAU`.
  - `src/architecture.test.ts`: `DOC_AUDIT_LOG_WONGUARD.ten` thêm `"orders.passenger_insert_driver"` (commit T13 `34a13535`).
  - `src/hanh-khach-khong-lo-ten.test.ts`: `KHONG_THE_LO` thêm `${R}/hanh-khach` — route trả ĐÚNG `{ ok, soNguoi }` (không mảng suất), có ca khoá tập khoá + quét tên.
  - `src/orders-cong-bo.test.ts`: SIẾT — `cauThemHanhKhachTaiXe` vào danh sách "chỉ gọi trong thân route sau can()".
- **Đã thấy chặn thật 2026-10-05:** `CHO_GHI_NGOAI` để rỗng → ĐỎ "bộ bắt TC-32 …" và "TC-32: MỌI hàm dựng lô … đúng bốn luật" → hoàn nguyên → xanh 3/3. Thêm câu orders đọc `audit_log` khi chưa có tên trong danh sách → ĐỎ bài kiến trúc (T13).
- **Dòng sổ hàng rào đề xuất (`docs/SO-HANG-RAO.md`, ĐÃ THÊM 5/10):** "Ngoại lệ GHI_NGOAI của bài thứ tự lô — chỉ `loBoSungTen`, chỉ câu gác id nhật ký = dấu lệnh | cơ chế: `thu-tu-lo.test.ts` | 2026-10-05: allowlist rỗng → đỏ 2 bài".

## Mục 3 — Đổi nghĩa kiểm định kỳ R-ORD-11 (vế DRIVER) + viết lại dòng sổ `docs/SO-HANG-RAO.md:250`

- **Vì sao:** R-ORD-11 hôm nay `fail` khi CÓ dòng `source='DRIVER'` ⇒ dòng đầu tiên tài xế nhập làm kiểm định kỳ (và `npm run trien-khai`) đỏ.
- **Nghĩa mới (ADR-0052:221):** dòng `source='DRIVER'` phải là ĐẦU chuỗi (`previous_id IS NULL`) và có sự kiện `PASSENGER_NAMED` trên một suất mang đúng `passenger_key` = `person_key` của dòng; thiếu = vi phạm (`fail`).
- **Mã (đã viết, CHỜ CHỦ DUYỆT):** `scripts/audit-checks.mjs` R-ORD-11; `src/audit-invariants.test.ts` ca mới (có sự kiện → 0; mồ côi → 1; sự kiện trỏ suất khoá khác không cứu; dòng thay thế nguồn DRIVER → vi phạm).
- **Đã thấy chặn thật 2026-10-05:** bỏ vế `AND a.passenger_key = p.person_key` → ĐỎ ca R-ORD-11 mới → hoàn nguyên → xanh 108/108.
- **Diff đề xuất cho dòng sổ :250 (ĐÃ ÁP 5/10):** "R-ORD-11 chuỗi hành khách sai / có dòng nguồn DRIVER (`fail`)" → "R-ORD-11 chuỗi hành khách sai / dòng nguồn DRIVER không phải đầu chuỗi hoặc không có sự kiện tài xế bổ sung tên trên suất mang khoá đó (`fail`) — đổi nghĩa ADR-0052 D5b, đột biến 2026-10-05".

## Không thuộc tệp này (đã làm, không nới)

- Ô mới, loại sự kiện `PASSENGER_NAMED`, hành động nhật ký `trip_passenger_named` (detail: mã chuyến, mã đơn, số người — không tên): thêm mới, không nới hàng rào cũ.
- Lược đồ: KHÔNG migration mới — `ord_passenger.source` đã cho `'DRIVER'` từ `0035`; loại sự kiện kiểm ở mã.
