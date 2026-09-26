# Bảng tin (ADR-0022) — bàn giao cho phiên điều phối (2026-09-26)

> Viết bởi phiên thi công (vai điều phối thi công, subagent-driven). Đọc kèm: kế hoạch `docs/superpowers/plans/2026-09-25-bang-tin-ke-hoach.md`, nhật ký `docs/superpowers/plans/2026-09-25-bang-tin-thi-cong-nhat-ky.md`. Không push, không deploy, không gộp `main` — việc của chủ.

## 1. Chỗ làm việc

- Worktree: `.claude/worktrees/bang-tin`, nhánh `bang-tin` (tạo từ `origin/main` = `823c1b1`, **đã bỏ upstream** để không trỏ `origin/main`). Đã `npm ci` trong worktree; **không** có `.dev.vars` (N10) — binding khai tay trong `worker-configuration.d.ts`.
- Sổ điều phối SDD (git-ignored, còn trên đĩa trong worktree): `.superpowers/sdd/2026-09-25-bang-tin-ke-hoach/` — `progress.md` (sổ), `global-constraints.md` (ràng buộc chung + tiêu chí nghiệm thu trích nguyên văn + số dòng DP-1 mới), `task-N-brief.md` (đã có 1–11), `task-N-report.md`, `review-*.diff`, `cloudflare-docs.md` (tra tài liệu Cloudflare kèm URL), log e2e.
- Công cụ cho kịch bản Chrome: `AXE_JS=/Users/tuanbao/.claude/jobs/719c2c4a/tmp/axe/axe.min.js` (axe 4.13.0; thư mục tạm của phiên này — phiên khác nên chép lại bản `/private/tmp/tourdao-axe/package/axe.min.js`), `CHROME_BIN=docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh`.

## 2. Đã xong (mỗi task: người thi công subagent → người kiểm subagent riêng; không ai tự nghiệm thu)

| Task | Commit | Kiểm |
|---|---|---|
| 0 — điều kiện trước, nhật ký, mốc | `9df7fb4`, `c729a29` | mốc: `npm test` 800/800, typecheck 0, e2e 19/19, audit 34/35 (ca đỏ SẴN CÓ "P4 FINDING HDV") |
| 1+2 — hàm thuần nhãn/sự kiện/nối lại/thông báo nổi (`src/shared/bang-tin.ts`) | `492dce5`, `9c5efa5` | duyệt, sạch; NT-3 đã thấy chặn thật |
| 3 — router `ctx.baoThayDoi`/`ctx.dongBangTin` | `8131c8a`, sửa `8e75ed3` | vòng 1: test "ném đồng bộ" không phân biệt → đã sửa, người kiểm lại tự chứng minh trên bản sao |
| 4a — `rules.ts` + hạng `KHONG_DB` (luật kiến trúc + `docs/ARCHITECTURE.md`, chủ đã duyệt) | `eb67b0b`, `b04870a`, sửa `6448002` | vòng 1: hoàn ô "Nguồn" dòng 5.3 Phần I (vượt phạm vi) + sửa câu "mọi tệp .ts" cho khớp mã; KHONG_DB đã thấy chặn thật |
| 4b — trạm Durable Object `BangTin`, route bắt tay, gốc lắp ráp, `wrangler.jsonc` (binding + migration `v1 new_sqlite_classes`), khung thử audit, route-access | `4e8fe59`, `7e12192`, `7a5e816`, `6051058` | người kiểm (opus) duyệt, 0 lỗi nặng; chấp nhận 2 chỗ lệch có chủ ý (`keHoachTram`, quét `getWebSockets()`+`getTags`); e2e sau 4b 19/19 |
| 5 — 8 route ghi đơn gọi `baoThayDoi` + hàng rào `src/bang-tin-guard.test.ts` | `d59aefc` | duyệt, sạch; người kiểm tự tái hiện 2 lần chặn thật + thử thêm route mới không báo → đỏ; `npm test` 862/862; e2e 19/19 (lượt 1 có 8 lỗi 503 `turnstile_unavailable` do mạng tới Cloudflare, chạy lại 8/8 xanh) |
| 6 (+ Task 7 bước 1, 3, ca 9, 10) — đóng kết nối khi đổi tài khoản/bảo trì; hạ tầng e2e WebSocket (`tests/e2e/lib.mjs` dùng `node:http` + bộ đọc khung tự viết, `tests/e2e/bangtin.mjs`, `run.mjs`) | `4207088`, sửa `4b5f47e` | duyệt; người kiểm tự chạy 862/862, typecheck 0, hàng rào 21/21; e2e đủ bộ **20/20** (có kịch bản `bangtin`); vòng 1: sửa câu nhật ký nói sai "sổ hàng rào đã có dòng bảng tin" |

