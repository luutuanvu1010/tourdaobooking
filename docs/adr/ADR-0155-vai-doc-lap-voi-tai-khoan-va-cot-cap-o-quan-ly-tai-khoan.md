# ADR-0155 — Vai bên ngoài trên hồ sơ chưa có tài khoản; cột «Cấp độ đại lý» ở Quản lý tài khoản

- **Trạng thái:** Đề xuất (2026-11-02), chờ chủ dự án duyệt. Chưa có mã. **Người kiểm độc lập 2026-11-02: chưa nên duyệt bản này** (mục «Sai đã biết» dưới đây; đầy đủ ở `docs/superpowers/specs/2026-11-02-ket-qua-kiem-adr-0154-0155.md`). Chữ các điều viết lại sau khi chủ chọn cách chia lượt.
- **Nguồn:** đặc tả `docs/superpowers/specs/2026-11-01-dat-ve-doi-tac-design.md` §5 QĐ-C, §8 (chủ duyệt thiết kế 2026-11-02, nguyên văn «Duyệt thiết kế»). Trang ghép lượt duyệt: `docs/superpowers/specs/2026-11-02-trang-ghep-dat-ve-luot-2.md`.
- **Số:** 0155 kiểm còn trống 2026-11-02 trên `main` và mọi nhánh trong máy. Không cần migration, kiểm lại lúc thi công.
- **Loại:** việc lớn (dữ liệu, quyền, **tiền**). Đ1 tạo người hưởng mới, hoa hồng và dòng sổ thật, không đổi công thức: người kiểm thử trên SQLite, công ty lữ hành không tài khoản xác nhận đơn ra hoa hồng 100.000đ, Đã giao sinh `HELD` 1.000.000đ và `HOA_HONG` 100.000đ. Đ2 ghi cấp qua route có sẵn, nên quyết hoa hồng các đơn xác nhận sau đó. **Cửa:** luật hai chiều; bản chụp hoa hồng và dòng sổ đã sinh ở lại. Không thêm cột, không thêm ô quyền.
- **Số quyết định chạm quyền/dữ liệu:** đếm theo điều, ADR-0154 và ADR-0155 có **5 điều**, trần là 3 (bản trước ghi nhầm là 2). Chủ quyết cách chia lượt.
- **Xây trên lỗ đang hở: `TNV-G3`, `TNV-G4`** (sửa 2026-11-02; bản trước ghi «không» vì hiểu là chỉ đọc tiền). Đ1 đưa thêm hồ sơ không đăng nhập vào sổ đại lý, đúng vùng hai lỗ này còn thiếu tin báo (người thu cũ và mới; người bị đổi số dư), và tin báo không tới được người không có tài khoản. Đ1 không sửa mã hay luật sổ tiền; tổ chức không tài khoản đã vào sổ qua loại tự thêm từ ADR-0117. Theo luật dừng dây chuyền (`CLAUDE.md` §3), chưa duyệt được trừ khi hai lỗ được vá hoặc chủ cho phép có ghi lý do, như hai tiền lệ ghi ở `docs/quyen-hoan.json`.
- **Nới hàng rào, chủ quyết riêng (Điều 9.4):** Đ1 mở hàng rào 409 `role_via_account` ở `docs/SO-HANG-RAO.md` cho vai nhóm bên ngoài. Phải viết lại dòng sổ và quan sát chặn lại (P16). Việc này cũng đảo lựa chọn «để sau» ngày 2026-10-09 (`tests/e2e/README.md`).
- **Quan hệ với ADR cũ:** **bổ sung** ADR-0018 (vai bên ngoài nay có thể nằm trên hồ sơ chưa có tài khoản; vai vẫn không sinh quyền khi chưa có tài khoản). **Giữ** ADR-0117 đ3, đ4 (ai gắn; nội bộ không mang), ADR-0048 (`DRIVER_EXTERNAL`), ADR-0077 (đơn đã xác nhận không đổi hoa hồng), ADR-0151 (đổi cấp riêng một lô), luật R26 lúc tạo tài khoản.

## Bối cảnh

Chủ 2026-11-01: các vai bên ngoài (hướng dẫn viên, lễ tân, tài xế, lữ hành) «cần độc lập với tài khoản người dùng; độc lập với các cấp độ đại lý», và Quản lý tài khoản cần «có thêm cột để thể hiện và thiết lập nhanh cấp độ đại lý».

Việc tách vai với cấp đã có từ ADR-0117: vai có cấp mặc định, từng người có cấp riêng. Chưa độc lập ở hai chỗ. Một, route gắn vai ở Danh bạ trả 409 `role_via_account` với mọi vai nhóm bên ngoài, nên một công ty lữ hành chưa có tài khoản không mang vai được và không có cấp theo vai. Hai, muốn xem hay đổi cấp một đối tác phải sang trang Hoa hồng.

## Sai đã biết trong bản này (người kiểm 2026-11-02)

Chờ viết lại, không duyệt theo các câu này:

