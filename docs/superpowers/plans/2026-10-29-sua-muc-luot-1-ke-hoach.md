# Nút «Sửa» mức hoa hồng (ADR-0148 lượt 1 = Đ1) — Kế hoạch thi công

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development hoặc superpowers:executing-plans; mỗi task đỏ → xanh (superpowers:test-driven-development).

- **Ngày:** 29/10/2026. Người soạn: phiên lập kế hoạch `claude/pricing-age-discount-config-328499` (đã soạn ADR, KHÔNG thi công — P15/N8).
- **Nguồn chuẩn tắc:** `docs/adr/ADR-0148-nut-sua-muc-hoa-hong-va-gia-dai-ly.md` (accepted 29/10), phần Đ1 và «Tiêu chí nghiệm thu lượt 1». Hồ sơ đề xuất: `docs/superpowers/specs/2026-10-29-sua-muc-va-gia-dai-ly/DE-XUAT.md`.
- **Loại:** việc lớn (dữ liệu + tiền) ⇒ người kiểm độc lập chỉ đọc sau thi công (Task 7). Lượt 2 (Đ2 «Giá đại lý», Đ3 «đi cùng giá bán lẻ») KHÔNG thuộc kế hoạch này.
- **Trước khi bắt đầu:** grep `docs/quyen-hoan.json` tìm lỗ đang hở chạm `pricing` / `ord_service_terms`; có thì ghi «xây trên lỗ đang hở: <mã>» vào đầu nhật ký và dừng hỏi chủ.

## Sự thật đã kiểm khi soạn (main a6720431 + nhánh 4f56e87a)
1. Bản chụp `ord_service_terms` chỉ ghi `commission_rule_id`; **không** ghi gắn loại / gắn đối tác nào đã dùng (`migrations/0090_so_dai_ly_dot_1.sql`).
2. Ngày chụp luôn ≤ hôm nay: lệnh Xác nhận và Ghi mức tay dùng `vnToday(new Date())`; Chụp bù (`POST /api/orders/:id/chup-bu`) dùng ngày của `confirmed_at` (quá khứ). Trigger `ord_service_terms_rule_valid` đòi `valid_from_date <= captured_date` ⇒ **dòng bắt đầu sau hôm nay chắc chắn chưa có bản chụp** — ví dụ 2027→2028 của chủ đi đường này, không cần hỏi `orders`.
3. Lỗ có sẵn (2.40, không do 2.41): «Đổi» (`kiemDoi`, `src/modules/pricing/rules.ts`) cho đổi **từ hôm nay** dòng đã bắt đầu trước hôm nay ⇒ đơn xác nhận sáng nay theo dòng cũ có ngày chụp nằm ngoài khoảng ngày dòng cũ. «Ngừng» (`kiemNgayDong`) chỉ đòi ngày ≥ ngày bắt đầu ⇒ đóng lùi được qua ngày chụp. Task 4 vá cả hai theo cùng một luật ngày.
4. Thân trigger chỉ đọc bảng cùng module / view công bố của module được phụ thuộc (`src/architecture.test.ts`, ADR-0024 điều 5); `pricing` không phụ thuộc `orders` ⇒ trigger phía `pricing` **không** biết «đã chụp».
5. Câu đọc thô các bảng mức: `src/modules/pricing/repository.ts` (4 câu `prc_commission_rule`, 3 `prc_role_tier`, 3 `prc_party_tier`, 4 JOIN `_pax`), `scripts/audit-checks.mjs` (R-PRC-1..6). View phụ thuộc: `v_prc_commission_rule` (0090, dựng lại ở 0097; trigger `ord_service_terms_rule_valid` đọc nó), `v_prc_commission_rule_pax` (0116; trigger `ord_service_terms_pax_rule` đọc nó).

