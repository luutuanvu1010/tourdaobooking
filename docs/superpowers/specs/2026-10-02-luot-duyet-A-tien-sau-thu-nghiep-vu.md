# Lượt duyệt A — Tiền: ADR-0088 (bất biến tiền luôn đúng) + ADR-0089 (đơn huỷ còn tiền)

> **Trạng thái:** **NHÁP chờ chủ dự án duyệt văn bản.**
> - Chủ đã chọn **nguyên tắc** ngày 2026-10-02 (trả lời 5 câu của báo cáo thử nghiệp vụ). Văn bản dưới đây là AI viết lại nguyên tắc thành điều khoản, nên chủ phải duyệt văn bản rồi mới chuyển vào `docs/adr/` và thi công. AI không tự duyệt (Hiến pháp N3).
> - Soạn ngoài `docs/adr/` theo thói quen của dự án.
>
> **Số:** ADR-0088 và ADR-0089. Đã kiểm mọi nhánh ngày 2/10: 0086 bị bác, 0087 đang ở nhánh Giao diện công ty, 0088+ còn trống.
>
> **Bước ghép** (CLAUDE.md §9): lượt này có **2** quyết định chạm dữ liệu và tiền, kèm trang ghép ở cuối. Hai quyết định chạm quyền (PIN tạm, phá lệ mốc 6 giờ) để sang **lượt B** (`2026-10-02-luot-duyet-B-quyen-sau-thu-nghiep-vu.md`), vì mỗi lượt tối đa 3 quyết định.
>
> **Nguồn:**
> - `~/Documents/danh-gia-ux/2026-10-01/BAO-CAO.md`, gốc G1, G3, G4. 100 tình huống chạy thật trên app tạm đêm 1→2/10; kịch bản chạy lại được ở `~/Documents/danh-gia-ux/2026-10-01/kich-ban/`.
> - Sổ dừng dây chuyền `docs/quyen-hoan.json`: mục TNV-G1, TNV-G3, TNV-G4.

## Lời chủ dự án (nguyên văn, chat 2026-10-02)

> "1- Có , 2 - Luôn luôn, 3- cả 3. 4- ok, 5- cho phép (nhưng phải có nhãn hoặc ký hiệu riêng để nhận biết đây là ngoại lệ được cho phép và/hoặc đáng chú ý, không phải đơn bình thường)"

Các câu hỏi đã đặt cho chủ, chép từ báo cáo §6:
- **Câu 2:** "Bất biến 'đã thu = phải thu' xét tại mốc Đã giao (như mã và bộ kiểm hiện nay), hay luôn luôn (như chữ ADR)? Khuyến nghị: luôn luôn."
- **Câu 3:** "Phạm vi 'dấu cần chú ý hoàn cọc' (G1): nằm ở biên nhận, ở trang đơn, ở màn sổ, hay cả ba?"

---

## ADR-0088 — Bất biến tiền của đơn đã "Đã giao" đúng **mọi lúc**; sửa sai sau Đã giao phải ghi lại được; sổ không âm

### Bối cảnh (đã chạy thật, đã chạy lại)
- **G3** (tình huống 30, 49, KD06, DT05):
  - Lần thu ghi nhầm (nhầm đơn, nhầm hình thức, Đối tác khai khống chuyển khoản) làm sổ báo đủ, nên HDV bấm "Đã giao".
  - Kế toán đảo lần thu nhầm thì được (201). Nhưng ghi lại lần thu đúng bị chặn: 409 "Đơn đã Đã giao – đã thu đủ: không ghi thêm lần thu…".
  - "Hoàn thành" vẫn được, với "còn lại" 200.000–800.000đ.
  - `audit-invariants` báo xanh, vì R-BIL-1 chỉ so **tại mốc** Đã giao (`scripts/audit-checks.mjs:226-237`).
- **G4**:
  - **KT06:** hoàn 100.000 rồi đảo lần thu gốc thì "đã thu" thành **−100.000**, biên nhận đòi khách 300.000 cho đơn 200.000. Trigger "hoàn ≤ đã thu" (`0045:210-216`) chỉ chạy lúc hoàn, không chạy lúc đảo.
  - **KT04:** ghi nộp quá số đang giữ, hoặc nộp cho người không giữ, làm số dư âm, mà đơn vẫn Hoàn thành.
  - **KT05:** điều chỉnh không trần; lý do một ký tự là đủ.

