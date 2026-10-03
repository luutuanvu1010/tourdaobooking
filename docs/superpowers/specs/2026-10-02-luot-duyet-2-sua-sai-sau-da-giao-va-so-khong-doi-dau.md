# Lượt duyệt 2 — ADR-0088 sửa sai sau "Đã giao" (I1 đúng mọi lúc, phân định trách nhiệm) + ADR-0092 sổ không đổi dấu, điều chỉnh có kiểm soát

> **Trạng thái:** **ĐÃ DUYỆT 2026-10-03** — chủ: *"1- duyệt"* (toàn văn ADR-0088 và ADR-0092). Văn bản có hiệu lực: `docs/adr/ADR-0088-sua-sai-sau-da-giao-thay-lan-thu-phan-dinh-trach-nhiem.md`, `docs/adr/ADR-0092-so-tien-khong-doi-dau-dieu-chinh-co-kiem-soat.md`; tệp này giữ làm hồ sơ trình duyệt và **trang ghép chung** (mục cuối). Các câu "còn chờ Duyệt" dưới đây là lịch sử. Bản 3.4 (3/10: ADR-0092 thêm **Đ2b**, sửa **Đ4**, R-BIL-13 đếm cả dòng đảo giữ hộ — theo lời chủ 3/10 câu 2 = A về VP-01; bản đề xuất ở `docs/superpowers/specs/2026-10-03-v0-luot-duyet/`, lượt duyệt V0-A). **Phần bổ sung 3.4 (Đ2b, sửa Đ4, R-BIL-13 đếm dòng đảo giữ hộ, đường sửa khi bấm nhầm) đã được chủ duyệt** chat 2026-10-03: *"Duyệt A1, A2, A3"*. **Toàn văn ADR-0088 và ADR-0092 vẫn chờ chủ nói "Duyệt"** — V2 của lộ trình kiểm theo vai chỉ bắt đầu sau đó. Bản 3.3 — QT1–QT4 (bảng trách nhiệm) **đã có lời chủ** 2/10 ("7- ok"). CT3, CT4 (cảnh báo lần thu tiền mặt giống nhau) **đã có lời chủ** 2/10, ghi ở ADR-0092 đ6a (bản 3.3). Q-A1, Q-A2 **áp theo khuyến nghị** (đồng ý), theo lời chủ 2/10: *"đừng hỏi tôi những câu hỏi mà tôi nên đồng ý nữa,"*. **Còn chờ** chủ nói "Duyệt" văn bản ADR-0088, ADR-0092. Bản 3.1 (2/10) sửa theo phiếu kiểm độc lập bản 3: I1 trừ giảm trừ đã phân định; T7 gắn nợ theo đơn; dọn chữ phí huỷ. Bản 3 (2/10): Q-A3 và Q-A5 đã có lời chủ; Q-A5 thành đ9 (bảng phân định trách nhiệm); đ7 phí huỷ của ADR-0092 bỏ.
> - Chủ đã chọn nguyên tắc ngày 2026-10-02 (câu 2 "Luôn luôn").
> - Bản 1 bị người duyệt độc lập kết luận "chưa nên duyệt" (`2026-10-02-phieu-duyet-doc-lap-luot-A-tien.md`). Bản này sửa theo phiếu; mã sửa ghi trong ngoặc.
>
> **Hạn:** TNV-G3, TNV-G4, F-03 hạn **31/10** (`docs/quyen-hoan.json`).
>
> **Bước ghép:**
> - Đếm theo **quyết định con** (cách phiếu A dùng, A24), hai ADR gộp lại có khoảng 6 quyết định, vượt trần 3 của CLAUDE.md §9.
> - Vì vậy lượt này **duyệt làm hai lần**:
>   - **2a** = ADR-0088: I1 mọi lúc, lệnh Thay, phân định trách nhiệm (đ9);
>   - **2b** = ADR-0092: sổ không đổi dấu và điều chỉnh, mã giao dịch.
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

## Lời chủ dự án (nguyên văn, chat 2026-10-03) — cho ADR-0092 Đ2b

> "1- A, 2-A, 3-ok theo khuyến nghị làm 1-2-3, 3a: … Rõ ràng là sai thì phải chặn, đồng thời cho cách khắc phục. 3b- ok vậy thì không phải là cho phá lệ mà ta đặt thêm nguyên tắc logic lọc. Không chấp nhận phá lệ, tất cả đều được luật hoá"

Câu liên quan đã hỏi (`docs/superpowers/specs/2026-10-02-kiem-theo-vai/NGUYEN-NHAN-GOC.md` §6 câu 2): "Cách sửa VP-01: (A) 'Xác nhận đã nhận' bị 409 khi khoản đã nộp (đơn giản, giữ mô hình dòng đảo) — khuyến nghị; (B) 'Xác nhận' tất toán phần còn lại (đổi dòng đảo thành dòng SETTLEMENT, thay đổi mô hình). Và duyệt điều bổ sung vào ADR-0092 nháp." Chủ chọn **A** ("2-A"). Câu 1 ("1- A") = VP-01 thành mục riêng `TNV-VP01` trong sổ dừng dây chuyền. Diễn giải đủ: NGUYEN-NHAN-GOC.md §8.

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
   - Phải thu hiện hành của đơn đã Đã giao = **`due_snapshot` của phiếu DELIVERED − tổng "giảm trừ đã phân định"** (đ9) (A-B5b; phiếu kiểm bản 3, A1).
   - Đơn đã khoá (ADR-0025 đ5), nên đây không phải đường tính thứ hai (Hiến chương 5.4).
   - Khoản giảm trừ chỉ sinh từ lệnh phân định ở đ9; không có lối nào khác giảm phải thu sau Đã giao.
   - Đã thu ròng tính bằng `conLai` / `hieuLuc` (`billing/rules.ts:47-74`): thu trừ hoàn, trên các lần còn hiệu lực.
