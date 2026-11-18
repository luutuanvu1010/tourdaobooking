// Module dang-ky — phiếu đăng ký đối tác tự đăng ký (ADR-0206 Đ2; đợt 1 Task 1). Chủ duy nhất của bảng dk_*. Chưa có route (routes: []): route, lệnh gửi, xác minh, duyệt thêm ở các Task sau.
// Phụ thuộc (khai ở ALLOWED_EDGES): parties (hồ sơ, tệp), staff (tài khoản), auth (Turnstile, bộ đếm chống dò), audit (nhật ký lệnh của người trong công ty và tác nhân). Câu của pricing do gốc lắp ráp ghép vào lô duyệt, không có cạnh.
import { can, tacNhan } from "../../shared/permissions";
import { route, type AppModule } from "../../shared/router";
import { chinhSachHienHanh } from "./repository";
import { guiPhieu, luuNhapPhieu, rutPhieu, xemPhieuCuaToi } from "./phieu-route";
import { taiTepPhieu } from "./tep-route";
import { CAM_CHINH_SACH, doiChinhSach, xemChinhSach } from "./chinh-sach-route";
import { datPinKichHoat } from "./kich-hoat-route";
import { donPhieuDangKy } from "./don-phieu";
import { cauHinhDangKy, xacNhanMa, xinMa } from "./xin-ma-route";
import { CAM_DUYET, duyetPhieu, guiLaiLoiMoi, traVeXacMinh, tuChoiDuyet, xemDeDuyet } from "./duyet-route";
import { guiLaiThu } from "./thu-bao";
import { CAM, ketLuanMuc, moTep, tuChoiPhieu, xacMinhDat, xemHangCho, xemPhieu, xemSo, yeuCauBoSung } from "./xac-minh-route";

export { cauLyDoChoNguoiDangKy } from "../../shared/dang-ky-hien-thi";
export { chuaKichHoat, lyDoCuaPhieu, taiKhoanChuaKichHoat } from "./repository";
// Câu CHƯA CHẠY của dang-ky cho LÔ DUYỆT (ADR-0207 Đ5; đợt 1 Task 8): gốc lắp ráp ghép với câu của parties, staff (và pricing) — câu 1 chốt, câu 10 phiếu + lịch sử + ẩn danh bản khai.
export { cauAnDanhBanKhai, cauAnDanhBanKhaiToChuc, cauChotDuyet, cauDuyetPhieu, suKienNhanVienStatement as suKienDuyetStatement } from "./repository";
export { TRANG_THAI, TRANG_THAI_KET_THUC, chuyenHopLe, daKetThuc, type TrangThai } from "./rules";

export { donPhieuDangKy, type KetQuaDonPhieu } from "./don-phieu";

/** Tác nhân tự động dọn phiếu đăng ký (ADR-0208 Đ8, khuôn ADR-0186 Đ1): chỉ Cron dùng; giữ đúng ô `registration.agent.purge`, không có nút hay route nào cho người. */
const DON_PHIEU_DANG_KY = tacNhan("DON_PHIEU_DANG_KY");
/** Cron ở gốc lắp ráp: một lượt dọn phiếu dưới tác nhân DON_PHIEU_DANG_KY. KHÔNG BAO GIỜ NÉM (lỗi ở đây không kéo theo việc định kỳ khác).
 *  Trả tên lỗi khi hỏng (gốc lắp ráp báo thư lỗi việc định giờ — Đợt 2 sau kiểm toán), `null` khi thành. */
export async function donPhieuDangKyDinhGio(env: Env): Promise<string | null> {
  try {
    await donPhieuDangKy(env, DON_PHIEU_DANG_KY, new Date());
    return null;
  } catch (e) {
    const loi = e instanceof Error ? e.name : "unknown";
    console.error(JSON.stringify({ level: "error", event: "dk_don_phieu_loi", viec: "luot", loi }));
    return loi;
  }
}

/** Chính sách đăng ký hiệu lực tại `at`; null ⇒ coi là đóng đăng ký. */
export const chinhSachDangKy = chinhSachHienHanh;