## Quyết định người soạn đã tự áp (an toàn, đảo ngược được — ghi lại để chủ biết, không chặn)
- **Q1 «Đã chụp» của dòng gắn** = có bản chụp AUTO nào trỏ một dòng mức có `target_tier_code` = chính sách của dòng gắn, `captured_date` trong khoảng ngày của dòng gắn (gắn đối tác: thêm `beneficiary_party_id` = hồ sơ). Thừa chứ không thiếu: có thể coi «đã chụp» khi thật ra chưa ⇒ chỉ mất đường huỷ hẳn, không mất dữ liệu. Không suy theo vai hiện tại (vai đổi được).
- **Q2 Ngày sớm nhất** cho phần sửa của dòng đã chụp: `X = max(hôm nay, ngày chụp gần nhất + 1, ngày bắt đầu dòng cũ + 1)`. Dòng cũ đóng ở `X − 1`. Hẹp hơn chữ «từ hôm nay» của ADR đúng một trường hợp: đã có đơn chụp hôm nay ⇒ từ ngày mai (giữ Hiến chương 5.6).
- **Q3 Một đường Sửa:** mỗi lần Sửa tạo đúng **một** dòng mới mang `replaces_id` → dòng cũ, kèm lý do. Dòng cũ hoặc bị **huỷ** (chưa chụp) hoặc bị **đóng / rút ngắn** ở `X − 1` (đã chụp). Chỉ rút ngắn mà không thêm dòng = «Ngừng» (mở cho cả dòng đã có ngày kết thúc), không bắt lý do như hôm nay.
- **Q4 Vá Đổi / Ngừng** theo Q2 (sự thật 3): hẹp lại, không thêm quyền.
- **Q5 Dòng huỷ–thay:** dòng mới bắt đầu ≥ hôm nay, hoặc đúng bằng ngày bắt đầu dòng cũ (giữ phần ngày đã qua cho Chụp bù). Dòng đã hết hạn (`valid_to < hôm nay`): Sửa từ chối «Mức này đã hết hạn».
- **Q6 Giao diện giữ «Đổi»** cạnh «Sửa»; gộp hay không để chủ quyết khi xem ảnh thật.
- **Q7 Cuộc đua** «hỏi đã chụp chưa» rồi mới huỷ (hai lệnh, `pricing` không đọc được `orders` trong cùng lô): một chiều do trigger `orders` chặn (chụp vào dòng đã huỷ), chiều kia **dựa vào bất biến R-PRC-7** (chụp ngay trước khi huỷ). Ghi đúng chữ này vào `docs/SO-HANG-RAO.md`.

## Tiêu chí nghiệm thu (ADR-0148 + bổ sung)
1. Ví dụ chủ: dòng 2027-01-01 → 2028-01-01 chưa có đơn ⇒ Sửa được số, cách tính, hai ngày; dòng cũ «đã huỷ», không bao giờ ra ở tra mức / chụp / Đối tác xem.
2. Dòng đã chụp: phần sửa áp từ `X` (Q2); đơn cũ giữ mức; làm được cả khi dòng cũ đã có ngày kết thúc.
3. Huỷ dòng đã chụp: máy chủ từ chối. CSDL chặn bản chụp mới trỏ dòng đã huỷ. R-PRC-7: mọi bản AUTO có `commission_rule_id` trỏ dòng **chưa huỷ** có khoảng ngày **chứa** `captured_date`. Mỗi lớp quan sát chặn thật (sửa cố ý → đỏ → hoàn nguyên).
4. Thiếu lý do (dưới 10 ký tự) ⇒ 400. Không có `partner.commission.write` hoặc mang quyền Đối tác ⇒ không thấy nút, gọi thẳng 403.
5. Cả ba loại dòng (mức, gắn loại, gắn đối tác) có Sửa. Đổi / Ngừng không còn tạo được bản chụp nằm ngoài khoảng ngày dòng của nó (Q4).

