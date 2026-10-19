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
  BanChup, ChangVao, ChinhSachVao, ChuyenVao, DieuKienVao, DiemVao, GanTen, HangBangVao, KetQuaKiem, KetQuaXuatBen, KhungBanVao, KhungChuyen, MucChup, SuatVao, TaiXeVao,
  TrangThaiChuyen, XeVao,
} from "./dieu-phoi-kieu.ts";
import { xetKetThuc } from "./ket-thuc-chuyen.ts";
import { kiemCamKet, tachLyDoCamKet, type KetQuaCamKet } from "./cam-ket-xe.ts";
import { LOAI_CO_DINH } from "./giay-to.ts";
import { canhBaoGioLai, type CanhBaoGioLai, type ChuyenGioLai } from "./gio-lai.ts";
import { chongNuaMo, nhanKhoangGio, nhanTuDen } from "./khung-ban.ts";
import { lyDoGiu, type LyDoGiu } from "./ly-do-giu.ts";
import { gioXetSuaChuyen, kiemMocXep, type LenhXep } from "./moc-toi-thieu.ts";
import { suatTraTruocDon } from "./thu-tu-diem.ts";
import { msToVnLocal, ngayNgan, vnToday } from "./vn-date.ts";

const PHUT = 60_000;
const NGAY_MS = 24 * 3600e3;
const ngayVn = (ms: number): string => msToVnLocal(ms).date;
/** Giấy tờ còn dùng được tới hết chuyến: không hạn, hoặc ngày hết hạn ≥ ngày VN của giờ kết thúc. */
export const conHanToiHet = (expiryDate: string | null, ketThucMs: number): boolean => expiryDate === null || expiryDate >= ngayVn(ketThucMs);
/** Suất đang chiếm chỗ trên xe (LC-02). */
const chiemCho = (s: SuatVao): boolean => s.mo && (s.trangThai === "WAITING" || s.trangThai === "BOARDED");
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

/**
 * LC-13 (lớp máy chủ, I21): xe công ty ⇒ tài xế công ty KHÔNG thuộc nhà xe nào; xe của nhà xe X ⇒ tài xế có quan hệ "Tài xế của" X, HOẶC (ADR-0129 Q4 = (a), chủ duyệt
 * 2026-10-17) tài xế công ty không thuộc nhà xe nào — kèm cảnh báo `CHEO_XE_TAI_XE` ở lịch chung (xem `laiXeThueBangTaiXeCongTy`) và vẫn qua hạng bằng (`kiemLai`) lẫn
 * giấy tờ xe (cổng xuất bến). Chiều ngược (tài xế nhà xe lái xe công ty / xe nhà xe khác) vẫn chặn.
 */
export const khongCheo = (xe: Pick<XeVao, "chuLaCongTy" | "chuXePartyId">, taiXe: Pick<TaiXeVao, "loai" | "carrierPartyIds">): boolean =>
  xe.chuLaCongTy ? taiXe.loai === "CONG_TY" && taiXe.carrierPartyIds.length === 0 : taiXe.carrierPartyIds.includes(xe.chuXePartyId) || laiXeThueBangTaiXeCongTy(xe, taiXe);

/** ADR-0129 Q4: tài xế CÔNG TY (không thuộc nhà xe nào) lái xe của NHÀ XE thuê — được, nhưng phải mang cảnh báo «chéo xe – tài xế». */
export const laiXeThueBangTaiXeCongTy = (xe: Pick<XeVao, "chuLaCongTy">, taiXe: Pick<TaiXeVao, "loai" | "carrierPartyIds">): boolean =>
  !xe.chuLaCongTy && taiXe.loai === "CONG_TY" && taiXe.carrierPartyIds.length === 0;

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
  /** Khung bận CÒN HIỆU LỰC giao giờ chuyến (ADR-0055 VK2-A A2 (i)) — vắng = không khung. */
  khungBan?: KhungBanVao[];
  chinhSach: ChinhSachVao | null;
  hangBang: HangBangVao[];
  bayGioMs: number;
  /**
   * ADR-0056 VK3-A: cam kết của khách trên chuyến — chỉ xét khi SỬA mà ĐỔI XE (R-CX theo xe mới; khoá mang id xe nên phá lệ cũ không còn khớp).
   * `changTrenChuyen` = chặng có suất khách mở trên chuyến; `khoaDaPhaLe` = `vc_trip.commitment_override_key`. Vắng = không xét (tạo chuyến: chưa có khách).
   */
  camKet?: { changTrenChuyen: ChangVao[]; khoaDaPhaLe: string | null };
}

