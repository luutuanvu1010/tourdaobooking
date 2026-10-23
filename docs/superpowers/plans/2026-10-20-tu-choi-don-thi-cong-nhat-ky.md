# Nút «Từ chối» đơn (ADR-0030 lượt 2, điều 1) — Nhật ký thi công

> Sổ điều phối của kế hoạch `docs/superpowers/plans/2026-10-20-tu-choi-don-thi-cong.md`. Vai phiên ghi sổ này: **người thi công** (P15 — không tự nghiệm thu; T11 kiểm độc lập và T12 phát hành do điều phối lo).
> Worktree `.claude/worktrees/tu-choi-han-muc`, nhánh `tu-choi-han-muc`, tách từ `origin/main` e309acf3.

## Câu trả lời của chủ (nguyên văn, chép từ kế hoạch mục 6)

Chủ dự án, chat 2026-10-23: «1, duyệt hết» — duyệt mọi khuyến nghị: Q1 = (a), Q2 = (a), Q3 = (a), Q4 = (a), Q5 = (a); ADR-0032 accepted cùng lượt.

- Q1 (a): chỉ đơn đã xác nhận; nháp → 409 `order_not_confirmed`. «HDV huỷ đơn chưa chốt» (Q-G) coi như ADR-0135 đã thay — không làm.
- Q2 (a): nhật ký chỉ nhãn lý do; lớp rút gọn GIỮ dòng, không tên; Toàn quyền thấy tên.
- Q3 (a): KHÔNG làm dòng «đã từ chối lúc …» ở bảng chọn người lượt này (ADR-0032 điều 10 làm, đọc sổ sự kiện).
- Q4 (a): chỉ thông báo nổi Bảng tin; không migration hộp thông báo.
- Q5 (a): dùng lại khuôn hộp «Huỷ đơn này»; ảnh điện thoại + máy tính ở `docs/evidence/2026-10-23-tu-choi-don/` (điều phối đổi thư mục từ `2026-10-20-…` trong kế hoạch T7 sang ngày thi công).

## T0 — Chuẩn bị (2026-10-23)

- `git log HEAD..origin/main` rỗng: `main` vẫn ở e309acf3 → mọi số dòng của kế hoạch còn đúng lúc bắt đầu.
- Mốc trên e309acf3+2 commit kế hoạch: `npm run typecheck` thoát 0; `npm test` thoát 0 (`# tests 5963`, `# pass 5954`, `# fail 0` ở bước 1; bước đo giờ `# pass 1`).
- Nhánh chưa gộp chạm `src/modules/dispatch`, `permissions.ts`, `bang-tin.ts`, `audit-actions.ts`, `route-access.test.ts`: chỉ `origin/worktree-xac-nhan-don-2` (commit cuối 2026-10-19). Gốc chung với `main` là b1b2abe4 (cũ); phần Đợt 1 của nhánh đó đã lên `main` theo đường gộp khác (migration 0115 có trên `main`), nên `git diff main...nhánh` hiện cả phần đã gộp — va chạm thật chỉ tính theo kế hoạch mục 7.

## Tiến độ theo task

