# Sửa số khách (ADR-0114) — Nhật ký thi công và điều phối

> Sổ điều phối của kế hoạch `2026-10-13-sua-so-khach-adr-0114-ke-hoach.md`. Ghi quyết định của người điều phối ("ruling"), điều lệch và nợ. Tài liệu có ngày: thêm dòng mới ở cuối, không sửa lại dòng cũ cho khớp hiện trạng.

## Mốc

- 13/10/2026: chủ duyệt ADR-0114 ("duyệt ADR-0114, kèm điều kiện Kế toán xem lại hai khoá mới") rồi nói "tiếp tục đi". Nhánh `claude/adr-0114-duyet`, tách từ `main` ngày 13/10.
- Thi công chia bốn việc, mỗi việc một trợ lý, người điều phối không viết mã nghiệp vụ: A máy chủ + hàm thuần (D1–D3); C sổ vàng, bất biến, hàng rào, tài liệu mô tả, e2e; B giao diện, Trợ giúp, nhật ký thay đổi; D kịch bản Chrome. Một người kiểm độc lập (chỉ đọc) kiểm cả nhánh ở khoảng commit cố định.

## Quyết định của người điều phối (ruling)

| # | Quyết định | Vì sao | Nếu sai thì mất gì / cách hoàn tác |
|---|---|---|---|
| R1 | Lịch sử số khách có ba dòng cho ca SV-SK-07 (`khoi_tao`, các `dieu_chinh` trừ lần cuối, `hien_hanh`), không bốn dòng. | Dòng "hiện hành" mang luôn lần sửa cuối, tránh hai dòng trùng số. | Đổi hàm dựng lịch sử và sổ vàng; không đụng dữ liệu. |
| R2 | Giao diện chỉ hiện khối "Số khách qua các lần sửa" khi đơn có ít nhất một lần sửa. Máy chủ vẫn trả khoá cho cả đơn nháp và đơn chưa sửa. | Đơn nháp / chưa sửa chỉ có hai dòng trùng số, nhãn "lúc xác nhận" sai nghĩa với nháp. | Sửa một điều kiện ở `src/shared/so-khach-hien-thi.ts`. |
| R3 | "Đơn có giảm giá" ở câu nhắc khuyến mại hỏi bằng **giảm giá hiệu lực**, không so `discount`. Commit `87d2ddfa`. | Bài một-hàm-phải-thu (ADR-0109) đỏ ở hai dòng so `discount`; quy định người thi công không tự thêm mục cho phép. Trợ lý A từng viết `discount !== 0` để qua bài — bị coi là lách và đã trả về, để bài đỏ chờ người rà. | Lệch chữ ADR đúng một ca (tạm tính về 0). Đã ghi `docs/SYSTEM-DESIGN.md` §16. Hoàn tác: chủ thêm hai mục cho phép của H1 rồi trả phép so về `discount > 0`. |
| R4 | Phản hồi đường hướng dẫn viên (`handler-money-edit`) giữ dạng hẹp `{ ok }`, không thêm `canhBaoKhuyenMai`. | ADR-0014 điều 6 "không lộ giá" cho đường này; câu nhắc dành cho văn phòng, hướng dẫn viên vẫn thấy nó ở chi tiết đơn (không lộ thêm gì). Người kiểm độc lập (TB-1) chỉ ra lý do trước đó trong tài liệu ("họ không xem giảm giá") là sai; đã sửa lý do. | Lệch chữ ADR; ghi §16, chờ chủ gật đầu. Hoàn tác: thêm khoá vào `HandlerMoneyEditResponse` (orders trả câu, dispatch chuyển tiếp). |
| R5 | Luật "từ ≥ 1 xuống 0 người đi kèm" chỉ còn MỘT nguồn: `suaDuaVeKhongNguoiLon` ở `src/shared/nguoi-di-kem.ts`; máy chủ và báo sớm ở giao diện cùng gọi. Commit `4f4a90df`. | Việc B phát hiện hai bản có thể lệch nhau. | Không đổi hành vi; phép phá cố ý hàm chung làm 7 bài đỏ. |
| R6 | Không thêm cổng quyền mới cho câu nhắc đỏ: hiện đúng chỗ trang đã hiện giảm giá. | Route chi tiết đơn đã đòi `money.view` + `contact.view`, phản hồi vốn mang `discount`; khoá mới không lộ thêm. | Người kiểm độc lập xác nhận. Đối tác cũng thấy câu này trên đơn của mình (T-6): trình chủ. |
| R7 | Bất biến `R-ORD-16w` chỉ ở mức cảnh báo vĩnh viễn (thoát 0). | Mức lỗi làm `npm run trien-khai` dừng vì dữ liệu cũ không sửa hàng loạt được. | Nâng mức khi dữ liệu cũ đã sạch. |

## Điều đã chạy và kết quả đã thấy

