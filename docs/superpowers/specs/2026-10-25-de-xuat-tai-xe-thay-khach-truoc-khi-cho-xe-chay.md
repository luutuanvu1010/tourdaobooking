# Đề xuất — Tài xế thấy tên khách và số liên hệ ngay trên màn trước khi cho xe chạy

> **Bản nháp chờ chủ duyệt** (25/10/2026; đã soát sự thật một vòng cùng ngày). Nguồn: chủ dự án trong chat 25/10, nguyên văn: «Soạn đề xuất ngắn: tài xế công ty, trong ngày chạy, thấy tên khách, SĐT liên hệ, dịch vụ ngay trên màn trước khi cho xe chạy.» Đó là mục 2.2 của lần kiểm phân hệ bán hàng – vận chuyển cùng ngày, trích: «Ngày giờ đón, tên khách, số lượng, địa điểm, gói dịch vụ, điểm trả khách, số điện thoại ngay cả khi không nhấn nút xổ xuống».
> **Bạn đang đổi lại lựa chọn của chính mình:** ngày 30/9 bạn đã duyệt thêm danh sách điểm vào màn này «không tên khách» (câu 6 của bộ ảnh phác G1, hộp hỏi gom; lên ở bản 1.40). Câu hỏi khi đó gộp chung chuyến ngày mai, ngày kia và không nói máy chủ đã gửi tên trong ngày chạy. Đây cũng là mục việc tồn BL-TEN-TRUOC-XB (lỗi HT-07, kiểm theo vai 2/10) đang chờ bạn quyết.
> **Không cần ADR mới:** chỉ đổi màn hình, không đổi thứ máy chủ gửi. ADR-0049 D3 đã cho tài xế công ty thấy họ tên, năm sinh khách và tên + SĐT người liên hệ «trong ngày chạy», không buộc phải sau khi xe chạy; ADR-0053 D7.2 (khung của tài xế đối tác) và ADR-0139 (tên dịch vụ, SĐT người đi kèm) giữ nguyên. Lựa chọn ngày 30/9 là lựa chọn giao diện, không phải ADR.
> **Xây trên lỗ đang hở:** không (rà `docs/quyen-hoan.json` ngày 25/10: sáu mục HIGH đang mở đều về tiền, khôi phục dữ liệu, tác vụ tự động — không mục nào về màn tài xế).

## 1. Hiện nay

Màn một chuyến của tài xế (`/cuoc-chuyen`), **trước** khi bấm «Cho xe chạy», có: biển số, ngày giờ, tổng số khách, người đi kèm (tài xế công ty: kèm SĐT bấm gọi, ADR-0139); khối «Suất của khách» (khi còn khách chưa có tên); danh sách điểm đón và điểm trả với giờ hẹn, số khách mỗi điểm, số hiệu chuyến bay, tên dịch vụ (tài xế công ty, trong ngày chạy), nút chỉ đường; khối điều kiện cho xe chạy. **Không có** tên khách, năm sinh, người liên hệ. **Sau** khi bấm, các điểm đón chưa xong hiện tên, năm sinh từng khách (ngoài khung xem khách chỉ «Khách 1», «Khách 2»…) và dòng «Liên hệ: <tên> <SĐT>» bấm số là gọi.

Máy chủ **đã gửi sẵn** tên, năm sinh và liên hệ cho tài xế công ty từ 0 giờ ngày chạy, bất kể xe đã chạy hay chưa (route `GET /api/van-chuyen/cuoc-cua-toi/:id` chỉ xét khung xem khách); với tài xế đối tác thì từ sau hạn Từ chối (mặc định 12 giờ trước giờ chạy), trong ngày chạy. Màn chưa vẽ vì hàm `veDiemTruoc` (`web/cuoc-chuyen.ts`) truyền danh sách khách rỗng và không gọi `lienHeCua`. Hệ quả: chuyến còn thiếu điều kiện thì nút «Cho xe chạy» bị khoá, nên tài xế không có cách nào thấy số liên hệ khách trên màn; và dòng «Bạn thấy tên khách và mã đơn từ …» trên màn tài xế đối tác đang hứa điều màn chưa làm. Kịch bản Chrome `cuoc-smoke.mjs` bước 3b ghim đúng hành vi cũ này.

