# Kiểm toán bổ sung — kịch bản ~30 nhân viên + ~1000 tài khoản đối tác ngoài (tourdao-sales, 2026-09-22)

> **Vai:** người kiểm, chỉ đọc mã + chạy thử trên SQLite tạm (`tests/audit/harness.mjs`). Không sửa mã ứng dụng, không đụng D1 local/remote, không lệnh `--remote`.
> **Nhánh:** `kiem-toan-doi-tac`, tách từ `kiem-toan-kien-truc` @ `22e77d4` (mã ứng dụng giống `origin/main` @ `f8d18a3`).
> **Vì sao có tài liệu này:** chủ dự án cho biết (2026-09-22) quy mô thật là **~30 nhân viên** và hệ thống sẽ dùng cho **đối tác ngoài — cộng tác viên (CTV), hướng dẫn viên (HDV), công ty du lịch — tới ~1000 tài khoản**. Hai báo cáo trước (`docs/AUDIT-2026-09-22-KIEN-TRUC.md`; `docs/AUDIT-2026-09-22-ONTOLOGY.md` trên nhánh `kiem-toan-ontology`) đều giả định ~10 người dùng nội bộ. Tài liệu này chỉ xét lại những gì đổi khi giả định đổi; không lặp lại hai báo cáo kia.
> **Không làm ở đây:** soạn ADR hay đặc tả sửa (vai khác, phiên khác — P15, N8); kiểm lại 4 đặc tả theo `docs/HANDOFF-KIEM-TOAN-2026-09-22.md` §3 (vẫn chưa ai làm).

Nhãn: **FACT** = đã chạy thử hoặc đọc mã trực tiếp; **INFERENCE** = suy luận từ mã, chưa chạy; **RISK** = rủi ro chưa xảy ra; **NOT VERIFIED** = chưa kiểm.

## 0. Bằng chứng đã chạy

- `node --test "tests/audit/*.test.mjs"` (gốc worktree): **24/24 xanh** = 18 ca cũ của vòng 1 + 6 ca mới `tests/audit/doi-tac.test.mjs` (P1–P6). Các ca mới đều mang nhãn FINDING: test khẳng định hành vi yếu hiện tại, sẽ đỏ khi sửa.
- Chưa chạy `npm test`/`npm run typecheck` ở phiên này vì không có thay đổi mã ứng dụng (vòng 2 đã ghi 443/443 và tsc 0 trên cùng mã).

## 1. Kết luận

**Ở quy mô ~10 người nội bộ, nền tảng đủ (hai báo cáo trước). Ở quy mô có đối tác ngoài đăng nhập, nền tảng CHƯA đủ, và lỗ nằm ở tầng cấu trúc (mô hình quyền, mô hình tài khoản) chứ không phải thiếu module.**

Lý do gốc: toàn bộ thiết kế quyền dựa trên giả định **"mọi người đăng nhập đều là nhân viên của cùng một công ty, tin nhau về dữ liệu"**. Điều này được ghi rõ ở đầu `src/modules/orders/index.ts:2` ("Mọi nhân viên đang hoạt động xem được mọi đơn (§2.4-4)") và là quyết định đã duyệt, đúng với tiền đề cũ. Chính `ADR-0010` điều 1 (accepted) đã đặt ngưỡng: khi **"(ii) đại lý được đăng nhập để xem đơn của chính họ"** thì phải viết ADR mới. **Kịch bản chủ vừa nêu chạm đúng ngưỡng đó.**

Không có gì trong phát hiện dưới đây là lỗi *đang xảy ra* trên production, vì hiện chưa có đối tác nào được cấp tài khoản (NOT VERIFIED trên production: chưa đếm tài khoản thật). Nhưng **cấp tài khoản cho đối tác ngoài bằng hệ thống hiện tại = lộ toàn bộ sổ khách và sổ đơn cho họ ngay ngày đầu.**

## 2. Phát hiện

