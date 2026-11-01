# ADR-0156 — Vé điện tử: mã QR làm khoá chống trùng, chặn trùng theo dấu vân tệp, trần lô do Toàn quyền đặt

- **Trạng thái:** **Đề xuất** (2026-11-02). Chủ đã duyệt hướng trong chat, nguyên văn: *«Duyệt, viết ADR»*, trả lời câu hỏi có viết ADR cho phương án này không. Bản chữ này còn chờ chủ duyệt; người soạn không tự duyệt (Hiến pháp N3). Chưa viết mã.
- **Nguồn:** lời chủ trong chat 2026-11-02: *«Trần của mỗi lô chỉ nên là 50 vé»*, số này *«cũng nên được thiết lập trong bảng điều khiển của Super Admin»*, và *«Cần có thêm lớp chống trùng chính xác, ngoài việc dấu vân tệp ảnh»*; nhân viên xem lại kết quả máy đọc là việc *«vô cùng khó vì số lượng vé làm việc là lớn»*; ảnh trong kho *«chỉ được tải từ trang của nhà cung cấp»*.
- **Đã kiểm:** người kiểm độc lập đọc một vòng ngày 2026-11-02, kết luận ĐẠT CÓ ĐIỀU KIỆN, các số đo tái hiện được. Ba phát hiện mức Cao đã đưa vào bản này (Đ2 mục 2–3, «Rủi ro còn lại»).
- **Số:** ADR 0156 (0154, 0155 đã dùng ở nhánh đặt vé của đối tác). Migration số tạm `0132`: ADR-0154 ở nhánh chưa gộp cũng dự kiến số này, ai gộp sau đổi số theo luật ở `docs/adr/README.md`.
- **Loại:** việc lớn (dữ liệu; mã bên thứ ba chạy trên máy người dùng). **Không chạm tiền.** **Cửa:** hai chiều: migration chỉ thêm, chỉ mục và bảng cấu hình gỡ được bằng migration mới, thư viện thay được.
- **Số quyết định chạm quyền/dữ liệu trong lượt duyệt này: 3** (Đ1, Đ2, Đ3), đúng trần của `CLAUDE.md` §9. Đ4 là mã bên thứ ba, không thêm bảng hay ô quyền.
- **Xây trên lỗ đang hở:** không (`docs/quyen-hoan.json` không có mục chạm `ve-dien-tu` hay `settings.ops`, kiểm 2026-11-02).
- **Quan hệ với ADR cũ:** **thay** phần «Cách đọc chữ trên ảnh vé» ở mục «Đã chốt» của ADR-0153 và câu *«nhập lô không bao giờ bị chặn»*. **Thay** yêu cầu đọc chữ, đối chiếu tên sản phẩm, nhóm khách và màn xem lại ở đặc tả `docs/superpowers/specs/2026-10-31-ve-dien-tu-design.md` (dòng 59, 96, 126); dòng 16 của đặc tả nói mã `TA.` trùng dãy `S/N`, ảnh thật cho thấy là hai dãy khác nhau. **Giữ** ADR-0153 Đ1 mục 5 (mã vé, nội dung QR không vào nhật ký, phản hồi ghi, câu lỗi, URL), Đ2, Đ3. **Mở rộng** khuôn mã bên thứ ba của ADR-0108 đ3 sang tệp thứ hai.

## Bối cảnh

Nhập lô hiện bắt nhân viên gõ mã từng vé, không khả thi khi số vé lớn. Đọc chữ bằng AI rồi người xem lại cũng không dùng được: với số lượng lớn không ai soát nổi, nên lớp đó chỉ là hình thức. Rà mã 2026-11-02 cho thấy dấu vân tệp (`content_hash`) **mới được lưu, chưa chặn gì**: không có chỉ mục duy nhất, route không so; người kiểm chạy thử cùng byte ảnh với hai mã khác nhau thì cả hai vào kho.

