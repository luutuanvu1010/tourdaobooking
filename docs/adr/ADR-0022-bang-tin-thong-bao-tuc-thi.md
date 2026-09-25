# ADR-0022 — "Bảng tin": máy chủ chủ động báo mọi màn hình đang mở khi đơn đổi (Durable Object + WebSocket ngủ đông)

- **Trạng thái:** **accepted** — chủ dự án duyệt trực tiếp trong phiên chat 2026-09-25 ("1- Duyệt, 2- Duyệt, 3- ok, 4- Trước": duyệt hướng Durable Object + WebSocket; Q-B, Q-C, Q-D theo khuyến nghị của nghiên cứu §6 — xem mục "Trả lời của chủ" cuối tệp). Soạn bởi AI 2026-09-25 theo yêu cầu của chủ (không hỏi lại máy chủ theo chu kỳ; "một cái hook để phần thông báo luôn lắng nghe mỗi khi có thay đổi trạng thái"). Sau mốc này chỉ sửa dòng trạng thái; thay đổi nội dung = ADR mới trỏ về ADR này.
- **Ngày:** 2026-09-25   **Người phê chuẩn:** chủ dự án (đã duyệt 2026-09-25)
- **Loại quyết định:** **cửa một chiều mềm.** Thêm thành phần hạ tầng mới (lớp Durable Object trong cấu hình Worker). Gỡ phần dùng (route, bộ lắng nghe) là một commit; gỡ hẳn lớp DO cần một bước cấu hình `deleted_classes`. Không migration D1, không bảng mới, không đổi quyền của ai.
- **Nghiên cứu, phương án, chi tiết:** `docs/superpowers/specs/2026-09-25-thong-bao-tuc-thi-nghien-cuu.md` (bản này chỉ ghi điều được quyết).
- **Liên quan:** ADR-0020 điều 10 (trỏ sang đây); ADR-0018 dòng 14/37 và đặc tả mô hình vai giai đoạn 6 (Web Push — **không** thuộc ADR này, sẽ dùng lại điểm phát và hàm tính nhóm nhận); ADR-0014 điều 12 (đã đọc nguyên văn, `ADR-0014:116-119`: thay đổi do hướng dẫn viên làm được báo tới **đối tác** bằng **chấm đếm trong app**, "**không làm** thông báo đẩy về điện thoại"; ADR-0018 dòng 14 sửa: có báo đẩy cho Điều hành, đối tác vẫn không). ADR này **không** đẩy lên điện thoại khi app đóng, chỉ báo màn hình đang mở. Với **đối tác**, bảng tin chỉ **làm mới màn hình và chấm đếm**, **không** hiện thông báo nổi — để khỏi chồng lên cách điều 12 đã chọn; chủ xác nhận ở câu Q-C của nghiên cứu; ADR-0002 (ranh giới module).
- **Không xây trên lỗ đang hở:** sự kiện không mang tiền/liên hệ; dữ liệu lấy lại qua API có kiểm quyền → không dựa vào `money.view`, `contact.view` (`docs/quyen-hoan.json`).

## Quyết định

