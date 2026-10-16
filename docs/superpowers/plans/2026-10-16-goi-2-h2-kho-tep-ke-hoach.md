# Gói 2 hồ sơ riêng tư — lát H-2 (kho tệp hồ sơ trên R2): Kế hoạch thi công

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Toàn quyền gắn được ảnh / PDF giấy tờ vào một dòng giấy tờ của người, mở lại được qua máy chủ (kiểm quyền, nhật ký ghi trước, không lưu đệm), tệp nằm ở kho R2 riêng `HO_SO`, xoá khỏi kho chạy sau lô D1 và thấy được / chạy lại được, gộp hồ sơ mang ảnh sang dòng giấy tờ mới; `npm run trien-khai` dừng rõ ràng khi chủ chưa tạo kho thật.

**Architecture:** Một migration chỉ-thêm `0104_ho_so_tep.sql` của module `parties` (hai bảng `pty_attachment`, `pty_attachment_link` + trigger một chiều), một tệp luật thuần `src/modules/parties/tep.ts` (chữ ký tệp, base64, khoá ngẫu nhiên, header phản hồi), một tệp việc-bên-ngoài `src/modules/parties/kho-tep.ts` (xoá R2 SAU lô), năm route mới khai trong `src/modules/parties/index.ts`, một ô quyền mới `party.attachment.view` (chỉ Toàn quyền), binding R2 `HO_SO` ở `wrangler.jsonc`, lớp thứ ba cho service worker, và cổng chỉ-đọc 1e trong `scripts/release-lib.mjs`. Tải lên theo thứ tự **ghi D1 trước → đặt R2 → xác nhận đã lưu** (ruling Q2) nên không bao giờ có tệp trong kho mà CSDL không biết.

**Tech Stack:** TypeScript, Cloudflare Workers + D1 (SQLite) + R2 (mô phỏng ở máy bằng `wrangler dev --persist-to`), `node:sqlite` + khung thử `tests/audit/harness.mjs` cho bài kiểm, `node --test` (Node 22), esbuild; không dependency runtime.

**Spec:** `docs/adr/ADR-0123-kho-tep-ho-so-tren-r2.md` (quyết định 1–8, tiêu chí nghiệm thu); `docs/adr/ADR-0124-nguoi-dung-tu-khai-ho-so-cua-minh.md` đ4 (ô `party.attachment.view` chỉ Toàn quyền); `docs/adr/ADR-0126-quyen-rieng-tu-yeu-cau-xoa-an-danh-hoa-luu-giu.md` đ3, đ6 (ảnh `purged_at` rồi xoá R2; thời hạn giữ ảnh — chỉ để thiết kế cột, KHÔNG làm danh sách xoá); Hiến chương `docs/ARCHITECTURE.md` 5.16, 5.20, 5.22, 5.24, 5.25; đặc tả `docs/superpowers/specs/2026-10-16-ho-so-rieng-tu-va-2fa/` (`KE-HOACH-SUY-RA.md` dòng **H-3** "Kho tệp" — xem ruling R1 về lệch số lát; `PHUONG-AN.md` §2.4; `TRANG-GHEP.md` §1, §2 dòng `party.attachment.view`, §3 dòng "tải ảnh", "xem ảnh", "Service worker").

**Kế hoạch mẫu khuôn:** `docs/superpowers/plans/2026-10-16-goi-2-h0-h1-ke-hoach.md` (lát H-0, H-1 trên cùng nhánh).

## Global Constraints

- Giao diện, câu báo lỗi (`message`), tài liệu, commit: tiếng Việt CÓ DẤU; mã lỗi máy (`unsupported_file_type`…) được, chữ hiện ra thì không có chữ Anh. Gọi hệ thống là "Nền tảng".
- Không dependency runtime. Tệp được `*.test.ts` import trực tiếp (`tep.ts`, `kho-tep.ts`, `repository.ts`, `gop-lo.ts`) import nhau KÈM đuôi `.ts` và KHÔNG import module khác (`../audit`…) — câu nhật ký dựng ở `index.ts`.
- Migration: đúng MỘT tệp mới `migrations/0104_ho_so_tep.sql`, chỉ THÊM; không sửa tệp nào đã có trên `main` (kể cả `0103` của nhánh này đã có người kiểm). Bài kiểm tìm tệp theo ĐUÔI `_ho_so_tep.sql`.
- Chỉ nhận **JPG, PNG, HEIC, PDF**, tối đa **10 MB** (10 485 760 byte) sau khi giải mã, kiểm theo **chữ ký thật**; HTML, SVG và mọi thứ khác bị từ chối bằng câu tiếng Việt (ADR-0123 đ2).
- Tải xuống chỉ qua Worker sau `can()`; **nhật ký ghi TRƯỚC** khi đọc R2; phản hồi có `Cache-Control: no-store` và `X-Content-Type-Options: nosniff`; không đường dẫn ký sẵn; service worker không lưu đệm (ADR-0123 đ3).
- Khoá tên trong kho: `pty/<32 ký tự hex ngẫu nhiên>` — không chứa mã hồ sơ, tên, số (PHUONG-AN §2.4). KHÔNG lưu tên tệp gốc.
- Nhật ký (`audit_log.detail`) chỉ mang mã (mã tệp, tên loại giấy tờ, mã lý do): không tên tệp gốc, không khoá kho, không băm, không số giấy tờ (ADR-0123 đ8, Hiến chương 5.20).
- `parties` là module nghiêm: mọi câu SQL ở `src/modules/parties/repository.ts` qua `defineSql` (câu tĩnh); trigger chỉ đọc bảng `pty_*` (Hiến chương 5.3). Chỉ `parties` chạm `HO_SO` (bài Task 2).
- Mặc định từ chối; ô mới phải được hỏi bằng chuỗi nguyên văn `can(staff, "party.attachment.view")` trong `src/modules/**`.
- **KHÔNG làm ở lát này:** phiếu tự khai, đồng ý chính sách, xác minh, ô `party.verify.attachment` (H-4); phiếu xoá, ẩn danh hoá, danh sách xoá ảnh theo quy tắc giữ (H-5); giao diện nhập / xem ảnh; xoá EXIF.
- CẤM AI tự chạy: `git push`, merge vào `main`, `wrangler deploy`/`rollback`/`secret`, **`wrangler r2 bucket create`** và mọi lệnh R2 không phải mô phỏng ở máy, mọi lệnh `--remote`. E2E chỉ chạy trên D1 + R2 mô phỏng của `npm run test:e2e`.
- Không sửa luật chi phối chính mình: `CLAUDE.md`, `.claude/`, `playbook/`, `docs/adr/`, Phần I và bảng thi hành của `docs/ARCHITECTURE.md` (chỉ đề xuất — ruling R14).
- Mỗi task: bài đỏ trước, xanh sau; trước commit `npm test` và `npm run typecheck` phải xanh (`typecheck` KHÔNG phủ `*.test.ts`, `scripts/`, `tests/` — tự đọc lại tệp đó). Ngoại lệ có tên: giữa Task 3 và Task 4 `src/permission-enforcement.test.ts` đỏ (ô chưa route nào hỏi) — hai task commit liền nhau, không thêm mục hoãn.
- `wrangler.jsonc` chỉ được có chú thích **cả dòng** (`// …`); chú thích cuối dòng làm `src/cau-hinh-toc-do.test.ts` và cổng 1e không đọc được tệp.
- Số phiên bản: lát này không đổi gì người dùng nhìn thấy → KHÔNG thêm mục nhật ký thay đổi (ruling R13).

## Review Focus

Năm tình huống ADR không nói thẳng mà dễ làm người dùng gặp lỗi nhất; mỗi dòng đã có bài ghim ở task sở hữu mã:

1. **Tệp đúng 10 MB** (10 485 760 byte) phải qua; thêm 1 byte phải bị từ chối bằng "Tệp lớn hơn 10 MB." — không lệch một byte vì tính base64 (bài "Review Focus 1", Task 4).
2. **Ảnh HEIC của iPhone** với nhãn `heic` / `heix` / `mif1` phải được nhận; `avif`, `msf1` (chuỗi ảnh) bị 415 bằng câu tiếng Việt (bài nhãn HEIC ở `tep.test.ts`, Task 2).
3. **Kho R2 hỏng khi đặt, rồi hỏng tiếp khi xoá:** dòng phải hiện ở hàng "chờ xoá", tải xuống trả 404 dù kho còn đối tượng, và chạy lại xoá được khi kho lành (bài "Review Focus 3", Task 4 + Task 5).
4. **Gộp hồ sơ:** ảnh gắn ở giấy tờ của hồ sơ phụ phải mở được qua dòng giấy tờ MỚI của hồ sơ chính; ảnh đã quyết xoá không đi theo (bài "Review Focus 4", Task 6).
5. **Bấm "Tải lên" hai lần** (mạng chập chờn, cùng mã lần gửi) chỉ sinh MỘT tệp và kho chỉ nhận MỘT lần đặt (bài "Review Focus 5", Task 4).

Rủi ro đã biết, KHÔNG có bài (ghi để người kiểm khỏi tìm): thân tải lên ~14 MB bị lớp chống ghi trùng đọc một lần và route đọc lần nữa (bộ nhớ Worker thật chưa đo — `BL-TEP-THAN-HAI-LAN`); ảnh tải lên dòng giấy tờ của hồ sơ phụ trong khe giữa lúc đọc và lúc ghi lô gộp không đi theo (ruling R15, `BL-TEP-KHE-GOP`).

## Bằng chứng số migration (kiểm 2026-10-16, chỉ đọc)

- Nhánh này (`worktree-ho-so-rieng-tu-2fa`, f1aa616e): tệp lớn nhất `0103_ho_so_mo_rong.sql`. `main` (5748c123): lớn nhất `0102_aut_mfa_email.sql`.
- `git branch --no-merged main` → 15 nhánh; `git ls-tree --name-only <nhánh> migrations/ | tail -1` cho từng nhánh: `canh-bao-don-trung` 0018, `claude/clever-hertz-0f1b61` 0093, `claude/elegant-dhawan-997fa2` 0095, `claude/so-vang-van-chuyen` 0101, `claude/stoic-heisenberg-72c05d` 0102, `claude/support-ticket-module-eb6445` 0102, `claude/tour-dao-booking-audit-aa1dad` 0093, `claude/tour-dao-booking-audit-bc6c77` 0098, `claude/tourdao-sales-audit-62ea81` 0024, `kiem-toan-ontology` 0018, `worktree-agent-a455127…` 0093, `worktree-agent-a5efc19…` 0098, `worktree-agent-a9baef1…` 0050, `worktree-trang-chu-momo-lenh-thiet-ke` 0050, `worktree-agent-a91d356…` 0101. Các nhánh worktree khác (`worktree-hai-lop-email` 0102, `worktree-hai-lop-dang-nhap` 0101, `worktree-dong-giai-thich-email` 0102, `worktree-nhan-xem-don-nhap` 0095).
- Ba worktree ở HEAD tách rời (không nhánh nào trỏ): `great-swanson-86ef9a` (46193e87) → 0093; `elegant-dhawan-997fa2` (a1172335) → 0095; `clever-hertz-0f1b61` (d7495a77) → 0098.
- Thư mục `migrations/` (kể cả tệp chưa commit) của cả 13 worktree trong `.claude/worktrees/` và checkout gốc: lớn nhất là `0103` (chỉ ở worktree này); checkout gốc 0102.
- `0098_dua_don_theo_nhom_va_diem_nhanh.sql` đã được giữ ở nhánh chưa gộp (ADR-0118) — không lấp. `0019` (B5) và `0029` (ADR-0041) giữ chỗ — không lấp.
- **Số chọn: `0104`**, tệp `migrations/0104_ho_so_tep.sql`. Nhánh nào gộp vào `main` trước mà chiếm `0104` thì chỉ đổi tên tệp (bài tìm theo đuôi). Kiểm lại lúc phát hành (`docs/HANDOFF-N1.md`, Task 8).

## Sự thật đã kiểm khi soạn (ghi lại để người thi công không phải dò lại)

1. **Khuôn kiểm tệp "TEP" của ADR-0041 CHƯA từng có mã.** `grep -rn "ntf_attachment\|TEP\b" src wrangler.jsonc` không có mã thật; số `0029` vẫn giữ chỗ cho ADR-0041 (`docs/adr/README.md`). Hàm nhận loại theo chữ ký ở Task 2 là **mã mới**, phỏng theo mã mẫu (chưa chạy) trong `docs/superpowers/plans/2026-09-28-dinh-kem-tep-thong-bao.md` Task 1, bỏ DOC/DOCX/TXT/MD và bỏ phụ thuộc đuôi tên tệp (lát này không nhận tên tệp).
2. **Router trả 415 cho mọi lệnh ghi không phải JSON** (`src/shared/router.ts` `checkWriteRequest`). Nới chỗ đó là mở lớp chống gửi chéo trang (form `multipart/form-data` gửi được từ trang khác không cần hỏi trước). Nên tải lên = JSON `{ "noiDung": "<base64>" }` (ruling R3).
3. **Lớp chống ghi trùng (ADR-0094) đọc NGUYÊN thân lệnh ghi** (`request.clone().text()`, router dòng ~481) **và lưu thân phản hồi để phát lại** (`capNhatKetQua`, `thanPhatLai`). Hệ quả: (a) tải xuống phải là **GET** — một POST trả ảnh sẽ bị lớp này chép byte ảnh vào D1; (b) tải lên 10 MB = thân ~14 MB được đọc hai lần (bản sao của lớp + bản của route) — chấp nhận, ghi ở Review Focus.
4. **`isCacheable` của service worker cho phép `image/png`** (`src/shared/sw-policy.ts`). Hôm nay ảnh không bị lưu chỉ nhờ lớp 1 (`routeFor` đóng theo mặc định). Task 2 thêm lớp 3: phản hồi có `no-store` không bao giờ lưu.
5. **`gopChepGiayToStatement` tự sinh mã dòng giấy tờ mới bên trong** (`repository.ts`). Task 6 đổi để nhận mã từ ngoài — dòng nối ảnh mới cần mã đó trong cùng lô. Câu chép giấy tờ dùng dạng `VALUES` có lính gác (dạng `INSERT … SELECT` bị cấm ở đó vì quét bảng con của `van-chuyen`); câu nối ảnh dùng cùng dạng `VALUES` có lính gác cho nhất quán.
6. **Câu nhật ký `party_merged` dùng `changes() > 0` của câu lật** — câu nối ảnh không được chen giữa; phải đứng SAU hai dòng nhật ký, và chỉ số câu lật đổi từ `stmts.length - 3` sang chỉ số tính sẵn (Task 6).
7. **Mọi bài `trienKhai` đi qua `tkScript` + `TK_PREFIX`** (`src/release-lib.test.ts`): lệnh mới phải có ở cả hai, nếu không mọi bài đỏ "lệnh ngoài kịch bản" (Task 7).
8. **`wrangler r2 bucket info --json` gọi thêm API số liệu** (`getR2BucketMetrics`, wrangler 4.147.0 `wrangler-dist/cli.js` ~dòng 345815) — thêm một chỗ có thể hỏng mà không liên quan kho có hay không. Cổng 1e dùng `wrangler r2 bucket list` (chỉ liệt kê; định dạng `name:  <tên>` theo `formatLabelledValues`, đọc từ mã nguồn wrangler, **chưa chạy thật** — ruling R10).
9. **Khung thử `world()` không có `HO_SO`**: Task 2 thêm kho R2 giả mặc định. Route kiểm `env.HO_SO` vắng → 503 (không thêm kiểm cấu hình toàn cục — sẽ làm đỏ mọi bài cũ).

## Câu hỏi / ruling

Phần "Cần chủ trả lời" là điều chạm dữ liệu / quyền mà ADR chưa chốt. Kế hoạch đã chọn phương án **hẹp / an toàn** để thi công không bị chặn; chủ chọn khác thì sửa trước khi migration lên production (bảng mới còn rỗng, đổi được).

**Cần chủ trả lời (không chặn thi công; chặn phát hành nếu chủ chọn khác):**

- **Q1 — Ai được TẢI ảnh lên ở lát này.** ADR chỉ nói ai được XEM (`party.attachment.view`, chỉ Toàn quyền). Đã chọn: tải lên phải giữ CẢ `party.document.write` LẪN `party.attachment.view` ⇒ thực tế **chỉ Toàn quyền**. Mở cho Quản trị tải hộ (không xem lại được) = bỏ vế thứ hai, một dòng mã + một bài.
- **Q2 — Thứ tự tải lên.** `PHUONG-AN.md` §2.4 và `TRANG-GHEP.md` §3 ghi "đặt R2 trước, lô D1 lỗi thì gỡ R2". Nếu lần gỡ cũng hỏng, kho còn một ảnh giấy tờ mà CSDL không biết ⇒ phiếu xoá (H-5) không bao giờ tìm ra (trái 5.24). Đã chọn: **ghi D1 trước** (dòng tệp + dòng nối + nhật ký, `stored_at` rỗng) → đặt R2 → ghi `stored_at`. R2 hỏng ⇒ đặt "chờ xoá" (lý do `TAI_LEN_LOI`) rồi xoá; dòng đứng ở "tải dở dang" quá 10 phút ⇒ lệnh chạy lại xử lý. Mọi đối tượng trong kho luôn có dòng CSDL tạo trước nó. ADR-0123 không quy định thứ tự tải lên, nên đây không trái ADR — nhưng khác văn bản đề xuất; chủ xác nhận.
- **Q3 — "Chỉ-thêm" của `pty_attachment`.** ADR-0123 đ4 gọi hai bảng là chỉ-thêm; ADR-0126 đ3 lại nói "ảnh `purged_at` rồi xoá R2" (một cột phải được ghi sau). Đã hiểu: không xoá dòng; nội dung (hồ sơ, khoá, loại, cỡ, mốc tạo) bất biến; chỉ ba mốc đi MỘT chiều: `stored_at` (rỗng → có), `purged_at` + `purge_reason` (rỗng → có, cùng lúc băm về rỗng), `r2_deleted_at` (rỗng → có, chỉ sau `purged_at`). `pty_attachment_link` chỉ-thêm thật (không sửa, không xoá). Thiết kế đủ cho H-5 (ẩn danh hoá chỉ cần đặt `purged_at`) để H-5 không phải tạo lại trigger của bảng này.
- **Q4 — Ai xem / chạy lại hàng "chờ xoá".** Không ADR nào đặt ô. Đã chọn: dùng `party.attachment.view` (chỉ Toàn quyền). H-5 có thể mở cho người giữ `party.erasure.process` (Quản trị) — một dòng mã.
- **Q6 — Hai route mới ghi CSDL hơn một lần mỗi lệnh (nới hàng rào H5 có tên).** Lớp chống ghi trùng (ADR-0094) đếm số lần ghi; e2e đỏ khi route ghi > 1 lần mà không có tên trong danh sách nợ `GHI_NHIEU_LAN` (`src/shared/lan-gui-no.ts`). Tải lên ghi hai lần theo bản chất (lô D1 → đặt kho → đánh dấu đã lưu — đặt kho nằm GIỮA nên không gộp được một lô); chạy lại hàng chờ xoá ghi nhiều lần (mỗi tệp một lần đánh dấu sau khi xoá kho). Đã chọn: thêm HAI mục có lý do vào `GHI_NHIEU_LAN` (Task 4, Task 5) — đây là NỚI một hàng rào nên chỉ là **đề xuất trên nhánh**, có hiệu lực khi chủ duyệt bằng việc gộp nhánh (khuôn "đề xuất chờ chủ duyệt bằng day-len" đã dùng ở sổ hàng rào). Hậu quả đã tính: lần ghi thứ hai (đánh dấu đã lưu) hỏng ⇒ route trả 500 "Không tải tệp lên được", dòng thành "tải dở dang" và lệnh chạy lại dọn sau 10 phút — không có ảnh "tải xong" mà biến mất. Chủ không đồng ý thì phương án thay: đặt kho trước, lô D1 sau (đúng văn bản đề xuất nhưng mở lại rủi ro Q2).
- **Q5 — Không có nút "xoá ảnh" do người bấm ở lát này.** ADR-0123 đ7 chỉ cho xoá khi phiếu xoá được thực hiện hoặc hết lý do giữ (đều là H-5). Lát này chỉ có lệnh xoá dùng chung + đường chạy lại; ảnh tải nhầm thì huỷ dòng giấy tờ (đường "sửa sai" có sẵn), ảnh vào danh sách xoá ở H-5. Chủ cần nút xoá ngay thì phải có ADR.

**Ruling đã áp (bề mặt, siết, hoặc đảo ngược được; ghi lại để người kiểm thấy):**

- **R1 — Lệch số lát.** Điều phối gọi lát này là H-2; `KE-HOACH-SUY-RA.md` gọi kho tệp là **H-3** và dành **H-2** cho "route giấy tờ tổ chức + xác minh". Các ruling R15, R19, R25 của kế hoạch H-0/H-1 và ba mục `MIEN` của `tests/audit/nhat-ky-hang.mjs` ghi "lát H-2" là nói lát giấy tờ tổ chức đó — **KHÔNG thuộc kế hoạch này**, người kiểm đừng tính là thiếu. Không sửa tài liệu luật; báo chủ trong báo cáo.
- **R2 — Tên kho:** `tourdao-sales-ho-so` (tên tạm của `PHUONG-AN.md` §2.4), binding `HO_SO`. Tên chỉ ghi ở `wrangler.jsonc`; cổng 1e đọc từ đó (một nguồn).
- **R3 — Tải lên bằng JSON base64** (`{ "noiDung": "…" }`) — không nới lớp 415 của router, không thêm miễn cho lớp chống ghi trùng. Trả giá: thân to hơn 33 %. Ba lớp 413: `Content-Length` > `TOI_DA_THAN` (13 982 040) trước khi ROUTE đọc thân; chuỗi base64 dài hơn `TOI_DA_BASE64` (13 981 016) trước khi giải; và **sau khi giải** > 10 485 760 byte — lớp cuối là lớp quyết định ranh giới, vì chuỗi dài đúng `TOI_DA_BASE64` chứa được tới 10 MB + 2 byte. Lớp `Content-Length` chỉ đỡ cho bước đọc của route: lớp chống ghi trùng ĐÃ đọc nguyên thân trước khi route chạy (sự thật 3) — không phải hàng rào chống thân quá lớn.
- **R4 — Tải xuống là GET** (thẻ ảnh dùng được; không đi qua lớp chống ghi trùng — sự thật 3). Chống gửi chéo trang: cookie `SameSite=Lax` không đi theo thẻ ảnh của trang khác; thêm `Cross-Origin-Resource-Policy: same-origin`. GET có ghi nhật ký — giống "xem đủ số" về thứ tự, khác về phương thức (lý do ở sự thật 3). "Xem đủ số" chọn POST một phần để router chặn gọi chéo trang; GET không có lớp đó, nên route tải xuống tự chặn thêm `Sec-Fetch-Site: cross-site` (403, không nhật ký, không đọc kho). Còn lại: một liên kết từ trang khác mà Toàn quyền bấm vào (điều hướng cả trang, cookie Lax có đi) vẫn mở ảnh và để lại một dòng "Mở ảnh" — không lộ ảnh cho trang kia; chấp nhận.
- **R5 — Hạng dữ liệu:** `pty_attachment.storage_key` = **N3**, `pty_attachment.content_hash` = **N3** (phía an toàn: khoá trỏ tới ảnh giấy tờ, băm là dấu vân của ảnh giấy tờ — cả hai không được vào nhật ký, bộ dò R-PD-1 và `doNhatKyHang` canh); mọi cột khác của hai bảng = N1.
- **R6 — Loại nối là chữ mã mở** (`CHECK` khuôn mã, không `CHECK` liệt kê — `src/CLAUDE.md` "danh sách giá trị mở kiểm ở code"); trigger chỉ mở `PERSON_DOCUMENT`, `ORG_DOCUMENT`. Loại khác (vd phiếu tự khai của H-4) bị trigger chặn `attachment_link_kind_closed`; H-4 mở bằng cách tạo lại trigger, KHÔNG dựng lại bảng chỉ-thêm. Không đoán tên loại của H-4.
- **R7 — `pty_attachment.party_id` = hồ sơ nhận tệp LÚC TẢI** (không đổi). Trigger nối chỉ cho dòng giấy tờ của chính hồ sơ đó hoặc của hồ sơ nó đã gộp vào (một bước — ADR-0068 Đ3 không chuỗi).
- **R8 — Chỉ gắn ảnh vào dòng giấy tờ HIỆN HÀNH** (đã gia hạn thay / đã huỷ ⇒ 409 `document_not_current`): ảnh của dòng không hiện hành vào danh sách xoá ngay theo 5.25, gắn vào là vô nghĩa. Chỉ giấy tờ NGƯỜI có route ở lát này; giấy tờ tổ chức chỉ có lớp CSDL (route ở lát giấy tờ tổ chức).
- **R9 — Không lưu tên tệp gốc.** Tên khi tải về: `giay-to-<8 ký tự đầu mã tệp>.<jpg|png|heic|pdf>`. Ảnh mở tại chỗ (`inline`), PDF tải về (`attachment`); `Content-Security-Policy: default-src 'none'; sandbox`.
- **R10 — Cổng 1e dùng `wrangler r2 bucket list`** (sự thật 8), bỏ mã màu rồi tìm dòng `name: <tên kho>`. Lệnh lỗi, hay không thấy tên ⇒ DỪNG trước migration (không bao giờ coi là đạt). Không tự thử lại khi gặp 7403 (thử lại bằng tay như các cổng khác).
- **R11 — HEIC:** nhận khi byte 4–8 là `ftyp` và nhãn chính là một trong `heic`, `heix`, `heim`, `heis`, `hevc`, `hevx`, `mif1` (ảnh tĩnh HEIF). Không nhận `msf1` (chuỗi ảnh), `avif`. PDF: `%PDF-` ở byte 0. JPG: `FF D8 FF`. PNG: tám byte chữ ký chuẩn.
- **R12 — Xoá EXIF (toạ độ chụp) chưa làm:** không thêm thư viện runtime; khả thi trên Worker chưa kiểm (PHUONG-AN §2.4). Ghi nợ ở `docs/BACKLOG.md` (Task 8).
- **R13 — Không đổi nhật ký thay đổi / số phiên bản:** lát này không có màn hình nào đổi. Mục 2.10 (số tạm) của H-0/H-1 giữ nguyên.
- **R14 — Đề xuất siết hàng rào (N9 — AI không tự sửa `.claude/`):** hook `guard-remote` hôm nay KHÔNG chặn `wrangler r2 bucket create|update` và `wrangler r2 object put` (luật `wrangler-remote-write` chỉ bắt `delete`, `deploy`…). Đề xuất cho chủ (không làm ở lát này): thêm luật `wrangler-r2-write` chặn `r2 bucket (create|update|cors|lifecycle|lock|sippy|notification)` và `r2 object put` khi không kèm `--local`, kèm ca ở `src/claude-guard.cases.json`. Ghi vào báo cáo cuối và `docs/BACKLOG.md`.
- **R15 — Gộp hồ sơ:** chỉ ảnh của dòng giấy tờ ĐƯỢC CHÉP (`ke.giayTo.chep`) đi theo — thêm dòng nối sang dòng mới của hồ sơ chính; dòng nối cũ (sang dòng đã huỷ của hồ sơ phụ) giữ nguyên (chỉ-thêm). Ảnh tải lên dòng của hồ sơ phụ trong khe giữa lúc đọc và lúc ghi lô gộp sẽ không đi theo (nằm lại ở dòng đã huỷ → H-5 đưa vào danh sách xoá) — chấp nhận, ghi ở Review Focus.
- **R16 — Một lần "chạy lại" xử lý tối đa 50 tệp**; "tải dở dang" = `stored_at` rỗng, chưa `purged_at`, tạo quá **10 phút** (`DO_DANG_SAU_MS`). Kiểm định kỳ `R-PTY-12` (mức `warn`) báo khi còn tệp chờ xoá hoặc tải dở dang quá 1 giờ — hiện trong đầu ra `audit-invariants` của `npm run trien-khai`.

## Bản đồ tệp

