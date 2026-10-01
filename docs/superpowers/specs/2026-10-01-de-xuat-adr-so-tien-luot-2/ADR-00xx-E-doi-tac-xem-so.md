# ADR-00xx-E — Sổ tiền lượt 2: Đối tác xem sổ của chính mình (số dư + từng đơn), danh sách trắng, không thấy giá vốn / tỷ lệ nội bộ / nợ của người khác

- **Trạng thái:** **proposed** — bản nháp của người soạn (AI), 2026-10-01. **Chưa qua người kiểm độc lập.** AI không tự duyệt.
- **Số hiệu:** giữ chỗ `ADR-00xx-E` (số thật chốt lúc gộp).
- **Ngày:** 2026-10-01.
- **Thuộc gói:** lượt duyệt **2c** (cùng ADR-00xx-C; ADR này = **1** quyết định chạm quyền — ô `ledger.view` cột `PARTNER`). Phát hành chung một bản với A, B, C, D.
- **Phụ thuộc:** ADR-00xx-C (dòng thương mại có trên sổ), ADR-00xx-D (bảng kê tháng, cờ tháng đã khoá).
- **Mốc đo mã:** `8f647226`; `main` @`0c4309cd`.
- **Nguồn — lời chủ đã chốt:** **U4 (1/10):** "Có, chỉ xem của mình: **số dư và từng đơn**; **không thấy giá vốn, tỷ lệ nội bộ**". ADR-0018 Q35: "đối tác thấy [chiết khấu] của mình; khách không bao giờ". ADR-0026 điều 10: `ledger.view` PARTNER = `none` ở lượt 1, "**mở `own` ở lượt 2**". ADR-0018 điều 9 / Q4: công ty lữ hành dùng **một tài khoản chung** gắn hồ sơ công ty.
- **ADR liên quan:** ADR-0026 (điều 7 "Sổ của tôi", điều 10, điều 11 danh sách trắng), ADR-0019 (cổng `orders` cho Đối tác), ADR-0014 (tài khoản Đối tác), ADR-0024 (`OrderDetailDto` không bao giờ mang giá vốn / chiết khấu).
- **Hiến chương áp dụng:** 4.4 (chứng từ / hình chiếu danh sách trắng), K4 / 5.8 (quyền qua `can()`), 5.4, 5.12.
- **Xây trên lỗ đang hở:** **không** (`phat_hien = []`, `main` @`0c4309cd`).
- **Loại quyết định:** **hai chiều** cho ô quyền; **một chiều về thông tin** — số đối tác đã xem thì không thu lại được (như ADR-0018 nói về SĐT HDV).

---

## Tóm tắt cho chủ (lời thường)

1. Đại lý mở app thấy mục **"Sổ của tôi"**: tổng **còn phải trả Tour Đảo** (hoặc **Tour Đảo còn phải trả mình**), chia theo tháng, và danh sách **từng đơn**.
2. Mỗi đơn hiện: giá bán lẻ, **hoa hồng của mình**, giảm giá mình đã cho khách, tiền mình đã thu của khách, tiền khách đã trả nơi khác (Tour Đảo / tại quầy), đã quyết toán, còn lại.
3. **Không bao giờ** hiện: giá vốn, % mua của nhà cung cấp, hoa hồng hay nợ của đại lý khác, tiền HDV đang giữ, tên người thu, mức hoa hồng dạng % (chỉ hiện số tiền — giả định, đổi được).
4. Công ty lữ hành dùng tài khoản chung ⇒ mọi người dùng tài khoản đó thấy sổ của **công ty** đó.

---

## Quyết định

