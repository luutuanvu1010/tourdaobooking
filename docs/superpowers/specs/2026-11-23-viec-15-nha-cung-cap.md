# Việc 15 — tên «Nhà cung cấp» và hai chặn an toàn (đặc tả ngắn)

> **Ngày:** 2026-11-23. **Nguồn việc:** mục 6 của `docs/superpowers/plans/2026-11-21-ke-hoach-16-viec.md`; chủ dự án chọn tên 23/11, nguyên văn «chọn tên Nhà cung cấp». **Vai:** thi công (phiên con của điều phối). **Trạng thái:** đã thi công trên nhánh, chờ người kiểm độc lập. Không có migration.

## Phần A — tên (bề mặt)

Mọi chữ người dùng thấy «Người bán dịch vụ» / «Người bán» (bên cung ứng dịch vụ cho công ty) đổi thành «Nhà cung cấp». Máy chặn chữ cũ quay lại: dòng mới trong bảng từ giao diện (`src/shared/bang-tu-giao-dien.ts`, mẫu `[Nn]gười bán(?! hàng)`, «người bán hàng» là nghĩa khác). Bảng tham chiếu chốt mục «Nhà cung cấp», ghi rõ khác ô «Vé do ai phát» (ô đó chỉ nói ai phát vé, không nói ai cung cấp dịch vụ, không đổi tiền). Bảng, cột, đường gọi máy và đường dẫn `/nguoi-ban` giữ nguyên.

## Phần B — hai chặn (chạm tiền, dữ liệu)

**B1. Không ngừng được dòng «Mọi dịch vụ» khi không có dòng thay.** Hôm nay ngừng dòng này thì mọi dịch vụ chưa có điều khoản riêng thành «thiếu nhà cung cấp», đơn mới bị giữ ở bước «Khách đã trả đủ»; chỉ có hộp hỏi lại. Luật trùng khoảng ngày (`prc_supply_term_overlap`) không cho thêm dòng thay khi dòng cũ còn mở, nên «ngừng rồi thêm» luôn để lại một khe. Cách làm:
- Dòng «Mọi dịch vụ» của **công ty chủ hiện tại**: máy chủ trả 409 kèm câu tiếng Việt; trang không hiện nút ngừng, hiện một câu giải thích.
- Dòng «Mọi dịch vụ» của **công ty chủ cũ** (sau khi đổi công ty chủ): ngừng được, và **cùng một lô ghi** máy mở dòng «Mọi dịch vụ» mới cho công ty chủ hiện tại từ ngày hôm sau ngày kết thúc. Không có khe. Đây chính là bước «đóng dòng cũ, mở dòng mới» mà đặc tả sổ đại lý đợt 1 §13 và bẫy 64 của `docs/CHANGE-GUIDE.md` yêu cầu, nay thành một lần bấm.

**B2. Đổi công ty chủ không biến công ty cũ thành nhà cung cấp.** Đã tái hiện bằng bài `src/doi-cong-ty-chu-nha-cung-cap.test.ts` (route thật, khung thử): đổi công ty chủ mà chưa ai đụng dòng «Mọi dịch vụ», thì biên nhận của **cả đơn đã xác nhận trước khi đổi** tách thành phần «thanh toán tại quầy Công ty TNHH Tour Đảo» (công ty cũ). Trần «thu cho» quầy nhà cung cấp (`nhaCungCapCuaDon`) dùng cùng hàm chia nên cũng vậy (suy từ mã, không có bài riêng). Bước «đóng dòng cũ, mở dòng mới» không sửa được đơn cũ vì bản chụp không sửa được.

Gốc: biên nhận và trần thu tại quầy chia phần bằng «người bán ≠ công ty chủ **hôm nay**» (`nguoiBanCuaDong`), trong khi sổ giá vốn chia bằng «dòng có nhà cung cấp mua lại» (`supplierPartyId`). ADR-0078 có bất biến «có nhà cung cấp + tỷ lệ ⇔ người bán ≠ công ty chủ», kiểm lúc ghi điều khoản và lúc ghi tay. Vậy bản chụp đã tự mang câu trả lời: `supplierPartyId` rỗng = phần của chính công ty. Sửa: `nguoiBanCuaDong` đọc `supplierPartyId`; nhãn «Tour Đảo» trên trang Nhà cung cấp và khối Phần đối tác cũng theo đó. Không đổi dữ liệu, không đổi luật đã duyệt: đây là mã lệch bất biến của ADR-0078, sửa mã.

## Xong khi

1. Không còn chữ «Người bán» theo nghĩa này trên giao diện; bài bảng từ và bài bảng tham chiếu xanh.
2. Kế toán bấm ngừng dòng «Mọi dịch vụ» của công ty chủ hiện tại ⇒ 409 «Không ngừng được dòng «Mọi dịch vụ»…», dòng vẫn mở, không có nhật ký. Bài khung thử đỏ trước, xanh sau; kịch bản e2e (`tests/e2e/so-dai-ly.mjs`) kiểm 409 và dòng còn mở.
3. Đổi công ty chủ rồi ngừng dòng gieo cũ đến ngày D ⇒ 200, có dòng «Mọi dịch vụ» mới của công ty chủ mới từ D+1, đơn xác nhận sau đó không thiếu nhà cung cấp. Bài khung thử.
4. Bài tái hiện B2 đỏ trước, xanh sau. **Không có e2e cho B2**: e2e chung không được đổi công ty chủ (N17).
5. Typecheck 0 lỗi; bộ kiểm liên quan xanh; người kiểm độc lập (tiền, dữ liệu) và người chấm giao diện (chữ).

## Giả định (AI tự quyết, bác được)

- Tên trang và mục menu là «Nhà cung cấp» (không thêm «dịch vụ»). Dòng điều khoản do chính Tour Đảo cung cấp vẫn hiện «Tour Đảo» ở cột Nhà cung cấp.
- Không làm nút «thay dòng Mọi dịch vụ» cho công ty chủ hiện tại: dòng đó không có lý do nào để ngừng (dòng «Mọi dịch vụ» chỉ dành cho công ty chủ — trigger `prc_supply_term_all_owner`); muốn đổi cho một nhóm hay dịch vụ thì thêm điều khoản riêng, điều khoản cụ thể thắng.
- Chặn B1 ở máy chủ (route), không thêm trigger CSDL — tránh migration trong đợt nhỏ; ghi ở sổ hàng rào.
- Không làm trong đợt này (ghi `docs/BACKLOG.md`): gộp hai cột người bán / nhà cung cấp trùng giá trị; chuyển mục sang nhóm Tiền trên menu.
