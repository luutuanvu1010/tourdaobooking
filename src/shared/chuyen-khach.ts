// LUẬT THUẦN chuyển khách giữa hai xe (ADR-0052 D4 MQ-02/03, MQ-08, MQ-09, ĐP4; ADR-0111 Đ1–Đ6; kế hoạch A5 T3). MỘT nguồn cho máy chủ (lô gửi / nhận /
// duyệt — van-chuyen) và màn hình (thẻ đề nghị của tài xế, hộp duyệt của Quản trị). Không I/O, không import module; import kèm đuôi .ts. Test cạnh tệp:
// chuyen-khach.test.ts; mười tình huống của chủ: src/chuyen-khach-ca-mau.test.ts.
//
// - `kiemChuyen` ghi ĐÚNG một dòng cho mỗi điều kiện ĐANG DÙNG của danh mục `vc_transfer_rule` (tiêm vào — không đọc bảng), tầng lấy theo danh mục. Điều
//   kiện danh mục có mà hàm không biết → KHONG_DAT (đề nghị leo thang, không lặng lẽ DAT). Dùng lại luật lượt 1: `kiemLai` (LC-12), `khongCheo` (LC-13),
//   `kiemCamKet` (ADR-0056 A2), `conHanToiHet`, `kiemMocXep` / khoá dính R-P6, `changXetTheoDon` — không viết luật thứ hai.
// - Số liệu (`giaTri` / `gioiHan`, INTEGER): sức chứa = số chỗ dùng SAU chuyển / số chỗ xe; mốc = phút còn tới giờ xét / mốc; khoảng nghỉ = phút tới chuyến
//   kế / 2 × khoảng nghỉ; giấy tờ = ngày hết hạn sớm nhất yyyymmdd / ngày kết thúc chuyến yyyymmdd; chặng = số suất khách không hợp lệ / 0. Không tên, không
//   số giấy tờ (LC-18).
import type {
  ChangVao, ChinhSachVao, DieuKienVao, HangBangVao, KhungChuyen, LoaiDiem, SuatVao, TaiXeVao, TrangThaiChuyen, TrangThaiDiem, XeVao,
} from "./dieu-phoi-kieu.ts";
import { kiemCamKet, type KetQuaCamKet } from "./cam-ket-xe.ts";
import { changXetTheoDon, conHanToiHet, khongCheo, kiemLai } from "./dieu-phoi-kiem.ts";
import { kiemMocXep } from "./moc-toi-thieu.ts";
import { cleanText, maskLongDigits } from "./text-guards.ts";
import { msToVnLocal } from "./vn-date.ts";

const PHUT = 60_000;

