// LUẬT THUẦN của điều phối xe (ADR-0049 D1, D2; [TK] §2.1–2.4, §3.1; kế hoạch mục 1.1, 1.4, Task A4) — MỘT nguồn cho máy chủ (van-chuyen) và màn hình
// (Phần B: hộp tạo/sửa chuyến, "giữ", điều kiện xuất bến). Không I/O, không import module; import kèm đuôi .ts. Test cạnh tệp: dieu-phoi-kiem.test.ts.
//
// - Hàm KHÔNG biết quyền người gọi: nó nói "chặn" (luật lõi / luật không ai phá lệ) hoặc "cần phá lệ" (mốc tối thiểu, khoảng nghỉ); route quyết ai phá lệ.
// - Chính sách rỗng, hạng bằng không có dòng → CHẶN, không đoán con số.
// - "Còn hạn tới hết chuyến" = ngày hết hạn (ngày dân sự cuối còn dùng) ≥ NGÀY VN của giờ kết thúc dự kiến (không phải ngày UTC).
// - Trùng giờ (LC-03) theo khoảng NỬA MỞ [bắt đầu, kết thúc thật hoặc dự kiến) — chuyến huỷ không tính (I22). Khoảng nghỉ (CH-02) là luật cấu hình ở máy
//   chủ (không trigger), tính từ giờ kết thúc THẬT của chuyến trước khi đã có.
// - Lý do chỉ mang mã đơn, mã chuyến, biển số, con số — không tên, năm sinh, SĐT, số giấy tờ (LC-18).
// - ADR-0050: nơi hẹn đổi sau khi xếp → giữ NOI_HEN_DOI (so KHOÁ so sánh nơi của chặng với `placeKey` của điểm — `noiLechCuaSuat`, MỘT hàm cho cả lý do giữ
//   lẫn cảnh báo lịch chung K-02); khoảng nghỉ lúc xuất bến đo từ giờ XẢY RA xuất bến (`xuatBenMs`), không từ lúc bấm (I37).
import type {
  BanChup, ChangVao, ChinhSachVao, ChuyenVao, DieuKienVao, DiemVao, GanTen, HangBangVao, KetQuaKiem, KetQuaXuatBen, KhungChuyen, MucChup, SuatVao, TaiXeVao,
  TrangThaiChuyen, XeVao,
} from "./dieu-phoi-kieu.ts";
import { KET_QUA_CUOI_SUAT } from "./dieu-phoi-kieu.ts";
import { LOAI_CO_DINH } from "./giay-to.ts";
import { lyDoGiu, type LyDoGiu } from "./ly-do-giu.ts";
import { kiemMocXep, type LenhXep } from "./moc-toi-thieu.ts";
import { msToVnLocal } from "./vn-date.ts";

const PHUT = 60_000;
const NGAY_MS = 24 * 3600e3;
const ngayVn = (ms: number): string => msToVnLocal(ms).date;
/** Giấy tờ còn dùng được tới hết chuyến: không hạn, hoặc ngày hết hạn ≥ ngày VN của giờ kết thúc. */
export const conHanToiHet = (expiryDate: string | null, ketThucMs: number): boolean => expiryDate === null || expiryDate >= ngayVn(ketThucMs);
/** Suất đang chiếm chỗ trên xe (LC-02). */
const chiemCho = (s: SuatVao): boolean => s.mo && (s.trangThai === "WAITING" || s.trangThai === "BOARDED");
const laKetQuaCuoi = (s: SuatVao): boolean => (KET_QUA_CUOI_SUAT as readonly string[]).includes(s.trangThai);
const ketQua = (chan: LyDoGiu[], canPhaLe: LyDoGiu[]): KetQuaKiem => ({ ok: chan.length === 0 && canPhaLe.length === 0, chan, canPhaLe });
/** Bỏ lý do trùng (cùng mã, cùng câu) — giữ thứ tự xuất hiện. */
function khongTrung(xs: LyDoGiu[]): LyDoGiu[] {
  const seen = new Set<string>();
  return xs.filter((x) => (seen.has(`${x.ma}|${x.loiNhan}`) ? false : (seen.add(`${x.ma}|${x.loiNhan}`), true)));
}
/** Khoảng thời gian thật của một chuyến khác: tới giờ kết thúc THẬT khi đã có (I22). */
const ketThucHieuLuc = (k: KhungChuyen): number => k.ketThucThatMs ?? k.ketThucMs;

