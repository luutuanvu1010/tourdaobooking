# ADR-0094 — Lớp chống ghi trùng chung của Nền tảng: mỗi lệnh ghi mang một "vé", máy chủ ghi vé cùng lô với dữ liệu

- **Trạng thái:** **accepted** — chủ dự án, chat 2026-10-02: *"2- Duyệt"* (cùng tin nhắn với *"1- có"* cho X-4 của ADR-0089).
  - Chủ dự án đã trả lời ba câu V1–V3 (chat 2026-10-02, lời chủ lần 5 bên dưới), rồi duyệt văn bản bản @`8cd6349d`.
  - Phần AI tự thêm khi soạn nằm riêng ở mục **"Đề xuất của AI — áp theo khuyến nghị"** (A-1…A-11). Các điểm này **áp theo khuyến nghị**, theo lời chủ cùng ngày: *"đừng hỏi tôi những câu hỏi mà tôi nên đồng ý nữa,"*. Chủ bác điểm nào thì sửa điểm đó.
  - Vì vậy số sàn (A-3: 90 ngày) và thời gian chờ khi rút ngắn (A-4: 7 ngày) mà đ8 cần đã có.
  - AI ghi lại lời duyệt, không tự duyệt (Hiến pháp N3).
  - AI ghi lại, không tự duyệt (Hiến pháp N3).
- **Ngày:** 2026-10-02.
- **Số:** 0094 (đã giữ chỗ ở `docs/adr/README.md`).
- **Loại:** việc lớn.
  - **Dữ liệu:** hai bảng mới, có migration.
  - **Quyền:** cổng đổi thời hạn giữ vé.
  - **Luật:** thêm một ngoại lệ có tên cho luật "không xoá cứng"; đề xuất một khái niệm lõi mới cho Hiến chương.
  - **Phạm vi:** chạm mọi route ghi.
- **Cửa:**
  - Mã của lớp là **hai chiều**: giai đoạn 1 cho qua lệnh thiếu vé.
  - Đường dọn vé là **một chiều về dữ liệu**: vé đã dọn không lấy lại được.
- **Đi cùng:**
  - ADR-0089 (duyệt hoàn, chi hoàn, chuyển tiền sang đơn mới, ghi "đã hoàn ngoài hệ thống") và ADR-0088 (lệnh "Thay lần thu"): các lệnh mới này đi qua lớp này, không tự làm cơ chế riêng.
  - ADR-0092 (mã giao dịch ngân hàng, đ6; cảnh báo lần thu tiền mặt giống nhau, đ6a) thuộc **lớp nghiệp vụ**, không thuộc ADR này.
- **Xây trên lỗ đang hở: F-02** (HIGH, hạn **2026-10-15**, `docs/quyen-hoan.json`). ADR này là cách vá. Điều kiện: chủ duyệt kịp để thi công trước hạn, **hoặc** chủ gia hạn F-02 bằng diff có lý do.
- **Nguồn chi tiết:**
  - đặc tả đề xuất `docs/superpowers/specs/2026-10-02-lop-chong-ghi-trung-chung-de-xuat.md` (gọi tắt **"đặc tả"**, kèm số mục);
  - nghiên cứu Oracle `docs/superpowers/specs/2026-10-02-chong-trung-moi-lenh-ghi-theo-oracle.md`.

  ADR này chốt quyết định và trỏ về đặc tả cho chi tiết. Khi hai nơi khác nhau, **ADR thắng**.
- **Người kiểm độc lập** đã soát hai vòng (chỉ đọc, 2026-10-02). Vòng 1: ba chỗ chặn, tám chỗ nên sửa. Vòng 2: không chỗ chặn, bốn chỗ nên sửa. Tất cả đã xử lý trong bản này (xem cuối tệp).
- **Số dòng mã** trích theo `93233953` (nhánh `worktree-quyet-dinh-thu-nghiep-vu`). Nhánh này chậm hơn `main` (`main` đã có migration `0069`). Khi lập kế hoạch, đối chiếu lại trên `main`.

## Lời chủ dự án (nguyên văn, chat 2026-10-02)
Đánh số lần theo mục "Lời chủ" của ADR-0089 (cùng chuỗi tin nhắn).
1. **Lần 1** (tin nhắn mở đầu "1- Khi khách huỷ…"), **câu 3**, trả lời câu Q-F02 của phiếu: *"Đồng ý, đều phải có cơ chế chống trùng, truy ngược lại khung của Oracle xem nên làm kiểu gì"*
2. **Lần 4, câu 1:** *"Chúng ta chặn ghi trùng bằng giải pháp kỹ thuật, chứ không phải đi vá thế này. Tìm trong Cloudflare và/hoặc Oracle xem họ có cách nào chống ghi trùng dữ liệu."*
3. **Lần 5:** *"1- Vé là dữ liệu kỹ thuật nhưng cũng không dọn sau 30 ngày, vì có thể sau này cần dùng lịch sử của quá khứ để đánh giá tỷ lệ thành công, huỷ, hoanf của đơn. Tôi đề xuất vẫn giữ với thời gian lâu hơn, tạm thời là 365 ngày (cụ thể hoá bằng lựa chọn trong tài khoản Toàn quyền). 2- Theo đề xuất. 3- ok ."*
   - Câu 1 trả lời **V1** (giữ vé bao lâu): **365 ngày, Toàn quyền chọn được**. Đặc tả khuyến nghị dọn sau 30 ngày; chủ không chọn.
   - Câu 2 trả lời **V2** (gửi lại thì trả gì): **R2**, theo khuyến nghị của đặc tả §3.4.
   - Câu 3 trả lời **V3** (bắt buộc ngay hay từ từ): **từ từ**. Đây cũng là câu **CT2** của phiếu cũ (đặc tả §7, bảng đối chiếu).

## Bối cảnh
- **Lỗi đã chạy thật** trên Nền tảng tạm, đêm 1→2/10 (F-02; báo cáo thử nghiệp vụ, gốc G2, tình huống 11, 12, 13, HD10, KT03, KT04). Mất sóng sau khi máy chủ đã lưu, rồi gửi lại, thì sinh ra:
  - 2 đơn và 2 hồ sơ khách;
  - 2 lần thu;
  - 2 lần hoàn;
  - 2 lần nộp (sổ âm).
