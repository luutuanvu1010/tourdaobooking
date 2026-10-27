# Lộ trình Chặng 2–3: đề bài Claude Design, thứ tự, phụ thuộc, việc chạy song song

Hồ sơ có ngày: 27/10/2026 (`PROMPT.md` mục 6.5, sản phẩm số 5). Chỉ có hiệu lực **sau cổng duyệt 1** (chủ đọc `BAO-CAO.md`, trả lời tối đa ba quyết định). Mỗi đề bài Claude Design viết theo khuôn `PROMPT.md` mục 9, dùng đúng bộ "Island Booking System — Design System v2" đã duyệt ở cổng 2a.

## 0. Nguyên tắc xuyên suốt

- **Khung trước, màn sau.** Không vẽ lại từng màn rời (đó là cách đã tạo ra 64 tiền tố lớp — `SO-LECH-TU-MA.md` mục 11). Thứ tự: bộ v2 (token + thành phần) → khung chung → họ màn.
- **Thi công là việc lớn** (chạm giao diện tiền, nhiều trang, token dùng chung): mỗi đợt thi công cần (1) đặc tả ngắn ở `docs/superpowers/specs/`, (2) kế hoạch ở `docs/superpowers/plans/`, (3) **subagent kiểm độc lập chỉ đọc** sau khi thi công (`CLAUDE.md` §3), (4) chạy lại đúng kịch bản Chrome theo bảng "Sửa tệp nào thì chạy lại kịch bản nào" ở `web/CLAUDE.md` mục 4 **cộng** kịch bản quét của đợt này (`docs/evidence/2026-10-27-danh-gia-ux-tong-the/kich-ban/do-trang.mjs`, `do-toc-do.mjs`) để so số đo trước/sau, (5) nhật ký thay đổi (bước A.0 của `docs/HANDOFF-N1.md`).
- **Token vào mã theo expand–contract**: phát hành 1 thêm tên mới + giữ bí danh cũ; phát hành 2 bỏ bí danh. Nhóm tourdaovn không đổi giá trị.
- Mỗi cổng duyệt tối đa **3 quyết định** (`CLAUDE.md` §9 bước ghép).

## 1. Thứ tự các bước và cổng