/**
 * Kết quả kiểm tạo / sửa chuyến + nhắc giờ lái của CHÍNH chuyến đó (ADR-0055 VK2-B B3 — chỉ cảnh báo, không đổi `ok`). Tên KHÁC `kiemXep.canhBao` có chủ
 * đích (K14): cảnh báo xếp là `LyDoGiu` (mã `MA_GIU`), còn giờ lái không được thêm mã vào `MA_GIU` (ADR-0055).
 */
export type KetQuaTaoSua = KetQuaKiem & { nhacGioLai: CanhBaoGioLai[]; /** null = lệnh không đổi xe (hoặc tạo chuyến) — không xét cam kết. */ camKet: KetQuaCamKet | null };
/** Kiểm lệnh tạo / sửa chuyến: giờ hợp lệ, xe dùng được, sức chứa, LC-03, khung bận, CH-02 (cần phá lệ), LC-12, LC-13, mốc lúc xếp khi đổi xe / tài xế (cần phá lệ). */
export function kiemTaoSuaChuyen(v: KiemTaoSuaChuyenVao): KetQuaTaoSua {
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
  // ADR-0055 VK2-A A2 (i) + ADR-0053 D9 B9.3: khung bận còn hiệu lực là KHOẢNG CHẶN như chuyến khác — MỘT hàm cho xe và tài xế (không luật thứ hai).
  // Mã: dùng lại TRUNG_GIO_XE / TRUNG_GIO_TAI_XE (ADR-0055 "không thêm mã vào MA_GIU"; chủ không trả lời Lượt III câu 7) — chi tiết nói rõ là lịch bận.
  // Kế hoạch A4 G-A4-9 (lời chủ 6.2): nhánh TÀI XẾ không có lý do — "<Tên> bận từ … đến …. Chọn tài xế khác hoặc đổi giờ chuyến."; nhánh XE giữ lý do.
  for (const k of v.khungBan ?? []) {
    if (!chongNuaMo(c.batDauMs, c.ketThucMs, k.batDauMs, k.ketThucMs)) continue;
    if (k.doiTuong === "VEHICLE" && k.xeId === c.xe.id) chan.push(lyDoGiu("TRUNG_GIO_XE", `lịch xe bận: ${k.lyDoNhan ?? ""} ${nhanKhoangGio(k.batDauMs, k.ketThucMs)}`));
    if (k.doiTuong === "DRIVER" && c.taiXe !== null && k.taiXePartyId === c.taiXe.partyId) {
      chan.push(lyDoGiu("TRUNG_GIO_TAI_XE", `${c.taiXe.displayName || "Tài xế"} bận ${nhanTuDen(k.batDauMs, k.ketThucMs)}. Chọn tài xế khác hoặc đổi giờ chuyến.`));
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
    const batDau = gioXetSuaChuyen(v.cu.batDauMs, c.batDauMs, v.cu.batDauSomNhatMs); // một phép với "dưới mốc" của lớp vượt (ADR-0104 Đ1 mục 0)
    const lenh: LenhXep[] = [];
    if (v.cu.xeId !== c.xe.id) lenh.push("DOI_XE");
    if (v.cu.taiXePartyId !== (c.taiXe?.partyId ?? null)) lenh.push("DOI_TAI_XE");
    if (lenh.some((loai) => kiemMocXep({ batDauMs: batDau, batDauSomNhatMs: batDau }, v.bayGioMs, v.chinhSach!.minLeadMinutes, { loai }).canPhaLe)) canPhaLe.push(lyDoGiu("MOC_TOI_THIEU"));
  }
  // ADR-0056 VK3-A: đổi xe → chạy lại MỘT luật cam kết trên chuyến với xe MỚI (khoá có id xe ⇒ phá lệ cũ không còn khớp ⇒ cần phá lệ lại).
  let camKet: KetQuaCamKet | null = null;
  if (v.lenh === "SUA" && v.cu && v.camKet && v.cu.xeId !== c.xe.id) {
    camKet = kiemCamKet({ xe: c.xe, chang: v.camKet.changTrenChuyen, khoaDaPhaLe: v.camKet.khoaDaPhaLe });
    const t = tachLyDoCamKet(camKet);
    chan.push(...t.chan);
    canPhaLe.push(...t.canPhaLe);
  }
  // ADR-0055 VK2-B B3: nhắc giờ lái cho chuyến đang tạo / sửa (MỘT hàm với lịch chung — canhBaoGioLai). "__moi__" = id tạm của chuyến chưa có id.
  const id = c.id ?? "__moi__";
  const ung: ChuyenGioLai = { id, ma: "", taiXePartyId: c.taiXe?.partyId ?? null, batDauMs: c.batDauMs, ketThucMs: c.ketThucMs, ketThucThatMs: null, trangThai: "PLANNED", xuatBenMs: null };
  const cs = v.chinhSach ? { dutyDayMaxMinutes: v.chinhSach.dutyDayMaxMinutes, tripNoBreakMaxMinutes: v.chinhSach.tripNoBreakMaxMinutes } : null;
  const nhacGioLai = canhBaoGioLai([ung, ...v.chuyenKhac.filter((k) => k.id !== c.id)], cs, v.bayGioMs, new Set([id]));
  return { ...ketQua(khongTrung(chan), khongTrung(canPhaLe)), nhacGioLai, camKet };
}

// ---- Xếp (mở suất) ----------------------------------------------------------------------------------------------------------------------------------------
/**
 * Chặng được xét "theo đơn" (nơi hẹn đổi — VK1-B; khách đã đổi — R-P29): đơn đã xác nhận, chưa huỷ, chặng còn mở. Đơn huỷ / chặng bỏ / đơn chưa xác nhận có
 * lý do giữ RIÊNG (DON_DA_HUY, CHANG_DA_DONG, …) — không bắt văn phòng "cập nhật điểm theo đơn" cho khách không còn đi (I38). Điều kiện của lý do giữ
 * NOI_HEN_DOI / KHACH_DA_DOI ở cổng xuất bến. ADR-0104 Đ2.11: lệnh "Cập nhật khách theo đơn" KHÔNG còn bỏ qua chặng ngoài điều kiện này — nó dùng luật thuần
 * `dongBoChuyenTheoDon` (dong-bo-chuyen.ts), đóng suất của đơn huỷ / chặng bỏ / đơn không xác nhận.
 */
export const changXetTheoDon = (ch: ChangVao): boolean => ch.donDaXacNhan && !ch.donDaHuy && ch.changMo;
/**
 * R-P29 (chủ lần 16): suất KHÁCH MỞ của chặng `legId` trong `suat` (suất của CHUYẾN này) mang khoá người KHÔNG còn là hành khách hiện hành của đơn
 * (`nguoiCuaDon`) — khách bị bỏ / thay sau khi gắn tên. MỘT định nghĩa cho lý do giữ KHACH_DA_DOI (`kiemXuatBen`) và luật (ii) của `dongBoChuyenTheoDon`
 * (máy đồng bộ + nút "Cập nhật khách theo đơn" — ADR-0104 Đ2.6, Đ2.11).
 */
export function suatKhachDaDoi(v: { legId: string; nguoiCuaDon: readonly string[]; suat: readonly SuatVao[] }): SuatVao[] {
  const hienHanh = new Set(v.nguoiCuaDon);
  return v.suat.filter((s) => s.mo && s.loai === "PASSENGER" && s.legId === v.legId && s.personKey !== null && !hienHanh.has(s.personKey));
}
/**
 * KHOÁ NGƯỜI RẢNH của một chặng — MỘT luật cho cả hai điểm gắn tên (I19): (a) lúc xếp, (b) lúc xuất bến. = hành khách HIỆN HÀNH của đơn (`nguoiCuaDon`)
 * chưa có suất MỞ nào ở chặng `legId` trên MỌI chuyến (LC-01: UNIQUE (chặng, khoá người) khi mở); sắp theo khoá người. "Chưa bị chính lệnh này dùng" không
 * cần tham số: một chặng chỉ xuất hiện một lần trong thân xếp (`docXep`) và `tenLucXep` / lô xuất bến không lặp khoá trong một chặng (K2d THẤP: gỡ tham số thừa).
 */
export function khoaNguoiRanh(v: { legId: string; nguoiCuaDon: readonly string[]; suatMoCuaChang: readonly SuatVao[] }): string[] {
  const daDung = new Set<string>();
  for (const s of v.suatMoCuaChang) if (s.mo && s.legId === v.legId && s.personKey !== null) daDung.add(s.personKey);
  return [...new Set(v.nguoiCuaDon)].filter((p) => !daDung.has(p)).sort();
}
/**
 * R-P29 (chủ lần 16) — khoá cho các suất MỞ LẠI sau khi đóng `soDong` suất khách đã đổi của MỘT chặng: mở lại tối đa tới SỐ NGƯỜI của chặng (L-D1 — cùng
 * cách đếm với `kiemXep`: suất MỞ của chặng trên MỌI chuyến, ở đây là số còn lại SAU khi đóng), mỗi suất mang khoá rảnh kế tiếp theo thứ tự (`khoaNguoiRanh`),
 * hết khoá rảnh → null (I19b bù lúc xuất bến). Đơn đã giảm người → mở ít hơn / không mở (chỉ đóng).
 */
export function moLaiSauDoiKhach(v: { soNguoi: number; soMoSauDong: number; soDong: number; ranh: readonly string[] }): (string | null)[] {
  const k = Math.max(0, Math.min(v.soDong, v.soNguoi - v.soMoSauDong));
  return Array.from({ length: k }, (_x, i) => v.ranh[i] ?? null);
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
  /**
   * "XEP" (mặc định) hoặc "DOI_DEN" (suất dời từ chuyến khác sang). "THEM_KHI_CHAY" (ADR-0052 D5.1 — Đợt 5): văn phòng thêm khách vào xe ĐANG CHẠY — chỉ
   * chuyến RUNNING; mốc như dòng "Xếp" (đặt gấp qua) với xe LUÔN trong mốc (giờ xét = min(giờ dự kiến, bây giờ)).
   */
  lenh?: "XEP" | "DOI_DEN" | "THEM_KHI_CHAY";
  /**
   * ADR-0056 VK3-A: chặng có suất khách MỞ trên chuyến TRƯỚC lệnh (đích của lệnh dời). Tập sau lệnh = `changTrenChuyen` ∪ `them[].chang` (chặng có suất mới).
   * BẮT BUỘC — mọi đường đưa khách lên xe (xếp, dời đến, thêm khi xe đang chạy) xét cùng một luật.
   */
  changTrenChuyen: ChangVao[];
  /** Xe của chuyến (id vào khoá phá lệ — C5). */
  xeId: string;
  /** `vc_trip.commitment_override_key` đang lưu; null = chưa phá lệ. */
  camKetPhaLeKhoa: string | null;
  chinhSach: ChinhSachVao | null;
  bayGioMs: number;
}

// ---- Nơi trả, đủ tên: MỘT luật cho cổng xuất bến (giữ) và cảnh báo sớm lúc xếp (lời chủ 1/10 "chỉ cảnh báo, không chặn") ----------------------------
/** CHUA_CO_NOI_TRA: chặng chưa có nơi trả (không điểm danh mục, không địa chỉ gõ tự do — `coNoiTra`). */
// Kiểu vào là `Pick` (chỉ các trường luật đọc) để cảnh báo LÚC XÁC NHẬN ĐƠN ở trang đơn (src/shared/canh-bao-xac-nhan.ts — Người 1, kế hoạch 2026-10-01) gọi
// CHÍNH hai hàm này từ chặng của chi tiết đơn, không viết luật thứ hai.
export const lyDoNoiTra = (ch: Pick<ChangVao, "coNoiTra" | "orderCode">): LyDoGiu | null => (ch.coNoiTra ? null : lyDoGiu("CHUA_CO_NOI_TRA", ch.orderCode));
/** Số tên còn thiếu của chặng (vế của THIEU_TEN — dùng ở `lyDoThieuTen` và câu "Còn N khách chưa có tên" lúc xác nhận đơn). */
export const soTenThieu = (ch: Pick<ChangVao, "soNguoi" | "nguoiCuaDon">, trenChuyen: { chuaTen: number; ranh: number } = { chuaTen: 0, ranh: 0 }): number =>
  Math.max(ch.soNguoi - ch.nguoiCuaDon.length, trenChuyen.chuaTen - trenChuyen.ranh, 0);
/**
 * THIEU_TEN (I12, I19b): số tên còn thiếu = max(số người − hành khách hiện hành của đơn, suất chưa tên trên chuyến − khoá người rảnh, 0) — CHỈ khi chính sách
 * bắt danh sách (`requireManifest`). Lúc xếp không có vế thứ hai (`trenChuyen` mặc định 0/0): khi mọi khoá đã gắn thuộc đơn, vế hai không vượt vế một (bài
 * "MỘT luật hai nơi" ở dieu-phoi-kiem.test.ts so cảnh báo lúc xếp với lý do giữ của cổng xuất bến trên trạng thái sau khi xếp).
 */
export function lyDoThieuTen(ch: Pick<ChangVao, "orderCode" | "soNguoi" | "nguoiCuaDon">, requireManifest: boolean, trenChuyen: { chuaTen: number; ranh: number } = { chuaTen: 0, ranh: 0 }): LyDoGiu | null {
  const thieu = soTenThieu(ch, trenChuyen);
  return requireManifest && thieu > 0 ? lyDoGiu("THIEU_TEN", `${ch.orderCode} thiếu ${thieu} tên`) : null;
}

/** Kết quả kiểm lệnh xếp: như `KetQuaKiem` + `canhBao` (CHUA_CO_NOI_TRA, THIEU_TEN của chặng được xếp) — CHỈ nhắc, không vào `chan` / `canPhaLe`, không đổi `ok`. */
export type KetQuaXep = KetQuaKiem & { canhBao: LyDoGiu[]; /** ADR-0056 VK3-A: cam kết trên chuyến SAU lệnh (vi phạm kể cả khi đã phá lệ; khoá). */ camKet: KetQuaCamKet };

/**
 * Kiểm lệnh xếp: LC-09 (chặng mở của đơn đã xác nhận, chưa huỷ), I13 (có giờ), L-D1, LC-02, LC-10, LC-01 theo tên, mốc lúc xếp (đặt gấp qua). Cảnh báo
 * sớm: chặng chưa có nơi trả / chưa đủ tên (cùng hàm với cổng xuất bến) — lệnh vẫn chạy.
 */
export function kiemXep(v: KiemXepVao): KetQuaXep {
  const chan: LyDoGiu[] = [];
  const canPhaLe: LyDoGiu[] = [];
  const canhBao: LyDoGiu[] = [];
  if (!v.chinhSach) chan.push(lyDoGiu("CHINH_SACH_RONG"));
  const khiChay = v.lenh === "THEM_KHI_CHAY";
  if (v.chuyen.trangThai !== (khiChay ? "RUNNING" : "PLANNED")) chan.push(lyDoGiu("CHUYEN_KHONG_CON_LEN_KE_HOACH", v.chuyen.ma));
  // Xe đang chạy luôn ở trong mốc (ADR-0052 D5.1) — kể cả khi xuất bến sớm hơn giờ dự kiến.
  const chuyenMoc = khiChay ? { batDauMs: Math.min(v.chuyen.batDauMs, v.bayGioMs), batDauSomNhatMs: Math.min(v.chuyen.batDauSomNhatMs, v.bayGioMs) } : v.chuyen;
  const loaiMoc = v.lenh === "DOI_DEN" ? "DOI_DEN" : "XEP"; // THEM_KHI_CHAY xét mốc như dòng "Xếp"
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
    if (v.chinhSach && kiemMocXep(chuyenMoc, v.bayGioMs, v.chinhSach.minLeadMinutes, { loai: loaiMoc, datGap: c.datGap }).canPhaLe) {
      canPhaLe.push(lyDoGiu("MOC_TOI_THIEU", c.orderCode));
    }
    for (const x of [lyDoNoiTra(c), lyDoThieuTen(c, v.chinhSach?.requireManifest ?? false)]) if (x) canhBao.push(x);
  }
  if (v.chuyen.tai + moi > v.chuyen.soCho) chan.push(lyDoGiu("VUOT_SO_CHO", `${v.chuyen.tai + moi}/${v.chuyen.soCho}`));
  // ADR-0056 VK3-A: cam kết xe riêng / số chỗ trên chuyến SAU lệnh — còn vi phạm mà khoá khác khoá đã phá lệ → cần Quản trị phá lệ (CAM_KET).
  const sau = [...v.changTrenChuyen, ...v.them.filter((t) => t.soSuatMoi > 0).map((t) => t.chang)];
  const camKet = kiemCamKet({ xe: { id: v.xeId, soCho: v.chuyen.soCho }, chang: sau, khoaDaPhaLe: v.camKetPhaLeKhoa });
  const tc = tachLyDoCamKet(camKet); // ADR-0128 Q2: xe riêng → chặn cứng; số chỗ tối thiểu → cần phá lệ
  chan.push(...tc.chan);
  canPhaLe.push(...tc.canPhaLe);
  return { ...ketQua(khongTrung(chan), khongTrung(canPhaLe)), canhBao: khongTrung(canhBao), camKet };
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
  /**
   * ADR-0096 Đ2 (LC-20): mốc so với cửa sổ xuất bến. Thiếu → `xuatBenMs` (lệnh xuất bến thật). Màn đọc dự phóng `xuatBenMs = max(bây giờ, giờ bắt đầu)` —
   * luôn trong cửa sổ — nên màn chi tiết chuyến / cuốc tài xế truyền GIỜ THẬT ở đây để lý do hiện ngay khi đọc (Đ2.5).
   */
  cuaSoXetMs?: number;
}

