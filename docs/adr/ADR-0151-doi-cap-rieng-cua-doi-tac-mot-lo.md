# ADR-0151 — «Đổi cấp riêng» của một đối tác: kết thúc cấp cũ và mở cấp mới trong một lô

- **Trạng thái:** **accepted** 2026-10-30 — chủ dự án duyệt trong phiên (AskUserQuestion), quyết định 11 của `docs/superpowers/specs/2026-10-30-hoa-hong-cap-dai-ly/BIEN-BAN-DUYET-2026-10-30.md`, sau khi QA1 lần 4 ĐẠT (`QA1-LAN-4.md`). Cùng biên bản, quyết định 12 chọn sửa câu ở route mới; **bản 3** (30/10) chép quyết định đó vào Đ3, ngoài ra không đổi nghĩa bản 2. AI soạn và chép, không tự duyệt (Hiến pháp N3).
  - Lịch sử: proposed 2026-10-30 — AI soạn theo quyết định 5 của chủ (`docs/superpowers/specs/2026-10-30-hoa-hong-cap-dai-ly/QUYET-DINH-CHU-2026-10-30-LAN-2.md`). **Bản 2** (30/10) sửa theo `QA1-LAN-2.md` (người kiểm độc lập đã đọc bản 1, KHÔNG ĐẠT ở phần đặc tả, bảy điểm Sửa trong đó bốn điểm thuộc ADR này) và quyết định 8–9 (`QUYET-DINH-CHU-2026-10-30-LAN-3.md`); bản 2 được QA1 lần 3, lần 4 đọc cùng đặc tả. Bản 3 chưa có người kiểm đọc lại.
- **Số:** 0151 kiểm còn trống ngày 30/10. Thư mục `docs/adr/` của `main` lớn nhất là 0150, và `docs/adr/README.md` ghi số kế tiếp 0151. Không nhánh nào (`refs/heads`, `refs/remotes`) và không worktree nào giữ ADR-0151 trở lên.
- **Ngày:** 2026-10-30.
- **Loại:** việc lớn (tiền: đổi cấp quyết định mức hoa hồng của đơn xác nhận từ ngày đổi). **Cửa:** hai chiều. Route mới chỉ ghép hai câu ghi đã có, không thêm bảng, cột, trigger hay quyền. Gỡ route thì dữ liệu đã ghi vẫn là các dòng bình thường.
- **Quan hệ với ADR cũ:** **giữ** ADR-0077 điều 8–9 (chụp mức lúc xác nhận, không chụp lại khi bảng mức đổi); ADR-0138 (cấp riêng của đối tác, bậc 10–12, tối đa một cấp riêng tại một ngày); ADR-0148 Đ1 («Sửa» là đường sửa sai, vẫn giữ nguyên). **Khuôn:** «Đổi chính sách» của một loại, `POST /api/pricing/muc-ta/gan/:id/doi` (đặc tả 25/10 mục A3).
- **Xây trên lỗ đang hở:** không (`docs/quyen-hoan.json` 30/10 không có mục nào chạm phần giá hay hoa hồng).
- **Phát hành:** cùng lượt với phần 2 của đặc tả `docs/superpowers/specs/2026-10-30-hoa-hong-cap-dai-ly/DAC-TA.md` (bản 5). Không có migration.

## Tóm tắt cho chủ (lời thường)

1. Hôm nay, muốn chuyển một đại lý từ cấp này sang cấp khác, Kế toán phải dùng nút «Sửa». Nút đó vốn để sửa chỗ nhập sai: nó bắt ghi lý do, và có lúc huỷ hẳn dòng cũ. Cách còn lại là bấm hai lần (ngừng cấp cũ, rồi đặt cấp mới), nhưng nếu lần thứ hai hỏng thì đại lý lặng lẽ quay về cấp của loại và tiền đổi mà không ai hay.
2. ADR này thêm một nút «Đổi cấp» làm trọn trong **một lần ghi**: cấp cũ dừng ở ngày hôm trước, cấp mới bắt đầu từ ngày Kế toán chọn. Nếu một nửa không ghi được thì cả hai nửa đều không ghi.
3. Đơn đã xác nhận **không đổi** hoa hồng. Chỉ đơn xác nhận từ ngày bắt đầu cấp mới mới tính theo cấp mới.
4. Người được bấm vẫn là Kế toán, Quản trị, Toàn quyền, tức là đúng những người đang đặt cấp riêng được. Không thêm quyền, không đổi cách tính tiền, không đổi cơ sở dữ liệu.
5. Nút «Đổi cấp» chỉ dùng cho cấp riêng **đang áp dụng và chưa có ngày ngừng**. Cấp riêng chưa tới ngày, hoặc đã hẹn ngày ngừng, vẫn dùng «Sửa» như hôm nay.

