# Soát 19 ca sổ vàng chi phí xe thuê (2026-10-02)

Người soát: AI. Chỉ đọc, không sửa tệp nào. Đây là bản để chủ / Kế toán xem trước khi ghi tên xác nhận. AI không tự xác nhận ca nào (ADR-0057 C12, Hiến chương 5.17).

## Kết luận trước

- **Số tiền: 19/19 ca khớp.** Đã cộng tay từng dòng của cả 19 ca, không ca nào lệch.
- **Không ca nào cần sửa đáp án tiền.** Một ca cần sửa **lời mô tả**: V11 ghi "từ 16/10", nhưng dữ liệu là 10/10.
- **Một điểm sổ vàng không bắt được, Kế toán nên xem kỹ nhất là ngày ghi của dòng đảo khi dời ngày (V14).** Mã trên nhánh ghi dòng đảo −1.000.000 vào **ngày chạy mới (01/11)**, không ghi vào ngày của dòng gốc (31/10). Hệ quả: tháng 10 còn +1.000.000 không có dòng trừ, tháng 11 có −1.000.000 + 1.100.000. Tổng chuyến vẫn đúng, nhưng tiền nằm lệch kỳ (chi tiết ở V14).
- **Có 9 ca cần Kế toán xác nhận một điểm theo hợp đồng / thói quen với nhà xe:** V4, V7, V8b, V10, V11, V12, V12b, V13, V14.
- **Sổ còn thiếu một ca mà ADR bắt buộc phải có:** "đổi sang nhà xe khác trước xuất bến" (ADR-0057 C12). Xem mục cuối.

Sổ vàng chỉ kiểm **số tiền và thứ tự dòng**. Nó không kiểm **ngày phát sinh** của từng dòng, nên cũng không kiểm tiền rơi vào tháng nào. Các điểm về kỳ dưới đây do AI đọc mã trên nhánh `worktree-agent-a76ababaa4a5b3183` (`src/modules/van-chuyen/tien-xe-lo.ts:56`, `:77`, `tien-xe-repo.ts`).

## Căn cứ dùng chung

- **ADR-0057 B2** (`docs/adr/ADR-0057-van-chuyen-tien-xe-thue.md:86`): giá chọn theo bảng còn hiệu lực vào **ngày chạy**, đúng nhà xe. Thứ tự ưu tiên: (1) khớp tuyến + cỡ, rồi (2) khớp tuyến với cỡ trống, rồi (3) khớp cỡ với tuyến trống. Không dòng nào khớp thì "không có giá bảng", chuyến bị giữ, **không lấy 0**.
- **ADR-0057 C4** (`:144-153`): giá được **chụp lúc văn phòng xếp xe của nhà xe**.
  - Trước xuất bến, đổi nhà xe / xe / tuyến thì máy **đảo mọi dòng còn hiệu lực rồi chụp lại**. Giá thoả thuận **không** tự chuyển sang.
  - Huỷ thì đảo hết, tổng về 0. Phí huỷ là điều chỉnh Kế toán ghi **sau** khi huỷ.
  - Chuyến gián đoạn thì giữ giá, chỉnh tay.
- **ADR-0057 C8** (`:180-196`):
  - Sổ chỉ ghi thêm, không xoá.
  - Mỗi chuyến tối đa một nguồn giá.
  - Tổng chuyến không được âm **sau mọi dòng**.
  - Lô đảo đảo dòng âm trước, dòng dương sau.
  - Kế toán tự đảo làm tổng âm thì bị từ chối: "Tổng chi phí chuyến sẽ âm — đảo điều chỉnh giảm trước".
- **ADR-0057 C3 dòng `occurred_date`** (`:141`): giá bảng, giá thoả thuận và đảo tự động mang **ngày chạy**. Điều chỉnh do Kế toán chọn ngày, mặc định là hôm nay.
- **Hiến chương** `docs/ARCHITECTURE.md`:
  - 5.4: một nguồn tính tiền.
  - 5.5: chỉ ghi thêm, sai thì ghi dòng đảo.
  - 5.6: chụp tại mốc, đổi chính sách sau mốc không đổi thứ đã chụp.
  - 5.14: ngày phát sinh tách khỏi lúc ghi, kỳ đã khoá thì không ghi thêm.
  - 5.17: sổ vàng do chủ hoặc Kế toán xác nhận.
- **ADR-0080** (`docs/adr/ADR-0080-quyet-toan-thang-va-khoa-ky.md`):
  - Kỳ = tháng của ngày phát sinh.
  - Dòng đảo của một dòng thuộc tháng đã khoá **được** mang ngày mới, ở tháng đang mở (điều 5).
  - Hôm nay khoá kỳ **chưa có** trên nhánh: báo cáo thi công ghi "ky-so chưa có ⇒ không trigger khoá kỳ".
