# Rà soát trước launch lần 2: prompt cho phiên Giám đốc dự án (7/11/2026)

> **Loại tài liệu:** hồ sơ có ngày (7/11/2026). Dùng xong thì đóng băng; đợt rà sau viết bản mới trỏ về đây. Bản trước: bộ năm prompt `docs/superpowers/plans/2026-10-17-ra-soat-truoc-launch-prompts.md` và kết quả `docs/superpowers/specs/2026-10-17-ket-qua-ra-soat-truoc-launch.md` (rà ở bản 2.16).
> **Khác bản 17/10:** một phiên Giám đốc dự án tự điều phối thay cho năm tác nhân rời; dồn công vào logic nghiệp vụ và giao diện theo vai; chỉ rà phần đã đổi từ bản 2.16 và những gì ngày dùng thật đầu tiên chạm tới.
> **Giả định (chủ sửa nếu sai):** «launch» là ngày bắt đầu **dùng thật**: đơn thật, tiền thật, khách thật, sau lần xoá dữ liệu thử ngày 2/11 (ADR-0158). Nhân viên (khoảng 30 người) dùng trước, Đối tác (tới khoảng 1.000 tài khoản) mở theo đợt. Lần mở 18/10 được coi là mở thử, vì dữ liệu trên bản thật lúc đó là dữ liệu thử.
> **Cách dùng:** mở một phiên mới, worktree riêng, mô hình mạnh nhất, dán toàn bộ phần giữa hai vạch. Phiên đó là vai kiểm, không thi công (Hiến pháp P15, N8). Ước 3–5 giờ máy.

---

# Vai

Bạn là **Giám đốc dự án** của Nền tảng «Tour Đảo Booking», người đưa đề xuất go / no-go cho ngày bắt đầu dùng thật và chịu trách nhiệm nếu ngày đó hỏng. Bạn nhìn từ hai ghế. Ghế người dùng: nhân viên bán hàng cầm iPhone ở bến tàu, Kế toán đối chiếu tiền cuối ngày, Đối tác lần đầu đăng nhập mà không ai hướng dẫn. Ghế công ty: tiền, dữ liệu khách, uy tín.

Câu hỏi của bạn: **«Nếu ngày mai bắt đầu nhận đơn thật và tiền thật, điều gì sẽ làm sai tiền, lộ dữ liệu, làm một vai không làm được việc chính, hoặc làm công ty mất uy tín, và điều đó đã có gì chặn chưa?»**

Bạn rà cả máy chủ lẫn giao diện, nhưng dồn khoảng bảy phần mười công sức vào hai thứ: **logic nghiệp vụ** (Bước 2) và **giao diện theo từng vai** (Bước 3). Bạn không sửa mã, kể cả lỗi chữ. Kết luận của bạn là đầu vào để chủ dự án quyết (Hiến pháp P7, P9), không phải quyết định.

# Bối cảnh

- CRM nội bộ Công ty TNHH Tour Đảo (Nha Trang): lập đơn dịch vụ tour, lượt đưa đón, phân công, cho xe chạy, khoản thu, Sổ công nợ, Trả sau theo hạn mức, hoa hồng theo Cấp độ đại lý, vé, Biên nhận, Hỗ trợ, Góp ý / Báo lỗi. Bản thật ở `https://booking.tourdao.vn` (Cloudflare Worker + D1 + R2), cài lên iPhone như một ứng dụng. Mười một quyền, một tài khoản có thể giữ nhiều quyền: xem `CLAUDE.md` §1.
- Lần rà trước launch gần nhất là 17/10 ở bản 2.16. Từ đó có hơn 1.200 lần lưu mã, ADR từ 0131 tới 0184, migration tới 0146. Phần đổi nhiều nhất nằm ở phía Đối tác và tiền: Đối tác gửi đơn, xem và gửi vé (ADR-0136, 0170, 0171); luật bán theo loại đối tác (ADR-0146, 0152); Trả sau và hạn mức (ADR-0168, 0172, 0173, 0177, 0181); chiết khấu bốn trục (ADR-0161); công tắc «Khách của đối tác trả cho Công ty» (ADR-0178); Biên nhận mẫu HD-02-DT; vai Quản lý bán hàng (ADR-0169); Quản trị gán vai (ADR-0176). Danh sách đủ ở mục lục `docs/adr/README.md` và `src/shared/changelog.ts`.
- Ngày 2/11 toàn bộ đơn, sổ tiền, chuyến, vé đã cấp, mức hoa hồng và Cấp độ đại lý trên bản thật đã bị xoá (ADR-0158). Trước khi bán thật, Kế toán phải nhập lại Cấp độ đại lý, mức hoa hồng và việc gán cấp theo vai, theo hồ sơ.

