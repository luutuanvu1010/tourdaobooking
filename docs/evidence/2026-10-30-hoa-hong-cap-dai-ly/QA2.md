# Biên bản QA2 — Hoa hồng cấp đại lý (Task 18, 2026-10-30)

Hồ sơ có ngày. Người kiểm độc lập, chỉ đọc: không sửa mã sản phẩm; lần lưu duy nhất của task chỉ gồm tệp này. Mặc định KHÔNG ĐẠT khi thiếu bằng chứng.

- Nhánh `thi-cong-hoa-hong-cap-dai-ly`, HEAD `71adc9d1`. Gốc `main` = `a129d3dd` (`git merge-base main HEAD`; `main` cục bộ vẫn là `a129d3dd`, nhánh đi trước 35 lần lưu, chậm 0).
- Mốc: tài liệu tới `4a915b05`; «Mốc cuối phần 1» `67a19357` (Task 13); phần 2 sau `961e0ef4` (Task 14).
- Thẩm quyền đã đọc: `DAC-TA.md` bản 5 (§1, §3, §5, §8 trọn, §10, §12), `ADR-0151` (Đ1–Đ8, tiêu chí 1–8, «Tệp được chạm»), ba tệp `QUYET-DINH-CHU-*`, hai tệp `BIEN-BAN-DUYET-*`, nhật ký thi công, `ket-qua-phan-1.md`, `ket-qua-phan-2.md`, brief Task 18.
- Môi trường: macOS, Node v22.22.3. Kịch bản Chrome: D1 tạm + `wrangler dev` cục bộ do chính kịch bản tự chọn cổng trống (không `--remote`); `CHROME_BIN=…/chrome-wrap.sh`, `AXE_JS=/Users/tuanbao/.claude/jobs/685db6cc/tmp/axe.min.js`; mọi `OUT` trỏ `/tmp/qa2hh/…`, không vào repo. Đối chiếu trước/sau: danh sách tiến trình `wrangler dev` y hệt (không giết tiến trình nào của worktree khác), số thư mục `$TMPDIR/tourdao-a2-*` 8 trước, 8 sau.

## 1. Lệnh đã chạy lại và dòng kết quả

