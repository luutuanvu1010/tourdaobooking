# Trang ghép — Đính kèm tệp trong vé hỗ trợ (CLAUDE.md §9 «Bước ghép khi duyệt»)

> Hồ sơ có ngày (2026-10-28). Áp cho `DE-XUAT-ADR.md` cùng thư mục. Câu kiểm bắt buộc từ bài học F-01: **«bảng này nay chứa ai?»**
> Cột quyền theo thứ tự `PERMISSION_CODES` của `src/shared/permissions.ts`: SALES · ACC · ADMIN · FIELD · PARTNER · SUPER · INTERN · DRIVER · DRV_P · HR.

## 1. Mỗi bảng / kho chứa loại thực thể nào

| Bảng / kho | Hôm nay chứa | Sau đợt này chứa thêm | Ghi chú F-01 |
|---|---|---|---|
| `fbk_ticket`, `fbk_message` | Vé và tin của **mọi tài khoản** (nội bộ + Đối tác + Tài xế đối tác, ADR-0119 đ6); ghi chú nội bộ của nhóm xử lý | Không đổi cột | Tin bên ngoài chỉ nằm ở nhóm Kỹ thuật |
| `fbk_attachment` (mới) | — | Tệp của tin: ảnh chụp màn hình, ảnh chụp, PDF. **Có thể** chứa dữ liệu cá nhân của khách (tên, SĐT trên màn hình) hoặc, nếu người dùng gửi nhầm, ảnh giấy tờ (N3) | Tệp thuộc **một** tin, không đổi tin; ai đọc được tin thì xem được tệp. Câu nhắc trên giao diện «Đừng gửi ảnh căn cước, bằng lái» chỉ là lời khuyên |
| Kho R2 `tourdao-sales-ho-tro` (mới) | — | Nội dung tệp của `fbk_attachment` | Chỉ `feedback` chạm. Không chứa gì của hồ sơ |
| Kho R2 `tourdao-sales-ho-so` | Ảnh giấy tờ hồ sơ, bản ngoài D1 của phiếu xoá | **Không đổi** | Hàng rào (1) vẫn chỉ cho `parties` |

## 2. Dòng bản đồ quyền chạm các bảng này → áp cho loại nào

Không thêm ô nào vào `MATRIX`. Quyền đi qua hai ô có sẵn và hàm `quyenPhieu` (ADR-0119 đ2):

| Thao tác | SALES | ACC | ADMIN | FIELD | PARTNER | SUPER | INTERN | DRIVER | DRV_P | HR | Áp cho | Ghi chú |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `feedback.submit` (đã có) — gửi vé **kèm tệp** | any | any | any | any | any → **? (câu 1)** | any | any | any | any → **? (câu 1)** | any | vé mình gửi | Khuyến nghị: tài khoản có mã quyền bên ngoài **không** gửi tệp (máy chủ chặn bằng `isExternalPermission`, như `choPhepNhomGui`) — ô `feedback.submit` không đổi |
| Trả lời kèm tệp | theo `quyenPhieu.doc` | | | | **? (câu 1)** | | | | **? (câu 1)** | | vé đọc được | Ghi chú nội bộ kèm tệp: chỉ khi `quyenPhieu.xuLy` (như ghi chú chữ) |
| Xem tệp (`GET …/tep/:tid`, mới) | theo `quyenPhieu.doc` + bộ lọc `noiBo` của tin chứa tệp | | | | own | any (Toàn quyền) | | | own | | tệp của tin đọc được | Không thêm đường tắt cho Quản trị/Nhân sự (giữ ADR-0119 đ4) |
| Xem / chạy lại hàng «tải dở dang», «chờ xoá» (mới) | none | none | none | none | none | any | none | none | none | none | mọi dòng `fbk_attachment` | chỉ trạng thái và mã, không nội dung; như `GET /api/parties/tep-cho-xoa` |

## 3. Cổng nào canh cửa nào

| Cửa | Cổng router | Kiểm trong thân route | Giao diện ẩn / hiện |
|---|---|---|---|
| `POST /api/feedback` (thêm `tep`) | `staff` | `can(feedback.submit)` → (câu 1) → chặn `Content-Length` → kiểm từng tệp → lô D1 | Nút «Đính kèm» ở hộp Gửi yêu cầu: hiện theo câu 1 (hỏi `isExternalPermission` qua hàm thuần dùng chung, không hỏi mã quyền trần) |
| `POST /api/feedback/:id/messages` (thêm `tep`) | `staff` | `quyenPhieu.doc` (404) → ghi chú nội bộ cần `xuLy` (403) → (câu 1) → kiểm tệp → lô D1 | Nút «Đính kèm» ở ô trả lời |
| `GET /api/feedback/:id/tep/:tid` (mới) | `staff` | `sec-fetch-site` → kho có binding (503) → `quyenPhieu.doc` → tin chứa tệp qua bộ lọc `noiBo` → tệp đã lưu, chưa quyết xoá → **nhật ký** → đọc kho | Ảnh xem trước / nút «Tải về» chỉ vẽ cho tệp có trong DTO tin (DTO đã lọc theo quyền) |
| `GET /api/feedback/tep-cho-xoa`, `POST …/chay-lai` (mới) | `staff` | `can(feedback.triage)` (chỉ Toàn quyền) | Chưa có màn; gọi bằng API như route cùng loại của `parties` |
| Đổi nghĩa chỗ giao diện ẩn/hiện có sẵn | — | — | Không: luồng tin chỉ thêm khối tệp dưới bong bóng, không đổi điều kiện hiện tin hay ghi chú nội bộ |

**Ba cách hỏng cần bài chạy đường thật** (bài học 24/9): (1) thành viên nhóm khác mở tệp của vé không thuộc nhóm mình; (2) người gửi mở tệp trong ghi chú nội bộ của chính vé mình; (3) sau khi chuyển nhóm, nhóm mới mở tệp trong ghi chú của nhóm cũ. Cả ba phải 404.
