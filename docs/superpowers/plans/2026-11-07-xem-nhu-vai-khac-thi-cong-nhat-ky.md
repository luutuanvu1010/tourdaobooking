# Nhật ký thi công — Toàn quyền xem như vai trò khác (ADR-0180)

Kế hoạch: `docs/superpowers/plans/2026-11-07-xem-nhu-vai-khac.md`. Đặc tả: `docs/superpowers/specs/2026-11-07-xem-nhu-vai-khac-design.md`. Nhật ký này ghi phần rà soát của Task 7 (ADR-0180 Đ1.4) và các điều còn treo.

## Bảng rà nơi đọc quyền (ADR-0180 Đ1.4)
Bảng này rà từng chỗ quyết định một điều về NGƯỜI GỌI bằng nguồn khác bộ quyền hiệu lực của phiên (`ctx.staff.permissions`). Mặc định, người gọi phải được đối xử theo vai đang đóng. Có ba phán quyết:
- «theo hiệu lực»: chỗ đó đã dùng bộ hiệu lực, hoặc đã sửa để dùng.
- «thật theo thiết kế»: chỗ đó cố ý dùng quyền thật, kèm lý do.
- «đích, không phải người gọi»: chỗ đó xét một tài khoản khác.

Bảng ghi tên tệp và tên hàm, không ghi số dòng (số dòng đổi theo mã).

