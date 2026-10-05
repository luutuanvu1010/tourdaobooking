# Sổ vàng chi phí xe thuê — bản để Kế toán ký

Tình trạng: **ĐÃ KÝ** — chủ dự án Lưu Tuấn Vũ báo trong chat ngày 2026-10-02: *"đã ký sổ vàng 22 ca"*. Cả 22 ca trong `golden/van-chuyen-chi-phi.json` đổi sang "da_xac_nhan" (người: Kế toán — chủ dự án báo; ngày 2026-10-02); lớp 2 của `src/so-vang-chi-phi-xe.test.ts` chạy 22 ca qua luật tính tiền thật, khớp từng đồng (phá thử một đồng → đỏ → hoàn nguyên → xanh, 2026-10-02). Bên dưới là bản đã đưa Kế toán ký (giữ nguyên chữ). Số liệu chép đúng từ sổ vàng `golden/van-chuyen-chi-phi.json` (nhánh `worktree-agent-a76ababaa4a5b3183`); luật theo ADR-0095. Ngày theo giờ Việt Nam.

## 1. Luật máy đang tính

1. Giá thuê xe chỉ lấy từ bảng giá khi dòng giá khớp ĐỦ nhà xe, tuyến VÀ cỡ xe; không có bậc lùi, không có giá "mọi tuyến" hay "mọi cỡ". Không khớp thì chuyến chưa có giá và bị giữ lại, không bao giờ ghi 0 đồng. (ADR-0095 Q3)
2. Dời ngày chạy sang ngày khác thì máy đảo giá cũ rồi tính lại theo bảng giá của ngày chạy mới; giá thoả thuận bị đảo, phải nhập lại. Dời giờ trong cùng ngày thì không tính lại. (ADR-0095 Q1)
3. Dòng đảo mang ngày của dòng gốc nếu kỳ của ngày đó còn mở; kỳ đã khoá thì mang ngày hiện tại. (ADR-0095 Q2)
4. Phí huỷ muộn trên chuyến đã huỷ ghi theo ngày huỷ chuyến; phụ thu chờ thêm giờ và điều chỉnh khác ghi theo ngày chạy (hoặc ngày Kế toán chọn tay). (ADR-0095 Q4)
5. Chuyến đã đổi sang xe công ty (chưa huỷ) vẫn được ghi phí huỷ muộn cho nhà xe cũ; ngoài phí đó, không ghi thêm gì lên chuyến không thuê. Nếu sau đó chuyến lại đổi xe, dời ngày, đổi tuyến hoặc bị huỷ, máy đảo cả phí này theo luật chung; Kế toán ghi lại nếu vẫn phải trả (máy có danh sách cảnh báo các phí bị đảo chưa ghi lại). (ADR-0095 Q5, Q5b)
6. Đổi tuyến thì giá thoả thuận hết hiệu lực (dịch vụ khác); chuyến đã chụp giá thì không bị ảnh hưởng khi bảng giá đổi về sau, vì giá đã chụp là lời đã hứa. (ADR-0095 Q6, Q7)
7. Sổ chi phí chỉ thêm, không sửa: muốn sửa thì ghi dòng đảo; huỷ chuyến thì đảo hết (dòng âm trước, dòng dương sau); tổng chi phí chuyến không bao giờ được âm. (ADR-0057 giữ nguyên; ADR-0095 Q2)
8. Có thêm lý do "Xe hỏng giữa đường" cho điều chỉnh; sổ vàng này do Kế toán ký xác nhận trước khi phát hành tiền xe thuê. (ADR-0095 Q8, Q10)

## 2. Bảng giá mẫu dùng trong các ca

Nhà xe: Hùng Phát (HP), Nam Việt (NV). Cỡ xe: C16 = 10–16 khách, C29 = 17–29 khách (không kể tài xế).

