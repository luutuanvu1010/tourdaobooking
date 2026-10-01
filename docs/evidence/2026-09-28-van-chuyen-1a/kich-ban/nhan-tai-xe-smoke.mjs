// Kịch bản Chrome — soát hai trang có sẵn tự hiện quyền / vai mới của ADR-0040 D3 (điều phối giao Phần B, 2026-09-28): web/role-picker.ts (màn Quản lý tài khoản)
// và web/gui-thong-bao.ts (Gửi thông báo) lặp danh sách mã quyền / mã vai nên tự có "Tài xế". Kiểm:
// 1) Quản lý tài khoản (Quản trị, 1040 + 390): nhóm Nội bộ có ô vai "Tài xế công ty"; tick → xem trước "Quyền sẽ có: Tài xế."; phần "Chỉnh riêng" có ô quyền
//    "Tài xế"; KHÔNG chữ thô "DRIVER" / "DRIVER_INTERNAL" nào lộ ra chữ nhìn thấy.
// 2) Gửi thông báo (Toàn quyền, 1040 + 390): ô nhóm "Tài xế" nằm cùng các nhóm quyền khác; không chữ thô "DRIVER".
// Chạy từ GỐC repo, sau `npm run build:web`:
//   AXE_JS=<…/axe.min.js> CHROME_BIN=docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh OUT=<thư mục ảnh> node docs/evidence/2026-09-28-van-chuyen-1a/kich-ban/nhan-tai-xe-smoke.mjs
import { DESK, MOB, SUPER, assert, boDem, dungMoiTruong, shotFull } from "./vc-lib.mjs";

const dem = boDem("NHAN TAI XE SMOKE");
const { env } = await dungMoiTruong([SUPER]);
try {
  for (const [id, ten, vp] of [["1a", "1040", DESK], ["1b", "390", MOB]]) {
    await dem.step(id, `Quản lý tài khoản (${ten}): vai “Tài xế công ty” ở nhóm Nội bộ → xem trước “Tài xế”; ô chỉnh riêng “Tài xế”; không lộ mã DRIVER`, async () => {
      const p = await env.as(SUPER, "/staff", vp); // ADR-0071 điều 1b: Quản trị không còn form Thêm tài khoản — mở bằng Toàn quyền
      try {
        await p.waitFor("!!document.querySelector('#add-perms [data-kind=role]')", "khối vai của form thêm tài khoản", 10000);
        const s = await p.ev(`(() => {
          const box = [...document.querySelectorAll('#add-perms input[data-kind=role]')].find((b) => b.closest('label')?.textContent.trim() === 'Tài xế công ty');
          const nhom = box?.closest('label')?.parentElement?.querySelector('strong')?.textContent.trim() ?? null; // roleGroup(): <div><strong>Nhóm</strong><label>…
          box?.click();
          const add = [...document.querySelectorAll('#add-perms input[data-kind=add]')].map((b) => b.closest('label').textContent.trim());
          return { co: !!box, preview: document.querySelector('#add-perms [data-role-preview]')?.textContent.trim() ?? null, add, nhom, text: document.body.innerText };
        })()`);
        assert.equal(s.co, true, "có ô vai “Tài xế công ty”");
        assert.equal(s.nhom, "Nội bộ", "vai nằm ở nhóm Nội bộ");
        assert.ok((s.preview ?? "").startsWith("Quyền sẽ có: Tài xế."), `xem trước: ${s.preview}`);
        assert.ok(s.add.includes("Tài xế"), `ô chỉnh riêng: ${JSON.stringify(s.add)}`);
        assert.ok(!/\bDRIVER(_INTERNAL)?\b/.test(s.text), "không lộ mã thô DRIVER");
        await shotFull(p, `nhan-tai-xe-quan-ly-tai-khoan-${ten}.png`);
      } finally {
        p.close();
      }
    });
  }
  for (const [id, ten, vp] of [["2a", "1040", DESK], ["2b", "390", MOB]]) {
    await dem.step(id, `Gửi thông báo (${ten}): nhóm “Tài xế” cùng các nhóm quyền; không lộ mã DRIVER`, async () => {
      const p = await env.as(SUPER, "/gui-thong-bao", vp);
      try {
        await p.waitFor("document.querySelectorAll('#form input[type=checkbox]').length > 0", "form gửi thông báo", 10000);
        const s = await p.ev(`({ nhom: [...document.querySelectorAll('#form label')].map((l) => l.textContent.trim()), text: document.body.innerText })`);
        assert.ok(s.nhom.includes("Tài xế"), `nhóm: ${JSON.stringify(s.nhom)}`);
        assert.ok(!/\bDRIVER(_INTERNAL)?\b/.test(s.text), "không lộ mã thô DRIVER");
        await shotFull(p, `nhan-tai-xe-gui-thong-bao-${ten}.png`);
      } finally {
        p.close();
      }
    });
  }
} finally {
  await env.stop();
}
dem.xong();
