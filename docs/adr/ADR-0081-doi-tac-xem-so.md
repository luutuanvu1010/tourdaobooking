# ADR-0081 — Sổ tiền lượt 2: Đối tác xem sổ của chính mình (số dư + từng đơn) qua ô riêng `ledger.partner.view`, danh sách trắng, không thấy giá vốn / tỷ lệ nội bộ / nợ của người khác

- **Trạng thái:** **accepted** — chủ dự án 2026-10-01 trong chat: trả lời 13 câu *"cả 13 theo khuyến nghị"* (C1–C13 = A, `docs/superpowers/specs/2026-10-01-de-xuat-adr-so-tien-luot-2/cau-hoi-chu.md`), rồi duyệt lượt **2d** bằng hộp chọn "Duyệt lượt 2d (Recommended)" (quyết toán tháng + khoá sổ tháng; đại lý xem "Sổ của tôi"; gồm nới ba hàng rào C12). Người kiểm độc lập: ĐẠT vòng 3 (bản nháp). Bản nháp + lịch sử sửa: `docs/superpowers/specs/2026-10-01-de-xuat-adr-so-tien-luot-2/`.
- **Số hiệu:** 0081 — chốt 2026-10-01 (0073 trợ lý; 0074, 0075 đã có nhánh khác giữ; 0076 nơi trả mặc định; 0077–0081 = A–E của gói sổ tiền lượt 2).
- **Ngày:** 2026-10-01.
- **Thuộc gói:** lượt duyệt **2d** (cùng ADR-0080; ADR này = **1** quyết định chạm quyền — ô mới `ledger.partner.view`). Phát hành chung một bản với A, B, C, D.
- **Phụ thuộc:** ADR-0079 (dòng thương mại có trên sổ), ADR-0080 (bảng kê tháng, cờ "tháng đã khoá") — vì vậy E duyệt cùng hoặc sau D.
- **Mốc đo mã:** `8f647226`; `main` @`0c4309cd`.
- **Nguồn — lời chủ đã chốt:** **U4 (1/10):** "Có, chỉ xem của mình: **số dư và từng đơn**; **không thấy giá vốn, tỷ lệ nội bộ**". ADR-0018 Q35: "đối tác thấy [chiết khấu] của mình; khách không bao giờ". ADR-0026 điều 10: `ledger.view` PARTNER = `none` ở lượt 1, "mở `own` ở lượt 2". ADR-0018 điều 9 / Q4: công ty lữ hành dùng **một tài khoản chung** gắn hồ sơ công ty.
- **ADR liên quan:** ADR-0026 (điều 7 "Sổ của tôi", điều 10, điều 11 danh sách trắng), ADR-0019 (cổng `orders` cho Đối tác), ADR-0014 (tài khoản Đối tác; điều 2 — Toàn quyền `any` ở mọi ô), ADR-0024 (`OrderDetailDto` không bao giờ mang giá vốn / chiết khấu).
- **Hiến chương áp dụng:** 4.4 (hình chiếu danh sách trắng), K4 / 5.8 (quyền qua `can()`), 5.4, 5.12.
- **Xây trên lỗ đang hở:** **không** (`phat_hien = []`, `main` @`0c4309cd`).
- **Loại quyết định:** **hai chiều** cho ô quyền; **một chiều về thông tin** — số đối tác đã xem thì không thu lại được.

---

## Tóm tắt cho chủ (lời thường)

1. Đại lý mở app thấy mục **"Sổ của tôi"**: tổng **còn phải trả Tour Đảo** (hoặc **Tour Đảo còn phải trả mình**), chia theo tháng, và danh sách **từng đơn** mà họ là bên đặt.
2. Mỗi đơn hiện: giá bán lẻ, **hoa hồng của mình** (số tiền), giảm giá mình đã cho khách, tiền mình đã thu của khách, tiền khách đã trả nơi khác (Tour Đảo / tại quầy, gộp một số), đã quyết toán, còn lại.
3. **Không bao giờ** hiện: giá vốn, % mua của nhà cung cấp, hoa hồng hay nợ của đại lý khác, tiền HDV đang giữ, tên người thu. Có hiện **mức % của chính họ** hay không: câu **C9** (mặc định ẩn).
4. Công ty lữ hành dùng tài khoản chung ⇒ mọi người dùng tài khoản đó thấy sổ của **công ty** đó.
5. Nhân viên (kể cả HDV) **không** vào được màn này — quyền xem sổ của nhân viên giữ nguyên như lượt 1.

