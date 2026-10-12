// SQL của module tro-ly (bảng tl_luot_hoi, tl_cai_dat — migration 0050, ADR-0066; tl_vai, tl_loi_dan, tl_ngu_canh, tl_hoi_dap — migration 0054, ADR-0069;
// tl_bo_nao — migration *_tl_bo_nao, ADR-0073).
// Module NGHIÊM: mọi câu đi qua defineSql, TĨNH, import đuôi .ts. Mọi bảng CHỈ THÊM (trigger chặn UPDATE/DELETE) — ở đây chỉ có SELECT và INSERT.
// tl_luot_hoi KHÔNG có cột nội dung (ADR-0066 điều 7); nội dung hỏi đáp ĐÃ CHE nằm ở tl_hoi_dap (ADR-0069 điều 5), chỉ Toàn quyền đọc.
// Tên người đọc CHỈ qua view công bố v_stf_staff_label (module staff — cạnh tro-ly → staff ở ALLOWED_EDGES).
// ADR-0084: tên gọi + giới tính của người hỏi CHỈ qua view công bố v_stf_staff_xung_ho (module staff — CÙNG cạnh, không thêm cạnh tro-ly → parties).
import { defineSql } from "../../shared/sql-registry.ts";
import { PERMISSION_CODES, type PermissionCode } from "../../shared/permissions.ts";
import type { CaiDatTroLy, LoiDan, LuotTruoc, NguCanh, NguCanhHienHanh } from "../../shared/tro-ly.ts";
import type { BanBoNaoLuu, BoNao } from "../../shared/tro-ly-bo-nao.ts";

// ADR-0084 Đ3, Đ4: CHỈ tên gọi + giới tính (view không có họ, tên đệm, SĐT) của MỘT tài khoản — id lấy từ phiên, không từ trình duyệt.
const XUNG_HO = defineSql("tro-ly", "xung-ho", "SELECT given_name, gender FROM v_stf_staff_xung_ho WHERE id = ?1");
/** Tên gọi + giới tính của tài khoản đang đăng nhập (không có dòng / chưa có hồ sơ ⇒ null cả hai ⇒ "bạn" / "mình"). */
export async function docNguoiHoi(db: D1Database, staffId: string): Promise<{ tenGoi: string | null; gioiTinh: string | null }> {
  const r = await db.prepare(XUNG_HO).bind(staffId).first<{ given_name: string | null; gender: string | null }>();
  return { tenGoi: r?.given_name ?? null, gioiTinh: r?.gender ?? null };
}

