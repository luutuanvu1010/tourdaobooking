# Phí đưa đón theo khu vực, cấp độ đại lý và dịch vụ — bản thiết kế

- **Ngày:** 2026-11-14. **Loại:** hồ sơ có ngày (viết xong đóng băng). **Trạng thái:** chủ dự án duyệt 2026-11-14 trong chat (mục 8). ADR bổ sung: `2026-11-14-phi-don-theo-cap-va-dich-vu/DE-XUAT-ADR-bo-sung.md`, chờ duyệt riêng.
- **Loại việc:** việc lớn (tiền, dữ liệu). Thi công xong phải có người kiểm độc lập (`CLAUDE.md` §3).
- **Nối tiếp:** ADR-0147 (phí đưa đón, accepted 2026-10-28, **chưa có mã**), ADR-0149 Đ2 (khoá dịch vụ trong biểu phí, hẹn làm cùng lượt phí đón), đặc tả `2026-10-14-dot-2-gia-dua-don.md`.
- **Bản này KHÔNG sửa ADR-0147.** Phần mới đi vào một ADR bổ sung do chủ duyệt (mục 5). Số ADR và số migration lấy lúc thi công, sau khi liệt kê mọi nhánh chưa gộp (hôm nay lớn nhất là ADR-0202 và migration 0162 ở worktree này).

## 1. Chủ dự án muốn gì và vì sao (lời chủ 14/11)

Dịch vụ hoặc vé đã bật đưa đón thì mỗi lượt đón có một mức: có mức miễn phí, có mức thu tiền. Mức bao nhiêu tuỳ, nguyên văn: «Tình hình kinh doanh, cấp độ đại lý, nhóm dịch vụ/dịch vụ cụ thể, khu vực đón». Chủ nói thêm: cùng một khách sạn, cùng một tour, đại lý cấp cao nhất và cấp thấp nhất được tính khác nhau; khách sạn xa trung tâm thì giá đón cao hơn; giá đón «sẽ được cập nhật» theo mức cạnh tranh trên thị trường và chiến lược kinh doanh.

Vì sao: chủ cần dùng phí đón làm công cụ cạnh tranh và chính sách đại lý, đổi được ngay từ màn hình, không phải nhờ sửa Nền tảng.

Chủ đã chọn **Cách 1: một bảng phí duy nhất** (mục 4).

## 2. Mục tiêu, không làm, điều phải tránh

**Mục tiêu**
1. Quản trị hoặc Toàn quyền đặt mức đón theo bốn thứ: khu vực đón, cấp độ đại lý, nhóm dịch vụ hoặc dịch vụ cụ thể, và ngày hiệu lực. Mức 0 đồng nghĩa là miễn phí.
2. Máy tự tính và thêm dòng «Phí đưa đón» vào đơn; không ai gõ tay số tiền.
3. Đổi bảng phí không làm đổi đơn đã xác nhận.
4. Trước khi lưu một mức, Quản trị thử tra được một tình huống sẽ ra mức nào.

**Không làm ở lượt này** (giữ nguyên phần «Không làm» của ADR-0147)
- Giảm theo phần trăm, giảm tay có lý do, mã khuyến mại.
- Phí theo giờ, theo mùa, theo loại khách. Bảng để sẵn chỗ, mỗi điều kiện mới cần ADR riêng.
- Phía chi (tiền thuê xe), lãi lỗ theo chuyến.
- Tự đổi phí khi thêm, bỏ, thay chặng sau xác nhận (ADR-0147 Đ3 giữ nguyên: dùng điều chỉnh sổ công nợ).

**Điều phải tránh (làm được mà vẫn hỏng)**
- Thiếu mức mà máy lấy 0 đồng. Thiếu mức luôn là «thiếu mức», không bao giờ là miễn phí (Hiến chương 5.7). Miễn phí phải là một dòng 0 đồng được đặt rõ ràng.
- Một bộ «cấp» thứ hai riêng cho phí đón. Chỉ dùng «Cấp độ đại lý» đã có (`prc_rate_tier`).
- Phí đón bị tính hoa hồng, hoặc bị bỏ sót khỏi công nợ đại lý.
- Hai dòng cùng khớp mà máy chọn bừa một dòng.