| Dòng giá | Nhà xe | Tuyến | Cỡ xe | Giá | Hiệu lực từ | Đến |
|---|---|---|---|---|---|---|
| G1 | Nhà xe Hùng Phát | Nha Trang – sân bay Cam Ranh | 10–16 khách | 1.200.000 đ | 01/10/2026 | 31/10/2026 |
| G2 | Nhà xe Hùng Phát | Nha Trang – sân bay Cam Ranh | 17–29 khách | 1.000.000 đ | 01/10/2026 | 31/10/2026 |
| G3 | Nhà xe Hùng Phát | Nha Trang – Đà Lạt | 10–16 khách | 900.000 đ | 01/10/2026 | không giới hạn |
| G4 | Nhà xe Hùng Phát | Nha Trang – sân bay Cam Ranh | 17–29 khách | 1.100.000 đ | 01/11/2026 | không giới hạn |
| G6 | Nhà xe Nam Việt | Nha Trang – sân bay Cam Ranh | 10–16 khách | 1.300.000 đ | 01/10/2026 | không giới hạn |

Ghi chú: ca SV-CPX-11 có thêm dòng giá G5 (Hùng Phát, Cam Ranh, 10–16 khách, 1.500.000 đ, từ 10/10/2026, thay G1) do Quản trị nhập sau khi chuyến đã chụp giá.

## 3. Các ca cần ký

### SV-CPX-01

- **Chuyến:** Nhà xe Hùng Phát, xe 16 chỗ, Nha Trang – sân bay Cam Ranh, chạy ngày 15/10/2026.
- **Chuyện gì xảy ra:** Văn phòng xếp xe 16 chỗ của Hùng Phát cho tuyến Cam Ranh; máy chụp giá bảng.
- **Các dòng chi phí máy ghi, theo thứ tự:**

| # | Loại | Số tiền | Ngày ghi | Lý do |
|---|---|---|---|---|
| 1 | Giá bảng | +1.200.000 đ | 15/10/2026 | Khớp đủ tuyến + cỡ: dòng giá G1 |

- **Tổng:** 1.200.000 đ
- **Xuất bến được không:** Được.
- **Ký:** ☐ Đúng  ☐ Sai — ghi chú: ____________________

### SV-CPX-02

- **Chuyến:** Nhà xe Hùng Phát, xe 29 chỗ, Nha Trang – sân bay Cam Ranh, chạy ngày 15/10/2026.
- **Chuyện gì xảy ra:** Văn phòng xếp xe 29 chỗ của Hùng Phát cho tuyến Cam Ranh; máy chụp giá bảng.
- **Các dòng chi phí máy ghi, theo thứ tự:**

| # | Loại | Số tiền | Ngày ghi | Lý do |
|---|---|---|---|---|
| 1 | Giá bảng | +1.000.000 đ | 15/10/2026 | Khớp đủ tuyến + cỡ: dòng giá G2 |

- **Tổng:** 1.000.000 đ
- **Xuất bến được không:** Được.
- **Ký:** ☐ Đúng  ☐ Sai — ghi chú: ____________________

### SV-CPX-03

- **Chuyến:** Nhà xe Hùng Phát, xe 16 chỗ, chưa chọn tuyến, chạy ngày 15/10/2026.
- **Chuyện gì xảy ra:** Chuyến xe 16 chỗ CHƯA chọn tuyến. Không dòng giá nào khớp đủ tuyến + cỡ nên máy không ghi dòng nào, chuyến bị giữ "chưa có giá" (phải chọn tuyến hoặc nhập giá thoả thuận).
- **Các dòng chi phí máy ghi, theo thứ tự:**

(không có dòng nào)

- **Tổng:** 0 đ
- **Xuất bến được không:** Không — chuyến bị giữ "chưa có giá" cho tới khi chọn tuyến hoặc nhập giá thoả thuận.
- **Ký:** ☐ Đúng  ☐ Sai — ghi chú: ____________________

### SV-CPX-04

- **Chuyến:** Nhà xe Hùng Phát, xe 16 chỗ, Nha Trang – Đà Lạt, chạy ngày 15/10/2026.
- **Chuyện gì xảy ra:** Văn phòng xếp xe 16 chỗ cho tuyến Đà Lạt; máy chụp giá bảng.
- **Các dòng chi phí máy ghi, theo thứ tự:**

| # | Loại | Số tiền | Ngày ghi | Lý do |
|---|---|---|---|---|
| 1 | Giá bảng | +900.000 đ | 15/10/2026 | Khớp đủ tuyến + cỡ: dòng giá G3 |

- **Tổng:** 900.000 đ
- **Xuất bến được không:** Được.
- **Ký:** ☐ Đúng  ☐ Sai — ghi chú: ____________________

### SV-CPX-05a

