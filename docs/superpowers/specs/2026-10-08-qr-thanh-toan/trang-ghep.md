# Trang ghép — QR thanh toán (ADR-00xx) + ADR-0092 Đ6

- **Loại:** trang ghép theo `CLAUDE.md` §9 "Bước ghép khi duyệt" (lượt duyệt gồm ADR-00xx + đặc tả; bảng `bil_*` nhận thêm loại dữ liệu mới là mã giao dịch ngân hàng). Bản vòng 3, sau người kiểm độc lập vòng 1 và vòng 2 (cả hai ĐẠT CÓ ĐIỀU KIỆN); vòng 3 chưa kiểm lại.
- **Mốc mã:** `main` @`4d98a205`. Thứ tự cột quyền: `SALES, ACCOUNTING, ADMIN, FIELD, PARTNER, SUPER_ADMIN, INTERN, DRIVER, DRIVER_PARTNER, HR` (`src/shared/permissions.ts` `PERMISSION_CODES`).
- **Xây trên lỗ đang hở:** TNV-G1, TNV-G3, TNV-G4, HC-4.2 (xem đầu README).

## 0. Đếm trần 3

| # | Quyết định chạm quyền / dữ liệu | Nguồn |
|---|---|---|
| 1 | `pty_bank` + `pty_bank_account` gắn hồ sơ công ty chủ (`parties`); ghi bằng `company.legal.write`, **mở rộng nghĩa ô** sang tài khoản nhận tiền | ADR-00xx đ2 |
| 2 | Route đọc QR mới: cổng `orders`, `order.view` rồi `money.view`, không ô mới | ADR-00xx đ3 |
| 3 | Mã giao dịch ngân hàng (`billing`): ADR-0092 Đ6 + T1 (ba đường ghi đòi mã), T2 (số thực chuyển trên bảng nối `bil_receipt_bank_txn`), T4 (bớt cảnh báo khác đơn) + C1 (bắt buộc từ mốc cắt cứng). Ba luật chặn; ai thấy mã. **Không** route mới, **không** đường sửa riêng | ADR-00xx đ4 |

Tổng **3 nhóm**, trong trần (đếm theo nhóm quyết định; nhóm 3 gom T1, T2, T4, C1 vì cùng một ô dữ liệu, cùng ô quyền `ledger.write`). Bản vòng 2 có thêm đường sửa riêng (T3, một route mới + luật "người khác nâng số") và tự ghi rằng đếm chặt là 4; T3 đã bỏ. Nếu gỡ ca kẹt C4 bằng route hay luật mới thì đếm thành 4 và phải tách lượt. C1 là điều kiện của cùng ô mã, cùng dữ liệu, nên đi trong quyết định 3. Điều 1 của ADR-00xx (làm rõ phạm vi) không chạm quyền hay dữ liệu.

## 1. Bảng bị chạm chứa những loại thực thể nào

| Bảng / hàm | Module | Chứa (sau bản này) | Chạm thế nào |
|---|---|---|---|
| `pty_bank` (mới) | `parties` | ngân hàng Việt Nam (mã, BIN) — **một loại** | tạo + gieo |
| `pty_bank_account` (mới) | `parties` | tài khoản ngân hàng của **công ty chủ** — **một loại**; trigger chặn hồ sơ không mang vai `OWNER_COMPANY` | tạo |
| hàm "tài khoản hiện hành của công ty chủ" (mới, `parties/index.ts`) | `parties` | một dòng: tài khoản mở của hồ sơ **đang** là công ty chủ | tạo; `receipt` gọi hàm này (hạng không bảng, không đọc view) |
| `pty_party`, `pty_party_role` | `parties` | không đổi | chỉ đọc |
| `orders` | `orders` | không đổi | chỉ đọc mã đơn, phạm vi; **tìm kiếm** thêm khớp mã không gạch |
| `bil_payment_receipt` | `billing` | **không đổi** (không thêm cột) | chỉ đọc |
| `bil_receipt_bank_txn` (mới) | `billing` | một loại: nối lần thu ↔ mã + số thực chuyển; `receipt_id` duy nhất; chỉ lần thu **chuyển khoản**, người thu = **Công ty**; không dòng thay thế | tạo, chỉ-thêm |
| dòng cấu hình mốc cắt C1 (mới) | `billing` | một loại: mốc thời gian bắt đầu đòi mã | tạo, chỉ-thêm |
| `bil_posting` (`COMPANY_RECEIVED`, `DELIVERED`, `REPLACEMENT`) | `billing` | không thêm loại phiếu | ba lệnh "Công ty đã nhận", ghi lần thu (Kế toán / Toàn quyền; Toàn quyền kèm Đã giao), "Thay lần thu" nhận mã |
| `audit_log` | `audit` | thêm hành động: đổi tài khoản nhận tiền; gắn mã giao dịch. **Chi tiết không chứa số tài khoản, không chứa mã giao dịch** | ghi cùng lô |