- Việc A, C, B: `npm test` mỗi việc một lần; sau việc B 4543 bài, 0 đỏ, 10 todo có sẵn. `npm run typecheck` 0 lỗi, `npm run build:web` thành công.
- Việc C: kịch bản e2e `sua-so-khach` 8/8 xanh; 19 phép phá cố ý có ghi ở `docs/SO-HANG-RAO.md` (ngày 2026-10-13).
- Người kiểm độc lập (13/10): "ĐẠT CÓ ĐIỀU KIỆN", không phát hiện mức Cao; tự phá thử 10 lần trên bản sao sạch, 8 phép nhắm hàng rào đều đỏ đúng chỗ, 2 phép nhắm phần nối ở máy chủ xanh đúng như dự đoán (giới hạn của sổ vàng, đã ghi ở sổ hàng rào).
- Kịch bản Chrome (13/10, có axe-core): kịch bản mới `docs/evidence/2026-10-13-sua-so-khach-adr-0114/kich-ban/adr-0114-smoke.mjs` xanh 9/9 (7 lần quét axe sạch); `sua-so-khach-smoke.mjs` đã cập nhật bước 5 theo dải đỏ và xanh; `hdv-viec-cua-toi-smoke.mjs`, `a2-smoke-order.mjs`, `v1-nguoi-phu-trach.mjs`, `a2-smoke-form.mjs`, `help-smoke.mjs` xanh. Đỏ không do đợt này: `a2-smoke-sheet.mjs` (kỳ vọng nhật ký `trip_updated`, thực tế `order_leg_updated`; nhánh này không đụng tên hành động nhật ký).
- Ảnh Chrome thật làm lộ lỗi giao diện (biểu tượng cảnh báo co còn vài điểm ảnh, hai câu sát nhau, đỏ sẫm khó phân biệt với nâu vàng): đã sửa bằng CSS token (commit sau kiểm độc lập); ảnh sau sửa ở `anh-sau-sua-css/`.
- e2e đủ bộ (13/10): 56/59 xanh. Ba đỏ: `trip` là hệ quả đúng của D3 (nháp 0 khách nay 409 `thieu_nguoi_lon` thay vì `incomplete_trip`/`no_guests`), đã sửa kỳ vọng và chạy lại xanh; `chuyen-khach` và kiểm H5 (Vận chuyển, nhánh không đụng) đỏ lúc tải máy 50+ vì bước chờ theo giờ, chạy riêng xanh 4/4 kể cả H5. Bộ kiểm chính (`npm test` bước 1) thoát 0; bài đo giờ của hook (bước 2) đỏ khi máy bận, nhánh không đụng `.claude/`.
- Chưa chạy: các kịch bản Chrome phụ có thể bị D3 làm đỏ (`nhap-tay`, `dua-don`, `qr`, `so-dai-ly`, `c4-bieu-mau`, `chip-nhom`, `v1-xac-nhan-png`, `moc-chua-co`); chưa kiểm đơn đã xác nhận cũ có 0 người lớn trên giao diện; Chrome headless, không phải iPhone thật.

## Nợ và việc chưa làm

- Trợ giúp Bán hàng đúng trần thời gian đọc (3150 chữ): thêm chữ phải cắt chỗ khác (bài `src/shared/huong-dan.test.ts`).
- Bảng "Sửa số khách" của hướng dẫn viên (`web/viec-cua-toi.ts`) coi 409 `thieu_nguoi_lon` là "màn hình cũ": bảng đóng, câu máy chủ vẫn hiện; chưa có báo sớm D3 ở đó.
- Dải báo sau lệnh sửa đỏ cả dải khi có câu khuyến mại (§16).
- Hai khoá đáp án mới của sổ vàng chưa có Kế toán xem lại (0/12): danh sách ở `docs/superpowers/specs/2026-10-13-sua-so-khach-adr-0114/02-danh-sach-ke-toan-xem-lai.md`.
- Luật D3 không có trigger CSDL (theo ADR): SQL tay vào đơn nháp chỉ bị bắt lúc xác nhận.
- Chưa biết số đơn đã xác nhận có 0 người đi kèm trên production (chạy `R-ORD-16w` trên remote do chủ).
- Số phiên bản 1.91 trong nhật ký thay đổi là số TẠM; kiểm lại lúc phát hành.

## Gộp main vào nhánh (13/10, tối, trước khi đưa lên)

Lệnh đưa lên (`day-len`) đòi nhánh dựng trên `main` mới nhất. `main` cục bộ đã có thêm 14 commit từ phiên làm lại màn Tạo đơn (chưa lên GitHub). Đã gộp `main` vào nhánh; chỗ trùng: (1) nhật ký thay đổi — `main` đã giữ số 1.91, nên mục của đợt này đổi thành **1.92** (số TẠM, đặt trên mục 1.91 của Tạo đơn) và dòng ghim ở `src/shared/app-info.test.ts` cùng kịch bản Chrome mới đổi theo; (2) Trợ giúp Bán hàng — lấy chữ mới của màn Tạo đơn từ `main`, giữ câu "Cả đơn cần ít nhất một người lớn" và bước 6 gọn của đợt này; nhóm Bán hàng vượt trần 30 phút 5 chữ nên cắt ba chữ phụ ở ba câu "Lưu ý" (nay đúng 3150 chữ, không còn chỗ trống).