1. **Ô `ledger.view` cột `PARTNER`: `none` → `own`** (ADR-0026 điều 10 đã hẹn). "Của mình" = các dòng sổ có **một bên là hồ sơ gắn với tài khoản** (`staff.partyId` — với công ty lữ hành là hồ sơ công ty) **và bên kia là công ty chủ**. Không có tham số chọn bên: máy chủ **bỏ qua** mọi `partyId` trình duyệt gửi lên (không phải 403 — không lộ việc hồ sơ khác có tồn tại).
2. **Route riêng cho Đối tác** (vd `GET /api/ledger/doi-tac`, module `billing`, cổng `orders` — ADR-0019; tên chốt ở kế hoạch), DTO **mới** `SoDoiTacResponse` dựng **từng trường** theo danh sách trắng (khuôn `ReceiptDto`, ADR-0026 điều 11). **Không** dùng lại `SoCongNoResponse` (của Kế toán) hay `SoCuaToiResponse` (của nhân viên) rồi "bỏ bớt".
   - **Route hiện có hỏi `ledger.view`** (đo 1/10, `src/modules/billing/index.ts`): `GET /api/ledger/mine` (`:173`, cổng `staff`, `can(staff, "ledger.view", { ownerId: staff.id })`, trả `SoCuaToiResponse`) và `GET /api/ledger` (`:180`, cổng `office`, `can(staff, "ledger.view")` không ngữ cảnh ⇒ chỉ `any`).
     - `GET /api/ledger` — PARTNER `own` **không qua** (cần `any`): không đổi.
     - `GET /api/ledger/mine` — đổi ô làm tài khoản **chỉ-PARTNER** bắt đầu **qua** được. **Quyết định:** route này **từ chối 403** khi `ledger.view` của người gọi chỉ đến từ cột `PARTNER` (không có cột nội bộ nào cho `own`/`any`) — câu "Sổ của Đối tác ở mục Sổ đối tác"; test ghim. Tài khoản lai (Đối tác + quyền nội bộ — ADR-0027) vẫn dùng `/mine` như nhân viên và gọi thêm được `/doi-tac`; mỗi route chỉ trả DTO của nó.
     - Kế hoạch phải liệt kê lại **mọi** chỗ gọi `can(…"ledger.view"…)` lúc thi công (danh sách trên là lúc đo) và ghi DTO / cách từ chối cho PARTNER.
   - **"Của mình" ở sổ ≠ "của mình" ở đơn:** sổ lọc theo **hồ sơ bên đặt / người thu** (điều 1); ô đơn (`order.view` own) lọc theo **người lập**. Đơn nhân viên lập cho đại lý A (bên đặt A) **hiện trong sổ của A**, nhưng A **không** mở được chi tiết đơn đó — có chủ ý: A cần biết khoản nợ, không cần thấy khách / dịch vụ mà nhân viên nhập. DTO sổ chỉ mang `maDon` + số (điều 3), không đường dẫn mở đơn khi A không phải người lập.
3. **Danh sách trắng** của `SoDoiTacResponse`:
   - `tong`: số dư hiện tại với công ty (dương = mình còn phải trả; âm = công ty còn phải trả mình);
   - `thang[]`: `thang` (`YYYY-MM`), `daKhoa` (ADR-00xx-D), `dauKy`, `phatSinh`, `cuoiKy`;
   - `don[]`: `maDon`, `ngayDi`, `trangThai` (nhãn tiếng Việt), `giaBanLe` (Σ thành tiền dòng trước giảm), `hoaHong` (của mình — tổng các dòng `HOA_HONG`; trước "Đã giao" ghi "chưa tính — đơn chưa giao"), `giamGiaMinhChiu`, `minhDaThu` (dòng giữ hộ mà mình là **người thu**), `minhKhaiChoXacNhan` (khoản mình khai "Công ty thu – CK" mà Kế toán **chưa xác nhận** — vẫn là nợ của mình theo H3), `khachTraNoiKhac` (= tổng khách đã trả − `minhDaThu` − `minhKhaiChoXacNhan`, **một số gộp**, không tên người thu / nơi thu), `daQuyetToan` (có dấu: dương = mình đã trả công ty, âm = công ty đã trả mình), `conLai` (dương = mình còn phải trả, âm = công ty còn phải trả mình).
   - **`conLai` lấy từ số dư sổ** (`v_bil_party_balance` của cặp mình – công ty trên đơn), **không** cộng trừ lại từ các cột trên (một nguồn — 5.4). Các cột kia là diễn giải; bài test kiểm `minhDaThu + minhKhaiChoXacNhan + giamGiaMinhChiu − hoaHong − daQuyetToan = conLai` trên mọi ca (bắt lệch giữa diễn giải và sổ).
   - **Không bao giờ:** a%, giá vốn, tên / hồ sơ nhà cung cấp, dòng nợ của bất kỳ bên nào khác (HDV, nhà cung cấp, đại lý khác), mã quy tắc mức (`commission_rule_id`), nguồn bản chụp, mức của đối tác khác, tên / SĐT người thu, hình thức thu, ghi chú nội bộ của phiếu, id nội bộ.
   - **Mức hoa hồng dạng % / số mỗi khách của chính mình:** **không** hiện ở lượt này (chỉ số tiền) — giả định bề mặt của AI, vì U4 nói "không thấy tỷ lệ nội bộ" mà chưa nói rõ tỷ lệ của chính họ có tính là "nội bộ" không; Q35 cho phép hiện. Đổi một trường là hai chiều.
