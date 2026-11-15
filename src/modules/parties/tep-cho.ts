// Tệp chờ của phiếu đăng ký (ADR-0208 Đ1, Đ2, Đ5, Đ7). `parties` giữ bảng `pty_registration_attachment` và là module DUY NHẤT chạm kho `HO_SO` cho tệp này;
// `dang-ky` chỉ gọi các hàm dưới đây qua `parties/index.ts`. Các hàm `cau*` trả CÂU LỆNH CHƯA CHẠY để module gọi gộp vào lô của mình (từ chối, rút, hết hạn, duyệt).
// Thứ tự an toàn: lô D1 TRƯỚC, đặt kho SAU, đánh dấu đã lưu; xoá kho chạy SAU lô ghi quyết gỡ (Hiến chương 5.16). Lỗi kho KHÔNG ném.
import { DO_DANG_SAU_MS, LOAI_NOI_DUNG, dauPhanHoiTep, khoaNgauNhien, nhanLoaiTep, type LoaiTep } from "./tep.ts";
import {
  chuyenTepChoStatements, demTepChoCuaPhieu, findTepChoTrung, goTepChoCuaOStatement, goTepChoCuaPhieuNeuTruocDoiStatement, goTepChoCuaPhieuStatement, insertTepChoStatement, markTepChoR2Deleted, markTepChoStored,
  goTepChoDoDang, tepChoChoXoaToanBang, tepChoDaGoCanXoaKho, tepChoDeXemDs, tepChoDeXemMot, tepChoTheoO, type TepChoXemRow,
} from "./repository.ts";

export const LY_DO_GO_TEP_CHO = { THAY_TEP: "THAY_TEP", KHONG_THUOC_BAN_KHAI: "KHONG_THUOC_BAN_KHAI" } as const;

export interface TepChoMoi { registrationId: string; slot: string; contentKind: LoaiTep; byteSize: number; contentHash: string; actorRef: string; toiDaMoiPhieu?: number | null }

/**
 * Câu lệnh thêm MỘT tệp chờ: (1) chèn dòng mới «chưa lưu», (2) gỡ tệp đang sống khác của CÙNG ô (thay tệp) — CHỈ khi dòng mới đã vào. `toiDaMoiPhieu` (tệp mỗi phiếu, KỂ CẢ tệp đã thay) kiểm NGAY TRONG câu chèn
 * nên chạy song song cũng không vượt trần: câu chèn (phần tử ĐẦU của `statements`) đổi 0 dòng ⇒ vượt trần. Người gọi chạy `db.batch(statements)` rồi mới `datKhoTepCho`.
 */
export function cauTepChoMoi(db: D1Database, v: TepChoMoi, at: string = new Date().toISOString()): { id: string; storageKey: string; statements: D1PreparedStatement[] } {
  const id = crypto.randomUUID();
  const storageKey = khoaNgauNhien();
  return {
    id,
    storageKey,
    statements: [
      insertTepChoStatement(db, { id, registrationId: v.registrationId, slot: v.slot, key: storageKey, loai: v.contentKind, kichThuoc: v.byteSize, bam: v.contentHash, at, actorRef: v.actorRef, toiDa: v.toiDaMoiPhieu ?? null }),
      goTepChoCuaOStatement(db, { registrationId: v.registrationId, slot: v.slot, at, lyDo: LY_DO_GO_TEP_CHO.THAY_TEP, tepMoiId: id }),
    ],
  };
}

/** Đặt byte vào kho rồi đánh dấu đã lưu. Kho / D1 lỗi, thiếu kho, hoặc câu đánh dấu không đổi dòng nào ⇒ `false` (KHÔNG ném): dòng còn «tải dở dang», gửi lại cùng tệp là xong. */
export async function datKhoTepCho(env: Env, id: string, storageKey: string, bytes: Uint8Array): Promise<boolean> {
  const kho = env.HO_SO;
  const loai = nhanLoaiTep(bytes.subarray(0, 16));
  if (!kho || !loai) return false;
  try {
    await kho.put(storageKey, bytes, { httpMetadata: { contentType: LOAI_NOI_DUNG[loai] } });
    return (await markTepChoStored(env.DB, id, new Date().toISOString())) === 1;
  } catch (e) {
    console.error(JSON.stringify({ level: "error", event: "tep_cho_dat_kho_loi", tepId: id, loi: e instanceof Error ? e.name : "unknown" }));
    return false;
  }
}

