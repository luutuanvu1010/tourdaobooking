# Nút «Sửa» mức hoa hồng (ADR-0148 lượt 1) — Sổ điều phối thi công

- **Kế hoạch:** `docs/superpowers/plans/2026-10-29-sua-muc-luot-1-ke-hoach.md` (7 task). Nguồn chuẩn tắc: `docs/adr/ADR-0148-nut-sua-muc-hoa-hong-va-gia-dai-ly.md` (accepted 29/10).
- **Phiên thi công:** nhánh `claude/recursing-kilby-af8ebc` (dựng trên `claude/pricing-age-discount-config-328499` 11088c75, rồi nhập `main` 195e9d3e = bản 2.42 TNV-G1). Vai: THI CÔNG, không tự nghiệm thu (Task 7 = người kiểm độc lập chỉ đọc).
- **Xây trên lỗ đang hở:** không. `docs/quyen-hoan.json` 29/10 có 6 mục (TNV-G1/G3/G4, HC-5.19, HC-5.11, HC-4.2) — không mục nào chạm `pricing` / `ord_service_terms`.
- **Số đã lấy lúc thi công:** migration `0126` (main lớn nhất 0125; không nhánh `claude/*` / worktree nào giữ 0126). Phiên bản tạm `2.43` (main 2.42).

## Kiểm production trước khi gộp (Task 2, điều kiện dừng (b))
- 29/10, trước khi có cột huỷ: thêm R-PRC-7 bản **chỉ xét ngày** (commit 4c1ce331) rồi chạy `node scripts/audit-invariants.mjs --db remote` (hàng rào cho chạy). Kết quả: `✓ R-PRC-7`, «Mọi bất biến đạt, 5 cảnh báo». ⇒ production **không** có bản chụp lệch khoảng ngày do lỗ «Đổi / Ngừng» của 2.40; không cần hỏi chủ.
- Sau khi R-PRC-7 thêm vế «dòng chưa huỷ», chạy remote sẽ thoát 2 tới khi 0126 được áp — đúng thứ tự của `npm run trien-khai` (kiểm dữ liệu chạy SAU migration).

## Task 1 — Migration + bài CSDL (xong)
- `migrations/0126_sua_muc_huy_thay.sql`: bốn cột mỗi bảng; `*_close_only` thay bằng luật «đóng / rút ngắn / huỷ một lần»; `*_overlap` bỏ qua dòng huỷ; thêm `*_born_clean`, `*_replaces_ok`; view `v_prc_commission_rule` thêm `WHERE voided_at IS NULL` (cột giữ thứ tự), trigger `ord_service_terms_rule_valid` tạo lại nguyên văn.
- Bài `src/modules/pricing/sua-muc-csdl.test.ts` (7 bài): đỏ 7/7 trước migration, xanh sau.
- Quan sát chặn thật (P16, 29/10): phá cố ý từng chỗ trên tệp migration → bài đỏ → hoàn nguyên → xanh 7/7: (1) view bỏ `WHERE voided_at IS NULL` → bài 7 đỏ; (2) close_only bỏ khoá dòng đã huỷ → bài 2 đỏ; (3) chồng ngày không bỏ dòng huỷ → bài 4, 5 đỏ; (4) gỡ born_clean → bài 4 đỏ; (5) gỡ replaces_ok của mức → bài 5 đỏ; (6) close_only cho kéo dài → bài 3 đỏ.
- `src/migrations-dung-lai-muc.test.ts`: loại 0126 khỏi bước «trước 0097» (khuôn loại 0116 sẵn có) — 0126 đọc cột `target_tier_code` do 0097 thêm; production luôn áp 0126 sau 0097.
- `docs/data-dictionary.json` (+ `npm run dict`): 12 cột mới, `change_reason` xếp N2 như `note` (chữ tự do).

## Quyết định thi công tự áp (bề mặt / an toàn, ghi lại để chủ biết)
- **T-1** Route Sửa của gắn đối tác là `POST /api/pricing/muc-rieng/:id/sua` (khớp route «Ngừng» sẵn có `/api/pricing/muc-rieng/:id/ket-thuc`), không phải `ho-so/muc-rieng/:id/sua` như chữ kế hoạch.
- **T-2** Có dòng cũ ⇔ có lý do (cả hai chiều, trigger `*_replaces_ok`) — chặt hơn chữ kế hoạch («có `replaces_id` thì phải có lý do»).
- **T-3** «Đã chụp» (`ngayChupGanNhat`) đếm MỌI bản chụp có `commission_rule_id`, cả bản MANUAL (ghi tay chỉ đổi người bán chép mã dòng của bản trước — `apGhiTay`) và bản đã bị thay: thừa chứ không thiếu (Q1). R-PRC-7 chỉ xét bản AUTO (ngày chụp của bản MANUAL là ngày ghi tay).

## Task 2 — Phân loại câu đọc + R-PRC-7 (xong, commit e1173b66)
- Câu **tra** (chọn mức, thử tra, bản chụp, khối hồ sơ) lọc `voided_at IS NULL`; câu **lịch sử** (bảng mức, danh sách gắn) giữ dòng huỷ, xếp dòng huỷ cuối, DTO thêm `daHuy`, `thayCho`, `lyDoSua`. Khoá lạc quan của câu đóng / huỷ: `valid_to_date IS <ngày đã đọc>`.
- R-PRC-1 / 2 / 5 bỏ dòng huỷ; R-PRC-7 đủ hai vế (dòng chưa huỷ + khoảng ngày chứa ngày chụp). Bài `src/audit-invariants.test.ts` (ca đỏ đi đường trigger cho phép).