const CAI_DAT = defineSql(
  "tro-ly",
  "cai-dat-hien-hanh",
  "SELECT bat, tran_thang_micro_usd, tran_ngay FROM tl_cai_dat ORDER BY valid_from_at DESC, created_at DESC, id DESC LIMIT 1",
);
// Trần ngày đếm câu THẬT đã tới bước hỏi (ok, loi) của NGƯỜI đó trong ngày VN; dòng het_tran (bị chặn) và lượt thử (la_thu = 1 — ADR-0073 T3) không tính.
const DEM_HOM_NAY = defineSql(
  "tro-ly",
  "dem-hom-nay",
  "SELECT count(*) AS n FROM tl_luot_hoi WHERE staff_id = ?1 AND ngay_vn = ?2 AND ket_qua <> 'het_tran' AND la_thu = 0",
);
// Số câu THẬT hôm nay của CẢ công ty (ADR-0069 điều 6; ADR-0073 T6 — không gồm lượt thử).
const DEM_HOM_NAY_CONG_TY = defineSql(
  "tro-ly",
  "dem-hom-nay-cong-ty",
  "SELECT count(*) AS n FROM tl_luot_hoi WHERE ngay_vn = ?1 AND ket_qua <> 'het_tran' AND la_thu = 0",
);
// Trần tháng: tổng chi phí của CẢ công ty trong tháng dương lịch VN, GỒM lượt thử (ADR-0073 T3); số câu thật và số lượt thử đếm riêng (T6).
const TONG_THANG = defineSql(
  "tro-ly",
  "tong-thang",
  "SELECT COALESCE(SUM(chi_phi_micro_usd), 0) AS tong, COALESCE(SUM(CASE WHEN ket_qua <> 'het_tran' AND la_thu = 0 THEN 1 ELSE 0 END), 0) AS so, COALESCE(SUM(CASE WHEN ket_qua <> 'het_tran' AND la_thu = 1 THEN 1 ELSE 0 END), 0) AS so_thu FROM tl_luot_hoi WHERE ngay_vn >= ?1 AND ngay_vn <= ?2",
);
// Chi phí + số câu THEO VAI trong khoảng ngày — đọc từ lịch sử (tl_hoi_dap có vai); lượt "Thử key" không có ở đây (không phải câu của một vai).
const THEO_VAI = defineSql(
  "tro-ly",
  "theo-vai",
  "SELECT j.value AS vai, count(*) AS so, COALESCE(SUM(h.chi_phi_micro_usd), 0) AS chi_phi FROM tl_hoi_dap h, json_each(h.vai) j WHERE h.ngay_vn >= ?1 AND h.ngay_vn <= ?2 GROUP BY j.value",
);
const GHI_LUOT = defineSql(
  "tro-ly",
  "ghi-luot",
  "INSERT INTO tl_luot_hoi (id, staff_id, ngay_vn, token_vao, token_vao_dem, token_ra, chi_phi_micro_usd, ket_qua, mau, la_thu, created_at, created_by, updated_at, updated_by) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?10, ?11, ?9, ?2, ?9, ?2)",
);
const THEM_CAI_DAT = defineSql(
  "tro-ly",
  "them-cai-dat",
  "INSERT INTO tl_cai_dat (id, bat, tran_thang_micro_usd, tran_ngay, valid_from_at, created_at, created_by, updated_at, updated_by) VALUES (?1, ?2, ?3, ?4, ?5, ?5, ?6, ?5, ?6)",
);
// Bản hiện hành của MỖI mã quyền (valid_from_at lớn nhất, hoà thì created_at, id).
const VAI_HIEN_HANH = defineSql(
  "tro-ly",
  "vai-hien-hanh",
  "SELECT ma_quyen, bat FROM (SELECT ma_quyen, bat, row_number() OVER (PARTITION BY ma_quyen ORDER BY valid_from_at DESC, created_at DESC, id DESC) AS rn FROM tl_vai) WHERE rn = 1",
);
const THEM_VAI = defineSql(
  "tro-ly",
  "them-vai",
  "INSERT INTO tl_vai (id, ma_quyen, bat, valid_from_at, created_at, created_by, updated_at, updated_by) VALUES (?1, ?2, ?3, ?4, ?4, ?5, ?4, ?5)",
);
const LOI_DAN_HIEN_HANH = defineSql(
  "tro-ly",
  "loi-dan-hien-hanh",
  "SELECT cau_chao, giong, loi_dan_them, cau_hoi_mau FROM tl_loi_dan ORDER BY valid_from_at DESC, created_at DESC, id DESC LIMIT 1",
);
const LOI_DAN_CAC_BAN = defineSql(
  "tro-ly",
  "loi-dan-cac-ban",
  "SELECT d.id, d.cau_chao, d.giong, d.loi_dan_them, d.cau_hoi_mau, d.created_at, s.label AS nguoi FROM tl_loi_dan d LEFT JOIN v_stf_staff_label s ON s.id = d.created_by ORDER BY d.valid_from_at DESC, d.created_at DESC, d.id DESC LIMIT 30",
);
const THEM_LOI_DAN = defineSql(
  "tro-ly",
  "them-loi-dan",
  "INSERT INTO tl_loi_dan (id, cau_chao, giong, loi_dan_them, cau_hoi_mau, valid_from_at, created_at, created_by, updated_at, updated_by) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?6, ?7, ?6, ?7)",
);
// Bản hiện hành của MỖI đoạn (doan_id); đoạn mới thêm trước (created_at của bản ĐẦU của đoạn).
const NGU_CANH_HIEN_HANH = defineSql(
  "tro-ly",
  "ngu-canh-hien-hanh",
  "SELECT doan_id, tieu_de, noi_dung, bat, created_at, dau FROM (SELECT doan_id, tieu_de, noi_dung, bat, created_at, min(created_at) OVER (PARTITION BY doan_id) AS dau, row_number() OVER (PARTITION BY doan_id ORDER BY valid_from_at DESC, created_at DESC, id DESC) AS rn FROM tl_ngu_canh) WHERE rn = 1 ORDER BY dau DESC, doan_id",
);
const NGU_CANH_CO = defineSql("tro-ly", "ngu-canh-co", "SELECT 1 AS co FROM tl_ngu_canh WHERE doan_id = ?1 LIMIT 1");
const THEM_NGU_CANH = defineSql(
  "tro-ly",
  "them-ngu-canh",
  "INSERT INTO tl_ngu_canh (id, doan_id, tieu_de, noi_dung, bat, valid_from_at, created_at, created_by, updated_at, updated_by) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?6, ?7, ?6, ?7)",
);
const GHI_HOI_DAP = defineSql(
  "tro-ly",
  "ghi-hoi-dap",
  "INSERT INTO tl_hoi_dap (id, luot_id, staff_id, vai, ngay_vn, cau_hoi, tra_loi, nguon, chi_phi_micro_usd, ket_qua, cuoc_tro_chuyen, created_at, created_by, updated_at, updated_by) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?12, ?11, ?3, ?11, ?3)",
);