2. **Lệnh "Thay lần thu"** (Kế toán, Toàn quyền; ô `ledger.write`, không thêm mã quyền).
   - **Nhận N lần thu cũ → M lần thu mới** trong **một lô ghi**, vì hay gặp hai lần thu một phần (A-B5d). Thứ tự lô (A-B5c):
     1. ghi các lần thu mới;
     2. đảo các lần thu cũ cùng dòng nợ của chúng;
     3. ghi một **phiếu đánh dấu** (loại phiếu mới) có trigger kiểm I1 với `due_snapshot` − giảm trừ đã phân định;
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
   - **(iii) Khách thực sự chưa trả, hoặc công ty cần hoàn hay bồi thường sau Đã giao** (KT09, khách phàn nàn sau tour): theo **đ9 (phân định trách nhiệm, lời chủ 2/10)**.
   - **(iv) Luật tạm cho lần hoàn sau Đã giao** (phiếu kiểm bản 2, M1). Hôm nay mã cho hoàn sau Đã giao (KT09 → 201), mà I1 xét mọi lúc sẽ coi đó là lệch. Vì vậy:
     - hoàn sau Đã giao **chỉ** đi qua đ9 (phân định → giảm trừ + nợ bên chịu → chi hoàn), thi công cùng đợt;
     - trước khi đ9 có mã, **hoàn sau Đã giao bị chặn** (409 "Đơn đã Đã giao — hoàn cho khách cần phân định trách nhiệm trước; báo Quản trị").
     
     Không để mức lỗi của R-BIL-1 bật trước khi có một trong hai cách trên.
5. **Hoàn thành bị chặn khi I1 lệch**, ở hai lớp (Hiến chương 5.1, A-B5a):
   - máy chủ kiểm trước;
   - trigger `bil_posting_completed_settled` (`0045:245-255`) thêm điều kiện so tổng lần thu còn hiệu lực với `due_snapshot` − giảm trừ đã phân định. Trigger chỉ đọc bảng `bil_`, đúng ADR-0024 đ5.
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
| ADR-0026 đ13, R-BIL-1 | (chữ giữ nguyên) | trỏ: "xét mọi lúc, phải thu = `due_snapshot` − giảm trừ đã phân định — ADR-0088 đ1" |
| Kế hoạch sổ tiền lượt 1 `:144` | so "tại mốc" | bỏ (đ1) |
| ADR-0026 đ10 (`:83`) và tiêu chí nghiệm thu 4 (`:123`) | "Sau 'Đã giao' không ai ghi lần thu mới trên đơn (chỉ Kế toán ghi phiếu điều chỉnh)"; "ghi lần thu sau 'Đã giao' → từ chối" | Kế toán và Toàn quyền ghi lần thu mới **chỉ qua lệnh Thay** (đ2). Người khác vẫn bị từ chối |
| ADR-0025 đ7 (`:70`, điều kiện Hoàn thành) | kiểm người giữ tiền | + I1 (đ5) |
| ADR-0025 đ10 (`:73`), ADR-0026 đ8 (`:75`) | cho đảo sau Đã giao | đảo đơn lẻ bị chặn; chỉ trong lô Thay (đ3) |
| ADR-0025 H2 (`:23`) và dòng phương án bị loại (`:87`) | không ghi "khách còn nợ" | **không thay**: đ9 chuyển khoản thiếu sang bên chịu trách nhiệm, không ghi khách còn nợ |
| ADR-0034 điều 1, 4 | — | + tin cho bên bị phân định chịu trách nhiệm (đ9 bước 3) |
| ADR-0057 (dòng nợ gắn chuyến, nhà xe) | nợ chi phí thuê xe | **không đổi**: nợ bồi thường của nhà xe (đ9 T7) gắn **theo đơn**, không theo chuyến, vì trigger `bil_debt_line_trip_not_yet` (`0045:219`) đang chặn loại dòng gắn chuyến |
| ADR-0026 đ10 (`:84`, chủ bỏ Quản trị khỏi `payment.refund`) | Quản trị không ghi hoàn | **không đổi**: Quản trị chỉ **phân định** (một quyết định), còn lần hoàn và dòng nợ vẫn do Kế toán ghi (đ9). Nếu chủ muốn Quản trị không đụng gì tới tiền, QT2 chọn "chỉ Toàn quyền" |
| ADR-0034 điều 1 (hành động nguồn) và điều 4 (ngăn "Của tôi" theo quan hệ với đơn) | — | + tin "Thay lần thu" cho người thu cũ và người thu mới (đ2) |