## 2. Đề xuất

Trên màn trước khi cho xe chạy của **tài xế công ty**, trong ngày chạy (tức khi máy chủ đã gửi dữ liệu), mỗi điểm đón hiện thêm:
1. tên và năm sinh từng khách lên ở điểm đó (khách chưa có tên hiện «Khách 1», «Khách 2»… như màn đang chạy), **không** có nút Đã đón / Vắng;
2. dòng «Liên hệ: <tên> <SĐT>» bấm số là gọi, giống hệt màn đang chạy.

Giữ nguyên: tên dịch vụ, giờ hẹn, số khách, chỉ đường, khối «Suất của khách» và nút «Bổ sung tên». Tài xế đối tác theo câu Q1. **Ngoài phạm vi** (mỗi việc cần quyết định riêng, có ADR): hiện tên ngay trên thẻ trang «Cuốc của tôi» (máy chủ của trang danh sách chưa gửi tên); thấy tên từ hôm trước; mở thêm cho tài xế đối tác những thứ ADR-0139 đã loại.

## 3. Cần bạn quyết (khuyến nghị đứng đầu)

- **Q1. Tài xế đối tác có được thấy như vậy không?** Hai cách đều chỉ sửa màn, không sửa máy chủ, không cần ADR, công như nhau. **(a) Khuyến nghị: chỉ tài xế công ty** — đúng điều bạn xin; tài xế đối tác giữ y như hôm nay (trên màn chỉ thấy tên sau khi bấm «Cho xe chạy»), chỉ sửa dòng hứa «Bạn thấy tên khách và mã đơn từ …» cho khớp màn. Muốn mở thêm thì làm sau được, còn người ngoài đã thấy thì không lấy lại được. (b) Cả tài xế đối tác: họ đọc được tên và liên hệ trên màn từ sau hạn Từ chối trong ngày chạy (sớm nhất 0 giờ ngày chạy) thay vì lúc bấm «Cho xe chạy». Đây đúng là khung bạn đã duyệt ở ADR-0053 (cửa một chiều, ngày 30/9), máy chủ vốn đã gửi tới máy họ, và dòng hứa kia khớp phần tên. Cả hai cách, tài xế đối tác vẫn không bao giờ thấy tên dịch vụ và SĐT người đi kèm.
- **Q2. Khách trả ở đâu** (yêu cầu 2.2 có «điểm trả khách»). **(a) Khuyến nghị:** khi chuyến có từ hai điểm trả trở lên, dưới tên mỗi khách ở điểm đón thêm chữ nhỏ «Trả: <nơi trả>», cả trước và trong khi xe chạy. Máy chủ đã gửi sẵn nơi trả của từng suất, không gửi thêm gì; nhưng đặt cạnh tên thì đó là thông tin của từng người, nên chữ này chỉ hiện ở chỗ đang hiện dòng khách. Chuyến chỉ một điểm trả, hoặc suất chưa có nơi trả, thì không hiện. (b) Không thêm.

## 4. Tiêu chí nghiệm thu (viết trước)