// Phần nhớ (ADR-0073 Đ4): ≤ 3 lượt GẦN NHẤT của CHÍNH người hỏi (staff_id), CÙNG mã cuộc trò chuyện, kết quả ok, từ mốc `tuLuc` (2 giờ trước). Chỉ mục
// tl_hoi_dap_cuoc (staff_id, cuoc_tro_chuyen, created_at). Hoà created_at (cùng mili giây) ⇒ rowid (thứ tự chèn) quyết.
const NHO_LUOT = defineSql(
  "tro-ly",
  "nho-luot",
  "SELECT cau_hoi, tra_loi FROM tl_hoi_dap WHERE staff_id = ?1 AND cuoc_tro_chuyen = ?2 AND ket_qua = 'ok' AND created_at >= ?3 ORDER BY created_at DESC, rowid DESC LIMIT 3",
);
// Lịch sử hỏi đáp (chỉ Toàn quyền): lọc tuỳ chọn ngày từ / đến, người, vai (json_each), tìm chữ (LIKE có ESCAPE ở câu hỏi hoặc câu trả lời). Mới trước.
const LICH_SU = defineSql(
  "tro-ly",
  "lich-su",
  "SELECT h.id, h.staff_id, s.label AS nguoi, h.vai, h.cau_hoi, h.tra_loi, h.nguon, h.chi_phi_micro_usd, h.ket_qua, h.created_at FROM tl_hoi_dap h LEFT JOIN v_stf_staff_label s ON s.id = h.staff_id WHERE (?1 IS NULL OR h.ngay_vn >= ?1) AND (?2 IS NULL OR h.ngay_vn <= ?2) AND (?3 IS NULL OR h.staff_id = ?3) AND (?4 IS NULL OR EXISTS (SELECT 1 FROM json_each(h.vai) WHERE value = ?4)) AND (?5 IS NULL OR h.cau_hoi LIKE ?5 ESCAPE '\\' OR h.tra_loi LIKE ?5 ESCAPE '\\') ORDER BY h.created_at DESC, h.id DESC LIMIT ?6 OFFSET ?7",
);
const NGUOI_DA_HOI = defineSql(
  "tro-ly",
  "nguoi-da-hoi",
  "SELECT DISTINCT h.staff_id, s.label AS nguoi FROM tl_hoi_dap h LEFT JOIN v_stf_staff_label s ON s.id = h.staff_id ORDER BY s.label, h.staff_id",
);
// Bộ não (ADR-0073 Đ1, Đ2): bản hiện hành = valid_from_at lớn nhất (hoà thì created_at, rowid — thứ tự chèn: hai lần lưu cùng mili-giây vẫn đúng thứ tự,
// id là UUID ngẫu nhiên nên không dùng để phân thứ tự; tiền lệ module audit); lịch sử 31 bản mới nhất (bản thứ 31 chỉ để tính "phần đổi" của bản 30).
const BO_NAO_HIEN_HANH = defineSql(
  "tro-ly",
  "bo-nao-hien-hanh",
  "SELECT mau, muc_suy_nghi, do_dai, token_ra_toi_da, loi_nhac FROM tl_bo_nao ORDER BY valid_from_at DESC, created_at DESC, rowid DESC LIMIT 1",
);
const BO_NAO_CAC_BAN = defineSql(
  "tro-ly",
  "bo-nao-cac-ban",
  "SELECT b.id, b.mau, b.muc_suy_nghi, b.do_dai, b.token_ra_toi_da, b.loi_nhac, b.created_at, s.label AS nguoi FROM tl_bo_nao b LEFT JOIN v_stf_staff_label s ON s.id = b.created_by ORDER BY b.valid_from_at DESC, b.created_at DESC, b.rowid DESC LIMIT 31",
);
const THEM_BO_NAO = defineSql(
  "tro-ly",
  "them-bo-nao",
  "INSERT INTO tl_bo_nao (id, mau, muc_suy_nghi, do_dai, token_ra_toi_da, loi_nhac, valid_from_at, created_at, created_by, updated_at, updated_by) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?7, ?8, ?7, ?8)",
);

