# AUDIT — rà soát kiến trúc tourdao-sales (phiên riêng, chưa phải phiên thi công)

**Mục tiêu của chủ dự án:** kiến trúc **gọn nhưng chắc**, để về sau thêm module hoặc vá lỗi **không phải đập đi làm lại**. Phiên này *đánh giá và đề xuất*; không thêm tính năng mới (M4, M5…), không đổi hành vi nếu chưa được chủ dự án duyệt.

Đọc trước: `README.md`, `docs/SPEC-tourdao-sales.md` (nguồn sự thật: §2 dữ liệu, §2.3 bất biến, §2.4 quyết định đã chốt, §3 hạ tầng, §6 lộ trình), `docs/HANDOFF-M4.md` (trạng thái + việc treo), `tests/e2e/README.md`.

## 1. Hiện trạng (2026-09-19)

Một Worker Cloudflare (TypeScript, không framework) + D1 + Workers Assets; UI thuần `public/*.html` + `web/*.ts` (esbuild → `public/js/`, gitignored, build qua `build.command`). Modular monolith: mỗi module ở `src/modules/<tên>/`, lộ ra ngoài chỉ qua `index.ts`, đăng ký một dòng ở `src/index.ts`.

| Module | Sở hữu | Ghi chú |
|---|---|---|
| `staff` | bảng `staff`, luật tài khoản, PIN, đọc Sheet nhân viên (thuần) | route rỗng; ghi dữ liệu trả *câu lệnh D1* để module khác gộp `db.batch` |
| `auth` | phiên (cookie HMAC), `requireStaff/requireAdmin`, chống dò PIN (`login_attempt`) | |
| `accounts` | API quản trị nhân viên + đổi PIN | tách khỏi `staff` để tránh vòng phụ thuộc |
| `orders` | `orders`, `order_item`, `rules.ts` thuần | mã đơn sinh nguyên tử trong INSERT |
| `catalog` | `catalog_item/override/sync`, đồng bộ Sheet dịch vụ, Cron | |
| `audit` | `audit_log` + `/api/audit` (admin) | append-only; hàm ghi trả câu lệnh D1 |
| `src/shared` | `http`, `encoding`, `csv`, `sheets`, `order-lines` (cả `web/` import) | |

Đồ thị phụ thuộc hiện tại (phải giữ DAG, không vòng): `accounts → auth → staff`; `accounts → audit`; `orders → audit, auth`; `catalog → audit, auth`; `audit → auth`.

Kiểm chứng: `npm run typecheck`, `npm test` (38 test thuần bằng `node --test`), `tests/e2e/*.mjs` (API thật trên D1 local).

## 2. Bất biến KHÔNG được phá khi tái cấu trúc

`total/subtotal/line_total/remaining_amount` luôn tính ở server (§2.3); tiền là số nguyên VNĐ; trạng thái đơn một chiều; `order_code` duy nhất, sinh nguyên tử; chỉ người lập đơn hoặc admin sửa/xác nhận/huỷ đơn; luôn còn ≥ 1 admin hoạt động (kiểm cả ở luật lẫn trong SQL); PIN không bao giờ vào nhật ký/log; đổi/đặt lại PIN thu hồi mọi phiên cũ; chỉ 5 lần thử PIN/SĐT/15 phút kể cả bắn song song; Sheet không bao giờ cấp quyền/ghi ngược; ghi đè Admin không bị đồng bộ đè; không lưu/không lộ `Khoá giá`, `Đường dẫn`, `Ghi chú nội bộ`; `order_item` giữ giá đã chốt lúc lập đơn.

## 3. Nghi vấn kiến trúc cần đánh giá (người viết thừa nhận; xếp theo *chi phí sửa muộn*)

**Cửa một chiều (đắt nếu để sau khi có dữ liệu thật) — ưu tiên số 1**
1. **`audit_log.action` là `CHECK` liệt kê cứng** → mỗi hành động mới phải dựng lại bảng (đã phải làm hai lần: 0005, 0006). Cân nhắc bỏ CHECK và kiểm ở code, hoặc bảng tra cứu.
2. **Danh sách action nằm ở 5 nơi** (CHECK trong migration, `AUDIT_ACTIONS` server, `AuditAction` + `ACTION_LABEL` ở `web/`, `<option>` trong `public/audit.html`) → dễ lệch. Tìm một nguồn duy nhất.
3. **Kiểu thời gian không thống nhất**: `TEXT` ISO ở phần lớn bảng, `INTEGER` mili-giây ở `login_attempt.at` và `staff.credentials_changed_at`.
4. **`order_item` không lưu tham chiếu tới dịch vụ catalog** (chỉ chép mô tả/giá). Mất khả năng truy vết dòng nào đến từ dịch vụ nào; cân nhắc `catalog_code` nullable *trước khi* có đơn thật.
5. **Đặt tên bảng**: `orders` (số nhiều, vì `ORDER` là từ khoá) nhưng `order_item`, `staff`, `audit_log` số ít — thống nhất trước khi có dữ liệu.
6. **`unit` của catalog lưu chuỗi thô của Sheet** (`perPax`, `per5Pax`) và parse ở code — xem có nên chuẩn hoá cột (`unit_kind`, `group_size`).

