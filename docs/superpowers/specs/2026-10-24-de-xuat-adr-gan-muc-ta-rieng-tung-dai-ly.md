# Đề xuất ADR (số tạm 0138) — Gắn mức TA riêng cho từng đại lý

> **Bản nháp chờ chủ duyệt**, không phải ADR. Chưa chuyển vào `docs/adr/`. Số 0138 là số tạm (0137 là số lớn nhất ở mọi nhánh, kiểm 24/10); migration kế tiếp từ `0118` (kiểm lại ở mọi nhánh lúc thi công).
> Nguồn: góp ý YC-0020 + lời chủ 24/10 («gán ngay trong hồ sơ đại lý», «làm 1 rồi 2»). Điều kiện: bước 1 (khối chỉ-đọc «Hoa hồng hiện hành» trên hồ sơ) đã dùng được.
> Việc lớn (dữ liệu, tiền, quyền): cần ADR chủ duyệt + trang ghép + người kiểm độc lập (CLAUDE.md §3, §9). **Sửa/bổ sung** ADR-0117 lần 2 (không sửa thân). Xây trên lỗ đang hở: chưa rà `docs/quyen-hoan.json` — người lập kế hoạch thi công phải rà và ghi.

## 1. Vấn đề

Mức TA hiện chỉ gắn theo **loại đối tác** (bảng `prc_role_tier`). Cùng là «Công ty lữ hành» nhưng muốn đại lý A hưởng TA2, đại lý B hưởng TA1, hôm nay chỉ có cách thêm *dòng riêng của đối tác* (bậc 1–3) ghi thẳng tỷ lệ: con số rời, đổi TA2 thì dòng riêng không đổi theo, và mỗi lần chỉnh phải sửa từng dòng. Hồ sơ mang hai loại gắn hai mức khác nhau còn khiến đơn bị giữ (`RULE_CONFLICT`) mà không có cách gỡ ngoài việc bỏ bớt một loại.

## 2. Đề xuất (ba quyết định)

**D1 — Bảng và thứ tự ưu tiên.** Thêm bảng chỉ-thêm `prc_party_tier` (đối tác ↔ mức TA, có `valid_from/valid_to`, người tạo, giờ tạo) theo đúng khuôn `prc_role_tier` (migration 0096): mỗi hồ sơ tối đa **một** mức tại một ngày (trigger chống chồng); chỉ gắn được cho hồ sơ đang mang loại được hưởng (trigger như `prc_target_not_beneficiary`); mức tắt thì không gắn mới; gắn chỉ đóng được một lần, đổi mức = đóng cũ mở mới.
Thứ tự chọn mức (`chonMuc`), cụ thể nhất thắng: (1) dòng riêng của đối tác, dịch vụ > nhóm > mọi dịch vụ [bậc 1–3 hiện có] → **(2) dòng của mức TA gắn riêng cho đối tác [bậc mới]** → (3) dòng riêng của loại [4–6] → (4) dòng của mức TA gắn cho loại [7–9]. Khi hồ sơ có mức TA riêng thì mức TA gắn theo loại bị **bỏ qua** hoàn toàn cho hồ sơ đó — đây cũng là cách gỡ `RULE_CONFLICT` của hồ sơ hai loại. Đánh số bậc trong `chonMuc` / «Thử tra» / `ThuTraResponse` (đang 1–9) phải mở rộng; đơn đã chụp không đổi (ADR-0117 điều 7).

**D2 — Ai được gắn.** Khuyến nghị: cùng ô `partner.commission.write` như gắn mức cho loại (Kế toán, Quản trị, Toàn quyền), mọi lần gắn/đóng ghi nhật ký (hành động mới `prc_party_tier_*`, chỉ mã hồ sơ + mức, không tên liên hệ). Phương án khác: chỉ Toàn quyền (khớp tinh thần ADR-0090 «quyền tiền»). Không thêm ô quyền mới trong cả hai phương án. Tài khoản giữ quyền Đối tác (kể cả lai) không đọc, không ghi (`holdsPartner`).

