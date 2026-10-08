// Luật hiển thị THUẦN của các màn TIẾN ĐỘ chuyến (ADR-0049 D3, ADR-0050 VK1-A thành phần A, B; bản vẽ docs/design/van-chuyen-dieu-phoi/project/04, 05, 06;
// bản đối chiếu 2.5, 2.7, H15; lệnh điều phối vòng 3 — A15): bấm thay của văn phòng ở Chi tiết chuyến (V2), Cuốc của tôi (V5), Chuyến đang chạy (V6), Xuất
// bến (V7) của tài xế. Không I/O, không DOM; import kèm đuôi .ts. Test: tien-do-man.test.ts.
// - Giờ sớm nhất khai được: CHỈ từ `gioSomNhatKhai` / 409 `somNhat` của máy chủ (R-P14) — không tự tính.
// - Nút theo TRẠNG THÁI dữ liệu (điểm chưa tới / đã tới, suất chờ / vắng / trên xe); máy chủ vẫn quyết (409 → câu của máy chủ).
import { dongDieuKienTaiXe } from "./dieu-phoi-hien-thi.ts";
import { NHAN_GIO_XAY_RA, type MaGioXayRa } from "./gio-xay-ra.ts";
import type { CuocCuaToiItemDto, DieuKienConThieuDto, GioVnDto, MocChanDto, MocTienDoDto } from "./contracts.ts";
import { maskLongDigits } from "./text-guards.ts";
import { daoMoiSauDoi, diemDonChuaToiCuaDiemTra } from "./thu-tu-diem.ts";
import { addDays, msToVnLocal, ngayNgan, thuNgayNgan, vnLocalToMs } from "./vn-date.ts";

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
const hien = (g: GioVnDto, ngayXem: string): string => (g.ngay === ngayXem ? g.gio : `${g.gio} ${ngayNgan(g.ngay, ngayXem)}`);

// ---- ô "Xảy ra lúc" (thành phần A) ------------------------------------------------------------------------------------------------------------------------
/**
 * Giờ văn phòng chọn ("HH:MM", giờ VN) → `xayRaLuc` ISO có múi giờ. Ngày = hôm qua / hôm nay / ngày mai theo lúc bấm, chọn cái GẦN lúc bấm nhất: khai lùi qua nửa
 * đêm (00:10 khai 23:50) → hôm qua; gõ nhầm hơi sau lúc bấm → hôm nay, máy chủ từ chối "chưa tới" (bản vẽ 6d) thay vì hiểu thành "lùi gần một ngày". Sai khuôn
 * → null. Màn CHỈ gửi khi người bấm đã đổi giờ (I34).
 */
export function xayRaLucTu(gio: string, bayGioMs: number): string | null {
  if (!HHMM.test(gio)) return null;
  const bay = msToVnLocal(bayGioMs);
  const ungVien = [-1, 0, 1].map((n) => vnLocalToMs(addDays(bay.date, n), gio));
  if (ungVien.some((x) => x === null)) return null;
  const gan = (ungVien as number[]).reduce((a, b) => (Math.abs(b - bayGioMs) < Math.abs(a - bayGioMs) ? b : a));
  return new Date(gan).toISOString();
}

/** Gợi ý dưới ô "Xảy ra lúc" (bản vẽ 5c, 6d): lúc bấm + giờ sớm nhất của máy chủ. */
export function goiYKhaiGio(somNhat: GioVnDto | null, bayGioMs: number, ngayXem: string): string {
  const luc = `Để nguyên là lúc bấm (${msToVnLocal(bayGioMs).time}).`;
  return somNhat ? `${luc} Sớm nhất: ${hien(somNhat, ngayXem)}.` : luc;
}

export interface LoiKhaiGio { maGio?: readonly string[]; somNhat?: GioVnDto | null; mocChan?: MocChanDto | null }
/**
 * 409 `gio_xay_ra_ngoai_khoang` → MỘT câu dưới ô (bản vẽ 6d): giờ tương lai nói "bây giờ là…"; có mốc gây chặn thì nêu mốc (chuyến trước kèm mã chuyến, một
 * mốc đã ghi, lúc xếp khách, giới hạn khai lùi — không tên người); có giờ sớm nhất thì "chọn từ HH:MM trở đi". Mã lạ → câu chung, không lộ mã.
 */
