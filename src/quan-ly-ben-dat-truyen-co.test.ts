// ADR-0213 Đ5, Đ8.1 (mốc B1 Task 12; ruling R13): BÀI QUÉT cờ `quanLyBenDat`.
// (1) Danh sách ô nhận cờ ghim ĐÚNG bảy ô — đỏ khi thiếu lẫn khi thừa (một ô ghi lọt vào là người quản lý sửa / huỷ được đơn người khác lập).
// (2) Mọi lời gọi `can(…, "<ô trong danh sách>", ngữ cảnh)` ở mã máy chủ (src/modules, src/index.ts) phải TRUYỀN cờ — ngữ cảnh có chữ `quanLyBenDat`, hoặc là biến khai gần nhất có chữ đó —
//     trừ ngữ cảnh «của chính mình» (`{ ownerId: staff.id }`), «đang phụ trách» (`{ assigned: true }`), không ngữ cảnh (ô `any`), và các miễn CÓ TÊN dưới (có lý do; miễn thừa cũng đỏ).
//     Route mới đọc đơn theo người lập mà quên cờ ⇒ đỏ: người quản lý tổ chức thôi thấy đơn của tổ chức ở đường đó (khuôn bài `assigned`, CLAUDE.md §10).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { O_NHAN_QUAN_LY_BEN_DAT } from "./shared/permissions.ts";

const GOC = new URL("..", import.meta.url).pathname;

test("R13: danh sách ô nhận cờ `quanLyBenDat` đúng bảy ô — thiếu hay thừa đều đỏ", () => {
  const mong = ["order.view", "money.view", "order.history.view", "contact.view", "order.submit", "dai-ly.nop.xem", "payment.proof.view"];
  assert.deepEqual([...O_NHAN_QUAN_LY_BEN_DAT].sort(), [...mong].sort());
  for (const cam of ["order.modify", "order.passenger.write", "dai-ly.nop.ghi", "ve.cap.send", "credit.own.view", "order.terms.view"]) {
    assert.ok(!(O_NHAN_QUAN_LY_BEN_DAT as readonly string[]).includes(cam), `${cam} không bao giờ nhận cờ`);
  }
});

function tepMay(): string[] {
  const out: string[] = [join(GOC, "src/index.ts")];
  const di = (d: string) => {
    for (const ten of readdirSync(d)) {
      const p = join(d, ten);
      if (statSync(p).isDirectory()) di(p);
      else if (p.endsWith(".ts") && !p.endsWith(".test.ts")) out.push(p);
    }
  };
  di(join(GOC, "src/modules"));
  return out;
}

/** Đối số thứ ba của `can(` (đến ngoặc đóng tương ứng) — null khi chỉ hai đối số. */
function doiSoBa(s: string, tu: number): string | null {
  let sau = 0;
  let i = tu;
  let bat = -1;
  let phay = 0;
  for (; i < s.length; i++) {
    const c = s[i];
    if (c === "(" || c === "{" || c === "[") sau++;
    else if (c === ")" || c === "}" || c === "]") {
      if (sau === 0) break;
      sau--;
    } else if (c === "," && sau === 0 && ++phay === 2) bat = i + 1;
  }
  return bat === -1 ? null : s.slice(bat, i).trim();
}
const gon = (x: string) => x.replace(/\s+/g, " ").trim();

/**
 * MIỄN CÓ TÊN: `tệp|ô|ngữ cảnh` → số lời gọi khớp + lý do. Số khớp phải ĐÚNG `so` (vòng sửa 1: thêm một lời gọi cùng khoá — ví dụ `const scope = { ownerId, assigned }` ở route mới — ⇒ lệch số ⇒ đỏ; miễn thừa ⇒ đỏ).
 */
