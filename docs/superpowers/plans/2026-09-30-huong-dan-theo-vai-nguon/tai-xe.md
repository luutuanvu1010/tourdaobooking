# Nguồn đối chiếu — Tài xế (src/shared/huong-dan-tai-xe.ts), bản 1.40

Đối chiếu trên worktree huong-dan-theo-vai, HEAD 3d0d2fe5, chỉ đọc mã. Đường dẫn tương đối gốc repo. Nhóm này phủ hai quyền: DRIVER (tài xế công ty) và DRIVER_PARTNER (mục "Tài xế nhà xe đối tác").

## Điểm chưa chắc / nghi lỗi (cho người kiểm và chủ)

1. **Chủ quyết CHƯA dùng Điều phối xe cho chuyến thật** (src/shared/changelog.ts:46; docs/VAN-CHUYEN.md §5). Hướng dẫn đặt lưu ý ở đầu "Bắt đầu nhanh"; toàn bộ luồng chạy chuyến chưa kiểm trên điện thoại thật.
2. **Bấm nhầm Đã đón / Khách đã huỷ:** màn tài xế không còn nút sau hai kết quả này (src/shared/tien-do-man.ts:126 — chỉ NO_SHOW còn "Đã đón"). Văn phòng sửa lại được đến đâu: chưa kiểm.
3. **Lý do "Kết thúc gián đoạn"** lấy từ máy chủ (danh mục văn phòng đặt — web/cuoc-chuyen.ts:184), nên hướng dẫn không nêu tên lý do.
4. **Mất mạng:** việc chưa gửi chỉ giữ trong bộ nhớ trang (web/cuoc-chuyen.ts:33-35) — tắt app là mất; khớp docs/VAN-CHUYEN.md §3.5 điểm 7. Máy không tự gửi lại (docs/VAN-CHUYEN.md §2.3: việc chưa làm).
5. **Tài xế đối tác và thông báo:** không nhận tin "Toàn công ty" (laNoiBo — src/shared/thong-bao.ts:49); màn gửi tin liệt kê mọi nhóm quyền kể cả "Tài xế đối tác" (web/gui-thong-bao.ts:149-153) — chưa kiểm trên màn thật nên hướng dẫn không nói về tin theo nhóm.
6. Nút đổi thứ tự điểm là "↑" "↓" (web/cuoc-chuyen.ts:148-149) — hướng dẫn viết bằng lời, không đặt trong [[ ]].
7. "Sửa giờ đã bấm: không được" — màn tài xế không có ô giờ (web/cuoc-chuyen.ts:4, :255); văn phòng khai giờ được qua màn của họ (web/tien-do-ui.ts:27-111).
8. Ví dụ (anh Tâm, xe 16 chỗ, hẹn 06:40 / 06:55, cảng Cầu Đá) là hư cấu.

## Nguồn theo quy trình

Tài xế — chung
- Chưa dùng thật: src/shared/changelog.ts:46 (1.38); docs/VAN-CHUYEN.md §5.
- Quyền DRIVER: src/shared/permissions.ts:66-67, :136 (trip.view assigned), :142 (trip.progress assigned), :122.
- Trang đầu /cuoc, tab "Trang chủ / Cuốc của tôi / Tôi": src/shared/start-page.ts:22-45; web/shell.ts:60-66; menu máy tính :239-244.

Tài xế — Cuốc của tôi
- web/cuoc.ts:20-55 ("Không có cuốc nào.", "Mở chuyến đang chạy"); nhóm Hôm nay / Ngày mai, chip "Bị giữ", dòng thẻ: src/shared/tien-do-man.ts:178-196; "(văn phòng lo)": src/shared/dieu-phoi-hien-thi.ts:40-42; nhãn trạng thái: src/modules/van-chuyen/dieu-phoi-dto.ts:21-27; câu điều kiện: src/shared/ly-do-giu.ts:20-51.

Tài xế — Màn chuyến / Xuất bến
- Điểm trước xuất bến (bản 1.39/1.40), "Điều kiện xuất bến", nút "Xuất bến" khoá khi thiếu, giờ = lúc bấm: web/cuoc-chuyen.ts:216-257; tiêu đề "Xuất bến …": :76.
- Nhãn "ĐÓN · HẸN …" / "TRẢ": src/shared/tien-do-man.ts:136.

Tài xế — Đang chạy
- Đã tới / Đã trả: src/shared/tien-do-man.ts:130-131; "Đã trả" tự ghi đã tới: web/cuoc-chuyen.ts:158-165.
- Đã đón / Vắng / Khách đã huỷ; sau Vắng còn "Đã đón": src/shared/tien-do-man.ts:89-91, :126.
- Liên hệ bấm gọi: web/cuoc-chuyen.ts:129-134. Nút đổi thứ tự: :137-153.
- Kết thúc chuyến chỉ khi hết khách: web/cuoc-chuyen.ts:103-104, :115; src/shared/tien-do-man.ts:156-158.
- Kết thúc gián đoạn: web/cuoc-chuyen.ts:105-106, :172-213.
- Mất mạng, "Chưa gửi được", "Bấm lại", không tự gửi: web/cuoc-chuyen.ts:8, :33-35, :55-69, :78, :113; web/tien-do-ui.ts:180.
- Tên khách chỉ trong ngày chạy: src/modules/van-chuyen/tai-xe-dto.ts:1-3, :33-35, :68-70; src/shared/dieu-phoi-kiem.ts:393-395; "Khách N": src/shared/tien-do-man.ts:119-125; changelog.ts:47.

Tài xế — Giấy tờ
- Trang chủ tài xế: web/tai-xe.ts:12-58; public/tai-xe.html ("Cuốc xe của bạn sẽ hiện ở đây", "Xem tất cả").
- Trang Tôi "Giấy tờ của tôi": web/account.ts:92-122; điều kiện hiện: src/shared/giay-to-hien-thi.ts:14-16; nhãn hạn: :44-50.

Tài xế nhà xe đối tác
- Quyền DRIVER_PARTNER mọi ô none trừ góp ý + giấy tờ của mình: src/shared/permissions.ts:68-69, :106-107, :122; homeRedirect → /tai-xe: src/shared/start-page.ts:43, :51; không có Cuốc: web/tai-xe.ts:21-24; changelog.ts 1.37 (từ dòng 54).

Kiểm máy: `node --test src/shared/huong-dan.test.ts` — 8/8 đạt (30/9). A2 đối chiếu mọi [[Tên nút]] với chữ giao diện.