// ---- LC-12: đủ điều kiện lái (hạng, hạn GPLX) — lệch L-B2 (chỉ máy chủ giữ) ---------------------------------------------------------------------------
/**
 * Chọn GPLX dùng được cho xe `soCho` tới hết chuyến. Có một GPLX còn hạn, có hạng, hạng có dòng số khách và đủ chở → dùng. Không thì trả lý do "gần nhất":
 * chưa có GPLX → còn hạn không có → (trong các GPLX còn hạn) hạng không đủ → hạng không có dòng → chưa ghi hạng.
 */
export function kiemLai(taiXe: TaiXeVao, soCho: number, ketThucMs: number, hangBang: HangBangVao[]): { lyDo: LyDoGiu | null; gplx: TaiXeVao["giayTo"][number] | null } {
  const gplx = taiXe.giayTo.filter((g) => g.typeCode === LOAI_CO_DINH.GPLX);
  if (gplx.length === 0) return { lyDo: lyDoGiu("GPLX_THIEU"), gplx: null };
  const conHan = gplx.filter((g) => conHanToiHet(g.expiryDate, ketThucMs));
  if (conHan.length === 0) return { lyDo: lyDoGiu("GPLX_HET_HAN"), gplx: null };
  let khongDu = false;
  let khongDong = false;
  for (const g of conHan) {
    if (g.classCode === null) continue;
    const dong = hangBang.find((h) => h.classCode === g.classCode);
    if (!dong) {
      khongDong = true;
      continue;
    }
    if (dong.maxPassengers === null || dong.maxPassengers >= soCho) return { lyDo: null, gplx: g };
    khongDu = true;
  }
  if (khongDu) return { lyDo: lyDoGiu("HANG_BANG_KHONG_DU"), gplx: null };
  if (khongDong) return { lyDo: lyDoGiu("KHONG_CO_HANG_BANG"), gplx: null };
  return { lyDo: lyDoGiu("GPLX_THIEU_HANG"), gplx: null };
}

/** LC-13 (lớp máy chủ, I21): xe công ty ⇒ tài xế công ty KHÔNG thuộc nhà xe nào; xe của nhà xe X ⇒ tài xế có quan hệ "Tài xế của" X. */
export const khongCheo = (xe: Pick<XeVao, "chuLaCongTy" | "chuXePartyId">, taiXe: Pick<TaiXeVao, "loai" | "carrierPartyIds">): boolean =>
  xe.chuLaCongTy ? taiXe.loai === "CONG_TY" && taiXe.carrierPartyIds.length === 0 : taiXe.carrierPartyIds.includes(xe.chuXePartyId);

// ---- Tạo / sửa chuyến ------------------------------------------------------------------------------------------------------------------------------------
export interface KiemTaoSuaChuyenVao {
  lenh: "TAO" | "SUA";
  /** Trạng thái MỚI của chuyến (sau lệnh). `id` null khi tạo. */
  chuyen: { id: string | null; batDauMs: number; ketThucMs: number; xe: XeVao; taiXe: TaiXeVao | null; nghiPhaLe: boolean };
  /**
   * Trạng thái CŨ (bắt buộc khi SUA) — để biết lệnh có đổi xe / đổi tài xế không và xét mốc theo giờ sớm nhất của: giờ SỚM NHẤT từng có (khoá dính —
   * R-P6, `vc_trip` cột của A12), giờ cũ, giờ mới.
   */
  cu?: { batDauMs: number; batDauSomNhatMs: number; xeId: string; taiXePartyId: string | null; trangThai: TrangThaiChuyen };
  /** Số suất đang chiếm chỗ trên chuyến (khi sửa — đổi sang xe ít chỗ hơn). */
  taiTrenChuyen?: number;
  /** Các chuyến khác (mọi trạng thái; chuyến huỷ bị bỏ qua) để xét trùng giờ và khoảng nghỉ. */
  chuyenKhac: KhungChuyen[];
  chinhSach: ChinhSachVao | null;
  hangBang: HangBangVao[];
  bayGioMs: number;
}

