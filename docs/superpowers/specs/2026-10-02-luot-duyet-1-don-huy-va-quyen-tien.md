# Lượt duyệt 1 (gấp) — ADR-0089 đơn huỷ còn tiền + ADR-0090 chỉ Toàn quyền cấp quyền tiền

> **Trạng thái:** **NHÁP bản 2, chờ chủ dự án duyệt văn bản.**
> - Chủ đã chọn nguyên tắc ngày 2026-10-02 (câu 3 "cả 3"; câu 4 "ok").
> - Bản 1 (commit `968ecfdb`) đã qua hai người duyệt độc lập:
>   - `2026-10-02-phieu-duyet-doc-lap-luot-A-tien.md`: "chưa nên duyệt";
>   - `2026-10-02-phieu-duyet-doc-lap-luot-B-quyen.md`: "duyệt được sau khi sửa 9 chỗ".
> - Bản này sửa theo cả hai phiếu; mã sửa ghi trong ngoặc, ví dụ (A-B6) là mục B6 của phiếu A. AI không tự duyệt (Hiến pháp N3).
>
> **Vì sao là lượt 1:** TNV-G1 (đơn huỷ còn tiền) có hạn **15/10** trong `docs/quyen-hoan.json`. ADR-0090 nhỏ, không migration, và đóng đường mạo danh Kế toán (QT04) **trước khi** lượt 2 thêm lệnh tiền mới (phiếu B-D).
>
> **Bước ghép** (CLAUDE.md §9): 2 ADR chạm tiền và quyền, kèm trang ghép ở cuối. Lượt 2 là ADR-0088 + ADR-0092 (sửa sai sau Đã giao, sổ không đổi dấu). Lượt 3 là ADR-0093 + ADR-0091 (PIN tạm, ngoại lệ 6 giờ).
>
> **Xây trên lỗ đang hở: F-02** (lệnh hoàn chưa chống gửi lặp, KT03). ADR-0089 làm nút "Ghi hoàn" hiện thêm ở mọi đơn huỷ còn tiền. **Điều kiện thi công:** phần chống gửi lặp cho **lệnh hoàn** của F-02 làm trước hoặc trong cùng đợt (A-B9).
>
> **Số dòng mã** trích theo `968ecfdb`; nhánh đã gộp `main` (`63c422e3`). Lúc lập kế hoạch phải đối chiếu lại số dòng.

## Lời chủ dự án (nguyên văn, chat 2026-10-02)

> "1- Có , 2 - Luôn luôn, 3- cả 3. 4- ok, 5- cho phép (nhưng phải có nhãn hoặc ký hiệu riêng để nhận biết đây là ngoại lệ được cho phép và/hoặc đáng chú ý, không phải đơn bình thường)"

---

## ADR-0089 — Đơn huỷ còn tiền: phải thu về 0, tiền đã thu thành "chờ hoàn", dấu hiện ở ba nơi

### Bối cảnh (đã chạy thật trên app tạm, đã chạy lại)
- **Tình huống:** 09, 26, HD06, HD08, QT05, DT04, KT01; thêm KD03 cho đơn trả dư.
- **Ví dụ minh hoạ:**
  - Đơn 200.000 thu cọc rồi huỷ. Sổ ghi "còn lại" bằng phần chưa thu, "dư chờ hoàn" bằng 0.
  - Biên nhận gửi khách vẫn ghi "Còn lại".
  - Nút "Ghi hoàn" không hiện, vì nút chỉ hiện khi dư > 0 (`web/order.ts:567`; đọc mã, chưa chạy giao diện).
  - Kế toán không có danh sách nào nhắc.
- **Gốc:** `phaiThuCua` (`src/modules/orders/hoan-tat.ts:9-18`) không xét trạng thái huỷ.
- ADR-0026 (bảng thay ADR-0014 điều 11, `:43`) đã hứa dấu "cần chú ý hoàn cọc" đọc từ sổ, nhưng chưa có mã.

### Quyết định
1. **Phải thu hiện hành của đơn đã huỷ = 0.**
   - Tính ở **một** hàm, `phaiThuCua` (Hiến chương 5.4). Hệ quả qua `conLai`: "còn lại" = 0, "chờ hoàn" = đã thu ròng.
   - Chỉ áp cho đơn chưa từng Đã giao, vì đơn đã Đã giao không huỷ được (ADR-0025 đ1). Ca "tour không diễn ra sau Đã giao" thuộc Q-A5 của lượt 2 (A-B23).
