# ADR-0079 — Sổ tiền lượt 2: phiếu "Đã giao" sinh dòng thương mại (hoa hồng, giảm giá bên đặt chịu, giá vốn); mở "Đã giao" cho đơn của đại lý; trần giảm giá theo bên đặt

- **Trạng thái:** **accepted** — chủ dự án 2026-10-01 trong chat: trả lời 13 câu *"cả 13 theo khuyến nghị"* (C1–C13 = A, `docs/superpowers/specs/2026-10-01-de-xuat-adr-so-tien-luot-2/cau-hoi-chu.md`), rồi duyệt lượt **2c** bằng "duyệt lượt 2c" (sau khi xem ví dụ đại lý giữ cọc, cộng tác viên, đơn kẹt chụp bù, trần giảm giá, giải nghĩa L-C1). Người kiểm độc lập: ĐẠT vòng 3 (bản nháp). Bản nháp + lịch sử sửa: `docs/superpowers/specs/2026-10-01-de-xuat-adr-so-tien-luot-2/`. **Sửa câu bởi [ADR-0109](ADR-0109-phai-thu-khong-am.md)** (accepted 2026-10-08, lượt 8c câu 1): giảm giá bên đặt chịu = **giảm giá hiệu lực** = min(`orders.discount`, tạm tính hiện hành) — bằng số giảm giá khi tạm tính còn ≥ giảm giá, nhỏ hơn khi bớt khách làm tiền dịch vụ nhỏ hơn giảm giá — ở `:26`–`:27`, `:43` (`GIAM_GIA_BEN_DAT`), `:57` (iv), `:75`, `:96` (R-BIL-2), `:98` (R-BIL-14); nguyên văn → mới ở bảng "Câu ADR bị thay" của ADR-0109.
- **Số hiệu:** 0079 — chốt 2026-10-01 (0073 trợ lý; 0074, 0075 đã có nhánh khác giữ; 0076 nơi trả mặc định; 0077–0081 = A–E của gói sổ tiền lượt 2).
- **Ngày:** 2026-10-01.
- **Thuộc gói:** lượt duyệt **2c** (ADR này một mình — **3** quyết định: (5) dòng thương mại + mở "Đã giao" cho đơn đại lý; (6) trần giảm giá theo người hưởng; (7) lệch có chủ ý **L-C1**, đếm riêng vì là lệch Hiến chương; `docs/superpowers/specs/2026-10-01-de-xuat-adr-so-tien-luot-2/trang-ghep.md` §0). Phát hành chung một bản với A, B, D, E.
- **Phụ thuộc:** ADR-0077 (bản chụp hoa hồng, hàm `phanThuongMaiCuaDon`), ADR-0078 (người bán, giá vốn, người thu bên đặt / nhà cung cấp). Không duyệt C trước A, B.
- **Mốc đo mã:** `8f647226`; `main` @`0c4309cd`.
- **Nguồn — lời chủ đã chốt:**
  - **U3 (1/10):** "đơn 'Đã giao' thì sổ ghi ngay ai nợ ai; Kế toán đối chiếu và trả/thu gộp nhiều đơn mỗi tháng, **bù trừ hoa hồng với tiền đại lý đang giữ**; khoá sổ tháng".
  - Câu gốc 25/9: "(1) mua vé của đại lý với công ty Tour Đảo (nếu người đặt thuộc nhóm Bên ngoài)… (2) mua vé của khách hàng với đại lý (HDV của Tour Đảo lúc này thu tiền hộ đại lý)… (03) lễ tân, taxi, lữ hành hưởng b đồng hoa hồng (trừ số đã thu trước của khách là số thực nhận; âm thì phải trả chênh lệch cho Tour Đảo, dương thì Tour Đảo còn phải trả họ)".
  - ADR-0018 §11 / Q17: giảm giá cho khách **do đối tác chịu**; ví dụ 5.000.000 − 250.000, cọc đại lý giữ 3.000.000, HDV thu 1.750.000, chiết khấu 10% ⇒ đại lý phải trả Tour Đảo 4.500.000, trả thêm **2.750.000**.
  - ADR-0027 điều 2 (lời chủ): "đối tác được quyền giảm giá cho khách nhưng luôn phải trả một mức giá cố định (giá vốn) cho công ty Tour đảo… có thể đặt mức giảm tối đa là mức chiết khấu của công ty Tour đảo dành cho đối tác".
  - H2 / H2': "Đã giao" khi đã thu = phải thu; khoá đơn + ghi sổ ngay; "Hoàn thành" khi không còn ai nợ công ty; khoản công ty phải trả **không chặn**.
  - ADR-0026 **M1 = A**: đơn có người hưởng chờ lượt 2; đơn khách lẻ có dịch vụ "làm đại lý" đã "Đã giao" ở lượt 1 ⇒ khi lượt 2 lên, `R-BIL-2` liệt kê, **Kế toán bổ sung bằng phiếu điều chỉnh có lý do** (đã chốt — không hỏi lại).
  - ADR-0026 điều 4: tiền HDV thu tại cảng ⇒ HDV nợ công ty (dòng giữ hộ) — **đã chốt, không đổi**.
