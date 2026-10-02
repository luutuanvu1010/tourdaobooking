# Phiếu duyệt độc lập — Lượt duyệt A (ADR-0088 + ADR-0089, nháp 2026-10-02)

- **Văn bản duyệt:** `docs/superpowers/specs/2026-10-02-luot-duyet-A-tien-sau-thu-nghiep-vu.md`, nhánh `worktree-quyet-dinh-thu-nghiep-vu` @ `968ecfdb`. Gọi tắt là **nháp**; `nháp:N` là dòng N của tệp đó.
- **Người duyệt:** trợ lý con, vai người duyệt độc lập, **chỉ đọc**. Không sửa tệp nào của kho, không chạy lệnh ghi, không gọi production.
- **Không duyệt thay chủ** (Hiến pháp N3). Mọi mục dưới đây chỉ là đề xuất.
- **Đã đọc:**
  - CLAUDE.md §2, §3, §7, §9, §10.
  - Các ADR: 0014 (điều 11), 0024, 0025, 0026, 0057 (Q7), 0079, 0080. Grep thêm ADR-0077, 0078, 0081.
  - Hiến chương `docs/ARCHITECTURE.md` Phần I, Điều 4–5 (đã duyệt).
  - Mã: `billing/{service,rules,repository,index}.ts`, `orders/hoan-tat.ts`, `orders/hoan-tat-repo.ts`, `migrations/0045`, `scripts/audit-checks.mjs`, `src/shared/{order-confirmation,permissions}.ts`, `web/order.ts`.
  - Kế hoạch sổ tiền lượt 1 §3.2.
  - Trang ghép lượt 2 §0.
  - `docs/quyen-hoan.json`.
  - Báo cáo `~/Documents/danh-gia-ux/2026-10-01/BAO-CAO.md` và kết quả chạy `kich-ban/*.ket-qua.jsonl` của các tình huống 09, 26, 30, 42, 49, HD06, HD08, KD03, KD06, KD07, KT01, KT02, KT04, KT05, KT06, KT09, KT10, QT05, DT04, DT05.
- **Chưa kiểm:**
  - Dữ liệu production. Mọi câu dưới đây về "dữ liệu đang có" đều là giả định, cần một lệnh chỉ đọc.
  - Không chạy test nào. Không cần, vì không có khẳng định nào phải chạy mã mới kiểm được.

---

## (A) Soát sự thật