2. **Chờ hoàn tách hai phần** (A-B6), để không hứa với khách số tiền chưa về:
   - **(a) chắc chắn:** tiền đã về công ty, hoặc đang có người của công ty giữ;
   - **(b) chưa chắc:** khoản "Công ty thu – CK" còn chờ Kế toán xác nhận, và cọc cũ "chưa rõ người thu" (migration `0045:164-179`).
   
   Màn hình hiện cả hai phần. Thông báo gửi khách chỉ hứa phần (a).
3. **Dấu "cần hoàn" hiện ở ba nơi** (lời chủ "cả 3"):
   - **(a) Thông báo gửi khách** cho đơn huỷ:
     - tiêu đề "THÔNG BÁO HUỶ ĐƠN DỊCH VỤ", không dùng mẫu xác nhận; không có dòng "Còn lại";
     - ghi "Đã thanh toán X", rồi "Tour Đảo sẽ hoàn Y" với Y là phần (a), hoặc "Đã hoàn đủ" khi xong;
     - nếu có phần (b): câu trung tính "Khoản Z đang được đối chiếu, Tour Đảo sẽ liên hệ";
     - đơn của đối tác mà người cầm tiền là đại lý thì **không** viết "Tour Đảo sẽ hoàn", mà viết "Khoản đã thanh toán sẽ được xử lý theo chính sách huỷ" (A-B19);
     - danh sách trắng của biên nhận (ADR-0026 đ11) thêm các trường đã huỷ, đã thanh toán, sẽ hoàn, đang đối chiếu, đã hoàn.
   - **(b) Trang đơn:**
     - dải "Cần hoàn cho khách Y", kèm phần đang đối chiếu;
     - **tên người đang giữ tiền** chỉ hiện cho người xem có `ledger.view` phạm vi `any` (Kế toán, Toàn quyền). Đối tác (`money.view own`) không thấy tên nhân viên (A-B11d);
     - nút "Ghi hoàn" dành cho Kế toán và Toàn quyền, mặc định người trả là người đang giữ tiền mặt nếu có, để tránh công ty trả hai lần (A-B21);
     - **hoàn với người trả không phải công ty: số hoàn ≤ số người đó đang giữ trên đơn** (kiểm ở máy chủ). Điều này đặt ở lượt 1 vì nút hoàn mới mặc định người trả là người giữ tiền (phiếu kiểm bản 2, M6). Lượt 2 (ADR-0092 đ3) thêm lớp CSDL.
   - **(c) Màn sổ của Kế toán:**
     - danh sách **"Cần hoàn"** gồm đơn huỷ còn tiền và đơn trả dư chưa huỷ (KD03);
     - mỗi dòng có số tiền, ai đang giữ, số ngày chờ, sắp theo số ngày;
     - tô màu khi quá N ngày (Q-A4, đề xuất 7);
     - chỉ `ledger.view any` xem được.
     
     Màn sổ chưa có, **chủ thiết kế trên Claude Design**. Trong lúc chờ, máy chủ có route trả danh sách này, và Trang chủ của Kế toán có một ô đếm dẫn tới route đó.
4. **Dấu tắt khi** chờ hoàn = 0 **và** không còn ai giữ tiền của đơn huỷ (A-B6d). Đơn huỷ không qua cổng Hoàn thành, nên nếu không có điều kiện thứ hai thì HDV hay Bán hàng đang giữ tiền mặt sẽ không bị nhắc nộp lại.
5. **Ghi lần thu lên đơn đã huỷ: chỉ Kế toán và Toàn quyền** (A-A17, A-B14).
   - Ca thật là khách chuyển khoản muộn, và việc đó là Kế toán đối chiếu ngân hàng.
   - Người khác nhận 409: "Đơn đã huỷ — nếu khách vừa chuyển tiền, báo Kế toán ghi."
   - Hiện mã cho mọi vai có `payment.receive` ghi lên đơn huỷ (tình huống 26: Bán hàng → 201). ADR-0026 đ10 chỉ nói "trước Đã giao", **chưa** nói về đơn huỷ. Đây là quyết định mới.
6. **Phí huỷ** (công ty giữ một phần cọc) **không** nằm trong ADR này. Nó cần một loại ghi riêng theo Hiến chương 5.9 (A-B1) và cần chủ cho biết thực tế công ty (Q-A3), nên chuyển sang **ADR-0092 (lượt 2)**. Cho tới khi có, phần công ty giữ vẫn hiện "chờ hoàn" và Kế toán xử lý ngoài app. Đây là giới hạn đã biết.
7. **Dữ liệu cũ** (A-B6c):
   - Trước phát hành, chủ chạy **một lệnh chỉ đọc** (AI soạn sẵn) đếm đơn huỷ còn tiền trên dữ liệu thật.
   - Kế toán xác minh từng đơn. Đơn đã hoàn ngoài hệ thống trước khi có sổ thì ghi hoàn kèm ghi chú "đã hoàn ngoài hệ thống ngày …", ngày phát sinh trong tháng đang mở (Hiến chương 5.14).
