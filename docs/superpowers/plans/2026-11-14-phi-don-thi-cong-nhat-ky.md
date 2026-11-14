# Nhật ký thi công — Phí đưa đón, Đợt A + B

Kế hoạch: `docs/superpowers/plans/2026-11-14-phi-don-dot-a-b.md`. Thiết kế: `docs/superpowers/specs/2026-11-14-phi-don-theo-cap-va-dich-vu-design.md`. ADR: ADR-0147 (Đ1 khu vực đón, Đ2 bảng phí), ADR-0203 (ĐB1 bảng phí, ĐB2 cấp của hồ sơ và số khách tính tiền). Nhánh `claude/pickup-fee-pricing-plan-6eae32`. Ghi 15/11/2026 (người thi công Task 9).

Phạm vi đã làm: Đợt A (khu vực đón) và Đợt B (bảng phí, luật chọn mức, màn quản lý, Thử tra). **Chưa làm Đợt C**: chưa dòng phí nào vào đơn, chưa tiền nào của đơn đổi.

## Số migration thật đã dùng
- `0164_vung_don.sql` (Đợt A): bảng `loc_zone`, cột `loc_location.zone_code`, hai view `v_loc_location_zone`, `v_loc_zone_label`.
- `0165_phi_don_bang.sql` (Đợt B): `prc_transfer_fee_key`, `_rule`, `_condition`, `_start` và trigger.
- Kiểm bằng `ls migrations`: tệp lớn nhất trước hai tệp này là `0162_noi_dung_bao_tri.sql`; `0163` thuộc nhánh ADR-0199 chưa gộp. **Lúc gộp phải chạy lại bước lấy số.**

## Tên giao diện
Đã chốt (chủ chọn 14/11, «Dùng tên đó, làm đi»): «Khu vực đón», «Ngoài khu vực», «Phí đưa đón», «Thử tra», «Đặt ngày bắt đầu áp».
**Tên TẠM, chờ chủ chọn** (bảng tham chiếu khai `cho-chon`): «＋ Thêm mức phí», «Đổi mức phí», «Kết thúc mức», «Tắt phí đưa đón», «Lưu mức phí» / «Lưu ngày bắt đầu áp» / «Lưu ngày kết thúc».

## Ruling đã áp trong đợt (từ sổ điều phối)
- **`thayCho`** (lỗi của kế hoạch: không đổi được mức chung khi phí đang áp, vì trigger chồng ngày chặn chèn dòng nối tiếp): `POST /api/pricing/phi-don` nhận thêm `thayCho: { id, expectedUpdatedAt }`. MỘT lô: đóng dòng cũ ngày liền trước ngày bắt đầu mới → chèn dòng mới và điều kiện → nhật ký. Dòng cũ phải cùng kiểu và cùng bộ điều kiện; ngày mới phải sau ngày bắt đầu cũ; chốt «đủ mức» tính trên trạng thái SAU lô. Dòng cũ đã đóng đúng ngày liền trước thì không đóng lại và không ghi nhật ký «kết thúc» (nhật ký không được ghi sự kiện không có thật). Ca đua trả 409 `stale`. Không route mới, không quyền mới. Sai thì bỏ tham số, không đổi lược đồ.
- **Số «Ngoài khu vực»** tính cả địa điểm chưa xếp khu vực (ở máy chủ), vì định nghĩa trong bảng tham chiếu: chưa xếp = Ngoài khu vực.
- **Bảng menu viết gọn** (chủ 15/11 chọn «Tìm chỗ bớt»): trần dung lượng trang Đơn hàng KHÔNG được nới; đã viết gọn `src/shared/muc-giao-dien.ts`.
- Ca 28 của sổ vàng (`ap_dung = false`) kiểm bằng ngày bắt đầu áp ở route, không qua lớp 2 chọn mức.
- Gộp giao việc theo cụm; người thi công Task 9 chỉ làm Step 1–4 và 6 (không đưa lệnh `day-len`).

## Giả định (đã ghi, đảo ngược được)
- Thân `dieuKien` của route ghi dạng mảng `[{khoa, giaTri}]` (máy chủ nhận cả dạng object, màn chỉ gửi mảng).
- Mỗi mức không nêu chiều áp cho cả hai chiều; cảnh báo «cấp trả cao hơn» ra MỘT mục mỗi chiều (đi, về), màn gộp khi hiển thị.
- Số khách tính tiền và số người đón về là số nguyên 1–99.999 (máy chủ ép).
- e2e dùng ngày ở quá khứ xa (từ 2000, mỗi lần chạy ≥ 40 ngày sau lần trước) để chạy lại nhiều lần trên cùng D1 không chồng ngày; ngày bắt đầu áp trong e2e cũng ở quá khứ nên «đang áp» là thật với đơn hôm nay.
- Kịch bản Chrome dùng `axe-core` 4.13.0 lấy từ một thư mục tạm ngoài repo của máy (`AXE_JS`).

