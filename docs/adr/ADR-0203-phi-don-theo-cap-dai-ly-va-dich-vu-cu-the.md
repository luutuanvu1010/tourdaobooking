# ADR-0203 — Phí đưa đón: thêm điều kiện cấp độ đại lý và dịch vụ cụ thể; phí đón trong công nợ đại lý

- **Trạng thái:** **accepted** 2026-11-14 — chủ dự án trong chat, nguyên văn: «duyệt quyết định bổ sung phí đón», sau khi nhận đề xuất `docs/superpowers/specs/2026-11-14-phi-don-theo-cap-va-dich-vu/DE-XUAT-ADR-bo-sung.md`. **Chưa có mã.**
  - Trước đó cùng ngày chủ duyệt bản thiết kế `docs/superpowers/specs/2026-11-14-phi-don-theo-cap-va-dich-vu-design.md` (gọi tắt **TK**), nguyên văn: «1- dịch vụ thắng, 2- có, cộng vào số đại lý nợ, 3- sửa luôn phần chạm tiền bị lỗi, giải thích thêm. Duyệt theo đề xuất».
  - Các chỗ **[người soạn]** là lựa chọn của người soạn, đã nêu riêng với chủ trong chat trước câu duyệt (xe riêng tách khỏi đi chung; khách lẻ và đối tác chưa có cấp trả mức chung; đối tác hai vai trò hai cấp phải gán cấp riêng; mỗi vùng phải có mức chung trước khi bật; em bé không tính, chặng miễn phí vẫn in dòng). Chủ không nói riêng về từng chỗ; người chép ghi là duyệt cùng văn bản.
  - AI soạn và chép, không tự duyệt (Hiến pháp N3). TK đã qua một vòng người đọc độc lập soát (14/11). Bản chép này chưa có người kiểm độc lập.
- **Số:** 0203 kiểm còn trống ngày 14/11 trên mọi nhánh của máy này (lớn nhất khi đó: 0202).
- **Ngày:** 2026-11-14. **Loại:** việc lớn (tiền, dữ liệu) — thi công xong cần người kiểm độc lập chỉ đọc. **Cửa:** như ADR-0147 (bảng chỉ thêm; tắt bằng cách kết thúc «ngày bắt đầu áp»).
- **Lời chủ 14/11 (không hỏi lại):** mức đón tuỳ «Tình hình kinh doanh, cấp độ đại lý, nhóm dịch vụ/dịch vụ cụ thể, khu vực đón»; cùng khách sạn, cùng tour, cấp cao nhất và cấp thấp nhất tính khác nhau; khách sạn xa trung tâm thì giá đón cao hơn; chọn **một bảng phí duy nhất**.
- **Quan hệ với ADR cũ** (không sửa tệp ADR nào):
  - **bổ sung** ADR-0147: thêm hai khoá điều kiện; **thay** câu chọn mức «đếm số điều kiện» của Đ2 bằng thứ tự cố định; **siết** điều kiện đặt «ngày bắt đầu áp»; **làm rõ** nơi ghép dòng phí (máy chủ, ngay sau `buildLines`).
  - **làm xong** ADR-0149 Đ2 (khoá dịch vụ trong biểu phí).
  - **bổ sung** ADR-0182: Tổng công nợ của đơn có thêm phí đón.
  - **giữ** ADR-0047 (chặng không mang tiền), ADR-0117 (cấp độ đại lý là dữ liệu Kế toán đặt; không tạo bộ cấp thứ hai).
- **Lỗi TNV-G1** (đơn huỷ còn tiền đã thu): ADR-0147 ghi phí đón không phát hành trước khi mục này đóng. Ngày 14/11 chủ xác nhận sáu ca sổ vàng còn lại và chạy `audit-invariants --db remote` đạt; mục đã gỡ khỏi `docs/quyen-hoan.json` trên nhánh `claude/pickup-fee-pricing-plan-6eae32`. Người chạy phát hành đợt chạm tiền kiểm mục này đã vắng trên `main`.

## Tóm tắt cho chủ (lời thường)
1. Bảng phí đón có thêm hai ô điều kiện: **cấp độ đại lý** và **dịch vụ cụ thể**. Ô nào để trống nghĩa là «mọi…». Mức 0 đồng là miễn phí.
2. Nhiều dòng cùng khớp thì: dòng nêu đích danh dịch vụ thắng, rồi tới dòng nêu cấp, rồi nhóm dịch vụ, rồi chiều đi hay về. Xe riêng có bảng mức riêng (tính theo chuyến), không lẫn với đi chung (tính theo khách).
3. Cấp của đơn là cấp của đại lý đặt đơn vào ngày xác nhận, và được chụp lại. Khách lẻ, đại lý chưa có cấp trả mức chung. Đại lý có hai vai trò mang hai cấp khác nhau thì văn phòng phải gán cấp riêng rồi mới xác nhận được.
4. Đơn đại lý: phí đón cộng đủ vào số đại lý nợ công ty, không trừ hoa hồng. Biên nhận có dòng «Phí đưa đón», miễn phí vẫn in.
5. Chỉ bật được phí đón khi mọi khu vực đã có một mức chung.

