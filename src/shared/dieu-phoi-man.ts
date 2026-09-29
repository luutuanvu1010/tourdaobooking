// Luật thuần của ba màn VĂN PHÒNG của Bảng điều phối lượt 1 — B1 Điều phối xe (V1), B2 Chi tiết chuyến (V2), B3 Tạo / sửa chuyến (V3). ADR-0049, ADR-0050;
// bản vẽ docs/design/van-chuyen-dieu-phoi/project/01–03 + dp-*; bản đối chiếu DOI-CHIEU-2026-09-29.md (2.1, 2.2, 2.3, 2.7, 2.9, 2.12, 2.13, H6–H8, H10, H11,
// H14, H17–H19). Không I/O, không DOM; import kèm đuôi .ts. Test: dieu-phoi-man.test.ts.
// - Chỉ HIỂN THỊ dữ liệu máy chủ trả (LichChungResponse, ChuyenChiTietResponse). Không tự tính khoá theo mốc: "đang khoá" = `khoaMoc.dangKhoa` (R-P13); vạch mốc
//   trên dòng thời gian dùng `mocToiThieuPhut` (R-P12) chỉ để vẽ. Câu lý do giữ lấy nguyên `loiNhan`; ai xử lý lấy `aiXuLyNhan` (H14).
// - Nút / lối tắt theo CỜ quyền truyền vào (can() ở trang), không theo tên vai.
import { nhanThoiLuong } from "./chinh-sach-hien-thi.ts";
import type { CanhBaoLichDto, ChangLichDto, ChuyenTomTatDto, DiemChuyenDto, GioHenDto, GioVnDto, GoiBaoChangDto, LichChungResponse, LyDoGiuDto, MucNhacGoiDto, NhatKyChuyenDto } from "./contracts.ts";
import { AI_XU_LY_GIO_HEN_DOI, NHAN_GIO_HEN_DOI, moTaDoiGio } from "./goi-bao.ts";
import { can, type PermissionHolder } from "./permissions.ts";
import { maskLongDigits } from "./text-guards.ts";
import { msToVnLocal, vnLocalToMs } from "./vn-date.ts";

const GIO = 3_600_000;
/** Làm tròn 4 chữ số (vị trí theo giờ trên dòng thời gian — tránh sai số dấu phẩy động). */
const r4 = (n: number): number => Math.round(n * 1e4) / 1e4;
const PHUT = 60_000;

/** Giờ hiển thị: "HH:MM"; khác ngày đang xem → "HH:MM dd/mm". */
export function gioHien(g: GioVnDto, ngayXem: string): string {
  return g.ngay === ngayXem ? g.gio : `${g.gio} ${g.ngay.slice(8, 10)}/${g.ngay.slice(5, 7)}`;
}

/** Mục "Điều phối xe" (menu, trang Tôi) + trang /dieu-phoi: ô trip.view KHÔNG kèm ngữ cảnh — tài xế (ô "assigned") và mã không có ô → không (Q-B-4). */
export function thayDieuPhoiXe(who: PermissionHolder): boolean {
  return can(who, "trip.view");
}

const THU = ["Chủ nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"] as const;
/** "Thứ Tư · hôm nay" cạnh ô ngày (bản vẽ 01) — lịch dân sự, không phụ thuộc múi giờ máy. */
export function nhanNgayXem(ngay: string, homNay: string): string {
  const [y, m, d] = ngay.split("-").map(Number) as [number, number, number];
  const thu = THU[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]!;
  const lech = Math.round((Date.UTC(y, m - 1, d) - Date.parse(`${homNay}T00:00:00Z`)) / 86_400_000);
  const phu = lech === 0 ? "hôm nay" : lech === 1 ? "ngày mai" : lech === -1 ? "hôm qua" : "";
  return phu ? `${thu} · ${phu}` : thu;
}

// ---- chặng ---------------------------------------------------------------------------------------------------------------------------------------------------
export type Tone = "danger" | "warn" | "unit" | "muted" | "ok";
const NHAN_CHANG: Readonly<Record<string, { nhan: string; tone: Tone }>> = {
  QUA_MOC: { nhan: "Quá mốc", tone: "danger" },
  SAT_MOC: { nhan: "Sát mốc", tone: "warn" },
  DAT_GAP: { nhan: "Đặt gấp", tone: "unit" },
  XEP_MOT_PHAN: { nhan: "Xếp một phần", tone: "warn" },
  THUA_SUAT: { nhan: "Xếp thừa", tone: "danger" },
  CHUA_CHOT_GIO: { nhan: "Chưa chốt giờ", tone: "muted" },
  VANG: { nhan: "Có khách vắng", tone: "muted" },
  KHACH_HUY: { nhan: "Có khách huỷ", tone: "muted" },
};
/** Nhãn trên thẻ chặng (bản vẽ dp-chua-xep: "Quá mốc" đỏ, "Sát mốc" cát, "Đặt gấp", "Thiếu tên"). Mã lạ bị bỏ — không bao giờ hiện mã. */
export function chipChang(c: ChangLichDto): { nhan: string; tone: Tone }[] {
  const out = c.nhan.flatMap((m) => (NHAN_CHANG[m] ? [NHAN_CHANG[m]!] : []));
  if (c.soNguoiCoTen < c.soNguoi) out.push({ nhan: "Thiếu tên", tone: "warn" });
  return out;
}
const tuyen = (c: ChangLichDto): string => `${c.noiDon} → ${c.noiTra ?? "nơi trả chưa chốt"}`;