8. **Kiểm:**
   - Bài test cho `phaiThuCua` (đơn huỷ → 0).
   - Bài e2e chép từ kịch bản 09, 26, HD06, QT05, DT04 vào `tests/e2e/`, bỏ dữ liệu thật; đỏ trước, xanh sau.
   - **Không** thêm R-BIL-11: phải thu là số tính ra, không lưu, nên kiểm SQL chỉ kiểm lại một hằng (A-B16).
   - Cảnh báo "quá N ngày" đặt ở danh sách Cần hoàn, không ở `audit-invariants`, vì công cụ đó chỉ chạy lúc triển khai (A-B15).

### Thay câu nào (ghi bằng dòng trỏ ở dòng trạng thái của ADR cũ, không sửa thân — ADR-0026:3; A-B8)
| Văn bản | Câu cũ | Thay bằng |
|---|---|---|
| ADR-0026, dòng thay ADR-0014 điều 11 (`:43`) | "Dấu 'cần chú ý hoàn cọc' đọc từ sổ (lần thu còn hiệu lực trên đơn đã huỷ)." | Giữ chữ. Cách tính qua "phải thu = 0" (đ1), hai phần (đ2), ba nơi hiện (đ3), điều kiện tắt (đ4) |
| ADR-0026 đ10 (`:83`) | "ghi lần thu trước 'Đã giao'" (không nói đơn huỷ) | + Đơn huỷ: chỉ Kế toán, Toàn quyền ghi lần thu (đ5) |
| ADR-0026 đ11 (`:88`, danh sách trắng biên nhận) | các trường hiện có | + trường đơn huỷ (đ3a) |
| ADR-0026 M2 (`:139`) | câu trên màn đơn | + câu cho đơn huỷ (đ3b) |
| ADR-0025 đ3d (`:53`), ADR-0024 (orders công bố "phải thu hiện hành") | phải thu không phụ thuộc trạng thái huỷ | phải thu của đơn huỷ = 0 (đ1) |
| Đặc tả v1.0 Việc 2 | ảnh đơn huỷ dùng mẫu xác nhận | mẫu thông báo huỷ (đ3a) |

**Hiến chương áp dụng:** 4.2 (sổ sinh từ sự kiện), 4.4, 5.4 (một hàm), 5.9 (trả dư là phải trả khác), 5.14 (khoá kỳ), 5.17 (sổ vàng: một ca mẫu đơn huỷ đúng đến từng đồng, Kế toán xác nhận).

### Câu hỏi mở
- **Q-A4** — mốc nhắc "chờ hoàn quá N ngày": **khuyến nghị 7 ngày lịch.**
  - Tính từ ngày huỷ. Bảng `orders` chưa có cột ngày huỷ, nên kế hoạch lấy từ dòng nhật ký huỷ (A-B15).
  - Với đơn trả dư thì tính từ ngày đi.

---

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

## Trang ghép lượt 1 (CLAUDE.md §9)

### 1. Bảng nào chứa loại thực thể nào
| Bảng | Thực thể | ADR chạm |
|---|---|---|
| `orders` | đơn (`draft/confirmed/cancelled`, mốc Đã giao, Hoàn thành) | 0089 đ1: phải thu của đơn `cancelled`. Tính ra, **không lưu** |
| `bil_payment_receipt` | lần thu của khách **và** lần trả lại khách (`CUSTOMER_PAYMENT`, `CUSTOMER_REFUND`, `0045:35`) **và** dòng đảo | 0089 đ5: ai ghi lần thu lên đơn huỷ; đ7: ghi hoàn dữ liệu cũ |
| `bil_posting`, `bil_debt_line` | phiếu sổ + dòng nợ: giữ hộ, nộp, trả, điều chỉnh; lượt 2 thêm `HOA_HONG`, `GIAM_GIA_BEN_DAT`, `GIA_VON`; dòng gắn chuyến (ADR-0057) | 0089 đ4: "còn ai giữ tiền của đơn huỷ" đọc từ đây. Không thêm loại mới |
| `staff`, `stf_permission`, vai hồ sơ (`roles.ts`) | tài khoản (nội bộ và bên ngoài, chung một bảng), quyền có hiệu lực, vai | 0090: ai được gán hay tạo quyền tiền, ai đặt lại PIN. Không đổi cột |

