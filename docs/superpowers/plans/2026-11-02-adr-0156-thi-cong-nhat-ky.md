# Nhật ký thi công — Mã QR chống trùng và trần lô vé điện tử (ADR-0156)

ADR: `docs/adr/ADR-0156-ve-dien-tu-ma-qr-chong-trung-va-tran-lo.md`. Nhánh `claude/ve-dien-tu-qr-tran-lo`, cắt từ `main` sau khi ADR-0153 nhập. Ghi 02/11/2026 (người thi công). CHƯA gộp `main`, CHƯA lên production.

## Ruling của chủ
- Không gõ mã từng vé vì số vé rất lớn; không dùng người soát ở số lượng lớn (2/11).
- Trần mỗi lô 50, đặt ở màn của Toàn quyền; cần một lớp chống trùng chính xác ngoài dấu vân tệp (2/11).
- «ok tạm thế đã, tiếp tục nào, nếu có đề xuất tốt hơn thì báo tôi» (2/11): người thi công hiểu là chấp nhận ADR-0156, gồm rủi ro lẫn loại vé, luật không đọc được QR thì loại ảnh, Bán hàng dùng được Bỏ lô; đã nói rõ cách hiểu này với chủ.
- Duyệt 2/11: trần gói Đơn hàng 103.178 byte; `R-VDT-4` tính cả vé VOID không mang dấu rút.
- Duyệt 2/11: «vậy đổi thành lưu 3 ngày cho lô đã huỷ» (trước đó nói 7 ngày «để phục vụ cho việc tra cứu và tra soát»). Máy tự xoá sau hạn.
- Chữ trên giao diện đổi từ «Bỏ lô» thành «Huỷ lô» vì chủ không hiểu «lô đã bỏ». Tên trong mã giữ nguyên.
- Ai xem trong 3 ngày: chủ chọn «Cả Quản trị, Bán hàng» khi hỏi về xem ảnh. Sau đó người thi công hỏi lại kèm ví dụ bán trùng (vé của lô đã huỷ nhập lại được, nên ảnh đã gửi khách vẫn có thể bán lần hai); câu trả lời ghi nhận là «Chỉ xem thông tin», đúng phương án khuyến nghị. Công cụ không cho biết chủ tự bấm hay hết giờ tự chọn, nên báo cáo cuối nêu rõ để chủ đổi nếu không đúng ý. Vì vậy hiện chỉ có chữ, không có đường mở ảnh; cần ảnh thì thêm sau.

## Lệch so với ADR (có lý do)
- Thư viện đặt tên `jsqr.cjs`, không phải `.js`: kho khai `"type": "module"`, đuôi `.js` bị esbuild coi là ESM và báo không có export. Bài trần gói bắt được lỗi này.
- ADR nói thêm hai tệp vào `web/vendor/`; thực tế ba tệp, vì giữ giấy phép Apache-2.0 ở tệp riêng.
- `soVeDuKien` ở `POST /api/ve/lo` là tuỳ chọn, vì route thêm vé vẫn kiểm trần.
- Thêm ngoài ADR: lô không còn vé nào thì trang tự bỏ, để danh sách «Lô có thể bỏ» không đầy rác; câu nhắc mỗi lô một sản phẩm, một loại khách, một ngày dùng ngay trên trang.
- Sổ nợ `GHI_NHIEU_LAN` từng thêm `POST /api/ve/lo/:id/bo` vì kho R2 nằm giữa. Từ khi lưu ảnh 3 ngày, route này chỉ còn một lô D1 nên đã gỡ dòng đó. Dòng `POST /api/ve/lo/:id/ve` sửa cho đúng sự thật như ADR yêu cầu.
- ADR Đ2 mục 3 viết vé «rồi được dọn khỏi kho R2», không nói lúc nào, nên hạn 3 ngày không trái ADR. Các chỗ khác của ADR lệch với quyết định 2/11 (4 số cuối trên trang, `R-VDT-4`, tên «Bỏ lô») đã ghi ở `docs/SYSTEM-DESIGN.md` §16, chờ chủ duyệt dòng lịch sử.
- Lô huỷ mà không có vé nào vào kho thì không hiện ở khối mới, vì không có gì để tra; người kiểm thấy nguy cơ rác và ảnh chụp cho thấy đúng vậy.
- Thêm ngoài ADR: `GET /api/ve/lo-da-huy` và khối «Lô đã huỷ gần đây», cùng ô `ve.kho.manage`, chỉ đọc. Tên người huỷ qua `nhanNhanVien` được tiêm, không nới `ALLOWED_EDGES`.