### Đ9 — Phân định trách nhiệm khi thiếu tiền hoặc phải bồi thường sau "Đã giao" (lời chủ, chat 2026-10-02)

> "Sau đã giao mà khách thực sự chưa trả, hoặc phải bồi thường cho khách thì ai làm người đó phải chịu, phân định rạch ròi trách nhiệm trong các trường hợp cụ thể."

**Nguyên tắc:**
- **Ai gây ra, người đó chịu.** Khoản thiếu hoặc khoản bồi thường được **chuyển thành nợ của bên chịu trách nhiệm với công ty**, thay vì "khách còn nợ" (H2 đã bác) hay "công ty lặng lẽ chịu".
- Đơn của khách được khép đúng sự thật bằng **"giảm trừ đã phân định"** (đ1).
  - Phần khách **không phải trả**, hoặc **được bồi thường**, đi thành giảm trừ trên đơn.
  - Cùng lô, ghi **dòng nợ "bên chịu → công ty"** đúng số đó. Ngoại lệ T10: bên chịu là công ty, nên không có dòng nợ.
  - I1 so với `due_snapshot` − giảm trừ. **Không** dùng "lần thu giả" (phiếu kiểm bản 3, A1).

**Bảng phân định** — **chủ đã duyệt** (chat 2026-10-02, câu 7: "ok", trả lời cho "Bảng 11 trường hợp trách nhiệm … Quản trị hoặc Toàn quyền phân định, người bị gán có 3 ngày làm việc để phản hồi"). Vì vậy QT1, QT2, QT3 đã có lời chủ. QT4 nằm trong dòng T11 của bảng, nên được tính là đã duyệt cùng bảng.

| # | Trường hợp | Bên chịu (mặc định) | Ghi thế nào | Ví dụ đã chạy thật |
|---|---|---|---|---|
| T1 | Ghi lần thu **nhầm đơn / nhầm số / nhầm hình thức**, tiền có thật | Không ai mất tiền | "Thay lần thu" (đ2) | KD06 cặp 1, KT06 đơn 3 |
| T2 | Khai **đã thu tiền mặt** mà thực tế không thu, hoặc thu thiếu | **Người khai** | đã có: người khai đang giữ hộ số khai (H3), phải nộp | DT05(a) |
| T3 | Khai **"Công ty thu – CK"** mà tiền không về | **Người khai** | đã có: H3, không đảo; Hoàn thành bị chặn tới khi nộp | DT05(c), KT02 |
| T4 | Ghi nhầm làm sổ báo đủ, HDV chốt Đã giao **không thu khách thật** | **Người ghi nhầm**, nếu không đòi lại được khách | Trước hết "Thay lần thu" đưa lần thu nhầm về đúng đơn. Khoản khách chưa trả thành **giảm trừ đã phân định** + **nợ người ghi nhầm → công ty**. Đòi được khách thì ghi lần thu và đảo phần giảm trừ + nợ tương ứng | KD06 cặp 2 |
| T5 | Thu đúng nhưng **mất hoặc thiếu tiền mặt** khi nộp | **Người giữ tiền** | đã có: số đang giữ chưa nộp | — |
| T6 | Bồi thường khách do **lỗi nhân viên** (HDV, Bán hàng, tài xế công ty: sai giờ, quên đón, sai dịch vụ) | **Nhân viên gây lỗi**, mức do người phân định quyết | công ty trả khách ("giảm trừ sau Đã giao" + chi hoàn), đồng thời ghi nợ nhân viên → công ty | KT09 (khách phàn nàn) |
| T7 | Bồi thường do **lỗi xe / nhà xe / tài xế đối tác** | **Nhà xe** | công ty trả khách (giảm trừ + chi hoàn), ghi nợ nhà xe → công ty **gắn theo đơn** (dòng gắn chuyến đang bị trigger `0045:219` chặn) | — |
| T8 | Bồi thường do **lỗi nhà cung cấp** (cano, đảo, nhà hàng) | **Nhà cung cấp** | công ty trả khách, ghi nợ nhà cung cấp → công ty (bên nợ là hồ sơ tổ chức nhà cung cấp) | — |
| T9 | Bồi thường do **đối tác / đại lý** (sai thông tin khách, hứa sai) | **Đối tác** | trừ vào hoa hồng / bù trừ (ADR-0079/0080) hoặc nợ đối tác → công ty | — |
| T10 | **Bất khả kháng** (thời tiết, cấm biển, sự cố không ai gây ra) | **Công ty** (không ai "làm") | "giảm trừ sau Đã giao", lý do "bất khả kháng" | — |
| T11 | **Chưa xác định** ngay được ai gây ra | **Tạm: công ty**, trạng thái "chờ phân định", hạn 7 ngày | Khi phân định xong thì chuyển sang bên chịu. **Quá 7 ngày:** khoản vẫn "công ty tạm chịu", hiện đỏ ở danh sách "chờ phân định" của Quản trị và Kế toán; **không** tự gán cho ai (QT4) | — |

