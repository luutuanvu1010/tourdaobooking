# ADR-0148 — Nút «Sửa» mức hoa hồng (huỷ dòng sai + thêm dòng đúng), cách tính «Giá đại lý», mức tiền khoá theo giá bán lẻ ghi kèm

- **Trạng thái:** **accepted** 2026-10-29 — chủ dự án trong chat.
  - Phiên soạn hỏi (ô câu hỏi cuối lượt) «Bạn duyệt ba quyết định trong đề xuất nút «Sửa» và giá đại lý chứ?». Chủ trả lời, nguyên văn: *«Duyệt cả ba»*.
  - Ba điều chạm dữ liệu hoặc tiền (Đ1, Đ2, Đ3), đúng trần 3 (`CLAUDE.md` §9). Trang ghép nằm trong đề xuất (mục «Trang ghép»).
  - Ngay trước câu duyệt, tin nhắn cuối của người soạn đã nêu ba chỗ người soạn tự chọn: sửa cả bốn ô tích cùng lỗi (việc khác, đã lưu `14fb15f7`); bỏ id thừa ở trang Đơn hàng thay vì nới trần dung lượng (`0aed466d`); «giá bán lẻ» ở Đ2 là **giá danh mục lúc lập đơn**, không phải giá thoả thuận. Chủ không nói riêng về các chỗ này; người chép ghi chúng là duyệt cùng.
  - AI soạn và chép, không tự duyệt (Hiến pháp N3). Người kiểm độc lập chỉ đọc đã soát sự thật bản nguồn một vòng ngày 29/10 (ĐẠT CÓ ĐIỀU KIỆN; sáu điều kiện đã sửa vào bản nguồn trước khi trình).
- **Số và nguồn:** ADR này là đề xuất `docs/superpowers/specs/2026-10-29-sua-muc-va-gia-dai-ly/DE-XUAT.md` (29/10, commit `24b77820`, hồ sơ có ngày, không sửa). Số 0148 kiểm còn trống ngày 29/10 (`main` lớn nhất 0147; không nhánh chưa gộp nào giữ 0148).
  - **Phần đầu** do người chép viết theo khuôn ADR-0147. **Từ «Bối cảnh» trở xuống** giữ từng chữ của bản nguồn, trừ tiêu đề mục; chữ người chép thêm đánh dấu **[chép 29/10]**.
- **Ngày:** 2026-10-29.
- **Loại:** việc lớn (dữ liệu, tiền). **Cửa:** dữ liệu một chiều mềm (thêm cột, thay trigger, chỉ thêm dòng); hành vi tắt được bằng cách không dùng nút / cách tính mới.
- **Quan hệ với ADR cũ:** **sửa câu** ADR-0077 điều 4 và ADR-0117 (bảng «Sửa câu» dưới); **giữ** ADR-0077 điều 8 (mốc chụp = lúc xác nhận), ADR-0133 (tách theo loại khách), ADR-0024 đ5 (đọc xuyên module chỉ qua view công bố; `pricing` không phụ thuộc `orders`). Không đụng ADR-0146 (`prc_sales_block`) và ADR-0147 (phí đón), dù cùng module `pricing`. [chép 29/10]
- **Xây trên lỗ đang hở:** không (`docs/quyen-hoan.json` 29/10 không có mục nào chạm phần giá / hoa hồng). [chép 29/10]
- **Phát hành:** hai lượt; lượt 1 = Đ1, lượt 2 = Đ2 + Đ3 sau khi Kế toán xác nhận ca mẫu. Số migration lấy lúc thi công. [chép 29/10]

## Bối cảnh

### Lời chủ (29/10, chat)
«…phải có nút Sửa để sửa các mức đã áp dụng… ví dụ chính sách giá từ ngày 1 tháng 1 năm 2027 đến ngày 1 tháng 1 năm 2028, giá đại lý cấp 1 (TA1) dành cho vé Vinwonders tiêu chuẩn là 950,000đ cho người lớn và 750,000đ cho trẻ em và 700,000đ cho người cao tuổi. Thì phải có chỗ để sửa mức này vì… có thể do nhập sai, hoặc chính sách thay đổi về mức chiết khấu và/hoặc khoảng thời gian áp dụng.»
Hộp hỏi cùng ngày: (1) «Chỉ sửa từ hôm nay» cho mức đã có đơn; (2) cách nhập giá đại lý «Gộp vào cùng đợt»; (3) chủ gõ: «giá bán lẻ, các cấp giá đại lý và mức hoa hồng luôn đi cùng nhau».

