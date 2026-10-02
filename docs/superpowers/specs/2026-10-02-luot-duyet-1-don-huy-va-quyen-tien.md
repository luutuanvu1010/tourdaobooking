# Lượt duyệt 1 (gấp) — ADR-0089 đơn huỷ: cọc mặc định giữ lại, hoàn tuỳ chọn trong 60 ngày + ADR-0090 chỉ Toàn quyền cấp quyền tiền

> **ĐÃ THÀNH VĂN BẢN CHÍNH THỨC:**
> - `docs/adr/ADR-0089-don-huy-coc-mac-dinh-giu-hoan-tuy-chon.md` (accepted);
> - `docs/adr/ADR-0090-tai-khoan-quyen-tien-chi-toan-quyen.md` (accepted).
>
> Tệp này nay là **lịch sử soạn thảo** và giữ **trang ghép** của lượt 1. Khi hai nơi khác nhau, **ADR thắng**.
>
> **Trạng thái:** **CHỦ ĐÃ DUYỆT văn bản lượt 1a + 1b** (chat 2026-10-02, câu 7: "Duyệt" — duyệt bản 3.2 @ `4598221f`). Bản 3.3 ghi thêm lời chủ lần 4. Lời chủ lần 5 (cùng ngày) chọn Đ-1…Đ-6 và QH5; ADR-0089 đã ghi vào đ3, đ5–đ10, đ15, đ16. **Trang ghép dưới đây đã cập nhật theo lần 5.**
> - **Còn treo, không chặn duyệt:**
>   - **lớp chống ghi trùng chung của Nền tảng**: đã soạn thành ADR-0094, chờ chủ duyệt văn bản.
> - Bước tiếp: người kiểm độc lập soát văn bản cuối → chuyển vào `docs/adr/` (ADR-0089, ADR-0090, accepted).
> - Bản 3.1 đã sửa theo phiếu kiểm độc lập bản 3.
> - **Bản 3:** ADR-0089 viết lại theo lời chủ về chính sách cọc (mặc định không hoàn; hoàn tuỳ chọn; hạn 60 ngày).
> - **Bản 2:** sửa theo hai phiếu duyệt độc lập (`2026-10-02-phieu-duyet-doc-lap-luot-A-tien.md`, `…-B-quyen.md`) và phiếu kiểm bản 2 (`2026-10-02-phieu-kiem-ban-2-ba-luot-duyet.md`).
> - Mã sửa ghi trong ngoặc, ví dụ (A-B6). AI không tự duyệt (Hiến pháp N3).
>
> **Vì sao là lượt 1:**
> - TNV-G1 (đơn huỷ còn tiền hiện "còn lại") có hạn **15/10** trong `docs/quyen-hoan.json`.
> - ADR-0090 nhỏ, không migration, và đóng đường mạo danh Kế toán (QT04) **trước khi** có lệnh tiền mới (phiếu B-D).
>
> **Bước ghép** (CLAUDE.md §9): đếm theo quyết định con thì hai ADR gộp lại vượt trần 3, nên lượt này **duyệt làm hai lần**:
> - **1a** = ADR-0089;
> - **1b** = ADR-0090.
>
> Hai lần dùng chung trang ghép ở cuối tệp. Lượt 2a (ADR-0088), 2b (ADR-0092), 3 (ADR-0093 + ADR-0091) ở hai tệp kia.
>
> **Xây trên lỗ đang hở: F-02** (lệnh hoàn chưa chống gửi lặp, KT03). ADR-0089 thêm lệnh duyệt hoàn và chi hoàn. **Điều kiện thi công:** mọi lệnh ghi (kể cả duyệt hoàn, chi hoàn, chuyển tiền) đi qua **lớp chống ghi trùng chung của Nền tảng** (lời chủ lần 4, câu 1: "giải pháp kỹ thuật, chứ không phải đi vá"; ADR riêng đang soạn).
>
> **Số dòng mã** trích theo `968ecfdb`; nhánh đã gộp `main` (`63c422e3`). Lúc lập kế hoạch phải đối chiếu lại số dòng.

## Lời chủ dự án (nguyên văn, chat 2026-10-02)

> "1- Có , 2 - Luôn luôn, 3- cả 3. 4- ok, 5- cho phép (nhưng phải có nhãn hoặc ký hiệu riêng để nhận biết đây là ngoại lệ được cho phép và/hoặc đáng chú ý, không phải đơn bình thường)"

---

## ADR-0089 — Đơn huỷ: "còn lại" về 0; tiền khách đã trả **mặc định là cọc giữ lại**; công ty **có thể** hoàn (không bắt buộc) trong hạn 60 ngày sau ngày khởi hành dự kiến

> **Bản 3** (2026-10-02), viết lại theo lời chủ về chính sách cọc. Bản 2 coi toàn bộ tiền của đơn huỷ là "chờ hoàn"; nay **ngược lại**: mặc định giữ, hoàn là ngoại lệ có duyệt.

**Lời chủ dự án (nguyên văn, chat 2026-10-02, câu 1):**

> "Khi khách huỷ, mặc định tiền cọc không được bồi hoàn. Tuy nhiên trên thực tế, công ty có thể hoàn tiền lại cho khách nhưng không bắt buộc, thời gian hoàn cọc tối đa là 60 ngày sau ngày khởi hành đã được lên kế hoạch."

Lời chủ trước đó (câu 3): dấu hiện ở **cả ba nơi**: biên nhận, trang đơn, màn sổ.

**Lời chủ lần 3 (nguyên văn, chat 2026-10-02, trả lời 7 câu trong tin nhắn cuối của AI):**

> "Cọc là tiền trả trước (tiền đặt cọc như một lời cam kết của người mua dành cho người bán, được bảo đảm bằng 1 khoản tiền, gọi là tiền đặt cọc- nói tắt/viết tắt là cọc), 2- Khi công ty huỷ thì đề xuất hoàn toàn bộ tiền đã trả trước hoặc dời lịch , khách hàng không cần trả theme tiền, 3- Quản trị duyệt hoàn cọc. 4- ok (cũng cần có cơ chế chống đặt trùng, về sau), 5 - ok/ 6- Có, ngắn gọn. Đọc đầy đủ trong chính sách bán hàng tại website tourdao.vn/, 7- ok. Chưa xác nhận về "2 cách hiểu" mà bạn đề cập vì chưa hiểu rõ"

