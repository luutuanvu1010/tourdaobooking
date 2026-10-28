# Prompt: kiểm toán lần cuối trước khi đưa Nền tảng vào sử dụng (2026-10-13)

> Hồ sơ có ngày. Chủ dự án dán phần giữa hai vạch vào một **phiên mới** (vai kiểm, không thi công — Hiến pháp P15, N8). Phiên đó chỉ đọc, chỉ báo cáo.

---

Bạn là người kiểm độc lập, chỉ đọc. Nền tảng Tour Đảo Booking (CRM nội bộ, Cloudflare Worker + D1, bản 1.88 đang chạy production) đã làm xong và sắp mở cho nhân viên thật, tiền thật, khách thật. Nhiệm vụ của bạn: tìm những lỗi **quan trọng và nguy hiểm nhất** trong cấu trúc dữ liệu và logic vận hành, rồi đưa ra thứ tự các bước đưa vào sử dụng. Bạn **không sửa gì**, kể cả lỗi chữ; không chạy lệnh ghi; không chạm production (chỉ lệnh chỉ đọc đã được CLAUDE.md §8 cho phép).

## 1. Đọc gì trước (đúng mục, không đọc hết)

1. `CLAUDE.md` của dự án (§2, §3, §7, §8, §10), `src/CLAUDE.md`, `web/CLAUDE.md`.
2. Hiến chương `docs/ARCHITECTURE.md` Phần I (chỉ các điều ghi **đã duyệt**) — đây là thước đo; mã lệch Hiến chương là lỗi.
3. `docs/SYSTEM-DESIGN.md` §5 (dữ liệu), §6 (luồng nghiệp vụ), §7–§8 (API, quyền), §16 (lệch có chủ ý — không báo lại các mục này), §17 (hiện trạng).
4. Hai hồ sơ kiểm gần nhất, để **không báo lại điều đã biết**: `docs/superpowers/specs/2026-10-12-kiem-toan-toan-nen-tang/README.md` (4 lỗi High: K-B-1, K-A-1, K-A-2, K-A-3; các mục Medium K-B-3, K-B-4, K-C-01…04) và `docs/superpowers/specs/2026-10-13-nghiem-thu-phien-va-san-sang-su-dung.md` (mục 5, 6, 7). Với mỗi mục đã biết, chỉ ghi một dòng: **còn hở / đã vá / không kiểm được**.
5. Sổ hoãn `docs/quyen-hoan.json`, sổ hàng rào `docs/SO-HANG-RAO.md`, `docs/BACKLOG.md`.

## 2. Phạm vi kiểm — bảy vùng, mỗi vùng có câu hỏi cụ thể

**A. Cấu trúc dữ liệu** (`migrations/0001`…`0093`, `docs/data-dictionary.json`, trigger, view `v_*`)
- Có cột tiền nào không phải `INTEGER` VNĐ? Có số tiền nào do trình duyệt gửi mà máy chủ tin thẳng (không qua `buildLines`)?
- Có bảng nào bị ghi bởi mô-đun không phải chủ (vi phạm ranh giới `src/modules/*/index.ts`)? `src/architecture.test.ts` còn ngoại lệ nào, ngoại lệ đó che lỗi gì?
- Xoá cứng: ngoài ngoại lệ `XOA_CUNG_NHAP` (ADR-0047), còn `DELETE` nào trên dữ liệu đã xác nhận hoặc có tiền?
- Trigger lõi (chuyến, hồ sơ bên, quyền ngoài — LC-1) có khớp luật ở máy chủ không? Có luật nào chỉ ở một trong hai tầng?
- Migration: số trùng, tệp đã áp remote bị sửa, migration "siết" lọt sớm (`src/migrations-n1.test.ts`). Expand–contract nào đang dở dang (cột ghi kép `order_service.pickup_*`)?
- Chạy `node scripts/audit-invariants.mjs --db local` trên D1 local đã migrate; đọc mã của nó và nêu **bất biến nào chưa được nó kiểm** (ví dụ: tổng tiền đơn = tổng dòng; hoa hồng đã chụp không đổi sau xác nhận; một chuyến không hai xe cùng lúc; cọc không vượt giá trị đơn; tài khoản không vừa nội bộ vừa Đối tác).