- **Chuyến:** Nhà xe Hùng Phát, xe 29 chỗ, Nha Trang – sân bay Cam Ranh, chạy ngày 31/10/2026.
- **Chuyện gì xảy ra:** Chuyến chạy ngày cuối hiệu lực của G2 (31/10), xe 29 chỗ, tuyến Cam Ranh.
- **Các dòng chi phí máy ghi, theo thứ tự:**

| # | Loại | Số tiền | Ngày ghi | Lý do |
|---|---|---|---|---|
| 1 | Giá bảng | +1.000.000 đ | 31/10/2026 | Ngày chạy là ngày cuối hiệu lực của G2, vẫn dùng G2 |

- **Tổng:** 1.000.000 đ
- **Xuất bến được không:** Được.
- **Ký:** ☐ Đúng  ☐ Sai — ghi chú: ____________________

### SV-CPX-05b

- **Chuyến:** Nhà xe Hùng Phát, xe 29 chỗ, Nha Trang – sân bay Cam Ranh, chạy ngày 01/11/2026.
- **Chuyện gì xảy ra:** Chuyến chạy 01/11, xe 29 chỗ, tuyến Cam Ranh (giá mới G4 có hiệu lực từ 01/11).
- **Các dòng chi phí máy ghi, theo thứ tự:**

| # | Loại | Số tiền | Ngày ghi | Lý do |
|---|---|---|---|---|
| 1 | Giá bảng | +1.100.000 đ | 01/11/2026 | Từ 01/11 dùng dòng giá G4 |

- **Tổng:** 1.100.000 đ
- **Xuất bến được không:** Được.
- **Ký:** ☐ Đúng  ☐ Sai — ghi chú: ____________________

### SV-CPX-06

- **Chuyến:** Nhà xe Hùng Phát, xe 29 chỗ, chưa chọn tuyến, chạy ngày 15/10/2026.
- **Chuyện gì xảy ra:** Chuyến xe 29 chỗ chưa chọn tuyến. Không dòng giá khớp nên không ghi dòng nào, không bao giờ ghi 0 đồng; chuyến bị giữ "chưa có giá".
- **Các dòng chi phí máy ghi, theo thứ tự:**

(không có dòng nào)

- **Tổng:** 0 đ
- **Xuất bến được không:** Không — chuyến bị giữ "chưa có giá" cho tới khi chọn tuyến hoặc nhập giá thoả thuận.
- **Ký:** ☐ Đúng  ☐ Sai — ghi chú: ____________________

### SV-CPX-06b

- **Chuyến:** Nhà xe Hùng Phát, xe 29 chỗ, chưa chọn tuyến, chạy ngày 15/10/2026.
- **Chuyện gì xảy ra:** Tiếp ca SV-CPX-06: Kế toán nhập giá thoả thuận 1.350.000 đ, lý do "Giá thoả thuận trước", ghi chú "đã chốt với anh Hùng 14/10".
- **Các dòng chi phí máy ghi, theo thứ tự:**

| # | Loại | Số tiền | Ngày ghi | Lý do |
|---|---|---|---|---|
| 1 | Thoả thuận | +1.350.000 đ | 15/10/2026 | Giá thoả thuận trước — ghi chú: đã chốt với anh Hùng 14/10 |

- **Tổng:** 1.350.000 đ
- **Xuất bến được không:** Được.
- **Ký:** ☐ Đúng  ☐ Sai — ghi chú: ____________________

### SV-CPX-07

- **Chuyến:** Nhà xe Hùng Phát, xe 16 chỗ, Nha Trang – sân bay Cam Ranh, chạy ngày 15/10/2026.
- **Chuyện gì xảy ra:** Chuyến đã chụp giá 1.200.000 đ. Kế toán ghi phụ thu +150.000 đ "chờ thêm giờ". Sau đó văn phòng đổi tuyến sang Đà Lạt trước xuất bến: máy đảo phụ thu, đảo giá cũ, chụp giá mới.
- **Các dòng chi phí máy ghi, theo thứ tự:**