| Lệnh | Dòng kết quả (chép) | Kết luận |
|---|---|---|
| `npm test` | `── npm test: bước 1 thoát 0, bước 2 thoát 0` · `# tests 6789` `# pass 6785` `# fail 0` `# todo 4` · bài đo giờ `# tests 1` `# pass 1` | ĐẠT |
| `npm run typecheck` | `tsc --noEmit && tsc --noEmit -p web && tsc --noEmit -p web/sw` thoát 0, không lỗi | ĐẠT |
| `npm run build:web` | `public/sw.js 5.1kb` · `⚡ Done in 2ms`, thoát 0; `git status` sạch sau đó (`so-do-trang.ts` không đổi) | ĐẠT |
| `npm run test:e2e -- pwa` | `E2E: 4/4 kịch bản xanh` (19 giây) | ĐẠT |
| `npm run test:e2e -- sua-muc` | `E2E: 4/4 kịch bản xanh` (33 giây) | ĐẠT |
| `hoa-hong-smoke.mjs` (390 + 1040) | `HOA HONG SMOKE OK`, 53 bước ✓ (gồm 1d, 1m, 1x, K, 8k, CR, DC ở cả hai khổ; 8 Đối tác chạy sau cùng), 93 ảnh trong `/tmp/qa2hh/anh` | ĐẠT |
| `HH_PHA=lo-nut HH_KHO=1040 hoa-hong-smoke.mjs` (P16 của kịch bản) | `HOA HONG SMOKE ĐỎ — 2 bước:` `7[1040]` và `14b[1040]`, thoát 1 | ĐỎ có chủ đích — đúng kỳ vọng |
| `a2-smoke-form.mjs` | `UI SMOKE FORM OK` | ĐẠT |
| `t2b-danh-ba-smoke.mjs` | `T2B DANH BA SMOKE OK` (kịch bản ghi đè hai ảnh của `docs/evidence/2026-10-01-tro-ly-mai/anh/` dù có `OUT` — đã `git checkout`, không vào lần lưu; như nhật ký Task 14 đã ghi) | ĐẠT |
| `dot-a-smoke.mjs` | 8 bước ✓ tới `ho-so` 1040 + 390, rồi `Error: hết giờ chờ: nhat-ky: thẻ đã dựng xong (máy tính)` | ĐỎ SẴN (ADR-0038, `web/CLAUDE.md`), đúng chỗ đã biết; không tính lỗi nhánh |
| `node scripts/chup-muc-giao-dien.mjs --so-sanh 20ffe9ad` | `So 20ffe9ad ↔ cây làm việc: GIỐNG HỆT (khung thật + khung tạm 1024 tập, ô Trang chủ 1024 tập, mất mạng, 47 trang × 3 tài khoản).` | ĐẠT |
| Bài Hướng dẫn + Trợ lý: `node --test src/shared/tro-ly*.test.ts src/shared/huong-dan*.test.ts src/modules/tro-ly/tro-ly-route.test.ts` | `# tests 158` `# pass 158` `# fail 0` | ĐẠT |
| `node --test src/shared/app-info.test.ts` | `# pass 6` `# fail 0` | ĐẠT |
| P16 người kiểm tự làm: bỏ `cu.validFrom <= homNay` khỏi X2 ở `xetTruocDoiCapRieng` (`src/modules/pricing/index.ts`), chạy `node --test src/modules/pricing/doi-cap-rieng.test.ts` | `not ok 5 - e ca giao nhau: chưa tới ngày, H ≤ tuNgay ≤ validFrom` (expected `'Mức này chưa tới ngày áp dụng nên không đổi được.'`, actual `'Cấp riêng cũ bắt đầu từ 02/11/2026 nên cấp mới phải bắt đầu sau ngày đó. …'`), `not ok 6 - e2 …`, `not ok 7 - ghim hai phía X1/X2 ⇔ kiemDoi`; `# pass 19` `# fail 3` | ĐỎ đúng chỗ |
| Hoàn nguyên P16 (chép lại bản sao) | `git diff --stat` rỗng, `git status --short` rỗng; chạy lại `# pass 22` `# fail 0` | ĐẠT, không commit |

Kiểm cơ giới tiêu chí 9 phần 1: kịch bản tạm `/tmp/qa2hh/chi-chuoi.mjs` đọc `git diff -U0 a129d3dd...67a19357 -- src/modules/ ':!*.test.ts'`, ghép từng cặp dòng −/+ trong mỗi hunk, xoá ruột mọi chuỗi chữ (`"…"`, `'…'`, `` `…` ``) rồi so: `hunk 23, cặp dòng 26, khác ngoài chuỗi 0`. Mọi hunk có số dòng − bằng số dòng +. Phạm vi: `index.ts` 20 dòng, `rules.ts` 6 dòng.

## 2. Bảng tiêu chí

### Đặc tả §8

