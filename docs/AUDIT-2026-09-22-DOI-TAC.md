# Kiểm toán bổ sung — kịch bản ~30 nhân viên + ~1000 tài khoản đối tác ngoài (tourdao-sales, 2026-09-22)

> **Vai:** người kiểm, chỉ đọc mã + chạy thử trên SQLite tạm (`tests/audit/harness.mjs`). Không sửa mã ứng dụng, không đụng D1 local/remote, không lệnh `--remote`.
> **Nhánh:** `kiem-toan-doi-tac`, tách từ `kiem-toan-kien-truc` @ `22e77d4` (mã ứng dụng giống `origin/main` @ `f8d18a3`).
> **Vì sao có tài liệu này:** chủ dự án cho biết (2026-09-22) quy mô thật là **~30 nhân viên** và hệ thống sẽ dùng cho **đối tác ngoài — cộng tác viên (CTV), hướng dẫn viên (HDV), công ty du lịch — tới ~1000 tài khoản**. Hai báo cáo trước (`docs/AUDIT-2026-09-22-KIEN-TRUC.md`; `docs/AUDIT-2026-09-22-ONTOLOGY.md` trên nhánh `kiem-toan-ontology`) đều giả định ~10 người dùng nội bộ. Tài liệu này chỉ xét lại những gì đổi khi giả định đổi; không lặp lại hai báo cáo kia.
> **Không làm ở đây:** soạn ADR hay đặc tả sửa (vai khác, phiên khác — P15, N8); kiểm lại 4 đặc tả theo `docs/HANDOFF-KIEM-TOAN-2026-09-22.md` §3 (vẫn chưa ai làm).

Nhãn: **FACT** = đã chạy thử hoặc đọc mã trực tiếp; **INFERENCE** = suy luận từ mã, chưa chạy; **RISK** = rủi ro chưa xảy ra; **NOT VERIFIED** = chưa kiểm.

## 0. Bằng chứng đã chạy

- `node --test "tests/audit/*.test.mjs"` (gốc worktree): **25/25 xanh** = 18 ca cũ của vòng 1 + 7 ca mới `tests/audit/doi-tac.test.mjs` (P1–P6 là FINDING: khẳng định hành vi yếu hiện tại, sẽ đỏ khi sửa; P7 là ĐO quy mô với 1000 tài khoản).
- **GET công khai trên production** (`curl https://booking.tourdao.vn/api/auth/config`, 2026-09-22), kết quả là FACT tại thời điểm đó: `turnstileSiteKey` có giá trị. Máy chủ chỉ trả khoá này khi khoá bí mật đã đặt (`src/modules/auth/turnstile.ts:39`), nên **Turnstile đang bật**. Cùng phản hồi: `maintenance.on = true`, `endsAt = 2026-09-24T06:59:00Z`, tức **production đang ở chế độ bảo trì**.
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
- **FACT (P1), mức thấp:** `POST /api/staff` không ghi quyền thì **mặc định Bán hàng** (`src/modules/accounts/index.ts:131`). Chỉ xảy ra khi gọi thẳng API: màn quản trị luôn gửi danh sách quyền và bắt chọn ít nhất một (`web/staff.ts:151-153`). Nên đổi mặc định sang "không quyền" khi làm D-01, nhưng tự nó không phải đường rò.
- **FACT:** đơn do một **tổ chức** (đại lý, công ty du lịch) đứng tên bị máy chủ từ chối: "Chưa gắn được đại lý vào đơn ở bản này." (`src/modules/orders/service.ts:51`). Đã có từ N2 lát 1, cố ý hoãn.
- **INFERENCE:** muốn "công ty du lịch X có 5 nhân viên đăng nhập, cùng thấy đơn của X" thì phải có: tài khoản ↔ tổ chức, đơn ↔ tổ chức nguồn, và phạm vi quyền dựa trên hai liên kết đó. Hiện chưa có cái nào. Dữ liệu nền có một phần (`pty_party_role.location_id`, `pty_party_relationship`), nên không phải dựng lại mô hình Party, nhưng là việc cấu trúc cần ADR.

