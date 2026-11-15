// Đồng bộ danh mục từ Google Sheet: MỘT hàm lệnh cho nút «Đồng bộ ngay từ Google Sheet», Cron và đồng bộ lần đầu (ADR-0186 Đ3). Người phát lệnh — người
// bấm, hoặc tác nhân DONG_BO_DANH_MUC do src/modules/catalog/index.ts dựng — qua cùng cổng `can(…, "catalog.sync")` TRƯỚC khi gọi Sheet hay ghi.
import { can, type PermissionHolder } from "../../shared/permissions";
import { SheetError, fetchSheetCsv } from "../../shared/sheets";
import { applySync, claimFirstSync, getSyncState, ghiVanDe, loadAll, markAttempt, recordFailure } from "./repository";
import { chiaVanDe, planSync, syncGuard, type CatalogRecord, type SyncPlan, type VanDeDongBo } from "./rules";
import { parseCatalogSheet } from "./sheet";

export type SyncResult =
  | { ok: true; added: number; changed: number; hidden: number; unchanged: number; itemCount: number; problems: VanDeDongBo[]; giuLai: number; warnings: { row: number; message: string }[] }
  | { ok: false; code: "forbidden" | "sheet_unreachable" | "sheet_no_access" | "sheet_bad_format" | "sync_guard"; message: string };

/** Câu lý do khi bên phát lệnh không giữ ô `catalog.sync` — hiện ở dòng «lần đồng bộ gần nhất» của màn Danh mục (ADR-0186 Đ6). */
export const CAU_KHONG_DUOC_DONG_BO = "Bên phát lệnh không có quyền đồng bộ danh mục từ Google Sheet. Chưa áp dụng thay đổi nào.";

/** Tin cho Quản trị / Toàn quyền khi có dòng Sheet sai làm dịch vụ đang bán phải giữ theo bản đã lưu. Chữ do catalog viết sẵn (lời thường); NƠI GỬI do gốc lắp ráp tiêm. */
export interface TinDongHong { tieuDe: string; noiDung: string }
export type BaoTinDongHong = (tin: TinDongHong) => Promise<void>;

const TIEU_DE_TIN = "Dòng trong Sheet bị sai, dịch vụ vẫn bán theo bản đã lưu";

/** Câu tin: tên dịch vụ + ô sai, không thuật ngữ. Tối đa 2000 ký tự (giới hạn tin thủ công). */
export function soanTinDongHong(dong: { ten: string; ma: string; row: number; lyDo: string }[]): TinDongHong {
  const dau = "Các dịch vụ dưới đây có dòng bị sai trong Google Sheet. Nền tảng vẫn bán chúng theo giá và tên đã lưu từ lần đọc trước; sửa dòng trong Sheet thì lần đồng bộ sau (15 phút) sẽ tự cập nhật.";
  let noiDung = dau;
  let boQua = 0;
  for (const d of dong) {
    const cau = `\n- ${d.ten} (${d.ma}), dòng ${d.row}: ${d.lyDo}`;
    if (noiDung.length + cau.length > 1900) boQua++;
    else noiDung += cau;
  }
  if (boQua) noiDung += `\n… và ${boQua} dịch vụ khác (xem ở màn Danh mục).`;
  return { tieuDe: TIEU_DE_TIN, noiDung };
}

