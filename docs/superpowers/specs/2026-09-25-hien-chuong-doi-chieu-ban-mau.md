# Đối chiếu bản mẫu hiến chương ERP (tư duy Oracle) → Hiến chương kiến trúc lõi Tour Đảo

- **Ngày:** 2026-09-25. **Vai:** lập kế hoạch. **Theo yêu cầu chủ dự án:** *"Rất tán thành ý tưởng của bạn, chúng ta nâng cấp hệ thống từ tầng sâu nhất là việc soạn hiến chương. Hãy lấy hiến chương mẫu này để làm nền tảng và tạo ra cái cho riêng mình."*
- **Bản mẫu:** `/Users/tuanbao/Documents/Projects/CHUNGCATKIENTHUC/hien-chuong-kien-truc-erp-Oracle.md` (5 điều, 18 khái niệm lõi, chuỗi 9 lớp, hình chiếu đa chiều).
- **Kết quả:** Phần I của `docs/ARCHITECTURE.md` (bản đề xuất, chờ duyệt). Bản đồ hiện trạng: `docs/SYSTEM-DESIGN.md` §17.

## 1. Vì sao đặt ở `ARCHITECTURE.md` (không tạo tệp mới, không phải "cao nhất")

- `playbook/FRAMEWORK.md` Phần 4 (bộ tài liệu đóng 9 tệp, v1.5 "không tạo tài liệu thứ 10"): nguyên tắc **tự chọn** về *bằng gì* → `ARCHITECTURE.md` (tầng 2 "Định hình"). Tầng "ràng buộc cấp dự án" dạng `RANG_BUOC_NGOAI.md` dành cho ràng buộc **bên ngoài** ("đúng dù mình chọn gì": luật, thuế, giới hạn nền tảng) — hiến chương kiến trúc là thứ mình chọn nên không đặt ở đó.
- Bản mẫu tự nhận "văn bản chuẩn mực cao nhất". Ở dự án này **không đúng**: cao nhất là Hiến pháp chung (`playbook/CONSTITUTION.md`, chép chỉ-đọc từ Core, ADR-0012); tầng dự án **chỉ được siết thêm** (Hiến pháp 9.7). Hiến chương Tour Đảo vì vậy đứng dưới Hiến pháp, trên mọi ADR. Đây là "tầng sâu nhất" mà một dự án được tự đặt.
- `ARCHITECTURE.md` vốn đã là tài liệu chuẩn tắc ("luật ở `docs/ARCHITECTURE.md`", `CLAUDE.md` §2) → nâng cấp tại chỗ, giữ nguyên luật cũ làm Phần II.

## 2. Từng phần của bản mẫu: áp dụng / điều chỉnh / hoãn

| Bản mẫu | Quyết định cho Tour Đảo | Lý do |
|---|---|---|
| Đ1.1 Doanh nghiệp là hệ quản trị trạng thái số | **Áp dụng** → Điều 1.1 | đúng bản chất app |
| Đ1.2 Chuyển trạng thái là đơn vị hành vi | **Áp dụng** → 1.2, cụ thể hoá bằng "một `db.batch()`" (D1 không có giao dịch dài) | khớp khuôn ghi hiện có (ADR-0002 quy tắc 3) |
| Đ1.3 Mã là hàng hoá, bản thể là điểm kiểm soát | **Áp dụng** → 1.3 | — |
| Đ1.4 Chuỗi 9 lớp | **Điều chỉnh** → chuỗi 7 lớp (gộp Sự kiện vào "giao dịch + nhật ký cùng lô"; gộp Quyết định/Vận hành vào "hình chiếu") | Tour Đảo không có tầng ra quyết định tự động; tách sự kiện thành lớp riêng sẽ đọc như event sourcing |
| Đ2.1 Định danh trước vai | **Áp dụng** (đã có ADR-0001) + **siết**: Tour Đảo cũng là hồ sơ | bài học sổ công nợ: Tour Đảo là bên bán/bên được nợ |
| Đ2.2 Tổ chức đa trục (pháp nhân / đơn vị KD / phòng ban) | **Hoãn** (một pháp nhân) — ghi cách dựng khi cần (vai/quan hệ của hồ sơ tổ chức) | tỷ lệ với công ty 30 người |
| Đ3 18 khái niệm lõi | **Điều chỉnh** → 16 (K1–K16) | xem mục 3 |
| Đ4.1 Hình chiếu kế toán, chuỗi 5 lớp, sổ phụ SLA | **Điều chỉnh** → 4.2: sổ công nợ sinh từ sự kiện theo luật, trỏ về nguồn, chỉ-thêm + đảo | đúng tinh thần SLA, bỏ tầng "bút toán sổ cái" (chưa cần hệ thống tài khoản) |
| Đ4.1 Đa sổ (VAS / IFRS) | **Hoãn** → 4.3 một sổ quản trị | ADR-0004 loại thuế; là ràng buộc bên ngoài khi làm |
| Đ4.1 Truy nguồn hai chiều (`source_ref`) | **Áp dụng** → 4.2 | — |
| Đ4.2 Tách Bên khỏi Tài khoản công nợ, địa điểm giao/nhận, liên hệ | **Điều chỉnh**: hồ sơ + điểm liên hệ (đã có); "tài khoản công nợ" = số dư theo hồ sơ tính từ sổ (view), không bảng riêng; địa điểm giao/nhận hoãn | quy mô; ADR-0010 đã chốt ngưỡng mở rộng TCA |
| Đ4.3 Tách người khỏi quan hệ lao động | **Áp dụng** → 4.5 (đã có ADR-0013, 0018) | — |
| Đ5.1 Bất biến gần trạng thái bền | **Áp dụng + siết** → 5.1 "hai lớp" (Hiến pháp P21) | — |
| Đ5.2 Cấu hình thay tuỳ biến — **Flexfields / JSON Schema** | **Điều chỉnh**: giữ "cấu hình thay tuỳ biến", **bỏ** flexfield/JSON tự do → 5.2 dữ liệu có kiểu + ngày hiệu lực | xung đột ADR-0003 (cột có kiểu, bảng tra cứu, `CHECK`); JSON tự do phá khả năng kiểm bất biến |
| Đ5.3 Hợp đồng dữ liệu, lặp an toàn | **Áp dụng** → K14, 5.3 | — |
| Đ5.4 AI là tác nhân có định danh, qua lệnh có kiểm soát | **Áp dụng** → 5.11 (đã có ADR-0010 điều 3) | — |
| Đ5.5 Kiểm toán bất biến | **Áp dụng** → 5.12 | — |
| Nghị quyết thực thi ("cao nhất") | **Điều chỉnh** → Điều 6 (đứng dưới Hiến pháp; bảng thi hành; lệch phải có ADR) | Hiến pháp Điều 3, 9.7 |

