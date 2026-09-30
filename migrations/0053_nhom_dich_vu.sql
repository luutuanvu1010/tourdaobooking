-- ADR-0058 (accepted 2026-09-30, lượt 1a) — nhóm dịch vụ của danh mục: module catalog, tiền tố ctl_.
-- Gieo MỘT LẦN từ ảnh chụp CSV Sheet 2026-09-30 (sha256 6a06864f…f713; kiểm lại ở Task A0 cùng sha). Mã app KHÔNG đọc cột "Ghi chú nội bộ" / cột 14 của Sheet:
-- đây là chữ viết sẵn trong tệp này; sau đó nhóm do Quản trị quản lý trong app, đồng bộ Sheet không đụng tới.
-- ATV: CSV ghi mã nhóm TBA (lỗi) trong khi tên nhóm là "Kong Forest" → gieo vào KON (ADR-0058, chỗ lỗi ATV).
--
-- ctl_group: nhóm, không xoá (trigger); tên trùng chỉ cấm giữa các nhóm ĐANG DÙNG (chỉ mục duy nhất một phần).
-- ctl_service_group: LỊCH SỬ gán nhóm, chỉ thêm (seq tăng dần theo từng dịch vụ); dòng có seq lớn nhất = nhóm hiện hành; group_code NULL = "Chưa phân loại".
--   Không cascade; gán vào nhóm đang tắt bị chặn ở CSDL; service_code phải có trong catalog_item (mã ngoài Sheet không gán được).

CREATE TABLE ctl_group (
  code        TEXT PRIMARY KEY,
  name        TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 40),
  sort_order  INTEGER NOT NULL,
  active      INTEGER NOT NULL CHECK (active IN (0, 1)),
  created_at  TEXT NOT NULL,
  created_by  TEXT,
  updated_at  TEXT NOT NULL,
  updated_by  TEXT
);
CREATE UNIQUE INDEX ctl_group_name_active ON ctl_group (name) WHERE active = 1;
CREATE TRIGGER ctl_group_no_delete BEFORE DELETE ON ctl_group
BEGIN SELECT RAISE(ABORT, 'ctl_append_only: nhóm dịch vụ không xoá được — tắt nhóm'); END;

CREATE TABLE ctl_service_group (
  id            TEXT PRIMARY KEY,
  service_code  TEXT NOT NULL REFERENCES catalog_item (code),
  group_code    TEXT REFERENCES ctl_group (code),
  seq           INTEGER NOT NULL CHECK (seq >= 1),
  valid_from_at TEXT NOT NULL,
  created_at    TEXT NOT NULL,
  created_by    TEXT,
  updated_at    TEXT NOT NULL,
  updated_by    TEXT,
  UNIQUE (service_code, seq)
);
CREATE TRIGGER ctl_service_group_no_update BEFORE UPDATE ON ctl_service_group
BEGIN SELECT RAISE(ABORT, 'ctl_append_only: lịch sử nhóm chỉ thêm'); END;
CREATE TRIGGER ctl_service_group_no_delete BEFORE DELETE ON ctl_service_group
BEGIN SELECT RAISE(ABORT, 'ctl_append_only: lịch sử nhóm chỉ thêm'); END;
CREATE TRIGGER ctl_service_group_active_group BEFORE INSERT ON ctl_service_group
WHEN NEW.group_code IS NOT NULL AND NOT EXISTS (SELECT 1 FROM ctl_group g WHERE g.code = NEW.group_code AND g.active = 1)
BEGIN SELECT RAISE(ABORT, 'ctl_group_inactive: nhóm đang tắt'); END;

-- Gieo 14 nhóm theo thứ tự bảng ADR. Mốc có mili-giây (so chuỗi ISO UTC).
INSERT INTO ctl_group (code, name, sort_order, active, created_at, created_by, updated_at, updated_by)
SELECT v.code, v.name, v.sort_order, 1, strftime('%Y-%m-%dT%H:%M:%fZ','now'), NULL, strftime('%Y-%m-%dT%H:%M:%fZ','now'), NULL
FROM (WITH v(code, name, sort_order) AS (VALUES
  ('TDA','Tour đảo',1),
  ('LPH','Long Phú',2),
  ('HTA','Hòn Tằm',3),
  ('VHB','Harbour',4),
  ('VIN','Vinwonders',5),
  ('DTH','Du thuyền',6),
  ('TTB','Thể thao biển',7),
  ('IRS','I Resort',8),
  ('KON','Kong Forest',9),
  ('TTR','Trăm trứng',10),
  ('NHD','Nhà hát Đó',11),
  ('TBA','Tháp Bà',12),
  ('TXE','Thuê xe',13),
  ('BUS','Buýt City Tour',14)
) SELECT * FROM v) v;

