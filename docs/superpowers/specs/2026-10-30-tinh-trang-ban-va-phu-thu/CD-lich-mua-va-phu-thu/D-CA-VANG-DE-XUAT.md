# Ca vàng đề xuất — Phụ thu mùa vụ (lượt D) — cho chủ dự án xác nhận

> **Chỉ là đề xuất.** Chưa tạo tệp trong `golden/`. Khi chủ xác nhận, người thi công chép thành `golden/phu-thu-mua-vu.json` (tên tạm) theo khuôn `golden/README.md`: mỗi ca `ma`, `ten`, `xac_nhan { trang_thai: "cho_xac_nhan" | "da_xac_nhan", nguoi, ngay }`, `dau_vao`, `dap_an`; tiền là số nguyên đồng. **AI không tự xác nhận ca nào** (Hiến pháp N8); chủ đã nói: «Tôi sẽ xác nhận các ca vàng tính tiền mẫu» (P-5). Mã tiền chỉ được viết sau khi có ca đã xác nhận, và chỉ được nhận khi qua 100% (Hiến chương 5.17).
>
> Mọi tên dịch vụ, nhóm, mùa, đối tác dưới đây là **ví dụ dữ liệu**, không nằm trong mã.

## Cách đọc

- Cột «Câu cần xác nhận» chỉ ra chỗ đáp án phụ thuộc một lựa chọn chưa chốt (D-Q1…D-Q6, D2-Q1…D2-Q3 của `D-DE-XUAT-ADR.md`). Đáp án ghi theo **khuyến nghị**; cột này cũng ghi số thay thế nếu chọn khác.
- Bản sửa 1 (30/10): thêm PT-14 (Còn vé kèm đổi ngày), PT-15 (mở lại nháp trên form), PT-16 (giảm giá lớn hơn phụ thu khi nhà cung cấp bán), PT-D2-06 (mùa cao chỉ có quy tắc cho loại khác) theo báo cáo kiểm `../KIEM-C-D/BAO-CAO.md` V-1. Người kiểm đã tính tay lại 24 ca của bản đầu: không ca nào sai số.
- Ca thuộc **Đ5** (sổ công nợ, chia phần — lượt D2): PT-04b, PT-13, PT-16. Mã chỉ đúng khi D1 và D2 cùng phát hành.
- «Dòng phụ thu» viết dạng `số lượng × đơn giá = thành tiền`.
- NL = người lớn, TE = trẻ em, NCT = người cao tuổi, EB = em bé.

## Dữ liệu chung (dùng cho mọi ca, trừ khi ca ghi khác)

| Dịch vụ (ví dụ) | Nhóm | Đơn vị | Giá niêm yết |
|---|---|---|---|
| A — vé tham quan theo người | G1 | theo người | NL 1.050.000 · TE 800.000 · NCT 800.000 · EB 0 |
| A2 — vé tham quan theo người | G1 | theo người | NL 500.000 · TE 350.000 · NCT 400.000 · EB 0 |
| K — phòng khách sạn 2 khách/phòng | G2 | mỗi phòng tối đa 2 khách | 1.150.000 / phòng |
| T — tour nhóm 5 khách/lượt | G3 | mỗi lượt tối đa 5 khách | 2.500.000 / lượt |

| Mùa (ví dụ) | Loại | Ưu tiên | Khoảng đã xác nhận |
|---|---|---:|---|
| Tết Nguyên đán | Lễ theo luật | 50 | 05/02/2027 – 09/02/2027 |
| Cao điểm hè | Mùa kinh doanh | 10 | 01/06/2027 – 31/08/2027 |
| Lễ hội biển | Mùa kinh doanh | 20 | 10/06/2027 – 15/06/2027 |

## A. Lượt D1 — tính tiền

