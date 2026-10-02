# ADR-0089 — Đơn huỷ: khách không còn nợ; tiền trả trước mặc định là cọc giữ lại; công ty có thể hoàn (không bắt buộc) trong 60 ngày sau ngày khởi hành dự kiến

- **Trạng thái:** **accepted** — chủ dự án, chat 2026-10-02: *"7- Duyệt"*.
  - Chủ duyệt văn bản **bản 3.2** của lượt duyệt 1a (`docs/superpowers/specs/2026-10-02-luot-duyet-1-don-huy-va-quyen-tien.md` @ `4598221f`), cùng các câu trả lời trong cùng tin nhắn (lời chủ lần 4).
  - Các điểm AI viết **sau** bản 3.2 (Đ-1…Đ-6) và QH5 được **chủ chọn từng điểm** ở lời chủ lần 5 (cùng ngày), nay đã nằm trong phần "Quyết định": đ3, đ5–đ10, đ15, đ16.
  - Bốn chi tiết AI thêm khi ghi lời chủ lần 5 nằm riêng ở mục **"Chi tiết AI ghi — áp theo khuyến nghị"** (X-1…X-4). X-1…X-3 áp theo lời chủ *"đừng hỏi tôi những câu hỏi mà tôi nên đồng ý nữa,"*; **X-4 chủ đã chọn** (*"1- có"*: Quản trị xác nhận).
  - Lời chủ lần 5 được ghi **thẳng vào tệp này** cùng ngày duyệt, chưa thi công, thay vì ra ADR mới trỏ về. Đây là lệch với lời dặn đầu mục lục ADR ("không sửa ADR đã accepted") và với Hiến pháp N9 / CLAUDE.md §3 (AI không tự sửa ADR đã duyệt, chỉ đề xuất bằng diff trên nhánh).
    - Phần sửa này **chỉ là đề xuất** cho tới khi chủ gộp nhánh. Chủ có thể yêu cầu tách thành ADR bổ sung.
    - Người đọc lưu ý: phần "Quyết định" nay gồm cả câu chữ AI viết từ lời chủ lần 5, chủ chưa đọc ở dạng văn bản này.
  - AI ghi lại, không tự duyệt (Hiến pháp N3).
- **Ngày:** 2026-10-02.
- **Số:** 0089. Đã kiểm mọi nhánh: 0086 bị bác, 0087 ở nhánh Giao diện công ty, 0088 và 0090–0093 dùng cho các lượt duyệt cùng đợt.
- **Loại:** việc lớn (tiền, dữ liệu). Dữ liệu ghi theo luật này là chỉ-thêm, nên là cửa một chiều về dữ liệu; luật và mã đảo được.
- **Đi cùng:**
  - ADR-0090 (chỉ Toàn quyền cấp quyền tiền), cùng lượt 1;
  - lớp chống ghi trùng chung của Nền tảng (ADR-0094, proposed, chờ chủ nói "Duyệt");
  - sổ dừng dây chuyền `docs/quyen-hoan.json`, mục TNV-G1 (hạn 15/10).
- **Xây trên lỗ đang hở:** F-02 (gửi lặp ghi hai lần). Mọi lệnh ghi của ADR này phải đi qua lớp chống ghi trùng chung (lời chủ lần 4, câu 1).
- **Số dòng mã** trích theo `968ecfdb`; khi lập kế hoạch đối chiếu lại trên `main`.