## Quyết định (ba điều chạm tiền hoặc dữ liệu, đúng trần 3)

**ĐB1 — Hai khoá điều kiện mới và cách chọn mức (phân hệ `pricing`).**
- Thêm hai khoá vào bảng tra cứu khoá điều kiện của ADR-0147 Đ2, mỗi khoá một bộ tính trong danh sách đăng ký ở mã:
  - **cấp độ đại lý**: giá trị là mã `prc_rate_tier` đang bật;
  - **dịch vụ cụ thể**: giá trị là mã dịch vụ trong danh mục (`catalog_code` của dòng dịch vụ mà chặng thuộc về).
- Một dòng phí không được vừa có khoá «nhóm dịch vụ» vừa có khoá «dịch vụ cụ thể». Máy chủ từ chối.
- Khoá «vùng» vẫn bắt buộc. Các khoá khác để trống nghĩa là «mọi…».
- **Chọn mức khi nhiều dòng cùng khớp**, theo thứ tự cố định (thay câu «đếm số điều kiện» của ADR-0147 Đ2):
  1. dòng nêu đích danh **dịch vụ** thắng dòng không nêu (chủ chọn 14/11);
  2. ngang nhau thì dòng nêu **cấp độ đại lý** thắng;
  3. ngang nhau thì dòng nêu **nhóm dịch vụ** thắng;
  4. ngang nhau thì dòng nêu **chiều** thắng.
- **Xe riêng chia bảng làm hai nửa tách hẳn [người soạn]:** chặng xe riêng chỉ khớp các dòng tính theo chuyến (`PER_TRIP`, bắt buộc có khoá xe riêng); chặng đi chung chỉ khớp các dòng tính theo khách (`PER_PAX`, không được có khoá xe riêng). Máy chủ từ chối dòng sai cặp. Lý do: nếu để chung, dòng «cấp 3, 50.000 mỗi khách» sẽ thắng dòng «xe riêng 500.000 mỗi chuyến».
- **Chống trùng lúc đặt:** hai dòng có đúng cùng bộ điều kiện và trùng khoảng ngày bị chặn ngay lúc đặt. Người thi công chọn: cột «chữ ký bộ điều kiện» trên dòng quy tắc kèm trigger chống chồng (ưu tiên), hoặc chặn ở máy chủ trong cùng lô ghi. Dù cách nào, hàm chọn mức vẫn trả «xung đột» (xử lý như thiếu mức) nếu gặp hai dòng ngang bậc khác số, không chọn bừa.
- **Đủ mức trước khi bật [người soạn]:** máy từ chối đặt «ngày bắt đầu áp» khi còn một vùng đang bật (kể cả `NGOAI_VUNG`) chưa có **dòng chung** cho chặng đi chung (để trống cấp, dịch vụ, nhóm, chiều) còn hiệu lực; khi đang áp, máy từ chối kết thúc dòng chung cuối cùng của một vùng nếu chưa có dòng chung nối tiếp. Xe riêng không bắt buộc có dòng chung: thiếu thì báo thiếu mức như ADR-0147.
- **Thử tra** nhận thêm hai ô: cấp độ đại lý (hoặc «khách lẻ») và dịch vụ; kết quả nêu dòng thắng và các dòng thua, mỗi dòng một câu vì sao.
- Thiếu mức không bao giờ lấy 0 (Hiến chương 5.7; ADR-0147 giữ nguyên).

**ĐB2 — Cấp của đơn, bản chụp, số khách tính tiền, nơi ghép dòng phí (phân hệ `pricing` và `orders`).**
- `pricing` thêm một hàm công khai mới: «mã cấp độ đại lý của hồ sơ X vào ngày D»: có cấp riêng còn hiệu lực ngày D thì lấy cấp riêng; không thì lấy cấp của vai trò. Ngày xét là **ngày xác nhận**.
- Ba trường hợp không ra được một cấp:
  - đơn không có bên đặt là đối tác (khách lẻ, hoặc bên đặt là công ty chủ): «không có cấp», chỉ các dòng để trống ô cấp mới khớp;
  - đối tác chưa được gán cấp nào: cũng «không có cấp» **[người soạn]**;
  - đối tác có hai vai trò mang hai cấp khác nhau, không có cấp riêng: «thiếu mức», xử lý như thiếu mức của ADR-0147 Đ3, câu báo nêu «cần gán cấp riêng cho đối tác …»; đơn Đối tác gửi thì vào «chờ xác nhận» **[người soạn]**. Một đối tác như vậy có thể vẫn ra hoa hồng mà bị chặn vì phí đón; đó là chủ ý.