| Mã | Tình huống | Quy tắc đang có | Đơn | Dòng phụ thu | Tổng đơn | Câu cần xác nhận / Nếu chọn khác |
|---|---|---|---|---|---|---|
| **PT-01** | Mỗi khách, số tiền | Tết · nhóm G1 · mỗi khách NL 100.000 / TE 50.000 / NCT 100.000 | A: 2 NL, 1 TE, 1 EB · ngày đi 07/02/2027 | NL `2 × 100.000 = 200.000`; TE `1 × 50.000 = 50.000`; EB: không dòng | dịch vụ 2.900.000 + phụ thu 250.000 = **3.150.000** | Em bé 0 (GĐ-2) |
| **PT-02** | Mỗi khách, phần trăm, làm tròn lên | Tết · dịch vụ A · 12,5% | A: 3 NL, 1 NCT · 06/02/2027 | NL: 1.050.000 × 12,5% = 131.250 → **132.000**; `3 × 132.000 = 396.000`. NCT: 800.000 × 12,5% = 100.000 → 100.000; `1 × 100.000 = 100.000` | 3.950.000 + 496.000 = **4.446.000** | GĐ-3 làm tròn **từng khách** rồi nhân. Nếu làm tròn trên tổng: 493.750 → 494.000 ⇒ tổng 4.444.000 |
| **PT-03** | Theo dịch vụ (mỗi phòng), số tiền | Tết · nhóm G2 · mỗi đơn vị 300.000 | K: 5 khách · 08/02/2027 ⇒ 3 phòng | `3 × 300.000 = 900.000` | 3.450.000 + 900.000 = **4.350.000** | Phòng thứ ba chỉ 1 khách vẫn tính một phòng (theo đơn vị của dòng) |
| **PT-03b** | Theo dịch vụ, phần trăm, làm tròn | Tết · dịch vụ K · 15% | K: 5 khách · 08/02/2027 ⇒ 3 phòng | 1.150.000 × 15% = 172.500 → **173.000**; `3 × 173.000 = 519.000` | 3.450.000 + 519.000 = **3.969.000** | D-Q2: «phần trăm mỗi khách» trên dịch vụ phòng cho **cùng số** này (phần trăm luôn trên giá của đơn vị tính) |
| **PT-03c** | Mỗi khách trên dịch vụ theo phòng | Tết · nhóm G2 · mỗi khách NL 100.000 | K: 5 khách ⇒ 3 phòng | `5 × 100.000 = 500.000` (theo **khách**, không theo phòng) | 3.450.000 + 500.000 = **3.950.000** | Cho thấy khác biệt giữa «mỗi khách» và «mỗi đơn vị» |
| **PT-04** | Đơn đối tác có hoa hồng — phụ thu không vào hoa hồng | như PT-01; mức hoa hồng của loại đối tác X: 10% nhóm G1 | như PT-01; bên đặt là đối tác P (loại X), P thu đủ tiền khách | như PT-01: 250.000 | **3.150.000** | Hoa hồng = 10% × **2.900.000** = **290.000** (không phải 315.000). Giá đại lý dịch vụ = 2.610.000. Sau «Đã giao»: P giữ hộ 3.150.000, công ty nợ P hoa hồng 290.000 ⇒ **P còn nợ công ty 2.860.000** = 2.610.000 + 250.000 phụ thu. Trần giảm giá của P = 290.000 |
| **PT-04b** | Như PT-04, đối tác giảm giá cho khách 100.000 | như PT-04 | như PT-04, giảm giá 100.000; P thu 3.050.000 | 250.000 | 3.150.000 − 100.000 = **3.050.000** | «Đã giao»: thành tiền trước giảm (`gross_snapshot`) = **3.150.000** (gồm phụ thu); phải thu 3.050.000; dòng «giảm giá bên đặt chịu» = **100.000**. P giữ hộ 3.050.000 − hoa hồng 290.000 + giảm giá 100.000 ⇒ **P còn nợ 2.860.000** (P chịu giảm giá). **Đối chứng lỗi** nếu thành tiền trước giảm chỉ tính dịch vụ (2.900.000): giảm giá bên đặt chịu = max(0, 2.900.000 − 3.050.000) = 0 ⇒ P nợ 2.760.000, công ty mất 100.000 |
| **PT-04c** | Hoa hồng «mỗi khách» trên tour nhóm — không đếm dòng phụ thu | Tết · nhóm G3 · mỗi đơn vị 200.000; mức hoa hồng loại X: 150.000 mỗi khách (dịch vụ nhóm tính theo lượt) | T: 7 khách · 07/02/2027 ⇒ 2 lượt; bên đặt P | `2 × 200.000 = 400.000` | 5.000.000 + 400.000 = **5.400.000** | Hoa hồng = 150.000 × **2 lượt** = **300.000**. **Đối chứng lỗi** nếu dòng phụ thu bị đếm: 4 lượt ⇒ 600.000 |
| **PT-06** | Hai mùa chồng — chỉ một | Cao điểm hè (10) · nhóm G1 · mỗi khách NL 50.000 / TE 30.000 / NCT 50.000. Lễ hội biển (20) · dịch vụ A · 10% | A: 2 NL · 12/06/2027 (thuộc cả hai mùa) | Lễ hội thắng: 1.050.000 × 10% = 105.000; `2 × 105.000 = 210.000` | 2.100.000 + 210.000 = **2.310.000** | Không cộng dồn (không phải 310.000). Cùng đơn ngày **20/06/2027** (chỉ Cao điểm): `2 × 50.000 = 100.000` ⇒ 2.200.000 |
| **PT-06b** | Mùa ưu tiên cao **không** có quy tắc cho dịch vụ này | như PT-06 | A2: 2 NL · 12/06/2027 | Lễ hội không có quy tắc cho A2 ⇒ xét Cao điểm: `2 × 50.000 = 100.000` | 1.000.000 + 100.000 = **1.100.000** | **D-Q3.** Nếu chọn «mùa thắng không có quy tắc thì không phụ thu»: 0 ⇒ 1.000.000 |
| **PT-06c** | Nhóm của mùa cao gặp dịch vụ của mùa thấp | Lễ hội biển (20) · nhóm G1 · 10%. Cao điểm hè (10) · dịch vụ A · mỗi khách NL 200.000 | A: 2 NL · 12/06/2027 | Mùa trước: Lễ hội (quy tắc nhóm) ⇒ `2 × 105.000 = 210.000` | **2.310.000** | **D-Q4.** Nếu «dịch vụ trước mùa»: `2 × 200.000 = 400.000` ⇒ 2.500.000 |
| **PT-07** | Dịch vụ riêng thắng nhóm (cùng mùa) | Tết · nhóm G1 · mỗi khách 100.000 / 50.000 / 100.000. Tết · dịch vụ A · mỗi khách 150.000 / 80.000 / 150.000 | A: 2 NL, 1 TE; A2: 2 NL · 07/02/2027 | A: `2 × 150.000 = 300.000`, `1 × 80.000 = 80.000`; A2: `2 × 100.000 = 200.000` | dịch vụ 2.900.000 + 1.000.000; phụ thu 580.000 ⇒ **4.480.000** | — |
| **PT-08** | Đổi ngày đi: nháp tính lại; đã xác nhận giữ | như PT-01 | (a) nháp ngày 15/02/2027 → (b) Lưu với ngày 07/02/2027 → (c) xác nhận → (d) đổi ngày sang 15/02/2027 | (a) không dòng; (b) 250.000; (c) chụp 250.000; (d) **giữ 250.000** | (a) 2.900.000; (b), (c), (d) **3.150.000** | (d): phản hồi có cảnh báo «ngày mới không thuộc mùa nào; phụ thu giữ như lúc xác nhận: 250.000 ₫» (G4). Biến thể: (b′) đổi ngày bằng «Sửa thông tin chuyến» rồi bấm xác nhận ⇒ **409 «phụ thu đã đổi»**, không ghi; Lưu lại rồi xác nhận ⇒ 3.150.000 (**D-Q6**) |
| **PT-09** | Sửa số khách sau xác nhận — theo đơn giá đã chụp | như PT-01, **sau** xác nhận Kế toán kết thúc quy tắc, đặt quy tắc mới NL 120.000 | PT-01 đã xác nhận; văn phòng sửa 2 NL → 3 NL | NL `3 × 100.000 = 300.000` (đơn giá đã chụp, không 120.000); TE `1 × 50.000` | dịch vụ 3 × 1.050.000 + 800.000 = 3.950.000; phụ thu 350.000 ⇒ **4.300.000** | Giá NL của **dịch vụ** vẫn 1.050.000 — không bị thay bằng 100.000 (bẫy `storedUnitPrices`) |
| **PT-09b** | Sửa số khách sau xác nhận — phần trăm theo phòng | như PT-03b | PT-03b đã xác nhận; 5 → 7 khách ⇒ 4 phòng | `4 × 173.000 = 692.000` (không làm tròn lại) | 4.600.000 + 692.000 = **5.292.000** | — |
| **PT-10** | Giá thỏa thuận thấp hơn niêm yết, phụ thu phần trăm | Tết · dịch vụ A · 12,5% | Văn phòng bán A cho 2 NL giá 950.000 (niêm yết 1.050.000) · 07/02/2027 | Trên niêm yết: 131.250 → 132.000; `2 × 132.000 = 264.000` | 1.900.000 + 264.000 = **2.164.000** | **D-Q1.** Nếu trên giá thỏa thuận: 950.000 × 12,5% = 118.750 → 119.000; `2 × 119.000 = 238.000` ⇒ 2.138.000 |
| **PT-11** | Mỗi đơn vị trên dịch vụ theo người — em bé không tính | Tết · dịch vụ A · mỗi đơn vị 80.000 | A: 2 NL, 1 TE, 1 NCT, 2 EB · 07/02/2027 | `2 × 80.000` + `1 × 80.000` + `1 × 80.000` = **320.000**; EB không dòng | 2.100.000 + 800.000 + 800.000 + 0 + 320.000 = **4.020.000** | GĐ-2 em bé 0 áp cho cả «mỗi đơn vị» |
| **PT-12** | Dịch vụ nhập tay không có phụ thu | như PT-01 | A: 2 NL; dịch vụ nhập tay «xe riêng» 1 × 500.000 · 07/02/2027 | chỉ A: `2 × 100.000 = 200.000` | 2.100.000 + 500.000 + 200.000 = **2.800.000** | — |
| **PT-13** | Nhà cung cấp đứng tên bán dịch vụ | như PT-01; người bán dịch vụ A = nhà cung cấp S, tỷ lệ mua lại 90% | như PT-01, khách lẻ | 250.000 | **3.150.000** | **D-Q5.** Giá vốn trả S = 90% × **2.900.000** = 2.610.000 (không tính trên phụ thu). Biên nhận: phần S **2.900.000**, phần Tour Đảo **250.000** (phụ thu). Tour Đảo giữ 540.000. Nếu phụ thu theo người bán của dịch vụ: phần S 3.150.000, phần Tour Đảo 0 |
| **PT-14** | Còn vé kèm đổi ngày đi — phụ thu theo ngày **mới** | như PT-01 | nháp A: 2 NL, 1 TE, 1 EB, ngày đi 15/02/2027 (không phụ thu, tổng 2.900.000), đã Gửi xác nhận; người xét duyệt bấm Còn vé kèm ngày đi **07/02/2027** | theo ngày mới: 250.000 ≠ 0 đã lưu | **409 «phụ thu đã đổi»**; tổng giữ **2.900.000**; không ghi gì; yêu cầu vẫn mở | Chiều ngược: nháp 07/02 (phụ thu 250.000, tổng 3.150.000), Còn vé kèm ngày 15/02 ⇒ cũng 409, tổng giữ 3.150.000. Còn vé **không** đổi ngày ⇒ xác nhận bình thường. **D-Q6** |
| **PT-15** | Mở lại nháp có phụ thu, Lưu không đổi gì | như PT-01 | nháp PT-01 đã lưu (3.150.000); văn phòng mở form sửa, bấm Lưu | NL `2 × 100.000`, TE `1 × 50.000` = 250.000 | dịch vụ vẫn **2.900.000** (NL 1.050.000), tổng **3.150.000** | **Đối chứng lỗi** nếu dòng phụ thu lọt vào `items` ở form (`draftFromDto` ghi đè đơn giá theo **mọi** loại khách có dòng phụ thu — người lớn ← 100.000 **và** trẻ em ← 50.000): dịch vụ = 2 × 100.000 + 1 × 50.000 + 0 = **250.000**; máy chủ sinh lại phụ thu 250.000 ⇒ tổng **500.000** (bản sửa 2 — sửa số theo người kiểm vòng 2, R2-D2) |
| **PT-16** | Nhà cung cấp đứng tên bán + giảm giá lớn hơn phụ thu | như PT-13; giảm giá cấp đơn 300.000 | như PT-13, khách lẻ, giảm 300.000 | 250.000 | 3.150.000 − 300.000 = **2.850.000** | **D-Q5** + R-81 (giảm giá trừ phần Tour Đảo trước). Phần Tour Đảo: 250.000 − 250.000 = **0**; phần S: 2.900.000 − 50.000 = **2.850.000**. Giá vốn trả S vẫn 2.610.000 (trên thành tiền dịch vụ trước giảm). Trần «thu cho» S = 2.850.000, bằng số biên nhận in |

