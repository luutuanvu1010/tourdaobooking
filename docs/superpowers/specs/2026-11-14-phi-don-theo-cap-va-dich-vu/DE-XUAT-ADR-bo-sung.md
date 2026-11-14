# ĐỀ XUẤT ADR (số lấy lúc chép) — Phí đưa đón: thêm điều kiện cấp độ đại lý và dịch vụ cụ thể; phí đón trong công nợ đại lý

- **Trạng thái:** đề xuất, chờ chủ dự án duyệt. AI soạn, không tự duyệt (Hiến pháp N3). Hồ sơ có ngày 2026-11-14.
- **Loại:** việc lớn (tiền, dữ liệu). **Cửa:** như ADR-0147 (bảng chỉ thêm; tắt bằng cách kết thúc «ngày bắt đầu áp»).
- **Nguồn:** bản thiết kế chủ duyệt 14/11, `docs/superpowers/specs/2026-11-14-phi-don-theo-cap-va-dich-vu-design.md` (gọi tắt **TK**). Bản này chỉ rút ba điều chạm tiền, dữ liệu của TK thành quyết định; chi tiết đọc ở TK mục 5.
- **Lời chủ 14/11:** mức đón tuỳ «Tình hình kinh doanh, cấp độ đại lý, nhóm dịch vụ/dịch vụ cụ thể, khu vực đón»; chọn một bảng phí duy nhất; «1- dịch vụ thắng, 2- có, cộng vào số đại lý nợ, 3- sửa luôn phần chạm tiền bị lỗi».
- **Quan hệ với ADR cũ:**
  - **bổ sung** ADR-0147: thêm hai khoá điều kiện; **thay** câu chọn mức «đếm số điều kiện» của Đ2 bằng thứ tự cố định; **siết** điều kiện đặt «ngày bắt đầu áp»; **làm rõ** nơi ghép dòng phí (máy chủ, ngay sau `buildLines`, không nằm trong `buildLines`). Tệp ADR-0147 không sửa.
  - **làm xong** ADR-0149 Đ2 (khoá dịch vụ trong biểu phí).
  - **bổ sung** ADR-0182: Tổng công nợ của đơn có thêm phí đón.
  - **giữ** ADR-0047 (chặng không mang tiền), ADR-0117 (cấp độ đại lý là dữ liệu Kế toán đặt; không tạo bộ cấp thứ hai).
- **Xây trên lỗi đang mở: TNV-G1** (hạn 2026-12-31). Xem «Phát hành».

## Tóm tắt cho chủ (lời thường)
1. Bảng phí đón có thêm hai ô điều kiện: **cấp độ đại lý** và **dịch vụ cụ thể**. Ô nào để trống nghĩa là «mọi…». Mức 0 đồng là miễn phí.
2. Nhiều dòng cùng khớp thì: dòng nêu đích danh dịch vụ thắng, rồi tới dòng nêu cấp, rồi nhóm dịch vụ, rồi chiều đi hay về. Xe riêng có bảng mức riêng (tính theo chuyến), không lẫn với đi chung (tính theo khách).
3. Cấp của đơn là cấp của đại lý đặt đơn vào ngày xác nhận, và được chụp lại. Khách lẻ, đại lý chưa có cấp trả mức chung. Đại lý có hai vai trò mang hai cấp khác nhau thì văn phòng phải gán cấp riêng rồi mới xác nhận được.
4. Đơn đại lý: phí đón cộng đủ vào số đại lý nợ công ty, không trừ hoa hồng. Biên nhận có dòng «Phí đưa đón», miễn phí vẫn in.
5. Chỉ bật được phí đón khi mọi khu vực đã có một mức chung.