## 3. Hiện trạng (đã đọc mã ngày 14/11)

- **Chưa có mã phí đón nào** trong `src/`, `migrations/`, `golden/`. Sổ vàng `golden/phi-dua-don.json` chưa soạn.
- **Chặng đưa đón** (`ord_transfer_leg`): mỗi chặng thuộc đúng một dòng dịch vụ (`order_service_id`), có chiều (`direction`), nơi đón và nơi trả (mã địa điểm hoặc chữ gõ tay), cờ xe riêng (`exclusive_vehicle`), số khách chiều về (`pax_override`, trống thì theo số khách của dịch vụ). Chặng không mang tiền (ADR-0047).
- **Đơn do tài khoản Đối tác lập** có chặng, có nơi đón, **không có giờ đón** (ADR-0154). Bảng phí lượt này không có điều kiện giờ nên không vướng (đóng mục `BL-DV2-PHI-DON` của `docs/BACKLOG.md` theo hướng: lượt này không dùng giờ).
- **Vé** (`ve-dien-tu`) luôn gắn với dòng dịch vụ của một đơn thường; không có luồng đặt vé ngoài đơn. Vậy «vé có đón» chính là dịch vụ có vé và có chặng: phí đón tính theo chặng, phân hệ vé không phải sửa.
- **Cấp độ đại lý**: định nghĩa ở `prc_rate_tier`; gán cho cả vai trò (`prc_role_tier`) hoặc riêng một đối tác (`prc_party_tier`, «cấp riêng»). Cấp riêng thắng cấp vai trò. Một đối tác có thể chưa có cấp nào. Đơn văn phòng lập cho khách lẻ không có bên đặt, nên không có cấp. `pricing/index.ts` **chưa có** hàm công khai trả «mã cấp của một hồ sơ vào ngày X» (đang có `capHienHanhCuaHoSo` trong `rules.ts`, chưa xuất).
- **Dòng tiền của đơn** (`order_item`): không có cột loại dòng; `service_id` cho phép trống. Sinh ở `buildLines` (`src/shared/order-lines.ts`).
- **Công nợ đại lý theo giá đại lý** (ADR-0182, `orders/gia-dai-ly.ts:ghepGiaDaiLy`): chỉ cộng các dòng có `service_id`. Một dòng phí đón không gắn dịch vụ sẽ **bị bỏ sót**; còn nếu gắn vào dịch vụ thì bị cộng vào thành tiền dịch vụ và **bị tính hoa hồng**. Cả hai đều sai, nên phải sửa hàm này (mục 5, ĐB3).
- **Biên nhận** (`receipt/rules.ts:dungBienNhan`): danh sách trắng, dòng tiền chỉ nằm trong từng dịch vụ; chưa có chỗ cho dòng ngoài dịch vụ.
- **Bản chụp hoa hồng** (`ord_service_terms`) không lưu mã cấp. Phí đón phải tự chụp mã cấp đã dùng.
- **Lỗi đang mở TNV-G1** (đơn huỷ vẫn hiện còn nợ): hạn nay là 2026-12-31. ADR-0147 ghi phí đón không phát hành trước khi mục này đóng (cách hiểu của người chép, chủ sửa được bằng một câu).

## 4. Các cách đã cân nhắc

