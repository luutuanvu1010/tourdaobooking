// Module dang-ky — phiếu đăng ký đối tác tự đăng ký (ADR-0206 Đ2; đợt 1 Task 1). Chủ duy nhất của bảng dk_*. Chưa có route (routes: []): route, lệnh gửi, xác minh, duyệt thêm ở các Task sau.
// Phụ thuộc (khai ở ALLOWED_EDGES): parties (hồ sơ, tệp), staff (tài khoản), auth (Turnstile, bộ đếm chống dò), audit (nhật ký lệnh của người trong công ty và tác nhân). Câu của pricing do gốc lắp ráp ghép vào lô duyệt, không có cạnh.
import { route, type AppModule } from "../../shared/router";
import { chinhSachHienHanh } from "./repository";
import { taiTepPhieu } from "./tep-route";

export { TRANG_THAI, TRANG_THAI_KET_THUC, chuyenHopLe, daKetThuc, type TrangThai } from "./rules";

/** Chính sách đăng ký hiệu lực tại `at`; null ⇒ coi là đóng đăng ký. */
export const chinhSachDangKy = chinhSachHienHanh;

export const dangKyModule: AppModule = {
  name: "dang-ky",
  routes: [
    // Tải một tệp vào ô của phiếu (ADR-0208 Đ2). Công khai: người đăng ký chưa có tài khoản; cổng là cookie đăng ký kiểm trong thân (ADR-0206 Đ7).
    route("POST", "/api/dang-ky/phieu/tep", "public", async (ctx) => {
      return taiTepPhieu(ctx);
    }),
  ],
};