**Hiện trạng production (kiểm chỉ đọc 2026-11-02):** migration `0131_ve_dien_tu` **chưa áp**, nên chưa có vé thật. Nhưng kho vé đã ở `main`, nên lần triển khai kế tiếp của bất kỳ việc gì sẽ đưa trang bản gõ mã lên. **Không nhập vé thật trước khi ADR này lên:** vé nhập tay theo số `TA.` sẽ không khớp chuỗi QR, nên nhập lại không bị bắt.

**Đo trên 7 ảnh vé thật ngày 2026-11-02** (7 sản phẩm khác nhau; ảnh không chép vào kho; chỉ ghi kết quả, không ghi mã):

| Kiểm | Kết quả |
|---|---|
| Đọc QR bằng jsQR 1.4.0 (chạy trên Node, điểm ảnh lấy từ `sips`) và bằng CoreImage của macOS | 7/7 đọc được; hai công cụ ra cùng chuỗi; 7 chuỗi khác nhau |
| Dạng chuỗi | 36 chữ số; khớp `^[A-Za-z0-9._-]{1,40}$` đang có ở `kiemVeMoi` |
| So với chữ in trên vé | 12 số cuối đúng bằng `S/N` ở 7/7 vé; số `TA.` **không** nằm trong QR; QR không chứa ngày, sản phẩm, nhóm khách |
| Cùng một vé đổi thành tệp khác (nén JPEG 55%, thu nhỏ, đổi PNG) | Dấu vân tệp đổi; chuỗi QR giữ nguyên |
| Thời gian đọc mỗi ảnh | 40–70 mili giây (trên Node, chưa đo trên trình duyệt) |

## Đ1 — Mã vé là toàn bộ chuỗi QR, do máy đọc

1. Trang nhập lô đọc QR ngay trên trình duyệt, gửi chuỗi đọc được vào trường `maVe` đang có; **bỏ ô gõ mã**. Phía máy chủ giữ `kiemVeMoi` và tập trùng trong đợt. Luật dạng mã dùng ở cả hai phía nên chuyển thành một tệp thuần ở `src/shared/`.
2. **Không đọc được QR, hoặc chuỗi sai dạng: loại riêng ảnh đó và nêu tên tệp; không có đường nhập tay.** Các ảnh khác vẫn đi tiếp.
3. Hai ảnh đã chọn cùng chuỗi QR: báo trước khi gửi.
4. Mã đầy đủ vẫn không ra khỏi máy chủ. Bốn ký tự cuối mà máy chủ trả về là bốn số cuối của `S/N`; đợt này trang chưa hiện chúng, sau này cần đối chiếu thì thêm.
5. **Giới hạn phải ghi rõ:** máy chủ chỉ kiểm dạng của chuỗi do trình duyệt gửi, không tự đọc lại QR. Lớp này chặn nhầm và quên, không chống người có ô `ve.kho.manage` cố ý gửi chuỗi giả qua API. Đ2 là lớp máy chủ tự tính.
6. Thêm kiểm bất biến `R-VDT-*` ở `scripts/audit-checks.mjs`: hai vé còn hiệu lực trùng 12 số cuối thì báo. Máy báo được cả ca nhà cung cấp phát lại chuỗi QR khác cho cùng `S/N`.

## Đ2 — Dấu vân tệp chặn thật; vé chưa từng phát ra không tính là trùng