/**
 * ADR-0096 Đ2 (LC-20) — lý do giữ khi `xetMs` sớm hơn giờ khởi hành − cửa sổ; null khi trong cửa sổ. Câu: giờ + ngày khởi hành, giờ + ngày được xuất bến
 * (ngày "dd/mm", có năm khi khác năm của `xetMs`), đường khắc phục. Cửa sổ thiếu / không phải số → giữ CHINH_SACH_RONG (không đoán con số).
 */
export function lyDoNgoaiCuaSo(batDauMs: number, cuaSoPhut: number | undefined, xetMs: number): LyDoGiu | null {
  if (typeof cuaSoPhut !== "number" || !Number.isFinite(cuaSoPhut)) return lyDoGiu("CHINH_SACH_RONG");
  const moMs = batDauMs - cuaSoPhut * PHUT;
  if (xetMs >= moMs) return null;
  const homNay = ngayVn(xetMs);
  const kh = msToVnLocal(batDauMs);
  const mo = msToVnLocal(moMs);
  return lyDoGiu(
    "NGOAI_CUA_SO_XUAT_BEN",
    `chuyến khởi hành lúc ${kh.time} ngày ${ngayNgan(kh.date, homNay)}, được cho xe chạy từ ${mo.time} ngày ${ngayNgan(mo.date, homNay)}. Xe thật sự chạy sớm thì văn phòng sửa giờ chuyến.`,
  );
}

