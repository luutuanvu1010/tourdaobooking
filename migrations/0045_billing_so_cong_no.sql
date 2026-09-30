-- Migration 0045 — SỔ CÔNG NỢ lượt 1 (module billing, tiền tố bil_): lần thu có người thu + hình thức, phiếu sổ, dòng nợ hai chân; chuyển cọc cũ thành
-- lần thu "chưa rõ" (sổ tiền lượt 1: ADR-0026 điều 2–6, 9; ADR-0025 điều 3d/7 (trigger kiểm tiền trong lô — cách vá C1/V1 của kế hoạch §3.2, §3.3);
-- ADR-0057 T3 (dòng nợ gắn đơn HOẶC chuyến); Hiến chương 5.14 (ngày phát sinh). Kế hoạch: docs/superpowers/plans/2026-09-29-so-tien-luot-1-ke-hoach.md
-- Task 3. Chỉ THÊM. Ba bảng chính CHỈ-THÊM (sai thì đảo bằng dòng mới — không sửa, không xoá). Khoá ngoại NO ACTION; đủ 4 cột WHO (updated_* = created_*:
-- trigger cấm sửa nên không bao giờ khác — lệch câu chữ ADR-0003 đ6 đã ghi ở ADR-0026).
-- Luật thân trigger (ADR-0024 điều 5): trigger của billing chỉ đọc bảng bil_ và view công bố của parties (v_pty_owner_company) — KHÔNG đọc orders.
-- Mã lỗi có tiền tố (`bil_append_only:`, `bil_reversal:`, `delivered_not_paid:`, `completed_unsettled:`, `bil_trip_not_yet:`, `bil_reason_required:`).

-- ---------- Bảng tra cứu (tập mở — ADR-0003 điều 3: thêm dòng, không CHECK liệt kê) ----------
CREATE TABLE bil_payment_method (
  code       TEXT PRIMARY KEY CHECK (code = upper(code)),
  name       TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active     INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1))
);
-- Mã = upper(deposit_method) cũ ('cash', 'bank_transfer', 'other') để câu chuyển cọc chép 1:1.
INSERT INTO bil_payment_method (code, name, sort_order, active) VALUES ('CASH', 'Tiền mặt', 1, 1), ('BANK_TRANSFER', 'Chuyển khoản', 2, 1), ('OTHER', 'Khác', 3, 1);

CREATE TABLE bil_collector_role (
  code       TEXT PRIMARY KEY CHECK (code = upper(code)),
  name       TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active     INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1))
);
-- SUPPLIER dùng từ lượt 2 (active = 0); UNKNOWN chỉ cho cọc cũ chuyển sang (không ghi mới được — kiểm ở mã).
INSERT INTO bil_collector_role (code, name, sort_order, active) VALUES
  ('COMPANY', 'Công ty', 1, 1), ('STAFF', 'Nhân viên', 2, 1), ('BOOKER', 'Bên đặt (người hưởng)', 3, 1), ('SUPPLIER', 'Nhà cung cấp', 4, 0), ('UNKNOWN', 'Chưa rõ', 5, 1);

CREATE TABLE bil_receipt_kind (
  code       TEXT PRIMARY KEY CHECK (code = upper(code)),
  name       TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active     INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1))
);
INSERT INTO bil_receipt_kind (code, name, sort_order, active) VALUES ('CUSTOMER_PAYMENT', 'Thu của khách', 1, 1), ('CUSTOMER_REFUND', 'Trả lại khách', 2, 1);

CREATE TABLE bil_receipt_stage (
  code       TEXT PRIMARY KEY CHECK (code = upper(code)),
  name       TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active     INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1))
);
INSERT INTO bil_receipt_stage (code, name, sort_order, active) VALUES ('PREPAID', 'Trả trước', 1, 1), ('AT_DELIVERY', 'Lúc Đã giao', 2, 1);

