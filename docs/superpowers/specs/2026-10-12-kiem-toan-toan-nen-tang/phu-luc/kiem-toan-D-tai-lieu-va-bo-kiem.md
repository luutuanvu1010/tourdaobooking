# Kiểm độc lập phần D — tài liệu mô tả (commit 09c00c05) và bộ kiểm tự động

Người kiểm: trợ lý kiểm độc lập, chỉ đọc, ngày 2026-10-12, trên worktree so-tien-luot-2-dai-ly (HEAD 09c00c05, cây sạch). Tôi không sửa tệp nào trong kho; chỉ ghi tệp này.

## 1. Kết luận

- Bộ kiểm xanh. typecheck: ba lượt tsc (server, web, web/sw) thoát 0. npm test bước 1: tests 3799, pass 3790, fail 0, todo 9, cancelled 0, skipped 0; bước 2 (bài đo giờ chạy một mình) 1/1 đạt; dòng cuối «npm test: bước 1 thoát 0, bước 2 thoát 0». Không có dòng ✖ nào. Dòng not ok 3732 «sổ vàng sổ đại lý — LỚP 2 … # TODO» là bài todo đã biết, không phải đỏ.
- Không có phát hiện Critical hay High. Có 1 Medium (K-D-1: một đoạn SYSTEM-DESIGN §7 vẫn tả cổng bảo trì kiểu cũ, trái mã và trái chính bảng route cùng commit) và 7 Low.
- Sự thật: khoảng 160 khẳng định kiểm theo nội dung (72 dòng bảng §8 đối chiếu MATRIX bằng máy; 77 dòng bảng migration so với ls migrations; 13 số đếm trigger tự đếm; khoảng 60 khẳng định khác kiểm tay, gồm các số bản phát hành và trạng thái K5/K6). Tách hai loại: câu MỚI viết sai hoặc thành sai do commit: 3 (K-D-4, K-D-5, K-D-6), tức khoảng 98% câu mới đúng; câu CŨ sai còn sót trong đoạn commit đã sửa: 5 (K-D-1 hai vế, K-D-2 hai chỗ, K-D-3). Thêm phần máy quét: 589 tên định danh, 157 đường dẫn, 32 liên kết tương đối, 10 khoá ngoại vẽ trong sơ đồ — chỉ 3 tên không có trong mã và cả 3 hợp lệ (isAllowedPhone, parseAllowedPhones được văn ghi rõ là đã bỏ; mktemp là lệnh shell).
- Hỏng do sửa: §16 giữ nguyên từng byte; không bảng nào vỡ cột mới (SYSTEM-DESIGN còn chữa được 2 dòng vỡ cũ; CHANGE-GUIDE.md:79 lệch cột có từ trước); không liên kết chết; mermaid cân (8 subgraph / 8 end); không SĐT, email, MST mới; không chữ «App» mới (13 chỗ «quyền app / cấu trúc app» có từ trước, số đếm không đổi).
- Phát hiện loại T của A, B, C phần lớn nằm ở tệp luật ngoài phạm vi commit (đúng là không được sửa ở đây); riêng số 512 của K-C-10 còn sót ở hai tài liệu mô tả (K-D-2).

## 2. Bảng phát hiện

