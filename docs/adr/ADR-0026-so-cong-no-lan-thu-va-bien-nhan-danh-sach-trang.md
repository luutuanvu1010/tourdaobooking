# ADR-0026 — Sổ công nợ lượt 1: lần thu có người thu và hình thức, dòng nợ hai chân dưới phiếu sổ, nộp/trả/hoàn do Kế toán ghi (thận trọng), ba cột cọc cũ ngừng dùng, biên nhận theo danh sách trắng

- **Trạng thái:** **accepted** — chủ dự án trả lời trong chat 2026-09-29 (hộp hỏi gom bốn câu, sau khi chọn hướng *"1, và làm đúng triết lý Modular Monolith, tuân thủ hiến pháp và kién trúc hệ thống"*). Nguyên văn câu 1: *"Bạn có duyệt thiết kế sổ tiền lượt 1 không? Gồm ba quyết định: tách module sổ tiền + biên nhận; hai bước 'Đã giao – đã thu đủ' (hướng dẫn viên bấm, khoá đơn) và 'Hoàn thành' (Kế toán bấm); sổ công nợ ghi ai đang giữ tiền của ai, chỉ ghi thêm, sai thì ghi dòng đảo. Kèm bản cập nhật cho 9 loại quyền."* → **"Duyệt"**. Hồ sơ trình: ADR này + trang ghép `docs/superpowers/specs/2026-09-25-luot1-hoan-tat-trang-ghep.md` + bản làm mới `docs/superpowers/specs/2026-09-29-so-tien-luot-1-lam-moi-ho-so-duyet.md` (người kiểm độc lập chỉ-đọc: ĐẠT CÓ ĐIỀU KIỆN, đã sửa đủ bốn điểm trước khi trình). AI ghi lại, không tự duyệt (Hiến pháp N3, Điều 7.2). Từ mốc này chỉ sửa dòng trạng thái; đổi nội dung = ADR mới trỏ về ADR này. *(Bản proposed: AI soạn 2026-09-25 từ Q2, Q3, Q6, H1, H3, H4, H5, H8.)* **Điều 3 (dòng "Mỗi dòng") và điều 5 bị sửa bởi ADR-0057** (duyệt 2026-09-30): dòng nợ `bil_debt_line` có nguồn là đơn **hoặc** chuyến xe (không bao giờ cả hai) — `order_id` trống được, thêm `trip_id` (cột dự trữ, không khoá ngoại), `CHECK ((order_id IS NULL) <> (trip_id IS NULL))`, trigger lượt 1 chặn dòng chỉ-có-chuyến; kế hoạch sổ tiền §3.2 sửa theo. **Sổ tiền lượt 2 (duyệt 2026-10-01) sửa:** điều 1 (cách suy người hưởng) — [ADR-0077](ADR-0077-chinh-sach-hoa-hong-va-chup-luc-xac-nhan.md); điều 2 (người thu, thu cho ai), điều 4 gạch 2, điều 12 gạch 2 — [ADR-0078](ADR-0078-dieu-khoan-cung-ung-va-nha-cung-cap.md); điều 3 (loại dòng), điều 4 gạch 3, điều 12 gạch 1, 3, M1, điều 13 — [ADR-0079](ADR-0079-phieu-da-giao-thuong-mai.md); điều 5 và bổ sung 5.14 (khoá kỳ) — [ADR-0080](ADR-0080-quyet-toan-thang-va-khoa-ky.md); điều 7, điều 10 (`ledger.view`) — [ADR-0081](ADR-0081-doi-tac-xem-so.md).
- **Ngày:** 2026-09-25 (soạn) · 2026-09-29 (duyệt)   **Người phê chuẩn:** chủ dự án
- **Lượt duyệt:** **lượt 1 của "Hoàn tất đơn"** (cùng ADR-0024, ADR-0025; trang ghép `docs/superpowers/specs/2026-09-25-luot1-hoan-tat-trang-ghep.md`). **Chỉ trình khi ADR-0019 đã lên production.** Chiết khấu/hoa hồng (D4) và điều khoản cung ứng — người bán, nhà cung cấp, a% (D5) — là **lượt 2**, không thuộc ADR này.
- **Loại quyết định:** **cửa một chiều** — dòng sổ và lần thu đã ghi là chỉ-thêm (sai thì đảo, không xoá); bảng mới có dữ liệu thì khó đổi cấu trúc; lần chuyển cọc cũ sang sổ là một lần. Các ô quyền là hai chiều.
- **Xây trên lỗ đang hở:** **không còn** (kiểm 2026-09-29, bản làm mới `docs/superpowers/specs/2026-09-29-so-tien-luot-1-lam-moi-ho-so-duyet.md` §1): `money.view`, `contact.view` đã được máy chủ hỏi (ADR-0019 Phần B, bản 1.18); `DK-T3-01`, `DK-T3-02`, `DK-T4-02` đã vá (bản 1.14); `DK-T2-01` đã vá (bản 1.13). *(Dòng gốc 2026-09-25 liệt kê các lỗ trên kèm hạn 2026-10-05 và "chờ ADR-0019"; chép lại khi duyệt.)*