- **ADR liên quan:** ADR-0025 (điều 3, 4, 7, 10), ADR-0026 (điều 3, 4, 12, 13), ADR-0027 (điều 2b), **ADR-0029** (lệch 5.1, 5.8 — "khi có bảng chiết khấu… luật giá nên chuyển sang xét theo bên đặt… quyết định thuộc ADR lúc đó"), ADR-0061 A-14.
- **Hiến chương áp dụng:** 5.1, 5.4, 5.6, 5.7, **5.8**, 5.10, 5.15, 5.17.
- **Xây trên lỗ đang hở:** **không** (`phat_hien = []`, `main` @`0c4309cd`).
- **Loại quyết định:** **một chiều** — dòng sổ đã ghi theo phiếu "Đã giao" không rút lại (chỉ đảo); loại dòng mới là dữ liệu tra cứu (tập mở).

---

## Tóm tắt cho chủ (lời thường)

1. Đơn của đại lý **bấm "Đã giao" được** (hôm nay bị chặn). Lúc bấm, sổ tự ghi: Tour Đảo **nợ đại lý tiền hoa hồng**; đại lý **nợ Tour Đảo phần giảm giá** họ đã cho khách; Tour Đảo **nợ nhà cung cấp giá vốn** (vé i-resort…).
2. Tiền khách trả vẫn ghi như lượt 1: ai cầm tiền (HDV, đại lý, quầy i-resort) thì **người đó đang giữ tiền của công ty**. Số đại lý còn phải trả = tiền họ đang giữ + giảm giá họ cho − hoa hồng. **Âm** thì công ty trả đại lý.
3. Đơn **thiếu mức hoa hồng / thiếu người bán** thì bị giữ ở "Đã giao", hiện rõ lý do và "Kế toán xử lý".
4. Đại lý chỉ được giảm giá cho khách **tối đa bằng hoa hồng** của đơn (câu C8 — có áp cho nhân viên sửa đơn đại lý không).

---

## Quyết định

### Phần C1 — Dòng thương mại ở phiếu "Đã giao"; mở chặn đơn có người hưởng

1. **Mở "Đã giao" cho đơn có người hưởng.** Bỏ lý do giữ `booker_partner` (`src/modules/billing/rules.ts:179-181`). Thay bằng hai lý do giữ mới (5.7 — `LyDoGiu`, nói rõ ai xử lý):
   - `terms_missing` — có dòng dịch vụ **chưa có bản chụp**, hoặc bản chụp hiện hành **thiếu mức hoa hồng** / **thiếu người bán** (ADR-0077 điều 8, ADR-0078 điều 5): "Thiếu mức hoa hồng cho <dịch vụ> (<vai/đối tác>) — Kế toán cài mức hoặc ghi mức tay." Ai xử lý: **Kế toán**.
   - `booker_not_beneficiary` — bên đặt mang vai bên ngoài ngoài danh sách được hưởng (ADR-0077 điều 3). Ai xử lý: **Văn phòng** (sửa bên đặt) hoặc **Kế toán** (mức tay). Không chỉ là câu báo ở mã: bản chụp ghi `MISSING` + `missing_reason = BOOKER_NOT_BENEFICIARY` nên **hai lớp CSDL ở điều 5 cùng bắt** (giữ 5.1 như lượt 1 đang có).
   - Thứ tự kiểm giữ như lượt 1; hai lý do mới đứng **ở chỗ** của `booker_partner` (sau "trước ngày đi", trước "chưa rõ người thu").
2. **Loại dòng nợ mới** (bảng tra cứu `bil_debt_kind`, tập mở — ADR-0003 điều 3). **Khuyến nghị (câu C1 — phương án A "gọn"):**
   - `HOA_HONG` — *Hoa hồng*: **Tour Đảo nợ người hưởng**; một dòng mỗi dòng dịch vụ có hoa hồng > 0 (`order_service_id` có giá trị).
   - `GIAM_GIA_BEN_DAT` — *Giảm giá bên đặt chịu*: **người hưởng nợ Tour Đảo** đúng số giảm giá cấp đơn (`orders.discount`) — chỉ khi đơn có người hưởng (ADR-0018 §11: giảm giá do đối tác chịu). Đơn khách lẻ: Tour Đảo chịu, không dòng.
   - `GIA_VON` — *Giá vốn nhà cung cấp*: **Tour Đảo nợ nhà cung cấp**; một dòng mỗi dòng dịch vụ "làm đại lý" (H8: tính trên giá trước giảm).
   - Phương án B (câu C1): dùng đúng hai loại ADR-0026 điều 3 đã liệt kê dự kiến — `MUA_GIA_DAI_LY` (người hưởng nợ Tour Đảo = Σ giá lẻ trước giảm − hoa hồng) + `THU_HO` (Tour Đảo nợ người hưởng = tổng khách đã trả). **Số dư mỗi bên như nhau đến từng đồng** (bảng đối chiếu ở ví dụ C-1). Khác ở cách Kế toán đọc sổ.