**B. Vòng đời đơn** (`src/modules/orders`, `receipt`, `billing`)
- Vẽ bảng trạng thái đơn và dịch vụ (nháp → xác nhận → hoàn tất / huỷ) từ mã thật; mỗi chuyển trạng thái: ai được bấm, cổng nào chặn, nhật ký nào ghi. Chuyển nào **thiếu cổng** hoặc **đi lùi được** (hoàn tất → sửa tiền)?
- Giảm giá, cọc, thu, hoàn: có đường nào làm phải thu âm (ADR-0109), thu vượt, hoàn vượt thu, hoặc sửa số khách mà không đổi tiền (bối cảnh ADR-0114 chưa duyệt)?
- Sửa đơn đã xác nhận: điều gì vẫn sửa được, và bản chụp hoa hồng / giá vốn có bị lệch theo không (K-B-3 đã biết — kiểm xem còn lỗ tương tự ở đổi dịch vụ, đổi ngày, đổi số khách)?
- Lớp chống ghi trùng (ADR-0094, `lan-gui`): route ghi nào **không** đi qua lớp này?
- Ba mốc giờ của một dịch vụ trong cùng buổi (giờ đón ở chặng `ord_transfer_leg`, giờ check-in và giờ khởi hành ở `order_service`): máy chủ có chặn mâu thuẫn không (đón sau khởi hành, check-in sau khởi hành, ngày check-in ngoài khoảng)? "Nơi check-in" và "nơi trả của chặng đi" có bị ghi hai nơi lệch nhau không?

**C. Tiền, hoa hồng, sổ** (`pricing`, `billing`, sổ đại lý đợt 1, khoá tháng)
- Có công thức tiền thứ hai ngoài hàm chính (Hiến chương 5.4)? Rào `buildlines-guard` phủ những tệp nào, bỏ sót tệp nào?
- Khoá tháng: sau khi khoá, đường ghi nào vẫn đổi được số của tháng đã khoá? Cách hoàn tác thực tế là gì, đã diễn tập chưa?
- Ca vàng (`*.vang.*` / golden): ca nào chưa người thật xác nhận mà phần tiền đó đã chạy production?

**D. Quyền và danh tính** (`src/shared/permissions.ts`, `auth`, `accounts`, `staff`, `parties`)
- Lấy bản đồ quyền (ma trận) và đối chiếu với `src/permission-enforcement.test.ts`, `src/route-write-guard.test.ts`: ô nào **không bị máy chủ hỏi**? Route ghi nào không khai `access`?
- Quyền ngoài (`PARTNER`, `DRIVER_PARTNER`) nhìn thấy gì của người khác? Thử bằng suy luận từ mã: một tài khoản đối tác có đọc được đơn, giá vốn, SĐT khách của đối tác khác không?
- Giao diện ẩn/hiện theo quyền có chỗ nào ẩn nút nhưng route vẫn mở (hoặc ngược lại)?
- Phiên, PIN, Face ID, Turnstile, chống dò PIN: giới hạn số lần, thời hạn phiên, thu hồi phiên khi đổi quyền hoặc khoá tài khoản — đổi quyền có làm phiên đang mở mất quyền ngay không?
- Nhật ký (`audit`): `grep` toàn `src/` tìm chỗ ghi SĐT, email, MST, số căn cước, số bằng lái vào nhật ký, DTO mặc định hay câu báo lỗi (`src/giay-to-khong-lo-so.test.ts` phủ chưa đủ chỗ nào?).

**E. Điều phối xe và tài xế** (`dispatch`, `van-chuyen`)
- Mốc 6 giờ: còn đường xác nhận nào né được (trừ "Đặt gấp")? Lệnh chuyến có đúng MỘT `db.batch` theo thứ tự cổng → nhật ký → lệnh → trạng thái?
- Tài xế thấy tên / năm sinh / SĐT khách đúng **trong ngày chạy** không, có DTO nào lộ sớm hoặc lộ sau?
- Chuyển khách giữa xe (ADR-0111), từ chối chuyến (ADR-0053, ADR-0113): tình huống nào làm khách "mất" (không còn ở xe nào) hoặc nhân đôi?

**F. Đồng bộ Google Sheet, thông báo, trợ lý**
- Đồng bộ danh mục: nếu Sheet đổi giá / xoá dòng, đơn đã xác nhận có bị đổi tiền không? Lỗi mạng giữa chừng để lại trạng thái dở không?
- Nạp nhân viên từ Sheet: có đường nào tạo tài khoản với quyền cao hoặc ghi đè quyền hiện có?
- Web Push, Trợ lý AI: có gửi dữ liệu cá nhân hay tiền ra bên ngoài (nhà cung cấp AI, push) ngoài phạm vi đã duyệt (ADR-0066, 0069, 0082)?

**G. Vận hành và khôi phục**
- `npm run trien-khai`: bước nào không có hoàn tác? Điểm khôi phục Time Travel: còn hạn bao lâu sau khi tạo, ai ghi, thử khôi phục bao giờ chưa?
- Chế độ bảo trì: chủ bị khoá thì lối thoát là gì, đã kiểm chưa?
- Mốc **31/10/2026**: các mục sổ hoãn hết hạn làm `npm test` đỏ ở mọi nhánh — liệt kê và nói rõ ảnh hưởng.
- Bí mật: `grep` toàn repo (trừ `.dev.vars`) tìm khoá, token, ID Sheet có SĐT thật lộ trong mã hoặc tài liệu.

