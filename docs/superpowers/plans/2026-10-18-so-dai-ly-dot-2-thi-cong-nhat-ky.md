# Sổ thi công — Sổ đại lý đợt 2

- Kế hoạch: `docs/superpowers/plans/2026-10-18-so-dai-ly-dot-2-ke-hoach.md`. Đặc tả: `docs/superpowers/specs/2026-10-18-so-dai-ly-dot-2/README.md` (cùng thư mục: `trang-ghep.md`, `phieu-ke-toan.md`, `cau-dem-chi-doc.sql`). ADR-0132 (accepted 2026-10-18) thắng đặc tả; đặc tả thắng kế hoạch.
- Số migration dự kiến: `0111_so_dai_ly_dot_2.sql`, `0112` (chụp bù đơn khách lẻ cũ, bỏ nếu câu đếm (b1) = 0) — cả hai **tạm** (`0098` đang bị nhánh đưa đón giữ). Lúc gộp kiểm lại bằng `ls migrations` và `git ls-tree --name-only <nhánh> migrations/` cho mọi nhánh chưa gộp (lúc bắt đầu, 18/10: migration cuối của mọi nhánh = `0110`). Bản dự kiến `2.18` (tạm).
- Nhánh `claude/objective-euclid-1c8113`, commit bắt đầu `51a0ac06`.
- Nền xanh lúc bắt đầu (Task 0, trước mọi sửa; chạy 2026-10-18 19:42–19:47 giờ Việt Nam): `npm run typecheck` thoát 0; `npm test` thoát 0 (bộ chính 5590 bài, 5589 đạt, 0 đỏ, 1 `todo`; bài đo giờ của hook chạy một mình 1/1 đạt).

## Điều kiện Task 0 Step 1 (kiểm lại 2026-10-19 bằng `grep` / đọc tệp)
- ADR-0132 có ở `docs/adr/`, dòng Trạng thái = **accepted** (lời chủ 2026-10-18).
- `docs/superpowers/specs/2026-10-18-so-dai-ly-dot-2/trinh-chu.md` có lời duyệt nguyên văn của chủ cho ba quyết định.
- `docs/quyen-hoan.json`: trường `xay_tren_cho_phep` của TNV-G1, TNV-G3, TNV-G4, HC-5.19, HC-4.2 đều có đoạn «SỔ ĐẠI LÝ ĐỢT 2 — chủ dự án 2026-10-18» (đọc bằng JSON, không bằng mắt). Dòng cho phép cũ của đặc tả QR ngày 8/10 không tính. ĐỦ.
- Điều kiện phát hành (không phải điều kiện thi công): chỉ sau khi đã diễn tập khôi phục dữ liệu (HC-5.19).

## Ruling
(mỗi dòng: `Ruling: <quyết> — <vì sao> — <giá nếu sai>`; R-P1…R-P7 do điều phối ra trước thi công, chép theo nghĩa từ sổ điều phối)

- Ruling R-P1: mọi lần giao kết thúc với `npm test` + `typecheck` XANH (ngoại lệ duy nhất: giữa Task 3 và 4, cùng một lần giao). Task 2 chịu mọi bài cũ mà trigger của nó làm đỏ: gieo bản chụp (khuôn `gieoMocXep`) hoặc đảo có chủ đích ghi trong commit, và chuyển danh sách sang Task 4 để không đảo hai lần — sửa sau lớp DB mà không sửa thì cả nhánh đỏ giữa chừng — nếu sai: thêm việc gieo ở Task 2 sớm hơn cần, không mất gì.
- Ruling R-P2: mỗi `DROP`+`CREATE` trong 0111 lấy định nghĩa của migration SỐ LỚN NHẤT đang tạo đối tượng đó; báo cáo kèm diff định nghĩa cũ ↔ mới để chứng «mọi điều kiện khác giữ nguyên» — chữ «0080» của kế hoạch có thể đã cũ — nếu sai: không có, đây là cách đọc an toàn hơn.
- Ruling R-P3: spike `gross_snapshot` chạy trên cả node:sqlite của khung thử VÀ D1 local (wrangler); hai nơi khác nhau hoặc không thử được D1 ⇒ dùng trigger `BEFORE INSERT` — 0111 không sửa được sau khi chủ áp remote — nếu sai: trigger dài hơn một CHECK, cùng tác dụng.
- Ruling R-P4: hành động nhật ký mới (`ledger_counterparty_confirmed` ở Task 5, `ord_terms_backfilled` ở Task 6) vào danh sách ẩn `lich-su-doi-tac.ts` ngay ở task tạo ra nó nếu có bài ép; Task 14 chỉ kiểm lại — tránh đỏ giữa chừng — nếu sai: không.
- Ruling R-P5: dựng `0112` trong lúc thi công (câu `INSERT…SELECT` không làm gì khi b1 = 0); chỉ quyết bỏ tệp lúc gộp, sau khi chủ chạy câu đếm; runbook Task 14 ghi điều này — kết quả đếm không tới trong lúc thi công — nếu sai: một tệp migration rỗng tác dụng lên production (vô hại).
- Ruling R-P6: người kiểm (nguoi-kiem-doc-lap) ĐƯỢC chạy lại tệp kiểm trọng tâm của task (CLAUDE.md §3 thắng khuôn kỹ năng «đừng chạy lại»).
- Ruling R-P7: Ruling / Quan sát chặn thật / Nợ ghi vào sổ thi công đã commit (tệp này) do người thi công từng task ghi, kèm dòng `docs/SO-HANG-RAO.md`; sổ điều phối (`progress.md`) chỉ theo dõi hoàn thành và dải commit.