| # | Khẳng định của nháp | Kết quả | Bằng chứng |
|---|---|---|---|
| A1 | Số 0088/0089 còn trống; 0086 bị bác; 0087 ở nhánh Giao diện công ty (nháp:7) | **Đúng** | `git log --all` trên `docs/adr/ADR-0086..0099*`: `06afe396` "ADR-0086 bị bác…", `a0118ece` "ADR-0087 Giao diện công ty (accepted)". Ngoài `968ecfdb`, không commit nào chạm ADR-0088 trở lên. |
| A2 | Lời chủ nguyên văn (nháp:17) | **Đúng** | BAO-CAO §9. |
| A3 | G3: Kế toán đảo được (201), ghi lại bị 409, vẫn Hoàn thành được (nháp:29–31) | **Đúng** | TH 30 (đơn 2), 49b, KD06 (cặp 2), DT05(c). |
| A4 | "còn lại 200.000–800.000đ" (nháp:31) | **Gần đúng** | TH 49b lệch 100.000 ("còn lại 100000"). Nên sửa thành **100.000–800.000đ**. |
| A5 | R-BIL-1 chỉ so tại mốc (`audit-checks.mjs:226-237`) (nháp:32) | **Đúng** | `audit-checks.mjs:231-235` lọc `r.created_at <= p.created_at`, so với `due_snapshot`. |
| A6 | KT06: "đã thu" −100.000, biên nhận đòi 300.000. Trigger `0045:210-216` chỉ chạy lúc hoàn (nháp:34) | **Đúng** | `0045:212-216`: `WHEN NEW.kind_code = 'CUSTOMER_REFUND' AND NEW.reverses_id IS NULL`. KT06 đơn 2. |
| A7 | KT04 nộp quá hoặc nộp khống làm sổ âm; KT05 điều chỉnh không trần, lý do 1 ký tự (nháp:35–36) | **Đúng** | `service.ts:361-397` không so với số đang giữ. `docLyDo` (`service.ts:316-322`) chỉ đòi chuỗi khác rỗng. `MAX_SO_TIEN` 10 tỷ (`service.ts:20`). |
| A8 | Kế hoạch §3.2 hiểu R-BIL-1 "tại mốc" (nháp:41) | **Đúng** | `plans/2026-09-29-so-tien-luot-1-ke-hoach.md:144`. |
| A9 | "Tính ròng… cùng hàm `conLai`/`hieuLuc`" (nháp:42) | **Đúng** | `rules.ts:47-51` (`hieuLuc`), `rules.ts:65-74` (`conLai`: thu − hoàn trên các lần còn hiệu lực). |
| A10 | Câu 409 "Sai sót thì Kế toán ghi điều chỉnh trong sổ" phải đổi (nháp:78) | **Đúng, thiếu phạm vi** | Câu ở `service.ts:218`. Cùng đuôi câu đó còn ở các route `/trip`, `/status`, handler-*, chặng, hành khách của `orders` và `dispatch` (TH 30, phần THONG BAO). Đổi một chỗ thì các chỗ kia vẫn chỉ sai đường. |
| A11 | Bảng "Thay câu nào", dòng 3: câu cũ "ADR-0025 / ADR-0026 về Đã giao: 'không ghi thêm lần thu'" (nháp:69) | **Sai nguồn** | Đây là câu báo của mã (`service.ts:218`), không phải chữ của ADR. Chữ thật ở ADR-0026 điều 10 (`ADR-0026:83`): "Sau 'Đã giao' không ai ghi lần thu mới trên đơn (chỉ Kế toán ghi phiếu điều chỉnh)", và tiêu chí nghiệm thu 4 (`ADR-0026:123`): "ghi lần thu sau 'Đã giao' → từ chối". |
| A12 | Danh sách tình huống G1: 09, 26, HD06, HD08, QT05, DT04, KT01 (nháp:93) | **Đúng gốc, khác danh sách báo cáo** | BAO-CAO dòng 69 ghi "09, 26, HD06, QT05, DT04, KD03, KT01". Dòng 64 nói HD08 cùng gốc. Nháp bỏ KD03, mà KD03 là đơn **trả dư** chưa huỷ, đúng loại vào danh sách "Cần hoàn" của đ3c. |
| A13 | "Đơn 200.000 thu cọc 50.000… còn lại 150.000" (nháp:93–94) | **Số minh hoạ** | Không khớp lần chạy nào. TH 09: 230.000 / 50.000 / 180.000. TH 26: 200.000 / 60.000 / 140.000. Nên ghi "ví dụ minh hoạ". |
| A14 | Nút "Ghi hoàn" chỉ hiện khi dư > 0 (`web/order.ts:567`) — đặt dưới tiêu đề "đã chạy thật" (nháp:92, 96) | **Đúng về mã, chưa chạy giao diện** | `web/order.ts:567`. TH 09 và 26 ghi rõ "đọc mã, chưa thử giao diện". |
| A15 | Gốc: `hoan-tat.ts:9-17,64` không đưa phải thu đơn huỷ về 0 (nháp:98) | **Đúng** | `phaiThuCua` (`hoan-tat.ts:9-18`) không xét `status`. Hàm này được `phaiThuNhieuDon` (`:64-68`) và `thongTinGiaoDon` (`:39`) gọi. |
| A16 | ADR-0026 đã hứa dấu "cần chú ý hoàn cọc" đọc từ sổ (nháp:99) | **Đúng** | `ADR-0026:43`. |
| A17 | "Giữ ADR-0026 điều 10: đơn huỷ vẫn ghi được lần thu" (nháp:103) | **Suy diễn, ADR không viết** | `ADR-0026:83` chỉ nói "ghi lần thu **trước 'Đã giao'**". Câu "đơn huỷ còn tiền phải có chỗ ghi" là chú thích mã ở `billing/repository.ts:159`. Hiện mã cho **mọi** vai có `payment.receive` ghi lên đơn huỷ (TH 26: Bán hàng ghi thêm 10.000 → 201). Đây là quyết định mới, phải viết thành quyết định (xem B14). |
| A18 | Trích `web/order.ts:420, 438, 534, 567`; `order-confirmation.ts:177, 220` (trang ghép §3) | **Đúng** | Nút "Đảo" (`:534`) hiện sau Đã giao nhưng **ẩn khi đã Hoàn thành** (`:453` có `!t.completedAt`). |
| A19 | Ô quyền ở trang ghép §2 | **Đúng** | `permissions.ts:103` (`payment.receive`), `:105` (`refund`), `:110` (`order.complete`), `:112` (`ledger.view`), `:114` (`ledger.write`). Nút "Ghi hoàn" ăn theo khối `keToan`, tức ô `ledger.write` (`billing/index.ts:31`, `service.ts:193`), không ăn theo `payment.refund`. Hôm nay hai ô trùng tập người nên chưa lệch. |
| A20 | Trang ghép §1: `order_money_adjustment` bị "0088 đ2 (đơn đã Đã giao)" chạm (nháp:141) | **Sai đối tượng** | Sau Đã giao, bảng này đã bị trigger chặn INSERT (`ADR-0025:66`, đ5). "Điều chỉnh" của KT05 và đ4c là **phiếu ADJUSTMENT + dòng nợ của `billing`** (`service.ts:504-521`). |
| A21 | Trang ghép §3: "Ghi nộp: không ràng số"; "Đảo lần thu đã bị hoàn: không chặn"; "Hoàn thành: kiểm người giữ tiền" | **Đúng** | `service.ts:361-397`; `:462-484`; `0045:245-255`. |
| A22 | Ô "Còn thiếu tiền" chỉ tính đơn `confirmed` chưa Đã giao | **Đúng** | `hoan-tat-repo.ts:65`. |
| A23 | "Cả hai ADR là hai chiều: không đổi schema một chiều" (nháp:172) | **Sai một phần** | Luật (trigger, mã) đảo được. Nhưng dòng sổ ghi theo lệnh mới là **chỉ-thêm**: chính ADR-0025:6 và ADR-0026:6 xếp loại dữ liệu này là "cửa một chiều". Phí huỷ (B1) và mã giao dịch (Q-A2) cần cột hoặc loại ghi mới. |
| A24 | "Lượt này có 2 quyết định" (nháp:9) | **Đếm lệch tiền lệ** | Trang ghép lượt 2 §0 (`2026-10-01-de-xuat-adr-so-tien-luot-2/trang-ghep.md:9-14`) đếm theo **quyết định con**. Đếm như vậy thì lượt A có khoảng 6 quyết định, xem B9. |
| A25 | R-BIL-8…11 còn trống | **Đúng** | R-BIL-12 đã dùng ở ADR-0078:102, R-BIL-13 ở ADR-0080:104, R-BIL-14 ở ADR-0079:98. Số 8–11 chưa ai dùng. |

---

## (B) Lỗ và đề xuất sửa

Xếp theo mức. **Phải sửa** = có đường mất tiền, mâu thuẫn nội bộ, trái ADR hoặc Hiến chương đã duyệt, hoặc trái luật quy trình chủ đã duyệt.

### Phải sửa

**B1. Phí huỷ không chạy được bằng "điều chỉnh" (0089 đ4, nháp:111; trang ghép §4, nháp:168).**
- **Lỗ:**
  - Lệnh điều chỉnh của sổ (`dieu_chinh`) chỉ chèn một **dòng nợ** (`service.ts:504-521`).
  - Số "chờ hoàn" là `du` của `conLai`, tính từ **lần thu** và **phải thu** (`rules.ts:65-74`). Ghi điều chỉnh không bao giờ làm số chờ hoàn giảm, nên dấu "cần hoàn" không bao giờ tắt (KT05 đã chứng minh: điều chỉnh xong, "đã thu" vẫn y nguyên).
  - Nếu chuyển sang tính phí huỷ vào phải thu thì lại trái đ1 ("phải thu đơn huỷ = 0") và R-BIL-11.
  - Nháp không dẫn **Hiến chương 5.9** (`ARCHITECTURE.md:107`, đã duyệt kèm lời chủ "phải trả khác / thu nhập khác"). Điều này nói: phần dư khi huỷ mặc định là "phải trả khác"; chuyển sang "thu nhập khác" phải bằng dòng sổ có lý do; **điều kiện và ô quyền quyết ở ADR sổ tiền**. Phí huỷ chính là áp 5.9.