## 3. Cách làm

- Với mỗi vùng: đọc mã thật trước, tài liệu sau. Tài liệu lệch mã thì ghi là lỗi tài liệu, **không** suy ra mã sai.
- Mỗi phát hiện phải có **đường tái hiện cụ thể**: ai (quyền nào), làm gì (route / màn hình), dữ liệu nào, kết quả sai ra sao. Không có đường tái hiện thì xếp là "nghi ngờ", để riêng.
- Được chạy: `npm test`, `npm run typecheck`, `node scripts/audit-invariants.mjs --db local`, `npm run test:e2e` (cần mạng, tắt `wrangler dev` mồ côi trước), và lệnh chỉ đọc trên production (`wrangler d1 migrations list … --remote`, `wrangler deployments list`, GET công khai). Mọi lệnh ghi, `--remote` ghi, deploy: **cấm**.
- Được dùng khung thử / D1 local để tái hiện; không được "sửa thử" rồi để lại trong cây làm việc.
- Không hỏi chủ giữa chừng trừ khi không thể tiếp tục. Giả định thì ghi vào báo cáo.

## 4. Thang mức

- **Critical**: mất hoặc sai tiền thật, lộ dữ liệu cá nhân ra ngoài, người không có quyền ghi được dữ liệu người khác, không khôi phục được.
- **High**: luật đã duyệt mà máy chủ chưa thi hành ở đường có thể bị bấm trong vận hành bình thường; hoặc bất biến không có máy canh.
- **Medium**: sai nhưng cần nhiều điều kiện, hoặc chỉ ảnh hưởng người phát triển.
- **Low**: chữ, tài liệu, gọn mã.

## 5. Sản phẩm bàn giao (một thư mục `docs/superpowers/specs/2026-10-<ngày>-kiem-toan-truoc-su-dung/`)

1. `README.md` cho chủ dự án, **không quá hai trang**, tiếng Việt có dấu, lời thường, theo thứ tự:
   - Kết luận một đoạn: **mở được / mở với điều kiện / chưa nên mở**, và vì sao.
   - Bảng phát hiện Critical và High, xếp theo mức nguy hiểm, mỗi dòng: mã, chuyện gì (lời thường), tái hiện thế nào, xử lý khuyến nghị, việc lớn hay nhỏ.
   - Trạng thái các mục đã biết từ 12/10 và 13/10 (một dòng mỗi mục).
   - **Thứ tự các bước đưa vào sử dụng**, đánh số, mỗi bước: làm gì, ai làm (chủ / Kế toán / AI), điều kiện để sang bước sau, cách hoàn tác. Khung gợi ý để bạn điều chỉnh theo phát hiện: (1) vá Critical/High chặn mở; (2) diễn tập khôi phục trên bản sao; (3) Kế toán xác nhận ca vàng; (4) chủ quyết dữ liệu thử trên production, tạo điểm Time Travel; (5) nạp nhân viên, danh mục, đối tác thật; (6) kiểm tay đủ vai trên production, iPhone, thông báo; (7) dùng thử nhóm nhỏ 1–2 tuần, theo dõi Góp ý / Báo lỗi và `audit-invariants --db remote` hằng ngày; (8) mở toàn bộ; (9) sau mở: không khoá tháng cho tới khi diễn tập khôi phục; xử lý mốc 31/10.
   - Điều chưa kiểm được và lý do.
   - Quyết định cần chủ (tối đa 3).
2. `phu-luc/` theo từng vùng A–G: bằng chứng đầy đủ (tệp:dòng, lệnh đã chạy, kết quả), kể cả vùng **không** có lỗi (ghi "đã kiểm, sạch" kèm cách kiểm).
3. Nếu có Critical: nêu thêm **câu lệnh hoặc bài kiểm đỏ** tái hiện được, để phiên thi công sau dùng làm bài "đỏ trước".

Báo cáo cuối cho chủ theo bốn mục: Đã làm — Đã kiểm — Chưa làm/chưa kiểm — Cần bạn quyết. Không nói "đạt" khi chưa chạy lệnh.

---

## Ghi chú cho chủ dự án (ngoài prompt)

- Phiên kiểm nên mở ở worktree riêng, mô hình mạnh nhất, cho đủ thời gian (ước 2–4 giờ máy).
- Sau khi có báo cáo: các lỗi Critical/High là **việc lớn** (dữ liệu, tiền, quyền) → mỗi lỗi một phiên thi công đỏ→xanh, rồi `nguoi-kiem-doc-lap` kiểm, rồi mới `npm run day-len` và `npm run trien-khai`.