**Thứ tự câu trong tin nhắn đó:**

| Câu | Ứng với | Lời chủ |
|---|---|---|
| 1 | QH1 | cọc = tiền trả trước |
| 2 | QH2 | công ty huỷ: hoàn toàn bộ tiền đã trả trước, hoặc dời lịch không thu thêm |
| 3 | QH3 | Quản trị duyệt hoàn cọc |
| 4 | QH4 | ok; chống đặt trùng làm về sau |
| 5 | QH6 | ok |
| 6 | QH8 | có, ngắn gọn, trỏ tới chính sách bán hàng trên tourdao.vn |
| 7 | QT1–QT3 của ADR-0088 | ok |

**Lời chủ lần 4 (nguyên văn, chat 2026-10-02):**

> "1- Chúng ta chặn ghi trùng bằng giải pháp kỹ thuật, chứ không phải đi vá thế này. Tìm trong Cloudflare và/hoặc Oracle xem họ có cách nào chống ghi trùng dữ liệu. 2- Theo bản chất thì thu tiền trước chính là 1 nghĩa vụ của công ty với khách hàng, lúc này chưa thành thu nhập vì chưa hoàn tất việc bàn giao nghĩa vụ và quyền lợi về sản phẩm/dịch vụ. Nền tảng  (Từ nay chúng ta ghi thành luật là dùng từ Nền tảng thay cho App) hiển thị đúng bản chất: "Khách hàng đã trả trước" . 3- KHông có ý kiến vì chưa hiểu. 4- Thông thường là trừ vào đối soát, dù cách nào thì bản chất là không đổi. 5- Chỉ nhắc. 6- https://tourdao.vn/chinh-sach-thanh-toan, 7- Duyệt"

**Ứng với:**
| Câu | Ứng với | Lời chủ |
|---|---|---|
| 1 | A1 (màn Danh bạ chống tạo trùng) | chống ghi trùng bằng **giải pháp kỹ thuật chung**, không vá từng màn; tra Cloudflare, Oracle |
| 2 | A2 (hạch toán) | tiền trả trước là **nghĩa vụ** của công ty với khách, **chưa là thu nhập** khi chưa bàn giao xong; Nền tảng hiển thị **"Khách hàng đã trả trước"**; dùng chữ **"Nền tảng"** thay "App" |
| 3 | QH5 | chưa có ý kiến (chưa hiểu) |
| 4 | QH7 | thông thường **trừ vào đối soát**; cách nào thì bản chất không đổi |
| 5 | QH9 | **chỉ nhắc** |
| 6 | trang chính sách (QH8) | `https://tourdao.vn/chinh-sach-thanh-toan` |
| 7 | duyệt văn bản lượt 1a + 1b | **Duyệt** |

### Bối cảnh (đã chạy thật, đã chạy lại)
- **Tình huống:** 09, 26, HD06, HD08, QT05, DT04, KT01.
- **Lỗi:** đơn huỷ đã thu cọc vẫn ghi "còn lại", tức khách trông như **còn nợ**, trên cả sổ lẫn biên nhận gửi khách. Không có đường nào ghi "cọc giữ lại" hay quyết định hoàn.
- **Gốc:** `phaiThuCua` (`src/modules/orders/hoan-tat.ts:9-18`) không xét trạng thái huỷ.
- **Văn bản cũ:**
  - ADR-0014 đ11 ghi "hoàn cọc làm ngoài hệ thống";
  - ADR-0026 (bảng thay đ11, `:43`) hứa dấu "cần chú ý hoàn cọc", chưa có mã;
  - Hiến chương 5.9 để mặc định "phải trả khác" là **đề xuất của AI, chờ chủ xác nhận ở ADR sổ tiền**. Lời chủ hôm nay là xác nhận đó, với mặc định ngược lại.

### Quyết định
> Trong phần này, chữ **"(đề xuất)"** đánh dấu chỗ AI thêm ngoài lời chủ; mỗi chỗ có câu hỏi QH tương ứng. Phần không đánh dấu là áp đúng lời chủ.

1. **Khách huỷ một đơn chưa từng Đã giao:**
   - **"Còn lại" = 0**: khách không còn nợ gì. **"Chờ hoàn" mặc định = 0**, vì cọc không hoàn.
   - **Nơi tính** (phiếu kiểm bản 3, A2): **một** hàm tính đã thu, còn lại, dư là **`conLai` của `billing`** (`src/modules/billing/rules.ts`, NT-R9). Hàm nhận thêm **cờ đơn huỷ** và các khoản duyệt hoàn.
   - `phaiThuCua` của `orders` (`hoan-tat.ts:9-18`) **không** được đọc bảng `bil_*` (`hoan-tat.ts:1-3`; ADR-0024 đ4), nên giữ nguyên.
   - Hiến chương 5.4: một luật, một nơi.
   - Đơn đã Đã giao không huỷ được (ADR-0025 đ1).