---

## Quyết định

1. **Ô mới `ledger.partner.view`** — chỉ dùng cho route sổ Đối tác. **Giữ** `ledger.view` cột PARTNER = `none` như ADR-0026 điều 10 đang ghi. Lý do không mở `ledger.view` PARTNER `own` như lời hẹn ở ADR-0026: ô `ledger.view` hôm nay có `own` ở `SALES`, `ADMIN`, `FIELD`, `INTERN` (`src/shared/permissions.ts:110`), nên route Đối tác hỏi `ledger.view` thì **HDV, Bán hàng… cũng qua** (trái tiêu chí 4); còn `GET /api/ledger/mine` (cổng `staff`, `can(staff, "ledger.view", { ownerId: staff.id })` — `src/modules/billing/index.ts:173`) sẽ bắt đầu trả DTO của nhân viên cho tài khoản chỉ-PARTNER nếu đổi ô — phải thêm luật tay ngược. Ô riêng thì không cần luật tay nào.
   - "Của mình" = các dòng sổ có **một bên là hồ sơ gắn với tài khoản** (`staff.partyId` — công ty lữ hành: hồ sơ công ty) **và bên kia là công ty chủ**, **chỉ** trên đơn mà hồ sơ đó là **bên đặt / người hưởng** (điều 3). Không có tham số chọn bên: máy chủ **bỏ qua** mọi `partyId` trình duyệt gửi (không phải 403 — không lộ việc hồ sơ khác tồn tại).
   - `GET /api/ledger/mine` và `GET /api/ledger`: **không đổi** (không thêm luật).
2. **Route riêng** (vd `GET /api/ledger/doi-tac`, module `billing`, cổng `orders` — ADR-0019; tên chốt ở kế hoạch), DTO **mới** `SoDoiTacResponse` dựng **từng trường** theo danh sách trắng (khuôn `ReceiptDto`, ADR-0026 điều 11). **Không** dùng lại `SoCongNoResponse` hay `SoCuaToiResponse` rồi "bỏ bớt".
   - **"Của mình" ở sổ ≠ "của mình" ở đơn:** sổ lọc theo **hồ sơ bên đặt** (điều 1); ô đơn (`order.view` own) lọc theo **người lập**. Đơn nhân viên lập cho đại lý A (bên đặt A) **hiện trong sổ của A**, nhưng A **không** mở được chi tiết đơn đó — có chủ ý: A cần biết khoản nợ, không cần thấy khách / dịch vụ nhân viên nhập. DTO chỉ mang `maDon` + số, không đường dẫn mở đơn khi A không phải người lập.
   - **Tài khoản lai** (Đối tác + quyền nội bộ — ADR-0027): giữ `ledger.view` của cột nội bộ ⇒ `/mine` trả DTO nhân viên **của cùng hồ sơ** (có thể gồm dòng hoa hồng của hồ sơ đó — không có a%/giá vốn trừ khi hồ sơ đó là nhà cung cấp, xem điều 3); thêm `/doi-tac` qua ô mới. Ghi để người kiểm xem; không thêm luật.
3. **Chỉ các loại dòng phía đối tác** — số dư của sổ Đối tác **không** lấy nguyên `v_bil_party_balance` (sẽ gộp mọi dòng của hồ sơ, kể cả **giá vốn** nếu hồ sơ đó cũng là nhà cung cấp — lộ giá vốn qua `tong`/`conLai`). Thay vào đó:
   - **Đơn được liệt kê:** đơn mà hồ sơ là **bên đặt** (người hưởng, hoặc bên đặt mang vai được hưởng khi đơn chưa giao). Đơn mà hồ sơ **chỉ** là nhà cung cấp **không** liệt kê.
   - **Dòng được tính** — lọc theo **loại dòng nợ** `bil_debt_line.kind_code`, **không** theo loại phiếu: trên các đơn đó, mọi dòng **giữa hồ sơ và công ty chủ** có `kind_code` ∈ {`HELD`, `HOA_HONG`, `GIAM_GIA_BEN_DAT`, `SETTLEMENT`, `REFUND`} (dòng đảo mang cùng loại với dòng gốc nên tự theo). **Không bao giờ** tính `kind_code = GIA_VON` — **kể cả** khi nó nằm trong phiếu **điều chỉnh** (vd Kế toán bổ sung giá vốn bằng phiếu `ADJUSTMENT`) hay phiếu đảo. Dòng `HELD` của lần thu vai `SUPPLIER` không thể nằm trên đơn hồ sơ là bên đặt (nhà cung cấp thu phải là nhà cung cấp của một dòng trên đơn ⇒ đơn đó đã bị giữ `RULE_CONFLICT`). Loại dòng mới thêm sau này **mặc định không tính** — phải thêm vào danh sách có duyệt (danh sách trắng).
   - Cùng một đơn mà hồ sơ vừa là bên đặt vừa là nhà cung cấp của một dòng thì đã bị **giữ** từ bản chụp (ADR-0077 điều 3, `RULE_CONFLICT`) — Kế toán xử lý trước khi đơn có dòng thương mại.
