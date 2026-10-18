// Luật thuần HIỂN THỊ của hai màn V13 và trang điều kiện xuất bến / hạng bằng (ADR-0049 D2; ADR-0050 VK1-A, VK1-C; bản vẽ
// docs/design/van-chuyen-dieu-phoi/project/08 Chinh sach dieu phoi.dc.html). Không I/O, không DOM; import kèm đuôi .ts. Test: chinh-sach-hien-thi.test.ts.
// - Chính sách lưu theo PHÚT (máy chủ); bản vẽ ghi hai ô theo GIỜ (mốc tối thiểu, cảnh báo sát mốc) → đổi ở đây, câu báo lỗi theo đơn vị của ô. Máy chủ vẫn là
//   nơi quyết (kiemChinhSachMoi); thân gửi đi đúng tám khoá của DispatchPolicyCreateRequest (hai con số giờ lái ADR-0055 VK2-B, cửa sổ xuất bến ADR-0096 Đ2 — ô theo giờ) — KHÔNG ngày hiệu lực (I28: máy chủ đặt = lúc lưu), KHÔNG hợp đồng.
// - Lý do: nhóm và nhãn nhóm lấy từ `NHAN_NHOM_LY_DO` (một nguồn với nhật ký); mã lý do mới SINH từ nhãn (màn hình không lộ mã — bản vẽ 8d chỉ có ô "Lý do mới").
import type { DepartureRuleCreateRequest, DepartureRuleDto, DispatchPolicyCreateRequest, DispatchPolicyDto, LicenseCapacityCreateRequest, TripReasonDto } from "./contracts.ts";
import { NHAN_NHOM_LY_DO, NHOM_LY_DO, type NhomLyDo } from "./dieu-phoi-kieu.ts";
import { maskLongDigits } from "./text-guards.ts";
import { msToVnLocal, ngayNgan } from "./vn-date.ts";

// ---- thời lượng ----------------------------------------------------------------------------------------------------------------------------------------------
/** Số phút → lời thường: "6 giờ", "1 giờ 30 phút", "30 phút". */
export function nhanThoiLuong(phut: number): string {
  if (phut < 60) return `${phut} phút`;
  const gio = Math.floor(phut / 60);
  const du = phut % 60;
  return du === 0 ? `${gio} giờ` : `${gio} giờ ${du} phút`;
}
/** Giá trị ô "(giờ)" từ số phút: tròn giờ → số nguyên; lẻ → thập phân (dấu chấm — khuôn của ô number) đủ chữ số để đổi ngược ra đúng số phút. */
export function gioTuPhut(phut: number): string {
  return String(Number((phut / 60).toFixed(4)));
}

// ---- form chính sách -----------------------------------------------------------------------------------------------------------------------------------------
export interface FormChinhSach {
  mocGio: string;
  satMocGio: string;
  nghiPhut: string;
  khaiLuiPhut: string;
  /** ADR-0055 VK2-B: giờ lái tối đa một ngày — ô theo GIỜ (K2), máy chủ lưu phút. */
  gioLaiGio: string;
  /** ADR-0055 VK2-B: nhắc nghỉ khi chuyến dài hơn — ô theo GIỜ. */
  chuyenDaiGio: string;
  /** ADR-0096 Đ2.3: cửa sổ xuất bến — ô theo GIỜ (1–48), máy chủ lưu phút. Không có giá trị mặc định trong mã: điền từ bản đang dùng. */
  cuaSoGio: string;
  /** ADR-0053 D8.1 (0092): hạn Từ chối của tài xế nhà xe — ô theo GIỜ (1–48), máy chủ lưu phút. */
  hanTuChoiGio: string;
  /** Lời chủ 6.3 (0092): SĐT văn phòng cho nút "Gọi văn phòng" của tài xế — để trống = không có. */
  sdtVanPhong: string;
  duDanhSach: boolean;
  /** ADR-0111 Đ3 (c): phút chờ tài xế xe nhận trả lời đề nghị chuyển khách (1–120). Điền từ bản đang dùng. */
  choNhanPhut: string;
  /** ADR-0111 Đ3 (c): tự đồng ý chuyển khách khi đạt mọi điều kiện (công tắc an toàn). */
  tuDongY: boolean;
}
export type TruongChinhSach = "mocGio" | "satMocGio" | "nghiPhut" | "khaiLuiPhut" | "gioLaiGio" | "chuyenDaiGio" | "cuaSoGio" | "hanTuChoiGio" | "sdtVanPhong" | "choNhanPhut";
export type KetQuaFormChinhSach = { ok: true; value: DispatchPolicyCreateRequest } | { ok: false; loi: Partial<Record<TruongChinhSach, string>> };