3. **"Thu hộ" trong luật lượt 1 (không đổi):** mọi đồng khách trả, ai cầm thì người đó có dòng *tiền đang giữ hộ* **nợ Tour Đảo** (ADR-0026 điều 4) — kể cả HDV thu tại cảng cho đơn của đại lý, đại lý tự thu cọc (`BOOKER`), quầy nhà cung cấp (`SUPPLIER` — ADR-0078). **Không** có dòng "HDV nợ đại lý". Công ty là đầu mối: thu từ người cầm tiền, trả hoa hồng cho người hưởng. Đây là cách hiểu câu chủ "HDV thu tiền hộ đại lý" trong khuôn sổ đã duyệt: số đại lý được nhận cuối cùng như nhau.
4. **Một nguồn tính** (5.4): số của mọi dòng ở điều 2 lấy từ `phanThuongMaiCuaDon` của `orders` (ADR-0077 điều 10) — hàm thuần `hoaHongDong`, `giaVonDong` của `pricing` trên **bản chụp hiện hành** và **thành tiền dòng tại mốc "Đã giao"** (đơn đã khoá nên "hiện hành" = "tại mốc"). Luật sinh dòng thuần `sinhPhieuDaGiao` (`billing/rules.ts`) nhận số, không tra cài đặt (ADR-0026 điều 4 gạch 4).
5. **Lô ghi "Đã giao"** (ADR-0025 điều 4) thêm các dòng trên vào phiếu "Đã giao" trong **cùng `db.batch()`**. Hai lớp CSDL (5.1) cho "đủ bản chụp":
   - **Lớp 1 — câu ghi của `orders`** (lượt 1 đang chặn đơn đại lý ở đây, **phải sửa cùng lúc**): `src/modules/orders/hoan-tat-repo.ts:76` (`DAT_GIAO_DIEU_KIEN`) có `AND NOT EXISTS (SELECT 1 FROM v_pty_open_role_group g WHERE g.party_id = orders.booker_party_id AND g.role_group = 'EXTERNAL')` — **thay** bằng "không dòng dịch vụ nào của đơn thiếu bản chụp hiện hành hoặc có bản chụp `MISSING`" (đọc `ord_service_terms` — bảng cùng module, đúng luật tệp nửa nghiêm). Và `:16` (`GIAO_STATE`, cột `co_nguoi_huong` suy từ nhóm `EXTERNAL`) đổi sang đọc người hưởng từ bản chụp (`beneficiary_party_id`). Không sửa lớp này thì bỏ lý do giữ ở mã vẫn **không** mở được đơn đại lý (câu `UPDATE orders` không áp ⇒ 409).
   - **Lớp 2 — trigger của `billing`:** `bil_posting_delivered_terms` trên `bil_posting` (loại `DELIVERED`) đọc view công bố `v_ord_terms_missing` của `orders` (cạnh `billing → orders` đã có) ⇒ còn dòng thiếu ⇒ `RAISE 'terms_missing: …'` ⇒ cả lô huỷ.
