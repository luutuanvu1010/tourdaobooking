# ADR-0175 — Vé Tour Đảo: tạo vé, cho mở vé từ lúc xác nhận, quét vé

- **Trạng thái:** **proposed** — chưa có hiệu lực, chờ chủ dự án duyệt. Chủ đã duyệt đề xuất 2026-11-05, nguyên văn: *«Duyệt, soạn ADR»*; câu đó không phải lời duyệt ADR này.
- **Ngày:** 2026-11-05   **Loại:** việc lớn (dữ liệu, quyền, cổng tiền ở mức đọc).
- **Cửa:** một chiều mềm với dữ liệu (cột `source`, bảng lượt quét chỉ thêm và ở lại). Hai chiều với hành vi: tắt được bằng cách không chọn vé Tour Đảo cho dịch vụ nào.
- **Số:** 0175, đã soát mọi nhánh 5/11. `0170`–`0173` ở nhánh ADR-0170, `0174` ở nhánh `claude/interesting-hodgkin-cde2fd`.
- **Số quyết định chạm quyền/dữ liệu trong lượt duyệt:** 3 nhóm (Đ1, Đ2, Đ3), đúng trần `CLAUDE.md` §9, nhưng mỗi nhóm gồm nhiều điều; danh sách đủ ở mục «Điều chủ duyệt khi đọc». Trang ghép ở cuối văn bản. Vé đoàn là lượt sau, ADR riêng.
- **Nguồn:** đề xuất `docs/superpowers/specs/2026-11-05-ve-tour-dao-design.md` (phần 2 ghi chi tiết cho người thi công), danh sách màn `2026-11-05-ve-dien-tu-danh-sach-man.md`. Mâu thuẫn với đề xuất thì ADR này thắng; ADR này đã **thay** ba chỗ của đề xuất: mục 2.4 (bỏ vé Tour Đảo khỏi chặn đối tác), dòng «nút huỷ của đối tác hiện lại» ở mục 2.10, và cách chụp ô lúc xác nhận ở mục 2.2.
- **Xây trên lỗ đang hở:** `HC-5.19` (chưa diễn tập khôi phục), `TNV-G1` (đơn huỷ còn tiền, vì vé chạm đường huỷ đơn). Chủ đã cho phép khi duyệt đề xuất, sau khi được báo rõ; đã ghi `xay_tren_cho_phep`. **Chỉ phát hành sau diễn tập khôi phục.**
- **Phụ thuộc:** ADR-0174 (ô «Có vé», đã duyệt 5/11, đang thi công trên nhánh `claude/interesting-hodgkin-cde2fd`) phải có trước. ADR-0170, ADR-0171 phải nhập `main` trước, vì chúng viết lại đúng các cổng vé. Không có phụ thuộc vòng.
- **Quan hệ với ADR cũ:**
  - **Sửa cho riêng vé Tour Đảo:** ADR-0153 Đ1 mục 4(c) và Đ2 (thu đủ mới mở vé, mới tạo đường dẫn); ADR-0168 Đ3 mục 1 (cổng mở vé) và mục 3 (chặn huỷ); ADR-0171 Đ2 (đường dẫn khách).
  - **Thêm:** ba ô quyền vé cạnh `ve.kho.manage`, `ve.cap.send` của ADR-0153 Đ3; một ô đối chiếu.
  - **Giữ:** ADR-0170 Đ3 và ADR-0171 Đ1 (đối tác không tự huỷ, không tự sửa số khách trên đơn đã mở vé), **áp cả cho vé Tour Đảo**; ADR-0153 Đ1 mục 5 (mã vé không vào nhật ký, URL, phản hồi lệnh ghi) và mục 6 (vé đã mở thành vé chết, mã `VOID`, khi huỷ, không về kho); ADR-0156 (máy chủ không đọc lại QR); ADR-0094 (chống ghi trùng); ADR-0078 (Người bán dịch vụ, không đụng); ADR-0090 (quyền tiền).
  - **Ngoại lệ có tên:** tấm vé gửi khách được in thêm tiếng Anh. Giao diện Nền tảng vẫn theo `CLAUDE.md` §7. Không sửa `CLAUDE.md`.

## Bối cảnh