### 2. Dòng bản đồ quyền chạm các bảng trên
| Ô quyền | Hôm nay | Sau lượt 1 |
|---|---|---|
| `payment.receive` (SALES own, ACCOUNTING, ADMIN, FIELD assigned, PARTNER own, SUPER_ADMIN, INTERN own) | ghi được lên đơn huỷ | Không đổi ô. Thêm luật: **đơn huỷ chỉ ACCOUNTING, SUPER_ADMIN** (0089 đ5) |
| `payment.refund`, `ledger.write` (ACCOUNTING, SUPER_ADMIN) | hoàn | Không đổi. Nút hoàn hiện thêm ở đơn huỷ |
| `ledger.view` (`any`: ACCOUNTING, SUPER_ADMIN; `own`: nợ của chính mình) | — | Danh sách "Cần hoàn" và tên người giữ tiền chỉ `any` |
| `money.view` (PARTNER own…) | Đối tác thấy khối tiền đơn mình | Thấy dải "Cần hoàn", **không** thấy tên người giữ |
| `account.access.manage` (ADMIN, SUPER_ADMIN) | đặt lại PIN mọi cấp dưới | trừ tài khoản có quyền tiền (0090) |
| `account.create` (HR, SUPER_ADMIN), `account.edit` (ADMIN, HR, SUPER_ADMIN) | tạo, gán vai thường | tạo / gán quyền tiền chỉ SUPER_ADMIN (0090) |

### 3. Cổng nào canh cửa nào (kể cả giao diện đổi nghĩa)
| Cửa | Hôm nay | Sau lượt 1 |
|---|---|---|
| Ghi lần thu lên đơn huỷ | `can(payment.receive)` | + kiểm trạng thái huỷ, chỉ ACCOUNTING, SUPER_ADMIN |
| **Nút "Ghi hoàn"** (`web/order.ts:567`, theo khối `keToan` = `ledger.write`) | chỉ đơn trả dư | **Đổi nghĩa:** hiện thêm ở đơn huỷ còn tiền; mặc định người trả là người đang giữ |
| **Khối tiền trang đơn** (`web/order.ts:420, 438`) | đơn huỷ hiện "Còn lại" | dải "Cần hoàn" (hai phần) |
| **Ảnh gửi khách** (`src/shared/order-confirmation.ts:177, 220`) | mẫu xác nhận, dòng "Còn lại" | đơn huỷ: mẫu thông báo huỷ (đ3a) |
| Danh sách "Cần hoàn" | không có | route mới, `can(ledger.view)` phạm vi `any` |
| Đặt lại PIN, tạo tài khoản, sửa quyền | `can(...)` + `mayManage` / `roleAssignmentProblem` | + nhánh "tài khoản có quyền tiền → chỉ SUPER_ADMIN" |
| **Màn Quản lý tài khoản** | Quản trị thấy nút đặt lại PIN, chọn được vai Kế toán | ẩn với tài khoản / quyền tiền (cờ từng dòng) |
| Ô "Còn thiếu tiền" Trang chủ (chỉ đơn `confirmed` chưa Đã giao, `hoan-tat-repo.ts:65`) | — | Không đổi. Đơn huỷ vào "Cần hoàn" |

### 4. Va chạm
- 0089 và 0090 không chạm cùng cột.
- 0090 bảo vệ chính các ô (`ledger.write`, `payment.refund`) mà nút hoàn mới của 0089 dùng, nên **làm cùng đợt**.
- Với lượt 2: ADR-0092 đ7 sẽ thêm phí huỷ cho đơn huỷ.
  - Nếu chọn cách (i) (loại lần thu "Giữ làm phí huỷ") thì **không** phải sửa đ1 của 0089.
  - Nếu chọn cách (ii) (phí huỷ cấp đơn) thì đ1 đọc lại thành "phải thu đơn huỷ = phí huỷ đã ghi (mặc định 0)". Việc đó ghi ở bảng "Thay câu nào" của ADR-0092.
- **Tin báo mới** (0090 đ3: ngưng tài khoản Kế toán → Toàn quyền) cần một dòng cho ADR-0034: điều 1 (hành động nguồn) và điều 4 (ngăn "Của tôi").
- **Đánh số:** 0089, 0090 duyệt trước 0088. Khi chuyển vào `docs/adr/`, mục lục `docs/adr/README.md` giữ chỗ 0088, 0091, 0092, 0093.

### Loại cửa
- **0089:** luật và mã đảo được. Dòng hoàn ghi theo luật mới là **chỉ-thêm**, nên phần dữ liệu là một chiều (A-A23).
- **0090:** hai chiều (chỉ mã).
- Cả hai là **việc lớn** (tiền, quyền): người kiểm độc lập; thêm dòng `docs/SO-HANG-RAO.md` cho cổng "quyền tiền chỉ Toàn quyền", có quan sát chặn thật.
