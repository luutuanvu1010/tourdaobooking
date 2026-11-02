# ADR-0155 — Vai bên ngoài trên hồ sơ chưa có tài khoản; cột «Cấp độ đại lý» ở Quản lý tài khoản

- **Trạng thái:** viết lại sau kiểm độc lập 2026-11-02. Chưa có mã. AI soạn và ghi lại, không tự duyệt.
  - **Đ2: accepted** 2026-11-02. Được hỏi «Cột cấp độ đại lý ở Quản lý tài khoản có duyệt làm ngay không?», chủ trả lời, nguyên văn: *«Ok duyệt, nhưng lưu ý cách dùng từ ngữ, phải phổ thông , đơn nghĩa»*. Vì lời này, chữ hiển thị ở Đ2.3, Đ2.4 đã đổi trước khi ghi duyệt, theo bảng từ `src/shared/bang-tu-giao-dien.ts`; đó là chữ mẫu, chủ xem bằng ảnh thật lúc thi công.
  - **Đ1: vẫn là đề xuất, hoãn.** Chủ 2026-11-02, nguyên văn: *«vá xong mới làm, nên tóm tắt trước để hiểu»*; trình lại sau khi đóng `TNV-G3`, `TNV-G4`, kèm C3, C4, C6.
- **Nguồn:** đặc tả `docs/superpowers/specs/2026-11-01-dat-ve-doi-tac-design.md` §5 QĐ-C, §8 (chủ duyệt thiết kế 2026-11-02, nguyên văn «Duyệt thiết kế»). Trang ghép: `docs/superpowers/specs/2026-11-02-trang-ghep-dat-ve-luot-2.md`. Dẫn chứng từng lỗi đã sửa: `docs/superpowers/specs/2026-11-02-ket-qua-kiem-adr-0154-0155.md`. Văn bản đề xuất kiểm một vòng nên bản này không kiểm vòng hai; thi công có người kiểm riêng.
- **Lệch chữ đặc tả, ADR này thắng:** bỏ điều kiện «vai còn bật, đọc qua view» của §5 C1 (tạo vòng phụ thuộc); route đọc không nhận `ids` và không ép một câu truy vấn (§5 C2).
- **Số:** 0155 kiểm còn trống 2026-11-02 trên `main` và mọi nhánh trong máy. Không cần migration (người kiểm thử không thêm bảng, trigger không chặn), kiểm lại lúc thi công.
- **Loại:** việc lớn (dữ liệu, quyền, **tiền**). Đ1 tạo người hưởng mới, hoa hồng và dòng sổ thật, không đổi công thức: người kiểm thử trên SQLite, công ty lữ hành không tài khoản xác nhận đơn ra hoa hồng 100.000đ, Đã giao sinh `HELD` 1.000.000đ và `HOA_HONG` 100.000đ. Đ2 ghi cấp qua route có sẵn, nên quyết hoa hồng các đơn xác nhận sau đó. **Cửa:** luật hai chiều; bản chụp hoa hồng và dòng sổ đã sinh ở lại. Không thêm cột, không thêm ô quyền.
- **Số quyết định chạm quyền/dữ liệu:** đếm theo điều, lượt trình có 5 điều, chủ chọn phương án «Cho vượt mức, trình cả hai» ở hộp hỏi 2026-11-02. Đã duyệt 4 điều (ADR-0154 Đ1, Đ2, Đ3; ADR-0155 Đ2), vượt trần 3 theo phương án đó; Đ1 của ADR này hoãn.
- **Xây trên lỗ đang hở:** Đ2 không: tài khoản đối tác đã có cấp, ghi qua route có sẵn, không thêm loại dữ liệu vào sổ. **Đ1 có: `TNV-G3`, `TNV-G4`.** Đ1 đưa thêm hồ sơ không đăng nhập vào sổ đại lý, đúng vùng hai lỗ này còn thiếu, và tin báo không tới được người không có tài khoản. Chủ chọn vá trước (câu C5).
- **Nới hàng rào, chủ quyết riêng (Điều 9.4):** Đ1 mở hàng rào 409 `role_via_account` ở `docs/SO-HANG-RAO.md` cho năm vai trên hồ sơ chưa có tài khoản, đồng thời đảo lựa chọn «để sau» ngày 2026-10-09 (`tests/e2e/README.md`): câu C6.
- **Hiến chương (6.1):** áp 2.3 (cấp gắn vào vai và hồ sơ, không gắn vào tài khoản), 5.3 (không thêm cạnh phụ thuộc), 5.4 (cột cấp gọi đúng một hàm), 5.7 (thiếu cấp thì giữ đơn). Không lệch điều nào.
- **Quan hệ với ADR cũ:** **bổ sung** ADR-0018 (vai bên ngoài nay có thể nằm trên hồ sơ chưa có tài khoản; vai vẫn không sinh quyền khi chưa có tài khoản). **Thay** N-3 của đề xuất ADR-0117 («gán vai EXTERNAL cũ cho tổ chức vẫn 409»). **Mở rộng** Ruling 7, 8, 9 của ADR-0117 sang năm vai. **Giữ** ADR-0117 đ3, đ4, ADR-0048 (`DRIVER_EXTERNAL`), ADR-0077 (đơn đã xác nhận không đổi hoa hồng), ADR-0138 (cấp riêng), ADR-0146 (luật bán), ADR-0151 (đổi cấp riêng một lô), luật R26. **Sửa chữ** ADR-0068 (câu gộp). ADR-0071 đ3b: câu C4.

