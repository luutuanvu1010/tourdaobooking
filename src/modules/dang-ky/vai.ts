// Vai đăng ký được (ADR-0212 Đ1, Đ2): danh sách là DỮ LIỆU của `parties` (`vaiDangKyDuoc` đọc `pty_role_type`); luật «mở được» là bảng thuần ở `src/shared/dang-ky-vai.ts`.
// Tệp này chỉ ghép hai thứ đó; KHÔNG có câu SQL, KHÔNG liệt kê mã vai. Ba nơi dùng cùng một phép giao: lệnh đổi chính sách, cấu hình công khai, lưu nháp và gửi phiếu.
import { CO_O_BANG_LAI, DA_CO_THAY_MAT_TO_CHUC, lyDoChuaMoDuoc, phanCuaVai, type PhanCuaVai } from "../../shared/dang-ky-vai.ts";
import { isRoleCode, ROLES } from "../../shared/roles.ts";
import { loaiVaiChiTiet, vaiDangKyDuoc } from "../parties";
import { dsLoaiMo } from "./rules.ts";

export interface LoaiCoThe { ma: string; ten: string; laLoaiDoiTac: boolean; lyDoChuaMo: string | null }
export interface LoaiMo { ma: string; ten: string; phan: PhanCuaVai }

/** Mọi vai đăng ký được lúc này, kèm câu nói vì sao CHƯA mở được (null = mở được). */
export async function loaiCoThe(db: D1Database): Promise<LoaiCoThe[]> {
  const ds = await vaiDangKyDuoc(db);
  // Task 4 nối phanToChucMo: `chinhSachCoToChuc` sẽ đọc từ chính sách riêng tư đang hiệu lực; trước đó coi là chưa có.
  const dk = { coThayMatToChuc: DA_CO_THAY_MAT_TO_CHUC, chinhSachCoToChuc: false, coOBangLai: CO_O_BANG_LAI };
  return ds.map((v) => ({ ma: v.ma, ten: v.ten, laLoaiDoiTac: v.laLoaiDoiTac, lyDoChuaMo: lyDoChuaMoDuoc(v.ma, dk) }));
}

/** Loại MỞ cho người đăng ký = giao của «Toàn quyền mở» (`dk_policy.open_role_codes`) với «danh sách lúc này» và «mở được». Loại đã tắt tự ẩn, không cần sửa chính sách. */
export async function loaiMoHienTai(db: D1Database, openRoleCodes: string | null | undefined): Promise<LoaiMo[]> {
  const mo = new Set(dsLoaiMo(openRoleCodes ?? ""));
  return (await loaiCoThe(db)).filter((v) => mo.has(v.ma) && v.lyDoChuaMo === null).map((v) => ({ ma: v.ma, ten: v.ten, phan: phanCuaVai(v.ma, v.laLoaiDoiTac) }));
}

export interface VaiChonDuyet { ma: string; ten: string; laLoaiDoiTac: boolean }

/**
 * Vai người duyệt được chọn khi mở tài khoản (ADR-0212 Đ3, PF2): mọi loại do Kế toán thêm (`LD_…`, cờ loại đối tác) và vai bên ngoài sinh quyền Đối tác, lấy từ `vaiDangKyDuoc`.
 * Một nguồn cho cả ô chọn ở màn duyệt lẫn kiểm trong lệnh duyệt; loại đã tắt tự biến khỏi danh sách.
 */
export async function vaiChonKhiDuyet(db: D1Database): Promise<VaiChonDuyet[]> {
  return (await vaiDangKyDuoc(db))
    .filter((v) => v.laLoaiDoiTac || (isRoleCode(v.ma) && ROLES[v.ma].defaults.includes("PARTNER")))
    .map((v) => ({ ma: v.ma, ten: v.ten, laLoaiDoiTac: v.laLoaiDoiTac }));
}

/** Kết quả kiểm vai lúc duyệt: hợp lệ (kèm cờ loại đối tác), «đã tắt» (có thật nhưng không còn trong danh sách), hoặc không hợp lệ. */
export type KiemVaiDuyet = { kq: "HOP_LE"; laLoaiDoiTac: boolean } | { kq: "DA_TAT" } | { kq: "KHONG_HOP_LE" };

export async function kiemVaiKhiDuyet(db: D1Database, ma: string): Promise<KiemVaiDuyet> {
  const dsach = await vaiDangKyDuoc(db);
  const v = dsach.find((x) => x.ma === ma);
  if (v) return { kq: "HOP_LE", laLoaiDoiTac: v.laLoaiDoiTac };
  const dong = (await loaiVaiChiTiet(db)).find((t) => t.code === ma);
  return dong && (dong.partnerLabel || dong.nhom === "EXTERNAL") && !dong.dangBat ? { kq: "DA_TAT" } : { kq: "KHONG_HOP_LE" };
}