CREATE TABLE bil_posting_kind (
  code       TEXT PRIMARY KEY CHECK (code = upper(code)),
  name       TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active     INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1))
);
-- COMPLETED: dấu mốc "Hoàn thành" (không dòng nợ — ruling điều phối 29/9 ở kế hoạch, V1) để trigger chặn khi còn người nợ công ty.
INSERT INTO bil_posting_kind (code, name, sort_order, active) VALUES
  ('RECEIPT', 'Lần thu', 1, 1), ('DELIVERED', 'Đã giao', 2, 1), ('COMPLETED', 'Hoàn thành', 3, 1), ('COMPANY_RECEIVED', 'Công ty đã nhận', 4, 1),
  ('SETTLEMENT', 'Quyết toán', 5, 1), ('REFUND', 'Hoàn khách', 6, 1), ('ADJUSTMENT', 'Điều chỉnh', 7, 1), ('REVERSAL', 'Đảo', 8, 1);

CREATE TABLE bil_debt_kind (
  code       TEXT PRIMARY KEY CHECK (code = upper(code)),
  name       TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active     INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1))
);
-- Lượt 2 thêm: mua giá đại lý, hoa hồng, giá vốn nhà cung cấp, tiền thu hộ.
INSERT INTO bil_debt_kind (code, name, sort_order, active) VALUES ('HELD', 'Tiền đang giữ hộ', 1, 1), ('SETTLEMENT', 'Quyết toán', 2, 1), ('REFUND', 'Hoàn khách', 3, 1);

-- ---------- Lần thu (ADR-0026 điều 2) ----------
CREATE TABLE bil_payment_receipt (
  id                     TEXT PRIMARY KEY,
  order_id               TEXT NOT NULL REFERENCES orders(id),
  kind_code              TEXT NOT NULL REFERENCES bil_receipt_kind(code),
  amount                 INTEGER NOT NULL CHECK (amount > 0),
  -- Người thu cụ thể (hồ sơ); NULL CHỈ khi vai = UNKNOWN (cọc cũ).
  collector_party_id     TEXT REFERENCES pty_party(id),
  collector_role_code    TEXT NOT NULL REFERENCES bil_collector_role(code),
  method_code            TEXT NOT NULL REFERENCES bil_payment_method(code),
  -- Thu cho ai: lượt 1 LUÔN là hồ sơ công ty chủ (NT-S9 — route không nhận giá trị khác; bất biến kiểm định kỳ).
  collected_for_party_id TEXT NOT NULL REFERENCES pty_party(id),
  stage_code             TEXT NOT NULL REFERENCES bil_receipt_stage(code),
  -- Ngày phát sinh (Hiến chương 5.14): ngày dân sự giờ VN, bắt buộc, tách khỏi created_at (UTC).
  occurred_date          TEXT NOT NULL CHECK (date(occurred_date) IS occurred_date),
  -- Dòng đảo trỏ dòng gốc; mỗi dòng gốc đảo tối đa một lần.
  reverses_id            TEXT UNIQUE REFERENCES bil_payment_receipt(id),
  note                   TEXT CHECK (note IS NULL OR length(note) <= 500),
  created_at             TEXT NOT NULL,
  created_by             TEXT,
  updated_at             TEXT NOT NULL,
  updated_by             TEXT,
  CHECK ((collector_party_id IS NULL) = (collector_role_code = 'UNKNOWN'))
);
CREATE INDEX bil_payment_receipt_order_ix ON bil_payment_receipt(order_id);
CREATE INDEX bil_payment_receipt_collector_ix ON bil_payment_receipt(collector_party_id);

