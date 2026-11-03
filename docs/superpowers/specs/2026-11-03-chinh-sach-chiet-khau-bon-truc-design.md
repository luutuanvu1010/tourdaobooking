# Đặc tả — Chính sách chiết khấu theo bốn trục ở trang Hoa hồng đối tác

> Bản 2, 2026-11-03, AI soạn, **chờ chủ duyệt, chưa thi công**. Bản 2 sửa theo một vòng đọc độc lập và các lần chạy thử cùng ngày. Việc lớn (tiền, dữ liệu, quyền): duyệt xong chép phần quyết định thành ADR số kế tiếp (0160 đang dùng ở nhánh `worktree-rut-gon-claude-md`, nên dự kiến 0161, kiểm lại số lúc chép), rồi kế hoạch, thi công, người kiểm độc lập.
> Xây trên lỗ đang hở: không. Bốn mục `thao_tac` và sáu mục `phat_hien` của `docs/quyen-hoan.json` không chạm việc nhập mức (người đọc độc lập đã rà 3/11). Điều kiện chung: `HC-5.19` (diễn tập khôi phục) hạn 2026-11-05, quá hạn thì `npm test` đỏ tới khi chủ diễn tập hoặc gia hạn.

## 0. Vì sao

Sau lần xoá dữ liệu thử (ADR-0158), Kế toán phải nhập lại toàn bộ mức: hơn 100 dịch vụ nhân sáu cấp, tức khoảng 720 ô. Hôm nay mỗi mức là một lần mở hộp rồi tìm dịch vụ, còn bảng cấp nhân dịch vụ chỉ để xem. Chủ nghĩ theo hàng và cột (Vé Vinpearl qua TA1 đến TA6), nên màn nhập phải theo đúng hình đó.

**Được coi là hỏng dù vẫn chạy:** có hai nơi lưu mức; đơn đã xác nhận đổi số; số âm hiện lên màn hình; đổi giới hạn làm đổi mức cũ.

## 1. Quyết định của chủ (chat 2026-11-03)

| # | Quyết định |
|---|---|
| 1 | Đặt chính sách ở trang Hoa hồng đối tác, không đưa lên trang Dịch vụ & giá. |
| 2 | Bốn trục độc lập: Cấp đại lý, Dịch vụ, «Tính bằng», «Áp cho». |
| 3 | «Tính bằng»: phần trăm, số tiền. «Áp cho»: mọi khách như nhau, riêng từng loại khách. Hai danh sách để sẵn, không thêm bớt trên màn hình. |
| 4 | Bỏ phần trăm riêng theo loại khách, vì phổ biến vẫn là số tiền theo loại khách. |
| 5 | Hoa hồng không thể vượt thành tiền. |
| 6 | Trần 50% và bước 1.000 đ; hai số này đổi được trên bảng điều khiển của Toàn quyền, không khoá cứng trong mã. |
| 7 | «Điều kiện áp dụng» là ghi chú để đọc. Sau này cụ thể hoá theo doanh thu, quy mô, cam kết (`docs/BACKLOG.md` mục 62). |

Hai việc chủ nêu cùng lúc nhưng **không thuộc đặc tả này**: bảng đồng bộ Sheet và bảng quyền (BACKLOG mục 62). Kế toán **không cần sửa quyền**: đã thử, Kế toán đọc và ghi được ở trang Hoa hồng (ô `partner.commission.write`).

## 2. Mô hình: các trục đã có, không thêm bảng cho trục

| Trục | Nơi ở hiện có | Sửa trên màn hình |
|---|---|---|
| Cấp đại lý | `prc_rate_tier` | Thêm, sửa tên, ghi chú; bớt là khoá, không xoá |
| Dịch vụ | danh mục từ Sheet; phạm vi một dịch vụ, một nhóm, tất cả | Không sửa ở trang này |
| Tính bằng | `prc_commission_rule.kind` (`RATE`, `PER_PAX`) | Không, tập đóng vì mỗi giá trị là một công thức (Hiến chương 2.2) |
| Áp cho | có hay không dòng `prc_commission_rule_pax` | Không, tập đóng; chỉ đi với số tiền |
| Số, ngày, ghi chú | dòng `prc_commission_rule` | Nhập tay |

