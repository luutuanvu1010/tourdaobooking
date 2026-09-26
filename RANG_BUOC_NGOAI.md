# Hồ sơ ràng buộc bên ngoài: tourdao-sales (Tour Đảo Booking)

> Tài liệu tầng "Định hình" của bộ 9 (`playbook/FRAMEWORK.md` §4.2), đứng **trên** PRD/đặc tả. Ghi những sự thật **dự án không kiểm soát nhưng đang tựa vào**: pháp luật, hành vi hệ thống bên thứ ba, giới hạn nhà cung cấp. Mỗi sự thật chỉ sống **ở đây**; tài liệu khác trỏ về, không chép lại (Hiến pháp P6, N7). Trường quan trọng nhất: **cái gì sập nếu sai**.
>
> Lập 2026-09-26 theo quyết định của chủ dự án (phiên chat 2026-09-25/26: "có" tạo `RANG_BUOC_NGOAI.md`). **Bản đầu, gom từ các lần tra trong dự án — chưa có phiên khảo sát riêng** như FRAMEWORK §4.2 yêu cầu; các nhóm còn trống ghi ở cuối.

## Quy ước
- **Hạng nguồn:** **[A]** tài liệu gốc chính thức, đã đọc bản gốc (ghi đường dẫn); **[B]** tài liệu chính thức nhưng chỉ qua trích dẫn của người/AI khác, hoặc hành vi quan sát thực tế trong dự án; **[C]** nguồn không chính thức, suy luận, hoặc chưa đối chiếu văn bản gốc.
- **Hạn kiểm lại:** 6 tháng cho pháp luật, 3 tháng cho hệ thống bên thứ ba. **Quá hạn thì tự hạ xuống [C]** cho tới khi kiểm lại.
- Sửa/thêm dòng: được tự do (siết). Xoá dòng hoặc hạ mức nghiêm trọng: chủ dự án duyệt.

## 1. Pháp luật Việt Nam

| # | Phát biểu dự án đang tựa vào | Hạng | Nguồn gốc | Hiệu lực | Kiểm ngày | Hạn kiểm lại | Cái gì sập nếu sai |
|---|---|---|---|---|---|---|---|
| L1 | Sổ và chứng từ kế toán phải lưu **tối thiểu 10 năm** (Nghị định 174/2016/NĐ-CP) — **chưa xác định** sổ công nợ quản trị nội bộ của app có thuộc phạm vi "sổ kế toán" theo luật hay không | [C] | Khung Enterprise OS của chủ dự án (`CHUNGCATKIENTHUC/ENTERPRISE_FRAMEWORK.md` I.2); **chưa đối chiếu văn bản gốc** | — | chưa kiểm | trước khi thi công sổ công nợ (ADR-0026) | Nếu áp: điểm khôi phục D1 (C4) **không đủ** làm lưu trữ; cần chính sách lưu trữ dài hạn + xuất sao lưu định kỳ; không xoá cứng (đã có, ADR-0003) |
| L2 | Hoá đơn điện tử, thuế: **ngoài phạm vi** app (ADR-0004 loại) | [B] | `docs/adr/ADR-0004-mo-rong-pham-vi-thu-tien-hoa-don.md` | — | 2026-09-25 | khi đổi phạm vi | Nếu sau này phải xuất hoá đơn từ app: cần module mới + hộp thư đi (Hiến chương 5.16) |

## 2. Cloudflare (Workers, D1, Durable Objects, Turnstile)

