# ADR-00xx — Mã QR thanh toán VietQR trên đơn: tài khoản nhận tiền của công ty chủ, route đọc QR theo `order.view` + `money.view`, phát hành cùng ADR-0092 Đ6

- **Trạng thái:** **proposed** (bản nháp vòng 3 ở thư mục đặc tả; chép vào `docs/adr/` khi chủ duyệt).
- **Số hiệu:** tạm `00xx`. 0103 và 0104 đang là số tạm của lượt Vận chuyển (nhánh `a1-luat-loi-chuyen`); số chính thức chốt khi chép theo thứ tự chủ duyệt.
- **Ngày:** 2026-10-08.
- **Đặc tả:** `docs/superpowers/specs/2026-10-08-qr-thanh-toan/README.md`. **Trang ghép:** `trang-ghep.md` cùng thư mục.
- **Mốc đo mã:** `main` @`4d98a205`.
- **Nguồn, lời chủ đã chốt (chat 2026-10-08, áp dụng, không hỏi lại):** bảng §2 của đặc tả.
- **ADR liên quan:** ADR-0004 (phạm vi: "không tích hợp cổng thanh toán" — **làm rõ**), ADR-0026 ("đối soát ngân hàng vẫn không" — **giữ**), ADR-0019 (cổng router), ADR-0043 (đổi công ty chủ), ADR-0088 (Thay lần thu), ADR-0090 (quyền tiền chỉ Toàn quyền), ADR-0092 Đ6 (mã giao dịch ngân hàng — **thi công, kèm T1, T2, T4**), ADR-0024 (module `receipt` hạng không bảng), ADR-0099 (Bán hàng ghi lần thu `ownOrAssigned`).
- **Hiến chương áp dụng (Phần I, đã duyệt):** 2.2, 2.3, 4.4, 5.1, 5.2, 5.4, 5.5, 5.12, 5.15. Điều 5.16 chỉ áp theo nghĩa phủ định: bản này **không** gọi hệ thống ngoài, nên không cần hộp thư đi.
- **Xây trên lỗ đang hở:** **TNV-G1, TNV-G3, TNV-G4, HC-4.2** (HIGH, hạn 2026-10-31). Chi tiết ở đầu đặc tả. Duyệt cần chủ chọn câu C2 của đặc tả.
- **Loại quyết định:** **hai chiều** (thêm bảng và route, không đổi dữ liệu cũ; bỏ tính năng = ẩn nút + ngưng route).

---

## Tóm tắt cho chủ (lời thường)

1. Nền tảng **được phép hiện mã QR chuyển khoản** vào tài khoản công ty. Đây không phải "cổng thanh toán": Nền tảng không gọi ngân hàng, cũng không nhận tin từ ngân hàng. Tự đọc tài khoản ngân hàng vẫn để sau, bằng một quyết định riêng.
2. Số tài khoản nhận tiền nằm trong **hồ sơ công ty**, có ngày bắt đầu và ngày kết thúc. Chỉ Toàn quyền đổi được, lần đổi nào cũng ghi nhật ký.
3. Ai xem được đơn và tiền của đơn thì mở được QR cho đơn đó. Số tiền do máy chủ tính, không lớn hơn số còn lại, và không có QR cho đơn đã giao.
4. Cùng bản phát hành, Kế toán gõ **mã giao dịch ngân hàng** và **số tiền thực chuyển** khi xác nhận tiền về. Nền tảng chặn việc xác nhận trùng một khoản chuyển. Nhập nhầm thì sửa bằng các lệnh sửa sai sổ tiền đã có, không mở đường sửa mới.

---

## Bối cảnh

| Nơi | Hiện trạng (đo `4d98a205`) |
|---|---|
| Phạm vi | ADR-0004: "Vẫn KHÔNG làm: tích hợp cổng thanh toán; đối soát ngân hàng; công nợ đại lý và giá net"; ADR-0026 đưa công nợ vào, "đối soát ngân hàng vẫn không" |
| Số tài khoản công ty | Không lưu ở đâu cả (`company_profile`, `pty_organization`, `CompanyDto` đều không có) |
| QR | Không có mã nào; CSP `img-src 'self' data: blob:` chặn ảnh ngoài |
| Biên nhận | `GET /api/orders/:id/receipt` ở module `receipt`, cổng `orders`, hỏi `order.view` trước |
| Còn lại của đơn | Hàm duy nhất `conLai(receipts, phaiThu, trangThai)` (`billing/rules.ts`), đơn huỷ ⇒ 0; không xét "Đã giao" (`coTheGhiThu` kiểm riêng `deliveredAt`) |
| Ghi lần thu "Công ty thu" | Người không phải Kế toán khai ⇒ dòng giữ hộ trên người khai, Kế toán xác nhận (`xacNhanCongTyNhan`, ô `ledger.write`) |
| Mã giao dịch ngân hàng | ADR-0092 Đ6 accepted 3/10, **chưa thi công**; ghi chú và lý do chặn chuỗi ≥ 8 chữ số |
| Ô quyền liên quan | `order.view`, `money.view`, `payment.receive`, `ledger.write`, `company.legal.write` (chỉ SUPER_ADMIN) — giá trị ở trang ghép §2 |