export const dangKyModule: AppModule = {
  name: "dang-ky",
  routes: [
    // Cấu hình, xin mã, nhập mã (ADR-0206 Đ6; đợt 1 Task 3). Công khai: người đăng ký chưa có tài khoản; chỉ route nhập mã CẤP cookie đăng ký, không route nào ở đây đọc nó.
    route("GET", "/api/dang-ky/cau-hinh", "public", async (ctx) => {
      return cauHinhDangKy(ctx);
    }),
    route("POST", "/api/dang-ky/ma", "public", async (ctx) => {
      return xinMa(ctx);
    }),
    route("POST", "/api/dang-ky/xac-nhan", "public", async (ctx) => {
      return xacNhanMa(ctx);
    }),
    // Phiếu của CHÍNH người đăng ký (ADR-0206 Đ6; đợt 1 Task 4): xem, lưu nháp, gửi, rút. Công khai; cổng là cookie đăng ký kiểm trong thân (phieu-route.ts). Phiếu lấy từ cookie, không từ đường dẫn.
    // Khai các đường chữ (`/phieu/gui`, `/phieu/rut`) TRƯỚC các đường `/phieu/:id…` của người trong công ty.
    route("GET", "/api/dang-ky/phieu", "public", async (ctx) => {
      return xemPhieuCuaToi(ctx);
    }),
    route("PUT", "/api/dang-ky/phieu", "public", async (ctx) => {
      return luuNhapPhieu(ctx);
    }),
    route("POST", "/api/dang-ky/phieu/gui", "public", async (ctx) => {
      return guiPhieu(ctx);
    }),
    route("POST", "/api/dang-ky/phieu/rut", "public", async (ctx) => {
      return rutPhieu(ctx);
    }),
    // KÍCH HOẠT (ADR-0207 Đ7; đợt 1 Task 9): người được duyệt tự đặt PIN. Công khai; cổng là cookie đăng ký + mã email MỚI kiểm trong thân (kich-hoat-route.ts). Không cấp td_session.
    route("POST", "/api/dang-ky/phieu/dat-pin", "public", async (ctx) => {
      return datPinKichHoat(ctx);
    }),
    // Tải một tệp vào ô của phiếu (ADR-0208 Đ2). Công khai: người đăng ký chưa có tài khoản; cổng là cookie đăng ký kiểm trong thân (ADR-0206 Đ7).
    route("POST", "/api/dang-ky/phieu/tep", "public", async (ctx) => {
      return taiTepPhieu(ctx);
    }),
    // Chỗ mở, đóng đăng ký của Toàn quyền (ADR-0206 Đ9; đợt 1 Task 12 vòng sửa 1). Cổng `accounts`; ô `registration.policy.write` (chỉ Toàn quyền). Lệnh đổi chỉ thêm một dòng dk_policy.
    route("GET", "/api/dang-ky/chinh-sach", "accounts", async (ctx) => {
      if (!can(ctx.staff, "registration.policy.write")) return CAM_CHINH_SACH();
      return xemChinhSach(ctx);
    }),
    route("POST", "/api/dang-ky/chinh-sach", "accounts", async (ctx) => {
      if (!can(ctx.staff, "registration.policy.write")) return CAM_CHINH_SACH();
      return doiChinhSach(ctx);
    }),
    // Hàng chờ (ADR-0219 Đ3): cổng `staff` vì người xác minh (Quản lý bán hàng, cổng office) và người duyệt (Nhân sự, cổng accounts) không chung cổng nào; chặn bằng ô
    // `registration.queue.view` trong thân (Đối tác, Tài xế đối tác = none), lọc theo năng lực ở xemHangCho.
    route("GET", "/api/dang-ky/hang-cho", "staff", async (ctx) => {
      if (!can(ctx.staff, "registration.queue.view")) return CAM();
      return xemHangCho(ctx);
    }),
    // Bước xác minh (ADR-0207 Đ2, Đ9; ADR-0219 Đ1, Đ2): cổng `office`; mỗi route hỏi `registration.verify` VÀ `party.view` (Quản lý bán hàng, Toàn quyền — Quản trị, Nhân sự không);
    // xem đủ số, mở ảnh thêm `registration.verify.attachment`. Hàm xử lý ở xac-minh-route.ts.
    route("GET", "/api/dang-ky/phieu/:id", "office", async (ctx) => {
      if (!can(ctx.staff, "registration.verify") || !can(ctx.staff, "party.view")) return CAM();
      return xemPhieu(ctx);
    }),
    route("POST", "/api/dang-ky/phieu/:id/ket-luan", "office", async (ctx) => {
      if (!can(ctx.staff, "registration.verify") || !can(ctx.staff, "party.view")) return CAM();
      return ketLuanMuc(ctx);
    }),
    route("POST", "/api/dang-ky/phieu/:id/xem-so", "office", async (ctx) => {
      if (!can(ctx.staff, "registration.verify") || !can(ctx.staff, "party.view") || !can(ctx.staff, "registration.verify.attachment")) return CAM();
      return xemSo(ctx);
    }),
    route("GET", "/api/dang-ky/phieu/:id/tep/:tid", "office", async (ctx) => {
      if (!can(ctx.staff, "registration.verify") || !can(ctx.staff, "party.view") || !can(ctx.staff, "registration.verify.attachment")) return CAM();
      return moTep(ctx);
    }),
    route("POST", "/api/dang-ky/phieu/:id/dat", "office", async (ctx) => {
      if (!can(ctx.staff, "registration.verify") || !can(ctx.staff, "party.view")) return CAM();
      return xacMinhDat(ctx);
    }),
    route("POST", "/api/dang-ky/phieu/:id/bo-sung", "office", async (ctx) => {
      if (!can(ctx.staff, "registration.verify") || !can(ctx.staff, "party.view")) return CAM();
      return yeuCauBoSung(ctx);
    }),
    route("POST", "/api/dang-ky/phieu/:id/tu-choi", "office", async (ctx) => {
      if (!can(ctx.staff, "registration.verify") || !can(ctx.staff, "party.view")) return CAM();
      return tuChoiPhieu(ctx);
    }),
    // Bước DUYỆT MỞ TÀI KHOẢN (ADR-0207 Đ1, Đ4–Đ7, Đ9; ADR-0219 Đ1, Đ2). Cổng `accounts`; mỗi route hỏi `registration.approve` (Quản trị, Nhân sự, Toàn quyền). Người duyệt có thể không xem Danh bạ:
    // màn duyệt riêng (không ảnh, không số giấy tờ, không ngày sinh, không địa chỉ). Lệnh duyệt: một lô do gốc lắp ráp ghép (`ctx.loDuyetDangKy`), câu chốt làm hỏng cả lô.
    route("GET", "/api/dang-ky/phieu/:id/xem-duyet", "accounts", async (ctx) => {
      if (!can(ctx.staff, "registration.approve")) return CAM_DUYET();
      return xemDeDuyet(ctx);
    }),
    route("POST", "/api/dang-ky/phieu/:id/duyet", "accounts", async (ctx) => {
      if (!can(ctx.staff, "registration.approve")) return CAM_DUYET();
      return duyetPhieu(ctx);
    }),
    route("POST", "/api/dang-ky/phieu/:id/tu-choi-duyet", "accounts", async (ctx) => {
      if (!can(ctx.staff, "registration.approve")) return CAM_DUYET();
      return tuChoiDuyet(ctx);
    }),
    route("POST", "/api/dang-ky/phieu/:id/gui-lai-loi-moi", "accounts", async (ctx) => {
      if (!can(ctx.staff, "registration.approve")) return CAM_DUYET();
      return guiLaiLoiMoi(ctx);
    }),
    // «Trả về xác minh» (ADR-0207 Đ5; rà soát cuối I-3): cùng ô registration.approve với bước duyệt.
    route("POST", "/api/dang-ky/phieu/:id/tra-ve-xac-minh", "accounts", async (ctx) => {
      if (!can(ctx.staff, "registration.approve")) return CAM_DUYET();
      return traVeXacMinh(ctx);
    }),
    // Gửi lại thư báo chưa gửi được (ADR-0206 Đ13; rà soát cuối I-1). Cổng `staff` (như hàng chờ, ADR-0219 Đ3) + ô `registration.queue.view`; ô theo BƯỚC đã sinh thư kiểm trong thân (thu-bao.ts): xác minh ⇒ registration.verify + party.view,
    // từ chối ở bước duyệt ⇒ registration.approve.
    route("POST", "/api/dang-ky/phieu/:id/gui-lai-thu", "staff", async (ctx) => {
      if (!can(ctx.staff, "registration.queue.view")) return CAM();
      return guiLaiThu(ctx);
    }),
  ],
};