/** Danh mục điều kiện chuyển — đúng thứ tự `sort_order` của dòng gieo migration 0093 (bài khớp ở chuyen-khach.test.ts). */
export const MA_LUAT_CHUYEN = [
  "SUC_CHUA_DICH", "SUC_CHUA_NGUON", "TRUNG_GIO_DICH", "KHOANG_NGHI_DICH", "MOC_TOI_THIEU", "HANG_BANG_DICH", "GIAY_TO_DICH", "KHONG_CHEO", "DIEM_CHUA_TOI",
  "CAM_KET_DICH", "CHANG_KHACH_HIEU_LUC",
  // ADR-0128 Q2 — migration 0110: xe nhận có đơn xe riêng ⇒ không chuyển khách đơn khác vào (tầng LOI, chỉ Bác).
  "XE_RIENG_DICH",
] as const;
export type MaLuatChuyen = (typeof MA_LUAT_CHUYEN)[number];
export type TangLuat = "LOI" | "CAU_HINH";
export type KetQuaLuat = "DAT" | "KHONG_DAT" | "CANH_BAO";
/** Tầng của dòng gieo (ADR-0111 Đ1). Máy chủ ghi tầng theo DANH MỤC đọc lúc kiểm, hằng này chỉ để màn hình / bài kiểm khớp. */
export const TANG_LUAT: Readonly<Record<MaLuatChuyen, TangLuat>> = {
  SUC_CHUA_DICH: "LOI", SUC_CHUA_NGUON: "LOI", TRUNG_GIO_DICH: "LOI", KHOANG_NGHI_DICH: "CAU_HINH", MOC_TOI_THIEU: "CAU_HINH", HANG_BANG_DICH: "LOI",
  GIAY_TO_DICH: "LOI", KHONG_CHEO: "LOI", DIEM_CHUA_TOI: "LOI", CAM_KET_DICH: "CAU_HINH", CHANG_KHACH_HIEU_LUC: "LOI",
  XE_RIENG_DICH: "LOI",
};
/** Nhãn của dòng gieo (`vc_transfer_rule.label`) — chữ chờ chủ duyệt. */
export const NHAN_LUAT_CHUYEN: Readonly<Record<MaLuatChuyen, string>> = {
  SUC_CHUA_DICH: "Xe nhận còn đủ chỗ",
  SUC_CHUA_NGUON: "Xe nhờ chỉ bớt khách",
  TRUNG_GIO_DICH: "Xe nhận không trùng giờ chuyến khác",
  KHOANG_NGHI_DICH: "Đủ khoảng nghỉ trước chuyến sau của tài xế xe nhận",
  MOC_TOI_THIEU: "Còn đủ mốc tối thiểu trước giờ xe nhận chạy",
  HANG_BANG_DICH: "Bằng lái tài xế xe nhận đủ hạng",
  GIAY_TO_DICH: "Giấy tờ xe và tài xế xe nhận còn hạn",
  KHONG_CHEO: "Tài xế xe nhận đúng chủ xe (không lái chéo)",
  DIEM_CHUA_TOI: "Xe nhờ chưa tới điểm đón",
  CAM_KET_DICH: "Giữ cam kết xe với khách trên xe nhận",
  CHANG_KHACH_HIEU_LUC: "Chặng của khách còn hiệu lực",
  XE_RIENG_DICH: "Xe nhận không chở khách đã đặt xe riêng",
};
const laMaLuat = (v: string): v is MaLuatChuyen => (MA_LUAT_CHUYEN as readonly string[]).includes(v);

/**
 * ADR-0111 Đ6 — chủ chọn phương án (1) "Vẫn chờ Quản trị" (8/10): chặng đặt gấp chuyển sang xe CHƯA chạy dưới mốc vẫn leo thang. HẰNG của module, không
 * phải tham số của lệnh: đổi = ADR mới. Bài: chuyen-khach.test.ts (MOC_TOI_THIEU) + bước TH02-4-DAT-GAP của ca mẫu.
 */
export const MIEN_DAT_GAP_KHI_CHUYEN = false;

export interface DongDanhMuc {
  code: string;
  tier: TangLuat;
  active: boolean;
}
export interface DongKiemChuyen {
  ma: string;
  tang: TangLuat;
  ketQua: KetQuaLuat;
  giaTri: number | null;
  gioiHan: number | null;
}
/** Chuyến nhận (đích) — đủ cho mốc (khoá dính R-P6), trùng giờ, khoảng nghỉ, bằng lái, giấy tờ, lái chéo, cam kết. */
export interface ChuyenDichVao {
  id: string;
  ma: string;
  trangThai: TrangThaiChuyen;
  batDauMs: number;
  batDauSomNhatMs: number;
  ketThucMs: number;
  ketThucThatMs: number | null;
  xe: XeVao;
  taiXe: TaiXeVao | null;
  camKetPhaLeKhoa: string | null;
}
export interface KiemChuyenVao {
  phamVi: "STOP" | "ONBOARD";
  /** Chuyến nhờ (nguồn): số chỗ, số suất đang chiếm chỗ TRƯỚC chuyển. */
  nguon: { id: string; soCho: number; tai: number };
  /** Điểm nguồn của đề nghị STOP (null với ONBOARD). */
  diemNguon: { id: string; trangThai: TrangThaiDiem } | null;
  dich: ChuyenDichVao;
  /** Số suất đang chiếm chỗ trên chuyến nhận TRƯỚC chuyển (khách + người đi kèm — LC-02). */
  taiDich: number;
  /** Suất sẽ chuyển (đọc lại lúc kiểm — `suatCuaDeNghi`). */
  suatChuyen: SuatVao[];
  /** Chặng (hàm hẹp của orders) của các suất khách sẽ chuyển; suất trỏ chặng không có ở đây → chặng không hiệu lực. */
  changChuyen: ChangVao[];
  /** Chặng có suất khách mở trên chuyến nhận TRƯỚC chuyển (cho cam kết sau chuyển). */
  changTrenDich: ChangVao[];
  /** Chuyến khác (mọi trạng thái) để xét trùng giờ (LC-03) và chuyến kế của tài xế xe nhận. */
  chuyenKhac: KhungChuyen[];
  chinhSach: ChinhSachVao;
  hangBang: HangBangVao[];
  /** Điều kiện xuất bến đang hiệu lực (giấy tờ bắt buộc theo số chỗ). */
  dieuKien: DieuKienVao[];
  danhMuc: DongDanhMuc[];
  bayGioMs: number;
}