| # | Kết luận | Bằng chứng |
|---|---|---|
| 1 Không số do `web/` suy; «—»; ca «loại chỉ có dòng nhóm» | ĐẠT | `npm test` xanh (bài `maTranCap` ở `hoa-hong-hien-thi.test.ts`, ca cấp chỉ có dòng nhóm G1 ⇒ ô «Mọi dịch vụ» `null`); smoke `1m` (ô «—» + câu §5.4); grep `web/hoa-hong*.ts`: không `chonMuc`, không phép tính trên `tyLeBp`; luật phủ chỉ ở `src/shared/hoa-hong-phu-muc.ts` |
| 2 Câu thứ tự áp mức + ba ca `chonMuc` + P16 | ĐẠT | `thu-tu-ap-muc.test.ts` trong `npm test`; P16 (iii) Task 3 ở nhật ký (đảo vòng 10–12/4–6 ⇒ `not ok 4 … expected 12 actual 6`, `rules.ts` hoàn nguyên rỗng) |
| 3 Luật phủ mức §4.4, dải 8 thiếu (5/3) + 1 tắt, câu §5.1, đối chiếu `chonMuc` đỏ một lần | ĐẠT | `phu-muc-doi-chieu.test.ts`, `hoa-hong-phu-muc.test.ts` xanh; P16 (i), (ii), (iv) Task 3 ở nhật ký; smoke `1d`, `1e` |
| 4 Khoá cấp / tắt loại: hộp §5.2 nguyên văn, tông huy hiệu, cấp khoá chỉ «Ngừng», «Đổi» lần xếp ⇒ 200 | ĐẠT (có ghi G1) | smoke `K[390]`, `K[1040]`, bước T; `hopKhoaCap`, `NHAN_CAP_DA_KHOA` ở `src/shared/hoa-hong-hien-thi.ts:377,386` |
| 5 Cấp riêng trên trang; câu 400/409 nguyên văn §6.1; phần 2 «Đổi cấp» + X1/X2 + ADR-0151 | ĐẠT | smoke `CR`, `DC` cả hai khổ (409 chồng ngày nguyên văn; 409 cấp khoá chen giữa nguyên văn trong hộp); bảng ADR dưới đây |
| 6 Luật hiện nút; `hoa-hong-hien-thi.test.ts` xanh không sửa ca cũ ngoài chữ | ĐẠT | `npm test`; diff phần 2 của tệp bài chỉ thêm một ca (`+7` dòng, không xoá) |
| 7 Quyền: Bán hàng không nút ghi; Đối tác 403, mở sau cùng | ĐẠT | smoke `7`, `14b` xanh và ĐỎ khi `HH_PHA=lo-nut`; `8[390]`, `8[1040]` chạy cuối |
| 8 Khổ màn, vùng chạm, axe, «⋯» bằng bàn phím, mũi tên, «Xem dòng ↓» | ĐẠT có ngoại lệ ghi tên (G2, G3) | smoke `1m` (`scrollWidth ≤ innerWidth`, không dung sai), `8k` (Enter mở, tiêu điểm vào khung, `inert`, Esc về «⋯», `aria-haspopup="dialog"`), `1x`; axe critical/serious 0; Tab đầu tới ✕ «Đóng» (G2); ba phần tử vùng chạm lọt nhờ dung sai 0,5px (G3) |
| 9 Phạm vi diff: không chạm `migrations/`, `permissions.ts`, `contracts.ts` | ĐẠT | `git diff a129d3dd...HEAD --stat -- migrations/ src/shared/permissions.ts src/shared/contracts.ts` rỗng (toàn nhánh 154 tệp) |
| 9 phần 1: `src/modules/` chỉ đổi trong chuỗi chữ | ĐẠT | kiểm cơ giới ở mục 1: 26/26 cặp dòng chỉ khác trong chuỗi |
| 9 phần 2: chỉ tệp ADR-0151 + lệch hỗ trợ có ghi | ĐẠT | `git diff 961e0ef4..HEAD --stat`: 20 tệp = tệp ADR «Tệp được chạm» (`pricing/index.ts`, `repository.ts`, `doi-cap-rieng.test.ts`, `so-dai-ly-quyen-route.test.ts`, `route-access.test.ts`, `lan-gui-phu-route.test.ts`, `hoa-hong-smoke.mjs`, `SO-HANG-RAO.md`, `SYSTEM-DESIGN.md`, `huong-dan-ke-toan.ts`, `changelog.ts`, `hoa-hong-hien-thi(.test).ts`, `web/hoa-hong-hop.ts`, `web/hoa-hong-doi-tac.ts`) + bằng chứng/nhật ký (khe 1, phán quyết ở `BIEN-BAN-DUYET-KE-HOACH`) + `web/hoa-hong-cap.ts` (một dòng `article`→`section`, ghi ở nhật ký Task 17 «Lệch hỗ trợ»). `rules.ts`, `audit-actions.ts`, `web/parties.ts` không có mặt. Ghi: `git diff 67a19357..HEAD` (gốc nhật ký dùng) thêm cả lần lưu Task 14 (kịch bản + 61 MB ảnh), cũng là bằng chứng |
| Nhật ký thay đổi | ĐẠT | `src/shared/changelog.ts` mục `2.48` (ngày `2026-10-30`, ghi TẠM), năm dòng gồm dòng «Đổi cấp»; một mục duy nhất (quyết định 14); `app-info.test.ts` xanh |
| Bài Hướng dẫn và Trợ lý | ĐẠT | 158/158 |
| Người kiểm độc lập chỉ đọc cho mỗi phần | ĐẠT | biên bản này |