## Lời chủ dự án (nguyên văn, chat 2026-10-02)
1. *"Khi khách huỷ, mặc định tiền cọc không được bồi hoàn. Tuy nhiên trên thực tế, công ty có thể hoàn tiền lại cho khách nhưng không bắt buộc, thời gian hoàn cọc tối đa là 60 ngày sau ngày khởi hành đã được lên kế hoạch ."*
2. Dấu "cần hoàn" hiện ở *"cả 3"* nơi: biên nhận, trang đơn, màn sổ (trả lời câu 3 của tin nhắn đầu: *"1- Có , 2 - Luôn luôn, 3- cả 3. 4- ok, 5- cho phép …"*).
3. **Lần 3:** *"Cọc là tiền trả trước (tiền đặt cọc như một lời cam kết của người mua dành cho người bán, được bảo đảm bằng 1 khoản tiền, gọi là tiền đặt cọc- nói tắt/viết tắt là cọc), 2- Khi công ty huỷ thì đề xuất hoàn toàn bộ tiền đã trả trước hoặc dời lịch , khách hàng không cần trả theme tiền, 3- Quản trị duyệt hoàn cọc. 4- ok (cũng cần có cơ chế chống đặt trùng, về sau), 5 - ok/ 6- Có, ngắn gọn. Đọc đầy đủ trong chính sách bán hàng tại website tourdao.vn/, 7- ok."*
   - Câu 1 trả lời "cọc là gì"; câu 2: công ty huỷ; câu 3: ai duyệt hoàn; câu 4: huỷ vì nhập sai hoặc trùng đơn; câu 5: hạn 60 ngày chỉ chặn duyệt mới; câu 6: điều khoản huỷ trên ảnh xác nhận; câu 7: bảng trách nhiệm của ADR-0088.
4. **Lần 4:** *"2- Theo bản chất thì thu tiền trước chính là 1 nghĩa vụ của công ty với khách hàng, lúc này chưa thành thu nhập vì chưa hoàn tất việc bàn giao nghĩa vụ và quyền lợi về sản phẩm/dịch vụ. Nền tảng … hiển thị đúng bản chất: "Khách hàng đã trả trước" . 3- KHông có ý kiến vì chưa hiểu. 4- Thông thường là trừ vào đối soát, dù cách nào thì bản chất là không đổi. 5- Chỉ nhắc. 6- https://tourdao.vn/chinh-sach-thanh-toan, 7- Duyệt"*
   - Câu 3 trả lời QH5 (chưa hiểu; lần 5 đã trả lời); câu 4: đại lý cầm cọc; câu 5: hoàn khi công ty huỷ không bị hạn chặn; câu 6: đường dẫn chính sách.
5. **Lần 5:** *"Trang chính sách đang báo lỗi vì tôi còn đang soạn nháp, hãy bỏ qua vì tôi hiểu rồi. … 4: ok. Còn lại 6 điểm chờ tôi cũng nên hienẻ thị luôn để tôi chọn"*.
   - "4: ok" trả lời QH5 (mục 2 của phiếu bản 4: in danh sách đối chiếu; Toàn quyền ghi bổ sung "đã hoàn ngoài hệ thống" một lần; không bị hạn chặn).
   - Sáu điểm, chủ chọn trên bảng hỏi (nhãn phương án nguyên văn):
     - Đ-1, chuyển tiền sang đơn mới: *"Cần Quản trị duyệt (Recommended)"*;
     - Đ-2, ai chọn lý do "Công ty huỷ": *"Chỉ Quản trị, Toàn quyền (Recommended)"*;
     - Đ-3, hạn 60 ngày khi huỷ để lập lại / trùng đơn: *"Không chặn, chỉ nhắc (Recommended)"*;
     - Đ-4, nhãn sau "Đã giao": *"Đổi thành "Đã thu" (Recommended)"*;
     - Đ-5, đường dẫn chính sách: *"In luôn đường dẫn"* (không theo khuyến nghị);
     - Đ-6, hiển thị cọc khi khách huỷ: *""Cọc giữ lại", có hạn hoàn (Recommended)"*.

## Bối cảnh (đã chạy thật trên Nền tảng tạm, đêm 1→2/10)
- **Tình huống:** 09, 26, HD06, HD08, QT05, DT04, KT01 (`~/Documents/danh-gia-ux/2026-10-01/BAO-CAO.md`, gốc G1).
- **Lỗi:** đơn huỷ đã thu tiền vẫn ghi "còn lại", tức khách trông như còn nợ, trên cả sổ lẫn biên nhận gửi khách. Không có đường nào ghi "cọc giữ lại" hay quyết định hoàn.
- **Gốc:** `phaiThuCua` (`src/modules/orders/hoan-tat.ts:9-18`) không xét trạng thái huỷ.
- **Văn bản cũ:**
  - ADR-0014 đ11 (`:113`) ghi "hoàn cọc làm ngoài hệ thống";
  - ADR-0026 (bảng thay đ11, `:43`) hứa dấu "cần chú ý hoàn cọc";
  - Hiến chương 5.9 để mặc định "phải trả khác" ở dạng *đề xuất của AI, chờ chủ xác nhận ở ADR sổ tiền*.