- Ruling R-1 (Task 0, spike `gross_snapshot`): dùng **`CHECK`** trong `ALTER TABLE bil_posting ADD COLUMN gross_snapshot INTEGER CHECK (gross_snapshot IS NULL OR (kind_code = 'DELIVERED' AND gross_snapshot >= 0))` — KHÔNG dùng trigger `BEFORE INSERT` cho phần này. Hai nơi thử (node:sqlite 3.51.3 của khung thử; D1 local qua `wrangler 4.147.0` / `workerd 1.20261001.1`, thư mục tạm `--persist-to`) cho **cùng** kết quả ở cả sáu bước (bảng dưới), nên đúng chữ R-P3 cho phép CHECK. Ba điều Task 2 phải biết: (1) CHECK **không thể** diễn đạt «có `gross_snapshot` ⇔ phiếu `DELIVERED` tạo sau mốc», vì phiếu `DELIVERED` cũ (lượt 1) và phiếu bổ sung của M1 vốn NULL — dạng `(kind_code = 'DELIVERED') = (gross_snapshot IS NOT NULL)` làm `ALTER` **thất bại** ngay khi bảng có một phiếu `DELIVERED` cũ (bước s1 dưới đây); vế «phiếu mới phải có `gross_snapshot`» thuộc về trigger `bil_posting_delivered_terms` / lô ghi ở máy chủ; (2) `ALTER … ADD COLUMN … CHECK` được SQLite kiểm trên các dòng đã có, nên **phải thử với bảng đã có phiếu `DELIVERED` cũ** — thử trên bảng rỗng thì dạng sai ở (1) vẫn «xanh giả» (đã thấy cả hai: D1 local lần chạy đầu và node:sqlite với bảng rỗng đều cho `ALTER` dạng sai chạy qua); (3) chưa thử được trên D1 **remote** (cấm `--remote`, và D1 cấm cả `SELECT sqlite_version()` nên không đọc được số phiên bản của D1 local) — nếu D1 remote từ chối `ALTER` này thì migration 0111 dừng ở lúc chủ áp và **không** được ghi là đã áp, nên sửa tệp rồi áp lại được — vì sao: spike chạy trên bảng đã gieo phiếu cũ, đúng tình huống thật của production — giá nếu sai: viết lại thành trigger `BEFORE INSERT` cùng điều kiện (dài hơn một CHECK, cùng tác dụng); nếu Task 2 muốn thêm vế `gross_snapshot >= due_snapshot` thì thử lại đúng cách này (đã thử một bản có vế đó, kết quả giống hệt; không đưa vào đây vì trigger (iv) của ADR-0079 đã đòi `giảm giá = gross − due` đúng từng đồng).
- Ruling R-2 (Task 0, `cau-dem-chi-doc.sql`): bảy câu `SELECT` một dòng, mỗi câu có dòng chú thích lời thường ngay trên, không có `!`, `"`, ký hiệu đô-la hay dấu huyền (chủ dán vào `wrangler d1 execute … --remote --command "<câu>"` trong zsh). Giả định ghi lại: (a) «điều khoản cung ứng hiện hành» hiểu là **bản chụp hiện hành của dòng có nhà cung cấp**, hoặc — với dòng chưa có bản chụp nào (đơn xác nhận trước `0090`) — **điều khoản hôm nay (giờ Việt Nam, `date('now','+7 hours')`) của mã dịch vụ** có nhà cung cấp, dịch vụ riêng thắng nhóm (đúng `chonDieuKhoan`); (b1x) dùng cùng quy tắc «điều khoản hôm nay» vì nhóm này không có bản chụp; (b2) là phần bù của (b1) trên cùng tập «đã xác nhận, chưa giao, chưa bản chụp» nên (b1) + (b2) = cả tập; (b3) thêm `status = 'confirmed'` vì đơn đã huỷ cũng có thể còn bản chụp; (e) không lọc theo bản chụp nên chồng với (b2) và (b3). Mỗi câu chạy được trên SQLite đã áp đủ migration của khung thử (node:sqlite) **và** trên D1 local (xem mục «Câu đếm: bằng chứng chạy thử»); thêm một lượt gieo nhỏ (13 đơn) cho thấy đúng số kỳ vọng ở (a), (b1), (b1x), (b2), (b3), (e), kể cả điều khoản theo NHÓM và việc dịch vụ riêng thắng nhóm — vì sao: câu chỉ-đọc mà sai điều kiện thì chủ quyết bỏ/giữ `0112` trên số sai — giá nếu sai: sửa một dòng SQL, chủ chạy lại.
- Ruling R-3 (Task 0, ca vàng C-1…C-5): thêm vào cuối `golden/so-cong-no-luot-2.json`, `cho_xac_nhan`, `nguoi` / `ngay` = null; C-1 = tình huống 1 của phiếu, C-2 = 2, C-3 = 3, **C-4 = tình huống 5**, **C-5 = tình huống 6** (tình huống 4 của phiếu là SV-HT-03, không phải ca C). Số lấy nguyên từ ADR-0079 «Ví dụ bằng số»; chỗ ADR không nêu thì `null` và ghi «ADR không nêu — chờ Kế toán» (C-2: giá đại lý; C-4: giá đại lý từng dòng, nên không có `tong`). `gia_dai_ly` có số ở C-1 (4.500.000 = «Tour Đảo thu về»), C-3 (850.000 = «Tour Đảo giữ»), C-5 (từng dòng như ca A-1). Phần sổ cái (giữ hộ, dòng khi «Đã giao», số dư) nằm ở khối riêng `so_cai` của mỗi ca — số nguyên đồng không âm, chiều ghi bằng chữ (`no_cong_ty` / `cong_ty_no`), loại dòng theo tên mã (`HELD`, `HOA_HONG`, `GIAM_GIA_BEN_DAT`, `GIA_VON`) — để Task 11 dùng; **không** dùng khối `bo_sung` của ca B-3 vì khối đó đòi `gia_von` khác null (C-1 giảm giá nhưng không có giá vốn). Bài `src/so-vang-so-dai-ly.test.ts` chạy xanh với năm ca mới là `todo`, và lớp 2 báo chẩn đoán «KHỚP» cả năm (1, 1, 1, 3, 3 phép) — vì sao: Task 11 cần số đã gõ sẵn, và khối sổ cái ngoài vùng lớp 1/lớp 2 quét nên không làm đỏ bài hiện có — giá nếu sai: sửa số trong JSON.

