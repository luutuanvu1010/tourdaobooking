# Đợt 1 sau kiểm toán 14/11 — sổ điều phối thi công

Nguồn: `docs/superpowers/specs/2026-11-14-kiem-toan-tien-ve-du-lieu-va-ke-hoach.md` mục 8, Đợt 1. Chủ dự án ra lệnh «Làm Đợt 1» ngày 14/11/2026.
Nhánh: `claude/financial-data-security-audit-1f92e7`. Số migration dành cho đợt này: `0166` (0163 thuộc nhánh ADR-0199, 0164–0165 thuộc nhánh phí đón, đều chưa nhập). ADR đề xuất: `ADR-0204` (0203 đã có trên nhánh khác).

## Bảng việc và tiêu chí nghiệm thu (viết trước khi làm)

| Việc | Xong khi (hành vi kiểm được) | Trạng thái |
|---|---|---|
| T1 — Mã giao dịch cho khoản nộp đại lý | (a) Kế toán xác nhận khoản nộp mà thiếu mã giao dịch hoặc số thực chuyển thì bị từ chối 400, khoản vẫn chờ. (b) Hai khoản nộp, hoặc một khoản nộp và một khoản «Công ty thu», cùng một mã mà tổng vượt số thực chuyển thì lệnh sau bị từ chối 409, kể cả khi hai lệnh tới cùng lúc (lớp cơ sở dữ liệu). (c) Cùng mã, khác số thực chuyển thì 409. (d) Một lần chuyển cho hai đơn, tổng không vượt, thì cả hai qua. (e) Ảnh biên lai trùng ảnh của khoản nộp khác: phiếu của Kế toán có cờ cảnh báo, không chặn; băm ảnh không ra DTO. | chưa |
| T2 — Khoản nộp đã xác nhận không lệch sổ | (a) Lệnh huỷ lẻ dòng sổ thuộc phiếu của một khoản nộp đã xác nhận bị từ chối 409, có câu chỉ đường. (b) Bộ soát có luật mới: khoản nộp đã xác nhận phải còn dòng sổ có hiệu lực đúng số tiền; cố ý làm lệch thì luật báo. | chưa |
| V1 — Dời ngày đi thì cân lại vé | Đơn đã xác nhận, đã giữ vé chưa mở hạn ngày cũ; dời ngày sang ngày vé không còn hợp: vé cũ về kho, đơn được cấp vé hợp ngày mới nếu kho có, nếu không thì đơn báo đúng số vé thiếu. Vé đã mở mà lệch ngày: không về kho, đơn báo thiếu. Dời ngày mà vé vẫn hợp: không đổi gì. | chưa |
| TT1 — Dòng Sheet hỏng không làm mất dịch vụ | Dòng Sheet có mã dịch vụ đang có mà hỏng định dạng: dịch vụ vẫn hiện và bán theo bản đã lưu; lần đồng bộ ghi nhận dòng hỏng; Quản trị và Toàn quyền nhận một tin (không lặp mỗi 15 phút cho cùng một lỗi); màn Danh mục hiện cảnh báo rõ. Dòng thật sự bị xoá khỏi Sheet vẫn bị ẩn như cũ. | chưa |
| T3 — Nháp cũ, giá mới | Có bài thử: lưu nháp giá cũ, đổi giá danh mục, xác nhận. Nếu đơn chốt giá cũ mà không báo: sửa để xác nhận trả 409 `catalog_changed`. Nếu đã có lớp chặn: giữ bài thử làm lưới, ghi kết luận ở đây. | chưa |

## Điều người dùng sẽ thấy khác (đã báo chủ 14/11 trước khi nhập)

- Kế toán: khi xác nhận khoản nộp của đại lý phải gõ thêm mã giao dịch ngân hàng và số tiền thực chuyển, giống khoản «Công ty thu» bằng chuyển khoản.
- Kế toán: không huỷ lẻ được dòng sổ của khoản nộp đã xác nhận; muốn sửa thì dùng điều chỉnh có duyệt.
- Bán hàng, khách: dời ngày đi của đơn đã có vé thì vé cũ không hợp ngày bị thu lại, đơn nhận vé mới hoặc báo thiếu vé.
- Quản trị, Toàn quyền: nhận tin khi một dòng trên Sheet bị gõ sai.

## Cách chia

Ba lần giao song song, tệp không chồng nhau: A (T1 + T2, phần tiền), B (V1 + T3, phần đơn và vé), C (TT1, danh mục). Một người kiểm độc lập ở cuối. Bộ kiểm dài chạy một lần sau khi cả ba xong.

## Kết quả (14/11)

- T1, T2: thi công xong (migration `0166_ma_giao_dich_khoan_nop.sql`, bảng `bil_remittance_bank_txn`, luật soát R-BIL-NP1, R-BIL-NP2). Kiểm độc lập: đạt có điều kiện, không có phát hiện Cao.
- V1: thi công xong, không migration (`cauTraPhanBoLechNgay`, `canBangVeTheoSoKhach` xét thêm ngày, route `/trip` gọi cân vé khi đổi ngày). Kiểm độc lập: đạt có điều kiện.
- TT1: thi công xong phần giữ dịch vụ, dấu bền, cảnh báo ở màn Danh mục. **Chưa nối đường gửi tin** cho Quản trị và Toàn quyền: chờ chủ chọn cách hiện người gửi (máy tự gửi). Kiểm độc lập: đạt.
- T3: **lỗi có thật**, tái hiện bằng `src/modules/orders/nhap-cu-gia-moi.test.ts` (ba đường xác nhận đều chốt giá cũ). Chưa sửa hành vi: chờ chủ chọn chặn (409 `catalog_changed`) hay chỉ cảnh báo.
- Bộ kiểm lần 1: kiểm kiểu xanh; `npm test` 9005/9011, hai bài đỏ đều do sổ phụ chưa cập nhật (dấu «đã xem lại» hai bài hướng dẫn về vé; bảng giây thiếu số đo của năm tệp kiểm mới), đã sửa. e2e 91/93: H5 đòi khai `PUT /api/orders/:id/trip` vào `src/shared/lan-gui-no.ts` (đã khai); `so-dai-ly` nhận 500 thân rỗng ở bước lưu nháp đua với xác nhận, kiểu đỏ giả đã biết của máy chủ thử dưới tải, chờ lần chạy lại.