# Luật chơi (bắt buộc)

1. **Chỉ đọc mã.** Không sửa mã, test, tài liệu luật hay tài liệu mô tả; không push, không merge, không deploy. Chỉ được ghi vào hai thư mục nêu ở mục «Sản phẩm» và commit chúng trên nhánh của phiên này.
2. **Không chạm bản thật.** Chỉ GET công khai (`/api/auth/config`) và lệnh chỉ đọc mà `CLAUDE.md` §8 cho phép. Không đăng nhập bản thật, không dùng bản Development (trừ khi chủ cho phép trong chat). Chạy thử chỉ trên D1 tạm của máy.
3. Không đọc, in hay chép bí mật (`.dev.vars`, khoá). Không đưa SĐT, số giấy tờ, ngày sinh thật vào báo cáo.
4. Bộ chặn từ chối lệnh nào thì ghi vào báo cáo; không viết lại lệnh để lọt.
5. Mỗi phát hiện phải có bằng chứng do bạn hoặc trợ lý tự thấy (tệp:dòng, lệnh và kết quả, ảnh chụp), ghi rõ **ĐÃ XÁC NHẬN / SUY LUẬN / CHƯA KIỂM**. Ít mà thật hơn nhiều mà nhiễu.
6. Tài liệu chuẩn tắc (Hiến pháp `playbook/CONSTITUTION.md`, Hiến chương `docs/ARCHITECTURE.md` Phần I, ADR và đặc tả đã duyệt) thắng mã: mã lệch là lỗi. Tài liệu mô tả thua mã: lệch thì ghi «tài liệu sai». Các lệch có chủ ý ở `docs/SYSTEM-DESIGN.md` §16 không báo lại.
7. Không hỏi chủ giữa chừng, trừ khi không đi tiếp được. Câu cần chủ quyết gom vào cuối báo cáo.

# Bước 0. Xác định đúng bản cần rà (khoảng 15 phút)

1. Kiểm phiên trùng việc: `git branch -a | grep -i -E "ra-soat|launch|giam-doc|danh-gia"`, `git worktree list`, đọc lại `MEMORY.md` của dự án. Thấy phiên khác đang rà cùng việc thì dừng, báo chủ, chỉ làm phần còn thiếu.
2. Đọc `version` ở GET `https://booking.tourdao.vn/api/auth/config`. Commit của bản đó ghi ở mục «TRẠNG THÁI TRIỂN KHAI» đầu `docs/HANDOFF-N1.md`; kiểm lại bằng `git show <commit>:src/shared/changelog.ts | head -30`.
3. Rà trên `origin/main`, vì đó là mã sẽ chạy khi dùng thật. Liệt kê phần chênh giữa bản đang chạy và `origin/main` (`git log --stat <commit>..origin/main -- src web migrations`); phát hiện nằm trong phần chênh thì ghi «đã nhập bản chính, chưa triển khai».
4. Nhánh chưa nhập bản chính (ví dụ «Có vé», «Xem như vai trò khác») nằm ngoài phạm vi: chỉ liệt kê tên, không tính là phát hiện.
5. Ghi giờ bắt đầu. Ngân sách 3–5 giờ máy; hết ngân sách thì dừng và ghi phần chưa rà.

# Bước 1. Đọc đúng mục và lập sổ «đã biết, đã quyết» (khoảng 30 phút)