- **Sửa:** viết lại 0089 đ4 thành **một loại ghi riêng**, chọn một trong hai cách và ghi rõ:
  - (i) Một loại lần thu mới "Giữ làm phí huỷ" (bảng tra cứu `bil_receipt_kind` là tập mở). Hàm `conLai` tính nó như một khoản đã chuyển thành thu nhập, nên chờ hoàn = đã thu ròng − phí giữ lại.
  - (ii) Một khoản "phí huỷ" cấp đơn được tính vào phải thu. Khi đó đ1 thành "phải thu đơn huỷ = phí huỷ đã ghi (mặc định 0)" và R-BIL-11 sửa theo.
  - Điều kiện chung cho cả hai cách:
    - số giữ lại ≤ đã thu ròng **đã xác nhận** (xem B6);
    - lý do bắt buộc;
    - người ghi là Kế toán hoặc Toàn quyền;
    - thông báo huỷ gửi khách hiện "Phí huỷ X — hoàn Y".
  - Bỏ gạch đầu của trang ghép §4 (`max(phải thu, đã thu ròng)`), vì không còn đi đường điều chỉnh.
  - Thêm 5.9 vào phần Hiến chương áp dụng.

**B2. Câu "khách chưa trả thì ghi dòng nợ phải thu khách" (0088 đ2b, nháp:45-49) mâu thuẫn đ2a và trái ADR đã duyệt.**
- **Mâu thuẫn nội bộ:** I1 đếm **lần thu**, không đếm dòng nợ. Ghi dòng nợ trên khách không làm I1 đúng lại, nên đ2a ("sao cho I1 vẫn đúng sau lô") không thoả.
- **Trái ADR-0025:**
  - H2 ghi "không ghi 'khách còn nợ'" (`ADR-0025:23`).
  - Phần phương án bị loại ghi "Cho 'Đã giao' khi còn thiếu và ghi 'khách còn nợ' — chủ bác" (`ADR-0025:87`).
  - Bảng "Thay câu nào" không có dòng nào cho hai câu này.
- **Thiếu dữ liệu:**
  - Dòng nợ đòi bên nợ là một hồ sơ, nhưng `orders.booker_party_id` để trống được (`migrations/0018:5`).
  - Với đơn của đối tác, bên đặt là **đại lý**, không phải khách.
- **Ca có thật:** KD06 cặp 2. Bán hàng ghi nhầm 800.000 vào đơn Y2, nên HDV không thu tiền khách Y2.
- **Sửa:** tách đ2b thành ba ca.
  - (i) **"Công ty thu – CK" do người khác khai, tiền không về** (DT05): **không đảo**. Dòng giữ hộ trên người khai vẫn còn, đúng H3 đã duyệt (`ADR-0026:69`), và Hoàn thành tự bị chặn (`0045:245-255`). Kế toán chỉ cần đường đòi người khai nộp.
  - (ii) **Ghi nhầm đơn, hình thức hoặc người thu, mà tiền có thật:** dùng "Thay lần thu" với người thu đúng.
  - (iii) **Khách thực sự chưa trả sau Đã giao:** đây là quyết định **ai chịu khoản thiếu** (người ghi nhầm, bên đặt, hay công ty xoá nợ). Nó chạm cả tiền lẫn con người, nên phải là **câu hỏi mới cho chủ (Q-A5, mục C)**, không để AI viết thành điều khoản.

**B3. Đ2c là câu chết, và không còn đường nào cho hoàn hoặc bồi thường sau Đã giao (nháp:50).**
- **Lỗ:**
  - Đ1 buộc I1 đúng mọi lúc sau Đã giao, nên dư luôn bằng 0. Câu "hoàn chỉ trong phạm vi trả dư" vì thế nghĩa là **cấm mọi lần hoàn sau Đã giao và sau Hoàn thành**.
  - Ca thật KT09: Kế toán hoàn 50.000 vì khách phàn nàn sau tour, máy trả 201. TH 30 đơn 1: hoàn sau Đã giao, 201.
  - Đơn đã khoá (`ADR-0025:64-66`), nên cũng không giảm được phải thu.
- **Sửa:**
  - Viết thẳng hệ quả: "sau Đã giao không ghi hoàn được".
  - Gộp vào Q-A5: có cho một loại ghi "giảm trừ sau Đã giao" (có lý do; Toàn quyền duyệt khi vượt ngưỡng) không. Nếu có, I1 thành "đã thu ròng = phải thu tại mốc − giảm trừ sau Đã giao", tính bằng **một** hàm.

**B4. Đ4b và R-BIL-9 sai chiều, và xung đột với sổ tiền lượt 2 đã duyệt (nháp:54, 59).**
- **Sai chiều:**
  - Trong mã, "trả" là **công ty trả bên đó** khoản công ty đang nợ họ, tức dòng bên đó → công ty (`service.ts:357-360, 389`).
  - "Trả ≤ số người đó đang giữ" là đặt trần ngược chiều.
- **Xung đột lượt 2:**
  - Số dư âm, tức công ty nợ bên đó, là chuyện bình thường. Ví dụ ADR-0080 D-1: "TĐ nợ A 120.000", "TĐ nợ A 790.000" (`ADR-0080:114-116`).
  - Số dư âm còn hợp lệ trong hai ca: nhân viên tự bỏ tiền ra hoàn cho khách; đảo một lần thu mà tiền giữ hộ của nó đã nộp rồi.
  - R-BIL-9 ("số dư đang giữ ≥ 0 trên từng cặp") sẽ đỏ ở những dữ liệu đúng này.
- **Trùng việc đã có:**
  - ADR-0080 điều 8 đã chốt "Không vượt… kiểm ở mã; kiểm định kỳ R-BIL-13" (`ADR-0080:76`).
  - R-BIL-13 (mức warn) là "không đổi dấu do dòng quyết toán" (`ADR-0080:104`).
- **Sửa:**
  - Đ4b đổi thành: "Dòng quyết toán (nộp, trả, bù trừ) không được làm số dư cặp (bên, công ty) trên đơn **đổi dấu**: nộp ≤ số bên đó đang nợ; trả ≤ số công ty đang nợ. CSDL chặn bằng trigger trên dòng quyết toán gốc, máy chủ kiểm trước."
  - **Bỏ R-BIL-9.** Nâng R-BIL-13 lên mức lỗi.
  - Thêm ADR-0080 điều 8 và R-BIL-13 vào bảng "Thay câu nào".
  - Phạm vi: chỉ dòng gắn đơn. Dòng gắn chuyến (ADR-0057) tính riêng.