/**
 * ADR-0096 Đ1.2 (LC-19) — lý do giữ TRA_TRUOC_DON, MỘT lý do mỗi đơn (theo thứ tự gặp suất), cho suất MỞ đang CHỜ LÊN có số điểm xuống ≤ số điểm lên.
 * Chi tiết: mã đơn (khi biết) + SỐ THỨ TỰ điểm (cột "#" của màn chuyến và số trên màn tài xế = `seq`) — không tên nơi, không khoá nơi.
 */
export function lyDoTraTruocDon(suat: readonly SuatVao[], diem: readonly DiemVao[], chang: readonly Pick<ChangVao, "legId" | "orderCode">[]): LyDoGiu[] {
  const cho = suat.filter((s) => s.mo && s.trangThai === "WAITING");
  const viTri = new Map(diem.map((d) => [d.id, d.seq]));
  const daoChiSo = suatTraTruocDon(diem, cho.map((s) => ({ diemLen: s.boardStopId, diemXuong: s.alightStopId })));
  const out: LyDoGiu[] = [];
  const daCo = new Set<string>();
  for (const i of daoChiSo) {
    const s = cho[i]!;
    const ma = chang.find((x) => x.legId === s.legId)?.orderCode ?? "";
    if (daCo.has(ma)) continue;
    daCo.add(ma);
    const viTriDiem = `điểm trả số ${viTri.get(s.alightStopId!)} đứng trước điểm đón số ${viTri.get(s.boardStopId!)}`;
    out.push(lyDoGiu("TRA_TRUOC_DON", ma ? `${ma} (${viTriDiem})` : viTriDiem));
  }
  return out;
}