| # | Loại | Số tiền | Ngày ghi | Lý do |
|---|---|---|---|---|
| 1 | Giá bảng | +1.200.000 đ | 15/10/2026 | Chụp giá G1 khi xếp xe |
| 2 | Điều chỉnh | +150.000 đ | 15/10/2026 | Phụ thu chờ thêm giờ |
| 3 | Đảo | −150.000 đ | 15/10/2026 | Đảo phụ thu vì đổi tuyến |
| 4 | Đảo | −1.200.000 đ | 15/10/2026 | Đảo giá cũ G1 vì đổi tuyến |
| 5 | Giá bảng | +900.000 đ | 15/10/2026 | Chụp giá G3 (Đà Lạt + 10–16 khách) |

- **Tổng:** 900.000 đ
- **Xuất bến được không:** Được.
- **Ký:** ☐ Đúng  ☐ Sai — ghi chú: ____________________

### SV-CPX-08

- **Chuyến:** Nhà xe Hùng Phát, xe 16 chỗ, Nha Trang – sân bay Cam Ranh, chạy ngày 15/10/2026.
- **Chuyện gì xảy ra:** Chuyến đã chụp giá 1.200.000 đ. Kế toán ghi −200.000 đ "Nhập sai". Sau đó văn phòng huỷ chuyến: máy đảo hết, dòng âm trước, dòng dương sau.
- **Các dòng chi phí máy ghi, theo thứ tự:**

| # | Loại | Số tiền | Ngày ghi | Lý do |
|---|---|---|---|---|
| 1 | Giá bảng | +1.200.000 đ | 15/10/2026 | Chụp giá G1 |
| 2 | Điều chỉnh | −200.000 đ | 15/10/2026 | Nhập sai |
| 3 | Đảo | +200.000 đ | 15/10/2026 | Đảo điều chỉnh âm trước (lô huỷ chuyến) |
| 4 | Đảo | −1.200.000 đ | 15/10/2026 | Đảo giá bảng sau (lô huỷ chuyến) |

- **Tổng:** 0 đ
- **Xuất bến được không:** Không áp dụng (chuyến đã huỷ hoặc đã chạy).
- **Ký:** ☐ Đúng  ☐ Sai — ghi chú: ____________________

### SV-CPX-08b

- **Chuyến:** Nhà xe Hùng Phát, xe 16 chỗ, Nha Trang – sân bay Cam Ranh, chạy ngày 15/10/2026.
- **Chuyện gì xảy ra:** Như SV-CPX-08 nhưng chuyến huỷ ngày 13/10 (chạy 15/10). Sau khi huỷ, Kế toán ghi phí huỷ muộn +300.000 đ không chọn ngày nên máy ghi theo ngày huỷ 13/10; các dòng đảo mang ngày dòng gốc 15/10.
- **Các dòng chi phí máy ghi, theo thứ tự:**

| # | Loại | Số tiền | Ngày ghi | Lý do |
|---|---|---|---|---|
| 1 | Giá bảng | +1.200.000 đ | 15/10/2026 | Chụp giá G1 |
| 2 | Điều chỉnh | −200.000 đ | 15/10/2026 | Nhập sai |
| 3 | Đảo | +200.000 đ | 15/10/2026 | Đảo điều chỉnh âm (lô huỷ chuyến, mang ngày dòng gốc) |
| 4 | Đảo | −1.200.000 đ | 15/10/2026 | Đảo giá bảng (lô huỷ chuyến, mang ngày dòng gốc) |
| 5 | Điều chỉnh | +300.000 đ | 13/10/2026 | Phí huỷ muộn, ghi theo ngày huỷ chuyến 13/10 |

- **Tổng:** 300.000 đ
- **Xuất bến được không:** Không áp dụng (chuyến đã huỷ hoặc đã chạy).
- **Ký:** ☐ Đúng  ☐ Sai — ghi chú: ____________________

### SV-CPX-09

- **Chuyến:** Nhà xe Hùng Phát, xe 16 chỗ, Nha Trang – sân bay Cam Ranh, chạy ngày 15/10/2026.
- **Chuyện gì xảy ra:** Chuyến đã chụp giá 1.200.000 đ và có điều chỉnh −200.000 đ. Kế toán tự đảo giá bảng: máy từ chối, sổ không đổi.
- **Các dòng chi phí máy ghi, theo thứ tự:**

| # | Loại | Số tiền | Ngày ghi | Lý do |
|---|---|---|---|---|
| 1 | Giá bảng | +1.200.000 đ | 15/10/2026 | Chụp giá G1 |
| 2 | Điều chỉnh | −200.000 đ | 15/10/2026 | Nhập sai |