1. Migration thêm chỉ mục duy nhất theo `content_hash`. Route so trước khi chèn, cả trong đợt, và báo «Ảnh này đã có trong kho». Câu `CHEN_VE` thêm điều kiện theo băm, để hai người nhập cùng lúc không làm hỏng cả đợt. Băm do **máy chủ tự tính trên byte thật**, nên không phụ thuộc trình duyệt.
2. **Vé chưa từng phát ra được nhập lại.** Hiện nay vé lỗi lưu kho R2 bị đánh `VOID` nhưng vẫn giữ mã, nên gửi lại bị loại vĩnh viễn trong khi trang lại bảo «thử gửi lại» (người kiểm đã tái hiện). Thêm cột đánh dấu «rút khỏi kho khi chưa từng phát ra», ghi một lần, đặt khi lưu kho hỏng hoặc khi bỏ lô (mục 3). Hai chỉ mục duy nhất theo mã và theo băm chỉ áp cho vé không mang dấu này; `maVeDaCo` và `CHEN_VE` theo cùng điều kiện. **Vé `VOID` vì đã lộ cho khách không mang dấu này, nên không bao giờ nhập lại được.**
3. **Lệnh «Bỏ lô»** (ô `ve.kho.manage`, hộp xác nhận, có nhật ký): cho lô chưa có vé nào từng được giữ chỗ, kể cả lô đang dở và lô đã xác nhận. Lô thành `VOID`, vé mang dấu ở mục 2 rồi được dọn khỏi kho R2. Đây là đường ra duy nhất cho lô bỏ dở giữa chừng hoặc khai sai nhóm khách, ngày dùng, vì các trường đó bị khoá không sửa được. Trang Vé điện tử có danh sách các lô bỏ được. Lô đã có vé từng được giữ chỗ thì không bỏ được bằng lệnh này. ADR-0153 Đ3 có nhắc «thu hồi vé» nhưng hiện chưa có route; lệnh này chỉ làm phần nêu trên.

## Đ3 — Trần lô mặc định 50, Toàn quyền đặt

1. Bảng một dòng `vdt_setting` (`id = 'default'`, `batch_limit INTEGER NOT NULL DEFAULT 50`, kiểm trong khoảng 1–200, `version`, cột WHO), có dòng gieo sẵn, khuôn `gd_setting` của ADR-0087, chủ ghi `ve-dien-tu`. Khoảng 1–200 là giả định của người soạn; 200 là chốt an toàn, không phải mức khuyến nghị.
2. `GET`/`PUT /api/ve/cai-dat`: ghi hỏi ô `settings.ops` có sẵn (chỉ Toàn quyền), khoá lạc quan theo `version`, thêm một hành động nhật ký ghi số cũ và số mới. **Không thêm ô quyền.** Trang nhập lô đọc trần qua route có ô `ve.kho.manage`.
3. Màn: một trang mới ở nhóm THIẾT LẬP, ẩn/hiện bằng `can(s, "settings.ops")`, như `troLy` và `giaoDien`. Nhãn đề xuất «Cài đặt vé điện tử» (giả định bề mặt, chủ đổi được). Trang nằm trong `muc-giao-dien.ts`, tệp được nhúng vào gói trang Đơn hàng, mà trần dung lượng gói chỉ còn dư khoảng 100 byte nên `src/goi-trang-nhe.test.ts` nhiều khả năng đỏ; khi đó báo con số đo thật để chủ duyệt nới. Thư viện ở Đ4 không vào gói trang Đơn hàng.
4. Thi hành ở **hai** chỗ: `POST /api/ve/lo` nhận số ảnh dự kiến, vượt trần thì 400 và **không tạo lô dở**; `POST /api/ve/lo/:id/ve` vẫn kiểm (thay hằng `TOI_DA_VE_MOI_LO`). Trang báo ngay khi chọn quá trần. Đây là kiểm mềm: hai yêu cầu song song có thể vượt trần một chút, chấp nhận được vì trần là giới hạn vận hành. Hạ trần khi lô đang mở: vé đã vào giữ nguyên, không thêm được nữa nếu đã vượt.

## Đ4 — Thư viện đọc QR theo khuôn ADR-0108

Chép nguyên `jsqr@1.4.0` (Apache-2.0, phát hành 2021-04-24, `dist/jsQR.js`) vào `web/vendor/`, kèm tệp khai kiểu, giữ giấy phép, nguồn gốc và integrity sha512, ghim băm thân tệp, **không vào `package.json`**, chỉ một tệp `web/` được import, chỉ gói vào trang Vé điện tử (khoảng 130 KB sau thu gọn, 47 KB khi nén). Ảnh vé **không rời trình duyệt** để đọc QR.