**Cách làm** (hai bước, hai người, như hoàn cọc ở ADR-0089):
1. **Phân định:** người có thẩm quyền (QT2, đề xuất Quản trị hoặc Toàn quyền) chọn trường hợp T1–T11, bên chịu, số tiền, lý do.
2. **Ghi:** Kế toán ghi theo quyết định trong **một lô**:
   - giảm trừ phần khách (nếu bồi thường), và dòng nợ "bên chịu → công ty";
   - hoặc chuyển khoản thiếu sang bên chịu.
   
   Người ghi ≠ người phân định.
3. **Báo và phản hồi:** bên chịu là nhân viên hay đối tác có tài khoản thì nhận tin ngay, có **3 ngày làm việc** để phản hồi (QT3). Phản hồi đi vào nhật ký của khoản đó; người phân định xem lại.
4. **Thu hồi:** khoản nợ của bên chịu hiện ở "Sổ của tôi" (nhân viên, đối tác) hoặc sổ công nợ (nhà xe, nhà cung cấp). Họ trả bằng lệnh "nộp" như tiền đang giữ.
5. **Ghi chú pháp lý (cần chuyên gia nhân sự / pháp lý xác nhận):**
   - App chỉ **ghi nhận trách nhiệm và công nợ**.
   - Việc **khấu trừ lương** nhân viên phải theo Bộ luật Lao động 2019 và quy chế công ty. Chưa kiểm chi tiết; theo hiểu biết chung có giới hạn mức khấu trừ hằng tháng và thủ tục xem xét bồi thường thiệt hại.
   - App **không tự trừ lương**.

**Không đổi:** "khách còn nợ" vẫn không có (H2). Bên chịu luôn là một **hồ sơ có thật** (nhân viên, nhà xe, nhà cung cấp, đối tác, hoặc công ty).

### Câu hỏi mở
- **QT1:** xác nhận bảng T1–T11, đặc biệt T10 (bất khả kháng thì công ty chịu) và T11 (chưa xác định thì công ty tạm chịu, hạn 7 ngày).
- **QT2 — ai phân định?**
  - **Khuyến nghị:** Quản trị (Giám đốc, Điều hành) hoặc Toàn quyền.
  - Không cho Kế toán tự phân định rồi tự ghi.
- **QT4 — quá 7 ngày chưa phân định** (T11).
  - **Khuyến nghị:** công ty tiếp tục tạm chịu và khoản hiện đỏ ở danh sách; **không** tự gán cho ai.
  - Lý do: gán tự động là trái tinh thần "phân định rạch ròi".
- **QT3 — thời hạn phản hồi của người bị gán.**
  - **Khuyến nghị:** 3 ngày làm việc.
  - Phương án khác: 7 ngày.

---

## ADR-0092 — Sổ tiền không đổi dấu; điều chỉnh có kiểm soát; mã giao dịch ngân hàng

### Bối cảnh (đã chạy thật)
- **KT06:** hoàn rồi đảo lần thu gốc làm đã thu **−100.000**, biên nhận đòi 300.000 cho đơn 200.000. Trigger "hoàn ≤ đã thu" chỉ chạy lúc hoàn (`0045:212-216`).
- **KT04:** nộp quá số đang giữ, hoặc nộp cho người không giữ, làm sổ âm; vẫn Hoàn thành. `service.ts:361-397` không so với số đang giữ.
- **KT05:** điều chỉnh xoá 100.000 tiền mặt Bán hàng đang cầm, lý do "."; điều chỉnh 5 tỷ trên đơn 200.000 vẫn qua. `docLyDo` (`service.ts:316-322`) chỉ đòi chuỗi khác rỗng.
- **KT09:** hoàn ghi người trả là người **không cầm** tiền → công ty nợ người đó.
- **KT06 phần đảo dòng:** đảo dòng giữ hộ khi lần thu còn hiệu lực → "thôi giữ" mà không ai xác nhận tiền đã về.
- **KT02:** hai người khai cùng **một** khoản chuyển khoản, cả hai được xác nhận → hoàn "dư" → công ty mất 100.000. Ghi chú chứa mã giao dịch bị chặn (`service.ts:94`).
- **KT10:** `audit-invariants` xanh trong khi có đã thu âm và số dư âm.
- **VP-01 (kiểm theo vai 2/10, tái hiện thật):** một dòng giữ hộ (`HELD`) của lần thu "Công ty thu – CK" bị tất toán **hai lần**: Kế toán bấm "Đã nộp" (dòng quyết toán, `service.ts:361-397`) rồi "Xác nhận đã nhận" (dòng đảo HELD, `service.ts:331-355`) → số dư người khai trên đơn **−1.000.000**; chiều ngược qua API cũng vậy. Đ2 bản 3.3 chỉ ràng dòng quyết toán, còn Đ4 kể "Công ty đã nhận" như một đường sửa được phép, nên bản 3.3 **vẫn để hở** ca này (`docs/superpowers/specs/2026-10-02-kiem-theo-vai/NGUYEN-NHAN-GOC.md` §3.1).