## Quyết định (ba điều, đúng trần 3)
- **ĐB1 — Hai khoá điều kiện mới, thứ tự chọn mức, xe riêng tách nửa, chống trùng lúc đặt, điều kiện đủ mức.** Nguyên văn TK mục 5 «ĐB1».
- **ĐB2 — Cấp của đơn để tính phí đón; chụp mã cấp; số khách tính tiền của chặng; nơi ghép dòng phí.** Nguyên văn TK mục 5 «ĐB2».
- **ĐB3 — Dòng phí là loại dòng riêng của `order_item`; cộng đủ vào công nợ đại lý và hạn mức trả sau; không hoa hồng; mục «Phí đưa đón» trên biên nhận và phiếu công nợ.** Nguyên văn TK mục 5 «ĐB3».

## Trang ghép (`CLAUDE.md` §9)
Trang ghép 28/10 (`../2026-10-28-phi-don-va-chan-ban/TRANG-GHEP.md` §1) đã ghép `order_item`, `loc_location`, bảng phí. Phần thêm của lượt này:

| Bảng | Hôm nay ai dùng | Lượt này thêm |
|---|---|---|
| `prc_rate_tier`, `prc_role_tier`, `prc_party_tier` | hoa hồng (chọn mức, chụp lúc xác nhận); Kế toán, Quản trị, Toàn quyền ghi | **phí đón đọc** để biết cấp của bên đặt. Không thêm người ghi. Hệ quả: Kế toán đổi cấp của một đại lý nay đổi luôn phí đón của các đơn **chưa xác nhận** của họ. |
| bảng điều kiện của phí đón (ADR-0147 Đ2) | (chưa có) | hai khoá mới; giá trị trỏ mã cấp, mã dịch vụ |
| `order_item` | như trang 28/10 | dòng phí chụp thêm mã cấp, số khách đã tính; đọc thêm bởi công nợ đại lý (`ghepGiaDaiLy`) và cổng hạn mức trả sau |

- **Quyền:** không thêm ô, không đổi ô. Ghi bảng phí và vùng vẫn là `admin.manage` (ADR-0147). Ghi cấp vẫn theo các ô hiện có của màn Cấp độ đại lý.
- **Cổng nào canh cửa nào:** cổng thiếu mức của ADR-0147 có thêm hai lý do (đại lý hai cấp; xung đột mức). Không thêm cổng mới. Cổng hạn mức trả sau không đổi luật, chỉ số nợ lớn hơn vì có phí đón.
- **Chỗ giao diện ẩn hiện theo quyền bị đổi nghĩa:** màn Cấp độ đại lý — gán hoặc đổi cấp nay ảnh hưởng cả phí đón. Phải có một câu nhắc ở chỗ gán cấp (chữ do chủ duyệt ở bước kế hoạch).
- **Chưa kiểm ở bước này:** danh sách đầy đủ mọi nơi đọc `order_item` theo dịch vụ (TK ĐB3 giao người thi công rà và ghi vào kế hoạch).

## Phát hành và thi công
- Mã chỉ viết sau khi sổ vàng `golden/phi-dua-don.json` được Kế toán hoặc chủ xác nhận (Hiến chương 5.17).
- Bốn đợt A–D như TK mục 6. Đợt A, B không tạo dòng tiền, phát hành được trước.
- **Đợt C (chạm tiền) phát hành sau khi mục TNV-G1 đóng.** Lời chủ 14/11: «sửa luôn phần chạm tiền bị lỗi». Hiện trạng: phần sửa đã chạy trên production từ bản 2.42; mục chưa đóng vì còn chờ xác nhận năm ca sổ vàng, ca 07 (phiếu chi) và một lệnh kiểm dữ liệu. Chủ 14/11, nguyên văn: «ok tôi duyệt 5 ca vàng, duyệt ca 07 vì trên thực tế vẫn có phiếu thu phiếu chi (offline) viết tay.» Sáu ca đã đổi sang đã xác nhận (13/13). Mục TNV-G1 chỉ còn chờ chủ chạy lệnh kiểm dữ liệu production (`audit-invariants --db remote`); đạt thì đóng mục và Đợt C không còn bị chặn.

## Tiêu chí nghiệm thu
TK mục 7, cộng các tiêu chí của ADR-0147 không bị bản này thay.
