-- Migration 0111 — SỔ ĐẠI LÝ ĐỢT 2, lớp CSDL (ADR-0079 điều 2, 5, 6; ADR-0078 điều 7, 9; ADR-0132; đặc tả docs/superpowers/specs/2026-10-18-so-dai-ly-dot-2/
-- README.md P1, P3, P4, P10 và trang-ghep.md). Module `billing` (tiền tố bil_) cộng MỘT view công bố của `orders`. Chỉ THÊM dòng tra cứu, một cột, một chỉ mục, view,
-- trigger và mốc kiểm; SÁU đối tượng cũ được TẠO LẠI cùng tên (DROP + CREATE, khuôn 0099) — mỗi cái chép nguyên định nghĩa của migration SỐ LỚN NHẤT đang tạo nó
-- và chỉ đổi đúng phần ghi ở chú thích ngay trên (Ruling R-P2 của sổ thi công). Không đổi dữ liệu cũ.
-- Thân trigger chỉ đọc bảng bil_ và view công bố (v_ord_terms_missing, v_ord_terms_uncaptured, v_pty_owner_company) — ADR-0024 điều 5. Câu báo lỗi có tiền tố mã
-- (`delivered_terms:`, `commercial_*:`…) — máy chủ dịch sang lời thường (`loiTrigger`), không lộ mã thô.
-- Số 0111 là số TẠM: lúc gộp kiểm `ls migrations` và `git ls-tree --name-only <nhánh> migrations/` của mọi nhánh chưa gộp.

-- ===== (1) Bảng tra cứu (tập mở — ADR-0003 điều 3) =====================================================================================================
-- Ba loại dòng thương mại của phiếu «Đã giao» (ADR-0079 điều 2, phương án A — C1 = A): Tour Đảo nợ người hưởng (hoa hồng); người hưởng nợ Tour Đảo (giảm giá
-- bên đặt chịu = Σ thành tiền trước giảm − phải thu đã chụp, tức `gross_snapshot − due_snapshot`); Tour Đảo nợ nhà cung cấp (giá vốn).
INSERT INTO bil_debt_kind (code, name, sort_order, active) VALUES
  ('HOA_HONG', 'Hoa hồng', 4, 1), ('GIAM_GIA_BEN_DAT', 'Giảm giá bên đặt chịu', 5, 1), ('GIA_VON', 'Giá vốn nhà cung cấp', 6, 1);
-- Phiếu «Bên kia đã nhận» (ADR-0132 điều 2): phiếu MỘT đơn — Kế toán xác nhận khoản khách trả cho bên đặt / tại quầy nhà cung cấp ⇒ dấu CONFIRMED + một dòng giữ hộ
-- bên kia → Tour Đảo trong cùng lô.
INSERT INTO bil_posting_kind (code, name, sort_order, active) VALUES ('COUNTERPARTY_CONFIRMED', 'Bên kia đã nhận', 10, 1);
-- Người thu «Nhà cung cấp» dùng từ đợt 2 (ADR-0078 điều 7, 9; 0045 gieo active = 0 chờ lượt này).
UPDATE bil_collector_role SET active = 1 WHERE code = 'SUPPLIER';

-- ===== (2) Thành tiền trước giảm chụp lúc «Đã giao» (ADR-0079 điều 6, C10 = A; Ruling R-1 của sổ thi công) =============================================
-- CHECK chỉ nói «có thì chỉ ở phiếu Đã giao và không âm». KHÔNG có lớp CSDL nào đòi phiếu Đã giao MỚI phải mang cột này (Ruling R-P8): sau `wrangler rollback`, Worker
-- cũ ghi phiếu Đã giao không có cột ⇒ chặn NULL sẽ làm hỏng mọi «Đã giao» (đường lùi của đặc tả §5). Phiếu Đã giao cũ (lượt 1) và phiếu bổ sung của M1 vốn NULL.
-- Vế «phiếu mới phải có»: mã lô «Đã giao» luôn ghi (Task 4) + kiểm định kỳ phiếu sau mốc mà NULL (Task 10).
ALTER TABLE bil_posting ADD COLUMN gross_snapshot INTEGER CHECK (gross_snapshot IS NULL OR (kind_code = 'DELIVERED' AND gross_snapshot >= 0));