## Bổ sung khi duyệt (2026-09-29)

Duyệt **kèm** bản làm mới `docs/superpowers/specs/2026-09-29-so-tien-luot-1-lam-moi-ho-so-duyet.md` — các điểm sau là một phần của quyết định này:

- **Bảng quyền đủ 9 cột** (bản làm mới §2): `DRIVER`, `DRIVER_PARTNER` = `none` ở cả sáu ô `order.handover`, `order.complete`, `payment.receive`, `payment.refund`, `ledger.view`, `ledger.write`.
- **Hệ quả chéo mới** (bản làm mới §3, mục 12–16): route huỷ/sửa tiền của hướng dẫn viên (module `dispatch`) và mọi route ghi đơn từ chối sớm sau "Đã giao" (danh sách sinh từ router); ghép với chốt Xác nhận và chặng/suất của ADR-0049; **không** gửi thông báo màn hình khoá cho "Đã giao"/"Hoàn thành" (theo ADR-0045); `R-BIL-7` dùng lại `R-PTY-1`; **thi công chỉ bắt đầu sau khi ADR-0049 lượt 1 đã gộp `main`**.
- **Rào modular monolith phải thấy chặn thật một lần** (bản làm mới §4.1): `billing` vào `STRICT`; hạng `KHONG_BANG` cho `receipt`; bài riêng "`orders` không nhắc `bil_`" (vì `orders` còn `LEGACY`); luật thân trigger; mỗi rào một dòng ở `docs/SO-HANG-RAO.md`.
- **Điều kiện "xây trên lỗ đang hở" đã thoả** (kiểm 2026-09-29, bản làm mới §1): ADR-0019 Phần B lên production bản 1.18; `DK-T3-01`, `DK-T3-02`, `DK-T4-02` vá ở bản 1.14 (mục `phat_hien` rỗng); `money.view`, `contact.view` không còn trong danh sách hoãn.
- **M1 = A** — nguyên văn câu 2: *"Trước khi có hoa hồng/chiết khấu (lượt 2), đơn nào được bấm 'Đã giao – đã thu đủ'?"* → **"A: chặn đơn đối tác"**: đơn có người hưởng (bên đặt mang vai nhóm bên ngoài) không bấm "Đã giao" được tới lượt 2; đơn khách lẻ chạy ngay (điều 12).
- **M2 xác nhận** — nguyên văn câu 3: *"Khách đã trả trước rồi bớt người, nên tiền đã trả nhiều hơn số phải trả. Xử lý thế nào?"* → **"Không chặn, chờ hoàn"**: không chặn sửa số khách; phần dư là khoản công ty phải trả lại khách, Kế toán ghi hoàn (`payment.refund`); đơn chưa "Đã giao" được tới lúc hoàn xong (ADR-0025 điều 3d). Hiến chương 5.9.
- **Hiến chương 5.14** — nguyên văn câu 4: *"Hiến chương đòi mỗi khoản tiền ghi 'ngày phát sinh' và có 'khoá kỳ' (tháng đã chốt thì không ghi thêm). Làm lúc nào?"* → **"Ngày phát sinh ngay, khoá kỳ lượt 2"**:
  - `bil_payment_receipt` và `bil_posting` có thêm cột **ngày phát sinh** (ngày dân sự VN, `TEXT YYYY-MM-DD`, bắt buộc; mặc định do máy chủ đặt = `vnToday()` khi người ghi không chọn; Kế toán chọn được ngày khác cho phiếu của mình), tách khỏi `created_at` (UTC).
  - **Lệch có chủ ý: Hiến chương điều 5.14, vế "khoá kỳ"** — chưa có kỳ/khoá kỳ ở lượt 1, vì kỳ suy được từ ngày phát sinh nên thêm sau không mất dữ liệu. **Hạn:** khoá kỳ phải có trong cùng bản phát hành với lượt 2 (D4/D5). Chủ dự án duyệt lệch này bằng câu trả lời trên (Hiến chương 6.1).
- **Sổ vàng (Hiến chương 5.17):** mã sổ chỉ được nhận khi chủ/Kế toán xác nhận các ca lượt 1 (`golden/hoan-tat-cong-no.json` SV-HT-06, SV-HT-07 và các ca kế hoạch thêm); AI không tự xác nhận.

## Nguồn (chủ dự án, phiên chat 2026-09-25)