| Tệp | Tạo / sửa | Việc |
|---|---|---|
| `migrations/0104_ho_so_tep.sql` | tạo | hai bảng + trigger (Task 1) |
| `src/migrations-ho-so-tep.test.ts` | tạo | bài migration (Task 1) |
| `docs/data-dictionary.json`, `docs/DATA-DICTIONARY.md` | sửa / sinh lại | hai bảng + hạng (Task 1) |
| `src/hang-du-lieu.test.ts` | sửa | `N3_GHIM` thêm hai cột (Task 1) |
| `scripts/audit-checks.mjs`, `src/audit-invariants.test.ts` | sửa | `COT_N3_NHAT_KY`, `R-PTY-11`, `R-PTY-12` (Task 1) |
| `tests/audit/nhat-ky-hang.mjs` | sửa | `MIEN` (Task 1) → `PHU_TRACH` (Task 4) |
| `wrangler.jsonc`, `worker-configuration.d.ts` | sửa | binding `HO_SO` (Task 2) |
| `tests/audit/harness.mjs` | sửa | kho R2 giả, `bytes` trong phản hồi (Task 2) |
| `src/modules/parties/tep.ts` + `tep.test.ts` | tạo | luật thuần tệp (Task 2) |
| `src/shared/sw-policy.ts`, `sw-policy.test.ts`, `web/sw/sw.ts` | sửa | lớp 3 + ca đường tệp (Task 2) |
| `src/kho-tep-ho-so.test.ts` | tạo | rào tĩnh: `HO_SO` chỉ ở parties (Task 2), thứ tự trong route (Task 4) |
| `src/shared/permissions.ts`, `permissions.test.ts`, `src/modules/orders/xem-don-theo-quyen.test.ts`, `src/shared/tro-ly-cau-truc-ten.ts` | sửa | ô `party.attachment.view` (Task 3) |
| `src/shared/contracts.ts`, `src/shared/audit-actions.ts` | sửa | DTO + bốn hành động nhật ký (Task 4) |
| `src/modules/parties/repository.ts` | sửa | câu SQL tệp (Task 4, 5), câu gộp (Task 6) |
| `src/modules/parties/index.ts` | sửa | năm route (Task 4, 5), gộp (Task 6) |
| `src/modules/parties/kho-tep.ts` + `kho-tep.test.ts` | tạo | xoá R2 sau lô (Task 4; Task 5 dùng lại) |
| `src/modules/parties/tep-route.test.ts` | tạo | bài route trên SQLite thật (Task 4, 5, 6) |
| `src/route-access.test.ts`, `src/giay-to-khong-lo-so.test.ts` | sửa | ảnh chụp route, `TUYEN` (Task 4, 5) |
| `src/modules/parties/gop-lo.ts`, `gop-lo.test.ts` | sửa | nối ảnh khi gộp (Task 6) |
| `scripts/release-lib.mjs`, `src/release-lib.test.ts` | sửa | cổng 1e (Task 7) |
| `tests/e2e/ho-so-tep.mjs`, `tests/e2e/run.mjs` | tạo / sửa | kịch bản API thật, R2 mô phỏng (Task 8) |
| `docs/SYSTEM-DESIGN.md`, `docs/CHANGE-GUIDE.md`, `docs/SO-HANG-RAO.md`, `docs/HANDOFF-N1.md`, `docs/BACKLOG.md` | sửa | tài liệu mô tả, sổ hàng rào, runbook + việc của chủ (Task 8) |

## Loại việc và người kiểm

| Task | Loại | Người kiểm độc lập (vai `nguoi-kiem-doc-lap`, chỉ đọc) |
|---|---|---|
| 1. Migration 0104 + sổ dữ liệu + bất biến | **VIỆC LỚN (dữ liệu)** | **bắt buộc ngay sau Task 1** |
| 2. Binding, khung thử, luật thuần tệp, service worker | **VIỆC LỚN (triển khai — binding mới)** | kiểm gộp với Task 7 |
| 3. Ô `party.attachment.view` | **VIỆC LỚN (quyền)** | kiểm gộp sau Task 6 |
| 4. Route tải lên / danh sách / tải xuống | **VIỆC LỚN (quyền, dữ liệu)** | kiểm gộp sau Task 6 |
| 5. Chờ xoá + chạy lại | **VIỆC LỚN (dữ liệu)** | kiểm gộp sau Task 6 |
| 6. Gộp hồ sơ mang ảnh | **VIỆC LỚN (dữ liệu)** | **bắt buộc ngay sau Task 6, phủ Task 3–6** |
| 7. Cổng triển khai 1e | **VIỆC LỚN (triển khai)** | **bắt buộc ngay sau Task 7, phủ Task 2 + 7** |
| 8. E2E, tài liệu, sổ hàng rào, bộ kiểm đủ | nhỏ + nghiệm thu | người kiểm cuối nhánh chạy lại phá thử |

Người thi công KHÔNG tự nghiệm thu (N8): chỉ báo "đạt" dựa trên báo cáo người kiểm + test.

**Giới hạn không vượt được ở lát này:** KHÔNG thử được với kho R2 thật của Cloudflare (AI không tạo kho, không chạy lệnh R2 thật). Mọi bài chạy trên kho giả (`tests/audit/harness.mjs`) hoặc kho mô phỏng của `wrangler dev` (miniflare). Chưa kiểm: (a) `wrangler deploy` có từ chối khi kho chưa tạo hay không; (b) định dạng đầu ra thật của `wrangler r2 bucket list` (đọc từ mã nguồn wrangler 4.147.0); (c) iPhone thật gửi HEIC nhãn nào; (d) tốc độ tải 10 MB qua mạng di động. Chủ thử một lần sau triển khai (runbook Task 8).

---

### Task 1: Migration 0104 — `pty_attachment`, `pty_attachment_link`, sổ dữ liệu, bất biến (VIỆC LỚN — dữ liệu)

**Files:**
- Create: `migrations/0104_ho_so_tep.sql`
- Create: `src/migrations-ho-so-tep.test.ts`
- Modify: `docs/data-dictionary.json` (mảng `tables`, khoá `hangDuLieu`)
- Regenerate: `docs/DATA-DICTIONARY.md` (`npm run dict`)
- Modify: `src/hang-du-lieu.test.ts` (`N3_GHIM`)
- Modify: `scripts/audit-checks.mjs` (`COT_N3_NHAT_KY`, hai mục `CHECKS` mới sau `R-PTY-10`)
- Modify: `src/audit-invariants.test.ts` (hai bài mới)
- Modify: `tests/audit/nhat-ky-hang.mjs` (`MIEN`)

**Interfaces:**
- Consumes: bảng `pty_party`, `pty_person_document`, `pty_organization_document` (migration `0032`, `0103`).
- Produces (các task sau dựa vào đúng tên này):
  - Bảng `pty_attachment(id, party_id, storage_key, content_kind, byte_size, content_hash, stored_at, purged_at, purge_reason, r2_deleted_at, created_at, created_by, updated_at, updated_by)`.
  - Bảng `pty_attachment_link(attachment_id, target_kind, target_id, created_at, created_by, updated_at, updated_by)`, khoá chính `(attachment_id, target_kind, target_id)`.
  - Mã lỗi trigger: `attachment_no_delete`, `attachment_identity`, `attachment_hash_one_way`, `attachment_purge_one_way`, `attachment_store_one_way`, `attachment_link_kind_closed`, `attachment_link_target_mismatch`, `attachment_link_purged`, `attachment_link_append_only`.
  - Kiểm định kỳ `R-PTY-11` (fail), `R-PTY-12` (warn).

- [ ] **Step 1: Viết bài đỏ `src/migrations-ho-so-tep.test.ts`**

```ts
// Kiểm migration kho tệp hồ sơ (ADR-0123; module parties; lát H-2 Gói 2): siêu dữ liệu tệp + dòng nối tệp ↔ dòng giấy tờ. Chèn / sửa THẲNG bằng SQL —
// chứng minh chặn nằm ở CSDL (lớp cuối nếu route có lỗ). Tệp tìm theo ĐUÔI tên. Ba mốc đi MỘT chiều (ruling Q3 của kế hoạch 2026-10-16-goi-2-h2-kho-tep):
// stored_at, purged_at (+ lý do, băm về rỗng), r2_deleted_at. Dòng nối chỉ-thêm thật. Mọi giá trị là giá trị GIẢ.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

const DIR = new URL("../migrations/", import.meta.url);
const files = readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();
const MATCHES = files.filter((f) => f.endsWith("_ho_so_tep.sql"));
const FILE = MATCHES[0]!;
const sqlOf = (f: string) => readFileSync(new URL(f, DIR), "utf8");
const open = (list: string[]) => {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON");
  for (const f of list) db.exec(sqlOf(f));
  return db;
};
const all = () => open(files);
const AT = "2026-10-16T03:00:00.000Z";
const AT2 = "2026-10-16T03:05:00.000Z";
const AT3 = "2026-10-16T03:10:00.000Z";
type Row = Record<string, unknown>;
const rows = (db: DatabaseSync, sql: string, ...a: string[]): Row[] => db.prepare(sql).all(...a).map((r) => ({ ...(r as Row) }));
const cotCua = (db: DatabaseSync, t: string): string[] => rows(db, `PRAGMA table_info(${t})`).map((r) => String(r.name));
const HASH = "a".repeat(64);
const KEY = (n: number) => `pty/${n.toString(16).padStart(32, "0")}`;

function nguoi(db: DatabaseSync, id: string): string {
  db.prepare("INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES (?, 'PERSON', ?, 1, ?, ?)").run(id, `Người ${id}`, AT, AT);
  db.prepare("INSERT INTO pty_person (party_id, given_name, created_at, updated_at) VALUES (?, ?, ?, ?)").run(id, `Người ${id}`, AT, AT);
  return id;
}
function toChuc(db: DatabaseSync, id: string): string {
  db.prepare("INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES (?, 'ORGANIZATION', ?, 1, ?, ?)").run(id, `Tổ chức ${id}`, AT, AT);
  db.prepare("INSERT INTO pty_organization (party_id, created_at, updated_at) VALUES (?, ?, ?)").run(id, AT, AT);
  return id;
}
const giayToNguoi = (db: DatabaseSync, id: string, party: string) =>
  db.prepare(`INSERT INTO pty_person_document (id, party_id, document_type_code, document_number, number_key, created_at, updated_at)
    VALUES (?, ?, 'HEALTH_CHECK', ?, ?, ?, ?)`).run(id, party, `SK${id}`, `SK${id}`.toUpperCase(), AT, AT);
const giayToToChuc = (db: DatabaseSync, id: string, party: string) =>
  db.prepare(`INSERT INTO pty_organization_document (id, party_id, document_type_code, document_number, number_key, created_at, updated_at)
    VALUES (?, ?, 'GPKD', ?, ?, ?, ?)`).run(id, party, `GP${id}`, `GP${id}`.toUpperCase(), AT, AT);
let n = 0;
function tep(db: DatabaseSync, party: string, x: Partial<Record<string, unknown>> = {}): string {
  const id = String(x.id ?? `t-${++n}`);
  db.prepare(`INSERT INTO pty_attachment (id, party_id, storage_key, content_kind, byte_size, content_hash, created_at, created_by, updated_at, updated_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    id, party, String(x.storage_key ?? KEY(n)), String(x.content_kind ?? "png"), Number(x.byte_size ?? 100), (x.content_hash === undefined ? HASH : x.content_hash) as string | null,
    AT, (x.created_by === undefined ? "s-sup" : x.created_by) as string | null, AT, "s-sup",
  );
  return id;
}
const noi = (db: DatabaseSync, tepId: string, kind: string, target: string) =>
  db.prepare(`INSERT INTO pty_attachment_link (attachment_id, target_kind, target_id, created_at, created_by, updated_at, updated_by) VALUES (?, ?, ?, ?, 's-sup', ?, 's-sup')`)
    .run(tepId, kind, target, AT, AT);

test("(a) đúng MỘT tệp đuôi _ho_so_tep.sql, đứng sau mọi tệp khác; chỉ THÊM (không DROP, không ALTER bảng cũ)", () => {
  assert.equal(MATCHES.length, 1, `cần đúng một tệp *_ho_so_tep.sql, thấy ${MATCHES.join(", ")}`);
  assert.equal(files.at(-1), FILE, "migration kho tệp phải là tệp mới nhất của nhánh");
  const sql = sqlOf(FILE).split("\n").filter((d) => !d.trim().startsWith("--")).join("\n");
  assert.doesNotMatch(sql, /\bDROP\b/i);
  assert.doesNotMatch(sql, /\bALTER\s+TABLE\b/i);
});

test("(b) cột của hai bảng đúng như kế hoạch; KHÔNG có cột tên tệp gốc", () => {
  const db = all();
  assert.deepEqual(cotCua(db, "pty_attachment"), [
    "id", "party_id", "storage_key", "content_kind", "byte_size", "content_hash", "stored_at", "purged_at", "purge_reason", "r2_deleted_at",
    "created_at", "created_by", "updated_at", "updated_by",
  ]);
  assert.deepEqual(cotCua(db, "pty_attachment_link"), ["attachment_id", "target_kind", "target_id", "created_at", "created_by", "updated_at", "updated_by"]);
});

test("(c) CHECK: khoá đúng khuôn pty/<32 hex>, loại đóng, cỡ 1..10 MB, băm 64 hex, người tải bắt buộc", () => {
  const db = all();
  const p = nguoi(db, "p1");
  tep(db, p);
  for (const [ten, x] of [
    ["khoá thiếu tiền tố", { storage_key: "abc/" + "0".repeat(32) }],
    ["khoá chữ hoa", { storage_key: "pty/" + "A".repeat(32) }],
    ["khoá ngắn", { storage_key: "pty/abc" }],
    ["khoá có ký tự lạ", { storage_key: "pty/" + "g".repeat(32) }],
    ["loại lạ (svg)", { content_kind: "svg" }],
    ["loại lạ (html)", { content_kind: "html" }],
    ["cỡ 0", { byte_size: 0 }],
    ["cỡ 10 MB + 1", { byte_size: 10485761 }],
    ["băm ngắn", { content_hash: "abc" }],
    ["băm chữ hoa", { content_hash: "A".repeat(64) }],
    ["băm rỗng khi chưa xoá", { content_hash: null }],
    ["không người tải", { created_by: null }],
  ] as const) {
    assert.throws(() => tep(db, p, x as Record<string, unknown>), /CHECK|NOT NULL/, ten);
  }
  assert.doesNotThrow(() => tep(db, p, { byte_size: 10485760, content_kind: "pdf" }), "đúng 10 MB, PDF");
  assert.doesNotThrow(() => tep(db, p, { content_kind: "heic" }));
  assert.doesNotThrow(() => tep(db, p, { content_kind: "jpg" }));
  assert.throws(() => tep(db, p, { storage_key: KEY(1) }), /UNIQUE/, "khoá trùng");
});

test("(d) ba mốc một chiều: tải → xác nhận lưu → quyết xoá (băm về rỗng) → đã xoá khỏi kho; mọi chuyển khác bị chặn", () => {
  const db = all();
  const p = nguoi(db, "p1");
  const t = tep(db, p);
  const sua = (sql: string, ...a: string[]) => db.prepare(sql).run(...a);
  // trước khi xoá: r2_deleted_at không được đặt (cùng câu với purged_at cũng không)
  assert.throws(() => sua("UPDATE pty_attachment SET r2_deleted_at = ? WHERE id = ?", AT2, t), /CHECK|attachment_purge_one_way/);
  assert.throws(() => sua("UPDATE pty_attachment SET purged_at = ?, purge_reason = 'TAI_LEN_LOI', content_hash = NULL, r2_deleted_at = ? WHERE id = ?", AT2, AT2, t), /attachment_purge_one_way/);
  // xoá mà còn băm → CHECK
  assert.throws(() => sua("UPDATE pty_attachment SET purged_at = ?, purge_reason = 'TAI_LEN_LOI' WHERE id = ?", AT2, t), /CHECK/);
  // xoá mà thiếu lý do → CHECK; lý do sai khuôn → CHECK
  assert.throws(() => sua("UPDATE pty_attachment SET purged_at = ?, content_hash = NULL WHERE id = ?", AT2, t), /CHECK/);
  assert.throws(() => sua("UPDATE pty_attachment SET purged_at = ?, purge_reason = 'tai len loi', content_hash = NULL WHERE id = ?", AT2, t), /CHECK/);
  // băm chỉ được về rỗng (đổi sang giá trị khác → chặn)
  assert.throws(() => sua("UPDATE pty_attachment SET content_hash = ? WHERE id = ?", "b".repeat(64), t), /attachment_hash_one_way/);
  // nội dung bất biến
  for (const [cot, v] of [["storage_key", KEY(999)], ["party_id", nguoi(db, "p2")], ["content_kind", "pdf"], ["byte_size", "5"], ["created_at", AT2], ["created_by", "s-khac"]] as const) {
    assert.throws(() => sua(`UPDATE pty_attachment SET ${cot} = ? WHERE id = ?`, v, t), /attachment_identity/, cot);
  }
  // xác nhận lưu: một lần
  sua("UPDATE pty_attachment SET stored_at = ? WHERE id = ?", AT2, t);
  assert.throws(() => sua("UPDATE pty_attachment SET stored_at = ? WHERE id = ?", AT3, t), /attachment_store_one_way/);
  assert.throws(() => sua("UPDATE pty_attachment SET stored_at = NULL WHERE id = ?", t), /attachment_store_one_way/);
  // quyết xoá hợp lệ
  sua("UPDATE pty_attachment SET purged_at = ?, purge_reason = 'TAI_LEN_LOI', content_hash = NULL WHERE id = ?", AT3, t);
  assert.throws(() => sua("UPDATE pty_attachment SET purged_at = NULL, purge_reason = NULL, content_hash = ? WHERE id = ?", HASH, t), /attachment_purge_one_way|attachment_hash_one_way|CHECK/);
  assert.throws(() => sua("UPDATE pty_attachment SET purge_reason = 'KHAC' WHERE id = ?", t), /attachment_purge_one_way/);
  // đã xoá khỏi kho: một lần
  sua("UPDATE pty_attachment SET r2_deleted_at = ? WHERE id = ?", AT3, t);
  assert.throws(() => sua("UPDATE pty_attachment SET r2_deleted_at = NULL WHERE id = ?", t), /attachment_purge_one_way/);
  // xác nhận lưu SAU khi đã xoá → chặn (tệp tải dở dang đã bị xử lý thì không "sống lại")
  const t2 = tep(db, p);
  sua("UPDATE pty_attachment SET purged_at = ?, purge_reason = 'TAI_LEN_DO_DANG', content_hash = NULL WHERE id = ?", AT2, t2);
  assert.throws(() => sua("UPDATE pty_attachment SET stored_at = ? WHERE id = ?", AT3, t2), /attachment_store_one_way/);
  assert.throws(() => sua("DELETE FROM pty_attachment WHERE id = ?", t2), /attachment_no_delete/);
});

test("(e) dòng nối: giấy tờ người / tổ chức của CHÍNH hồ sơ, hoặc của hồ sơ nó đã gộp vào; loại khác bị chặn; tệp đã xoá không nối được; chỉ-thêm", () => {
  const db = all();
  const a = nguoi(db, "pa");
  const b = nguoi(db, "pb");
  const o = toChuc(db, "o1");
  giayToNguoi(db, "da", a);
  giayToNguoi(db, "db", b);
  giayToToChuc(db, "do", o);
  const ta = tep(db, a);
  noi(db, ta, "PERSON_DOCUMENT", "da");
  assert.throws(() => noi(db, ta, "PERSON_DOCUMENT", "da"), /UNIQUE|PRIMARY KEY/, "nối trùng");
  assert.throws(() => noi(db, ta, "PERSON_DOCUMENT", "db"), /attachment_link_target_mismatch/, "giấy tờ của hồ sơ khác");
  assert.throws(() => noi(db, ta, "PERSON_DOCUMENT", "khong-co"), /attachment_link_target_mismatch/, "giấy tờ không tồn tại");
  assert.throws(() => noi(db, ta, "ORG_DOCUMENT", "do"), /attachment_link_target_mismatch/, "tệp của người nối vào giấy tờ tổ chức khác");
  const to = tep(db, o);
  assert.doesNotThrow(() => noi(db, to, "ORG_DOCUMENT", "do"));
  assert.throws(() => noi(db, ta, "SELF_SUBMISSION", "x"), /attachment_link_kind_closed/, "loại chưa mở (H-4 mở bằng trigger mới)");
  assert.throws(() => noi(db, ta, "person_document", "da"), /CHECK/, "loại sai khuôn mã");
  // gộp: A gộp vào B ⇒ tệp của A nối được sang giấy tờ của B
  db.prepare("UPDATE pty_party SET merged_into_id = ?, merged_at = ?, active = 0 WHERE id = ?").run(b, AT2, a); // trigger 0056: đích + mốc + ngưng cùng câu
  assert.doesNotThrow(() => noi(db, ta, "PERSON_DOCUMENT", "db"));
  // tệp đã quyết xoá → không nối mới
  const t2 = tep(db, b);
  db.prepare("UPDATE pty_attachment SET purged_at = ?, purge_reason = 'TAI_LEN_LOI', content_hash = NULL WHERE id = ?").run(AT2, t2);
  assert.throws(() => noi(db, t2, "PERSON_DOCUMENT", "db"), /attachment_link_purged/);
  // chỉ-thêm
  assert.throws(() => db.prepare("UPDATE pty_attachment_link SET target_id = 'db' WHERE attachment_id = ?").run(ta), /attachment_link_append_only/);
  assert.throws(() => db.prepare("DELETE FROM pty_attachment_link WHERE attachment_id = ?").run(ta), /attachment_link_append_only/);
});
```

- [ ] **Step 2: Chạy bài — phải đỏ**

Run: `node --test src/migrations-ho-so-tep.test.ts`
Expected: FAIL — `cần đúng một tệp *_ho_so_tep.sql, thấy ` (chưa có tệp), các bài khác lỗi `no such table: pty_attachment`.

- [ ] **Step 3: Viết `migrations/0104_ho_so_tep.sql`**

```sql
-- Migration 0104 — ADR-0123 (accepted 2026-10-16): kho tệp hồ sơ trên R2 (binding HO_SO). CHỈ THÊM. Module parties.
-- Nội dung tệp KHÔNG nằm trong D1 — chỉ ở kho R2 RIÊNG, khoá tên ngẫu nhiên không mang nghĩa (Hiến chương 5.22). KHÔNG lưu tên tệp gốc (tối thiểu hoá).
-- storage_key và content_hash là dữ liệu hạng N3 (ảnh giấy tờ — Hiến chương 5.20): KHÔNG BAO GIỜ vào nhật ký, DTO, câu báo lỗi.
-- Trigger chỉ đọc bảng pty_* (Hiến chương 5.3). Người tải ở created_by — không khoá ngoại sang staff (ADR-0003).
-- "Chỉ-thêm" của pty_attachment (ruling Q3 kế hoạch 2026-10-16-goi-2-h2-kho-tep): không xoá dòng; nội dung bất biến; BA mốc đi MỘT chiều:
--   stored_at     rỗng → có: đối tượng R2 đã đặt xong (tải lên ghi D1 TRƯỚC rồi mới đặt R2 — mọi đối tượng trong kho luôn có dòng ở đây).
--   purged_at     rỗng → có, CÙNG LÚC purge_reason (mã) và content_hash → rỗng: quyết định xoá đã ghi trong lô D1 (ADR-0123 đ6, ADR-0126 đ3).
--   r2_deleted_at rỗng → có, chỉ SAU purged_at (câu khác): đối tượng R2 đã xoá (việc bên ngoài chạy sau lô — Hiến chương 5.16).
--   "Chờ xoá" = purged_at có, r2_deleted_at rỗng — thấy được (GET /api/parties/tep-cho-xoa, kiểm R-PTY-12) và chạy lại được.

CREATE TABLE pty_attachment (
  id             TEXT PRIMARY KEY,
  party_id       TEXT NOT NULL REFERENCES pty_party(id),            -- hồ sơ nhận tệp LÚC TẢI (không đổi; gộp hồ sơ thêm dòng nối, không sửa cột này)
  storage_key    TEXT NOT NULL UNIQUE CHECK (length(storage_key) = 36 AND substr(storage_key, 1, 4) = 'pty/' AND substr(storage_key, 5) NOT GLOB '*[^0-9a-f]*'),
  content_kind   TEXT NOT NULL CHECK (content_kind IN ('jpg', 'png', 'heic', 'pdf')),   -- theo CHỮ KÝ thật (ADR-0123 đ2 — đổi danh sách = ADR mới)
  byte_size      INTEGER NOT NULL CHECK (byte_size BETWEEN 1 AND 10485760),
  content_hash   TEXT CHECK (content_hash IS NULL OR (length(content_hash) = 64 AND content_hash NOT GLOB '*[^0-9a-f]*')),  -- SHA-256 hex của nội dung
  stored_at      TEXT,
  purged_at      TEXT,
  purge_reason   TEXT CHECK (purge_reason IS NULL OR (purge_reason = upper(purge_reason) AND length(purge_reason) BETWEEN 2 AND 40 AND purge_reason NOT GLOB '*[^A-Z0-9_]*')),
  r2_deleted_at  TEXT,
  created_at     TEXT NOT NULL,
  created_by     TEXT,
  updated_at     TEXT NOT NULL,
  updated_by     TEXT,
  CHECK (created_by IS NOT NULL),
  CHECK ((purged_at IS NULL) = (purge_reason IS NULL)),
  CHECK ((purged_at IS NULL) = (content_hash IS NOT NULL)),
  CHECK (r2_deleted_at IS NULL OR purged_at IS NOT NULL)
);
CREATE INDEX pty_attachment_party_ix ON pty_attachment(party_id);
CREATE INDEX pty_attachment_cho_ix ON pty_attachment(created_at) WHERE r2_deleted_at IS NULL AND (purged_at IS NOT NULL OR stored_at IS NULL);

CREATE TRIGGER pty_attachment_no_delete BEFORE DELETE ON pty_attachment
BEGIN SELECT RAISE(ABORT, 'attachment_no_delete: tệp hồ sơ không xoá dòng — quyết xoá bằng purged_at'); END;
CREATE TRIGGER pty_attachment_identity BEFORE UPDATE ON pty_attachment
WHEN NEW.id IS NOT OLD.id OR NEW.party_id IS NOT OLD.party_id OR NEW.storage_key IS NOT OLD.storage_key OR NEW.content_kind IS NOT OLD.content_kind
  OR NEW.byte_size IS NOT OLD.byte_size OR NEW.created_at IS NOT OLD.created_at OR NEW.created_by IS NOT OLD.created_by
BEGIN SELECT RAISE(ABORT, 'attachment_identity: không đổi hồ sơ, khoá kho, loại, cỡ, mốc tạo của tệp'); END;
CREATE TRIGGER pty_attachment_hash_one_way BEFORE UPDATE OF content_hash ON pty_attachment
WHEN NEW.content_hash IS NOT NULL AND NEW.content_hash IS NOT OLD.content_hash
BEGIN SELECT RAISE(ABORT, 'attachment_hash_one_way: băm của tệp chỉ được xoá về rỗng (khi quyết xoá)'); END;
CREATE TRIGGER pty_attachment_purge_one_way BEFORE UPDATE ON pty_attachment
WHEN (OLD.purged_at IS NOT NULL AND (NEW.purged_at IS NOT OLD.purged_at OR NEW.purge_reason IS NOT OLD.purge_reason))
  OR (OLD.r2_deleted_at IS NOT NULL AND NEW.r2_deleted_at IS NOT OLD.r2_deleted_at)
  OR (OLD.r2_deleted_at IS NULL AND NEW.r2_deleted_at IS NOT NULL AND OLD.purged_at IS NULL)
BEGIN SELECT RAISE(ABORT, 'attachment_purge_one_way: quyết xoá và đã-xoá-khỏi-kho chỉ đi một chiều; đã-xoá-khỏi-kho chỉ sau khi quyết xoá'); END;
CREATE TRIGGER pty_attachment_store_one_way BEFORE UPDATE OF stored_at ON pty_attachment
WHEN (OLD.stored_at IS NOT NULL AND NEW.stored_at IS NOT OLD.stored_at) OR (OLD.stored_at IS NULL AND NEW.stored_at IS NOT NULL AND OLD.purged_at IS NOT NULL)
BEGIN SELECT RAISE(ABORT, 'attachment_store_one_way: mốc đã lưu chỉ đặt một lần, và không đặt cho tệp đã quyết xoá'); END;

-- Dòng nối tệp ↔ đối tượng (ADR-0123 đ4, đ5) — CHỈ-THÊM thật. target_kind là MÃ MỞ (CHECK khuôn, không liệt kê — ruling R6): trigger dưới đây chỉ mở
-- PERSON_DOCUMENT, ORG_DOCUMENT; loại khác (vd phiếu tự khai, lát H-4) mở bằng cách TẠO LẠI trigger, không dựng lại bảng.
-- Đích phải thuộc hồ sơ của tệp, hoặc hồ sơ mà hồ sơ của tệp đã GỘP VÀO (ADR-0068 Đ1 bước 4 — một bước, không chuỗi: Đ3).
CREATE TABLE pty_attachment_link (
  attachment_id  TEXT NOT NULL REFERENCES pty_attachment(id),
  target_kind    TEXT NOT NULL CHECK (target_kind = upper(target_kind) AND length(target_kind) BETWEEN 2 AND 30 AND target_kind NOT GLOB '*[^A-Z_]*'),
  target_id      TEXT NOT NULL,
  created_at     TEXT NOT NULL,
  created_by     TEXT,
  updated_at     TEXT NOT NULL,
  updated_by     TEXT,
  PRIMARY KEY (attachment_id, target_kind, target_id),
  CHECK (created_by IS NOT NULL)
);
CREATE INDEX pty_attachment_link_target_ix ON pty_attachment_link(target_kind, target_id);

CREATE TRIGGER pty_attachment_link_kind_ins BEFORE INSERT ON pty_attachment_link
WHEN NEW.target_kind NOT IN ('PERSON_DOCUMENT', 'ORG_DOCUMENT')
BEGIN SELECT RAISE(ABORT, 'attachment_link_kind_closed: loại nối này chưa mở'); END;
CREATE TRIGGER pty_attachment_link_purged_ins BEFORE INSERT ON pty_attachment_link
WHEN EXISTS (SELECT 1 FROM pty_attachment a WHERE a.id = NEW.attachment_id AND a.purged_at IS NOT NULL)
BEGIN SELECT RAISE(ABORT, 'attachment_link_purged: tệp đã quyết xoá — không nối thêm'); END;
CREATE TRIGGER pty_attachment_link_target_ins BEFORE INSERT ON pty_attachment_link
WHEN (NEW.target_kind = 'PERSON_DOCUMENT' AND NOT EXISTS (
        SELECT 1 FROM pty_person_document d JOIN pty_attachment a ON a.id = NEW.attachment_id
        WHERE d.id = NEW.target_id
          AND (d.party_id = a.party_id OR d.party_id = (SELECT p.merged_into_id FROM pty_party p WHERE p.id = a.party_id))))
  OR (NEW.target_kind = 'ORG_DOCUMENT' AND NOT EXISTS (
        SELECT 1 FROM pty_organization_document d JOIN pty_attachment a ON a.id = NEW.attachment_id
        WHERE d.id = NEW.target_id
          AND (d.party_id = a.party_id OR d.party_id = (SELECT p.merged_into_id FROM pty_party p WHERE p.id = a.party_id))))
