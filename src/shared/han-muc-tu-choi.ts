// Hạn mức «Từ chối» của hướng dẫn viên (ADR-0032, accepted 2026-10-23) — luật THUẦN dùng chung máy chủ ↔ giao diện. Không I/O.
// Bản SQL cùng luật (thi hành NGUYÊN TỬ ở câu đầu lô Từ chối) ở `src/modules/dispatch/han-muc-repo.ts`; hai bản chạy cùng bộ ca
// `han-muc-tu-choi-ca.ts` (bài thuần + bài SQL song sinh) — đổi luật thì đổi CẢ HAI.
//
// Định nghĩa (kế hoạch 2026-10-23 mục 3a), với người P đang Từ chối đơn X; thứ tự sự kiện = `seq` (thứ tự chèn toàn bảng):
//  - mocReset = seq lớn nhất của RESET của P (0 nếu không có);
//  - mocGiu   = seq lớn nhất của CLAIM/ASSIGN của P cho đơn Y ≠ X mà SAU nó P không có REFUSE/ABORT cho Y (P đang hoặc đã GIỮ Y) — 0 nếu không có;
//  - chuoi    = số REFUSE của P có seq > max(mocReset, mocGiu);
//  - tuan     = số REFUSE của P có occurred_at ≥ đầu tuần VN VÀ seq > mocReset.
import type { PermissionCode } from "./permissions.ts";
import { vnLocalToIso, vnToday, vnWeekRange } from "./vn-date.ts";

export type LoaiSuKien = "CLAIM" | "ASSIGN" | "REFUSE" | "ABORT" | "RESET";
export interface SuKien {
  seq: number;
  loai: LoaiSuKien;
  /** null chỉ ở RESET. */
  orderId: string | null;
  /** occurred_at, ISO UTC (toISOString). */
  at: string;
}
export interface DemTuChoi {
  chuoi: number;
  tuan: number;
}

/** Đếm chuỗi «liên tiếp» và số lần trong tuần của MỘT người (ADR điều 3, 4). `orderX` = đơn đang Từ chối; null = bảng tổng (không loại đơn nào). */
export function demTuChoi(suKien: readonly SuKien[], orderX: string | null, dauTuan: string): DemTuChoi {
  const ds = [...suKien].sort((a, b) => a.seq - b.seq);
  const mocReset = Math.max(0, ...ds.filter((e) => e.loai === "RESET").map((e) => e.seq));
  const mocGiu = Math.max(
    0,
    ...ds
      .filter((c) => (c.loai === "CLAIM" || c.loai === "ASSIGN") && c.orderId !== orderX)
      .filter((c) => !ds.some((f) => (f.loai === "REFUSE" || f.loai === "ABORT") && f.orderId === c.orderId && f.seq > c.seq))
      .map((c) => c.seq),
  );
  const moc = Math.max(mocReset, mocGiu);
  const tuChoi = ds.filter((e) => e.loai === "REFUSE");
  return { chuoi: tuChoi.filter((e) => e.seq > moc).length, tuan: tuChoi.filter((e) => e.at >= dauTuan && e.seq > mocReset).length };
}

/** Đầu tuần dân sự VN (thứ Hai 00:00 giờ VN) chứa `now`, dạng ISO UTC — Chủ nhật 17:00:00.000Z của tuần trước theo UTC. */
export function dauTuanIso(now: Date): string {
  return vnLocalToIso(`${vnWeekRange(vnToday(now)).from}T00:00`)!;
}

const VAN_PHONG: readonly PermissionCode[] = ["SALES", "ACCOUNTING", "ADMIN", "SUPER_ADMIN"];
/**
 * ADR-0032 điều 2: chỉ tài khoản có quyền Hướng dẫn viên (`FIELD`) và KHÔNG có quyền văn phòng nào bị chặn. Câu hỏi DANH TÍNH theo bộ quyền đang hiệu lực
 * lúc bấm (bộ quyền của phiên) — không phải một ô của MATRIX (`web/CLAUDE.md` «Ẩn/hiện phải hỏi bảng quyền» chỉ áp cho «được làm gì»).
 */
export function biGioiHanTuChoi(permissions: readonly PermissionCode[]): boolean {
  return permissions.includes("FIELD") && !VAN_PHONG.some((p) => permissions.includes(p));
}

export const CHE_DO = ["OFF", "MEASURE", "BLOCK"] as const;
export type CheDo = (typeof CHE_DO)[number];
export interface CaiDatHanMuc {
  cheDo: CheDo;
  lienTiep: number;
  moiTuan: number;
}
export const NHAN_CHE_DO: Readonly<Record<CheDo, string>> = { OFF: "Tắt", MEASURE: "Chỉ đo", BLOCK: "Chặn" };
/** Câu giải thích từng chế độ cho thẻ cài đặt (lời thường). */
export const GIAI_THICH_CHE_DO: Readonly<Record<CheDo, string>> = {
  OFF: "Không dùng số đếm để chặn; vẫn ghi lại từng lần.",
  MEASURE: "Không chặn ai; lần nào lẽ ra bị chặn thì ghi vào nhật ký để xem.",
  BLOCK: "Hướng dẫn viên vượt mức thì không bấm Từ chối được, phải gọi văn phòng.",
};

