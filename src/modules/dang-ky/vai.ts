// Vai đăng ký được (ADR-0212 Đ1, Đ2): danh sách là DỮ LIỆU của `parties` (`vaiDangKyDuoc` đọc `pty_role_type`); luật «mở được» là bảng thuần ở `src/shared/dang-ky-vai.ts`.
// Tệp này chỉ ghép hai thứ đó; KHÔNG có câu SQL, KHÔNG liệt kê mã vai. Ba nơi dùng cùng một phép giao: lệnh đổi chính sách, cấu hình công khai, lưu nháp và gửi phiếu.
import { CO_O_BANG_LAI, DA_CO_THAY_MAT_TO_CHUC, lyDoChuaMoDuoc, phanCuaVai, type PhanCuaVai } from "../../shared/dang-ky-vai.ts";
import { vaiDangKyDuoc } from "../parties";
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