const chiemCho = (s: SuatVao): boolean => s.mo && (s.trangThai === "WAITING" || s.trangThai === "BOARDED");
const yyyymmdd = (ngay: string): number => Number(ngay.replace(/-/g, ""));
const ngayVn = (ms: number): string => msToVnLocal(ms).date;
const MA_HANG_BANG = new Set(["HANG_BANG_KHONG_DU", "KHONG_CO_HANG_BANG", "GPLX_THIEU_HANG"]);

/** Kiểm MỘT đề nghị trên dữ liệu đọc mới (lúc tài xế xe nhận bấm Nhận, lúc Quản trị bấm Duyệt). `camKet` = cam kết chuyến nhận SAU chuyển (khoá cho lô duyệt). */
export function kiemChuyen(v: KiemChuyenVao): { dong: DongKiemChuyen[]; camKet: KetQuaCamKet } {
  const d = v.dich;
  const chuyen = v.suatChuyen.filter(chiemCho);
  const khach = v.suatChuyen.filter((s) => s.mo && s.loai === "PASSENGER");
  const lai = d.taiXe ? kiemLai(d.taiXe, d.xe.soCho, d.ketThucMs, v.hangBang) : null;
  const changSau = [...v.changTrenDich, ...v.changChuyen.filter((c) => khach.some((s) => s.legId === c.legId))];
  const camKet = kiemCamKet({ xe: { id: d.xe.id, soCho: d.xe.soCho }, chang: changSau, khoaDaPhaLe: d.camKetPhaLeKhoa });
  const ketThucDich = d.ketThucThatMs ?? d.ketThucMs;
  const kq = (dat: boolean): KetQuaLuat => (dat ? "DAT" : "KHONG_DAT");
  const tinh: Record<MaLuatChuyen, () => Omit<DongKiemChuyen, "ma" | "tang">> = {
    SUC_CHUA_DICH: () => {
      const sau = v.taiDich + chuyen.length;
      return { ketQua: kq(sau <= d.xe.soCho), giaTri: sau, gioiHan: d.xe.soCho };
    },
    // Xe nhờ chỉ bớt người (ADR-0052:74): ghi cho đủ bằng chứng.
    SUC_CHUA_NGUON: () => {
      const sau = v.nguon.tai - chuyen.length;
      return { ketQua: kq(sau >= 0 && sau <= v.nguon.soCho), giaTri: sau, gioiHan: v.nguon.soCho };
    },
    TRUNG_GIO_DICH: () => {
      const trung = v.chuyenKhac.some((k) => k.id !== d.id && k.trangThai !== "CANCELLED" && (k.xeId === d.xe.id || (d.taiXe !== null && k.taiXePartyId === d.taiXe.partyId))
        && d.batDauMs < (k.ketThucThatMs ?? k.ketThucMs) && k.batDauMs < ketThucDich);
      return { ketQua: kq(!trung), giaTri: null, gioiHan: null };
    },
    // Chỉ CANH_BAO (máy không biết đường đi — ADR-0052:75, ADR-0111 Đ1): chuyến kế của tài xế xe nhận bắt đầu trong 2 × khoảng nghỉ sau chuyến nhận.
    KHOANG_NGHI_DICH: () => {
      const tran = 2 * v.chinhSach.restMinutes;
      const ke = d.taiXe === null ? [] : v.chuyenKhac.filter((k) => k.id !== d.id && k.trangThai !== "CANCELLED" && k.taiXePartyId === d.taiXe!.partyId && k.batDauMs >= ketThucDich);
      if (ke.length === 0) return { ketQua: "DAT", giaTri: null, gioiHan: tran };
      const phut = Math.floor((Math.min(...ke.map((k) => k.batDauMs)) - ketThucDich) / PHUT);
      return { ketQua: phut < tran ? "CANH_BAO" : "DAT", giaTri: phut, gioiHan: tran };
    },
    // Xe nhận đang chạy: không kiểm mốc (ADR-0052:77). Chưa chạy: khoá dính R-P6 qua `kiemMocXep`; đặt gấp KHÔNG miễn (Đ6 = (1)).
    MOC_TOI_THIEU: () => {
      if (d.trangThai === "RUNNING") return { ketQua: "DAT", giaTri: null, gioiHan: v.chinhSach.minLeadMinutes };
      const datGap = MIEN_DAT_GAP_KHI_CHUYEN && khach.length > 0 && khach.every((s) => v.changChuyen.find((c) => c.legId === s.legId)?.datGap === true);
      const m = kiemMocXep({ batDauMs: d.batDauMs, batDauSomNhatMs: d.batDauSomNhatMs }, v.bayGioMs, v.chinhSach.minLeadMinutes, { loai: "DOI_DEN", datGap });
      return { ketQua: kq(!m.canPhaLe), giaTri: m.phutConLai, gioiHan: v.chinhSach.minLeadMinutes };
    },
    HANG_BANG_DICH: () => {
      if (!d.taiXe || !lai) return { ketQua: "KHONG_DAT", giaTri: d.xe.soCho, gioiHan: null };
      const dong = lai.gplx ? v.hangBang.find((h) => h.classCode === lai.gplx!.classCode) : undefined;
      return { ketQua: kq(!(lai.lyDo && MA_HANG_BANG.has(lai.lyDo.ma))), giaTri: d.xe.soCho, gioiHan: dong?.maxPassengers ?? null };
    },
    // GPLX còn hạn (LC-12) + giấy tờ bắt buộc theo điều kiện xuất bến (xe và tài xế) còn hạn tới hết chuyến.
    GIAY_TO_DICH: () => {
      const hetChuyen = yyyymmdd(ngayVn(d.ketThucMs));
      if (!d.taiXe || !lai) return { ketQua: "KHONG_DAT", giaTri: null, gioiHan: hetChuyen };
      let dat = !(lai.lyDo && !MA_HANG_BANG.has(lai.lyDo.ma));
      const han: string[] = lai.gplx?.expiryDate ? [lai.gplx.expiryDate] : [];
      for (const dk of v.dieuKien.filter((x) => d.xe.soCho >= x.minCapacity)) {
        const ds = dk.subject === "VEHICLE" ? d.xe.giayTo : d.taiXe.giayTo;
        const g = ds.find((x) => x.typeCode === dk.documentTypeCode && conHanToiHet(x.expiryDate, d.ketThucMs));
        if (!g) dat = false;
        else if (g.expiryDate) han.push(g.expiryDate);
      }
      return { ketQua: kq(dat), giaTri: han.length ? yyyymmdd([...han].sort()[0]!) : null, gioiHan: hetChuyen };
    },
    KHONG_CHEO: () => ({ ketQua: kq(d.taiXe !== null && khongCheo(d.xe, d.taiXe)), giaTri: null, gioiHan: null }),
    // STOP: điểm nguồn còn Chờ (LC-14); ONBOARD không có điểm nguồn → DAT cho đủ bằng chứng (giả định G-A5-26).
    DIEM_CHUA_TOI: () => ({ ketQua: kq(v.phamVi === "ONBOARD" || v.diemNguon?.trangThai === "PENDING"), giaTri: null, gioiHan: null }),
    // ADR-0128 Q2: CAM_KET_DICH (CAU_HINH, duyệt được) chỉ còn xét số chỗ tối thiểu; xe riêng tách sang XE_RIENG_DICH (LOI, chỉ Bác).
    CAM_KET_DICH: () => ({ ketQua: kq(camKet.viPham.every((x) => x.loai === "XR") || camKet.daPhaLe), giaTri: null, gioiHan: null }),
    XE_RIENG_DICH: () => ({ ketQua: kq(!camKet.coXeRieng), giaTri: null, gioiHan: null }),
    // Đ2: mọi suất KHÁCH chuyển thuộc chặng mở của đơn đã xác nhận, chưa huỷ; người đi kèm không có chặng — không xét (khớp lc09_leg).
    CHANG_KHACH_HIEU_LUC: () => {
      const hong = khach.filter((s) => {
        const c = v.changChuyen.find((x) => x.legId === s.legId);
        return !c || !changXetTheoDon(c);
      }).length;
      return { ketQua: kq(hong === 0), giaTri: hong, gioiHan: 0 };
    },
  };
  const dong = v.danhMuc.filter((m) => m.active).map((m): DongKiemChuyen => {
    if (!laMaLuat(m.code)) return { ma: m.code, tang: m.tier, ketQua: "KHONG_DAT", giaTri: null, gioiHan: null };
    return { ma: m.code, tang: m.tier, ...tinh[m.code]() };
  });
  return { dong, camKet };
}