-- ---------- Phiếu sổ (ADR-0026 điều 3) ----------
CREATE TABLE bil_posting (
  id                  TEXT PRIMARY KEY,
  kind_code           TEXT NOT NULL REFERENCES bil_posting_kind(code),
  -- NULL được: phiếu nộp/trả gộp nhiều đơn (dòng nợ mang đơn).
  order_id            TEXT REFERENCES orders(id),
  reason              TEXT CHECK (reason IS NULL OR length(reason) <= 500),
  reverses_posting_id TEXT UNIQUE REFERENCES bil_posting(id),
  occurred_date       TEXT NOT NULL CHECK (date(occurred_date) IS occurred_date),
  -- Q4 (chủ "Đồng ý lưu", 30/9): "phải thu hiện hành" máy chủ tính lúc bấm Đã giao — BẢN CHỤP tại mốc (Hiến chương 5.6), không phải nguồn tính thứ hai.
  -- Có ⇔ phiếu Đã giao.
  due_snapshot        INTEGER CHECK (due_snapshot IS NULL OR due_snapshot >= 0),
  created_at          TEXT NOT NULL,
  created_by          TEXT,
  updated_at          TEXT NOT NULL,
  updated_by          TEXT,
  CHECK ((kind_code = 'DELIVERED') = (due_snapshot IS NOT NULL))
);
CREATE INDEX bil_posting_order_ix ON bil_posting(order_id);
-- Mỗi đơn đúng MỘT phiếu Đã giao, tối đa MỘT phiếu Hoàn thành (R-BIL-4 — lưới ở CSDL).
CREATE UNIQUE INDEX bil_posting_one_delivered ON bil_posting(order_id) WHERE kind_code = 'DELIVERED';
CREATE UNIQUE INDEX bil_posting_one_completed ON bil_posting(order_id) WHERE kind_code = 'COMPLETED';

-- ---------- Dòng nợ hai chân (ADR-0026 điều 3, sửa bởi ADR-0057 T3) ----------
CREATE TABLE bil_debt_line (
  id                TEXT PRIMARY KEY,
  posting_id        TEXT NOT NULL REFERENCES bil_posting(id),
  debtor_party_id   TEXT NOT NULL REFERENCES pty_party(id),
  creditor_party_id TEXT NOT NULL REFERENCES pty_party(id),
  amount            INTEGER NOT NULL CHECK (amount > 0),
  kind_code         TEXT NOT NULL REFERENCES bil_debt_kind(code),
  order_id          TEXT REFERENCES orders(id),
  -- ADR-0057 T3: nguồn là chuyến xe (van-chuyen) — CỘT DỰ TRỮ, không khoá ngoại; lượt 1 luôn trống (trigger bil_debt_line_trip_not_yet).
  trip_id           TEXT,
  order_service_id  TEXT REFERENCES order_service(id),
  receipt_id        TEXT REFERENCES bil_payment_receipt(id),
  reverses_line_id  TEXT UNIQUE REFERENCES bil_debt_line(id),
  created_at        TEXT NOT NULL,
  created_by        TEXT,
  updated_at        TEXT NOT NULL,
  updated_by        TEXT,
  CHECK (debtor_party_id <> creditor_party_id),
  -- Đúng MỘT nguồn: đơn HOẶC chuyến (ADR-0057 D1).
  CHECK ((order_id IS NULL) <> (trip_id IS NULL)),
  -- Dòng theo chuyến không mang dòng dịch vụ / lần thu (ADR-0057 T3 D1).
  CHECK (trip_id IS NULL OR (order_service_id IS NULL AND receipt_id IS NULL))
);
CREATE INDEX bil_debt_line_posting_ix ON bil_debt_line(posting_id);
CREATE INDEX bil_debt_line_order_ix ON bil_debt_line(order_id);
CREATE INDEX bil_debt_line_debtor_ix ON bil_debt_line(debtor_party_id);
CREATE INDEX bil_debt_line_creditor_ix ON bil_debt_line(creditor_party_id);