## Task 1 — Migration + bài CSDL
**Tệp:** `migrations/<số>_sua_muc_huy_thay.sql` (số = lớn nhất trên main + mọi nhánh chưa gộp + 1: `git branch -a --list 'claude/*'` rồi `git ls-tree --name-only <nhánh> migrations/`; 29/10 số 0125 đã có nhánh giữ). Bài mới `src/modules/pricing/sua-muc-csdl.test.ts` (dựng schema từ `migrations/*.sql` như `src/architecture.test.ts`).
- Ba bảng `prc_commission_rule`, `prc_role_tier`, `prc_party_tier`: `ADD COLUMN voided_at TEXT`, `voided_by TEXT`, `replaces_id TEXT REFERENCES <cùng bảng>(id)`, `change_reason TEXT CHECK (change_reason IS NULL OR length(trim(change_reason)) BETWEEN 10 AND 500)`.
- Thay `*_close_only` (DROP + CREATE) bằng luật: dòng đã huỷ không đổi gì nữa; chỉ được (a) `valid_to` NULL → ngày, (b) `valid_to` → ngày **sớm hơn** (≥ `valid_from`), (c) `voided_at` NULL → giờ kèm `voided_by`; mọi cột khác giữ nguyên.
- Thay `*_overlap`: bỏ qua dòng `voided_at IS NOT NULL`. Thêm `*_born_clean` (chèn mới không được mang `voided_at`) và `*_replaces_ok` (`replaces_id` trỏ dòng cùng đích + cùng phạm vi, đã huỷ hoặc kết thúc trước `NEW.valid_from_date`; có `replaces_id` thì phải có `change_reason`).
- Theo khuôn 0097 mục 5: DROP TRIGGER `ord_service_terms_rule_valid` → DROP VIEW `v_prc_commission_rule` → CREATE VIEW (thêm `WHERE voided_at IS NULL`, cột giữ nguyên thứ tự) → CREATE lại trigger nguyên văn. Grep mọi migration tìm thứ khác đọc hai view trước khi DROP. `v_prc_commission_rule_pax` giữ nguyên (bản chụp chính đã bị chặn trước).
- Không `date('now')` trong trigger: «hôm nay» là luật máy chủ (bẫy đồng hồ, xem `docs/CHANGE-GUIDE.md`).
- Bài đỏ trước: huỷ một lần được, lần hai bị chặn; kéo dài ngày kết thúc bị chặn; chèn chồng ngày với dòng đã huỷ được; chèn chồng với dòng chưa huỷ bị chặn; bản chụp AUTO trỏ dòng đã huỷ bị `terms_rule_stale`; `replaces_id` sai đích bị chặn.
- `docs/data-dictionary.json` + `npm run dict`; `src/migrations-n1.test.ts` nếu nhận theo tên.

## Task 2 — Phân loại mọi câu đọc + R-PRC-7
- Mỗi câu ở sự thật 5 (và `rules.ts` nếu có câu SQL) gắn nhãn **tra** (loại dòng huỷ: `MUC_NGAY`, câu chọn mức cho chụp, tra thử, DTO Đối tác) hoặc **lịch sử** (giữ, trả thêm `daHuy`, `thayCho`). Grep lại toàn `src/` + `scripts/` cả chuỗi ghép.
- R-PRC-1 / 2 / 5: bỏ qua dòng huỷ (dòng huỷ không có ngày kết thúc sẽ báo giả). Thêm **R-PRC-7** (tiêu chí 3) và bài tự kiểm bộ bắt (chèn tay một bản lệch → đỏ).
- Trước khi gộp: phải biết production có sẵn bản lệch do lỗ ở sự thật 3 chưa — chạy `node scripts/audit-invariants.mjs --db remote` (chỉ đọc) nếu hàng rào cho; bị chặn thì đưa nguyên lệnh cho chủ. Có bản lệch ⇒ dừng, trình chủ (không tự nới R-PRC-7).

## Task 3 — Hàm tiêm «ngày chụp gần nhất»
- `orders` công bố `ngayChupGanNhat(db, q)` với `q = { loai: "MUC", ruleId } | { loai: "GAN", tierCode, tu, den, partyId? }` ⇒ `string | null` (MỘT câu `MAX(captured_date)` trên `ord_service_terms` JOIN `v_prc_commission_rule`; chỉ `source = 'AUTO'`). Q1 cho dạng `GAN`.
- Nối: `APP_OPTIONS.injected` ở `src/index.ts`, `Ctx` ở `src/shared/router.ts` (khuôn `isAssigned` / `benDatCuaToi`); khung thử `taoAppChoKhungThu` có giá trị mặc định đi đường thật.
- Siết `src/architecture.test.ts`: chỉ `src/index.ts` và `src/modules/orders` nhắc tên hàm (khuôn bài ADR-0049 D2). Quan sát đỏ một lần.