-- ===== (3) View công bố của `orders`: dòng dịch vụ CHƯA CÓ bản chụp thương mại (đặc tả P1 «lệch cần biết») ============================================
-- `v_ord_terms_missing` (0090) chỉ liệt kê đơn có bản chụp hiện hành thiếu mức; đơn xác nhận trước 0090 không có bản chụp nào nên không nằm ở đó. Bản chụp chỉ-thêm,
-- thay nhau bằng `supersedes_id` ⇒ «chưa có bản chụp hiện hành» = «chưa có dòng bản chụp nào». Chỉ khoá (đơn, dòng dịch vụ), không tên, không tiền.
CREATE VIEW v_ord_terms_uncaptured AS
  SELECT s.order_id AS order_id, s.id AS order_service_id
  FROM order_service s JOIN orders o ON o.id = s.order_id
  WHERE o.status = 'confirmed'
    AND NOT EXISTS (SELECT 1 FROM ord_service_terms t WHERE t.order_service_id = s.id);

-- ===== (4) Lớp 2 chặn «Đã giao» thiếu bản chụp (ADR-0079 điều 5; đặc tả P1) ==============================================================================
-- Lớp 1 là câu ghi «Đã giao» của `orders` (`DAT_GIAO_DIEU_KIEN`, Task 4). Lớp này canh SQL chạy tay và lô ghi chen giữa: đơn còn dòng chưa chụp, hoặc bản chụp hiện
-- hành thiếu mức hoa hồng / thiếu người bán (gồm dòng nhập tay chưa được Kế toán ghi tay người bán — A-14) ⇒ cả lô huỷ. Máy chủ dịch mã ra lý do giữ `terms_missing`.
CREATE TRIGGER bil_posting_delivered_terms BEFORE INSERT ON bil_posting
WHEN NEW.kind_code = 'DELIVERED' AND (
  EXISTS (SELECT 1 FROM v_ord_terms_missing m WHERE m.order_id = NEW.order_id)
  OR EXISTS (SELECT 1 FROM v_ord_terms_uncaptured u WHERE u.order_id = NEW.order_id))
BEGIN SELECT RAISE(ABORT, 'delivered_terms: đơn còn dịch vụ chưa chụp mức hoặc thiếu mức hoa hồng / người bán — Kế toán xử lý'); END;

-- ===== (5) Lưới số thương mại trên dòng nợ (ADR-0079 điều 6 (i)–(iv); lệch có chủ ý L-C1 thu hẹp) =========================================================
-- (i) dòng HOA_HONG / GIA_VON GỐC của phiếu «Đã giao» bắt buộc gắn dòng dịch vụ; mỗi (phiếu, dòng dịch vụ) tối đa MỘT HOA_HONG và MỘT GIA_VON. Dòng đảo
-- (buộc đổi chỗ hai bên — 0045 `bil_debt_line_reversal_match`) và dòng của phiếu điều chỉnh (gắn hoặc không gắn dòng dịch vụ — ví dụ D-3, bổ sung giá vốn M1 = A) miễn.
CREATE UNIQUE INDEX bil_debt_line_one_commercial ON bil_debt_line(posting_id, order_service_id, kind_code)
  WHERE kind_code IN ('HOA_HONG', 'GIA_VON') AND reverses_line_id IS NULL;