/** Kiểm lệnh tạo / sửa chuyến: giờ hợp lệ, xe dùng được, sức chứa, LC-03, CH-02 (cần phá lệ), LC-12, LC-13, mốc lúc xếp khi đổi xe / tài xế (cần phá lệ). */
export function kiemTaoSuaChuyen(v: KiemTaoSuaChuyenVao): KetQuaKiem {
  const chan: LyDoGiu[] = [];
  const canPhaLe: LyDoGiu[] = [];
  const c = v.chuyen;
  if (!v.chinhSach) chan.push(lyDoGiu("CHINH_SACH_RONG"));
  if (v.lenh === "SUA" && v.cu && v.cu.trangThai !== "PLANNED") chan.push(lyDoGiu("CHUYEN_KHONG_CON_LEN_KE_HOACH"));
  if (!(c.ketThucMs > c.batDauMs && c.ketThucMs - c.batDauMs <= NGAY_MS)) chan.push(lyDoGiu("GIO_CHUYEN_KHONG_HOP_LE"));
  if (c.xe.trangThai === "retired") chan.push(lyDoGiu("XE_KHONG_DUNG", c.xe.bienSo));
  if (v.taiTrenChuyen !== undefined && v.taiTrenChuyen > c.xe.soCho) chan.push(lyDoGiu("VUOT_SO_CHO", `${v.taiTrenChuyen}/${c.xe.soCho}`));
  const nghi = v.chinhSach?.restMinutes ?? 0;
  for (const k of v.chuyenKhac) {
    if (k.trangThai === "CANCELLED" || k.id === c.id) continue;
    const cungXe = k.xeId === c.xe.id;
    const cungTaiXe = c.taiXe !== null && k.taiXePartyId === c.taiXe.partyId;
    if (!cungXe && !cungTaiXe) continue;
    const kEnd = ketThucHieuLuc(k);
    const trung = c.batDauMs < kEnd && k.batDauMs < c.ketThucMs;
    if (trung) {
      if (cungXe) chan.push(lyDoGiu("TRUNG_GIO_XE", k.ma));
      if (cungTaiXe) chan.push(lyDoGiu("TRUNG_GIO_TAI_XE", k.ma));
      continue;
    }
    if (v.chinhSach && !c.nghiPhaLe) {
      const khoang = kEnd <= c.batDauMs ? c.batDauMs - kEnd : k.batDauMs - c.ketThucMs;
      if (khoang < nghi * PHUT) canPhaLe.push(lyDoGiu("KHOANG_NGHI", k.ma));
    }
  }
  if (c.taiXe) {
    const lai = kiemLai(c.taiXe, c.xe.soCho, c.ketThucMs, v.hangBang);
    if (lai.lyDo) chan.push(lai.lyDo);
    if (!khongCheo(c.xe, c.taiXe)) chan.push(lyDoGiu("CHEO_XE_TAI_XE"));
  }
  // Mốc lúc xếp: chỉ khi SỬA mà đổi xe / đổi tài xế (Q2 = (a): tạo chuyến trong mốc không khoá). Giờ xét = sớm nhất của cũ / mới / giờ sớm nhất từng có —
  // không lách mốc bằng cách dời giờ trong CÙNG lệnh, cũng không bằng chuỗi lệnh "dời ra → đổi → dời về" (khoá dính R-P6). Dời giờ một mình không khoá.
  if (v.lenh === "SUA" && v.cu && v.chinhSach) {
    const batDau = Math.min(v.cu.batDauMs, c.batDauMs, v.cu.batDauSomNhatMs ?? v.cu.batDauMs);
    const lenh: LenhXep[] = [];
    if (v.cu.xeId !== c.xe.id) lenh.push("DOI_XE");
    if (v.cu.taiXePartyId !== (c.taiXe?.partyId ?? null)) lenh.push("DOI_TAI_XE");
    if (lenh.some((loai) => kiemMocXep({ batDauMs: batDau, batDauSomNhatMs: batDau }, v.bayGioMs, v.chinhSach!.minLeadMinutes, { loai }).canPhaLe)) canPhaLe.push(lyDoGiu("MOC_TOI_THIEU"));
  }
  return ketQua(khongTrung(chan), khongTrung(canPhaLe));
}