### Quyết định
1. **Đã thu ròng của mỗi đơn ≥ 0 mọi lúc** (A-B16): "đảo một lần thu không được làm đã thu ròng < 0". Hai lớp: trigger trên dòng đảo và máy chủ.
2. **Dòng quyết toán không làm số dư đổi dấu** (A-B4). Dòng quyết toán gồm nộp, trả, bù trừ. Số dư là của cặp (bên, công ty) trên đơn.
   - **nộp** ≤ số bên đó **đang nợ** công ty trên đơn;
   - **trả** ≤ số công ty **đang nợ** bên đó trên đơn. Trong mã, "trả" là công ty trả bên đó (`service.ts:357-360`).
   - Hai lớp: trigger trên dòng quyết toán gốc và máy chủ.
   - Chỉ dòng gắn đơn; dòng gắn chuyến (ADR-0057) tính riêng.
   - **Không** cấm số dư âm nói chung, vì "công ty nợ bên đó" là hợp lệ (ADR-0080 D-1 `:114-116`).
   - **Thêm R-BIL-13** ở **mức lỗi**. R-BIL-13 đã được định nghĩa trong ADR-0080 (`:104`, mức cảnh báo) nhưng **chưa có mã**: `audit-checks.mjs` hôm nay chỉ có R-BIL-1..7. Không dùng R-BIL-9 của bản 1. R-BIL-13 đếm đổi dấu do **dòng quyết toán và dòng đảo giữ hộ** (Đ2b), không chỉ dòng quyết toán như chữ ADR-0080 `:104`.
2b. **Một dòng giữ hộ chỉ được tất toán một lần** (VP-01; lời chủ 3/10 câu 2 = A):
   - Một dòng giữ hộ (`HELD`) được tất toán **đúng một lần**, bằng **một trong hai** đường: "Công ty đã nhận" (dòng đảo của dòng HELD) **hoặc** dòng quyết toán "Nộp". Hai đường **loại trừ nhau**: tiền hoặc đã về tài khoản công ty, hoặc người khai nộp bù — không thể cả hai.
   - **Mọi** dòng đảo HELD thuộc phạm vi **"không đổi dấu"** của Đ2 — dòng đảo của "Công ty đã nhận" và dòng đảo HELD do lệnh "đảo lần thu" (`dao_lan_thu`, `service.ts:462-478`) sinh ra: sau khi cộng dòng đảo, số dư cặp (người khai, công ty) trên đơn không được đổi dấu. Vì vậy đảo một lần thu đã được nộp bù cũng bị 409, phải đảo lần nộp trước (cùng thứ tự "ghi mới trước, đảo sau" của 0088 đ2 / 0092 đ1).
   - Vì dòng "Nộp" không trỏ tới một dòng HELD cụ thể, luật "một lần" thi hành bằng **điều kiện số dư**: "Công ty đã nhận" chỉ được ghi khi số người khai **đang nợ** công ty trên đơn **≥** số tiền của dòng HELD; "Nộp" chỉ được ghi trong giới hạn Đ2 (≤ số đang nợ).
   - **Lệnh thứ hai bị từ chối 409 kèm câu chỉ đường** (tiếng Việt, không mã thô), ví dụ khi xác nhận sau nộp: "Khoản này đã được ghi nộp — nếu tiền cũng đã về tài khoản công ty thì đảo lần nộp trước rồi xác nhận."; khi nộp sau xác nhận: câu của Đ2 ("vượt số người này đang giữ cho đơn").
   - **Hai lớp:** máy chủ (`xacNhanCongTyNhan`, `ghiQuyetToan`) và trigger trên `bil_debt_line` (dòng đảo HELD và dòng quyết toán gốc). Trigger chỉ đọc bảng `bil_*` (Hiến chương 5.3).
   - **Một nguồn sự thật cho giao diện:** danh sách "chờ xác nhận" (`choXacNhan`) do máy chủ lọc theo **cùng** điều kiện số dư, nên nút "Xác nhận đã nhận" không hiện cho khoản đã được nộp; giao diện không tự ghép hai danh sách.
   - **Không đổi mô hình dòng:** dòng đảo HELD giữ nguyên là dòng đảo (không đổi thành dòng quyết toán — phương án B bị loại).
   - Sửa sai khi Kế toán bấm nhầm đường (chỉ-thêm, không xoá):
     - nhầm **"Nộp"** (tiền thật ra đã về tài khoản): đảo dòng quyết toán bằng lệnh điều chỉnh "đảo dòng" sẵn có (`service.ts:453-522`), rồi "Công ty đã nhận";
     - nhầm **"Công ty đã nhận"** (tiền chưa về, người khai nộp tiền mặt): hôm nay **không** đảo được dòng đảo (`service.ts:475` trả 409 "Không đảo dòng đảo"). **Khuyến nghị** (chủ duyệt cùng Đ2b): ghi điều chỉnh **tăng nợ** của người khai với công ty trên đơn (đ5b, lý do ≥ 10 ký tự, người bị đổi số dư nhận tin) bằng đúng số đó, rồi "Nộp". Không mở đường "đảo dòng đảo".
3. **Hoàn với người trả không phải công ty** (A-B7, KT09): số hoàn ≤ số người đó đang giữ trên đơn.
   - Lượt 1 (ADR-0089 đ3b) đã kiểm ở máy chủ; điều này thêm lớp CSDL.
   - **Không cho vượt.** Nhân viên thực tế ứng tiền túi trả khách thì Kế toán ghi hoàn với người trả là **Công ty**. Khoản công ty phải trả lại nhân viên ghi bằng điều chỉnh tăng nợ của công ty với người đó (đ5b), lý do "ứng tiền túi hoàn khách", rồi trả bằng lệnh "trả".
