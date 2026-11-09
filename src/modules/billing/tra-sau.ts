// Trả sau theo hạn mức — phần điều phối của billing (ADR-0168 Đ1, Đ2). Số nợ KHÔNG lưu cột: tính bằng JS từ số thật (phải thu hiện hành do `tienNhieuDon`, khoản thu, dòng sổ, dấu đối chiếu),
// một lượt cho cả danh sách đơn (không truy vấn lặp theo từng đơn). Luật thuần ở src/shared/tra-sau.ts. KHÔNG tự kiểm quyền — route hỏi `can(` trước.
import { lyDoKhongTraSau, noMotDon, quaHan, trangThaiHan, type HanMucHieuLuc, type KetQuaKiemTraSau, type TrangThaiHan } from "../../shared/tra-sau";
import { addDays, vnToday } from "../../shared/vn-date";
import { soChuaVeCongTy, type DoiChieuRow, type LineRow } from "./rules";
import { phanKhaiCuaDon } from "./khoan-khai";
import { ownerCompanyId, receiptsOfOrders } from "./repository";
import { tienNhieuDon, toReceiptRow } from "./service";
import {
  benCoDonTraSau, dongCuaCacDon, doiChieuCuaCacDon, donTraSauCuaCacBen, donTraSauTheoId, hanMucRowMoiBen, hanMucRowTai, phienBanHienTai,
  type DonTraSauRow, type HanMucRow,
} from "./tra-sau-repo";

const toHanMuc = (r: HanMucRow): HanMucHieuLuc => ({ hanMuc: r.limit_amount, gioTra: r.term_hours ?? r.term_days * 24, gioAnHan: r.grace_hours, tuNgay: r.valid_from_date, denNgay: r.valid_to_date });

/** `hanTra`, `hetAnHan`: mốc ISO UTC (ADR-0172 Đ3 mục 2). `trangThai` tính tại `bayGio` của lời gọi. */
export interface DonNo { orderId: string; maDon: string; hanTra: string | null; hetAnHan: string | null; no: number; trangThai: TrangThaiHan }
/** `coDonQuaHan` = có đơn đã HẾT ÂN HẠN còn nợ (nghĩa chặn); đơn trong ân hạn không tính. */
export interface NoBenDat { tong: number; don: DonNo[]; coDonQuaHan: boolean }
const bayGioMacDinh = (): string => new Date().toISOString();

/** Nợ từng đơn Trả sau đã xác nhận (ADR-0168 Đ2 mục 2): phải thu − số đã về công ty, trong đó số đã về công ty không gồm khoản đang đối chiếu và khoản bên đặt tự thu mà chưa nộp. */
export async function noTheoDon(db: D1Database, dons: readonly DonTraSauRow[]): Promise<Map<string, number>> {
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
    // ADR-0171 / ADR-0168 Đ2 mục 2: nợ tính bằng ĐÚNG hàm mở vé `soChuaVeCongTy` (một bản, không viết hai) với người lập = BÊN ĐẶT; khoản khai đặt cọc và phần chuyển từ đơn huỷ gộp vào cùng lượt.
    const khai = await phanKhaiCuaDon(db, rcTheoDon.get(d.id) ?? [], new Set([d.id]));
    const v = congTyId ? soChuaVeCongTy({ receipts: rs, lines: ls, doiChieu: dc, nguoiLapPartyId: d.booker_party_id ?? "", congTyId, khaiThem: khai }) : { nguoiLapGiu: t.daThu, choXacNhan: 0 }; // không đọc được công ty ⇒ coi như chưa về (không mở)
    out.set(d.id, noMotDon({ daHuy: d.status === "cancelled", phaiThu: t.phaiThu, daThuRong: t.daThu, dangDoiChieu: v.choXacNhan, benDatDangGiu: v.nguoiLapGiu }));
  }
  return out;
}

/** Nợ của NHIỀU bên đặt cùng lúc (màn danh sách): số câu truy vấn không phụ thuộc số đơn. */
export async function noCacBenDat(db: D1Database, partyIds: readonly string[], bayGio: string = bayGioMacDinh()): Promise<Map<string, NoBenDat>> {
  const dons = await donTraSauCuaCacBen(db, partyIds);
  const no = await noTheoDon(db, dons);
  const out = new Map<string, NoBenDat>(partyIds.map((p) => [p, { tong: 0, don: [], coDonQuaHan: false }]));
  for (const d of dons) {
    const n = no.get(d.id) ?? 0;
    if (n <= 0 || d.booker_party_id === null) continue;
    const b = out.get(d.booker_party_id)!;
    b.tong += n;
    const moc = { hanTra: d.credit_due_at, hetAnHan: d.credit_grace_until, bayGio, no: n };
    b.don.push({ orderId: d.id, maDon: d.order_code, hanTra: d.credit_due_at, hetAnHan: d.credit_grace_until, no: n, trangThai: trangThaiHan(moc) });
    if (quaHan(moc)) b.coDonQuaHan = true;
  }
  return out;
}
export const noCuaBenDat = async (db: D1Database, partyId: string, bayGio: string = bayGioMacDinh()): Promise<NoBenDat> =>
  (await noCacBenDat(db, [partyId], bayGio)).get(partyId)!;

/** Hạn trả và nợ của MỘT đơn; `null` = đơn không phải Trả sau. */
export async function traSauCuaDon(db: D1Database, orderId: string): Promise<{ hanTra: string | null; hetAnHan: string | null; no: number; benDat: string | null; version: number } | null> {
  const d = await donTraSauTheoId(db, orderId);
  if (!d) return null;
  // Phiên bản của bên đặt đọc TRƯỚC khi tính nợ (khuôn `kiemTraSau`): đường đổi bên đặt gác đúng số này trong lô, nên khoản thu bị đảo chen giữa làm lô thua.
  const version = d.booker_party_id ? await phienBanHienTai(db, d.booker_party_id) : 0;
  return { hanTra: d.credit_due_at, hetAnHan: d.credit_grace_until, no: (await noTheoDon(db, [d])).get(d.id) ?? 0, benDat: d.booker_party_id, version };
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
export async function kiemTraSau(db: D1Database, i: { benDat: string; soTienDon: number; boQuaDon?: string; bayGio?: string; loai?: "sua_tang" | "doi_ben" }): Promise<KetQuaKiemTraSau> {
  const bayGio = i.bayGio ?? bayGioMacDinh();
  const version = await phienBanHienTai(db, i.benDat);
  const [hanMuc, no] = await Promise.all([hanMucHieuLuc(db, i.benDat, vnToday(new Date(bayGio))), noCuaBenDat(db, i.benDat, bayGio)]);
  const cuaDon = i.boQuaDon ? no.don.find((d) => d.orderId === i.boQuaDon)?.no ?? 0 : 0;
  const ly = lyDoKhongTraSau({ hanMuc, noHienTai: no.tong - cuaDon, soTienDon: i.soTienDon, coDonQuaHan: no.coDonQuaHan, ...(i.loai ? { loai: i.loai } : {}) });
  if (ly) return { ok: false, ma: ly.ma, cau: ly.cau };
  return { ok: true, hanMuc: hanMuc!, version };
}

export { cauGacPhienBan, cauTangPhienBan } from "./tra-sau-gac";

/** Ngày hôm qua theo giờ Việt Nam — ngày kết thúc của dòng hạn mức bị thay hoặc ngừng (hạn mức hết hiệu lực từ hôm nay). */
export const homQua = (homNay: string): string => addDays(homNay, -1);