## Task 3 — Hàm tiêm «ngày chụp gần nhất» (xong, commit ce14982c)
- `orders` công bố `ngayChupGanNhat`; gốc lắp ráp tiêm `ctx.hoiDaChup`; vắng ⇒ route trả 503 `chua_kiem_chup` (từ chối kín). Khung thử: `khongTiemDaChup`, `ngayChupGia`.
- Siết `src/architecture.test.ts`: chỉ `src/index.ts` + `src/modules/orders` nhắc tên hàm. Quan sát đỏ 29/10 (thêm tên vào `pricing/rules.ts` → đỏ → hoàn nguyên).

## Task 4 — Luật thuần + route (xong)
- `rules.ts`: `ngaySomNhat` (Q2), `xemTruocSua`, `kiemSua` (Q3, Q5), `docLyDoSua` (10–300 ký tự, cấm dãy số dài), `kiemNgung` (Q4), `kiemDoi` thêm `ngayChup`. Bài thuần `sua-muc.test.ts` 9 bài.
- Sáu route mới (GET xem trước + POST Sửa) cho dòng mức, gắn loại (`/api/pricing/muc-ta/gan/:id/sua`), gắn đối tác (`/api/pricing/muc-rieng/:id/sua`, T-1). Bài `sua-muc-route.test.ts` 10 bài (tiêu chí 1–5; đường thật ở cả ba loại dòng; `ngayChupGia` chỉ cho ca dòng có ngày kết thúc đã có đơn; `khongTiemDaChup` ⇒ 503 ở Sửa / Đổi / Ngừng).
- Quan sát chặn thật (P16, 29/10): (1) bỏ `voided_at IS NULL` ở câu tra mức (`MUC_NGAY`) → bài 1, 2 đỏ; (2) route Sửa dòng mức truyền `ngayChup: null` → bài 3, 4 đỏ; hoàn nguyên → xanh 10/10.
- Bài cũ sửa cho khớp luật mới (không nới): ba bài «đóng lần hai ⇒ 409» thành 400 câu «phải sớm hơn» / «đã hết hạn» (kế hoạch Task 4: 409 «vừa được đóng» chỉ còn cho cuộc đua thật); ca vàng N-13 / SV-TA-03 và N-12 đóng dòng / gắn tới hôm qua NGAY sau khi đơn chụp hôm nay — đúng lỗ đang vá — nay chạy trên đồng hồ giả, việc đóng sang ngày hôm sau (ý ca vàng giữ: A 10%, B 240.000đ, C 15%, A và B giữ nguyên). Ba bài chung thêm sáu route: ảnh chụp mức truy cập (386 → 392), số route ghi qua lớp vé (230 → 233), bài «số lạ» (bảng điền dòng mức B + gắn loại; gắn riêng gọi mã lạ, có lý do miễn).

## Quyết định thi công tự áp (tiếp)
- **T-4** «Ngừng»: dòng chưa có đơn chụp giữ sàn cũ (≥ ngày bắt đầu); dòng đã chụp sàn = `X − 1` (Q2); dòng đã có ngày kết thúc chỉ rút ngắn, và chỉ khi ngày kết thúc **chưa qua** (ADR Đ1.3 «rút ngắn ngày kết thúc chưa qua») — dòng đã hết hạn ⇒ 400 «Mức này đã hết hạn nên không ngừng được.». Ngừng lần hai cùng ngày (tuần tự) ⇒ 400.
- **T-5** Mã nhật ký mới `prc_commission_rule_voided`, `prc_role_tier_voided`, `prc_party_tier_voided` (có nhãn, ẩn với Đối tác ở cả hai danh sách lịch sử). Sửa đường «từ ngày» dùng lại `_closed` + `_added` / `_set`. Chi tiết nhật ký không chép lý do.
- **T-6** GET xem trước đòi ô `partner.commission.write` (không phải `view`): chỉ hộp Sửa dùng.
- **T-7** Thân Sửa dòng mức = thân «Đổi» + `lyDo` (không đổi đối tượng / phạm vi — muốn đổi thì Thêm). Thân Sửa gắn = `{ muc, tuNgay, denNgay?, lyDo }` (đích loại / hồ sơ giữ nguyên).

## Nợ có tên (không sửa trong lượt này)
- **NO-1** Điều khoản nhà cung cấp (`prc_supply_term`) «Ngừng» vẫn đóng lùi được qua ngày chụp (giá vốn) — ADR-0148 không phủ; R-PRC-7 chỉ canh hoa hồng.
- **NO-2** Đơn đã xác nhận nhưng chưa có bản chụp (chờ «Chụp bù») không được tính «đã chụp» ⇒ Sửa huỷ–thay được dòng; Chụp bù sau đó theo dòng mới (Q5 giữ ngày bắt đầu cũ nên phần ngày đã qua vẫn có mức) hoặc báo thiếu mức — không ra số sai.
- **NO-3** «Đã chụp» của gắn (Q1) JOIN view `v_prc_commission_rule` (chỉ dòng chưa huỷ) ⇒ bản chụp trên dòng mức đã huỷ không được đếm — chỉ xảy ra qua cuộc đua Q7 (R-PRC-7 bắt).
- **NO-4** Gắn đối tác đã huỷ không hiện ở khối hồ sơ (câu khối hồ sơ là câu tra) — chưa có chỗ xem lịch sử gắn riêng.
- **NO-5** Hộp «Ngừng» trên giao diện vẫn cho chọn từ ngày bắt đầu; máy chủ chặn và báo câu có ngày sớm nhất.
