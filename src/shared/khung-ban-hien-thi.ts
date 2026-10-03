// LUẬT HIỂN THỊ trang "Lịch xe bận" (lưới tuần — bản vẽ docs/design/van-chuyen-dot-3-7/Quản lý lịch xe bận.dc.html, 2/10) + dải bận trên Điều phối xe
// (ADR-0055 VK2-A; kế hoạch Đợt 3 Task 10). Thuần, không DOM, không import src/modules/; import kèm đuôi .ts. Test: khung-ban-hien-thi.test.ts (ba múi giờ).
// - Ngày / tuần là ngày dân sự giờ VN: tuần = `vnWeekRange` (MỘT luật với máy chủ `GET /api/van-chuyen/ban-xe`), ô ngày cắt khung theo [00:00 VN, 00:00 VN hôm sau)
//   — KHÔNG `new Date(y, m, d)` / `getDay()` của trình duyệt (bản vẽ dùng; lệch tuần ở máy múi âm).
// - Mục CHUYEN (câu 3.1, chủ 2/10): chỉ mã chuyến CX-… + giờ — không mã đơn, không tên khách; bấm mở Chi tiết chuyến; không rút.
import type { KhungBanChongChuyenLoi, KhungBanLichDto, LichXeBanResponse } from "./contracts.ts";
import { chongNuaMo } from "./khung-ban.ts";
import { addDays, isISODate, isHHMM, msToVnLocal, ngayNgan, vnLocalToMs, vnWeekRange } from "./vn-date.ts";

const NGAY_MS = 86_400_000;
const PHUT = 60_000;
const gioCua = (ms: number): string => msToVnLocal(ms).time;

// ---- Tuần ----------------------------------------------------------------------------------------------------------------------------------------------
/** Tuần đang xem: `tu` (bất kỳ ngày nào trong tuần) hoặc tuần của `homNay`. Nhãn theo bản vẽ "28/09 – 04/10/2026" (năm của ngày cuối). */
export function tuanXem(tu: string | null, homNay: string): { tu: string; den: string; truoc: string; sau: string; nhan: string } {
  const { from, to } = vnWeekRange(tu !== null && isISODate(tu) ? tu : homNay);
  return { tu: from, den: to, truoc: addDays(from, -7), sau: addDays(from, 7), nhan: `${ngayNgan(from, from)} – ${ngayNgan(to, to)}/${to.slice(0, 4)}` }; // bản vẽ: năm chỉ ở ngày cuối
}

// ---- Lưới tuần -----------------------------------------------------------------------------------------------------------------------------------------
export interface MucO {
  loai: "BAN" | "CHUYEN";
  id: string;
  /** "Cả ngày" | "từ 23:00" | "đến 07:00" | "06:30–16:00" — cắt theo ô ngày giờ VN. */
  gio: string;
  /** BAN: nhãn lý do; CHUYEN: mã chuyến CX-…. */
  nhan: string;
  rutDuoc: boolean;
  version: number | null;
  href: string | null;
}
const THU = ["THỨ 2", "THỨ 3", "THỨ 4", "THỨ 5", "THỨ 6", "THỨ 7", "CN"] as const;

/** Nhãn giờ của khoảng [a, b) trong ô ngày [d0, d1). */
function gioTrongO(a: number, b: number, d0: number, d1: number): string {
  const truoc = a <= d0;
  const sau = b >= d1;
  if (truoc && sau) return "Cả ngày";
  if (truoc) return `đến ${gioCua(b)}`;
  if (sau) return `từ ${gioCua(a)}`;
  return `${gioCua(a)}–${gioCua(b)}`;
}

export function luoiTuanXeBan(v: LichXeBanResponse, homNay: string, bayGioMs: number): {
  ngay: { k: string; thu: string; nhan: string; homNay: boolean }[];
  hang: { xeId: string; bienSo: string; soChoNhan: string; trangThaiNhan: string | null; o: MucO[][] }[];
  soLichBan: number;
} {
  const tuan = tuanXem(v.tu, homNay);
  const ngay = THU.map((thu, i) => {
    const k = addDays(tuan.tu, i);
    return { k, thu, nhan: ngayNgan(k, homNay), homNay: k === homNay };
  });
  const khoang = ngay.map((n) => [vnLocalToMs(n.k, "00:00")!, vnLocalToMs(addDays(n.k, 1), "00:00")!] as const);
  const hang = v.xe.map((x) => {
    const o = khoang.map(([d0, d1]) => {
      const ban = v.khung
        .filter((k) => k.xeId === x.id && chongNuaMo(k.batDauMs, k.ketThucMs, d0, d1))
        .map((k) => ({ bd: k.batDauMs, m: { loai: "BAN", id: k.id, gio: gioTrongO(k.batDauMs, k.ketThucMs, d0, d1), nhan: k.lyDo, rutDuoc: !k.daRut && k.ketThucMs > bayGioMs, version: k.version, href: null } satisfies MucO }));
      const chuyen = v.chuyen
        .filter((c) => c.xeId === x.id && chongNuaMo(c.batDauMs, c.ketThucMs, d0, d1))
        .map((c) => ({ bd: c.batDauMs, m: { loai: "CHUYEN", id: c.id, gio: gioTrongO(c.batDauMs, c.ketThucMs, d0, d1), nhan: c.ma, rutDuoc: false, version: null, href: `/chuyen?id=${encodeURIComponent(c.id)}` } satisfies MucO }));
      return [...ban, ...chuyen].sort((a, b) => a.bd - b.bd).map((x2) => x2.m as MucO);
    });
    return { xeId: x.id, bienSo: x.bienSo, soChoNhan: `Xe ${x.soCho} chỗ`, trangThaiNhan: x.trangThai === "maintenance" ? "Bảo dưỡng" : null, o };
  });
  const [tuMs, denMs] = [khoang[0]![0], khoang[6]![1]];
  const soLichBan = v.khung.filter((k) => !k.daRut && chongNuaMo(k.batDauMs, k.ketThucMs, tuMs, denMs)).length;
  return { ngay, hang, soLichBan };
}