## 2. Từng dòng bản đồ quyền chạm các bảng trên

| Ô | SALES | ACCOUNTING | ADMIN | FIELD | PARTNER | SUPER_ADMIN | INTERN | DRIVER | DRIVER_PARTNER | HR | Dùng ở bản này cho |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `order.view` | any | any | any | assigned | own | any | own | none | none | none | bước đầu của route QR: không thấy đơn ⇒ 404 (FIELD chỉ đơn đang phụ trách) |
| `money.view` | any | any | any | assigned | own | any | own | none | none | none | đọc QR của **một đơn** (DTO QR: số tiền + tài khoản công ty) |
| `payment.receive` | own | any | any | assigned | own | any | own | none | none | none | nút "Khách đã chuyển khoản" → **route ghi lần thu có sẵn** |
| `ledger.write` | none | any | none | none | none | any | none | none | none | none | "Công ty đã nhận", tự ghi, "Thay lần thu" + nhập / xem **mã giao dịch và số thực chuyển**; đảo lần thu để sửa nhập nhầm |
| `company.legal.write` | none | none | none | none | none | any | none | none | none | none | đọc / ghi **tài khoản nhận tiền** ở màn quản trị (**nghĩa ô mở rộng**) |

Không ô nào đổi giá trị. Không thêm ô mới. `docs/quyen-hoan.json` `thao_tac` không có ô nào ở trên. Nhãn ô `company.legal.write` (`src/shared/tro-ly-cau-truc-ten.ts`) và `docs/SYSTEM-DESIGN.md` phải cập nhật theo nghĩa mới.

**Áp cho loại nào:**
- `order.view`, `money.view`, `payment.receive` áp cho **đơn**, mọi loại bên đặt: khách lẻ, khách của đối tác, bên đặt nội bộ. Bản này **không** phân biệt khách lẻ với đơn đại lý, vì QR dùng cho cả hai.
- `company.legal.write` áp cho **hồ sơ công ty chủ** duy nhất.
- `ledger.write` áp cho **lần thu** của mọi đơn.

## 3. Cổng nào canh cửa nào (máy chủ + giao diện)

