# Trang ghép 28/10: phí đưa đón và chính sách bán (CLAUDE.md §9)

Hồ sơ có ngày. Trang này ghép hai đề xuất cùng thư mục:
- `DE-XUAT-ADR-phi-dua-don.md`, gọi tắt **PĐ**;
- `BO-SUNG-2026-10-28-chinh-sach-ban.md` cộng bản gốc 25/10, gọi tắt **CSB**.

Chi tiết riêng của CSB đã có ở `../2026-10-25-chinh-sach-ban-va-gui-don/TRANG-GHEP.md` §1–§3: bảng `prc_sales_block`, và ba cửa khác làm đổi kết quả của luật. Trang này chỉ thêm phần mới và chỗ hai bên đụng nhau. Mã đọc ở `main` `714fe749` ngày 28/10. Người kiểm độc lập đã soát sự thật một vòng; bản này đã sửa theo kết quả đó.

## 0. Hai lượt duyệt, không gộp
Đếm theo điều, theo tiền lệ các trang 24/10 và 25/10.

| Lượt | Nội dung | Điều chạm quyền / dữ liệu |
|---|---|---|
| A | PĐ: Đ1 vùng, Đ2 bảng phí, Đ3 dòng phí trên đơn | 3, đúng trần |
| B | CSB: Đ1, Đ3, Đ4 của bản 25/10, cộng Đ5 thay ngày 28/10 | 4; chủ đã cho vượt trần ngày 25/10 |

**Phép vượt trần của lượt B cần chủ xác nhận lại.** Ngày 25/10 chủ cho vượt trần khi Đ5 còn dùng ô có sẵn (`settings.ops`, chỉ Toàn quyền). Nay Đ5 thêm một ô mới cho Bán hàng, tức là đổi quyền lớn hơn. Chủ chọn một trong hai:
- giữ phép vượt trần cho cả bốn điều;
- tách Đ5 thành lượt riêng.

Hai lượt không phụ thuộc nhau. Người soạn khuyên **duyệt B trước**, vì B không chạm tiền và không phải chờ Kế toán. Lượt A còn chờ hai việc:
- Kế toán xác nhận sổ vàng;
- chủ cho phép «xây trên lỗ TNV-G1».

## 1. Bảng bị chạm chứa những loại thực thể nào
| Bảng | Hôm nay chứa | Nhận thêm |
|---|---|---|
| `order_item` | dòng dịch vụ danh mục (có giá danh mục), dòng nhập tay (chỉ văn phòng, ADR-0061) | **dòng phí đưa đón** (PĐ Đ3): không phải dịch vụ, không có giá danh mục, mỗi chặng một dòng |
| `order_money_adjustment` | dòng sửa số khách sau xác nhận (chỉ mang số khách theo dịch vụ) | **không nhận loại mới**; sửa số khách tính lại phí theo khách qua hàm tiền hiệu lực `computeEffectiveMoney` |
| `loc_location` | địa điểm mọi loại; cờ chọn nhanh (ADR-0118) | vùng (PĐ Đ1) |
| `loc_zone`; bảng quy tắc phí, bảng điều kiện, bảng khoá điều kiện; ngày bắt đầu áp | (mới) | (PĐ Đ1, Đ2) |
| `prc_sales_block` | (mới) | dòng chặn: loại đối tác × nhóm hoặc dịch vụ (CSB Đ1) |

**Trigger `0081` giữ nguyên.** Khi đơn hết nháp, trigger cấm thêm, sửa, xoá dòng `order_item`, và cấm đổi tạm tính, giảm giá, tổng. Vì vậy sau xác nhận chỉ có một chỗ phí đón đổi được: khi sửa số khách, qua đường sẵn có. Đổi chặng sau xác nhận không đổi phí (PĐ Đ3).

Mọi chỗ đọc `order_item` phải biết loại dòng mới. Cách xử lý ở từng chỗ là ý người soạn, và sổ vàng phải phủ đủ:
- **Tính vào:** tổng đơn; phải thu; biên nhận; phép so tổng với các dòng của `0081`.
- **Tính vào nhưng theo luật riêng:** hàm chia phần người bán `chiaPhanNguoiBan`, dùng cho biên nhận và cho trần phần của quầy ở billing. Hôm nay hàm cộng mọi dòng của một dịch vụ vào phần người bán dịch vụ đó. Dòng phí phải tách ra, vào **phần của Tour Đảo**.
- **Bỏ ra ngoài:** hoa hồng; luật giá danh mục R2; cơ sở tính trần giảm giá của Đối tác và Thực tập; giảm giá cấp đơn.

