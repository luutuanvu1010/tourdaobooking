# A2 (giao diện thông tin chuyến theo dịch vụ) — nhật ký thi công, ruling và việc còn lại

Viết 2026-09-21 khi khép đợt thi công A2 theo kế hoạch `docs/superpowers/plans/2026-09-20-a2-giao-dien.md` (10 task, thi công bằng subagent-driven: mỗi task một implementer mới + rà soát độc lập, rà soát toàn nhánh, MỘT đợt sửa cuối + rà lại phạm vi + một vi-đợt sửa). Đây là bản LƯU BỀN của sổ điều phối (thư mục `.superpowers/` bị git bỏ qua nên mất cùng worktree). Đọc kèm `docs/HANDOFF-N1.md` (runbook triển khai), `docs/superpowers/plans/2026-09-20-n1-thi-cong-nhat-ky.md` và `docs/evidence/2026-09-20-a2/README.md` (bằng chứng thị giác + phần "Chưa kiểm" + "Tồn đọng nhỏ").

## 1. Trạng thái tại cuối đợt (HEAD mã được đo `1809ffb`; các commit sau chỉ đổi tài liệu/bằng chứng/chú thích CSS)

| Hạng mục | Kết quả |
|---|---|
| Nhánh | `worktree-thong-tin-chuyen-di`. **Cập nhật 2026-09-21: chủ dự án ra lệnh "commit, merge & push" ⇒ đã đưa vào `origin/main` bằng fast-forward `0ae0962`→`92cdf7f` (không force) và đẩy cả nhánh tính năng.** `main` cục bộ ở checkout gốc còn `9286a10` — chạy `git pull` ở đó. **Cập nhật 2026-09-21 (sau đó): chủ dự án ra lệnh "deploy lên production và push git" ⇒ ĐÃ TRIỂN KHAI (áp `0008…0012` rồi `wrangler deploy`, Worker `a625adc4-43df-4e67-ac8e-f619aa98732b`; chi tiết, cổng đã chạy và việc còn mở ở `docs/HANDOFF-N1.md` mục "Trạng thái triển khai"). Chữ ký thị giác vẫn CHƯA được chủ dự án ghi.** Cổng "push không tự deploy" chỉ đúng tới lúc đó: deploy là bước tay riêng (`wrangler deploy`). Trước lệnh đó: `git rev-list --count origin/main..HEAD` = 70 tại `7812376` |
| Thi công | T1–T10 (mỗi task một commit + một rà soát độc lập; T8+T9 gộp một dispatch, hai commit), hai vòng sửa sau rà task (`2ab7036` T6, `b67f4bf` T7), rà soát toàn nhánh (opus) → đợt sửa cuối 4 commit (`c49e547`, `df696be`, `ad54b00`, `9b5f0fd`) → rà lại phạm vi (sonnet) → vi-đợt sửa 2 commit (`1809ffb`, `7812376`) |
| Kiểm cuối (đo trên `1809ffb`) | `npm test` **236/236** · `tsc --noEmit` + `tsc -p web` + `tsc -p web/sw` = **0 lỗi** (bốn lỗi A2 của N1 đã hết) · `npm run test:e2e` **10/10** + `audit-invariants` · Chrome headless (kịch bản trong `docs/evidence/2026-09-20-a2/kich-ban/`): form **21** ✓, order **10** ✓, sheet **13** ✓, evidence **7** ✓ (`A2 EVIDENCE OK`) · axe: 15 trạng thái A2, 0 vi phạm (8 trang cũ: chỉ các vi phạm CÓ SẴN đã liệt kê ở README bằng chứng) · 34 ảnh |
| **Cổng cứng** | **CHƯA KÝ thị giác** (`docs/evidence/2026-09-20-a2/README.md` mục "Ký duyệt thị giác" ghi "Chưa ký"). Theo runbook, chưa ký = chưa triển khai; **ngày 2026-09-21 chủ dự án ra lệnh triển khai và bản này đã chạy trên production dù mục ký vẫn "Chưa ký"** (chủ dự án tự quyết bỏ qua cổng này; chữ ký vẫn nên được ghi lại sau khi xem ảnh và thử iPhone thật) |

## 2. Chỗ MÃ THẬT khác KẾ HOẠCH (nguồn sự thật là mã; không sửa lại tệp kế hoạch)
Kế hoạch được áp dụng thử thật cả 10 task (worktree tạm) nên khối mã khớp byte lúc bắt đầu; các chỗ sau lệch do vòng sửa:
- **T6 sửa** (`2ab7036`): vòng focus của bộ đếm lùi vào trong (`.counter .counter-btn:focus-visible, .counter .counter-field:focus-visible`) vì `.counter { overflow: hidden }` xén vòng mặc định.
- **T7 sửa** (`b67f4bf`): Enter trong ô tìm danh mục (`input[type=search]` nằm trong `<form>`) bị chặn `preventDefault`, không gửi cả form (kiểm bằng phím Enter THẬT qua CDP).
- **Đợt sửa cuối**:
  - `src/shared/service-form.ts` — `CatalogDraft.saved` (bản chụp đã lưu) + `setPax` **quay về bản chụp** khi số khách về đúng giá trị đã lưu (không mất đơn giá thương lượng; nhãn "Khác giá danh mục" khớp máy chủ `kept`); vi-đợt (`1809ffb`, "I1-bis"): đơn giá người dùng VỪA GÕ ở chế độ giá hiện tại (khác `defaultPrices(item)`, cùng heuristic với `refreshFromCatalog`) được GIỮ khi quay về bản chụp.
  - `web/api.ts` — `REQUEST_TIMEOUT_MS = 45_000` bằng `AbortController` (hết giờ → `AbortError` → banner mạng; hết giờ giữa lúc đọc thân được ném lại). `web/trip-sheet.ts` — đặt lại `saving` ở ĐẦU khối `catch`.
  - `web/order-form.ts` — `pageshow` (`persisted && saving`) mở khoá form kẹt "Đang lưu…" (iOS bfcache); sau khi lưu thành công dùng `location.replace` (form không còn trong lịch sử ⇒ không quay lại bấm Lưu lần hai gây đơn trùng); `wide()` (`matchMedia("(min-width: 960px)")`, gọi lúc cần) thay `isPhone` cho việc cuộn/focus khi lỗi (`isPhone` chỉ còn cho accordion khối chuyến); "Đơn này đang khoá.".
  - `web/order.ts` — `load()` lỗi có nút "Tải lại đơn"; 409 mặc định `reload_order` **trừ `incomplete_trip`** (đúng ma trận đặc tả §5.2).
  - `web/catalog-picker.ts` — bỏ `role` listbox/option; mục không chọn được dùng `aria-disabled`.
  - `public/app.css` — `.sheet-scrim` `pointer-events: none` tới khi `.open`; dọn CSS chết `.item*`, `.catalog-pick*`.
  - Chú thích/tài liệu: `sw-policy.ts`, `PWA-IPHONE.md`, `app.css` (8,6→8,0), `pwa.mjs` (`=== 6`), `HANDOFF-N1.md`, `tests/e2e/README.md`.
