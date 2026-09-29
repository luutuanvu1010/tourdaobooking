// NHẮC "GỌI BÁO KHÁCH" KHI GIỜ HẸN ĐỔI (ADR-0051 GB1, GB2 — Task A-GB): đọc mốc + suất (bảng vc_ của mình), dựng mục / dấu bằng luật thuần một nguồn
// (src/shared/goi-bao.ts), chạy họ lệnh mốc ("Đã gọi báo", "Bỏ đánh dấu" — hàm dựng lô ở dieu-phoi.ts, nhãn CONG_MOC). KHÔNG gọi hàm hẹp của orders: giờ hẹn
// hiện hành (`hanhKhachChoChuyen` — đọc THEO ID) do thân route đọc sau `can()` rồi truyền vào; `nguoi[]` (họ tên, năm sinh) của hàm đó KHÔNG BAO GIỜ vào
// DTO / nhật ký ở đây (TC-GB-9b). Quyền bấm (`baoDuoc` / `boDuoc`) = ĐÚNG lời gọi `can(trip.call_ack, { ownerId, assigned })` của route ghi — do route tiêm vào.
import type { ChangChoChuyen } from "../orders";
import type { DaGoiBaoDto, GioHenDoiDto, GoiBaoChangDto, MucNhacGoiDto } from "../../shared/contracts";
import {
  NHAN_TU_CHOI_GOI_BAO, daGoiBao, kiemBoDanhDau, kiemDaGoiBao, mocHienHanh, moTaDoiGio, mucGioHenDoi, type ChangGoiBao, type MaTuChoiGoiBao, type MocVao,
  type MucGioHenDoi, type SuatGoiBao,
} from "../../shared/goi-bao";
import { json } from "../../shared/http";
import { msToVnLocal } from "../../shared/vn-date";
import { changChuDon, mocByLegs, mocByRequest, suatKhachMoCuaChang, type MocRow, type SuatChangRow } from "./chuyen-repo";
import { lenhBoDanhDauGoiBao, lenhDaGoiBao, type CauCoNhan } from "./dieu-phoi";
import { loiRangBuocChuyen } from "./rules";

/** Quyền bấm "Đã gọi báo" / "Bỏ đánh dấu" trên chặng của đơn `orderId` (người lập `ownerId`) — route tiêm (can(trip.call_ack, { ownerId, assigned })). */
export type QuyenGoiBao = (orderId: string, ownerId: string | null) => Promise<boolean>;
export const khongQuyenGoiBao: QuyenGoiBao = async () => false;

export const mocVao = (r: MocRow): MocVao => ({
  seq: r.seq, loai: r.kind, gio: { ngay: r.appt_date, gio: r.appt_time }, truoc: r.prev_appt_date === null ? null : { ngay: r.prev_appt_date, gio: r.prev_appt_time },
  luc: r.created_at, nguoiId: r.created_by,
});
export const suatGoiBao = (r: SuatChangRow): SuatGoiBao => ({
  tripId: r.trip_id, maChuyen: r.code, ngayChuyen: r.service_date, trangThaiChuyen: r.trip_status, trangThai: r.status, mo: true,
});
/** Giờ hẹn hiện hành của chặng (theo id — `hanhKhachChoChuyen`); CHỈ các khoá cần — không `nguoi[]`. null = chặng không còn đọc được (đơn huỷ / chặng đóng). */
export function changGoiBao(hk: readonly ChangChoChuyen[], legId: string): ChangGoiBao | null {
  const c = hk.find((x) => x.legId === legId);
  return c && c.pickupDate !== null ? { legId: c.legId, orderId: c.orderId, orderCode: c.orderCode, chieu: c.direction, gio: { ngay: c.pickupDate, gio: c.pickupTime } } : null;
}