- **Lời chủ:**
  - Giá là bảng giá hiệu lực vào ngày chạy.
  - Dời sang ngày khác thì đảo và chụp lại theo bảng giá ngày mới; giá thoả thuận bị huỷ. Lời chủ ngày 2/10, "Cần chủ 3 = A", **chưa** ghi vào ADR (câu 4.8 còn mở).
  - Chỉ thuê theo chuyến khi cao điểm. Hiện chỉ có xe công ty + 1 xe demo. Taxi chia doanh thu không thuộc sổ này.

Bảng giá dùng trong sổ (Nhà xe Hùng Phát, viết tắt HP):

| Dòng | Tuyến | Cỡ | Giá | Hiệu lực |
|---|---|---|---|---|
| G1 | Nha Trang – Cam Ranh | 16 chỗ | 1.200.000 | 01/10 – 31/10 |
| G2 | Nha Trang – Cam Ranh | (trống) | 1.000.000 | 01/10 – 31/10 |
| G3 | (trống) | 16 chỗ | 900.000 | từ 01/10 |
| G4 | Nha Trang – Cam Ranh | (trống) | 1.100.000 | từ 01/11 |

---

## Từng ca

### V1 (SV-CPX-01): xe 16 chỗ, Cam Ranh, ngày 15/10

1. **Chuyện:** Văn phòng xếp xe 16 chỗ của Hùng Phát chạy Nha Trang – Cam Ranh ngày 15/10. Máy chụp giá bảng. Công ty nợ Hùng Phát tiền chuyến.
2. **Tính tay:** G1 khớp cả tuyến lẫn cỡ, thắng G2 và G3. Ra +1.200.000, tổng 1.200.000. **KHỚP.**
3. **Căn cứ:** ADR-0057 B2 bậc (1).
4. **Kế toán:** Dòng giá bảng là chi phí phải trả nhà xe, ngày phát sinh là ngày chạy 15/10 (C3 `:141`), thuộc tháng 10.
5. **Kết luận:** Xác nhận được.

### V2 (SV-CPX-02): xe 29 chỗ, Cam Ranh, ngày 15/10

1. **Chuyện:** Như V1 nhưng xe 29 chỗ.
2. **Tính tay:** Không có dòng tuyến + cỡ 29. G2 khớp tuyến, cỡ trống, nên ra +1.000.000. **KHỚP.**
3. **Căn cứ:** B2 bậc (2).
4. **Kế toán:** Như V1. Ghi chú về số liệu ví dụ: xe 29 chỗ (1.000.000) lại rẻ hơn xe 16 chỗ (1.200.000) cùng tuyến. Luật vẫn đúng, chỉ là số minh hoạ chưa sát thực tế.
5. **Kết luận:** Xác nhận được.

### V3 (SV-CPX-03): xe 16 chỗ, chưa chọn tuyến

1. **Chuyện:** Văn phòng chưa chọn tuyến, nên máy tra theo cỡ xe.
2. **Tính tay:** G3 (cỡ 16, tuyến trống) ra +900.000. **KHỚP.**
3. **Căn cứ:** B2 bậc (3).
4. **Kế toán:** Như V1.
5. **Kết luận:** Xác nhận được.

### V4 (SV-CPX-04): xe 16 chỗ, tuyến Nha Trang – Đà Lạt

1. **Chuyện:** Tuyến Đà Lạt không có giá riêng, nên máy lùi về giá theo cỡ.
2. **Tính tay:** G3 ra +900.000. **KHỚP.**
3. **Căn cứ:** B2. Không khớp tuyến thì xuống bậc (3).
4. **Kế toán:** Đúng luật, nhưng có điểm thực tế. Tuyến Đà Lạt (xa, có khi qua đêm) lại tính 900.000, rẻ hơn tuyến sân bay 1.200.000. Nếu nhà xe tính Đà Lạt đắt hơn, giá chụp sẽ thấp hơn hoá đơn thật và Kế toán phải ghi điều chỉnh.
5. **Kết luận:** Cần Kế toán xác nhận điểm này: dòng "theo cỡ, tuyến trống" (G3) có đúng là **giá chung cho mọi tuyến** của nhà xe không. Nếu không, Quản trị phải nhập giá riêng cho tuyến xa. Không cần sửa đáp án.

### V5a (SV-CPX-05a): xe 29 chỗ, Cam Ranh, ngày 31/10 (ngày cuối của G2)

