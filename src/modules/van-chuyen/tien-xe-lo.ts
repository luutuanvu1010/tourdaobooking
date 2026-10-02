// CHI PHÍ TRONG LÔ LỆNH CHUYẾN (ADR-0057 T2 C4, C8 — kế hoạch Đợt 4 Task 9). Thuần ở phần kế hoạch (`keHoachChiPhiKhiDoi`, `keHoachChiPhiKhiHuy` — nhận dữ liệu
// ĐÃ ĐỌC, gọi luật của tien-xe.ts); phần dựng câu (`cauChiPhi`) chỉ prepare/bind câu đã đăng ký (tien-xe-repo.ts), không đọc gì. Thứ tự: ĐẢO (âm trước, dương
// sau — `thuTuDaoTatCa`) đứng TRƯỚC câu ghi chuyến; CHỤP đứng SAU câu ghi chuyến (trigger source_carrier đọc cờ / nhà xe MỚI của chuyến).
import type { CauCoNhan, LenhChung } from "./dieu-phoi";
// Đuôi .ts: sổ vàng (src/so-vang-chi-phi-xe.test.ts) nạp THẲNG tệp này bằng node --test để chạy đúng kế hoạch chi phí của lô chuyến (vòng sửa 1, V-2).
import { chonDongGiaThue, chuTien, coXeCua, dongBiDaoKhi, ngayGhiDao, tongChiPhiChuyen, type CoXe, type DongChiPhi, type DongGiaThue } from "./tien-xe.ts";
import { COST_REVERSE, COST_SNAPSHOT, type CostLineRow } from "./tien-xe-repo.ts";

export type LyDoDaoHeThong = "CPX_DOI_CHUYEN" | "CPX_HUY_CHUYEN";
export interface ChupMoi { id: string; rateId: string; amount: number; carrierPartyId: string; routeCode: string | null; sizeCode: string | null; soCho: number; ngayChay: string }
export interface DaoMot { id: string; goc: { id: string; amount: number; carrierPartyId: string }; lyDo: LyDoDaoHeThong; ngay: string }
export interface KeHoachChiPhi {
  dao: DaoMot[];
  chup: ChupMoi | null;
  /** Số dòng đọc trước lô — câu cổng `TRIP_GATE_CHI_PHI` so `count(*)` (TC-8). */
  phienBan: number;
  /** Số ĐIỀU CHỈNH bị đảo theo (bảng kê "x điều chỉnh bị đảo do đổi chuyến") — không tiền. */
  daoDieuChinh: number;
  /** Tổng trước → sau (chỉ cho NHẬT KÝ — không vào DTO). */
  tongTruoc: number;
  tongSau: number;
}
export const KE_HOACH_RONG = (phienBan: number, tong: number): KeHoachChiPhi => ({ dao: [], chup: null, phienBan, daoDieuChinh: 0, tongTruoc: tong, tongSau: tong });

/** Dòng chi phí cho kế hoạch lô: kèm nhà xe (dòng đảo mang nhà xe của GỐC) và ngày phát sinh (dòng đảo mang ngày của GỐC — `ngayGhiDao`). */
export type DongLo = DongChiPhi & { carrierPartyId: string; occurredDate: string };
/** Dòng đọc từ CSDL → dạng luật thuần. */
export const dongCua = (r: CostLineRow): DongLo => ({
  id: r.id, kind: r.kind, amount: r.amount, reversesId: r.reverses_id, reasonCode: r.reason_code, createdAt: r.created_at, carrierPartyId: r.carrier_party_id,
  occurredDate: r.occurred_date,
});

/**
 * Lô tạo / sửa chuyến (ADR-0057 C4; Cần chủ 3 = A, 2026-10-02): tính lại khi tạo mới, đổi xe / nhà xe, đổi tuyến, đổi NGÀY chạy (ngày VN của giờ bắt đầu — dời
 * giờ trong cùng ngày KHÔNG tính lại). Tính lại = đảo MỌI dòng còn hiệu lực (âm trước, dương sau — kể cả giá thoả thuận, điều chỉnh) rồi chụp giá bảng của
 * xe / nhà xe / tuyến / ngày MỚI nếu chuyến là xe thuê. Nhà xe của chuyến xe thuê đã thôi hợp tác ⇒ cả lệnh từ chối (`carrier_inactive`) — không đảo lẻ.
 */