**D3 — Chỗ gắn trên giao diện.** Nút «Gắn mức riêng» ngay trong khối «Hoa hồng hiện hành» của hồ sơ đại lý (khối chỉ-đọc làm ở bước 1) và danh sách «đại lý có mức riêng» ở trang Hoa hồng đối tác (bảng điều khiển Admin). Hồ sơ phải hiện rõ nguồn: «mức TA2, gắn riêng» hay «mức TA1, theo loại». Cảnh báo (không chặn) khi gắn riêng cho đại lý còn dòng riêng đối tác đang hiệu lực, vì dòng riêng vẫn thắng.

## 3. Trang ghép (CLAUDE.md §9)

1. **Bảng chứa loại thực thể nào:** `prc_party_tier` chứa duy nhất «mức TA gắn cho một hồ sơ đối tác»; không chứa tỷ lệ (tỷ lệ vẫn ở `prc_commission_rule`).
2. **Dòng bản đồ quyền chạm bảng:** `partner.commission.view` (xem; Bán hàng, Kế toán, Quản trị, Toàn quyền) và `partner.commission.write` (ghi). Không thêm dòng. Đối tác/Tài xế/Nhân sự/HDV: không thấy, không ghi.
3. **Cổng canh cửa nào:** máy chủ — route ghi mới trong `pricing` (`can` + `holdsPartner`, một lô: câu ghi → nhật ký); trigger CSDL — chống chồng, hồ sơ phải thuộc người hưởng, mức phải đang bật; giao diện — nút ẩn/hiện theo `can(me,"partner.commission.write")`, **chỗ ẩn/hiện bị đổi nghĩa:** khối hồ sơ từ chỉ-đọc thành có nút ghi; kiểm định kỳ mới (mã `R-PRC-…`): mọi dòng `prc_party_tier` đang hiệu lực thuộc hồ sơ mang loại được hưởng và không chồng.
- **Điểm nghi ngờ phải có bài chạy thật:** gộp hồ sơ (ADR-0068) — hồ sơ bị gộp có gắn mức riêng thì chuyển hay đóng? Khuyến nghị: đóng gắn của hồ sơ phụ, hồ sơ chính giữ nguyên, ghi nhật ký. Đổi bên đặt sau xác nhận (đang thay mức ghi tay bằng mức tự động — BACKLOG) phải có ca kiểm.

## 4. Tiêu chí nghiệm thu (viết trước khi làm)

- Ví dụ chủ: loại «lữ hành» gắn TA1 (10% Tour đảo, 7% Vinwonders); đại lý A gắn riêng TA2 (12%, 9%) ⇒ đơn của A ra 12%/9%, đơn của đại lý khác cùng loại vẫn 10%/7%; đổi TA2 một lần ⇒ mọi đại lý gắn TA2 đổi theo cho đơn **mới**, đơn đã chụp giữ nguyên.
- Hồ sơ hai loại khác mức + một mức riêng ⇒ không còn `RULE_CONFLICT`.
- Dòng riêng đối tác (bậc 1–3) vẫn thắng mức TA riêng.
- Đóng gắn ⇒ trở về mức theo loại; người không có ô ghi: 403; tài khoản lai: 403.
- Thêm ca vàng sổ đại lý (cùng khuôn SV-TA) và dòng ở `docs/SO-HANG-RAO.md` sau khi quan sát chặn thật (đỏ → hoàn nguyên).

## 5. Điều phải nói thẳng

- Thêm một lớp ưu tiên là thêm một chỗ để nhân viên hỏi «sao đại lý này lấy khác» — vì vậy khối nguồn ở D3 là điều kiện, không phải tuỳ chọn.
- Nếu số đại lý đặc biệt chỉ vài người thì dòng riêng đối tác hiện có vẫn đủ; ADR này đáng làm khi số đó lên hàng chục. Chủ quyết theo dữ liệu dùng thật.
- Một chiều về dữ liệu (bảng chỉ-thêm có dữ liệu thì không gỡ được mà không dựng lại); mã và luật chọn mức đảo được. Hoàn tác: `wrangler rollback` — bảng thừa không làm hỏng mã cũ (nếu mã cũ không đọc nó).

## 6. Chưa kiểm

Chưa chạy trên D1 thật; chưa rà `docs/quyen-hoan.json`; chưa đếm hồ sơ production mang hai loại khác mức (chủ có thể xác định số đại lý cần gắn riêng bằng một câu `SELECT` chỉ-đọc nếu muốn).
