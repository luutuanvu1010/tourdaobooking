// C3 (gói A+C Vận chuyển; đánh giá ERP 7/10 mục C32–C37) — luật THUẦN của bảng điều phối: chọn nhiều chặng, lọc cột "Chưa xếp" theo ca / chiều / nơi trả,
// tổng "khách chưa xếp / ghế trống", mức tải của chuyến, hộp "Xếp vào chuyến" ưu tiên chuyến hợp, giờ hẹn từng đoàn ở điểm gộp. Chỉ HIỂN THỊ dữ liệu máy chủ
// trả (`LichChungResponse`, `ChuyenChiTietResponse`) — máy chủ vẫn quyết mọi luật xếp (409); mọi chỗ ở đây chỉ SẮP, LÀM MỜ, NHẮC. Không I/O, không DOM; import
// kèm đuôi .ts. Test: dieu-phoi-loc.test.ts.
import { CHIEU_LABEL } from "./chang-dua-don.ts";
import type { ChangLichDto, ChuyenTomTatDto, GioVnDto, LichChungResponse, SuatChuyenDto } from "./contracts.ts";
import { gioHenNgoaiKhung } from "./dieu-phoi-lich-chung.ts";
import { changChuaXep, chuyenXepDuoc, gioHien } from "./dieu-phoi-man.ts";
import { vnLocalToMs } from "./vn-date.ts";

/** Tối đa chặng trong MỘT lệnh xếp (`POST …/phan-bo` — `docXep`). MỘT con số cho máy chủ và màn (C34). */
export const TOI_DA_CHANG_MOT_LAN = 50;

// ---- chọn nhiều chặng (C34) -----------------------------------------------------------------------------------------------------------------------------
/** Bật / tắt chọn một chặng. Đã đủ `gioiHan` mà thêm chặng mới → giữ nguyên và báo `vuotGioiHan` (màn nói rõ, không lặng lẽ bỏ). */
export function doiChon(chon: ReadonlySet<string>, legId: string, gioiHan = TOI_DA_CHANG_MOT_LAN): { chon: Set<string>; vuotGioiHan: boolean } {
  const moi = new Set(chon);
  if (moi.delete(legId)) return { chon: moi, vuotGioiHan: false };
  if (moi.size >= gioiHan) return { chon: moi, vuotGioiHan: true };
  moi.add(legId);
  return { chon: moi, vuotGioiHan: false };
}
/** Sau mỗi lần tải lại lịch (tin đơn đổi, chuyến đổi): chỉ giữ chặng VẪN còn ở cột "Chưa xếp" — chặng vừa được người khác xếp / bỏ thì rời lựa chọn. */
export function giuChonConHieuLuc(chon: ReadonlySet<string>, l: Pick<LichChungResponse, "chang">): Set<string> {
  const con = new Set(changChuaXep(l).map((x) => x.chang.legId));
  return new Set([...chon].filter((id) => con.has(id)));
}

