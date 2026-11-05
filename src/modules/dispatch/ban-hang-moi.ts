// Phần của «Bán hàng phụ trách» (ADR-0142) cần ĐỌC TÀI KHOẢN (module staff): ai mời được, và lời mời còn hợp lệ không. Tách khỏi `ban-hang.ts` vì tệp SQL của module
// nghiêm phải nạp được trực tiếp bằng node (bài EXPLAIN của architecture.test.ts) và không kéo module staff theo. Không có SQL ở đây.
import { hasPermission, holdsPartner } from "../../shared/permissions";
import type { StaffAccount } from "../../shared/contracts";
import { getStaffAccount, getStaffAccountOfParty, listStaffAccounts } from "../staff";
import { loiMoiMoTho } from "./ban-hang";

/** Hồ sơ mời được làm Bán hàng phụ trách: đang hoạt động, có hồ sơ, giữ `SALES`, không giữ `PARTNER` (kể cả tài khoản lai). */
function hopLeMoi(a: StaffAccount | null): { ok: true; partyId: string; name: string } | { ok: false; message: string } {
  if (!a) return { ok: false, message: "Không tìm thấy nhân viên được chọn." };
  if (!a.active) return { ok: false, message: "Nhân viên này đã ngưng hoạt động, không mời được." };
  if (!a.partyId) return { ok: false, message: "Nhân viên này chưa có hồ sơ, không mời được." };
  if (holdsPartner(a)) return { ok: false, message: "Tài khoản có quyền Đối tác không làm người phụ trách được." };
  if (!hasPermission(a, "SALES")) return { ok: false, message: "Chỉ mời được người có quyền Bán hàng." };
  return { ok: true, partyId: a.partyId, name: a.fullName };
}

export async function kiemBanHangMoi(db: D1Database, staffId: string): Promise<{ ok: true; partyId: string; name: string } | { ok: false; message: string }> {
  return hopLeMoi(await getStaffAccount(db, staffId));
}

/** Kiểm lại người được mời từ HỒ SƠ ghi trên đơn (lúc ghi nhận). Thành công trả thêm `staffId` để báo / hiện tên. */
export async function kiemBanHangMoiTheoHoSo(db: D1Database, partyId: string): Promise<{ ok: true; partyId: string; name: string; staffId: string } | { ok: false; message: string }> {
  const a = await getStaffAccountOfParty(db, partyId);
  const r = hopLeMoi(a);
  return r.ok ? { ...r, staffId: a!.id } : r;
}

/** Những người mời được (chỉ id tài khoản và tên — không SĐT, không email), thứ tự theo `listStaffAccounts`. */
export async function danhSachBanHangMoi(db: D1Database): Promise<{ staffId: string; name: string }[]> {
  return (await listStaffAccounts(db)).flatMap((a) => {
    const r = hopLeMoi(a);
    return r.ok ? [{ staffId: a.id, name: r.name }] : [];
  });
}

/** Lời mời đang mở của đơn. `xConHopLe` = người được mời hôm nay còn đủ điều kiện (hoạt động, giữ Bán hàng, không giữ Đối tác). */
export async function loiMoiMoCua(db: D1Database, orderId: string): Promise<{ staffId: string | null; name: string; hanIso: string; xConHopLe: boolean } | null> {
  const r = await loiMoiMoTho(db, orderId);
  if (!r) return null;
  return { ...r, xConHopLe: r.staffId !== null && (await kiemBanHangMoi(db, r.staffId)).ok };
}