| Tệp — chỗ | Quyết định gì | Nguồn quyền | Phán |
|---|---|---|---|
| `src/modules/auth/index.ts` — `currentStaff` | Dựng bộ hiệu lực; chỉ nhận vai khi quyền thật có Toàn quyền | thật → hiệu lực | Nơi duy nhất tính (Đ1.2) |
| `src/shared/router.ts` — cổng bảo trì | Miễn bảo trì | thật (`quyenThat`) | Thật theo thiết kế (Đ3: chủ không tự khoá mình). Ghim: bài quét (route giả) và `src/modules/auth/xem-nhu-vai-phien.test.ts` |
| `src/shared/router.ts` — cổng admin / accounts / office / orders | Vào được hạng route | hiệu lực | Theo hiệu lực. Ghim: bài quét (route giả) |
| `src/shared/router.ts` — hàm tiêm `isAssigned`, `isSalesOwner`, `myHandledOrderIds`, `partyAccount(who, …)`, `newOrderHandler(who, …)` | Phân công, sở hữu theo id; `partyAccount` nhận `who` hiệu lực | dữ liệu theo id + hiệu lực | Dữ liệu của tài khoản (cùng id thì cùng dữ liệu với tài khoản thật) |
| `src/modules/accounts/index.ts` — POST / DELETE `/api/auth/xem-nhu-vai` | Cổng bật / thoát | thật | Thật theo thiết kế (Đ3), miễn trong bài quét |
| `src/modules/accounts/index.ts` — các route `/api/account/mfa*` | Yếu tố hai lớp được phép, bắt buộc, yếu tố cuối | thật (`quyenThat`) | Thật theo thiết kế (Đ3 câu cuối). Bài quét chỉ miễn hai route thấy khác thật (`mfa/email/start`, `mfa/email/confirm`) |
| `src/modules/accounts/index.ts` — `actorIsSuper = can(admin, …)`, `highPermissionProblem` | Cấp bậc khi tạo / sửa tài khoản | hiệu lực (`ctx.staff`) | Theo hiệu lực |
| `src/modules/accounts/index.ts` — `getStaffAccount(id)` của tài khoản được sửa | Tài khoản đích | CSDL | Đích, không phải người gọi |
| `src/modules/audit/repository.ts` — câu con dấu vai (`v_stf_toan_quyen` theo người làm) | Gắn dấu vai vào nhật ký | CSDL thật | Thật theo thiết kế (Đ2) |
| `src/modules/audit/repository.ts` — `hideSilent` (`v_stf_toan_quyen` theo tác giả dòng) | Giấu thao tác im lặng do Toàn quyền làm | người xem: hiệu lực (`can(staff, "admin.manage.superadmin")`); tác giả dòng: CSDL | Người xem theo hiệu lực; tác giả dòng là đích |
| `src/modules/feedback/repository.ts` — `nguoiGiuHopLe` (`v_stf_toan_quyen` theo `assignee_id`) | Phiếu còn người giữ hợp lệ không | CSDL của người giữ | Đích (người giữ phiếu). Giữ phiếu không cho thêm quyền làm gì |
| `src/modules/feedback/index.ts` — `can(staff, "feedback.*")`, `quyenPhieu({ who: staff })` | Mọi quyền Góp ý / Hỗ trợ | hiệu lực | Theo hiệu lực. Ghim: bài quét, ca Góp ý / Kỹ thuật |
| `src/modules/feedback/index.ts` — `memberships(db, who)` | Tư cách thành viên nhóm | dữ liệu theo id | Dữ liệu, không phải quyền |
| `src/modules/feedback/index.ts` — `nguoiNhanNgoai`, thành viên nhóm | Tài khoản đích có phải tài khoản bên ngoài | CSDL | Đích |
| **`src/modules/parties/index.ts` — `nguoiXetCuaPhien`** | **Người xét phiếu tự khai: cấp bậc, tách nhiệm vụ, Toàn quyền** | **CSDL thật (trước khi sửa)** | **Phải theo hiệu lực, ĐÃ SỬA**: quyền luôn lấy từ phiên. Ghim: bài quét, ca «xác minh phiếu tự khai» |
| `src/modules/parties/xac-minh.ts` — `chuyenToanQuyen` (dùng ở route hàng chờ xác minh) | Phiếu có phải «chuyển Toàn quyền» không: thử từng tài khoản Quản trị / Nhân sự trong danh sách bằng quyền THẬT của họ, bỏ qua người thật giữ Toàn quyền | CSDL của danh sách tài khoản | Đích. Chỉ là cờ hiển thị, không cho ai quyền gì. Chủ đang đóng vai vẫn bị bỏ qua (vì quyền thật là Toàn quyền), nên cờ tính như khi chủ không đóng vai |
| `src/modules/parties/index.ts` — `laToanQuyen: staff.permissions…` của câu quyết, `anhTrongPham`, `xetPhieuXoaDayDu` | Miễn tách nhiệm vụ; ảnh hết lý do giữ; phiếu xoá | hiệu lực | Theo hiệu lực |
| `src/modules/parties/repository.ts` — câu `decide_self_submission` | Chỉ dùng cờ do route truyền | hiệu lực | Theo hiệu lực (không tự tra view) |
| `src/modules/parties/xoa-an-danh.ts` — `xetXuLyPhieuXoa`, `thayAnhCuaHoSo` | Luật thuần; người xét do route truyền | hiệu lực | Theo hiệu lực |
| `src/modules/staff/index.ts` — `accountOfParty` | Hồ sơ gắn tài khoản nào, quản được không | actor hiệu lực + đích CSDL | Đích |
| `src/modules/staff/index.ts` — `accountRoleCodesOf`; `src/modules/auth/session-ledger.ts` — `isSingleDevice`; `src/modules/auth/repository.ts` — câu nhiều máy (`v_stf_nhieu_may_co_dinh`, `v_stf_quyen_mo`) | Một máy hay nhiều máy, quyết lúc cấp phiên | thật | Thật theo thiết kế: chính sách phiên của tài khoản, quyết lúc đăng nhập như hai lớp. Suy diễn từ Đ3, ADR không nêu tên chỗ này |
| `src/modules/auth/mfa-rules.ts`, `mfa-repo.ts` | Hai lớp | đầu vào là quyền thật / đích | Thật theo thiết kế (Đ3) |
| `src/modules/dispatch/index.ts` — `hasPermission(staff, "SUPER_ADMIN")` ở sửa tiền cấp hẹp | Sửa tiền / sau ngày đi | hiệu lực | Theo hiệu lực |
| `src/modules/dispatch/index.ts` — `newOrderHandler`, giao / nhận phụ trách, danh sách người giao được (`checkAssignee(getStaffAccount(id))`) | Tư cách người ĐƯỢC CHỌN | CSDL của đích | Đích. Nếu đích là chủ đang đóng vai thì đích được xét như Toàn quyền, nhưng không lọt: cổng `dispatch.assign` / `dispatch.claim` theo hiệu lực đứng trước, và mọi vai qua được cổng đó đều là người được giao hợp lệ. Ghim: ca «lập đơn, đóng Thực tập / Đối tác» |
| `src/modules/dispatch/ban-hang-moi.ts` — `hopLeMoi` | Người được mời làm Bán hàng phụ trách phải giữ Bán hàng | CSDL của đích | Đích. Chủ đóng Bán hàng tự mời mình thì bị từ chối, tức CHẶT hơn tài khoản thật, không lọt |
| `src/modules/dispatch/index.ts` — `biGioiHanTuChoi(staff.permissions)` | Hạn mức từ chối | hiệu lực | Theo hiệu lực |
| `src/modules/orders/xac-nhan-repo.ts` — `nguoiLapGiuDoiTac`, `quyenMoCuaNguoiLap`; `src/modules/billing/repository.ts` — `nguoiLapGiuDoiTac`; `billing/dat-coc.ts` | Đơn có do người giữ Đối tác lập không (che ghi chú, mẫu biên nhận, cọc) | CSDL của NGƯỜI LẬP | Điều kiện dữ liệu của đơn (đích). Đơn lập lúc đóng Đối tác bị coi là đơn nội bộ, thuộc giới hạn `partyId` đã biết. Chỗ này không nâng chủ thành Toàn quyền |
| `src/modules/orders/xac-nhan-route.ts`, `xac-nhan-chung.ts`, `src/modules/dispatch/ban-hang-route.ts` — `holdsPartner` / `holdsIntern` / `passesAdminGate` trên `staff` | Nhánh xác nhận, Bán hàng phụ trách | hiệu lực | Theo hiệu lực |
| `src/modules/tro-ly/index.ts` — `duocDungTroLy(staff.permissions, …)` | Vai được dùng Trợ lý | hiệu lực | Theo hiệu lực |
| `src/modules/thongbao/index.ts` — `coTheNhan`, `can(staff, "notice.send")` | Tin chuyến, gửi thông báo | hiệu lực | Theo hiệu lực |
| `src/modules/bangtin/index.ts` — `nhanKetNoi(staff)` lúc bắt tay | Nhãn kết nối Bảng tin | hiệu lực TẠI LÚC BẮT TAY | Theo hiệu lực, nhưng kết nối mở trước khi bật vai giữ nhãn cũ. Xem «Chờ chủ» |
| Báo đẩy (module `thongbao`, `web/sw/sw.ts`) | Đánh thức máy nào: theo quyền thật của tài khoản nhận. Nội dung hiện ra: service worker gọi `/api/thong-bao/moi-nhat` bằng phiên của trình duyệt, nên theo bộ hiệu lực | thật (chọn máy) / hiệu lực (nội dung) | Chọn máy theo đích (tài khoản nhận). Chữ hiện ra theo phiên đang đóng vai |
| `src/index.ts` — `benDatCuaToi`, `dichVuBiChanChoToi` | Bên đặt bị ép của Đối tác | `actor` hiệu lực + `actor.partyId` | Theo hiệu lực, cộng giới hạn `partyId` đã biết |
| `src/index.ts` — `huongDanVien`; `src/modules/staff/repository.ts` | Danh sách tài khoản Hướng dẫn viên; đọc / ghi quyền của tài khoản đích | CSDL | Đích |
| `src/shared/maintenance.ts` | Miễn bảo trì | đầu vào thật từ router | Thật theo thiết kế |
| `src/shared/assignee-pick.ts`, `ban-hang-phu-trach.ts`, `han-muc-tu-choi.ts`, `thong-bao.ts`, `chinh-sach-dang-nhap.ts`, `huong-dan-quan-tri.ts`, `tro-ly-cau-truc*.ts` | Luật thuần nhận bộ quyền do người gọi truyền (là `staff` hiệu lực hoặc tài khoản đích), hoặc chỉ là siêu dữ liệu nội dung | — | Theo hiệu lực / không phải quyết định về người gọi |
| `scripts/audit-checks.mjs`, `scripts/staff-lib.mjs`, `scripts/tai-khoan-thu.mjs`, `scripts/chup-muc-giao-dien.mjs` | Kịch bản chạy ngoài request | CSDL | Không áp |
| `migrations/` — trigger LC-1 (0037), trigger nhãn đối tác (0095), view `v_stf_toan_quyen` (0027), `v_stf_quyen_mo` và `v_stf_nhieu_may_co_dinh` (0067) | Ràng buộc dữ liệu của tài khoản đích; view công bố | CSDL | Không trigger nào so quyền của NGƯỜI LÀM; chỗ dùng view đã liệt kê ở trên |

