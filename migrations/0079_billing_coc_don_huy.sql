-- Migration 0079 — CỌC ĐƠN HUỶ: duyệt hoàn / duyệt chuyển, chi hoàn, chuyển sang đơn mới, "đã hoàn ngoài hệ thống" (ADR-0089 đ2, đ4, đ5, đ6, đ15, đ16, X-1…X-4,
-- lời chủ (b), (c); kế hoạch docs/superpowers/plans/2026-10-02-khac-phuc-audit-02-dot-1-don-huy-coc.md §3.2, Task 7). Module `billing` (tiền tố bil_).
-- Chỉ THÊM: hai bảng chỉ-thêm, hai cột NULL trên bil_payment_receipt, một view công bố, trigger. Không đổi dữ liệu cũ.
-- Thân trigger chỉ đọc bảng bil_ + view công bố của orders (v_ord_order_state, v_ord_cancel_state — cạnh billing → orders đã khai) — ADR-0024 điều 5.
-- Mọi câu báo lỗi có tiền tố mã (`coc_…:`) — route dịch sang tiếng Việt (`loiTrigger`), không lộ mã thô.
--
-- ĐỊNH NGHĨA (MỘT nơi trong mã: `soTienCoc` ở src/modules/billing/rules.ts; view `v_bil_coc_don` dưới đây theo ĐÚNG định nghĩa đó — bài đối chiếu hai nơi):
--   lần thu CÒN HIỆU LỰC = không phải dòng đảo và chưa bị đảo;
--   CHỜ XÁC NHẬN = lần thu vai COMPANY còn dòng giữ hộ (HELD, dòng gốc) chưa bị đảo ("Công ty thu – CK" do người khác khai) VÀ người khai còn nợ công ty
--     trên đơn ≥ số dòng đó (ADR-0092 Đ2b — khoản đã được "Nộp" bù không còn chờ xác nhận);
--   đã trả = Σ thu còn hiệu lực KHÔNG chờ xác nhận; đang đối chiếu = Σ thu còn hiệu lực chờ xác nhận;
--   hoàn trước huỷ = Σ trả lại khách còn hiệu lực KHÔNG gắn khoản duyệt (sau bản này đơn huỷ chỉ hoàn qua khoản duyệt — trigger coc_needs_approval);
--   đã duyệt = Σ khoản gốc − Σ huỷ duyệt + Σ hoàn ngoài ĐÃ xác nhận; đã chi = Σ trả lại gắn khoản REFUND + hoàn ngoài đã xác nhận;
--   đã chuyển = Σ trả lại gắn khoản TRANSFER; tiền còn giữ lúc huỷ = đã trả − hoàn trước huỷ (TRẦN của đã duyệt — lời chủ (c));
--   còn giữ = còn giữ lúc huỷ − đã chi − đã chuyển; chờ chi = đã duyệt − đã chi − đã chuyển.
--   Bất biến đ15 (mọi lúc): đã chi + đã chuyển ≤ đã duyệt ≤ tiền còn giữ lúc huỷ.

-- Khoản duyệt hoàn cọc (đ4a, đ6 — Quản trị/Toàn quyền duyệt; X-1 cùng ô cho duyệt chuyển). Dòng HUỶ DUYỆT trỏ khoản gốc (`voids_id`, mỗi khoản một lần),
-- `amount` = phần huỷ, cùng loại với gốc. Chỉ-thêm.
CREATE TABLE bil_deposit_approval (
  id              TEXT PRIMARY KEY,
  order_id        TEXT NOT NULL REFERENCES orders(id),
  kind_code       TEXT NOT NULL CHECK (kind_code IN ('REFUND', 'TRANSFER')),
  amount          INTEGER NOT NULL CHECK (amount > 0),
  -- Đơn nhận tiền khi chuyển (đ6); NULL với hoàn và với dòng huỷ duyệt.
  target_order_id TEXT REFERENCES orders(id),
  reason          TEXT NOT NULL CHECK (length(trim(reason)) > 0 AND length(reason) <= 500),
  -- Ngày duyệt (ngày dân sự giờ VN, máy chủ truyền) — so với hạn 60 ngày (đ5).
  approved_date   TEXT NOT NULL CHECK (date(approved_date) IS approved_date),
  voids_id        TEXT UNIQUE REFERENCES bil_deposit_approval(id),
  created_at      TEXT NOT NULL,
  created_by      TEXT,
  updated_at      TEXT NOT NULL,
  updated_by      TEXT,
  CHECK (target_order_id IS NULL OR target_order_id <> order_id),
  CHECK (voids_id IS NOT NULL OR ((kind_code = 'TRANSFER') = (target_order_id IS NOT NULL))),
  CHECK (voids_id IS NULL OR target_order_id IS NULL)
);
CREATE INDEX bil_deposit_approval_order_ix ON bil_deposit_approval(order_id);