export function cauTuChoiKhaiGio(l: LoiKhaiGio, bayGioMs: number, ngayXem: string): string {
  const ma = (l.maGio ?? []).filter((m): m is MaGioXayRa => m in NHAN_GIO_XAY_RA);
  if (ma.includes("TUONG_LAI")) return `Giờ này chưa tới — bây giờ là ${msToVnLocal(bayGioMs).time}.`;
  const c = l.mocChan ?? null;
  const dau = c?.loai === "CHUYEN_TRUOC"
    ? `Chuyến trước của xe hoặc tài xế${c.maChuyen ? ` (${c.maChuyen})` : ""} kết thúc lúc ${hien(c.gio, ngayXem)}`
    : c?.loai === "SU_KIEN"
      ? `Sai thứ tự: không thể sớm hơn “${c.nhan}” (${hien(c.gio, ngayXem)})`
      : c?.loai === "MO_SUAT"
        ? `Sớm hơn lúc xếp khách lên xe (${hien(c.gio, ngayXem)})`
        : ma.length
          ? ma.map((m) => NHAN_GIO_XAY_RA[m]).join("; ")
          : "Giờ khai không hợp lệ";
  return l.somNhat ? `${dau} — chọn từ ${hien(l.somNhat, ngayXem)} trở đi.` : `${dau}.`;
}

/** 409 `con_khach_chua_xong` (kết thúc chuyến khi còn khách) → câu có số + gợi ý "Kết thúc gián đoạn" (máy chủ gửi `goiY`). */
export function cauConKhach(e: { conSuat?: number; conDiem?: number; goiY?: string }): string {
  const so = `Còn ${e.conSuat ?? 0} khách chưa xong ở ${e.conDiem ?? 0} điểm.`;
  return e.goiY === "KET_THUC_GIAN_DOAN" ? `${so} Nếu xe không đi tiếp được, dùng “Kết thúc gián đoạn”.` : so;
}

// ---- điểm dừng + khách của chuyến đang chạy (bản vẽ 5a, 5c) ----------------------------------------------------------------------------------------------
/** Khoá chung của điểm dừng ở DTO văn phòng (`DiemChuyenDto`) và DTO tài xế (`CuocChiTietResponse.diem`). */
export interface DiemVao {
  id: string;
  thuTu: number;
  loai: "PICKUP" | "DROPOFF";
  tenNoi: string;
  gioHen: GioVnDto | null;
  gioXeToi: GioVnDto | null;
  trangThai: "PENDING" | "ARRIVED" | "DONE" | "SKIPPED" | "MOVED";
  soNguoi: number;
  daToi: MocTienDoDto | null;
  /** Đợt 5 D5.1: điểm văn phòng thêm khi xe đang chạy (chip "Mới thêm"). */
  themKhiChay?: boolean;
}
/** Khoá chung của suất (văn phòng: `SuatChuyenDto`; tài xế: `CuocChiTietResponse.suat` — cả hai có `loai`; suất người đi kèm `CREW` không gắn điểm dừng). */
export interface SuatVao {
  id: string;
  loai?: "PASSENGER" | "CREW";
  maDon: string | null;
  diemLen: string | null;
  diemXuong: string | null;
  trangThai: "WAITING" | "BOARDED" | "NO_SHOW" | "CANCELLED_AT_STOP" | "DROPPED";
  hoTen?: string;
  namSinh?: number;
  daDon: MocTienDoDto | null;
  daTra: MocTienDoDto | null;
  /** Đợt 5 D5.2: văn phòng đã báo khách huỷ (giờ + nhãn lý do; không người bấm) — suất vẫn chiếm chỗ. */
  vanPhongBaoHuy?: { luc: GioVnDto; lyDoNhan: string } | null;
}
/**
 * Thân lệnh "đổi thứ tự" (route 29 của tài xế ↔ 39 của văn phòng — CÙNG một hàm xử lý): đổi chỗ điểm `diemId` với điểm CHƯA TỚI liền trước (-1) / liền sau (+1),
 * gửi đủ các điểm chưa tới với tập số thứ tự cũ (máy chủ chỉ ghi điểm đổi số). `null` = không đổi được (đầu / cuối, hoặc điểm không còn chờ).
 */
