import type { StaffRole } from "../../shared/contracts";

export interface StaffRecord {
  id: string;
  full_name: string;
  phone: string;
  pin_hash: string;
  role: StaffRole;
  active: number;
  created_at: string;
  credentials_changed_at: number | null;
}

export function findByPhone(db: D1Database, phone: string): Promise<StaffRecord | null> {
  return db.prepare("SELECT * FROM staff WHERE phone = ?").bind(phone).first<StaffRecord>();
}

export function findById(db: D1Database, id: string): Promise<StaffRecord | null> {
  return db.prepare("SELECT * FROM staff WHERE id = ?").bind(id).first<StaffRecord>();
}

export async function listAll(db: D1Database): Promise<StaffRecord[]> {
  const { results } = await db.prepare("SELECT * FROM staff ORDER BY active DESC, full_name COLLATE NOCASE, created_at").all<StaffRecord>();
  return results;
}

export async function countActiveAdmins(db: D1Database): Promise<number> {
  const row = await db.prepare("SELECT count(*) AS n FROM staff WHERE role = 'admin' AND active = 1").first<{ n: number }>();
  return row?.n ?? 0;
}