// ---- Xếp (mở suất) ----------------------------------------------------------------------------------------------------------------------------------------
/**
 * KHOÁ NGƯỜI RẢNH của một chặng — MỘT luật cho cả hai điểm gắn tên (I19): (a) lúc xếp, (b) lúc xuất bến. = hành khách HIỆN HÀNH của đơn (`nguoiCuaDon`)
 * chưa có suất MỞ nào ở chặng `legId` trên MỌI chuyến (LC-01: UNIQUE (chặng, khoá người) khi mở) và chưa bị chính lệnh này dùng; sắp theo khoá người.
 */
export function khoaNguoiRanh(v: { legId: string; nguoiCuaDon: readonly string[]; suatMoCuaChang: readonly SuatVao[]; daDungTrongLenh?: Iterable<string> }): string[] {
  const daDung = new Set<string>(v.daDungTrongLenh ?? []);
  for (const s of v.suatMoCuaChang) if (s.mo && s.legId === v.legId && s.personKey !== null) daDung.add(s.personKey);
  return [...new Set(v.nguoiCuaDon)].filter((p) => !daDung.has(p)).sort();
}
/**
 * I19(a) — tên cho `soSuat` suất khách MỚI của một chặng lúc xếp: khoá người thân gửi (`personKeys`, đã qua `kiemXep`) đứng trước; phần còn lại lấp bằng
 * khoá rảnh (`khoaNguoiRanh`) theo thứ tự, bỏ khoá đã gửi; hết khoá rảnh → null (I19(b) bù lúc xuất bến). Kế hoạch I19 / T-1 (R-P3): "không chọn thì máy
 * chọn theo thứ tự personKey".
 */
export function tenLucXep(v: { soSuat: number; personKeys: readonly string[]; ranh: readonly string[] }): (string | null)[] {
  const gui = new Set(v.personKeys);
  const lap = v.ranh.filter((p) => !gui.has(p));
  return Array.from({ length: v.soSuat }, (_x, i) => (i < v.personKeys.length ? v.personKeys[i]! : (lap[i - v.personKeys.length] ?? null)));
}
export interface ThemVaoXe {
  chang: ChangVao;
  /** Số suất mới mở cho chặng này (≥ số khoá người gửi kèm). */
  soSuatMoi: number;
  /** Khoá người được gắn ngay lúc xếp (I19a). */
  personKeys: string[];
  /** Suất ĐANG MỞ của chặng này trên MỌI chuyến (để giữ L-D1 và LC-01 theo tên). */
  suatMoCuaChang: SuatVao[];
}
export interface KiemXepVao {
  /** `batDauSomNhatMs` = giờ xuất bến dự kiến SỚM NHẤT từng có (khoá dính R-P6 — cột `vc_trip` của A12). */
  chuyen: { id: string; ma: string; trangThai: TrangThaiChuyen; batDauMs: number; batDauSomNhatMs: number; soCho: number; /** số suất đang chiếm chỗ */ tai: number };
  them: ThemVaoXe[];
  /** Người đi kèm (HDV, phụ xe — G9) mới xếp: chiếm chỗ như khách. */
  soNguoiDiKemMoi?: number;
  /** "XEP" (mặc định) hoặc "DOI_DEN" (suất dời từ chuyến khác sang). */
  lenh?: "XEP" | "DOI_DEN";
  chinhSach: ChinhSachVao | null;
  bayGioMs: number;
}