-- "Đã hoàn ngoài hệ thống" (đ16, X-3, X-4, lời chủ (b)): RECORD (Toàn quyền ghi, có số + lý do) → CONFIRM (Quản trị xác nhận) hoặc REJECT (từ chối, có lý do —
-- bị từ chối thì ghi lại được). Mỗi RECORD nhận đúng MỘT quyết định (`target_id` UNIQUE). Chỉ-thêm.
CREATE TABLE bil_outside_refund (
  id            TEXT PRIMARY KEY,
  order_id      TEXT NOT NULL REFERENCES orders(id),
  kind_code     TEXT NOT NULL CHECK (kind_code IN ('RECORD', 'CONFIRM', 'REJECT')),
  amount        INTEGER CHECK (amount IS NULL OR amount > 0),
  reason        TEXT CHECK (reason IS NULL OR (length(trim(reason)) > 0 AND length(reason) <= 500)),
  target_id     TEXT UNIQUE REFERENCES bil_outside_refund(id),
  occurred_date TEXT NOT NULL CHECK (date(occurred_date) IS occurred_date),
  created_at    TEXT NOT NULL,
  created_by    TEXT,
  updated_at    TEXT NOT NULL,
  updated_by    TEXT,
  CHECK ((kind_code = 'RECORD') = (amount IS NOT NULL)),
  CHECK ((kind_code = 'RECORD') = (target_id IS NULL)),
  CHECK (kind_code = 'CONFIRM' OR reason IS NOT NULL)
);
CREATE INDEX bil_outside_refund_order_ix ON bil_outside_refund(order_id);

-- Lần trả lại khách thuộc khoản duyệt nào (lần chi hoàn / nửa "chi" của lệnh chuyển — đ4b, đ6).
ALTER TABLE bil_payment_receipt ADD COLUMN approval_id TEXT REFERENCES bil_deposit_approval(id);
-- Nửa "thu" ở đơn nhận trỏ nửa "chi" ở đơn huỷ (một lô hai đơn — đ6). Mỗi nửa chi có tối đa một nửa thu.
ALTER TABLE bil_payment_receipt ADD COLUMN transfer_of_id TEXT REFERENCES bil_payment_receipt(id);
CREATE UNIQUE INDEX bil_payment_receipt_transfer_of_uq ON bil_payment_receipt(transfer_of_id) WHERE transfer_of_id IS NOT NULL;