**B5. Hai lớp chặn (Hiến chương 5.1) và cơ chế lô của "Thay lần thu" chưa có (nháp:51, 44, 53; trang ghép nháp:156, 160).**
- **Lỗ:**
  - Đ3 ghi rõ "chặn ở máy chủ", trang ghép §3 cũng chỉ ghi máy chủ. Hiến chương 5.1 (`ARCHITECTURE.md:91`) đòi luật "phải luôn đúng" có lớp CSDL **và** lớp mã.
  - Câu "đảo đơn lẻ trên đơn đã Đã giao bị chặn" không nói chặn ở lớp nào.
  - Câu "trigger kiểm I1 cuối lô" không thành hiện thực được: trigger SQLite chạy **theo từng dòng**, không biết lô đã chèn xong chưa.
  - **Rủi ro thứ tự lô:** nếu câu đảo lần thu cũ chạy **trước** câu ghi lần thu mới, trigger "đã thu ròng ≥ 0" của đ4a sẽ bắn vào trạng thái âm thoáng qua và chặn nhầm một lệnh Thay hợp lệ.
- **Sửa:**
  - (a) Đ3, lớp CSDL: thêm vào trigger `bil_posting_completed_settled` (`0045:245-255`) điều kiện so tổng lần thu còn hiệu lực với `due_snapshot` của phiếu DELIVERED. Trigger chỉ đọc bảng `bil_`, đúng ADR-0024 điều 5.
  - (b) Ghi rõ: "phải thu hiện hành của đơn đã Đã giao = `due_snapshot`". Đơn đã khoá theo ADR-0025 đ5, nên đây không phải đường tính thứ hai (Hiến chương 5.4, `ARCHITECTURE.md:97`).
  - (c) Thứ tự lô của "Thay lần thu":
    1. ghi các lần thu mới;
    2. đảo các lần thu cũ cùng dòng nợ của chúng;
    3. ghi một phiếu đánh dấu (loại mới), có trigger kiểm I1 với `due_snapshot`;
    4. ghi nhật ký với `changes() > 0`.
  - (d) Lệnh nhận **N lần thu cũ → M lần thu mới**, vì hay gặp hai lần thu một phần, hoặc người thu phải chia cho hai người.
  - (e) Muốn chặn đảo đơn lẻ ở lớp CSDL thì cần một dấu nối, ví dụ cột "thay cho" trên lần thu mới. Giao kế hoạch làm **spike** trước khi dựa vào, như ADR-0079 đ6 đã làm.
  - (f) Nếu không làm được lớp CSDL, ghi **lệch có chủ ý 5.1**, kèm lớp bù là R-BIL-1 mức lỗi, và chủ duyệt lệch đó.

**B6. Đơn huỷ có khoản "Công ty thu – CK" chưa xác nhận, hoặc có cọc cũ "chưa rõ người thu" (0089 đ1, đ3a).**
- **Lỗ:**
  - HD08 là đơn huỷ có 50.000 tiền mặt và 50.000 "Công ty thu – CK" **còn chờ xác nhận**.
  - Theo đ1, cả 100.000 thành "chờ hoàn". Biên nhận sẽ viết "công ty sẽ hoàn 100.000" trong khi 50.000 có thể chưa bao giờ về tài khoản. Nếu Kế toán làm theo, công ty mất tiền, giống cơ chế KT02.
  - Migration `0045:164-179` đã chuyển cọc cũ của **cả đơn đã huỷ** thành lần thu "chưa rõ".
  - Trước khi có sổ, hoàn cọc là việc làm **ngoài hệ thống** (`ADR-0014:113`). Một số đơn huỷ cũ có thể đã được hoàn rồi, nhưng khi ADR-0089 lên sẽ hiện "cần hoàn". **Chưa kiểm** số lượng trên production.
- **Sửa:**
  - (a) Số chờ hoàn tách hai phần:
    - "đã về công ty hoặc đang có người giữ";
    - "chờ Kế toán xác nhận đã nhận" hoặc "chưa rõ người giữ (cọc cũ)".
  - (b) Thông báo huỷ gửi khách chỉ hứa số tiền ở phần thứ nhất. Hoặc dùng câu trung tính: "Khoản đã thanh toán X sẽ được xử lý theo chính sách huỷ; Tour Đảo sẽ liên hệ".
  - (c) Trước khi phát hành, đưa chủ một lệnh **chỉ đọc** đếm đơn huỷ có cọc cũ. Kế toán xác minh từng đơn: đơn nào đã hoàn ngoài hệ thống thì ghi hoàn, kèm ghi chú, ngày phát sinh trong tháng đang mở.
  - (d) Dấu "cần hoàn" chỉ tắt khi **chờ hoàn = 0 VÀ không còn ai giữ tiền của đơn huỷ**. Đơn huỷ không bao giờ qua cổng Hoàn thành, nên không gì buộc HDV hay Bán hàng nộp lại tiền đã giữ.

**B7. Phần G4 còn sót hai đường mất tiền đã chạy thật.**
- **KT09:** ghi hoàn với người trả là người **không cầm tiền** của đơn → 201. Sổ ghi công ty nợ người đó 20.000, rồi có thể "trả" họ bằng tiền thật.
  - **Sửa:** thêm đ4d: "Hoàn với người trả không phải công ty: số hoàn ≤ số người đó đang giữ trên đơn. Ứng tiền túi thì phải ghi lý do riêng."
- **KT06 (phần đảo dòng):** đảo **dòng giữ hộ** trong khi lần thu sinh ra nó vẫn còn hiệu lực → 201. Kết quả: "Bán hàng thôi giữ 20.000 mà không ai xác nhận tiền đã về công ty".
  - **Sửa:** thêm đ4e: "Không đảo đơn lẻ dòng giữ hộ khi lần thu sinh ra nó còn hiệu lực. Muốn sửa thì đi đường đảo lần thu, 'Thay lần thu' hoặc 'Công ty đã nhận'."
- **Thêm vào phần Bối cảnh:** KT09, KT02 (đã có ở Q-A2) và KT10 (bộ kiểm báo xanh).

**B8. Bảng "Thay câu nào" thiếu các câu đã duyệt bị đổi.** Cần thêm:
- ADR-0025 điều 7 (`ADR-0025:70`, điều kiện Hoàn thành): thêm vế I1 (đ3).
- ADR-0025 điều 10 (`:73`) và ADR-0026 điều 8 (`ADR-0026:75`), vốn cho đảo sau Đã giao: nay đảo đơn lẻ bị chặn, chỉ còn "Thay lần thu".
- ADR-0026 điều 10 (`:83`) và tiêu chí nghiệm thu 4 (`:123`): chép **chữ thật** (A11). Nay Kế toán ghi được lần thu mới sau Đã giao qua lệnh Thay.
- ADR-0025 H2 và dòng phương án bị loại (`:23`, `:87`): chỉ thêm nếu giữ bất kỳ biến thể nào của "khách còn nợ" (B2).
- ADR-0080 điều 8 (`:76`) và R-BIL-13 (`:104`) (B4).
- ADR-0026 điều 11 (`:88`, danh sách trắng của biên nhận): thêm các trường "đã huỷ, cần hoàn, đã hoàn, phí huỷ".
- ADR-0025 điều 3d (`:53`) và ADR-0024 (orders công bố "phải thu hiện hành"): định nghĩa phải thu nay phụ thuộc trạng thái huỷ.
- ADR-0026 M2 (`:139`): câu trên màn đơn với đơn huỷ.
- **Cách ghi:** ADR-0026 đã ghi "Từ mốc này chỉ sửa dòng trạng thái" (`ADR-0026:3`). Vậy câu "Giữ chữ; ghi thêm 'xét mọi lúc'" (nháp:67) phải làm bằng **một dòng trỏ ở dòng trạng thái** ("điều 13, cách hiểu R-BIL-1 — ADR-0088"), như ADR-0079 và 0080 đã làm. Không sửa thân ADR-0026.