/** MQ-02: mọi dòng DAT / CANH_BAO VÀ công tắc tự đồng ý (dòng chính sách hiện hành LÚC QUYẾT — Đ3 (c)) bật → máy xác nhận; còn lại leo thang. */
export function quyetDinhSauKiem(dong: readonly Pick<DongKiemChuyen, "ketQua">[], congTacBat: boolean): "CONFIRMED" | "ESCALATED" {
  return congTacBat && !dong.some((d) => d.ketQua === "KHONG_DAT") ? "CONFIRMED" : "ESCALATED";
}
/** ĐP4 (ADR-0052:80): có BẤT KỲ dòng KHONG_DAT tầng LOI ở MỌI lần kiểm của đề nghị → chỉ Bác; còn lại Quản trị duyệt được (kèm lý do PHA_LE). */
export function hopDuyet(dong: readonly Pick<DongKiemChuyen, "tang" | "ketQua">[]): "CHI_BAC" | "DUYET_HOAC_BAC" {
  return dong.some((d) => d.ketQua === "KHONG_DAT" && d.tang === "LOI") ? "CHI_BAC" : "DUYET_HOAC_BAC";
}

/** MQ-08: hạn chờ = giờ gửi + phút chờ của dòng chính sách LÚC GỬI (`policy_id`). */
export const hetHanLucMs = (guiLucMs: number, phutCho: number): number => guiLucMs + phutCho * PHUT;
/** Đã hết giờ chờ — biên `>=` khớp trigger `vc_transfer_request_han_cho` (quyết phải TRƯỚC hạn; EXPIRED chỉ từ hạn trở đi). Tính lúc đọc, không Cron. */
export const daHetHan = (guiLucMs: number, phutCho: number, bayGioMs: number): boolean => bayGioMs >= hetHanLucMs(guiLucMs, phutCho);