export interface DuLieuGoiBao {
  moc: Map<string, MocVao[]>;
  suat: Map<string, SuatGoiBao[]>;
  chuDon: Map<string, { orderId: string; ownerId: string | null }>;
}
export async function docGoiBao(db: D1Database, legIds: readonly string[]): Promise<DuLieuGoiBao> {
  const [moc, suat, chu] = await Promise.all([mocByLegs(db, legIds), suatKhachMoCuaChang(db, legIds), changChuDon(db, legIds)]);
  const nhom = <T, R>(xs: readonly T[], k: (x: T) => string, f: (x: T) => R) => {
    const m = new Map<string, R[]>();
    for (const x of xs) m.set(k(x), [...(m.get(k(x)) ?? []), f(x)]);
    return m;
  };
  return {
    moc: nhom(moc, (r) => r.leg_id, mocVao),
    suat: nhom(suat, (r) => r.leg_id, suatGoiBao),
    chuDon: new Map(chu.map((r) => [r.id, { orderId: r.order_id, ownerId: r.owner_id }])),
  };
}

const gioHenDoiDto = (m: MucGioHenDoi, baoDuoc: boolean): GioHenDoiDto => ({ cu: m.cu, moi: m.moi, phienBan: m.phienBan, maChuyen: [...m.maChuyen], baoDuoc });
/** Khối V2 của MỘT chặng: còn mục → `gioHenDoi`; dấu "đã gọi báo" còn đúng → `daGoiBao` (nhãn tên người bấm, HH:MM giờ VN). Không có gì → null. */
export async function goiBaoChang(
  legId: string, hk: readonly ChangChoChuyen[], d: DuLieuGoiBao, quyen: QuyenGoiBao, nhan: ReadonlyMap<string, string> | null,
): Promise<GoiBaoChangDto | null> {
  const chang = changGoiBao(hk, legId);
  const moc = d.moc.get(legId) ?? [];
  const suat = d.suat.get(legId) ?? [];
  const muc = mucGioHenDoi({ chang, moc, suat });
  const goi = daGoiBao({ chang, moc, suat });
  if (!muc && !goi) return null;
  const chu = d.chuDon.get(legId);
  const duoc = chu ? await quyen(chu.orderId, chu.ownerId) : false;
  const daGoi: DaGoiBaoDto | null = goi && goi.truoc
    ? { cu: goi.truoc, moi: goi.gio, luc: msToVnLocal(Date.parse(goi.luc)).time, nguoiBam: goi.nguoiId ? (nhan?.get(goi.nguoiId) ?? null) : null, phienBan: goi.seq, boDuoc: duoc }
    : null;
  return { legId, maDon: chang?.orderCode ?? null, gioHenDoi: muc ? gioHenDoiDto(muc, duoc) : null, daGoiBao: daGoi };
}
/** Người đã bấm các dòng DA_GOI hiện hành (để lấy nhãn tên một lần mỗi request — R-P20). */
export const nguoiBamGoiBao = (d: DuLieuGoiBao): string[] =>
  [...new Set([...d.moc.values()].flatMap((ds) => {
    const m = mocHienHanh(ds);
    return m && m.loai === "DA_GOI" && m.nguoiId ? [m.nguoiId] : [];
  }))];

/** Danh sách nhắc (route `GET …/nhac-goi-khach`): mục của mọi chặng đã đọc, sắp theo giờ hẹn MỚI tăng dần. */
export async function danhSachNhac(legIds: readonly string[], hk: readonly ChangChoChuyen[], d: DuLieuGoiBao, quyen: QuyenGoiBao): Promise<MucNhacGoiDto[]> {
  const ra: (MucNhacGoiDto & { khoa: string })[] = [];
  for (const legId of legIds) {
    const chang = changGoiBao(hk, legId);
    const muc = mucGioHenDoi({ chang, moc: d.moc.get(legId) ?? [], suat: d.suat.get(legId) ?? [] });
    if (!muc) continue;
    const chu = d.chuDon.get(legId);
    const baoDuoc = chu ? await quyen(chu.orderId, chu.ownerId) : false;
    const noi = hk.find((x) => x.legId === legId)!.noiDon;
    ra.push({ legId, orderCode: muc.orderCode, chieu: muc.chieu, noiDon: noi, ngayChuyen: muc.ngayChuyen, gioHenDoi: gioHenDoiDto(muc, baoDuoc), khoa: `${muc.moi.ngay} ${muc.moi.gio ?? "99:99"} ${legId}` });
  }
  return ra.sort((a, b) => (a.khoa < b.khoa ? -1 : 1)).map(({ khoa: _k, ...x }) => x);
}

