# Oracle chống trùng theo hai lớp, và cách áp vào Tour Đảo Booking

> **Trạng thái:** **ĐẶC TẢ MỞ RỘNG — nháp, chờ chủ dự án trả lời các câu ở §3.5** (2026-10-02).
>
> **Lời chủ dự án (nguyên văn, chat 2026-10-02):**
>
> > "Đồng ý, đều phải có cơ chế chống trùng, truy ngược lại khung của Oracle xem nên làm kiểu gì"
>
> Câu này trả lời câu Q-F02 trong `2026-10-02-phieu-tra-loi-de-xuat-cho-chu.md`. **Cách hiểu đã ghi lại:**
> - (1) đặc tả `2026-09-22-chong-gui-trung.md` được duyệt;
> - (2) "đều phải có" nghĩa là **mọi lệnh ghi** đều có chống trùng, kể cả tạo hồ sơ ở màn Hồ sơ (câu 2 của đặc tả 22/9 chọn **(b) có**);
> - (3) mở rộng sang lệnh tiền theo khung Oracle trong tệp này (§3.3, §3.5 lượt A).
>
> Chủ sửa nếu hiểu sai. Mục (2) là **cách hiểu của AI, chờ chủ xác nhận**.
>
> **Đối chiếu mã câu hỏi** §3.5 (dưới) với phiếu trả lời cho chủ:
> - **A1:** đã có lời chủ ("đều phải có"); mã lần gửi bắt buộc.
> - **A2** → CT1; **A3** → CT2.
> - **B1** → Q-A2 (ADR-0092 đ6, lượt 2b).
> - **B2** → CT3; **B3** → CT4.
> - **C1** → CT6, CT7, CT8.
> - **C2** → CT5.
> - **C3** → theo cách hiểu (2) là **có**, chờ chủ xác nhận.
>
> Dòng "Tạo hồ sơ khách" ở §3.2 ghi "chưa làm" theo khuyến nghị cũ của đặc tả 22/9; nay đọc là **làm**.
>
> **Nguồn:** tài liệu chính thức Oracle, đọc ngày 2026-10-02, có URL ở §5. Mỗi khẳng định gắn nhãn nguyên văn / suy luận / chưa xác minh. Phần §3 là **đề xuất cho app**, không phải sự thật Oracle.
>
> **Liên quan:**
> - ADR-0092 đ6 (mã giao dịch ngân hàng) đã chỉnh theo §3.2: chặn trùng (mã, đơn), cảnh báo khi khác đơn;
> - ADR-0088 (lệnh Thay lần thu), ADR-0089 (duyệt hoàn, chi hoàn): đều bắt buộc có mã lần gửi;
> - `docs/quyen-hoan.json` F-02 (hạn 15/10).


> Ngày đọc nguồn: **2026-10-02**. Người soạn: trợ lý nghiên cứu, chỉ đọc kho (worktree `quyet-dinh-thu-nghiep-vu`, HEAD 54ce280b).
> Trạng thái: **tài liệu nghiên cứu, chưa phải quyết định**. §1–§2 là điều Oracle viết (mỗi câu ghi mức tin cậy). §3 là **đề xuất** chạm tiền, dữ liệu và quyền, nên phải ra ADR và được chủ duyệt (CLAUDE.md §3, §9).
> Mức tin cậy: **[NV]** = trích nguyên văn từ trang Oracle đã mở được; **[SL]** = suy luận của người soạn từ câu nguyên văn; **[CXM]** = chưa xác minh (không mở được trang gốc, chỉ có tóm tắt của công cụ tìm kiếm, hoặc chỉ có nguồn thứ ba).

---

## 0. Kết luận cho chủ (lời thường)

Oracle chống trùng ở **hai tầng**:

1. **Tầng máy (gửi lại một lần bấm):** mỗi lần bấm mang một "số vé"; máy chủ không làm lại. Oracle giữ số vé 24 giờ.
2. **Tầng nghiệp vụ (hai người nhập cùng một việc):**
   - Có **số của bên ngoài** (hoá đơn, biên lai, sao kê) thì **chặn cứng**.
   - Chỉ "trông giống nhau" thì **cảnh báo**, người nhập tự chọn, sau đó gộp.

App đã có tầng máy ở Góp ý, Thông báo, Vận chuyển; còn thiếu ở **lập đơn và các lệnh tiền**. Đề xuất:
- Gắn "số vé" cho các lệnh đó.
- Thêm **mã giao dịch ngân hàng** để chặn hai người khai cùng một khoản chuyển khoản.
- Thu tiền mặt giống nhau chỉ **cảnh báo**.

Cần bạn quyết 9 câu, chia ba lượt (§3.5).

---

## 1. Tầng kỹ thuật ở Oracle: gửi lại cùng một yêu cầu (idempotency)

### 1.1 Oracle Cloud Infrastructure (OCI): header `opc-retry-token`