/** Chuỗi ô giờ → số phút (chấp nhận "1,5" hay "1.5"); không phải số → null. */
function phutTuO(v: string): number | null {
  const s = v.trim().replace(",", ".");
  if (!/^\d+(\.\d+)?$/.test(s)) return null;
  return Math.round(Number(s) * 60);
}
const soNguyenO = (v: string): number | null => (/^\d+$/.test(v.trim()) ? Number(v.trim()) : null);

/** Đọc form (bốn ô + công tắc) → thân POST, hoặc câu lỗi lời thường cho từng ô sai (cùng lúc, không dừng ở ô đầu). Biên khớp `kiemChinhSachMoi`. */
export function docFormChinhSach(f: FormChinhSach): KetQuaFormChinhSach {
  const loi: Partial<Record<TruongChinhSach, string>> = {};
  const moc = phutTuO(f.mocGio);
  if (f.mocGio.trim() === "") loi.mocGio = "Nhập hạn chốt trước giờ đón (giờ).";
  else if (moc === null || moc < 1 || moc > 2880) loi.mocGio = "Hạn chốt trước giờ đón là số giờ lớn hơn 0, tối đa 48 — không tắt được; muốn nới thì giảm con số.";
  const sat = phutTuO(f.satMocGio);
  if (f.satMocGio.trim() === "") loi.satMocGio = "Nhập cảnh báo sắp tới hạn chốt (giờ).";
  else if (sat === null || sat > 1440) loi.satMocGio = "Cảnh báo sắp tới hạn chốt là số từ 0 đến 24 giờ.";
  const nghi = soNguyenO(f.nghiPhut);
  if (f.nghiPhut.trim() === "") loi.nghiPhut = "Nhập khoảng nghỉ (phút).";
  else if (nghi === null || nghi > 480) loi.nghiPhut = "Khoảng nghỉ là số phút nguyên từ 0 đến 480.";
  const lui = soNguyenO(f.khaiLuiPhut);
  if (f.khaiLuiPhut.trim() === "") loi.khaiLuiPhut = "Nhập số phút khai lùi tối đa.";
  else if (lui === null || lui < 1 || lui > 1440) loi.khaiLuiPhut = "Khai lùi tối đa là số phút nguyên từ 1 đến 1440.";
  const gioLai = phutTuO(f.gioLaiGio);
  if (f.gioLaiGio.trim() === "") loi.gioLaiGio = "Nhập giờ lái tối đa một ngày (giờ).";
  else if (gioLai === null || gioLai < 60 || gioLai > 1440) loi.gioLaiGio = "Giờ lái tối đa một ngày là số giờ từ 1 đến 24.";
  const dai = phutTuO(f.chuyenDaiGio);
  if (f.chuyenDaiGio.trim() === "") loi.chuyenDaiGio = "Nhập số giờ chuyến dài cần nhắc nghỉ.";
  else if (dai === null || dai < 30 || dai > 720) loi.chuyenDaiGio = "Nhắc nghỉ khi chuyến dài hơn là số giờ từ 0,5 đến 12.";
  const cuaSo = phutTuO(f.cuaSoGio);
  if (f.cuaSoGio.trim() === "") loi.cuaSoGio = "Nhập cửa sổ cho xe chạy (giờ).";
  else if (cuaSo === null || cuaSo < 60 || cuaSo > 2880) loi.cuaSoGio = "Cửa sổ cho xe chạy là số giờ từ 1 đến 48.";
  const hanTc = phutTuO(f.hanTuChoiGio);
  if (f.hanTuChoiGio.trim() === "") loi.hanTuChoiGio = "Nhập hạn từ chối chuyến (giờ).";
  else if (hanTc === null || hanTc < 60 || hanTc > 2880) loi.hanTuChoiGio = "Hạn từ chối chuyến là số giờ từ 1 đến 48.";
  const sdt = f.sdtVanPhong.replace(/[\s.\-()]/g, "");
  if (sdt !== "" && !/^(0|\+?84)\d{9}$/.test(sdt)) loi.sdtVanPhong = "Số điện thoại văn phòng gồm 10 chữ số, bắt đầu bằng 0 — hoặc để trống.";
  const cho = soNguyenO(f.choNhanPhut);
  if (f.choNhanPhut.trim() === "") loi.choNhanPhut = "Nhập số phút chờ tài xế xe nhận trả lời.";
  else if (cho === null || cho < 1 || cho > 120) loi.choNhanPhut = "Thời gian chờ tài xế xe nhận trả lời là số phút nguyên từ 1 đến 120.";
  if (Object.keys(loi).length > 0 || moc === null || sat === null || nghi === null || lui === null || gioLai === null || dai === null || cuaSo === null || hanTc === null || cho === null) {
    return { ok: false, loi };
  }
  return {
    ok: true,
    value: {
      minLeadMinutes: moc, warnLeadMinutes: sat, restMinutes: nghi, requireManifest: f.duDanhSach, proxyBackdateMaxMinutes: lui, dutyDayMaxMinutes: gioLai, tripNoBreakMaxMinutes: dai,
      departureWindowMinutes: cuaSo, refuseLeadMinutes: hanTc, officePhone: f.sdtVanPhong.trim() === "" ? null : f.sdtVanPhong.trim(), acceptWaitMinutes: cho, autoConfirmTransfer: f.tuDongY,
    },
  };
}

