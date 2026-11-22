// Luật thuần của BẢN DÙNG THỬ (ADR-0223) ở demo.tourdao.vn. Tệp thuần: không I/O, không import module máy chủ.
// Mọi nhánh riêng của bản dùng thử hỏi `laBanDungThu(env)`; bản chính thức và bản Development không bao giờ đặt `BAN_DUNG_THU`.
import { VAI_CHON_DUOC } from "./xem-nhu-vai.ts";
import type { PermissionCode } from "./permissions.ts";

/** Biến bật (khoá an toàn thứ nhất, ADR-0223 Đ2.3). Không dùng lại `MOI_TRUONG`: bản Development cũng đặt biến đó. */
export const laBanDungThu = (env: { BAN_DUNG_THU?: unknown }): boolean => env.BAN_DUNG_THU === "bat";

/** SĐT của tài khoản dùng thử (dùng chung, quyền thật Đối tác) và của tài khoản Toàn quyền của chủ trên bản dùng thử. Không phải số thật của ai. */
export const SDT_DUNG_THU = "0900000100";
export const SDT_TOAN_QUYEN_DEMO = "0900000101";
/** Mã tài khoản cố định trong bản mẫu (máy sinh bản mẫu dùng đúng hai mã này) — để nhận diện mà không phải tra SĐT mỗi lần. */
export const ID_DUNG_THU = "d0000000-0000-4000-8000-000000000100";
export const ID_TOAN_QUYEN_DEMO = "d0000000-0000-4000-8000-000000000101";
/** Tài khoản dùng thử của bản dùng thử: chỉ đúng khi BẬT và đúng mã. */
export const laTaiKhoanDungThu = (env: { BAN_DUNG_THU?: unknown }, staffId: string): boolean => laBanDungThu(env) && staffId === ID_DUNG_THU;

/** Vai chọn được sau PIN (ADR-0223 Đ3.1): mọi quyền trừ Toàn quyền — cùng danh sách với «Xem như vai trò khác». */
export const VAI_DUNG_THU: readonly PermissionCode[] = VAI_CHON_DUOC;

/** Chu kỳ làm mới (giờ). Mốc = giờ chia hết cho chu kỳ, theo giờ Việt Nam. */
export const CHU_KY_GIO = 2;
const LECH_VN_MS = 7 * 3600_000;
const GIO_MS = 3600_000;
/** Lịch chạy 15 phút: lượt rơi vào 15 phút đầu của mốc thì làm mới (mỗi mốc đúng một lượt). */
const CUA_SO_PHUT = 15;

/** Chữ của dải đầu trang — sinh từ chu kỳ để không lệch với lịch làm mới. */
export const CHU_DAI = `BẢN DÙNG THỬ · dữ liệu tự xoá và đăng xuất vào mỗi ${CHU_KY_GIO === 2 ? "giờ chẵn" : `${CHU_KY_GIO} giờ`}`;

export function laMocLamMoi(ms: number): boolean {
  const vn = new Date(ms + LECH_VN_MS);
  return vn.getUTCHours() % CHU_KY_GIO === 0 && vn.getUTCMinutes() < CUA_SO_PHUT;
}

/** Mốc làm mới kế tiếp (ISO UTC), luôn SAU `ms`. */
export function mocLamMoiKeTiep(ms: number): string {
  const chuKy = CHU_KY_GIO * GIO_MS;
  const vn = ms + LECH_VN_MS;
  return new Date((Math.floor(vn / chuKy) + 1) * chuKy - LECH_VN_MS).toISOString();
}

/** Bảng dấu (khoá an toàn thứ hai): chỉ bản mẫu tạo, không migration nào tạo ⇒ D1 chính thức không bao giờ có. */
export const BANG_DAU = "dt_dau_dung_thu";
export const GIA_TRI_DAU = "demo";
/**
 * Dấu «chờ nạp»: lệnh `npm run len-demo` (chủ gõ) đặt lên D1 dùng thử sau lần tạo D1 đầu tiên và sau MỖI lần đưa mã mới. Lượt lịch chạy kế tiếp (≤ 15 phút)
 * làm sạch NGAY, không chờ mốc giờ chẵn — để lược đồ theo kịp mã mới và PIN được đặt từ bí mật (lệnh ở máy không đọc được bí mật).
 */
