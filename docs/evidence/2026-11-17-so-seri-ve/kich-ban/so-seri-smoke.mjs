// Kịch bản Chrome ADR-0217 (17/11): Kho vé (Xem vé hiện số sê-ri, Huỷ vé lẻ có lý do, Tìm vé), Quét vé (ô Tra số sê-ri, kết quả), Tạo vé (vé mẫu in «Số sê-ri … Serial No.»). D1 tạm, không chạm production.
// Chạy từ gốc repo sau `npm run build:web`: AXE_JS=<…/axe.min.js> CHROME_BIN=$PWD/docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh OUT=<thư mục ảnh, ngoài kho> node docs/evidence/2026-11-17-so-seri-ve/kich-ban/so-seri-smoke.mjs
import assert from "node:assert/strict";
const W = process.cwd();
const L = await import(`${W}/docs/evidence/2026-10-30-luat-ban-dac-diem/kich-ban/lb-chung.mjs`);
const { ACCOUNTS, KHO, axeKiem, bam, bocucSach, buoc, chup, choHop, choDongHop, goiApi, ketThuc, sleep, startEnv, taoMoTrang, vnDate, setInput } = L;

const PNG = (n) => { const u = new Uint8Array(40); u.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d, 0x49, 0x48, 0x44, 0x52, 0, 0, n, n]); u.set(new TextEncoder().encode("chup" + Date.now()), 20); return Buffer.from(u).toString("base64"); };
const go = async (p, sel, v) => p.ev(`(() => { const s = document.querySelector(${JSON.stringify(sel)}); if (!s) return false; s.focus(); s.value = ${JSON.stringify(v)}; s.dispatchEvent(new Event('input', { bubbles: true })); return true; })()`);

