// Kịch bản Chrome — vai Quản lý bán hàng và công tắc kiểm vé ở màn Dịch vụ & giá (ADR-0169). 390 + 1040, D1 tạm, không gọi production. Thay kiem-ve-smoke.mjs (trang riêng đã gỡ).
//   AXE_JS=<…/axe.min.js> CHROME_BIN=$PWD/docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh OUT=$PWD/docs/evidence/2026-11-05-quan-ly-ban-hang/anh LB_KHO=390 node docs/evidence/2026-11-05-quan-ly-ban-hang/kich-ban/ql-ban-hang-smoke.mjs
// Mỗi khổ một D1 tạm vì dòng cờ chỉ-thêm: chạy LB_KHO=390 rồi LB_KHO=1040.
// Bước: 1 Bán hàng thường: không lối vào, mở thẳng bị từ chối. 2 Quản lý: màn hẹp, không giá, không đồng bộ, tìm. 3 Gạt một vé. 4 Ngừng bán, Mở bán lại. 5 Cả nhóm hỏi lại.
//       6 Quản trị: màn đủ, công tắc ở dòng vé và nhóm, lọc «Cần kiểm vé», không có công tắc tự kiểm. 7 Toàn quyền: công tắc tự kiểm.
import assert from "node:assert/strict";
import { ACCOUNTS, KHO, setInput, axeKiem, bam, bocucSach, buoc, choDongHop, choHop, chup, diToi, goiApi, ketThuc, sleep, startEnv, taoMoTrang } from "../../2026-10-30-luat-ban-dac-diem/kich-ban/lb-chung.mjs";

ACCOUNTS.quanLy = { name: "Quản Lý Bán", phone: "0900000288", pin: "246820", permissions: ["SALES", "SALES_MANAGER"] };