- **Số dòng ✓ của kịch bản Chrome** khác kế hoạch (form 15, order 8, sheet 11 → 21, 10, 13) do các phép kiểm đỏ→xanh thêm ở các vòng sửa.
- **Bằng chứng**: `kich-ban/*.mjs` là bản canonical trong repo (không còn ở thư mục tạm); mã app KHÔNG có test tự động cho `web/trip-sheet.ts`, `web/order-form.ts`, `web/order.ts` — sửa các tệp này thì PHẢI chạy lại ba `a2-smoke-*.mjs` (đã ghi ở HANDOFF-N1 và README bằng chứng).

## 3. Việc CHỦ DỰ ÁN quyết/làm (Claude không được đẩy/merge/triển khai)
1. **Ký thị giác**: xem `docs/evidence/2026-09-20-a2/anh/` cạnh mockup (`docs/design/a2-mockup/output/`) theo bảng đối chiếu ở README bằng chứng; ghi ngày + người ký + điểm cần sửa vào mục "Ký duyệt thị giác". Lưu ý: ô ngày/giờ/`<select>` trong ảnh là kiểu Chrome, không phải iOS.
2. **Thử trên iPhone thật** (bằng chứng chưa phủ được; danh sách đầy đủ ở README bằng chứng, mục "Chưa kiểm"): bàn phím iOS che nút Lưu dính đáy; ô ngày trong PWA đã cài; safe-area của bảng trượt; `inert` (iOS ≥ 15.5) và `100dvh` (≥ 15.4); khoá cuộn nền; Back/bfcache sau khi lưu (mới giả lập `pageshow` + kiểm lịch điều hướng Chrome); IME tiếng Việt (Telex/VNI) — kịch bản chỉ gán `value` rồi bắn `input`/`change`, chỉ một lần Enter là phím thật, và handler chặn Enter ở ô tìm không kiểm `isComposing`; hiệu năng đơn 20 dịch vụ (Chrome desktop đo 0,4–0,9 ms/lần gõ).
3. Sau khi ký: phần việc của N1 vẫn nguyên (`docs/superpowers/plans/2026-09-20-n1-thi-cong-nhat-ky.md` §3): hai lệnh D1 chỉ-đọc, cổng chỉ-đọc `full_name`/`created_at`, quyết định 4(a)/(b)/(c), điểm Time Travel, `npm run build:web` trước khi triển khai, rồi B5 (`0013`) chỉ sau lần phát hành 1 chạy ổn.
4. Môi trường: worktree tạm `/Users/tuanbao/.claude/jobs/80c8fdcd/tmp/a2-scratch` (nhánh `a2-plan-dryrun`, chuẩn đối chiếu của kế hoạch) là ĐỒ TẠM — không merge/đẩy; dọn khi không cần: `git worktree remove --force /Users/tuanbao/.claude/jobs/80c8fdcd/tmp/a2-scratch && git branch -D a2-plan-dryrun` (rồi `git worktree prune`). Nhánh `n1-plan-dryrun` của N1 cũng vậy.

## 4. Ruling đã đưa ra (chi tiết nguyên văn ở Phụ lục)
- Kịch bản Chrome tạm/bằng chứng lặp helper giữa các tệp: chấp nhận (mã bằng chứng độc lập).
- Mô hình: implementer sonnet cho mọi task; reviewer sonnet cho task; opus cho rà soát toàn nhánh cuối.
- Đường dẫn thật thay `$CLAUDE_JOB_DIR`.
- 22:20 (theo yêu cầu "rút gọn" của chủ dự án): review task N chạy song song với implementer task N+1; T8+T9 gộp một dispatch; rà soát toàn nhánh chạy song song T10; T10 bỏ bước chạy lại ba smoke (chi phí: lỗi trong bản sao kịch bản của `kich-ban` không bị bắt sớm — về sau bị bù bằng việc đợt sửa cuối chạy lại và sửa chính các tệp trong repo).
- Task 5 (park): banner "không thuộc đơn này" ghi "Đã tải lại đơn" nhưng có nút — giữ chữ theo đặc tả §5.2 (đường gần như không xảy ra).
- Task 6 và 7: SỬA (không park) vòng focus bộ đếm và Enter ở ô tìm.
- ~23:25: sửa I1–I6 + scrim + chuỗi tiếng Anh trong MỘT đợt; timeout `api()` = 45 giây (an toàn cho đồng bộ Sheet của admin ~15 s); KHÔNG làm các Minor còn lại; hiệu năng chỉ ghi số.
- 23:40: nhận vào Nhóm 4 mục Important + Minor 1–6 của rà soát Task 10 (văn bản README); Minor 7 (đóng dấu HEAD trong `ket-qua-do.json`, `startEnv()` mồ côi, lỗi `net::`, ảnh `tt-*` là ảnh khung nhìn) HOÃN.
- 2026-09-21: VI PHẠM có chủ đích ruling "không có đợt sửa thứ hai" ở MỘT vi-đợt nhỏ (2 commit) vì rà lại phạm vi tìm ra hồi quy do chính bản sửa I1 (mất đơn giá gõ tay) và đường đơn trùng do bản sửa I2 mở ra; không dispatch reviewer lần ba (controller đọc diff + chạy lại cổng).
- Tồn đọng nhỏ (KHÔNG làm, ghi ở README bằng chứng): scrim chỉ chặn chạm ~2 khung hình đầu; message máy chủ `invalid_transition` chứa mã trạng thái tiếng Anh (`src/modules/orders/index.ts:113`); `a2-smoke-sheet.mjs` phụ thuộc chuỗi `ms === 45000`; `POST /api/orders` không có khoá idempotent (hết giờ 45 s hiện "bấm Lưu lại" cho yêu cầu máy chủ có thể đã xử lý xong); "8 trang" còn ở `PWA-IPHONE.md` (dòng 7, 26, 70); danh sách Minor `minor (deferred)` ở Phụ lục.

---

# Phụ lục — sổ điều phối A2 (nguyên văn)

# SDD ledger — plan: docs/superpowers/plans/2026-09-20-a2-giao-dien.md