const MIEN: Record<string, { so: number; lyDo: string }> = {
  // Kho vé (ADR-0170 Đ1): sau `order.view` route còn hỏi `ve.cap.send` (không nhận cờ — vé giữ cho người lập) ⇒ cờ không đổi kết quả; kho vé không đọc bên đặt của đơn.
  "src/modules/ve-dien-tu/index.ts|order.view|{ ownerId: chu, assigned }": { so: 1, lyDo: "ADR-0170 Đ1: ve.cap.send chặn ngay sau" },
  // Quét vé (ADR-0175 Đ3): Đối tác không có ô quét (`ve.quet.*` none) — không bao giờ tới đây.
  "src/index.ts|order.view|ctx": { so: 1, lyDo: "ADR-0175: Đối tác không quét vé" },
  "src/index.ts|money.view|ctx": { so: 1, lyDo: "ADR-0175: Đối tác không quét vé" },
  // Bán hàng phụ trách (ADR-0142): thông tin người Bán hàng của đơn — việc của văn phòng; dispatch (module nghiêm) không đọc bên đặt. B1 không mở cho người quản lý tổ chức.
  "src/modules/dispatch/ban-hang-route.ts|order.view|{ ownerId: o.staffId, assigned: duocGiao }": { so: 1, lyDo: "ADR-0142: việc văn phòng, không thuộc Đ5" },
  // Phần thương mại (hoa hồng) của đơn: `order.terms.view` không thuộc R13 và `cheDoThuongMai` chặn Đối tác trên đơn không phải của mình — B1 không mở hoa hồng tổ chức cho người quản lý.
  "src/modules/orders/index.ts|order.view|scope": { so: 1, lyDo: "order.terms.view ngoài R13 (thuong-mai)" },
  // Dấu nhập phần mềm kế toán: `accounting.entry.view` của Đối tác = none ⇒ 403 dù cờ đúng.
  "src/modules/billing/index.ts|order.view|scope": { so: 1, lyDo: "accounting.entry.view của Đối tác none (nhap-ke-toan)" },
};

test("mọi `can()` xét ô thuộc danh sách R13 truyền cờ `quanLyBenDat` (hoặc là ngữ cảnh của chính mình / đang phụ trách / miễn có tên)", () => {
  const ds = O_NHAN_QUAN_LY_BEN_DAT as readonly string[];
  const thieu: string[] = [];
  const dungMien = new Map<string, number>();
  for (const tep of tepMay()) {
    const s = readFileSync(tep, "utf8");
    const ten = relative(GOC, tep);
    const re = /\bcan\(\s*[\w.!]+\s*,\s*"([a-z.\-_]+)"/g;
    for (let m = re.exec(s); m; m = re.exec(s)) {
      const op = m[1]!;
      if (!ds.includes(op)) continue;
      const ba = doiSoBa(s, m.index + "can(".length);
      if (ba === null) continue; // không ngữ cảnh: chỉ ô `any` trả true — cờ không liên quan
      const ctx = gon(ba);
      if (ctx.includes("quanLyBenDat")) continue;
      if (ctx === "{ ownerId: staff.id }" || ctx === "{ assigned: true }") continue;
      if (/^[A-Za-z_]\w*$/.test(ctx)) {
        // biến: lấy lời khai `const <tên> =` GẦN NHẤT phía trước
        const truoc = s.slice(0, m.index);
        const k = truoc.lastIndexOf(`const ${ctx} =`);
        const khai = k === -1 ? "" : gon(truoc.slice(k, truoc.indexOf(";", k) === -1 ? undefined : truoc.indexOf(";", k)));
        if (khai.includes("quanLyBenDat")) continue;
        if (khai === `const ${ctx} = { ownerId: staff.id }` || khai === `const ${ctx} = { assigned: true }`) continue; // «Đơn của tôi»: phạm vi tổ chức đi bằng SQL (`quanLy` của listOrders)
      }
      const khoa = `${ten}|${op}|${ctx}`;
      if (khoa in MIEN) { dungMien.set(khoa, (dungMien.get(khoa) ?? 0) + 1); continue; }
      thieu.push(`${khoa}  (dòng ${s.slice(0, m.index).split("\n").length})`);
    }
  }
  assert.deepEqual(thieu, [], "lời gọi xét ô của đơn mà không truyền cờ quanLyBenDat — truyền cờ (ctx.laQuanLyCuaBen) hoặc thêm miễn có tên kèm lý do");
  assert.deepEqual(Object.entries(MIEN).filter(([k, m]) => (dungMien.get(k) ?? 0) !== m.so).map(([k, m]) => `${k}: khớp ${dungMien.get(k) ?? 0}, bảng ghi ${m.so} (${m.lyDo})`), [],
    "miễn lệch số — lời gọi mới cùng kiểu phải truyền cờ hoặc tự mang miễn có lý do; miễn thừa thì xoá");
});