-- ---------- View công bố (chỉ khoá + số) ----------
-- Lần thu CÒN HIỆU LỰC = không phải dòng đảo và chưa bị đảo (bỏ cặp gốc/đảo). Đã thu ròng = thu của khách − trả lại khách. Cùng định nghĩa với hàm thuần
-- `conLai` (src/modules/billing/rules.ts) — bài đối chiếu hai nơi trên cùng dữ liệu mẫu.
CREATE VIEW v_bil_order_paid AS
  SELECT r.order_id AS order_id,
         SUM(CASE WHEN r.kind_code = 'CUSTOMER_REFUND' THEN -r.amount ELSE r.amount END) AS paid_net,
         SUM(CASE WHEN r.collector_role_code = 'UNKNOWN' THEN 1 ELSE 0 END) AS unknown_count
  FROM bil_payment_receipt r
  WHERE r.reverses_id IS NULL AND NOT EXISTS (SELECT 1 FROM bil_payment_receipt x WHERE x.reverses_id = r.id)
  GROUP BY r.order_id;
-- Số dư từng cặp bên theo đơn: dương = party_id nợ counterparty_id (gộp cả dòng đảo — dòng đảo đổi chỗ hai bên nên tự triệt tiêu).
CREATE VIEW v_bil_party_balance AS
  SELECT d.party_id AS party_id, d.counterparty_id AS counterparty_id, d.order_id AS order_id, SUM(d.so) AS balance
  FROM (
    SELECT debtor_party_id AS party_id, creditor_party_id AS counterparty_id, order_id, amount AS so FROM bil_debt_line
    UNION ALL
    SELECT creditor_party_id, debtor_party_id, order_id, -amount FROM bil_debt_line
  ) d
  GROUP BY d.party_id, d.counterparty_id, d.order_id;

-- ---------- CHUYỂN CỌC CŨ (ADR-0026 điều 9; Q3 chủ trả lời 30/9) — câu MỘT LẦN, đọc cột của orders (ghi rõ ở sổ dữ liệu). Chạy SAU CREATE TABLE,
-- TRƯỚC trigger chỉ-thêm (khuôn 0034). Mỗi đơn có deposit_amount > 0 (kể cả đơn đã huỷ) → ĐÚNG MỘT lần thu: thu của khách, trả trước, người thu CHƯA RÕ
-- (NULL + UNKNOWN), hình thức = upper(deposit_method) (NULL → OTHER — Q3), thu cho = công ty chủ (v_pty_owner_company; vắng → NOT NULL chặn cả migration,
-- không bao giờ chèn thiếu), ngày phát sinh = ngày tạo đơn theo giờ VN (Q3: created_at UTC + 7 giờ, VN không đổi giờ mùa hè), người ghi 'he-thong'.
-- Không dòng nợ (người thu chưa rõ ⇒ không biết ai nợ; Kế toán đảo rồi ghi lại đúng người thu — ADR-0026 đ9).
INSERT INTO bil_payment_receipt (
  id, order_id, kind_code, amount, collector_party_id, collector_role_code, method_code, collected_for_party_id, stage_code, occurred_date, reverses_id, note,
  created_at, created_by, updated_at, updated_by
)
SELECT
  lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(6))),
  o.id, 'CUSTOMER_PAYMENT', o.deposit_amount, NULL, 'UNKNOWN', COALESCE(upper(o.deposit_method), 'OTHER'),
  (SELECT party_id FROM v_pty_owner_company LIMIT 1), 'PREPAID', date(o.created_at, '+7 hours'), NULL, NULL,
  '2026-09-30T00:00:00.000Z', 'he-thong', '2026-09-30T00:00:00.000Z', 'he-thong'
FROM orders o
WHERE o.deposit_amount > 0;