/** Cột "Chưa xếp": chặng chưa xếp hoặc mới xếp một phần; `conLai` = số người còn phải xếp. Xếp theo giờ đón (chưa chốt giờ cuối). */
export function changChuaXep(l: Pick<LichChungResponse, "chang">): { chang: ChangLichDto; conLai: number }[] {
  return l.chang
    .filter((c) => c.trangThai === "CHUA_XEP" || c.nhan.includes("XEP_MOT_PHAN"))
    .map((c) => ({ chang: c, conLai: Math.max(0, c.soNguoi - c.soDaXep) }))
    .sort((a, b) => (a.chang.gioDon ?? "99:99").localeCompare(b.chang.gioDon ?? "99:99") || a.chang.maDon.localeCompare(b.chang.maDon));
}

export interface SoLieu { chang: number; daXep: number; chuaXep: number; satMoc: number; quaMoc: number; chuyen: number; biGiu: number; canXuLy: number; nhap: number; choDatGap: number }
/** Dòng số liệu đầu màn (bản vẽ 01). */
export function soLieuDieuPhoi(l: LichChungResponse, canXuLy: number): SoLieu {
  const song = l.chang.filter((c) => c.trangThai !== "DA_BO" && c.trangThai !== "DON_NHAP");
  const chua = changChuaXep(l);
  const chuyen = l.chuyen.filter((c) => c.trangThai !== "CANCELLED");
  return {
    chang: song.length,
    daXep: song.filter((c) => c.trangThai !== "CHUA_XEP" && c.soDaXep >= c.soNguoi).length,
    chuaXep: chua.length,
    satMoc: chua.filter((x) => x.chang.nhan.includes("SAT_MOC")).length,
    quaMoc: chua.filter((x) => x.chang.nhan.includes("QUA_MOC")).length,
    chuyen: chuyen.length,
    biGiu: chuyen.filter((c) => c.trangThai === "PLANNED" && c.lyDoGiu.length > 0).length,
    canXuLy,
    nhap: l.soNhap,
    choDatGap: l.nhapChoDatGap.length,
  };
}

// ---- chuyến --------------------------------------------------------------------------------------------------------------------------------------------------
export type KieuChuyen = "plan" | "run" | "done" | "held" | "nodrv" | "cancel";
/** Màu / nhãn chuyến (bản vẽ dp-dong-thoi-gian: lên kế hoạch / đang chạy / xong / bị giữ / chưa có tài xế). */
export function kieuChuyen(c: Pick<ChuyenTomTatDto, "trangThai" | "trangThaiNhan" | "lyDoGiu">): { kieu: KieuChuyen; nhan: string } {
  if (c.trangThai === "PLANNED" && c.lyDoGiu.length > 0) {
    return c.lyDoGiu.every((l) => l.ma === "CHUA_CO_TAI_XE") ? { kieu: "nodrv", nhan: "Chưa có tài xế" } : { kieu: "held", nhan: "Bị giữ" };
  }
  const kieu: KieuChuyen = c.trangThai === "RUNNING" ? "run" : c.trangThai === "PLANNED" ? "plan" : c.trangThai === "CANCELLED" ? "cancel" : "done";
  return { kieu, nhan: c.trangThaiNhan };
}

/** Tuyến của chuyến trên thẻ "đang chọn" (bản vẽ 01): điểm đón theo thứ tự → điểm trả; bỏ điểm đã bỏ qua / đã chuyển. */
export function tuyenChuyen(diem: ChuyenTomTatDto["diem"]): { don: string[]; tra: string[] } {
  const con = [...diem].filter((d) => d.trangThai !== "SKIPPED" && d.trangThai !== "MOVED").sort((a, b) => a.thuTu - b.thuTu);
  return { don: con.filter((d) => d.loai === "PICKUP").map((d) => d.tenNoi), tra: con.filter((d) => d.loai === "DROPOFF").map((d) => d.tenNoi) };
}

/** Chuyến chọn được trong hộp "Xếp vào chuyến": chỉ chuyến lên kế hoạch, theo giờ xuất bến; `khoa` = `khoaMoc.dangKhoa` của máy chủ (không tự tính). */
export function chuyenXepDuoc(l: Pick<LichChungResponse, "ngay" | "chuyen">): { chuyen: ChuyenTomTatDto; nhan: string; khoa: boolean }[] {
  return l.chuyen
    .filter((c) => c.trangThai === "PLANNED")
    .sort((a, b) => a.batDauMs - b.batDauMs)
    .map((c) => ({ chuyen: c, nhan: `${c.ma} · ${gioHien(c.batDau, l.ngay)}–${gioHien(c.ketThuc, l.ngay)} · ${c.xe.bienSo} · tải ${c.tai}/${c.xe.soCho}`, khoa: c.khoaMoc.dangKhoa }));
}

