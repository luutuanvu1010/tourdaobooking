# Kiểm thử theo vai 2/10/2026 — Truy nguyên nhân gốc

> **Vai của phiên:** điều tra, chỉ đọc (không sửa mã, không thi công). Mã đọc tại `main` @ `dfee4a8c` (= bản 1.76 đang chạy) + commit báo cáo lỗi `c27f47de`.
> **Nguồn lỗi:** `BAO-CAO-LOI.md` cùng thư mục (bản tóm tắt; bản đầy đủ 78 lỗi với bước tái hiện **không có trong kho**, nên phần lỗi ít nghiêm trọng chỉ truy được theo bốn "kiểu lặp lại").
> **Cách làm:** bốn trợ lý đọc mã song song theo bốn nhóm lỗi, mỗi điểm phải có tệp:dòng; VP-01 được **chạy lại thật** trên khung thử SQLite tạm. Người tổng hợp đối chiếu với 9 gốc R1–R9 đã chốt ở `docs/superpowers/specs/2026-10-02-khac-phuc-audit-goc-va-phuong-an.md`.
> **Giới hạn:** chưa có người kiểm độc lập đọc lại bản này; một số dòng mã người tổng hợp chưa tự mở (ghi rõ ở mục 7).

---

## 0. Thuyết minh ngắn cho chủ dự án (đọc phần này là đủ)

**Kết luận một câu:** phần lớn lỗi không phải do ai gõ sai một dòng mã. Chúng sinh ra từ **cách dự án ra quyết định và kiểm tra**: nhiều quyết định nhỏ, mỗi cái đúng khi đứng riêng, được duyệt rất nhanh (83 ADR trong 13 ngày, đỉnh 16 cái một ngày; 76 bản phát hành trong 12 ngày), nhưng **không ai ghép chúng lại theo góc nhìn "một người làm một việc từ đầu đến cuối"**. Bộ kiểm tự động của dự án rất lớn (hơn 50.000 dòng test) nhưng chỉ kiểm **những điều đã được liệt kê**, nên nó không thể báo "thiếu".

Hình dung đơn giản: dự án giống một ngôi nhà xây rất nhanh, mỗi bức tường đều thẳng và được đo kỹ, nhưng không ai đi thử **đi từ cửa vào bếp** nên có hai bức tường đúng chuẩn chắn ngang lối đi.

**Lỗi nghiêm trọng VP-01 (sổ tiền trừ hai lần):** một khoản tiền "giữ hộ" có **hai cách tất toán hợp lệ** (Kế toán xác nhận tiền đã về tài khoản công ty, hoặc nhân viên nộp tiền mặt bù). Hai cách này được định nghĩa ở hai điều khác nhau của cùng một ADR, **không điều nào nói về điều kia**, nên máy chủ cho làm cả hai. Sổ chỉ cộng dồn, không có chỗ ghi "khoản này đã xong", nên trừ hai lần ra số âm. Bộ kiểm dữ liệu không bắt vì nó chỉ kiểm hình thức (dòng đảo khớp dòng gốc), không kiểm dấu số dư. Việc "kiểm số nộp không vượt số giữ" đã được **hoãn có chủ ý** sang lượt 2 (ADR-0080) nhưng không ghi vào sổ nợ, nên không ai quay lại. **ADR-0092 nháp hiện vẫn chưa phủ ca này**; cần thêm một điều trước khi duyệt.

**Năm nguyên nhân gốc xuyên suốt** (chi tiết mục 2):
1. Quyết định rời rạc, trang ghép chỉ ghép theo **bảng và quyền**, không ghép theo **luồng của một vai** hay **cặp lệnh trên cùng một đối tượng**.
2. "Giả định bề mặt, đảo được" và "lượt 1 chưa làm" ghi trong ADR **không có mã nợ** nên biến thành khoảng trống vĩnh viễn.
3. Luật lõi "chỉ đi tiến, chỉ-thêm" được duyệt **không kèm đường sửa sai**, trong khi giao diện tài xế cho bấm một chạm.
4. Bộ kiểm có hình dạng lệch: rất nhiều test đơn vị và e2e gọi API, **không có kiểm giao diện tự động** trong cổng phát hành, bất biến dữ liệu chỉ kiểm hình thức.
5. Cùng một "sự thật" được suy ra từ **hai nguồn khác nhau** (sổ: "chờ xác nhận" từ dòng chưa đảo, "đang giữ" từ tổng dương; Trang chủ: số toàn công ty cạnh số của tôi; "được báo tin" suy từ "được xem").

**Ba việc cần bạn quyết** (mục 6): (a) VP-01 vào sổ dừng dây chuyền thành mục riêng gắn hạn TNV-G4 hay gộp; (b) chốt cách sửa VP-01: chặn "xác nhận" khi đã nộp, hay "xác nhận" chỉ tất toán phần còn lại; (c) thứ tự bốn lỗi chạm luật lõi chuyến — khuyến nghị: HT-01 và hộp xác nhận HT-03 làm ngay (không cần ADR), lệnh hoàn tác có lý do làm bằng ADR sau.

---

## 1. Bảng tổng kết: lỗi → loại nguyên nhân → gốc

| Mã | Lỗi | Loại nguyên nhân gốc | Lỗi lập trình? | Mã có lệch ADR? | Gốc (R cũ / mới) | Cần ADR để sửa? |
|---|---|---|---|---|---|---|
| **VP-01** | Sổ tiền trừ hai lần khoản chuyển khoản | **Lỗ thiết kế trạng thái** của mô hình sổ + hoãn có chủ ý không ghi sổ + bất biến hình thức | Không (hai hàm đúng ADR-0026 đ4, đ5) | Không | R2 + **M1** (cặp lệnh loại trừ) | **Có** (bổ sung ADR-0092) |
| **HT-24** | Chuyến đang chạy biến mất lúc 0 giờ | **Lập trình tầng trình bày** (máy chủ đúng, giao diện lọc rơi) | **Có** | Không (máy chủ đúng ADR-0049 D3, ADR-0053 D7.2) | **M4** (hình chiếu không được kiểm) | Không |
| **HT-03** | Xuất bến nhầm chuyến ngày khác không gỡ được | **Khoảng trống đặc tả** + giao diện một chạm + luật lõi không có sửa sai | Một phần (nút không hỏi) | Không | **M3** (chỉ đi tiến không kèm sửa sai) | Hộp xác nhận: không; hoàn tác: **có** |
| **HT-01** | Điểm trả đứng trước điểm đón | **Lập trình thuật toán** trên đặc tả thiếu ca gộp đoàn; cổng không kiểm | **Có** | Không (I40 chỉ nói gộp theo nơi) | M4 | Không (cảnh báo); giữ xuất bến: hỏi chủ |
| Kiểu **A** | Bấm nhầm không sửa được | Thiết kế luật lõi | Không | Không | **M3** | **Có** |
| Kiểu **B** | Tin báo không tới đúng người | Thiết kế (tập đóng sự kiện; "được báo" = "được xem") + quy trình (ADR-0062 duyệt chưa thi công) | Không | Không | R4 + **M1**, **M2** | Có (ma trận sự kiện × vai) |
| Kiểu **C** | Dữ liệu bẩn lọt vào | Lập trình (hai chuẩn SĐT; tra trùng ở giao diện bị 403) + **hai ADR mâu thuẫn** + hoãn ghi ở bản nháp | Một phần | **Có mâu thuẫn** ADR-0001 §8 ↔ ADR-0014 đ5 | R6 + **M2**, **M5** | Có (chọn ADR nào thắng) |
| Kiểu **D** | Chữ/màn hình gây hiểu nhầm | Lập trình (né theo bộ chọn đóng; hàm ngày nhân bản) + quy trình (không kiểm giao diện tự động) | Có | Không | **M4**, **M5** | Không |

