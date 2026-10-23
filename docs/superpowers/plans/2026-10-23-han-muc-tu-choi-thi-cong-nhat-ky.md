# Hạn mức «Từ chối» của hướng dẫn viên (ADR-0032) — Nhật ký thi công

> Sổ điều phối của kế hoạch `docs/superpowers/plans/2026-10-23-han-muc-tu-choi-thi-cong.md`. Vai phiên ghi sổ này: **người thi công** (P15 — không tự nghiệm thu; H13 kiểm độc lập và H14 phát hành do điều phối lo).
> Worktree `.claude/worktrees/han-muc-ke-hoach`, nhánh `han-muc-ke-hoach`, HEAD lúc bắt đầu a8dc7433 (đã chứa mã nút Từ chối hoàn chỉnh của nhánh `tu-choi-han-muc` + kế hoạch này).

## H0 — Chuẩn bị (2026-10-23)

- `npm ci` thoát 0. Mốc trước khi sửa: `npm run typecheck` thoát 0; `npm test` — xem dòng «Mốc npm test» dưới.
- **Số migration** (kế hoạch 2a, chạy lại sau `git fetch`): `ls migrations` lớn nhất `0116_chiet_khau_theo_loai_khach.sql`; vòng `git ls-tree --name-only <ref> migrations/` trên mọi ref `refs/remotes/origin/*` + `refs/heads/*` tìm `0117…`/`012x` — **rỗng**. `git worktree list`: checkout gốc (e309acf3), `han-muc-ke-hoach` và `tu-choi-han-muc` (cùng a8dc7433). ⇒ dùng `0117_han_muc_tu_choi.sql`.
- **Giả định G1–G7** (kế hoạch mục 12) áp dụng nguyên văn; không có câu hỏi treo với chủ.

### Kiểm lại mục 10 (T-1…T-15) trên mã Từ chối thật (a8dc7433)

| # | Kết quả | Chỗ |
|---|---|---|
| T-1 | ĐÚNG: `refuseStatements(db, {orderId, partyId, actorId, at, lyDo})` trả `[closeHandlerStatement (chốt), auditStatement order_handler_refused changes()>0]` | `src/modules/dispatch/service.ts` (trước H6) |
| T-2 | ĐÚNG: route chỉ hỏi `tuChoiThang(kq)`; không đọc `kq[…]` | `src/modules/dispatch/index.ts` route `handler-refuse` |
| T-3 | ĐÚNG: chưa có `CLOSE_HANDLER_SAU_CHOT`; `CLOSE_HANDLER` nguyên | `src/modules/dispatch/repository.ts` |
| T-4 | ĐÚNG: `BAN_LICH`, `OM_VIEC_RIENG`, `KHONG_PHU_HOP`, `OTHER` (dài nhất 13 ký tự < 40) | `src/shared/ly-do-tu-choi.ts` |
| T-5 | ĐÚNG, có lệch R-1 của nhánh Từ chối: 403 sàng → 404 → 403 «không đúng người» → 409 nháp → 409 huỷ → 409 Đã giao → 409 too_late → 400 lý do → lô → 409 stale → `baoThayDoi` → 200 | route `handler-refuse` |
| T-6 | ĐÚNG: chốt so `current.staff_id !== staff.id`; lô dùng `current.party_id` | như trên |
| T-7 | ĐÚNG: nháp → 409 `order_not_confirmed` trước bước hạn mức | như trên |
| T-8 | ĐÚNG: `order_handler_refused` = `giu` (nội bộ), ẩn (Đối tác) | `src/shared/lich-su-noi-bo.ts:38`, `src/shared/lich-su-doi-tac.ts:54` |
| T-9 | ĐÚNG: `R-DSP-4` = LC-8 (`warn-unless-strict`) ⇒ việc này dùng `R-DSP-5/6/7` | `scripts/audit-checks.mjs` |
| T-10 | ĐÚNG: `git diff --name-only origin/main -- migrations` rỗng | — |
| T-11 | ĐÚNG: 364 route; `NGOAI_PHAM_VI_ROUTE` có `handler-refuse`; `bang-tin-guard` có route Từ chối | `src/route-access.test.ts:613`, `src/shared/bang-su-kien-van-chuyen.ts:458` |
| T-12 | ĐÚNG: `web/tu-choi-sheet.ts` dựng body `[câu mô tả, fieldset lý do, errorBox]` — chèn dòng phụ trước fieldset; `handlerFailure(…, "refuse")` có sẵn, 409 mã lạ rơi nhánh cuối (`reload: false`, câu máy chủ) | `src/shared/handler-view.ts:81` |
| T-13 | ĐÚNG: `dispatch.refuse` SALES/ADMIN/FIELD `assigned`, SUPER_ADMIN `any` | `src/shared/permissions.ts:119` |
| T-14 | ĐÚNG: bài «khuôn cho ADR-0032» có ở `service.test.ts` (bảng tạm `tam_su_kien`) ⇒ thay bằng bài thật ở H6 | `src/modules/dispatch/service.test.ts` |
| T-15 | `changelog.ts` mục đầu 2.27 (số tạm của nút Từ chối) ⇒ hạn mức ghi CHUNG mục 2.27 (khuyến nghị Q-PH «phát hành chung»); hướng dẫn HDV đã có đoạn Từ chối ⇒ nối tiếp | `src/shared/changelog.ts`, `src/shared/huong-dan-hdv.ts` |

