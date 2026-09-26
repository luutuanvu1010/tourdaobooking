# Sổ vàng (golden dataset) — ca tiền mẫu, đáp án đúng đến từng đồng

> Hiến chương kiến trúc lõi điều **5.17** (`docs/ARCHITECTURE.md`, chủ dự án duyệt 2026-09-26): mỗi luật sinh ra tiền có **bộ ca mẫu** đầu vào + đáp án **đúng đến từng đồng**, do **chủ dự án hoặc Kế toán xác nhận**, chạy trong `npm test`. Mã tiền chỉ được nhận khi qua **100%** ca đã xác nhận. Nguồn ý tưởng: khung Enterprise OS III.2 (`CHUNGCATKIENTHUC/ENTERPRISE_FRAMEWORK.md`).

## Tệp
| Tệp | Luật tiền | Trạng thái |
|---|---|---|
| `hoan-tat-cong-no.json` | Chia tiền khi đơn **Đã giao – đã thu đủ** (đặc tả `docs/superpowers/specs/2026-09-25-hoan-tat-don-va-so-ke-toan.md` §5, ADR-0025/0026 — nháp) | **Chờ chủ/Kế toán xác nhận** — chưa có mã sổ công nợ để chạy |

## Hai lớp kiểm
1. **Nhất quán nội tại** (`src/so-vang.test.ts`, chạy ngay): mỗi ca tự cân — tổng tiền thu = giá bán; nợ mỗi bên = tiền bên đó đã thu − phần bên đó được hưởng; phần Tour Đảo giữ = tiền công ty tự thu + tổng nợ các bên = giá bán − giá vốn − hoa hồng. Bắt **ca mẫu viết sai**, không kiểm mã.
2. **Chạy trên mã thật** (khi có sổ công nợ): cùng tệp ca, gọi hàm sinh dòng sổ thật, so đáp án. **Chưa có** — thêm khi thi công ADR-0026; lúc đó chỉ tính ca có `xac_nhan.trang_thai = "da_xac_nhan"`.

## Quy ước số
- Tiền: số nguyên đồng (VNĐ), không số thập phân.
- `no_tour_dao` của một bên: **dương** = bên đó còn nợ Tour Đảo; **âm** = Tour Đảo còn nợ bên đó.
- `duoc_huong`: hoa hồng (người hưởng / đại lý) hoặc giá vốn (nhà cung cấp); HDV nội bộ = 0.

## Thêm / sửa ca
- Thêm ca: ghi đầu vào + đáp án, `xac_nhan.trang_thai = "cho_xac_nhan"`; chạy `node --test src/so-vang.test.ts`.
- **Xác nhận ca** (đổi sang `"da_xac_nhan"` kèm người + ngày): chỉ khi chủ dự án hoặc Kế toán đã xem và đồng ý con số — AI không tự xác nhận (Hiến pháp N8).
- Sửa đáp án của ca đã xác nhận = đổi luật tiền → cần chủ dự án duyệt.