- **Cloudflare không có công tắc chống ghi trùng** cho Worker + D1 (đặc tả §1). Có hai viên gạch dùng được: lô D1 nguyên tử (`batch()` "tất cả hoặc không") và khoá `UNIQUE`/khoá chính.
- **Chuẩn ngành và Oracle dùng chung một khuôn** (đặc tả §2): mỗi lần bấm mang một vé do máy khách sinh. Các nơi đã đọc:
  - IETF `Idempotency-Key`: bản nháp -07, **đã hết hạn**, không phải tiêu chuẩn;
  - Stripe;
  - OCI `opc-retry-token`;
  - AWS Powertools.
- **Kho đang có ba cơ chế riêng:**
  - Góp ý `clientRequestId`;
  - Thông báo `clientRequestId`;
  - Vận chuyển `requestId` + `UNIQUE` trong lô.

  Mỗi màn tự vá một kiểu; đây chính là cách chủ không muốn.
- **Về số liệu lịch sử** (lý do chủ nêu cho V1):
  - Tỷ lệ thành công, huỷ, hoàn **của đơn** nằm trong dữ liệu đơn và sổ tiền. Các bảng đó không xoá cứng, nên số liệu này không phụ thuộc bảng vé.
  - Bảng vé bổ sung số liệu ở mức **lệnh**: mỗi loại lệnh có bao nhiêu lần thành công, bị từ chối (theo mã lỗi), lỗi máy chủ, và bị gửi lặp (A-1).
  - Bản này **không có màn xem** số liệu đó. Muốn có màn báo cáo thì cần ADR và ô quyền riêng.

## Quyết định
1. **Một lớp cho mọi lệnh ghi có đăng nhập.**
   - Đếm lại 2026-10-02: **133** route ghi ở 13 module (`grep -h -o -E 'route\("(POST|PUT|PATCH|DELETE)"' src/modules/*/index.ts | wc -l`).
   - 5 route công khai (đều ở `auth`) tự miễn, vì không có tài khoản để làm phạm vi vé. Còn **128** route ở **12** module tự động đi qua lớp này.
   - Miễn thêm route nào phải ghi vào **tệp miễn** (đặc tả §5.2 mục 6), có lý do, chủ duyệt. Mục miễn cho route không tồn tại làm bài kiểm đỏ (H2).
2. **Vé đi cùng lô** (đặc tả §3.1, §3.7).
   - Bảng `lg_lan_gui` theo lược đồ đặc tả §3.7, **chỉnh cho khớp ADR-0003 điều 6** (cột kiểm toán WHO trên mọi bảng mới, ép bởi `src/architecture.test.ts:329-351`):
     - giữ `staff_id`, `khoa`, `van_tay`, `duong`, `ma_tra`, `ma_loi`, `ket_qua`; `PRIMARY KEY (staff_id, khoa)`, `WITHOUT ROWID`;
     - `ghi_luc` → **`created_at`** (lúc ghi vé, trong lô nghiệp vụ); `xong_luc` → **`updated_at`** (lúc cập nhật kết quả; ban đầu bằng `created_at`);
     - thêm **`created_by`**, **`updated_by`** (`TEXT NULL`, không khoá ngoại; giá trị là `staff_id`);
     - "chưa có kết quả" ⇔ `ma_tra IS NULL`;
     - **một chỉ mục** trên `created_at` để đường dọn (đ8) không quét cả bảng.

     Người kiểm độc lập đã thử lược đồ §3.7 nguyên văn trên bản sao: bài kiểm kiến trúc **đỏ** 4 lỗi cột WHO. Chọn thêm cột theo luật đã duyệt, **không** xin ngoại lệ cho ADR-0003.
   - Câu chèn vé được **nối vào cuối lô ghi đầu tiên** của lệnh. Vì vậy: **có dòng vé ⇔ lô ghi của lệnh đã thành công.**
   - Module mới `lan-gui` (module **nghiêm**, `defineSql`):
     - cấp câu lệnh chưa chạy để nối vào lô của module khác (Hiến chương 5.3);
     - router không import module; gốc lắp ráp tiêm `opts.injected.lanGui`. Thiếu phần tiêm thì router **từ chối** lệnh ghi, không lặng lẽ tắt lớp.
3. **Máy chủ: router làm thay mọi route** (đặc tả §3.3, bước 1–8).
   - Chèn vào `createApp` (`src/shared/router.ts:271`): **sau** khi biết ai đăng nhập, **sau mọi cổng `access`** (`:297-310`) và cổng bảo trì, **trước** handler. Chỉ áp cho `WRITE_METHODS` (`:194`).
   - **Hai lớp** (Hiến chương 5.1): tra trước ở mã, cộng khoá chính trong cùng lô.
   - Cùng vé, **khác nội dung** → **422** `ma_lan_gui_khac_noi_dung`.
   - Cùng vé, **đang xử lý** → **409** `dang_xu_ly`.
   - Cùng vé, **đã xong** → phát lại theo đ6, kèm header `Idempotent-Replayed: true`.
   - **Bộ bọc cơ sở dữ liệu theo từng yêu cầu** xử lý bảy bẫy ở đặc tả §3.5:
     - gỡ bọc trước khi gọi D1 thật;
     - vé ở cuối lô;
     - `.run()` lẻ và `RETURNING`;
     - chỉ lô ghi đầu tiên mang vé;
     - lỗi đụng vé bị handler nuốt thì router không tin phản hồi của handler;
     - hàm tiêm nhận `env` đã bọc;
     - ranh giới module.
   - Route **ghi nhiều lần trong một lệnh** được đo ở giai đoạn 1 (H5) và ghi thành **nợ có tên** (Hiến chương 1.2).
   - **Phạm vi vé là tài khoản**, không phải phiên. Vé **không** bị xoá khi đăng xuất hay bị đá phiên (ADR-0074/0075), để người đăng nhập lại rồi bấm lại vẫn trúng vé cũ (đặc tả §3.2 mục 7).
4. **Vân tay nội dung** = HMAC-SHA-256 (khoá bí mật của Worker; phương thức + đường dẫn thật + thân).
   - Không dùng mã băm trơn, vì thân có PIN hay số giấy tờ thì mã băm trơn dò ngược được.
   - **Khoá do chủ đặt bằng `wrangler secret put`** (việc của chủ, CLAUDE.md §8). `.dev.vars.example` và khung thử có giá trị giả cho khoá này.
   - Thiếu khoá thì `checkConfig` báo cấu hình sai, và router trả 500 cho **mọi** API (`src/shared/router.ts:287-291`). Vì vậy **khoá phải có trước lần triển khai mang lớp này**.
   - **Hàng rào cho bước này:** dựa vào kỷ luật (thứ tự trong runbook), **cho tới khi** `npm run trien-khai` có cổng chỉ-đọc kiểm tên khoá đã đặt trước khi triển khai. Cổng đó thuộc bản mở rộng.
     - Cổng dùng lệnh `wrangler secret list` (chỉ đọc). Hook cấm AI chạy `wrangler secret …`, nên AI quan sát cổng chặn thật bằng **hàm giả** thay lệnh wrangler trong bài kiểm của `scripts/release-lib.mjs`; lần chạy thật đầu tiên do chủ chạy.