### D-03 — P1 · Hướng dẫn viên chưa có chức năng nào dùng được
- **FACT (P4):** mọi route đơn là `office` (`src/shared/router.ts:139`; `isOffice` = có `order.view`, `permissions.ts:98`), mà quyền Thực hiện có `order.view = none`, nên tài khoản chỉ quyền Thực hiện nhận **403** ở cả danh sách lẫn chi tiết đơn. Giao diện chỉ cho tab "Tôi" (`web/shell.ts:15`).
- **FACT (P4):** HDV không được đặt làm người phụ trách đơn: "Chỉ giao phụ trách cho người có quyền Bán hàng hoặc Quản trị." (`src/modules/dispatch/rules.ts:48`).
- **FACT:** các ô dành cho HDV (`contact.view: assigned`, `task.progress: assigned`, `permissions.ts:39,43`) **chưa có route nào dùng**. Việc được giao thuộc N2 các lát sau.
- **Hệ quả:** cấp tài khoản cho HDV hôm nay thì họ chỉ gửi được góp ý. Nếu để HDV làm việc được mà cấp tạm quyền Bán hàng thì rơi vào D-01.

### D-04 — P1 · Đăng nhập và phiên chưa hợp với người dùng ngoài
- **FACT (P6), mới và nặng hơn:** 30 lần sai trong 15 phút từ **một IP** chặn **mọi** tài khoản sau IP đó, kể cả người gõ đúng PIN (`src/modules/auth/throttle.ts:6`, `IP_LIMIT = 30`). Nhiều người dùng chung một IP (wifi văn phòng công ty du lịch, NAT nhà mạng di động) thì vài chục lần gõ nhầm cộng dồn là khoá cả nhóm; Turnstile không giúp gì vì đây là người thật gõ nhầm. INFERENCE: mức ảnh hưởng thật phụ thuộc cách nhà mạng Việt Nam chia IP. NOT MEASURED.
- **FACT (P5), đánh đổi đã ghi:** ai biết SĐT của một người, sai PIN 5 lần là khoá người đó 15 phút (`PHONE_LIMIT = 5`). Rủi ro này **đã được ghi** trong mô hình mối đe doạ (`docs/SYSTEM-DESIGN.md:548`, "khoá SĐT của người khác") và được giảm bằng Turnstile, đang bật (§0). Không phải phát hiện mới; chỉ lưu ý rằng với ~1000 đối tác, SĐT dễ biết hơn và số người có thể bị phá nhiều hơn. Quản trị mở khoá tay (`POST /api/staff/:id/unlock`).
- **FACT (vòng 1 F-06, nặng thêm):** phiên sống 7 ngày (`session.ts:4`), đăng xuất không huỷ phiên; muốn cắt ngay một đối tác thì phải ngưng tài khoản hoặc đặt lại PIN. Với người ngoài, **"hết hợp tác → cắt quyền ngay"** là yêu cầu bắt buộc.
- **FACT:** tạo tài khoản trả PIN cho Quản trị (`accounts/index.ts`, `POST /api/staff`), Quản trị tự chuyển PIN cho từng người. Với ~1000 tài khoản: một người làm tay, PIN đi qua kênh chat. INFERENCE: đây vừa là nút thắt vận hành, vừa là chỗ lộ PIN.

### D-05 — P1 · Lỗ hồ sơ nhân viên (vòng 1 F-01) nặng lên
- **FACT (vòng 1 R3, và P3 ở đây):** mọi tài khoản văn phòng sửa được hồ sơ bất kỳ. Với đối tác ngoài có quyền Bán hàng, họ sửa được cả tên nhân viên công ty (tên này in lên ảnh xác nhận gửi khách) lẫn hồ sơ khách của người khác. ADR-0013 (proposed) chỉ vá phần hồ sơ có tài khoản; **phần hồ sơ khách của người khác chưa được xét**. Cần gộp vào phạm vi của D-01.

