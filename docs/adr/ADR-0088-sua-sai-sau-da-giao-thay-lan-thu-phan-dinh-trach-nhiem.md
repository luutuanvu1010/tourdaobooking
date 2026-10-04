# ADR-0088: Đơn đã "Đã giao" — đã thu ròng = phải thu mọi lúc; sửa sai bằng lệnh "Thay lần thu"; phân định trách nhiệm

- **Trạng thái:** **accepted** — chủ dự án duyệt toàn văn trong chat 2026-10-03: *"1- duyệt"*. Bảng phân định T1–T11 (đ9) đã có lời chủ 2026-10-02 ("7- ok"); nguyên tắc I1 "mọi lúc" có lời chủ 2026-10-02 ("2 - Luôn luôn"). AI soạn (bản 3.1–3.4 của lượt duyệt 2a) và ghi lại, không tự duyệt. Văn bản trình duyệt và **trang ghép chung với ADR-0092**: `docs/superpowers/specs/2026-10-02-luot-duyet-2-sua-sai-sau-da-giao-va-so-khong-doi-dau.md`. Phiếu kiểm độc lập: `docs/superpowers/specs/2026-10-02-phieu-duyet-doc-lap-luot-A-tien.md`, `…/2026-10-02-phieu-kiem-ban-2-ba-luot-duyet.md`, `…/2026-10-02-phieu-kiem-ban-3-chinh-sach-coc-trach-nhiem-chong-trung.md`. Xây trên lỗ đang hở: F-02 (khoá lần gửi), TNV-G3. Từ mốc này chỉ sửa dòng trạng thái; đổi nội dung = ADR mới trỏ về ADR này.
- **Ngày:** 2026-10-02 (soạn), 2026-10-03 (duyệt)
- **Phạm vi:** module `billing` (lệnh Thay lần thu, phiếu đánh dấu, phân định trách nhiệm, trigger Hoàn thành), câu báo ở `orders` / `dispatch`, `audit-invariants` R-BIL-1.

## Lời chủ dự án (nguyên văn)

> "1- duyệt" — trả lời câu "Duyệt toàn văn ADR-0088 và ADR-0092" (chat 2026-10-03, sau khi Đ2b/Đ4 của ADR-0092 đã duyệt cùng lượt V0-A).

> "2 - Luôn luôn" — câu đã hỏi: "Bất biến 'đã thu = phải thu' xét tại mốc Đã giao (như mã và bộ kiểm hiện nay), hay luôn luôn (như chữ ADR)?" (chat 2026-10-02)

> "Sau đã giao mà khách thực sự chưa trả, hoặc phải bồi thường cho khách thì ai làm người đó phải chịu, phân định rạch ròi trách nhiệm trong các trường hợp cụ thể." (chat 2026-10-02; bảng T1–T11: "7- ok")

## Bối cảnh (đã chạy thật, đã chạy lại)
- **G3** (tình huống 30, 49, KD06, DT05):
  - Lần thu ghi nhầm làm sổ báo đủ, nên HDV bấm Đã giao.
  - Kế toán đảo lần thu nhầm được (201), nhưng ghi lại lần thu đúng bị chặn (409, `service.ts:218`).
  - Hoàn thành vẫn được, với "còn lại" 100.000–800.000.
  - `audit-invariants` xanh vì R-BIL-1 chỉ so tại mốc (`audit-checks.mjs:231-235`, kế hoạch sổ tiền lượt 1 `:144`).
- **Chữ ADR-0026 đ13** (R-BIL-1, I1): "đơn đã 'Đã giao': tổng lần thu còn hiệu lực = phải thu hiện hành". Chủ chọn đọc là **mọi lúc**.

## Quyết định
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

## Thay câu nào (dòng trỏ ở dòng trạng thái ADR cũ, không sửa thân)
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

## Đ9 — Phân định trách nhiệm khi thiếu tiền hoặc phải bồi thường sau "Đã giao" (lời chủ, chat 2026-10-02)

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
1. **Phân định:** người có thẩm quyền (QT2: Quản trị hoặc Toàn quyền) chọn trường hợp T1–T11, bên chịu, số tiền, lý do.
2. **Ghi:** Kế toán ghi theo quyết định trong **một lô**:
   - giảm trừ phần khách (nếu bồi thường), và dòng nợ "bên chịu → công ty";
   - hoặc chuyển khoản thiếu sang bên chịu.

   Người ghi ≠ người phân định.
3. **Báo và phản hồi:** bên chịu là nhân viên hay đối tác có tài khoản thì nhận tin ngay, có **3 ngày làm việc** để phản hồi (QT3). Phản hồi đi vào nhật ký của khoản đó; người phân định xem lại.
4. **Thu hồi:** khoản nợ của bên chịu hiện ở "Sổ của tôi" (nhân viên, đối tác) hoặc sổ công nợ (nhà xe, nhà cung cấp). Họ trả bằng lệnh "nộp" như tiền đang giữ.
5. **Ghi chú pháp lý (cần chuyên gia nhân sự / pháp lý xác nhận):**
   - Nền tảng chỉ **ghi nhận trách nhiệm và công nợ**.
   - Việc **khấu trừ lương** nhân viên phải theo Bộ luật Lao động 2019 và quy chế công ty. Chưa kiểm chi tiết; theo hiểu biết chung có giới hạn mức khấu trừ hằng tháng và thủ tục xem xét bồi thường thiệt hại.
   - Nền tảng **không tự trừ lương**.

**Không đổi:** "khách còn nợ" vẫn không có (H2). Bên chịu luôn là một **hồ sơ có thật** (nhân viên, nhà xe, nhà cung cấp, đối tác, hoặc công ty).

## Câu hỏi mở — đã trả lời
- QT1 (bảng T1–T11), QT2 (Quản trị hoặc Toàn quyền phân định; người ghi ≠ người phân định), QT3 (3 ngày làm việc), QT4 (quá 7 ngày: công ty tạm chịu, hiện đỏ, không tự gán) — chủ duyệt cùng bảng ("7- ok", 2026-10-02) và duyệt toàn văn 2026-10-03.
