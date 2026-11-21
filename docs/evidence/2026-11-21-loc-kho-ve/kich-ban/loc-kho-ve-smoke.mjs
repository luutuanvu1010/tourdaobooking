// Kịch bản Chrome Việc 4 (kế hoạch 16 việc 21/11/2026): bộ lọc dùng chung của Kho vé — nhóm dịch vụ + chữ tìm không dấu áp cho «Số vé còn», «Lô trong kho» (lọc ở máy chủ,
// kể cả trang 2) và «Lô đã huỷ gần đây»; lọc ra rỗng có «Xoá lọc»; «Chưa phân loại» gồm mã đã rời danh mục; form «Tạo vé Tour Đảo» dùng cùng bộ chọn với bước nhập lô, không trùng id;
// Kế toán lọc không thấy lô hãng ngoài; Bán hàng không thấy lô Tour Đảo đã huỷ. D1 tạm + wrangler dev + Chrome headless, không chạm production.
// Chạy từ gốc repo sau `npm run build:web`:
//   AXE_JS=$PWD/node_modules/axe-core/axe.min.js CHROME_BIN=$PWD/docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh OUT=<thư mục ảnh, ngoài kho> node docs/evidence/2026-11-21-loc-kho-ve/kich-ban/loc-kho-ve-smoke.mjs
// Phá thử (P16): LOC_PHA=may-chu bỏ tham số lọc khỏi lệnh tải «Lô trong kho» ⇒ bước «trang 2 chỉ nhóm đã chọn» phải đỏ.
import assert from "node:assert/strict";
const W = process.cwd();
const L = await import(`${W}/docs/evidence/2026-10-30-luat-ban-dac-diem/kich-ban/lb-chung.mjs`);
const { ACCOUNTS, axeKiem, bam, bocucSach, buoc, chup, goiApi, ketThuc, sleep, startEnv, taoMoTrang, vnDate } = L;

const KHO = [["390", { width: 390, height: 844, mobile: true }], ["1280", { width: 1280, height: 900, mobile: false }]];
const PHA = process.env.LOC_PHA ?? "";
const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
let soAnh = 0;
const PNG = () => { const u = new Uint8Array(48); u.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d, 0x49, 0x48, 0x44, 0x52, 0, 0, 9, 9]); u.set(new TextEncoder().encode(`loc${Date.now()}.${soAnh++}`), 20); return Buffer.from(u).toString("base64"); };
const T = "'2026-01-01T00:00:00.000Z'";

/** Gõ chữ vào ô tìm của thanh lọc rồi bấm Enter (thanh lọc báo ngay, không chờ nhịp gõ). */
const goTim = (p, chu) => p.ev(`(() => { const q = document.getElementById('vk-loc-tim'); q.value = ${JSON.stringify(chu)}; q.dispatchEvent(new Event('input', { bubbles: true })); q.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); return true; })()`);
const chonNhom = (p, ma) => bam(p, `#vk-loc .catalog-nut-nhom[data-nhom="${ma}"]`);
const MA_KHO = "[...document.querySelectorAll('[data-khoi=\"ton-kho\"] li[data-ma]')].map((e) => e.dataset.ma)";
const MA_LO = "[...document.querySelectorAll('[data-khoi=\"cac-lo\"] > li[data-lo]')].map((e) => e.dataset.ma)";
const ID_LO = "[...document.querySelectorAll('[data-khoi=\"cac-lo\"] > li[data-lo]')].map((e) => e.dataset.lo)";
const MA_HUY = "[...document.querySelectorAll('[data-khoi=\"lo-da-huy\"] > li[data-lo]')].map((e) => e.dataset.ma)";
const ID_HUY = "[...document.querySelectorAll('[data-khoi=\"lo-da-huy\"] > li[data-lo]')].map((e) => e.dataset.lo)";
/** Chờ «Lô trong kho» vẽ xong theo điều kiện `dk` (chuỗi biểu thức trên danh sách mã của các lô). */
const choLo = (p, dk, nhan) => p.waitFor(`(() => { const ma = ${MA_LO}; const rong = !!document.querySelector('#vk-cac-lo [data-khoi="rong-do-loc"]'); return ${dk}; })()`, nhan);