Chủ muốn công ty tự phát vé điện tử cho dịch vụ, có QR và logo, gửi cho khách, và quét bằng điện thoại trong Nền tảng để biết vé đã dùng chưa. Chủ coi vé là cam kết dịch vụ. Vé hãng ngoài (Vinpearl) khi đã lộ thì không lấy lại được, nên mọi luật hiện nay đều bắt thu đủ rồi mới mở. Vé của mình do máy chủ của mình quyết còn giá trị hay không, nên huỷ đơn là vé chết, và các luật đó không cần áp nguyên.

Lời chủ về trục, nguyên văn: *«trục nhà cung cấp và trục vé độc lập với nhau, cty tour đảo là một trong nhiều nhà cung cấp»*. Khi được hỏi có cần ô thứ ba «vé do ai phát» không, chủ chọn tách ba ô: nhà cung cấp dịch vụ (đã có, không đụng), có vé hay không (ADR-0174), vé do ai phát (ADR này).

## Đ1 — Vé do ai phát, và ai tạo vé

1. `vdt_batch` thêm `source` (`HANG_NGOAI` mặc định, `TOUR_DAO`), không đổi sau khi tạo; mọi lô cũ là `HANG_NGOAI`. Mọi luật mở vé, quét, huỷ, quyền đều đọc `source` của lô. **Không luật vé nào đọc Người bán dịch vụ** (`prc_supply_term`); đổi người bán không ảnh hưởng vé.
2. Ô «Vé do ai phát» **chỉ trên từng dịch vụ, không có ở nhóm**, bảng chỉ thêm. Không có dòng thì là `HANG_NGOAI`. Ô chỉ quyết máy giữ vé từ lô nào; dịch vụ «Không vé» thì ô này vô nghĩa. Quản trị, Toàn quyền đặt, **dùng chung ô quyền của ADR-0174 Đ4**, không thêm ô mới, vì cùng người, cùng màn, cùng loại việc.
3. Ô quyền mới `ve.phat-hanh` (tạo và thao tác lô Tour Đảo): Toàn quyền, Kế toán, Quản lý bán hàng, Quản trị, phạm vi `any`. Cột `SALES` là `none`, nên Bán hàng thường không tạo được dù đang có `ve.kho.manage`.
4. Mười route kho hiện chỉ hỏi `ve.kho.manage` đổi như sau, theo `source` của lô:

| Route | Lô hãng ngoài | Lô Tour Đảo |
|---|---|---|
| `GET /api/ve/kho`, `GET /api/ve/lo` (chỉ số lượng) | `ve.kho.manage` | `ve.kho.manage` hoặc `ve.phat-hanh` |
| `POST /api/ve/lo`, `/lo/:id/ve`, `/lo/:id/xac-nhan`, `/lo/:id/bo`, `/lo/:id/sua-ma-tour` | `ve.kho.manage` | `ve.phat-hanh` |
| `GET /api/ve/lo-da-huy`, `POST …/:veId/mo`, `GET …/:veId/anh` | `ve.kho.manage` | `ve.phat-hanh` |

   Tức là: Bán hàng thường xem được số lượng vé Tour Đảo, không thao tác được lô Tour Đảo. Kế toán không thấy gì của lô hãng ngoài. `/bo` vẫn chỉ huỷ được lô chưa từng cấp, như hiện nay.
