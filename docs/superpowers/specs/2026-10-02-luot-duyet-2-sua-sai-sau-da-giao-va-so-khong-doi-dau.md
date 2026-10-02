# Lượt duyệt 2 — ADR-0088 sửa sai sau "Đã giao" (I1 đúng mọi lúc) + ADR-0092 sổ không đổi dấu, điều chỉnh có kiểm soát, phí huỷ

> **Trạng thái:** **NHÁP bản 2, chờ chủ dự án duyệt văn bản và trả lời Q-A1, Q-A2, Q-A3, Q-A5.**
> - Chủ đã chọn nguyên tắc ngày 2026-10-02 (câu 2 "Luôn luôn").
> - Bản 1 bị người duyệt độc lập kết luận "chưa nên duyệt" (`2026-10-02-phieu-duyet-doc-lap-luot-A-tien.md`). Bản này sửa theo phiếu; mã sửa ghi trong ngoặc.
>
> **Hạn:** TNV-G3, TNV-G4, F-03 hạn **31/10** (`docs/quyen-hoan.json`).
>
> **Bước ghép:**
> - Đếm theo **quyết định con** (cách phiếu A dùng, A24), hai ADR gộp lại có khoảng 6 quyết định, vượt trần 3 của CLAUDE.md §9.
> - Vì vậy lượt này **duyệt làm hai lần**:
>   - **2a** = ADR-0088: I1 mọi lúc, lệnh Thay, Q-A5;
>   - **2b** = ADR-0092: sổ không đổi dấu và điều chỉnh, mã giao dịch, phí huỷ.
> - Hai lần dùng chung một trang ghép ở cuối tệp, vì chạm cùng bảng. Lượt 1 (0089, 0090) duyệt và thi công trước.
>
> **Xây trên lỗ đang hở: F-02.**
> - Lệnh "Thay lần thu" và các lệnh nộp, hoàn phải có **khoá lần gửi ngay từ đầu**.
> - KT03 và KT04 cho thấy hoàn và nộp gửi lặp đều ra hai dòng.
>
> **Số dòng mã** trích theo `968ecfdb`.

## Lời chủ dự án (nguyên văn, chat 2026-10-02)

> "2 - Luôn luôn"

Câu đã hỏi: "Bất biến 'đã thu = phải thu' xét tại mốc Đã giao (như mã và bộ kiểm hiện nay), hay luôn luôn (như chữ ADR)?"

---

## ADR-0088 — Đơn đã "Đã giao": đã thu ròng = phải thu tại mốc, **mọi lúc**; sửa sai bằng lệnh "Thay lần thu"

### Bối cảnh (đã chạy thật, đã chạy lại)
- **G3** (tình huống 30, 49, KD06, DT05):
  - Lần thu ghi nhầm làm sổ báo đủ, nên HDV bấm Đã giao.
  - Kế toán đảo lần thu nhầm được (201), nhưng ghi lại lần thu đúng bị chặn (409, `service.ts:218`).
  - Hoàn thành vẫn được, với "còn lại" 100.000–800.000.
  - `audit-invariants` xanh vì R-BIL-1 chỉ so tại mốc (`audit-checks.mjs:231-235`, kế hoạch sổ tiền lượt 1 `:144`).
- **Chữ ADR-0026 đ13** (R-BIL-1, I1): "đơn đã 'Đã giao': tổng lần thu còn hiệu lực = phải thu hiện hành". Chủ chọn đọc là **mọi lúc**.

### Quyết định
1. **I1 xét mọi lúc sau mốc Đã giao.**
   - Phải thu hiện hành của đơn đã Đã giao = **`due_snapshot` của phiếu DELIVERED** (A-B5b). Đơn đã khoá (ADR-0025 đ5), nên đây không phải đường tính thứ hai (Hiến chương 5.4).
   - Đã thu ròng tính bằng `conLai` / `hieuLuc` (`billing/rules.ts:47-74`): thu trừ hoàn, trên các lần còn hiệu lực.
