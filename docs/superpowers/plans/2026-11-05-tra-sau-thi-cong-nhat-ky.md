# Trả sau theo hạn mức: sổ thi công (2026-11-05)

Kế hoạch: `2026-11-05-tra-sau-han-muc-ke-hoach.md`. Đặc tả: `docs/superpowers/specs/2026-11-05-tra-sau-han-muc.md`. ADR-0168.

## Ruling và quyết định trong lúc làm

- **Khe đổi bên đặt (đã đóng, commit 26766445):** lô đổi bên đặt nay gác phiên bản của bên đặt cũ; có bài đua trong `src/tra-sau-duong-ghi.test.ts`.
- **R-CRD-3 không làm ở bộ kiểm dữ liệu** (phải thu tính bằng mã, SQL không tính được). Thay bằng cảnh báo «nợ vượt hạn mức hiện hành» ở màn Hạn mức trả sau (`canhBaoVuotHanMuc`). Chủ ghi lệch này.
- **Đường `coc/chuyen` không nối `cauTangChoDon`:** nguồn là đơn đã huỷ có nợ đã về 0; đích chỉ nhận thêm tiền nên nợ không tăng.
- **Phân định trách nhiệm không nối `cauTangChoDon`:** chỉ chạy sau «Đã giao»; đơn Trả sau chỉ Đã giao khi `conLai = 0`; hoàn tiền luôn đi cặp với giảm trừ nên nợ ròng không đổi. Kết luận từ đọc mã, chưa có bài riêng.
- **Chữ mới** («Đặt hạn mức», «Ngừng hạn mức», «Hạn mức trả sau», «Còn được dùng …») dùng đúng chữ đã có ở ADR-0168; vào `docs/BANG-THAM-CHIEU.md` ở trạng thái «tên hiện tại», chủ chưa chọn riêng.
- **Trần gói trang Đơn hàng không đụng.** Trang mới vào `TRANG`/`THANH_BEN` làm gói `web/orders.ts` thêm byte, và các Task trước đã làm gói vượt trần 16 byte. Bù bằng hai hàm gom `ve`/`vk` (điều kiện hiện của mục) và `tl` (dòng nhóm Thiết lập) ở `src/shared/muc-giao-dien.ts`, giá trị không đổi.
- **Không có dòng ở trang «Tôi» (`TRANG_TOI`)** cho Hạn mức trả sau, để giữ trần; lối vào là thanh bên nhóm Thiết lập.
- **Số phiên bản:** mục nhật ký của Trả sau đã đặt 2.63 khi làm; sau khi nhập bản chính (9813f1a4) mục đó là 2.65 và migration là `0141_tra_sau_han_muc` (đổi từ 0139). Bước A.0 của lần triển khai đặt lại nếu cần.
- **Hướng dẫn:** bài mới «Cấp hạn mức trả sau cho đối tác»; bài «Kho vé điện tử» sửa một câu (đơn trả sau mở vé trước) vì `web/ve-don.ts` đổi.

## Nợ đã biết (ghi để làm sau, KHÔNG sửa trong lượt này)

