# Trang ghép: ADR-0219 (CLAUDE.md §9)

> Hồ sơ có ngày 18/11/2026, đi kèm ADR-0219 (proposed). Một quyết định chạm quyền, không chạm dữ liệu. Tên ba ô quyền mới là tên giữ chỗ; kế hoạch thi công chốt tên thật. Lệch với ADR thì ADR thắng.

## 1. Bảng này chứa những loại thực thể nào

ADR-0219 **không thêm loại thực thể nào** vào bảng nào. Các bảng mà các bước đọc hoặc ghi:

| Bảng (module chủ) | Chứa | Đổi gì |
|---|---|---|
| `dk_registration`, `dk_submission`, `dk_submission_org`, `dk_item_result`, `dk_decision`, `dk_event`, `dk_identity` (dang-ky) | phiếu cá nhân, phần tổ chức, kết luận từng mục, quyết định duyệt / kích hoạt, lịch sử, danh tính email | không đổi; `verified_by` nay là mã một Quản lý bán hàng hoặc Toàn quyền |
| `pty_registration_attachment` (parties) | tệp chờ của phiếu (căn cước, GPKD, giấy phép thêm) | không đổi; người mở ảnh nay là Quản lý bán hàng, Toàn quyền |
| `pty_party`, `pty_organization`, `pty_party_role`, `pty_party_relationship`, `pty_verification`, `staff`, `stf_permission`, `prc_party_tier`, `audit_log` (ghi qua lô duyệt) | hồ sơ, tài khoản, quyền, cấp, nhật ký sinh ra khi duyệt | không đổi; người đứng tên lô (`staff_created`) nay có thể là Quản trị |

## 2. Từng dòng bản đồ quyền chạm các bảng này áp cho loại nào

| Hàng quyền (`src/shared/permissions.ts`) | Hôm nay | Sau ADR-0219 | Đổi nghĩa? |
|---|---|---|---|
| `registration.verify` (**mới**) | — | Quản lý bán hàng, Toàn quyền: kết luận mục, đối chiếu Danh bạ, ba lệnh kết thúc xác minh của phiếu đăng ký | hàng mới |
| `registration.verify.attachment` (**mới**) | — | Quản lý bán hàng, Toàn quyền: xem đủ số, mở ảnh của phiếu đăng ký đang chờ xác minh | hàng mới |
| `registration.approve` (**mới**) | — | Quản trị, Nhân sự, Toàn quyền: xem màn duyệt, duyệt, từ chối, trả về xác minh, gửi lại lời mời | hàng mới |
| `registration.queue.view` | Quản trị, Nhân sự, Toàn quyền | **thêm** Quản lý bán hàng | **có** — thêm một vai |
| `party.view` | Bán hàng, Kế toán, Quản trị, Toàn quyền (Quản lý bán hàng có nhờ mã Bán hàng đi kèm) | không đổi; vẫn là điều kiện thứ hai của bước xác minh (Hiến chương 5.29) | không |
| `party.verify`, `party.verify.attachment` | Quản trị, Nhân sự, Toàn quyền — dùng cho **cả** phiếu tự khai (ADR-0125) **và** phiếu đăng ký | không đổi giá trị; **chỉ còn** áp cho phiếu tự khai | **có** — thu hẹp phạm vi, không đổi người |
| `account.create` | Nhân sự, Toàn quyền — tạo tài khoản ở Quản lý tài khoản **và** duyệt phiếu đăng ký | không đổi giá trị; **chỉ còn** áp cho tạo tài khoản ở Quản lý tài khoản | **có** — thu hẹp phạm vi, không đổi người |
| `partner.signup_tier.write` | Quản lý bán hàng, Quản trị, Toàn quyền | không đổi (xem «Rủi ro còn lại» của ADR) | không |
| `registration.policy.write` | Toàn quyền | không đổi | không |
| Không hàng nào khác; **không thêm mã quyền** (không thêm cột) | | | |

## 3. Cổng nào canh cửa nào (máy chủ và giao diện)