### Quyết định
1. **I1 xét mọi lúc.**
   - ADR-0026 điều 13, `R-BIL-1` (I1): "đơn đã 'Đã giao': tổng lần thu còn hiệu lực = phải thu hiện hành". Câu này đúng **ở mọi thời điểm sau mốc Đã giao**, không chỉ tại lúc bấm.
   - Cách hiểu "tại mốc" trong kế hoạch thi công sổ tiền lượt 1 §3.2 bị bỏ.
   - "Tổng lần thu còn hiệu lực" tính **ròng**: lần thu chưa đảo trừ hoàn chưa đảo, cùng một hàm `conLai`/`hieuLuc` đang dùng.
2. **Lệnh ghi không được làm lệch I1 trên đơn đã Đã giao.** Mọi lệnh ghi lên đơn đã Đã giao (đảo lần thu, ghi hoàn, điều chỉnh tiền đơn, đảo dòng nợ) hoặc **giữ nguyên** I1, hoặc **bị chặn** kèm câu báo chỉ đường. Cụ thể:
   - **a.** Thêm lệnh **"Thay lần thu"** cho Kế toán và Toàn quyền: trong **một lô ghi**, đảo lần thu sai và ghi lần thu đúng (đúng người thu, hình thức, số), sao cho I1 vẫn đúng sau lô. Đây là đường sửa sai chuẩn sau Đã giao; đảo đơn lẻ trên đơn đã Đã giao bị chặn.
   - **b.** Khi tiền thật **không về** (ví dụ khai khống chuyển khoản), lệnh thay ghi lần thu đúng theo **người thực sự nợ**:
     - người thu là nhân viên hoặc Đối tác thì ghi "đang giữ" (nợ công ty);
     - khách chưa trả thì ghi dòng nợ phải thu khách.
     
     Không còn tình trạng "tiền biến khỏi sổ".
   - **c.** Ghi hoàn trên đơn đã Đã giao chỉ được trong phạm vi tiền **trả dư** (đã thu ròng > phải thu), như ADR-0026 M2; hoàn vượt dư bị chặn.
3. **Hoàn thành bị chặn khi I1 lệch**, kèm câu báo nói lệch bao nhiêu và lệnh nào sửa. Đây là chặn ở máy chủ, không chỉ ẩn nút.
4. **Sổ không âm** (CSDL chặn bằng trigger trong cùng lô, cộng máy chủ kiểm trước):
   - **a.** Đã thu ròng của một đơn **≥ 0** ở mọi lúc. Cấm đảo một lần thu khi phần của nó đã bị hoàn (KT06): phải đảo lần hoàn trước.
   - **b.** Ghi nộp hoặc trả cho người giữ **≤ số người đó đang giữ trên chính đơn đó**. Nộp cho người không giữ bị chặn.
   - **c.** Điều chỉnh tiền: lý do **≥ 10 ký tự**, và trị tuyệt đối **≤ phải thu hiện hành của đơn**. Muốn vượt thì Toàn quyền làm. Đây là con số đề xuất, chủ chỉnh ở "Câu hỏi mở".
5. **Bộ kiểm** (`scripts/audit-invariants.mjs`, xanh không được vì rỗng):
   - `R-BIL-1` chạy theo điều 1;
   - thêm **`R-BIL-8`**: đã thu ròng ≥ 0 mọi đơn;
   - thêm **`R-BIL-9`**: số dư "đang giữ" ≥ 0 trên từng cặp (người, đơn);
   - thêm **`R-BIL-10`**: đơn đã Hoàn thành thì I1 đúng.
   
   Mỗi bất biến mới cần một lần **quan sát chặn thật**: dựng dữ liệu sai trên D1 tạm → đỏ → hoàn nguyên. Ghi vào `docs/SO-HANG-RAO.md`.