| # | Bước | Ai làm | Đầu vào | Sản phẩm | Cổng | Phụ thuộc |
|---|---|---|---|---|---|---|
| 1 | Cổng 1: duyệt báo cáo Chặng 1 | chủ | `BAO-CAO.md` | 3 quyết định | **Cổng 1** | — |
| 2 | **7a** Dựng bộ v2 trên Claude từ loại Design System (`https://claude.ai/artifact/5M7UeXXcx16TP3vzVFNDzd`), tên "Island Booking System — Design System v2"; sự thật từ mã (quy trình `from-code.md` của loại: màu từ `:root`, Be Vietnam Pro ở `public/fonts/`, 37 biểu tượng `web/icons.ts`, logo), cấu trúc từ `HE-THONG-HOP-NHAT.md` mục 3, 5, 6, 7 | phiên Claude Code | đề cương đã duyệt | README thương hiệu tiếng Việt, `tokens.json` 3 tầng, mỗi thành phần một README + xem trước (React chỉ để xem, không vào Nền tảng) | **Cổng 2a** (chủ duyệt bằng mắt) | 1 |
| 3 | Đổi tên hai bộ cũ thêm "(cũ, không dùng để vẽ)": `https://claude.ai/artifact/NEJeJjdMa2MrY2czD6yCJy` (Tour Đảo Booking Design System) và `https://claude.ai/artifact/RFm5ghbS7UMjgKdd1d2dXW` (Tour Dao Travel ERP Design System) | phiên Claude Code, nếu chủ đồng ý | — | — | (trong cổng 2a) | 2 |
| 4 | **7b** Đề bài số 1 — Khung chung: `PROMPT-CLAUDE-DESIGN-1-KHUNG-CHUNG.md` (390 / 1040 / 1440: thanh trên, tab dưới, thanh bên, đầu trang, vùng hành động, chân dính, bảng trượt, hộp thoại, thông báo, mất mạng, bảo trì, không quyền; 5 khuôn trang × rỗng/ít/nhiều/đang tải/lỗi) | phiên Claude Code viết, Claude Design vẽ | bộ v2 | HTML tương tác + bảng token đã dùng + 3–5 dòng | **Cổng 2b** | 2 |
| 5 | **Thi công đợt 0 — token + thành phần + khung** (không đổi màn nào): đưa cấu trúc token v2 vào `public/app.css` (expand), dựng lớp thành phần dùng chung (nút 3 cấp, ô nhập, chip, huy hiệu có biểu tượng, thẻ, dòng, bảng trượt một khuôn, toast một cơ chế, dải, khung xương, rỗng, trang 403/404/mất mạng), thanh trên + tab + thanh dính một kiểu; **khung tải** (xem mục 3) | phiên thi công + subagent kiểm | bản vẽ khung chung đã duyệt | mã + kịch bản Chrome + số đo trước/sau | nghiệm thu độc lập | 4 |
| 6 | **7c** Sau đợt 0: chuyển bộ v2 sang **đồng bộ từ mã** bằng `/design-sync` trong Claude Code; từ đây `public/app.css` là nguồn duy nhất, bộ trên Claude là tấm gương; mọi đề bài sau đọc bộ đã đồng bộ | phiên Claude Code | mã đợt 0 đã lên main | bộ v2 ở chế độ đồng bộ | — | 5 |
| 7 | **Chặng 3** Đề bài số 2 — Danh sách | viết đề bài → vẽ → đặc tả → `writing-plans` → thi công → kiểm | khung chung + đợt 0 | bản vẽ 2–3 đại diện × 2 khổ + bảng "áp cho trang còn lại" | cổng riêng | 6 |
| 8 | Đề bài số 3 — Chi tiết | như trên | như trên | như trên | cổng riêng | 6 (song song với 7) |
| 9 | Đề bài số 4 — Biểu mẫu | như trên | như trên | như trên | cổng riêng | 6 (song song với 7, 8) |
| 10 | Đề bài số 5 — Trang chủ và bảng điều khiển | như trên | 7 (dùng danh sách/thẻ đã chuẩn) | như trên | cổng riêng | 7 |
| 11 | Đề bài số 6 — Thiết lập, danh mục, tài khoản | như trên | 7, 9 | như trên | cổng riêng | 7, 9 |
| 12 | Phát hành 2: bỏ bí danh token cũ, bỏ 28 lớp nghi chết, bỏ tiền tố theo trang còn sót | phiên thi công + kiểm | mọi họ đã thi công | mã sạch | nghiệm thu | 7–11 |

**Chạy song song được**: 7, 8, 9 (ba họ dựa cùng khung chung, không chạm nhau); 10 và 11 chờ 7 vì dùng lại thẻ/danh sách đã chuẩn. Thi công của từng họ cũng song song được nếu mỗi họ một worktree và không cùng sửa `app.css` ở cùng khối (khối thành phần chung đã đóng ở đợt 0).

## 2. Nội dung từng đề bài họ màn (trang xếp theo `KIEM-KE.md` mục A; lệch với gợi ý ở PROMPT mục 8 ghi ở cột cuối)