BEGIN SELECT RAISE(ABORT, 'attachment_link_target_mismatch: dòng giấy tờ không thuộc hồ sơ của tệp'); END;
CREATE TRIGGER pty_attachment_link_no_update BEFORE UPDATE ON pty_attachment_link
BEGIN SELECT RAISE(ABORT, 'attachment_link_append_only: dòng nối tệp chỉ thêm, không sửa'); END;
CREATE TRIGGER pty_attachment_link_no_delete BEFORE DELETE ON pty_attachment_link
BEGIN SELECT RAISE(ABORT, 'attachment_link_append_only: dòng nối tệp không xoá'); END;
```

- [ ] **Step 4: Chạy bài migration — phải xanh**

Run: `node --test src/migrations-ho-so-tep.test.ts`
Expected: PASS (5 bài). Nếu ca "băm rỗng khi chưa xoá" báo lỗi khác `CHECK`: kiểm lại `CHECK ((purged_at IS NULL) = (content_hash IS NOT NULL))`.

- [ ] **Step 5: Bài đỏ cho hạng N3 và kiểm định kỳ**

`src/hang-du-lieu.test.ts` — thay hằng `N3_GHIM` bằng:

```ts
const N3_GHIM = [
  "pty_attachment.content_hash", "pty_attachment.storage_key",
  "pty_organization_document.document_number", "pty_organization_document.issued_place", "pty_organization_document.number_key",
  "pty_person_document.document_number", "pty_person_document.issued_place", "pty_person_document.number_key",
];
```

`src/audit-invariants.test.ts` — thêm sau bài `R-PTY-10` (dùng lại `one`, `build`, `violations`, `T1` có sẵn trong tệp; `toChucMoi` không cần):

```ts
const NGUOI_T = (db: DatabaseSync, id: string) => {
  db.prepare("INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES (?, 'PERSON', ?, 1, ?, ?)").run(id, id, T1, T1);
  db.prepare("INSERT INTO pty_person (party_id, given_name, created_at, updated_at) VALUES (?, ?, ?, ?)").run(id, id, T1, T1);
};
const TEP_T = (db: DatabaseSync, id: string, party: string, k: number, createdAt = T1) =>
  db.prepare(`INSERT INTO pty_attachment (id, party_id, storage_key, content_kind, byte_size, content_hash, created_at, created_by, updated_at, updated_by)
    VALUES (?, ?, ?, 'png', 10, ?, ?, 's', ?, 's')`).run(id, party, `pty/${String(k).padStart(32, "0")}`, "c".repeat(64), createdAt, createdAt);

test("R-PTY-11 (ADR-0123 đ4): mỗi tệp hồ sơ có ít nhất một dòng nối — có nối → 0; tệp mồ côi → 1", () => {
  const c = one("R-PTY-11");
  assert.equal(c.level, "fail");
  const db = build();
  NGUOI_T(db, "p-tep");
  db.prepare(`INSERT INTO pty_person_document (id, party_id, document_type_code, document_number, number_key, created_at, updated_at)
    VALUES ('g-tep', 'p-tep', 'HEALTH_CHECK', 'SKTEP1', 'SKTEP1', ?, ?)`).run(T1, T1);
  TEP_T(db, "t1", "p-tep", 1);
  db.prepare("INSERT INTO pty_attachment_link (attachment_id, target_kind, target_id, created_at, created_by, updated_at, updated_by) VALUES ('t1', 'PERSON_DOCUMENT', 'g-tep', ?, 's', ?, 's')").run(T1, T1);
  assert.equal(violations(db, c), 0);
  TEP_T(db, "t2", "p-tep", 2);
  assert.equal(violations(db, c), 1);
});

test("R-PTY-12 (ADR-0123 đ6, Hiến chương 5.16): tệp chờ xoá khỏi kho hoặc tải dở dang quá 1 giờ — mức warn (thấy được, không chặn phát hành)", () => {
  const c = one("R-PTY-12");
  assert.equal(c.level, "warn");
  const db = build();
  NGUOI_T(db, "p-tep");
  const xaRoi = new Date(Date.now() - 2 * 3600e3).toISOString();
  TEP_T(db, "t-moi", "p-tep", 1, new Date().toISOString()); // tải dở dang VỪA tạo — chưa tính
  assert.equal(violations(db, c), 0);
  TEP_T(db, "t-do-dang", "p-tep", 2, xaRoi);                 // tải dở dang quá 1 giờ
  assert.equal(violations(db, c), 1);
  db.prepare("UPDATE pty_attachment SET stored_at = ? WHERE id = 't-do-dang'").run(xaRoi);
  assert.equal(violations(db, c), 0);
  db.prepare("UPDATE pty_attachment SET purged_at = ?, purge_reason = 'TAI_LEN_LOI', content_hash = NULL WHERE id = 't-do-dang'").run(xaRoi);
  assert.equal(violations(db, c), 1, "chờ xoá khỏi kho");
  db.prepare("UPDATE pty_attachment SET r2_deleted_at = ? WHERE id = 't-do-dang'").run(xaRoi);
  assert.equal(violations(db, c), 0);
});
```

(`DatabaseSync` đã được import ở đầu `src/audit-invariants.test.ts`; nếu tên khác, dùng đúng tên kiểu mà các bài `R-PTY-*` sẵn có dùng.)

Run: `node --test src/hang-du-lieu.test.ts src/audit-invariants.test.ts src/nhat-ky-hang.test.ts`
Expected: FAIL — `cột chưa có hạng` (hai bảng mới), `not ok … R-PTY-11` (`one` không thấy mã), bài `R-PD-1 + COT_N3_NHAT_KY` đỏ (hai cột N3 chưa có dòng), `nhat-ky-hang (1)` đỏ (cột N3 chưa phụ trách / miễn).

- [ ] **Step 6: Sổ dữ liệu `docs/data-dictionary.json`**

Mảng `tables`, thêm ngay sau mục `pty_consent`:

```json
    {
      "name": "pty_attachment",
      "module": "parties",
      "kind": "table",
      "note": "tệp hồ sơ (ảnh / PDF giấy tờ) ở kho R2 riêng HO_SO (ADR-0123; migration 0104): khoá kho ngẫu nhiên, loại theo chữ ký, cỡ, băm SHA-256; KHÔNG tên tệp gốc; không xoá dòng — ba mốc một chiều stored_at / purged_at (+ lý do, băm về rỗng) / r2_deleted_at; 'chờ xoá' = purged_at có, r2_deleted_at rỗng"
    },
    {
      "name": "pty_attachment_link",
      "module": "parties",
      "kind": "table",
      "note": "nối tệp hồ sơ với dòng giấy tờ người / tổ chức (ADR-0123 đ4, đ5; migration 0104), CHỈ-THÊM; loại nối là mã mở, trigger chỉ mở PERSON_DOCUMENT, ORG_DOCUMENT; gộp hồ sơ thêm dòng nối sang dòng giấy tờ mới của hồ sơ chính"
    },
```

Khoá `hangDuLieu`, thêm hai mục (vị trí theo thứ tự chữ cái như các mục khác):

```json
    "pty_attachment": {
      "id": "N1", "party_id": "N1", "storage_key": "N3", "content_kind": "N1", "byte_size": "N1", "content_hash": "N3", "stored_at": "N1",
      "purged_at": "N1", "purge_reason": "N1", "r2_deleted_at": "N1", "created_at": "N1", "created_by": "N1", "updated_at": "N1", "updated_by": "N1"
    },
    "pty_attachment_link": {
      "attachment_id": "N1", "target_kind": "N1", "target_id": "N1", "created_at": "N1", "created_by": "N1", "updated_at": "N1", "updated_by": "N1"
    },
```

Run: `npm run dict`
Expected: `docs/DATA-DICTIONARY.md` có hai bảng mới và hai cột N3 mới ở mục "Hạng dữ liệu cá nhân".

- [ ] **Step 7: `scripts/audit-checks.mjs` — hai cột N3 và hai kiểm mới**

Trong `COT_N3_NHAT_KY`, thêm hai dòng đầu:

```js
  "pty_attachment.content_hash": { kiem: "R-PD-1", chuanHoa: false }, // ADR-0123 (lát H-2 Gói 2): băm ảnh giấy tờ — nhật ký chỉ mang mã tệp
  "pty_attachment.storage_key": { kiem: "R-PD-1", chuanHoa: false }, // khoá kho R2 — không bao giờ vào nhật ký
```

Trong `CHECKS`, ngay sau mục `R-PTY-10`:

```js
  // R-PTY-11 (ADR-0123 đ4): lô tải lên chèn dòng tệp + dòng nối cùng lúc — tệp không có dòng nối là dấu hiệu lô hỏng hoặc ghi tay.
  {
    code: "R-PTY-11",
    what: "mỗi tệp hồ sơ có ít nhất một dòng nối tới dòng giấy tờ",
    sql: "SELECT count(*) FROM pty_attachment a WHERE NOT EXISTS (SELECT 1 FROM pty_attachment_link l WHERE l.attachment_id = a.id)",
    level: "fail",
  },
  // R-PTY-12 (ADR-0123 đ6; Hiến chương 5.16): việc bên ngoài chưa xong — tệp đã quyết xoá mà kho chưa xoá, hoặc tải dở dang quá 1 giờ. Mức warn: THẤY được ở
  // mỗi lần audit-invariants (kể cả bước của npm run trien-khai), chạy lại bằng POST /api/parties/tep-cho-xoa/chay-lai; không chặn phát hành.
  {
    code: "R-PTY-12",
    what: "tệp hồ sơ chờ xoá khỏi kho R2, hoặc tải lên dở dang quá 1 giờ (chạy lại ở POST /api/parties/tep-cho-xoa/chay-lai)",
    sql: `SELECT count(*) FROM pty_attachment WHERE (purged_at IS NOT NULL AND r2_deleted_at IS NULL)
            OR (purged_at IS NULL AND stored_at IS NULL AND created_at < strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-1 hour'))`,
    level: "warn",
  },
```

- [ ] **Step 8: `tests/audit/nhat-ky-hang.mjs` — miễn tạm có lý do**

Trong `MIEN`, thêm:

```js
  "pty_attachment.content_hash": "chưa có route tải lên (Task 1 của kế hoạch 2026-10-16-goi-2-h2-kho-tep chỉ có bảng) — Task 4 chuyển sang src/modules/parties/tep-route.test.ts",
  "pty_attachment.storage_key": "chưa có route tải lên (Task 1 của kế hoạch 2026-10-16-goi-2-h2-kho-tep chỉ có bảng) — Task 4 chuyển sang src/modules/parties/tep-route.test.ts",
```

- [ ] **Step 9: Chạy lại — phải xanh**

Run: `node --test src/migrations-ho-so-tep.test.ts src/hang-du-lieu.test.ts src/audit-invariants.test.ts src/nhat-ky-hang.test.ts src/architecture.test.ts`
Expected: PASS. (`architecture.test.ts` kiểm tiền tố `pty_` thuộc `parties` và trigger chỉ đọc bảng của chính module.)

Run: `npm run db:migrate:local`
Expected: áp `0104_ho_so_tep.sql` sạch trên D1 local.

- [ ] **Step 10: Bộ kiểm đủ + commit**

Run: `npm test && npm run typecheck`
Expected: xanh.

```bash
git add migrations/0104_ho_so_tep.sql src/migrations-ho-so-tep.test.ts docs/data-dictionary.json docs/DATA-DICTIONARY.md src/hang-du-lieu.test.ts scripts/audit-checks.mjs src/audit-invariants.test.ts tests/audit/nhat-ky-hang.mjs
git commit -m "Migration 0104: kho tệp hồ sơ — pty_attachment, pty_attachment_link, ba mốc một chiều (ADR-0123)

Tệp ảnh / PDF giấy tờ cần chỗ ghi siêu dữ liệu trước khi có kho R2. Ghi D1 trước đặt R2 nên mọi đối tượng trong kho luôn có dòng ở đây;
quyết xoá và đã-xoá-khỏi-kho tách hai mốc để thấy được và chạy lại được việc bên ngoài (Hiến chương 5.16). Khoá kho và băm là N3."
```

- [ ] **Step 11: Người kiểm độc lập (bắt buộc)** — giao `nguoi-kiem-doc-lap`: đọc `migrations/0104_ho_so_tep.sql` và bài; chạy lại `node --test src/migrations-ho-so-tep.test.ts src/hang-du-lieu.test.ts src/audit-invariants.test.ts`; phá thử trên bản chép tạm (biến môi trường hoặc tệp tạm ngoài kho, không sửa tệp thật): (a) bỏ vế `OLD.r2_deleted_at IS NULL AND NEW.r2_deleted_at IS NOT NULL AND OLD.purged_at IS NULL` → bài (d) phải đỏ; (b) bỏ vế "hồ sơ đã gộp vào" của trigger nối → bài (e) đỏ; (c) đổi `CHECK ((purged_at IS NULL) = (content_hash IS NOT NULL))` thành chỉ một chiều → bài (c)/(d) đỏ. Báo cáo, không sửa.

---

### Task 2: Binding `HO_SO`, kho R2 giả trong khung thử, luật thuần tệp, lớp 3 service worker, rào "chỉ parties chạm kho" (VIỆC LỚN — triển khai)

**Files:**
- Modify: `wrangler.jsonc` (khối `r2_buckets`)
- Modify: `worker-configuration.d.ts` (`HO_SO?: R2Bucket`)
- Modify: `tests/audit/harness.mjs` (`khoR2Gia`, `env.HO_SO`, `w.r2`, `bytes` trong phản hồi `call`)
- Create: `src/modules/parties/tep.ts`, `src/modules/parties/tep.test.ts`
- Modify: `src/shared/sw-policy.ts`, `src/shared/sw-policy.test.ts`, `web/sw/sw.ts`
- Create: `src/kho-tep-ho-so.test.ts`

**Interfaces:**
- Consumes: không.
- Produces:
  - `Env.HO_SO?: R2Bucket` (vắng ⇒ route trả 503 `storage_unavailable`).
  - `tests/audit/harness.mjs`: `export function khoR2Gia()` trả `{ put, get, delete, co(key): boolean, soLan: { put, get, delete }, hong: { put, get, delete }, khiGet: ((key) => void) | null }`; `world()` trả thêm `r2`; `call()` trả thêm `bytes: Uint8Array`.
  - `src/modules/parties/tep.ts`:
    - `type LoaiTep = "jpg" | "png" | "heic" | "pdf"`
    - `const TOI_DA_BYTE = 10485760`, `const TOI_DA_BASE64 = 13981016`, `const TOI_DA_THAN = 13982040`, `const DO_DANG_SAU_MS = 600000`
    - `const LY_DO_XOA_TEP = { TAI_LEN_LOI: "TAI_LEN_LOI", TAI_LEN_DO_DANG: "TAI_LEN_DO_DANG" } as const`
    - `const LOAI_NOI_DUNG: Record<LoaiTep, string>`
    - `nhanLoaiTep(dau: Uint8Array): LoaiTep | null`
    - `giaiBase64(s: unknown): Uint8Array | null`
    - `type KiemTep = { ok: true; bytes: Uint8Array; loai: LoaiTep } | { ok: false; status: 400 | 413 | 415; code: string; message: string }`
    - `kiemTepTaiLen(body: Record<string, unknown> | null): KiemTep`
    - `khoaNgauNhien(): string`
    - `bamSha256(b: Uint8Array): Promise<string>`
    - `dauPhanHoiTep(t: { id: string; loai: LoaiTep }): Record<string, string>`
  - `src/shared/sw-policy.ts`: `isCacheable(res: { status; type; redirected; contentType; cacheControl?: string | null })`.

- [ ] **Step 1: Bài đỏ cho luật thuần — `src/modules/parties/tep.test.ts`**

```ts
// Luật THUẦN của kho tệp hồ sơ (ADR-0123 đ2, đ3; Hiến chương 5.22): nhận loại theo CHỮ KÝ thật, giải base64 chặt, trần 10 MB sau giải mã, khoá kho ngẫu nhiên,
// header phản hồi tải xuống. Mã MỚI (khuôn ADR-0041 chưa từng có mã thật) — mỗi ca một dòng tiêu chí.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DO_DANG_SAU_MS, LOAI_NOI_DUNG, TOI_DA_BASE64, TOI_DA_BYTE, TOI_DA_THAN, bamSha256, dauPhanHoiTep, giaiBase64, khoaNgauNhien, kiemTepTaiLen, nhanLoaiTep,
} from "./tep.ts";

const b = (...x: number[]) => new Uint8Array(x);
const ascii = (s: string) => new TextEncoder().encode(s);
const ghep = (...p: Uint8Array[]) => { const o = new Uint8Array(p.reduce((n, x) => n + x.length, 0)); let i = 0; for (const x of p) { o.set(x, i); i += x.length; } return o; };
const PNG = b(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);
const heif = (nhan: string) => ghep(b(0, 0, 0, 0x18), ascii("ftyp"), ascii(nhan), b(0, 0, 0, 0));
const b64 = (u: Uint8Array) => Buffer.from(u).toString("base64");

test("hằng số: 10 MB; trần base64 = 4·⌈10 MB/3⌉; trần thân = trần base64 + 1024; dở dang sau 10 phút", () => {
  assert.equal(TOI_DA_BYTE, 10 * 1024 * 1024);
  assert.equal(TOI_DA_BASE64, Math.ceil(TOI_DA_BYTE / 3) * 4);
  assert.equal(TOI_DA_THAN, TOI_DA_BASE64 + 1024);
  assert.equal(DO_DANG_SAU_MS, 10 * 60 * 1000);
});

test("nhanLoaiTep: JPG, PNG, PDF, HEIC theo chữ ký; HTML, SVG, GIF, ZIP, AVIF, chuỗi HEIF và rỗng → null", () => {
  assert.equal(nhanLoaiTep(b(0xff, 0xd8, 0xff, 0xe0, 0, 0)), "jpg");
  assert.equal(nhanLoaiTep(ghep(PNG, b(0, 0, 0, 0x0d))), "png");
  assert.equal(nhanLoaiTep(ascii("%PDF-1.7\n")), "pdf");
  for (const nhan of ["heic", "heix", "heim", "heis", "hevc", "hevx", "mif1"]) assert.equal(nhanLoaiTep(heif(nhan)), "heic", `HEIF nhãn ${nhan}`);
  for (const [ten, dau] of [
    ["HTML", ascii("<!DOCTYPE html><html>")],
    ["HTML có khoảng trắng đầu", ascii("  <html><script>")],
    ["SVG", ascii("<?xml version=\"1.0\"?><svg")],
    ["SVG trơn", ascii("<svg xmlns=")],
    ["GIF", ascii("GIF89a")],
    ["ZIP / DOCX", b(0x50, 0x4b, 0x03, 0x04)],
    ["AVIF", heif("avif")],
    ["chuỗi ảnh HEIF", heif("msf1")],
    ["PDF lệch byte đầu", ascii(" %PDF-1.7")],
    ["PNG thiếu byte", PNG.subarray(0, 7)],
    ["rỗng", new Uint8Array(0)],
  ] as const) assert.equal(nhanLoaiTep(dau), null, ten);
});

test("giaiBase64: chỉ nhận base64 chuẩn, độ dài chia hết cho 4; data:, khoảng trắng, ký tự lạ, rỗng, không phải chuỗi → null", () => {
  assert.deepEqual(giaiBase64(b64(b(1, 2, 3, 4))), b(1, 2, 3, 4));
  for (const x of ["", "AAA", "AA AA", "data:image/png;base64,AAAA", "AA-_", "====", 42, null, undefined, {}]) assert.equal(giaiBase64(x), null, String(x));
});

test("kiemTepTaiLen: đúng 10 MB qua; 10 MB + 1 byte → 413; chuỗi dài hơn trần base64 → 413 (không giải); HTML → 415 câu tiếng Việt; thiếu → 400", () => {
  const vua = new Uint8Array(TOI_DA_BYTE); vua.set(PNG);
  const k1 = kiemTepTaiLen({ noiDung: b64(vua) });
  assert.equal(k1.ok, true);
  if (k1.ok) { assert.equal(k1.loai, "png"); assert.equal(k1.bytes.length, TOI_DA_BYTE); }
  const qua = new Uint8Array(TOI_DA_BYTE + 1); qua.set(PNG);
  const k2 = kiemTepTaiLen({ noiDung: b64(qua) });
  assert.deepEqual(k2.ok ? null : [k2.status, k2.code], [413, "file_too_large"]);
  const k3 = kiemTepTaiLen({ noiDung: "A".repeat(TOI_DA_BASE64 + 4) });
  assert.deepEqual(k3.ok ? null : [k3.status, k3.code], [413, "file_too_large"]);
  const k4 = kiemTepTaiLen({ noiDung: b64(ascii("<html><script>alert(1)</script></html>")) });
  assert.deepEqual(k4.ok ? null : [k4.status, k4.code, k4.message], [415, "unsupported_file_type", "Chỉ nhận ảnh JPG, PNG, HEIC hoặc tệp PDF."]);
  for (const body of [null, {}, { noiDung: "" }, { noiDung: "@@@@" }, { noiDung: 5 }]) {
    const k = kiemTepTaiLen(body as Record<string, unknown> | null);
    assert.deepEqual(k.ok ? null : [k.status, k.code], [400, "invalid_input"], JSON.stringify(body));
  }
});

test("khoaNgauNhien: pty/ + 32 hex thường, không lặp lại; không chứa gì khác", () => {
  const ds = new Set(Array.from({ length: 200 }, () => khoaNgauNhien()));
  assert.equal(ds.size, 200);
  for (const k of ds) assert.match(k, /^pty\/[0-9a-f]{32}$/);
});

