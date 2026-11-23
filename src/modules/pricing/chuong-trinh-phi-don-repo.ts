// SQL của CHƯƠNG TRÌNH MIỄN PHÍ ĐƯA ĐÓN (ADR-0218 Đ2; migration 0178): `prc_transfer_fee_program` + `prc_transfer_fee_program_scope`. Module nghiêm: câu TĨNH qua `defineSql`, tham số ?N.
// Tên đối tác đọc qua view công bố `v_pty_party_label`; tên dịch vụ do route lấy từ `catalog` (không đọc bảng của catalog ở đây). Import kèm đuôi .ts, không import index.ts.
import { defineSql } from "../../shared/sql-registry.ts";
import type { ChuongTrinh } from "./chuong-trinh-phi-don-rules.ts";

export interface DongChuongTrinh extends ChuongTrinh { ketThucLuc: string | null; doiTac: { id: string; name: string }[] }
interface Hang {
  id: string; name: string; scope: "ALL" | "SERVICES" | "PARTNERS"; trip_from: string; trip_to: string; include_private: number; created_at: string; ended_at: string | null;
  catalog_code: string | null; party_id: string | null; party_name: string | null;
}

// Một câu LEFT JOIN: chương trình + phạm vi + tên hồ sơ. ?1 = mốc ISO: lấy chương trình chưa kết thúc, hoặc kết thúc sau mốc.
const TU_MOC = defineSql("pricing", "transfer_program_from",
  `SELECT p.id, p.name, p.scope, p.trip_from, p.trip_to, p.include_private, p.created_at, p.ended_at, s.catalog_code, s.party_id, l.display_name AS party_name
   FROM prc_transfer_fee_program p
   LEFT JOIN prc_transfer_fee_program_scope s ON s.program_id = p.id
   LEFT JOIN v_pty_party_label l ON l.id = s.party_id
   WHERE p.ended_at IS NULL OR p.ended_at > ?1
   ORDER BY p.created_at, p.id, s.catalog_code, s.party_id`);

function gom(hang: readonly Hang[]): DongChuongTrinh[] {
  const ra = new Map<string, DongChuongTrinh>();
  for (const h of hang) {
    let c = ra.get(h.id);
    if (!c) {
      c = { id: h.id, name: h.name, scope: h.scope, tripFrom: h.trip_from, tripTo: h.trip_to, includePrivate: h.include_private === 1, createdAt: h.created_at, services: [], parties: [], ketThucLuc: h.ended_at, doiTac: [] };
      ra.set(h.id, c);
    }
    if (h.catalog_code !== null) (c.services as string[]).push(h.catalog_code);
    if (h.party_id !== null) {
      (c.parties as string[]).push(h.party_id);
      c.doiTac.push({ id: h.party_id, name: h.party_name ?? "" });
    }
  }
  return [...ra.values()];
}

/** Chương trình còn hiệu lực tại mốc `luc` (ISO UTC): chưa kết thúc, hoặc kết thúc sau `luc`. Có hiệu lực ngay khi tạo. */
export async function chuongTrinhPhiDonHieuLuc(db: D1Database, luc: string): Promise<DongChuongTrinh[]> {
  return gom((await db.prepare(TU_MOC).bind(luc).all<Hang>()).results);
}
/** Cho màn quản lý: chương trình còn hiệu lực + chương trình đã kết thúc từ `tuLuc` (ISO) trở đi. */
export async function chuongTrinhPhiDonDanhSach(db: D1Database, tuLuc: string): Promise<DongChuongTrinh[]> {
  return gom((await db.prepare(TU_MOC).bind(tuLuc).all<Hang>()).results);
}

const THEO_ID = defineSql("pricing", "transfer_program_by_id",
  `SELECT p.id, p.name, p.scope, p.trip_from, p.trip_to, p.include_private, p.created_at, p.ended_at, s.catalog_code, s.party_id, l.display_name AS party_name
   FROM prc_transfer_fee_program p
   LEFT JOIN prc_transfer_fee_program_scope s ON s.program_id = p.id
   LEFT JOIN v_pty_party_label l ON l.id = s.party_id
   WHERE p.id = ?1 ORDER BY s.catalog_code, s.party_id`);
export async function chuongTrinhPhiDonTheoId(db: D1Database, id: string): Promise<DongChuongTrinh | null> {
  return gom((await db.prepare(THEO_ID).bind(id).all<Hang>()).results)[0] ?? null;
}

const HO_SO_CO = defineSql("pricing", "transfer_program_party_exists", `SELECT id FROM v_pty_party_label WHERE id IN (SELECT value FROM json_each(?1))`);
/** Trong các hồ sơ cho trước, những hồ sơ có thật. */
export async function hoSoCoThat(db: D1Database, ids: readonly string[]): Promise<Set<string>> {
  if (!ids.length) return new Set();
  return new Set((await db.prepare(HO_SO_CO).bind(JSON.stringify(ids)).all<{ id: string }>()).results.map((r) => r.id));
}

const THEM = defineSql("pricing", "transfer_program_insert",
  `INSERT INTO prc_transfer_fee_program (id, name, scope, trip_from, trip_to, include_private, created_at, created_by, updated_at, updated_by)
   VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?7, ?8)`);
export const cauThemChuongTrinh = (db: D1Database, v: { id: string; name: string; scope: string; tripFrom: string; tripTo: string; includePrivate: boolean; at: string; by: string }): D1PreparedStatement =>
  db.prepare(THEM).bind(v.id, v.name, v.scope, v.tripFrom, v.tripTo, v.includePrivate ? 1 : 0, v.at, v.by);

const THEM_PHAM_VI = defineSql("pricing", "transfer_program_scope_insert",
  `INSERT INTO prc_transfer_fee_program_scope (program_id, catalog_code, party_id, created_at, created_by, updated_at, updated_by) VALUES (?1, ?2, ?3, ?4, ?5, ?4, ?5)`);
export const cauThemPhamViChuongTrinh = (db: D1Database, v: { programId: string; catalogCode: string | null; partyId: string | null; at: string; by: string }): D1PreparedStatement =>
  db.prepare(THEM_PHAM_VI).bind(v.programId, v.catalogCode, v.partyId, v.at, v.by);

const KET_THUC = defineSql("pricing", "transfer_program_end",
  `UPDATE prc_transfer_fee_program SET ended_at = ?2, ended_by = ?3, updated_at = ?2, updated_by = ?3 WHERE id = ?1 AND ended_at IS NULL`);
export const cauKetThucChuongTrinh = (db: D1Database, v: { id: string; at: string; by: string }): D1PreparedStatement => db.prepare(KET_THUC).bind(v.id, v.at, v.by);