/** Bản cài đặt hiện hành. Không có dòng nào (ai đó xoá tay — trigger chặn) ⇒ coi như TẮT. */
export async function docCaiDat(db: D1Database): Promise<CaiDatTroLy> {
  const r = await db.prepare(CAI_DAT).first<{ bat: number; tran_thang_micro_usd: number; tran_ngay: number }>();
  if (!r) return { bat: false, tranThangMicroUsd: 0, tranNgay: 0 };
  return { bat: r.bat === 1, tranThangMicroUsd: r.tran_thang_micro_usd, tranNgay: r.tran_ngay };
}

export async function demCauHomNay(db: D1Database, staffId: string, ngayVn: string): Promise<number> {
  return (await db.prepare(DEM_HOM_NAY).bind(staffId, ngayVn).first<{ n: number }>())?.n ?? 0;
}

export async function demCauHomNayCongTy(db: D1Database, ngayVn: string): Promise<number> {
  return (await db.prepare(DEM_HOM_NAY_CONG_TY).bind(ngayVn).first<{ n: number }>())?.n ?? 0;
}

export async function tongThang(db: D1Database, tu: string, den: string): Promise<{ tong: number; so: number; soThu: number }> {
  const r = await db.prepare(TONG_THANG).bind(tu, den).first<{ tong: number; so: number; so_thu: number }>();
  return { tong: r?.tong ?? 0, so: r?.so ?? 0, soThu: r?.so_thu ?? 0 };
}

export async function theoVai(db: D1Database, tu: string, den: string): Promise<{ vai: string; so: number; chiPhi: number }[]> {
  const { results } = await db.prepare(THEO_VAI).bind(tu, den).all<{ vai: string; so: number; chi_phi: number }>();
  return results.map((r) => ({ vai: r.vai, so: r.so, chiPhi: r.chi_phi }));
}

export interface LuotHoi {
  id: string;
  staffId: string;
  ngayVn: string;
  vao: number;
  vaoDem: number;
  ra: number;
  chiPhi: number;
  ketQua: "ok" | "het_tran" | "loi";
  /** Mã mẫu của lượt (chi phí theo giá mẫu này — B8); null khi KHÔNG gọi mẫu nào (dòng het_tran). */
  mau: string | null;
  /** Lượt "Thử key" / ô thử của Toàn quyền (T3). */
  laThu: boolean;
  at: string;
}

export const luotStatement = (db: D1Database, l: LuotHoi): D1PreparedStatement =>
  db.prepare(GHI_LUOT).bind(l.id, l.staffId, l.ngayVn, l.vao, l.vaoDem, l.ra, l.chiPhi, l.ketQua, l.at, l.mau, l.laThu ? 1 : 0);