/** Kiểm lệnh xếp: LC-09 (chặng mở của đơn đã xác nhận, chưa huỷ), I13 (có giờ), L-D1, LC-02, LC-10, LC-01 theo tên, mốc lúc xếp (đặt gấp qua). */
export function kiemXep(v: KiemXepVao): KetQuaKiem {
  const chan: LyDoGiu[] = [];
  const canPhaLe: LyDoGiu[] = [];
  if (!v.chinhSach) chan.push(lyDoGiu("CHINH_SACH_RONG"));
  if (v.chuyen.trangThai !== "PLANNED") chan.push(lyDoGiu("CHUYEN_KHONG_CON_LEN_KE_HOACH", v.chuyen.ma));
  let moi = v.soNguoiDiKemMoi ?? 0;
  for (const t of v.them) {
    const c = t.chang;
    moi += t.soSuatMoi;
    if (!(c.changMo && c.donDaXacNhan && !c.donDaHuy)) chan.push(lyDoGiu("CHANG_KHONG_HOP_LE", c.orderCode));
    if (c.ngayDon === null || c.gioDon === null) chan.push(lyDoGiu("CHUA_CO_GIO", c.orderCode));
    const moCuaChang = t.suatMoCuaChang.filter((s) => s.mo && s.legId === c.legId);
    if (moCuaChang.length + t.soSuatMoi > c.soNguoi) chan.push(lyDoGiu("VUOT_SO_NGUOI_CHANG", `${c.orderCode} ${moCuaChang.length + t.soSuatMoi}/${c.soNguoi}`));
    const daCo = new Set(moCuaChang.map((s) => s.personKey).filter((p): p is string => p !== null));
    for (const p of t.personKeys) {
      if (!c.nguoiCuaDon.includes(p)) chan.push(lyDoGiu("KHACH_KHONG_THUOC_DON", c.orderCode));
      else if (daCo.has(p)) chan.push(lyDoGiu("NGUOI_DA_O_CHUYEN_KHAC", c.orderCode));
      daCo.add(p);
    }
    if (v.chinhSach && kiemMocXep(v.chuyen, v.bayGioMs, v.chinhSach.minLeadMinutes, { loai: v.lenh ?? "XEP", datGap: c.datGap }).canPhaLe) {
      canPhaLe.push(lyDoGiu("MOC_TOI_THIEU", c.orderCode));
    }
  }
  if (v.chuyen.tai + moi > v.chuyen.soCho) chan.push(lyDoGiu("VUOT_SO_CHO", `${v.chuyen.tai + moi}/${v.chuyen.soCho}`));
  return ketQua(khongTrung(chan), khongTrung(canPhaLe));
}

// ---- So nơi hẹn (ADR-0050 VK1-B; I41, I47) ----------------------------------------------------------------------------------------------------------------
/**
 * MỘT hàm so nơi của một suất khách với chặng của nó: `don` = khoá nơi đón hiện hành của chặng ≠ `placeKey` điểm LÊN (hoặc không thấy điểm lên); `tra` = chặng
 * ĐÃ có nơi trả mà điểm XUỐNG khác khoá (hoặc suất chưa có điểm xuống — I41). Khoá thiếu trong dữ liệu vào (undefined) → coi là LỆCH (không "khớp" im lặng).
 * Dùng cho lý do giữ NOI_HEN_DOI (`kiemXuatBen`, chuyến chưa chạy) VÀ cảnh báo NOI_HEN_KHAC_DIEM (`dungLichChung`, mọi chuyến chưa kết thúc).
 */
export function noiLechCuaSuat(suat: SuatVao, diemLen: DiemVao | undefined, diemXuong: DiemVao | undefined, chang: ChangVao): { don: boolean; tra: boolean } {
  void suat;
  const don = diemLen === undefined || typeof chang.khoaNoiDon !== "string" || diemLen.placeKey !== chang.khoaNoiDon;
  const tra = chang.khoaNoiTra !== null && (diemXuong === undefined || typeof chang.khoaNoiTra !== "string" || diemXuong.placeKey !== chang.khoaNoiTra);
  return { don, tra };
}