| Đề bài | Đại diện vẽ (2–3 trang khó nhất, 390 + 1040) | Áp cho các trang còn lại (trang → khác gì) | Nguyên tắc vàng | Lệch với PROMPT mục 8 |
|---|---|---|---|---|
| **2 Danh sách** | Đơn hàng (lọc nhiều điều kiện, thẻ 3 dòng ở 390 / bảng cột ở ≥ 900 — H-DANH-SACH-BANG, 50+ dòng), Danh bạ (hồ sơ nhiều loại + ngăn chi tiết máy tính; bộ lọc gập sau nút Lọc — C-DANH-BA-LOC-390), Xe (bảng → thẻ, hành động dòng) | Đơn chờ xác nhận (không tên khách), Quản lý tài khoản (biểu mẫu thêm chuyển sang bảng trượt / ngăn, bảng 1040 có cột hành động đủ chỗ — C-STAFF-BANG-1040, C-STAFF-FORM-TRUOC), Cuốc của tôi (nhóm theo ngày), Xe đang chạy (tự làm mới), Giấy tờ sắp hết hạn (nhóm theo hạn), Đề nghị (duyệt/bác theo dòng), Nhật ký (chỉ đọc, 1000+ dòng, không tràn ngang — C-AUDIT-TRAN), Máy đang đăng nhập (hành động nguy hiểm theo dòng), Hỗ trợ (tab mặc định theo vai — C-FEEDBACK-TAB-MAC-DINH; ngăn chi tiết), Việc của tôi của HDV (ô đếm nhảy tới khối — C-HDV-DON-CUA-TOI-XA) | tìm thấy một đơn trong ≤ 3 giây, không cần mở bộ lọc | — |
| **3 Chi tiết** | Chi tiết đơn (dải tóm tắt, nhiều khối, hành động theo trạng thái, đặt gấp), Chi tiết chuyến (dòng thời gian suất, hành động điều phối), Chuyến của tôi (tài xế đang chạy: nút to, một tay) | Chi tiết xe, hồ sơ Danh bạ, một vé Hỗ trợ (luồng tin) | việc tiếp theo luôn ở một chỗ; không cuộn quá 2 màn để thấy hành động | Chuyến của tôi là chi tiết **tài xế** (khác khuôn văn phòng) — vẽ riêng một artboard |
| **4 Biểu mẫu** | Tạo đơn (4 bước, ô chọn dịch vụ, **đưa đón bắt buộc hỏi ngay trong bước Dịch vụ** — C-TAO-DON-DON-HAY-KHONG, hành khách, người phụ trách), Tạo/sửa chuyến (chọn xe – tài xế – chặng; bảng trượt "Chuyến mới" của Điều phối dùng cùng khuôn), Điều chỉnh công nợ (gửi + duyệt, tiền) | Thêm/sửa xe, Chụp bù mức, Báo bận (nút tắt phải nói thiếu gì — C-BAO-BAN-NUT-TAT), form tạo tài khoản, form tạo hồ sơ, 7 bảng trượt sửa nhanh (chép tay hiện nay → một khuôn) | nhãn luôn thấy; một nút chính; điều bắt buộc đòi trước khi cho bấm; không mất dữ liệu khi lỗi mạng | ô nhãn nổi của Tạo đơn **không** nhân rộng (xem `HE-THONG-HOP-NHAT.md` mục 3) — cần chủ xác nhận vì là quyết định 13/10 |
| **5 Trang chủ và bảng điều khiển** | Trang chủ theo vai (điện thoại 1a–1g + máy tính 1.73, mỗi vai một artboard), Điều phối xe (3 cột / dòng thời gian cuộn ngang), Sổ công nợ (danh sách + ngăn + bảng kê) | Trang đầu tài xế, Lịch xe bận, Hoa hồng, Khoá sổ tháng, Bảng kê xe thuê | 2 chạm tới việc hằng ngày; số liệu không nhảy khi tải (khung xương cùng lưới) | Hoa hồng là bảng điều khiển + thiết lập (hai tab): vẽ ở số 5, phần "Thiết lập" áp khuôn số 6 |
| **6 Thiết lập, danh mục, tài khoản** | Dịch vụ (đồng bộ Sheet có xem trước, nhóm, chip), Giao diện công ty (xem trước sống), Tôi (nhóm dòng liên kết + việc của tôi) | Địa điểm, Loại giấy tờ xe, Loại giấy tờ cá nhân, Chính sách điều phối, Điều kiện xuất bến, Lý do điều phối, Bảng giá xe, Người bán, Trợ lý, Gửi thông báo, Hướng dẫn (tách nhật ký thay đổi), Đăng nhập (giữ bản vẽ 24/9, chỉ áp token v2) | người không rành máy đổi được một thiết lập mà không hỏi ai | Đăng nhập: chủ đã yêu cầu "tuân thủ 100 %" bản 24/9 → chỉ đổi token, không vẽ lại bố cục |

## 3. Khung tải: đòn bẩy "Nhanh và mượt" đề xuất, theo thứ tự ít rủi ro trước (số đo ở `KIEM-KE.md` mục E và `so-lieu/toc-do.json`)

Chủ quyết ở cổng 1 hoặc ADR nhỏ riêng (thay cách phát hành và service worker — ADR-0035). Không cái nào cần framework hay đổi "mỗi trang một HTML".