## Bối cảnh

Chủ 2026-11-01: các vai bên ngoài (hướng dẫn viên, lễ tân, tài xế, lữ hành) «cần độc lập với tài khoản người dùng; độc lập với các cấp độ đại lý», và Quản lý tài khoản cần «có thêm cột để thể hiện và thiết lập nhanh cấp độ đại lý».

Việc tách vai với cấp đã có từ ADR-0117: vai có cấp mặc định, từng người có cấp riêng. Chưa độc lập ở hai chỗ. Một, route gắn vai ở Danh bạ trả 409 `role_via_account` với mọi vai nhóm bên ngoài, nên một công ty lữ hành chưa có tài khoản không mang vai được và không có cấp theo vai. Hai, muốn xem hay đổi cấp một đối tác phải sang trang Hoa hồng.

## Quyết định

**Đ1. Hồ sơ chưa có tài khoản mang được vai bên ngoài.**

1. **Mở vai nào, cho hồ sơ nào.** Route gắn và gỡ vai ở Danh bạ cho phép các vai trong `ROLES` thuộc nhóm bên ngoài và có quyền mặc định `PARTNER` (đúng năm vai; `DRIVER_EXTERNAL` tự loại theo ADR-0048; «tài xế» trong lời chủ hiểu là `TAXI_DRIVER`), khi hồ sơ **chưa có tài khoản** và không phải nội bộ (ADR-0117 đ4). Gồm cả hồ sơ tổ chức. Còn lại vẫn 409 `role_via_account`. Gỡ vai không hỏi lại điều kiện vai.
2. **Chưa có tài khoản** nghĩa là không có dòng `staff` trỏ hồ sơ, kể cả tài khoản đã ngưng.
3. **Chốt để không kẹt dữ liệu.** Vai loại này không gắn nơi (Ruling R1), hiệu lực từ hôm nay hoặc ngày đã qua, không đặt trước ngày kết thúc; gỡ chỉ với hôm nay hoặc ngày đã qua. Thiếu các chốt này thì vai gắn nơi kẹt lại vì chỉ SQL tay gỡ được, còn ngày tương lai làm hồ sơ hưởng ngay hoặc mất hưởng ngay.
4. **Không sinh quyền.** Vai không tạo đăng nhập. Hồ sơ đã có tài khoản vẫn đổi vai ở Quản lý tài khoản. Hồ sơ cá nhân: lúc tạo tài khoản, luật R26 bắt chọn vai đó nên quyền sinh đúng lúc ấy. Hồ sơ tổ chức chưa tạo được tài khoản (ADR-0018 đ9 chưa thi hành): văn phòng lập đơn hộ tới khi có ADR riêng.
5. **Ai làm:** như ADR-0117 đ3 (Quản trị, Toàn quyền ở Danh bạ). Không thêm ô quyền.
6. **Gộp hồ sơ:** `nhanDoiTac` của gộp và `R-PRC-6` tính cả năm vai, để nhân viên cũ không lọt vào hồ sơ đối tác qua đường gộp. Câu `merge_source_account_role` phải nói đúng màn với hồ sơ không tài khoản.
7. `R-LC-1` và `R-PRC-*` phải vẫn xanh trên dữ liệu thử có hồ sơ loại này. Có ca e2e: công ty lữ hành không tài khoản, gắn vai, gắn cấp, văn phòng chọn «Qua đối tác», xác nhận đơn, hoa hồng đúng cấp.