// ---- lọc cột "Chưa xếp" (C35) ---------------------------------------------------------------------------------------------------------------------------
/** Ca theo GIỜ ĐÓN của chặng (giờ VN): sáng trước 12:00, chiều 12:00–17:59, tối từ 18:00. Ranh giới là giả định bề mặt (đổi một chỗ ở đây). */
export type CaDon = "SANG" | "CHIEU" | "TOI" | "CHUA_CHOT";
export const CA_DON: readonly { ma: CaDon; nhan: string }[] = [
  { ma: "SANG", nhan: "Sáng (trước 12:00)" }, { ma: "CHIEU", nhan: "Chiều (12:00–17:59)" }, { ma: "TOI", nhan: "Tối (từ 18:00)" }, { ma: "CHUA_CHOT", nhan: "Chưa chốt giờ" },
];
export function caCuaGio(gio: string | null): CaDon {
  if (gio === null || !/^\d{2}:\d{2}$/.test(gio)) return "CHUA_CHOT";
  return gio < "12:00" ? "SANG" : gio < "18:00" ? "CHIEU" : "TOI";
}
/** Giá trị ô chọn "nơi trả chưa chốt" (nơi trả null) — không trùng tên một điểm thật. */
export const NOI_TRA_CHUA_CHOT = "__chua-chot__";
export interface BoLoc { ca: CaDon | ""; chieu: "OUT" | "RETURN" | ""; noiTra: string }
export const LOC_TRONG: BoLoc = { ca: "", chieu: "", noiTra: "" };
export const dangLoc = (b: BoLoc): boolean => b.ca !== "" || b.chieu !== "" || b.noiTra !== "";
export const NHAN_CHIEU = CHIEU_LABEL;
/** Lọc theo cả ba tiêu chí (VÀ). Giữ nguyên thứ tự đầu vào (đã xếp theo giờ đón ở `changChuaXep`). */
export function locChangChuaXep<T extends { chang: ChangLichDto }>(ds: readonly T[], b: BoLoc): T[] {
  return ds.filter(({ chang: c }) =>
    (b.ca === "" || caCuaGio(c.gioDon) === b.ca)
    && (b.chieu === "" || c.chieu === b.chieu)
    && (b.noiTra === "" || (b.noiTra === NOI_TRA_CHUA_CHOT ? c.noiTra === null : c.noiTra === b.noiTra)));
}
/** Các nơi trả đang có ở cột "Chưa xếp" (cho ô chọn): theo thứ tự chữ tiếng Việt; thêm mục "chưa chốt" khi có chặng chưa có nơi trả. */
export function noiTraCuaCot(ds: readonly { chang: ChangLichDto }[]): { ma: string; nhan: string }[] {
  const ten = [...new Set(ds.flatMap(({ chang: c }) => (c.noiTra === null ? [] : [c.noiTra])))].sort((a, b) => a.localeCompare(b, "vi"));
  const ra = ten.map((t) => ({ ma: t, nhan: t }));
  if (ds.some(({ chang: c }) => c.noiTra === null)) ra.push({ ma: NOI_TRA_CHUA_CHOT, nhan: "Nơi trả chưa chốt" });
  return ra;
}
/** Bộ lọc chỉ giữ giá trị còn có ở cột (nơi trả đã hết chặng thì bỏ lọc nơi trả — không để cột trống vì lọc ma). */
export function chuanHoaBoLoc(b: BoLoc, ds: readonly { chang: ChangLichDto }[]): BoLoc {
  return b.noiTra !== "" && !noiTraCuaCot(ds).some((x) => x.ma === b.noiTra) ? { ...b, noiTra: "" } : b;
}

// ---- tổng "khách chưa xếp / ghế trống" (C37) ------------------------------------------------------------------------------------------------------------
export interface TongKhachGhe { khachChuaXep: number; gheTrong: number; soChuyen: number }
/** Khách còn phải xếp (cả chặng xếp một phần) và ghế còn trống trên các chuyến CHƯA chạy (xếp được — chuyến đang chạy / đã xong / huỷ không tính). */
export function tongKhachGhe(l: Pick<LichChungResponse, "chang" | "chuyen">): TongKhachGhe {
  const chuyen = l.chuyen.filter((c) => c.trangThai === "PLANNED");
  return {
    khachChuaXep: changChuaXep(l).reduce((n, x) => n + x.conLai, 0),
    gheTrong: chuyen.reduce((n, c) => n + Math.max(0, c.xe.soCho - c.tai), 0),
    soChuyen: chuyen.length,
  };
}
export function cauTongKhachGhe(t: TongKhachGhe): string {
  const ghe = t.soChuyen === 0 ? "chưa có chuyến nào để xếp" : `${t.gheTrong} ghế trống ở ${t.soChuyen} chuyến chưa chạy`;
  return `${t.khachChuaXep} khách chưa xếp · ${ghe}`;
}