| # | Đòn bẩy | Chạm gì | Kỳ vọng | Rủi ro |
|---|---|---|---|---|
| 1 | Tách gói chung bằng esbuild `--splitting --format=esm` (khung, `api.ts`, `dom.ts`, `shell.ts`, biểu tượng thành một gói dùng chung) | script `build:web`, `PRECACHE` | mỗi trang còn ≈ 10–40 KB riêng; gói chung cache một lần; nạp sẵn giảm từ ≈ 1,9 MB xuống ≈ 0,4 MB | tên gói băm theo nội dung → `sw-policy.ts` phải đọc danh sách từ build |
| 2 | `<link rel="modulepreload">` gói chung + `preload` phông đang dùng trong 47 HTML | `public/*.html`, `sinh-so-do-trang.mjs` | FCP sớm 1 vòng mạng (≈ 150–300 ms ở 4G chậm) | không |
| 3 | Nạp sẵn **khung + trang đầu theo vai + 5 mục thanh tab** ngay, các trang còn lại nạp dần khi rảnh | `web/sw/sw.ts`, `PRECACHE` | lần mở đầu không tải 1,9 MB | trang chưa nạp sẵn khi mất mạng → trang mất mạng chung |
| 4 | Speculation Rules (`prerender`/`prefetch` mục thanh tab và liên kết đang rê) | một `<script type="speculationrules">` trong khung | chuyển trang cảm nhận < 300 ms | chỉ Chrome/Edge; Safari iOS bỏ qua an toàn |
| 5 | View Transitions giữa tài liệu (`@view-transition { navigation: auto }`) + khung xương cùng lưới với nội dung thật | `app.css`, khung xương | không chớp trắng, CLS ≈ 0 | Safari 18+ mới có; nơi khác tự bỏ qua |
| 6 | Lưu xong báo ngay, đồng bộ sau (chỉ với hành động an toàn: lưu nháp, ghi chú) | `api.ts`, toast | phản hồi chạm < 100 ms | chạm luật nghiệp vụ nếu mở rộng → DỪNG, hỏi chủ |

## 4. Danh sách thử tay trên iPhone cho chủ (bổ sung vào `docs/PWA-IPHONE.md`, mục "Danh sách kiểm trên iPhone thật", nối tiếp 7 mục đang có)

Chạy trên D1 tạm (`node scripts/dev-iphone.mjs`), không dữ liệu thật; mỗi mục ghi "đạt / không" + ảnh vào `docs/evidence/<ngày>-iphone/`.

8. **Tốc độ cảm nhận** (tiêu chí 1): tắt hẳn app, bật chế độ máy bay rồi tắt, mở lại từ icon: màn Trang chủ hiện khung trong ≤ 1 giây? Bấm tab "Đơn" rồi tab "Tôi": có chớp trắng giữa hai trang không?
9. **Vùng chạm bằng ngón cái**: ở Đơn hàng, bấm được vào nút "Lọc" và chip "Xoá lọc" ngay lần đầu; ở Chi tiết đơn, nút "Xác nhận đơn" ở chân dính không bị thanh home đè.
10. **Bảng trượt**: mở "Sửa thông tin chuyến", kéo xuống để đóng; bàn phím hiện lên thì nút "Lưu" của bảng trượt còn thấy.
11. **Mất mạng giữa chừng**: đang điền Tạo đơn, bật chế độ máy bay, bấm "Lưu, chờ xác nhận": câu báo nói gì, dữ liệu đã gõ còn không sau khi có mạng lại.
12. **Không có quyền / không có trang**: dán địa chỉ `/audit` (tài khoản Bán hàng) và `/khong-co-trang-nay`: có về được trang đầu bằng một chạm không.
13. **Thanh dính đáy chồng nhau**: ở Chuyến của tôi (tài xế) và Hỗ trợ (ô trả lời), chỉ có một thanh dính dưới, không có thanh nào đè thanh tab.
14. **Chữ và số**: ở Sổ công nợ và Hoa hồng, số tiền có dấu chấm ngăn nghìn, canh phải, không bị cắt "…" ở 390.
15. **Trang Hướng dẫn**: cuộn tới cuối mất bao lâu; có tìm được mục cần trong 10 giây không.

## 5. Câu hỏi gom cho chủ (trả lời một lần, trước hoặc cùng cổng 1; không câu nào chặn việc đọc báo cáo)