/**
 * Cổng xuất bến — MỘT hàm cho máy chủ và màn hình (ADR-0049 D2). Kiểm sàn cứng (xe đang dùng, đúng một tài xế, GPLX còn hạn tới hết chuyến và hạng đủ
 * chở số chỗ), mọi điều kiện đang hiệu lực theo cỡ xe, đủ tên (khi chính sách bắt), đơn huỷ / chặng đóng, đủ / thiếu / thừa suất, nơi trả, giờ, sức chứa,
 * nghỉ đủ (từ giờ kết thúc thật), xe / tài xế không đang chạy chuyến khác, LC-13, hợp đồng (khoá 0). Trả bản chụp (khoá + hạng + hạn, không số) và danh
 * sách gắn tên còn thiếu (I19b). `dat` ⇔ không lý do nào.
 */
export function kiemXuatBen(v: KiemXuatBenVao): KetQuaXuatBen & { camKet: KetQuaCamKet } {
  const lyDo: LyDoGiu[] = [];
  const c = v.chuyen;
  const cs = v.chinhSach;
  const muc: MucChup[] = [];
  const mucRong = { vehicleDocumentId: null, personDocumentId: null, documentTypeCode: null, licenseClassCode: null, expiryDate: null, ruleId: null };
  if (!cs) lyDo.push(lyDoGiu("CHINH_SACH_RONG"));
  else if (cs.requireContract) lyDo.push(lyDoGiu("HOP_DONG"));
  // ADR-0096 Đ2 (LC-20): cửa sổ xuất bến của chính sách đang dùng — không phá lệ. Lớp CSDL: trigger vc_trip_departure_window (0084).
  if (cs) {
    const cuaSo = lyDoNgoaiCuaSo(c.batDauMs, cs.departureWindowMinutes, v.cuaSoXetMs ?? v.xuatBenMs);
    if (cuaSo) lyDo.push(cuaSo);
  }
  if (c.xe.trangThai !== "active") lyDo.push(lyDoGiu("XE_KHONG_DUNG", c.xe.bienSo));
  if (!c.taiXe) lyDo.push(lyDoGiu("CHUA_CO_TAI_XE", c.ma));
  else {
    const lai = kiemLai(c.taiXe, c.xe.soCho, c.ketThucMs, v.hangBang);
    if (lai.lyDo) lyDo.push(lai.lyDo);
    if (lai.gplx) muc.push({ ...mucRong, loai: "GPLX", personDocumentId: lai.gplx.rowId, documentTypeCode: LOAI_CO_DINH.GPLX, licenseClassCode: lai.gplx.classCode, expiryDate: lai.gplx.expiryDate });
    if (!khongCheo(c.xe, c.taiXe)) lyDo.push(lyDoGiu("CHEO_XE_TAI_XE"));
  }
  // ADR-0057 C5: chuyến xe thuê phải có nguồn giá (giá bảng đã chụp hoặc giá thoả thuận) — không ai phá lệ (lớp CSDL: trigger vc_trip_thieu_gia).
  if (c.thue && !c.coNguonGia) lyDo.push(lyDoGiu("THIEU_GIA", c.ma));
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
    const noiTra = lyDoNoiTra(ch);
    if (noiTra) lyDo.push(noiTra);
    if (ch.ngayDon === null || ch.gioDon === null) lyDo.push(lyDoGiu("CHUA_CO_GIO", ch.orderCode));
    // ADR-0050 VK1-B: nơi hẹn đổi sau khi xếp (chuyến CHƯA chạy) → giữ tới khi văn phòng "cập nhật điểm theo đơn". Một lý do mỗi chặng.
    // Đơn huỷ / chặng bỏ / đơn chưa xác nhận: lý do riêng ở trên đã đủ — không bắt văn phòng "cập nhật điểm" cho khách không còn đi (I38).
    if (c.trangThai === "PLANNED" && changXetTheoDon(ch)) {
      // R-P29 (chủ lần 16): suất mang khoá người không còn trong đơn → giữ tới khi văn phòng "Cập nhật khách theo đơn" (khuôn VK1-B). Một lý do mỗi chặng.
      if (suatKhachDaDoi({ legId, nguoiCuaDon: ch.nguoiCuaDon, suat: v.suat }).length > 0) lyDo.push(lyDoGiu("KHACH_DA_DOI", ch.orderCode));
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
    const thieuTen = lyDoThieuTen(ch, cs?.requireManifest ?? false, { chuaTen: chuaTen.length, ranh: ranh.length });
    if (thieuTen) lyDo.push(thieuTen);
  }
  // ADR-0096 Đ1.2 (LC-19): điểm đón của suất chờ lên đứng trước điểm trả — không phá lệ. Lớp CSDL: trigger vc_trip_departure_stop_order (0084).
  lyDo.push(...lyDoTraTruocDon(v.suat, v.diem, [...v.chang, ...(v.changNgoai ?? [])]));
  // ADR-0056 VK3-A: cam kết xe riêng / số chỗ — MỘT luật với lúc xếp; chặng = chặng có suất khách MỞ trên chuyến (`legIds`) có trong `v.chang` (chặng rơi
  // khỏi lịch đã có lý do giữ riêng ở trên). Còn vi phạm mà khoá khác khoá đã phá lệ → giữ (bắt cả cam kết bật SAU khi xếp — không cần lệnh chuyến nào chạy).
  const camKet = kiemCamKet({ xe: c.xe, chang: v.chang.filter((x) => legIds.includes(x.legId)), khoaDaPhaLe: c.camKetPhaLeKhoa });
  if (!camKet.daPhaLe) lyDo.push(...camKet.lyDo);
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
  return { dat: ds.length === 0, lyDo: ds, chup, ganTen, camKet };
}

