// Hộp xác nhận + dòng "Vừa ghi" của màn tài xế (Kiểu A "bấm nhầm không sửa được", kiểm theo vai 2/10 — lộ trình 3/10 V1.4; NGUYEN-NHAN-GOC.md §3.5). THUẦN —
// không DOM, không I/O; import kèm đuôi .ts. Test: xac-nhan-tien-do.test.ts.
// - "Đã trả" cả điểm và "Kết thúc chuyến" là lệnh chốt (máy trạng thái chỉ đi tiến — LC-07): mở bảng trượt xác nhận trước khi gửi.
// - Lệnh suất một chạm (Đã đón / Vắng / Khách đã huỷ / người đi kèm Đã lên xe / Đã xuống) giữ một chạm, nhưng ngay sau đó hiện "Vừa ghi … — Sai? Báo văn
//   phòng." để tài xế thấy mình vừa bấm gì. Lệnh sửa có lý do của văn phòng chờ ADR-0097 (V3) — ở đây chỉ nhắc đường báo.
import { maskLongDigits } from "./text-guards.ts";

export interface HopXacNhan {
  tieuDe: string;
  /** Cặp [nhãn, giá trị] theo thứ tự hiện. */
  dong: [string, string][];
  canhBao: string | null;
  nutXacNhan: string;
  ghiChu: string;
}

const SAI_BAO = "Đã ghi thì không tự sửa được — sai thì báo văn phòng.";

/** "Đã trả" ở một điểm trả: `soKhach` = số khách đang trên xe xuống ở điểm này (`BuocDiem.traCho`). 0 khách (HT-02) → cảnh báo, nút chỉ ghi "đã tới". */
export function hopTraCaDiem(v: { tenNoi: string; soKhach: number }): HopXacNhan {
  const n = Math.max(0, v.soKhach);
  return {
    tieuDe: `Trả khách ở ${v.tenNoi}?`,
    dong: [["Điểm trả", v.tenNoi], ["Khách xuống", n > 0 ? `${n} khách đang trên xe` : "Chưa có khách nào trên xe xuống ở điểm này"]],
    canhBao: n > 0 ? null : "Xe chưa đón ai xuống ở điểm này. Chỉ bấm khi xe thật sự đã tới điểm trả (vd khách ở đây đều vắng hoặc đã huỷ).",
    nutXacNhan: n > 0 ? `Đã trả ${n} khách` : "Vẫn ghi đã tới điểm trả",
    ghiChu: SAI_BAO,
  };
}

/** "Kết thúc chuyến": tóm tắt kết quả khách (bỏ người đi kèm `CREW`). */
export function hopKetThuc(v: { ma: string; suat: readonly { trangThai: string; loai?: "PASSENGER" | "CREW" }[] }): HopXacNhan {
  const khach = v.suat.filter((x) => (x.loai ?? "PASSENGER") === "PASSENGER");
  const dem = (t: string) => `${khach.filter((x) => x.trangThai === t).length} khách`;
  return {
    tieuDe: `Kết thúc ${v.ma}?`,
    dong: [["Đã trả", dem("DROPPED")], ["Vắng", dem("NO_SHOW")], ["Khách đã huỷ", dem("CANCELLED_AT_STOP")]],
    canhBao: null,
    nutXacNhan: "Kết thúc chuyến",
    ghiChu: "Kết thúc rồi thì chuyến không mở lại được — sai thì báo văn phòng.",
  };
}

const NHAN_VUA_GHI = { don: "Đã đón", vang: "Vắng", "khach-huy": "Khách đã huỷ", "di-kem-don": "Đã lên xe", "di-kem-tra": "Đã xuống" } as const;
export type LenhVuaGhi = keyof typeof NHAN_VUA_GHI;
/** Dòng hiện ngay sau một lệnh suất một chạm thành công: "Vừa ghi: <tên hiện trên màn> — <kết quả>. Sai? Báo văn phòng." Lệnh lạ → null. */
export function dongVuaGhi(lenh: LenhVuaGhi, ten: string): string | null {
  if (!Object.hasOwn(NHAN_VUA_GHI, lenh)) return null;
  return `Vừa ghi: ${maskLongDigits(ten)} — ${NHAN_VUA_GHI[lenh]}. Sai? Báo văn phòng.`;
}