/** Điền form từ bản đang dùng; chưa có bản nào → ô trống (bật "phải đủ danh sách khách" như bản gieo). */
export function formTuChinhSach(p: DispatchPolicyDto | null): FormChinhSach {
  if (!p) return { mocGio: "", satMocGio: "", nghiPhut: "", khaiLuiPhut: "", gioLaiGio: "", chuyenDaiGio: "", cuaSoGio: "", hanTuChoiGio: "", sdtVanPhong: "", duDanhSach: true, choNhanPhut: "", tuDongY: true };
  return {
    mocGio: gioTuPhut(p.minLeadMinutes), satMocGio: gioTuPhut(p.warnLeadMinutes), nghiPhut: String(p.restMinutes), khaiLuiPhut: String(p.proxyBackdateMaxMinutes),
    gioLaiGio: gioTuPhut(p.dutyDayMaxMinutes), chuyenDaiGio: gioTuPhut(p.tripNoBreakMaxMinutes), cuaSoGio: gioTuPhut(p.departureWindowMinutes), duDanhSach: p.requireManifest,
    hanTuChoiGio: gioTuPhut(p.refuseLeadMinutes), sdtVanPhong: p.officePhone ?? "", choNhanPhut: String(p.acceptWaitMinutes), tuDongY: p.autoConfirmTransfer,
  };
}

type SoChinhSach = Pick<
  DispatchPolicyDto, "minLeadMinutes" | "warnLeadMinutes" | "restMinutes" | "requireManifest" | "proxyBackdateMaxMinutes" | "dutyDayMaxMinutes" | "tripNoBreakMaxMinutes" | "departureWindowMinutes" | "refuseLeadMinutes"
  | "acceptWaitMinutes" | "autoConfirmTransfer"
