// ĐIỀU CHỈNH KẾT QUẢ MỘT SUẤT (ADR-0097 Đ2 — gói A1, V3-B). Luật thuần, không I/O: bảng Đ2.4 + điều kiện "điểm chưa xong", nhãn trạng thái, câu nhật ký.
// Dùng chung: máy chủ (`lenhDieuChinhSuat` — dieu-phoi-dieu-chinh.ts) và màn văn phòng (hộp "Điều chỉnh…" của web/chuyen.ts). Lớp CSDL giữ CÙNG bảng ở trigger
// vc_trip_running_locked_alloc_ins (migration 0085) — đổi bảng là đổi ADR, sửa CẢ hai chỗ (bài dieu-chinh-csdl.test.ts đối chiếu).
import type { TrangThaiSuat } from "./dieu-phoi-kieu.ts";

type TrangThaiDiem = "PENDING" | "ARRIVED" | "DONE" | "SKIPPED" | "MOVED";
/** Trạng thái điểm lên / xuống của suất lúc điều chỉnh (điểm xuống null khi chặng chưa chốt nơi trả). */
export interface DiemCuaSuat {
  diemLen: TrangThaiDiem | string;
  diemXuong: TrangThaiDiem | string | null;
}

/** Bảng Đ2.4: đã ghi (nhầm) → sửa thành, kèm điều kiện điểm. Thứ tự trong mỗi dòng = thứ tự lựa chọn trên hộp. */
const BANG: Readonly<Partial<Record<TrangThaiSuat, readonly { den: TrangThaiSuat; can?: "LEN_CHUA_XONG" | "XUONG_CHUA_XONG" }[]>>> = {
  BOARDED: [{ den: "WAITING", can: "LEN_CHUA_XONG" }, { den: "NO_SHOW" }, { den: "CANCELLED_AT_STOP" }],
  CANCELLED_AT_STOP: [{ den: "WAITING", can: "LEN_CHUA_XONG" }, { den: "BOARDED" }, { den: "NO_SHOW" }],
  NO_SHOW: [{ den: "WAITING", can: "LEN_CHUA_XONG" }, { den: "CANCELLED_AT_STOP" }],
  DROPPED: [{ den: "BOARDED", can: "XUONG_CHUA_XONG" }],
};

const NHAN: Readonly<Record<TrangThaiSuat, string>> = {
  WAITING: "Chưa xử lý",
  BOARDED: "Đã đón",
  NO_SHOW: "Vắng",
  CANCELLED_AT_STOP: "Khách huỷ tại điểm",
  DROPPED: "Đã trả",
};
export const nhanTrangThaiDieuChinh = (t: TrangThaiSuat): string => NHAN[t];
/** Nhãn của trạng thái ĐÍCH: "Đã trả → Đã đón" đọc là "Còn trên xe" (ADR-0097 Đ2.4). */
export const nhanDichDieuChinh = (tu: TrangThaiSuat, den: TrangThaiSuat): string => (tu === "DROPPED" && den === "BOARDED" ? "Còn trên xe" : NHAN[den]);

export type MaTuChoiDieuChinh = "ngoai_bang" | "diem_da_xong";
/** null = được điều chỉnh; ngược lại mã + câu tiếng Việt (409 của máy chủ / dòng lỗi của hộp). */
export function kiemDieuChinh(tu: TrangThaiSuat, den: TrangThaiSuat, d: DiemCuaSuat): { ma: MaTuChoiDieuChinh; cau: string } | null {
  const dong = (BANG[tu] ?? []).find((x) => x.den === den);
  if (!dong) {
    if (tu === "NO_SHOW" && den === "BOARDED") return { ma: "ngoai_bang", cau: 'Khách vắng mà đã lên xe thì bấm "Đã đón" — không điều chỉnh được theo cách này.' };
    return { ma: "ngoai_bang", cau: `Kết quả ${NHAN[tu]} không điều chỉnh được thành ${nhanDichDieuChinh(tu, den)}.` };
  }
  if (dong.can === "LEN_CHUA_XONG" && d.diemLen === "DONE") return { ma: "diem_da_xong", cau: "Điểm đón đã xong nên không đưa khách về Chưa xử lý được — chọn Vắng hoặc Khách huỷ tại điểm." };
  if (dong.can === "XUONG_CHUA_XONG" && (d.diemXuong === null || d.diemXuong === "DONE")) return { ma: "diem_da_xong", cau: "Điểm trả đã xong nên không đưa khách về Còn trên xe được." };
  return null;
}

/** Các trạng thái đích đang làm được (hộp chỉ hiện các lựa chọn này). Rỗng = suất này không có nút "Điều chỉnh…". */
export function dichDieuChinh(tu: TrangThaiSuat, d: DiemCuaSuat): TrangThaiSuat[] {
  return (BANG[tu] ?? []).map((x) => x.den).filter((den) => kiemDieuChinh(tu, den, d) === null);
}

/** Đuôi câu nhật ký / tin (Đ2.6 — không tên khách): "một suất Đã đón → Vắng · Bấm nhầm". */
export const cauDieuChinh = (tu: TrangThaiSuat, den: TrangThaiSuat, nhanLyDo: string): string => `một suất ${NHAN[tu]} → ${nhanDichDieuChinh(tu, den)} · ${nhanLyDo}`;