5. **Máy khách:** `api()` ở `web/api.ts:76` tự gắn vé theo quy tắc đặc tả §3.2. Không màn nào phải tự làm gì.
   - Mở vé trước khi gửi.
   - **Đóng vé** khi có 2xx, khi có 4xx (trừ `409 dang_xu_ly`), và khi nhận "đã ghi".
   - **Giữ vé** khi mất mạng, hết 45 giây, hay gặp 5xx.
   - Nơi giữ vé: `localStorage` `lg:<staffId>`, hạn 24 giờ, tối đa ~50 mục; mỗi mục chỉ chứa mã băm.
   - Route có **thân chứa bí mật** (đổi/đặt lại PIN, giấy tờ của người) chỉ giữ vé trong bộ nhớ của trang. Danh sách route này nằm ở **một** tệp thuần `src/shared/`. Bài kiểm chỉ ép **mục trong danh sách là route có thật**. Việc thêm route mới vào danh sách **dựa vào kỷ luật**, cùng khuôn `src/giay-to-khong-lo-so.test.ts` cho route giấy tờ.
   - **Vòng đời vé** (mở, đóng, giữ, dùng lại) là **mô-đun thuần** ở `src/shared/`, `web/api.ts` chỉ gọi nó. Nhờ vậy rủi ro "nuốt lần ghi thật thứ hai" có bài đơn vị trong `npm test` (H4).
6. **V2 = R2: gửi lại thì trả "đã ghi" kèm địa chỉ kết quả** (lời chủ 5, câu 2).
   - **Không lưu thân phản hồi**, nên không chép SĐT, tên hay số giấy tờ vào bảng kỹ thuật.
   - **Hợp đồng phát lại** (chi tiết kỹ thuật của R2, AI soạn theo đặc tả §3.2–§3.4; chủ duyệt cùng văn bản):
     - **Lần đầu thành công**, hoặc lần đầu đã ghi vé nhưng không rõ kết quả (`ma_tra = 500`, hoặc chưa có kết quả sau 10 giây — đặc tả §3.3 bước 3d, 8):
       - mã **200**;
       - thân `{ "da_ghi_truoc_do": true, "ket_qua": "<đường dẫn>" | null }` (`null` khi không có địa chỉ hoặc không rõ kết quả);
       - header `Idempotent-Replayed: true`.

       `api()` bắt phản hồi này **trước** khi trả cho màn gọi: hiện "Lần bấm trước đã được ghi", rồi `location.replace(ket_qua)`, hoặc tải lại trang khi `ket_qua` là `null`. Màn gọi không bao giờ nhận thân này, nên các màn đang đọc `data.order…` không phải sửa.
     - **Lần đầu bị từ chối mà vẫn ghi vé:** đúng mã HTTP và mã lỗi máy của lần đầu. Thân theo hình lỗi chung `{ error: { code: <ma_loi>, message: "Lần gửi trước đã bị từ chối, tải lại để xem" } }` (`src/shared/http.ts` `error()`), kèm header `Idempotent-Replayed: true`.
   - Luật **địa chỉ kết quả**: xem **A-10** (AI chọn một trong hai cách đặc tả §3.4 để ngỏ). Route nào chưa có địa chỉ thì `ket_qua` là `null` và phát lại chỉ tải lại trang.
   - **Hệ quả của R2 đã biết, ghi một lần:**
     - Thân phản hồi chứa PIN ở ba chỗ: tạo tài khoản (`src/modules/accounts/index.ts:426, 456`) và đặt lại PIN (`:675`). Gửi lặp những lệnh này **không hiện lại PIN**.
     - Cách xử lý: bấm "Đặt lại PIN" lần nữa; đó là ý định mới, vé mới.
     - Người tạo là **Nhân sự** thì không tự đặt lại PIN được: route `reset-pin` giữ cổng `admin` và ô `account.access.manage` (`src/shared/permissions.ts:129`), HR là `none`. Khi đó Quản trị (tài khoản thường, ADR-0042) hoặc Toàn quyền (tài khoản có quyền tiền, ADR-0090) đặt lại. ADR-0093 (PIN tạm) sẽ thay đổi chỗ này.
     - Gửi lặp "Lập đơn" mở trang đơn đã tạo.
7. **V3 = từ từ** (lời chủ 5, câu 3; cũng là câu CT2).
   - **Giai đoạn 1:** có vé thì áp. Thiếu vé thì **cho qua và đếm**: ghi log `thieu_ma_lan_gui` kèm mẫu route, không kèm dữ liệu cá nhân.
   - **Giai đoạn 2** (bản siết, lần phát hành riêng, chủ ra lệnh): thiếu vé → **400**, câu báo "Nền tảng cần tải lại để dùng bản mới". Chỉ bật khi đủ hai điều kiện:
     - (a) cột "Đăng nhập gần nhất" cho thấy mọi người đã đăng nhập bằng bản mới;
     - (b) số đếm `thieu_ma_lan_gui` bằng 0 trong **N** ngày liên tiếp (A-6).
   - **Trước giai đoạn 2:** `tests/e2e/lib.mjs:42` tự gắn vé, và 8 tệp e2e đang gọi `fetch` thẳng được rà, để bộ e2e không đỏ khi siết.