4. **Đơn đã huỷ có cọc đại lý giữ** vẫn hiện (đại lý vẫn nợ số đang giữ cho tới khi Kế toán ghi hoàn / quyết toán — ADR-0026 điều 5).
5. **Không thông báo** khi sổ đổi (không Bảng tin, không màn hình khoá) ở lượt này.

### Bảng quyền (9 quyền app)

| Ô | SALES | ACC | ADMIN | FIELD | PARTNER | SUPER | INTERN | DRIVER | DRV_P | Route |
|---|---|---|---|---|---|---|---|---|---|---|
| `ledger.view` | own | any | own | own | **none → own** | any | own | none | none | `GET /api/ledger/doi-tac` (mới); `GET /api/ledger/mine` thêm luật từ chối tài khoản chỉ-PARTNER (điều 2); `GET /api/ledger` không đổi |

Không ô nào khác đổi.

### Hàng rào đề xuất (chỉ **đề xuất** dòng cho `docs/SO-HANG-RAO.md` — không sửa tệp đó ở bản nháp này)

| Hàng rào | Chặn cái gì | Cơ chế | Cách thấy chặn thật một lần |
|---|---|---|---|
| Bài **số lạ sổ đối tác** | a%, giá vốn, hoa hồng của đối tác khác, tiền HDV giữ lọt vào bất kỳ route nào Đối tác vào được | Gieo `480.017` (a%), `470.019` (giá vốn), `460.023` (hoa hồng đối tác B), `450.029` (HDV giữ) → tài khoản **chỉ-PARTNER** của đối tác A gọi **mọi** route GET nó qua cổng được (sinh từ router) → quét JSON | Thêm tạm trường `giaVon` vào `SoDoiTacResponse` ⇒ đỏ ⇒ hoàn nguyên |
| Khoá **tên trường** `SoDoiTacResponse` | Thêm trường mới vào DTO mà không qua rà | Danh sách khoá trường trong test (khuôn `bien-nhan.test.ts`) | Thêm tạm một trường ⇒ đỏ |
| **Không chọn được bên** | Đối tác A đọc sổ đối tác B bằng tham số | Test gửi `?partyId=<B>` / thân có `partyId` ⇒ vẫn trả sổ A | Đột biến đọc tham số ⇒ đỏ |
| Ghim hàng `PARTNER` của `ledger.view` | Ai đó đổi `own` → `any` | `permissions.test.ts` khoá giá trị | Đổi tạm ô ⇒ đỏ |

---

## Ví dụ bằng số

**Ví dụ E-1 — đại lý A xem tháng 10 (số ở ADR-00xx-C/D).** Trước quyết toán (31/10):

