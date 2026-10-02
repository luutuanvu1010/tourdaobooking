# Khắc phục kiểm toán 1–2/10 — Lộ trình thi công (2026-10-02)

> **Nguồn:** `docs/superpowers/specs/2026-10-02-khac-phuc-audit-goc-va-phuong-an.md`. Tài liệu đó kiểm lại hai cuộc đánh giá, chốt 9 gốc R1–R9 (R9 thêm sau vòng đối chiếu độc lập) và nêu phương án.
>
> **Vai:** phiên này **lập kế hoạch**. Mỗi đợt thi công ở **phiên riêng**, worktree riêng, có **người kiểm độc lập** sau mỗi phần việc lớn (Hiến pháp N8, P15; CLAUDE.md §3).
>
> **Kế hoạch con chi tiết** (task, đỏ → xanh):
> - Đợt 0: `2026-10-02-khac-phuc-audit-01-dot-0-chong-ghi-trung-quyen-tien.md`
> - Đợt 1: `2026-10-02-khac-phuc-audit-02-dot-1-don-huy-coc.md`
> - Các đợt sau: kế hoạch con lập khi điều kiện "cần chủ" được gỡ.

## 1. Các đợt và thứ tự

| Đợt | Gốc | Việc | Căn cứ | Hạn sổ dừng dây chuyền | Điều kiện bắt đầu | Thời lượng ước |
|---|---|---|---|---|---|---|
| **0** | R1, R5a | Lớp chống ghi trùng chung (bản mở rộng) + quyền tiền chỉ Toàn quyền | ADR-0094, ADR-0090 (accepted) | **F-02: 15/10** | Không. **Bắt đầu ngay.** Chủ đặt khoá HMAC **trước** khi triển khai | lớn |
| **1** | R3 (+R4e phần máy chủ) | Đơn huỷ và cọc: "còn lại" = 0, hoàn hai bước, hạn 60 ngày, chuyển tiền, đơn cũ hoàn tay; route + ô đếm cho Kế toán | ADR-0089 (accepted) | **TNV-G1: 15/10** | Đợt 0 xong phần router (mọi lệnh ghi mới đi qua lớp vé) | lớn |
| **2** | R2 | (c) F-03: `subtotal = Σ line_total` ở CSDL + một hàm tính dòng; (d) kiểm sổ tiền mới trong `audit-invariants` + sổ vàng chạy trên mã sổ; (a) ADR-0088; (b) ADR-0092 | (c), (d): luật cũ 5.1, 5.4, 4.2, 5.17. (a), (b): **proposed** | F-03, TNV-G3, TNV-G4: **31/10** | (c), (d): sau Đợt 1. (a), (b): **chủ "Duyệt" ADR-0088 + ADR-0092** | lớn |
| **3** | R5b–d, R6 | PIN tạm; tài khoản trỏ hồ sơ ngưng thì không đăng nhập, cắt phiên (D4); xác thực hai lớp; đơn Đối tác đúng bên đặt; 409 `cccd_taken` không lộ tồn tại (GD-P-02); mã hồ sơ người khác không trả tên (DT06); nhật ký đăng nhập sai và xuất dữ liệu (GD-S-03) | ADR-0093 (**proposed**), ADR-0013, ADR-0074, ADR-0077 đ3 (accepted) | — | ADR-0093: **chủ "Duyệt"**. Phần còn lại không chờ | vừa–lớn |
| **4** | R4a–d, **R9** | HDV "Từ chối"; báo tin khi đơn đổi; nhắc gọi khách khi giờ hẹn đổi; ngưng tài khoản thì giữ và hiện đơn, tiền đang giữ; **lệnh đổi trạng thái mang phiên bản đã thấy** (15, GD-A-02, HD02); ngưng hồ sơ khách đang là bên đặt của đơn người khác (redteam R3d) | ADR-0030 lượt 2, ADR-0062, ADR-0051 (accepted); ADR-0013 + Hiến chương 5.7; ADR-0003 điều 6 (khoá lạc quan) | — | Không chờ, trừ QT06 (sửa địa điểm làm đổi chặng tương lai): **cần chủ** | lớn |
| **4b** | R4e | Màn sổ Kế toán (cần hoàn, đơn huỷ giữ cọc, sự cố tiền) | ADR-0089 đ9c | — | **Bản vẽ Claude Design** của chủ | vừa |
| **5** | R7 | Sao lưu ra ngoài Cloudflare theo lịch, diễn tập khôi phục có biên bản, sửa cửa khẩn cấp `create-staff` dùng `--command`, chốt "luôn còn một Toàn quyền" | đặc tả `2026-09-22-dien-tap-khoi-phuc.md` (**bản thảo**) | — | **Chủ duyệt đặc tả 22/9** (nơi lưu bản sao, ai giữ khoá). Phần sửa cửa khẩn cấp và chốt Toàn quyền làm được ngay | vừa |
| **6** | R8 | Câu xác thực theo khoá (không quét bảng), **kể cả route Face ID** (`auth/index.ts:318,324`); phân trang hộp thông báo (L-02); bỏ N+1 "Việc của tôi" (L-15); Bảng tin nối lại chỉ tải phần thiếu (L-03, L-04); bộ nhớ đệm cho đọc công khai (L-06); service worker không gọi API mỗi lần đẩy (L-08); giới hạn danh sách đơn chờ (L-05); đồng hồ đo từng route (L-09); **giới hạn tần suất** ở route tạo đơn, hồ sơ, thu (GD-S-02, DT07); câu xác thực vào `query-plan.test.mjs` | Không cần ADR | — | Sau Đợt 0 (router đổi) | vừa |
| **7** | G12 + nhỏ | Câu báo lộ mã tiếng Anh (GD-D-02); tìm đơn không dấu và SĐT chuẩn hoá; xác nhận ngày đã qua báo đúng lý do (05, GD-R-08); HDV có lối vào danh sách đơn (GD-D-01); thông báo rõ cho Bán hàng khi nháp giữ giá cũ (KD04, G11); **đề xuất diff luật** bổ sung module thiếu trong `src/CLAUDE.md` và Phần II (GD-B-06, chủ duyệt) | Việc nhỏ | — | Bất kỳ lúc nào | nhỏ |