1. ~~Phân định trách nhiệm và `coc/chuyen` chưa nối `cauTangChoDon`~~ — **ĐÓNG 2026-11-06, commit 93176bfb** (kế hoạch 2026-11-05 Task 2): bảng ĐƯỜNG GHI chạy thật (11 dòng) đỏ ở chuyển cọc và ghi theo phân định; đã nối, kèm hai đường bảng tự tìm ra: duyệt điều chỉnh sổ và ghi đổi bên chịu.
2. ~~Cổng huỷ đơn Trả sau không gác khi vé được mở đúng giữa hai bước~~ — **ĐÓNG 2026-11-06, commit 93176bfb**: lô huỷ mang câu bảo vệ «vé vừa mở» theo `qua.chanVeDaMo`; hết nợ thì gác phiên bản; bài đua ở `/status` và `handler-cancel`.
3. ~~Cổng sửa tăng tiền quá chặt~~ — **ĐÓNG 2026-11-06, commit c3725654** (Task 3): so phần tăng với phần còn được dùng (gồm nợ của đơn); không đọc được nợ ⇒ 503.
4. ~~Bài quét đường thu tiền yếu~~ — **ĐÓNG 2026-11-06, commit 93176bfb**: bốn bài QUÉT xoá; ba hàm ghi đòi kiểu mang nhãn (typecheck buộc; chỉ chặn nhầm, không chặn ép kiểu `as` cố ý) và bảng ĐƯỜNG GHI chạy thật.
5. R-CRD-3 (nợ vượt hạn mức) thay bằng cảnh báo trên màn Hạn mức trả sau, không có hàng rào máy. — **Giữ cách làm (đúng ADR), có bài GHIM 2026-11-06, commit c3725654**; sổ hàng rào ghi «chỉ cảnh báo, dựa vào người xem».
6. `GET /api/tra-sau/con-duoc-dung` nhận `benDat` từ trình duyệt (tài khoản Đối tác bị ép về hồ sơ của phiên, văn phòng thì tự chọn). — **Giữ cách làm, bài GHIM 2026-11-06, commit c3725654** (đúng ba khoá; Đối tác gửi `benDat` người khác vẫn nhận số của mình; Hướng dẫn viên 403).
7. ~~Gộp hồ sơ fail-open~~ — **ĐÓNG**: `conNoTraSau` bắt buộc từ Task 4b; bài «đọc nợ LỖI thì xem trước và lệnh gộp không ghi» thêm 2026-11-06, commit c3725654 (bài ghim).

## Ruling thi công Task 2, 3 (2026-11-06)

- Kiểu nhãn của đường sửa số khách đặt ở `insertMoneyAdjustment` (câu ghi duy nhất, gọi trong `soanSuaSoKhach`), không ở tham số `soanSuaSoKhach`: tổng mới chỉ biết bên trong hàm đó; bài `src/so-khach-mot-luat-tien.test.ts` siết thành 11 đối số, đối số cuối `cong.qua`.
- Lô huỷ thua vì câu bảo vệ: người giữ quyền Đối tác nhận câu ADR-0170 (`don_da_mo_ve`), văn phòng nhận `tra_sau_con_no_da_mo_ve` (`dichLoiLoHuy`). Gốc lắp ráp không nuốt lỗi soạn câu trả vé khi có cờ (trước đây nuốt ⇒ mất câu bảo vệ của cả ADR-0170).
- Câu 409 sửa tăng (chữ mới, đảo ngược được, chưa vào bảng từ): «Số tiền tăng thêm … vượt hạn mức: bên đặt còn được dùng … (hạn mức …, đang nợ …)».
- Câu gác phiên bản của lô huỷ (đơn Trả sau hết nợ) đứng ĐẦU lô, không sau nhật ký: câu ABORT của dispatch (`chen_abort_sau`) đọc `changes()` của câu ngay trước nên câu gác đứng sau nhật ký làm ABORT ghi cả khi huỷ thua (bài đỏ rồi sửa). `daHuy` bỏ, thay bằng `huy.thang`. Hệ quả: huỷ thua vẫn tăng phiên bản bên đặt.
- Thêm `cauTangChoDon` ở duyệt điều chỉnh sổ — ngoài danh sách của kế hoạch, theo ADR-0168 Đ2 mục 4 («mọi đường làm nợ tăng»), do bảng chạy thật tìm ra.

## Ruling thi công Task 5 Step 1–4 (2026-11-06)