2. **Hai con số của đơn huỷ** (phiếu kiểm bản 3, A3):
   - **Cọc là tiền trả trước** (lời chủ, QH1): mọi khoản khách đã trả cho đơn trước khi đơn bị huỷ đều là cọc, kể cả khi đã trả đủ.
   - **"Đã trả" (gộp)** = tổng các lần thu còn hiệu lực **đã xác nhận**. Không trừ hoàn.
   - **"Còn giữ" (ròng)** = đã trả − đã chi hoàn. Đây là phần cọc công ty đang giữ.
   - Tiền khách chuyển **sau khi huỷ** (Kế toán ghi, đ7) cộng vào "đã trả".
   - Khoản "Công ty thu – CK" **chưa xác nhận** chưa tính vào "đã trả". Nếu tiền không về thì người khai giữ hộ, theo H3 đã duyệt.
   - **Bản chất tiền trả trước** (lời chủ lần 4, câu 2): tiền khách trả trước là **nghĩa vụ của công ty với khách**, **chưa là thu nhập** khi chưa bàn giao xong dịch vụ.
     - Nền tảng hiển thị đúng bản chất bằng nhãn **"Khách hàng đã trả trước"**, cho mọi đơn chưa "Đã giao" (đ11).
     - Với đơn **khách huỷ** mà công ty giữ cọc: nghĩa vụ giao dịch vụ đã chấm dứt do khách huỷ, còn hoàn là tuỳ chọn.
     - **Thời điểm và cách ghi khoản giữ lại thành thu nhập trong sổ sách kế toán** do **Kế toán chốt** theo chuẩn mực. Đây là cách hiểu của AI, chủ đã nêu nguyên tắc ở trên. Nền tảng **không tự gắn** nhãn kế toán.
3. **Hoàn cọc tuỳ chọn — hai bước, hai người** (tách nhiệm vụ theo ADR-0072 đ1 và ADR-0026 H4):
   - **(a) Duyệt hoàn: Quản trị** (lời chủ, QH3) ghi số Y, kèm lý do. Duyệt có thể một phần, nhiều lần. **Tổng đã duyệt ≤ "đã trả"** của đơn.
     - Ô quyền mới: ADMIN; SUPER_ADMIN có theo luật "Toàn quyền là `any` ở mọi ô" (`permissions.test.ts:91-93`).
   - **(b) Chi hoàn:** Kế toán ghi lần **trả lại khách** khi thực chi. **Tổng đã chi ≤ tổng đã duyệt**. Người trả không phải công ty thì ≤ số người đó đang giữ trên đơn.
   - Không ai vừa duyệt vừa chi **cùng một khoản**. Toàn quyền duyệt thì Kế toán chi; tài khoản kiêm cả hai nhận 409 ở bước thứ hai.
   - Duyệt hoàn có thể **huỷ duyệt** phần chưa chi, có lý do.
4. **Hạn 60 ngày:**
   - **Mốc** là ngày khởi hành dự kiến của đơn + 60 ngày. Đơn một ngày cho mọi dịch vụ; nếu dữ liệu cũ có nhiều ngày thì lấy ngày **muộn nhất**.
   - Đơn nháp bị huỷ khi **chưa có ngày đi** thì tính từ **ngày huỷ** + 60 (QH6, chủ "ok").
   - Sau hạn, máy chủ **chặn duyệt mới**: 409 "Đã quá hạn hoàn cọc (hạn: dd/mm/yyyy)" (QH6, chủ "ok").
   - Khoản **đã duyệt trước hạn** vẫn **chi được** sau hạn, vì thông báo đã hứa với khách. Mỗi lần chi muộn có nhắc đậm và ghi nhật ký (QH6, chủ "ok").
   - **Nhắc Kế toán:** khoản đã duyệt mà chưa chi quá 7 ngày; khoản đã duyệt chưa chi khi còn ≤ 10 ngày tới hạn.
   - Theo ADR-0034 đ1, tin là hình chiếu của nhật ký, nên lời nhắc theo thời gian hiện ở **danh sách** của Kế toán (tô màu, sắp theo số ngày) và ô đếm Trang chủ, **không** đẩy tin (phiếu kiểm bản 3).
5. **Trạng thái cọc hiện ở ba nơi** (lời chủ "cả 3", áp theo chính sách mới):
   - **(a) Thông báo gửi khách** cho đơn huỷ (Hiến chương 4.4, danh sách trắng chứng từ gửi ngoài):
     - tiêu đề "THÔNG BÁO HUỶ ĐƠN DỊCH VỤ"; không dùng mẫu xác nhận; không có dòng "Còn lại";
     - ghi "Đã thanh toán X". **Khách huỷ:** "Theo chính sách của Tour Đảo, tiền cọc không được hoàn lại khi khách huỷ".
     - Nếu đã duyệt hoàn: "Tour Đảo hoàn Y, chậm nhất ngày dd/mm/yyyy". Khi đã chi: "Đã hoàn Y".
     - Khoản chưa xác nhận: "Khoản Z đang được đối chiếu".
     - **Chưa phân loại lý do huỷ** (đ8): chỉ câu trung tính "Khoản đã thanh toán được xử lý theo chính sách huỷ; Tour Đảo sẽ liên hệ". **Không** in "không hoàn".
     - Đơn của đối tác mà đại lý cầm tiền: câu trung tính như trên.
     - **Điều khoản huỷ trên ảnh xác nhận đơn** (lời chủ, QH8: "Có, ngắn gọn. Đọc đầy đủ trong chính sách bán hàng tại website tourdao.vn"):
       - in **một dòng ngắn** ngay từ lúc đặt, ví dụ "Khi khách huỷ, tiền cọc không được hoàn lại. Xem đầy đủ: tourdao.vn/chinh-sach-thanh-toan" (chủ chốt chữ). Đường dẫn do chủ đưa (lời chủ lần 4, câu 6): `https://tourdao.vn/chinh-sach-thanh-toan`;
       - **Kiểm 2/10:** đường dẫn này trả **404** (cả có hay không dấu `/` cuối, cả `/vi/`), sơ đồ website không có, mã nguồn website cũng không có. Có thể trang còn ở dạng nháp trong hệ quản trị nội dung, chưa đăng;
       - **Lưu ý (chưa có):** ngày 2/10, AI **không tìm thấy** trang chính sách bán hàng trên tourdao.vn: trang chủ không có liên kết; các đường dẫn `/chinh-sach-ban-hang`, `/chinh-sach`, `/chinh-sach-huy`, `/chinh-sach-dat-coc`, `/dieu-khoan`, `/dieu-khoan-su-dung`, `/chinh-sach-hoan-tien` đều 404; sơ đồ `sitemap-vi.xml` không có trang nào về chính sách;
       - dòng này **chỉ in đường dẫn khi trang trả 200**. Trước mỗi lần phát hành có bước kiểm GET. Đăng trang là việc của website (kho `tourdaovn`), ngoài Nền tảng này.
     - Chữ cụ thể chủ chốt khi duyệt giao diện. Danh sách trắng biên nhận (ADR-0026 đ11) thêm các trường này.
   - **(b) Trang đơn:**
     - khối tiền đơn huỷ: "Đã trả X — đang giữ X′ — mặc định không hoàn — có thể duyệt hoàn đến dd/mm/yyyy";
     - nút **"Duyệt hoàn cọc"** cho người có thẩm quyền;
     - sau duyệt: "Đã duyệt hoàn Y — chờ Kế toán chi", và nút **"Ghi chi hoàn"** cho Kế toán;
     - tên người đang giữ tiền chỉ hiện cho `ledger.view any`.
   - **(c) Màn sổ Kế toán:**
     - danh sách **"Cần chi hoàn"**: khoản đã duyệt chưa chi, cộng tiền trả dư của đơn **không huỷ** (KD03);
     - danh sách **"Đơn huỷ giữ cọc"**: theo tháng, có hạn, để hạch toán;
     - danh sách **"Đơn huỷ còn người giữ tiền"** (đ6), sắp theo số ngày;
     - chỉ `ledger.view any`.

     Màn sổ chưa có, chủ thiết kế trên Claude Design; trong lúc chờ, máy chủ có route và Trang chủ Kế toán có ô đếm.
