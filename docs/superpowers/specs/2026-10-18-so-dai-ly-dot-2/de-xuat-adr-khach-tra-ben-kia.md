> **Đã duyệt 2026-10-18, bản chính thức:** `docs/adr/ADR-0132-khach-tra-ben-kia-cho-ke-toan-xac-nhan.md` (số 0130 đã bị nhánh khác giữ). Tệp này giữ nguyên làm hồ sơ bản đề xuất.

# ADR-0130 (ĐỀ XUẤT) — Khoản «khách đã trả cho đại lý / tại quầy nhà cung cấp» do người không phải Kế toán khai: đang đối chiếu, chưa tạo nợ; thay ADR-0078 điều 8 gạch 2

- **Trạng thái:** **proposed**. Chủ dự án chưa duyệt văn bản này. Lựa chọn nền đã có lời chủ: chat 2026-10-18, hộp chọn «Khi HDV báo trên Nền tảng rằng khách đã trả tiền cho đại lý (hoặc trả tại quầy nhà cung cấp), máy nên ghi thế nào?» → *«Chờ Kế toán xác nhận (Recommended)»*. Câu trả lời đó chưa phải lời duyệt ADR: văn bản này đi cùng lượt duyệt sổ đại lý đợt 2 (`trinh-chu.md` cùng thư mục). Từ khi duyệt: chuyển tệp vào `docs/adr/`, đổi dòng này thành **accepted** kèm câu duyệt nguyên văn.
- **Số:** 0130 là số kế tiếp theo mục lục `docs/adr/README.md` (đọc 2026-10-18); kiểm lại lúc duyệt.
- **Loại:** việc lớn (tiền + dữ liệu). Đường ghi một chiều (dòng sổ chỉ đảo, không xoá); luật đảo được bằng ADR mới.
- **Thay:** ADR-0078 điều 8 gạch 2 (khuyến nghị C6 (A), «nợ ở người khai tới khi Kế toán xác nhận») và tiêu chí nghiệm thu 3b của ADR-0078. Lựa chọn C6 = A ghi ở `docs/superpowers/specs/2026-10-01-de-xuat-adr-so-tien-luot-2/cau-hoi-chu.md` là hồ sơ có ngày nên **không sửa tệp đó**; lời chủ 18/10 thay nó. Không sửa ADR-0078; như các ADR trước, dòng của ADR-0130 trong mục lục `docs/adr/README.md` ghi «Sửa ADR-0078 điều 8 gạch 2».
- **Xây trên lỗ đang hở:** ADR này nằm trong đợt 2, nên chịu chung năm lỗ của đợt 2: TNV-G1, TNV-G3, TNV-G4, HC-4.2, HC-5.19 (`docs/quyen-hoan.json`). Lý do, điều kiện và lời cho phép xin chủ ở `trinh-chu.md` quyết định 3.

## Vì sao phải quyết lại

Ngày 1/10 chủ chọn C6 = A với lý do «giống hệt cách đã chọn cho Công ty thu – chuyển khoản do HDV khai» (luật H3: dòng giữ hộ nằm trên người khai). Từ ngày 14/10, ADR-0120 (bản 2.2) đã thay luật H3 cho chuyển khoản «Công ty thu»: lời khai không tạo nợ, đơn ở trạng thái «đang đối chiếu» và chưa «Đã giao» được cho tới khi Kế toán xác nhận. Như vậy lý do của C6 = A không còn. Giữ nguyên C6 = A thì vướng hai chỗ chặn đã lên production:

1. C6 = A cho «Đã giao» ngay sau lời khai. Nhưng từ ADR-0088 (điều 3), lần thu của đơn đã «Đã giao» không đảo đơn lẻ được. Bên kia báo «không nhận» thì Kế toán không gỡ được lần thu sai.
2. Phiếu «Bên kia đã xác nhận» theo C6 = A đảo dòng giữ hộ của người khai. Trigger `bil_held_no_single_reversal` (migration 0082) chỉ miễn cho phiếu `COMPANY_RECEIVED`, nên phiếu mới bị chặn. Muốn chạy được thì phải nới hàng rào.