Ba câu đầu là ba quyết định ở `BAO-CAO.md`; các câu sau chỉ cần một dòng trả lời, chưa trả lời thì thi công theo "đề xuất".

| # | Câu hỏi | Đề xuất (làm theo nếu chủ không nói khác) | Chạm gì |
|---|---|---|---|
| 1 | Duyệt đề cương `HE-THONG-HOP-NHAT.md` để dựng bộ v2 ở Chặng 2? | duyệt | chỉ giao diện |
| 2 | Độ đậm chữ: giữ một mức 500 hay mở lại ba mức 400/500/600? (H-DO-DAM) | mở lại ba mức, đổi bằng token | quyết định "Thị giác 1.70" |
| 3 | Cho đợt 0 sửa khung tải (tách gói chung, nạp sẵn theo vai, preload, Speculation Rules, View Transitions) qua một ADR nhỏ sửa ADR-0035? (H-GOI, H-TOC-DO) | đồng ý, đo trước/sau bằng kịch bản đợt này | cách phát hành, service worker |
| 4 | Nút nổi "Trợ lý": chuyển thành biểu tượng ở thanh trên, hay giữ nổi với đệm đáy và tự ẩn khi có chân dính? (H-FAB) | chuyển lên thanh trên | ADR-0066/0084 (Trợ lý), không chạm nghiệp vụ |
| 5 | Ô nhãn nổi của Tạo đơn (quyết định 13/10): đổi về nhãn trên ô như mọi biểu mẫu khác? (H-O-NHAP) | đổi về nhãn trên ô ở đợt Biểu mẫu | quyết định 13/10 |
| 6 | "Thanh bên trần 10 mục": đếm mọi mục (Toàn quyền 28) hay đếm nhóm gập là một (Toàn quyền 14)? | đếm nhóm gập là một; trần áp cho mục hiện sẵn | ràng buộc PROMPT mục 5 |
| 7 | Tiền ở danh sách điện thoại: bỏ kiểu "1,08tr ₫ / 410k ₫", ghi đủ "1.080.000 ₫" ở mọi khổ? (H-TIEN-KHO) | ghi đủ ở mọi khổ | chỉ hiển thị, không chạm cách tính |
| 8 | Dải nhắc bảo mật hai lớp và thông báo quan trọng: cho thu gọn thành một dòng và nhớ "đã đọc" theo phiên? (H-DAI-TREN) | thu gọn + nhớ theo phiên; vẫn bắt "Đã hiểu" với thông báo quan trọng | ADR-0074/0075 (bảo mật hai lớp), ADR-0045 (thông báo) — chỉ cách hiện |
| 9 | Câu lỗi máy chủ nói sai lý do (H-CAU-LOI: ngày đã qua báo "chưa đủ thông tin chuyến"; gán vai tổ chức dẫn sang Quản lý tài khoản): sửa câu ở `order-errors.ts` trong đợt nào, hay mở lại luật xác nhận đơn ngày đã qua? | chỉ sửa câu cho đúng lý do, không đổi luật; làm trong đợt Chi tiết | API/nghiệp vụ → chờ chủ |
| 10 | Trang 404 chung cần Worker trả HTML thay JSON cho địa chỉ lạ (H-404): cho đổi cấu hình định tuyến ở đợt 0? | cho, kèm kiểm e2e | cấu hình triển khai |
| 11 | Nhật ký thay đổi trên Hướng dẫn: giữ 5 phiên bản gần nhất trên trang, còn lại tách trang riêng? (C-HUONG-DAN) | giữ 5, tách phần còn lại | chỉ nội dung |

## 6. Việc không thuộc lộ trình này (ghi để không quên)

- Lỗi nghiệp vụ lộ ra khi gieo dữ liệu (`PHU-LUC-PHAT-HIEN.md` mã H-CAU-LOI và các C-… nghiệp vụ): câu lỗi máy chủ, luật xác nhận đơn ngày đã qua, gán vai cho hồ sơ tổ chức — chạm API/dữ liệu, chờ chủ quyết riêng, không vẽ.
- 404 của Cloudflare (trang trơn) → trang 404 chung thuộc đợt 0 nhưng cần `_routes`/Worker trả HTML: chạm cấu hình triển khai, ghi ở đặc tả đợt 0.