8. **V1 = thời hạn giữ vé do Toàn quyền chọn, mặc định 365 ngày** (lời chủ 5, câu 1).
   - **(a) Nơi lưu:** bảng chính sách **riêng** của module `lan-gui`.
     - Theo khuôn `vc_expiry_policy` (`migrations/0033_van_chuyen_xe.sql:96-110`) và `vc_dispatch_policy` (`migrations/0041_chinh_sach_dieu_phoi.sql:14-36`):
       - dòng có **ngày hiệu lực** (Hiến chương 5.2): dòng hiệu lực là dòng có `valid_from_at` mới nhất ≤ bây giờ;
       - **chỉ-thêm**: trigger cấm `UPDATE` và `DELETE`;
       - `valid_from_at UNIQUE`;
       - có cột WHO.
     - Gieo một dòng **365 ngày**.
     - Đổi thời hạn = chèn dòng mới, máy chủ đặt `valid_from_at` = lúc ghi. Cùng lô ghi một dòng nhật ký "đổi thời hạn giữ vé" (cũ → mới), không có dữ liệu cá nhân.
   - **(b) Cổng quyền:** route đọc/ghi thời hạn hỏi `can()` trong handler. Giao diện ẩn/hiện màn và ô Trang chủ bằng **đúng ô đó**, theo luật "giao diện hỏi bảng quyền" (`web/CLAUDE.md:18`, ép bởi `src/giao-dien-hoi-bang-quyen.test.ts`; ADR-0072 mục 4a).
     - **Quản trị nhận 403.**
     - Ô dùng: xem A-2.
   - **(c) Sàn cứng** (có hiệu lực, không phụ thuộc A-3):
     - thời hạn **không bao giờ dưới một mức sàn**. Mức sàn **lớn hơn 30 ngày**, vì chủ đã nói "không dọn sau 30 ngày". Số cụ thể: A-3;
     - sàn chặn ở **ba nơi**:
       - `CHECK` dạng khoảng trong bảng chính sách (khuôn `warn_days BETWEEN` ở `0033:98`);
       - phép tính mốc cắt ở máy chủ;
       - chính câu `DELETE`: chỉ xoá `created_at < MIN(mốc cắt, bây giờ − sàn)`.
     - Thiếu dòng chính sách hay đọc lỗi thì Cron **không xoá gì**.
   - **(d) Rút ngắn thời hạn là mất dữ liệu không đảo được:**
     - giao diện **bắt xác nhận**, câu nói rõ "vé cũ hơn N ngày sẽ bị xoá dần, không lấy lại được";
     - **không xoá ngay**: mốc cắt mới chỉ áp sau một **thời gian chờ** (số ngày: A-4). Trong thời gian chờ, đổi ý thì không mất gì;
     - kéo dài thời hạn có hiệu lực ngay.
   - **(e) Ngoại lệ có tên cho luật "không xoá cứng"** (R-N1-9, ADR-0003 điều 8; `src/architecture.test.ts:402-404`). Đặt cạnh `XOA_CUNG_NHAP` (`:153`), cùng khuôn bài "danh sách chỉ được co lại" (`:791-798`).
     - Chỉ áp cho bảng `lg_lan_gui`, **chỉ** một câu xoá do module `lan-gui` khai. Điều kiện thời hạn và sàn nằm **trong câu**.
     - Chỉ gọi từ hàm `scheduled` (Cron sẵn có `*/15 * * * *`, `wrangler.jsonc:10`; `src/index.ts:176`), trong một `waitUntil` **riêng**, tách khỏi `runScheduledSync` (`:176-177`), để lỗi đồng bộ Sheet không chặn lượt dọn. **Không route nào xoá vé**; bài tĩnh H10 ép hàm xoá chỉ được tham chiếu từ đường `scheduled`.
     - Xoá **theo lô có giới hạn**, dùng chỉ mục `created_at` (lịch và giới hạn: A-5).
       - SQLite không nhận `DELETE … LIMIT`, và bảng `WITHOUT ROWID` không có `rowid`. Câu xoá có dạng `DELETE FROM lg_lan_gui WHERE (staff_id, khoa) IN (SELECT staff_id, khoa FROM lg_lan_gui WHERE created_at < :moc ORDER BY created_at LIMIT :n)`.
       - `:moc` = `MIN(mốc cắt, bây giờ − sàn)`, tính trong câu con. Người kiểm đã chạy dạng này trên SQLite cục bộ (5.000 dòng trên 500.000 dòng, ~111 ms); **trên D1 chưa kiểm**.
     - **Nhật ký:** mỗi lô có xoá ghi **một** dòng nhật ký **trong cùng lô** với câu xoá (số dòng đã xoá, mốc cắt). Cách lấy số dòng do kế hoạch chọn (ví dụ `changes()`, chưa kiểm trên D1). Với lịch A-5, trạng thái ổn định chỉ ~1–2 dòng nhật ký mỗi ngày.
     - Bảng chính sách thời hạn **không** có ngoại lệ.
     - Đây là **nới** một hàng rào đã duyệt (Hiến pháp Điều 9.4), nên chủ duyệt cùng ADR này.
     - Vé là dữ liệu **kỹ thuật**. Hiến chương 5.5 nói về "dữ liệu nghiệp vụ", nhưng R-N1-9 áp cho mọi bảng mới. Vì vậy cần ghi lệch hẹp này ở bảng thi hành dòng 5.5 (chủ sửa Phần I, Điều 6.4).
   - **(f) Dung lượng** (ước tính, **chưa đo**):
     - ~0,45–0,55 KB mỗi vé, đã tính bốn cột WHO **và chỉ mục `created_at`** (chỉ mục của bảng `WITHOUT ROWID` chứa cả khoá chính). Số này người kiểm độc lập đo trên SQLite cục bộ với 500.000 dòng, chưa đo trên D1.
     - 3.000–10.000 lệnh ghi mỗi ngày.
     - Dọn ở 365 ngày ⇒ bảng ổn định quanh **~0,5–2,0 GB**, tức ~5–20% trần 10 GB của D1.
     - **Cách đo:**
       - trước khi chốt: đếm `audit_log` mỗi ngày bằng lệnh chỉ đọc, do chủ chạy;
       - sau 30 ngày chạy thật: đếm dòng `lg_lan_gui`.
9. **Lớp nghiệp vụ không thuộc ADR này.** Hai người nhập cùng một việc, hoặc sửa nội dung rồi gửi lại, sinh **hai vé khác nhau**; lớp vé không bắt được.
   - **CT3, CT4** (cảnh báo lần thu tiền mặt giống nhau; người đang ghi bỏ qua được với lý do bắt buộc): **chủ đã chọn theo đề xuất** (chat 2026-10-02). Ghi ở **ADR-0092 đ6a** (nháp lượt 2b), theo bảng luật trùng dùng chung (đặc tả §4). ADR này chỉ trỏ tới.
   - Mã giao dịch ngân hàng: ADR-0092 đ6.
   - Cảnh báo đơn trùng: nhánh `canh-bao-don-trung`, làm sau theo lời chủ.
10. **Ba cơ chế cũ giữ nguyên:**
    - Góp ý `src/modules/feedback/index.ts:80-104`;
    - Thông báo `src/modules/thongbao/index.ts:172-199`;
    - Vận chuyển `src/modules/van-chuyen/dieu-phoi-route.ts:85-103`.

    Chúng là lớp thứ hai vô hại; gộp về lớp chung là việc riêng về sau.
    - **Lệch phải sửa ở bản mở rộng:** `web/dieu-phoi-ui.ts:32` sinh `requestId` mới sau 5xx. `requestId` nằm trong thân nên vân tay đổi, `api()` cấp vé mới, và quy tắc "giữ vé khi 5xx" **mất tác dụng** với Vận chuyển. Bản mở rộng sửa dòng này để giữ `requestId` khi 5xx.

