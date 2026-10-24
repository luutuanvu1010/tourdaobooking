# Trang ghép — lượt duyệt 1 (góp ý Hỗ trợ, 24/10)

> CLAUDE.md §9: lượt duyệt ≥ 2 quyết định phải có trang ghép; tối đa 3 quyết định chạm quyền/dữ liệu một lượt.
> Lượt này gồm **hai** nháp: **0138** gắn mức TA riêng từng đại lý (`2026-10-24-de-xuat-adr-gan-muc-ta-rieng-tung-dai-ly.md`) và **0139** SĐT HDV + tên dịch vụ cho tài xế công ty (`2026-10-24-de-xuat-adr-sdt-hdv-cho-tai-xe.md`).
> **Không** gồm: lớp giá đưa đón (YC-0014 vế tiền) — chờ nhánh đưa đón ADR-0118 vào bản chính, đặc tả đã chốt 14/10; đại lý tổ chức (0140) — lượt 2.

## 1. Bảng chạm tới, mỗi bảng chứa loại thực thể nào

| Bảng / view | Nháp | Chứa |
|---|---|---|
| `prc_party_tier` (MỚI) | 0138 | Chỉ «mức TA gắn cho một hồ sơ đối tác»; không tỷ lệ |
| `prc_commission_rule`, `prc_rate_tier`, `prc_role_tier` | 0138 (đọc) | Không đổi cấu trúc |
| Dữ liệu người phụ trách đơn (`dispatch`) | 0139 (đọc qua hàm hẹp / view mới) | Người phụ trách hiện hành của đơn |
| Liên hệ nhân viên (SĐT HDV) | 0139 (đọc hẹp, trong route sau `can(`) | Chỉ hướng dẫn viên nội bộ |
| DTO tài xế (`tai-xe-dto.ts`) | 0139 | Thêm hai khoá, chỉ cho `DRIVER`, trong ngày chạy |

Hai nháp **không chạm cùng bảng**, không chạm cùng hàm tính tiền (0139 không có tiền).

## 2. Dòng bản đồ quyền chạm tới

| Ô quyền | Nháp | Áp cho | Thay đổi |
|---|---|---|---|
| `partner.commission.view` | 0138 | Bán hàng, Kế toán, Quản trị, Toàn quyền | Không đổi; thấy thêm «mức riêng» |
| `partner.commission.write` | 0138 | Kế toán, Quản trị, Toàn quyền (phương án D2-A) | Không đổi ô; thêm việc «gắn mức riêng» |
| `trip.view` phạm vi `assigned` | 0139 | Tài xế công ty | Thấy thêm SĐT HDV + tên dịch vụ trong ngày chạy |
| `trip.view` của `DRIVER_PARTNER` | 0139 | Tài xế đối tác | **Không đổi** (phương án A) |

Không thêm mã quyền, không thêm giá trị phạm vi.

## 3. Cổng nào canh cửa nào

- **Máy chủ:** 0138 — route ghi mới trong `pricing` (`can` + `holdsPartner`); `chonMuc` thêm bậc. 0139 — route `…/cuoc-cua-toi*` (chỉ chuyến đang lái, 404 khác) + hàm khung ngày chạy.
- **CSDL:** 0138 — trigger chống chồng, hồ sơ phải là người hưởng, mức phải bật. 0139 — không có bảng mới.
- **Giao diện (chỗ ẩn/hiện bị đổi nghĩa):** 0138 — khối «Hoa hồng hiện hành» trên hồ sơ (đã lên nhánh, chỉ đọc) sẽ có nút ghi cho người giữ `partner.commission.write`. 0139 — màn chi tiết cuốc của tài xế công ty hiện thêm hai dòng.
- **Kiểm định kỳ:** 0138 thêm `R-PRC-…` (gắn riêng hợp lệ, không chồng). 0139 không có dữ liệu mới.

## 4. Ghép lại có lỗ không? (câu «bảng này nay chứa ai» — bài học F-01)

- 0138 và 0139 không chia bảng, không chia ô quyền ⇒ không có tương tác chéo.
- Rủi ro ghép duy nhất: cả hai đều thêm thứ **người dùng nhìn thấy mà trước đó không thấy** — 0138 lộ «đại lý A hưởng mức riêng» cho Bán hàng (đang xem được mọi mức qua «Thử tra», nên không mới); 0139 lộ SĐT nhân viên cho tài xế công ty (nhân viên với nhân viên).

## 5. Thứ tự thi công đề xuất sau khi duyệt

1. 0139 (nhỏ, không tiền) → 2. 0138 (tiền: cần ca vàng sổ đại lý + kiểm độc lập). Mỗi nháp một lần phát hành.

## 6. Câu chủ cần trả lời trong lượt này

1. Duyệt 0138? Chọn D2: **A** (Kế toán, Quản trị, Toàn quyền gắn mức riêng) hay B (chỉ Toàn quyền)?
2. Duyệt 0139? Chọn **A** (chỉ tài xế công ty) hay B (cả tài xế đối tác)?