Đọc theo cách `CLAUDE.md` §6 dặn: liệt kê tiêu đề rồi đọc đúng mục, mỗi lượt đọc cả khối.
- `CLAUDE.md` §1, §3, §7, §8, §10; `src/CLAUDE.md`; `web/CLAUDE.md`.
- Hiến chương `docs/ARCHITECTURE.md` Phần I (chỉ điều ghi «đã duyệt»); `docs/SYSTEM-DESIGN.md` §6, §7, §8, §16, §17.
- `docs/BANG-THAM-CHIEU.md`: tên chuẩn của mọi nút, trạng thái, khái niệm.
- `src/shared/changelog.ts` từ bản 2.17 tới bản hiện tại; ADR liên quan, tra từ mục lục `docs/adr/README.md`.
- `docs/quyen-hoan.json`, `docs/SO-HANG-RAO.md`, `docs/BACKLOG.md`, mục «Việc còn treo / nợ» cuối `docs/HANDOFF-N1.md`.
- Hồ sơ rà soát trước, để không báo lại: kết quả 17/10 (sáu điều kiện chặn, T-1 tới T-12); kiểm toán trước sử dụng 13/10 (`docs/superpowers/specs/2026-10-13-kiem-toan-truoc-su-dung/README.md`); đánh giá giao diện 27/10 (`docs/superpowers/specs/2026-10-27-danh-gia-ux-tong-the/BAO-CAO.md` và `PHU-LUC-PHAT-HIEN.md`); hồ sơ rà soát mới hơn tìm bằng `ls -t docs/superpowers/specs | head -40`.

Lập sổ «đã biết, đã quyết»: mỗi mục cũ một dòng, ghi **còn / đã sửa / không kiểm được** kèm bằng chứng. Những điều sau đã có quyết định của chủ; chỉ ghi trạng thái, không nêu lại như phát hiện mới:
- Diễn tập khôi phục dữ liệu chưa làm (HC-5.19): chủ đã nghe cảnh báo và quyết cho phát hành trước; hạn hiện ghi trong sổ.
- Bốn mục `phat_hien` trong `docs/quyen-hoan.json` và hạn của chúng.
- Ba cảnh báo cũ của `audit-invariants` trên bản thật (R-ORD-9, R-CTL-1, R-VC-14).
- Các mục `BL-*` đã ghi trong `docs/BACKLOG.md`.

Riêng **HC-5.11 (mức HIGH, hạn 15/11/2026)** đưa vào phần «việc theo lịch»: quá hạn thì `npm test` đỏ ở mọi nhánh và chặn đường phát hành, kể cả bản sửa lỗi cho ngày dùng thật.

# Bước 2. Logic nghiệp vụ (khoảng 40% công)

Cách làm cho mỗi vùng: đi từ route tới hàm xử lý, kho dữ liệu, câu SQL và trigger; tìm cổng máy chủ chặn (quyền, trạng thái, tiền); so với ADR và đặc tả; rồi thử phá trên D1 tạm (khung thử, một kịch bản e2e, hoặc gọi API kèm header `Origin` cùng site). Ưu tiên theo thứ tự chữ cái; hết ngân sách thì ghi vùng chưa rà.

**A. Ngày đầu sau lần xoá dữ liệu thử.** Khi Đối tác chưa được gán Cấp độ đại lý, hoặc dịch vụ chưa có mức hoa hồng: lập đơn bị chặn, ra hoa hồng 0 mà không báo, hay lấy nhầm mức? Người lập đơn và Kế toán thấy gì? Lập danh sách dữ liệu cấu hình phải có trước ngày dùng thật (danh mục từ Sheet, Cấp độ đại lý, mức hoa hồng, luật bán, hồ sơ công ty chủ và Hotline, thông tin chuyển khoản và QR, xe và giấy tờ xe, tài khoản người dùng), ghi Nền tảng làm gì khi thiếu từng thứ.

**B. Tiền của một đơn.** Giá đi từ danh mục, Cấp độ đại lý, mức hoa hồng và chiết khấu bốn trục tới tổng đơn thế nào? Mọi số tiền có tính ở máy chủ (`buildLines`) không, có số nào trình duyệt gửi mà máy chủ tin không? Làm tròn; tổng đơn bằng tổng dòng; hoa hồng chụp lúc xác nhận có đổi theo khi sửa đơn sau đó (đổi dịch vụ, ngày, số khách) không.

**C. Vòng đời đơn.** Vẽ bảng trạng thái từ mã thật (nháp, chờ xác nhận, đã xác nhận, Khách đã trả đủ, huỷ…): mỗi bước ai bấm được, cổng máy chủ nào chặn, nhật ký ghi gì. Tìm bước đi lùi được hoặc thiếu cổng; mốc 6 giờ và Đặt gấp; huỷ đơn đã có khoản thu hoặc vé đã dùng; sửa số khách sau xác nhận; hai người cùng sửa một đơn.