| Cửa | Hôm nay | Sau ADR-0219 |
|---|---|---|
| Route xác minh `GET/POST /api/dang-ky/phieu/:id`, `…/ket-luan`, `…/dat`, `…/bo-sung`, `…/tu-choi` | cổng `accounts` + `party.verify` + `party.view` | cổng `office` + `registration.verify` + `party.view` |
| Route xem số, mở ảnh `…/xem-so`, `…/tep/:tid` | cổng `accounts` + thêm `party.verify.attachment` | cổng `office` + thêm `registration.verify.attachment` |
| Route duyệt `…/xem-duyet`, `…/duyet`, `…/tu-choi-duyet`, `…/tra-ve-xac-minh`, `…/gui-lai-loi-moi` | cổng `accounts` + `account.create` | cổng `accounts` (không đổi) + `registration.approve` |
| Route hàng chờ `GET /api/dang-ky/hang-cho` (cổng ở `index.ts`, lọc theo năng lực ở `xemHangCho` của `xac-minh-route.ts`) | cổng `accounts` + `registration.queue.view`; lọc: xác minh = `party.verify` + `party.view`, duyệt = `account.create` | cổng `staff` + `registration.queue.view`; lọc: xác minh = `registration.verify` + `party.view`, duyệt = `registration.approve`. Cổng `staff` mở cho mọi tài khoản đăng nhập (kể cả Đối tác); chặn là lời kiểm trong thân (cột Đối tác, Tài xế đối tác của ô = không), và phải thêm ca canh vì rào 2 của `route-write-guard.test.ts` không phủ cổng `staff` |
| Route gửi lại thư `…/gui-lai-thu` (`thu-bao.ts`) | cổng `accounts`; trong thân `party.verify` + `party.view` hoặc `account.create` theo loại thư | cổng `staff`; trong thân `registration.verify` + `party.view` hoặc `registration.approve` |
| Giao diện: khối hàng chờ ở `web/staff.ts` (hiện theo `registration.queue.view`) | trên trang Quản lý tài khoản (cổng `account.view`) | **trang riêng** hiện theo `registration.queue.view`; Quản lý tài khoản giữ lối sang |
| Giao diện: nút ở `web/dang-ky-hang-cho.ts` | xác minh theo `party.verify` + `party.view`; ảnh theo `party.verify.attachment`; duyệt theo `account.create` | xác minh theo `registration.verify` + `party.view`; ảnh theo `registration.verify.attachment`; duyệt theo `registration.approve` |
| Giao diện: hàng chờ phiếu tự khai `web/xac-minh-hang-cho.ts`, khung «Thêm tài khoản» `web/staff.ts` | `party.verify`; `account.create` | không đổi |
| Trigger `dk_decision_guard` (người duyệt ≠ người xác minh, trừ cờ Toàn quyền) | có | không đổi |
| Tên ô cho Trợ lý (`src/shared/tro-ly-cau-truc-ten.ts`) | có tên cho ô cũ; mô tả `registration.queue.view` nói «Nhân sự chỉ thấy phiếu đang chờ duyệt» | thêm tên cho ba ô mới; sửa mô tả `registration.queue.view` theo bảng mới |
| Chú thích trong mã nói «Quản trị, Nhân sự, Toàn quyền» xác minh (`dang-ky/index.ts`, `xac-minh-route.ts`, `thu-bao.ts`, `web/staff.ts`, `web/dang-ky-hang-cho.ts`) | khớp luật cũ | sửa cùng lần thi công (tài liệu mô tả thua mã) |
| Sổ hàng rào `docs/SO-HANG-RAO.md`, dòng rào (4b) đăng ký | «bước xác minh hỏi `party.verify` VÀ `party.view` ở cổng accounts» | ghi lại theo ô mới, kèm ngày quan sát chặn thật |

**Ca cần canh khi ghép:** một tài khoản Quản lý bán hàng kiêm Quản trị giữ cả `registration.verify` lẫn `registration.approve`. Máy chặn bằng trigger trên từng phiếu; giao diện khoá nút (bản sửa 18/11, `tuDuyetBiChan`). Một tài khoản Nhân sự kiêm Bán hàng (không Quản lý bán hàng) **không** xác minh được, vì thiếu `registration.verify`.