test("bamSha256: SHA-256 hex thường (vector chuẩn của chuỗi 'abc')", async () => {
  assert.equal(await bamSha256(ascii("abc")), "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
});

test("dauPhanHoiTep: no-store, nosniff, CSP sandbox, CORP same-origin; ảnh inline, PDF attachment; tên tải về không mang tên gốc", () => {
  const anh = dauPhanHoiTep({ id: "0123abcd-1111-4111-8111-111111111111", loai: "png" });
  assert.equal(anh["cache-control"], "no-store");
  assert.equal(anh["x-content-type-options"], "nosniff");
  assert.equal(anh["content-security-policy"], "default-src 'none'; sandbox");
  assert.equal(anh["cross-origin-resource-policy"], "same-origin");
  assert.equal(anh["content-type"], "image/png");
  assert.equal(anh["content-disposition"], 'inline; filename="giay-to-0123abcd.png"');
  const pdf = dauPhanHoiTep({ id: "0123abcd-1111-4111-8111-111111111111", loai: "pdf" });
  assert.equal(pdf["content-disposition"], 'attachment; filename="giay-to-0123abcd.pdf"');
  assert.deepEqual(LOAI_NOI_DUNG, { jpg: "image/jpeg", png: "image/png", heic: "image/heic", pdf: "application/pdf" });
});
```

Run: `node --test src/modules/parties/tep.test.ts`
Expected: FAIL — `Cannot find module …/tep.ts`.

- [ ] **Step 2: Viết `src/modules/parties/tep.ts`**

```ts
// Luật THUẦN của kho tệp hồ sơ (ADR-0123 đ2, đ3; Hiến chương 5.22). Không I/O ngoài Web Crypto. Mã MỚI: khuôn kiểm tệp của ADR-0041 chưa từng có mã thật
// (kế hoạch 2026-10-16-goi-2-h2-kho-tep, sự thật 1) — phỏng theo mã mẫu của kế hoạch 2026-09-28, bỏ DOC/DOCX/TXT/MD và bỏ phụ thuộc đuôi tên (không nhận tên tệp).
// Tải lên là JSON { noiDung: base64 } (ruling R3: router trả 415 cho lệnh ghi không phải JSON — không nới lớp chống gửi chéo trang).

export type LoaiTep = "jpg" | "png" | "heic" | "pdf";
export const TOI_DA_BYTE = 10 * 1024 * 1024;
export const TOI_DA_BASE64 = Math.ceil(TOI_DA_BYTE / 3) * 4;
/** Trần `Content-Length` (thân JSON = chuỗi base64 + vỏ) — vượt thì 413 TRƯỚC khi đọc thân. */
export const TOI_DA_THAN = TOI_DA_BASE64 + 1024;
/** Dòng tệp `stored_at` rỗng, chưa quyết xoá, tạo quá mốc này = "tải dở dang" (ruling R16) — lệnh chạy lại xử lý. */
export const DO_DANG_SAU_MS = 10 * 60 * 1000;
export const LY_DO_XOA_TEP = { TAI_LEN_LOI: "TAI_LEN_LOI", TAI_LEN_DO_DANG: "TAI_LEN_DO_DANG" } as const;
export const LOAI_NOI_DUNG: Record<LoaiTep, string> = { jpg: "image/jpeg", png: "image/png", heic: "image/heic", pdf: "application/pdf" };

const CAU_QUA_CO = "Tệp lớn hơn 10 MB.";
const CAU_SAI_LOAI = "Chỉ nhận ảnh JPG, PNG, HEIC hoặc tệp PDF.";
const CAU_THIEU = "Chưa có nội dung tệp, hoặc nội dung không đọc được.";

const bat = (d: Uint8Array, sig: readonly number[], o = 0): boolean => d.length >= o + sig.length && sig.every((x, i) => d[o + i] === x);
const chu = (d: Uint8Array, s: number, e: number): string => (d.length >= e ? String.fromCharCode(...d.subarray(s, e)) : "");
/** Nhãn chính của ảnh TĨNH HEIF (ruling R11). Không `msf1` (chuỗi ảnh), không `avif`. */
const HEIF = new Set(["heic", "heix", "heim", "heis", "hevc", "hevx", "mif1"]);

/** Loại theo CHỮ KÝ ở đầu tệp (không tin tên, đuôi hay loại trình duyệt khai). Không khớp ⇒ null (kể cả HTML, SVG). */
export function nhanLoaiTep(dau: Uint8Array): LoaiTep | null {
  if (bat(dau, [0xff, 0xd8, 0xff])) return "jpg";
  if (bat(dau, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "png";
  if (chu(dau, 0, 5) === "%PDF-") return "pdf";
  if (chu(dau, 4, 8) === "ftyp" && HEIF.has(chu(dau, 8, 12))) return "heic";
  return null;
}

const B64 = /^[A-Za-z0-9+/]*={0,2}$/;
/** Base64 chuẩn (RFC 4648 §4), không khoảng trắng, không tiền tố `data:`. Sai ⇒ null. */
export function giaiBase64(s: unknown): Uint8Array | null {
  if (typeof s !== "string" || s.length === 0 || s.length % 4 !== 0 || !B64.test(s)) return null;
  let bin: string;
  try {
    bin = atob(s);
  } catch {
    return null;
  }
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export type KiemTep = { ok: true; bytes: Uint8Array; loai: LoaiTep } | { ok: false; status: 400 | 413 | 415; code: string; message: string };
/** Thân `{ noiDung }`: 413 khi quá cỡ (kể cả chuỗi quá dài — không giải), 400 khi thiếu / hỏng, 415 khi sai loại. */
export function kiemTepTaiLen(body: Record<string, unknown> | null): KiemTep {
  const s = body?.noiDung;
  if (typeof s === "string" && s.length > TOI_DA_BASE64) return { ok: false, status: 413, code: "file_too_large", message: CAU_QUA_CO };
  const bytes = giaiBase64(s);
  if (!bytes || bytes.length === 0) return { ok: false, status: 400, code: "invalid_input", message: CAU_THIEU };
  if (bytes.length > TOI_DA_BYTE) return { ok: false, status: 413, code: "file_too_large", message: CAU_QUA_CO };
  const loai = nhanLoaiTep(bytes.subarray(0, 16));
  if (!loai) return { ok: false, status: 415, code: "unsupported_file_type", message: CAU_SAI_LOAI };
  return { ok: true, bytes, loai };
}

const hex = (u: Uint8Array): string => Array.from(u, (x) => x.toString(16).padStart(2, "0")).join("");
/** Khoá kho `pty/<128 bit ngẫu nhiên>` — không mang nghĩa (Hiến chương 5.22). */
export function khoaNgauNhien(): string {
  return `pty/${hex(crypto.getRandomValues(new Uint8Array(16)))}`;
}
export async function bamSha256(b: Uint8Array): Promise<string> {
  return hex(new Uint8Array(await crypto.subtle.digest("SHA-256", b)));
}

/** Header tải xuống (ADR-0123 đ3; ruling R4, R9). Không tên tệp gốc; ảnh xem tại chỗ, PDF tải về; không bao giờ phục vụ loại chạy được. */
export function dauPhanHoiTep(t: { id: string; loai: LoaiTep }): Record<string, string> {
  return {
    "content-type": LOAI_NOI_DUNG[t.loai],
    "content-disposition": `${t.loai === "pdf" ? "attachment" : "inline"}; filename="giay-to-${t.id.slice(0, 8)}.${t.loai}"`,
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    "content-security-policy": "default-src 'none'; sandbox",
    "cross-origin-resource-policy": "same-origin",
    "referrer-policy": "no-referrer",
  };
}
```

Run: `node --test src/modules/parties/tep.test.ts`
Expected: PASS (7 bài).

- [ ] **Step 3: Bài đỏ cho lớp 3 service worker — `src/shared/sw-policy.test.ts`**, thêm cuối tệp:

```ts
test("Hiến chương 5.22: đường tệp hồ sơ không bao giờ vào cache — lớp 1 (routeFor 'pass') VÀ lớp 3 (phản hồi no-store không lưu, kể cả ảnh PNG)", () => {
  const o = "https://booking.tourdao.vn";
  const id = "11111111-1111-4111-8111-111111111111";
  for (const p of [`/api/parties/${id}/documents/${id}/tep/${id}`, `/api/parties/${id}/documents/${id}/tep`, "/api/parties/tep-cho-xoa"]) {
    assert.equal(routeFor("GET", o + p, o), "pass", p);
  }
  const anh = { status: 200, type: "basic", redirected: false, contentType: "image/png" };
  assert.equal(isCacheable({ ...anh, cacheControl: "no-store" }), false, "PNG có no-store");
  assert.equal(isCacheable({ ...anh, cacheControl: "private, NO-STORE" }), false, "không phân biệt hoa thường");
  assert.equal(isCacheable({ ...anh, cacheControl: null }), true, "PNG của khung (icon) vẫn lưu được");
  assert.equal(isCacheable(anh), true, "lời gọi cũ không truyền cacheControl vẫn chạy");
});
```

Run: `node --test src/shared/sw-policy.test.ts`
Expected: FAIL — ca "PNG có no-store" `true !== false`.

- [ ] **Step 4: Lớp 3** — `src/shared/sw-policy.ts`, thay hàm `isCacheable` và dòng chú thích đầu tệp (lớp 2 → thêm lớp 3):

Ở khối chú thích đầu tệp, ngay sau dòng `//  2. isCacheable: …`, thêm:

```ts
//  3. isCacheable: phản hồi có `Cache-Control: no-store` KHÔNG BAO GIỜ được lưu (Hiến chương 5.22 — ảnh giấy tờ là image/png / image/jpeg, vốn thuộc loại
//     nội dung của khung; lớp 1 đã cho "pass", lớp này giữ khi ai đó lỡ thêm đường tệp vào danh sách khung).
```

Thay hàm:

```ts
/** Không lưu lỗi, phản hồi khác origin hay chuyển hướng, phản hồi `no-store` (lớp 3), và không bao giờ lưu nội dung không thuộc khung (JSON, văn bản thường, loại lạ). */
export function isCacheable(res: { status: number; type: string; redirected: boolean; contentType: string | null; cacheControl?: string | null }): boolean {
  if (/\bno-store\b/i.test(res.cacheControl ?? "")) return false;
  return res.status === 200 && res.type === "basic" && !res.redirected && CACHEABLE_TYPE.test(res.contentType ?? "");
}
```

`web/sw/sw.ts` — trong `staleWhileRevalidate`, thay lời gọi:

```ts
    if (isCacheable({ status: res.status, type: res.type, redirected: res.redirected, contentType: res.headers.get("content-type"), cacheControl: res.headers.get("cache-control") })) await cache.put(key, res.clone());
```

Kiểm không tệp khung nào trả `no-store` (sẽ thôi được lưu): `grep -rn "no-store" src/shared/http.ts src/modules/giao-dien/` — `json()` có `no-store` (JSON vốn không lưu), `/giao-dien.css` dùng `no-cache` (vẫn lưu). Nếu thấy chỗ khác trả HTML/CSS/JS kèm `no-store`, DỪNG và báo.

Run: `node --test src/shared/sw-policy.test.ts`
Expected: PASS.

- [ ] **Step 5: Binding và kiểu**

`wrangler.jsonc` — thêm ngay sau khối `"d1_databases": [ … ],` (chú thích CẢ DÒNG, không chú thích cuối dòng):

```jsonc
  // KHO TỆP HỒ SƠ (ADR-0123): ảnh / PDF giấy tờ của người — kho R2 RIÊNG (không dùng chung kho nào khác), khoá tên ngẫu nhiên, KHÔNG đường dẫn công khai;
  // chỉ module parties chạm binding này (bài src/kho-tep-ho-so.test.ts). Kho THẬT do CHỦ tạo một lần: `npx wrangler r2 bucket create tourdao-sales-ho-so`
  // (docs/HANDOFF-N1.md); `npm run trien-khai` DỪNG ở bước 1e nếu kho chưa có — tên kho đọc từ đúng dòng dưới (một nguồn). `wrangler dev` và e2e tự mô phỏng
  // kho ở máy (thư mục --persist-to), không cần mạng, không chạm kho thật.
  "r2_buckets": [{ "binding": "HO_SO", "bucket_name": "tourdao-sales-ho-so" }],
```

`worker-configuration.d.ts` — trong `interface __BaseEnv_Env`, ngay sau dòng `DB: D1Database;`:

```ts
	// Kho tệp hồ sơ (ADR-0123) — khai TAY như LAN_GUI_SECRET (worktree thi công không chạy `npm run types`). `npm run types` sinh lại từ khối r2_buckets của
	// wrangler.jsonc thành `HO_SO: R2Bucket` (bắt buộc); giữ DẤU HỎI: route tệp trả 503 khi binding vắng (khung thử không có kho) — không kiểm cấu hình toàn cục.
	HO_SO?: R2Bucket;
```

Run: `node --test src/cau-hinh-toc-do.test.ts && npm run typecheck`
Expected: PASS, 0 lỗi (tệp jsonc vẫn đọc được như JSON sau khi bỏ dòng chú thích).

- [ ] **Step 6: Kho R2 giả trong khung thử** — `tests/audit/harness.mjs`

Thêm hàm xuất (trước `export function world`):

```js
/**
 * Kho R2 GIẢ cho bài chạy cả ứng dụng (ADR-0123; kế hoạch 2026-10-16-goi-2-h2-kho-tep). Lưu byte trong bộ nhớ. Không nới luật nào:
 * - `hong.put / hong.get / hong.delete = true` — lần gọi kế tiếp ném lỗi (giả kho hỏng) để bài thấy dòng "chờ xoá" / "tải dở dang";
 * - `khiGet(key)` — chạy NGAY khi route gọi get (trước khi trả thân): bài kiểm "nhật ký đã có TRƯỚC khi đọc kho";
 * - `soLan` — đếm lời gọi; `co(key)` — đối tượng còn trong kho không.
 */
export function khoR2Gia() {
  const kho = new Map();
  const r2 = {
    hong: { put: false, get: false, delete: false },
    khiGet: null,
    soLan: { put: 0, get: 0, delete: 0 },
    co: (key) => kho.has(key),
    async put(key, value, opts) {
      r2.soLan.put++;
      if (r2.hong.put) throw new Error("r2_put_gia_hong");
      const b = value instanceof Uint8Array ? new Uint8Array(value) : new Uint8Array(await new Response(value).arrayBuffer());
      kho.set(key, { b, contentType: opts?.httpMetadata?.contentType ?? null });
      return { key, size: b.length };
    },
    async get(key) {
      r2.soLan.get++;
      if (r2.hong.get) throw new Error("r2_get_gia_hong");
      r2.khiGet?.(key);
      const x = kho.get(key);
      if (!x) return null;
      return { key, size: x.b.length, httpMetadata: { contentType: x.contentType }, body: new Response(x.b).body };
    },
    async delete(keys) {
      r2.soLan.delete++;
      if (r2.hong.delete) throw new Error("r2_delete_gia_hong");
      for (const k of [keys].flat()) kho.delete(k);
    },
  };
  return r2;
}
```

Trong `world()`: thay dòng `const env = { DB: fakeD1(sqlite, moc), … };` bằng

```js
  const r2 = khoR2Gia();
  const env = { DB: fakeD1(sqlite, moc), HO_SO: r2, SESSION_SECRET: SECRET, LAN_GUI_SECRET: LAN_GUI_SECRET_GIA, SERVICES_SHEET_ID: "x" };
```

Trong `call()`: thay hai dòng `const text = await res.text();` / `let json = …` bằng

```js
    const bytes = new Uint8Array(await res.arrayBuffer());
    const text = new TextDecoder().decode(bytes); // = res.text() (UTF-8, thay ký tự hỏng) — bài cũ không đổi
    let json = null; try { json = JSON.parse(text); } catch {}
    return { status: res.status, json, text, bytes, headers: res.headers };
```

và thêm `r2` vào đối tượng `world()` trả về (`return { sqlite, env, r2, call, … }`).

Run: `node --test src/modules/parties/rieng-tu-route.test.ts src/giay-to-khong-lo-so.test.ts`
Expected: PASS (bài cũ không đổi hành vi).

- [ ] **Step 7: Rào tĩnh "chỉ parties chạm kho" — `src/kho-tep-ho-so.test.ts`**

```ts
// HÀNG RÀO KHO TỆP HỒ SƠ (ADR-0123; Hiến chương 5.22; kế hoạch 2026-10-16-goi-2-h2-kho-tep). Phân tích TĨNH trên mã thật:
//   (1) chỉ tệp trong src/modules/parties/ (không kể *.test.ts) nhắc tới binding HO_SO — module khác muốn tệp thì gọi hàm công bố của parties;
//   (2) không có đường dẫn ký sẵn (presign / X-Amz-) ở bất kỳ đâu trong src/ — đường dẫn ký sẵn qua mặt can() lúc tải.
// Task 4 thêm (3), (4): thứ tự trong route tải xuống / tải lên.
// GIỚI HẠN: canh QUÊN, không canh CỐ Ý (đổi tên biến env, gọi qua hàm trung gian ở tệp khác của parties vẫn qua) — đọc mã vẫn là việc của người kiểm.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const SRC = fileURLToPath(new URL("./", import.meta.url));
function tepTs(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? tepTs(p) : p.endsWith(".ts") && !p.endsWith(".test.ts") ? [p] : [];
  });
}
const TEP = tepTs(SRC).map((p) => ({ p: relative(SRC, p).replaceAll("\\", "/"), src: readFileSync(p, "utf8") }));

test("(1) binding HO_SO chỉ được nhắc trong src/modules/parties/", () => {
  const ngoai = TEP.filter((f) => /\bHO_SO\b/.test(f.src) && !f.p.startsWith("modules/parties/")).map((f) => f.p);
  assert.deepEqual(ngoai, [], "tệp ngoài parties chạm kho tệp hồ sơ");
});

test("(2) không có đường dẫn ký sẵn của R2 trong src/", () => {
  const co = TEP.filter((f) => /presign|X-Amz-|createSignedUrl|signedUrl/i.test(f.src)).map((f) => f.p);
  assert.deepEqual(co, []);
});
```

Run: `node --test src/kho-tep-ho-so.test.ts`
Expected: PASS ngay (chưa ai chạm `HO_SO`). **Quan sát chặn thật (P16):** tạm thêm dòng `// HO_SO` vào `src/modules/orders/index.ts` → chạy lại → `not ok 1 - (1) binding HO_SO chỉ được nhắc…` → hoàn nguyên (`git diff --stat` sạch) → xanh. Ghi ngày vào ghi chú cho Task 8.

- [ ] **Step 8: Bộ kiểm đủ + commit**

Run: `npm test && npm run typecheck && npm run build:web`
Expected: xanh; `public/sw.js` dựng lại được.

```bash
git add wrangler.jsonc worker-configuration.d.ts tests/audit/harness.mjs src/modules/parties/tep.ts src/modules/parties/tep.test.ts src/shared/sw-policy.ts src/shared/sw-policy.test.ts web/sw/sw.ts src/kho-tep-ho-so.test.ts
git commit -m "Kho tệp hồ sơ: binding R2 HO_SO, luật nhận loại theo chữ ký, lớp thứ ba của service worker (ADR-0123)

Ảnh giấy tờ cần kho riêng, chỉ parties chạm. Nhận loại theo chữ ký thật (mã mới — khuôn ADR-0041 chưa từng có mã), trần 10 MB sau giải base64.
Service worker từng chỉ dựa vào danh sách đường dẫn để không lưu ảnh PNG; nay phản hồi no-store không bao giờ được lưu (Hiến chương 5.22)."
```

---

### Task 3: Ô `party.attachment.view` — chỉ Toàn quyền (VIỆC LỚN — quyền)

**Files:**
- Modify: `src/shared/permissions.ts`
- Modify: `src/shared/permissions.test.ts` (bảng `ADR`, `ADMIN_NONE_OPS`, ba bài ghim nguyên dòng DRIVER / DRIVER_PARTNER / HR)
- Modify: `src/modules/orders/xem-don-theo-quyen.test.ts` (`PARTNER_ROW`)
- Modify: `src/shared/tro-ly-cau-truc-ten.ts`

**Interfaces:**
- Consumes: `chiToanQuyen()` có sẵn trong `permissions.ts`.
- Produces: ô `"party.attachment.view"` = `chiToanQuyen()` (cột SUPER_ADMIN `any`, mọi cột khác `none`). Task 4, 5 hỏi bằng chuỗi nguyên văn `can(staff, "party.attachment.view")`.

- [ ] **Step 1: Bài đỏ (ảnh chụp bảng quyền)**

`src/shared/permissions.test.ts`, bảng `ADR`, ngay sau dòng `"party.document.reveal": […]`:

```ts
  "party.attachment.view": ["none", "none", "none", "none", "none", "any", "none", "none", "none", "none"], // ADR-0124 đ4 + ADR-0123: mở ảnh giấy tờ của người khác — CHỈ Toàn quyền; nhật ký trước mỗi lần mở
```

Mảng `ADMIN_NONE_OPS`, ngay sau dòng `"party.document.reveal", …`:

```ts
  "party.attachment.view", // ADR-0124 đ4: mở ảnh giấy tờ chỉ Toàn quyền — Quản trị ghi giấy tờ nhưng không mở ảnh (ruling Q1 kế hoạch H-2 kho tệp)
```

Ba bài ghim nguyên dòng (DRIVER, DRIVER_PARTNER, HR — các dòng có `"party.document.write": "none", "party.document.reveal": "none", "vehicle.manage": "none",`): đổi thành

```ts
    "party.document.write": "none", "party.document.reveal": "none", "party.attachment.view": "none", "vehicle.manage": "none",
```

`src/modules/orders/xem-don-theo-quyen.test.ts`, `PARTNER_ROW`, dòng `"party.document.view": "none", "party.document.write": "none", "party.document.reveal": "none", …` đổi thành

```ts
    "party.document.view": "none", "party.document.write": "none", "party.document.reveal": "none", "party.attachment.view": "none", // ADR-0040 D2, ADR-0124 đ4: Đối tác không có giấy tờ / ảnh của người khác
```

Run: `node --test src/shared/permissions.test.ts src/modules/orders/xem-don-theo-quyen.test.ts`
Expected: FAIL (MATRIX chưa có ô `party.attachment.view`).

- [ ] **Step 2: Thêm ô**

`src/shared/permissions.ts`, ngay sau dòng `"party.document.reveal": chiToanQuyen(),`:

```ts
  // ADR-0124 đ4 + ADR-0123 (accepted 2026-10-16): MỞ ẢNH giấy tờ của người khác ngoài hàng chờ xác minh — CHỈ Toàn quyền. Mỗi lần mở một dòng nhật ký CHỈ MÃ,
  // ghi TRƯỚC khi đọc kho R2. Lát H-2 dùng thêm ô này cho: tải ảnh lên (kèm party.document.write — ruling Q1 kế hoạch 2026-10-16-goi-2-h2-kho-tep) và hàng
  // "chờ xoá" của kho (ruling Q4). Route: GET/POST /api/parties/:id/documents/:did/tep*, GET /api/parties/tep-cho-xoa, POST …/chay-lai. Mở ảnh của PHIẾU ĐANG
  // CHỜ là ô khác (party.verify.attachment — lát H-4).
  "party.attachment.view": chiToanQuyen(),
```

`src/shared/tro-ly-cau-truc-ten.ts`, ngay sau mục `"party.document.reveal"`:

```ts
  "party.attachment.view": { ten: "mở ảnh giấy tờ", moTa: "Tải ảnh giấy tờ lên và mở ảnh giấy tờ của người khác; mỗi lần mở được ghi lại." },
```

Run: `node --test src/shared/permissions.test.ts src/modules/orders/xem-don-theo-quyen.test.ts src/shared/tro-ly-cau-truc.test.ts`
Expected: PASS. `src/permission-enforcement.test.ts` ĐỎ tới Task 4 (chưa route nào hỏi ô) — đúng dự kiến; KHÔNG thêm mục hoãn vào `docs/quyen-hoan.json`. KHÔNG commit riêng: Task 3 và Task 4 commit chung ở cuối Task 4. Nếu phải dừng giữa hai task, câu trả lời cuối ghi nguyên văn **BỘ KIỂM CHƯA XANH** kèm tên `src/permission-enforcement.test.ts`.

---

### Task 4: Route tải lên / danh sách / tải xuống, nhật ký ghi trước, xoá-sau-lô khi kho hỏng (VIỆC LỚN — quyền, dữ liệu)

**Files:**
- Modify: `src/shared/contracts.ts` (DTO kho tệp)
- Modify: `src/shared/audit-actions.ts` (bốn hành động)
- Modify: `src/modules/parties/repository.ts` (câu SQL tệp)
- Create: `src/modules/parties/kho-tep.ts`, `src/modules/parties/kho-tep.test.ts`
- Modify: `src/modules/parties/index.ts` (ba route + hằng lỗi + `cauDatChoXoa`)
- Create: `src/modules/parties/tep-route.test.ts`
- Modify: `src/kho-tep-ho-so.test.ts` (bài (3), (4))
- Modify: `src/route-access.test.ts` (ảnh chụp + số route trong tên bài)
- Modify: `src/giay-to-khong-lo-so.test.ts` (`TUYEN`)
- Modify: `tests/audit/nhat-ky-hang.mjs` (`MIEN` → `PHU_TRACH`)
- Modify: `src/shared/lan-gui-no.ts` (`GHI_NHIEU_LAN` — đề xuất chờ chủ duyệt, ruling Q6)

**Interfaces:**
- Consumes: Task 1 (bảng, trigger), Task 2 (`tep.ts`, `HO_SO`, `khoR2Gia`, `w.r2`, `bytes`), Task 3 (ô).
- Produces:
  - `contracts.ts`: `type LoaiTepHoSo = "jpg" | "png" | "heic" | "pdf"`; `interface HoSoTepDto { id: string; loai: LoaiTepHoSo; kichThuoc: number; taiLuc: string }`; `interface HoSoTepListResponse { tep: HoSoTepDto[] }`; `interface HoSoTepCreatedResponse { tep: HoSoTepDto }`; `interface HoSoTepChoXoaDto { id: string; trangThai: "CHO_XOA" | "TAI_DO_DANG"; lyDo: string | null; luc: string }`; `interface HoSoTepChoXoaResponse { tep: HoSoTepChoXoaDto[] }`; `interface HoSoTepChayLaiResponse { daXoa: number; conLai: number }`.
  - `audit-actions.ts`: `party_attachment_added`, `party_attachment_viewed`, `party_attachment_purged`, `party_attachment_purge_retried`.
  - `repository.ts`: `insertTepStatement(db, { id, partyId, key, loai, kichThuoc, bam, at, actorId })`, `insertTepLinkStatement(db, { tepId, kind, targetId, at, actorId })`, `markTepStored(db, id, at): Promise<number>`, `listTepCuaGiayTo(db, partyId, docId): Promise<TepRow[]>`, `findTepDeTai(db, partyId, docId, tepId): Promise<TepTaiRow | null>`, `datChoXoaTepStatement(db, { id, lyDo, at, actorId })`, `markTepR2Deleted(db, id, at): Promise<number>`; kiểu `TepRow`, `TepTaiRow`.
  - `kho-tep.ts`: `interface TepCanXoa { id: string; storage_key: string }`; `xoaKhoiKho(db, kho, ds, luc): Promise<{ daXoa: number; loi: number }>`; `ghiRoiXoaKho(db, kho, lo, ds, luc): Promise<{ daXoa: number; loi: number }>`.
  - `index.ts` (nội bộ module): `cauDatChoXoa(db, cau, t: { id; party_id }, lyDo, at, actorId): D1PreparedStatement[]`; hằng `TEP_FORBIDDEN`, `TEP_NOT_FOUND`, `KHO_CHUA_BAT`.
  - Route: `POST /api/parties/:id/documents/:did/tep` (201 `HoSoTepCreatedResponse`), `GET /api/parties/:id/documents/:did/tep` (`HoSoTepListResponse`), `GET /api/parties/:id/documents/:did/tep/:tid` (thân tệp).

- [ ] **Step 1: Bài đỏ cho việc bên ngoài — `src/modules/parties/kho-tep.test.ts`**

```ts
// Việc BÊN NGOÀI của kho tệp (ADR-0123 đ6; Hiến chương 5.16): lô D1 (quyết xoá) chạy TRƯỚC, xoá R2 SAU; lô lỗi ⇒ không chạm kho; kho lỗi ⇒ không ném,
// dòng còn "chờ xoá" để chạy lại. Chạy trên SQLite THẬT (schema từ migrations) + kho R2 giả.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { fakeD1, khoR2Gia, openDb } from "../../../tests/audit/harness.mjs";
import { ghiRoiXoaKho, xoaKhoiKho } from "./kho-tep.ts";
import { datChoXoaTepStatement } from "./repository.ts";

const AT = "2026-10-16T03:00:00.000Z";
const KEY = "pty/" + "1".repeat(32);
function dung() {
  const db = openDb();
  const D = fakeD1(db);
  const r2 = khoR2Gia();
  db.prepare("INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES ('p', 'PERSON', 'p', 1, ?, ?)").run(AT, AT);
  db.prepare("INSERT INTO pty_person (party_id, given_name, created_at, updated_at) VALUES ('p', 'p', ?, ?)").run(AT, AT);
  db.prepare(`INSERT INTO pty_attachment (id, party_id, storage_key, content_kind, byte_size, content_hash, stored_at, created_at, created_by, updated_at, updated_by)
    VALUES ('t', 'p', ?, 'png', 3, ?, ?, ?, 's', ?, 's')`).run(KEY, "d".repeat(64), AT, AT, AT);
  return { db, D, r2 };
}
const dong = (db: any) => ({ ...db.prepare("SELECT purged_at, purge_reason, content_hash, r2_deleted_at FROM pty_attachment WHERE id = 't'").get() });
const luc = () => "2026-10-16T04:00:00.000Z";

test("ghiRoiXoaKho: lô D1 TRƯỚC (quyết xoá, băm về rỗng) rồi mới xoá kho; xoá xong đánh dấu r2_deleted_at", async () => {
  const { db, D, r2 } = dung();
  await r2.put(KEY, new Uint8Array([1, 2, 3]));
  let lucXoa: unknown = null;
  const xoaGoc = r2.delete;
  r2.delete = async (k: string) => { lucXoa = dong(db); return xoaGoc(k); };
  const kq = await ghiRoiXoaKho(D, r2, [datChoXoaTepStatement(D, { id: "t", lyDo: "TAI_LEN_LOI", at: AT, actorId: "s" })], [{ id: "t", storage_key: KEY }], luc);
  assert.deepEqual(kq, { daXoa: 1, loi: 0 });
  assert.equal((lucXoa as any).purged_at, AT, "lúc xoá kho, quyết định xoá ĐÃ nằm trong CSDL");
  assert.equal(r2.co(KEY), false);
  assert.deepEqual(dong(db), { purged_at: AT, purge_reason: "TAI_LEN_LOI", content_hash: null, r2_deleted_at: luc() });
});

test("ghiRoiXoaKho: lô D1 lỗi ⇒ ném lên, KHÔNG gọi xoá kho, dòng không đổi", async () => {
  const { db, D, r2 } = dung();
  await assert.rejects(ghiRoiXoaKho(D, r2, [D.prepare("INSERT INTO bang_khong_co VALUES (1)")], [{ id: "t", storage_key: KEY }], luc));
  assert.equal(r2.soLan.delete, 0);
  assert.equal(dong(db).purged_at, null);
});

test("xoaKhoiKho: kho lỗi ⇒ KHÔNG ném, đếm lỗi, dòng còn 'chờ xoá' (purged_at có, r2_deleted_at rỗng); lần sau kho lành ⇒ xoá xong", async () => {
  const { db, D, r2 } = dung();
  db.prepare("UPDATE pty_attachment SET purged_at = ?, purge_reason = 'TAI_LEN_LOI', content_hash = NULL WHERE id = 't'").run(AT);
  r2.hong.delete = true;
  assert.deepEqual(await xoaKhoiKho(D, r2, [{ id: "t", storage_key: KEY }], luc), { daXoa: 0, loi: 1 });
  assert.equal(dong(db).r2_deleted_at, null);
  r2.hong.delete = false;
  assert.deepEqual(await xoaKhoiKho(D, r2, [{ id: "t", storage_key: KEY }], luc), { daXoa: 1, loi: 0 });
  assert.equal(dong(db).r2_deleted_at, luc());
});
```

Run: `node --test src/modules/parties/kho-tep.test.ts`
Expected: FAIL — `Cannot find module …/kho-tep.ts` (và `datChoXoaTepStatement` chưa có).

- [ ] **Step 2: Câu SQL — `src/modules/parties/repository.ts`**

Thêm ở đầu tệp, cạnh các import có sẵn:

```ts
import type { LoaiTep } from "./tep.ts";
```

Thêm cuối tệp:

```ts
// ---- Kho tệp hồ sơ (ADR-0123; migration 0104; lát H-2 Gói 2) — storage_key và content_hash là N3: CHỈ đi trong câu lệnh, KHÔNG BAO GIỜ ra DTO, nhật ký,
// câu lỗi. Tải lên ghi D1 TRƯỚC (dòng tệp + dòng nối, stored_at rỗng) rồi mới đặt R2, rồi mark_attachment_stored (ruling Q2 kế hoạch 2026-10-16-goi-2-h2-kho-tep).
export interface TepRow { id: string; content_kind: LoaiTep; byte_size: number; stored_at: string }
export interface TepTaiRow { id: string; storage_key: string; content_kind: LoaiTep; type_name: string }
const INSERT_TEP = defineSql(
  "parties",
  "insert_attachment",
  `INSERT INTO pty_attachment (id, party_id, storage_key, content_kind, byte_size, content_hash, created_at, created_by, updated_at, updated_by)
   VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?7, ?8)`,
);
const INSERT_TEP_LINK = defineSql(
  "parties",
  "insert_attachment_link",
  "INSERT INTO pty_attachment_link (attachment_id, target_kind, target_id, created_at, created_by, updated_at, updated_by) VALUES (?1, ?2, ?3, ?4, ?5, ?4, ?5)",
);
const MARK_TEP_STORED = defineSql(
  "parties",
  "mark_attachment_stored",
  "UPDATE pty_attachment SET stored_at = ?2, updated_at = ?2 WHERE id = ?1 AND stored_at IS NULL AND purged_at IS NULL",
);
// Chỉ tệp ĐÃ LƯU, CHƯA quyết xoá, nối tới dòng giấy tờ ?2 của ĐÚNG hồ sơ ?1 (đường dẫn mang cả hai — không tin một mình mã tệp).
const LIST_TEP_CUA_GIAY_TO = defineSql(
  "parties",
  "list_attachments_of_person_document",
  `SELECT a.id, a.content_kind, a.byte_size, a.stored_at FROM pty_attachment a
   JOIN pty_attachment_link l ON l.attachment_id = a.id AND l.target_kind = 'PERSON_DOCUMENT' AND l.target_id = ?2
   JOIN pty_person_document d ON d.id = l.target_id AND d.party_id = ?1
   WHERE a.stored_at IS NOT NULL AND a.purged_at IS NULL ORDER BY a.stored_at, a.id`,
);
const FIND_TEP_DE_TAI = defineSql(
  "parties",
  "find_attachment_for_download",
  `SELECT a.id, a.storage_key, a.content_kind, t.name AS type_name FROM pty_attachment a
   JOIN pty_attachment_link l ON l.attachment_id = a.id AND l.target_kind = 'PERSON_DOCUMENT' AND l.target_id = ?2
   JOIN pty_person_document d ON d.id = l.target_id AND d.party_id = ?1
   JOIN pty_person_document_type t ON t.code = d.document_type_code
   WHERE a.id = ?3 AND a.stored_at IS NOT NULL AND a.purged_at IS NULL`,
);
// Quyết xoá (ADR-0123 đ6, ADR-0126 đ3): purged_at + mã lý do + băm về rỗng, MỘT lần (trigger một chiều). ?5 = điều kiện thêm cho tệp tải dở dang (Task 5):
// NULL = không điều kiện; có giá trị = chỉ khi stored_at còn rỗng và created_at < ?5 (tệp đã lưu xong trong khe thì KHÔNG bị quyết xoá).
const PURGE_TEP = defineSql(
  "parties",
  "purge_attachment",
  `UPDATE pty_attachment SET purged_at = ?2, purge_reason = ?3, content_hash = NULL, updated_at = ?2, updated_by = ?4
   WHERE id = ?1 AND purged_at IS NULL AND (?5 IS NULL OR (stored_at IS NULL AND created_at < ?5))`,
);
const MARK_TEP_R2_DELETED = defineSql(
  "parties",
  "mark_attachment_r2_deleted",
  "UPDATE pty_attachment SET r2_deleted_at = ?2, updated_at = ?2 WHERE id = ?1 AND purged_at IS NOT NULL AND r2_deleted_at IS NULL",
);

export const insertTepStatement = (
  db: D1Database, v: { id: string; partyId: string; key: string; loai: LoaiTep; kichThuoc: number; bam: string; at: string; actorId: string },
): D1PreparedStatement => db.prepare(INSERT_TEP).bind(v.id, v.partyId, v.key, v.loai, v.kichThuoc, v.bam, v.at, v.actorId);
export const insertTepLinkStatement = (
  db: D1Database, v: { tepId: string; kind: "PERSON_DOCUMENT" | "ORG_DOCUMENT"; targetId: string; at: string; actorId: string },
): D1PreparedStatement => db.prepare(INSERT_TEP_LINK).bind(v.tepId, v.kind, v.targetId, v.at, v.actorId);
export async function markTepStored(db: D1Database, id: string, at: string): Promise<number> {
  return (await db.prepare(MARK_TEP_STORED).bind(id, at).run()).meta.changes ?? 0;
}
export async function listTepCuaGiayTo(db: D1Database, partyId: string, docId: string): Promise<TepRow[]> {
  return (await db.prepare(LIST_TEP_CUA_GIAY_TO).bind(partyId, docId).all<TepRow>()).results;
}
export function findTepDeTai(db: D1Database, partyId: string, docId: string, tepId: string): Promise<TepTaiRow | null> {
  return db.prepare(FIND_TEP_DE_TAI).bind(partyId, docId, tepId).first<TepTaiRow>();
}
export const datChoXoaTepStatement = (db: D1Database, v: { id: string; lyDo: string; at: string; actorId: string; doDangTruoc?: string }): D1PreparedStatement =>
  db.prepare(PURGE_TEP).bind(v.id, v.at, v.lyDo, v.actorId, v.doDangTruoc ?? null);
export async function markTepR2Deleted(db: D1Database, id: string, at: string): Promise<number> {
  return (await db.prepare(MARK_TEP_R2_DELETED).bind(id, at).run()).meta.changes ?? 0;
}
```

- [ ] **Step 3: `src/modules/parties/kho-tep.ts`**

```ts
// Việc BÊN NGOÀI của kho tệp hồ sơ (ADR-0123 đ6; Hiến chương 5.16): xoá đối tượng R2 chạy SAU lô D1 đã ghi quyết định xoá. Lỗi R2 KHÔNG ném — dòng còn "chờ xoá"
// (purged_at có, r2_deleted_at rỗng) để thấy được (GET /api/parties/tep-cho-xoa, kiểm R-PTY-12) và chạy lại (POST /api/parties/tep-cho-xoa/chay-lai).
// Không import module khác (chạy được bằng node --test). Chỉ parties chạm kho (bài src/kho-tep-ho-so.test.ts).
import { markTepR2Deleted } from "./repository.ts";

export interface TepCanXoa { id: string; storage_key: string }

/** Xoá từng đối tượng rồi đánh dấu `r2_deleted_at`. Xoá R2 vốn không lỗi khi đối tượng đã mất (chạy lại an toàn). */
export async function xoaKhoiKho(db: D1Database, kho: R2Bucket, ds: readonly TepCanXoa[], luc: () => string): Promise<{ daXoa: number; loi: number }> {
  let daXoa = 0;
  let loi = 0;
  for (const t of ds) {
    try {
      await kho.delete(t.storage_key);
      await markTepR2Deleted(db, t.id, luc());
      daXoa++;
    } catch (e) {
      loi++;
      console.error(JSON.stringify({ level: "error", event: "ho_so_tep_xoa_kho_loi", tepId: t.id, loi: e instanceof Error ? e.name : "unknown" }));
    }
  }
  return { daXoa, loi };
}

/** Lô D1 (quyết xoá + nhật ký) TRƯỚC, rồi mới xoá kho. Lô lỗi ⇒ ném lên, KHÔNG chạm kho. */
export async function ghiRoiXoaKho(
  db: D1Database, kho: R2Bucket, lo: D1PreparedStatement[], ds: readonly TepCanXoa[], luc: () => string,
): Promise<{ daXoa: number; loi: number }> {
  if (lo.length > 0) await db.batch(lo);
  return xoaKhoiKho(db, kho, ds, luc);
}
```

Run: `node --test src/modules/parties/kho-tep.test.ts`
Expected: PASS (3 bài).

- [ ] **Step 4: DTO và hành động nhật ký**

`src/shared/contracts.ts`, ngay sau `export interface PersonDocumentRevealResponse { number: string }`:

```ts
// ---- Kho tệp hồ sơ (ADR-0123; lát H-2 Gói 2) — KHÔNG tên tệp gốc, KHÔNG khoá kho, KHÔNG băm (N3). Thân tệp chỉ ở GET …/tep/:tid. ----
export type LoaiTepHoSo = "jpg" | "png" | "heic" | "pdf";
export interface HoSoTepDto { id: string; loai: LoaiTepHoSo; kichThuoc: number; taiLuc: string }
export interface HoSoTepListResponse { tep: HoSoTepDto[] }
export interface HoSoTepCreatedResponse { tep: HoSoTepDto }
/** Hàng "chờ xoá" (Hiến chương 5.16): CHO_XOA = đã quyết xoá, kho chưa xoá xong; TAI_DO_DANG = tải lên chưa xác nhận đã lưu quá 10 phút. */
export interface HoSoTepChoXoaDto { id: string; trangThai: "CHO_XOA" | "TAI_DO_DANG"; lyDo: string | null; luc: string }
export interface HoSoTepChoXoaResponse { tep: HoSoTepChoXoaDto[] }
export interface HoSoTepChayLaiResponse { daXoa: number; conLai: number }
```

`src/shared/audit-actions.ts`, ngay sau `party_document_number_viewed`:

```ts
  // ADR-0123 (kho tệp hồ sơ, lát H-2 Gói 2): `detail` CHỈ MÃ — "<tên loại giấy tờ> · tệp <mã tệp>" / "tệp <mã> · <mã lý do>"; KHÔNG tên tệp gốc, khoá kho, băm.
  party_attachment_added: { label: "Thêm ảnh giấy tờ", group: "party" },
  party_attachment_viewed: { label: "Mở ảnh giấy tờ", group: "party" },
  party_attachment_purged: { label: "Quyết xoá ảnh giấy tờ khỏi kho", group: "party" },
  party_attachment_purge_retried: { label: "Chạy lại xoá ảnh khỏi kho", group: "system" },
```

- [ ] **Step 5: Bài đỏ cho route — `src/modules/parties/tep-route.test.ts`**

```ts
// Kho tệp hồ sơ qua route THẬT (tests/audit/harness.mjs + kho R2 giả; ADR-0123; lát H-2 Gói 2). Tải lên: chỉ Toàn quyền (ruling Q1), ghi D1 TRƯỚC rồi đặt kho
// (ruling Q2), loại theo chữ ký, trần 10 MB. Tải xuống: 403 không ghi nhật ký; nhật ký có TRƯỚC khi đọc kho; nhật ký lỗi ⇒ không đọc kho; header no-store + nosniff.
// Nhật ký không chứa khoá kho / băm (bộ dò doNhatKyHang — PHU_TRACH của "pty_attachment.content_hash", "pty_attachment.storage_key").
// KHÔNG thử được với kho R2 thật (kế hoạch: "Giới hạn không vượt được").
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";
import { doNhatKyHang } from "../../../tests/audit/nhat-ky-hang.mjs";
import { TOI_DA_BYTE } from "./tep.ts";

const SALES = "11111111-1111-4111-8111-111111111111";
const ADM = "33333333-3333-4333-8333-333333333333";
const SUP = "77777777-7777-4777-8777-777777777777";
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d, 0x49, 0x48, 0x44, 0x52, 7, 7, 7]);
const PDF = new TextEncoder().encode("%PDF-1.7\n1 0 obj\n<<>>\nendobj\n");
const b64 = (u: Uint8Array) => Buffer.from(u).toString("base64");

function setup() {
  const w = world();
  seedStaff(w.sqlite, { id: SALES, phone: "0900000001", name: "An", perms: ["SALES"] });
  seedStaff(w.sqlite, { id: ADM, phone: "0900000003", name: "Quản trị", perms: ["ADMIN"] });
  seedStaff(w.sqlite, { id: SUP, phone: "0900000007", name: "Chủ", perms: ["SUPER_ADMIN"] });
  return w;
}
let soCccd = 100000;
async function nguoiCoCccd(w: any, ten = "Người Có Ảnh"): Promise<{ id: string; did: string }> {
  const p = await w.call("POST", "/api/parties", { as: ADM, body: { kind: "PERSON", fullName: ten, contacts: [] } });
  assert.equal(p.status, 201, p.text);
  const id = p.json.party.id as string;
  const d = await w.call("POST", `/api/parties/${id}/documents`, { as: ADM, body: { typeCode: "CCCD", number: `079000${++soCccd}`, expiryDate: "2035-01-01" } });
  assert.equal(d.status, 201, d.text);
  return { id, did: d.json.documents.find((x: any) => x.typeCode === "CCCD" && x.current).id as string };
}
const duong = (g: { id: string; did: string }) => `/api/parties/${g.id}/documents/${g.did}/tep`;
const nhatKy = (w: any, action: string): string[] => w.q("SELECT detail FROM audit_log WHERE action = ? ORDER BY rowid", action).map((r: any) => String(r.detail ?? ""));
const soTep = (w: any): number => w.q("SELECT count(*) n FROM pty_attachment")[0].n;
async function taiLen(w: any, g: { id: string; did: string }, u: Uint8Array = PNG, as = SUP, headers: Record<string, string> = {}) {
  return w.call("POST", duong(g), { as, body: { noiDung: b64(u) }, headers });
}

test("Toàn quyền tải PNG: 201 + Location; dòng tệp + dòng nối + nhật ký chỉ mã; kho có đúng byte dưới khoá pty/<32 hex>; stored_at có", async () => {
  const w = setup();
  const g = await nguoiCoCccd(w);
  const r = await taiLen(w, g);
  assert.equal(r.status, 201, r.text);
  assert.equal(r.headers.get("location"), `/parties?id=${g.id}`);
  const tep = r.json.tep;
  assert.deepEqual(Object.keys(tep).sort(), ["id", "kichThuoc", "loai", "taiLuc"], "DTO không có khoá kho, băm, tên tệp");
  assert.deepEqual([tep.loai, tep.kichThuoc], ["png", PNG.length]);
  const row = w.q("SELECT party_id, storage_key, content_kind, byte_size, content_hash, stored_at, purged_at, created_by FROM pty_attachment WHERE id = ?", tep.id)[0];
  assert.match(row.storage_key, /^pty\/[0-9a-f]{32}$/);
  assert.equal(row.storage_key.includes(g.id), false, "khoá kho không mang mã hồ sơ");
  assert.equal(row.party_id, g.id);
  assert.match(row.content_hash, /^[0-9a-f]{64}$/);
  assert.ok(row.stored_at && row.purged_at === null && row.created_by === SUP);
  assert.deepEqual(w.q("SELECT target_kind k, target_id t FROM pty_attachment_link WHERE attachment_id = ?", tep.id).map((x: any) => ({ ...x })), [{ k: "PERSON_DOCUMENT", t: g.did }]);
  assert.ok(w.r2.co(row.storage_key));
  const dt = nhatKy(w, "party_attachment_added");
  assert.equal(dt.length, 1);
  assert.equal(dt[0], `Căn cước công dân (CCCD) · tệp ${tep.id}`);
});

test("không đủ quyền: Quản trị (ghi giấy tờ, không mở ảnh — ruling Q1) và Bán hàng → 403; không chạm kho, không dòng nào", async () => {
  const w = setup();
  const g = await nguoiCoCccd(w);
  for (const as of [ADM, SALES]) assert.equal((await taiLen(w, g, PNG, as)).status, 403, as);
  assert.equal(w.r2.soLan.put, 0);
  assert.equal(soTep(w), 0);
});

test("nội dung sai: HTML → 415, SVG → 415 (câu tiếng Việt); base64 hỏng / thiếu → 400; không chạm kho, không dòng", async () => {
  const w = setup();
  const g = await nguoiCoCccd(w);
  for (const s of ["<html><body><script>alert(1)</script></body></html>", '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>']) {
    const r = await taiLen(w, g, new TextEncoder().encode(s));
    assert.equal(r.status, 415, r.text);
    assert.equal(r.json.error.message, "Chỉ nhận ảnh JPG, PNG, HEIC hoặc tệp PDF.");
  }
  for (const body of [{ noiDung: "@@@@" }, {}, { noiDung: "" }]) assert.equal((await w.call("POST", duong(g), { as: SUP, body })).status, 400);
  assert.equal(w.r2.soLan.put, 0);
  assert.equal(soTep(w), 0);
});

test("Review Focus 1: đúng 10 MB qua (201); 10 MB + 1 byte → 413 'Tệp lớn hơn 10 MB.'", async () => {
  const w = setup();
  const g = await nguoiCoCccd(w);
  const vua = new Uint8Array(TOI_DA_BYTE); vua.set(PNG);
  assert.equal((await taiLen(w, g, vua)).status, 201);
  const qua = new Uint8Array(TOI_DA_BYTE + 1); qua.set(PNG);
  const r = await taiLen(w, g, qua);
  assert.equal(r.status, 413);
  assert.equal(r.json.error.message, "Tệp lớn hơn 10 MB.");
  assert.equal(soTep(w), 1);
});

test("dòng giấy tờ: đã gia hạn thay → 409; mã giấy tờ của hồ sơ khác → 404; hồ sơ không tồn tại → 404", async () => {
  const w = setup();
  const g = await nguoiCoCccd(w);
  const khac = await nguoiCoCccd(w, "Người Khác");
  assert.equal((await taiLen(w, { id: khac.id, did: g.did })).status, 404);
  assert.equal((await taiLen(w, { id: "pty-khong-co", did: g.did })).status, 404);
  const gh = await w.call("POST", `/api/parties/${g.id}/documents/${g.did}/renew`, { as: ADM, body: { expiryDate: "2040-01-01" } });
  assert.equal(gh.status, 201, gh.text);
  const r = await taiLen(w, g);
  assert.equal(r.status, 409);
  assert.equal(r.json.error.code, "document_not_current");
});

test("Review Focus 3 (phần tải lên): kho hỏng khi đặt ⇒ 500; dòng tệp ĐÃ có (D1 trước), đã quyết xoá TAI_LEN_LOI, băm rỗng, đã-xoá-khỏi-kho; nhật ký chỉ mã", async () => {
  const w = setup();
  const g = await nguoiCoCccd(w);
  w.r2.hong.put = true;
  const r = await taiLen(w, g);
  assert.equal(r.status, 500);
  assert.equal(r.json.error.message, "Không tải tệp lên được. Thử lại sau ít phút.");
  const row = w.q("SELECT id, stored_at, purged_at, purge_reason, content_hash, r2_deleted_at FROM pty_attachment")[0];
  assert.ok(row, "dòng tệp phải có TRƯỚC khi đặt kho (ruling Q2)");
  assert.equal(row.stored_at, null);
  assert.equal(row.purge_reason, "TAI_LEN_LOI");
  assert.equal(row.content_hash, null);
  assert.ok(row.purged_at && row.r2_deleted_at);
  assert.deepEqual(nhatKy(w, "party_attachment_purged"), [`tệp ${row.id} · TAI_LEN_LOI`]);
  assert.equal((await w.call("GET", duong(g), { as: SUP })).json.tep.length, 0, "tệp hỏng không hiện ở danh sách");
});

test("Review Focus 5: bấm hai lần cùng mã lần gửi ⇒ MỘT tệp, kho chỉ nhận MỘT lần đặt (lớp chống ghi trùng phát lại)", async () => {
  const w = setup();
  const g = await nguoiCoCccd(w);
  const ve = crypto.randomUUID();
  const r1 = await taiLen(w, g, PNG, SUP, { "idempotency-key": ve });
  assert.equal(r1.status, 201, r1.text);
  await w.choNen();
  const r2 = await taiLen(w, g, PNG, SUP, { "idempotency-key": ve });
  assert.equal(r2.status, 201, r2.text);
  assert.equal(r2.json.tep.id, r1.json.tep.id);
  assert.equal(soTep(w), 1);
  assert.equal(w.r2.soLan.put, 1);
});

test("danh sách ảnh của dòng giấy tờ: chỉ tệp đã lưu; DTO không khoá kho / băm; Quản trị → 403", async () => {
  const w = setup();
  const g = await nguoiCoCccd(w);
  await taiLen(w, g);
  await taiLen(w, g, PDF);
  const r = await w.call("GET", duong(g), { as: SUP });
  assert.equal(r.status, 200);
  assert.deepEqual(r.json.tep.map((t: any) => t.loai).sort(), ["pdf", "png"]);
  assert.doesNotMatch(r.text, /pty\/[0-9a-f]{32}|[0-9a-f]{64}/);
  assert.equal((await w.call("GET", duong(g), { as: ADM })).status, 403);
});

test("tải xuống: Toàn quyền 200, đúng byte; no-store, nosniff, CSP sandbox; ảnh inline, PDF attachment; nhật ký 'Mở ảnh' có TRƯỚC khi đọc kho", async () => {
  const w = setup();
  const g = await nguoiCoCccd(w);
  const anh = (await taiLen(w, g)).json.tep.id as string;
  const pdf = (await taiLen(w, g, PDF)).json.tep.id as string;
  let nhatKyLucDoc = -1;
  w.r2.khiGet = () => { nhatKyLucDoc = nhatKy(w, "party_attachment_viewed").length; };
  const r = await w.call("GET", `${duong(g)}/${anh}`, { as: SUP });
  assert.equal(r.status, 200);
  assert.deepEqual([...r.bytes], [...PNG]);
  assert.equal(nhatKyLucDoc, 1, "lúc đọc kho, dòng nhật ký đã có");
  assert.equal(r.headers.get("cache-control"), "no-store");
  assert.equal(r.headers.get("x-content-type-options"), "nosniff");
  assert.equal(r.headers.get("content-security-policy"), "default-src 'none'; sandbox");
  assert.equal(r.headers.get("content-type"), "image/png");
  assert.match(r.headers.get("content-disposition") ?? "", /^inline; filename="giay-to-[0-9a-f]{8}\.png"$/);
  const p = await w.call("GET", `${duong(g)}/${pdf}`, { as: SUP });
  assert.match(p.headers.get("content-disposition") ?? "", /^attachment; /);
  assert.deepEqual(nhatKy(w, "party_attachment_viewed"), [`Căn cước công dân (CCCD) · tệp ${anh}`, `Căn cước công dân (CCCD) · tệp ${pdf}`]);
});

test("tải xuống bị từ chối: Quản trị / Bán hàng → 403; Toàn quyền nhưng yêu cầu từ trang khác → 403; mã tệp của dòng khác, mã lạ → 404 — KHÔNG dòng nhật ký 'Mở ảnh', KHÔNG đọc kho", async () => {
  const w = setup();
  const g = await nguoiCoCccd(w);
  const khac = await nguoiCoCccd(w, "Người Khác");
  const tid = (await taiLen(w, g)).json.tep.id as string;
  for (const as of [ADM, SALES]) assert.equal((await w.call("GET", `${duong(g)}/${tid}`, { as })).status, 403);
  assert.equal((await w.call("GET", `${duong(g)}/${tid}`, { as: SUP, headers: { "sec-fetch-site": "cross-site" } })).status, 403, "trang khác nhúng / gọi tới (ruling R4)");
  assert.equal((await w.call("GET", `${duong(khac)}/${tid}`, { as: SUP })).status, 404, "tệp của hồ sơ khác qua đường dẫn hồ sơ này");
  assert.equal((await w.call("GET", `${duong(g)}/${crypto.randomUUID()}`, { as: SUP })).status, 404);
  assert.deepEqual(nhatKy(w, "party_attachment_viewed"), []);
  assert.equal(w.r2.soLan.get, 0);
});

test("ghi nhật ký lỗi ⇒ KHÔNG trả tệp: lô nhật ký 'Mở ảnh' hỏng → 500, kho không bị đọc", async () => {
  const w = setup();
  const g = await nguoiCoCccd(w);
  const tid = (await taiLen(w, g)).json.tep.id as string;
  w.chenTruocLo((stmts: any[]) => stmts.some((s) => JSON.stringify(s.args).includes("party_attachment_viewed")), () => { throw new Error("nhat_ky_gia_hong"); });
  const r = await w.call("GET", `${duong(g)}/${tid}`, { as: SUP });
  assert.equal(r.status, 500);
  assert.equal(w.r2.soLan.get, 0);
  assert.equal(r.bytes.length > 0 && r.bytes[0] === 0x89, false, "thân không phải ảnh");
});

test("kho chưa bật (thiếu binding HO_SO) ⇒ 503 ở tải lên và tải xuống; không ghi CSDL", async () => {
  const w = setup();
  const g = await nguoiCoCccd(w);
  const tid = (await taiLen(w, g)).json.tep.id as string;
  delete w.env.HO_SO;
  assert.equal((await taiLen(w, g)).status, 503);
  assert.equal((await w.call("GET", `${duong(g)}/${tid}`, { as: SUP })).status, 503);
  assert.equal(soTep(w), 1);
  assert.deepEqual(nhatKy(w, "party_attachment_viewed"), []);
});

test("nhật ký không chứa khoá kho / băm (bộ dò toàn tuyến, Hiến chương 5.20)", async () => {
  const w = setup();
  const g = await nguoiCoCccd(w);
  const tid = (await taiLen(w, g)).json.tep.id as string;
  await w.call("GET", `${duong(g)}/${tid}`, { as: SUP });
  w.r2.hong.put = true;
  await taiLen(w, g); // đường hỏng cũng ghi nhật ký — phải sạch
  const ds = doNhatKyHang(w.sqlite, ["pty_attachment.content_hash", "pty_attachment.storage_key"]);
  assert.deepEqual(ds.rong, [], "bài rỗng: cột N3 phụ trách chưa có dữ liệu thật");
  assert.deepEqual(ds.lo, [], "nhật ký chứa giá trị hạng N3");
});
```

Run: `node --test src/modules/parties/tep-route.test.ts`
Expected: FAIL — các route trả 404 (`expected 201, actual 404`).

- [ ] **Step 6: Route — `src/modules/parties/index.ts`**

Import (cạnh các import có sẵn; `index.ts` import KHÔNG đuôi `.ts` như các dòng khác):

```ts
import type { HoSoTepChayLaiResponse, HoSoTepChoXoaResponse, HoSoTepCreatedResponse, HoSoTepListResponse } from "../../shared/contracts";
import { LOAI_NOI_DUNG, LY_DO_XOA_TEP, TOI_DA_THAN, bamSha256, dauPhanHoiTep, khoaNgauNhien, kiemTepTaiLen } from "./tep";
import { ghiRoiXoaKho } from "./kho-tep";
```

và thêm vào khối `import { … } from "./repository";` có sẵn: `datChoXoaTepStatement, findTepDeTai, insertTepLinkStatement, insertTepStatement, listTepCuaGiayTo, markTepStored`. (Nếu `contracts` đã có một khối `import type { … }`, gộp bốn tên vào khối đó thay vì thêm dòng mới.)

Ngay sau hằng `DOC_ID_RE`:

```ts
// ---- Kho tệp hồ sơ (ADR-0123; lát H-2 Gói 2) ----------------------------------------------------------------------------------------------------
const TEP_FORBIDDEN = () => error(403, "forbidden", "Tài khoản này không được tải lên hay mở ảnh giấy tờ.");
const TEP_NOT_FOUND = () => error(404, "not_found", "Không tìm thấy tệp này.");
const KHO_CHUA_BAT = () => error(503, "storage_unavailable", "Kho tệp hồ sơ chưa sẵn sàng. Hãy báo quản trị viên.");
/**
 * Lô "quyết xoá" MỘT tệp (ADR-0123 đ6, ADR-0126 đ3): câu đặt purged_at (do nơi gọi dựng — có / không điều kiện dở dang) + nhật ký CHỈ MÃ, ghi khi câu đầu
 * đổi được dòng (`changes() > 0`). Dùng chung: tải lên hỏng (Task 4), chạy lại (Task 5), phiếu xoá (lát H-5). Xoá kho chạy SAU lô này (kho-tep.ts).
 */
function cauDatChoXoa(db: D1Database, cau: D1PreparedStatement, t: { id: string; party_id: string }, lyDo: string, at: string, actorId: string): D1PreparedStatement[] {
  return [
    cau,
    auditStatement(db, { staffId: actorId, action: "party_attachment_purged", at, targetType: "party", targetId: t.party_id, detail: `tệp ${t.id} · ${lyDo}` }, "changes() > 0"),
  ];
}
```

Ngay sau route `POST /api/parties/:id/documents/:did/reveal` (trước khối "Gộp hồ sơ"), thêm ba route:

```ts
    // ---- Kho tệp hồ sơ (ADR-0123; lát H-2 Gói 2) — ruling Q1: tải lên cần CẢ party.document.write LẪN party.attachment.view (= chỉ Toàn quyền). -----------
    // Thứ tự: 403 ô → 503 kho → 404 hồ sơ → 403 cấp bậc → 409 đã gộp → 400 không phải người → 404 / 409 dòng giấy tờ → 413 Content-Length (TRƯỚC khi đọc thân)
    // → 400 / 413 / 415 nội dung → (1) LÔ D1 TRƯỚC: dòng tệp + dòng nối + nhật ký chỉ mã (ruling Q2) → (2) đặt kho → (3) đánh dấu đã lưu.
    // Kho hỏng ở (2) ⇒ quyết xoá TAI_LEN_LOI rồi xoá kho (5.16) ⇒ 500. (3) hỏng ⇒ dòng "tải dở dang", lệnh chạy lại xử lý. Hai lần ghi D1 trong một yêu cầu là CÓ
    // CHỦ Ý — route có tên trong GHI_NHIEU_LAN (src/shared/lan-gui-no.ts, ruling Q6). Bài src/kho-tep-ho-so.test.ts (4) ghim thứ tự TOI_DA_THAN → readJson, env.DB.batch → kho.put.
    route("POST", "/api/parties/:id/documents/:did/tep", "office", async (ctx) => {
      const { request, env, params, staff } = ctx;
      if (!can(staff, "party.document.write") || !can(staff, "party.attachment.view")) return TEP_FORBIDDEN();
      const kho = env.HO_SO;
      if (!kho) return KHO_CHUA_BAT();
      const id = idParam(params, "id", PARTY_ID_RE);
      const party = id ? await findParty(env.DB, id) : null;
      if (!id || !party) return NOT_FOUND();
      const acc: PartyAccountVerdict = await ctx.partyAccount(id);
      if (acc.linked && !acc.manageable) return TEP_FORBIDDEN();
      if (party.merged_into_id) return DA_GOP();
      if (party.party_kind !== "PERSON") return error(400, "invalid_input", "Giấy tờ chỉ gắn với hồ sơ cá nhân.");
      const did = idParam(params, "did", DOC_ID_RE);
      const cu = did ? await findPersonDocument(env.DB, did, id) : null;
      if (!did || !cu) return DOC_NOT_FOUND();
      if (cu.is_current !== 1) return DOC_NOT_CURRENT();
      if (Number(request.headers.get("content-length") ?? "0") > TOI_DA_THAN) return error(413, "file_too_large", "Tệp lớn hơn 10 MB.");
      const k = kiemTepTaiLen(await readJson(request));
      if (!k.ok) return error(k.status, k.code, k.message);
      const now = new Date();
      const at = now.toISOString();
      const tepId = crypto.randomUUID();
      const key = khoaNgauNhien();
      const bam = await bamSha256(k.bytes);
      const tenLoai = (await danhMucGiayTo(env.DB, vnToday(now))).tenLoai(cu.document_type_code);
      await env.DB.batch([
        insertTepStatement(env.DB, { id: tepId, partyId: id, key, loai: k.loai, kichThuoc: k.bytes.length, bam, at, actorId: staff.id }),
        insertTepLinkStatement(env.DB, { tepId, kind: "PERSON_DOCUMENT", targetId: did, at, actorId: staff.id }),
        auditStatement(env.DB, { staffId: staff.id, action: "party_attachment_added", at, targetType: "party", targetId: id, detail: `${tenLoai} · tệp ${tepId}` }),
      ]);
      try {
        await kho.put(key, k.bytes, { httpMetadata: { contentType: LOAI_NOI_DUNG[k.loai] } });
      } catch (e) {
        console.error(JSON.stringify({ level: "error", event: "ho_so_tep_tai_len_loi", tepId, loi: e instanceof Error ? e.name : "unknown" }));
        try {
          const luc = () => new Date().toISOString();
          const lucXoa = luc();
          const lo = cauDatChoXoa(env.DB, datChoXoaTepStatement(env.DB, { id: tepId, lyDo: LY_DO_XOA_TEP.TAI_LEN_LOI, at: lucXoa, actorId: staff.id }), { id: tepId, party_id: id }, LY_DO_XOA_TEP.TAI_LEN_LOI, lucXoa, staff.id);
          await ghiRoiXoaKho(env.DB, kho, lo, [{ id: tepId, storage_key: key }], luc);
        } catch (e2) {
          // Dòng còn "tải dở dang" — POST /api/parties/tep-cho-xoa/chay-lai xử lý sau DO_DANG_SAU_MS; R-PTY-12 báo sau 1 giờ.
          console.error(JSON.stringify({ level: "error", event: "ho_so_tep_danh_dau_xoa_loi", tepId, loi: e2 instanceof Error ? e2.name : "unknown" }));
        }
        return error(500, "upload_failed", "Không tải tệp lên được. Thử lại sau ít phút.");
      }
      try {
        await markTepStored(env.DB, tepId, new Date().toISOString());
      } catch (e) {
        // Lần ghi thứ hai hỏng (ruling Q6): KHÔNG báo "đã tải" — dòng thành "tải dở dang", lệnh chạy lại quyết xoá + xoá kho sau DO_DANG_SAU_MS.
        console.error(JSON.stringify({ level: "error", event: "ho_so_tep_danh_dau_luu_loi", tepId, loi: e instanceof Error ? e.name : "unknown" }));
        return error(500, "upload_failed", "Không tải tệp lên được. Thử lại sau ít phút.");
      }
      return kemLocation(json({ tep: { id: tepId, loai: k.loai, kichThuoc: k.bytes.length, taiLuc: at } } satisfies HoSoTepCreatedResponse, 201), `/parties?id=${id}`);
    }),

    route("GET", "/api/parties/:id/documents/:did/tep", "office", async (ctx) => {
      const { env, params, staff } = ctx;
      if (!can(staff, "party.attachment.view")) return TEP_FORBIDDEN();
      const id = idParam(params, "id", PARTY_ID_RE);
      const did = idParam(params, "did", DOC_ID_RE);
      if (!id || !did) return DOC_NOT_FOUND();
      const acc: PartyAccountVerdict = await ctx.partyAccount(id);
      if (acc.linked && !acc.manageable) return TEP_FORBIDDEN();
      if (!(await findPersonDocument(env.DB, did, id))) return DOC_NOT_FOUND();
      const ds = await listTepCuaGiayTo(env.DB, id, did);
      return json({ tep: ds.map((r) => ({ id: r.id, loai: r.content_kind, kichThuoc: r.byte_size, taiLuc: r.stored_at })) } satisfies HoSoTepListResponse);
    }),

    // Tải xuống (ADR-0123 đ3; Hiến chương 5.22): GET — thẻ ảnh dùng được, và KHÔNG đi qua lớp chống ghi trùng (lớp đó lưu thân phản hồi để phát lại — ruling R4).
    // Thứ tự: 403 ô → 503 kho → 404 mã → 403 cấp bậc → 404 tệp (chưa lưu / đã quyết xoá / không thuộc dòng giấy tờ của hồ sơ) → GHI NHẬT KÝ chỉ mã → đọc kho →
    // thân + header no-store, nosniff. Ghi nhật ký lỗi thì ném lên (500), KHÔNG đọc kho. Bài src/kho-tep-ho-so.test.ts (3) ghim thứ tự can( → auditStatement( → kho.get(.
    route("GET", "/api/parties/:id/documents/:did/tep/:tid", "office", async (ctx) => {
      const { request, env, params, staff } = ctx;
      if (!can(staff, "party.attachment.view")) return TEP_FORBIDDEN();
      // GET không qua lớp chặn gọi chéo trang của router (lớp đó chỉ cho lệnh ghi) — chặn yêu cầu do trang khác phát ra (ruling R4).
      if (request.headers.get("sec-fetch-site") === "cross-site") return TEP_FORBIDDEN();
      const kho = env.HO_SO;
      if (!kho) return KHO_CHUA_BAT();
      const id = idParam(params, "id", PARTY_ID_RE);
      const did = idParam(params, "did", DOC_ID_RE);
      const tid = idParam(params, "tid", DOC_ID_RE);
      if (!id || !did || !tid) return TEP_NOT_FOUND();
      const acc: PartyAccountVerdict = await ctx.partyAccount(id);
      if (acc.linked && !acc.manageable) return TEP_FORBIDDEN();
      const tep = await findTepDeTai(env.DB, id, did, tid);
      if (!tep) return TEP_NOT_FOUND();
      await env.DB.batch([
        auditStatement(env.DB, { staffId: staff.id, action: "party_attachment_viewed", at: new Date().toISOString(), targetType: "party", targetId: id, detail: `${tep.type_name} · tệp ${tep.id}` }),
      ]);
      const obj = await kho.get(tep.storage_key);
      if (!obj) {
        console.error(JSON.stringify({ level: "error", event: "ho_so_tep_thieu_doi_tuong", tepId: tep.id }));
        return TEP_NOT_FOUND();
      }
      return new Response(obj.body, { status: 200, headers: dauPhanHoiTep({ id: tep.id, loai: tep.content_kind }) });
    }),
```

(`HoSoTepChoXoaResponse`, `HoSoTepChayLaiResponse` dùng ở Task 5 — nếu `tsc` báo import thừa thì thêm hai tên đó ở Task 5.)

Run: `node --test src/modules/parties/tep-route.test.ts src/modules/parties/kho-tep.test.ts src/permission-enforcement.test.ts`
Expected: PASS (route 12 bài, kho 3 bài; `permission-enforcement` hết đỏ).

- [ ] **Step 7: Bài đỏ cho rào tĩnh thứ tự — `src/kho-tep-ho-so.test.ts`**, thêm cuối tệp:

```ts
// (3), (4): thứ tự trong THÂN route. Chỉ bỏ dòng chú thích TOÀN DÒNG (chú thích của route nhắc "kho.get(" / "env.DB.batch(" bằng chữ — không được tính).
const INDEX = readFileSync(new URL("./modules/parties/index.ts", import.meta.url), "utf8");
function thanRoute(method: string, path: string): string {
  const dau = INDEX.indexOf(`route("${method}", "${path}"`);
  assert.ok(dau !== -1, `không thấy route ${method} ${path}`);
  const sau = INDEX.indexOf("route(\"", dau + 10);
  return INDEX.slice(dau, sau === -1 ? undefined : sau).split("\n").filter((d) => !d.trim().startsWith("//")).join("\n");
}
const vt = (s: string, x: string) => s.indexOf(x);

test("(3) tải xuống: hỏi ô → ghi nhật ký → MỚI đọc kho; trong parties chỉ MỘT chỗ đọc kho", () => {
  const s = thanRoute("GET", "/api/parties/:id/documents/:did/tep/:tid");
  const [o, nk, doc] = [vt(s, 'can(staff, "party.attachment.view")'), vt(s, "auditStatement("), vt(s, "kho.get(")];
  assert.ok(o !== -1 && nk !== -1 && doc !== -1, "thiếu một trong ba mốc");
  assert.ok(o < nk && nk < doc, `thứ tự sai: can=${o}, nhật ký=${nk}, đọc kho=${doc}`);
  const soLanDoc = TEP.filter((f) => f.p.startsWith("modules/parties/")).reduce((n, f) => n + (f.src.match(/\bkho\.get\(/g)?.length ?? 0), 0);
  assert.equal(soLanDoc, 1, "đường đọc kho thứ hai trong parties — phải đi qua cùng cổng nhật ký");
});

test("(4) tải lên: chặn Content-Length TRƯỚC khi đọc thân; lô D1 TRƯỚC khi đặt kho; trong src chỉ MỘT chỗ đặt kho", () => {
  const s = thanRoute("POST", "/api/parties/:id/documents/:did/tep");
  assert.ok(vt(s, "TOI_DA_THAN") !== -1 && vt(s, "TOI_DA_THAN") < vt(s, "readJson("), "chặn cỡ phải đứng trước đọc thân");
  assert.ok(vt(s, "env.DB.batch(") !== -1 && vt(s, "env.DB.batch(") < vt(s, "kho.put("), "lô D1 phải đứng trước đặt kho (ruling Q2)");
  const soLanDat = TEP.reduce((n, f) => n + (f.src.match(/\.put\(\s*key\b/g)?.length ?? 0), 0);
  assert.equal(soLanDat, 1);
});
```

Run: `node --test src/kho-tep-ho-so.test.ts`
Expected: PASS. **Quan sát chặn thật (P16):** trong bản làm việc, chuyển dòng `const obj = await kho.get(tep.storage_key);` lên trước `await env.DB.batch([` → chạy lại → `not ok … (3) tải xuống …` **và** `tep-route.test.ts` ca "nhật ký 'Mở ảnh' có TRƯỚC khi đọc kho" đỏ (`nhatKyLucDoc` = 0) → hoàn nguyên (`git diff` chỉ còn thay đổi của task) → xanh. Làm tương tự với `kho.put(` lên trước `env.DB.batch(` → (4) đỏ + ca "Review Focus 3" đỏ (không có dòng tệp) → hoàn nguyên. Ghi hai lần quan sát (ngày, dòng `not ok`) cho Task 8.

- [ ] **Step 8: Ảnh chụp route, đủ tuyến giấy tờ, bộ dò nhật ký**

`src/route-access.test.ts`, mảng `SNAPSHOT`, ngay sau dòng `/api/parties/:id/documents/:did/reveal`:

```ts
  { method: "POST", path: "/api/parties/:id/documents/:did/tep", access: "office" }, // ADR-0123: tải ảnh giấy tờ — thân hỏi party.document.write VÀ party.attachment.view (chỉ Toàn quyền)
  { method: "GET", path: "/api/parties/:id/documents/:did/tep", access: "office" }, // danh sách ảnh của một dòng giấy tờ — party.attachment.view
  { method: "GET", path: "/api/parties/:id/documents/:did/tep/:tid", access: "office" }, // tải ảnh — party.attachment.view, nhật ký TRƯỚC khi đọc kho, no-store + nosniff
```

Đổi số trong tên bài `"mức truy cập của 213 route hiện có …"` thành `216` (đúng số phần tử `SNAPSHOT` sau khi thêm — đếm lại nếu nhánh đã khác 213).

`src/giay-to-khong-lo-so.test.ts`: thêm hằng ngay sau `const SO_XE_MOI = …`:

```ts
const PNG_B64 = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]).toString("base64"); // ADR-0123: ảnh giả (chữ ký PNG)
```

và trong `TUYEN`, ngay sau khoá `"POST /api/parties/:id/documents/:did/reveal"`:

```ts
    "POST /api/parties/:id/documents/:did/tep": async () => {
      const r = await w.call("GET", `/api/parties/${P}/documents`, { as: ADM });
      await goi("tải ảnh CCCD (Toàn quyền)", "POST", `/api/parties/${P}/documents/${idCua(r, "CCCD")}/tep`, SUP, { noiDung: PNG_B64 }, 201);
    },
    "GET /api/parties/:id/documents/:did/tep": async () => {
      const r = await w.call("GET", `/api/parties/${P}/documents`, { as: ADM });
      await goi("danh sách ảnh CCCD", "GET", `/api/parties/${P}/documents/${idCua(r, "CCCD")}/tep`, SUP, undefined, 200);
    },
    "GET /api/parties/:id/documents/:did/tep/:tid": async () => {
      const r = await w.call("GET", `/api/parties/${P}/documents`, { as: ADM });
      const did = idCua(r, "CCCD");
      const ds = await w.call("GET", `/api/parties/${P}/documents/${did}/tep`, { as: SUP });
      await goi("mở ảnh CCCD", "GET", `/api/parties/${P}/documents/${did}/tep/${ds.json.tep[0].id}`, SUP, undefined, 200);
    },
```

(Thứ tự khoá trong `TUYEN` là thứ tự chạy: ba ca này phải đứng SAU `"POST /api/parties/:id/documents"` — CCCD đã có.)

`tests/audit/nhat-ky-hang.mjs`: XOÁ hai mục `pty_attachment.*` khỏi `MIEN`, thêm vào `PHU_TRACH`:

```js
  "pty_attachment.content_hash": "src/modules/parties/tep-route.test.ts",
  "pty_attachment.storage_key": "src/modules/parties/tep-route.test.ts",
```

`src/shared/lan-gui-no.ts`, cuối mảng `GHI_NHIEU_LAN` (**đề xuất chờ chủ duyệt — ruling Q6**; không có mục này thì e2e đỏ ở bước H5 của `tests/e2e/run.mjs`):

```ts
  { duong: "POST /api/parties/:id/documents/:did/tep", lyDo: "ADR-0123, ruling Q2/Q6 kế hoạch H-2 kho tệp: lô D1 (dòng tệp + dòng nối + nhật ký, mang vé) → đặt kho R2 → đánh dấu đã lưu ở lần ghi thứ hai; đặt kho nằm giữa nên không gộp được một lô. Lần hai hỏng ⇒ route trả 500, dòng thành 'tải dở dang' và POST /api/parties/tep-cho-xoa/chay-lai dọn — không có ảnh 'đã tải' mà mất. Kho hỏng ⇒ thêm lô quyết xoá rồi đánh dấu đã-xoá-khỏi-kho." },
```

Run: `node --test src/route-access.test.ts src/giay-to-khong-lo-so.test.ts src/nhat-ky-hang.test.ts src/route-write-guard.test.ts src/architecture.test.ts src/lan-gui-no.test.ts`
Expected: PASS. (`route-write-guard` (1b): ba route `office` đều có `can(` dùng kết quả; `architecture`: câu SQL mới EXPLAIN chỉ chạm bảng `pty_*`.)

- [ ] **Step 9: Bộ kiểm đủ + commit (gộp Task 3)**

Run: `npm test && npm run typecheck`
Expected: xanh.

```bash
git add src/shared/permissions.ts src/shared/permissions.test.ts src/modules/orders/xem-don-theo-quyen.test.ts src/shared/tro-ly-cau-truc-ten.ts \
  src/shared/contracts.ts src/shared/audit-actions.ts src/modules/parties/repository.ts src/modules/parties/kho-tep.ts src/modules/parties/kho-tep.test.ts \
  src/modules/parties/index.ts src/modules/parties/tep-route.test.ts src/kho-tep-ho-so.test.ts src/route-access.test.ts src/giay-to-khong-lo-so.test.ts tests/audit/nhat-ky-hang.mjs src/shared/lan-gui-no.ts
git commit -m "Ảnh giấy tờ: Toàn quyền tải lên, mở lại qua máy chủ, nhật ký ghi trước khi đọc kho (ADR-0123, ADR-0124 đ4)

Ô mới party.attachment.view chỉ Toàn quyền. Tải lên ghi CSDL trước rồi mới đặt kho, nên kho không bao giờ giữ ảnh mà CSDL không biết;
kho hỏng thì quyết xoá rồi xoá sau lô (Hiến chương 5.16). Tải xuống: không quyền thì không có dòng nhật ký, nhật ký hỏng thì không trả tệp,
phản hồi no-store + nosniff. Nhật ký chỉ mang mã, bộ dò N3 phụ trách khoá kho và băm."
```

---

### Task 5: Hàng "chờ xoá" — thấy được và chạy lại được (VIỆC LỚN — dữ liệu)

**Files:**
- Modify: `src/modules/parties/repository.ts` (`listTepChoXoa`)
- Modify: `src/modules/parties/index.ts` (hai route, khai TRƯỚC `GET /api/parties/:id`)
- Modify: `src/modules/parties/tep-route.test.ts` (ba bài)
- Modify: `src/route-access.test.ts` (ảnh chụp 216 → 218)
- Modify: `src/shared/lan-gui-no.ts` (`GHI_NHIEU_LAN` — đề xuất chờ chủ duyệt, ruling Q6)

**Interfaces:**
- Consumes: Task 4 (`cauDatChoXoa`, `datChoXoaTepStatement` với `doDangTruoc`, `xoaKhoiKho`, `TEP_FORBIDDEN`, `KHO_CHUA_BAT`, DTO).
- Produces:
  - `repository.ts`: `interface TepCanXoaRow { id: string; party_id: string; storage_key: string; purged_at: string | null; purge_reason: string | null; created_at: string }`; `listTepChoXoa(db, doDangTruoc: string): Promise<TepCanXoaRow[]>` (tối đa 50, cũ trước).
  - Route `GET /api/parties/tep-cho-xoa` (`HoSoTepChoXoaResponse`), `POST /api/parties/tep-cho-xoa/chay-lai` (`HoSoTepChayLaiResponse`).

- [ ] **Step 1: Bài đỏ** — `src/modules/parties/tep-route.test.ts`, thêm cuối tệp:

```ts
const choXoa = (w: any) => w.call("GET", "/api/parties/tep-cho-xoa", { as: SUP });
const chayLai = (w: any, as = SUP) => w.call("POST", "/api/parties/tep-cho-xoa/chay-lai", { as, body: {} });

test("Review Focus 3: kho hỏng khi đặt VÀ khi xoá ⇒ dòng 'chờ xoá' hiện ở danh sách (chỉ mã, không khoá kho); tải xuống 404 dù kho còn đối tượng; chạy lại ⇒ xoá xong", async () => {
  const w = setup();
  const g = await nguoiCoCccd(w);
  const tot = (await taiLen(w, g)).json.tep.id as string;
  const keyTot = w.q("SELECT storage_key k FROM pty_attachment WHERE id = ?", tot)[0].k;
  // Quyết xoá thẳng một tệp ĐÃ lưu (giả lập phiếu xoá của H-5) mà kho hỏng khi xoá: còn đối tượng trong kho
  w.r2.hong.delete = true;
  w.r2.hong.put = true;
  assert.equal((await taiLen(w, g)).status, 500);
  w.r2.hong.put = false;
  w.sqlite.prepare("UPDATE pty_attachment SET purged_at = ?, purge_reason = 'PHIEU_XOA_GIA', content_hash = NULL WHERE id = ?").run(new Date().toISOString(), tot);
  const ds = await choXoa(w);
  assert.equal(ds.status, 200);
  assert.deepEqual(ds.json.tep.map((t: any) => t.trangThai).sort(), ["CHO_XOA", "CHO_XOA"]);
  assert.doesNotMatch(ds.text, /pty\/[0-9a-f]{32}/, "danh sách không lộ khoá kho");
  assert.ok(w.r2.co(keyTot), "kho còn đối tượng");
  assert.equal((await w.call("GET", `${duong(g)}/${tot}`, { as: SUP })).status, 404, "đã quyết xoá thì không phục vụ, dù kho còn");
  const hong = await chayLai(w);
  assert.deepEqual(hong.json, { daXoa: 0, conLai: 2 });
  w.r2.hong.delete = false;
  const lanh = await chayLai(w);
  assert.deepEqual(lanh.json, { daXoa: 2, conLai: 0 });
  assert.equal(w.r2.co(keyTot), false);
  assert.deepEqual((await choXoa(w)).json.tep, []);
  assert.deepEqual(nhatKy(w, "party_attachment_purge_retried"), ["đã xoá 0, còn 2", "đã xoá 2, còn 0"]);
});

test("tải dở dang (stored_at rỗng) quá 10 phút ⇒ hiện TAI_DO_DANG; chạy lại quyết xoá TAI_LEN_DO_DANG rồi xoá kho; dòng vừa tạo (< 10 phút) và dòng đã lưu KHÔNG bị đụng", async () => {
  const w = setup();
  const g = await nguoiCoCccd(w);
  const daLuu = (await taiLen(w, g)).json.tep.id as string;
  const cu = new Date(Date.now() - 11 * 60_000).toISOString();
  const chen = (id: string, k: number, luc: string) => {
    w.sqlite.prepare(`INSERT INTO pty_attachment (id, party_id, storage_key, content_kind, byte_size, content_hash, created_at, created_by, updated_at, updated_by)
      VALUES (?, ?, ?, 'png', 3, ?, ?, ?, ?, ?)`).run(id, g.id, `pty/${String(k).padStart(32, "0")}`, "e".repeat(64), luc, SUP, luc, SUP);
    w.sqlite.prepare("INSERT INTO pty_attachment_link (attachment_id, target_kind, target_id, created_at, created_by, updated_at, updated_by) VALUES (?, 'PERSON_DOCUMENT', ?, ?, ?, ?, ?)").run(id, g.did, luc, SUP, luc, SUP);
  };
  chen("dd-cu", 1, cu);
  chen("dd-moi", 2, new Date().toISOString());
  await w.r2.put(`pty/${"1".padStart(32, "0")}`, new Uint8Array([1]));
  assert.deepEqual((await choXoa(w)).json.tep.map((t: any) => [t.id, t.trangThai]), [["dd-cu", "TAI_DO_DANG"]]);
  assert.deepEqual((await chayLai(w)).json, { daXoa: 1, conLai: 0 });
  const r = (id: string) => w.q("SELECT purge_reason p, r2_deleted_at d, stored_at s FROM pty_attachment WHERE id = ?", id)[0];
  assert.equal(r("dd-cu").p, "TAI_LEN_DO_DANG");
  assert.ok(r("dd-cu").d);
  assert.equal(r("dd-moi").p, null, "dòng vừa tạo chưa bị đụng");
  assert.equal(r(daLuu).p, null, "dòng đã lưu không bị đụng");
  assert.deepEqual(nhatKy(w, "party_attachment_purged"), ["tệp dd-cu · TAI_LEN_DO_DANG"]);
});

test("hàng chờ xoá: Quản trị / Bán hàng → 403 ở cả xem lẫn chạy lại (ruling Q4); thiếu kho ⇒ chạy lại 503", async () => {
  const w = setup();
  for (const as of [ADM, SALES]) {
    assert.equal((await w.call("GET", "/api/parties/tep-cho-xoa", { as })).status, 403);
    assert.equal((await chayLai(w, as)).status, 403);
  }
  delete w.env.HO_SO;
  assert.equal((await chayLai(w)).status, 503);
});
```

Run: `node --test src/modules/parties/tep-route.test.ts`
Expected: FAIL — `GET /api/parties/tep-cho-xoa` rơi vào `GET /api/parties/:id` (404).

- [ ] **Step 2: Câu đọc** — `src/modules/parties/repository.ts`, cuối khối kho tệp:

```ts
export interface TepCanXoaRow { id: string; party_id: string; storage_key: string; purged_at: string | null; purge_reason: string | null; created_at: string }
// Hàng "chờ xoá" (5.16): đã quyết xoá mà kho chưa xoá xong, HOẶC tải dở dang (chưa lưu, chưa quyết xoá) tạo trước ?1. Tối đa 50 dòng, cũ trước (ruling R16).
// storage_key chỉ để lệnh chạy lại xoá kho — route KHÔNG đưa ra DTO.
const LIST_TEP_CHO_XOA = defineSql(
  "parties",
  "list_attachments_pending_purge",
  `SELECT id, party_id, storage_key, purged_at, purge_reason, created_at FROM pty_attachment
   WHERE r2_deleted_at IS NULL AND (purged_at IS NOT NULL OR (stored_at IS NULL AND created_at < ?1))
   ORDER BY created_at, id LIMIT 50`,
);
export async function listTepChoXoa(db: D1Database, doDangTruoc: string): Promise<TepCanXoaRow[]> {
  return (await db.prepare(LIST_TEP_CHO_XOA).bind(doDangTruoc).all<TepCanXoaRow>()).results;
}
```

- [ ] **Step 3: Hai route** — `src/modules/parties/index.ts`, khai NGAY SAU route `GET /api/parties/duplicates` (router khớp theo thứ tự; phải đứng trước `GET /api/parties/:id`). Thêm `listTepChoXoa` vào khối import `./repository`, `DO_DANG_SAU_MS` vào khối import `./tep`, `xoaKhoiKho` vào khối import `./kho-tep`.

```ts
    // ---- Hàng "chờ xoá" của kho tệp hồ sơ (ADR-0123 đ6; Hiến chương 5.16; ruling Q4: chỉ Toàn quyền) — khai TRƯỚC GET /api/parties/:id. DTO chỉ mã. -------
    route("GET", "/api/parties/tep-cho-xoa", "office", async ({ env, staff }) => {
      if (!can(staff, "party.attachment.view")) return TEP_FORBIDDEN();
      const ds = await listTepChoXoa(env.DB, new Date(Date.now() - DO_DANG_SAU_MS).toISOString());
      return json({
        tep: ds.map((t) => ({ id: t.id, trangThai: t.purged_at === null ? ("TAI_DO_DANG" as const) : ("CHO_XOA" as const), lyDo: t.purge_reason, luc: t.purged_at ?? t.created_at })),
      } satisfies HoSoTepChoXoaResponse);
    }),

    // Chạy lại: (1) tệp tải dở dang ⇒ MỘT lô quyết xoá TAI_LEN_DO_DANG (câu có điều kiện: còn chưa lưu, còn quá mốc — tệp vừa lưu xong trong khe không bị đụng)
    // + nhật ký chỉ mã; (2) ĐỌC LẠI hàng chờ, chỉ lấy dòng ĐÃ quyết xoá; (3) xoá kho rồi đánh dấu (kho-tep.ts — lỗi không ném); (4) một dòng nhật ký tổng.
    // Không bao giờ xoá kho cho dòng chưa quyết xoá trong CSDL (bước 2).
    route("POST", "/api/parties/tep-cho-xoa/chay-lai", "office", async ({ env, staff }) => {
      if (!can(staff, "party.attachment.view")) return TEP_FORBIDDEN();
      const kho = env.HO_SO;
      if (!kho) return KHO_CHUA_BAT();
      const moc = new Date(Date.now() - DO_DANG_SAU_MS).toISOString();
      const at = new Date().toISOString();
      const lo = (await listTepChoXoa(env.DB, moc))
        .filter((t) => t.purged_at === null)
        .flatMap((t) =>
          cauDatChoXoa(env.DB, datChoXoaTepStatement(env.DB, { id: t.id, lyDo: LY_DO_XOA_TEP.TAI_LEN_DO_DANG, at, actorId: staff.id, doDangTruoc: moc }), t, LY_DO_XOA_TEP.TAI_LEN_DO_DANG, at, staff.id));
      if (lo.length > 0) await env.DB.batch(lo);
      const canXoa = (await listTepChoXoa(env.DB, moc)).filter((t) => t.purged_at !== null);
      const kq = await xoaKhoiKho(env.DB, kho, canXoa, () => new Date().toISOString());
      await env.DB.batch([
        auditStatement(env.DB, { staffId: staff.id, action: "party_attachment_purge_retried", at: new Date().toISOString(), targetType: "system", targetId: "ho-so-tep", detail: `đã xoá ${kq.daXoa}, còn ${kq.loi}` }),
      ]);
      return json({ daXoa: kq.daXoa, conLai: kq.loi } satisfies HoSoTepChayLaiResponse);
    }),
```

(Nếu `ghiRoiXoaKho` chỉ còn dùng ở tải lên thì giữ nguyên — route chạy lại cố ý tách hai bước để đọc lại hàng chờ.)

`src/route-access.test.ts`: thêm hai dòng vào `SNAPSHOT` (đặt cạnh `/api/parties/duplicates`), đổi số trong tên bài thành `218`:

```ts
  { method: "GET", path: "/api/parties/tep-cho-xoa", access: "office" }, // ADR-0123 đ6: hàng chờ xoá kho tệp — party.attachment.view (Toàn quyền), DTO chỉ mã
  { method: "POST", path: "/api/parties/tep-cho-xoa/chay-lai", access: "office" }, // chạy lại xoá kho SAU lô quyết xoá (Hiến chương 5.16) — party.attachment.view
```

`src/shared/lan-gui-no.ts`, cuối mảng `GHI_NHIEU_LAN` (đề xuất chờ chủ duyệt — ruling Q6):

```ts
  { duong: "POST /api/parties/tep-cho-xoa/chay-lai", lyDo: "ADR-0123 đ6, Hiến chương 5.16: lô quyết xoá tệp tải dở dang → xoá từng đối tượng kho rồi đánh dấu đã-xoá-khỏi-kho (mỗi tệp một lần ghi, kho nằm giữa) → dòng nhật ký tổng. Tự nó lặp lại an toàn: chạy lại chỉ xử lý dòng còn trong hàng chờ." },
```

Run: `node --test src/modules/parties/tep-route.test.ts src/route-access.test.ts src/route-write-guard.test.ts src/permission-enforcement.test.ts src/kho-tep-ho-so.test.ts src/architecture.test.ts`
Expected: PASS.

- [ ] **Step 4: Bộ kiểm đủ + commit**

Run: `npm test && npm run typecheck`
Expected: xanh.

```bash
git add src/modules/parties/repository.ts src/modules/parties/index.ts src/modules/parties/tep-route.test.ts src/route-access.test.ts src/shared/lan-gui-no.ts
git commit -m "Kho tệp hồ sơ: hàng chờ xoá thấy được và chạy lại được (ADR-0123 đ6, Hiến chương 5.16)

Xoá kho là việc bên ngoài, chạy sau lô CSDL; hỏng thì dòng nằm lại ở hàng chờ cho Toàn quyền chạy lại. Tệp tải dở dang quá 10 phút được quyết xoá
bằng câu có điều kiện (tệp vừa lưu xong không bị đụng), và kho chỉ bị xoá cho dòng đã quyết xoá trong CSDL."
```

---

### Task 6: Gộp hồ sơ mang ảnh sang dòng giấy tờ mới (VIỆC LỚN — dữ liệu; người kiểm độc lập BẮT BUỘC ngay sau task này, phủ Task 3–6)

**Files:**
- Modify: `src/modules/parties/repository.ts` (`gopChepGiayToStatement` nhận `id`; `GOP_NOI_TEP`, `TEP_CUA_GIAY_TO`)
- Modify: `src/modules/parties/gop-lo.ts` (`LoGop.sauNhatKy`, tham số bắt buộc `tepTheoGiayTo`)
- Modify: `src/modules/parties/gop-lo.test.ts` (helper `lo` + ba bài mới)
- Modify: `src/modules/parties/index.ts` (route `POST /api/parties/:id/merge`)
- Modify: `src/modules/parties/tep-route.test.ts` (một bài)

**Interfaces:**
- Consumes: Task 1 (trigger `pty_attachment_link_target_ins` nhận dòng giấy tờ của hồ sơ mà hồ sơ của tệp ĐÃ gộp vào), Task 4 (`taiLen`, `nguoiCoCccd`, `duong` trong bài route).
- Produces:
  - `repository.ts`: `gopChepGiayToStatement(db, v: Nguoi & { du: GopDocRow; id: string })` (nơi gọi sinh mã dòng mới); `gopNoiTepStatement(db, v: { tepId: string; docCu: string; docMoi: string; b: string; at: string; actorId: string }): D1PreparedStatement`; `tepCuaGiayTo(db, docIds: readonly string[]): Promise<Map<string, string[]>>`.
  - `gop-lo.ts`: `interface LoGop { truocDon: D1PreparedStatement[]; lat: D1PreparedStatement; sauNhatKy: D1PreparedStatement[] }`; `loGop(db, v: { …như cũ…; tepTheoGiayTo: ReadonlyMap<string, readonly string[]> })`.

- [ ] **Step 1: Bài đỏ — `src/modules/parties/gop-lo.test.ts`**

Sửa helper `lo` (thêm tham số bắt buộc mới, KHÔNG đổi ý nghĩa bài cũ):

```ts
const lo = (D: unknown, a: HoSoGop, b: HoSoGop, giayToDu = new Map()) => {
  const l = loGop(D as D1Database, { a: a.id, b: b.id, ke: keHoachGop(a, b, RANH, HOM_NAY), giayToDu, tepTheoGiayTo: new Map(), homNay: HOM_NAY, at: AT2, actorId: "s-test" });
  return [...l.truocDon, l.lat];
};
```

Thêm cuối tệp:

```ts
// ---- Ảnh giấy tờ đi theo khi gộp (ADR-0123 + ADR-0068 Đ1 bước 4; ruling R15 kế hoạch H-2 kho tệp) ----
const tep = (db: DatabaseSync, id: string, party: string, k: number) =>
  db.prepare(`INSERT INTO pty_attachment (id, party_id, storage_key, content_kind, byte_size, content_hash, stored_at, created_at, created_by, updated_at, updated_by)
    VALUES (?, ?, ?, 'png', 3, ?, ?, ?, 's', ?, 's')`).run(id, party, `pty/${String(k).padStart(32, "0")}`, "d".repeat(64), AT, AT, AT);
const noi = (db: DatabaseSync, tepId: string, docId: string) =>
  db.prepare("INSERT INTO pty_attachment_link (attachment_id, target_kind, target_id, created_at, created_by, updated_at, updated_by) VALUES (?, 'PERSON_DOCUMENT', ?, ?, 's', ?, 's')")
    .run(tepId, docId, AT, AT);
const dongNoi = (db: DatabaseSync) => q(db, "SELECT attachment_id a, target_id t FROM pty_attachment_link ORDER BY created_at, a, t").map((r) => ({ ...r }));
function loAnh(D: unknown, a: HoSoGop, giayToDu: Map<string, unknown>, tepTheoGiayTo: Map<string, string[]>) {
  const l = loGop(D as D1Database, { a: a.id, b: "pb", ke: keHoachGop(a, hs("pb"), RANH, HOM_NAY), giayToDu: giayToDu as never, tepTheoGiayTo, homNay: HOM_NAY, at: AT2, actorId: "s-test" });
  return [...l.truocDon, l.lat, ...l.sauNhatKy];
}

test("ảnh đi theo giấy tờ được chép: dòng nối MỚI tệp → dòng giấy tờ mới của B; dòng nối cũ giữ nguyên; hồ sơ của tệp không đổi", async () => {
  const db = openDb();
  const D = fakeD1(db);
  nguoi(db, "pa"); nguoi(db, "pb");
  giayTo(db, "g1", "pa", "HEALTH_CHECK", "2027-01-01");
  tep(db, "t1", "pa", 1);
  noi(db, "t1", "g1");
  const { a, giayToDu } = await hoSoCoGiayTo(D, "pa");
  await D.batch(loAnh(D, a, giayToDu, new Map([["g1", ["t1"]]])));
  const moi = q(db, "SELECT id FROM pty_person_document WHERE party_id = 'pb'")[0]!.id;
  assert.deepEqual(dongNoi(db), [{ a: "t1", t: "g1" }, { a: "t1", t: moi }]);
  assert.equal(q(db, "SELECT party_id p FROM pty_attachment WHERE id = 't1'")[0]!.p, "pa");
});

test("lính gác dòng nối: kế hoạch nói t2 thuộc g1 nhưng CSDL không có dòng nối đó ⇒ CẢ lô huỷ, không dòng nào đổi", async () => {
  const db = openDb();
  const D = fakeD1(db);
  nguoi(db, "pa"); nguoi(db, "pb");
  giayTo(db, "g1", "pa", "HEALTH_CHECK", "2027-01-01");
  tep(db, "t2", "pa", 2); // không nối vào g1
  const { a, giayToDu } = await hoSoCoGiayTo(D, "pa");
  const truoc = { ...anh(db), noi: dongNoi(db) };
  await assert.rejects(D.batch(loAnh(D, a, giayToDu, new Map([["g1", ["t2"]]]))));
  assert.deepEqual({ ...anh(db), noi: dongNoi(db) }, truoc);
});

test("lô thua (chạy lại cùng kế hoạch sau khi đã gộp): hỏng cả lô, không thêm dòng nối", async () => {
  const db = openDb();
  const D = fakeD1(db);
  nguoi(db, "pa"); nguoi(db, "pb");
  giayTo(db, "g1", "pa", "HEALTH_CHECK", "2027-01-01");
  tep(db, "t1", "pa", 1);
  noi(db, "t1", "g1");
  const { a, giayToDu } = await hoSoCoGiayTo(D, "pa");
  await D.batch(loAnh(D, a, giayToDu, new Map([["g1", ["t1"]]])));
  const sau = dongNoi(db);
  await assert.rejects(D.batch(loAnh(D, a, giayToDu, new Map([["g1", ["t1"]]]))));
  assert.deepEqual(dongNoi(db), sau);
});
```

Run: `node --test src/modules/parties/gop-lo.test.ts`
Expected: FAIL — `l.sauNhatKy is not iterable` (và bài cũ vẫn xanh nhờ helper truyền `tepTheoGiayTo`).

- [ ] **Step 2: Câu SQL — `src/modules/parties/repository.ts`**

Đổi `gopChepGiayToStatement` (nơi gọi sinh mã dòng mới để câu nối ảnh trỏ được tới nó):

```ts
export const gopChepGiayToStatement = (db: D1Database, v: Nguoi & { du: GopDocRow; id: string }): D1PreparedStatement =>
  db.prepare(GOP_CHEP_GIAY_TO).bind(
    v.id, v.b, v.du.document_type_code, v.du.document_number, v.du.number_key, v.du.license_class_code, v.du.issued_date, v.du.issued_place, v.du.expiry_date,
    v.at, v.actorId, v.a, v.du.id,
  );
```

Thêm ngay sau `gopLatStatement`:

```ts
// ---- Gộp hồ sơ mang ảnh (ADR-0068 Đ1 bước 4 + ADR-0123; ruling R15 kế hoạch 2026-10-16-goi-2-h2-kho-tep) ----
// Thêm dòng nối tệp → dòng giấy tờ MỚI vừa chép sang hồ sơ chính; dòng nối cũ (sang dòng đã huỷ của hồ sơ phụ) giữ nguyên — bảng chỉ-thêm.
// Dạng VALUES, lính gác ở cột target_id (NOT NULL) như GOP_CHEP_GIAY_TO: (a) dòng nối cũ tệp ?1 → dòng nguồn ?2 CÓ THẬT; (b) dòng mới ?3 thuộc hồ sơ chính ?4
// và do CHÍNH lô này tạo (created_at = mốc lô ?5). Sai một điều ⇒ target_id NULL ⇒ CẢ LÔ huỷ. Câu đứng SAU câu lật: trigger pty_attachment_link_target_ins
// chỉ nhận dòng giấy tờ của hồ sơ mà hồ sơ của tệp ĐÃ gộp vào.
// ?1 tệp, ?2 dòng giấy tờ nguồn, ?3 dòng giấy tờ mới, ?4 hồ sơ chính, ?5 lúc, ?6 người
const GOP_NOI_TEP = defineSql(
  "parties",
  "gop_noi_tep",
  `INSERT INTO pty_attachment_link (attachment_id, target_kind, target_id, created_at, created_by, updated_at, updated_by)
   VALUES (?1, 'PERSON_DOCUMENT',
     (SELECT ?3 WHERE EXISTS (SELECT 1 FROM pty_attachment_link l WHERE l.attachment_id = ?1 AND l.target_kind = 'PERSON_DOCUMENT' AND l.target_id = ?2)
        AND EXISTS (SELECT 1 FROM pty_person_document d WHERE d.id = ?3 AND d.party_id = ?4 AND d.created_at = ?5)),
     ?5, ?6, ?5, ?6)`,
);
// Ảnh còn hiệu lực (đã lưu, chưa quyết xoá) của các dòng giấy tờ ?1 (mảng JSON mã dòng) — route gộp đọc trước khi dựng lô.
const TEP_CUA_GIAY_TO = defineSql(
  "parties",
  "attachments_of_person_documents",
  `SELECT l.target_id AS doc_id, a.id AS tep_id FROM pty_attachment_link l JOIN pty_attachment a ON a.id = l.attachment_id
   WHERE l.target_kind = 'PERSON_DOCUMENT' AND l.target_id IN (SELECT value FROM json_each(?1)) AND a.stored_at IS NOT NULL AND a.purged_at IS NULL
   ORDER BY a.created_at, a.id`,
);
export const gopNoiTepStatement = (db: D1Database, v: { tepId: string; docCu: string; docMoi: string; b: string; at: string; actorId: string }): D1PreparedStatement =>
  db.prepare(GOP_NOI_TEP).bind(v.tepId, v.docCu, v.docMoi, v.b, v.at, v.actorId);
export async function tepCuaGiayTo(db: D1Database, docIds: readonly string[]): Promise<Map<string, string[]>> {
  const m = new Map<string, string[]>();
  if (docIds.length === 0) return m;
  const rows = (await db.prepare(TEP_CUA_GIAY_TO).bind(JSON.stringify(docIds)).all<{ doc_id: string; tep_id: string }>()).results;
  for (const r of rows) m.set(r.doc_id, [...(m.get(r.doc_id) ?? []), r.tep_id]);
  return m;
}
```

- [ ] **Step 3: `src/modules/parties/gop-lo.ts`**

Sửa chú thích đầu tệp (thêm câu cuối: "… → `lat` → hai dòng nhật ký `changes() > 0` → `sauNhatKy` (dòng nối ảnh sang dòng giấy tờ mới — cần A đã trỏ B)."), thêm `gopNoiTepStatement` vào khối import `./repository.ts`, và thay phần thân:

```ts
export interface LoGop { truocDon: D1PreparedStatement[]; lat: D1PreparedStatement; sauNhatKy: D1PreparedStatement[] }

export function loGop(
  db: D1Database,
  v: {
    a: string; b: string; ke: KeHoachGop; giayToDu: ReadonlyMap<string, GopDocRow>; homNay: string; at: string; actorId: string;
    /** Ảnh còn hiệu lực theo mã dòng giấy tờ của A (repository.tepCuaGiayTo). BẮT BUỘC — quên truyền là lỗi kiểu, không phải "không có ảnh". */
    tepTheoGiayTo: ReadonlyMap<string, readonly string[]>;
  },
): LoGop {
  const { a, b, ke, homNay, at, actorId } = v;
  const n = { a, b, at, actorId };
  const du = (id: string): GopDocRow => {
    const r = v.giayToDu.get(id);
    if (!r) throw new Error(`loGop: thiếu dòng giấy tờ ${id} trong giayToDu`);
    return r;
  };
  const idMoi = new Map(ke.giayTo.chep.map((d) => [d.id, crypto.randomUUID()] as const));
  const s: D1PreparedStatement[] = [
    ...ke.lienHe.dong.map((c) => gopDongLienHeStatement(db, { ...n, id: c.id, homNay })),
    ...ke.lienHe.mo.map((m) =>
      gopMoLienHeStatement(db, { ...n, kind: m.tu.kind, value: m.tu.value, valueNormalized: m.tu.valueNormalized, label: m.tu.label, isPrimary: m.chinh, from: homNay })),
    ...ke.congViec.dong.map((r) => gopDongVaiStatement(db, { ...n, id: r.id, homNay })),
    ...ke.congViec.mo.map((r) => gopMoVaiStatement(db, { ...n, code: r.code, locationId: r.locationId, from: homNay, to: r.validTo })),
    ...ke.quanHe.dong.map((x) => gopDongQuanHeStatement(db, { ...n, id: x.id, homNay })),
    ...ke.quanHe.mo.map((m) => gopMoQuanHeStatement(db, { ...n, fromId: m.fromId, toId: m.toId, typeCode: m.tu.typeCode, from: homNay, to: m.tu.validTo })),
    ...ke.giayTo.huy.map((d) => gopHuyGiayToStatement(db, { ...n, id: d.id, expectedUpdatedAt: du(d.id).updated_at })),
    ...ke.giayTo.chep.map((d) => gopChepGiayToStatement(db, { ...n, du: du(d.id), id: idMoi.get(d.id)! })),
  ];
  const sauNhatKy = ke.giayTo.chep.flatMap((d) =>
    (v.tepTheoGiayTo.get(d.id) ?? []).map((tepId) => gopNoiTepStatement(db, { tepId, docCu: d.id, docMoi: idMoi.get(d.id)!, b, at, actorId })));
  return { truocDon: s, lat: gopLatStatement(db, { ...n, homNay }), sauNhatKy };
}
```

Run: `node --test src/modules/parties/gop-lo.test.ts`
Expected: PASS (bài cũ + 3 bài mới).

- [ ] **Step 4: Bài đỏ cho route** — `src/modules/parties/tep-route.test.ts`, thêm cuối tệp:

```ts
test("Review Focus 4: gộp hồ sơ ⇒ ảnh mở được qua dòng giấy tờ MỚI của hồ sơ chính; ảnh đã quyết xoá không đi theo", async () => {
  const w = setup();
  const TEN = "Người Gộp Ảnh";
  const g = await nguoiCoCccd(w, TEN);
  const tid = (await taiLen(w, g)).json.tep.id as string;
  w.r2.hong.put = true;
  assert.equal((await taiLen(w, g)).status, 500); // ảnh hỏng: đã quyết xoá TAI_LEN_LOI
  w.r2.hong.put = false;
  const hong = w.q("SELECT id FROM pty_attachment WHERE purged_at IS NOT NULL")[0].id as string;
  const B = (await w.call("POST", "/api/parties", { as: ADM, body: { kind: "PERSON", fullName: TEN, contacts: [] } })).json.party.id as string;
  const r = await w.call("POST", `/api/parties/${g.id}/merge`, { as: ADM, body: { intoPartyId: B, xacNhan: TEN } });
  assert.equal(r.status, 200, r.text);
  const ds = await w.call("GET", `/api/parties/${B}/documents`, { as: ADM });
  const did = ds.json.documents.find((d: any) => d.typeCode === "CCCD" && d.current).id as string;
  assert.notEqual(did, g.did);
  assert.deepEqual((await w.call("GET", `/api/parties/${B}/documents/${did}/tep`, { as: SUP })).json.tep.map((t: any) => t.id), [tid]);
  const x = await w.call("GET", `/api/parties/${B}/documents/${did}/tep/${tid}`, { as: SUP });
  assert.equal(x.status, 200);
  assert.deepEqual([...x.bytes], [...PNG]);
  assert.deepEqual(w.q("SELECT target_id t FROM audit_log WHERE action = 'party_attachment_viewed'").map((v: any) => v.t), [B]);
  assert.equal(w.q("SELECT count(*) n FROM pty_attachment_link WHERE attachment_id = ?", hong)[0].n, 1, "ảnh đã quyết xoá không nối sang hồ sơ chính");
});
```

Run: `node --test src/modules/parties/tep-route.test.ts`
Expected: FAIL — route gộp gọi `loGop` thiếu `tepTheoGiayTo` (`v.tepTheoGiayTo is undefined` → 500), hoặc 404 ở danh sách ảnh của dòng mới.

- [ ] **Step 5: Route gộp — `src/modules/parties/index.ts`**

Thêm `tepCuaGiayTo` vào khối import `./repository`. Trong route `POST /api/parties/:id/merge`, thay khối từ dòng `const at = now.toISOString();` tới hết mảng `const stmts = [ … ];` (năm câu lệnh hiện có) bằng:

```ts
      const at = now.toISOString();
      // ADR-0123 + ruling R15: ảnh còn hiệu lực của các dòng giấy tờ ĐƯỢC CHÉP đi theo (dòng nối mới, đứng sau câu lật). Ảnh tải lên trong khe giữa lúc đọc
      // này và lúc ghi lô không đi theo — nằm lại ở dòng đã huỷ của A (chấp nhận, Review Focus kế hoạch H-2).
      const tepTheoGiayTo = await tepCuaGiayTo(env.DB, t.ke.giayTo.chep.map((d) => d.id));
      const lo = loGop(env.DB, { a: id, b: into, ke: t.ke, giayToDu: new Map(t.A.giayToDu.map((d) => [d.id, d])), tepTheoGiayTo, homNay: t.homNay, at, actorId: staff.id });
      const detail = chiTietGop(t);
      // Thứ tự (kế hoạch R1, R2): phần parties → câu đổi người đặt đơn (thấy "A còn đang dùng") → câu LẬT A → hai dòng nhật ký `changes() > 0` → dòng nối ảnh
      // (trigger cần A đã trỏ B). Vị trí câu lật tính TƯỜNG MINH (không đếm từ cuối — đuôi lô dài ngắn theo số ảnh).
      const iLat = lo.truocDon.length + 1;
      const stmts = [
        ...lo.truocDon,
        ctx.gopHoSo.cauDoiDon(id, into, at),
        lo.lat,
        auditStatement(env.DB, { staffId: staff.id, action: "party_merged", at, targetType: "party", targetId: id, detail }, "changes() > 0"),
        auditStatement(env.DB, { staffId: staff.id, action: "party_merged", at, targetType: "party", targetId: into, detail }, "changes() > 0"),
        ...lo.sauNhatKy,
      ];
```

Khối `try { results = await env.DB.batch(stmts); } catch …` giữ nguyên. Dòng kiểm thua cuộc đua ngay sau nó đổi từ `results[stmts.length - 3]` thành:

```ts
      if ((results[iLat]!.meta.changes ?? 0) === 0) return MERGE_LOST_RACE();
```

Run: `node --test src/modules/parties/tep-route.test.ts src/modules/parties/gop-lo.test.ts src/modules/parties/gop-route.test.ts src/architecture.test.ts`
Expected: PASS (gop-route giữ nguyên mọi ca cũ — lô không ảnh có `sauNhatKy` rỗng, `iLat` trùng `stmts.length - 3`).

**Quan sát chặn thật (P16):** trong bản làm việc, xoá vế `EXISTS (SELECT 1 FROM pty_attachment_link l …)` của `GOP_NOI_TEP` → chạy `node --test src/modules/parties/gop-lo.test.ts` → `not ok … lính gác dòng nối …` → hoàn nguyên → xanh. Lần hai: bỏ `...lo.sauNhatKy` khỏi `stmts` ở route → `not ok … Review Focus 4 …` (danh sách ảnh của dòng mới rỗng) → hoàn nguyên → xanh. Ghi ngày + dòng `not ok` cho Task 8.

- [ ] **Step 6: Bộ kiểm đủ + commit**

Run: `npm test && npm run typecheck`
Expected: xanh.

```bash
git add src/modules/parties/repository.ts src/modules/parties/gop-lo.ts src/modules/parties/gop-lo.test.ts src/modules/parties/index.ts src/modules/parties/tep-route.test.ts
git commit -m "Gộp hồ sơ mang theo ảnh giấy tờ sang dòng giấy tờ mới của hồ sơ chính (ADR-0068 Đ1, ADR-0123)

Giấy tờ của hồ sơ phụ được chép thành dòng mới khi gộp; không nối ảnh theo thì ảnh mất đường mở. Dòng nối mới đứng sau câu lật (trigger cần hồ sơ phụ
đã trỏ hồ sơ chính), có lính gác như câu chép giấy tờ: lệch giữa lúc đọc và lúc ghi thì huỷ cả lô. Vị trí câu lật tính tường minh."
```

**Sau commit: giao người kiểm độc lập** (vai `nguoi-kiem-doc-lap`, chỉ đọc) phủ Task 3–6: đọc mã thật, chạy lại `node --test src/modules/parties/tep-route.test.ts src/modules/parties/kho-tep.test.ts src/modules/parties/gop-lo.test.ts src/kho-tep-ho-so.test.ts src/permission-enforcement.test.ts src/route-access.test.ts src/giay-to-khong-lo-so.test.ts src/nhat-ky-hang.test.ts`, phá thử lại hai lần quan sát của Task 4 và một lần của Task 6, đối chiếu bảng `TRANG-GHEP.md` §3 dòng "tải ảnh", "xem ảnh".

---

### Task 7: Cổng chỉ-đọc 1e — `npm run trien-khai` dừng khi chủ chưa tạo kho (VIỆC LỚN — triển khai; người kiểm độc lập BẮT BUỘC ngay sau task này, phủ Task 2 + 7)

**Files:**
- Modify: `scripts/release-lib.mjs`
- Modify: `src/release-lib.test.ts`

**Interfaces:**
- Consumes: Task 2 (`wrangler.jsonc` có `"r2_buckets": [{ "binding": "HO_SO", "bucket_name": "tourdao-sales-ho-so" }]`).
- Produces (`scripts/release-lib.mjs`): `export const BINDING_HO_SO = "HO_SO"`; `export function docKhoHoSoTuCauHinh(text: string): string | null`; `export async function docKhoHoSoMacDinh(): Promise<string | null>`; `export function parseR2BucketNames(output: string): string[]`; `trienKhai({ …, docKhoHoSo = docKhoHoSoMacDinh })`.

- [ ] **Step 1: Bài đỏ — `src/release-lib.test.ts`**

Kiểu `Lib` (đầu tệp): thêm `docKhoHoSo?: () => Promise<string | null>` vào kiểu tham số của `trienKhai`, và bốn mục:

```ts
  BINDING_HO_SO: string;
  docKhoHoSoTuCauHinh: (text: string) => string | null;
  docKhoHoSoMacDinh: () => Promise<string | null>;
  parseR2BucketNames: (out: string) => string[];
```

Ngay sau hằng `LIST`:

```ts
/** ADR-0123 (cổng 1e): kho tệp hồ sơ R2 đã tạo chưa. Dạng đầu ra theo MÃ NGUỒN wrangler 4.147.0 (`formatLabelledValues`: nhãn, dấu hai chấm, khoảng đệm) —
 *  CHƯA chụp từ tài khoản thật (AI không chạy lệnh Cloudflare; kế hoạch H-2 "Giới hạn"). */
const KHO = "CI=1 npx wrangler r2 bucket list";
const KHO_OK = out("\n ⛅️ wrangler 4.147.0\n───────────────────\nListing buckets...\nname:           tourdao-booking-anh\ncreation_date:  2026-09-01T00:00:00.000Z\n\nname:           tourdao-sales-ho-so\ncreation_date:  2026-10-16T03:00:00.000Z\n");
```

Trong `tkScript` thêm `[KHO]: KHO_OK,` ngay sau `[SECRETS]: SECRETS_OK,`. Trong `TK_PREFIX` chèn `KHO` giữa `SECRETS` và `LIST`.

Thêm cuối tệp:

```ts
// ─────────── ADR-0123 (kho tệp hồ sơ, lát H-2 Gói 2): cổng chỉ-đọc 1e — chủ đã tạo kho R2 chưa ───────────

test("trien-khai (kho tệp — cổng 1e): kiểm kho SAU khoá bí mật, TRƯỚC lời gọi D1; có kho ⇒ đi tiếp, ghi tên kho", async () => {
  const h = harness(tkScript(), ["c", "c"]);
  assert.equal(await lib.trienKhai({ ...h.deps, now: NOW, sleep: async () => {} }), 0);
  assert.ok(h.calls.indexOf(KHO) > h.calls.indexOf(SECRETS) && h.calls.indexOf(KHO) < h.calls.indexOf(LIST), h.calls.join(" | "));
  assert.match(h.text(), /Đã có kho tệp hồ sơ: tourdao-sales-ho-so/);
});

test("trien-khai (kho tệp — cổng 1e): chưa có kho (danh sách rỗng, chỉ có tên GẦN giống, tên bị tô màu khác) ⇒ DỪNG trước migration, chỉ nguyên lệnh tạo kho; KHÔNG tự tạo", async () => {
  for (const r of [
    out("Listing buckets...\n"),
    out("Listing buckets...\nname:           tourdao-sales-ho-so-cu\ncreation_date:  2026-10-01T00:00:00.000Z\n"),
    out("Listing buckets...\n\x1b[2mname:\x1b[22m           khac\n"),
  ]) {
    const h = harness(tkScript({ [KHO]: r }), ["c", "c"]);
    assert.notEqual(await lib.trienKhai({ ...h.deps, now: NOW, sleep: async () => {} }), 0);
    assert.equal(h.calls.at(-1), KHO, "phải dừng NGAY ở cổng kho");
    assert.ok(!h.calls.some((c) => /r2 (bucket (create|delete|update)|object)/.test(c)), "cổng chỉ ĐỌC — không tạo / sửa kho");
    assertNothingDangerous(h.calls);
    const t = h.text();
    assert.match(t, /Chưa có kho tệp hồ sơ tourdao-sales-ho-so/);
    assert.match(t, /CHƯA có gì bị đổi trên production/);
    assert.ok(t.replace(/\x1b\[[0-9;]*m/g, "").split("\n").map((x) => x.trim()).includes("npx wrangler r2 bucket create tourdao-sales-ho-so"), "lệnh tạo kho đứng một mình trên dòng");
  }
});

test("trien-khai (kho tệp — cổng 1e): tên kho tô màu đúng ⇒ vẫn nhận (bỏ mã màu trước khi đọc)", async () => {
  const h = harness(tkScript({ [KHO]: out("Listing buckets...\n\x1b[2mname:\x1b[22m           tourdao-sales-ho-so\n") }), ["c", "c"]);
  assert.equal(await lib.trienKhai({ ...h.deps, now: NOW, sleep: async () => {} }), 0);
});

test("trien-khai (kho tệp — cổng 1e): lệnh lỗi (kể cả 7403) ⇒ DỪNG, không thử lại, không coi là đạt", async () => {
  for (const r of [FAIL, LOI_7403]) {
    const h = harness(tkScript({ [KHO]: r }), ["c", "c"]);
    assert.notEqual(await lib.trienKhai({ ...h.deps, now: NOW, sleep: async () => {} }), 0);
    assert.equal(h.calls.filter((c) => c === KHO).length, 1);
    assert.ok(!h.calls.includes(LIST));
    assert.match(h.text(), /`wrangler r2 bucket list` lỗi/);
  }
});

test("trien-khai (kho tệp — cổng 1e): không đọc được tên kho trong wrangler.jsonc ⇒ DỪNG trước mọi lời gọi R2 / D1", async () => {
  for (const docKhoHoSo of [async () => null, async () => { throw new Error("ENOENT"); }]) {
    const h = harness(tkScript(), ["c", "c"]);
    assert.notEqual(await lib.trienKhai({ ...h.deps, now: NOW, sleep: async () => {}, docKhoHoSo }), 0);
    assert.ok(!h.calls.includes(KHO) && !h.calls.includes(LIST));
    assert.match(h.text(), /binding HO_SO/);
  }
});

test("docKhoHoSoTuCauHinh: chỉ bỏ chú thích CẢ DÒNG; thiếu mục / sai binding / tên sai khuôn / JSON hỏng ⇒ null; tệp thật ⇒ tourdao-sales-ho-so", async () => {
  const cfg = (r2: unknown) => `{\n  // chú thích cả dòng\n  "name": "tourdao-sales",\n  "r2_buckets": ${JSON.stringify(r2)}\n}\n`;
  assert.equal(lib.docKhoHoSoTuCauHinh(cfg([{ binding: "HO_SO", bucket_name: "tourdao-sales-ho-so" }])), "tourdao-sales-ho-so");
  assert.equal(lib.docKhoHoSoTuCauHinh(cfg([{ binding: "KHAC", bucket_name: "x-y-z" }])), null);
  assert.equal(lib.docKhoHoSoTuCauHinh(cfg([{ binding: "HO_SO", bucket_name: "Có Dấu" }])), null);
  assert.equal(lib.docKhoHoSoTuCauHinh('{ "name": "x" }'), null);
  assert.equal(lib.docKhoHoSoTuCauHinh('{ "r2_buckets": [] } // chú thích cuối dòng'), null, "chú thích cuối dòng làm hỏng tệp — phải lộ ra, không đoán");
  assert.equal(lib.BINDING_HO_SO, "HO_SO");
  assert.equal(await lib.docKhoHoSoMacDinh(), "tourdao-sales-ho-so");
});

test("parseR2BucketNames: bỏ mã màu, lấy mọi dòng 'name: <tên>'; không lấy dòng khác", () => {
  assert.deepEqual(lib.parseR2BucketNames("Listing buckets...\nname:   a-b\ncreation_date: x\n\n\x1b[2mname:\x1b[22m   c-d\nnamex: e\n"), ["a-b", "c-d"]);
  assert.deepEqual(lib.parseR2BucketNames(""), []);
});
```

Run: `node --test src/release-lib.test.ts`
Expected: FAIL — các ca cũ đỏ vì `KHO` không được gọi (`TK_PREFIX` lệch), ca mới đỏ vì hàm chưa có.

- [ ] **Step 2: Cổng — `scripts/release-lib.mjs`**

Thêm ngay sau hằng `KHOA_HAI_LOP`:

```js
/** Binding kho tệp hồ sơ R2 (ADR-0123). Tên kho đọc từ wrangler.jsonc — MỘT nguồn (kế hoạch H-2 kho tệp, ruling R2, R10). */
export const BINDING_HO_SO = "HO_SO";
/**
 * Tên kho R2 của binding HO_SO trong nội dung wrangler.jsonc, hoặc null. Chỉ bỏ chú thích CẢ DÒNG (luật của tệp — như src/cau-hinh-toc-do.test.ts);
 * chú thích cuối dòng làm JSON hỏng ⇒ null ⇒ cổng dừng (không đoán).
 */
export function docKhoHoSoTuCauHinh(text) {
  try {
    const cfg = JSON.parse(String(text).split("\n").filter((d) => !/^\s*\/\//.test(d)).join("\n"));
    const kho = Array.isArray(cfg?.r2_buckets) ? cfg.r2_buckets.find((b) => b?.binding === BINDING_HO_SO) : undefined;
    return typeof kho?.bucket_name === "string" && /^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/.test(kho.bucket_name) ? kho.bucket_name : null;
  } catch {
    return null;
  }
}
/** Đọc tệp thật (bài src/release-lib.test.ts "docKhoHoSoTuCauHinh" ghim kết quả). */
export async function docKhoHoSoMacDinh() {
  const { readFile } = await import("node:fs/promises");
  return docKhoHoSoTuCauHinh(await readFile(new URL("../wrangler.jsonc", import.meta.url), "utf8"));
}
```

Thêm ngay sau hằng `ANSI` (dùng lại nó):

```js
/** Tên kho từ đầu ra `wrangler r2 bucket list` (wrangler 4.x: mỗi kho một khối "name: <tên>" / "creation_date: …"). Bỏ mã màu trước. Dạng theo mã nguồn 4.147.0. */
export function parseR2BucketNames(output) {
  const text = String(output ?? "").replace(ANSI, "");
  return [...text.matchAll(/^\s*name:\s+(\S+)\s*$/gm)].map((m) => m[1]);
}
```

Chữ ký `trienKhai`: thêm tham số `docKhoHoSo = docKhoHoSoMacDinh` (sau `docMocTinDoi = docMocTinDoiMacDinh`) và một dòng JSDoc `@param docKhoHoSo đọc tên kho tệp hồ sơ; test truyền hàm giả.`

Ngay sau `log(\`Đã có đủ khoá: …\`);` (trước bước 2):

```js
  // 1e. cổng chỉ-đọc: kho tệp hồ sơ R2 (ADR-0123) đã được CHỦ tạo chưa. Tên kho đọc từ wrangler.jsonc (binding HO_SO — một nguồn). Chưa có kho thì Worker mới
  // không tải lên / mở được ảnh giấy tờ (Cloudflare có từ chối deploy hay không: chưa kiểm). Lệnh lỗi (kể cả 7403) hay không thấy đúng tên ⇒ DỪNG, không thử lại.
  // KHÔNG BAO GIỜ tự tạo kho — chỉ in lệnh cho chủ.
  log("\n▶ Cổng chỉ-đọc: kho tệp hồ sơ đã tạo trên Cloudflare chưa");
  let tenKho = null;
  try {
    tenKho = await docKhoHoSo();
  } catch {
    tenKho = null;
  }
  if (!tenKho) {
    return stop("không đọc được tên kho tệp hồ sơ (mục r2_buckets, binding HO_SO) trong wrangler.jsonc — CHƯA có gì bị đổi trên production.", "Báo AI kiểm lại wrangler.jsonc rồi chạy lại `npm run trien-khai`.");
  }
  const kho = await run("npx", ["wrangler", "r2", "bucket", "list"], { env: CI });
  if (kho.code !== 0) {
    return stop("`wrangler r2 bucket list` lỗi — chưa kiểm được kho tệp hồ sơ nên KHÔNG đi tiếp. CHƯA có gì bị đổi trên production.", String(kho.stderr ?? "").trim().slice(0, 400));
  }
  if (!parseR2BucketNames(String(kho.stdout ?? "")).includes(tenKho)) {
    return stop(
      `Chưa có kho tệp hồ sơ ${tenKho} trên Cloudflare — triển khai lúc này thì ảnh giấy tờ không tải lên hay mở được. CHƯA có gì bị đổi trên production.`,
      `Chạy trong Terminal, ở thư mục tourdao-sales:\n  npx wrangler r2 bucket create ${tenKho}\nKiểm lại (phải thấy dòng "name: ${tenKho}"):\n  npx wrangler r2 bucket list\nrồi chạy lại \`npm run trien-khai\`.`,
    );
  }
  log(`Đã có kho tệp hồ sơ: ${tenKho}.`);
```

Sửa dòng chú thích đầu tệp mô tả `npm run trien-khai` thành "(cổng chỉ-đọc gồm khoá bí mật và kho tệp hồ sơ, cổng số phiên bản, …)".

Run: `node --test src/release-lib.test.ts`
Expected: PASS.

**Quan sát chặn thật (P16):** trong bản làm việc, đổi `.includes(tenKho)` thành `.some((x) => x.startsWith(tenKho))` → chạy lại → `not ok … chưa có kho (… tên GẦN giống …)` → hoàn nguyên → xanh. Ghi ngày + dòng `not ok` cho Task 8.

- [ ] **Step 3: Bộ kiểm đủ + commit**

Run: `npm test && npm run typecheck`
Expected: xanh. (`typecheck` không phủ `scripts/` — tự đọc lại `scripts/release-lib.mjs`.)

```bash
git add scripts/release-lib.mjs src/release-lib.test.ts
git commit -m "npm run trien-khai: cổng chỉ-đọc 1e dừng khi chưa có kho tệp hồ sơ trên Cloudflare (ADR-0123)

Binding R2 mới cần chủ tạo kho một lần; quên thì ảnh giấy tờ không tải lên được. Cổng đọc tên kho từ wrangler.jsonc, hỏi danh sách kho (chỉ đọc),
thiếu thì dừng trước migration và in nguyên lệnh tạo kho. Không bao giờ tự tạo kho."
```

**Sau commit: giao người kiểm độc lập** phủ Task 2 + 7: đọc `wrangler.jsonc`, `worker-configuration.d.ts`, `src/shared/sw-policy.ts`, `web/sw/sw.ts`, `tests/audit/harness.mjs`, `scripts/release-lib.mjs`; chạy lại `node --test src/release-lib.test.ts src/shared/sw-policy.test.ts src/kho-tep-ho-so.test.ts src/cau-hinh-toc-do.test.ts src/modules/parties/tep.test.ts`; phá thử lại lần quan sát của Task 2 (lớp 3 service worker, rào `HO_SO`) và Task 7; đối chiếu đầu ra giả của `wrangler r2 bucket list` với mã nguồn `node_modules/wrangler/wrangler-dist/cli.js` (lệnh `r2BucketListCommand`, `formatLabelledValues`).

---

### Task 8: Kịch bản e2e (R2 mô phỏng), tài liệu mô tả, sổ hàng rào, runbook + việc của chủ (nhỏ + nghiệm thu)

**Files:**
- Create: `tests/e2e/ho-so-tep.mjs`
- Modify: `tests/e2e/run.mjs` (`ALL`, `THOI_GIAN`, chú thích thứ tự)
- Modify: `docs/SYSTEM-DESIGN.md` (§5, §7, §8), `docs/CHANGE-GUIDE.md` (§1 một dòng, §2 công thức z20, §4 một bẫy), `docs/SO-HANG-RAO.md` (bốn dòng), `docs/HANDOFF-N1.md` (runbook + việc của chủ), `docs/BACKLOG.md` (mục 36)

**Interfaces:**
- Consumes: mọi task trước; ngày + dòng `not ok` đã ghi ở bước quan sát chặn thật của Task 1, 2, 4, 6, 7.
- Produces: kịch bản `ho-so-tep` trong `npm run test:e2e`; tài liệu khớp mã.

- [ ] **Step 1: Kịch bản e2e — `tests/e2e/ho-so-tep.mjs`**

```js
// Kho tệp hồ sơ (ADR-0123, lát H-2 Gói 2) trên API thật + D1 local tạm + kho R2 MÔ PHỎNG của `wrangler dev` (miniflare, cùng thư mục --persist-to của nhóm).
// KHÔNG phải kho R2 thật của Cloudflare — giới hạn ghi ở kế hoạch H-2. Ca: Quản trị không tải / mở được; Toàn quyền tải PNG, HTML bị từ chối; tải xuống đúng byte,
// no-store + nosniff; nhật ký không chứa khoá kho / băm; gộp hồ sơ ⇒ ảnh mở qua dòng giấy tờ mới; hàng chờ xoá đọc được, chạy lại được.
import assert from "node:assert/strict";
import { ACCOUNTS, BASE, call, session, sqlRows } from "./lib.mjs";

const ADMIN = await session(ACCOUNTS.admin);
const TOAN_QUYEN = await session(ACCOUNTS.superAdmin);
const tag = String(Date.now()).slice(-6);
const TEN = `Khách Có Ảnh ${tag}`;
const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d, 0x49, 0x48, 0x44, 0x52]), Buffer.from(tag)]);
const b64 = (b) => Buffer.from(b).toString("base64");
const taiVe = (cookie, path) => fetch(BASE + path, { headers: { cookie } }); // GET thô: thân là byte, không phải JSON