/** Câu khoá theo mốc (bản vẽ 01 LOCK) — chỉ hiện khi `khoaMoc.dangKhoa`. */
export function cauKhoaMoc(mocPhut: number | null, co: { phaLe: boolean; dieuPhoi: boolean }): string {
  const dau = `Trong ${mocPhut === null ? "mốc tối thiểu" : nhanThoiLuong(mocPhut)} trước giờ xuất bến — khoá xếp khách, đổi xe, đổi tài xế.`;
  if (!co.dieuPhoi) return dau;
  return `${dau} ${co.phaLe ? "Bạn có thể phá lệ." : "Cần Quản trị phá lệ."} Cập nhật điểm theo đơn không cần phá lệ.`;
}

// ---- "Cần xử lý" ---------------------------------------------------------------------------------------------------------------------------------------------
export type HanhDong =
  | { nhan: string; kieu: "link"; href: string }
  | { nhan: string; kieu: "cap-nhat-diem"; tripId: string }
  /** ADR-0051: "Đã gọi báo" — gửi lại `phienBan` + giờ "mới" màn đã hiện. */
  | { nhan: string; kieu: "goi-bao"; legId: string; phienBan: number; gioMoi: GioHenDto; maDon: string };
export interface ViecCanXuLy {
  loai: string;
  tone: "danger" | "warn" | "navy";
  bieuTuong: "alert" | "clock" | "assign" | "pin" | "doc-check" | "handset";
  tieuDe: string;
  /** Liên kết của tiêu đề (mở chuyến / mở đơn); null = không liên kết. */
  href: string | null;
  noiDung: string;
  aiXuLy: string;
  /** Dòng khoá "Cần Quản trị phá lệ" (Bán hàng — bản vẽ 1e); null = không. */
  khoa: string | null;
  hanhDong: HanhDong[];
}
/** Cảnh báo lịch KHÔNG thành mục riêng: trùng mục chuyến bị giữ / đơn nháp, hoặc đã hiện ở chỗ khác (nhãn "Sát mốc" ở cột Chưa xếp; dải trên màn). */
const BO_QUA_CANH_BAO = new Set(["CHUYEN_GIU", "NHAP_CHO_DAT_GAP", "CHANG_SAT_MOC", "CHINH_SACH_RONG"]);
const TONE_CANH_BAO: Readonly<Record<string, ViecCanXuLy["tone"]>> = { CHANG_QUA_MOC: "danger", THUA_SUAT: "danger", CHANG_GIU: "danger" };
const ICON_CANH_BAO: Readonly<Record<string, ViecCanXuLy["bieuTuong"]>> = { CHANG_QUA_MOC: "clock", GIO_XE_TOI_MUON_HON_HEN: "clock", NOI_HEN_KHAC_DIEM: "pin" };

/**
 * Cột "Cần xử lý" (bản vẽ dp-can-xu-ly, sửa theo đối chiếu): (1) chuyến bị giữ — lý do nguyên câu, ai xử lý theo NHAN_AI_XU_LY, nút theo cờ; (2) cảnh báo lịch —
 * nhãn NHAN_CANH_BAO_LICH, KHÔNG nút (không "Gọi tài xế" — H7; không "Đã gọi báo" — Q2 / ADR-0051 làm sau; Q-GB-1 = b); chặng quá mốc chưa đặt gấp: Bán hàng
 * thấy dòng khoá (đặt gấp thì không cần phá lệ — 2.1; không có nút "Phá lệ" riêng — 2.13); (3) đơn nháp chờ duyệt đặt gấp — không tên người lập (H8).
 */
