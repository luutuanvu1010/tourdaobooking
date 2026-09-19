# HANDOFF — tiếp tục thi công A1 (thông tin chuyến đi theo dịch vụ) trong phiên mới

Viết 2026-09-19 khi đang thi công bằng kỹ năng `superpowers:subagent-driven-development`. Đọc file này, rồi kế hoạch, rồi ledger — theo thứ tự đó.

## 1. Bắt đầu ở đâu

| | |
|---|---|
| Worktree | `/Users/tuanbao/Documents/Projects/ctytnhhtourdao/tourdao-sales/.claude/worktrees/thong-tin-chuyen-di` (nhánh `worktree-thong-tin-chuyen-di`, **chưa merge, chưa push**; repo chưa có remote) |
| Kế hoạch | `docs/superpowers/plans/2026-09-19-thong-tin-chuyen-di-a1.md` (10 Task, mã đầy đủ trong từng Task) |
| Spec (thẩm quyền ràng buộc) | `docs/superpowers/specs/2026-09-19-thong-tin-chuyen-di-design.md` (bản 2, chủ dự án đã duyệt) |
| Ledger SDD (git-ignored, còn trong worktree) | `.superpowers/sdd/2026-09-19-thong-tin-chuyen-di-a1/progress.md` — dòng đầu đúng tên kế hoạch; kỹ năng tự đọc và **không dispatch lại Task đã `complete`** |
| Brief/báo cáo từng Task (git-ignored) | cùng thư mục: `task-N-brief.md`, `task-N-report.md`, `review-*.diff` |

Việc đầu tiên trong phiên mới: `cd` vào worktree, gọi kỹ năng `superpowers:subagent-driven-development` với kế hoạch trên (nó sẽ tìm thấy ledger và tiếp tục), rồi:

```bash
git log --oneline -12            # mã thi công dừng ở Task 7 (8cc6206); các commit sau đó chỉ là tài liệu (kế hoạch/handoff); xem ledger
ls node_modules                  # phải có (symlink tới checkout gốc); nếu mất: ln -s /Users/tuanbao/Documents/Projects/ctytnhhtourdao/tourdao-sales/node_modules node_modules
npm test                         # kỳ vọng ở HEAD Task 7: # tests 88, # pass 88
npx tsc --noEmit && npx tsc --noEmit -p web   # cả hai sạch ở HEAD Task 7
```

## 2. Trạng thái tại thời điểm handoff

| Task | Nội dung | Trạng thái | Commit |
|---|---|---|---|
| 1 | `shared/vn-date.ts` | ✅ complete (review sạch) | `f6a3c10` |
| 2 | `shared/order-lines.ts` | ✅ complete | `e5f4ae7` |
| 3 | migration `0008_order_service.sql` + test SQL | ✅ complete | `0acfa27` |
| 4 | catalog `toEffective` + `getEffectiveServices` | ✅ complete | `41434ae` |
| 5 | luật một dịch vụ (`fields.ts`, `service-rules.ts`), contracts (thêm kiểu), audit `trip_updated` | ✅ complete (review bằng opus, có thử tấn công) | `ac7b4a6` |
| 6 | `validateOrder(input, ctx)` + shim tạm ở `orders/index.ts` | ✅ complete | `31622f5` |
| 7 | e2e viết trước (ĐỎ có chủ ý) | ⚠️ đã commit `8cc6206` (khớp chính xác bản đã kiểm chứng). Review (sonnet) = **Needs fixes**: 1 Important + Minor. **Vòng sửa 1 đã chuẩn bị và kiểm chứng trước, CHƯA áp dụng** — nằm ở cuối mục Task 7 của kế hoạch ("Vòng sửa 1 của Task 7", có diff). Chưa có `Task 7: complete` | `8cc6206` |
| 8 | repository + service + route (làm e2e XANH) | ⏳ chưa làm | — |
| 10 (= "8b") | bổ sung sau review: nhóm từ chối khách loại khác; ký tự điều khiển Unicode | ⏳ chưa làm, làm SAU Task 8, TRƯỚC Task 9 | — |
| 9 | đồng bộ tài liệu + kiểm tra cuối | ⏳ chưa làm | — |
| — | review cuối toàn nhánh (opus) → `finishing-a-development-branch` | ⏳ | — |

