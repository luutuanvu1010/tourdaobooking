// LUẬT THUẦN cam kết "xe riêng" / "xe tối thiểu N chỗ" trên chặng đưa đón (ADR-0056 VK3-A A2, A3; kế hoạch Đợt 7 Task 3, C4, C5). MỘT nguồn, gọi từ
// `kiemXep` (xếp, dời đến, thêm khi xe đang chạy), `kiemTaoSuaChuyen` (đổi xe) và `kiemXuatBen` (cổng xuất bến + lịch chung dự phóng). Không I/O, không import
// module; import kèm đuôi .ts. Test cạnh tệp: cam-ket-xe.test.ts.
//
// - R-XR: có suất khách mở của một chặng `xeRieng` thuộc đơn A thì mọi suất khách mở khác phải thuộc đơn A. Suất người đi kèm (CREW) không có chặng ⇒ không tính.
// - R-CX: `soCho` của xe ≥ `choToiThieu` lớn nhất trong các chặng có suất khách mở (cùng nghĩa: không kể tài xế).
// - Khoá phá lệ (C4, C5): chuỗi nối, KHÔNG băm — chỉ id xe, id chặng, loại, cờ, con số; không tên, không mã đơn có dấu, không tiền. Không bao giờ vào DTO / nhật ký.
import type { ChangVao } from "./dieu-phoi-kieu.ts";
import { lyDoGiu, type LyDoGiu } from "./ly-do-giu.ts";

export interface ViPhamCamKet {
  legId: string;
  loai: "XR" | "CX";
  /** Cờ xe riêng CỦA CHÍNH chặng vi phạm (chặng của đơn khác ghép vào xe riêng mang `false`). */
  xeRieng: boolean;
  choToiThieu: number | null;
  orderCode: string;
}
export interface KetQuaCamKet {
  viPham: ViPhamCamKet[];
  /** Khoá của tập vi phạm hiện tại (C4, C5); null khi không vi phạm. */
  khoa: string | null;
  /** `khoa !== null && khoa === khoaDaPhaLe`. */
  daPhaLe: boolean;
  /** Mỗi vi phạm một lý do `CAM_KET`, lời gồm mã đơn và loại; rỗng khi không vi phạm. */
  lyDo: LyDoGiu[];
}
export type ChangCamKet = Pick<ChangVao, "legId" | "orderId" | "orderCode" | "xeRieng" | "choToiThieu">;

/** Một dòng của khoá: `<legId>:<XR|CX>:<0|1>:<choToiThieu|->`. */
const dongKhoa = (v: ViPhamCamKet): string => `${v.legId}:${v.loai}:${v.xeRieng ? 1 : 0}:${v.choToiThieu ?? "-"}`;

/** Khoá phá lệ (C5): `xe:<xeId>` + từng dòng vi phạm, sắp xếp, nối bằng `|`. Không vi phạm → null. */
export function khoaCamKet(xeId: string, viPham: readonly ViPhamCamKet[]): string | null {
  if (viPham.length === 0) return null;
  return [`xe:${xeId}`, ...[...new Set(viPham.map(dongKhoa))].sort()].join("|");
}

/** Lời của một vi phạm — mã đơn + loại + con số (LC-18: không tên). */
function loiViPham(v: ViPhamCamKet, soCho: number, donXeRieng: string): string {
  if (v.loai === "CX") return `${v.orderCode} cần ≥ ${v.choToiThieu} chỗ, xe ${soCho} chỗ`;
  return v.xeRieng ? `${v.orderCode} xe riêng` : `${v.orderCode} ghép vào xe riêng của ${donXeRieng}`;
}

/**
 * Kiểm cam kết của MỘT chuyến ở trạng thái SAU lệnh. `chang` = các chặng có ≥ 1 suất khách MỞ trên chuyến (nơi gọi lọc; trùng `legId` tự gộp). Trả mọi vi
 * phạm (kể cả khi đã phá lệ — `daPhaLe` cho biết), khoá, và lý do `CAM_KET` cho từng vi phạm.
 */