### Thay câu nào
| Văn bản | Câu cũ / cách hiểu cũ | Thay bằng |
|---|---|---|
| ADR-0026 điều 13, R-BIL-1 | (chữ đúng) | Giữ chữ; ghi thêm "xét mọi lúc sau mốc Đã giao" (ADR-0088 đ1) |
| Kế hoạch sổ tiền lượt 1 §3.2 | "so tại mốc Đã giao" | Bỏ (ADR-0088 đ1) |
| ADR-0025 / ADR-0026 về Đã giao: "không ghi thêm lần thu" | chặn mọi lần thu sau Đã giao | Giữ chặn lần thu **mới** của Bán hàng / HDV; **mở lệnh "Thay lần thu"** của Kế toán và Toàn quyền (đ2a) |

### Phương án bị loại
- **Giữ "tại mốc":** tiền biến khỏi sổ mà không bộ kiểm nào bắt, như đã thấy ở G3.
- **Cho ghi lần thu mới tự do sau Đã giao:** mở lại cửa mà ADR-0025 cố ý đóng.

### Hệ quả
- Kế toán có một đường sửa sai đúng sau Đã giao; Hoàn thành chỉ đóng sổ khi số khớp.
- Ba bất biến mới.
- Câu báo 409 "Sai sót thì Kế toán ghi điều chỉnh trong sổ" phải đổi: chỉ đúng lệnh "Thay lần thu".

### Câu hỏi mở (chủ trả lời khi duyệt văn bản)
- **Q-A1** — Trần điều chỉnh (đ4c):
  - **(khuyến nghị)** ≤ phải thu hiện hành, lý do ≥ 10 ký tự;
  - hoặc một con số tuyệt đối, ví dụ 5 triệu;
  - hoặc không trần nhưng phải có Toàn quyền duyệt.
- **Q-A2** — KT02: hai người khai **cùng một** khoản chuyển khoản, cả hai được xác nhận.
  - Thêm ô **mã giao dịch ngân hàng** riêng (không phải ghi chú; hiện ghi chú chặn chuỗi giống số tài khoản) và cảnh báo trùng mã. **Khuyến nghị:** có, làm cùng đợt; hai chiều.

---

## ADR-0089 — Đơn huỷ còn tiền: "phải thu" về 0, tiền đã thu thành "chờ hoàn", dấu hiện ở **cả ba nơi**

### Bối cảnh (đã chạy thật, đã chạy lại)
- **G1** (tình huống 09, 26, HD06, HD08, QT05, DT04, KT01): đơn 200.000 thu cọc 50.000 rồi huỷ.
  - Sổ ghi "phải thu 200.000, còn lại 150.000, dư chờ hoàn 0".
  - Biên nhận gửi khách vẫn ghi "Còn lại 150.000".
  - Nút "Ghi hoàn" không hiện, vì nó chỉ hiện khi dư > 0 (`web/order.ts:567`).
  - Kế toán không có danh sách nào nhắc.
- **Gốc:** "phải thu" của đơn huỷ không về 0 (`src/modules/orders/hoan-tat.ts:9-17,64`).
- ADR-0026 (bảng thay ADR-0014 điều 11) đã hứa dấu "cần chú ý hoàn cọc" đọc từ sổ, nhưng chưa có mã.

### Quyết định
1. **Phải thu hiện hành của đơn đã huỷ = 0.** Hệ quả tự nhiên qua cùng hàm `conLai`: "dư chờ hoàn" = đã thu ròng; "còn lại" = 0.
2. **Giữ ADR-0026 điều 10:** đơn huỷ vẫn ghi được lần thu (ví dụ khách chuyển khoản muộn). Tiền đó cũng vào "chờ hoàn".
3. **Dấu "cần hoàn cọc" hiện ở cả ba nơi** (chủ chọn "cả 3"):
   - **a. Biên nhận / ảnh gửi khách** của đơn huỷ:
     - không có dòng "Còn lại";
     - thay bằng "Đơn đã huỷ — đã thu X — công ty sẽ hoàn X" khi còn chờ, và "đã hoàn đủ" khi xong;
     - tiêu đề không còn là "XÁC NHẬN ĐƠN DỊCH VỤ" mà là "THÔNG BÁO HUỶ ĐƠN DỊCH VỤ" (chữ cụ thể chủ chỉnh khi duyệt giao diện).
   - **b. Trang đơn:** dải cảnh báo "Cần hoàn cho khách X" ở khối tiền, kèm người đang giữ tiền. Nút "Ghi hoàn" cho Kế toán và Toàn quyền.
   - **c. Màn sổ (Kế toán):** danh sách **"Cần hoàn"** gồm đơn huỷ còn tiền và đơn trả dư. Mỗi dòng có số tiền, ai đang giữ, bao nhiêu ngày. Màn sổ chưa có, chủ thiết kế trên Claude Design. Trong lúc chờ, máy chủ có route trả danh sách này để màn tạm dùng.