## Đề xuất của AI — áp theo khuyến nghị
AI thêm khi soạn, không có trong lời chủ hay trong khuyến nghị đặc tả mà chủ đã chọn. Các điểm này áp theo khuyến nghị (lời chủ 2026-10-02: *"đừng hỏi tôi những câu hỏi mà tôi nên đồng ý nữa,"*); chủ bác điểm nào thì sửa điểm đó.
- **A-1. Đếm số lần gửi lặp:** thêm cột `so_lan_lap INTEGER NOT NULL DEFAULT 0` vào `lg_lan_gui`, tăng mỗi lần phát lại.
  - **Lý do:** chủ muốn dùng lịch sử để đánh giá. Không có cột này thì bảng vé **không** biết một lệnh bị gửi lặp bao nhiêu lần, vì lần phát lại không sinh dòng mới.
  - **Cái giá:** mỗi lần phát lại thêm một câu `UPDATE`, chạy nền.
  - **Ngoài lược đồ** đặc tả §3.7.
- **A-2. Ô quyền:** dùng lại **`settings.ops`** (chỉ SUPER_ADMIN, `src/shared/permissions.ts:141`).
  - Đây là ô "cài đặt vận hành" đang canh bảo trì (`src/shared/contracts.ts:142`), chính sách điều phối và ngưỡng giấy tờ (`src/shared/trang-chu-o.ts:60`; `permissions.ts:163`), cài đặt trợ lý (`contracts.ts:1674`; `trang-chu-o.ts:53`).
  - Cách khác: một ô riêng, như ADR-0085 làm với `auth.session.policy` (`permissions.ts:189`). Cách này thêm một dòng vào bản đồ quyền và các bài ghim.
- **A-3. Số sàn và các lựa chọn thời hạn:**
  - **Sàn = 90 ngày.**
  - Lựa chọn trên màn: **90 / 180 / 365 (mặc định) / 730 ngày / Không dọn**. "Không dọn" lưu là `NULL`.
  - `CHECK` của cơ sở dữ liệu là **khoảng** (sàn ≤ số ngày, hoặc `NULL`); danh sách năm lựa chọn kiểm ở máy chủ, để thêm lựa chọn sau không phải đổi lược đồ (`docs/ARCHITECTURE.md` Phần II, "Luật dữ liệu").
  - Sàn 90 ngày vượt xa tuổi tối đa 24 giờ của vé ở máy người dùng.
- **A-4. Thời gian chờ khi rút ngắn: 7 ngày.**
  - Cách tính: Cron dùng thời hạn **dài nhất** trong các dòng chính sách đã có hiệu lực ở bất kỳ lúc nào trong **7 ngày** gần nhất. "Không dọn" thắng mọi con số.
- **A-5. Lịch dọn:** **một lượt mỗi ngày**, ở lượt Cron rơi vào khung nửa mở **[02:00, 02:15) giờ Việt Nam** (19:00 UTC).
  - Trong lượt, lặp các lô **≤ 5.000 dòng** tới khi hết vé quá hạn hoặc chạm trần **50 lô** (250.000 dòng).
  - Trạng thái ổn định cần 1–2 lô mỗi ngày (3.000–10.000 vé hết hạn), nên chỉ ~1–2 dòng nhật ký mỗi ngày.
  - Sau một lần rút ngắn lớn (ví dụ từ 365 xuống 90 ngày, ~2,75 triệu vé ở cận trên), khối tồn đọng dọn xong trong khoảng **12 ngày** (2,75 triệu ÷ (250.000 − 10.000)).
  - Lượt bị Worker ngắt giữa chừng thì an toàn: mỗi lô tự đủ (xoá + nhật ký cùng lô), ngày sau làm tiếp. Giới hạn thời gian chạy của Cron với 50 lô: **chưa đo**.
- **A-6. N của bản siết:** **7 ngày** liên tiếp không có lệnh thiếu vé.
- **A-7. Tên và nhật ký:**
  - bảng chính sách: `lg_chinh_sach_giu`;
  - ngoại lệ: `XOA_CUNG_VE_HET_HAN = ["lan-gui.ve_het_han_delete"]`;
  - nhật ký: `lan_gui_thoi_han_changed`, `lan_gui_ve_da_don`. Hai mã này khai ở `src/shared/audit-actions.ts` và thuộc `SILENT_AUDIT_ACTIONS` (`:164`), vì đây là việc kỹ thuật của Toàn quyền (khuôn ADR-0038). Cron ghi với `staff_id = NULL` (hệ thống).
- **A-8. Khái niệm lõi mới cho Hiến chương** (Điều 3, sau K16; chủ sửa Phần I, Điều 6.4). Câu đề xuất:
  > **K17 — Lệnh ghi chạy đúng một lần:** mỗi lệnh ghi có đăng nhập mang một vé do máy khách sinh; vé được ghi trong cùng lô với dữ liệu; gửi lại cùng vé không ghi lần hai. Trùng "ngoài đời" (hai người, hai nội dung) là việc của lớp nghiệp vụ.

  Kèm đổi câu dẫn của Điều 3 từ "16 khái niệm lõi" thành "17 khái niệm lõi".
- **A-9. Khi nào đóng F-02:** khi **bản mở rộng** lên production **và** T12 đạt.
  - Máy còn bản cũ (chưa gửi vé) được theo dõi bằng số đếm `thieu_ma_lan_gui`.
  - Cách khác: chỉ đóng sau bản siết. Cách này an toàn hơn, nhưng dễ trễ hạn 15/10.