let r = await call(ADMIN, "POST", "/api/parties", { kind: "PERSON", fullName: TEN, contacts: [] });
assert.equal(r.status, 201, JSON.stringify(r.body));
const A = r.body.party.id;
r = await call(ADMIN, "POST", `/api/parties/${A}/documents`, { typeCode: "CCCD", number: `079${tag}000`, expiryDate: "2035-01-01" });
assert.equal(r.status, 201, JSON.stringify(r.body));
const did = r.body.documents.find((d) => d.typeCode === "CCCD" && d.current).id;
const duong = (p, d) => `/api/parties/${p}/documents/${d}/tep`;
console.log("✓ hồ sơ + CCCD");

r = await call(ADMIN, "POST", duong(A, did), { noiDung: b64(PNG) });
assert.equal(r.status, 403, "Quản trị tải được ảnh (ruling Q1: chỉ Toàn quyền)");
r = await call(TOAN_QUYEN, "POST", duong(A, did), { noiDung: b64(Buffer.from("<html><script>alert(1)</script></html>")) });
assert.equal(r.status, 415);
r = await call(TOAN_QUYEN, "POST", duong(A, did), { noiDung: b64(PNG) });
assert.equal(r.status, 201, JSON.stringify(r.body));
const tid = r.body.tep.id;
assert.deepEqual(Object.keys(r.body.tep).sort(), ["id", "kichThuoc", "loai", "taiLuc"]);
console.log("✓ Quản trị 403, HTML 415, Toàn quyền tải PNG 201");