4. **Công ty giữ một phần cọc làm phí huỷ** (nếu có chính sách) thì Kế toán ghi **điều chỉnh "giữ cọc làm phí huỷ"**, có lý do, theo ADR-0088 đ4c. Phần còn lại vẫn "chờ hoàn". Dấu tắt khi chờ hoàn = 0.
5. **Bộ kiểm:** thêm **`R-BIL-11`**: đơn huỷ thì phải thu hiện hành = 0. Thêm cảnh báo, không phải lỗi, cho "đơn huỷ còn chờ hoàn quá N ngày" (N do chủ đặt, đề xuất 7).

### Thay câu nào
| Văn bản | Câu cũ | Thay bằng |
|---|---|---|
| ADR-0026, dòng thay ADR-0014 điều 11 | "Dấu 'cần chú ý hoàn cọc' đọc từ sổ (lần thu còn hiệu lực trên đơn đã huỷ)." | Giữ, nói rõ nơi hiện: biên nhận, trang đơn, màn sổ (ADR-0089 đ3); cách tính qua "phải thu = 0" (đ1) |
| Đặc tả v1.0 Việc 2 ("đơn nào cũng xuất được ảnh") | ảnh đơn huỷ dùng chung mẫu xác nhận | Đơn huỷ dùng mẫu "thông báo huỷ" (đ3a) |

### Phương án bị loại
- **Chỉ thêm dấu mà giữ "phải thu" cũ:** hai luật song song cho cùng một con số; đúng lỗi "hai luật" từng tái phát 4 lần.

### Câu hỏi mở
- **Q-A3** — Phí huỷ:
  - Công ty có chính sách giữ cọc khi khách huỷ muộn không?
  - Nếu có, **khuyến nghị** lượt này ghi tay bằng điều chỉnh (đ4); tự tính theo mốc ngày thì để sau, cần ADR riêng.
- **Q-A4** — Mốc nhắc "chờ hoàn quá N ngày":
  - **(khuyến nghị)** 7 ngày;
  - hoặc khác.

---

## Trang ghép lượt A (bắt buộc, CLAUDE.md §9)

### 1. Bảng nào chứa loại thực thể nào
| Bảng | Thực thể đang chứa | ADR lượt này chạm |
|---|---|---|
| `orders` | đơn: trạng thái `draft/confirmed/cancelled`, mốc `delivered_at`, `completed_at`, tổng tiền | 0089 đ1 (phải thu của đơn `cancelled`); 0088 đ3 (chặn Hoàn thành) |
| `bil_payment_receipt` | lần thu của khách (`CUSTOMER_PAYMENT`) **và** lần hoàn (trả khách) **và** dòng đảo của hai loại trên. Một bảng, nhiều loại; phân theo `kind` | 0088 đ2a, đ4a; 0089 đ2 |
| `bil_debt_line` / `bil_posting` | dòng nợ hai chân dưới phiếu sổ: giữ hộ, nộp, trả, điều chỉnh | 0088 đ2b, đ4b, đ4c; 0089 đ4 |
| `order_money_adjustment` | điều chỉnh tiền đơn của HDV và điều chỉnh sau xác nhận | 0088 đ2 (đơn đã Đã giao) |
| `audit_log` | nhật ký | lệnh "Thay lần thu" ghi một dòng |

