# Đề xuất — Tài xế thấy tên khách và số liên hệ ngay trên màn trước khi cho xe chạy

> **Bản nháp chờ chủ duyệt** (25/10/2026). Nguồn: chủ dự án trong chat 25/10, nguyên văn: «Soạn đề xuất ngắn: tài xế công ty, trong ngày chạy, thấy tên khách, SĐT liên hệ, dịch vụ ngay trên màn trước khi cho xe chạy.» (mục 2.2 của lần kiểm phân hệ bán hàng – vận chuyển cùng ngày).
> **Không cần ADR mới:** chỉ đổi màn hình, không đổi thứ máy chủ gửi. ADR-0049 D3 đã cho tài xế công ty thấy họ tên, năm sinh khách và tên + SĐT người liên hệ «trong ngày chạy», không buộc phải sau khi xe chạy; ADR-0053 D7.2 (khung của tài xế đối tác) và ADR-0139 (tên dịch vụ, SĐT người đi kèm) giữ nguyên. Việc giấu tên trước khi xe chạy là lựa chọn lúc thi công bản 1.39–1.40, không phải lời chủ: góp ý C3 ngày 30/9 chỉ xin «điểm đón từ trước, ngày giờ đón, vị trí và số lượng khách».
> **Xây trên lỗ đang hở:** không (rà `docs/quyen-hoan.json` ngày 25/10: sáu mục HIGH đang mở đều về tiền, khôi phục dữ liệu, tác vụ tự động — không mục nào về màn tài xế).

## 1. Hiện nay

Màn một chuyến của tài xế (`/cuoc-chuyen`), **trước** khi bấm «Cho xe chạy», có: biển số, ngày giờ, tổng số khách, người đi kèm; danh sách điểm đón và điểm trả với giờ hẹn, số khách mỗi điểm, số hiệu chuyến bay, tên dịch vụ (tài xế công ty, trong ngày chạy), nút chỉ đường; khối điều kiện cho xe chạy. **Không có** tên khách, năm sinh, người liên hệ. **Sau** khi bấm «Cho xe chạy», mỗi điểm đón hiện đủ tên, năm sinh và dòng «Liên hệ: tên — SĐT» bấm gọi được.

Máy chủ **đã gửi sẵn** tên, năm sinh và liên hệ cho tài xế công ty từ 0 giờ ngày chạy, bất kể xe đã chạy hay chưa (route `GET /api/van-chuyen/cuoc-cua-toi/:id` chỉ xét khung xem khách). Màn chưa vẽ vì hàm `veDiemTruoc` (`web/cuoc-chuyen.ts`) truyền danh sách khách rỗng và không gọi `lienHeCua`. Kịch bản Chrome `cuoc-smoke.mjs` bước 3b đang ghim đúng hành vi cũ này («máy chủ ĐÃ gửi tên khách nhưng danh sách điểm trước xuất bến KHÔNG vẽ»).

## 2. Đề xuất

Trên màn trước khi cho xe chạy, **khi máy chủ đã gửi dữ liệu** (tức đang trong khung xem khách của người đó), mỗi điểm đón hiện thêm:
1. tên và năm sinh từng khách lên ở điểm đó (khách chưa có tên hiện «Khách 1», «Khách 2»… như màn đang chạy), **không** có nút Đã đón / Vắng;
2. dòng «Liên hệ: tên — SĐT» bấm là gọi, giống hệt màn đang chạy.

Giữ nguyên: tên dịch vụ, giờ hẹn, số khách, chỉ đường, khối «Suất của khách» (bổ sung tên). **Ngoài phạm vi** (mỗi việc cần quyết định riêng, có ADR): hiện tên ngay trên thẻ trang «Cuốc của tôi» (máy chủ của trang danh sách chưa gửi tên); thấy tên từ hôm trước; mở thêm cho tài xế đối tác những thứ ADR-0139 đã loại.

## 3. Cần bạn quyết (khuyến nghị đứng đầu)