export function viecCanXuLy(l: LichChungResponse, co: { dieuPhoi: boolean; phaLe: boolean; quanLyXe: boolean }, nhacGoi: readonly MucNhacGoiDto[] = []): ViecCanXuLy[] {
  const out: ViecCanXuLy[] = [];
  const chuyenTheoId = new Map(l.chuyen.map((c) => [c.id, c]));
  const changTheoId = new Map(l.chang.map((c) => [c.legId, c]));
  for (const c of l.chuyen) {
    if (c.trangThai !== "PLANNED" || c.lyDoGiu.length === 0) continue;
    const k = kieuChuyen(c);
    const ma = new Set(c.lyDoGiu.map((x) => x.ma));
    const hanhDong: HanhDong[] = [];
    if (ma.has("NOI_HEN_DOI") && co.dieuPhoi) hanhDong.push({ nhan: "Cập nhật điểm theo đơn", kieu: "cap-nhat-diem", tripId: c.id });
    if (ma.has("DIEU_KIEN_GIAY_TO_XE") && co.quanLyXe) hanhDong.push({ nhan: "Mở giấy tờ xe", kieu: "link", href: `/xe-chi-tiet?id=${encodeURIComponent(c.xe.id)}` });
    if (ma.has("CHUA_CO_TAI_XE") && co.dieuPhoi) hanhDong.push({ nhan: "Chọn tài xế", kieu: "link", href: `/chuyen-sua?id=${encodeURIComponent(c.id)}` });
    out.push({
      loai: k.kieu === "nodrv" ? "Chưa có tài xế" : "Chuyến bị giữ",
      tone: k.kieu === "nodrv" ? "warn" : "danger",
      bieuTuong: k.kieu === "nodrv" ? "assign" : "alert",
      tieuDe: `${c.ma} · ${gioHien(c.batDau, l.ngay)} · ${c.xe.bienSo}`,
      href: `/chuyen?id=${encodeURIComponent(c.id)}`,
      noiDung: c.lyDoGiu.map((x) => x.loiNhan).join("; "),
      aiXuLy: [...new Set(c.lyDoGiu.map((x) => x.aiXuLyNhan))].join(", "),
      khoa: null,
      hanhDong,
    });
  }
  // Thứ tự bản vẽ dp-can-xu-ly: chuyến bị giữ → chặng quá mốc → giờ hẹn đổi (ADR-0051) → cảnh báo khác → đơn nháp chờ duyệt.
  const canhBao = [...l.canhBao.filter((w) => w.loai === "CHANG_QUA_MOC"), ...l.canhBao.filter((w) => w.loai !== "CHANG_QUA_MOC")];
  let daNhac = false;
  for (const w of canhBao) {
    if (!daNhac && w.loai !== "CHANG_QUA_MOC") {
      out.push(...viecGoiBao(nhacGoi, l.ngay));
      daNhac = true;
    }
    if (BO_QUA_CANH_BAO.has(w.loai)) continue;
    // Chuyến chưa chạy đã bị giữ "nơi đón / trả đã đổi": mục chuyến bị giữ ở trên đã nói + có nút "Cập nhật điểm theo đơn" — không thêm mục thứ hai.
    const tw = w.tripId ? chuyenTheoId.get(w.tripId) : undefined;
    if (w.loai === "NOI_HEN_KHAC_DIEM" && tw?.trangThai === "PLANNED" && tw.lyDoGiu.some((x) => x.ma === "NOI_HEN_DOI")) continue;
    out.push(viecTuCanhBao(w, l.ngay, w.legId ? changTheoId.get(w.legId) : undefined, w.tripId ? chuyenTheoId.get(w.tripId) : undefined, co));
  }
  if (!daNhac) out.push(...viecGoiBao(nhacGoi, l.ngay));
  for (const n of l.nhapChoDatGap) {
    const ngay = n.ngayDon === l.ngay ? "" : ` ${n.ngayDon.slice(8, 10)}/${n.ngayDon.slice(5, 7)}`;
    out.push({
      loai: "Đơn nháp chờ duyệt đặt gấp", tone: "navy", bieuTuong: "doc-check", tieuDe: `${n.maDon} · đón ${n.gioDon ?? "chưa chốt giờ"}${ngay}`, href: `/order?id=${encodeURIComponent(n.orderId)}`,
      noiDung: "", aiXuLy: "Quản trị", khoa: null, hanhDong: [{ nhan: "Xem đơn", kieu: "link", href: `/order?id=${encodeURIComponent(n.orderId)}` }],
    });
  }
  return out;
}
function viecTuCanhBao(w: CanhBaoLichDto, ngay: string, c: ChangLichDto | undefined, t: ChuyenTomTatDto | undefined, co: { dieuPhoi: boolean; phaLe: boolean }): ViecCanXuLy {
  const tone = TONE_CANH_BAO[w.loai] ?? "warn";
  const bieuTuong = ICON_CANH_BAO[w.loai] ?? "alert";
  if (w.loai === "CHANG_QUA_MOC" && c) {
    const conLai = Math.max(0, c.soNguoi - c.soDaXep);
    return {
      loai: "Chặng quá mốc", tone, bieuTuong, tieuDe: `${c.gioDon ?? "Chưa chốt giờ"} · ${tuyen(c)}`, href: `/order?id=${encodeURIComponent(c.orderId)}`,
      noiDung: `Chưa xếp chuyến. ${c.maDon} · ${conLai} khách${c.datGap ? " · đã duyệt đặt gấp" : ""}`, aiXuLy: "Văn phòng",
      khoa: !c.datGap && co.dieuPhoi && !co.phaLe ? "Cần Quản trị phá lệ" : null, hanhDong: [],
    };
  }
  const tieuDe = t ? `${t.ma} · ${w.maDon ?? ""}`.replace(/ · $/, "") : c ? `${c.gioDon ?? "Chưa chốt giờ"} · ${c.maDon}` : (w.maDon ?? "");
  const noiDung = c ? `Chặng ${c.gioDon ?? "chưa chốt giờ"}${c.ngayDon !== ngay ? ` ${c.ngayDon.slice(8, 10)}/${c.ngayDon.slice(5, 7)}` : ""} · ${tuyen(c)}` : "";
  return { loai: w.nhan, tone, bieuTuong, tieuDe, href: t ? `/chuyen?id=${encodeURIComponent(t.id)}` : c ? `/order?id=${encodeURIComponent(c.orderId)}` : null, noiDung, aiXuLy: "Văn phòng", khoa: null, hanhDong: [] };
}