- **Chụp:** lúc xác nhận, dòng phí chụp mã quy tắc, số tiền (ADR-0147), và thêm **mã cấp đã dùng** (hoặc trống), **số khách đã tính**, **đơn giá**. Sau xác nhận, đối tác đổi cấp hoặc đơn đổi bên đặt (ADR-0188) không làm đổi phí **[người soạn]**.
- **Nơi ghép dòng phí:** ở `orders` phía máy chủ, ngay sau `buildLines`, trên cùng đường lưu nháp và xác nhận (`buildLines` là hàm thuần dùng chung với trình duyệt, không gọi được `pricing`). Form hiện số «dự kiến» máy chủ trả về sau khi lưu nháp.
- **Số khách tính tiền của một chặng đi chung [người soạn; Kế toán xác nhận ở sổ vàng]:**
  - bằng số khách tính tiền của dịch vụ mà chặng thuộc về (người lớn, trẻ em, người cao tuổi; không đếm em bé);
  - chiều về có số người riêng (`pax_override`) thì lấy số đó, nhưng không quá số khách tính tiền của dịch vụ;
  - ra 0 thì không sinh dòng phí cho chặng đó (không phải «thiếu mức»);
  - sau xác nhận, sửa `pax_override` (ô `order.trip.edit`) không đổi phí; chỉ «sửa số khách» của dịch vụ (ô `order.money.edit`) mới tính lại, theo đơn giá đã chụp.

**ĐB3 — Dòng phí trong công nợ đại lý và trên giấy tờ (phân hệ `orders`, `billing`, `receipt`).**
- `order_item` thêm cột loại dòng (dịch vụ / phí đưa đón) và cột trỏ về chặng; dòng phí để `service_id` trống. Migration chỉ thêm cột, dòng cũ mặc định là loại dịch vụ.
- Không tính hoa hồng (ADR-0147 giữ nguyên).
- **Công nợ đại lý (ADR-0182):** Tổng công nợ của đơn = tổng giá đại lý các dịch vụ **cộng đủ** các dòng phí đón (chủ chọn 14/11). Sửa `ghepGiaDaiLy`; người thi công rà **mọi** nơi đọc dòng tiền theo dịch vụ (phải thu bán lẻ, «Đã thu», `effectiveService` / `effectiveSubtotal`, `chiaPhanNguoiBan`, biên nhận, phiếu công nợ, QR) và ghi kết quả rà vào kế hoạch.
- **Hạn mức trả sau:** phí đón nằm trong số nợ nên tính vào hạn mức đã dùng; không có luật riêng.
- **Biên nhận và phiếu công nợ:** thêm mục «Phí đưa đón» vào danh sách trắng, mỗi chặng một dòng, thuộc phần của Tour Đảo. Dòng 0 đồng vẫn in, ghi «Miễn phí» **[người soạn]**.
- Chữ mới trên giao diện phải có trong `docs/BANG-THAM-CHIEU.md`; tên chưa có thì đưa 2–3 phương án cho chủ chọn ở bước kế hoạch.

**Ranh giới phân hệ** (giữ đúng ADR-0147): `orders` gom bộ dữ liệu phẳng (vùng, chiều, xe riêng, mã dịch vụ, mã nhóm, số khách tính tiền, mã hồ sơ bên đặt) rồi gọi `pricing` qua `index.ts`; `pricing` tự tra cấp và trả số tiền + mã quy tắc + mã cấp, hoặc «thiếu mức» kèm lý do; `van-chuyen` và `ve-dien-tu` không sửa dòng nào, không import `pricing`.

## Không làm ở ADR này
Giữ phần «Không làm» của ADR-0147: giảm phần trăm, giảm tay, mã khuyến mại; phí theo giờ, mùa, loại khách; phía chi; tự đổi phí khi đổi chặng sau xác nhận.

## Trang ghép (`CLAUDE.md` §9)
Trang ghép 28/10 (`docs/superpowers/specs/2026-10-28-phi-don-va-chan-ban/TRANG-GHEP.md` §1) đã ghép `order_item`, `loc_location`, bảng phí. Phần thêm:

| Bảng | Hôm nay ai dùng | ADR này thêm |
|---|---|---|
| `prc_rate_tier`, `prc_role_tier`, `prc_party_tier` | hoa hồng (chọn mức, chụp lúc xác nhận); Kế toán, Quản trị, Toàn quyền ghi | **phí đón đọc** để biết cấp của bên đặt. Không thêm người ghi. Hệ quả: đổi cấp của một đại lý nay đổi luôn phí đón của các đơn **chưa xác nhận** của họ. |
| bảng điều kiện của phí đón (ADR-0147 Đ2) | (chưa có) | hai khoá mới; giá trị trỏ mã cấp, mã dịch vụ |
| `order_item` | như trang 28/10 | dòng phí chụp thêm mã cấp, số khách đã tính, đơn giá; đọc thêm bởi công nợ đại lý và cổng hạn mức trả sau |

- **Quyền:** không thêm ô, không đổi ô. Ghi bảng phí và vùng vẫn là `admin.manage` (ADR-0147).
- **Cổng nào canh cửa nào:** cổng thiếu mức của ADR-0147 có thêm hai lý do (đại lý hai cấp; xung đột mức). Không thêm cổng mới. Cổng hạn mức trả sau không đổi luật, chỉ số nợ lớn hơn vì có phí đón.
- **Chỗ giao diện đổi nghĩa:** màn Cấp độ đại lý — gán hoặc đổi cấp nay ảnh hưởng cả phí đón; phải có một câu nhắc ở chỗ gán cấp (chữ do chủ duyệt ở bước kế hoạch).
- **Chưa kiểm:** danh sách đầy đủ mọi nơi đọc `order_item` theo dịch vụ (ĐB3 giao người thi công rà).

## Phát hành và thi công
- Mã chỉ viết sau khi sổ vàng `golden/phi-dua-don.json` được Kế toán hoặc chủ xác nhận (Hiến chương 5.17). Ngoài khoảng 12 ca của ADR-0147, thêm ít nhất: cùng khách sạn hai cấp khác nhau; dòng «tour X miễn phí» gặp dòng «cấp 3 trả tiền»; khách lẻ; đối tác chưa có cấp; đối tác hai vai trò hai cấp; đơn đại lý trả sau có phí đón; dòng 0 đồng trên biên nhận; xe riêng của đối tác có cấp; chiều về có số người riêng và em bé.
- Bốn đợt: A vùng đón; B bảng phí, Thử tra, màn đặt phí; C dòng phí trên đơn, công nợ, biên nhận; D chủ đếm nơi đón gõ tay rồi Quản trị xếp vùng, đặt mức, đặt «ngày bắt đầu áp». Đợt A, B không tạo dòng tiền, phát hành được trước.
- Số migration lấy lúc thi công.

## Tiêu chí nghiệm thu (thêm vào các tiêu chí của ADR-0147 không bị thay)
- Cùng vùng, cùng dịch vụ, cùng ngày: đơn của đối tác cấp A và cấp B ra hai số khác nhau đúng theo bảng; đơn khách lẻ ra mức của dòng để trống ô cấp.
- Có dòng «dịch vụ X, mọi cấp, 0 đồng» và dòng «cấp 3, mọi dịch vụ, 50.000»: đối tác cấp 3 đặt dịch vụ X ra 0 đồng.
- Đặt dòng thứ hai trùng hẳn bộ điều kiện và trùng ngày: bị từ chối, không ghi gì.
- Đối tác hai vai trò hai cấp: văn phòng xác nhận nhận 409 thiếu mức với câu báo riêng; gán cấp riêng xong thì xác nhận được.
- Đối tác đổi cấp sau khi đơn đã xác nhận: phí của đơn không đổi; mã cấp đã chụp còn nguyên.
- Đơn đại lý trả sau có phí đón 100.000: Tổng công nợ tăng đúng 100.000, hoa hồng không đổi một đồng.
- Chặng xe riêng của đối tác cấp 3, bảng có dòng «cấp 3, theo khách» và dòng «xe riêng, theo chuyến»: ra mức theo chuyến. Đặt dòng theo chuyến không có khoá xe riêng: bị từ chối.
- Dịch vụ 2 người lớn + 1 em bé: chiều đi tính 2 khách; chiều về ghi 3 người vẫn tính 2. Sửa số người chiều về sau xác nhận: tổng đơn không đổi.
- Một vùng đang bật chưa có dòng chung: đặt «ngày bắt đầu áp» bị từ chối, câu báo nêu tên vùng. Đang áp, kết thúc dòng chung cuối của một vùng: bị từ chối.
- Thêm một khoá điều kiện giả: `orders`, `van-chuyen`, `ve-dien-tu` không phải sửa dòng nào.
- Biên nhận đơn có chặng miễn phí: có dòng «Phí đưa đón — Miễn phí».
- Thử tra trả cùng số, cùng mã quy tắc với đơn thật trong mọi ca của sổ vàng.