5. **Đổi ô «Vé do ai phát»:** theo giá trị hiện tại, cùng cách chủ đã chọn cho ô «Có vé» (ADR-0174 Đ7, cách (a)). Vé đơn đã giữ không đổi; vé giữ sau lúc đổi theo giá trị mới, kể cả cho đơn đã xác nhận còn thiếu. Một đơn có thể có cả hai loại vé; các luật vẫn đúng vì đọc theo từng vé. Không thêm cột trên đơn.
5a. **Cấp bù và báo thiếu:** khi lô vào kho, máy cấp bù cho các đơn đã xác nhận còn thiếu, ngày đi gần trước. Thiếu vé thì báo qua `thongbao`: vé Tour Đảo báo người giữ `ve.phat-hanh`, vé hãng ngoài báo người giữ `ve.kho.manage`. ADR-0174 để hai việc này ra ngoài; ADR này nhận làm, ở đợt 1. Tạo lô Tour Đảo cho dịch vụ đang là «Không vé» hoặc «vé hãng ngoài» thì không chặn, nhưng máy báo ngay cho người tạo là lô chưa được cấp cho ai tới khi Quản trị đổi ô, theo khuôn ADR-0174 Đ6.
6. **Mã vé:** `TD1.` + 26 ký tự base32 do trình duyệt người tạo sinh, gửi kèm ảnh qua route nhập vé hiện có, vì ADR-0153 Đ1 mục 5 cấm trả mã trong phản hồi lệnh ghi. Lô `TOUR_DAO` chỉ nhận đúng dạng này, lô `HANG_NGOAI` từ chối tiền tố này. Mã là bí mật như `ticket_code`, nên không thuộc Hiến chương 5.26. **Giới hạn đã báo chủ:** người tạo vé thấy mã và giữ được ảnh; không có biện pháp chặn hẳn, chỉ có ghi tên và màn theo dõi ở Đ3.
7. **Nội dung vé:** logo, tên công ty và Hotline (qua `ownerCompany`), tên dịch vụ, loại khách, hạn cuối, QR, 4 ký tự cuối, «Mỗi vé dùng một lần», «Không phải hóa đơn» (câu chữ chờ kế toán). Không giá, tên khách, số điện thoại, mã đơn. Dòng cố định có tiếng Anh nhỏ hơn bên dưới. Tên tiếng Anh của dịch vụ là ô không bắt buộc ở màn tạo vé; để trống thì chỉ in tiếng Việt; máy không tự dịch.

## Đ2 — Vé Tour Đảo được mở từ lúc xác nhận

1. Cổng mở vé (hiện là `moVeDuoc` ở `src/shared/tra-sau.ts`, gọi qua `veMoDuoc` ở `src/modules/ve-dien-tu/index.ts`) đổi thành quyết **theo từng vé**, biết `source`, trạng thái đơn và diện đối tác. Vé `HANG_NGOAI`: luật hiện hành không đổi một chữ.
2. Vé `TOUR_DAO`:

| Loại đơn | Được mở khi |
|---|---|
| Đơn đã xác nhận, nhân viên lập, bên đặt không phải đối tác | Ngay, kể cả chưa thu đủ |
| Đơn tài khoản giữ quyền Đối tác tự lập | Theo ADR-0170 Đ2 |
| Đơn nhân viên lập, bên đặt là hồ sơ đối tác (vai được hưởng hoa hồng) | Thu đủ, trừ Trả sau trong hạn mức (ADR-0168) |
| Đơn đã huỷ | Không bao giờ |

3. Máy không tự gửi vé. Lúc xác nhận chỉ là cấp vé; nhân viên bấm mở hoặc tạo đường dẫn; vé chỉ quét được từ lúc đã mở.
4. Module vé không đọc `orders`. Cờ `bookerLaDoiTac`, trạng thái đơn, ngày đi hiện hành, `order.view` và `money.view` trên đơn đều qua hàm do gốc lắp ráp tiêm; đây là phần thêm vào hợp đồng `src/shared/router.ts`, được duyệt cùng ADR này.
5. **Bất biến:** đơn có cả hai loại vé mà chưa thu đủ thì tạo đường dẫn, gửi vé, xem ảnh không được đóng dấu lộ lên vé hãng ngoài. Sáu đường phải lọc theo từng vé: `POST /api/ve/duong-dan`, `POST /api/ve/giao`, `GET /api/ve/anh`, `veXem` ở `GET /api/ve/don`, danh sách vé trên trang khách, ảnh trang khách. Có bài đỏ trước, xanh sau.
6. Vé `TOUR_DAO` đã mở **chỉ không tính** vào luật chặn huỷ của ADR-0168 Đ3 mục 3 (đơn Trả sau còn nợ đã mở vé), vì huỷ thì vé chết và hết nợ, không mất gì. Việc này chỉ cho văn phòng huỷ, xem Đ3 mục 8. Hai luật chặn đối tác của ADR-0170 Đ3 và ADR-0171 Đ1 **vẫn tính cả vé Tour Đảo**. Vì vậy câu `veDaMoCuaDon` (đã có trên `main`) và `cauChanVeDaMo` (nhánh ADR-0170) phải tách theo mục đích, đừng sửa chung một câu.

## Đ3 — Quét vé, và chặn huỷ khi vé đã dùng

