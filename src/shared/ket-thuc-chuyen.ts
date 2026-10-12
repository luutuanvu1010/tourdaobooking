// LC-16 — "kết thúc thường" của một chuyến: MỘT hàm thuần cho cả máy chủ (`kiemKetThuc` ở dieu-phoi-kiem.ts, route 27 / 37) và màn tài xế (web/cuoc-chuyen.ts, nút
// "Kết thúc chuyến"). C57 (đánh giá ERP 7/10): màn từng chỉ nhìn khách (`ketThucDuoc`) nên khi cả đoàn vắng, điểm trả còn PENDING, nút sáng mà máy chủ từ chối.
// Kiểu vào HẸP (chỉ `trangThai`, `mo` nếu có) để dùng được với cả bảng `vc_trip_*` của máy chủ lẫn DTO tài xế. Không I/O; import kèm đuôi .ts.
import { KET_QUA_CUOI_SUAT } from "./dieu-phoi-kieu.ts";

export interface SuatXetKetThuc {
  trangThai: string;
  /** Máy chủ: suất còn hiệu lực (`valid_to_at IS NULL`). DTO tài xế chỉ gửi suất đang mở nên bỏ trống = mở. */
  mo?: boolean;
}
export interface DiemXetKetThuc {
  trangThai: string;
}
export type KetQuaKetThuc = { duoc: true } | { duoc: false; goiY: "KET_THUC_GIAN_DOAN"; conSuat: number; conDiem: number };

/** Kết thúc thường chỉ khi mọi suất mở đã có kết quả cuối (Đã trả / Vắng / Khách đã huỷ) VÀ mọi điểm đã DONE / SKIPPED / MOVED; không thì gợi ý "Kết thúc gián đoạn". */
export function xetKetThuc(v: { suat: readonly SuatXetKetThuc[]; diem: readonly DiemXetKetThuc[] }): KetQuaKetThuc {
  const conSuat = v.suat.filter((s) => (s.mo ?? true) && !(KET_QUA_CUOI_SUAT as readonly string[]).includes(s.trangThai)).length;
  const conDiem = v.diem.filter((d) => d.trangThai === "PENDING" || d.trangThai === "ARRIVED").length;
  return conSuat === 0 && conDiem === 0 ? { duoc: true } : { duoc: false, goiY: "KET_THUC_GIAN_DOAN", conSuat, conDiem };
}
