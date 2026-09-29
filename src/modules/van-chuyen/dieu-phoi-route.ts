// PHẦN DÙNG CHUNG của các route chuyến xe (Task A13 / A15) — KHÔNG gọi hàm hẹp của orders (bài src/orders-cong-bo.test.ts): dữ liệu chặng (`lichChungChang`) và
// tên khách (`hanhKhachChoChuyen`) do THÂN ROUTE đọc sau `can()` rồi truyền vào. Gồm: mã lỗi 409 từ lý do của luật thuần, chạy lô + đổi lỗi CSDL, dựng chi
// tiết chuyến, chuỗi `detail` nhật ký (danh sách TRẮNG — mục 1.1), dựng điểm từ chặng (I40).
import type { ChangChoChuyen, ChangLichChung } from "../orders";
import type { ChuyenChiTietResponse, LenhChuyenLoiBody } from "../../shared/contracts";
import { kiemXuatBen, type KiemXuatBenVao } from "../../shared/dieu-phoi-kiem";
import type { KetQuaKiem, TrangThaiChuyen } from "../../shared/dieu-phoi-kieu";
import { dungLichChung } from "../../shared/dieu-phoi-lich-chung";
import { error, json } from "../../shared/http";
import type { LyDoGiu, MaGiu } from "../../shared/ly-do-giu";
import { can, type PermissionHolder } from "../../shared/permissions";
import { maskLongDigits } from "../../shared/text-guards";
import { msToVnLocal } from "../../shared/vn-date";
import { banChupCuoi, eventByRequest, type StopRow } from "./chuyen-repo";
import type { CauCoNhan, DiemMoi } from "./dieu-phoi";
import {
  banChupDto, canhBaoDto, chuyenTomTat, diemChuyenDto, lyDoDangDung, lyDoGiuDto, nhatKyChuyenDto, suatChuyenDto, taiXeChon, xeChon,
} from "./dieu-phoi-dto";
import { chinhSachVao, docChung, docNguCanh, type DuLieuChung, type NenChuyen, type NguCanhChuyen } from "./dieu-phoi-doc";
import { loiRangBuocChuyen } from "./rules";

