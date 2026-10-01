# ADR-0018 — Mô hình người – vai – quyền: vai sinh bộ quyền mặc định, luật cứng theo nhóm, người nhận đơn có hạn, đối tác là bên đặt có chiết khấu

- **Trạng thái:** **accepted** — chủ dự án duyệt trực tiếp trong phiên chat 2026-09-24 ("duyệt ADR-0018, chọn A, bỏ HDV theo bến"). Soạn từ đặc tả **đã được chủ duyệt** (`docs/superpowers/specs/2026-09-24-mo-hinh-nguoi-vai-quyen-design.md`, 2026-09-24). Thay đổi nội dung sau mốc này = ADR mới trỏ về ADR này.
- **Sửa bởi:** [ADR-0072](ADR-0072-giam-doc-bot-quyen-ky-thuat.md) — điều 4: vai Giám đốc sinh `ADMIN`, bỏ `SUPER_ADMIN`; [ADR-0071](ADR-0071-vai-hanh-chinh-nhan-su-go-dong-bo-sheet-bao-tri-theo-toan-quyen.md) — thêm vai Hành chính nhân sự (`HR_STAFF` → `HR`, chỉ Toàn quyền gán); [ADR-0077](ADR-0077-chinh-sach-hoa-hong-va-chup-luc-xac-nhan.md) (duyệt 2026-10-01) — điều 11: bảng mức hoa hồng theo vai được hưởng × nhóm dịch vụ (không theo tiền tố mã), chụp vào đơn **lúc Xác nhận**, thiếu mức thì giữ ở "Đã giao" (không lấy 0%).
- **Ghi chú số hiệu:** tài liệu hàng rào quyền trên `main` (`docs/quyen-hoan.json`, `docs/superpowers/plans/2026-09-24-hang-rao-quyen-va-va-lo-hong-ho-so.md`) dùng tên "ADR-0018" cho một quyết định KHÁC chưa viết (tách cổng `office`, route quản trị hỏi bảng quyền). Số 0018 thuộc tệp này; quyết định kia cần số mới khi được soạn.
- **Ngày:** 2026-09-24   **Người phê chuẩn:** chủ dự án (chưa duyệt)
- **Loại quyết định:** **hỗn hợp.** Hai chiều: mã, bảng vai → quyền, cấu hình (thời hạn, giờ làm việc, bảng chiết khấu). **Một chiều:** (1) số đã **chụp vào đơn** (hạn nhận, tỷ lệ chiết khấu theo dòng) — đổi cài đặt sau không sửa đơn cũ, và không nên sửa; (2) **đối tác đã thấy SĐT công việc của hướng dẫn viên** thì không thu lại được.
- **Nguồn chi tiết:** mọi bảng (11 vai, bảng thao tác × 7 mức quyền, luật cứng LC-1…LC-8, cách tính hạn, mô hình chiết khấu, ví dụ số) nằm ở **đặc tả đã duyệt** nói trên — ADR này ghi **quyết định**, không chép lại bảng. Đặc tả là một phần của quyết định.
- **Liên quan — sửa/thay:**
  - ADR-0001 **điều 4** (vai không làm điều kiện cho phép): **giữ và làm rõ** — xem điều 3.
  - ADR-0005 (quyền đa trị): giữ cơ chế; **thêm mã `INTERN`**; tập quyền của tài khoản nay **sinh từ vai** + chỉnh tay.
  - ADR-0007 bảng quyền (đã sửa bởi ADR-0009, ADR-0014, ADR-0017): **thay bằng bảng §5 của đặc tả**, thi công theo giai đoạn.
  - ADR-0009 **điều 4** (người lập là người phụ trách mặc định) và việc "giao = có hiệu lực ngay": thay bằng điều 7 dưới đây.
  - ADR-0011 (khách trên đơn): **giữ cho đơn khách lẻ**; đơn đối tác theo điều 9–10.
  - ADR-0014: điều 1 (một mã `PARTNER` cho mọi đối tác) **giữ**; điều 5 **giữ**; điều 8 (Admin chỉ quản lý cấp dưới) **giữ và siết** (điều 5 dưới); **điều 9** (đối tác chọn HDV lúc lập đơn) **thay** bằng "đề xuất, không ràng buộc"; **điều 10** (đối tác ngoài "xin nhận") **bỏ**; điều 12 (không báo đẩy) **sửa**: có báo đẩy cho **Điều hành** khi đơn quá hạn nhận (đối tác vẫn không).
  - ADR-0017: **hấp thụ nguyên vẹn** vào vai Hướng dẫn viên nội bộ; **thêm**: HDV nội bộ lên đơn, sửa nháp và xác nhận đơn mình đang nhận.

