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

## Ruling / lệch so với kế hoạch (người thi công — ghi để người kiểm xét)

- **R-H1 (cột `updated_*`):** `src/architecture.test.ts` (ADR-0003) đòi `updated_at NOT NULL` + `updated_by TEXT NULL` ở mọi bảng không phải tra cứu ⇒ thêm hai cột vào `dsp_release_event` và `dsp_refuse_policy`, luôn bằng `created_*` (kế hoạch 2b ghi chú cuối đã dự liệu).

## Nợ / việc để lại
