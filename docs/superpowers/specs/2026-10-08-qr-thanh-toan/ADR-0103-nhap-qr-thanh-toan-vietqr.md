# ADR-0103 — Mã QR thanh toán VietQR trên đơn: tài khoản nhận tiền của công ty chủ, route đọc QR theo `money.view`, phát hành cùng ADR-0092 Đ6 lõi

- **Trạng thái:** **proposed** (bản nháp nằm ở thư mục đặc tả; chép vào `docs/adr/` khi chủ duyệt).
- **Số hiệu:** 0103. Lớn nhất trên mọi nhánh đọc 2026-10-08 là 0102.
- **Ngày:** 2026-10-08.
- **Đặc tả:** `docs/superpowers/specs/2026-10-08-qr-thanh-toan/README.md`. **Trang ghép:** `trang-ghep.md` cùng thư mục.
- **Mốc đo mã:** `main` @`4d98a205`.
- **Nguồn, lời chủ đã chốt (chat 2026-10-08, áp dụng, không hỏi lại):** bảng §2 của đặc tả. Tóm tắt: giá lẻ + hoa hồng; QR cho khách lẻ và khách của CTV/đại lý; Kế toán bấm xác nhận (không tự đọc ngân hàng); HDV nội bộ chỉ hiện QR đơn đang phụ trách; QR trên màn đơn + lưu ảnh, không vào biên nhận; số tiền = còn lại hoặc nhỏ hơn; ra cùng mã giao dịch ngân hàng; chỉ Toàn quyền đổi tài khoản.
- **ADR liên quan:** ADR-0004 (phạm vi: "không tích hợp cổng thanh toán" — **làm rõ**), ADR-0026 ("đối soát ngân hàng vẫn không" — **giữ**), ADR-0043 (đổi công ty chủ), ADR-0090 (quyền tiền chỉ Toàn quyền), ADR-0092 Đ6 (mã giao dịch ngân hàng — **thi công phần lõi**, không đổi nội dung), ADR-0024 (module `receipt` hạng không bảng), ADR-0099 (Bán hàng ghi lần thu `ownOrAssigned`).
- **Hiến chương áp dụng (Phần I, đã duyệt):** 2.2, 2.3, 4.4, 5.1, 5.2, 5.4, 5.5, 5.12, 5.15, 5.16.
- **Xây trên lỗ đang hở:** **TNV-G4** (HIGH, hạn 2026-10-31). Bản này vá phần lõi Đ6 của chính lỗ đó; Đ6a và cảnh báo khác đơn còn hở. Duyệt cần câu lý do của chủ.
- **Loại quyết định:** **hai chiều** (thêm bảng và route, không đổi dữ liệu cũ; bỏ tính năng = ẩn nút + ngưng route).

---

## Tóm tắt cho chủ (lời thường)

1. Nền tảng **được phép hiện mã QR chuyển khoản** vào tài khoản công ty. Đây không phải "cổng thanh toán": Nền tảng không gọi ngân hàng, cũng không nhận tin từ ngân hàng. Tự đọc tài khoản ngân hàng vẫn để sau, bằng một quyết định riêng.
2. Số tài khoản nhận tiền nằm trong **hồ sơ công ty**, có ngày bắt đầu và ngày kết thúc. Chỉ Toàn quyền đổi được, lần đổi nào cũng ghi nhật ký.
3. Ai xem được tiền của một đơn thì mở được QR cho đơn đó. Số tiền do máy chủ tính, không lớn hơn số còn lại.
4. Cùng bản phát hành, Kế toán gõ **mã giao dịch ngân hàng** khi xác nhận tiền về. Nền tảng chặn việc xác nhận trùng một khoản chuyển.

---

## Bối cảnh

| Nơi | Hiện trạng (đo `4d98a205`) |
|---|---|
| Phạm vi | ADR-0004: "Vẫn KHÔNG làm: tích hợp cổng thanh toán; đối soát ngân hàng; công nợ đại lý và giá net"; ADR-0026 đưa công nợ vào, "đối soát ngân hàng vẫn không" |
| Số tài khoản công ty | Không lưu ở đâu cả (`company_profile`, `pty_organization`, `CompanyDto` đều không có) |
| QR | Không có mã nào; CSP `img-src 'self' data: blob:` chặn ảnh ngoài |
| Còn lại của đơn | Hàm duy nhất `conLai(receipts, phaiThu, trangThai)` (`billing/rules.ts`), đơn huỷ ⇒ 0 |
| Ghi lần thu "Công ty thu" | Người không phải Kế toán khai ⇒ dòng giữ hộ trên người khai, Kế toán xác nhận (`xacNhanCongTyNhan`) |
| Mã giao dịch ngân hàng | ADR-0092 Đ6 accepted 3/10, **chưa thi công** (dừng ở nhánh năm lỗi tiền); ghi chú chặn chuỗi ≥ 8 chữ số |
| Ô quyền liên quan | `money.view` (SALES any, ACCOUNTING any, ADMIN any, FIELD assigned, PARTNER own, SUPER_ADMIN any, INTERN own, còn lại none); `payment.receive` (SALES own, …); `company.legal.write` (chỉ SUPER_ADMIN) |