### ADR-0151

| # | Kết luận | Bằng chứng |
|---|---|---|
| 1 Bài route + bài ghim hai phía + P16 | ĐẠT | `doi-cap-rieng.test.ts` 22/22; bảng ca a–l (+e, e2): ca **e** = `validFrom = H+3`, `tuNgay = H+1` ⇒ `kiemDoi` ra «Mức này chưa tới ngày…», nên chỉ điều kiện `cu.validFrom <= homNay` giữ X2 khỏi giành câu — đúng ca canh đột biến. Người kiểm tự làm P16: đỏ ở e, e2 (mục 1), hoàn nguyên sạch. Đủ ca: đổi từ hôm nay + Thử tra bậc 10–12, trùng 400, khoá 409 `muc_tat`, không có 404, thân sai 400, hồ sơ thôi hưởng 400, đã chụp tới X, 503 thiếu hàm tiêm, cấp cũ khoá (đổi 200, Sửa về 409) |
| 2 Đua thật ⇒ đúng một thắng, 409 `stale`; P16 bỏ `CASE WHEN changes() > 0`; dòng sổ hàng rào | ĐẠT (có ghi G6) | bài «Đua thật qua route» + «đổi hai lần tuần tự»; P16 Task 16 ở nhật ký (`expected 'stale'`, `actual 'prc_tier_overlap'`); dòng mới ở `docs/SO-HANG-RAO.md` ghi ngày quan sát |
| 3 Quyền: 7 vai 403, Kế toán 200 | ĐẠT | `so-dai-ly-quyen-route.test.ts` ca «Đổi cấp riêng (ADR-0151)»: Tài xế công ty, Tài xế đối tác, Nhân sự, HDV, Đối tác, lai Kế toán+Đối tác, Bán hàng ⇒ 403 `forbidden`, không dòng nào ghi; Kế toán 200 |
| 4 Danh sách route + số đếm | ĐẠT | `route-access.test.ts` thêm dòng, 393 ⇒ 394; `lan-gui-phu-route.test.ts` 234 ⇒ 235 |
| 5 Kiến trúc | ĐẠT | `npm test` (gồm `architecture.test.ts`); câu mới `party_tier_change_insert` ở `pricing/repository.ts`, chỉ ghi `prc_party_tier` |
| 6 test + typecheck xanh; diff ba chỗ cấm rỗng | ĐẠT | mục 1 |
| 7 Người kiểm độc lập | ĐẠT | biên bản này |
| 8 Diff phần 2 chỉ tệp «Tệp được chạm» | ĐẠT theo phán quyết khe 1 | như dòng 9 phần 2 ở trên |
| Thứ tự Đ3 (quyền → tìm dòng → thân → đã chụp → X1/X2 → `kiemDoi` → cấp trùng → cấp có không → lô) | ĐẠT | đọc route `POST /api/pricing/muc-rieng/:id/doi` trong `src/modules/pricing/index.ts`; X1/X2 nguyên văn khớp ADR; `xetTruocDoiCapRieng` không xuất |
| Đ4 lô, Đ6 nhật ký giữ khuôn «mức riêng …» | ĐẠT | `cauDoiCapRieng` (`repository.ts`), hai `auditStatement` điều kiện `changes() > 0`; bài kiểm ghim chi tiết `mức riêng TA1-… · đến …` |
| `rules.ts` không chạm `kiemDoi`, `kiemSua` | ĐẠT | `git diff a129d3dd...HEAD -- src/modules/pricing/rules.ts`: ba hunk, chỉ `kiemTenMucTa`, `kiemThanGan`, `kiemThanDoiChinhSach`, `kiemThanGanRieng` |