### R-1: lệnh và kết quả đã chạy (spike, không commit mã)
Bảng `bil_posting` đã có sẵn một phiếu `DELIVERED` cũ (`due_snapshot = 0`, chưa có cột `gross_snapshot`) trước mọi `ALTER`. Cách chạy:
```
node --no-warnings run-node.mjs <thư-mục-spike>        # node:sqlite 3.51.3, PRAGMA foreign_keys = ON, áp mọi migration
CI=1 npx wrangler d1 migrations apply tourdao-sales-db --local --persist-to <thư-mục-tạm>
CI=1 npx wrangler d1 execute tourdao-sales-db --local --persist-to <thư-mục-tạm> --file <bước>.sql --json
```
| Bước | Câu | node:sqlite 3.51.3 | D1 local (workerd 1.20261001.1) |
|---|---|---|---|
| s0 | gieo 1 nhân viên, 5 đơn nháp, 1 phiếu `DELIVERED` cũ (`legacy-delivered`, đơn o1, due 0) | thành công | thành công |
| s1 | `ADD COLUMN gross_snapshot INTEGER CHECK ((kind_code = 'DELIVERED') = (gross_snapshot IS NOT NULL))` (dạng «có ⇔ DELIVERED») | **bị từ chối** — `CHECK constraint failed` | **bị từ chối** — `CHECK constraint failed: SQLITE_ERROR` |
| s2 | `ADD COLUMN gross_snapshot INTEGER CHECK (gross_snapshot IS NULL OR (kind_code = 'DELIVERED' AND gross_snapshot >= 0))` — **dạng chọn** | thành công (bảng vẫn có phiếu cũ) | thành công |
| s3 | chèn `DELIVERED` mới, `gross_snapshot = 500` | thành công | thành công |
| s4 | chèn `RECEIPT` có `gross_snapshot = 500` | **bị từ chối** — `CHECK constraint failed: gross_snapshot IS NULL OR (kind_code = 'DELIVERED' AND gross_snapshot >= 0)` | **bị từ chối** — cùng câu, `SQLITE_CONSTRAINT_CHECK` |
| s5 | chèn `DELIVERED` có `gross_snapshot = -1` | **bị từ chối** — cùng câu | **bị từ chối** — cùng câu |
| s6 | chèn `DELIVERED` không có `gross_snapshot` (giống phiếu M1 / lượt 1) | thành công | thành công |
Đọc lại bảng: 3 dòng (`legacy-delivered` NULL, `m1-delivered` NULL, `new-delivered` 500) — giống hệt trên hai nơi. Lần chạy đầu trên D1 local (seed bị rollback vì D1 cấm `sqlite_version()`) cho thấy dạng s1 **thành công** khi bảng còn rỗng: đó là «xanh giả» cần tránh. Bản thử phụ có thêm vế `gross_snapshot >= due_snapshot` cho kết quả giống hệt ở cả hai nơi.