## 2. Dòng bản đồ quyền chạm → áp cho ai
| Ô | Ai có | Dùng cho |
|---|---|---|
| `admin.manage` (không đổi nghĩa) | Quản trị, Toàn quyền | ghi vùng, bảng phí, ngày bắt đầu áp (PĐ) |
| `sales.block.write` (**mới**, tên tạm) | Bán hàng, Quản trị, Toàn quyền | đọc, thêm, kết thúc luật bán (CSB Đ5 mới) |
| `partner.commission.write` (không đổi) | Kế toán, Quản trị, Toàn quyền | tắt loại đối tác còn luật bán → 409 (CSB Đ1) |
| `order.create`, `order.modify`, xác nhận | như hôm nay | không đổi ô; chỉ thêm cổng (mục 3) |

Dòng phí trên đơn hiện cho người đã xem được tiền của đơn theo `money.view`; không thêm ô.

**Chỗ hai ô lệch nhau (đã tránh, không phải chờ chủ quyết).**
- Sửa chặng sau xác nhận dùng ô `order.trip.edit`: Bán hàng `ownOrAssigned`, tức cả người phụ trách.
- Sửa tiền sau xác nhận dùng ô `order.money.edit`: Bán hàng chỉ `own`, tức người lập.
- Nếu đổi chặng kéo theo đổi phí, người phụ trách mà không phải người lập sẽ đổi được tiền. PĐ Đ3 chặn điều này từ gốc: đổi chặng sau xác nhận không đổi tiền.

**Cạnh phụ thuộc giữa phân hệ: không thêm cạnh nào.**
- `orders` đã import `pricing` và `locations` từ trước. Nó đọc vùng qua view của `locations`, rồi gọi hàm chọn mức qua `index.ts` của `pricing`.
- `pricing` không đọc `locations`.

## 3. Cổng nào canh cửa nào
**Thứ tự trong hàm cổng xác nhận chung** (`kiemCongXacNhan`; dùng cho `/status`, Còn vé, Gửi đơn). Cổng đầu tiên trượt thắng, nên mỗi lần gọi chỉ có một câu lỗi:
1. luật bán `sales_blocked` (mới, CSB);
2. giá danh mục R2;
3. thiếu người lớn;
4. nhóm tắt đưa đón `transfer_disabled` (ADR-0118);
5. chọn Đón hay Không đón;
6. thiếu phí đón `transfer_fee_missing` (mới, PĐ). Cổng này đứng sau cổng 5, vì phải biết chặng nào còn mở. Gửi đơn gọi hàm này **trước** khi chia nhánh, nên hàm nhận một tham số riêng cho Gửi đơn: thiếu phí thì trả cờ «đi nhánh A», không trả lỗi;
7. mốc tối thiểu;
8. chụp hoa hồng và chụp phí đón, trong cùng lô;
9. trần giảm giá.

**Gửi xác nhận không đi qua hàm này.** Cửa đó tự chốt nhóm tắt đưa đón và chọn Đón (ADR-0118). Cả hai cổng mới phải có **chốt riêng** ở cửa này.

| Cửa | Luật bán | Phí đón |
|---|---|---|
| Lập đơn, sửa nháp | 409, không ghi | tính «dự kiến»; thiếu mức thì chỉ cảnh báo, vẫn lưu được nháp |
| Gửi xác nhận (văn phòng) | chốt riêng, 409 | chốt riêng; thiếu mức → 409 |
| `/status` xác nhận, Còn vé | 409 | thiếu mức → 409, đơn ở lại nháp |
| Gửi đơn của Đối tác | 409, ở lại nháp | thiếu mức → **nhánh A, chờ xác nhận** (không 409; sửa ADR-0136 Đ13.2 và Đ13.3) |
| Đổi bên đặt (kể cả đơn đã xác nhận) | 409 | không xét lại phí |
| Thêm, bỏ, thay chặng sau xác nhận | không xét (không thêm dịch vụ) | phí đã chụp giữ nguyên, không ghi dòng tiền; thu thêm thì dùng điều chỉnh sổ công nợ (ADR-0115, người thứ hai duyệt) |
| Sửa số khách sau xác nhận | không xét | tính lại theo mức đã chụp, qua đường sửa số khách sẵn có (ô `order.money.edit`) |

