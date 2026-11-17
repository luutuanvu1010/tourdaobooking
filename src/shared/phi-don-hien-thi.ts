// Chữ hiển thị của màn «Phí đưa đón» (kế hoạch Phí đưa đón, Đợt B Task 8) và của phí đưa đón trên đơn / biên nhận (Đợt C, Task 6). Thuần: không I/O, KHÔNG tính tiền
// (mọi số tiền do máy chủ trả). Không hàm nào để lọt mã thô (PER_PAX, OUT, NGOAI_VUNG…) ra chữ người dùng; mã không có tên thì hiện mã kèm lời giải («đã khoá»).
import { ngayDayDu } from "./vn-date.ts";
import type { CanhBaoPhiDonDto, MucPhiDonDto, PhiDuaDonCuaDonDto, ThuTraPhiDonResponse } from "./contracts.ts";

export interface TenPhiDon {
  vung: ReadonlyMap<string, string>;
  cap: ReadonlyMap<string, string>;
  nhom: ReadonlyMap<string, string>;
  dichVu: ReadonlyMap<string, string>;
  /** Tuỳ chọn: mức theo mã, để «Thử tra» mô tả mức thua. */
  muc?: ReadonlyMap<string, MucPhiDonDto>;
}

/** Chữ của mức / dòng phí 0 đồng được đặt rõ (chủ 15/11, câu 3). MỘT hằng cho màn Phí đưa đón, trang đơn và biên nhận. */
export const CHU_MIEN_PHI = "Miễn phí";
/** Chữ của phí trên đơn nháp, chưa chụp lúc xác nhận (chủ 15/11, câu 3). */
export const CHU_DU_KIEN = "dự kiến";
/** Tên màn và tên khối phí trên trang đơn, biên nhận, phiếu công nợ (chủ 14/11). */
export const TEN_PHI_DUA_DON = "Phí đưa đón";
export const CHU_MOI_CAP = "Mọi cấp";
export const CHU_THIEU_MUC = "Bảng chưa có mức cho tình huống này. Bảng chỉ để tham khảo: phí trên đơn do văn phòng chọn ở từng lượt đón.";
export const CHU_CHUA_AP = "Phí đưa đón chưa áp vào ngày này.";
export const CHU_XUNG_DOT = "Có hai mức cùng độ cụ thể nhưng khác số tiền, nên chưa chọn được mức nào. Sửa một trong hai mức rồi tra lại.";