| # | Điều Oracle viết | Mức | Nguồn |
|---|---|---|---|
| 1 | "For some operations you can provide a unique retry token (`opc-retry-token`) so the request can be retried in case of a timeout or server error without the risk of executing that same action again." | NV | [REST APIs — OCI](https://docs.oracle.com/en-us/iaas/Content/API/Concepts/usingapi.htm) (tài liệu OCI hiện hành) |
| 2 | Thời hạn giữ: "The token expires after 24 hours, but can be invalidated before then due to conflicting operations (for example, if a resource has been deleted and purged from the system, then a retry of the original creation request may be rejected)." | NV | như trên |
| 3 | Mã lỗi **409 `InvalidatedRetryToken`**: "The provided retry token was used in an earlier request that resulted in a system update, but a subsequent operation invalidated the token… If the system state change that is associated with this request should be performed again, retry it using a different token." Có ghi "Retry: No". | NV | [API Errors — OCI](https://docs.oracle.com/en-us/iaas/Content/API/References/apierrors.htm) |
| 4 | 409 `NotAuthorizedOrResourceAlreadyExists`: chỉ trả ở lệnh **create**, "the resource you are attempting to create already exists". | NV | như trên |
| 5 | Khoá lạc quan cho lệnh sửa/xoá: "The GET and POST calls return an `etag` response header… set the `if-match` header… The resource will then be updated or deleted *only* if the ETag you provide matches the current value." | NV | [REST APIs — OCI](https://docs.oracle.com/en-us/iaas/Content/API/Concepts/usingapi.htm) |
| 6 | Bộ SDK tự gửi lại mặc định: "8 total attempts", "600 seconds", gửi lại khi "Timeouts and connection errors", "HTTP 409 (IncorrectState, LockConflict)", "HTTP 429s", "HTTP 5xx (server errors), except 501". | NV | [OCI Python SDK — Retries](https://docs.oracle.com/iaas/tools/python/latest/sdk_behaviors/retries.html) (bản latest) |
| 7 | SDK Ruby có hàm sinh số vé: "Generates a token which can be used as a value for the opc-retry-token header value…" | NV | [OCI Ruby SDK — OCI::Retry](https://docs.oracle.com/en-us/iaas/tools/ruby/latest/OCI/Retry.html) |
| 8 | Gửi lại **cùng số vé, cùng nội dung**, máy chủ trả gì (cùng phản hồi cũ? mã 200 hay 201?) | **CXM** | Hai trang OCI đã đọc không nói |
| 9 | Gửi lại **cùng số vé, khác nội dung** thì sao | **CXM** | Không thấy ở trang Oracle. Công cụ tìm kiếm trả lời "409" nhưng trích từ tài liệu **AWS**, không phải Oracle |
| 10 | SDK có tự gắn số vé và giữ nguyên số đó qua các lần gửi lại không | **CXM** | Trang Python/TypeScript SDK đã đọc không nói |
| 11 | Số vé dài 1–64 ký tự; phạm vi số vé (theo tenancy hay theo người) | **CXM** | Chỉ có trong tóm tắt kết quả tìm kiếm; phạm vi không thấy tài liệu nào nói |

**Ý chính [SL]:** OCI tách hai việc.
- **Số vé (retry token)** dành cho lệnh **tạo**.
- **ETag/If-Match** dành cho lệnh **sửa/xoá**: chỉ ghi khi bản đang có đúng là bản mình đã đọc.
- Số vé hết hạn sau 24 giờ, hoặc mất hiệu lực sớm hơn khi tài nguyên đã bị xoá. Khi đó dùng lại số vé thì bị 409.

### 1.2 Oracle Fusion Applications REST

| # | Điều Oracle viết | Mức | Nguồn |
|---|---|---|---|
| 1 | Header `Upsert-Mode`: "If true, the server performs an Upsert operation instead of a Create operation. During an Upsert operation, the server attempts to find an existing resource that matches the payload. If a match is found, the server updates the existing resource instead of creating a new one… Note that the Upsert operation isn't supported for date-effective REST resources." | NV | [Fusion Sales REST — Create an opportunity team member](https://docs.oracle.com/en/cloud/saas/sales/faaps/op-opportunities-optynumber-child-opportunityresource-post.html); cùng câu ở [SCM 26A — Create sales orders](https://docs.oracle.com/en/cloud/saas/supply-chain-and-manufacturing/26a/fasrp/op-salesordersfororderhub-post.html) |
| 2 | "The exact behavior of upsert mode is determined by the service." (khoá so khớp do từng dịch vụ tự định) | NV | [Visual Builder Add-in 4.5 — Upload Changes Using Upsert Mode](https://docs.oracle.com/en/cloud/paas/visual-builder-addin/4.5/excel-developer/upload-changes-using-upsert-mode.html) |
| 3 | Upsert trả 201 khi tạo, 200 khi cập nhật | **CXM** | Chỉ có trong tóm tắt tìm kiếm |
| 4 | Đơn bán (SCM 26A): `SourceTransactionNumber` là "Value that uniquely identifies the transaction in the source application"; `SourceTransactionId`: "The application uses this attribute and the source transaction to uniquely identify the transaction and create the composite key for a change order. You must make sure that each change order uses the same value that the new sales order used."; có thêm `SourceTransactionRevisionNumber` "Revision number of the transaction." | NV | [SCM 26A — Create sales orders](https://docs.oracle.com/en/cloud/saas/supply-chain-and-manufacturing/26a/fasrp/op-salesordersfororderhub-post.html) |
| 5 | Gửi lại cùng khoá nguồn kèm số sửa đổi mới thì thành **đơn sửa đổi** (change order), không thành đơn mới | **SL** | Suy từ câu ở dòng 4; trang không nói thẳng |
| 6 | Fusion REST có header số vé kiểu `opc-retry-token` không | **CXM** | Không tìm thấy. Không thấy không có nghĩa là không có |

**Ý chính [SL]:** Fusion không dùng số vé ngẫu nhiên cho từng lần bấm. Nó dùng **khoá tự nhiên do bên gửi cấp** (hệ nguồn + số chứng từ nguồn), kèm `Upsert-Mode` để "có rồi thì sửa, chưa có thì tạo".

### 1.3 Oracle Integration, Oracle Payments, Oracle Commerce

- Oracle Integration: chỉ đọc được câu "The integration platform ensures guaranteed processing and also supports resubmission of failures." **[NV]**, [Avoid Common Integration Pattern Pitfalls](https://docs.oracle.com/en/cloud/paas/application-integration/integrations-user/avoid-common-integration-style-pitfalls.html). Cơ chế chống trùng cụ thể: **CXM**.
- Oracle Payments, Oracle Commerce: không tìm được trang chính thức nói về số vé hay chống gửi trùng. **CXM**.

---

## 2. Tầng nghiệp vụ ở Oracle: cùng một việc ngoài đời bị nhập hai lần

### 2.1 Order Management: nhập trùng đơn từ hệ nguồn

| | Nội dung | Mức | Nguồn |
|---|---|---|---|
| Khoá so trùng | Khi bật `DOO_RT_USE_ORDER_NUMBER`: "the predefined DOO_VALIDATE_DUPLICATE_SOURCE_ORDER constraint looks at the value in the Source Transaction Number attribute in your import payload and makes sure it doesn't already exist in the Oracle database." | NV | [SCM 26B — Keep Your Order Number When You Import](https://docs.oracle.com/en/cloud/saas/supply-chain-and-manufacturing/26b/faiom/retain-sales-order-number-during-import.html) |
| Chặn hay cảnh báo | **Chặn**: "If the value already exists, then the constraint prevents you from importing the order line." | NV | như trên |
| Mặc định | "DOO_VALIDATE_DUPLICATE_SOURCE_ORDER comes predefined as enabled." | NV | như trên |
| Ai bỏ qua | Người cấu hình tắt được ràng buộc, nhưng phải tự bảo đảm số không trùng: "you must make sure that each Source Order Number you import is unique across all source systems. If it isn't unique, then it might corrupt your data." | NV | như trên |
| Ghi vết | Không thấy | CXM | — |
| EBS: `ORIG_SYS_DOCUMENT_REF` + `ORDER_SOURCE_ID` | Theo tóm tắt tìm kiếm, `ORIG_SYS_DOCUMENT_REF` là số chứng từ của hệ đặt hàng bên ngoài, nằm ở bảng `OE_HEADERS_IFACE_ALL`. Ràng buộc "không trùng theo nguồn + số": chưa mở được tài liệu PDF gốc (Order Management APIs and Open Interfaces Manual 11i) | **CXM** | Tương đương bên Fusion: `SourceTransactionSystem` + `SourceTransactionId` (§1.2) |
| Cảnh báo "cùng một khách đặt hai đơn" | Không tìm thấy tài liệu Oracle | CXM | — |

### 2.2 Payables: hoá đơn nhà cung cấp trùng

| | Nội dung | Mức | Nguồn |
|---|---|---|---|
| Kiểm chuẩn khi nhập | Cột `INVOICE_NUM`: "Must be a unique number for the supplier. If you assign a duplicate invoice number for the supplier, the import process doesn't create an invoice from this record." và "The import process rejects invoices with duplicate invoice numbers." → **chặn cứng**, khoá = nhà cung cấp + số hoá đơn | NV | [Financials 26A — Invoice Open Interface Table AP_INVOICES_INTERFACE](https://docs.oracle.com/en/cloud/saas/financials/26a/fappp/invoice-open-interface-table-ap-invoices-interface.html) |
| Kiểm thêm (tuỳ chọn bật) | "When the duplicate invoice check feature is enabled, it performs checks based on the combination of the supplier, invoice type, amount, currency, and date. This check includes all the invoices received and processed from a supplier." Bật bằng Lookup Type `ADD_DUPLICATE_INV_CHECK`, Lookup Code `DUPLICATE_INVOICE_CHECK` | NV | [Financials 26A — How can I find duplicate invoices without considering the invoice number…](https://docs.oracle.com/en/cloud/saas/financials/26a/fappp/how-can-i-find-duplicate-invoices-without-considering-the.html) |
| Kiểm thêm là chặn hay cảnh báo | Trang không nói | **CXM** | — |
| Khoá chuẩn gồm cả "đơn vị kinh doanh + nơi nhận của nhà cung cấp" | Chỉ có ở blog bên thứ ba | **CXM** (nguồn thứ ba) | — |
| Bản cũ (11i) | "Payables prevents you from entering an invoice with exactly the same invoice number for the same supplier", nhưng vẫn lọt được nếu khác tên nhà cung cấp hoặc khác chữ hoa/thường. Có báo cáo **Invoice Audit Report** để phát hiện **sau**: so số hoá đơn giống nhau trong độ dài ký tự tự chọn và ngày trong khoảng tự chọn | NV | [Oracle Applications 11i — Identifying Duplicate Invoices](https://docs.oracle.com/cd/A60725_05/html/comnls/us/ap/duplinv.htm) |

### 2.3 Receivables: biên lai thu tiền trùng, lockbox

| | Nội dung | Mức | Nguồn |
|---|---|---|---|
| Nhập tay | Lỗi `AR_RCP_DUP_NUM`: "A receipt with this number, date, amount and customer already exists. Enter a unique receipt number." → **chặn**. Khoá = số biên lai + ngày + số tiền + khách | NV | [Financials 26C REST — Error Messages for Standard Receipts](https://docs.oracle.com/en/cloud/saas/financials/26c/farfa/Error_Messages_for_Standard_Receipts.html) |
| Lockbox (tệp ngân hàng) | "Duplicate receipts have the same receipt number, amount, currency, and customer account number. Lockbox doesn't allow duplicate receipts within the same receipt source for the same customer. This is the same validation Receivables performs when you manually enter receipts." Thêm: "No duplicate lockbox numbers."; "Batch name is unique within the transmission."; "Transaction numbers are only required to be unique within a receipt source." | NV | [Financials 26A — How Lockbox File Transmissions Are Validated](https://docs.oracle.com/en/cloud/saas/financials/26a/fairp/how-lockbox-file-transmissions-are-validated.html) |
| Số biên lai một mình không bắt buộc duy nhất | Khoá trùng gồm cả ngày, số tiền, khách, nên cùng số mà khác số tiền thì không bị coi là trùng | **SL** | Câu "nhiều khách hàng dùng số séc làm số biên lai" chỉ có ở blog: nguồn thứ ba |
| Ai bỏ qua, ghi vết | Không thấy | CXM | — |

### 2.4 Cash Management: sao kê ngân hàng và đối chiếu

| | Nội dung | Mức | Nguồn |
|---|---|---|---|
| Chống nhập trùng sao kê | "The Statement ID should be unique in a bank account within a calendar year." (áp cho cả sao kê ngày trước và sao kê trong ngày). Sao kê trong ngày: "Only one statement is allowed per day." Nếu đã có sao kê trong ngày nhập tay cùng khoảng ngày thì "the incremental statement isn't imported and the process is completed with a status of: Import Error" → **chặn** | NV | [Financials 25D — How You Process Electronic Bank Statements](https://docs.oracle.com/en/cloud/saas/financials/25d/faofc/how-you-process-electronic-bank-statements.html) |
| Khoá đối chiếu | Quy tắc khớp dùng **Amount, Date, Reconciliation reference, Transaction type**. Kiểu khớp: One to One, One to Many, Many to One, Many to Many, Zero Amount ("A bank statement line is reconciled against many system transactions"…) | NV | [Financials 26A — Reconciliation Matching Rules](https://docs.oracle.com/en/cloud/saas/financials/26a/faipp/reconciliation-matching-rules.html) |
| Khớp theo số (EBS 12.2) | Với biên lai: Receipt Number khớp Transaction Number của dòng sao kê, "and the transaction amount is within the reconciliation tolerance" | NV (qua tóm tắt trang) | [EBS 12.2 — Oracle Cash Management User Guide, AutoReconciliation](https://docs.oracle.com/cd/E26401_01/doc.122/e48900/T359831T359834.htm) |
| Một giao dịch không đối chiếu được hai lần | 11i: "You can unreconcile any transaction that you have previously reconciled." và "The unreconciled transactions are once again available for reconciliation." Từ đó suy ra: giao dịch **đã** đối chiếu thì **không còn** để khớp với dòng khác, muốn khớp lại phải gỡ trước | NV + **SL** | [11i — Changing the Reconciliation Status](https://docs.oracle.com/cd/A60725_05/html/comnls/us/ce/rmanua05.htm) |
| Ai được gỡ đối chiếu, ghi vết | Không thấy | CXM | — |

### 2.5 TCA / Customer Data Management: hồ sơ khách trùng

| | Nội dung | Mức | Nguồn |
|---|---|---|---|
| Mục đích | Cấu hình so khớp gồm "attributes and parameters for real-time and batch matching of entities to prevent duplicate entries and identify existing duplicates." Có sẵn hai cấu hình: **Account Duplicate Identification**, **Contact Duplicate Identification**. Ngưỡng điểm (Score Threshold) mặc định **90** trên thang 0–100 | NV | [CDM — Enterprise Data Quality Matching Configurations](https://docs.oracle.com/en/cloud/saas/customer-data-management/fadir/enterprise-data-quality-matching-configurations.html) |
| Khi tạo mới | "Salespeople see the possible duplicates in a separate window and get to decide if they want to continue creating the new record or edit an existing one instead." → **cảnh báo**, **chính người nhập** được bỏ qua. Tiêu chí: tên tổ chức, số D-U-N-S, mã số thuế, địa chỉ. Tuỳ chọn hồ sơ: `ZCM_ACC_DUP_NOTIFICATION`, `ZCM_ACC_EXACT_NAME_MATCH`, `ZCM_CON_DUP_NOTIFICATION`, `ZCM_CON_EXACT_NAME_MATCH` (đều là bật thông báo, không có tuỳ chọn chặn cứng) | NV (tên tuỳ chọn lấy qua tóm tắt của trang) | [Sales — How do I enable duplicate checking for accounts and contacts?](https://docs.oracle.com/en/cloud/saas/sales/fasqa/how-do-i-enable-duplicate-checking-for-accounts-and-contacts.html) |
| Ba lúc phát hiện | Lúc nhập (real-time), chạy hàng loạt trên dữ liệu có sẵn, và lúc nhập tệp | NV | [CDM — How do I get started with duplicate identification and resolution?](https://docs.oracle.com/en/cloud/saas/customer-data-management/fadir/overview.html) |
| Xử lý trùng | "You can resolve duplicates in two ways, either by linking them or by merging them." Khi gộp có ba bộ luật: **Set Master Record Rules** (chọn hồ sơ giữ lại), **Set Attribute Value Rules** (lấy giá trị cột nào), **Agreement Rules** (điều kiện **cấm** gộp) | NV | như trên |
| Tên cấu hình "Real Time Person/Organization/Location Duplicate Prevention" (bản 11.1) | Chỉ có trong tóm tắt tìm kiếm | **CXM** | — |
| Ai duyệt gộp (data steward), gộp có ghi vết và hoàn tác được không | Không thấy | **CXM** | — |

### 2.6 Mẫu hình rút ra [SL]

1. **Có số do bên ngoài cấp** (số hoá đơn nhà cung cấp, số biên lai hoặc séc, số sao kê, số đơn của hệ nguồn): khoá duy nhất trong một phạm vi (theo nhà cung cấp / theo khách và nguồn thu / theo tài khoản ngân hàng và năm / theo hệ nguồn). Oracle **chặn cứng**. Người cấu hình có thể tắt, nhưng tự chịu trách nhiệm.
2. **Không có số ngoài, chỉ giống nội dung**: Oracle **cảnh báo** để người nhập tự chọn (CDM), hoặc **phát hiện sau** bằng báo cáo (Invoice Audit Report). Phải có công cụ **gộp / gỡ / đảo**.
3. **Tầng kỹ thuật** (số vé, ETag) đứng riêng. Nó **không thay** tầng nghiệp vụ, vì hai người hay hai máy luôn có hai số vé khác nhau.

---

## 3. Áp vào app (ĐỀ XUẤT, KHÔNG PHẢI SỰ THẬT ORACLE)

> Toàn bộ mục này chạm **tiền, dữ liệu (cột, chỉ mục, migration) và quyền**, nên là "việc lớn": cần ADR, chủ duyệt, và người kiểm độc lập sau khi thi công (CLAUDE.md §3).
> Mỗi lượt duyệt tối đa 3 quyết định có chạm quyền hoặc dữ liệu. Bảng `bil_*` nhận thêm một loại dữ liệu (mã giao dịch ngân hàng), nên lượt duyệt đó phải kèm **trang ghép** (CLAUDE.md §9).

### 3.1 Hiện trạng trong mã (đọc ngày 2026-10-02)

- **Góp ý**: cột `fbk_ticket.client_request_id NOT NULL`, chỉ mục duy nhất `UNIQUE(submitter_id, client_request_id)` (`migrations/0016_feedback.sql:30,42`). Câu `INSERT … WHERE NOT EXISTS`. Gửi lại cùng mã thì trả 200 kèm yêu cầu cũ và không gửi email lần nữa (`src/modules/feedback/index.ts:95-99`).
- **Thông báo**: `ntf_notice UNIQUE(created_by, client_request_id)` (`migrations/0025_thong_bao.sql:16`). Mã đã ghi rõ trường hợp hai yêu cầu đến đồng thời (`src/modules/thongbao/index.ts:185-188`).
- **Vận chuyển**:
  - Cột `vc_trip_event.request_id NOT NULL UNIQUE` (`migrations/0042_chuyen_xe.sql:161`) và `vc_leg_appt_ack.request_id UNIQUE` (`0043_nhac_goi_bao.sql:23`).
  - Thiếu `requestId` thì trả 400 (`dieu-phoi-than.ts:19-20`).
  - Hàm `chayLo` (`dieu-phoi-route.ts:90-103`): câu cổng không đổi dòng nào, hoặc đụng UNIQUE, mà `eventByRequest(requestId)` tìm thấy sự kiện, thì coi như đã làm.
  - Câu tra `EVENT_BY_REQUEST` chỉ lọc theo `request_id` (`chuyen-repo.ts:54`).
- **Sổ tiền**:
  - `bil_payment_receipt` và `bil_posting` (`migrations/0045_billing_so_cong_no.sql:66-113`) **không có** cột mã lần gửi, **không có** cột mã giao dịch ngân hàng.
  - Các route `POST /api/orders/:id/payments`, `/api/ledger/settlements`, `/api/ledger/refunds`, `/api/ledger/adjustments` (`src/modules/billing/index.ts`): mỗi lần gửi tạo một dòng mới.
  - Hoàn tiền có trần "Không hoàn quá số khách đã trả" (`service.ts:417`, trigger `refund_exceeds_paid` dòng 441). Trần này **không** chặn được hai lần hoàn từng phần trùng nhau.
- **"Công ty đã nhận"**: lần bấm thứ hai đụng `UNIQUE reverses_line_id` và trả **409 "Khoản này vừa được xác nhận."** (`service.ts:351`). Dữ liệu an toàn, nhưng người bấm thấy báo lỗi dù lần đầu đã thành công.
- **Đặt gấp**: câu ghi có điều kiện; thua thì `legRaced`, trả 409 (`src/modules/orders/index.ts` khoảng dòng 910-914).
- **Đã giao / Hoàn thành**: chỉ mục duy nhất một phiếu mỗi đơn (`0045` dòng 112-113). Phản hồi khi gửi lặp **chưa kiểm**.
- **Lập đơn**: chưa có gì. Đặc tả `2026-09-22-chong-gui-trung.md` chưa thi công.

### 3.2 Bảng ánh xạ từng lệnh ghi

Ghi chú cột "Bằng chứng":
- **Đã thử thật** = thử đêm 1→2/10 cho ra hai bản.
- **An toàn, báo sai** = dữ liệu không trùng, nhưng lần gửi lại nhận 409.
- **Suy từ mã** = chưa thử thật.

| Lệnh ghi (route) | Bằng chứng | Tầng kỹ thuật đề xuất (khoá lần gửi) | Tầng nghiệp vụ đề xuất | Tương tự Oracle |
|---|---|---|---|---|
| **Lập đơn** `POST /api/orders` | Đã thử thật: 2 đơn + 2 hồ sơ khách | Theo đặc tả 22/9: cột `orders.client_request_id`, `UNIQUE(staff_id, client_request_id)`. Ghi chung một `db.batch` với hồ sơ khách mới: lô thua thì huỷ cả hồ sơ. Gửi lặp: **200 + đơn cũ**. Tra mã **trước** khi so đơn trùng. Lúc đầu cho phép không gửi mã | Dùng đặc tả **"cảnh báo đơn trùng"** (đang chờ 3 câu của chủ), không thiết kế lại. Cùng khách (SĐT đã chuẩn hoá) + ngày dịch vụ gần nhau thì **cảnh báo**; người lập bấm "vẫn tạo", ghi nhật ký. KD10 thuộc nhóm này | Tầng kỹ thuật ≈ số vé OCI. Tầng nghiệp vụ ≈ cửa sổ "possible duplicates" của CDM. OM chỉ chặn trùng **số đơn nguồn**, không chặn trùng khách |
| **Sửa đơn nháp** `PUT /api/orders/:id` | Suy từ mã (đặc tả 22/9 §5.1): lần gửi lại sau khi đã lưu bị 409 nhầm, dữ liệu không hỏng | Giữ khoá phiên bản (giống ETag/If-Match). Thêm cột `orders.last_request_id`, ghi trong cùng lô. Khi 409 "đã có người sửa" mà `last_request_id` trùng mã gửi lên thì trả **200** | Không cần | OCI ETag/If-Match (§1.1 dòng 5) |
| **Tạo hồ sơ khách** (trong lập đơn và `POST /api/parties`) | Trong lập đơn: đã thử thật (2 hồ sơ). Ở màn Hồ sơ: chưa thử | Trong lập đơn: giải bằng lô nguyên tử ở dòng trên. Ở màn Hồ sơ: đặc tả 22/9 câu 2 khuyến nghị "chưa làm" | Kiểm ngay khi tạo: SĐT chuẩn hoá trùng thì hiện "có thể trùng: chọn hồ sơ có sẵn / vẫn tạo" (**cảnh báo**, người tạo tự bỏ qua, ghi nhật ký). Chạy hàng loạt định kỳ + **gộp** (đã có ADR-0068). **Cần chủ quyết**: Đối tác, Hướng dẫn viên được thấy gì về hồ sơ của người khác | CDM: real-time + batch, link/merge, luật cấm gộp |
| **Ghi lần thu** `POST /api/orders/:id/payments` | Đã thử thật: 2 dòng | Cột `bil_payment_receipt.client_request_id` **được để trống** (bảng đã có dòng thật từ bản 1.42; SQLite không thêm được cột `NOT NULL` mà không có giá trị mặc định, và một giá trị mặc định chung sẽ đụng chỉ mục duy nhất). Chỉ mục `UNIQUE(created_by, client_request_id) WHERE client_request_id IS NOT NULL`, giống đặc tả 22/9 cho `orders`. "Bắt buộc" do **route** giữ (thiếu mã thì **400** "Tải lại app") và do bài kiểm kiến trúc giữ. Gửi lặp: **200** + id lần thu cũ, không báo thay đổi lần hai | (a) Chuyển khoản có **mã giao dịch ngân hàng** (ô đã nêu ở ADR-0092): `UNIQUE(mã đã chuẩn hoá, order_id)` trên dòng chưa đảo, trùng thì **chặn**. Cùng mã nhưng **khác đơn** thì **cảnh báo** và hiện tổng, vì một lần chuyển có thể trả nhiều đơn. (b) Tiền mặt, không có mã: cùng đơn + số tiền + ngày + phương thức thì **cảnh báo**, người ghi bấm "vẫn ghi" (ghi nhật ký). KD10 (hai sale thu cọc hai đơn): cảnh báo theo SĐT khách, xem dòng "Lập đơn" | `AR_RCP_DUP_NUM`, lockbox (chặn theo số + ngày + tiền + khách); Cash Management one-to-many |
| **"Công ty đã nhận"** `POST /api/ledger/company-receipts/:id/confirm` | An toàn, báo sai (409) | Mã lần gửi nằm trên phiếu `COMPANY_RECEIVED` (`bil_posting.client_request_id`). Gửi lặp: **200** thay vì 409 | **KT02**: màn xác nhận của Kế toán hiện "mã giao dịch này đã dùng cho lần thu X (đơn Y)". Một khoản chuyển khoản: tổng các lần thu xác nhận ≤ số tiền chuyển. Vượt thì **chặn**; khác đơn thì **cảnh báo**, Kế toán bỏ qua được nhưng phải ghi lý do | Đối chiếu sao kê: một giao dịch đã khớp thì không khớp lại (SL, §2.4) |
| **Ghi hoàn** `POST /api/ledger/refunds` | Đã thử thật: 2 lần | Như ghi lần thu (cột trên `bil_posting`) | Trần "không hoàn quá số đã trả" đã có. Thêm **cảnh báo**: cùng đơn + số tiền + ngày | Payables kiểm thêm theo số tiền + ngày (chặn hay cảnh báo: CXM) |
| **Ghi nộp / trả** `POST /api/ledger/settlements` | Đã thử thật: 2 lần | Như trên | **Cảnh báo**: cùng người + số tiền + ngày. Có trần "không nộp quá số đang giữ" chưa: **chưa kiểm** | như trên |
| **Điều chỉnh sổ** `POST /api/ledger/adjustments` | Suy từ mã: mỗi lần gửi một phiếu | Như trên | Lý do bắt buộc (đã có). Đảo một dòng gốc tối đa một lần (`UNIQUE reverses_*` đã có), nên chặn được tự nhiên. Điều chỉnh tự do: **cảnh báo** cùng đơn + số tiền + ngày | — |
| **Thay lần thu** (lệnh mới, ADR-0088 chờ duyệt) | Chưa có mã | Bắt buộc có mã lần gửi **ngay từ đầu** | Một lần thu gốc chỉ thay được một lần (dựa `UNIQUE reverses_id` đã có), nên **chặn**. Gửi lặp cùng mã: 200 | — |
| **Đặt gấp / Ngoại lệ 6 giờ** `POST …/legs/:legId/short-notice` | An toàn, báo sai (409) | Thêm mã lần gửi để gửi lặp được 200. Ngoại lệ 6 giờ cho Bán hàng (ADR-0091 chờ) dùng cùng khuôn | Mỗi chặng một lần đặt gấp (tự nhiên) | ETag/If-Match |
| **Xếp xe, tiến độ tài xế** (`/api/van-chuyen/chuyen/…`, `/cuoc-cua-toi/…`) | Đã có `requestId` | **Khớp phần cốt lõi của Oracle**: một lần bấm một mã, bắt buộc có mã, không làm hai lần. **Bốn chỗ khác (là sự thật trong mã):** (1) mã duy nhất trên **toàn bảng**, không theo người; (2) khi gửi lặp chỉ kiểm "mã đã có", **không** kiểm sự kiện cũ có cùng chuyến, cùng loại lệnh, cùng người hay không; (3) phản hồi khi gửi lặp dựng từ **trạng thái hiện tại**: route tra `eventByRequest` trước, có rồi thì bỏ qua lệnh và đọc lại chuyến (`docNen`) để trả (`van-chuyen/index.ts:909-925`, `1102-1110`). Riêng "gọi báo" dựng từ dòng đã ghi (`goi-bao-lenh.ts:74`). Hệ quả của (2)+(3): gửi một `requestId` đã dùng ở chuyến **khác** sẽ nhận 200 kèm chi tiết chuyến hiện tại mà **không làm gì**; (4) giữ **vĩnh viễn**, OCI giữ 24 giờ. **Đề xuất:** khi gửi lặp thì so `trip_id` + `kind` (+ `created_by`), lệch thì **409**. Oracle có yêu cầu số vé theo từng người không: CXM | Luật lõi chuyến (trùng giờ xe, trùng giờ tài xế) đã chặn ở cả máy chủ lẫn trigger | Số vé OCI |
| **Đã giao** `POST /api/orders/:id/delivered` (`daGiao`, `service.ts:239`) | Phiếu Đã giao: chỉ mục duy nhất một phiếu mỗi đơn. **Nhưng** thân tuỳ chọn `{ lanThu }` còn tạo **một lần thu** (`receiptAtDeliveryStatement`). Lần thu đó đi chung lô với phiếu duy nhất, nên lần gửi lặp có lẽ bị chặn cả lô (**suy từ mã**, chưa thử) | Cũng là lệnh tạo dòng tiền, nên phải nằm trong luật "bắt buộc có mã". Mã đặt trên phiếu Đã giao; gửi lặp được 200 thay vì lỗi (phản hồi hiện tại khi lặp: **chưa kiểm**) | Tự nhiên (mỗi đơn một lần giao) | — |
| **Hoàn thành** `POST /api/orders/:id/completed` (`hoanThanh`, `service.ts:285`) | Chỉ mục duy nhất một phiếu mỗi đơn | Thêm mã để gửi lặp được 200 (phản hồi hiện tại: **chưa kiểm**) | Tự nhiên | — |
| **Nhập phần mềm kế toán** `POST /api/orders/:id/nhap-ke-toan` (`ghiNhapKeToan`, bảng `bil_accounting_entry`) | Theo chú thích trong mã: "trùng trạng thái → 200 không đổi (không thêm dòng)" (`nhap-ke-toan.ts:38`, `index.ts:120`) | Đã an toàn theo trạng thái; thêm mã là tuỳ chọn | Tự nhiên | — |

### 3.3 Khuôn chung đề xuất ("lệnh ghi một lần")

1. **Sinh mã ở máy khách**: `crypto.randomUUID()` khi mở form hoặc hộp thoại, gửi trong thân với tên `clientRequestId` (giống Góp ý; Vận chuyển đang dùng tên `requestId`).
2. **Phạm vi**: (người đăng nhập `staff_id`, mã). **Không** theo phiên đăng nhập.
3. **Nơi lưu**: cột trên **dòng chính mà lệnh tạo ra** (lần thu, phiếu sổ, sự kiện, đơn), ghi trong **cùng `db.batch`**. Lô thua vì UNIQUE thì đọc dòng thắng và trả 200.
   - Bảng đã có dòng thật (`orders`, `bil_payment_receipt`, `bil_posting`): cột **được để trống**, chỉ mục duy nhất **từng phần** `… WHERE client_request_id IS NOT NULL`. Lý do: SQLite không thêm được cột `NOT NULL` không có giá trị mặc định. Cột `request_hash` (mục 5) cũng vậy.
   - "Bắt buộc" do **route** giữ (thiếu mã thì 400) và do **bài kiểm kiến trúc** giữ (mục 7). Nhờ vậy làm được thứ tự phát hành (a) ở §3.4 mục 8.
   - Các hàm hiện đang tạo dòng tiền (`src/modules/billing/service.ts`): `ghiLanThu` (dòng 221), `daGiao` (239, kèm lần thu tuỳ chọn), `hoanThanh` (285), `xacNhanCongTyNhan` (331), `ghiQuyetToan` (361), `ghiHoanKhach` (400), `ghiDieuChinh` (453); thêm `ghiNhapKeToan` (`nhap-ke-toan.ts`). Mọi câu `INSERT INTO bil_*` nằm ở `src/modules/billing/repository.ts` (dòng 163–323). Luật "bắt buộc có mã" phải phủ đủ danh sách này, cộng "Thay lần thu" khi có.
   - **Không** dựng bảng nhật ký yêu cầu riêng có hạn xoá, vì luật "không xoá cứng" (CLAUDE.md §7) sẽ làm bảng đó phình mãi.
   - Vì vậy mã được giữ **vĩnh viễn**, chỉ 36 ký tự mỗi dòng. Oracle giữ 24 giờ.
4. **Gửi lặp cùng mã**: trả **200 + kết quả dựng từ dòng đã ghi** (trạng thái có thể đã đổi sau đó). Không ghi nhật ký lần hai, không gửi thông báo đẩy hay "báo thay đổi" lần hai.
5. **Cùng mã, khác nội dung**:
   - Đặc tả 22/9 §3.5 chọn "không so, trả kết quả cũ".
   - Đề xuất riêng cho **lệnh tiền**: lưu thêm `request_hash` (băm của thân yêu cầu đã chuẩn hoá). Khác thì **409** "Lần gửi trước đã được ghi với nội dung khác, tải lại để xem".
   - Đây là **lựa chọn của app**: Oracle không ghi cách xử lý này (CXM), và nó lệch đặc tả 22/9, nên **chủ quyết**.
6. **Thiếu mã**: lệnh tiền trả 400; lập đơn cho phép thiếu trong giai đoạn chuyển tiếp.
7. **Hàng rào máy**: `src/architecture.test.ts` báo đỏ nếu một bảng `bil_*` có dòng do người tạo mà thiếu cột hoặc thiếu chỉ mục duy nhất (đặc tả 22/9 §3). Hàng rào chỉ tính khi đã quan sát nó chặn thật một lần (P16).

### 3.4 Rủi ro (xếp theo mức nguy hiểm)

1. **Form vẫn mở sau khi lưu xong** (hộp thoại "Ghi lần thu" trên trang đơn, các màn sổ của Kế toán) — **nguy hiểm nhất**.
   - Phải **sinh mã mới ngay khi nhận phản hồi thành công**.
   - Nếu quên, lần ghi **thật** thứ hai (khách trả thêm một khoản) sẽ bị máy chủ coi là gửi lặp và **lặng lẽ bỏ qua**. Mất một lần thu còn tệ hơn trùng.
   - Bài kiểm bắt buộc: ghi hai lần thu hợp lệ liên tiếp trên cùng hộp thoại thì ra **2 dòng**.
2. **Mất phản hồi** (bến tàu sóng yếu): giữ mã cũ; nút "Gửi lại" dùng đúng mã đó; khoá nút trong lúc chờ. Khoá nút chỉ là lớp phụ, không thay máy chủ.
3. **Tải lại trang giữa chừng**: lưu mã vào `sessionStorage` theo khoá form (ví dụ `thu:<orderId>`) đến khi thành công. Bọc `try/catch`; không có kho này thì vẫn chạy được.
4. **bfcache / nút Back**: ở sự kiện `pageshow` với `persisted = true`, nếu mã **đã** dùng thành công thì sinh mã mới và làm trống form; nếu chưa nhận phản hồi thì giữ mã.
5. **Lỗi 4xx khi kiểm dữ liệu** (chưa ghi gì): giữ hay đổi mã đều an toàn. Nhưng nếu lần đầu thật ra đã ghi (mất phản hồi) mà người dùng sửa số rồi gửi lại, thì rơi vào trường hợp "cùng mã khác nội dung" (§3.3 mục 5).
6. **Bị đá khỏi phiên** (ADR-0074/0075, một máy): người đó đăng nhập lại rồi gửi lại thì mã vẫn khớp, vì phạm vi theo người. **Xoá mã đang lưu tạm khi đăng xuất**. Người khác đăng nhập trên cùng máy thì phạm vi khác, không bị nhận nhầm.
7. **Hai thiết bị, hai người**: mã khác nhau nên tầng kỹ thuật **không** bắt được. Việc này thuộc tầng nghiệp vụ (KD10, KT02).
8. **App cũ còn trong bộ nhớ đệm** khi lệnh tiền bắt buộc có mã: trả 400 kèm lời rõ ràng. Thứ tự phát hành, chủ chọn một trong hai:
   - (a) Giao diện gửi mã, máy chủ nhận tuỳ chọn. Khi cột "Đăng nhập gần nhất" cho thấy mọi người đã lên bản mới thì mới bắt buộc.
   - (b) Bắt buộc ngay, chấp nhận máy cũ nhận 400.
9. **Hai yêu cầu cùng mã đến đồng thời**: "tra trước rồi ghi" không đủ. Phải dựa vào UNIQUE + lô nguyên tử (khuôn Thông báo đã có).

### 3.5 Cần chủ quyết (gom một lần, chia ba lượt, mỗi lượt ≤ 3 quyết định)

- **Lượt A (tầng kỹ thuật)**:
  - A1. Mở rộng đặc tả 22/9 sang ghi lần thu, hoàn, nộp/trả, điều chỉnh và "Thay lần thu", với mã **bắt buộc**.
  - A2. Cùng mã khác nội dung ở lệnh tiền: **409** (khuyến nghị) hay trả kết quả cũ.
  - A3. Thứ tự phát hành: (a) tuỳ chọn trước rồi bắt buộc (khuyến nghị), hay (b) bắt buộc ngay.
- **Lượt B (tầng nghiệp vụ tiền, kèm trang ghép vì `bil_*` có thêm loại dữ liệu)**:
  - B1. Mã giao dịch ngân hàng: chặn theo (mã, đơn), cảnh báo khi khác đơn.
  - B2. Cảnh báo lần thu tiền mặt giống nhau (đơn + tiền + ngày).
  - B3. Ai được bỏ qua cảnh báo (người ghi / Kế toán), lý do bắt buộc, ghi nhật ký.
- **Lượt C (tầng nghiệp vụ người và hồ sơ)**:
  - C1. Trả lời 3 câu của đặc tả "cảnh báo đơn trùng".
  - C2. Đối tác, Hướng dẫn viên được thấy "SĐT này đã có đơn của người khác" tới mức nào (**quyền**).
  - C3. Cảnh báo trùng khi tạo hồ sơ khách ở màn Hồ sơ.

---

## 4. Điều chưa xác minh (CXM), gom lại

1. OCI: gửi lặp cùng số vé thì máy chủ trả gì; cùng số vé khác nội dung thì sao; SDK có tự gắn số vé và giữ nguyên qua các lần gửi lại không; độ dài 1–64; phạm vi số vé.
2. Fusion REST: `Upsert-Mode` trả 200/201; có header kiểu số vé hay không; "cùng khoá nguồn + số sửa đổi mới thì thành đơn sửa đổi" mới là suy luận.
3. EBS `ORIG_SYS_DOCUMENT_REF` + `ORDER_SOURCE_ID`: ràng buộc duy nhất (chưa mở được tài liệu PDF gốc).
4. Payables: kiểm thêm (`ADD_DUPLICATE_INV_CHECK`) là chặn hay cảnh báo; khoá chuẩn có gồm đơn vị kinh doanh và nơi nhận của nhà cung cấp không (chỉ có ở blog).
5. Receivables: "số biên lai không bắt buộc duy nhất" (blog); ai được bỏ qua.
6. Cash Management: "giao dịch đã đối chiếu không khớp lại được" là suy luận; ai được gỡ đối chiếu.
7. CDM: ai duyệt gộp; gộp có ghi vết, có hoàn tác được không; tên cấu hình "Real Time … Duplicate Prevention".
8. Oracle Integration, Payments, Commerce: cơ chế chống trùng.
9. Trong app: phản hồi của Đã giao / Hoàn thành khi gửi lặp; nộp/trả có trần hay không. Chưa chạy, vì đề bài chỉ cho đọc.

Các trang đã thử nhưng bị chuyển về trang "Get Started" (**không** dùng làm nguồn): Lockbox FAQ 24b, Reconciliation Matching Rules 24c/25b, Payables Standard Invoice Import 26c, Mass Reconciliation 25a, Upsert use-case SCM 24b.

## 5. Danh sách nguồn (tất cả đọc ngày 2026-10-02)

- OCI REST APIs (retry token, ETag): https://docs.oracle.com/en-us/iaas/Content/API/Concepts/usingapi.htm
- OCI API Errors (409 InvalidatedRetryToken…): https://docs.oracle.com/en-us/iaas/Content/API/References/apierrors.htm
- OCI Python SDK Retries (latest): https://docs.oracle.com/iaas/tools/python/latest/sdk_behaviors/retries.html
- OCI Ruby SDK OCI::Retry: https://docs.oracle.com/en-us/iaas/tools/ruby/latest/OCI/Retry.html
- Fusion Sales REST (Upsert-Mode): https://docs.oracle.com/en/cloud/saas/sales/faaps/op-opportunities-optynumber-child-opportunityresource-post.html
- Fusion SCM 26A Create sales orders: https://docs.oracle.com/en/cloud/saas/supply-chain-and-manufacturing/26a/fasrp/op-salesordersfororderhub-post.html
- Visual Builder Add-in 4.5 Upsert mode: https://docs.oracle.com/en/cloud/paas/visual-builder-addin/4.5/excel-developer/upload-changes-using-upsert-mode.html
- Oracle Integration, pitfalls: https://docs.oracle.com/en/cloud/paas/application-integration/integrations-user/avoid-common-integration-style-pitfalls.html
- Fusion SCM 26B Keep Your Order Number When You Import: https://docs.oracle.com/en/cloud/saas/supply-chain-and-manufacturing/26b/faiom/retain-sales-order-number-during-import.html
- Fusion Financials 26A AP_INVOICES_INTERFACE: https://docs.oracle.com/en/cloud/saas/financials/26a/fappp/invoice-open-interface-table-ap-invoices-interface.html
- Fusion Financials 26A duplicate invoices FAQ: https://docs.oracle.com/en/cloud/saas/financials/26a/fappp/how-can-i-find-duplicate-invoices-without-considering-the.html
- Oracle Applications 11i Identifying Duplicate Invoices: https://docs.oracle.com/cd/A60725_05/html/comnls/us/ap/duplinv.htm
- Fusion Financials 26C Error Messages for Standard Receipts: https://docs.oracle.com/en/cloud/saas/financials/26c/farfa/Error_Messages_for_Standard_Receipts.html
- Fusion Financials 26A Lockbox validation: https://docs.oracle.com/en/cloud/saas/financials/26a/fairp/how-lockbox-file-transmissions-are-validated.html
- Fusion Financials 25D Electronic Bank Statements: https://docs.oracle.com/en/cloud/saas/financials/25d/faofc/how-you-process-electronic-bank-statements.html
- Fusion Financials 26A Reconciliation Matching Rules: https://docs.oracle.com/en/cloud/saas/financials/26a/faipp/reconciliation-matching-rules.html
- EBS 12.2 Cash Management User Guide: https://docs.oracle.com/cd/E26401_01/doc.122/e48900/T359831T359834.htm
- 11i Cash Management, Changing the Reconciliation Status: https://docs.oracle.com/cd/A60725_05/html/comnls/us/ce/rmanua05.htm
- CDM EDQ Matching Configurations: https://docs.oracle.com/en/cloud/saas/customer-data-management/fadir/enterprise-data-quality-matching-configurations.html
- CDM duplicate identification overview: https://docs.oracle.com/en/cloud/saas/customer-data-management/fadir/overview.html
- Sales, enable duplicate checking: https://docs.oracle.com/en/cloud/saas/sales/fasqa/how-do-i-enable-duplicate-checking-for-accounts-and-contacts.html