4. **Danh sách trắng** của `SoDoiTacResponse`:
   - `tong` = Σ `conLai` của các đơn được liệt kê (dương = mình còn phải trả; âm = công ty còn phải trả mình);
   - `thang[]`: `thang` (`YYYY-MM`), `daKhoa` (ADR-0080), `dauKy`, `phatSinh`, `cuoiKy` — chỉ trên các dòng được tính (điều 3);
   - `don[]`: `maDon`, `ngayDi`, `trangThai` (nhãn tiếng Việt), `giaBanLe` (Σ thành tiền dòng trước giảm), `hoaHong` (Σ `HOA_HONG` của mình; trước "Đã giao" ghi "chưa tính — đơn chưa giao"), `giamGiaMinhChiu`, `minhDaThu` (giữ hộ, mình là người thu `BOOKER`), `minhKhaiChoXacNhan` (khoản mình khai — "Công ty thu – CK" hay "khách đã trả bên kia" — Kế toán **chưa xác nhận**, vẫn là nợ của mình theo H3), `khachTraNoiKhac` (= tổng khách đã trả − `minhDaThu` − `minhKhaiChoXacNhan`, **một số gộp**, không tên / nơi thu), `daQuyetToan` (có dấu: dương = mình đã trả công ty, âm = công ty đã trả mình), `conLai`.
   - **`conLai` = tổng có dấu của các dòng được tính (điều 3) trên đơn đó** — tính bằng **một** hàm của `billing`, không cộng lại từ các cột diễn giải. Bài test kiểm `minhDaThu + minhKhaiChoXacNhan + giamGiaMinhChiu − hoaHong − daQuyetToan = conLai` trên mọi ca (bắt lệch giữa diễn giải và sổ).
   - **Không bao giờ:** a%, giá vốn, tên / hồ sơ nhà cung cấp, dòng nợ của bất kỳ bên nào khác (HDV, nhà cung cấp, đại lý khác), mã quy tắc mức, nguồn bản chụp, mức của đối tác khác, tên / SĐT người thu, hình thức thu, ghi chú nội bộ của phiếu, id nội bộ.
   - **Mức % / số mỗi khách của chính mình:** **câu C9** — mặc định **ẩn** (chỉ số tiền). Không gọi là giả định bề mặt: Q35 cho đối tác "thấy của mình" còn U4 cấm "tỷ lệ nội bộ"; và từ `giaBanLe` + `hoaHong` đối tác **tự tính ngược** được tỷ lệ, nên ẩn chỉ bớt hiển thị, không giữ bí mật. Cùng luật ở ADR-0077 điều 11.
5. **Đơn đã huỷ có cọc đại lý giữ** vẫn hiện (đại lý vẫn nợ số đang giữ cho tới khi Kế toán ghi hoàn / quyết toán — ADR-0026 điều 5).
6. **Không thông báo** khi sổ đổi ở lượt này.

### Bảng quyền (9 quyền app)

| Ô | SALES | ACC | ADMIN | FIELD | PARTNER | SUPER | INTERN | DRIVER | DRV_P | Route |
|---|---|---|---|---|---|---|---|---|---|---|
| `ledger.partner.view` (**mới**) | none | none | none | none | own | any | none | none | none | `GET /api/ledger/doi-tac` |
| `ledger.view` (có sẵn — **không đổi**) | own | any | own | own | none | any | own | none | none | `GET /api/ledger/mine`, `GET /api/ledger` — không đổi |