1. **Chuyện:** Chuyến chạy đúng ngày cuối bảng giá tháng 10.
2. **Tính tay:** G2 hiệu lực đến hết 31/10, tính cả ngày đó, nên ra +1.000.000. **KHỚP.**
3. **Căn cứ:** ADR-0057 tiêu chí 1 (`:300`, ngày chạy = ngày hết hạn thì vẫn áp). Kế hoạch TC-12.
4. **Kế toán:** Ngày phát sinh 31/10, thuộc tháng 10.
5. **Kết luận:** Xác nhận được.

### V5b (SV-CPX-05b): xe 29 chỗ, Cam Ranh, ngày 01/11

1. **Chuyện:** Hôm sau đã sang bảng giá tháng 11.
2. **Tính tay:** G2 hết hạn, G4 bắt đầu áp, ra +1.100.000. **KHỚP.**
3. **Căn cứ:** B2 + TC-12.
4. **Kế toán:** Tháng 11.
5. **Kết luận:** Xác nhận được.

### V6 (SV-CPX-06): xe 29 chỗ, chưa chọn tuyến, không có giá

1. **Chuyện:** Không dòng giá nào khớp (không có tuyến, không có giá cỡ 29). Máy **không ghi dòng nào** và giữ chuyến ở trạng thái "chưa có giá", không cho xuất bến.
2. **Tính tay:** Không có dòng nào, tổng 0, thiếu giá = có. **KHỚP.**
3. **Căn cứ:** ADR-0057 điểm 3 lời thường (`:39`: "Chưa có giá thì xe KHÔNG được chạy… Không bao giờ tính 0 đồng"), C5. Lời chủ lần 18.
4. **Kế toán:** Đúng nguyên tắc "phải có giá niêm yết hoặc thoả thuận trước". Không ghi dòng 0 đồng, nên không có chi phí ảo.
5. **Kết luận:** Xác nhận được.

### V6b (SV-CPX-06b): tiếp V6, Kế toán nhập giá thoả thuận 1.350.000

1. **Chuyện:** Kế toán chốt giá miệng với anh Hùng từ 14/10 rồi nhập "giá thoả thuận trước" 1.350.000, ghi chú "đã chốt với anh Hùng 14/10". Chuyến được xuất bến.
2. **Tính tay:** Một dòng +1.350.000, thiếu giá = không. **KHỚP.**
3. **Căn cứ:** ADR-0057 C5 (`:157`). Giá thoả thuận chỉ nhập khi chuyến chưa chạy, số dương, lý do bắt buộc.
4. **Kế toán:**
   - Ngày phát sinh = ngày chạy 15/10 (mã: `COST_AGREED_KT` nhận "ngày chạy"), không phải ngày chốt 14/10. Như vậy hợp lý: chi phí gắn với chuyến.
   - Ghi chú nên đủ để đối chiếu (ai chốt, ngày, kênh).
5. **Kết luận:** Xác nhận được.

### V7 (SV-CPX-07): V1 + phụ thu chờ 150.000, rồi đổi tuyến sang Đà Lạt trước xuất bến

1. **Chuyện:**
   - Chuyến V1 đã chụp 1.200.000.
   - Kế toán ghi trước +150.000 "Phụ thu chờ thêm giờ".
   - Trước xuất bến, văn phòng đổi tuyến sang Đà Lạt. Máy đảo hết: đảo phụ thu, đảo giá cũ, rồi chụp giá mới G3 900.000.
   - Phụ thu **không** tự ghi lại, Kế toán phải ghi lại nếu còn đúng.
2. **Tính tay:** 1.200.000 + 150.000 − 150.000 − 1.200.000 + 900.000 = **900.000**. Có 1 điều chỉnh bị đảo. **KHỚP.** Thứ tự dòng: cả hai dòng gốc đều dương, nên đảo dòng mới nhất (phụ thu) trước, theo quy ước trong kế hoạch Task 6.
3. **Căn cứ:** C4 `:151`: "đảo **mọi** dòng còn hiệu lực rồi mới chụp `SNAPSHOT` mới… điều chỉnh đã ghi trước xuất bến bị đảo theo".
4. **Kế toán:**
   - Các dòng đảo là bút toán đảo đúng nghĩa: dòng mới đối dấu, trỏ dòng gốc, không xoá (5.5).
   - Phụ thu chờ thường chỉ phát sinh **trong lúc chạy**. Ghi trước xuất bến là ghi ước tính, nên bị đảo khi đổi tuyến là hợp lý.
   - Kế toán xác nhận theo hợp đồng nhà xe: phụ thu chờ do nhà xe báo sau chuyến hay thoả thuận trước. Nếu luôn báo sau, ca này hiếm gặp nhưng vẫn đúng luật.
   - Thêm điểm số liệu như V4: tuyến Đà Lạt (900.000) rẻ hơn tuyến sân bay.