- **Q2:** *"trong phần thanh toán trước thì cần chọn rõ là thu bởi HDV (TM/CK) hay bởi Cty Tour Đảo (CK). Ưu tiên phản ánh đúng phát sinh thực tế. Nếu Cty đã thu thì phần đó loại khỏi phần nợ của HDV với Cty."*
- **Q3:** *"Mức này hệ thống tự tính và ghi nhận nhưng không hiển thị cho biên nhận (lớp xử lý biên nhận phải làm được điều đó)."*
- **Q6:** đơn Hoàn thành không mở lại; Kế toán/Toàn quyền ghi bút toán điều chỉnh có lý do.
- **H1:** *"người hưởng hoa hồng chính là bên đặt của đơn"*.
- **H3:** "Công ty thu – chuyển khoản" do HDV khai **cần Kế toán xác nhận**; trước đó vẫn tính vào nợ người khai.
- **H4:** đồng ý nộp tiền / trả đối tác–nhà cung cấp / hoàn khách vào đợt 1, mức tối thiểu, Kế toán ghi — *"theo đúng nguyên tắc thận trọng của kế toán"*.
- **H5:** chụp mức chiết khấu, giá vốn, người bán vào đơn **lúc Xác nhận** (và khi thêm dịch vụ); đổi cài đặt sau không đổi đơn đã xác nhận. **H8 = A:** giá vốn nhà cung cấp tính trên **giá gốc trước giảm**. (Cả hai áp ở lượt 2 — ghi ở đây vì chúng đổi một câu đã duyệt, xem bảng dưới.)

## Sửa những câu nào của quyết định đã duyệt

| Nguồn | Câu hiện hành | Sau ADR-0026 |
|---|---|---|
| **ADR-0004** "Vẫn KHÔNG làm" | "**công nợ đại lý** và giá net cho đại lý (hoãn; giá net cho HDV ở N4)" | **Công nợ** (sổ hai chân) làm từ lượt 1; giá net / chiết khấu ở lượt 2 (D4). Vẫn **không** làm: hoá đơn điện tử, tính thuế, cổng thanh toán, đối soát ngân hàng. |
| ADR-0004 "Hệ quả" | "kèm một ADR riêng cho 'sổ thu tiền chỉ-thêm, sai thì đảo' khi N3 bắt đầu" | ADR này là ADR đó. |
| ADR-0004 "Hệ quả", ba cột cọc | "sẽ được thay bằng dữ liệu dẫn xuất từ sổ thu tiền … **cùng một lần triển khai** với việc thêm `bil_payment_receipt`" | Làm **cùng lần triển khai**: ngừng đọc và ngừng mang nghĩa ba cột; cọc cũ chuyển thành lần thu; **cột vật lý giữ**, khai "không dùng nữa" (điều 9). Gỡ cột vật lý = cửa một chiều, cần ADR riêng (đúng ADR-0004 dòng "Loại quyết định") — không kế hoạch. |
| **ADR-0007 điều 1**, dòng "Ghi thu tiền" / "Ghi hoàn tiền" | thu: SALES của mình, ACC, ADMIN; hoàn: ACC, ADMIN | Theo điều 10 (ô `payment.receive`, `payment.refund`, `ledger.*`). |
| **ADR-0014 điều 2**, dòng `payment.receive …` của `PARTNER` | `none` | `payment.receive` = `own` (thay ô tiền cọc trên form lập đơn — điều 10). `payment.refund`, `invoice.*` giữ `none`. |
| **ADR-0014 điều 11**, "Tiền cọc khi huỷ" | "Hoàn cọc … vẫn là việc vận hành **ngoài hệ thống** cho tới khi N3 … triển khai" | Hoàn tiền khách ghi **trong sổ** do Kế toán (H4). Dấu "cần chú ý hoàn cọc" đọc từ sổ (lần thu còn hiệu lực trên đơn đã huỷ). |
| **ADR-0018 điều 11** | "…**chụp theo từng dòng dịch vụ lúc gửi đơn**… Đợt này ghi và hiện 'đối tác phải trả / dự kiến còn phải trả'; **sổ công nợ**, đối soát, hoá đơn VAT làm ở đợt thu tiền." | (1) **Sổ công nợ** làm từ lượt 1 (ADR này). (2) Thời điểm chụp đổi sang **lúc Xác nhận** (và khi thêm dịch vụ) theo H5 — **câu này sẽ được thay chính thức ở ADR của D4 (lượt 2)**; ghi ở đây để không lọt: từ nay mọi tài liệu mới dùng "lúc Xác nhận". |
| Đặc tả mô hình vai (đã duyệt) §3 **Q34** và §11 "**Người giữ tiền cọc:** đối tác hay Tour Đảo … (cột trên `orders`)" | một cột "người giữ cọc" trên đơn | **Bỏ.** Người giữ tiền là **vai của từng lần thu** (người thu + vai người thu, điều 2), không phải cột trên đơn. Số "dự kiến đối tác còn phải trả" của §11 được thay bằng số dư sổ (lượt 2). |
| Đặc tả mô hình vai §11 "Đợt này KHÔNG làm" | "sổ công nợ đối tác, đối soát, ghi nhận HDV đã thu tiền tại cảng" | Sổ công nợ và ghi nhận HDV đã thu làm ở lượt 1; đối soát ngân hàng vẫn không. |
| **ADR-0023** (**proposed**, chưa accepted) điều 1 | "Đơn mình **từng** phụ trách rồi bị đổi: không thấy nữa." | Vẫn không thấy **đơn**; nhưng **luôn thấy nợ của mình** ở "Sổ của tôi" (điều 7) — mã đơn, ngày, loại, số tiền; không tên/SĐT khách. |
| **ADR-0003 điều 6**, câu "Bảng chỉ-thêm (phiếu thu, nhật ký) chỉ có `created_*`" | bảng chỉ-thêm chỉ có hai cột WHO | Bảng chỉ-thêm của `billing` vẫn có **đủ bốn** cột WHO (`updated_*` = `created_*`, trigger cấm sửa nên không bao giờ khác) vì bài kiểm kiến trúc đòi đủ bốn cho mọi bảng mới (`src/architecture.test.ts`, khối ADR-0003) và AI **không được nới** bài kiểm (Điều 9.4). Lệch câu chữ, không lệch mục đích — đề xuất chủ ghi nhận khi duyệt. |
| Đặc tả gốc Q4 (ô "Người giới thiệu") | ô riêng trên đơn | **Không thêm ô** (H1). Người hưởng = **bên đặt** (`orders.booker_party_id`) khi bên đặt mang vai nhóm **bên ngoài** — giữ đúng ADR-0018 điều 9 và "Phương án bị loại" của nó. |