## Bối cảnh

- Cấp riêng của đối tác nằm ở bảng `prc_party_tier` (migration 0118, trigger thay ở 0126). Bảng này chỉ thêm dòng. Mỗi dòng chỉ được đóng, rút ngắn hoặc huỷ **một lần** (`prc_party_tier_close_only`). Hai dòng không được chồng ngày (`prc_party_tier_overlap`). Dòng mới phải trỏ hồ sơ đang mang loại được hưởng (`prc_party_tier_party_ok`) và một cấp đang bật (`prc_party_tier_tier_ok`).
- Hiện có ba route ghi trên bảng này (`src/modules/pricing/index.ts`): đặt `POST /api/pricing/ho-so/:id/muc-rieng`, ngừng `POST /api/pricing/muc-rieng/:id/ket-thuc`, sửa `GET`/`POST /api/pricing/muc-rieng/:id/sua`. Không có «Đổi», và BACKLOG §50 cũng ghi «Chưa có «Đổi» cho chính sách riêng của đối tác».
- Route «Sửa» (ADR-0148 Đ1) dùng luật `kiemSua` (`src/modules/pricing/rules.ts`). Luật này bắt lý do dài 10–300 ký tự. Khi chưa đơn nào chụp, nó đi đường huỷ–thay: dòng cũ bị đánh dấu huỷ (`prc_party_tier_voided`), ngày bắt đầu giữ như cũ. Đây là đường sửa sai, không phải đường chuyển cấp từ một ngày tới (QA1 lần 1, điểm chặn 2).
- Loại đối tác đã có «Đổi chính sách» chạy trong một lô: `cauDoiChinhSach` (`src/modules/pricing/repository.ts`) gồm câu đóng `role_tier_close` có khoá lạc quan, rồi câu chèn `role_tier_change_insert` mà ngày bắt đầu là `CASE WHEN changes() > 0 THEN ?4 END`. Câu đóng không đổi dòng nào thì ngày bắt đầu thành NULL, câu chèn lỗi NOT NULL, và cả lô huỷ. Hàng rào này đã có dòng ở `docs/SO-HANG-RAO.md` («Đổi chính sách: câu chèn gắn mới có điều kiện `changes() > 0`»).
- Chủ chốt ngày 30/10 (quyết định 5): làm đường «Đổi» chạy trọn một lô, không dùng «Sửa», không làm hai bước rời; soạn ADR, chủ duyệt rồi mới làm.

## Quyết định

### Đ1 — Route

`POST /api/pricing/muc-rieng/:id/doi`, cổng `office`. `:id` là mã một lần gắn cấp riêng (`prc_party_tier.id`, đúng mã mà `GanRiengDto.id`, `HoaHongHoSoResponse.mucRieng.id` và `HoaHongHoSoResponse.ganRieng[].id` đang trả). Thân `{ muc, tuNgay }`: `muc` là mã cấp mới, `tuNgay` là ngày cấp mới bắt đầu. Hồ sơ lấy từ dòng cũ, không nhận từ thân. Cấp mới mở **không thời hạn**, như «Đổi chính sách» của loại.

Trả **200** với `HoaHongHoSoResponse` của hồ sơ, cùng dạng với ba route anh em (đặt, ngừng, sửa). Vì thế `src/shared/contracts.ts` không đổi.

### Đ2 — Quyền

