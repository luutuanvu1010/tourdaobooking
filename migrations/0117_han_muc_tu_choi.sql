-- Migration — ADR-0032 (accepted 2026-10-23): bộ đếm sự kiện phân công + hạn mức «Từ chối» của hướng dẫn viên. Module dispatch (tiền tố dsp_). CHỈ THÊM.
-- Kế hoạch docs/superpowers/plans/2026-10-23-han-muc-tu-choi-thi-cong.md mục 2. Số tệp = số lớn nhất trên main lúc gộp + 1; ai gộp sau tự đổi số (CLAUDE.md §10) —
-- bài kiểm tìm tệp theo ĐUÔI `_han_muc_tu_choi.sql`, id dòng gieo không mang số.
-- Không SĐT / email / tên khách / chữ tự do (Hiến chương 5.12). Không chép dữ liệu cũ: bộ đếm bắt đầu từ 0 ở ngày phát hành (ADR điều 1).
-- Không trigger đọc bộ quyền: luật đếm nằm ở điều kiện của câu ghi (lệch có chủ ý Hiến chương 5.1 — ADR điều 5, docs/SYSTEM-DESIGN.md §16).
-- Cột updated_at / updated_by của hai bảng chỉ-thêm là cột kiểm toán bắt buộc (ADR-0003, bài src/architecture.test.ts) — luôn bằng created_* vì trigger cấm sửa.

-- (1) Loại sự kiện — bảng tra cứu khoá mã (ADR-0003 điều 1; khuôn dsp_task_kind 0014). Không CHECK liệt kê ở bảng sự kiện.
CREATE TABLE dsp_release_kind (
  code       TEXT PRIMARY KEY CHECK (code = upper(code)),
  name       TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active     INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1))
);
INSERT INTO dsp_release_kind (code, name, sort_order) VALUES
  ('CLAIM', 'Tự nhận', 1), ('ASSIGN', 'Được giao', 2), ('REFUSE', 'Từ chối', 3), ('ABORT', 'Tự huỷ đơn', 4), ('RESET', 'Đặt lại', 5);

-- (2) Sổ sự kiện — chỉ thêm (Hiến chương 5.5). `seq` = thứ tự chèn TOÀN BẢNG, máy chủ cấp trong CHÍNH câu chèn (max + 1; D1 chạy lô tuần tự, UNIQUE là lưới):
--     luật «sau dòng đó» (ADR điều 3) so theo `seq`, không so mốc giờ (hai lệnh cùng mili-giây vẫn có thứ tự; rowid không dùng vì VACUUM được đánh lại).
CREATE TABLE dsp_release_event (
  id          TEXT PRIMARY KEY,
  seq         INTEGER NOT NULL CHECK (seq >= 1),
  party_id    TEXT NOT NULL REFERENCES pty_party(id),            -- người (hồ sơ) của sự kiện; cạnh dispatch → parties như dsp_assignment
  order_id    TEXT REFERENCES orders(id),                         -- NULL chỉ ở RESET
  kind_code   TEXT NOT NULL REFERENCES dsp_release_kind(code),
  reason_code TEXT CHECK (reason_code IS NULL OR length(reason_code) BETWEEN 1 AND 40),  -- mã lý do Từ chối (src/shared/ly-do-tu-choi.ts — danh sách kiểm ở MÃ)
  occurred_at TEXT NOT NULL,                                      -- giờ máy chủ, ISO UTC (toISOString)
  created_at  TEXT NOT NULL,
  created_by  TEXT,                                               -- cột WHO: TEXT NULL, KHÔNG khoá ngoại (ADR-0003 điều 6)
  updated_at  TEXT NOT NULL,
  updated_by  TEXT,
  CONSTRAINT dsp_release_event_order_ck  CHECK ((kind_code = 'RESET') = (order_id IS NULL)),
  CONSTRAINT dsp_release_event_reason_ck CHECK ((kind_code = 'REFUSE') = (reason_code IS NOT NULL))
);
CREATE UNIQUE INDEX dsp_release_event_seq_uq         ON dsp_release_event(seq);
CREATE INDEX        dsp_release_event_party_kind_ix  ON dsp_release_event(party_id, kind_code, seq);          -- chuỗi: RESET/REFUSE mới nhất, đếm REFUSE sau mốc
CREATE INDEX        dsp_release_event_party_order_ix ON dsp_release_event(party_id, order_id, kind_code, seq); -- «sau CLAIM/ASSIGN của Y có REFUSE/ABORT của Y không»
CREATE INDEX        dsp_release_event_party_at_ix    ON dsp_release_event(party_id, kind_code, occurred_at);  -- đếm tuần
CREATE INDEX        dsp_release_event_order_ix       ON dsp_release_event(order_id, kind_code, seq);           -- bảng chọn người (ADR điều 10)
CREATE TRIGGER dsp_release_event_no_update BEFORE UPDATE ON dsp_release_event
BEGIN SELECT RAISE(ABORT, 'dsp_release_event_append_only: sổ sự kiện phân công chỉ thêm, không sửa'); END;
CREATE TRIGGER dsp_release_event_no_delete BEFORE DELETE ON dsp_release_event
BEGIN SELECT RAISE(ABORT, 'dsp_release_event_append_only: sổ sự kiện phân công không xoá'); END;

-- (3) Cài đặt hạn mức — chỉ thêm, có hiệu lực (Hiến chương 5.2; khuôn vc_dispatch_policy 0041). Dòng đang dùng = valid_from_at lớn nhất ≤ lúc hỏi.
--     Ba chế độ là danh sách ĐÓNG gắn với mã (khuôn vc_departure_rule.subject) — CHECK được (giả định G2 của kế hoạch).
CREATE TABLE dsp_refuse_policy (
  id              TEXT PRIMARY KEY,
  mode            TEXT NOT NULL CHECK (mode IN ('OFF', 'MEASURE', 'BLOCK')),
  max_consecutive INTEGER NOT NULL CHECK (max_consecutive BETWEEN 1 AND 10),
  max_per_week    INTEGER NOT NULL CHECK (max_per_week BETWEEN 1 AND 100),
  valid_from_at   TEXT NOT NULL UNIQUE,
  created_at      TEXT NOT NULL,
  created_by      TEXT,
  updated_at      TEXT NOT NULL,
  updated_by      TEXT
);
-- Gieo «Chỉ đo» 2/15 (ADR điều 6). created_at của dòng gieo = MỐC PHÁT HÀNH mà kiểm định kỳ R-DSP-5/6 dùng để miễn trừ dòng phụ trách mở trước đó.
INSERT INTO dsp_refuse_policy (id, mode, max_consecutive, max_per_week, valid_from_at, created_at, created_by, updated_at, updated_by)
VALUES ('gieo-han-muc', 'MEASURE', 2, 15, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), NULL, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), NULL);
CREATE TRIGGER dsp_refuse_policy_no_update BEFORE UPDATE ON dsp_refuse_policy
BEGIN SELECT RAISE(ABORT, 'dsp_policy_append_only: cài đặt hạn mức Từ chối chỉ thêm dòng mới, không sửa'); END;
CREATE TRIGGER dsp_refuse_policy_no_delete BEFORE DELETE ON dsp_refuse_policy
BEGIN SELECT RAISE(ABORT, 'dsp_policy_append_only: cài đặt hạn mức Từ chối không xoá'); END;