| Mã | Mức | Loại | Điều luật/ADR | Bằng chứng | Hậu quả | Đề xuất | Đã biết? |
|---|---|---|---|---|---|---|---|
| K-D-1 | Medium | T | ADR-0071 điều 3c; CLAUDE.md §2 (mô tả thua mã) | docs/SYSTEM-DESIGN.md:929 (đoạn «Ô quyền máy chủ hỏi trong thân route», commit có sửa đoạn này — thêm accounts) vẫn ghi admin.manage phủ «GET /api/maintenance» và «GET chỉ trả cờ canToggle = settings.ops && SĐT trong danh sách được phép». Mã thật: src/modules/maintenance/index.ts:51-73 — GET chỉ hỏi settings.ops và trả canToggle: true, không đọc SĐT. Trái ngay SYSTEM-DESIGN.md:814 và :999 của cùng commit. Commit khai đã sửa mô tả bảo trì | AI sau đọc đoạn này có thể dựng lại điều kiện SĐT đã bỏ, hoặc tưởng Quản trị (admin.manage) xem được trạng thái bảo trì | Sửa một câu ở :929: chuyển GET /api/maintenance sang settings.ops, bỏ vế «&& SĐT…» | Mới (K-B-8 chỉ nêu ở CLAUDE.md:122) |
| K-D-2 | Low | T | CLAUDE.md §3 (số đếm khớp mã) | Commit sửa CHANGE-GUIDE.md:244 sang 2^10 = 1024 nhưng còn «512 tập con quyền» ở SYSTEM-DESIGN.md:735 (route nguoi-lap; bài thật src/modules/orders/nguoi-lap-route.test.ts:125,153 chạy 1 << PERMISSION_CODES.length = 1024) và «(nay 512)» ở CHANGE-GUIDE.md:1078 | Đánh giá sai thời gian chạy bài khi thêm mã quyền | Đổi hai chỗ sang 1024 hoặc «2^(số mã quyền)» | Cùng loại K-C-10 (CLAUDE.md:127); hai chỗ này mới |
| K-D-3 | Low | T | CLAUDE.md §7 (migration) | CHANGE-GUIDE.md:722 «Mẫu đưa đón theo dịch vụ (0058 — vc_leg_template…)»; bảng này tạo ở migrations/0059_mau_chang.sql. Lỗi có từ trước; commit sửa dòng :721 ngay trên (0057 thành 0058) nên nay hai dòng liền nhau cùng ghi 0058 | Tra nhầm migration khi hoàn tác | Đổi 0058 thành 0059 ở :722 | Mới |
| K-D-4 | Low | T | — | Số 0019 / B5 nay ghi nhiều kiểu trong chính các dòng commit thêm/sửa: SYSTEM-DESIGN.md:432 «Số 0019 còn giữ chỗ B5»; SYSTEM-DESIGN.md:436 «0019 chưa dùng»; SYSTEM-DESIGN.md:493 «0019 từng được dự kiến nhưng vẫn bỏ trống… số mới phải tính lại»; CHANGE-GUIDE.md:204 «0019 (B5 giữ chỗ)» | Người đặt số cho migration B5 không biết 0019 có được dùng | Chọn một cách nói (khuyên theo :493 — chưa chốt, tính lại), chỗ khác trỏ về | Mở rộng K-C-10 (ba kiểu ở CLAUDE.md, adr README) |
| K-D-5 | Low | T | — | SYSTEM-DESIGN.md:999 (settings.ops) và :1007 (notice.send) còn cụm «(cột SUPER_ADMIN không có trong bảng này)» trong khi commit đã bỏ hết cột giá trị khỏi bảng §8 | Gợi ý sai rằng bảng còn cột vai khác | Bỏ hai cụm ngoặc đó | Mới |
| K-D-6 | Low | T | ADR-0094 | docs/so-do-kien-truc/tong-the.html:318 trạm 7 gộp «lớp chống ghi trùng (vé)» nhưng chỉ ghi mã 403 · 409; router trả 400/422/409 cho vé (src/shared/router.ts:441-450); README sơ đồ ghi đúng | Ảnh chụp thiếu hai mã | Thêm 400 · 422 hoặc bỏ liệt kê mã | Mới |
| K-D-7 | Low | ghi nhận | Lời giao cho người viết (scratchpad sua-tai-lieu-brief, dòng 9: «Giữ nguyên cấu trúc mục… không viết lại cả mục») | Bảng §8 SYSTEM-DESIGN bỏ năm cột giá trị SALES…PARTNER, thay bằng trỏ về MATRIX + tóm tắt theo cột. Tôi đối chiếu bằng máy: phủ đúng 72/72 thao tác, mọi câu tóm tắt khớp MATRIX, danh sách «chỉ Toàn quyền» đúng 11 ô | Không sai sự thật; là đổi cấu trúc vượt lời giao, nhưng hợp luật «một sự thật một nơi» | Báo chủ biết; tôi khuyên giữ | Mới |
| K-D-8 | Low | T (số dễ đổi) | ~/.claude/CLAUDE.md «Cách làm tài liệu» | SYSTEM-DESIGN.md:689 «268 tại 2026-10-12» (đúng — tôi đếm 268 — và có lệnh đếm lại); số trang/phần/bảng/view ở docs/so-do-kien-truc/README.md (có cách đếm); CHANGE-GUIDE.md:204 liệt kê nhánh chưa gộp | Sẽ lệch khi mã đổi | Chấp nhận được vì có ngày và cách đếm; không cần sửa ngay | Mới |