Dùng lại đúng cổng của ba route anh em: `can(staff, "partner.commission.write") && !holdsPartner(staff)`, ngược lại 403 `forbidden`. Tức là Kế toán, Quản trị, Toàn quyền được làm, còn tài khoản giữ quyền Đối tác thì không. **Không thêm quyền**, `src/shared/permissions.ts` không đổi.

### Đ3 — Kiểm, theo đúng thứ tự của route «Đổi chính sách» của loại

1. Cổng quyền (Đ2).
2. `:id` sai dạng (`PARTY_RE`) hoặc không có dòng ⇒ 404 `not_found`.
3. Thân qua `kiemThanDoiChinhSach` (thiếu hoặc sai mã cấp ⇒ 400).
4. Hỏi «đã chụp chưa» **một lần** qua `ctx.hoiDaChup(qGanRieng(row))`. Hàm tiêm vắng thì từ chối kín (503 `chua_kiem_chup`), không đoán «chưa chụp».
5. **Xét trước ở route** (quyết định 12, xem đoạn «Câu chữ» dưới), **rồi** `kiemDoi({ cu, tuNgay, homNay, ngayChup })` ⇒ 400 với câu của luật. Hệ quả:
   - dòng đã huỷ, dòng đã có ngày ngừng, dòng chưa tới ngày bắt đầu: **không đổi được** (những ca này dùng «Sửa»);
   - `tuNgay` không trước hôm nay, và phải sau ngày bắt đầu của dòng cũ (dòng cũ bắt đầu hôm nay thì sớm nhất từ ngày mai);
   - đã có đơn chụp theo cấp cũ tới ngày X thì `tuNgay` phải sau X.
6. Cấp mới trùng cấp cũ ⇒ 400.
7. Cấp mới không có ⇒ 404 (`MUC_KHONG_CO`).
8. Lô ghi (Đ4). Trigger của CSDL bắt nốt phần còn lại, **cả lô không ghi gì**:
   - hồ sơ đã thôi mang loại được hưởng ⇒ `prc_target_not_beneficiary` ⇒ 400;
   - cấp mới đang tắt ⇒ `prc_tier_inactive` ⇒ 409 `muc_tat`;
   - chồng ngày ⇒ `prc_party_tier_overlap` ⇒ 409;
   - dòng cũ vừa bị người khác ngừng, sửa hay đổi ⇒ câu đóng không đổi dòng nào ⇒ câu chèn lỗi NOT NULL ở `prc_party_tier.valid_from_date` ⇒ 409 `stale`. `loiBang` đã dịch đúng lỗi này, nên không thêm nhánh dịch lỗi nào.
9. Lưới dự phòng giữ như route của loại: câu đóng báo 0 dòng ⇒ 409 `stale`.

**Cấp đang khoá.** Trigger `prc_party_tier_tier_ok` chỉ chặn câu **chèn**, không chặn câu đóng. Vì vậy đổi **sang** một cấp đang khoá thì bị chặn (bước 8), nhưng đổi **ra khỏi** một cấp đang khoá thì làm được. Đây chính là đường đưa đại lý ra khỏi cấp đã khoá. «Sửa» một cấp riêng đang trỏ cấp khoá mà giữ nguyên cấp đó cũng bị chặn, vì câu chèn vẫn trỏ cấp khoá. Giới hạn này đã có sẵn ở route «Sửa» hiện hành, ADR này không đổi.

**Câu chữ: xét trước ở route** (quyết định 12, thay phần «lệch có tên» của quyết định 9, chỉ ở route này). `kiemDoi` **giữ nguyên từng chữ** (quyết định 9), và phần 2 không chạm `rules.ts` (phần 1 chỉ đổi các chuỗi «chính sách» của tệp này theo đặc tả §6, không đụng câu nào của `kiemDoi`). Hai câu của `kiemDoi` chỉ sai đường cho cấp riêng: `rules.ts:335` («… Thêm mức mới bắt đầu sau ngày ngừng.») và `rules.ts:338` («… Dùng Ngừng cho mức cũ, rồi Thêm mức mới.»). Cấp riêng không có việc «Thêm mức». Vì vậy route, ngay trước khi gọi `kiemDoi`, tự xét đúng hai điều kiện đó theo **đúng thứ tự xét của `kiemDoi`** và trả 400 `invalid_input` với câu riêng:

| Ca | Điều kiện (đọc trên dòng cũ `cu`, ngày mới `tuNgay`, `homNay`) | Câu trả về, nguyên văn |
|---|---|---|
| X1 | `!cu.daHuy` và `cu.validTo !== null` | «Cấp riêng này đã có ngày ngừng nên không đổi được. Muốn đổi cấp thì dùng Sửa.» |
| X2 | `!cu.daHuy`, `cu.validTo === null`, `cu.validFrom <= homNay`, `laNgay(tuNgay)`, `tuNgay >= homNay`, và `cu.validFrom >= tuNgay` | «Cấp riêng cũ bắt đầu từ ${ngayDayDu(cu.validFrom)} nên cấp mới phải bắt đầu sau ngày đó. Chọn ngày bắt đầu muộn hơn, hoặc dùng Sửa.» |

- Các điều kiện đứng trước của X2 chép đúng các nhánh mà `kiemDoi` xét trước câu `:338` (đã huỷ, đã có ngày ngừng, chưa tới ngày, ngày mới sai hoặc trước hôm nay). Nhờ vậy câu xét trước chỉ chặn đúng những ca mà `kiemDoi` sẽ chặn bằng hai câu kia, và không giành mất câu của nhánh khác (ví dụ dòng đã huỷ vẫn ra `CAU_DA_HUY`).
- **Thứ tự:** cổng quyền → tìm dòng → kiểm thân → hỏi «đã chụp chưa» → **X1, X2** → `kiemDoi` → các bước sau. Không ca nào X1, X2 bắt được mà `kiemDoi` cho qua.
- `ngayDayDu` lấy từ `src/shared/vn-date.ts` (cùng hàm `kiemDoi` dùng); `laNgay` đã được `index.ts` nhập từ `rules.ts`. Hàm xét trước nằm **trong** `src/modules/pricing/index.ts`, không xuất ra ngoài.
- **Cái giá:** hai điều kiện thành nguồn thứ hai (chép từ `kiemDoi`). Bài ghim ở tiêu chí 1 canh để hai bản không lệch nhau lặng lẽ.
- Các câu khác của `kiemDoi` («Mức này chưa tới ngày áp dụng…», «Ngày bắt đầu của mức mới…», «Đã có đơn dùng mức này…») vẫn tới người dùng nguyên văn, còn chữ «mức» cho cấp riêng. Đây vẫn là lệch có tên theo quyết định 9, nhưng không câu nào trong số đó chỉ sai đường.

### Đ4 — Lô ghi (một `db.batch`, thứ tự cố định)

1. `party_tier_close` (câu `GAN_RIENG_DONG` đã có), khoá lạc quan `valid_to_date IS NULL`: đặt ngày kết thúc dòng cũ = `tuNgay − 1`.
2. Câu mới `party_tier_change_insert` (đăng ký qua `defineSql`, khuôn `role_tier_change_insert`): chèn dòng mới cùng hồ sơ, cấp mới, `valid_from_date = CASE WHEN changes() > 0 THEN tuNgay END`, `valid_to_date = NULL`, không `replaces_id`, không lý do. Đây là một lần chuyển cấp chứ không phải một lần sửa.
3. Nhật ký `prc_party_tier_closed`, điều kiện `changes() > 0`.
4. Nhật ký `prc_party_tier_set`, điều kiện `changes() > 0`.

Hàm dựng lô đặt ở `repository.ts` (tên đề xuất `cauDoiCapRieng`), cạnh `cauDoiChinhSach`. Chỉ module `pricing` ghi bảng `prc_party_tier`, đúng luật kiến trúc.

### Đ5 — Đơn đã chụp mức (ADR-0077)