export const NOI_GAP_TOI_DA = 200;
/** Nơi gặp của đề nghị cứu hộ (G-A5-9): đúng MỘT trong hai — địa điểm danh mục hoặc chữ. Chữ: bỏ ký tự điều khiển, che dãy ≥ 8 chữ số, tối đa 200 ký tự. */
export function chuanNoiGap(v: { diaDiemId?: unknown; chu?: unknown }): { ok: true; diaDiemId: string | null; chu: string | null } | { ok: false; loi: string } {
  const id = typeof v.diaDiemId === "string" && v.diaDiemId.trim() !== "" ? v.diaDiemId.trim() : null;
  if (v.diaDiemId !== undefined && v.diaDiemId !== null && id === null) return { ok: false, loi: "Địa điểm nơi gặp không hợp lệ." };
  const c = cleanText(v.chu, "Nơi gặp", NOI_GAP_TOI_DA, false);
  if (c.error) return { ok: false, loi: c.error };
  if ((id === null) === (c.value === null)) return { ok: false, loi: "Chọn MỘT nơi gặp: địa điểm có sẵn hoặc ghi chữ." };
  return { ok: true, diaDiemId: id, chu: c.value === null ? null : maskLongDigits(c.value) };
}

/** Suất của đề nghị: STOP = suất mở đón tại điểm nguồn (LC-14 đòi mọi suất đó Chờ); ONBOARD = mọi suất mở Chờ + Đã lên, gồm người đi kèm (ADR-0111 Đ4). */
export function suatCuaDeNghi(phamVi: "STOP" | "ONBOARD", suatNguon: readonly SuatVao[], diemId: string | null): SuatVao[] {
  return phamVi === "STOP" ? suatNguon.filter((s) => s.mo && s.boardStopId === diemId) : suatNguon.filter(chiemCho);
}