## Bối cảnh

Chủ dự án muốn định hình lại các thực thể tham gia chuỗi hoạt động theo tinh thần "định danh trước vai" (Oracle TCA — `docs/Ref/`): một người là một thực thể có hồ sơ riêng; người đó mang vai nội bộ hoặc bên ngoài; ai cũng có thể có tài khoản với mức quyền khác nhau; đối tác và nội bộ đều lên đơn, còn người của Tour Đảo mới nhận và chăm sóc đơn. Hệ thống hôm nay đã có Party–Role–Relationship (ADR-0001) nhưng **vai chỉ là nhãn, không có tác dụng**; quyền cấp tay từng tài khoản; năm loại đối tác gộp chung một quyền; người lập đơn tự thành người phụ trách; chưa có khái niệm "đơn chờ nhận" hay thời hạn; đối tác chưa là bên đặt và chưa có chiết khấu. Qua ba vòng hỏi đáp ngày 2026-09-24, chủ đã chốt 37 quyết định (Q1–Q37, đặc tả §3).

## Quyết định

**1. Sáu lớp tách riêng.** Hồ sơ (người/tổ chức) · vai với Tour Đảo (có hiệu lực theo ngày) · vai trên từng đơn (người lập, bên đặt, khách đi tour, người nhận, HDV được đề xuất) · tài khoản đăng nhập · quyền · quan hệ thương mại (chiết khấu; công nợ/hoá đơn đợt sau). Điều khoản thương mại **không bao giờ** ghi lên tài khoản đăng nhập.

**2. Mười một vai, hai nhóm.** Nội bộ: Giám đốc, Điều hành chung, Hướng dẫn viên nội bộ, Nhân viên kinh doanh, Thực tập sinh, Kế toán. Bên ngoài: Công ty lữ hành, Hướng dẫn viên độc lập, Lễ tân khách sạn, Tài xế taxi, Cộng tác viên. Mã vai là **dữ liệu** (`pty_role_type`, thêm cột nhóm). **Bộ quyền mặc định của từng vai cố định trong mã** (một tệp thuần dùng chung), đổi qua duyệt + phát hành; tài liệu vai & quyền **tự sinh** từ cùng nguồn, có test chặn lệch.

**3. Vai sinh quyền; quyền vẫn là cổng duy nhất.** Quyền hiệu lực của tài khoản = hợp bộ mặc định của các vai đang hiệu lực + cộng tay − bớt tay (lưu riêng, có lý do), rồi lọc theo luật cứng. `stf_permission` là **bản hiện thực hoá**; `can()` vẫn chỉ đọc quyền. **Làm rõ ADR-0001 điều 4:** vai **không bao giờ** là điều kiện cho phép trực tiếp; con đường **duy nhất** để vai ảnh hưởng quyền là **hàm sinh quyền mặc định** ở module `staff`, đọc vai qua hàm do module `parties` công bố. Bài kiểm R-N1-12 (ngoài `parties` không mã nào nhắc bảng vai) **giữ nguyên**. Tài khoản chưa được gán vai mới **giữ nguyên quyền hiện có** cho tới khi chủ duyệt bảng đối chiếu từng người.

**4. Mức quyền.** Thêm `INTERN` ("Thực tập"). Nhãn `SUPER_ADMIN` đổi thành **"Toàn quyền"** (bỏ chữ Anh lộ ra người dùng). Giám đốc = Toàn quyền (kèm Quản trị, để các chốt "còn ít nhất một quản trị viên" đếm đúng); Điều hành chung = Quản trị.

**5. Luật cứng (không ai chỉnh tay phá được), đặt gần dữ liệu + tầng miền + kiểm dữ liệu:** LC-1 tài khoản bên ngoài chỉ giữ quyền Đối tác · LC-2 người phụ trách/người được đề nghị nhận phải có vai nội bộ đang hiệu lực · LC-3 một hồ sơ không giữ **cùng lúc** vai nội bộ và vai bên ngoài · LC-4 chỉ **Toàn quyền** gán/gỡ vai hoặc quyền mức Quản trị trở lên (Admin chỉ quản lý tài khoản cấp dưới — ADR-0014 điều 8, nay **siết**: Admin không cấp được quyền Quản trị cho ai) · LC-5 hạn nhận và tỷ lệ chiết khấu **chốt vào đơn** · LC-6 nhật ký cho mọi thay đổi vai, quyền, cài đặt, chiết khấu, gửi/nhận đơn · LC-7 phiếu gửi khách không bao giờ chứa chiết khấu hay số đối tác phải trả · LC-8 sau lần nhận đầu, đơn luôn có người phụ trách.