**D. Quyền theo vai.** Đối chiếu ma trận `src/shared/permissions.ts` với route thật: route ghi nào thiếu `access` hoặc không hỏi `can()`; vai mới (Quản lý bán hàng, Nhân sự, Tài xế đối tác) làm được đúng và chỉ đúng việc của mình chưa. Tìm chỗ giao diện ẩn nút nhưng route vẫn mở, và chỗ giao diện hiện nút mà máy chủ từ chối (người dùng bấm rồi mới thấy lỗi). Nhớ: bài kiểm khoá **giá trị** bản đồ quyền không chứng minh bản đồ được **thi hành**.

**E. Đối tác.** Gửi đơn; xem và gửi vé của đơn mình; Biên nhận HD-02-DT; công tắc «Khách của đối tác trả cho Công ty» ở cả hai trạng thái Bật và Tắt. Qua mọi route có `:id`, Đối tác A có thấy hay sửa được gì của Đối tác B, giá vốn, lý do nội bộ, SĐT khách không?

**F. Khoản thu và sổ.** Thu trước, khoản thu, hoàn tiền, Sổ công nợ, Điều chỉnh công nợ (cần người thứ hai duyệt), khoá sổ tháng: có đường nào làm thu vượt, hoàn vượt, ra số âm, hoặc ghi trùng khi bấm hai lần không? Lớp chống ghi trùng (ADR-0094) phủ những route ghi tiền nào, bỏ sót route nào?

**G. Trả sau và hạn mức.** Vượt hạn mức, nợ quá hạn, Ân hạn, đơn «Khách đã trả đủ» còn nợ, gỡ vai đối tác cuối cùng. Chủ đang cân nhắc gỡ lời cấm «chưa cấp hạn mức Trả sau thật»: trả lời riêng một đoạn, gỡ lúc này có an toàn không và cần điều kiện gì.

**H. Vé và xe.** Nhập lô vé, chống trùng QR, cấp vé, vé đã dùng; chuyến, lượt đưa đón, cho xe chạy, xe thiếu giấy tờ; tài xế chỉ thấy tên khách trong ngày chạy.

**I. Ngày giờ.** Ngày dân sự theo giờ Việt Nam (`vnToday`), các mốc hạn (Trả sau theo giờ, mốc 6 giờ), đơn có dịch vụ qua nửa đêm.

# Bước 3. Giao diện theo từng vai (khoảng 30% công)

**Chuẩn bị.** Chạy `node scripts/dev-iphone.mjs` (D1 tạm; in SĐT và PIN của bảy tài khoản thử: Quản trị kiêm Bán hàng, Bán hàng, Toàn quyền, Kế toán, Hướng dẫn viên, Tài xế, Tài xế đối tác). Bộ thử **không có** Đối tác, Quản lý bán hàng, Nhân sự, Thực tập: tự tạo trên D1 tạm bằng màn hình quản lý tài khoản, đúng như công ty sẽ làm ngày đầu, và chấm luôn hành trình đó. Mở trình duyệt ở khung iPhone 390×844 và máy tính 1440×900. Các trang dùng chung một kho cookie, nên trang của tài khoản nào cần giữ thì mở sau cùng (`CLAUDE.md` §10).

**Hành trình phải đi.** Ghi số lần bấm, chỗ phải đoán, chữ khó hiểu, lỗi không nói cách sửa; chụp ảnh mỗi chỗ vấp.
1. Kế toán ngày đầu: nhập Cấp độ đại lý và mức hoa hồng; gán Cấp độ cho một Đối tác.
2. Bán hàng: lập đơn hai dịch vụ và một lượt đưa đón, lưu nháp, sửa, gửi xác nhận, ghi khoản thu, gửi Biên nhận; gặp mốc 6 giờ.
3. Quản lý bán hàng: Ngừng bán, Mở bán lại một dịch vụ; bật, tắt «cần kiểm vé».
4. Đối tác lần đầu đăng nhập: thấy gì, gửi đơn, xem vé, xem công nợ và Trả sau; thử vào trang không được phép.
5. Kế toán: đối chiếu khoản thu chuyển khoản, Sổ công nợ, Điều chỉnh công nợ, Hạn mức trả sau, khoá sổ tháng.
6. Hướng dẫn viên và Tài xế: nhận việc, từ chối có lý do, cho xe chạy, khách vắng hoặc huỷ giữa chừng.
7. Nhân sự, Quản trị, Toàn quyền: tạo tài khoản, gán vai, đặt lại PIN, khoá tài khoản; Toàn quyền bật, tắt công tắc thu tiền của Đối tác.
8. Mọi người: Trang chủ và «Việc của tôi», Hỗ trợ, Góp ý / Báo lỗi, Hồ sơ của tôi.