| Đơn | Giá bán lẻ | Hoa hồng của bạn | Giảm giá bạn chịu | Bạn đã thu | Khách trả nơi khác | Còn lại |
|---|---|---|---|---|---|---|
| TD-1001 | 5.000.000 | 500.000 | 250.000 | 3.000.000 | 1.750.000 | **Bạn trả 2.750.000** |
| TD-1002 | 1.000.000 | 120.000 | 0 | 0 | 1.000.000 | **Tour Đảo trả 120.000** |
| TD-1003 | 6.000.000 | 790.000 | 0 | 0 | 6.000.000 | **Tour Đảo trả 790.000** |
| **Tổng** | | | | | | **Bạn còn phải trả 1.840.000** |

Sau phiếu bù trừ 05/11: tháng 10 `cuoiKy` = 1.840.000; tháng 11 `phatSinh` = −1.840.000 ⇒ `tong` = 0. A **không** thấy: HDV Nam đang giữ 1.750.000 / 6.000.000, hay mức 12% / 15% / 10%.

**Ví dụ E-2 — lễ tân Hương, đơn có vé i-resort (ví dụ C-4).** Hương thấy: giá bán lẻ 1.600.000; hoa hồng của bạn 200.000; bạn đã thu 200.000; khách trả nơi khác 1.400.000; còn lại **0**. Hương **không** thấy: giá vốn 480.000, a = 80%, "i-resort giữ 400.000", "Tour Đảo nợ i-resort 80.000".

---

## Sửa câu nào của quyết định đã duyệt

| Nguồn | Câu hiện hành | Sau ADR này |
|---|---|---|
| ADR-0026 điều 10, `ledger.view` | "`PARTNER` = `none` ở lượt 1 (… mở `own` ở lượt 2)" | `PARTNER` = `own` (lời hẹn được thực hiện) |
| ADR-0026 điều 7 | "Sổ của tôi" cho tài khoản **nội bộ** | thêm "Sổ của tôi" cho Đối tác — **DTO riêng** (điều 2–3) |

## Phương án bị loại

- **Dùng chung DTO "Sổ của tôi" của nhân viên** — DTO đó mang dòng giữ hộ dạng nhân viên; lẫn hai đối tượng đọc khác nhau ⇒ dễ lọt trường.
- **Cho Đối tác xem bảng mức của mình** (route `pricing`) — ngoài U4 (số dư + từng đơn); để sau nếu chủ muốn.
- **403 khi gửi `partyId` của người khác** — lộ việc hồ sơ đó tồn tại.

## Hệ quả

- **Mã:** `billing` (route + DTO + test); `src/shared/contracts.ts` (`SoDoiTacResponse`); `src/shared/permissions.ts` (1 ô — việc lớn: quyền); `web/` màn "Sổ của tôi" cho Đối tác (chờ bản vẽ của chủ — N-4).
- **Việc lớn** (quyền + tiền): người kiểm độc lập chỉ-đọc; bốn hàng rào trên phải thấy chặn thật một lần trước khi ghi vào sổ hàng rào (P16).

## Tiêu chí nghiệm thu (đỏ trước, xanh sau)

1. E-1, E-2 thành test route; khớp từng đồng.
2. Bốn hàng rào ở bảng trên — mỗi cái thấy đỏ một lần.
3. Tài khoản chỉ-PARTNER không gắn hồ sơ ⇒ trả sổ rỗng (không lỗi, không lộ); tài khoản chung công ty lữ hành ⇒ sổ của hồ sơ công ty.
4. `DRIVER`, `DRIVER_PARTNER`, `FIELD` gọi `GET /api/ledger/doi-tac` ⇒ 403.
5. Bài ghim 512 tập quyền cho `ledger.view` cập nhật có chủ đích (đỏ → xanh).

## Điều chưa chắc

- Hiện mức % / số mỗi khách của chính đối tác hay không (điều 3) — giả định bề mặt "không".
- Cách đặt tên màn và vị trí trong menu Đối tác — chờ bản vẽ.
