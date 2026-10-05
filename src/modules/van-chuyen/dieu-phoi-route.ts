// PHẦN DÙNG CHUNG của các route chuyến xe (Task A13 / A15) — KHÔNG gọi hàm hẹp của orders (bài src/orders-cong-bo.test.ts): dữ liệu chặng (`lichChungChang`) và
// tên khách (`hanhKhachChoChuyen`) do THÂN ROUTE đọc sau `can()` rồi truyền vào. Gồm: mã lỗi 409 từ lý do của luật thuần, chạy lô + đổi lỗi CSDL, dựng chi
// tiết chuyến, chuỗi `detail` nhật ký (danh sách TRẮNG — mục 1.1), dựng điểm từ chặng (I40).
import type { ChangChoChuyen, ChangLichChung, LienHeTaiXe } from "../orders";
import type { ChuyenChiTietResponse, CuocChiTietResponse, CuocCuaToiItemDto, GoiBaoChangDto, LenhChuyenLoiBody } from "../../shared/contracts";
import { docGoiBao, goiBaoChang, nguoiBamGoiBao, type QuyenGoiBao } from "./goi-bao-lenh";
import { kiemXuatBen, type KiemXuatBenVao } from "../../shared/dieu-phoi-kiem";
import type { KetQuaKiem, TrangThaiChuyen } from "../../shared/dieu-phoi-kieu";
import { dungLichChung } from "../../shared/dieu-phoi-lich-chung";
import { error, json } from "../../shared/http";
import type { LyDoGiu, MaGiu } from "../../shared/ly-do-giu";
import { can, type PermissionHolder } from "../../shared/permissions";
import { maskLongDigits } from "../../shared/text-guards";
import { sapDonTruocTra } from "../../shared/thu-tu-diem";
import { msToVnLocal, ngayNgan } from "../../shared/vn-date";
import { findRoute } from "./tien-xe-repo";
import { allocsByTrips, banChupCuoi, eventByRequest, eventsByTrips, stopsByTrips, tenNguoiDiKem, type StopRow, type TripRow } from "./chuyen-repo";
import type { CauCoNhan, DiemMoi } from "./dieu-phoi";
import {
  banChupDto, canhBaoDto, chuyenTomTat, diemChuyenDto, lyDoDangDung, lyDoGiuDto, nhatKyChuyenDto, suatChuyenDto, taiXeChon, xeChon,
} from "./dieu-phoi-dto";
import { boSungXe, chinhSachVao, docChung, docNguCanh, type DuLieuChung, type NenChuyen, type NguCanhChuyen } from "./dieu-phoi-doc";
import { gioSomNhatKhaiDto, ketThucTruoc } from "./dieu-phoi-gio";
import { cuocChiTietDto, cuocCuaToiItem } from "./tai-xe-dto";
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
  chua_gian_doan: "Chỉ tạo chuyến cứu hộ sau khi xe đã Kết thúc gián đoạn.", // Đợt 5 D5c (cứu hộ đơn giản)
  suat_da_co_ten: "Khách này đã có tên — tải lại chuyến.", // Đợt 5 D5b (tài xế bổ sung tên)
  don_du_ten: "Đơn đã đủ tên khách — gọi văn phòng nếu cần đổi tên.", // Đợt 5 D5b
  xe_khong_dung: "Xe đang bảo dưỡng hoặc đã ngừng dùng.",
  gio_chuyen_khong_hop_le: "Giờ kết thúc phải sau giờ bắt đầu và chuyến không quá 24 giờ.",
  chinh_sach_rong: "Chưa có chính sách điều phối đang hiệu lực — báo người phụ trách hệ thống.",
  can_pha_le: "Trong mốc tối thiểu trước giờ xuất bến — cần Quản trị phá lệ.",
  chua_du_nghi: "Chưa đủ khoảng nghỉ giữa hai chuyến — cần Quản trị phá lệ.",
  con_khach_chua_xong: "Còn khách hoặc điểm chưa xong.",
  chua_du_dieu_kien_xuat_ben: "Chuyến chưa đủ điều kiện xuất bến.",
  // Lệnh tiến độ (A15)
  da_xuat_ben: "Chuyến đã xuất bến.",
  chua_xuat_ben: "Chuyến chưa xuất bến — lệnh này chỉ dùng khi xe đang chạy (đổi thứ tự khi chưa chạy: sửa chuyến).",
  diem_da_toi: "Điểm đã tới hoặc đã bỏ qua.",
  diem_chua_toi: "Xe chưa tới điểm của khách này — bấm \"Đã tới\" trước.",
  suat_da_co_ket_qua: "Khách này đã có kết quả — không đổi được.",
  // Xe đang chạy (Đợt 5 — ADR-0052 D5)
  chuyen_chua_chay: "Chuyến chưa xuất bến — dùng Xếp khách / Rút khách.",
  da_bao_huy: "Khách này đã được báo huỷ.",
};
const MA_LOI_THEO_GIU: Partial<Record<MaGiu, string>> = {
  NGUOI_DA_O_CHUYEN_KHAC: "nguoi_da_o_chuyen_khac", VUOT_SO_NGUOI_CHANG: "vuot_so_nguoi_chang", VUOT_SO_CHO: "vuot_so_cho", TRUNG_GIO_XE: "trung_gio_xe",
  TRUNG_GIO_TAI_XE: "trung_gio_tai_xe", GPLX_THIEU: "khong_du_dieu_kien_lai", GPLX_THIEU_HANG: "khong_du_dieu_kien_lai", GPLX_HET_HAN: "khong_du_dieu_kien_lai",
  HANG_BANG_KHONG_DU: "khong_du_dieu_kien_lai", KHONG_CO_HANG_BANG: "khong_du_dieu_kien_lai", CHANG_KHONG_HOP_LE: "chang_khong_hop_le", CHUA_CO_GIO: "chang_khong_hop_le",
  DON_DA_HUY: "chang_khong_hop_le", CHANG_DA_DONG: "chang_khong_hop_le", GIO_HEN_NGOAI_CHUYEN: "chang_khong_hop_le", KHACH_KHONG_THUOC_DON: "khach_khong_thuoc_don",
  CHEO_XE_TAI_XE: "cheo_xe_tai_xe", XE_KHONG_DUNG: "xe_khong_dung", GIO_CHUYEN_KHONG_HOP_LE: "gio_chuyen_khong_hop_le", CHINH_SACH_RONG: "chinh_sach_rong",
};
export function loi409(code: string, lyDo: readonly LyDoGiu[] = [], extra: Omit<LenhChuyenLoiBody["error"], "code" | "message" | "lyDo"> = {}, thongBao?: string): Response {
  return json({ error: { code, message: thongBao ?? THONG_BAO_409[code] ?? "Lệnh chưa làm được.", lyDo: lyDo.map(lyDoGiuDto), ...extra } } satisfies LenhChuyenLoiBody, 409);
}
/**
 * Kết quả luật thuần → 409 (kế hoạch mục 1.1 bảng mã lỗi — lớp ROUTE): `chan` → mã theo lý do ĐẦU (mọi lý do đi kèm); chỉ `canPhaLe` còn thiếu phá lệ →
 * `can_pha_le` (mốc) hoặc `chua_du_nghi` (chỉ khoảng nghỉ), kèm `canQuyen` = người gọi có ô `trip.override`. `null` = cho qua.
 */
