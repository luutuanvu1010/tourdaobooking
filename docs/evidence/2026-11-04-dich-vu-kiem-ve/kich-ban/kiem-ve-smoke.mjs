// Kịch bản Chrome — màn «Dịch vụ cần kiểm vé» (ADR-0136 Đ1, Đ5). 390 + 1040, D1 tạm, không gọi production.
//   AXE_JS=<…/axe.min.js> CHROME_BIN=$PWD/docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh OUT=$PWD/docs/evidence/2026-11-04-dich-vu-kiem-ve/anh node docs/evidence/2026-11-04-dich-vu-kiem-ve/kich-ban/kiem-ve-smoke.mjs
// Mỗi khổ một D1 tạm vì dòng cờ chỉ-thêm: chạy LB_KHO=390 rồi LB_KHO=1040.
// Bước: 1 Quản trị không có lối vào, mở thẳng bị từ chối. 2 Toàn quyền: lối vào, trang vẽ, tìm. 3 Gạt một vé ⇒ máy chủ ghi, tải lại vẫn còn.
//       4 Cả nhóm: hỏi lại, «Giữ nguyên» không ghi, đồng ý thì ghi; vé trong nhóm hiện «Theo nhóm». 5 Vé riêng tắt trong nhóm bật ⇒ tắt, nhãn «Đặt riêng». 6 Công tắc tự kiểm vé.
import assert from "node:assert/strict";
import { ACCOUNTS, KHO, setInput, axeKiem, bam, bocucSach, buoc, choDongHop, choHop, chup, coLoiVao, diToi, goiApi, ketThuc, sleep, startEnv, taoMoTrang } from "../../2026-10-30-luat-ban-dac-diem/kich-ban/lb-chung.mjs";