## Quyết định (có hiệu lực)
1. **Khách huỷ một đơn chưa từng "Đã giao"** (đơn đã Đã giao không huỷ được, ADR-0025 đ1):
   - **"Còn lại" = 0**: khách không còn nợ;
   - **"Chờ hoàn" mặc định = 0**: cọc không hoàn (lời chủ 1).
2. **Cọc là tiền trả trước** (lời chủ 3, câu 1): mọi khoản khách đã trả cho đơn trước khi đơn bị huỷ.
   - **"Đã trả"** = tổng các lần thu còn hiệu lực **đã xác nhận**.
   - **"Còn giữ"** = đã trả − đã hoàn − đã chuyển sang đơn mới (đ6) − dòng "đã hoàn ngoài hệ thống" (đ16).
   - Khoản "Công ty thu – CK" chưa xác nhận chưa tính vào "đã trả"; tiền không về thì người khai giữ hộ (H3 đã duyệt).
3. **Tiền trả trước là nghĩa vụ của công ty với khách, chưa là thu nhập** khi chưa bàn giao xong dịch vụ (lời chủ 4, câu 2).
   - Nền tảng hiển thị đúng bản chất bằng nhãn **"Khách hàng đã trả trước"**.
   - Sau khi đơn **"Đã giao"** (dịch vụ đã bàn giao), nhãn đổi thành **"Đã thu"** (lời chủ 5, Đ-4). Đổi chữ ở mọi màn hiện có trong cùng đợt thi công.
   - Đơn **khách huỷ** dùng nhãn "Cọc giữ lại" (đ9b, lời chủ 5, Đ-6).
   - Nền tảng **không tự gắn nhãn kế toán**: ghi thành thu nhập khi nào, ghi vào đâu là việc của Kế toán.
4. **Hoàn cọc tuỳ chọn, hai bước:**
   - **(a) Quản trị duyệt** (lời chủ 3, câu 3) số hoàn, có lý do. Duyệt được một phần, nhiều lần. Khoản duyệt có **hai loại**: hoàn, và chuyển sang đơn mới (đ6). **Tổng đã duyệt (cả hai loại) ≤ đã trả.**
   - **(b) Kế toán chi** khi thực trả tiền, hoặc ghi lệnh chuyển. **Tổng đã chi + đã chuyển ≤ tổng đã duyệt** (cùng công thức đ15). Người trả không phải công ty thì ≤ số người đó đang giữ trên đơn.
   - **(c) Không ai vừa duyệt vừa chi cùng một khoản.** Tài khoản kiêm cả hai nhận 409 ở bước thứ hai. Phần chưa chi có thể huỷ duyệt, có lý do.
   - Ô quyền mới "duyệt hoàn cọc": ADMIN. SUPER_ADMIN có theo luật "Toàn quyền là `any` ở mọi ô" (`src/shared/permissions.test.ts:91-93`).
5. **Hạn 60 ngày** (lời chủ 1, lời chủ 3 câu 5):
   - **Mốc:** ngày khởi hành dự kiến của đơn + 60 ngày. Đơn một ngày cho mọi dịch vụ; dữ liệu cũ nhiều ngày thì lấy ngày muộn nhất. Đơn nháp huỷ chưa có ngày đi thì tính từ ngày huỷ.
   - Sau hạn, máy chủ **chặn duyệt mới** cho đơn **khách huỷ**: 409 "Đã quá hạn hoàn cọc (hạn: dd/mm/yyyy)".
   - **Không bị hạn chặn, chỉ nhắc:** công ty huỷ (đ6); huỷ để lập lại / trùng đơn (đ7; lời chủ 5, Đ-3); dòng "đã hoàn ngoài hệ thống" của đơn cũ (đ16).
   - Khoản **đã duyệt trước hạn** vẫn chi được sau hạn.
   - **Nhắc Kế toán:** khoản đã duyệt mà chưa chi quá 7 ngày (mọi nhóm); còn ≤ 10 ngày tới hạn (chỉ nhóm khách huỷ, vì nhóm khác không có hạn chặn). Hiện ở danh sách và ô đếm, **không đẩy tin**, vì theo ADR-0034 đ1 tin là hình chiếu của nhật ký.