export function loiKiem(
  kq: KetQuaKiem, staff: PermissionHolder, trangThai: TrangThaiChuyen | null, co: { moc: boolean; nghi: boolean }, thongBaoMoc?: string,
): Response | null {
  if (kq.chan.length > 0) {
    const dau = kq.chan[0]!.ma;
    const code = dau === "CHUYEN_KHONG_CON_LEN_KE_HOACH" ? (trangThai === "RUNNING" ? "xe_dang_chay" : "chuyen_da_ket_thuc") : (MA_LOI_THEO_GIU[dau] ?? "chang_khong_hop_le");
    return loi409(code, kq.chan);
  }
  const thieu = kq.canPhaLe.filter((l) => (l.ma === "MOC_TOI_THIEU" && !co.moc) || (l.ma === "KHOANG_NGHI" && !co.nghi));
  if (thieu.length === 0) return null;
  const moc = thieu.some((l) => l.ma === "MOC_TOI_THIEU");
  return loi409(moc ? "can_pha_le" : "chua_du_nghi", thieu, { canQuyen: can(staff, "trip.override") }, moc ? thongBaoMoc : undefined);
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
/**
 * HT-01 (kiểm theo vai 2/10 — V1.2): sau khi dựng điểm bằng `diemChoKhoa` (điểm trả DÙNG LẠI theo khoá nơi có thể đứng trước điểm đón MỚI), sắp lại điểm
 * CHƯA TỚI của chuyến để mọi điểm đón của một suất đứng trước điểm trả của suất đó, giữ thứ tự tương đối còn lại (MỘT luật: `sapDonTruocTra`). `suat` =
 * suất còn mở SAU lệnh (cũ + mới). Điểm MỚI: đổi `seq` ngay trong `moi` (chèn đúng số); điểm ĐÃ CÓ: trả `{ id, seq }` để lô đổi thứ tự (`STOP_SET_SEQ`).
 * `boQua`: điểm lô này sẽ bỏ qua (I20) — không xét, giữ số. Chỉ sắp, không chặn: chặn "trả trước đón" ở cổng xuất bến chờ ADR-0096.
 */
export function sapLaiDiem(
  stops: readonly StopRow[], moi: DiemMoi[], tripId: string, suat: readonly { board: string | null; alight: string | null }[], boQua: readonly string[] = [],
): { id: string; seq: number }[] {
  const bo = new Set(boQua);
  const cu = stops.filter((s) => s.trip_id === tripId && s.status === "PENDING" && !bo.has(s.id));
  const mMoi = moi.filter((d) => d.tripId === tripId);
  const doi = sapDonTruocTra(
    [...cu.map((s) => ({ id: s.id, seq: s.seq, dangCho: true })), ...mMoi.map((d) => ({ id: d.id, seq: d.seq, dangCho: true }))],
    suat.map((x) => ({ diemLen: x.board, diemXuong: x.alight })),
  );
  for (const d of mMoi) d.seq = doi.get(d.id) ?? d.seq;
  return cu.flatMap((s) => (doi.has(s.id) ? [{ id: s.id, seq: doi.get(s.id)! }] : []));
}
/** Điểm chưa tới (PENDING) không còn suất mở nào (lên hoặc xuống) sau lệnh → bỏ qua `BO_QUA_KHONG_CON_KHACH` (I20). */
export function diemKhongConKhach(stops: readonly StopRow[], tripId: string, conMo: readonly { board: string | null; alight: string | null }[]): string[] {
  return stops.filter((s) => s.trip_id === tripId && s.status === "PENDING" && !conMo.some((a) => a.board === s.id || a.alight === s.id)).map((s) => s.id);
}

// ---- Chuỗi nhật ký (danh sách TRẮNG — kế hoạch mục 1.1: mã chuyến, mã đơn, biển số, con số, nhãn lý do, mã luật phá lệ, chiều, tên nơi danh mục) -----------
/** "HH:MM dd/mm" (năm khi khác năm của lúc lệnh chạy `bayGioMs` — Kiểu D, một hàm `ngayNgan`). */
export const gioNgan = (ms: number, bayGioMs: number): string => {
  const { date, time } = msToVnLocal(ms);
  return `${time} ${ngayNgan(date, msToVnLocal(bayGioMs).date)}`;
};
export const phaLeNhatKy = (luat: string, nhan: string): string => ` · phá lệ ${luat === "MOC_TOI_THIEU" ? "mốc tối thiểu" : "khoảng nghỉ"}: ${nhan}`;
export const maDonGon = (codes: readonly string[]): string => [...new Set(codes)].sort().join(", ");

// ---- Chi tiết chuyến ---------------------------------------------------------------------------------------------------------------------------------------
/**
 * Chi tiết MỘT chuyến cho văn phòng (GET /chuyen/:id và phản hồi mọi lệnh ghi). `lich` (chặng quanh ngày chạy) và `hk` (tên khách) do thân route đọc sau
 * `can(trip.view)` — R-P1: `trip.view = any` ⇒ `contact.view = any`. Nhãn người bấm qua hàm tiêm (R-P20 — một lần cho cả danh sách id).
 */
export async function chiTietChuyen(
  db: D1Database, nen: NenChuyen, lich: readonly ChangLichChung[], hk: readonly ChangChoChuyen[], kemTen: boolean,
  nhanNhanVien: (ids: readonly string[]) => Promise<Map<string, string> | null>, quyenGoiBao: QuyenGoiBao, bayGioMs: number, chung?: DuLieuChung,
): Promise<ChuyenChiTietResponse> {
  const nowIso = new Date(bayGioMs).toISOString();
  const c = chung ?? (await docChung(db, nowIso, msToVnLocal(bayGioMs).date));
  const nc: NguCanhChuyen = await docNguCanh(db, nen, lich, c);
  const t = nen.trip;
  const cs = chinhSachVao(c.chinhSach);
  const lyDoGiu = lyDoGiuDuPhong(t, nc, c, bayGioMs);
  const lichRa = dungLichChung({
    chang: [...nc.chang.values()], changNgoai: nc.changNgoai, nhap: [], chuyen: [nc.chuyen], suat: [...nc.suat, ...nc.suatMoCuaChang.filter((s) => s.tripId !== t.id)],
    diem: nc.diem, chuyenKhac: nc.chuyenKhac, chinhSach: cs, hangBang: c.hangBang, dieuKien: c.dieuKien, bayGioMs,
  });
  const legCua = new Set(nen.legIds);
  const canhBao = lichRa.canhBao.filter((x) => x.tripId === t.id || (x.legId !== null && legCua.has(x.legId) && x.loai !== "CHUYEN_GIU"));
  // ADR-0051: mốc giờ hẹn của các chặng trên chuyến (khối goiBao) — nhãn người bấm "Đã gọi báo" lấy CHUNG lời gọi nhãn (R-P20: một lần mỗi request).
  const dGoiBao = await docGoiBao(db, nen.legIds);
  const nguoiIds = [...new Set([...nen.events.flatMap((e) => (e.created_by ? [e.created_by] : [])), ...nguoiBamGoiBao(dGoiBao)])];
  const nhan = await nhanNhanVien(nguoiIds);
  const tenDiKem = nen.allocs.some((a) => a.kind === "CREW" && a.valid_to_at === null) ? await tenNguoiDiKem(db, nen.trip.id) : undefined;
  const ten = new Map<string, { fullName: string; birthYear: number }>();
  // Họ tên + năm sinh CHỈ ở GET /chuyen/:id (kế hoạch mục 1.8, TC-39 — "đúng hai route van-chuyen trả tên"): phản hồi lệnh ghi không kèm tên (màn tải lại chi tiết).
  if (kemTen) for (const ch of hk) for (const n of ch.nguoi) ten.set(n.personKey, { fullName: n.fullName, birthYear: n.birthYear });
  const lyDoNhan = new Map(c.lyDo.map((r) => [r.code, r.label]));
  const xeRow = c.xe.find((x) => x.id === t.vehicle_id);
  // Đợt 4 G3: TÊN tuyến (kể cả đã ngưng dùng) để form sửa chuyến điền sẵn — chỉ tên, không giá.
  const tuyenRow = t.route_code ? await findRoute(db, t.route_code) : null;
  return {
    chuyen: {
      ...chuyenTomTat(t, { xe: xeRow, chung: c, stops: nen.stops, allocs: nen.allocs, events: nen.events, lyDoGiu, nhan, bayGioMs }),
      nghiPhaLe: t.rest_override_reason_code !== null,
      lyDoHuy: t.cancel_reason_code ? (lyDoNhan.get(t.cancel_reason_code) ?? null) : null,
      lyDoKetThuc: t.end_reason_code ? (lyDoNhan.get(t.end_reason_code) ?? null) : null,
      tuyen: t.route_code ? { ma: t.route_code, ten: tuyenRow?.name ?? t.route_code } : null,
    },
    diem: nen.stops.map((s) => diemChuyenDto(s, { allocs: nen.allocs, chang: nc.chang, stops: nen.stops, events: nen.events, nhan })),
    suat: nen.allocs.filter((a) => a.valid_to_at === null).map((a) => suatChuyenDto(a, { changLich: nc.changLich, changNgoai: nc.changNgoai, ten, events: nen.events, nhan, tenDiKem, lyDoNhan })),
    canhBao: canhBao.map(canhBaoDto),
    nhatKy: nhatKyChuyenDto(nen.events, nhan, lyDoNhan),
    banChup: banChupDto(await banChupCuoi(db, t.id)),
    lyDo: lyDoDangDung(c),
    xe: xeChon(c),
    taiXe: taiXeChon(c),
    mocToiThieuPhut: c.chinhSach?.min_lead_minutes ?? null,
    canhBaoPhut: c.chinhSach?.warn_lead_minutes ?? null,
    gioSomNhatKhai: gioSomNhatKhaiDto(
      { events: nen.events, kepLuiPhut: c.chinhSach?.proxy_backdate_max_minutes ?? null, truoc: ketThucTruoc(nc.chuyenKhacRow, t), bayGioMs }, t, nen.stops, nen.allocs,
    ),
    goiBao: (await Promise.all(nen.legIds.map((id) => goiBaoChang(id, hk, dGoiBao, quyenGoiBao, nhan)))).filter((x): x is GoiBaoChangDto => x !== null),
  };
}

/** Lý do GIỮ dự phóng "xuất bến đúng giờ" của chuyến chưa chạy (cổng xuất bến — cùng một hàm với lệnh xuất bến); chuyến khác trạng thái: rỗng. */
function lyDoGiuDuPhong(t: TripRow, nc: NguCanhChuyen, c: DuLieuChung, bayGioMs: number): LyDoGiu[] {
  if (t.status !== "PLANNED") return [];
  const vao: KiemXuatBenVao = {
    chuyen: nc.chuyen, suat: nc.suat, chang: [...nc.chang.values()], changNgoai: nc.changNgoai, suatMoCuaChang: nc.suatMoCuaChang, diem: nc.diem, chuyenKhac: nc.chuyenKhac,
    chinhSach: chinhSachVao(c.chinhSach), hangBang: c.hangBang, dieuKien: c.dieuKien, bayGioMs: Math.max(bayGioMs, t.planned_start_ms), xuatBenMs: Math.max(bayGioMs, t.planned_start_ms),
  };
  return kiemXuatBen(vao).lyDo;
}

// ---- DTO TÀI XẾ (route 19, 20 và phản hồi lệnh tiến độ của tài xế — Task A15) ---------------------------------------------------------------------------------
/**
 * Chi tiết một chuyến tài xế đang lái. `lich` (chặng — mã đơn, giờ hẹn, điều kiện còn thiếu), `hk` (tên khách — rỗng ngoài ngày chạy), `lienHe` (chỉ GET
 * chi tiết trong ngày chạy; null ở chỗ khác) do THÂN ROUTE đọc sau `can(trip.view / trip.progress, { assigned })`. Nhãn người văn phòng khai giờ qua hàm tiêm
 * (R-P11 / R-P20 — một lần mỗi request).
 */
export async function cuocChiTiet(
  db: D1Database, nen: NenChuyen, lich: readonly ChangLichChung[], hk: readonly ChangChoChuyen[], lienHe: readonly LienHeTaiXe[] | null,
  nhanNhanVien: (ids: readonly string[]) => Promise<Map<string, string> | null>, bayGioMs: number, trongNgay: boolean,
): Promise<CuocChiTietResponse> {
  const c = await docChung(db, new Date(bayGioMs).toISOString(), msToVnLocal(bayGioMs).date);
  const nc = await docNguCanh(db, nen, lich, c);
  const t = nen.trip;
  const nhan = await nhanNhanVien([...new Set(nen.events.flatMap((e) => (e.created_by && e.occurred_source === "VAN_PHONG_KHAI" ? [e.created_by] : [])))]);
  const tenDiKem = nen.allocs.some((a) => a.kind === "CREW" && a.valid_to_at === null) ? await tenNguoiDiKem(db, nen.trip.id) : undefined;
  const ten = new Map<string, { fullName: string; birthYear: number }>();
  const lyDoNhan = new Map(c.lyDo.map((r) => [r.code, r.label]));
  if (trongNgay) for (const ch of hk) for (const n of ch.nguoi) ten.set(n.personKey, { fullName: n.fullName, birthYear: n.birthYear });
  return cuocChiTietDto({
    trip: t, xe: c.xe.find((x) => x.id === t.vehicle_id), events: nen.events,
    diem: nen.stops.map((s) => diemChuyenDto(s, { allocs: nen.allocs, chang: nc.chang, stops: nen.stops, events: nen.events, nhan })),
    suat: nen.allocs.filter((a) => a.valid_to_at === null).map((a) => suatChuyenDto(a, { changLich: nc.changLich, changNgoai: nc.changNgoai, ten, events: nen.events, nhan, tenDiKem, lyDoNhan })),
    lienHe, conThieu: lyDoGiuDuPhong(t, nc, c, bayGioMs), lyDo: c.lyDo.filter((r) => r.reason_group === "KET_THUC_GIAN_DOAN"), nhan, trongNgay,
  });
}
/** "Cuốc của tôi" (route 19, R-P17): mỗi chuyến — không tên, không SĐT; điều kiện còn thiếu = lý do giữ dự phóng (chuyến chưa chạy). */
export async function danhSachCuoc(db: D1Database, trips: readonly TripRow[], lich: readonly ChangLichChung[], bayGioMs: number): Promise<CuocCuaToiItemDto[]> {
  if (trips.length === 0) return [];
  const c = await docChung(db, new Date(bayGioMs).toISOString(), msToVnLocal(bayGioMs).date);
  const ids = trips.map((t) => t.id);
  const [stops, allocs, events] = await Promise.all([stopsByTrips(db, ids), allocsByTrips(db, ids), eventsByTrips(db, ids)]);
  await boSungXe(db, c, trips.map((t) => t.vehicle_id));
  const ra: CuocCuaToiItemDto[] = [];
  for (const t of trips) {
    const a = allocs.filter((x) => x.trip_id === t.id);
    const nen: NenChuyen = {
      trip: t, stops: stops.filter((x) => x.trip_id === t.id), allocs: a, events: events.filter((e) => e.trip_id === t.id || e.related_trip_id === t.id),
      legIds: [...new Set(a.flatMap((x) => (x.kind === "PASSENGER" && x.leg_id !== null ? [x.leg_id] : [])))], tu: "", den: "",
    };
    const conThieu = t.status === "PLANNED" ? lyDoGiuDuPhong(t, await docNguCanh(db, nen, lich, c), c, bayGioMs) : [];
    ra.push(cuocCuaToiItem(t, { xe: c.xe.find((x) => x.id === t.vehicle_id), stops: nen.stops, allocs: a, conThieu }));
  }
  return ra;
}