| Cách | Nội dung | Được | Mất |
|---|---|---|---|
| **1. Một bảng phí, thêm điều kiện (chủ chọn)** | Mỗi dòng: khu vực, cấp, nhóm hoặc dịch vụ, chiều, xe riêng, ngày hiệu lực, số tiền. Ô nào cũng để trống được («mọi…»). Dòng cụ thể nhất thắng. | Một quy tắc, nhìn bảng là biết kết quả; nối thẳng vào ADR-0147 (điều kiện vốn là dòng khoá–giá trị, thêm khoá không đổi bảng). | Nhiều dòng hơn; tăng giá gốc phải đặt lại từng dòng. |
| 2. Hai lớp: giá gốc theo khu vực + ưu đãi theo cấp | Bảng giá gốc, rồi bảng giảm theo cấp. | Ít dòng; đổi giá gốc thì mọi cấp tự theo. | Hai quy tắc chồng nhau, cần luật làm tròn và trần giảm; sổ vàng dài gấp đôi; phần giảm giá vốn đã tách sang ADR sau. |
| 3. Gộp phí đón vào giá đại lý của dịch vụ | Không có dòng phí riêng. | Không thêm bảng. | Giá đại lý không biết khách đón ở đâu, không làm được «xa thì đắt hơn». Loại. |

Chủ chọn Cách 1 ngày 14/11. Lý do người soạn khuyên: chủ cần đổi mức nhanh và chắc; một bảng dễ hiểu thì ít đặt nhầm tiền; sau này vẫn thêm được lớp ưu đãi mà không bỏ bảng này.

## 5. Thiết kế

Mọi điều của ADR-0147 (Đ1 vùng đón, Đ2 bảng phí, Đ3 dòng phí trên đơn) giữ nguyên và là nền của bản này; người thi công đọc ADR-0147 cùng tệp này. Dưới đây chỉ ghi phần **thêm**. Ba điều ĐB1–ĐB3 chạm tiền hoặc dữ liệu, là nội dung của ADR bổ sung (đúng trần 3 quyết định mỗi lượt duyệt).

### ĐB1 — Hai điều kiện mới của bảng phí: «cấp độ đại lý» và «dịch vụ cụ thể»

- Thêm hai khoá vào bảng tra cứu khoá điều kiện của ADR-0147 Đ2, mỗi khoá một bộ tính trong danh sách đăng ký ở mã:
  - **cấp độ đại lý**: giá trị là mã `prc_rate_tier` đang bật;
  - **dịch vụ cụ thể**: giá trị là mã dịch vụ trong danh mục (`catalog_code` của dòng dịch vụ mà chặng thuộc về).
- Một dòng phí không được vừa có khoá «nhóm dịch vụ» vừa có khoá «dịch vụ cụ thể» (dịch vụ đã nằm trong nhóm). Máy chủ từ chối.
- Khoá «vùng» vẫn bắt buộc như ADR-0147. Các khoá khác để trống nghĩa là «mọi…».
- **Chọn mức khi nhiều dòng cùng khớp** — thay câu «đếm số điều kiện» của ADR-0147 Đ2 bằng thứ tự cố định, để không còn hai dòng ngang bậc:
  1. dòng nêu đích danh **dịch vụ** thắng dòng không nêu;
  2. ngang nhau thì dòng nêu **cấp độ đại lý** thắng;
  3. ngang nhau thì dòng nêu **nhóm dịch vụ** thắng;
  4. ngang nhau thì dòng nêu **chiều** thắng.
  - **Xe riêng không nằm trong thứ tự này mà chia bảng làm hai nửa tách hẳn [người soạn]:** chặng xe riêng chỉ khớp các dòng tính theo chuyến (`PER_TRIP`, bắt buộc có khoá xe riêng); chặng đi chung chỉ khớp các dòng tính theo khách (`PER_PAX`, không được có khoá xe riêng). Máy chủ từ chối dòng sai cặp. Lý do: nếu để chung, dòng «cấp 3, 50.000 mỗi khách» sẽ thắng dòng «xe riêng 500.000 mỗi chuyến» và đối tác cấp 3 thuê xe riêng với giá đi chung.
  - Hai dòng có đúng cùng bộ điều kiện và trùng khoảng ngày bị chặn ngay lúc đặt. Khuôn trigger của `prc_commission_rule` không chép thẳng được vì điều kiện nằm ở dòng con; người thi công chọn một trong hai: cột «chữ ký bộ điều kiện» trên dòng quy tắc có chỉ mục và trigger chống chồng (ưu tiên, vì CSDL bảo đảm), hoặc chặn ở máy chủ trong cùng lô ghi. Dù cách nào, hàm chọn mức vẫn phải trả «xung đột» (xử lý như thiếu mức) nếu gặp hai dòng ngang bậc khác số, không chọn bừa.
  - **Đủ mức trước khi bật [người soạn]:** máy từ chối đặt «ngày bắt đầu áp» khi còn một vùng đang bật (kể cả `NGOAI_VUNG`) chưa có **dòng chung** cho chặng đi chung (để trống cấp, dịch vụ, nhóm, chiều) còn hiệu lực; khi đang áp, máy từ chối kết thúc dòng chung cuối cùng của một vùng nếu chưa có dòng chung nối tiếp. Chặt hơn ADR-0147 (chỉ đòi `NGOAI_VUNG`), để khách lẻ và đối tác chưa có cấp không bị kẹt đơn. Xe riêng không bắt buộc có dòng chung: thiếu thì đơn có chặng xe riêng báo thiếu mức như ADR-0147.
  - Thứ tự «dịch vụ thắng cấp»: chủ chọn 14/11 (mục 8, câu 1).