Cả hai cổng mới đều nằm ở **máy chủ**. Giao diện chỉ ẩn hoặc hiện để tiện dùng, không phải cổng.

### 3b. Chỗ giao diện ẩn/hiện bị đổi nghĩa
- **Danh mục lập đơn của Đối tác** bị lọc theo luật bán (CSB Đ4). Bài `tests/e2e/catalog.mjs` đang khẳng định Đối tác thấy đúng các nhóm như Bán hàng, nên bài này phải sửa có chủ đích.
- **Bán hàng lần đầu có một màn cài đặt** («Luật bán», trong menu văn phòng). Mọi chỗ giao diện đang hiểu «màn cài đặt thì chỉ Quản trị trở lên» phải xét lại. Cờ hiện nút lấy từ máy chủ, cùng hàm với cổng.
- **Màn «Phí đón» và cột «Vùng»** ở màn Địa điểm hiện theo `admin.manage`.
- **Form lập đơn:** khối đưa đón có thêm dòng «Phí đón (dự kiến)», không có ô nhập. **Biên nhận** có thêm dòng «Phí đưa đón», nằm trong phần của Tour Đảo.
- **Màn gán nhóm:** cảnh báo của CSB (nhóm có luật bán) nay cảnh báo thêm khi nhóm có dòng phí đón theo nhóm.

## 4. Lỗ đang hở (`docs/quyen-hoan.json`, đọc 28/10)
- **PĐ** xây trên **TNV-G1** (đơn huỷ còn tiền đã thu, hạn 30/11), vì dòng phí vào tổng đơn và biên nhận. Chủ phải ghi «cho xây» kèm lý do khi duyệt, hoặc chờ lỗ được vá.
- **HC-5.19** (chưa diễn tập khôi phục) không nằm trên đường của PĐ. Nhưng sổ đại lý đợt 2 từng gắn điều kiện «chỉ phát hành sau diễn tập» cho một phát hành ghi tiền một chiều. Chủ tự quyết có áp điều kiện đó cho PĐ không.
- **CSB** không chạm lỗ nào.
- **TNV-G4 và HC-4.2 nằm ngoài đường của PĐ**, kèm lý do.
  - PĐ không sinh dòng điều chỉnh tự động nào, và không ghi gì vào sổ công nợ.
  - Phần thu thêm sau xác nhận đi qua điều chỉnh sổ công nợ đã có người thứ hai duyệt (ADR-0115), tức chính phần vá của HC-4.2.
  - Phí theo khách đổi khi sửa số khách đi qua đường sẵn có, không thêm cửa.
- TNV-G3 và HC-5.11 không nằm trên hai đường này.

## 5. Hai quyết định đụng nhau ở đâu
- **Cùng một hàm cổng:** cả hai thêm cổng vào hàm cổng xác nhận chung, và cả hai thêm chốt riêng ở Gửi xác nhận. Thứ tự đã chốt ở mục 3.
- **Đối tác bấm Gửi đơn:** dính luật bán thì nhận 409; thiếu phí đón thì đơn chuyển sang chờ xác nhận. Khác nhau có chủ đích: văn phòng gỡ được việc thiếu phí, nhưng không được bán dịch vụ đã bị chặn.
- **Đổi nhóm của một dịch vụ** đổi luôn luật bán theo nhóm và dòng phí theo nhóm, nhưng chỉ cho đơn nháp. Đơn đã xác nhận không đổi.
- **Hoa hồng không bị đụng:** phí đón không vào hoa hồng, và luật bán không đổi mức hoa hồng.

## 6. Hàng rào phải sửa hoặc thêm
- Cập nhật có chủ đích ba bài canh nguồn dòng tiền (`buildlines-guard`, `thanh-tien-mot-ham`, `hoa-hong-mot-nguon`) cho nguồn dòng mới.
- Bài kiến trúc: `van-chuyen` không import `pricing`. Cạnh `orders → pricing` đã có từ trước nên không rào.
- Bài khớp danh sách khoá điều kiện: bảng tra cứu khớp với danh sách đăng ký trong mã.
- Bài chốt riêng ở Gửi xác nhận, theo khuôn bài `orders-khong-doc-nhom-truc-tiep`.
- `permission-enforcement` phải phủ ô mới; `route-write-guard` phải phủ các route mới. Thêm bài lược đồ CSB Đ6.
- Mỗi hàng rào chỉ được ghi vào `docs/SO-HANG-RAO.md` sau khi đã quan sát nó chặn thật một lần.
