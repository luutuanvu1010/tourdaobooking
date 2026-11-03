# Sổ thi công — chính sách chiết khấu bốn trục

Kế hoạch: `2026-11-03-chinh-sach-chiet-khau-bon-truc.md`. Quyết định: ADR-0161. Thêm việc vào bảng phải hỏi chủ; phát hiện không chặn phát hành ghi vào mục Nợ.

## Bảng việc

| Việc | Xong khi | Trạng thái |
|---|---|---|
| Task 1 Giới hạn nhập | Bài route và bài thuần xanh | xong 3/11, chờ người kiểm độc lập |
| Task 2 Chặn vượt giá, rào quét | Xanh, đã thấy rào chặn thật | xong 3/11, chờ người kiểm độc lập |
| Task 3 Trần không tính dòng vượt | Xanh, sổ vàng chờ xác nhận | chưa |
| Task 4 Màn đơn | Xanh | chưa |
| Task 5 Luật thuần bảng nhập | Xanh | chưa |
| Task 6 Bảng nhập và hộp | Thử Chrome ba ô liên tiếp đạt | chưa |
| Task 7 Bỏ lối vai trò, chữ | Xanh | chưa |
| Task 8 Trang giới hạn | Xanh | chưa |
| Task 9 Tài liệu, bộ kiểm dài | Mọi bộ xanh, có ảnh ba khổ | chưa |
| Người kiểm độc lập | Không còn lỗi Cao, Trung | chưa |

## Bằng chứng quan sát chặn thật