## B. Lượt D2 — khác / miễn theo đối tác

Quy tắc chung cho mục B (ngoài quy tắc riêng từng ca): **Tết · nhóm G1 · mọi bên đặt · mỗi khách NL 100.000 / TE 50.000 / NCT 100.000** (như PT-01). Đơn mặc định: A, 2 NL, 1 TE, 1 EB, ngày đi 07/02/2027 — dịch vụ 2.900.000.

| Mã | Tình huống | Quy tắc riêng | Bên đặt / người lập | Phụ thu | Tổng | Câu cần xác nhận |
|---|---|---|---|---|---|---|
| **PT-D2-01** | Loại đối tác được miễn | Tết · nhóm G1 · **loại Y** · Miễn | bên đặt: đối tác Q (loại Y), Q tự lập | 0 | **2.900.000** | Cùng bên đặt, **văn phòng lập hộ**: cũng 0 (GĐ-1, xét theo bên đặt) |
| **PT-D2-02** | Hồ sơ riêng thắng loại | như PT-D2-01 + Tết · nhóm G1 · **hồ sơ Q** · mỗi khách 50.000 / 30.000 / 50.000 | bên đặt Q | `2 × 50.000` + `1 × 30.000` = 130.000 | **3.030.000** | GĐ-1 (hồ sơ > loại) |
| **PT-D2-03** | Miễn của loại ở cấp nhóm gặp quy tắc dịch vụ cho mọi bên đặt | Tết · nhóm G1 · loại Y · Miễn; Tết · **dịch vụ A** · mọi bên đặt · mỗi khách 150.000 / 80.000 / 150.000 | (a) bên đặt Q (loại Y); (b) khách lẻ | (a) **0**; (b) `2 × 150.000` + `1 × 80.000` = 380.000 | (a) **2.900.000**; (b) **3.280.000** | **D2-Q2.** Nếu «phạm vi trước đối tượng»: (a) 380.000 ⇒ 3.280.000 |
| **PT-D2-04** | Bên đặt mang hai loại, hai mức khác nhau | Tết · nhóm G1 · loại Y · Miễn; Tết · nhóm G1 · loại Z · mỗi khách 50.000 / 30.000 / 50.000 | bên đặt R mang cả loại Y và Z | — | lưu nháp / xác nhận ⇒ **409 «phụ thu xung đột»**, không ghi | **D2-Q1.** Nếu «lấy mức thấp hơn»: 0 ⇒ 2.900.000 |
| **PT-D2-05** | Đổi bên đặt sau xác nhận | như PT-D2-01 | đơn của khách lẻ đã xác nhận (phụ thu 250.000, tổng 3.150.000) → đổi bên đặt sang Q | **giữ 250.000** | **3.150.000** | Có cảnh báo «bên đặt mới được miễn; phụ thu giữ như lúc xác nhận» (như G4) |
| **PT-D2-06** | Mùa ưu tiên cao chỉ có quy tắc cho một loại đối tác khác bên đặt (**không** dùng quy tắc chung của mục B) | Lễ hội biển (20) · nhóm G1 · **loại Z** · mỗi khách 200.000 / 100.000 / 200.000; Cao điểm hè (10) · nhóm G1 · mọi bên đặt · mỗi khách 50.000 / 30.000 / 50.000 | A: 2 NL · 12/06/2027. (a) khách lẻ; (b) bên đặt mang loại Z | (a) Lễ hội không có quy tắc **áp được** cho khách lẻ ⇒ Cao điểm: `2 × 50.000 = 100.000`; (b) Lễ hội: `2 × 200.000 = 400.000` | (a) **2.200.000**; (b) **2.500.000** | **D2-Q3** (định nghĩa «áp được», D-Đ3.3). Nếu «mùa thắng dù quy tắc không áp được cho bên đặt»: (a) 0 ⇒ 2.100.000 |

## Không có trong bộ này (ghi để khỏi tưởng đã phủ)

- Đơn **huỷ** có phụ thu: thuộc sổ vàng `golden/don-huy-coc.json` và lỗ TNV-G1 — bổ sung một ca khi lỗ đóng.
- Phụ thu trên đơn có phí đưa đón (ADR-0147): chờ hai ADR cùng thi công.
- Dịch vụ do nhà cung cấp bán **và** đối tác đặt cùng lúc (ba bên): thêm khi D-Q5 đã chốt.