export async function ghiLuot(db: D1Database, l: LuotHoi): Promise<void> {
  await luotStatement(db, l).run();
}

export function caiDatStatement(db: D1Database, c: CaiDatTroLy, at: string, by: string): D1PreparedStatement {
  return db.prepare(THEM_CAI_DAT).bind(crypto.randomUUID(), c.bat ? 1 : 0, c.tranThangMicroUsd, c.tranNgay, at, by);
}

/** Công tắc hiện hành theo mã quyền; mã lạ (không còn trong app) bị bỏ; mã không có dòng thì vắng mặt (= tắt, `duocDungTroLy`). */
export async function docVai(db: D1Database): Promise<Partial<Record<PermissionCode, boolean>>> {
  const { results } = await db.prepare(VAI_HIEN_HANH).all<{ ma_quyen: string; bat: number }>();
  const out: Partial<Record<PermissionCode, boolean>> = {};
  for (const r of results) if ((PERMISSION_CODES as readonly string[]).includes(r.ma_quyen)) out[r.ma_quyen as PermissionCode] = r.bat === 1;
  return out;
}

export const vaiStatement = (db: D1Database, ma: PermissionCode, bat: boolean, at: string, by: string): D1PreparedStatement =>
  db.prepare(THEM_VAI).bind(crypto.randomUUID(), ma, bat ? 1 : 0, at, by);