### D-01 — P0 (khi mở cho đối tác) · Không có cách tách dữ liệu giữa các bên
- **FACT (P2, P3):** tài khoản có quyền Bán hàng liệt kê được **mọi đơn** của mọi người, mỗi lần 100 đơn, lật trang tới offset 100.000 (`GET /api/orders`, `src/modules/orders/index.ts:44`; `listOrders` không có điều kiện theo người xem, `src/modules/orders/repository.ts:197-232`). Mỗi dòng có **tên + SĐT khách** và số tiền. Tìm được đơn theo SĐT bất kỳ. Xem được chi tiết mọi đơn.
- **FACT (P3):** cùng tài khoản đó liệt kê và tra theo SĐT **toàn bộ danh bạ hồ sơ**: khách, đại lý, cả nhân viên (`GET /api/parties`, `/api/parties/lookup`, `src/modules/parties/index.ts:120-148`), và **sửa được hồ sơ khách do người khác tạo** (PUT → 200).
- **FACT:** `Scope` chỉ có `none/own/assigned/ownOrAssigned/any` (`src/shared/permissions.ts:21`); `order.view`, `contact.view`, `party.view`, `party.write` đều là `any` cho Bán hàng (`permissions.ts:36,39,51,52`). Không có phạm vi "của tổ chức mình".
- **Hệ quả:** CTV hay công ty du lịch A thấy khách, giá bán và doanh số của công ty và của đối tác B; tải về được cả sổ khách. Với ~1000 tài khoản ngoài, việc này tương đương công bố sổ khách hàng. Đây còn là **rủi ro pháp lý** về dữ liệu cá nhân (Nghị định 13/2023/NĐ-CP): NOT VERIFIED, cần người có chuyên môn pháp lý xem.
- **Vì sao là P0 (có điều kiện):** vòng 1 xếp "không P0" là đúng với tiền đề nội bộ. Với tiền đề mới, đây là "rò dữ liệu chéo" đúng định nghĩa P0 của vòng 1 §1. Chỉ thành P0 **khi** cấp tài khoản cho người ngoài; trước đó không có hại.
- **Hướng (cần ADR mới thay ADR-0010 điều 1, và xét lại ADR-0007):** thêm phạm vi theo tổ chức/nguồn đơn; mọi truy vấn liệt kê (đơn, hồ sơ, tìm theo SĐT) phải lọc ở **máy chủ** theo phạm vi đó; tách "nhân viên công ty" khỏi "người dùng đối tác" ở tầng quyền, không chỉ ở tầng giao diện.

### D-02 — P1 · Không có mô hình "tài khoản đối tác"
- **FACT:** mọi tài khoản là một dòng `staff` với 4 quyền nội bộ (`SALES/ACCOUNTING/ADMIN/FIELD`, `permissions.ts:5`). Không có khái niệm tài khoản thuộc tổ chức nào; hồ sơ chỉ có đúng một loại quan hệ `CONTACT_OF` (`migrations/0011_parties.sql:112`), và chỉ ADMIN tạo được quan hệ.
- **FACT (P1):** `POST /api/staff` không ghi quyền thì **mặc định Bán hàng** (`src/modules/accounts/index.ts:131`), tức quyền rộng nhất sau Quản trị. Quản trị quên chọn quyền là cấp luôn quyền xem hết.
- **FACT:** đơn do một **tổ chức** (đại lý, công ty du lịch) đứng tên bị máy chủ từ chối: "Chưa gắn được đại lý vào đơn ở bản này." (`src/modules/orders/service.ts:51`). Đã có từ N2 lát 1, cố ý hoãn.
- **INFERENCE:** muốn "công ty du lịch X có 5 nhân viên đăng nhập, cùng thấy đơn của X" thì phải có: tài khoản ↔ tổ chức, đơn ↔ tổ chức nguồn, và phạm vi quyền dựa trên hai liên kết đó. Hiện chưa có cái nào. Dữ liệu nền có một phần (`pty_party_role.location_id`, `pty_party_relationship`), nên không phải dựng lại mô hình Party, nhưng là việc cấu trúc cần ADR.

### D-03 — P1 · Hướng dẫn viên chưa có chức năng nào dùng được
- **FACT (P4):** mọi route đơn là `office` (`src/shared/router.ts:139`; `isOffice` = có `order.view`, `permissions.ts:98`), mà quyền Thực hiện có `order.view = none`, nên tài khoản chỉ quyền Thực hiện nhận **403** ở cả danh sách lẫn chi tiết đơn. Giao diện chỉ cho tab "Tôi" (`web/shell.ts:15`).
- **FACT (P4):** HDV không được đặt làm người phụ trách đơn: "Chỉ giao phụ trách cho người có quyền Bán hàng hoặc Quản trị." (`src/modules/dispatch/rules.ts:48`).
- **FACT:** các ô dành cho HDV (`contact.view: assigned`, `task.progress: assigned`, `permissions.ts:39,43`) **chưa có route nào dùng**. Việc được giao thuộc N2 các lát sau.
- **Hệ quả:** cấp tài khoản cho HDV hôm nay thì họ chỉ gửi được góp ý. Nếu để HDV làm việc được mà cấp tạm quyền Bán hàng thì rơi vào D-01.