Kỳ vọng ở HEAD Task 7 nếu chạy e2e: `npm run test:e2e -- platform orders trip` → `platform` xanh, `orders` đỏ (`TypeError … 'flatMap'`), `trip` đỏ (`AssertionError … actual: 400, expected: 201`), `E2E: 2/3 kịch bản LỖI`. **Đỏ này là đúng** (chưa có repository mới).

## 3. Cách làm đã dùng (giữ nguyên để nhất quán)

- **Mỗi Task**: ghi `BASE=$(git rev-parse HEAD)` → `scripts/task-brief PLAN N` (brief vào workspace) → dispatch implementer → nhận báo cáo → **đối chiếu chép-chính-xác** (xem §5) → `scripts/review-package PLAN BASE HEAD` → dispatch task reviewer → ghi ledger.
  Các script: `/Users/tuanbao/.claude/plugins/cache/claude-plugins-official/superpowers/6.3.0/skills/subagent-driven-development/scripts/{task-brief,review-package,sdd-workspace}`; mẫu prompt cùng thư mục cha (`implementer-prompt.md`, `task-reviewer-prompt.md`, `re-review-prompt.md`).
- **Model**: implementer `haiku` cho Task chép mã ngắn (1–4, 6), `sonnet` cho Task dài/nhiều file/sửa tài liệu (5, 7, 8, 9, 10); reviewer `sonnet`, riêng Task có logic rủi ro cao (5, **8**) dùng `opus`; review cuối `opus`. Luôn chỉ định `model` tường minh.
- **Task 8 nên dùng implementer `sonnet` và reviewer `opus`**: chứa SQL điều kiện tranh chấp (`wonGuard`, `UPDATE` xác nhận có điều kiện), khoá lạc quan, route mới. Yêu cầu reviewer chú ý: (a) `wonGuard`/`AuditInput.id`, (b) điều kiện xác nhận nằm trong câu UPDATE, (c) `PUT` phải đòi `expectedUpdatedAt` non-null, (d) nhật ký không chứa giá trị địa điểm/ghi chú.
- **Implementer/reviewer là subagent**, dispatch prompt ngắn, chỉ đường dẫn brief + report; implementer ghi báo cáo vào `task-N-report.md` và trả về < 15 dòng. Không dispatch nhiều implementer song song.
- **Bỏ qua các bước "(khuyến nghị, không commit)" đột biến** trong kế hoạch khi giao implementer — controller đã chạy đủ (8/8 SQL, 3/3 e2e) trên đúng mã đó (ledger, Ruling 1).
- **Bash trong phiên cô lập worktree** từ chối lệnh ghép/heredoc/`cd &&`/biến tính toán. Dùng lệnh đơn; ghi file bằng Write/Edit (đường dẫn tuyệt đối); các script Python phụ trợ để trong file rồi chạy `python3 file`.
- Commit: hai `-m`, dòng thứ hai `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>` (theo brief). Các commit của implementer haiku ký "Claude Haiku 4.5" — đã quyết giữ nguyên (ledger).

## 4. Việc còn lại, đúng thứ tự