// ---- Cổng xuất bến (LC-05, LC-12 — L-B2; "giữ") ----------------------------------------------------------------------------------------------------------
export interface KiemXuatBenVao {
  chuyen: ChuyenVao;
  /** Suất của CHUYẾN NÀY (mở và đã đóng). */
  suat: SuatVao[];
  /** Mọi chặng có suất khách đang mở trên chuyến này — kèm cờ đơn / chặng. Suất trỏ chặng không có ở đây → giữ (không đoán). */
  chang: ChangVao[];
  /**
   * I38 (R-P9): chặng có suất mà RƠI khỏi hàm hẹp `lichChungChang` — route đọc cờ qua view công bố (`v_ord_leg_key` + `v_ord_order_flag`) và gán lý do CỤ THỂ.
   * Chặng không có ở `chang` lẫn ở đây → CHANG_DA_DONG (không đoán "đủ điều kiện").
   */
  changNgoai?: { legId: string; orderCode: string; lyDo: "DON_DA_HUY" | "CHANG_DA_DONG" | "GIO_HEN_NGOAI_CHUYEN" | "CHANG_KHONG_HOP_LE" }[];
  /** Suất đang mở của các chặng đó trên MỌI chuyến (đủ / thiếu / thừa suất; tên đã dùng). */
  suatMoCuaChang: SuatVao[];
  /** Điểm dừng của CHUYẾN NÀY (`placeKey` — so nơi hẹn, ADR-0050 VK1-B). */
  diem: DiemVao[];
  /** Chuyến khác (mọi trạng thái) để xét xe / tài xế đang chạy chuyến khác và khoảng nghỉ từ giờ kết thúc thật. */
  chuyenKhac: KhungChuyen[];
  chinhSach: ChinhSachVao | null;
  hangBang: HangBangVao[];
  /** Điều kiện xuất bến ĐANG HIỆU LỰC. */
  dieuKien: DieuKienVao[];
  bayGioMs: number;
  /**
   * Giờ XẢY RA xuất bến (ADR-0050 VK1-A, I37) = giờ văn phòng khai, hoặc lúc bấm; lịch chung dự phóng = max(bây giờ, giờ bắt đầu). Khoảng nghỉ đo từ đây —
   * đo từ lúc bấm là lệch khi văn phòng khai lùi (kế hoạch mục 4 điểm 23).
   */
  xuatBenMs: number;
}

/**
 * Cổng xuất bến — MỘT hàm cho máy chủ và màn hình (ADR-0049 D2). Kiểm sàn cứng (xe đang dùng, đúng một tài xế, GPLX còn hạn tới hết chuyến và hạng đủ
 * chở số chỗ), mọi điều kiện đang hiệu lực theo cỡ xe, đủ tên (khi chính sách bắt), đơn huỷ / chặng đóng, đủ / thiếu / thừa suất, nơi trả, giờ, sức chứa,
 * nghỉ đủ (từ giờ kết thúc thật), xe / tài xế không đang chạy chuyến khác, LC-13, hợp đồng (khoá 0). Trả bản chụp (khoá + hạng + hạn, không số) và danh
 * sách gắn tên còn thiếu (I19b). `dat` ⇔ không lý do nào.
 */