## Quyết định

1. **Phạm vi (làm rõ ADR-0004).** Hiện mã QR VietQR "chuyển tới tài khoản" của công ty chủ trên đơn **thuộc phạm vi**. Câu "không tích hợp cổng thanh toán" của ADR-0004 vẫn đứng, hiểu là: không có bên thứ ba xử lý tiền, Nền tảng không gọi ra ngoài và không nhận lời gọi từ ngân hàng. Câu "đối soát ngân hàng vẫn không" của ADR-0026 **giữ nguyên**: Kế toán đối chiếu sao kê bằng tay. Tự đọc biến động số dư cần ADR riêng và phải theo Hiến chương 5.16.
2. **Dữ liệu tài khoản nhận tiền (module `parties`).**
   - (a) `pty_bank`: bảng tra cứu ngân hàng (mã, BIN 6 số theo danh sách NAPAS, tên). Thêm ngân hàng là thêm dòng (2.2).
   - (b) `pty_bank_account`: tài khoản gắn hồ sơ (`party_id`) gồm ngân hàng, số tài khoản (chỉ chữ số), tên chủ tài khoản, `valid_from/to`, WHO. Mỗi hồ sơ tối đa một dòng mở. Trigger: lúc thêm dòng, hồ sơ phải đang mở vai `OWNER_COMPANY`; muốn mở rộng cho đại lý thì cần ADR mới. Đổi tài khoản = đóng dòng cũ + mở dòng mới + nhật ký, **một lô**. Nhật ký **không** chép số tài khoản.
   - (c) Hàm công bố trong `parties/index.ts` trả tài khoản hiện hành của công ty chủ **hiện tại**.
   - (d) Ô ghi và đọc ở màn quản trị: **`company.legal.write`** (chỉ Toàn quyền). Không thêm ô mới, nhưng **nghĩa ô mở rộng** sang tài khoản nhận tiền (cập nhật nhãn ô). Không viết cứng tài khoản trong mã hay biến môi trường (2.3, 5.2).
3. **Hiện QR.**
   - (a) Route đọc QR ở module `receipt`, **cổng `orders`**. Thân hỏi `order.view` trước (404 khi không thấy đơn, như biên nhận), rồi `money.view` theo phạm vi đơn, trước mọi truy vấn tài khoản và tiền. Không thêm ô mới.
   - (b) Số tiền **máy chủ tính**: mặc định = `conLai`; người gọi gửi số nguyên dương ≤ còn lại thì dùng số đó; trái điều kiện ⇒ 400; đơn đã "Đã giao" ⇒ 409; còn lại = 0 ⇒ 409; chưa có tài khoản ⇒ 409 (5.4).
   - (c) Payload VietQR dựng ở máy chủ bằng **hàm thuần có sổ vàng** (5.15). Trình duyệt chỉ vẽ ma trận, không gọi mạng, CSP giữ nguyên. Bộ vẽ ma trận là câu C3 của đặc tả: chép tệp MIT `qrcode-generator` vào `web/vendor/` hoặc tự viết. Đây là mã bên thứ ba đầu tiên chạy trên máy người dùng, nên chủ phải chọn.
   - (d) DTO và ảnh lưu là **danh sách trường được phép** (4.4).
   - (e) Nội dung chuyển khoản = mã đơn bỏ dấu gạch, chỉ `[A-Z0-9]`.
   - (f) Nút "Khách đã chuyển khoản" đi **đường ghi lần thu có sẵn** (`payment.receive`), không mở đường ghi mới.