CREATE TRIGGER bil_debt_line_commercial_service BEFORE INSERT ON bil_debt_line
WHEN NEW.kind_code IN ('HOA_HONG', 'GIA_VON') AND NEW.reverses_line_id IS NULL AND NEW.order_service_id IS NULL
  AND EXISTS (SELECT 1 FROM bil_posting p WHERE p.id = NEW.posting_id AND p.kind_code = 'DELIVERED')
BEGIN SELECT RAISE(ABORT, 'commercial_service_required: dòng hoa hồng / giá vốn của phiếu Đã giao phải gắn một dòng dịch vụ'); END;
-- Phạm vi của (ii)–(iv): chỉ dòng GỐC thuộc phiếu «Đã giao» có `gross_snapshot` (phiếu tạo sau bản này). Miễn: dòng đảo, mọi dòng của phiếu điều chỉnh, phiếu «Đã giao»
-- cũ (`gross_snapshot` NULL). Số đúng tỷ lệ từng dòng và «mỗi dòng ≤ thành tiền dòng đó» chỉ ở mã (hàm duy nhất) + sổ vàng + R-BIL-2 (ADR-0079 điều 6).
-- (ii) chiều đúng: HOA_HONG, GIA_VON có bên nợ = công ty chủ; GIAM_GIA_BEN_DAT có bên được nợ = công ty chủ.
CREATE TRIGGER bil_debt_line_commercial_direction BEFORE INSERT ON bil_debt_line
WHEN NEW.reverses_line_id IS NULL AND NEW.kind_code IN ('HOA_HONG', 'GIA_VON', 'GIAM_GIA_BEN_DAT')
  AND EXISTS (SELECT 1 FROM bil_posting p WHERE p.id = NEW.posting_id AND p.kind_code = 'DELIVERED' AND p.gross_snapshot IS NOT NULL)
  AND (CASE WHEN NEW.kind_code = 'GIAM_GIA_BEN_DAT' THEN NEW.creditor_party_id ELSE NEW.debtor_party_id END) NOT IN (SELECT party_id FROM v_pty_owner_company)
BEGIN SELECT RAISE(ABORT, 'commercial_wrong_direction: hoa hồng / giá vốn do Tour Đảo nợ, giảm giá bên đặt chịu là khoản nợ Tour Đảo'); END;
-- (iii) cộng dồn HOA_HONG + GIA_VON GỐC trên một phiếu «Đã giao» ≤ `gross_snapshot` (không tính dòng đảo). Vi phạm gần như chỉ do cấu hình sai (mức + a% vượt giá
-- bán) — route kiểm trước và trả lý do giữ `terms_exceed_price`; trigger là lưới cuối.
CREATE TRIGGER bil_debt_line_commercial_gross BEFORE INSERT ON bil_debt_line
WHEN NEW.reverses_line_id IS NULL AND NEW.kind_code IN ('HOA_HONG', 'GIA_VON')
  AND EXISTS (SELECT 1 FROM bil_posting p WHERE p.id = NEW.posting_id AND p.kind_code = 'DELIVERED' AND p.gross_snapshot IS NOT NULL
    AND NEW.amount + COALESCE((SELECT SUM(l.amount) FROM bil_debt_line l WHERE l.posting_id = p.id AND l.reverses_line_id IS NULL
                                AND l.kind_code IN ('HOA_HONG', 'GIA_VON')), 0) > p.gross_snapshot)
BEGIN SELECT RAISE(ABORT, 'commercial_exceeds_gross: tổng hoa hồng và giá vốn vượt thành tiền trước giảm của đơn'); END;
-- (iv) GIAM_GIA_BEN_DAT GỐC = `gross_snapshot − due_snapshot` đúng từng đồng (giảm giá cấp đơn là phần chênh duy nhất giữa hai số). «Đơn có người hưởng và giảm giá > 0
-- thì PHẢI có dòng này» không có trigger (trigger trên dòng không biết lô đã chèn xong) — chỉ mã + kiểm định kỳ R-BIL-16 canh (lệch L-C1).
CREATE TRIGGER bil_debt_line_commercial_discount BEFORE INSERT ON bil_debt_line
WHEN NEW.reverses_line_id IS NULL AND NEW.kind_code = 'GIAM_GIA_BEN_DAT'
  AND EXISTS (SELECT 1 FROM bil_posting p WHERE p.id = NEW.posting_id AND p.kind_code = 'DELIVERED' AND p.gross_snapshot IS NOT NULL
    AND NEW.amount IS NOT p.gross_snapshot - p.due_snapshot)