export function thanDoiThuTu(diem: readonly Pick<DiemVao, "id" | "thuTu" | "trangThai">[], diemId: string, huong: -1 | 1): { diem: { id: string; thuTu: number }[] } | null {
  const cho = diem.filter((d) => d.trangThai === "PENDING").sort((x, y) => x.thuTu - y.thuTu);
  const i = cho.findIndex((d) => d.id === diemId);
  const j = i + huong;
  if (i < 0 || j < 0 || j >= cho.length) return null;
  const moi = [...cho];
  [moi[i], moi[j]] = [moi[j]!, moi[i]!];
  return { diem: moi.map((d, k) => ({ id: d.id, thuTu: cho[k]!.thuTu })) };
}

/**
 * Nút ↑ / ↓ (C30 — ADR-0096 Đ1.3c): thân lệnh đổi thứ tự (`thanDoiThuTu`) + `daoMoi` = lệnh làm khách CHỜ LÊN bị đảo MỚI (điểm trả lên trước / bằng điểm đón)
 * — CÙNG luật `daoMoiSauDoi` máy chủ dùng để trả 409 `thu_tu_dao`. Giao diện khoá nút khi `daoMoi`; máy chủ vẫn là cổng. Dùng cho chuyến đang chạy (route
 * 29 / 39) và chuyến kế hoạch (văn phòng gửi `PUT /chuyen/:id` thân `diem`).
 */
export function doiThuTuDuoc(
  diem: readonly Pick<DiemVao, "id" | "thuTu" | "trangThai">[],
  suat: readonly Pick<SuatVao, "diemLen" | "diemXuong" | "trangThai">[],
  diemId: string,
  huong: -1 | 1,
): { than: { diem: { id: string; thuTu: number }[] } | null; daoMoi: boolean } {
  const than = thanDoiThuTu(diem, diemId, huong);
  if (!than) return { than: null, daoMoi: false };
  const cho = suat.filter((x) => x.trangThai === "WAITING").map((x) => ({ diemLen: x.diemLen, diemXuong: x.diemXuong }));
  const daoMoi = daoMoiSauDoi(diem.map((x) => ({ id: x.id, seq: x.thuTu })), than.diem.map((x) => ({ id: x.id, seq: x.thuTu })), cho).length > 0;
  return { than, daoMoi };
}
/** Chữ khi nút ↑ / ↓ bị khoá vì `daoMoi` (cùng nghĩa câu 409 `thu_tu_dao` của máy chủ). */
export const CAU_THU_TU_DAO = "Thứ tự này đưa điểm trả lên trước điểm đón của khách chờ lên.";