/** 1500000 → "1.500.000" (số nguyên đồng, ngăn nghìn bằng dấu chấm; không phụ thuộc ICU). */
export const soTien = (n: number): string => String(Math.trunc(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");

/** Đọc số tiền người gõ: chỉ chữ số, cho phép dấu chấm ngăn nghìn; sai thì null. Không tính toán gì thêm. */
export function soTienDocDuoc(s: string): number | null {
  const t = s.trim().replace(/\./g, "");
  if (!/^\d{1,15}$/.test(t)) return null;
  const n = Number(t);
  return Number.isSafeInteger(n) ? n : null;
}

const tenCoMa = (ma: string, m: ReadonlyMap<string, string>, hau: string): string => m.get(ma) ?? `${ma} (${hau})`;
export const tenCap = (ma: string, m: ReadonlyMap<string, string>): string => tenCoMa(ma, m, "đã khoá");
const tenVung = (ma: string, m: ReadonlyMap<string, string>): string => tenCoMa(ma, m, "đã ngưng");
const tenDichVu = (ma: string, m: ReadonlyMap<string, string>): string => tenCoMa(ma, m, "đã ẩn");
const tenNhom = (ma: string, m: ReadonlyMap<string, string>): string => `Nhóm ${m.get(ma) ?? `${ma} (đã ẩn)`}`;
const chieuChu = (c: "OUT" | "RETURN"): string => (c === "OUT" ? "Chiều đi" : "Chiều về");

export function cauTien(m: Pick<MucPhiDonDto, "kieu" | "tien">): string {
  if (m.tien === 0) return CHU_MIEN_PHI;
  return `${soTien(m.tien)} đ/${m.kieu === "PER_PAX" ? "khách" : "chuyến"}`;
}

export function cauDieuKien(m: MucPhiDonDto, ten: TenPhiDon): string {
  const d = m.dieuKien;
  const them: string[] = [];
  if (d.cap !== null) them.push(tenCap(d.cap, ten.cap));
  if (d.dichVu !== null) them.push(tenDichVu(d.dichVu, ten.dichVu));
  if (d.nhom !== null) them.push(tenNhom(d.nhom, ten.nhom));
  if (d.xeRieng) them.push("Xe riêng");
  if (d.chieu !== null) them.push(chieuChu(d.chieu));
  if (them.length === 0) them.push(CHU_MOI_CAP);
  return [tenVung(d.vung, ten.vung), ...them].join(" · ");
}

export function cauKhoangNgay(tuNgay: string, denNgay: string | null): string {
  return denNgay === null ? `Từ ${ngayDayDu(tuNgay)}` : `${ngayDayDu(tuNgay)} – ${ngayDayDu(denNgay)}`;
}

/** Câu cảnh báo cấp trả cao hơn bên không có cấp (lời chủ chọn 14/11). Chiều không có trong câu; `xe riêng` chỉ thêm khi đúng, để hai chặng khác loại không bị gộp nhầm. */
export function cauCanhBao(c: CanhBaoPhiDonDto, ten: TenPhiDon): string {
  const noi = [tenVung(c.vung, ten.vung)];
  if (c.dichVu !== null) noi.push(tenDichVu(c.dichVu, ten.dichVu));
  else if (c.nhom !== null) noi.push(`nhóm ${ten.nhom.get(c.nhom) ?? `${c.nhom} (đã ẩn)`}`);
  if (c.xeRieng) noi.push("xe riêng");
  return `${tenCap(c.cap, ten.cap)} đang trả ${soTien(c.tienCap)} đ, cao hơn mức không có cấp ${soTien(c.tienKhongCap)} đ ở ${noi.join(", ")}.`;
}

/**
 * Các mục chỉ khác chiều mà cùng nội dung gộp thành một dòng. Hai chiều khác SỐ TIỀN thì giữ hai dòng và thêm «, chiều đi» / «, chiều về» vào cuối
 * câu (bỏ dấu chấm cuối), để người đọc phân biệt được dòng nào là của chiều nào.
 */
export function cauCanhBaoGop(ds: readonly CanhBaoPhiDonDto[], ten: TenPhiDon): string[] {
  const khoaChang = (c: CanhBaoPhiDonDto): string => [c.cap, c.vung, c.xeRieng, c.dichVu, c.nhom].join("|");
  const goc = ds.map((c) => cauCanhBao(c, ten));
  const ra: string[] = [];
  ds.forEach((c, i) => {
    const khacChieu = ds.some((d, j) => j !== i && khoaChang(d) === khoaChang(c) && goc[j] !== goc[i]);
    const dong = khacChieu ? `${goc[i]!.slice(0, -1)}, ${c.chieu === "OUT" ? "chiều đi" : "chiều về"}.` : goc[i]!;
    if (!ra.includes(dong)) ra.push(dong);
  });
  return ra;
}

export function cauKetQuaThuTra(r: ThuTraPhiDonResponse, ten: TenPhiDon): string[] {
  const k = r.ketQua;
  const chuaAp = r.chuaApNgayNay ? [CHU_CHUA_AP] : [];
  if (k.trangThai === "THIEU_MUC") return [k.lyDo === "XUNG_DOT" ? CHU_XUNG_DOT : CHU_THIEU_MUC, ...chuaAp];
  const don = k.kieu === "PER_PAX" ? "khách" : "chuyến";
  const dong: string[] = [
    k.tien === 0
      ? `Phí đón: ${CHU_MIEN_PHI}`
      : `Phí đón: ${soTien(k.tien)} đ (${soTien(k.donGia)} đ/${don} × ${k.soLuong} ${don})`,
  ];
  dong.push(...chuaAp);
  for (const t of r.thua) {
    const m = ten.muc?.get(t.mucId);
    const mo = m ? `${cauDieuKien(m, ten)} · ${cauTien(m)}` : cauTien({ kieu: k.kieu, tien: t.tien });
    dong.push(`Mức không được dùng: ${mo} — ${t.viSao}`);
  }
  return dong;
}

/** Bộ điều kiện gửi lên máy chủ (dạng mảng `[{khoa, giaTri}]`) dựng lại từ dòng đã đọc — dùng khi «Đổi mức», để mức mới giữ NGUYÊN điều kiện của mức cũ. */
export function dieuKienGui(d: MucPhiDonDto["dieuKien"]): { khoa: string; giaTri: string }[] {
  const r = [{ khoa: "ZONE", giaTri: d.vung }];
  if (d.cap !== null) r.push({ khoa: "TIER", giaTri: d.cap });
  if (d.dichVu !== null) r.push({ khoa: "SERVICE", giaTri: d.dichVu });
  if (d.nhom !== null) r.push({ khoa: "SERVICE_GROUP", giaTri: d.nhom });
  if (d.chieu !== null) r.push({ khoa: "DIRECTION", giaTri: d.chieu });
  if (d.xeRieng) r.push({ khoa: "EXCLUSIVE", giaTri: "1" });
  return r;
}

// ---- Đợt C, Task 6: phí đưa đón trên trang đơn và biên nhận ----

/**
 * Chữ ở cột thành tiền của MỘT dòng phí đã lưu: «Miễn phí» CHỈ khi đơn giá đã chụp là 0 đồng (mức 0 đồng được đặt rõ — Hiến chương 5.7). Dòng có số lượng 0 mà
 * đơn giá > 0 (dịch vụ sửa còn toàn em bé) in đúng số 0 đồng, không gọi là miễn phí. Trang đơn và biên nhận dùng chung hàm này.
 */
export function chuThanhTienPhi(d: { unitPrice: number; lineTotal: number }, tien: (n: number) => string): string {
  return d.unitPrice === 0 ? CHU_MIEN_PHI : tien(d.lineTotal);
}

/** Tên khối phí: đơn nháp ghi «Phí đưa đón (dự kiến)» (số tính theo bảng phí hôm nay, chụp lại lúc xác nhận). */
export const tenKhoiPhiDon = (duKien: boolean): string => (duKien ? `${TEN_PHI_DUA_DON} (${CHU_DU_KIEN})` : TEN_PHI_DUA_DON);

/**
 * Câu khi một lượt đón còn mở chưa được chọn phí (ADR-0214 Đ3, lý do `CHUA_CHON`) — MỘT nguồn cho câu 409 `transfer_fee_missing` lúc xác nhận (orders re-export) và băng báo trên
 * trang đơn nháp. Chiều viết thường theo nhãn sẵn có (`chieuChu`, cùng chữ với `CHIEU_LABEL`).
 */
export function cauThieuPhiDon(t: { direction: "OUT" | "RETURN"; tenDichVu: string }): string {
  return `Chọn phí đưa đón cho lượt đón ${chieuChu(t.direction).toLowerCase()} của dịch vụ ${t.tenDichVu} trước khi xác nhận.`;
}

export interface DongPhiTrang {
  /** «Chiều đi · <khu vực>». */
  nhan: string;
  /** Dòng phụ «2 khách × 70.000 ₫» / «1 chuyến × 300.000 ₫»; null với dòng «Miễn phí». */
  chiTiet: string | null;
  /** Thành tiền, hoặc «Miễn phí» (đơn giá 0 đồng). */
  giaTri: string;
}

/** `OrderDto.phiDuaDon` → chữ của mục «Phí đưa đón» trong thẻ tiền của trang đơn: tiêu đề, mỗi chặng một dòng (nhãn + dòng phụ số khách × đơn giá, thành tiền bên phải), câu băng báo thiếu mức (bỏ trùng). */
export function dongPhiTrenDon(p: PhiDuaDonCuaDonDto, tien: (n: number) => string): { tieuDe: string; dong: DongPhiTrang[]; thieu: string[] } {
  const dong = p.dong.map((d) => ({
    nhan: d.zoneName === null ? chieuChu(d.direction) : `${chieuChu(d.direction)} · ${d.zoneName}`, // ADR-0214: dòng văn phòng chọn không có khu vực (Task 6 hoàn thiện chữ)
    chiTiet: d.unitPrice === 0 ? null : `${d.quantity} ${d.kind === "PER_PAX" ? "khách" : "chuyến"} × ${tien(d.unitPrice)}`,
    giaTri: chuThanhTienPhi(d, tien),
  }));
  const thieu: string[] = [];
  for (const t of p.thieu) {
    const cau = cauThieuPhiDon({ direction: t.direction, tenDichVu: t.serviceName });
    if (!thieu.includes(cau)) thieu.push(cau);
  }
  return { tieuDe: tenKhoiPhiDon(p.duKien), dong, thieu };
}