- **Thử tra** (đã có ở ADR-0147) nhận thêm hai ô: cấp độ đại lý (hoặc «khách lẻ») và dịch vụ. Kết quả nêu dòng thắng và các dòng thua, mỗi dòng một câu vì sao.
- Màn đặt bảng phí: người soạn đề xuất đặt cạnh màn «Cấp độ đại lý» hiện có (cùng người dùng, cùng khuôn ngày hiệu lực). Bố cục màn hình để chủ duyệt bằng ảnh thật ở bước kế hoạch, không chốt ở đây.

### ĐB2 — Cấp của một đơn dùng để tính phí đón

- `pricing` thêm một hàm công khai **mới**: «mã cấp độ đại lý của hồ sơ X vào ngày D»: có cấp riêng còn hiệu lực ngày D thì lấy cấp riêng; không thì lấy cấp của vai trò. Đây là hàm viết mới nhận ngày (hàm `capHienHanhCuaHoSo` hiện có chỉ tính hôm nay và chỉ cho hồ sơ mang vai trò được hưởng). Lưu ý hoa hồng KHÔNG chọn theo một «mã cấp của hồ sơ» mà xét 9 bậc theo từng dịch vụ (`chonMuc`), nên một đối tác hai vai trò hai cấp có thể vẫn ra hoa hồng mà bị chặn vì phí đón (xem dưới); đó là chủ ý.
- Ngày xét là **ngày xác nhận**, như mọi hiệu lực khác của ADR-0147.
- Ba trường hợp không ra được một cấp:
  - **Đơn không có bên đặt là đối tác** (văn phòng lập cho khách lẻ, hoặc bên đặt là công ty chủ): tính là «không có cấp». Chỉ các dòng phí để trống ô cấp mới khớp.
  - **Đối tác chưa được gán cấp nào**: cũng tính là «không có cấp» **[người soạn]**. Lý do: không chặn đơn chỉ vì Kế toán chưa gán cấp; đối tác đó trả mức chung.
  - **Đối tác có hai vai trò mang hai cấp khác nhau, không có cấp riêng**: coi là «thiếu mức», xử lý như thiếu mức của ADR-0147 Đ3 (văn phòng không xác nhận được, câu báo nêu «cần gán cấp riêng cho đối tác …»; đơn Đối tác gửi thì vào «chờ xác nhận»). **[người soạn]** Lý do: máy không được tự chọn cấp có lợi hay bất lợi.
