// G-06(h) (9/11/2026): các dòng «thanh tab», «Đầu menu», «Chân menu» của mục «Menu của bạn» phải khớp ĐÚNG menu mà bộ quyền đại diện của nhóm đang thấy.
// Lỗi cũ: hướng dẫn tự gõ tên mục (Đối tác ghi 3 tab thay vì 4, chân menu ghi «Hướng dẫn» thay vì «Nhật ký thay đổi», Quản trị ghi tab «Dịch vụ», «Tài khoản» không có).
// Quy ước câu (để máy đọc được): «Thanh tab dưới đáy: [[A]], [[B]].», «Đầu menu: [[A]], [[B]].», «Chân menu: [[A]], [[B]].» — tên cần kiểm nằm giữa dấu hai chấm và dấu chấm đầu tiên.
import { test } from "node:test";
import assert from "node:assert/strict";
import { HUONG_DAN } from "./huong-dan.ts";
import { thanhBen, thanhTab } from "./muc-giao-dien.ts";
import type { PermissionCode } from "./permissions.ts";

/** Bộ quyền đại diện của từng nhóm hướng dẫn. Nhóm không có ở đây (Phần chung) không có mục «Menu của bạn». */
const DAI_DIEN: Record<string, PermissionCode[]> = {
  "ban-hang": ["SALES"],
  "quan-ly-ban-hang": ["SALES", "SALES_MANAGER"],
  hdv: ["FIELD"],
  "ke-toan": ["ACCOUNTING"],
  "doi-tac": ["PARTNER"],
  "tai-xe": ["DRIVER"],
  "nhan-su": ["HR"],
  "quan-tri": ["ADMIN"],
};
/** Nhóm nói «các mục khác giống Bán hàng» — không tự liệt kê tab / đầu menu / chân menu. */
const KE_THUA = new Set(["quan-ly-ban-hang"]);

const who = (p: PermissionCode[]) => ({ staff: { id: "s", permissions: p } });
/** Tên [[…]] của một câu: từ sau «marker» tới dấu chấm đầu tiên (hoặc hết dòng). */
function tenCauSau(noiDung: string, marker: RegExp): string[] | null {
  for (const dong of noiDung.split("\n")) {
    const m = marker.exec(dong);
    if (!m) continue;
    const sau = dong.slice(m.index + m[0].length);
    const cat = sau.search(/\.(\s|$)/);
    return [...(cat === -1 ? sau : sau.slice(0, cat)).matchAll(/\[\[([^\]]+)\]\]/g)].map((x) => x[1]!);
  }
  return null;
}
const menuCua = (id: string): string => HUONG_DAN.find((n) => n.id === id)!.muc.find((m) => m.tieuDe === "Menu của bạn")!.noiDung;

test("mọi nhóm có đại diện (trừ Phần chung) và đại diện thuộc đúng nhóm", () => {
  for (const n of HUONG_DAN.filter((x) => x.quyen.length > 0)) {
    assert.ok(DAI_DIEN[n.id], `nhóm ${n.id} chưa có bộ quyền đại diện`);
    assert.ok(DAI_DIEN[n.id]!.some((q) => (n.quyen as readonly string[]).includes(q)), `${n.id}: đại diện không thuộc nhóm`);
  }
});

for (const [id, quyen] of Object.entries(DAI_DIEN)) {
  test(`G-06h ${id}: tab, Đầu menu, Chân menu của hướng dẫn khớp menu thật`, () => {
    const n = who(quyen);
    const nd = menuCua(id);
    const tab = tenCauSau(nd, /thanh tab dưới đáy\s*:/i);
    const dau = tenCauSau(nd, /đầu menu\*{0,2}\s*:\s*/i);
    const chan = tenCauSau(nd, /chân menu\*{0,2}\s*:\s*/i);
    const thucTab = thanhTab(n).map((t) => t.nhan);
    const thucBen = thanhBen(n, "/");
    const thucDau = thucBen.find((g) => g.nhom === "HẰNG NGÀY")!.muc.map((m) => m.nhan);
    const thucChan = thucBen.find((g) => g.nhom === "CHÂN MENU")!.muc.map((m) => m.nhan);
    if (KE_THUA.has(id)) return;
    assert.deepEqual(tab, thucTab, `${id}: thanh tab ghi ${JSON.stringify(tab)}, thật là ${JSON.stringify(thucTab)}`);
    assert.deepEqual(chan, thucChan, `${id}: chân menu ghi ${JSON.stringify(chan)}, thật là ${JSON.stringify(thucChan)}`);
    // Đầu menu: nhóm không có mục HẰNG NGÀY thì không cần dòng; có thì phải đúng, và «Tạo đơn» ở thanh trên cùng — không phải đầu menu.
    if (thucDau.length > 0) assert.deepEqual(dau, thucDau, `${id}: đầu menu ghi ${JSON.stringify(dau)}, thật là ${JSON.stringify(thucDau)}`);
    else assert.equal(dau, null, `${id}: không có mục HẰNG NGÀY nhưng hướng dẫn có dòng Đầu menu`);
    assert.ok(!(dau ?? []).includes("Tạo đơn"), `${id}: «Tạo đơn» không nằm ở đầu menu (nó ở thanh trên cùng)`);
  });
}