- **Bản chụp không đổi.** Route chỉ ghi `prc_party_tier` và nhật ký, không đọc hay ghi bảng nào của `orders`.
- Đơn xác nhận **trước** `tuNgay` đã chụp theo cấp cũ và giữ nguyên. Luật ở Đ3 bước 5 bảo đảm mọi ngày chụp đã có vẫn nằm trong khoảng ngày của dòng cũ sau khi đóng.
- Đơn xác nhận **từ** `tuNgay` chụp theo cấp mới (`docBangChoChup` đọc `partyTiersOf` theo ngày xác nhận).
- Đơn đã xác nhận mà đang thiếu mức **không** tự được thả khi đổi cấp. Vẫn phải «Ghi mức tay» (ADR-0077 điều 9).

### Đ6 — Nhật ký

Dùng lại hai mã đã có, `prc_party_tier_closed` và `prc_party_tier_set`, như «Đổi chính sách» của loại dùng lại `prc_role_tier_closed` và `prc_role_tier_set`. **Không thêm mã nhật ký**, nên `src/shared/audit-actions.ts` không cần dòng mới.

Phần chi tiết theo khuôn của route đặt và route ngừng: `mức riêng <tên cấp cũ> · đến <ngày>` và `mức riêng <tên cấp mới> · từ <ngày>`. Chỉ tên cấp và ngày, không tên hay liên hệ của đối tác. Chủ đã chốt giữ khuôn cũ này (quyết định 8; câu hỏi từng nằm ở đặc tả bản 2 §12 câu 2), vì nhật ký chỉ thêm, dòng cũ không sửa được.

### Đ7 — Migration

**Không cần.** Bảng, cột và trigger đã đủ: 0118 đặt luật chặn hồ sơ không được hưởng và cấp tắt, 0126 đặt luật chỉ đóng một lần và chặn chồng ngày. Câu SQL mới chỉ là một câu chèn đăng ký ở `sql-registry`. `docs/data-dictionary.json` không đổi.

### Đ8 — Gỡ lại (rollback)

- **Gỡ cả tính năng:** hoàn mã (bỏ route, bỏ câu `party_tier_change_insert`, ẩn nút «Đổi cấp» trên trang), rồi phát hành theo `docs/HANDOFF-N1.md`. Không có bước dữ liệu nào. Các dòng route đã ghi giống hệt cặp «Ngừng» rồi «Đặt cấp riêng» hôm nay, nên mã cũ đọc chúng bình thường.
- **Gỡ một lần đổi bấm nhầm:** dòng cũ đã đóng thì không mở lại được, vì trigger chỉ cho đóng một lần. Cách gỡ là bấm «Sửa» trên dòng mới, chọn lại cấp cũ, giữ ngày bắt đầu `tuNgay`, ghi lý do. Chưa đơn nào chụp theo dòng mới thì «Sửa» huỷ–thay, và kết quả tương đương như chưa đổi. Đã có đơn chụp thì phần sửa chỉ áp từ hôm nay, còn đơn đã chụp giữ mức đã chụp.
- **Giới hạn: cấp cũ đang khoá thì không gỡ ngay được** (QA1 lần 2 điểm 7d). «Sửa» chèn một dòng trỏ cấp cũ, mà `prc_party_tier_tier_ok` (0118) chặn mọi câu chèn trỏ cấp đang khoá, nên lệnh trả 409 `muc_tat`. Đổi **ra khỏi** cấp khoá làm được, nhưng đổi **về** cấp khoá thì không. Người dùng phải làm theo thứ tự: (1) «Mở lại cấp» cũ; (2) «Sửa» dòng mới về cấp cũ như trên; (3) nếu vẫn cần, «Khoá cấp» lại. Trong lúc cấp đang mở, cấp đó nhận được lần xếp và dòng mức mới, nên làm ba bước liền tay. Hộp «Đổi cấp» trên giao diện vì vậy phải nói trước giới hạn này khi cấp cũ đang khoá: «Cấp cũ «<tên>» đang khoá. Đổi xong thì không đổi ngược về cấp này được, trừ khi mở lại cấp.»

## Tiêu chí nghiệm thu (đỏ trước, xanh sau)

