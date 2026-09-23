# Thiết kế Sơ đồ Party + Relationship (Trading Community Architecture - TCA)

Mô hình thiết kế cơ sở dữ liệu (Database Schema) dựa trên triết lý **Trading Community Architecture (TCA)** của Oracle, giúp tách biệt hoàn toàn định danh thực thể khỏi vai trò thương mại.

---

## I. Sơ đồ Cấu trúc Tổng quan (Entity Relationship Diagram)

```text
                     +-----------------------+
                     |        PARTIES        |
                     |  (Person/Organization)|
                     +-----------+-----------+
                                 | 1
                                 |
                                 | N
                     +-----------v-----------+
                     |  PARTY_RELATIONSHIPS  |
                     | (Customer/Supplier/..) |
                     +-----------+-----------+
                                 | 1
                   +-------------+-------------+
                   | N                         | N
        +----------v----------+     +----------v----------+
        |  CUSTOMER_ACCOUNTS  |     |     PARTY_SITES     |
        |  (P&L, Credit Line) |     |  (Ship-To/Bill-To)  |
        +----------+----------+     +----------+----------+
                   | 1                         | 1
                   | N                         | N
        +----------v----------+                |
        |    ACCOUNT_SITES    |<---------------+
        | (Account Location)  |
        +---------------------+
```

---

## II. Schema CSDL Mẫu (SQL DDL)

### 1. Bảng Thực thể Gốc (`parties`)
Đại diện cho bất kỳ cá nhân hoặc tổ chức nào tồn tại trong thực tế.

```sql
CREATE TABLE parties (
    party_id          BIGINT PRIMARY KEY,
    party_number      VARCHAR(50) UNIQUE NOT NULL, -- Mã định danh toàn hệ thống
    party_type        VARCHAR(20) NOT NULL CHECK (party_type IN ('PERSON', 'ORGANIZATION')),
    party_name        VARCHAR(255) NOT NULL,
    tax_identifier    VARCHAR(50), -- Mã số thuế / CCCD
    status            VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'MERGED')),
    created_at        TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### 2. Bảng Mối quan hệ & Vai trò (`party_relationships`)
Định nghĩa ngữ cảnh và vai trò thương mại của `Party`.

```sql
CREATE TABLE party_relationships (
    relationship_id   BIGINT PRIMARY KEY,
    subject_party_id  BIGINT NOT NULL REFERENCES parties(party_id), -- Thực thể chính
    object_party_id   BIGINT REFERENCES parties(party_id),  -- Thực thể liên quan (ví dụ: công ty mẹ)
    relationship_code VARCHAR(50) NOT NULL, -- 'CUSTOMER', 'SUPPLIER', 'PARTNER', 'AFFILIATE'
    start_date        DATE NOT NULL,
    end_date          DATE,
    status            VARCHAR(20) DEFAULT 'ACTIVE',
    CONSTRAINT unique_party_relationship UNIQUE (subject_party_id, object_party_id, relationship_code, start_date)
);
```

### 3. Bảng Tài khoản Giao dịch (`customer_accounts`)
Quản lý hợp đồng thương mại, hạn mức công nợ và điều khoản thanh toán gắn với mối quan hệ khách hàng.

```sql
CREATE TABLE customer_accounts (
    account_id        BIGINT PRIMARY KEY,
    party_id          BIGINT NOT NULL REFERENCES parties(party_id),
    relationship_id   BIGINT REFERENCES party_relationships(relationship_id),
    account_number    VARCHAR(50) UNIQUE NOT NULL,
    account_name      VARCHAR(255) NOT NULL,
    credit_limit      DECIMAL(18, 2) DEFAULT 0.00,
    payment_terms     VARCHAR(50) DEFAULT 'NET30',
    status            VARCHAR(20) DEFAULT 'ACTIVE',
    created_at        TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### 4. Bảng Địa điểm & Địa chỉ (`locations` & `party_sites`)
Tách rời vị trí địa lý vật lý khỏi địa chỉ sử dụng trong giao dịch.

```sql
-- Vị trí địa lý thực tế
CREATE TABLE locations (
    location_id       BIGINT PRIMARY KEY,
    address_line1     VARCHAR(255) NOT NULL,
    city              VARCHAR(100) NOT NULL,
    country_code      VARCHAR(10) NOT NULL,
    postal_code       VARCHAR(20)
);

-- Liên kết Địa điểm với Party theo mục đích (Ship-To, Bill-To)
CREATE TABLE party_sites (
    party_site_id     BIGINT PRIMARY KEY,
    party_id          BIGINT NOT NULL REFERENCES parties(party_id),
    location_id       BIGINT NOT NULL REFERENCES locations(location_id),
    site_name         VARCHAR(100), -- Ví dụ: "Kho Bắc Ninh", "Trụ sở chính"
    is_bill_to        BOOLEAN DEFAULT FALSE,
    is_ship_to        BOOLEAN DEFAULT FALSE,
    status            VARCHAR(20) DEFAULT 'ACTIVE'
);
```

---

## III. Các Quy tắc Bất biến (Invariants) & Ràng buộc Toàn vẹn

1. **Ràng buộc Tham chiếu Không Mồ côi (Referential Integrity):** Không thể tạo `customer_account` hay `party_site` nếu không tồn tại `party_id` tương ứng.
2. **Không trùng lặp định danh (Identity Uniqueness):** Mã số thuế (`tax_identifier`) của `ORGANIZATION` phải được kiểm tra trùng lặp ở lớp `parties` trước khi tạo mới.
3. **Quản lý theo Thời gian (Effective Dating):** Các mối quan hệ (`party_relationships`) có `start_date` và `end_date` để bảo toàn dữ liệu lịch sử khi đối tác thay đổi vai trò hoặc dừng hợp tác.

---

## IV. Ví dụ Thực tế (Data Walkthrough)

Giả sử doanh nghiệp của bạn giao dịch với **Công ty A**:
* **Lớp `parties`:** Tạo **1 bản ghi duy nhất** cho Công ty A (`party_id = 101`, `party_name = 'Công ty A'`).
* **Lớp `party_relationships`:**
  * Tạo bản ghi 1: `subject_party_id = 101`, `relationship_code = 'CUSTOMER'`.
  * Tạo bản ghi 2: `subject_party_id = 101`, `relationship_code = 'SUPPLIER'`.
* **Kết quả:** Khi Công ty A mua hàng, hệ thống trỏ về `customer_accounts` của `party_id = 101`. Khi Công ty A bán nguyên vật liệu cho bạn, hệ thống trỏ về sổ Mua hàng (`Procurement/AP`) của cùng `party_id = 101`. Dữ liệu tên, mã số thuế và địa chỉ trụ sở luôn đồng bộ 100% mà không bị phân tán.