6. **Lệch có chủ ý L-C1 (Hiến chương 5.1) — thu hẹp bằng lớp CSDL một phần, có hạn** (chủ quyết ở câu **C10**):
   - **Phần CSDL canh được (khuyến nghị thêm — C10 = A):** phiếu "Đã giao" chụp thêm `gross_snapshot` = Σ thành tiền các dòng **trước giảm** tại mốc (cùng khuôn `due_snapshot` chủ đã đồng ý lưu ở Q4 30/9; tính bằng hàm duy nhất). Trigger trên `bil_debt_line` (chỉ đọc bảng `bil_`, view `v_pty_owner_company`):
     - (i) dòng `HOA_HONG`, `GIA_VON` **bắt buộc** `order_service_id`; mỗi (phiếu, dòng dịch vụ) tối đa **một** `HOA_HONG` và **một** `GIA_VON` (chỉ mục duy nhất một phần);
     - **Phạm vi của (ii)–(iv):** chỉ áp cho dòng **gốc** (`reverses_line_id IS NULL`) thuộc **phiếu `DELIVERED` có `gross_snapshot` NOT NULL**. **Miễn:** dòng đảo (trigger `bil_debt_line_reversal_match`, `migrations/0045:203-208`, buộc đổi chỗ hai bên — ADR-0026 điều 8), mọi dòng của phiếu **điều chỉnh** (`ADJUSTMENT`, vd ví dụ D-3 "A → TĐ 20.000 loại hoa hồng"; phiếu bổ sung giá vốn của M1 = A — không có `gross_snapshot`), và phiếu `DELIVERED` tạo trước mốc phát hành (`gross_snapshot` NULL). (i) áp cho mọi dòng `HOA_HONG`/`GIA_VON` gốc của phiếu `DELIVERED` (dòng điều chỉnh có thể gắn hoặc không gắn dòng dịch vụ — chốt ở kế hoạch).
     - (ii) chiều đúng: `HOA_HONG`, `GIA_VON` có bên nợ = công ty chủ; `GIAM_GIA_BEN_DAT` có bên được nợ = công ty chủ;
     - (iii) cộng dồn `HOA_HONG` + `GIA_VON` **gốc** trên một phiếu `DELIVERED` ≤ `gross_snapshot` (không tính dòng đảo);
     - (iv) `GIAM_GIA_BEN_DAT` gốc (nếu có) = `gross_snapshot` − `due_snapshot` **đúng từng đồng** (giảm giá cấp đơn là phần chênh duy nhất giữa hai số).
     - **Không có trigger** ép "đơn có người hưởng và giảm giá > 0 thì **phải** có dòng `GIAM_GIA_BEN_DAT`" (trigger trên dòng không biết lúc nào lô đã chèn xong) — điều này **chỉ** do mã + kiểm định kỳ `R-BIL-14` canh; ghi vào lệch L-C1.
     - **Vi phạm (iii)** gần như chỉ xảy ra khi **cấu hình sai** (mức hoa hồng + a% vượt giá bán). Route "Đã giao" **kiểm trước bằng hàm duy nhất** và trả **lý do giữ lời thường** (5.7): mã `terms_exceed_price` — "Mức hoa hồng / giá vốn cài cho đơn này vượt giá bán — Kế toán xem lại", ai xử lý: **Kế toán**; trigger chỉ là lưới cuối, `RAISE` có tiền tố mã được route dịch ra cùng câu đó, **không** trả lỗi SQL thô.
     - **Việc của kế hoạch (spike trước khi dựa vào):** thử trên D1 local `ALTER TABLE bil_posting ADD COLUMN gross_snapshot INTEGER` kèm `CHECK` theo `kind_code` (SQLite có thể không cho `ADD COLUMN` kèm `CHECK` tham chiếu cột khác — nếu không, đổi sang trigger `BEFORE INSERT` trên `bil_posting`); ghi kết quả vào nhật ký thi công.
   - **Phần chỉ ở mã:** số hoa hồng / giá vốn **đúng tỷ lệ** của từng dòng (phần vạn, làm tròn, đếm khách H7) và "mỗi dòng ≤ thành tiền **dòng đó**" — viết công thức trong trigger là đường tính thứ hai (trái 5.4); còn thành tiền từng dòng sau điều chỉnh số khách hôm nay nằm trong JSON của `order_money_adjustment` nên không có view đọc được. Lớp bù: hàm duy nhất + sổ vàng (5.17) + `R-BIL-2` định kỳ.
   - **Điều kiện / hạn gỡ phần còn lại:** khi thành tiền dòng sau điều chỉnh có **cột** (không còn chỉ ở JSON — vd ADR nào sửa `order_money_adjustment`, hoặc chủ chọn lưu số tiền dòng vào bản chụp) thì thêm view + trigger "mỗi dòng ≤ thành tiền dòng"; **xét lại muộn nhất** ở ADR "nợ nhà xe vào sổ" (lượt sổ kế tiếp). **Chỉ hợp lệ khi chủ duyệt** (Hiến chương 6.1).
7. **Đơn đã có số liệu cũ khi lượt 2 lên** — ba nhóm, mỗi nhóm một cách:
   - (a) **Đơn khách lẻ đã "Đã giao" ở lượt 1 có dịch vụ "làm đại lý"** (vd i-resort): **đã chốt M1 = A** — Kế toán bổ sung dòng giá vốn bằng phiếu điều chỉnh có lý do. `R-BIL-2`/`R-BIL-5` với đơn "Đã giao" **trước mốc phát hành** chạy mức **`warn`** + danh sách (để `audit-invariants --db remote` của runbook không thoát 1 ngay sau triển khai); sau mốc: `error`.
   - (b) **Đơn đã xác nhận, chưa "Đã giao"** lúc lượt 2 lên — **không có bản chụp**. Chia hai:
     - (b1) **Đơn không người hưởng và không dòng nhập tay** (khách lẻ thường — đa số): **chụp bù tự động lúc phát hành** (`source = AUTO`, `captured_date` = ngày xác nhận của đơn; người bán từ dòng điều khoản `ALL` có hiệu lực ngày đó — ADR-0078 điều 3, ngày bắt đầu lùi về trước đơn đầu tiên; hoa hồng `NONE`). Tất định, không đoán, **không làm đơn khách lẻ nào bị giữ thêm** so với lượt 1 (ưu tiên "xe chạy" của chủ). Bằng câu một lần trong migration hay lệnh một lần chạy theo runbook: chốt ở kế hoạch.
     - (b2) **Đơn có người hưởng** (đang bị chặn từ lượt 1) và **dòng nhập tay** (A-14): bị giữ `terms_missing` ("đơn xác nhận trước bản …, chưa chụp mức"). Cách thả: **câu C4**.
   - (c) **Đơn nháp / chờ xác nhận**: không cần gì — chụp khi xác nhận.