// ---- dòng thời gian ------------------------------------------------------------------------------------------------------------------------------------------
export interface KhoiChuyen {
  id: string;
  ma: string;
  /** Phần cuối mã ("07") — chữ trên khối (bản vẽ). */
  maNgan: string;
  /** Vị trí và độ dài tính bằng GIỜ kể từ đầu khung (màn nhân với token px/giờ). */
  trai: number;
  dai: number;
  kieu: KieuChuyen;
  nhan: string;
  tai: string;
  gio: string;
  diem: ("PICKUP" | "DROPOFF")[];
  /** Đang khoá theo mốc — cờ `khoaMoc.dangKhoa` của máy chủ (R-P13), không tự tính. */
  khoa: boolean;
}
export interface HangXe { xeId: string; bienSo: string; soCho: string; taiXe: string; thieuTaiXe: boolean; khoi: KhoiChuyen[] }
export interface HinhDongThoiGian {
  gioDau: number;
  gioCuoi: number;
  nhanGio: { x: number; nhan: string }[];
  nhom: { tieuDe: string; hang: HangXe[] }[];
  bayGio: { x: number; nhan: string } | null;
  moc: { x: number; nhan: string } | null;
}
/**
 * Hình dòng thời gian theo xe (bản vẽ dp-dong-thoi-gian): khoảng giờ theo DỮ LIỆU (ít nhất 06–21, mở rộng khi chuyến sớm hơn / qua nửa đêm — đối chiếu mục 4),
 * vị trí từ `batDauMs` / `ketThucMs`. Nhóm "XE CÔNG TY" trước, rồi "NHÀ XE <tên>". Vạch "bây giờ" và vạch mốc (bây giờ + `mocToiThieuPhut`, R-P12) chỉ khi nằm
 * trong khung — chỉ để vẽ, không quyết khoá (khoá = `khoaMoc` từng chuyến).
 */
export function hinhDongThoiGian(l: Pick<LichChungResponse, "ngay" | "chuyen" | "xe" | "mocToiThieuPhut">, bayGioMs: number): HinhDongThoiGian {
  const dau = vnLocalToMs(l.ngay, "00:00")!;
  const song = l.chuyen.filter((c) => c.trangThai !== "CANCELLED");
  const gioDau = Math.min(6, ...song.map((c) => Math.floor((c.batDauMs - dau) / GIO)));
  const gioCuoi = Math.max(21, ...song.map((c) => Math.ceil((c.ketThucMs - dau) / GIO)));
  const nhanGio: { x: number; nhan: string }[] = [];
  for (let h = gioDau + 1; h < gioCuoi; h++) nhanGio.push({ x: h - gioDau, nhan: String(((h % 24) + 24) % 24).padStart(2, "0") });
  const trongKhung = (t: number) => t >= dau + gioDau * GIO && t <= dau + gioCuoi * GIO;
  const x = (t: number) => r4((t - dau) / GIO - gioDau);
  const bayGio = trongKhung(bayGioMs) ? { x: x(bayGioMs), nhan: msToVnLocal(bayGioMs).time } : null;
  const mocMs = l.mocToiThieuPhut === null ? null : bayGioMs + l.mocToiThieuPhut * PHUT;
  const moc = bayGio && mocMs !== null && trongKhung(mocMs) ? { x: x(mocMs), nhan: `Mốc ${nhanThoiLuong(l.mocToiThieuPhut!)} · ${msToVnLocal(mocMs).time}` } : null;

  const xe = new Map(l.xe.map((v) => [v.id, { id: v.id, bienSo: v.bienSo, soCho: v.soCho, chuXe: v.chuXe, chuLaCongTy: v.chuLaCongTy }]));
  for (const c of song) if (!xe.has(c.xe.id)) xe.set(c.xe.id, c.xe);
  const nhom = new Map<string, HangXe[]>();
  for (const v of [...xe.values()].sort((a, b) => a.bienSo.localeCompare(b.bienSo))) {
    const cua = song.filter((c) => c.xe.id === v.id).sort((a, b) => a.batDauMs - b.batDauMs);
    const ten = [...new Set(cua.flatMap((c) => (c.taiXe ? [c.taiXe.ten] : [])))];
    const thieuTaiXe = cua.some((c) => c.taiXe === null);
    const tieuDe = v.chuLaCongTy ? "XE CÔNG TY" : `NHÀ XE ${v.chuXe.toLocaleUpperCase("vi-VN")}`;
    const hang: HangXe = {
      xeId: v.id, bienSo: v.bienSo, soCho: `${v.soCho} chỗ`, taiXe: thieuTaiXe && ten.length === 0 ? "Chưa có tài xế" : ten.join(", "), thieuTaiXe,
      khoi: cua.map((c) => {
        const k = kieuChuyen(c);
        return {
          id: c.id, ma: c.ma, maNgan: c.ma.split("-").at(-1) ?? c.ma, trai: x(c.batDauMs), dai: r4((c.ketThucMs - c.batDauMs) / GIO), kieu: k.kieu, nhan: k.nhan,
          tai: `${c.tai}/${c.xe.soCho}`, gio: `${gioHien(c.batDau, l.ngay)}–${gioHien(c.ketThuc, l.ngay)}`, diem: c.diem.map((d) => d.loai), khoa: c.khoaMoc.dangKhoa,
        };
      }),
    };
    nhom.set(tieuDe, [...(nhom.get(tieuDe) ?? []), hang]);
  }
  const ds = [...nhom.entries()].sort(([a], [b]) => (a === "XE CÔNG TY" ? -1 : b === "XE CÔNG TY" ? 1 : a.localeCompare(b, "vi")));
  return { gioDau, gioCuoi, nhanGio, nhom: ds.map(([tieuDe, hang]) => ({ tieuDe, hang })), bayGio, moc };
}

