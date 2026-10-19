# Đề xuất ADR-0135 — Bước Xác nhận đơn cho dịch vụ "cần xác nhận": Gửi / Rút lại / Còn vé – Hết vé, ô quyền `order.confirm.review`

**Trạng thái: đề xuất, chờ chủ duyệt.** AI soạn, không tự duyệt (N3). Số 0135 đã kiểm còn trống ngày 19/10.

- **Ngày:** 2026-10-19. **Lượt duyệt:** 2 (cùng ADR-0136; trang ghép `TRANG-GHEP-LUOT-2.md`). Chỉ trình sau khi lượt 1 (ADR-0133, ADR-0134) đã duyệt — ADR này dựa trên "nháp chỉ người tạo thấy" và "nháp không ghi thu". Mở Đợt 3 của kế hoạch.
- **Loại:** việc lớn (quyền, dữ liệu, tiền). **Cửa:** dữ liệu một chiều mềm (ba bảng chỉ thêm, ở lại); hành vi tắt được bằng cách bỏ mọi cờ "cần xác nhận".
- **Quan hệ với ADR cũ:**
  - **ngoại lệ có tên** của ADR-0019 đ2 ("sai thì 403, không cắt bớt trường"): người xét duyệt nhận chi tiết đơn đang chờ **đã bỏ** SĐT, email, liên hệ người đặt (Đ6);
  - **thay một phần** ADR-0023 đ1 và ADR-0030 S23-1, S23-4: Hướng dẫn viên đọc được đơn **đang chờ** dù chưa phụ trách (Đ6);
  - **ngoại lệ có tên** của ADR-0089 đ8: chọn "Hết vé" thì máy chủ tự gán lý do `HET_CHO` (nhóm Công ty huỷ), không cần ô `order.cancel.classify` (Đ7);
  - **thay một phần** ADR-0022 (Q-C) và ADR-0014 đ12: Đối tác, Thực tập nhận tin xác nhận / huỷ **của đơn mình lập** (Đ10); tên người làm vẫn theo ADR-0131 đ3;
  - **mở rộng** ADR-0134 Đ1, Đ6: thêm nhánh đọc cho người xét duyệt và nhãn tin `xet-duyet`;
  - ADR-0007 / ADR-0009 (`order.modify` gồm xác nhận) **giữ** cho đơn không cần xác nhận; ADR-0049 Đ5 (đặt gấp) **giữ**, áp lúc bấm Còn vé.
- **Xây trên lỗ đang hở:** không, cùng điều kiện TNV-G1 như lượt 1 (trang ghép lượt 2 mục 4).

## Bối cảnh
Chủ dự án 19/10 (đặc tả Phần A mục 1–8; lượt 3; lượt 4 mục 5b.3): chỉ đơn có dịch vụ được Toàn quyền đánh dấu **"cần xác nhận"** mới qua bước này; người lập bấm **"Gửi xác nhận"**; người xác nhận chọn **Xác nhận** hoặc **Huỷ (kèm lý do)**; mọi vai nội bộ xác nhận được (Bán hàng, Kế toán, Quản trị, Toàn quyền, Hướng dẫn viên); người nội bộ tự xác nhận đơn mình theo **một công tắc**; sửa được ngày đi, giờ đón, tình trạng vé, **sửa tiền phải ghi lý do** và chỉ người đang có quyền sửa tiền; người xác nhận **không thấy SĐT/email khách**; Hết vé = huỷ và báo người lập; hạn **15 phút**, **22:00–06:00 không tính**, quá hạn chỉ cảnh báo Trang chủ, không tự huỷ; mốc tối thiểu giữ, áp lúc bấm Xác nhận.