>;
/** Một dòng tóm tắt bản chính sách (lịch sử bản — bản vẽ 8a "Mốc 6 giờ · sát mốc 2 giờ · nghỉ 30 phút"; thêm khai lùi — thành phần F). */
export function tomTatChinhSach(p: SoChinhSach): string {
  return [
    `Hạn chốt ${nhanThoiLuong(p.minLeadMinutes)}`,
    `cảnh báo sắp tới hạn chốt ${nhanThoiLuong(p.warnLeadMinutes)}`,
    `nghỉ ${p.restMinutes} phút`,
    `khai lùi ${p.proxyBackdateMaxMinutes} phút`,
    `lái tối đa ${nhanThoiLuong(p.dutyDayMaxMinutes)}/ngày`,
    `nhắc nghỉ chuyến trên ${nhanThoiLuong(p.tripNoBreakMaxMinutes)}`,
    `cho xe chạy sớm nhất ${nhanThoiLuong(p.departureWindowMinutes)} trước giờ khởi hành`,
    `từ chối chuyến trước ${nhanThoiLuong(p.refuseLeadMinutes)}`,
    p.requireManifest ? "phải đủ danh sách khách" : null,
    `chờ nhận chuyển khách ${p.acceptWaitMinutes} phút`,
    p.autoConfirmTransfer ? "tự đồng ý chuyển khách" : "chuyển khách luôn chờ Quản trị",
  ].filter((x) => x !== null).join(" · ");
}

/**
 * Ô đã đổi so với bản đang dùng. Không đổi gì → mảng rỗng (màn không lưu bản mới giống hệt bản cũ). Dòng "Đang soạn" của bản vẽ 8a dùng được hàm này nhưng
 * CHỜ CHỦ (bản đối chiếu mục 2.14, câu Q3) — chưa dựng.
 */
export function thayDoiChinhSach(cu: DispatchPolicyDto | null, moi: DispatchPolicyCreateRequest): string[] {
  if (!cu) return ["Bản đầu tiên"];
  const out: string[] = [];
  if (cu.minLeadMinutes !== moi.minLeadMinutes) out.push(`Hạn chốt trước giờ đón ${nhanThoiLuong(cu.minLeadMinutes)} → ${nhanThoiLuong(moi.minLeadMinutes)}`);
  if (cu.warnLeadMinutes !== moi.warnLeadMinutes) out.push(`Cảnh báo sắp tới hạn chốt ${nhanThoiLuong(cu.warnLeadMinutes)} → ${nhanThoiLuong(moi.warnLeadMinutes)}`);
  if (cu.restMinutes !== moi.restMinutes) out.push(`Khoảng nghỉ ${cu.restMinutes} → ${moi.restMinutes} phút`);
  if (cu.proxyBackdateMaxMinutes !== moi.proxyBackdateMaxMinutes) out.push(`Khai lùi tối đa ${cu.proxyBackdateMaxMinutes} → ${moi.proxyBackdateMaxMinutes} phút`);
  if (cu.dutyDayMaxMinutes !== moi.dutyDayMaxMinutes) out.push(`Giờ lái tối đa một ngày ${nhanThoiLuong(cu.dutyDayMaxMinutes)} → ${nhanThoiLuong(moi.dutyDayMaxMinutes)}`);
  if (cu.tripNoBreakMaxMinutes !== moi.tripNoBreakMaxMinutes) out.push(`Nhắc nghỉ chuyến trên ${nhanThoiLuong(cu.tripNoBreakMaxMinutes)} → ${nhanThoiLuong(moi.tripNoBreakMaxMinutes)}`);
  if (cu.departureWindowMinutes !== moi.departureWindowMinutes) out.push(`Cửa sổ cho xe chạy ${nhanThoiLuong(cu.departureWindowMinutes)} → ${nhanThoiLuong(moi.departureWindowMinutes)}`);
  if (cu.refuseLeadMinutes !== moi.refuseLeadMinutes) out.push(`Hạn từ chối chuyến ${nhanThoiLuong(cu.refuseLeadMinutes)} → ${nhanThoiLuong(moi.refuseLeadMinutes)}`);
  if ((cu.officePhone ?? "") !== (moi.officePhone ?? "")) out.push(moi.officePhone ? "Đổi số điện thoại văn phòng" : "Bỏ số điện thoại văn phòng");
  if (cu.requireManifest !== moi.requireManifest) out.push(moi.requireManifest ? "Bắt đủ danh sách khách" : "Không bắt đủ danh sách khách");
  if (cu.acceptWaitMinutes !== moi.acceptWaitMinutes) out.push(`Chờ tài xế xe nhận trả lời ${cu.acceptWaitMinutes} → ${moi.acceptWaitMinutes} phút`);
  if (cu.autoConfirmTransfer !== moi.autoConfirmTransfer) out.push(moi.autoConfirmTransfer ? "Tự đồng ý chuyển khách" : "Chuyển khách luôn chờ Quản trị duyệt");
  return out;
}

