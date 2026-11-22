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

## Khối lệnh cho chủ tạo tài nguyên (AI không chạy — CLAUDE.md §8)

Chạy SAU khi nhánh này đã nhập bản chính, trong ứng dụng Terminal, đứng ở thư mục gốc `tourdao-sales`, nhánh `main`. Nếu wrangler hỏi có sửa tệp cấu hình không, trả lời `n`.

1. Tạo hai cơ sở dữ liệu (chép lại hai mã `database_id` wrangler in ra, gửi cho AI điền vào `wrangler.demo.jsonc` rồi nhập lại bản chính):
   - `npx wrangler d1 create tourdao-sales-demo-db`
   - `npx wrangler d1 create tourdao-sales-demo-khoa`
2. Tạo năm kho tệp:
   - `npx wrangler r2 bucket create tourdao-sales-demo-ho-so --config wrangler.demo.jsonc`
   - (tương tự với `tourdao-sales-demo-ho-tro`, `tourdao-sales-demo-ve-dien-tu`, `tourdao-sales-demo-bien-lai`, `tourdao-sales-demo-anh-dich-vu`)
3. Đặt năm bí mật (hai PIN do chủ tự chọn, 6 số, không dễ đoán; PIN dùng thử là PIN chủ đưa cho người thử):
   - `openssl rand -base64 48 | tr -d '\n' | npx wrangler secret put SESSION_SECRET --config wrangler.demo.jsonc`
   - `openssl rand -base64 48 | tr -d '\n' | npx wrangler secret put LAN_GUI_SECRET --config wrangler.demo.jsonc`
   - `openssl rand -base64 32 | npx wrangler secret put MFA_ENCRYPTION_KEY --config wrangler.demo.jsonc`
   - `npx wrangler secret put DUNG_THU_PIN --config wrangler.demo.jsonc`
   - `npx wrangler secret put DUNG_THU_PIN_TOAN_QUYEN --config wrangler.demo.jsonc`
4. Đưa lên: `npm run len-demo`. Tên miền `demo.tourdao.vn` tự tạo khi deploy (miền `tourdao.vn` đã ở Cloudflare). Trong vòng 15 phút, bản dùng thử tự nạp dữ liệu mẫu.
5. Nghiệm thu đầu (điều chưa kiểm được ở máy): mở «Workers › tourdao-sales-demo › Logs», tìm dòng `ban_dung_thu_lam_moi` có `"ok":true` — nghĩa là D1 thật nhận được lô làm sạch. Nếu `"ok":false` hoặc lỗi kích thước lô: báo AI, dùng đường lui đã ghi ở ADR-0223 Đ2.5.

Đăng nhập: tài khoản dùng thử SĐT `0900000100` + PIN dùng thử; Toàn quyền của chủ trên bản dùng thử SĐT `0900000101` + PIN Toàn quyền (khoá / mở ở trang Tôi › khối «Bản dùng thử»).
Mỗi lần phát hành bản chính, chạy lại `npm run len-demo` để bản dùng thử chạy cùng mã.

## Nhật ký thi công

- **22/11 — chạy thử trọn luồng ở máy** (wrangler dev với bản sao cấu hình có mã D1 giả khác nhau, D1 tạm, dữ liệu mẫu từ `tao-ban-mau-demo.mjs`): đặt dấu chờ nạp bằng đúng `CAU_DAT_CHO_NAP` → gọi `/__scheduled` → `ban_dung_thu_lam_moi ok`, một lô 1.352 câu, 275 ms; danh mục tự đồng bộ 119 dịch vụ từ Sheet thật. Đăng nhập `0900000100` → chọn «Đối tác» → `me` = `["PARTNER"]`, bên đặt = hồ sơ dùng thử → lập đơn `TD-20261122-0001`, «Gửi đơn» → nhánh B. Đổi PIN → 403 `ban_dung_thu_tai_khoan_chung`; đăng ký → 403; `/__ban-mau.json` → 404. Toàn quyền khoá → phiên dùng thử đang mở và đăng nhập dùng thử 403 `ban_dung_thu_khoa`. Làm sạch lần hai (đang khoá): một lô 1.631 câu, 493 ms; đơn 1 → 0, hai tài khoản mẫu còn, khoá vẫn bật; Toàn quyền đăng nhập lại được, mở khoá. D1 của workerd ở máy KHÁC D1 thật trên Cloudflare: giới hạn lô thật vẫn chưa kiểm.
- **Thiết kế đổi khi thi công (người thi công quyết, ghi lại):** (1) lần nạp đầu không chạy SQL nạp từ máy chủ dự án mà chỉ đặt dấu «chờ nạp»; Worker tự nạp trong một lô ở lượt lịch chạy kế tiếp — vì PIN là bí mật, máy ở nhà không đọc được, và để lần nạp đầu cũng nguyên tử như các lần sau (ADR-0223 Đ2.3a nói «chủ gõ một lệnh có tên»: vẫn đúng, `len-demo`). (2) Route chọn vai trò là `POST /api/account/dung-thu-vai` (nhóm tự phục vụ, khai ngoại lệ ở `docs/quyen-hoan.json`) thay cho `/api/dung-thu/vai`. (3) Chữ giao diện dùng «vai trò» (bảng tham chiếu loại chữ «vai» đứng một mình).
