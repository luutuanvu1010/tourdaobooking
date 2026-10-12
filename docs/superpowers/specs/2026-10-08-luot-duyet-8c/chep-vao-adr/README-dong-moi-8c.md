# Dòng mới cho `docs/adr/README.md` (bản chép lượt 8c, 2026-10-08)

> Người soạn chuẩn bị; **điều phối chép** bằng công cụ sửa tệp để chủ được hỏi. Không sửa `docs/adr/` ở đây. Dòng "cũ" chép nguyên văn từ `docs/adr/README.md` @ `6b0b826e` (nhánh `claude/van-chuyen-goi-a-c`) để dùng làm chuỗi tìm khi thay. Dòng mới theo khuôn cột của dòng 0104–0107 (`:112-115`): liên kết | quyết định | cửa | trạng thái. README không có cột "bị thay": các dòng của ADR bị sửa (0063 `:93`, 0079 `:77`, 0081 `:79`, 0096 `:105`) không cần đổi — dòng 0063 "tổng tiền âm cảnh báo, không chặn" và dòng 0096 "nút đổi thứ tự cho chuyến kế hoạch" vẫn đúng; câu trỏ nằm ở dòng Trạng thái của từng ADR (`dong-tro-adr-cu-8c.md`).

## 1. Thêm hai dòng 0109, 0110 (ngay sau dòng 0107, `:115`)

Chèn sau dòng này (không đổi nó):

```
| [0107](ADR-0107-ban-hang-dat-gap-sat-gio.md) | **Bán hàng tự đóng dấu đặt gấp; dấu chỉ ghi lên chặng đang dưới mốc:** ô `order.leg.short_notice` SALES `none` → `any` (lệnh sửa / thêm / thay chặng còn hỏi `order.trip.edit`); ở cả năm cửa đóng dấu, mọi người kể cả Quản trị: lệnh kèm lý do đặt gấp chỉ được khi chặng dưới mốc (lệnh sửa, thay chặng: giờ cũ hoặc mới; 409 mới `short_notice_not_needed`), còn dấu chỉ ghi lên chặng có giờ mới dưới mốc (dời ra xa: không dấu; `PUT …/trip` xét từng chặng) — điều kiện đặt trong `xetDatGapSua`; giữ bốn lý do `LY_DO_DAT_GAP`; nhãn dấu "Điều chỉnh khẩn cấp". Thay phần đặt gấp của đề xuất ADR-0091; sửa ADR-0049 (`:30`, `:161`, `:201`, `:266`, `:303`, `:339`), qua đó ADR-0047 A1 | hai chiều | **accepted** 2026-10-08 (chủ, lượt 8b, Q-3 (câu 4 của hộp hỏi): "Duyệt cả hai ý (Recommended)" = Q-3 a) |
```

Hai dòng thêm, theo thứ tự:

```
| [0109](ADR-0109-phai-thu-khong-am.md) | **Phải thu của đơn không xuống dưới 0:** bớt khách làm tiền dịch vụ nhỏ hơn giảm giá thì phải thu = `max(0, tạm tính hiện hành − giảm giá)`, tính ở **một** hàm (`effectiveMoney`; `phaiThuCua` gọi lại) cho trang đơn, danh sách, doanh thu tuần, `conLai`, phiếu Đã giao (`due_snapshot` 0), biên nhận; giảm giá đã lưu giữ nguyên, giảm giá hiệu lực = min(giảm giá, tạm tính); dư chờ hoàn = đúng số khách đã trả nên Kế toán hoàn hết thì đơn không còn bị giữ vì trả dư; cảnh báo khi giảm giá > tạm tính, không chặn; đơn đại lý chịu giảm giá hiệu lực. Sửa ADR-0063 D1.12, ADR-0079 (`:26`–`:27`, `:43`, `:57` (iv), `:75`, R-BIL-2 `:96`, R-BIL-14 `:98`), ADR-0081 `:20`. Xây trên lỗ đang hở TNV-G1, TNV-G3 — chỉ phát hành sau Sổ tiền, cùng A2 | hai chiều trước khi có đơn nào đi qua; không migration | **accepted** 2026-10-08 (chủ, lượt 8c câu 1: "Phải thu không âm (Recommended)") |
| [0110](ADR-0110-doi-thu-tu-diem-chi-chan-dao-moi.md) | **Đổi thứ tự điểm dừng — giữ cách đang làm:** lệnh đổi thứ tự chỉ bị từ chối 409 khi làm một suất chờ lên bị đảo **mới** (đảo cũ sửa dần được bằng ↑ ↓; chuyến kế hoạch vẫn không xuất bến khi còn đảo); nút ↑ ↓ của chuyến kế hoạch đi qua lệnh sửa chuyến sẵn có `PUT /api/van-chuyen/chuyen/:id`, không route riêng. Sửa ADR-0096 Đ1.3b (thay đổi thật), Đ1.3c (sửa chữ, đọc hẹp), `:84` | hai chiều; không đổi mã | **accepted** 2026-10-08 (chủ, lượt 8c câu 2: "Giữ cách đang làm (Recommended)") |
```