Gốc mới đề xuất (M = "mới", bổ sung cho R1–R9 đã chốt):
- **M1 — Quyết định ghép theo bảng/quyền, không theo luồng vai hay cặp lệnh.** Trang ghép (CLAUDE.md §9) hỏi "bảng chứa gì, quyền chạm gì, cổng canh gì"; không hỏi "hai lệnh này có loại trừ nhau không" và "vai X trong một ngày thấy/nhận gì".
- **M2 — Hoãn có chủ ý không có mã nợ.** "Giả định bề mặt đảo được", "lượt 1 chưa kiểm" nằm trong thân ADR, không vào `BACKLOG`/`quyen-hoan.json`, nên không ai quay lại.
- **M3 — Luật lõi chỉ-đi-tiến không kèm cơ chế sửa sai.** Chỉ hai ngoại lệ có đường sửa: giấy tờ (ADR-0040, dòng mới + lý do) và "Đã gọi báo" (ADR-0051, nút Bỏ đánh dấu).
- **M4 — Hình chiếu giao diện không được kiểm theo vai.** 85 kịch bản Chrome chạy tay, 0 test cho `web/`, e2e toàn API; test ca khó (qua nửa đêm) đặt ở máy chủ nhưng không ở hàm giao diện.
- **M5 — Một sự thật, hai nguồn suy.** Hai mảng độc lập ở `tienCuaDon`; số "của tôi" cạnh số "toàn công ty"; `PHONE_RE` cạnh `normalizePhone`; "được báo" suy từ `trip.view`.

---

## 2. Vì sao những nguyên nhân đó xảy ra (tầng quy trình)

Số liệu đo trên kho (lệnh ghi ở mục 7):

| Chỉ số | Giá trị |
|---|---|
| ADR | 83 tệp, 20/9 → 2/10 (13 ngày); 30/9: 13, 1/10: 16 |
| Bản phát hành production | v1.0 (21/9) → 1.76 (2/10): 76 bản / 12 ngày |
| Migration | 64 tệp; 1/10 riêng 11 tệp |
| Mã máy chủ / test / giao diện | 38.364 / 50.710 / 18.974 dòng; `web/` có **0** tệp test |
| E2E | 42 kịch bản, **toàn bộ gọi API** (không trình duyệt) |
| Kịch bản Chrome | 85 tệp ở `docs/evidence/`, **không** nằm trong `npm test` hay `npm run trien-khai` |
| Trang ghép | 4 tệp, cấu trúc: bảng → quyền → cổng → hệ quả chéo; không mục "một vai trong một ngày" |

Từ số liệu đó rút ra năm cơ chế sinh lỗi:

**(i) Tốc độ quyết định vượt khả năng ghép.** Mỗi ADR có test riêng xanh. Lỗ sinh ra ở **giao của hai ADR**: ADR-0026 đ4 (xác nhận = đảo dòng giữ hộ) × đ5 (nộp = dòng quyết toán); ADR-0052 D6.2 (HDV không nhận tin chuyến) × ADR-0056 (HDV là suất `CREW` trên chuyến); ADR-0001 §8 (bắt buộc hiện hồ sơ trùng) × ADR-0014 đ5 (CTV không tra hồ sơ, vẫn tạo mới). Bài học F-01 ngày 20/9 ("ba ADR đúng riêng lẻ ghép thành lỗ") đã sinh ra trang ghép, nhưng trang ghép chỉ ghép **bảng và quyền**, nên các giao điểm trên nằm ngoài tầm nhìn của nó.

**(ii) Hoãn không có mã nợ.** Ba câu trong ADR đã duyệt:
- ADR-0080:76 — *"Lượt 1 chưa kiểm vượt ở `nop`/`tra` — áp chung từ lượt 2"* → VP-01.
- ADR-0025:71 — *"Loại thông báo: chỉ làm mới màn hình … giả định bề mặt, đảo được; chủ muốn hiện nổi cho Kế toán thì thêm một dòng"* → Kế toán không có tin tiền.
- ADR-0052:165 — *"HDV, Đối tác … không nhận tin chuyến nào … đúng lời chủ Q1"* → HDV đi kèm không biết giờ hẹn.
Không câu nào có dòng trong `docs/BACKLOG.md` hay `docs/quyen-hoan.json`. Luật dừng dây chuyền (CLAUDE.md §3) chỉ bắt mức HIGH, nên "hoãn mức trung bình" rơi tự do. Tương tự, MST không UNIQUE được hoãn ở **bản nháp** đối chiếu Oracle (`2026-09-21-doi-chieu-oracle-tca.md:80`), không ở sổ nào.

**(iii) Luật lõi duyệt mà không hỏi "sai thì sửa thế nào".** ADR-0049:122 đặt LC-04/LC-07 dưới tiêu đề *"không ai phá lệ, kể cả Toàn quyền"* với lý do *"danh sách hành khách là chứng cứ pháp lý"* (:93-96). Lý do đúng, nhưng nó biện minh cho **không ghi đè**, không biện minh cho **không có lệnh sửa sai chỉ-thêm**. Chỉ ADR-0040 (giấy tờ) và ADR-0051 Q-GB-2 ("Đã gọi báo") đặt câu hỏi "bấm nhầm thì sao"; ở Q-GB-2 chủ đã chọn **nút hoàn tác**, bác hộp xác nhận — là tiền lệ hướng giải quyết. Giao diện tài xế không thừa hưởng tiền lệ đó: Xuất bến, Đã tới, Đã đón, Vắng, Khách huỷ, Đã trả, Kết thúc đều một chạm (`web/cuoc-chuyen.ts:122-189, 275-277`).