5. **Kết luận:** Xác nhận được về số tiền. Cần Kế toán xác nhận điểm: thời điểm ghi phụ thu chờ theo thực tế với nhà xe (không đổi đáp án).

### V8 (SV-CPX-08): V1 + điều chỉnh −200.000 "Nhập sai", rồi huỷ chuyến

1. **Chuyện:** Kế toán đã ghi giảm 200.000, sau đó văn phòng huỷ chuyến. Lô huỷ đảo dòng âm trước (+200.000), rồi đảo giá bảng (−1.200.000).
2. **Tính tay:** 1.200.000 − 200.000 + 200.000 − 1.200.000 = **0**. **KHỚP.**
   - Tổng giữa lô: 1.000.000, rồi 1.200.000, rồi 0. Không lúc nào âm.
   - Nếu đảo dương trước thì tổng thành −200.000, trái C8.
3. **Căn cứ:** C4 `:150` (huỷ đảo mọi dòng, âm trước dương sau), C8 `:194`.
4. **Kế toán:**
   - Huỷ trước khi chạy thì không phát sinh chi phí với nhà xe, tổng về 0 là đúng.
   - Mọi dòng đảo do huỷ mang **ngày chạy** 15/10 (mã `tien-xe-lo.ts:77`).
     - Dòng giá bảng cũng mang 15/10, nên phần giá bảng tự triệt tiêu trong tháng 10.
     - Riêng dòng −200.000 "Nhập sai" mang ngày Kế toán chọn (mặc định là ngày ghi). Nếu ghi trong tháng 9, dòng đảo +200.000 lại rơi vào tháng 10. Chuyện này cùng gốc với điểm V14.
5. **Kết luận:** Xác nhận được.

### V8b (SV-CPX-08b): tiếp V8, Kế toán ghi +300.000 "Phí huỷ muộn"

1. **Chuyện:** Hùng Phát tính phí vì công ty huỷ sát giờ. Kế toán ghi điều chỉnh +300.000 sau khi chuyến đã huỷ.
2. **Tính tay:** 0 + 300.000 = **300.000**. **KHỚP.**
3. **Căn cứ:** C4 `:150` ("phí huỷ nếu có = `ADJUSTMENT` Kế toán ghi tay **sau** đó (Q7)"). Tiêu chí nghiệm thu 5 (`:308`).
4. **Kế toán:**
   - Ngày phát sinh của dòng phí huỷ: mặc định là **hôm nay** (ngày Kế toán ghi), Kế toán chọn lại được. Nên chọn ngày nhà xe báo phí, hoặc ngày huỷ.
   - Kế toán xác nhận theo hợp đồng nhà xe: có điều khoản phí huỷ muộn không, huỷ trước bao lâu thì bị tính, tính bao nhiêu. Mức 300.000 là số minh hoạ.
5. **Kết luận:** Cần Kế toán xác nhận điểm: điều khoản phí huỷ trong hợp đồng với nhà xe, và quy ước chọn ngày phát sinh cho dòng phí huỷ.

### V9 (SV-CPX-09): V1 + (−200.000), Kế toán tự đảo giá bảng thì bị từ chối

1. **Chuyện:** Kế toán muốn bỏ giá bảng trong khi vẫn còn điều chỉnh giảm. Nếu đảo, tổng sẽ là 1.000.000 − 1.200.000 = −200.000, nên máy từ chối: "Tổng chi phí chuyến sẽ âm — đảo điều chỉnh giảm trước". Không ghi gì thêm.
2. **Tính tay:** Còn 1.200.000 − 200.000 = **1.000.000**, sự kiện thứ 3 bị từ chối vì tổng âm. **KHỚP.**
3. **Căn cứ:** C8 `:190` (tổng ≥ 0 sau mọi dòng), `:195` (đúng lời từ chối).
4. **Kế toán:** Chi phí phải trả không thể âm. Từ chối là đúng. Cách đúng là đảo dòng −200.000 trước, rồi mới đảo giá bảng.
5. **Kết luận:** Xác nhận được.

### V10 (SV-CPX-10): V1, xe hỏng giữa đường, Kế toán ghi −400.000 "Khác"