### D-06 — P2 · Thiếu tiền của đối tác: hoa hồng / giá net / đối soát
- **FACT:** không có cột, bảng hay quyền nào cho hoa hồng hay giá riêng theo đối tác (`grep -riE 'commission|hoa hồng|net_price' src migrations` = 0 kết quả). Danh mục chỉ có giá bán lẻ theo hạng khách. `ADR-0001` điều 4 mới nhắc "giá theo vai trò" cho N4.
- **FACT:** `money.view = any` cho Bán hàng (`permissions.ts:37`): đối tác thấy giá bán và tiền của mọi đơn.
- **INFERENCE:** CTV và công ty du lịch thường cần giá net, hoa hồng và bảng đối soát công nợ theo kỳ. Đây là module mới, cần thiết kế cùng N3 (thu tiền) vì dùng chung sổ tiền.

### D-07 — P2 · Các danh sách nạp hết một lần, và lộ danh sách người dùng
- **FACT:** câu liệt kê tài khoản không có `LIMIT` (`listAll`, `src/modules/staff/repository.ts:83`, qua `listStaffAccounts`, `src/modules/staff/index.ts:78`), dùng cho `GET /api/staff` (admin) và `GET /api/dispatch/assignees` (mọi tài khoản văn phòng, `dispatch/index.ts:53`). Danh sách người-được-giao gồm mọi tài khoản có quyền Bán hàng/Quản trị.
- **FACT (P7, đo trên SQLite trong bộ nhớ, không phải D1 thật):** với 1000 tài khoản Bán hàng, `GET /api/dispatch/assignees` trả **1002 tên, ~125 KB mỗi lần**, 4 ms phía máy chủ; `GET /api/auth/me` (chạy `getActiveStaff` ở mọi request, tra theo khoá chính) 1 ms.
- **Kết luận:** 1000 tài khoản **không** làm máy chủ quá tải (INFERENCE cho D1 thật: chênh vài chục ms mạng, NOT MEASURED). Vấn đề là (i) **lộ danh sách**: một đối tác thấy tên mọi đối tác khác (quan hệ kinh doanh), (ii) **khó dùng**: bảng chọn người phụ trách (`web/handler-sheet.ts`) thành 1000 ô radio, tải lại ~125 KB mỗi lần mở trên 4G.

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

### 4.1. Trả lời của chủ dự án (2026-09-22, ghi gần nguyên văn)

1. **Phạm vi thấy đơn:** các lựa chọn kiểu này phải thành **nút bấm tuỳ chọn trong bảng điều khiển của Super Admin**. Super Admin là vai **cao nhất, trên Admin**, hiện **chưa tồn tại**: cần mở thêm và gắn cho SĐT của chủ dự án (0989929373). Trước mắt: **Cộng tác viên (nói chung) chỉ thấy đơn của họ**; **nhân viên công ty thấy hết đơn** của hệ thống, kể cả SĐT khách.
2. **Đối tác được tự lập đơn.**
3. **Đối tác thấy giá bán lẻ.** Hoá đơn/ảnh xác nhận dịch vụ **luôn luôn là giá bán lẻ**.
4. **Mỗi đối tác (CTV, HDV bên ngoài, lễ tân khách sạn, lái cano…) có đúng 1 tài khoản.** Admin và Super Admin có quyền với tài khoản đó (ngưng, đặt lại mã…).
5. Chủ chưa hiểu câu hỏi. Diễn đạt lại: *mở cho mọi loại đối tác cùng lúc, hay thử trước với một nhóm nhỏ (ví dụ 5–10 CTV), chạy ổn rồi mới mở rộng?* Chưa có câu trả lời.
6. **Không cần hỏi luật sư.**