**(iv) Bộ kiểm chỉ khoá điều đã liệt kê.** Năm loại lỗi bộ kiểm hiện tại **không thể** bắt về nguyên lý: lỗi "vắng mặt" (sự kiện không phát tin, điều kiện không có); lỗi xếp lớp theo kích thước màn; lỗi ngữ nghĩa chữ (ngày thiếu năm, phạm vi số); lỗi do ghép hai quyết định; dữ liệu "đúng kiểu sai nghĩa" (SĐT 19 ký tự khớp regex, hai MST trùng). `audit-invariants` báo "đạt" là **đúng theo định nghĩa** vì không có bất biến nào cho các điểm đó — "đạt" bị đọc nhầm thành "sạch" (cùng bài học 24/9 ở CLAUDE.md §3).

**(v) Hình chiếu "đặt tạm" rồi ở lại.** Nút Kế toán trên trang đơn được ghi là *"đặt TẠM … chủ sẽ vẽ lại hai màn sổ"* (`2026-09-30-so-tien-luot-1-thi-cong-nhat-ky.md:139`); chưa có trang `ledger/mine` nào trong `web/`. Thứ "tạm" không có hạn nên thành thường trực và mang luôn lỗ VP-01 ra production.

---

## 3. Chi tiết từng lỗi

### 3.1 VP-01 — Sổ tiền trừ hai lần một khoản chuyển khoản (NGHIÊM TRỌNG)

**Tái hiện thật** (khung thử SQLite tạm, số liệu 1.000.000 ₫; S = Bán hàng, CT = công ty):

| Bước | Dòng nợ ghi thêm (`bil_debt_line`) | Số dư S với CT trên đơn |
|---|---|---|
| B1. S khai CK 1.000.000 "Công ty thu" | `HELD` S → CT | +1.000.000 (giữ hộ, H3) |
| B2. Kế toán bấm "Đã nộp về công ty" | `SETTLEMENT` CT → S | 0 |
| B3. Kế toán bấm "Xác nhận đã nhận" | đảo dòng B1 (`HELD` CT → S, `reverses_line_id` = B1) | **−1.000.000** |

Cả hai route trả 201/200; không trigger nào nổ; `GET /api/ledger/mine` của S trả `dangGiu: -1000000`; sổ Kế toán hiện dòng âm; `R-BIL-*` đều 0 vi phạm. Chiều ngược (xác nhận trước, nộp sau **qua API**) cũng ra −1.000.000 — giao diện chỉ ẩn nút, máy chủ không chặn.

**Cơ chế (tệp:dòng):**
- Mô hình: ba bảng chỉ-thêm `bil_payment_receipt`, `bil_posting`, `bil_debt_line` (`migrations/0045_billing_so_cong_no.sql:66-142`). "Đang giữ" = **tổng đại số mọi dòng** (view `v_bil_party_balance` `0045:155-162`; `src/modules/billing/rules.ts:130-138`; `service.ts:532-544` không kẹp âm). Không có cột trạng thái cho dòng `HELD`.
- "Xác nhận đã nhận" `xacNhanCongTyNhan` (`service.ts:331-355`): điều kiện duy nhất là **còn dòng HELD chưa bị đảo** (`:336`); không đọc số dư. Dòng `SETTLEMENT` của lệnh nộp không đảo dòng HELD, nên sau B2 điều kiện vẫn đúng.
- "Đã nộp" `ghiQuyetToan` (`service.ts:361-397`): kiểm dạng, trần 10 tỷ, đơn tồn tại; **không so với số đang giữ** — đúng như ADR-0080:76 tự ghi.
- Giao diện `web/order.ts:441-594`: nút "Xác nhận" hiện theo `choXacNhan` (`:524`), nút "Đã nộp" hiện theo `dangGiu` (`:553-565`); hai mảng do máy chủ tính **độc lập** ở `tienCuaDon` (`service.ts:171-173` và `:195`), không có luật loại trừ. Sau B1 cả hai có phần tử → hai nút cùng hiện; sau B2 `dangGiu` rỗng nhưng `choXacNhan` vẫn còn.
- CSDL (`0045:182-255`): có chỉ-thêm, đảo khớp gốc, hoàn ≤ thu, một phiếu DELIVERED/COMPLETED; **không có** trigger canh dấu số dư, canh SETTLEMENT ≤ nợ, canh "đảo HELD khi đã nộp". `bil_posting_completed_settled` (`:245-255`) chỉ chặn `> 0`, nên số âm vẫn "Hoàn thành" được (KT04).
- `scripts/audit-checks.mjs:222-302`: R-BIL-1, 3a, 3b, 4a/b, 6, S9, M1/M2 — toàn hình thức; chú thích `:222-224` ghi mục tiêu *"lưới thứ hai cho SQL chạy tay"*. R-BIL-13 (không đổi dấu) **chưa có mã** (ADR-0092 nháp `:175` thừa nhận) và theo ADR-0080:104 chỉ đếm đổi dấu "do dòng SETTLEMENT" → không bắt dòng đảo HELD.
- Test: `lo-ghi.test.ts:244-267, 366-384`, `tests/e2e/so-tien.mjs:97-104`, sổ vàng SV-SC-02 đều đi **một chiều** xác nhận → nộp; `rules.test.ts:66-69` coi số âm là hợp lệ ở cấp luật thuần; không ca nào thử nộp trước / nộp vượt.
- Lịch sử: hai route và hai nút **cùng một ADR (ADR-0026, accepted 29/9), cùng commit** (nhật ký `:82-84`, `:139`); không phải hai thời điểm. ADR-0088 nháp Đ4(i)/Đ9 chính thức hoá đường **nộp bù khi CK không về** → cả hai đường đều là nghiệp vụ hợp lệ nhưng **loại trừ nhau** (tiền hoặc đã về tài khoản, hoặc người khai nộp bù; không thể cả hai).

**Vì sao xảy ra:** (1) hai cách tất toán một dòng HELD định nghĩa ở hai điều độc lập, không ai hỏi "loại trừ không"; (2) sổ chỉ-cộng không có máy trạng thái cho khoản giữ hộ; "chờ xác nhận" và "đang giữ" suy từ hai trục khác nhau; (3) kiểm vượt hoãn sang lượt 2 không ghi sổ, không có dòng ở `docs/SO-HANG-RAO.md`; (4) bất biến lượt 1 chỉ hình thức; (5) giao diện "đặt tạm", test chỉ đường vui.

**Lưu ý nghiệp vụ:** phiếu kiểm A (`2026-10-02-phieu-duyet-doc-lap-luot-A-tien.md:105-107`) chỉ rõ số dư âm **có lúc hợp lệ** (công ty nợ đại lý, nhân viên ứng tiền). Luật đúng không phải "cấm âm" mà là **"một dòng HELD chỉ được tất toán một lần, bằng một trong hai đường"**.