### Dòng P16 đã hứa trong nhật ký

Task 3: (i)–(iv) có. Task 12: (i)–(iii) có. Task 15: (i) bỏ `cu.validFrom <= homNay`, (ii) bỏ `cu.validTo !== null` có. Task 16: bỏ `CASE WHEN changes() > 0` có, kèm giờ 13:16. Kịch bản (Task 14): `HH_PHA=lo-nut HH_KHO=1040` có. **ĐẠT.**

### Quyết định của chủ 1–14

| # | Kết luận | Bằng chứng |
|---|---|---|
| 1, 7 «Khoá cấp»/«Mở lại cấp», hộp hỏi lại, vẫn chi | ĐẠT | `hoa-hong-hien-thi.ts:181–182, 377`; smoke `K` |
| 2 ô «—» | ĐẠT | smoke `1m` |
| 3 «Cấp đại lý»/«Cấp riêng»/«Loại đối tác» | ĐẠT | bảng từ lượt 6 xanh; `web/hoa-hong*.ts` còn «chính sách» chỉ ở chú thích `web/hoa-hong-lich-su.ts:1–13` (không hiện ra) |
| 4 dựng trên `main` | ĐẠT | gốc `a129d3dd` = `main` hiện tại |
| 5, 11, 12 route một lô, X1/X2 ở route | ĐẠT | bảng ADR |
| 6 đổi chữ máy chủ, chỉ chuỗi | ĐẠT | kiểm cơ giới tiêu chí 9 |
| 8 khuôn chi tiết nhật ký giữ | ĐẠT | route mới ghi `mức riêng …`; Task 4 giữ `chính sách ${…}` hai chỗ (bài lượt 6 ghim đúng 2) |
| 9 `kiemDoi` không đụng | ĐẠT | diff `rules.ts` |
| 10, 13 kế hoạch duyệt, nhánh đúng | ĐẠT | `BIEN-BAN-DUYET-KE-HOACH` |
| 14 một lần phát hành, một mục 2.48 | ĐẠT | `changelog.ts` |

## 3. Đọc toàn nhánh (chỉ đọc)