// ---- chi tiết chuyến -----------------------------------------------------------------------------------------------------------------------------------------
const NHOM_DIEU_KIEN: readonly { nhan: string; ma: readonly string[] }[] = [
  { nhan: "Giấy tờ xe", ma: ["DIEU_KIEN_GIAY_TO_XE", "XE_KHONG_DUNG"] },
  { nhan: "Giấy phép lái xe", ma: ["GPLX_THIEU", "GPLX_THIEU_HANG", "GPLX_HET_HAN", "HANG_BANG_KHONG_DU", "KHONG_CO_HANG_BANG", "DIEU_KIEN_GIAY_TO_TAI_XE", "CHUA_CO_TAI_XE", "CHEO_XE_TAI_XE"] },
  { nhan: "Đủ tên khách", ma: ["THIEU_TEN"] },
  { nhan: "Không có đơn đã huỷ", ma: ["DON_DA_HUY", "CHANG_DA_DONG", "CHANG_KHONG_HOP_LE"] },
  { nhan: "Điểm khớp đơn", ma: ["NOI_HEN_DOI", "CHUA_CO_GIO", "CHUA_CO_NOI_TRA", "GIO_HEN_NGOAI_CHUYEN", "THIEU_SUAT", "THUA_SUAT"] },
  { nhan: "Đủ chỗ", ma: ["VUOT_SO_CHO", "VUOT_SO_NGUOI_CHANG"] },
  { nhan: "Đủ giờ nghỉ", ma: ["NGHI_THIEU", "KHOANG_NGHI", "TRUNG_GIO_XE", "TRUNG_GIO_TAI_XE"] },
];
const chiTietLoi = (ds: readonly LyDoGiuDto[]): string => `${ds.map((d) => d.loiNhan).join("; ")} · Ai xử lý: ${[...new Set(ds.map((d) => d.aiXuLyNhan))].join(", ")}`;
/** "Điều kiện xuất bến" của chi tiết chuyến (bản vẽ 02): danh mục cố định; chưa đạt = có lý do giữ thuộc nhóm (câu + ai xử lý); đạt không kèm chi tiết. */
export function dieuKienXuatBen(lyDoGiu: readonly LyDoGiuDto[]): { nhan: string; dat: boolean; chiTiet: string }[] {
  const out = NHOM_DIEU_KIEN.map((n) => {
    const ds = lyDoGiu.filter((l) => n.ma.includes(l.ma));
    return { nhan: n.nhan, dat: ds.length === 0, chiTiet: ds.length ? chiTietLoi(ds) : "" };
  });
  const khac = lyDoGiu.filter((l) => !NHOM_DIEU_KIEN.some((n) => n.ma.includes(l.ma)));
  if (khac.length) out.push({ nhan: "Khác", dat: false, chiTiet: chiTietLoi(khac) });
  return out;
}

const TRANG_THAI_DIEM: Readonly<Record<DiemChuyenDto["trangThai"], { nhan: string; tone: Tone }>> = {
  PENDING: { nhan: "Chưa tới", tone: "muted" },
  ARRIVED: { nhan: "Đã tới", tone: "unit" },
  DONE: { nhan: "Xong", tone: "ok" },
  SKIPPED: { nhan: "Bỏ qua", tone: "muted" },
  MOVED: { nhan: "Đã chuyển", tone: "muted" },
};
/** Một dòng bảng điểm dừng (bản vẽ 02): trạng thái, "Lệch đơn" theo cờ `lechDon` (R-P16 — không "Mới thêm"), "muộn N phút" khi giờ xe tới sau giờ hẹn. */
export function nhanDiem(d: DiemChuyenDto): { nhan: string; tone: Tone; ghiChu: string; muon: string; loai: string; so: string } {
  const loai = d.loai === "PICKUP" ? "Đón" : "Trả";
  const t = TRANG_THAI_DIEM[d.trangThai];
  let muon = "";
  if (d.gioHen && d.gioXeToi) {
    const lech = Math.round((vnLocalToMs(d.gioXeToi.ngay, d.gioXeToi.gio)! - vnLocalToMs(d.gioHen.ngay, d.gioHen.gio)!) / PHUT);
    if (lech > 0) muon = `muộn ${nhanThoiLuong(lech)}`;
  }
  if (d.trangThai === "SKIPPED") return { nhan: t.nhan, tone: t.tone, ghiChu: "bỏ qua — không còn khách", muon, loai, so: "–" };
  if (d.lechDon) return { nhan: "Lệch đơn", tone: "warn", ghiChu: "Nơi của đơn đã đổi — cần cập nhật điểm theo đơn", muon, loai, so: String(d.thuTu) };
  return { nhan: t.nhan, tone: t.tone, ghiChu: "", muon, loai, so: String(d.thuTu) };
}