-- View công bố: tiền cọc theo đơn (mọi đơn có dòng sổ). Dùng cho route danh sách, `audit-invariants` và trigger dưới đây.
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
             CASE WHEN r.collector_role_code = 'COMPANY' AND EXISTS (
                    SELECT 1 FROM bil_debt_line l WHERE l.receipt_id = r.id AND l.kind_code = 'HELD' AND l.reverses_line_id IS NULL
                      AND NOT EXISTS (SELECT 1 FROM bil_debt_line d WHERE d.reverses_line_id = l.id)
                      AND (SELECT COALESCE(SUM(CASE WHEN b.debtor_party_id = l.debtor_party_id THEN b.amount ELSE -b.amount END), 0) FROM bil_debt_line b
                           WHERE b.order_id = l.order_id AND ((b.debtor_party_id = l.debtor_party_id AND b.creditor_party_id = l.creditor_party_id)
                                                           OR (b.debtor_party_id = l.creditor_party_id AND b.creditor_party_id = l.debtor_party_id))) >= l.amount) THEN 0 ELSE r.amount END AS tra,
             CASE WHEN r.collector_role_code = 'COMPANY' AND EXISTS (
                    SELECT 1 FROM bil_debt_line l WHERE l.receipt_id = r.id AND l.kind_code = 'HELD' AND l.reverses_line_id IS NULL
                      AND NOT EXISTS (SELECT 1 FROM bil_debt_line d WHERE d.reverses_line_id = l.id)
                      AND (SELECT COALESCE(SUM(CASE WHEN b.debtor_party_id = l.debtor_party_id THEN b.amount ELSE -b.amount END), 0) FROM bil_debt_line b
                           WHERE b.order_id = l.order_id AND ((b.debtor_party_id = l.debtor_party_id AND b.creditor_party_id = l.creditor_party_id)
                                                           OR (b.debtor_party_id = l.creditor_party_id AND b.creditor_party_id = l.debtor_party_id))) >= l.amount) THEN r.amount ELSE 0 END AS doi_chieu,
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

-- Chỉ-thêm (khuôn 0045).
CREATE TRIGGER bil_deposit_approval_no_update BEFORE UPDATE ON bil_deposit_approval
BEGIN SELECT RAISE(ABORT, 'bil_append_only: khoản duyệt không sửa được — huỷ duyệt bằng dòng mới'); END;
CREATE TRIGGER bil_deposit_approval_no_delete BEFORE DELETE ON bil_deposit_approval
BEGIN SELECT RAISE(ABORT, 'bil_append_only: khoản duyệt không xoá được'); END;
CREATE TRIGGER bil_outside_refund_no_update BEFORE UPDATE ON bil_outside_refund
BEGIN SELECT RAISE(ABORT, 'bil_append_only: dòng đã hoàn ngoài hệ thống không sửa được'); END;
CREATE TRIGGER bil_outside_refund_no_delete BEFORE DELETE ON bil_outside_refund
BEGIN SELECT RAISE(ABORT, 'bil_append_only: dòng đã hoàn ngoài hệ thống không xoá được'); END;

-- ---- Khoản duyệt gốc (đ4a, đ5, đ6, X-2) — mỗi luật một trigger, một câu RAISE ----
CREATE TRIGGER bil_deposit_approval_cancelled BEFORE INSERT ON bil_deposit_approval
WHEN NEW.voids_id IS NULL AND NOT EXISTS (SELECT 1 FROM v_ord_order_state s WHERE s.id = NEW.order_id AND s.status = 'cancelled')
BEGIN SELECT RAISE(ABORT, 'coc_not_cancelled: chỉ duyệt hoàn cọc cho đơn đã huỷ'); END;
CREATE TRIGGER bil_deposit_approval_classified BEFORE INSERT ON bil_deposit_approval
WHEN NEW.voids_id IS NULL AND EXISTS (SELECT 1 FROM v_ord_cancel_state c WHERE c.order_id = NEW.order_id AND c.group_code = 'CHUA_KET_LUAN')
BEGIN SELECT RAISE(ABORT, 'coc_unclassified: lý do huỷ chưa được phân loại'); END;
CREATE TRIGGER bil_deposit_approval_deadline BEFORE INSERT ON bil_deposit_approval
WHEN NEW.voids_id IS NULL AND EXISTS (SELECT 1 FROM v_ord_cancel_state c WHERE c.order_id = NEW.order_id AND c.group_code = 'KHACH_HUY' AND NEW.approved_date > c.refund_deadline)
BEGIN SELECT RAISE(ABORT, 'coc_deadline: đã quá hạn hoàn cọc (khách huỷ)'); END;
CREATE TRIGGER bil_deposit_approval_within_kept BEFORE INSERT ON bil_deposit_approval
WHEN NEW.voids_id IS NULL
  AND COALESCE((SELECT v.da_duyet FROM v_bil_coc_don v WHERE v.order_id = NEW.order_id), 0) + NEW.amount
      > COALESCE((SELECT v.con_giu_luc_huy FROM v_bil_coc_don v WHERE v.order_id = NEW.order_id), 0)
