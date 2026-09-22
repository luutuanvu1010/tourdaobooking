# Thiết kế lại giao diện — Đợt C (Đăng nhập, Tôi, Góp ý) — đặc tả ngắn

> Đặc tả con của `docs/superpowers/specs/2026-09-22-thiet-ke-lai-giao-dien-design.md` (thẩm quyền cao hơn nếu lệch). Đợt C = 3 trang cuối trong 11 trang restyle (§4 bảng ánh xạ, dòng 1/9/11), rủi ro thấp nhất theo đánh giá ở tài liệu bàn giao — làm sau cùng. KHÔNG bao gồm Trang chủ mới (việc riêng, §10, cần chốt API trước).

## 1. Phạm vi

| Trang | HTML | Bundle | Mockup |
|---|---|---|---|
| Đăng nhập | `public/login.html` | `web/login.ts` | `01 Dang nhap.dc.html` |
| Tôi | `public/account.html` | `web/account.ts` | `09 Toi.dc.html` |
| Góp ý | `public/feedback.html` | `web/feedback.ts` | `11 Gop y.dc.html` |

Khung dùng chung (thanh đầu 60px, nội dung tối đa 1200px, mốc 900px) đã áp dụng xong từ Bước 1 — Đợt C chỉ cần xác nhận 3 trang này đã dùng đúng khung, không làm lại.

## 2. Mỗi trang cần đổi gì (đối chiếu mockup vs mã thật)

**Đăng nhập** — mã thật hiện là một cột đơn giữa màn hình (`.login`, max-width 380px, mọi khổ màn hình). Mockup thêm bố cục 2 cột ở máy tính: cột thương hiệu bên trái (nền gradient `--c-primary`→`--c-primary-strong`, logo, câu khẩu hiệu + 3 gạch đầu dòng, chân trang tên công ty) + cột form bên phải (form hiện có, không đổi). Ở điện thoại mã thật đã gần khớp mockup (icon 72px + tên app phía trên form) — chỉ cần tinh chỉnh khoảng cách/token cho khớp mốc chung, không đổi cấu trúc. Đây là đổi CẤU TRÚC (thêm cột thương hiệu) chỉ ở máy tính, không đụng logic đăng nhập/Turnstile/bảo trì.

**Tôi** — mã thật hiện là một cột dọc (hồ sơ → Việc của tôi (nếu có) → danh sách liên kết → bảo trì (nếu có) → form đổi PIN). Mockup có bố cục 2 cột bằng nhau ở máy tính (`grid-template-columns: 1fr 1fr`): cột trái = hồ sơ + danh sách liên kết + đổi PIN; cột phải = chế độ bảo trì (kèm khối xác nhận bước 2). Khối "Việc của tôi" (FIELD, ADR-0014) KHÔNG có trong mockup (tính năng thêm sau) — giữ nguyên logic, đặt vào cột trái (sau hồ sơ, trước danh sách liên kết), tự quyết vị trí vì mockup không có tham chiếu. Không đổi logic đổi PIN/bảo trì/Việc của tôi, chỉ đổi trình bày + bố cục.

**Góp ý** — mã thật hiện: khi mở một yêu cầu (`?id=`), khối danh sách (`#list-card`) bị ẩn hẳn, chỉ hiện khối luồng (`#thread`) — không bao giờ thấy cả hai cùng lúc, ở mọi khổ màn hình. Mockup máy tính hiện CẢ HAI cùng lúc, cạnh nhau (2 cột bằng nhau). Đây là thay đổi hành vi hiển thị (không phải chỉ CSS): cần thêm điều kiện theo khổ màn hình (mẫu `wide()` đã có sẵn ở `web/order-form.ts`) để ở ≥900px không ẩn `#list-card` khi mở luồng, chỉ ẩn ở <900px. Tab "Hàng đợi"/"Yêu cầu của tôi", bảng thống kê tuần, form gửi mới (`?new=1`) giữ nguyên logic, chỉ đổi trình bày.

## 3. Điều chưa chắc / đã tự quyết (không cần hỏi chủ, ghi theo P8)

1. Copy khẩu hiệu cột thương hiệu trang Đăng nhập: dùng ĐÚNG nguyên văn đã có trong mockup (đã là tài sản thiết kế được duyệt, không tự bịa thêm).
2. Vị trí khối "Việc của tôi" trong bố cục 2 cột trang Tôi: đặt cột trái, sau hồ sơ — mockup không có tham chiếu (tính năng mới hơn mockup), tự quyết theo hướng ít xáo trộn thứ tự đọc hiện có nhất.
3. Cơ chế hiện đồng thời danh sách+luồng ở trang Góp ý ≥900px: dùng lại đúng kỹ thuật `wide()` (đọc `matchMedia` runtime) đã có tiền lệ ở `order-form.ts`, không phát minh cách mới.
4. `account.ts`/`feedback.ts` chưa có kịch bản Chrome riêng (bảng ở `web/CLAUDE.md`) — Đợt C thêm kịch bản mới `dot-c-smoke.mjs` (theo mẫu `dot-a-smoke.mjs` của Đợt A) phủ cả 3 trang, thay vì chỉ kiểm tay.

## 4. Ngoài phạm vi

Không đổi logic Turnstile/bảo trì/đổi PIN/Việc của tôi/luồng góp ý. Không đổi API. Không đổi ma trận quyền.
