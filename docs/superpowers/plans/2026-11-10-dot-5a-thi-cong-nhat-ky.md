# Đợt 5A — nhật ký thi công (ADR-0191 PIN đầu, ADR-0192 giữ chữ khi hết phiên)

- **Kế hoạch:** `docs/superpowers/plans/2026-11-08-sua-sau-ra-soat-lan-2.md` Phần VIII (Task 5A.1–5A.4), chủ duyệt 10/11.
- **Nhánh:** `claude/dot-5a-pin-giu-chu-d72b95`, cắt từ `9dbfbc131` (chứa `main` mới nhất; `origin/main` không có gì mới lúc bắt đầu). Không migration.
- **Vai:** phiên này thi công (điều phối + trợ lý thi công); không tự nghiệm thu (N8). Người kiểm độc lập: xem mục cuối.
- **Số phiên bản:** mục nhật ký thay đổi số tạm **2.90** (main có 2.89 = production lúc làm); bước A.0 đặt lại nếu nhánh khác nhập trước.

## Commit

| Commit | Việc |
|---|---|
| `d767f0286` | 5A.1: tập «xem mọi khách» rút từ `MATRIX["contact.view"]`; `POST /api/staff` trả `TaoTaiKhoanResponse` (`pin: null`, `choQuanTriCapPin`) khi người tạo không giữ `admin.manage`; `PUT /api/staff/:id/roles` chặn 403 khi thêm mã xem mọi khách; hậu tố nhật ký; giao diện hộp chờ cấp PIN và dòng nhắc ở hộp gán vai của Quản trị |
| `77137416f` | 5A.1 sửa vòng 1: nút tự đặt «Đã rõ, ẩn đi» → «Đóng» có sẵn; sinh lại `so-do-trang.ts` |
| `4369298f8` | 5A.1 sửa vòng 2: e2e `admin.mjs` lấy PIN qua «Đặt lại PIN» của Quản trị (bài cũ đọc PIN khi Nhân sự tạo Bán hàng) |
| `6f0d9bd01` | 5A.1 sửa vòng 3: câu 403 dùng «Vai trò» theo bảng từ ADR-0130 |
| `6f48f98cc` | 5A.2: luật thuần `src/shared/nhap-tam-don.ts` |
| `5ca891796`, `e3e17baac` | 5A.3 phần form: chụp ở `pagehide` khi có dấu hết phiên, khôi phục một lần, bản «đơn đã tạo» của Đối tác, xoá khi lưu thành công |
| `479ea519a` | 5A.3 phần dọn: `initShell`, đăng xuất, màn bảo trì; nới `TRAN_ORDERS` theo lời chủ |
| `12e620bcd`, `f90c5d472` | Mục nhật ký thay đổi 2.90 |
| `bd2cc1c79`, `ea3fc6cca` | Kịch bản Chrome `docs/evidence/2026-11-10-dot-5a/` |

## Quyết định trong lúc làm (ruling)