Vai trò → cấp (`prc_role_tier`) và công ty → cấp (`prc_party_tier`) giữ nguyên. **Không** tạo bảng «gói chiết khấu» dùng chung: mỗi dòng thuộc đúng một cấp và một dịch vụ, nên sửa TA1 không thể lén đổi TA2. Đây cũng là cách dòng giảm giá nằm trong danh sách giảm giá của Oracle Advanced Pricing.

## 3. Phần việc

### A. Bảng nhập (không thêm route ghi, không thêm quyền)

Trong thẻ «Cấp độ đại lý», khổ từ 900 trở lên, bảng cấp nhân dịch vụ đang có trở thành bảng nhập:

1. **Hàng:** «Mọi dịch vụ», các nhóm, rồi **mọi** dịch vụ trong danh mục (hôm nay `maTranCap` chỉ giữ hàng đã có mức). Có ô tìm, lọc theo nhóm, và lọc «còn thiếu mức» tính bằng luật phủ mức đã có (`phuMucCap`), không viết luật thứ hai.
2. **Cột:** cột giá bán lẻ (người lớn, trẻ em, người cao tuổi) lấy từ `GET /api/catalog`, rồi một cột cho mỗi cấp theo danh sách cấp. Không cố định sáu cột.
3. **Bấm ô:** ô trống mở hộp «Thêm mức» đã điền sẵn cấp và phạm vi; ô có mức mở các việc Đổi, Sửa, Ngừng như hôm nay. Chỉ dùng các route đang có. Người không có ô ghi (Bán hàng) chỉ xem. Tài khoản giữ quyền Đối tác không vào trang, như hôm nay.
4. **Hộp nhập:** hai ô «Tính bằng» và «Áp cho» thay cho ô «Cách tính» và ô tích theo loại khách. Chọn phần trăm thì «Áp cho» khoá ở «Mọi khách như nhau». Hộp hiện giá đại lý xem trước bằng luật thuần ở `src/shared/`; `web/` không tự tính tiền.
5. **Khổ dưới 900:** giữ danh sách theo từng cấp, dùng cùng các hộp.
6. **Ẩn lối đi tắt:** vai trò chỉ nên đi qua cấp (AI khuyên, chủ đồng ý chung 3/11), nên bỏ cả hai lối thêm mức riêng cho vai trò trên giao diện: nút «Thêm mức riêng cho vai trò này» (`web/hoa-hong-loai.ts`) và lựa chọn «Vai người dùng» trong hộp của nút «＋ Thêm mức» đầu trang (`web/hoa-hong-hop.ts`). Hộp đó còn lại lựa chọn «Một đối tác», giữ làm ngoại lệ. Route và luật chọn mức không đổi, nên đảo được.

Chữ ở ô «—» giữ nguyên nghĩa `CAU_O_TRONG`. Dòng đã có, thứ tự chọn mức, bản chụp lúc xác nhận: không đổi.

### B. Giới hạn nhập, Toàn quyền đổi được