2. **Lệnh "Thay lần thu"** (Kế toán, Toàn quyền; ô `ledger.write`, không thêm mã quyền).
   - **Nhận N lần thu cũ → M lần thu mới** trong **một lô ghi**, vì hay gặp hai lần thu một phần (A-B5d). Thứ tự lô (A-B5c):
     1. ghi các lần thu mới;
     2. đảo các lần thu cũ cùng dòng nợ của chúng;
     3. ghi một **phiếu đánh dấu** (loại phiếu mới) có trigger kiểm I1 với `due_snapshot`;
     4. ghi nhật ký với `changes() > 0`.
   - Thứ tự này tránh trạng thái âm thoáng qua làm trigger "đã thu ròng ≥ 0" (ADR-0092 đ1) chặn nhầm.
   - Dùng được **trước Đã giao** (A-B18, KT06 đơn 3) và **sau Hoàn thành** (A-B10). Với đơn đã khép, món nợ mới, nếu có, hiện ở "Sổ của tôi" của người đó.
   - **Kiểm soát** (A-B17), vì đây là công cụ mạnh:
     - lý do ≥ 10 ký tự;
     - nhật ký ghi số trước và sau;
     - **người thu cũ và người thu mới đều nhận tin**;
     - ngày phát sinh trong tháng đang mở, ngày thật ghi ở ghi chú (Hiến chương 5.14, A-B12).
3. **Đảo đơn lẻ một lần thu trên đơn đã Đã giao bị chặn**, ở máy chủ và ở CSDL nếu được (đ6). Câu báo chỉ đường "Dùng 'Thay lần thu'".
4. **Các ca sửa sai sau Đã giao** (A-B2; ca (iv) theo phiếu kiểm bản 2):
   - **(i) "Công ty thu – CK" do người khác khai, tiền không về** (DT05): **không đảo**.
     - Dòng giữ hộ trên người khai còn nguyên, đúng H3 đã duyệt (ADR-0026 `:30`, `:69`).
     - Hoàn thành tự bị chặn (`0045:245-255`) tới khi người khai nộp.
     - Kế toán đòi người khai.
   - **(ii) Ghi nhầm đơn, hình thức hoặc người thu, mà tiền có thật** (KD06): dùng "Thay lần thu" với người thu đúng.
   - **(iii) Khách thực sự chưa trả, hoặc công ty cần hoàn hay bồi thường sau Đã giao** (KT09, khách phàn nàn sau tour): **chủ quyết ở Q-A5.** AI không viết thành điều khoản, vì đây là quyết định ai chịu tiền.
   - **(iv) Luật tạm cho lần hoàn sau Đã giao** (phiếu kiểm bản 2, M1). Hôm nay mã cho hoàn sau Đã giao (KT09 → 201), mà I1 xét mọi lúc sẽ coi đó là lệch. Vì vậy:
     - nếu chủ chọn **Q-A5 (A)**: hoàn sau Đã giao **chỉ** đi kèm một dòng "giảm trừ sau Đã giao" trong cùng lô, và hai thứ thi công cùng đợt;
     - nếu chủ chọn phương án khác, hoặc chưa trả lời: **hoàn sau Đã giao bị chặn** (409 "Đơn đã Đã giao — hoàn cho khách cần ghi 'giảm trừ' trước; báo Toàn quyền") cho tới khi có đường ghi.
     
     Không để mức lỗi của R-BIL-1 bật trước khi có một trong hai cách trên.
5. **Hoàn thành bị chặn khi I1 lệch**, ở hai lớp (Hiến chương 5.1, A-B5a):
   - máy chủ kiểm trước;
   - trigger `bil_posting_completed_settled` (`0045:245-255`) thêm điều kiện so tổng lần thu còn hiệu lực với `due_snapshot`. Trigger chỉ đọc bảng `bil_`, đúng ADR-0024 đ5.
6. **Spike lớp CSDL cho đ3** (A-B5e): cần một dấu nối "thay cho" trên lần thu mới để trigger phân biệt đảo đơn lẻ với đảo trong lô Thay.
   - Kế hoạch làm spike trước, như ADR-0079 đ6.
   - Không làm được thì ghi **lệch có chủ ý Hiến chương 5.1**, kèm lớp bù là R-BIL-1 mức lỗi. Chủ duyệt lệch đó.
7. **Bộ kiểm** (A-B10, A-B16):
   - R-BIL-1 chạy theo đ1;
   - **trước mốc phát hành chỉ cảnh báo kèm danh sách, sau mốc là lỗi** (khuôn ADR-0079 đ7a);
   - trước khi bật, chủ chạy lệnh **chỉ đọc** (AI soạn) đếm đơn đang lệch trên dữ liệu thật, rồi Kế toán sửa bằng lệnh Thay;
   - không dùng R-BIL-10 (bản 1 từng đề xuất; trùng với R-BIL-1 xét mọi lúc).
