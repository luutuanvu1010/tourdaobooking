# Sổ vàng giá mùa vụ — bản đọc cho Kế toán

> **Loại tệp:** hồ sơ có ngày. **Trạng thái:** **chờ Kế toán xác nhận** (Hiến chương 5.17: luật sinh tiền phải có ca mẫu đúng từng đồng, chủ hoặc Kế toán xác nhận).
> Bản máy đọc (nguồn duy nhất của con số): `src/shared/gia-mua-vu.so-vang.json`; bài kiểm `src/shared/gia-mua-vu.test.ts`. Sửa số thì sửa ở tệp JSON, rồi sửa bảng này cho khớp.
> Đi kèm: đề xuất ADR-0229 `docs/superpowers/specs/2026-11-21-DE-XUAT-ADR-0229-gia-mua-vu.md`.

## Cách tính (chờ chủ chốt câu 2)

Giá gốc là giá của dịch vụ **sau** khi Quản trị ghi đè (nếu có). Với quy tắc «+a % và +b đồng»: lấy giá gốc nhân (100 + a) %, cộng b đồng, rồi **làm tròn lên** tới 1.000 đồng. Không có quy tắc thì giữ nguyên giá gốc. Mỗi dòng dịch vụ chỉ áp **một** quy tắc: quy tắc riêng của dịch vụ thắng quy tắc của nhóm. Quy tắc chờ duyệt hoặc đã kết thúc không áp. Ngày xét là **ngày đi** của dịch vụ.

## Năm quy tắc dùng cho các ca

| Mã | Áp cho | Ngày đi | Tăng | Tình trạng |
|---|---|---|---|---|
| R1 | nhóm «Tour đảo» | 01/02 – 15/02/2027 | +10 % +20.000 đ | đã duyệt |
| R2 | dịch vụ Tour 3 đảo | 10/02 – 12/02/2027 | +5 % | đã duyệt |
| R3 | dịch vụ Vé cano | 01/02 – 28/02/2027 | +50.000 đ | đã duyệt |
| R4 | nhóm «Tour đảo» | 01/03 – 05/03/2027 | +20 % | **đã kết thúc** |
| R5 | dịch vụ Tour 4 đảo | 01/02 – 15/02/2027 | +50 % | **chờ duyệt** |

## Ca tính giá (một khách, một đơn giá)

| Ca | Tình huống | Giá gốc | Ngày đi | Giá ra | Quy tắc | Tăng |
|---|---|---|---|---|---|---|
| C1 | Ví dụ kế hoạch: Tour 3 đảo | 450.000 | 05/02 | **515.000** | R1 | 65.000 |
| C2 | Ngoài mùa | 450.000 | 20/02 | 450.000 | — | 0 |
| C3 | Đúng ngày đầu khoảng | 450.000 | 01/02 | 515.000 | R1 | 65.000 |
| C4 | Đúng ngày cuối khoảng | 450.000 | 15/02 | 515.000 | R1 | 65.000 |
| C5 | Trước khoảng một ngày | 450.000 | 31/01 | 450.000 | — | 0 |
| C6 | Sau khoảng một ngày | 450.000 | 16/02 | 450.000 | — | 0 |
| C7 | Quy tắc dịch vụ thắng nhóm; 472.500 làm tròn lên | 450.000 | 11/02 | **473.000** | R2 | 23.000 |
| C8 | Ngày cuối quy tắc dịch vụ | 450.000 | 12/02 | 473.000 | R2 | 23.000 |
| C9 | Hết quy tắc dịch vụ, còn quy tắc nhóm | 450.000 | 13/02 | 515.000 | R1 | 65.000 |
| C10 | Tour 4 đảo: quy tắc riêng còn chờ duyệt ⇒ dùng quy tắc nhóm | 600.000 | 05/02 | 680.000 | R1 | 80.000 |
| C11 | 455.000 × 1,1 + 20.000 = 520.500 làm tròn lên | 455.000 | 05/02 | **521.000** | R1 | 66.000 |
| C12 | Chỉ tăng số tiền (Vé cano) | 200.000 | 14/02 | 250.000 | R3 | 50.000 |
| C13 | Quy tắc đã kết thúc không áp | 450.000 | 03/03 | 450.000 | — | 0 |
| C14 | Chưa có ngày đi | 450.000 | — | 450.000 | — | 0 |
| C15 | Dịch vụ nhóm khác (khách sạn) | 450.000 | 05/02 | 450.000 | — | 0 |
| C16 | Dịch vụ tính theo nhóm khách (cano riêng, giá mỗi chiếc) | 1.200.000 | 05/02 | 1.340.000 | R1 | 140.000 |
| C17 | Quản trị ghi đè 450.000 → 480.000, rồi mới cộng mùa vụ | 480.000 | 05/02 | 548.000 | R1 | 68.000 |
| C18 | Dịch vụ chưa có giá | — | 05/02 | — | — | 0 |
| C19 | **Giá 0 đ (khách miễn phí, vd em bé) giữ 0 đ** | 0 | 05/02 | 0 | — | 0 |

**Ví dụ cả đơn (kế hoạch):** 2 người lớn Tour 3 đảo đi 05/02 ⇒ 2 × 515.000 = **1.030.000 đ**; đi 20/02 ⇒ **900.000 đ**. Đơn đã xác nhận giữ nguyên số tiền dù sau đó quy tắc bị kết thúc.

## Ca kiểm lúc nhập quy tắc (trần 30 %, hôm nay 20/01/2027)

Bị từ chối: không tăng gì (0 % và 0 đ); % âm hoặc lẻ (2,5 %); số tiền âm hoặc lẻ đồng; % vượt trần (31 %); ngày cuối trước ngày đầu; ngày cuối đã qua (19/01). Được nhận: +10 % +20.000 đ; đúng trần 30 %; ngày đầu đã qua nhưng ngày cuối là hôm nay.

Chồng ngày: quy tắc mới cho nhóm «Tour đảo» 10/02–20/02 bị chặn vì chồng R1; 16/02–28/02 thì được (liền kề). Quy tắc riêng Tour 3 đảo 01/02–05/02 được dù chồng quy tắc nhóm. Quy tắc riêng Tour 3 đảo 12/02–14/02 bị chặn vì chạm ngày cuối của R2. Quy tắc đã kết thúc không tính; quy tắc chờ duyệt vẫn tính.

## Kế toán cần xác nhận

1. Mọi con số ở bảng «Ca tính giá» đúng như Kế toán tự tính tay.
2. **Ca C19**: khách có giá 0 đ (miễn phí) **không** bị cộng số tiền mùa vụ. Khuyến nghị giữ 0 đ, vì nếu cộng thì em bé miễn phí bỗng phải trả 20.000 đ trong mùa Tết. Kế toán chọn khác thì sửa ca này trước khi viết mã.
3. Cách làm tròn (làm tròn lên 1.000 đ) — chờ chủ chốt câu 2; chủ chọn khác thì C7, C11 đổi số.

Xác nhận: ghi «Kế toán xác nhận sổ vàng giá mùa vụ ngày …, người …» vào dòng Trạng thái ở đầu tệp này và ở trường `trangThai` của tệp JSON.