// ---- mức tải của chuyến (tô màu) ------------------------------------------------------------------------------------------------------------------------
/** Mức tải theo tải / số chỗ: trống, thoáng (< 80%), gần đầy (≥ 80%), đầy (= 100%), quá tải (> 100%). Ngưỡng 80% là giả định bề mặt. */
export type MucTai = "TRONG" | "THOANG" | "GAN_DAY" | "DAY" | "VUOT";
export const NHAN_MUC_TAI: Readonly<Record<MucTai, string>> = { TRONG: "Còn trống", THOANG: "Còn nhiều chỗ", GAN_DAY: "Gần đầy", DAY: "Đầy", VUOT: "Quá tải" };
export function mucTai(tai: number, soCho: number): MucTai {
  if (tai <= 0) return "TRONG";
  if (soCho <= 0 || tai > soCho) return "VUOT";
  if (tai === soCho) return "DAY";
  return tai / soCho >= 0.8 ? "GAN_DAY" : "THOANG";
}
/** Tỷ lệ lấp đầy 0..1 (làm tròn 2 chữ số) cho thanh tải. */
export const tyLeTai = (tai: number, soCho: number): number => (tai <= 0 ? 0 : soCho <= 0 ? 1 : Math.round(Math.min(1, tai / soCho) * 100) / 100);

// ---- hộp "Xếp vào chuyến" (C32): ưu tiên chuyến hợp, làm mờ chuyến đầy / lệch khung giờ -------------------------------------------------------------
export interface DoiTuongXep { chang: ChangLichDto; soKhach: number }
export interface LuaChonChuyen {
  chuyen: ChuyenTomTatDto;
  nhan: string;
  khoa: boolean;
  /** Chỗ còn trống (số chỗ − tải), không âm. */
  conCho: number;
  /** Số khách định xếp vượt chỗ còn trống — máy chủ sẽ từ chối (VUOT_SO_CHO); vẫn cho chọn (ví dụ khi tách đoàn). */
  day: boolean;
  /** Có chặng định xếp mang giờ hẹn NGOÀI khung giờ chuyến — chỉ cảnh báo (ADR-0096 Đ3.5), máy chủ vẫn xếp. */
  lechGio: boolean;
  /** Làm mờ trên hộp = đầy hoặc lệch giờ. */
  mo: boolean;
  /** Chữ phụ dưới tên chuyến ("đang khoá", "chỉ còn 2 chỗ", "giờ hẹn ngoài khung giờ chuyến"); rỗng = không. */
  ghiChu: string[];
}
const gioHenMs = (c: ChangLichDto): number | null => (c.ngayDon !== null && c.gioDon !== null ? vnLocalToMs(c.ngayDon, c.gioDon) : null);
/**
 * Chuyến chọn được cho các chặng định xếp, ĐÚNG THỨ TỰ hộp: chuyến hợp (không đầy, không lệch khung giờ) theo giờ xuất bến, rồi chuyến chỉ lệch giờ, rồi
 * chuyến đầy. Nền là `chuyenXepDuoc` (chỉ chuyến lên kế hoạch; `khoa` theo `khoaMoc` của máy chủ — không tự tính). Luật "ngoài khung" là `gioHenNgoaiKhung`,
 * CHÍNH hàm của cảnh báo lịch chung.
 */