export function kiemCamKet(v: { xe: { id: string; soCho: number }; chang: readonly ChangCamKet[]; khoaDaPhaLe: string | null }): KetQuaCamKet {
  // Global Constraints kế hoạch Đợt 7: trường cam kết BẮT BUỘC — `undefined` (bộ dựng thiếu trường, thân cũ) không được lặng lẽ hiểu là "không cam kết".
  for (const c of v.chang) {
    if (typeof c.xeRieng !== "boolean") throw new Error(`Dữ liệu cam kết sai: chặng ${c.legId} có xeRieng không phải true/false (${String(c.xeRieng)}).`);
    if (!(c.choToiThieu === null || Number.isInteger(c.choToiThieu))) throw new Error(`Dữ liệu cam kết sai: chặng ${c.legId} có choToiThieu không phải null hay số nguyên (${String(c.choToiThieu)}).`);
  }
  const chang = [...new Map(v.chang.map((c) => [c.legId, c])).values()];
  const ds: { x: ViPhamCamKet; loi: string }[] = [];
  const xr = new Map<string, { ch: ChangCamKet; donXeRieng: string }>();
  // R-XR: mỗi chặng xe riêng của đơn A — mọi chặng của đơn khác vi phạm, và chính chặng xe riêng vi phạm.
  for (const r of chang.filter((c) => c.xeRieng)) {
    const khac = chang.filter((c) => c.orderId !== r.orderId);
    if (khac.length === 0) continue;
    if (!xr.has(r.legId)) xr.set(r.legId, { ch: r, donXeRieng: r.orderCode });
    for (const c of khac) if (!xr.has(c.legId)) xr.set(c.legId, { ch: c, donXeRieng: r.orderCode });
  }
  for (const { ch, donXeRieng } of xr.values()) {
    const x: ViPhamCamKet = { legId: ch.legId, loai: "XR", xeRieng: ch.xeRieng, choToiThieu: ch.choToiThieu, orderCode: ch.orderCode };
    ds.push({ x, loi: loiViPham(x, v.xe.soCho, donXeRieng) });
  }
  // R-CX: mỗi chặng đòi nhiều chỗ hơn xe.
  for (const ch of chang) {
    if (ch.choToiThieu === null || ch.choToiThieu <= v.xe.soCho) continue;
    const x: ViPhamCamKet = { legId: ch.legId, loai: "CX", xeRieng: ch.xeRieng, choToiThieu: ch.choToiThieu, orderCode: ch.orderCode };
    ds.push({ x, loi: loiViPham(x, v.xe.soCho, "") });
  }
  // Thứ tự tất định theo dòng khoá — cùng trạng thái cho cùng danh sách lý do ở mọi nơi gọi (bài "MỘT luật hai nơi").
  ds.sort((a, b) => (dongKhoa(a.x) < dongKhoa(b.x) ? -1 : dongKhoa(a.x) > dongKhoa(b.x) ? 1 : 0));
  const viPham = ds.map((d) => d.x);
  const khoa = khoaCamKet(v.xe.id, viPham);
  return { viPham, khoa, daPhaLe: khoa !== null && khoa === v.khoaDaPhaLe, lyDo: ds.map((d) => lyDoGiu("CAM_KET", d.loi)) };
}

/**
 * Nhãn cam kết của một chặng, MỘT nguồn cho trang đơn và bảng điều phối (bản vẽ 2/10): [XE RIÊNG][≥ N chỗ]. `navy` = nền đậm (`.dp-chip-navy`), `unit` = nền nhạt
 * (`.chip-unit` / `.dp-chip-unit`). Chỗ đặt nhãn trong hàng nhãn do từng màn quyết (trang đơn: trước ✈︎; bảng điều phối: sau ✈︎).
 */
export function nhanCamKet(xeRieng: boolean, choToiThieu: number | null): { nhan: string; tone: "navy" | "unit" }[] {
  return [
    ...(xeRieng ? [{ nhan: "XE RIÊNG", tone: "navy" as const }] : []),
    ...(choToiThieu !== null ? [{ nhan: `≥ ${choToiThieu} chỗ`, tone: "unit" as const }] : []),
  ];
}