### Phần C2 — Trần giảm giá của đơn có người hưởng (gỡ lệch 5.8 của ADR-0029)

8. **Trần = tổng hoa hồng của đơn** (ADR-0027 điều 2b: "mức giảm tối đa là mức chiết khấu… dành cho đối tác"; "tạm bằng 0" hết hiệu lực khi bảng mức có). Tính bằng cùng hàm (điều 4):
   - trước Xác nhận (lập / sửa nháp): theo **bảng mức hôm nay** cho bên đặt của đơn (số dự kiến, không lưu); dòng thiếu mức tính 0 vào trần (thận trọng — trần chỉ thấp hơn, không cao hơn);
   - lúc Xác nhận: theo **bản chụp** vừa chèn trong cùng lô — vượt ⇒ từ chối xác nhận;
   - sau Xác nhận, HDV / văn phòng **giảm số khách** làm hoa hồng giảm dưới số giảm giá đã cho: **không chặn** (tinh thần 5.9 — không chặn thao tác phản ánh thực tế); màn đơn hiện cảnh báo "Giảm giá đang lớn hơn hoa hồng X ₫ — đại lý chịu phần này". Dòng `GIAM_GIA_BEN_DAT` vẫn ghi đúng số giảm giá.
9. **Ai chịu giảm giá trên đơn có người hưởng, và trần xét theo gì** — **câu C8** (chưa có lời chủ cho trường hợp **nhân viên** nhập giảm giá trên đơn đại lý: ADR-0018 §11 nói "giảm giá cho khách do đối tác chịu", H8 nói "đối tác **tự** giảm thì đối tác chịu"; dòng `GIAM_GIA_BEN_DAT` **không được** tự gán phần nhân viên giảm cho đại lý mà không hỏi). Khuyến nghị **C8 (A):** mọi giảm giá cấp đơn trên đơn có người hưởng **là giảm giá của đại lý** (nhân viên nhập thay theo lời đại lý) ⇒ đại lý chịu, **trần áp cho mọi người** sửa (kể cả Bán hàng, Quản trị). Muốn Tour Đảo tặng thêm cho khách của đại lý thì không đi đường "giảm giá" ở lượt này (trần giảm giá nhân viên — ý A4 của Giám đốc — đã vào sổ tồn đọng). Phương án khác ở `docs/superpowers/specs/2026-10-01-de-xuat-adr-so-tien-luot-2/cau-hoi-chu.md` C8 (tách "giảm giá Tour Đảo chịu" thành ô riêng — cần cột mới; hoặc giữ như nay). Đơn khách lẻ: không đổi.
   - Hệ quả: **gỡ lệch 5.8** của ADR-0029 (luật giá Đối tác xét theo `holdsPartner(staff)`); vế **giá danh mục** (ADR-0027 điều 2a) giữ theo người thao tác như cũ (ngoài phạm vi ADR này).
   - **Kéo dài lệch 5.1 của ADR-0029** cho trần giảm giá — ADR-0029 hẹn "xem lại cùng lúc với bảng chiết khấu", nay là lúc đó; **chủ quyết ở câu C11**. Khuyến nghị (A): kéo dài **có hạn** — trần cần hàm tính tiền nên không đặt nguyên trong trigger được; lớp bù kiểm định kỳ `R-ORD-DC1` (warn → **error** sau mốc phát hành) "đơn có người hưởng, xác nhận sau mốc, giảm giá > tổng hoa hồng chụp lúc xác nhận"; hạn xét lại = cùng điều kiện gỡ L-C1 (khi thành tiền dòng có cột thì trigger lúc Xác nhận so `orders.discount` với tổng bản chụp được). (B): thêm ngay lớp CSDL **xấp xỉ** — chỉ được khi tỷ lệ là `RATE` (trigger tính lại ⇒ đường tính thứ hai, không khuyến nghị).

### Bảng quyền (9 quyền app)

**Không thêm ô, không đổi ô.** Các ô liên quan giữ nguyên: `order.handover` (none, none, any, assigned, none, any, none, none, none), `order.complete` (none, any, none, none, none, any, none, none, none), `payment.receive`, `order.modify`/`order.create` (cổng trần giảm giá). Đổi **luật** sau ô: lý do giữ (điều 1), trần giảm giá (điều 9) — quyết định chạm quyền nên tính vào trần 3 của lượt.