1. **Chuyện:** Xe Hùng Phát hỏng giữa đường, chuyến kết thúc gián đoạn. Máy giữ giá đã chụp 1.200.000. Nhà xe tính ít hơn, nên Kế toán ghi giảm 400.000.
2. **Tính tay:** 1.200.000 − 400.000 = **800.000**. **KHỚP.**
3. **Căn cứ:** ADR-0057 điểm 7 lời thường (`:43`), C4 `:153`. Chủ chọn Q-T6: "Giữ giá đã chụp, Kế toán chỉnh tay".
4. **Kế toán:**
   - Kế toán xác nhận theo hợp đồng nhà xe: khi xe nhà xe hỏng giữa đường thì tính thế nào (trả theo đoạn đã chạy, không trả, hay trả đủ rồi trừ bồi thường). Chi phí xe cứu hộ / xe thay thế là chuyến khác.
   - Lý do "Khác" quá chung. Nên bắt buộc ghi chú rõ ("xe hỏng km …, nhà xe giảm …"), để đối chiếu với hoá đơn nhà xe.
5. **Kết luận:** Cần Kế toán xác nhận điểm: cách tính với nhà xe khi xe hỏng, và có cần một lý do riêng (ví dụ "Giảm trừ do gián đoạn") thay vì "Khác" không. Không đổi đáp án.

### V11 (SV-CPX-11): V1 đã chụp, sau đó Quản trị đổi giá cùng tuyến / cỡ, chi phí không đổi

1. **Chuyện:** Chuyến 15/10 đã chụp 1.200.000. Sau đó Quản trị nhập giá mới G5 1.500.000 thay G1. Chuyến đã xếp **giữ** 1.200.000.
2. **Tính tay:** Vẫn một dòng +1.200.000. **KHỚP.**
3. **Căn cứ:** Hiến chương 5.6 (đổi chính sách sau mốc không đổi thứ đã chụp), C4 (mốc = lúc xếp).
4. **Kế toán:**
   - **Mô tả lệch dữ liệu.** Mô tả ghi "G5 … từ 16/10", nhưng sự kiện ghi `"tu": "2026-10-10"`, còn bảng ví dụ trong kế hoạch ghi "áp từ hôm nay". Dữ liệu 10/10 phủ cả ngày chạy 15/10 nên **là phép thử mạnh hơn**: dù giá mới đã áp cho đúng ngày đó, chuyến cũ vẫn giữ giá. Nên sửa mô tả thành "từ 10/10", giữ dữ liệu và đáp án.
   - Kế toán xác nhận theo hợp đồng nhà xe: khi nhà xe báo tăng giá, giá mới áp cho **chuyến đặt sau** hay cho **mọi chuyến chạy từ ngày X** (kể cả chuyến đã xếp trước). Nếu là vế sau, Kế toán phải dùng "Lấy lại giá bảng" (C5 "chụp lại", chỉ khi chuyến chưa chạy) cho từng chuyến đã xếp.
5. **Kết luận:** Đề nghị sửa **mô tả** (không sửa đáp án): "từ 16/10" thành "từ 10/10". Cần Kế toán xác nhận điểm: giá mới của nhà xe áp cho chuyến đã xếp hay không.

### V12 (SV-CPX-12): V6b (thoả thuận 1.350.000) rồi đổi tuyến sang Cam Ranh

1. **Chuyện:** Chuyến đang có giá thoả thuận. Văn phòng chọn tuyến Cam Ranh, máy đảo giá thoả thuận và chụp giá bảng G2 1.000.000. Giá thoả thuận **không** tự chuyển sang.
2. **Tính tay:** 1.350.000 − 1.350.000 + 1.000.000 = **1.000.000**. **KHỚP.**
3. **Căn cứ:** C4 `:147` ("giá thoả thuận **không** tự chuyển… kể cả đổi tuyến hay đổi xe cùng nhà xe").
4. **Kế toán:**
   - Bút toán đảo đúng.
   - Kế toán xác nhận theo thoả thuận với nhà xe: anh Hùng đã chốt 1.350.000 cho chuyến này. Khi văn phòng chỉ chọn thêm tuyến (thực tế có thể vẫn là chuyến đó), máy hạ xuống giá bảng 1.000.000. Nếu nhà xe vẫn đòi 1.350.000, Kế toán phải đảo giá bảng rồi nhập lại thoả thuận trước xuất bến (C5 `:157`).
5. **Kết luận:** Cần Kế toán xác nhận điểm: quy trình nhập lại giá thoả thuận khi văn phòng sửa tuyến, để tránh trả lệch so với lời đã chốt với nhà xe. Không đổi đáp án.

### V12b (SV-CPX-12b): V6b rồi đổi tuyến sang Đà Lạt (xe 29 chỗ, không có giá)