6. **Còn người giữ tiền mặt của đơn huỷ:** cọc là tiền **của công ty**, nên người giữ vẫn phải nộp. Đơn huỷ hiện dấu "còn người giữ tiền" cho tới khi nộp xong (A-B6d), và vào danh sách ở đ5c.
   - Đơn huỷ không qua cổng Hoàn thành, nên **không có hạn nộp tự động**. Kế toán rà danh sách.
   - **Đơn của đối tác mà đại lý cầm cọc** (lời chủ, QH7): **mặc định trừ vào kỳ đối soát** đại lý (ADR-0079/0080); nộp về cũng được, bản chất không đổi: cọc là của công ty.
7. **Ghi lần thu lên đơn đã huỷ:** chỉ **Kế toán, Toàn quyền** (khách chuyển khoản muộn). Người khác nhận 409: "Đơn đã huỷ — nếu khách vừa chuyển tiền, báo Kế toán ghi."
8. **Lý do huỷ — ba nhóm** (phiếu kiểm bản 3, A4):
   - Hôm nay route huỷ (`orders/index.ts:978-1030`) **không đọc lý do**. Danh sách lý do của ADR-0030 (`:114`) chưa có mã (ADR-0030 lượt 2 chưa thi công) và không có lý do phía công ty. Vì vậy điều này là **thêm mới**: huỷ đơn phải chọn lý do, thi công cùng lượt 1a.
   - Ba nhóm:
     - **"Khách huỷ"** (Khách đổi ý, …): mặc định **không hoàn cọc**;
     - **"Công ty huỷ"** (thời tiết hoặc cấm biển, hết chỗ, sự cố nhà cung cấp, lỗi công ty) — lời chủ, QH2: **hoàn toàn bộ tiền đã trả trước, hoặc dời lịch; khách không phải trả thêm tiền.**
       - Hoàn: đi đúng hai bước ở đ3 (Quản trị duyệt **toàn bộ** "đã trả", Kế toán chi).
       - Dời lịch: lệnh **"Chuyển tiền sang đơn mới"** (dưới đây). Đơn mới giữ **đúng số tiền khách đã cam kết**. Nếu giá mới cao hơn thì phần chênh do công ty chịu, ghi là giảm giá có lý do "dời lịch do công ty huỷ", Quản trị duyệt.
       - Hạn 60 ngày ở đ4 **không chặn** khoản hoàn của nhóm này, **chỉ nhắc** (lời chủ, QH9), vì đây là nghĩa vụ của công ty chứ không phải hoàn tuỳ chọn.
     - **"Huỷ để lập lại / trùng đơn"** (Sai thông tin — lập lại đơn; Khách đặt trùng) — lời chủ, QH4 "ok": tiền **chuyển sang đơn mới** hoặc **hoàn**, **không** giữ cọc, để khách không bị thu hai lần.
       - **Cơ chế chống đặt trùng** (cảnh báo khi cùng khách đặt hai đơn gần ngày) làm **về sau**, theo lời chủ. Dùng đặc tả "cảnh báo đơn trùng" đã có (nhánh `canh-bao-don-trung`, commit `d90ceed5`).
   - **Lệnh "Chuyển tiền sang đơn mới"** (dùng cho dời lịch và cho huỷ để lập lại):
     - Kế toán ghi **một lô**: chi khỏi đơn huỷ và ghi một lần thu vào đơn mới, **cùng số**, cùng người đang giữ tiền;
     - mỗi lần chuyển có lý do, ghi nhật ký **trên cả hai đơn**;
     - đơn huỷ sau khi chuyển hết thì "còn giữ" = 0;
     - đi qua lớp chống ghi trùng chung của Nền tảng.
   - **Đơn huỷ chưa phân loại** (đơn cũ, hoặc trong lúc chờ QH2): **"chưa kết luận"**. Thông báo khách dùng câu trung tính; Quản trị phân loại.
9. **Dữ liệu cũ:**
   - Trước phát hành, chủ chạy lệnh **chỉ đọc** (AI soạn) đếm đơn huỷ có tiền. Các đơn này thuộc nhóm "chưa kết luận" cho tới khi Quản trị phân loại.
   - **(đề xuất, QH5)** Đơn đã **hoàn ngoài hệ thống** trước khi có sổ: Toàn quyền ghi bù bằng lệnh riêng **"Ghi nhận đã hoàn ngoài hệ thống"**, có lý do, **không áp hạn 60 ngày**. Đây là ngoại lệ có tên duy nhất, chỉ cho dữ liệu trước ngày phát hành.