// ---- Lỗi ----------------------------------------------------------------------------------------------------------------------------------------------------
export const CAN_XEM_CHUYEN = () => error(403, "forbidden", "Tài khoản này không xem được lịch xe.");
export const CAN_DIEU_PHOI = () => error(403, "forbidden", "Tài khoản này không xếp xe được.");
export const CAN_PHA_LE = () => error(403, "forbidden", "Chỉ Quản trị hoặc Toàn quyền phá lệ được.");
export const KHONG_CO_CHUYEN = () => error(404, "not_found", "Không tìm thấy chuyến.");
export const CHUYEN_CU = () => error(409, "stale", "Chuyến vừa được người khác sửa, tải lại.");
const THONG_BAO_409: Record<string, string> = {
  nguoi_da_o_chuyen_khac: "Khách này đang ở một chuyến khác.",
  vuot_so_nguoi_chang: "Xếp quá số khách của chặng.",
  vuot_so_cho: "Vượt số chỗ của xe.",
  trung_gio_xe: "Xe trùng giờ với chuyến khác.",
  trung_gio_tai_xe: "Tài xế trùng giờ với chuyến khác.",
  khong_du_dieu_kien_lai: "Tài xế chưa đủ điều kiện lái xe này.",
  chang_khong_hop_le: "Chặng chưa xếp được.",
  khach_khong_thuoc_don: "Khách không thuộc đơn của chặng.",
  cheo_xe_tai_xe: "Tài xế không thuộc chủ của xe này.",
  chuyen_da_ket_thuc: "Chuyến đã kết thúc hoặc đã huỷ.",
  xe_dang_chay: "Xe đang chạy — không đổi kế hoạch được.",
  xe_khong_dung: "Xe đang bảo dưỡng hoặc đã ngừng dùng.",
  gio_chuyen_khong_hop_le: "Giờ kết thúc phải sau giờ bắt đầu và chuyến không quá 24 giờ.",
  chinh_sach_rong: "Chưa có chính sách điều phối đang hiệu lực — báo người phụ trách hệ thống.",
  can_pha_le: "Trong mốc tối thiểu trước giờ xuất bến — cần Quản trị phá lệ.",
  chua_du_nghi: "Chưa đủ khoảng nghỉ giữa hai chuyến — cần Quản trị phá lệ.",
  con_khach_chua_xong: "Còn khách hoặc điểm chưa xong.",
  chua_du_dieu_kien_xuat_ben: "Chuyến chưa đủ điều kiện xuất bến.",
};
const MA_LOI_THEO_GIU: Partial<Record<MaGiu, string>> = {
  NGUOI_DA_O_CHUYEN_KHAC: "nguoi_da_o_chuyen_khac", VUOT_SO_NGUOI_CHANG: "vuot_so_nguoi_chang", VUOT_SO_CHO: "vuot_so_cho", TRUNG_GIO_XE: "trung_gio_xe",
  TRUNG_GIO_TAI_XE: "trung_gio_tai_xe", GPLX_THIEU: "khong_du_dieu_kien_lai", GPLX_THIEU_HANG: "khong_du_dieu_kien_lai", GPLX_HET_HAN: "khong_du_dieu_kien_lai",
  HANG_BANG_KHONG_DU: "khong_du_dieu_kien_lai", KHONG_CO_HANG_BANG: "khong_du_dieu_kien_lai", CHANG_KHONG_HOP_LE: "chang_khong_hop_le", CHUA_CO_GIO: "chang_khong_hop_le",
  DON_DA_HUY: "chang_khong_hop_le", CHANG_DA_DONG: "chang_khong_hop_le", GIO_HEN_NGOAI_CHUYEN: "chang_khong_hop_le", KHACH_KHONG_THUOC_DON: "khach_khong_thuoc_don",
  CHEO_XE_TAI_XE: "cheo_xe_tai_xe", XE_KHONG_DUNG: "xe_khong_dung", GIO_CHUYEN_KHONG_HOP_LE: "gio_chuyen_khong_hop_le", CHINH_SACH_RONG: "chinh_sach_rong",
};
export function loi409(code: string, lyDo: readonly LyDoGiu[] = [], extra: { canQuyen?: boolean } = {}): Response {
  return json({ error: { code, message: THONG_BAO_409[code] ?? "Lệnh chưa làm được.", lyDo: lyDo.map(lyDoGiuDto), ...extra } } satisfies LenhChuyenLoiBody, 409);
}
/**
 * Kết quả luật thuần → 409 (kế hoạch mục 1.1 bảng mã lỗi — lớp ROUTE): `chan` → mã theo lý do ĐẦU (mọi lý do đi kèm); chỉ `canPhaLe` còn thiếu phá lệ →
 * `can_pha_le` (mốc) hoặc `chua_du_nghi` (chỉ khoảng nghỉ), kèm `canQuyen` = người gọi có ô `trip.override`. `null` = cho qua.
 */
export function loiKiem(kq: KetQuaKiem, staff: PermissionHolder, trangThai: TrangThaiChuyen | null, co: { moc: boolean; nghi: boolean }): Response | null {
  if (kq.chan.length > 0) {
    const dau = kq.chan[0]!.ma;
    const code = dau === "CHUYEN_KHONG_CON_LEN_KE_HOACH" ? (trangThai === "RUNNING" ? "xe_dang_chay" : "chuyen_da_ket_thuc") : (MA_LOI_THEO_GIU[dau] ?? "chang_khong_hop_le");
    return loi409(code, kq.chan);
  }
  const thieu = kq.canPhaLe.filter((l) => (l.ma === "MOC_TOI_THIEU" && !co.moc) || (l.ma === "KHOANG_NGHI" && !co.nghi));
  if (thieu.length === 0) return null;
  return loi409(thieu.some((l) => l.ma === "MOC_TOI_THIEU") ? "can_pha_le" : "chua_du_nghi", thieu, { canQuyen: can(staff, "trip.override") });
}
/** Mã lý do phá lệ / huỷ hợp lệ: đang dùng, đúng nhóm. */
export const lyDoHopLe = (chung: DuLieuChung, code: string, nhom: string): boolean => chung.lyDo.some((r) => r.code === code && r.reason_group === nhom);
export const nhanLyDo = (chung: DuLieuChung, code: string): string => chung.lyDo.find((r) => r.code === code)?.label ?? code;

