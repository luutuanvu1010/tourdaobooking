# Trang ghép — Đưa đón theo dịch vụ (đề xuất ADR-0149, 29/10)

Theo `CLAUDE.md` §9 «Bước ghép khi duyệt»: lượt này có hai quyết định (Đ1, Đ2).

## 1. Bảng nào chứa loại thực thể nào
| Bảng | Chủ | Chứa | Mới? |
|---|---|---|---|
| `ctl_group` | catalog | nhóm dịch vụ, cờ `transfer_enabled` | có sẵn (ADR-0118) |
| `ctl_service_transfer_rule` | catalog | ô «Đưa đón» của **một dịch vụ** (`ALWAYS`/`NEVER`), có hiệu lực | **mới** |
| `catalog_item` | catalog (đồng bộ Sheet ghi) | dịch vụ | không đổi |
| bảng khoá điều kiện phí (ADR-0147) | pricing | các khoá: vùng, chiều, nhóm, xe riêng + **dịch vụ** | thêm một dòng tra cứu |
| `ord_transfer_leg` | orders | chặng | không đổi |

## 2. Dòng bản đồ quyền chạm các bảng này
| Ô quyền | Áp cho | Ai |
|---|---|---|
| `admin.manage` | ghi ô đưa đón dịch vụ, cờ nhóm, biểu phí | Quản trị, Toàn quyền |
| đọc (đã đăng nhập) | DTO form có cờ đã tính sẵn | mọi tài khoản |

Không ô quyền mới.

## 3. Cổng nào canh cửa nào
| Cửa | Cổng | Đổi gì |
|---|---|---|
| lập/lưu nháp/sửa đơn, thêm/sửa/thay chặng, PUT trip (R-T) | hàm chung đọc `v_ctl_service_transfer` | **chỉ đổi cách tính view**, cổng không đổi |
| xác nhận: `/status`, Gửi xác nhận, Còn vé, Gửi đơn A/B | `congNhomTatDuaDon` (đọc cùng view) | như trên |
| **giao diện ẩn/hiện** khối đưa đón + ghi «Không đón» (R-M) | DTO form từ `catalog/index.ts` | **phải chuyển sang cùng nguồn với view** — đây là chỗ đổi nghĩa, không phải cổng |
| màn Danh mục: ô ba lựa chọn | route `catalog` + `admin.manage` | mới |
| phí đón (khi làm ADR-0147) | hàm chọn mức của `pricing` | thêm khoá dịch vụ |
