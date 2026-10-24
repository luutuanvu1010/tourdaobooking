# ADR-0138 — Gắn mức TA riêng cho từng đại lý

- **Trạng thái:** **accepted** 2026-10-24 — chủ dự án trong chat, nguyên văn: «Duyệt nháp 0138 theo khuyến nghị: Kế toán, Quản trị, Toàn quyền được gắn mức riêng.»
- **Ngày:** 2026-10-24.
- **Loại:** việc lớn (dữ liệu, tiền, quyền). **Cửa:** một chiều về dữ liệu (bảng chỉ-thêm); luật chọn mức và mã đảo được.
- **Nguồn:** góp ý YC-0020 + lời chủ 24/10. Nháp: `docs/superpowers/specs/2026-10-24-de-xuat-adr-gan-muc-ta-rieng-tung-dai-ly.md`; trang ghép: `docs/superpowers/specs/2026-10-24-trang-ghep-luot-duyet-1.md` lượt 2.
- **Sửa/bổ sung:** ADR-0117 lần 2 điều 6 («dòng riêng của loại thắng dòng TA») — xem D1. Không sửa thân ADR cũ.
- **Xây cạnh lỗ đang hở:** HC-4.2, TNV-G4 (gần vùng tiền, không cùng đường ghi — không đụng đường điều chỉnh sổ).

## Bối cảnh
Mức TA hôm nay chỉ gắn theo **loại đối tác** (`prc_role_tier`). Muốn đại lý A hưởng TA2 còn đại lý khác cùng loại hưởng TA1 thì phải viết dòng riêng của đối tác bằng con số rời; hồ sơ mang hai loại gắn hai mức khác số thì đơn bị giữ (`RULE_CONFLICT`).

## Quyết định
1. **D1 — Bảng và thứ tự chọn mức.** Bảng chỉ-thêm mới `prc_party_tier` (hồ sơ ↔ mức TA, `valid_from/valid_to`, người tạo, giờ tạo), theo khuôn `prc_role_tier` (migration 0096): mỗi hồ sơ tối đa một mức tại một ngày; chỉ gắn cho hồ sơ đang mở vai thuộc loại được hưởng; mức tắt không gắn mới; gắn chỉ đóng được một lần, đổi mức = đóng cũ, mở mới; không xoá.
   Thứ tự chọn mức, cụ thể nhất thắng: (1) dòng riêng của đối tác [bậc 1–3] → **(2) dòng của mức TA gắn riêng cho đối tác [bậc 10–12, mới]** → (3) dòng riêng của loại [4–6] → (4) dòng của mức TA gắn cho loại [7–9]. **Hồ sơ đã có mức gắn riêng thì bậc (4) bị bỏ qua hoàn toàn cho hồ sơ đó** — kể cả khi mức riêng không có dòng cho dịch vụ đang tính (khi đó: dòng riêng của loại nếu có, không thì thiếu mức `NO_RULE`, đơn bị giữ chờ Kế toán). **Đổi nghĩa ADR-0117 điều 6:** mức TA gắn riêng thắng dòng riêng của loại; mức TA gắn theo loại vẫn thua.
   **Đánh số bậc:** bậc chỉ để hiển thị ở «Thử tra», không lưu vào dữ liệu ⇒ bậc mới đánh **10–12** (đứng sau 3, trước 4 về ưu tiên) để giữ nguyên nghĩa các số 1–9 đang có. Đơn đã chụp không đổi (ADR-0117 điều 7).
2. **D2 — Ai được gắn.** Ô `partner.commission.write` như gắn mức cho loại (Kế toán, Quản trị, Toàn quyền). Không thêm ô quyền. Tài khoản giữ quyền Đối tác (kể cả lai) không đọc, không ghi (`holdsPartner`). Mọi lần gắn / đóng ghi nhật ký (`prc_party_tier_set`, `prc_party_tier_closed`) — chỉ tên mức và ngày, không tên liên hệ, không SĐT.
3. **D3 — Chỗ gắn và nguồn hiển thị.** Nút «Gắn mức riêng» / «Kết thúc» trong khối «Hoa hồng hiện hành» của hồ sơ đại lý (khối chỉ-đọc ADR bước 1 đổi nghĩa: có nút ghi cho người giữ ô write). Khối phải hiện rõ nguồn: «mức X, gắn riêng» hay «mức X, theo loại». Cảnh báo (không chặn) khi hồ sơ còn dòng riêng của đối tác đang hiệu lực, vì dòng riêng vẫn thắng.

## Hệ quả
- Mọi đường chụp mức (xác nhận đơn, đổi bên đặt, tính thử đơn nháp) và «Thử tra» phải nạp gắn riêng — tham số bắt buộc, mỗi đường một ca đỏ khi mất.
- Kiểm định kỳ mới `R-PRC-1`: mọi gắn riêng đang hiệu lực thuộc hồ sơ đang mang loại được hưởng, không chồng.
- **Chưa quyết (gom hỏi chủ):** gộp hồ sơ (ADR-0068) hôm nay không đụng bảng hoa hồng; hồ sơ phụ có gắn riêng thì gắn đó nằm yên trên hồ sơ đã gộp (không đơn mới nào dùng). Muốn tự đóng / chuyển sang hồ sơ chính phải mở hợp đồng mới giữa `parties` và `pricing` — chưa làm.
- Ca vàng sổ đại lý mới (`SV-TA-07…`) thêm ở trạng thái `cho_xac_nhan` — chờ Kế toán, AI không tự đánh dấu.

## Tiêu chí nghiệm thu (đỏ trước, xanh sau)
1. Loại «lữ hành» gắn TA1 (10% Tour đảo, 7% Vinwonders); đại lý A gắn riêng TA2 (12%, 9%) ⇒ đơn của A ra 12% / 9%, đại lý khác cùng loại vẫn 10% / 7%.
2. Hồ sơ hai loại khác mức + một mức riêng ⇒ không còn `RULE_CONFLICT`.
3. Dòng riêng của đối tác (bậc 1–3) vẫn thắng mức riêng; mức riêng thắng dòng riêng của loại.
4. Đóng gắn ⇒ trở về mức theo loại; người không có ô ghi: 403; tài khoản giữ quyền Đối tác: 403.
5. Gắn cho hồ sơ không mang loại được hưởng / mức tắt / chồng ngày ⇒ CSDL chặn, máy chủ trả câu tiếng Việt.