BEGIN SELECT RAISE(ABORT, 'commercial_discount_mismatch: giảm giá bên đặt chịu phải bằng thành tiền trước giảm trừ phải thu đã chụp'); END;

-- ===== (6) Phiếu một đơn nhận loại mới — TẠO LẠI `bil_posting_order_required` (nguồn: 0045; chỉ thêm 'COUNTERPARTY_CONFIRMED' vào danh sách) ================
DROP TRIGGER bil_posting_order_required;
CREATE TRIGGER bil_posting_order_required BEFORE INSERT ON bil_posting
WHEN NEW.kind_code IN ('DELIVERED', 'COMPLETED', 'RECEIPT', 'REFUND', 'COMPANY_RECEIVED', 'COUNTERPARTY_CONFIRMED') AND NEW.order_id IS NULL
BEGIN SELECT RAISE(ABORT, 'bil_order_required: phiếu loại này phải gắn một đơn'); END;

-- ===== (7) Hàng rào «một dòng giữ hộ chỉ tất toán một lần» không đếm dòng thương mại — TẠO LẠI `bil_debt_line_held_once` (nguồn: 0080; đặc tả P10, chủ duyệt
-- ở quyết định 3 ngày 2026-10-18) ======================================================================================================================
-- Đổi DUY NHẤT: tổng số dư của cặp chỉ cộng dòng `kind_code IN ('HELD', 'SETTLEMENT', 'REFUND')` — đúng ba loại hàng rào vốn canh (kể cả dòng đảo của chúng: dòng
-- đảo mang cùng loại với dòng gốc). Dòng HOA_HONG / GIAM_GIA_BEN_DAT / GIA_VON không kéo số «còn nợ» xuống, nên «Thay lần thu» đổi người thu khỏi đại lý (C-1) / quầy
-- nhà cung cấp (SV-HT-03) và «Công ty đã nhận» cho khoản đại lý tự khai không bị chặn nhầm; ca KT04 (đã «Nộp» rồi đảo) vẫn bị chặn. Trên dữ liệu trước bản này (chỉ có
-- ba loại đó) chạy y hệt. HAI NƠI: hàm TS `soDuGiuHo` (Task 5 — `khoanChoXacNhan`, kiểm trước «Công ty đã nhận») phải dùng ĐÚNG tập ba loại này (bài «hai nơi»).
-- `settlement_no_flip`, đường điều chỉnh và `soDuCap` ở chỗ khác giữ cộng MỌI loại (số nợ ròng thật). Mọi điều kiện khác giữ nguyên chữ 0080.
DROP TRIGGER bil_debt_line_held_once;
CREATE TRIGGER bil_debt_line_held_once BEFORE INSERT ON bil_debt_line
WHEN NEW.reverses_line_id IS NOT NULL AND NEW.kind_code = 'HELD' AND EXISTS (
  SELECT 1 FROM bil_debt_line g WHERE g.id = NEW.reverses_line_id AND g.order_id IS NOT NULL
    -- chỉ dòng giữ hộ GỐC chưa bị đảo (đảo lần hai / đảo dòng đảo để chỉ mục UNIQUE và trigger bil_reversal của 0045 báo đúng lỗi của chúng)
    AND g.reverses_line_id IS NULL AND NOT EXISTS (SELECT 1 FROM bil_debt_line x WHERE x.reverses_line_id = g.id)
    AND (SELECT COALESCE(SUM(CASE WHEN l.debtor_party_id = g.debtor_party_id THEN l.amount ELSE -l.amount END), 0) FROM bil_debt_line l
         WHERE l.order_id = g.order_id AND l.kind_code IN ('HELD', 'SETTLEMENT', 'REFUND') AND ((l.debtor_party_id = g.debtor_party_id AND l.creditor_party_id = g.creditor_party_id)
                                         OR (l.debtor_party_id = g.creditor_party_id AND l.creditor_party_id = g.debtor_party_id))) < g.amount)