**Đợt 1 "cầm máu"** (áp theo khuyến nghị, kế hoạch con §6–§7): Phần A của Đợt 1 có thể lên production **trước** Đợt 0, vì không thêm lệnh ghi tiền mới. Phần A gồm:
- còn lại = 0;
- lý do huỷ bắt buộc;
- chặn người không phải Kế toán/Toàn quyền ghi thu vào đơn huỷ;
- nhãn và ảnh thông báo huỷ.

Khi đó khách hết bị ghi "còn nợ". Phần này **không** đóng TNV-G1.

**Đợt 0 gồm hai luồng song song** (kế hoạch con):
- **Luồng Q (ADR-0090):** nhỏ, không cần khoá, phát hành riêng sớm.
- **Luồng L (ADR-0094 bản mở rộng):** đường găng; lịch đề xuất triển khai **13/10**. Chủ đặt khoá `LAN_GUI_SECRET` **trước**. Nếu tới 12/10 kiểm vòng 2 chưa đạt thì báo chủ.
- **Số migration chốt theo thứ tự gộp thật, không theo kế hoạch.** Các kế hoạch con chỉ ghi số **dự kiến**. Hôm nay `0070`–`0073` đã giữ cho các nhánh Vận chuyển. Đợt nào gộp `main` trước thì lấy số kế tiếp lúc đó, kể cả "cầm máu" Phần A Đợt 1 nếu lên trước Đợt 0. View tin của ADR-0090 (C2) cũng vậy. Bước bắt buộc: đo lại `ls migrations` cùng mọi nhánh chưa gộp ngay trước khi tạo tệp và trước day-len (CLAUDE.md §10).