1. **Chốt Task 7 — vòng sửa 1** (đã có sẵn diff kiểm chứng trong kế hoạch): trích lại brief `task-brief PLAN 7` (nó đã gồm mục "Vòng sửa 1"), dispatch một implementer **sonnet** mới (phiên mới không "resume" được agent cũ) với: đường dẫn brief, đường dẫn `task-7-report.md` (nối thêm báo cáo sửa), và **findings nguyên văn** = Important: "bài đua lưu-xoá-ngày ↔ xác nhận chỉ kiểm trạng thái cuối, không kiểm mã trả về → bên thua trả 500 vẫn xanh" + các Minor đã chọn (liệt kê trong mục "Vòng sửa 1"). Implementer chỉ sửa `tests/e2e/trip.mjs`, `tests/e2e/orders.mjs`, KHÔNG sửa `src/`. Sau đó `review-package PLAN 8cc6206 HEAD` → re-review phạm vi hẹp (`re-review-prompt.md`, model sonnet) → ghi `Task 7: complete`. Sau sửa, `python3 …/cmp_stage.py 7` (nếu còn) vẫn in OK vì chấp nhận bản đã sửa (`tmp/a1f`). Đây là vòng sửa 1/5.
2. **Task 8** (`task-brief PLAN 8`, 692 dòng): implementer `sonnet`. Kết quả bắt buộc: `npx tsc --noEmit` sạch; `npm test` `# tests 88`; `npx tsc --noEmit -p web` **đúng 4 lỗi** (`web/order-form.ts` ×2, `web/order.ts` ×2 — thuộc A2, không sửa); `npm run test:e2e` → `E2E: 6/6 kịch bản xanh` (cần mạng: `admin`/`catalog` đọc Google Sheet thật); trong `trip` phải thấy đủ 12 dòng `✓`. Đối chiếu chính xác (§5) với `stage8`. Review bằng `opus`.
3. **Task 10 (= 8b)** (`task-brief PLAN 10`, 152 dòng): bước ĐỎ đúng 3 test (`# pass 33`, `# fail 3`), sau đó `# tests 91`, `tsc` sạch, e2e `platform orders trip` 3/3 xanh.
4. **Task 9** (`task-brief PLAN 9`): sửa 5 tài liệu; các bước 1–9 làm đúng thứ tự (anchor đã kiểm duy nhất theo từng trạng thái). Bước 10: `# tests 91`, e2e 6/6, `tsc -p web` vẫn đúng 4 lỗi.
5. **Review toàn nhánh** (`opus`, `superpowers:requesting-code-review` `code-reviewer.md`): `review-package PLAN <MERGE_BASE> HEAD` với `MERGE_BASE=$(git merge-base main HEAD)` (= `9286a10`, commit của `main` lúc tạo worktree). Diff sẽ gồm cả các commit spec/kế hoạch/handoff (chỉ là tài liệu) — bảo reviewer tập trung vào `src/`, `migrations/`, `tests/`; mã thi công bắt đầu từ `f6a3c10`. Chỉ vào các dòng `minor (deferred)`/`Ruling` trong ledger để reviewer phân loại cái nào phải sửa trước khi merge. Nếu có phát hiện: MỘT lượt sửa (một subagent, toàn bộ danh sách) + MỘT re-review.
6. **Kết thúc** (`superpowers:finishing-a-development-branch`): **KHÔNG merge vào `main`, không push, không áp migration remote, không deploy** — A1 thay đổi hợp đồng API nên `web/` vỡ (4 lỗi `tsc`), **A1 + A2 phải cùng xong trước khi merge/deploy**. Báo chủ dự án; xoá workspace `.superpowers/sdd/<plan>/` sau khi đã tổng hợp phán quyết.
   Trong tin nhắn cuối phải có mục **"Rulings I made"**: gom mọi dòng `Ruling:` của ledger theo thứ tự, mỗi dòng kèm "chi phí nếu sai".

## 5. Kiểm chứng bằng bản đã dựng sẵn (tuỳ chọn — có thể đã bị xoá)

Controller đã dựng và chạy thật toàn bộ mã của kế hoạch trong thư mục tạm của job cũ: `/Users/tuanbao/.claude/jobs/80c8fdcd/tmp/` (`a1` = mã cuối trước 8b; `a1b` = a1 + 8b; `stages/stageN` = trạng thái cộng dồn sau Task N; `cmp_stage.py N` đối chiếu worktree với `stageN`; `docsnips.py`/`dryrun_docs.py` cho Task 9). Thư mục này bị xoá khi job bị xoá → **không được coi là có sẵn**. Nếu còn: `python3 …/cmp_stage.py 8` in `OK: worktree khớp chính xác…` là bằng chứng chép đúng mã. Nếu không còn: kế hoạch chứa đủ mã, và các lệnh kiểm ở §2/§4 (`npm test`, `tsc`, `test:e2e`) là tiêu chí nghiệm thu.

## 6. Phán quyết và phát hiện hoãn (từ ledger) — phải đưa vào review cuối

