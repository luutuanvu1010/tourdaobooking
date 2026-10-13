# Biên bản nghiệm thu bản 1.89 (2026-10-13)

> Hồ sơ có ngày, viết xong là đóng băng; không sửa lại cho khớp hiện trạng. Có gì mới thì viết bản mới và trỏ về đây. Nguồn của các lỗi được vá: hồ sơ kiểm toán `docs/superpowers/specs/2026-10-12-kiem-toan-toan-nen-tang/README.md` (K-B-1, K-A-1, K-A-3).

## 1. Phạm vi

Bản 1.89 vá ba chỗ hở tiền do kiểm toán 12/10 tìm ra. Không migration, không đổi dữ liệu.
- **K-B-1 — luật giá Thực tập (ADR-0100).** Tài khoản có quyền Thực tập, kể cả kèm Bán hàng, Quản trị hay HDV, chỉ lập, sửa nháp và xác nhận được đơn theo giá danh mục, không giảm giá. Trước đó Thực tập lập đơn giá thấp, giảm giá rồi tự xác nhận được, trong khi Đối tác cùng việc bị từ chối. Form lập đơn khoá ô đơn giá và ô giảm giá cho Thực tập.
- **K-A-1 — hàng rào ranh giới SQL.** Hai tệp truy vấn tiền của `billing` (17 câu) vào danh sách module nghiêm; thêm bài bắt buộc mọi tệp có `defineSql` phải được khai, nhãn module đúng thư mục, ở cấp đầu tệp, không nhập kèm bí danh.
- **K-A-3 — hàng rào một công thức hoa hồng / giá vốn.** Bài `src/hoa-hong-mot-nguon.test.ts` chỉ cho phép công thức phần vạn ở `src/shared/hoa-hong-dong.ts`.
- Kèm theo: ghi sổ hàng rào, sửa tài liệu mô tả, nhật ký thay đổi 1.89, một dòng Trợ giúp cho Thực tập.

Mã: commit `e089ce2c` (vá), `3bfd837d` (siết sau nghiệm thu), `e57679a9` (ghi sổ); gộp vào bản chính ở `f5dce05c` sau khi ghép với gói Vận chuyển A+C (1.88).

## 2. Kết quả kiểm trên production (lệnh chỉ đọc, 2026-10-13)

- Production báo phiên bản **1.89**; cổng `kiem-phien-ban.mjs --sau-deploy` ĐẠT.
- `wrangler d1 migrations list --remote`: không còn migration nào chưa áp.
- `audit-invariants.mjs --db remote`: mọi bất biến đạt, 4 cảnh báo có từ trước, không chặn phát hành và không do bản này gây ra: 22 lần thu chưa rõ người thu (việc của Kế toán), 7 xe thiếu giấy tờ xuất bến, 3 dịch vụ chưa phân nhóm, 42 đơn xác nhận trước sổ đại lý chờ chụp bù ở đợt 2.
- Production đang ở chế độ bảo trì (cài đặt của chủ) đến khoảng 20:10 giờ Việt Nam ngày 13/10.

## 3. Đã kiểm trước phát hành

- Người kiểm độc lập (chỉ đọc) xem hai vòng. Vòng 1: đạt sau khi sửa (4 mục Important: ghi sổ, mục miễn hàng rào giao diện, hai khe của hai hàng rào mới). Vòng 2: đạt. Họ không tìm thấy đường nào để Thực tập lách luật giá và tự phá thử 64 chỗ trên bản sao; bài kiểm đỏ đúng chỗ.
- `npm run typecheck` 0 lỗi; `npm test` 4443 bài đạt, 0 đỏ, 10 bài chờ (có từ trước), bài đo giờ xanh, trên đúng mã đã gộp.
- Bộ kiểm API đầy đủ 54/54 (ở bản `e089ce2c`); kịch bản trình duyệt có kiểm màu xanh (ở bản `3bfd837d`), kể cả các bước mới chứng minh ô giá và ô giảm giá của Thực tập bị khoá.

## 4. Chưa kiểm và tồn đọng

- **Chưa kiểm:** luật giá Thực tập với tài khoản thật trên production (cần đăng nhập, bảo trì đang bật); bộ kiểm API đầy đủ trên bản ghép cuối; phần ghép hai tài liệu mô tả sau khi ghép main chưa có người kiểm độc lập đọc lại (sai ở đó chỉ là chữ).
- **Hệ quả cần chủ biết:** Thực tập kèm Quản trị bị 403 khi xác nhận hoặc sửa nháp có giá thoả thuận / giảm giá do người khác lập; Thực tập kèm Bán hàng thấy nút nhập tay (khi công tắc bật) nhưng lưu luôn bị từ chối.
- **Nợ nhỏ:** `docs/BACKLOG.md` mục 28 (mã `BL-VA-…`), gồm lỗi tìm kiếm đơn trả 500 khi chữ tìm dài quá khoảng 50 byte.
- **Chờ chủ duyệt:** mục miễn có tên `holdsIntern` ở `src/giao-dien-hoi-bang-quyen.test.ts` — một lần nới hàng rào (Hiến pháp 9.4), khuyến nghị giữ. Câu «cùng khuôn holdsPartner» trong commit `e089ce2c` là sai, đã đính chính ở commit `3bfd837d`.
- **Còn mở từ hồ sơ kiểm toán:** sổ vàng 25 ca (K-A-2), điều kiện trước đợt 2, mốc 31/10 (5 mục HIGH hết hạn).

## 5. Cách kiểm trên production

Chỉ số điện thoại trong danh sách cho phép đăng nhập được khi bảo trì bật; nên kiểm sau 20:10 hoặc bằng tài khoản của chủ.
1. Mở trang đăng nhập hoặc Trợ giúp: thấy «Phiên bản 1.89».
2. Đăng nhập tài khoản **Thực tập**, mở Tạo đơn, chọn một dịch vụ: ô đơn giá và ô giảm giá **chỉ đọc**, có dòng «Tài khoản Thực tập không được giảm giá.»
3. Lập đơn nháp theo giá danh mục và lưu được; xác nhận được thì xác nhận; xong huỷ đơn thử.
4. Đăng nhập tài khoản **Bán hàng**: ô giá và ô giảm giá vẫn sửa được như trước.
5. Trợ giúp của Thực tập có dòng «Chỉ giá danh mục, không giảm giá».
Nếu bước 2 hoặc 3 sai, báo ngay; máy chủ vẫn chặn đơn lệch giá dù giao diện hiện sai.

## 6. Kết luận

**Đạt phần triển khai** (phiên bản, migration, dữ liệu). Phần hành vi luật giá Thực tập trên production **chờ chủ kiểm theo mục 5**; kết quả ghi bằng biên bản mới trỏ về đây.
