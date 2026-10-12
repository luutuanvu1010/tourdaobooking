// Màn tài xế ĐANG CHẠY (/cuoc-chuyen) vẽ cho người đang lái (đánh giá ERP 7/10, C53 + C54): một khối "Điểm kế tiếp", các điểm sau, điểm đã xong thu gọn, và MỘT
// nút chính dính đáy. Hàm thuần — giao diện chỉ vẽ; không I/O, không DOM. Dữ liệu vào là `BuocDiem[]` của `buocDiem` (cùng luật HT-16 với máy chủ).
import type { BuocDiem } from "./tien-do-man.ts";

export interface NhomDiemChay {
  /** Điểm đang làm: điểm ĐÃ TỚI còn khách chờ / còn khách phải trả đứng trước; không có thì điểm chưa tới đầu tiên theo thứ tự. */
  keTiep: BuocDiem | null;
  /** Các điểm còn việc, sau điểm kế tiếp (giữ thứ tự điểm). */
  sau: BuocDiem[];
  /** Điểm đã xong hoặc bỏ qua / đã chuyển (thu gọn). */
  xong: BuocDiem[];
}

export function nhomDiemChay(buoc: readonly BuocDiem[]): NhomDiemChay {
  const conViec = buoc.filter((b) => b.trangThaiHien === "dang" || b.trangThaiHien === "sau");
  const keTiep = conViec.find((b) => b.trangThaiHien === "dang") ?? conViec[0] ?? null;
  return { keTiep, sau: conViec.filter((b) => b !== keTiep), xong: buoc.filter((b) => b.trangThaiHien === "xong" || b.trangThaiHien === "bo") };
}

export type ViecChinh =
  | { loai: "da-toi" | "tra-het"; buoc: BuocDiem; nhan: string }
  | { loai: "don-tat-ca"; buoc: BuocDiem; suatIds: string[]; nhan: string }
  | { loai: "ket-thuc"; nhan: "Kết thúc chuyến" };

/** Khách CÒN CHỜ ở một điểm đón đã tới (chưa có kết quả): đúng những suất "Đã đón N khách" sẽ ghi. Khách Vắng không tính — họ đã có kết quả. */
function khachDangCho(b: BuocDiem): string[] {
  if (b.diem.loai !== "PICKUP" || b.trangThaiHien !== "dang") return [];
  return b.khach.filter((k) => k.ketQua === null && k.nut.includes("don")).map((k) => k.suatId);
}

/**
 * Nút chính dính đáy: việc của điểm kế tiếp (Đã tới / Đã đón N khách / Đã trả); điểm kế tiếp bị chặn (HT-16: điểm trả đứng trước điểm đón còn khách) thì việc của
 * điểm sau gần nhất làm được; hết điểm mà máy chủ cho kết thúc (`ketThuc` = `xetKetThuc(...).duoc`) thì "Kết thúc chuyến". Không có việc làm được → null.
 */
export function viecChinh(n: NhomDiemChay, ketThuc: boolean): ViecChinh | null {
  for (const b of [...(n.keTiep ? [n.keTiep] : []), ...n.sau]) {
    const cho = khachDangCho(b);
    if (cho.length > 0) return { loai: "don-tat-ca", buoc: b, suatIds: cho, nhan: `Đã đón ${cho.length} khách` };
    if (b.nut) return { loai: b.nut.lenh, buoc: b, nhan: b.nut.nhan };
  }
  return !n.keTiep && ketThuc ? { loai: "ket-thuc", nhan: "Kết thúc chuyến" } : null;
}

/** Chữ dưới nút "Kết thúc chuyến" khi máy chủ chưa cho (`xetKetThuc(...).duoc === false`): nói còn bao nhiêu khách / điểm chưa xong. */
export function cauChuaKetThuc(k: { conSuat: number; conDiem: number }): string {
  const phan = [k.conSuat > 0 ? `${k.conSuat} khách` : null, k.conDiem > 0 ? `${k.conDiem} điểm` : null].filter((x) => x !== null).join(" và ");
  return `Bấm được khi xong hết: còn ${phan}.`;
}