| Task | Commit | Ghi chú |
|---|---|---|
| T1 | fc1ee7cf | `ly-do-tu-choi.ts` (4 mã = hợp đồng ADR-0032), `tuChoiQuaMuon`. Đột biến `≤ ngày mai` → `< hôm nay`: hai ca đỏ → hoàn nguyên. |
| T2 | e9957a0b | `order_handler_refused` «Trả đơn (Từ chối)»; Q2 (a): nội bộ `giu`, Đối tác ẩn. Typecheck đỏ ở `_phanLoaiDay`/`_phanLoaiNoiBoDay` trước khi xếp loại (đã thấy chặn). |
| T3 | (commit «Điều phối: lô ghi Từ chối…») | `refuseStatements` [đóng, nhật ký], `tuChoiThang`; bài «khuôn cho ADR-0032» trên SQLite thật. |
| T4 | c6673149 | Ô + route + Bảng tin `tu_choi` cùng commit. Bốn đột biến của kế hoạch đều đỏ → hoàn nguyên (chi tiết `docs/SO-HANG-RAO.md`). |
| T5 | (commit «Cờ «được trả lại»…») | `donDuocTraLai` (audit) → `PoolOrderDto.traLai`, `HandlersResponse.traLai`; `nhanChoNhan`. |
| T6 | (commit «Bất biến R-DSP-4…») | `R-DSP-4` `warn-unless-strict`; đột biến so `valid_to_at` → ca đồng hồ lệch đỏ. |
| T7 | 9cd4daf9 + commit tài liệu | `web/tu-choi-sheet.ts` (khuôn `moBangTruot`), nút ở thẻ Đơn của tôi và khối Người phụ trách; kịch bản `docs/evidence/2026-10-23-tu-choi-don/kich-ban/tu-choi-smoke.mjs` 6/6 bước đạt, 9 ảnh 390 + 1040. |
| T8 | 386d987b | Hướng dẫn HDV / Bán hàng / Quản trị. |
| T9 | commit e2e | `tests/e2e/dispatch.mjs` mục 16, `tests/e2e/bangtin.mjs` ca 11c. |
| T10 | commit tài liệu | `SYSTEM-DESIGN` §6 j, §7, §8, §16; `CHANGE-GUIDE` z25 + dòng bảng §1; `changelog.ts` 2.27 (số tạm); `SO-HANG-RAO` 9 dòng. |

## Ruling / lệch so với kế hoạch (người thi công — bề mặt, đảo ngược được; ghi để người kiểm xét)

- **R-1 (thứ tự route):** kế hoạch T4 đặt 409 nháp (bước 4) TRƯỚC 403 «không đúng người phụ trách» (bước 5). Đã đảo: 403 trước, 409 nháp sau — để người ngoài (vd HDV khác, Bán hàng không liên quan) không dò được đơn là nháp (ADR-0135 «nháp riêng tư»). Mọi tiêu chí TC-3/TC-4 vẫn đúng (người phụ trách chọn sẵn của đơn nháp vẫn nhận 409 `order_not_confirmed`).
- **R-2 (thư mục ảnh):** kế hoạch T7 ghi `docs/evidence/2026-10-20-tu-choi-don/`; điều phối giao `2026-10-23-…` — dùng thư mục của điều phối.
- **R-3 (kịch bản Chrome):** thay vì thêm bước vào `hdv-viec-cua-toi-smoke.mjs`, viết kịch bản riêng `tu-choi-smoke.mjs` (6 bước, 390 + 1040, hai HDV, Bảng tin ≤ 5 giây, ca 409 `too_late` trong hộp, trang đơn văn phòng). Không có axe-core trên máy (chưa chạy axe).
- **R-4 (TC-4 «đơn chưa có ngày nào → 200» ở mức route):** không dựng được — CSDL chặn đơn đã xác nhận thiếu ngày (`incomplete_trip`). Ca này chỉ kiểm ở luật thuần `tuChoiQuaMuon([null], …) === false`.
- **R-5 (TC-6 (a) «mỗi vòng đúng một bên 200»):** không khẳng định được — hai lệnh có thể chạy nối tiếp hợp lệ (Từ chối trước → đổi người sau vẫn 200 vì đơn chưa có ai; đổi người trước → Từ chối 403). Bài kiểm khẳng định bất biến (tối đa một dòng mở; nhật ký khớp đúng lệnh 200; bên thua đua thật chỉ 409 `stale`). Thua đua mức câu SQL: `service.test.ts`. Lần chạy e2e bổ sung 23/10: 0/10 vòng gặp `stale` thật.
- **R-6 (hướng dẫn):** nhóm Bán hàng và Quản trị đã chạm trần đọc 30 phút (bài A4) — để thêm chữ Từ chối phải bớt ba cụm thừa có sẵn: «— hãy nhờ Quản trị» (Bán hàng, mục đổi giờ đón), «(số trong ngoặc là số máy đã bật)» và «Việc nhiều nên làm trên máy tính.» (Quản trị), và câu nhắc lại «Sau khi có tài khoản, bạn vẫn…» (Quản trị). Không nới bài A4.
- **R-7 (`tro-ly-cau-truc-ten.ts`):** thêm tên lời thường cho ô `dispatch.refuse` (kiểu `Record<OperationCode,…>` bắt buộc) và đưa ô vào khái niệm «Người phụ trách»; sinh lại `tro-ly-cau-truc.ts` bằng `node scripts/sinh-so-do-trang.mjs`.
- **R-8 (giao diện HDV sau khi trả ở trang đơn):** người chỉ xem đơn mình phụ trách (HDV) trả đơn từ trang đơn → chuyển về `/account` (đơn đã 404 với họ); người xem mọi đơn → tải lại tại chỗ.

