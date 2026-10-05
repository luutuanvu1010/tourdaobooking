# Sổ vàng (golden dataset) — ca tiền mẫu, đáp án đúng đến từng đồng

> Hiến chương kiến trúc lõi điều **5.17** (`docs/ARCHITECTURE.md`, chủ dự án duyệt 2026-09-26): mỗi luật sinh ra tiền có **bộ ca mẫu** đầu vào + đáp án **đúng đến từng đồng**, do **chủ dự án hoặc Kế toán xác nhận**, chạy trong `npm test`. Mã tiền chỉ được nhận khi qua **100%** ca đã xác nhận. Nguồn ý tưởng: khung Enterprise OS III.2 (`CHUNGCATKIENTHUC/ENTERPRISE_FRAMEWORK.md`).

## Tệp
| Tệp | Luật tiền | Trạng thái |
|---|---|---|
| `hoan-tat-cong-no.json` | Chia tiền khi đơn **Đã giao – đã thu đủ** (đặc tả `docs/superpowers/specs/2026-09-25-hoan-tat-don-va-so-ke-toan.md` §5, ADR-0025/0026 — nháp) | **SV-HT-06, SV-HT-07 (khách lẻ, lượt 1): ĐÃ XÁC NHẬN** 2026-09-30 (Lưu Tuấn Vũ / Giám sát kinh doanh); SV-HT-01..05 (có người hưởng / nhà cung cấp — lượt 2): chờ xác nhận. Chưa có mã sổ công nợ để chạy lớp 2 |
| `so-cong-no-luot-1.json` | Sổ công nợ lượt 1 (ADR-0026 điều 4–5, ADR-0025 điều 3d/3e, M2) — **định dạng mới**: mỗi ca là CHUỖI SỰ KIỆN tiền trên một đơn khách lẻ (thu, công ty xác nhận đã nhận, nộp, hoàn khách, đảo lần thu), đáp án = đã thu, còn lại, dư chờ hoàn, lần thu chưa rõ, số dư từng bên, có Đã giao được không | **SV-SC-01..04: CHỜ chủ dự án / Kế toán xác nhận** (AI soạn 2026-09-30, người thi công sổ tiền lượt 1); **SV-SC-05** (đơn có DÒNG NHẬP TAY — ADR-0061 điều 7, trường `dong_don`): CHỜ xác nhận (AI soạn 2026-09-30, người thi công ADR-0061) |
| `van-chuyen-chi-phi.json` | Tiền xe thuê (ADR-0057 T1 B2 + T2 C4/C8): chọn giá bảng theo nhà xe (tuyến + cỡ > tuyến > cỡ, ranh ngày), chi phí chuyến chỉ-thêm (chụp lúc xếp xe nhà xe; đảo + chụp lại khi đổi nhà xe / xe / tuyến / ngày chạy; đảo hết khi huỷ — âm trước, dương sau; giá thoả thuận; điều chỉnh; tổng ≥ 0). Ca = chuỗi sự kiện trên một chuyến, đáp án = các dòng chi phí theo thứ tự + tổng + có bị giữ "chưa có giá". Bài riêng `src/so-vang-chi-phi-xe.test.ts` (tự chốt TC-3 của kế hoạch Đợt 4 — khuôn khác sổ công nợ): lớp 1 tự cân mọi ca; lớp 2 chạy qua `src/modules/van-chuyen/tien-xe.ts` CHỈ ca đã xác nhận (chưa có ⇒ `todo`); ca chờ chỉ in chẩn đoán | **SV-CPX-01…14b: CHỜ chủ dự án / Kế toán xác nhận** (AI soạn 2026-10-02 theo ví dụ vàng V1–V13 của kế hoạch Đợt 4 + V14/V14b dời ngày — Cần chủ 3 = A) |
| `dieu-phoi/xe-a-b-luot-1.json` | **Không phải luật tiền** — bộ ca mẫu điều phối xe (ADR-0049 lượt 1; ví dụ xe A / xe B của chủ): tạo chuyến, xếp, giữ thiếu tên, nhập tên, xuất bến, mốc 6 giờ, vắng, đón muộn, kết thúc gián đoạn, chuyến cứu hộ; thêm theo ADR-0050 (B17–B23): nơi hẹn đổi sau khi xếp → giữ, cập nhật điểm theo đơn → hết giữ, văn phòng khai giờ xảy ra, khoảng nghỉ theo giờ xảy ra, xe nhà xe thiếu Bảo hiểm → giữ — mỗi bước: đầu vào, quyết định, danh sách mã luật. Cùng khuôn 5.17 (đáp án do chủ xác nhận). Bài chạy: `src/dieu-phoi-ca-mau.test.ts` (chạy ngay trên luật thuần thật, không dùng `src/so-vang.test.ts`) | **Chờ chủ xác nhận** — trước lượt duyệt 2 (lát 2.1), không chặn lượt 1 |

## Hai lớp kiểm
1. **Nhất quán nội tại** (`src/so-vang.test.ts`, chạy ngay): mỗi ca tự cân — tổng tiền thu = giá bán; nợ mỗi bên = tiền bên đó đã thu − phần bên đó được hưởng; phần Tour Đảo giữ = tiền công ty tự thu + tổng nợ các bên = giá bán − giá vốn − hoa hồng. Bắt **ca mẫu viết sai**, không kiểm mã.
2. **Chạy trên mã thật** (`src/so-vang.test.ts`, bài "LỚP 2" — có từ sổ tiền lượt 1, 2026-09-30): ca lượt 1 của cả hai tệp (khách lẻ, không người hưởng / nhà cung cấp) đi qua CHÍNH luật sinh dòng `src/modules/billing/rules.ts`, so đáp án đến từng đồng. CHỈ tính ca `"da_xac_nhan"` (hôm nay SV-HT-06, SV-HT-07); ca chờ xác nhận in "chưa áp dụng" và không được đếm; bài đỏ nếu < 2 ca đã xác nhận chạy (không "xanh vì rỗng").

## Quy ước số
- Tiền: số nguyên đồng (VNĐ), không số thập phân.
- `no_tour_dao` của một bên: **dương** = bên đó còn nợ Tour Đảo; **âm** = Tour Đảo còn nợ bên đó.
- `duoc_huong`: hoa hồng (người hưởng / đại lý) hoặc giá vốn (nhà cung cấp); HDV nội bộ = 0.

## Thêm / sửa ca
- Thêm ca: ghi đầu vào + đáp án, `xac_nhan.trang_thai = "cho_xac_nhan"`; chạy `node --test src/so-vang.test.ts`.
- **Xác nhận ca** (đổi sang `"da_xac_nhan"` kèm người + ngày): chỉ khi chủ dự án hoặc Kế toán đã xem và đồng ý con số — AI không tự xác nhận (Hiến pháp N8).
- Sửa đáp án của ca đã xác nhận = đổi luật tiền → cần chủ dự án duyệt.