**Đ2. Cột «Cấp độ đại lý» ở Quản lý tài khoản.**

1. Chỉ dòng tài khoản giữ quyền Đối tác có giá trị, cả ở bảng lẫn thẻ điện thoại. Công ty lữ hành không tài khoản vẫn đặt cấp ở trang Hoa hồng.
2. **Thấy cột** khi có `partner.commission.view` và không giữ quyền Đối tác (`holdsPartner`): Hành chính nhân sự không có `view` nên không thấy và không gọi route. **Sửa** khi có `partner.commission.write`: trên trang này là Quản trị, Toàn quyền.
3. **Chữ trong ô:** «<tên cấp> (theo vai trò)», «<tên cấp> (cấp riêng)», «Chưa có cấp», «Hai vai trò khác cấp» (hai vai trò ra hai cấp, ADR-0117 đ2; mã `xungDot` chỉ là dấu hiệu, nên chữ chỉ nói sự thật đó), «Chưa có vai trò» (không mở bảng, vì đặt cấp sẽ bị 400). Nhãn «có mức riêng» hiện khi `dongRiengDoiTac > 0`, hoặc đang theo vai trò mà `dongRiengLoai > 0`, và trỏ sang trang Hoa hồng, vì cột nói cấp đang áp dụng chứ không nói số tiền.
4. **Bấm mở bảng:** chọn cấp, từ ngày, hoặc «Dùng cấp theo vai trò». Ngày mặc định là ngày sớm nhất theo `nutDoiNgung` và `kiemDoi`, không phải luôn là hôm nay. «Dùng cấp theo vai trò» có hiệu lực từ ngày mai. Cấp không đổi được thì ô trỏ sang trang Hoa hồng.
5. **Ghi:** dùng đúng ba route sẵn có (đặt, đổi, ngừng cấp riêng). **Đọc:** một route mới chỉ đọc `GET /api/pricing/cap-hien-hanh`, cổng `office`, hỏi `partner.commission.view`, chặn `holdsPartner`. Không nhận `ids`: trả mọi hồ sơ đang mang vai được hưởng. Số câu cố định, không lặp theo hồ sơ. Gọi đúng `tomTatHoaHongHoSo`, không viết luật thứ hai trong SQL. Có bài đối chiếu với `GET /api/pricing/ho-so/:id/hoa-hong`.

## Câu chủ đã trả lời

**C5. Làm Đ1 ngay trên hai lỗ sổ tiền đang mở, hay vá trước?** Chủ 2026-11-02, nguyên văn: «vá xong mới làm, nên tóm tắt trước để hiểu». Với đặt cọc, chủ cũng đã chọn phương án «Vá các lỗi sổ tiền trước». Công ty lữ hành chưa có tài khoản chờ tới khi vá; hạn hai lỗ là 2026-11-30.

Phần còn lại của hai lỗ (đọc mã và ADR 2026-11-02, theo từ khoá, chưa chạy thử; `docs/quyen-hoan.json` còn ghi «chờ chủ» là cũ):

- `TNV-G3` đ9 phân định trách nhiệm: chủ đã duyệt (ADR-0116, 2026-10-13), chưa thi công; hoàn sau Đã giao còn bị chặn hẳn. Tin báo người thu cũ và mới: chưa có mã.
- `TNV-G4` Đ6a cảnh báo lần thu tiền mặt giống nhau: chủ đã chọn 2026-10-02, chưa thấy trong mã. Đ5d tin báo người bị đổi số dư: đã có mã từ ADR-0115 (`ledger_adjustment_affected`), chỉ tới người có tài khoản.

## Câu chờ chủ quyết, trình lại cùng Đ1

**C3. Đối tác thôi vai mà còn đơn nháp đứng tên hoặc còn cấp riêng?** Hôm nay đơn nháp của cá nhân thành không hoa hồng mà không ai được báo; đơn của công ty phải đổi sang Khách lẻ mới lưu được.
- **Khuyến nghị:** chặn gỡ và nêu mã đơn, tới khi xử lý xong nháp và cấp riêng; đơn đã xác nhận không tính.
- Cách khác: cho gỡ như loại tự thêm hôm nay, chấp nhận mất hoa hồng lặng lẽ.

