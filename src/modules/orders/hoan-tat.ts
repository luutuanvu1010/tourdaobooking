// Dữ liệu và câu lệnh CHƯA CHẠY mà `orders` công bố cho hai bước chốt đơn của billing (sổ tiền lượt 1 — ADR-0024 điều 3–4, ADR-0025). `orders` giữ sự thật
// "đơn đã chốt" (hai cột mốc) và "phải thu hiện hành" (một cách tính tiền của đơn — Hiến chương 5.4); billing giữ tiền đã thu. Tệp này KHÔNG đọc bảng của
// billing (ADR-0024 điều 4).
import { computeEffectiveMoney, getLatestAdjustments } from "./repository";
import { confirmedOpenIds, giaoState, moneyBaseMany, serviceDates, type MoneyBaseRow } from "./hoan-tat-repo";

/**
 * "Phải thu hiện hành" = tổng khách phải trả SAU điều chỉnh số khách — đi qua `computeEffectiveMoney` → `effectiveMoney` (MỘT hàm phải thu, cùng đường với chi tiết
 * đơn / danh sách / Trang chủ — ADR-0109 QĐ1; bài tĩnh `src/phai-thu-mot-ham.test.ts`). KHÔNG tự trừ giảm giá ở đây (TNV-G1 từng trích đúng chỗ này).
 */
async function phaiThuCua(db: D1Database, rows: readonly Pick<MoneyBaseRow, "id" | "discount" | "total">[]): Promise<Map<string, number>> {
  const latest = await getLatestAdjustments(db, rows.map((r) => r.id));
  const tien = await computeEffectiveMoney(db, rows, latest);
  const out = new Map<string, number>();
  for (const r of rows) out.set(r.id, tien.get(r.id)!.total);
  return out;
}

export interface ThongTinGiaoDon {
  orderId: string;
  status: "draft" | "confirmed" | "cancelled";
  ownerId: string;
  updatedAt: string;
  deliveredAt: string | null;
  completedAt: string | null;
  /** Số thứ tự dòng điều chỉnh mới nhất (0 = chưa có) — khoá lạc quan của câu "Đã giao" (R3). */
  adjSeq: number;
  ngayDi: (string | null)[];
  dichVuThieuNgay: string[];
  phaiThu: number;
}

/** Trạng thái một đơn cho "Đã giao" / "Hoàn thành" (null = không có đơn). KHÔNG tự kiểm quyền — route của billing hỏi `can()` trước. */
export async function thongTinGiaoDon(db: D1Database, orderId: string): Promise<ThongTinGiaoDon | null> {
  const [row, dates] = await Promise.all([giaoState(db, orderId), serviceDates(db, orderId)]);
  if (!row) return null;
  const phaiThu = (await phaiThuCua(db, [row])).get(row.id)!;
  return {
    orderId: row.id,
    status: row.status,
    ownerId: row.staff_id,
    updatedAt: row.updated_at,
    deliveredAt: row.delivered_at,
    completedAt: row.completed_at,
    adjSeq: row.adj_seq,
    ngayDi: dates.map((d) => d.depart_date),
    dichVuThieuNgay: dates.filter((d) => d.depart_date === null).map((d) => d.name),
    phaiThu,
  };
}

export interface PhaiThuDon {
  phaiThu: number;
  status: "draft" | "confirmed" | "cancelled";
  deliveredAt: string | null;
  completedAt: string | null;
  /** Ngày đi sớm nhất của đơn (null = chưa dịch vụ nào có ngày) — ô "Còn thiếu tiền" của Trang chủ. */
  ngayDiSomNhat: string | null;
}
/** "Phải thu hiện hành" + mốc của nhiều đơn (id lạ: không có trong Map). Rỗng → không truy vấn. */
export async function phaiThuNhieuDon(db: D1Database, orderIds: readonly string[]): Promise<Map<string, PhaiThuDon>> {
  const rows = await moneyBaseMany(db, orderIds);
  const tien = await phaiThuCua(db, rows);
  return new Map(rows.map((r) => [r.id, { phaiThu: tien.get(r.id)!, status: r.status, deliveredAt: r.delivered_at, completedAt: r.completed_at, ngayDiSomNhat: r.earliest_depart }]));
}

/** Mọi đơn đã xác nhận chưa "Đã giao" kèm phải thu (ô "Còn thiếu tiền" của Trang chủ — billing trừ tiền đã thu). */
export async function donDangThuTien(db: D1Database): Promise<Map<string, PhaiThuDon>> {
  return phaiThuNhieuDon(db, await confirmedOpenIds(db));
}