- **Q1. Tài xế đối tác.** **(a) Khuyến nghị:** màn vẽ đúng thứ máy chủ gửi, nên tài xế đối tác cũng thấy tên và liên hệ trước khi xe chạy, nhưng **chỉ khi đã qua hạn Từ chối trong ngày chạy** (ADR-0053 D7.2) — đúng những gì họ đã thấy ngay khi xe chạy; họ vẫn không bao giờ thấy tên dịch vụ và SĐT người đi kèm. (b) Chỉ tài xế công ty: phải sửa máy chủ để bớt dữ liệu gửi cho tài xế đối tác trước khi xe chạy — việc lớn hơn, cần ADR.
- **Q2. Khách trả ở đâu** (mục «điểm trả khách» trong yêu cầu 2.2). **(a) Khuyến nghị:** khi chuyến có từ hai điểm trả trở lên, dưới tên mỗi khách ở điểm đón thêm chữ nhỏ «Trả: <nơi trả>», cả trước và trong khi xe chạy; dữ liệu đã có trong phản hồi máy chủ, không phải thông tin cá nhân. Chuyến chỉ một điểm trả thì không hiện (đỡ rối). (b) Không thêm.

## 4. Tiêu chí nghiệm thu (viết trước)

1. Tài xế công ty, chuyến hôm nay chưa chạy: mỗi điểm đón có tên + năm sinh từng khách và dòng liên hệ bấm gọi được; không có nút tiến độ; nút «Cho xe chạy» vẫn dính đáy, không bị che.
2. Cùng tài xế, chuyến ngày mai: không tên, không SĐT (như hôm nay).
3. Tài xế đối tác: trước hạn Từ chối không tên, không SĐT; sau hạn, trong ngày chạy, có tên và liên hệ (theo Q1); không bao giờ có tên dịch vụ.
4. Máy chủ không đổi: không sửa tệp nào ở `src/modules/`; `src/modules/van-chuyen/tai-xe-dto.test.ts` và `sdt-nguoi-di-kem-tai-xe.test.ts` xanh nguyên trạng.
5. Nếu duyệt Q2 (a): chuyến hai điểm trả hiện «Trả: <nơi>» đúng từng khách; chuyến một điểm trả không hiện.
6. Ảnh thật khổ 390 và 1040, trước và sau, để chủ duyệt một lượt.

## 5. Cách làm (cho người thi công)

- `web/cuoc-chuyen.ts`, hàm `veDiemTruoc`: truyền khách khi `trongNgayChay`, thêm `lienHeCua`. Luật «khi nào hiện khách trước khi xe chạy» (và chữ «Trả:» nếu Q2 a) là hàm thuần ở `src/shared/tien-do-man.ts`, có bài kiểm đỏ trước, xanh sau.
- Đảo có chủ đích bước 3b của `docs/evidence/2026-09-29-adr-0049/kich-ban/cuoc-smoke.mjs` và bản sao `docs/evidence/2026-10-07-danh-gia-erp-van-chuyen/kich-ban/ui/cuoc-smoke-va.mjs` («trước xuất bến (hôm nay): không lộ tên / SĐT» → có tên, có liên hệ); giữ bước 3 (chuyến ngày mai: không tên). Chạy thêm `docs/evidence/2026-10-12-c2/kich-ban/c2-man-tai-xe-smoke.mjs` và `docs/evidence/2026-09-28-van-chuyen-1a/kich-ban/tai-xe-trang-dau-smoke.mjs`.
- Thêm mục nhật ký thay đổi ở bản kế tiếp; không migration; phát hành cần `npm run trien-khai` vì đổi giao diện.
- Không phải «việc lớn» theo CLAUDE.md §3 (không đổi máy chủ, quyền, dữ liệu, tiền), nhưng vì hiện thông tin cá nhân nên vẫn có một lượt kiểm độc lập chỉ đọc trước khi báo xong.