## Quyết định

1. **Tách lớp** (bản tổng hợp §2): **thực thể** (hồ sơ, đơn, dòng dịch vụ, lần thu, phiếu sổ, dòng nợ) — **vai trong ngữ cảnh** (bên đặt/người hưởng, người phụ trách, người thu, người bán trên biên nhận [lượt 2], nhà cung cấp của dòng [lượt 2]) — **chính sách theo ngày** (lượt 2, module `pricing`) — **luật tính** (hàm thuần một nơi, có test). Không cờ `is_agent`/`is_supplier` trên hồ sơ, không điều khoản trên tài khoản đăng nhập (ADR-0018 điều 1), không viết cứng id trong mã. **Người hưởng** suy ra: bên đặt của đơn có vai nhóm `EXTERNAL` đang mở (view công bố `v_pty_open_role_group`, `migrations/0024:26`).
2. **Lần thu** — bảng `bil_payment_receipt` (tên đã giữ chỗ ở ADR-0002), **chỉ-thêm**, mỗi dòng:
   - `order_id` (khoá ngoại `NO ACTION`), `amount` `INTEGER` VNĐ `> 0`, loại **thu của khách** / **trả lại khách**;
   - **người thu** `collector_party_id` (hồ sơ cụ thể — không phải "HDV đang phụ trách"; `NULL` chỉ khi vai = "chưa rõ") + **vai người thu** (bảng tra cứu: *Công ty*, *Nhân viên*, *Bên đặt (người hưởng)*, *Nhà cung cấp* — dùng từ lượt 2, *Chưa rõ* — chỉ cho cọc cũ);
   - **hình thức** (bảng tra cứu `bil_payment_method`: tiền mặt, chuyển khoản, khác — tập mở, ADR-0003 điều 3);
   - **thu cho ai** `collected_for_party_id` (lượt 1 luôn là hồ sơ Tour Đảo — ADR-0024 điều 6; lượt 2 là người bán của phần tiền);
   - **giai đoạn**: trả trước / lúc "Đã giao";
   - `reverses_id` (dòng đảo trỏ dòng gốc, mỗi dòng gốc đảo tối đa một lần), ghi chú; đủ bốn cột WHO.
   - **Ai được ghi tên ai làm người thu:** người không phải Kế toán/Toàn quyền chỉ ghi được **chính mình** hoặc **Công ty** làm người thu; Kế toán/Toàn quyền ghi được bất kỳ ai (thận trọng, H3/H4).
3. **Phiếu sổ và dòng nợ hai chân** — bảng `bil_posting` (phiếu: loại, đơn, lý do, phiếu bị đảo) và `bil_debt_line` (dòng), **chỉ-thêm**:
   - Mỗi dòng: **ai nợ** (`debtor_party_id`) — **ai được nợ** (`creditor_party_id`, khác bên nợ) — **số tiền `> 0`** — **loại** (bảng tra cứu: *tiền đang giữ hộ*, *quyết toán*, *hoàn khách*; từ lượt 2 thêm *mua giá đại lý*, *hoa hồng*, *giá vốn nhà cung cấp*, *tiền thu hộ*) — đơn, dòng dịch vụ (nếu có), lần thu (nếu có).
   - Loại phiếu (bảng tra cứu): *lần thu*, *Đã giao*, *xác nhận công ty đã nhận*, *quyết toán*, *hoàn khách*, *điều chỉnh*, *đảo*.
   - **Dòng đảo** = cùng số, đổi chỗ hai bên, trỏ dòng gốc. **Số dư là view**, không lưu cột.
   - Chọn sổ hai chân (không phải "số có dấu theo góc Tour Đảo") vì ghi được nợ giữa hai bên không phải Tour Đảo nếu sau này cần, dòng đảo rõ, đủ cho 30 người mà chưa cần hệ thống tài khoản kế toán (bản tổng hợp §4).