BEGIN SELECT RAISE(ABORT, 'coc_exceeds_paid: tổng duyệt vượt tiền còn giữ lúc huỷ'); END;
CREATE TRIGGER bil_deposit_approval_target BEFORE INSERT ON bil_deposit_approval
WHEN NEW.voids_id IS NULL AND NEW.kind_code = 'TRANSFER' AND NOT EXISTS (
  SELECT 1 FROM v_ord_order_state s WHERE s.id = NEW.target_order_id AND s.status <> 'cancelled' AND s.delivered_at IS NULL)
BEGIN SELECT RAISE(ABORT, 'coc_bad_target: đơn nhận phải còn hiệu lực, chưa Đã giao'); END;

-- ---- Huỷ duyệt (đ4c): cùng đơn, cùng loại với khoản gốc; chỉ phần CHƯA chi ----
CREATE TRIGGER bil_deposit_void_match BEFORE INSERT ON bil_deposit_approval
WHEN NEW.voids_id IS NOT NULL AND NOT EXISTS (
  SELECT 1 FROM bil_deposit_approval g WHERE g.id = NEW.voids_id AND g.voids_id IS NULL AND g.order_id = NEW.order_id AND g.kind_code = NEW.kind_code)
BEGIN SELECT RAISE(ABORT, 'coc_void_mismatch: dòng huỷ duyệt phải trỏ khoản gốc cùng đơn, cùng loại'); END;
CREATE TRIGGER bil_deposit_void_unspent BEFORE INSERT ON bil_deposit_approval
WHEN NEW.voids_id IS NOT NULL AND NEW.amount > (
  SELECT g.amount - COALESCE((SELECT SUM(r.amount) FROM bil_payment_receipt r WHERE r.approval_id = g.id AND r.kind_code = 'CUSTOMER_REFUND' AND r.reverses_id IS NULL
                              AND NOT EXISTS (SELECT 1 FROM bil_payment_receipt x WHERE x.reverses_id = r.id)), 0)
  FROM bil_deposit_approval g WHERE g.id = NEW.voids_id)
BEGIN SELECT RAISE(ABORT, 'coc_void_exceeds_unspent: chỉ huỷ được phần chưa chi của khoản duyệt'); END;

-- ---- Lần trả lại khách (đ4b, đ4c, H-C7) ----
-- Đơn huỷ chỉ hoàn qua khoản duyệt (không trả dư tự do).
CREATE TRIGGER bil_payment_receipt_coc_needs_approval BEFORE INSERT ON bil_payment_receipt
WHEN NEW.kind_code = 'CUSTOMER_REFUND' AND NEW.reverses_id IS NULL AND NEW.approval_id IS NULL
  AND EXISTS (SELECT 1 FROM v_ord_order_state s WHERE s.id = NEW.order_id AND s.status = 'cancelled')
BEGIN SELECT RAISE(ABORT, 'coc_needs_approval: đơn huỷ chỉ hoàn qua khoản duyệt hoàn cọc'); END;
-- Gắn khoản duyệt: khoản GỐC của chính đơn này.
CREATE TRIGGER bil_payment_receipt_coc_approval_match BEFORE INSERT ON bil_payment_receipt
WHEN NEW.approval_id IS NOT NULL AND (NEW.kind_code <> 'CUSTOMER_REFUND' OR NEW.reverses_id IS NOT NULL OR NOT EXISTS (
  SELECT 1 FROM bil_deposit_approval a WHERE a.id = NEW.approval_id AND a.voids_id IS NULL AND a.order_id = NEW.order_id))
BEGIN SELECT RAISE(ABORT, 'coc_bad_approval: lần chi phải gắn khoản duyệt gốc của chính đơn này'); END;
-- Không vượt phần còn lại của khoản (số duyệt − huỷ duyệt − đã chi/chuyển).
CREATE TRIGGER bil_payment_receipt_coc_within_approved BEFORE INSERT ON bil_payment_receipt
WHEN NEW.approval_id IS NOT NULL AND NEW.reverses_id IS NULL AND NEW.amount > (
  SELECT a.amount
       - COALESCE((SELECT SUM(v.amount) FROM bil_deposit_approval v WHERE v.voids_id = a.id), 0)
       - COALESCE((SELECT SUM(r.amount) FROM bil_payment_receipt r WHERE r.approval_id = a.id AND r.kind_code = 'CUSTOMER_REFUND' AND r.reverses_id IS NULL
                   AND NOT EXISTS (SELECT 1 FROM bil_payment_receipt x WHERE x.reverses_id = r.id)), 0)
  FROM bil_deposit_approval a WHERE a.id = NEW.approval_id)