- **Chụp**: lúc xác nhận, dòng phí chụp thêm **mã cấp đã dùng** (hoặc trống) bên cạnh mã quy tắc và số tiền mà ADR-0147 đã yêu cầu. Sau xác nhận, đối tác đổi cấp không làm đổi phí của đơn cũ.
- **Đổi bên đặt sau xác nhận** (ADR-0188): phí đã chụp giữ nguyên, cùng nguyên tắc với đổi chặng sau xác nhận ở ADR-0147 Đ3 **[người soạn]**.
- Đơn nháp: tính lại mỗi lần lưu theo cấp của ngày hôm đó, hiện «dự kiến» (như ADR-0147).
- **Nơi ghép dòng phí:** ADR-0147 Đ3 viết dòng phí «sinh trong `buildLines`». `buildLines` (`src/shared/order-lines.ts`) là hàm thuần, chạy cả ở trình duyệt và không được import `src/modules/`. Vậy dòng phí được ghép ở `orders` **phía máy chủ**, ngay sau `buildLines`, trên cùng đường lưu nháp và xác nhận; ý của Hiến chương 5.4 (tiền chỉ tính ở máy chủ, một chỗ) giữ nguyên. Form không tự tính số «dự kiến»: nó hiện số máy chủ trả về sau khi lưu nháp.
- **Số khách tính tiền của một chặng đi chung [người soạn; Kế toán xác nhận ở sổ vàng]:**
  - bằng số khách tính tiền của dịch vụ mà chặng thuộc về (người lớn, trẻ em, người cao tuổi; không đếm em bé);
  - chiều về có số người riêng (`pax_override`) thì lấy số đó, nhưng không quá số khách tính tiền của dịch vụ;
  - ra 0 khách tính tiền thì không sinh dòng phí cho chặng đó (không phải «thiếu mức»);
  - dòng phí chụp số khách đã tính và đơn giá. Sau xác nhận, sửa `pax_override` (ô `order.trip.edit`) **không** đổi phí, cùng lý do với thêm, bỏ chặng ở ADR-0147 Đ3; chỉ «sửa số khách» của dịch vụ (ô `order.money.edit`) mới tính lại, theo đơn giá đã chụp.

### ĐB3 — Phí đón trong công nợ đại lý và trên giấy tờ

- **Dòng phí là dòng riêng, không thuộc thành tiền của dịch vụ nào.** `order_item` thêm cột loại dòng (dịch vụ / phí đưa đón) và cột trỏ về chặng; dòng phí để `service_id` trống. Migration chỉ thêm cột, dòng cũ mặc định là loại dịch vụ.
- **Không tính hoa hồng** (ADR-0147 giữ nguyên).
- **Công nợ đại lý (ADR-0182)**: Tổng công nợ của đơn = tổng giá đại lý các dịch vụ **cộng đủ** các dòng phí đón. Sửa `ghepGiaDaiLy`. Hôm nay chưa có dòng thật nào để trống `service_id` (migration `0008` đã gán hết), nên **mọi** nơi đọc dòng tiền theo dịch vụ đều chưa từng gặp loại dòng này: người thi công phải rà hết (phải thu bán lẻ, «Đã thu», `effectiveService` / `effectiveSubtotal`, `chiaPhanNguoiBan`, biên nhận, phiếu công nợ, QR) và ghi kết quả rà vào kế hoạch. Trigger `0081` buộc tạm tính bằng tổng mọi dòng lúc xác nhận, nên phí đón chắc chắn nằm trong tạm tính và trong `total` mà cổng hạn mức Trả sau (`tra-sau-cong.ts`) đang dùng. Chủ chọn 14/11 (mục 8, câu 2).
- **Hạn mức trả sau**: phí đón nằm trong số nợ nên tính vào hạn mức đã dùng, không có luật riêng.
- **Biên nhận và phiếu công nợ**: thêm mục «Phí đưa đón» vào danh sách trắng, mỗi chặng một dòng, thuộc phần của Tour Đảo (ADR-0147). Dòng 0 đồng vẫn in, ghi «Miễn phí» **[người soạn]**, để khách và đại lý thấy mình được miễn chứ không phải máy quên.
- Chữ mới trên giao diện («Phí đưa đón», «Miễn phí», «Thử tra», tên các ô điều kiện) phải có trong `docs/BANG-THAM-CHIEU.md`; tên nào chưa có thì đưa 2–3 phương án cho chủ chọn ở bước kế hoạch.