4. **Luật sinh dòng** (hàm thuần một nơi trong `billing`; test chấp nhận = các ví dụ §5.1 và §5.2 A/B của đặc tả gốc, từ lượt 2 cho phần thương mại):
   - **Lần thu của khách, người thu không phải Công ty** ⇒ ngay lúc ghi: dòng *tiền đang giữ hộ* — người thu nợ Tour Đảo đúng số đó. *(Khác thời điểm với bản tổng hợp §4 — "sinh dòng khi Hoàn tất" — số cuối như nhau; ghi ngay để "Bạn đang giữ…" luôn đúng, đơn huỷ có cọc có chỗ ghi, người phụ trách cũ vẫn thấy nợ. Người kiểm xin xem kỹ điểm này.)*
   - **Người thu = Công ty, do người không phải Kế toán khai** (H3) ⇒ dòng *tiền đang giữ hộ* trên **người khai** cho tới khi Kế toán bấm "Công ty đã nhận" (phiếu xác nhận = dòng đảo của dòng đó). Kế toán tự ghi ⇒ không có dòng.
   - **"Đã giao"** (ADR-0025) ⇒ một phiếu *Đã giao* cho đơn. Lượt 1 phiếu này **không có dòng thương mại** (đơn khách lẻ, Tour Đảo bán); lượt 2 sinh dòng *mua giá đại lý*, *tiền thu hộ*, *hoa hồng*, *giá vốn* từ **số đã chụp lúc Xác nhận** (H5), không tra lại cài đặt.
   - **Tiền là số đã lưu:** luật chỉ đọc số tiền đã lưu trên đơn/dòng (sau điều chỉnh, máy chủ tính), không tính lại từ cài đặt hiện hành.
5. **Nộp / trả / hoàn — tối thiểu, Kế toán ghi** (H4): "X đã nộp Y về công ty", "công ty đã trả X số Y" (đối tác, sau này nhà cung cấp), "đã hoàn khách Y (người trả: X)". Mỗi việc là một phiếu với dòng *quyết toán* / *hoàn khách* ngược chiều, **phân bổ theo đơn** (Kế toán chọn đơn; một lần nộp nhiều đơn = nhiều dòng trong một phiếu). Khoản chưa được Kế toán ghi thì chưa coi là đã nộp/đã trả (thận trọng).
6. **Chỉ-thêm ở CSDL:** trigger chặn `UPDATE`/`DELETE` trên `bil_payment_receipt`, `bil_posting`, `bil_debt_line` (mẫu `0017`, `0021`); `CHECK` `amount > 0`, `debtor ≠ creditor`; test migration thấy SQL chạy tay bị chặn (hàng rào 3 của bản tổng hợp §9).
7. **"Sổ của tôi":** mọi tài khoản nội bộ xem được **nợ của chính hồ sơ mình** (ô `ledger.view` phạm vi `own`, điều 10), kể cả với đơn mình **không còn** phụ trách hay không còn thấy: mã đơn, ngày, loại dòng, số tiền, số dư — **không** tên/SĐT khách. Màn Kế toán xem sổ mọi bên (`ledger.view` = `any`).
8. **Sai sót sau "Đã giao"/"Hoàn thành"** (Q6): Kế toán/Toàn quyền ghi phiếu *điều chỉnh* hoặc *đảo*, **lý do bắt buộc**, nhật ký; đơn không đổi, không mở lại.
9. **Ba cột cọc cũ** (`orders.deposit_amount`, `deposit_method`, `remaining_amount` — `migrations/0003`), làm **trong cùng lần triển khai** thêm `bil_payment_receipt` (thoả ADR-0004 "Hệ quả"):
   - **Ngừng đọc:** mọi bề mặt "đã trả trước / còn lại" lấy số từ `billing` (route của `billing`; `orders` không đọc `bil_` — ADR-0024 điều 4). Bề mặt phải đổi (đã dò bằng `grep`): `src/shared/contracts.ts`, `src/shared/order-confirmation.ts`, `src/modules/orders/repository.ts`, `src/modules/orders/rules.ts`, `src/modules/orders/money-adjustment.ts` (`effectiveMoney`), `web/order-card.ts`, `web/order-form.ts`, `web/orders.ts`, `web/order.ts`.
   - **Ngừng mang nghĩa khi ghi:** đơn mới ghi `deposit_amount = 0`, `deposit_method = NULL`, `remaining_amount = total`. Trigger `orders_money_*` (`0007`) **vẫn đòi** `remaining_amount = total − deposit_amount ≥ 0`, nên với đơn cũ có cọc, câu sửa vẫn phải giữ đúng phép trừ đó (chỉ để thoả trigger, không ai đọc). Không sửa `0007`.
   - **Chuyển cọc cũ:** mỗi đơn có `deposit_amount > 0` (kể cả đơn đã huỷ) → **một lần thu** "trả trước", hình thức lấy từ `deposit_method`, **người thu "chưa rõ"**, người ghi = hệ thống. Đơn còn lần thu "chưa rõ" **không bấm "Đã giao" được** (ADR-0025 điều 3e) cho tới khi Kế toán đảo nó và ghi lại đúng người thu. (Câu chuyển là câu một lần trong migration đọc cột của `orders` — ghi rõ ở sổ dữ liệu; không phải mã chạy.)
   - **Form lập đơn:** phần "đã thu trước" **không còn nằm trong lô tạo đơn** (lô của `orders` không chứa câu của `billing`); trình duyệt gọi route ghi lần thu của `billing` **sau** khi đơn đã lưu. Lỗi ở bước hai: "Đơn đã lưu, chưa ghi được tiền trả trước — thử lại" (không mất đơn).
   - Sổ dữ liệu khai ba cột "không dùng nữa — xem ADR-0026".
