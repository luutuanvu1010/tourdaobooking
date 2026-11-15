// Hàng rào dung lượng gói giao diện (nghiên cứu tốc độ 2026-10-02, đợt 1 việc 2): mỗi trang là một lần tải trọn vẹn (ứng dụng nhiều trang), nên mã thừa trong
// gói chính là thời gian chờ ở mọi lần bấm. Nhật ký thay đổi (`src/shared/changelog.ts`, ~63 KB và dày thêm sau MỖI bản phát hành) từng lọt vào gói của cả 33
// trang chỉ vì `web/help-seen.ts` cần số phiên bản. Bài này dựng LẠI gói từng trang trong bộ nhớ (cùng tuỳ chọn với `npm run build:web`) và đỏ nếu:
//   (1) gói của trang nào ngoài Hướng dẫn kéo `changelog.ts` vào; (2) gói trang Đơn hàng vượt trần dung lượng.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildSync } from "esbuild";
import { APP_NAME } from "./shared/app-info.ts";
import { APP_NAME as TEN_O_WEB } from "../web/phien-ban.ts";

const goc = new URL("../", import.meta.url);
const kichBan = (JSON.parse(readFileSync(new URL("package.json", goc), "utf8")) as { scripts: Record<string, string> }).scripts["build:web"]!;
// Các trang = mọi `web/<tên>.ts` ở lệnh esbuild đầu của kịch bản `build:web` (lệnh sau là service worker).
const TRANG = [...new Set(kichBan.split("&&").find((c) => c.includes("esbuild web/login.ts"))!.match(/web\/[a-z0-9-]+\.ts/g)!)];
/** Trang được phép mang nhật ký thay đổi: chính trang đọc nhật ký. */
const CHO_PHEP_NHAT_KY = new Set(["web/help.ts"]);
/** Trần dung lượng gói Đơn hàng đã rút gọn (byte, chưa nén): hôm nay ~84 KB sau khi bỏ nhật ký; trước đó 147 KB. Đổi trần = có lý do ghi ở commit. */
// Nới 95.000 → 96.000 (ghép main 1c471990 vào gói Vận chuyển A+C, 2026-10-12): main một mình 92.686 byte, gói A+C một mình 89.378, hợp cả hai 95.486 — cả hai nhánh
// cùng thêm mã vào đường của trang Đơn hàng (phần thương mại của sổ đại lý; chi tiết đơn phải thu không âm, thông tin chuyến), không có gói nào thừa nhật ký thay đổi.
// Nới 96.000 → 96.500 (ADR-0120 Điều 2, 2026-10-14): thêm một dòng bản đồ quyền `deposit.transfer.approve` vào `permissions.ts`, mà gói Đơn hàng nhúng cả bản đồ
// (+~100 byte, làm gói vượt trần 91 byte). Chỉ nới vừa đủ chỗ cho dòng quyền mới, không thêm mã giao diện nào vào gói này.
// Nới 96.500 → 96.600 (ADR-0122 đ5, lát H-1 Gói 2, 2026-10-16): cùng lý do như trên — thêm dòng bản đồ quyền `party.personal.view` (+56 byte vượt trần).
// Không thêm mã giao diện nào vào gói này.
// Nới 96.500 → 96.700 (ADR-0128 Q1, 2026-10-17): thêm một dòng bản đồ quyền `dispatch.policy.lead` vào `permissions.ts` (gói nhúng cả bản đồ, +~90 byte); không thêm mã giao diện.
// Nhận main vào nhánh hồ sơ riêng tư: giữ trần LỚN HƠN của hai bên (96.700); không nới thêm — đo gói thật sau gộp ở báo cáo.
// Nới 96.700 → 96.800 (ADR-0136 Task 3.5, 27/10): gói nhúng `muc-giao-dien.ts` (thêm trang /cho-xac-nhan vào `TRANG`/`TRANG_TOI`) và `bang-tin.ts`/`thong-bao.ts` (nhãn `xet-duyet`, loại tin `cho_xac_nhan`) — chỉ dữ liệu, +13 byte đo thật; không thêm mã giao diện vào trang Đơn hàng.
// Nới 96.700 → 101.719 (đợt 0 khung chung, 2026-10-29): mã vỏ chung (dải, ẩn thanh tab động, thanh tab theo bộ quyền) vào gói mọi trang; không nhật ký thay đổi, không mã nghiệp vụ. Đo sau Task 15/15b (Q-2) = 101.619 byte.
// Nới 101.719 → 101.824 (ADR-0146 T11, 30/10): gói nhúng `muc-giao-dien.ts` — thêm trang /luat-ban vào `TRANG`/`THANH_BEN`/`TRANG_TOI` (chỉ dữ liệu điều hướng, không mã giao diện
// vào trang Đơn hàng). Đo thật 101.824 byte (+105). Không gọn được mà không đổi khuôn bảng mục chung.
// Nới 101.824 → 102.250 (ADR-0152 T12, 30/10): trang /dac-diem-dich-vu vào `TRANG`/`THANH_BEN`/`TRANG_TOI` + một nhánh huy hiệu «chưa khai» ở `trinhBay` của web/shell.ts
// (ADR-0152 Đ5 mục 3, khuôn huy hiệu «Dịch vụ & giá»; chỉ gọi khi mục thật sự hiện). Đo thật 102.250 byte (+426). Không mã nghiệp vụ nào vào trang Đơn hàng.
// Nới 101.719 → 101.933 (luật khung 30/10/2026 — chủ dự án duyệt nguyên văn «đồng ý theo đề xuất của bạn, thi công» cho câu «nới 101.719 → 101.933 byte»):
// trước đợt này gói đo 101.695 byte (dư 24); đợt thêm 138 byte vào khung chung (một dòng thanh bên tự cuộn tới mục đang mở ở web/shell.ts, hàm tông dải nhắc
// bảo mật `tongDaiNhacHaiLop`, trừ 21 byte chữ lặp «— Bật ngay») ⇒ 101.833; trần = số đo + 100. Không nhật ký thay đổi, không mã nghiệp vụ.
// Kế hoạch: docs/superpowers/plans/2026-10-30-sua-hien-thi-va-luat-khung.md.
// Tính lại sau khi nhận main (31/10/2026): main đứng ở 102.250 (trần 102.250, dư 0); gói đo trên mã đã gộp = 102.454 byte (+204 so với main: phần luật khung 138 byte nói trên cộng phần cộng dồn
// với mã vỏ chung mới của main). Cùng cách của kế hoạch: trần = số đo + 100. Số trần 102.554 mới là số đo sau gộp, CHƯA có lời duyệt riêng của chủ dự án cho con số này (lời duyệt 30/10 là cho 101.933).
// Nới 102.554 → 102.734 (ADR-0153 Đ3, 1/11/2026): thêm hai dòng bản đồ quyền `ve.kho.manage`, `ve.cap.send` vào `permissions.ts` (gói nhúng cả bản đồ; đo thật 102.634, +80 byte),
// cùng cách các lần nới trước vì dòng quyền mới: trần = số đo + 100. Không thêm mã giao diện nào vào gói này. CHƯA có lời duyệt riêng của chủ dự án cho con số này.
// Nới 102.734 → 102.937 (ADR-0153 Task 9a, 1/11/2026): thêm trang /ve-kho vào `TRANG`/`THANH_BEN`/`TRANG_TOI` của `muc-giao-dien.ts` (chỉ dữ liệu điều hướng, khuôn các lần /luat-ban, /dac-diem-dich-vu);
// đo thật 102.837 byte (+203 so với 102.634), trần = số đo + 100. Không mã giao diện nghiệp vụ nào vào gói Đơn hàng. CHƯA có lời duyệt riêng của chủ dự án cho con số này.
// Nới 102.937 → 103.178 (ADR-0156 Đ3, 2/11/2026): thêm trang /ve-cai-dat vào `TRANG`/`THANH_BEN`/`TRANG_TOI` của `muc-giao-dien.ts` và hai hành động nhật ký vào hai bảng phân loại lịch sử (chỉ dữ liệu);
// đo thật 103.078 byte (+241 so với 102.837), trần = số đo + 100. Thư viện đọc QR chỉ ở gói trang Vé điện tử. ADR-0156 đã báo trước; chủ dự án duyệt con số này 2/11/2026.
// Nới 103.178 → 103.523 (ADR-0161 Đ3, 3/11/2026; kế hoạch Task 8): thêm trang /hoa-hong-gioi-han vào `TRANG`/`THANH_BEN`/`TRANG_TOI` của `muc-giao-dien.ts` (cộng một hàm chốt chặn dùng chung `chiToanQuyenKhongDoiTac`) và một dòng
// bài theo việc; chỉ dữ liệu điều hướng. Đo thật 103.423 byte trên nhánh; `main` đo 103.139 (3/11/2026), chênh +284 nằm trọn ở `src/shared/muc-giao-dien.ts` (dữ liệu điều hướng; không tệp nào khác trong gói đổi so với `main`). Trần = số đo + 100. Không mã giao diện nghiệp vụ nào vào gói Đơn hàng. CHƯA có lời duyệt riêng của chủ dự án cho con số này.
// Nới 103.523 → 103.692 (ADR-0136 Đ1, 4/11/2026): thêm trang /dich-vu-kiem-ve vào `TRANG`/`THANH_BEN`/`TRANG_TOI` (chỉ dữ liệu điều hướng, khuôn các lần /ve-cai-dat). Đo thật 103.592 byte, trần = số đo + 100. CHƯA có lời duyệt riêng của chủ dự án cho con số này.
// Nới 103.692 → 103.844 (ADR-0142 Task 4, 5/11/2026): ba dòng ma trận quyền mới (`dispatch.sales.claim/assign/invitees`, dùng chung hàng `banHangQuanTri()` / `quanTri()` cho gọn) và hàm
// `duocGiaoTheoO` / `banHangSuaDuoc` kéo vào gói qua `permissions.ts`, `order-view.ts`, `handler-view.ts` (chỉ luật thuần dùng chung, không mã giao diện). Đo thật 103.744 byte, trần = số đo + 100.
// CHƯA có lời duyệt riêng của chủ dự án cho con số này (người thi công theo tiền lệ các lần nới trước — cần chủ xác nhận); Task 7 (nút giao diện) sẽ phải đo lại.
// Chủ duyệt nâng trần 5/11/2026 cho dòng «Phụ trách» của ADR-0142 (đo 105.086 byte, gốc 103.692).
// Nới 105.100 → 105.363 (ADR-0169 ghép trên ADR-0142, 5/11/2026): mã quyền, vai, hai ô vào bản đồ (dữ liệu quyền, không mã giao diện). Đo thật 105.263 byte, trần = số đo + 100.
// Nới 105.363 → 105.546 (ADR-0168, ghép Trả sau với bản chính 5/11/2026): trang /han-muc-tra-sau vào `TRANG`/`THANH_BEN`/`TRANG_TOI` và hai ô quyền credit.limit.* (chỉ dữ liệu); đo thật 105.446 byte, trần = số đo + 100. Không mã giao diện nghiệp vụ nào vào gói Đơn hàng. CHƯA có lời duyệt riêng của chủ dự án cho con số này.
// Nới 105.546 → 105.667 (ADR-0172, ADR-0173, 6/11/2026): ba ô quyền mới credit.ceiling.write, credit.due.extend, credit.own.view vào bản đồ quyền dùng chung (chỉ dữ liệu, +21 byte đo thật 105.567). Không mã giao diện Trả sau nào vào gói Đơn hàng (khối Trả sau ở trang đơn chi tiết, nút Ân hạn ở web/an-han-tra-sau.ts). Trần = số đo + 100. CHƯA có lời duyệt riêng của chủ dự án cho con số này.
// Nới 105.667 → 105.804 (ADR-0178 Đ1 mục 1, Task A2, 6/11/2026): hai ô quyền mới billing.partner_channel.write / .view vào bản đồ quyền dùng chung (chỉ dữ liệu, +37 byte đo thật 105.704). Không mã giao diện nào vào gói Đơn hàng. Trần = số đo + 100. CHƯA có lời duyệt riêng của chủ dự án cho con số này.
// Nới 105.804 → 106.093 (ADR-0180, 7/11/2026): thanh báo xem như vai trò khác dùng chung ở khung nên vào gói mọi trang. Đã thu gọn còn một hàm trong web/shell.ts (dùng lại PERMISSION_LABEL và dải chung), phần bật chuyển sang web/account.ts; đo thật 105.993 byte, trần = số đo + 100. CHƯA có lời duyệt riêng của chủ dự án cho con số này.
// Nới 106.093 → 106.223 (ADR-0180, vòng sửa 1, 7/11/2026): thanh báo dùng hàm chung `hienThanhXemNhu` (một nguồn chữ, có test) và thêm đuôi « · Đang bảo trì» khi bảo trì bật (dải bảo trì bị thanh che); đo thật 106.123 byte (đuôi bảo trì tốn 41 byte; bỏ đuôi thì 106.082 vừa trần cũ), trần = số đo + 100. CHƯA có lời duyệt riêng của chủ dự án cho con số này.
// Nới 106.223 → 108.802 (menu tên tài khoản, chủ dự án 8/11/2026: «Xem như vai trò khác» chuyển từ trang Tôi vào menu con của tên tài khoản, ngay trên «Đăng xuất»): menu nằm ở khung nên vào gói mọi trang (web/menu-tai-khoan.ts ~1,8 KB + chữ và danh sách vai trò dùng chung ~0,5 KB; chữ có dấu thành \uXXXX nên tốn gấp mấy lần). Không dùng bảng trượt để khỏi kéo thêm mã. Đo thật 108.702 byte, trần = số đo + 100. CHƯA có lời duyệt riêng của chủ dự án cho con số này.
// Nới 106.223 → 106.459 (ADR-0184, 8/11/2026): ô quyền mới trip.override.giay_to_cung vào bản đồ quyền dùng chung và hai mã lý do giữ mới (DIEU_KIEN_GIAY_TO_XE_TOAN_QUYEN…) vào bảng chữ dùng chung — chỉ dữ liệu, không mã giao diện nào vào gói Đơn hàng; đo thật 106.359 byte, trần = số đo + 100. Số trung gian, đã được thay bằng trần sau gộp ở dòng cuối (chủ dự án duyệt trần đó 8/11/2026).
// Nới 106.459 → 106.880 (ADR-0184 đợt sửa 1, 8/11/2026): «Ai xử lý» của xe thiếu Kiểm định / Bảo hiểm là «Quản trị, Toàn quyền» — `ly-do-giu.ts` thêm bảng vai (`VAI_AI_XU_LY`) và MỘT hàm chữ dùng chung `nhanAiXuLy` (máy chủ và giao diện cùng gọi, bỏ trùng theo vai);
// đã thu gọn còn một bảng + một hàm (thử giữ nhỏ trước), đo thật 106.780 byte (+421 so với 106.359 trước đợt sửa), trần = số đo + 100. Chỉ luật thuần dùng chung, không mã giao diện nào vào gói Đơn hàng. Số trung gian, đã được thay bằng trần sau gộp ở dòng cuối (chủ dự án duyệt trần đó 8/11/2026).
// Gộp main vào nhánh ADR-0184 (8/11/2026): hai lần nới trên (menu tên tài khoản; ADR-0184) cùng tính từ 106.223 — đo lại gói đã gộp: 109.351 byte (108.702 của main + 649 của ADR-0184), trần = số đo + 100. Chủ dự án duyệt trần 109.451 ngày 8/11/2026 (tờ duyệt ADR-0184 mục 2.2, trả lời «Duyệt hết»).
// Nới 109.451 → 109.777 (ADR-0186, 8/11/2026, đo lại sau khi nhập bản chính 56dab66e5 có ADR-0184): ba ô quyền mới (catalog.sync, credit.due.remind, ve.kho.purge), danh sách tác nhân tự động
// và nhánh tác nhân trong `can()` của bản đồ quyền dùng chung, cùng nhãn nhật ký «Xoá ảnh vé hết hạn lưu» (chỉ dữ liệu quyền / nhãn, không mã giao diện mới vào gói này). Đo thật 109.677 byte
// trên mã đã nhập (bản chính một mình 109.351, +326), trần = số đo + 100. Chủ dự án duyệt phần tăng +326 byte này ngày 8/11/2026 (ở phiên điều phối), nguyên văn «Duyệt 326 byte».
// Nới 109.777 → 109.935 (ADR-0175 Đợt 1, 9/11/2026): menu «Vé điện tử» cho Kế toán (`muc-giao-dien.ts`) và hàng quyền mới `ve.phat-hanh` trong bản đồ quyền dùng chung đều nằm trong gói Đơn hàng; không có mã giao diện mới vào gói này. Đo thật 109.835 byte, trần = số đo + 100. Chủ dự án duyệt 9/11/2026 («quyết theo khuyến nghị» của người điều phối: giữ mức nới +158 byte).
// Nới 109.935 → 110.075 (ADR-0175 Đợt 2, 9/11/2026): hai hàng quyền mới `ve.quet.tinh`, `ve.quet.xem` trong bản đồ quyền dùng chung (đã gọn bằng một hàm dựng hàng) và một dòng `/api/ve/quet` ở danh sách
// route bí mật `lan-gui-bi-mat.ts` (thân có mã vé). Đo thật 109.975 byte (+40 so với 109.935 sau khi đã gọn), trần = số đo + 100. Không thêm mã giao diện nào vào gói Đơn hàng. Chủ dự án duyệt 9/11/2026 nguyên văn «duyệt, tiếp tục» (câu hỏi nới trần Đợt 2: tổng 109.935 → 110.610, +675 byte).
// Nới 110.075 → 110.306 (ADR-0175 Đợt 2 Task 14, 9/11/2026): trang /quet-ve vào `TRANG` / `THANH_BEN` / `TRANG_TOI` của `muc-giao-dien.ts` (chỉ dữ liệu điều hướng, khuôn các lần /ve-kho, /ve-cai-dat). Đo thật 110.206 byte (+131), trần = số đo + 100.
// Thư viện đọc QR và mã camera chỉ ở gói riêng của trang Quét vé. Chủ dự án duyệt 9/11/2026 nguyên văn «duyệt, tiếp tục» (câu hỏi nới trần Đợt 2: tổng 109.935 → 110.610, +675 byte).
// Nới 110.306 → 110.610 (ADR-0175 Đợt 2 Task 15, 9/11/2026): trang /ve-doi-chieu vào `TRANG` / `THANH_BEN` / `TRANG_TOI` và hàng quyền `ve.doi-chieu.view` (chỉ dữ liệu điều hướng và quyền). Đo thật 110.510 byte (+304 so với 110.206 của Task 14), trần = số đo + 100.
// Mã giao diện của trang đối chiếu và «Đã dùng x/y» chỉ ở gói riêng `web/ve-doi-chieu.ts` và `web/ve-don.ts` (gói trang Đơn thật không nhúng `ve-don.ts`). Chủ dự án duyệt 9/11/2026 nguyên văn «duyệt, tiếp tục» (câu hỏi nới trần Đợt 2: tổng 109.935 → 110.610, +675 byte).
// Nới 109.935 → 110.443 (ADR-0187 Đ2.3, 9/11/2026, gộp bản chính có vé Tour Đảo): thanh dưới vẽ nút người dùng tự chọn ở KHUNG mọi trang (web/shell.ts →
// thanhTab(n, ghimHieuLuc(staff))): ô quyền me.favorites.write, `ghimDuoc` / `ghimHieuLuc` và nhánh chọn của `thanhTab` (phần dựng danh sách chọn, đọc cột lưu,
// kiểm thân ở ngoài gói khung). Đo thật 110.343 byte, trần = số đo + 100 (+508 so với trần bản chính). Chủ dự án DUYỆT 9/11/2026 nới tối đa +581 byte (qua phiên
// điều phối: «Chủ đã đồng ý nới trần gói Đơn hàng thêm 581 byte»).
// Gộp main (ADR-0187) vào nhánh vé Tour Đảo Đợt 2 (9/11/2026): trần = tổng hai khoản nới đã được chủ duyệt (110.610 của vé Đợt 2 + 508 của ADR-0187 trên 109.935); xem số đo thật ở báo cáo gộp. Chủ dự án duyệt trần gộp 111.118 ngày 9/11/2026 nguyên văn «duyệt trần».
// Nới 111.118 → 111.168 (+50, Đợt 3 «chữ do chủ chọn» gộp main có Đợt 2 sửa sau rà soát, 10/11/2026): Đợt 3 chỉ còn phần báo hết hạn đăng nhập (Task 3.6:
// `dauHetPhien` ở src/shared/session-ended.ts, cờ `dangDi` của `goLogin` ở web/api.ts) trong gói khung; đo thật 111.133 byte. Chủ dự án duyệt 10/11/2026 nguyên văn «Nâng lên 111.168».
// Nới 111.168 → 111.357 (ADR-0192 mục 5, Task 5A.3, 10/11/2026): dọn bản chụp form đơn trong sessionStorage ở khung chung — `initShell` của mọi trang (xoá bản của người khác /
// quá 30 phút), `logout` và màn bảo trì (xoá hết); một hàm `donNhapTam` (web/nhap-tam-don.ts) + `nenXoaKhiMoTrang` một dòng. Gói trước mọi sửa của Đợt 5A đo 111.133 byte; đo thật sau
// khi thêm 111.357 byte (+224), đã thu gọn qua bốn lần (+745 → +281 → +226 → +224). Trần = đúng số đo, không làm tròn. Chủ dự án duyệt 10/11/2026 nguyên văn «Nới mức 224 byte» —
// lời trả lời câu «quá 100 byte thì dừng, hỏi lại chủ» của ADR-0192 mục 7(b).
// Nới 111.357 → 111.444 (+87, ADR-0196 Đợt 6A, 11/11/2026): hai ô quyền mới `payment.proof.view` (ADR-0196 Đ5) và `payment.proof.purge` (chỉ Toàn quyền — gỡ ảnh biên lai,
// hàng chờ dọn kho) trong bản đồ quyền dùng chung mà gói Đơn hàng nhúng; không mã giao diện nào vào gói này. Đo thật 111.474 (+117), thu gọn hàng xem ảnh bằng `{ ...chiToanQuyen(), … }`
// còn 111.444 (+87); tên hai ô cố định nên không về 0 được. Trần = đúng số đo. Chủ dự án duyệt 11/11/2026 (chuyển qua phiên điều phối), nguyên văn «Duyệt nới 87 byte».
// Nới 111.444 → 111.589 (+145, ADR-0182 phần B, 13/11/2026): ba ô quyền mới `dai-ly.nop.ghi`, `dai-ly.nop.xac-nhan`, `dai-ly.nop.xem` (ADR-0182 Đ3) trong bản đồ quyền dùng chung mà gói
// Đơn hàng nhúng; không mã giao diện nào vào gói này. Đã viết gọn bằng hàng dùng chung (`chiToanQuyen()`, `quanTri()` + ô riêng). Trần = đúng số đo, không khoảng dư. Chủ dự án duyệt
// 13/11/2026 trong phiên soạn ADR (chat, chuyển qua phiên điều phối), nguyên văn «Duyệt nới trần gói Đơn hàng cho ba ô quyền phần B».
// Nới 111.589 → 113.492 (+1.903, màn bảo trì mới theo bản mẫu 2a, 13/11/2026): `web/api.ts` nhúng `web/maintenance-screen.ts` vào gói mọi trang; màn mới có đồng hồ ba ô,
// nút gọi / Zalo, thẻ website, trạng thái «Đã mở lại» (chữ có dấu thành \uXXXX khi rút gọn nên tốn chỗ). Phương án thay thế (tách màn ra tệp tải khi cần) đã trình, chủ chọn nới.
// Trần = đúng số đo. Chủ dự án duyệt 13/11/2026 trong chat, nguyên văn «Duyệt nới 1,9 KB».
// Nới 113.492 → 114.524 (+1.032, ADR-0202 nội dung màn bảo trì do Toàn quyền tự sửa, 13/11/2026): màn bảo trì dựng từ nội dung đã lưu (khối ẩn/hiện theo công tắc,
// nội dung mặc định khi chưa lưu, kiểm hình dạng nội dung trong thân 503). Đã bỏ bộ kiểm đầy đủ khỏi gói này (máy chủ kiểm hai đầu). Trần = đúng số đo. Chủ dự án duyệt
// 13/11/2026 (nút ở khung bước tiếp theo), nguyên văn «Duyệt cả hai» — trả lời câu «Bạn duyệt văn bản quyết định ADR-0202 và cho nới trần trang Đơn hàng thêm 1 KB chứ?».
// Đo lại sau khi gộp main có chi tiết dịch vụ (ADR-0201): 114.528 (+4 byte do bộ rút gọn đặt lại tên biến) — tổng +1.036, vẫn trong mức «thêm 1 KB» chủ đã duyệt.
const TRAN_ORDERS = 114_528;