**Khắc phục (cần chủ duyệt qua ADR vì chạm tiền):**
- *Máy chủ:* `ghiQuyetToan` chiều `nop` so `amount` với số bên đó đang nợ trên đơn → 409 (đúng ADR-0092 đ2); `xacNhanCongTyNhan` thêm điều kiện **số người khai đang nợ trên đơn ≥ amount dòng HELD**, không thì 409 "Khoản này đã được ghi nộp — nếu tiền cũng đã về tài khoản thì đảo lần nộp trước"; `tienCuaDon.choXacNhan` lọc cùng điều kiện → một nguồn sự thật cho giao diện.
- *CSDL (migration mới):* trigger `BEFORE INSERT ON bil_debt_line` cho SETTLEMENT gốc và cho dòng đảo HELD: số dư cặp (bên, công ty, đơn) **không đổi dấu** sau khi cộng dòng mới → `RAISE(ABORT)`; bất biến `R-BIL-13` mức `fail`, giới hạn theo loại dòng để không đỏ ở ca âm hợp lệ.
- *Giao diện:* nút "Đã nộp" gửi số đang giữ **trừ** phần CK chờ xác nhận (hoặc Kế toán nhập số); dòng `dangGiu` ghi rõ "gồm X ₫ chuyển khoản chờ xác nhận".
- *Bổ sung ADR-0092 nháp:* một điều mới "Công ty đã nhận không làm số dư đổi dấu" (hoặc xếp dòng đảo HELD vào phạm vi đ2). Hiện đ2 chỉ ràng "dòng quyết toán gồm nộp, trả, bù trừ"; đ4 lại **miễn** cho "Công ty đã nhận" → đúng là khoảng trống báo cáo nêu.
- *Test đỏ trước:* `lo-ghi.test.ts` ca "nộp 1.000.000 rồi xác nhận → 409, `mine` = 0" (hôm nay 200 và −1.000.000); ca chiều ngược; `migrations-billing.test.ts` chèn SQL thẳng → trigger RAISE, gỡ trigger thì qua (ghi `SO-HANG-RAO`); `audit-invariants.test.ts` dữ liệu B1–B3 → R-BIL-13 = 1; sổ vàng thêm SV-SC-05; e2e `so-tien.mjs` nhánh thứ tự ngược.

### 3.2 HT-24 — Chuyến đang chạy biến mất khỏi màn tài xế lúc qua 0 giờ

**Máy chủ đúng.** `GET /api/van-chuyen/cuoc-cua-toi` (`src/modules/van-chuyen/index.ts:1191-1202`) dùng SQL `TRIPS_CUA_TAI_XE` (`chuyen-repo.ts:521-527`): `t.status = 'RUNNING' OR t.service_date BETWEEN ?2 AND ?3` — chuyến đang chạy được trả **bất kể ngày**; có bài kiểm nhảy đồng hồ 21:55 → 01:10 vẫn trả `RUNNING` (`cuoc-cua-toi.test.ts:199-213`). Route chi tiết (`index.ts:1204-1217`) không lọc ngày và với chuyến RUNNING vẫn mở tên khách (`tai-xe-dto.test.ts:79`) — vì thế "mở lại qua tin cũ" hoạt động.

**Giao diện lọc rơi.** `nhomCuoc` (`src/shared/tien-do-man.ts:212-232`) chia ba nhóm "Hôm nay / Ngày mai / Ngày kia" bằng `ds.filter((c) => c.gioXuatBen.ngay === ngay)` (`:231`); `gioXuatBen.ngay` = ngày VN của giờ bắt đầu dự kiến = `service_date` = **hôm qua** với chuyến vắt đêm → không rơi vào nhóm nào → không vẽ. `trangThai` chỉ dùng tô chip/nút "Mở chuyến đang chạy" (`:222-228`), không dùng để quyết định có hiện. `web/cuoc.ts:32-45` lấy `homNay` ở trình duyệt và gọi `nhomCuoc`; chữ trống "Không có cuốc nào." (`:61`) dưới tiêu đề "Hôm nay".

**Vì sao xảy ra:** đặc tả màn V5 và bản vẽ `04 Cuoc cua toi.dc.html` chỉ mô tả bố cục theo ngày; luật "trong ngày chạy hoặc đang chạy" (ADR-0049 D3 `:239`, ADR-0053 D7.2 `:57`) được giao ca kiểm cho **máy chủ** (`cuoc-cua-toi.test.ts:199`, `tai-xe-dto.test.ts:70`), còn bài của hàm giao diện (`tien-do-man.test.ts:121-135`) chỉ thử RUNNING **cùng ngày**; không e2e/Chrome nào nhảy ngày trên màn danh sách. → **Lỗi lập trình tầng trình bày**, không cần ADR.

**Khắc phục:** trong `nhomCuoc`, chuyến `trangThai === "RUNNING"` có `gioXuatBen.ngay < homNay` vào nhóm "Hôm nay" (xếp đầu, kèm nhãn ngày xuất bến). Test đỏ trước ở `tien-do-man.test.ts`: `nhomCuoc([it("x","2026-09-29","22:30",{trangThai:"RUNNING"})],"2026-09-30")` → kỳ vọng nhóm Hôm nay có `CX-x`; hiện trả `[[],[],[]]`. Tuỳ chọn: bộ hẹn làm mới lúc qua ngày (cải tiến riêng).

### 3.3 HT-03 — Bấm nhầm "Xuất bến" chuyến ngày khác không gỡ được

**Cổng xuất bến không có điều kiện ngày.** `lenhXuatBen` (`dieu-phoi-tien-do.ts:59-114`) chỉ chặn `status !== 'PLANNED'` (`:63`), kiểm giờ xảy ra (`src/shared/gio-xay-ra.ts:20-22`, không mã nào về ngày chạy), rồi `kiemXuatBen` (`src/shared/dieu-phoi-kiem.ts:324-426`: giấy tờ, bằng lái, sức chứa, nơi hẹn, suất, xe/tài xế đang chạy, nghỉ) — **không có "ngày chạy là hôm nay"**; trigger `vc_trip_departed_after_plan` (`0042:397-400`) cũng không. ADR-0053 `:220-222` và bài `dieu-phoi-kiem.test.ts:323-329` coi "xuất bến tối hôm trước cho chuyến 06:00" là **ca hợp lệ** chỉ cần ẩn tên khách → đây là **khoảng trống đặc tả**, không ai hỏi "chuyến chưa tới ngày có được xuất bến không". Ý định của chủ: chưa kiểm.