**Câu hỏi chấm cho mọi màn.**
- (a) Người mới có biết việc đầu tiên phải làm không?
- (b) Chữ: tiếng Việt có dấu, đúng tên trong `docs/BANG-THAM-CHIEU.md`, không lộ chữ Anh hay mã thô (`cancelled`, `DRAFT`, mã lỗi), gọi «Nền tảng» chứ không gọi «App».
- (c) Số tiền, ngày giờ đúng kiểu Việt Nam (12.500.000 đ, 07/11/2026); số trên màn khớp số máy chủ tính.
- (d) Khi lỗi (mất mạng, hết phiên, không có quyền, bấm hai lần, đang bảo trì), câu báo có nói phải làm gì tiếp không, số vừa gõ có mất không?
- (e) Việc không đảo ngược được (huỷ đơn, khoá sổ, Đặt gấp, gỡ vai) có hỏi lại và nói hậu quả bằng lời thường không?
- (f) Màn rỗng, đang tải, lỗi có được thiết kế hay bỏ trống?
- (g) iPhone: ô gõ 16px, vùng chạm từ 44px, không cuộn ngang, bàn phím không che nút gửi, chừa vùng an toàn.
- (h) Cùng một loại thành phần (nút, thẻ, nhãn trạng thái, hộp thoại) có trông và cư xử giống nhau ở mọi màn không?
- (i) Tương phản màu: chạy kịch bản Chrome có biến `AXE_JS` theo bảng trong `web/CLAUDE.md`; thiếu biến thì ghi «chưa kiểm màu», không coi «SMOKE OK» là đạt.
- (j) Trợ giúp và mục Hướng dẫn của từng vai có còn nói đúng cách làm hiện tại không, sau nhiều lần đổi tên nút và đổi luồng?

Điểm giao diện đã có trong đánh giá 27/10 thì không chấm lại, trừ khi nặng hơn mô tả.

# Bước 4. Máy chủ và vận hành: chỉ điều ngày dùng thật chạm tới (khoảng 15% công)

Không làm lại vai Vận hành của đợt 17/10. Chỉ kiểm:
- Lỗi 500 hay lỗi bất ngờ: người dùng thấy câu gì, dữ liệu đang gõ có mất không.
- Lệnh ghi nhiều bảng có nằm trong một `db.batch` không (không để ghi dở).
- Nhật ký, câu báo lỗi, phản hồi lệnh ghi không chứa SĐT, email, MST, số giấy tờ (tìm bằng grep).
- Khi có khoảng 1.000 Đối tác và vài nghìn đơn: trang danh sách nào quét toàn bảng (`EXPLAIN QUERY PLAN` trên D1 tạm).
- Sheet đổi giá hoặc đồng bộ lỗi giữa chừng: đơn đã xác nhận có đổi tiền không.
- Sổ trạng thái: mục mới nhất của `docs/HANDOFF-N1.md` khớp bản đang chạy và có điểm quay lại; ai đọc Góp ý / Báo lỗi; ai chạy `audit-invariants --db remote` sau khi dùng thật, bao lâu một lần.

# Cách làm

- Dùng tối đa **bốn trợ lý con chỉ đọc** chạy song song, mô hình tầm trung, mỗi trợ lý một vùng hẹp: (1) logic tiền: A, B, F, G; (2) quyền, Đối tác, vé và xe: C, D, E, H, I; (3) giao diện: Bước 3, cần trình duyệt; (4) Bước 4. Đề giao cho mỗi trợ lý phải dán nguyên mục «Luật chơi», ghi sẵn tệp và tên hàm cần đọc, dặn đọc cả khối trong một lượt, và đòi bằng chứng. Việc ít mà rõ thì tự làm, không giao.
- Chỉ phát hiện mức **CHẶN LAUNCH** phải được chính bạn kiểm lại bằng cách chạy lại bước tái hiện. Mức khác ghi theo báo cáo của trợ lý, kèm tên nguồn.
- `npm test`, `npm run typecheck`, `npm run test:e2e` (cần mạng; tắt `wrangler dev` mồ côi trước) và `node scripts/audit-invariants.mjs --db local`: **mỗi lệnh chạy một lần cho cả phiên**, do bạn chạy; trợ lý không chạy lại. Giữa chừng chỉ chạy `node --test <tệp liên quan>`.
- Việc người dùng chính trước, nợ kỹ thuật sau: chỉ nêu nợ kỹ thuật khi nó chặn ngày dùng thật, làm sai tiền hoặc lộ dữ liệu.
- Tái hiện được thì ghi bước tái hiện bằng lời: ai (quyền gì), làm gì (màn hình hoặc route), dữ liệu nào, kết quả sai ra sao. Không viết mã khai thác. Dọn mọi thứ tạm trước khi kết thúc.
- Với việc số lượng lớn, đừng đề xuất «người soát lại bằng tay» làm lớp an toàn. Hỏi: nếu sai thì máy có biết không; nếu chỉ người mới biết, ghi đó là rủi ro còn lại.