10. **Kiểm:**
    - bài test `conLai` (đơn huỷ: còn lại 0, dư 0; duyệt, chi một phần);
    - bài kiểm nhãn: đơn chưa Đã giao hiện "Khách hàng đã trả trước", không hiện "Đã thu" (đ11);
    - e2e chép từ kịch bản 09, 26, HD06, QT05, DT04, thêm các ca: duyệt → chi → duyệt lần hai vượt "đã trả" → 409; một người vừa duyệt vừa chi → 409; duyệt sau hạn → 409;
    - bất biến mới, ở CSDL và trong bộ kiểm: **tổng chi ≤ tổng duyệt ≤ đã trả** trên mỗi đơn huỷ.

11. **Nhãn "Khách hàng đã trả trước"** (lời chủ lần 4, câu 2):
    - Tiền khách trả cho đơn **chưa "Đã giao"** hiện là **"Khách hàng đã trả trước X"** ở trang đơn, thẻ danh sách, biên nhận và thông báo huỷ. Không gọi là "đã thu" hay "doanh thu".
    - Sau "Đã giao", dịch vụ đã bàn giao, nên nhãn đổi thành **"Đã thu"**.
    - Áp cho **mọi đơn**, không riêng đơn huỷ. Đổi chữ ở các màn hiện có (ADR-0026 M2) làm trong cùng đợt thi công lượt 1a.

### Thay câu nào (dòng trỏ ở dòng trạng thái của văn bản cũ, không sửa thân)
| Văn bản | Câu cũ | Thay bằng |
|---|---|---|
| ADR-0014 đ11, "Tiền cọc khi huỷ" (`:113`) | hoàn cọc là việc ngoài hệ thống | trong sổ: mặc định giữ, hoàn tuỳ chọn có duyệt, hạn 60 ngày (đ1–4) |
| ADR-0026, dòng thay ADR-0014 đ11 (`:43`) | "Dấu 'cần chú ý hoàn cọc' đọc từ sổ…" | trạng thái cọc ở ba nơi (đ5); "cần chi hoàn" chỉ khi đã duyệt |
| Hiến chương 5.9 (phần "đề xuất của AI, chờ chủ xác nhận ở ADR sổ tiền": mặc định "phải trả khác") | mặc định phải trả khác | khách huỷ: mặc định **giữ cọc** (lời chủ 2/10). Cách hạch toán, tạm giữ trong hạn rồi thu nhập khác, là **đề xuất, Kế toán chốt** (đ2). Trả dư của đơn không huỷ vẫn là phải trả khác |
| ADR-0030 (danh sách lý do huỷ, `:114`, chưa có mã) | một danh sách, không có lý do phía công ty | **thêm** nhóm "công ty huỷ" (hoàn toàn bộ hoặc dời lịch không thu thêm) và nhóm "huỷ để lập lại / trùng đơn" (chuyển tiền sang đơn mới hoặc hoàn); huỷ phải chọn lý do (đ8) |
| ADR-0026 đ10 (`:83`) | không nói đơn huỷ | lần thu lên đơn huỷ: chỉ Kế toán, Toàn quyền (đ7) |
| ADR-0026 đ11 (`:88`), M2 (`:139`) | các trường, câu hiện có ("đã thu") | + trường đơn huỷ (đ5); nhãn "Khách hàng đã trả trước" cho đơn chưa Đã giao (đ11) |
| ADR-0025 đ3d (`:53`), ADR-0024 (NT-R9: `conLai` là hàm duy nhất) | không xét đơn huỷ | `conLai` nhận cờ đơn huỷ: còn lại 0, dư 0, cộng phần đã duyệt hoàn (đ1) |
| Đặc tả v1.0 Việc 2 | ảnh đơn huỷ dùng mẫu xác nhận | mẫu thông báo huỷ (đ5a) |
| ADR-0092 đ7 (bản 2, phí huỷ) | loại ghi "giữ làm phí huỷ" | **bỏ**: chính sách mặc định giữ đã trả lời (Q-A3) |
| ADR-0034 điều 1 (hành động nguồn), điều 4 ("Của tôi" theo quan hệ với đơn) | — | + tin "duyệt hoàn cọc" cho Kế toán (hình chiếu của nhật ký). Lời nhắc theo thời gian **không** là tin, mà hiện ở danh sách (đ4) |

**Hiến chương áp dụng:**
- 4.2 (sổ sinh từ sự kiện);
- 4.4 (danh sách trắng chứng từ gửi ngoài, cho đ5a);
- 5.4 (một luật, một nơi: `conLai`);
- 5.9;
- 5.14 (ngày phát sinh trong tháng mở);
- 5.17 (sổ vàng: ca mẫu đơn huỷ giữ cọc, hoàn một phần, quá hạn — Kế toán xác nhận từng đồng).

Nguồn **tách nhiệm vụ** duyệt và chi: ADR-0072 đ1, ADR-0026 H4. Hiến chương không có điều riêng về việc này (phiếu kiểm bản 3, B6).

### Câu hỏi (lượt 1a)
**Đã trả lời (2/10):**
- **QH1:** cọc = tiền trả trước.
- **QH2:** công ty huỷ thì hoàn toàn bộ hoặc dời lịch, khách không trả thêm.
- **QH3:** Quản trị duyệt hoàn cọc.
- **QH4:** ok; chống đặt trùng làm về sau.
- **QH6:** ok.
- **QH8:** có, ngắn gọn, trỏ tới chính sách bán hàng trên website.

**Đã trả lời thêm (lời chủ lần 4):**
- **QH7:** trừ vào đối soát.
- **QH9:** chỉ nhắc.
- **Hạch toán:** nguyên tắc "trả trước là nghĩa vụ"; Kế toán chốt cách ghi sổ.
- **Trang chính sách:** đường dẫn đã có, nhưng đang 404.
- **Duyệt văn bản:** đã duyệt.

**Còn treo:**
- **QH5 — đơn cũ đã hoàn tay trước khi có sổ** (đ9). Chủ chưa hiểu câu hỏi; giải thích lại bằng lời thường ở phiếu trả lời bản 4.
  - **Khuyến nghị:** Toàn quyền ghi bổ sung một lần "đã hoàn ngoài hệ thống" cho đúng những đơn đó, không áp hạn 60 ngày.
