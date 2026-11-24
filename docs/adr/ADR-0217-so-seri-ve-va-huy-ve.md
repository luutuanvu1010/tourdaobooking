# ADR-0217 — Số sê-ri của vé, tra vé bằng số sê-ri, huỷ vé lẻ và huỷ phần còn lại của lô

- **Trạng thái:** **accepted** 2026-11-18. Chủ dự án trong chat, nguyên văn: *«chạy Subagent để duyệt ADR-0217, hỏi tôi nhiều nhất có thể để nắm bắt ý, đồng thời giúp tôi hiểu hơn. Sau đó nhập chính»*. Sau đó chủ trả lời 12 câu của người phản biện, nguyên văn: *«1-a; 2-a, 3- a, 4-a, 5-B (phải có cách để biết chính xác vé nào hủy nhầm), 6- đúng- phải là ngẫu nhiên không thể đoán được, 7-B, 8-Phân trang 50 vé, 9-a, 10-chưa, đang ở bản phát triển, 11- Chỉ nhà cung cấp vé mới quét được vé (…), 12- Quản lý bán hàng, Quản trị, Toàn quyền, Điều hành chung được quyền hủy vé hãng ngoài»*. Bản này đã ghi đủ các câu trả lời đó (Đ1–Đ3, mục «Chủ quyết 18/11»). Trước đó, đặc tả `docs/superpowers/specs/2026-11-17-so-seri-ve-va-huy-ve.md` được chủ duyệt 17/11, nguyên văn *«duyệt theo khuyến nghị, tiếp tục»*.
- **Ngày:** 2026-11-17 (soạn), 2026-11-18 (duyệt)   **Loại:** việc lớn (dữ liệu, quyền huỷ).
- **Cửa:** một chiều mềm với dữ liệu: số sê-ri cấp rồi không đổi; vé đã huỷ không sống lại; vé từng giữ cho đơn hay vé Tour Đảo mà bị huỷ thì không nhập lại được. Hai chiều với hành vi.
- **Số:** 0217, đã soát mọi nhánh chưa gộp ngày 17/11. Migration `0177` (`0174`–`0176` là của việc đăng ký tổ chức, đã lên bản chính).
- **Số quyết định chạm quyền/dữ liệu:** 3 (Đ1, Đ2, Đ3), đúng trần `CLAUDE.md` §9. Trang ghép ở cuối.
- **Quan hệ với ADR cũ:**
  - **Sửa** ADR-0175 Đ1 mục 7 (nội dung in trên vé Tour Đảo): thay dòng «Số vé …» kèm 4 ký tự cuối bằng số sê-ri in đủ. Mã bí mật vẫn chỉ nằm trong QR như ADR-0175 Đ1 mục 6.
  - **Sửa** ADR-0175 Đ1 mục 4: thêm bốn route `GET /api/ve/lo/:id/ve-trong-lo`, `GET /api/ve/tim`, `GET /api/ve/lo/:id/xem-truoc-huy`, `POST /api/ve/huy-ve`, đều theo `coQuyenLo` không có kiểu «chỉ xem số lượng»; `GET /api/ve/lo?tatCa=1` liệt kê cả lô đã cấp, chia trang 50. Bỏ câu «`/bo` vẫn chỉ huỷ được lô chưa từng cấp».
  - **Nới** ADR-0156 Đ2 mục 3 («Huỷ lô» chỉ cho lô chưa từng cấp): nay huỷ được phần còn lại của lô đã cấp, theo bảng ở Đ3. Lô chưa từng cấp vẫn đi đường cũ (vé mang dấu rút, nhập lại được), người huỷ như cũ.
  - **Thêm** vào ADR-0175 Đ3 mục 3: đường gõ số sê-ri ở Quét vé.
  - **Ngoại lệ có tên của ADR-0094** (chủ duyệt câu 4): hai route `POST /api/ve/huy-ve` và `POST /api/ve/lo/:id/bo` (lô đã cấp) vào danh sách ghi nhiều lần `GHI_NHIEU_LAN` (`src/shared/lan-gui-no.ts`). Phần huỷ ghi nguyên một lô D1 trước; phần cấp vé thay ghi sau. Bước sau hỏng thì vé vẫn đã huỷ đúng, đơn báo thiếu vé, bấm «Cấp vé» lại an toàn. Cùng kiểu với `/api/ve/cap` và `/lo/:id/xac-nhan` đã có.
  - **Giữ:** ADR-0153 Đ1 mục 5 (mã vé không vào nhật ký, URL, phản hồi lệnh ghi) và mục 6 (vé đã lộ chỉ còn đường VOID); ADR-0175 Đ3 mục 8 (vé đã dùng không huỷ được); ADR-0170 Đ3 (đối tác không tự huỷ).