1. Bảng chỉ-thêm mới `prc_entry_limit_policy` theo khuôn `ord_confirm_policy` (migration 0119): `max_rate_bp`, `amount_step`, `valid_from_at` UNIQUE, người và giờ tạo; đổi là chèn dòng mới, dòng hiệu lực có `valid_from_at` lớn nhất. Gieo một dòng 5000 (50%) và 1000 (đ).
2. Toàn quyền đổi ở một mục mới của nhóm Thiết lập trên thanh bên, theo khuôn trang `veCaiDat`, cổng `settings.ops`. Không thêm ô quyền. Mỗi lần đổi ghi một dòng nhật ký.
3. Áp ở máy chủ cho mọi lệnh ghi mức của `pricing` có số mới: thêm mức, thêm dòng của cấp, Đổi, Sửa. Số 0 luôn được nhận (trẻ em không hưởng thì gõ 0). `Sửa` không đổi số thì không kiểm lại, để dòng cũ vẫn sửa được ngày sau khi giới hạn bị hạ.
4. Không áp lại dòng đã có; không đụng đơn đã chụp. Cột CSDL giữ `CHECK` rộng như hôm nay, giới hạn chỉ ở máy chủ vì phải đổi được, ghi ở `docs/SO-HANG-RAO.md` kèm ngày quan sát chặn thật.
5. «Ghi mức tay» cho một đơn **không** áp giới hạn này, vì đây là đường ngoại lệ (người soạn chọn). Lúc ghi tay máy không so với giá; rào duy nhất của đường này là bước Đã giao.

### C. Hoa hồng không vượt thành tiền

**Hiện trạng đã chạy thử:** mức 500.000 đ/khách cho vé 300.000 đ được nhận; đơn 2 khách xác nhận được, màn hình hiện hoa hồng 1.000.000 đ, giá đại lý −400.000 đ; bấm Đã giao thì `tinhTrangThuongMai` trả trạng thái `VUOT`, route trả 409 `not_deliverable` với câu của `terms_exceed_price`, sổ công nợ không có dòng nào. Vậy **rào sổ đã có**, chỉ báo muộn.

**Mức vượt còn nới trần giảm giá, đã chạy thử tới cuối:** trên đơn có người hưởng, trần giảm giá của mọi người sửa đơn, không riêng đối tác, bằng tổng hoa hồng thô của đơn (`tranGiamGiaDon`). Với mức «tất cả dịch vụ» 500.000 đ/khách, tài khoản Đối tác lập được đơn 600.000 đ giảm hết còn 0 đ (201), bấm Gửi đơn là xác nhận ngay (nhánh B). Đã giao vẫn 409, sổ rỗng. Kế toán ghi mức tay 100.000 đ/khách rồi Đã giao thì 200: sổ ghi hoa hồng 200.000 đ và `GIAM_GIA_BEN_DAT` 600.000 đ, đơn hiện cảnh báo vượt 400.000 đ. Đối chứng với mức 100.000 đ/khách: 400 `discount_exceeds_commission`, giảm tối đa 200.000 đ.

Vậy **sổ không sai**, phần giảm vượt thành khoản đối tác nợ Tour Đảo. Rủi ro còn lại là khoản nợ đó không ai định cho, và đơn 0 đ đã xác nhận nên có thể đi tiếp tới phân công trước khi ai thấy nó bị giữ (phần sau suy ra từ luồng, chưa thử).

Thêm ba việc, không đổi công thức hoa hồng:

1. **Lúc nhập:** dòng phạm vi một dịch vụ, tính bằng số tiền, vượt giá thì máy chủ trả 400 bằng câu tiếng Việt. «Riêng từng loại khách»: mỗi số so với giá bán lẻ hiệu lực của loại đó; loại không có giá thì bỏ qua. «Mọi khách như nhau»: so với giá cao nhất trong các loại có giá, để chỉ chặn lỗi gõ rõ ràng và không cản dịch vụ trẻ em miễn phí (người soạn chọn). Dịch vụ tính theo nhóm so số tiền mỗi lượt với giá mỗi lượt. Giá đọc qua chỗ `catalog` công bố, không đọc thẳng bảng. Phạm vi nhóm và tất cả không có một giá để so, nên vẫn dựa vào rào Đã giao và việc 3.
2. **Trên màn đơn:** dòng vượt hiện «Hoa hồng vượt thành tiền — Kế toán xem lại», không hiện số âm, ở cả phần văn phòng và phần đối tác. Đơn vẫn xác nhận được rồi giữ ở Đã giao, đúng ADR-0077 về thiếu mức.
3. **Trần giảm giá (chủ quyết riêng, AI khuyên làm):** khi tính trần, dòng vượt thành tiền được tính 0, như dòng thiếu mức đang được tính 0 (chế độ `tinh0` của `tongHoaHongDon`, các nơi dùng là `donChoTran` và `cauDoiBenDatVuotHoaHong`). Dòng vượt là dòng có hoa hồng lớn hơn thành tiền của chính dòng đó; bằng thì vẫn tính. Câu báo không được hiện «Giảm tối đa 0 ₫ (bằng hoa hồng của đơn)» khi màn đơn đang ghi hoa hồng lớn: trần về 0 vì dòng vượt thì nói mức đang vượt giá bán, Kế toán xem lại; trần còn số thì nói đã bỏ dòng vượt. Câu gợi ý ở form lập, sửa đơn dùng cùng số. Chế độ `null` của cảnh báo, số hoa hồng và sổ không đổi. Chủ để sau thì việc 1 và 2 vẫn đứng được, vì sổ đã an toàn; tiêu chí 7 đi theo việc này. Người lập kế hoạch rà bài `src/modules/orders/tran-giam-gia-don.test.ts` và ca sổ vàng của trần (ADR-0079); ca đã có phải giữ nguyên đáp án, ca mới về dòng vượt để Kế toán xác nhận (Hiến chương 5.17).

### D. Chữ

«Tính bằng», «Áp cho» thêm vào `src/shared/bang-tu-giao-dien.ts`. Ghi chú của cấp (đã có từ bản 2.54) có gợi ý ghi điều kiện áp dụng, và nói rõ máy không tự kiểm.

## 4. Ngoài phạm vi

Nhập từ tệp bảng tính (đặc tả riêng, làm ngay sau đặc tả này vì 720 ô bằng tay vẫn nặng; không dùng Sheet bảng giá vì Sheet đọc công khai). Gắn vai trò có sẵn cho hồ sơ công ty (ADR-0155 Đ1). Nhập bằng giá đại lý (ADR-0148 lượt 2). Phần trăm riêng theo loại khách (chủ bỏ). Một số tiền cho cả dòng dịch vụ. Điều kiện máy tự kiểm.

## 5. Tiêu chí nghiệm thu (đỏ trước, xanh sau)

1. Kế toán, Quản trị, Toàn quyền thấy đủ dịch vụ kèm giá bán lẻ và bấm ô nhập được; Bán hàng thấy nhưng không có nút ghi; tài khoản Đối tác vẫn 403.
2. Bấm ô trống của TA2 ở Vé A tạo đúng một dòng của TA2 phạm vi Vé A; đơn của công ty mang TA2 chụp đúng mức đó.
3. Với giới hạn gieo: 51% và 123.456 đ trả 400; 50%, 50.000 đ và 0 đ được nhận.
4. Toàn quyền đổi trần thành 60% thì 60% được nhận ngay; Kế toán, Quản trị gọi route đổi giới hạn nhận 403; có nhật ký; các dòng và đơn cũ không đổi.
5. Hạ trần xuống dưới một dòng đã có: dòng đó vẫn áp, vẫn «Sửa» ngày được; đổi số thì phải trong trần.
6. 500.000 đ cho vé bán 300.000 đ trả 400; cùng số đó ở phạm vi nhóm được nhận, đơn hiện chữ cảnh báo, không có số âm, Đã giao vẫn 409 và sổ không ghi. «Mọi khách như nhau» 100.000 đ cho dịch vụ người lớn 1.000.000 đ, trẻ em 0 đ được nhận.
7. Mức nhóm 500.000 đ/khách, vé 300.000 đ: đối tác và Bán hàng giảm 1 đ đều bị từ chối bằng câu nói rõ mức đang vượt, vì dòng vượt tính 0 khi tính trần. Đơn có mức đúng: trần và câu báo như hôm nay.
8. Chọn phần trăm thì không chọn được «Riêng từng loại khách»; gửi thẳng lên máy chủ vẫn 400.
9. Không còn lối giao diện nào thêm mới mức riêng của vai trò; dòng riêng đã có vẫn hiện, vẫn ngừng được.
10. Bảng 720 ô mở và tìm được trên Chrome ở khổ 1440 và 1040, không cuộn ngang cả trang; khổ 390 dùng danh sách. Ghi lại thời gian mở đo được.
11. `npm test`, `npm run typecheck`, e2e `muc-ta`, `so-dai-ly` và kịch bản Chrome của trang xanh. Người kiểm độc lập đọc lại mã.