-- ---------- Chỉ-thêm (ADR-0026 điều 6) ----------
CREATE TRIGGER bil_payment_receipt_no_update BEFORE UPDATE ON bil_payment_receipt
BEGIN SELECT RAISE(ABORT, 'bil_append_only: lần thu không sửa được — sai thì ghi dòng đảo'); END;
CREATE TRIGGER bil_payment_receipt_no_delete BEFORE DELETE ON bil_payment_receipt
BEGIN SELECT RAISE(ABORT, 'bil_append_only: lần thu không xoá được — sai thì ghi dòng đảo'); END;
CREATE TRIGGER bil_posting_no_update BEFORE UPDATE ON bil_posting
BEGIN SELECT RAISE(ABORT, 'bil_append_only: phiếu sổ không sửa được'); END;
CREATE TRIGGER bil_posting_no_delete BEFORE DELETE ON bil_posting
BEGIN SELECT RAISE(ABORT, 'bil_append_only: phiếu sổ không xoá được'); END;
CREATE TRIGGER bil_debt_line_no_update BEFORE UPDATE ON bil_debt_line
BEGIN SELECT RAISE(ABORT, 'bil_append_only: dòng nợ không sửa được — sai thì ghi dòng đảo'); END;
CREATE TRIGGER bil_debt_line_no_delete BEFORE DELETE ON bil_debt_line
BEGIN SELECT RAISE(ABORT, 'bil_append_only: dòng nợ không xoá được — sai thì ghi dòng đảo'); END;

-- ---------- Dòng đảo khớp gốc ----------
-- Lần thu đảo: cùng đơn, cùng loại, cùng số; gốc không phải dòng đảo. (Mỗi gốc tối đa một lần — UNIQUE reverses_id.)
CREATE TRIGGER bil_payment_receipt_reversal_match BEFORE INSERT ON bil_payment_receipt
WHEN NEW.reverses_id IS NOT NULL AND NOT EXISTS (
  SELECT 1 FROM bil_payment_receipt g WHERE g.id = NEW.reverses_id AND g.reverses_id IS NULL AND g.order_id = NEW.order_id
    AND g.kind_code = NEW.kind_code AND g.amount = NEW.amount)
BEGIN SELECT RAISE(ABORT, 'bil_reversal: dòng đảo phải cùng đơn, cùng loại, cùng số với dòng gốc (chưa phải dòng đảo)'); END;
-- Dòng nợ đảo: cùng số, ĐỔI CHỖ hai bên, cùng loại, cùng nguồn (đơn/chuyến); gốc không phải dòng đảo.
CREATE TRIGGER bil_debt_line_reversal_match BEFORE INSERT ON bil_debt_line
WHEN NEW.reverses_line_id IS NOT NULL AND NOT EXISTS (
  SELECT 1 FROM bil_debt_line g WHERE g.id = NEW.reverses_line_id AND g.reverses_line_id IS NULL AND g.amount = NEW.amount
    AND g.debtor_party_id = NEW.creditor_party_id AND g.creditor_party_id = NEW.debtor_party_id AND g.kind_code = NEW.kind_code
    AND g.order_id IS NEW.order_id AND g.trip_id IS NEW.trip_id)
BEGIN SELECT RAISE(ABORT, 'bil_reversal: dòng đảo phải cùng số, đổi chỗ hai bên, cùng loại, cùng nguồn với dòng gốc (chưa phải dòng đảo)'); END;

-- ADR-0057 (duyệt 30/9): lượt 1 mọi dòng nợ vẫn gắn đơn — dòng chỉ có chuyến bị chặn tới lượt Vận chuyển tiền xe.
CREATE TRIGGER bil_debt_line_trip_not_yet BEFORE INSERT ON bil_debt_line
WHEN NEW.trip_id IS NOT NULL
BEGIN SELECT RAISE(ABORT, 'bil_trip_not_yet: dòng nợ theo chuyến xe chưa dùng ở lượt 1'); END;