**B9. Quy trình: vượt trần 3 quyết định mỗi lượt, và thiếu dòng "xây trên lỗ đang hở".**
- **Trần 3:**
  - Theo cách đếm của lượt 2 (A24), lượt A gồm khoảng 6 quyết định:
    1. I1 mọi lúc + chặn Hoàn thành;
    2. lệnh "Thay lần thu" + chặn đảo đơn lẻ + cách ghi khi tiền không về;
    3. ràng buộc sổ không âm + trần điều chỉnh;
    4. phải thu đơn huỷ = 0;
    5. dấu ở ba nơi + route "Cần hoàn" + mẫu thông báo huỷ;
    6. phí huỷ.
  - Cộng thêm cột mã giao dịch của Q-A2. Như vậy vượt trần 3 của CLAUDE.md §9.
  - **Đề xuất tách:**
    - **A1** = ADR-0089 đ1–3 và đ5, đã sửa B6 (lõi đơn huỷ). Lỗ TNV-G1 có hạn **15/10** nên làm lượt này trước.
    - **A2** = ADR-0088 đ1–3 và đ5, cộng Q-A5.
    - **A3** = ADR-0088 đ4 (đã sửa B4, B7), cộng Q-A1, Q-A2 và phí huỷ (Q-A3).
- **Lỗ đang hở:**
  - Luật chủ duyệt ngày 24/9 (CLAUDE.md §3) đòi đặc tả chạm vùng đang hở phải ghi rõ "xây trên lỗ đang hở: <mã>".
  - ADR-0089 làm nút "Ghi hoàn" hiện thêm ở mọi đơn huỷ còn tiền. Trong khi đó **F-02** (gửi lặp lệnh hoàn và lệnh nộp, KT03, KT04) vẫn mở, mức HIGH (`docs/quyen-hoan.json`).
  - Phải thêm dòng "Xây trên lỗ đang hở: F-02", hoặc ghi rõ thứ tự thi công sau F-02.

**B10. Dữ liệu đang có và mức của các bất biến mới.**
- **Lỗ:**
  - Các kiểm R-BIL-1 (xét mọi lúc) và R-BIL-8 ở mức lỗi có thể **đỏ ngay** với dữ liệu production. Lý do: sổ tiền lượt 1 đã chạy, và báo cáo cho thấy hoàn sau Đã giao hay đảo sau Đã giao đi qua được. **Chưa kiểm** production.
  - Bước kiểm sau triển khai (`audit-invariants --db remote`) đỏ thì chặn phát hành.
  - Nháp không nói "Thay lần thu" có dùng được **sau Hoàn thành** hay không. Đó là cách duy nhất để sửa các đơn đã khép mà còn lệch, vì đơn Hoàn thành không mở lại (Q6).
- **Sửa:**
  - Theo khuôn ADR-0079 đ7a (`ADR-0079:64`): trước mốc phát hành chỉ cảnh báo kèm danh sách; sau mốc là lỗi.
  - Trước khi bật, đưa chủ lệnh chỉ đọc để đếm.
  - Ghi rõ: Thay lần thu dùng được cả sau Hoàn thành. Nếu lệnh tạo dòng giữ hộ trên một đơn đã khép thì chấp nhận: món nợ hiện ở "Sổ của tôi" của người đó và được nộp sau.

### Nên sửa

**B11. Trang ghép:**
- (a) Sửa dòng `order_money_adjustment` thành phiếu ADJUSTMENT của `billing` (A20).
- (b) §1, dòng `bil_debt_line`: nêu thêm các loại của lượt 2 (`HOA_HONG`, `GIAM_GIA_BEN_DAT`, `GIA_VON` — ADR-0079 đ2) và dòng gắn chuyến (ADR-0057). Ràng buộc mới ở đ4 sẽ áp lên các dòng đó.
- (c) §3 thêm các cửa còn thiếu:
  - đảo dòng nợ (B7);
  - hoàn với người trả là người khác công ty (B7);
  - ghi lần thu sau huỷ (B14);
  - hoàn sau Hoàn thành (B3);
  - xác nhận "Công ty đã nhận" trên đơn huỷ (B6).
- (d) Dải đ3b có "kèm người đang giữ tiền": tên người giữ chỉ hiện cho ô `ledger.view` phạm vi `any`. Đối tác có `money.view own` (`permissions.ts:75`), nên nếu không chặn sẽ thấy tên nhân viên đang giữ tiền.
- (e) Danh sách "Cần hoàn" chỉ cho `ledger.view any`. Câu "vai own chỉ thấy đơn mình" (nháp:151) lẫn hai nghĩa: `own` của `ledger.view` là **nợ của chính mình**, không phải "đơn mình lập".

**B12. Khoá kỳ (Hiến chương 5.14; ADR-0080 điều 5, `:68`):**
- Mọi dòng của "Thay lần thu", hoàn và phí huỷ mang **ngày phát sinh trong tháng đang mở**; ngày thật ghi vào ghi chú.
- Bảng kiểm trước khi khoá tháng (`ADR-0080:67`) thêm mục "đơn huỷ còn chờ hoàn hoặc còn người giữ tiền".
- Với lượt 2: nếu Thay lần thu đổi người thu từ đại lý (BOOKER) sang công ty, số dư của đại lý trên đơn đổi theo. Phiếu bù trừ đã ghi ở tháng đã khoá thì không đụng; chênh lệch được xử lý ở tháng đang mở.

**B13. Sổ vàng (Hiến chương 5.17, `ARCHITECTURE.md:123`):** ba luật tiền mới (Thay lần thu, chờ hoàn của đơn huỷ, phí huỷ) cần ca mẫu đúng đến từng đồng, do chủ hoặc Kế toán xác nhận. Nháp chưa nhắc.