### 2. Dòng bản đồ quyền chạm các bảng trên, áp cho loại nào
| Ô quyền (`permissions.ts`) | Ai | Áp cho | Lượt này đổi gì |
|---|---|---|---|
| `payment.receive` | SALES own, ACCOUNTING, ADMIN, FIELD assigned, PARTNER own, SUPER_ADMIN, INTERN own | lần thu **trước** Đã giao | Không đổi ô. Sau Đã giao vẫn chặn lần thu mới |
| `payment.refund` | ACCOUNTING, SUPER_ADMIN | lần hoàn | Không đổi ô. Giới hạn số theo dư (0088 đ2c); đơn huỷ nay có dư (0089 đ1) |
| `ledger.write` | ACCOUNTING, SUPER_ADMIN | đảo, nộp, trả, điều chỉnh, **"Thay lần thu" (mới)** | Lệnh mới nằm dưới ô này, **không thêm mã quyền** (không nhân đôi bài tập con quyền) |
| `order.complete` | ACCOUNTING, SUPER_ADMIN | Hoàn thành | Thêm điều kiện I1 (0088 đ3) |
| `ledger.view` / `money.view` | như hiện tại | danh sách "Cần hoàn" | Danh sách mới đọc dưới `ledger.view` phạm vi `any` (Kế toán, Toàn quyền); vai `own` chỉ thấy đơn mình |

### 3. Cổng nào canh cửa nào (kể cả giao diện ẩn/hiện đổi nghĩa)
| Cửa | Cổng hiện có | Sau lượt này |
|---|---|---|
| Ghi lần thu sau Đã giao | route 409 `order_delivered` | Giữ cho lần thu mới; mở **"Thay lần thu"** (route mới, `can(ledger.write)`, một lô, trigger kiểm I1 cuối lô) |
| Đảo lần thu trên đơn đã Đã giao | route cho phép (201) | **Chặn**, chỉ đường "Thay lần thu" |
| Đảo lần thu đã bị hoàn | không chặn | **Chặn** (trigger đ4a + máy chủ) |
| Ghi nộp | không ràng số | ≤ đang giữ trên đơn (trigger đ4b) |
| Hoàn thành | kiểm người giữ tiền | **+ kiểm I1** (máy chủ) |
| **Giao diện: nút "Ghi hoàn"** (`web/order.ts:567`, hiện khi `du > 0`) | chỉ đơn trả dư | **Đổi nghĩa:** nay hiện cả ở **đơn huỷ còn tiền**. Phải kiểm lại: chỉ vai `payment.refund` thấy nút; Bán hàng / HDV chỉ thấy dải "Cần hoàn" |
| **Giao diện: khối tiền "Còn lại" / "Khách trả dư"** (`web/order.ts:420,438`) | đơn huỷ hiện "Còn lại" | Đơn huỷ hiện "Cần hoàn cho khách" |
| **Giao diện: nút "Đảo"** (`web/order.ts:534`) | hiện cả sau Đã giao | Sau Đã giao thay bằng "Thay lần thu" |
| **Ảnh gửi khách** (`src/shared/order-confirmation.ts:177,220`) | tiêu đề "XÁC NHẬN…", dòng "Còn lại" | Đơn huỷ: mẫu "thông báo huỷ", không dòng "Còn lại" |
| Ô "Còn thiếu tiền" của Trang chủ (chỉ đơn `confirmed` chưa Đã giao) | không đổi | Không đổi. Đơn huỷ không vào "còn thiếu", mà vào "Cần hoàn" |

### 4. Va chạm giữa hai ADR của lượt
- **0089 đ4** (giữ cọc làm phí huỷ) dùng điều chỉnh của **0088 đ4c**, nên trần điều chỉnh phải cho phép tới mức đã thu ròng của đơn huỷ. Với đơn huỷ, phải thu = 0 nên trần "≤ phải thu" sẽ là 0. **Cần sửa đ4c:** trần = max(phải thu, đã thu ròng). Chủ quyết cùng Q-A1.
- **0088 đ1** (I1) chỉ áp cho đơn đã Đã giao; đơn huỷ không qua Đã giao, nên không xung đột với 0089 đ1.

### Loại cửa
Cả hai ADR là **hai chiều**: không đổi schema một chiều, có thể hoàn bằng mã và migration thêm trigger. Thi công là **việc lớn** (tiền, dữ liệu), nên phải có người kiểm độc lập. Kịch bản tình huống ở `~/Documents/danh-gia-ux/2026-10-01/kich-ban/` dùng làm bài e2e đỏ trước, xanh sau.