export type MaLoiGui =
  | "ck_nguon_khong_chay" | "ck_dich_khong_hop_le" | "ck_khac_ngay" | "ck_cung_tai_xe" | "ck_dich_chua_co_tai_xe" | "ck_diem_khong_cho" | "ck_khong_co_khach"
  | "ck_suat_khong_cho" | "ck_cuu_ho_chi_xe_dang_chay";
export interface KiemGuiVao {
  phamVi: "STOP" | "ONBOARD";
  nguonId: string;
  dichId: string;
  nguon: { trangThai: TrangThaiChuyen; ngayChay: string; taiXePartyId: string | null };
  dich: { trangThai: TrangThaiChuyen; ngayChay: string; taiXePartyId: string | null };
  /** Điểm nguồn (STOP); null khi không thấy / ONBOARD. */
  diem: { tripId: string; loai: LoaiDiem; trangThai: TrangThaiDiem } | null;
  /** `suatCuaDeNghi` trên chuyến nguồn. */
  suatTaiDiem: SuatVao[];
}
/** LC-14 lớp máy chủ (trigger `vc_transfer_request_lc14` là lớp CSDL): trả mã lỗi đầu tiên, null = gửi được. Người gửi là tài xế nguồn: route kiểm (404). */
export function kiemGui(v: KiemGuiVao): MaLoiGui | null {
  if (v.nguon.trangThai !== "RUNNING") return "ck_nguon_khong_chay";
  if (v.dichId === v.nguonId || !(v.dich.trangThai === "PLANNED" || v.dich.trangThai === "RUNNING")) return "ck_dich_khong_hop_le";
  if (v.phamVi === "ONBOARD" && v.dich.trangThai !== "RUNNING") return "ck_cuu_ho_chi_xe_dang_chay";
  if (v.dich.ngayChay !== v.nguon.ngayChay) return "ck_khac_ngay";
  if (v.dich.taiXePartyId === null) return "ck_dich_chua_co_tai_xe";
  if (v.dich.taiXePartyId === v.nguon.taiXePartyId) return "ck_cung_tai_xe";
  if (v.phamVi === "STOP" && !(v.diem && v.diem.tripId === v.nguonId && v.diem.loai === "PICKUP" && v.diem.trangThai === "PENDING")) return "ck_diem_khong_cho";
  if (v.suatTaiDiem.length === 0) return "ck_khong_co_khach";
  if (v.phamVi === "STOP" && v.suatTaiDiem.some((s) => !(s.loai === "PASSENGER" && s.trangThai === "WAITING"))) return "ck_suat_khong_cho";
  return null;
}