1. **Bài route** `src/modules/pricing/doi-cap-rieng.test.ts` (khuôn `doi-chinh-sach.test.ts`):
   - đổi từ hôm nay: dòng cũ ngừng hôm qua, dòng mới mở từ hôm nay; «Thử tra» cho hồ sơ ra bậc 10–12 của cấp mới;
   - cấp trùng ⇒ 400; cấp tắt ⇒ 409 đúng câu; cấp không có ⇒ 404; thân sai ⇒ 400;
   - câu X1, X2 nguyên văn; các câu còn lại của `kiemDoi` nguyên văn như hôm nay; không ghi gì;
   - **bài ghim hai phía** (quyết định 12): một bảng ca chung, gồm mọi tổ hợp quanh hai điều kiện: dòng đã huỷ có hoặc không ngày ngừng; có ngày ngừng; chưa tới ngày; `tuNgay` sai dạng, trước hôm nay, bằng hoặc trước ngày bắt đầu cũ; ca hợp lệ; ca có `ngayChup`. Ngày dựng theo hôm nay thật. Với mỗi ca, bài chạy **cả hai**: gọi thẳng `kiemDoi` (nhập từ `rules.ts`), và gọi route qua khung thử trên một dòng cấp riêng dựng đúng ngày đó. Bài đòi:
     - `kiemDoi` trả đúng câu `:335` ⇔ route trả X1;
     - `kiemDoi` trả câu khuôn `:338` ⇔ route trả X2;
     - mọi ca khác: route trả đúng câu của `kiemDoi`, hoặc thành công khi `kiemDoi` cho qua.

     Tức là mỗi khi `kiemDoi` từ chối bằng một trong hai lý do đó, bước xét trước đã bắt trước. Sửa cố ý một điều kiện của bước xét trước (ví dụ bỏ `cu.validFrom <= homNay`) phải làm bài đỏ, rồi hoàn nguyên (P16);
   - cấp cũ đang khoá: đổi sang cấp khác ⇒ 200; «Sửa» dòng mới về cấp cũ đang khoá ⇒ 409 `muc_tat` (giới hạn Đ8);
   - hồ sơ thôi mang loại được hưởng ⇒ 400, không ghi gì;
   - đã có đơn chụp tới X ⇒ `tuNgay ≤ X` bị chặn;
   - thiếu hàm tiêm «đã chụp chưa» ⇒ 503.
2. **Đua thật qua route:** hai lệnh đổi (hoặc đổi và ngừng) cùng lúc trên một dòng thì đúng một lệnh thắng, lệnh kia nhận 409 `stale`, và sau cùng hồ sơ có đúng một cấp riêng hiệu lực ở mỗi ngày. Sửa cố ý câu chèn (bỏ `CASE WHEN changes() > 0`) thì bài này phải đỏ, rồi hoàn nguyên (P16). Thêm một dòng ở `docs/SO-HANG-RAO.md`, khuôn dòng «Đổi chính sách», ghi ngày quan sát chặn thật.
3. **Quyền:** `src/so-dai-ly-quyen-route.test.ts` thêm ca 403 cổng cho Tài xế công ty, Tài xế đối tác, Nhân sự, Hướng dẫn viên (`FIELD`), Đối tác, tài khoản lai Kế toán + Đối tác (`["ACCOUNTING", "PARTNER"]`, bị chặn vì `holdsPartner`), và Bán hàng (không có `partner.commission.write`), không ghi gì; Kế toán thì đổi được. Khuôn: bài «tìm người hưởng (ADR-0141)» cùng tệp.
4. **Danh sách route:** `src/route-access.test.ts` thêm dòng `POST /api/pricing/muc-rieng/:id/doi` (office); số đếm route ghi ở `src/lan-gui-phu-route.test.ts` tăng 1, kèm chú thích lý do như các lần trước.
5. **Kiến trúc:** `src/architecture.test.ts` xanh. Câu mới chỉ ghi `prc_party_tier` và nằm trong module `pricing`.
6. `npm test`, `npm run typecheck` xanh; `git diff main -- migrations/ src/shared/permissions.ts src/shared/contracts.ts` rỗng.
7. Việc lớn (tiền), nên phải có người kiểm độc lập chỉ đọc trước khi báo đạt.
8. `git diff main --stat` của phần 2 chỉ gồm tệp trong mục «Tệp được chạm» dưới đây.