## Bối cảnh

Chủ 17/11 yêu cầu quản lý vé theo số sê-ri, cho vai nội bộ kiểm vé đã dùng chưa bằng cách quét hoặc gõ số sê-ri, và huỷ được vé theo lô lẫn từng vé lẻ. Trước bản này vé không có số nào để gọi tên: mã trong QR là bí mật, vé chỉ in 4 ký tự cuối, Quét vé không có ô gõ, «Huỷ lô» chỉ dùng được khi chưa vé nào từng được giữ cho đơn.

## Đ1 — Số sê-ri

1. Mỗi dòng `vdt_ticket` có cột `serial`, dạng `VE_` + 8 chữ hoa **ngẫu nhiên, không đoán được** (chủ chốt câu 6), theo Hiến chương 5.26 (tiền tố `VE` khai ở `TIEN_TO_MA`). Máy chủ cấp, không đổi, duy nhất trong toàn kho (kể cả vé đã huỷ, đã rút). Số **không bí mật** như mã QR, nhưng danh sách số của một lô chỉ người thao tác được lô đó xem (trang ghép, dòng thứ hai).
2. Sổ cấp số `vdt_serial` (chỉ thêm) giữ mọi số đã cấp. Vé hãng ngoài: máy chủ cấp số lúc chèn vé. Vé Tour Đảo: ảnh vẽ ở trình duyệt nên số phải có trước khi vẽ; lệnh mở lô Tour Đảo (`POST /api/ve/lo`, có `soVeDuKien`) cấp sẵn đúng số đó vào sổ cho lô và trả về; lệnh thêm vé của lô Tour Đảo phải mang một số đã cấp cho chính lô đó, chưa dùng. Vé được chèn mà không mang số (chỉ xảy ra khi chèn thẳng vào cơ sở dữ liệu, như bài thử) thì trigger `vdt_ticket_serial_fill` tự cấp số và ghi sổ; yêu cầu «vé Tour Đảo mang số đã cấp cho lô» do lệnh thêm vé kiểm, không do cơ sở dữ liệu kiểm. Máy chủ không đối chiếu được số in trên ảnh với số trong cơ sở dữ liệu; người tạo vé là nội bộ.
3. Vé đã có trước bản này được migration gán số. Bản thật chưa có vé Tour Đảo nào gửi khách (chủ trả lời câu 10: «chưa, đang ở bản phát triển»), nên không cần vẽ lại ảnh.
4. Vé Tour Đảo tạo mới in đủ số sê-ri dưới QR, dòng tiếng Anh «Serial No.». Bỏ dòng «Số vé …» 4 ký tự.

## Đ2 — Tra vé bằng số sê-ri

1. Quét vé có thêm ô gõ số sê-ri, nút «Tra số sê-ri» (chủ chọn câu 7). Máy chủ dùng chung `POST /api/ve/quet`: chuỗi đúng dạng số sê-ri thì tra theo `serial`, ngược lại tra theo mã QR như cũ. Ô gõ đổi chữ thường thành chữ hoa, bỏ khoảng trắng.
2. Mọi kiểm và câu trả về giữ nguyên ADR-0175 Đ3 mục 3–5 (đỏ / vàng / xanh; vé hãng ngoài và số lạ chung một câu đỏ; Tài xế công ty chỉ xem). Vé hãng ngoài chỉ nhà cung cấp của vé đó quét được (chủ, câu 11), nên Nền tảng không quét chúng.
3. Gõ tay luôn thêm một cảnh báo vàng «nhập tay» trước khi ghi «Đã dùng», kể cả khi mọi kiểm khác xanh. Cờ nhập tay do máy chủ suy từ dạng chuỗi gõ, không tin cờ trình duyệt gửi. Lượt quét ghi `nhap_tay = 1` (bất biến như các cột khác của `vdt_scan`); nhật ký ghi «nhập tay» và số sê-ri.