**Ghi chú của người kiểm cho phiên soạn ADR/đặc tả (không phải quyết định):**
- "Nút bấm tuỳ chọn" nghĩa là quyền **đổi được lúc chạy**, lưu trong CSDL. Hiện ma trận quyền là hằng số trong mã, "một nơi duy nhất" (`src/shared/permissions.ts`, ADR-0007), đổi quyền = sửa mã + deploy. Chuyển sang quyền đổi được lúc chạy là quyết định kiến trúc, cần ADR. Phương án nhẹ hơn nên cân nhắc: vài **công tắc định sẵn** (ví dụ "CTV thấy: chỉ đơn của mình / …") thay vì một bảng quyền sửa tự do.
- Super Admin: hiện đã có quyền riêng của chủ, gắn theo SĐT trong `mnt_setting.allowed_phones` (bật/tắt bảo trì). Nên gộp về một khái niệm. Không nên gieo SĐT vào migration mới (vòng 1 F-12); dùng SQL theo runbook.
- Câu 1 khớp phạm vi `own` đã có trong `Scope`. Nhưng danh sách đơn, tìm theo SĐT và danh bạ hồ sơ hiện **không lọc theo người xem ở máy chủ** (D-01), nên phải thêm lọc ở cả ba nơi đó.
- Còn phải chốt trong đặc tả: CTV có tra được hồ sơ khách theo SĐT không (tra được = dò được khách của người khác)? CTV có tự sửa, xác nhận, huỷ đơn của mình không? Ai là người phụ trách đơn do CTV lập? HDV/lái cano bên ngoài vừa lập đơn (như CTV) vừa nhận việc được giao (D-03)? Hai vai này có tách nhau không?

### 4.2. Trả lời bổ sung của chủ dự án (2026-09-22, cho 4 câu mở ở cuối §4.1)

1. **CTV KHÔNG được tra hồ sơ khách theo SĐT.**
2. **CTV được sửa, xác nhận, huỷ đơn của chính mình.**
3. **Đơn do CTV lập: bất kỳ nhân viên hoặc HDV nội bộ nào cũng nhận phụ trách được.**
4. **HDV, lái cano… bên ngoài: được lập đơn (như CTV), KHÔNG được tự nhận việc.** Việc phải do nhân viên công ty gán hoặc xác nhận thủ công.

**Ghi chú của người kiểm cho phiên soạn (không phải quyết định):**
- Câu 3 đổi luật hiện hành: hiện chỉ người có quyền Bán hàng/Quản trị được làm người phụ trách (`src/modules/dispatch/rules.ts:48`), và `dispatch.claim` (tự nhận đơn chưa có người) chỉ mở cho Bán hàng/Quản trị (`permissions.ts:46`). "HDV nội bộ nhận được" chạm ADR-0009 (người phụ trách được sửa đơn), vì người phụ trách hiện được **sửa/xác nhận/huỷ** đơn. Cần chốt: HDV nội bộ nhận phụ trách thì có được sửa đơn như Bán hàng không? Và nó dính D-03: HDV nội bộ hiện không mở được màn đơn nào.
- Câu 4 "gán hoặc xác nhận thủ công": cần chốt nghĩa trong đặc tả. Có thể là (a) nhân viên gán thẳng việc cho đối tác bên ngoài, hoặc (b) đối tác bấm "xin nhận", rồi nhân viên xác nhận. Phương án (b) là quy trình mới hai bước.
- Đơn do CTV lập mà chưa ai nhận thì vẫn cần một người phụ trách mặc định. Hiện người lập đơn là người phụ trách mặc định (ADR-0009 điều 4); với CTV có giữ luật đó không?
- Câu hỏi "mở thí điểm cho 5–10 CTV hay mở hết" (§4.1 câu 5) **vẫn chưa được trả lời**.

### 4.3. Chủ dự án làm rõ câu 3 (2026-09-22)

> CTV lên đơn và được xác nhận, nhưng **sau khi tiếp nhận thì HDV có thể phải sửa**, vì khách có thể **đổi số lượng**, hoặc **phát sinh thực tế**, **đổi gói dịch vụ**… Và audit trail nên để **cả CTV hoặc admin đều thấy sự thay đổi** (ví dụ: "Được sửa").