- **Lớp chống ghi trùng chung** của Nền tảng: ADR riêng, theo lời chủ lần 4, câu 1.

## ADR-0090 — Tài khoản có quyền tiền: chỉ Toàn quyền cấp quyền, tạo, và đặt lại PIN

### Bối cảnh (đã chạy thật)
- **QT04:**
  - Quản trị đặt lại PIN của Kế toán (200) và **thấy PIN mới**.
  - Quản trị đăng nhập thay, xác nhận "Công ty đã nhận" (200), rồi **hoàn 500.000** (201). Nhật ký ghi tên Kế toán.
  - **Biến thể:** Quản trị cấp thêm quyền Kế toán cho một Bán hàng cấp dưới (200), vì `ACCOUNTANT.superAdminOnly = false` (`src/shared/roles.ts:33`).
- **GD-P-01:** Nhân sự tạo được tài khoản mang vai Kế toán và biết PIN đầu (ADR-0071 1a).
- **Chuỗi ghép** (B-B1): Quản trị đặt lại PIN một Bán hàng, đổi sang PIN mình biết, gán thêm quyền Kế toán. Kết quả là một tài khoản giữ tiền do Quản trị điều khiển.

### Quyết định
0. **Định nghĩa** (B-B6): "Tài khoản có quyền tiền" = tài khoản giữ ít nhất một ô **ghi tiền mà Quản trị không có**:
   - `ledger.write`, `payment.refund`, `order.complete`, `accounting.entry.mark` (`permissions.ts:114, 105, 110, 120`);
   - tính bằng **một hàm** suy từ bảng quyền, dùng chung cho máy chủ và giao diện;
   - hôm nay hàm cho ra đúng ACCOUNTING và SUPER_ADMIN.
1. **Chỉ Toàn quyền** được làm bốn việc với tài khoản có quyền tiền:
   - (i) **đặt lại PIN**;
   - (ii) **gán vai Kế toán, hoặc cộng tay một quyền tiền** cho tài khoản bất kỳ;
   - (iii) **tạo tài khoản** mang quyền tiền;
   - (iv) **tắt bảo mật hai lớp**, khi ADR-0074 thi công.
   
   Quản trị và Nhân sự nhận 403: "Tài khoản giữ tiền — chỉ người phụ trách hệ thống (Toàn quyền) làm việc này."
2. **Giao diện:** nút "Đặt lại PIN", lựa chọn vai Kế toán và lựa chọn quyền tiền ẩn hay hiện theo **cờ máy chủ tính cho từng dòng**, như `datLaiPinDuoc` (`accounts/index.ts:735`), cùng hàm với cổng route (B-B11).
3. **Không đổi:** Quản trị vẫn mở khoá "sai PIN quá nhiều", đổi tên, ngưng tài khoản Kế toán. Những việc này không mở được quyền tiền.
   - Khi Quản trị ngưng tài khoản Kế toán, gửi tin cho Toàn quyền, vì việc ngưng làm đứt người duyệt tiền.
4. **Thi công nhỏ, không migration:** cờ chỉ-Toàn-quyền của vai nằm trong mã (`roles.ts`), cộng một nhánh kiểm ở route đặt lại PIN, tạo tài khoản và sửa quyền. Làm **trước hoặc cùng** đợt sửa tiền (phiếu B-D).

### Thay câu nào
| Văn bản | Câu cũ | Thay bằng |
|---|---|---|
| ADR-0042 đ1 (Quản trị lấy lại ô đặt lại PIN, chỉ cấp dưới) | mọi cấp dưới | trừ tài khoản có quyền tiền (đ1i) |
| ADR-0071 điều 1a (Nhân sự tạo mọi loại tài khoản) | mọi loại | trừ tài khoản mang quyền tiền (đ1iii) |
| ADR-0018 điều 5, danh sách LC-4 (chỉ Toàn quyền cấp ADMIN, SUPER_ADMIN, HR); `ACCOUNTANT.superAdminOnly` | không có ACCOUNTING | + vai Kế toán và quyền tiền (đ1ii) |
| ADR-0074 điều 5 (`:22`, Quản trị tắt lớp hai cho người không giữ Quản trị/Toàn quyền) | gồm cả Kế toán | trừ tài khoản có quyền tiền (đ1iv) |
| ADR-0072 điều 1 ("Kế toán là quyền ghi sổ; tách nhiệm vụ… Toàn quyền cộng tay") | — | đ1 là cách thi hành nguyên tắc này |
| ADR-0034 điều 1 (hành động nguồn của hộp thông báo) và điều 4 (ngăn "Của tôi" theo quan hệ với đơn) | — | + tin "Quản trị ngưng tài khoản Kế toán" vào "Của tôi" của Toàn quyền (đ3) |

### Rủi ro còn lại (ghi rõ)
- Quản trị vẫn đặt lại PIN được tài khoản Bán hàng hay HDV và dùng thay họ. Việc này **không** mở thêm quyền tiền, vì Quản trị đã có `payment.receive any`.
- Nó chỉ cho phép làm việc dưới tên người khác. Chặn phần này là việc của **ADR-0093 PIN tạm (lượt 3)**.

### Câu hỏi mở
- Không có. Phương án này là đề xuất (A) của phiếu B cho Q-B2 cũ; chủ duyệt văn bản là đủ.

---

## Trang ghép lượt 1 (1a + 1b) (CLAUDE.md §9)