BEGIN SELECT RAISE(ABORT, 'held_already_settled: dòng giữ hộ đã được tất toán (ghi nộp) — đảo lần nộp trước'); END;

-- ===== (8) Dấu đối chiếu nhận người thu bên đặt / nhà cung cấp (ADR-0132 điều 1, 4) — TẠO LẠI hai trigger của 0099 =====================================
-- `bil_receipt_recon_declared` (nguồn: 0099): DECLARED nhận thêm lần thu người thu `BOOKER` / `SUPPLIER` ở MỌI hình thức (khách đưa tiền cho bên kia — người khai
-- không cầm đồng nào). Công ty thu vẫn chỉ chuyển khoản (tiền mặt Công ty thu giữ luật giữ hộ cũ — chủ chốt 15/10). Câu báo nói thêm loại mới; tiền tố mã giữ nguyên.
DROP TRIGGER bil_receipt_recon_declared;
CREATE TRIGGER bil_receipt_recon_declared BEFORE INSERT ON bil_receipt_recon
WHEN NEW.kind_code = 'DECLARED' AND NOT EXISTS (
  SELECT 1 FROM bil_payment_receipt r WHERE r.id = NEW.receipt_id AND r.kind_code = 'CUSTOMER_PAYMENT' AND r.reverses_id IS NULL AND r.transfer_of_id IS NULL
    AND ((r.collector_role_code = 'COMPANY' AND r.method_code = 'BANK_TRANSFER') OR r.collector_role_code IN ('BOOKER', 'SUPPLIER')))
BEGIN SELECT RAISE(ABORT, 'recon_receipt_invalid: chỉ đánh dấu đối chiếu cho lần thu chuyển khoản “Công ty thu” của khách, hoặc khoản khách trả cho bên đặt / tại quầy nhà cung cấp'); END;
-- `bil_receipt_recon_confirmed_txn` (nguồn: 0099): mã giao dịch ngân hàng CHỈ đòi cho người thu Công ty — tiền vào tài khoản của đại lý / nhà cung cấp nên công ty
-- không có mã; Kế toán đối chiếu với bên kia ngoài Nền tảng (ADR-0132 điều 4, tiêu chí 4).
DROP TRIGGER bil_receipt_recon_confirmed_txn;
CREATE TRIGGER bil_receipt_recon_confirmed_txn BEFORE INSERT ON bil_receipt_recon
WHEN NEW.kind_code = 'CONFIRMED'
  AND EXISTS (SELECT 1 FROM bil_payment_receipt r WHERE r.id = NEW.receipt_id AND r.collector_role_code = 'COMPANY' AND r.method_code = 'BANK_TRANSFER'
    AND r.created_at >= (SELECT cutoff_at FROM bil_audit_cutoff WHERE code = 'R-BIL-D6'))
  AND NOT EXISTS (SELECT 1 FROM bil_receipt_bank_txn t WHERE t.receipt_id = NEW.receipt_id)
BEGIN SELECT RAISE(ABORT, 'bank_txn_required: xác nhận khoản chuyển khoản cần mã giao dịch ngân hàng'); END;
-- `bil_posting_delivered_reconciling` (0099) KHÔNG tạo lại: điều kiện của nó không xét vai người thu (mọi dấu DECLARED chưa CONFIRMED của lần thu còn hiệu lực) nên đã
-- phủ loại mới; câu báo cũ chỉ nhắc «Công ty thu» nhưng máy chủ dịch theo tiền tố `delivered_reconciling:` (Ruling ở sổ thi công).