**Khả năng kịp hạn 15/10:** F-02 (Đợt 0) có thể kịp nếu bắt đầu ngay. TNV-G1 (Đợt 1) **khó kịp**, vì phần duyệt, chi, chuyển phải chờ Đợt 0 gộp. **Chủ quyết gia hạn ngày 10/10** theo tình trạng Đợt 0.

**Song song được:**
- Đợt 5 (phần không chờ) và Đợt 7 chạy song song với Đợt 0–1, khác vùng mã.
- Đợt 6 chờ Đợt 0, vì cùng chạm router.
- Đợt 3 và 4 sau Đợt 1, để tránh đụng `orders` và `billing` cùng lúc.

**Cần chủ quyết** (không phải câu "nên đồng ý").

Người kiểm độc lập vòng đối chiếu chỉ ra 6 câu mà phiên lập kế hoạch đã tự áp nhưng **không được tự áp**. Lý do: chúng chạm tiền của khách, luật tách nhiệm vụ, hoặc chữ ADR đã duyệt; mã lệch ADR accepted là lỗi (CLAUDE.md §2). Sáu câu này **đã chuyển về chờ chủ**, đánh dấu **(a)–(f)**:
- **(a) Đợt 1 Q1:** HDV huỷ vì "không liên hệ được khách" thuộc nhóm nào. Khuyến nghị: khách huỷ (giữ cọc). Đụng tiền của khách.
- **(b) Đợt 1 Q2:** dòng "đã hoàn ngoài hệ thống" bị Quản trị từ chối thì Toàn quyền ghi lại được không. Khuyến nghị: có. Đổi nghĩa "một lần" của đ16.
- **(c) Đợt 1 Q3:** giới hạn duyệt hoàn tính trên "tiền còn giữ" thay vì "đã trả". Khuyến nghị: còn giữ. Đổi chữ đ4a/đ15 của ADR-0089: **chưa duyệt thì mã giữ đúng chữ hiện hành**.
- **(d) Đợt 1 Q4:** tách luồng duyệt "giảm giá bù chênh khi dời lịch" (ADR-0089 đ6) ra sau Đợt 1, và vẫn đóng TNV-G1. Khuyến nghị: có.
- **(e) Đợt 0 C1:** đóng F-02 theo ADR-0094 A-9, tức sửa trường `ke_hoach` của F-02 trong sổ cho khớp. Hai văn bản chuẩn tắc đang khác nhau, nên chủ chọn. Khuyến nghị: theo A-9.
- **(f) Đợt 0 C2:** thêm một view (migration) cho tin "Quản trị ngưng Kế toán", đổi câu "không migration" của ADR-0090 đ4. Khuyến nghị: có.

Các câu còn lại:
- (i) "Duyệt" ADR-0088 + ADR-0092 (Đợt 2a, 2b);
- (ii) "Duyệt" ADR-0093, ADR-0091 (Đợt 3; ADR-0091 là phá lệ mốc 6 giờ, QT02);
- (iii) QT06: sửa tên hay địa chỉ một điểm đón có giữ chuyến và nhắc gọi khách không;
- (iv) KT07 (tự thu tự nộp) và đơn 0 đồng tự xác nhận (02/03): có cần người thứ hai không;
- (v) duyệt đặc tả sao lưu và diễn tập 22/9;
- (vi) bản vẽ màn sổ Kế toán;
- (vii) **đưa GD-R-01 (không sao lưu ngoài, mức CAO) và G6 (đơn Đối tác sai bên đặt, mất tiền đối tác) vào sổ dừng dây chuyền**, với hạn do chủ đặt. Luật CLAUDE.md §3 đòi mọi phát hiện HIGH có mục sổ; hai mục này đang thiếu;
- (viii) KD05: sale khác bấm "Nhận" đơn chưa có người phụ trách thì sửa, huỷ được đơn của người lập. Đúng ADR-0020, nhưng rủi ro; có siết không;
- (ix) KD07: đổi bên đặt của đơn đã cọc thì cọc đi theo đơn hay theo người, hoàn cho ai;
- (x) GD-B-01 (định nghĩa số khách vào mã) chờ ADR-0065 (proposed);
- (xi) Gia hạn TNV-G1 (quyết 10/10).
- **G10** (trẻ em tại bến, năm sinh / loại khách) cũng cần quyết; xếp sau Đợt 4.