## Đ3 — Huỷ vé lẻ và huỷ phần còn lại của lô

1. **Người huỷ** (chủ chốt câu 12, 18/11):
   - Vé và lô Tour Đảo: người giữ `ve.phat-hanh` (Kế toán, Quản lý bán hàng, Quản trị, Toàn quyền), như hôm nay.
   - Vé hãng ngoài, huỷ vé lẻ và huỷ lô đã cấp: ô quyền mới `ve.huy-hang-ngoai` — Quản lý bán hàng, Quản trị, Toàn quyền. Giám đốc và Điều hành chung có ô này vì hai vai trò đó mang quyền Quản trị. Bán hàng thường **không** huỷ được.
   - «Huỷ lô» hãng ngoài **chưa từng cấp** (đường ADR-0156, vé nhập lại được): giữ cho `ve.kho.manage`, vì Bán hàng cần nó để dọn lô nhập dở.
   - Mọi lệnh huỷ: bắt buộc lý do 5–300 ký tự (không chứa số điện thoại hay mã vé), nhật ký ghi số sê-ri, một mã lệnh chống ghi trùng theo ADR-0094 (ngoại lệ ghi hai lượt ở mục «Quan hệ»).
2. **Kết quả theo tình trạng vé:**

| Tình trạng | Vé Tour Đảo | Vé hãng ngoài |
|---|---|---|
| Trong kho, chưa từng giữ cho đơn | Huỷ, vé VOID | Huỷ, vé VOID **và mang dấu rút: nhập lại đúng ảnh vé đó được** (chủ chọn câu 5) |
| Trong kho, từng giữ cho đơn rồi được trả | Huỷ, vé VOID | Huỷ, vé VOID, không nhập lại được |
| Đã giữ cho đơn, chưa mở | Trả suất (lý do `THU_HOI`), vé VOID, cấp vé thay | Như Tour Đảo |
| Đã mở hoặc đã gửi, chưa dùng | Trả suất, vé VOID (quét ra đỏ), cấp vé thay; người huỷ phải **gõ lại bốn chữ cuối của số sê-ri** (chủ chọn câu 1) | **Không huỷ** (409) |
| Đã dùng (có lượt `DA_TINH` chưa bỏ) | **Không huỷ** (409); bỏ lượt quét trước | Không áp |

3. Vé đã huỷ ghi một lần `voided_at`, `voided_by`, `void_reason`; không về kho, không bật lại (trigger sẵn có của trạng thái VOID).
4. **Biết chính xác vé nào bị huỷ** (chủ, câu 5): danh sách vé của lô và «Tìm vé» hiện cả vé đã huỷ, kèm giờ huỷ, người huỷ, lý do và một trong ba câu «nhập lại được», «đã nhập lại», «không nhập lại được». Nhật ký ghi số sê-ri.
5. **Cấp vé thay:** sau lệnh huỷ, máy chạy lại đường cấp vé sẵn có cho các đơn bị trả suất (cùng dịch vụ, cùng loại khách, lô đúng nguồn theo ô «Vé do ai phát» hiện tại). Mỗi lệnh xét tối đa 200 đơn (trần lô lớn nhất); đơn mà việc cấp thay bị lỗi thì phản hồi báo còn đơn chưa cấp thay, và đơn đó thành thiếu vé. Hết vé thì đơn thành thiếu vé và báo như hiện nay.
6. **Vé đã gửi khách bị huỷ:** màn hình nhắc người huỷ rằng văn phòng phải gửi lại vé thay cho khách (kèm mã đơn nếu người huỷ xem được đơn). Báo tự động vào hộp thư người phụ trách đơn **chưa làm**; chủ chọn làm ở đợt kế tiếp (câu 2, nợ A4).
7. **Huỷ lô:** lô chưa từng cấp đi đường cũ. Lô đã cấp: trước khi xác nhận, màn hình hiện bản xem trước do máy chủ đếm (bao nhiêu vé huỷ được, bao nhiêu giữ nguyên vì đã dùng hoặc là vé hãng ngoài đã mở, bao nhiêu đơn được cấp vé thay, bao nhiêu vé đã gửi khách phải gửi lại). Có vé đã gửi khách thì người huỷ phải gõ đúng con số đó (cùng ý chặn bấm nhầm của câu 1). Bấm xác nhận thì huỷ mọi vé huỷ được theo bảng trên, lô chuyển VOID nên không cấp thêm vé từ lô này. Vé giữ nguyên vẫn quét được như cũ.
8. **Danh sách lô và danh sách vé của lô chia trang, 50 dòng mỗi trang** (chủ, câu 8), nút «Trang trước» / «Trang sau».