**6. Bảng thao tác đích = đặc tả §5.** Tách `order.confirm` khỏi `order.modify` (chỉ người nhận xác nhận; Quản trị/Toàn quyền xác nhận thay); thêm `order.submit`, `dispatch.accept`, `partner.list`, `partner.commission.write`, `settings.ops`; bỏ `dispatch.request`; `dispatch.guides.view` cho đối tác kèm SĐT công việc. **Giai đoạn 1 chỉ thêm cột `INTERN` (tạm hẹp, không làm người phụ trách) và không đổi ô nào của sáu mã cũ**; các ô còn lại đổi ở giai đoạn 2.

**7. Người nhận đơn.** Mọi đơn có **một người nhận của Tour Đảo** (người phụ trách), người đó xác nhận và chăm sóc đơn. Người lập nội bộ **mặc định tự nhận**; chọn người khác = **đề nghị**, người đó phải **bấm "Nhận"** trong hạn; chưa ai nhận thì người lập vẫn phụ trách (chỉ đơn do nhân viên Tour Đảo lập). Đổi người: người cũ giữ tới khi người mới bấm Nhận. HDV nội bộ nhận đơn chung; Kinh doanh, Điều hành, Giám đốc nhận thay khi cần; **Kế toán và Thực tập sinh chỉ nhận đơn mình lập hoặc đơn Giám đốc/Điều hành giao**. Đối tác **không bao giờ** là người nhận.

**8. Hạn nhận.** 15 **phút làm việc** trong 06:15–21:00, mọi ngày kể cả lễ Tết; Toàn quyền đổi được; áp cho **mọi lần chờ nhận**; chốt lúc bắt đầu chờ. Quá hạn: đỏ ở khối "Chờ tiếp nhận" trên Trang chủ cho mọi người, đối tác thấy "quá hạn", báo đẩy tới điện thoại Điều hành (giai đoạn cuối).

**9. Đối tác là bên đặt.** Mọi thực thể bên ngoài là **bên đặt**, bán theo giá của họ, được giảm giá cho khách; phiếu gửi khách **luôn theo giá bán lẻ**. Công ty lữ hành dùng **một tài khoản chung** gắn **hồ sơ công ty**. Đối tác soạn nháp riêng, bấm **"Gửi đơn hàng"** (đồng hồ bắt đầu), được **đề xuất** một HDV nội bộ (không bắt buộc; thấy tên + SĐT công việc), thấy người phụ trách, SĐT và giờ nhận.

**10. Khách của đối tác** là **hồ sơ người** nối quan hệ **"khách của <đối tác>"** (`CUSTOMER_OF`), **không** mang vai khách hàng của Tour Đảo; cùng SĐT là cùng một hồ sơ; không dùng để tiếp thị trực tiếp (quy tắc sử dụng).

**11. Chiết khấu.** Khác nhau theo đối tác và theo dịch vụ: bảng **cấu hình** có nhóm đối tác, loại dịch vụ (theo tiền tố mã danh mục), **ô cụ thể nhất thắng** (6 mức, thoả thuận riêng với đối tác thắng bảng của nhóm), có hiệu lực theo ngày; **chụp theo từng dòng dịch vụ** lúc gửi đơn; tính trên giá bán lẻ trước khuyến mại; làm tròn tới đồng theo dòng; mọi số chỉ tính ở máy chủ. Đợt này ghi và hiện "đối tác phải trả / dự kiến còn phải trả"; sổ công nợ, đối soát, hoá đơn VAT làm ở đợt thu tiền.

**12. Thi công theo giai đoạn** (đặc tả §15), mỗi giai đoạn phát hành riêng, có người kiểm độc lập và một mục nhật ký thay đổi. Chuyển đổi ~30 tài khoản hiện có: AI soạn truy vấn chỉ-đọc, **chủ tự chạy**, AI lập bảng đối chiếu từng người, **chủ duyệt từng dòng**, gán vai bằng màn quản trị — không bằng migration.

## Lý do