- `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `confirm(`, `alert(` trong `web/hoa-hong*.ts`: 0 chỗ.
- `web/` chọn mức: không. Không gọi `chonMuc`, không tính trên `tyLeBp`; luật phủ nằm ở `src/shared/`, có bài đối chiếu `chonMuc`.
- Chữ tiếng Anh hay mã thô cho người dùng: grep không thấy. Smoke `bocucSach` quét «không chữ Anh / mã thô» ở mọi bước và mọi hộp: xanh.
- Lỗi chưa ai bắt: không thấy lỗi nào sai tiền hay sai quyền. Route đổi kiểm lại quyền ở máy chủ; giao diện chỉ liệt kê cấp đang mở, khác cấp cũ; lần có ngày ngừng không có «Đổi cấp» (`nutDoiNgung` + `viecChung`).
- Mã trùng: hàm `cauCu` của hộp «Đổi cấp riêng» (`web/hoa-hong-hop.ts:695`) chép nguyên hàm cùng tên của hộp «Đổi cấp» loại (`:532`), và câu «Cấp cũ … sẽ ngừng, đến hết …» viết ngay trong `web/` thay vì ở `hoa-hong-hien-thi.ts` (đã có `cauMucCuSeNgung` cùng khuôn nhưng nói «Mức cũ»). Cùng hộp có bốn chuỗi chữ khác viết ở `web/` («Đổi cấp riêng», «Cấp mới», «Từ», «Chọn ngày bắt đầu.»), trái với cam kết khe 4 («mọi chữ nằm ở `hoa-hong-hien-thi.ts`»). Không sai nghĩa; xếp Sửa nhỏ (S2).
- Mã chết: `xepLoai` (`hoa-hong-hien-thi.ts`) không còn nơi gọi ngoài bài (nhật ký Task 9 đã nêu, giữ có chủ đích). `nutDoiNgung`, `NHAN_CHUA_CO_MUC`, `NHAN_LOAI_DA_TAT` nay chỉ dùng trong chính tệp; `web/hoa-hong-bang.ts` chỉ còn `urlNgung`. ADR-0151 «Trang ghép» nói nút hiện theo `nutDoiNgung` trên `HoaHongHoSoResponse.ganRieng`: đúng, nhưng qua `viecLanGan` → `viecChung`.
- Câu `Cấp cũ ${g.muc.ten}` ở hộp đổi không có ngoặc «», trong khi câu Đ8 cùng hộp có «»: lệch trình bày nhỏ (G7).

## 4. Kết luận

- **Phần 1 (giao diện + đổi chữ, mốc `67a19357`, bằng chứng `961e0ef4`): ĐẠT.** Mọi tiêu chí §8 có bằng chứng chạy lại hôm nay; tiêu chí 8 đạt với hai ngoại lệ có tên (G2, G3) thuộc thành phần dùng chung có từ trước, cần chủ ghi nhận.
- **Phần 2 (ADR-0151, sau `961e0ef4`): ĐẠT.** Tám tiêu chí của ADR đạt, P16 X2 do người kiểm tự làm đỏ đúng ca e, hoàn nguyên sạch.
- Kết luận này không thay cổng phát hành (bộ đo Chặng 1 trước và sau, chủ duyệt), không thuộc kế hoạch này.

### Chặn

Không có.

### Sửa (nên làm trước khi nhập `main`; không đổi kết luận ĐẠT)

- **S1 — 61 MB ảnh trong lịch sử nhánh.** `docs/evidence/2026-10-30-hoa-hong-cap-dai-ly/anh/` = 61 MB (93 PNG, nhiều tệp > 2 MB) nằm ở lần lưu `961e0ef4`. Nhập `main` kiểu tua thẳng (`day-len`) thì 61 MB ở mãi trong lịch sử, xoá về sau cũng không bớt. Cách sửa: trước khi nhập, viết lại lần lưu đó chỉ giữ khoảng 10–15 ảnh then chốt (hoặc nén), phần còn lại để ngoài repo; đây là việc đổi lịch sử nhánh nên **chủ quyết**.
- **S2 — Chữ của hộp «Đổi cấp riêng» ở `web/`.** Chuyển `cauCu` (`web/hoa-hong-hop.ts:695`, trùng `:532`) và các nhãn «Đổi cấp riêng», «Cấp mới», «Từ», «Chọn ngày bắt đầu.» sang `src/shared/hoa-hong-hien-thi.ts` (một hàm kiểu `cauCapCuSeNgung(ten, tuNgay)` dùng chung cho hai hộp), để khớp cam kết khe 4 và để bảng từ quét được.
- **S3 — Huy hiệu ngắn «Đã khoá» ở thẻ Loại và thẻ một đối tác.** §5.2 ghim huy hiệu «Đã khoá — vẫn áp cho loại và đối tác đang theo». Bản ngắn `NHAN_CAP_KHOA_NGAN` hợp lý ở đầu cột ma trận và chip điện thoại (chỗ hẹp, huy hiệu đầy đủ có ở chi tiết cấp). Nhưng nó còn dùng ở dòng «Đang theo cấp …» của thẻ Loại (`web/hoa-hong-loai.ts:79`), ở cấp riêng và «Loại đối tác» của thẻ một đối tác (`web/hoa-hong-doi-tac.ts:67, 95`) — đúng chỗ Kế toán xem một loại hay một đối tác cụ thể có còn được chi không, và đặc tả §11 nêu «khoá cấp mà tưởng thôi chi» là rủi ro lớn nhất. Cách sửa: ba chỗ đó dùng `NHAN_CAP_DA_KHOA` đầy đủ; giữ bản ngắn cho ma trận và chip.

### Ghi

- **G1** — Bản ngắn «Đã khoá» ở đầu cột ma trận và chip điện thoại: chấp nhận được (chỗ hẹp, cùng tông `cat` + biểu tượng khoá, chi tiết cấp có câu đầy đủ). Phần không chấp nhận là S3.
- **G2** — Tiêu chí 8: Tab đầu tiên trong «⋯» tới nút ✕ «Đóng» của `moBangTruot`, Tab thứ hai mới tới nút đầu danh sách (đo lại hôm nay: 390 tới «Đổi», 1040 tới «Sửa»). Nút ✕ có từ đợt 0 (`web/bang-truot.ts:35`, không đổi trong nhánh). Đặc tả cùng câu cấm «thêm hành vi tiêu điểm mới» và nói đây là «hành vi sẵn có của `moBangTruot`», nên câu «Tab tiếp theo tới nút đầu» mô tả sai thành phần có sẵn. Người kiểm chấm ĐẠT theo ý chính của tiêu chí; cần chủ ghi nhận câu đặc tả lệch, không sửa thành phần dùng chung trong đợt này.
- **G3** — Vùng chạm ≥ 44px: lượt hôm nay có ba phần tử lọt nhờ dung sai 0,5px của kịch bản (in `44.00` khi làm tròn, thật khoảng 43,5): `hh-doi-kieu` (358×44), nút ✕ `sheet-close` (44×44), `hh-sua-gan-den-chon` (238×44). Cả ba có trên `main` trước nhánh (`git grep` ở `a129d3dd`), là ô chọn và nút dùng chung. Không chặn; nếu muốn hết hẳn thì đặt `min-height: var(--h-control)` cho ô chọn trong hộp ở `tokens`/`app.css`, việc riêng.
- **G4** — `dot-a-smoke.mjs` đỏ sẵn ở `nhat-ky` (ADR-0038), mọi bước trước đều xanh; `t2b-danh-ba-smoke.mjs` ghi đè hai ảnh ngoài `OUT` (đã hoàn nguyên). Hai việc của kịch bản cũ, không thuộc nhánh.
- **G5** — Changelog 2.48 và ngày `2026-10-30` ghi TẠM; phiên phát hành kiểm lại ở bước A.0 `docs/HANDOFF-N1.md`.
- **G6** — Bài «đua thật» mô phỏng đua bằng `chenTruocLo` (chen một lệnh ngừng ngay trước lô) chứ không bắn hai yêu cầu song song; cùng khuôn với «Đổi chính sách» của loại và đủ để P16 đỏ, nên chấp nhận.
- **G7** — `Cấp cũ ${g.muc.ten} sẽ ngừng…` thiếu ngoặc «» quanh tên cấp, khác câu Đ8 ngay trên; sửa cùng S2.
- **G8** — Mã chết còn lại: `xepLoai` (giữ có chủ đích từ Task 9); vài hằng chỉ còn dùng nội bộ tệp. Dọn ở lần chạm sau.
- **G9** — `ket-qua-phan-1.md` đo «hai phần tử» sát 44px; lượt QA2 thấy ba (thêm `hh-doi-kieu`) vì phần 2 thêm bước mở hộp. Không đổi kết luận.