/** Hình gọn của một đề nghị cho luật tự huỷ. */
export interface DeNghiGon {
  id: string;
  tuChuyen: string;
  denChuyen: string;
  phamVi: "STOP" | "ONBOARD";
  diemId: string | null;
  trangThai: string;
}
const dangCho = (r: DeNghiGon): boolean => r.trangThai === "PENDING" || r.trangThai === "ESCALATED";
/**
 * G-A5-6 (P4 — lời chủ; MQ-09 "nguồn đổi"): xác nhận STOP → huỷ (VOID) mọi đề nghị đang chờ khác cùng điểm nguồn + mọi đề nghị ONBOARD đang chờ của chuyến
 * nguồn; xác nhận ONBOARD → huỷ mọi đề nghị đang chờ khác của chuyến nguồn. Thứ tự theo `ds`.
 */
export function deNghiTuHuyKhiXacNhan(xacNhan: DeNghiGon, ds: readonly DeNghiGon[]): string[] {
  return ds.filter((r) => r.id !== xacNhan.id && dangCho(r) && r.tuChuyen === xacNhan.tuChuyen
    && (xacNhan.phamVi === "ONBOARD" || r.phamVi === "ONBOARD" || r.diemId === xacNhan.diemId)).map((r) => r.id);
}
/**
 * MQ-09 (G-A5-13): lệnh làm điểm nguồn hết Chờ (Đã tới, Bỏ qua, Báo huỷ, điều chỉnh đụng suất của điểm) → huỷ đề nghị STOP đang chờ của điểm đó; lệnh kết
 * thúc / kết thúc gián đoạn / huỷ / thu hồi xuất bến một chuyến → huỷ mọi đề nghị đang chờ có chuyến đó là nguồn hoặc đích.
 */
export function deNghiHuyKhi(su: { diemId: string } | { chuyenId: string }, ds: readonly DeNghiGon[]): string[] {
  return ds.filter((r) => dangCho(r) && ("diemId" in su ? r.phamVi === "STOP" && r.diemId === su.diemId : r.tuChuyen === su.chuyenId || r.denChuyen === su.chuyenId))
    .map((r) => r.id);
}

// ---- Điểm ở xe nhận (G-A5-8, MQ-06; kế hoạch T6 bước 7–9) ---------------------------------------------------------------------------------------------
/** Điểm của một chuyến cho kế hoạch ghép điểm: chỉ khoá so sánh nơi (`placeKey` — không bao giờ hiển thị). */
export interface DiemGhep {
  id: string;
  loai: LoaiDiem;
  trangThai: TrangThaiDiem;
  placeKey: string;
}
/** Điểm cần thêm ở xe nhận. `khoa` = tên tạm trong kế hoạch ("moi:<n>"); `noiGap` = điểm nơi gặp của cứu hộ. */
export interface DiemThem {
  khoa: string;
  loai: LoaiDiem;
  placeKey: string;
  noiGap: boolean;
}
export interface KeHoachDiem {
  them: DiemThem[];
  /** Điểm có sẵn của xe nhận được ghép (theo khoá nơi, cùng loại, còn Chờ). */
  ghep: string[];
  /** Mỗi suất chuyển: điểm lên / xuống ở xe nhận (id điểm có sẵn hoặc `khoa` của điểm thêm); null = suất không có điểm. */
  gan: { suatId: string; len: string | null; xuong: string | null }[];
}
/**
 * Kế hoạch điểm ở xe nhận — MỘT luật cho lô xác nhận / duyệt và màn hình xem trước. Suất ĐÃ LÊN (cứu hộ) lên tại điểm nơi gặp MỚI (luôn thêm); suất CHỜ
 * lên ở nơi đón gốc; điểm xuống theo nơi trả gốc. Ghép điểm có sẵn của xe nhận khi CÙNG khoá nơi, cùng loại, còn Chờ; không có thì thêm (đón trước, trả sau,
 * theo thứ tự điểm nguồn). Suất không có điểm lên (người đi kèm do lệnh xếp tạo — ca mẫu TH07) giữ không điểm. Thứ tự cuối do `sapDonTruocTra` sắp lại.
 */