1. **Chuyện:** Đảo thoả thuận. Không có giá Đà Lạt cho xe 29 chỗ, nên chuyến quay lại trạng thái "chưa có giá", không được chạy tới khi nhập lại thoả thuận.
2. **Tính tay:** 1.350.000 − 1.350.000 = **0**, thiếu giá = có. **KHỚP.**
3. **Căn cứ:** C4 `:147` ("không có giá bảng thì chuyến thành 'thiếu giá'"), C12 (bắt buộc có ca "đổi tuyến khi nguồn là thoả thuận, ra thiếu giá").
4. **Kế toán:** Như V12. Đây là lưới an toàn: không có giá thì không chạy.
5. **Kết luận:** Cần Kế toán xác nhận điểm như V12 (quy trình nhập lại thoả thuận). Đáp án đúng luật.

### V13 (SV-CPX-13): V1 rồi đổi sang xe công ty

1. **Chuyện:** Văn phòng thôi thuê Hùng Phát, dùng xe công ty. Máy đảo giá thuê, chuyến thành "không thuê", không cần giá.
2. **Tính tay:** 1.200.000 − 1.200.000 = **0**. **KHỚP.**
3. **Căn cứ:** C4 (đổi xe trước xuất bến thì đảo). ADR-0004 bổ sung (d) (`:257`): sổ này không gồm chi phí xe công ty.
4. **Kế toán:**
   - Chi phí xe công ty không thuộc sổ này, tổng 0 là đúng.
   - **Câu 4.7 còn mở** (báo cáo kiểm độc lập, mục Câu hỏi cho chủ, ý 1): nếu Hùng Phát vẫn tính phí huỷ muộn vì bị đổi sát giờ, nhánh đang **chặn** ghi phí này trên chuyến đã đổi sang xe công ty (409 "Chuyến này không còn là xe thuê"). Phí đó phải ghi ngoài app.
   - Kế toán xác nhận theo hợp đồng nhà xe: đổi sang xe công ty sát giờ có bị nhà xe tính phí không, và có chấp nhận ghi ngoài app không.
5. **Kết luận:** Cần Kế toán xác nhận điểm: câu 4.7 (phí cho nhà xe cũ khi đổi sang xe công ty). Đáp án hiện tại đúng.

### V14 (SV-CPX-14): chuyến 31/10 xe 29 chỗ Cam Ranh dời sang 01/11 trước xuất bến

1. **Chuyện:** Chuyến đặt 31/10, đã chụp G2 1.000.000. Dời sang 01/11, máy đảo G2 và chụp G4 1.100.000 theo bảng giá ngày mới.
2. **Tính tay:** 1.000.000 − 1.000.000 + 1.100.000 = **1.100.000**. **KHỚP.**
3. **Căn cứ:**
   - Căn cứ là **lời chủ 2/10** ("Cần chủ 3 = A": dời ngày cũng tính lại giá), **chưa có trong chữ ADR**. ADR-0057 C4 `:147` chỉ liệt kê đổi nhà xe / xe / tuyến.
   - Câu 4.8 (ghi dòng trạng thái ADR trỏ lời chủ) còn mở. Vậy số tiền xác nhận được, nhưng ADR cần ghi bổ sung.
4. **Kế toán (điểm quan trọng nhất của cả sổ):**
   - Mã trên nhánh ghi dòng đảo −1.000.000 với ngày phát sinh = **ngày chạy MỚI 01/11** (`tien-xe-lo.ts:56`, `ngay: v.ngayChayMoi`), không phải 31/10 của dòng gốc.
   - Theo ngày phát sinh (cách khoá kỳ ADR-0080 tính kỳ):
     - tháng 10 còn **+1.000.000** mà không có chuyến nào chạy;
     - tháng 11 có −1.000.000 + 1.100.000 = +100.000.
   - Bảng kê hôm nay lọc theo **ngày chạy hiện tại** của chuyến nên vẫn đúng (cả 3 dòng nằm dưới chuyến 01/11). Nhưng mọi tổng hợp theo ngày phát sinh, và sau này là khoá kỳ, sẽ thấy tháng 10 thừa 1.000.000.
   - Hai cách hiểu:
     - **(a) Ghi dòng đảo vào ngày của dòng gốc (31/10)**, nếu tháng 10 còn mở. Tháng 10 tự triệt tiêu, tháng 11 = 1.100.000. Đúng nguyên tắc chung "ghi chi phí vào kỳ chuyến chạy". Nếu tháng 10 đã khoá thì mới dùng ngày mới, theo ADR-0080 điều 5.
     - **(b) Giữ như mã** (ngày chạy mới). Đơn giản, không bao giờ vướng khoá kỳ, nhưng lệch kỳ như trên.
   - Chữ ADR `:141` ("đảo tự động = `service_date`") không nói rõ là ngày cũ hay ngày mới. Ca **huỷ** (V8) thì không vướng vì dùng đúng một ngày chạy.
   - Luật chung trong mã: **mọi dòng đảo tự động lấy ngày chạy của chuyến** (`tien-xe-lo.ts:56` cho lô đổi, `:77` cho lô huỷ), không bao giờ lấy ngày của dòng gốc. Có hai trường hợp lệch kỳ:
     - Lớn nhất: dời chuyến sang tháng khác (ca này).
     - Thứ hai: đảo một **điều chỉnh** do Kế toán ghi với ngày ở tháng khác ngày chạy, khi đổi tuyến / đổi xe / huỷ (ví dụ V7, V8 nếu điều chỉnh được ghi ở tháng trước).
     - Đổi tuyến / đổi xe không đổi ngày nên giá bảng và giá thoả thuận không bị lệch.