**B14. Ai được ghi lần thu lên đơn đã huỷ** (A17):
- Hiện mọi vai có `payment.receive` đều ghi được, kể cả Đối tác và Thực tập.
- **Đề xuất:** sau khi huỷ, chỉ Kế toán và Toàn quyền ghi được (ca "khách chuyển khoản muộn" là việc Kế toán đối chiếu ngân hàng). Người khác nhận 409 kèm câu "Đơn đã huỷ — báo Kế toán nếu khách vừa chuyển tiền".
- Nếu chủ muốn giữ như hiện tại thì ghi thành quyết định rõ ràng.

**B15. Mốc tính ngày và cảnh báo N ngày (0089 đ3c, đ5):**
- Bảng `orders` **không có cột thời điểm huỷ** (đã grep `migrations/`). Kế hoạch phải chọn nguồn mốc.
- `audit-invariants` chỉ chạy lúc triển khai và lúc e2e, nên cảnh báo đặt ở đó không đến được Kế toán hằng ngày. Đưa cảnh báo vào danh sách "Cần hoàn" (xem Q-A4).

**B16. Bộ kiểm:**
- R-BIL-10 thừa: đã nằm trong R-BIL-1 xét mọi lúc, vì đơn Hoàn thành là tập con của đơn Đã giao.
- R-BIL-11 không phải bất biến dữ liệu: phải thu là số tính ra, không lưu, nên câu SQL chỉ kiểm lại một hằng của mã. Thay bằng bài test của hàm duy nhất cộng e2e.
- Câu đ4a "khi phần của nó đã bị hoàn" mơ hồ, vì lần hoàn không gắn với lần thu nào. Đổi thành: "đảo một lần thu không được làm đã thu ròng < 0".

**B17. "Thay lần thu" là công cụ xoá nợ mạnh như lệnh điều chỉnh:**
- Ví dụ: thay lần thu "HDV giữ" bằng "Công ty thu" do Kế toán ghi thì dòng giữ hộ biến mất.
- Cần cùng kiểm soát như Q-A1:
  - lý do;
  - nhật ký ghi số trước và sau;
  - người thu cũ và người thu mới đều nhận thông báo.

**B18. Mở "Thay lần thu" cho cả trước Đã giao.**
- KT06 đơn 3: số ghi nhầm 250 thay vì 200, đã hoàn 50. Muốn sửa 250 thành 200 thì đảo đơn lẻ sẽ làm đã thu âm, và đ4a buộc "đảo lần hoàn trước", trong khi lần hoàn đó có thật.
- Thay trong một lô giữ được tổng ≥ 0 suốt quá trình.

### Gợi ý

- **B19.** Đơn của đối tác (lượt 2, đại lý giữ cọc): thông báo huỷ không nên viết "công ty sẽ hoàn", vì người cầm tiền là đại lý.
- **B20.** Ghi vào sổ tồn đọng: KT08 cho thấy dấu "đã nhập phần mềm kế toán" không tự gỡ khi đơn huỷ. Nay phải thu của đơn huỷ về 0 nên lệch giữa app và phần mềm kế toán càng rõ. Ngoài phạm vi lượt này.
- **B21.** Hộp "Ghi hoàn" mặc định người trả là "Công ty" (`web/order.ts:572`). Với đơn huỷ đang có người giữ tiền mặt, nên mặc định là người đó, để tránh công ty trả hai lần.
- **B22.** Nêu Hiến chương áp dụng như ADR-0079/0080 đã làm: 4.2, 4.4, 5.1, 5.4, 5.7, 5.9, 5.14, 5.17.
- **B23.** Ghi rõ đơn đã Đã giao không huỷ được (ADR-0025 đ1), nên ADR-0089 chỉ áp cho đơn chưa từng Đã giao. Ca "tour không diễn ra sau Đã giao" thuộc Q-A5.
- **B24.** Kịch bản thử đang nằm ngoài kho. Chép vào `tests/e2e/` và bỏ dữ liệu thật trước khi dùng làm bài đỏ trước, xanh sau.
- **B25.** Mục A13, A14: đổi nhãn thành "ví dụ minh hoạ" và "đọc mã, chưa chạy giao diện".

---

## (C) Trả lời câu hỏi mở

### Q-A1 — Trần điều chỉnh
- **Đề xuất:** không lấy "≤ phải thu" làm chốt chính. Tách theo chiều:
  1. **Điều chỉnh làm giảm nợ** của một bên với công ty: ≤ số bên đó **đang nợ trên đơn đó**, không được làm đổi dấu.
  2. **Điều chỉnh làm tăng nợ:** ≤ max(phải thu, đã thu ròng) của đơn. Mục đích là chặn gõ thừa số 0, như ca 5 tỷ.
  3. Lý do ≥ 10 ký tự. Rẻ, nhưng biết trước là dễ lách.
  4. **Người bị đổi số dư nhận một thông báo**; nhật ký ghi số trước và sau.
  5. Lượt này **không** làm luồng duyệt hai người.
- **Lý do:**
  - Hành vi mất tiền thật trong KT05 là xoá 80.000–100.000 nợ của người đang giữ tiền mặt, trên một đơn 200.000, với lý do ".". Hành vi này **lọt** trần "≤ phải thu".
  - Trần theo số dư chặn đúng chỗ tiền biến mất.
  - Báo cho người bị ảnh hưởng là kiểm soát rẻ nhất cho công ty 30 người: ai bị xoá hoặc bị gán nợ sẽ tự lên tiếng.
  - Hiến chương 4.2 (`ARCHITECTURE.md:81`) nói sổ được sinh từ sự kiện, không nhập tay. Điều chỉnh là ngoại lệ nên phải hẹp.
- **Các phương án khác và cái giá:**
  - (a) Bản gốc "≤ phải thu, lý do ≥ 10": đơn giản, chặn được ca 5 tỷ. **Không** chặn xoá nợ nhỏ. Làm phí huỷ của đơn huỷ không ghi được vì trần bằng 0 (chính nháp đã thấy ở §4).
  - (b) Số tuyệt đối, ví dụ 5 triệu: chặn gõ nhầm lớn. Không chặn xoá nợ trên đơn thường (phần lớn đơn từ 200.000 đến vài triệu). Có thể chặn nhầm đơn đoàn lớn. Phải có người giữ con số này.
  - (c) Toàn quyền duyệt mọi điều chỉnh: kiểm soát mạnh nhất, đúng tách nhiệm vụ (G7, KT07). Nhưng phải xây trạng thái "chờ duyệt" và màn duyệt, hoặc chủ tự bấm, thành nút thắt cổ chai.
