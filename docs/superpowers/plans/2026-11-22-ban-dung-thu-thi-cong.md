# Kế hoạch thi công bản dùng thử (Việc 1, ADR-0223) — 22/11/2026

> Hồ sơ có ngày. Đặc tả: `docs/superpowers/specs/2026-11-21-ban-dung-thu/DAC-TA.md`. ADR: `docs/adr/ADR-0223-ban-dung-thu.md` (accepted 22/11). Nhánh `claude/beautiful-engelbart-74cf25`. Loại: việc lớn (quyền, triển khai) ⇒ người kiểm độc lập ở cuối.

## Thiết kế chốt khi thi công (người thi công quyết, ghi để người kiểm soát)

- **Biến bật:** `BAN_DUNG_THU = "bat"` (chỉ `wrangler.demo.jsonc`). Không dùng lại `MOI_TRUONG` (bản Development cũng đặt). Bản dùng thử còn đặt `MOI_TRUONG = "demo"`, không đặt `THU_CHO_PHEP` ⇒ không thư (`gui-thu.ts`); thêm chốt cứng: có `BAN_DUNG_THU` thì không dựng bộ gửi thư, không dựng khoá thông báo đẩy.
- **Nhận diện tài khoản:** theo SĐT hằng trong `src/shared/ban-dung-thu.ts` — `SDT_DUNG_THU` (tài khoản dùng thử, quyền thật Đối tác + vai hồ sơ Công ty lữ hành để chọn «Đối tác» là lập đơn được) và `SDT_TOAN_QUYEN_DEMO` (Toàn quyền của chủ trên bản dùng thử). Không phải số thật của ai.
- **Chọn vai:** dùng lại cột `aut_session.acting_role` (migration 0145). `currentStaff` là nơi duy nhất tính quyền hiệu lực: thêm nhánh «bản dùng thử + tài khoản dùng thử» — nhận vai, không hạn 60 phút. Route mới `POST /api/dung-thu/vai` (chỉ bản dùng thử, chỉ tài khoản dùng thử) ghi vai vào phiên hiện tại. Không cần migration (0194 dự phòng không dùng).
- **Nhiều máy:** bản mẫu gieo dòng chính sách phiên Đối tác = nhiều máy (dữ liệu ADR-0085), không rẽ nhánh mã. Hai lớp: Đối tác là quyền bên ngoài, vốn không bắt. Chống dò PIN: bỏ khoá theo SĐT cho riêng `SDT_DUNG_THU` khi bật, vẫn khoá theo địa chỉ mạng.
- **Toàn quyền trên bản dùng thử:** tài khoản tạo lại mỗi lần làm mới nên ân hạn hai lớp 14 ngày (ADR-0074 điều 1) tính lại mỗi lần — trên thực tế không phải bật hai lớp. Ghi vào báo cáo cho chủ (hệ quả của «tạo lại mỗi 2 giờ», không phải nới luật bằng mã).
- **Khoá/mở:** D1 thứ hai `KHOA_DUNG_THU` (bảng `dt_khoa`, tạo bằng `CREATE TABLE IF NOT EXISTS` trong mã, không migration). Route `GET /api/dung-thu` (công khai: đang khoá chưa, giờ làm mới kế tiếp), `POST /api/dung-thu/khoa` (Toàn quyền thật). Đăng nhập SĐT dùng thử lúc khoá ⇒ 403 `ban_dung_thu_khoa`.
- **Chặn ở cửa (chỉ khi bật):** mọi lệnh ghi `/api/dang-ky/*` ⇒ 403; tài khoản dùng thử gọi lệnh ghi `/api/account/*` (đổi PIN, Face ID, hai lớp) ⇒ 403; lệnh ghi `/api/staff/:id…` nhắm tài khoản dùng thử hoặc Toàn quyền demo ⇒ 403; `/__ban-mau*` ⇒ 404.
- **Làm sạch:** `src/ban-dung-thu.ts`. Lịch 15 phút sẵn có; lượt có `scheduledTime` đúng phút 0 của giờ chẵn giờ VN thì làm mới. Hai khoá: `BAN_DUNG_THU = "bat"` và bảng dấu `dt_dau_dung_thu` (giá trị `demo`) trong D1. Lô: dọn view → bảng → nạp bản mẫu (`/__ban-mau.json` đọc qua `env.ASSETS`) → đặt PIN hai tài khoản từ bí mật `DUNG_THU_PIN`, `DUNG_THU_PIN_TOAN_QUYEN` + ân hạn mới, trong MỘT `db.batch`. Sau lô: dọn R2 dùng thử, đồng bộ danh mục.
- **Lần nạp đầu / đưa mã lên:** `npm run len-demo` (chủ gõ; hàng rào chặn AI): kiểm cấu hình → dựng web → `dist-demo/` (dải, tên cài, robots, bản mẫu) → deploy → nạp bản mẫu bằng nhiều `--command` (không nguyên tử, chỉ lần đầu / sau mỗi lần đưa mã).
- **Dải:** «BẢN DÙNG THỬ · dữ liệu tự xoá và đăng xuất vào mỗi giờ chẵn» (chữ sinh từ hằng `CHU_KY_GIO`); tên cài «Tour Đảo Demo».

## Task (mỗi task đỏ → xanh)

1. Luật thuần `src/shared/ban-dung-thu.ts` + bài: bật/tắt, mốc làm mới theo giờ VN, giờ kế tiếp, dựng lô làm mới, hai khoá.
2. `src/ban-dung-thu.ts` + bọc `fetch`/`scheduled` ở `src/index.ts`; bài trên khung thử: bản chính không có route/chặn mới; bản dùng thử: chọn vai, khoá/mở, chặn cửa, làm mới xoá dữ liệu thử và giữ khoá, từ chối khi thiếu một khoá.
3. Nới đăng nhập (`auth`): chống dò, vai không hạn, khoá. Chốt thư/đẩy.
4. Giao diện: sau PIN của tài khoản dùng thử hiện chọn vai (trang đăng nhập).
5. `wrangler.demo.jsonc`, `scripts/dung-tai-san-demo.mjs`, `scripts/tao-ban-mau-demo.mjs`, `scripts/len-demo.mjs`; bài so ba cấu hình; hàng rào chặn `len-demo`.
6. Tài liệu: sổ hàng rào, khối lệnh chủ tạo tài nguyên, nhật ký thay đổi (không cần — bản chính không đổi hành vi), `SYSTEM-DESIGN` mục môi trường.

## Xong khi

Bài mới xanh; `npm test`, `npm run typecheck` xanh; quan sát hai khoá chặn thật (sửa cố ý → đỏ → hoàn nguyên); người kiểm độc lập đạt. Chưa kiểm được ở máy: lô thật trên D1 Cloudflare (bước nghiệm thu đầu, chủ chạy `len-demo`).