1. Bảng mới `vdt_scan`, chỉ thêm. Ba kết quả: `DA_TINH` (tính đã dùng), `CHI_XEM`, `TU_CHOI`. «Vé đã dùng» là vé có lượt `DA_TINH` chưa bị bỏ; không thêm trạng thái vào `vdt_ticket`. CSDL chặn hai lượt `DA_TINH` chưa bỏ trên một vé từng khách, chừa đường cho vé đoàn.
2. Ô quyền mới, phạm vi `any`:
   - `ve.quet.tinh`: Hướng dẫn viên, Bán hàng, Quản lý bán hàng, Kế toán, Quản trị, Toàn quyền.
   - `ve.quet.xem`: Tài xế công ty và mọi người giữ `ve.quet.tinh`.
   - `ve.doi-chieu.view`: Kế toán, Quản lý bán hàng, Quản trị, Toàn quyền.
   - Thực tập, Nhân sự, Tài xế đối tác, Đối tác: không có ô nào.
3. Một route `POST /api/ve/quet`, cổng `staff`, kiểm Origin, có mã lần gửi theo ADR-0094. Mã ở thân yêu cầu, không ở URL. Thứ tự kiểm và câu trả về theo đề xuất mục 2.5:
   - **Đỏ:** mã lạ và vé hãng ngoài (cùng một câu, không để dò mã Vinpearl); vé đã huỷ; vé chưa mở; ngoài hạn; đã dùng.
   - **Vàng, phải bấm xác nhận:** lệch ngày đi; chưa thu đủ; vượt số khách.
   - **Xanh:** tính đã dùng ngay.
4. Đơn Trả sau trong hạn mức không báo «chưa thu đủ»; quá hạn còn nợ thì báo vàng. Người không có `money.view` trên đơn không thấy số tiền.
5. Tài xế công ty chạy đủ các kiểm nhưng chỉ ghi `CHI_XEM`. Quét không mở quyền xem đơn: không tên, số điện thoại, giá; mã đơn chỉ hiện khi có `order.view` trên đơn đó.
6. Số vé đã dùng chỉ để chặn dùng lại, so khách thực tế, theo dõi người quét. **Không** đổi tiền, hoa hồng, số khách, trạng thái đơn hay «Xong và đủ tiền».
7. **Bỏ lượt quét:** người quét trong 5 phút, hoặc Quản trị, Toàn quyền bất kỳ lúc nào; bắt buộc lý do; có nhật ký; hiện ở màn theo dõi người quét. *(Người viết tự chọn, chủ đã đọc khi duyệt đề xuất.)*
8. **Huỷ đơn** (chủ chọn 5/11):

| Vé Tour Đảo của đơn | Huỷ được không | Sau khi huỷ |
|---|---|---|
| Đã cấp, chưa mở | Được | Về kho |
| Đã mở hoặc đã gửi, chưa dùng | Được | Vé chết, quét ra đỏ |
| Chỉ có lượt `CHI_XEM` hoặc `TU_CHOI` | Được | Vé chết, quét ra đỏ |
| Đã dùng | **Không**, ở mọi đường huỷ và rút xác nhận, kể cả văn phòng | Bỏ lượt quét trước mới huỷ được |

   Bảng này nói về văn phòng. **Đối tác** có vé đã mở, loại nào cũng vậy, thì không tự huỷ được và phải nhờ văn phòng (ADR-0170 Đ3), đúng như trang chủ của đề xuất đã ghi. Tiền đề của «vé chết»: chỉ có nghĩa khi nơi cung cấp dịch vụ có người quét vé.
9. **Sửa số khách.** Không ai giảm xuống dưới số vé đã dùng *(người viết tự chọn, chủ đã đọc khi duyệt đề xuất)*. Đối tác không tự sửa số khách trên đơn đã mở vé, loại nào cũng vậy (ADR-0171 Đ1). Văn phòng giảm khách thì trả vé chưa mở trước; vé đã mở còn thừa vẫn còn giá trị vì máy không biết khách đang giữ vé nào, và được bắt ở bước quét bằng cảnh báo vượt số khách, có ghi tên người bấm. Chặn ở `money-edit`, `handler-money-edit`.
10. **Camera:** chỉ `/quet-ve` có `camera=(self)`; `/*` giữ `camera=()`; có bài khoá. Luôn có đường dự phòng chụp ảnh rồi đọc mã. Chưa kiểm cú pháp tháo và đặt lại trong `_headers` và quyền camera trên iPhone cài ứng dụng: Bước 0 phải thử thật trước khi viết màn quét.