let t = await taiVe(TOAN_QUYEN, `${duong(A, did)}/${tid}`);
assert.equal(t.status, 200);
assert.deepEqual(Buffer.from(await t.arrayBuffer()), PNG, "byte tải về khác byte tải lên (kho mô phỏng)");
assert.equal(t.headers.get("cache-control"), "no-store");
assert.equal(t.headers.get("x-content-type-options"), "nosniff");
assert.equal((await taiVe(ADMIN, `${duong(A, did)}/${tid}`)).status, 403);
console.log("✓ tải xuống đúng byte, no-store + nosniff; Quản trị 403");

const [dong] = await sqlRows(`SELECT storage_key k, content_hash h FROM pty_attachment WHERE id = '${tid}'`);
const nk = await sqlRows(`SELECT action a, detail d FROM audit_log WHERE action LIKE 'party_attachment_%' AND target_id = '${A}'`);
assert.deepEqual(nk.map((x) => x.a).sort(), ["party_attachment_added", "party_attachment_viewed"]);
for (const x of nk) assert.ok(!String(x.d).includes(dong.k) && !String(x.d).includes(dong.h), `nhật ký ${x.a} chứa khoá kho / băm`);
console.log("✓ nhật ký chỉ mã");

r = await call(ADMIN, "POST", "/api/parties", { kind: "PERSON", fullName: TEN, contacts: [] });
const B = r.body.party.id;
r = await call(ADMIN, "POST", `/api/parties/${A}/merge`, { intoPartyId: B, xacNhan: TEN });
assert.equal(r.status, 200, JSON.stringify(r.body));
const didB = (await call(ADMIN, "GET", `/api/parties/${B}/documents`)).body.documents.find((d) => d.typeCode === "CCCD" && d.current).id;
t = await taiVe(TOAN_QUYEN, `${duong(B, didB)}/${tid}`);
assert.equal(t.status, 200, "sau gộp không mở được ảnh qua dòng giấy tờ mới");
assert.deepEqual(Buffer.from(await t.arrayBuffer()), PNG);
console.log("✓ gộp hồ sơ: ảnh mở qua dòng giấy tờ mới của hồ sơ chính");