-- ===== (9) View cọc và trigger đảo lần thu: «đang đối chiếu» gồm vai mới (ADR-0132 Hệ quả) — TẠO LẠI (nguồn: 0099, khuôn DROP + CREATE của 0099) ==========
-- Đổi DUY NHẤT ở cả hai: vế «khoản MỚI đang đối chiếu» (dấu DECLARED chưa CONFIRMED) nhận người thu `COMPANY`, `BOOKER`, `SUPPLIER`; vế «khoản CŨ» (dòng giữ hộ
-- trên người khai, số dư cặp ≥ số dòng) giữ chỉ `COMPANY` và giữ nguyên tổng cộng mọi loại dòng (đơn huỷ không bao giờ có phiếu «Đã giao» nên không có dòng thương
-- mại — Ruling ở sổ thi công). Lần thu bên đặt / nhà cung cấp đã CONFIRMED, hoặc do Đối tác / Kế toán ghi thẳng (nợ ngay, không dấu), KHÔNG là đang đối chiếu.
-- Ba trigger khác của 0079 đọc view này theo TÊN (`bil_deposit_approval_within_kept`, `bil_outside_refund_record_within`, `bil_outside_refund_confirm_within`) — SQLite
-- giải tên lúc chạy nên vẫn chạy với view mới (cùng tên, cùng cột).
DROP TRIGGER bil_payment_receipt_coc_reversal;
DROP VIEW v_bil_coc_don;
CREATE VIEW v_bil_coc_don AS
  SELECT t.order_id AS order_id,
         t.da_tra AS da_tra,
         t.dang_doi_chieu AS dang_doi_chieu,
         t.hoan_truoc_huy AS hoan_truoc_huy,
         t.duyet + t.ngoai AS da_duyet,
         t.chi + t.ngoai AS da_chi,
         t.chuyen AS da_chuyen,
         t.ngoai AS hoan_ngoai,
         t.da_tra - t.hoan_truoc_huy AS con_giu_luc_huy,
         t.da_tra - t.hoan_truoc_huy - t.chi - t.ngoai - t.chuyen AS con_giu,
         t.duyet - t.chi - t.chuyen AS cho_chi
  FROM (
    SELECT c.order_id AS order_id,
           SUM(c.tra) AS da_tra, SUM(c.doi_chieu) AS dang_doi_chieu, SUM(c.hoan_truoc) AS hoan_truoc_huy,
           SUM(c.duyet) AS duyet, SUM(c.chi) AS chi, SUM(c.chuyen) AS chuyen, SUM(c.ngoai) AS ngoai
    FROM (
      -- (a) lần thu còn hiệu lực: đã trả / đang đối chiếu
      SELECT r.order_id AS order_id,
             CASE WHEN (r.collector_role_code = 'COMPANY' AND EXISTS (
                    SELECT 1 FROM bil_debt_line l WHERE l.receipt_id = r.id AND l.kind_code = 'HELD' AND l.reverses_line_id IS NULL
                      AND NOT EXISTS (SELECT 1 FROM bil_debt_line d WHERE d.reverses_line_id = l.id)
                      AND (SELECT COALESCE(SUM(CASE WHEN b.debtor_party_id = l.debtor_party_id THEN b.amount ELSE -b.amount END), 0) FROM bil_debt_line b
                           WHERE b.order_id = l.order_id AND ((b.debtor_party_id = l.debtor_party_id AND b.creditor_party_id = l.creditor_party_id)
                                                           OR (b.debtor_party_id = l.creditor_party_id AND b.creditor_party_id = l.debtor_party_id))) >= l.amount)) OR (r.collector_role_code IN ('COMPANY', 'BOOKER', 'SUPPLIER') AND EXISTS (SELECT 1 FROM bil_receipt_recon dc WHERE dc.receipt_id = r.id AND dc.kind_code = 'DECLARED' AND NOT EXISTS (SELECT 1 FROM bil_receipt_recon xc WHERE xc.receipt_id = r.id AND xc.kind_code = 'CONFIRMED'))) THEN 0 ELSE r.amount END AS tra,
             CASE WHEN (r.collector_role_code = 'COMPANY' AND EXISTS (
                    SELECT 1 FROM bil_debt_line l WHERE l.receipt_id = r.id AND l.kind_code = 'HELD' AND l.reverses_line_id IS NULL
                      AND NOT EXISTS (SELECT 1 FROM bil_debt_line d WHERE d.reverses_line_id = l.id)
                      AND (SELECT COALESCE(SUM(CASE WHEN b.debtor_party_id = l.debtor_party_id THEN b.amount ELSE -b.amount END), 0) FROM bil_debt_line b
                           WHERE b.order_id = l.order_id AND ((b.debtor_party_id = l.debtor_party_id AND b.creditor_party_id = l.creditor_party_id)
                                                           OR (b.debtor_party_id = l.creditor_party_id AND b.creditor_party_id = l.debtor_party_id))) >= l.amount)) OR (r.collector_role_code IN ('COMPANY', 'BOOKER', 'SUPPLIER') AND EXISTS (SELECT 1 FROM bil_receipt_recon dc WHERE dc.receipt_id = r.id AND dc.kind_code = 'DECLARED' AND NOT EXISTS (SELECT 1 FROM bil_receipt_recon xc WHERE xc.receipt_id = r.id AND xc.kind_code = 'CONFIRMED'))) THEN r.amount ELSE 0 END AS doi_chieu,
             0 AS hoan_truoc, 0 AS duyet, 0 AS chi, 0 AS chuyen, 0 AS ngoai
      FROM bil_payment_receipt r
      WHERE r.kind_code = 'CUSTOMER_PAYMENT' AND r.reverses_id IS NULL AND NOT EXISTS (SELECT 1 FROM bil_payment_receipt x WHERE x.reverses_id = r.id)
      UNION ALL
      -- (b)(c) lần trả lại khách còn hiệu lực: không khoản duyệt = hoàn trước huỷ; khoản REFUND = chi; khoản TRANSFER = chuyển
      SELECT r.order_id, 0, 0,
             CASE WHEN r.approval_id IS NULL THEN r.amount ELSE 0 END,
             0,
             CASE WHEN a.kind_code = 'REFUND' THEN r.amount ELSE 0 END,
             CASE WHEN a.kind_code = 'TRANSFER' THEN r.amount ELSE 0 END,
             0
      FROM bil_payment_receipt r LEFT JOIN bil_deposit_approval a ON a.id = r.approval_id
      WHERE r.kind_code = 'CUSTOMER_REFUND' AND r.reverses_id IS NULL AND NOT EXISTS (SELECT 1 FROM bil_payment_receipt x WHERE x.reverses_id = r.id)
      UNION ALL
      -- (d) khoản duyệt: gốc cộng, huỷ duyệt trừ
      SELECT a.order_id, 0, 0, 0, CASE WHEN a.voids_id IS NULL THEN a.amount ELSE -a.amount END, 0, 0, 0
      FROM bil_deposit_approval a
      UNION ALL
      -- (e) hoàn ngoài hệ thống ĐÃ xác nhận
      SELECT g.order_id, 0, 0, 0, 0, 0, 0, g.amount
      FROM bil_outside_refund g
      WHERE g.kind_code = 'RECORD' AND EXISTS (SELECT 1 FROM bil_outside_refund c WHERE c.target_id = g.id AND c.kind_code = 'CONFIRM')
    ) c
    GROUP BY c.order_id
  ) t;