-- Gieo 110 cặp (mã dịch vụ, mã nhóm). JOIN catalog_item: mã chưa có trên D1 (chưa đồng bộ Sheet) thì bỏ qua,
-- không lỗi khoá ngoại; mã mới trên Sheet không có trong danh sách này thì ở lại "Chưa phân loại" (không có dòng gán).
WITH v(code, group_code) AS (VALUES
  ('TDMCT1','TDA'), ('TDMCM','TDA'), ('TDMCT2','TDA'), ('TD1','TDA'), ('TD2','TDA'),
  ('TDTCT','TDA'), ('TDTCSH','TDA'), ('TDSNO','TDA'), ('TDMCS','TDA'), ('TDTCS','TDA'),
  ('TDSCT','TDA'), ('LPCBT','LPH'), ('LPCB','LPH'), ('LPDK','LPH'), ('LPHL','LPH'),
  ('LPDKHL','LPH'), ('SM3','HTA'), ('SD3','HTA'), ('SD1','HTA'), ('SM1','HTA'),
  ('VHB','VHB'), ('VHBT','VHB'), ('VHBTB','VHB'), ('V2D','VIN'), ('V3D','VIN'),
  ('V16','VIN'), ('VB16','VIN'), ('VTC','VIN'), ('VB350','VIN'), ('VB500','VIN'),
  ('DTE1','DTH'), ('DTE2','DTH'), ('DTMSC','DTH'), ('DTMTY','DTH'), ('DTVYDT','DTH'),
  ('DTVYST','DTH'), ('TTBSNO','TTB'), ('TTBPC','TTB'), ('TTBDD2','TTB'), ('TTBFLY','TTB'),
  ('TTBL215','TTB'), ('TTBSW','TTB'), ('TTBSD','TTB'), ('TTBDD1','TTB'), ('TTBL230','TTB'),
  ('TTBL260','TTB'), ('TTBL115','TTB'), ('TTBL130','TTB'), ('TTBL160','TTB'), ('TTBPP5','TTB'),
  ('TTBPR5','TTB'), ('TTBPR8','TTB'), ('TTBPB','TTB'), ('TTBLV','TTB'), ('TTBS30','TTB'),
  ('TTBS60','TTB'), ('TTBS90','TTB'), ('TTBTD30','TTB'), ('TTBTD60','TTB'), ('IRTK','IRS'),
  ('IRTKA','IRS'), ('IRTD1','IRS'), ('IRTD4','IRS'), ('IRTB1','IRS'), ('IRTB4','IRS'),
  ('IRTBTD1','IRS'), ('IRTBTD4','IRS'), ('IRTBTDA1','IRS'), ('IRTBTDA4','IRS'), ('ZIP','KON'),
  ('ZA1','KON'), ('ZA2','KON'), ('ATV','KON'), ('TTKP','TTR'), ('TTTG','TTR'),
  ('TTTT','TTR'), ('TTKPA','TTR'), ('TTTGA','TTR'), ('TTTHA','TTR'), ('NHDRMD','NHD'),
  ('NHDRMT','NHD'), ('NHDRMZ','NHD'), ('NHDCSD','NHD'), ('NHDCST','NHD'), ('NHDCSZ','NHD'),
  ('TBTK','TBA'), ('TBTD1','TBA'), ('TBTD3','TBA'), ('TBTD6','TBA'), ('TBTB1','TBA'),
  ('TBTB3','TBA'), ('TBTB6','TBA'), ('TBTBTD1','TBA'), ('TBTBTD3','TBA'), ('TBTBTD6','TBA'),
  ('TBNS1','TBA'), ('TBNS2','TBA'), ('TBNS3','TBA'), ('SB16D','TXE'), ('SB7D','TXE'),
  ('SB4D','TXE'), ('SB16T','TXE'), ('SB4T','TXE'), ('SB7T','TXE'), ('BCT1','BUS'),
  ('BCT4','BUS'), ('BCT24','BUS'), ('BFN1','BUS'), ('BFN4','BUS'), ('BFNP','BUS')
)
INSERT INTO ctl_service_group (id, service_code, group_code, seq, valid_from_at, created_at, created_by, updated_at, updated_by)
SELECT 'gieo-' || v.code, v.code, v.group_code, 1, strftime('%Y-%m-%dT%H:%M:%fZ','now'), strftime('%Y-%m-%dT%H:%M:%fZ','now'), NULL, strftime('%Y-%m-%dT%H:%M:%fZ','now'), NULL
FROM v JOIN catalog_item i ON i.code = v.code;

-- Một dòng nhật ký (không gắn đơn, không gắn người). detail chỉ là số đếm.
INSERT INTO audit_log (id, order_id, staff_id, action, target_type, target_id, detail, created_at)
VALUES ('gieo-nhom-dich-vu', NULL, NULL, 'catalog_groups_seeded', 'catalog', NULL,
        'gieo ' || (SELECT COUNT(*) FROM ctl_group) || ' nhóm, ' || (SELECT COUNT(*) FROM ctl_service_group) || ' dịch vụ',
        strftime('%Y-%m-%dT%H:%M:%fZ','now'));