10. **Ô quyền** (chi tiết theo vai ở trang ghép):
    - `payment.receive` (ghi lần thu trước "Đã giao"): `SALES` `own` (giữ), `ACCOUNTING` `any`, `ADMIN` `any`, `SUPER_ADMIN` `any`, **`FIELD` `none` → `assigned`**, **`PARTNER` `none` → `own`**, **`INTERN` `none` → `own`**. Ba ô đổi chỉ để **giữ năng lực hôm nay**: ai đặt được tiền cọc trên form đơn của mình hôm nay thì ghi được lần thu trả trước trên đơn đó; hướng dẫn viên đang phụ trách ghi được tiền mình thu trước chuyến. Sau "Đã giao" không ai ghi lần thu mới trên đơn (chỉ Kế toán ghi phiếu điều chỉnh).
    - `payment.refund` (ghi hoàn khách): `ACCOUNTING` `any`, `SUPER_ADMIN` `any`; **`ADMIN` `any` → `none`** (siết theo H4 "Kế toán ghi").
    - **`ledger.view`** (mới): `ACCOUNTING`, `SUPER_ADMIN` = `any`; `SALES`, `ADMIN`, `FIELD`, `INTERN` = `own` (sổ của chính mình); `PARTNER` = `none` ở lượt 1 (đơn có người hưởng chưa vào sổ — điều 12; mở `own` ở lượt 2).
    - **`ledger.write`** (mới — xác nhận "công ty đã nhận", nộp/trả, điều chỉnh, đảo): `ACCOUNTING`, `SUPER_ADMIN` = `any`; còn lại `none`.
    - Mỗi ô mới phải có route hỏi nó **trong cùng bản phát hành**; nếu không thì vào `docs/quyen-hoan.json` với người chịu trách nhiệm và hạn (bài kiểm "mỗi ô được máy chủ hỏi" đỏ). Hai mục `payment.receive`, `payment.refund` đang hoãn ở tệp đó phải được gỡ khi có route (bài kiểm "hoãn thừa").
11. **Biên nhận theo danh sách trắng** (Q3; mở rộng LC-5/LC-7): module `receipt` (ADR-0024) dựng **`ReceiptDto` ở máy chủ** chỉ từ trường được phép — hồ sơ công ty; mã đơn; nhãn trạng thái; người phụ trách (ba trạng thái — ADR-0020 điều 9); tên/SĐT khách như hôm nay; từng dịch vụ (tên, ngày giờ, đón, số khách, **đơn giá bán lẻ**, thành tiền); tạm tính, giảm giá, tổng; **đã trả trước**, **còn lại** (lượt 2: chia phần theo người bán, "thanh toán tại quầy <người bán>" — Q7). **Không bao giờ** có: a%, giá vốn, chiết khấu, hoa hồng, quyết toán nhà cung cấp/đại lý, công nợ hay tên người thu, hình thức thu. `OrderDetailDto` **không bao giờ** mang giá vốn/chiết khấu (đi ở route sổ, ô riêng). Trình duyệt chỉ vẽ `ReceiptDto`; `buildConfirmation(order: OrderDetailDto …)` (`src/shared/order-confirmation.ts:220`, nhận cả đơn) được thay. **Test:** đưa một số lạ (vd 480.017) vào **mọi** ô bí mật của đơn/sổ → quét toàn bộ `ReceiptDto` (JSON) không thấy; phải thấy đỏ một lần khi thêm tạm một trường giá vốn vào `ReceiptDto` (hàng rào 2 của bản tổng hợp §9).
12. **Giới hạn của lượt 1** (chưa có chính sách của lượt 2):
    - Đơn **có người hưởng** (bên đặt mang vai bên ngoài) **không** bấm "Đã giao" được cho tới lượt 2 — tránh đơn bị khoá với hoa hồng 0 vĩnh viễn (bản tổng hợp §8). *Xem M1.*
    - Vai người thu *Nhà cung cấp* chưa dùng được ⇒ đơn có phần khách trả tại quầy nhà cung cấp tự nhiên không "đã thu = phải thu", không "Đã giao" được tới lượt 2.
    - Đơn có dịch vụ "làm đại lý" (vd i-resort) mà hướng dẫn viên thu đủ: lượt 1 **không biết** dòng nào là "làm đại lý" (dữ liệu của D5) ⇒ phiếu "Đã giao" thiếu dòng giá vốn. *Xem M1.*