export type LenhSuat = "don" | "vang" | "khach-huy";
export const NHAN_LENH_SUAT: Readonly<Record<LenhSuat, string>> = { don: "Đã đón", vang: "Vắng", "khach-huy": "Khách đã huỷ" };
const KET_QUA: Readonly<Record<SuatVao["trangThai"], string | null>> = { WAITING: null, BOARDED: "Đã đón", NO_SHOW: "Vắng", CANCELLED_AT_STOP: "Khách đã huỷ", DROPPED: "Đã trả" };
export interface KhachDiem {
  suatId: string;
  /** Họ tên (chỉ khi DTO có — trong ngày chạy); không có → "Khách N". */
  ten: string;
  namSinh: number | null;
  ketQua: string | null;
  nut: LenhSuat[];
}
export interface BuocDiem {
  diem: DiemVao;
  so: string;
  /** "ĐÓN · HẸN 07:30" / "TRẢ" (bản vẽ 5a). */
  nhanLoai: string;
  /** Kiểu hiện: `xong` (đã tới, hết việc), `dang` (đã tới, còn khách chờ / còn khách phải trả), `sau` (chưa tới), `bo` (bỏ qua / đã chuyển). */
  trangThaiHien: "xong" | "dang" | "sau" | "bo";
  khach: KhachDiem[];
  /** Nút của điểm: "Đã tới" (điểm đón chưa tới) / "Đã trả" (điểm trả còn khách trên xe — tới điểm nếu chưa tới, rồi trả từng suất). */
  nut: { lenh: "da-toi" | "tra-het"; nhan: string; goiY: string } | null;
  /** Suất sẽ "đã trả" khi bấm "Đã trả" ở điểm này. */
  traCho: string[];
  /**
   * HT-16 (ADR-0096 Đ1.4): điểm trả CHƯA TỚI còn khách chờ lên ở điểm đón chưa tới → không có nút "Đã trả" (máy chủ 409), câu chỉ đường thay nút. null = không.
   */
  choDon: string | null;
}
/** "ĐÓN · HẸN 07:30 · XE TỚI 07:20" — giờ xe tới (văn phòng đặt) chỉ hiện khi khác giờ hẹn (góp ý T5: tài xế thấy giờ ngay cạnh điểm đón). */
function nhanDon(d: DiemVao, ngayXem: string): string {
  const hen = d.gioHen ? hien(d.gioHen, ngayXem) : null;
  const toi = d.gioXeToi ? hien(d.gioXeToi, ngayXem) : null;
  return ["ĐÓN", hen && `HẸN ${hen}`, toi && toi !== hen && `XE TỚI ${toi}`].filter(Boolean).join(" · ");
}
/** Bước từng điểm của chuyến ĐANG CHẠY (nút chỉ khi `RUNNING`). Khách của điểm đón = suất lên ở đó; điểm trả không liệt kê khách (bản vẽ 5a). */
export function buocDiem(diem: readonly DiemVao[], suat: readonly SuatVao[], trangThaiChuyen: string, ngayXem: string): BuocDiem[] {
  const chay = trangThaiChuyen === "RUNNING";
  const khachThat = suat.filter((x) => (x.loai ?? "PASSENGER") === "PASSENGER");
  return [...diem].sort((a, b) => a.thuTu - b.thuTu).map((d) => {
    const bo = d.trangThai === "SKIPPED" || d.trangThai === "MOVED";
    const daToi = d.trangThai === "ARRIVED" || d.trangThai === "DONE";
    const len = d.loai === "PICKUP" ? khachThat.filter((x) => x.diemLen === d.id) : [];
    const khach: KhachDiem[] = len.map((x, i) => ({
      suatId: x.id,
      ten: x.hoTen ? maskLongDigits(x.hoTen) : `Khách ${i + 1}`,
      namSinh: x.namSinh ?? null,
      ketQua: KET_QUA[x.trangThai],
      nut: chay && daToi ? (x.trangThai === "WAITING" ? ["don", "vang", "khach-huy"] : x.trangThai === "NO_SHOW" ? ["don"] : []) : [],
    }));
    const traCho = d.loai === "DROPOFF" ? khachThat.filter((x) => x.diemXuong === d.id && x.trangThai === "BOARDED").map((x) => x.id) : [];
    // HT-16: CÙNG hàm với máy chủ (suất trong DTO đều đang mở).
    const donChuaToi = chay && !bo && d.loai === "DROPOFF" && d.trangThai === "PENDING"
      ? diemDonChuaToiCuaDiemTra(d.id, diem, khachThat.map((x) => ({ diemLen: x.diemLen, diemXuong: x.diemXuong, trangThai: x.trangThai, mo: true })))
      : [];
    const soDiem = new Map(diem.map((x) => [x.id, x.thuTu]));
    const choDon = donChuaToi.length ? `Còn khách chưa đón ở điểm ${donChuaToi.map((id) => soDiem.get(id)).join(", ")} — bấm “Đã tới” ở điểm đón trước.` : null;
    let nut: BuocDiem["nut"] = null;
    if (chay && !bo && d.loai === "PICKUP" && d.trangThai === "PENDING") nut = { lenh: "da-toi", nhan: "Đã tới", goiY: "Bấm khi xe tới nơi, rồi đánh dấu từng khách." };
    if (chay && !bo && d.loai === "DROPOFF" && !choDon && (d.trangThai === "PENDING" || traCho.length > 0)) nut = { lenh: "tra-het", nhan: "Đã trả", goiY: "Trả hết khách đang trên xe ở điểm này." };
    const conViec = khach.some((k) => k.nut.length > 0 && k.ketQua === null) || traCho.length > 0;
    return {
      diem: d,
      so: bo ? "–" : String(d.thuTu),
      nhanLoai: d.loai === "PICKUP" ? nhanDon(d, ngayXem) : "TRẢ",
      trangThaiHien: bo ? "bo" : !daToi ? "sau" : conViec ? "dang" : "xong",
      khach,
      nut,
      traCho,
      choDon,
    };
  });
}

/**
 * GA-55 (máy chủ A18): phản hồi của MỌI lệnh ghi / tiến độ KHÔNG còn `hoTen` / `namSinh` (phía tài xế bỏ cả `lienHe`) — chỉ GET chi tiết trả tên. Màn đọc lại
 * GET sau mỗi lệnh; khi đọc lại hỏng (mất mạng) thì giữ tên đã có theo id suất — không bao giờ để ô tên trống / "undefined".
 */