**Ghi chú của người kiểm cho phiên soạn (không phải quyết định):**
- Đây là **sửa số khách, dịch vụ và TIỀN sau khi đơn đã xác nhận**. Hiện nay việc này bị chặn: dịch vụ của đơn đã xác nhận bị khoá ở CSDL (`migrations/0008`); ô `order.money.edit` có trong ma trận nhưng chưa có route (thuộc N3, `permissions.ts:44`); người phụ trách chỉ sửa được thông tin chuyến (`order.trip.edit`). Tiền là vùng rủi ro cao nhất (vòng 1 F-03).
- **Đụng đặc tả đang chờ duyệt** `docs/superpowers/specs/2026-09-22-khoa-tien-don-da-xac-nhan.md` (Việc 2: trigger đóng băng tiền của đơn đã xác nhận). Không mâu thuẫn nếu làm theo khuyến nghị đã nêu ở `docs/HANDOFF-KIEM-TOAN-2026-09-22.md` §4 câu 3: tiền đơn đã xác nhận **không sửa đè**, mỗi lần HDV đổi là thêm một **dòng điều chỉnh chỉ-thêm** (ai, khi nào, vì sao, trước → sau). Cách này cũng đáp ứng đúng yêu cầu "CTV và admin thấy sự thay đổi". Nếu chọn sửa đè thì Việc 2 phải viết lại. **Hai đặc tả này phải soạn cùng nhau.**
- Hiển thị lịch sử: ô `order.history.view` hiện là `ownOrAssigned` cho Bán hàng (`permissions.ts:38`), nên người lập (CTV) và người phụ trách (HDV) thấy lịch sử; admin thấy hết. Hợp yêu cầu. Nhưng nhật ký hiện chỉ ghi chữ tự do, **không có giá trị trước/sau có cấu trúc** cho tiền (vòng 1 F-09), nên dòng điều chỉnh phải tự mang trước/sau.
- Cần chốt trong đặc tả: sau khi HDV sửa, ảnh xác nhận (luôn giá bán lẻ, §4.1 câu 3) có được **xuất lại bản mới** không? CTV có được **báo** khi đơn của mình bị sửa không, hay chỉ thấy khi mở đơn? Có giới hạn loại sửa nào HDV không được làm (ví dụ giảm giá) không?

### 4.4. Chủ dự án trả lời câu thí điểm (2026-09-22)

> "okie vậy cho 5 cộng tác viên dùng trước"

**Quyết định:** mở thí điểm cho **5 CTV** trước, không mở hết ~1000 tài khoản cùng lúc. Chưa chốt: thời gian thí điểm, tiêu chí để mở rộng, các đợt tiếp theo. Gợi ý đã nêu với chủ, chưa được duyệt: khoảng 2 tuần; mở tiếp khi không có sự cố lộ dữ liệu, không có đơn lệch tiền, và các lỗi người dùng báo đã sửa; rồi mở theo đợt (50 → 200 → tất cả). Điều kiện trước thí điểm vẫn giữ: D-01 đã sửa và kiểm độc lập đạt (ADR-0014, "Hệ quả").

## 5. Thứ tự đề xuất

1. **Không cấp tài khoản cho bất kỳ người ngoài nào** trên hệ thống hiện tại cho tới khi D-01 được sửa (nói với chủ một lần — P18).
2. Chủ trả lời §4 → phiên soạn (vai khác) viết **ADR mới** thay `ADR-0010` điều 1 và xét lại `ADR-0007` (ma trận quyền), kèm đặc tả.
3. Nối vào đặc tả ADR-0013 đang chờ: ranh giới sửa hồ sơ phải tính cả hồ sơ khách theo phạm vi tổ chức (D-05), không chỉ hồ sơ có tài khoản.
4. Các việc NOW/NEXT của vòng 1 (chống gửi trùng, lưới tiền, khôi phục) giữ nguyên thứ tự; D-04 (khoá theo SĐT/IP, huỷ phiên) chuyển lên trước khi mở cho đối tác.
5. Hoa hồng / giá net (D-06) thiết kế cùng N3.

---
*Lưu ý quy trình: cùng một phiên vừa tìm vừa xếp mức D-01 thành "P0 có điều kiện", tức lật kết luận "không P0" của hai báo cáo trước. Lập luận dựa trên ngưỡng (ii) của ADR-0010 điều 1 và định nghĩa P0 của vòng 1 §1, nhưng chưa có người kiểm thứ hai đọc lại; nên cho một phiên khác soát lại cùng lúc với việc kiểm lại 4 đặc tả.*

*Bằng chứng tái chạy: `node --test "tests/audit/*.test.mjs"` (25/25). Tài liệu không sửa mã, không đổi quyết định đã duyệt; mọi hướng sửa ở trên là đề xuất, cần ADR/chủ duyệt theo CLAUDE.md §3.*