- **A-10. Luật địa chỉ kết quả** (đặc tả §3.4 để ngỏ hai cách; AI chọn cách (i)). Hợp đồng phát lại nằm ở đ6:
  - **Mọi route trả 201 gửi header `Location`**, trỏ trang kết quả bằng đường dẫn nội bộ **chỉ chứa id**. Lệnh ghi lên một đơn (ví dụ lần thu) trỏ **trang đơn**.
    - Dùng tham số `headers` sẵn có của `json()` (`src/shared/http.ts:6`). Router lưu `Location` vào `ket_qua`.
    - **Một bài kiểm chung** (H7): mọi route trả 201 trong khung thử phải có `Location` hợp lệ.
    - Kho có **ít nhất 28** chỗ `, 201)` ở 8 module, cộng các dạng khác (ví dụ `thongbao/index.ts:198`, `parties/index.ts:712, 748`, `van-chuyen/index.ts:871`). Bài chạy thật bắt nốt.
    - **Route tạo mà trả 200** được lập danh sách bằng tay ở bước thi công. Mỗi route trong đó thêm `Location`, hoặc ghi vào danh sách "phát lại = tải lại trang", có lý do.
    - Lý do không chọn cách (ii) "bảng tra chung mẫu route → trang": cách đó buộc router đọc id trong **thân** phản hồi, mà R2 đã chọn không đọc nội dung.
- **A-11. Tách màn thời hạn và Cron dọn sang bản sau:** bảng vé bắt đầu rỗng, sàn 90 ngày, nên ít nhất 90 ngày đầu chưa có gì để xoá.
  - Bản mở rộng chỉ cần bảng chính sách (gieo 365) và lớp vé.
  - Màn "Thời hạn giữ vé" và Cron dọn có thể ra ở một bản sau, **trước ngày thứ 90** kể từ bản mở rộng.
  - Việc này giảm khối lượng trước hạn F-02 (15/10).

## Hiến chương áp dụng
- **1.2** (một lô ghi nguyên khối): route ghi nhiều lần thành nợ có tên (đ3, H5).
- **5.1** (hai lớp chặn): tra trước ở mã + khoá chính trong lô (đ3); sàn thời hạn ở `CHECK` + máy chủ + câu xoá (đ8c).
- **5.2** (hiệu lực theo thời gian): bảng chính sách thời hạn (đ8a).
- **5.3** (ranh giới module): module `lan-gui` cấp câu chưa chạy; router nhận qua phần tiêm (đ2).
- **5.5** (không xoá cứng dữ liệu nghiệp vụ): **lệch hẹp có chủ ý** cho vé kỹ thuật, kèm ngoại lệ có tên (đ8e). Chủ sửa bảng thi hành.
- **5.12** (dữ liệu cá nhân): R2 không lưu thân phản hồi; vân tay HMAC; route có bí mật không ghi `localStorage` (đ4–đ6).
- **5.16** (hộp thư đi): việc bên ngoài chạy sau lô chỉ chạy ở lần gửi thắng (đặc tả §3.8).
- **Điều 3:** K17 (A-8).
- **ADR-0003 điều 6** (cột WHO): áp đủ, không ngoại lệ (đ2).

## Trang ghép (CLAUDE.md §9)
Bảng `lg_lan_gui` nhận vé của **mọi** module, nên được coi là bảng dùng chung và cần trang ghép.
1. **Bảng chứa gì:**
   - **`lg_lan_gui`:** một loại thực thể, là **vé kỹ thuật** của lệnh ghi có đăng nhập. Vé đến từ mọi vai (kể cả Đối tác và tài xế) và 12 module.
     - Có: mẫu route, vân tay HMAC, mã trả, mã lỗi máy, đường dẫn kết quả chỉ chứa id, cột WHO.
     - **Không** có nội dung nghiệp vụ, **không** có dữ liệu cá nhân.
   - **Bảng chính sách thời hạn:** một loại, là thời hạn giữ vé.
2. **Dòng quyền chạm:**
   - **Không ô nào** mở quyền đọc `lg_lan_gui` cho người dùng. Chỉ router đọc, và chỉ đọc vé của **chính tài khoản đang gửi** (phạm vi `staff_id`).
   - Ô của từng route nghiệp vụ **không đổi**: handler vẫn hỏi `can()` như cũ.
   - Phát lại **không** chạy handler, nên không ghi gì mới vào dữ liệu nghiệp vụ (trừ bộ đếm A-1 trên chính dòng vé). Nếu người gửi đã mất quyền giữa hai lần gửi, họ chỉ nhận lại "đã ghi" và một đường dẫn; trang đích vẫn tự kiểm quyền.
   - Ô cổng thời hạn (A-2) chỉ chạm bảng chính sách.
3. **Cổng nào canh cửa nào:**
   - router canh mọi route ghi có đăng nhập; ngoại lệ là tệp miễn (chủ duyệt);
   - Cron canh đường xoá vé (ngoại lệ có tên, sàn cứng);
   - route thời hạn canh bảng chính sách (ô A-2);
   - **giao diện:** màn "Thời hạn giữ vé" và ô Trang chủ của nó ẩn/hiện theo `can(w, ô A-2)`. `web/api.ts` không ẩn/hiện gì.
   - **Không có chỗ ẩn/hiện nào đổi nghĩa.**

## Thay câu nào (ghi bằng dòng trỏ ở văn bản cũ, không sửa thân)
| Văn bản | Câu cũ | Thay bằng |
|---|---|---|
| Đặc tả `2026-09-22-chong-gui-trung.md` | phần kỹ thuật: cột `orders.client_request_id`; §6 câu 3 "áp ngay" | lớp chung (đ1–đ6); phát hành từ từ (đ7). Phần hành vi mong muốn (gửi lại được trả đơn cũ) giữ nguyên |
| Tệp Oracle 2026-10-02 §3.3 mục 3 | "không dựng bảng nhật ký yêu cầu riêng…; mã giữ vĩnh viễn trên từng bảng" | một bảng vé chung, thời hạn do Toàn quyền chọn (đ2, đ8) |
| Tệp Oracle 2026-10-02 §3.3 (mục 1, 4–6), §3.4 mục 3 và 6 | mã cho từng lệnh; giữ mã ở `sessionStorage`; "xoá mã đang lưu tạm khi đăng xuất" | vé chung ở `api()`; giữ ở `localStorage` (trừ route có bí mật); vé theo tài khoản, **không** xoá khi đăng xuất hay bị đá phiên (đ3, đ5) |
| Câu A1, CT1, CT2 (tệp Oracle §3.5; phiếu trả lời) | gắn mã cho từng lệnh tiền; 409 khi khác nội dung; thứ tự phát hành | mọi lệnh ghi đều có vé; **422** khác nội dung; từ từ (đ7) |
| ADR-0003 điều 8 / R-N1-9; `CLAUDE.md` §7 ("ngoại lệ có tên duy nhất: … `XOA_CUNG_NHAP`") | một ngoại lệ | thêm ngoại lệ thứ hai (đ8e). Sửa `CLAUDE.md` do chủ duyệt (Hiến pháp N9) |
| Hiến chương: Điều 3 (bảng lõi); bảng thi hành dòng 5.5 | 16 khái niệm; lệch hẹp chỉ có đơn nháp | + K17 (A-8); + lệch hẹp "vé kỹ thuật dọn theo thời hạn" (đ8e) |
| `docs/quyen-hoan.json` F-02, trường `ke_hoach` | trỏ đặc tả đề xuất | trỏ ADR-0094 (đã làm 2/10) |