// ---- lịch sử bản ---------------------------------------------------------------------------------------------------------------------------------------------
export interface DongLichSu {
  id: string;
  /** "Bản N" — đánh số từ bản cũ nhất (bản vẽ 8a). */
  ten: string;
  trangThai: "Đang dùng" | "Hết hiệu lực" | "Chưa hiệu lực";
  tone: "unit" | "muted" | "warn";
  hieuLuc: string;
  tomTat: string;
  /** R-P23: "<tên> lưu dd/mm HH:MM" (bản vẽ 8a "Lưu Tuấn Vũ lưu 24/09 16:20"); null = DTO không có người lưu (bản gieo) → màn không hiện dòng. */
  nguoiLuu: string | null;
}
/** Mốc ISO → "dd/mm HH:MM" giờ VN (lúc lưu một bản); năm khi khác năm của bản hiện hành `thamChieu` (Kiểu D — `ngayNgan`). */
function luuLuc(iso: string, thamChieu: string | null): string {
  const { date, time } = msToVnLocal(Date.parse(iso));
  return `${ngayNgan(date, thamChieu)} ${time}`;
}
/** Mốc ISO → ngày dân sự VN tách "dd/mm" + năm (nhãn khoảng hiệu lực tự ghép năm). */
function ngayVnTuIso(iso: string): { dm: string; y: string } {
  const { date } = msToVnLocal(Date.parse(iso));
  return { dm: ngayNgan(date, date), y: date.slice(0, 4) };
}
/**
 * Lịch sử bản chính sách (máy chủ trả mới trước). Khoảng hiệu lực: bản cũ kết thúc đúng lúc bản kế tiếp bắt đầu (máy chủ đặt hiệu lực = lúc lưu) → ghi
 * "Hiệu lực <ngày bắt đầu> – <ngày bản sau bắt đầu>" theo ngày VN. "Ai lưu" (R-P23): tên + lúc lưu (= lúc hiệu lực); tên đi qua `maskLongDigits`.
 */
export function dongLichSuChinhSach(history: readonly DispatchPolicyDto[]): DongLichSu[] {
  const hienHanh = history.find((p) => p.current) ?? null;
  return history.map((p, i) => {
    const tu = ngayVnTuIso(p.validFrom);
    const sau = i > 0 ? history[i - 1]! : null;
    let hieuLuc: string;
    if (!sau || p.current) hieuLuc = `Hiệu lực từ ${tu.dm}/${tu.y}`;
    else {
      const den = ngayVnTuIso(sau.validFrom);
      hieuLuc = tu.y === den.y ? `Hiệu lực ${tu.dm} – ${den.dm}/${den.y}` : `Hiệu lực ${tu.dm}/${tu.y} – ${den.dm}/${den.y}`;
    }
    const chuaToi = !p.current && hienHanh !== null && p.validFrom > hienHanh.validFrom;
    return {
      id: p.id,
      ten: `Bản ${history.length - i}`,
      trangThai: p.current ? "Đang dùng" : chuaToi ? "Chưa hiệu lực" : "Hết hiệu lực",
      tone: p.current ? "unit" : chuaToi ? "warn" : "muted",
      hieuLuc,
      tomTat: tomTatChinhSach(p),
      nguoiLuu: p.nguoiLuu ? `${maskLongDigits(p.nguoiLuu)} lưu ${luuLuc(p.validFrom, hienHanh ? msToVnLocal(Date.parse(hienHanh.validFrom)).date : null)}` : null,
    };
  });
}