/** Tệp đang sống của cùng phiếu, cùng ô, cùng băm (bấm hai lần / gửi lại sau «tải dở dang»). Chỉ trả mã nội bộ và cờ đã lưu. */
export async function timTepChoTrung(db: D1Database, registrationId: string, slot: string, contentHash: string): Promise<{ id: string; storageKey: string; daLuu: boolean } | null> {
  const r = await findTepChoTrung(db, registrationId, slot, contentHash);
  return r ? { id: r.id, storageKey: r.storage_key, daLuu: r.stored_at !== null } : null;
}

/** Mỗi ô còn tệp sống: đã lưu hay chưa (DTO của phiếu chỉ mang «đã gửi / chưa tải xong» theo ô — ADR-0208 Đ3). */
export async function trangThaiTepChoTheoO(db: D1Database, registrationId: string): Promise<{ slot: string; daLuu: boolean }[]> {
  const ds = await tepChoTheoO(db, registrationId);
  const theoO = new Map<string, boolean>();
  for (const r of ds) theoO.set(r.slot, r.stored_at !== null);
  return [...theoO].map(([slot, daLuu]) => ({ slot, daLuu }));
}

/** Gỡ mọi tệp chờ chưa chuyển của phiếu (từ chối, rút, hết hạn — ADR-0208 Đ7). Xoá kho chạy SAU lô, bằng `xoaKhoTepChoDaGo`. `lyDo` là mã chữ hoa (CHECK của bảng). */
export const cauGoTepCho = (db: D1Database, registrationId: string, lyDo: string, at: string): D1PreparedStatement[] => [goTepChoCuaPhieuStatement(db, { registrationId, at, lyDo })];

/**
 * Lúc duyệt (ADR-0208 Đ5): mỗi tệp chờ ĐÃ LƯU thành một dòng `pty_attachment` của hồ sơ kết quả, dùng lại đúng mã và khoá kho, nối vào dòng giấy tờ `documentId`, người tạo là người duyệt;
 * dòng chờ nhận mốc «đã chuyển» và băm về rỗng. Tệp còn lại (chưa lưu) nhận quyết gỡ. Mỗi ô chỉ còn một tệp sống (tệp bị thay đã gỡ từ lúc thay) nên `version` không lọc thêm — giữ để
 * chữ ký khớp lệnh duyệt. Dòng giấy tờ `documentId` phải được chèn TRƯỚC trong cùng lô.
 */
export function cauChuyenTepCho(
  db: D1Database, v: { registrationId: string; version: number; partyId: string; documentId: string; approverId: string; at: string },
): D1PreparedStatement[] {
  return [
    ...chuyenTepChoStatements(db, v),
    goTepChoCuaPhieuStatement(db, { registrationId: v.registrationId, at: v.at, lyDo: LY_DO_GO_TEP_CHO.KHONG_THUOC_BAN_KHAI }),
  ];
}

/** Xoá khỏi kho các tệp chờ ĐÃ quyết gỡ của phiếu rồi đánh dấu; chạy SAU lô ghi quyết gỡ. Không bao giờ chạm dòng đã chuyển. Lỗi không ném: dòng còn «chờ xoá», chạy lại được. */
export async function xoaKhoTepChoDaGo(env: Env, registrationId: string, luc: () => string = () => new Date().toISOString()): Promise<{ daXoa: number; loi: number }> {
  const kho = env.HO_SO;
  const ds = await tepChoDaGoCanXoaKho(env.DB, registrationId);
  if (!kho) return { daXoa: 0, loi: ds.length };
  let daXoa = 0;
  let loi = 0;
  for (const t of ds) {
    try {
      await kho.delete(t.storage_key);
      await markTepChoR2Deleted(env.DB, t.id, luc());
      daXoa++;
    } catch (e) {
      loi++;
      console.error(JSON.stringify({ level: "error", event: "tep_cho_xoa_kho_loi", tepId: t.id, loi: e instanceof Error ? e.name : "unknown" }));
    }
  }
  return { daXoa, loi };
}

/**
 * Việc 3 của tác nhân dọn phiếu đăng ký (ADR-0208 Đ8, Hiến chương 5.16): (a) quyết gỡ tệp «tải dở dang» tạo trước `bayGio` − DO_DANG_SAU_MS (10 phút, cùng mốc của hàng chờ xoá tệp hồ sơ); (b) xoá khỏi kho tối đa `toiDa` tệp ở hàng «chờ xoá» (đã quyết gỡ,
 * kho chưa xoá — kể cả tệp của lần rút thứ hai không chạy lại xoá kho) rồi đánh dấu. Không bao giờ chạm dòng đã chuyển. Lỗi kho KHÔNG ném: dòng còn «chờ xoá», lượt sau chạy lại.
 * Người gọi đã hỏi `can()` cho ô của mình; trả số tệp đã xoá khỏi kho (không mã tệp, không khoá kho).
 */
