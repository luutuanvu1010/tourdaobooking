-- Migration 0014 — phân công: người phụ trách đơn (module dispatch, tiền tố dsp_). ADR-0006 (điều 1–4, 8), ADR-0009 (điều 4), ADR-0003, ADR-0002.
-- Chỉ THÊM: không sửa/xoá đối tượng nào của 0001…0013 (mã cũ vẫn chạy nguyên vẹn). Cửa MỘT CHIỀU (ADR-0006): dsp_assignment dựng ĐỦ cột một lần — cả hạt dịch vụ
-- (`order_service_id`) — để N2 không phải dựng lại. Ở bản này mã CHỈ ghi hạt đơn (`order_id`) với loại việc HANDLE (người phụ trách); hạt dịch vụ chờ N2 đổi
-- `updateDraftOrder` sang so khớp theo id (ADR-0006 điều 1: khoá ngoại NO ACTION tới order_service làm câu DELETE xoá-rồi-chèn-lại hiện tại thất bại nếu có dòng hạt dịch vụ).
-- Khoá ngoại đều NO ACTION (ADR-0003 điều 4); không xoá cứng — đổi người = đóng dòng cũ (`valid_to_at`) và mở dòng mới (ADR-0003 điều 8).

-- Bảng tra cứu khoá mã (ADR-0003 điều 1, 3): thêm loại việc/trạng thái = thêm một dòng, không sửa schema hay mã.
CREATE TABLE dsp_task_kind (
  code       TEXT PRIMARY KEY CHECK (code = upper(code)),
  name       TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active     INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1))
);
-- Bản này chỉ dùng HANDLE; ba loại còn lại gieo sẵn cho N2 (đón, tiễn, lái cano).
INSERT INTO dsp_task_kind (code, name, sort_order) VALUES
  ('HANDLE', 'Phụ trách', 1), ('PICKUP', 'Đón khách', 2), ('DROPOFF', 'Tiễn khách', 3), ('BOAT', 'Lái cano', 4);

-- Chỉ PENDING và DONE (ADR-0006 điều 2): huỷ một việc = đóng dòng (`valid_to_at`), không có trạng thái CANCELLED.
CREATE TABLE dsp_assignment_status (
  code       TEXT PRIMARY KEY CHECK (code = upper(code)),
  name       TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active     INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1))
);
INSERT INTO dsp_assignment_status (code, name, sort_order) VALUES ('PENDING', 'Chờ thực hiện', 1), ('DONE', 'Đã xong', 2);