const env = await startEnv();
try {
  const { call } = goiApi(env);
  const moTrang = taoMoTrang(env);
  const phai = (r, s, n) => { assert.equal(r.status, s, `${n}: ${r.status} ${JSON.stringify(r.json)}`); return r.json; };
  const TQ = ACCOUNTS.chu;
  const choTrang = (p) => p.waitFor("!document.getElementById('kv-noi-dung').hidden && !!document.querySelector('.kv-ds details')", "trang đã vẽ");
  const dau = (p, sel) => p.ev(`document.querySelector(${JSON.stringify(sel)})?.getAttribute('aria-checked') ?? null`);
  const bamHop = (p, chu) => p.ev(`(() => { const b = [...document.querySelectorAll('.sheet-foot button, .sheet button')].find((x) => x.textContent.trim() === ${JSON.stringify(chu)}); if (!b) return false; b.click(); return true; })()`);
  const daMo = (p, ma) => p.ev(`(() => { const d = document.querySelector('[data-ma="${ma}"]')?.closest('details'); if (d) d.open = true; return !!d; })()`);
  const coCua = async (pham, ma) => phai(await call(TQ, "GET", "/api/cai-dat/xac-nhan-don"), 200, "đọc cờ").dongCo.find((d) => d.pham === pham && d.ma === ma)?.canXacNhan;

  for (const [tenKho, vp] of KHO) {
    const kho = `[${tenKho}]`;
    const CHU = `${tenKho}-${String(Date.now()).slice(-4)}`;
    const G = phai(await call(ACCOUNTS.admin, "POST", "/api/catalog/groups", { name: `Nhóm thử ${CHU}` }), 201, "nhóm").group;
    phai(await call(ACCOUNTS.admin, "PUT", "/api/catalog/group-assignments", { codes: ["TTB06"], groupCode: G.code }), 200, "gán nhóm");
    const MA = "TD101";

    const q = await moTrang(ACCOUNTS.admin, "/account", vp);
    try {
      await buoc(`1${kho}`, "Quản trị: không có lối vào; mở thẳng bị từ chối; máy chủ 403", async () => {
        await p_cho(q);
        assert.equal(await coLoiVao(q, "/dich-vu-kiem-ve"), false);
        await diToi(q, env, "/dich-vu-kiem-ve");
        await q.waitFor("!document.getElementById('error').hidden", "câu từ chối");
        assert.match(await q.ev("document.getElementById('error').textContent"), /chỉ Toàn quyền/);
        assert.equal((await call(ACCOUNTS.admin, "GET", "/api/cai-dat/xac-nhan-don")).status, 403);
      });
    } finally { q.close(); }

    const p = await moTrang(TQ, "/account", vp);
    try {
      await buoc(`2${kho}`, "Toàn quyền: có lối vào, trang vẽ, tìm vé", async () => {
        await p_cho(p);
        assert.equal(await coLoiVao(p, "/dich-vu-kiem-ve"), true);
        await diToi(p, env, "/dich-vu-kiem-ve");
        await choTrang(p);
        await chup(p, `kv-${tenKho}-1-dau`);
        await p.ev(setInput("document.querySelector('#kv-tim')", "motor"));
        await p.waitFor("document.querySelectorAll('.kv-ds [data-ma]').length === 1 && !!document.querySelector('.kv-ds [data-ma=TTB06]')", "tìm không dấu ra đúng một vé");
        await p.ev(setInput("document.querySelector('#kv-tim')", ""));
        await p.waitFor("document.querySelectorAll('.kv-ds [data-ma]').length > 1", "bỏ tìm");
        await bocucSach(p, `2${kho}`);
        await axeKiem(p, `2${kho}`);
      });
      await buoc(`3${kho}`, "Gạt một vé: máy chủ ghi, tải lại vẫn bật", async () => {
        assert.equal(await daMo(p, MA), true, `dòng ${MA}`);
        const sel = `[data-ma="${MA}"] [data-action="dich-vu"]`;
        assert.equal(await dau(p, sel), "false");
        assert.equal(await bam(p, sel), true);
        await p.waitFor(`document.querySelector('${sel}')?.getAttribute('aria-checked') === 'true'`, "công tắc bật");
        assert.equal(await coCua("SERVICE", MA), true);
        await diToi(p, env, "/account"); await diToi(p, env, "/dich-vu-kiem-ve"); await choTrang(p);
        assert.equal(await dau(p, sel), "true");
        await chup(p, `kv-${tenKho}-2-mot-ve`);
      });
      await buoc(`4${kho}`, "Cả nhóm: hỏi lại; Giữ nguyên không ghi; đồng ý thì ghi", async () => {
        await daMo(p, "TTB06");
        const sel = `[data-nhom="${G.code}"] [data-action="ca-nhom"]`;
        assert.equal(await bam(p, sel), true);
        await choHop(p);
        await chup(p, `kv-${tenKho}-3-hoi-nhom`);
        assert.equal(await bamHop(p, "Giữ nguyên"), true);
        await choDongHop(p);
        assert.equal(await coCua("GROUP", G.code), undefined);
        assert.equal(await bam(p, sel), true);
        await choHop(p);
        assert.equal(await bamHop(p, "Bật cả nhóm"), true);
        await choDongHop(p);
        await p.waitFor(`document.querySelector('[data-ma="TTB06"] [data-action="dich-vu"]')?.getAttribute('aria-checked') === 'true'`, "vé theo nhóm bật");
        assert.equal(await coCua("GROUP", G.code), true);
        assert.match(await p.ev(`document.querySelector('[data-ma="TTB06"]').textContent`), /Theo nhóm/);
      });
      await buoc(`5${kho}`, "Tắt riêng một vé trong nhóm đang bật", async () => {
        const sel = `[data-ma="TTB06"] [data-action="dich-vu"]`;
        assert.equal(await bam(p, sel), true);
        await p.waitFor(`document.querySelector('${sel}')?.getAttribute('aria-checked') === 'false'`, "vé tắt");
        assert.equal(await coCua("SERVICE", "TTB06"), false);
        assert.match(await p.ev(`document.querySelector('[data-ma="TTB06"]').textContent`), /Đặt riêng/);
        await chup(p, `kv-${tenKho}-4-nhom`);
        // trả lại cho khổ sau
        assert.equal(await bam(p, sel), true);
        await p.waitFor(`document.querySelector('${sel}')?.getAttribute('aria-checked') === 'true'`, "vé bật lại");
        const n = `[data-nhom="${G.code}"] [data-action="ca-nhom"]`;
        assert.equal(await bam(p, n), true);
        await choHop(p);
        assert.equal(await bamHop(p, "Tắt cả nhóm"), true);
        await choDongHop(p);
        await sleep(300);
      });
      await buoc(`6${kho}`, "Công tắc nhân viên tự kiểm vé đổi được và đổi lại", async () => {
        const sel = `[data-action="tu-kiem"]`;
        assert.equal(await dau(p, sel), "true");
        assert.equal(await bam(p, sel), true);
        await p.waitFor(`document.querySelector('${sel}')?.getAttribute('aria-checked') === 'false'`, "tắt");
        assert.equal(phai(await call(TQ, "GET", "/api/cai-dat/xac-nhan-don"), 200, "đọc").tuXacNhanNoiBo, false);
        assert.equal(await bam(p, sel), true);
        await p.waitFor(`document.querySelector('${sel}')?.getAttribute('aria-checked') === 'true'`, "bật lại");
      });
    } finally { p.close(); }
  }
} finally {
  await env.stop();
}
function p_cho(p) { return p.waitFor("document.querySelectorAll('a[href]').length > 3", "khung trang Tôi").then(() => sleep(500)); }
ketThuc("KIEM VE");