## T3 — diễn biến 15/11

- Chủ chọn «Chặn xác nhận». Thi công bản chặn mọi người; bộ kiểm đủ đỏ 28 bài và kịch bản `tests/e2e/trip.mjs`. Nguyên nhân: kịch bản đó khoá **Q11** của đặc tả `2026-09-19-thong-tin-chuyen-di-design.md` («nháp cũ … đổi giá: giữ bản chụp đã lưu, chỉ cảnh báo»). Bản kiểm toán 14/11 đã gọi nhầm một quyết định có sẵn là lỗi vì không tra đặc tả trước.
- Dừng, báo chủ xung đột, đưa ba hướng. Chủ chọn «Chặn Đối tác, Thực tập».
- Thi công lại: bước chặn chỉ áp khi người bấm bị áp R2 hoặc người lập giữ quyền Đối tác / Thực tập; nhân viên nội bộ giữ Q11, thêm câu nhắc trước khi xác nhận. Văn bản: ADR-0205 (đề xuất).
- Bài học ghi lại: trước khi gọi một hành vi là lỗi, tra đặc tả và kịch bản thử xem có quyết định của chủ đứng sau không.

## TT1 — chủ quyết 15/11: «Chỉ cảnh báo đỏ»

Không gửi tin cho Quản trị, Toàn quyền khi dòng Sheet gõ sai; chỉ giữ khối cảnh báo ở đầu màn Danh mục. Phần soạn tin và chống lặp ở `catalog/service.ts` (`baoTin`, `soanTinDongHong`, cờ `daBao`) để nguyên, không nối vào đâu; muốn bật sau này cần chủ quyết cách hiện người gửi.

## Nhật ký thay đổi

Mục số tạm 3.6 (15/11) trong `src/shared/changelog.ts`, năm dòng lời thường. Bước A.0 đặt lại số và ngày nếu nhánh khác nhập trước.

## Bằng chứng giao diện (15/11)

- `docs/evidence/2026-11-13-khoan-nop-dai-ly/kich-ban/khoan-nop-smoke.mjs` thêm bước nhập mã: hàng hỏi lại có hai ô; bấm khi trống ⇒ khoản vẫn chờ; nhập mã + số ⇒ xác nhận được. 10/10 bước xanh, có axe, hai khổ 390 và 1280.
- `docs/evidence/2026-11-15-dot-1-sau-kiem-toan/kich-ban/hai-man-smoke.mjs` (mới): cảnh báo đỏ ở Danh mục (TT1), câu nhắc giá đổi trên trang đơn nháp của nhân viên (T3). 4/4 bước xanh, có axe. Ảnh ở `anh/` cùng thư mục.
- Trang ghép cho lượt duyệt ADR-0204 + ADR-0205: `docs/superpowers/specs/2026-11-15-trang-ghep-adr-0204-0205.md`.

## Ruling, nợ

- Chưa có nút nhận giá mới ngay trong nháp (phải bỏ dịch vụ rồi chọn lại). Câu nhắc nhân viên «Giá danh mục của «…» đã đổi…» là câu mới, chờ chủ duyệt chữ.

- Vé trả do dời ngày ghi lý do `GIAM_SO_KHACH` (bảng chưa có lý do riêng). Đợt sau thêm lý do `DOI_NGAY` bằng migration.
- Dời ngày đơn có vé đã mở: vé bị vô hiệu, màn hình chưa cảnh báo trước khi dời. Đã ghi vào bài hướng dẫn «Kho vé điện tử»; cảnh báo trên màn hình chờ chủ quyết.
- `docs/SO-HANG-RAO.md`: bốn hàng rào mới (R-BIL-NP2, `remittance_line_no_reversal` kèm câu 409, `amount_mismatch`, hai trigger đối xứng) chưa có ngày quan sát chặn thật; theo luật là lời khuyên cho tới khi ghi ngày.
- Trùng mã cùng đơn giữa khoản nộp và khoản «Công ty thu»: mới chặn ở máy chủ, chưa có trigger.
- `web/catalog.ts`: dòng «N dòng bị bỏ qua» đếm cả dòng giữ lại.
- Câu cảnh báo ảnh biên lai trùng là câu mới, chờ chủ duyệt chữ. Màn xác nhận khoản nộp mới và khối cảnh báo ở Danh mục chưa ai nhìn bằng mắt, chưa chạy kịch bản Chrome.
- Chưa có mục nhật ký thay đổi và số phiên bản cho đợt này; chưa có ADR đề xuất cho bảng mã giao dịch của khoản nộp (số dành sẵn: ADR-0204).

- Lệnh ghi «Nộp / trả» bằng tay của Kế toán (`/api/ledger/settlements`) chưa bắt mã giao dịch trong đợt này: lệnh đó không có ô hình thức (tiền mặt hay chuyển khoản). Ghi nợ, đưa vào đợt đối soát sao kê.
