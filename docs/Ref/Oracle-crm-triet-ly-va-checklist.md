# Triết lý, Cấu trúc Hệ thống CRM và Đặc tính Cốt lõi của Oracle

## I. Triết lý & Đặc tính Cốt lõi của Oracle

1. **Model Identity Before Role (Mô hình hóa định danh trước vai trò):**
   Thực thể tồn tại độc lập trước khi đảm nhận các vai trò thương mại. Một cá nhân hoặc tổ chức là một `Party` gốc; vai trò "Khách hàng" (Customer), "Nhà cung cấp" (Supplier) hay "Đối tác" (Partner) chỉ là ngữ cảnh quan hệ (*usage/relationship*) phát sinh theo thời gian chứ không phải định danh riêng biệt.

2. **State Transition là đơn vị hành vi cốt lõi:**
   Đơn vị tư duy của hệ thống không phải là màn hình hay biểu mẫu (screen/form), mà là các **chuyển đổi trạng thái hợp lệ (valid state transitions)** của đối tượng nghiệp vụ. Mọi kênh tương tác (UI, API, Batch hay AI Agent) đều chỉ là phương tiện phát lệnh (*Commands*).

3. **Đưa quy tắc bất biến (Invariants) gần nơi lưu trữ dữ liệu nhất:**
   Các quy tắc kinh doanh bắt buộc phải đúng được cài đặt gần nơi giữ trạng thái dữ liệu (Database constraints & Domain validation) để ngăn chặn dữ liệu sai lệch ngay từ đầu.

4. **Phân quyền đa chiều (Who × Action × Data Scope):**
   Quyền hạn không chỉ là vai trò chức năng (Role/Action), mà bắt buộc phải gắn liền với **Phạm vi dữ liệu (Data Scope)** theo đơn vị vận hành (Business Unit), khu vực (Territory), hay cơ cấu pháp lý (Legal Entity).

5. **Configuration over Customization (Cấu hình bảo vệ khả năng nâng cấp):**
   Biến sự biến đổi dữ liệu thành cấu hình/metadata (ví dụ: cơ chế *Flexfields*) thay vì sửa mã nguồn hay sửa bảng dữ liệu lõi, giúp hệ thống luôn nâng cấp an toàn (*upgrade-safe*).

6. **AI là một Actor, không phải nguồn sự thật:**
   AI Agent đóng vai trò là một tác nhân điều phối (actor/orchestrator) được cấp định danh và quyền hạn, phát lệnh qua các cổng kiểm soát (Command/API) chứ không thể tự ý ghi đè lên dữ liệu hay phá vỡ các quy tắc bất biến.

---

## II. Cấu trúc Hệ thống CRM theo Kiến trúc Oracle (TCA Framework)

Tâm điểm trong kiến trúc CRM của Oracle là mô hình **Trading Community Architecture (TCA)**:

* **Lớp Party (Định danh thực thể):** Đại diện cho Cá nhân (`Person`) hoặc Tổ chức (`Organization`) trong thế giới thực.
* **Lớp Relationship & Usage (Mối quan hệ & Vai trò):** Định nghĩa ngữ cảnh giao dịch (như quan hệ Khách hàng mua hàng, Đại lý phân phối, Đối tác liên kết).
* **Lớp Customer Account & Site (Tài khoản & Địa điểm):** Quản lý các tài khoản giao dịch, hạn mức công nợ, địa điểm giao hàng/hóa đơn gắn với mối quan hệ thương mại.
* **Lớp Interaction & Event History (Sự kiện & Tương tác):** Ghi nhận lịch sử tương tác (Leads, Opportunities, Sales Events) dưới dạng dữ liệu bất biến có thể truy vết.

---

## III. Danh sách Tham chiếu (Checklist) để Xây dựng Hệ thống CRM

### 1. Mô hình Dữ liệu & Bản thể học (Ontology & Master Data)
- [ ] **Mô hình hóa `Party` gốc:** Không tạo bảng `Customers` và `Suppliers` riêng rẽ làm trùng lặp master data.
- [ ] **Tách biệt tài khoản giao dịch:** Tách `Customer Account`, `Site/Location` và `Contacts` thành các lớp thuộc tính của mối quan hệ, không trói chặt vào định danh thực thể.
- [ ] **Master Data dùng chung:** Chuẩn hóa danh mục sản phẩm, đơn vị tính, tiền tệ xuyên suốt từ CRM sang ERP.

### 2. Kiến trúc Giao dịch & Luồng xử lý (Behaviors & Invariants)
- [ ] **Thiết kế theo dạng Command & Event:** Chuyển đổi trạng thái Lead/Opportunity/Deal phải đi qua các lệnh (Command) có kiểm tra hợp lệ, không update trực tiếp cột trạng thái trong database.
- [ ] **Bảo vệ quy tắc bất biến (Invariants):** Đặt ràng buộc toàn vẹn dữ liệu (Constraints) ở cơ sở dữ liệu để tránh tình trạng dữ liệu "mồ côi" hoặc trạng thái vi phạm.
- [ ] **Vết kiểm toán (Audit Trail) từ ngày đầu:** Ghi nhận rõ Ai (Human/AI), Làm gì, Khi nào, Lý do và Dữ liệu Trước/Sau cho mọi giao dịch quan trọng.

### 3. Phân quyền & Quản trị (Authorization & Governance)
- [ ] **Áp dụng mô hình `Who × Action × Data Scope`:** Phân quyền kết hợp vai trò chức năng với phạm vi dữ liệu (theo Phòng ban, Chi nhánh, Đội ngũ bán hàng hay Lãnh thổ).
- [ ] **Ranh giới an toàn cho AI Agent:** Gán định danh riêng cho AI Agent; bắt buộc AI phải gọi qua API/Command có kiểm soát quyền hạn.

### 4. Khả năng Mở rộng & Tích hợp (Extensibility & Integration)
- [ ] **Làn đường mở rộng chính thức (Typed Extension Lanes):** Dùng thuộc tính mở rộng theo namespace (Custom Attributes / JSON Schema) thay vì cho phép can thiệp trực tiếp vào cấu trúc cơ sở dữ liệu lõi.
- [ ] **Liên kết hai chiều (Lineage):** Giữ mã tham chiếu hai chiều (`source_ref`) giữa cơ hội kinh doanh (Opportunity), Đơn hàng (Order) và Hóa đơn (Invoice) để dễ dàng kiểm toán và truy vết.