- Quét các chữ cấm của `src/vendor-qr.test.ts` trên tệp này: không gọi mạng, không `eval`, không chạm trang. Chữ duy nhất khớp là `location`, ở đây là tên biến nội bộ, nên bài kiểm mới bỏ riêng chữ đó và người kiểm đọc hết tệp.
- `src/vendor-qr.test.ts` khoá thư mục `web/vendor/` chỉ có hai tệp. Thêm hai tên tệp vào danh sách là **nới có tên một hàng rào**, xin duyệt tại đây.
- jsQR kém CoreImage ở ảnh rất nhỏ: một bản nén còn 154×330 điểm ảnh jsQR không đọc được. Ảnh tải thẳng từ nhà cung cấp không thuộc ca này; nếu gặp thì ảnh bị loại rõ theo Đ1 mục 2.

## Rủi ro còn lại (chủ cần đọc)

**QR giải quyết «không trùng», không giải quyết «nhập đúng».** QR không chứa ngày, sản phẩm hay nhóm khách. Dịch vụ, nhóm khách, ngày dùng chung cả lô và tên sản phẩm vẫn do người khai, không máy nào kiểm. Vé trẻ em lẫn vào lô người lớn, hay vé một ngày lẫn vào lô 30 ngày, sẽ lọt và có thể tới tay khách. Trong 7 ảnh mẫu, ngày dùng khác nhau tuỳ sản phẩm, có vé 14 ngày, có vé một ngày kèm giờ. Giảm rủi ro bằng cách tải và nhập từng lô theo đúng một sản phẩm và một ngày dùng, và dùng lệnh Bỏ lô khi phát hiện sớm. Khi đã xảy ra lẫn loại thật, hướng tiếp theo là để máy tự so nội dung in trên vé với khai của lô, lệch thì giữ vé lại, không cần người soát; việc đó cần ADR riêng vì phải đọc chữ.

## Trước khi thi công và hệ quả

- **Điều kiện thi công Đ1, cần chủ:** (a) tải **cùng một vé hai lần** từ trang nhà cung cấp; chuỗi QR khác nhau thì đổi khoá sang 12 số cuối (`S/N`), phần còn lại giữ nguyên. (b) Vài ảnh vé Vinpearl Harbour; chủ đã chốt làm cả Harbour, mà QR khác dạng thì không nhập được vì không có đường nhập tay.
- **Không làm** Task 4b (đọc chữ bằng AI) cho việc nhập vé. Không cần `ANTHROPIC_API_KEY` và công tắc `VE_DOC_OPENAI` cho việc này; thoả thuận xoá ngay ở lựa chọn (b) của ADR-0153 không còn là điều kiện của nhập vé.
- Ngoài phạm vi: tách vé từ PDF, đọc ngày từ ảnh, cấp bù tự động, quét định kỳ, thông báo kho cạn.
- Tài liệu sống sửa khi thi công: `docs/data-dictionary.json`, `docs/SYSTEM-DESIGN.md` (kể cả dòng còn ghi đề xuất mã vé tuỳ chọn), `docs/CHANGE-GUIDE.md` công thức z31, `docs/SO-HANG-RAO.md`, dòng nợ `POST /api/ve/lo/:id/ve` ở `src/shared/lan-gui-no.ts` (đang tả sai thứ tự và nói băm đã chặn). Chỉ mục băm làm đỏ khoảng 18 bài của module vé vì khung thử dùng băm cố định; chỉ cần sửa dữ liệu thử.

## Tiêu chí nghiệm thu

Trên trang thật trong Chrome (cần `AXE_JS`), không đưa ảnh vé thật vào kho mã: ảnh thử do bộ vẽ QR có sẵn tạo ra. Riêng ca 9 chạy trên ảnh thật trong máy, không lưu lại.