const env = await startEnv();
try {
  const { call } = goiApi(env);
  const moTrang = taoMoTrang(env);
  const phai = (r, s, n) => { assert.equal(r.status, s, `${n}: ${r.status} ${JSON.stringify(r.json)}`); return r.json; };
  const TQ = ACCOUNTS.chu;
  const dau = (p, sel) => p.ev(`document.querySelector(${JSON.stringify(sel)})?.getAttribute('aria-checked') ?? null`);
  const bamHop = (p, chu) => p.ev(`(() => { const b = [...document.querySelectorAll('.sheet-foot button, .sheet button')].find((x) => x.textContent.trim() === ${JSON.stringify(chu)}); if (b) b.click(); return !!b; })()`);
  const daMo = (p, ma) => p.ev(`(() => { const d = document.querySelector('[data-ma="${ma}"]')?.closest('details'); if (d) d.open = true; return !!d; })()`);
  const coCua = async (pham, ma) => phai(await call(TQ, "GET", "/api/cai-dat/xac-nhan-don"), 200, "đọc cờ").dongCo.find((d) => d.pham === pham && d.ma === ma)?.canXacNhan;
  const choHep = (p) => p.waitFor("!document.getElementById('man-hep').hidden && !!document.querySelector('.kv-ds details')", "màn hẹp đã vẽ");
  const choDu = (p) => p.waitFor("document.querySelectorAll('[data-code] [data-action=\"kiem-ve\"]').length > 0 && !!document.querySelector('#nhom-dv [data-action=\"ca-nhom\"]')", "màn đủ đã vẽ");
  const hienRa = (sel) => `[...document.querySelectorAll(${JSON.stringify(sel)})].find((x) => x.offsetParent !== null)`;

  for (const [tenKho, vp] of KHO) {
    const kho = `[${tenKho}]`;
    const CHU = `${tenKho}-${String(Date.now()).slice(-4)}`;
    const G = phai(await call(ACCOUNTS.admin, "POST", "/api/catalog/groups", { name: `Nhóm thử ${CHU}` }), 201, "nhóm").group;
    phai(await call(ACCOUNTS.admin, "PUT", "/api/catalog/group-assignments", { codes: ["TTB06"], groupCode: G.code }), 200, "gán nhóm");
    const MA = "TD101";

    const b = await moTrang(ACCOUNTS.salesA, "/account", vp);
    try {
      await buoc(`1${kho}`, "Bán hàng thường: không lối vào; mở thẳng bị từ chối; máy chủ 403", async () => {
        await cho(b);
        assert.equal(await b.ev(`!!document.querySelector('a[href="/catalog"]')`), false); // kể cả trong nhóm Thiết lập đang gập
        await diToi(b, env, "/catalog");
        await b.waitFor("!document.getElementById('error').hidden", "câu từ chối");
        assert.equal(await b.ev("document.getElementById('man-du').hidden"), true);
        assert.equal((await call(ACCOUNTS.salesB, "GET", "/api/catalog/quan-ly-ban")).status, 403);
      });
    } finally { b.close(); }

    const q = await moTrang(ACCOUNTS.quanLy, "/account", vp);
    try {
      await buoc(`2${kho}`, "Quản lý: có lối vào, màn hẹp, không giá, không đồng bộ, tìm vé", async () => {
        await cho(q);
        assert.equal(await q.ev(`!!document.querySelector('a[href="/catalog"]')`), true); // nhóm Thiết lập đang gập nên không dùng coLoiVao
        await diToi(q, env, "/catalog");
        await choHep(q);
        assert.equal(await q.ev("document.getElementById('pull').offsetParent"), null, "đồng bộ ẩn");
        assert.equal(await q.ev("document.getElementById('nhom-dv').offsetParent"), null, "sửa nhóm ẩn");
        assert.equal(await q.ev(`/\\d[\\d.]{3,}\\s*(đ|₫)/.test(document.getElementById('man-hep').textContent)`), false, "không giá");
        assert.equal(await q.ev(`!!document.querySelector('[data-action="tu-kiem"]')`), false, "không công tắc tự kiểm");
        await chup(q, `ql-${tenKho}-1-man-hep`);
        await q.ev(setInput("document.querySelector('#kv-tim')", "motor"));
        await q.waitFor("document.querySelectorAll('.kv-ds [data-ma]').length === 1 && !!document.querySelector('.kv-ds [data-ma=TTB06]')", "tìm không dấu ra đúng một vé");
        await q.ev(setInput("document.querySelector('#kv-tim')", ""));
        await q.waitFor("document.querySelectorAll('.kv-ds [data-ma]').length > 1", "bỏ tìm");
        await daMo(q, MA);
        await bocucSach(q, `2${kho}`);
        await axeKiem(q, `2${kho}`);
      });
      await buoc(`3${kho}`, "Quản lý gạt một vé: máy chủ ghi, tải lại vẫn bật", async () => {
        await daMo(q, MA);
        const sel = `[data-ma="${MA}"] [data-action="kiem-ve"]`;
        assert.equal(await dau(q, sel), "false");
        assert.equal(await bam(q, sel), true);
        await q.waitFor(`document.querySelector('${sel}')?.getAttribute('aria-checked') === 'true'`, "công tắc bật");
        assert.equal(await coCua("SERVICE", MA), true);
        await diToi(q, env, "/account"); await diToi(q, env, "/catalog"); await choHep(q);
        assert.equal(await dau(q, sel), "true");
        await chup(q, `ql-${tenKho}-2-mot-ve`);
      });
      await buoc(`4${kho}`, "Quản lý: Ngừng bán rồi Mở bán lại", async () => {
        await daMo(q, MA);
        const nut = `[data-ma="${MA}"] [data-action="ngung-ban"]`;
        assert.equal(await q.ev(`document.querySelector('${nut}').textContent.trim()`), "Ngừng bán");
        assert.equal(await bam(q, nut), true);
        await q.waitFor(`document.querySelector('${nut}')?.textContent.trim() === 'Mở bán lại'`, "đã ngừng bán");
        assert.match(await q.ev(`document.querySelector('[data-ma="${MA}"]').textContent`), /Đã ngừng bán/);
        await chup(q, `ql-${tenKho}-3-ngung-ban`);
        assert.equal(await bam(q, nut), true);
        await q.waitFor(`document.querySelector('${nut}')?.textContent.trim() === 'Ngừng bán'`, "đã mở bán lại");
      });
      await buoc(`5${kho}`, "Quản lý gạt cả nhóm: hỏi lại; Giữ nguyên không ghi; đồng ý thì ghi", async () => {
        await daMo(q, "TTB06");
        const sel = `[data-nhom="${G.code}"] [data-action="ca-nhom"]`;
        assert.equal(await bam(q, sel), true);
        await choHop(q);
        await chup(q, `ql-${tenKho}-4-hoi-nhom`);
        assert.equal(await bamHop(q, "Giữ nguyên"), true);
        await choDongHop(q);
        assert.equal(await coCua("GROUP", G.code), undefined);
        assert.equal(await bam(q, sel), true);
        await choHop(q);
        assert.equal(await bamHop(q, "Bật cả nhóm"), true);
        await choDongHop(q);
        await q.waitFor(`document.querySelector('[data-ma="TTB06"] [data-action="kiem-ve"]')?.getAttribute('aria-checked') === 'true'`, "vé theo nhóm bật");
        assert.equal(await coCua("GROUP", G.code), true);
        assert.match(await q.ev(`document.querySelector('[data-ma="TTB06"]').textContent`), /Theo nhóm/);
      });
      await buoc(`5b${kho}`, "Quy tắc riêng thắng quy tắc chung, cả hai chiều", async () => {
        const ve = `[data-ma="TTB06"] [data-action="kiem-ve"]`;
        const nhom = `[data-nhom="${G.code}"] [data-action="ca-nhom"]`;
        // Nhóm bật, vé tắt riêng ⇒ vé không cần
        assert.equal(await bam(q, ve), true);
        await q.waitFor(`document.querySelector('${ve}')?.getAttribute('aria-checked') === 'false'`, "vé tắt riêng");
        assert.equal(await coCua("SERVICE", "TTB06"), false);
        assert.match(await q.ev(`document.querySelector('[data-ma="TTB06"]').textContent`), /Đặt riêng/);
        assert.equal(await dau(q, nhom), "true");
        await chup(q, `ql-${tenKho}-4b-rieng-thang`);
        // Nhóm tắt, vé vẫn giữ dòng riêng; gạt vé bật ⇒ vé cần dù nhóm tắt
        await daMo(q, "TTB06");
        assert.equal(await bam(q, nhom), true);
        await choHop(q);
        assert.equal(await bamHop(q, "Tắt cả nhóm"), true);
        await choDongHop(q);
        await q.waitFor(`document.querySelector('${nhom}')?.getAttribute('aria-checked') === 'false'`, "nhóm tắt");
        await daMo(q, "TTB06");
        assert.equal(await bam(q, ve), true);
        await q.waitFor(`document.querySelector('${ve}')?.getAttribute('aria-checked') === 'true'`, "vé bật riêng");
        assert.equal(await coCua("SERVICE", "TTB06"), true);
        assert.equal(await coCua("GROUP", G.code), false);
      });
    } finally { q.close(); }

    const a = await moTrang(ACCOUNTS.admin, "/catalog", vp);
    try {
      await buoc(`6${kho}`, "Quản trị: màn đủ, công tắc ở dòng vé và nhóm, lọc, không công tắc tự kiểm", async () => {
        await choDu(a);
        assert.equal(await a.ev(`!!document.querySelector('[data-action="tu-kiem"]')`), false);
        assert.equal(await a.ev("document.getElementById('kv-tu-kiem').offsetParent"), null, "khối trống ẩn");
        await chup(a, `ql-${tenKho}-5-man-du`);
        await a.ev(`(() => { const s = document.getElementById('filter'); s.value = 'kiem-ve'; s.dispatchEvent(new Event('change', { bubbles: true })); })()`);
        await a.waitFor(`!!${hienRa(`[data-code="${MA}"]`)} && !${hienRa('[data-code="TD102"]')}`, "lọc ra vé cần kiểm");
        await chup(a, `ql-${tenKho}-6-loc`);
        const tat = `${hienRa(`[data-code="${MA}"] [data-action="kiem-ve"]`)}`;
        await a.ev(`${tat}.click()`);
        await a.waitFor(`!${hienRa(`[data-code="${MA}"]`)}`, "gạt tắt thì rời danh sách lọc");
        assert.equal(await coCua("SERVICE", MA), false);
        await a.ev(`(() => { const s = document.getElementById('filter'); s.value = ''; s.dispatchEvent(new Event('change', { bubbles: true })); })()`);
        await bocucSach(a, `6${kho}`);
        await axeKiem(a, `6${kho}`);
      });
    } finally { a.close(); }

    const p = await moTrang(TQ, "/catalog", vp);
    try {
      await buoc(`7${kho}`, "Toàn quyền: công tắc tự kiểm đổi được và đổi lại", async () => {
        await choDu(p);
        const sel = `[data-action="tu-kiem"]`;
        assert.equal(await dau(p, sel), "true");
        await chup(p, `ql-${tenKho}-7-toan-quyen`);
        assert.equal(await bam(p, sel), true);
        await p.waitFor(`document.querySelector('${sel}')?.getAttribute('aria-checked') === 'false'`, "tắt");
        assert.equal(await bam(p, sel), true);
        await p.waitFor(`document.querySelector('${sel}')?.getAttribute('aria-checked') === 'true'`, "bật lại");
      });
    } finally { p.close(); }
  }
} finally {
  await env.stop();
}
function cho(p) { return p.waitFor("document.querySelectorAll('a[href]').length > 3", "khung trang Tôi").then(() => sleep(500)); }
ketThuc("QUAN LY BAN HANG");
