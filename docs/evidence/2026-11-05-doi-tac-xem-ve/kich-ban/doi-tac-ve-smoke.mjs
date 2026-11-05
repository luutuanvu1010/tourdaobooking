// Kịch bản Chrome — Đối tác xem và gửi vé của đơn mình lập (ADR-0170 Đ1, Đ2, Đ3). Hai khổ: 390 và 1280. D1 tạm + wrangler dev + Chrome headless, KHÔNG production.
//   AXE_JS=<…/axe.min.js> OUT=$PWD/docs/evidence/2026-11-05-doi-tac-xem-ve/anh node docs/evidence/2026-11-05-doi-tac-xem-ve/kich-ban/doi-tac-ve-smoke.mjs
// Mỗi khổ một bộ đơn riêng (đơn A: tiền chưa về công ty; B: tiền đã về, mở vé, rồi tải lại; C: thiếu vé). Dữ liệu dựng bằng API TRƯỚC khi mở trang (ADR-0074/0075: đăng nhập mới thay phiên cũ).
// Bước 1 Đối tác, đơn A. 2 Đối tác, đơn B bấm Mở vé, thấy ảnh tải được. 3 Đối tác, đơn C thiếu vé. 4 Đối tác, đơn B tải lại: không có nút Huỷ đơn.
// Đối chiếu: 5 Bán hàng xem đơn A. 6 Đối tác khác mở đơn B: không có khối vé.
import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { ACCOUNTS, OUT, AXE, axeKiem, buoc, chup, goiApi, ketThuc, sleep, startEnv, taoMoTrang, vnDate } from "../../2026-10-30-luat-ban-dac-diem/kich-ban/lb-chung.mjs";

const KHO = [["390", { width: 390, height: 844, mobile: true }], ["1280", { width: 1280, height: 900, mobile: false }]].filter(([t]) => !process.env.DT_KHO || process.env.DT_KHO === t);
const tag = Date.now().toString(36);
const DAU = /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i;
const PNG = (n) => { const u = new Uint8Array(40); u.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d, 0x49, 0x48, 0x44, 0x52, 0, 0, n, n]); u.set(new TextEncoder().encode(tag), 20); return Buffer.from(u).toString("base64"); };
const AT = "'2026-01-01T00:00:00.000Z'";