export function kiemXuatBen(v: KiemXuatBenVao): KetQuaXuatBen {
  const lyDo: LyDoGiu[] = [];
  const c = v.chuyen;
  const cs = v.chinhSach;
  const muc: MucChup[] = [];
  const mucRong = { vehicleDocumentId: null, personDocumentId: null, documentTypeCode: null, licenseClassCode: null, expiryDate: null, ruleId: null };
  if (!cs) lyDo.push(lyDoGiu("CHINH_SACH_RONG"));
  else if (cs.requireContract) lyDo.push(lyDoGiu("HOP_DONG"));
  if (c.xe.trangThai !== "active") lyDo.push(lyDoGiu("XE_KHONG_DUNG", c.xe.bienSo));
  if (!c.taiXe) lyDo.push(lyDoGiu("CHUA_CO_TAI_XE", c.ma));
  else {
    const lai = kiemLai(c.taiXe, c.xe.soCho, c.ketThucMs, v.hangBang);
    if (lai.lyDo) lyDo.push(lai.lyDo);
    if (lai.gplx) muc.push({ ...mucRong, loai: "GPLX", personDocumentId: lai.gplx.rowId, documentTypeCode: LOAI_CO_DINH.GPLX, licenseClassCode: lai.gplx.classCode, expiryDate: lai.gplx.expiryDate });
    if (!khongCheo(c.xe, c.taiXe)) lyDo.push(lyDoGiu("CHEO_XE_TAI_XE"));
  }
  // Điều kiện xuất bến đang hiệu lực, áp cho xe từ minCapacity chỗ.
  for (const dk of v.dieuKien.filter((d) => c.xe.soCho >= d.minCapacity)) {
    if (dk.subject === "VEHICLE") {
      const g = c.xe.giayTo.find((x) => x.typeCode === dk.documentTypeCode && conHanToiHet(x.expiryDate, c.ketThucMs));
      if (g) muc.push({ ...mucRong, loai: "GIAY_TO_XE", vehicleDocumentId: g.rowId, documentTypeCode: g.typeCode, expiryDate: g.expiryDate, ruleId: dk.id });
      else {
        lyDo.push(lyDoGiu("DIEU_KIEN_GIAY_TO_XE", c.xe.bienSo));
        muc.push({ ...mucRong, loai: "DIEU_KIEN", documentTypeCode: dk.documentTypeCode, ruleId: dk.id });
      }
    } else if (c.taiXe) {
      const g = c.taiXe.giayTo.find((x) => x.typeCode === dk.documentTypeCode && conHanToiHet(x.expiryDate, c.ketThucMs));
      if (g) muc.push({ ...mucRong, loai: "GIAY_TO_NGUOI", personDocumentId: g.rowId, documentTypeCode: g.typeCode, licenseClassCode: g.classCode, expiryDate: g.expiryDate, ruleId: dk.id });
      else {
        lyDo.push(lyDoGiu("DIEU_KIEN_GIAY_TO_TAI_XE"));
        muc.push({ ...mucRong, loai: "DIEU_KIEN", documentTypeCode: dk.documentTypeCode, ruleId: dk.id });
      }
    }
  }
  // Sức chứa (LC-02): suất đang chiếm chỗ (khách + người đi kèm).
  const tai = v.suat.filter(chiemCho).length;
  if (tai > c.xe.soCho) lyDo.push(lyDoGiu("VUOT_SO_CHO", `${tai}/${c.xe.soCho}`));
  // Từng chặng có suất khách mở trên chuyến.
  const ganTen: GanTen[] = [];
  const legIds = [...new Set(v.suat.filter((s) => s.mo && s.loai === "PASSENGER" && s.legId !== null).map((s) => s.legId as string))];
  for (const legId of legIds) {
    const ch = v.chang.find((x) => x.legId === legId);
    if (!ch) {
      const ngoai = v.changNgoai?.find((x) => x.legId === legId);
      lyDo.push(ngoai ? lyDoGiu(ngoai.lyDo, ngoai.orderCode) : lyDoGiu("CHANG_DA_DONG"));
      continue;
    }
    if (ch.donDaHuy) lyDo.push(lyDoGiu("DON_DA_HUY", ch.orderCode));
    else if (!ch.donDaXacNhan) lyDo.push(lyDoGiu("CHANG_KHONG_HOP_LE", ch.orderCode));
    if (!ch.changMo) lyDo.push(lyDoGiu("CHANG_DA_DONG", ch.orderCode));
    if (!ch.coNoiTra) lyDo.push(lyDoGiu("CHUA_CO_NOI_TRA", ch.orderCode));
    if (ch.ngayDon === null || ch.gioDon === null) lyDo.push(lyDoGiu("CHUA_CO_GIO", ch.orderCode));
    // ADR-0050 VK1-B: nơi hẹn đổi sau khi xếp (chuyến CHƯA chạy) → giữ tới khi văn phòng "cập nhật điểm theo đơn". Một lý do mỗi chặng.
    // Đơn huỷ / chặng bỏ / đơn chưa xác nhận: lý do riêng ở trên đã đủ — không bắt văn phòng "cập nhật điểm" cho khách không còn đi (I38).
    if (c.trangThai === "PLANNED" && ch.donDaXacNhan && !ch.donDaHuy && ch.changMo) {
      const lech = v.suat.some((s) => {
        if (!(s.mo && s.loai === "PASSENGER" && s.legId === legId)) return false;
        const n = noiLechCuaSuat(s, v.diem.find((d) => d.id === s.boardStopId), s.alightStopId === null ? undefined : v.diem.find((d) => d.id === s.alightStopId), ch);
        return n.don || n.tra;
      });
      if (lech) lyDo.push(lyDoGiu("NOI_HEN_DOI", ch.orderCode));
    }
    const moMoiChuyen = v.suatMoCuaChang.filter((s) => s.mo && s.legId === legId);
    if (moMoiChuyen.length < ch.soNguoi) lyDo.push(lyDoGiu("THIEU_SUAT", `${ch.orderCode} ${moMoiChuyen.length}/${ch.soNguoi}`));
    if (moMoiChuyen.length > ch.soNguoi) lyDo.push(lyDoGiu("THUA_SUAT", `${ch.orderCode} ${moMoiChuyen.length}/${ch.soNguoi}`));
    // Tên (I12, I19b): khoá người RẢNH (MỘT luật với lúc xếp — `khoaNguoiRanh`) → gắn cho suất chưa tên của chuyến này, theo thứ tự khoá người / mã suất.
    const ranh = khoaNguoiRanh({ legId, nguoiCuaDon: ch.nguoiCuaDon, suatMoCuaChang: v.suatMoCuaChang });
    const chuaTen = v.suat.filter((s) => s.mo && s.legId === legId && s.personKey === null).sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    chuaTen.forEach((s, i) => {
      const p = ranh[i];
      if (p !== undefined) ganTen.push({ suatId: s.id, personKey: p });
    });
    const thieu = Math.max(ch.soNguoi - ch.nguoiCuaDon.length, chuaTen.length - ranh.length, 0);
    if (cs?.requireManifest && thieu > 0) lyDo.push(lyDoGiu("THIEU_TEN", `${ch.orderCode} thiếu ${thieu} tên`));
  }
  // Xe / tài xế đang chạy chuyến khác (LC-03 "một chuyến đang chạy mỗi xe, mỗi tài xế"); nghỉ đủ từ giờ kết thúc THẬT của chuyến trước (CH-02).
  for (const k of v.chuyenKhac) {
    if (k.id === c.id) continue;
    const cungXe = k.xeId === c.xe.id;
    const cungTaiXe = c.taiXe !== null && k.taiXePartyId === c.taiXe.partyId;
    if (!cungXe && !cungTaiXe) continue;
    if (k.trangThai === "RUNNING") {
      if (cungXe) lyDo.push(lyDoGiu("TRUNG_GIO_XE", k.ma));
      if (cungTaiXe) lyDo.push(lyDoGiu("TRUNG_GIO_TAI_XE", k.ma));
    } else if ((k.trangThai === "ENDED" || k.trangThai === "ENDED_INTERRUPTED") && k.ketThucThatMs !== null && !c.nghiPhaLe && cs) {
      if (k.ketThucThatMs <= v.xuatBenMs && v.xuatBenMs - k.ketThucThatMs < c.nghiChup * PHUT) lyDo.push(lyDoGiu("NGHI_THIEU", k.ma));
    }
  }
  const chup: BanChup = {
    policyId: cs?.id ?? null,
    xeId: c.xe.id,
    bienSo: c.xe.bienSo,
    soCho: c.xe.soCho,
    chuXePartyId: c.xe.chuXePartyId,
    taiXePartyId: c.taiXe?.partyId ?? null,
    nghiDaDung: c.nghiChup,
    muc,
  };
  const ds = khongTrung(lyDo);
  return { dat: ds.length === 0, lyDo: ds, chup, ganTen };
}