Phân loại theo bản HEAD~1 (đã grep bản cũ): K-D-1, K-D-2, K-D-3 là câu cũ đã sai từ trước, commit sửa đoạn chứa chúng mà không chữa. K-D-4 (SYSTEM-DESIGN.md:432 và CHANGE-GUIDE.md:204 là câu mới), K-D-5 (cụm cũ thành sai vì commit bỏ cột), K-D-6 (commit thêm vế «vé» vào trạm 7 nhưng giữ mã cũ 403 · 409) là do commit.

## 3. Điều làm tốt

- §16 giữ nguyên từng byte: shasum dòng 1295–1315 cũ và 1373–1393 mới trùng nhau; đoạn từ tiêu đề §16 tới §17 cũng trùng.
- Bảng migration SYSTEM-DESIGN khớp đúng 77 tệp trong migrations/ (so bằng diff); số trigger 0041, 0071–0083, 0087, 0088, 0090 tôi tự đếm đều khớp (vd 0090 = 32).
- Bảng §8 phủ đủ 72 thao tác MATRIX, nội dung đúng 100%; §9 có đủ 41 trang PAGES (39 tệp trong build:web + 2 trang chỉ chuyển hướng).
- Sơ đồ tầng 0–7 tôi tự tính từ ALLOWED_EDGES khớp; 106 bảng (chia theo module cộng đúng 106), 35 view, 22 phần, 19 phần trong mảng modules của src/index.ts đều khớp.
- Nhiều số dễ đổi được thay bằng «đếm: …» (PAGES, build:web, ALL của e2e, STRICT) — đúng luật tài liệu sống.
- Nhãn «CHƯA lên production» lỗi thời được gỡ kèm trỏ về HANDOFF; khối bảng K ở §17 ghi rõ hàng nào đã đối chiếu lại, hàng nào chưa.
- Hai hàng §17 nâng trạng thái có cơ sở: K5 và K6 dẫn ADR-0025, ADR-0026 — cả hai đã accepted (docs/adr/ADR-0025-…md:3, docs/adr/ADR-0026-…md:3; câu «nháp» ở đầu mục cũ là lỗi thời); K6 «đạt» khớp định nghĩa docs/ARCHITECTURE.md:63 và 4.4 (:85): biên nhận dựng ở máy chủ theo danh sách trắng, có bài khoá đúng bộ khoá (src/modules/receipt/bien-nhan.test.ts:30-40). Lưu ý: docs/ARCHITECTURE.md:140 và :146 vẫn ghi biên nhận «dựng ở trình duyệt», «dựa vào kỷ luật» — nay lệch với mô tả, thuộc K-A-4 (tệp chuẩn tắc, ngoài phạm vi).
- Số bản phát hành ở đuôi SYSTEM-DESIGN khớp sổ của chính kho: 1.37 (ADR-0048), 1.38 (ADR-0049), 1.42 (sổ tiền lượt 1), 1.76 (ADR-0094), 1.87 (sổ đại lý đợt 1) đều có tiêu đề «TRẠNG THÁI TRIỂN KHAI» ở docs/HANDOFF-N1.md (:5, :49, :117, :141, :158) và mục version trong src/shared/changelog.ts; Đợt V1 đã vào main qua PR #17 (0529bc06, 39bd37de), trước bản 1.87.
- Đuôi SYSTEM-DESIGN tôi đọc thử đều đúng mã: phiên 4 phần (src/modules/auth/session.ts:31), thách thức 7 phần (challenge.ts:50), audit.view chỉ Toàn quyền (src/modules/audit/index.ts:30-32), HC-5.11 có trong docs/quyen-hoan.json, syncCatalog(env, null) (catalog/index.ts:365), route delivered/completed (billing/index.ts:176,194), module receipt.

