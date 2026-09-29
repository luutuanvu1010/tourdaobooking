# THIẾT KẾ KIẾN TRÚC VÀ KẾ HOẠCH TRIỂN KHAI TRANSPORTATION KERNEL CHO TRAVEL ERP

> **Tài liệu Kỹ thuật & Hướng dẫn Triển khai (Technical Specification & Implementation Plan)**  
> **Dự án:** Tích hợp Phân hệ Vận tải Chuyên biệt (Transportation Kernel) vào Hệ thống Enterprise Resource Planning (ERP) Doanh nghiệp Du lịch - Lữ hành.  
> **Nguồn gốc Kiến trúc:** Chưng cất nguyên lý từ Grab, Xanh SM, Uber, SAP TM và ISO 21219 (TMS).

---

## MỤC LỤC
1. [TỔNG QUAN VÀ NGUYÊN TẮC CỐT LÕI](#1-tổng-quan-và-nguyên-tắc-cốt-lõi)
2. [4 THÀNH PHẦN KERNEL CỐT LÕI (THE 4 KERNEL COMPONENTS)](#2-4-thành-phần-kernel-cốt-lõi-the-4-kernel-components)
   - [Component 1: Sổ Nhu cầu (Demand Ledger)](#component-1-sổ-nhu-cầu-demand-ledger)
   - [Component 2: Sổ Năng lực (Capacity Ledger)](#component-2-sổ-năng-lực-capacity-ledger)
   - [Component 3: Sổ Thực thi & Sự thật (Execution & Truth Ledger)](#component-3-sổ-thực-thi--sự-thật-execution--truth-ledger)
   - [Component 4: Hạ tầng Điều khiển & Kernel (Control & Enterprise Infrastructure)](#component-4-hạ-tầng-điều-khiển--kernel-control--enterprise-infrastructure)
   - [Ranh giới Giao tiếp: Service Delivery Record (SDR)](#ranh-giới-giao-tiếp-service-delivery-record-sdr)
3. [THIẾT KẾ CẤU TRÚC DATABASE SCHEMA (POSTGRESQL DDL)](#3-thiết-kế-cấu-trúc-database-schema-postgresql-ddl)
4. [KẾ HOẠCH TRIỂN KHAI CHI TIẾT (IMPLEMENTATION ROADMAP)](#4-kế-hoạch-triển-khai-chi-tiết-implementation-roadmap)
   - [Phân kỳ 1: Thiết lập Data Model & 3 Sổ cái cốt lõi (Tuần 1 - 4)](#phân-kỳ-1-thiết-lập-data-model--3-sổ-cái-cốt-lõi-tuần-1---4)
   - [Phân kỳ 2: Command Gateway, Anti-Conflict & Auto-Dispatch (Tuần 5 - 8)](#phân-kỳ-2-command-gateway-anti-conflict--auto-dispatch-tuần-5---8)
   - [Phân kỳ 3: Xử lý Ngoại lệ (Incident Management) & Reassignment (Tuần 9 - 11)](#phân-kỳ-3-xử-lý-ngoại-lệ-incident-management--reassignment-tuần-9---11)
   - [Phân kỳ 4: SDR, Commercial Engine & Kế toán Subledger (Tuần 12 - 14)](#phân-kỳ-4-sdr-commercial-engine--kế-toán-subledger-tuần-12---14)
5. [QUY TẮC PHÒNG TRÁNH ANTI-PATTERNS (CHECKLIST REVIEW CODE)](#5-quy-tắc-phòng-tránh-anti-patterns-checklist-review-code)

---

## 1. TỔNG QUAN VÀ NGUYÊN TẮC CỐT LÕI

Hệ quản trị vận tải du lịch không hoạt động như một ứng dụng gọi xe taxi tức thời (ride-hailing), mà phục vụ các **cam kết phức tạp lập trước nhiều ngày**, bao gồm tour ghép, tour riêng nhiều ngày, chuỗi điểm dừng (multi-stop) và đối soát đa bên (xe nhà, tài xế cộng tác, nhà xe đối tác thuê ngoài).

Mô hình kiến trúc chuyển đổi cốt lõi dựa trên phương châm:  
**Vận chuyển = Cam kết × Năng lực trên trục thời gian, được chứng minh bằng Sự thật.**

### 3 Nguyên tắc Kiến trúc Không thể Đánh đổi:
1. **Tách biệt 3 Sổ cái (Three Ledgers Separation):** Không dùng một bảng `Booking` hay `Trip` chung cho mọi trạng thái. Tách bạch giữa *Lời hứa với khách (Demand)*, *Thời gian bị giữ của Xe/Tài xế (Capacity)*, và *Sự thật đã xảy ra (Truth)*.
2. **Loại bỏ Trạng thái Rảnh/Bận giả tạo (`vehicle.status = BUSY`):** Trạng thái rảnh/bận của phương tiện và tài xế là **kết quả suy ra từ truy vấn Timeline trên Sổ Reservation**. Chống trùng lịch bằng ràng buộc loại trừ (`EXCLUDE USING gist`) trực tiếp ở tầng Database.
3. **Mọi thay đổi phải đi qua Command Gateway (Idempotent & Auditable):** Không cho phép thao tác sửa trực tiếp vào cơ sở dữ liệu (`UPDATE`). Mọi ý định được gửi dạng `Command` có chứa `idempotency_key`, được xác thực quy tắc domain và lưu trữ thành `Operational Event` dạng append-only (chỉ thêm, không xóa/sửa).

---

## 2. 4 THÀNH PHẦN KERNEL CỐT LÕI (THE 4 KERNEL COMPONENTS)

```
+-----------------------------------------------------------------------------------+
|                               ENTERPRISE KERNEL                                   |
|   - Party & Role (Person, Organization, Driver, Provider)                         |
|   - Place (Location Registry, Pickup/Dropoff Instructions)                        |
|   - Time Engine (Bitemporal: occurred_at vs recorded_at, Time Window + Anchor)   |
|   - Policy Registry (Versioned Pricing, Cancellation, SLA Policies)               |
|   - Command Gateway (Authz, Idempotency, Audit Trail)                             |
+-----------------------------------------------------------------------------------+
                                          |
                                          v
+-----------------------------------------------------------------------------------+
|                           TRANSPORTATION DOMAIN KERNEL                            |
|                                                                                   |
|  [1. DEMAND LEDGER]            [2. CAPACITY LEDGER]       [3. EXECUTION LEDGER]   |
|  - Transport Requirement       - Resource (Vehicle/Driver) - Trip                 |
|  - Movement Unit (Pax/Luggage) - Duty Period / Shift       - Stop & Activity      |
|  - Commitment (Service Level)  - Reservation (Timeline)    - Allocation (M:N)     |
|                                                            - Fulfillment          |
|                                                            - Assignment           |
|                                                            - Operational Event    |
|                                                            - Incident             |
+-----------------------------------------------------------------------------------+
                                          |
                                          v (Service Delivery Record - SDR)
+-----------------------------------------------------------------------------------+
|                             COMMERCIAL & FINANCE DOMAIN                           |
|  - Pricing Policy / Charge Lines       - Cost Policy / Supplier Cost Lines        |
|  - Customer Settlement                 - Supplier Settlement / Công nợ Phải trả   |
|  - Accounting Events -> Subledger (VAS / IFRS / General Ledger)                   |
+-----------------------------------------------------------------------------------+
```

### Component 1: Sổ Nhu cầu (Demand Ledger)
Chịu trách nhiệm lưu trữ và quản lý những gì doanh nghiệp đã hứa với khách hàng hoặc hệ thống Tour Operations.
* **`Transport Requirement`**: Nhu cầu di chuyển đã được đặc tả và cam kết, mang phiên bản (`version`), sinh ra từ Booking hoặc Tour. Không phải là Trip.
* **`Movement Unit`**: Nhóm người và hành lý nhỏ nhất bắt buộc phải đi cùng nhau. Đây là đơn vị cơ sở để lập kế hoạch phân bổ (`Allocation`). Một đoàn tour 40 pax có thể tách thành 2 `Movement Unit` (mỗi nhóm 20 pax).
* **`Commitment`**: Giá trị cam kết thương mại/vận hành (hạng xe, khung giờ chờ miễn phí, tiêu chuẩn dịch vụ). Được khóa phiên bản (`version policy`) ngay khi `Requirement` chuyển trạng thái `Confirmed`.
* **`Time Window` (với Anchor)**: Khung giờ đón/trả có thể cố định hoặc **neo vào sự kiện bên ngoài** (Ví dụ: *"Giờ hạ cánh thực tế chuyến bay VN1553 + 30 phút"*).

### Component 2: Sổ Năng lực (Capacity Ledger)
Chịu trách nhiệm quản lý tài nguyên hữu hạn (xe, tài xế) và việc giữ chỗ tài nguyên trên trục thời gian.
* **`Resource`**: Thực thể có năng lực phục vụ và bị giới hạn bởi thời gian. Bao gồm Xe (`Vehicle`) và Tài xế (`Driver`).
* **`Qualification`**: Điều kiện pháp lý/kỹ thuật của tài nguyên (hạng bằng lái, bằng ngoại ngữ của tài xế, hạn đăng kiểm/bảo hiểm của xe). Kiểm tra tính hợp lệ tại mốc thời gian chạy thực tế.
* **`Duty Period / Shift`**: Khung giờ tài xế sẵn sàng làm việc hoặc ca trực của phương tiện.
* **`Reservation`**: Bản ghi giữ chỗ một khoảng thời gian của `Resource` cho một mục đích cụ thể (`Assignment`, `Maintenance`, `Block Tour`). Chống trùng lịch bằng cơ sở dữ liệu.

### Component 3: Sổ Thực thi & Sự thật (Execution & Truth Ledger)
Chịu trách nhiệm nối nhu cầu với năng lực và ghi nhận toàn bộ sự thật xảy ra ngoài thực địa.
* **`Trip`**: Một lượt chạy liên tục của một bộ tài nguyên qua chuỗi điểm dừng (`Stop`) có thứ tự.
* **`Stop` & `Activity`**: Một điểm dừng là một `Place` kèm danh sách công việc cần làm (`Activity`: đón nhóm A, trả nhóm B, chờ 15 phút, tham quan). Loại bỏ hoàn toàn thiết kế cột `pickup_location` / `dropoff_location` cố định.
* **`Allocation`**: Quan hệ nhiều - nhiều (M:N) giữa `Movement Unit` và `Trip`. Cho phép 1 chuyến xe chở nhiều nhóm khách (shuttle), hoặc 1 nhóm khách đi qua nhiều chuyến xe chuyển tiếp.
* **`Fulfillment`**: Xác định đơn vị chịu trách nhiệm thực thi chuyến đi (Đội xe nội bộ hoặc Nhà xe đối tác thuê ngoài) dựa trên `Supply Agreement`.
* **`Assignment`**: Gắn `Resource` cụ thể (xe, tài xế) vào `Trip`. Xe và tài xế là **2 bản ghi Assignment riêng biệt** trên cùng một Trip. Khi đổi xe/tài xế, tạo Assignment mới ghi đè (`supersedes`), giữ nguyên lịch sử cũ.
* **`Operational Event`**: Sự thật đã diễn ra ngoài đời thực (đến điểm dừng, đón khách, xuất phát, cố sự). Lưu trữ dạng append-only với mốc thời gian 2 trục: `occurred_at` (thời điểm xảy ra thực tế) và `recorded_at` (thời điểm hệ thống ghi nhận).
* **`Incident`**: Bản ghi quản lý sự cố/ngoại lệ (xe hỏng, kẹt xe, chuyến bay trễ, khách no-show) có vòng đời xử lý riêng.

### Component 4: Hạ tầng Điều khiển & Kernel (Control & Enterprise Infrastructure)
* **`Command Gateway`**: Cổng tập trung tiếp nhận mọi yêu cầu thay đổi. Đảm bảo kiểm tra quyền (`authz`), tính trùng lặp (`idempotency_key`), phê duyệt (`approval logic`) và ghi nhật ký kiểm toán (`audit trail`).
* **`Policy Engine`**: Quản lý các bộ quy tắc kinh doanh (giá, phí hủy, phạt trễ SLA, quy tắc chấm điểm điều xe) theo phiên bản (`version`), phạm vi (`scope`) và mốc hiệu lực (`effective_from` -> `effective_to`).
* **`Transactional Outbox`**: Đảm bảo các sự kiện hệ thống (gửi thông báo Zalo/SMS cho tài xế, đồng bộ dữ liệu) được thực thi đáng tin cậy sau khi Database commit transaction.

### Ranh giới Giao tiếp: Service Delivery Record (SDR)
Khi một `Trip` hoàn thành (`Completed`), phân hệ Vận tải tổng hợp toàn bộ các sự thật đã được xác nhận (số km odo, giờ chờ, phí cầu đường, hạ hạng xe nếu có) thành **`Service Delivery Record` (SDR)** đóng băng.  
Phân hệ **Commercial** sẽ tiêu thụ SDR này để áp bảng giá (`Pricing Policy`) thu tiền khách và tính công nợ phải trả nhà xe (`Cost Policy`). Phân hệ **Finance** nhận các `Accounting Event` từ Commercial để hạch toán vào sổ cái kế toán (VAS/IFRS).

---

## 3. THIẾT KẾ CẤU TRÚC DATABASE SCHEMA (POSTGRESQL DDL)

Cơ sở dữ liệu mẫu chạy trên PostgreSQL, sử dụng extension `btree_gist` để thực hiện ràng buộc chống trùng lịch cứng ở cấp độ Database.

```sql
-- KÍCH HOẠT EXTENSION CHỐNG TRÙNG LỊCH KHOẢNG THỜI GIAN
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ==========================================
-- 1. DEMAND LEDGER (SỔ NHU CẦU)
-- ==========================================

CREATE TABLE transport_requirement (
    requirement_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    origin_ref VARCHAR(100) NOT NULL, -- Tham chiếu Booking ID hoặc Tour Itinerary Item
    version INT NOT NULL DEFAULT 1,
    status VARCHAR(30) NOT NULL DEFAULT 'DRAFT', -- DRAFT, REQUESTED, CONFIRMED, CANCELLED, FULFILLED
    service_level JSONB NOT NULL, -- Tiêu chuẩn xe hứa với khách (vd: { "vehicle_class": "16_SEATER_VIP" })
    commitment_policy_version INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE movement_unit (
    movement_unit_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    requirement_id UUID NOT NULL REFERENCES transport_requirement(requirement_id),
    pax_count INT NOT NULL CHECK (pax_count > 0),
    luggage_count INT NOT NULL DEFAULT 0,
    special_needs JSONB, -- Ghế trẻ em, xe lăn, ngôn ngữ hướng dẫn
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==========================================
-- 2. CAPACITY LEDGER (SỔ NĂNG LỰC & CHỐNG TRÙNG LỊCH)
-- ==========================================

CREATE TABLE resource (
    resource_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    kind VARCHAR(20) NOT NULL, -- VEHICLE, DRIVER
    provider_id UUID NOT NULL, -- ID đơn vị sở hữu (Công ty hoặc Nhà xe đối tác)
    capabilities JSONB NOT NULL, -- { "seats": 16, "plate_number": "29B-12345", "languages": ["EN"] }
    technical_status VARCHAR(30) NOT NULL DEFAULT 'SERVICEABLE', -- SERVICEABLE, IMPAIRED, MAINTENANCE
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- BẢNG REVISION GIỮ CHỖ VẬT LÝ - LÕI CHỐNG TRÙNG LỊCH CỦA XE VÀ TÀI XẾ
CREATE TABLE reservation (
    reservation_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    resource_id UUID NOT NULL REFERENCES resource(resource_id),
    during TSTZRANGE NOT NULL, -- Khoảng thời gian giữ chỗ (đã cộng buffer chuẩn bị/quay đầu)
    hardness VARCHAR(20) NOT NULL DEFAULT 'CONFIRMED', -- HELD (giữ tạm), CONFIRMED (cứng), BLOCK (khóa dài hạn)
    purpose_type VARCHAR(30) NOT NULL, -- ASSIGNMENT, MAINTENANCE, BLOCK_TOUR
    purpose_id UUID NOT NULL,
    parent_block_id UUID NULL REFERENCES reservation(reservation_id),
    held_until TIMESTAMPTZ NULL,
    released_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- RÀNG BUỘC LOẠI TRỪ CẤP DATABASE: Không cho phép 2 Reservation cứng còn hiệu lực chồng khoảng thời gian
    CONSTRAINT exclude_overlapping_resource_reservation 
    EXCLUDE USING gist (
        resource_id WITH =, 
        during WITH &&
    ) WHERE (released_at IS NULL AND parent_block_id IS NULL),

    -- RÀNG BUỘC CHO KHÓA CON TRONG BLOCK TOUR NỔI
    CONSTRAINT exclude_overlapping_child_reservation 
    EXCLUDE USING gist (
        parent_block_id WITH =, 
        during WITH &&
    ) WHERE (released_at IS NULL AND parent_block_id IS NOT NULL)
);

-- ==========================================
-- 3. EXECUTION LEDGER (SỔ THỰC THI & SỰ THẬT)
-- ==========================================

CREATE TABLE trip (
    trip_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plan_revision INT NOT NULL DEFAULT 1,
    status VARCHAR(30) NOT NULL DEFAULT 'PLANNED', -- PLANNED, RELEASED, IN_PROGRESS, COMPLETED, SUSPENDED, CANCELLED
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE stop (
    stop_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trip_id UUID NOT NULL REFERENCES trip(trip_id),
    sequence_number INT NOT NULL,
    place_id UUID NOT NULL, -- Tham chiếu bảng Place trong Enterprise Kernel
    planned_window TSTZRANGE NOT NULL,
    activities JSONB NOT NULL, -- Tập công việc: [{ "type": "BOARD", "movement_unit_id": "...", "pax": 4 }]
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (trip_id, sequence_number)
);

CREATE TABLE allocation (
    allocation_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    movement_unit_id UUID NOT NULL REFERENCES movement_unit(movement_unit_id),
    trip_id UUID NOT NULL REFERENCES trip(trip_id),
    board_stop_id UUID NOT NULL REFERENCES stop(stop_id),
    alight_stop_id UUID NOT NULL REFERENCES stop(stop_id),
    pax_allocated INT NOT NULL CHECK (pax_allocated > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE fulfillment (
    fulfillment_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trip_id UUID NOT NULL REFERENCES trip(trip_id),
    provider_id UUID NOT NULL,
    supply_agreement_id UUID NOT NULL,
    mode VARCHAR(30) NOT NULL, -- INTERNAL_FLEET, CONTRACTED_CARRIER, SPOT_RENTAL
    status VARCHAR(30) NOT NULL DEFAULT 'DRAFT', -- DRAFT, TENDERED, COMMITTED, DELIVERED, REJECTED
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE assignment (
    assignment_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trip_id UUID NOT NULL REFERENCES trip(trip_id),
    resource_id UUID NOT NULL REFERENCES resource(resource_id),
    reservation_id UUID NOT NULL REFERENCES reservation(reservation_id),
    role VARCHAR(20) NOT NULL, -- PRIMARY_VEHICLE, PRIMARY_DRIVER, RELIEF_DRIVER
    status VARCHAR(30) NOT NULL DEFAULT 'PROPOSED', -- PROPOSED, OFFERED, ACCEPTED, ACTIVE, RELIEVED, COMPLETED, WITHDRAWN
    supersedes_id UUID NULL REFERENCES assignment(assignment_id), -- Vết thay thế khi đổi xe/tài xế
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- SỔ SỰ THẬT: OPERATIONAL EVENT (APPEND-ONLY)
CREATE TABLE operational_event (
    event_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trip_id UUID NOT NULL REFERENCES trip(trip_id),
    event_type VARCHAR(50) NOT NULL, -- VehicleArrivedAtStop, MovementUnitBoarded, TripStarted, ExpenseIncurred
    payload JSONB NOT NULL,
    occurred_at TIMESTAMPTZ NOT NULL, -- Mốc 1: Thời điểm xảy ra thực tế
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), -- Mốc 2: Thời điểm hệ thống ghi nhận
    source VARCHAR(30) NOT NULL, -- DRIVER_APP, GPS_TELEMATICS, DISPATCHER_MANUAL
    causation_command_id UUID NULL
);

-- ==========================================
-- 4. CONTROL, COMMAND LOG & SDR
-- ==========================================

CREATE TABLE command_log (
    scope VARCHAR(50) NOT NULL,
    idempotency_key VARCHAR(100) NOT NULL,
    command_type VARCHAR(50) NOT NULL,
    request_hash BYTEA NOT NULL,
    actor_id UUID NOT NULL,
    result JSONB NULL,
    status VARCHAR(20) NOT NULL, -- PROCESSING, COMPLETED, REJECTED
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (scope, idempotency_key)
);

CREATE TABLE service_delivery_record (
    sdr_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trip_id UUID NOT NULL REFERENCES trip(trip_id),
    revision INT NOT NULL DEFAULT 1,
    verified_facts JSONB NOT NULL, -- Số km thực tế, phút chờ thực tế, danh sách phụ phí đã duyệt
    status VARCHAR(30) NOT NULL DEFAULT 'DRAFT', -- DRAFT, CONFIRMED, DISPUTED, ADJUSTED
    confirmed_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## 4. KẾ HOẠCH TRIỂN KHAI CHI TIẾT (IMPLEMENTATION ROADMAP)

Triển khai kế hoạch theo kiến trúc **Modular Monolith** gồm 4 phân kỳ ngắn hạn trong vòng 14 tuần:

```
[Tuần 1-4: Phase 1]  ---> [Tuần 5-8: Phase 2]  ---> [Tuần 9-11: Phase 3] ---> [Tuần 12-14: Phase 4]
3 Ledgers Schema          Command Gateway           Incident & Reassign       Commercial & Finance
DB Constraints            Auto-Dispatch Engine      Event Log Audit           SDR & Settlement
```

### Phân kỳ 1: Thiết lập Data Model & 3 Sổ cái cốt lõi (Tuần 1 - 4)
* **Mục tiêu:** Xây dựng khung DDL Database, tách bạch 3 sổ cái (`Demand`, `Capacity`, `Execution`) và kiểm tra các ràng buộc chống trùng lịch cấp Database.
* **Công việc cụ thể:**
  1. Triển khai schema PostgreSQL với extension `btree_gist` và ràng buộc `EXCLUDE`.
  2. Xây dựng CRUD cho danh mục `Resource` (Xe, Tài xế) và `Place` (Địa điểm).
  3. Viết Unit Test cho Sổ `Reservation`: Giả lập 2 request giữ chỗ trùng khoảng thời gian trên cùng 1 xe -> Xác nhận DB từ chối request thứ 2 ngay lập tức.
* **Tiêu chuẩn nghiệm thu (Definition of Done):** DB từ chối 100% các giao dịch trùng lịch ở tầng lưu trữ; không xuất hiện cột `status = BUSY` trong bảng xe.

### Phân kỳ 2: Command Gateway, Anti-Conflict & Auto-Dispatch (Tuần 5 - 8)
* **Mục tiêu:** Xây dựng cổng lệnh tập trung, cơ chế chống ghi trùng (`idempotency`) và thuật toán điều phối chọn xe/nhà xe.
* **Công việc cụ thể:**
  1. Dựng module `Command Gateway` nhận diện `idempotency_key`, ghi `command_log` trong cùng transaction với nghiệp vụ.
  2. Viết các Command cốt lõi: `SubmitRequirement`, `PlanTrip`, `AllocateToTrip`, `AssignResource`, `ReleaseTrip`.
  3. Triển khai thuật toán **Matching 2 bước**: Lọc cứng (sức chứa, giấy tờ, không chồng lịch) -> Chấm điểm mềm (ưu tiên xe nhà, giảm km chạy rỗng, giữ tài xế cho tour multi-day).
* **Tiêu chuẩn nghiệm thu:** Mọi thay đổi dữ liệu đều có vết trong `command_log`; gửi trùng Command trả lại kết quả cũ mà không sinh bản ghi thừa.

### Phân kỳ 3: Xử lý Ngoại lệ (Incident Management) & Reassignment (Tuần 9 - 11)
* **Mục tiêu:** Quản lý các biến cố vận tải ngoài thực địa mà không làm đứt gãy lịch sử hệ thống.
* **Công việc cụ thể:**
  1. Triển khai Aggregate `Incident` và quy trình tiếp nhận sự cố (xe hỏng, chuyến bay trễ, khách đổi giờ).
  2. Viết kịch bản **Reassignment (Đổi xe/Tài xế giữa chừng)**: Không dùng lệnh `UPDATE driver_id`. Thực hiện chuỗi: `RelieveAssignment` cũ -> Giải phóng `Reservation` cũ -> Tạo `Assignment` mới có thuộc tính `supersedes`.
  3. Thiết lập hệ thống ghi chép `Operational Event` 2 trục thời gian (`occurred_at` vs `recorded_at`).
* **Tiêu chuẩn nghiệm thu:** Hệ thống trả lời chính xác lịch sử đổi xe/tài xế, lý do đổi, chi phí phát sinh từng đoạn thông qua truy vấn duy nhất.

### Phân kỳ 4: SDR, Commercial Engine & Kế toán Subledger (Tuần 12 - 14)
* **Mục tiêu:** Đóng băng sự thật vận tải thành `Service Delivery Record` (SDR) và tích hợp sang phân hệ Tài chính - Kế toán.
* **Công việc cụ thể:**
  1. Triển khai logic đóng băng Trip thành `Service Delivery Record` (SDR) khi `CompleteTrip`.
  2. Xây dựng `Commercial Engine`: Áp `Pricing Policy` để tính doanh thu thu khách và `Cost Policy` để tính chi phí phải trả nhà xe/tài xế.
  3. Phát các `Accounting Events` từ Commercial sang phân hệ Kế toán (Finance) để tự động hạch toán Subledger (VAS/IFRS).
* **Tiêu chuẩn nghiệm thu:** Báo cáo đối soát công nợ nhà xe và giá vốn chuyến đi được sinh tự động từ SDR với độ chính xác 100% so với sự thật vận hành.

---

## 5. QUY TẮC PHÒNG TRÁNH ANTI-PATTERNS (CHECKLIST REVIEW CODE)

Đội ngũ kỹ thuật cần dùng bảng này làm tiêu chuẩn Review Pull Request (PR) để ngăn chặn mã nguồn vi phạm nguyên lý Kernel:

| STT | Anti-pattern Cần Tránh | Dấu Hiệu Nhận Biết Trong Code / Schema | Cách Khắc Phục Chuẩn Kernel |
| :--- | :--- | :--- | :--- |
| **1** | **Trip God Object** | Bảng `trips` chứa `customer_id`, `price`, `driver_id`, `vehicle_id`, `status` đa nghĩa. | Tách làm các thực thể riêng: `Requirement`, `Allocation`, `Assignment`, `Fulfillment`, `SDR`. |
| **2** | **Cờ Xe Bận/Rảnh** | Bảng `vehicles` có cột `status = 'BUSY'` hoặc `'AVAILABLE'`. | Xóa cột `status`. Trạng thái rảnh/bận được **suy ra từ truy vấn Timeline của Sổ Reservation**. |
| **3** | **UPDATE Xóa Lịch Sử** | Dùng câu lệnh `UPDATE assignments SET driver_id = ...` khi đổi tài xế. | Giữ nguyên bản ghi cũ, chuyển trạng thái sang `RELIEVED`. Tạo bản ghi `Assignment` mới mang thuộc tính `supersedes`. |
| **4** | **Booking = Trip** | Bảng `trips` có cột `booking_id NOT NULL UNIQUE`. | Tạo quan hệ nhiều-nhiều (M:N) qua bảng `Allocation` và `Movement Unit`. |
| **5** | **Một Mốc Thời Gian** | Bảng sự kiện chỉ có duy nhất cột `created_at`. | Bắt buộc mang 2 mốc thời gian: `occurred_at` (xảy ra ngoài đời) và `recorded_at` (hệ thống ghi nhận). |
| **6** | **Ghi Trực Tiếp DB** | Script admin hoặc API route thực hiện SQL ghi trực tiếp mà không qua Gateway. | Mọi thao tác ghi/sửa bắt buộc gửi qua **Command Gateway** có kèm `idempotency_key` và ghi `command_log`. |

---
*Tài liệu này được xuất bản dưới dạng chuẩn kỹ thuật kỹ thuật số để phục vụ trực tiếp cho quá trình lập trình và tích hợp vào Travel ERP.*