### Ranh giới phân hệ (giữ đúng ADR-0147)

- `locations` giữ vùng, công bố view; `orders` đọc vùng và dịch vụ của chặng, gom thành một bộ dữ liệu phẳng (vùng, chiều, xe riêng, mã dịch vụ, mã nhóm, số khách tính tiền, mã hồ sơ bên đặt) rồi gọi `pricing` qua `index.ts`.
- `pricing` tự tra cấp từ mã hồ sơ bên đặt (bảng của chính mình), chọn mức, trả số tiền + mã quy tắc + mã cấp, hoặc «thiếu mức» kèm lý do.
- `van-chuyen` và `ve-dien-tu` không sửa dòng nào, không import `pricing`.

## 6. Thứ tự làm và điều kiện mở

1. **Chủ duyệt ADR bổ sung** (ĐB1–ĐB3) kèm trang ghép (bảng `order_item` nay chứa hai loại dòng; ai đọc, ai ghi).
2. **Sổ vàng `golden/phi-dua-don.json`** do Kế toán (hoặc chủ thay Kế toán) xác nhận **trước khi viết mã** (Hiến chương 5.17). Ngoài khoảng 12 ca của ADR-0147, thêm ít nhất: cùng khách sạn hai cấp khác nhau; dòng «tour X miễn phí» gặp dòng «cấp 3 trả tiền»; khách lẻ; đối tác chưa có cấp; đối tác hai vai trò hai cấp; đơn đại lý trả sau có phí đón (số nợ); dòng 0 đồng trên biên nhận.
3. **Thi công theo bốn đợt**, mỗi đợt đỏ trước xanh sau:
   - Đợt A: vùng đón (ADR-0147 Đ1) và màn xếp vùng.
   - Đợt B: bảng phí, hai khoá mới, hàm chọn mức, Thử tra, màn đặt phí (chưa đụng đơn).
   - Đợt C: dòng phí trên đơn, chụp lúc xác nhận, cổng thiếu mức, công nợ đại lý, biên nhận.
   - Đợt D: câu đếm chỉ đọc nơi đón gõ tay trên dữ liệu thật (chủ chạy), rồi Quản trị xếp vùng, đặt mức, đặt «ngày bắt đầu áp».
   - Đợt A và B phát hành được sớm vì chưa tạo dòng tiền nào. Đợt C là đợt chạm tiền.
4. **Điều kiện phát hành Đợt C**: mục TNV-G1 của `docs/quyen-hoan.json` đã đóng, xem mục 8, câu 3.
5. Trước «ngày bắt đầu áp», Nền tảng chạy y như hôm nay (ADR-0147).

## 7. Tiêu chí nghiệm thu thêm (ngoài các tiêu chí của ADR-0147)

- Cùng vùng, cùng dịch vụ, cùng ngày: đơn của đối tác cấp A và cấp B ra hai số khác nhau đúng theo bảng; đơn khách lẻ ra mức của dòng để trống ô cấp.
- Có dòng «dịch vụ X, mọi cấp, 0 đồng» và dòng «cấp 3, mọi dịch vụ, 50.000»: đối tác cấp 3 đặt dịch vụ X ra 0 đồng (theo thứ tự ĐB1; đổi nếu chủ chọn khác ở câu 1).
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

## 8. Chủ dự án đã quyết (chat 14/11)

Nguyên văn câu trả lời: «1- dịch vụ thắng, 2- có, cộng vào số đại lý nợ, 3- sửa luôn phần chạm tiền bị lỗi, giải thích thêm. Duyệt theo đề xuất».