## Hợp đồng «đơn b1» cho `0112` (Task 6) — đúng điều kiện câu đếm (b1)
Câu đếm (b1) và `0112` PHẢI dùng cùng một điều kiện, nếu không câu (sau) sẽ lệch số dòng dịch vụ của (b1). Đơn thuộc b1 khi đủ tất cả:
- `orders.status = 'confirmed'` và `orders.delivered_at IS NULL`;
- chưa có **bất kỳ** dòng nào trong `ord_service_terms` cho đơn đó;
- bên đặt là khách lẻ: `booker_party_id IS NULL`, hoặc là công ty chủ (`IN (SELECT party_id FROM v_pty_owner_company)`), hoặc **không** có vai đang mở nào mà (`role_type_code IN (SELECT role_type_code FROM v_prc_beneficiary_role)` hoặc `role_group = 'EXTERNAL'` hoặc `is_partner_label = 1`) — nối từ `v_pty_open_role` và `v_pty_role_type`, đúng `nguoiHuongCua` (`src/modules/pricing/rules.ts`: có vai được hưởng ⇒ HUONG; vai bên ngoài / nhãn đối tác mà không còn được hưởng ⇒ KHONG_HUONG; còn lại ⇒ NONE);
- **không** có dòng dịch vụ nhập tay: không `order_service` nào của đơn có `catalog_code IS NULL`.
Mỗi dòng dịch vụ của đơn b1 nhận một bản chụp: hoa hồng `NONE` (không người hưởng), người bán = công ty chủ theo điều khoản `ALL` có hiệu lực ở ngày xác nhận (`prc-st-goc-all`, từ 2025-01-01; ngày xác nhận lấy `orders.confirmed_at`, trống thì ngày tạo đơn, đều theo giờ Việt Nam), `source = 'AUTO'`, `created_by = 'he-thong:0112'`. Lưu ý cho Task 6: trigger `ord_service_terms_term_valid` đòi điều khoản còn hiệu lực ở `captured_date`, nên đơn nào xác nhận trước 2025-01-01 (nếu có) sẽ làm `INSERT` hỏng — thêm điều kiện hoặc ngày chụp phù hợp và ghi Ruling. Đơn b2 = phần bù trên cùng tập «xác nhận, chưa giao, chưa bản chụp» (đại lý / có người hưởng, hoặc có dòng nhập tay).