## Quyết định
1. **Đ1 — Cờ theo dịch vụ.** Bảng chỉ thêm `ord_service_confirm_flag` (mã dịch vụ danh mục, bật/tắt, hiệu lực). Chỉ ô `settings.ops` đổi. Đơn có ≥ 1 dịch vụ đang bật cờ (đọc lúc bấm) phải qua bước; còn lại giữ luồng hôm nay.
2. **Đ2 — "Chờ xác nhận" không phải trạng thái mới.** Đơn vẫn `draft`; "chờ" = có một dòng `ord_confirm_request` còn mở. Một dòng mở mỗi đơn (chỉ mục duy nhất có điều kiện); dòng chỉ khép được một lần, không xoá. Kết quả: `XAC_NHAN` | `HUY` | `RUT_LAI`. [người soạn]
3. **Đ3 — Gửi, rút lại, khoá.** Chỉ người lập gửi (đơn nháp, cần xác nhận, đã chọn đón theo ADR-0133 Đ2, chưa có yêu cầu mở) và rút lại. Đang chờ thì người lập không sửa được (409 `confirm_pending_locked`). Đơn cần xác nhận mà bấm "Xác nhận" cũ ⇒ 409 `confirm_request_required`. [người soạn: khoá khi chờ, Rút lại]
4. **Đ4 — Ô quyền mới `order.confirm.review`:** SALES, ACCOUNTING, ADMIN, FIELD, SUPER_ADMIN = `any`; PARTNER, INTERN, DRIVER, DRIVER_PARTNER, HR = `none`. [người soạn: năm vai "không" — chủ không nhắc tới]
5. **Đ5 — Ai quyết định.** Người giữ ô VÀ (không phải người lập, HOẶC người lập là nội bộ — không giữ PARTNER/INTERN — và công tắc tự xác nhận đang bật). Công tắc ở bảng chỉ thêm `ord_confirm_policy`, chỉ `settings.ops` đổi, **mặc định BẬT**. [người soạn: mặc định]
6. **Đ6 — Nới đọc có giới hạn.** Người giữ ô đọc được danh sách chờ và chi tiết đơn **đang chờ** của bất kỳ ai, kể cả HDV chưa phụ trách: dịch vụ, ngày, số khách, giờ đón, tiền (chỉ đọc nếu không có quyền sửa tiền). Máy chủ **không gửi** SĐT, email khách và liên hệ người đặt cho người xét duyệt không phải người lập. Danh sách chờ không có tên khách.
7. **Đ7 — Quyết định.** Còn vé ⇒ một lô: đổi ngày / giờ đón (nếu có) → khép yêu cầu → các câu xác nhận hiện có (mốc tối thiểu, đặt gấp giữ nguyên). Hết vé ⇒ khép → huỷ với `HET_CHO` [người soạn]. Huỷ lý do khác ⇒ danh sách lý do như hộp Huỷ hiện có. Hai người cùng quyết ⇒ đúng một người thắng, người kia 409.
8. **Đ8 — Sửa tiền khi chờ.** Người không phải người lập sửa được tiền khi đơn đang chờ VÀ qua ô `order.money.edit` (hôm nay: Kế toán, Quản trị, Toàn quyền mọi đơn). Tổng đổi mà thiếu lý do (≤ 300 ký tự) ⇒ 400; nhật ký ghi lý do. [người soạn: chọn ô `order.money.edit` — câu 4.5 bản luồng thực tế]
9. **Đ9 — Hạn.** 15 phút làm việc kể từ lúc gửi, bỏ 22:00–06:00 giờ VN. Quá hạn chỉ hiện ở "Việc của bạn" trên Trang chủ của người giữ ô, **cả điện thoại**; không tự huỷ, không nhắc lần hai (5c.4).
10. **Đ10 — Tin.** Lúc gửi: mọi người giữ ô (tin trong Nền tảng, giờ yên lặng giữ nguyên). Lúc xác nhận / huỷ: người lập (kể cả Đối tác, Thực tập) và người bấm. [người soạn: tin lúc gửi — 5b.6]
11. **Đ11 — Ảnh "XÁC NHẬN ĐƠN DỊCH VỤ".** Tự bật sau khi lập chỉ với đơn không cần xác nhận; đơn cần xác nhận chỉ có ảnh sau khi đã xác nhận (5b.4).
12. **Đ12 — Bỏ cờ khi đang chờ.** Yêu cầu đang mở vẫn quyết định được; nháp mới của dịch vụ đó không còn phải gửi.

## Phương án bị bác
- **Thêm giá trị `pending` vào `orders.status`:** phải dựng lại bảng `orders` và trigger (điều `0018` cố tránh), mọi chỗ đọc trạng thái phải sửa.
- **Dùng `order.modify` để xét duyệt:** Kế toán, HDV không có ô này, Bán hàng chỉ đơn mình — trái lời chủ "mọi vai nội bộ".
- **Tự huỷ khi quá hạn:** chủ nói không tự huỷ.
- **Cho người xét duyệt đọc đủ (kể cả SĐT):** chủ nói không thấy SĐT/email.

## Hệ quả
Migration mới (số tạm 0113): ba bảng + trigger. Ô mới ở `MATRIX`, bài ghim hàng DRIVER/DRIVER_PARTNER/HR, `TEN_THAO_TAC`, `tests/e2e/permissions.mjs`. Route mới: gửi, rút lại, quyết định, danh sách chờ, cài đặt cờ / công tắc. Route đổi: `/status`, `PUT /:id`, mọi route đọc của ADR-0134 Đ1. Hành động nhật ký mới (gửi, rút lại, đổi cờ, đổi công tắc). Giao diện: nút Gửi xác nhận / Rút lại / bảng Xác nhận đơn, thẻ chờ trên Trang chủ, trang danh sách chờ.

## Điều chưa chắc — câu hỏi cho chủ
- **Đơn đã có khoản thu từ thời nháp** (trước ngày phát hành lượt 1) mà gửi xác nhận rồi Hết vé ⇒ đơn huỷ còn tiền = TNV-G1. Khuyến nghị: chặn gửi khi đơn đã có khoản thu. Cách làm cần một hàm do gốc lắp ráp tiêm vào, vì `orders` không đọc bảng `bil_` (ADR-0024 đ4); kế hoạch Task 3.3 chưa có điều kiện này.
- **Giá danh mục:** hôm nay Đối tác / Thực tập chỉ tự xác nhận được đơn đúng giá danh mục (`src/modules/orders/index.ts:1416`). Khi người nội bộ bấm Còn vé cho đơn của Đối tác, luật này (đang xét người bấm) không còn chặn. Khuyến nghị: xét theo **người lập**, giữ chặn. [người soạn]
- Dịch vụ nhập tay không có mã nên không gắn cờ được. [người soạn]
- Nếu chủ chọn phương án A cho câu Q1 của ADR-0134 (nháp có chặng dưới mốc cũng phải gửi), Đ1 mở rộng thêm điều kiện đó.