**Nút một chạm.** `web/cuoc-chuyen.ts:275-277` `nut "Xuất bến" … click → gui("xuat-ben")`, không hộp hỏi, không hiện ngày; `web/confirmation-dialog.ts` là hộp dựng ảnh xác nhận đơn, không phải hộp xác nhận chung. Văn phòng bấm thay có bảng trượt khai giờ (`web/chuyen.ts:256-272`, `tien-do-ui.ts:31-115`) nhưng không nêu ngày chạy.

**Vì sao khoá xe và tài xế:** chỉ mục `vc_trip_one_running_vehicle` (`0042:61`) + trigger `vc_trip_driver_one_running` (`0042:383-389`); `kiemXuatBen:400-407` đẩy `TRUNG_GIO_XE/TAI_XE` → chuyến thật bị giữ.

**"Kết thúc gián đoạn"** (`dieu-phoi-tien-do.ts:188-207`): lý do bắt buộc thuộc danh mục "Xe hỏng / Tai nạn / Khác" (`0041:126-128`), không ô ghi chú; lô đóng mọi suất `TRIP_INTERRUPTED`, điểm `SKIPPED`, chuyến `ENDED_INTERRUPTED` rồi đóng băng (LC-06) → để lại **chứng cứ sai** trong bảng chỉ-thêm.

**Khắc phục:** *Không cần ADR:* bảng trượt xác nhận trước Xuất bến ở màn tài xế nêu mã chuyến, ngày, giờ, biển số; cảnh báo đỏ khi ngày chạy ≠ hôm nay ở cả hai màn. *Hỏi chủ:* thêm mã giữ `CHUA_TOI_NGAY_CHAY` vào `kiemXuatBen` (chạm `MA_GIU` và ca xuất bến sớm có chủ ý) — chặn hẳn hay chỉ Quản trị phá lệ có lý do. *Cần ADR:* lệnh "Hoàn tác xuất bến" (`RUNNING→PLANNED`, chỉ văn phòng, chỉ khi chưa có sự kiện tiến độ nào, trong X phút, ghi sự kiện `DEPARTURE_REVOKED` thay vì xoá) — đổi LC-07, LC-05, chỉ mục một-chuyến-đang-chạy.

### 3.4 HT-01 — Điểm trả đứng trước điểm đón mà chuyến vẫn "Đạt hết"

**Thuật toán:** `diemChoKhoa` (`dieu-phoi-route.ts:108-117`) dùng lại điểm `PENDING` cùng `place_key` + loại; điểm mới luôn `seq = max + 1`. `lenhXepLo` (`dieu-phoi-lenh.ts:142-150`) với mỗi chặng dựng ĐÓN rồi TRẢ. Xếp đoàn 1 → ĐÓN A(1), TRẢ Bến tàu(2); xếp đoàn 2 → ĐÓN B(3), TRẢ Bến tàu **dùng lại (2)** → đón 1, trả, đón 2. Không sắp theo giờ hẹn, không có bất biến "điểm trả đứng sau mọi điểm đón của suất xuống ở đó". Kế hoạch I40 (`2026-09-29-adr-0049-thi-cong.md:212`) chỉ nói gộp theo nơi.

**"Đạt hết" không bắt:** chip chỉ phản ánh lý do giữ của `kiemXuatBen`, hàm không duyệt `seq`. Khi chạy, `DA_TRA.tu = [BOARDED]` (`dieu-phoi.ts:387`) + LC-07 nên không ghi "Đã trả" khi khách chưa lên; `STOP_XONG_NEU_HET` (`chuyen-repo.ts:448-456`) giữ điểm trả ở `ARRIVED` nên tài xế vẫn trả đoàn 2 sau — đúng nhận xét "không chặn việc chính".

**Test:** 0 tệp test cho `diemChoKhoa`/`lenhXep` với hai chặng cùng nơi trả.

**Khắc phục (không cần ADR):** sau khi dựng, đẩy điểm trả dùng lại xuống sau điểm đón mới (đổi `seq` điểm `PENDING` — route 4 và LC-15 đã cho phép); hoặc tổng quát sắp lại điểm `PENDING` theo luật "mọi PICKUP có suất xuống ở DROPOFF D đứng trước D". Thêm `canhBao` (không chặn, theo lời chủ 1/10 `dieu-phoi-kiem.ts:221`) khi tồn tại suất có `seq(xuống) < seq(lên)`. Test đỏ trước cho `diemChoKhoa` và e2e `dieu-phoi.mjs`. *Hỏi chủ:* có nâng "trả trước đón" thành lý do **giữ** xuất bến không.

### 3.5 Kiểu A — Bấm nhầm không sửa được

Máy trạng thái ở trigger LC-07 (`0042:460-481`): suất chỉ có một bước lùi `NO_SHOW→BOARDED`; không đường `BOARDED→WAITING`, `CANCELLED_AT_STOP→WAITING`, `DROPPED→BOARDED`, `RUNNING→PLANNED`. Máy chủ khớp (`LENH_SUAT` `dieu-phoi.ts:383-388`). Đường sửa duy nhất: khai lùi **giờ xảy ra** (sửa giờ, không sửa trạng thái) và "Kết thúc gián đoạn". Bảng nút một chạm ở màn tài xế: Xuất bến, Đã tới, Đã đón/Vắng/Khách huỷ, Đã trả cả điểm, Kết thúc chuyến (`web/cuoc-chuyen.ts:122-189, 275-277`); chỉ Kết thúc gián đoạn có bảng trượt.

**Vì sao:** ADR-0049:93-96 lý giải "chỉ-thêm vì chứng cứ pháp lý" nhưng không có cột lý do cho LC-07, không hỏi "bấm nhầm thì sao"; mô hình sửa sai của ADR-0040 (dòng mới + lý do) không được áp sang chuyến.

**Khắc phục:** *Không cần ADR:* bảng trượt xác nhận cho Xuất bến, Đã trả cả điểm, Kết thúc; vùng "Vừa ghi … — Sai? báo văn phòng". *Cần ADR:* sự kiện `CORRECTION` chỉ-thêm (mở suất mới / đóng suất cũ với `close_reason = CORRECTED`, lý do danh mục, chỉ văn phòng, trong khoảng kẹp, nhật ký trước→sau) — giữ nguyên tinh thần "chứng cứ cho mọi thời điểm" vì không ghi đè.

### 3.6 Kiểu B — Tin báo không tới đúng người

Cơ chế: danh sách sự kiện phát tin là **tập đóng viết tay** (`HANH_DONG_TIN_DON` `src/shared/thong-bao.ts:8`; `HANH_DONG_TIN_CHUYEN` `tin-chuyen.ts:177`), người nhận suy từ **ô quyền đọc** trong một hàm (`loaiCho` `tin-chuyen.ts:198-211`; `duocThayTinDon` `bang-tin.ts:151-155`); thêm sự kiện = sửa mã 3 chỗ + ADR (ADR-0052:210 xếp danh sách này vào cửa một chiều).