## 4. Đối chiếu phát hiện loại T của A, B, C

- Báo cáo A không có phát hiện loại T. K-A-1 và K-A-5 (loại M) đã được README sơ đồ ghi vào phần «Ghi nhận hiện trạng» — đúng mức tài liệu mô tả, không hợp thức hoá.
- K-B-9 (docs/ARCHITECTURE.md:144 «hạn 15/10»): tài liệu chuẩn tắc, ngoài phạm vi; chưa xử lý.
- K-C-02 (docs/adr/README.md), K-C-06 (docs/kernel-18.md): ngoài phạm vi; chưa xử lý.
- K-C-10: phần CLAUDE.md ngoài phạm vi; số 512 đã sửa ở CHANGE-GUIDE.md:244 nhưng sót hai chỗ (K-D-2); số B5 nay thêm kiểu (K-D-4).
- K-C-11 (§16 dòng 5.14 hết lý do): commit giữ nguyên §16 đúng lệnh; vẫn chờ chủ ra ADR/dòng lịch sử mới.
- K-B-8 (loại L, CLAUDE.md:122 bảo trì theo allowed_phones): các tài liệu mô tả đã sửa theo ADR-0071 (SYSTEM-DESIGN :814, :815, :999, :1173; HANDOFF; CHANGE-GUIDE), trừ :929 (K-D-1). Phần CLAUDE.md vẫn chờ chủ.

## 5. Điều KHÔNG kiểm được

- Trạng thái production thật (bản 1.87 đang chạy, migration 0090 đã áp remote): cấm wrangler và curl. Tôi chỉ chứng minh được tài liệu khớp sổ triển khai và nhật ký thay đổi của chính kho (mục 3), không chứng minh production.
- e2e (cấm): các câu tả kịch bản e2e chỉ đối chiếu bằng đọc mã kịch bản, chưa chạy.
- Hai trang HTML sơ đồ: chưa mở trình duyệt xem hiển thị; chỉ đọc mã (lớp .pill.coral có CSS, lưới .gates 6 cột).
- Chưa đọc từng câu của toàn bộ 448 dòng thêm; SYSTEM-DESIGN §10, §13, §14 và các mục CHANGE-GUIDE ngoài số migration, tiền tố bảng, quyền chỉ đọc lướt.
- Chưa xét (ngoài phạm vi tài liệu): ReceiptDto có khoá discount, trong khi Hiến chương 4.4 (docs/ARCHITECTURE.md:85) cấm chứng từ chứa «chiết khấu»; nhiều khả năng discount là giảm giá cho chính khách nên hợp lệ, nhưng tôi chưa đối chiếu nghĩa với ADR-0026.
- Không có phép phá: phần D là tài liệu, commit không thêm hàng rào mới nào để thử.

## 6. Sẵn sàng

Sẵn sàng làm việc mới trên nền hiện tại? **Có sau khi** sửa K-D-1 (một câu ở docs/SYSTEM-DESIGN.md:929); bảy mục Low dồn vào lượt sửa chữ sau, không chặn.

Sẵn sàng trình chủ? Có sau khi sửa mục Medium K-D-1 — vì đó là chỗ duy nhất tài liệu mô tả nói trái mã về quyền.