## Chủ quyết 18/11 (tóm tắt các câu không đổi mã)

Giữ siết: Bán hàng không xem danh sách số sê-ri, không tìm vé Tour Đảo theo số sê-ri (câu 3, điểm M1 của người kiểm độc lập). Duyệt ngoại lệ ghi hai lượt (câu 4). Số sê-ri ngẫu nhiên (câu 6). Một lô vé Tour Đảo thường dưới 50 đơn (câu 9), nên trần 200 đơn mỗi lệnh đủ. Bản thật chưa có vé Tour Đảo gửi khách (câu 10).

## Phương án đã loại

- **In đủ mã bí mật làm số sê-ri.** Mã sẽ vào danh sách, nhật ký; trái ADR-0153 Đ1 mục 5.
- **Số theo thứ tự (0001, 0002…).** Trái Hiến chương 5.26 và đoán được số của vé khác; chủ chốt ngẫu nhiên.
- **Trình duyệt tự sinh số sê-ri.** Trái 5.26 «máy chủ cấp». Sổ cấp số trước giải quyết được việc vẽ ảnh ở trình duyệt.
- **Gõ tay chỉ được xem.** Vé nhòe QR không xử lý được tại chỗ. Chủ chọn cho ghi «Đã dùng» kèm xác nhận.
- **Huỷ vé đã gửi chỉ báo thiếu, không cấp thay.** Chủ chọn cấp thay.
- **Gộp huỷ và cấp vé thay vào một lần ghi.** Phải làm lại đường cấp vé chung; chủ duyệt ngoại lệ thay vì vậy.

## Hệ quả

- Số sê-ri thành khoá tra cứu chung của vé trong Nền tảng; nhật ký mới ghi số sê-ri thay cho «số cuối».
- Huỷ vé đã gửi khách làm khách cầm vé chết: văn phòng phải gửi lại vé thay. Đây là chủ ý; tới khi trả xong nợ A4, chỉ người bấm huỷ được nhắc.
- Vé Tour Đảo, và vé hãng ngoài từng giữ cho đơn, bị huỷ thì không nhập lại được. Vé hãng ngoài chưa từng giữ cho đơn huỷ nhầm thì nhập lại được.
- Không đổi tiền, số khách, trạng thái đơn.

## Rủi ro còn lại

- **Nợ A4:** chưa báo tự động người phụ trách đơn khi vé đã gửi bị huỷ (đợt kế tiếp).
- **Nhân viên nơi cung cấp quét vé Tour Đảo** (chủ, câu 11: ví dụ nhân viên i-resort quét phiếu tắm bùn do Tour Đảo cấp bằng bản điện thoại): chưa có loại tài khoản này. Việc mới, cần đặc tả và ADR riêng.
- Điểm mức thấp của người kiểm độc lập (nhật ký thi công, 17/11): `/tim` trả 403 với số có thật khác nguồn, 404 với số không có; tranh hẹp khi vé trong kho vừa được giữ đúng lúc huỷ; nhãn «vé thay đã cấp» có thể sai khi đơn thiếu vé ở dịch vụ khác; bộ lọc lý do chỉ chặn mã dạng `TD1…` và chuỗi từ 9 chữ số.
- Huỷ lô rất lớn chưa thử trên máy chủ thật (trần lời gọi mỗi lần: chưa kiểm số hiện hành).
- Bất biến dữ liệu mới chạy trên bài thử, chưa chạy trên cơ sở dữ liệu thật.