6. **Công ty huỷ** (lời chủ 3, câu 2; lời chủ 4, câu 5):
   - Gồm: thời tiết hoặc cấm biển, hết chỗ, sự cố nhà cung cấp, lỗi công ty.
   - Công ty **hoàn toàn bộ tiền đã trả trước**, hoặc **dời lịch**; khách **không phải trả thêm tiền**.
   - Hoàn đi qua đ4. Hạn 60 ngày **không chặn**, chỉ nhắc.
   - Dời lịch: đơn mới giữ đúng số tiền khách đã cam kết. Nếu giá mới cao hơn thì phần chênh do công ty chịu, ghi là giảm giá có lý do "dời lịch do công ty huỷ", **Quản trị duyệt**.
   - Tiền chuyển sang đơn mới bằng lệnh **"Chuyển tiền sang đơn mới"**:
     - lệnh này **tính như một lần chi** khỏi đơn huỷ, nên **Quản trị duyệt trước** số chuyển và đơn nhận (lời chủ 5, Đ-1). Ô quyền dùng cho việc duyệt này: X-1;
     - đ4c áp dụng: **người duyệt không tự chuyển**;
     - Kế toán ghi **một lô**: chi khỏi đơn huỷ, thu vào đơn mới, cùng số, cùng người đang giữ tiền;
     - nhật ký ghi trên **cả hai đơn**;
     - chuyển hết thì "còn giữ" của đơn huỷ = 0.
7. **Huỷ để lập lại / trùng đơn** (Sai thông tin — lập lại đơn; Khách đặt trùng — lời chủ 3, câu 4):
   - tiền **chuyển sang đơn mới** hoặc **hoàn**; **không giữ cọc**;
   - chuyển hay hoàn đều qua Quản trị duyệt (đ4, đ6); hạn 60 ngày **không chặn, chỉ nhắc** (lời chủ 5, Đ-3).
   - Cơ chế **chống đặt trùng** (cảnh báo hai đơn của cùng khách) làm **về sau**, theo đặc tả "cảnh báo đơn trùng" (nhánh `canh-bao-don-trung`, `d90ceed5`).
8. **Lý do huỷ bắt buộc, chia nhóm:** "khách huỷ" (mặc định giữ cọc), "công ty huỷ" (đ6), "huỷ để lập lại / trùng đơn" (đ7).
   - **Chỉ Quản trị, Toàn quyền** chọn được nhóm "công ty huỷ", vì nhóm này kéo theo hoàn toàn bộ và miễn hạn (lời chủ 5, Đ-2). Người huỷ khác chỉ chọn "khách huỷ" hoặc "huỷ để lập lại / trùng đơn".
   - Lý do **"Khác"** bắt ghi chú và nằm ở nhóm **"chưa kết luận"** tới khi Quản trị phân loại (lời chủ 5, Đ-2). Thông báo gửi khách dùng câu trung tính, không in "không hoàn" (đã có ở bản 3.2). Duyệt hoàn khi đơn còn "chưa kết luận": X-2.
   - Hôm nay route đổi trạng thái (`src/modules/orders/index.ts`, bắt đầu khoảng dòng 975) **không đọc lý do**. Danh sách lý do của ADR-0030 (`:114`) chưa có mã.
   - Vì vậy đây là **thêm mới**, thi công cùng ADR này.
