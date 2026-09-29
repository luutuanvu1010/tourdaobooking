// GIỜ XẢY RA của lệnh tiến độ (ADR-0050 VK1-A; kế hoạch I33–I37; ruling R-P14 — Task A15). Đổi dữ liệu đã đọc của MỘT chuyến thành đầu vào `kiemGioXayRa`,
// dựng 409 `gio_xay_ra_ngoai_khoang` (mã + giờ sớm nhất + mốc gây chặn — không tên người) và `gioSomNhatKhai` của chi tiết chuyến. KHÔNG luật riêng: mọi kết
// luận "được / không" và "sớm nhất" đều do `kiemGioXayRa` / `somNhatKhai` (src/shared/gio-xay-ra.ts) trả — một luật cho máy chủ và màn hình.
import type { GioSomNhatKhaiDto, LenhChuyenLoiBody, MocChanDto } from "../../shared/contracts";
import { NHAN_SU_KIEN_CHUYEN, type LoaiSuKienChuyen } from "../../shared/dieu-phoi-kieu";
import { NHAN_GIO_XAY_RA, kiemGioXayRa, somNhatKhai, type KiemGioXayRaVao, type MaGioXayRa, type NguonSomNhat, type SuKienDaCo } from "../../shared/gio-xay-ra";
import { json } from "../../shared/http";
import type { AllocRow, EventRow, StopRow, TripRow } from "./chuyen-repo";
import { gioVn } from "./dieu-phoi-dto";

/** Mọi sự kiện đã có của chuyến (kể cả sự kiện dời khách vào — cùng tập với trigger `vc_trip_departed_after_plan`). */
export const suKienDaCo = (events: readonly EventRow[]): SuKienDaCo[] =>
  events.map((e) => ({ loai: e.kind as LoaiSuKienChuyen, xayRaMs: e.occurred_ms, ghiNhanMs: Date.parse(e.created_at), diemId: e.stop_id, suatId: e.allocation_id }));

/** Kết thúc THẬT (giờ xảy ra) của chuyến khác cùng xe hoặc cùng tài xế — vế 4 (CHONG_CHUYEN_TRUOC), kèm mã chuyến để nói mốc gây chặn. */
export function ketThucTruoc(khac: readonly TripRow[], t: TripRow): { ms: number; ma: string }[] {
  return khac
    .filter((k) => k.id !== t.id && k.ended_ms !== null && (k.vehicle_id === t.vehicle_id || (t.driver_party_id !== null && k.driver_party_id === t.driver_party_id)))
    .map((k) => ({ ms: k.ended_ms as number, ma: k.code }));
}

export interface NenGio {
  events: readonly EventRow[];
  /** Kẹp lùi (phút) của chính sách hiện hành — null = chưa có chính sách (không khai được). */
  kepLuiPhut: number | null;
  truoc: readonly { ms: number; ma: string }[];
  bayGioMs: number;
}
/** Đầu vào `kiemGioXayRa` (trừ giờ khai) của một lệnh. Giờ ghi nhận = MỘT mốc giờ của request (I33). */
export function vaoGio(n: NenGio, loai: LoaiSuKienChuyen, v: { diemId?: string | null; suatId?: string | null; suatMoTuMs?: number | null } = {}): Omit<KiemGioXayRaVao, "khai" | "xayRaMs"> {
  return {
    loai, ghiNhanMs: n.bayGioMs, kepLuiPhut: n.kepLuiPhut ?? 0, suKien: suKienDaCo(n.events), diemId: v.diemId ?? null, suatId: v.suatId ?? null,
    suatMoTuMs: v.suatMoTuMs ?? null, ketThucChuyenTruocMs: loai === "DEPARTED" ? n.truoc.map((x) => x.ms) : [],
  };
}

const NHAN_NGUON: Record<NguonSomNhat["loai"], string> = { KEP: "Giới hạn khai lùi", SU_KIEN: "Mốc đã ghi", CHUYEN_TRUOC: "Chuyến trước kết thúc", MO_SUAT: "Lúc xếp khách lên xe" };
export function mocChanDto(sn: { ms: number; nguon: NguonSomNhat }, truoc: readonly { ms: number; ma: string }[]): MocChanDto {
  const g = sn.nguon;
  if (g.loai === "CHUYEN_TRUOC") {
    const k = truoc[g.viTri];
    return { loai: g.loai, nhan: NHAN_NGUON.CHUYEN_TRUOC, maChuyen: k?.ma ?? null, gio: gioVn(k?.ms ?? sn.ms) };
  }
  if (g.loai === "SU_KIEN") return { loai: g.loai, nhan: NHAN_SU_KIEN_CHUYEN[g.suKien.loai] ?? NHAN_NGUON.SU_KIEN, maChuyen: null, gio: gioVn(sn.ms) };
  return { loai: g.loai, nhan: NHAN_NGUON[g.loai], maChuyen: null, gio: gioVn(sn.ms) };
}