13. **Bất biến vào `scripts/audit-invariants.mjs`** (mã `R-BIL-*`), **chia theo lượt** để kiểm không "xanh vì rỗng":
    - **Chạy từ lượt 1:** `R-BIL-1` (I1) đơn đã "Đã giao": tổng lần thu còn hiệu lực = phải thu hiện hành; `R-BIL-3` (I3) dòng đảo khớp dòng gốc (cùng số, đổi chỗ, mỗi gốc đảo tối đa một lần) — cho cả lần thu lẫn dòng nợ; `R-BIL-4` (I4) đơn đã "Đã giao" có **đúng một** phiếu *Đã giao*, đơn chưa "Đã giao" không có; `R-BIL-6` không đơn đã "Đã giao" nào còn lần thu "chưa rõ"; `R-BIL-7` đúng một hồ sơ Tour Đảo (ADR-0024 điều 6).
    - **Chạy từ lượt 2** (trước đó in "chưa áp dụng", không in "đạt"): `R-BIL-2` (I2) phần Tour Đảo = giá bán − giá vốn − hoa hồng theo **số đã lưu**; `R-BIL-5` (I5) mỗi dòng dịch vụ của đơn đã chụp có người bán.

## Lý do

- **Đúng phát sinh thực tế** (Q2): tiền nằm ở đâu, ai đang cầm, ai nợ ai — mỗi lần thu có người thu và hình thức; nợ của HDV chỉ là phần HDV thu.
- **Thận trọng** (H3, H4): khoản làm giảm nợ của chính người khai, hoặc nói "đã nộp/đã trả", chỉ có hiệu lực khi Kế toán ghi.
- **Chỉ-thêm + dòng đảo** (ADR-0003 điều 8, ADR-0004): không mất dấu vết; số dư luôn tính lại được từ dòng.
- **Cọc cũ "chưa rõ" chặn "Đã giao"**: không đoán người giữ cọc (Q34 cũ đoán "đối tác") lên sổ; Kế toán xác nhận một lần.
- **Danh sách trắng thay vì "lấy cả đơn rồi bỏ bớt"**: thêm một trường bí mật mới vào đơn không thể tự lọt ra biên nhận.

## Phương án bị loại

- **Sổ "số có dấu theo góc Tour Đảo"** (người phản biện kiến trúc đề xuất) — không ghi được nợ giữa hai bên khác; dòng đảo kém rõ.
- **Cột "người giữ cọc" trên `orders`** (Q34 cũ) — người giữ là vai của từng lần thu.
- **Gỡ ngay ba cột cọc** — dựng lại `orders` và trigger `0007` (ADR-0003 điều 10).
- **Giữ ba cột cọc song song với sổ** — hai nguồn "đã trả" (ADR-0004, N7).
- **Tin số "Công ty thu – CK" do HDV khai** — H3 bác.
- **Sinh mọi dòng chỉ lúc "Đã giao"** (bản tổng hợp §4) — đơn huỷ có cọc và HDV bị đổi đơn không có chỗ ghi tiền đang giữ.
- **Cho đơn có người hưởng "Đã giao" với hoa hồng 0** — khoá vĩnh viễn một số sai.

## Hệ quả

- **Dữ liệu (một migration, chỉ thêm):** `bil_payment_method`, bảng tra cứu vai người thu, loại phiếu, loại dòng; `bil_payment_receipt`, `bil_posting`, `bil_debt_line` (khoá ngoại `NO ACTION`, không `CASCADE`, đủ bốn cột WHO, trigger chỉ-thêm); view số dư (`v_bil_…`); chuyển cọc cũ; mục mới ở `docs/data-dictionary.json` + `npm run dict`. Tên bảng/mã là **đề xuất**, chốt ở kế hoạch. Số migration lấy lúc thi công (`CLAUDE.md` §10; `0019` đang giữ chỗ cho B5).
- **Mã:** `src/modules/billing/` (repository nghiêm, luật sinh dòng thuần, route ghi thu, sổ, "Sổ của tôi", nộp/trả/hoàn, xác nhận công ty đã nhận); `src/modules/receipt/` (route biên nhận, `ReceiptDto`); `src/shared/permissions.ts` (việc lớn); chín bề mặt ở điều 9; `web/` màn sổ Kế toán, "Sổ của tôi", khối lần thu trên đơn.
- **Tiêu chí nghiệm thu (đỏ trước, xanh sau):**
  1. Ví dụ §5.1 (và biến thể CTV giữ cọc), §5.2 A và B của đặc tả gốc thành test của luật sinh dòng (phần thương mại bật ở lượt 2; lượt 1 kiểm phần *giữ hộ*, *quyết toán*, *hoàn khách*).
  2. HDV thu 1.000.000 tiền mặt → "Bạn đang giữ 1.000.000 ₫"; khai "Công ty thu – CK" 500.000 → vẫn giữ 500.000 tới khi Kế toán xác nhận; Kế toán ghi "đã nộp" → về 0.
  3. HDV A thu trước, đơn chuyển sang HDV B → A vẫn thấy nợ ở "Sổ của tôi", không mở được đơn.
  4. Người không phải Kế toán ghi người thu là người khác → 400; `PARTNER` ghi lần thu cho đơn người khác → 403; ghi lần thu sau "Đã giao" → từ chối.
  5. Sửa/xoá dòng sổ bằng SQL chạy tay → trigger chặn.
  6. Sau migration: tổng lần thu "chưa rõ" = tổng `deposit_amount` cũ; không bề mặt nào còn đọc ba cột (dò bằng test).
  7. Biên nhận: số lạ 480.017 không xuất hiện; biên nhận dựng ở máy chủ; `web/` không còn gọi `buildConfirmation(OrderDetailDto)`.
  8. `audit-invariants` có các mã `R-BIL-*` lượt 1; cố ý chèn một dòng đảo sai số → báo vi phạm (thoát 1).
  9. Bài kiểm "mỗi ô được máy chủ hỏi" xanh với bốn ô mới, không mục hoãn thừa.