- Cột `SUPER_ADMIN` = `any` (không phải `none`): luật "Toàn quyền `any` ở **mọi** thao tác, không ngoại lệ" (ADR-0014 điều 2; chú thích đầu `MATRIX`, bài ghim). Toàn quyền gọi route này nhận sổ **của hồ sơ gắn tài khoản mình** (thường rỗng) — vẫn không chọn được bên (điều 1), nên `any` không mở thêm dữ liệu. Muốn Toàn quyền `none` thì phải sửa luật ADR-0014 điều 2 (không đề xuất).
- Kế toán xem sổ mọi bên qua `ledger.view any` sẵn có (`GET /api/ledger`, bảng kê tháng của ADR-0080).

### Hàng rào đề xuất (chỉ **đề xuất** dòng cho `docs/SO-HANG-RAO.md` — không sửa tệp đó)

| Hàng rào | Chặn cái gì | Cơ chế | Cách thấy chặn thật một lần |
|---|---|---|---|
| Bài **số lạ sổ đối tác** | a%, giá vốn, hoa hồng của đối tác khác, tiền HDV giữ lọt vào route Đối tác vào được | Gieo `480.017` (a% của một điều khoản), `470.019` (giá vốn **trên một đơn mà chính hồ sơ đối tác A là nhà cung cấp** — ca hồ sơ hai vai, điều 3; **và** một lần nữa là dòng `GIA_VON` trong **phiếu điều chỉnh** gắn với một đơn A là bên đặt — kiểm bộ lọc theo `kind_code`, không theo loại phiếu), `460.023` (hoa hồng của đối tác B), `450.029` (tiền HDV giữ **trên đơn của đối tác B** — không phải đơn của A, để không tự lẫn vào `khachTraNoiKhac` của A) → tài khoản **chỉ-PARTNER** của A gọi **mọi** route GET nó qua cổng được (sinh từ router) → quét JSON | Thêm tạm trường `giaVon` vào `SoDoiTacResponse` ⇒ đỏ; tính tạm `tong` từ `v_bil_party_balance` (gộp mọi dòng) ⇒ đỏ vì `470.019` lọt |
| Khoá **tên trường** `SoDoiTacResponse` | Thêm trường mới vào DTO không qua rà | Danh sách khoá trường (khuôn `bien-nhan.test.ts`) | Thêm tạm một trường ⇒ đỏ |
| **Không chọn được bên** | Đối tác A đọc sổ đối tác B bằng tham số | Gửi `?partyId=<B>` / thân có `partyId` ⇒ vẫn trả sổ A | Đột biến đọc tham số ⇒ đỏ |
| Ghim hàng `ledger.partner.view` + `ledger.view` cột PARTNER | Ai đó mở `ledger.partner.view` cho nhân viên, hoặc đổi `ledger.view` PARTNER khỏi `none` | `permissions.test.ts` khoá giá trị | Đổi tạm ô ⇒ đỏ |

---

## Ví dụ bằng số

**Ví dụ E-1 — đại lý A xem tháng 10 (số ở ADR-0079/D).** Trước quyết toán (31/10):

| Đơn | Giá bán lẻ | Hoa hồng của bạn | Giảm giá bạn chịu | Bạn đã thu | Khách trả nơi khác | Còn lại |
|---|---|---|---|---|---|---|
| TD-1001 | 5.000.000 | 500.000 | 250.000 | 3.000.000 | 1.750.000 | **Bạn trả 2.750.000** |
| TD-1002 | 1.000.000 | 120.000 | 0 | 0 | 1.000.000 | **Tour Đảo trả 120.000** |
| TD-1003 | 6.000.000 | 790.000 | 0 | 0 | 6.000.000 | **Tour Đảo trả 790.000** |
| **Tổng** | | | | | | **Bạn còn phải trả 1.840.000** |

Kiểm đẳng thức TD-1001: 3.000.000 + 0 + 250.000 − 500.000 − 0 = 2.750.000 ✓. Sau phiếu bù trừ 05/11: tháng 10 `cuoiKy` = 1.840.000; tháng 11 `dauKy` = 1.840.000, `phatSinh` = −1.840.000 ⇒ `tong` = 0. A **không** thấy: HDV Nam đang giữ 1.750.000 / 6.000.000, hay mức 12% / 15% / 10% (nếu C9 = ẩn).