### 1. Bảng nào chứa loại thực thể nào
| Bảng | Thực thể | ADR chạm |
|---|---|---|
| `orders` | đơn (`draft/confirmed/cancelled`, mốc Đã giao, Hoàn thành; ngày khởi hành ở dịch vụ) | 0089 đ1: `billing.conLai` nhận cờ huỷ (**tính ra, không lưu**); đ4: hạn hoàn = ngày khởi hành + 60 (nháp chưa có ngày: ngày huỷ + 60); đ8: lý do huỷ bắt buộc (cột hoặc bảng mới — kế hoạch chọn) |
| `bil_payment_receipt` | lần thu của khách **và** lần trả lại khách (`CUSTOMER_PAYMENT`, `CUSTOMER_REFUND`, `0045:35`) **và** dòng đảo | 0089 đ3b: lần **chi hoàn** là `CUSTOMER_REFUND`, có liên kết tới khoản duyệt; đ7: ai ghi lần thu lên đơn huỷ |
| **khoản "duyệt hoàn cọc"** (mới) | quyết định hoàn: số, lý do, người duyệt, trạng thái (đã duyệt / đã huỷ duyệt). Chỉ-thêm | 0089 đ3a. Chứa ở **loại phiếu mới** trong `bil_posting` hay bảng riêng do kế hoạch chọn sau spike. Module chủ là `billing` |
| `bil_posting`, `bil_debt_line` | phiếu sổ + dòng nợ: giữ hộ, nộp, trả, điều chỉnh; lượt 2 thêm `HOA_HONG`, `GIAM_GIA_BEN_DAT`, `GIA_VON`; dòng gắn chuyến (ADR-0057) | 0089 đ6: "còn ai giữ tiền của đơn huỷ" đọc từ đây |
| lý do huỷ (danh sách ADR-0030) | lý do huỷ đơn | 0089 đ8: thêm nhóm "khách huỷ" / "công ty huỷ" / "huỷ để lập lại / trùng đơn" / "chưa kết luận" (lý do "Khác") |
| **khoản "duyệt hoàn cọc"** (như trên) | nay chứa **hai loại** quyết định: duyệt **hoàn** và duyệt **chuyển sang đơn mới** (có mã đơn nhận) | 0089 đ6 (lời chủ 5, Đ-1) |
| dòng **"đã hoàn ngoài hệ thống"** (mới, nơi chứa do kế hoạch chọn) | việc hoàn đã làm tay trên đơn cũ; tính cả là duyệt lẫn chi cho bất biến | 0089 đ16 (QH5) |
| `staff`, `stf_permission`, vai (`roles.ts`) | tài khoản (nội bộ và bên ngoài, chung một bảng), quyền, vai | 0090: ai gán, tạo quyền tiền, ai đặt lại PIN. Không đổi cột |

### 2. Dòng bản đồ quyền chạm các bảng trên
| Ô quyền | Hôm nay | Sau lượt 1 |
|---|---|---|
| `payment.receive` (SALES own, ACCOUNTING, ADMIN, FIELD assigned, PARTNER own, SUPER_ADMIN, INTERN own) | ghi được lên đơn huỷ | không đổi ô; **đơn huỷ chỉ ACCOUNTING, SUPER_ADMIN** (0089 đ7) |
| **ô mới "duyệt hoàn cọc"** (tên kế hoạch đặt, ví dụ `deposit.refund.approve`) | — | **ADMIN** (lời chủ, QH3); SUPER_ADMIN bắt buộc `any`. Thêm **ô**, không thêm mã quyền. Dùng cho **cả duyệt hoàn lẫn duyệt chuyển** (Đ-1) |
| `ledger.write` (ACCOUNTING, SUPER_ADMIN) — **lệnh mới "Chuyển tiền sang đơn mới"** | — | Kế toán ghi khi dời lịch (công ty huỷ) hoặc huỷ để lập lại (đ8), **chỉ khi có khoản duyệt chuyển còn số**; người chuyển ≠ người duyệt (Đ-1). Dòng giảm giá bù chênh "dời lịch do công ty huỷ" cần Quản trị duyệt |
| **ô "chọn lý do công ty huỷ"** (ô mới, hoặc dùng lại ô duyệt hoàn cọc vì cùng người giữ — kế hoạch chọn) | — | **ADMIN**, SUPER_ADMIN `any` (Đ-2). Người huỷ khác vẫn huỷ được nhưng chỉ chọn "khách huỷ", "huỷ để lập lại / trùng đơn" hoặc "Khác" |
| **ô "ghi đã hoàn ngoài hệ thống"** (ô mới chỉ SUPER_ADMIN — kế hoạch đặt tên) | — | **chỉ SUPER_ADMIN** (đ16) |
| `payment.refund` / `ledger.write` (ACCOUNTING, SUPER_ADMIN) | ghi hoàn tự do (≤ đã thu) | **chi hoàn cọc đơn huỷ chỉ khi có khoản duyệt** (≤ phần duyệt còn lại); trả dư đơn không huỷ như cũ |
| `ledger.view` (`any`: ACCOUNTING, SUPER_ADMIN) | — | danh sách "Cần chi hoàn", "Đơn huỷ giữ cọc", tên người giữ tiền: chỉ `any` |
| `money.view` (PARTNER own…) | thấy khối tiền đơn mình | thấy trạng thái cọc, **không** thấy tên người giữ, không thấy nút duyệt hay chi |
| `account.access.manage` (ADMIN, SUPER_ADMIN) | đặt lại PIN mọi cấp dưới | trừ tài khoản có quyền tiền (0090) |
| `account.create` (HR, SUPER_ADMIN), `account.edit` (ADMIN, HR, SUPER_ADMIN) | tạo, gán vai thường | tạo / gán quyền tiền chỉ SUPER_ADMIN (0090) |

