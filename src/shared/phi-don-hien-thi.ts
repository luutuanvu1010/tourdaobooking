// Chữ hiển thị của màn «Phí đưa đón» (kế hoạch Phí đưa đón, Đợt B Task 8). Thuần: không I/O, KHÔNG tính tiền (mọi số tiền do máy chủ trả).
// Không hàm nào để lọt mã thô (PER_PAX, OUT, NGOAI_VUNG…) ra chữ người dùng; mã không có tên thì hiện mã kèm lời giải («đã khoá»).
import { ngayDayDu } from "./vn-date.ts";
import type { CanhBaoPhiDonDto, MucPhiDonDto, ThuTraPhiDonResponse } from "./contracts.ts";

export interface TenPhiDon {
  vung: ReadonlyMap<string, string>;
  cap: ReadonlyMap<string, string>;
  nhom: ReadonlyMap<string, string>;
  dichVu: ReadonlyMap<string, string>;
  /** Tuỳ chọn: mức theo mã, để «Thử tra» mô tả mức thua. */
  muc?: ReadonlyMap<string, MucPhiDonDto>;
}

export const CHU_MIEN_PHI = "Miễn phí";
export const CHU_MOI_CAP = "Mọi cấp";
export const CHU_THIEU_MUC = "Chưa có mức cho tình huống này. Đơn như vậy sẽ không xác nhận được.";
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

/** Các mục chỉ khác chiều mà cùng nội dung gộp thành một dòng. */
export function cauCanhBaoGop(ds: readonly CanhBaoPhiDonDto[], ten: TenPhiDon): string[] {
  return [...new Set(ds.map((c) => cauCanhBao(c, ten)))];
}

export function cauKetQuaThuTra(r: ThuTraPhiDonResponse, ten: TenPhiDon): string[] {
  const k = r.ketQua;
  if (k.trangThai === "THIEU_MUC") return [k.lyDo === "XUNG_DOT" ? CHU_XUNG_DOT : CHU_THIEU_MUC];
  const don = k.kieu === "PER_PAX" ? "khách" : "chuyến";
  const dong: string[] = [
    k.tien === 0
      ? `Phí đón: ${CHU_MIEN_PHI}`
      : `Phí đón: ${soTien(k.tien)} đ (${soTien(k.donGia)} đ/${don} × ${k.soLuong} ${don})`,
  ];
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