**C4. Hành chính nhân sự có được thấy tên và vai của đối tác chưa có tài khoản khi tra số để tạo tài khoản?**
- **Khuyến nghị:** cho thấy, theo đúng luật ADR-0071 đ3b có sẵn (hồ sơ đang mở vai tài khoản), vì không thấy thì dễ tạo trùng hồ sơ và mất cấp đã đặt. Đổi lại họ dò được SĐT ra tên đối tác.
- Cách khác: chặn riêng hồ sơ loại này, phải thêm mã và chấp nhận rủi ro tạo trùng.

**C6. Cho nới hàng rào `role_via_account`?**
- **Khuyến nghị:** cho mở đúng năm vai trên hồ sơ chưa có tài khoản. Người thi công viết lại dòng sổ, quan sát chặn lại với mọi ca còn lại (P16), và đảo có chủ đích các bài đang ghim 409.
- Cách khác: giữ hàng rào, bảo chủ dùng loại tự thêm trùng tên; không sinh được quyền Đối tác khi sau này tạo tài khoản.

## Hệ quả

- Danh sách «Đặt qua đối tác» có thêm hồ sơ không tài khoản, đúng ý. Trang Danh bạ hiện vai bên ngoài trong ô gắn vai khi hồ sơ chưa có tài khoản.
- Gắn vai trước khi có cấp thì đơn bị giữ ở Đã giao tới khi Kế toán xử lý.
- Luật bán (ADR-0146) chặn cả đơn văn phòng lập cho các hồ sơ này.
- Không tạo sẵn bảy cấp: mức hoa hồng từng cấp do công ty đặt ở trang Hoa hồng.
- Lọc theo vai ở Quản lý tài khoản (lượt 1) vẫn chỉ thấy tài khoản, không thấy hồ sơ chưa có tài khoản.
- **Ghi cho lượt 3:** tiền hồ sơ không tài khoản giữ đi đường `ben_dat`, văn phòng ghi là lời khai chờ Kế toán, Kế toán ghi là `HELD` ngay. Câu «kết quả giống nhau dù ai bấm» của QĐ-A chỉ đúng với đối tác có tài khoản.

## Để lại cho người thi công

Bài phải đảo có chủ đích: `src/modules/pricing/loai-doi-tac.test.ts`, `tests/e2e/parties.mjs`, `tests/e2e/so-dai-ly.mjs`. Danh bạ đổi theo `accountLinked` ở `web/parties.ts`, `src/shared/contracts.ts`; sửa chú thích `src/shared/booker.ts`. Gỡ rồi gắn lại trong ngày hiện trả 409 `role_overlap`; tạo tài khoản cùng vai sau khi gỡ trong ngày nhận câu sai «vừa được người khác sửa». Ca đua: tài khoản `DRIVER_EXTERNAL` đang tạo mà Danh bạ thêm vai ngoài, đọc mã, chưa chạy, ghi chấp nhận. Đừng nhét mã cột vào tệp chung mà trang Đơn hàng nhập (trần gói). Chưa kiểm production: có hồ sơ mang vai cũ `STAFF` hay loại tự thêm trùng tên không, đã đủ bảy cấp chưa.

## Tiêu chí nghiệm thu

Đặc tả §8 mục QĐ-C (a) tới (g) và phần Chung, đọc theo các lệch ở đầu trang, cộng:

- (h) Gắn vai có nơi, ngày tương lai, hoặc đặt trước ngày kết thúc: 400; gỡ với ngày tương lai: 400. `DRIVER_EXTERNAL` trên hồ sơ không tài khoản: 409.
- (i) Hồ sơ có tài khoản đã ngưng: 409.
- (j) Gộp hồ sơ mang vai cũ `STAFF` vào hồ sơ mang vai ngoài: bị chặn; `R-PRC-6` thấy được ca này.
- (k) Ô cấp đủ năm trạng thái; bảng bấm không rơi vào 400 ở ngày mặc định; «Dùng cấp theo vai trò» ghi đúng từ ngày mai. Chữ hiển thị qua được bài bảng từ.
- (l) Câu C3, C4, C5, C6 thi hành theo lời chủ duyệt.

Thi công xong phải có người kiểm độc lập.