| # | Phát biểu | Hạng | Nguồn gốc | Hiệu lực | Kiểm ngày | Hạn kiểm lại | Cái gì sập nếu sai |
|---|---|---|---|---|---|---|---|
| C1 | Mỗi lần triển khai Worker, **mọi WebSocket tới Durable Object bị ngắt** | [A] | https://developers.cloudflare.com/durable-objects/best-practices/websockets/ | — | 2026-09-25 (subagent tra) | 2026-12-25 | Không sập: Bảng tin (ADR-0022) đã thiết kế tự nối lại + tải lại; nếu hành vi đổi thì chỉ bớt việc |
| C2 | Durable Object dùng SQLite **có trên gói Free**; tin gửi đi qua WebSocket **không tính tiền**; tin nhận vào tính 20:1; đối tượng ngủ đông không tính thời gian chạy | [A] | https://developers.cloudflare.com/durable-objects/platform/pricing/ | — | 2026-09-25 (subagent tra) | 2026-12-25 | Ước tính chi phí Bảng tin (~0 đồng) sai → phải đo lại/đổi thiết kế |
| C3 | `db.batch()` của D1 chạy **nguyên khối**: một câu hỏng thì cả lô huỷ | [B] | tài liệu D1 (câu "aborts or rolls back the entire sequence", do người kiểm độc lập trích 2026-09-25); **chưa có e2e cố ý làm hỏng câu giữa lô** | — | 2026-09-25 | 2026-12-25 | **Sổ công nợ ghi dở** (Hoàn tất ghi khoá đơn mà không ghi sổ) — ADR-0025 đòi e2e xác nhận trước khi dựa vào |
| C4 | D1 **Time Travel** cho khôi phục về một thời điểm trong quá khứ (dùng làm điểm khôi phục trước mỗi lần triển khai) — **số ngày giữ chưa kiểm** | [C] | `docs/SYSTEM-DESIGN.md` §13; `docs/HANDOFF-N1.md` | — | chưa kiểm | kiểm ngay khi làm L1 | Khôi phục sau sự cố vượt khoảng giữ → mất dữ liệu; **chưa từng khôi phục thử** (Enterprise OS bẫy 8) |
| C5 | `wrangler d1 execute --remote --file` **từ chối đăng nhập OAuth** (lỗi 10000); lệnh cho chủ phải dùng `--command` từng câu | [B] | quan sát 2026-09-24 (ghi nhớ dự án `reference-wrangler-d1-remote-file-oauth`) | — | 2026-09-24 | 2026-12-24 | Runbook đưa chủ lệnh `--file` → chạy lỗi giữa lúc triển khai |
| C6 | Turnstile: máy chủ xác minh token qua `https://challenges.cloudflare.com/turnstile/v0/siteverify`; widget cần CSP cho `challenges.cloudflare.com` | [B] | `docs/SYSTEM-DESIGN.md` (dòng CSP, siteverify); `docs/CHANGE-GUIDE.md` công thức l | — | 2026-09-21 | 2026-12-21 | Đăng nhập hỏng cho mọi người |

## 3. Apple iOS / Safari (PWA "Tour Đảo Booking")

| # | Phát biểu | Hạng | Nguồn gốc | Hiệu lực | Kiểm ngày | Hạn kiểm lại | Cái gì sập nếu sai |
|---|---|---|---|---|---|---|---|
| I1 | Web Push cho web app **chỉ** khi đã thêm ra màn hình chính, **iOS/iPadOS 16.4+**, xin quyền phải từ thao tác của người dùng | [A] | https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/ | — | 2026-09-25 (subagent tra) | 2026-12-25 | Giai đoạn báo đẩy (mô hình vai GĐ6) không tới được máy chưa cài |
| I2 | App xuống nền / khoá màn hình thì trang bị đóng băng, **WebSocket chết** (có lúc vẫn báo "OPEN") | [C] | nguồn không chính thức (thảo luận cộng đồng; diễn đàn Apple cho app gốc) | — | 2026-09-25 | 2026-12-25 | Bảng tin không tự nối lại → màn hình cũ; thiết kế đã xử lý bằng nối lại khi hiện lại trang |
| I3 | Canvas Safari iOS giới hạn **diện tích ≤ 2²⁴ điểm ảnh**, vượt thì trả canvas trống | [C] | `docs/SYSTEM-DESIGN.md` (đoạn "Ảnh xác nhận đơn"); **chưa có đường dẫn nguồn gốc** | — | chưa kiểm | 2026-12-26 | Ảnh biên nhận đơn dài bị trống trên iPhone |
| I4 | CSP `connect-src 'self'` có thể **không** khớp `wss:` cùng tên miền trên Safari cũ; nên liệt kê rõ `wss://booking.tourdao.vn` | [B] | https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/connect-src ; WebKit changeset 292266 (số phiên bản Safari đã sửa **chưa xác minh**) | — | 2026-09-25 (subagent tra) | 2026-12-25 | Bảng tin không kết nối được trên một số iPhone |