## Rủi ro còn lại
- **Lớp vé không bắt được:**
  - sửa nội dung sau một lần mất mạng rồi gửi lại;
  - hai người hay hai máy nhập cùng một việc.

  Cả hai là việc của lớp nghiệp vụ (đ9).
- **Việc bên ngoài chạy *trước* lô** (OpenAI ở trợ lý; đọc Google Sheet khi "Đồng bộ ngay"): hai lần gửi **đồng thời** có thể gọi ra ngoài hai lần, nhưng dữ liệu chỉ ghi một lần. Chấp nhận (đặc tả §3.8).
- **Worker bị ngắt giữa chừng:** vé và dữ liệu cùng lô, nên không có trạng thái nửa vời. Cùng lắm mất `ket_qua`, khi đó lần sau nhận "đã ghi, tải lại để xem".
- **Route ghi nhiều lần trong một lệnh:** vé có thể bị lần ghi phụ ăn mất, dẫn tới báo nhầm "đã ghi". Đo bằng H5 và trả nợ từng route trước bản siết.
- **Máy còn bản cũ:** chưa được bảo vệ ở giai đoạn 1 (đ7). Theo dõi bằng số đếm.
- **Thiếu khoá HMAC lúc triển khai:** mọi API trả 500 (đ4). Dựa vào kỷ luật cho tới khi có cổng kiểm trong `npm run trien-khai`.
- **Màn nhét trường đổi theo từng lần gửi vào thân** (giờ máy, mã sinh lại): lần gửi lại mang vé mới và lặng lẽ mất chống trùng (đặc tả §3.2). Đã biết một chỗ (đ10); chỗ khác dựa vào bài H1 "gửi lại từ màn thật".

## Hàng rào (mỗi hàng rào một dòng ở `docs/SO-HANG-RAO.md`, có ngày quan sát chặn thật: sửa cố ý → đỏ → hoàn nguyên)
| # | Chặn cái gì | Cơ chế |
|---|---|---|
| H1 | Cùng vé gửi hai lần ⇒ 1 dòng nghiệp vụ; khác thân ⇒ 422; đồng thời ⇒ 1 dòng; lỗi kiểm dữ liệu ⇒ không có vé; handler nuốt lỗi đụng vé ⇒ vẫn "đã ghi" | bài qua router thật trên SQLite thật (`tests/audit/harness.mjs`), trong `npm test` |
| H2 | Route ghi có đăng nhập không đi qua lớp; mục miễn cho route không tồn tại | bài phủ route đọc bảng route thật |
| H3 | `fetch(` với phương thức ghi trong `web/`, ngoài 2 chỗ công khai đã biết | bài tĩnh |
| H4 | Hai lần ghi thật giống hệt nhau, nối tiếp ⇒ vé đổi sau lần 1 thành công, nên **2** dòng (lớp không nuốt lần ghi thật) | bài đơn vị cho mô-đun vòng đời vé (đ5), trong `npm test`; cộng một ca e2e |
| H5 | Route ghi > 1 lần mỗi lệnh mà không có tên trong danh sách nợ | bộ bọc đếm, e2e đọc log |
| H6 | `DELETE` trên `lg_lan_gui` ngoài ngoại lệ có tên; ngoại lệ thừa | R-N1-9 + bài "chỉ được co lại" |
| H7 | Route trả 201 thiếu `Location` | bài chung (A-10) |
| H8 | Câu dọn xoá vé còn hạn hoặc dưới sàn; dọn quá giới hạn mỗi lượt; thiếu chính sách mà vẫn xoá | bài thuần cho câu dọn + khung thử Cron |
| H9 | Ghi thời hạn dưới sàn | `CHECK` + máy chủ (đ8c) |
| H10 | Hàm xoá vé được gọi từ nơi khác ngoài đường `scheduled` | bài tĩnh (đ8e) |

## Tiêu chí nghiệm thu (viết trước khi làm)
- **T1.** Tắt mạng sau khi bấm "Ghi lần thu", bật lại, bấm lại ⇒ đơn có **một** lần thu; màn báo "Lần bấm trước đã được ghi".
- **T2.** Bấm đúp "Lập đơn" ⇒ **một** đơn.
- **T3.** Lập đơn, mất phản hồi, iOS tắt Nền tảng, mở lại, gửi lại cùng nội dung ⇒ **một** đơn; mở trang đơn đã tạo. (Cần iPhone thật.)
- **T4.** Hai lần thu thật giống hệt nhau, nối tiếp, cả hai thành công ⇒ **hai** dòng.
- **T5.** Sửa số tiền sau khi mất mạng rồi gửi ⇒ lớp vé **không** chặn.
- **T6.** Đổi `access` của một route ghi đang có đăng nhập sang `public` mà **không** có dòng trong tệp miễn ⇒ H2 đỏ; thêm dòng miễn cho route không tồn tại ⇒ H2 đỏ.
- **T7.** Quản trị gọi route đổi thời hạn ⇒ **403**. Giao diện của Quản trị không có màn hay ô "Thời hạn giữ vé".
- **T8.** Toàn quyền rút từ 365 xuống mức sàn ⇒ trong thời gian chờ (A-4), Cron **không** xoá vé còn trong hạn cũ; hết thời gian chờ mới xoá.
- **T9.** Kéo dài từ mức sàn lên 365 ⇒ lượt Cron kế tiếp dùng 365.
- **T10.** Cron chỉ xoá vé có `created_at` trước mốc cắt **và** trước mốc sàn, **không** chạm vé còn hạn. Mỗi lô ≤ giới hạn, mỗi lượt ≤ trần số lô; mỗi lô có xoá ghi đúng một dòng nhật ký trong cùng lô. Thiếu dòng chính sách ⇒ không xoá gì. Đồng bộ Sheet lỗi ⇒ lượt dọn vẫn chạy.
- **T11.** Chọn "Không dọn" ⇒ Cron không xoá gì. Ghi số ngày dưới sàn ⇒ máy chủ từ chối, và chèn thẳng vào CSDL cũng bị `CHECK` chặn.
- **T12.** Kịch bản F-02 chạy lại đạt: 11, 12, 13, HD10, KT03, KT04.
  - Kịch bản phải **gắn cùng một vé** ở hai lần gửi. Bản gốc ở `~/Documents/danh-gia-ux/2026-10-01/kich-ban/` (ngoài kho) chưa gửi vé, nên phải sửa.
  - Phải có bản trong `tests/e2e/` (CLAUDE.md §7), để người kiểm độc lập chạy lại được.