4. **Không đảo đơn lẻ dòng giữ hộ** khi lần thu sinh ra nó còn hiệu lực (A-B7). Muốn sửa thì đi đường đảo lần thu, "Thay lần thu" (ADR-0088) hoặc "Công ty đã nhận". **Ngoại lệ cho "Công ty đã nhận" (phiếu `COMPANY_RECEIVED`) vẫn giữ** — đó là đường tất toán chính của khoản chuyển khoản — **nhưng không còn vô điều kiện**: nó chịu điều kiện số dư của Đ2b. Bản 3.3 miễn vô điều kiện, chính chỗ đó để lọt VP-01.
5. **Điều chỉnh tiền** (Q-A1, khuyến nghị của phiếu A):
   - **(a)** điều chỉnh **giảm nợ** của một bên ≤ số bên đó đang nợ trên đơn, không đổi dấu;
   - **(b)** điều chỉnh **tăng nợ** ≤ max(phải thu, đã thu ròng) của đơn, để chặn gõ thừa số 0;
   - **(c)** lý do ≥ 10 ký tự;
   - **(d)** **người bị đổi số dư nhận một tin** (cần dòng ADR-0034 điều 1, 4 ở bảng "Thay câu nào"); nhật ký ghi số trước và sau;
   - **(e)** lượt này không làm luồng duyệt hai người.
6. **Mã giao dịch ngân hàng** (Q-A2; chỉnh theo khung Oracle — `2026-10-02-chong-trung-moi-lenh-ghi-theo-oracle.md` §2.3, §3.2):
   - một ô riêng trên lần thu chuyển khoản; Kế toán điền hoặc sửa lúc "Công ty đã nhận";
   - ô này **được miễn** luật chặn chuỗi ≥ 8 chữ số. Luật vẫn áp cho ghi chú và lý do;
   - **chặn** khi trùng (mã đã chuẩn hoá, **cùng đơn**) với một lần thu còn hiệu lực. Oracle Receivables chặn biên lai trùng số;
   - **cảnh báo** khi cùng mã ở **đơn khác**, kèm tổng số đã gắn mã đó, vì một lần chuyển có thể trả nhiều đơn. Kế toán bỏ qua được, **lý do bắt buộc**, ghi nhật ký;
   - khi xác nhận: **tổng các lần thu gắn cùng một mã ≤ số tiền thực chuyển** (Kế toán nhập theo sao kê). Vượt thì chặn.
6a. **Cảnh báo lần thu tiền mặt giống nhau** (CT3, CT4; **đã có lời chủ**, chat 2026-10-02, chủ chọn trên bảng hỏi):
   - CT3: *"Có, chỉ cảnh báo (Recommended)"*. Cùng đơn, cùng số tiền, cùng ngày thì cảnh báo "Có thể trùng với lần thu …: Xem bản cũ / Vẫn ghi" **trước khi ghi**. Không chặn, vì hai lần thu giống hệt nhau đôi khi là thật.
   - CT4: *"Người đang ghi, bắt nhập lý do (Recommended)"*. Ai đang ghi thì được bấm "Vẫn ghi", nhưng phải gõ lý do. Lý do và người bỏ qua vào nhật ký; Kế toán xem lại được.
   - Làm bằng **một dòng trong bảng luật trùng dùng chung** của lớp nghiệp vụ (`2026-10-02-lop-chong-ghi-trung-chung-de-xuat.md` §4), không vá riêng màn ghi lần thu. Lời chủ: *"chặn ghi trùng bằng giải pháp kỹ thuật, chứ không phải đi vá thế này"*.
   - Cảnh báo ở đ6 (cùng mã giao dịch, khác đơn) đi qua **cùng** bảng luật và **cùng** hộp thoại.
7. **Phí huỷ — bỏ khỏi ADR này.** Chủ đã trả lời Q-A3 ngày 2/10: khách huỷ thì mặc định **không hoàn cọc**, hoàn là tuỳ chọn có duyệt, hạn 60 ngày. Việc này nằm trọn ở **ADR-0089 bản 3 (lượt 1a)**; không cần loại ghi "phí huỷ" riêng.
8. **Bộ kiểm:**
   - **R-BIL-8**: đã thu ròng ≥ 0 mọi đơn;
   - R-BIL-13 lên mức lỗi (đ2), đếm cả dòng đảo giữ hộ (đ2b); bài kiểm có ca VP-01 (nộp rồi xác nhận → 1 vi phạm khi gỡ trigger) và ca âm hợp lệ (công ty nợ đại lý, nhân viên ứng tiền → 0);
   - cùng khuôn trước mốc cảnh báo, sau mốc lỗi (ADR-0088 đ7);
   - mỗi bất biến mới có một lần **quan sát chặn thật** (dữ liệu sai trên D1 tạm → đỏ → hoàn nguyên), ghi `docs/SO-HANG-RAO.md`.