## Kiểm độc lập lần 1 (2/11): KHÔNG ĐẠT, đã xử lý
Không có đường nào đưa vé có thể đã tới tay khách quay lại kho. Các phát hiện:
- **Trung 1, ảnh mồ côi:** Bỏ lô xen giữa lúc gửi ảnh, và lần xoá R2 hỏng mà hàng chờ không có nơi chạy. Sửa: xoá ngay đối tượng khi đánh dấu đã lưu không đổi dòng nào; thêm việc dọn vào lịch định kỳ 15 phút và kiểm `R-VDT-5`. **Lệch ADR:** ADR đặt «quét định kỳ» ngoài phạm vi, nhưng câu đó nói về cấp bù; khuôn `POST …/tep-cho-xoa/chay-lai` cần người gọi mà chủ không phải lập trình viên, nên chọn lịch định kỳ, không thêm route.
- **Trung 2, vế băm không có bài giữ:** thêm hai bài ép đúng lịch đua; sửa dòng sổ từng nói e2e canh ca này.
- **Trung 3, lô dở trôi khỏi danh sách:** lô dở xếp lên đầu.
- **Trung 4, migration gặp dữ liệu trùng băm:** điều kiện phát hành, ghi kèm lệnh chỉ đọc ở `docs/HANDOFF-N1.md`. Không sửa mã.
- **Thấp, báo sai lý do khi thua đua:** route đọc số dòng từng câu của lô.
- **Thấp, `R-VDT-4` bỏ qua vé VOID:** người kiểm nêu thành câu hỏi cho chủ. Người thi công tự áp vì chỉ siết một kiểm chỉ đọc, đảo ngược được, và đúng mục đích bắt bán trùng. **Lệch chữ ADR** («còn hiệu lực»).
- **Thấp, gác câu rút vé theo mốc thời gian:** đổi sang dấu lệnh `last_cmd_id`, làm ngay vì `0132` chưa áp ở đâu.

## Kiểm độc lập lần 2 (2/11): ĐẠT, commit `a3dbd711`
Trung 1–3 đã đóng, không có lỗi mới trên mức Thấp. Người kiểm tự chạy Chrome hai khổ (xanh) và phá thử `LB_PHA=qr-gia` (bước 1040.6 đỏ), nên hàng rào Đ1 đã được người kiểm độc lập quan sát chặn thật. Việc định kỳ chạy xen lúc đang gửi ảnh và trên lô đang bán không xoá nhầm ảnh; lỗi của nó không kéo theo đồng bộ danh mục. **Điều kiện:** chủ biết hai chỗ lệch ADR trước khi gộp (việc định kỳ dọn ảnh; `R-VDT-4` mức `fail` tính cả vé VOID không mang dấu rút). Chưa kiểm: iPhone thật; cron trên production; D1 có hoàn lại cả tệp khi migration lỗi không.

## Kiểm độc lập lần 3 (2/11): ĐẠT về mã, commit `0601989d`
Không có lỗi mức Cao hay Trung ở mã; người kiểm tự phá thử thêm và xác nhận không còn đường mở ảnh vé đã rút. Đã xử lý: ghi các chỗ lệch ADR vào §16; thêm bài cho sáu quyền ngoài ô (chỉ đỏ khi hỏng cả cổng ngoài lẫn kiểm quyền ở thân route; riêng cổng ngoài do `route-access` giữ); ẩn lô không có vé; khoá giới hạn 50 lô. Lần kiểm hẹp sau đó trên `5ec9ad5c` cũng ĐẠT về mã và bắt một câu sai trong sổ hàng rào, đã sửa. Người kiểm nhắc câu «Chỉ xem thông tin» có thể là mặc định hết giờ: phải nêu cho chủ xác nhận trong báo cáo cuối đợt.

## Bằng chứng
- Bản `5ec9ad5c` (lưu 3 ngày, «Huỷ lô», khối Lô đã huỷ gần đây): `npm test` 7107 bài, 7103 đạt, 0 đỏ (4 bài còn lại là bài đánh dấu chờ `todo` của sổ vàng và quyền tiền, có từ trước), cộng bài đo giờ 1 đạt; typecheck 0 lỗi; e2e `ve-dien-tu` 4/4; Chrome hai khổ `VE QR SMOKE OK`. Mười tám chỗ phá thử khác nhau đều đỏ đúng bài rồi hoàn nguyên; ba chỗ chạm câu đọc đã sửa được chạy lại trên bản này. Sau `5ec9ad5c` chỉ thêm bài kiểm và sửa tài liệu, mã chạy thật không đổi; bộ kiểm toàn phần không chạy lại, chỉ chạy lại các bài của module `ve-dien-tu`. Các số dưới đây là của những bản trước.
- Trình duyệt: `ve-qr-smoke.mjs` hai khổ 390 và 1040, cần `AXE_JS`. Ảnh ở `docs/evidence/2026-11-02-ve-qr-tran-lo/anh/`, chỉ có dữ liệu thử.
- 50 ảnh cỡ 1170×2532 (khoảng 13 MB tổng) trên Chrome của máy Mac: 4,0 giây, khoảng đứng hình lâu nhất 80 mili giây.
- 7 ảnh vé thật trên máy (khối `VE_ANH_THAT`, chặn mọi lời gọi ghi trong trang, không chụp, không in chuỗi): đọc được 7, khác nhau 7, đúng dạng 7.
- Phá thử: từng dòng ở `docs/SO-HANG-RAO.md`.