CREATE TRIGGER bil_payment_receipt_coc_reversal BEFORE INSERT ON bil_payment_receipt
WHEN NEW.reverses_id IS NOT NULL AND EXISTS (SELECT 1 FROM bil_deposit_approval a WHERE a.order_id = NEW.order_id)
  AND COALESCE((SELECT v.da_duyet FROM v_bil_coc_don v WHERE v.order_id = NEW.order_id), 0) > (
    COALESCE((SELECT v.con_giu_luc_huy FROM v_bil_coc_don v WHERE v.order_id = NEW.order_id), 0)
    - (SELECT CASE WHEN g.kind_code = 'CUSTOMER_PAYMENT' AND NOT ((g.collector_role_code = 'COMPANY' AND EXISTS (
                      SELECT 1 FROM bil_debt_line l WHERE l.receipt_id = g.id AND l.kind_code = 'HELD' AND l.reverses_line_id IS NULL
                        AND NOT EXISTS (SELECT 1 FROM bil_debt_line d WHERE d.reverses_line_id = l.id)
                      AND (SELECT COALESCE(SUM(CASE WHEN b.debtor_party_id = l.debtor_party_id THEN b.amount ELSE -b.amount END), 0) FROM bil_debt_line b
                           WHERE b.order_id = l.order_id AND ((b.debtor_party_id = l.debtor_party_id AND b.creditor_party_id = l.creditor_party_id)
                                                           OR (b.debtor_party_id = l.creditor_party_id AND b.creditor_party_id = l.debtor_party_id))) >= l.amount)) OR (g.collector_role_code IN ('COMPANY', 'BOOKER', 'SUPPLIER') AND EXISTS (SELECT 1 FROM bil_receipt_recon dc WHERE dc.receipt_id = g.id AND dc.kind_code = 'DECLARED' AND NOT EXISTS (SELECT 1 FROM bil_receipt_recon xc WHERE xc.receipt_id = g.id AND xc.kind_code = 'CONFIRMED')))) THEN g.amount
                   WHEN g.kind_code = 'CUSTOMER_REFUND' AND g.approval_id IS NULL THEN -g.amount
                   ELSE 0 END
       FROM bil_payment_receipt g WHERE g.id = NEW.reverses_id))