**Ranh giới module & lặp code**
7. Cách phân module `staff` (dữ liệu) / `accounts` (API) / `auth` (phiên) có hợp lý lâu dài? `audit` phụ thuộc `auth` chỉ để có `requireAdmin` — có nên tách route audit ra?
8. **Truy vấn SQL xuyên module** (`audit` join `staff`/`orders`; `orders` join `staff`) — chấp nhận được hay cần đường đọc qua `index.ts` của module chủ?
9. **Lặp**: `intParam`, `escapeLike`, regex id, khối `405 method_not_allowed`, phân tích đường dẫn bằng tay ở từng module (chưa có router), pattern "đọc → kiểm quyền → 404/403/409" lặp lại.
10. **Kiểu bị chép tay giữa server và `web/api.ts`** (DTO đơn, nhân viên, danh mục, nhật ký) — nguy cơ lệch; xem có nên có một file kiểu dùng chung.
11. `scripts/*.mjs` tự cài lại băm PIN (`staff-lib.mjs`) song song với `src/modules/staff/password.ts` — định dạng hash phải luôn khớp; nên dùng chung một nơi.
12. Quy ước import không thống nhất: file thuần dùng đuôi `.ts` (để `node --test` chạy) còn lại không; `allowImportingTsExtensions` bật toàn cục.

**Độ bền vận hành & bảo mật**
13. Không có **bắt lỗi toàn cục**: lỗi không lường trước trả 500 không có thân JSON, không có request-id, không log có cấu trúc.
14. **CSRF**: chỉ dựa `SameSite=Lax`; chưa kiểm `Origin` cho POST/PUT/PATCH/DELETE. **Header bảo mật** (CSP, X-Frame-Options, Referrer-Policy…) chưa có cho trang tĩnh.
15. Quyền hạn rải rác (kiểm `role` inline, `canModify` trong orders, `requireAdmin`) — cân nhắc một chỗ tập trung (policy).
16. Đồng bộ danh mục: **Cron và "bootstrap khi đọc lần đầu"** có thể chạy trùng; phụ thuộc `changes()` và tính nguyên tử của `db.batch` (chỉ được giải thích trong comment).
17. `SESSION_SECRET` chưa có chiến lược xoay khoá; phiên 7 ngày, thu hồi chỉ theo mốc `credentials_changed_at`.

**Kiểm thử & quy trình**
18. Kịch bản e2e vừa được lưu vào `tests/e2e/` nhưng **chưa thành bộ test tự động** (dữ liệu setup thủ công, dọn tay). Không có test cho UI (`web/`) ngoài duyệt tay.
19. **Thư mục không phải git repo** — chưa có lịch sử, chưa thể revert an toàn. Đề xuất `git init` + commit gốc *trước khi* tái cấu trúc (cần chủ dự án đồng ý).
20. Chuỗi tiếng Việt ghi cứng ở cả server lẫn client (thông báo lỗi trả về người dùng) — chấp nhận hay tách?
21. Nguy cơ lệch giữa spec và code (P4): spec đã được vá nhiều đoạn bằng ghi chú "cập nhật"; nên hợp nhất lại cho gọn.

## 4. Cách làm đề xuất

1. `git init` + commit gốc (xin phép trước). Chạy `typecheck`, `npm test`, cả 4 e2e để có mốc "xanh".
2. Đọc toàn bộ mã (khoảng 20 file nguồn + `web/` + migrations), đối chiếu spec; **đừng tin mục 3 mà không tự kiểm** — có thể còn vấn đề chưa được liệt kê, hoặc mục ở đây là báo động giả.
3. Biến e2e thành test tự động có DB riêng (`--persist-to`) **trước** khi sửa gì — đó là lưới an toàn.
4. Đề xuất, chưa làm: (a) tài liệu kiến trúc đích ngắn (luật phụ thuộc giữa module, nơi đặt code, cách thêm một module mới trong ≤ 1 trang); (b) danh sách phát hiện xếp theo *chi phí nếu sửa muộn*; (c) kế hoạch tái cấu trúc thành các bước nhỏ, mỗi bước giữ hành vi và có kiểm chứng; (d) mục cần chủ dự án quyết.
5. Thi công từng bước nhỏ chỉ sau khi chủ dự án duyệt; mỗi bước: test xanh → commit.

## 5. Thời điểm và ràng buộc

- Nên làm **trước M4** (mẫu + xuất PNG/PDF sẽ thêm module mới) và **trước khi có dữ liệu thật** — cửa một chiều ở mục 3.1–3.6 rẻ nhất ngay bây giờ.
- Tình trạng triển khai: D1 remote **đã áp 0001–0006**, còn 1 tài khoản admin gốc, 0 đơn, chưa nạp nhân viên; **Worker chưa deploy** (xem `HANDOFF-M4.md`). Migration mới nên viết **tiếp từ `0007_`**, không sửa 0001–0006 (đã áp remote).
- Mọi thay đổi schema phải có migration mới, thử trên local, rồi mới áp remote (hỏi chủ dự án trước khi chạy lệnh lên remote/deploy).
- Không đụng `tourdaovn` (dự án độc lập, chỉ đọc để đối chiếu).