**Rulings**
1. Bỏ qua các bước đột biến "khuyến nghị" khi giao implementer (đã chạy đủ). Chi phí nếu sai: đột biến chưa kiểm trên bản lệch — nhưng đối chiếu chính xác nên không lệch.
2. Model: haiku (1–4, 6), sonnet (5, 7, 8, 9, 10), reviewer sonnet/opus, review cuối opus. Chi phí nếu sai: thêm vòng sửa.
3. `node_modules` được controller liên kết trước khi dispatch.
4. Dịch vụ tính theo NHÓM bỏ qua khách loại khác `adult` là lỗ hổng thật → sửa ở Task 10 (8b), không sửa sớm để giữ đối chiếu Task 3–8. Chi phí nếu sai: hai commit cùng file; Task 2–8 tạm có lỗ hổng trên nhánh chưa merge.
5. `cleanText` để lọt U+2028/2029 + ký tự điều hướng hai chiều → gia cố ở Task 10 (giữ U+200B–200D cho emoji).
6. Commit của implementer haiku ký "Claude Haiku 4.5" — giữ nguyên. Chi phí nếu sai: dòng đồng tác giả không đồng nhất; có thể rebase.

**Minor hoãn (đã ghi ledger)**
- T1: `addDays` không kiểm ngày hợp lệ (nơi gọi trên input người dùng phải `isISODate` trước); `web/tsconfig.json` thiếu `allowImportingTsExtensions` — A2 import giá trị từ file shared có `import … from "./vn-date.ts"` sẽ gặp TS5097.
- T2: cap từng loại thừa với cap tổng → gõ 51 nhận "không hợp lệ" thay vì "Tối đa 50 khách".
- T3: `order_service_confirmed_keeps_date` bắn theo `NEW.depart_date IS NULL` (đơn cũ đã xác nhận có dịch vụ backfill không ngày sẽ bị từ chối mọi UPDATE dịch vụ đó cho tới khi có ngày — đúng ý, `validateTripUpdate` khớp); `ON DELETE CASCADE` từ `orders` bỏ qua trigger `frozen_delete` (mã không xoá đơn; mọi đường xoá đơn tương lai phải tự chặn); khoảng hở test SQL (đơn hai dịch vụ một cái lỗi; đơn đã huỷ; `checkin_time`; đổi `order_id`).
- T4: `getEffectiveServices` chưa có unit test (cần D1) — e2e `trip` phủ; `loadAll` lọc theo `codes` bằng JS (vài chục dòng); thiếu assertion "ẩn + có ghi đè giá".
- T5: tên dịch vụ nhập tay đi nguyên vào chuỗi nhật ký `trip_updated` (đúng chữ spec, có thể chứa dữ liệu cá nhân nhân viên gõ); `ServiceFailure.details` là `unknown`; `catalogPriceSeen` thừa khoá bị bỏ qua trong khi `unitPrices` thừa khoá báo lỗi.
- T6: test "tổng tiền có trần" chạm trần từng dòng trước nên nhánh trần tổng đơn chưa có test riêng; `expectedUpdatedAt` sai kiểu bị ép về `null` (Task 8: `PUT` đã đòi non-null); header comment `rules.ts:3` hơi cũ.

## 7. Rủi ro/việc ngoài A1 cần nhớ (không chặn A1)

- **Giới hạn số câu lệnh mỗi `db.batch` trên D1 production chưa kiểm chứng.** Đơn lớn nhất hợp lệ ≈ 74 câu (hiện 52); `wrangler dev` không thực thi giới hạn đó. Trước khi triển khai: đọc tài liệu D1; nếu không đủ thì HẠ `MAX_SERVICES`/`MAX_LINES_PER_ORDER`, không chia lô.
- **`0007` trên remote**: `HANDOFF-M4` ghi "chưa áp", bộ nhớ dự án ghi "đã áp" — kiểm bằng `npx wrangler d1 migrations list tourdao-sales-db --remote` trước khi áp `0008`. Áp remote/deploy do chủ dự án chạy (bị chặn với Claude).
- **Phần B (vai trò Guide)** chưa có spec riêng; cần link Google Sheet danh sách HDV từ chủ dự án. Quyết định đã chốt nằm ở mục 10 của spec. **A2 (giao diện)** và **A3 (danh sách: `nextDepartDate`, `?depart=`)** chưa có kế hoạch — lập sau khi A1 xong.
- Danh mục đã tồn tại `TD*`/`TTB*` từ Google Sheet thật; dịch vụ nhóm `TTB03` (phao chuối, `per5Pax`) là ca thật của lỗ hổng "khách loại khác bị bỏ qua".