### Thay câu nào
| Văn bản | Câu cũ | Thay bằng |
|---|---|---|
| ADR-0080 điều 8 (`:76`) | "Không vượt… kiểm ở mã; kiểm định kỳ R-BIL-13" | thêm lớp CSDL; R-BIL-13 mức lỗi (đ2) |
| ADR-0080 điều 8 (`:77`) | "số chứng từ ngân hàng ghi ở ghi chú" | ô mã giao dịch riêng (đ6) |
| ADR-0026 đ5 (nộp, trả, hoàn do Kế toán ghi) | không ràng số | đ2, đ3 |
| ADR-0026 đ4 ("Công ty thu – CK" do người khác khai: Kế toán xác nhận = đảo dòng giữ hộ) | điều kiện duy nhất: dòng giữ hộ chưa bị đảo | + đ2b: chỉ khi người khai còn nợ trên đơn ≥ số dòng giữ hộ; loại trừ với "Nộp" |
| ADR-0080 `:104` (R-BIL-13 "đổi dấu do dòng `SETTLEMENT`") | chỉ dòng quyết toán | + dòng đảo giữ hộ (đ2b) |
| ADR-0026 điều chỉnh (phiếu ADJUSTMENT) | lý do bất kỳ, không trần | đ5 |
| Hiến chương 5.9 | "điều kiện và ô quyền quyết ở ADR sổ tiền" | phần đơn huỷ do ADR-0089 bản 3 quyết |
| ADR-0089 đ1 (lượt 1) | — | không còn liên quan: đ7 đã bỏ, ADR-0089 bản 3 tự xử lý cọc |
| ADR-0034 điều 1, 4 | — | + tin "điều chỉnh đổi số dư của bạn" (đ5d) |

### Câu hỏi mở
- **Q-A1:** trần điều chỉnh theo đ5. **Khuyến nghị: đồng ý.** → **Áp theo khuyến nghị** (lời chủ 2/10).
- **Q-A2:** ô mã giao dịch ngân hàng theo đ6 (chặn trùng trong cùng đơn, cảnh báo khác đơn, tổng ≤ số chuyển). **Khuyến nghị: có.** → **Áp theo khuyến nghị** (lời chủ 2/10).
- **CT3, CT4 — đã trả lời 2/10:** xem đ6a.
- **Q-A3 — đã trả lời 2/10:** mặc định không hoàn cọc; xem ADR-0089 bản 3. Các ý bên dưới giữ lại để tham khảo lịch sử:
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
| `bil_payment_receipt` | thu khách, trả lại khách, dòng đảo | 0088 đ2–3; 0092 đ1, đ3, đ6 (cột mã giao dịch) |
| **khoản phân định trách nhiệm** (mới, đ9) | trường hợp T1–T11, bên chịu (hồ sơ: nhân viên, nhà xe, nhà cung cấp, đối tác, công ty), số, lý do, người phân định, phản hồi; "giảm trừ sau Đã giao"; nợ bên chịu → công ty. Chỉ-thêm | 0088 đ4(iv), đ9. Bảng chứa (loại phiếu mới trong `bil_posting` + `bil_debt_line`, hay bảng riêng) do kế hoạch chọn sau spike |
| `bil_posting` | phiếu sổ: DELIVERED (`due_snapshot`), ADJUSTMENT, quyết toán…; **+ loại "Thay lần thu"** | 0088 đ2, đ5 |
| `bil_debt_line` | dòng nợ: giữ hộ, nộp, trả, điều chỉnh, lượt 2 (`HOA_HONG`, `GIAM_GIA_BEN_DAT`, `GIA_VON`), dòng gắn chuyến | 0092 đ2, đ4, đ5. **Ràng buộc "không đổi dấu" áp cho cả các loại của lượt 2 trên dòng gắn đơn** |
| `orders` | đơn (khoá sau Đã giao) | không đổi cột (giảm trừ ghi ở sổ `billing`, đ9) |

### 2. Dòng bản đồ quyền chạm các bảng trên
| Ô quyền | Ai | Lượt 2 đổi gì |
|---|---|---|
| `ledger.write` (ACCOUNTING, SUPER_ADMIN) | Kế toán, Toàn quyền | thêm lệnh Thay, lệnh ghi theo phân định (đ9); nộp, trả, hoàn, điều chỉnh có ràng buộc. Không thêm mã quyền |
| `payment.receive` | như lượt 1 | không đổi; sau Đã giao vẫn chặn lần thu mới |
| `payment.refund` | ACCOUNTING, SUPER_ADMIN | ràng buộc đ3 |
| `order.complete` | ACCOUNTING, SUPER_ADMIN | + điều kiện I1 (0088 đ5) |
| `ledger.view` | `any` / `own` | danh sách "chờ phân định" và "nợ bồi thường" chỉ `any`; bên bị gán thấy khoản của mình ở "Sổ của tôi" (`own`) |
| **ô mới "phân định trách nhiệm"** (đ9, QT2) | — | đề xuất ADMIN, SUPER_ADMIN; người ghi (Kế toán, `ledger.write`) ≠ người phân định |