// ---- Họ lệnh mốc ---------------------------------------------------------------------------------------------------------------------------------------
const loiGoiBao = (ma: MaTuChoiGoiBao): Response => json({ error: { code: ma, message: NHAN_TU_CHOI_GOI_BAO[ma] } }, 409);
/** Chạy lô CONG_MOC: câu cổng thua (người khác vừa bấm / mốc vừa đổi) → lệnh lặp cùng requestId thì coi như xong, không thì 409 `gio_hen_vua_doi`. */
async function chayLoMoc(db: D1Database, lo: readonly CauCoNhan[], requestId: string): Promise<Response | null> {
  try {
    const kq = await db.batch(lo.map((c) => c.stmt));
    if ((kq[0]?.meta.changes ?? 0) === 0) return (await mocByRequest(db, requestId)) ? null : loiGoiBao("gio_hen_vua_doi");
    return null;
  } catch (e) {
    const m = e instanceof Error ? e.message : String(e);
    if (/UNIQUE constraint failed: vc_leg_appt_ack\.request_id/.test(m) && (await mocByRequest(db, requestId))) return null;
    const r = loiRangBuocChuyen(m);
    if (r) return json({ error: { code: r.code, message: r.message } }, r.status);
    throw e;
  }
}
export interface ThanGoiBao { requestId: string; phienBan: number; gioMoi: { ngay: string; gio: string | null } | null }
/**
 * "Đã gọi báo" (`loai` DA_GOI) / "Bỏ đánh dấu" (BO_DANH_DAU) trên chặng `legId` — sau khi route đã qua 403 → 404 → 403 và lệnh lặp. `hk` = giờ hẹn hiện hành
 * (theo id). Trả `Response` khi từ chối, `null` khi đã ghi.
 */
export async function xuLyMoc(
  loai: "DA_GOI" | "BO_DANH_DAU", db: D1Database, legId: string, hk: readonly ChangChoChuyen[], b: ThanGoiBao, nguoiId: string, bayGioMs: number,
): Promise<Response | null> {
  const chang = changGoiBao(hk, legId);
  if (chang === null) return loiGoiBao("khong_con_can_goi");
  const d = await docGoiBao(db, [legId]);
  const moc = d.moc.get(legId) ?? [];
  const suat = d.suat.get(legId) ?? [];
  const lenhChung = { cmd: crypto.randomUUID(), requestId: b.requestId, lucIso: new Date(bayGioMs).toISOString(), nguoiId };
  const cho = suat.filter((s) => s.trangThai === "WAITING" && (s.trangThaiChuyen === "PLANNED" || s.trangThaiChuyen === "RUNNING"));
  const tripId = cho[0]?.tripId ?? "";
  const maChuyen = [...new Set(cho.map((s) => s.maChuyen))].join(", ");
  const chieu = chang.chieu === "OUT" ? "chiều đi" : "chiều về";
  if (loai === "DA_GOI") {
    const muc = mucGioHenDoi({ chang, moc, suat });
    const kq = kiemDaGoiBao({ muc, phienBan: b.phienBan, gioMoi: b.gioMoi ?? { ngay: "", gio: null } });
    if (!kq.ok) return loiGoiBao(kq.ma);
    const m = muc!;
    return chayLoMoc(db, lenhDaGoiBao(db, {
      ...lenhChung, legId, phienBan: m.phienBan, moi: m.moi, cu: m.cu, tripId, detail: `${chang.orderCode} · ${chieu} · giờ hẹn đón ${moTaDoiGio(m.cu, m.moi)} · ${maChuyen}`,
    }), b.requestId);
  }
  const kq = kiemBoDanhDau({ moc, phienBan: b.phienBan, suat });
  if (!kq.ok) return loiGoiBao(kq.ma);
  const goi = mocHienHanh(moc)!;
  return chayLoMoc(db, lenhBoDanhDauGoiBao(db, {
    ...lenhChung, legId, phienBan: goi.seq, moi: goi.truoc!, cu: goi.gio, tripId,
    detail: `${chang.orderCode} · ${chieu} · bỏ đánh dấu đã gọi báo giờ hẹn đón ${moTaDoiGio(goi.truoc!, goi.gio)} · ${maChuyen}`,
  }), b.requestId);
}