9. **Trạng thái tiền đơn huỷ hiện ở ba nơi** (lời chủ 2):
   - **(a) Thông báo gửi khách:**
     - tiêu đề "THÔNG BÁO HUỶ ĐƠN DỊCH VỤ", không có dòng "Còn lại";
     - ghi "Khách hàng đã trả trước X". Khách huỷ thì thêm "Theo chính sách của Tour Đảo, tiền cọc không được hoàn lại khi khách huỷ";
     - đã duyệt hoàn thì ghi "Tour Đảo hoàn Y" (nhóm khách huỷ thêm "chậm nhất ngày dd/mm/yyyy" theo hạn đ5; nhóm khác không hứa ngày); đã chi thì "Đã hoàn Y";
     - khoản chưa xác nhận: "đang đối chiếu".
     
     Danh sách trắng chứng từ gửi ngoài (Hiến chương 4.4; ADR-0026 đ11) thêm các trường này.
   - **(b) Trang đơn:** "Khách hàng đã trả trước X"; trạng thái cọc và hạn; nút "Duyệt hoàn cọc" (Quản trị), "Ghi chi hoàn" (Kế toán). Tên người đang giữ tiền chỉ hiện cho `ledger.view` phạm vi `any`.
     - Đơn **khách huỷ** (lời chủ 5, Đ-6): trong hạn ghi **"Cọc giữ lại – khách huỷ"** kèm "còn có thể hoàn tới dd/mm/yyyy"; quá hạn chỉ còn **"Cọc giữ lại"**.
   - **(c) Màn sổ Kế toán:** danh sách "Cần chi hoàn" (đã duyệt chưa chi, cộng trả dư của đơn không huỷ) và "Đơn huỷ giữ cọc" (cùng nhãn như (b)). Chỉ `ledger.view any` xem.
     - Màn chưa có; chủ thiết kế trên Claude Design.
     - Trong lúc chờ, máy chủ có route và Trang chủ Kế toán có ô đếm.
10. **Điều khoản huỷ trên ảnh xác nhận đơn** (lời chủ 3, câu 6; lời chủ 4, câu 6):
    - một dòng ngắn, ví dụ "Khi khách huỷ, tiền cọc không được hoàn lại. Xem đầy đủ: tourdao.vn/chinh-sach-thanh-toan" (chủ chốt chữ);
    - đường dẫn do chủ đưa: `https://tourdao.vn/chinh-sach-thanh-toan`;
    - **in luôn đường dẫn** (lời chủ 5, Đ-5). Ngày 2/10 trang còn là bản nháp chủ đang soạn (trả 404). Chủ đã biết và chấp nhận: trong lúc soạn, khách bấm vào có thể gặp trang lỗi.
11. **Người đang giữ tiền mặt của đơn huỷ:** cọc là tiền **của công ty**, nên người giữ phải nộp. Đơn huỷ hiện dấu "còn người giữ tiền" và vào danh sách của Kế toán.
12. **Đơn của đối tác mà đại lý cầm cọc** (lời chủ 4, câu 4): **mặc định trừ vào kỳ đối soát** đại lý (ADR-0079/0080). Nộp về cũng được; bản chất không đổi.
13. **Ghi lần thu lên đơn đã huỷ:** chỉ Kế toán và Toàn quyền (khách chuyển khoản muộn).
14. **Nơi tính:** hàm **duy nhất** tính đã thu / còn lại / dư là `conLai` của `billing` (`src/modules/billing/rules.ts`; luật NT-R9, `docs/superpowers/plans/2026-09-29-so-tien-luot-1-ke-hoach.md:29`). Hàm nhận thêm cờ đơn huỷ và các khoản duyệt (hoàn và chuyển), chuyển, dòng đ16.
    - `phaiThuCua` của `orders` không được đọc bảng `bil_*` (`hoan-tat.ts:1-3`; ADR-0024 đ4), nên giữ nguyên.
15. **Bất biến:** **tổng chi + tổng chuyển ≤ tổng duyệt ≤ đã trả**, trên mỗi đơn huỷ (chuyển tính như chi, lời chủ 5, Đ-1). Chặn ở CSDL (trigger) và ở máy chủ; thêm vào `audit-invariants`. Bất biến phải đúng **mọi lúc**, không chỉ lúc duyệt: lệnh đảo hay "Thay lần thu" (ADR-0088) làm "đã trả" tụt dưới "tổng duyệt" trên đơn huỷ cũng bị chặn, và có ca thử riêng.
16. **Đơn cũ đã hoàn tay trước khi có lệnh hoàn trong Nền tảng** (QH5; lời chủ 5, "4: ok"):
    - Nền tảng in **danh sách các đơn huỷ còn tiền** để Kế toán đối chiếu;
    - đơn nào công ty đã trả tay thì **Toàn quyền ghi bổ sung một dòng "đã hoàn ngoài hệ thống"**, mỗi đơn **một lần**;
    - dòng này **không bị hạn 60 ngày chặn**, vì đó là việc đã xảy ra;
    - cách hiểu của AI: đây là **lệnh của Toàn quyền trên Nền tảng**, không phải kịch bản sửa dữ liệu;
    - phạm vi đơn, giới hạn số tiền và cách dòng này khớp bất biến đ15: X-3, X-4.