// ---- Chạy lô -----------------------------------------------------------------------------------------------------------------------------------------------
/**
 * Chạy MỘT lô (`db.batch` — nguyên tử). Câu cổng thua (câu 0; lệnh dời: cả câu 1) → lệnh lặp cùng requestId (LC-11) thì coi như đã làm, không thì 409 stale.
 * Lỗi ràng buộc CSDL (lớp thứ hai) → 409 `trip_rule`; UNIQUE request_id → lệnh lặp. Lỗi lạ ném lên.
 */
export async function chayLo(db: D1Database, lo: readonly CauCoNhan[], requestId: string, soCong = 1): Promise<{ ok: true } | { ok: false; res: Response }> {
  try {
    const kq = await db.batch(lo.map((c) => c.stmt));
    for (let i = 0; i < soCong; i++) {
      if ((kq[i]?.meta.changes ?? 0) === 0) return (await eventByRequest(db, requestId)) ? { ok: true } : { ok: false, res: CHUYEN_CU() };
    }
    return { ok: true };
  } catch (e) {
    const m = e instanceof Error ? e.message : String(e);
    if (/UNIQUE constraint failed: vc_trip_event\.request_id/.test(m) && (await eventByRequest(db, requestId))) return { ok: true };
    const r = loiRangBuocChuyen(m);
    if (r) return { ok: false, res: error(r.status, r.code, r.message) };
    throw e;
  }
}

// ---- Dựng điểm từ chặng (I40): gộp theo khoá so sánh nơi, không theo chữ đã che ---------------------------------------------------------------------------
/** Điểm (chưa tới) của chuyến có đúng khoá nơi + loại — dùng lại; không có thì dựng điểm MỚI (thứ tự cuối). Trả id điểm. */
export function diemChoKhoa(
  stops: readonly StopRow[], moi: DiemMoi[], tripId: string, loai: "PICKUP" | "DROPOFF", khoa: string, diemDanhMuc: string | null, chu: string | null,
): string {
  const co = stops.find((s) => s.trip_id === tripId && s.kind === loai && s.place_key === khoa && s.status === "PENDING") ?? moi.find((d) => d.tripId === tripId && d.loai === loai && d.placeKey === khoa);
  if (co) return co.id;
  const seq = Math.max(0, ...stops.filter((s) => s.trip_id === tripId).map((s) => s.seq), ...moi.filter((d) => d.tripId === tripId).map((d) => d.seq)) + 1;
  const id = crypto.randomUUID();
  moi.push({ id, tripId, seq, loai, locationId: diemDanhMuc, placeText: diemDanhMuc ? null : maskLongDigits(chu ?? ""), placeKey: khoa });
  return id;
}
/** Điểm chưa tới (PENDING) không còn suất mở nào (lên hoặc xuống) sau lệnh → bỏ qua `BO_QUA_KHONG_CON_KHACH` (I20). */
export function diemKhongConKhach(stops: readonly StopRow[], tripId: string, conMo: readonly { board: string | null; alight: string | null }[]): string[] {
  return stops.filter((s) => s.trip_id === tripId && s.status === "PENDING" && !conMo.some((a) => a.board === s.id || a.alight === s.id)).map((s) => s.id);
}

// ---- Chuỗi nhật ký (danh sách TRẮNG — kế hoạch mục 1.1: mã chuyến, mã đơn, biển số, con số, nhãn lý do, mã luật phá lệ, chiều, tên nơi danh mục) -----------
export const gioNgan = (ms: number): string => {
  const { date, time } = msToVnLocal(ms);
  return `${time} ${date.slice(8, 10)}/${date.slice(5, 7)}`;
};
export const phaLeNhatKy = (luat: string, nhan: string): string => ` · phá lệ ${luat === "MOC_TOI_THIEU" ? "mốc tối thiểu" : "khoảng nghỉ"}: ${nhan}`;
export const maDonGon = (codes: readonly string[]): string => [...new Set(codes)].sort().join(", ");

// ---- Chi tiết chuyến ---------------------------------------------------------------------------------------------------------------------------------------
/**
 * Chi tiết MỘT chuyến cho văn phòng (GET /chuyen/:id và phản hồi mọi lệnh ghi). `lich` (chặng quanh ngày chạy) và `hk` (tên khách) do thân route đọc sau
 * `can(trip.view)` — R-P1: `trip.view = any` ⇒ `contact.view = any`. Nhãn người bấm qua hàm tiêm (R-P20 — một lần cho cả danh sách id).
 */