## 3. Trạng thái lúc bàn giao

- Không còn việc dở: cây làm việc sạch, HEAD = commit cuối của Task 6 (vòng sửa 1). Phiên thi công đã dừng.
- **Rủi ro chạy thật "socket ngủ đông":** một nửa đã gỡ — ca 9/10 chứng minh trạm đóng được đúng socket thật (4003) và đóng tất cả khi bật bảo trì. Nửa còn lại (GỬI tin theo nhãn tới đúng người) chờ Task 7 ca 3–6.
- **Bẫy e2e cục bộ đã biết:** `wrangler dev`/Miniflare báo sự kiện đóng socket trễ ~10 giây dù khung Close tới ngay → bộ thử coi "đã đóng" khi ĐỌC được khung Close; `fetch` của Node cấm header `Upgrade` → bắt tay dùng `node:http`.
- **Bẫy thứ tự kịch bản e2e (có sẵn, không do nhánh này):** `passkey` đổi PIN của `salesB` nên phải chạy sau `permissions`; chạy riêng `passkey permissions` sẽ lỗi 401 — dùng đúng thứ tự trong `ALL`.
- **Nhánh khác đang chờ gộp:** `va-3-loi-kiem-toan` (bản 1.14, vá 3 lỗi HIGH — theo bộ nhớ chung, chưa kiểm ở phiên này). Nhánh nào gộp sau thì cập nhật từ `main`, chạy lại toàn bộ kiểm; nhật ký thay đổi của bảng tin lấy số phiên bản ở bước A.0 lúc phát hành.

## 4. Còn lại (thứ tự đề xuất, mô hình đề xuất)

1. **Task 7** ca 1–8 (sonnet): bắt tay 401/403/426; ai nhận tin (văn phòng, Đối tác, HDV theo `order.view` hiện hành — R1); đúng 5 khoá; DP-1 mỗi route một tin, nhánh lỗi/không đổi không tin; header giả `x-bang-tin-nhan` (BT-2); ping/pong; hạn sống 4001 (chạy cuối). Ca 4 phụ thuộc `checkAssignee` có cho giao FIELD không — tự đọc. Ghi mốc e2e sau Task 5 vào nhật ký (chưa ghi).
2. **Task 8** (sonnet/opus): `web/bangtin.ts`, `web/toast.ts`, `web/shell.ts`, `web/api.ts` (`vuaLamBoiTabNay`), CSS chỉ token, CSP `public/_headers` (`wss://booking.tourdao.vn`) → chạy `v1-dang-nhap.mjs` (cần mạng).
3. **Task 9**: làm mới các trang (`orders`, `order`, `home`, `account`, `order-form` chỉ dải báo) + chạy lại các kịch bản Chrome theo bảng `web/CLAUDE.md`.
4. **Task 10**: kịch bản Chrome hai tài khoản đồng thời (hai `Target.createBrowserContext`), ảnh 390/1040.
5. **Task 11**: `docs/SO-HANG-RAO.md` (3 dòng: bang-tin-guard, KHONG_DB + tệp lớp DO, NT-3 — kèm giới hạn đã biết), `SYSTEM-DESIGN` §2–4/7/11, `CHANGE-GUIDE` (công thức + §3 + bẫy), `changelog.ts` (**không** tự đặt số phiên bản — để bước A.0), tệp đề xuất luật `2026-09-25-bang-tin-de-xuat-luat.md`, và các sửa bắt buộc ở mục 6 dưới.
6. **Task 12**: `nguoi-kiem-doc-lap` (opus) — tự chạy `npm test`, typecheck, `tests/audit`, e2e đủ bộ, kịch bản Chrome Task 10; phát hiện → một lượt sửa → chạy lại tới khi đạt (R5).
7. **Task 14**: ghi `docs/HANDOFF-N1.md` (không rollback qua migration DO; deploy commit cũ trước-DO bằng `wrangler deploy` cũng không an toàn; mỗi deploy ngắt mọi kết nối), rồi đưa chủ `npm run day-len -- bang-tin` + `npm run trien-khai` (CÓ đổi app → CẦN triển khai).
8. Task 13 (iPhone thật) — chủ làm.