export async function syncCatalog(env: Env, nguoiPhat: PermissionHolder, opts: { force?: boolean; baoTin?: BaoTinDongHong } = {}): Promise<SyncResult> {
  const db = env.DB;
  const at = new Date().toISOString();
  if (!can(nguoiPhat, "catalog.sync")) {
    // ADR-0186 Đ6: bị từ chối thì chỉ ghi lý do vào trạng thái đồng bộ (không gọi Sheet, không chạm danh mục, không ném).
    await recordFailure(db, at, "forbidden", CAU_KHONG_DUOC_DONG_BO);
    return { ok: false, code: "forbidden", message: CAU_KHONG_DUOC_DONG_BO };
  }
  await markAttempt(db, at);

  let csv: string;
  try {
    csv = await fetchSheetCsv(env.SERVICES_SHEET_ID);
  } catch (e) {
    if (!(e instanceof SheetError)) throw e;
    await recordFailure(db, at, e.code, e.message);
    return { ok: false, code: e.code, message: e.message };
  }
  const parsed = parseCatalogSheet(csv);
  if (!parsed.ok) {
    const message = `Sheet thiếu cột bắt buộc: ${parsed.missing.join(", ")}.`;
    await recordFailure(db, at, "sheet_bad_format", message);
    return { ok: false, code: "sheet_bad_format", message };
  }

  const stored = await loadAll(db);
  const existing = new Map<string, CatalogRecord>(stored.map((s) => [s.code, s]));
  const plan: SyncPlan = planSync(existing, parsed.items, parsed.problems);
  const guard = opts.force ? null : syncGuard(stored.filter((s) => s.inSheet).length, plan, parsed.items.length);
  if (guard) {
    await recordFailure(db, at, "sync_guard", `${guard} Chưa áp dụng thay đổi nào.`);
    return { ok: false, code: "sync_guard", message: guard };
  }

  // Dấu bền (TT1): vấn đề của lần trước nằm ở catalog_sync.problems_json. Chỉ BÁO khi có vấn đề «giữ lại» mà lần trước chưa báo (cùng mã + cùng lý do).
  const truoc = (await getSyncState(db)).problems;
  const daThay = new Set(truoc.map(chiaVanDe));
  const daBao = new Set(truoc.filter((p) => p.daBao).map(chiaVanDe));
  const giu = new Set(plan.giuLai);
  const vanDe: VanDeDongBo[] = parsed.problems.map((p) => {
    const g = p.code !== undefined && giu.has(p.code);
    return { ...p, ...(g ? { giuLai: true, ...(daBao.has(chiaVanDe(p)) ? { daBao: true } : {}) } : {}) };
  });
  const giuLaiMoi = vanDe.some((p) => p.giuLai && !daThay.has(chiaVanDe(p)));
  await applySync(db, plan, { at, nguoiPhat, itemCount: parsed.items.length, problems: vanDe, giuLaiMoi });
  const canBao = vanDe.filter((p) => p.giuLai && !p.daBao);
  if (canBao.length && opts.baoTin) {
    try {
      await opts.baoTin(soanTinDongHong(canBao.map((p) => ({ ten: existing.get(p.code!)?.name ?? p.code!, ma: p.code!, row: p.row, lyDo: p.message.replace(`${p.code}: `, "") }))));
      for (const p of canBao) p.daBao = true;
      await ghiVanDe(db, vanDe);
    } catch {
      /* không gửi được tin thì để dấu «chưa báo» — lần đồng bộ sau thử lại; đồng bộ không được vỡ vì kênh tin */
    }
  }
  return {
    ok: true,
    added: plan.added.length,
    changed: plan.changed.length,
    hidden: plan.missing.length,
    unchanged: plan.unchanged,
    itemCount: parsed.items.length,
    problems: vanDe,
    giuLai: plan.giuLai.length,
    warnings: parsed.warnings,
  };
}

/**
 * Lần đọc đầu tiên sau khi triển khai: chưa từng đồng bộ lần nào thì đồng bộ ngay, không đợi Cron.
 * Chỉ request giành được quyền mới gọi Sheet; request khác cùng lúc trả danh mục hiện có (có thể rỗng → giao diện cho nhập tay).
 * `tacNhanDongBo`: tác nhân DONG_BO_DANH_MUC (ADR-0186) — việc ghi do máy làm, KHÔNG mang mã người đang mở trang.
 */
export async function bootstrapIfNeverSynced(env: Env, tacNhanDongBo: PermissionHolder): Promise<void> {
  if (await claimFirstSync(env.DB, new Date().toISOString())) await syncCatalog(env, tacNhanDongBo);
}