### Dữ liệu (cùng migration lượt 2; số chốt lúc gộp)

| Bảng | Đổi |
|---|---|
| `bil_debt_kind` | + `HOA_HONG`, `GIAM_GIA_BEN_DAT`, `GIA_VON` (phương án A) — hoặc `MUA_GIA_DAI_LY`, `THU_HO`, `GIA_VON` (B) |
| `bil_posting` | + trigger `bil_posting_delivered_terms` (điều 5); + cột `gross_snapshot INTEGER NULL` (có ⇔ phiếu `DELIVERED` tạo sau mốc — `ALTER TABLE ADD COLUMN`, nếu C10 = A) |
| `bil_debt_line` | + chỉ mục duy nhất một phần và trigger (i)–(iv) của điều 6 (nếu C10 = A) |
| `orders` (tệp `hoan-tat-repo.ts`) | đổi điều kiện câu "Đã giao" (điều 5 lớp 1) — không đổi bảng |
| `bil_debt_line` | không đổi cột; dòng `HOA_HONG`/`GIA_VON` mang `order_service_id` |

### Bất biến (`scripts/audit-invariants.mjs`)

- **`R-BIL-2` (I2 — bật):** với mỗi đơn "Đã giao" sau mốc: tổng dòng `HOA_HONG`, `GIA_VON`, `GIAM_GIA_BEN_DAT` trên phiếu "Đã giao" (cộng phiếu điều chỉnh của đơn) **=** số tính lại bằng hàm duy nhất từ bản chụp + đơn đã khoá; và **phần Tour Đảo giữ = Σ giá lẻ trước giảm − giảm giá Tour Đảo chịu − giá vốn − hoa hồng** (khái quát luật cân đối của đặc tả Hoàn tất §5 cho trường hợp có giảm giá; sổ vàng xác nhận). Trước mốc: `warn` (điều 7a).
- `R-BIL-5` — xem ADR-0078.
- `R-BIL-14`: đơn có người hưởng ⇒ không dòng `GIAM_GIA_BEN_DAT` nào khi `orders.discount = 0`, và đúng một khi > 0.
- `R-ORD-DC1` (warn) — điều 9.

---

## Ví dụ bằng số

**Ví dụ C-1 — đại lý giữ tiền khách (ví dụ của chủ, Q17).** Đại lý A (Công ty lữ hành, 10%). Tour đảo 5.000.000; đại lý giảm cho khách 250.000 ⇒ khách trả 4.750.000. Đại lý thu cọc 3.000.000 (người thu `BOOKER`); HDV Nam thu tại cảng 1.750.000.

| Dòng | Ai nợ → ai | Số |
|---|---|---|
| Lần thu cọc (giữ hộ) | Đại lý A → Tour Đảo | 3.000.000 |
| Lần thu tại cảng (giữ hộ) | HDV Nam → Tour Đảo | 1.750.000 |
| Đã giao — hoa hồng 10% × 5.000.000 | Tour Đảo → Đại lý A | 500.000 |
| Đã giao — giảm giá bên đặt chịu | Đại lý A → Tour Đảo | 250.000 |

Số dư: **Đại lý A nợ 3.000.000 + 250.000 − 500.000 = 2.750.000** ✓ (khớp ví dụ của chủ); HDV Nam nợ 1.750.000; Tour Đảo thu về 4.500.000 = 5.000.000 − 0 − 500.000 ✓ ("đại lý phải trả Tour Đảo 4.500.000", cơ sở hoá đơn VAT sau này).
*Phương án B (đối chiếu):* mua giá đại lý 4.500.000 (A → TĐ) + thu hộ 4.750.000 (TĐ → A) + giữ hộ 3.000.000 (A → TĐ) ⇒ A nợ 3.000.000 + 4.500.000 − 4.750.000 = **2.750.000** — cùng số.