// ---- điều kiện xuất bến --------------------------------------------------------------------------------------------------------------------------------------
/** "Kiểm định — mọi xe", "Phù hiệu — xe chở từ 9 người", "<giấy tờ> của tài xế — …" (bản vẽ 8a chip "Kiểm định — mọi xe"). Không bao giờ lộ mã loại. */
export function nhanDieuKien(r: DepartureRuleDto, tenLoaiNguoi?: (code: string) => string | undefined): string {
  const co = r.minCapacity <= 1 ? "mọi xe" : `xe chở từ ${r.minCapacity} người`;
  if (r.subject === "VEHICLE") return `${r.documentTypeName ?? "Giấy tờ khác"} — ${co}`;
  return `${r.documentTypeName ?? tenLoaiNguoi?.(r.documentTypeCode) ?? "Giấy tờ khác"} của tài xế — ${co}`;
}

/** Form thêm điều kiện (trang điều kiện xuất bến — khuôn sẵn): cỡ xe 1–100 người (1 = mọi xe), đối tượng, loại giấy tờ. Khớp `kiemDieuKienMoi`. */
export function docDieuKienMoi(f: { coXe: string; doiTuong: "VEHICLE" | "DRIVER"; loai: string }): { ok: true; value: DepartureRuleCreateRequest } | { ok: false; loi: string } {
  const co = soNguyenO(f.coXe);
  if (co === null || co < 1 || co > 100) return { ok: false, loi: "Cỡ xe là số người nguyên từ 1 đến 100 (1 = mọi xe)." };
  if (!f.loai) return { ok: false, loi: "Chọn loại giấy tờ bắt buộc." };
  return { ok: true, value: { minCapacity: co, subject: f.doiTuong, documentTypeCode: f.loai } };
}

// ---- bảng hạng bằng → số khách -------------------------------------------------------------------------------------------------------------------------------
/** Lời thường cho một hạng: có số / không giới hạn (null) / chưa có dòng (undefined — máy chặn tài xế hạng này, không đoán). */
export function nhanSoKhachHang(max: number | null | undefined): string {
  if (max === undefined) return "Chưa đặt — tài xế hạng này chưa được xếp chuyến";
  return max === null ? "Không giới hạn" : `Tối đa ${max} khách`;
}
/** Ô số khách tối đa của một hạng: trống = không giới hạn; số nguyên 1–100. Khớp `kiemHangBangMoi`. */
export function docSoKhachHang(classCode: string, v: string): { ok: true; value: LicenseCapacityCreateRequest } | { ok: false; loi: string } {
  if (v.trim() === "") return { ok: true, value: { classCode, maxPassengers: null } };
  const n = soNguyenO(v);
  if (n === null || n < 1 || n > 100) return { ok: false, loi: "Số khách tối đa là số nguyên từ 1 đến 100, hoặc để trống = không giới hạn." };
  return { ok: true, value: { classCode, maxPassengers: n } };
}

// ---- danh mục lý do ------------------------------------------------------------------------------------------------------------------------------------------
/** Nhóm lý do lượt 1, theo thứ tự bản vẽ 8c (Phá lệ, Huỷ chuyến, Kết thúc gián đoạn) rồi hai nhóm lượt 1 bản vẽ không vẽ. */
export const NHOM_LY_DO_HIEN: readonly NhomLyDo[] = ["PHA_LE", "HUY_CHUYEN", "KET_THUC_GIAN_DOAN", "BO_QUA_DIEM", "DOI_GIO_XE", "BAO_HUY_DIEM", "TU_CHOI_NHAN"]; // + BAO_HUY_DIEM: ADR-0052 D5.2 (Đợt 5); + TU_CHOI_NHAN: ADR-0111 (A5 — Không nhận / Bác đề nghị chuyển khách)
export interface NhomHien {
  nhom: NhomLyDo;
  tieuDe: string;
  lyDo: TripReasonDto[];
}
/** Gom lý do theo nhóm để hiện: năm nhóm lượt 1 luôn có (kể cả rỗng — để thêm được); nhóm khác chỉ hiện khi có dữ liệu. Thứ tự lý do giữ như máy chủ trả. */
export function nhomLyDoHien(reasons: readonly TripReasonDto[]): NhomHien[] {
  const them = NHOM_LY_DO.filter((g) => !NHOM_LY_DO_HIEN.includes(g) && reasons.some((r) => r.group === g));
  return [...NHOM_LY_DO_HIEN, ...them].map((nhom) => ({ nhom, tieuDe: NHAN_NHOM_LY_DO[nhom], lyDo: reasons.filter((r) => r.group === nhom) }));
}