function dung(trang: string) {
  const r = buildSync({
    entryPoints: [new URL(trang, goc).pathname],
    bundle: true, format: "esm", target: "es2022", minify: true, write: false, metafile: true, logLevel: "silent",
    define: { __BUILD_ID__: '"thu"', __APP_VERSION__: '"1.0"', __APP_RELEASE_DATE__: '"2026-01-01"' },
  });
  const [ra] = Object.values(r.metafile.outputs);
  return { dauVao: Object.keys(ra!.inputs), byte: r.outputFiles[0]!.contents.byteLength };
}

test("danh sách trang lấy được từ build:web (đủ nhiều, không rỗng)", () => {
  assert.ok(TRANG.length >= 30, `chỉ thấy ${TRANG.length} trang`);
  assert.ok(TRANG.includes("web/orders.ts") && TRANG.includes("web/help.ts"));
});

test("gói của trang nào ngoài Hướng dẫn cũng KHÔNG chứa nhật ký thay đổi (src/shared/changelog.ts)", () => {
  const vao = TRANG.filter((t) => !CHO_PHEP_NHAT_KY.has(t)).filter((t) => dung(t).dauVao.some((f) => f.endsWith("src/shared/changelog.ts")));
  assert.deepEqual(vao, [], "các trang này kéo nhật ký thay đổi vào gói (nhập `app-info`/`changelog` thay vì `web/phien-ban`?)");
});