8. **Câu báo** "Sai sót thì Kế toán ghi điều chỉnh trong sổ" ở `service.ts:218` **và mọi route** của `orders` / `dispatch` dùng cùng đuôi câu (A-A10) đổi thành "… Kế toán dùng 'Thay lần thu'".

### Thay câu nào (dòng trỏ ở dòng trạng thái ADR cũ, không sửa thân)
| Văn bản | Câu cũ (chữ thật) | Thay bằng |
|---|---|---|
| ADR-0026 đ13, R-BIL-1 | (chữ giữ nguyên) | trỏ: "xét mọi lúc, phải thu = `due_snapshot` — ADR-0088 đ1" |
| Kế hoạch sổ tiền lượt 1 `:144` | so "tại mốc" | bỏ (đ1) |
| ADR-0026 đ10 (`:83`) và tiêu chí nghiệm thu 4 (`:123`) | "Sau 'Đã giao' không ai ghi lần thu mới trên đơn (chỉ Kế toán ghi phiếu điều chỉnh)"; "ghi lần thu sau 'Đã giao' → từ chối" | Kế toán và Toàn quyền ghi lần thu mới **chỉ qua lệnh Thay** (đ2). Người khác vẫn bị từ chối |
| ADR-0025 đ7 (`:70`, điều kiện Hoàn thành) | kiểm người giữ tiền | + I1 (đ5) |
| ADR-0025 đ10 (`:73`), ADR-0026 đ8 (`:75`) | cho đảo sau Đã giao | đảo đơn lẻ bị chặn; chỉ trong lô Thay (đ3) |
| ADR-0025 H2 (`:23`) và dòng phương án bị loại (`:87`) | không ghi "khách còn nợ" | **chỉ thay nếu** chủ chọn Q-A5 (B) |
| ADR-0034 điều 1 (hành động nguồn) và điều 4 (ngăn "Của tôi" theo quan hệ với đơn) | — | + tin "Thay lần thu" cho người thu cũ và người thu mới (đ2) |