## 4. Chuẩn web (WebAuthn / Face ID)

| # | Phát biểu | Hạng | Nguồn gốc | Hiệu lực | Kiểm ngày | Hạn kiểm lại | Cái gì sập nếu sai |
|---|---|---|---|---|---|---|---|
| W1 | Passkey: `rpId` phải khớp tên miền đang mở (`booking.tourdao.vn`, không kèm `https://`); local phải ghi đè | [B] | chuẩn WebAuthn; `CLAUDE.md` §10, `docs/CHANGE-GUIDE.md` công thức r (ADR-0016) | — | 2026-09-23 | 2026-12-23 | Nút Face ID hiện nhưng luôn lỗi |

## 5. Google (Sheet danh mục dịch vụ)

| # | Phát biểu | Hạng | Nguồn gốc | Hiệu lực | Kiểm ngày | Hạn kiểm lại | Cái gì sập nếu sai |
|---|---|---|---|---|---|---|---|
| G1 | Danh mục/giá đọc từ Google Sheet **công khai dạng CSV**; Sheet **dùng chung với website tourdao.vn** và do người sửa tay — app **chỉ đọc**, không ghi | [B] | `docs/SYSTEM-DESIGN.md` (nguồn danh mục); ghi nhớ dự án `reference-services-sheet` | — | 2026-09-19 | 2026-12-19 | Sheet đổi quyền/cột → đồng bộ danh mục hỏng; cài đặt tiền **không** được đặt trong Sheet (Hiến chương 5.2) |

## 6. Anthropic / Claude Code (công cụ thi công)

| # | Phát biểu | Hạng | Nguồn gốc | Hiệu lực | Kiểm ngày | Hạn kiểm lại | Cái gì sập nếu sai |
|---|---|---|---|---|---|---|---|
| A1 | `CLAUDE.md` là **lời khuyên**, không cưỡng chế; muốn chặn chắc chắn phải dùng hook `PreToolUse` | [A] | https://code.claude.com/docs/en/memory.md ; https://code.claude.com/docs/en/best-practices.md | — | 2026-09-25 (subagent tra) | 2026-12-25 | Luật chỉ nằm trong `CLAUDE.md` bị coi là đã cưỡng chế (trái P16) |
| A2 | `CLAUDE.md` cấp máy/thư mục cha và plugin **không nạp ở phiên chạy trên web/cloud** — phiên đó chỉ thấy repo | [B] | https://code.claude.com/docs/en/plugins/overview.md (qua subagent) | — | 2026-09-25 | 2026-12-25 | Luật chung đặt ngoài repo không áp khi chủ làm việc qua web → cần bản chép `playbook/` trong repo |
| A3 | Mỗi `CLAUDE.md` nên dưới ~200 dòng; dài hơn làm giảm mức tuân thủ | [B] | https://code.claude.com/docs/en/best-practices.md (qua subagent) | — | 2026-09-25 | 2026-12-25 | `CLAUDE.md` phình → AI bỏ sót luật |

## 7. Chưa khảo sát (phải có phiên khảo sát riêng — FRAMEWORK §4.2)
- Bảo vệ dữ liệu cá nhân (tên, SĐT khách; nhật ký không ghi SĐT/email/MST là chính sách nội bộ, **chưa đối chiếu luật**).
- Phạm vi "sổ kế toán" theo luật đối với sổ công nợ quản trị nội bộ (L1).
- Điều khoản dịch vụ và giới hạn gói Cloudflare đang dùng (**chưa kiểm** tài khoản ở gói Free hay Paid).
- Điều khoản dùng Google Sheet công khai làm nguồn dữ liệu.

## Nhật ký kiểm chứng
| Ngày | Ai | Làm gì | Kết quả |
|---|---|---|---|
| 2026-09-26 | AI (phiên nền, vai lập kế hoạch) | Lập hồ sơ từ tài liệu dự án và các lần tra tài liệu 2026-09-25 | 17 dòng; 4 nhóm chưa khảo sát; chưa có phiên khảo sát riêng |