## Chưa kiểm được / không phủ
- **Thân phản hồi:** bài quét chỉ so mã trạng thái, không so thân. Ví dụ `/api/auth/me` trả 200 ở cả hai bên nhưng thân khác theo thiết kế.
- **Lộ phạm vi đọc:** bài quét chạy trên CSDL rỗng, với tham số giả và thân `{}`, nên phần lớn route dừng ở 400/404. Lỗi lộ dữ liệu ở nhánh sâu (danh sách, chi tiết) chỉ được canh bằng bảng rà trên và vài ca có dữ liệu (xác minh phiếu tự khai, Góp ý / Kỹ thuật / Nhật ký, quyền tiền, admin.manage, chọn người phụ trách).
- **Bảng tin qua WebSocket:** khung thử không có trạm, nên không phủ.
- **Báo đẩy, Cron:** không phủ.
- **Ảnh hưởng của `partyId` khi đóng Đối tác / Tài xế đối tác:** máy vẫn dùng hồ sơ nội bộ của chủ, đơn bị coi là đơn nội bộ. Đây là giới hạn đã biết, không quét.
- **Ẩn / hiện ở giao diện:** bài quét chỉ kiểm máy chủ.

## Chờ chủ
- **Bảng tin qua WebSocket:**
  - Lỗi: kết nối mở TRƯỚC khi bật vai giữ nhãn đã tính lúc bắt tay (ví dụ nhãn «mọi đơn» của Toàn quyền) cho tới khi nối lại. Tab vừa bật vai tự tải lại nên đúng; tab khác cùng phiên thì không.
  - Mức độ nhẹ: khung tin chỉ mang mã / khoá đơn, loại thay đổi, giờ hoặc mã chuyến, không có tiền hay liên hệ, và chỉ tới kết nối của chính chủ.
  - Cách sửa: cần một kiểu đóng mới trong `MucDongBangTin`, chỉ đóng kết nối của phiên và giữ đăng ký báo đẩy (mọi kiểu hiện có đều tắt luôn báo đẩy). Đó là đổi hợp đồng giữa router, gốc lắp ráp và module bangtin, nên chưa làm.