Spec: docs/superpowers/specs/2026-09-19-a2-giao-dien-design.md (đọc được; đã duyệt 2026-09-20). Nhánh `worktree-thong-tin-chuyen-di`, BASE đầu = 67e65dd. Chủ dự án chọn Subagent-Driven (2026-09-20).
Cấm: push, merge vào main, triển khai (HANDOFF-N1). Mọi commit có hai dòng đồng tác giả (thông điệp đặt vào tệp, `git commit -F`). `$CLAUDE_JOB_DIR` = /Users/tuanbao/.claude/jobs/80c8fdcd (viết đường dẫn thật).
Kế hoạch đã được áp dụng thử thật cả 10 task trên worktree tạm a2-plan-dryrun (khối mã byte-đồng nhất với kế hoạch): task nào lệch so với dry-run là dấu hiệu nền đã đổi.

## Preflight scan (trước Task 1)

Cặp task dùng chung tệp/giao diện:
| Cặp | Bên sản xuất ↔ bên tiêu thụ | Kết quả |
|---|---|---|
| T1 → T3/T4/T5 | `shared/trip-rules.ts` (MAX_*, confirmWindow, MISSING_LABEL) ↔ trip-form (MAX_DAYS_AHEAD, confirmWindow), service-form (MAX_LINES_PER_ORDER, MAX_SERVICES), order-errors (MISSING_LABEL) | tên/kiểu khớp |
| T1 ↔ máy chủ | `orders/service-rules.ts` import lại và xuất lại cùng tên | test cũ giữ nguyên |
| T2 → T6–T9 | `public/app.css`: T2 ghi đè trước dấu mốc PWA; T6–T9 chỉ thêm SAU dấu mốc; T8 xoá khối `order-lines` (script tự assert) | token dùng ở T6–T9 đều đã định nghĩa ở T2/T7 |
| T2 ↔ sw-policy, pwa.mjs | chỉ T2 chạm | không chồng |
| T3 → T4/T6/T8/T9 | emptyTrip/tripFromDto; tripSummaryLine/tripWarnings; tripRows; tripSheetIssues/tripPayload | khớp |
| T4 → T6/T7/T8 | draft ops, cardCodes, guestDetail, refreshFromCatalog (T7), paxSummary/unitLabel (T8) | khớp |
| T5 → T6/T7/T8/T9 | Banner, classifyOrderError, NETWORK_BANNER, `banner` (xuất), `ApiError.details` (web/api.ts) | khớp |
| T6 → T7/T9 | createServiceCard(+refreshLimits), createCatalogPicker, renderBanner, regroupMoney, tripFields, icons | khớp |
| T7 ↔ T8 | liên kết `?focus=<serviceId>` của banner incomplete_trip (T8) ↔ form (T7); cùng `#error` kiểu banner | khớp |
| T8 ↔ T9 | cùng `web/order.ts`: T8 ghi đè cả tệp, T9 sửa bằng khối CŨ/MỚI + chèn hàm | mô phỏng từ kế hoạch byte-đồng nhất với tệp dry-run |
| T7–T9 ↔ T10 | tệp tạm a2-cdp/smoke-* được T10 chép vào repo, sửa dòng chú thích bằng regex | dòng chú thích tồn tại |
Từng task tự khớp (test ↔ mã, tệp tạo ↔ tệp sửa sau): T1–T10 đều khớp (đỏ→xanh đã chạy ở dry-run; số test kỳ vọng ghi trong từng task).

Phát hiện: (a) kịch bản Chrome tạm/bằng chứng lặp helper `call`/`NO_TRIP`/`pax` giữa a2-smoke-order, a2-smoke-sheet, a2-evidence (lặp nguyên văn — plan-mandated); (b) hạ tầng: subagent có thể bị Bash chặn lệnh ghép/`cd`/heredoc nhắc git.

## Rulings

Ruling: Kịch bản Chrome tạm/bằng chứng lặp helper giữa các tệp được chấp nhận — là mã bằng chứng độc lập, không phải logic ứng dụng; gộp vào a2-cdp.mjs làm đổi tệp đã kiểm — chi phí nếu sai: một lần refactor helper.
Ruling: Mô hình — implementer dùng sonnet cho mọi task (mã đã có sẵn nguyên văn nhưng có bước debug Chrome; sàn mid-tier vì số lượt), reviewer sonnet cho task, opus cho rà soát toàn nhánh cuối — chi phí nếu sai: thêm một vòng sửa.
Ruling: Đường dẫn — mọi lệnh dùng đường dẫn thật thay `$CLAUDE_JOB_DIR`; tệp tạm ở /Users/tuanbao/.claude/jobs/80c8fdcd/tmp (đã có bản a2-cdp/smoke của dry-run; implementer tạo lại từ kế hoạch nguyên văn) — chi phí nếu sai: script lệch, thấy ngay khi chạy.

## Tiến độ