**Ví dụ C-2 — công ty thu, rồi trả hoa hồng.** CTV Lan (15%, câu C3) đặt vé Hòn Tằm 2 × 500.000 = 1.000.000; khách chuyển khoản thẳng vào tài khoản công ty, Kế toán ghi (người thu Công ty ⇒ không dòng giữ hộ). HDV bấm "Đã giao" (đã thu = phải thu). Dòng: hoa hồng **Tour Đảo → CTV Lan 150.000**. "Hoàn thành": **không bị chặn** (khoản công ty phải trả không chặn — H2' b); cuối tháng Kế toán trả CTV 150.000 (ADR-0080).

**Ví dụ C-3 — SV-HT-02 (CTV giữ cọc, HDV thu phần còn lại).** 1.000.000, 15%. CTV thu cọc 300.000 (`BOOKER`), HDV thu 700.000. Dòng: CTV → TĐ 300.000; HDV → TĐ 700.000; TĐ → CTV 150.000. Số dư: **CTV nợ 150.000**, HDV nợ 700.000; Tour Đảo giữ 850.000 ✓ (khớp SV-HT-02).

**Ví dụ C-4 — đơn trộn của lễ tân (SV-HT-03 + vé Hòn Tằm).** Lễ tân Hương: Hòn Tằm 1.000.000 (Tour Đảo bán, mức lễ tân 10%) + i-resort 600.000 (i-resort bán, a = 80%, lễ tân 50.000/khách × 2). Hương thu trước 200.000; HDV thu 1.000.000; quầy i-resort thu 400.000. Dòng giữ hộ: Hương 200.000, HDV 1.000.000, i-resort 400.000 (đều → TĐ). Đã giao: TĐ → Hương 100.000 + 100.000 = 200.000; TĐ → i-resort 480.000. Số dư: **Hương 0**; HDV nợ 1.000.000; **TĐ nợ i-resort 80.000**. Tour Đảo giữ 1.000.000 − 80.000 = 920.000 = 1.600.000 − 480.000 − 200.000 ✓.

**Ví dụ C-5 — trần giảm giá.** Đơn ví dụ A-1 (hoa hồng 790.000). Đại lý A nhập giảm 800.000 ⇒ từ chối "Giảm tối đa 790.000 ₫ (bằng hoa hồng của đơn)". Giảm 790.000 ⇒ được; lúc "Đã giao": hoa hồng 790.000 − giảm giá 790.000 ⇒ đại lý nhận 0 từ phần hoa hồng; số đại lý phải trả Tour Đảo vẫn **5.210.000** (giá cố định — ADR-0027 lời chủ).

---

## Sửa câu nào của quyết định đã duyệt

| Nguồn | Câu hiện hành | Sau ADR này |
|---|---|---|
| ADR-0026 điều 3, loại dòng | "từ lượt 2 thêm *mua giá đại lý*, *hoa hồng*, *giá vốn nhà cung cấp*, *tiền thu hộ*" | Phương án A: thêm *hoa hồng*, *giảm giá bên đặt chịu*, *giá vốn nhà cung cấp*; "thu hộ" = dòng *tiền đang giữ hộ* đã có. (Phương án B giữ đúng danh sách cũ.) — **câu C1** |
| ADR-0026 điều 4 gạch 3 | "lượt 2 sinh dòng *mua giá đại lý*, *tiền thu hộ*, *hoa hồng*, *giá vốn* từ số đã chụp lúc Xác nhận" | "…sinh dòng theo điều 2 của ADR-0079, từ **mức** đã chụp lúc Xác nhận áp lên thành tiền dòng tại mốc Đã giao" |
| ADR-0026 điều 12 gạch 1, 3; M1 | đơn có người hưởng không "Đã giao" được tới lượt 2 | Hết hiệu lực; thay bằng lý do giữ `terms_missing` / `booker_not_beneficiary` |
| ADR-0026 điều 13 | `R-BIL-2`, `R-BIL-5` "chạy từ lượt 2" | Bật, có mốc phát hành (warn trước mốc, error sau) |
| ADR-0027 điều 2b | "app chưa có bảng chiết khấu nên **tạm bằng 0**" | Trần = tổng hoa hồng của đơn (điều 8) |
| ADR-0029 điều 2 (lệch 5.8) | luật giá Đối tác xét theo quyền người thao tác | Vế **trần giảm giá**: xét theo **người hưởng của đơn** (câu C8). Vế giá danh mục: không đổi |
| Bản tổng hợp §4 luật cân đối | "phần Tour Đảo thực giữ = giá bán − giá vốn − chiết khấu/hoa hồng" | "= giá bán lẻ trước giảm − giảm giá Tour Đảo chịu − giá vốn − hoa hồng" (bằng câu cũ khi không giảm giá) |

## Phương án bị loại

- **Cho "Đã giao" với hoa hồng 0 khi thiếu mức** — ADR-0026 đã loại (khoá vĩnh viễn một số sai); 5.7.
- **Dòng "HDV nợ đại lý" khi HDV thu tại cảng** — trái ADR-0026 điều 4 (HDV nợ công ty); đại lý nhận qua hoa hồng, số cuối như nhau.
- **Ghi gộp một dòng "hoa hồng ròng" (hoa hồng − giảm giá)** — dòng phải > 0 nên đổi chiều theo dấu; Kế toán khó đọc; mất số giảm giá riêng.
- **Viết công thức hoa hồng trong trigger** — đường tính thứ hai (5.4) ⇒ L-C1.

## Hệ quả

- **Lớp chặn SQL lượt 1 phải đổi cùng bản:** `src/modules/orders/hoan-tat-repo.ts:76` (điều kiện `NOT EXISTS … role_group = 'EXTERNAL'` trong câu "Đã giao") và `:16` (`co_nguoi_huong` trong `GIAO_STATE`) — điều 5 lớp 1. Bài test ghim hai câu này đảo có chủ đích (đỏ → xanh).
- **Sổ vàng / bài kiểm:** `src/so-vang.test.ts` kiểm "nhất quán nội tại" với luật **tổng thu = giá bán** (bảng thi hành `docs/ARCHITECTURE.md:160`) — **lệch khi có giảm giá do bên đặt chịu** (tổng thu < giá bán lẻ). Phải đổi luật kiểm sang công thức khái quát của `R-BIL-2` (điều trong mục Bất biến); dòng bảng thi hành ở `ARCHITECTURE.md` là tệp luật ⇒ AI chỉ đề xuất diff (`docs/superpowers/specs/2026-10-01-de-xuat-adr-so-tien-luot-2/de-xuat-luat.md` mục 4).
- **Mã:** `billing/rules.ts` (`lyDoChuaGiaoDuoc`, `sinhPhieuDaGiao` có dòng thương mại), `billing/service.ts` (lô "Đã giao"; `gross_snapshot` nếu C10 = A), `orders` (trần giảm giá theo người hưởng — `price-guards.ts`, `discountWithinCap`), `scripts/audit-checks.mjs` (bỏ R-BIL-2/5 khỏi danh sách "chưa áp dụng"), `golden/so-cong-no-luot-2.json` (ca mới, `cho_xac_nhan`), `src/so-vang.test.ts` (chạy SV-HT-01…05 trên mã sổ — hôm nay "chưa áp dụng").
- **Sổ vàng (5.17):** mã sổ lượt 2 chỉ được nhận khi chủ/Kế toán **xác nhận** SV-HT-01…05 và các ca C-1…C-5 (đang `cho_xac_nhan`). AI không tự xác nhận.
- **Bảng tin / thông báo:** không loại tin mới; "Đã giao" vẫn chỉ làm mới màn hình (ADR-0045).
- **Việc lớn** (tiền + dữ liệu): người kiểm độc lập chỉ-đọc.

## Tiêu chí nghiệm thu (đỏ trước, xanh sau)

1. Ví dụ C-1…C-5 + SV-HT-01…05 thành test của luật sinh dòng; khớp từng đồng.
2. Đơn có người hưởng đủ bản chụp ⇒ "Đã giao" thành công; thiếu một dòng ⇒ 409 `terms_missing` với câu tiếng Việt + "Kế toán xử lý"; **SQL chạy tay** chèn phiếu `DELIVERED` cho đơn thiếu ⇒ trigger chặn (thấy chặn thật một lần).
3. Cố ý làm hỏng dòng hoa hồng trong lô ⇒ không câu nào lưu (đơn không "Đã giao").
4. Trần: đại lý / Bán hàng (C8 = A) giảm vượt ⇒ 400; giảm bằng trần ⇒ được; xác nhận lại so với bản chụp.
5. `audit-invariants`: cố ý chèn dòng hoa hồng lệch 1 đồng ⇒ `R-BIL-2` thoát 1; đơn "Đã giao" trước mốc ⇒ chỉ cảnh báo.
6. Bài cũ ghim `booker_partner` đảo có chủ đích (đỏ → xanh), ghi ở kế hoạch.
7. (C10 = A) **Đảo một dòng `HOA_HONG` đã ghi** (Kế toán, `dao_dong`) **chạy được** — trigger (ii)–(iv) không chặn dòng đảo; **ví dụ D-3** (phiếu điều chỉnh "A → TĐ 20.000 loại hoa hồng") **chạy được**; phiếu điều chỉnh bổ sung `GIA_VON` cho đơn "Đã giao" lượt 1 (M1 = A, không `gross_snapshot`) **chạy được**.
8. (C10 = A) Mỗi trigger (i)–(iv) thấy chặn thật một lần bằng SQL chạy tay trên phiếu `DELIVERED` mới; cấu hình mức + a% vượt giá bán ⇒ route trả lý do giữ `terms_exceed_price` bằng lời thường, không lỗi SQL thô.

## Xung đột / điều chưa chắc

- Câu **C1** (kiểu dòng), **C4** (đơn kẹt), **C8** (ai chịu giảm giá / trần áp cho nhân viên), **C10** (L-C1), **C11** (kéo dài lệch 5.1 của ADR-0029) — `docs/superpowers/specs/2026-10-01-de-xuat-adr-so-tien-luot-2/cau-hoi-chu.md`.
- L-C1 là lệch có chủ ý mới — chỉ hợp lệ khi chủ duyệt.
- Cách làm tròn (nửa lên, theo dòng) — giả định, sổ vàng xác nhận.