export function giuTenKhach<T extends { suat: readonly SuatVao[] }>(moi: T, cu: { suat: readonly SuatVao[] } | null): T {
  if (!cu) return moi;
  const ten = new Map(cu.suat.filter((x) => x.hoTen).map((x) => [x.id, x]));
  return { ...moi, suat: moi.suat.map((x) => (x.hoTen || !ten.has(x.id) ? x : { ...x, hoTen: ten.get(x.id)!.hoTen, namSinh: ten.get(x.id)!.namSinh })) };
}

/**
 * Số hiệu chuyến bay của các suất LÊN xe ở điểm `diemId` (thẻ chuyến tài xế hiện "✈︎ VN1553" dưới điểm đón) — không trùng, theo thứ tự suất. Số hiệu
 * không chỉ ra người (ADR-0055 C3, G-C1) nên hiện cả ngoài ngày chạy như giờ, nơi hẹn.
 */
export function soHieuTaiDiemDon(suat: readonly { diemLen: string | null; soHieuChuyenBay: string | null }[], diemId: string): string[] {
  const out: string[] = [];
  for (const x of suat) if (x.diemLen === diemId && x.soHieuChuyenBay && !out.includes(x.soHieuChuyenBay)) out.push(x.soHieuChuyenBay);
  return out;
}

/**
 * "Kết thúc chuyến" bấm được khi mọi suất MỞ đã có kết quả cuối (Đã trả / Vắng / Khách đã huỷ) — KHỚP `kiemKetThuc` của máy chủ (LC-16 + trigger
 * vc_trip_end_requires_settled): suất người đi kèm (CREW) tính như khách, phải "Đã lên xe" rồi "Đã xuống". Máy chủ vẫn quyết.
 */
export function ketThucDuoc(suat: readonly Pick<SuatVao, "trangThai">[]): boolean {
  return !suat.some((x) => x.trangThai === "WAITING" || x.trangThai === "BOARDED");
}

// ---- Cuốc của tôi (bản vẽ 04) -------------------------------------------------------------------------------------------------------------------------------
export interface TheCuoc {
  id: string;
  ma: string;
  gio: string;
  chip: { nhan: string; tone: "danger" | "unit" | "muted" | "ok" };
  dong: string;
  /** Điều kiện còn thiếu, mỗi dòng "(văn phòng lo)" (H15) — chỉ chuyến chưa xuất bến. */
  canhBao: string[];
  /** Chuyến đang chạy → nút "Mở chuyến đang chạy". */
  moChay: boolean;
  /** HT-24: chuyến đang chạy có ngày xuất bến ngoài ba ngày đang xem (vắt qua nửa đêm, hoặc xuất bến sớm) — "Xuất bến dd/mm"; thẻ khác không có. */
  nhanNgay?: string;
}
/** Ba nhóm "Hôm nay", "Ngày mai", "Ngày kia" (luôn có, trống vẫn hiện — góp ý T3: tài xế xem trước 2–3 ngày), mỗi nhóm theo giờ xuất bến. Không tên,
 *  không SĐT khách (R-P17; tên / năm sinh chỉ ở chi tiết chuyến TRONG ngày chạy — ADR-0053).
 *  HT-24 (kiểm theo vai 2/10): chuyến ĐANG CHẠY mà ngày xuất bến không thuộc ba ngày (máy chủ trả chuyến RUNNING bất kể ngày — route 19) vào "Hôm nay", đứng
 *  ĐẦU, kèm `nhanNgay` — không có thì chuyến vắt qua 0 giờ biến khỏi danh sách khi còn khách trên xe.
 *  `tuy.tuBoSungTen` (Đợt 5 A-1b, chủ duyệt 5/10): người xem giữ ô `trip.passenger.add` (chỉ tài xế công ty) ⇒ dòng "Chưa đủ tên khách" của chuyến HÔM NAY chỉ chỗ tự làm. */