## Điều chủ duyệt khi đọc

Bạn đã chốt: ba ô độc lập, bốn vai tạo vé, ai quét, Kế toán được quét, vé Tour Đảo mở từ lúc xác nhận, chỉ vé đã dùng mới chặn văn phòng huỷ, in tiếng Anh, không ghi giá.

Người viết tự chọn, bạn sửa được:

1. Quyền theo từng route kho (Đ1 mục 4): Bán hàng thường chỉ xem số lượng vé Tour Đảo.
2. Đổi ô «Vé do ai phát» theo giá trị hiện tại, giống cách (a) bạn chọn cho ô «Có vé» (Đ1 mục 5).
3. Ô «Vé do ai phát» chỉ đặt trên từng dịch vụ, không đặt theo nhóm, và mặc định là vé hãng ngoài (Đ1 mục 2).
4. Máy tự cấp bù và báo thiếu (Đ1 mục 5a).
5. Đối tác đã mở vé Tour Đảo vẫn phải nhờ văn phòng huỷ, kể cả sửa số khách (Đ2 mục 6, Đ3 mục 8 và 9).
6. Văn phòng huỷ được đơn Trả sau còn nợ nếu chỉ có vé Tour Đảo chưa dùng (Đ2 mục 6).
7. Người quét tự bỏ lượt trong 5 phút (Đ3 mục 7); không giảm khách dưới số vé đã dùng (Đ3 mục 9).

## Phương án đã loại

- **Dựng kho vé thứ hai.** Mất luồng giữ vé, trả vé, gửi Zalo đã qua kiểm.
- **Suy «vé do ai phát» từ nhà cung cấp.** Dịch vụ chưa khai người bán đều tính là Tour Đảo (dòng `ALL` gieo sẵn của `prc_supply_term`), nên máy sẽ coi nhầm vé Vinpearl là vé của mình. Chủ không chọn.
- **Máy chủ sinh mã vé.** Đụng ADR-0153 Đ1 mục 5, và người tạo vẫn thấy mã trên ảnh nên không giảm rủi ro.
- **Chỉ Kế toán, Toàn quyền tạo vé.** Tách người tốt hơn. Chủ chọn bốn vai sau khi nghe hệ quả.
- **Khoá huỷ từ lúc vé đã gửi khách.** Khách đổi ý không có đường xử lý, trong khi máy vốn thu hồi được vé. Chủ không chọn.
- **Cho đối tác tự huỷ khi chỉ có vé Tour Đảo.** Người viết từng soạn vậy; người kiểm chỉ ra chủ đã duyệt văn bản nói ngược lại, và đó là nới quyền đối tác. Giảm khách rồi tự làm vé thừa chết cũng bị loại, vì máy không biết khách đang giữ vé nào, có thể làm chết vé của khách đã trả.
- **Chụp ô «Vé do ai phát» lúc xác nhận.** Đơn đã bán trước lúc đổi sẽ chờ loại vé cũ mãi, và phải thêm cột trên đơn.

## Hệ quả

- Lô vé cũ và luật vé hãng ngoài không đổi.
- Quản lý bán hàng, Kế toán, Quản trị có thể một mình tạo, quét và đối chiếu; máy không tách được người, chỉ ghi lại.
- Số vé đã dùng là số tham khảo; sổ tiền không đọc số này.
- Câu «vé không phải hóa đơn» phải có lời kế toán trước khi phát hành. Thi công không phải chờ.

## Từ ngữ

Theo Hiến chương 5.27 và ADR-0167, tên chờ chủ chọn, gom một lần khi thi công: «Quét vé», «Tạo vé», «Bỏ lượt quét», «Vé do ai phát», «Vé hãng ngoài», «Vé Tour Đảo». Tránh «Kiểm vé», «Soát vé»: «Kiểm vé» đã có nghĩa khác. Chưa thêm vào bảng tham chiếu.

## Trang ghép (`CLAUDE.md` §9)