const env = await startEnv();
try {
  const { call } = goiApi(env);
  const moTrang = taoMoTrang(env);
  const in_ = (nhan, r) => console.log(`  ${nhan}: ${r.status} ${JSON.stringify(r.json).slice(0, 200)}`);
  for (const ma of ["TD101", "TTB03"]) in_(`co-ve ${ma}`, await call(ACCOUNTS.admin, "POST", "/api/catalog/co-ve", { pham: "SERVICE", ma, coVe: true }));
  in_("nguon TD101", await call(ACCOUNTS.chu, "POST", "/api/catalog/nguon-ve", { ma: "TD101", nguon: "TOUR_DAO" }));

  // Lô hãng ngoài 4 vé (Bán hàng)
  const lo = await call(ACCOUNTS.salesA, "POST", "/api/ve/lo", { catalogCode: "TTB03", nhomKhach: "ALL", tenSanPham: "Phao chuối (vé thử)" });
  in_("mở lô hãng ngoài", lo);
  const den = vnDate(30);
  in_("thêm vé", await call(ACCOUNTS.salesA, "POST", `/api/ve/lo/${lo.json.loId}/ve`, { ve: [1, 2, 3, 4].map((i) => ({ noiDung: PNG(i), maVe: `CHUP.${Date.now()}.${i}`, tuNgay: vnDate(-1), denNgay: den })) }));
  in_("xác nhận lô", await call(ACCOUNTS.salesA, "POST", `/api/ve/lo/${lo.json.loId}/xac-nhan`, {}));
  const dsVe = await call(ACCOUNTS.admin, "GET", `/api/ve/lo/${lo.json.loId}/ve-trong-lo`);
  in_("vé trong lô", dsVe);
  const seri = dsVe.json?.ve?.map((v) => v.soSeri) ?? [];

  for (const [kho, vp] of KHO) {
    let p = await moTrang(ACCOUNTS.admin, "/ve-kho", vp);
    await buoc(`${kho}.1`, "Kho vé: danh sách lô, Xem vé hiện số sê-ri", async () => {
      await p.waitFor("!!document.querySelector('[data-action=\"xem-ve-lo\"]')", "nút Xem vé");
      await chup(p, `${kho}-1-kho-ve`);
      assert.equal(await bam(p, '[data-action="xem-ve-lo"]'), true);
      await p.waitFor("!!document.querySelector('[data-khoi=\"ve-trong-lo\"] li')", "danh sách vé");
      const txt = await p.ev("document.querySelector('[data-khoi=\"ve-trong-lo\"]').innerText");
      assert.match(txt, /VE_[A-Z]{8}/);
      await p.ev("document.querySelector('[data-khoi=\"ve-trong-lo\"]').scrollIntoView(), true");
      await chup(p, `${kho}-2-xem-ve`);
      await axeKiem(p, `${kho} kho vé`);
      await bocucSach(p, `${kho} kho vé`);
    });
    if (kho === KHO[0][0]) await buoc(`${kho}.2`, "Huỷ vé lẻ: hộp hỏi lý do, huỷ xong vé hiện Đã huỷ", async () => {
      assert.equal(await bam(p, 'li[data-tinh-trang="TRONG_KHO"] [data-action="huy-ve"]'), true); // vé trong kho: chưa từng giữ cho đơn ⇒ huỷ nhầm nhập lại được
      await choHop(p);
      await chup(p, `${kho}-3-hop-huy-ve`, false);
      await go(p, "#vk-ly-do-huy", "Vé in nhầm ngày, huỷ để cấp lại");
      assert.equal(await bam(p, ".sheet .btn-danger"), true);
      await choDongHop(p);
      await sleep(800);
      await chup(p, `${kho}-4-sau-huy-ve`);
      // Chủ chốt 18/11: vé hãng ngoài chưa từng giữ cho đơn huỷ nhầm thì nhập lại được; dòng vé đã huỷ ghi giờ huỷ, người huỷ, lý do.
      assert.equal(await bam(p, '[data-action="xem-ve-lo"]'), true);
      await p.waitFor("!!document.querySelector('[data-khoi=\"ve-trong-lo\"] li[data-tinh-trang=\"DA_HUY\"]')", "dòng vé đã huỷ");
      const huyTxt = await p.ev("document.querySelector('[data-khoi=\"ve-trong-lo\"] li[data-tinh-trang=\"DA_HUY\"]').innerText");
      assert.match(huyTxt, /Đã huỷ lúc \d\d:\d\d ngày \d\d\/\d\d · bởi .+ · lý do: Vé in nhầm ngày/);
      assert.match(huyTxt, /Nhập lại được/);
      await chup(p, `${kho}-4b-ve-da-huy`);
    });
    await buoc(`${kho}.3`, "Tìm vé theo số sê-ri", async () => {
      assert.ok(await go(p, "#vk-tim-so-seri", (seri[1] ?? "").toLowerCase()));
      assert.equal(await bam(p, '[data-action="tim-ve"]'), true);
      await p.waitFor("!!document.querySelector('[data-khoi=\"tim-ve\"] li') || !document.querySelector('#vk-tim-form .alert').hidden", "kết quả tìm");
      await p.ev("document.getElementById('vk-tim-form').scrollIntoView(), true");
      await chup(p, `${kho}-5-tim-ve`);
    });
    await p.close?.();

    p = await moTrang(ACCOUNTS.admin, "/quet-ve", vp);
    await buoc(`${kho}.4`, "Quét vé: ô Tra số sê-ri và kết quả", async () => {
      await p.waitFor("!!document.getElementById('qv-so-seri') && !document.getElementById('qv-noi-dung').hidden", "ô số sê-ri");
      await p.ev("document.getElementById('qv-form-so-seri').scrollIntoView(), true");
      await chup(p, `${kho}-6-quet-ve-o-nhap`);
      assert.ok(await go(p, "#qv-so-seri", seri[2] ?? "VE_ABCDEFGH"));
      await p.ev("document.getElementById('qv-form-so-seri').requestSubmit(), true");
      await p.waitFor("!document.getElementById('qv-ket-qua').hidden", "kết quả quét");
      await chup(p, `${kho}-7-quet-ve-ket-qua`, false);
      await axeKiem(p, `${kho} quét vé`);
    });
    await p.close?.();
  }

  const p = await moTrang(ACCOUNTS.chu, "/ve-kho", { width: 1040, height: 900, mobile: false });
  await buoc("tao.1", "Tạo vé: vé mẫu in số sê-ri", async () => {
    await p.waitFor("!!document.querySelector('[data-action=\"xem-ve-mau\"]')", "nút Xem vé mẫu");
    // Việc 4 (21/11): «Tạo vé Tour Đảo» chọn dịch vụ bằng bộ chọn của bước nhập lô (ô tìm + hàng nhóm + dòng), không còn hộp thả xuống.
    await p.waitFor("!!document.querySelector('#vt-dich-vu .catalog-row[data-ma=\"TD101\"]')", "dòng TD101 trong bộ chọn Tạo vé");
    assert.equal(await bam(p, '#vt-dich-vu .catalog-row[data-ma="TD101"] .catalog-pick'), true, "chạm dòng TD101");
    await p.waitFor("!!document.querySelector('#vt-dich-vu .catalog-da-chon[data-ma=\"TD101\"]')", "bộ chọn thu lại thành dòng đã chọn");
    await go(p, "#vt-tu-ngay", vnDate(0)); await go(p, "#vt-den-ngay", vnDate(30)); await go(p, "#vt-so-luong", "2");
    await go(p, "#vt-ten-en", "Nha Trang 4-Island Tour");
    assert.equal(await bam(p, '[data-action="xem-ve-mau"]'), true);
    await sleep(2500);
    const co = await p.ev("!!document.querySelector('img.ve-anh-xem, #vt-form img, .ve-mau img')");
    if (!co) console.log("  (không thấy ảnh vé mẫu bằng bộ chọn đoán; chụp cả trang)");
    await p.ev("(document.querySelector('#vt-form img') ?? document.getElementById('vt-form')).scrollIntoView(), true");
    await chup(p, "tao-ve-mau");
  });
} finally {
  await env.stop?.();
}
ketThuc("CHỤP SỐ SÊ-RI");