1. Nhập một vé rồi nhập bản nén lại của chính vé đó (tệp khác, cùng QR): bản sau bị loại, kho không đổi. Hàng rào Đ1 chỉ được ghi có hiệu lực sau khi quan sát ca này (P16).
2. Gọi API với cùng byte ảnh nhưng khác `maVe`: bị loại nhờ Đ2. Hai yêu cầu song song cùng một ảnh: một vào, một bị loại, không có lỗi 500.
3. Ảnh không có QR đi cùng hai ảnh tốt: ảnh đó bị loại kèm tên tệp, hai ảnh tốt vào kho.
4. Chọn 51 ảnh khi trần 50: báo ngay, không tạo lô; gọi API thẳng: 400, không có lô mới.
5. Toàn quyền đổi 50 thành 30: lô mới theo 30; nhật ký có số cũ, số mới. Quản trị và Bán hàng gọi `PUT`: 403, không thấy mục trên giao diện.
6. Nhật ký, phản hồi ghi, câu lỗi không chứa chuỗi QR đầy đủ; bài khoá dùng dữ liệu thử 36 chữ số và dò đúng chuỗi đó, vì các bài hiện dò theo mẫu cố định.
7. Kho R2 lỗi một lần rồi gửi lại đúng ảnh đó: vé vào kho.
8. Bỏ dở lô giữa chừng rồi bấm Bỏ lô, nhập lại đúng các ảnh: vào kho. Bỏ lô đã có vé từng được giữ chỗ: bị từ chối. Vé đã lộ nhập lại: bị loại.
9. Đọc 50 ảnh liên tiếp trên Chrome và iPhone thật: trang không treo; ảnh thật có hình mờ đọc được.
10. Kiểm bất biến ở Đ1 mục 6 báo khi có hai vé trùng 12 số cuối.

## Trang ghép (`CLAUDE.md` §9)

| Bảng | Chứa | Thay đổi | Chủ ghi |
|---|---|---|---|
| `vdt_ticket` | một vé; `ticket_code` nay là chuỗi QR do máy đọc | thêm cột đánh dấu; chỉ mục theo mã đổi thành một phần; thêm chỉ mục một phần theo băm | `ve-dien-tu` |
| `vdt_batch` | một lô | không đổi cột; lệnh Bỏ lô đưa về `VOID` | `ve-dien-tu` |
| `vdt_setting` | một dòng: trần lô | mới | `ve-dien-tu` |

| Dòng quyền | Áp cho | Thay đổi |
|---|---|---|
| `settings.ops` | ghi `vdt_setting` | không đổi hàng; thêm một việc cho ô có sẵn |
| `ve.kho.manage` | nhập lô, đọc trần, Bỏ lô | không đổi hàng; ADR-0153 Đ3 đã giao ô này việc thu hồi |

| Cửa | Cổng máy chủ | Giao diện ẩn/hiện |
|---|---|---|
| Đổi trần lô | `settings.ops` | mục ở nhóm THIẾT LẬP chỉ Toàn quyền thấy; ẩn mục không thay cho cổng |
| Nhập lô | `ve.kho.manage`, trần lô, hai chỉ mục duy nhất | trang Vé điện tử như cũ; ô gõ mã biến mất |
| Bỏ lô | `ve.kho.manage`, lô chưa có vé từng được giữ chỗ | danh sách lô bỏ được ở trang Vé điện tử; máy chủ vẫn kiểm lại |

**Chỗ dễ nhầm:** (i) «đọc được QR» chỉ là kiểm ở trình duyệt, máy chủ không xác nhận được (Đ1 mục 5). (ii) Trần lô không phải giới hạn tồn kho. (iii) Chuỗi QR có giá trị như vé, nên vẫn áp đủ luật không lộ của ADR-0153 Đ1 mục 5. (iv) Dấu «chưa từng phát ra» là thứ duy nhất cho phép nhập lại một mã đã có; đặt sai dấu cho vé đã lộ là bán trùng, nên trigger phải chặn đặt dấu cho vé từng có phân bổ.