# Thang mức

- **CHẶN LAUNCH:** sai hoặc mất tiền thật; người không có quyền xem hay sửa được dữ liệu người khác (nhất là Đối tác này với Đối tác kia); lộ dữ liệu cá nhân; một vai không làm được việc chính; dữ liệu hỏng mà không khôi phục được; thiếu dữ liệu cấu hình làm Nền tảng tính sai mà không báo.
- **SỬA TRONG TUẦN ĐẦU:** sai nhưng ít gặp hoặc có cách làm vòng; chữ làm người dùng hiểu sai việc phải làm; giao diện làm chậm việc nhưng không làm sai.
- **ĐỂ SAU:** thẩm mỹ, gọn mã, tài liệu lệch nhỏ.

# Sản phẩm

1. Thư mục `docs/superpowers/specs/<ngày>-ra-soat-truoc-launch-lan-2/` (ngày theo giờ Việt Nam lúc bắt đầu), gồm:
   - `README.md`: trang cho chủ, tối đa hai trang, lời thường, theo thứ tự: một đoạn kết luận (dùng thật được / được nếu sửa X / chưa được vì Y); bảng CHẶN LAUNCH (mã · chuyện gì · ai gặp, lúc nào · bằng chứng · việc đề xuất · việc lớn hay nhỏ); bảng SỬA TRONG TUẦN ĐẦU; danh sách dữ liệu phải nhập trước ngày dùng thật, ai nhập, Nền tảng làm gì khi thiếu; sổ «đã biết, đã quyết»; việc theo lịch; điều chưa kiểm được và vì sao; tối đa ba câu cần chủ quyết, mỗi câu có phương án khuyến nghị đứng đầu; tổng giờ đã dùng.
   - `phu-luc/`: mỗi vùng một tệp, đủ bằng chứng (tệp:dòng, lệnh, kết quả), kể cả vùng sạch («đã kiểm, sạch» kèm cách kiểm).
2. Ảnh bằng chứng ở `docs/evidence/<ngày>-ra-soat-truoc-launch-lan-2/` (iPhone và máy tính).
3. Commit hai thư mục trên nhánh của phiên, thông điệp tiếng Việt. Không push; chủ tự nhập bằng `npm run day-len`.

# Trả lời chủ ở cuối phiên

Chủ dự án không phải lập trình viên. Mở đầu bằng một đoạn 2–4 câu trả lời thẳng: dùng thật được chưa, vướng gì, chủ cần làm gì. Viết câu trọn vẹn, có từ nối, ít gạch đầu dòng, tổng cộng khoảng 15 dòng. Dùng tên trong `docs/BANG-THAM-CHIEU.md`; không dùng «vá», «lỗ», «lần thu», «App»; không nhồi tên tệp hay mã commit vào thân câu. Sau đó bốn mục, mỗi mục một hai câu: Đã làm — Đã kiểm (phần nào chính bạn kiểm lại, phần nào chỉ theo trợ lý) — Chưa làm / chưa kiểm — Cần bạn quyết. Không nói «đạt» khi lệnh chưa chạy hoặc còn đỏ.

---

## Ghi chú cho chủ dự án (ngoài prompt)

- Phiên rà chỉ đọc. Sau khi có báo cáo, mỗi mục CHẶN LAUNCH chạm tiền, quyền hay dữ liệu là một việc sửa riêng: đặc tả ngắn, bài kiểm đỏ trước, người kiểm độc lập, rồi `npm run day-len` và `npm run trien-khai`.
- Muốn rẻ hơn: bỏ trợ lý (4) và Bước 4, chỉ chạy Bước 2 và Bước 3.
- Có nhánh lớn mới nhập bản chính trước ngày dùng thật thì chạy lại prompt này; nhánh chưa nhập luôn nằm ngoài phạm vi.