- **Tài liệu (mô tả, sửa cùng commit thi công):** `docs/SYSTEM-DESIGN.md` §5–§8, `docs/CHANGE-GUIDE.md` (công thức "thêm loại dòng/hình thức thu = thêm dòng tra cứu + luật"), `SPEC-tourdao-sales.md` §1 nếu cần (ADR-0004 đã mở), nhật ký thay đổi lời thường.
- **Việc lớn** (dữ liệu + tiền + quyền): người kiểm độc lập chỉ-đọc sau thi công.

## Câu hỏi mở

**M1 — Lượt 1 chưa có chiết khấu/giá vốn (lượt 2). Đơn nào được bấm "Đã giao" trong khoảng giữa?** (bản tổng hợp §8 để ngỏ "chọn khi soạn D2")
- **A (khuyến nghị):** chặn "Đã giao" cho đơn **có người hưởng** (bên đặt là đối tác). Đơn khách lẻ có dịch vụ "làm đại lý" (i-resort) mà HDV thu đủ vẫn "Đã giao" được; khi lượt 2 lên, `R-BIL-2` liệt kê các đơn thiếu dòng giá vốn và Kế toán bổ sung bằng phiếu điều chỉnh có lý do. Được: phần lớn đơn khách lẻ chạy ngay. Mất: một số đơn i-resort cần Kế toán bổ sung tay sau.
- **B:** chặn mọi "Đã giao" tới lượt 2; lượt 1 chỉ ghi lần thu, tiền đang giữ, nộp/hoàn. Được: không đơn nào khoá với số thiếu. Mất: chưa dùng được bước Đã giao/Hoàn thành tới lượt 2.
- **C:** cho mọi đơn "Đã giao"; Kế toán nhập tay hoa hồng/giá vốn có lý do ngay lúc đó. Được: không chờ. Mất: số nhập tay, dễ sai, trái tinh thần "chụp tự động" (H5).

**M2 — "Còn lại" âm (việc MỞ, chưa quyết, `docs/CHANGE-GUIDE.md` §4 mục 32):** hướng dẫn viên giảm số khách làm tổng < tiền đã trả trước vẫn được lưu (`src/modules/orders/money-adjustment.ts:215-218`); một luật chặn 409 từng bị thêm nhầm rồi gỡ ngày 2026-09-25 vì tạo ngõ cụt. Mục đó giao việc này cho **thiết kế sổ thu/hoàn tiền (ADR này)**. Hướng xử lý đề xuất: **không** chặn việc sửa số khách; phần thừa là khoản **"công ty phải trả lại khách"**, được giải bằng **hoàn khách do Kế toán ghi** (điều 5, H4); cho tới khi hoàn xong, đơn không "Đã giao" được (ADR-0025 điều 3d — không ghi "công ty nợ khách" trên sổ, H2). Màn đơn hiện "Khách đã trả dư X ₫ — chờ Kế toán hoàn". Chủ xác nhận hướng này khi duyệt lượt 1; tới lúc đó **đừng tự thêm lại luật chặn** ở đường sửa số khách.

**Mở, không tự hoà giải (trình chủ bằng ADR riêng, không chặn lượt 1):** ADR-0003 (mọi bảng mới có cột WHO, cấm `CASCADE`) và bảng `order_money_adjustment` (`migrations/0021`: cố ý **không** có cột WHO — nối `audit_log` theo ADR-0007 điều 2 — và có `ON DELETE CASCADE`) lệch nhau giữa hai ADR đã duyệt. Bảng sổ mới của ADR này theo đúng ADR-0003, nên không bị ảnh hưởng. Cách xử lý (ghi làm lệch có chủ ý ở `docs/SYSTEM-DESIGN.md` §16, ADR sửa ADR-0003 thêm ngoại lệ, hay dựng lại bảng) là quyết định của chủ.