## 2. Thay dòng "số ADR mới kế tiếp" (`:116`)

Cũ:

```
| — | (số ADR mới kế tiếp là **0109** — 0108 QR thanh toán VietQR (nhánh `claude/ticket-sales-qr-payment-cf8e18`, chủ duyệt 2026-10-08, chưa gộp `main`); 0107 Bán hàng tự đóng dấu đặt gấp; 0106 mốc chụp khoảng nghỉ; 0105 hai nút Chỉ đường; 0104 điều chỉnh khẩn cấp + đồng bộ chuyến; 0103 bỏ trống (từng là số tạm của lượt Vận chuyển, đổi sang 0104 vì trùng một bản nháp QR cũ; điều phối chốt bỏ trống — sổ thi công, mục "Lượt duyệt 8b"); 0102 tốc độ đợt 1; 0101 nguồn bản ghim là kho luật gốc; 0096–0100 đợt V0 kiểm theo vai 3/10; 0095 tiền xe thuê sửa ADR-0057; 0074, 0075 đăng nhập 2FA / sổ phiên; 0076–0081 đã dùng trên main; 0082 trợ lý tìm theo nghĩa; 0083 nợ rà soát vai ↔ quyền; 0084 trợ lý Mai; 0085 chính sách đăng nhập; 0086 bỏ hai ô quyền chưa có route — bị bác; 0087 giao diện công ty; 0088–0094 đợt quyết định sau thử nghiệp vụ 2/10) | | |
```

Mới:

```
| — | (số ADR mới kế tiếp là **0111** — 0110 đổi thứ tự điểm dừng: giữ cách đang làm; 0109 phải thu không âm; 0108 QR thanh toán VietQR (nhánh `claude/ticket-sales-qr-payment-cf8e18`, chủ duyệt 2026-10-08, chưa gộp `main`); 0107 Bán hàng tự đóng dấu đặt gấp; 0106 mốc chụp khoảng nghỉ; 0105 hai nút Chỉ đường; 0104 điều chỉnh khẩn cấp + đồng bộ chuyến; 0103 bỏ trống (từng là số tạm của lượt Vận chuyển, đổi sang 0104 vì trùng một bản nháp QR cũ; điều phối chốt bỏ trống — sổ thi công, mục "Lượt duyệt 8b"); 0102 tốc độ đợt 1; 0101 nguồn bản ghim là kho luật gốc; 0096–0100 đợt V0 kiểm theo vai 3/10; 0095 tiền xe thuê sửa ADR-0057; 0074, 0075 đăng nhập 2FA / sổ phiên; 0076–0081 đã dùng trên main; 0082 trợ lý tìm theo nghĩa; 0083 nợ rà soát vai ↔ quyền; 0084 trợ lý Mai; 0085 chính sách đăng nhập; 0086 bỏ hai ô quyền chưa có route — bị bác; 0087 giao diện công ty; 0088–0094 đợt quyết định sau thử nghiệp vụ 2/10) | | |
```

**Đo số (2026-10-08, sau khi gộp `claude/van-chuyen-goi-a-c` @ `6b0b826e`):**
- `git log --all --oneline -- 'docs/adr/ADR-0109*' 'docs/adr/ADR-0110*' 'docs/adr/ADR-0111*'`: rỗng — không nhánh nào có tệp mang ba số này.
- `git log --all --oneline -S "ADR-0109"`: chỉ commit của lượt 8a (`2bd077f2`, câu nhắc), lượt 8c (`ac6be652`, `d43545cc`, `ef73bbf7`, `625815b0`, `59bfd2d4`, `7913f589`, `6b0b826e`, `26393728`) và sổ `c16a3d7a` (thứ tự thi công "ADR-0105, ADR-0109") — đều nói về chính ADR này. `-S "ADR-0110"`: chỉ commit lượt 8c và sổ `7b3adcc0`. Không trùng.
- `main` (`db5e2a9f`) chưa có dòng 0108. Nhánh `claude/ticket-sales-qr-payment-cf8e18` (`aee6bc29`) có dòng 0108 (`:112`) và dòng "số kế tiếp" của nhánh đó vẫn ghi "**0103** — 0103–0107 đang là số tạm của lượt duyệt Vận chuyển 2026-10-08, 0108 QR thanh toán" (`:113`). Như lượt 8b: hai nhánh cùng sửa dòng này, ai gộp sau phải ghép tay (giữ **0111**, giữ dòng 0108).
- 0111 từng là số tạm của phương án "tự trả ghế" ở tệp 03 lượt 8c; phương án đó không được hỏi (G8 đóng), nên 0111 còn trống và là số kế tiếp.

## 3. Đề xuất cho `docs/SYSTEM-DESIGN.md` §16 (tài liệu mô tả — điều phối sửa, bản chép này không sửa)