## Tiến độ theo task

| Task | Commit | Ghi chú |
|---|---|---|
| H0 + H1 | 3c9c65f5 | Sổ này (T-1…T-15). Migration `0117` + từ điển. Đỏ trước: bài migration 7/7 đỏ (chưa có tệp); `hang-du-lieu`/`architecture` đỏ khi có bảng mà chưa có từ điển (`not ok 6`, `56`, `57`) → xanh. Thấy chặn trigger: ca 4b (bỏ trigger trong bản sao chuỗi migration). |
| H2 | e0226f30 | `src/shared/han-muc-tu-choi{,-ca}.ts`; bài đỏ trước (module chưa có). Đột biến: bỏ `ABORT` → ca 5 đỏ; `>` → `<` → 5 ca đỏ. Đột biến `>` → `>=` của kế hoạch KHÔNG đỏ (tương đương — xem R-H2). |
| H3 | 63187cdb | `dispatch/han-muc-repo.ts`, `close_handler_sau_chot`, `han-muc-sql.test.ts` (bộ ca + 500 chuỗi hạt 20261023 + EXPLAIN), thêm tệp vào STRICT. Bài viết SAU mã (lệch «đỏ trước») — đã bù bằng ba đột biến SQL đều đỏ + đột biến EXPLAIN (thêm câu đọc `audit_log` → `architecture` `not ok 13`). |
| H4 | ca02b29c | `suKienMo` ở cuối lô Nhận/Giao/đổi người/lập đơn; `src/han-muc-duong-handle.test.ts`. Đỏ trước: bốn bài HM-13 ở `service.test.ts`. Ba đột biến 1b đều đỏ. |
| H5 | ba11695a | `cancelOrderByHandler(…, cauSauHuy, noiChuyen)`; route `handler-cancel` dựng ABORT khi `assigned`. Đỏ trước: hai bài HM-8. NT-6 xanh không đổi. |
| H6 | bb842cd4 | Lô Từ chối 3 câu; route bước 9b; ba hành động nhật ký (typecheck đỏ `_phanLoai*` trước khi xếp ẩn). Đỏ trước: 8 bài HM-1/2/3/5/6/12. Ba đột biến kế hoạch đều đỏ. Thay bài «khuôn cho ADR-0032» bằng ba bài thật. |
| H7 + H8 | 6f5930bd | 5 route; route 364 → 369; hai POST vào `NGOAI_PHAM_VI_ROUTE`. Đỏ trước: 6 bài HM-4/7/10/14 + `route-access`, `bang-su-kien-van-chuyen (d)`. Đột biến bỏ `can(settings.ops)` ở `dat-lai` → `route-write-guard` 3 bài đỏ + HM-7 (c) đỏ. |
| H9 | e5bdcf0d | `R-DSP-5` fail, `R-DSP-6` warn-unless-strict, `R-DSP-7` fail. Đỏ trước: 4 bài. Thấy chặn trên D1 tạm (xem SO-HANG-RAO). |
| H10 | 821f0472, 904121d9 | Thẻ `web/han-muc-tu-choi-the.ts` ở `/chinh-sach-dieu-phoi`; dòng «còn N lần» (`web/tu-choi-sheet.ts`); dòng phụ (`web/handler-sheet.ts`, `dongTuChoiTruoc`); `handlerFailure` nhánh `refuse_limit`. Kịch bản Chrome mới 4/4 (axe). Ảnh `docs/evidence/2026-10-23-han-muc-tu-choi/anh/`. |
| H11 | 3cc3de3a | `tests/e2e/han-muc-tu-choi.mjs` + `run.mjs`. Chạy BỔ SUNG (không phải e2e chính thức — Turnstile tắt, proxy chặn Sheet/siteverify): `han-muc-tu-choi` ✔, `dispatch` ✔, `audit-invariants --strict` thoát 0. |
| H12 | f107d43b | SYSTEM-DESIGN, CHANGE-GUIDE z26, SO-HANG-RAO (6 dòng), HANDOFF-N1 runbook, changelog 2.27 (ghi chung), hướng dẫn HDV. |