| Cửa | Máy chủ | Giao diện ẩn/hiện |
|---|---|---|
| Đọc QR của đơn | **cổng `orders`** (gồm FIELD, PARTNER, INTERN; cổng `office` sẽ chặn họ) → `order.view` (404) → `can(money.view, phạm vi đơn)` → chặn đơn đã giao (409) → `conLai` | nút "QR thanh toán" hiện khi qua `money.view`, đơn chưa giao, còn lại > 0. Ẩn nút **không** phải là hàng rào: route tự kiểm |
| Ghi lần thu từ QR | route có sẵn `POST /api/orders/:id/payments` + `can(payment.receive)`; luật giữ hộ H3 / Đ2b không đổi | nút "Khách đã chuyển khoản" hiện khi `can(payment.receive)` với đơn và `coTheGhiThu` |
| "Công ty đã nhận" + mã giao dịch | route có sẵn `POST /api/ledger/company-receipts/:id/confirm` + `can(ledger.write)`; luật Đ6 ở máy chủ **và** trigger | ô mã + số thực chuyển chỉ có trong hộp xác nhận của Kế toán |
| Kế toán / Toàn quyền tự ghi lần thu chuyển khoản (T1) | route có sẵn `POST /api/orders/:id/payments`, nhánh Kế toán (không giữ hộ); luật Đ6 như trên; "bắt buộc có mã" **chỉ máy chủ** (không có phiếu để gắn trigger) | ô mã chỉ hiện khi người ghi có `ledger.write` |
| Ghi lần thu kèm "Đã giao" | route có sẵn `POST /api/orders/:id/delivered`: `order.handover` + `payment.receive`. Toàn quyền ⇒ không giữ hộ ⇒ đòi mã; Quản trị / HDV ⇒ dòng giữ hộ, mã đến lúc "Công ty đã nhận"; Kế toán thuần ⇒ 403 | ô mã chỉ hiện cho người có `ledger.write` |
| "Thay lần thu" có mã | lệnh có sẵn (ADR-0088) + `ledger.write`; dòng nối của lần thu mới chèn **sau** dòng đảo, nên `hieuLuc` thường là đủ; khoản còn chờ xác nhận vẫn bị từ chối (`ck_cho_xac_nhan`, như hôm nay) | ô mã cho từng lần thu mới; điền sẵn mã cũ khi thay một-đổi-một |
| Sửa nhập nhầm mã / số thực chuyển | **không route mới**: đảo lần thu rồi ghi lại (trước Đã giao), "Thay lần thu" (sau) | không có nút "sửa mã" riêng |
| Gỡ khai trùng bị chặn | trước "Đã giao": đảo lần thu (`ledger.write`); sau: khoản thừa là nợ của người khai, nộp qua quyết toán có sẵn (`ledger.write`) hoặc đ9 khi có; đơn chưa Hoàn thành được tới lúc tất toán | hộp báo chặn nêu lối ra theo từng trường hợp |
| Xem mã và số thực chuyển | DTO lần thu chỉ kèm hai trường này khi `can(ledger.write)` | không hiện cho người khác |
| Ghi / đọc tài khoản nhận tiền | route mới + `can(company.legal.write)`; trigger vai `OWNER_COMPANY`; một lô đóng + mở + nhật ký | mục "Tài khoản nhận tiền" trong hồ sơ công ty chỉ hiện cho người có ô này (giao diện hỏi `can()`, không viết cứng mã quyền) |
| Ảnh QR gửi khách | DTO danh sách trường được phép (4.4) | ảnh dựng từ đúng DTO đó, không thêm trường từ màn đơn |

Mọi route mới vào snapshot `src/route-access.test.ts`.

## 4. Chỗ có thể đổi nghĩa (điểm khuất)

- **Bán hàng:** thấy QR mọi đơn (`money.view` any) nhưng chỉ ghi lần thu đơn mình lập (`payment.receive` own). Đây là chủ ý; ADR-0099 sẽ nới ô ghi thành `ownOrAssigned`.
- **Tài khoản lai** (một người vừa Bán hàng vừa Đối tác): `can()` lấy hợp quyền như hôm nay. QR không có luật riêng cho Đối tác như luật giá ADR-0027, vì QR không đổi giá.
- **Đổi công ty chủ:** hàm tài khoản hiện hành theo công ty chủ **hiện tại**, nên tài khoản của công ty cũ không còn được dùng; QR trả 409 cho tới khi Toàn quyền nhập tài khoản mới.
- **Đơn huỷ:** `conLai` = 0 ⇒ không QR. Nếu ADR-0089 sau này đổi nghĩa "còn lại" của đơn huỷ thì QR theo luôn, vì dùng cùng một hàm.
- **Đơn đã giao còn lệch** (có từ trước migration 0083): `conLai` > 0 nhưng route chặn bằng `deliveredAt`, giống `coTheGhiThu`.
- **`company.legal.write`:** trước đây chỉ là "thông tin pháp lý"; nay thêm tài khoản nhận tiền. Ai được gán ô này về sau sẽ đổi được nơi tiền chảy về.