export function luaChonChuyenXep(l: Pick<LichChungResponse, "ngay" | "chuyen">, doi: readonly DoiTuongXep[]): LuaChonChuyen[] {
  const tong = doi.reduce((n, d) => n + d.soKhach, 0);
  const ra = chuyenXepDuoc(l).map((x): LuaChonChuyen => {
    const conCho = Math.max(0, x.chuyen.xe.soCho - x.chuyen.tai);
    const day = tong > conCho;
    const lech = doi.filter((d) => {
      const g = gioHenMs(d.chang);
      return g !== null && gioHenNgoaiKhung(g, x.chuyen.batDauMs, x.chuyen.ketThucMs);
    }).length;
    const ghiChu = [
      ...(x.khoa ? ["đang khoá"] : []),
      ...(day ? [conCho === 0 ? "đầy" : `chỉ còn ${conCho} chỗ`] : []),
      ...(lech > 0 ? [doi.length > 1 ? `${lech}/${doi.length} lượt có giờ hẹn ngoài khung giờ chuyến` : "giờ hẹn ngoài khung giờ chuyến"] : []),
    ];
    return { chuyen: x.chuyen, nhan: x.nhan, khoa: x.khoa, conCho, day, lechGio: lech > 0, mo: day || lech > 0, ghiChu };
  });
  const hang = (x: LuaChonChuyen) => (x.day ? 2 : x.lechGio ? 1 : 0);
  return ra.map((x, i) => ({ x, i })).sort((a, b) => hang(a.x) - hang(b.x) || a.i - b.i).map((e) => e.x);
}
/**
 * Cảnh báo SAU lệnh xếp, từ `ChuyenChiTietResponse.canhBao` (máy chủ đã tính bằng `dungLichChung` trên trạng thái sau lệnh): chỉ các cảnh báo "giờ hẹn nằm ngoài
 * khung giờ chuyến" của CHÍNH các chặng vừa xếp — không nhắc lại cảnh báo cũ của đoàn khác trên chuyến. Mỗi câu kèm mã đơn.
 */
export function canhBaoGioHenSauXep(canhBao: readonly { loai: string; nhan: string; legId: string | null; maDon: string | null }[], legIds: readonly string[]): string[] {
  const dich = new Set(legIds);
  return [...new Set(canhBao.filter((x) => x.loai === "GIO_HEN_NGOAI_CHUYEN" && x.legId !== null && dich.has(x.legId)).map((x) => `${x.nhan}${x.maDon ? `: ${x.maDon}` : ""}`))];
}

// ---- giờ hẹn từng đoàn ở điểm gộp (C33) -----------------------------------------------------------------------------------------------------------------
export interface DoanTaiDiem { legId: string; maDon: string | null; gioHen: GioVnDto | null; soNguoi: number }
/** Các đoàn (mỗi chặng một đoàn) lên xe tại điểm ĐÓN `diemId`, sắp theo giờ hẹn (chưa chốt giờ cuối), suất khách đã huỷ tại điểm không tính. */
export function doanTaiDiem(diemId: string, suat: readonly Pick<SuatChuyenDto, "loai" | "legId" | "maDon" | "gioHen" | "diemLen" | "trangThai">[]): DoanTaiDiem[] {
  const theo = new Map<string, DoanTaiDiem>();
  for (const s of suat) {
    if (s.loai !== "PASSENGER" || s.legId === null || s.diemLen !== diemId || s.trangThai === "CANCELLED_AT_STOP") continue;
    const d = theo.get(s.legId);
    if (d) d.soNguoi++;
    else theo.set(s.legId, { legId: s.legId, maDon: s.maDon, gioHen: s.gioHen ?? null, soNguoi: 1 });
  }
  const ms = (g: GioVnDto | null): number => (g === null ? Number.POSITIVE_INFINITY : (vnLocalToMs(g.ngay, g.gio) ?? Number.POSITIVE_INFINITY));
  return [...theo.values()].sort((a, b) => ms(a.gioHen) - ms(b.gioHen) || (a.maDon ?? "").localeCompare(b.maDon ?? ""));
}
/** Chỉ hiện giờ từng đoàn khi điểm có TỪ HAI đoàn trở lên (một đoàn thì giờ hẹn của điểm đã nói đủ). */
export const canHienDoan = (ds: readonly DoanTaiDiem[]): boolean => ds.length >= 2;
/** "DH-0001 · hẹn 08:20 · 3 khách" (ngày kèm khi khác ngày đang xem; "chưa chốt giờ" khi chưa có giờ). */
export function cauDoan(d: DoanTaiDiem, ngayXem: string): string {
  return [d.maDon, d.gioHen ? `hẹn ${gioHien(d.gioHen, ngayXem)}` : "chưa chốt giờ hẹn", `${d.soNguoi} khách`].filter((x): x is string => !!x).join(" · ");
}