## 5. Phán quyết của điều phối viên (mỗi dòng: quyết gì — vì sao — sai thì mất gì)

- R1 — (5) coi như "giữ như hôm nay" theo lệnh chủ; NT-3 viết như kế hoạch — sai thì chỉ bài kiểm NT-3 đổi.
- R2 — `KHONG_DB` sửa thẳng `docs/ARCHITECTURE.md` (chủ đã duyệt); ngoại lệ "gốc lắp ráp nạp `tram.ts`" và hàng `web/CLAUDE.md` chỉ đề xuất — sai thì hoàn một đoạn tài liệu.
- R3 — Task 6 làm luôn hạ tầng e2e của Task 7 + ca 9, 10 — chỉ đổi thứ tự.
- R4 — "`tests/audit` xanh" = không thêm ca đỏ mới, so theo TÊN (chỉ còn "P4 FINDING HDV") — sửa ca đó là việc riêng.
- R5 — Task 12 kiêm vòng kiểm toàn nhánh — sai thì thêm một vòng kiểm.
- R6 — Task 13 để chủ; Task 14 AI chỉ ghi tài liệu + đưa lệnh.
- R7 (sổ) — không chép `.dev.vars` (N10); binding khai tay.
- R8 — chia Task 4 thành 4a/4b — tốn thêm một lượt giao.
- R9 — gộp Task 1+2 một lượt giao — vòng kiểm dài hơn chút.
- R10 — sửa câu nhật ký Task 3 nói sai trình tự TDD (nhật ký là bằng chứng) — tốn một câu.
- R11 — chấp nhận một ca đỏ tạm ở `route-access.test.ts` giữa 4a và 4b (đã xanh lại ở 4b) — một commit giữa nhánh có test đỏ, không ảnh hưởng `main`.
- R12 — hoàn ô "Nguồn" dòng 5.3 về `ADR-0002, ADR-0008`; sửa câu "mọi tệp .ts" → "trừ `*.test.ts`" — chủ muốn ghi nguồn thì thêm lại một từ.

## 6. Việc nhỏ đã hoãn (vòng kiểm cuối/Task 11 phải phân loại)

- **Phải sửa ở Task 11:** nhật ký 4b viết như thể tài liệu Cloudflare XÁC NHẬN `getWebSockets()` trả socket đang đóng — thực tế tài liệu **không nói** (`cloudflare-docs.md` §d) → sửa thành "chưa xác minh".
- **Task 11:** bẫy "`npm run types` làm mất `BANG_TIN_HAN_GIAY`" vào `CHANGE-GUIDE`/`.dev.vars.example`; giới hạn hàng rào bang-tin-guard (`\breturn\b`/`CALL_RE` không phân biệt `.return()`); `src/CLAUDE.md` dòng 6/16 + `CHANGE-GUIDE` công thức b chưa nhắc `bangtin`/`KHONG_DB` (`src/CLAUDE.md` là tệp luật → chỉ đề xuất).
- **Task 14:** runbook nói rõ deploy commit cũ trước-DO cũng không an toàn.
- Để vòng kiểm cuối quyết: `laSuKienHopLe` thiếu test "5 khoá, một khoá sai tên"; `choNoiLai` không chặn `lan` âm; `docHanGiay` nhận "1e3"/"0x1E" (vẫn kẹp [5,3600]); `walkAll()` trùng `walk()`; `tram.ts` nhận socket trước `setAlarm` (tự lành); `bat-tay.test.ts` chưa thử thứ tự 403-trước-503; glue `src/index.ts` `baoThayDoi` chưa có unit test (dựa e2e); `collectRoutes()` chạy ở phạm vi module; chưa test `dongBangTin` từ route public; `tests/e2e/maintenance.mjs` nay lọc dòng nhật ký theo mốc thời gian (yếu hơn bản cũ một khe rất nhỏ); bộ ghi khung WebSocket của e2e chỉ hỗ trợ tin < 65536 byte.

## 7. Việc của chủ (gom một lần, không chặn thi công)

1. Duyệt đề xuất luật (sẽ soạn ở Task 11): ngoại lệ gốc lắp ráp nạp tệp lớp Durable Object; hàng kịch bản Chrome trong `web/CLAUDE.md`.
2. Biết rằng "chấm đếm" cho Đối tác (ADR-0014 điều 12) chưa có; bảng tin chỉ làm mới màn hình Đối tác.
3. Thử iPhone thật (Task 13) và gõ lệnh phát hành (Task 14) khi được đưa.