-- Một dòng = một người được giao một việc, thuộc ĐÚNG MỘT phạm vi: cả đơn (`order_id`) hoặc một dịch vụ (`order_service_id`).
--   Người phụ trách (điều 3) = dòng HANDLE hạt đơn; nhiệm vụ (điều 4) = dòng hạt dịch vụ, một dịch vụ có nhiều nhiệm vụ đang mở.
CREATE TABLE dsp_assignment (
  id               TEXT PRIMARY KEY,
  order_id         TEXT REFERENCES orders(id),                                    -- hạt đơn (module orders: cạnh dispatch → orders)
  order_service_id TEXT REFERENCES order_service(id),                             -- hạt dịch vụ (chưa ghi ở bản này)
  task_kind_code   TEXT NOT NULL REFERENCES dsp_task_kind(code),
  party_id         TEXT NOT NULL REFERENCES pty_party(id),                        -- người được giao (cạnh dispatch → parties)
  role_type_code   TEXT REFERENCES pty_role_type(code),                           -- nhãn vai LÚC GÁN — KHÔNG gating (ADR-0001 mục 4), không suy ngược ra danh bạ
  location_id      TEXT REFERENCES loc_location(id),                              -- nơi trong danh mục (cạnh dispatch → locations); NULL nếu là điểm tự do
  place_text       TEXT CHECK (place_text IS NULL OR length(trim(place_text)) BETWEEN 1 AND 200),   -- điểm tự do, vd khách sạn
  scheduled_date   TEXT CHECK (date(scheduled_date) IS scheduled_date),           -- YYYY-MM-DD, giờ Việt Nam; NULL = chưa chốt
  scheduled_time   TEXT CHECK (scheduled_time IS NULL OR scheduled_time GLOB '[01][0-9]:[0-5][0-9]' OR scheduled_time GLOB '2[0-3]:[0-5][0-9]'),
  status_code      TEXT NOT NULL DEFAULT 'PENDING' REFERENCES dsp_assignment_status(code),
  done_at          TEXT,                                                          -- UTC; lúc DONE
  valid_from_at    TEXT NOT NULL,                                                 -- hiệu lực cấp thời điểm, UTC (ADR-0003 điều 7)
  valid_to_at      TEXT CHECK (valid_to_at IS NULL OR valid_to_at >= valid_from_at),   -- NULL = đang mở
  created_at       TEXT NOT NULL,
  created_by       TEXT,                                                          -- cột WHO: TEXT NULL, KHÔNG khoá ngoại (ADR-0003 điều 6); NULL = hệ thống
  updated_at       TEXT NOT NULL,
  updated_by       TEXT,
  CONSTRAINT dsp_assignment_grain_ck CHECK ((order_id IS NULL) <> (order_service_id IS NULL)),
  -- HANDLE là dòng hạt đơn (điều 3). Không chốt ở đây thì một HANDLE hạt dịch vụ có order_id NULL và lọt qua chỉ mục duy nhất bên dưới (NULL không trùng NULL).
  CONSTRAINT dsp_assignment_handle_grain_ck CHECK (task_kind_code <> 'HANDLE' OR order_id IS NOT NULL)
);
CREATE INDEX dsp_assignment_order_ix   ON dsp_assignment(order_id);
CREATE INDEX dsp_assignment_service_ix ON dsp_assignment(order_service_id);
CREATE INDEX dsp_assignment_party_ix   ON dsp_assignment(party_id);
-- Tối đa MỘT người phụ trách đang mở cho mỗi đơn (điều 3). Chỉ mục duy nhất có điều kiện chỉ ràng dòng đang mở (ADR-0003 điều 7): lịch sử đã đóng thì tuỳ ý.
-- CỐ Ý không có trigger chống chồng lấn khoảng đã đóng: đổi người là đóng dòng cũ và mở dòng mới CÙNG MỘT thời điểm trong một `db.batch()` (điều 3),
-- mà vị từ chồng lấn mẫu của ADR-0003 điều 7 coi hai đầu mút trùng nhau là chồng lấn nên sẽ chặn chính đường đổi người này.
CREATE UNIQUE INDEX dsp_assignment_handler_open_uq ON dsp_assignment(order_id)
  WHERE task_kind_code = 'HANDLE' AND valid_to_at IS NULL;

-- View công bố cho nơi cần nhãn người phụ trách (danh sách đơn, xác nhận đơn) và cho hàm "đang được giao" (ADR-0007 điều 4(b)).
-- Đọc hồ sơ/tài khoản CHỈ qua view công bố của module chủ (v_pty_party_label, v_stf_staff_label — ADR-0002 điều 3). LEFT JOIN tài khoản: người phụ trách là
-- hồ sơ, có thể chưa/không còn tài khoản (staff_id NULL). staff.party_id duy nhất (staff_party_uq) nên JOIN không nhân đôi dòng.
CREATE VIEW v_dsp_order_handler AS
  SELECT a.order_id      AS order_id,
         a.party_id      AS party_id,
         s.id            AS staff_id,
         p.display_name  AS label,
         a.valid_from_at AS since
  FROM dsp_assignment a
  JOIN v_pty_party_label p ON p.id = a.party_id
  LEFT JOIN v_stf_staff_label s ON s.party_id = a.party_id
  WHERE a.task_kind_code = 'HANDLE' AND a.valid_to_at IS NULL;

-- Backfill (ADR-0009 điều 4): MỌI đơn hiện có (mọi trạng thái) có một dòng HANDLE đang mở là người lập đơn (qua `staff.party_id`), hiệu lực từ lúc lập đơn.
-- Id xác định ('dsp-h-' || id đơn, như 0012). `party_id IS NOT NULL` là phòng thủ có chủ ý: B5 (`staff_party_required`) chưa áp nên tài khoản do mã cũ tạo
-- sau 0012 có thể chưa có hồ sơ; INSERT không có điều kiện này sẽ vi phạm NOT NULL và làm hỏng cả migration. Đơn của tài khoản như vậy tạm chưa có
-- người phụ trách (sẽ nhận qua `dispatch.claim` hoặc do quản trị giao; đơn không có người phụ trách là trạng thái hợp lệ — ADR-0009 điều 2). `created_by` NULL = hệ thống.
INSERT INTO dsp_assignment (id, order_id, task_kind_code, party_id, status_code, valid_from_at, created_at, updated_at)
SELECT 'dsp-h-' || o.id, o.id, 'HANDLE', s.party_id, 'PENDING', o.created_at,
       strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
FROM orders o JOIN staff s ON s.id = o.staff_id
WHERE s.party_id IS NOT NULL;