### D-04 — P1 · Đăng nhập và phiên chưa hợp với người dùng ngoài
- **FACT (P5):** ai biết SĐT của một đối tác, sai PIN 5 lần là **khoá người đó 15 phút**; PIN đúng cũng nhận 429 (`src/modules/auth/throttle.ts:4-6`, `PHONE_LIMIT = 5`). Với nội bộ 10 người, việc này hiếm; với 1000 đối tác mà SĐT là thông tin công khai trong ngành, đây là cách phá rẻ. Turnstile đang BẬT trên production (theo bộ nhớ dự án, NOT VERIFIED ở phiên này) làm mỗi lần thử tốn công hơn nhưng không chặn việc khoá có chủ đích.
- **FACT (P6):** 30 lần sai trong 15 phút từ **một IP** chặn **mọi** tài khoản sau IP đó (`IP_LIMIT = 30`). Nhiều người dùng chung một IP (wifi văn phòng công ty du lịch, NAT nhà mạng di động) thì vài người gõ nhầm có thể khoá cả nhóm. INFERENCE: mức ảnh hưởng thật phụ thuộc cách nhà mạng Việt Nam chia IP. NOT MEASURED.
- **FACT (vòng 1 F-06, nặng thêm):** phiên sống 7 ngày (`session.ts:4`), đăng xuất không huỷ phiên; muốn cắt ngay một đối tác thì phải ngưng tài khoản hoặc đặt lại PIN. Với người ngoài, **"hết hợp tác → cắt quyền ngay"** là yêu cầu bắt buộc.
- **FACT:** tạo tài khoản trả PIN cho Quản trị (`accounts/index.ts`, `POST /api/staff`), Quản trị tự chuyển PIN cho từng người. Với ~1000 tài khoản: một người làm tay, PIN đi qua kênh chat. INFERENCE: đây vừa là nút thắt vận hành, vừa là chỗ lộ PIN.

### D-05 — P1 · Lỗ hồ sơ nhân viên (vòng 1 F-01) nặng lên
- **FACT (vòng 1 R3, và P3 ở đây):** mọi tài khoản văn phòng sửa được hồ sơ bất kỳ. Với đối tác ngoài có quyền Bán hàng, họ sửa được cả tên nhân viên công ty (tên này in lên ảnh xác nhận gửi khách) lẫn hồ sơ khách của người khác. ADR-0013 (proposed) chỉ vá phần hồ sơ có tài khoản; **phần hồ sơ khách của người khác chưa được xét**. Cần gộp vào phạm vi của D-01.

### D-06 — P2 · Thiếu tiền của đối tác: hoa hồng / giá net / đối soát
- **FACT:** không có cột, bảng hay quyền nào cho hoa hồng hay giá riêng theo đối tác (`grep -riE 'commission|hoa hồng|net_price' src migrations` = 0 kết quả). Danh mục chỉ có giá bán lẻ theo hạng khách. `ADR-0001` điều 4 mới nhắc "giá theo vai trò" cho N4.
- **FACT:** `money.view = any` cho Bán hàng (`permissions.ts:37`): đối tác thấy giá bán và tiền của mọi đơn.
- **INFERENCE:** CTV và công ty du lịch thường cần giá net, hoa hồng và bảng đối soát công nợ theo kỳ. Đây là module mới, cần thiết kế cùng N3 (thu tiền) vì dùng chung sổ tiền.

### D-07 — P2 · Các danh sách nạp hết một lần, và lộ danh sách người dùng
- **FACT:** `listStaffAccounts` không chia trang (`src/modules/staff/index.ts:78`), dùng cho `GET /api/staff` (admin) và `GET /api/dispatch/assignees` (mọi tài khoản văn phòng, `dispatch/index.ts:53`). Danh sách người-được-giao gồm mọi tài khoản có quyền Bán hàng/Quản trị.
- **INFERENCE:** nếu đối tác mang quyền Bán hàng thì (i) mỗi người mở màn đơn đều tải tên của cả ~1000 tài khoản, (ii) đối tác thấy danh sách đối tác khác (lộ quan hệ kinh doanh), (iii) ô chọn người phụ trách thành danh sách 1000 dòng. Về tải máy chủ, 1000 dòng không đáng kể (NOT MEASURED trên D1 thật).