export const GIA_TRI_CHO_NAP = "demo-cho-nap";
/** Câu lệnh `len-demo` đặt dấu chờ nạp (chạy bằng `wrangler d1 execute <tên D1 dùng thử> --remote --command`). Bảng dấu không có trigger. */
export const CAU_DAT_CHO_NAP = `CREATE TABLE IF NOT EXISTS ${BANG_DAU} (gia_tri TEXT NOT NULL); DELETE FROM ${BANG_DAU}; INSERT INTO ${BANG_DAU} (gia_tri) VALUES ('${GIA_TRI_CHO_NAP}');`;
/** Lượt lịch chạy này có làm sạch không: đúng mốc giờ chẵn, hoặc D1 đang mang dấu chờ nạp. */
export const canLamMoi = (scheduledMs: number, dau: string | null): boolean => dau === GIA_TRI_CHO_NAP || laMocLamMoi(scheduledMs);
/** Câu đọc dấu. Bảng không tồn tại thì D1 báo lỗi — nơi gọi coi là «không có dấu». */
export const CAU_DOC_DAU = `SELECT gia_tri FROM ${BANG_DAU} LIMIT 1`;

/** Hai khoá + nơi giữ trạng thái khoá phải có, thiếu một là từ chối (ADR-0223 Đ2.3, Đ5). */
export function choPhepLamMoi(v: { bat: boolean; dau: string | null; coBangKhoa: boolean }): { ok: true } | { ok: false; lyDo: string } {
  if (!v.bat) return { ok: false, lyDo: "không phải bản dùng thử (thiếu BAN_DUNG_THU)" };
  if (v.dau !== GIA_TRI_DAU && v.dau !== GIA_TRI_CHO_NAP) return { ok: false, lyDo: "cơ sở dữ liệu không mang bảng dấu của bản dùng thử" };
  if (!v.coBangKhoa) return { ok: false, lyDo: "thiếu cơ sở dữ liệu giữ trạng thái khoá (KHOA_DUNG_THU)" };
  return { ok: true };
}

const TEN_HOP_LE = /^[A-Za-z0-9_]+$/;
const noiBo = (ten: string): boolean => ten.startsWith("sqlite_") || ten.startsWith("_cf_");

/**
 * Câu xoá mọi view rồi mọi bảng (trigger, chỉ mục mất theo bảng; SQLite không chạy trigger khi DROP TABLE). Hoãn kiểm khoá ngoại tới cuối giao dịch để
 * thứ tự xoá bảng cha / con không quan trọng. Tên lạ ⇒ ném (không bao giờ ghép tên lạ vào câu).
 */
export function loXoaHet(doiTuong: readonly { type: string; name: string }[]): string[] {
  const giu = doiTuong.filter((o) => (o.type === "table" || o.type === "view") && !noiBo(o.name));
  const la = giu.filter((o) => !TEN_HOP_LE.test(o.name));
  if (la.length) throw new Error(`có đối tượng tên lạ, không dám xoá: ${la.map((o) => JSON.stringify(o.name)).join(", ")}`);
  return [
    "PRAGMA defer_foreign_keys = ON",
    ...giu.filter((o) => o.type === "view").map((o) => `DROP VIEW IF EXISTS "${o.name}"`),
    ...giu.filter((o) => o.type === "table").map((o) => `DROP TABLE IF EXISTS "${o.name}"`),
  ];
}

/** Đường bản mẫu trong phần tĩnh riêng của bản dùng thử. Người ngoài gọi ⇒ 404 (Worker trả lời trước, `run_worker_first`). */
export const DUONG_BAN_MAU = "/__ban-mau.json";

export interface BanMau { phienBan: 1; commit: string; soMigration: number; cau: string[] }

/**
 * Nhận bản mẫu khi đúng dạng và có tạo bảng dấu. Lúc DỰNG (`soMigrationCuaMa` có) còn đòi số migration khớp thư mục `migrations/` — bản mẫu cũ sẽ lùi lược đồ.
 * Lúc CHẠY, Worker không biết số migration: nơi gọi so `commit` của bản mẫu với mã của phần tĩnh (`/ban-thu.json`) cùng lần dựng.
 */
export function docBanMau(x: unknown, soMigrationCuaMa?: number): BanMau | null {
  if (typeof x !== "object" || x === null) return null;
  const b = x as Partial<BanMau>;
  if (b.phienBan !== 1 || typeof b.commit !== "string" || typeof b.soMigration !== "number") return null;
  if (soMigrationCuaMa !== undefined && b.soMigration !== soMigrationCuaMa) return null;
  if (!Array.isArray(b.cau) || b.cau.length === 0 || !b.cau.every((c) => typeof c === "string")) return null;
  if (!b.cau.some((c) => c.startsWith(`CREATE TABLE ${BANG_DAU} `))) return null;
  return b as BanMau;
}