5. **Kết luận:** Số tiền xác nhận được. **Cần Kế toán xác nhận điểm:** dòng đảo khi dời ngày chạy sang tháng khác phải mang ngày nào, (a) hay (b). Nếu chọn (a) thì là việc sửa mã (`tien-xe-lo.ts:56`), và nên thêm vào sổ vàng trường ngày phát sinh cho từng dòng, để sổ vàng kiểm được kỳ chứ không chỉ kiểm tiền.

### V14b (SV-CPX-14b): V6b, dời GIỜ trong cùng ngày, không tính lại

1. **Chuyện:** Chuyến có thoả thuận 1.350.000 được dời giờ nhưng vẫn ngày 15/10. Máy không đảo, thoả thuận giữ nguyên.
2. **Tính tay:** Vẫn +1.350.000. **KHỚP.**
3. **Căn cứ:** Lời chủ 2/10 (dời **sang ngày khác** mới tính lại). Báo cáo thi công Task 9: "cùng ngày thì không".
4. **Kế toán:** Hợp lý. Lưu ý: dời giờ **qua nửa đêm** là đổi ngày, nên thoả thuận sẽ bị huỷ (kế hoạch, câu 3 (A), vế "Mất"). Chưa có ca sổ vàng cho trường hợp này.
5. **Kết luận:** Xác nhận được.

---

## Tổng hợp

| Ca | Số tiền | Kết luận |
|---|---|---|
| V1, V2, V3, V5a, V5b, V6, V6b, V8, V9, V14b | Khớp | Xác nhận được |
| V4 | Khớp | Kế toán xác nhận: giá theo cỡ là giá chung mọi tuyến? |
| V7 | Khớp | Kế toán xác nhận: phụ thu chờ ghi trước hay sau chuyến |
| V8b | Khớp | Kế toán xác nhận theo hợp đồng: điều khoản phí huỷ muộn + ngày ghi |
| V10 | Khớp | Kế toán xác nhận theo hợp đồng: xe hỏng giữa đường tính thế nào; lý do riêng thay "Khác" |
| V11 | Khớp | **Sửa mô tả** 16/10 thành 10/10; Kế toán xác nhận giá tăng có áp cho chuyến đã xếp |
| V12, V12b | Khớp | Kế toán xác nhận quy trình nhập lại thoả thuận khi đổi tuyến |
| V13 | Khớp | Câu 4.7 còn mở (phí nhà xe cũ khi đổi sang xe công ty) |
| V14 | Khớp | **Ngày của dòng đảo khi dời sang tháng khác** (mã ghi ngày mới, nên lệch kỳ); ADR chưa ghi lời chủ (4.8) |

Khớp số 19/19, lệch số 0. 10 ca xác nhận được ngay, 9 ca có một điểm cần Kế toán xác nhận (không ca nào phải đổi số tiền). 1 đề nghị sửa mô tả (V11).

---

## Tình huống thực tế chưa có ca nào phủ

Phần chữ đậm là thiếu sót mà ADR **bắt buộc** phải có ca.