### 3. Cổng nào canh cửa nào
| Cửa | Hôm nay | Sau lượt 2 |
|---|---|---|
| Đảo lần thu đơn lẻ sau Đã giao | cho phép | chặn (máy chủ + CSDL nếu spike đạt) |
| Thay lần thu | không có | route mới, `can(ledger.write)`, một lô, trigger trên phiếu đánh dấu |
| Đảo lần thu làm đã thu âm | cho phép | chặn (trigger + máy chủ) |
| Nộp, trả | không ràng số | không đổi dấu (trigger + máy chủ) |
| **Cổng `POST /api/ledger/company-receipts/:id/confirm` và `POST /api/ledger/settlements` canh cùng một dòng HELD** (đ2b) | hai cổng độc lập; làm được cả hai → số dư âm (VP-01) | loại trừ: đường nào ghi trước thì đường kia 409 kèm câu chỉ đường (máy chủ + trigger trên `bil_debt_line`) |
| **Nút "Xác nhận đã nhận" và nút "Đã nộp về công ty"** (`web/order.ts:524-532`, `:553-563`) | hiện theo hai danh sách máy chủ tính độc lập (`choXacNhan`, `dangGiu`) → cùng hiện cho một khoản | `choXacNhan` lọc theo điều kiện số dư của đ2b → khoản đã nộp không còn nút "Xác nhận"; giao diện không tự ghép |
| Hoàn với người trả khác công ty | không ràng | ≤ đang giữ |
| Đảo dòng giữ hộ đơn lẻ | cho phép | chặn khi lần thu còn hiệu lực |
| Điều chỉnh | lý do bất kỳ | trần + lý do ≥ 10 + tin cho người bị đổi |
| Hoàn thành | kiểm người giữ tiền | + I1 (máy chủ + trigger `bil_posting_completed_settled`) |
| Hoàn sau Đã giao | cho phép (KT09) | chỉ qua đ9: phân định → giảm trừ + nợ bên chịu → chi hoàn; trước khi có đ9 thì chặn |
| Phân định trách nhiệm | không có | route mới `can(ô phân định)`; ghi theo phân định `can(ledger.write)`, người ghi ≠ người phân định; khoá lần gửi |
| **Nút "Đảo"** (`web/order.ts:534`, ẩn khi Hoàn thành `:453`) | hiện sau Đã giao | sau Đã giao thay bằng "Thay lần thu"; nút Thay hiện cả sau Hoàn thành |
| **Khung xác nhận "Công ty đã nhận"** | không có ô mã giao dịch | thêm ô mã giao dịch + cảnh báo trùng |
| Ghi lần thu tiền mặt (`can(payment.receive)`, mọi vai đang có ô) | không kiểm trùng | đ6a: cùng đơn + số tiền + ngày → máy chủ trả 409 "có thể trùng" kèm lần thu cũ (chỉ trường người ghi được xem); **người đang ghi** bấm "Vẫn ghi" với lý do bắt buộc; nhật ký ghi người + lý do. Không thêm ô quyền |
| **Hộp thoại "Có thể trùng"** (giao diện, mới, dùng chung) | không có | hiện ở màn ghi lần thu và khung xác nhận; "Xem bản cũ" chỉ mở được khi người đó có quyền xem đơn cũ |
| **Câu 409** `service.ts:218` và mọi route chung đuôi câu | chỉ "ghi điều chỉnh" | chỉ "Thay lần thu" |

### 4. Va chạm
- **0088 đ2 với 0092 đ1:** thứ tự lô ghi mới trước, đảo sau, giữ đã thu ròng ≥ 0 suốt quá trình.
- **0092 đ2b với ADR-0088 đ4(i)/đ9 (nộp bù khi chuyển khoản không về):** nộp bù là đường "Nộp" của đ2b; sau khi nộp bù, "Công ty đã nhận" cho cùng khoản bị 409 — đúng nghĩa "loại trừ". Nếu sau đó tiền chuyển khoản lại về thật, Kế toán đảo lần nộp (trả lại người khai) rồi xác nhận — chỉ-thêm.
- **0092 đ2 với lượt 2 hoa hồng** (ADR-0079/0080): ràng buộc không đổi dấu áp lên cặp (đại lý, công ty) trên đơn. Phiếu bù trừ ở tháng đã khoá không đụng; chênh lệch xử lý ở tháng đang mở (A-B12).
- **0088 đ9 với ADR-0026 đ10 (`:84`):** chủ đã bỏ Quản trị khỏi `payment.refund`. Đ9 cho Quản trị **phân định** (quyết định ai chịu), còn lần hoàn và dòng nợ vẫn do Kế toán ghi, nên không trái chữ đ10. Nhắc một lần (P18): nếu ý của chủ khi bỏ Quản trị khỏi ô hoàn tiền là "Quản trị không đụng tới tiền" theo nghĩa rộng, thì QT2 nên chọn "chỉ Toàn quyền phân định".
- **0088 đ9 với ADR-0089 (lượt 1a):** cùng khuôn "người quyết ≠ người ghi" như duyệt hoàn cọc.

### Loại cửa
- Luật và mã đảo được.
- Phiếu và dòng ghi theo lệnh mới là chỉ-thêm, nên phần dữ liệu một chiều. Cột mã giao dịch là migration thêm cột.
- **Việc lớn** (tiền): người kiểm độc lập; spike trước.