/** «cho» = cho Từ chối; «chan» = chặn (409); «do_vuot» = chế độ Chỉ đo và lẽ ra bị chặn (cho, nhưng ghi nhật ký). */
export type QuyetDinh = "cho" | "chan" | "do_vuot";
export const vuotMuc = (cs: CaiDatHanMuc, dem: DemTuChoi): boolean => dem.chuoi >= cs.lienTiep || dem.tuan >= cs.moiTuan;
export function quyetDinhHanMuc(cs: CaiDatHanMuc, dem: DemTuChoi, biGioiHan: boolean): QuyetDinh {
  if (!biGioiHan || cs.cheDo === "OFF" || !vuotMuc(cs, dem)) return "cho";
  return cs.cheDo === "BLOCK" ? "chan" : "do_vuot";
}

/** Số lần còn được Từ chối (ADR điều 9) — null khi không phải «Chặn» hoặc người gọi không bị giới hạn. */
export function conLai(cs: CaiDatHanMuc, dem: DemTuChoi, biGioiHan: boolean): { lienTiep: number; tuan: number } | null {
  if (cs.cheDo !== "BLOCK" || !biGioiHan) return null;
  return { lienTiep: Math.max(0, cs.lienTiep - dem.chuoi), tuan: Math.max(0, cs.moiTuan - dem.tuan) };
}

const soNguyenTrong = (v: unknown, min: number, max: number): v is number => typeof v === "number" && Number.isInteger(v) && v >= min && v <= max;
/** Thân `POST /api/dispatch/han-muc-tu-choi/chinh-sach`: đúng `{ cheDo, lienTiep (1–10), moiTuan (1–100) }`, không khoá lạ. */
export function docCaiDat(body: Record<string, unknown> | null): { ok: true; cs: CaiDatHanMuc } | { ok: false; loi: string } {
  if (body === null || typeof body !== "object" || Array.isArray(body)) return { ok: false, loi: "Thiếu cài đặt hạn mức." };
  if (Object.keys(body).some((k) => !["cheDo", "lienTiep", "moiTuan"].includes(k))) return { ok: false, loi: "Cài đặt có trường không hợp lệ." };
  const cheDo = body.cheDo;
  if (typeof cheDo !== "string" || !(CHE_DO as readonly string[]).includes(cheDo)) return { ok: false, loi: "Hãy chọn một chế độ: Tắt, Chỉ đo hoặc Chặn." };
  if (!soNguyenTrong(body.lienTiep, 1, 10)) return { ok: false, loi: "Số đơn liên tiếp tối đa phải là số nguyên từ 1 đến 10." };
  if (!soNguyenTrong(body.moiTuan, 1, 100)) return { ok: false, loi: "Số lần mỗi tuần tối đa phải là số nguyên từ 1 đến 100." };
  return { ok: true, cs: { cheDo: cheDo as CheDo, lienTiep: body.lienTiep, moiTuan: body.moiTuan } };
}

/** Câu nguyên văn ADR-0032 điều 5 khi bị chặn. */
export const CAU_HET_LUOT = "Bạn đã từ chối đủ số lần cho phép. Hãy gọi văn phòng.";
export const cauConLai = (lienTiep: number, tuan: number): string => `Bạn còn được từ chối ${lienTiep} đơn liên tiếp, ${tuan} lần trong tuần này.`;

/** `detail` của nhật ký `refuse_limit_hit` — chỉ số, không tên, không SĐT. */
export const moTaChamHanMuc = (cs: CaiDatHanMuc, dem: DemTuChoi): string =>
  `Liên tiếp ${dem.chuoi}/${cs.lienTiep} · tuần ${dem.tuan}/${cs.moiTuan} · ${cs.cheDo === "BLOCK" ? "Chặn" : `${NHAN_CHE_DO[cs.cheDo]} (không chặn)`}`;
/** `detail` của nhật ký `refuse_policy_changed` — trước → sau (ADR điều 7). */
export const moTaDoiCaiDat = (truoc: CaiDatHanMuc | null, sau: CaiDatHanMuc): string =>
  `Chế độ: ${truoc ? NHAN_CHE_DO[truoc.cheDo] : "(chưa có)"} → ${NHAN_CHE_DO[sau.cheDo]}; liên tiếp ${truoc?.lienTiep ?? "–"} → ${sau.lienTiep}; mỗi tuần ${truoc?.moiTuan ?? "–"} → ${sau.moiTuan}`;
/** `detail` của nhật ký `refuse_counter_reset`. Không tên người được đặt lại (đích là mã hồ sơ). */
export const moTaDatLai = (soNguoi: number | null): string => (soNguoi === null ? "Đặt lại cho một hướng dẫn viên" : `Đặt lại cho tất cả (${soNguoi} người)`);