Task 1: dispatched (BASE 67e65dd; implementer sonnet, agent a6daf65771f058325; brief task-1-brief.md; report task-1-report.md)
Task 1: implementer DONE (commit 7cd10d8; 173/173 test; tsc web 4 lỗi cũ; spike TS5097 xác nhận). Reviewer dispatched (sonnet, agent a34fc1ee190953ec0, diff review-67e65dd..7cd10d8.diff)
Task 1: minor (deferred): service-rules.test.ts:33-34 dùng `await import` động dù đã import tĩnh cùng tệp (nguyên văn brief)
Task 1: minor (deferred): service-rules.test.ts:38 tên test nói "một nguồn với giao diện" nhưng chỉ assert confirmWindow chứng minh được (ba hằng nguyên thủy)
Task 1: minor (deferred): confirmWindow có hai test trùng nội dung (service-rules.test.ts:199 và trip-rules.test.ts:16)
Task 1: minor (deferred): trip-rules.ts:2 và :12 chú thích lịch sử/nhắc consumer máy chủ trong tệp dùng chung (nguyên văn brief)
Task 1: ⚠️ (esbuild nạp tệp web/ import giá trị từ shared với đuôi .ts) — giải quyết: kiểm ở Task 6 Bước 10 (đóng gói thử) và Task 7 (build:web); dry-run đã qua
Task 1: complete (commits 67e65dd..7cd10d8, review clean; 173/173, tsc server sạch, tsc web 4 lỗi cũ — controller đã kiểm lại)
Task 2: dispatched (BASE 7cd10d8; implementer sonnet, agent a332db27c902d257f; brief task-2-brief.md; report task-2-report.md)
Task 2: implementer DONE_WITH_CONCERNS (commit f7464b4; sw-policy đỏ 11/2 → xanh 13/13; npm test 173; tsc web 4 lỗi cũ; e2e pwa+platform 2/2). Lo ngại duy nhất: số diff app.css 73/23 vs gợi ý brief 72/22 (cmp với khối brief IDENTICAL) — quan sát, không chặn. Reviewer đã dispatch (sonnet, diff review-7cd10d8..f7464b4.diff)
Task 2: minor (deferred): chú thích đầu sw-policy.ts (lớp chắn thứ hai) chưa nhắc font woff2
Task 2: minor (deferred): sw-policy.ts:7 và docs/PWA-IPHONE.md:12 chú thích/liệt kê loại nội dung cache chưa nhắc font woff2 (PWA-IPHONE còn ghi "8 trang" dù PAGES có 10) — làm ở tài liệu Task 10 hoặc rà cuối
Task 2: minor (deferred): app.css:46 chú thích "8,6:1" thực đo 8,04:1 (plan-mandated, vẫn đạt AAA)
Task 2: minor (deferred): pwa.mjs:58 khẳng định fontUrls.length >= 6 yếu hơn "đủ 6" và chỉ kiểm một chiều
Task 2: ⚠️ giá trị token khớp đặc tả §6 — controller đã kiểm bằng script (23 màu + 8 kích thước: không lệch); ⚠️ trình duyệt vẽ font thật — chứng ở Task 10 (font: 6 @font-face swap, nạp thật, cache SW)
Task 2: complete (commits 7cd10d8..f7464b4, review clean)
Task 3: dispatched (BASE f7464b4; implementer sonnet; brief task-3-brief.md; report task-3-report.md)
Task 3: implementer DONE (commit 367cef0; trip-form.test 9/9; npm test 182/182; tsc sạch; tsc web 4 lỗi cũ). Reviewer dispatched (sonnet, diff review-f7464b4..367cef0.diff)
Task 3: minor (deferred): trip-form.ts:41 tripWarnings so `d < today` thay vì cận dưới `confirmWindow(today).from` (plan-mandated; hiện trùng, lệch nếu luật đổi)
Task 3: minor (deferred): trip-form.ts:72-74 tripRows bỏ departTime khi chưa có ngày (tripSummaryLine giữ) — không thống nhất; test chỉ phủ NONE
Task 3: minor (deferred): trip-form.ts:92 tripSheetIssues chỉ đúng cho đơn ĐÃ XÁC NHẬN, chú thích chưa nói rõ (Task 9 gọi đúng chỗ)
Task 3: minor (deferred): thiếu ca test: departDate không ISO, hai cảnh báo cùng lúc, savedDepartDate=null với ngày trong khoảng
Task 3: complete (commits f7464b4..367cef0, review clean)
Task 4: dispatched (BASE 367cef0; implementer sonnet; brief task-4-brief.md; report task-4-report.md)
Task 4: implementer DONE (commit 7af5c68; service-form.test 31/31; npm test 213/213; tsc sạch; tsc web 4 lỗi cũ; architecture 19/19; khối mã IDENTICAL với brief). Reviewer dispatched (sonnet, diff review-367cef0..7af5c68.diff)
Task 4: minor (deferred): service-form.ts:557-563 setPax chuyển bản chụp → live (reset unitPrices) kể cả khi số khách không đổi (bấm + rồi −); máy chủ giữ bản chụp theo samePax → nhãn lệch giá đã lưu có thể lệch xem trước — rà cuối / Task 6–8 quyết định
Task 4: minor (deferred): draftIssues (nhập tay) chưa phản chiếu MAX_QUANTITY 100_000, tên/mô tả ≤300, chi tiết ≤1000 của máy chủ — UI đặt maxlength (Task 6 đã có maxLength 300/1000); server vẫn quyết định
Task 4: minor (deferred): CatalogDraft.code/name/unit là bản sao của item.* — mọi hàm đổi item phải cập nhật cả ba (rủi ro bảo trì)
Task 4: minor (deferred): draftFromDto nhánh "live" mang catalogStatus của DTO trong khi giá hiển thị là giá hiện tại (dữ liệu cũ thiếu catalogPrice) — kiểm nhãn ở Task 7
Task 4: ⚠️ `live` phải chỉ gồm dịch vụ đang hiện + được hỗ trợ — giải quyết: Task 7 dựng `live` từ GET /api/catalog (máy chủ chỉ trả visible; picker lọc supported); nhắc trong dispatch Task 7
Task 4: ⚠️ orderSummary().warning "không chặn" trong khi máy chủ chặn — giải quyết: Task 7 `validate()` chặn Lưu khi giảm giá > tạm tính và cọc > tổng cộng (mã kế hoạch đã có)
Task 4: complete (commits 367cef0..7af5c68, review clean)
Task 5: dispatched (BASE 7af5c68; implementer sonnet; brief task-5-brief.md; report task-5-report.md)
Task 5: implementer DONE (commit 7ebc87a; order-errors.test 10/10; npm test 223/223; tsc sạch; tsc web 4 lỗi cũ). Ghi nhận của implementer: details lạ (pax lạ → "undefined"; reasons không phải mảng → ném lỗi) — hợp đồng API hiện không sinh. Reviewer dispatched (sonnet, diff review-7af5c68..7ebc87a.diff)
Task 5: minor (deferred): order-errors.ts:85 409 `invalid_transition` của POST …/status ("hãy tải lại") rơi vào banner nguy hiểm action none — không có nút tải lại (ngoài ma trận §5.2; xét ở rà cuối/Task 8)
Task 5: minor (deferred): order-errors.ts:75/62 g.reasons.map ném lỗi nếu reasons không phải mảng; MISSING_LABEL/PAX_LABEL ra "undefined" nếu giá trị lạ (hợp đồng hiện không sinh; phòng thủ)
Task 5: minor (deferred): order-errors.ts:62 `c.pax as PaxCode` thừa; :78-80 tiêu đề + dòng gợi ý catalog_unavailable lặp ý; :40 banner() Partial cho phép {lines: undefined}; thiếu vài ca test (incomplete_trip thiếu thân, "Dịch vụ 12:", catalog_unavailable không có số)
Task 5: parked — banner "không thuộc đơn này" ghi "Đã tải lại đơn" nhưng action reload_order (nút) — Ruling: chỉ xảy ra ở PUT /trip khi id dịch vụ đổi, mà đơn ĐÃ XÁC NHẬN khoá dịch vụ nên tình huống này không dựng được (dry-run xác nhận); giữ chữ theo đặc tả §5.2, không sửa — chi phí nếu sai: chữ hơi lệch ở đường gần như không xảy ra
Task 5: complete (commits 7af5c68..7ebc87a, review clean)
Task 6: dispatched (BASE 7ebc87a; implementer sonnet; brief task-6-brief.md; report task-6-report.md)
Ruling (22:20, theo yêu cầu "rút gọn" của chủ dự án): đường găng chỉ còn implementer. (1) Reviewer của task N chạy SONG SONG với implementer của task N+1 (reviewer chỉ đọc gói diff cố định, không đụng cây); vòng sửa (nếu có) chạy sau khi implementer đang chạy commit xong. (2) Task 8 và 9 gộp MỘT dispatch implementer nhưng vẫn hai commit và hai gói review. (3) Rà soát toàn nhánh cuối (opus) chạy song song với Task 10, trên phạm vi đến commit Task 9; Task 10 chỉ thêm bằng chứng/tài liệu. (4) Task 10 bỏ bước chạy lại ba kịch bản smoke từ kich-ban (đã chạy xanh ở Task 7–9; bản sao chỉ khác dòng chú thích) — chỉ chạy kịch bản bằng chứng + e2e đầy đủ. Chi phí nếu sai: lỗi ở task N có thể lộ sau khi task N+1 đã commit (sửa bằng commit riêng); lỗi trong bản sao kịch bản của kich-ban không bị bắt sớm.
Task 6: implementer DONE (commit aa59d71; tsc web 4 lỗi cũ; esbuild ok; npm test 223; e2e pwa xanh; sáu tệp web KHỚP byte với brief; 36 token đều định nghĩa). Reviewer dispatched (sonnet, chạy SONG SONG với Task 7; diff review-7ebc87a..aa59d71.diff)
Task 7: dispatched (BASE aa59d71; implementer sonnet; brief task-7-brief.md; report task-7-report.md) — chạy song song với review Task 6
Task 6: ghi nhận — implementer báo app.css có thay đổi chưa commit (+2 token --w-form/--w-side) sau commit của nó: đó là Bước 1 của Task 7 (implementer Task 7 chạy song song) — không phải sự cố.
Task 7: implementer DONE (commit 78a8acf; smoke Chrome 15 dòng ✓; tsc web đúng 2 lỗi order.ts; npm test 223; e2e pwa/platform/orders/trip 4/4; 7 khối mã + 3 tệp tạm trùng byte). Reviewer dispatched (sonnet, song song; diff review-aa59d71..78a8acf.diff)
Task 8+9: dispatched GỘP một implementer sonnet (BASE 78a8acf; briefs task-8-brief.md, task-9-brief.md; reports task-8-report.md, task-9-report.md; hai commit riêng)
Task 6: review = Needs fixes — 1 Important (plan-mandated): app.css:276 `.counter { overflow: hidden }` cắt vòng :focus-visible của bộ đếm (nút −/+ và ô số); `input:focus { outline-offset: 0 }` (0,1,1) còn thắng khối :where → mất vòng focus ở điều khiển dùng nhiều nhất; đặc tả 5.4 đòi vòng focus cho MỌI phần tử tương tác.
Task 6: Ruling: SỬA (không park) — đặc tả §5.4 là ràng buộc gắn kết; sửa hai dòng CSS (vòng lùi vào trong: `.counter .counter-btn:focus-visible, .counter .counter-field:focus-visible { outline: var(--focus-ring) solid var(--c-primary); outline-offset: calc(-1 * var(--focus-ring)); }` đặt trong khối A2 sau dấu mốc). Lịch: KHÔNG sửa song song (implementer Task 8+9 đang sửa cùng app.css) — gom vào "đợt sửa" sau khi Task 8+9 commit, cùng các phát hiện Important của Task 7/8/9 (nếu có), trước Task 10; MỘT implementer sửa + MỘT re-review phạm vi. Chi phí nếu sai: vài phút; nếu bỏ: người dùng bàn phím mất vòng focus ở bộ đếm.
Task 6: minor (deferred): counter.ts:37-42 không chặn độ dài số (≥22 chữ số → "1e+22"/"Infinity"; qua draftIssues client khi đơn giá 0, server chặn)
Task 6: minor (deferred): service-card.ts:273 issuesEl role=alert dựng lại mỗi refresh (đọc lặp lỗi mỗi phím); .field-errors:empty display:none ⇒ lần xuất hiện đầu có thể không được đọc
Task 6: minor (deferred): service-card.ts:175-176,186-188 mất focus sau "+ Thêm dòng"/"Xoá dòng" (thân dựng lại) — bàn phím rơi về body
Task 6: minor (deferred): catalog-picker.ts:54 document click không gỡ; đóng danh sách dựa vào click toàn cục (iOS có thể không sinh click); :24/:37 role listbox/option không có mô hình phím; MAX_RESULTS=40 cắt không báo; tìm không bỏ dấu tiếng Việt
Task 6: minor (deferred): service-card.ts:115-165 các hàm dựng tự đặt lại tham chiếu của nhau (nên gom resetRefs()); nhãn truy cập lặp ("Xoá dịch vụ", "Sửa"); .hint nằm trong <label> gộp vào tên truy cập; banner.ts:21 className ghi đè mọi lớp
Task 6: ⚠️ hành vi động (focus khi gõ Telex/VNI, regroupMoney trên iOS, openTrip theo cỡ màn, refreshLimits mọi thẻ, editHref nội bộ) — Task 7 đã kiểm bằng Chrome (15 ✓); reviewer Task 7 kiểm việc nối đúng; iOS thật ghi ở README "Chưa kiểm"
Task 7: review = Needs fixes — 1 Important (plan-mandated về cấu trúc HTML): Enter/"Search" trong ô tìm danh mục (#catalog-slot nằm trong <form id="order-form">) gửi ngầm CẢ FORM → đơn hợp lệ bị lưu nháp ngoài ý muốn / cuộn tới banner lỗi bỏ lại danh sách kết quả; smoke cũ chỉ dùng setInput nên không bắt.
Task 7: Ruling: SỬA — chặn keydown Enter CHỈ ở ô tìm (input type=search) bằng preventDefault trong web/order-form.ts; các ô văn bản khác giữ hành vi form thường — chi phí nếu sai: 3 dòng; nếu bỏ: lưu đơn ngoài ý muốn ở luồng chính (tìm dịch vụ rồi Enter).
Task 7: minor (deferred): order-form.ts:25,216,227 isPhone chỉ (max-width:640px) đọc một lần → 641–959px banner cuối form nằm ngoài khung nhìn khi lỗi, xoay màn hình cuộn sai
Task 7: minor (deferred): order-form.ts:214-216,237 nút Lưu bật lại trước khi banner catalog_changed hiện (await refreshCatalogAfterConflict) — có thể bấm Lưu lần hai với giá cũ (máy chủ vẫn trả catalog_changed)
Task 7: minor (deferred): order-form.ts:193,202-204 catch{} nuốt lỗi + bỏ qua thẻ mà danh mục không còn mã → banner nói "đã cập nhật giá mới" trong khi giá không đổi
Task 7: minor (deferred): order-form.ts:280-290 loadOrder lỗi/non-draft → lockForm chỉ vẽ banner ở #error đầu trang (người dùng ở cuối form), form đóng băng không thấy lý do
Task 7: minor (deferred): order-form.ts:173-178,213-214 not_editable vẽ cùng banner hai lần (#error và #save-error, cả hai role=alert; bản dưới form inert)
Task 7: minor (deferred): order-form.ts:84-88 unmount không chặn indexOf === -1 (gọi đôi xoá nhầm thẻ cuối)
Task 7: minor (deferred): order-form.ts:146-147 else-if chỉ báo một trong hai lỗi giảm giá > tạm tính / cọc > tổng cộng
Task 7: minor (deferred): order-form.ts:230,180-184 setSaving(true) đặt inert lên form chứa nút Lưu có focus → focus rơi về body, sau lỗi không trả; validate() có trường focus nhưng chỉ scrollIntoView, không .focus()
Task 7: minor (deferred): order-form.ts:235 sau lưu thành công saving mãi true và form inert — iOS bfcache khi vuốt Back có thể còn trang chết "Đang lưu…"; không có pageshow xử lý (đáng cân nhắc ở rà cuối)
Task 7: minor (deferred): app.css:347 cột tóm tắt dính ≥960px không giới hạn chiều cao; app.css:142-145,176-184 còn quy tắc .item*/.catalog-pick* của form cũ (không còn dùng); khoảng trống kiểm thử: PUT sửa thành công, khoá not_editable/không canModify, mất mạng, giữ đơn giá thương lượng qua UI, trần 20 dịch vụ, phím Enter
Task 7: ⚠️ số liệu tsc/test/e2e/Chrome do implementer báo — controller sẽ chạy kiểm cuối ở Task 10 và rà cuối
ĐỢT SỬA 1 (dispatch ~22:52, resume implementer Task 7 ab4c25af8c3213fbb): A = Task 6 vòng focus bộ đếm (app.css), B = Task 7 Enter ô tìm (order-form.ts); hai commit riêng, kèm kiểm Chrome mới trong kịch bản tạm a2-smoke-form.mjs; báo cáo sửa ghi vào task-6-report.md và task-7-report.md.
Task 8: implementer DONE (commit 0874992; test order-view đỏ→xanh 7/7; tsc web 0; kịch bản order 8 ✓; npm test 230; e2e 5/5). Task 9: implementer DONE (commit 191c38a; kịch bản sheet 11 ✓, order 8 ✓, form 15 ✓; tsc 0; npm test 230; e2e 5/5). Reviewers T8 (diff review-78a8acf..0874992.diff) và T9 (review-0874992..191c38a.diff) dispatched song song ~22:52.
Task 8: review = Approved (spec ✅; 0 Critical/Important)
Task 8: minor (deferred): order.ts:90-105/107-115 POST /status thành công mà load() sau đó lỗi → load() nuốt lỗi bằng banner "Không tải được đơn." không có nút "Tải lại đơn", nút vừa bấm vẫn disabled, nút cũ còn bấm được; lỗi mạng ở load() không đi qua errorBanner
Task 8: minor (deferred): order.ts:90-105 khi yêu cầu đang bay chỉ nút vừa bấm bị vô hiệu — có thể gửi hai POST /status song song (có từ trước)
Task 8: minor (deferred): order-services.ts:18-19 điều kiện catalogPrice !== null thừa (chỉ thu hẹp kiểu); chữ "Khác giá danh mục" cứng ở tệp DOM trong khi catalogTag ở order-view; hai hàm `kv` cùng tên khác chữ ký (order.ts:35, order-services.ts:12); LineView.id không dùng (order-view.ts:8); thiếu test items rỗng và serviceView với price_changed
Task 8: ⚠️ kịch bản Chrome/số liệu do implementer báo; trạng thái trung gian (đơn xác nhận chưa có nút Sửa chuyến) đúng brief — Task 9 lấp; controller kiểm ở kiểm cuối Task 10
Task 8: complete (commits 78a8acf..0874992, review clean)
Task 6: fix round 1/5 (1 addressed pending re-review — vòng focus bộ đếm; commit 2ab7036 — Chrome: nhóm 4b ĐỎ offset dương → XANH offset âm; e2e pwa xanh)
Task 7: fix round 1/5 (1 addressed pending re-review — Enter ô tìm; commit b67f4bf — Chrome: nhóm 2b phím Enter THẬT qua CDP ĐỎ → XANH; tsc web 0; npm test 230; e2e 4/4). Kịch bản tạm a2-smoke-form.mjs nay 17 dòng ✓ (kế hoạch ghi 15) — ghi nhận lệch có chủ đích: bản chép vào docs/evidence ở Task 10 mang 17.
Task 9: review = Approved (spec ✅; 0 Critical/Important)
Task 9: minor (deferred): trip-sheet.ts:244–246 saving=false đặt SAU renderBanner/scrollIntoView trong catch — nếu ném lỗi, saving kẹt true và bảng không đóng được (nên đưa lên đầu catch/finally)
Task 9: minor (deferred): trip-sheet.ts:231–235 đường thành công (close(false); o.onSaved()) nằm trong try — nếu onSaved ném đồng bộ, catch vẽ banner mạng vào bảng đã gỡ (hiện onSaved không ném)
Task 9: minor (deferred): api() không timeout + bảng không đóng được khi đang lưu ⇒ treo trên mạng yếu; đề xuất AbortController 20–30s
Task 9: minor (deferred): trip-sheet.ts:210 gỡ inert vô điều kiện khỏi mọi con của body (hiện an toàn); aria-live thay toàn bộ nội dung mỗi phím; nút Lưu disabled mất focus, không trả sau lỗi; dialog.focus() nên preventScroll; .sheet-scrim nhận chạm ngay khi mở (bấm đúp "Sửa thông tin chuyến" đóng bảng — nên pointer-events:none tới khi .open)
Task 9: minor (deferred): app.css:356 `@media (max-width:640px){ .actions .btn-primary{flex-grow:1.5} }` áp cho MỌI .actions — nút Lưu ở /catalog (Lưu ghi đè) và /locations (Lưu) rộng gấp 1,5 nút Đóng (chỉ hình thức; nên #actions .btn-primary)
Task 9: minor (deferred): banner "không thuộc đơn này" ghi "Đã tải lại đơn" nhưng chỉ có nút (đã park ở Task 5 với ruling); sau lưu thành công mà load() lỗi → "Không tải được đơn." không nói đã lưu; khoảng trống kiểm thử: không có test tự động trong repo cho trip-sheet.ts
Task 9: ⚠️ đơn đã huỷ không có nút — giải quyết: test orderActions("cancelled", true/false) của Task 8 phủ; ⚠️ iOS Safari thật (inert ≥15.5, 100dvh ≥15.4, khoá cuộn) — ghi ở README "Chưa kiểm" (Task 10)
Task 9: complete (commits 0874992..191c38a, review clean)
(~23:10) Dispatch song song: (1) re-review đợt sửa 1 (sonnet; diff review-191c38a..b67f4bf.diff, xác nhận Task 6 focus + Task 7 Enter), (2) RÀ SOÁT TOÀN NHÁNH A2 (opus; diff review-67e65dd..b67f4bf.diff, trỏ tới sổ Minor hoãn), (3) Task 10 implementer (sonnet; BASE b67f4bf; brief task-10-brief.md; report task-10-report.md) — Task 10 không đổi mã ứng dụng; bỏ chạy lại 3 smoke.
Task 6: fix round 1/5 (1 addressed, 0 open — vòng focus bộ đếm; commit 2ab7036; re-review: ADDRESSED, không hỏng mới)
Task 7: fix round 1/5 (1 addressed, 0 open — Enter ô tìm; commit b67f4bf; re-review: ADDRESSED, không hỏng mới)
Task 7: minor (deferred): order-form.ts:221 handler Enter không kiểm e.isComposing (Enter khi đang soạn dấu tiếng Việt cũng bị preventDefault; chưa thấy tác hại, chưa thử iPhone thật) — đưa vào danh mục thử iPhone thật; Enter ở các ô text khác vẫn gửi form (theo ruling); .counter overflow:hidden có thể xén mẩu nhỏ ở góc bo ngoài của vòng focus (thẩm mỹ)
Task 6: complete (commits 7ebc87a..aa59d71 + fix 2ab7036, re-review clean)
Task 7: complete (commits aa59d71..78a8acf + fix b67f4bf, re-review clean)
Task 10: implementer DONE_WITH_CONCERNS (commit 19d7e4c; a2-evidence OK 34 ảnh; axe 0 vi phạm ở 13 trạng thái A2; đo 8/8 sạch; hồi quy 8 trang cũ sạch (axe trang cũ chỉ ghi: /catalog color-contrast serious do .row-off opacity .6 có từ trước; empty-table-header minor ở /catalog,/staff,/locations); font swap+cache SW; npm test 230; typecheck 0; e2e 10/10 + audit-invariants (có mạng); 6 tài liệu đã sửa). Lo ngại: theo ruling KHÔNG chạy lại ba smoke trên bản cuối — README nói rõ; số 17/8/11 là số `ok(` đếm trong tệp (bản form 17 dòng đã được implementer đợt sửa chạy xanh lúc commit b67f4bf). Reviewer dispatched (sonnet, diff review-b67f4bf..19d7e4c.diff). Rà soát toàn nhánh (opus) vẫn đang chạy.
RÀ SOÁT TOÀN NHÁNH (opus, 67e65dd..b67f4bf): 0 Critical; 6 Important; Ready to merge = With fixes.
 I1 service-form.ts:173-178 setPax chuyển bản chụp→live kể cả khi số khách quay về giá trị cũ (mất đơn giá thương lượng + nhãn lệch giá form≠trang đơn) — đường tiền
 I2 order-form.ts:235,240 sau lưu thành công saving mãi true, form inert → iOS bfcache khi vuốt Back trả form chết "Đang lưu…" (PWA không có nút tải lại)
 I3 api() không timeout + bảng không đóng được khi đang lưu = kẹt không lối ra (trip-sheet.ts:97-114, order-form.ts:180-184,235)
 I4 order.ts:118-125,137 POST /status thành công nhưng load() lỗi → banner "Không tải được đơn." không có nút "Tải lại đơn", nút vẫn disabled
 I5 catalog-picker.ts:24,37,48 ARIA listbox/option sai (listbox không tên, con không phải option, disabled giấu mục khỏi cây truy cập) + cổng axe không phủ trạng thái danh sách mở/rỗng
 I6 order-form.ts:25,216,232 isPhone chỉ (max-width:640px) đọc một lần; ở 641–959px thanh Lưu dính nhưng banner cuối form → lỗi cuộn tới ô, không có lời giải thích
 + Minor được nâng: .sheet-scrim nhận chạm ngay khi mở (pointer-events); chuỗi tiếng Anh "Form đang khoá." (order-form.ts:108).
 Ledger triage của reviewer: các Minor còn lại ĐỒNG Ý ĐỂ LẠI; Task 2 minors gom vào tài liệu/chú thích; CSS chết .item*/.catalog-pick* dọn; Task 8 "hai POST /status song song" = nợ kỹ thuật riêng.
Ruling (~23:25): ĐỒNG Ý sửa I1–I6 + scrim + chuỗi tiếng Anh, MỘT implementer sửa (đúng quy trình: một đợt sửa cuối cho cả nhánh) + MỘT re-review phạm vi. Thêm vào đợt sửa (rẻ, không đổi thiết kế): (a) 409 mặc định action reload_order ở trang đơn (I4/R3); (b) bằng chứng Task 10: axe khi danh sách danh mục đang mở/rỗng, kiểm pageshow persisted (giả lập), phép đo thời gian gõ ở đơn 20 dịch vụ (P1/P2) — chỉnh kịch bản trong docs/evidence và chạy lại bằng chứng; (c) tài liệu/chú thích Task 2 (sw-policy.ts:7, docs/PWA-IPHONE.md, app.css:46 8,6→8,0, pwa.mjs:58 === 6), dọn CSS chết, README "Chưa kiểm" bổ sung (inert iOS ≥15.5, 100dvh ≥15.4, khoá cuộn nền, Back/bfcache, IME tiếng Việt), HANDOFF/README ghi trip-sheet.ts không có kiểm tự động — sửa phải chạy lại kịch bản. Timeout api = 45 giây (an toàn cho đồng bộ Sheet của admin ~15s) — chi phí nếu sai: hết giờ sớm ở thao tác rất chậm hiện banner mạng, người dùng thử lại.
Ruling: KHÔNG làm (ghi nợ): các Minor còn lại đã liệt kê; đo hiệu năng chỉ ghi số (không tối ưu O(n²) trừ khi đo vượt 100ms trong Chrome desktop — nếu vượt thì báo, không tự tối ưu).

## Đợt sửa cuối (sau rà soát toàn nhánh) — BASE 19d7e4c
- Brief: fix-wave-brief.md (4 nhóm/4 commit: I1 setPax; I2/I3/I4+scrim; I5/I6+chuỗi EN; tài liệu/CSS chết/bằng chứng). Implementer: sonnet, MỘT dispatch. Phát hiện của reviewer Task 10 (nếu có) gửi bổ sung trước Nhóm 4.
- 23:40 Review Task 10 (a0cc26f1546110a7c): ĐẠT, không Critical. Important 1: README thiếu "IME tiếng Việt / nhập chỉ là gán value + bắn input" ở mục Chưa kiểm. Minor 1–6 (văn bản README/tests/e2e/README).
- Ruling: nhận Important 1 + Minor 1–6 vào Nhóm 4 (chỉ là văn bản, không ảnh hưởng số liệu) — Minor 7 (ket-qua-do.json không đóng dấu HEAD, startEnv mồ côi wrangler khi Chrome không lên, lỗi net:: không đếm, ảnh tt-* là ảnh khung nhìn) HOÃN, ghi "Tồn đọng nhỏ" — không đổi hành vi giao diện, tiêu tốn thêm một vòng — chi phí nếu sai: một vài dòng phải sửa ở đợt sau.
- Đợt sửa cuối: implementer DONE_WITH_CONCERNS — commits c49e547 (I1), df696be (I2/I3/I4+scrim), ad54b00 (I5/I6+chuỗi EN), 9b5f0fd (tài liệu/CSS chết/bằng chứng). Báo: npm test 234, tsc 0, e2e 10/10, Chrome form 19/order 10/sheet 13, a2-evidence axe 15 trạng thái 0 vi phạm, hiệu năng 0,4 ms/phím ở 20 dịch vụ. Lo ngại: (1) banner incomplete_trip có thêm nút "Tải lại đơn" cạnh liên kết "Sửa" (hệ quả quy tắc 409→reload_order); (2) lệch nhỏ: setPax giữ nguyên thẻ đang là bản chụp; pageshow thêm && saving; api() ném lại lỗi hết giờ giữa lúc đọc thân; (3) hash kiem-tra-may.txt = ad54b00 + ghi chú; (4) I1 chỉ có test đơn vị trong repo, kiểm DOM ở kịch bản tạm.
- RE-REVIEW PHẠM VI đợt sửa cuối (sonnet a37f408f2b8dc6486, 19d7e4c..9b5f0fd): 0 Critical; I2–I6/scrim/EN/CSS chết/tài liệu/kịch bản = ADDRESSED; số liệu bằng chứng khớp (234 test, 34 ảnh, axe 15/0, font 4/6, 0,4ms). Important 1 (I1 hẹp): khôi phục bản chụp khi số khách quay về giá trị đã lưu đè mất đơn giá VỪA GÕ ở chế độ giá hiện tại (2→3, gõ 1.234.000, →2 ⇒ 1.300.000; mã cũ giữ 1.234.000) — hồi quy do chính bản sửa I1. Minor: (2) I2+location.assign ⇒ sau khi tạo đơn, Back→bfcache mở khoá form còn dữ liệu, POST /api/orders không idempotent ⇒ có thể tạo đơn TRÙNG (đề xuất location.replace); (3) scrim chỉ bảo vệ ~1–2 khung hình (.open sau 2 rAF, bảng trượt 300ms) — chú thích smoke nói quá; (4) banner incomplete_trip có nút "Tải lại đơn" trái ma trận §5.2 (khuyến nghị thu hẹp quy tắc 409→reload_order để loại incomplete_trip, chụp lại 1i); (5) message máy chủ invalid_transition có mã trạng thái tiếng Anh ("cancelled"); (6) a2-smoke-sheet.mjs:110 phụ thuộc chuỗi ms===45000.
Ruling (2026-09-21): VI PHẠM có chủ đích ruling "không có đợt sửa thứ hai" ở MỘT vi-đợt nhỏ (resume implementer afe2f4e64405a0d5e, 2 commit): làm (a) Important 1 — giữ đơn giá gõ tay ở chế độ live khi khôi phục (heuristic khác defaultPrices(item), cùng cách refreshFromCatalog) + test đơn vị + phép kiểm DOM đưa vào kịch bản trong repo; (b) Minor 2 — location.assign→location.replace sau khi lưu thành công (chặn quay về form và tạo đơn trùng), kèm phép kiểm Page.getNavigationHistory; (c) Minor 4 — quy tắc 409→reload_order loại incomplete_trip (đúng ma trận §5.2), chụp lại 1i; (d) sửa chú thích smoke nói quá về scrim. Lý do: (a) là hồi quy trên đường tiền do chính bản sửa I1 tạo ra, (b) mở đường tạo đơn trùng do chính bản sửa I2 mở ra — đều ≤10 dòng, có phép kiểm phủ; chi phí nếu bỏ: mất giá thương lượng lặng lẽ / đơn trùng trên iPhone. KHÔNG làm, ghi "Tồn đọng nhỏ": scrim chỉ bảo vệ ~2 khung hình (Minor 3), message máy chủ invalid_transition tiếng Anh (Minor 5), ms===45000 trong smoke-sheet (Minor 6), timeout 45s có thể gửi "bấm Lưu lại" cho yêu cầu tạo đơn đã xử lý xong (không idempotency-key). Không dispatch reviewer lần ba: controller đọc diff + chạy lại cổng — chi phí nếu sai: lỗi lọt vào bản chủ dự án ký (được giảm nhờ phép kiểm đỏ→xanh).
- Vi-đợt sửa: implementer DONE_WITH_CONCERNS — 1809ffb (I1-bis giữ đơn giá gõ tay khi quay về bản chụp; location.replace sau khi lưu; 409 reload_order loại incomplete_trip; sửa chú thích scrim ở smoke) + 7812376 (bằng chứng chạy lại, chụp lại 1i, README Tồn đọng nhỏ, kiem-tra-may.txt HEAD 1809ffb). Số liệu: npm test 236, tsc 0, e2e 10/10 + audit-invariants, Chrome form 21/order 10/sheet 13, evidence 7 ✓ (axe 15/0). Controller đọc diff mã + chạy lại: npm test 236/236, typecheck 0, e2e pwa xanh — ĐẠT; sửa thêm chú thích .sheet-scrim ở app.css (nói đúng giới hạn).
Nhánh sẵn sàng kết thúc: chờ chủ dự án ký thị giác + thử iPhone thật; KHÔNG đẩy/merge/triển khai.