- **Việc B (lỗi 500):** `ctx.traVeKhiHuy` trả `null` (thay vì NÉM) khi lô huỷ phải mang câu bảo vệ mà soạn câu trả vé lỗi; bốn nơi gọi trả 503 `tra_sau_chua_dung_duoc` «Chưa kiểm được vé của đơn nên chưa huỷ được. Thử lại sau ít phút.» trước khi dựng lô. Câu không nói hạn mức vì cờ có thể đến từ tài khoản Đối tác với đơn Trả trước. Commit 299576cb, bài đỏ trước (500) ở `src/tra-sau-duong-ghi.test.ts` («Task 5: /status», «Task 5: handler-cancel»).
- **Việc A (tên chủ chọn 6/11, hộp hỏi «tên theo chữ ngân hàng»):** «Cấp hạn mức» / «Điều chỉnh hạn mức» (một nút đổi chữ theo việc đã có hạn mức hiệu lực hay chưa), «Đóng hạn mức» + hộp hỏi «Đóng hạn mức» / «Giữ hạn mức», khối «Hạn mức trả sau», «Chưa cấp», «Hạn mức khả dụng». Commit 32dfbabc. Câu 409 sửa tăng ở ruling Task 2, 3 nay là «Số tiền tăng thêm … vượt hạn mức khả dụng của bên đặt là … (hạn mức …, đang nợ …)».
  - Giả định bề mặt, ghi lại: dòng nhắc trong bảng vẫn ghi «Đang bật: …» khi đã có hạn mức (chủ không nói); nhãn nhật ký `credit_limit_set` «Đặt hạn mức trả sau», `credit_limit_stopped` «Ngừng hạn mức trả sau» giữ nguyên theo lệnh — chờ chủ quyết có đổi theo không.
  - Báo một lần: «Đóng hạn mức» dùng chữ «Đóng» mà khái niệm «Ngừng» của bảng từ nói «Đóng» chỉ còn nghĩa gập khung; tiêu đề khối «Hạn mức trả sau» trùng tên màn chỉ xem ở Thiết lập. Chủ đã chọn, đã ghi ở khái niệm «Hạn mức trả sau».
- **Task 5 Step 2:** `node --test src/bang-tham-chieu.test.ts` xanh (25/25 trước khi đổi chữ); chỗ lệch cũ `web/hoa-hong-cap.ts:149` không còn.

## Phát hiện của e2e Task 5 Step 1 (2026-11-06 — chủ đã chọn, xem cuối mục)

- `tests/e2e/tra-sau.mjs` mục 5 (commit c4272e31) chạy trên D1 local thật: mọi bước tới «Xong và đủ tiền» đạt (gửi đơn ⇒ xác nhận + giữ 2 vé; đối tác mở ảnh, tạo đường dẫn khi chưa trả đồng nào; ghi «Công ty thu» đủ + Kế toán nộp 1.000 ⇒ nợ 199.000, hạn mức khả dụng 801.000; khách thấy đủ 2 vé; Quản trị huỷ ⇒ 409 `tra_sau_con_no_da_mo_ve`; «Xong và đủ tiền» qua vì tiền đã GHI đủ phải thu).
- **Đỏ có chủ ý ở dòng «sau Xong và đủ tiền nợ vẫn còn»:** nợ của đơn tụt từ 199.000 xuống 179.000, đúng bằng dòng hoa hồng 10% × 200.000 sinh ở bước «Xong và đủ tiền». Nghi gốc: `soChuaVeCongTy` trừ dòng hoa hồng vào phần đối tác đang giữ, mà ADR-0168 Đ2 mục 2 ghi «Tính trên toàn bộ tiền phải thu, không trừ hoa hồng». Hệ quả: hạn mức khả dụng của đối tác trống ra thêm đúng số hoa hồng trước khi tiền về công ty. Chưa đọc kỹ mã để chắc gốc; chưa có bài đơn vị.
- Chủ cần chọn: (a) nợ Trả sau không trừ hoa hồng (theo chữ ADR, sửa `noTheoDon`, bài đơn vị đỏ trước); (b) trừ hoa hồng là đúng nghiệp vụ (đối tác giữ lại phần hoa hồng của mình) ⇒ cần ADR mới sửa Đ2 mục 2, bài e2e đổi số kỳ vọng. Khuyến nghị (a) vì ADR đã duyệt thắng mã. Lời cấm «chưa cấp hạn mức thật» vẫn giữ.
- **Chủ chọn (2026-11-06, hai lần hỏi):** lần 1 chọn (a). Người điều phối thử lọc dòng `HOA_HONG` trong `noTheoDon`: nợ giữ 199.000 nhưng `POST /api/ledger/settlements` nộp 199.000 bị 409 `settlement_exceeds_held` («còn 179.000 ₫ chưa nộp») vì sổ đại lý đợt 2 vốn cho đối tác giữ hoa hồng từ tiền đang cầm ⇒ đối tác nộp hết vẫn treo 20.000 nợ mãi. Hoàn lại phần sửa, hỏi lần 2 kèm sự thật này: chủ chọn «Khớp sổ đại lý». Mã giữ nguyên; ADR-0177 (proposed) ghi cách hiểu: trước «Xong và đủ tiền» không trừ hoa hồng, từ đó nợ = phần còn giữ theo sổ đã bù hoa hồng. Bài e2e mục 5 khoá 179.000, nộp 179.001 ⇒ 409, nộp 179.000 ⇒ hết nợ; `npm run test:e2e -- tra-sau` 4/4 xanh. Phép sửa thử (đỏ ở bước nộp) là lần quan sát bài chặn thật.