BEGIN SELECT RAISE(ABORT, 'coc_exceeds_approved: vượt phần đã duyệt còn lại'); END;
-- Tách người (đ4c): người chi / chuyển ≠ người duyệt.
CREATE TRIGGER bil_payment_receipt_coc_same_person BEFORE INSERT ON bil_payment_receipt
WHEN NEW.approval_id IS NOT NULL AND EXISTS (SELECT 1 FROM bil_deposit_approval a WHERE a.id = NEW.approval_id AND a.created_by IS NEW.created_by)
BEGIN SELECT RAISE(ABORT, 'coc_same_person: người duyệt không tự chi / chuyển khoản này'); END;
-- Nửa "thu" của lệnh chuyển (đ6): trỏ nửa "chi" gắn khoản TRANSFER có đơn nhận = đơn này, cùng số, cùng người đang giữ.
CREATE TRIGGER bil_payment_receipt_coc_transfer_pair BEFORE INSERT ON bil_payment_receipt
WHEN NEW.transfer_of_id IS NOT NULL AND (NEW.kind_code <> 'CUSTOMER_PAYMENT' OR NEW.reverses_id IS NOT NULL OR NOT EXISTS (
  SELECT 1 FROM bil_payment_receipt o JOIN bil_deposit_approval a ON a.id = o.approval_id
  WHERE o.id = NEW.transfer_of_id AND o.kind_code = 'CUSTOMER_REFUND' AND o.reverses_id IS NULL AND a.kind_code = 'TRANSFER'
    AND a.target_order_id = NEW.order_id AND o.amount = NEW.amount AND o.collector_party_id IS NEW.collector_party_id))
BEGIN SELECT RAISE(ABORT, 'coc_transfer_mismatch: nửa thu của lệnh chuyển phải khớp nửa chi (đơn nhận, số, người giữ)'); END;
-- Bất biến đ15 MỌI LÚC (NT-B2, B3): một dòng ĐẢO lần thu không được làm tổng duyệt vượt tiền còn giữ lúc huỷ. Tính số SAU khi đảo: đảo một lần thu đã xác
-- nhận làm giảm đã trả; đảo một lần trả lại KHÔNG gắn khoản duyệt làm tăng trần. ("Thay lần thu" — ADR-0088 — ghi lần thu mới TRƯỚC dòng đảo trong cùng lô.)
CREATE TRIGGER bil_payment_receipt_coc_reversal BEFORE INSERT ON bil_payment_receipt
WHEN NEW.reverses_id IS NOT NULL AND EXISTS (SELECT 1 FROM bil_deposit_approval a WHERE a.order_id = NEW.order_id)
  AND COALESCE((SELECT v.da_duyet FROM v_bil_coc_don v WHERE v.order_id = NEW.order_id), 0) > (
    COALESCE((SELECT v.con_giu_luc_huy FROM v_bil_coc_don v WHERE v.order_id = NEW.order_id), 0)
    - (SELECT CASE WHEN g.kind_code = 'CUSTOMER_PAYMENT' AND NOT (g.collector_role_code = 'COMPANY' AND EXISTS (
                      SELECT 1 FROM bil_debt_line l WHERE l.receipt_id = g.id AND l.kind_code = 'HELD' AND l.reverses_line_id IS NULL
                        AND NOT EXISTS (SELECT 1 FROM bil_debt_line d WHERE d.reverses_line_id = l.id)
                      AND (SELECT COALESCE(SUM(CASE WHEN b.debtor_party_id = l.debtor_party_id THEN b.amount ELSE -b.amount END), 0) FROM bil_debt_line b
                           WHERE b.order_id = l.order_id AND ((b.debtor_party_id = l.debtor_party_id AND b.creditor_party_id = l.creditor_party_id)
                                                           OR (b.debtor_party_id = l.creditor_party_id AND b.creditor_party_id = l.debtor_party_id))) >= l.amount)) THEN g.amount
                   WHEN g.kind_code = 'CUSTOMER_REFUND' AND g.approval_id IS NULL THEN -g.amount
                   ELSE 0 END
       FROM bil_payment_receipt g WHERE g.id = NEW.reverses_id))