/** Tiền tố mã theo nhóm — khớp mã gieo của migration 0041 (PHA_LE_…, HUY_…, GIAN_DOAN_…, DOI_GIO_XE_…, BO_QUA_…). */
const TIEN_TO: Readonly<Record<NhomLyDo, string>> = {
  PHA_LE: "PHA_LE", HUY_CHUYEN: "HUY", KET_THUC_GIAN_DOAN: "GIAN_DOAN", DOI_GIO_XE: "DOI_GIO_XE", BO_QUA_DIEM: "BO_QUA", BAO_HUY_DIEM: "BAO_HUY", TU_CHOI_NHAN: "TU_CHOI", BAN_XE: "BAN_XE",
  CHI_PHI_XE: "CPX", // ADR-0057 T2 (0073): lý do chi phí xe thuê — mã gieo CPX_…
  DIEU_CHINH: "DIEU_CHINH", // ADR-0097 Đ2.5 (0085): mã gieo DIEU_CHINH_…
  TU_CHOI_CHUYEN: "TCC", // ADR-0053 D8.1 (0092): mã gieo TCC_… — khác tiền tố "TU_CHOI" của TU_CHOI_NHAN (G-A4-11)
  BAN_TAI_XE: "BTX", // ADR-0053 D9.1 (0092): mã gieo BTX_… — khác "BAN_XE"
};
const MA_TOI_DA = 40;
/**
 * Mã lý do mới SINH từ nhãn (màn hình không có ô mã — bản vẽ 8d): tiền tố nhóm + nhãn bỏ dấu (đ → D), chữ HOA, ký tự khác → "_"; ≤ 40 ký tự. `lan` > 1
 * (máy chủ báo mã đã có — 409 `code_taken`) → thêm hậu tố "_<lan>". Luôn khớp `MA_LY_DO_RE` của máy chủ.
 */
export function maLyDoMoi(nhom: NhomLyDo, nhan: string, lan = 1): string {
  const khongDau = nhan.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D");
  const slug = khongDau.toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "LY_DO";
  const hauTo = lan > 1 ? `_${lan}` : "";
  const than = `${TIEN_TO[nhom]}_${slug}`.slice(0, MA_TOI_DA - hauTo.length).replace(/_+$/, "");
  return `${than}${hauTo}`;
}
/** Thứ tự cho lý do mới: sau lý do thường cuối cùng, trước "Khác" (thứ tự 99 ở mã gieo); nhóm rỗng → 1. */
export function thuTuLyDoMoi(trongNhom: readonly { sortOrder: number }[]): number {
  const thuong = trongNhom.map((r) => r.sortOrder).filter((n) => n < 99);
  return thuong.length === 0 ? 1 : Math.min(98, Math.max(...thuong) + 1);
}

/**
 * Nút bật / tắt của một lý do (R-P22, điều phối trả lời Q-B-3): lý do HỆ THỐNG đang dùng (`heThong` — máy tự ghi, vd "Không còn khách ở điểm") KHÔNG có nút
 * "Ngưng", chỉ một ghi chú; lý do đang ngưng luôn "Dùng lại" được. Máy chủ vẫn chặn (409 `ly_do_he_thong`).
 */
export function nutBatTatLyDo(l: { active: boolean; heThong: boolean }): { nut: "Ngưng" | "Dùng lại" | null; ghiChu: string | null } {
  if (!l.active) return { nut: "Dùng lại", ghiChu: null };
  return l.heThong ? { nut: null, ghiChu: "Hệ thống tự dùng — không ngưng được" } : { nut: "Ngưng", ghiChu: null };
}