| # | Tình huống | Có căn cứ trong ADR? |
|---|---|---|
| 1 | **Đổi sang xe của nhà xe khác (có giá) trước xuất bến.** ADR-0057 C12 `:205` bắt buộc ca "đổi nhà xe … trước xuất bến". Sổ chỉ có một nhà xe (HP). V13 đổi sang xe công ty, không phải sang nhà xe khác. | **Có, C4 + C12 bắt buộc.** Đề nghị thêm ca. |
| 2 | Một lô đảo **cả điều chỉnh âm lẫn điều chỉnh dương** cùng lúc. C12 đòi ca "lô huỷ/đổi đảo âm trước – dương sau (có điều chỉnh âm và dương)". V7 chỉ có điều chỉnh dương, V8 chỉ có điều chỉnh âm. Nếu C12 đọc là "trong cùng một lô" thì còn thiếu. | Có (C8 `:194`). Câu hỏi: chủ / Kế toán xem C12 có đòi chung một lô không. |
| 3 | Giá ngày lễ / Tết / cao điểm khác giá thường (ví dụ xe 16 chỗ 30/4 đắt hơn). Bảng giá chỉ có khoảng hiệu lực. Muốn làm thì phải đóng dòng thường, thêm dòng lễ, rồi thêm lại dòng thường (trigger cấm chồng giá), hoặc nhập giá thoả thuận từng chuyến. | Một phần (hiệu lực theo ngày + chồng giá). Không có khái niệm "ngày lễ". |
| 4 | Nhà xe báo tăng giá cho chuyến **đã xếp**. Hệ thống giữ giá cũ (V11). Muốn trả giá mới thì Kế toán phải đảo rồi "lấy lại giá bảng" hoặc nhập thoả thuận, trước xuất bến. Chưa có ca cho đường "lấy lại giá bảng" thành công. | Có (C5 "chụp lại"; kế hoạch Task 13). |
| 5 | Chuyến hai chiều / khứ hồi (đưa khách ra sân bay rồi đón đoàn khác về). | Không. ADR chỉ có "giá mỗi chuyến" (`unit = PER_TRIP`, `:81`). Phải làm hai chuyến, hoặc một tuyến "khứ hồi" riêng. |
| 6 | Chuyến nhiều ngày (Đà Lạt 2 ngày 1 đêm): phụ phí lưu đêm tài xế. | Một phần: giá theo chuyến, ngày = ngày bắt đầu. Phụ phí phải ghi điều chỉnh "Khác". Không có lý do riêng. |
| 7 | Chuyến qua nửa đêm: giá tra theo ngày bắt đầu. | Có (Review Focus 3, ADR tiêu chí 8 `:312`). Có bài kiểm RF3 trong mã, không có ca sổ vàng. |
| 8 | Dời giờ qua nửa đêm khi đang có giá thoả thuận, nên thoả thuận bị huỷ. | Có (lời chủ 2/10). Chưa có ca. |
| 9 | Dời ngày chạy sang **tháng khác khi tháng cũ đã khoá sổ**. | Có (ADR-0080 điều 5). Khoá kỳ chưa thi công. |
| 10 | Phí cho nhà xe cũ khi đổi sang xe công ty sát giờ (câu 4.7). | Đang chờ chủ chọn. |
| 11 | Phí cầu đường / bến bãi ghi sau chuyến (lý do `CPX_CAU_DUONG` đã có). | Có (TC-7). Chưa có ca, nhưng đơn giản. |
| 12 | Đổi xe cùng nhà xe sang cỡ khác (16 lên 29 chỗ vì khách tăng). | Có (C4). Chưa có ca. |
| 13 | Nhà xe đã thôi hợp tác mà văn phòng đổi tuyến / dời ngày: cả lệnh bị từ chối (`carrier_inactive`). | Có (C4 `:148`). Không sinh tiền nên không cần ca sổ vàng; có bài kiểm RF1. |
| 14 | Kế toán đảo nhầm rồi muốn ghi giá khác giá bảng: đảo điều chỉnh âm, đảo giá bảng, nhập thoả thuận (đường đúng sau V9). | Có (C5 `:157`, C8 `:195`). Chưa có ca cho đường thành công. |
| 15 | Giá thuê đã gồm VAT hay chưa; đối chiếu với hoá đơn nhà xe. | Không. ADR-0057 không nói VAT. Kế toán nên chốt quy ước "giá nhập vào bảng là giá trước hay sau thuế". |
| 16 | Một đoàn đông cần 2 xe của cùng nhà xe. | Có gián tiếp: mỗi xe là một chuyến riêng, mỗi chuyến một giá. |
| 17 | Xe cứu hộ / xe thay thế khi xe nhà xe hỏng (đi kèm V10). | Có (ADR-0057 `:283`, ADR-0052 tạm): chuyến cứu hộ xe thuê phải có giá trước. Chưa có ca. |
| 18 | Nhà xe tính theo giờ / km. | Không. Ngoài phạm vi (`:240`, cần ADR mới). |

Bối cảnh (lời chủ): hiện chỉ có xe công ty + 1 xe demo, thuê theo chuyến khi cao điểm. Nên ưu tiên #1 (ADR bắt buộc), #3 (cao điểm = lễ), #4 (tăng giá) và #9 (khoá kỳ, đi kèm điểm V14).