### Câu hỏi mở
- **Q-A5 (mới, chủ phải trả lời)** — sau "Đã giao", (a) khách **thực sự chưa trả** vì lần thu trước đó ghi nhầm, hoặc (b) công ty cần **hoàn hoặc bồi thường** cho khách. Sổ ghi thế nào, ai chịu?
  - **(A, khuyến nghị):** thêm hai loại ghi riêng, giữ I1:
    - **"phải đòi sau Đã giao"** cho (a). Ghi rõ ai phụ trách đòi; đơn vào danh sách "phải đòi" của Kế toán. Khi khách trả thì Thay; không đòi được thì Toàn quyền chuyển thành "thất thu", có lý do.
    - **"giảm trừ sau Đã giao"** cho (b). Có lý do; Kế toán ghi, Toàn quyền duyệt khi vượt ngưỡng; rồi ghi hoàn.
    - Khi đó I1 = "đã thu ròng = `due_snapshot` − giảm trừ − phải đòi còn mở − thất thu", tính bằng một hàm.
    - **Ai chịu khoản thất thu** (công ty, người ghi nhầm hay đại lý) là quyết định tiền và nhân sự của chủ. Khuyến nghị mặc định **công ty chịu**, xử lý con người theo quy chế ngoài app.
  - **(A')** Khoản thiếu mặc định nằm trên người ghi nhầm, dưới dạng giữ hộ.
    - Dùng lại cơ chế sẵn có.
    - Cái giá: chính sách để nhân viên gánh rủi ro, cần quy chế nhân sự rõ.
  - **(B)** Ghi "khách còn nợ" trên bên đặt.
    - Đảo ngược H2 mà chủ đã bác.
    - Cần hồ sơ khách; đơn đối tác thì bên đặt là đại lý.
  - **(C)** Không có đường trong app: trái Hiến chương 4.2, sổ ghi sai sự thật.

---

## ADR-0092 — Sổ tiền không đổi dấu; điều chỉnh có kiểm soát; mã giao dịch ngân hàng; phí huỷ

### Bối cảnh (đã chạy thật)
- **KT06:** hoàn rồi đảo lần thu gốc làm đã thu **−100.000**, biên nhận đòi 300.000 cho đơn 200.000. Trigger "hoàn ≤ đã thu" chỉ chạy lúc hoàn (`0045:212-216`).
- **KT04:** nộp quá số đang giữ, hoặc nộp cho người không giữ, làm sổ âm; vẫn Hoàn thành. `service.ts:361-397` không so với số đang giữ.
- **KT05:** điều chỉnh xoá 100.000 tiền mặt Bán hàng đang cầm, lý do "."; điều chỉnh 5 tỷ trên đơn 200.000 vẫn qua. `docLyDo` (`service.ts:316-322`) chỉ đòi chuỗi khác rỗng.
- **KT09:** hoàn ghi người trả là người **không cầm** tiền → công ty nợ người đó.
- **KT06 phần đảo dòng:** đảo dòng giữ hộ khi lần thu còn hiệu lực → "thôi giữ" mà không ai xác nhận tiền đã về.
- **KT02:** hai người khai cùng **một** khoản chuyển khoản, cả hai được xác nhận → hoàn "dư" → công ty mất 100.000. Ghi chú chứa mã giao dịch bị chặn (`service.ts:94`).
- **KT10:** `audit-invariants` xanh trong khi có đã thu âm và số dư âm.

### Quyết định
1. **Đã thu ròng của mỗi đơn ≥ 0 mọi lúc** (A-B16): "đảo một lần thu không được làm đã thu ròng < 0". Hai lớp: trigger trên dòng đảo và máy chủ.
2. **Dòng quyết toán không làm số dư đổi dấu** (A-B4). Dòng quyết toán gồm nộp, trả, bù trừ. Số dư là của cặp (bên, công ty) trên đơn.
   - **nộp** ≤ số bên đó **đang nợ** công ty trên đơn;
   - **trả** ≤ số công ty **đang nợ** bên đó trên đơn. Trong mã, "trả" là công ty trả bên đó (`service.ts:357-360`).
   - Hai lớp: trigger trên dòng quyết toán gốc và máy chủ.
   - Chỉ dòng gắn đơn; dòng gắn chuyến (ADR-0057) tính riêng.
   - **Không** cấm số dư âm nói chung, vì "công ty nợ bên đó" là hợp lệ (ADR-0080 D-1 `:114-116`).
   - **Thêm R-BIL-13** ở **mức lỗi**. R-BIL-13 đã được định nghĩa trong ADR-0080 (`:104`, mức cảnh báo) nhưng **chưa có mã**: `audit-checks.mjs` hôm nay chỉ có R-BIL-1..7. Không dùng R-BIL-9 của bản 1.
3. **Hoàn với người trả không phải công ty** (A-B7, KT09): số hoàn ≤ số người đó đang giữ trên đơn.
   - Lượt 1 (ADR-0089 đ3b) đã kiểm ở máy chủ; điều này thêm lớp CSDL.
   - **Không cho vượt.** Nhân viên thực tế ứng tiền túi trả khách thì Kế toán ghi hoàn với người trả là **Công ty**. Khoản công ty phải trả lại nhân viên ghi bằng điều chỉnh tăng nợ của công ty với người đó (đ5b), lý do "ứng tiền túi hoàn khách", rồi trả bằng lệnh "trả".
4. **Không đảo đơn lẻ dòng giữ hộ** khi lần thu sinh ra nó còn hiệu lực (A-B7). Muốn sửa thì đi đường đảo lần thu, "Thay lần thu" (ADR-0088) hoặc "Công ty đã nhận".
5. **Điều chỉnh tiền** (Q-A1, khuyến nghị của phiếu A):
   - **(a)** điều chỉnh **giảm nợ** của một bên ≤ số bên đó đang nợ trên đơn, không đổi dấu;
   - **(b)** điều chỉnh **tăng nợ** ≤ max(phải thu, đã thu ròng) của đơn, để chặn gõ thừa số 0;
   - **(c)** lý do ≥ 10 ký tự;
   - **(d)** **người bị đổi số dư nhận một tin** (cần dòng ADR-0034 điều 1, 4 ở bảng "Thay câu nào"); nhật ký ghi số trước và sau;
   - **(e)** lượt này không làm luồng duyệt hai người.
6. **Mã giao dịch ngân hàng** (Q-A2, khuyến nghị: có):
   - một ô riêng trên lần thu chuyển khoản, không bắt buộc khi khai; Kế toán điền hoặc sửa lúc "Công ty đã nhận";
   - ô này **được miễn** luật chặn chuỗi ≥ 8 chữ số. Luật vẫn áp cho ghi chú và lý do;
   - **cảnh báo, không chặn** khi trùng mã với lần thu khác còn hiệu lực. Kế toán bấm "vẫn xác nhận" kèm lý do;
   - **không** ràng buộc duy nhất, vì một lần chuyển có thể trả cho hai đơn.
7. **Phí huỷ** (Q-A3, **chỉ khi chủ xác nhận công ty có giữ cọc**; không giữ thì bỏ điều này):
   - một **loại ghi riêng**, theo Hiến chương 5.9: mặc định là phải trả khác, chuyển sang thu nhập khác bằng dòng sổ có lý do. **Không** đi đường điều chỉnh, vì điều chỉnh không làm giảm "chờ hoàn" (A-B1);
   - hai cách, kế hoạch chọn sau spike:
     - (i) loại lần thu mới "Giữ làm phí huỷ";
     - (ii) "phí huỷ" cấp đơn tính vào phải thu, khi đó ADR-0089 đ1 đọc "phải thu đơn huỷ = phí huỷ đã ghi (mặc định 0)";
   - điều kiện chung: số giữ ≤ đã thu **đã xác nhận**; lý do bắt buộc; Kế toán hoặc Toàn quyền ghi; thông báo huỷ gửi khách hiện "Phí huỷ X — hoàn Y";
   - lượt này **ghi tay**. Bảng mốc tự tính theo số ngày trước ngày đi để ADR sau (tiền lệ ADR-0057 Q7: "phí huỷ ghi tay trước, bảng mốc làm sau").
8. **Bộ kiểm:**
   - **R-BIL-8**: đã thu ròng ≥ 0 mọi đơn;
   - R-BIL-13 lên mức lỗi (đ2);
   - cùng khuôn trước mốc cảnh báo, sau mốc lỗi (ADR-0088 đ7);
   - mỗi bất biến mới có một lần **quan sát chặn thật** (dữ liệu sai trên D1 tạm → đỏ → hoàn nguyên), ghi `docs/SO-HANG-RAO.md`.

### Thay câu nào
| Văn bản | Câu cũ | Thay bằng |
|---|---|---|
| ADR-0080 điều 8 (`:76`) | "Không vượt… kiểm ở mã; kiểm định kỳ R-BIL-13" | thêm lớp CSDL; R-BIL-13 mức lỗi (đ2) |
| ADR-0080 điều 8 (`:77`) | "số chứng từ ngân hàng ghi ở ghi chú" | ô mã giao dịch riêng (đ6) |
| ADR-0026 đ5 (nộp, trả, hoàn do Kế toán ghi) | không ràng số | đ2, đ3 |
| ADR-0026 điều chỉnh (phiếu ADJUSTMENT) | lý do bất kỳ, không trần | đ5 |
| Hiến chương 5.9 (đề xuất của AI, chờ ADR sổ tiền xác nhận) | "điều kiện và ô quyền quyết ở ADR sổ tiền" | đ7 là ADR đó (nếu chủ xác nhận có phí huỷ) |
| ADR-0089 đ1 (lượt 1) | "phải thu đơn huỷ = 0" | **chỉ nếu đ7 chọn cách (ii):** "phải thu đơn huỷ = phí huỷ đã ghi (mặc định 0)" |
| ADR-0034 điều 1, 4 | — | + tin "điều chỉnh đổi số dư của bạn" (đ5d) |

### Câu hỏi mở
- **Q-A1:** trần điều chỉnh theo đ5. **Khuyến nghị: đồng ý.**
- **Q-A2:** ô mã giao dịch ngân hàng theo đ6. **Khuyến nghị: có.**
- **Q-A3 (chủ phải cho biết thực tế):** công ty có giữ cọc khi khách huỷ không? Nếu có:
  - mốc bao nhiêu ngày trước ngày đi;
  - có khác theo dịch vụ hay nhà cung cấp không (vé không hoàn của bên thứ ba);
  - ai thoả thuận với khách;
  - khách có được báo điều kiện huỷ trước không.
  
  Kho **không có** chính sách nào về việc này: phiếu A đã tra `docs/`.

---

## Trang ghép lượt 2 (CLAUDE.md §9)

### 1. Bảng nào chứa loại thực thể nào
| Bảng | Thực thể | ADR chạm |
|---|---|---|
| `bil_payment_receipt` | thu khách, trả lại khách, dòng đảo (+ loại "giữ làm phí huỷ" nếu đ7 chọn (i)) | 0088 đ2–3; 0092 đ1, đ3, đ6 (cột mã giao dịch), đ7 |
| (loại ghi mới, nếu Q-A5 chọn A) | "phải đòi sau Đã giao", "giảm trừ sau Đã giao", "thất thu" — bảng chứa (`bil_posting` / `bil_debt_line` hay bảng riêng) do kế hoạch chọn sau spike | 0088 Q-A5, đ4(iv) |
| `bil_posting` | phiếu sổ: DELIVERED (`due_snapshot`), ADJUSTMENT, quyết toán…; **+ loại "Thay lần thu"** | 0088 đ2, đ5 |
| `bil_debt_line` | dòng nợ: giữ hộ, nộp, trả, điều chỉnh, lượt 2 (`HOA_HONG`, `GIAM_GIA_BEN_DAT`, `GIA_VON`), dòng gắn chuyến | 0092 đ2, đ4, đ5. **Ràng buộc "không đổi dấu" áp cho cả các loại của lượt 2 trên dòng gắn đơn** |
| `orders` | đơn (khoá sau Đã giao) | 0092 đ7 (ii) nếu chọn phí huỷ cấp đơn |

### 2. Dòng bản đồ quyền chạm các bảng trên
| Ô quyền | Ai | Lượt 2 đổi gì |
|---|---|---|
| `ledger.write` (ACCOUNTING, SUPER_ADMIN) | Kế toán, Toàn quyền | thêm lệnh Thay, phí huỷ; nộp, trả, hoàn, điều chỉnh có ràng buộc. Không thêm mã quyền |
| `payment.receive` | như lượt 1 | không đổi; sau Đã giao vẫn chặn lần thu mới |
| `payment.refund` | ACCOUNTING, SUPER_ADMIN | ràng buộc đ3 |
| `order.complete` | ACCOUNTING, SUPER_ADMIN | + điều kiện I1 (0088 đ5) |
| `ledger.view` | `any` / `own` | danh sách "phải đòi" (nếu Q-A5 chọn A) chỉ `any` |

### 3. Cổng nào canh cửa nào
| Cửa | Hôm nay | Sau lượt 2 |
|---|---|---|
| Đảo lần thu đơn lẻ sau Đã giao | cho phép | chặn (máy chủ + CSDL nếu spike đạt) |
| Thay lần thu | không có | route mới, `can(ledger.write)`, một lô, trigger trên phiếu đánh dấu |
| Đảo lần thu làm đã thu âm | cho phép | chặn (trigger + máy chủ) |
| Nộp, trả | không ràng số | không đổi dấu (trigger + máy chủ) |
| Hoàn với người trả khác công ty | không ràng | ≤ đang giữ |
| Đảo dòng giữ hộ đơn lẻ | cho phép | chặn khi lần thu còn hiệu lực |
| Điều chỉnh | lý do bất kỳ | trần + lý do ≥ 10 + tin cho người bị đổi |
| Hoàn thành | kiểm người giữ tiền | + I1 (máy chủ + trigger `bil_posting_completed_settled`) |
| **Nút "Đảo"** (`web/order.ts:534`, ẩn khi Hoàn thành `:453`) | hiện sau Đã giao | sau Đã giao thay bằng "Thay lần thu"; nút Thay hiện cả sau Hoàn thành |
| **Khung xác nhận "Công ty đã nhận"** | không có ô mã giao dịch | thêm ô mã giao dịch + cảnh báo trùng |
| **Câu 409** `service.ts:218` và mọi route chung đuôi câu | chỉ "ghi điều chỉnh" | chỉ "Thay lần thu" |

### 4. Va chạm
- **0088 đ2 với 0092 đ1:** thứ tự lô ghi mới trước, đảo sau, giữ đã thu ròng ≥ 0 suốt quá trình.
- **0092 đ2 với lượt 2 hoa hồng** (ADR-0079/0080): ràng buộc không đổi dấu áp lên cặp (đại lý, công ty) trên đơn. Phiếu bù trừ ở tháng đã khoá không đụng; chênh lệch xử lý ở tháng đang mở (A-B12).
- **0092 đ7 với ADR-0089 đ1:** nếu chọn (ii) thì đ1 đọc lại như đã ghi; nếu (i) thì không đổi.

### Loại cửa
- Luật và mã đảo được.
- Phiếu và dòng ghi theo lệnh mới là chỉ-thêm, nên phần dữ liệu một chiều. Cột mã giao dịch là migration thêm cột.
- **Việc lớn** (tiền): người kiểm độc lập; spike trước.