export function nhomCuoc(ds: readonly CuocCuaToiItemDto[], homNay: string, tuy: { readonly tuBoSungTen?: boolean } = {}): { tieuDe: string; ngay: string; iso: string; the: TheCuoc[] }[] {
  const mai = addDays(homNay, 1);
  const kia = addDays(homNay, 2);
  const the = (c: CuocCuaToiItemDto): TheCuoc => {
    const giu = c.trangThai === "PLANNED" && c.dieuKienConThieu.length > 0;
    const chip: TheCuoc["chip"] = c.trangThai === "RUNNING" ? { nhan: "Đang chạy", tone: "unit" } : giu ? { nhan: "Bị giữ", tone: "danger" }
      : c.trangThai === "ENDED" ? { nhan: c.trangThaiNhan, tone: "ok" } : { nhan: c.trangThaiNhan, tone: "muted" };
    return {
      id: c.id, ma: c.ma, gio: c.gioXuatBen.gio, chip,
      dong: `${c.bienSo} · ${c.soKhach} khách · ${c.soDiemDon} điểm đón · ${c.soDiemTra} điểm trả`,
      canhBao: giu ? dongDieuKienTaiXe(c.dieuKienConThieu as readonly DieuKienConThieuDto[], tuy.tuBoSungTen === true && c.gioXuatBen.ngay === homNay) : [],
      moChay: c.trangThai === "RUNNING",
    };
  };
  const theoNgay = (ngay: string) => ds.filter((c) => c.gioXuatBen.ngay === ngay).sort((a, b) => a.gioXuatBen.gio.localeCompare(b.gioXuatBen.gio)).map(the);
  const baNgay = [homNay, mai, kia];
  const chayNgoai = ds
    .filter((c) => c.trangThai === "RUNNING" && !baNgay.includes(c.gioXuatBen.ngay))
    .sort((a, b) => `${a.gioXuatBen.ngay} ${a.gioXuatBen.gio}`.localeCompare(`${b.gioXuatBen.ngay} ${b.gioXuatBen.gio}`))
    .map((c) => ({ ...the(c), nhanNgay: `Xuất bến ${ngayNgan(c.gioXuatBen.ngay, homNay)}` }));
  return [
    { tieuDe: "Hôm nay", ngay: thuNgayNgan(homNay, homNay), iso: homNay, the: [...chayNgoai, ...theoNgay(homNay)] },
    { tieuDe: "Ngày mai", ngay: thuNgayNgan(mai, homNay), iso: mai, the: theoNgay(mai) },
    { tieuDe: "Ngày kia", ngay: thuNgayNgan(kia, homNay), iso: kia, the: theoNgay(kia) },
  ];
}

/** Tên người đi kèm (hướng dẫn viên) của chuyến, theo thứ tự suất, không trùng, bỏ ô trống — màn tài xế hiện "Người đi kèm: …" (lời chủ 2026-10-01; chỉ tên). */
export function tenNguoiDiKemCuaChuyen(suat: readonly { tenNguoiDiKem?: string }[]): string[] {
  const out: string[] = [];
  for (const x of suat) if (x.tenNguoiDiKem && !out.includes(x.tenNguoiDiKem)) out.push(x.tenNguoiDiKem);
  return out;
}

/** Suất KHÁCH (bỏ người đi kèm `CREW`) — chỉ để ĐẾM / liệt kê khách; xét kết thúc chuyến thì dùng `ketThucDuoc` với MỌI suất. */
export function chiSuatKhach<T extends { loai?: "PASSENGER" | "CREW" }>(suat: readonly T[]): T[] {
  return suat.filter((x) => x.loai !== "CREW");
}

/**
 * Việc với từng người đi kèm đang trên chuyến (lời chủ 2026-10-01 + ruling 2/10): chưa lên xe → "Đã lên xe" (lệnh `don`), đang trên xe → "Đã xuống" (lệnh
 * `tra`), xong → không nút. Dùng đúng lệnh suất sẵn có của máy chủ (route 23 / 26, 33 / 36) — chúng đã nhận suất CREW, không đòi điểm dừng.
 */
export function viecNguoiDiKem(suat: readonly { id: string; loai?: "PASSENGER" | "CREW"; trangThai: SuatVao["trangThai"]; tenNguoiDiKem?: string }[]): { id: string; ten: string; lenh: "don" | "tra" | null; nhan: string | null; trangThai: SuatVao["trangThai"] }[] {
  return suat.filter((x) => x.loai === "CREW").map((x) => ({
    id: x.id, ten: x.tenNguoiDiKem ?? "Người đi kèm", trangThai: x.trangThai,
    lenh: x.trangThai === "WAITING" ? "don" : x.trangThai === "BOARDED" ? "tra" : null,
    nhan: x.trangThai === "WAITING" ? "Đã lên xe" : x.trangThai === "BOARDED" ? "Đã xuống" : null,
  }));
}