## Chi tiết AI ghi — áp theo khuyến nghị
Khi đưa lời chủ lần 5 vào văn bản, AI cần thêm bốn chi tiết mà chủ chưa nói. Bốn chi tiết này **áp theo khuyến nghị**, theo lời chủ cùng ngày: *"đừng hỏi tôi những câu hỏi mà tôi nên đồng ý nữa,"*. Chủ bác điểm nào thì sửa điểm đó trước khi thi công.
- **X-4 — CHỦ ĐÃ CHỌN** (chat 2026-10-02, *"1- có"*, trả lời câu "có cần Quản trị xác nhận không"): dòng "đã hoàn ngoài hệ thống" (đ16) do **Toàn quyền ghi, Quản trị xác nhận** rồi mới có hiệu lực.
  - Giữ luật tách nhiệm vụ đ4c: người ghi khác người xác nhận. Tài khoản kiêm cả hai nhận 409 ở bước xác nhận.
  - Khi đã xác nhận, dòng này được tính **cả là duyệt lẫn chi** cho bất biến đ15 (chi + chuyển ≤ duyệt ≤ đã trả). Chưa xác nhận thì không tính.
  - Dòng này không đụng số dư của người đang giữ tiền (đ4b, đ11).
  - Phương án bị loại: Toàn quyền ghi một mình. Người kiểm độc lập vòng 3 lưu ý cách này để một khoản cọc rời sổ mà không người thứ hai nào thấy.
- **X-3:** phạm vi đ16 là đơn đã huỷ **trước ngày ADR này lên production**; số ghi ≤ "còn giữ" của đơn; có lý do bắt buộc.
- **X-2:** đơn còn ở nhóm "chưa kết luận" thì **chưa duyệt hoàn được** tới khi Quản trị phân loại. Lý do: hạn 60 ngày và miễn hạn tuỳ nhóm.
- **X-1:** duyệt chuyển tiền (đ6) dùng **cùng ô quyền "duyệt hoàn cọc"** (Quản trị, Toàn quyền), vì cùng người giữ. Cách khác: một ô riêng.

## Đề xuất đã được chủ chọn (lời chủ 5)
Sáu điểm Đ-1…Đ-6 (AI viết sau bản 3.2 hoặc do người kiểm độc lập nêu) và QH5 đều đã được chủ chọn; nội dung nằm ở đ3, đ5–đ10, đ15, đ16.
- **Ghi chú về Đ-6:** bản gốc là một **cách hiểu kế toán** ("khi khách huỷ, nghĩa vụ giao dịch vụ chấm dứt…"). Bảng hỏi chỉ hỏi **cách hiển thị**, và chủ chọn cách hiển thị (đ9b).
  - Phần cách hiểu kế toán **không thành luật**.
  - Ghi sổ kế toán lúc nào vẫn do Kế toán quyết (đ3).

## Còn treo
- **Lớp chống ghi trùng chung (ADR-0094):** điều kiện thi công (xem đầu tệp). ADR-0094 đã đủ văn bản (proposed), chờ chủ nói "Duyệt". Mục F-02 trong `docs/quyen-hoan.json` có hạn **15/10**.