## Bài học
- Dữ liệu thử ban đầu dùng nhầm `S/N` thật của một vé trong ba tệp bài kiểm; phát hiện trước khi commit, đã thay số giả, `git log` xác nhận chưa từng vào commit.
- Bước 50 ảnh treo im lặng mất nhiều lần chạy: công cụ thử (CDP `Network.enable`) ghi cả thân yêu cầu vài MB nên kết nối đứt, mọi lời gọi vào trang không bao giờ trả lời. Không phải lỗi của trang. Đã giới hạn `maxPostDataSize` và thêm giờ giới hạn riêng trong kịch bản, đã ghi ở công thức z31.

## Nợ
- Hàng chờ xoá lấy 50 dòng cũ nhất mỗi lần: 50 dòng liên tục không xoá được sẽ chặn các dòng sau; `R-VDT-5` thấy số đếm tăng (suy luận, chưa chạy).
- ~~Bỏ lô xen giữa lúc gửi mà lần xoá ngay cũng gặp kho hỏng~~: đã hết từ khi lưu 3 ngày. Dòng vé ở hàng chờ tới khi xoá được, `R-VDT-5` thấy nếu quá hạn.
- Ảnh được giữ 3 ngày nhưng Nền tảng chưa có đường mở, nên hiện chỉ dùng được nếu sau này thêm đường đó (chủ quyết 2/11).
- `COALESCE(purged_at, ?2)` ở `RUT_VE_CUA_LO` không có bài khoá: bỏ đi vẫn xanh. Chỉ có tác dụng với vé có `purged_at` cũ mà chưa rút, mà `cauDatChoXoa` chưa có nơi gọi trong mã chạy thật. Nếu sau này có nơi gọi thì xem lại, vì ảnh sẽ xoá sớm hơn 3 ngày.
- Mã ngắn hơn 8 ký tự lộ nhiều hơn tỉ lệ thường ở cột 4 số cuối. Mã thật 36 số nên không thành vấn đề; cách xử lý giống hàm cũ `che4SoCuoi`.
- `POST /api/ve/lo/:id/sua-ma-tour` trên lô đã huỷ trả 200 dù không ghi gì. Có từ trước đợt này, không gây sai dữ liệu.
- Vé rút do gửi hỏng (`cauRutVeChuaPhat`) vẫn xoá ngay; nếu lần xoá đó hỏng thì đợi hết 3 ngày mới thử lại. Không có hại vì lần đặt kho đã hỏng nên thường không có ảnh (suy luận, chưa chạy riêng ca này).
- Nhật ký của lô chèn vé gác theo câu chèn cuối: riêng lúc hai người nhập đúng lúc thì có thể thiếu dòng hoặc đếm dư. Vé không sai; để lại vì sửa đúng cần tách nhật ký khỏi lô, đổi lấy một ca hiếm.
- Lô đã vào kho cũ hơn 50 lô mới nhất không bỏ được bằng trang, phải gọi API theo mã lô.
- `ve-kho.js` tăng từ 86 KB lên 223 KB (77 KB khi nén). Luật hiện hành nạp sẵn MỌI trang (`PRECACHE`, có bài kiểm), nên mọi máy kể cả điện thoại Đối tác và tài xế tải thêm phần này mỗi bản dựng. Muốn tránh phải có ngoại lệ có tên cho trang này: chủ quyết.
- Trang rơi về nhãn 50 khi `GET /api/ve/kho` hỏng; máy chủ vẫn kiểm đúng trần.
- iPhone thật chưa kiểm (tiêu chí 9).
- Hai điều kiện trước khi phát hành ở `docs/HANDOFF-N1.md`: tải cùng một vé hai lần; ảnh vé Vinpearl Harbour.
- **Đề xuất chưa áp, chủ quyết (N9):** thêm một dòng vào bảng kịch bản Chrome ở `web/CLAUDE.md`:
  `| Trang Vé điện tử và cài đặt (ADR-0156): web/ve-kho.ts, web/ve-cai-dat.ts, web/qr-doc-ve.ts, public/ve-kho.html, public/ve-cai-dat.html, src/shared/ve-nhap-lo.ts | ve-qr-smoke.mjs ở docs/evidence/2026-11-02-ve-qr-tran-lo/kich-ban/ (10 bước, 390 + 1040, cần AXE_JS, không cần mạng ngoài; phá thử LB_PHA=qr-gia) |`