## 6. Trang ghép (`CLAUDE.md` §9)

Ba quyết định chạm quyền, dữ liệu hoặc tiền trong lượt này: B (bảng mới), C.1 (chặn thêm ở route ghi mức của `pricing`), C.3 (trần giảm giá ở `orders`). A.6 không tính vào ba vì chỉ bỏ lối trên giao diện, đảo được, không đổi route hay ô quyền; vẫn ghi ở dòng giao diện bên dưới.

- **Bảng chứa gì:** `prc_commission_rule` vẫn chứa dòng mức của cấp, của vai trò, của đối tác; đặc tả không thêm loại nào. `prc_entry_limit_policy` chỉ chứa giới hạn nhập, không có số tiền của giao dịch.
- **Bản đồ quyền:** `partner.commission.view` (Bán hàng, Kế toán, Quản trị, Toàn quyền) xem bảng; `partner.commission.write` (Kế toán, Quản trị, Toàn quyền) ghi; `settings.ops` (chỉ Toàn quyền) đổi giới hạn. Không thêm ô, không đổi ô.
- **Cổng:** route ghi mức giữ `can` cộng `holdsPartner`; route giới hạn: đọc cổng `office` để hộp nhập biết giới hạn, ghi cổng `settings.ops`. Trần giảm giá: các cổng của `orders` đang dùng trần giữ nguyên (lập đơn, sửa nháp, gửi đơn, xác nhận, đổi bên đặt), C.3 chỉ đổi số đưa vào cổng.
- **Chỗ giao diện ẩn hiện:** ô bấm được theo `partner.commission.write`; mục Thiết lập mới theo `settings.ops`; hai lối thêm mức riêng của vai trò bỏ với mọi người, dòng riêng đã có vẫn hiện và vẫn ngừng được.

## 7. Giả định và phần để người thi công

- **Người soạn hiểu:** chủ chỉ chốt hai số «trần 50%, bước 1.000 đ», nên không có trần 500.000 đ riêng; luật C đã chặn số vượt giá. Bước tiền chỉ áp cho số tiền, không áp cho phần trăm; phần trăm giữ hai chữ số thập phân như hôm nay.
- **Người soạn chọn:** mục C.2 chỉ đổi chữ hiển thị, DTO vẫn có số thật cho bài kiểm và nhật ký; tên route, tên trang mới, cách lọc và cuộn của bảng 720 ô, cách phân trang nếu đo thấy chậm.
- **Rủi ro còn lại, chấp nhận trong đặc tả này:** số tiền «mọi khách» vẫn tính cả trẻ em miễn phí, nên đơn toàn trẻ em miễn phí có thể vượt thành tiền và bị giữ ở Đã giao. Hạ mức sau khi đơn đã giảm giá thì vẫn chỉ cảnh báo, theo ADR-0079 điều 8.
- **Chưa kiểm:** dữ liệu production hôm nay; hiệu năng trên màn hình thật với 720 ô (máy chủ đã thử 720 dòng trên SQLite tạm, phản hồi `GET /api/pricing/muc-ta` khoảng 258 KB); đơn 0 đ đã xác nhận có được phân công thực hiện hay không.