## Tệp được chạm (danh sách duy nhất cho phần 2; đặc tả trỏ về đây)

- **Máy chủ:** `src/modules/pricing/index.ts` (route mới, bước xét trước X1/X2 và hai câu của nó); `src/modules/pricing/repository.ts` (câu `party_tier_change_insert`, hàm `cauDoiCapRieng`). **Không** chạm `src/modules/pricing/rules.ts` (quyết định 9 và 12), `migrations/`, `src/shared/permissions.ts`, `src/shared/contracts.ts`, `src/shared/audit-actions.ts`.
- **Giao diện:** `web/hoa-hong*.ts` (nút «Đổi cấp» ở thẻ một đối tác, hộp đổi, câu cảnh báo cấp cũ đang khoá ở Đ8); `src/shared/hoa-hong-hien-thi.ts` (chữ của hộp và luật hiện nút, nếu cần) cùng `src/shared/hoa-hong-hien-thi.test.ts`. Không chạm `web/parties.ts` (Danh bạ không thêm nút ở lượt này).
- **Bài kiểm:** `src/modules/pricing/doi-cap-rieng.test.ts` (mới); `src/so-dai-ly-quyen-route.test.ts`; `src/route-access.test.ts`; `src/lan-gui-phu-route.test.ts`; kịch bản `docs/evidence/2026-10-26-hoa-hong-thiet-ke-lai/kich-ban/hoa-hong-smoke.mjs` (thêm bước «Đổi cấp»).
- **Tài liệu:** `docs/SO-HANG-RAO.md` (dòng hàng rào đua); `docs/SYSTEM-DESIGN.md` (bảng route pricing); `src/shared/huong-dan-ke-toan.ts` (một câu về «Đổi cấp», kèm `src/shared/huong-dan.test.ts` A2); `src/shared/changelog.ts` (mục phát hành). Dòng trạng thái của ADR này đã chuyển `accepted` ở bản 3.

## Trang ghép (`CLAUDE.md` §9: lượt duyệt này có hai quyết định, đặc tả và ADR-0151; chủ đã duyệt cả hai ngày 30/10, quyết định 10–11)

| Câu hỏi | Trả lời |
|---|---|
| Bảng `prc_party_tier` chứa loại thực thể nào? | Một loại: lần gắn một cấp đại lý cho **một hồ sơ đối tác**, có ngày bắt đầu và ngày kết thúc. Không thêm loại dữ liệu mới. |
| Dòng nào của bản đồ quyền chạm bảng này? | Ghi: `partner.commission.write` (Kế toán, Quản trị, Toàn quyền), trừ người giữ quyền Đối tác, cho cả bốn route đặt, ngừng, sửa, **đổi**. Đọc: `partner.commission.view` (Bán hàng, Kế toán, Quản trị, Toàn quyền) qua `GET /muc-ta` (`ganRieng`) và `GET /ho-so/:id/hoa-hong`. Chụp đơn đọc qua `docBangChoChup`, không theo quyền người bấm. |
| Cổng nào canh cửa nào? | Máy chủ: cổng ở đầu route (Đ2), trigger 0118 và 0126 (Đ3 bước 8). Giao diện: nút «Đổi cấp» ở thẻ một đối tác trên trang Hoa hồng chỉ hiện khi `coQuyenSua(nguoiDung)` và lần gắn đang áp dụng, chưa có ngày ngừng (`nutDoiNgung` trên `HoaHongHoSoResponse.ganRieng`). Ẩn nút không thay cổng: máy chủ luôn kiểm lại. Trang Danh bạ (`web/parties.ts`) **không** thêm nút ở lượt này. |
| Đặc tả bản 5 chạm quyền hay dữ liệu không? | Không. Phần 1 chỉ đổi giao diện và chữ trong câu báo lỗi, câu hướng dẫn (quyết định 6). Phần 2 chính là ADR này. |