/** Câu hỏi xác nhận rút (ADR-0055 A1: rút một lần, không xoá). */
export function cauHoiRut(m: MucO, ngay: string, homNay?: string): string {
  const gio = m.gio === "Cả ngày" ? "cả ngày" : m.gio;
  return `Rút lịch bận ${m.nhan} ${gio} ${ngayNgan(ngay, homNay)}? Xe sẽ xếp chuyến được trong giờ này.`;
}

// ---- Dải bận trên Điều phối xe ---------------------------------------------------------------------------------------------------------------------------
/** Khung giao ngày D (giờ VN) → phút trong ngày, kẹp [0, 1440]. "24:00" khi kéo tới hết ngày. */
export function daiBanTrenLich(ds: readonly KhungBanLichDto[], ngay: string): { xeId: string; tuPhut: number; denPhut: number; gio: string; nhan: string }[] {
  const d0 = vnLocalToMs(ngay, "00:00");
  if (d0 === null) return [];
  const d1 = d0 + NGAY_MS;
  const hhmm = (p: number): string => `${String(Math.floor(p / 60)).padStart(2, "0")}:${String(p % 60).padStart(2, "0")}`;
  return ds.flatMap((k) => {
    const a = Date.parse(k.batDau);
    const b = Date.parse(k.ketThuc);
    if (!chongNuaMo(a, b, d0, d1)) return [];
    const tuPhut = Math.max(0, Math.round((a - d0) / PHUT));
    const denPhut = Math.min(1440, Math.round((b - d0) / PHUT));
    const gio = `${hhmm(tuPhut)}–${hhmm(denPhut)}`;
    return [{ xeId: k.xeId, tuPhut, denPhut, gio, nhan: `Xe bận ${gio} · ${k.lyDo}` }];
  });
}

/** 409 `khung_ban_chong_chuyen` → một câu liệt kê mọi chuyến trùng. */
export function cauLoiChongChuyen(e: KhungBanChongChuyenLoi["error"]): string {
  return `Xe đang có ${e.chuyen.length} chuyến trùng: ${e.chuyen.map((c) => `${c.ma} (${c.gio})`).join(", ")} — dời hoặc đổi xe chuyến đó trước.`;
}

// ---- Form "Thêm lịch bận" ------------------------------------------------------------------------------------------------------------------------------
/** Form của bản vẽ + ô "Đến ngày" (câu 3.3, chủ 2/10). `denNgay` trống = cùng ngày. */
export interface FormKhungBan { xeId: string; ngay: string; denNgay: string; tuGio: string; denGio: string; lyDo: string }
export type KetQuaFormKhungBan =
  | { ok: true; xeId: string; value: { batDau: { ngay: string; gio: string }; ketThuc: { ngay: string; gio: string }; lyDo: string } }
  | { ok: false; loi: Partial<Record<keyof FormKhungBan, string>> };
const TOI_DA_NGAY = 31; // khớp KHUNG_XE_TOI_DA_NGAY của máy chủ (ADR-0055 G-A1) — máy chủ vẫn quyết

/** Biên khớp `kiemKhungBanMoi` của máy chủ; lỗi theo ô (cùng lúc, không dừng ở ô đầu). */
export function docFormKhungBan(f: FormKhungBan, bayGioMs: number): KetQuaFormKhungBan {
  const loi: Partial<Record<keyof FormKhungBan, string>> = {};
  const denNgay = f.denNgay.trim() === "" ? f.ngay : f.denNgay;
  if (!f.xeId) loi.xeId = "Chọn xe.";
  if (!isISODate(f.ngay)) loi.ngay = "Chọn ngày bắt đầu.";
  if (!isISODate(denNgay)) loi.denNgay = "Chọn ngày kết thúc.";
  else if (isISODate(f.ngay) && denNgay < f.ngay) loi.denNgay = "Đến ngày không được trước ngày bắt đầu.";
  if (!isHHMM(f.tuGio)) loi.tuGio = "Nhập giờ bắt đầu (giờ:phút).";
  if (!isHHMM(f.denGio)) loi.denGio = "Nhập giờ kết thúc (giờ:phút).";
  if (!f.lyDo) loi.lyDo = "Chọn lý do xe bận.";
  if (!loi.ngay && !loi.denNgay && !loi.tuGio && !loi.denGio) {
    const a = vnLocalToMs(f.ngay, f.tuGio)!;
    const b = vnLocalToMs(denNgay, f.denGio)!;
    if (b <= a) loi.denGio = "Giờ kết thúc phải sau giờ bắt đầu.";
    else if (b <= bayGioMs) loi.denGio = "Khung này đã qua — chỉ ghi khung còn tới hoặc đang diễn ra.";
    else if (b - a > TOI_DA_NGAY * NGAY_MS) loi.denNgay = `Một lịch bận dài tối đa ${TOI_DA_NGAY} ngày.`;
  }
  if (Object.keys(loi).length > 0) return { ok: false, loi };
  return { ok: true, xeId: f.xeId, value: { batDau: { ngay: f.ngay, gio: f.tuGio }, ketThuc: { ngay: denNgay, gio: f.denGio }, lyDo: f.lyDo } };
}
