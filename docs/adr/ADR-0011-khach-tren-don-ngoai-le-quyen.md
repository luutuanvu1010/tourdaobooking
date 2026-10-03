# ADR-0011 — Khách trên đơn (N2 lát 1): nhân viên lập đơn được tạo hồ sơ khách kèm vai `CUSTOMER`, và đổi được khách của đơn đã xác nhận

- **Trạng thái:** **accepted** theo quyết định trực tiếp của chủ dự án ngày 2026-09-21 (trả lời ba câu hỏi của đặc tả N2 lát 1: "A có; B có; C có, vì cho phép khách đổi phút cuối trước khi tàu khởi hành"). Sau khi accepted chỉ sửa trạng thái, thay đổi nội dung = ADR mới trỏ về ADR này. **Thay câu bởi [ADR-0098](ADR-0098-tra-trung-ho-so-theo-sdt.md)** (accepted 2026-10-03): điều 1 — ngoại lệ tạo hồ sơ mới trong lô lập đơn chỉ áp khi máy chủ tra theo SĐT không thấy hồ sơ nào trùng số.
- **Ngày:** 2026-09-21   **Người phê chuẩn:** chủ dự án (quyết định ngày 2026-09-21)
- **Loại quyết định:** **cửa hai chiều** — đổi quyền ở mã (route của `orders`) và test; cột `orders.booker_party_id` thuộc đặc tả N2 lát 1, gỡ được bằng expand–contract
- **Liên quan:** ADR-0007 (bản đồ quyền → thao tác; dòng "vai trò hồ sơ" chỉ `ADMIN`; điều 2 sửa sau xác nhận), ADR-0001 mục 7–8 (người đặt, nhận dạng theo SĐT), ADR-0009 (người phụ trách sửa được đơn), đặc tả `docs/superpowers/specs/2026-09-21-n2-lat-1-khach-tren-don.md` §3

## Bối cảnh
Đặc tả N2 lát 1 gắn hồ sơ khách (`orders.booker_party_id`) vào đơn và nêu ba câu hỏi cho chủ dự án. Hai trong ba câu trả lời **nới bản đồ quyền của ADR-0007**, là ADR đã accepted nên không sửa nội dung được; ADR này ghi hai ngoại lệ đó.

1. **Vai `CUSTOMER` (câu B).** Bảng quyền ADR-0007 dành "vai trò hồ sơ" cho `ADMIN` (`POST /api/parties/:id/roles` là route `"admin"`, `src/modules/parties/index.ts:225`). Nhân viên văn phòng tạo được hồ sơ (`POST /api/parties` là `"office"`) nhưng không gắn vai được.
2. **Đổi khách sau xác nhận (câu C).** ADR-0007 chia sửa sau xác nhận làm hai loại: "thông tin vận hành" (qua `PUT /api/orders/:id/trip`, sửa được ngay) và "số khách, dịch vụ, tiền" (cần lý do + bản ghi trước → sau, thuộc N3). Người đặt không nằm trong loại nào; `PUT /api/orders/:id` trả `NOT_EDITABLE` khi đơn không còn nháp. Thực tế bán tour: khách đổi người đi vào phút cuối trước giờ tàu chạy.

Câu A (được lập đơn không gắn hồ sơ khách) không đổi quyền nên không cần ADR; ghi ở đặc tả.

## Quyết định
1. **Ngoại lệ hẹp về vai `CUSTOMER`:** khi lập hoặc sửa đơn, route của `orders` được tạo **hồ sơ cá nhân MỚI** cho khách và mở vai **`CUSTOMER`** cho hồ sơ đó **trong cùng `db.batch()`** với đơn (dùng `newPersonStatements` do `parties` công bố qua `index.ts`). Chỉ vậy: không mở route vai trò cho `office`, không thêm vai cho hồ sơ **có sẵn**, không kết thúc/sửa vai, không mã vai nào khác. Người làm được = người có quyền lập/sửa đơn đó theo ADR-0007/ADR-0009.
2. **Đổi khách của đơn đã xác nhận = thông tin vận hành:** người đặt (`booker_party_id`, cùng tên/SĐT khách chụp trên đơn) của đơn **đã xác nhận** sửa được theo **cùng quyền và cùng kiểu đường đi với sửa thông tin chuyến** (thao tác `order.trip.edit`: người lập, người phụ trách, quản trị). Đơn **đã huỷ** thì không. Mỗi lần đổi ghi **một dòng nhật ký** dạng "từ A sang B" bằng **tên hiển thị**, không SĐT/email (CLAUDE.md §5). Không cần lý do bắt buộc và không cần bản ghi trước → sau của N3.
3. Tiền, số khách, dịch vụ sau xác nhận **giữ nguyên** ADR-0007 điều 2 (N3). Đổi người đặt không đổi tiền.

## Lý do
- Chủ dự án quyết theo thực tế vận hành: khách đổi người đi phút cuối; huỷ và lập lại đơn đã xác nhận làm mất người phụ trách, lịch sử và mã đơn đã gửi khách.
- Tạo hồ sơ + vai + đơn trong một batch là cách duy nhất không để hồ sơ mồ côi khi lưu đơn lỗi; khoanh ngoại lệ hẹp hơn việc mở route vai trò cho `office`.
- Coi người đặt là thông tin vận hành dùng lại đường và quyền đã duyệt (`order.trip.edit`), không phải chờ N3; nhật ký "từ A sang B" vẫn giữ dấu vết ai đổi, lúc nào.

## Phương án bị loại
- **Nới `POST /api/parties/:id/roles` cho `office` khi mã là `CUSTOMER`:** mở rộng hơn cần thiết; route có nhánh quyền theo giá trị đầu vào, dễ sai.
- **Không gắn vai ở lát 1:** bộ lọc "Khách hàng" ở trang Hồ sơ không có ai.
- **Khoá đổi khách sau xác nhận (huỷ–lập lại):** chủ dự án đã quyết khác.
- **Đổi khách sau xác nhận kèm lý do + bản ghi trước → sau (như tiền):** đúng tinh thần ADR-0007 điều 2 nhưng phải chờ N3; không đáp ứng nhu cầu hiện tại.

## Hệ quả
- Đặc tả N2 lát 1 cập nhật §3 theo quyết định; kế hoạch thi công lát 1 phải có test cho: tạo hồ sơ + vai + đơn cùng batch (lỗi thì không còn gì), đổi khách của đơn đã xác nhận bằng quyền `order.trip.edit`, đơn đã huỷ bị từ chối, nhật ký không chứa SĐT.
- Khi N3 làm bản ghi thay đổi, có thể xét đưa đổi người đặt vào đó (ADR mới).
- `docs/adr/README.md` thêm dòng ADR-0011.