// ---- Kết thúc (LC-16), "trong ngày chạy" -----------------------------------------------------------------------------------------------------------------
/** LC-16: kết thúc thường chỉ khi mọi suất mở đã có kết quả cuối và mọi điểm đã DONE / SKIPPED / MOVED; không thì gợi ý "Kết thúc gián đoạn". */
export function kiemKetThuc(v: { suat: SuatVao[]; diem: DiemVao[] }): { duoc: true } | { duoc: false; goiY: "KET_THUC_GIAN_DOAN"; conSuat: number; conDiem: number } {
  const conSuat = v.suat.filter((s) => s.mo && !laKetQuaCuoi(s)).length;
  const conDiem = v.diem.filter((d) => d.trangThai === "PENDING" || d.trangThai === "ARRIVED").length;
  return conSuat === 0 && conDiem === 0 ? { duoc: true } : { duoc: false, goiY: "KET_THUC_GIAN_DOAN", conSuat, conDiem };
}

/** "Trong ngày chạy" (ADR-0049 D3): hôm nay (ngày VN) là ngày chạy của chuyến, HOẶC chuyến đang chạy (qua nửa đêm). Ngoài khoảng đó DTO tài xế không có tên, SĐT. */
export const trongNgayChay = (chuyen: { ngayChay: string; trangThai: TrangThaiChuyen }, homNay: string): boolean =>
  chuyen.ngayChay === homNay || chuyen.trangThai === "RUNNING";
