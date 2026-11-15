// Module dang-ky — phiếu đăng ký đối tác tự đăng ký (ADR-0206 Đ2; đợt 1 Task 1). Chủ duy nhất của bảng dk_*. Chưa có route (routes: []): route, lệnh gửi, xác minh, duyệt thêm ở các Task sau.
// Phụ thuộc (khai ở ALLOWED_EDGES): parties (hồ sơ, tệp), staff (tài khoản), auth (Turnstile, bộ đếm chống dò), audit (nhật ký lệnh của người trong công ty và tác nhân). Câu của pricing do gốc lắp ráp ghép vào lô duyệt, không có cạnh.
import { can } from "../../shared/permissions";
import { route, type AppModule } from "../../shared/router";
import { chinhSachHienHanh } from "./repository";
import { guiPhieu, luuNhapPhieu, rutPhieu, xemPhieuCuaToi } from "./phieu-route";
import { taiTepPhieu } from "./tep-route";
import { cauHinhDangKy, xacNhanMa, xinMa } from "./xin-ma-route";
import { CAM_DUYET, duyetPhieu, guiLaiLoiMoi, tuChoiDuyet, xemDeDuyet } from "./duyet-route";
import { CAM, ketLuanMuc, moTep, tuChoiPhieu, xacMinhDat, xemHangCho, xemPhieu, xemSo, yeuCauBoSung } from "./xac-minh-route";

export { cauLyDoChoNguoiDangKy } from "../../shared/dang-ky-hien-thi";
export { chuaKichHoat, lyDoCuaPhieu } from "./repository";
// Câu CHƯA CHẠY của dang-ky cho LÔ DUYỆT (ADR-0207 Đ5; đợt 1 Task 8): gốc lắp ráp ghép với câu của parties, staff (và pricing) — câu 1 chốt, câu 10 phiếu + lịch sử + ẩn danh bản khai.
export { cauAnDanhBanKhai, cauChotDuyet, cauDuyetPhieu, suKienNhanVienStatement as suKienDuyetStatement } from "./repository";
export { TRANG_THAI, TRANG_THAI_KET_THUC, chuyenHopLe, daKetThuc, type TrangThai } from "./rules";

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
    // Tải một tệp vào ô của phiếu (ADR-0208 Đ2). Công khai: người đăng ký chưa có tài khoản; cổng là cookie đăng ký kiểm trong thân (ADR-0206 Đ7).
    route("POST", "/api/dang-ky/phieu/tep", "public", async (ctx) => {
      return taiTepPhieu(ctx);
    }),
    // Bước xác minh của người trong công ty (ADR-0207 Đ2, Đ9; đợt 1 Task 6). Cổng `accounts`; mỗi route hỏi ô quyền trong thân (xac-minh-route.ts).
    route("GET", "/api/dang-ky/hang-cho", "accounts", async (ctx) => {
      if (!can(ctx.staff, "registration.queue.view")) return CAM();
      return xemHangCho(ctx);
    }),
    route("GET", "/api/dang-ky/phieu/:id", "accounts", async (ctx) => {
      if (!can(ctx.staff, "party.verify") || !can(ctx.staff, "party.view")) return CAM();
      return xemPhieu(ctx);
    }),
    route("POST", "/api/dang-ky/phieu/:id/ket-luan", "accounts", async (ctx) => {
      if (!can(ctx.staff, "party.verify") || !can(ctx.staff, "party.view")) return CAM();
      return ketLuanMuc(ctx);
    }),
    route("POST", "/api/dang-ky/phieu/:id/xem-so", "accounts", async (ctx) => {
      if (!can(ctx.staff, "party.verify") || !can(ctx.staff, "party.view") || !can(ctx.staff, "party.verify.attachment")) return CAM();
      return xemSo(ctx);
    }),
    route("GET", "/api/dang-ky/phieu/:id/tep/:tid", "accounts", async (ctx) => {
      if (!can(ctx.staff, "party.verify") || !can(ctx.staff, "party.view") || !can(ctx.staff, "party.verify.attachment")) return CAM();
      return moTep(ctx);
    }),
    route("POST", "/api/dang-ky/phieu/:id/dat", "accounts", async (ctx) => {
      if (!can(ctx.staff, "party.verify") || !can(ctx.staff, "party.view")) return CAM();
      return xacMinhDat(ctx);
    }),
    route("POST", "/api/dang-ky/phieu/:id/bo-sung", "accounts", async (ctx) => {
      if (!can(ctx.staff, "party.verify") || !can(ctx.staff, "party.view")) return CAM();
      return yeuCauBoSung(ctx);
    }),
    route("POST", "/api/dang-ky/phieu/:id/tu-choi", "accounts", async (ctx) => {
      if (!can(ctx.staff, "party.verify") || !can(ctx.staff, "party.view")) return CAM();
      return tuChoiPhieu(ctx);
    }),
    // Bước DUYỆT MỞ TÀI KHOẢN (ADR-0207 Đ1, Đ4–Đ7, Đ9; đợt 1 Task 8). Cổng `accounts`; mỗi route hỏi `account.create` (Nhân sự, Toàn quyền — Quản trị không có). Nhân sự không xem Danh bạ:
    // màn duyệt riêng (không ảnh, không số giấy tờ, không ngày sinh, không địa chỉ). Lệnh duyệt: một lô do gốc lắp ráp ghép (`ctx.loDuyetDangKy`), câu chốt làm hỏng cả lô.
    route("GET", "/api/dang-ky/phieu/:id/xem-duyet", "accounts", async (ctx) => {
      if (!can(ctx.staff, "account.create")) return CAM_DUYET();
      return xemDeDuyet(ctx);
    }),
    route("POST", "/api/dang-ky/phieu/:id/duyet", "accounts", async (ctx) => {
      if (!can(ctx.staff, "account.create")) return CAM_DUYET();
      return duyetPhieu(ctx);
    }),
    route("POST", "/api/dang-ky/phieu/:id/tu-choi-duyet", "accounts", async (ctx) => {
      if (!can(ctx.staff, "account.create")) return CAM_DUYET();
      return tuChoiDuyet(ctx);
    }),
    route("POST", "/api/dang-ky/phieu/:id/gui-lai-loi-moi", "accounts", async (ctx) => {
      if (!can(ctx.staff, "account.create")) return CAM_DUYET();
      return guiLaiLoiMoi(ctx);
    }),
  ],
};