## Task 4 — Luật thuần + route
- `rules.ts`: `ngaySomNhat({ homNay, ngayChup, validFrom })` (Q2) và `kiemSua(...)` ⇒ `{ duong: "HUY_THAY", ... } | { duong: "TU_NGAY", denNgayCu, tuNgay, ... } | lỗi` theo Q3, Q5. Bài thuần đỏ trước: ví dụ chủ; dòng bắt đầu hôm nay; đã chụp hôm nay; dòng đã có ngày kết thúc; dòng hết hạn; lý do thiếu.
- Route mới (cổng `office`, `can(…write)`, `holdsPartner` ⇒ 403, MỘT lô `chayLo`: câu dữ liệu → `auditStatement(…, "changes() > 0")` như route «Đổi»): `GET /api/pricing/hoa-hong/:id/sua` (xem trước: đường + ngày sớm nhất), `POST /api/pricing/hoa-hong/:id/sua`; cùng cặp cho `muc-ta/gan/:id/sua` và `ho-so/muc-rieng/:id/sua`. Thứ tự lô: cập nhật dòng cũ (huỷ / đóng) → chèn dòng mới → chèn dòng `_pax` (nếu tách loại khách) → nhật ký. Lý do lưu ở `change_reason` dòng mới; nhật ký không chép lý do.
- Mã hành động nhật ký: dùng lại `prc_commission_rule_closed` / `_added`; cần mã «huỷ» mới thì thêm vào `src/shared/audit-actions.ts` có bài.
- Vá «Đổi» và «Ngừng» (cả ba loại dòng) theo Q2 / Q4; «Ngừng» mở cho dòng có ngày kết thúc (chỉ rút ngắn). Câu báo cũ «vừa được đóng — tải lại» chỉ còn cho cuộc đua thật.
- Bài route (`sua-muc-route.test.ts`, khung thử `tests/audit/harness.mjs`): tiêu chí 1–5; tiêm giả `ngayChupGanNhat` cho ca «đã chụp», cộng MỘT ca đi đường thật (xác nhận đơn rồi Sửa).

## Task 5 — Giao diện
- `src/shared/hoa-hong-hien-thi.ts`: nút «Sửa» cạnh «Đổi» / «Ngừng» (`nutDoiNgung`), ẩn theo `can(…write)`; dòng đã huỷ hiện ở lịch sử «Đã huỷ — thay bằng dòng khác», không nút.
- `web/hoa-hong-hop.ts`: hộp Sửa dùng lại `dungCachTinh`, điền sẵn số cũ, gọi GET xem trước rồi hiện một câu: «Chưa có đơn nào dùng mức này — sửa sẽ thay hẳn» hoặc «Đã có đơn dùng mức này — phần sửa áp từ ngày …; đơn cũ giữ mức cũ». Ô lý do bắt buộc. Ô tích theo lớp `o-tick` (bài `src/o-tich-trong-nhan.test.ts`).
- Chữ theo `web/CLAUDE.md`, không `innerHTML`, ô gõ 16px; kiểm trần gói ở `src/goi-trang-nhe.test.ts` (trang Đơn hàng đang sát trần — không nới).
- Kịch bản `docs/evidence/2026-10-26-hoa-hong-thiet-ke-lai/kich-ban/hoa-hong-smoke.mjs`: thêm bước Sửa (đường huỷ–thay với dòng 2027) chụp hai khổ + axe (`AXE_JS`). Ảnh mới vào thư mục bằng chứng **mới** có ngày, không ghi đè ảnh cũ.

## Task 6 — Tài liệu, e2e, bộ kiểm dài (chạy MỘT lần)
- e2e mới `tests/e2e/sua-muc.mjs` (đăng nhập qua `login()` của `tests/e2e/lib.mjs`): ví dụ chủ; xác nhận đơn rồi Sửa; Đối tác không thấy dòng huỷ.
- `src/shared/changelog.ts` (mục mới, số tạm sau 2.41), `docs/CHANGE-GUIDE.md` (công thức mức hoa hồng), `docs/SYSTEM-DESIGN.md` §5, `docs/SO-HANG-RAO.md` (mỗi hàng rào mới + ngày quan sát; Q7 ghi «dựa vào bất biến»).
- Cuối: `npm test`, `npm run typecheck` (0 lỗi), `npm run test:e2e`, kịch bản Chrome — mỗi thứ một lần; đỏ thì nêu tên bài, không nói xong.

## Task 7 — Người kiểm độc lập (phiên hoặc subagent `nguoi-kiem-doc-lap`, chỉ đọc)
Đọc mã thật, chạy lại bộ kiểm, đối từng tiêu chí 1–5 và Q1–Q7; thử phá mỗi trigger mới một lần trên CSDL tạm. Chỉ báo «đạt» dựa trên báo cáo này + test.

## Không thuộc kế hoạch
Đ2, Đ3 (lượt 2, chờ ca mẫu Kế toán); dựng lại đơn cũ bị chụp sai (ADR Đ1.3, nợ có tên); gộp nút «Đổi» vào «Sửa» (Q6); triển khai (chủ chạy `npm run day-len` rồi `npm run trien-khai`).