## Việc đã làm ở Task 9
- **e2e** `tests/e2e/phi-don.mjs` (khai ở `danh-sach.mjs`, `thoi-gian.json`, `README.md`) và mục `zones` ở `tests/e2e/locations.mjs`.
- **Bài «khoá giả»** và **bài quét khoá điều kiện** ở `src/modules/pricing/phi-don-rules.test.ts`.
- **Tài liệu mô tả:** `docs/SYSTEM-DESIGN.md` (§5 bảng và migration, §7 API, §9 màn hình), `docs/CHANGE-GUIDE.md` (công thức z39 + hai dòng bảng tra), `docs/HANDOFF-N1.md` (mục «ĐANG CHỜ NHẬP: Phí đưa đón»; KHÔNG sửa mục «TRẠNG THÁI TRIỂN KHAI»), `docs/SO-HANG-RAO.md` (ba dòng mới).
- **Kịch bản Chrome** `docs/evidence/2026-11-phi-don/kich-ban/phi-don-smoke.mjs`.
- Quan sát chặn thật (ghi ở `docs/SO-HANG-RAO.md`): bỏ cổng «đủ mức» ⇒ e2e đỏ; chèn tên khoá vào `orders` ⇒ bài quét đỏ; bỏ tham số `boTinh` ⇒ bài «khoá giả» đỏ; bỏ `thayCho` khỏi thân «Đổi mức phí» ⇒ kịch bản Chrome đỏ.

## Kết quả bộ kiểm
Xem báo cáo `task-9-report.md` ở sổ SDD (ngoài kho) cho đầu ra từng lệnh. Tóm tắt lúc ghi:
- `npm run typecheck`: 0 lỗi.
- e2e riêng `phi-don` (ba lần liền trên cùng D1) và `locations`: xanh.
- Kịch bản Chrome `phi-don-smoke.mjs` (có axe): «SMOKE OK».
- **`npm test` đủ bộ, `npm run test:e2e` đủ bộ, `dot-a-smoke.mjs`: CHƯA chạy.** Lý do: trước bộ dài, máy còn tiến trình của phiên khác (wrangler dev mồ côi nhiều ngày, Chrome ẩn mồ côi, hai lượt `npm test` đang chạy của worktree khác); luật của lượt giao là tiến trình lạ thì không tắt, dừng và báo chủ.

## Nợ cho Đợt C
- **Phía gọi `docBangPhiDonChoDon` phải tự so ngày đơn với `batDauAp`** (hàm trả `batDauAp` nhưng không so giùm; đơn có ngày trước ngày bắt đầu áp không tính phí).
- Dòng phí trên đơn, chụp mã cấp lúc xác nhận, cổng «thiếu mức» chặn xác nhận, công nợ đại lý, biên nhận, câu nhắc ở màn gán cấp (trang ghép riêng), ca SV-PD-22…26 phần tiền của đơn.
- Bài so hai hàm trùng logic (`capCuaHoSoNgay` ở pricing và đoạn tương ứng ở `rules.ts`).
- Tên khu vực chưa ép duy nhất; chưa có bài đua trigger ở route khu vực.
- Màn: `actZone` trùng `act()`; `EXCLUSIVE=1` ngầm khi chọn «Xe riêng» chưa có bài tự động; chưa có bài tự động cho luồng ghi của màn `web/phi-don.ts` (nay có kịch bản Chrome).
- Chốt «đủ mức» đọc rồi mới ghi, không có lưới CSDL (dựa vào kỷ luật; ghi ở sổ hàng rào).
- Đề xuất cho chủ (người thi công không được sửa tệp luật): thêm vào bảng ở `web/CLAUDE.md` dòng «Màn Phí đưa đón và khu vực đón: `web/phi-don.ts`, `web/locations.ts`, `public/phi-don.html` → `phi-don-smoke.mjs` ở `docs/evidence/2026-11-phi-don/kich-ban/`».

## Câu chờ chủ (một lần, gom)
1. **Tên nút tạm:** «＋ Thêm mức phí», «Đổi mức phí», «Kết thúc mức», «Tắt phí đưa đón», «Lưu mức phí» / «Lưu ngày bắt đầu áp» / «Lưu ngày kết thúc» — giữ hay đổi?
2. **Ô chọn khu vực ở form địa điểm** có cả «Chưa xếp» lẫn «Ngoài khu vực» (hai chữ cùng nghĩa khi đọc phí): bỏ một?
3. **Bố cục điện thoại màn Địa điểm** dài (thẻ khu vực nằm trên danh sách): chấp nhận hay đưa thẻ khu vực xuống / gập lại?
4. **Trần số tiền một mức phí:** hiện không có trần trên (chỉ số nguyên an toàn). Có đặt trần (ví dụ 5.000.000 đ) không?
5. **Ngày bắt đầu áp ở quá khứ:** hiện KHÔNG chặn (e2e dùng chính điều này). Có chặn «không đặt ngày đã qua» không?
6. **Mức đã có ngày kết thúc không có nút** (không sửa, không rút ngắn thêm): có cần nút «Sửa ngày kết thúc» không?
7. **Đuôi «, xe riêng» và «, chiều đi / chiều về»** ở câu cảnh báo cấp trả cao hơn (thêm so với câu chủ đã chốt, để hai dòng khác chiều hoặc khác xe không trông giống nhau): giữ hay bỏ?
8. **Bốn tệp `docs/evidence/2026-10-07-danh-gia-erp-van-chuyen/kich-ban/sc-nangluc/*.obs.jsonl`** đang ở trạng thái «đã sửa» từ trước đợt này (`npm test` ghi đè chúng): giữ bản sửa, hoàn nguyên, hay để người khác xử lý? Đợt này không đụng, không `git add`.