1. **Cơ chế:** một Durable Object `BangTin` (một bản, tên `cong-ty`) giữ kết nối WebSocket với mọi màn hình đang mở, dùng **Hibernation API** (trạm ngủ khi không có tin, không tính thời gian chạy). Không hỏi theo chu kỳ, không Server-Sent Events, không dịch vụ ngoài.
2. **Bắt tay** `GET /api/bang-tin`: đi qua đủ `currentStaff` → cổng bảo trì → **kiểm `Origin` cùng site** → tính nhóm nhận → chuyển sang trạm. Không có phiên hợp lệ thì không có kết nối.
3. **Nhóm nhận suy từ ô `order.view` hiện hành, không đặt luật quyền mới:** `any` → tag `tat-ca`; còn lại → `nguoi:<staffId>`. Sự kiện về một đơn gửi tới `tat-ca` + người lập + người phụ trách cũ + người phụ trách mới. Hàm tính là hàm thuần, có test đối chiếu `MATRIX`.
4. **Sự kiện chỉ gồm** mã/đơn, loại thay đổi, thời điểm. Không tiền, không SĐT, không tên khách, không tên người phụ trách. Màn hình nhận tin tự gọi lại API thường để lấy dữ liệu.
5. **Điểm phát duy nhất:** gốc lắp ráp tiêm `ctx.baoThayDoi`; mọi route ghi của `orders`/`dispatch` gọi nó **chỉ ở nhánh thành công**, qua `ctx.exec.waitUntil` — lỗi phát tin không bao giờ làm hỏng hay làm chậm thao tác ghi. `orders`/`dispatch` không import module bảng tin. Có **test hàng rào** bắt mọi route ghi đơn phải báo (phải thấy chặn thật một lần trước khi vào `docs/SO-HANG-RAO.md`).
6. **Kết nối mở lâu không vượt quyền:** trạm đóng kết nối quá 15 phút (trình duyệt tự nối lại và xác thực lại); ngưng tài khoản, đổi PIN, đổi quyền, bật bảo trì → đóng ngay kết nối liên quan. Trạm không nhận lệnh nào từ trình duyệt ngoài `ping`.
7. **Trình duyệt:** một bộ lắng nghe chung nạp từ khung `web/shell.ts`; tự nối lại (tăng dần 1→30 giây, khi hiện lại trang, khi có mạng lại) và **tải lại dữ liệu đang xem mỗi lần nối lại** — không lưu/phát lại tin đã lỡ. Thông báo nổi trên khung chung cho các loại chủ chọn (Q-B của nghiên cứu); các loại khác chỉ làm mới. Đang sửa dở thì không ghi đè, chỉ báo "Đơn vừa được cập nhật — Tải lại".
8. **CSP:** thêm rõ `wss://booking.tourdao.vn` vào `connect-src`.

## Lý do

- Đúng yêu cầu chủ: tức thì, không hỏi vô ích. Ở quy mô Tour Đảo chi phí ước tính 0 đồng (gói Free) hoặc nằm trong gói $5 (ước tính, chưa đo — nghiên cứu §3.6).
- Cùng Worker, cùng tên miền, cùng phiên đăng nhập; không thư viện, không bên thứ ba.
- "Tải lại khi nối lại" thay cho sổ phát lại: đơn giản, luôn đúng, và bù được việc iPhone cắt kết nối khi app xuống nền.

## Phương án bị loại

Hỏi theo chu kỳ (chủ loại); Server-Sent Events (giữ trạm thức, tốn thời gian chạy); chỉ Web Push (không làm mới màn hình đang mở, phải cài + xin quyền — để giai đoạn 6); dịch vụ ngoài (dữ liệu ra bên thứ ba, thêm bí mật). Chi tiết: nghiên cứu §2.

## Hệ quả

- Mã: module mới `src/modules/bangtin/` (DO, route, hàm thuần); `src/index.ts` export lớp DO + tiêm `baoThayDoi`; `Ctx` thêm `baoThayDoi`; 8 route ghi ở `orders`/`dispatch` gọi nó; `web/bangtin.ts` + thành phần thông báo nổi; `web/home.ts` tách hàm làm mới; `wrangler.jsonc` thêm binding + migration DO; `public/_headers` CSP.
- Kiểm thử: unit (tag, nhóm nhận, lịch nối lại), hàng rào "mọi đường ghi đều báo", e2e `bangtin.mjs`, Chrome hai tài khoản, **iPhone thật** (khoá màn hình rồi mở lại).
- Tài liệu: `docs/SYSTEM-DESIGN.md` (§2–§4, §7, §11), `docs/CHANGE-GUIDE.md` (công thức "thêm route ghi đơn thì gọi `baoThayDoi`"), `docs/HANDOFF-N1.md` (deploy ngắt mọi kết nối — bình thường), `docs/SO-HANG-RAO.md`.
- Việc lớn (triển khai + quyền) → người kiểm độc lập chỉ đọc sau thi công.
- Mỗi lần deploy mọi kết nối bị ngắt rồi tự nối lại — không phải sự cố.

## Trả lời của chủ (2026-09-25, phiên chat)

- **Q-A:** duyệt phương án B (Durable Object + WebSocket ngủ đông).
- **Q-B:** thông báo nổi cho: đơn mới chưa có người (chỉ người có `dispatch.claim`), có người nhận / đổi người phụ trách, xác nhận, huỷ; sửa nội dung/chuyến/tiền chỉ làm mới.
- **Q-C:** đối tác chỉ làm mới màn hình + chấm đếm (giữ ADR-0014 điều 12), không thông báo nổi.
- **Q-D:** làm **trước** ADR-0020.