### D-08 — P2 · Quy trình và băng thông duyệt (vòng 1 F-10, nặng lên)
- **INFERENCE:** 1000 tài khoản ngoài kéo theo cấp, khoá, mở khoá, đặt lại PIN, góp ý/báo lỗi (`feedback.submit = any`, mỗi yêu cầu gửi email cho quản trị), đều dồn về một hay hai Quản trị. Chưa có tự phục vụ (quên PIN), chưa có phân cấp quản trị (ví dụ quản trị của công ty đối tác tự quản người của họ).

## 3. Những kết luận của hai báo cáo trước phải xét lại

| Kết luận cũ | Tiền đề cũ | Với tiền đề mới |
|---|---|---|
| "Không P0" (vòng 1 §1, vòng 2 §19) | ~10 nhân viên nội bộ | **Sai khi mở cho đối tác**: D-01 là P0 có điều kiện |
| "Multi-tenant / multi-organization: NEVER" (vòng 1 §21, vòng 2 §25) | 1 công ty, 1 điểm bán, không đại lý đăng nhập | Phải làm **dạng tối thiểu**: phạm vi theo tổ chức (không phải multi-tenant SaaS đầy đủ, vẫn một công ty chủ quản) |
| "Security: READY (có điều kiện)" (vòng 2 §13) | người dùng tin nhau | **PARTIAL**: IDOR "đúng thiết kế" của vòng 1 R4 (xem đơn người khác = 200) nay là lỗ |
| "Identity: PARTIAL" | chỉ nhân viên | Thiếu hẳn "tài khoản thuộc tổ chức" (D-02) |
| F-06 phiên, F-10 nút thắt người: P2 | 10 người | Nên lên **P1** trước khi mở cho đối tác |
| "Hiệu năng: dư > 50 năm" (vòng 1 F-11) | vài nghìn đơn/năm | NOT RE-MEASURED: 1000 người lập đơn làm số đơn tăng theo; vẫn có thể đủ, cần ước lượng lại theo khối lượng đơn dự kiến của đối tác |
| Các phần giữ nguyên: toàn vẹn tiền ở CSDL, trạng thái chỉ tiến, nhật ký chỉ-thêm, router mặc định từ chối, mô hình Party–Role | — | **Vẫn đúng**, và là nền để xây phạm vi theo tổ chức lên trên |

## 4. Việc cần quyết (của chủ dự án), trước khi soạn ADR

1. Mỗi loại đối tác được **thấy gì, làm gì**? Gợi ý để trả lời: CTV chỉ thấy đơn mình lập? Công ty du lịch thấy mọi đơn của công ty mình? HDV chỉ thấy chuyến được giao, có thấy SĐT khách không?
2. Đối tác có được **lập đơn** trực tiếp không, hay chỉ xem và nhận việc?
3. Đối tác có được thấy **giá bán lẻ** và **tiền của đơn** không, hay chỉ giá net/hoa hồng của mình?
4. Ai quản lý tài khoản của một công ty đối tác: Quản trị Tour Đảo, hay một người của chính đối tác đó?
5. Thứ tự mở: HDV trước (việc được giao, phạm vi hẹp nhất), hay công ty du lịch trước?
6. Có cần tư vấn pháp lý về chia sẻ dữ liệu khách với đối tác (NĐ 13/2023) không?

## 5. Thứ tự đề xuất

1. **Không cấp tài khoản cho bất kỳ người ngoài nào** trên hệ thống hiện tại cho tới khi D-01 được sửa (nói với chủ một lần — P18).
2. Chủ trả lời §4 → phiên soạn (vai khác) viết **ADR mới** thay `ADR-0010` điều 1 và xét lại `ADR-0007` (ma trận quyền), kèm đặc tả.
3. Nối vào đặc tả ADR-0013 đang chờ: ranh giới sửa hồ sơ phải tính cả hồ sơ khách theo phạm vi tổ chức (D-05), không chỉ hồ sơ có tài khoản.
4. Các việc NOW/NEXT của vòng 1 (chống gửi trùng, lưới tiền, khôi phục) giữ nguyên thứ tự; D-04 (khoá theo SĐT/IP, huỷ phiên) chuyển lên trước khi mở cho đối tác.
5. Hoa hồng / giá net (D-06) thiết kế cùng N3.

---
*Bằng chứng tái chạy: `node --test "tests/audit/*.test.mjs"` (24/24). Tài liệu không sửa mã, không đổi quyết định đã duyệt; mọi hướng sửa ở trên là đề xuất, cần ADR/chủ duyệt theo CLAUDE.md §3.*