- **R-9 (bài đổi kỳ vọng ngoài bảng 5b của kế hoạch — `npm test` đầy đủ bắt được):** `src/dong-bo-chuyen-guard.test.ts` (route vào `KHONG_CAN`), `src/lan-gui-phu-route.test.ts` (số route ghi 221 → 222), `src/modules/orders/xem-don-theo-quyen.test.ts` (khoá `traLai` của hàng chờ; ô `dispatch.refuse` = none ở dòng Đối tác), `src/shared/app-info.test.ts` (dòng phiên bản 2.27), `src/shared/tro-ly-van-nghia.test.ts` C4 (đo lại 17 / 10 / 45 — chữ hướng dẫn mới), `src/modules/billing/sau-da-giao.test.ts` NT-F7. Riêng NT-F7: bài gọi MỌI route ghi bằng Toàn quyền, nhưng route Từ chối chặn Toàn quyền không phụ trách bằng 403 CÓ CHỦ Ý (ADR-0030 điều 1) — đã thêm bảng `NGUOI_GOI` để route này được gọi bằng chính người phụ trách của đơn khoá; kỳ vọng 409 `order_delivered` giữ nguyên (không nới). Đã thấy chặn thật: bỏ câu hỏi `orderDelivered` trong route → NT-F7 đỏ («handler-refuse: … too_late») → hoàn nguyên. **Người kiểm xét lại cách sửa bài này.**

## e2e

- `npm run test:e2e -- dispatch bangtin` (chính thức) **KHÔNG chạy được** trên máy này: proxy chặn `challenges.cloudflare.com` và `docs.google.com` (CONNECT 403) → đăng nhập 503 `turnstile_unavailable`; dòng tổng «E2E: 2/5 kịch bản LỖI» (hai kịch bản đỏ vì đăng nhập, ba bước kiểm cuối xanh).
- Chạy BỔ SUNG (không thay e2e chính thức): cùng hai kịch bản trên máy chủ `wrangler dev` + D1 local tạm dựng y như `tests/e2e/run.mjs` nhưng TẮT Turnstile → `✔ dispatch`, `✔ bangtin`, `audit-invariants --strict` thoát 0 (R-DSP-1…4 ✓). Đột biến TC-9 trên D1 đó: chèn dòng HANDLE đóng không Từ chối → `--strict` thoát 1 nêu R-DSP-4; không `--strict` thoát 0; xoá → 0.
- Đủ bộ `npm run test:e2e` và hai kịch bản trên với Turnstile bật: **chưa chạy** — cần máy có mạng (điều phối / người kiểm).

## Quyết định của chủ sau kiểm độc lập (2026-10-23, chat, nguyên văn qua điều phối)

> «duyệt, đổi thứ tự nút; phát hành chung; 3b; 4 để sau»