-- Điều chỉnh / đảo: lý do bắt buộc (ADR-0026 điều 8). Phiếu Đã giao / Hoàn thành / Lần thu / Hoàn khách / Công ty đã nhận luôn gắn một đơn.
CREATE TRIGGER bil_posting_reason_required BEFORE INSERT ON bil_posting
WHEN NEW.kind_code IN ('ADJUSTMENT', 'REVERSAL') AND (NEW.reason IS NULL OR length(trim(NEW.reason)) = 0)
BEGIN SELECT RAISE(ABORT, 'bil_reason_required: điều chỉnh / đảo phải có lý do'); END;
CREATE TRIGGER bil_posting_order_required BEFORE INSERT ON bil_posting
WHEN NEW.kind_code IN ('DELIVERED', 'COMPLETED', 'RECEIPT', 'REFUND', 'COMPANY_RECEIVED') AND NEW.order_id IS NULL
BEGIN SELECT RAISE(ABORT, 'bil_order_required: phiếu loại này phải gắn một đơn'); END;

-- ---------- Kiểm tiền TRONG lô ghi (kế hoạch §3.3, cách vá C1/V1 — RAISE ⇒ cả db.batch() huỷ, spike R1 đạt trên D1 local 30/9) ----------
-- "Đã giao": tổng lần thu còn hiệu lực của đơn phải BẰNG ĐÚNG phải thu máy chủ chụp lúc bấm (due_snapshot), và không còn lần thu người thu "chưa rõ"
-- (ADR-0025 điều 3d, 3e). Lần thu nhập ngay ở bước Đã giao nằm TRƯỚC phiếu này trong cùng lô nên đã được tính.
CREATE TRIGGER bil_posting_delivered_paid BEFORE INSERT ON bil_posting
WHEN NEW.kind_code = 'DELIVERED' AND (
  COALESCE((SELECT SUM(CASE WHEN r.kind_code = 'CUSTOMER_REFUND' THEN -r.amount ELSE r.amount END) FROM bil_payment_receipt r
            WHERE r.order_id = NEW.order_id AND r.reverses_id IS NULL AND NOT EXISTS (SELECT 1 FROM bil_payment_receipt x WHERE x.reverses_id = r.id)), 0)
    IS NOT NEW.due_snapshot
  OR EXISTS (SELECT 1 FROM bil_payment_receipt r WHERE r.order_id = NEW.order_id AND r.collector_role_code = 'UNKNOWN' AND r.reverses_id IS NULL
             AND NOT EXISTS (SELECT 1 FROM bil_payment_receipt x WHERE x.reverses_id = r.id)))
BEGIN SELECT RAISE(ABORT, 'delivered_not_paid: đã thu chưa khớp phải thu, hoặc còn lần thu chưa rõ người thu'); END;

-- "Hoàn thành": không còn bên nào NỢ công ty chủ vì đơn này (số họ nợ công ty − số công ty nợ họ > 0 ⇒ chặn), kể cả khoản "Công ty thu – CK" do người
-- không phải Kế toán khai mà Kế toán chưa xác nhận (vẫn là dòng giữ hộ trên người khai — H3). Khoản công ty còn phải trả KHÔNG chặn (ADR-0025 điều 7).
CREATE TRIGGER bil_posting_completed_settled BEFORE INSERT ON bil_posting
WHEN NEW.kind_code = 'COMPLETED' AND EXISTS (
  SELECT 1 FROM (
    SELECT CASE WHEN l.creditor_party_id IN (SELECT party_id FROM v_pty_owner_company) THEN l.debtor_party_id ELSE l.creditor_party_id END AS ben,
           SUM(CASE WHEN l.creditor_party_id IN (SELECT party_id FROM v_pty_owner_company) THEN l.amount ELSE -l.amount END) AS no_cong_ty
    FROM bil_debt_line l
    WHERE l.order_id = NEW.order_id
      AND (l.creditor_party_id IN (SELECT party_id FROM v_pty_owner_company) OR l.debtor_party_id IN (SELECT party_id FROM v_pty_owner_company))
    GROUP BY ben
  ) WHERE no_cong_ty > 0)
BEGIN SELECT RAISE(ABORT, 'completed_unsettled: còn người đang giữ tiền của công ty vì đơn này'); END;