- **Task 1, 3/11 (giới hạn nhập chặn thật ở máy chủ):** tạm bỏ lời gọi `kiemSoMucMoi` ở route `POST /api/pricing/hoa-hong/:id/doi` ⇒ `node --test src/modules/pricing/gioi-han-nhap.test.ts` đỏ hai bài (ca «51% và 123.456 đ trả 400…» và ca «hạ trần dưới dòng đã có…»: Đổi sang 51% hay 123.456 đ không còn bị từ chối, thân phản hồi không có `error`). Hoàn nguyên lời gọi ⇒ 10/10 xanh. Dòng cho `docs/SO-HANG-RAO.md` ở Task 9: «giới hạn nhập mức hoa hồng», cơ chế `kiemSoMucMoi` + bài `gioi-han-nhap.test.ts`, quan sát 2026-11-03.
- **Task 2, 3/11 (rào quét mọi đường ghi mức chặn thật):** tạm bỏ lời gọi `kiemSoMucMoi` ở route `POST /api/pricing/hoa-hong/:id/doi` ⇒ `node --test src/modules/pricing/ghi-muc-qua-cong.test.ts` đỏ với câu «index.ts: route POST /api/pricing/hoa-hong/:id/doi gọi câu ghi mức mà không gọi kiemSoMucMoi(». Hoàn nguyên ⇒ xanh (2/2; bài thứ hai là bài tự thử khuôn quét: khúc thiếu cổng, hàm trợ giúp thiếu cổng, chú thích và định nghĩa hàm không đánh lừa được). Dòng cho `docs/SO-HANG-RAO.md` ở Task 9: «mọi route ghi mức của pricing gọi cổng kiemSoMucMoi», cơ chế bài quét `ghi-muc-qua-cong.test.ts`, quan sát 2026-11-03.
- **Task 2, 3/11 (cổng vượt giá bán chặn thật, trước khi viết mã):** thêm bài vào `gioi-han-nhap.test.ts` rồi chạy trước khi sửa `kiemSoMucMoi` ⇒ đỏ 4/22 (bài 500.000 đ cho vé 300.000 đ, bài «Mọi khách như nhau»/«Riêng từng loại», bài dịch vụ tính theo lượt, bài giá giảm sau đó); sau khi thêm vế `mucVuotGiaBan` ⇒ 22/22 xanh.

## Giả định đã tự chọn

- **Task 1 — thứ tự kiểm của `POST /api/pricing/gioi-han-nhap`:** thân sai ⇒ 400; `tuLuc` khác mốc dòng mới nhất ⇒ 409 `stale`; rồi mới xét «số giống số đang hiệu lực ⇒ 200, không ghi». Hộp gửi `tuLuc` cũ kèm số đang hiệu lực vẫn nhận 409 (an toàn hơn: buộc tải lại).
- **Task 1 — bảng giới hạn rỗng (không xảy ra sau migration 0137):** route đọc và cổng `kiemSoMucMoi` trả 503 `chua_co_gioi_han` (đóng kín, không đoán con số).
- **Task 1 — nhật ký:** `prc_entry_limit_changed` ghi `target_type = 'ledger'`, không `target_id`; `detail` «trần 50% → 60% · bước 1.000đ → 1.000đ». Xếp vào hai danh sách ẨN của lịch sử đơn (`lich-su-doi-tac.ts`, `lich-su-noi-bo.ts`) như mọi `prc_*`: loại dòng mới mặc định ẩn, Toàn quyền đọc ở trang Nhật ký (typecheck bắt buộc phải xếp loại).
- **Task 1 — trigger bảng giới hạn:** tên lỗi `prc_policy_append_only` (không dùng `prc_append_only` vì `loiBang` đã đổi chữ này thành «dòng vừa được người khác ngừng»).
- **Task 2 — dịch vụ nào bị bỏ qua khi so vượt giá:** `kiemSoMucMoi` chỉ so khi dịch vụ còn `visible` (còn trong Sheet và không bị ẩn). Dịch vụ đã rời Sheet hoặc bị ẩn: bỏ qua, nhập được (không còn giá bán hiện hành). `EffectiveService` không tách «rời Sheet» khỏi «bị ẩn», nên bị ẩn cũng bỏ qua — chấp nhận, vì dịch vụ ẩn không bán. Dịch vụ không còn trong danh mục: bỏ qua. Bài `dịch vụ tính theo lượt…` gieo số CAO hơn giá lưu (500.000 đ so 300.000 đ) để phân biệt được hai luật.
- **Task 2 — phạm vi và loại bị so:** Đổi và Sửa lấy phạm vi và mã dịch vụ từ DÒNG CŨ (`row`), không từ thân. Chỉ phạm vi một dịch vụ và kiểu số tiền được so; phần trăm, nhóm, tất cả bỏ qua. Dịch vụ tính theo lượt chỉ so số người lớn với giá mỗi lượt, bỏ qua số theo loại.
- **Task 1 — `noiGioiHanNhap(w)`** (khung thử) chèn dòng mới với mốc = mốc lớn nhất hiện có + 1 ms, nên vẫn là dòng mới nhất khi bài mock đồng hồ về quá khứ. `bien-nhan.test.ts` nhận thêm tuỳ chọn `noiGioiHan` ở hàm `dung` (chỉ bài «Task 8 số lạ» bật).

## Nợ

- **Task 1 → Task 9, kịch bản e2e (không chạy giữa chừng, cần mạng):** mọi tỷ lệ trong `tests/e2e/{muc-ta,loai-doi-tac,so-dai-ly,so-dai-ly-dot-2,sua-muc,nhap-tay-va-gia-doi-tac}.mjs` ≤ 20% và mọi số tiền chia hết 1.000 nên không chạm giới hạn gieo. Hai dòng cần xem giá khi Task 2 chặn vượt giá đã kiểm bằng cách đọc kịch bản: `so-dai-ly-dot-2.mjs:110` (dịch vụ `ZSD2I`, giá 300.000 đ, mức 50.000 đ/khách) và `sua-muc.mjs:52` (dịch vụ `ZE1`, giá 100.000 đ người lớn và 50.000 đ trẻ em, mức 50.000 đ/khách «mọi khách») — đều trong giá, chưa chạy e2e thật.