/** Một dòng nhật ký chuyến (bản vẽ 02, H11 — chỉ loại sự kiện máy chủ trả): giờ (hai giờ khi văn phòng khai — thành phần B), ai bấm hoặc "máy", nội dung. */
export function dongNhatKy(n: NhatKyChuyenDto, ngayXem: string): { gio: string; ai: string; laMay: boolean; noiDung: string; vanPhongKhai: boolean } {
  const gio = n.vanPhongKhai ? `${gioHien(n.gioXayRa, ngayXem)} · ghi lúc ${gioHien(n.gioGhiNhan, ngayXem)}` : gioHien(n.gioXayRa, ngayXem);
  const laMay = n.may || n.nguoiBam === null;
  const noiDung = [n.nhan, n.soNguoi !== null ? `${n.soNguoi} khách` : null, n.phaLe ? `phá lệ: ${n.phaLe.lyDoNhan}` : null].filter((x) => x !== null).join(" · ");
  return { gio, ai: laMay ? "máy" : maskLongDigits(n.nguoiBam!), laMay, noiDung, vanPhongKhai: n.vanPhongKhai };
}

// ---- tạo / sửa chuyến ----------------------------------------------------------------------------------------------------------------------------------------
const O_XE = new Set(["VUOT_SO_CHO", "XE_KHONG_DUNG", "DIEU_KIEN_GIAY_TO_XE"]);
const O_TAI_XE = new Set(["HANG_BANG_KHONG_DU", "KHONG_CO_HANG_BANG", "GPLX_THIEU", "GPLX_THIEU_HANG", "GPLX_HET_HAN", "CHEO_XE_TAI_XE", "TRUNG_GIO_TAI_XE", "DIEU_KIEN_GIAY_TO_TAI_XE", "CHUA_CO_TAI_XE"]);
const O_GIO_BAT_DAU = new Set(["KHOANG_NGHI", "NGHI_THIEU"]);
const O_GIO_KET_THUC = new Set(["TRUNG_GIO_XE", "GIO_CHUYEN_KHONG_HOP_LE"]);
export interface LoiTruongChuyen { xe: string[]; taiXe: string[]; gioBatDau: string[]; gioKetThuc: string[]; khac: string[] }
/**
 * 409 của lệnh tạo / sửa chuyến → câu dưới đúng ô (bản vẽ 03 "lỗi hiện bằng lời ngay dưới ô": hạng bằng dưới Tài xế, trùng giờ dưới Giờ kết thúc, nghỉ thiếu dưới
 * Giờ bắt đầu). "Trong mốc — cần phá lệ" chỉ gắn vào ô ĐANG ĐỔI (Xe, rồi Tài xế): tạo chuyến mới và dời giờ không bao giờ cần phá lệ mốc (đối chiếu 2.2, 2.3). Mã
 * không thuộc ô nào → dải chung.
 */
export function truongLoiChuyen(lyDo: readonly LyDoGiuDto[], dang: { doiXe: boolean; doiTaiXe: boolean }): LoiTruongChuyen {
  const out: LoiTruongChuyen = { xe: [], taiXe: [], gioBatDau: [], gioKetThuc: [], khac: [] };
  for (const l of lyDo) {
    if (l.ma === "MOC_TOI_THIEU") (dang.doiXe ? out.xe : dang.doiTaiXe ? out.taiXe : out.khac).push(l.loiNhan);
    else if (O_XE.has(l.ma)) out.xe.push(l.loiNhan);
    else if (O_TAI_XE.has(l.ma)) out.taiXe.push(l.loiNhan);
    else if (O_GIO_BAT_DAU.has(l.ma)) out.gioBatDau.push(l.loiNhan);
    else if (O_GIO_KET_THUC.has(l.ma)) out.gioKetThuc.push(l.loiNhan);
    else out.khac.push(l.loiNhan);
  }
  return out;
}

/**
 * requestId của một lệnh ghi (kế hoạch mục 1.7 — lệnh lặp cùng requestId là MỘT lệnh, LC-11): bấm lại sau mất mạng với CÙNG thân → dùng lại id (không tạo hai
 * chuyến); thân khác (người dùng đổi ý) hoặc chưa có lệnh chờ → id mới (không bị máy chủ coi là lệnh cũ rồi bỏ qua ý mới).
 */