- **Đ1.1 không xây được.** `parties` đọc `prc_beneficiary_role` tạo vòng phụ thuộc (người kiểm thêm cạnh trên bản chép: bài kiến trúc đỏ). Năm vai cũng không tắt được từ màn nào.
- **Đ1.1 thiếu chốt.** Vai gắn một nơi cụ thể thì kẹt: hoa hồng vẫn chạy mà màn tài khoản không thấy, Danh bạ không gỡ được, chỉ còn SQL tay. Ngày bắt đầu tương lai thì hưởng ngay; đặt trước ngày kết thúc thì mất hưởng ngay. Phải mở rộng Ruling 7, 8, 9 sang năm vai này.
- **Đ1.2 nói quá.** R26 chỉ đúng với hồ sơ cá nhân; hồ sơ tổ chức chưa tạo được tài khoản. «Chưa có tài khoản» phải tính cả tài khoản đã ngưng.
- **Đ1.5 không chứng minh gì.** Nhân viên cũ lọt qua đường gộp hồ sơ, mà `R-PRC-6` không thấy vì chỉ tính loại tự thêm.
- **Đ2.3, Đ2.4.** Ba route không đủ cho bảng bấm (đổi trong ngày 400, «Về theo vai» vẫn áp cấp riêng hết hôm nay); `?ids=` và «một câu truy vấn» không làm được; thiếu trạng thái «Chưa mang vai».
- **Hệ quả còn thiếu.** Gắn vai trước khi có cấp thì đơn bị giữ ở Đã giao tới khi Kế toán xử lý.

**Câu chỉ chủ quyết, chưa chốt:** đối tác thôi vai mà còn đơn nháp đứng tên hoặc còn cấp riêng thì sao (hôm nay đơn của cá nhân mất hoa hồng lặng lẽ, đơn của công ty kẹt); Hành chính nhân sự có được thấy tên và vai của đối tác chưa có tài khoản khi tra số không; cho xây trên hai lỗ sổ tiền và nới hàng rào như hai dòng đầu trang.

## Quyết định

**Đ1. Hồ sơ chưa có tài khoản mang được vai bên ngoài.**

1. Route gắn và gỡ vai ở Danh bạ cho phép vai nhóm bên ngoài **khi đồng thời**: vai đang nằm trong danh sách được hưởng còn bật (`prc_beneficiary_role`, đọc qua view); hồ sơ **chưa có tài khoản**; hồ sơ không phải nội bộ (ADR-0117 đ4). Gồm cả hồ sơ tổ chức. Còn lại vẫn 409 `role_via_account`.
2. Vai không sinh quyền, không tạo đăng nhập. Hồ sơ đã có tài khoản vẫn đổi vai ở Quản lý tài khoản. Lúc tạo tài khoản cho hồ sơ đang mang vai, luật R26 có sẵn bắt chọn vai đó nên quyền sinh đúng lúc ấy.
3. Mở đúng năm vai có sẵn. `DRIVER_EXTERNAL` (Tài xế đối tác) **không** thuộc diện này (ADR-0048); «tài xế» trong lời chủ hiểu là `TAXI_DRIVER`.
4. Ai làm: như ADR-0117 đ3 (Quản trị, Toàn quyền ở Danh bạ). Không thêm ô quyền.
5. `R-LC-1` và `R-PRC-*` phải vẫn xanh trên dữ liệu thử có hồ sơ loại này. Có ca e2e: công ty lữ hành không tài khoản, gắn vai, gắn cấp, văn phòng chọn «Qua đối tác», xác nhận đơn, hoa hồng đúng cấp.

**Đ2. Cột «Cấp độ đại lý» ở Quản lý tài khoản.**

1. Chỉ dòng tài khoản giữ quyền Đối tác có giá trị. Công ty lữ hành không tài khoản vẫn đặt cấp ở trang Hoa hồng.
2. **Thấy cột** khi có `partner.commission.view`: Hành chính nhân sự không có nên không thấy và không gọi route. **Sửa** khi có `partner.commission.write`: trên trang này là Quản trị, Toàn quyền.
3. Chữ trong ô: «Đại lý cấp 3 (theo vai)», «Đại lý cấp 2 (riêng)», «Chưa có cấp», «Xung đột» (hai vai ra hai cấp, ADR-0117 đ2). Bấm mở bảng: chọn cấp, từ ngày (mặc định hôm nay), hoặc «Về theo vai». Hồ sơ có mức riêng thì ô thêm nhãn «có mức riêng», trỏ sang trang Hoa hồng, vì cột nói cấp đang áp chứ không nói số tiền.
4. **Ghi:** dùng đúng ba route sẵn có (đặt, đổi, ngừng cấp riêng). **Đọc:** một route mới chỉ đọc `GET /api/pricing/cap-hien-hanh?ids=…`, cổng `office`, hỏi `partner.commission.view`, chặn `holdsPartner`, tối đa theo danh sách hồ sơ của trang, một câu truy vấn. Tính ở máy chủ, có bài đối chiếu với `GET /api/pricing/ho-so/:id/hoa-hong`.

## Hệ quả

- Danh sách «Đặt qua đối tác» có thêm hồ sơ không tài khoản, đúng ý. Trang Danh bạ hiện vai bên ngoài trong ô gắn vai khi hồ sơ chưa có tài khoản.
- Không tạo sẵn bảy cấp: mức hoa hồng từng cấp do công ty đặt ở trang Hoa hồng.
- Lọc theo vai ở Quản lý tài khoản (lượt 1) vẫn chỉ thấy tài khoản, không thấy hồ sơ chưa có tài khoản.

## Tiêu chí nghiệm thu

Đặc tả §8 mục QĐ-C (a) tới (g) và phần Chung. Thi công xong phải có người kiểm độc lập.