- **Tổng:** 1.000.000 đ
- **Máy từ chối (sự kiện thứ 3):** Tổng chi phí chuyến sẽ âm — đảo điều chỉnh giảm trước
- **Xuất bến được không:** Được.
- **Ký:** ☐ Đúng  ☐ Sai — ghi chú: ____________________

### SV-CPX-10

- **Chuyến:** Nhà xe Hùng Phát, xe 16 chỗ, Nha Trang – sân bay Cam Ranh, chạy ngày 15/10/2026.
- **Chuyện gì xảy ra:** Chuyến đã chụp giá 1.200.000 đ, xe hỏng giữa đường (kết thúc gián đoạn). Giá đã chụp giữ nguyên. Kế toán ghi −400.000 đ "Xe hỏng giữa đường".
- **Các dòng chi phí máy ghi, theo thứ tự:**

| # | Loại | Số tiền | Ngày ghi | Lý do |
|---|---|---|---|---|
| 1 | Giá bảng | +1.200.000 đ | 15/10/2026 | Chụp giá G1, giữ nguyên khi xe hỏng |
| 2 | Điều chỉnh | −400.000 đ | 15/10/2026 | Xe hỏng giữa đường |

- **Tổng:** 800.000 đ
- **Xuất bến được không:** Không áp dụng (chuyến đã huỷ hoặc đã chạy).
- **Ký:** ☐ Đúng  ☐ Sai — ghi chú: ____________________

### SV-CPX-11

- **Chuyến:** Nhà xe Hùng Phát, xe 16 chỗ, Nha Trang – sân bay Cam Ranh, chạy ngày 15/10/2026.
- **Chuyện gì xảy ra:** Chuyến đã chụp giá 1.200.000 đ. Sau đó Quản trị đổi giá cùng tuyến + cỡ thành 1.500.000 đ (G5 thay G1 từ 10/10, trước cả ngày chạy). Chuyến đã chụp giá nên KHÔNG đổi.
- **Các dòng chi phí máy ghi, theo thứ tự:**

| # | Loại | Số tiền | Ngày ghi | Lý do |
|---|---|---|---|---|
| 1 | Giá bảng | +1.200.000 đ | 15/10/2026 | Chụp giá G1; việc Quản trị đổi giá G5 sau đó không làm đổi chuyến này |

- **Tổng:** 1.200.000 đ
- **Xuất bến được không:** Được.
- **Ký:** ☐ Đúng  ☐ Sai — ghi chú: ____________________

### SV-CPX-12

- **Chuyến:** Nhà xe Hùng Phát, xe 29 chỗ, chưa chọn tuyến, chạy ngày 15/10/2026.
- **Chuyện gì xảy ra:** Chuyến xe 29 chỗ chưa chọn tuyến, Kế toán nhập thoả thuận 1.350.000 đ. Sau đó văn phòng đổi tuyến sang Cam Ranh: máy đảo thoả thuận (không tự chuyển) và chụp giá bảng G2.
- **Các dòng chi phí máy ghi, theo thứ tự:**

| # | Loại | Số tiền | Ngày ghi | Lý do |
|---|---|---|---|---|
| 1 | Thoả thuận | +1.350.000 đ | 15/10/2026 | Giá thoả thuận trước — ghi chú: đã chốt với anh Hùng 14/10 |
| 2 | Đảo | −1.350.000 đ | 15/10/2026 | Đảo thoả thuận vì đổi tuyến |
| 3 | Giá bảng | +1.000.000 đ | 15/10/2026 | Chụp giá G2 (Cam Ranh + 17–29 khách) |

- **Tổng:** 1.000.000 đ
- **Xuất bến được không:** Được.
- **Ký:** ☐ Đúng  ☐ Sai — ghi chú: ____________________

### SV-CPX-12b

- **Chuyến:** Nhà xe Hùng Phát, xe 29 chỗ, chưa chọn tuyến, chạy ngày 15/10/2026.
- **Chuyện gì xảy ra:** Như SV-CPX-12 nhưng đổi tuyến sang Đà Lạt. Không có giá Đà Lạt + 17–29 khách nên máy đảo thoả thuận và báo thiếu giá (phải nhập lại thoả thuận).
- **Các dòng chi phí máy ghi, theo thứ tự:**