const env = await startEnv();
try {
  const { call } = goiApi(env);
  const phai = (r, s, n) => { assert.equal(r.status, s, `${n}: ${r.status} ${JSON.stringify(r.json)}`); return r.json; };
  env.sql(`INSERT INTO catalog_item (code,name,unit,price_adult,price_child,price_senior,price_infant,note_child,note_senior,note_infant,sheet_row,in_sheet,first_seen_at,updated_at) VALUES
    ('ZVD1','Vé điện tử thử','perPax',100000,NULL,NULL,NULL,NULL,NULL,NULL,96,1,${AT},${AT}) ON CONFLICT(code) DO UPDATE SET in_sheet = 1`);
  const nhanVien = ACCOUNTS.salesA, keToan = ACCOUNTS.accounting;
  const taoDoiTac = async (ten, phone) => {
    const t = phai(await call(ACCOUNTS.chu, "POST", "/api/staff", { taoHoSoMoi: true, fullName: ten, phone, roles: ["COLLABORATOR"] }), 201, "tạo đối tác");
    return { name: ten, phone: t.staff.phone, pin: t.pin, permissions: ["PARTNER"] };
  };
  const DT = await taoDoiTac("Đối Tác Thử Một", "0900000311");
  const DT2 = await taoDoiTac("Đối Tác Thử Hai", "0900000312");

  // kho vé: 8 vé cho bốn đơn đầu (A, B của hai khổ); hai đơn C đến sau nên thiếu
  const lo = phai(await call(nhanVien, "POST", "/api/ve/lo", { catalogCode: "ZVD1", nhomKhach: "ADULT", tenSanPham: "Vé thử bằng chứng" }), 201, "mở lô").loId;
  const den = vnDate(60);
  const them = phai(await call(nhanVien, "POST", `/api/ve/lo/${lo}/ve`, { ve: [1, 2, 3, 4, 5, 6, 7, 8].map((i) => ({ noiDung: PNG(i), maVe: `E2E.${tag}.${i}`, tuNgay: vnDate(-1), denNgay: den })) }), 200, "thêm vé");
  assert.equal(them.themDuoc, 8);
  phai(await call(nhanVien, "POST", `/api/ve/lo/${lo}/xac-nhan`, {}), 200, "xác nhận lô");

  const donDoiTac = async (ten) => {
    const r = phai(await call(DT, "POST", "/api/orders", { customerName: `${ten} ${tag}`, customerPhone: "0913571359", services: [{ kind: "catalog", catalogCode: "ZVD1", catalogPriceSeen: { adult: 100000 }, pax: { adult: 2 }, departDate: vnDate(14), pickupChoice: "KHONG_DON" }] }), 201, "lập đơn");
    phai(await call(DT, "POST", `/api/orders/${r.order.id}/gui-don`, {}), 200, "gửi đơn");
    return { id: r.order.id, total: r.order.total };
  };
  const ghiThu = async (tk, d, nguoiThu) => phai(await call(tk, "POST", `/api/orders/${d.id}/payments`, { soTien: d.total, hinhThuc: "CASH", nguoiThu }), 201, "ghi tiền");
  const don = {};
  for (const [kho] of KHO) {
    don[kho] = { A: await donDoiTac("Khách A"), B: await donDoiTac("Khách B") };
    await ghiThu(DT, don[kho].A, "toi");        // tiền chưa về công ty
    await ghiThu(keToan, don[kho].B, "cong_ty"); // tiền đã về công ty
  }
  for (const [kho] of KHO) don[kho].C = await donDoiTac("Khách C"); // kho hết vé

  /** Bộ kiểm chung của một ảnh chụp: tràn ngang, lỗi console, có dấu, không mã vé trong DOM. `loiChoPhep`: mẫu lỗi mạng được phép (403/404 chủ đích). */
  const chung = async (p, nhan, { loiChoPhep = null } = {}) => {
    const m = await p.ev(`JSON.stringify({ sw: document.documentElement.scrollWidth, iw: innerWidth, html: document.documentElement.outerHTML, chu: (document.getElementById('ve-don')?.innerText ?? '') })`).then(JSON.parse);
    assert.ok(m.sw <= m.iw, `${nhan}: tràn ngang ${m.sw} > ${m.iw}`);
    assert.ok(!new RegExp(`E2E\\.${tag}|vdt/`).test(m.html), `${nhan}: có mã vé trong DOM`);
    if (m.chu) assert.ok(DAU.test(m.chu), `${nhan}: chữ khối vé không có dấu: ${m.chu.slice(0, 80)}`);
    assert.ok(!/\b(cancelled|confirmed|undefined|null|NaN|forbidden|Internal Server Error)\b|\[object/.test(m.chu), `${nhan}: chữ thô trong khối vé`);
    const tho = [...p.consoleErrors, ...p.logEntries.filter((l) => l.level === "error").map((l) => `${l.text} ${l.url ?? ""}`)].filter((x) => !(loiChoPhep && loiChoPhep.test(x)));
    assert.deepEqual(tho, [], `${nhan}: lỗi console`);
  };
  const vanBan = (p) => p.ev("(document.getElementById('ve-don') && !document.getElementById('ve-don').hidden) ? document.getElementById('ve-don').innerText : null");
  const choKhoi = async (p) => { await p.waitFor("(() => { const e = document.getElementById('ve-don'); return !!e && !e.hidden && e.innerText.length > 20; })()", "khối vé hiện"); };
  const coNut = (p, sel) => p.ev(`[...document.querySelectorAll(${JSON.stringify(sel)})].some((e) => e.offsetParent !== null)`);
  /** Chụp riêng khung khối vé (lề 12px). */
  const chupKhoi = async (p, ten) => {
    await p.ev("document.getElementById('ve-don').scrollIntoView({ block: 'center' }), true");
    await sleep(800);
    const r = await p.ev("(() => { const b = document.getElementById('ve-don').getBoundingClientRect(); return { x: Math.max(0, b.left + scrollX - 12), y: Math.max(0, b.top + scrollY - 12), width: Math.min(innerWidth, b.width + 24), height: b.height + 24 }; })()");
    await p.ev("(() => { for (const e of document.querySelectorAll('#topbar, header, #tabbar')) { e.dataset.anTam = e.style.display; e.style.display = 'none'; } return true; })()");
    const s = await p.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true, clip: { ...r, scale: 1 } });
    await p.ev("(() => { for (const e of document.querySelectorAll('#topbar, header, #tabbar')) { e.style.display = e.dataset.anTam ?? ''; } return true; })()");
    writeFileSync(join(OUT, `${ten}.png`), Buffer.from(s.result.data, "base64"));
  };
  const sangTrang = async (p, path) => { await p.send("Page.navigate", { url: env.base + path }); await sleep(400); await p.waitFor("document.readyState === 'complete'", `trang ${path} tải xong`); };
  const lyDoChua = "Công ty chưa xác nhận đã nhận đủ tiền nên chưa mở được vé.";

  for (const [kho, vp] of KHO) {
    console.log(`\n===== khổ ${kho} =====`);
    const { A, B, C } = don[kho];
    const pt = await taoMoTrang(env)(DT, `/order?id=${A.id}`, vp);
    await buoc(`${kho}-1`, "Tiền chưa về công ty (đơn A): câu lý do, không nút mở vé", async () => {
      await choKhoi(pt);
      const t = await vanBan(pt);
      assert.ok(t.includes(lyDoChua), `thiếu câu lý do: ${t}`);
      assert.ok(!(await coNut(pt, '#ve-don [data-action="chuan-bi-ve"], #ve-don [data-action="tao-duong-dan"], #ve-don [data-action="gui-zalo"]')), "không được có nút mở/gửi vé");
      assert.ok(t.includes("2/2 vé"), `không thấy số vé giữ: ${t}`);
      assert.ok(await coNut(pt, '[data-action="cancel-order"]'), "đơn chưa mở vé: đối tác còn nút Huỷ đơn");
      await chung(pt, `${kho}-1`);
      await axeKiem(pt, `${kho}-1`);
      await chup(pt, `1-tien-chua-ve-${kho}`); await chupKhoi(pt, `1-tien-chua-ve-${kho}-khoi`);
    });
    await buoc(`${kho}-3`, "Thiếu vé (đơn C): câu thiếu vé dành cho đối tác, có nút Cấp vé", async () => {
      await sangTrang(pt, `/order?id=${C.id}`);
      await choKhoi(pt);
      const t = await vanBan(pt);
      assert.ok(t.includes("Còn thiếu 2 vé. Bấm Cấp vé; nếu vẫn thiếu, báo văn phòng."), `sai câu thiếu vé: ${t}`);
      assert.ok(!t.includes("Nhập thêm vé vào kho"), "câu của nhân viên lọt sang đối tác");
      assert.ok(t.includes("Thiếu 2 vé"), "thiếu huy hiệu «Thiếu 2 vé»");
      assert.ok(await coNut(pt, '#ve-don [data-action="cap-ve"]'), "thiếu nút Cấp vé");
      await chung(pt, `${kho}-3`);
      await axeKiem(pt, `${kho}-3`);
      await chup(pt, `3-thieu-ve-${kho}`); await chupKhoi(pt, `3-thieu-ve-${kho}-khoi`);
    });
    await buoc(`${kho}-2`, "Tiền đã về công ty (đơn B): nút «Mở 2 vé…», bấm thì có 2 ảnh tải được", async () => {
      await sangTrang(pt, `/order?id=${B.id}`);
      await choKhoi(pt);
      const t = await vanBan(pt);
      assert.ok(!t.includes(lyDoChua), "đơn đã đủ tiền về công ty mà vẫn báo chưa mở được");
      assert.ok(t.includes("Bấm là coi như vé đã giao cho khách"), "thiếu câu cảnh báo trước khi mở");
      assert.equal(await pt.ev(`[...document.querySelectorAll('#ve-don [data-action="chuan-bi-ve"]')].map((b) => b.textContent.trim()).join('|')`), "Mở 2 vé để gửi khách");
      await chung(pt, `${kho}-2a`);
      await axeKiem(pt, `${kho}-2a`);
      await chup(pt, `2a-tien-da-ve-truoc-khi-mo-${kho}`); await chupKhoi(pt, `2a-tien-da-ve-truoc-khi-mo-${kho}-khoi`);
      await pt.ev(`document.querySelector('#ve-don [data-action="chuan-bi-ve"]').click(), true`);
      await pt.waitFor(`document.querySelectorAll('#ve-don [data-action="tai-ve"]').length === 2`, "hai nút Tải vé");
      // Trang chặn fetch tới blob: (CSP connect-src), nên đo bằng bảng thời gian tài nguyên của chính trang: hai lần tải /api/ve/anh phải 200 và có thân ảnh; hai nút tải trỏ tới blob:.
      const anh = await pt.ev(`JSON.stringify({ href: [...document.querySelectorAll('#ve-don [data-action="tai-ve"]')].map((a) => a.href.slice(0, 5)), tai: performance.getEntriesByType('resource').filter((e) => e.name.includes('/api/ve/anh/')).map((e) => e.responseStatus + ':' + (e.decodedBodySize > 0)) })`).then(JSON.parse);
      assert.deepEqual(anh, { href: ["blob:", "blob:"], tai: ["200:true", "200:true"] }, `ảnh vé không mở được: ${JSON.stringify(anh)}`);
      const t2 = await vanBan(pt);
      assert.ok(t2.includes("Đã mở 2 vé"), `thiếu thông báo đã mở: ${t2}`);
      await chung(pt, `${kho}-2b`);
      await chup(pt, `2b-da-mo-anh-${kho}`); await chupKhoi(pt, `2b-da-mo-anh-${kho}-khoi`);
    });
    await buoc(`${kho}-4`, "Đã mở vé (đơn B, tải lại trang): không có nút Huỷ đơn, có câu giải thích", async () => {
      await pt.send("Page.reload");
      await sleep(500);
      await pt.waitFor("document.readyState === 'complete'", "tải lại xong");
      await choKhoi(pt);
      await pt.waitFor("!!document.querySelector('[data-chan=\"huy-da-mo-ve\"]') || !!document.querySelector('[data-action=\"cancel-order\"]')", "khu nút huỷ dựng xong");
      assert.ok(!(await coNut(pt, '[data-action="cancel-order"]')), "vẫn còn nút Huỷ đơn sau khi đã mở vé");
      const cau = await pt.ev(`document.querySelector('[data-chan="huy-da-mo-ve"]')?.innerText ?? null`);
      assert.ok(cau && DAU.test(cau), `thiếu câu giải thích thay nút Huỷ: ${cau}`);
      console.log(`    câu thay nút Huỷ: «${cau}»`);
      await chung(pt, `${kho}-4`);
      await axeKiem(pt, `${kho}-4`);
      await chup(pt, `4-da-mo-ve-khong-huy-${kho}`);
      await chupKhoi(pt, `4-da-mo-ve-khong-huy-${kho}-khoi`);
    });
    pt.close();

    const ps = await taoMoTrang(env)(nhanVien, `/order?id=${A.id}`, vp);
    await buoc(`${kho}-5`, "Bán hàng xem đơn A: câu dành cho nhân viên", async () => {
      await choKhoi(ps);
      const t = await vanBan(ps);
      assert.ok(t.includes("Đang chờ đối tác nộp tiền về công ty nên chưa xem hoặc gửi được vé."), `sai câu cho nhân viên: ${t}`);
      assert.ok(!t.includes(lyDoChua), "câu của đối tác lọt sang nhân viên");
      assert.ok(!(await coNut(ps, '#ve-don [data-action="chuan-bi-ve"]')), "không nút mở vé");
      await chung(ps, `${kho}-5`);
      await axeKiem(ps, `${kho}-5`);
      await chup(ps, `5-ban-hang-xem-don-A-${kho}`); await chupKhoi(ps, `5-ban-hang-xem-don-A-${kho}-khoi`);
    });
    ps.close();

    const p2 = await taoMoTrang(env)(DT2, `/order?id=${B.id}`, vp);
    await buoc(`${kho}-6`, "Đối tác khác mở đơn B: không có khối vé", async () => {
      await sleep(2500);
      const hien = await p2.ev("(() => { const e = document.getElementById('ve-don'); return !!e && !e.hidden; })()");
      assert.equal(hien, false, "khối vé hiện ở đơn của đối tác khác");
      const txt = await p2.ev("document.body.innerText");
      assert.ok(!/Mở \d+ vé|Cấp vé|Thiếu \d+ vé/.test(txt), "có chữ về vé");
      assert.ok(!(await coNut(p2, '[data-action="chuan-bi-ve"], [data-action="cap-ve"]')), "có nút vé");
      console.log(`    trang đối tác khác (đầu): «${txt.replace(/\s+/g, " ").slice(0, 140)}»`);
      await chung(p2, `${kho}-6`, { loiChoPhep: /40[34]|Failed to load resource/ });
      await chup(p2, `6-doi-tac-khac-xem-don-B-${kho}`);
    });
    p2.close();
  }
  console.log(`\nkiểm màu axe: đã chạy (AXE_JS=${process.env.AXE_JS ? "có" : "KHÔNG"})`);
} finally {
  await env.stop();
}
ketThuc("DOI-TAC-VE");