/**
 * Kiểm giờ xảy ra của MỘT lệnh (khai = văn phòng gửi `xayRaLuc`; không khai = lúc bấm, MAY_CHU). Trả 409 `gio_xay_ra_ngoai_khoang` kèm mã, giờ sớm nhất
 * (R-P14) và mốc gây chặn (khi giờ khai sớm hơn giờ sớm nhất); `null` = qua.
 */
export function kiemGioLenh(n: NenGio, vao: Omit<KiemGioXayRaVao, "khai" | "xayRaMs">, xayRaMs: number, khai: boolean): Response | null {
  const kq = kiemGioXayRa({ ...vao, khai, xayRaMs });
  if (kq.ok) return null;
  return loiGio(kq.chan, khai ? somNhatKhai(vao) : null, xayRaMs, n.truoc);
}
export function loiGio(chan: readonly MaGioXayRa[], sn: { ms: number; nguon: NguonSomNhat } | null, xayRaMs: number, truoc: readonly { ms: number; ma: string }[]): Response {
  return json({
    error: {
      code: "gio_xay_ra_ngoai_khoang",
      message: `Giờ khai không hợp lệ: ${chan.map((m) => NHAN_GIO_XAY_RA[m]).join("; ")}.`,
      lyDo: [],
      maGio: [...chan],
      somNhat: sn ? gioVn(sn.ms) : null,
      mocChan: sn && xayRaMs < sn.ms ? mocChanDto(sn, truoc) : null,
    },
  } satisfies LenhChuyenLoiBody, 409);
}

const somNhatGio = (vao: Omit<KiemGioXayRaVao, "khai" | "xayRaMs">) => {
  const r = somNhatKhai(vao);
  return r ? gioVn(r.ms) : null;
};
/**
 * R-P14 — giờ SỚM NHẤT văn phòng khai được cho từng lệnh bấm thay áp được lúc đọc: xuất bến (chuyến chưa chạy), kết thúc (đang chạy), đã tới (điểm chưa tới
 * của chuyến đang chạy), lên xe = đã đón / vắng / khách huỷ (suất chờ / vắng, điểm lên đã tới) và đã trả (suất đã lên, điểm xuống đã tới). Không chính sách
 * (không có kẹp) → mọi ô null.
 */
export function gioSomNhatKhaiDto(n: NenGio, trip: TripRow, stops: readonly StopRow[], allocs: readonly AllocRow[]): GioSomNhatKhaiDto {
  const coKep = n.kepLuiPhut !== null;
  const chay = trip.status === "RUNNING";
  const daToi = (id: string | null) => id !== null && stops.some((s) => s.id === id && (s.status === "ARRIVED" || s.status === "DONE"));
  return {
    xuatBen: coKep && trip.status === "PLANNED" ? somNhatGio(vaoGio(n, "DEPARTED")) : null,
    ketThuc: coKep && chay ? somNhatGio(vaoGio(n, "ENDED")) : null,
    diem: stops.map((s) => ({ id: s.id, daToi: coKep && chay && s.status === "PENDING" ? somNhatGio(vaoGio(n, "STOP_ARRIVED", { diemId: s.id })) : null })),
    suat: allocs.filter((a) => a.valid_to_at === null).map((a) => {
      const moTu = Date.parse(a.valid_from_at);
      const crew = a.kind === "CREW";
      const lenXe = coKep && chay && (a.status === "WAITING" || a.status === "NO_SHOW") && (crew || daToi(a.board_stop_id))
        ? somNhatGio(vaoGio(n, "PASSENGER_BOARDED", { diemId: a.board_stop_id, suatId: a.id, suatMoTuMs: moTu }))
        : null;
      const tra = coKep && chay && a.status === "BOARDED" && (crew || daToi(a.alight_stop_id))
        ? somNhatGio(vaoGio(n, "PASSENGER_DROPPED", { diemId: a.alight_stop_id, suatId: a.id, suatMoTuMs: moTu }))
        : null;
      return { id: a.id, lenXe, tra };
    }),
  };
}