export function idChoLenh(dangCho: { id: string; khoa: string } | null, khoa: string, taoId: () => string): { id: string; khoa: string } {
  return dangCho && dangCho.khoa === khoa ? dangCho : { id: taoId(), khoa };
}

// ---- ADR-0051: nhắc "gọi báo khách" khi giờ hẹn đổi (Task B-GB) ------------------------------------------------------------------------------------------
/**
 * Mục "Giờ hẹn đổi — gọi báo khách" của cột Cần xử lý (danh sách riêng `GET /nhac-goi-khach` — hiện ở MỌI ngày đang xem; máy chủ đã sắp theo giờ mới). Nhãn,
 * "Ai xử lý" và câu đổi giờ lấy HẰNG của goi-bao.ts (không tự gõ chữ). Nút "Đã gọi báo" CHỈ khi `baoDuoc` (máy chủ tính bằng can(trip.call_ack…)).
 * Không tên, không SĐT khách (DTO không có).
 */
export function viecGoiBao(muc: readonly MucNhacGoiDto[], ngayXem: string): ViecCanXuLy[] {
  return muc.map((m) => {
    const g = m.gioHenDoi;
    const khacNgay = m.ngayChuyen !== ngayXem ? ` · Chuyến ${m.ngayChuyen.slice(8, 10)}/${m.ngayChuyen.slice(5, 7)}` : "";
    return {
      loai: NHAN_GIO_HEN_DOI, tone: "warn", bieuTuong: "handset", tieuDe: `${m.orderCode} · ${m.noiDon}`, href: null,
      noiDung: `Giờ hẹn đón đổi ${moTaDoiGio(g.cu, g.moi)}${g.maChuyen.length ? ` · ${g.maChuyen.join(", ")}` : ""}${khacNgay}`,
      aiXuLy: AI_XU_LY_GIO_HEN_DOI, khoa: null,
      hanhDong: g.baoDuoc ? [{ nhan: "Đã gọi báo", kieu: "goi-bao", legId: m.legId, phienBan: g.phienBan, gioMoi: g.moi, maDon: m.orderCode }] : [],
    };
  });
}

/** Dòng "gọi báo khách" của một chặng ở chi tiết chuyến (V2): còn mục → "— chưa gọi báo" (+ "Đã gọi báo" khi `baoDuoc`); đã gọi → "— đã gọi báo khách (tên, HH:MM)" (+ "Bỏ đánh dấu" khi `boDuoc`). */
export function dongGoiBao(g: GoiBaoChangDto): { chu: string; nut: { kieu: "da-goi"; nhan: string; phienBan: number; gioMoi: GioHenDto } | { kieu: "bo"; nhan: string; phienBan: number } | null } | null {
  const dau = g.maDon ? `${g.maDon} · ` : "";
  if (g.gioHenDoi) {
    const x = g.gioHenDoi;
    return { chu: `${dau}Giờ hẹn đổi ${moTaDoiGio(x.cu, x.moi)} — chưa gọi báo`, nut: x.baoDuoc ? { kieu: "da-goi", nhan: "Đã gọi báo", phienBan: x.phienBan, gioMoi: x.moi } : null };
  }
  if (g.daGoiBao) {
    const x = g.daGoiBao;
    const ai = x.nguoiBam ? `${maskLongDigits(x.nguoiBam)}, ` : "";
    return { chu: `${dau}Giờ hẹn đổi ${moTaDoiGio(x.cu, x.moi)} — đã gọi báo khách (${ai}${x.luc})`, nut: x.boDuoc ? { kieu: "bo", nhan: "Bỏ đánh dấu", phienBan: x.phienBan } : null };
  }
  return null;
}

// ---- Bản chụp lúc xuất bến (chi tiết chuyến sau khi xuất bến) --------------------------------------------------------------------------------------------------
const NHAN_MUC_BAN_CHUP: Readonly<Record<string, string>> = { GPLX: "Giấy phép lái xe", GIAY_TO_XE: "Giấy tờ xe", GIAY_TO_NGUOI: "Giấy tờ của tài xế", DIEU_KIEN: "Điều kiện xuất bến" };
/**
 * Một dòng của "Bản chụp lúc xuất bến": nhãn theo loại (KHÔNG BAO GIỜ hiện mã); hạng, hạn "dd/mm/yyyy". DTO chỉ có MÃ loại giấy tờ (không tên) nên chưa nêu tên
 * giấy — câu hỏi Q-B-16 ở nhật ký giao diện.
 */
export function dongBanChup(m: { loai: string; hang: string | null; hetHan: string | null }): { nhan: string; phu: string } {
  const han = m.hetHan ? `hạn ${m.hetHan.slice(8, 10)}/${m.hetHan.slice(5, 7)}/${m.hetHan.slice(0, 4)}` : null;
  return { nhan: NHAN_MUC_BAN_CHUP[m.loai] ?? "Điều kiện khác", phu: [m.hang ? `hạng ${m.hang}` : null, han].filter(Boolean).join(" · ") };
}