r = await call(TOAN_QUYEN, "GET", "/api/parties/tep-cho-xoa");
assert.equal(r.status, 200);
assert.ok(Array.isArray(r.body.tep));
assert.doesNotMatch(JSON.stringify(r.body), /pty\/[0-9a-f]{32}/);
assert.equal((await call(ADMIN, "GET", "/api/parties/tep-cho-xoa")).status, 403);
r = await call(TOAN_QUYEN, "POST", "/api/parties/tep-cho-xoa/chay-lai", {});
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.equal(typeof r.body.daXoa, "number");
console.log("✓ hàng chờ xoá: Toàn quyền đọc + chạy lại; Quản trị 403");
```

`tests/e2e/run.mjs`: trong `ALL` thêm `"ho-so-tep"` ngay sau `"ho-so-rieng-tu"`; trong `THOI_GIAN` thêm `"ho-so-tep": 5,` ngay sau `"ho-so-rieng-tu": 5,`; thêm một dòng chú thích trong khối chú thích thứ tự: `// "ho-so-tep" (ADR-0123) ngay sau "ho-so-rieng-tu": hồ sơ / ảnh dùng một lần (CCCD theo Date.now()), kho R2 MÔ PHỎNG của wrangler dev trong thư mục --persist-to của nhóm; không đụng salesB/field.`