| # | Loại | Số tiền | Ngày ghi | Lý do |
|---|---|---|---|---|
| 1 | Thoả thuận | +1.350.000 đ | 15/10/2026 | Giá thoả thuận trước — ghi chú: đã chốt với anh Hùng 14/10 |
| 2 | Đảo | −1.350.000 đ | 15/10/2026 | Đảo thoả thuận vì đổi tuyến sang Đà Lạt (không có giá Đà Lạt + 17–29 khách) |

- **Tổng:** 0 đ
- **Xuất bến được không:** Không — chuyến bị giữ "chưa có giá" cho tới khi chọn tuyến hoặc nhập giá thoả thuận.
- **Ký:** ☐ Đúng  ☐ Sai — ghi chú: ____________________

### SV-CPX-13

- **Chuyến:** Nhà xe Hùng Phát, xe 16 chỗ, Nha Trang – sân bay Cam Ranh, chạy ngày 15/10/2026.
- **Chuyện gì xảy ra:** Chuyến đã chụp giá 1.200.000 đ, sau đó đổi sang xe công ty: máy đảo giá, chuyến thành "không thuê" (không cần giá).
- **Các dòng chi phí máy ghi, theo thứ tự:**

| # | Loại | Số tiền | Ngày ghi | Lý do |
|---|---|---|---|---|
| 1 | Giá bảng | +1.200.000 đ | 15/10/2026 | Chụp giá G1 |
| 2 | Đảo | −1.200.000 đ | 15/10/2026 | Đảo giá vì đổi sang xe công ty |

- **Tổng:** 0 đ
- **Xuất bến được không:** Được. (Chuyến không thuê, không cần giá.)
- **Ký:** ☐ Đúng  ☐ Sai — ghi chú: ____________________

### SV-CPX-14

- **Chuyến:** Nhà xe Hùng Phát, xe 29 chỗ, Nha Trang – sân bay Cam Ranh, chạy ngày 31/10/2026.
- **Chuyện gì xảy ra:** Chuyến 31/10 đã chụp giá G2, văn phòng dời sang 01/11 trước xuất bến. Máy đảo G2 mang ngày 31/10 (tháng 10 về 0) và chụp G4 ngày 01/11.
- **Các dòng chi phí máy ghi, theo thứ tự:**

| # | Loại | Số tiền | Ngày ghi | Lý do |
|---|---|---|---|---|
| 1 | Giá bảng | +1.000.000 đ | 31/10/2026 | Chụp giá G2 |
| 2 | Đảo | −1.000.000 đ | 31/10/2026 | Đảo giá G2 vì dời ngày, mang ngày dòng gốc 31/10 |
| 3 | Giá bảng | +1.100.000 đ | 01/11/2026 | Chụp giá G4 theo ngày chạy mới 01/11 |

- **Tổng:** 1.100.000 đ
- **Xuất bến được không:** Được.
- **Ký:** ☐ Đúng  ☐ Sai — ghi chú: ____________________

### SV-CPX-14b

- **Chuyến:** Nhà xe Hùng Phát, xe 29 chỗ, chưa chọn tuyến, chạy ngày 15/10/2026.
- **Chuyện gì xảy ra:** Chuyến có thoả thuận 1.350.000 đ, dời GIỜ trong cùng ngày chạy. Không tính lại, thoả thuận giữ nguyên.
- **Các dòng chi phí máy ghi, theo thứ tự:**

| # | Loại | Số tiền | Ngày ghi | Lý do |
|---|---|---|---|---|
| 1 | Thoả thuận | +1.350.000 đ | 15/10/2026 | Giá thoả thuận trước — ghi chú: đã chốt với anh Hùng 14/10; dời giờ trong cùng ngày, không tính lại |

- **Tổng:** 1.350.000 đ
- **Xuất bến được không:** Được.
- **Ký:** ☐ Đúng  ☐ Sai — ghi chú: ____________________

### SV-CPX-15

- **Chuyến:** Nhà xe Hùng Phát, xe 16 chỗ, Nha Trang – sân bay Cam Ranh, chạy ngày 15/10/2026.
- **Chuyện gì xảy ra:** Chuyến đã chụp giá Hùng Phát. Văn phòng đổi sang xe 16 chỗ của Nam Việt trước xuất bến: máy đảo giá Hùng Phát (dòng đảo mang Hùng Phát), chụp giá Nam Việt.
- **Các dòng chi phí máy ghi, theo thứ tự:**