export function keHoachChiPhiKhiDoi(v: {
  dong: readonly DongLo[];
  /** Ngày hiện tại (giờ VN) — `ngayGhiDao` dùng khi kỳ của dòng gốc đã khoá (chỗ nối ADR-0080). */
  homNay: string;
  rentedMoi: 0 | 1;
  chuXeMoi: string;
  nhaXeDangMo: ReadonlySet<string>;
  laTaoMoi: boolean;
  doiXeHoacNhaXe: boolean;
  doiTuyen: boolean;
  doiNgay: boolean;
  tuyenMoi: string | null;
  soChoMoi: number;
  ngayChayMoi: string;
  gia: readonly DongGiaThue[];
  coXe: readonly CoXe[];
}): { ok: true; kh: KeHoachChiPhi } | { ok: false; loi: "carrier_inactive" } {
  const tong = tongChiPhiChuyen(v.dong);
  const canChupLai = v.laTaoMoi || v.doiXeHoacNhaXe || v.doiTuyen || v.doiNgay;
  if (!canChupLai) return { ok: true, kh: KE_HOACH_RONG(v.dong.length, tong) };
  if (v.rentedMoi === 1 && !v.nhaXeDangMo.has(v.chuXeMoi)) return { ok: false, loi: "carrier_inactive" };
  const theoId = new Map(v.dong.map((d) => [d.id, d]));
  const dao: DaoMot[] = dongBiDaoKhi(v.dong, "DOI_CHUYEN").map((d) => ({
    id: crypto.randomUUID(), goc: { id: d.id, amount: d.amount, carrierPartyId: theoId.get(d.id)!.carrierPartyId }, lyDo: "CPX_DOI_CHUYEN", ngay: ngayGhiDao(theoId.get(d.id)!, { homNay: v.homNay }),
  }));
  let chup: ChupMoi | null = null;
  if (v.rentedMoi === 1) {
    const sizeCode = coXeCua(v.soChoMoi, v.coXe);
    const g = chonDongGiaThue({ carrierPartyId: v.chuXeMoi, routeCode: v.tuyenMoi, sizeCode, ngayChay: v.ngayChayMoi }, v.gia);
    if (g) chup = { id: crypto.randomUUID(), rateId: g.id, amount: g.amount, carrierPartyId: v.chuXeMoi, routeCode: v.tuyenMoi, sizeCode, soCho: v.soChoMoi, ngayChay: v.ngayChayMoi };
  }
  return {
    ok: true,
    kh: {
      dao, chup, phienBan: v.dong.length, daoDieuChinh: dao.filter((d) => theoId.get(d.goc.id)!.kind === "ADJUSTMENT").length,
      tongTruoc: tong, tongSau: chup ? chup.amount : 0,
    },
  };
}

/** Lô huỷ chuyến trước xuất bến (ADR-0057 C4): đảo MỌI dòng còn hiệu lực (âm trước, dương sau) ⇒ tổng 0; phí huỷ Kế toán ghi tay sau. */
export function keHoachChiPhiKhiHuy(dong: readonly DongLo[], homNay: string): KeHoachChiPhi {
  const theoId = new Map(dong.map((d) => [d.id, d]));
  const dao: DaoMot[] = dongBiDaoKhi(dong, "HUY_CHUYEN").map((d) => ({
    id: crypto.randomUUID(), goc: { id: d.id, amount: d.amount, carrierPartyId: theoId.get(d.id)!.carrierPartyId }, lyDo: "CPX_HUY_CHUYEN", ngay: ngayGhiDao(theoId.get(d.id)!, { homNay }),
  }));
  return { dao, chup: null, phienBan: dong.length, daoDieuChinh: dao.filter((d) => theoId.get(d.goc.id)!.kind === "ADJUSTMENT").length, tongTruoc: tongChiPhiChuyen(dong), tongSau: 0 };
}

/** Câu chi phí cho lô (mọi câu mang lính gác dấu lệnh — bài thứ tự lô). `dao` đặt TRƯỚC câu ghi chuyến, `chup` SAU. */
export function cauChiPhi(db: D1Database, l: LenhChung, tripId: string, kh: KeHoachChiPhi): { dao: CauCoNhan[]; chup: CauCoNhan[] } {
  return {
    dao: kh.dao.map((d) => ({
      nhan: "GHI" as const,
      stmt: db.prepare(COST_REVERSE).bind(d.id, tripId, l.cmd, d.goc.id, -d.goc.amount, d.goc.carrierPartyId, d.lyDo, d.ngay, l.lucIso, l.nguoiId),
    })),
    chup: kh.chup
      ? [{
        nhan: "GHI" as const,
        stmt: db.prepare(COST_SNAPSHOT).bind(kh.chup.id, tripId, l.cmd, kh.chup.carrierPartyId, kh.chup.amount, kh.chup.rateId, kh.chup.routeCode, kh.chup.sizeCode, kh.chup.soCho,
          kh.chup.ngayChay, l.lucIso, l.nguoiId),
      }]
      : [],
  };
}

/** Phần nhật ký của chi phí (C10 — chỉ số tiền trước → sau + số điều chỉnh bị đảo; dòng nhật ký của CHÍNH lệnh chuyến, cùng lô). Rỗng khi không đổi gì. */
export function chiTietChiPhiNhatKy(kh: KeHoachChiPhi, rented: 0 | 1, laHuy = false): string {
  if (kh.dao.length === 0 && !kh.chup) return "";
  const dc = kh.daoDieuChinh > 0 ? ` (đảo ${kh.daoDieuChinh} điều chỉnh)` : "";
  return ` · chi phí xe thuê ${chuTien(kh.tongTruoc)} → ${kh.chup ? chuTien(kh.tongSau) : rented === 1 && !laHuy ? "chưa có giá" : "0"}${dc}`;
}