**Ngoài phạm vi, kèm lý do:**
- DT03: Đối tác tự xác nhận đơn, đúng ADR-0014 câu 6.
- G11 (04, QT01): đúng ADR-0027; chỉ phần thông báo nằm ở Đợt 7.
- GD-B-05: dọn ghi kép, cột chết — đã là việc "phát hành 2" và B5 trong `docs/HANDOFF-N1.md`.
- GD-S-04 (pháp lý), GD-R-07 (con người): không kiểm được bằng mã.

## 2. Bảng truy vết: lỗi → gốc → đợt → cách chứng minh đã hết
Cột "Chứng minh" là **tiêu chí nghiệm thu**. Mỗi dòng phải có bài **đỏ trước** (tái hiện lỗi) rồi **xanh sau**, và chạy lại kịch bản gốc.

| Lỗi / phát hiện | Gốc | Đợt | Chứng minh đã hết |
|---|---|---|---|
| 11 (2 đơn khi gửi lặp), 13 (2 hồ sơ), redteam R1/R2 | R1 | 0 | ADR-0094 T2, T3, H1. Bài hồi quy **có vé** mới đặt trong `src/` (nằm trong `npm test`) đỏ → xanh; e2e trong `tests/e2e/` gửi lại **cùng vé** ⇒ 1 bản ghi. **Lưu ý:** redteam R1/R2 và kịch bản gốc gửi **không vé** nên vẫn ra 2 bản ghi ở giai đoạn 1 (cho qua lệnh thiếu vé). Chúng chỉ chuyển PASS ở **bản siết**, và đó là tiêu chí của bản siết, không phải của bản mở rộng |
| 12, HD10 (thu lặp), KT03 (hoàn lặp), KT04 (nộp lặp) | R1 | 0 | ADR-0094 T1, T4 (hai lần thu thật vẫn ra 2 dòng), T12. Kịch bản 12, HD10, KT03, KT04 **chép ra bản có vé** (gửi lại cùng vé) rồi chạy. Riêng HD10 lấy nhánh **"Ghi lần thu"** (nhánh "Đã giao kèm thu" đã chống lặp đúng, 409, nên không đỏ trước) |
| 15 (A xem bản cũ, B vừa sửa số khách, A xác nhận), GD-A-02, HD02 (đổi người đúng lúc HDV bấm "Nhận") | **R9** | 4 | lệnh đổi trạng thái gửi `v` đã thấy; B sửa xong thì A nhận 409; bài phủ: mọi route trạng thái của đơn và phân công đều kiểm `v`; kịch bản 15, HD02 chạy lại |
| Gửi đồng thời cùng vé | R1 | 0 | ADR-0094 H1 ca "đồng thời ⇒ 1 dòng" |
| QT04 (Quản trị đặt lại PIN Kế toán, đăng nhập thay) | R5a | 0 | ADR-0090: Quản trị đặt lại PIN / gán quyền tiền / tạo tài khoản tiền ⇒ 403; kịch bản QT04 chạy lại |
| GD-P-01 phần quyền tiền | R5a | 0 | như trên |
| 09, 26, HD06, QT05, KT01, DT04 (đơn huỷ còn "còn lại") | R3 | 1 | ADR-0089 đ1, đ9: sổ trả còn lại 0; biên nhận là "thông báo huỷ" không có dòng "Còn lại"; ca sổ vàng khách huỷ giữ cọc |
| 09, 26 (ghi lần thu vào đơn huỷ ⇒ 201) | R3 | 1 | đ13: Bán hàng/HDV ⇒ 409; Kế toán/Toàn quyền ⇒ 201 |
| HD08 (huỷ nhận = huỷ đơn khách) | R4a (+R3 phần tiền) | 4 (+1) | ADR-0030 lượt 2 "Từ chối" trả đơn về kho; đơn khách không đổi trạng thái |
| 30, KD06, DT05, 49 (sửa sai sau Đã giao) | R2a | 2 | ADR-0088: "Thay lần thu" ghi lại được; I1 đúng mọi lúc; Hoàn thành bị chặn khi còn thiếu |
| KT06 (đã thu âm), KT04 (số dư âm), KT05, KT09, 42 | R2b | 2 | ADR-0092: trigger không đổi dấu + máy chủ; trần điều chỉnh; R-BIL-13 mức lỗi |
| KT02 (hai người khai cùng một chuyển khoản) | R2b | 2 | ADR-0092 đ6 mã giao dịch; cảnh báo khác đơn |
| KT10 (`audit-invariants` thoát 0 khi sổ âm) | R2d | 2 | kiểm R-BIL mới đỏ trên dữ liệu sai (D1 tạm) ⇒ thoát 1 |
| F-03, GD-B-02, redteam D1/D2 (SQL sửa tiền đơn đã xác nhận) | R2c | 2 | trigger `subtotal = Σ line_total`; redteam D1/D2 sang PASS |
| Cảnh báo thu tiền mặt giống nhau (CT3/CT4) | R2b | 2 | ADR-0092 đ6a: 409 "có thể trùng" + "Vẫn ghi" có lý do |
| D4 (hồ sơ ngưng vẫn đăng nhập) | R5d | 3 | redteam D4 sang PASS; đăng nhập ⇒ 401/403; **phiên đang mở bị cắt ở request kế tiếp**; kiểm định kỳ trong `audit-invariants` |
| GD-P-02 (409 `cccd_taken` lộ tồn tại; danh sách giấy tờ không kiểm cấp bậc), DT06 (gửi mã hồ sơ người khác thì trả tên thật) | R5 | 3 | câu báo không lộ tồn tại; route trả tên chỉ khi có quyền xem hồ sơ đó; bài trong `src/giay-to-khong-lo-so.test.ts` |
| GD-S-03 (đăng nhập sai và xuất dữ liệu không để dấu vết bền) | R5 | 3 | nhật ký bền cho đăng nhập sai (không SĐT) và mọi route xuất dữ liệu |
| QT02 (ban đêm không có Quản trị thì không xếp được xe) | — | 3 | ADR-0091 (**proposed**): sau khi chủ "Duyệt" |
| redteam R3d (Bán hàng ngưng hồ sơ khách đang là bên đặt của đơn đồng nghiệp; nhật ký không ghi) | R4/R5 | 4 | ngưng hồ sơ đang là bên đặt của đơn còn mở thì bị **giữ** và hiện đơn liên quan (Hiến chương 5.7); có nhật ký; redteam R3d sang PASS |
| KD05, KD07 | — | — | **cần chủ** (viii), (ix) |
| KT07, 02, 03 (tự thu tự nộp; đơn 0 đồng tự xác nhận) | R5 | — | **cần chủ** (iv) |
| GD-P-01 phần PIN (người đặt biết PIN dùng lâu dài) | R5b | 3 | ADR-0093: PIN tạm phải đổi ở lần đăng nhập đầu |
| GD-S-01 (dò PIN) | R5c | 3 | ADR-0074 tiêu chí |
| 45, DT02, GD-A-01 (đơn Đối tác sai bên đặt) | R6 | 3 | ADR-0077 đ3: bên đặt = hồ sơ Đối tác, `CUSTOMER_OF`; kịch bản 45, DT02 |
| KD08, DT08, 39, KD01, 34 (đổi giờ/điểm không tới người cần biết) | R4b, R4c | 4 | ADR-0062, ADR-0051: giữ chuyến, tin tài xế/đối tác, nhắc gọi khách; ảnh xác nhận in đủ chặng |
| QT06 (sửa địa điểm im lặng) | R4 | 4 | **cần chủ** trước |
| HD09, QT03, KD09, DT09 (ngưng tài khoản đang giữ đơn/tiền) | R4d | 4 | ngưng ⇒ đơn và tiền hiện ở danh sách "cần chuyển"; không im lặng |
| HD01 (HDV bị đổi khỏi đơn không nhận tin) | R4b | 4 | tin cho HDV bị đổi (phần ghi đè của HD02: xem R9) |
| KT01 (không có danh sách "đơn huỷ còn tiền", "cần chi hoàn") | R4e | 1 (máy chủ) + 4b (màn) | route danh sách + ô đếm Trang chủ Kế toán (kế hoạch Đợt 1, Task 10); màn theo bản vẽ (4b) |
| KT08, KD02/03 (sổ không có dòng theo đơn, không mục "dư", không thấy sự cố tiền khác) | R4e | 4b | màn sổ Kế toán theo bản vẽ; **không** thuộc Đợt 1 |
| GD-L-04, L-06, L-08, L-09, S-02, DT07, route Face ID | R8 | 6 | như dòng trên; giới hạn tần suất: tạo 20 nháp/giây ⇒ bị chặn (kịch bản DT07) |
| GD-D-01 (HDV không có tab Đơn hàng), GD-R-08 (xác nhận ngày đã qua báo sai lý do), KD04 (nháp giữ giá cũ không báo), GD-B-06 (luật thiếu module) | G12 | 7 | màn và câu báo đúng; diff luật chủ duyệt |
| GD-R-01, R-02, R-06, cửa khẩn cấp | R7 | 5 | sao lưu chạy theo lịch có bằng chứng; biên bản diễn tập; `create-staff` chạy được bằng `--command` trên D1 tạm |
| GD-L-01, L-02, L-03, L-05, L-07, L-15 | R8 | 6 | `EXPLAIN` không còn SCAN ở câu xác thực (bài `query-plan`); số truy vấn mỗi request đếm được giảm |
| 08, 16, 05, 22–24, 14, 50, GD-D-02 (câu báo) | G12 | 7 | kịch bản chạy lại; không còn mã tiếng Anh lộ ra |
| 10 (tìm hụt khi gõ không dấu) | G12 | 7 | tìm không dấu, `+84`, 6 số cuối ra đúng đơn |

