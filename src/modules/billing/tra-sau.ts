// Trả sau theo hạn mức — phần điều phối của billing (ADR-0168 Đ1, Đ2). Số nợ KHÔNG lưu cột: tính bằng JS từ số thật (phải thu hiện hành do `tienNhieuDon`, khoản thu, dòng sổ, dấu đối chiếu),
// một lượt cho cả danh sách đơn (không truy vấn lặp theo từng đơn). Luật thuần ở src/shared/tra-sau.ts. KHÔNG tự kiểm quyền — route hỏi `can(` trước.
import { lyDoKhongTraSau, noMotDon, quaHan, type HanMucHieuLuc, type KetQuaKiemTraSau } from "../../shared/tra-sau";
import { addDays, vnToday } from "../../shared/vn-date";
import { hieuLuc, khoanChoXacNhan, soKhaiChuaNop, type DoiChieuRow, type LineRow } from "./rules";
import { ownerCompanyId, receiptsOfOrders } from "./repository";
import { tienNhieuDon, toReceiptRow } from "./service";
import {
  benCoDonTraSau, dongCuaCacDon, doiChieuCuaCacDon, donTraSauCuaCacBen, donTraSauTheoId, hanMucRowMoiBen, hanMucRowTai, phienBanHienTai,
  type DonTraSauRow, type HanMucRow,
} from "./tra-sau-repo";

const toHanMuc = (r: HanMucRow): HanMucHieuLuc => ({ hanMuc: r.limit_amount, soNgay: r.term_days, tuNgay: r.valid_from_date, denNgay: r.valid_to_date });

export interface DonNo { orderId: string; maDon: string; hanTra: string | null; no: number }
export interface NoBenDat { tong: number; don: DonNo[]; coDonQuaHan: boolean }

/** Nợ từng đơn Trả sau đã xác nhận (ADR-0168 Đ2 mục 2): phải thu − số đã về công ty, trong đó số đã về công ty không gồm khoản đang đối chiếu và khoản bên đặt tự thu mà chưa nộp. */
async function noTheoDon(db: D1Database, dons: readonly DonTraSauRow[]): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  if (dons.length === 0) return out;
  const ids = dons.map((d) => d.id);
  const [tien, receipts, lines, recon, congTyId] = await Promise.all([tienNhieuDon(db, ids), receiptsOfOrders(db, ids), dongCuaCacDon(db, ids), doiChieuCuaCacDon(db, ids), ownerCompanyId(db)]);
  const nhom = <T extends { order_id: string }>(rows: readonly T[]): Map<string, T[]> => {
    const m = new Map<string, T[]>();
    for (const r of rows) m.set(r.order_id, [...(m.get(r.order_id) ?? []), r]);
    return m;
  };
  const rcTheoDon = nhom(receipts);
  const lnTheoDon = nhom(lines);
  const dcTheoDon = nhom(recon);
  for (const d of dons) {
    const t = tien.get(d.id);
    if (!t) continue;
    const rs = (rcTheoDon.get(d.id) ?? []).map(toReceiptRow);
    const ls: LineRow[] = (lnTheoDon.get(d.id) ?? []).map((l) => ({
      id: l.id, debtorPartyId: l.debtor_party_id, creditorPartyId: l.creditor_party_id, amount: l.amount, kind: l.kind_code as LineRow["kind"], orderId: l.order_id, receiptId: l.receipt_id, reversesLineId: l.reverses_line_id,
    }));
    const dc: DoiChieuRow[] = (dcTheoDon.get(d.id) ?? []).map((x) => ({ receiptId: x.receipt_id, kind: x.kind_code, occurredDate: x.occurred_date }));
    const cho = khoanChoXacNhan(rs, ls, dc);
    const thu = hieuLuc(rs).filter((r) => r.kind === "CUSTOMER_PAYMENT");
    const dangDoiChieu = thu.filter((r) => cho.has(r.id)).reduce((s, r) => s + r.amount, 0);
    // Tiền bên đặt tự thu mà chưa nộp về công ty: cùng hàm với «khai đặt cọc chưa nộp» của vé (ADR-0159 Đ2 mục 2) — số dư mọi loại dòng của đơn, kẹp theo số họ đã thu.
    const khoan = thu.filter((r) => !cho.has(r.id) && d.booker_party_id !== null && r.collectorPartyId === d.booker_party_id).map((r) => ({ collectorPartyId: r.collectorPartyId, soTien: r.amount }));
    const benDatDangGiu = khoan.length === 0 ? 0 : congTyId ? soKhaiChuaNop(khoan, ls, congTyId) : khoan.reduce((s, k) => s + k.soTien, 0);
    out.set(d.id, noMotDon({ daHuy: d.status === "cancelled", phaiThu: t.phaiThu, daThuRong: t.daThu, dangDoiChieu, benDatDangGiu }));
  }
  return out;
}