const env = await startEnv();
try {
  const { call } = goiApi(env);
  const moTrang = taoMoTrang(env);
  const ok = (nhan, r, ma = [200, 201]) => assert.ok(ma.includes(r.status), `${nhan}: ${r.status} ${JSON.stringify(r.json).slice(0, 200)}`);

  // ---- Dữ liệu: danh mục, nhóm, nguồn vé ----
  env.sql(`INSERT INTO catalog_item (code,name,unit,price_adult,sheet_row,in_sheet,first_seen_at,updated_at) VALUES ('VW01','Vinwonders Nha Trang','perPax',900000,8,1,${T},${T}), ('ZZ01','Dịch vụ mới chưa gán nhóm','perPax',500000,9,1,${T},${T})`);
  const ad = ACCOUNTS.admin;
  ok("gán TTB", await call(ad, "PUT", "/api/catalog/group-assignments", { codes: ["TTB03", "TTB06"], groupCode: "TTB" }));
  ok("gán TDA", await call(ad, "PUT", "/api/catalog/group-assignments", { codes: ["TD101"], groupCode: "TDA" }));
  ok("gán VIN", await call(ad, "PUT", "/api/catalog/group-assignments", { codes: ["VW01"], groupCode: "VIN" }));
  for (const ma of ["TD101", "TTB03", "VW01"]) ok(`có vé ${ma}`, await call(ad, "POST", "/api/catalog/co-ve", { pham: "SERVICE", ma, coVe: true }));
  ok("nguồn TD101", await call(ACCOUNTS.chu, "POST", "/api/catalog/nguon-ve", { ma: "TD101", nguon: "TOUR_DAO" }));

  /** Lô vào kho qua API. Hãng ngoài do Bán hàng, Tour Đảo do Kế toán (số sê-ri cấp lúc mở lô). `huy`: huỷ ngay sau khi vào kho (vào khối «Lô đã huỷ»). */
  let soMa = 0;
  async function loVaoKho(ma, ten, nguon, soVe, huy = false) {
    const as = nguon === "TOUR_DAO" ? ACCOUNTS.accounting : ACCOUNTS.salesA;
    const lo = await call(as, "POST", "/api/ve/lo", { catalogCode: ma, nhomKhach: "ADULT", tenSanPham: ten, ...(nguon === "TOUR_DAO" ? { nguon, soVeDuKien: soVe } : {}) });
    ok(`mở lô ${ten}`, lo);
    const ve = Array.from({ length: soVe }, (_x, i) => ({ noiDung: PNG(), maVe: nguon === "TOUR_DAO" ? `TD1.${B32[soMa++ % 32].repeat(26)}` : `LOC.${Date.now()}.${soMa++}`, tuNgay: vnDate(-1), denNgay: vnDate(30), ...(nguon === "TOUR_DAO" ? { soSeri: lo.json.soSeri[i] } : {}) }));
    const them = await call(as, "POST", `/api/ve/lo/${lo.json.loId}/ve`, { ve });
    assert.equal(them.json?.themDuoc, soVe, `thêm vé ${ten}: ${JSON.stringify(them.json).slice(0, 200)}`);
    ok(`xác nhận ${ten}`, await call(as, "POST", `/api/ve/lo/${lo.json.loId}/xac-nhan`, {}));
    if (huy) ok(`huỷ ${ten}`, await call(as, "POST", `/api/ve/lo/${lo.json.loId}/bo`, {}));
    return lo.json.loId;
  }
  const loVin = await loVaoKho("VW01", "Vé cổng Vịnh Nha Trang", "HANG_NGOAI", 2);
  await loVaoKho("TTB03", "Phao chuối buổi sáng", "HANG_NGOAI", 3);
  await loVaoKho("TD101", "Tour 4 đảo Nha Trang", "TOUR_DAO", 2);
  await loVaoKho("TTB03", "Phao chuối (lô huỷ)", "HANG_NGOAI", 1, true);
  await loVaoKho("VW01", "Vinwonders (lô huỷ)", "HANG_NGOAI", 1, true);
  await loVaoKho("TD101", "Tour 4 đảo (lô huỷ)", "TOUR_DAO", 1, true);
  // 52 lô TTB06 chèn thẳng (cũ hơn các lô trên) để nhóm TTB có trang 2; một lô mã CU99 đã rời danh mục (vào «Chưa phân loại»).
  const cu = Array.from({ length: 52 }, (_x, i) => `('${crypto.randomUUID()}','TTB06','ALL','Motor nước lô ${i + 1}','ACTIVE','HANG_NGOAI','2025-06-01T00:${String(Math.floor(i / 60)).padStart(2, "0")}:${String(i % 60).padStart(2, "0")}.000Z','2025-06-01T00:00:00.000Z')`);
  env.sql(`INSERT INTO vdt_batch (id, catalog_code, pax_group, printed_name, status, source, created_at, updated_at) VALUES ${cu.join(",")}, ('${crypto.randomUUID()}','CU99','ADULT','Vé dịch vụ cũ','ACTIVE','HANG_NGOAI','2025-05-01T00:00:00.000Z','2025-05-01T00:00:00.000Z')`);

  for (const [kho, vp] of KHO) {
    const p = await moTrang(ad, "/ve-kho", vp, { them: PHA === "may-chu" ? "const _f = window.fetch; window.fetch = (u, o) => _f(typeof u === 'string' && u.startsWith('/api/ve/lo?') ? u.replace(/&(ma|boMa|tim)=[^&]*/g, '') : u, o);" : "" });
    await buoc(`${kho}.1`, "Thanh lọc đầu trang: ô tìm + hàng nhóm (Tất cả, nhóm của danh mục, Chưa phân loại); Tạo vé dùng bộ chọn, không trùng id", async () => {
      await p.waitFor("document.querySelectorAll('#vk-loc .catalog-nut-nhom').length > 2 && !!document.querySelector('[data-khoi=\"cac-lo\"]') && !!document.querySelector('#vt-dich-vu .catalog-row') && !!document.querySelector('#vk-dich-vu .catalog-row')", "thanh lọc, danh sách lô và hai bộ chọn dịch vụ");
      const nut = await p.ev("[...document.querySelectorAll('#vk-loc .catalog-nut-nhom')].map((b) => b.dataset.nhom)");
      assert.equal(nut[0], "", "nút đầu là Tất cả");
      assert.equal(nut.at(-1), "chua-phan-loai", "«Chưa phân loại» cuối (ZZ01 chưa gán nhóm)");
      for (const g of ["TDA", "TTB", "VIN"]) assert.ok(nut.includes(g), `có nút nhóm ${g}`);
      assert.equal(await p.ev("document.querySelector('#vk-loc .catalog-nut-nhom[aria-checked=\"true\"]').dataset.nhom"), "", "mặc định Tất cả");
      assert.deepEqual(await p.ev("[...document.querySelectorAll('#vt-dich-vu .catalog-row')].map((e) => e.dataset.ma)"), ["TD101"], "Tạo vé chỉ dịch vụ vé Tour Đảo");
      const trung = await p.ev("(() => { const d = {}; for (const e of document.querySelectorAll('[id]')) d[e.id] = (d[e.id] ?? 0) + 1; return Object.entries(d).filter(([, n]) => n > 1).map(([k]) => k); })()");
      assert.deepEqual(trung, [], "không id nào trùng trên trang (hai bộ chọn dịch vụ)");
      await chup(p, `${kho}-1-thanh-loc`);
      await axeKiem(p, `${kho} kho vé có thanh lọc`);
      await bocucSach(p, `${kho} kho vé có thanh lọc`);
    });
    await buoc(`${kho}.2`, "Chọn nhóm TTB: ba khối chỉ còn dịch vụ nhóm TTB, «Lô trong kho» trang 2 cũng vậy", async () => {
      assert.equal(await chonNhom(p, "TTB"), true);
      await choLo(p, "ma.length === 50 && ma.every((m) => m.startsWith('TTB'))", "trang 1 chỉ lô TTB");
      assert.deepEqual([...new Set(await p.ev(MA_KHO))], ["TTB03"], "Số vé còn chỉ TTB03");
      assert.deepEqual(await p.ev(MA_HUY), ["TTB03"], "Lô đã huỷ chỉ TTB03");
      assert.match(await p.ev("document.getElementById('vk-cac-lo').innerText"), /Đang lọc theo nhóm «/, "dòng nhắc đang lọc");
      await chup(p, `${kho}-2-nhom-ttb`);
      assert.equal(await bam(p, '#vk-cac-lo [data-action="trang-sau"]'), true, "có trang sau");
      await choLo(p, "ma.length > 0 && ma.length < 50", "trang 2");
      const ma2 = await p.ev(MA_LO);
      assert.deepEqual([...new Set(ma2)], ["TTB06"], "trang 2 chỉ lô TTB06 (không lô nhóm khác)");
      assert.equal(ma2.length, 3, "53 lô TTB ⇒ trang 2 có 3");
      await p.ev("document.getElementById('vk-cac-lo').scrollIntoView(), true");
      await chup(p, `${kho}-3-nhom-ttb-trang-2`, false);
    });
    await buoc(`${kho}.3`, "Gõ «vin» rồi «vịn»: ra cùng kết quả ở ba khối (tên dịch vụ Vinwonders, tên in «Vịnh»)", async () => {
      assert.equal(await chonNhom(p, ""), true);
      await goTim(p, "vin");
      await choLo(p, "ma.length > 0 && ma.every((m) => m === 'VW01')", "lô theo «vin»");
      const mot = { kho: await p.ev(MA_KHO), lo: await p.ev(ID_LO), huy: await p.ev(ID_HUY) };
      assert.deepEqual(mot.lo, [loVin]);
      assert.deepEqual([...new Set(mot.kho)], ["VW01"]);
      assert.equal(mot.huy.length, 1);
      await chup(p, `${kho}-4-tim-vin`);
      await goTim(p, "vịn");
      await sleep(400);
      await choLo(p, "ma.length > 0 && ma.every((m) => m === 'VW01')", "lô theo «vịn»");
      assert.deepEqual({ kho: await p.ev(MA_KHO), lo: await p.ev(ID_LO), huy: await p.ev(ID_HUY) }, mot, "«vịn» = «vin»");
    });
    await buoc(`${kho}.4`, "Lọc ra rỗng: mỗi khối có câu báo + «Xoá lọc»; bấm thì ba khối trở lại đủ", async () => {
      assert.equal(await chonNhom(p, "TDA"), true); // chữ «vịn» vẫn giữ: Tour 4 đảo không khớp
      await choLo(p, "rong", "«Lô trong kho» báo rỗng do lọc");
      assert.equal(await p.ev("document.querySelectorAll('[data-khoi=\"rong-do-loc\"] [data-action=\"xoa-loc\"]').length"), 3, "ba khối đều có «Xoá lọc»");
      assert.match(await p.ev("document.getElementById('vk-cac-lo').innerText"), /Không có lô nào khớp bộ lọc/);
      await p.ev("document.getElementById('vk-cac-lo').scrollIntoView(), true");
      await chup(p, `${kho}-5-rong-do-loc`, false);
      assert.equal(await bam(p, '#vk-cac-lo [data-action="xoa-loc"]'), true);
      await choLo(p, "ma.length === 50 && new Set(ma).size > 1", "danh sách đủ lại");
      assert.equal(await p.ev("document.getElementById('vk-loc-tim').value"), "", "ô tìm đã xoá");
      assert.equal(await p.ev("document.querySelector('#vk-loc .catalog-nut-nhom[aria-checked=\"true\"]').dataset.nhom"), "", "về Tất cả");
      assert.equal(await p.ev("document.querySelectorAll('[data-khoi=\"rong-do-loc\"]').length"), 0);
      assert.ok(new Set(await p.ev(MA_KHO)).size >= 3, "Số vé còn đủ lại");
    });
    await buoc(`${kho}.5`, "«Chưa phân loại»: lô của mã đã rời danh mục (CU99) hiện, lô có nhóm thì không", async () => {
      assert.equal(await chonNhom(p, "chua-phan-loai"), true);
      await choLo(p, "ma.length > 0 && ma.every((m) => m === 'CU99')", "lô chưa phân loại"); // chờ ĐÚNG danh sách mới: danh sách cũ (Tất cả) cũng «có lô»
      assert.deepEqual(await p.ev(MA_LO), ["CU99"]);
      assert.match(await p.ev("document.getElementById('vk-cac-lo').innerText"), /Dịch vụ không còn trong danh mục/);
      await p.ev("document.getElementById('vk-cac-lo').scrollIntoView(), true");
      await chup(p, `${kho}-6-chua-phan-loai`, false);
      assert.equal(await chonNhom(p, ""), true);
      await choLo(p, "ma.length === 50", "về Tất cả");
    });
    await p.close?.();
  }

  // Kế toán chỉ giữ vé Tour Đảo: lọc nhóm TTB không làm lộ lô hãng ngoài. Bán hàng: «Lô đã huỷ» không có lô Tour Đảo dù gõ «tour».
  const kt = await moTrang(ACCOUNTS.accounting, "/ve-kho", KHO[0][1]);
  await buoc("quyen.1", "Kế toán chọn nhóm TTB: «Lô trong kho» rỗng (không thấy lô hãng ngoài)", async () => {
    await kt.waitFor("document.querySelectorAll('#vk-loc .catalog-nut-nhom').length > 2 && !!document.querySelector('[data-khoi=\"cac-lo\"]')", "trang Kế toán");
    assert.deepEqual([...new Set(await kt.ev(MA_LO))], ["TD101"], "không lọc: chỉ lô Tour Đảo");
    assert.equal(await chonNhom(kt, "TTB"), true);
    await choLo(kt, "rong", "rỗng do lọc");
    await chup(kt, "quyen-1-ke-toan-nhom-ttb", false);
  });
  await kt.close?.();
  const sa = await moTrang(ACCOUNTS.salesA, "/ve-kho", KHO[0][1]);
  await buoc("quyen.2", "Bán hàng gõ «tour»: «Lô đã huỷ» không có lô Tour Đảo", async () => {
    await sa.waitFor("!!document.getElementById('vk-loc-tim') && !!document.querySelector('[data-khoi=\"lo-da-huy\"]')", "trang Bán hàng");
    assert.ok(!(await sa.ev(MA_HUY)).includes("TD101"), "không lọc: không lô Tour Đảo đã huỷ");
    await goTim(sa, "tour");
    await sa.waitFor("!!document.querySelector('#vk-da-huy [data-khoi=\"rong-do-loc\"]')", "Lô đã huỷ rỗng do lọc");
    await chup(sa, "quyen-2-ban-hang-tim-tour", false);
  });
  await sa.close?.();
} finally {
  await env.stop?.();
}
ketThuc("LỌC KHO VÉ");