## Ruling / lệch so với kế hoạch (người thi công — ghi để người kiểm xét)

- **R-H1 (cột `updated_*`):** `src/architecture.test.ts` (ADR-0003) đòi `updated_at NOT NULL` + `updated_by TEXT NULL` ở mọi bảng không phải tra cứu ⇒ thêm hai cột vào `dsp_release_event` và `dsp_refuse_policy`, luôn bằng `created_*` (kế hoạch 2b ghi chú cuối đã dự liệu).

- **R-H2 (đột biến tương đương):** kế hoạch 3b/3d đề xuất đột biến `f.seq > c.seq` → `>=` để «thấy chặn». Không đỏ ở cả bản thuần lẫn SQL vì `seq` duy nhất toàn bảng và `f` (REFUSE/ABORT) không bao giờ là chính dòng `c` (CLAIM/ASSIGN) ⇒ hai biểu thức tương đương. Thay bằng `>` → `<`, bỏ `ABORT`, bỏ vế RESET của mảnh tuần — đều đỏ.
- **R-H3 (thứ tự đỏ–xanh ở H3):** `han-muc-repo.ts` viết trước bài song sinh; bù bằng đột biến (bảng trên). Người kiểm xét.
- **R-H4 (mốc ABORT):** ABORT dùng giờ máy chủ lúc route dựng câu, KHÔNG bằng `created_at` của nhật ký huỷ (lô huỷ của `orders` dùng `nextStamp(prevUpdatedAt)` — `dispatch` không biết). Không ảnh hưởng luật đếm (so theo `seq`).
- **R-H5 (6a — trang Chính sách điều phối):** trang mở cho `quanLyXe && (settings.ops || dispatch.policy.lead)` = Quản trị, Toàn quyền — cả hai có `admin.manage` ⇒ không ai vào trang mà thiếu thẻ; không đổi mục điều hướng. Thẻ tự ẩn khi thiếu `admin.manage` và chạy độc lập với phần chính sách (lỗi bên này không chặn bên kia).
- **R-H6 (route `tu-choi-truoc` không có 403 sàng sớm):** thứ tự 404 → 404 → 403 như kế hoạch 5a; route ĐỌC — `route-write-guard` (1b) xanh.
- **R-H7 (kịch bản Chrome):** HDV chịu luật một máy — đăng nhập API bằng chính HDV đang mở trình duyệt đá phiên trình duyệt; bước 2 làm cả hai lần Từ chối qua giao diện.
- **R-H8 (hướng dẫn Bán hàng / Quản trị):** thêm chữ vào hai nhóm này làm bài A4 (`huong-dan.test.ts`, trần 30 phút đọc) đỏ — Quản trị đang 3149/3150 chữ. Chỉ thêm được ở hướng dẫn HDV và nhật ký thay đổi; phần Quản trị/Bán hàng để nợ N-1.

## Nợ / việc để lại

- **N-1 (cần chủ chọn — bề mặt):** hướng dẫn Quản trị chưa có mục «Hạn mức Từ chối» (trần đọc 30 phút). Phương án: (a) cắt bớt chữ ở mục khác của hướng dẫn Quản trị; (b) để thẻ tự giải thích (mỗi chế độ có một câu giải thích) — đang làm (b); (c) nới trần A4 (nới hàng rào — chủ duyệt).
- **N-2:** `web/CLAUDE.md` (tệp luật, N9) cần dòng mới ở bảng «Sửa tệp nào thì chạy lại kịch bản Chrome nào» — ĐỀ XUẤT (chủ duyệt mới sửa): `| Thẻ hạn mức Từ chối, dòng «còn N lần», dòng phụ bảng chọn người (ADR-0032): web/han-muc-tu-choi-the.ts, khối #hm-the của public/chinh-sach-dieu-phoi.html, phần han-muc-tu-choi của web/tu-choi-sheet.ts, dòng phụ của web/handler-sheet.ts, khối .hm-* / .tu-choi-con-lai / .assignee-tu-choi của public/app.css | han-muc-tu-choi-smoke.mjs ở docs/evidence/2026-10-23-han-muc-tu-choi/kich-ban/ (4 bước, 390 + 1040) + chinh-sach-dieu-phoi-smoke.mjs + v1-nguoi-phu-trach.mjs + tu-choi-smoke.mjs |`.
- **N-3:** e2e CHÍNH THỨC (`npm run test:e2e`) chưa chạy được ở máy này (proxy chặn `challenges.cloudflare.com`, `docs.google.com`) — người kiểm / phiên phát hành chạy.