/** Nợ của NHIỀU bên đặt cùng lúc (màn danh sách): số câu truy vấn không phụ thuộc số đơn. */
export async function noCacBenDat(db: D1Database, partyIds: readonly string[], homNay: string = vnToday(new Date())): Promise<Map<string, NoBenDat>> {
  const dons = await donTraSauCuaCacBen(db, partyIds);
  const no = await noTheoDon(db, dons);
  const out = new Map<string, NoBenDat>(partyIds.map((p) => [p, { tong: 0, don: [], coDonQuaHan: false }]));
  for (const d of dons) {
    const n = no.get(d.id) ?? 0;
    if (n <= 0 || d.booker_party_id === null) continue;
    const b = out.get(d.booker_party_id)!;
    b.tong += n;
    b.don.push({ orderId: d.id, maDon: d.order_code, hanTra: d.credit_due_date, no: n });
    if (quaHan(d.credit_due_date, homNay, n)) b.coDonQuaHan = true;
  }
  return out;
}
export const noCuaBenDat = async (db: D1Database, partyId: string, homNay: string = vnToday(new Date())): Promise<NoBenDat> =>
  (await noCacBenDat(db, [partyId], homNay)).get(partyId)!;

/** Hạn trả và nợ của MỘT đơn; `null` = đơn không phải Trả sau. */
export async function traSauCuaDon(db: D1Database, orderId: string): Promise<{ hanTra: string | null; no: number } | null> {
  const d = await donTraSauTheoId(db, orderId);
  if (!d) return null;
  return { hanTra: d.credit_due_date, no: (await noTheoDon(db, [d])).get(d.id) ?? 0 };
}

export async function hanMucHieuLuc(db: D1Database, partyId: string, ngay: string = vnToday(new Date())): Promise<HanMucHieuLuc | null> {
  const r = await hanMucRowTai(db, partyId, ngay);
  return r ? toHanMuc(r) : null;
}
export async function hanMucMoiBen(db: D1Database, ngay: string = vnToday(new Date())): Promise<Map<string, HanMucHieuLuc>> {
  return new Map((await hanMucRowMoiBen(db, ngay)).map((r) => [r.party_id, toHanMuc(r)]));
}
/** Hồ sơ có hạn mức đang hiệu lực HOẶC còn đơn Trả sau đã xác nhận (hạ hoặc ngừng hạn mức khi đang nợ vẫn phải hiện — ADR-0168 Hệ quả). */
export async function benCoLienQuanTraSau(db: D1Database, ngay: string = vnToday(new Date())): Promise<string[]> {
  const [han, co] = await Promise.all([hanMucMoiBen(db, ngay), benCoDonTraSau(db)]);
  return [...new Set([...han.keys(), ...co])];
}

/**
 * Cổng hạn mức (ADR-0168 Đ2 mục 3): có hạn mức hiệu lực, không đơn quá hạn còn nợ, nợ + đơn này không vượt hạn mức. Đọc PHIÊN BẢN TRƯỚC khi tính nợ: mọi lệnh làm tăng nợ
 * sau đó đều tăng phiên bản, nên lô gác `cauGacPhienBan` của lệnh này sẽ hỏng nếu có ai chen vào. `boQuaDon` = đơn đang xét (khỏi tính nợ của chính nó hai lần).
 */
export async function kiemTraSau(db: D1Database, i: { benDat: string; soTienDon: number; boQuaDon?: string; homNay?: string }): Promise<KetQuaKiemTraSau> {
  const homNay = i.homNay ?? vnToday(new Date());
  const version = await phienBanHienTai(db, i.benDat);
  const [hanMuc, no] = await Promise.all([hanMucHieuLuc(db, i.benDat, homNay), noCuaBenDat(db, i.benDat, homNay)]);
  const cuaDon = i.boQuaDon ? no.don.find((d) => d.orderId === i.boQuaDon)?.no ?? 0 : 0;
  const ly = lyDoKhongTraSau({ hanMuc, noHienTai: no.tong - cuaDon, soTienDon: i.soTienDon, coDonQuaHan: no.coDonQuaHan });
  if (ly) return { ok: false, ma: ly.ma, cau: ly.cau };
  return { ok: true, hanMuc: hanMuc!, version };
}

export { cauGacPhienBan, cauTangPhienBan } from "./tra-sau-gac";

/** Ngày hôm qua theo giờ Việt Nam — ngày kết thúc của dòng hạn mức bị thay hoặc ngừng (hạn mức hết hiệu lực từ hôm nay). */
export const homQua = (homNay: string): string => addDays(homNay, -1);