## Từ ngữ

Chủ chốt 17/11 «Số sê-ri»; chủ chốt 18/11 (câu 7): «Huỷ vé», «Xem vé», «Tìm vé», «Tra số sê-ri», «Lô trong kho», «Vé không quét được?», nhãn ô «Số sê-ri in trên vé», «Số sê-ri của vé». «Quay lại», «Trang trước», «Trang sau» là chữ đã dùng. Câu cảnh báo vàng nhập tay lấy theo `src/shared/ket-qua-quet.ts`. Chữ mới của lần sửa 18/11 (ô gõ bốn chữ cuối, ba câu nhập lại) ghi vào bảng tham chiếu ở trạng thái chờ chọn.

## Trang ghép (`CLAUDE.md` §9)

**1. Bảng chứa loại thực thể nào.** `vdt_ticket` như cũ (vé hãng ngoài, vé Tour Đảo), thêm số sê-ri và dấu huỷ; vé hãng ngoài chưa từng giữ cho đơn bị huỷ thì mang thêm dấu rút có sẵn (`withdrawn_at`). `vdt_serial` mới: chỉ số sê-ri đã cấp, của cả hai loại vé. `vdt_scan` thêm cờ nhập tay. `vdt_allocation` dùng lý do `THU_HOI` sẵn có.

**2. Bản đồ quyền.** Thêm một ô: `ve.huy-hang-ngoai` (Quản lý bán hàng, Quản trị, Toàn quyền). `ve.phat-hanh` (lô Tour Đảo) nay gồm cả huỷ vé lẻ và huỷ lô đã cấp. `ve.kho.manage` giữ «Huỷ lô» chưa từng cấp, không gồm huỷ vé lẻ hay huỷ lô đã cấp. `ve.quet.tinh` / `ve.quet.xem` gồm cả gõ số sê-ri.

**3. Cổng nào canh cửa nào.**

| Cửa | Cổng máy chủ | Giao diện đổi nghĩa |
|---|---|---|
| Huỷ vé lẻ, huỷ lô đã cấp, xem trước huỷ | Tour Đảo: `coQuyenLo` (`ve.phat-hanh`). Hãng ngoài: `coQuyenLo` và `ve.huy-hang-ngoai`. Chặn vé đã dùng, vé hãng ngoài đã mở; vé đã gửi đòi gõ bốn chữ cuối | Kho vé: nút «Huỷ vé», «Huỷ lô» lô đã cấp chỉ hiện cho người qua được cổng |
| Huỷ lô chưa từng cấp | `coQuyenLo` như ADR-0156 | Như cũ |
| Xem danh sách số sê-ri của lô, tìm vé theo số sê-ri | `coQuyenLo` theo nguồn của lô, **không** mở rộng «chỉ xem số lượng»: Bán hàng (có `ve.kho.manage` và `ve.quet.tinh`, không có `ve.phat-hanh`) thấy số lượng lô Tour Đảo nhưng không thấy số sê-ri của nó, vì có số sê-ri cả lô là gõ được «Đã dùng» cho vé chưa từng cầm (kiểm độc lập 17/11, M1; chủ giữ 18/11) | Kho vé: nút «Xem vé» chỉ hiện ở lô người xem thao tác được |
| Gõ số sê-ri | `ve.quet.tinh` hoặc `ve.quet.xem` (như quét) | Quét vé: ô gõ và nút «Tra số sê-ri» |
| Cấp số cho lô Tour Đảo | `coQuyenLo` (như mở lô) | Tạo vé: in số sê-ri lên ảnh |
| Trả suất, cấp vé thay | Đường trả vé và cấp vé sẵn có, chạy trong module vé | Khối vé trên đơn: vé thay hiện như vé mới cấp, chưa gửi |