- **Thời gian chạy bài quét:** đây là một tệp chạy tuần tự trong bước song song của `npm test`. Đo được khoảng 16 giây khi máy rảnh (người kiểm đo) và khoảng 56 giây khi máy bận.
- **Số route trong bài quét:** mỗi lần thêm route phải tăng tay con số trong bài quét, cùng lúc với SNAPSHOT của `src/route-access.test.ts`.
- **Hai phán quyết suy diễn từ Đ3, chưa có chữ trong ADR:** luật một máy / nhiều máy theo quyền thật; báo đẩy chọn máy theo quyền thật của tài khoản nhận.

## Chờ chủ quyết trước hoặc lúc nhập (bổ sung lúc đóng phiên 2026-11-07)
- **Số ADR-0180 trùng:** nhánh `claude/adr-0180-xe-thieu-giay-to` cũng dùng số 0180 (0181–0183 đã dùng nơi khác). Chủ chọn bên nào giữ 0180, bên kia đổi số.
- **Dấu vai trong nhật ký tính theo TÀI KHOẢN, không theo phiên** (cửa sổ 60 phút + 10 giây đệm): đóng vai ở máy A, thao tác ở máy B trong cùng cửa sổ vẫn có dấu. ADR viết «bối cảnh yêu cầu». Chủ nhận giới hạn bằng điều sửa đổi ADR, hoặc đổi cách làm.
- **Module audit đọc thẳng `aut_session`:** lệch kiến trúc chưa duyệt (ghi ở `docs/SYSTEM-DESIGN.md` §16). Chủ duyệt tiền tố view `v_aut_*` hoặc ngoại lệ có hạn.
- **Trang Nhật ký có hiện dấu vai không:** chưa làm, cột đã có.
- **Chữ giao diện:** chủ chọn «Xem như vai khác» / «Thoát vai», bảng từ (ADR-0130) đã bỏ chữ «vai» đứng một mình nên mã dùng «Xem như vai trò khác» / «Đang xem như vai trò X» / «Thoát». Chủ xác nhận hoặc đổi ba chuỗi ở bảng tham chiếu.
- **Trần gói Đơn hàng nâng 105804 → 106223 (+419 byte):** đuôi « · Đang bảo trì» ở thanh báo tốn 41 byte. Muốn giữ mức cũ thì bỏ đuôi đó.
- **Sổ riêng** (`bil_*`, `fbk_*`…) không mang dấu vai; chỉ `audit_log` mang.
- **Chưa ai xem bằng mắt:** thanh báo có dính ở đầu trang máy tính và Trang chủ iPhone (vùng an toàn) không.
- **Dòng đồng tác giả** của hai lần lưu b5fdbaac, 09ee8837 ghi «Opus 5.5», không viết lại lịch sử.
- **Số migration 0145:** đã kiểm lúc nhập, main có 0144 và 0146, không trùng.

## Ruling của người điều phối
- Quyền hiệu lực của `SALES_MANAGER` khi đóng vai = [SALES_MANAGER, SALES], vì tài khoản thật luôn mang cả hai. Sai thì chỉ lệch chữ «đúng bộ quyền của mã đó» trong ADR; đảo ngược được.
- Tên chữ: chốt «Xem như vai trò khác», «Đang xem như vai trò X», «Thoát» (lý do ở mục trên).
- Chi tiết cơ chế nhật ký (Task 5) ghi vào đặc tả và sổ này, không sửa ADR-0180 đã duyệt (N9).
- Bảng rà nơi đọc quyền để ở sổ này (có theo dõi trong git), không sửa ADR (N9).
- Trần dung lượng gói Đơn hàng: thử bớt byte trước, không được mới nâng; nâng đến 106223 (+419) và ghi lý do.
- Báo của người kiểm Task 8 «§16 không có mục audit→aut» là báo nhầm: dòng có ở `docs/SYSTEM-DESIGN.md` §16, không làm gì.
- Đồng tác giả «Opus 5.5» ở hai lần lưu: giữ nguyên, không viết lại lịch sử.
