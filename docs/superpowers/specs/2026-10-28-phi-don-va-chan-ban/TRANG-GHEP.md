# Trang ghép 28/10: phí đưa đón và chính sách bán (CLAUDE.md §9)

Hồ sơ có ngày. Trang này ghép hai đề xuất cùng thư mục: `DE-XUAT-ADR-phi-dua-don.md` (gọi tắt **PĐ**) và `BO-SUNG-2026-10-28-chinh-sach-ban.md` cộng bản gốc 25/10 (gọi tắt **CSB**). Chi tiết riêng của CSB (bảng `prc_sales_block`, ba cửa khác đổi kết quả luật) đã có ở `../2026-10-25-chinh-sach-ban-va-gui-don/TRANG-GHEP.md` §1–§3; trang này chỉ thêm phần mới và chỗ hai bên đụng nhau. Đọc mã ở `main` `714fe749` ngày 28/10.

## 0. Hai lượt duyệt, không gộp
Đếm theo điều, theo tiền lệ các trang 24/10 và 25/10.

| Lượt | Nội dung | Điều chạm quyền / dữ liệu |
|---|---|---|
| A | PĐ: Đ1 vùng, Đ2 bảng phí, Đ3 dòng phí trên đơn | 3, đúng trần |
| B | CSB: Đ1, Đ3, Đ4 của bản 25/10, Đ5 thay ngày 28/10 | 4; chủ cho vượt trần ngày 25/10 |

Hai lượt không phụ thuộc nhau. Người soạn khuyên **duyệt B trước**. B không chạm tiền và không chờ Kế toán. A còn chờ hai việc: Kế toán xác nhận sổ vàng, và chủ cho «xây trên lỗ TNV-G1».

## 1. Bảng bị chạm chứa những loại thực thể nào
| Bảng | Hôm nay chứa | Nhận thêm |
|---|---|---|
| `order_item` | dòng dịch vụ danh mục (có giá danh mục) và dòng nhập tay (chỉ văn phòng, ADR-0061) | **dòng phí đưa đón** (PĐ Đ3): không phải dịch vụ, không có giá danh mục, mỗi chặng một dòng |
| `loc_location` | địa điểm mọi loại; cờ chọn nhanh (ADR-0118) | vùng (PĐ Đ1) |
| `loc_zone`, bảng phí đón, ngày bắt đầu áp | (mới) | (PĐ Đ1, Đ2) |
| `prc_sales_block` | (mới) | dòng chặn: loại đối tác × nhóm hoặc dịch vụ (CSB Đ1) |

Mọi chỗ đọc `order_item` phải biết loại dòng mới. Đề xuất cách xử lý ở từng chỗ (cả bảng là ý người soạn; sổ vàng phải phủ):
- **Tính vào:** tổng đơn, phải thu, biên nhận, và trigger khoá tiền đơn đã xác nhận (`0081`, so tổng với Σ các dòng).
- **Bỏ ra ngoài:** hoa hồng, luật giá danh mục R2, cơ sở tính trần giảm giá của Đối tác và Thực tập, và giảm giá cấp đơn.

## 2. Dòng bản đồ quyền chạm → áp cho ai
| Ô | Ai có | Dùng cho |
|---|---|---|
| `admin.manage` (không đổi nghĩa) | Quản trị, Toàn quyền | ghi vùng, bảng phí, ngày bắt đầu áp (PĐ) |
| `sales.block.write` (**mới**, tên tạm) | Bán hàng, Quản trị, Toàn quyền | đọc, thêm, kết thúc luật bán (CSB Đ5 mới) |
| `partner.commission.write` (không đổi) | Kế toán, Quản trị, Toàn quyền | tắt loại đối tác còn luật bán → 409 (CSB Đ1) |
| `order.create`, `order.modify`, xác nhận | như hôm nay | không đổi ô; chỉ thêm cổng (mục 3) |

Dòng phí trên đơn hiện cho người đã xem được tiền của đơn theo `money.view`, không thêm ô.

## 3. Cổng nào canh cửa nào
**Thứ tự trong hàm cổng xác nhận chung** (`kiemCongXacNhan`). Cổng đầu tiên trượt thắng, nên mỗi lần gọi chỉ có một câu lỗi:
1. luật bán `sales_blocked` (mới, CSB);
2. giá danh mục R2;
3. thiếu người lớn;
4. nhóm tắt đưa đón `transfer_disabled` (ADR-0118);
5. chọn Đón hay Không đón;
6. thiếu phí đón `transfer_fee_missing` (mới, PĐ). Cổng này đứng sau cổng 5 vì phải biết chặng nào còn mở;
7. mốc tối thiểu;
8. chụp hoa hồng và chụp phí đón, trong cùng lô;
9. trần giảm giá.

