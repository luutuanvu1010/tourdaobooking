// Phần nghiệp vụ «Công nợ đại lý» (ADR-0182 Đ1 mục 9): MỘT chỗ giữ công thức, mọi màn (hạn mức, Trả sau của tôi, danh sách nợ, nhắc hạn, cổng huỷ, phiếu công nợ) gọi tới đây.
//   Tổng công nợ = Σ giá đại lý từng dòng (orders `giaDaiLyNhieuDon` — bản chụp lúc xác nhận, dòng thiếu mức tính giá bán lẻ, không kẹp âm).
//   Đã thu      = tiền Tour Đảo thật sự đã nhận: tổng khoản thu còn hiệu lực − khoản đang đối chiếu − phần bên đặt / người thu khác còn giữ (cùng hàm mở vé `soChuaVeCongTy`),
//                 trong đó «còn giữ» tính trên dòng sổ TIỀN (bỏ ba loại dòng thương mại): hoa hồng đã trừ trong Tổng công nợ, tính thêm ở đây là trừ hai lần sau «Khách đã trả đủ».
//   Công nợ còn lại = Tổng công nợ − Đã thu (âm = Tour Đảo nợ đại lý, Đ1 mục 7).
// Đơn KHÔNG phải đơn đại lý giữ cách tính cũ (phải thu − đã về, ADR-0168 Đ2 mục 2). Số tiền chỉ tính ở máy chủ. KHÔNG tự kiểm quyền — route hỏi `can(` trước.
import { noMotDon } from "../../shared/tra-sau";
import { giaDaiLyNhieuDon, type DongGiaDaiLy } from "../orders";
import { LOAI_DONG_THUONG_MAI, soChuaVeCongTy, soKhaiChuaNop, type DoiChieuRow, type LineRow } from "./rules";
import { phanKhaiCuaDon } from "./khoan-khai";
import { ownerCompanyId, receiptsOfOrders } from "./repository";
import { tienNhieuDon, toReceiptRow } from "./service";
import { dongCuaCacDon, doiChieuCuaCacDon, donTraSauTheoId } from "./tra-sau-repo";

/** Đơn cần tính: `booker_party_id` là «người lập» của hàm mở vé (ADR-0171); `status` để áp luật đơn huỷ. */
export interface DonCongNo { id: string; booker_party_id: string | null; status: string }

/** Phiếu công nợ của MỘT đơn đại lý (ADR-0182 Đ2 mục 2). */
export interface PhieuCongNo { dong: DongGiaDaiLy[]; tong: number; daThu: number; conLai: number }

/** Số của một đơn sau lượt tính. `no` = số nợ dùng cho hạn mức / cổng huỷ / nhắc hạn: ≥ 0, đơn huỷ 0 (ADR-0168 Đ3 — một đơn âm không bù đơn khác). */
export interface KetQuaCongNo { no: number; cocConGiu: number; phieu: PhieuCongNo | null }

/** Luật thuần: Đã thu và Công nợ còn lại từ các số đã đọc. Đã thu không âm; Còn lại giữ dấu. */
export function tinhConLai(i: { tong: number; daThuRong: number; dangDoiChieu: number; conGiu: number }): { daThu: number; conLai: number } {
  const daThu = Math.max(0, i.daThuRong - i.dangDoiChieu - i.conGiu);
  return { daThu, conLai: i.tong - daThu };
}

/**
 * Công nợ của NHIỀU đơn trong CÙNG một lượt (số câu không phụ thuộc số đơn, trừ đường khoản khai chuyển từ đơn huỷ — `phanKhaiCuaDon`). Cọc còn ở tay người thu (ADR-0197 Đ4) tính chung lượt,
 * trên MỌI dòng sổ như cũ (`soKhaiChuaNop`, đúng hàm của cổng khai lại `dat-coc.ts`).
 */
export async function congNoNhieuDon(db: D1Database, dons: readonly DonCongNo[]): Promise<Map<string, KetQuaCongNo>> {
  const out = new Map<string, KetQuaCongNo>();
  if (dons.length === 0) return out;
  const ids = dons.map((d) => d.id);
  const [tien, receipts, lines, recon, congTyId, gia] = await Promise.all([
    tienNhieuDon(db, ids), receiptsOfOrders(db, ids), dongCuaCacDon(db, ids), doiChieuCuaCacDon(db, ids), ownerCompanyId(db), giaDaiLyNhieuDon(db, ids),
  ]);
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
    // ADR-0171 / ADR-0168 Đ2 mục 2: ĐÚNG hàm mở vé `soChuaVeCongTy` (một bản, không viết hai) với người lập = BÊN ĐẶT; khoản khai đặt cọc và phần chuyển từ đơn huỷ gộp vào cùng lượt.
    const khai = await phanKhaiCuaDon(db, rcTheoDon.get(d.id) ?? [], new Set([d.id]));
    const cocConGiu = congTyId ? soKhaiChuaNop(khai, ls, congTyId) : khai.reduce((s, k) => s + k.soTien, 0); // không đọc được công ty chủ ⇒ coi cả phần khai là còn giữ (chặt hơn)
    const ve = (dong: readonly LineRow[]) => congTyId
      ? soChuaVeCongTy({ receipts: rs, lines: dong, doiChieu: dc, nguoiLapPartyId: d.booker_party_id ?? "", congTyId, khaiThem: khai })
      : { nguoiLapGiu: t.daThu, choXacNhan: 0 }; // không đọc được công ty ⇒ coi như chưa về (không mở)
    const daHuy = d.status === "cancelled";
    const g = gia.get(d.id);
    if (g?.laDonDaiLy) {
      const v = ve(ls.filter((l) => !LOAI_DONG_THUONG_MAI.has(l.kind)));
      const so = tinhConLai({ tong: g.tong, daThuRong: t.daThu, dangDoiChieu: v.choXacNhan, conGiu: v.nguoiLapGiu });
      out.set(d.id, { no: daHuy ? 0 : Math.max(0, so.conLai), cocConGiu, phieu: { dong: g.dong, tong: g.tong, ...so } });
      continue;
    }
    const v = ve(ls);
    out.set(d.id, { no: noMotDon({ daHuy, phaiThu: t.phaiThu, daThuRong: t.daThu, dangDoiChieu: v.choXacNhan, benDatDangGiu: v.nguoiLapGiu }), cocConGiu, phieu: null });
  }
  return out;
}

/** Phiếu của MỘT đơn: `null` khi đơn không phải đơn đại lý hoặc chưa tính được tiền. `hanTra` chỉ đơn Trả sau (ADR-0172 Đ3 mục 2). */
export async function phieuCongNoCuaDon(db: D1Database, d: DonCongNo): Promise<{ phieu: PhieuCongNo; hanTra: string | null } | null> {
  const [kq, ts] = await Promise.all([congNoNhieuDon(db, [d]), donTraSauTheoId(db, d.id)]);
  const phieu = kq.get(d.id)?.phieu ?? null;
  return phieu ? { phieu, hanTra: ts?.credit_due_at ?? null } : null;
}
