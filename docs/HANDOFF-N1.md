# HANDOFF — N1 (nền danh tính: hồ sơ, địa điểm, quyền app)

Đặc tả: `docs/superpowers/specs/2026-09-20-n1-nen-danh-tinh-data-model.md` (đã duyệt 2026-09-20). ADR: `docs/adr/ADR-0001…0008`. Kế hoạch: `docs/superpowers/plans/2026-09-20-n1-a-nen-du-lieu.md` và `…-n1-b-chuyen-quyen.md`.

## Lần phát hành kế tiếp: Sổ đại lý đợt 2 (ADR-0079, ADR-0078 điều 7–10, ADR-0132; migration `0112`, `0113` — số tạm; nhật ký thay đổi 2.24 — số tạm) — CHƯA PHÁT HÀNH — RUNBOOK

**Trạng thái (ghi 2026-10-19, Task 14):** nhánh `claude/objective-euclid-1c8113`, CHƯA gộp `main`, CHƯA lên production. Đặc tả `docs/superpowers/specs/2026-10-18-so-dai-ly-dot-2/README.md` §5 (phát hành, hoàn tác); sổ thi công `docs/superpowers/plans/2026-10-18-so-dai-ly-dot-2-thi-cong-nhat-ky.md`. Đổi số 19/10 (Ruling R-P11): chữ «0111» của hồ sơ cũ nay là `0112`, «0112» (chụp bù) nay là `0113`, «2.18» / «2.22» nay là 2.24.

**0. Điều kiện — CHƯA ĐỦ hôm nay.** Chủ dự án duyệt 18/10 (nguyên văn ở `docs/quyen-hoan.json`, mục HC-5.19, trường `xay_tren_cho_phep`): «… chỉ phát hành sau khi đã diễn tập khôi phục dữ liệu.» Diễn tập theo `docs/superpowers/specs/2026-09-22-dien-tap-khoi-phuc.md` (khôi phục vào chỗ KHÔNG phải D1 thật, đếm bảng, chạy `audit-invariants` trên bản khôi phục, ghi kết quả vào `docs/SO-HANG-RAO.md` và tệp này; hạn HC-5.19: 2026-11-05). Tới lúc ghi chưa có bằng chứng nào đã diễn tập. **Muốn phát hành trước diễn tập thì chủ phải nói lại bằng lời mới** (ghi nguyên văn vào đây); không suy từ lời cũ.

**1. Số migration lúc gộp** (kiểm 2026-10-19 17:50 giờ VN bằng `git ls-tree --name-only <nhánh> migrations/` cho mọi nhánh chưa gộp và `ls migrations` của mọi worktree; KHÔNG `git fetch`): `main` có tới `0111_ten_luat_chuyen_khach` và — gộp trong lúc viết, kiểm lại 18:25 — `0115_chon_don_khung_gio`; nhánh này `0112_so_dai_ly_dot_2`, `0113_chup_bu_khach_le`; nhánh `claude/pricing-discounts-customer-types-edb51c` (worktree `optimistic-wu-2c3796`) giữ `0114_chiet_khau_theo_loai_khach`. Không trùng. Nếu `0115` lên production trước, `0112`/`0113` áp sau vẫn được (wrangler theo dõi theo TÊN, khuôn hai tệp `0016_*`) — hai bên không chung đối tượng (đã đọc tên tệp, CHƯA đọc nội dung `0115`). Kiểm lại ngay trước `day-len`; nhánh khác gộp trước mà đụng `0112`/`0113` thì đổi số nhánh này (bài `src/migrations-so-dai-ly-dot-2.test.ts` tìm theo đuôi `_so_dai_ly_dot_2.sql`; đổi `0113` thì đổi cả dấu `he-thong:0113` ở migration, câu đếm (sau) và `src/chup-bu.test.ts` — khuôn R-P11). Số nhật ký 2.24: `main` đã dùng 2.22, `worktree-xac-nhan-don` giữ 2.23 — kiểm lại ở bước A.0.

**2. Trước phát hành — chủ chạy câu đếm chỉ đọc** (`docs/superpowers/specs/2026-10-18-so-dai-ly-dot-2/cau-dem-chi-doc.sql`, mười câu; AI không chạy `--remote`). Đứng ở thư mục gốc của dự án, chạy cả tệp một lần (mỗi câu một dòng `SELECT`; câu (sau) chạy lúc này ra 0 là đúng):

```
grep -v '^--' docs/superpowers/specs/2026-10-18-so-dai-ly-dot-2/cau-dem-chi-doc.sql | grep -v '^$' | while read -r c; do echo "== $c" | cut -c1-90; CI=1 npx wrangler d1 execute tourdao-sales-db --remote --command "$c" </dev/null; done
```

Dán kết quả vào bảng «Kết quả câu đếm của chủ» của sổ thi công. Đọc kết quả:
- **(lai) phải bằng 0.** Khác 0 ⇒ DỪNG, báo: «Chụp bù» không phủ đơn lai, đơn sẽ kẹt «Đã giao» (`BL-SDL2-DON-LAI`).
- **(b1 không có điều khoản ALL phủ ngày xác nhận) phải bằng 0.** Khác 0 ⇒ DỪNG, báo: `0113` bỏ IM LẶNG các đơn đó nên sau phát hành câu (sau) sẽ nhỏ hơn (b1). Cách gỡ: thêm dòng điều khoản «mọi dịch vụ» của công ty chủ phủ ngày xác nhận của các đơn đó (màn «Người bán dịch vụ»; chưa kiểm màn có nhận ngày bắt đầu trong quá khứ không), đếm lại; hoặc sau phát hành Kế toán bấm «Chụp bù» từng đơn (cũng cần điều khoản phủ ngày đó, không thì 409 thiếu người bán).
- **(b1 xác nhận trước điều khoản ALL sớm nhất) nên bằng 0.** Khác 0 ⇒ báo, không chặn: bản chụp bù ghi ngày chụp = ngày bắt đầu điều khoản (Ruling R-50), người bán và hoa hồng không đổi.
- **(b1) = 0** ⇒ có thể bỏ `0113` lúc gộp (Ruling R-P5) — khuyến nghị GIỮ (câu `INSERT … SELECT` rỗng vô hại; bỏ tệp phải sửa cùng lúc các bài B1–B5 của `src/chup-bu.test.ts`). Ghi lại số dòng dịch vụ của (b1) cho bước 4.
- **(a), (b1x), (b2), (b3), (e)** là việc của Kế toán sau phát hành (mục 5), không chặn.

**2b. Nhánh đang SAU `main`** (kiểm 18:25: `main` có thêm ~29 commit, gồm nhật ký 2.22, 2.23 và `0115`): điều phối gộp `main` vào nhánh TRƯỚC `day-len` — chắc chắn xung đột ở `src/shared/changelog.ts` (hai bên cùng thêm mục đầu; mục nhánh này giữ số 2.24 nếu `main` vẫn dừng ở 2.23) và `src/shared/app-info.test.ts`; sau khi gộp chạy lại `npm test`, `npm run typecheck` và kiểm lại số migration như bước 1.

**3. Phát hành:** `npm run day-len -- claude/objective-euclid-1c8113` rồi `npm run trien-khai` (có migration ⇒ trien-khai tự lấy điểm Time Travel TRƯỚC khi áp — chép lại lệnh khôi phục nó in ra; e2e đủ bộ chạy trước). Theo `docs/QUY-TRINH-PHAT-HANH.md`; gặp lỗi Cloudflare 7403 thì xem mục cùng tên ở đó.

**4. Ngay sau `wrangler deploy`:**
1. Chạy câu (sau) (dòng cuối của tệp câu đếm): số bản chụp `he-thong:0113` PHẢI bằng số dòng dịch vụ của (b1) ở bước 2. Lệch ⇒ dừng, báo (đọc lại (b1 không có điều khoản ALL …)).
2. `node scripts/audit-invariants.mjs --db remote` (trien-khai đã chạy một lần; chạy lại SAU câu (sau)). Thoát 0 = sạch, 1 = vi phạm, **2 = không chạy được** (không phải sạch). Cảnh báo dự kiến, không chặn: `R-BIL-5w` (gần như mọi đơn «Đã giao» lượt 1 — `BL-SDL2-R-BIL-5W-ON`), `R-BIL-2w`, `R-ORD-DC1w`, `R-BIL-19w`. Lỗi (từ mốc `0112`) phải bằng 0.

**5. Việc của Kế toán sau phát hành** (danh sách từ câu đếm): (b2) cài mức rồi bấm «Chụp bù» (trang «Chụp bù mức», menu Thiết lập); (b3) ghi mức tay từng dòng thiếu; (e) đơn khách lẻ có dòng nhập tay — ghi tay «Tour Đảo bán» cho dòng đó (đã duyệt, A-14); (b1x) danh sách mã đơn + mã dịch vụ — sau khi đơn «Đã giao», bổ sung giá vốn bằng điều chỉnh có duyệt (loại «Giá vốn nhà cung cấp»); (a) đơn đã giao có dòng nhà cung cấp — bổ sung giá vốn tương tự (`R-BIL-2w` liệt kê). Ca vàng C-1…C-5 còn chờ Kế toán xác nhận (`golden/so-cong-no-luot-2.json`).

**6. Đường lùi.** `wrangler rollback` chỉ lùi Worker, **KHÔNG gỡ trigger của `0112`** (và không gỡ bản chụp `0113` đã ghi — vô hại với bản cũ). Khi `0112` đã áp mà Worker chạy bản cũ (sau rollback, hoặc vài giây giữa migration và deploy): «Đã giao» trả **500 chưa dịch** (lỗi `delivered_terms:`) cho (i) đơn có dòng nhập tay chưa ai ghi tay người bán (A-14) và (ii) đơn xác nhận trước `0090` chưa có bản chụp mà `0113` không chụp bù; dữ liệu không hỏng (cả lô huỷ) — nợ đường lùi của Task 2 (sổ thi công, Nợ Task 2). Phiếu «Đã giao» Worker cũ ghi không có `gross_snapshot` ⇒ kiểm định kỳ `R-BIL-17` báo LỖI cho các phiếu đó (đúng nghĩa, ghi lại mã đơn). Gỡ: một **migration MỚI** `DROP TRIGGER bil_posting_delivered_terms;` (số kế tiếp trên mọi nhánh), chủ áp bằng `wrangler d1 migrations apply --remote`; **không sửa tệp `0112` đã áp**. Khôi phục Time Travel về điểm của bước 3 lùi cả dữ liệu lẫn bảng `d1_migrations` và MẤT mọi ghi sau điểm đó — chỉ khi dữ liệu hỏng, và lùi Worker cùng lúc.

## Lần phát hành có xoá dữ liệu (ADR-0126 — Gói 2 lát H-5; migration `0108`) — ĐÃ áp trên production (bản 2.16) — RUNBOOK

**Trạng thái: migration `0108` ĐÃ áp trên production** (kiểm `d1 migrations list --remote` ngày 18/10/2026 → "No migrations to apply!"; cùng lần phát hành bản 2.16 với `0103`–`0105`, `0107` — xem mục «TRẠNG THÁI TRIỂN KHAI — Phiên bản 2.16» ngay dưới). **Việc 5 và việc 6 bên dưới CHƯA làm (chưa có bằng chứng nào đã làm) và PHẢI làm trước lần bấm «Thực hiện» xoá dữ liệu đầu tiên trên production.** Đừng khẳng định trạng thái production từ mục này — kiểm bằng `wrangler d1 migrations list … --remote` và `GET /api/auth/config`.

- **Migration:** `0108_xoa_an_danh.sql` áp SAU `0103`–`0107` (`0106` là vé hỗ trợ đợt 2a, đã ở `main`; `0107` là H-4; `0109`, `0110` của sổ vàng vận chuyển cũng đã ở `main`). Lúc phát hành kiểm số lại: `ls migrations` rồi `git ls-tree --name-only <nhánh> migrations/` cho mọi nhánh chưa gộp (CLAUDE.md §10). `0108` TẠO LẠI bốn trigger chặn sửa của giấy tờ / phiếu tự khai (DROP rồi CREATE) — vô hại khi bảng rỗng hay có dữ liệu; không gieo chính sách, không gieo con số thời hạn.
- **Không cần lệnh Cloudflare mới:** kho `HO_SO` đã có từ H-2. Quy trình chung vẫn là `npm run trien-khai` sau `day-len`.
- **Nhật ký thay đổi:** các mục 2.12–2.16 của nhánh này (2.12 H0/H1, 2.13 H2, 2.14 H3, 2.15 H4, 2.16 H5) đã lên production nguyên số, không đánh số lại (`GET /api/auth/config` → `"version":"2.16"`, kiểm 18/10/2026).

**Việc của chủ / kiểm trước phát hành:**
1. **Không đăng chính sách riêng tư trên production trước khi luật sư duyệt chữ VÀ bản này đã lên.** (Điều kiện Q1 cập nhật: phần «bản dựng có đường xoá» nay là hàng rào máy — cổng phát hành `src/cong-phat-hanh-anh-tu-khai.test.ts`; phần luật sư duyệt chữ và con số ngày vẫn dựa vào kỷ luật.) Hai ô số ngày (`hanXuLyXoaNgay`, `hanGiuPhienNgay`) để TRỐNG cho tới khi luật sư xác nhận; **đăng bản mới thì mọi người phải đồng ý lại, và quên nhập số ở bản mới làm phiếu gửi sau mất hạn** (bản mới nhất thắng — Q2).
2. Gửi luật sư bộ câu Q1 (xem `docs/BACKLOG.md` mục 40, `BL-XOA-CAU-HOI-LUAT-SU`).
3. Duyệt ảnh giao diện ở `docs/evidence/2026-10-17-xoa-an-danh/anh/`.
4. Trả lời Q2–Q6.
5. **Kiểm trên D1 local của `wrangler dev` hoặc e2e (`npm run test:e2e -- xoa-an-danh`) trước khi tin cơ chế huỷ lô:** khi «Thực hiện» thua cuộc đua với «Rút» của người dùng, câu `erasure_batch_abort_if_lost` phải làm D1 HUỶ CẢ LÔ (kể cả câu xoá IP / trình duyệt của auth) và route trả 409 `erasure_not_pending`. Khung thử giả D1 bằng SQLite nên cơ chế này, thứ tự trigger cùng sự kiện và `ROW_NUMBER()` trên D1 thật **CHƯA kiểm** (e2e hôm nay chỉ phủ nhánh thắng).
6. **Id giấy tờ production dài hơn 37 ký tự thì CHECK của dấu ẩn danh chặn ẩn danh** — chưa xem dữ liệu thật; chạy một câu SELECT chỉ-đọc `SELECT max(length(id)) FROM pty_person_document` trên production trước khi bấm «Thực hiện» đầu tiên.
7. Đặc tả diễn tập khôi phục (HC-5.19, hạn 2026-11-05) thêm bước: sau khôi phục D1, liệt kê kho `HO_SO` tiền tố `xoa/` (lệnh chỉ đọc, chủ chạy) và so với `pty_erasure_request`: phiếu có trong kho mà D1 còn `CHO_XU_LY` ⇒ bấm «Thực hiện» lại; phiếu không còn dòng trong D1 ⇒ ghi lại mã hồ sơ, chờ công cụ (`BL-XOA-KHOI-PHUC`).
8. Việc ẩn danh phiên cũ (trang Phiên) chỉ chạy khi chính sách có số ngày giữ phiên; chưa có số thì nút tắt / 409 `chua_co_thoi_han`.

Nợ kỹ thuật của lát này: `docs/BACKLOG.md` mục 40 (mã `BL-XOA-…`). Ghi rõ **dựa vào kỷ luật** (chưa có hàng rào máy): câu ẩn danh sổ phiên của auth không có lính gác phiếu riêng (chỉ nhờ câu chặn lô), chạy lại phiếu sau khôi phục D1.

**Hoàn tác (viết 18/10/2026 sau khi `0108` đã áp; đọc `migrations/0108_xoa_an_danh.sql`):** `0108` THÊM bốn cột rỗng được, không DEFAULT (`pty_person_document.erased_at` dòng 9, `pty_self_submission.erased_at` dòng 106, `pty_privacy_policy.erasure_days` dòng 144 và `session_retention_days` dòng 145), bảng `pty_erasure_request` cùng trigger (dòng 72–103), và TẠO LẠI bốn trigger cùng tên (`DROP TRIGGER` ở dòng 10, 15, 107, 116). Không có `DROP TABLE`, không đổi tên cột. Nên `wrangler rollback` về 2.11 không phá cấu trúc; chỉ ba trigger chạm đường ghi mà mã 2.11 còn làm:
- `pty_person_document_next_ins` (dòng 38–41) chặn chèn dòng gia hạn khi đã có dòng gia hạn còn sống — cùng điều kiện với chỉ mục duy nhất có sẵn, chữ lỗi cố ý giữ «UNIQUE constraint failed». SUY LUẬN: mã 2.11 xử lý lỗi này như cũ (chưa chạy thử).
- `pty_person_document_no_replace` (dòng 35–37) chỉ chặn id trùng. Đã tra: không có `INSERT OR REPLACE` ở `src/modules/parties` và `src/modules/audit` tại commit `01695a3c` (bản 2.11); SUY LUẬN là mã 2.11 luôn dùng id mới.
- `pty_party_merge_erasure` (dòng 148–151) chặn gộp hồ sơ đang có phiếu `CHO_XU_LY` / `DA_THUC_HIEN`. Câu gộp của mã 2.11 (`src/modules/parties/repository.ts:822` tại `01695a3c`) sẽ gặp lỗi ABORT nếu có phiếu như vậy. **CHƯA kiểm** production có phiếu nào chưa; SUY LUẬN là chưa vì chính sách riêng tư chưa được đăng (điều kiện Q1, dựa vào kỷ luật).
- **Điều Worker lùi KHÔNG lấy lại được:** dữ liệu đã bị «Thực hiện» ẩn danh (giấy tờ, phiếu tự khai, thông tin phiên). Chỉ khôi phục Time Travel về trước lần «Thực hiện» mới lấy lại — và mất mọi ghi sau điểm đó. Đó là lý do việc 5 và 6 phải xong TRƯỚC lần «Thực hiện» đầu tiên.
- **Khôi phục Time Travel** lùi cả dữ liệu lẫn bảng `d1_migrations`, nên phải lùi Worker về 2.11 cùng lúc; lệnh và điểm của bản 2.16 ở mục «Phiên bản 2.16» bên dưới. Muốn lùi sau này thì lấy điểm MỚI bằng `wrangler d1 time-travel info` trước, đừng dùng điểm của 17/10.

## TRẠNG THÁI TRIỂN KHAI — Phiên bản 2.19 ĐÃ LÊN PRODUCTION (rà soát ngôn ngữ giao diện lượt 1 + lượt 2 — ADR-0130: bảng từ giao diện, bảy tên chủ chọn 18/10, hai lỗi nút thẻ Thanh toán, ô hạn chốt của Toàn quyền nhập phút; kèm ADR-0131 đã có trên main) — migration `0111_ten_luat_chuyen_khach` đã áp — triển khai 2026-10-19 08:55 giờ VN

Ghi 19/10/2026 từ khối tóm tắt cuối của `npm run trien-khai` (chủ chạy trong Terminal), kiểm lại bằng lệnh chỉ đọc ngay sau đó.

- **Commit:** `38e4921c` (nhánh `claude/optimistic-wu-2c3796`, gộp bằng `day-len`).
- **Worker:** `411bf191-e5d9-49bd-807f-27a94b6be276` (tạo 2026-10-19T01:55:34Z; `wrangler deployments list`). Bản ngay trước: `bb8ed840-a13e-4d80-a367-e67789eea3f4` (tạo 2026-10-18T22:20:57Z — SUY LUẬN là bản 2.18 ADR-0131, chưa có mục trạng thái riêng trong tệp này).
- **Migration:** `0111_ten_luat_chuyen_khach.sql` (chỉ đổi cột `label` hai dòng `vc_transfer_rule`); `d1 migrations list --remote` → "No migrations to apply!". Điểm khôi phục Time Travel trước khi áp: `00001450-00000000-00005109-8f03a8fdb63f8c5d790a5ac414b42448`.
- **Kiểm:** e2e xanh; `audit-invariants --db remote` ĐẠT (5 cảnh báo không chặn: R-ORD-9 1, R-CTL-1 5, R-ORD-T1w 42…); cổng phiên bản trước và sau deploy ĐẠT; `kiem-phien-ban.mjs --sau-deploy` chạy lại 19/10 → ĐẠT 2.19. Người kiểm độc lập (chỉ đọc) ĐẠT cho `0111`, ô hạn chốt phút và lần nhập main.
- **Hoàn tác:** `0111` chỉ đổi chữ nhãn (mã luật không đổi, `vc_transfer_check` lưu mã, không lưu chữ) — lùi Worker về `bb8ed840` không cần lùi dữ liệu; nhãn mới vẫn hiển thị đúng ở mã cũ. Muốn lấy lại chữ cũ: migration mới đổi ngược (chữ cũ ghi ở đầu tệp `0111`).
- **Còn treo:** BACKLOG §42 (nút huỷ khoản thu trên dòng trả lại / đơn huỷ — chủ duyệt sau). Kịch bản Chrome `chinh-sach-dieu-phoi-smoke` và `moc-chua-co-smoke` đỏ sẵn (menu 15/10, ô mới chưa điền), không do lần này.

## TRẠNG THÁI TRIỂN KHAI — Phiên bản 2.17 ĐÃ LÊN PRODUCTION (tin «giao đơn» gửi người đang phụ trách đọc «… cho bạn phụ trách», cả chuông lẫn màn hình khoá — B-01 của đợt rà soát trước launch 17/10; không migration) — triển khai 2026-10-18 08:45 giờ VN

Ghi 18/10/2026 bằng lệnh CHỈ ĐỌC sau khi chủ chạy `day-len` rồi `trien-khai` trong Terminal. Khối tóm tắt cuối của `trien-khai` chưa được dán, nên dòng nào không kiểm lại được bằng lệnh thì ghi «chưa biết». Đừng khẳng định trạng thái production từ mục này — kiểm bằng lệnh.

- **Commit:** `cae61729` (= `origin/main`, `git fetch` 18/10 08:48). Gói sửa gồm `4679ec27` (câu tin + bài kiểm + nhật ký 2.17), `8a29155e` (mục 2.16 + hướng dẫn chủ `docs/superpowers/plans/2026-10-18-goi-sua-truoc-launch.md`), `cae61729` (vòng sửa sau kiểm độc lập).
- **Worker:** `66bac833-202c-4385-bff4-a62b16f353b0` (tạo 2026-10-18T01:45:55Z, lên 100% lúc 01:45:57Z; `wrangler deployments list`). Bản lùi = 2.16: `92e97b46-885f-41b6-9a00-ce77d84ed343`. `GET /api/auth/config` 08:48 → `"version":"2.17"`.
- **Migration:** không có; `d1 migrations list --remote` → "No migrations to apply!". Vì không có migration nên `trien-khai` không lấy điểm khôi phục Time Travel (bước 4 của `scripts/release-lib.mjs` chỉ lấy khi có migration chờ).
- **Kiểm trước phát hành:** `npm test` 5.590 bài, 5.589 đạt, 0 đỏ, 1 todo; `typecheck` 0 lỗi (18/10, trên `cae61729`); người kiểm độc lập hai vòng ĐẠT (vòng 1 nêu F-1…F-6, vòng 2 xác nhận đã sửa, có phá thử). e2e, `audit-invariants --db remote`, cổng phiên bản sau deploy: chưa biết (thiếu khối tóm tắt); bằng chứng gián tiếp duy nhất là production báo 2.17 khớp mục đầu `changelog.ts`.
- **Sự cố khi gộp (nguyên nhân CHƯA rõ):** hai lần chủ chạy `day-len` (06:06 và khoảng 08:00), bộ kiểm chính in tổng kết xanh (5.590 / 0 đỏ) rồi đứng, không sang «Bước 2/2», chủ phải Ctrl+C. AI chạy lại `node scripts/chay-test.mjs` gắn màn hình giả (`script -q`) 08:08–08:16 thì thoát bình thường; không còn tiến trình mồ côi để lần. Lần khoảng 08:00 trùng hai lượt kiểm của một phiên chạy nền khác (worktree `tao-don-thiet-ke-lai`, dùng chung `node_modules` của checkout gốc). Lần chạy sau đó, lúc máy không có lượt kiểm nào khác, thì qua. Gặp lại: đừng Ctrl+C, xem `pgrep -fl "node --test"` và các tiến trình con / đường ống còn mở.
- **Bảo trì đang TẮT** (`GET /api/auth/config` → `maintenance.on: false`, đã tắt trước 07:53 ngày 18/10, sớm hơn giờ hẹn 07:17 ngày 19/10 — có người giữ Toàn quyền bấm tắt; AI không đọc được nhật ký để biết ai).
- **Chưa kiểm:** câu mới trên production (cách kiểm: giao một đơn cho một tài khoản hướng dẫn viên, xem chuông và màn hình khoá của người đó); kịch bản Chrome; iPhone thật.
- **Hoàn tác:** chỉ đổi chữ, không migration → lùi Worker về 2.16 an toàn (mất câu sửa, dữ liệu không đổi). Chủ tự chạy ở thư mục `tourdao-sales`, **KHÔNG chạy nếu không có sự cố**: `npx wrangler rollback 92e97b46-885f-41b6-9a00-ce77d84ed343`, rồi kiểm `GET /api/auth/config` → `"version":"2.16"`.

## TRẠNG THÁI TRIỂN KHAI (cũ) — Phiên bản 2.16 ĐÃ LÊN PRODUCTION (Gói 2 hồ sơ riêng tư, các lát H-0…H-5 gộp: danh mục dữ liệu cá nhân và hồ sơ mở rộng (ngày sinh, địa chỉ cá nhân, giấy tờ tổ chức) — ADR-0122; kho ảnh giấy tờ — ADR-0123; trang «Hồ sơ của tôi» và chính sách riêng tư — ADR-0124; Hàng chờ xác minh — ADR-0125; yêu cầu xoá dữ liệu cá nhân và ẩn danh hoá — ADR-0126; mục nhật ký 2.12–2.16) — migration `0103_ho_so_mo_rong`, `0104_ho_so_tep`, `0105_ho_so_tu_khai`, `0107_xac_minh_ho_so`, `0108_xoa_an_danh` đã áp (khoảng 2026-10-17 22:16 giờ VN, theo giờ tạo bản Worker)

Hồ sơ này viết ngày 18/10/2026 bằng lệnh CHỈ ĐỌC sau khi chủ đã tự chạy `day-len` rồi `trien-khai` trong Terminal. **Khối tóm tắt cuối của `trien-khai` KHÔNG còn** (không lưu tệp), nên mọi dòng dưới đây hoặc được kiểm lại bằng lệnh chỉ đọc, hoặc ghi «SUY LUẬN» / «CHƯA KIỂM». Đừng khẳng định trạng thái production từ mục này — kiểm bằng lệnh.

- **Commit:** `0780d014` (= `main` = `origin/main` ngày 18/10; reflog `main` ghi gộp nhánh `worktree-ho-so-rieng-tu-2fa` kiểu Fast-forward lúc 21:55:12 giờ VN = 14:55Z, và không có lần di chuyển `main` nào sau đó). SUY LUẬN rằng đây đúng là commit đã triển khai: `trien-khai` đòi `main` == `origin/main`, và `main` không đổi từ 14:55Z tới nay.
- **Worker:** `92e97b46-885f-41b6-9a00-ce77d84ed343` (tạo 2026-10-17T15:16:25Z, đưa lên 100% lúc 15:16:27Z; `wrangler deployments list` ngày 18/10, là bản cuối danh sách). Bản ngay trước đó = bản 2.11: `3bc7af8e-a1cd-48d3-a6de-b0b961dccf68` (13:58Z). `GET /api/auth/config` ngày 18/10 → `"version":"2.16"`.
- **Migration đã áp:** `0103`, `0104`, `0105`, `0107`, `0108`. Cách suy ra: `ls migrations` có đúng các tệp này mới hơn `0102`; tệp nào vào `main` sau `01695a3c` (commit đã triển khai ở 2.11) và chưa có ở bản 2.11 là đúng năm tệp trên (lịch sử git của thư mục `migrations`); `0106`, `0109`, `0110` đã áp ở 2.10 / 2.11. `d1 migrations list tourdao-sales-db --remote` ngày 18/10 → "No migrations to apply!" (nghĩa là mọi tệp trong `migrations/` đã áp; KHÔNG cho biết áp lúc nào). SUY LUẬN: cả năm áp trong lần `trien-khai` dẫn tới bản Worker `92e97b46`, ngay trước 15:16Z.
- **Điểm khôi phục Time Travel (LẤY THEO GIỜ bằng lệnh chỉ đọc ngày 18/10, KHÔNG phải khối tóm tắt của `trien-khai`):** `wrangler d1 time-travel info tourdao-sales-db --timestamp=2026-10-17T14:55:00Z --json` → `000012fd-00000002-00005107-51c8c68f2fa9f11bbe73e1c8b313b6ef`. Chọn 14:55Z vì là lúc `main` vừa nhận bản này, `trien-khai` không thể áp migration trước đó, và còn mất cỡ 16 phút test + e2e trước khi áp (đọc `scripts/release-lib.mjs` bước 4: bookmark thật lấy NGAY TRƯỚC khi áp migration). Điểm này sau lúc áp `0109`/`0110` của 2.11 (13:58Z) nên giữ nguyên cấu trúc 2.11. Nó CÓ THỂ cũ hơn điểm thật vài phút: lùi về đây mất mọi ghi từ 14:55Z tới nay. **Khối tóm tắt thật của `trien-khai` (bookmark thật, Worker Version ID, e2e, kiểm dữ liệu): chủ dán vào đây nếu còn giữ:** ______
- **e2e và kiểm dữ liệu sau deploy** (`audit-invariants --db remote`, cổng phiên bản sau deploy): chưa biết — thiếu khối tóm tắt. Bằng chứng gián tiếp duy nhất: `GET /api/auth/config` báo 2.16 (khớp mục đầu `changelog.ts`). Kịch bản Chrome và iPhone thật: CHƯA kiểm. Kho R2 `tourdao-sales-ho-so` của `0104`: CHƯA kiểm đã tạo (SUY LUẬN là có, vì cổng 1e của `trien-khai` dừng nếu thiếu và Worker đã lên).
- **Kiểm trước phát hành** (đợt rà soát độc lập 17/10, cây ở commit `275c9faf`, mã giống `0780d014`; `275c9faf` chỉ thêm tài liệu, sơ đồ kiến trúc và một bài kiểm — `git diff --stat 0780d014 275c9faf`): `npm run typecheck` 0 lỗi; `npm test` 5.587 bài, 5.586 đạt, 0 đỏ, 1 bài todo. Số liệu này lấy từ báo cáo của vai Vận hành (E) trong đợt rà 17/10 — báo cáo gốc nằm trong phiên làm việc, không có trong repo; hồ sơ `docs/superpowers/specs/2026-10-17-ket-qua-ra-soat-truoc-launch.md` chỉ ghi «bộ kiểm xanh». KHÔNG tự chạy lại trên đúng commit này ngày 18/10 (lần chạy 18/10 là trên nhánh đã có thêm bản sửa câu giao đơn, sau vòng sửa kiểm độc lập: 5.590 bài, 5.589 đạt, 0 đỏ, 1 todo; typecheck 0 lỗi).
- **Bảo trì đang BẬT** (`GET /api/auth/config` ngày 18/10 → `maintenance.on: true`, `endsAt: 2026-10-19T00:17:00.000Z` = 07:17 sáng 19/10 giờ VN): sẽ tự tắt lúc đó; nhân viên ngoài danh sách cho phép chưa vào được. Chủ xác nhận có chủ ý hay không.
- **Việc của chủ còn lại:** (1) chưa đăng chính sách riêng tư (điều kiện Q1, dựa vào kỷ luật — xem runbook `0105` và `0108` ở trên/dưới); (2) việc 5 và 6 của runbook `0108` CHƯA làm; (3) kiểm trên production mục «Sau deploy» của từng runbook `0103`–`0108` nếu muốn.
- **Hoàn tác** (đọc trực tiếp `migrations/0103*.sql` … `0108*.sql` ngày 18/10):
  - **(a) `wrangler rollback` về 2.11 (`3bc7af8e`)** — mã 2.11 chạy trên cấu trúc đã có `0103`–`0108`. Đã kiểm trong tệp: không có `DROP TABLE`, không đổi tên (`RENAME`), mọi `ALTER TABLE` là `ADD COLUMN` rỗng được (`0103_ho_so_mo_rong.sql:7`, `0108_xoa_an_danh.sql:9,106,144,145`); `0104`, `0105` chỉ thêm bảng / trigger; `0107_xac_minh_ho_so.sql` chỉ thêm chỉ mục `idx_audit_target` (dòng 7), view `v_aud_cham_tai_khoan` (dòng 9) và một trigger trên bảng phiếu mới (dòng 22–24). Chỗ DUY NHẤT xoá thứ có sẵn: `DROP TRIGGER` rồi tạo lại cùng tên ở `0108_xoa_an_danh.sql:10,15,107,116`. Trigger có thể chặn câu ghi mà mã 2.11 vẫn làm: (i) `0103_ho_so_mo_rong.sql:11–16` chặn ghi liên hệ loại `ADDRESS` cho hồ sơ không phải cá nhân — mã 2.11 không biết loại này nên không ghi; (ii) `0108_xoa_an_danh.sql:35–41` (`no_replace`, `next_ins`) trên `pty_person_document`; (iii) `0108_xoa_an_danh.sql:148–151` chặn gộp hồ sơ có phiếu xoá. Câu chèn của mã 2.11 ở `repository.ts:574` và `:807` (tại `01695a3c`) khai tên cột đầy đủ nên cột mới không làm vỡ. Kết luận: **không thấy trigger nào chặn đường ghi thường ngày của 2.11**. Còn là SUY LUẬN (chưa chạy mã 2.11 trên D1 đã lên cấu trúc mới): (1) mã 2.11 có thể không hiểu dòng liên hệ `ADDRESS` đã có sẵn khi liệt kê (hiển thị lạ hoặc lỗi); (2) lỗi của `next_ins` được mã 2.11 xử lý như lỗi chỉ mục duy nhất cũ; (3) có phiếu xoá thì gộp hồ sơ lỗi. Rollback Worker không xoá dữ liệu mới (ngày sinh, địa chỉ, phiếu, đồng ý, ảnh trong R2); chúng nằm im trong D1 / kho. Ngoài ra bản 2.11 có binding riêng của nó; nếu `wrangler.jsonc` ở 2.16 thêm binding (kho `HO_SO`) thì bản 2.11 đơn giản không dùng — SUY LUẬN, chưa đọc cấu hình của `3bc7af8e`.
  - **(b) Khôi phục Time Travel** lùi TOÀN BỘ dữ liệu lẫn cấu trúc về mốc đó: mất mọi ghi sau mốc (kể cả đơn, tài khoản, nhật ký, phiếu mới), và bảng `d1_migrations` cũng lùi (năm migration trên thành «chưa áp»). Vì vậy PHẢI lùi Worker về 2.11 cùng lúc (không để mã 2.16 chạy trên cấu trúc cũ). Lệnh để chủ tự chạy ở Terminal, đứng ở thư mục `tourdao-sales` (AI không chạy — `CLAUDE.md` §8), **KHÔNG chạy nếu không có sự cố**:
    ```
    npx wrangler d1 time-travel restore tourdao-sales-db --bookmark=000012fd-00000002-00005107-51c8c68f2fa9f11bbe73e1c8b313b6ef
    ```
    Trước khi chạy: lấy điểm mới nhất bằng `npx wrangler d1 time-travel info tourdao-sales-db` (điểm trên cũ ngày 17/10 — lùi về nó mất mọi ghi từ 14:55Z); sau đó lùi Worker bằng `npx wrangler rollback 3bc7af8e-a1cd-48d3-a6de-b0b961dccf68`; đối chiếu `GET /api/auth/config` → `"version":"2.11"` và `d1 migrations list --remote` báo đúng năm migration chờ. Nhớ: cửa sổ đóng băng ở phần «Hoàn tác» bên dưới.

## TRẠNG THÁI TRIỂN KHAI (cũ) — Phiên bản 2.11 ĐÃ LÊN PRODUCTION (sổ vàng vận chuyển: ADR-0128 — mốc ra lệnh do Quản trị đặt, xe riêng không ai ghép thêm khách, thêm khách thiếu chỗ thì không thêm ghế nào; ADR-0129 — tài xế công ty lái được xe nhà xe thuê kèm cảnh báo, vẫn chặn vượt số chỗ) — migration `0109_cho_phep_tai_xe_cong_ty_lai_xe_thue`, `0110_dieu_kien_chuyen_khach_xe_rieng` đã áp (2026-10-17 20:58 giờ VN)

Chủ chạy `day-len` rồi `trien-khai`; lần `trien-khai` đầu dừng ở bước áp migration vì lỗi Cloudflare 7403 (chưa ghi gì — kiểm bằng `d1 migrations list --remote`), chạy lại thì qua. AI kiểm lại bằng lệnh chỉ đọc:

- **Commit:** `01695a3c` (= `main` = `origin/main` lúc triển khai). Điểm khôi phục Time Travel trước khi áp: `000012f4-00000000-00005107-0960b14d3b5d4f2a4297a4cb12326f65`.
- **Worker:** `3bc7af8e-a1cd-48d3-a6de-b0b961dccf68`. `d1 migrations list --remote` → "No migrations to apply!"; `GET /api/auth/config` → `version` "2.11".
- **Theo khối `trien-khai`:** e2e đủ bộ xanh, `audit-invariants --db remote` ĐẠT (4 cảnh báo cũ: R-CTL-1, R-ORD-T1w), cổng phiên bản trước và sau deploy ĐẠT.
- **Kiểm trước phát hành:** `npm test` 5199 đạt / 0 đỏ; ba lượt người kiểm độc lập (ADR-0128, ADR-0129, bản sửa 0110) đều ĐẠT.
- **Lúc triển khai chế độ bảo trì đang BẬT** (tới 2026-10-19 00:17 UTC) — chủ xác nhận có chủ ý hay không.
- **Việc chủ sau triển khai:** Quản trị / Toàn quyền vào Vận chuyển › Chính sách điều phối đặt mốc 0,5 giờ (30 phút) — mốc KHÔNG gieo bằng migration, tới lúc đặt vẫn là 6 giờ. Hỏi nhà xe: bảo hiểm xe thuê có bao tài xế công ty không (ADR-0129 Q4, CHƯA BIẾT).
- **Chưa kiểm:** kịch bản Chrome trang Chính sách điều phối; chuyến cũ đã phá lệ xe riêng trên production (đếm bằng lệnh chỉ đọc nếu cần).
- **Hoàn tác:** 0109 dựng lại hai trigger LC-13 (nới một chiều), 0110 chỉ THÊM một dòng `vc_transfer_rule`. `wrangler rollback` về 2.10: mã cũ không biết điều kiện `XE_RIENG_DICH` → nhờ chuyển khách bị trigger chặn (409) tới khi lên lại 2.11; muốn lùi hẳn thì khôi phục Time Travel (mất mọi ghi sau điểm trên).

## TRẠNG THÁI TRIỂN KHAI (cũ) — Phiên bản 2.10 ĐÃ LÊN PRODUCTION (Vé hỗ trợ đợt 2a, ADR-0127: khung trò chuyện tự làm mới, mức ưu tiên Thường/Cao/Khẩn, đơn liên quan, Trưởng nhóm «Giao cho người khác») — migration `0106_ve_ho_tro_2a` đã áp (2026-10-17 12:25 giờ VN)

Chủ chạy `day-len` rồi `trien-khai` (lần đầu gõ nhầm thư mục — phải đứng ở thư mục gốc, nhánh `main`); AI kiểm lại bằng lệnh chỉ đọc:

- **Commit:** `99d8cadb` (= `main` = `origin/main` lúc triển khai). Điểm khôi phục Time Travel trước khi áp: `000012ba-00000000-00005107-a11b7cfc7a7477de132b9902dccfa64f`.
- **Worker:** `f8b6d338-c99c-456a-b4d4-9a0535d0b700`. `d1 migrations list --remote` → "No migrations to apply!"; `GET /` → 200; gói `feedback.js` trên production có đường `my-orders`; `GET /api/feedback/my-orders` khi chưa đăng nhập → 401.
- **Theo khối `trien-khai`:** e2e đủ bộ xanh, `audit-invariants --db remote` ĐẠT (4 cảnh báo cũ: R-CTL-1 nhóm dịch vụ, R-ORD-T1w đơn cũ chờ chụp bù), cổng phiên bản trước và sau deploy ĐẠT (production đúng bản 2.10).
- **Kiểm trước phát hành:** `npm test` 5183 bài đạt / 0 đỏ; mỗi việc và cả nhánh có người kiểm độc lập (chỉ đọc), không còn lỗi nặng.
- **Chưa kiểm:** xem vé thật trên production bằng hai tài khoản (tin mới tự hiện sau vài giây); iPhone thật; trạng thái chế độ bảo trì lúc triển khai (AI không đọc).
- **Số hiệu:** ADR-0127 ghi dự kiến migration `0104`, số thật là `0106` (ADR đã duyệt, không sửa; lệch ghi ở `docs/superpowers/plans/2026-10-16-ve-ho-tro-dot-2a-thi-cong-nhat-ky.md`). Nhánh hồ sơ riêng tư (`worktree-ho-so-rieng-tu-2fa`) giữ 0104, 0105, 0107.
- **Việc chờ chủ quyết:** danh sách chọn đơn có cả đơn nháp / đã huỷ; phiếu cũ lỡ giao cho tài khoản bên ngoài (vá `nguoiGiuHopLe`, đụng luật R6); chuyển nhóm có đặt lại mức ưu tiên không — xem `docs/BACKLOG.md` (BL-VE-*).
- **Hoàn tác:** migration 0106 chỉ THÊM ba cột ở `fbk_ticket`; `wrangler rollback` đưa Worker về bản trước, mã cũ chạy bình thường trên cấu trúc mới.

## TRẠNG THÁI TRIỂN KHAI (cũ) — Phiên bản 2.2 ĐÃ LÊN PRODUCTION (ADR-0120, đổi từ 0118: khoản chuyển khoản «Công ty thu» không tạo nợ người khai, «đang đối chiếu», chặn Đã giao, nhắc Kế toán sau 3 ngày; Kế toán duyệt chuyển tiền thu trước sang đơn khác; chữ «cọc» → «Thu trước»; 54 ca sổ vàng đã xác nhận) — migration `0099_bil_doi_chieu_khoan_cong_ty_thu` đã áp (2026-10-15 19:28 giờ VN)

Chủ chạy `day-len` rồi `trien-khai` (lần đầu dừng vì `main` có commit mới, hai lần dừng ở bài đo giờ của hàng rào do máy bận, lần ba qua); AI kiểm lại bằng lệnh chỉ đọc:

- **Commit:** `20103d40` (= `main` = `origin/main`). Điểm khôi phục Time Travel trước khi áp: `0000114c-00000000-00005105-0ea2cb110842df173bfb71ccf3221f25`.
- **Worker:** `4cfc8ced-bc28-425f-acb4-93a8631f8f53` (100%). `GET /api/auth/config` → `"version":"2.2"`; `d1 migrations list --remote` → "No migrations to apply!".
- **Theo khối `trien-khai`:** e2e xanh, `audit-invariants --db remote` ĐẠT (4 cảnh báo cũ: R-CTL-1 nhóm dịch vụ, R-ORD-T1w đơn cũ chờ chụp bù…), cổng phiên bản trước và sau deploy ĐẠT.
- **Bảo trì:** BẬT tới 2026-10-16T12:38Z (19:38 giờ VN 16/10) — chủ quyết khi tắt.
- **Chưa kiểm:** xem bằng iPhone thật dòng nhắc «đang đối chiếu» (trang đơn Kế toán, Trang chủ Kế toán/Toàn quyền); Chrome đã chạy trước gộp lần cuối cho trang đơn, form, Trang chủ, menu (kịch bản `a2-smoke-sheet` đỏ một bước có sẵn trên `main`: tên hành động lịch sử `order_leg_updated`).
- **Số hiệu:** nhánh đưa đón theo nhóm (ADR-0118, migration 0098) CHƯA vào `main`; khi vào phải đổi số phiên bản lên 2.3 trở lên.
- **Sổ vàng:** các ca còn chờ chủ ở `golden/README.md`.
- **Hoàn tác:** migration 0099 chỉ THÊM (bảng `bil_receipt_recon`, tạo lại một view và trigger đảo lần thu), không sửa dữ liệu cũ; chưa diễn tập quay Worker về bản trước.

## TRẠNG THÁI TRIỂN KHAI — Phiên bản 1.96 ĐÃ LÊN PRODUCTION (ADR-0117 lần 1: loại đối tác là dữ liệu — Kế toán, Quản trị, Toàn quyền thêm / tắt / bật loại ở màn «Hoa hồng đối tác», gắn loại cho hồ sơ ở Danh bạ; nhân viên nội bộ không mang loại được hưởng hoa hồng; kiểm định kỳ `R-PRC-6`) — migration `0095_loai_doi_tac_la_du_lieu` đã áp (2026-10-14 12:37 giờ VN)

Khối do `npm run trien-khai` in ra (chủ chạy), kèm phần AI tự kiểm lại bằng lệnh chỉ đọc (2026-10-14):

- **Commit:** `d2ea2c68` (= `origin/main` lúc triển khai). Điểm khôi phục Time Travel trước khi áp: `00001059-00000002-00005104-d6a34009dee81c97119559308e5ea16f`.
- **Worker** (`wrangler deployments list`): mới nhất **18d2969e-9a7b-404c-a192-c75d74bb19b4** (2026-10-14T05:36Z, 100%); trước đó 583ab741 (2026-10-13T22:16Z).
- **Phiên bản:** cổng trước và sau deploy ĐẠT (theo khối `trien-khai`); `GET /api/auth/config` → `"version":"1.96"`. Số 1.96 lúc soạn nhánh là số tạm, `origin/main` khi đó chưa có mục 1.96 nào khác; bản 1.95 (màn Tạo đơn bốn bước, phiên khác) đã lên trước đó và chưa có mục riêng ở tệp này.
- **Migration:** `wrangler d1 migrations list --remote` → "No migrations to apply!".
- **Dữ liệu:** `audit-invariants --db remote` (chủ chạy trong `trien-khai`) → ĐẠT, trong đó có kiểm mới `R-PRC-6`. AI chưa đọc được số cảnh báo chi tiết của lần chạy này (khối in ra chỉ ghi ĐẠT).
- **Kiểm trước phát hành:** typecheck 0; `npm test` 4721 bài / 0 đỏ (cả hai bước); e2e đủ bộ xanh theo khối `trien-khai`. Người kiểm độc lập (chỉ đọc) đã duyệt từng việc của nhánh, rồi toàn nhánh (kết luận «cần sửa», sửa một lượt, duyệt lại «đạt»); sổ điều phối và các phán quyết ở `docs/superpowers/plans/2026-10-14-adr-0117-lan-1-thi-cong-nhat-ky.md`.
- **Bảo trì:** BẬT tới 2026-10-14T11:49Z (18:49 giờ VN) — chủ tự quyết khi tắt.
- **Hoàn tác:** migration 0095 chỉ THÊM (một cột, hai view, sáu trigger), không sửa hay xoá dữ liệu cũ. Chưa diễn tập quay Worker về bản trước sau khi đã có loại mới trong dữ liệu — AI chưa kiểm hành vi bản cũ với dữ liệu đó; cần quay lại thì dùng điểm Time Travel ở trên và xem phần Hoàn tác của tệp này.
- **Chưa kiểm:** bộ e2e đầy đủ và kịch bản Chrome sau lượt sửa cuối của nhánh (người kiểm độc lập không tự chạy; khối `trien-khai` báo e2e xanh nhưng AI chưa đọc chi tiết); màn «Loại đối tác» và ô «Thêm công việc» ở Danh bạ bằng tài khoản thật; iPhone; dữ liệu thật về vai cũ `STAFF` / `SALES` (xem `BL-ADR0117-VAI-CU`).
- **Còn mở:** lỗi tương phản màu của dòng loại «đã tắt» (`.row-off`, CSS dùng chung; ghi ở README bằng chứng `docs/evidence/2026-10-14-loai-doi-tac/`); hố vai cũ `STAFF` / `SALES` kết thúc ngày tương lai (`docs/BACKLOG.md` `BL-ADR0117-VAI-CU`); **lần 2 của ADR-0117 (mức TA dùng chung, dựng lại bảng `prc_commission_rule`) CHƯA duyệt, không làm**; năm mục sổ hoãn hạn 2026-10-31 (`docs/quyen-hoan.json`: TNV-G1/G3/G4, HC-4.2, HC-5.19) cần chủ gia hạn hoặc đóng trước khi `npm test` đỏ từ 1/11.

## TRẠNG THÁI TRIỂN KHAI (cũ) — Phiên bản 1.94 ĐÃ LÊN PRODUCTION (sửa nút «Gửi yêu cầu» của màn «Điều chỉnh công nợ»; Trợ giúp Kế toán và Quản trị cho màn đó; kèm bản 1.93 — sửa số khách, ADR-0114: nhắc khuyến mại khi bớt khách, lịch sử số khách, mỗi đơn có ít nhất một người lớn) — không migration (2026-10-13 khoảng 23:13 giờ VN)

Chủ chạy `day-len` rồi `trien-khai`; AI kiểm lại bằng lệnh chỉ đọc (2026-10-13):

- **Commit:** `2dd60820` (= `main` = `origin/main`). Không migration nên không có điểm khôi phục Time Travel mới (điểm gần nhất vẫn là của bản 1.92 ở mục ngay dưới).
- **Worker** (`wrangler deployments list`): mới nhất **a2357740-65a6-4d30-b9a3-7bbe55b4c110** (2026-10-13T16:13Z, 100%); trước đó f50ee369 (bản 1.92).
- **Phiên bản:** `GET /api/auth/config` → `"version":"1.94"`; `kiem-phien-ban.mjs --sau-deploy` → ĐẠT. Migration: `d1 migrations list --remote` → "No migrations to apply!".
- **Bảo trì:** BẬT tới 2026-10-14T11:49Z (18:49 giờ VN) — giữ cho tới khi chủ quyết.
- **Chưa kiểm:** kết quả `trien-khai` lần này (e2e, `audit-invariants --db remote`) AI chưa đọc được từ máy chủ; đợt sửa số khách (1.93) đã có một lượt kiểm độc lập trong nhật ký thi công của nó, còn bản sửa nút + Trợ giúp (1.94) chỉ có test, kịch bản Chrome 36/36 và bạn duyệt, chưa có người kiểm độc lập; các việc còn mở của bản 1.92 (mục dưới) vẫn nguyên.
- **e2e lúc triển khai (tối 13/10) — đã đóng, không còn chặn:** lần `trien-khai` thứ hai đỏ `chuyen-khach` và `H5`; chủ chọn tiếp tục ở câu hỏi cổng, rồi lần đó bị máy từ chối deploy vì `main` đổi giữa chừng (phiên khác chạy `day-len` cùng thư mục); bản 1.94 lên ở một lần chạy sau. Đỏ KHÔNG do mã: kịch bản phụ thuộc tốc độ máy (đề nghị chuyển khách hạn 1 phút bị lệnh gửi sau đóng "Hết hạn" sớm khi bước giữa chậm quá 62 giây), đã tái hiện bằng chờ giả lập và sửa ở commit `8e111d98` (nay trên `main`); nguyên nhân đầy đủ ở sổ điều phối `docs/superpowers/plans/2026-10-13-sua-so-khach-adr-0114-thi-cong-nhat-ky.md`. Bài `src/modules/van-chuyen/tu-choi.test.ts` đỏ trong khoảng 23:30–24:00 giờ VN (mốc 6 giờ) đã được phiên khác sửa (`bd7b87ed`).
- **ADR-0114 (bản 1.93) còn mở:** (a) các chỗ mã khác chữ ADR chờ chủ gật đầu — `docs/SYSTEM-DESIGN.md` §16; (b) hai khoá đáp án mới của sổ vàng sửa số khách chờ Kế toán xem lại (0/12) — `docs/superpowers/specs/2026-10-13-sua-so-khach-adr-0114/02-danh-sach-ke-toan-xem-lai.md`; (c) CHƯA chạy trên production: `node scripts/audit-invariants.mjs --db remote` để đếm đơn đã xác nhận có 0 người đi kèm (`R-ORD-16w`, mức cảnh báo, chủ chạy); chưa thử trên iPhone thật; vài kịch bản Chrome phụ có thể bị luật người lớn làm đỏ chưa chạy — danh sách ở sổ điều phối nói trên, mục "Điều đã chạy và kết quả đã thấy".

## TRẠNG THÁI TRIỂN KHAI (cũ) — Phiên bản 1.92 ĐÃ LÊN PRODUCTION (vá D-1: Đối tác không còn thấy lý do nội bộ và người duyệt trong lịch sử đơn; ADR-0115 đợt công nợ: điều chỉnh sổ cần người thứ hai duyệt, màn «Điều chỉnh công nợ», ô quyền `ledger.adjust.approve`; vá khe «Đã giao» không hoa hồng; kèm đợt 1 giao diện Tạo đơn — bản 1.91) — migration `0094_bil_dieu_chinh_duyet` đã áp (2026-10-13 21:30 giờ VN)

Một lần phát hành đưa lên cả 1.91 (giao diện Tạo đơn, phiên khác) lẫn 1.92. Khối do `npm run trien-khai` in ra (chủ chạy), kèm phần người kiểm độc lập tự kiểm lại bằng lệnh chỉ đọc (2026-10-13):

- **Commit:** `277f5983` (= `main` = `origin/main`). Điểm khôi phục Time Travel trước khi áp: `00000fd9-00000000-00005103-0d18d24c5115cd063215da045a7868c7`.
- **Worker** (`wrangler deployments list`): mới nhất **f50ee369-2a34-4f0a-9a38-eb290ce5845c** (2026-10-13T14:30Z, 100%); trước đó 89eed59f (bản 1.90).
- **Phiên bản:** cổng trước và sau deploy ĐẠT; `GET /api/auth/config` → `"version":"1.92"`.
- **Migration:** `wrangler d1 migrations list --remote` → "No migrations to apply!".
- **Dữ liệu:** `audit-invariants --db remote` (chủ chạy trong `trien-khai`) → "Mọi bất biến đạt, 4 cảnh báo" (R-CTL-1: 5 dịch vụ chưa gán nhóm; R-ORD-T1w: 42 đơn chờ chụp bù đợt 2; còn lại: xem khối in ra).
- **Kiểm trước phát hành:** typecheck 0; `npm test` 4552 bài / 0 đỏ; e2e đủ bộ xanh sau khi sửa token CSS của kịch bản `pwa` (đợt Tạo đơn viết cứng `12rem`); người kiểm độc lập: bản vá D-1, ADR-0115 đợt 1 (hai lượt), vá «Đã giao», nhánh gộp — đều không còn lỗi chặn.
- **Bảo trì:** BẬT tới 2026-10-14T11:49Z (18:49 giờ VN) — giữ cho tới khi mọi người đã đăng nhập bằng bản mới; chủ tự quyết khi tắt.
- **Hoàn tác:** quay Worker về bản cũ thì lệnh điều chỉnh công nợ của bản cũ bị trigger chặn (`adjustment_needs_approval`); các loại phiếu khác chạy bình thường (`docs/CHANGE-GUIDE.md` bẫy 71 mục 6).
- **Chưa kiểm:** màn «Điều chỉnh công nợ» và lịch sử đơn của Đối tác bằng tài khoản thật; kịch bản Chrome (`trang-chu-smoke.mjs` với `AXE_JS`; số mục thanh bên 25/32 mới suy ra) và iPhone; hai câu đếm chỉ đọc ở `docs/BACKLOG.md` mục 29; đợt 1 giao diện Tạo đơn (1.91) chưa có người kiểm độc lập.
- **Còn mở:** `HC-4.2` mới giảm một nửa (đợt 2 điều chỉnh chi phí chuyến xe chưa làm; luật tách theo tài khoản, không theo người), `TNV-G3` (ADR-0116 chưa thi công), cùng hạn 2026-10-31; diễn tập khôi phục `HC-5.19`; Kế toán xác nhận ca vàng (5 ca `SV-DC-01…05` mới); Trợ giúp theo vai chưa nói màn mới; lỗ M-2 (lịch sử đơn lộ lý do yêu cầu điều chỉnh chưa duyệt cho Bán hàng chủ đơn và HDV phụ trách) để đợt 2.

## TRẠNG THÁI TRIỂN KHAI (cũ) — Phiên bản 1.88 ĐÃ LÊN PRODUCTION (gói A+C Vận chuyển: hai nút Chỉ đường — ADR-0105; phải thu không âm — ADR-0109; tài xế nhà xe ngoài dùng Nền tảng, báo bận, từ chối chuyến — ADR-0053; chuyển khách giữa hai xe — ADR-0111; màn tài xế mới; bảng điều phối; báo tài xế khi văn phòng cập nhật khách / điểm theo đơn — ADR-0112; chặn từ chối chuyến khi có khách chuyển vào — ADR-0113) — migration `0084`, `0085`, `0086`, `0089`, `0091`, `0092`, `0093` đã áp (2026-10-13 06:50 giờ VN)

Khối do `npm run trien-khai` in ra (chủ chạy), kèm phần AI tự kiểm lại bằng lệnh chỉ đọc sau khi chủ báo đã triển khai (2026-10-13):

- **Commit:** `17515b0b` (= `origin/main` lúc triển khai). Điểm khôi phục Time Travel trước khi áp: `00000f43-00000002-00005102-a4ffab37d580636d6fdb22fd9e9100c2`.
- **Worker** (`wrangler deployments list`): mới nhất **724ac8e0-9ed9-4b32-a8c7-87a272070c1e** (2026-10-12T23:50Z, 100%); trước đó 7710d9bf-37a0-4e14-89cd-6b13eee1422d (2026-10-12T06:42Z = bản 1.87).
- **Phiên bản:** cổng trước và sau deploy ĐẠT; `GET /api/auth/config` → `"version":"1.88"`.
- **Migration:** `wrangler d1 migrations list --remote` → "No migrations to apply!".
- **Dữ liệu:** `audit-invariants --db remote` (chủ chạy trong `trien-khai` và AI chạy lại) → "Mọi bất biến đạt, 4 cảnh báo": R-VC-14 (7 xe thiếu giấy tờ điều kiện xuất bến), R-CTL-1 (3 dịch vụ chưa gán nhóm), R-ORD-T1w (42 đơn xác nhận trước bảng mức, chờ chụp bù đợt 2), và một thông tin cũ về lần thu «người thu chưa rõ» — không cảnh báo nào do gói này sinh ra.
- **Route mới không đăng nhập:** `GET /api/van-chuyen/cuoc-cua-toi` và `POST …/cuoc-cua-toi/:id/tu-choi` → 401.
- **Kiểm trước phát hành:** typecheck 0; `npm test` 4428 bài / 0 đỏ; e2e đủ bộ 59/59 trên bản ghép (trước lần đặt mốc); người kiểm độc lập ĐẠT CÓ ĐIỀU KIỆN cho A4, A5, C2, C3, ADR-0112, ADR-0113 và bản ghép với `main` (mọi điều kiện đã sửa). Lần đặt mốc cuối (`MOC_TIN_DOI`, `MOC_TIN_CAP_NHAT` = 2026-10-12T23:00:00.000Z) chỉ chạy `npm test` + typecheck; e2e đủ bộ chạy lại trong `trien-khai` (kết quả «e2e: xanh»).
- **Bảo trì:** `GET /api/auth/config` báo chế độ bảo trì BẬT tới 2026-10-13T13:10Z (20:10 giờ VN) — không do AI bật; chủ tự quyết khi tắt.
- **Chưa kiểm:** iPhone / Android thật (nút Chỉ đường, màn tài xế đối tác, nhờ xe khác đón); lượng tin thật của hai nút «Cập nhật khách / điểm theo đơn»; các màn mới bằng tài khoản thật. Việc của chủ còn lại: Kế toán xác nhận 11 ca vàng sổ đại lý; nhờ người hiểu luật xem phần tài xế nhà xe ngoài thấy tên khách (A4); hai lệnh đếm chỉ đọc ở `docs/superpowers/specs/2026-10-09-a4-tai-xe-doi-tac-cho-chu.md`.
- **Nợ để sau:** danh sách ở `docs/superpowers/plans/2026-10-08-van-chuyen-goi-a-c-danh-sach-viec.md`, mục «Nợ để sau» (C28, Đ5 ADR-0113, siết bốn ngoại lệ khung thử, ba bài so cả chuỗi phản hồi hay chập chờn).

## TRẠNG THÁI TRIỂN KHAI (cũ) — Phiên bản 1.87 ĐÃ LÊN PRODUCTION (sổ đại lý đợt 1: mức hoa hồng theo đối tác × dịch vụ/nhóm, bản chụp mức lúc xác nhận, màn «Hoa hồng đối tác» / «Người bán dịch vụ» / «Khoá sổ tháng», «Đặt qua đối tác», «Phần đối tác»; ADR-0077, ADR-0078 B1, ADR-0080 D1) — migration `0090_so_dai_ly_dot_1` đã áp (2026-10-12 13:42 giờ VN)

Khối do `npm run trien-khai` in ra (chủ chạy), kèm phần AI tự kiểm lại bằng lệnh chỉ đọc sau khi chủ báo đã triển khai (2026-10-12):

- **Commit:** `857251dc` (= `origin/main` lúc triển khai). Điểm khôi phục Time Travel trước khi áp: `00000ea3-00000004-00005102-3c1385673923edfa361c8f669906bcbe`.
- **Worker** (`wrangler deployments list`): mới nhất **7710d9bf-37a0-4e14-89cd-6b13eee1422d** (2026-10-12T06:42:51Z, 100%); trước đó d5c6d6a8-e4b4-47ef-b937-9234b6d290fe (2026-10-08T10:35Z = bản 1.86).
- **Phiên bản:** cổng trước và sau deploy ĐẠT; `GET /api/auth/config` → `"version":"1.87"`, bảo trì TẮT.
- **Migration:** `wrangler d1 migrations list --remote` → "No migrations to apply!" (`0090` đã áp).
- **Dữ liệu:** `audit-invariants --db remote` (chủ chạy trong `trien-khai` và AI chạy lại) → "Mọi bất biến đạt, 4 cảnh báo": 22 lần thu «người thu chưa rõ» (cọc cũ chuyển sang sổ — việc Kế toán của sổ tiền lượt 1); `R-VC-14` 7 xe thiếu giấy tờ xuất bến; `R-CTL-1` 3 dịch vụ chưa gán nhóm (Quản trị gán ở màn Danh mục); `R-ORD-T1w` 42 đơn đã xác nhận trước 0090 chưa có bản chụp thương mại (chờ chụp bù ở đợt 2 — đặc tả §9). `R-ORD-T1` (đơn mới sau ân hạn 60 phút) và `R-KY-1`, `R-KY-2`, `R-PRC-1…5`, `R-ORD-T2` đều ✓.
- **Kiểm trước phát hành (nhánh `claude/so-tien-luot-2-dai-ly`):** typecheck 0; `npm test` 3799 bài / 0 đỏ (một bài `standards` chỉ đỏ khi chạy ngoài kho git); e2e ĐỦ BỘ 54/54 + `audit-invariants --strict` đạt ở cả ba nhóm; Chrome `so-dai-ly-smoke` 80/80 và `a2-smoke-order` 11/11 có `AXE_JS`; 14 phép phá cố ý đều đỏ đúng chỗ; kiểm độc lập toàn nhánh (mô hình mạnh nhất) ĐẠT — `docs/superpowers/specs/2026-10-08-so-dai-ly-dot-1/kiem-doc-lap-thi-cong.md`. Sổ: `docs/superpowers/plans/2026-10-08-so-dai-ly-dot-1-thi-cong-nhat-ky.md`.
- **Giới hạn đã biết:** đợt 1 chỉ gắn được hoa hồng cho đại lý là hồ sơ CÁ NHÂN có tài khoản đối tác (hồ sơ tổ chức chưa mang được vai được hưởng — cần ADR); mức ghi tay bị tính lại khi đổi bên đặt đơn đã xác nhận (chủ chọn «ghi nợ» 12/10); đợt 2, đợt 3 chưa làm. Nợ và việc treo: `docs/BACKLOG.md` mục 26–27, mục «Việc còn treo» cuối tệp này.
- **Chưa kiểm:** iPhone thật; các màn mới trên production bằng tài khoản thật (chưa ai mở sau triển khai).
- Bản 1.86 có mục riêng ngay bên dưới (gồm cả 1.85); các bản 1.82–1.84 xem ghi chú ở mục 1.81 phía dưới nữa.

## TRẠNG THÁI TRIỂN KHAI (cũ) — Phiên bản 1.86 ĐÃ LÊN PRODUCTION (QR thanh toán VietQR — ADR-0108; mã giao dịch ngân hàng bắt buộc — ADR-0092 Đ6; gồm cả 1.85) — migration `0087_pty_tai_khoan_nhan_tien`, `0088_bil_ma_giao_dich` đã áp (2026-10-08 17:35 giờ VN)

Chủ dự án tự chạy `npm run day-len -- claude/ticket-sales-qr-payment-cf8e18` rồi `npm run trien-khai` (2026-10-08 chiều). Kết quả do `trien-khai` in ra và AI kiểm lại bằng lệnh chỉ đọc ngay sau đó:

- **Phiên bản:** `kiem-phien-ban.mjs` trước deploy ĐẠT (máy 1.86 > production 1.84), sau deploy ĐẠT ("production đang chạy đúng bản 1.86"); `GET /api/auth/config` → `"version":"1.86"`. Mã = `43857d7a` (= `origin/main` lúc phát hành).
- **Worker** (`wrangler deployments list`): mới nhất **d5c6d6a8-e4b4-47ef-b937-9234b6d290fe** (2026-10-08T10:35Z). Trước đó 72d2dc12-92aa-4149-ab97-97905f0b747d (2026-10-05T23:40Z, bản 1.84).
- **Migration:** `0087`, `0088` áp lúc phát hành; `wrangler d1 migrations list --remote` sau đó → "No migrations to apply!". Điểm khôi phục Time Travel trước khi áp: `00000cc3-00000000-000050fe-4e5b8fb1acc4d276bbc1e552d0f72f84`.
- **Dữ liệu:** `audit-invariants --db remote` → "Mọi bất biến đạt, 3 cảnh báo" (R-VC-14: 7 xe thiếu giấy tờ điều kiện xuất bến; R-CTL-1: 3 dịch vụ chưa gán nhóm; thông tin 22 lần thu người thu chưa rõ — cả ba có từ trước); **R-BIL-D6a, R-BIL-D6b (mới) đạt** — không lần thu nào ghi thiếu mã trong khoảng giữa migration và deploy.
- **Kiểm trước phát hành:** typecheck 0; npm test 3445 (3443 đạt, 0 đỏ, 2 để dành); e2e đủ bộ 52/52 (483 giây, trong `trien-khai`); người kiểm độc lập + người kiểm cuối nhánh ĐẠT sau một lượt sửa; chủ quét QR thật bằng MB Bank và Vietcombank đúng cả bốn thứ. Sổ: `docs/superpowers/plans/2026-10-08-qr-thanh-toan-thi-cong-nhat-ky.md`.
- **Route mới:** `GET /api/orders/:id/qr-thanh-toan` và `GET /api/parties/:id/tai-khoan-nhan-tien` không đăng nhập → 401 (lần gọi đầu ngay sau deploy có một lần 404 do bản cũ còn ở vài nơi, gọi lại 401).
- **Bảo trì:** `GET /api/auth/config` báo đang BẬT tới 2026-10-10 11:50 giờ VN (`endsAt` 2026-10-10T04:50Z) — chủ bật từ trước, không do lần phát hành này.
- **Việc của chủ sau phát hành:** cài tài khoản nhận tiền thật ở Danh bạ → Công ty TNHH Tour Đảo → "Tài khoản nhận tiền" (chưa cài thì nút QR báo "Công ty chưa cài tài khoản nhận tiền"). AI không kiểm được việc này (không đăng nhập production).
- **Chưa kiểm:** nút "Lưu ảnh" trên iPhone thật.

## TRẠNG THÁI TRIỂN KHAI (cũ) — Phiên bản 1.81 ĐÃ LÊN PRODUCTION (Vận chuyển Đợt 7: cam kết "xe riêng" / "xe tối thiểu N chỗ" trên chặng đưa đón, ADR-0056 VK3-A) — migration `0077_cam_ket_chang` đã áp (2026-10-05 18:43 giờ VN)

> **Ghi chú 2026-10-06:** bản **1.84** (`kiem-phien-ban.mjs --sau-deploy` ĐẠT; migration remote "No migrations to apply") nay đã chạy trên production và chứa cả **Tốc độ đợt 1** (ADR-0102, mục nhật ký 1.83). Mục trạng thái của 1.83/1.84 do phiên làm bản 1.84 ghi; dòng này chỉ trỏ tới, không thay.

AI (phiên điều phối Đợt 7) kiểm bằng lệnh chỉ đọc sau khi chủ báo đã `day-len` + `trien-khai` (5/10 tối):

- **Phiên bản:** `node scripts/kiem-phien-ban.mjs --sau-deploy` → "ĐẠT: production đang chạy đúng bản 1.81."; `GET /api/auth/config` → `"version":"1.81"`. Mã 1.81 = `003774e9` (nhánh `van-chuyen-dot-7`, = `origin/main` lúc ghi).
- **Worker** (`wrangler deployments list`): mới nhất **3a53ded5-76fb-42c2-b806-861fe2d7a4dc** (2026-10-05T11:43:16Z = 1.81). Trước đó 9969f186-fbaf-4391-8b2e-d7b9c57eb17c (07:16Z — trước Đợt 7, bản 1.80).
- **Migration:** `wrangler d1 migrations list --remote` → "No migrations to apply!" (`0077` đã áp).
- **Dữ liệu:** `audit-invariants --db remote` → "Mọi bất biến đạt, 3 cảnh báo" (R-CTL-1: 3 dịch vụ chưa gán nhóm; R-BIL-2/5 chưa áp dụng; R-BIL-7 dùng lại R-PTY-1), thoát 0; R-VC-25 (mới) đạt.
- **Tệp công khai:** `/` → 200; `/js/order.js` → 200, có nhãn "XE RIÊNG" (`dp-chip-navy`) và ô "Xe tối thiểu".
- **Bảo trì:** `GET /api/auth/config` báo đang BẬT tới 2026-10-10 16:37 giờ VN (`endsAt` 2026-10-10T09:37Z).
- **Kiểm trước phát hành (nhánh `van-chuyen-dot-7`):** typecheck 0; npm test 3213 đạt / 0 đỏ; e2e đủ bộ 45/45 kịch bản; kiểm độc lập toàn nhánh ĐẠT (4 đột biến riêng) + lượt kiểm phần sau cùng ĐẠT. Sổ: `docs/superpowers/plans/2026-10-05-van-chuyen-dot-7-nhat-ky.md`.
- **Lộ trình Vận chuyển ĐÃ KHOÁ 5/10** (chủ: không vẽ thêm); phần chưa làm + nợ ở `docs/BACKLOG.md` mục 22 (`BL-VC-…`).
- **Chưa kiểm:** iPhone thật; ba kịch bản Chrome cũ đỏ sẵn từ 1.80 (`BL-VC-SMOKE-CU`). Các bản 1.77–1.80 chưa có mục riêng trong sổ này (phiên Đợt 4/5 ghi ở nhật ký đợt).

## TRẠNG THÁI TRIỂN KHAI (cũ) — Phiên bản 1.76 ĐÃ LÊN PRODUCTION (lớp chống ghi trùng chung ADR-0094 — Đợt 0 luồng L; gồm cả 1.73 Trang chủ Quản trị, 1.74 quyền tiền ADR-0090, 1.75 Vận chuyển Đợt 3) — migration `0074_lan_gui` đã áp (2026-10-02 22:08 giờ VN)

AI (phiên "Đợt 0 luồng L") kiểm bằng lệnh chỉ đọc sau khi chủ báo đã `day-len` + `trien-khai` (2/10 tối):

- **Phiên bản:** `node scripts/kiem-phien-ban.mjs --sau-deploy` → "ĐẠT: production đang chạy đúng bản 1.76."; `GET /api/auth/config` → `"version":"1.76"`. Mã 1.76 = `51d76648` (= `origin/main` lúc ghi; nhánh `worktree-dot-0-luong-l`, đã gộp main `a6fd0a3d` = 1.75).
- **Worker** (`wrangler deployments list`): mới nhất **5b2b21ad-e3a3-4485-90b8-4cceb1a70f1a** (2026-10-02T15:08:19Z) — nhiều khả năng 1.76 (lần triển khai cuối, phiên bản công khai khớp); trước đó f9db293c-b08e-44ab-8876-a8a45b04ed38 (14:17Z) và 966bfb5d-6ae1-4cac-8c0d-85aaa82c0f15 (13:55Z) — chưa đối chiếu là bản nào. **Lùi Worker:** `0074` chỉ THÊM hai bảng `lg_*` (mã cũ không đọc) ⇒ lùi mã không vỡ dữ liệu; mã cũ không gửi/không đọc vé (mất chống ghi trùng, như trước 1.76).
- **Migration:** `wrangler d1 migrations list --remote` → "No migrations to apply!" (`0074` đã áp, sau `0075` — wrangler theo TÊN tệp).
- **Khoá:** `LAN_GUI_SECRET` chủ đặt 2/10; bước 1c của `npm run trien-khai` kiểm tên khoá trước migration (lần chạy thật đầu tiên — chủ chạy).
- **Dữ liệu:** `audit-invariants --db remote` → "Mọi bất biến đạt, 4 cảnh báo" (R-CTL-1: 3 dịch vụ chưa gán nhóm; R-BIL-2/5 chưa áp dụng; R-BIL-7 dùng lại R-PTY-1), thoát 0.
- **Tệp công khai:** `/`, `/api/auth/config`, `/js/home.js` → 200; `home.js` có chữ `idempotency-key` (giao diện gửi vé); `GET /api/staff` chưa đăng nhập → 401.
- **T12 (ADR-0094 A-9):** `npm run test:e2e -- chong-ghi-trung` trên đúng `51d76648` → 4/4 xanh (11, 12, 13, HD10, KT03, KT04 gửi lại cùng vé ⇒ một lần ghi; N2 đụng vé ⇒ 409; T14), H5 xanh. Kiểm sau triển khai đạt (trên). ⇒ Điều kiện đóng F-02 ĐỦ; **xoá mục F-02 khỏi `docs/quyen-hoan.json` do chủ làm/ra lệnh** (công cụ của AI chặn việc xoá mục sổ phát hiện an ninh).
- **Kiểm trước phát hành (trên mã đã gộp `05100460`):** typecheck 0; npm test 0 đỏ (2966); e2e 47/47; Chrome `lop-ve-smoke` 6/6, `passkey-smoke` 9/9; kiểm độc lập ĐẠT (vòng 1; vòng 2 sau khi vá lộ PIN; phần gộp). Sổ: `docs/superpowers/plans/2026-10-02-dot-0-lop-ve-nhat-ky.md`.
- **Chưa kiểm:** iPhone thật T3 (chủ); chữ lỗi D1 khi đụng vé trên production (N2 — mới thấy ở D1 local); bảng migration ở `docs/SYSTEM-DESIGN.md` vẫn ghi 0071/0074/0075 "CHƯA lên production" (để lần sửa tài liệu sau).

## TRẠNG THÁI TRIỂN KHAI (cũ) — Phiên bản 1.70 ĐÃ LÊN PRODUCTION (thị giác toàn Nền tảng "Năng động – Tin cậy – Tinh tế"; gồm cả 1.69 Vận chuyển Đợt 2 và 1.67–1.68) — migration `0070_tin_chuyen` đã áp (2026-10-02 17:25 giờ VN)

AI (phiên "Thị giác toàn Nền tảng") kiểm bằng lệnh chỉ đọc sau khi chủ báo đã `day-len` + `trien-khai` (2/10 tối):

- **Phiên bản:** `node scripts/kiem-phien-ban.mjs --sau-deploy` → "ĐẠT: production đang chạy đúng bản 1.70."; `GET /api/auth/config` → `"version":"1.70"`. Mã 1.70 = `a496e8d1` (nhánh `worktree-thi-giac-nen-tang`, đã gộp main e7cd764f = 1.69). Lúc ghi, `origin/main` = ab87d7c3 — sau 1.70 chỉ thêm tài liệu (ADR-0095, phân tích câu hỏi Vận chuyển), số phiên bản vẫn 1.70.
- **Worker** (`wrangler deployments list`): **1ce67b85-27e7-471a-b7a6-11ce7c6c0839** (2026-10-02T10:25:41Z = 1.70). Trước đó e01d29b8-c701-4997-9738-1b28bfc3fdf4 (10:13Z — chưa đối chiếu là bản nào) và 2a02d3c5-a3dd-41cf-959c-a763e9322aea (05:17Z — nhiều khả năng 1.68, chưa đối chiếu). **Lùi Worker:** `0070` chỉ thêm view `v_aud_trip_event` (mã cũ không đọc) ⇒ lùi mã không vỡ dữ liệu; lùi về trước 1.69 thì mất tin báo chuyến của Vận chuyển Đợt 2.
- **Migration:** `wrangler d1 migrations list --remote` → "No migrations to apply!" (`0070` đã áp; trước phát hành còn chờ đúng `0070`).
- **Dữ liệu:** `audit-invariants --db remote` → "Mọi bất biến đạt, 4 cảnh báo" (R-CTL-1: 3 dịch vụ đang hiện chưa gán nhóm; R-BIL-2/5 chưa áp dụng; R-BIL-7 dùng lại R-PTY-1), thoát 0.
- **Tệp công khai:** `/`, `/app.css`, `/js/home.js` → 200; `app.css` có token 1.70 (`--c-lagoon`, `--c-btn-soft-bg`, `--c-receipt-surface-alt`); `home.js` có lớp ô theo nhóm (`dash-o-hop-…`); `GET /api/staff` chưa đăng nhập → 401.
- **Giao diện công ty (ADR-0087):** `GET /api/giao-dien.css` → `:root{}` (không ghi đè) — hai núm "Nền/Chữ nút lưu, xác nhận" đổi nghĩa ở 1.70 không ảnh hưởng cài đặt nào.
- **Bảo trì:** đang BẬT tới 2026-10-05 06:17 giờ VN (`endsAt` 2026-10-04T23:17Z).
- **Kiểm trước phát hành (trên mã đã gộp):** npm test 2802/2802, typecheck 0, e2e 42/42, axe 16 màn × 2 khổ 0 vi phạm serious/critical; kiểm độc lập ĐẠT CÓ ĐIỀU KIỆN → 3 mục trung bình đã sửa, có bài canh (chưa vòng kiểm lại). Đặc tả: `docs/superpowers/specs/2026-10-02-thi-giac-nen-tang-design.md`.
- **Chưa kiểm:** iPhone thật (thanh tab mờ kính, bóng đổ); thao tác bằng tài khoản thật trên production; lần triển khai 10:13Z là gì.
- **Việc treo liên quan:** `docs/BACKLOG.md` mục 19 (núm màu ngọc, màu rê nút lưu theo "Màu chính"); đề xuất một dòng luật `web/CLAUDE.md` ("nút chốt không phải nút gửi form → lớp `btn-chinh`") chờ chủ duyệt; nhánh `worktree-agent-a76ababaa4a5b3183` (Tiền xe thuê T1) đang ghi số "1.70" → đánh lại (≥ 1.71) lúc gộp.

## TRẠNG THÁI TRIỂN KHAI (cũ) — Phiên bản 1.66 ĐÃ LÊN PRODUCTION (Trang chủ điện thoại theo bản vẽ 2026-09-30; gồm cả 1.65 Vận chuyển đợt 1) — không migration mới của 1.66 (2026-10-02 09:09 giờ VN)

AI (phiên "Trang chủ điện thoại") kiểm bằng lệnh chỉ đọc sau khi chủ báo đã `day-len` + `trien-khai` (2/10; lần `trien-khai` đầu dừng ở e2e — `catalog` đỏ chập chờn, chạy riêng trên cùng mã đạt 27 bước — chủ chạy lại):

- **Phiên bản:** `node scripts/kiem-phien-ban.mjs --sau-deploy` → "ĐẠT: production đang chạy đúng bản 1.66."; `GET /api/auth/config` → `"version":"1.66"`. `origin/main` = 01026ec4 (nhánh `worktree-trang-chu-dien-thoai-momo`, đã gộp main 1.65).
- **Worker** (`wrangler deployments list`): **ae754e1e-0d7f-41c9-bb7b-0c6727eed722** (2026-10-02T02:09:45Z = 1.66); trước đó 3b56e772-15e1-47cd-99c2-3d99ad8b12f0 (2026-10-02T01:38:55Z — nhiều khả năng 1.65, chưa đối chiếu). 1.66 chỉ đổi giao diện (không migration, không route) nên lùi Worker về 3b56e772 không vướng dữ liệu.
- **Tệp công khai:** `/`, `/js/home.js`, `/app.css`, `/sw.js` → 200; `/` có `class="trang-chu"`, `#dash-tim`, `#dash-o`, `#dash-so`; `home.js` có các khối mới (dải chào, lưới ô, bảng "Tất cả", thẻ số liệu, dải "Thử lại"); `app.css` có khối "Trang chủ ĐIỆN THOẠI" và token `--hero-bg` / `--c-on-hero`.
- **Chưa kiểm:** kết quả `audit-invariants --db remote` của lần `trien-khai` thứ hai (lệnh tự chạy; AI không thấy đầu ra); iPhone thật.
- **Việc treo liên quan:** Trang chủ riêng cho Hướng dẫn viên / Đối tác — chủ duyệt hướng, đợt riêng (`docs/BACKLOG.md` mục 18). Nhánh `thanh-sang-chu-manh` (thanh sáng, chữ mảnh — chưa gộp) đang ghi số 1.65 → phải đánh lại số (≥ 1.67) lúc gộp; dải đầu Trang chủ đã trỏ token vai `--c-bar-bg` / `--c-on-bar` của nhánh đó (chủ chọn 2-B) nên tự chuyển trắng khi nó lên.

## TRẠNG THÁI TRIỂN KHAI (cũ) — Phiên bản 1.53 ĐÃ LÊN PRODUCTION (gộp 1.49–1.53: gộp hồ sơ ADR-0068, HCNS + hạn chế Quản trị ADR-0071/0072, ô mới của chặng) — migration `0056`–`0059` đã áp (2026-10-01 12:12 giờ VN)

AI (phiên "restrict admin permissions") kiểm bằng lệnh chỉ đọc sau khi chủ báo đã `day-len` + `trien-khai` (1/10; lần `trien-khai` đầu không triển khai gì — chủ chạy lại):

- **Phiên bản:** `GET /api/auth/config` → `"version":"1.53"`. `kiem-phien-ban.mjs --sau-deploy` báo "CHƯA ĐẠT: production 1.53, bản ở máy 1.54" — vì `main` cục bộ đã gộp thêm 1.54 (trợ lý thông minh, migration `0060_tl_bo_nao`) SAU lần triển khai này; 1.53 là đúng bản đã triển khai (`origin/main` lúc đó = 446c64a4).
- **Worker** (`wrangler deployments list`): **53a302c1-e7e8-4c57-b953-815e221d2252** (2026-10-01T05:12:19Z). Trước đó 66cb9e73-c9b0-459e-b12e-91cd9089fda7 (1.48). **Lùi Worker:** chưa đánh giá kỹ — 0056 thêm cột `pty_party.merged_into_id`, 0057 chỉ thêm dòng mã quyền/vai, 0058/0059 thêm cột/bảng chặng; hỏi trước khi lùi.
- **Migration:** `wrangler d1 migrations list --remote` → 0056–0059 đã áp; còn chờ `0060_tl_bo_nao.sql` (thuộc 1.54, chưa triển khai).
- **Dữ liệu:** `audit-invariants --db remote` → "Mọi bất biến đạt, 3 cảnh báo (D1 remote)", thoát 0.
- **Route:** `GET /api/staff` chưa đăng nhập → 401.
- **Bảo trì:** đang BẬT tới 2026-10-05 12:00 giờ VN (`endsAt` 05:00Z). Từ 1.53 bảo trì miễn trừ theo **quyền Toàn quyền**, không còn theo danh sách SĐT (ADR-0071 điều 3).
- **Kiểm độc lập:** ADR-0071/0072 hai vòng ĐẠT; phòng ngừa 7403 (`phong-ngua-wrangler-7403`) ĐẠT.
- **Việc chủ cần làm sau 1.53:** gán vai **Hành chính nhân sự** cho người phụ trách nhân sự (chỉ Toàn quyền gán) — từ 1.53 Quản trị không tạo được tài khoản.
- **Chưa kiểm:** thao tác thật bằng tài khoản HCNS / Quản trị trên production; iPhone thật.

## TRẠNG THÁI TRIỂN KHAI (cũ) — Phiên bản 1.48 (nhóm dịch vụ, ADR-0058) ĐÃ LÊN PRODUCTION — migration `0055_nhom_dich_vu` đã áp (2026-10-01 sáng giờ VN)

AI (phiên điều phối chung) kiểm bằng lệnh chỉ đọc sau khi chủ báo đã `day-len` + `trien-khai` (1/10):

- **Phiên bản:** `node scripts/kiem-phien-ban.mjs --sau-deploy` → "ĐẠT: production đang chạy đúng bản 1.48." `origin/main` = 1a92a1cb (nhánh `thi-cong-luot-1-adr-0058-0062`, đã gộp main 1.47).
- **1.48 gồm:** hai bảng `ctl_group`, `ctl_service_group` (module `catalog`, tiền tố `ctl_`), gieo 14 nhóm / 110 dịch vụ (ATV → Kong Forest) + một dòng nhật ký `catalog_groups_seeded`; năm route Quản trị `/api/catalog/groups…`, `/group-assignments`, `/:code/group-history` (`admin.manage`); DTO danh mục thêm `groupCode` / `groups`; form đơn có hàng chip "Nhóm dịch vụ" (chủ chọn cách 1, chip "Theo nhóm" đổi chữ "Giá theo nhóm"), nhớ theo tài khoản trên máy; màn Dịch vụ & giá có khối "Nhóm dịch vụ" (thêm, đổi tên, Lên/Xuống, Tắt/Bật, chuyển nhiều ≤ 50, lịch sử); kiểm định kỳ R-CTL-1 (cảnh báo); hướng dẫn Quản trị / Bán hàng / Đối tác có đoạn nhóm; bốn dòng luật mục A (chủ duyệt 1/10).
- **Worker** (`wrangler deployments list`): mới nhất **66cb9e73-c9b0-459e-b12e-91cd9089fda7** (2026-09-30T23:19:51Z — nhiều khả năng 1.48, chưa đối chiếu số bản theo từng Worker); trước đó 0bdb5da2-5e41-4842-826d-9bdf6ea5f119 (23:00Z) và cc0ce43e-9faf-4cc2-ad5c-eca2660614d1 (22:48Z). **Lùi Worker:** mã 1.47 không đọc `ctl_*`, bảng mới chỉ thêm ⇒ lùi an toàn về dữ liệu; bảng `ctl_*` ở lại (không xoá cứng).
- **Migration:** `wrangler d1 migrations list --remote` → "No migrations to apply!". Trước phát hành chủ chạy hai câu đếm chỉ-đọc: `co_mat` 110, `dang_tren_sheet` 110, `ngoai_bang_gieo` 0.
- **Route mới:** `GET /api/catalog/groups` và `GET /api/catalog/for-order` chưa đăng nhập → 401.
- **Dữ liệu:** `audit-invariants --db remote` → "Mọi bất biến đạt, 4 cảnh báo": R-CTL-1 ✓ (0 dịch vụ đang hiện mà chưa phân loại ⇒ gieo đủ); cảnh báo cũ: 22 lần thu người thu chưa rõ (Kế toán), R-VC-7 = 2, R-VC-14 = 7, R-ORD-8 = 6.
- **Kiểm độc lập:** K2A hai vòng ĐẠT (nhật ký `docs/superpowers/plans/2026-09-30-luot-1-adr-0058-0062-thi-cong-nhat-ky.md` §5).
- **Chưa kiểm:** thao tác thật bằng tài khoản đăng nhập (Quản trị thấy 14 nhóm; lập đơn bấm "Thể thao biển" thấy 23 dịch vụ; tải lại vẫn nhớ); iPhone thật.
- **Nợ (không chặn):** hướng dẫn Quản trị 3145/3150 chữ sát trần 30 phút; màn Danh mục tải `/api/staff` (có SĐT) chỉ để lấy tên; thứ tự `can()` trong thân route dựa vào kỷ luật; lịch sử nhóm hiện tên nhóm hiện tại.
- **Kế tiếp:** Phần B lượt 1 — ADR-0062 báo tin khi đơn đổi sau xác nhận (nhánh mới từ `main`, số migration = lớn nhất + 1 lúc gộp).

## TRẠNG THÁI TRIỂN KHAI (cũ) — Phiên bản 1.42 (sổ tiền lượt 1 = "Hoàn tất đơn" + giao diện theo góp ý người dùng 30/9) ĐÃ LÊN PRODUCTION; hiện production chạy **1.43** (bảo trì tự tắt — phiên khác, chồng lên 1.42) — migration `0044`, `0045` đã áp (2026-09-30 tối, chủ tự chạy `npm run day-len -- worktree-agent-a70eb0a16a8dbebb3` rồi `npm run trien-khai`)

AI (phiên "phân tích góp ý 30/9") kiểm bằng lệnh chỉ đọc 30/9 ~21:30 giờ VN:

- **Phiên bản:** `node scripts/kiem-phien-ban.mjs --sau-deploy` → "ĐẠT: production đang chạy đúng bản 1.43." `origin/main` = 970f705d chứa trọn 1.42 (0080d65f). Hai lần `trien-khai` đầu KHÔNG tới bước phát hành (lần 2: AI đưa lệnh có `| tee` làm mất TTY → lệnh tự từ chối — đừng dẫn chủ chạy kiểu đó; muốn lưu thông báo dùng `script -q <tệp> npm run trien-khai`).
- **1.42 gồm:** sổ tiền lượt 1 (ADR-0024 đ1–5, ADR-0025, ADR-0026: "Đã giao – đã thu đủ", "Hoàn thành", khoá đơn sau Đã giao, lần thu + sổ công nợ `bil_*`, biên nhận danh sách trắng, cọc cũ chuyển thành lần thu "chưa rõ"; thao tác Kế toán **TẠM** trên trang đơn + trường `keToan` của `GET /api/orders/:id/payments` — gỡ khi dựng hai màn sổ theo bản vẽ Claude Design của chủ); giao diện G1 (bộ lọc đơn nhiều điều kiện, Trang chủ Hôm nay/Ngày mai/Ngày kia, Góp ý thanh bước + "Mở lại", lọc sản phẩm "Hay dùng", tài xế "Ngày kia", thẻ đơn "Đón tại"); form lập đơn: Thanh toán trước Khách, mặc định Chuyển khoản. Kiểm độc lập: sổ tiền 2 vòng, G1 2 vòng, bản gộp 1 vòng — ĐẠT / ĐẠT CÓ ĐIỀU KIỆN đã sửa; `npm test` 1992/1992, e2e 31/31. Nguồn: `docs/superpowers/specs/2026-09-30-phan-tich-gop-y-nguoi-dung.md`, sổ thi công `docs/superpowers/plans/2026-09-30-so-tien-luot-1-thi-cong-nhat-ky.md`.
- **Worker** (`wrangler deployments list`): 9d8572b2-6e80-499a-81e7-6d72d7f627f9 (14:13Z — nhiều khả năng 1.42, chưa đối chiếu số bản), 57805328-d7af-4157-95d4-f125c0dd2fb1 (14:19Z, mới nhất = 1.43). Trước đó fe80ecc9 (13:12Z) và 9c1f6d9c (13:02Z, 1.41 hướng dẫn theo vai). **KHÔNG lùi Worker về bản trước 1.42**: 0045 đã chuyển cọc cũ sang sổ, mã cũ không đọc sổ → hỏi AI trước khi lùi.
- **Migration:** `wrangler d1 migrations list --remote` → "No migrations to apply!" (0044, 0045 đã áp).
- **Dữ liệu:** `audit-invariants --db remote` thoát 0 → "Mọi bất biến đạt, 3 cảnh báo": ⚠ **22 lần thu người thu chưa rõ** (cọc cũ — Kế toán đảo rồi ghi lại đúng người thu bằng nút tạm trên trang đơn; đơn còn lần thu "chưa rõ" KHÔNG bấm Đã giao được); ⚠ R-VC-14 = 7; ⚠ R-ORD-8 = 7. Chín kiểm R-BIL đạt.
- **Chưa kiểm:** thao tác thật bằng tài khoản đăng nhập (Đã giao, Hoàn thành, nút Kế toán); iPhone thật; ca vàng SV-SC-01..04 chờ chủ/Kế toán xác nhận; `v1-xac-nhan-png` bước b (phông) đỏ sẵn từ 1.39.
- **Kế tiếp:** chủ vẽ hai màn sổ (Claude Design); ADR-0059/0060/0061 (accepted 30/9, thi công sau, migration ≥ 0050 do điều phối chung cấp); câu mở: ô "Người lập" chọn từng người (chạm API), thanh lọc ngang máy tính.

## TRẠNG THÁI TRIỂN KHAI (cũ) — Phiên bản 1.40: sửa giao diện nhỏ theo rà soát 30/9 (đếm dịch vụ ở form đơn; "Thông tin chuyến" thu gọn mặc định mọi khổ; thẻ HDV có giờ khởi hành / check-in / ghi chú dịch vụ + "Xem đơn"; tài xế thấy điểm đón, giờ hẹn, số khách TRƯỚC xuất bến; trang đơn không lặp ngày; sửa hai lỗi hiển thị do phông 1.39) — không migration — ĐÃ LÊN PRODUCTION (2026-09-30 17:49 giờ VN, chủ tự chạy `npm run day-len -- giao-dien-sua-nho-1-39` rồi `npm run trien-khai`)

AI (phiên điều phối chung) kiểm bằng lệnh chỉ đọc 30/9 17:50:

- **Phiên bản: 1.40.** `node scripts/kiem-phien-ban.mjs --sau-deploy` → "ĐẠT: production đang chạy đúng bản 1.40."; `GET /api/auth/config` `"version":"1.40"`. (Lần kiểm 17:44 còn 1.39 — lần `trien-khai` đầu chưa tới bước deploy; chủ chạy lại.)
- **Chế độ bảo trì: TẮT** (`on:false`) — lúc 1.38 còn bật tới 4/10; chưa rõ ai tắt (đã hỏi chủ).
- **Mã:** `origin/main` = 63a8e76a (nhánh `giao-dien-sua-nho-1-39` = 1.40, gồm gộp main 1db777f4 bản 1.39 phông chữ và nhánh tài liệu `ra-soat-luong-giao-dien`). Kiểm độc lập ĐẠT CÓ ĐIỀU KIỆN (hai THẤP: dòng APP_NAME ở thẻ HDV; nút "Xem đơn" chưa thử bằng tài khoản HDV thật). Sau gộp phông: `npm test` hai bước thoát 0, typecheck 0, 5 kịch bản Chrome xanh (a2-smoke-form, a2-smoke-order, hdv-viec-cua-toi-smoke, cuoc-smoke, dat-gap-smoke).
- **Worker:** mới nhất **63d5e56c-6820-4e3b-81ee-782e30834030** (2026-09-30T10:49:33Z). Mốc lùi: 9c5c2217-a728-4ce9-9fdb-b28afc8b2c1d (1.39, 09:58Z). Lùi an toàn (không migration).
- **Migration:** không có mới; `wrangler d1 migrations list --remote` → "No migrations to apply!". **Dữ liệu:** `audit-invariants --db remote` → "Mọi bất biến đạt, 2 cảnh báo" (R-VC-14 = 12, R-ORD-8 = 2 — như 1.38).
- **Chưa kiểm:** iPhone thật; "Xem đơn" bằng tài khoản HDV thật.
- **Kế tiếp:** trình chủ ADR 0058–0062 (rà soát 30/9 — `docs/superpowers/specs/2026-09-30-ra-soat-luong-giao-dien-phan-loai-huong-dan.md`; bản nháp đang sửa vòng 2 theo người kiểm độc lập, NGOÀI repo ở `~/.claude/jobs/9b4860df/tmp/adr-nhap/` — phải đưa vào repo trước khi phiên điều phối kết thúc); Sổ tiền lượt 1 đang thi công ở phiên khác (nhánh `worktree-agent-aa1fab0316112d404`, 0044–0045; ADR-0060 đề xuất chèn Task 7b); ADR-0047 Phần B chờ chủ vẽ (nhớ ô nơi trả + "Số khách đi xe").

## TRẠNG THÁI TRIỂN KHAI (cũ) — Phiên bản 1.38: Vận chuyển lượt 1 — Bảng điều phối (ADR-0049), Kernel lượt 1 (ADR-0050), "Đã gọi báo" (ADR-0051), chặng đưa đón + hành khách phần máy chủ (ADR-0047 Phần A), mốc 6 giờ + "Đặt gấp", tài xế chỉ thấy khách trong ngày chạy (ADR-0053 D7.2, Q-L3-B); migration `0034`, `0035`, `0040`–`0043` ĐÃ LÊN PRODUCTION (2026-09-30 15:11 giờ VN, chủ dự án tự chạy `npm run day-len -- phat-hanh-1-38` rồi `npm run trien-khai`)

AI (phiên điều phối chung, tiếp quản điều phối Vận chuyển 30/9) kiểm bằng lệnh chỉ đọc sau khi chủ báo xong (2026-09-30, chiều):

- **Phiên bản: 1.38.** `node scripts/kiem-phien-ban.mjs --sau-deploy` → "ĐẠT: production đang chạy đúng bản 1.38."; `GET /api/auth/config` trả `"version":"1.38"`.
- **Chế độ bảo trì: ĐANG BẬT** (chủ bật lại 30/9), `endsAt` = 2026-10-04T06:21:00Z (13:21 giờ VN ngày 4/10).
- **Mã trên `main` / GitHub:** `origin/main` = e352e348 (nhánh `phat-hanh-1-38` = `giao-dien-dieu-phoi-luot-1` 6593df1 + Q-L3-B 43ae290/cb8df42 + e2e/Chrome + sổ hàng rào dòng Q-L3-B (chủ cho sửa 30/9) + changelog 1.38 + nhật ký 10.39–10.40; gộp `main` gồm `so-do-kien-truc` 45327822). Kiểm độc lập: Q-L3-B ĐẠT CÓ ĐIỀU KIỆN (VỪA-1 đã xử lý ở 947dddc); áp luật lần 17–18 ĐẠT CÓ ĐIỀU KIỆN (VỪA-1 đã sửa ở 2ba0e2c); **kiểm cuối K3 @e16ccfbe ĐẠT CÓ ĐIỀU KIỆN** (chỉ THẤP-1, đã sửa ở cf7aae4b), e2e 30/30. Sau lần sửa cuối: `npm test` hai bước thoát 0, typecheck 0.
- **Worker:** `wrangler deployments list` → mới nhất **d5214617-5c05-4c61-952a-7946617e4d3b**, tạo 2026-09-30T08:11:39Z. Mốc lùi: d886c111-a7d9-4c2d-ac9f-6e5620c9eaf5 (1.37). Lùi Worker về 1.37 an toàn về dữ liệu theo phân tích của người kiểm K3 (migration chỉ thêm; mã 1.37 không đọc bảng chặng mới, không xoá đơn; chưa có chuyến) — **chưa thử lùi thật**; sau khi lùi, chặng thành bản cũ dần (mã 1.37 chỉ ghi cột cũ).
- **Migration D1:** `0034_chang_dua_don`, `0035_hanh_khach`, `0040_dat_gap_chang`, `0041_chinh_sach_dieu_phoi`, `0042_chuyen_xe`, `0043_nhac_goi_bao` đã áp — `wrangler d1 migrations list --remote` → "No migrations to apply!". Trước phát hành remote chờ đúng sáu tệp này (kiểm 30/9).
- **Kiểm dữ liệu:** `audit-invariants --db remote` → "Mọi bất biến đạt, 2 cảnh báo (D1 remote)":
  - ⚠ **R-VC-14 = 12** (6 xe × Kiểm định + Bảo hiểm TNDS, khớp truy vấn chủ chạy trước phát hành). Quản trị nhập giấy **trước khi** dùng Điều phối cho chuyến thật.
  - ⚠ **R-ORD-8 = 2**: chặng mở của đơn đã xác nhận, ngày đón từ hôm nay trở đi, chưa chốt nơi trả (tình trạng nghiệp vụ, không chặn phát hành). **Sửa 30/9:** bản 1.38 CHƯA có màn nào ghi được nơi trả — đơn lập bằng màn hiện tại tạo chặng không nơi trả (`src/shared/chang-dua-don.ts:237`), chỉ đơn cũ được `0034` chép "Nơi check-in"; chặng thiếu nơi trả vẫn xếp được nhưng chuyến bị giữ `CHUA_CO_NOI_TRA` (`src/shared/dieu-phoi-kiem.ts:326`). Số này sẽ TĂNG dần cho tới khi có ADR-0047 Phần B; không phải việc văn phòng làm được hôm nay.
- **AI kiểm công khai (không đăng nhập):** `GET /api/van-chuyen/lich` → 401.
- **Quyết định chủ 30/9:** phát hành nhưng **CHƯA dùng Bảng điều phối cho chuyến thật** cho tới khi có màn nhập tên khách (ADR-0047 Phần B) — chuyến có khách bị giữ `THIEU_TEN` vì `require_manifest` = 1. Mốc 6 giờ có hiệu lực ngay với việc xác nhận đơn: chỉ Quản trị / Toàn quyền bấm "Đặt gấp" — cần báo nhân viên (chưa kiểm đã báo hay chưa).
- **Chưa kiểm:** thao tác thật bằng tài khoản đã đăng nhập (Đặt gấp, Chính sách điều phối, Cuốc của tôi); iPhone thật.
- **Kế tiếp:** ADR-0047 Phần B (chờ bản vẽ); **Sổ tiền lượt 1** (phiên mới, theo `docs/superpowers/plans/2026-09-29-so-tien-luot-1-ke-hoach.md` — Task 0 đo lại, migration ≥ 0044); rồi ADR-0057 T1/T2 → ADR-0052 A-1b, ADR-0053 A-2; ADR-0054/0055/0056 và A-1 theo điều phối. Bỏ nhãn [1.38] trong `docs/so-do-kien-truc/README.md` (§13 của tệp).

## TRẠNG THÁI TRIỂN KHAI (cũ) — Phiên bản 1.37: nhà xe đối tác + tài xế đối tác (ADR-0048 — vai `CARRIER`, quan hệ "Tài xế của", xe của nhà xe, quyền `DRIVER_PARTNER`, LC-1 mới + LC-1b; migration `0037`–`0039`) ĐÃ LÊN PRODUCTION (2026-09-29 14:48 giờ VN, chủ dự án tự chạy `npm run day-len -- phat-hanh-1-37` rồi `npm run trien-khai`)

AI (phiên điều phối) kiểm bằng lệnh chỉ đọc sau khi chủ báo xong (2026-09-29, chiều):

- **Phiên bản: 1.37.** `node scripts/kiem-phien-ban.mjs --sau-deploy` → "ĐẠT: production đang chạy đúng bản 1.37."; `GET /api/auth/config` trả `"version":"1.37"`.
- **Chế độ bảo trì: ĐANG BẬT**, `endsAt` = 2026-10-02T07:16:00Z (14:16 giờ VN ngày 2/10). Lúc kiểm 1.36 (sáng 29/9) còn tắt. Chưa rõ chủ bật có chủ ý hay không — đã hỏi chủ.
- **Mã trên `main` / GitHub:** `origin/main` = `main` = 4c2913c (nhánh `phat-hanh-1-37`: ADR-0048 Phần A + B, R-B1, K1; luật chủ duyệt đã áp — `CLAUDE.md`, `src/CLAUDE.md`, `web/CLAUDE.md`, `docs/ARCHITECTURE.md`, `docs/SO-HANG-RAO.md`; tài liệu ADR-0047/0049 + kế hoạch; tài liệu tham khảo `docs/Ref/transportation-kernel-travel-erp.md` của chủ). Kiểm độc lập: Phần A ĐẠT (3d8f4b0); K2 ĐẠT CÓ ĐIỀU KIỆN (5a024b4, điều kiện = chủ duyệt mục 5 — đã có); soát phần áp luật + lần gộp ĐẠT (149ffc1). `npm test` 1375/1375, typecheck 0.
- **Triển khai:** e2e của `npm run trien-khai` đỏ thoáng qua hai lần (lần 1: `catalog`; lần 2: `catalog` + `dispatch`; một lần chạy riêng `catalog` đỏ ở `tests/e2e/catalog.mjs:121` = Google Sheet 502 `sheet_unreachable` lúc "kéo lại"). Điều phối chạy lại riêng `catalog` + `dispatch` trên đúng mã (4c2913c + một tệp tài liệu) → **2/2 xanh, thoát 0**; `curl` Sheet 200 hai lần. Chủ chọn đi tiếp ("c") ở câu hỏi e2e của lượt thứ hai. Nguyên nhân khả dĩ: Google Sheet chập chờn + máy bận vì nhiều phiên chạy e2e song song — **chưa kiểm chắc** cho `dispatch`.
- **Worker:** `wrangler deployments list` → mới nhất **d886c111-a7d9-4c2d-ac9f-6e5620c9eaf5**, tạo 2026-09-29T07:48:19Z. Mốc lùi: d6db34a6-025d-4862-8ff0-fe4eca065f24 (1.36). Lùi Worker an toàn về dữ liệu (migration chỉ thêm; trigger LC-1 tạo lại chỉ nới thêm `DRIVER_PARTNER`, mã 1.36 không tạo quyền đó).
- **Migration D1:** `0037_tai_xe_doi_tac`, `0038_nha_xe_doi_tac`, `0039_chu_xe_nha_xe` đã áp — `wrangler d1 migrations list --remote` → "No migrations to apply!". **Kiểm dữ liệu:** `audit-invariants --db remote` → "Mọi bất biến đạt (D1 remote)." (có R-LC-1 mới, R-LC-1b, R-PTY-5).
- **AI kiểm công khai (không đăng nhập):** `GET /api/van-chuyen/nha-xe`, `/api/van-chuyen/xe?chu=cong-ty`, `/api/parties/documents/mine` đều 401.
- **Chưa kiểm:** thao tác thật bằng tài khoản đã đăng nhập (tạo nhà xe, tài xế đối tác, xe của nhà xe, đăng nhập bằng tài khoản Tài xế đối tác); iPhone thật.
- **Kế tiếp:** ADR-0047 (chặng đưa đón; `0034`–`0035`) Phần B chờ bản vẽ; ADR-0049 (Bảng điều phối; `0040`–`0042`) lát 1.1/1.3 xong ở nhánh `thi-cong-adr-0049-song-song`, chờ chủ trả lời kẽ hở mốc 6 giờ (Q-A4-1) và "mốc 0 = tắt hẳn" (GA-5).

## TRẠNG THÁI TRIỂN KHAI (cũ) — Phiên bản 1.36: thông báo điện thoại tắt đúng máy (ADR-0046) + tách Danh mục giấy tờ theo chủ dữ liệu (không migration) ĐÃ LÊN PRODUCTION (2026-09-28 23:21 giờ VN, chủ dự án tự chạy `npm run day-len -- thong-bao-tat-dung-may` rồi `npm run trien-khai`)

AI (phiên điều phối) kiểm bằng lệnh chỉ đọc lúc 2026-09-29 (ghi muộn — phiên điều phối tưởng production còn 1.35 cho tới khi người thi công ADR-0048 chạy `kiem-phien-ban` thấy 1.36):

- **Phiên bản: 1.36.** `node scripts/kiem-phien-ban.mjs --sau-deploy` → "ĐẠT: production đang chạy đúng bản 1.36."; `GET /api/auth/config` trả `"version":"1.36"`.
- **Chế độ bảo trì: TẮT** (`maintenance.on: false`, `endsAt: null`).
- **Mã trên `main` / GitHub:** `origin/main` = `main` = ce831f8 (nhánh `thong-bao-tat-dung-may`: ADR-0046, tách hai trang Danh mục giấy tờ, hai dòng `web/CLAUDE.md` chủ duyệt 28/9 tối; nhật ký thay đổi 1.36 ở c9d1f28). Kiểm độc lập cuối ĐẠT (sổ `docs/superpowers/plans/` của ADR-0046 và việc tách Danh mục giấy tờ).
- **Worker:** `wrangler deployments list` → mới nhất **d6db34a6-025d-4862-8ff0-fe4eca065f24**, tạo 2026-09-28T16:21:41Z. Mốc lùi: 673d1843-2310-46e1-b03d-89b358432c1e (1.35). Lùi an toàn về dữ liệu (1.36 không có migration).
- **Migration D1:** không có migration mới; `wrangler d1 migrations list --remote` → "No migrations to apply!". **Kiểm dữ liệu:** `audit-invariants --db remote` → "Mọi bất biến đạt (D1 remote)."
- **Chưa kiểm:** thông báo điện thoại còn bật sau đăng xuất ở MỘT máy khác (thử tay hai máy thật); iPhone thật.
- **Kế tiếp:** Vận chuyển — ADR-0048 (nhà xe, tài xế đối tác; migration `0037`–`0039`; bản tạm 1.37) đang kiểm độc lập cuối; ADR-0047 (chặng đưa đón, danh sách khách; `0034`–`0035`) Phần A xong, Phần B chờ bản vẽ; ADR-0049 (Bảng điều phối; `0040`–`0042`) có kế hoạch, đang kiểm.

## TRẠNG THÁI TRIỂN KHAI (cũ) — Phiên bản 1.35: Vận chuyển lượt 1a (ADR-0040 — xe, giấy tờ xe, giấy tờ của người, tài khoản "Tài xế công ty", danh sách giấy tờ sắp hết hạn; migration `0031`–`0033`) ĐÃ LÊN PRODUCTION (2026-09-28 21:17 giờ VN, chủ dự án tự chạy `npm run day-len -- dac-ta-van-chuyen` rồi `npm run trien-khai`)

AI (phiên điều phối) kiểm bằng lệnh chỉ đọc lúc 2026-09-28 21:20 giờ VN:

- **Phiên bản: 1.35.** `node scripts/kiem-phien-ban.mjs --sau-deploy` → "ĐẠT: production đang chạy đúng bản 1.35."; `GET /api/auth/config` trả `"version":"1.35"`.
- **Chế độ bảo trì: ĐANG BẬT**, `endsAt` = 2026-09-30T07:32:00Z (14:32 giờ VN ngày 30/9) — người không có trong danh sách được phép chưa đăng nhập được để thử.
- **Mã trên `main` / GitHub:** `origin/main` = `main` = 3bb73f0 (nhánh `dac-ta-van-chuyen`, 67 commit: Phần A máy chủ, Phần B giao diện, luật đã áp theo chủ duyệt, mục trạng thái 1.34). `npm test` 1306/1306, typecheck 0. Kiểm độc lập: mốc A24 ĐẠT CÓ ĐIỀU KIỆN; cuối K2 ĐẠT CÓ ĐIỀU KIỆN trên 1a2fe66 (e2e đủ bộ 24/24, 8/8 kịch bản Chrome Phần B, 0 CAO/VỪA); soát phần áp luật ĐẠT trên 3bb73f0. Nhật ký thi công: `docs/superpowers/plans/2026-09-28-van-chuyen-1a-thi-cong-nhat-ky.md`.
- **Worker:** `wrangler deployments list` → mới nhất **673d1843-2310-46e1-b03d-89b358432c1e**, tạo 2026-09-28T14:17:59Z. Mốc lùi: 88993f56-4b18-4eba-bf8a-08693c4d13b0 (1.34). Lùi Worker an toàn về dữ liệu (migration chỉ thêm); dưới mã cũ tài khoản tài xế đăng nhập được nhưng không có quyền nào, vai hiện "chưa gán vai" (kế hoạch `docs/superpowers/plans/2026-09-28-van-chuyen-1a.md` mục 11).
- **Migration D1:** `0031_vai_quyen_tai_xe`, `0032_giay_to_cua_nguoi`, `0033_van_chuyen_xe` đã áp — `wrangler d1 migrations list --remote` → "No migrations to apply!". **Kiểm dữ liệu:** `audit-invariants --db remote` → "Mọi bất biến đạt (D1 remote)." (có R-PTY-1..4, R-VC-1..2).
- **AI kiểm công khai (không đăng nhập):** `GET /api/van-chuyen/xe`, `/api/van-chuyen/sap-het-han`, `/api/parties/documents/mine` đều 401.
- **Vai "Tài xế" cũ trên production:** chủ tự chạy truy vấn chỉ đọc sau triển khai → đang giữ 0, tổng 0 dòng — không hồ sơ nào cần chuyển; tài xế mới tạo bằng vai "Tài xế công ty".
- **Chưa kiểm:** thao tác thật bằng tài khoản đã đăng nhập (15 bước thử tay đã gửi chủ, theo kế hoạch mục 9 bước 7); iPhone thật.
- **Còn mở:** Quản trị ghi / xem đủ số giấy tờ của tài khoản cấp trên — chủ đã chọn "có" rồi hoãn ("Đưa lên bản hiện tại, sửa sau"), `docs/BACKLOG.md` mục 4; nợ nhỏ ở sổ thi công mục 6 (mốc nhắc giấy tờ người cố định 30 ngày, số giấy tờ của xe trong danh sách, bước Chrome cho việc che số khi rời trang); lượt 1b (chuyến xe) chưa bắt đầu.

## TRẠNG THÁI TRIỂN KHAI (cũ) — Phiên bản 1.34: hồ sơ công ty chủ (T2b — ADR-0024 điều 6, ADR-0043; migration `0030`) ĐÃ LÊN PRODUCTION (2026-09-28 12:00 giờ VN, chủ dự án tự chạy `npm run day-len` rồi `npm run trien-khai`)

AI (phiên điều phối) kiểm bằng lệnh chỉ đọc lúc 2026-09-28 18:02 giờ VN:

- **Phiên bản: 1.34.** `node scripts/kiem-phien-ban.mjs --sau-deploy` → "ĐẠT: production đang chạy đúng bản 1.34."; `GET /api/auth/config` trả `"version":"1.34"`.
- **Chế độ bảo trì: ĐANG BẬT.** `GET /api/auth/config` trả `maintenance.on: true`, `endsAt` = 2026-09-30T07:32:00Z (14:32 giờ VN ngày 30/9). Chỉ chủ dự án bật/tắt được (trang Tôi; bị khoá thì SQL ở phần Hoàn tác).
- **Mã trên `main` / GitHub:** `origin/main` = `main` = c276848.
- **Worker:** `wrangler deployments list` → mới nhất **88993f56-4b18-4eba-bf8a-08693c4d13b0**, tạo 2026-09-28T05:00:46Z. Bản ngay trước theo thời gian: abc3f213-8ff9-4178-9c5c-596b2c60a0aa (2026-09-28T04:14:52Z) — CHƯA đối chiếu bằng lệnh xem đó có phải bản 1.33 không. Lùi Worker về trước 1.34 an toàn về dữ liệu vì migration `0030` chỉ thêm (kế hoạch `docs/superpowers/plans/2026-09-28-t2b-ho-so-tour-dao.md` §9 "Hoàn tác").
- **Migration D1:** `wrangler d1 migrations list --remote` → "No migrations to apply!". **Kiểm dữ liệu:** `audit-invariants --db remote` → "Mọi bất biến đạt (D1 remote)."
- **Các bản 1.19–1.33 (27–28/9) không có mục trạng thái riêng ở tệp này.** Nội dung từng bản: `src/shared/changelog.ts` (số 1.32 để trống có chủ đích, xem chú thích mục 1.34 ở đó). Kiểm độc lập và việc còn treo của từng việc: sổ thi công tương ứng trong `docs/superpowers/plans/`.
- **Kế tiếp:** Vận chuyển lượt 1a (ADR-0040; migration `0031`–`0033`; dự kiến bản 1.35) đang thi công. Kế hoạch và runbook: `docs/superpowers/plans/2026-09-28-van-chuyen-1a.md`.

## TRẠNG THÁI TRIỂN KHAI (cũ) — Phiên bản 1.18: kiểm quyền chặt hơn (ADR-0019 Phần B) ĐÃ LÊN PRODUCTION (2026-09-27 10:02 giờ VN, chủ dự án tự chạy `npm run day-len -- gd2-cong-va-bang` rồi `npm run trien-khai`)

AI kiểm bằng lệnh chỉ đọc lúc 2026-09-27 sáng, giờ VN:

- **Phiên bản: 1.18.** `node scripts/kiem-phien-ban.mjs --sau-deploy` → "ĐẠT: production đang chạy đúng bản 1.18."; `GET /api/auth/config` trả `"version":"1.18"`, bảo trì `on:false`.
- **Mã trên `main` / GitHub:** `origin/main` = dc4b4f9 (nhánh `gd2-cong-va-bang`, 15 commit; 938 test, typecheck 0, e2e 21/21). Kiểm độc lập B9 (opus, chỉ đọc, tự chạy lại và tự làm hơn 15 phép đột biến): ĐẠT CÓ ĐIỀU KIỆN, 0 Critical; điều kiện đã xử lý (tài liệu bảo trì sửa; chủ chạy truy vấn P2 trước khi phát hành). Nhật ký thi công: `docs/superpowers/plans/2026-09-25-gd2-thi-cong-nhat-ky.md`.
- **Worker:** `wrangler deployments list` → bản mới nhất **7f7820a1-cc77-4397-ad91-77a3cfa14e51**, tạo 2026-09-27T03:02:17Z. Mốc lùi: b2c0d12f-02b0-43ea-9e6a-858319d1037a (1.17) — cùng cấu hình Durable Object, lùi về đó được.
- **Migration D1:** không có (`wrangler d1 migrations list --remote` → "No migrations to apply!"). **Kiểm dữ liệu:** `audit-invariants --db remote` → "Mọi bất biến đạt (D1 remote)."
- **AI kiểm công khai (không đăng nhập):** `/api/orders/dashboard`, `/api/orders`, `/api/catalog`, `/api/maintenance`, `/api/staff`, `/api/dispatch/handlers`, `/api/dispatch/assignees`, `/api/feedback`, `/api/audit`, `/api/bang-tin` đều 401.
- **Điều người dùng thấy khác:** (1) chỉ Toàn quyền có số điện thoại trong danh sách được phép mới bật/tắt được chế độ bảo trì; (2) Quản trị không còn thêm/kết thúc vai và quan hệ trên hồ sơ của Quản trị khác hoặc của Toàn quyền; (3) bốn chỗ chỉ siết ở máy chủ, giao diện không gọi: Kế toán `GET /api/dispatch/assignees` 403, Kế toán `PUT /api/orders/<id không tồn tại>/handler` 404→403, Thực tập và tài khoản không quyền `GET /api/dispatch/mine` 403.
- **Chưa kiểm:** thao tác thật bằng tài khoản đã đăng nhập trên production (chủ bật/tắt bảo trì ở trang Tôi; Quản trị mở hồ sơ); iPhone thật.
- **Còn mở:** Phần C (hướng dẫn viên xem mọi đơn, ADR-0017) CHƯA được bắt đầu — chủ phải quyết xung đột ADR-0019 điều 3 ↔ ADR-0028 (hướng dẫn viên vào cổng màn đơn sẽ đọc được bảng giá qua `GET /api/catalog`); khuyến nghị: route danh mục riêng cho người lập đơn + sửa ADR-0028 (đã giải quyết bằng ADR-0033 + route `/api/catalog/for-order`, bản 1.19 — chờ chủ day-len/triển khai). `docs/quyen-hoan.json` chỉ còn `task.progress`, `dispatch.guides.view` (hạn 2026-11-30) và bốn mục N3 (hạn 2026-12-31). ADR-0019 đã lên production nên điều kiện "dừng dây chuyền" của đặc tả Đơn tự do (`money.view`, `contact.view`) đã hết; có thể soạn ADR-0030..0032 khi chủ ra lệnh.

## TRẠNG THÁI TRIỂN KHAI (cũ) — Phiên bản 1.17: dòng báo "tạm chưa được giảm giá" của Đối tác nằm gọn một hàng ĐÃ LÊN PRODUCTION (2026-09-26 20:09 giờ VN, chủ dự án tự chạy `npm run day-len -- worktree-sua-dong-giam-gia-doi-tac` rồi `npm run trien-khai`)

AI kiểm bằng lệnh chỉ đọc lúc 2026-09-26 tối, giờ VN:

- **Phiên bản: 1.17.** `node scripts/kiem-phien-ban.mjs --sau-deploy` → "ĐẠT: production đang chạy đúng bản 1.17."; `/js/login.js` công khai có `version:"1.17"`, `/js/order-form.js` có `discount-hint`.
- **Mã trên `main` / GitHub:** `origin/main` = c408616 (524f2ac bản 1.17 + c408616 hai dòng `web/CLAUDE.md` chủ đã duyệt "đồng ý cả hai"); 909 test, typecheck 0, kiểm độc lập ĐẠT CÓ ĐIỀU KIỆN (điều kiện: chủ biết day-len gộp cả dòng luật — đã báo, chủ đồng ý).
- **Worker:** `wrangler deployments list` → bản mới nhất **b2c0d12f-02b0-43ea-9e6a-858319d1037a**, tạo 2026-09-26T13:09:38Z. Mốc lùi: ce51b35f-2c3e-4845-9562-5eca7021ed7a (1.16) — cùng cấu hình Durable Object, lùi về đó được; KHÔNG lùi xa hơn (xem mục 1.16).
- **Migration D1:** không có. **Kiểm dữ liệu:** `audit-invariants --db remote` → "Mọi bất biến đạt (D1 remote)."
- **Chưa kiểm:** nhìn trên iPhone thật; đăng nhập tài khoản Đối tác thật.

## TRẠNG THÁI TRIỂN KHAI (cũ) — Phiên bản 1.16: Bảng tin (thông báo tức thì, ADR-0022) ĐÃ LÊN PRODUCTION (2026-09-26 17:03 giờ VN, chủ dự án tự chạy `npm run day-len -- bang-tin` rồi `npm run trien-khai`)

Số liệu do chủ báo từ kết quả `npm run trien-khai`; phần "AI kiểm" là lệnh chỉ đọc của AI lúc 2026-09-26 chiều, giờ VN:

- **Phiên bản: 1.16.** Chủ báo cổng phiên bản trước và sau deploy đều ĐẠT. AI kiểm: `node scripts/kiem-phien-ban.mjs --sau-deploy` → "ĐẠT: production đang chạy đúng bản 1.16."; `GET /api/auth/config` trả `"version":"1.16"`, bảo trì `on:false`.
- **Mã trên `main` / GitHub:** `origin/main` = 260b92b (nhánh `bang-tin`, đã gộp `main` bản 1.15 vào nhánh trước khi gộp ngược; 909 test, e2e 21/21 lúc phát hành).
- **Worker:** `wrangler deployments list` → bản mới nhất **ce51b35f-2c3e-4845-9562-5eca7021ed7a**, tạo 2026-09-26T10:03:00Z. Bản ngay trước: 7edc1093-c19c-457c-a55c-e02170640096 (1.15). **KHÔNG dùng `wrangler rollback` về bản đó**: lần deploy này mang migration Durable Object (tag `v1`, `new_sqlite_classes`), là cửa một chiều mềm; cách lùi ở mục "Bảng tin (thông báo tức thì, ADR-0022) — ĐÃ PHÁT HÀNH bản 1.16" (Điểm lùi) bên dưới.
- **Migration D1:** không có (chủ báo "Migration đã áp: không có"). Migration Durable Object đi cùng `wrangler deploy`; chưa kiểm được bằng lệnh chỉ đọc.
- **Kiểm dữ liệu:** chủ báo `audit-invariants --db remote` ĐẠT; AI chạy lại: "Mọi bất biến đạt (D1 remote)."
- **AI kiểm công khai (không đăng nhập):** `GET /api/bang-tin` → 401, và `GET` kèm `Upgrade: websocket` → 401 (điểm cuối có mặt, cổng đăng nhập canh trước); `Content-Security-Policy` của `/orders` có `connect-src 'self' wss://booking.tourdao.vn https://challenges.cloudflare.com`.
- **Chưa kiểm:** kết nối Bảng tin THẬT trên production (cần đăng nhập): mở hai tài khoản thật, một bên bấm "Nhận", bên kia phải tự đổi trong vài giây; iPhone thật (Task 13: khoá màn hình ≥ 1 phút rồi mở lại); trình đọc màn hình; Durable Object thật dưới tải; gói/chi phí Cloudflare. Việc còn treo và các câu chờ chủ: `docs/superpowers/plans/2026-09-25-bang-tin-de-xuat-luat.md`.

## TRẠNG THÁI TRIỂN KHAI (cũ) — Phiên bản 1.15: Đối tác và Thực tập xem danh mục chỉ-đọc (ADR-0028) ĐÃ LÊN PRODUCTION (2026-09-26 14:30 giờ VN, chủ dự án tự chạy `npm run day-len -- mo-danh-muc-doi-tac` rồi `npm run trien-khai`)

AI kiểm lại bằng lệnh chỉ đọc lúc 2026-09-26 chiều, giờ VN:

- **Phiên bản: 1.15.** `node scripts/kiem-phien-ban.mjs --sau-deploy` → "ĐẠT: production đang chạy đúng bản 1.15."; `GET /api/auth/config` trả `"version":"1.15"`, bảo trì `on:false`. `GET /api/catalog` chưa đăng nhập → 401 (danh mục vẫn đóng với người ngoài).
- **Mã trên `main` / GitHub:** `origin/main` = 7f1654d (nhánh `mo-danh-muc-doi-tac`, 3 commit từ 1c37641).
- **Worker:** `wrangler deployments list` → bản mới nhất **7edc1093-c19c-457c-a55c-e02170640096**, tạo 2026-09-26T07:30:22Z. Mốc lùi (bản ngay trước): **16742d55-e256-48c5-93f1-532c698d40fa** (bản 1.14). Trước nữa: 6ebf4e78 (1.13).
- **Migration:** "No migrations to apply" (lần này không có migration).
- **Kiểm dữ liệu:** `node scripts/audit-invariants.mjs --db remote` → "Mọi bất biến đạt (D1 remote)".
- **Kiểm trước khi gộp:** `npm test` 817/817, `tsc` 0, `test:e2e` 20/20; Chrome `doi-tac-lap-don-smoke.mjs` 6/6 (Đối tác chọn dịch vụ, ô giá/giảm giá khoá, lưu đơn; Bán hàng không bị khoá; axe 0); người kiểm độc lập (chỉ đọc) ĐẠT sau 2 vòng (vòng 1 bắt thiếu tệp ADR-0028). Bằng chứng: `docs/evidence/2026-09-26-mo-danh-muc-doi-tac/`.
- **Chưa kiểm:** trên iPhone thật. **Có từ trước, chưa sửa:** trang chi tiết đơn của Đối tác gọi `GET /api/dispatch/handlers` → 403 (cổng `office`) nên khối người phụ trách hiện "Chưa tải được người phụ trách."; dòng "tạm chưa được giảm giá" xuống 3 hàng ở khổ máy tính.

## TRẠNG THÁI TRIỂN KHAI (cũ) — Phiên bản 1.14: vá 3 phát hiện kiểm toán HIGH (DK-T3-01, DK-T3-02, DK-T4-02; ADR-0027) ĐÃ LÊN PRODUCTION (2026-09-26 12:20 giờ VN, chủ dự án tự chạy `npm run day-len -- va-3-loi-kiem-toan` rồi `npm run trien-khai`)

AI kiểm lại bằng lệnh chỉ đọc lúc 2026-09-26 trưa, giờ VN:

- **Phiên bản: 1.14.** `node scripts/kiem-phien-ban.mjs --sau-deploy` → "ĐẠT: production đang chạy đúng bản 1.14."; `GET /api/auth/config` trả `"version":"1.14"`, bảo trì `on:false`.
- **Mã trên `main` / GitHub:** `origin/main` = 0aebb92 (nhánh `va-3-loi-kiem-toan`, 12 commit từ 823c1b1). Lần `trien-khai` đầu KHÔNG phát hành (kiểm lúc đó production vẫn 1.13, không có deployment mới, không rõ dừng ở bước nào — AI không thấy output); lần chạy thứ hai phát hành.
- **Worker:** `wrangler deployments list` → bản mới nhất **16742d55-e256-48c5-93f1-532c698d40fa**, tạo 2026-09-26T05:20:57Z. Mốc lùi (bản ngay trước): **6ebf4e78-748e-4b4b-81a8-d3a96d9014e4** (2026-09-25T12:45Z — bản 1.13). Trước nữa: b6466b25 (2026-09-25T11:23Z).
- **Migration:** `wrangler d1 migrations list tourdao-sales-db --remote` → "No migrations to apply" (lần này không có migration).
- **Kiểm dữ liệu:** `node scripts/audit-invariants.mjs --db remote` → "Mọi bất biến đạt (D1 remote)", không cảnh báo.
- **Kiểm trước khi gộp:** `npm test` 817/817, `tsc` 0, `test:e2e` 20/20; Chrome `va3-smoke` 8/8 và các kịch bản hồi quy (a2-smoke ×3, dot-a, dot-c, v1-nguoi-phu-trach, v1-xac-nhan-png, trang-chu-smoke); người kiểm độc lập (chỉ đọc) ĐẠT sau 2 vòng. Nhật ký: `docs/superpowers/plans/2026-09-26-va-3-loi-kiem-toan-nhat-ky.md`; bằng chứng: `docs/evidence/2026-09-26-va-3-loi-kiem-toan/`. `docs/quyen-hoan.json` mục `phat_hien` nay rỗng.
- **Chưa kiểm:** trên iPhone thật ở production (hộp hỏi lại khi HDV huỷ, dịch vụ nhập tay cũ chỉ xem). Đơn Đối tác đã xác nhận trước bản vá chưa được rà lại.
- **Mục trạng thái này từng đứng yên ở 1.6 trong khi production đã lên 1.7…1.13** (DK-T1-01; các nhánh ghi trạng thái 1.7/1.10/1.12 chưa gộp). Mục dưới đây là lịch sử, không phản ánh các bản 1.7–1.13.
- **Hạn tiếp theo trong `docs/quyen-hoan.json`:** 17 mục hoãn quyền hết hạn **2026-10-15** (ADR-0019 / GĐ2) — quá hạn `npm test` đỏ.

## TRẠNG THÁI TRIỂN KHAI (cũ) — Phiên bản 1.6: trang Đăng nhập theo bản thiết kế Claude Design + đổi tên app "Island Booking System" ĐÃ LÊN PRODUCTION (2026-09-24 19:06 giờ VN, chủ dự án tự chạy `npm run day-len -- worktree-dang-nhap-v2` rồi `npm run trien-khai`)

AI kiểm lại bằng lệnh chỉ đọc lúc 2026-09-24 tối, giờ VN:

- **Phiên bản: 1.6.** `node scripts/kiem-phien-ban.mjs --sau-deploy` → "ĐẠT: production đang chạy đúng bản 1.6." (thoát 0); `GET /api/auth/config` trả `"version":"1.6"`; `GET /login` có `<h1>Tour Đảo Booking</h1>`, `#pin-count`, nút Face ID `aria-label="Đăng nhập bằng Face ID / vân tay"`, "Hỗ trợ kỹ thuật"; `GET /manifest.webmanifest` → `name` "Island Booking System", `short_name` "Island Booking".
- **Mã trên `main` / GitHub:** bản 1.6 = c305994 (nhánh `worktree-dang-nhap-v2`); sau đó `origin/main` = 55ee6bf (chỉ sửa một dòng `docs/CHANGE-GUIDE.md`, không đổi mã chạy — lần `trien-khai` thứ hai chủ dừng ở cổng phiên bản bằng `k`, đúng: không có gì để deploy).
- **Worker:** `wrangler deployments list` → bản mới nhất **26e05e67-515c-4354-92ae-03ad23a69ccc**, tạo 2026-09-24T12:06:55Z. Mốc lùi (bản ngay trước): **22f29c8d-d7d9-431f-8601-c585d7e414d8** (2026-09-24T08:18Z — bản 1.5, chưa từng được ghi ở mục này). Trước nữa: 7ce5b2f1 (bản 1.4).
- **Migration:** `wrangler d1 migrations list tourdao-sales-db --remote` → "No migrations to apply" (lần này không có migration mới).
- **Kiểm dữ liệu:** `node scripts/audit-invariants.mjs --db remote` → "Mọi bất biến đạt (D1 remote)".
- **Kiểm trước khi gộp:** `npm test` 656/656, `tsc` 0, `test:e2e` 18/18; kịch bản Chrome `dang-nhap-v2` 5/5, `v1-dang-nhap` 15/15, `passkey-smoke`, `v1-bao-tri`, `trang-chu-smoke`, `dot-c-smoke`, `help-smoke` đạt; người kiểm độc lập (chỉ đọc) kết luận ĐẠT, tự chạy lại. Bằng chứng: `docs/evidence/2026-09-24-dang-nhap-v2/`.
- **Chế độ bảo trì vẫn BẬT** tới 2026-09-26T04:15Z (11:15 giờ VN ngày 26/9); `trien-khai` không đụng tới.
- **Chưa kiểm:** trang Đăng nhập mới và Face ID trên iPhone thật ở production; app đã cài trên iPhone giữ tên cũ dưới biểu tượng tới khi cài lại. Kết quả in ra của lần `trien-khai` deploy 1.6 AI không thấy — các kiểm chỉ đọc ở trên làm lại sau.
- **Chờ chủ:** ghi quyết định đổi tên app vào đặc tả (`docs/SYSTEM-DESIGN.md` §16 đã ghi lệch); `web/CLAUDE.md` còn nhắc "cột thương hiệu" (tệp luật — AI chỉ đề xuất).

## TRẠNG THÁI TRIỂN KHAI (cũ) — Phiên bản 1.4: trang Trợ giúp + nhật ký thay đổi ĐÃ LÊN PRODUCTION (2026-09-24 08:27 giờ VN, chủ dự án tự chạy `npm run day-len -- worktree-changelog-tro-giup` rồi `npm run trien-khai`)

AI kiểm lại bằng lệnh chỉ đọc lúc 2026-09-24, khoảng 08:35 giờ VN:

- **Phiên bản: 1.4.** `node scripts/kiem-phien-ban.mjs --sau-deploy` → "ĐẠT: production đang chạy đúng bản 1.4." (thoát 0); `GET /api/auth/config` trả `"version":"1.4"`; `GET /help` → 200.
- **Mã trên `main` / GitHub:** `origin/main` = d00f8d4 (gộp nhánh `worktree-changelog-tro-giup`, đã chứa Đợt D + sửa Đối tác).
- **Worker:** `wrangler deployments list` → bản mới nhất **7ce5b2f1-c3a0-46af-9282-a26daca31114**, tạo 2026-09-24T01:27:05Z. Mốc lùi (bản ngay trước): **feed0f32-d579-4fe5-93ef-654932b72c4d** (2026-09-23T23:48Z). Trước nữa: ad71111d (2026-09-23T15:42Z) — hai lần deploy Đợt D/sửa Đối tác này chưa từng được ghi ở đây.
- **Migration:** `wrangler d1 migrations list tourdao-sales-db --remote` → "No migrations to apply" (lần này không có migration mới).
- **Kiểm dữ liệu:** `node scripts/audit-invariants.mjs --db remote` → "Mọi bất biến đạt (D1 remote)", thoát 0.
- **Lần chạy `trien-khai` đầu tiên dừng ở `npm test`**, không ghi gì lên remote: test đo thời gian `guard-remote: lệnh dị dạng không làm hook quá giờ` (`src/claude-guard.test.ts:162`) chạy 2003 ms > ngưỡng 1500 ms khi máy bận (tải trung bình ≈ 7,9). Chạy lại thì qua. Nợ: test này chập chờn khi máy bận; nới ngưỡng = nới kiểm của hàng rào → chủ quyết.
- **Chế độ bảo trì vẫn BẬT** tới 2026-09-24T06:59Z (13:59 giờ VN); `trien-khai` không đụng tới.
- **Chưa kiểm:** trang Trợ giúp, chấm đỏ, menu dọc trên iPhone/iPad thật ở production.

## TRẠNG THÁI TRIỂN KHAI (cũ) — Đăng nhập bằng Face ID (ADR-0016 lát 1) ĐÃ LÊN PRODUCTION (2026-09-23 19:48 giờ VN, chủ dự án tự chạy `npm run trien-khai`)

Chủ chạy lệnh ở ứng dụng Terminal. Khối tóm tắt lệnh in ra không hiện trên màn hình của chủ, nên các dòng dưới đây do AI **kiểm lại bằng lệnh chỉ đọc** lúc 2026-09-23, khoảng 20:00 giờ VN.

- **Mã trên `main` / GitHub:** `origin/main` = 854187f (Face ID + hai lệnh `day-len`/`trien-khai`), đẩy bằng `npm run day-len`.
- **Migration:** `wrangler d1 migrations list tourdao-sales-db --remote` báo "No migrations to apply", tức `0023_auth_passkey.sql` đã áp.
- **Worker:** `wrangler deployments list` cho bản mới nhất là **e86521ba-9d8d-43ef-acf5-a95df037cd6f**, tạo 2026-09-23T12:48:33Z. Bản ngay trước (mốc lùi): **0dbc79f0-8cdb-4955-b46f-6c38de598355**.
- **Kiểm dữ liệu:** `node scripts/audit-invariants.mjs --db remote` cho kết quả "Mọi bất biến đạt (D1 remote)", 17 mục, gồm R-AUT-1.
- **e2e trước khi deploy:** 16/17. Kịch bản `catalog` đỏ vì giá TTB03 trên Google Sheet đã đổi thành 1.300.000; chủ chọn tiếp tục. Test đó cần sửa số kỳ vọng.
- **GET công khai:**
  - `GET /api/auth/config` trả `passkey: true`;
  - `/login` trả 200 và có nút `#passkey-login` (ẩn sẵn, chỉ hiện trên máy hỗ trợ).
- **Chế độ bảo trì đang BẬT:** `GET /api/auth/config` trả `maintenance.on = true`, hết hạn 2026-09-24T06:59Z (13:59 giờ VN). Việc bật do chủ làm, không do lệnh triển khai. Lệnh `trien-khai` không đụng tới chế độ bảo trì.
- **Điểm khôi phục Time Travel:** lệnh đã in nhưng chủ không thấy. Lấy lại bằng `wrangler d1 time-travel info tourdao-sales-db --timestamp=2026-09-23T12:45:00Z` (chỉ đọc).
- **Lỗi hiển thị của `npm run trien-khai` (cần điều tra):** sau câu hỏi e2e, chủ không thấy thêm dòng nào, nhưng lệnh vẫn chạy hết (áp migration, deploy, kiểm dữ liệu). Nghi vấn: bộ e2e chạy `wrangler dev` với stdin kế thừa, nên để terminal ở trạng thái lạ. Chưa kiểm. Tạm thời, sau khi chạy luôn kiểm lại bằng các lệnh chỉ đọc ở trên.
- **Chưa kiểm:** đăng nhập bằng Face ID trên iPhone thật ở production. Đây là việc của chủ, khi bảo trì tắt hoặc với SĐT được phép.

### Lịch sử: CHỜ TRIỂN KHAI (trước 2026-09-23 19:48)

**(Lúc viết đoạn này:) CHƯA merge vào `main`, CHƯA triển khai.** Đang ở nhánh thi công (`worktree-thi-cong-passkey`), migration `migrations/0023_auth_passkey.sql` (chỉ THÊM bảng `aut_passkey`) + mã module `auth`/`accounts` (10 route mới, xem `docs/SYSTEM-DESIGN.md` §7) + giao diện (`web/passkey.ts`, `web/login.ts`, `web/account.ts`, `web/staff.ts`). Đặc tả: `docs/superpowers/specs/2026-09-23-passkey-design.md`; kế hoạch: `docs/superpowers/plans/2026-09-23-passkey.md`. Đối chiếu 2026-09-23 (chỉ đọc, `wrangler d1 migrations list tourdao-sales-db --remote`): `0023_auth_passkey.sql` là migration DUY NHẤT chưa áp — mọi migration khác (`0015`…`0022`, KHÔNG có `0019`) đều đã lên production.

- **"8b" (ngưng tài khoản thì gỡ Face ID) ĐÃ LÀM trên nhánh này (2026-09-23, chủ chọn A-4 phương án 1: gỡ trong CÙNG lô ghi).** `PATCH /api/staff/:id` với `active: false` gỡ mọi Face ID của tài khoản bị ngưng trong CÙNG `db.batch()` với câu ngưng: ba câu nối CUỐI batch — gỡ CÓ ĐIỀU KIỆN (chỉ khi tài khoản đang ngưng, đọc qua view `v_stf_staff_label`; câu chốt "còn quản trị viên khác" thua thì không gỡ gì), đẩy `credentials_changed_at` (thu hồi phiên cũ), nhật ký `passkey_removed` "gỡ khi ngưng tài khoản". Kích hoạt lại tài khoản KHÔNG làm Face ID cũ sống lại (e2e `passkey.mjs` bước 13 khẳng định). Bất biến `R-AUT-1` ("không có Face ID còn hiệu lực của tài khoản đã ngưng") vì thế luôn giữ trên đường API; sau khi triển khai, `audit-invariants --db remote` phải XANH HOÀN TOÀN, kể cả `R-AUT-1` — đỏ là lỗi thật, không có ngoại lệ. **Vẫn CHƯA triển khai:** 8b cần kiểm độc lập và gộp cùng nhánh này trước khi đi runbook `0023` bên dưới.
- **Lát 2 (đăng nhập bằng Google) CHƯA lập kế hoạch:** mô phỏng chuyển hướng qua tên miền khác ở lát 0 chưa có kết quả (`docs/evidence/2026-09-23-passkey/ket-luan-lat-0.md` mục "Mô phỏng Google") — phải thử lại trước khi lập kế hoạch lát 2.
- **Trạng thái kiểm tại nhánh (2026-09-23, Task 12 — CHƯA có người kiểm độc lập cho toàn bộ nhánh):** `npm test` 536/536 (thêm 4 test đỏ→xanh cho bất biến `R-AUT-1` ở `src/audit-invariants.test.ts`), `npm run typecheck` 0 lỗi. Việc lớn (CLAUDE.md §3, chạm dữ liệu/quyền/triển khai) — không tự báo "đạt", chờ subagent `nguoi-kiem-doc-lap` (kịch bản: `npm test`, `npm run typecheck`, `npm run test:e2e -- passkey platform admin turnstile maintenance`, đối chiếu tiêu chí đặc tả §4, và thử sửa cố ý một kiểm để xác nhận đỏ).

## CHỜ TRIỂN KHAI — ADR-0014 Phase A (tài khoản Đối tác/Super Admin, đóng D-01/D-02, điều 8)
**Ghi chú cập nhật (2026-09-22, phiên điều phối thiết kế giao diện — chỉ xác nhận qua lệnh chỉ đọc, KHÔNG xác minh nội dung Phase A):** dòng "CHƯA merge vào `main`" NGAY DƯỚI đây đã LỖI THỜI — `origin/main` hiện đã ở sau một merge PR (`kiem-toan-doi-tac`, #15) và `wrangler d1 migrations list --remote` báo "No migrations to apply" (tức `0020` đã áp production). KHÔNG rõ Phase A đã qua kiểm độc lập theo đúng quy trình hay chưa, và KHÔNG rõ chủ dự án đã tự chạy lệnh gán `SUPER_ADMIN` ở dưới chưa — người phụ trách việc ADR-0014 cần tự xác nhận lại, đoạn dưới đây giữ nguyên chưa sửa vì không thuộc phạm vi phiên này.

**(Đoạn gốc, có thể đã lỗi thời — xem ghi chú trên) CHƯA triển khai, CHƯA merge vào `main`.** Đang ở nhánh `kiem-toan-doi-tac`, migration `0020_partner_super_admin_permission_types.sql` (chỉ `INSERT` hai dòng `stf_permission_type`, không đổi schema). Kế hoạch: `docs/superpowers/plans/2026-09-22-adr-0014-phase-a-nen-tang-quyen.md`; quyết định: `docs/adr/ADR-0014-tai-khoan-doi-tac-super-admin-va-sua-sau-xac-nhan.md` (accepted) điều 1–3, 7, 8. **Đây chỉ là Phase A** (nền tảng quyền) — Phase B (hướng dẫn viên sửa/huỷ đơn), Phase C (CTV chọn người phụ trách, "xin nhận/duyệt"), Phase D (chấm đếm) CHƯA thi công; **chưa cấp tài khoản `PARTNER` thật nào** cho tới khi ít nhất Phase A đã qua kiểm độc lập VÀ merge lên `main`.
- **Việc của chủ dự án SAU KHI migration `0020` áp remote** (một lần, chủ tự chạy — không phải AI, `CLAUDE.md` §8): gán vai `SUPER_ADMIN` cho tài khoản của chủ (SĐT không gieo trong migration, theo bài học F-12):
  ```
  npx wrangler d1 execute tourdao-sales-db --remote --command "INSERT INTO stf_permission (id, staff_id, permission_type_code, valid_from_at, created_at, updated_at) SELECT lower(hex(randomblob(16))), s.id, 'SUPER_ADMIN', datetime('now'), datetime('now'), datetime('now') FROM staff s WHERE s.phone = '0989929373' AND NOT EXISTS (SELECT 1 FROM stf_permission p WHERE p.staff_id = s.id AND p.permission_type_code = 'SUPER_ADMIN' AND p.valid_to_at IS NULL)"
  ```
  Kiểm sau (chỉ đọc): `npx wrangler d1 execute tourdao-sales-db --remote --command "SELECT count(*) AS n FROM stf_permission WHERE permission_type_code = 'SUPER_ADMIN' AND valid_to_at IS NULL"` → `n = 1`.
- **Trạng thái kiểm tại nhánh (2026-09-22, phiên soạn kiêm thi công — CHƯA có người kiểm độc lập):** `npm test` 451/451, `npm run typecheck` 0 lỗi, `npm run test:e2e` 16/16 kèm `audit-invariants --strict` xanh. Việc lớn (CLAUDE.md §3) — không tự báo "đạt", chờ subagent kiểm độc lập chỉ đọc.

## TRẠNG THÁI TRIỂN KHAI — Trang chủ mới (`/home`, trang 12/12) ĐÃ LÊN PRODUCTION (2026-09-23, chủ dự án tự chạy lệnh) — ⚠️ CHƯA `git push`

**Mã:** `main` @ `4e7fcfd` (gộp fast-forward từ nhánh `worktree-trang-chu-moi`, không xung đột). Commit này bao gồm CẢ `f4d9cbd` (sửa `CLAUDE.md` §3: khi hỏi chủ chỉ dừng phần việc phụ thuộc câu trả lời) đã gộp trước đó.
**Worker mới:** version `5c582a74-ac7e-480a-99cb-0d4fd24f5ad6` (tạo 2026-09-23T02:38:47Z). **Version trước (để lùi nếu cần):** `65f96d96-8a51-44c0-a9e4-1209995aedcf` (bản 11/12 trang).

**⚠️ VIỆC CÒN THIẾU NGAY:** `origin/main` vẫn ở `3b5fc5b` — **mã đang chạy production CHƯA được đẩy lên GitHub**. Chủ dự án cần chạy `git push origin main` ở checkout gốc. Cho tới lúc đó, bản production chỉ tồn tại trên máy chủ dự án + Cloudflare, không có bản sao trên GitHub.

**Phạm vi:** trang mới `/home` (3 ô số liệu toàn công ty: còn thiếu tiền / đơn nháp chưa xác nhận / chưa có người phụ trách; danh sách "Chuyến đón hôm nay"; doanh thu tuần của riêng người đăng nhập). Route API mới `GET /api/orders/dashboard` (`access: "office"`) — **KHÔNG** đụng `GET /api/orders` hay `listOrders()`. Thêm 1 mục điều hướng "Trang chủ" + 1 icon. Quyết định chủ dự án ghi ở `docs/superpowers/specs/2026-09-23-trang-chu-moi-quyet-dinh.md`; nhật ký thi công + 4 bài học ở `docs/superpowers/plans/2026-09-22-thiet-ke-lai-giao-dien-thi-cong-nhat-ky.md` (mục cuối).

**Không có migration nào áp lần này** (`migrations list --remote` báo "No migrations to apply" cả trước lẫn sau — chỉ đổi mã, không đổi schema). Điểm khôi phục Time Travel ghi TRƯỚC deploy (không cần dùng): `00000204-00000000-000050ef-3f1630d6138c928f7eb89f4aa14f95e0`.

**Cổng trước khi deploy:** `npm test` 502/502, `npm run typecheck` 0 lỗi, `npm run test:e2e` 16/16 + `audit-invariants --strict` đạt, kịch bản Chrome `trang-chu-smoke.mjs` 12/12 thoát mã 0 (có bằng chứng P16 cho 2 lỗi chính). Ba task đều có kiểm độc lập riêng + một lượt kiểm gộp toàn cục; 4 lỗi hành vi thật đã tìm và sửa trước khi deploy.

**Kiểm SAU deploy (chỉ đọc, đã chạy 2026-09-23):** `GET /home` → 200; `GET /api/orders/dashboard` chưa đăng nhập → 401 (đúng, route cần quyền văn phòng); `GET /api/company` → 200; `node scripts/audit-invariants.mjs --db remote` → **mọi bất biến đạt** (16 kiểm). Chế độ bảo trì vẫn BẬT (dự kiến hết 2026-09-24T06:59Z) — deploy trong cửa sổ bảo trì, không ảnh hưởng người dùng thật.

**Chưa kiểm:** chưa ai mở `/home` bằng tài khoản thật trên production; chưa xem trên iPhone thật; chưa có chữ ký duyệt thị giác của chủ dự án.

## TRẠNG THÁI TRIỂN KHAI — Thiết kế lại giao diện, 11/12 trang (Bước 1 + Bước 2 Đợt A/B/C) ĐÃ LÊN PRODUCTION (2026-09-22, chủ dự án tự chạy lệnh; deploy trong lúc CHẾ ĐỘ BẢO TRÌ đang bật có chủ đích — không ảnh hưởng người dùng thật)

**Mã:** `main` @ `40026a7` (gộp fast-forward từ nhánh `thiet-ke-lai-giao-dien`, không có xung đột — `main` là tổ tiên trực tiếp của nhánh này). **Worker mới:** version `65f96d96-8a51-44c0-a9e4-1209995aedcf` (tạo 2026-09-22T17:23:06Z). **Worker/version trước (để lùi về nếu cần):** `b6907583-ab65-45a5-a010-bb46c728d6b6` (2026-09-22T14:13:40Z — bản này đã có sẵn việc ADR-0014 Phase A, xem ghi chú ở mục trên).

**Phạm vi:** 11/12 trang đã restyle theo `docs/superpowers/specs/2026-09-22-thiet-ke-lai-giao-dien-design.md` — Đơn hàng, Nhân viên, Dịch vụ & giá, Địa điểm, Hồ sơ, Nhật ký, Chi tiết đơn, Lập đơn, Đăng nhập, Tôi, Góp ý. **Chưa gồm:** Trang chủ mới (`/home`) — **cập nhật 2026-09-23:** đã THI CÔNG XONG trên nhánh `worktree-trang-chu-moi` (route riêng `GET /api/orders/dashboard`; **KHÔNG** đụng đến `GET /api/orders` hay cách `listOrders()` sắp xếp — API cũ giữ nguyên hành vi đang chạy production), đã qua một lượt kiểm gộp toàn cục + sửa hết các mục Important; **CHƯA gộp vào `main`, CHƯA deploy**. Chi tiết thi công/kiểm độc lập từng đợt: `docs/superpowers/plans/2026-09-22-thiet-ke-lai-giao-dien-thi-cong-nhat-ky.md`.

**Không có migration nào áp lần này** (`wrangler d1 migrations list --remote` báo "No migrations to apply" cả trước lẫn sau deploy — việc này chỉ đổi giao diện/API đọc, không đổi schema). Điểm khôi phục Time Travel ghi TRƯỚC khi deploy (không cần dùng vì không đổi dữ liệu): `000001d5-00000000-000050ee-94b7c5fc2a8dfd393a2a57ffbf65f937`.

**Cổng trước khi deploy (chỉ đọc, AI chạy):** `npm test` 490/490, `npm run typecheck` 0 lỗi (trên đúng cây mã sẽ deploy, kiểm trong worktree trước khi chủ gộp — cây giống hệt sau fast-forward); `audit-invariants --db remote` mọi bất biến đạt.

**Sau triển khai (chỉ đọc, AI xác nhận):** cả 11 trang (`/`, `/login`, `/order`, `/order-form`, `/staff`, `/catalog`, `/locations`, `/parties`, `/audit`, `/account`, `/feedback`) → 200; `/sw.js` `cache-control: no-store`; `/app.css` có token mới của bản thiết kế (`--w-main: 1200px`, `--h-order-skeleton: 180px` — xác nhận đúng bản mới đang chạy, không phải bản cache cũ); `GET /api/auth/config` xác nhận bảo trì vẫn bật đúng ý chủ (`endsAt` không đổi); `audit-invariants --db remote` chạy lại sau deploy vẫn mọi bất biến đạt.

**Chưa kiểm:** thử tay trên điện thoại thật (chủ dự án tự làm khi tiện, dùng số điện thoại được phép vào lúc bảo trì); ảnh bằng chứng Chrome mới nhất của Đợt C/B chưa đối chiếu lại với production (chỉ đối chiếu lúc thi công, trên môi trường tạm).

## Lần phát hành kế tiếp: Đợt D — khung điều hướng dọc + Trang chủ mặc định (ADR-0015)

**Thêm 2026-09-23 (Task 6, F-5):** ADR-0015 mục "Hệ quả" (dòng 48) đã ghi "Người dùng thấy trang khác khi mở app.
Cần báo trước cho nhân viên; nên deploy trong cửa sổ bảo trì." nhưng chưa có chỗ nào biến việc đó thành một BƯỚC
PHẢI LÀM trong runbook. Chưa merge vào `main`, chưa deploy (nhánh `worktree-trang-chu-moi`) — mục này CHỈ ghi thêm
bước còn thiếu, không phải toàn bộ runbook (đi theo trình tự chung của `CLAUDE.md` §8: cổng chỉ-đọc → điểm khôi
phục Time Travel → test + typecheck + e2e xanh → `wrangler deploy` ngay → `audit-invariants --db remote` → ghi
trạng thái).

**Bước bắt buộc, đặt TRƯỚC `wrangler deploy`:**
0. **Báo trước cho nhân viên** rằng giao diện sẽ đổi hẳn dáng (thanh điều hướng ngang → thanh bên dọc ở máy tính,
   Trang chủ thay vì Đơn hàng là trang mở ra đầu tiên khi mở app) TRƯỚC khi deploy, và **cân nhắc deploy trong cửa
   sổ bảo trì** (như hai lần deploy giao diện trước đó). Lý do: service worker cập nhật ngầm (stale-while-
   revalidate), nên lần mở app ĐẦU TIÊN sau deploy trên một máy có thể vẫn thấy bản khung cũ trong vài giây — báo
   trước để nhân viên không hoang mang tưởng app lỗi.

## TRẠNG THÁI TRIỂN KHAI — N2 lát 1 (người đặt trên đơn: `0018_orders_booker_party` + mã) ĐÃ LÊN PRODUCTION (2026-09-22, chủ dự án tự chạy lệnh ghi)
Theo runbook "Lần phát hành kế tiếp: `0018`" bên dưới. **Mã:** `main` @ `da64558` (PR #9; cây giống hệt `fd3ad50` đã kiểm). **Worker mới:** `3245256e-68df-457f-8555-ecd57a4963f4` (tạo 2026-09-22T02:25:09Z). **Worker trước (để lùi về, an toàn — mục C):** `3e648e49-b2dc-4a06-827d-f46555f03383`. Quyết định: ADR-0011; đặc tả `docs/superpowers/specs/2026-09-21-n2-lat-1-khach-tren-don.md` (§13 các chỗ lệch có chủ ý). B5 `staff_party_required` nay lấy số `0019`.
- **Cổng trước khi áp (chỉ đọc, AI chạy):** `migrations list --remote` → chỉ `0018_orders_booker_party` chờ; `audit-invariants --db remote` mọi bất biến đạt; điểm khôi phục Time Travel `00000168-00000000-000050ed-d33ebdc1d16b4404fceecb1d115332b2`; trên `main` @ `da64558`: `npm test` 443/443 (có thêm test của bộ tiêu chuẩn), `typecheck` 0 lỗi; e2e 16/16 + audit `--strict` xanh và Chrome (a2-smoke-form 21/21, a2-smoke-order 10/10, a2-smoke-sheet 13/13, v1-nguoi-phu-trach 12/12) chạy trên cây giống hệt. Không chạy truy vấn đếm trạng thái đơn (`CLAUDE.md` §8 cấm AI `d1 execute` remote).
- **Áp + deploy (chủ dự án tự chạy từ checkout gốc `main`):** `CI=1 npm run db:migrate:remote` rồi ngay sau đó `CI=1 npx wrangler deploy`.
- **Sau triển khai (chỉ đọc, AI chạy):** `migrations list --remote` "No migrations to apply"; `deployments list` → `3245256e…` 100%; `audit-invariants --db remote` mọi bất biến đạt; `GET /order-form`, `/order`, `/login`, `/js/order-form.js` 200; `/sw.js` `cache-control: no-store`; `order-form.js` đang phục vụ có `booker-slot` + `/api/parties/lookup`, `order.js` có `change-booker` + `/booker`. **Chưa kiểm:** `GET /api/orders/:id` trả `bookerPartyId`/`bookerName` (cần đăng nhập), luồng thật trên iPhone, và chưa hỏi ý nhân viên bán hàng.
- **Việc sau triển khai:** nhắc nhân viên mở lại app (service worker lấy bản mới); đơn cũ để trống người đặt (lát 2 mới backfill).

## TRẠNG THÁI TRIỂN KHAI — `0017` (trigger bảo vệ trạng thái đơn + nhật ký chỉ-thêm) ĐÃ ÁP PRODUCTION (2026-09-21, theo lệnh của chủ dự án)
Theo runbook "Lần phát hành kế tiếp: `0017`" bên dưới. **Mã:** `main` @ `6853a26` (PR #5). **Worker không đổi** (không `wrangler deploy`: migration chỉ thêm trigger, mã không đổi).
- **Cổng trước khi áp (chỉ đọc):** `migrations list --remote` → chỉ `0017_order_status_audit_guards` chờ (xác nhận `0016_feedback` và `0016_maintenance` đều đã áp); `audit-invariants --db remote` mọi bất biến đạt; trạng thái đơn chỉ có giá trị hợp lệ (4 `draft`, 2 `confirmed`, 2 `cancelled`); điểm khôi phục Time Travel `00000139-00000000-000050ed-0ef23329799779e5fc739b1620fffa24`; `npm test` 408/408 + `typecheck` 0 lỗi trên commit áp (e2e 15/15 ở `fc92c21`, các commit sau chỉ sửa tài liệu).
- **Áp:** `CI=1 npm run db:migrate:remote` → `0017_order_status_audit_guards.sql` ✅.
- **Sau khi áp (chỉ đọc):** đủ ba trigger `audit_log_no_delete`, `audit_log_no_update`, `orders_status_transition`; `audit-invariants --db remote` mọi bất biến đạt; `migrations list --remote` "No migrations to apply"; `GET /login` 200. Chưa thử tay đơn thử (tuỳ chọn, chủ dự án quyết — mục B.2 của runbook).
- **Hoàn tác:** mục C của runbook (DROP TRIGGER + migration mới để dựng lại; phải ghi lệch vào đây).

## TRẠNG THÁI TRIỂN KHAI — cột "Đăng nhập gần nhất" + chế độ bảo trì (`0015` + `0016`) ĐÃ LÊN PRODUCTION (2026-09-21, theo lệnh của chủ dự án) — chế độ bảo trì đang TẮT
**ĐÃ LÊN PRODUCTION 2026-09-21 (theo lệnh của chủ dự án trong phiên).** Mã triển khai: commit `25d5874` của nhánh `worktree-che-do-bao-tri` (`main` = commit ghi trạng thái này sau khi push fast-forward). Worker **`c72dd98f-cc47-4a94-b57d-294ebc820465`** (`booking.tourdao.vn`, Cron `*/15`); migration `0015` + `0016` ĐÃ áp (✅✅). Điểm khôi phục Time Travel ghi TRƯỚC khi áp: bookmark `00000107-00000000-000050ed-88f6e3384de6d16e43401ed1941e5b5b` (không dùng — hai migration chỉ THÊM). Cổng trước: 388 test + typecheck 0 lỗi + e2e 14/14 & `audit-invariants` xanh + Chrome `v1-dang-nhap.mjs` 15 ✓ và `v1-bao-tri.mjs` 17 ✓; `migrations list --remote` báo đúng hai migration chờ. Kiểm sau deploy (chỉ đọc, không in SĐT): `mnt_setting` `enabled = 0`, `ends_at` NULL — chế độ bảo trì TẮT; cột `staff.last_login_at` có (0 dòng có mốc); `GET /api/auth/config` = `{"turnstileSiteKey":"…","maintenance":{"on":false,"endsAt":null}}` (Turnstile vẫn bật, secret giữ nguyên); `GET /api/maintenance` và `GET /api/auth/me` chưa đăng nhập → 401; `/sw.js` `no-store`; `/api/company` 200; 10 trang 200; `audit-invariants --db remote` xanh. KHÔNG bật chế độ bảo trì, KHÔNG đặt/đổi secret nào. **Chưa kiểm bằng tài khoản thật:** cột "Đăng nhập gần nhất" trống với mọi người cho tới khi họ đăng nhập lại; nút bật/tắt ở `/account` chưa bấm trên production (thao tác ghi). Runbook và đường thoát khẩn: mục "Lần phát hành 0015 + 0016 (chế độ bảo trì) — ĐÃ THỰC HIỆN 2026-09-21" và "Chế độ bảo trì — đường thoát khẩn" bên dưới.

## TRẠNG THÁI TRIỂN KHAI — bản v1.0 ĐÃ LÊN PRODUCTION (2026-09-21, theo lệnh của chủ dự án) — Turnstile ĐÃ BẬT (xem mục "Turnstile ĐÃ BẬT")
Đăng nhập Turnstile + thông tin công ty · người phụ trách · xác nhận đơn PNG. Mọi việc dưới đây làm theo runbook "Lần phát hành v1.0", NGOẠI TRỪ các bước Turnstile thật (chưa có widget/khoá) — mục B.1 (deploy MÃ trước, secret sau) được giữ nguyên.
- **Mã:** `main` @ `9594696`. **Worker:** `21cbaca5-8229-43b8-bab8-928036c9e871` tại `booking.tourdao.vn` (phiên bản ngay trước: `a625adc4-43df-4e67-ac8e-f619aa98732b`, lần phát hành 1). **D1:** đã áp `0013` + `0014` (trước đó tới `0012`).
- **Cổng đã chạy TRƯỚC khi áp (chỉ đọc):** `migrations list --remote` báo đúng hai migration chờ (`0013`, `0014`); điểm khôi phục Time Travel: `000000f8-00000000-000050ed-954f3f5eb124234ac4b645ef6335275a` (lệnh: `npx wrangler d1 time-travel restore tourdao-sales-db --bookmark=<điểm này>`); cổng `0014` (A.5): `mo_coi = 0`; dữ liệu trước: 8 đơn, 12 tài khoản, 15 dịch vụ, 13 hồ sơ. Trên `9594696`: `npm test` 363/363, `npm run typecheck` 0 lỗi, `npm run test:e2e` 13/13 + `audit-invariants --strict` (15 kiểm). Kịch bản Chrome KHÔNG chạy lại lúc deploy (đã chạy ở lúc thi công: `v1-dang-nhap` 15 ✓, `v1-xac-nhan-png` 11 ✓, `v1-nguoi-phu-trach` 12 ✓, `a2-smoke` 21/10/13).
- **Kết quả SAU deploy (chỉ đọc):** 8 đơn = 8 dòng HANDLE đang mở (B.2); `order_service` 15 dòng nguyên; email công ty đã có; `node scripts/audit-invariants.mjs --db remote` 15/15 đạt (gồm R-DSP-1/2a/2b/3); `GET /api/company` 200 đủ 5 trường; `GET /api/auth/config` = `{"turnstileSiteKey":null}` (Turnstile TẮT — đúng); CSP của `/login` có `https://challenges.cloudflare.com`; 10 trang 200; `/sw.js` `no-store`; `GET /api/dispatch/handlers` chưa đăng nhập 401.
- **Turnstile ĐÃ BẬT (2026-09-21, sau deploy mã):** chủ dự án chạy `wrangler secret put TURNSTILE_SITE_KEY` và `TURNSTILE_SECRET_KEY` (đọc từ `.dev.vars` bằng lệnh pipe; tên biến trong `.dev.vars` của chủ dự án đặt sai — `CLOUDFLARE_TURNSTILE_SITE_KEY`/`CLOUDFLARE_TURSTIEL_SECRET_KEY` — nên lệnh đổi tên khi pipe; hệ thống chặn Claude đọc giá trị `.dev.vars`). Claude kiểm SAU đó, không cần đăng nhập: `GET /api/auth/config` trả khoá site thật (`0x4AAA…`); đăng nhập không token → 403 `turnstile_failed`; token giả → 403 `turnstile_failed` (khoá bí mật HỢP LỆ: Cloudflare từ chối token chứ không từ chối secret — secret sai sẽ ra 503 `turnstile_unavailable`); Chrome headless mở `https://booking.tourdao.vn/login`: widget dựng được (ô "Xác minh bạn là con người", nhãn tiếng Việt, không lỗi tên miền), nút Đăng nhập khoá tới khi có token; khối công ty + phiên bản hiện. Console: CSP chặn `https://static.cloudflareinsights.com/beacon.min.js` (Cloudflare Web Analytics tự chèn ở tên miền; vô hại — chỉ mở CSP nếu muốn dùng analytics). CHƯA kiểm: đăng nhập trọn vẹn bằng tài khoản thật qua widget thật (chủ dự án), iPhone/WebKit, log Worker sau khi nhân viên dùng (`wrangler tail`: `turnstile_failed` kèm `missing_token` hàng loạt = máy khách còn `login.js` cũ — đóng-mở app). Hoàn tác tức thì: `npx wrangler secret delete TURNSTILE_SECRET_KEY`.
- **CÒN MỞ:**
  1. ~~Bật Turnstile~~ — ĐÃ LÀM 2026-09-21 (xem mục "Turnstile ĐÃ BẬT" ở trên); còn: đăng nhập thử trọn vẹn bằng tài khoản thật và xem log.
  2. **Kiểm giao diện bằng tài khoản thật** (B.4, chỉ đọc): danh sách `/` mỗi thẻ có "Phụ trách: <tên>"; mở một đơn có khối "Người phụ trách"; "Xác nhận gửi khách" mở ảnh. `json_each` của `GET /api/dispatch/handlers` CHƯA từng chạy trên D1 production: thẻ KHÔNG có dòng và cũng không chip = lời gọi lỗi.
  3. Thử iPhone thật (canvas/chia sẻ/tải ảnh/WebKit); chữ ký thị giác v1.0 và A2 chưa ghi; quyết định 4(a)/(b)/(c) (mục "Ba quyết định cần chủ dự án").
- **Hoàn tác:** dữ liệu production cho thấy đã có tài khoản/hồ sơ tạo dưới mã N1 (12 tài khoản, 13 hồ sơ) ⇒ KHÔNG lùi Worker về `0b13b279-…`; đường lùi Worker an toàn duy nhất là về `a625adc4-…` (xem mục C của runbook v1.0 về những gì mất khi lùi).

## TRẠNG THÁI TRIỂN KHAI — lần phát hành 1 ĐÃ LÊN PRODUCTION (2026-09-21, theo lệnh của chủ dự án)
A1 + N1 (lần 1) + A2 đi cùng MỘT lần phát hành, đúng điều kiện ở mục "Điều kiện TRƯỚC khi triển khai". Không còn việc "triển khai lần 1" nào phải làm; các mục bên dưới giữ lại để tra cứu và cho lần 2.
- **Mã:** `main` @ `9b4ad33`. **Worker:** phiên bản `a625adc4-43df-4e67-ac8e-f619aa98732b` tại `booking.tourdao.vn` (phiên bản ngay trước đó: `0b13b279-b0c2-4032-8cb1-5a3c1c83b593`, 2026-09-19). **D1:** đã áp `0008…0012` (trước đó `0001…0007`); `migrations list --remote` báo "No migrations to apply".
- **Cổng đã chạy TRƯỚC khi áp:** D1 có 3 đơn, 10 tài khoản, 8 dòng tiền; cổng chỉ-đọc `full_name`/`created_at` (mục "Cổng bổ sung" §1) trả **0 dòng**; điểm khôi phục Time Travel đã ghi: `000000ca-00000000-000050ec-d2515812ba718f70d7ec57f18973c50a` (lệnh khôi phục: `npx wrangler d1 time-travel restore tourdao-sales-db --bookmark=<điểm này>`); trên `9b4ad33`: `npm test` 236/236, `npm run typecheck` mã thoát 0, `npm run test:e2e` 10/10 + `audit-invariants` xanh.
- **Kết quả SAU khi deploy (chỉ đọc):** `node scripts/audit-invariants.mjs --db remote` — mọi bất biến đạt (kể cả `PRAGMA foreign_key_check` chạy được trên remote); backfill: 8 địa điểm, 10 hồ sơ = 10 tài khoản (0 tài khoản thiếu `party_id`), 10 quyền đang hiệu lực (1 ADMIN), 3 đơn còn nguyên; `order_service` có 8 dòng vì `0008` chuyển MỖI dòng tiền cũ thành một dịch vụ "nhập tay" (đơn cũ vẫn hiển thị đúng); các trang `/`, `/order-form`, `/order`, `/parties`, `/locations`, `/staff`, `/catalog` trả 200; `/sw.js` là `no-store`; `/api/auth/me` chưa đăng nhập trả 401.
- **CHƯA làm / còn mở:**
  1. Bước "Thử tay" (mục Triển khai, bước 4) và §3 "gọi API thật" — cần đăng nhập ADMIN, việc của chủ dự án (kèm tạo một hồ sơ thử: đó là thao tác GHI, chỉ làm khi đã chắc không hoàn tác).
  2. **Cửa sổ đóng băng thao tác tài khoản/quyền/hồ sơ VẪN HIỆU LỰC** cho tới khi chủ dự án chắc không hoàn tác (mục "Hoàn tác"). Hoàn tác Worker về `0b13b279-…` chỉ an toàn nếu chưa có tài khoản/quyền/hồ sơ nào được tạo hay sửa dưới mã mới.
  3. Quyết định 4(a)/(b)/(c) chưa được chọn. Vì `0011` ĐÃ áp lên remote, phương án 4(a)(ii) (trigger) nay cần MỘT MIGRATION MỚI (không tái sinh `0011` được nữa); (i) và (iii) không đổi.
  4. Chữ ký duyệt thị giác A2 chưa được ghi vào `docs/evidence/2026-09-20-a2/README.md` (chủ dự án ra lệnh triển khai nhưng chưa ghi ngày/người ký/điểm cần sửa).
  5. ~~Gói Workers~~ — **ĐÃ GIẢI QUYẾT 2026-09-21:** chủ dự án xác nhận Cloudflare Worker đang ở gói **trả phí**. Đơn cỡ tối đa (`MAX_SERVICES` 20 × `MAX_LINES_PER_ORDER` 50) cần khoảng 78 câu D1 trong một request tạo và khoảng 83 khi sửa (đếm cả request; xem `docs/SYSTEM-DESIGN.md` §12) — nằm xa giới hạn của gói trả phí, không cần hạ hằng nào.

## Đã có sau N1 (lần phát hành 1)
- Migration `0009…0012` (chỉ thêm — mã cũ vẫn chạy): `v_ord_order_label`, `loc_*` (8 địa điểm), `pty_*` (hồ sơ, liên hệ, vai trò theo nơi, quan hệ), `stf_*` + `staff.party_id` + backfill hồ sơ/quyền cho tài khoản có sẵn.
- API: `/api/parties*`, `/api/locations*`, `PUT /api/staff/:id/permissions`; `POST /api/staff` nhận `permissions[]` (thay `role`).
- Quyền theo bản đồ ADR-0007 ở `src/shared/permissions.ts`; router có `access: "office"`. Tài khoản chỉ-FIELD bị chặn mọi route đơn/tiền/hồ sơ (màn hình "việc của tôi" của họ thuộc N2 — hiện họ đăng nhập được nhưng không có mục nào).
- Trang web: `/parties` (Hồ sơ), `/locations` (Địa điểm), `/staff` (chọn quyền thay vai trò). Vào được từ thanh điều hướng trên (máy tính) và từ mục liên kết của tab Tôi (điện thoại); chưa có thiết kế điện thoại riêng cho hai trang mới (thuộc A2/N2). Hai trang mới đã khai trong `PAGES` của `src/shared/sw-policy.ts` (service worker chỉ cache khung tĩnh, không bao giờ cache `/api`).
- Kiểm máy: `src/architecture.test.ts`, `docs/data-dictionary.json`, `scripts/audit-invariants.mjs` (xem `docs/ARCHITECTURE.md`).

## Đã có trong bản v1.0 (ĐÃ lên production 2026-09-21; lúc deploy mã Turnstile còn tắt, đã bật cùng ngày sau đó — xem mục "TRẠNG THÁI TRIỂN KHAI — bản v1.0" và "Turnstile ĐÃ BẬT" ở trên)
- Migration `0013_company_email` (chỉ dữ liệu: điền email công ty) và `0014_dispatch` (`dsp_*`, view `v_dsp_order_handler`, backfill người phụ trách = người lập cho mọi đơn hiện có). Cả hai chỉ THÊM — mã cũ vẫn chạy (không đọc `dsp_*`).
- Module `company` (`GET /api/company`, công khai, chỉ đọc); màn đăng nhập hiện khối thông tin công ty và dòng phiên bản (`src/shared/app-info.ts`).
- Cloudflare Turnstile ở đăng nhập: máy chủ (`src/modules/auth/turnstile.ts`, `GET /api/auth/config`, 403 `turnstile_failed` / 503 `turnstile_unavailable`, kiểm TRƯỚC bộ chống dò PIN), widget ở `web/login.ts` (`theme: "light"`; tự hỏi lại cấu hình khi `GET /api/auth/config` lỗi), CSP cho Cloudflare ở `public/_headers`. BẬT khi có `TURNSTILE_SECRET_KEY`, TẮT khi vắng.
- Module `dispatch`: người phụ trách đơn — `GET /api/dispatch/handlers`, `GET /api/dispatch/assignees`, `PUT /api/orders/:id/handler`; người phụ trách sửa được đơn (`ctx.isAssigned`), thao tác `dispatch.claim`; `audit-invariants` thêm R-DSP-1/2a/2b/3. Giao diện: mỗi thẻ ở danh sách đơn có dòng "Phụ trách: <tên>" (hoặc chip "Chưa có người phụ trách"); trang đơn có khối "Người phụ trách" + bảng chọn "Đổi người phụ trách" + nút "Nhận phụ trách" (`web/orders.ts`, `web/order.ts`, `web/handler-sheet.ts`; mô tả ở `docs/SYSTEM-DESIGN.md` §9).
- Xác nhận đơn dạng PNG: mô hình chữ thuần (`src/shared/order-confirmation.ts`), bộ vẽ canvas và hộp thoại ở trình duyệt (`web/confirmation-*.ts`), hiện sau khi tạo đơn.
- e2e 13 kịch bản (thêm `company`, `turnstile`, `dispatch` so với 10 của lần phát hành 1); đo lại 2026-09-21 tại `84a0de5`: 13/13 xanh + `audit-invariants --strict` 15 kiểm, `npm test` 363/363, `npm run typecheck` 0 lỗi.
- Kịch bản Chrome v1.0 (ngoài CI, bằng chứng ở `docs/evidence/2026-09-21-v1-0/`): `v1-dang-nhap.mjs` 15 ✓, `v1-xac-nhan-png.mjs` 11 ✓, `v1-nguoi-phu-trach.mjs` 12 ✓ — đo bằng Chrome headless và khoá Turnstile THỬ, không phải iPhone thật, không phải khoá thật; chữ ký thị giác của chủ dự án CHƯA có.

## Đẩy lên GitHub và triển khai: HAI LỆNH chủ dự án tự gõ (từ 2026-09-23)

Bản lời thường cho chủ dự án (từng bước, lệnh nào khi nào, vì sao): `docs/QUY-TRINH-PHAT-HANH.md`.

Đặc tả: `docs/superpowers/specs/2026-09-23-lenh-day-trien-khai-an-toan.md`. Logic + test: `scripts/release-lib.mjs`, `src/release-lib.test.ts`. **AI không được chạy hai lệnh này** (`CLAUDE.md` §8; hook `guard-remote` và `permissions.deny` chặn); chính hai kịch bản cũng **tự từ chối khi không có terminal thật (TTY)**. **Chủ PHẢI chạy cả hai lệnh trong ứng dụng Terminal của macOS** (terminal thật, có TTY; không qua AI, kể cả dạng gõ `! …` trong phiên Claude Code — lời báo chặn của hook cũng nói vậy), đứng ở **thư mục gốc repo, checkout `main`**.

**Đẩy — `npm run day-len -- <nhánh>`** (bỏ `-- <nhánh>` nếu `main` đã chứa sẵn thứ cần đẩy). Bước nào hỏng thì in lý do tiếng Việt, thoát khác 0 và KHÔNG đẩy:

| Bước | Lệnh làm | Dừng khi |
|---|---|---|
| 1 | kiểm TTY | không phải terminal thật |
| 2 | `git rev-parse --abbrev-ref HEAD`, `git status --porcelain` | không ở `main`; còn thay đổi chưa commit |
| 3 | `git fetch origin`, `git merge-base --is-ancestor origin/main main` | GitHub có commit mà `main` cục bộ chưa có (có người đẩy thứ khác) |
| 4 | (nếu có nhánh) `git merge-base --is-ancestor main <nhánh>`, `git rev-parse main` (ghi mã cũ), `git merge --ff-only <nhánh>` | nhánh không tiến thẳng được — KHÔNG bao giờ tạo merge commit, KHÔNG `--force`; không đọc được mã cũ của `main` (để luôn in được lệnh quay lại) |
| 5 | `npm test`, `npm run typecheck` | đỏ — nếu đã gộp ở bước 4 thì in `git reset --hard <mã cũ>` để chủ TỰ chạy nếu muốn (lệnh không tự chạy) |
| 6 | in số commit + danh sách `origin/main..main` + **migration mới** so với `origin/main` | một trong ba lệnh git đọc (`rev-list --count`, `log`, `diff … migrations/`) lỗi hoặc trả kết quả lạ — không bao giờ đoán "không có gì để đẩy"/"không có migration mới" (có migration mới thì in cảnh báo: lần triển khai tới PHẢI áp chúng trước, dùng `npm run trien-khai`) |
| 7 | hỏi "Đẩy lên GitHub? (c/k)" | trả lời khác đúng `c` |
| 8 | `git push origin main`, rồi in `git log -1 origin/main` | push lỗi |

**Triển khai — `npm run trien-khai`** (thay các bước tay "cổng chỉ-đọc → Time Travel → test/typecheck → áp migration → deploy NGAY → audit → ghi trạng thái" của các runbook bên dưới). Bước nào hỏng thì dừng, thoát khác 0; không đụng `wrangler secret`, không rollback tự động:

| Bước | Lệnh làm | Dừng khi |
|---|---|---|
| 1 | kiểm TTY, `main`, cây sạch, `git fetch origin`, `main` == `origin/main` | chỉ triển khai mã ĐÃ đẩy lên GitHub |
| 2 | cổng chỉ-đọc `CI=1 npx wrangler d1 migrations list tourdao-sales-db --remote` | lệnh lỗi, hoặc đầu ra không đọc được (không đoán) |
| 2b | cổng số phiên bản TRƯỚC deploy (chỉ đọc): `node scripts/kiem-phien-ban.mjs` — bản ở máy phải MỚI HƠN production | mã 1 (không mới hơn: quên thêm mục nhật ký?) → in đỏ và hỏi "… Chỉ chọn c nếu đang deploy lại ĐÚNG bản đang chạy. Vẫn tiếp tục? (c/k)"; khác đúng `c` → dừng, không ghi gì lên remote; chọn `c` thì khối tóm tắt ghi "Cổng phiên bản trước deploy: KHÔNG ĐẠT (chủ chọn tiếp tục)". Mã 2 hay mã lạ (không đọc được production) → DỪNG, không bao giờ coi là đạt |
| 3 | `npm test`, `npm run typecheck`, `npm run build:web` | đỏ |
| 3b | `npm run test:e2e` ĐỦ BỘ (cần mạng, vài phút; đuôi `audit-invariants --strict` trên D1 tạm) | e2e đỏ → in tên kịch bản đỏ và hỏi "Có kịch bản e2e đỏ. Vẫn tiếp tục? (c/k)"; khác đúng `c` → dừng, không ghi gì lên remote. Dùng khi kịch bản đỏ vì lý do ngoài mã (vd `catalog` đỏ vì giá trên Google Sheet thật vừa đổi) — chủ phán; khối tóm tắt ghi rõ "e2e: ĐỎ (chủ chọn tiếp tục)" |
| 4 | (nếu còn migration chưa áp) in danh sách; `wrangler d1 time-travel info tourdao-sales-db --json` → in điểm khôi phục + lệnh khôi phục; hỏi "Áp N migration này lên production? (c/k)"; `c` → `CI=1 npx wrangler d1 migrations apply tourdao-sales-db --remote` | không lấy được điểm khôi phục; trả lời khác `c` (không áp, không deploy); áp lỗi (KHÔNG deploy) |
| 5 | hỏi "Triển khai Worker lên production? (c/k)" (vừa áp migration thì câu hỏi ghi "PHẢI deploy ngay") | trả lời khác `c` — nếu đã áp migration thì in cảnh báo ĐỎ kèm lệnh deploy để tự chạy ngay |
| 6 | `CI=1 npx wrangler deploy` | deploy lỗi (không chạy bước 7) |
| 7 | `node scripts/audit-invariants.mjs --db remote` | báo ĐẠT / KHÔNG ĐẠT (mã 1) / KHÔNG CHẠY ĐƯỢC (mã 2 — không phải dữ liệu sạch); khác ĐẠT thì thoát khác 0 |
| 7b | cổng số phiên bản SAU deploy (chỉ đọc, chạy SAU bước 7 để không xen giữa deploy và kiểm dữ liệu): `node scripts/kiem-phien-ban.mjs --sau-deploy` — production phải BẰNG bản ở máy; hỏng thì chờ ~20 giây rồi thử lại MỘT lần | không dừng (đã deploy rồi): ghi ĐẠT / KHÔNG ĐẠT / KHÔNG CHẠY ĐƯỢC (mã N) vào tóm tắt; khác ĐẠT thì in lệnh kiểm lại tay `node scripts/kiem-phien-ban.mjs --sau-deploy` và thoát khác 0 |
| 8 | in khối tóm tắt: ngày giờ (giờ VN), commit, dòng `e2e: xanh` hoặc `e2e: ĐỎ (chủ chọn tiếp tục): <tên kịch bản>`, migration đã áp, điểm Time Travel, Worker Version ID (nếu đọc được), kết quả kiểm dữ liệu, `Phiên bản: X`, kết quả hai cổng số phiên bản | — chủ dán khối này vào mục "TRẠNG THÁI TRIỂN KHAI" đầu tệp. Lệnh thoát 0 CHỈ KHI kiểm dữ liệu ĐẠT VÀ cổng sau ĐẠT |

**Lệnh này KHÔNG làm thay** (vẫn làm tay TRƯỚC khi gõ `npm run trien-khai`, theo runbook của từng lần phát hành): các kịch bản Chrome khi chạm giao diện (e2e API thì lệnh ĐÃ chạy ở bước 3b), và các kiểm riêng của từng lần phát hành (ví dụ `GET /api/auth/config` sau deploy Face ID). **Giả định về wrangler:** đầu ra của `migrations list` được đọc theo định dạng của wrangler 4.135.0 (dòng "No migrations to apply" hoặc "Migrations to be applied:" + bảng tên tệp); nâng wrangler mà định dạng đổi thì lệnh DỪNG (an toàn), cần sửa `parsePendingMigrations` + mẫu ở `src/release-lib.fixtures/`. `migrations list --remote` của wrangler gọi `CREATE TABLE IF NOT EXISTS d1_migrations` trước khi đọc — trên production bảng đã có nên thực tế không ghi gì.

## Mọi lần phát hành: bước A.0 — nhật ký thay đổi (từ 2026-09-23)

Trước bước "A. Trước khi deploy" của MỌI runbook, và TRƯỚC khi gõ `npm run trien-khai`:
1. AI thêm mục mới vào đầu `CHANGELOG` (`src/shared/changelog.ts`) theo công thức t "Ghi nhật ký thay đổi" ở `docs/CHANGE-GUIDE.md`, commit cùng nhánh sẽ deploy. Chủ đọc lướt mục này khi duyệt phát hành.
2. Cổng số phiên bản: `npm run trien-khai` TỰ chạy `node scripts/kiem-phien-ban.mjs` trước (bước 2b, sau bước đọc migration) và `--sau-deploy` sau (bước 7b, sau kiểm dữ liệu) — chủ quyết 2026-09-23. Mã thoát của cổng: 0 ĐẠT; 1 = quên tăng số (trước) / production chưa bằng bản ở máy (sau); 2 = không đọc được production, KHÔNG phải đạt. Khối tóm tắt đã có dòng "Phiên bản: X" để dán vào mục "TRẠNG THÁI TRIỂN KHAI".
3. Chỉ khi deploy TAY (không qua `npm run trien-khai`): chạy `node scripts/kiem-phien-ban.mjs` trước và `node scripts/kiem-phien-ban.mjs --sau-deploy` sau `CI=1 npx wrangler deploy`; cả hai phải ĐẠT.

**Lần phát hành đầu tiên mang trang Trợ giúp PHẢI là 1.4** (mục đầu nhắc tới trang Trợ giúp/nhật ký thay đổi). Cổng không bắt được nếu quên, vì production trước đó chưa báo số (coi là 1.0).

## Điều kiện TRƯỚC khi triển khai
- **A2 (giao diện đơn) đã xong về mã (2026-09-20): `tsc -p web` = 0 lỗi; bằng chứng ở `docs/evidence/2026-09-20-a2/`.** Còn MỘT cổng: chủ dự án ký duyệt thị giác (mục "Ký duyệt thị giác" trong `docs/evidence/2026-09-20-a2/README.md`) — **chưa ký thì chưa triển khai**. Nhánh chứa A1 (đơn có `services[]`): triển khai chỉ N1 mà thiếu A2 thì giao diện đơn hỏng trên production, nên A1, N1 và A2 đi cùng một lần phát hành. `web/trip-sheet.ts`, `web/order-form.ts` và `web/order.ts` KHÔNG có kiểm tự động trong repo — sửa các tệp này thì PHẢI chạy lại ba kịch bản `docs/evidence/2026-09-20-a2/kich-ban/a2-smoke-*.mjs`.
- Chủ dự án chạy (chỉ đọc) và ghi lại kết quả: `npx wrangler d1 migrations list tourdao-sales-db --remote` (xem `0008` đã áp chưa) và `npx wrangler d1 execute tourdao-sales-db --remote --command "SELECT count(*) AS orders FROM orders"`.
- Ghi điểm khôi phục D1 Time Travel trước khi áp: `npx wrangler d1 time-travel info tourdao-sales-db`.

## Triển khai — HAI lần phát hành (expand–contract)
`wrangler d1 migrations apply` áp MỌI migration chưa áp, nên migration siết B5 (`staff_party_required`) KHÔNG được nằm trong `migrations/` ở lần 1 — và chưa được có mặt ở lần phát hành v1.0 (mục "Lần phát hành v1.0" bên dưới). **Số của B5 là số KẾ TIẾP sau `0018` (dự kiến `0019`)**: `0013` = `company_email` và `0014` = `dispatch` đã lên production cùng bản v1.0 (2026-09-21); `0015` = `staff_last_login` và `0016` = `maintenance` (chế độ bảo trì + cột "Đăng nhập gần nhất") ĐÃ lên production; `0017` = `order_status_audit_guards` (trigger bảo vệ trạng thái đơn + nhật ký chỉ-thêm) ĐÃ lên production (2026-09-21, xem "TRẠNG THÁI TRIỂN KHAI" đầu tệp); `0018` = `orders_booker_party` (cột người đặt trên đơn, N2 lát 1) **có trong repo, CHƯA lên production** (mục "Lần phát hành kế tiếp: `0018`" bên dưới) — cả sáu chỉ THÊM. Trước khi đặt tên migration mới, kiểm lại `migrations/` và `docs/superpowers/plans/`. **Từ nhánh Góp ý/Báo lỗi, `migrations/` có HAI tệp mang số 0016: `0016_feedback.sql` và `0016_maintenance.sql`** — wrangler theo dõi theo TÊN đầy đủ nên việc này hợp lệ, nhưng khi đọc `wrangler d1 migrations list --remote` phải nhìn TÊN chứ không nhìn số, và nhớ rằng lệnh áp migration sẽ kéo theo `0016_feedback` nếu nó chưa được áp.

**Lần 1 (mở rộng):**
1. Chạy BA lệnh riêng, ghi lại kết quả của từng lệnh (không nối bằng `&&`): (a) `npm test` — kỳ vọng toàn bộ đạt; (b) `npm run typecheck` — **phải là 0 lỗi lúc triển khai** (A2 đã đưa lỗi của `tsc -p web` về 0); (c) `npm run test:e2e` (cần mạng) — kỳ vọng `E2E: 13/13 kịch bản xanh` (số kịch bản THẬT của bản hiện tại: `platform`, `pwa`, `orders`, `trip`, `admin`, `turnstile`, `catalog`, `dispatch`, `admin-race`, `locations`, `parties`, `permissions`, `company`; ba kịch bản `turnstile`, `dispatch`, `company` là của bản v1.0 — lúc lần 1 lên production con số là 10/10, xem "TRẠNG THÁI TRIỂN KHAI") và bước cuối `audit-invariants --strict` xanh.
2. `npm run db:migrate:remote` (áp `0008` nếu chưa, rồi `0009…0012`), **ngay sau đó** `npx wrangler deploy` trong cùng lượt làm việc (khoảng giữa chỉ tính bằng phút: tài khoản do mã cũ tạo lúc đó chưa có hồ sơ/quyền — hiện nhãn "(chưa có hồ sơ)", đơn của họ không biến mất, họ bị từ chối theo mặc định cho tới khi B5 `staff_party_required` — số kế tiếp SAU `0018`, dự kiến `0019` — backfill). Trong khoảng giữa này — **và tiếp tục sau khi triển khai, cho tới khi chắc chắn không hoàn tác nữa** — KHÔNG tạo tài khoản, KHÔNG đổi tên / SĐT đăng nhập / ngưng / kích hoạt tài khoản, KHÔNG đổi quyền, KHÔNG tạo-sửa hồ sơ (lý do và hệ quả: mục "Hoàn tác" ngay dưới).
3. `node scripts/audit-invariants.mjs --db remote` (không `--strict`: còn cảnh báo "chưa có hồ sơ" là đúng nếu có tài khoản khoảng giữa). Mọi dòng `✗` là vi phạm thật. Lệnh này chỉ chạy được SAU khi đã áp `0009…0014` (bản hiện tại của script kiểm cả `pty_*`/`stf_*` của `0009…0012` lẫn bảng `dsp_*` của `0014`): trên một D1 chưa có bảng nào trong số đó — vd production còn ở `0012` — script **thoát mã 2** ("Không chạy được truy vấn trên D1"), mã 2 nghĩa là KHÔNG chạy được chứ KHÔNG phải dữ liệu sạch (mã 1 = có bất biến bị vi phạm). Dùng nó ở bước kiểm SAU khi áp, không phải để kiểm "hiện trạng trước".
4. Thử tay: đăng nhập bằng tài khoản admin; `/staff` hiện cột Quyền; `/parties`, `/locations` mở được; tạo thử một hồ sơ.

**Lần 2 (siết) — chỉ sau khi lần 1 chạy ổn:** làm Task B5 của kế hoạch N1-B (thêm `staff_party_required` với số KẾ TIẾP sau `0018` — dự kiến `0019_staff_party_required.sql`, KHÔNG phải `0013`/`0015`/`0018`, những số đó đã dùng — + test), rồi `npm run db:migrate:remote`, `node scripts/audit-invariants.mjs --db remote --strict`, và kiểm `SELECT count(*) FROM sqlite_master WHERE type='trigger' AND name LIKE 'staff_party_required_%'` = 2.

**Hoàn tác:** migration không có `down`, và "triển khai lại Worker cũ" CHỈ an toàn trong một cửa sổ hẹp — đọc hết ba gạch đầu dòng trước khi dùng.
- **Chưa tạo/sửa tài khoản, quyền hay hồ sơ nào dưới mã mới** → triển khai lại phiên bản Worker trước là đủ: `0009…0012` chỉ thêm nên mã cũ vẫn đọc/ghi bình thường (đã kiểm trên SQLite: mã cũ vẫn `INSERT staff` không `party_id`, vẫn `UPDATE role`/`full_name`, vẫn đếm quản trị viên theo `role`).
- **Đã có dù chỉ một thay đổi dưới mã mới** → hoàn tác CHỈ Worker sẽ sai LẶNG LẼ (không sập, nên càng khó thấy): mã mới ghi hằng `staff.role = 'sales'` và `staff.full_name = ''`, đặt tên ở hồ sơ (`pty_*`) và quyền ở `stf_permission`; mã cũ chỉ đọc `staff.role`/`staff.full_name`. Hệ quả (đã chứng minh bằng SQLite): (i) tài khoản tạo dưới mã mới — kể cả ADMIN — sau khi hoàn tác thành `sales` và TÊN TRỐNG trên mọi màn hình, kể cả cột người lập đơn; (ii) mọi lần cấp/thu hồi quyền và mọi lần đổi tên dưới mã mới biến mất; (iii) ngược lại, quản trị viên đã bị THU HỒI quyền dưới mã mới lại "sống dậy" vì `staff.role` vẫn là `'admin'`. Hoàn tác đúng trong trường hợp này = khôi phục **D1 Time Travel về điểm đã ghi trước khi áp** + triển khai lại Worker cũ; đánh đổi phải nói rõ với chủ dự án: **mất MỌI dữ liệu ghi sau điểm đó** — đơn mới, sửa đơn, thu tiền, tài khoản mới. Chủ dự án quyết, và nên quyết trước khi áp chứ không phải lúc đang sự cố.
- **Vì vậy — cửa sổ đóng băng thao tác tài khoản:** từ lúc chạy `npm run db:migrate:remote`, qua khoảng giữa tới `npx wrangler deploy`, và tiếp tục **cho tới khi chắc chắn không hoàn tác nữa**: KHÔNG tạo tài khoản, KHÔNG sửa tài khoản (tên, SĐT đăng nhập, ngưng/kích hoạt), KHÔNG đổi quyền, KHÔNG tạo/sửa hồ sơ. Mỗi thao tác như vậy loại bỏ dần phương án hoàn tác rẻ (chỉ Worker) và đẩy về phương án Time Travel (mất dữ liệu).

## Lần phát hành v1.0 (đăng nhập Turnstile + thông tin công ty · người phụ trách · xác nhận đơn PNG) — RUNBOOK

Chỉ khi chủ dự án ra lệnh trong phiên đó (`CLAUDE.md` §8). Đặc tả NHÁP: `docs/superpowers/specs/2026-09-21-v1-0-dang-nhap-xac-nhan-phu-trach-design.md` (chưa được chủ dự án duyệt; không phải ADR). Migration của lần này: `0013` (email công ty) + `0014` (dispatch) — cả hai chỉ THÊM, áp CÙNG một lệnh `npm run db:migrate:remote`. Cửa sổ đóng băng thao tác tài khoản/quyền/hồ sơ (mục "Hoàn tác") vẫn hiệu lực nếu chưa được chủ dự án gỡ.

**A. TRƯỚC khi deploy**
1. Chủ dự án tạo widget Turnstile cho `booking.tourdao.vn` ở dashboard Cloudflare (Turnstile → thêm widget, tên miền `booking.tourdao.vn`, chế độ Managed) và lấy hai khoá: khoá site (CÔNG KHAI) và khoá bí mật. Claude không tự tạo widget/khoá thật.
2. Ghi khoá site vào `vars` của `wrangler.jsonc` (`"TURNSTILE_SITE_KEY": "<khoá site>"`; commit được vì công khai). KHÔNG ghi khoá bí mật vào tệp nào và KHÔNG đặt nó ở bước này.
3. **Ngưỡng token — ĐÃ ĐỐI CHIẾU 2026-09-21:** `MAX_TOKEN_LENGTH = 2048` ở `src/modules/auth/turnstile.ts` khớp tài liệu Cloudflare (https://developers.cloudflare.com/turnstile/get-started/server-side-validation/, mục đặc điểm của token: "Maximum length: 2048 characters"). Khoá thử của Cloudflare cấp token ngắn nên e2e không thể chứng minh điều này; sau khi bật khoá thật vẫn xem log: `turnstile_failed` kèm `missing_token` hàng loạt = ngưỡng hoặc máy khách còn `login.js` cũ.
4. Cổng thường lệ (`CLAUDE.md` §8): ghi điểm khôi phục `npx wrangler d1 time-travel info tourdao-sales-db`; chạy RIÊNG `npm test`, `npm run typecheck`, `npm run test:e2e` (kỳ vọng 13/13 + `audit-invariants --strict` xanh); chạy kịch bản Chrome: ba `docs/evidence/2026-09-20-a2/kich-ban/a2-smoke-*.mjs` (kỳ vọng 21 · 10 · 13 dòng ✓), `docs/evidence/2026-09-21-v1-0/kich-ban/v1-dang-nhap.mjs` (15 ✓, cần mạng, ≈ 9 phút), `v1-xac-nhan-png.mjs` (11 ✓) và `v1-nguoi-phu-trach.mjs` (12 ✓, ≈ 5 phút) — cách chạy: `tests/e2e/README.md`. Cả ba việc của v1.0 chưa có chữ ký thị giác của chủ dự án: nên xem ảnh ở `docs/evidence/2026-09-21-v1-0/anh/` (màn đăng nhập, ảnh xác nhận PNG, khối và bảng chọn người phụ trách) trước khi triển khai (chủ dự án quyết có coi là cổng hay không, như với A2), và thử trên iPhone thật những gì bằng chứng chưa phủ được (mục "Chưa kiểm" của README bằng chứng: canvas/chia sẻ/tải ảnh trong PWA, bảng chọn trên WebKit, widget Turnstile trong WebKit).

5. **Cổng chỉ-đọc TRƯỚC khi áp `0014`** — kỳ vọng `0`:
   ```
   npx wrangler d1 execute tourdao-sales-db --remote --command "SELECT count(*) AS mo_coi FROM staff s LEFT JOIN pty_party p ON p.id = s.party_id WHERE s.party_id IS NOT NULL AND p.id IS NULL"
   ```
   Số khác 0 = có tài khoản trỏ `party_id` tới hồ sơ không tồn tại: **KHÔNG áp `0014`**. Câu backfill cuối của `0014` (`INSERT INTO dsp_assignment … SELECT s.party_id …`) sẽ ném `FOREIGN KEY constraint failed` SAU khi các câu trước đó đã tạo bảng/chỉ mục/view. Sửa dữ liệu (chủ dự án quyết) rồi kiểm lại, chỉ áp khi ra `0`. (`PRAGMA foreign_key_check` — kiểm R-N1-10 của `audit-invariants` — cũng bắt loại lỗi này, nhưng script đó chỉ chạy được SAU khi áp `0014`, còn truy vấn ở đây chạy được TRƯỚC khi áp.)

   **Nếu `0014` dừng giữa chừng** (lệnh `npm run db:migrate:remote` báo lỗi): KHÔNG deploy Worker. Kiểm `npx wrangler d1 migrations list tourdao-sales-db --remote` (`0014` còn ở danh sách "chưa áp"; `0013` chỉ điền email, `AND email IS NULL` nên chạy lại vô hại). Coi như các đối tượng do `0014` tạo CÓ THỂ đã tồn tại dở dang (hành vi giao dịch của D1 với tệp nhiều câu chưa được đối chiếu ở đợt này), và chạy lại sẽ chết vì `table already exists`. Trước khi chạy lại phải gỡ đúng các đối tượng của `migrations/0014_dispatch.sql` — chỉ gồm dữ liệu gieo (4 loại việc, 2 trạng thái), backfill chưa chèn được dòng nào — từng câu một nếu remote từ chối nhiều câu trong một `--command`:
   ```
   DROP VIEW IF EXISTS v_dsp_order_handler
   DROP TABLE IF EXISTS dsp_assignment
   DROP TABLE IF EXISTS dsp_assignment_status
   DROP TABLE IF EXISTS dsp_task_kind
   ```
   (chỉ mục `dsp_assignment_order_ix`, `dsp_assignment_service_ix`, `dsp_assignment_party_ix`, `dsp_assignment_handler_open_uq` đi theo bảng `dsp_assignment`.) Rồi sửa nguyên nhân và chạy lại `npm run db:migrate:remote`. Hoặc khôi phục D1 Time Travel về điểm đã ghi ở bước 4 (đánh đổi: mất MỌI dữ liệu ghi sau điểm đó — xem mục "Hoàn tác").

**B. THỨ TỰ deploy — deploy MÃ TRƯỚC khi đặt secret** (không "cùng lượt", không secret trước): service worker phục vụ `/login` và `login.js` từ cache (stale-while-revalidate), nên iPhone đã cài PWA có thể còn chạy `login.js` CŨ (không gửi token) ở lần mở đầu; bật kiểm ngay sẽ khiến họ bị 403.
1. `npm run db:migrate:remote` (áp `0013` + `0014`), rồi **ngay sau đó** `npx wrangler deploy` trong cùng lượt làm việc. Lúc này Turnstile còn TẮT vì chưa có `TURNSTILE_SECRET_KEY`: `GET /api/auth/config` trả `{"turnstileSiteKey":null}`, đăng nhập như cũ; máy chủ ghi cảnh báo `turnstile_disabled` mỗi lần đăng nhập — bình thường ở bước này.
2. Đối chiếu người phụ trách sau khi áp `0014` (chỉ đọc):
   ```
   npx wrangler d1 execute tourdao-sales-db --remote --command "SELECT (SELECT count(*) FROM orders) AS don, (SELECT count(*) FROM dsp_assignment WHERE task_kind_code = 'HANDLE' AND valid_to_at IS NULL) AS phu_trach"
   ```
   Hai số bằng nhau nếu mọi người lập đơn đều có hồ sơ. Đơn do MÃ CŨ tạo trong khoảng giữa lúc áp `0014` và lúc deploy KHÔNG có dòng HANDLE — hợp lệ (đơn không người phụ trách là một trạng thái đúng), nhận bằng "Nhận phụ trách" (`dispatch.claim`); từ khi deploy mọi đơn mới tự có người phụ trách. Muốn liệt kê: đơn nào chưa có HANDLE đang mở (`… WHERE NOT EXISTS (SELECT 1 FROM dsp_assignment a WHERE a.order_id = o.id AND a.task_kind_code = 'HANDLE' AND a.valid_to_at IS NULL)`).
3. `node scripts/audit-invariants.mjs --db remote` (không `--strict`), CHẠY SAU khi đã áp `0014`: script kiểm cả bảng `dsp_*`, nên trên D1 chưa có `0014` nó **thoát mã 2** (không chạy được ≠ dữ liệu sạch); mã 1 = có bất biến bị vi phạm (kể cả R-DSP-3 chồng lấn).
4. Kiểm sau deploy (chỉ đọc, ngoài các trang tĩnh): `GET /api/company` (công khai) → 200 với đủ tên, MST, địa chỉ, hotline, email; và MỘT lời gọi `GET /api/dispatch/handlers?orderIds=<id của một đơn có thật>` (cần đăng nhập) → 200 với tên người phụ trách — câu SQL của nó dùng `json_each`, mới chỉ chạy trên miniflare/SQLite, CHƯA từng chạy trên D1 production. `curl -sI https://booking.tourdao.vn/login` phải có `Content-Security-Policy` cho phép `https://challenges.cloudflare.com`.
   Giao diện (đăng nhập bằng một tài khoản thật; CHỈ ĐỌC — chỉ mở trang, chưa bấm nút nào có ghi):
   - Danh sách đơn `/`: MỖI thẻ có dòng "Phụ trách: <tên>" hoặc chip "Chưa có người phụ trách". Chip là đúng với đơn của tài khoản chưa có hồ sơ lúc áp `0014` hoặc đơn mã cũ tạo giữa lúc áp và lúc deploy (đối chiếu số chip với truy vấn ở bước 2). **Thẻ KHÔNG có dòng nào và cũng không chip = lời gọi `GET /api/dispatch/handlers` đang lỗi** (giao diện chủ ý ẩn dòng khi không biết chứ không hiện chip): xem tab Mạng của trình duyệt hoặc `wrangler tail`; nghi trước hết câu `json_each` trên D1 thật.
   - Mở một đơn: có khối "Người phụ trách" (tên hoặc chip; KHÔNG được ra "Chưa tải được người phụ trách." — đó cũng là lời gọi lỗi); người lập hoặc quản trị thấy nút "Đổi người phụ trách". Nút "Xác nhận gửi khách" mở hộp thoại ảnh (đọc `GET /api/company` và `handlers`), ảnh có dòng "Nhân viên phụ trách: <tên>" khớp khối vừa xem.
5. **Để nhân viên mở app MỘT lần** (mở khi có mạng, để service worker nạp `login.js` mới); hoặc tự mở trang đăng nhập trên vài thiết bị đã cài PWA để chắc.
6. Bật Turnstile: `npx wrangler secret put TURNSTILE_SECRET_KEY` (dán khoá bí mật; KHÔNG cần deploy lại). Rồi kiểm: `GET /api/auth/config` phải KHÁC `{"turnstileSiteKey":null}` (phải trả đúng khoá site — nếu vẫn `null` thì secret/khoá site chưa vào); mở `/login` bằng trình duyệt THẬT (widget hiện, không chỉ curl) và đăng nhập thử bằng một tài khoản thật (kể cả một máy iPhone đã cài PWA); xem log (`wrangler tail` hoặc Logs của Worker): `turnstile_failed` (kèm `detail`) là 403, `turnstile_unavailable`/`turnstile_misconfigured` phải KHÔNG có. 403 hàng loạt ngay sau khi bật: thường là máy khách còn `login.js` cũ (đóng-mở app) hoặc ngưỡng `MAX_TOKEN_LENGTH` sai (mục A.3). Người đã mở trang đăng nhập TRƯỚC khi đặt secret (`config` lúc mở trả `null`, trang chưa có widget) sẽ bị 403 ở lần đăng nhập đầu, rồi trang tự hỏi lại cấu hình và dựng widget (`recoverConfig` ở `web/login.ts`; không cần tải lại) — bình thường, đừng nhầm với lỗi; vài dòng `turnstile_failed` `missing_token` ngay sau lúc bật là hệ quả đó.
7. Ghi trạng thái (mã, phiên bản Worker, điểm Time Travel, kết quả các kiểm trên và mục D nếu đã làm) vào mục "TRẠNG THÁI TRIỂN KHAI" ở đầu tệp này (không ghi vào `CLAUDE.md`: nó không còn ghi hiện trạng).

**C. Hoàn tác** (chỉ khi chủ dự án ra lệnh):
- **Turnstile:** `npx wrangler secret delete TURNSTILE_SECRET_KEY` tắt lại kiểm ngay (không cần deploy; đăng nhập quay về không token).
- **Worker về bản lần phát hành 1** (`a625adc4-43df-4e67-ac8e-f619aa98732b`, `main` @ `9b4ad33`) sau khi `0013`/`0014` đã áp: chạy được và KHÔNG mất dữ liệu — cả hai migration chỉ THÊM, và mã của bản đó không có module `dispatch`, không đọc/ghi `dsp_*` (chỉ một bài kiểm kiến trúc nhắc tiền tố `dsp_`), nên mọi dòng `HANDLE` và nhật ký `order_handler_changed` còn NGUYÊN trong D1, mã cũ chỉ bỏ qua chúng. Cái mất là TÍNH NĂNG, và mất LẶNG LẼ (không lỗi, không cảnh báo): (i) giao diện và route người phụ trách biến mất; (ii) ô `ownOrAssigned` của Bán hàng tụt về `own` (mã cũ: `order.modify`, `order.history.view`, `dispatch.assign` là `own`; `order.trip.edit` tuy là `ownOrAssigned` nhưng mã cũ không tiêm `assigned`) ⇒ người phụ trách KHÔNG phải người lập không còn sửa/xác nhận/huỷ/xem nhật ký/sửa chuyến của đơn được giao — nút biến mất hoặc bị 403, không thông báo nào giải thích; (iii) đơn tạo trong lúc lùi không có dòng `HANDLE` (hợp lệ; nhận bằng "Nhận phụ trách" sau khi triển khai lại; đếm bằng truy vấn ở B.2); (iv) lịch sử đơn và trang nhật ký hiện mã thô `order_handler_changed` thay vì "Đổi người phụ trách" (`actionLabel` của mã cũ trả nguyên mã khi không biết nhãn). Triển khai lại mã mới thì mọi thứ trở lại. **Đây KHÔNG phải cảnh báo "sai lặng lẽ về hồ sơ/quyền" của mục "Hoàn tác" phía trên** — cảnh báo đó nói về `staff.role`/`staff.full_name` khi lùi về bản TRƯỚC N1 (`0b13b279-…`); bản lần 1 đọc `stf_*`/`pty_*` đúng nên lùi về nó không làm tên trống hay quyền sai. Cửa sổ đóng băng thao tác tài khoản/quyền/hồ sơ vẫn theo quyết định của chủ dự án ở mục đó.
- **D1 Time Travel về điểm đã ghi trước khi áp:** mất MỌI dữ liệu ghi sau điểm đó — đơn mới, sửa đơn, MỌI dòng `HANDLE` mới và mọi lần đổi người phụ trách (cùng nhật ký của chúng), tài khoản/hồ sơ mới; `0013`/`0014` cũng bị gỡ (áp lại thì backfill lại người phụ trách = người lập). Chỉ dùng khi có lý do về dữ liệu, không chỉ vì lỗi giao diện; chủ dự án quyết.

**D. Thử ĐỔI người phụ trách trên MỘT đơn thử — thao tác GHI; làm SAU CÙNG, chỉ khi đã chắc không hoàn tác Worker (hoặc chấp nhận hậu quả ở mục C)**
Đổi người ghi `dsp_assignment` (đóng dòng `HANDLE` cũ, mở dòng mới) và một dòng nhật ký `order_handler_changed`. Nó không làm dữ liệu danh tính/quyền sai (khác các thao tác tài khoản ở mục "Hoàn tác"), nhưng sau nó: hoàn tác CHỈ Worker vẫn không mất dữ liệu song người vừa được giao mất quyền sửa đơn ấy (mục C ii), và hoàn tác bằng Time Travel xoá lần đổi này. Vì vậy đừng làm trước khi chủ dự án chắc chắn, và chỉ làm trên MỘT đơn thử.
1. Chuẩn bị: một đơn thử (lập bằng giao diện, tên khách ghi rõ là thử; đơn nháp — mã không có đường xoá đơn nên sau khi thử thì huỷ) và hai tài khoản Bán hàng/Quản trị đang hoạt động có hồ sơ (`GET /api/dispatch/assignees` liệt kê).
2. Đăng nhập bằng người lập hoặc quản trị, mở đơn thử → khối "Người phụ trách" → "Đổi người phụ trách" → chọn người khác → "Lưu người phụ trách". Kỳ vọng: bảng đóng, banner "Đã đổi người phụ trách sang <tên>.", khối và dòng "Phụ trách" ở danh sách hiện tên mới, lịch sử đơn có dòng "Đổi người phụ trách" (kèm người thao tác); trang `/audit` (quản trị) có chi tiết "từ <A> sang <B>" (chỉ tên, không SĐT).
3. Bấm "Xem biên nhận" (trước 1.11: "Xác nhận gửi khách"): ảnh phải in ĐÚNG tên người mới ở dòng "Nhân viên phụ trách" (ảnh dựng ở trình duyệt, đọc tên lúc mở, không nhớ đệm).
4. Nếu có thể, đăng nhập bằng người mới được giao: thấy đơn thử và sửa được (đơn nháp); một tài khoản Bán hàng thứ ba không liên quan không thấy nút đổi/nhận và không sửa được.
5. Dọn: có thể đổi lại về người lập (thêm một dòng lịch sử — không có "hoàn tác", lịch sử và nhật ký luôn còn), rồi huỷ đơn thử. Ghi kết quả vào B.7.

## Lần phát hành 0015 + 0016 (chế độ bảo trì) — ĐÃ THỰC HIỆN 2026-09-21 — RUNBOOK (giữ làm mẫu)

Chỉ khi chủ dự án ra lệnh trong phiên đó (`CLAUDE.md` §8, "Git, triển khai, an toàn"). Mã: nhánh `worktree-che-do-bao-tri` (đã deploy và đã merge vào `main` — xem trạng thái ở đầu tệp). Migration: `0015_staff_last_login` (thêm cột `staff.last_login_at`, TEXT NULL) và `0016_maintenance` (bảng singleton `mnt_setting`, gieo TẮT) — cả hai chỉ THÊM (expand-only), áp CÙNG một lệnh `npm run db:migrate:remote`. Mã CŨ (v1.0, Worker `21cbaca5-8229-43b8-bab8-928036c9e871`) không đọc cột/bảng mới nên vẫn chạy trên schema mới. Thiết kế: `docs/SYSTEM-DESIGN.md` mục 4 ("Chế độ bảo trì"), nhật ký thi công `docs/superpowers/plans/2026-09-21-che-do-bao-tri-thi-cong-nhat-ky.md`.

**A. TRƯỚC khi deploy**
1. Điểm khôi phục: `npx wrangler d1 time-travel info tourdao-sales-db`. Chạy RIÊNG `npm test`, `npm run typecheck`, `npm run test:e2e` trên đúng mã sẽ deploy (đã có: 388 test, typecheck 0 lỗi, e2e 14/14 + `audit-invariants` xanh). Chạm `web/login.ts`/`public/login.html` nên phải có kịch bản Chrome `v1-dang-nhap.mjs` (cần mạng) và `v1-bao-tri.mjs` (đã chạy: 15 ✓ và 17 ✓).
2. Cổng chỉ-đọc: `npx wrangler d1 migrations list tourdao-sales-db --remote` báo ĐÚNG hai migration chờ (`0015`, `0016`). Hai migration này không có backfill, không khoá ngoại, không siết gì — không có cổng dữ liệu riêng như `0014`.
3. Nếu định bật chế độ bảo trì ngay sau đó: nhắn nhân viên trước (mục B.4).

**B. THỨ TỰ**
1. `npm run db:migrate:remote` (áp `0015` + `0016`), rồi **ngay sau đó** `CI=1 npx wrangler deploy` trong cùng lượt làm việc. Không có biến/bí mật mới phải đặt. Khoảng giữa hai lệnh vô hại (Worker cũ chạy trên schema mới).
2. Kiểm sau deploy (chỉ đọc; KHÔNG in SĐT): `CI=1 npx wrangler d1 execute tourdao-sales-db --remote --command "SELECT enabled, ends_at FROM mnt_setting"` → `enabled = 0`, `ends_at` rỗng; `GET /api/auth/config` có `"maintenance":{"on":false,"endsAt":null}`; `GET /api/maintenance` chưa đăng nhập → 401; `node scripts/audit-invariants.mjs --db remote` xanh (KHÔNG có bất biến riêng cho `mnt_setting`); `/sw.js` `no-store`; 10 trang 200.
3. **Cột "Đăng nhập gần nhất" (`/staff`, quản trị):** lúc mới deploy mọi tài khoản hiện "Chưa đăng nhập" — đúng, vì cột chỉ ghi từ lần đăng nhập đầu tiên SAU deploy. Nó ghi khi ĐĂNG NHẬP (không phải khi phiên còn sống được dùng tiếp), nên người còn phiên cũ chưa đăng nhập lại vẫn hiện "Chưa đăng nhập" dù đang dùng app. Cần buộc mọi người đăng nhập lại để có mốc = xoay `SESSION_SECRET` (việc riêng, cần lệnh của chủ dự án, đăng xuất TẤT CẢ). Chủ theo dõi cột này.
4. **Bật chế độ bảo trì** — chỉ khi chủ quyết, và SAU khi cột "Đăng nhập gần nhất" cho thấy mọi người cần dùng app đã đăng nhập bằng bản mới. Nhắn nhân viên trước; bật vào giờ vắng. Dùng tài khoản chủ (`/account` → "Chế độ bảo trì" → chọn giờ dự kiến → Bật). Kiểm: đăng nhập bằng một tài khoản khác (hoặc cửa sổ ẩn danh) → thấy thông điệp bảo trì + đếm ngược, không vào được; chủ dùng app bình thường và thấy dải "Đang ở chế độ bảo trì"; `/audit` có dòng "Đổi chế độ bảo trì" (nhóm "Hệ thống"). Tắt bằng nút ở `/account` khi xong. Bị khoá ngoài → mục "Chế độ bảo trì — đường thoát khẩn" ngay dưới.
5. Ghi trạng thái (mã, phiên bản Worker, điểm Time Travel, kết quả các kiểm trên) vào đầu tệp này (không ghi vào `CLAUDE.md`).

**C. Hoàn tác**
- **Chế độ bảo trì:** tắt bằng nút ở `/account` hoặc bằng SQL (mục dưới); không cần deploy.
- **Worker về `21cbaca5-…` (v1.0):** an toàn, không mất dữ liệu (`0015`/`0016` chỉ thêm, mã cũ không đọc chúng). Mất: cột "Đăng nhập gần nhất", nút và **cổng** bảo trì. **Cẩn thận: lùi Worker khi chế độ bảo trì đang BẬT làm app MỞ LẠI cho mọi người** (mã cũ không có cổng) — tắt chế độ trước nếu muốn giữ đúng ý.
- **Time Travel** không cần cho lần này (không có thay đổi dữ liệu nào phải gỡ); nếu dùng, mất mọi dữ liệu ghi sau điểm đã ghi.

## Lần phát hành kế tiếp: `0017` (trigger bảo vệ trạng thái đơn + nhật ký chỉ-thêm) — RUNBOOK

Chỉ khi chủ dự án ra lệnh trong phiên đó (`CLAUDE.md` §8). Mã: `migrations/0017_order_status_audit_guards.sql` — chỉ THÊM trigger `orders_status_transition` (chặn `orders.status` đổi sai chiều, kể cả SQL chạy tay) và `audit_log_no_update`/`audit_log_no_delete` (chặn sửa/xoá `audit_log`). Không đổi hành vi mã (mã hiện tại chưa từng đi lùi trạng thái hay sửa/xoá nhật ký) nên **không cần `wrangler deploy` đi kèm**. Bối cảnh: báo cáo đối chiếu Oracle TCA (`docs/superpowers/specs/2026-09-21-doi-chieu-oracle-tca.md`), kế hoạch hành động (`docs/superpowers/plans/2026-09-21-doi-chieu-oracle-tca-ke-hoach-hanh-dong.md`, Task 3).

**A. TRƯỚC khi áp (chỉ đọc)**
1. Cổng chỉ-đọc: `CI=1 npx wrangler d1 migrations list tourdao-sales-db --remote` (nhìn TÊN, không nhìn số: có hai tệp `0016_*`). Chỉ được thấy `0017_order_status_audit_guards` là migration chưa áp. Nếu còn tệp khác chưa áp (ví dụ `0016_feedback`) thì DỪNG và hỏi chủ dự án — hai phiên khác nhau từng đều cho là đã "deploy `0016`" trong khi thực ra một phiên deploy `0016_maintenance` và phiên kia deploy `0016_feedback`, nên production có thể còn thiếu một trong hai; kiểm lại bằng chính TÊN migration ở `migrations list --remote`, không suy đoán từ ghi chú hiện trạng.
2. Chỉ-đọc: `node scripts/audit-invariants.mjs --db remote` phải xanh. Bộ kiểm này KHÔNG xem trạng thái đơn, nên chạy thêm `CI=1 npx wrangler d1 execute tourdao-sales-db --remote --command "SELECT status, count(*) AS n FROM orders GROUP BY status"` và ghi kết quả: chỉ được có `draft`/`confirmed`/`cancelled`. Trigger không kiểm dòng cũ, nhưng giá trị lạ nghĩa là đã có đường ghi ngoài mã, phải hỏi chủ dự án trước khi áp. Ghi điểm khôi phục D1 Time Travel: `npx wrangler d1 time-travel info tourdao-sales-db`.
3. `npm test` + `npm run typecheck` + `npm run test:e2e` xanh trên đúng commit sẽ áp.

**B. THỨ TỰ**
1. `CI=1 npm run db:migrate:remote`. Migration không đổi hành vi mã nên **không cần** `wrangler deploy` đi kèm — **chỉ đúng khi `0017` là migration DUY NHẤT chưa áp** (đã xác nhận ở A.1); `db:migrate:remote` áp MỌI migration đang chờ trong một lượt, nên nếu còn migration khác (ví dụ đổi hành vi mã) đi cùng thì phải quay về trình tự triển khai đầy đủ của HANDOFF-N1 (cổng chỉ-đọc, `npm test`/`typecheck`/e2e, áp migration rồi `wrangler deploy` NGAY, kiểm sau deploy) chứ không được bỏ qua `wrangler deploy`.
2. Kiểm sau áp (chỉ đọc): `CI=1 npx wrangler d1 execute tourdao-sales-db --remote --command "SELECT name FROM sqlite_master WHERE type='trigger' AND name IN ('orders_status_transition','audit_log_no_update','audit_log_no_delete')"` → 3 dòng — riêng câu này đã đủ chứng minh cả ba trigger tồn tại, không cần bước ghi nào khác. Thử tay một lần xác nhận + huỷ đơn thử trên app là **tuỳ chọn, chủ dự án quyết** (đây là thao tác GHI thật trên production: không có xoá cứng nên đơn thử này VĨNH VIỄN còn trong dữ liệu — chỉ trạng thái đổi `draft → confirmed → cancelled`; cần một dịch vụ có đủ thông tin chuyến để xác nhận được). `audit-invariants --db remote` xanh.
3. Ghi trạng thái vào đầu tệp này (mã, điểm Time Travel, kết quả các kiểm trên; không ghi vào `CLAUDE.md`).

**C. Hoàn tác:** chỉ khi chủ dự án ra lệnh rõ trong phiên đó — đây là thao tác GHI lên D1 remote.
1. Gỡ cả ba trigger bằng MỘT lệnh execute (ba câu `DROP TRIGGER`, chạy được trong cùng lời gọi):
   ```
   CI=1 npx wrangler d1 execute tourdao-sales-db --remote --command "DROP TRIGGER IF EXISTS orders_status_transition; DROP TRIGGER IF EXISTS audit_log_no_update; DROP TRIGGER IF EXISTS audit_log_no_delete;"
   ```
2. Lệnh trên **không** gỡ dòng `0017_order_status_audit_guards` khỏi bảng `d1_migrations` — migration vẫn được ghi là đã áp, nên một lần `db:migrate:remote` sau đó KHÔNG áp lại `0017` và KHÔNG dựng lại ba trigger. Muốn dựng lại, phải tạo MỘT MIGRATION MỚI (số kế tiếp sau migration cuối cùng đang có trong `migrations/` — hiện là sau `0018`, không phải áp lại `0017`) có cùng nội dung `CREATE TRIGGER`.
3. Sau khi gỡ, kho mã (test/kiến trúc) vẫn coi như production có ba trigger này — không có kiểm máy nào phát hiện lệch — nên PHẢI ghi ngay vào mục "TRẠNG THÁI TRIỂN KHAI" ở đầu tệp này: ngày gỡ, lý do, và rằng production hiện KHÔNG có ba trigger bảo vệ dù `0017` còn nằm trong `d1_migrations`.

## Lần phát hành kế tiếp: `0018` + mã N2 lát 1 (người đặt trên đơn) — RUNBOOK

Chủ dự án quyết và TỰ CHẠY các lệnh ghi lên remote (`wrangler d1 migrations apply --remote`, `wrangler deploy`) — `CLAUDE.md` §8: AI không tự chạy các lệnh này. Mã: `migrations/0018_orders_booker_party.sql` (chỉ THÊM cột `orders.booker_party_id` TEXT NULL + FK `pty_party(id)` NO ACTION + chỉ mục `orders_booker_party_idx`) **cùng với mã N2 lát 1** (`src/shared/booker.ts`/`party-id.ts`, `resolveBooker`, route `PUT /api/orders/:id/booker`, `OrderDto.bookerPartyId/bookerName`, giao diện `web/booker-picker.ts`/`web/booker-sheet.ts`). Đặc tả: `docs/superpowers/specs/2026-09-21-n2-lat-1-khach-tren-don.md` (§13 ghi hai lệch đặc tả có chủ ý). Kế hoạch thi công + ruling: `docs/superpowers/plans/2026-09-21-n2-lat-1-khach-tren-don.md`. ADR: `docs/adr/ADR-0011-khach-tren-don-ngoai-le-quyen.md`.

**KHÁC lần phát hành `0017`: lần này CÓ đổi mã (route mới, `OrderDto` có trường mới, giao diện mới) nên PHẢI `wrangler deploy` NGAY sau khi áp migration** — không được tách rời hai bước như `0017` (migration không đổi hành vi mã nên `0017` không cần deploy đi kèm; `0018` thì cần).

**A. TRƯỚC khi áp (chỉ đọc)**
1. Cổng chỉ-đọc: `CI=1 npx wrangler d1 migrations list tourdao-sales-db --remote` (nhìn TÊN). Kỳ vọng CHỈ thấy `0018_orders_booker_party` là migration chưa áp (xác nhận `0017_order_status_audit_guards` đã áp — xem "TRẠNG THÁI TRIỂN KHAI" đầu tệp).
2. `node scripts/audit-invariants.mjs --db remote` xanh. Ghi điểm khôi phục D1 Time Travel: `npx wrangler d1 time-travel info tourdao-sales-db`.
3. `npm test` (kỳ vọng 424/424) + `npm run typecheck` (0 lỗi) + `npm run build:web` + `npm run test:e2e` (kỳ vọng `E2E: 16/16 kịch bản xanh`, thêm kịch bản `booker` + `audit-invariants --strict`) xanh trên đúng commit sẽ deploy. Đã chạm `web/order-form.ts`, `web/order.ts` → chạy lại ba `docs/evidence/2026-09-20-a2/kich-ban/a2-smoke-*.mjs`; đã chạm khối "Người phụ trách"/`web/handler-sheet.ts` gián tiếp qua `web/order.ts` → chạy lại `docs/evidence/2026-09-21-v1-0/kich-ban/v1-nguoi-phu-trach.mjs` (cách chạy: `tests/e2e/README.md`).

**B. THỨ TỰ**
1. `CI=1 npm run db:migrate:remote` (áp `0018` — chỉ ADD COLUMN + CREATE INDEX, không backfill, không cổng dữ liệu riêng như `0014`), **ngay sau đó** `CI=1 npx wrangler deploy` trong cùng lượt làm việc. Mã cũ (nếu deploy trễ) vẫn chạy được với cột mới vì chỉ `SELECT o.*` (không liệt kê cột) — nhưng đừng dựa vào đó để trì hoãn, cứ deploy ngay theo đúng quy tắc chung.
2. Kiểm sau deploy (chỉ đọc): `GET /order-form` 200; `GET /api/orders/:id` (đăng nhập, một đơn bất kỳ) trả `bookerPartyId`/`bookerName` (đơn cũ: cả hai `null` — đúng, lát 2 mới backfill; `GET /api/orders` liệt kê KHÔNG có hai trường này — `OrderSummaryDto` không mang người đặt); `node scripts/audit-invariants.mjs --db remote` xanh (không có bất biến riêng cho `booker_party_id`); `/sw.js` `no-store`; 11 trang 200. Lập một đơn thử có gắn/không gắn hồ sơ khách là **thao tác GHI thật**, KHÔNG bắt buộc — chủ dự án quyết (tương tự mục D của runbook v1.0).
3. Ghi trạng thái (mã, điểm Time Travel, kết quả kiểm trên) vào mục "TRẠNG THÁI TRIỂN KHAI" đầu tệp này (thay mục "CHỜ TRIỂN KHAI — N2 lát 1"). `CLAUDE.md` mới không ghi hiện trạng production.

**C. Hoàn tác:** chỉ khi chủ dự án ra lệnh rõ trong phiên đó — đây là thao tác trên production (Worker, không GHI D1 remote nếu chỉ lùi Worker, xem dưới).
- **Lùi Worker về phiên bản trước `0018`:** AN TOÀN, không mất dữ liệu — mã cũ chỉ `SELECT o.*` (không liệt kê cột) nên bỏ qua cột `orders.booker_party_id` mới; câu `UPDATE orders` của mã cũ không nhắc tên cột này nên KHÔNG BAO GIỜ đụng tới nó, các liên kết người đặt đã gắn bằng mã mới (nếu có) vẫn còn nguyên trong cột, chỉ không hiển thị/sửa được nữa cho tới khi deploy lại mã mới. Redeploy bằng `wrangler deploy` phiên bản Worker trước đó (Cloudflare Dashboard → Deployments, hoặc `wrangler rollback` nếu dùng).
- **KHÔNG xoá cột `orders.booker_party_id`:** không có migration "contract" nào gỡ cột này ở lát 1 — hoàn tác chỉ là lùi mã, không xoá dữ liệu. Muốn gỡ cột phải là một migration mới, riêng, sau khi chắc chắn không hoàn tác nữa (ngoài phạm vi runbook này).
- **Hồ sơ khách được TẠO trong lúc mã mới còn chạy** (qua "tạo hồ sơ mới" khi lập/sửa đơn) vẫn còn nguyên ở `pty_party`/`pty_person` sau khi lùi Worker — không tự xoá; muốn ngưng dùng thì vào `/parties` ngưng hoạt động tay (đây là thao tác GHI, chủ dự án quyết).
- Ghi việc hoàn tác (ngày, lý do, phiên bản Worker đã lùi về) vào mục "TRẠNG THÁI TRIỂN KHAI" đầu tệp này.

**Lưu ý cho chủ dự án — service worker cache `order-form.js` cũ trên iPhone đã cài PWA:**
Nếu một máy vẫn đang chạy bản `order-form.js` CŨ (từ trước lần deploy này, do service worker phục vụ cache stale-while-revalidate — như mục B của runbook v1.0 đã nói) và người dùng SỬA một đơn NHÁP đã có người đặt bằng máy đó, request `PUT /api/orders/:id` gửi đi sẽ KHÔNG có `bookerPartyId` cũng không có `newBooker` (mã cũ không biết hai trường này). Sau đợt sửa cuối cùng trước khi lên production: máy chủ, trên đúng đường `PUT /api/orders/:id`, phát hiện thân yêu cầu vắng CẢ HAI khoá này và **GIỮ NGUYÊN** người đặt đang lưu trên đơn (không coi là bỏ gắn) — không gọi lại `resolveBooker` để tránh 400 nếu hồ sơ giữ lại vừa bị ngưng trong lúc đó; `bookerPartyId: null` tường minh (client mới, người dùng chủ động bấm "Bỏ gắn") vẫn bỏ gắn như thường. Rủi ro còn lại: không có — một client cũ sửa đơn nháp đã gắn khách sẽ giữ nguyên người đặt, chỉ mất khả năng ĐỔI người đặt cho tới khi mở lại app (service worker tự cập nhật `order-form.js` mới nhờ `BUILD_ID` đổi mỗi lần deploy, như cơ chế Turnstile ở v1.0) — không còn đường âm thầm gỡ hồ sơ khách. `POST /api/orders` và `PUT /api/orders/:id/booker` không đổi hành vi (vắng cả hai khoá vẫn là "không gắn"/"không đổi" như trước, đúng nghiệp vụ của hai đường đó).

## Lần phát hành kế tiếp: `0023` (đăng nhập nhanh bằng Face ID / passkey, ADR-0016) — RUNBOOK

Chủ dự án quyết và TỰ CHẠY các lệnh ghi lên remote (`wrangler d1 migrations apply --remote`, `wrangler deploy`) — `CLAUDE.md` §8: AI không tự chạy các lệnh này; mục này chỉ chuẩn bị và liệt kê NGUYÊN LỆNH. Mã: `migrations/0023_auth_passkey.sql` (chỉ THÊM bảng `aut_passkey`, KHÔNG đổi bảng cũ) **cùng với mã module `auth`/`accounts`** (10 route mới — 2 công khai đăng nhập, 7 tự phục vụ, 1 admin, xem `docs/SYSTEM-DESIGN.md` §7) và giao diện (`web/passkey.ts`, nút Face ID ở `web/login.ts`, mục Face ID ở `web/account.ts`, nút gỡ cho quản trị ở `web/staff.ts`). Đặc tả: `docs/superpowers/specs/2026-09-23-passkey-design.md`; kế hoạch: `docs/superpowers/plans/2026-09-23-passkey.md`. ADR: `docs/adr/ADR-0016-*.md`.

**Giống lần phát hành `0018`: lần này CÓ đổi mã (route mới, giao diện mới) nên PHẢI `wrangler deploy` NGAY sau khi áp migration** — không tách rời hai bước.

**Cấu hình mới, KHÔNG có bí mật mới:** `PASSKEY_RP_ID` = `booking.tourdao.vn`, `PASSKEY_ORIGIN` = `https://booking.tourdao.vn` — cả hai đã có sẵn trong `wrangler.jsonc` (`vars`, đi CÙNG mã khi deploy, không cần `wrangler secret put` riêng, khác Turnstile). Thiếu tính năng nào phía nhân viên trước khi deploy hoàn tất: nút Face ID không hiện (an toàn, không lỗi).

**Điều kiện tiên quyết:** commit sẽ deploy là `main` ĐÃ GỘP nhánh này, gồm cả "8b" (ngưng tài khoản gỡ Face ID trong cùng lô ghi, chủ chọn A-4 phương án 1 — đã làm trên nhánh, cần qua kiểm độc lập trước khi gộp).

**Cách chạy (từ 2026-09-23, trong ứng dụng Terminal của macOS):** sau khi làm tay kịch bản Chrome ở A.3 (e2e đủ bộ thì `npm run trien-khai` tự chạy), gộp và đẩy bằng `npm run day-len -- worktree-thi-cong-passkey` (bảng tóm tắt sẽ liệt kê `0023_auth_passkey.sql` là migration mới), rồi triển khai bằng `npm run trien-khai` — lệnh làm thay A.1, A.2, B.1, phần `audit-invariants` của B.2 và in khối cho B.4 (xem mục "Đẩy lên GitHub và triển khai: HAI LỆNH" ở trên). **Lệnh tự chặn nếu `0023` chưa áp:** nó đọc `migrations list --remote`, thấy `0023` còn chờ thì hỏi áp TRƯỚC khi hỏi deploy; trả lời `k` là không deploy; áp lỗi là không deploy. Chỉ trường hợp đã áp rồi mà trả lời `k` ở câu deploy thì lệnh in cảnh báo đỏ kèm lệnh deploy — khi đó phải deploy NGAY. Các bước A/B dưới đây giữ làm bảng giải thích.

**A. TRƯỚC khi áp (chỉ đọc)**
1. Cổng chỉ-đọc: `CI=1 npx wrangler d1 migrations list tourdao-sales-db --remote` (nhìn TÊN). Kỳ vọng CHỈ thấy `0023_auth_passkey.sql` là migration chưa áp (đối chiếu 2026-09-23: đúng như vậy — mọi migration khác đã lên production, `0019` cố ý bỏ trống chờ B5). **B5 (`staff_party_required`) KHÔNG được có mặt trong `migrations/` ở lần phát hành này.**
2. Ghi điểm khôi phục D1 Time Travel: `npx wrangler d1 time-travel info tourdao-sales-db`. **KHÔNG chạy `audit-invariants --db remote` ở bước này:** bộ kiểm có `R-AUT-1` đọc bảng `aut_passkey`, bảng này chưa tồn tại trước khi áp `0023` nên script thoát mã 2 ("không chạy được", không phải "dữ liệu sạch"). Bất biến chỉ chạy ở bước B.2, sau khi áp.
3. `npm test` (kỳ vọng **545/545** trên đầu nhánh `worktree-thi-cong-passkey` sau đợt bổ sung 2026-09-23 — gồm 4 test của `R-AUT-1`, 4 test "tắt ⇒ mọi route passkey 503" ở `src/passkey-off.test.ts`, 5 test 8b ở `src/modules/accounts/patch-staff.test.ts`; con số SẼ ĐỔI khi gộp với `main` nếu `main` đã có thêm test — lấy số `npm test` của chính commit gộp làm chuẩn) + `npm run typecheck` (0 lỗi) + `npm run build:web` + `npm run test:e2e` (đủ bộ, đuôi `audit-invariants --strict`) xanh trên đúng commit sẽ deploy — chạy trên `main` ĐÃ GỘP nhánh này, không phải trên worktree. Đã chạm `web/login.ts`, `web/account.ts`, `web/staff.ts` → chạy lại kịch bản Chrome `docs/evidence/2026-09-23-passkey/kich-ban/passkey-smoke.mjs` VÀ ba kịch bản cũ hay đụng (`v1-dang-nhap.mjs`, `v1-bao-tri.mjs`, `dot-c-smoke.mjs` — các kịch bản này tự chạy `wrangler dev` riêng nên phải TỰ ghi đè `PASSKEY_RP_ID:`/`PASSKEY_ORIGIN:` rỗng, xem công thức r của `docs/CHANGE-GUIDE.md`, nếu không lời mời Face ID xen vào làm hồi quy).

**B. THỨ TỰ**
1. `CI=1 npm run db:migrate:remote` (áp `0023` — chỉ `CREATE TABLE`/`CREATE INDEX`, không backfill, không cổng dữ liệu riêng), **ngay sau đó** `CI=1 npx wrangler deploy` trong cùng lượt làm việc.
2. Kiểm sau deploy (chỉ đọc): `GET https://booking.tourdao.vn/api/auth/config` có `"passkey":true`; `node scripts/audit-invariants.mjs --db remote` — **kỳ vọng XANH HOÀN TOÀN, kể cả `R-AUT-1`** (8b: ngưng tài khoản luôn gỡ Face ID trong cùng lô ghi). Bất kỳ bất biến nào đỏ, kể cả `R-AUT-1`, là lỗi thật: dừng, báo, cân nhắc hoàn tác ở mục C; KHÔNG nới bất biến; `migrations list --remote` "No migrations to apply"; `/sw.js` `no-store`; 11+ trang 200.
3. **Chủ tự thử trên iPhone thật** (thao tác của người, không phải AI): bật Face ID ở trang Tôi, đăng xuất, đăng nhập lại bằng Face ID, gỡ. Ghi lại kết quả (ảnh/mô tả) vào `docs/evidence/2026-09-23-passkey/`.
4. Ghi trạng thái (mã, điểm Time Travel, kết quả kiểm trên) vào mục "TRẠNG THÁI TRIỂN KHAI" đầu tệp này (thay mục "CHỜ TRIỂN KHAI — Đăng nhập nhanh bằng Face ID / passkey").

**C. Hoàn tác:** chỉ khi chủ dự án ra lệnh rõ trong phiên đó.
- **Tắt tính năng mà KHÔNG lùi mã:** xoá hai dòng `PASSKEY_RP_ID`/`PASSKEY_ORIGIN` khỏi `vars` của `wrangler.jsonc` rồi `wrangler deploy` lại — mọi route passkey (cả 10, kể cả xem danh sách và gỡ — người dùng KHÔNG tự gỡ được, quản trị viên cũng KHÔNG gỡ hộ được qua nút "Gỡ Face ID" khi đang tắt; muốn thu hồi thì đặt lại PIN, vì `reset-pin` vẫn gỡ hết Face ID dù tắt) trả 503 `passkey_unavailable`, nút Face ID biến mất khỏi giao diện (đọc `GET /api/auth/config` → `passkey: false`), bảng `aut_passkey` GIỮ NGUYÊN dữ liệu (không mất Face ID đã bật, bật lại `vars` là dùng được ngay).
- **Lùi Worker về phiên bản trước `0023`:** AN TOÀN — mã cũ không biết bảng `aut_passkey` nên không bao giờ đọc/ghi nó; bảng mới bị "treo" vô hại cho tới khi deploy lại mã mới.
- **KHÔNG xoá bảng `aut_passkey`:** không có migration "contract" nào gỡ bảng này ở lần phát hành này.
- Ghi việc hoàn tác (ngày, lý do) vào mục "TRẠNG THÁI TRIỂN KHAI" đầu tệp này.

## Lần phát hành kế tiếp: `0024` (mô hình người–vai–quyền, ADR-0018, GĐ1) — RUNBOOK

Chủ dự án quyết và TỰ CHẠY các lệnh ghi lên remote (`wrangler d1 migrations apply --remote`, `wrangler deploy`) trong ứng dụng Terminal của macOS — `CLAUDE.md` §8: AI không tự chạy các lệnh này; mục này chỉ chuẩn bị và liệt kê NGUYÊN LỆNH, không phải lệnh để AI gõ. Mã: `migrations/0024_vai_quyen_mac_dinh.sql` **cùng với mã** module `staff`/`accounts`/`parties` (11 vai, trang Nhân viên chọn vai, route `GET/PUT /api/staff/:id/roles`) và giao diện (`web/role-picker.ts`, `web/staff.ts`, `web/parties.ts`). Đặc tả: `docs/superpowers/specs/2026-09-24-mo-hinh-nguoi-vai-quyen-design.md`; kế hoạch: `docs/superpowers/plans/2026-09-24-mo-hinh-vai-gd0-gd1.md`; ADR: `docs/adr/ADR-0018-mo-hinh-nguoi-vai-quyen.md`.

**Migration `0024` CHỈ THÊM** — cột `pty_role_type.role_group`, 10 dòng vai mới trong `pty_role_type` (vai thứ 11, "Kế toán" `ACCOUNTANT`, dùng lại dòng có sẵn — chỉ gán nhóm INTERNAL), bảng `stf_permission_adjustment`, view `v_pty_open_role_group`, hai trigger CSDL (LC-1, LC-3). **Không đổi quyền của bất kỳ tài khoản nào đang có** — không có câu nào tự tính lại quyền cho tài khoản chưa được gán vai mới; route quyền cũ (`PUT /api/staff/:id/permissions`) vẫn chạy y như trước cho tài khoản chưa gán vai.

**Trước khi deploy — một lệnh chỉ đọc, chủ dự án tự chạy, để biết trước có bao nhiêu tài khoản sẽ đổi cách quản lý (không đổi quyền):** hồ sơ đang giữ vai "Kế toán" (mã cũ `ACCOUNTANT`) không gắn với một địa điểm cụ thể, đang mở — sau khi áp `0024`, các tài khoản này sẽ được đọc là đã có vai mô hình mới (vai nhóm INTERNAL, spec §4 "ACCOUNTANT dùng lại"), tức trở thành "role-managed": sửa quyền của họ sau đó phải qua trang Nhân viên, route quyền cũ trả 409 thay vì áp dụng — QUYỀN THỰC TẾ của họ không đổi một ô nào.

```
npx wrangler d1 execute tourdao-sales-db --remote --command "SELECT (s.id IS NOT NULL) AS co_tk, (r.location_id IS NOT NULL) AS gan_noi, (r.valid_to_date IS NOT NULL) AS co_ngay_kt, count(*) FROM pty_party_role r LEFT JOIN staff s ON s.party_id = r.party_id WHERE r.role_type_code='ACCOUNTANT' AND (r.valid_to_date IS NULL OR r.valid_to_date >= date('now','+7 hours')) GROUP BY 1,2,3"
```

Cách đọc: mỗi dòng là một nhóm dòng vai "Kế toán" còn hiệu lực — `co_tk` = 1 là hồ sơ đã có tài khoản; chỉ nhóm `gan_noi` = 0 VÀ `co_ngay_kt` = 0 mới được đọc là vai mô hình mới (nhóm có `co_tk` = 1 là số tài khoản đổi cách quản lý; nhóm `co_tk` = 0 là hồ sơ chưa có tài khoản — khi tạo tài khoản cho họ, trang Nhân viên bắt chọn cả vai Kế toán); các nhóm còn lại (gắn nơi, hoặc có ngày kết thúc) KHÔNG được mô hình mới nhìn thấy — xem nợ (a) ở mục "Việc còn treo".

(Dùng `--command`, KHÔNG dùng `--file`: đường `--file` đi qua cổng nhập khác, từ chối xác thực OAuth — xem nhật ký thi công `docs/superpowers/plans/2026-09-24-mo-hinh-vai-thi-cong-nhat-ky.md`.)

**Các bước phát hành — CHỦ DỰ ÁN tự gõ trong ứng dụng Terminal của macOS, đứng ở thư mục gốc repo (`tourdao-sales`, KHÔNG phải thư mục worktree); AI không chạy các lệnh này (`CLAUDE.md` §8):**
1. Gộp và đẩy nhánh lên `main`:
```
npm run day-len -- gd1-mo-hinh-vai
```
2. Chạy toàn bộ dây chuyền triển khai (cổng chỉ-đọc, kiểm phiên bản, điểm khôi phục, test, migration `0024`, deploy, kiểm sau deploy):
```
npm run trien-khai
```

**Hoàn tác — chỉ khi chủ dự án quyết:** nếu lùi Worker về bản cũ mà GIỮ `0024` (migration không lùi được), (1) tài khoản Thực tập sinh mất mọi quyền truy cập (mã cũ không biết quyền Thực tập — hỏng theo hướng an toàn), và (2) route Hồ sơ cũ sẽ lại nhận gán 10 mã vai mới cho hồ sơ (bản cũ không biết nhóm vai tài khoản). Vì vậy không tự lùi; chủ dự án cân nhắc rồi quyết.

**Sau khi áp `0024`:**
1. `CI=1 npx wrangler d1 migrations list tourdao-sales-db --remote` (nhìn TÊN) → sạch, không còn migration chờ.
2. `node scripts/audit-invariants.mjs --db remote` (chỉ đọc) → **R-LC-1 và R-LC-3 phải = 0 vi phạm.** Kiểm "thông tin" (mức nhẹ hơn, không `--strict`) có thể cảnh báo — không đỏ khi không chạy `--strict`; chạy `--strict` riêng nếu muốn xem đủ.
3. **KHÔNG gán vai hàng loạt.** Chưa có bảng đối chiếu "tài khoản nào nên mang vai nào" — việc đó thuộc đặc tả §14 giai đoạn 2 (chưa làm). Sau khi 0024 lên production, mọi tài khoản (kể cả các dòng "Kế toán" đếm được ở bước trên) vẫn hoạt động y như trước cho tới khi có người vào trang Nhân viên gán vai TỪNG tài khoản một, có xem trước quyền trước khi lưu.

**Báo trước nhân viên (trước khi bấm deploy, không phải sau):**
- Nhãn quyền "Super Admin" đổi tên thành **"Toàn quyền"**.
- Chỉ tài khoản **Toàn quyền** mới cấp được quyền **Quản trị** cho người khác (trước đây Quản trị cũng cấp được).
- Trang Hồ sơ (giao diện) không còn cho CHỌN thêm vai kiểu cũ "Hướng dẫn viên"/"Bán hàng"/"Đại lý"/"Nhân sự" (migration `0024` chỉ đặt `active = 0` cho 4 mã này, không đổi nhóm — máy chủ CHƯA chặn gán mới qua API, chỉ giao diện ẩn lựa chọn) — hồ sơ đã có sẵn các vai này KHÔNG bị đổi.

## Lần phát hành kế tiếp: Thông báo màn hình khoá / Web Push (ADR-0036, migration `0026`) — RUNBOOK

Chủ dự án quyết và TỰ CHẠY mọi lệnh ghi lên remote (`wrangler d1 migrations apply --remote`, `wrangler deploy`, `wrangler secret put/delete`) trong ứng dụng Terminal của macOS — `CLAUDE.md` §8: AI không tự chạy các lệnh này; mục này chỉ chuẩn bị và liệt kê NGUYÊN LỆNH. Mã: `migrations/0026_thong_bao_may.sql` (chỉ THÊM bảng `ntf_push_sub`) cùng mã module `thongbao` (địa chỉ máy, ký VAPID, gửi chia lô qua `BangTin`), giao diện (`web/push-ui.ts`, mục "Thông báo trên điện thoại" ở `web/account.ts`, `web/shell.ts#logout`, `web/sw/sw.ts`). Đặc tả: `docs/superpowers/specs/2026-09-27-thong-bao-he-thong-design.md` §9 (+ §9.5 "Lệch có ghi"). ADR: `docs/adr/ADR-0036-thong-bao-man-hinh-khoa.md`. Kế hoạch: `docs/superpowers/plans/2026-09-27-thong-bao-luot-2-web-push.md`. Hướng dẫn chi tiết cho chủ (lời thường, từng bước, kèm kịch bản thử tay 10 bước trên iPhone thật): **`docs/HUONG-DAN-BAT-THONG-BAO-DIEN-THOAI.md`** — mục này chỉ tóm tắt phần triển khai kỹ thuật, không lặp lại kịch bản thử tay.

**Có gì KHÁC các lần phát hành trước (đọc kỹ):**
1. **Triển khai làm HAI LƯỢT deploy, cách nhau một khoảng thời gian** (giống thứ tự đặt `TURNSTILE_SECRET_KEY` ở bản v1.0, lý do giống nhau: service worker cũ còn cache trên máy nhân viên):
   - **Lượt A** — mã lượt 2 + migration `0026`, **CHƯA có** `VAPID_PUBLIC_KEY` trong `wrangler.jsonc`: đi qua `npm run day-len` + `npm run trien-khai` như một lần phát hành bình thường. Sau lượt A, mục "Thông báo trên điện thoại" ở trang Tôi **vẫn ẩn ở mọi tài khoản** (thiếu khoá — không lỗi); service worker mới (có sẵn `push`/`notificationclick`) đã có mặt trên máy sau khi nhân viên mở app một lần.
   - **Chờ vài ngày** để phần lớn nhân viên/đối tác mở app ít nhất một lần (cùng bẫy Turnstile: service worker cũ không có, không thể bật thông báo cho tới khi cập nhật).
   - **Bước của chủ (một mình, không cần AI):** chạy lệnh tạo khoá VAPID (in ở `docs/HUONG-DAN-BAT-THONG-BAO-DIEN-THOAI.md` bước 3) — lệnh này in dòng "KHOA CONG KHAI: …" ra màn hình VÀ đặt luôn `VAPID_PRIVATE_KEY` bằng `wrangler secret put` (không bao giờ hiện khoá bí mật). Chủ đưa đúng dòng "KHOA CONG KHAI" đó cho AI (phiên nào cũng được, kể cả phiên mới).
   - **Lượt B** — AI thêm dòng khoá công khai vào `vars.VAPID_PUBLIC_KEY` của `wrangler.jsonc` (không phải bí mật), commit, rồi chủ chạy lại `npm run day-len` + `npm run trien-khai` (KHÔNG có migration mới ở lượt này). Sau lượt B, mục "Thông báo trên điện thoại" hiện ra cho mọi tài khoản đang hoạt động.
2. **CHỈ MỘT bí mật mới, KHÔNG có bí mật nào khác:** `VAPID_PRIVATE_KEY`, đặt đúng MỘT LẦN bằng lệnh tạo khoá (đặt sớm hơn — trước lượt B — không sao, vì thiếu khoá công khai thì tính năng vẫn ẩn). **Tuyệt đối không chạy lệnh tạo khoá hai lần** (một lần "để xem khoá công khai", một lần "để đặt bí mật") — mỗi lần sinh MỘT CẶP MỚI, hai lần sẽ lệch cặp và mọi lần gửi bị từ chối âm thầm (403), xem `docs/CHANGE-GUIDE.md` bẫy 47.
3. **Cách kiểm khoá công khai/bí mật có KHỚP nhau không (sau lượt B):** `khoaVapid` (`src/shared/web-push.ts`) tự tính lại khoá công khai từ khoá bí mật và so khớp — lệch cặp thì coi như CHƯA CÓ khoá (trả `null`), giống hệt lúc thiếu khoá: mục "Thông báo trên điện thoại" ở trang Tôi vẫn ẨN dù đã đặt xong cả hai. Vì vậy cách kiểm đơn giản nhất là mở trang Tôi bằng BẤT KỲ tài khoản nào sau lượt B: **mục đó XUẤT HIỆN = khớp, xong.** Không hiện dù chắc chắn đã đặt đủ hai khoá = lệch cặp (thường do chạy lệnh tạo khoá quá một lần) — làm lại đúng Bước 3+4 của `docs/HUONG-DAN-BAT-THONG-BAO-DIEN-THOAI.md` bằng một cặp khoá MỚI. Muốn xem thêm chi tiết (không bắt buộc): `npx wrangler tail --format pretty` lọc dòng `vapid_khoa_lech` — thấy dòng này nghĩa là máy chủ vừa từ chối vì lệch cặp.
4. **Không đổi bí mật/cấu hình nào khác** ngoài `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY`. Không đổi `vars` khác, không đổi `durable_objects`/`migrations` của Bảng tin.
5. **Tắt tạm — hai cách, sửa 2026-09-28 (chi tiết + lời thường cho chủ: `docs/HUONG-DAN-BAT-THONG-BAO-DIEN-THOAI.md` mục "Tắt tạm"):** Cloudflare KHÔNG cho đọc lại bí mật đã đặt — `wrangler secret delete` xoá VĨNH VIỄN, không "đặt lại là dùng được ngay" (câu cũ ở đây SAI, đã sửa). **Cách A (không nghi lộ, chỉ tạm dừng):** AI tạm bỏ dòng `VAPID_PUBLIC_KEY` khỏi `wrangler.jsonc`, day-len + triển khai như bình thường — giữ NGUYÊN cặp khoá, bật lại chỉ cần thêm đúng dòng đó trở lại rồi deploy lần nữa, không ai phải bấm "Bật" lại. **Cách B (nghi lộ hoặc cần tắt NGAY, không chờ deploy):** `npx wrangler secret delete VAPID_PRIVATE_KEY` (đứng ở thư mục gốc repo) — lệnh này HỎI xác nhận `y/N`, phải gõ `y` rồi Enter. Sau khi xoá thật: mọi lần gửi thôi chạy (thoát sớm ở `dayGoCua`, không lỗi), mục "Thông báo trên điện thoại" biến mất khỏi giao diện ở lần tải trang kế tiếp (`GET /api/account/thong-bao/may` trả `khoa: null`), bảng `ntf_push_sub` GIỮ NGUYÊN dữ liệu nhưng cặp khoá đã MẤT VĨNH VIỄN — bật lại phải làm lại Bước 3+4 với cặp khoá MỚI, và MỌI người đã từng bật phải tự bấm "Bật" lại một lần (nay làm được ổn định, không còn kẹt lỗi — xem điểm 6).
6. **Đổi cặp khoá VAPID (bắt buộc sau Cách B, hoặc khi nghi lộ) làm MỌI máy đã bật phải bấm "Bật" lại** (địa chỉ cũ không còn hợp lệ với khoá mới) — sửa 2026-09-28: trước đây bước bấm lại này có thể kẹt lỗi mãi nếu máy còn nhớ khoá cũ (`InvalidStateError` khi `subscribe()` với khoá khác cái đang có); nay `web/account.ts` tự huỷ subscription cũ trước khi đăng ký khoá mới, nên bấm "Bật" lại luôn thành công. Vẫn chỉ đổi khoá khi thật sự cần (nghi lộ, hoặc theo Cách B) — không làm tuỳ tiện, vì luôn buộc mọi người bấm lại.

**Trước khi phát hành (AI làm, chủ đọc lướt):** bước A.0 (công thức t) làm **HAI LẦN riêng** vì đây là hai lượt deploy:
- **A.0 của Lượt A** (mã lượt 2, khoá còn ẩn): một gạch `doi` chung, kiểu "Cải thiện độ ổn định và an toàn bên trong, không đổi cách dùng." (đúng mẫu công thức t khi chưa có gì người dùng THẤY được — nút còn ẩn tới Lượt B).
- **A.0 của Lượt B** (chỉ đổi `wrangler.jsonc`, thêm khoá công khai): mới thật sự thêm mục tả tính năng, ví dụ hai gạch `moi`: "Bật được thông báo rung trên điện thoại ở trang Tôi, kể cả khi đang khoá màn hình." / "Ai cũng bật được, kể cả tài khoản Đối tác; bấm vào thông báo mở ngay đúng trang liên quan." (dưới 160 ký tự, không chữ kỹ thuật — kiểm bằng `changelogProblems` trước khi commit).
- **Số phiên bản của CẢ HAI lượt chốt LÚC gộp `main`, không đặt sẵn ở nhánh này** (`main` đã có bản `1.23` từ nhánh khác — `git log --oneline main -3`; số kế tiếp thật sự tính lúc `day-len` chạy, đọc `docs/HANDOFF-N1.md` mục "TRẠNG THÁI TRIỂN KHAI" + `src/shared/changelog.ts` của `main` LÚC ĐÓ).

`npm test`/`typecheck`/`test:e2e` xanh trên đúng commit sẽ deploy ở cả hai lượt. Kiểm độc lập (chỉ đọc): Task 1, Task 2+3 đã có (nhật ký thi công `.superpowers/sdd/thong-bao-luot-2/`); Task 4 và Task 5 **đã qua lượt rà cuối độc lập 2026-09-28** + lượt sửa gom đã được kiểm lại phạm vi (còn nợ ghi ở `docs/superpowers/plans/2026-09-27-thong-bao-luot-1-thi-cong-nhat-ky.md` mục lượt 2) — trước đây ghi "chưa có người kiểm" (việc lớn theo `CLAUDE.md` §3: đụng dữ liệu/quyền/triển khai/luật).

**Việc của CHỦ (AI không làm được):** chạy lệnh tạo khoá (Lượt A → chờ → khoá); kịch bản thử tay 10 bước trên iPhone thật ở `docs/HUONG-DAN-BAT-THONG-BAO-DIEN-THOAI.md` (bao gồm giờ yên lặng, đổi PIN thôi nhận, đăng xuất thôi nhận, tài khoản Đối tác) — ghi kết quả thật vào mục nhật ký phát hành (không ghi "đạt" khi chưa thử).

## Bảng tin (thông báo tức thì, ADR-0022) — ĐÃ PHÁT HÀNH bản 1.16 ngày 2026-09-26 — RUNBOOK

**Trạng thái: ĐÃ phát hành (1.16, 2026-09-26 17:03 giờ VN — xem mục "TRẠNG THÁI TRIỂN KHAI" ở đầu tệp).** Phần dưới là runbook đã dùng, giữ lại làm hướng dẫn điểm lùi và vận hành; các câu như "chưa gộp/chưa đẩy/chưa deploy" trong phần này là của thời điểm TRƯỚC phát hành. Chủ dự án quyết và TỰ CHẠY các lệnh đẩy/deploy trong ứng dụng Terminal của macOS (`CLAUDE.md` §8: AI không chạy); mục này chỉ chuẩn bị và liệt kê NGUYÊN LỆNH. Mô tả kỹ thuật: `docs/SYSTEM-DESIGN.md` §2, §3, §9, §11; công thức và bẫy: `docs/CHANGE-GUIDE.md` công thức v, bẫy 35–42; nhật ký thi công: `docs/superpowers/plans/2026-09-25-bang-tin-thi-cong-nhat-ky.md`; bằng chứng giao diện: `docs/evidence/2026-09-25-bang-tin/`; sổ hàng rào: `docs/SO-HANG-RAO.md`.

**Bảng tin là gì (một dòng):** khi một đồng nghiệp lập/nhận/giao/xác nhận/huỷ/sửa một đơn, mọi màn hình đang mở (danh sách đơn, Trang chủ, trang đơn, "Việc của tôi") tự cập nhật, kèm thông báo nhỏ với một số loại thay đổi — qua WebSocket tới MỘT Durable Object. Đối tác chỉ được làm mới màn hình, không có thông báo nhỏ.

**Có gì KHÁC các lần phát hành trước (đọc kỹ):**
1. **KHÔNG có migration D1.** `wrangler d1 migrations list` không đổi. Vì vậy `npm run trien-khai` bước 2 sẽ báo "No migrations to apply" — bình thường (suy từ cách hoạt động, chưa quan sát); bước 4 (Time Travel, hỏi áp migration) bị bỏ qua. Điểm khôi phục Time Travel của D1 KHÔNG liên quan tới lần này.
2. **CÓ migration Durable Object** (`migrations` ở `wrangler.jsonc`: tag `v1`, `new_sqlite_classes: ["BangTin"]`). Nó do CHÍNH `wrangler deploy` (bước 6 của `trien-khai`) tự áp — không có lệnh áp riêng (tài liệu Cloudflare); việc deploy có hỏi/báo gì thêm hay không thì **chưa kiểm** (mới chạy `wrangler dev`, chưa từng `wrangler deploy` với migration Durable Object). Đây là **cửa MỘT chiều mềm**: đọc mục "Điểm lùi" ngay dưới trước khi gõ lệnh.
3. **Không đổi bí mật, không đổi `vars`** của production (không `wrangler secret put`, không sửa `vars`). Không đặt `BANG_TIN_HAN_GIAY` (production dùng mặc định 900 giây).
4. **CSP mới** (`wss://booking.tourdao.vn` ở `connect-src`, `public/_headers`) đi cùng tệp tĩnh, cùng lần deploy. Service worker không cache `/api/*` và không can thiệp WebSocket, nên đường bắt tay luôn đi thẳng tới Worker. Máy đã cài app nhận khung mới khi mở lại/tải lại app; trong lúc khung cũ còn trong bộ nhớ đệm, Bảng tin có thể chưa chạy thêm một lần mở (suy từ cách service worker làm việc — **chưa kiểm trên iPhone thật**); không phải lỗi máy chủ.
5. **Mỗi lần deploy (lần này và mọi lần sau) ngắt MỌI kết nối Bảng tin** (Cloudflare khởi động lại Durable Object). Trình duyệt tự nối lại trong 1–30 giây rồi tải lại dữ liệu — mọi màn hình đang mở tải lại gần như cùng lúc. Không phải sự cố.
6. **Chi phí:** chủ dự án đã xác nhận gói Workers TRẢ PHÍ (2026-09-21, `docs/SYSTEM-DESIGN.md` §12); ước tính của nghiên cứu (`docs/superpowers/specs/2026-09-25-thong-bao-tuc-thi-nghien-cuu.md` §3.6) là nằm trong gói hiện có. **Chưa kiểm** lại bảng giá/giới hạn Durable Object hiện hành trên tài khoản Cloudflare thật.

**Điểm lùi ĐỔI CÁCH (quan trọng):**
- Sau lần deploy này **KHÔNG `wrangler rollback` được** về bản trước: Cloudflare chặn rollback qua một thay đổi vòng đời lớp Durable Object (tài liệu Cloudflare, mục Rollbacks). Ghi mã bản Worker NGAY TRƯỚC lần deploy (`wrangler deployments list`) làm tham chiếu, nhưng đừng dùng `rollback` tới nó.
- **Deploy lại một commit CŨ (trước khi có lớp `BangTin`) bằng `wrangler deploy` cũng KHÔNG an toàn** — cùng lý do (bản cũ không khai lớp/binding/migration đang chạy). **Chưa kiểm** (tài liệu không nêu trường hợp này); đừng thử trên production.
- **Cách lùi tính năng khi cần:** chủ ra lệnh → AI chuẩn bị một commit từ `main` đã **GỠ route `GET /api/bang-tin` và lời gọi `batDauBangTin`** (`web/shell.ts`) nhưng **GIỮ** lớp `BangTin`, binding `BANG_TIN` và khối `migrations`; rồi `npm run trien-khai` như thường (mọi thao tác ghi đơn vẫn chạy; chỉ mất tự cập nhật). Gỡ hẳn lớp cần một migration `deleted_classes` (tag `v2`) — việc riêng, chủ duyệt, không làm trong lúc sự cố.
- Nếu chỉ MỘT phần có vấn đề: Bảng tin lỗi KHÔNG làm hỏng thao tác ghi đơn (phát tin bắn-và-quên, lỗi chỉ ghi dòng log `bang_tin_loi`); phía trình duyệt thoát lặng khi không nối được (chờ lùi tới 30 giây).

**Trước khi phát hành (AI làm, chủ đọc lướt):**
- **Bước A.0 — nhật ký thay đổi.** Mục nhật ký cần số phiên bản, mà số đó đặt LÚC phát hành (không đặt sẵn ở nhánh, vì nhánh khác có thể lấy trước): thêm MỘT mục vào ĐẦU `CHANGELOG` (`src/shared/changelog.ts`) với `version` = số kế tiếp sau số lớn nhất đang có ở `main` lúc đó (bản 1.15 đã có ở `main` và đã lên production khi nhánh gộp `main` 2026-09-26, nên số kế tiếp ít nhất là 1.16; nhưng KHÔNG đặt sẵn: đọc `src/shared/changelog.ts` và mục "TRẠNG THÁI TRIỂN KHAI" ở đầu tệp lúc phát hành, lấy số kế tiếp sau số lớn nhất đang có ở `main` LÚC ĐÓ), `date` = ngày phát hành, một gạch loại `moi`: **"Danh sách đơn, Trang chủ và trang đơn tự cập nhật khi đồng nghiệp nhận, giao, xác nhận hoặc huỷ đơn; có thông báo nhỏ trên màn hình."** (132 ký tự; đã kiểm bằng `changelogProblems`, không có lỗi). Sửa chuỗi kỳ vọng `formatReleaseLine` ở `src/shared/app-info.test.ts` cho khớp, cùng commit (công thức t). **ĐÃ LÀM ngày 2026-09-26 (theo lệnh phát hành của chủ): mục 1.16 đã có ở đầu `CHANGELOG`, chuỗi kỳ vọng ở `app-info.test.ts` đã đổi; `npm test` 909/909, `typecheck` 0 lỗi, `node scripts/kiem-phien-ban.mjs` ĐẠT (bản ở máy 1.16 mới hơn production 1.15). Nếu lúc chủ chạy `day-len` mà `main` đã có bản 1.16 do nhánh khác lấy trước thì phải đổi số theo đoạn trên.**
- **Đã chạy (ở các commit của từng task, xem nhật ký thi công):** `npm test`/`typecheck` xanh ở mọi task (906/906 lúc viết mục này); e2e đủ bộ 21/21 ở Task 7 (`a8cb321`–`d787f6c`, gồm kịch bản `bangtin`); từ Task 8 trở đi chỉ chạy `npm run test:e2e -- pwa` cùng kịch bản Chrome (`bang-tin-smoke.mjs` 36 ✓ 0 ✗ ở Task 10, sau `b8a7619`, các kịch bản cũ của trang bị chạm ở Task 8/9).
- **CÒN PHẢI làm trước khi phát hành (chưa có, đừng coi là đã đạt):** (1) ~~người kiểm độc lập (chỉ đọc) — Task 12~~ ĐÃ CÓ (2026-09-26): kết luận "ĐẠT CÓ ĐIỀU KIỆN", hai điều kiện (gộp `main`, rút lại lời đính chính sai về `getWebSockets`) đã làm; nhật ký thi công mục "Task 12" ghi cả kết quả chạy lại trên cây đã gộp `main` (npm test 909/909, e2e 21/21, Chrome đủ bộ xanh); các quyết định còn chờ chủ ở `docs/superpowers/plans/2026-09-25-bang-tin-de-xuat-luat.md`; (2) `npm run test:e2e` đủ bộ trên đúng commit sẽ phát hành (`npm run trien-khai` bước 3b tự chạy, cần mạng; `run.mjs` tự thêm `--var BANG_TIN_HAN_GIAY:20`); (3) `node --test "tests/audit/*.test.mjs"` (KHÔNG nằm trong `npm test`; so ca đỏ với mốc trước, không được thêm ca đỏ mới); (4) chạy lại kịch bản Chrome `bang-tin-smoke.mjs` (và kịch bản cũ của các trang bị chạm, `docs/evidence/2026-09-25-bang-tin/README.md`) trên đúng commit đó.
- **Việc của CHỦ trước khi phát hành (AI không làm được):** thử trên iPhone thật — `docs/superpowers/plans/2026-09-25-bang-tin-ke-hoach.md` Task 13 (danh sách thử tay; dùng `node scripts/dev-iphone.mjs` cho lần thử LAN, ghi kết quả vào `docs/evidence/2026-09-25-bang-tin/iphone.md`) — **chưa làm**: Safari iPhone thật chưa từng được thử (kể cả CSP `wss:` qua LAN, khoá màn hình ≥ 1 phút, mất mạng thật).

**Các bước — CHỦ DỰ ÁN tự gõ trong ứng dụng Terminal của macOS, đứng ở thư mục gốc repo (`tourdao-sales`, KHÔNG phải thư mục worktree); AI không chạy các lệnh này:**
1. Gộp và đẩy nhánh lên `main` (**có đổi app, cần triển khai**):
```
npm run day-len -- bang-tin
```
2. Chạy dây chuyền triển khai (**có đổi app**; cổng chỉ-đọc, kiểm phiên bản, test + e2e đủ bộ, deploy — tại đây migration Durable Object được áp —, kiểm dữ liệu, kiểm phiên bản sau deploy):
```
npm run trien-khai
```

**Sau khi deploy (chỉ đọc; AI làm, hoặc chủ):**
1. `node scripts/kiem-phien-ban.mjs --sau-deploy` → ĐẠT; `npx wrangler deployments list` → ghi Version ID mới + mã bản ngay trước (KHÔNG dùng để `rollback`).
2. `node scripts/audit-invariants.mjs --db remote` → "Mọi bất biến đạt" như mọi lần.
3. `curl -si https://booking.tourdao.vn/api/bang-tin` (GET, không cookie, chỉ đọc) → `401 unauthenticated` (route đã có và nằm sau cổng đăng nhập).
4. **Thử tay bằng hai tài khoản thật** (hai máy hoặc một máy + một cửa sổ ẩn danh): A mở "Đơn hàng", B lập một đơn → dòng mới hiện ở A trong vài giây không cần bấm tải lại; B bấm "Nhận phụ trách" (hoặc xác nhận/huỷ) một đơn → A thấy thông báo nhỏ. Ghi kết quả vào mục "TRẠNG THÁI TRIỂN KHAI" đầu tệp kèm số phiên bản và Version ID Worker.
5. Không tạo/sửa tài khoản, quyền, hồ sơ trên production trong "cửa sổ đóng băng" (phần Hoàn tác) — lần này không cần thao tác nào như vậy.

## Lần phát hành kế tiếp: QR thanh toán + mã giao dịch ngân hàng (ADR-0108, ADR-0092 Đ6; migration `0087`, `0088`) — RUNBOOK

**Trạng thái: ĐÃ phát hành bản 1.86 ngày 2026-10-08 17:35 giờ VN** (xem mục "TRẠNG THÁI TRIỂN KHAI" ở đầu tệp; phần dưới giữ làm hướng dẫn điểm lùi). Mọi bước sau A.0 do `npm run trien-khai` làm như thường; mục này chỉ ghi điều KHÁC. Đặc tả: `docs/superpowers/specs/2026-10-08-qr-thanh-toan/README.md`; nhật ký thi công: `docs/superpowers/plans/2026-10-08-qr-thanh-toan-thi-cong-nhat-ky.md`; công thức và bẫy: `docs/CHANGE-GUIDE.md` (QR / mã giao dịch).

**Điều kiện phát hành (kiểm LÚC phát hành bằng lệnh chỉ đọc, không tin tài liệu):** migration `0078`–`0083` đã có trên production — `npx wrangler d1 migrations list tourdao-sales-db --remote` chỉ được liệt kê `0087_pty_tai_khoan_nhan_tien`, `0088_bil_ma_giao_dich` (và migration của nhánh khác gộp sau) là chưa áp. Không đổi bí mật, không đổi `vars`, không đổi CSP, không migration Durable Object.

**Bước A.0:** mục nhật ký thay đổi do phiên phát hành viết, số = số kế tiếp sau số lớn nhất ở `main` lúc đó (ngày 2026-10-08 dự kiến 1.86; không đặt sẵn ở nhánh).

**Khoảng hở giữa migration và deploy (đọc trước khi chạy):** từ lúc `trien-khai` áp `0088` tới lúc `wrangler deploy` xong (vài phút, hai bước chạy liền nhau), mã CŨ vẫn chạy trên trigger MỚI. Trong khoảng đó: (a) Kế toán bấm "Công ty đã nhận" hoặc "Thay lần thu" cho khoản chuyển khoản bị trigger chặn — mã cũ không dịch lỗi `bank_txn_required` nên thấy lỗi chung; không có gì được ghi (cả lô bị huỷ); bấm lại sau khi bản mới lên là được. (b) Lần thu chuyển khoản – Công ty thu do Kế toán / Toàn quyền tự ghi bằng mã cũ sẽ KHÔNG có mã, và `audit-invariants --db remote` ngay sau deploy báo `R-BIL-D6b`. **Cách tránh:** báo Kế toán không ghi tiền trong lúc phát hành. Nếu vẫn bị báo: Kế toán sửa bằng "Thay lần thu" có nhập mã. Bản mới đã lên thì luồng không còn hở.

**Ca xấu: deploy hỏng SAU KHI đã áp `0088`** (`trien-khai` dừng ở bước deploy với câu "`wrangler deploy` LỖI — Worker có thể CHƯA đổi", và không tự lùi): khi đó khoảng hở trên KHÔNG còn là "vài phút" — mã cũ chạy trên trigger mới cho tới khi một bản mới lên, có thể hàng giờ. Làm theo thứ tự: (1) đọc lỗi deploy, sửa nguyên nhân, rồi chạy lại `npm run trien-khai`: migration đã áp nên không áp lại, nhưng script vẫn chạy LẠI toàn bộ các cổng phía trước (số phiên bản, `npm test`, `typecheck`, `build:web`, e2e đủ bộ — mất nhiều phút; e2e đỏ thì hỏi c/k) rồi mới deploy, kiểm dữ liệu và kiểm số phiên bản sau deploy. Cách NHANH hơn (chủ quyết, tự chịu việc bỏ các cổng trước): `CI=1 npx wrangler deploy`, rồi ĐỦ HAI lệnh kiểm theo thứ tự — `node scripts/audit-invariants.mjs --db remote`, sau đó `node scripts/kiem-phien-ban.mjs --sau-deploy` (cổng số phiên bản sau deploy, CLAUDE.md §8); không bỏ lệnh nào; (2) trong lúc đó Kế toán tiếp tục KHÔNG ghi tiền — mục (a) và (b) ở trên đúng suốt khoảng chờ; (3) lần thu chuyển khoản – Công ty thu đã lỡ tự ghi trong lúc đó sẽ không có mã: `R-BIL-D6b` báo ở lần kiểm dữ liệu ngay sau khi bản mới lên (báo, không chặn gì), và Kế toán sửa từng lần bằng "Thay lần thu" có nhập mã ngân hàng. Không lùi CSDL vì ca này (xem "Điểm lùi").

**Ngay sau deploy (chủ làm trên Nền tảng thật):** đăng nhập tài khoản Toàn quyền → Danh bạ → hồ sơ công ty chủ → mục "Tài khoản nhận tiền" → cài tài khoản thật của công ty. Chưa cài thì nút "QR thanh toán" báo "Công ty chưa cài tài khoản nhận tiền — báo người phụ trách hệ thống" (không hỏng gì khác). Rồi mở một đơn thật còn tiền cần thu, bấm "QR thanh toán", quét bằng một ứng dụng ngân hàng để thấy đúng tên công ty — không cần bấm chuyển.

**Điểm lùi:** `wrangler rollback` về bản trước được (không có thay đổi Durable Object), nhưng hai migration ở lại: trong lúc chạy mã cũ, "Công ty đã nhận" / "Thay lần thu" cho khoản chuyển khoản ghi từ mốc `R-BIL-D6` vẫn bị trigger chặn như mục (a) ở trên, và lần thu tự ghi thiếu mã như mục (b). Không mất hay hỏng dữ liệu (trigger chặn = cả lô bị huỷ). Lùi hẳn CSDL chỉ bằng điểm khôi phục Time Travel do `trien-khai` tạo trước migration (mất mọi ghi sau điểm đó) — chủ quyết, không làm trong lúc vội.

## Lần phát hành kế tiếp: sổ đại lý đợt 1 (hoa hồng đại lý, người bán dịch vụ, khoá tháng; ADR-0077/0078/0080; migration `0090`) — RUNBOOK

**Trạng thái: ĐÃ phát hành bản 1.87 ngày 2026-10-12 13:42 giờ VN** (xem mục "TRẠNG THÁI TRIỂN KHAI" ở đầu tệp; phần dưới giữ làm hướng dẫn điểm lùi). Mọi bước sau A.0 do `npm run trien-khai` làm như thường; mục này chỉ ghi điều KHÁC. Đặc tả: `docs/superpowers/specs/2026-10-08-so-dai-ly-dot-1/README.md` (§13 rủi ro phát hành); nhật ký thi công: `docs/superpowers/plans/2026-10-08-so-dai-ly-dot-1-thi-cong-nhat-ky.md`; công thức và bẫy: `docs/CHANGE-GUIDE.md` (z15, bẫy 64–66); các hàng rào đã quan sát: `docs/SO-HANG-RAO.md`.

**Điều kiện phát hành (kiểm LÚC phát hành bằng lệnh chỉ đọc, không tin tài liệu):** `npx wrangler d1 migrations list tourdao-sales-db --remote` — rà số `0090` còn trống và còn là số kế tiếp trên mọi nhánh chưa gộp (nhánh nào gộp sau phải dựng lại trên `main` mới và chạy lại toàn bộ kiểm; nhánh Vận chuyển giữ `0089`). Không đổi bí mật, `vars`, CSP hay Durable Object.

**Bước A.0:** mục nhật ký thay đổi của đợt này đã có đầu danh sách trong `src/shared/changelog.ts` (Task 14, số 1.87 chỉ là số tạm); phiên phát hành kiểm lại cho đúng số kế tiếp sau số lớn nhất ở `main` lúc đó và chạy lại `node --test src/shared/app-info.test.ts`.

**Không khoá tháng nào trong ngày phát hành.** Tháng đã khoá KHÔNG mở lại được; khoá nhầm chỉ cứu bằng điểm khôi phục Time Travel (lỗ HC-5.19, chưa diễn tập). Màn «Khoá sổ tháng» có hộp xác nhận nói rõ điều này; chủ báo Kế toán chưa khoá cho tới khi đã đọc hộp đó.

**Khoảng hở giữa migration và deploy (vài phút, hai bước liền nhau):** đơn xác nhận bằng mã CŨ trong khoảng đó không có bản chụp mức. Kiểm định kỳ `R-ORD-T1` cho ân hạn 60 phút kể từ mốc lúc áp migration (dòng `ord_audit_cutoff`), nên `audit-invariants --db remote` ngay sau deploy chỉ cảnh báo `R-ORD-T1w`, không đỏ. Trigger khoá tháng không ảnh hưởng vì chưa tháng nào khoá. **Cách tránh:** báo nhân viên không bấm Xác nhận trong lúc phát hành. Đơn lỡ xác nhận trong khoảng hở: chụp bù là việc đợt 2.

**Ca xấu: hoàn tác Worker về bản cũ SAU KHI đã áp `0090`.** `wrangler rollback` làm được (không đổi Durable Object) nhưng migration ở lại: mọi đơn xác nhận trong lúc chạy bản cũ không có bản chụp, nên `R-ORD-T1` ĐỎ ở lần `audit-invariants` kế tiếp và đỏ cho tới khi đợt 2 chụp bù — đây là tín hiệu đúng, không phải dữ liệu hỏng. Trigger khoá tháng vẫn chặn đúng. Lùi hẳn CSDL chỉ bằng điểm khôi phục Time Travel do `trien-khai` tạo trước migration (mất mọi ghi sau điểm đó) — chủ quyết, không làm trong lúc vội.

**Ngay sau deploy (chủ làm trên Nền tảng thật):** đăng nhập Kế toán → mục «Hoa hồng đối tác»: thêm mức đầu tiên rồi thử bằng «Thử tra»; mục «Người bán dịch vụ»: kiểm có đúng MỘT dòng «công ty chủ bán mọi dịch vụ» (gieo sẵn). Xác nhận một đơn thử có bên đặt là đại lý rồi mở khối «Phần đối tác»: phải hiện hoa hồng và giá đại lý. Đơn đại lý mới tạo từ giờ bị giữ ở «Đã giao» tới đợt 2 (đã báo chủ, dữ liệu hiện chỉ là dữ liệu thử).

**Giới hạn đã biết của đợt 1:** đại lý là hồ sơ TỔ CHỨC (công ty lữ hành) chưa mang được vai được hưởng bằng đường quản trị nào, nên đợt 1 chạy trọn cho đại lý là hồ sơ cá nhân (xem «Việc còn treo» và `docs/SYSTEM-DESIGN.md` §17).

## Lần phát hành kế tiếp: bảo mật hai lớp bằng ứng dụng xác thực (ADR-0074 Phần B; migration `0101`) — RUNBOOK

**Trạng thái: migration `0101` ĐÃ áp trên production** (kiểm `d1 migrations list --remote` ngày 18/10/2026 → "No migrations to apply!"; tệp đã ở `main` từ trước bản 2.11 — không chứng minh được số bản phát hành từ tài liệu nên không ghi). Câu cũ: nhánh `worktree-hai-lop-dang-nhap`, soạn 2026-10-15. Mọi bước sau A.0 do `npm run trien-khai` làm như thường; mục này chỉ ghi điều KHÁC. Đặc tả: `docs/superpowers/specs/2026-10-01-xac-thuc-hai-lop-dac-ta.md`; kế hoạch: `docs/superpowers/plans/2026-10-01-dang-nhap-b-hai-lop-ung-dung-xac-thuc.md`; công thức và bẫy: `docs/CHANGE-GUIDE.md` (z18, bẫy 77); hệ thống: `docs/SYSTEM-DESIGN.md` §4 "Bảo mật hai lớp".

**Việc của chủ TRƯỚC khi triển khai (bắt buộc — thiếu thì không ai bật hay nhập được mã ứng dụng xác thực, máy chủ trả 503):** đặt bí mật mới `MFA_ENCRYPTION_KEY`, đứng ở thư mục `tourdao-sales`. AI KHÔNG chạy các lệnh này (CLAUDE.md §8). Quên bước này thì `npm run trien-khai` DỪNG ở bước 1d (chỉ đọc TÊN khoá, trước migration) và in lại đúng hai lệnh dưới.

1. Sinh một khoá ngẫu nhiên 32 byte (in ra một chuỗi base64):

```
openssl rand -base64 32
```

2. Đặt khoá đó làm bí mật của Worker (dán chuỗi vừa sinh khi được hỏi):

```
npx wrangler secret put MFA_ENCRYPTION_KEY
```

3. Cất chuỗi này ở nơi an toàn (trình quản lý mật khẩu). **Mất hoặc đổi khoá = mọi người đã bật phải nhờ Quản trị tắt rồi bật lại** (khoá ứng dụng xác thực đã lưu không giải được nữa). Không dùng lại khoá này cho `.dev.vars` local.

**Điều kiện phát hành (kiểm LÚC phát hành bằng lệnh chỉ đọc):** `npx wrangler d1 migrations list tourdao-sales-db --remote` — rà số `0101` còn trống và còn là số kế tiếp trên mọi nhánh chưa gộp. Bước A.0: mục `2.4` ở đầu `src/shared/changelog.ts` là số TẠM — kiểm lại cho đúng số kế tiếp ở `main` và chạy lại `node --test src/shared/app-info.test.ts`.

**Ân hạn 14 ngày tính từ lúc migration `0101` ÁP** (câu `UPDATE staff SET mfa_grace_until = now + 14 ngày` cho mọi tài khoản nội bộ đang hoạt động): áp migration và deploy liền nhau như `trien-khai` làm. Báo nhân viên trước: trong 14 ngày vào trang **Tôi → Bảo mật đăng nhập** bật bằng Google Authenticator; hết hạn mà chưa bật thì đăng nhập PIN bị chặn, phải nhờ Quản trị bấm "Tắt bảo mật hai lớp" (mở 24 giờ để bật lại). Face ID không bị hỏi mã. Tài khoản Đối tác / Tài xế đối tác chưa bắt buộc (ADR-G1 chưa duyệt).

**Ngay sau deploy (chủ làm trên Nền tảng thật):** bằng một tài khoản nội bộ, xem dải "Còn 14 ngày để bật bảo mật hai lớp"; bật ở trang Tôi bằng iPhone thật (nút "Mở ứng dụng xác thực" phải mở Google Authenticator và thêm "Tour Đảo" — CHƯA kiểm trên máy thật), cất 10 mã dự phòng; đăng xuất, đăng nhập PIN → phải hỏi mã 6 số. `node scripts/audit-invariants.mjs --db remote` (trien-khai tự chạy) phải xanh `R-AUT-MFA-1/2/3`.

**Ca xấu: hoàn tác Worker về bản cũ SAU KHI đã áp `0101`.** `wrangler rollback` làm được (không đổi Durable Object); mã cũ không đọc các bảng / cột mới nên đăng nhập trở lại PIN thường. Migration ở lại vô hại (chỉ thêm bảng và cột). Khi triển khai lại bản Phần B, hạn ân hạn vẫn tính từ lần áp đầu (có thể đã trôi vài ngày) — báo chủ trước khi chọn rollback lâu.

## Lần phát hành kế tiếp: mã đăng nhập qua email (ADR-0074 Phần C; migration `0102`) — RUNBOOK

**Trạng thái: migration `0102` ĐÃ áp trên production** (kiểm `d1 migrations list --remote` ngày 18/10/2026 → "No migrations to apply!"; tệp đã ở `main` từ trước bản 2.11 — không chứng minh được số bản phát hành từ tài liệu nên không ghi). Câu cũ: nhánh `worktree-hai-lop-email`, soạn 2026-10-16. Các mục «CHƯA ai thử» bên dưới (thử gửi thư thật) vẫn CHƯA kiểm. Cần Phần B đã lên trước (bảng `aut_mfa_factor` của `0101`). Mọi bước sau A.0 do `npm run trien-khai` làm như thường; mục này chỉ ghi điều KHÁC. Kế hoạch: `docs/superpowers/plans/2026-10-01-dang-nhap-c-hai-lop-email.md`; công thức: `docs/CHANGE-GUIDE.md` z18b; hệ thống: `docs/SYSTEM-DESIGN.md` §4 "Mã qua email".

**Không cần bí mật mới.** Gửi thư dùng binding `EMAIL` (`wrangler.jsonc`, `send_email` không khoá danh sách nhận) và bí mật có sẵn `FEEDBACK_MAIL_FROM` (người gửi, cùng tên miền đã cài ở Cloudflare Email). Hai thứ này có sẵn THEO LỜI CHỦ (chủ xác nhận tên miền gửi đã cài 16/10/2026); AI KHÔNG kiểm danh sách bí mật trên Cloudflare. Thiếu một trong hai thì bấm gửi mã trả câu "Chưa gửi được email, thử lại hoặc dùng cách khác." (không lỗi 500, không lộ lỗi nhà cung cấp) — người dùng vẫn đăng nhập bằng ứng dụng xác thực hoặc mã dự phòng.

**Điều kiện phát hành (kiểm LÚC phát hành bằng lệnh chỉ đọc):** `npx wrangler d1 migrations list tourdao-sales-db --remote` — `0102` còn trống và còn là số kế tiếp trên mọi nhánh chưa gộp. Bước A.0: mục `2.7` ở đầu `src/shared/changelog.ts` là số TẠM — kiểm lại cho đúng số kế tiếp ở `main` và chạy lại `node --test src/shared/app-info.test.ts`.

**Thử gửi thật lần đầu (bước 0b của kế hoạch — CHƯA ai thử; chủ tự làm SAU khi phát hành, trên chính tài khoản của mình):** gửi thật chỉ thấy được ở môi trường có tên miền gửi đã cài — e2e và kịch bản Chrome không đi ra hộp thư thật. Cách thử an toàn, không đụng tài khoản người khác:
1. Đăng nhập bằng một tài khoản CỦA CHỦ không giữ Quản trị / Toàn quyền / Kế toán (tài khoản quyền lớn không có lựa chọn email). Không có tài khoản như vậy thì DỪNG, hỏi AI cách khác — đừng tạo tài khoản hay đổi quyền tài khoản thật chỉ để thử (xem "cửa sổ đóng băng" ở phần Hoàn tác).
2. Trang **Tôi → Bảo mật đăng nhập → Nhận mã qua email**, gõ địa chỉ email của chủ, bấm "Gửi mã xác minh". Nếu tài khoản đã bật ứng dụng xác thực thì nhập kèm mã của ứng dụng.
3. Mở hộp thư (xem cả mục Thư rác): thư chủ đề "Mã xác minh đăng nhập Nền tảng Tour Đảo", thân chỉ có mã 6 số và câu "Nếu không phải bạn, đổi PIN ngay và báo IT.", không có liên kết. Nhập mã, bấm "Xác nhận email".
4. Đăng xuất, đăng nhập PIN trên máy chưa tin → bấm "Gửi mã qua email (…)" → nhận thư thứ hai → nhập mã → vào được.
5. Không nhận được thư sau vài phút: bấm gửi lại (tối đa 3 thư / 15 phút). Vẫn không có thì báo AI kèm giờ thử; AI đọc log Worker tìm dòng `mfa_mail_failed` (chỉ có lý do cố định `no_binding` / `no_from` / `send_threw`). Thử xong muốn bỏ thì "Gỡ email nhận mã" (tài khoản nội bộ phải còn ứng dụng xác thực).

**Báo nhân viên:** chỉ người KHÔNG giữ Quản trị / Toàn quyền / Kế toán thấy lựa chọn email; tự nguyện, không bắt buộc ai (ADR-G1 chưa duyệt). Người chỉ dùng email muốn đổi địa chỉ / gỡ email phải dùng một mã dự phòng — dặn cất kỹ bộ mã.

**Sau deploy:** `node scripts/audit-invariants.mjs --db remote` (trien-khai tự chạy) phải xanh `R-AUT-MFA-1/2/3/4`.

**Ca xấu: hoàn tác Worker về bản Phần B SAU KHI đã áp `0102`.** `wrangler rollback` làm được (không đổi Durable Object); mã cũ không đọc bảng `aut_mfa_email_code`. Nhưng yếu tố EMAIL đã bật vẫn nằm ở `aut_mfa_factor`: bản Phần B coi đó là "đã có yếu tố" (người đó bị hỏi mã) mà không có nút gửi email ⇒ người CHỈ có email phải dùng mã dự phòng hoặc nhờ Quản trị tắt lớp hai (suy từ mã Phần B, chưa thử). Báo chủ trước khi chọn rollback.

**CỨU HỘ: Toàn quyền bị khoá vì dòng EMAIL lệch.** Tài khoản Toàn quyền (hoặc Quản trị / Kế toán) chỉ có một dòng yếu tố EMAIL lệch (dữ liệu sửa tay — bất biến `R-AUT-MFA-4` báo đỏ), ân hạn `mfa_grace_until` đã qua hoặc NULL, không có Face ID ⇒ đăng nhập PIN trả 403 `mfa_setup_required` (dòng email không dùng được cho vai lớn nên coi như chưa bật). Người đó KHÔNG tự gỡ được. Đường thoát: (1) một Toàn quyền KHÁC bấm "Tắt bảo mật hai lớp" ở Quản lý tài khoản (kết thúc mọi yếu tố kể cả dòng lệch, mở cửa sổ 24 giờ để bật lại ứng dụng xác thực ngay ở bước đăng nhập); (2) nếu đó là Toàn quyền DUY NHẤT thì chỉ chủ chạy SQL trên D1 remote (CHỦ tự chạy, AI không chạy — `CLAUDE.md` §8; tạo điểm khôi phục Time Travel trước). Câu an toàn, chỉ đụng đúng một tài khoản, không xoá dòng nào (thay `<ID>` bằng id tài khoản, `<GIỜ>` bằng giờ UTC hiện tại dạng `2026-10-20T03:00:00.000Z`, `<GIỜ+24h>` bằng giờ đó cộng một ngày):
```sql
UPDATE aut_mfa_factor SET valid_to_at = '<GIỜ>', updated_at = '<GIỜ>', updated_by = '<ID>' WHERE staff_id = '<ID>' AND kind = 'EMAIL' AND valid_to_at IS NULL;
UPDATE staff SET mfa_enroll_until = '<GIỜ+24h>' WHERE id = '<ID>';
```
Câu đầu kết thúc dòng EMAIL lệch (hết lệch `R-AUT-MFA-4`); câu sau mở cửa sổ bật lại 24 giờ — lần đăng nhập PIN kế tiếp vào thẳng bước "bật ứng dụng xác thực" rồi mới có phiên. (Thay cho câu sau, đặt `mfa_grace_until` = giờ cộng vài ngày cũng mở được, nhưng cho vào thẳng không qua mã — kém an toàn hơn.) Kiểm sau: `node scripts/audit-invariants.mjs --db remote` xanh `R-AUT-MFA-4`.

## Lần phát hành kế tiếp có kho tệp hồ sơ (ADR-0123 — Gói 2 lát H-2; migration `0104`) — RUNBOOK

**Trạng thái: migrations `0103` và `0104` ĐÃ áp trên production** (kiểm `d1 migrations list --remote` ngày 18/10/2026 → "No migrations to apply!"; cùng lần phát hành bản 2.16 — xem mục «Phiên bản 2.16» đầu tệp). Câu cũ: nhánh `worktree-ho-so-rieng-tu-2fa`, soạn 2026-10-17; lần phát hành mang cả `0103` (lát H-1, hồ sơ mở rộng) và `0104`. Mọi bước sau A.0 do `npm run trien-khai` làm như thường; mục này chỉ thêm việc của chủ và điều cần biết.

**Việc của chủ — làm MỘT lần, TRƯỚC `npm run trien-khai`** (AI không được tạo kho — CLAUDE.md §8; `npm run trien-khai` sẽ dừng ở cổng 1e và in lại đúng lệnh này nếu chưa làm). Đứng ở thư mục `tourdao-sales`, trong Terminal:

1. Tạo kho tệp hồ sơ (kho riêng, không công khai):

```
npx wrangler r2 bucket create tourdao-sales-ho-so
```

2. Kiểm đã có kho (phải thấy dòng `name: tourdao-sales-ho-so`):

```
npx wrangler r2 bucket list
```

3. Chạy `npm run trien-khai` như thường lệ.

**Điều kiện phát hành (kiểm LÚC phát hành bằng lệnh chỉ đọc):** `npx wrangler d1 migrations list tourdao-sales-db --remote` — rà `0103`, `0104` còn trống và còn là số kế tiếp trên mọi nhánh chưa gộp (`git ls-tree --name-only <nhánh> migrations/`); đổi số lúc gộp được (bài `src/migrations-ho-so-tep.test.ts` nhận tệp theo đuôi `_ho_so_tep.sql` và đòi nó đứng sau mọi tệp khác).

**Sau phát hành, chủ thử một lần bằng tài khoản Toàn quyền** (chưa có màn hình — lát này chỉ có API; thử khi có màn hình ở lát giao diện): tải một ảnh CCCD chụp bằng iPhone (HEIC) và một PDF, mở lại, xem nhật ký có "Thêm ảnh giấy tờ" / "Mở ảnh giấy tờ" mà không có tên tệp. **Chưa kiểm khi soạn:** (a) `wrangler deploy` có từ chối khi kho chưa tạo không; (b) đầu ra thật của `wrangler r2 bucket list` (cổng 1e đọc theo mã nguồn wrangler 4.147.0); (c) nhãn HEIC thật của iPhone; (d) tốc độ tải 10 MB qua 4G và bộ nhớ Worker khi thân ~14 MB (`BL-TEP-THAN-HAI-LAN`).

**Sau deploy:** `node scripts/audit-invariants.mjs --db remote` (trien-khai tự chạy) phải không vi phạm `R-PTY-11`; `R-PTY-12` (cảnh báo) báo tệp chờ xoá kho — chạy lại bằng `POST /api/parties/tep-cho-xoa/chay-lai` (Toàn quyền).

**Hoàn tác:** migration `0104` chỉ THÊM hai bảng — lùi Worker về bản trước không cần đụng D1; kho R2 để nguyên (rỗng hoặc có ảnh) — KHÔNG xoá kho khi còn dòng `pty_attachment` chưa `r2_deleted_at`.

## Lần phát hành kế tiếp có tự khai hồ sơ (ADR-0124, ADR-0126 đ1 — Gói 2 lát H-3; migration `0105`) — RUNBOOK

**Trạng thái: migration `0105` ĐÃ áp trên production** (kiểm `d1 migrations list --remote` ngày 18/10/2026 → "No migrations to apply!"; cùng lần phát hành bản 2.16). Câu cũ: nhánh `worktree-ho-so-rieng-tu-2fa`, soạn 2026-10-17. Cùng nhánh với `0103` (H-1) và `0104` (H-2, cần chủ tạo kho R2 — mục trên): lần phát hành mang cả ba, `0105` áp SAU `0103`, `0104` (wrangler áp theo tên, tự đúng thứ tự). Mọi bước sau A.0 do `npm run trien-khai` làm như thường. **Không cần lệnh Cloudflare mới** (không bí mật, không kho, không biến mới) ngoài việc tạo kho R2 của `0104`.

**Tự khai CHỈ BẬT khi Toàn quyền đăng chính sách riêng tư** (`POST /api/parties/chinh-sach-rieng-tu`, khung đăng ở trang Tôi). Migration không gieo bản nào (ruling Q1): sau phát hành, mọi người thấy mục "Hồ sơ của tôi" nhưng nút gửi phiếu báo "chưa gửi được" — trạng thái bình thường, không phải lỗi.

**Việc của chủ — Q1: KHÔNG đăng chính sách riêng tư trên production trước khi (1) luật sư duyệt chữ của chính sách và (2) lát H-5 có đường xoá dữ liệu (phiếu xoá, thời hạn lưu — ADR-0126 đ2).** Lý do: đăng là có hiệu lực ngay và không sửa / gỡ được (bảng chỉ-thêm; bản sau chỉ THAY bản trước, người đã đồng ý bản cũ vẫn còn dòng đồng ý); người dùng bắt đầu gửi ngày sinh, địa chỉ, số giấy tờ mà Nền tảng chưa có cách xoá theo yêu cầu. Muốn xem thử: dùng `wrangler dev` hoặc `node scripts/dev-iphone.mjs` (D1 tạm), không dùng production. **Điều kiện Q1 DỰA VÀO KỶ LUẬT, không phải hàng rào máy** (dòng "Điều kiện Q1" ở `docs/SO-HANG-RAO.md`): máy chỉ giới hạn người đăng là Toàn quyền và bắt bấm thêm một lần ở bước xác nhận có câu "không gỡ được" (chống bấm nhầm) — mọi tài khoản Toàn quyền có hồ sơ đều thấy khung đăng ở trang Tôi ngay sau phát hành. Người giữ Toàn quyền trên production cần được dặn trước.

**Điều kiện phát hành (kiểm LÚC phát hành bằng lệnh chỉ đọc):** `npx wrangler d1 migrations list tourdao-sales-db --remote` — rà `0103`–`0105` còn trống và còn là số kế tiếp trên mọi nhánh chưa gộp; đổi số lúc gộp được (bài `src/migrations-ho-so-tu-khai.test.ts` nhận tệp theo đuôi `_ho_so_tu_khai.sql` và đòi nó là tệp mới nhất; bài `migrations-ho-so-tep` đã nới để `0105` đứng sau `0104`).

**Sau deploy:** `node scripts/audit-invariants.mjs --db remote` (trien-khai tự chạy) phải không vi phạm `R-PTY-13` (bảng phiếu rỗng ⇒ đạt). Chủ thử bằng tài khoản thường: trang Tôi có mục "Hồ sơ của tôi", thấy họ tên, điện thoại; chưa có chính sách thì chưa gửi được.

**Hoàn tác:** `0105` chỉ THÊM một bảng + trigger — lùi Worker về bản trước không cần đụng D1. Nếu chính sách đã đăng và đã có phiếu: lùi Worker làm mục "Hồ sơ của tôi" biến mất, phiếu và dòng đồng ý nằm nguyên trong D1 (không xoá).

## Lần phát hành kế tiếp có xác minh hồ sơ (ADR-0125 — Gói 2 lát H-4; migration `0107`) — RUNBOOK

**Trạng thái: migration `0107` ĐÃ áp trên production** (kiểm `d1 migrations list --remote` ngày 18/10/2026 → "No migrations to apply!"; cùng lần phát hành bản 2.16). Câu cũ: nhánh `worktree-ho-so-rieng-tu-2fa`, soạn 2026-10-17. Cùng nhánh với `0103`–`0105`: lần phát hành mang cả bốn; `0107` áp SAU `0103`–`0105` (wrangler áp theo tên, tự đúng thứ tự). Mọi bước sau A.0 do `npm run trien-khai` làm như thường. **Không cần lệnh Cloudflare mới.** Mục nhật ký thay đổi A.0 là mục **2.15 TẠM** (không trùng 2.8–2.14; main đã dùng thật 2.10, 2.11): phiên phát hành đánh số lại theo `main` lúc đó.

**Điều kiện phát hành (kiểm LÚC phát hành bằng lệnh chỉ đọc):** `npx wrangler d1 migrations list tourdao-sales-db --remote`, rồi `git ls-tree --name-only <nhánh> migrations/` cho MỌI nhánh / worktree chưa gộp. Số `0106` đang thuộc nhánh vé hỗ trợ (`0106_ve_ho_tro_2a.sql`, nhánh `claude/support-ticket-module-eb6445`); `0107` là số kế tiếp ở thời điểm soạn — nhánh nào vào `main` sau thì đổi số lúc gộp (bài `src/migrations-xac-minh-ho-so.test.ts` nhận tệp theo đuôi `_xac_minh_ho_so.sql`). `0107` chỉ THÊM (chỉ mục, view, trigger): không bảng, không cột, không gieo.

**Xác minh vô hại khi chưa có chính sách đăng:** hàng chờ là mục trống (chưa ai gửi được phiếu), chấp nhận / từ chối không có phiếu nào để xử lý. Tự khai vẫn CHỈ BẬT khi Toàn quyền đăng chính sách riêng tư (điều kiện Q1 ở mục `0105` ngay trên — luật sư duyệt chữ và lát H-5 có đường xoá; dựa vào kỷ luật). **Chưa có:** ảnh đi kèm phiếu và chấp nhận phiếu giấy tờ (phiếu giấy tờ chỉ từ chối được, 409 `can_anh_giay_to` — ruling Q1 của kế hoạch H-4, chờ lát ảnh). Phiếu ngày sinh và địa chỉ chấp nhận được bình thường.

**Việc của chủ:** (1) duyệt ảnh giao diện `docs/evidence/2026-10-17-xac-minh/anh/` (390 và 1040); (2) trả lời câu Q1–Q5 còn mở (mục "Câu hỏi còn mở" ở báo cáo việc 6 và `docs/BACKLOG.md` mục 39); (3) chạy `day-len` rồi `trien-khai` khi quyết phát hành — nhắc: nhánh phải dựng trên `main` mới nhất. Lưu ý vận hành: người Nhân sự đã tạo một tài khoản thì không bao giờ xác minh được hồ sơ của tài khoản đó (ADR-0125 đ5 vế b), nên cần ít nhất một Nhân sự hoặc Quản trị khác người đã tạo tài khoản, nếu không phiếu chỉ còn Toàn quyền xử lý.

**Sau deploy:** `node scripts/audit-invariants.mjs --db remote` (trien-khai tự chạy) phải không vi phạm `R-PTY-14`, `R-PTY-15`, `R-PTY-16` (bảng phiếu rỗng ⇒ đạt). Chủ thử bằng tài khoản Nhân sự: trang Quản lý tài khoản có khối "Hàng chờ xác minh" (trống); Bán hàng, Kế toán không thấy khối và `GET /api/parties/xac-minh` trả 403.

**Hoàn tác:** `0107` chỉ THÊM view + chỉ mục + trigger — lùi Worker về bản trước không cần đụng D1; phiếu đã chấp nhận / từ chối và dòng xác minh nằm nguyên (không xoá). Nếu cần gỡ riêng trigger: migration MỚI `DROP TRIGGER` (không sửa tệp `0107` đã áp).

## Chế độ bảo trì — đường thoát khẩn

Dùng CHỈ khi chủ dự án bị khoá ngoài (không vào được app để bấm tắt) hoặc chế độ bảo trì kẹt bật. Đây là thao tác GHI lên D1 remote, đi vòng app: theo `CLAUDE.md` §8 chỉ làm khi chủ dự án ra lệnh (hoặc tự chạy bằng `!`). Tác dụng TỨC THÌ (cổng ở máy chủ đọc D1 mỗi request, không đệm), không cần deploy.

Xem trạng thái (chỉ đọc, KHÔNG in SĐT):
```
CI=1 npx wrangler d1 execute tourdao-sales-db --remote --command "SELECT enabled, ends_at FROM mnt_setting"
```
Tắt khẩn:
```
CI=1 npx wrangler d1 execute tourdao-sales-db --remote --command "UPDATE mnt_setting SET enabled = 0 WHERE id = 'default'"
```
- Bảng cố ý không có CHECK chéo cột nên lệnh trên luôn chạy được dù `ends_at` còn giá trị (đã có test ở `src/migrations-maintenance.test.ts`).
- Lệnh này KHÔNG ghi nhật ký `maintenance_changed` (đi vòng app): sau khi dùng, ghi lại vào đầu tệp này (ngày, lý do) để lịch sử không thiếu.
- Sau đó kiểm `GET /api/auth/config` → `"maintenance":{"on":false,…}` và đăng nhập thử; rồi tìm nguyên nhân (từ ADR-0071 điều 3 bảo trì chỉ cho qua tài khoản đang hoạt động giữ Toàn quyền; cột `allowed_phones` không còn được đọc — chủ bị khoá ngoài chỉ khi tài khoản chủ mất `SUPER_ADMIN` hoặc bị ngưng).

Giao diện công ty hỏng (ADR-0087, migration `0069`; màn chỉnh không vào được) — về giao diện mặc định, một câu (chủ tự chạy; KHÔNG ghi nhật ký `giao_dien_changed`, ghi lại vào đầu tệp này sau khi dùng):
```
CI=1 npx wrangler d1 execute tourdao-sales-db --remote --command "UPDATE gd_setting SET tokens = '{}', version = version + 1 WHERE id = 'default'"
```

## Cổng bổ sung trước/sau khi áp lần phát hành 1 (rà soát độc lập, 2026-09-20)

Mục này được THÊM sau một lần rà soát độc lập; nó bổ sung chứ không thay bước nào của mục "Triển khai" ở trên.

### 1. Cổng chỉ-đọc TRƯỚC khi áp `0009…0012` lên remote — kỳ vọng 0 dòng
Chạy (chỉ đọc), ghi lại kết quả cùng điểm khôi phục Time Travel (`npx wrangler d1 time-travel info tourdao-sales-db`) TRƯỚC khi áp:

```
npx wrangler d1 execute tourdao-sales-db --remote --command "<câu dưới>"
```

```sql
SELECT id, length(trim(full_name)) AS len, instr(trim(full_name), '  ') AS double_space, date(created_at, '+7 hours') AS vn_date,
       length(given) AS given_len,
       CASE WHEN instr(head, ' ') > 0 THEN instr(head, ' ') - 1 ELSE length(head) END AS family_len,
       CASE WHEN instr(head, ' ') > 0 THEN length(trim(substr(head, instr(head, ' ') + 1))) ELSE 0 END AS middle_len
FROM (SELECT id, full_name, created_at,
             trim(substr(trim(full_name), length(rtrim(trim(full_name), replace(trim(full_name), ' ', ''))) + 1)) AS given,
             trim(rtrim(trim(full_name), replace(trim(full_name), ' ', ''))) AS head
      FROM staff)
WHERE trim(full_name) = '' OR length(trim(full_name)) > 200 OR date(created_at, '+7 hours') IS NULL
   OR instr(trim(full_name), '  ') > 0 OR instr(full_name, char(9)) > 0 OR instr(full_name, char(10)) > 0 OR instr(full_name, char(13)) > 0 OR instr(full_name, char(160)) > 0
   OR given_len > 60 OR family_len > 60 OR middle_len > 100;
```

Giải thích: mỗi dòng ra là một tài khoản mà bước backfill hồ sơ của `0012` sẽ (a) làm migration ABORT giữa chừng, hoặc (b) chạy xong nhưng tách/ghép tên sai. Truy vấn con `given`/`head` sao chép ĐÚNG cách `0012` (mục 4.2) tách tên: tên (`given`) = từ cuối; `head` = phần còn lại; họ = từ đầu của `head` (nếu `head` có dấu cách, nếu không họ = cả `head`); đệm = phần sau từ đầu của `head`. Ba cột `given_len`, `family_len`, `middle_len` in độ dài từng phần để tự nhìn.
- **(a) ABORT (vi phạm `CHECK`):** `full_name` rỗng/toàn khoảng trắng hoặc dài hơn 200 ký tự (`display_name`); họ dài hơn 60, tên đệm dài hơn 100, tên (từ cuối) dài hơn 60 ký tự (`CHECK` từng phần của `pty_person` — vd một từ 70 ký tự, hoặc họ 70 ký tự, dù tổng còn dưới 200); hoặc `created_at` không phải ISO (`date(...)` trả NULL → cột `valid_from_date` NOT NULL bị vi phạm).
- **(b) SAI LẶNG LẼ:** khoảng trắng đôi, TAB, xuống dòng, NBSP bên trong `full_name`. Backfill bằng SQL chỉ tách theo dấu cách ASCII đơn. Chỉ khoảng trắng ĐÔI làm R-N1-3 của `audit-invariants` đỏ (`display_name` giữ nguyên còn ba phần đã gộp khoảng trắng). Với TAB / xuống dòng / NBSP, `display_name` vẫn khớp tên ghép nên R-N1-3 VẪN XANH, nhưng họ/đệm/tên bị tách sai lặng lẽ (vd `"Nguyễn<TAB>Văn An"` → họ `"Nguyễn<TAB>Văn"`, đệm NULL, tên `"An"`) và không công cụ nào bắt được sau khi áp — vì vậy cổng TRƯỚC KHI ÁP là cơ hội duy nhất.

Cách xử lý dòng ra: sửa `staff.full_name` cho sạch TRƯỚC khi áp (chủ dự án quyết; đây là một `UPDATE` trên remote), hoặc — chỉ với nhóm (b) — chấp nhận và sửa tay hồ sơ ở trang Hồ sơ. Nhóm (a) không thể "chấp nhận": không sửa trước thì migration dừng giữa chừng (khi đó kiểm `npx wrangler d1 migrations list tourdao-sales-db --remote` và dữ liệu trước khi thử lại; khôi phục bằng điểm Time Travel đã ghi nếu cần).

### 2. Số câu trong một `db.batch()` — kiểm TRƯỚC lần nạp nhân viên đầu tiên qua Sheet
- Tạo một tài khoản = **6 câu** trong một batch: hồ sơ (`pty_party`), cá nhân (`pty_person`), vai trò STAFF (`pty_party_role`), tài khoản (`staff`), quyền (`stf_permission`), nhật ký (`audit_log`) — với một quyền (SALES); mỗi quyền thêm là thêm một câu.
- `POST /api/staff/sheet/apply` gộp TẤT CẢ ứng viên vào MỘT `db.batch()`: **6N + 1 câu** (N tài khoản + một dòng nhật ký `staff_synced`); 9 nhân viên ≈ 55 câu. Cùng request còn thêm khoảng N câu tra SĐT trùng và các truy vấn xác thực nằm NGOÀI batch.
- Đối chiếu con số 6N + 1 này với giới hạn HIỆN HÀNH của D1 và của gói Workers đang dùng (số truy vấn D1 mỗi lần gọi Worker; kích thước/số tham số của một câu và một batch) trên trang giới hạn D1 của Cloudflare TRƯỚC lần nạp đầu tiên — các con số đổi theo gói và theo thời gian, và tài liệu này không chép lại con số nào để tránh tin nhầm. Nếu vượt: nạp từng phần (API nhận danh sách `phones`, chọn một phần ứng viên mỗi lần). (Kịch bản `scripts/import-staff.mjs` từng nêu ở đây và cả đường đồng bộ nhân viên từ Sheet đã gỡ ở ADR-0071 — mục này nay chỉ còn giá trị lịch sử.)

### 3. Sau khi áp lần 1 trên remote — kiểm nhanh bằng một lượt gọi API thật
Các câu SQL của module `parties` dùng tham số đánh số `?NNN` và mới chỉ được kiểm trên D1 cục bộ; cần một lượt gọi thật trên remote:
1. Đăng nhập bằng tài khoản ADMIN.
2. `GET /api/locations` (8 địa điểm).
3. `POST /api/parties` (tạo một hồ sơ thử, kèm một liên hệ), rồi `GET /api/parties` và `GET /api/parties/:id`.
4. Đóng liên hệ thử vừa tạo: `POST /api/parties/:id/contacts/:cid/end`.
5. `node scripts/audit-invariants.mjs --db remote` (không `--strict` ở lần 1). Nếu `PRAGMA foreign_key_check` lỗi trên remote thì script thoát mã 2: chạy riêng `npx wrangler d1 execute tourdao-sales-db --remote --command "PRAGMA foreign_key_check"`, tạm bỏ dòng kiểm `R-N1-10` khỏi mảng `CHECKS` (chỉ sửa cục bộ, không commit) rồi chạy lại các kiểm còn lại — như mục "Việc còn treo / nợ" bên dưới đã nêu. Nếu remote từ chối cả lệnh NHIỀU CÂU trong một `--command` (thiết kế "một lần gọi wrangler cho mọi kiểm" hỏng theo cả hai cách), chạy từng câu bất biến một bằng `npx wrangler d1 execute tourdao-sales-db --remote --command "<một câu>"` và đọc kết quả bằng mắt (mỗi câu kỳ vọng 0 dòng / đếm 0).

### 4. Ba quyết định cần chủ dự án
Ghi ngắn, kèm chi phí; chưa sửa gì (không sửa ADR/đặc tả đã duyệt trong bước này).

**(a) Liên hệ chính có thể chồng lấn — và có ĐƯỜNG THẬT qua API hôm nay. CHỐT TRƯỚC KHI ÁP `0011` lên remote.**
`pty_contact_point` chỉ có chỉ mục duy nhất một phần `pty_contact_primary_uq` (`WHERE is_primary = 1 AND valid_to_date IS NULL`: tối đa một liên hệ chính ĐANG MỞ mỗi hồ sơ mỗi loại) — đặc tả đã duyệt chỉ đòi tối đa một liên hệ chính ĐANG MỞ mỗi loại; đặc tả im lặng về ngày kết thúc tương lai. Nhưng ADR-0003 điều 7 nói chống chồng lấn khoảng đã đóng bắt buộc dùng trigger (đã làm cho `pty_party_role`, `pty_party_relationship`), còn liên hệ thì chưa — và đây không phải chuyện giả định: `POST /api/parties/:id/contacts/:cid/end` với `{"validTo":"2099-12-31"}` (mọi ngày tương lai ≥ `valid_from_date` đều được: `validateEndDate` chỉ kiểm định dạng, câu `END_CONTACT` chỉ kiểm `validTo >= valid_from_date`) đóng liên hệ chính bằng một ngày TƯƠNG LAI → dòng rời khỏi chỉ mục một phần NGAY → thêm liên hệ chính mới → hai liên hệ chính cùng hiệu lực hôm nay. Hiển thị không sai (mọi chỗ đọc chỉ lấy dòng `valid_to_date IS NULL`), nhưng lịch sử vi phạm ADR-0003 điều 7 và không kiểm nào bắt.
Lưu ý khi chọn: từ đợt sửa sau rà soát toàn nhánh, khi hồ sơ không còn liên hệ chính ĐANG MỞ (kể cả vì liên hệ chính đã đóng bằng ngày TƯƠNG LAI — dòng đó có `valid_to_date` khác NULL nên bị coi là không còn chính), thêm một liên hệ mới cùng loại sẽ TỰ ĐỘNG thành liên hệ chính (mã ghi đè cả `isPrimary: false`). Vì vậy kịch bản chồng lấn ở trên nay xảy ra chỉ với hai thao tác (đóng bằng ngày tương lai rồi thêm số mới), không cần client yêu cầu `isPrimary: true`.

Ba phương án, chủ dự án chọn một (chưa chọn thay):
- **(i) Chặn ở mã:** từ chối `validTo > hôm nay (giờ Việt Nam)` ở route đóng liên hệ. Chi phí thấp nhất, làm ngay được, không đụng DDL và không cần duyệt lại gì; đổi hành vi nhỏ (không còn hẹn trước ngày kết thúc trong tương lai cho liên hệ).
- **(ii) Trigger, đúng ADR-0003 điều 7 nhất:** thêm 2 trigger `pty_contact_primary_no_overlap_{ins,upd}` vào DDL tham chiếu (`docs/superpowers/specs/2026-09-20-n1-schema-reference.sql`) và TÁI SINH `0011`. Rẻ nếu làm TRƯỚC khi áp `0011` lên remote (sau khi áp thì phải thêm một migration mới); cần chủ dự án duyệt lại DDL đã duyệt.
- **(iii) Chấp nhận, chỉ giám sát:** thêm một kiểm "hai liên hệ chính chồng lấn" vào `scripts/audit-invariants.mjs`. Không đổi schema, không đổi hành vi; chỉ phát hiện SAU khi đã xảy ra chứ không chặn.

**(b) Nhật ký `staff_updated` ghi SĐT — ĐÃ QUYẾT VÀ ĐÃ SỬA (chủ dự án chốt SỬA, 2026-09-21).** `src/modules/accounts/index.ts` (route `PATCH /api/staff/:id`) từng ghi `SĐT ${t.phone} → ${patch.phone}` vào nhật ký, trái ràng buộc "nhật ký không ghi SĐT, email, MST" (lỗi có từ trước N1). Nay chỉ ghi "đổi SĐT đăng nhập", không ghi số; có hai bài kiểm ở `src/modules/accounts/patch-staff.test.ts` (đỏ trước, xanh sau). **Dòng nhật ký `staff_updated` CŨ trên production vẫn còn số** (nhật ký chỉ-thêm, không xoá; chỉ admin xem ở trang nhật ký) — giữ nguyên.

**(c) ADR-0005 mục Quyết định 2 lệch DDL đã duyệt — ghi errata.** ADR viết `stf_permission(staff_id, permission_type_code, created_at, created_by)`, khoá duy nhất `(staff_id, permission_type_code)`; DDL đã duyệt và `0012` thực tế có `id`, `valid_from_at`/`valid_to_at`, đủ bốn cột kiểm toán và chỉ mục duy nhất MỘT PHẦN `stf_permission_open_uq … WHERE valid_to_at IS NULL` (đóng/mở lại quyền giữ lịch sử, đúng "không xoá cứng" của ADR-0003 điều 8). Mã theo DDL; chỉ cần chủ dự án đồng ý ghi errata vào ADR-0005 (chi phí: chỉ tài liệu).

## Việc còn treo / nợ
- **CHƯƠNG TRÌNH KHẮC PHỤC KIỂM TOÁN 1–2/10 (lập kế hoạch 2026-10-02, CHƯA thi công) — ưu tiên cao nhất, có hạn sổ dừng dây chuyền.**
  - **Kiểm lại trên `main` @`fc268abe`:**
    - 8/9 phát hiện CAO của đánh giá kiến trúc xác nhận;
    - 100/100 tình huống thử nghiệp vụ chạy lại: 59 dòng gắn cờ **vẫn lỗi**.
  - **Tài liệu:**
    - gốc và phương án: `docs/superpowers/specs/2026-10-02-khac-phuc-audit-goc-va-phuong-an.md` (9 gốc R1–R9);
    - lộ trình 8 đợt + bảng truy vết + cổng "xong": `docs/superpowers/plans/2026-10-02-khac-phuc-audit-00-lo-trinh.md`;
    - kế hoạch chi tiết Đợt 0 (`…-01-dot-0-chong-ghi-trung-quyen-tien.md`) và Đợt 1 (`…-02-dot-1-don-huy-coc.md`).
  - **Hạn:**
    - F-02: **ĐÃ ĐÓNG 2026-10-05** (xoá khỏi `docs/quyen-hoan.json`; điều kiện ADR-0094 A-9 đạt: lớp chống ghi trùng lên production từ 1.76, production đang 1.81, T12 4/4 xanh; chủ dự án giao đóng 2026-10-05).
    - TNV-G1 **15/10**: Đợt 1 khó kịp; chủ quyết gia hạn ngày 10/10.
    - F-03, TNV-G3, TNV-G4 **31/10**: Đợt 2, cần chủ "Duyệt" ADR-0088 + ADR-0092.
  - **Checklist theo dõi** (ai làm gì, đánh dấu từng việc): `docs/superpowers/plans/2026-10-02-khac-phuc-audit-checklist.md`.
  - **Câu chờ chủ:** (a)–(f) chủ đã đồng ý 2/10; còn (i)–(x) ở checklist §10.
  - **Đã xong 2/10:** khoá `LAN_GUI_SECRET` đã đặt trên production; TNV-G1 gia hạn tới 31/10 (dữ liệu là demo).
  - **Bắt đầu ngay được:** Đợt 0 (hai luồng), Đợt 1 Phần A "cầm máu", Đợt 5 phần cửa khẩn cấp, Đợt 7.
- **Thông báo màn hình khoá / Web Push (ADR-0036, nhánh `worktree-thong-bao-he-thong`, CHƯA gộp `main`):** Task 1–5 đã thi công; **đã qua lượt rà cuối 2026-09-28 (người kiểm độc lập, toàn bộ Task 1–5), lượt sửa gom (I-1..I-4 + sửa kèm) chờ kiểm lại đúng phạm vi lượt sửa** (nhật ký `.superpowers/sdd/thong-bao-luot-2/`). Runbook triển khai (hai lượt deploy, cách tạo khoá VAPID, tắt tạm): mục "Thông báo màn hình khoá / Web Push" ở trên; hướng dẫn cho chủ: `docs/HUONG-DAN-BAT-THONG-BAO-DIEN-THOAI.md`. **Chưa làm:** chủ chưa tạo cặp khoá VAPID (chưa deploy Lượt A/B nào); kịch bản 10 bước trên iPhone thật hoàn toàn CHƯA thử (không thể thử trước khi có khoá thật); nhóm > 40 máy (chia lô qua Bảng tin) chỉ kiểm bằng test/e2e, chưa thử với số máy thật lớn. **Giới hạn cũ đã sửa (lượt sửa gom 2026-09-28, I-2):** mục "Đang bật trên máy này" trước đây xét theo TỔNG số máy còn hiệu lực của tài khoản (`soMay > 0`) — tài khoản dùng ≥ 2 máy có thể thấy sai; nay máy chủ trả thêm `mayNay` (đúng MÁY ĐANG XEM, qua `?endpoint=`), giao diện dùng đúng trường đó.
- **⚠ NHÁNH `a0-danh-muc-cho-lap-don` BỊ THAY — KHÔNG GỘP (cập nhật 2026-09-27):** việc đã làm bằng ADR-0033 + nhánh `danh-muc-lap-don` (bản 1.19). Đoạn dưới giữ lại làm lịch sử (GĐ2 Phần A0, chủ chọn 2026-09-26). Bản 1.15 (ADR-0028, đang ở production) đổi cổng `GET /api/catalog` từ `office` sang `orders` để Đối tác/Thực tập lập đơn; cách này **lệch ADR-0019** (Q13/A0 chốt route RIÊNG `GET /api/catalog/for-order`, cổng `orders` + `can(staff, "order.create")`, còn `/api/catalog` giữ `office`). Hiện chưa lộ gì (cổng `orders` chưa có FIELD), nhưng khi GĐ2 thêm FIELD vào cổng `orders` thì hướng dẫn viên đọc được danh mục giá. Nhánh A0 tách từ 782d053 (cũ hơn `main` nhiều bản) và **chưa biết** 1.14/1.15/ADR-0028. Tệp cả hai phía cùng sửa (so `git diff --name-only 782d053` của từng phía, 2026-09-26): `src/modules/catalog/index.ts`, `web/order-form.ts`, `src/route-access.test.ts`, `tests/e2e/orders.mjs`, `src/shared/changelog.ts`, `src/shared/app-info.test.ts`, `docs/SO-HANG-RAO.md`, `docs/SYSTEM-DESIGN.md`. Khi đưa về `main`: giữ cách của A0 (`/api/catalog` → `office`, form gọi `/for-order`), **giữ** luật giá/khoá ô của 1.14–1.15 (`holdsPartner`, `retailOnly` ở `web/order-form.ts`/`web/service-card.ts`), đặt số bản sau 1.15. **Không vướng chữ nhưng sẽ đỏ:** khối "Đối tác + Thực tập đọc danh mục" của `tests/e2e/catalog.mjs` (1.15) gọi thẳng `GET /api/catalog` và chờ 200 — phải đổi sang `/api/catalog/for-order`; kịch bản Chrome bằng chứng `docs/evidence/2026-09-26-mo-danh-muc-doi-tac/kich-ban/doi-tac-lap-don-smoke.mjs` cũng vậy (ngoài `npm test`/e2e, chỉ vỡ khi chạy lại bằng chứng). Trình chủ **ADR sửa ADR-0028 điều 1** (không sửa ADR đã duyệt — N9). Nhật ký: `docs/superpowers/plans/2026-09-26-va-3-loi-kiem-toan-nhat-ky.md` mục cuối.
- `staff.role` (ghi hằng `'sales'`) và `staff.full_name` (ghi `''`) là cột chết có chủ đích; gỡ khi lần đầu phải dựng lại `staff` (ADR-0003 điều 10). `docs/data-dictionary.json` ghi `deprecatedColumns`.
- Module `accounts`, `audit`, `catalog`, `orders` còn ở `LEGACY` của `src/architecture.test.ts` (SQL chưa đăng ký); `wonGuard` của `orders` đọc `audit_log` (ngoại lệ tới N2).
- Sắp xếp danh sách nhân sự/hồ sơ theo `sort_key` dùng `COLLATE NOCASE` — chữ có dấu chưa theo chuẩn tiếng Việt (danh sách chỉ vài chục dòng; nếu cần sắp lại ở mã bằng `Intl.Collator('vi')`).
- `PRAGMA foreign_key_check` trong `audit-invariants` chưa kiểm được trên D1 remote từ máy này; nếu lệnh lỗi trên remote thì chạy riêng `npx wrangler d1 execute tourdao-sales-db --remote --command "PRAGMA foreign_key_check"`.
- Tiếp theo: N2 (người đặt/khách đi tour trên đơn, gộp hồ sơ, phân công, `updateDraftOrder` theo id bền — ADR-0006), N3 (sổ thu tiền, hoá đơn, sửa sau xác nhận), N4 (giá net HDV).
- Trang chủ mới (`/home`, `GET /api/orders/dashboard`): phần "còn thiếu tiền" của `getDashboard()` (`src/modules/orders/repository.ts`) quét TOÀN BẢNG `orders` (`EXPLAIN` cho `SCAN orders`, không có index trên `orders.status`) — chi phí tăng tuyến tính theo số đơn ĐÃ XÁC NHẬN. Chấp nhận được ở quy mô hiện tại (30 nhân viên); cần xem lại (thêm index hoặc đổi truy vấn) khi dữ liệu lớn.
- Trang chủ mới: biên an toàn thanh tab dưới cùng ở khổ điện thoại 390px chỉ còn 13px (đo bằng Chrome headless, `env(safe-area-inset-bottom)` = 0 trên môi trường đo — trên iPhone thật biên này NHỎ HƠN vì vùng an toàn thật > 0). Nếu sau này thêm mục điều hướng nữa ở thanh tab thì phải đo lại (kịch bản `docs/evidence/2026-09-23-trang-chu-moi/kich-ban/trang-chu-smoke.mjs`, mục D).
- **Face ID lát 2 (đăng nhập bằng Google) chưa lập kế hoạch:** mô phỏng chuyển hướng qua tên miền khác ở lát 0 chưa có kết quả (`docs/evidence/2026-09-23-passkey/ket-luan-lat-0.md`) — chưa rõ cửa sổ app cài (PWA) có giữ cookie và quay về đúng cửa sổ sau khi rời tên miền hay không. Phải thử lại bước đó trước khi lập kế hoạch lát 2. Zalo (lát 3, nếu chủ muốn) để sau.
- **Route đăng nhập bằng Face ID chưa có hạn mức riêng theo SĐT/tài khoản** (`POST /api/auth/passkey/login`) — chỉ có hạn mức xin thách thức theo IP ở `POST /api/auth/passkey/options` (`CHALLENGE_IP_LIMIT`, 120 lần/15 phút); route `login` không tự giới hạn số lần thử assertion. Rủi ro thấp (một khoá sai gần như không đoán được — không phải PIN 6 số) nhưng ghi nhận là giới hạn đã biết, chưa có test/route chặn riêng.
- **Kịch bản e2e `passkey` không trả lại mã PIN của tài khoản FIELD** (`tests/e2e/passkey.mjs`, quanh dòng 229–237: admin đặt lại PIN, kịch bản dùng mã mới rồi không đặt về `ACCOUNTS.field.pin`) — chạy `passkey` TRƯỚC `maintenance` (vd `npm run test:e2e -- passkey maintenance`) thì `maintenance` đỏ vì đăng nhập FIELD sai PIN. Thứ tự đủ bộ hiện tại (`maintenance` trước `passkey`) không dính. Có từ `d808c36`; chưa sửa (ghi nhận khi kiểm nhánh Trợ giúp, 2026-09-23).
- **Mô hình người–vai–quyền GĐ1 (ADR-0018, nhánh `gd1-mo-hinh-vai`, migration `0024`), bảy điểm ⚠️ chờ chủ hoặc phiên GĐ2 quyết** — chi tiết và bằng chứng: `docs/superpowers/plans/2026-09-24-mo-hinh-vai-thi-cong-nhat-ky.md`:
  1. Hồ sơ đang giữ vai "Kế toán" (mã cũ `ACCOUNTANT`) không gắn địa điểm, đang mở, sẽ được đọc là vai mô hình mới sau khi áp `0024` (câu đếm ở mục runbook `0024` phía trên) — quyền không đổi, chỉ đổi nơi sửa (trang Nhân viên thay vì route quyền cũ).
  2. Tạo tài khoản MỚI trên một hồ sơ ĐÃ CÓ vai kiểu cũ (`STAFF`/`SALES`/`GUIDE`/`AGENT`) không tự đóng các dòng vai cũ đó — đổi vai (không phải tạo tài khoản) mới đóng. Là câu hỏi dữ liệu, không phải lỗi.
  3. Route vai còn nhận gán MỚI cho mã vai đã ngưng dùng (`active = 0`) — chưa bị chặn ở máy chủ.
  4. Một quản trị viên tự sửa vai của CHÍNH MÌNH ở trang Nhân viên nhận lỗi 403 tiếng Việt (không có nút khoá riêng, chỉ chặn lúc lưu) — cần polish giao diện sau.
  5. ✅ ĐÃ XỬ LÝ 2026-09-26 (ADR-0028, bản 1.15): chủ dự án chọn mở danh mục CHỈ-ĐỌC, kèm giá bán lẻ, cho cả Thực tập và Đối tác (`GET /api/catalog` cổng `orders`). ~~Thực tập sinh lập được đơn nhưng nhận 403 khi mở danh mục dịch vụ.~~
  6. ⚠️ Nợ (a): "vai đang mở" = `valid_to_date IS NULL` ở mọi nơi — dòng vai tài khoản có NGÀY KẾT THÚC trong tương lai, hoặc dòng "Kế toán" GẮN MỘT NƠI, không được luật nhóm (LC-3) và kiểm "chọn đủ vai" nhìn thấy, và không đóng được từ cả trang Hồ sơ lẫn trang Nhân viên (câu đếm ở runbook `0024` cho biết có bao nhiêu).
  7. ⚠️ Nợ (b): danh sách Nhân viên chỉ hiện TÊN VAI cho tài khoản đã gán vai (`web/staff.ts` `accessLabel`), dù tài khoản có thể có thêm quyền cộng tay — nhãn có thể thiếu.
- **Bảng tin (ADR-0022) — ĐÃ lên production bản 1.16 (2026-09-26); việc còn treo, gom một lần** (chi tiết: `docs/superpowers/plans/2026-09-25-bang-tin-de-xuat-luat.md`, `docs/superpowers/plans/2026-09-26-bang-tin-ban-giao-dieu-phoi.md` §6, mục "Task 11" của nhật ký thi công):
  1. **Task 13 — thử iPhone thật (chủ):** danh sách ở `docs/superpowers/plans/2026-09-25-bang-tin-ke-hoach.md` Task 13; lặp lại một lượt ngắn trên production sau phát hành. Chưa kiểm: Safari iPhone thật, khoá màn hình ≥ 1 phút, mất mạng thật, CSP `wss:` qua LAN, trình đọc màn hình (dải "Tải lại" nằm trong nền `inert`).
  2. **Chủ duyệt các đề xuất luật** (chưa hiệu lực; AI không tự sửa `docs/ARCHITECTURE.md`, `web/CLAUDE.md`, `src/CLAUDE.md`): ngoại lệ "gốc lắp ráp nạp tệp lớp Durable Object", hàng bảng kịch bản Chrome cho `bang-tin-smoke.mjs`, ngoại lệ import `.ts` ở hai tệp `web/*-logic.ts`, cập nhật danh sách module ở `src/CLAUDE.md`. Trong lúc chờ, `docs/SYSTEM-DESIGN.md` §16 ghi hai chỗ mã lệch chữ luật.
  3. **Quyết định thiết kế chờ chủ:** (a) R24 — khi bảng/hộp đang mở, dải "Tải lại" và cả thông báo nổi nằm DƯỚI lớp phủ (`.toast-vung` z-index 40 < `.sheet-root` 50); (b) R16 — `POST /api/orders/:id/handler-money-edit` phát tin `tien` cả khi số khách y nguyên (sửa đụng hợp đồng tiền orders↔dispatch); (c) "chấm đếm" cho Đối tác (ADR-0014 điều 12) chưa có; (d) quyết định (5) của ADR-0023 về ô `order.view` của Hướng dẫn viên — khi đổi, bài NT-3 đỏ CÓ CHỦ ĐÍCH và buộc hỏi lại chủ (`docs/SO-HANG-RAO.md`).
  4. **Ngoài phạm vi nhánh này (Đợt E, thị giác, thấy ở ảnh bằng chứng):** chip số khách bị cắt ở 390 px ("2NI") trên danh sách đơn; huy hiệu "Đã xác nhận" xuống dòng lệch cạnh mã đơn ở 1040 px trên `/order`.
  5. **Chưa kiểm/nợ nhỏ:** 8/10 vị trí gọi `dongBangTin` chưa có ca e2e (`docs/SO-HANG-RAO.md`); kiểm lại bảng giá Durable Object trên tài khoản Cloudflare thật; deploy commit cũ trước-DO bằng `wrangler deploy` (chưa kiểm — không thử); danh sách Minor đã hoãn ở bàn giao §6 (vd `laSuKienHopLe` thiếu ca "5 khoá, một khoá sai tên", `docHanGiay` nhận "1e3", `tram.ts` nhận socket trước `setAlarm`, gốc lắp ráp `baoThayDoi` chưa có test đơn vị).
- **Tốc độ đợt 1 (ADR-0102) — đã gộp vào `main` (commit đầu nhánh `20167ef`) và đã chạy thật trong bản 1.84 trên production** (kiểm 2026-10-06, chỉ đọc: `20167ef` là tổ tiên của `main`; `kiem-phien-ban.mjs --sau-deploy` ĐẠT; `/giao-dien.css` và `/api/giao-dien.css` đều trả 200, `text/css`, `etag "v3"`; trang `/orders` có thẻ `href="/giao-dien.css"`). Sổ: `docs/superpowers/plans/2026-10-05-toc-do-dot-1-thi-cong-nhat-ky.md`. **Chưa kiểm:** iPhone thật (mục "quay lại app", "đổi màu công ty"); hiệu quả Smart Placement — lần thử 01:47Z 2026-10-06 header `cf-placement` ra `local-SIN` (chưa thấy `remote-…`; Cloudflare cần tới ~15 phút phân tích và có thể không đổi gì) nên **chưa kết luận có lợi hay không**; chưa đo số giây. Chủ đo bằng `cf-placement` + biểu đồ Request duration; không lợi thì xoá dòng `placement` ở `wrangler.jsonc` rồi triển khai lại. Đợt 2 (gộp câu D1, chuông thông báo, chỉ mục) chưa làm.
- **Sổ đại lý đợt 1 (nhánh `claude/so-tien-luot-2-dai-ly`, migration `0090`, đã gộp `main` và đã lên production bản 1.87 ngày 2026-10-12) — việc còn treo, gom một lần** (runbook: mục «Lần phát hành kế tiếp: sổ đại lý đợt 1» ở trên; nợ nhỏ từng mục: `docs/BACKLOG.md` «Sổ đại lý đợt 1 — nợ nhỏ»):
  1. **Chụp bù đơn cũ** (đợt 2): đơn xác nhận trước khi có bảng mức không có bản chụp; khối «Phần đối tác» ghi «Đơn xác nhận trước khi có bảng mức», `R-ORD-T1w` cảnh báo vĩnh viễn, `R-ORD-T1` đỏ nếu có đơn xác nhận bằng mã cũ sau ân hạn.
  2. **Gộp hồ sơ trùng (ADR-0068) với bản chụp:** gộp đổi bên đặt của đơn chưa giao sang hồ sơ giữ lại nhưng bản chụp giữ `beneficiary_party_id` cũ; đợt 2 quyết (chụp lại hay theo chuỗi gộp).
  3. **`R-BIL-2`** («đơn Đã giao thiếu dòng giá vốn») chưa vào bảng kiểm khoá tháng — đợt 2.
  4. **Mở khoá «Đã giao» cho đơn có người hưởng:** đơn mới có bên đặt là đại lý bị giữ ở «Đã giao» (nên chưa «Hoàn thành» được) tới đợt 2.
  5. **Giới hạn «chỉ đại lý cá nhân»:** hồ sơ TỔ CHỨC chưa mang được vai được hưởng (`POST /api/parties/:id/roles` trả 409 `role_via_account` cho vai bên ngoài; tạo tài khoản chỉ gắn hồ sơ cá nhân), nên ô «Đặt qua đối tác» chưa tìm thấy công ty lữ hành. **Cần ADR:** cho Quản trị gán vai cho hồ sơ tổ chức, hoặc ghi rõ đợt 1 chỉ hỗ trợ đại lý cá nhân (chủ chọn để sau 2026-10-09).
  6. **Chờ chủ:** duyệt nhãn chữ trên các màn mới («Hoa hồng», «Giá đại lý», «Khách tính», «Mức», «Người bán») và bố cục qua ảnh ở `docs/evidence/2026-10-08-so-dai-ly-dot-1/`; ca sổ vàng `golden/so-cong-no-luot-2.json` chờ chủ hoặc Kế toán xác nhận từng ca; các đề xuất sửa luật ở `docs/superpowers/specs/2026-10-08-so-dai-ly-dot-1/de-xuat-luat-dot-1.md`.
  7. **Chưa kiểm:** kịch bản Chrome `so-dai-ly-smoke.mjs` chỉ chạy trên D1 tạm với danh mục giả; chưa đo mạng điện thoại thật; `audit-invariants --db remote` đã chạy sau phát hành 12/10 (đạt, 4 cảnh báo — xem mục trạng thái ở đầu tệp).