**Ví dụ E-2 — lễ tân Hương, đơn có vé i-resort (ví dụ C-4).** Hương thấy: giá bán lẻ 1.600.000; hoa hồng của bạn 200.000; bạn đã thu 200.000; khách trả nơi khác 1.400.000; còn lại **0** (200.000 − 200.000). Hương **không** thấy: giá vốn 480.000, a = 80%, "i-resort giữ 400.000", "Tour Đảo nợ i-resort 80.000".

**Ví dụ E-3 — hồ sơ hai vai.** Khách sạn X vừa là **nhà cung cấp** vé spa (đơn TD-2001 do khách lẻ đặt: Tour Đảo nợ X giá vốn 470.019 — ca số lạ) vừa là **bên đặt** đơn TD-2002 (hoa hồng 100.000, X không thu tiền). Sổ Đối tác của X: chỉ liệt kê TD-2002, `tong` = **Tour Đảo trả 100.000**. Sổ Kế toán (`GET /api/ledger`) vẫn thấy X: Tour Đảo nợ 570.019 tổng hai phía.

---

## Sửa câu nào của quyết định đã duyệt

| Nguồn | Câu hiện hành | Sau ADR này |
|---|---|---|
| ADR-0026 điều 10, `ledger.view` | "`PARTNER` = `none` ở lượt 1 (… **mở `own` ở lượt 2**)" | `ledger.view` PARTNER **giữ** `none`; Đối tác xem sổ qua **ô mới** `ledger.partner.view` (lời hẹn được thực hiện bằng ô riêng — lý do ở điều 1) |
| ADR-0026 điều 7 | "Sổ của tôi" cho tài khoản **nội bộ** | thêm sổ cho Đối tác — **ô riêng, DTO riêng** (điều 1–4) |

## Phương án bị loại

- **Mở `ledger.view` PARTNER `own` rồi chặn tay ở `/mine`** (bản nháp đầu) — route Đối tác hỏi `ledger.view` thì HDV / Bán hàng cũng qua; luật tay ngược dễ quên ở route sau.
- **Dùng chung DTO "Sổ của tôi" của nhân viên** — lẫn hai đối tượng đọc ⇒ dễ lọt trường.
- **Số dư từ `v_bil_party_balance` nguyên khối** — lộ giá vốn của hồ sơ hai vai (điều 3).
- **Cho Đối tác xem bảng mức của mình** — ngoài U4; để sau.
- **403 khi gửi `partyId` của người khác** — lộ việc hồ sơ đó tồn tại.

## Hệ quả

- **Mã:** `billing` (route + DTO + hàm số dư phía đối tác + test); `src/shared/contracts.ts` (`SoDoiTacResponse`); `src/shared/permissions.ts` (1 ô mới — việc lớn: quyền; bài ghim 512 tập quyền thêm ô); `web/` màn "Sổ của tôi" cho Đối tác (chờ bản vẽ — N-4).
- **Việc lớn** (quyền + tiền): người kiểm độc lập chỉ-đọc; bốn hàng rào phải thấy chặn thật một lần trước khi ghi vào sổ hàng rào (P16).

## Tiêu chí nghiệm thu (đỏ trước, xanh sau)

1. E-1, E-2, E-3 thành test route; khớp từng đồng.
2. Bốn hàng rào — mỗi cái thấy đỏ một lần.
3. Tài khoản chỉ-PARTNER không gắn hồ sơ ⇒ sổ rỗng (không lỗi, không lộ); tài khoản chung công ty lữ hành ⇒ sổ của hồ sơ công ty.
4. `SALES`, `ACCOUNTING`, `ADMIN`, `FIELD`, `INTERN`, `DRIVER`, `DRIVER_PARTNER` gọi `GET /api/ledger/doi-tac` ⇒ 403.
5. Tài khoản chỉ-PARTNER gọi `GET /api/ledger/mine` ⇒ 403 **như hôm nay** (ô `ledger.view` không đổi) — bài ghim hành vi giữ nguyên.

## Điều chưa chắc

- Câu **C9** (hiện mức % của chính đối tác).
- Tên màn, vị trí trong menu Đối tác — chờ bản vẽ.