## Quyết định

1. **Phạm vi (làm rõ ADR-0004).** Hiện mã QR VietQR "chuyển tới tài khoản" của công ty chủ trên đơn **thuộc phạm vi**. Câu "không tích hợp cổng thanh toán" của ADR-0004 vẫn đứng, hiểu là: không có bên thứ ba xử lý tiền, Nền tảng không gọi ra ngoài và không nhận lời gọi từ ngân hàng. Câu "đối soát ngân hàng vẫn không" của ADR-0026 **giữ nguyên**: Kế toán đối chiếu sao kê bằng tay. Tự đọc biến động số dư cần ADR riêng và phải theo Hiến chương 5.16.
2. **Dữ liệu (module `parties`).**
   - (a) Bảng tra cứu ngân hàng gồm mã, BIN 6 số theo danh sách NAPAS, tên. Thêm ngân hàng là thêm dòng (2.2).
   - (b) Bảng **tài khoản nhận tiền** gắn hồ sơ (`party_id`): ngân hàng, số tài khoản (chỉ chữ số), tên chủ tài khoản, `valid_from/to`, cột WHO. Mỗi hồ sơ tối đa một dòng mở. Trigger: lúc thêm dòng, hồ sơ phải đang mở vai `OWNER_COMPANY`; muốn mở rộng cho đại lý thì cần ADR mới. Đổi tài khoản = đóng dòng cũ + mở dòng mới + nhật ký, **một lô**.
   - (c) View công bố tài khoản hiện hành của công ty chủ để module khác đọc.
   - (d) Ô ghi: **`company.legal.write`** (chỉ Toàn quyền), không thêm ô mới. Không viết cứng tài khoản trong mã hay biến môi trường (2.3, 5.2).
3. **Hiện QR.**
   - (a) Route đọc QR trên đơn hỏi **`can(money.view)`** theo phạm vi đơn hiện hành, không thêm ô mới.
   - (b) Số tiền **máy chủ tính**: mặc định = `conLai`; người gọi gửi số nguyên dương ≤ còn lại thì dùng số đó; trái điều kiện ⇒ 400; còn lại = 0 ⇒ 409; chưa có tài khoản ⇒ 409 (5.4).
   - (c) Payload VietQR dựng ở máy chủ bằng **hàm thuần có sổ vàng** (5.15). Trình duyệt chỉ vẽ ma trận bằng thư viện MIT chép vào `web/vendor/`, không gọi mạng, CSP giữ nguyên (5.16).
   - (d) DTO và ảnh lưu là **danh sách trường được phép** (4.4).
   - (e) Nội dung chuyển khoản = mã đơn bỏ dấu gạch, chỉ `[A-Z0-9]`.
   - (f) Nút "Khách đã chuyển khoản" đi **đường ghi lần thu có sẵn** (`payment.receive`), không mở đường ghi mới.
4. **Phát hành cùng ADR-0092 Đ6 phần lõi.** Phần lõi gồm: ô mã giao dịch ngân hàng ở "Công ty đã nhận" và ở lần thu chuyển khoản do Kế toán ghi; miễn luật ≥ 8 chữ số; chặn trùng (mã, đơn); chặn tổng theo mã > số thực chuyển. Có hai lớp: máy chủ và trigger. Nội dung Đ6 không đổi. Phần cảnh báo khác đơn và Đ6a đi theo đặc tả 2026-10-06. Mã có bắt buộc hay không: theo câu C1 của đặc tả.

## Thay câu nào

| Câu cũ | Thành |
|---|---|
| ADR-0004 "Vẫn KHÔNG làm: tích hợp cổng thanh toán" | giữ, kèm làm rõ ở điều 1: hiện QR chuyển khoản không phải cổng thanh toán |
| — | ADR-0026 "đối soát ngân hàng vẫn không": không đổi |

## Hệ quả

- Thêm một nơi chứa thông tin dễ bị lợi dụng để gian lận (số tài khoản), nên cửa ghi chỉ là Toàn quyền và có lịch sử dòng. Kế hoạch phải có bài khoá ô `company.legal.write` không nới.
- Bán hàng mở được QR cho đơn người khác nhưng không ghi được lần thu đơn đó (ADR-0099 chưa thi công). Đây là chủ ý, đã ghi ở đặc tả §10.
- Nhiều khoản chuyển khoản hơn ⇒ Kế toán xác nhận nhiều hơn. Tin báo cho Kế toán vẫn là việc của đặc tả `2026-10-06-tin-bao-so-tien.md` (còn câu chờ chủ).
- Lượt 2 sổ tiền đọc lại view tài khoản này nếu sau này cần QR cho đại lý trả số chênh (ADR mới).