**1. Bảng chứa loại thực thể nào.** `vdt_batch`, `vdt_ticket` nay chứa hai loại: vé hãng ngoài, vé Tour Đảo; phân biệt bằng `source` của lô. `vdt_allocation` như cũ, chung hai loại. `vdt_scan` chỉ chứa lượt quét vé Tour Đảo có thật; mã lạ không ghi. Ô «Có vé», ô «Vé do ai phát» là bảng riêng thuộc `catalog`.

**2. Từng dòng bản đồ quyền áp cho loại nào.**

| Ô | Vé hãng ngoài | Vé Tour Đảo |
|---|---|---|
| `ve.kho.manage` (Bán hàng, Quản trị, Toàn quyền) | Như cũ | Xem kho; không tạo lô nếu không giữ `ve.phat-hanh` |
| `ve.phat-hanh` (mới) | Không áp | Tạo, huỷ lô chưa từng cấp |
| `ve.cap.send` | Như cũ | Như cũ, nhưng mở được sớm hơn theo Đ2 |
| `ve.quet.tinh`, `ve.quet.xem` (mới) | Không áp, quét ra đỏ | Áp |
| `ve.doi-chieu.view` (mới) | Không áp | Áp |
| Kế toán | Không thấy lô | Thấy, tạo, quét, đối chiếu |

**3. Cổng nào canh cửa nào, kể cả chỗ giao diện đổi nghĩa.**

| Cửa | Cổng máy chủ | Giao diện đổi nghĩa |
|---|---|---|
| Tạo và thao tác lô Tour Đảo | `ve.phat-hanh` theo `source` | «Kho vé» hiện cho Kế toán; Bán hàng thường không có nút tạo |
| Xem ảnh, gửi, đường dẫn vé Tour Đảo | `ve.cap.send` + `veMoDuoc` theo từng vé | Khối vé trên đơn hiện nút trước khi thu đủ, riêng cho vé Tour Đảo |
| Trang khách `/ve/:token` | Mã đường dẫn + `veMoDuoc` theo từng vé | Khách có thể thấy vé Tour Đảo mà chưa thấy vé hãng ngoài cùng đơn |
| Quét | `ve.quet.tinh` hoặc `ve.quet.xem` | Mục «Quét vé» mới, kể cả cho Hướng dẫn viên, Tài xế công ty |
| Đối chiếu | `ve.doi-chieu.view` | Màn mới |
| Huỷ đơn, sửa số khách | Cổng cũ + chặn khi có vé đã dùng; riêng chặn Trả sau của ADR-0168 bỏ vé Tour Đảo; chặn đối tác giữ nguyên | Nút huỷ của văn phòng hiện trên đơn Trả sau còn nợ chỉ có vé Tour Đảo chưa dùng; nút của đối tác vẫn ẩn khi đã mở vé |
| Đặt ô «Vé do ai phát» | Ô quyền của ADR-0174 Đ4 | Màn Dịch vụ & giá, cạnh ô «Có vé» |

## Điều kiện nghiệm thu

Theo đề xuất mục 2.12, cộng thêm:

1. Đối tác huỷ hoặc sửa số khách trên đơn có vé đã mở, kể cả chỉ vé Tour Đảo: 409. Văn phòng huỷ đơn Trả sau còn nợ chỉ có vé Tour Đảo đã mở chưa dùng: được, vé chết, hết nợ. Có vé hãng ngoài đã mở: 409 như ADR-0168.
2. Văn phòng huỷ đơn có vé đã dùng: 409 ở mọi đường, bỏ lượt rồi huỷ được. Giảm số khách xuống dưới số vé đã dùng: 409. Văn phòng giảm khách khi vé đã mở: vé thừa quét ra vàng vượt số khách.
3. Lô cũ sau migration đều `HANG_NGOAI`, hành vi vé hãng ngoài không đổi trên toàn bộ e2e `ve-dien-tu`.
4. Hàng rào mới ghi vào `docs/SO-HANG-RAO.md` kèm ngày quan sát chặn thật. Người kiểm độc lập đọc mã và chạy lại lệnh; thử iPhone thật.

## Việc không làm ở ADR này

Vé đoàn (đợt 3); quét khi mất mạng; nhà cung cấp và giá mua theo lô (`BL-VE-VON`, phân hệ kế toán); màn doanh thu (chờ kế toán về mốc tiền «đã thực hiện»); định nghĩa ô «Có vé» (ADR-0174).
