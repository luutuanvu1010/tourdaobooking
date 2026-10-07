# Trang ghép — QR thanh toán (ADR-0103) + ADR-0092 Đ6 lõi

- **Loại:** trang ghép theo `CLAUDE.md` §9 "Bước ghép khi duyệt" (lượt duyệt gồm ADR-0103 + đặc tả; bảng `bil_*` nhận thêm loại dữ liệu mới là mã giao dịch ngân hàng).
- **Mốc mã:** `main` @`4d98a205`. Thứ tự cột quyền: `SALES, ACCOUNTING, ADMIN, FIELD, PARTNER, SUPER_ADMIN, INTERN, DRIVER, DRIVER_PARTNER, HR` (`src/shared/permissions.ts` `PERMISSION_CODES`).
- **Xây trên lỗ đang hở:** TNV-G4 (xem README đầu tệp).

## 0. Đếm trần 3

| # | Quyết định chạm quyền / dữ liệu | Nguồn |
|---|---|---|
| 1 | Bảng tra cứu ngân hàng + bảng tài khoản nhận tiền gắn hồ sơ công ty chủ (`parties`), ghi bằng `company.legal.write` | ADR-0103 đ2 |
| 2 | Route đọc QR mới dùng ô có sẵn `money.view` theo phạm vi đơn | ADR-0103 đ3 |
| 3 | Mã giao dịch ngân hàng trên lần thu (`billing`): dữ liệu mới + hai luật chặn. Nội dung đã duyệt ở ADR-0092 Đ6, lượt này chỉ quyết thứ tự phát hành và câu C1 (bắt buộc hay không) | ADR-0103 đ4 |

Tổng **3**, trong trần. Điều 1 của ADR-0103 (làm rõ phạm vi) không chạm quyền hay dữ liệu.

## 1. Bảng bị chạm chứa những loại thực thể nào

| Bảng / view | Module | Chứa (sau bản này) | Chạm thế nào |
|---|---|---|---|
| bảng tra cứu ngân hàng (mới) | `parties` | ngân hàng Việt Nam (mã, BIN) — **một loại** | tạo + gieo |
| bảng tài khoản nhận tiền (mới) | `parties` | tài khoản ngân hàng của **công ty chủ** — **một loại**; trigger chặn hồ sơ không mang vai `OWNER_COMPANY` | tạo |
| view tài khoản hiện hành (mới) | `parties` | một dòng: tài khoản mở của hồ sơ đang là công ty chủ (nối `v_pty_owner_company`) | tạo |
| `pty_party`, `pty_party_role` | `parties` | không đổi | chỉ đọc qua view |
| `orders` | `orders` | không đổi | chỉ đọc mã đơn, phạm vi; **tìm kiếm** thêm khớp mã không gạch |
| `bil_payment_receipt` | `billing` | lần thu như cũ; **thêm**: mã giao dịch ngân hàng (chỉ lần thu chuyển khoản có người thu = Công ty) | expand (cột mới hoặc bảng nối, kế hoạch chọn); không sửa dòng cũ |
| bảng "số tiền thực chuyển theo mã" (mới, nếu kế hoạch chọn bảng) | `billing` | một dòng mỗi mã giao dịch ngân hàng đã chuẩn hoá — **một loại** | tạo |
| `bil_posting` (`COMPANY_RECEIVED`) | `billing` | không thêm loại phiếu | lệnh "Công ty đã nhận" nhận thêm mã + số thực chuyển |
| `audit_log` | `audit` | thêm hai hành động: đổi tài khoản nhận tiền; (nếu cần) gắn mã giao dịch | ghi cùng lô |

## 2. Từng dòng bản đồ quyền chạm các bảng trên

| Ô | SALES | ACCOUNTING | ADMIN | FIELD | PARTNER | SUPER_ADMIN | INTERN | DRIVER | DRIVER_PARTNER | HR | Dùng ở bản này cho |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `money.view` | any | any | any | assigned | own | any | own | none | none | none | đọc QR của **một đơn** (DTO QR: số tiền + tài khoản công ty) |
| `payment.receive` | own | any | any | assigned | own | any | own | none | none | none | nút "Khách đã chuyển khoản" → **route ghi lần thu có sẵn** |
| `ledger.write` | none | any | none | none | none | any | none | none | none | none | "Công ty đã nhận" + **mã giao dịch ngân hàng** (Đ6) |
| `company.legal.write` | none | none | none | none | none | any | none | none | none | none | đọc / ghi **tài khoản nhận tiền** ở màn quản trị |