| Khoảng trống | Bằng chứng | Bản chất |
|---|---|---|
| Khách huỷ tại điểm không ai biết | `trip_passenger_cancelled_at_stop` (`dieu-phoi.ts:386`) không trong `HANH_DONG_TIN_CHUYEN`, chỉ ánh xạ `tien_do` làm mới màn (`tin-chuyen.ts:88`); ADR-0052 D6.1 `:148` liệt kê nguồn tin không có ca này | Khoảng trống thiết kế (danh sách đóng) |
| HDV đi kèm không biết giờ/điểm hẹn | `loaiCho` chỉ xét dòng LÁI, không xét `CREW`; `trip.view` của FIELD = `none` (`permissions.ts:169`); ADR-0052 D6.2 `:165` ghi là quyết định "đúng lời chủ Q1" — duyệt **trước** khi HDV thành CREW (ADR-0056:57) | Hai quyết định đúng riêng, ghép thành lỗ (M1) |
| Kế toán không có tin tiền | 8 route billing chỉ `baoThayDoi("tien"/…)` (`billing/index.ts:68-220`), không sinh hành động cho hộp/gõ cửa (`src/index.ts:87,97`); ADR-0025:71 "giả định bề mặt, đảo được" | Hoãn không mã nợ (M2) |
| (thêm) ADR-0062 "báo tin khi đơn đổi sau xác nhận" accepted 30/9 | view `v_aud_order_change` không có trong `migrations/`; `HANDOFF-N1.md:71` "Kế tiếp" | Đã duyệt chưa thi công = khoảng trống dưới mắt người dùng |
| (thêm) MQ-07 giờ hẹn đổi | tách "lát riêng" vì `order_leg_updated` không ghi chặng (`orders/repository.ts:1354`) | Hoãn |

**Khắc phục hệ thống:** một **ma trận sự kiện × vai** (hàng = mọi hành động nhóm order/trip/money trong `audit-actions.ts`, cột = 10 quyền; ô trống phải ghi "cố ý" hoặc mã nợ) do chủ duyệt thay cho ADR lẻ; tách luật "được báo" khỏi "được xem"; bài kiểm liệt kê: mọi hành động nhóm trên phải có mặt trong ma trận (bắt lỗi "vắng mặt").

### 3.7 Kiểu C — Dữ liệu bẩn lọt vào

| Điểm | Bằng chứng | Bản chất | Đã ghi hoãn ở đâu |
|---|---|---|---|
| SĐT sai độ dài | SĐT khách trên đơn dùng `PHONE_RE = /^\+?[0-9][0-9 .\-]{6,18}[0-9]$/` (`orders/rules.ts:90,113-116`), còn hồ sơ/người đặt dùng `normalizePhone` `^0\d{9}$` (`src/shared/phone.ts:3-8`); chép sang DTO tài xế (`chang-hanh-khach-repo.ts:581`) | Hai chuẩn một dữ liệu (M5), cố ý | `2026-09-21-n2-lat-1-khach-tren-don.md:120` |
| Hồ sơ khách trùng khi Thực tập/Đối tác lập đơn | `resolveBooker` nhánh `new` tạo hồ sơ **không tra trùng ở máy chủ** (`orders/service.ts:391-401`); tra trùng chỉ ở giao diện qua `GET /api/parties/lookup` cổng `office` + `party.view` (`parties/index.ts:525-526`) mà PARTNER/INTERN = `none` → 403 → `booker-picker.ts:65` "vẫn lưu đơn được" | **ADR-0001 §8 ↔ ADR-0014 đ5 mâu thuẫn**; ADR-0068:28 thừa nhận nguồn trùng, chỉ chặn ở Thêm tài khoản | Không có ADR "thay câu nào" |
| Hai đại lý trùng MST | `pty_organization.tax_code` chỉ CHECK độ dài (`0011_parties.sql:31`), không UNIQUE; máy chủ chỉ regex (`parties/rules.ts:194-197`) | Hoãn có chủ ý | Chỉ ở bản **nháp** `doi-chieu-oracle-tca.md:80` |
| Giá danh mục sai áp ngay | `parseCatalogSheet` chỉ kiểm chữ số ≤ MAX (`catalog/sheet.ts:20-24`); `syncGuard` chỉ chặn Sheet rỗng / ẩn > 50% (`catalog/rules.ts:54-60`); lưới bù: `catalog_changed` + cảnh báo Trang chủ (`home.ts:246`) | Chưa thấy quyết định; chưa ai hỏi | Không |

**Khắc phục hệ thống:** chuyển tra trùng người đặt vào **máy chủ** (`resolveBooker` tra theo SĐT, trả 409 kèm danh sách như ADR-0068 Đ9) — đúng Hiến chương 2.1; chủ chọn ADR nào thắng (0001 hay 0014); một nơi duy nhất cho "nợ đã hoãn" (BACKLOG có mã) + bài kiểm "mọi LỆCH/HOÃN trong specs phải có mã"; thêm bất biến `warn` cho các điểm hoãn (SĐT khác dạng, MST trùng, giá nhảy > X%) để "đạt" không còn là "sạch".

### 3.8 Kiểu D — Chữ và màn hình gây hiểu nhầm

- **Nút "Hỗ trợ" che nút khác:** `.tl-fab` cố định góc phải-dưới (`public/app.css:2656`, z-index 35); hàm né `nangTheoThanhDay` chỉ đo hai bộ chọn `.form-actions, .vc-bottom-bar` (`web/tro-ly.ts:329`); nút Kết thúc nằm trong `div.dp-run-end` (`cuoc-chuyen.ts:136`) không thuộc hai lớp đó → đè ở khổ 390. Lỗi thiết kế thành phần: né theo **danh sách đóng**.
- **Ngày không năm:** ba hàm nhân bản `dayMonth` (`web/format.ts:39-42`), `formatDm` (`src/shared/trip-form.ts:27`), `ngayNgan` (`tin-chuyen.ts:43`) + nhiều `slice(8,10)` tay; không luật thành văn ở `web/CLAUDE.md`.
- **Trang chủ đếm lẫn phạm vi:** `web/home.ts:84-86` tự ghi "ba ô là số TOÀN CÔNG TY … 'Doanh thu của tôi' chỉ đơn người xem"; máy chủ `draftCount/unassignedCount` toàn bảng (`orders/repository.ts:693-709`), `revenueWeek` theo `staff_id` (`:716-718`). Làm đúng bản vẽ 1.73 — lỗi **thiết kế màn** (không nhãn phạm vi).
- **"Câu báo sai tình huống":** không có mã lỗi cụ thể trong kho → chưa kiểm.

