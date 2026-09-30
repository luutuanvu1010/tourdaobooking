// SQL của module tro-ly (bảng tl_luot_hoi, tl_cai_dat — migration 0050, ADR-0066). Module NGHIÊM: mọi câu đi qua defineSql, TĨNH, import đuôi .ts.
// Cả hai bảng CHỈ THÊM (trigger chặn UPDATE/DELETE) — ở đây chỉ có SELECT và INSERT. Không cột nội dung câu hỏi / câu trả lời (ADR-0066 điều 7).
import { defineSql } from "../../shared/sql-registry.ts";
import type { CaiDatTroLy } from "../../shared/tro-ly.ts";

const CAI_DAT = defineSql(
  "tro-ly",
  "cai-dat-hien-hanh",
  "SELECT bat, tran_thang_micro_usd, tran_ngay FROM tl_cai_dat ORDER BY valid_from_at DESC, created_at DESC, id DESC LIMIT 1",
);
// Trần ngày đếm câu đã tới bước hỏi (ok, loi) của NGƯỜI đó trong ngày VN; dòng het_tran (bị chặn) không tính.
const DEM_HOM_NAY = defineSql(
  "tro-ly",
  "dem-hom-nay",
  "SELECT count(*) AS n FROM tl_luot_hoi WHERE staff_id = ?1 AND ngay_vn = ?2 AND ket_qua <> 'het_tran'",
);
// Trần tháng: tổng chi phí của CẢ công ty trong tháng dương lịch VN (khoảng ngày theo chuỗi YYYY-MM-DD).
const TONG_THANG = defineSql(
  "tro-ly",
  "tong-thang",
  "SELECT COALESCE(SUM(chi_phi_micro_usd), 0) AS tong, COALESCE(SUM(CASE WHEN ket_qua <> 'het_tran' THEN 1 ELSE 0 END), 0) AS so FROM tl_luot_hoi WHERE ngay_vn >= ?1 AND ngay_vn <= ?2",
);
const GHI_LUOT = defineSql(
  "tro-ly",
  "ghi-luot",
  "INSERT INTO tl_luot_hoi (id, staff_id, ngay_vn, token_vao, token_vao_dem, token_ra, chi_phi_micro_usd, ket_qua, created_at, created_by, updated_at, updated_by) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?2, ?9, ?2)",
);
const THEM_CAI_DAT = defineSql(
  "tro-ly",
  "them-cai-dat",
  "INSERT INTO tl_cai_dat (id, bat, tran_thang_micro_usd, tran_ngay, valid_from_at, created_at, created_by, updated_at, updated_by) VALUES (?1, ?2, ?3, ?4, ?5, ?5, ?6, ?5, ?6)",
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

export async function tongThang(db: D1Database, tu: string, den: string): Promise<{ tong: number; so: number }> {
  const r = await db.prepare(TONG_THANG).bind(tu, den).first<{ tong: number; so: number }>();
  return { tong: r?.tong ?? 0, so: r?.so ?? 0 };
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
  at: string;
}

export async function ghiLuot(db: D1Database, l: LuotHoi): Promise<void> {
  await db.prepare(GHI_LUOT).bind(l.id, l.staffId, l.ngayVn, l.vao, l.vaoDem, l.ra, l.chiPhi, l.ketQua, l.at).run();
}

export async function themCaiDat(db: D1Database, c: CaiDatTroLy, at: string, by: string): Promise<void> {
  await db.prepare(THEM_CAI_DAT).bind(crypto.randomUUID(), c.bat ? 1 : 0, c.tranThangMicroUsd, c.tranNgay, at, by).run();
}