1. **Dòng «theo dịch vụ» và dòng «theo cấp» cùng khớp:** dịch vụ thắng. Thứ tự ở ĐB1 giữ nguyên.
2. **Đơn đại lý:** phí đón cộng đủ vào số đại lý nợ công ty. ĐB3 giữ nguyên.
3. **Lỗi «đơn huỷ vẫn hiện còn nợ» (TNV-G1):** chủ muốn sửa luôn, không để phần chạm tiền của phí đón phải chờ. Hiện trạng đọc ở `docs/quyen-hoan.json` và `2026-11-09-dot-4-hoi-chu.md`: phần sửa đã chạy trên production từ bản 2.42 (29/10); mục sổ chưa đóng vì còn ba việc không phải mã: chủ hoặc Kế toán xác nhận năm ca sổ vàng 01, 02, 04, 08, 13; ca 07 chờ đặc tả phiếu chi; chủ chạy lệnh kiểm dữ liệu production. Điều kiện phát hành Đợt C ở mục 6 vì vậy vẫn là «mục TNV-G1 đã đóng», và việc cần làm là đóng mục đó, không phải viết mã sửa lỗi. Cách đóng (nhất là ca 07) chờ chủ trả lời sau khi nghe giải thích; ghi ở ADR bổ sung.

Chủ duyệt bản thiết kế này cùng câu trả lời trên. Các chỗ **[người soạn]** được duyệt theo đề xuất, sau khi đã nêu riêng với chủ trong chat (xe riêng tách khỏi đi chung; khách lẻ và đối tác chưa có cấp trả mức chung; đối tác hai vai trò hai cấp phải gán cấp riêng; mỗi vùng phải có mức chung trước khi bật; em bé không tính, chặng miễn phí vẫn in dòng).

**Bổ sung cùng ngày, sau khi chủ đọc bảng ví dụ (ca SV-PD-10).** Chủ hỏi có nên «giá trị nào cao hơn thì áp»; người soạn nêu hệ quả (mọi mức ưu đãi thấp hơn mức chung sẽ không bao giờ được áp, trái câu «dịch vụ thắng»). Chủ chọn, nguyên văn: «Giữ thứ tự, thêm cảnh báo». Vậy:

4. **Thứ tự chọn mức ở ĐB1 giữ nguyên** (dịch vụ, rồi cấp, rồi nhóm, rồi chiều). Ca SV-PD-10 đúng như đã soạn.
5. **Thêm cảnh báo lúc lưu mức (không chặn):** khi Quản trị lưu một dòng mức mà sau đó có tổ hợp (vùng, dịch vụ, chiều, đi chung hay xe riêng) khiến một cấp độ đại lý trả **cao hơn** mức của bên không có cấp, màn đặt mức hiện cảnh báo nêu rõ cấp nào, dịch vụ hoặc nhóm nào, hai con số. Quản trị vẫn lưu được. Cảnh báo tính bằng chính hàm chọn mức, không viết luật thứ hai. Thuộc Đợt A (màn đặt mức); chữ cảnh báo do chủ duyệt ở bước kế hoạch. Tiêu chí nghiệm thu: với bảng mẫu của sổ vàng, lưu dòng P06 (Bãi Dài, cấp 3, 80.000 đ) khi đã có P09 (nhóm Hòn Tằm 70.000 đ) thì cảnh báo hiện; thêm dòng «cấp 3 + nhóm Hòn Tằm 70.000 đ» thì hết.

## 9. Để người thi công tự quyết

Tên bảng, tên cột, số migration, cách lưu lý do «thiếu phí đón», bố cục chi tiết các màn (trình ảnh thật cho chủ), cách chia commit, kịch bản e2e và Chrome. Mọi thứ chạm quyền, tiền, dữ liệu ngoài những gì đã ghi ở ADR-0147 và mục 5 thì dừng và hỏi chủ.
