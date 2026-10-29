// Kế thừa từ kịch bản cùng tên của phiên a45f9ae5 (nhánh worktree-danh-gia-ux-tong-the, 27/10/2026); phiên này (v2) đổi cổng 8795 + kho ~/tourdao-ux-2026-10-27-v2 và bổ sung theo đề bài bản mới.
// Sinh bảng "bộ quyền → trang có lối vào / mục thanh bên" và "vai → bộ quyền" THẲNG từ mã (src/shared/roles.ts, src/shared/muc-giao-dien.ts),
// không chép tay. Chạy từ GỐC kho: node docs/evidence/2026-10-27-danh-gia-ux-tong-the/kich-ban/ma-tran-quyen.mjs > <tệp>.json
import { PAGES } from "../../../../src/shared/sw-policy.ts";
import { ROLES, ROLE_CODES, defaultPermissions } from "../../../../src/shared/roles.ts";
import { TRANG, THANH_BEN } from "../../../../src/shared/muc-giao-dien.ts";
import { homeRedirect } from "../../../../src/shared/start-page.ts";

// Mười bộ quyền theo quyết định (6) của chủ 27/10. Toàn quyền đo bằng tổ hợp vai thật sinh ra (vai IT = ADMIN + SUPER_ADMIN).
export const BO_QUYEN = {
  SALES: ["SALES"], INTERN: ["INTERN"], ACCOUNTING: ["ACCOUNTING"], ADMIN: ["ADMIN"], FIELD: ["FIELD"], PARTNER: ["PARTNER"],
  SUPER_ADMIN: ["ADMIN", "SUPER_ADMIN"], DRIVER: ["DRIVER"], DRIVER_PARTNER: ["DRIVER_PARTNER"], HR: ["HR"],
};

const vaiVeBo = ROLE_CODES.map((r) => ({ vai: r, ten: ROLES[r].name, nhom: ROLES[r].group, quyen: defaultPermissions([r]), chiToanQuyenGan: ROLES[r].superAdminOnly }));
const out = { vaiVeBo, bo: {} };
for (const [bo, permissions] of Object.entries(BO_QUYEN)) {
  const s = { id: "x", permissions };
  const trang = Object.entries(TRANG).filter(([, t]) => t.hien(s)).flatMap(([, t]) => [t.duong, ...(t.cungSang ?? [])]);
  const thanhBen = THANH_BEN.filter((m) => TRANG[m.trang].hien(s) && (!m.chiKhi || m.chiKhi.that(s))).map((m) => `${m.nhom}: ${m.nhan}`);
  let dau = null;
  try { dau = homeRedirect(s) ?? "/"; } catch { /* hàm có chữ ký khác — bỏ */ }
  out.bo[bo] = { permissions, trangDau: dau, trang: [...new Set(trang)], khongLoiVao: PAGES.filter((p) => !trang.includes(p)), thanhBen, soMucThanhBen: thanhBen.filter((m) => !m.endsWith("Tạo đơn")).length };
}
console.log(JSON.stringify(out, null, 1));
