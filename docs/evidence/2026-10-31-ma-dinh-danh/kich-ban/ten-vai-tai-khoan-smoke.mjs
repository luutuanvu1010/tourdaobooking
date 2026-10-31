// Kịch bản Chrome NHỎ — màn «Quản lý tài khoản» sau khi đổi tên MỘT loại đối tác Có sẵn (mã định danh 5.26; kế hoạch docs/superpowers/plans/2026-10-31-ma-dinh-danh-va-sua-loai-doi-tac.md
// Task 3b → Task 6; đặc tả §5 câu 2: «tên mới hiện cả trên màn tài khoản»). Tách khỏi hoa-hong-smoke.mjs vì đổi tên vai Có sẵn làm lệch các bước khác của kịch bản đó.
// Dữ liệu dựng bằng API TRƯỚC khi mở trang (luật một máy ADR-0075): Toàn quyền tạo tài khoản Đối tác vai «Cộng tác viên» (COLLABORATOR) qua route thật; Kế toán đổi tên loại đó
// bằng PATCH /api/pricing/loai-doi-tac/COLLABORATOR; rồi Toàn quyền mở /staff ở 1040 và 390 ⇒ dòng / thẻ của tài khoản hiện TÊN MỚI, không còn tên cũ; axe (critical / serious ⇒ đỏ).
// Môi trường: D1 tạm + wrangler dev + Chrome headless qua CDP (docs/evidence/2026-09-20-a2/kich-ban/a2-cdp.mjs) — Turnstile TẮT, không --remote, không gọi production.
// Chạy từ GỐC repo, sau `npm run build:web`:
//   AXE_JS=<…/axe.min.js> CHROME_BIN=$PWD/docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh node docs/evidence/2026-10-31-ma-dinh-danh/kich-ban/ten-vai-tai-khoan-smoke.mjs
// Cuối: "TEN VAI SMOKE OK".
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ACCOUNTS, docAxe, goiApi, ok, startEnv } from "../../2026-10-08-qr-thanh-toan/kich-ban/qr-chung.mjs";

const AXE = docAxe();
const OUT = process.env.OUT ?? join(process.cwd(), "docs/evidence/2026-10-31-ma-dinh-danh");
mkdirSync(OUT, { recursive: true });
const KHO = [["1040", { width: 1040, height: 900, mobile: false }], ["390", { width: 390, height: 844, mobile: true }]];
const TEN_CU = "Cộng tác viên";
const TEN_MOI = "Cộng tác viên giới thiệu khách";

const env = await startEnv();
try {
  const { call } = goiApi(env);
  const phai = (r, status, nhan) => { assert.equal(r.status, status, `${nhan}: ${r.status} ${JSON.stringify(r.json)}`); return r.json; };
  const TEN_TK = "Đối Tác Đổi Tên Vai";
  phai(await call(ACCOUNTS.chu, "POST", "/api/staff", { taoHoSoMoi: true, fullName: TEN_TK, phone: "0900000291", roles: ["COLLABORATOR"] }), 201, "Toàn quyền tạo tài khoản vai Cộng tác viên");
  const truoc = phai(await call(ACCOUNTS.accounting, "GET", "/api/pricing/loai-doi-tac"), 200, "loại").loai.find((l) => l.code === "COLLABORATOR");
  assert.deepEqual([truoc.ten, truoc.coSan], [TEN_CU, true], "loại Có sẵn trước khi đổi");
  const sau = phai(await call(ACCOUNTS.accounting, "PATCH", "/api/pricing/loai-doi-tac/COLLABORATOR", { ten: TEN_MOI, updatedAt: truoc.updatedAt }), 200, "Kế toán đổi tên loại Có sẵn").loai;
  assert.deepEqual([sau.code, sau.ten], ["COLLABORATOR", TEN_MOI], "mã giữ, tên mới");
  const ds = phai(await call(ACCOUNTS.chu, "GET", "/api/staff"), 200, "danh sách tài khoản");
  assert.equal(ds.tenVai.COLLABORATOR, TEN_MOI, "GET /api/staff trả tên vai mới");
  ok("dữ liệu: tài khoản vai Cộng tác viên; Kế toán đổi tên loại Có sẵn ⇒ 200, mã giữ; GET /api/staff → tenVai mới");

  for (const [ten, vp] of KHO) {
    const p = await env.openPage(vp);
    try {
      const c = await env.login(ACCOUNTS.chu);
      await p.send("Network.setCookie", { name: c.name, value: c.value, url: env.base, httpOnly: true });
      await p.send("Page.navigate", { url: `${env.base}/staff` });
      await p.waitFor("document.readyState === 'complete'", "trang /staff tải xong");
      const sel = vp.mobile ? ".card-list .card" : "#list tr";
      await p.waitFor(`[...document.querySelectorAll(${JSON.stringify(sel)})].some((e) => e.textContent.includes(${JSON.stringify(TEN_TK)}))`, "dòng của tài khoản");
      const chu = await p.ev(`[...document.querySelectorAll(${JSON.stringify(sel)})].find((e) => e.textContent.includes(${JSON.stringify(TEN_TK)})).innerText`);
      assert.ok(chu.includes(TEN_MOI), `[${ten}] dòng tài khoản hiện tên vai mới: ${chu}`);
      assert.ok(!chu.replace(TEN_MOI, "").includes(TEN_CU), `[${ten}] không còn tên vai cũ: ${chu}`);
      const sw = await p.ev("[document.documentElement.scrollWidth, innerWidth]");
      assert.ok(sw[0] <= sw[1], `[${ten}] tràn ngang ${sw}`);
      await p.ev(`${AXE}\n;true`);
      const vi = await p.ev("axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'best-practice'], rules: { 'meta-viewport': { enabled: false } } }).then((r) => r.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious').map((v) => v.id + ' ' + v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ')))");
      assert.deepEqual(vi, [], `[${ten}] axe nghiêm trọng`);
      await p.ev(`document.querySelector(${JSON.stringify(sel)}) && [...document.querySelectorAll(${JSON.stringify(sel)})].find((e) => e.textContent.includes(${JSON.stringify(TEN_TK)})).scrollIntoView({ block: 'center' }), true`);
      await new Promise((r) => setTimeout(r, 700));
      const shot = await p.send("Page.captureScreenshot", { format: "png" });
      writeFileSync(join(OUT, `tai-khoan-ten-vai-moi-${ten}.png`), Buffer.from(shot.result.data, "base64"));
      assert.deepEqual(p.consoleErrors, [], `[${ten}] lỗi console: ${p.consoleErrors}`);
      ok(`[${ten}] /staff (Toàn quyền): dòng tài khoản hiện «${TEN_MOI}», không còn «${TEN_CU}»; không tràn ngang; axe sạch`);
    } finally {
      p.close();
    }
  }
} finally {
  await env.stop();
}
console.log("\nTEN VAI SMOKE OK");