- **Nên đổi ý khi:** điều chỉnh giảm nợ xảy ra hơn vài lần mỗi tháng, hoặc chỉ một Kế toán làm mọi khâu (KT07 đã cho thấy tự ghi thu rồi tự ghi nộp). Khi đó chuyển sang (c) cho điều chỉnh giảm nợ vượt ngưỡng, ngưỡng do chủ đặt.

### Q-A2 — Mã giao dịch ngân hàng (KT02)
- **Đề xuất:** **có**.
  - Thêm một ô "mã giao dịch ngân hàng" riêng trên lần thu chuyển khoản. Không bắt buộc khi khai; Kế toán điền hoặc sửa lúc bấm "Công ty đã nhận".
  - Ô này được **miễn** luật chặn chuỗi ≥ 8 chữ số. Luật đó đang áp cho ghi chú (`service.ts:94`) và lý do (`service.ts:320`), và chỉ miễn cho ô này.
  - **Cảnh báo, không chặn** khi trùng mã với một lần thu khác còn hiệu lực. Kế toán bấm "vẫn xác nhận" kèm lý do.
  - **Không** đặt ràng buộc duy nhất, vì một lần chuyển khoản có thể trả cho hai đơn.
- **Lý do:**
  - KT02: hai người khai cùng một khoản 100.000, cả hai được xác nhận, máy nhắc "Ghi hoàn", công ty mất 100.000.
  - Mã giao dịch là chứng cứ đối chiếu duy nhất có trong tay.
  - ADR-0080 điều 8 (`:77`) đã giả định "số chứng từ ngân hàng ghi ở ghi chú", nhưng luật chặn số đang chặn đúng việc đó (KT02: ghi chú "mã GD FT26…" → 400). Phải thêm ADR-0080 điều 8 vào bảng "Thay câu nào".
- **Phương án khác và cái giá:**
  - (b) Không thêm cột. Màn xác nhận liệt kê "các khoản chuyển khoản cùng số tiền, cùng ngày, ở đơn khác". Rẻ, không đổi dữ liệu. Nhưng là dò đoán, sót khi khác ngày, báo nhầm khi trùng số tiền.
  - (c) Ràng buộc duy nhất: sai nghiệp vụ.
- **Lưu ý:**
  - Đây là một **quyết định dữ liệu**, tức cột mới trên bảng chỉ-thêm, nên tính vào trần 3 (B9).
  - "Hai chiều" chỉ đúng cho phần mã. Dữ liệu đã ghi ở lại.
- **Nên đổi ý khi:** mỗi ngày ít khoản chuyển khoản và Kế toán luôn đối chiếu sao kê ngoài app. Khi đó (b) là đủ.

### Q-A3 — Phí huỷ
- **Sự thật đã tra:**
  - Đã grep `docs/` với các từ "phí huỷ / giữ cọc / huỷ muộn / hoàn cọc / mất cọc / chính sách huỷ / thu nhập khác". Kho **không có** chính sách giữ cọc của khách khi huỷ.
  - Chỉ có ba nguồn liên quan:
    - **Hiến chương 5.9** (`ARCHITECTURE.md:107`) và lời chủ (`docs/HANDOFF-2026-09-25-BOOKING-VA-HIEN-CHUONG.md:79`): "Có thể đưa vào thu nhập khác hoặc phải trả khác (theo góc độ kế toán)". Mặc định là "phải trả khác"; chuyển sang thu nhập khác bằng dòng sổ có lý do. Điều kiện và người được làm do ADR sổ tiền quyết, và **chưa ADR nào quyết**.
    - **Tiền lệ phía nhà xe**, ADR-0057 Q7 (`ADR-0057:14`, `:40`): chủ chọn "phí huỷ ghi tay trước, bảng mốc huỷ làm sau".
    - ADR-0014 điều 11 (`:113`): trước khi có sổ, hoàn cọc làm ngoài hệ thống. Văn bản không nói có giữ cọc hay không.
- **Đề xuất:**
  1. **Hỏi chủ thực tế công ty đang làm:**
     - có giữ cọc khi khách huỷ không;
     - mốc bao nhiêu ngày trước ngày đi;
     - có khác nhau theo dịch vụ hay nhà cung cấp không (vé không hoàn của bên thứ ba);
     - ai thoả thuận với khách;
     - khách có được báo điều kiện huỷ trước không (ví dụ ghi trên biên nhận).
  2. **Nếu có giữ cọc:**
     - lượt này **ghi tay** bằng loại ghi riêng ở B1 (không dùng điều chỉnh);
     - Kế toán ghi, kèm lý do;
     - số giữ ≤ đã thu đã xác nhận;
     - hiện trên thông báo huỷ.
     - Bảng mốc tự tính để ADR sau, theo dữ liệu có ngày hiệu lực (Hiến chương 5.2).
  3. **Nếu không giữ cọc:** bỏ đ4 khỏi ADR-0089. Bớt được một quyết định, dễ vào trần 3.
- **Cái giá:**
  - Ghi tay thì mỗi nhân viên áp một kiểu, phải dựa vào kỷ luật.
  - Tự tính ngay thì phải có chính sách theo ngày, kèm thêm bảng và màn hình. Quá sớm khi chưa biết thực tế.
- **Nên đổi ý khi:** số đơn huỷ có cọc mỗi tháng nhiều, hoặc có tranh chấp với khách về số giữ lại. Khi đó làm bảng mốc.

### Q-A4 — Mốc nhắc "chờ hoàn quá N ngày"
- **Đề xuất:** **7 ngày lịch**, kèm hai sửa:
  - (a) Nhắc ở **danh sách "Cần hoàn"** (tô màu, sắp theo số ngày) và bằng thông báo trong app cho Kế toán. Không chỉ ở `audit-invariants`, vì công cụ đó chỉ chạy lúc triển khai và lúc e2e.
  - (b) Định nghĩa mốc tính:
    - **đơn huỷ:** tính từ ngày huỷ. Bảng `orders` không có cột này, nên kế hoạch chọn nguồn: dòng nhật ký huỷ, hoặc ngày phát sinh của lần thu muộn nhất nếu khách chuyển sau khi huỷ;
    - **đơn trả dư chưa huỷ:** tính từ ngày đi, vì đơn trả dư bị giữ ở bước Đã giao nên tự lộ đúng ngày đó.
- **Lý do:**
  - Công ty nhỏ đối soát theo tuần. Chuyển khoản hoàn chỉ mất vài ngày.
  - 7 ngày đủ để không nhắc ồn, và chắc chắn báo trước khi khoá tháng (ADR-0080).