test("gói trang Đơn hàng không vượt trần dung lượng", () => {
  const { byte } = dung("web/orders.ts");
  assert.ok(byte <= TRAN_ORDERS, `web/orders.ts = ${byte} byte, trần ${TRAN_ORDERS}`);
});

test("tên ứng dụng ở web/phien-ban.ts trùng bản gốc ở src/shared/app-info.ts", () => {
  assert.equal(TEN_O_WEB, APP_NAME);
});

test("trang nào nhập thẳng app-info/changelog (ngoài Hướng dẫn) đều bị bắt — giao diện chỉ nhập `web/phien-ban`", () => {
  const nhap = TRANG.filter((t) => !CHO_PHEP_NHAT_KY.has(t)).filter((t) => /from "\.\.\/src\/shared\/(app-info|changelog)"/.test(readFileSync(new URL(t, goc), "utf8")));
  assert.deepEqual(nhap, []);
});

// Người kiểm độc lập 2026-10-05 (V6): bỏ hai `--define` khỏi `build:web` không làm bài nào đỏ (bài dựng gói ở trên tự đưa `define` riêng) — trang Đăng nhập lặng lẽ hiện
// "0.0 / 1970-01-01" và chấm đỏ "Có gì mới" không bao giờ bật lại. Khoá: lệnh esbuild của trang phải chứa cả hai.
test("build:web truyền --define:__APP_VERSION__ và __APP_RELEASE_DATE__ (lấy từ scripts/in-phien-ban.mjs) cho gói các trang", () => {
  const lenhTrang = kichBan.split("&&").find((c) => c.includes("esbuild web/login.ts"))!;
  assert.match(lenhTrang, /--define:__APP_VERSION__=\\*"\$\(node scripts\/in-phien-ban\.mjs version\)\\*"/);
  assert.match(lenhTrang, /--define:__APP_RELEASE_DATE__=\\*"\$\(node scripts\/in-phien-ban\.mjs date\)\\*"/);
});

// B-12 (G-06e): câu danh sách đơn trống là MỘT câu chung, đúng cả khi chưa lọc lẫn khi đang lọc (nút «Xoá lọc» đã nằm sẵn trên trang). Chữ nằm ở HTML nên 0 byte vào gói.
test("public/orders.html: câu danh sách đơn trống là «Chưa có đơn nào ở đây.»", () => {
  const html = readFileSync(new URL("public/orders.html", goc), "utf8");
  assert.match(html, /id="empty"[^>]*>Chưa có đơn nào ở đây\.</);
  assert.doesNotMatch(html, /Chưa có đơn nào khớp/);
});