## Quyết định

1. **Người khai không giữ ô `ledger.write`** (HDV đang phụ trách, Bán hàng, Quản trị, Thực tập… những người có `payment.receive` trên đơn) ghi «khách đã trả cho **bên đặt (đại lý) của đơn**» hoặc «khách trả tại **quầy nhà cung cấp của một dòng làm đại lý** trên đơn» (giới hạn số tiền và người thu như ADR-0078 điều 7). Lần thu được lưu với người thu như lời khai (vai `BOOKER` / `SUPPLIER`), kèm dấu `DECLARED` ở bảng đối chiếu của ADR-0120 (`bil_receipt_recon`, mở rộng phạm vi). **Không sinh dòng giữ hộ cho ai.** Đơn có khoản như vậy thì chưa «Đã giao» được (lý do giữ «đang đối chiếu», nói rõ khoản nào, chờ Kế toán).
2. **Kế toán hoặc Toàn quyền bấm «Bên kia đã nhận».** Máy ghi dấu `CONFIRMED` cộng một dòng giữ hộ **bên kia → Tour Đảo** đúng số đó trong **một lô**. Lô dùng một loại phiếu mới `COUNTERPARTY_CONFIRMED` («Bên kia đã nhận», phiếu một đơn); dòng mang `receipt_id` của lần thu gốc, để đường đảo lần thu sẵn có đảo đủ dòng. Bên kia **không nhận** thì Kế toán đảo lần thu. Việc đảo làm được vì đơn chưa «Đã giao».
3. **Không đổi** hai đường ghi trực tiếp:
   - Tài khoản Đối tác ghi chính mình là người thu (`BOOKER`, ADR-0078 điều 8 gạch 1) ⇒ dòng giữ hộ sinh ngay trên chính họ, vì người ghi chính là người nợ.
   - Kế toán / Toàn quyền ghi thẳng người thu `BOOKER` / `SUPPLIER` ⇒ dòng giữ hộ sinh ngay, vì người ghi chính là người xác nhận (ADR-0026 điều 2).
4. **Áp cho cả tiền mặt và chuyển khoản.** Ở đây khách đưa tiền cho bên kia, người khai không cầm đồng nào. Cổng «xác nhận chuyển khoản phải có mã giao dịch ngân hàng» (trigger `bil_receipt_recon_confirmed_txn` của migration 0099) **chỉ áp cho người thu Công ty**: tiền vào tài khoản của đại lý / nhà cung cấp nên công ty không có mã. Kế toán đối chiếu với bên kia ngoài Nền tảng.
5. **Không đổi:** ADR-0078 điều 7, 9, 10; ADR-0120 cho khoản «Công ty thu»; tiền mặt «Công ty thu» vẫn theo H3 (chủ chốt 15/10).

## Câu ADR bị thay

| Nơi | Câu cũ (tóm) | Câu mới |
|---|---|---|
| ADR-0078 điều 8 gạch 2 | khuyến nghị C6 (A): người khai mang nợ tới khi Kế toán xác nhận | Quyết định 1–2 ở trên: khai chỉ có dấu `DECLARED`, không nợ; Kế toán xác nhận thì dòng giữ hộ sinh trên bên kia |
| ADR-0078 bảng dữ liệu, dòng `bil_posting_kind` | `COUNTERPARTY_CONFIRMED` «Bên kia đã xác nhận» nếu C6 = A | Có, nhãn «Bên kia đã nhận», phiếu một đơn |
| ADR-0078 bảng dữ liệu, dòng `bil_payment_receipt` | C6 = A suy «chờ xác nhận» từ dòng giữ hộ trên người khai | Suy từ dấu `DECLARED` chưa `CONFIRMED` ở `bil_receipt_recon` (ADR-0120, mở phạm vi) |
| ADR-0078 bảng «Sửa câu nào», dòng ADR-0026 điều 4 gạch 2 (H3) | mở rộng H3 cho người thu bên đặt / nhà cung cấp do người khác khai | Không mở rộng H3; dùng khuôn ADR-0120 |
| ADR-0078 tiêu chí 3b | HDV khai ⇒ HDV giữ 400.000, «Đã giao» được; xác nhận ⇒ hai dòng đảo | Tiêu chí 1–5 dưới đây |
| ADR-0081 điều 4 (`minhKhaiChoXacNhan`) | khoản mình khai «vẫn là nợ của mình theo H3» | Sửa ở lượt duyệt đợt 3 (mục Hệ quả) |