1. **Trần gói trang Đơn hàng:** phần dọn ở `web/shell.ts` (thuộc gói Đơn hàng) tốn tối thiểu +224 byte sau bốn lần thu gọn (+745 → +281 → +226 → +224), vượt mức 100 byte ADR-0192 mục 7(b) cho. Theo mục 7(b) đã dừng và hỏi chủ qua phiên điều phối. **Chủ trả lời 10/11, nguyên văn: «Nới mức 224 byte».** Đây là lời trả lời câu «quá 100 byte thì dừng, hỏi lại chủ» của ADR-0192 mục 7(b), nên không sửa ADR. Gói Đơn hàng 111.133 → 111.357 byte; `TRAN_ORDERS` = 111_357 (đúng số đo, không làm tròn).
2. **Móc chụp không thêm byte vào `web/api.ts`:** trang form nghe `pagehide` và chỉ chụp khi `sessionStorage` có `SESSION_ENDED_KEY`. Chỉ `goLogin` ghi khoá này (ngay trước `location.replace`), chỉ trang đăng nhập đọc rồi xoá nó mỗi lần mở; nên khoá không sót vào lúc rời trang bình thường.
3. **Chụp giá trị ô:** thân lưu nháp (`collect()`, dạng `OrderInput`) không cùng dạng với dữ liệu `fill()` nhận. Chọn: `collect()` cho ô thường, `drafts()` cho thẻ dịch vụ, `hk.rows()` cho hành khách, cộng đọc tường minh tên bên đặt, đối tác, hồ sơ khách, người phụ trách, lời mời Bán hàng (để «chữ đã gõ còn nguyên» đúng ADR mục 4). Khôi phục qua `fill` tách thành `napO` + `napThe`, hành khách qua `dungKhoiKhach`. Giá dịch vụ lấy lại theo danh mục hiện tại; máy chủ vẫn tính tiền.
4. **Thời điểm khôi phục khi sửa đơn:** quyết sau khi đơn nạp xong (đã có `updatedAt` máy chủ), xoá khoá ngay sau khi quyết.
5. **Vòng dọn bọc một `try` chung:** một giá trị hỏng trong kho làm dừng dọn các khoá sau ở lần mở trang đó. Bọc riêng từng khoá tốn +254 byte (vượt 224 chủ cho). Giá trị luôn do `JSON.stringify` ghi; khôi phục vẫn so mã nhân viên nên không lộ.
6. **Câu 403 gán vai:** «Vai trò này cho xem thông tin khách — nhờ Quản trị hoặc Toàn quyền gán.» (ADR-0191 mục 3(a) viết «Vai này…»; bảng từ ADR-0130 bắt «vai trò»; ADR mục 5 cho chỉnh chữ theo bảng khi thi công).
7. **Chặn gán vai đặt sau các kiểm 409** của route: 409 trả trước mọi câu ghi, không đổi dữ liệu.

## Hạn chế đã biết, chưa kiểm

- Lời gọi `/api/auth/session-ended` hỏng (mất mạng) thì không có dấu hết phiên ⇒ không chụp. Chỉ mất khả năng khôi phục, không lộ gì; với Đối tác có thể gõ lại và lưu thành đơn mới.
- **Chưa kiểm trên iPhone / Safari thật:** `pagehide` có chạy trước khi trang bị thay không; vuốt tắt hẳn Nền tảng có làm mất `sessionStorage` không (ADR-0192 mục «Chưa kiểm»). Kịch bản Chrome chỉ chạy Chrome headless.
- Màn bảo trì xoá bản chụp: có bài đọc mã, chưa thử trên trình duyệt.
- Dòng cũ «Hệ thống tự sinh PIN 6 số và chỉ hiện một lần.» dưới form tạo tài khoản nay không đúng khi Nhân sự tạo Bán hàng (chữ có sẵn, chưa sửa — cần chủ chọn chữ).

## Đề xuất chờ chủ duyệt (chưa ghi)

- `docs/SO-HANG-RAO.md`: một dòng cho bài canh tập «xem mọi khách» rút từ bảng quyền (`src/shared/xem-moi-khach.test.ts`). Quan sát chặn thật 2026-11-10: sửa cố ý `maXemMoiKhach` thành `ma === "SALES"` ⇒ 2 bài đỏ, hoàn nguyên ⇒ xanh.
- Dòng Trạng thái ADR-0071 trỏ ADR-0191; ADR-0035 trỏ ADR-0192.

## Kiểm

- Kịch bản Chrome `docs/evidence/2026-11-10-dot-5a/kich-ban/dot-5a-smoke.mjs`: 21/21 bước (cảnh 1–6), ảnh 390 và 1280 ở `anh/`.
- `npm test`, `npm run typecheck`, `npm run test:e2e`, người kiểm độc lập: ghi ở mục dưới khi có kết quả.