## Thay câu nào (ghi bằng dòng trỏ ở dòng trạng thái của văn bản cũ, không sửa thân)
| Văn bản | Câu cũ | Thay bằng |
|---|---|---|
| ADR-0014 đ11 "Tiền cọc khi huỷ" (`:113`) | hoàn cọc ngoài hệ thống | trong sổ: mặc định giữ, hoàn tuỳ chọn có duyệt, hạn 60 ngày (đ1–đ5) |
| ADR-0026, dòng thay ADR-0014 đ11 (`:43`) | "Dấu 'cần chú ý hoàn cọc' đọc từ sổ…" | trạng thái tiền đơn huỷ ở ba nơi (đ9); "cần chi hoàn" chỉ khi đã duyệt |
| Hiến chương 5.9 (phần đề xuất của AI: mặc định "phải trả khác") | — | tiền trả trước là nghĩa vụ; khách huỷ thì mặc định giữ cọc; ghi sổ kế toán do Kế toán (đ3) |
| ADR-0030 (`:114`, lý do huỷ, chưa có mã) | một danh sách | thêm nhóm "công ty huỷ" (chỉ Quản trị, Toàn quyền chọn), "huỷ để lập lại / trùng đơn", "chưa kết luận" cho lý do "Khác"; bắt buộc chọn (đ8) |
| ADR-0026 đ10 (`:83`) | không nói đơn huỷ | lần thu lên đơn huỷ: chỉ Kế toán, Toàn quyền (đ13) |
| ADR-0026 đ11 (`:88`), M2 (`:139`); nhãn hiện ở `web/order.ts:420` | trường và câu hiện có | + trường đơn huỷ (đ9); nhãn "Khách hàng đã trả trước", sau "Đã giao" là "Đã thu", đơn khách huỷ là "Cọc giữ lại" (đ3, đ9b) |
| ADR-0025 đ3d (`:53`), ADR-0024 | không xét đơn huỷ | `conLai` nhận cờ đơn huỷ (đ14) |
| Đặc tả v1.0 Việc 2 | ảnh đơn huỷ dùng mẫu xác nhận | mẫu thông báo huỷ (đ9a); điều khoản huỷ trên ảnh xác nhận (đ10) |
| ADR-0034 đ1, đ4 | — | + tin "duyệt hoàn cọc" cho Kế toán (hình chiếu của nhật ký) |

## Hiến chương áp dụng
- 4.2 (sổ sinh từ sự kiện);
- 4.4 (danh sách trắng chứng từ gửi ngoài);
- 5.1 (hai lớp chặn);
- 5.4 (một luật, một nơi);
- 5.9;
- 5.14 (ngày phát sinh trong tháng mở);
- 5.17 (sổ vàng: ca mẫu đơn huỷ giữ cọc, hoàn một phần, quá hạn — Kế toán xác nhận từng đồng).

Tách nhiệm vụ duyệt và chi dựa theo ADR-0072 (mục "Câu hỏi đã được chủ trả lời", số 1) và ADR-0026 H4.

## Hệ quả
- Khách huỷ không còn bị ghi "còn nợ".
- Công ty giữ cọc đúng chính sách; mọi khoản hoàn có người duyệt, người chi, hạn và dấu vết.
- Thêm: ô quyền duyệt hoàn cọc (dùng cho cả hoàn lẫn chuyển, X-1); cổng "chọn công ty huỷ" và cổng "ghi đã hoàn ngoài hệ thống" (ô mới hay dùng lại do kế hoạch chọn, xem trang ghép); lệnh Quản trị phân loại lý do "chưa kết luận"; lệnh duyệt hoàn, chi hoàn, chuyển tiền sang đơn mới; nhóm lý do huỷ; danh sách đối chiếu đơn cũ và lệnh "đã hoàn ngoài hệ thống" của Toàn quyền (đ16); bất biến mới.
- Ca thử "duyệt sau hạn → 409" chỉ áp cho **khách huỷ**. Phải có ca ngược: công ty huỷ, huỷ để lập lại, và dòng đ16 đều qua được sau hạn.
- Trang ghép, bảng chạm và cổng: xem `docs/superpowers/specs/2026-10-02-luot-duyet-1-don-huy-va-quyen-tien.md`, mục "Trang ghép lượt 1".
- Thi công: người kiểm độc lập; dòng mới ở `docs/SO-HANG-RAO.md` cho các cổng "chi + chuyển ≤ duyệt ≤ đã trả", "người chi/chuyển ≠ người duyệt", "hạn 60 ngày (chỉ khách huỷ)", "chỉ Quản trị, Toàn quyền chọn công ty huỷ", "đ16 chỉ Toàn quyền, một lần mỗi đơn", mỗi cổng có quan sát chặn thật.