- Đúng triết lý chủ đã chọn: danh tính trước vai, vai có thời hạn, quan hệ thương mại tách khỏi tài khoản đăng nhập.
- Vai sinh quyền (thay vì cấp tay) giảm sai sót với ~30 nhân viên và tới ~1000 đối tác; chỉnh tay vẫn còn cho ngoại lệ, nhưng luật cứng chặn các ngoại lệ nguy hiểm (đối tác thấy đơn người khác, đối tác nhận đơn, Admin tự tạo thêm Admin).
- Bảng vai → quyền cố định trong mã + tài liệu tự sinh: một lần sửa bảng là một lần phát hành có duyệt và có test, không thể lặng lẽ đổi quyền hàng chục tài khoản.
- "Người nhận bấm Nhận + hạn" cho đối tác bằng chứng đơn đã có người lo và lúc nào — đúng yêu cầu vận hành chủ nêu.
- Chiết khấu theo ô cụ thể nhất: khớp thực tế (khác theo đối tác và dịch vụ) mà không phải nhập ~1000 × 34 ô.

## Rủi ro đã nêu cho chủ dự án, chủ vẫn quyết (ghi để sau này không ai nói "không biết")

- **Tài khoản chung của công ty lữ hành:** hệ thống không biết người nào trong công ty đã bấm; nhân viên công ty nghỉ thì quản trị phải "Đặt lại PIN" (tự đổi PIN thì Face ID máy cũ vẫn còn).
- **SĐT công việc của HDV hiện cho mọi đối tác** (để liên lạc trực tiếp).
- **Người trực từ 06:15 mỗi ngày, kể cả lễ Tết** — hạn sớm nhất trong ngày là 06:30.
- **Chỉ một tài khoản Toàn quyền** (ADR-0014 điều 8): nay giữ thêm cài đặt vận hành và gán vai cấp cao.
- (Rủi ro của ADR-0017 — HDV nghỉ việc đã kịp xem khách và tiền — đã ghi ở ADR-0017, không nhắc lại.)

## Phương án bị loại

- **Vai chỉ là nhãn, quyền cấp tay như cũ** — dễ cấp sai; vai "nội bộ/bên ngoài" không có tác dụng.
- **Gộp vai và quyền làm một** — mất chỉnh riêng từng người; trái ADR-0005.
- **Toàn quyền sửa bảng vai → quyền ngay trong app** — một lần chỉnh đổi quyền hàng chục tài khoản không qua kiểm tra.
- **Mỗi nhân viên công ty lữ hành một tài khoản** (AI khuyến nghị) — chủ chọn tài khoản chung.
- **Đối tác ngoài "xin nhận" việc** (ADR-0014 điều 10) — chủ chốt HDV độc lập không nhận đơn.
- **Ô "người giới thiệu" riêng** — chủ chốt mọi đối tác là bên đặt.
- **Khách của đối tác chỉ là thông tin liên lạc trên đơn** — mất định danh; trái "định danh trước vai".
- **Một tỷ lệ chiết khấu cho mỗi đối tác / nhập từng ô đối tác × dịch vụ / chỉ theo nhóm** — không khớp thực tế hoặc quá nặng để cấu hình.

## Hệ quả

- **Dữ liệu (chỉ thêm, expand–contract):** cột nhóm vai + 10 mã vai mới; mã quyền `INTERN`; bảng chỉnh quyền tay; view công bố nhóm vai đang mở; trigger LC-1, LC-3 (giai đoạn 1). Sau đó: đề nghị nhận, hạn nhận, cài đặt vận hành, bên đặt tổ chức, quan hệ `CUSTOMER_OF`, bảng chiết khấu, cột chụp theo dòng (các giai đoạn sau).
- **Bài kiểm ghim hành vi cũ phải đảo có chủ đích** (đỏ → xanh), ghi trong kế hoạch từng giai đoạn: `start-page.test.ts` và bước C/D-1 của `trang-chu-smoke.mjs` (FIELD), e2e `admin.mjs` (Admin cấp quyền Quản trị — nay 403 theo LC-4), e2e `dispatch.mjs` (người phụ trách mặc định), test ghim `PARTNER` tự xác nhận đơn.
- **Không đổi quyền của tài khoản nào** khi phát hành giai đoạn 1 (tiêu chí 11 của đặc tả).
- Mỗi giai đoạn: `npm test`, `npm run typecheck`, `npm run test:e2e` đủ bộ, kịch bản Chrome liên quan, `audit-invariants`, mục nhật ký thay đổi mới, người kiểm độc lập chỉ-đọc (việc lớn: dữ liệu + quyền).