export async function donKhoTepCho(env: Env, toiDa: number, bayGio: Date, luc: () => string = () => new Date().toISOString()): Promise<number> {
  await goTepChoDoDang(env.DB, new Date(bayGio.getTime() - DO_DANG_SAU_MS).toISOString(), luc());
  const kho = env.HO_SO;
  if (!kho) return 0;
  let daXoa = 0;
  for (const t of await tepChoChoXoaToanBang(env.DB, toiDa)) {
    try {
      await kho.delete(t.storage_key);
      daXoa += await markTepChoR2Deleted(env.DB, t.id, luc());
    } catch (e) {
      console.error(JSON.stringify({ level: "error", event: "tep_cho_xoa_kho_loi", tepId: t.id, loi: e instanceof Error ? e.name : "unknown" }));
    }
  }
  return daXoa;
}

/**
 * Như `cauGoTepCho` nhưng CHỈ gỡ khi câu liền trước trong lô đã đổi dòng (`changes() > 0`). Bất biến người gọi phải giữ: câu liền trước chính nó phải được điều kiện theo câu đổi trạng thái
 * (dòng lịch sử `WHERE changes() > 0`, nhật ký `onlyIf changes() > 0`), nên chuỗi chỉ «sống» khi câu đổi trạng thái trúng. Phiếu bị người khác xử lý giữa lúc bấm thì lô không đổi gì và tệp ở lại.
 */
export const cauGoTepChoNeuTruocDoi = (db: D1Database, registrationId: string, lyDo: string, at: string): D1PreparedStatement =>
  goTepChoCuaPhieuNeuTruocDoiStatement(db, { registrationId, at, lyDo });

export interface TepChoDeXem { id: string; slot: string; loai: LoaiTep; storageKey: string }
const nhanTep = (r: TepChoXemRow): TepChoDeXem => ({ id: r.id, slot: r.slot, loai: r.content_kind as LoaiTep, storageKey: r.storage_key });
/** Tệp chờ đang sống và ĐÃ LƯU của phiếu, để người xác minh xem (chỉ gọi sau khi route kiểm quyền). Mã tệp hiện cho người xác minh; khoá kho KHÔNG ra khỏi dang-ky ngoài hàm mở kho dưới đây. */
export async function tepChoDeXemCuaPhieu(db: D1Database, registrationId: string): Promise<TepChoDeXem[]> {
  return (await tepChoDeXemDs(db, registrationId)).map(nhanTep);
}
export async function timTepChoDeXem(db: D1Database, registrationId: string, tepId: string): Promise<TepChoDeXem | null> {
  const r = await tepChoDeXemMot(db, registrationId, tepId);
  return r ? nhanTep(r) : null;
}
/** Kho tệp hồ sơ đã gắn chưa (route trả 503 khi chưa). Chỉ parties được nhắc binding kho (bài src/kho-tep-ho-so.test.ts). */
export const khoTepChoSanSang = (env: Env): boolean => env.HO_SO !== undefined;

/**
 * Mở đối tượng trong kho kèm header trả về (no-store, nosniff, không tên tệp gốc). Gọi SAU khi nhật ký đã ghi (ADR-0208 Đ3). `null` = thiếu kho hoặc thiếu đối tượng (route trả 404).
 * Đây là chỗ đọc kho THỨ HAI trong parties, có tên: chỉ đọc tệp chờ của phiếu đăng ký, và chỉ module dang-ky gọi, sau cổng quyền + nhật ký của chính route xem tệp.
 */
export async function moTepChoTuKho(env: Env, tep: TepChoDeXem): Promise<{ body: ReadableStream; headers: Record<string, string> } | null> {
  const kho = env.HO_SO;
  if (!kho) return null;
  const obj = await kho.get(tep.storageKey);
  if (!obj) {
    console.error(JSON.stringify({ level: "error", event: "tep_cho_thieu_doi_tuong", tepId: tep.id }));
    return null;
  }
  return { body: obj.body, headers: dauPhanHoiTep({ id: tep.id, loai: tep.loai }) };
}