## Thứ tự phát hành (mở rộng rồi thu hẹp)
0. **Việc của chủ, trước khi triển khai:** đặt khoá HMAC bằng `wrangler secret put` (đ4).
1. **Bản mở rộng** gồm:
   - migration bảng vé + bảng chính sách (gieo 365);
   - module `lan-gui`;
   - router ở chế độ "có vé thì áp, thiếu thì cho qua và đếm";
   - `web/api.ts` gửi vé, mô-đun vòng đời vé;
   - `Location` cho các route 201 (A-10);
   - sửa `web/dieu-phoi-ui.ts:32` (đ10);
   - cổng kiểm khoá trong `npm run trien-khai` (đ4);
   - màn "Thời hạn giữ vé" và Cron dọn **tách sang bản sau**, ra trước ngày thứ 90 kể từ bản mở rộng (A-11).
2. **Theo dõi:** đo H5, trả nợ các route ghi nhiều lần; đếm `thieu_ma_lan_gui`; cập nhật e2e (đ7).
3. **Bản siết:** thiếu vé ⇒ 400 (đ7). Phát hành riêng, chủ ra lệnh.

## Hệ quả
- Gửi lặp không còn ghi lần hai ở mọi lệnh có đăng nhập; không màn nào phải tự vá chống trùng.
- **Thêm:** 2 bảng, 1 module, 1 ngoại lệ xoá cứng, 1 bí mật, 1 màn cài đặt của Toàn quyền.
- **Chi phí D1** gần 0 đồng (ước tính ở đặc tả §3.6, chưa đo).
- **Migration:** lấy **số kế tiếp lúc thi công**. Hôm nay `main` đã có tới `0069_gd_setting.sql`. Trước khi đặt số, liệt kê migration của mọi nhánh/worktree chưa gộp (CLAUDE.md §10).
- **Tài liệu đi kèm:**
  - `docs/data-dictionary.json` + `npm run dict`;
  - `docs/SYSTEM-DESIGN.md` (một request đi qua lớp vé);
  - `docs/CHANGE-GUIDE.md`: công thức "thêm route ghi" (201 phải có `Location`; ghi một lô; thân chứa bí mật thì thêm vào danh sách giữ vé trong bộ nhớ trang; không nhét trường đổi theo từng lần gửi vào thân).
- **Thi công:** có người kiểm độc lập (việc lớn: dữ liệu, quyền, luật).

## Phiếu kiểm độc lập bản nháp (2026-10-02, chỉ đọc) — đã xử lý
| Mã | Phát hiện | Xử lý |
|---|---|---|
| C1 (chặn) | Lược đồ §3.7 nguyên văn thiếu cột WHO; thử trên bản sao: bài kiểm kiến trúc đỏ 4 lỗi | đ2: thêm cột theo ADR-0003 điều 6, không xin ngoại lệ |
| C2 (chặn) | Ghi CT3/CT4 "vẫn chờ chủ" là sai | đ9: chủ đã chọn, ADR-0092 đ6a |
| C3 (chặn) | Sàn và chờ khi rút ngắn chỉ nằm ở phần chờ chủ | đ8c, đ8d: sàn cứng và nguyên tắc chờ có hiệu lực; số ở A-3, A-4; ADR chỉ accepted khi có hai số đó |
| N1 | Người tạo là Nhân sự không đặt lại PIN được; thiếu `:675` | đ6 |
| N2 | 5.000 dòng mỗi ngày không theo kịp 10.000 vé | A-5: lặp nhiều lô trong lượt, trần 250.000 dòng mỗi ngày |
| N3 | Kịch bản F-02 không gửi vé, nằm ngoài kho | T12, đ7 |
| N4 | H4 chưa vào `npm test`; T6 chưa nói cái gì đỏ | đ5 (mô-đun thuần), H4, T6 |
| N5 | Cách (i) cho địa chỉ kết quả là AI chọn mà không gắn nhãn | A-10 |
| N6 | Chưa chốt hình phản hồi phát lại | A-10 |
| N7 | Thiếu khoá HMAC là sự cố toàn hệ thống, chỉ có runbook | đ4: "dựa vào kỷ luật" + cổng kiểm ở bản mở rộng |
| N8 | Thiếu mục "Hiến chương áp dụng" | đã thêm |
| G1–G12 | số module, "ít nhất 28", nguồn luật giao diện, số dòng khuôn, A-1 vs trang ghép, `requestId` Vận chuyển, mã nhật ký, dòng "Thay câu nào", câu số liệu lịch sử, tách màn thời hạn, vị trí sau cổng `access`, bài kiểm danh sách bí mật | đã sửa trong thân (G9 chuyển sang Bối cảnh; G10 thành A-11) |

**Vòng 2** (cùng người kiểm, chỉ đọc): xác nhận C1–C3 và N1–N8 đã sửa đúng. Người kiểm chạy lại phép thử phá với lược đồ mới: bài "ADR-0003: bảng mới" **xanh**. Bốn chỗ nên sửa mới và bảy gợi ý đã xử lý:

| Mã | Phát hiện | Xử lý |
|---|---|---|
| L1 | Dung lượng chưa tính chỉ mục (đo cục bộ 0,46–0,55 KB mỗi dòng) | đ8f: ~0,5–2,0 GB |
| L2 | Một dòng nhật ký mỗi lượt Cron ⇒ ~96 dòng mỗi ngày | A-5: một lượt mỗi ngày, nhật ký theo lô; ~1–2 dòng mỗi ngày |
| L3 | Hợp đồng phát lại nằm trong A-10 chưa có hiệu lực, mà đ5 dựa vào nó | đ6: chuyển hợp đồng vào phần có hiệu lực, thêm ca `ma_tra = 500`; A-10 chỉ còn luật địa chỉ |
| L4 | SQLite không nhận `DELETE … LIMIT` | đ8e: dạng câu xoá qua câu con |
| G-a…G-g | chữ "cờ" ở T6; nhãn lời chủ; §3.4 mục 3; phiếu về PIN của Nhân sự; quan sát cổng khoá; bài tĩnh nơi gọi hàm xoá; `waitUntil` riêng | đã sửa (T6, mục Lời chủ, Thay câu nào, phiếu, đ4, H10, đ8e) |