Số dư cuối của ví dụ B-1…B-5 (ADR-0078) **không đổi**. Khi lễ tân bên đặt tự ghi (quyết định 3) thì đi y như cũ; khi người khác khai thay thì chỉ thêm bước Kế toán xác nhận trước «Đã giao».

## Hệ quả

- HDV phải chờ Kế toán thì đơn mới «Đã giao» được, nếu đơn có phần khách trả cho đại lý / tại quầy. Ô «chờ đối chiếu» trên «Việc của bạn» của Kế toán (đã có cho ADR-0120) gộp thêm khoản loại mới. Khoản chờ quá 3 ngày được nhắc theo cùng luật.
- Mọi chỗ hôm nay hiểu «đang đối chiếu» là «chỉ người thu Công ty» phải nhận thêm hai vai mới cùng lúc: danh sách chờ và bộ đếm nhắc của Kế toán, luật «khoản mới có phải đối chiếu không», view cọc của đơn và trigger đảo cọc (migration 0099). Sót một chỗ thì đơn bị giữ mà Kế toán không thấy trong danh sách, hoặc tiền cọc tính sai.
- Ví dụ C-4 và ca vàng SV-HT-03 (khách trả 400.000 tại quầy i-resort) cho cùng số dư cuối khi Kế toán đã xác nhận. Trước lúc xác nhận, không ai mang khoản 400.000 đó.
- Sổ đối tác (ADR-0081 điều 4, đợt 3): lời ghi «`minhKhaiChoXacNhan` … vẫn là nợ của mình theo H3» không còn đúng cho khoản loại này. Đối tác chỉ tự ghi được chính mình (sinh nợ ngay), nên trường đó chỉ còn chứa khoản «Công ty thu – chuyển khoản» đối tác khai (ADR-0120). Sửa câu này ở lượt duyệt đợt 3.

## Phương án bị loại

- **Giữ C6 = A (HDV tạm mang nợ, «Đã giao» ngay):** phải nới hai hàng rào đã lên production (ADR-0088 điều 3, trigger 0082), lý do nêu ở trên.
- **Chỉ Kế toán ghi:** chặt nhất, nhưng HDV không có cách báo. Kế toán phải tự hỏi từng đơn.

## Tiêu chí nghiệm thu (đỏ trước, xanh sau)

1. HDV khai «khách trả đại lý» 300.000 ⇒ không dòng giữ hộ nào; số «bạn đang giữ» của HDV không đổi; «Đã giao» trả 409 với lý do «đang đối chiếu» nêu rõ khoản đó.
2. Kế toán bấm «Bên kia đã nhận» ⇒ một phiếu, một dòng giữ hộ đại lý → Tour Đảo 300.000; «Đã giao» sau đó được (nếu đủ điều kiện khác).
3. Kế toán đảo lần thu đã khai trước khi xác nhận ⇒ không còn dấu chờ, không dòng nào sót. Đảo **sau** khi xác nhận (đơn chưa «Đã giao») ⇒ đảo đủ cả dòng giữ hộ trên đại lý.
4. SQL chạy tay chèn dấu `CONFIRMED` cho lần thu vai `BOOKER` chuyển khoản không có mã giao dịch ⇒ **không** bị chặn. Cùng câu cho vai `COMPANY` ⇒ vẫn bị chặn (thấy chặn thật một lần).
5. Đối tác ghi chính mình làm người thu ⇒ dòng giữ hộ sinh ngay trên chính họ, không có dấu chờ.