## 3. 18 khái niệm lõi → 16 của Tour Đảo

| Bản mẫu | Tour Đảo | Ghi chú |
|---|---|---|
| 1 Identity | K1 Định danh | + tác nhân tự động có tài khoản riêng |
| 2 Party | K2 Bên | |
| 3 Organization | K3 Tổ chức & địa điểm | gộp địa điểm (ADR-0008) |
| 4 Role & Permission + 5 Data Scope | K4 Quyền = Ai × Thao tác × Phạm vi | gộp: bản đồ quyền đã mang phạm vi (`own/assigned/any`) |
| 6 Business Object | K5 | |
| 7 Document | K6 Chứng từ | + danh sách trắng |
| 8 Event | (gộp vào K12 + 4.1) | không tách lớp sự kiện riêng |
| 9 Command/Action | K7 | |
| 10 Transaction Boundary | K8 | = một `db.batch()` |
| 11 Workflow/Approval | K9 | + **giữ đối tượng** |
| 12 Policy/Rule | K10 | + **chụp tại mốc** |
| 13 Reference/Master Data | K11 | |
| 14 Accounting Projection | K13 | |
| 15 Audit/History | K12 | |
| 16 Metadata/Extension (Flexfields) | **không áp** | xem Đ5.2 |
| 17 Integration/API | K14 | |
| 18 Reporting/Semantic Model | K15 | |
| — | **K16 Thông báo** (mới) | Bảng tin, ADR-0022: hình chiếu, không kích hoạt tiền |

## 4. Điều mới (chưa có ADR nào) — duyệt Hiến chương là duyệt cả ba

- **5.7 Giữ đối tượng khi thiếu điều kiện** (tương đương "hold" của Oracle Order Management).
- **5.8 Bước của luồng gắn với vai trên đối tượng.**
- **5.9 Trả dư thành khoản chờ hoàn** (tương đương "unapplied/on-account credit" của Oracle Receivables).

## 5. Sáu câu đang treo (đợt Hoàn tất) — Hiến chương trả lời thế nào

| Câu (ADR-0024…0026, tin nhắn 25/9) | Điều trả lời | Kết quả khi Hiến chương được duyệt |
|---|---|---|
| 1. Đơn có người hưởng khi chưa có mức chiết khấu | **5.7** giữ đối tượng | đơn bị **giữ** ở bước "Đã giao" với lý do "chưa có mức chiết khấu", Kế toán/Quản trị cài mức thì thả; không lấy 0 |
| 2. Ai bấm "Đã giao" | **5.8** | khung: quyền xét theo **vai "người đang phụ trách" trên đơn** kết hợp mức quyền. Mức quyền nào (chỉ HDV, hay cả Bán hàng đang phụ trách) vẫn là **một ô bản đồ quyền** ghi ở ADR-0025 — Hiến chương không tự quyết ô đó; khuyến nghị: mọi mức được làm người phụ trách |
| 3. "Còn lại" âm | **5.9** | không chặn; phần dư → khoản chờ hoàn; Kế toán ghi hoàn |
| 4. Cộng tác viên hưởng hoa hồng | **2.2** (vai là dữ liệu) + 5.2 | chỉ là một dòng chính sách, không cần quyết định |
| 5. Bảng `order_money_adjustment` thiếu dấu vết + `CASCADE` | **5.5** + 6.3 | nợ có tên; sửa khi đợt 1 chạm bảng đó |
| 6. Thứ tự làm | **5.13** nền trước | định danh & quyền (ADR-0019, vá DK) → bên (hồ sơ Tour Đảo) → chính sách → đơn & luồng → sổ tiền → thông báo; Bảng tin (ADR-0022, đã duyệt) chạy song song vì là hình chiếu độc lập |

Những câu này vẫn cần **ghi vào ADR-0024…0026** khi trình (theo Hiến chương điều X), nhưng không còn là câu hỏi mở cho chủ dự án.

## 6. Việc kèm theo (không tự làm — N9)

- Đề xuất sửa `CLAUDE.md` §2 và §6 để trỏ tới Hiến chương: `docs/superpowers/proposals/2026-09-25-claude-md-hien-chuong.md` (chủ duyệt mới có hiệu lực).
- Kiểm độc lập (chỉ đọc) bản đề xuất trước khi trình.
- Không trình cùng lượt với ADR-0024…0026.