export async function chiTietChuyen(
  db: D1Database, nen: NenChuyen, lich: readonly ChangLichChung[], hk: readonly ChangChoChuyen[],
  nhanNhanVien: (ids: readonly string[]) => Promise<Map<string, string> | null>, bayGioMs: number, chung?: DuLieuChung,
): Promise<ChuyenChiTietResponse> {
  const nowIso = new Date(bayGioMs).toISOString();
  const c = chung ?? (await docChung(db, nowIso, msToVnLocal(bayGioMs).date));
  const nc: NguCanhChuyen = await docNguCanh(db, nen, lich, c);
  const t = nen.trip;
  const cs = chinhSachVao(c.chinhSach);
  let lyDoGiu: LyDoGiu[] = [];
  if (t.status === "PLANNED") {
    const vao: KiemXuatBenVao = {
      chuyen: nc.chuyen, suat: nc.suat, chang: [...nc.chang.values()], changNgoai: nc.changNgoai, suatMoCuaChang: nc.suatMoCuaChang, diem: nc.diem, chuyenKhac: nc.chuyenKhac,
      chinhSach: cs, hangBang: c.hangBang, dieuKien: c.dieuKien, bayGioMs: Math.max(bayGioMs, t.planned_start_ms), xuatBenMs: Math.max(bayGioMs, t.planned_start_ms),
    };
    lyDoGiu = kiemXuatBen(vao).lyDo;
  }
  const lichRa = dungLichChung({
    chang: [...nc.chang.values()], changNgoai: nc.changNgoai, nhap: [], chuyen: [nc.chuyen], suat: [...nc.suat, ...nc.suatMoCuaChang.filter((s) => s.tripId !== t.id)],
    diem: nc.diem, chuyenKhac: nc.chuyenKhac, chinhSach: cs, hangBang: c.hangBang, dieuKien: c.dieuKien, bayGioMs,
  });
  const legCua = new Set(nen.legIds);
  const canhBao = lichRa.canhBao.filter((x) => x.tripId === t.id || (x.legId !== null && legCua.has(x.legId) && x.loai !== "CHUYEN_GIU"));
  const nguoiIds = [...new Set(nen.events.flatMap((e) => (e.created_by ? [e.created_by] : [])))];
  const nhan = await nhanNhanVien(nguoiIds);
  const ten = new Map<string, { fullName: string; birthYear: number }>();
  for (const ch of hk) for (const n of ch.nguoi) ten.set(n.personKey, { fullName: n.fullName, birthYear: n.birthYear });
  const lyDoNhan = new Map(c.lyDo.map((r) => [r.code, r.label]));
  const xeRow = c.xe.find((x) => x.id === t.vehicle_id);
  return {
    chuyen: {
      ...chuyenTomTat(t, { xe: xeRow, chung: c, stops: nen.stops, allocs: nen.allocs, events: nen.events, lyDoGiu, nhan, bayGioMs }),
      nghiPhaLe: t.rest_override_reason_code !== null,
      lyDoHuy: t.cancel_reason_code ? (lyDoNhan.get(t.cancel_reason_code) ?? null) : null,
      lyDoKetThuc: t.end_reason_code ? (lyDoNhan.get(t.end_reason_code) ?? null) : null,
    },
    diem: nen.stops.map((s) => diemChuyenDto(s, { allocs: nen.allocs, chang: nc.chang, stops: nen.stops, events: nen.events, nhan })),
    suat: nen.allocs.filter((a) => a.valid_to_at === null).map((a) => suatChuyenDto(a, { changLich: nc.changLich, changNgoai: nc.changNgoai, ten, events: nen.events, nhan })),
    canhBao: canhBao.map(canhBaoDto),
    nhatKy: nhatKyChuyenDto(nen.events, nhan, lyDoNhan),
    banChup: banChupDto(await banChupCuoi(db, t.id)),
    lyDo: lyDoDangDung(c),
    xe: xeChon(c),
    taiXe: taiXeChon(c),
    mocToiThieuPhut: c.chinhSach?.min_lead_minutes ?? null,
    canhBaoPhut: c.chinhSach?.warn_lead_minutes ?? null,
  };
}