- **Phương án khác:**
  - 3 ngày: nhắc nhiều, dễ bị lờ đi.
  - 15–30 ngày: trễ, có thể vượt kỳ khoá sổ.
- **Nên đổi ý khi:** công ty đã cam kết với khách "hoàn trong X ngày". Khi đó đặt N nhỏ hơn X vài ngày.

### Q-A5 (đề xuất câu mới — chủ phải trả lời trước khi chốt đ2b và đ2c)
**Câu hỏi:** sau "Đã giao", (a) khách **thực sự chưa trả** vì lần thu trước đó ghi nhầm, hoặc (b) công ty cần **hoàn hoặc bồi thường** cho khách (ví dụ khách phàn nàn sau tour). Sổ ghi thế nào?

- **Đã có sẵn, không cần hỏi:** khoản "Công ty thu – CK" do người khác khai mà Kế toán chưa xác nhận thì vẫn là nợ của người khai (H3, `ADR-0026:31, :69`). Đây đúng là ca DT05 (B2-i). H3 **chỉ** phủ ca này. Nó **không** phủ ca "người ghi nhầm đơn" như KD06 cặp 2, nơi Bán hàng có thu thật nhưng của khách khác.
- **(A, khuyến nghị — trung tính, chưa gán ai chịu):**
  - Với (a) khi khách thật sự chưa trả: ghi một loại ghi riêng **"phải đòi sau Đã giao"**, giữ I1, ghi rõ ai chịu trách nhiệm đòi. Đơn vào danh sách "phải đòi" của Kế toán. Khi khách trả, ghi lần thu thay cho khoản đó. Khi không đòi được, Toàn quyền chuyển thành **"thất thu"**, có lý do.
  - **Ai chịu khoản mất khi không đòi được** (công ty, người ghi nhầm hay đại lý) là quyết định **tiền và nhân sự của chủ**. Phiếu này **không** đề xuất mặc định đẩy khoản thiếu sang nhân viên.
  - Với (b): thêm một loại ghi **"giảm trừ sau Đã giao"**, có lý do, Kế toán ghi, Toàn quyền duyệt khi vượt ngưỡng, rồi ghi hoàn. I1 khi đó so với "phải thu tại mốc − giảm trừ (− phải đòi đã thất thu)", tính bằng một hàm.
  - Cái giá: thêm một đến hai loại dữ liệu, tức thêm quyết định, phải tính vào trần 3 (B9).
- **Phương án khác — (A'):** khoản thiếu mặc định nằm trên người đã ghi nhầm, dưới dạng tiền giữ hộ; người đó đòi khách rồi nộp về.
  - Dùng lại cơ chế sẵn có, không thêm loại dữ liệu.
  - Nhưng đây là chính sách để nhân viên gánh rủi ro, H3 không phủ. Cần chủ chọn có ý thức, kèm quy chế nhân sự.
- **(B):** ghi "khách còn nợ" trên bên đặt.
  - Đảo ngược điều chủ đã bác ở H2.
  - Cần hồ sơ khách; đơn đối tác thì bên đặt là đại lý.
- **(C):** không có đường trong app; mọi khoản như vậy làm ngoài hệ thống.
  - Trái Hiến chương 4.2.
  - Biên nhận và sổ ghi sai sự thật.

---

## (D) Kết luận tổng

**Chưa nên duyệt bản này. Sửa và hỏi thêm rồi trình lại.**
- Nguyên tắc chủ đã chọn (I1 luôn luôn; đơn huỷ về 0; dấu ở ba nơi) **đúng hướng** và có bằng chứng chạy thật.
- Nhưng văn bản còn **ba chỗ không chạy được hoặc tự mâu thuẫn**: B1, B2, B3.
- Có **một chỗ mâu thuẫn với ADR-0080 đã duyệt**: B4.
- Có **hai chỗ thiếu lớp CSDL** theo Hiến chương 5.1: B5.
- Có **một đường mất tiền mới** do chính điều khoản mở ra: B6.
- Ba chỗ cần **câu trả lời mới của chủ**: Q-A5, thực tế phí huỷ (Q-A3), và việc tách lượt (B9).

**Danh sách sửa, theo mức quan trọng:**
1. **B1** — Phí huỷ: viết lại thành loại ghi riêng, dẫn Hiến chương 5.9.
2. **B2** — Tách đ2b làm ba ca; bỏ "dòng nợ phải thu khách"; thêm Q-A5.
3. **B6** — Tách phần chờ hoàn đã xác nhận và chưa xác nhận, cọc cũ; thông báo huỷ không hứa tiền chưa về; xử lý đơn huỷ cũ trước khi phát hành.
4. **B3** — Nói thẳng hệ quả của đ2c; gộp vào Q-A5.
5. **B4** — Đ4b đổi thành "quyết toán không đổi dấu"; bỏ R-BIL-9; nâng R-BIL-13; ghi ADR-0080 điều 8 vào bảng "Thay câu nào".
6. **B5** — Lớp CSDL cho đ3 và cho lệnh Thay; thứ tự lô; lệnh nhận N → M lần thu; làm spike.
7. **B7** — Thêm đ4d (người trả hoàn) và đ4e (đảo dòng giữ hộ).
8. **B10** — Cảnh báo trước mốc, lỗi sau mốc; đếm chỉ đọc trước khi bật; Thay dùng được sau Hoàn thành.
9. **B8** — Bổ sung bảng "Thay câu nào"; trỏ từ dòng trạng thái của ADR-0026.
10. **B9** — Tách lượt (A1 đơn huỷ đi trước cho kịp hạn 15/10); thêm dòng "xây trên lỗ đang hở: F-02".
11. Các mục nên sửa: B11–B18.
12. Các mục gợi ý: B19–B25.

---

## (E) Gửi chủ dự án (lời thường)

Hướng anh chọn là đúng, nhưng bản viết chưa nên duyệt. Ba chỗ làm theo sẽ không chạy:

- "Giữ cọc làm phí huỷ" không làm số "cần hoàn" giảm.
- Khi khách chưa trả sau chuyến, văn bản đưa lại kiểu "khách còn nợ" mà anh từng bác.
- Sau chuyến sẽ không hoàn hay bồi thường cho khách được nữa.

Ngoài ra, giấy báo huỷ có thể hứa hoàn cả khoản chuyển khoản chưa chắc đã về. Đơn huỷ cũ có thể đã hoàn tay từ trước.

Em cần anh trả lời hai câu:

1. Công ty có giữ cọc khi khách huỷ không, theo mốc nào?
2. Khách chưa trả sau chuyến thì ai chịu?

Khuyến nghị: tách phần đơn huỷ ra duyệt trước cho kịp hạn 15/10.