// ---- Kết thúc (LC-16), "trong ngày chạy" -----------------------------------------------------------------------------------------------------------------
/** LC-16: kết thúc thường chỉ khi mọi suất mở đã có kết quả cuối và mọi điểm đã DONE / SKIPPED / MOVED; không thì gợi ý "Kết thúc gián đoạn". */
export function kiemKetThuc(v: { suat: SuatVao[]; diem: DiemVao[] }): { duoc: true } | { duoc: false; goiY: "KET_THUC_GIAN_DOAN"; conSuat: number; conDiem: number } {
  // C57: lõi ở ket-thuc-chuyen.ts — màn tài xế gọi CÙNG hàm (bài ket-thuc-chuyen.test.ts ép hai bên cho cùng kết quả).
  return xetKetThuc(v);
}

/**
 * "Trong ngày chạy" (ADR-0049 D3, câu thay ở ADR-0053 D7.2 — Q-L3-B a, đóng kẽ G3-9): hôm nay (ngày VN) là ngày chạy của chuyến, HOẶC chuyến đang chạy
 * VÀ ngày VN của giờ xuất bến (giờ xảy ra, `departed_ms`) ≥ ngày chạy — vế sau chỉ để phủ chuyến qua nửa đêm. Bấm Xuất bến tối hôm trước KHÔNG mở tên,
 * SĐT khách sớm. Ngoài khoảng đó DTO tài xế không có tên, SĐT. Một hàm cho mọi tài xế (vế "sau hạn Từ chối" của tài xế đối tác thêm ở lượt 3 — D7.2).
 */