### Hiện trạng (đọc mã trên `main` a675d917)
- Bảng mức `prc_commission_rule` chỉ thêm (ADR-0077 điều 4; trigger ở `migrations/0097_dung_lai_muc_hoa_hong.sql`): không sửa số, chỉ đóng **một lần** dòng chưa có ngày kết thúc. Gắn loại ↔ chính sách (`prc_role_tier`) và gắn đối tác ↔ chính sách (`prc_party_tier`) cùng khoá đó.
- Ví dụ của chủ, nếu nhập sai, là **kẹt** (người kiểm đã thử trên CSDL tạm): giao diện không hiện nút; «Đổi» từ chối mức chưa tới ngày và mức đã có ngày kết thúc; «Ngừng» không đóng được dòng đã có ngày kết thúc (máy báo «vừa được đóng — tải lại», câu dễ hiểu lầm); thêm dòng đúng cùng khoảng ngày bị chặn vì chồng ngày. Có hai đường vòng qua mức riêng của loại hoặc chính sách mới, nhưng dòng sai vẫn nằm đó và đường vòng đè rộng hơn mong muốn.
- Cách tính chỉ có «Phần trăm» và «Số tiền mỗi khách» — cả hai là **tiền hoa hồng**. «Giá đại lý» chỉ là số suy ra = thành tiền − hoa hồng (`src/shared/hoa-hong-dong.ts`).
- Giá bán lẻ (`catalog_item`) chỉ giữ **một** giá hiện hành, kéo từ Google Sheet, Quản trị ghi đè được; không có lịch sử theo ngày.
- Bảng giá 29/10: «Vé Vinwonders NT: tiêu chuẩn» (VTC) bán lẻ 1.050.000 / 800.000 / 800.000 đ. Ví dụ của chủ là **giá đại lý**; hoa hồng tương ứng 100.000 / 50.000 / 100.000 đ.
- «Ghi mức tay» cho một đơn: chỉ trước bước «Đã giao», và chỉ một con số (% hoặc đ/khách), **không** tách người lớn / trẻ em / người cao tuổi.

## Quyết định

### Đ1 — Nút «Sửa» (Hiến chương 5.5: sai thì ghi dòng mới, không ghi đè số cũ)
1. Áp cho ba loại dòng có ngày ở trang Hoa hồng: **mức**, **gắn loại ↔ chính sách**, **gắn đối tác ↔ chính sách**.
2. **Dòng chưa có đơn nào chụp** (kể cả dòng chưa tới ngày): sửa được hết — cách tính, số tiền từng loại khách, ngày bắt đầu, ngày kết thúc. Một lần bấm: dòng cũ đánh dấu «đã huỷ, thay bằng dòng mới» (không bao giờ áp, không tính chồng ngày, không hiện ở tra mức), dòng mới được thêm. Lịch sử giữ cả hai.
3. **Dòng đã có đơn chụp:** phần sửa áp **từ hôm nay** — dòng cũ đóng hết hôm qua, dòng mới mở từ hôm nay; dòng bắt đầu hôm nay thì áp **từ ngày mai** (như «Đổi»). Làm được **kể cả khi dòng cũ đã có ngày kết thúc**; rút ngắn ngày kết thúc chưa qua cũng làm được. Đơn đã xác nhận giữ mức cũ (Hiến chương 5.6). Đơn cũ bị sai thì chỉ cứu được bằng «Ghi mức tay» trong giới hạn nêu ở Hiện trạng — đơn đã giao hoặc mức tách loại khách thì **không** dựng lại được (nợ có tên, không thuộc đợt này).
4. Bắt buộc ghi lý do; một dòng nhật ký. Người được sửa: như Thêm / Đổi (Kế toán, Quản trị, Toàn quyền), không gồm tài khoản mang quyền Đối tác — không thêm quyền.
5. Dữ liệu: migration mới, **chỉ thêm cột** đánh dấu huỷ và **thay trigger** «chỉ đóng» / chồng ngày; view `v_prc_commission_rule` loại dòng đã huỷ. Biết «đã có đơn chụp» **không** bằng trigger của `pricing` (phần giá không được phụ thuộc phần đơn — `src/architecture.test.ts`, sẽ thành vòng). Hướng chốt ở kế hoạch: gốc lắp ráp tiêm hàm hỏi «dòng này đã được chụp chưa» cho route Sửa (khuôn `ctx.isAssigned`); trigger phía `orders` chặn bản chụp mới trỏ vào dòng đã huỷ; thêm một bất biến vào `audit-invariants`.

### Đ2 — Cách tính thứ ba «Giá đại lý» (chủ chọn gộp cùng đợt)
1. Chỉ cho phạm vi **một dịch vụ**. Nhập theo loại khách: người lớn / trẻ em / người cao tuổi, như 950.000 / 750.000 / 700.000.
2. Lúc xác nhận đơn: hoa hồng mỗi khách = **giá danh mục chụp ở dòng đơn lúc lập** (không phải giá thoả thuận đã giảm — người soạn chọn, chủ sửa nếu khác) − giá đại lý; chụp **cả hai** con số vào đơn.
3. Giá đại lý cao hơn giá bán lẻ ⇒ không tự tính, dòng vào «thiếu mức» chờ Kế toán. Hoa hồng không bao giờ âm.
4. Luật tiền mới ⇒ phải có bộ ca mẫu Kế toán xác nhận trước khi bật (Hiến chương 5.17).