### 3. Cổng nào canh cửa nào (kể cả giao diện đổi nghĩa)
| Cửa | Hôm nay | Sau lượt 1 |
|---|---|---|
| Ghi lần thu lên đơn huỷ | `can(payment.receive)` | + kiểm trạng thái huỷ, chỉ ACCOUNTING, SUPER_ADMIN |
| Duyệt hoàn cọc | không có | route mới: `can(ô duyệt)`, tổng duyệt ≤ **đã trả** (đã xác nhận), lý do, **trước hạn 60 ngày**, qua lớp chống ghi trùng chung |
| Chi hoàn cọc | ghi hoàn tự do | cần khoản duyệt còn số; **người chi ≠ người duyệt**; khoản duyệt trước hạn chi được sau hạn (QH6); ≤ người trả đang giữ nếu không phải công ty; qua lớp chống ghi trùng chung |
| Huỷ đơn | `can(...)`, không đọc lý do | **bắt buộc chọn lý do** (nhóm, đ8); nhóm "công ty huỷ" cần ô "chọn lý do công ty huỷ" (Đ-2), máy chủ 403 nếu thiếu; "Khác" → "chưa kết luận", chưa duyệt hoàn được tới khi Quản trị phân loại |
| **Màn huỷ đơn** (giao diện) | không có lựa chọn lý do | **đổi nghĩa:** lựa chọn "Công ty huỷ" chỉ hiện khi máy chủ báo `can()` cho ô đó (giao diện hỏi `can()`, ADR-0071) |
| Duyệt chuyển tiền | không có | như "Duyệt hoàn cọc", kèm mã đơn nhận (Đ-1) |
| Chuyển tiền sang đơn mới | không có | route mới `can(ledger.write)` + **cần khoản duyệt chuyển còn số**, **người chuyển ≠ người duyệt** (Đ-1); một lô: chi khỏi đơn huỷ + thu vào đơn mới cùng số, cùng người giữ; nhật ký trên cả hai đơn; qua lớp chống ghi trùng chung |
| Hạn 60 ngày | — | chặn duyệt mới **chỉ cho khách huỷ**; công ty huỷ, huỷ để lập lại / trùng đơn (Đ-3) và dòng đ16 **không bị chặn, chỉ nhắc** |
| Ghi "đã hoàn ngoài hệ thống" (đ16) | không có | route mới, **chỉ SUPER_ADMIN**, mỗi đơn **một lần**, chỉ đơn huỷ trước ngày phát hành, ≤ còn giữ, lý do bắt buộc; nút chỉ hiện cho Toàn quyền; qua lớp chống ghi trùng chung |
| Danh sách đối chiếu đơn cũ (đ16) | không có | route đọc `ledger.view any` |
| Lớp CSDL | trigger hoàn ≤ đã thu (`0045:212-216`) | + trigger: **tổng chi + tổng chuyển ≤ tổng duyệt ≤ đã trả** trên đơn huỷ (đ15) |
| **Nút "Ghi hoàn"** (`web/order.ts:567`, hiện khi dư > 0) | đơn huỷ: không hiện (dư = 0) | **đổi nghĩa:** đơn huỷ dùng nút "Duyệt hoàn cọc" (người duyệt) rồi "Ghi chi hoàn" (Kế toán); đơn không huỷ trả dư giữ nút cũ |
| **Khối tiền trang đơn** (`web/order.ts:420, 438`) | đơn huỷ hiện "Còn lại" | đơn khách huỷ: "Cọc giữ lại – khách huỷ", "còn có thể hoàn tới dd/mm/yyyy", quá hạn chỉ "Cọc giữ lại" (Đ-6) / "Đã duyệt hoàn Y"; đơn chưa giao: "Khách hàng đã trả trước"; sau "Đã giao": **"Đã thu"** (Đ-4) |
| **Ảnh xác nhận đơn** | không có điều khoản huỷ | thêm dòng điều khoản huỷ **kèm đường dẫn, in luôn** (Đ-5) |
| **Ảnh gửi khách** (`src/shared/order-confirmation.ts:177, 220`) | mẫu xác nhận, dòng "Còn lại" | mẫu thông báo huỷ (đ5a) |
| Đặt lại PIN, tạo tài khoản, sửa quyền | `can(...)` + `mayManage` / `roleAssignmentProblem` | + nhánh "tài khoản có quyền tiền → chỉ SUPER_ADMIN" (0090) |
| **Màn Quản lý tài khoản** | Quản trị thấy nút đặt lại PIN, chọn được vai Kế toán | ẩn với tài khoản / quyền tiền (cờ từng dòng) |
| Ô "Còn thiếu tiền" Trang chủ (chỉ đơn `confirmed` chưa Đã giao, `hoan-tat-repo.ts:65`) | — | không đổi |

### 4. Va chạm
- **0089 với 0090:** ô "duyệt hoàn cọc" (đề xuất Quản trị) và ô chi hoàn (Kế toán) tách người. 0090 chặn Quản trị **tự cấp** cho mình quyền Kế toán để vừa duyệt vừa chi, nên **phải làm cùng đợt**.
- **0089 với ADR-0026 (Quản trị không ghi sổ):** "duyệt hoàn" là **quyết định**, không phải dòng sổ tiền; dòng sổ (chi hoàn, chuyển tiền) vẫn do Kế toán ghi. Chủ đã chọn **Quản trị duyệt** (QH3, 2/10), nên không còn câu hỏi ở đây.
- **0089 với lượt 2:**
  - ADR-0092 bỏ đ7 (phí huỷ), vì chính sách cọc đã trả lời;
  - ADR-0088 phần phân định trách nhiệm dùng cùng khuôn "duyệt → ghi" cho các khoản bồi thường.
- **Tin báo mới** (0089 đ4 nhắc Kế toán; 0090 đ3 ngưng tài khoản Kế toán → Toàn quyền) cần dòng ADR-0034 điều 1 (hành động nguồn) và điều 4 (ngăn "Của tôi").
- **Đánh số:** 0089, 0090 duyệt trước 0088. Khi chuyển vào `docs/adr/`, mục lục `docs/adr/README.md` giữ chỗ 0088, 0091, 0092, 0093.

### Loại cửa
- **0089:** luật và mã đảo được. Khoản duyệt và lần chi là **chỉ-thêm**, nên dữ liệu một chiều. Có thể có migration (bảng hoặc loại phiếu mới, nhóm lý do huỷ).
- **0090:** hai chiều (chỉ mã).
- Cả hai là **việc lớn** (tiền, quyền): người kiểm độc lập; thêm dòng `docs/SO-HANG-RAO.md` cho cổng "chi ≤ duyệt", "người chi ≠ người duyệt", "hạn 60 ngày", "quyền tiền chỉ Toàn quyền", mỗi cổng có quan sát chặn thật.