**Khắc phục hệ thống:** ba luật ngắn vào `web/CLAUDE.md` + bài kiểm thuần (ngày qua **một** hàm; số khác phạm vi phải mang nhãn; phần tử nổi khai vùng né hoặc mọi nút cuối trang dùng một lớp chung); bộ smoke Chrome "theo vai, khổ 390, cuộn tới cuối" (3 vai × 3 màn) vào cổng phát hành; kiểm thử khám phá theo vai thành bước định kỳ, **bản ghi lỗi đầy đủ lưu trong kho**.

---

## 4. Đối chiếu với 9 gốc đã chốt (R1–R9)

| Lỗi | Gốc cũ phủ được | Phần gốc cũ **không** phủ |
|---|---|---|
| VP-01 | R2 (bất biến tiền chỉ một lệnh, sổ thiếu lớp CSDL) | "Hai lệnh hợp lệ loại trừ nhau trên một dòng" — Đợt 2 (ADR-0092) theo chữ hiện hành **vẫn để hở** vì đ2 chỉ ràng SETTLEMENT, đ4 miễn "Công ty đã nhận" |
| Kiểu B | R4 (hình chiếu thiếu người nhận) | Nguyên nhân sinh: danh sách đóng + "báo = xem" + ADR-0062 duyệt chưa làm |
| Kiểu C (b) | R6 (bên đặt suy sai) một phần | Mâu thuẫn hai ADR đã duyệt, tra trùng đặt ở giao diện |
| HT-24, HT-01, Kiểu D | — | **M4**: không gốc nào trong R1–R9 nói về kiểm hình chiếu giao diện |
| HT-03, Kiểu A | — | **M3**: không gốc nào nói về sửa sai cho luật chỉ-đi-tiến |

Kết luận: chương trình khắc phục 8 đợt hiện tại **không tự khép** các lỗi mới này; cần thêm M1–M5 vào tài liệu gốc và một đợt riêng cho M3/M4.

---

## 5. Khắc phục mang tính hệ thống (không chỉ sửa từng lỗi)

1. **Trang ghép thêm hai mục** (đề xuất diff CLAUDE.md §9, chủ duyệt): (4) **cặp lệnh trên cùng đối tượng** — liệt kê mọi lệnh ghi chạm cùng một dòng/đối tượng, với từng cặp ghi "độc lập / loại trừ / có thứ tự"; (5) **một ngày của một vai** — với mỗi vai bị chạm, kể lại một ngày việc theo thứ tự màn hình, ghi rõ vai đó **thấy gì, được báo gì, sửa sai bằng gì**.
2. **Mã nợ cho mọi hoãn:** câu "lượt 1 chưa…", "giả định bề mặt đảo được", "LỆCH — HOÃN" trong ADR/spec phải kèm mã trong `docs/BACKLOG.md` (hoặc `quyen-hoan.json` nếu chạm tiền/quyền); bài kiểm quét chữ đó và đỏ khi thiếu mã.
3. **Luật lõi phải kèm đường sửa sai chỉ-thêm:** mẫu ADR thêm mục bắt buộc "Bấm nhầm thì sao" với một trong ba đáp án: nút hoàn tác (tiền lệ Q-GB-2), sự kiện điều chỉnh có lý do (tiền lệ ADR-0040), hoặc "cố ý không có, vì…".
4. **Kiểm giao diện vào cổng phát hành:** một bộ smoke Chrome theo vai (3 vai × 3 màn chính, khổ 390 và 1280, có ca nhảy ngày và cuộn tới cuối) chạy trong `npm run trien-khai` như e2e; hàm giao diện dùng chung (`nhomCuoc`, định dạng ngày) phải có ca "biên" (qua nửa đêm, năm khác).
5. **Bất biến nghiệp vụ, không chỉ hình thức:** `audit-invariants` thêm nhóm R-BIL về dấu/tổng số dư theo loại dòng; nhóm `warn` cho dữ liệu "đúng kiểu sai nghĩa"; sổ hàng rào ghi rõ mỗi bất biến bắt gì và **không** bắt gì.
6. **Một nguồn sự thật cho mỗi suy luận hiển thị:** máy chủ trả trạng thái đã hoà (ví dụ `choXacNhan` đã lọc theo số dư); giao diện không tự ghép hai mảng.

Thứ tự khuyến nghị: (a) VP-01 + bổ sung ADR-0092 (đang có hạn 31/10); (b) HT-24, HT-01, hộp xác nhận HT-03 — việc nhỏ không cần ADR, một phiên thi công; (c) ma trận sự kiện × vai + thi công ADR-0062; (d) ADR sửa sai chỉ-thêm cho chuyến; (e) mục 5.1, 5.2, 5.4 vào quy trình.

---

## 6. Cần chủ dự án quyết

1. **VP-01 vào sổ dừng dây chuyền** thế nào: mục riêng (khuyến nghị, hạn cùng TNV-G4 31/10, điều kiện đóng = test thứ tự ngược xanh + trigger quan sát chặn thật) hay gộp vào TNV-G4.
2. **Cách sửa VP-01:** (A) "Xác nhận đã nhận" bị 409 khi khoản đã nộp (đơn giản, giữ mô hình dòng đảo) — khuyến nghị; (B) "Xác nhận" tất toán **phần còn lại** (đổi dòng đảo thành dòng SETTLEMENT, thay đổi mô hình). Và duyệt điều bổ sung vào ADR-0092 nháp.
3. **Thứ tự bốn lỗi luật lõi chuyến:** khuyến nghị HT-01 (sắp lại điểm, cảnh báo) → HT-03 hộp xác nhận + cảnh báo ngày → ADR "sự kiện điều chỉnh có lý do" (gộp HT-03 hoàn tác, Kiểu A) → HT-04/HT-06 theo ADR đó. Hai câu phụ: "trả trước đón" có thành lý do **giữ** xuất bến không; chuyến chưa tới ngày có **chặn** xuất bến không hay chỉ Quản trị phá lệ.
4. **ADR-0001 §8 hay ADR-0014 đ5 thắng** về tra trùng hồ sơ khi Đối tác/Thực tập lập đơn (khuyến nghị: tra trùng ở máy chủ cho mọi vai, đúng Hiến chương 2.1; Đối tác chỉ thấy "đã có hồ sơ, dùng lại" không thấy chi tiết).
5. **Ba luật quy trình** ở mục 5.1–5.3 (đụng CLAUDE.md §9 và mẫu ADR) — AI chỉ đề xuất diff, chủ duyệt.