### Đ3 — «Giá bán lẻ, giá đại lý, hoa hồng luôn đi cùng nhau» (người soạn hiểu câu của chủ như sau — chủ xác nhận hoặc sửa)
1. Mỗi mức tính bằng tiền cho **một dịch vụ** (số tiền mỗi khách hoặc giá đại lý) ghi kèm **giá bán lẻ lúc đặt mức**.
2. Lúc xác nhận đơn, nếu giá danh mục của dòng đơn khác giá đã ghi kèm: máy **không** tự tính tiếp. Dòng vào «thiếu mức» với lý do mới «giá bán lẻ đã đổi» (Hiến chương 5.7); trang Hoa hồng báo «Giá bán lẻ đã đổi từ … thành … — sửa mức».
3. Mức phần trăm, và mức cho nhóm / mọi dịch vụ, không ghi kèm giá (không có một giá bán lẻ duy nhất để so).
4. Phương án không chọn: lưu lịch sử giá bán lẻ theo ngày ngay trong Nền tảng thay cho Sheet — chạm danh mục, đồng bộ Sheet và form lập đơn.

## Điều chủ cần biết
- Ngày hiệu lực của mức tính theo **ngày xác nhận đơn**, không theo ngày khách đi (ADR-0077 điều 8). Nếu hợp đồng Vinwonders «từ 1/1/2027» tính theo ngày dùng vé, thì đơn xác nhận trước 1/1 cho chuyến sau 1/1 vẫn lấy mức cũ. Muốn đổi mốc là một quyết định riêng.
- Trong lúc chờ: **đừng gõ 950.000 vào ô «Số tiền mỗi khách»** — ô đó là tiền hoa hồng. Với vé tiêu chuẩn, gõ 100.000 / 50.000 / 100.000. Và chưa nên nhập mức cho năm 2027 tới khi có nút Sửa.

## Phát hành dự kiến và chi phí
- **Lượt 1 = Đ1:** chỉ thêm cột + thay trigger; không cần ca mẫu tiền.
- **Lượt 2 = Đ2 + Đ3:** nặng hơn — hai bảng tiền đang liệt kê giá trị cố định (`prc_commission_rule.kind`, `ord_service_terms.commission_kind` và `missing_reason`), nên phải **dựng lại cả hai bảng** theo khuôn migration 0097; cần ca mẫu Kế toán xác nhận trước khi bật.
- Số migration lấy lúc thi công (29/10: `0125` đang ở một nhánh khác).

## Sửa câu của quyết định đã duyệt (Hiến chương 5.6)
| Nguồn | Câu hôm nay | Câu mới |
|---|---|---|
| ADR-0077 điều 4 | trigger chặn `DELETE` và mọi `UPDATE` trừ **đóng hiệu lực**; đổi mức = đóng dòng cũ + mở dòng mới | thêm hai việc được làm: **huỷ** dòng chưa có bản chụp (Đ1.2), **rút ngắn** ngày kết thúc chưa qua (Đ1.3); vẫn không sửa số, không xoá |
| ADR-0077 điều 4 (cách tính) | `RATE` hoặc `PER_PAX` | thêm «giá đại lý» cho phạm vi một dịch vụ (Đ2) |
| ADR-0077 (lý do thiếu mức) | năm lý do | thêm «giá bán lẻ đã đổi» (Đ3), «giá đại lý cao hơn giá bán lẻ» (Đ2.3) |
| ADR-0117 (gắn loại / đối tác ↔ chính sách) | chỉ đóng một lần | như dòng đầu bảng (Đ1.1) |

## Trang ghép
Xem mục «Trang ghép (`CLAUDE.md` §9)» của bản nguồn `docs/superpowers/specs/2026-10-29-sua-muc-va-gia-dai-ly/DE-XUAT.md` (bảng chứa gì; quyền chạm bảng; cổng canh cửa, kể cả chỗ giao diện ẩn / hiện). [chép 29/10]

## Tiêu chí nghiệm thu lượt 1 (đỏ trước, xanh sau) [chép 29/10]
1. Ví dụ của chủ (mức cấp đại lý cho một dịch vụ, 2027-01-01 → 2028-01-01, chưa có đơn) sửa được số tiền và cả hai ngày bằng nút «Sửa»; dòng cũ còn trong lịch sử, ghi «đã huỷ», không bao giờ được tra ra.
2. Mức đã có đơn chụp: «Sửa» chỉ cho ngày bắt đầu mới ≥ hôm nay (≥ ngày mai nếu dòng cũ bắt đầu hôm nay); đơn đã xác nhận giữ mức cũ; làm được cả khi dòng cũ đã có ngày kết thúc.
3. Huỷ một dòng đã có bản chụp bị máy chủ từ chối bằng câu tiếng Việt; bản chụp mới trỏ vào dòng đã huỷ bị CSDL chặn; bất biến mới trong `audit-invariants` bắt dòng huỷ có bản chụp. Mỗi lớp thấy chặn thật một lần (P16).
4. Thiếu lý do ⇒ 400; tài khoản không giữ `partner.commission.write` hoặc mang quyền Đối tác ⇒ không thấy nút, gọi thẳng route bị từ chối.
5. Ba loại dòng (mức, gắn loại ↔ chính sách, gắn đối tác ↔ chính sách) đều có «Sửa» theo cùng luật.