BEGIN SELECT RAISE(ABORT, 'coc_paid_below_approved: đảo lần thu làm đã trả dưới tổng duyệt hoàn cọc'); END;

-- ===== (10) Mốc của kiểm định kỳ (khuôn bil_audit_cutoff 0080 / ord_audit_cutoff 0090): vi phạm ghi TỪ mốc = LỖI, cũ hơn mốc = cảnh báo kèm danh sách. Mốc = lúc áp.
-- R-BIL-2 (dòng thương mại = số tính lại; ADR-0079 điều 7a), R-BIL-5 (dòng dịch vụ của đơn đã giao có người bán), R-BIL-12 (thu cho nhà cung cấp — ADR-0078),
-- R-BIL-16 (số dòng giảm giá bên đặt — ADR gọi R-BIL-14, mã đó đã dùng cho ADR-0115), R-ORD-DC1 (giảm giá ≤ tổng hoa hồng chụp lúc xác nhận — ADR-0079 điều 9).
INSERT INTO bil_audit_cutoff (code, cutoff_at, created_at, created_by, updated_at, updated_by) VALUES
  ('R-BIL-2', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), 'he-thong', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), 'he-thong'),
  ('R-BIL-5', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), 'he-thong', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), 'he-thong'),
  ('R-BIL-12', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), 'he-thong', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), 'he-thong'),
  ('R-BIL-16', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), 'he-thong', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), 'he-thong');
INSERT INTO ord_audit_cutoff (code, cutoff_at, created_at, created_by, updated_at, updated_by)
VALUES ('R-ORD-DC1', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), 'he-thong', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), 'he-thong');