## Điều chưa làm

- ~~e2e vé của đơn Trả sau~~ — có từ 6/11 (`tests/e2e/tra-sau.mjs` mục 5), đang đỏ ở chỗ nợ sau «Xong và đủ tiền», xem mục phát hiện ở trên.
- `audit-invariants` chạy cuối bộ e2e đủ bộ của `run.mjs`, không chạy riêng trong `tests/e2e/tra-sau.mjs`.
- ~~Bài `src/bang-tham-chieu.test.ts` có một chỗ lệch có từ trước (`web/hoa-hong-cap.ts:149`)~~ — không còn (kiểm 2026-11-06).

## ADR-0181 (accepted 7/11) — thi công 2026-11-07 (nhánh `claude/tra-sau-sau-kiem-7-11`, sau kiểm độc lập TRUNG-1, TRUNG-2)

- **Đ1a nhắc:** câu `credit_orders_with_due` bỏ lọc `delivered_at IS NULL`; nợ vẫn lọc bằng `noTheoDon` lúc gửi.
- **Đ1b Ân hạn:** route bỏ chặn sớm theo `delivered_at` (chỉ route này); NT-F7 nhận route vào danh sách `NGOAI_LE` có tên (khác `MIEN`). Migration `0146_an_han_don_da_xong.sql` tạo lại `orders_delivered_lock`: thêm một trường hợp — đơn CREDIT, `credit_due_at` đổi sang mốc khác NULL, chỉ ba cột hạn trả + `updated_at` khác, `completed_at/_by` phải giữ. Bài NT-R6b quét từng cột. Giao diện không sửa (cờ `coQuyenAnHan` và `web/an-han-tra-sau.ts` không xét `deliveredAt`; bài kiểm cờ ở màn đơn).
- **Đ2:** (a) `credit_limit_at`, `credit_limit_all_at` đòi vai đang mở được hưởng (định nghĩa trigger 0141). (b) Câu đóng mới `credit_limit_close_no_role` TỰ KIỂM «không còn vai được hưởng», đặt SAU câu đóng vai trong cùng lô; billing công bố `cauDongHanMucKhiHetVai` (đóng + nhật ký `credit_limit_stopped` nối `changes() > 0` + tăng phiên bản), gốc lắp ráp tiêm qua `gopHoSo` (`coHanMucTraSauMo`, `cauDongHanMucKhiHetVai`) vào route gỡ vai Danh bạ và `PUT /api/staff/:id/roles` (cả hai nhánh lô). (c) R-CRD-5 (cảnh báo, liệt kê hồ sơ).
- **Ruling thi công (giả định ghi lại):** dùng câu đóng có điều kiện thay cho `dongHanMucStatement` trần — lô đóng vai thua (0 dòng) hoặc còn vai khác thì không đóng, không cần tính `conVaiHuong` (khái niệm của hoa hồng, khác định nghĩa trigger). Màn danh sách hạn mức cũng áp lớp đọc nên hồ sơ hết vai chỉ còn hạn mức mở (không nợ) không hiện; R-CRD-5 báo. Trường hợp được phép của trigger không đòi `completed_at IS NULL` (đơn đã Hoàn thành không còn nợ theo luật Hoàn thành; route vẫn đòi nợ > 0).
- **Nhật ký thay đổi:** mục 2.73 (migration 0146).