export function keHoachDiem(v: { suatChuyen: readonly SuatVao[]; diemNguon: readonly (DiemGhep & { seq: number })[]; diemDich: readonly DiemGhep[]; noiGapPlaceKey: string | null }): KeHoachDiem {
  const them: DiemThem[] = [];
  const ghep: string[] = [];
  const nguon = new Map(v.diemNguon.map((d) => [d.id, d]));
  const theoNguon = [...v.suatChuyen].sort((a, b) => (nguon.get(a.boardStopId ?? "")?.seq ?? 0) - (nguon.get(b.boardStopId ?? "")?.seq ?? 0));
  const tim = (loai: LoaiDiem, placeKey: string, noiGap: boolean): string => {
    if (!noiGap) {
      const co = v.diemDich.find((d) => d.loai === loai && d.trangThai === "PENDING" && d.placeKey === placeKey);
      if (co) {
        if (!ghep.includes(co.id)) ghep.push(co.id);
        return co.id;
      }
    }
    const da = them.find((t) => t.loai === loai && t.placeKey === placeKey && t.noiGap === noiGap);
    if (da) return da.khoa;
    const moi = { khoa: `moi:${them.length + 1}`, loai, placeKey, noiGap };
    them.push(moi);
    return moi.khoa;
  };
  const gan = new Map<string, { len: string | null; xuong: string | null }>();
  for (const s of theoNguon) {
    if (s.boardStopId === null) gan.set(s.id, { len: null, xuong: null });
    else if (s.trangThai === "BOARDED") {
      if (v.noiGapPlaceKey === null) throw new Error("Suất đã lên chỉ chuyển bằng cứu hộ có nơi gặp.");
      gan.set(s.id, { len: tim("PICKUP", v.noiGapPlaceKey, true), xuong: null });
    } else {
      const len = nguon.get(s.boardStopId);
      gan.set(s.id, { len: len ? tim("PICKUP", len.placeKey, false) : null, xuong: null });
    }
  }
  for (const s of theoNguon) {
    const xuong = s.alightStopId === null ? undefined : nguon.get(s.alightStopId);
    gan.get(s.id)!.xuong = xuong ? tim("DROPOFF", xuong.placeKey, false) : null;
  }
  return { them, ghep, gan: v.suatChuyen.map((s) => ({ suatId: s.id, ...gan.get(s.id)! })) };
}

// ---- Trạng thái đề nghị lúc đọc (màn hình tài xế; MQ-08 hết giờ tính lúc đọc, không ghi) ----------------------------------------------------------------
export const TRANG_THAI_DE_NGHI = ["PENDING", "WITHDRAWN", "DECLINED", "EXPIRED", "VOID", "CONFIRMED", "ESCALATED", "REJECTED"] as const;
export type TrangThaiDeNghi = (typeof TRANG_THAI_DE_NGHI)[number];
/** Nhãn trạng thái đề nghị (chữ chờ chủ duyệt). "HET_GIO" = còn PENDING trong CSDL nhưng đã quá hạn lúc đọc. */
export const NHAN_TRANG_THAI_DE_NGHI: Readonly<Record<TrangThaiDeNghi | "HET_GIO", string>> = {
  PENDING: "Đang chờ trả lời",
  HET_GIO: "Hết giờ chờ",
  WITHDRAWN: "Đã rút",
  DECLINED: "Không nhận",
  EXPIRED: "Hết giờ chờ",
  VOID: "Đã huỷ",
  CONFIRMED: "Đã chuyển",
  ESCALATED: "Chờ văn phòng duyệt",
  REJECTED: "Văn phòng không duyệt",
};
/** Trạng thái hiển thị lúc đọc: PENDING đã quá hạn → "HET_GIO" (không ghi gì — lệnh kế tiếp chạm tới mới đóng thành EXPIRED). Leo thang không hết hạn. */
export function trangThaiLucDoc(r: { trangThai: TrangThaiDeNghi; guiLucMs: number; phutCho: number }, bayGioMs: number): TrangThaiDeNghi | "HET_GIO" {
  return r.trangThai === "PENDING" && daHetHan(r.guiLucMs, r.phutCho, bayGioMs) ? "HET_GIO" : r.trangThai;
}