1. Tài xế công ty, chuyến hôm nay chưa chạy: mỗi điểm đón có tên + năm sinh từng khách và dòng liên hệ bấm gọi được; không có nút tiến độ; nút «Cho xe chạy» vẫn dính đáy, không bị che.
2. Cùng tài xế, chuyến ngày mai: không tên, không SĐT (như hôm nay).
3. Tài xế đối tác, có kịch bản Chrome mới cho ca đã qua hạn Từ chối mà xe chưa chạy: theo Q1 (a) màn y như hôm nay, dòng hứa đã sửa cho khớp; theo Q1 (b) trước hạn không tên, không SĐT, sau hạn trong ngày chạy có tên và liên hệ. Không bao giờ có tên dịch vụ, SĐT người đi kèm.
4. Máy chủ không đổi: không sửa tệp nào ở `src/modules/`; `src/modules/van-chuyen/tai-xe-dto.test.ts` và `sdt-nguoi-di-kem-tai-xe.test.ts` xanh nguyên trạng.
5. Nếu duyệt Q2 (a): chuyến hai điểm trả hiện «Trả: <nơi>» đúng từng khách; chuyến một điểm trả không hiện; màn văn phòng không đổi.
6. Ảnh thật khổ 390 và 1040, trước và sau, để chủ duyệt một lượt.

## 5. Cách làm (cho người thi công)

- `web/cuoc-chuyen.ts`, hàm `veDiemTruoc`: truyền khách khi `r.trongNgayChay` (cờ này nay nghĩa là «trong khung xem khách»), thêm `lienHeCua`. Luật «khi nào hiện khách trước khi xe chạy» (và chữ «Trả:» nếu Q2 a) là hàm thuần ở `src/shared/tien-do-man.ts`, có bài kiểm đỏ trước, xanh sau cho **cả hai loại tài xế**. Nếu Q1 (a): nhận ra tài xế công ty bằng đúng điều kiện máy chủ dùng cho phần chỉ tài xế công ty (người gọi không có ô `trip.refuse` — «không vế hạn Từ chối», `dieu-phoi-route.ts` chỗ dựng `themCongTy`), không dựa vào cờ bổ sung tên `coBoSungTen`.
- Đảo có chủ đích bước 3b của `docs/evidence/2026-09-29-adr-0049/kich-ban/cuoc-smoke.mjs` và bản sao `docs/evidence/2026-10-07-danh-gia-erp-van-chuyen/kich-ban/ui/cuoc-smoke-va.mjs` («trước xuất bến (hôm nay): không lộ tên / SĐT» → có tên, có liên hệ); giữ bước 3 (chuyến ngày mai: không tên). Chạy thêm `docs/evidence/2026-10-12-c2/kich-ban/c2-man-tai-xe-smoke.mjs`, `docs/evidence/2026-09-28-van-chuyen-1a/kich-ban/tai-xe-trang-dau-smoke.mjs` và `docs/evidence/2026-10-08-adr-0105/kich-ban/chi-duong-smoke.mjs` (sửa tiêu đề bước 2 đang ghi «không tên / SĐT khách»).
- Cùng lần sửa: chữ hướng dẫn tài xế `src/shared/huong-dan-tai-xe.ts` (mục «Xem cuốc và chuẩn bị» bước 4, mục tài xế đối tác); chú thích trong `veXuatBen` (đang viện ADR-0053 D7.2 làm lý do giấu tên, D7.2 không đòi vậy); đóng mục BL-TEN-TRUOC-XB ở `docs/BACKLOG.md`.
- Bẫy: `veDiemChay` dùng chung với màn văn phòng `web/chuyen.ts` — chữ «Trả:» đi qua móc `phuKhach` riêng của màn tài xế; truyền `suat` vào có thể bật nhãn «Văn phòng đã báo huỷ» (ca văn phòng thu hồi xuất bến); khối «Suất của khách» đếm «Suất N» trên cả chuyến, còn dòng khách đếm «Khách i» theo điểm — chọn một cách đếm để tài xế khỏi nhầm.
- Thêm mục nhật ký thay đổi ở bản kế tiếp; không migration; phát hành cần `npm run trien-khai` vì đổi giao diện.
- Không phải «việc lớn» theo CLAUDE.md §3 (không đổi máy chủ, quyền, dữ liệu, tiền), nhưng vì hiện thông tin cá nhân nên vẫn có một lượt kiểm độc lập chỉ đọc trước khi báo xong.
