// Luật phủ mức thuần (đặc tả hoa-hong-cap-dai-ly §4): một đối tác chỉ mang loại L, không mức riêng, không cấp riêng,
// xác nhận đơn ở ngày D cho dịch vụ s thì chonMuc có ra mức không? Tệp này KHÔNG chứa chữ cho người dùng;
// câu nằm ở hoa-hong-hien-thi.ts. Không nhập src/modules/.
import type { CommissionRuleDto, GanLoaiMucDto } from "./contracts.ts";

export interface DichVuPhu { code: string; groupCode: string | null; ten: string }
type DongPhu = Pick<CommissionRuleDto, "doiTuong" | "phamVi" | "catalogCode" | "groupCode" | "tuNgay" | "denNgay" | "daHuy">;
type GanPhu = Pick<GanLoaiMucDto, "loai" | "tuNgay" | "denNgay" | "daHuy">;
export interface CapPhu { code: string; dangBat: boolean; dong: readonly DongPhu[]; gan: readonly GanPhu[] }

/** Còn áp ở `ngay`: chưa huỷ, tuNgay <= ngay, denNgay trống hoặc >= ngay (ngày ISO so theo chuỗi). */
export const conApNgay = (d: { tuNgay: string; denNgay: string | null; daHuy: boolean }, ngay: string): boolean =>
  !d.daHuy && d.tuNgay <= ngay && (d.denNgay === null || d.denNgay >= ngay);

/** Dòng khớp dịch vụ: SERVICE theo mã, GROUP theo nhóm (null không khớp gì), ALL luôn khớp. */
export const khopDichVu = (r: Pick<DongPhu, "phamVi" | "catalogCode" | "groupCode">, s: DichVuPhu): boolean =>
  r.phamVi === "ALL" || (r.phamVi === "SERVICE" && r.catalogCode === s.code) || (r.phamVi === "GROUP" && s.groupCode !== null && r.groupCode === s.groupCode);

export type KetQuaPhu = { kieu: "TAT" } | { kieu: "DU" } | { kieu: "KHONG_CO"; thieu: DichVuPhu[] } | { kieu: "THIEU"; thieu: DichVuPhu[] } | { kieu: "CHUA_KIEM" };

const khongKiem = (dv: readonly DichVuPhu[] | null): dv is null => dv === null || dv.length === 0;
/** Ngày sớm nhất > homNay trong các mục chưa huỷ; null nếu không có. */
const sapApSomNhat = (ds: readonly { tuNgay: string; daHuy: boolean }[], homNay: string): string | null =>
  ds.filter((d) => !d.daHuy && d.tuNgay > homNay).map((d) => d.tuNgay).sort()[0] ?? null;

export function phuMucLoai(v: { loai: { code: string; dangBat: boolean }; dong: readonly DongPhu[]; muc: readonly CapPhu[]; dichVu: readonly DichVuPhu[] | null; homNay: string }): { ketQua: KetQuaPhu; sapApTu: string | null } {
  const { loai, homNay } = v;
  const dongLoai = v.dong.filter((d) => d.doiTuong.loai === "VAI" && d.doiTuong.code === loai.code);
  const ganLoai = v.muc.flatMap((c) => c.gan.filter((g) => g.loai.code === loai.code).map((g) => ({ g, c })));
  const sapApTu = sapApSomNhat([...dongLoai, ...ganLoai.map((x) => x.g)], homNay);
  if (!loai.dangBat) return { ketQua: { kieu: "TAT" }, sapApTu };
  if (khongKiem(v.dichVu)) return { ketQua: { kieu: "CHUA_KIEM" }, sapApTu };
  const dongCap = ganLoai.filter((x) => conApNgay(x.g, homNay)).flatMap((x) => x.c.dong.filter((d) => conApNgay(d, homNay)));
  const dongApLoai = dongLoai.filter((d) => conApNgay(d, homNay));
  const thieu = v.dichVu.filter((s) => !dongApLoai.some((d) => khopDichVu(d, s)) && !dongCap.some((d) => khopDichVu(d, s)));
  if (thieu.length === 0) return { ketQua: { kieu: "DU" }, sapApTu };
  return { ketQua: { kieu: thieu.length === v.dichVu.length ? "KHONG_CO" : "THIEU", thieu }, sapApTu };
}

export type KetQuaCap = { kieu: "RONG" } | { kieu: "CHUA_AP"; sapApTu: string | null } | { kieu: "THIEU"; thieu: DichVuPhu[] } | { kieu: "DU" } | { kieu: "CHUA_KIEM" };

export function phuMucCap(v: { cap: CapPhu; dichVu: readonly DichVuPhu[] | null; homNay: string }): KetQuaCap {
  const dong = v.cap.dong.filter((d) => !d.daHuy);
  if (dong.length === 0) return { kieu: "RONG" };
  const ap = dong.filter((d) => conApNgay(d, v.homNay));
  if (ap.length === 0) return { kieu: "CHUA_AP", sapApTu: sapApSomNhat(dong, v.homNay) };
  if (khongKiem(v.dichVu)) return { kieu: "CHUA_KIEM" };
  const thieu = v.dichVu.filter((s) => !ap.some((d) => khopDichVu(d, s)));
  return thieu.length === 0 ? { kieu: "DU" } : { kieu: "THIEU", thieu };
}

const THU_TU: Record<KetQuaPhu["kieu"], number> = { KHONG_CO: 0, THIEU: 1, DU: 2, CHUA_KIEM: 3, TAT: 4 };
export function xepTheoPhu<T extends { ten: string; ketQua: KetQuaPhu }>(ds: readonly T[]): T[] {
  return [...ds].sort((a, b) => THU_TU[a.ketQua.kieu] - THU_TU[b.ketQua.kieu] || a.ten.localeCompare(b.ten, "vi"));
}

export function demDai(ds: readonly KetQuaPhu[]): { thieu: number; khongCo: number; thieuMot: number; tat: number; chuaKiem: boolean } {
  const dem = (k: KetQuaPhu["kieu"]) => ds.filter((x) => x.kieu === k).length;
  const khongCo = dem("KHONG_CO"), thieuMot = dem("THIEU");
  return { thieu: khongCo + thieuMot, khongCo, thieuMot, tat: dem("TAT"), chuaKiem: dem("CHUA_KIEM") > 0 };
}