const docMau = (s: string): string[] => {
  try {
    const v: unknown = JSON.parse(s);
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
};

/** Lời dặn hiện hành; không có dòng (không thể qua trigger) ⇒ câu chào rỗng — giao diện dùng câu chào dự phòng. */
export async function docLoiDan(db: D1Database): Promise<LoiDan> {
  const r = await db.prepare(LOI_DAN_HIEN_HANH).first<{ cau_chao: string; giong: string; loi_dan_them: string; cau_hoi_mau: string }>();
  if (!r) return { cauChao: "", giong: "", loiDanThem: "", cauHoiMau: [] };
  return { cauChao: r.cau_chao, giong: r.giong, loiDanThem: r.loi_dan_them, cauHoiMau: docMau(r.cau_hoi_mau) };
}

export interface BanLoiDan extends LoiDan { id: string; luc: string; nguoi: string | null }
export async function cacBanLoiDan(db: D1Database): Promise<BanLoiDan[]> {
  const { results } = await db
    .prepare(LOI_DAN_CAC_BAN)
    .all<{ id: string; cau_chao: string; giong: string; loi_dan_them: string; cau_hoi_mau: string; created_at: string; nguoi: string | null }>();
  return results.map((r) => ({ id: r.id, cauChao: r.cau_chao, giong: r.giong, loiDanThem: r.loi_dan_them, cauHoiMau: docMau(r.cau_hoi_mau), luc: r.created_at, nguoi: r.nguoi }));
}

export const loiDanStatement = (db: D1Database, d: LoiDan, at: string, by: string): D1PreparedStatement =>
  db.prepare(THEM_LOI_DAN).bind(crypto.randomUUID(), d.cauChao, d.giong, d.loiDanThem, JSON.stringify(d.cauHoiMau), at, by);

export interface NguCanhDong extends NguCanhHienHanh { luc: string }
export async function docNguCanh(db: D1Database): Promise<NguCanhDong[]> {
  const { results } = await db.prepare(NGU_CANH_HIEN_HANH).all<{ doan_id: string; tieu_de: string; noi_dung: string; bat: number; created_at: string }>();
  return results.map((r) => ({ doanId: r.doan_id, tieuDe: r.tieu_de, noiDung: r.noi_dung, bat: r.bat === 1, luc: r.created_at }));
}

export async function coNguCanh(db: D1Database, doanId: string): Promise<boolean> {
  return (await db.prepare(NGU_CANH_CO).bind(doanId).first<{ co: number }>()) !== null;
}

export const nguCanhStatement = (db: D1Database, doanId: string, n: NguCanh, at: string, by: string): D1PreparedStatement =>
  db.prepare(THEM_NGU_CANH).bind(crypto.randomUUID(), doanId, n.tieuDe, n.noiDung, n.bat ? 1 : 0, at, by);

export interface HoiDap {
  luotId: string;
  staffId: string;
  vai: readonly string[];
  ngayVn: string;
  /** Câu hỏi ĐÃ CHE (cheCauHoi) — đúng chuỗi đã (hoặc sẽ) gửi OpenAI. */
  cauHoiDaChe: string;
  traLoi: string;
  nguon: readonly string[];
  chiPhi: number;
  ketQua: "ok" | "loi";
  at: string;
  /** Mã cuộc trò chuyện (ADR-0073 Đ4); null = không gửi mã. */
  cuocTroChuyen: string | null;
}

export const hoiDapStatement = (db: D1Database, h: HoiDap): D1PreparedStatement =>
  db
    .prepare(GHI_HOI_DAP)
    .bind(crypto.randomUUID(), h.luotId, h.staffId, JSON.stringify(h.vai), h.ngayVn, h.cauHoiDaChe, h.traLoi, JSON.stringify(h.nguon), h.chiPhi, h.ketQua, h.at, h.cuocTroChuyen);

/** `mauTim`: mẫu LIKE đã thoát ký tự đặc biệt, cắt ≤ 50 byte (`mauLikeChua` ở src/shared/http.ts) và bọc `%…%`, hoặc null. */
export interface LocLichSu { tu: string | null; den: string | null; nguoi: string | null; vai: string | null; mauTim: string | null; gioiHan: number; boQua: number }
export interface DongLichSu {
  id: string; staffId: string; nguoi: string | null; vai: string[]; cauHoi: string; traLoi: string; nguon: string[]; chiPhi: number; ketQua: string; luc: string;
}

export async function lichSu(db: D1Database, l: LocLichSu): Promise<DongLichSu[]> {
  const { results } = await db
    .prepare(LICH_SU)
    .bind(l.tu, l.den, l.nguoi, l.vai, l.mauTim, l.gioiHan, l.boQua)
    .all<{ id: string; staff_id: string; nguoi: string | null; vai: string; cau_hoi: string; tra_loi: string; nguon: string; chi_phi_micro_usd: number; ket_qua: string; created_at: string }>();
  return results.map((r) => ({
    id: r.id, staffId: r.staff_id, nguoi: r.nguoi, vai: docMau(r.vai), cauHoi: r.cau_hoi, traLoi: r.tra_loi, nguon: docMau(r.nguon),
    chiPhi: r.chi_phi_micro_usd, ketQua: r.ket_qua, luc: r.created_at,
  }));
}

export async function nguoiDaHoi(db: D1Database): Promise<{ staffId: string; nguoi: string | null }[]> {
  const { results } = await db.prepare(NGUOI_DA_HOI).all<{ staff_id: string; nguoi: string | null }>();
  return results.map((r) => ({ staffId: r.staff_id, nguoi: r.nguoi }));
}

type DongBoNao = { mau: string; muc_suy_nghi: string; do_dai: string; token_ra_toi_da: number; loi_nhac: string };
const banTuDong = (r: DongBoNao): BanBoNaoLuu => ({ mau: r.mau, mucSuyNghi: r.muc_suy_nghi, doDai: r.do_dai, tokenRaToiDa: r.token_ra_toi_da, loiNhac: r.loi_nhac });

/** Bản bộ não hiện hành CHƯA kiểm (boNaoHieuLuc lo bản hỏng); không có bản ⇒ null (dùng bản mặc định — B5). */
export async function docBoNao(db: D1Database): Promise<BanBoNaoLuu | null> {
  const r = await db.prepare(BO_NAO_HIEN_HANH).first<DongBoNao>();
  return r ? banTuDong(r) : null;
}

export interface BanBoNaoDong extends BanBoNaoLuu { id: string; luc: string; nguoi: string | null }
export async function cacBanBoNao(db: D1Database): Promise<BanBoNaoDong[]> {
  const { results } = await db.prepare(BO_NAO_CAC_BAN).all<DongBoNao & { id: string; created_at: string; nguoi: string | null }>();
  return results.map((r) => ({ ...banTuDong(r), id: r.id, luc: r.created_at, nguoi: r.nguoi }));
}

export const boNaoStatement = (db: D1Database, b: BoNao, at: string, by: string): D1PreparedStatement =>
  db.prepare(THEM_BO_NAO).bind(crypto.randomUUID(), b.mau, b.mucSuyNghi, b.doDai, b.tokenRaToiDa, b.loiNhac, at, by);

/** Lượt trước cho phần nhớ, CŨ → MỚI (thứ tự hội thoại). Nội dung đã che sẵn khi lưu (chữ "[đã che]" giữ nguyên — N6). */
export async function nhoLuot(db: D1Database, staffId: string, cuocTroChuyen: string, tuLuc: string): Promise<LuotTruoc[]> {
  const { results } = await db.prepare(NHO_LUOT).bind(staffId, cuocTroChuyen, tuLuc).all<{ cau_hoi: string; tra_loi: string }>();
  return results.map((r) => ({ cauHoi: r.cau_hoi, traLoi: r.tra_loi })).reverse();
}

// tl_van_nghia (ADR-0082, migration *_tl_van_nghia): CHỈ-THÊM. Đọc theo danh sách khoá bằng MỘT tham số JSON (json_each — câu tĩnh, không đụng trần số tham số
// của D1); ghi MỘT dòng mỗi câu (5 tham số) bằng ON CONFLICT(khoa) DO NOTHING — nhiều câu hỏi đồng thời cùng tính bù không lỗi, không trùng (cấm OR REPLACE:
// REPLACE xoá dòng xung đột mà không chạy trigger chặn DELETE — hàng rào ở van-nghia.test.ts).
const VAN_NGHIA_THEO_KHOA = defineSql(
  "tro-ly",
  "van-nghia-theo-khoa",
  "SELECT khoa, so_chieu, vec FROM tl_van_nghia WHERE khoa IN (SELECT value FROM json_each(?1))",
);
const THEM_VAN_NGHIA = defineSql(
  "tro-ly",
  "them-van-nghia",
  "INSERT INTO tl_van_nghia (khoa, mau, so_chieu, vec, created_at, created_by, updated_at, updated_by) VALUES (?1, ?2, ?3, ?4, ?5, NULL, ?5, NULL) ON CONFLICT(khoa) DO NOTHING",
);

/** `vec` giữ NGUYÊN dạng D1 trả (ArrayBuffer / Uint8Array / mảng số) — giải mã ở blobSangVec. */
export interface DongVanNghia { readonly khoa: string; readonly soChieu: number; readonly vec: unknown }
export async function docVanNghia(db: D1Database, khoa: readonly string[]): Promise<DongVanNghia[]> {
  if (!khoa.length) return [];
  const r = await db.prepare(VAN_NGHIA_THEO_KHOA).bind(JSON.stringify(khoa)).all<{ khoa: string; so_chieu: number; vec: unknown }>();
  return r.results.map((x) => ({ khoa: x.khoa, soChieu: x.so_chieu, vec: x.vec }));
}

/** `vec` là byte float32 do vecSangBlob (src/shared/tro-ly-van-nghia.ts) dựng — MỘT chỗ đổi dạng bind (Uint8Array ↔ ArrayBuffer) nếu e2e D1 thật đòi. */
export interface VanNghiaMoi { readonly khoa: string; readonly mau: string; readonly soChieu: number; readonly vec: Uint8Array }
export const vanNghiaStatement = (db: D1Database, v: VanNghiaMoi, at: string): D1PreparedStatement =>
  db.prepare(THEM_VAN_NGHIA).bind(v.khoa, v.mau, v.soChieu, v.vec, at);
/** Gom `lo` câu một db.batch (mỗi lô nguyên tử; dòng nào cũng trọn vẹn — không có "dòng dở"). */
export async function ghiVanNghia(db: D1Database, ds: readonly VanNghiaMoi[], at: string, lo: number): Promise<void> {
  for (let i = 0; i < ds.length; i += lo) await db.batch(ds.slice(i, i + lo).map((v) => vanNghiaStatement(db, v, at)));
}