export const trongNgayChay = (chuyen: { ngayChay: string; trangThai: TrangThaiChuyen; xuatBenMs: number | null }, homNay: string): boolean =>
  chuyen.ngayChay === homNay ||
  (chuyen.trangThai === "RUNNING" && chuyen.xuatBenMs !== null && vnToday(new Date(chuyen.xuatBenMs)) >= chuyen.ngayChay);

/**
 * KHUNG XEM KHÁCH (ADR-0053 D7.2 — MỘT hàm cho mọi tài xế; kế hoạch A4 T1). Trong khung thì DTO tài xế có họ tên, năm sinh, liên hệ, chuỗi đích chỉ đường
 * (ADR-0105) — và, với người có vế hạn, mã đơn (ADR-0053 :30, :70, :171; G-A4-7). `hanTuChoiMs`:
 *   - `undefined` = người gọi KHÔNG có vế hạn (tài xế công ty — ADR-0053 :64): chỉ vế "trong ngày chạy";
 *   - `null` = người có vế hạn mà THIẾU dòng hạn của cặp → NGOÀI khung (đóng mặc định — G-A4-2);
 *   - số = hạn Từ chối của cặp (tài xế, chuyến): trong khung khi `bayGioMs > hạn` (biên NGHIÊM — G-A4-1: khoảng Từ chối được `≤ hạn` và khoảng thấy khách rời
 *     nhau) VÀ trong ngày chạy.
 * Ngoài `src/shared/` chỉ gọi qua `khungCuaNguoiGoi` (van-chuyen) — bài src/modules/van-chuyen/mot-ham-khung.test.ts.
 */
export function trongKhungXemKhach(
  chuyen: { ngayChay: string; trangThai: TrangThaiChuyen; xuatBenMs: number | null }, hanTuChoiMs: number | null | undefined, bayGioMs: number,
): boolean {
  if (hanTuChoiMs === null) return false;
  if (hanTuChoiMs !== undefined && !(bayGioMs > hanTuChoiMs)) return false;
  return trongNgayChay(chuyen, vnToday(new Date(bayGioMs)));
}
/**
 * Lúc khung xem khách BẮT ĐẦU mở khi chuyến chưa xuất bến sớm (dòng "Thấy danh sách khách từ …" — kế hoạch A4 G-A4-17 `thayKhachTu`): 00:00 ngày chạy (giờ VN),
 * hoặc ngay sau hạn Từ chối nếu muộn hơn. `null` hạn → như không vế hạn (màn chỉ hiện khi máy chủ đã đọc được hạn).
 */
export function mocMoKhung(chuyen: { ngayChay: string }, hanTuChoiMs: number | null | undefined): number {
  const dauNgay = Date.parse(`${chuyen.ngayChay}T00:00:00+07:00`);
  return typeof hanTuChoiMs === "number" ? Math.max(dauNgay, hanTuChoiMs + 1) : dauNgay;
}