Sau khi ADR-0110 nằm trong `docs/adr/`, hai dòng "LỆCH CÓ CHỦ Ý, chờ chủ quyết" của §16 hết là lệch (chữ ADR đã theo mã). Hai dòng cũ, nguyên văn để làm chuỗi tìm (`:1282`, `:1283`):

```
| `docs/adr/ADR-0096-thu-tu-diem-dung-cua-so-xuat-ben-va-gio-hen.md` Đ1.3c (accepted 2026-10-03) | "Lệnh đổi thứ tự nào làm vi phạm luật bị từ chối 409", ở cả chuyến kế hoạch lẫn chuyến đang chạy | LỆCH CÓ CHỦ Ý, **chờ chủ quyết** (phiếu kiểm độc lập gói A1 V2, 2026-10-08): `chanDaoMoi` (`src/modules/van-chuyen/dieu-phoi-route.ts`) + `daoMoiSauDoi` (`src/shared/thu-tu-diem.ts`) chỉ từ chối khi lệnh làm một suất CHỜ LÊN bị đảo **mới**; suất đã đảo từ trước lệnh không làm lệnh bị từ chối. Lý do: chuyến đã có hai cặp điểm đảo (lỗi gộp điểm HT-01) không sửa xong bằng một bước ↑/↓, nên đọc đúng chữ thì mọi bước sửa đều bị 409 và chuyến kẹt. Chuyến kế hoạch vẫn bị LC-19 chặn lúc xuất bến; chuyến **đang chạy** đã đảo từ trước chỉ còn bất biến `R-VC-THU-TU` (phát hiện, không chặn). Đề xuất: giữ mã, chủ duyệt bằng ADR mới / dòng lịch sử |
| `docs/adr/ADR-0096-thu-tu-diem-dung-cua-so-xuat-ben-va-gio-hen.md` Đ1.3b | Nút ↑/↓ cho chuyến kế hoạch đi qua "route mới trên chuyến kế hoạch" | LỆCH CÓ CHỦ Ý, **chờ chủ quyết** (phiếu kiểm A1 T2): nút ↑/↓ của chuyến `PLANNED` gửi `PUT /api/van-chuyen/chuyen/:id` (lệnh sửa chuyến sẵn có), không có route riêng. Cùng tác dụng: lệnh này cũng qua `traLenhLap` (lớp vé) và `chanDaoMoi`. Người kiểm thử độc lập trong vùng khoá mốc 6 giờ: chuyến đảo điểm → xuất bến 409 → PUT đổi thứ tự 200 → xuất bến 200, văn phòng không kẹt (`kiemTaoSuaChuyen` chỉ xét mốc khi đổi xe / tài xế) |
```

**Cách A (đề xuất chính): thay hai dòng bằng một dòng đóng mục, trỏ ADR-0110.** Bảng §16 có ba cột (Tệp tài liệu | Câu sai | Sự thật trong mã, `:1264`):

```
| `docs/adr/ADR-0096-thu-tu-diem-dung-cua-so-xuat-ben-va-gio-hen.md` Đ1.3b, Đ1.3c (accepted 2026-10-03) | "Lệnh đổi thứ tự nào làm vi phạm luật bị từ chối 409", ở cả chuyến kế hoạch lẫn chuyến đang chạy; nút ↑/↓ cho chuyến kế hoạch đi qua "route mới trên chuyến kế hoạch" | **ĐÃ ĐÓNG 2026-10-08** — chủ chọn giữ mã (lượt duyệt 8c câu 2, "Giữ cách đang làm (Recommended)"); chữ ADR sửa bởi [ADR-0110](adr/ADR-0110-doi-thu-tu-diem-chi-chan-dao-moi.md) (accepted 2026-10-08): lệnh đổi thứ tự chỉ bị từ chối 409 khi làm một suất chờ lên bị đảo **mới** (đảo cũ sửa dần được, `chanDaoMoi` + `daoMoiSauDoi`); nút ↑/↓ của chuyến `PLANNED` đi qua `PUT /api/van-chuyen/chuyen/:id` (thân `diem`), không có route riêng. Mã không đổi. |
```

**Cách B: xoá cả hai dòng** (§16 chỉ giữ chỗ lệch còn mở). Chọn cách này thì **phải** để dấu trỏ ở mô tả hành vi `docs/SYSTEM-DESIGN.md:609`: thêm " — ADR-0110" vào cuối cụm "(đảo cũ sửa dần được)", và " (ADR-0110)" sau cụm "nút ↑/↓ ở chi tiết chuyến kế hoạch đi qua `PUT /chuyen/:id` thân `diem`".

§16 hôm nay chưa có dòng nào ở dạng "đã đóng" (tìm "ĐÃ ĐÓNG", "đã đóng" trong `:1262-1288` chỉ gặp nghĩa khác), nên Cách A là khuôn mới; điều phối chọn.

Sổ thi công (`:73`) ghi "mục `SYSTEM-DESIGN.md` §16 tương ứng đóng khi ADR chép xong" — việc của điều phối.
