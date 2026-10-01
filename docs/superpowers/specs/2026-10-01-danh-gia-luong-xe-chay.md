# Đánh giá luồng "xe chạy được" — tầm kiến trúc (2026-10-01, theo mã `main` @`9cc8e16b`)

> Chỉ đọc. Người rà (subagent Explore) + điều phối tự kiểm lại: `grep -rn -E "/legs|passengers|mau-chang|flightCode|paxOverride|dropoff" web/*.ts` (trừ `short-notice`) = **rỗng**.

## Kết luận

Máy chủ đủ luồng (chặng đi/về + nơi trả, hành khách, mẫu chặng, xếp chuyến, xuất bến, tiến độ, kết thúc). **Giao diện vẫn là mô hình cũ 8 ô** (`web/trip-fields.ts:32-43`): chỉ giờ đón + điểm đón; không ô nơi trả, không chặng chiều về, không danh sách khách, không mẫu chặng, không số hiệu chuyến bay / số người chiều về. Đường ghi chặng duy nhất đang chạy là `tronChangCu` (`src/shared/chang-dua-don.ts:291-316`) — luôn chặng **đi**, nơi trả `null` (`:303`).

## Chặn xe chạy

| # | Lý do giữ (cổng xuất bến `kiemXuatBen`) | Vì sao kẹt | Gỡ được qua màn hình? |
|---|---|---|---|
| 1 | `CHUA_CO_NOI_TRA` (`src/shared/dieu-phoi-kiem.ts:326`) | không ô nơi trả; không màn hình gọi `PUT/POST /api/orders/:id/legs` | **Không** — mọi chuyến có khách của đơn sau 0034 kẹt ở `PLANNED` (trừ đơn cũ có nơi check-in được chép một lần) |
| 2 | `THIEU_TEN` (`:350`; chính sách gieo `require_manifest = 1`, `migrations/0041`) | không màn hình gọi `/passengers` ⇒ danh sách khách luôn rỗng | **Chỉ lách**: Toàn quyền tắt "Phải đủ danh sách khách" cho mọi chuyến — trái luật vận tải (họ tên + năm sinh) |

Các lý do khác (`CHUA_CO_GIO`, tài xế, GPLX, giấy tờ xe, hạng bằng, khoảng nghỉ, mốc 6 giờ, suất, chính sách) đều có màn hình gỡ.

## Lỗ kiến trúc

1. **Luật nơi trả / đủ tên chỉ ở cổng cuối** (xuất bến). `confirmGaps` (`src/modules/orders/service-rules.ts:273`) và `kiemXep` (`dieu-phoi-kiem.ts:200-225`) không kiểm ⇒ xác nhận đơn, xếp chuyến xong mới bị chặn lúc xe sắp chạy.
2. **Máy chủ và giao diện lệch mô hình**: máy chủ có chặng đi/về, giao diện một nơi đón mỗi dịch vụ ⇒ `ROUND_TRIP`, `pax_override`, mẫu chặng, `flight_code` (bản 1.53) chưa có tác dụng; trang đơn không hiện chặng / nơi trả.
3. **Đường "ghi kép" phát hành 1 (Ruling R3) thành đường ghi chính** — expand–contract ADR-0047 chưa qua được bước "giao diện ghi mô hình mới".
4. **Ranh giới module đúng luật** (`orders` không import `van-chuyen`/`dispatch`; mốc 6 giờ tiêm qua `ctx`).

## Việc cần để xe chạy (theo mức chặn)

1. **Màn chặng có nơi trả** (+ thêm chặng chiều về) — ADR-0047 Phần B, kế hoạch B0–B7 `docs/superpowers/plans/2026-09-29-adr-0047-thi-cong.md:1028-1068`. **Chờ bản vẽ Claude Design** (chủ chọn U1).
2. **Màn danh sách hành khách** (họ tên, năm sinh) — cùng Phần B.
3. Đưa kiểm "có nơi trả / đủ tên" lên sớm (cảnh báo lúc xác nhận / xếp) + trang đơn hiện chặng — cần quyết định của chủ (đổi luật xác nhận).
4. Màn Danh mục mẫu chặng + form gọi `changMacDinh` (ADR-0076).
5. Ô / hiển thị số hiệu chuyến bay, số người chiều về (ADR-0054, 0055).