Không ô nào đổi giá trị. Không thêm ô mới. `docs/quyen-hoan.json` `thao_tac` không có ô nào ở trên.

**Áp cho loại nào:** `money.view` / `payment.receive` áp cho **đơn** (mọi loại bên đặt: khách lẻ, khách của đối tác, bên đặt nội bộ). Bản này **không** phân biệt khách lẻ với đơn đại lý, vì QR dùng cho cả hai. `company.legal.write` áp cho **hồ sơ công ty chủ** duy nhất. `ledger.write` áp cho **lần thu** của mọi đơn.

## 3. Cổng nào canh cửa nào (máy chủ + giao diện)

| Cửa | Máy chủ | Giao diện ẩn/hiện |
|---|---|---|
| Đọc QR của đơn | cổng `orders`/`office` của router + `can(money.view, phạm vi đơn)` trong thân, **trước** mọi truy vấn tài khoản; số tiền do `conLai` | nút "QR thanh toán" hiện khi `can(money.view)` **và** DTO đơn cho còn lại > 0. Ẩn nút **không** phải là hàng rào: route tự kiểm |
| Ghi lần thu từ QR | route có sẵn `POST /api/orders/:id/payments` + `can(payment.receive)`; luật giữ hộ H3 / Đ2b không đổi | nút "Khách đã chuyển khoản" hiện khi `can(payment.receive)` với đơn và `coTheGhiThu` |
| "Công ty đã nhận" + mã giao dịch | route có sẵn `POST /api/ledger/company-receipts/:id/confirm` + `can(ledger.write)`; luật Đ6 ở máy chủ **và** trigger | ô mã + số thực chuyển chỉ có trong hộp xác nhận của Kế toán |
| Sửa mã / số thực chuyển (dòng thay thế) | route mới + `can(ledger.write)`; lý do bắt buộc; hai luật Đ6 chạy lại; trigger lớp 2 | nút "Sửa mã giao dịch" chỉ ở màn của Kế toán / Toàn quyền |
| Gỡ khai trùng bị chặn | đường có sẵn: đảo lần thu (`ledger.write`) trước "Đã giao"; "Thay lần thu" (ADR-0088) sau | hộp báo chặn nêu hai lối này |
| Ghi / đọc tài khoản nhận tiền | route mới + `can(company.legal.write)`; trigger vai `OWNER_COMPANY`; một lô đóng + mở + nhật ký | mục "Tài khoản nhận tiền" trong hồ sơ công ty chỉ hiện cho người có ô này (giao diện hỏi `can()`, không viết cứng mã quyền) |
| Ảnh QR gửi khách | DTO danh sách trường được phép (4.4) | ảnh dựng từ đúng DTO đó, không thêm trường từ màn đơn |

## 4. Chỗ có thể đổi nghĩa (điểm khuất)

- **Bán hàng:** thấy QR mọi đơn (`money.view` any) nhưng chỉ ghi lần thu đơn mình lập (`payment.receive` own). Đây là chủ ý; ADR-0099 sẽ nới ô ghi thành `ownOrAssigned`.
- **Tài khoản lai** (một người vừa Bán hàng vừa Đối tác): `can()` lấy hợp quyền như hôm nay. QR không có luật riêng cho Đối tác như luật giá ADR-0027, vì QR không đổi giá.
- **Đổi công ty chủ:** view tài khoản hiện hành nối theo công ty chủ **hiện tại**, nên tài khoản của công ty cũ không còn được dùng (đặc tả §4.1).
- **Đơn huỷ:** `conLai` = 0 ⇒ không QR. Nếu ADR-0089 sau này đổi nghĩa "còn lại" của đơn huỷ thì QR theo luôn, vì dùng cùng một hàm.