| Cửa | Luật bán | Phí đón |
|---|---|---|
| Lập đơn, sửa nháp | 409, không ghi | tính «dự kiến»; thiếu mức thì chỉ cảnh báo, vẫn lưu được nháp |
| `/status` xác nhận, Còn vé | 409 | thiếu mức → 409, đơn ở lại nháp |
| Gửi đơn của Đối tác | 409, ở lại nháp | thiếu mức → **nhánh A, chờ xác nhận** (không 409) |
| Đổi bên đặt (kể cả đơn đã xác nhận) | 409 | không xét lại phí |
| Thay chặng sau xác nhận | không xét (không thêm dịch vụ) | chụp lại theo bảng ngày hôm đó; thiếu mức → 409 |
| Sửa số khách sau xác nhận | không xét | tính lại theo mức đã chụp |

Cả hai cổng mới đều nằm ở **máy chủ**. Giao diện chỉ ẩn hoặc hiện để tiện dùng, không phải cổng.

### 3b. Chỗ giao diện ẩn/hiện bị đổi nghĩa
- Danh mục lập đơn của Đối tác bị lọc theo luật bán (CSB Đ4). Bài `tests/e2e/catalog.mjs` đang khẳng định Đối tác thấy đúng các nhóm như Bán hàng, nên phải sửa có chủ đích.
- **Bán hàng lần đầu có một màn cài đặt** («Luật bán», trong menu văn phòng). Mọi chỗ giao diện đang hiểu «màn cài đặt thì chỉ Quản trị trở lên» phải xét lại; cờ hiện nút lấy từ máy chủ, cùng hàm với cổng.
- Màn «Phí đón» và cột «Vùng» ở màn Địa điểm: hiện theo `admin.manage`.
- Form lập đơn: khối đưa đón có thêm dòng «Phí đón (dự kiến)», không có ô nhập. Biên nhận có thêm dòng «Phí đưa đón».
- Màn gán nhóm: cảnh báo của CSB (nhóm có luật bán) nay cảnh báo thêm khi nhóm có dòng phí đón theo nhóm.

## 4. Lỗ đang hở (`docs/quyen-hoan.json`, đọc 28/10)
- **PĐ:** xây trên **TNV-G1** (đơn huỷ còn tiền đã thu, hạn 30/11), vì dòng phí vào tổng đơn và biên nhận. Chủ phải ghi «cho xây» kèm lý do khi duyệt, hoặc chờ lỗ được vá.
- **CSB:** không chạm lỗ nào.
- Các lỗ HIGH khác (TNV-G3, TNV-G4, HC-4.2, HC-5.11, HC-5.19) không nằm trên hai đường này.

## 5. Hai quyết định đụng nhau ở đâu
- Cả hai thêm cổng vào cùng hàm cổng xác nhận. Thứ tự đã chốt ở mục 3.
- Đối tác bấm Gửi đơn: dính luật bán thì nhận 409; thiếu phí đón thì đơn chuyển sang chờ xác nhận. Khác nhau có chủ đích: văn phòng gỡ được việc thiếu phí, nhưng không được bán dịch vụ đã chặn.
- Đổi nhóm của một dịch vụ đổi luôn luật bán theo nhóm và dòng phí theo nhóm, nhưng chỉ cho đơn nháp. Đơn đã xác nhận không đổi.
- Hoa hồng không bị đụng: phí đón không vào hoa hồng, và luật bán không đổi mức hoa hồng.

## 6. Hàng rào phải sửa hoặc thêm
- Cập nhật có chủ đích ba bài canh nguồn dòng tiền (`buildlines-guard`, `thanh-tien-mot-ham`, `hoa-hong-mot-nguon`) cho nguồn dòng mới.
- Bài kiến trúc: `orders` không import `pricing`.
- `permission-enforcement` phải phủ ô mới; `route-write-guard` phải phủ các route mới.
- Bài lược đồ CSB Đ6.
- Mỗi hàng rào chỉ được ghi vào `docs/SO-HANG-RAO.md` sau khi đã quan sát nó chặn thật một lần.