| # | Loại | Số tiền | Ngày ghi | Lý do |
|---|---|---|---|---|
| 1 | Giá bảng | +1.200.000 đ | 15/10/2026 | Chụp giá G1 (Hùng Phát) [nhà xe: Nhà xe Hùng Phát] |
| 2 | Đảo | −1.200.000 đ | 15/10/2026 | Đảo giá Hùng Phát vì đổi sang xe nhà xe khác [nhà xe: Nhà xe Hùng Phát] |
| 3 | Giá bảng | +1.300.000 đ | 15/10/2026 | Chụp giá G6 (Nam Việt) [nhà xe: Nhà xe Nam Việt] |

- **Tổng:** 1.300.000 đ
- **Xuất bến được không:** Được.
- **Ký:** ☐ Đúng  ☐ Sai — ghi chú: ____________________

### SV-CPX-16

- **Chuyến:** Nhà xe Hùng Phát, xe 16 chỗ, Nha Trang – sân bay Cam Ranh, chạy ngày 15/10/2026.
- **Chuyện gì xảy ra:** Chuyến đã chụp giá Hùng Phát rồi đổi sang xe công ty (chưa huỷ). Kế toán ghi phí huỷ muộn +300.000 đ, dòng mang nhà xe cũ Hùng Phát. Sau đó ghi +50.000 đ "Khác" thì bị từ chối (chuyến không còn là xe thuê, chỉ cho phí huỷ muộn nhà xe cũ).
- **Các dòng chi phí máy ghi, theo thứ tự:**

| # | Loại | Số tiền | Ngày ghi | Lý do |
|---|---|---|---|---|
| 1 | Giá bảng | +1.200.000 đ | 15/10/2026 | Chụp giá G1 (Hùng Phát) [nhà xe: Nhà xe Hùng Phát] |
| 2 | Đảo | −1.200.000 đ | 15/10/2026 | Đảo giá vì đổi sang xe công ty [nhà xe: Nhà xe Hùng Phát] |
| 3 | Điều chỉnh | +300.000 đ | 15/10/2026 | Phí huỷ muộn cho nhà xe cũ Hùng Phát [nhà xe: Nhà xe Hùng Phát] |

- **Tổng:** 300.000 đ
- **Máy từ chối (sự kiện thứ 4):** Chuyến không còn là xe thuê — chỉ cho phí huỷ muộn nhà xe cũ
- **Xuất bến được không:** Được.
- **Ký:** ☐ Đúng  ☐ Sai — ghi chú: ____________________

### SV-CPX-17

- **Chuyến:** Nhà xe Hùng Phát, xe 16 chỗ, Nha Trang – sân bay Cam Ranh, chạy ngày 15/10/2026.
- **Chuyện gì xảy ra:** Chuyến đã chụp giá 1.200.000 đ. Kế toán ghi phụ thu +150.000 đ ngày 20/10 (chọn tay), rồi tự đảo dòng đó; dòng đảo mang 20/10 chứ không phải ngày hôm nay. Sau đó chuyến huỷ ngày 22/10: lô huỷ đảo giá bảng, mang ngày 15/10.
- **Các dòng chi phí máy ghi, theo thứ tự:**

| # | Loại | Số tiền | Ngày ghi | Lý do |
|---|---|---|---|---|
| 1 | Giá bảng | +1.200.000 đ | 15/10/2026 | Chụp giá G1 |
| 2 | Điều chỉnh | +150.000 đ | 20/10/2026 | Phụ thu chờ thêm giờ, ngày chọn tay 20/10 |
| 3 | Đảo | −150.000 đ | 20/10/2026 | Kế toán tự đảo phụ thu, mang ngày dòng gốc 20/10 |
| 4 | Đảo | −1.200.000 đ | 15/10/2026 | Đảo giá bảng (lô huỷ chuyến), mang ngày dòng gốc 15/10 |

- **Tổng:** 0 đ
- **Xuất bến được không:** Không áp dụng (chuyến đã huỷ hoặc đã chạy).
- **Ký:** ☐ Đúng  ☐ Sai — ghi chú: ____________________

---

Kế toán: ____________________  Ngày: ____________
