-- Module: company (singleton, đúng 1 dòng id = 'default')
CREATE TABLE company_profile (
  id           TEXT PRIMARY KEY CHECK (id = 'default'),
  company_name TEXT NOT NULL,
  tax_code     TEXT NOT NULL,
  address      TEXT NOT NULL,
  hotline      TEXT NOT NULL,
  zalo_number  TEXT,
  email        TEXT,
  logo_url     TEXT,
  updated_at   TEXT NOT NULL,
  updated_by   TEXT REFERENCES staff(id)
);

INSERT INTO company_profile (id, company_name, tax_code, address, hotline, zalo_number, updated_at)
VALUES (
  'default',
  'CÔNG TY TNHH TOUR ĐẢO',
  '4201969169',
  '19 Đường B2, Khu đô thị Vĩnh Điềm Trung, Phường Tây Nha Trang, Tỉnh Khánh Hoà',
  '0845 256 256',
  '0845 256 256',
  strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
);