Run: `npm run test:e2e -- ho-so-tep gop-ho-so ho-so-rieng-tu pwa`
Expected: bốn kịch bản xanh, rồi `audit-invariants` (tự chạy cuối) thoát 0 — `R-PTY-11` không vi phạm; `R-PTY-12` (mức `warn`) không báo vì không còn tệp chờ xoá quá 1 giờ. Cần mạng (e2e vốn cần). **Chưa kiểm khi soạn:** `wrangler dev` (không `--remote`) mô phỏng R2 trong `--persist-to` mà không hỏi gì — nếu nó đòi đăng nhập / kho thật, DỪNG và báo điều phối (không thêm `--remote`, không tạo kho).

- [ ] **Step 2: Tài liệu mô tả (thua mã — sửa cùng commit)**

`docs/SYSTEM-DESIGN.md` §5 (mô hình dữ liệu), thêm đoạn cạnh các bảng `pty_*` khác:

```markdown
**Kho tệp hồ sơ (ADR-0123; migration `0104`; lát H-2 Gói 2).** Nội dung ảnh / PDF giấy tờ KHÔNG nằm trong D1 mà ở kho R2 riêng (binding `HO_SO`, kho `tourdao-sales-ho-so`), khoá `pty/<32 hex ngẫu nhiên>`. `pty_attachment` (một dòng một tệp: hồ sơ nhận lúc tải, khoá kho, loại theo chữ ký, cỡ, băm SHA-256; không tên tệp gốc) đi theo ba mốc một chiều `stored_at` → `purged_at` (+ mã lý do, băm về rỗng) → `r2_deleted_at`; không xoá dòng. `pty_attachment_link` (chỉ-thêm) nối tệp với dòng giấy tờ người / tổ chức; gộp hồ sơ thêm dòng nối sang dòng giấy tờ mới của hồ sơ chính. `storage_key`, `content_hash` hạng N3. Tải lên ghi D1 trước rồi mới đặt kho; xoá kho chạy sau lô D1, hỏng thì nằm ở hàng "chờ xoá" (`R-PTY-12`).
```

§7 (danh mục API), thêm năm dòng vào bảng route của `parties` (đúng khuôn cột đang dùng ở bảng đó):

```markdown
| POST | `/api/parties/:id/documents/:did/tep` | office | Tải ảnh / PDF giấy tờ (JSON `{ noiDung: base64 }`, ≤ 10 MB, JPG/PNG/HEIC/PDF theo chữ ký) — `party.document.write` + `party.attachment.view` |
| GET | `/api/parties/:id/documents/:did/tep` | office | Danh sách ảnh của một dòng giấy tờ (chỉ mã, loại, cỡ, lúc) — `party.attachment.view` |
| GET | `/api/parties/:id/documents/:did/tep/:tid` | office | Mở ảnh: nhật ký trước, rồi đọc kho; `no-store`, `nosniff`, CSP sandbox — `party.attachment.view` |
| GET | `/api/parties/tep-cho-xoa` | office | Hàng chờ xoá kho (chỉ mã) — `party.attachment.view` |
| POST | `/api/parties/tep-cho-xoa/chay-lai` | office | Chạy lại xoá kho sau lô quyết xoá; quyết xoá tệp tải dở dang quá 10 phút — `party.attachment.view` |
```

§8 (phân quyền), thêm một dòng vào bảng ô: `party.attachment.view` — chỉ Toàn quyền (ADR-0124 đ4); lát H-2 dùng thêm cho tải lên (kèm `party.document.write`) và hàng chờ xoá (ruling Q1, Q4 kế hoạch H-2).

`docs/CHANGE-GUIDE.md`:

§1, thêm một dòng bảng:

```markdown
| Tải / mở ảnh giấy tờ; thêm một loại đích cho ảnh; xoá ảnh khỏi kho (ADR-0123) | `src/modules/parties/tep.ts`, `kho-tep.ts`, `repository.ts` (khối "Kho tệp hồ sơ"), `index.ts` (route `…/tep*`), `migrations/0104_ho_so_tep.sql`, `wrangler.jsonc` (`HO_SO`) | z20 |
```

§2, thêm sau z19:

```markdown
### z20. Kho tệp hồ sơ trên R2 (ADR-0123 — lát H-2 Gói 2, migration `0104`; CHƯA lên production)

- **Tải lên:** ghi D1 TRƯỚC (dòng tệp + dòng nối + nhật ký, `stored_at` rỗng) → `kho.put` → `markTepStored`. Đừng đảo: đặt kho trước mà lô D1 hỏng thì kho giữ ảnh CSDL không biết (rào `src/kho-tep-ho-so.test.ts` (4)).
- **Mở ảnh:** `can(staff, "party.attachment.view")` → nhật ký (lô riêng) → `kho.get`. Đường đọc kho thứ hai trong `parties` làm rào (3) đỏ — đi qua cùng cổng.
- **Xoá khỏi kho:** chỉ qua `cauDatChoXoa` (quyết xoá + nhật ký trong lô) rồi `ghiRoiXoaKho` / `xoaKhoiKho` (`kho-tep.ts`); lỗi kho không ném, dòng nằm ở `GET /api/parties/tep-cho-xoa`. Phiếu xoá (lát H-5) dùng lại đúng hai hàm này.
- **Thêm loại đích** (vd phiếu tự khai, lát H-4): migration MỚI tạo lại trigger `pty_attachment_link_kind_ins` + `…_target_ins`; KHÔNG dựng lại bảng chỉ-thêm.
- **Thêm loại tệp:** cần ADR mới (ADR-0123 đ2) — đổi `nhanLoaiTep`, `LOAI_NOI_DUNG`, `CHECK content_kind` (migration mới, dựng lại bảng = việc lớn).
- **Bài:** `src/modules/parties/tep.test.ts`, `kho-tep.test.ts`, `tep-route.test.ts`, `src/migrations-ho-so-tep.test.ts`, `src/kho-tep-ho-so.test.ts`, e2e `ho-so-tep`.
```

§4, thêm một bẫy số kế tiếp (đếm lại cuối danh sách):

```markdown
NN. **Kho tệp hồ sơ (ADR-0123, migration `0104`) — bốn bẫy:** (1) `wrangler.jsonc` chỉ được có chú thích CẢ DÒNG — chú thích cuối dòng làm cổng 1e của `npm run trien-khai` và `src/cau-hinh-toc-do.test.ts` không đọc được tệp. (2) `worker-configuration.d.ts` khai TAY `HO_SO?: R2Bucket` (dấu hỏi có chủ ý — khung thử không có kho ⇒ route 503); `npm run types` sẽ sinh lại thành bắt buộc — sửa tay lại. (3) e2e và `wrangler dev` dùng R2 MÔ PHỎNG; chưa ai thử kho thật trước lần phát hành đầu (runbook `docs/HANDOFF-N1.md`). (4) Tải xuống là GET có ghi nhật ký — đừng đổi sang POST (lớp chống ghi trùng sẽ chép byte ảnh vào D1 để phát lại).
```

`docs/BACKLOG.md`, thêm cuối tệp:

```markdown
## 36. Kho tệp hồ sơ — nợ lát H-2 (mã `BL-TEP-…`; kế hoạch `docs/superpowers/plans/2026-10-16-goi-2-h2-kho-tep-ke-hoach.md`)

- `BL-TEP-EXIF`: xoá toạ độ chụp (EXIF) khỏi ảnh trước khi đặt kho — chưa làm vì không thêm thư viện runtime và chưa kiểm khả thi trên Worker (ruling R12).
- `BL-TEP-HOOK-R2` (đề xuất cho chủ — AI không tự sửa `.claude/`): hook `guard-remote` chưa chặn `wrangler r2 bucket create|update|cors|lifecycle|lock|sippy|notification` và `wrangler r2 object put` không kèm `--local`; thêm luật `wrangler-r2-write` + ca ở `src/claude-guard.cases.json` (ruling R14).
- `BL-TEP-THAN-HAI-LAN`: tải 10 MB = thân ~14 MB bị lớp chống ghi trùng đọc một lần và route đọc lần nữa; nếu Worker báo thiếu bộ nhớ thì xét đường tải lên riêng (cần ADR — đụng lớp chống ghi trùng).
- `BL-TEP-KHE-GOP`: ảnh tải lên dòng giấy tờ của hồ sơ phụ trong khe giữa lúc đọc và lúc ghi lô gộp không đi theo (ruling R15) — lát H-5 đưa vào danh sách xoá.
- `BL-TEP-GIAO-DIEN`: chưa có màn hình tải / xem ảnh; lát giao diện sau.
```

- [ ] **Step 3: Sổ hàng rào — `docs/SO-HANG-RAO.md`, bốn dòng (cột: Hàng rào | Chặn cái gì | Cơ chế | Đã thấy chặn thật | Ghi chú)**

Cột "Đã thấy chặn thật" điền NGÀY và dòng `not ok` thật đã ghi ở bước quan sát của task tương ứng (không điền thì dòng đó chỉ là lời khuyên — `CLAUDE.md` §3).

```markdown
| `migrations/0104_ho_so_tep.sql` + `src/migrations-ho-so-tep.test.ts` + `R-PTY-11`, `R-PTY-12` (lát H-2 Gói 2, ADR-0123) | Xoá dòng tệp; đổi hồ sơ / khoá kho / loại / cỡ của tệp; đặt lại băm; quyết xoá hai lần; đánh dấu đã-xoá-khỏi-kho trước khi quyết xoá; sửa / xoá dòng nối; nối tệp vào giấy tờ của hồ sơ khác; nối tệp đã quyết xoá; tệp nằm "chờ xoá" mãi | Trigger một chiều + chỉ-thêm trong migration, bài SQL thẳng trên schema thật; kiểm định kỳ chỉ đọc (`R-PTY-12` mức warn, sau 1 giờ) | <ngày + dòng `not ok` ghi ở Task 1> | Không chặn: SQL gõ tay trên production (ngoài phạm vi); loại đích mới phải tạo lại trigger (công thức z20) |
| Lớp 3 service worker (`isCacheable` từ chối `Cache-Control: no-store`) + `src/shared/sw-policy.test.ts` (lát H-2) | Service worker lưu đệm ảnh giấy tờ (PNG / JPEG là loại được phép lưu theo lớp 2) | Hàm thuần dùng chung `web/sw/sw.ts` ↔ bài | <ngày + dòng `not ok` ghi ở Task 2> | Chỉ chặn khi máy chủ gửi `no-store` — route tệp gửi qua `dauPhanHoiTep` |
| `src/kho-tep-ho-so.test.ts` (lát H-2) | Module ngoài `parties` chạm binding `HO_SO`; đường dẫn ký sẵn; đọc kho trước khi ghi nhật ký; đặt kho trước lô D1; route tự đọc thân trước khi xét `Content-Length`; đường đọc / đặt kho thứ hai | Phân tích tĩnh mã thật (bỏ dòng chú thích toàn dòng) | <ngày + dòng `not ok` ghi ở Task 2 và Task 4> | Canh QUÊN, không canh CỐ Ý (đổi tên biến, gọi qua hàm trung gian vẫn qua) — đọc mã vẫn là việc của người kiểm. KHÔNG chặn thân quá lớn vào Worker: lớp chống ghi trùng đã đọc nguyên thân trước route; trần 10 MB thật nằm ở bước sau giải mã (`kiemTepTaiLen`) |
| Cổng chỉ-đọc 1e của `npm run trien-khai` (`scripts/release-lib.mjs`, bài `src/release-lib.test.ts`) | Triển khai Worker có binding `HO_SO` khi chủ chưa tạo kho R2 | `wrangler r2 bucket list` (chỉ đọc) + tên kho đọc từ `wrangler.jsonc`; lệnh lỗi / không thấy tên ⇒ dừng trước migration | <ngày + dòng `not ok` ghi ở Task 7> | Đầu ra `r2 bucket list` dựng theo mã nguồn wrangler 4.147.0, CHƯA chụp từ tài khoản thật; nâng wrangler phải kiểm lại |
```

- [ ] **Step 4: Runbook + việc của chủ — `docs/HANDOFF-N1.md`**

Chèn ngay TRƯỚC mục `## TRẠNG THÁI TRIỂN KHAI — Phiên bản 1.96 …` (tức sau mục trạng thái hiện hành đầu tệp):

```markdown
## Lần phát hành kế tiếp có kho tệp hồ sơ (migration `0104`, ADR-0123 — Gói 2 lát H-2; CHƯA lên production)

**Việc của chủ — làm MỘT lần, TRƯỚC `npm run trien-khai`** (AI không được tạo kho; `npm run trien-khai` sẽ dừng ở cổng 1e nếu chưa làm). Ở thư mục `tourdao-sales`:

1. Tạo kho tệp hồ sơ (kho riêng, không công khai):

       npx wrangler r2 bucket create tourdao-sales-ho-so

2. Kiểm đã có kho (phải thấy dòng `name: tourdao-sales-ho-so`):

       npx wrangler r2 bucket list

3. Chạy `npm run trien-khai` như thường lệ.

**Sau phát hành, chủ thử một lần bằng tài khoản Toàn quyền** (chưa có màn hình — lát này chỉ có API; thử khi có màn hình ở lát giao diện): tải một ảnh CCCD chụp bằng iPhone (HEIC) và một PDF, mở lại, xem nhật ký có "Thêm ảnh giấy tờ" / "Mở ảnh giấy tờ" mà không có tên tệp. **Chưa kiểm khi soạn:** (a) `wrangler deploy` có từ chối khi kho chưa tạo không; (b) đầu ra thật của `wrangler r2 bucket list`; (c) nhãn HEIC thật của iPhone; (d) tốc độ tải 10 MB qua 4G.

**Hoàn tác:** migration `0104` chỉ THÊM hai bảng — lùi Worker về bản trước không cần đụng D1; kho R2 để nguyên (rỗng hoặc có ảnh) — KHÔNG xoá kho khi còn dòng `pty_attachment` chưa `r2_deleted_at`.
```

- [ ] **Step 5: Bộ kiểm đủ + commit**

Run: `npm test && npm run typecheck && npm run build:web`
Expected: xanh.

```bash
git add tests/e2e/ho-so-tep.mjs tests/e2e/run.mjs docs/SYSTEM-DESIGN.md docs/CHANGE-GUIDE.md docs/SO-HANG-RAO.md docs/HANDOFF-N1.md docs/BACKLOG.md
git commit -m "Kho tệp hồ sơ: kịch bản e2e trên R2 mô phỏng, tài liệu, sổ hàng rào, việc của chủ trước lần phát hành (ADR-0123)

Chủ phải tạo kho R2 một lần trước khi triển khai — ghi nguyên lệnh ở HANDOFF và cổng 1e nhắc lại. Bốn hàng rào mới vào sổ kèm ngày quan sát chặn thật.
Nợ còn lại (EXIF, siết hook lệnh R2, thân tải lên đọc hai lần, khe gộp) vào BACKLOG mục 36."
```

**Kiểm cuối nhánh (người kiểm độc lập, chỉ đọc):** chạy lại `npm test`, `npm run typecheck`, `npm run test:e2e -- ho-so-tep gop-ho-so ho-so-rieng-tu pwa`; phá thử lại MỘT hàng rào bất kỳ trong bốn dòng sổ; đối chiếu Review Focus 1–5 với bài thật; xác nhận `git diff main --stat` không chạm `CLAUDE.md`, `.claude/`, `playbook/`, `docs/adr/`, migration cũ.