**Nằm ngoài lộ trình này (đã có quyết định hoặc cần quyết):**
- G10 (HD03, HD05, DT10, 06): cần chủ.
- G11 (04, QT01): đúng ADR-0027; phần thông báo (KD04) ở Đợt 7.
- 17 (cảnh báo đơn trùng): đặc tả `canh-bao-don-trung` chờ chủ.
- GD-B-01: chờ ADR-0065 (proposed).
- GD-B-05: việc "phát hành 2" / B5 ở `docs/HANDOFF-N1.md`.
- DT03: đúng ADR-0014 câu 6.
- GD-S-04, GD-R-07: ngoài phạm vi kiểm bằng mã.

## 3. Cổng "xong" cho cả chương trình
1. Mọi dòng bảng truy vết có bài đỏ → xanh, và kịch bản gốc chạy lại đạt.
   - Với lỗi gửi lặp: chạy lại bằng **bản có vé**. Bản không vé chỉ đạt sau bản siết.
   - Dòng "cần chủ" ghi rõ là chưa làm.
2. Chạy lại **toàn bộ 100 tình huống** trên bản thử. Kết quả so với `docs/superpowers/specs/2026-10-02-khac-phuc-audit/kiem-lai-ux.md`: dòng thuộc đợt đã làm phải chuyển sang ĐÃ HẾT.
3. Các mục F-02, TNV-G1, F-03, TNV-G3, TNV-G4 trong `docs/quyen-hoan.json` được **đóng** (xoá mục kèm dòng lịch sử) **hoặc chủ gia hạn có lý do**. F-03, TNV-G3, TNV-G4 phụ thuộc chủ "Duyệt" ADR-0088/0092. GD-R-01 và G6: chờ chủ đưa vào sổ, câu (vii).
4. Mỗi hàng rào mới có dòng ở `docs/SO-HANG-RAO.md` với ngày quan sát chặn thật.
5. Người kiểm độc lập ký từng đợt.