Nghĩa (điều phối đã trình):
1. **Duyệt giao diện** cả nút Từ chối lẫn hạn mức, KÈM **đổi thứ tự nút** ở thẻ «Đơn của tôi» của hướng dẫn viên: «Từ chối đơn» lên trên, «Huỷ đơn» xuống CUỐI cùng (sau «Xem đơn») để HDV khỏi bấm nhầm Huỷ. Trước: [Sửa số khách][Huỷ đơn] / [Từ chối đơn] / [Xem đơn]; nay: [Sửa số khách][Từ chối đơn] / [Xem đơn] / [Huỷ đơn] (`web/viec-cua-toi.ts`; kỳ vọng ở `hdv-viec-cua-toi-smoke.mjs` bước 1 và `han-muc-tu-choi-smoke.mjs` bước 2; ảnh một thẻ `docs/evidence/2026-10-23-han-muc-tu-choi/anh/390-5-thu-tu-nut.png`; hướng dẫn HDV ghi đúng thứ tự).
2. **Phát hành chung** một lần (Q-PH = chung; nhật ký thay đổi mục 2.27 chung).
3. **N-1 = (b):** để thẻ hạn mức tự giải thích (mỗi chế độ một câu giải thích), KHÔNG thêm mục vào hướng dẫn Quản trị.
4. **N-2 để sau** (giữ nợ — xem mục Nợ của sổ hạn mức).

N-1, N-2 là nợ của sổ hạn mức (`docs/superpowers/plans/2026-10-23-han-muc-tu-choi-thi-cong-nhat-ky.md`). Dòng đề xuất N-2 cho `web/CLAUDE.md` (nguyên văn, CHƯA sửa — tệp luật, chủ duyệt sau): `| Thẻ hạn mức Từ chối, dòng «còn N lần», dòng phụ bảng chọn người (ADR-0032): web/han-muc-tu-choi-the.ts, khối #hm-the của public/chinh-sach-dieu-phoi.html, phần han-muc-tu-choi của web/tu-choi-sheet.ts, dòng phụ của web/handler-sheet.ts, khối .hm-* / .tu-choi-con-lai / .assignee-tu-choi của public/app.css | han-muc-tu-choi-smoke.mjs ở docs/evidence/2026-10-23-han-muc-tu-choi/kich-ban/ (4 bước, 390 + 1040) + chinh-sach-dieu-phoi-smoke.mjs + v1-nguoi-phu-trach.mjs + tu-choi-smoke.mjs |`.

## Nợ / việc còn treo

- Đủ bộ e2e có mạng (xem trên).
- Kịch bản Chrome (2026-10-23, Chromium 1194 headless, axe-core 4.10.2 lấy bằng `npm pack` ngoài repo):
  - `tu-choi-smoke.mjs` (mới): 6/6 bước đạt, đã chạy axe (bỏ đúng `meta-viewport` đã duyệt — khuôn v1-nguoi-phu-trach); đơn tới hàng chờ HDV khác sau 1,4 giây.
  - `a2-smoke-order.mjs`, `a2-smoke-form.mjs`, `a2-smoke-sheet.mjs`: thoát 0.
  - `hdv-viec-cua-toi-smoke.mjs`: bước 1 đổi kỳ vọng (thêm «Từ chối đơn» ở đơn đã xác nhận đi sau ngày mai — hành vi mới). Có AXE: 6 bước đỏ CHỈ vì `meta-viewport` (kịch bản cũ chưa có ngoại lệ đã duyệt 30/9 — nợ CÓ SẴN, không do việc này); không AXE (lượt đầu): mọi bước khác xanh.
  - `v1-nguoi-phu-trach.mjs`: bước q đổi kỳ vọng (HDV thấy «Từ chối đơn» ở đơn đã xác nhận) → `ONLY=q` xanh. Đủ bộ: 13 ✓ / 4 ✗ — q (đã sửa), a (dòng 2 thẻ danh sách 1040 xuống hàng, `web/orders.ts`), j (axe `region` ở `#strips` trang danh sách), l (401 ở `/orders` của Sales Một): ba bước a/j/l ở trang danh sách đơn mà việc này không chạm — **suy luận là nợ có sẵn, CHƯA đối chứng trên bản gốc**.
- Gộp `origin/main` trước khi trình kiểm (kế hoạch mục 7): va chạm dự kiến với `origin/worktree-xac-nhan-don-2` ở `bang-tin.ts` (`THAY_DOI`), `permissions.ts`, `route-access.test.ts` (đếm route), `audit-actions.ts`/`lich-su-*.ts`, `contracts.ts`, `changelog.ts` (số bản).