## Câu đếm: bằng chứng chạy thử (Task 0 Step 2)
Tệp: `docs/superpowers/specs/2026-10-18-so-dai-ly-dot-2/cau-dem-chi-doc.sql` — 7 câu. Kiểm bằng máy (kịch bản tạm, không commit): mọi dòng không chú thích bắt đầu bằng `SELECT`, đúng một câu kết thúc `;`, không có ký tự `! " $` hay dấu huyền, không từ khoá ghi, mỗi câu có dòng chú thích tiếng Việt ngay trên; mỗi câu `prepare` + chạy được trên SQLite 3.51.3 đã áp đủ 100 tệp migration (0001–0110) — **cả trên CSDL rỗng lẫn sau lượt gieo nhỏ** (13 đơn: khách lẻ không bên đặt / bên đặt không vai / công ty chủ; đại lý; vai được hưởng; dòng nhập tay; bản chụp thiếu mức; bản chụp có nhà cung cấp; đơn đã giao có / không nhà cung cấp; nháp; huỷ) — và chạy được trên D1 local bằng đúng cách chủ sẽ dán (`wrangler d1 execute … --local --command "<câu>"`, vòng `while read`). Sau lượt gieo: (a) 2 đơn / 2 dòng, (b1) 3 đơn / 4 dòng, (b1x) 1 dòng (IRESORT), (b2) 3 đơn / 4 dòng, (b3) 1 đơn, (e) 1 đơn / 1 dòng, (sau) 0 — đúng kỳ vọng; thêm điều khoản NHÓM có nhà cung cấp ⇒ (b1x) thêm dòng của mã thuộc nhóm; thêm điều khoản DỊCH VỤ do công ty bán cho mã đó ⇒ dòng ấy bị bỏ (dịch vụ riêng thắng nhóm).

### Kết quả câu đếm của chủ (CHƯA CÓ — chủ chạy trên production và dán vào đây trước ngày phát hành)
| Câu | Số đơn | Số dòng dịch vụ | Ghi chú |
|---|---|---|---|
| (a) | | | |
| (b1) | | | (b1) = 0 ⇒ bỏ `0112` và phần b1 của Task 6 (R-P5: chỉ quyết lúc gộp) |
| (b1x) | (danh sách mã đơn + mã dịch vụ) | | chuyển Kế toán |
| (b2) | | | |
| (b3) | | | |
| (e) | | | |
| (sau, SAU phát hành) | | số bản chụp bù | phải bằng số dòng dịch vụ của (b1) |

## Quan sát chặn thật
(mỗi hàng rào mới: phép đột biến cố ý → dòng đỏ → hoàn nguyên → ngày; dòng tương ứng ở `docs/SO-HANG-RAO.md`)
Task 0 không dựng hàng rào mới (spike R-1 không phải mã được giữ lại). Task 1 sẽ ghi vào đây.

| Hàng rào | Phép đột biến | Dòng đỏ quan sát được | Hoàn nguyên | Ngày |
|---|---|---|---|---|


## Nợ
- `MA_BAT_BUOC` trong `src/so-vang-so-dai-ly.test.ts` chưa liệt kê C-1…C-5 (Task 0 không giao sửa bài này), nên một ca C bị xoá khỏi JSON sẽ không làm bài đỏ. Task 11 (sửa chính tệp này) nên thêm năm mã vào `MA_BAT_BUOC` khi biến ca thành bài thật.
- Khối `so_cai` của C-1…C-5 chưa có bài lớp 1 kiểm tự cân (cộng giữ hộ, số dư, dòng khi «Đã giao» khớp nhau). Task 11 là nơi dùng nó; khi dùng thì thêm bài tự cân hoặc để bài sinh dòng so từng đồng.
- Spike `gross_snapshot` chưa thử trên D1 **remote** (cấm) và không đọc được số phiên bản SQLite của D1 local (D1 chặn `sqlite_version()`); chỗ này còn dựa vào việc local D1 (workerd) dùng cùng lõi SQLite với remote. Rủi ro đã giới hạn: migration lỗi lúc áp không được ghi là đã áp.