BEGIN SELECT RAISE(ABORT, 'coc_paid_below_approved: đảo lần thu làm đã trả dưới tổng duyệt hoàn cọc'); END;

-- ---- Đã hoàn ngoài hệ thống (đ16, X-3, X-4, lời chủ (b)) ----
CREATE TRIGGER bil_outside_refund_legacy BEFORE INSERT ON bil_outside_refund
WHEN NEW.kind_code = 'RECORD' AND NOT EXISTS (SELECT 1 FROM v_ord_cancel_state c WHERE c.order_id = NEW.order_id AND c.legacy = 1)
BEGIN SELECT RAISE(ABORT, 'coc_outside_not_legacy: chỉ ghi cho đơn huỷ trước khi có lệnh hoàn cọc'); END;
CREATE TRIGGER bil_outside_refund_once BEFORE INSERT ON bil_outside_refund
WHEN NEW.kind_code = 'RECORD' AND EXISTS (
  SELECT 1 FROM bil_outside_refund g WHERE g.order_id = NEW.order_id AND g.kind_code = 'RECORD'
    AND NOT EXISTS (SELECT 1 FROM bil_outside_refund x WHERE x.target_id = g.id AND x.kind_code = 'REJECT'))
BEGIN SELECT RAISE(ABORT, 'coc_outside_once: đơn đã có một dòng đã hoàn ngoài hệ thống đang hiệu lực'); END;
CREATE TRIGGER bil_outside_refund_record_within BEFORE INSERT ON bil_outside_refund
WHEN NEW.kind_code = 'RECORD' AND NEW.amount > COALESCE((SELECT v.con_giu FROM v_bil_coc_don v WHERE v.order_id = NEW.order_id), 0)
BEGIN SELECT RAISE(ABORT, 'coc_outside_exceeds: vượt số tiền còn giữ của đơn'); END;
CREATE TRIGGER bil_outside_refund_decision_match BEFORE INSERT ON bil_outside_refund
WHEN NEW.kind_code <> 'RECORD' AND NOT EXISTS (SELECT 1 FROM bil_outside_refund g WHERE g.id = NEW.target_id AND g.kind_code = 'RECORD' AND g.order_id = NEW.order_id)
BEGIN SELECT RAISE(ABORT, 'coc_outside_mismatch: xác nhận / từ chối phải trỏ dòng ghi của cùng đơn'); END;
CREATE TRIGGER bil_outside_refund_same_person BEFORE INSERT ON bil_outside_refund
WHEN NEW.kind_code <> 'RECORD' AND EXISTS (SELECT 1 FROM bil_outside_refund g WHERE g.id = NEW.target_id AND g.created_by IS NEW.created_by)
BEGIN SELECT RAISE(ABORT, 'coc_same_person: người ghi không tự xác nhận / từ chối dòng này'); END;
CREATE TRIGGER bil_outside_refund_confirm_within BEFORE INSERT ON bil_outside_refund
WHEN NEW.kind_code = 'CONFIRM' AND (SELECT g.amount FROM bil_outside_refund g WHERE g.id = NEW.target_id) > MIN(
  COALESCE((SELECT v.con_giu FROM v_bil_coc_don v WHERE v.order_id = NEW.order_id), 0),
  COALESCE((SELECT v.con_giu_luc_huy - v.da_duyet FROM v_bil_coc_don v WHERE v.order_id = NEW.order_id), 0))
BEGIN SELECT RAISE(ABORT, 'coc_outside_exceeds: số của dòng này nay vượt số còn giữ của đơn'); END;