4. **Phát hành cùng ADR-0092 Đ6 (module `billing`).**
   - Giữ từ Đ6: ô mã giao dịch; miễn luật ≥ 8 chữ số; chặn trùng (mã, đơn); chặn tổng theo mã > số thực chuyển; hai lớp máy chủ + trigger.
   - **Đổi so với chữ Đ6** (T1, T2, T4 của đặc tả §5), chủ duyệt cùng ADR này:
     - T1: đòi mã ở mọi đường làm lần thu chuyển khoản – Công ty thu thành "công ty đã nhận": "Công ty đã nhận", Kế toán / Toàn quyền tự ghi (kể cả kèm "Đã giao"), lần thu mới trong "Thay lần thu";
     - T2: số thực chuyển lưu trên dòng nối chỉ-thêm `bil_receipt_bank_txn` (`receipt_id` duy nhất); mọi dòng còn hiệu lực của cùng mã phải cùng số;
     - T4: **bớt** phần cảnh báo khác đơn của Đ6, chuyển sang đặc tả 2026-10-06.
   - **Không** mở đường sửa riêng cho mã / số thực chuyển (bản vòng 2 có, đã bỏ vì bị lách và vượt trần 3). Sửa nhập nhầm = đảo lần thu rồi ghi lại (trước "Đã giao") hoặc "Thay lần thu" (sau). Đây là cách hiểu "điền **hoặc sửa** lúc Công ty đã nhận" của Đ6: sửa trong hộp trước khi lưu, còn sau khi lưu thì đi lệnh sửa sai sổ.
   - "Còn hiệu lực" = đúng vị từ `hieuLuc` mà `conLai` đang dùng (5.4). Trong lô "Thay lần thu", dòng nối của lần thu mới chèn **sau** dòng đảo của lần thu cũ.
   - Khai trùng bị chặn: trước "Đã giao" thì Kế toán đảo lần thu thừa. Sau "Đã giao" thì khoản thừa là nợ của người khai; người đó nộp qua lệnh quyết toán có sẵn, hoặc giải quyết bằng đ9 (ADR-0088) khi có. "Thay lần thu" **không** dùng được cho khoản còn chờ xác nhận.
   - Mã bắt buộc từ mốc cắt cứng trong CSDL (câu C1, chủ đã chọn).
   - Chỉ người có `ledger.write` thấy mã và số thực chuyển.
   - Trần số thực chuyển chống khai trùng và gõ nhầm, **không** chống một Kế toán cố ý nhập sai lần đầu; phần đó thuộc luật hai người của HC-4.2.

## Thay câu nào

| Câu cũ | Thành |
|---|---|
| ADR-0004 "Vẫn KHÔNG làm: tích hợp cổng thanh toán" | giữ, kèm làm rõ ở điều 1: hiện QR chuyển khoản không phải cổng thanh toán |
| ADR-0092 Đ6 "Kế toán điền hoặc sửa lúc 'Công ty đã nhận'" | giữ, **cộng** T1 (mọi đường làm lần thu chuyển khoản – Công ty thu thành "đã nhận"); sửa sau khi lưu đi lệnh sửa sai sổ có sẵn |
| ADR-0092 Đ6 "cảnh báo khi cùng mã ở đơn khác" | chuyển sang đặc tả 2026-10-06 (T4) |
| `company.legal.write` "sửa thông tin công ty chủ" | + "và tài khoản nhận tiền" |
| — | ADR-0026 "đối soát ngân hàng vẫn không": không đổi |

## Hệ quả

- Thêm một nơi chứa thông tin dễ bị lợi dụng để gian lận (số tài khoản), nên cửa ghi chỉ là Toàn quyền và có lịch sử dòng. Kế hoạch phải có bài khoá ô `company.legal.write` không nới.
- Bán hàng mở được QR cho đơn người khác nhưng không ghi được lần thu đơn đó (ADR-0099 chưa thi công). Đây là chủ ý, đã ghi ở đặc tả §10.
- Nhiều khoản chuyển khoản hơn ⇒ Kế toán xác nhận nhiều hơn. Tin báo cho Kế toán (kể cả khi đổi tài khoản nhận tiền) là việc của đặc tả `2026-10-06-tin-bao-so-tien.md` (còn câu chờ chủ).
- Khi HC-4.2 được vá, có thể thêm đường sửa riêng cho mã / số thực chuyển theo luật hai người của nó.
- Lượt 2 sổ tiền dùng lại hàm tài khoản hiện hành nếu sau này cần QR cho đại lý trả số chênh (ADR mới).