---

## 7. Phạm vi, bằng chứng, điều chưa kiểm

**Lệnh đo số liệu mục 2:** `ls docs/adr | wc -l`; ngày ADR theo dòng `- **Ngày:**` trong từng tệp; `ls migrations | wc -l`; `grep -n "^## TRẠNG THÁI TRIỂN KHAI" docs/HANDOFF-N1.md`; `find src -name '*.ts' ! -name '*.test.ts' | xargs cat | wc -l` (và biến thể cho test, `web/`); `tests/e2e/run.mjs:47`; `ls docs/evidence/**/*.mjs`. Lịch sử git là **bản nông** (218 commit từ 1/10) nên không tách được mốc thêm từng nút/route bằng git; dựa vào nhật ký thi công.

**Đã kiểm thật:** VP-01 chạy lại trên khung thử SQLite (tệp thử ở thư mục tạm của phiên, không đưa vào kho) — cả hai thứ tự bấm đều ra −1.000.000, bộ `R-BIL-*` 0 vi phạm. Kiểm kiểu và bộ kiểm chính của kho chạy tại `c27f47de`: xanh (không liên quan lỗi, chỉ xác nhận môi trường).

**Chỉ đọc mã, chưa chạy:** HT-24, HT-03, HT-01, kiểu A–D (không chạy trình duyệt, không chạy e2e). Ý định nguyên văn của chủ về "xuất bến chuyến chưa tới ngày": chưa có. "Câu báo sai tình huống": không có mã lỗi để truy. Dữ liệu production có cặp số dư âm nào do VP-01 chưa: chỉ kiểm được bằng SELECT chỉ-đọc trên D1 remote do chủ chạy.

**Chưa có người kiểm độc lập** đọc lại bản này (phiên này một vai: điều tra). Người tổng hợp đã đối chiếu bốn báo cáo thành phần với nhau và với tài liệu gốc R1–R9; chưa tự mở lại từng dòng mã được trích (bị chặn quyền đọc một số tệp giữa phiên), nên tệp:dòng ở mục 3 là của trợ lý điều tra — người thi công phải mở lại trước khi sửa.

---

## 8. Quyết định của chủ dự án (chat 2026-10-03)

Hai lời chủ trả lời các câu ở mục 6 (giữ nguyên văn, kể cả lỗi gõ):

> **Lời 1:** "1- A, 2-A, 3-ok theo khuyến nghị làm 1-2-3, 3a: … Rõ ràng là sai thì phải chặn, đồng thời cho cách khắc phục. 3b- ok vậy thì không phải là cho phá lệ mà ta đặt thêm nguyên tắc logic lọc. Không chấp nhận phá lệ, tất cả đều được luật hoá"

> **Lời 2:** "3a - theo khuyến nghị, 3b-ok cho 12 giờ, con số này có thể thay đổi trong bảng điều khiển của Super Admin (toàn quyền), 4- Máy chủ tự tra, yêu cầu là phải tránh việc trùng số điện thoại, vì tên người vẫn có thể trùng."

**Diễn giải** (người soạn V0 ghi, đối chiếu từng câu ở mục 6; chỗ nào lời chủ chưa nói thì không tự thêm):

| Câu ở mục 6 | Chủ chọn | Nghĩa áp dụng |
|---|---|---|
| 1 — VP-01 vào sổ dừng dây chuyền | **A** (mục riêng) | Mục riêng `TNV-VP01` trong `docs/quyen-hoan.json`. Mức HIGH, hạn **2026-10-31** (cùng hạn TNV-G4) và người chịu trách nhiệm "chủ dự án" **không** nằm trong lời chủ: lấy từ khuyến nghị đã hỏi ở §6 câu 1 ("hạn cùng TNV-G4 31/10") và giao việc của phiên V0 / lộ trình §2.1 — chủ xác nhận khi duyệt lượt V0-A. |
| 2 — Cách sửa VP-01 | **A** | Chặn lệnh tất toán thứ hai: một dòng giữ hộ (`HELD`) chỉ được tất toán **một lần**, bằng **một trong hai** đường ("Công ty đã nhận" hoặc "Đã nộp"). Lệnh thứ hai bị từ chối kèm câu chỉ đường. **Không đổi mô hình dòng** (dòng đảo HELD giữ nguyên; không đổi thành dòng quyết toán). Ghi vào ADR-0092 nháp thành Đ2b. |
| 3 — Thứ tự bốn lỗi luật lõi chuyến | **ok theo khuyến nghị, làm 1-2-3** | Thứ tự: **V1** (việc nhỏ không cần ADR: sắp lại điểm, hộp xác nhận, cảnh báo ngày) → **ADR** (luật thứ tự điểm + cửa sổ xuất bến; sự kiện điều chỉnh có lý do) → **V3** (thi công luật lõi). |
| 3a — "Trả trước đón" có thành lý do giữ xuất bến | **Chặn + cho cách khắc phục; theo khuyến nghị** | Luật **"mọi điểm đón của một suất đứng trước điểm trả của suất đó"**. Vi phạm ⇒ **chặn xuất bến** (lý do giữ). Cách khắc phục: máy **tự sắp lại khi xếp**; có **nút đổi thứ tự** để văn phòng sửa tay. |
| 3b — Chuyến chưa tới ngày có bị chặn xuất bến | **Luật lọc, không phá lệ; 12 giờ; Toàn quyền đổi được** | **Cửa sổ xuất bến 12 giờ** trước giờ khởi hành dự kiến. Là **chính sách có ngày hiệu lực**; **Toàn quyền** đổi con số ở bảng điều khiển. **Không có đường phá lệ** cho bất kỳ ai ("tất cả đều được luật hoá"). |
| 4 — ADR-0001 §8 hay ADR-0014 đ5 thắng | **Máy chủ tự tra; khoá là SĐT** | Máy chủ tra trùng theo **số điện thoại đã chuẩn hoá**, cho **mọi vai** lập đơn; đã có hồ sơ cùng số ⇒ **dùng lại**, không tạo hồ sơ thứ hai. Đối tác / Thực tập chỉ nhận thông điệp "đã có hồ sơ, dùng lại", **không** nhận chi tiết hồ sơ. Tên **không** là khoá (tên người có thể trùng). |
| 5 — Ba luật quy trình (5.1–5.3) | Chưa trả lời | Giữ chờ; V7 của lộ trình chưa mở. |

Nơi thi hành: lộ trình `docs/superpowers/plans/2026-10-03-khac-phuc-kiem-theo-vai-00-lo-trinh.md` (V0 soạn giấy tờ; V2, V3, V4 thi công). Văn bản trình duyệt của V0: `docs/superpowers/specs/2026-10-03-v0-luot-duyet/`.
