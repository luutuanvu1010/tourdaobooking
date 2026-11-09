// Kịch bản Chrome — Đối tác xem và gửi vé của đơn mình lập (ADR-0170 Đ1, Đ2, Đ3). Hai khổ: 390 và 1280. D1 tạm + wrangler dev + Chrome headless, KHÔNG production.
//   AXE_JS=<…/axe.min.js> OUT=$PWD/docs/evidence/2026-11-05-doi-tac-xem-ve/anh node docs/evidence/2026-11-05-doi-tac-xem-ve/kich-ban/doi-tac-ve-smoke.mjs
// Mỗi khổ một bộ đơn riêng (đơn A: tiền chưa về công ty; B: tiền đã về, mở vé, rồi tải lại; C: thiếu vé). Dữ liệu dựng bằng API TRƯỚC khi mở trang (ADR-0074/0075: đăng nhập mới thay phiên cũ).
// Bước 1 Đối tác, đơn A. 2 Đối tác, đơn B bấm Mở vé, thấy ảnh tải được. 3 Đối tác, đơn C thiếu vé. 4 Đối tác, đơn B tải lại: không có nút Huỷ đơn.
// Đối chiếu: 5 Bán hàng xem đơn A. 6 Đối tác khác mở đơn B: không có khối vé.
import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { deflateSync } from "node:zlib";
import { ACCOUNTS, OUT, AXE, axeKiem, buoc, chup, goiApi, ketThuc, sleep, startEnv, taoMoTrang, vnDate } from "../../2026-10-30-luat-ban-dac-diem/kich-ban/lb-chung.mjs";

const KHO = [["390", { width: 390, height: 844, mobile: true }], ["1280", { width: 1280, height: 900, mobile: false }]].filter(([t]) => !process.env.DT_KHO || process.env.DT_KHO === t);
const tag = Date.now().toString(36);
const DAU = /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i;
// PNG HỢP LỆ 48×32 (màu theo n, kèm dấu tag để mỗi ảnh một vân tệp riêng) — trang khách vẽ được ảnh, không phải ảnh vé thật.
const CRC = (() => { const t = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = (b) => { let c = 0xffffffff; for (const x of b) c = CRC[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (ten, data) => { const l = Buffer.alloc(4); l.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(ten), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc32(td)); return Buffer.concat([l, td, c]); };
const PNG = (n) => {
  const w = 48, hh = 32, raw = Buffer.alloc((w * 3 + 1) * hh);
  for (let y = 0; y < hh; y++) for (let x = 0; x < w; x++) { const o = y * (w * 3 + 1); raw[o] = 0; raw[o + 1 + x * 3] = (n * 37) % 256; raw[o + 2 + x * 3] = (n * 91 + y * 3) % 256; raw[o + 3 + x * 3] = (n * 53 + x * 3) % 256; }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(hh, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk("IHDR", ihdr), chunk("tEXt", Buffer.from("tag\0" + tag)), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]).toString("base64");
};
ACCOUNTS.lai = { name: "Lai Bán Đối Tác", phone: "0900000321", pin: "246821", permissions: ["SALES", "PARTNER"] };
ACCOUNTS.hdv = { name: "Hướng Dẫn Viên Thử", phone: "0900000322", pin: "246822", permissions: ["FIELD"] };
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
    return { name: ten, phone: t.staff.phone, pin: t.pin, permissions: ["PARTNER"], vai: "COLLABORATOR" };
  };
  const DT = await taoDoiTac("Đối Tác Thử Một", "0900000311");
  const DT2 = await taoDoiTac("Đối Tác Thử Hai", "0900000312");

  // kho vé: mỗi khổ dùng đúng 16 vé (A 2, B 2, hai đơn lai 4, đơn đường dẫn khách 2+2, hai đơn Trả sau 4); các đơn C đến SAU CÙNG nên thiếu
  const lo = phai(await call(nhanVien, "POST", "/api/ve/lo", { catalogCode: "ZVD1", nhomKhach: "ADULT", tenSanPham: "Vé thử bằng chứng" }), 201, "mở lô").loId;
  const den = vnDate(60);
  const tatCa = Array.from({ length: 16 * KHO.length }, (_x, i) => i + 1);
  let themDuoc = 0; // mỗi đợt thêm tối đa 10 vé
  for (let i = 0; i < tatCa.length; i += 10) themDuoc += phai(await call(nhanVien, "POST", `/api/ve/lo/${lo}/ve`, { ve: tatCa.slice(i, i + 10).map((n) => ({ noiDung: PNG(n), maVe: `E2E.${tag}.${n}`, tuNgay: vnDate(-1), denNgay: den })) }), 200, "thêm vé").themDuoc;
  assert.equal(themDuoc, tatCa.length);
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

  // ---------------- dữ liệu của bốn nhóm mới (dựng bằng API trước khi mở trang) ----------------
  const idHdv = env.sql(`SELECT id FROM staff WHERE phone = '${ACCOUNTS.hdv.phone}'`)[0].id;
  const dvTD = (code, gia, soNguoi) => ({ kind: "catalog", catalogCode: code, catalogPriceSeen: { adult: gia, child: 950000, senior: 1200000, infant: 0 }, pax: { adult: soNguoi }, departDate: vnDate(14), pickupChoice: "KHONG_DON" });
  const ghiTien = async (tk, id, soTien, nguoiThu) => phai(await call(tk, "POST", `/api/orders/${id}/payments`, { soTien, hinhThuc: "CASH", nguoiThu }), 201, "ghi tiền");
  // nhóm 1: chuyển cọc (đơn TD101 không dính kho vé). Đơn huỷ a, đơn nhận b, Quản trị huỷ + duyệt chuyển; chưa ai bấm «Ghi chuyển».
  const donCoc = async () => {
    const r = phai(await call(nhanVien, "POST", "/api/orders", { customerName: `Khách Cọc ${tag}`, customerPhone: "0913571360", handlerStaffId: idHdv, services: [dvTD("TD101", 1350000, 1)] }), 201, "lập đơn cọc");
    phai(await call(nhanVien, "POST", `/api/orders/${r.order.id}/status`, { status: "confirmed" }), 200, "xác nhận đơn cọc");
    return { id: r.order.id, ma: r.order.orderCode };
  };
  const coc = {};
  for (const [kho] of KHO) {
    coc[kho] = {};
    for (const loai of ["khong", "mot", "nhieu"]) {
      const a = await donCoc(), b = await donCoc();
      if (loai === "khong") await ghiTien(keToan, a.id, 150000, "cong_ty");
      if (loai === "mot") await ghiTien(ACCOUNTS.hdv, a.id, 150000, "toi");
      if (loai === "nhieu") { await ghiTien(nhanVien, a.id, 100000, "toi"); await ghiTien(ACCOUNTS.hdv, a.id, 50000, "toi"); }
      phai(await call(ACCOUNTS.admin, "POST", `/api/orders/${a.id}/status`, { status: "cancelled", lyDo: "THOI_TIET" }), 200, "huỷ đơn cọc");
      phai(await call(ACCOUNTS.admin, "POST", `/api/orders/${a.id}/coc/duyet`, { loai: "chuyen", soTien: 150000, lyDo: "Dời lịch thử bằng chứng", donNhan: b.ma }), 201, "duyệt chuyển");
      coc[kho][loai] = a;
    }
  }
  // nhóm 2: tài khoản lai Bán hàng + Đối tác. L1 chưa mở vé, L2 đã mở vé (Kế toán ghi tiền về công ty, lai mở ảnh bằng API).
  const donLai = async (ten) => {
    const r = phai(await call(ACCOUNTS.lai, "POST", "/api/orders", { customerName: `${ten} ${tag}`, customerPhone: "0913571361", services: [dvTD("ZVD1", 100000, 2)] }), 201, "lai lập đơn");
    phai(await call(ACCOUNTS.lai, "POST", `/api/orders/${r.order.id}/gui-don`, {}), 200, "lai gửi đơn");
    return { id: r.order.id, total: r.order.total };
  };
  const lai = {};
  for (const [kho] of KHO) {
    lai[kho] = { L1: await donLai("Khách Lai Một"), L2: await donLai("Khách Lai Hai") };
    await ghiTien(keToan, lai[kho].L2.id, lai[kho].L2.total, "cong_ty");
    const ds = phai(await call(ACCOUNTS.lai, "GET", `/api/ve/don/${lai[kho].L2.id}`), 200, "lai xem danh sách vé");
    assert.equal(ds.veXem.length, 2, "đơn L2 mở được 2 vé");
    const a1 = await call(ACCOUNTS.lai, "GET", `/api/ve/anh/${ds.veXem[0].id}`);
    assert.equal(a1.status, 200, "lai mở ảnh vé đơn L2");
    const dh = phai(await call(ACCOUNTS.lai, "GET", `/api/orders/${lai[kho].L2.id}`), 200, "chi tiết đơn L2");
    assert.equal(dh.coVeDaMo, true, "L2 phải là đơn đã mở vé");
  }
  // nhóm 3: trang khách /ve/:token. Đơn của Đối tác, Kế toán ghi tiền về công ty, Đối tác tạo đường dẫn, Quản trị tăng khách 2 → 4 (chưa thu thêm).
  const lk = {};
  for (const [kho] of KHO) {
    const d = await donDoiTac("Khách Link");
    await ghiThu(keToan, d, "cong_ty");
    const dd = phai(await call(DT, "POST", "/api/ve/duong-dan", { orderId: d.id }), 200, "tạo đường dẫn khách");
    const dv = env.sql(`SELECT id FROM order_service WHERE order_id = '${d.id}'`)[0].id;
    phai(await call(ACCOUNTS.admin, "POST", `/api/orders/${d.id}/money-edit`, { lyDo: "THEM_NGUOI", services: [{ id: dv, pax: { adult: 4, child: 0, senior: 0, infant: 0 } }] }), 200, "tăng khách 2 → 4");
    const tongMoi = phai(await call(ACCOUNTS.admin, "GET", `/api/orders/${d.id}`), 200, "đơn sau tăng").order.total;
    lk[kho] = { id: d.id, token: String(dd.duongDan).replace("/ve/", ""), chenh: tongMoi - d.total };
    assert.ok(lk[kho].chenh > 1000, "phần tăng đủ lớn để tách hai khoản");
  }
  // nhóm 4: Trả sau của Đối tác. Hạn mức cho hồ sơ của DT; TS1 trong hạn, TS2 sẽ bị lùi hạn trả về quá khứ SAU KHI mọi đơn Trả sau đã lập (đơn quá hạn chặn đơn Trả sau mới).
  const partyDT = env.sql(`SELECT party_id FROM staff WHERE phone = '${DT.phone}'`)[0].party_id;
  let hm = await call(ACCOUNTS.chu, "POST", "/api/tra-sau/han-muc", { partyId: partyDT, hanMuc: 10000000, soNgay: 7, lyDo: "Thử bằng chứng" });
  if (hm.status !== 201) {
    console.log(`    (cấp hạn mức lần đầu ${hm.status}: ${JSON.stringify(hm.json)}; thêm vai Đại lý du lịch rồi cấp lại)`);
    phai(await call(ACCOUNTS.admin, "POST", `/api/parties/${partyDT}/roles`, { roleTypeCode: "TRAVEL_AGENCY" }), 201, "thêm vai đại lý");
    hm = await call(ACCOUNTS.chu, "POST", "/api/tra-sau/han-muc", { partyId: partyDT, hanMuc: 10000000, soNgay: 7, lyDo: "Thử bằng chứng" });
  }
  phai(hm, 201, "cấp hạn mức Trả sau");
  const donTraSau = async (ten) => {
    const r = phai(await call(DT, "POST", "/api/orders", { customerName: `${ten} ${tag}`, customerPhone: "0913571362", paymentTerm: "CREDIT", services: [dvTD("ZVD1", 100000, 2)] }), 201, "lập đơn Trả sau");
    phai(await call(DT, "POST", `/api/orders/${r.order.id}/gui-don`, {}), 200, "gửi đơn Trả sau");
    return { id: r.order.id };
  };
  const ts = {};
  for (const [kho] of KHO) ts[kho] = { TS1: await donTraSau("Khách Trả Sau Một"), TS2: await donTraSau("Khách Trả Sau Hai") };
  env.sql(`UPDATE orders SET credit_due_date = '${vnDate(-3)}' WHERE id IN (${KHO.map(([kho]) => `'${ts[kho].TS2.id}'`).join(",")})`);
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
  const chupKhoi = async (p, ten, laySel = "document.getElementById('ve-don')") => {
    await p.ev(`${laySel}.scrollIntoView({ block: 'center' }), true`);
    await sleep(800);
    const r = await p.ev(`(() => { const b = ${laySel}.getBoundingClientRect(); return { x: Math.max(0, b.left + scrollX - 12), y: Math.max(0, b.top + scrollY - 12), width: Math.min(innerWidth, b.width + 24), height: b.height + 24 }; })()`);
    await p.ev("(() => { for (const e of document.querySelectorAll('#topbar, header, #tabbar')) { e.dataset.anTam = e.style.display; e.style.display = 'none'; } return true; })()");
    const s = await p.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true, clip: { ...r, scale: 1 } });
    await p.ev("(() => { for (const e of document.querySelectorAll('#topbar, header, #tabbar')) { e.style.display = e.dataset.anTam ?? ''; } return true; })()");
    writeFileSync(join(OUT, `${ten}.png`), Buffer.from(s.result.data, "base64"));
  };
  const sangTrang = async (p, path) => { await p.send("Page.navigate", { url: env.base + path }); await sleep(400); await p.waitFor("document.readyState === 'complete'", `trang ${path} tải xong`); };
  // Đơn A: đối tác tự ghi «Tôi thu» ⇒ chính người lập còn tiền chờ nộp ⇒ câu Q-07 (phiếu B-2 phương án (2), Task 3.2 Đợt 3), không còn câu «Công ty chưa xác nhận…».
  const lyDoChua = "Vé mở sau khi Công ty ghi nhận bạn đã nộp tiền.";
  const lyDoCu = "Công ty chưa xác nhận đã nhận đủ tiền nên chưa mở được vé.";

  for (const [kho, vp] of KHO) {
    console.log(`\n===== khổ ${kho} =====`);
    const { A, B, C } = don[kho];
    const pt = await taoMoTrang(env)(DT, `/order?id=${A.id}`, vp);
    await buoc(`${kho}-1`, "Tiền chưa về công ty (đơn A): câu lý do, không nút mở vé", async () => {
      await choKhoi(pt);
      const t = await vanBan(pt);
      assert.ok(t.includes(lyDoChua), `thiếu câu lý do: ${t}`);
      assert.ok(!t.includes(lyDoCu), `còn câu cũ «Công ty chưa xác nhận…» ở đơn đối tác tự cầm tiền: ${t}`);
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
      assert.ok(!t.includes(lyDoChua) && !t.includes(lyDoCu), "câu của đối tác lọt sang nhân viên");
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

    // ---- nhóm 1: Kế toán, khối chuyển cọc
    const pk = await taoMoTrang(env)(keToan, `/order?id=${coc[kho].khong.id}`, vp);
    const so = (t) => Number(String(t).replace(/\D/g, ""));
    for (const [loai, ma, ten] of [["khong", "7a", "đơn huỷ không ai giữ tiền"], ["mot", "7b", "một người giữ tiền"], ["nhieu", "7c", "nhiều người giữ tiền (ô chọn Người chưa nộp tiền)"]]) {
      await buoc(`${kho}-${ma}`, `Chuyển cọc, ${ten}`, async () => {
        if (loai !== "khong") await sangTrang(pk, `/order?id=${coc[kho][loai].id}`);
        await pk.waitFor("!!document.querySelector('[data-khoi=\"coc-don-huy\"] [data-action=\"coc-chuyen\"]')", "nút Chuyển tiền sang đơn mới");
        await pk.ev("document.querySelector('[data-khoi=\"coc-don-huy\"] [data-action=\"coc-chuyen\"]').click(), true");
        await pk.waitFor("!!document.querySelector('[data-khoi=\"xac-nhan-coc-chuyen\"]')", "hàng xác nhận chuyển cọc mở");
        const lay = async () => JSON.parse(await pk.ev(`(() => { const f = document.querySelector('[data-khoi="xac-nhan-coc-chuyen"]'); const sel = f.querySelector('select'); return JSON.stringify({ cau: f.querySelector('p').innerText, font: [...f.querySelectorAll('input, select')].map((e) => parseFloat(getComputedStyle(e).fontSize)), val: f.querySelector('input').value, sel: sel ? [...sel.options].map((o) => o.textContent) : null, nhanSel: sel ? sel.closest('label').innerText : null, khoi: document.querySelector('[data-khoi="coc-don-huy"]').innerText }); })()`));
        let m = await lay();
        assert.ok(m.font.length > 0 && m.font.every((x) => x >= 16), `ô gõ nhỏ hơn 16px: ${m.font}`);
        const toiDa = /tối đa ([\d.,\u00a0\u202f]+)/.exec(m.cau);
        if (loai === "khong") {
          assert.ok(m.cau.includes("tiền do Công ty giữ"), `câu: ${m.cau}`);
          assert.ok(toiDa && so(toiDa[1]) === 150000 && so(m.val) === 150000, `số trong câu ${toiDa?.[1]} khác ô ${m.val}`);
          assert.ok(!m.khoi.includes("Người chưa nộp tiền") && m.sel === null, "không có người giữ mà vẫn hiện ô chọn / dòng người chưa nộp");
        } else if (loai === "mot") {
          assert.ok(/tiền do (?!Công ty).+ giữ/.test(m.cau), `câu không nêu tên người giữ: ${m.cau}`);
          assert.ok(toiDa && so(toiDa[1]) === 150000 && so(m.val) === 150000, `số trong câu ${toiDa?.[1]} khác ô ${m.val}`);
          assert.ok(m.khoi.includes("Người chưa nộp tiền") && m.sel === null, "thiếu dòng người chưa nộp hoặc có ô chọn thừa");
        } else {
          assert.equal(m.sel?.length, 2, `ô chọn phải có 2 người: ${JSON.stringify(m.sel)}`);
          assert.ok(m.nhanSel.includes("Người chưa nộp tiền"), "thiếu nhãn «Người chưa nộp tiền»");
          assert.ok(m.cau.includes("chọn người chưa nộp tiền về công ty") && !toiDa, `câu: ${m.cau}`);
          for (let i = 0; i < 2; i++) {
            await pk.ev(`(() => { const s = document.querySelector('[data-khoi="xac-nhan-coc-chuyen"] select'); s.selectedIndex = ${i}; s.dispatchEvent(new Event('change', { bubbles: true })); return true; })()`);
            m = await lay();
            assert.equal(so(m.val), so(m.sel[i].replace(/^.*\(/, "")), `số trong ô ${m.val} khác phần người ở lựa chọn ${i + 1}: ${m.sel[i]}`);
          }
          console.log(`    ô chọn: ${m.sel.join(" | ")}`);
        }
        console.log(`    câu: «${m.cau}»; ô: ${m.val}`);
        await chung(pk, `${kho}-${ma}`, { loiChoPhep: /404.*\/thuong-mai/ }); // đơn huỷ: trang hỏi thuong-mai và nhận 404 (ghi nhận, xem báo cáo)
        await axeKiem(pk, `${kho}-${ma}`);
        await chup(pk, `7${ma.slice(1)}-chuyen-coc-${loai}-${kho}`); await chupKhoi(pk, `7${ma.slice(1)}-chuyen-coc-${loai}-${kho}-khoi`, "document.querySelector('[data-khoi=\"coc-don-huy\"]')");
      });
    }
    pk.close();

    // ---- nhóm 2: tài khoản lai Bán hàng + Đối tác
    const pl = await taoMoTrang(env)(ACCOUNTS.lai, `/order?id=${lai[kho].L1.id}`, vp);
    await buoc(`${kho}-8a`, "Tài khoản lai, đơn CHƯA mở vé: vẫn có nút «Sửa số khách dịch vụ»", async () => {
      await pl.waitFor("!!document.querySelector('[data-action=\"sua-so-khach\"]')", "nút Sửa số khách dịch vụ");
      assert.equal(await pl.ev("document.querySelector('[data-action=\"sua-so-khach\"]').textContent.trim()"), "Sửa số khách dịch vụ");
      assert.ok(!(await coNut(pl, '[data-chan="sua-so-khach-da-mo-ve"]')), "câu chặn hiện ở đơn chưa mở vé");
      await choKhoi(pl);
      await chung(pl, `${kho}-8a`);
      await axeKiem(pl, `${kho}-8a`);
      await chup(pl, `8a-lai-chua-mo-ve-${kho}`); await chupKhoi(pl, `8a-lai-chua-mo-ve-${kho}-khoi`, "document.querySelector('[data-action=\"sua-so-khach\"]').parentElement");
    });
    await buoc(`${kho}-8b`, "Tài khoản lai, đơn ĐÃ mở vé: không có nút, có câu thay thế", async () => {
      await sangTrang(pl, `/order?id=${lai[kho].L2.id}`);
      await pl.waitFor("!!document.querySelector('[data-chan=\"sua-so-khach-da-mo-ve\"]') || !!document.querySelector('[data-action=\"sua-so-khach\"]')", "khu nút sửa số khách dựng xong");
      assert.ok(!(await coNut(pl, '[data-action="sua-so-khach"]')), "vẫn còn nút Sửa số khách dịch vụ sau khi đã mở vé");
      const cau = await pl.ev("document.querySelector('[data-chan=\"sua-so-khach-da-mo-ve\"]')?.innerText ?? null");
      assert.equal(cau, "Đơn đã mở vé nên bạn không tự sửa số khách được. Liên hệ văn phòng.");
      await choKhoi(pl);
      await chung(pl, `${kho}-8b`);
      await axeKiem(pl, `${kho}-8b`);
      await chup(pl, `8b-lai-da-mo-ve-${kho}`); await chupKhoi(pl, `8b-lai-da-mo-ve-${kho}-khoi`, "document.querySelector('[data-chan=\"sua-so-khach-da-mo-ve\"]').parentElement");
    });
    pl.close();

    // ---- nhóm 3: trang khách /ve/:token (không đăng nhập)
    // trang khách KHÔNG đăng nhập: mở bằng khung chung (để bước đỏ còn in được trạng thái trang) rồi xoá hết cookie
    const pc = await taoMoTrang(env)(DT, "/", vp);
    await pc.send("Network.clearBrowserCookies");
    pc.consoleErrors.length = 0; pc.logEntries.length = 0; // bỏ nhật ký của trang "/" mở lúc đăng nhập mồi
    const traKhach = async (nhan, slots, conThieu) => {
      await pc.send("Page.navigate", { url: `${env.base}/ve/${lk[kho].token}` });
      await sleep(400);
      await pc.waitFor("document.readyState === 'complete' && [...document.images].every((i) => i.complete)", "trang khách tải xong");
      const m = JSON.parse(await pc.ev("JSON.stringify({ so: [...document.querySelectorAll('img[src*=\"/anh/\"]')].map((i) => Number(/\\/anh\\/(\\d+)/.exec(i.getAttribute('src'))[1])), ve: [...document.querySelectorAll('img[src*=\"/anh/\"]')].map((i) => i.naturalWidth), cap: [...document.querySelectorAll('figcaption')].map((c) => c.innerText), chu: document.body.innerText, html: document.documentElement.outerHTML, sw: document.documentElement.scrollWidth, iw: innerWidth })"));
      assert.deepEqual(m.so, slots, `số thứ tự vé trên trang: ${m.so}`);
      assert.ok(m.ve.every((w) => w > 0), "có ảnh vé không vẽ được");
      assert.ok(m.cap.every((c, i) => c.startsWith(`Vé ${slots[i]} ·`)), `chú thích: ${m.cap}`);
      if (conThieu) assert.ok(m.chu.includes("Còn 2 vé chưa sẵn sàng. Bạn liên hệ người đặt giúp."), `thiếu câu «Còn 2 vé chưa sẵn sàng»: ${m.chu}`);
      else assert.ok(!/chưa sẵn sàng/.test(m.chu), "đủ tiền mà vẫn nói chưa sẵn sàng");
      assert.ok(!/tiền|₫|đồng|thanh toán|công nợ|\bnợ\b|thu đủ|hạn mức|\d{1,3}(\.\d{3})+/i.test(m.chu), `có chữ về tiền trên trang khách: ${m.chu}`);
      assert.ok(DAU.test(m.chu), "chữ trang khách không có dấu");
      assert.ok(m.sw <= m.iw, `${nhan}: tràn ngang ${m.sw} > ${m.iw}`);
      assert.ok(!new RegExp(`E2E\\.${tag}|vdt/`).test(m.html), "có mã vé trong DOM trang khách");
      assert.deepEqual([...pc.consoleErrors, ...pc.logEntries.filter((l) => l.level === "error").map((l) => `${l.text} ${l.url ?? ""}`)].filter((x) => !/404.*\/favicon\.ico|\/api\/(?!ve-khach)|\/js\//.test(x)), [], // mọi /api/ khác ve-khach và /js/: dư âm (thăm dò, websocket) của trang "/" mở lúc đăng nhập mồi, không phải của trang khách. favicon.ico 404: trang khách không khai biểu tượng (ghi nhận, xem báo cáo)
       `${nhan}: lỗi console`);
      await axeKiem(pc, nhan);
      console.log(`    trang khách (${nhan}): vé ${m.so.join(", ")}${conThieu ? " + câu «Còn 2 vé chưa sẵn sàng»" : ""}`);
    };
    await buoc(`${kho}-9a`, "Trang khách, đơn tăng khách 2 → 4 chưa thu thêm: 2 vé và câu «Còn 2 vé chưa sẵn sàng»", async () => {
      await traKhach(`${kho}-9a`, [1, 2], true);
      await chup(pc, `9a-trang-khach-thieu-tien-${kho}`);
    });
    await buoc(`${kho}-9b`, "Trang khách, đã thu đủ phần tăng: 4 vé, vé 1 và 2 giữ nguyên số", async () => {
      for (const soTien of [lk[kho].chenh - 1000, 1000]) await ghiTien(keToan, lk[kho].id, soTien, "cong_ty");
      await traKhach(`${kho}-9b`, [1, 2, 3, 4], false);
      await chup(pc, `9b-trang-khach-du-tien-${kho}`);
    });
    pc.close();

    // ---- nhóm 4: Đối tác, đơn Trả sau
    const pd = await taoMoTrang(env)(DT, `/order?id=${ts[kho].TS1.id}`, vp);
    await buoc(`${kho}-10a`, "Trả sau trong hạn, chưa thu đồng nào: có nút «Mở 2 vé…»", async () => {
      await choKhoi(pd);
      const t = await vanBan(pd);
      assert.equal(await pd.ev(`[...document.querySelectorAll('#ve-don [data-action="chuan-bi-ve"]')].map((b) => b.textContent.trim()).join('|')`), "Mở 2 vé để gửi khách", `khối vé: ${t}`);
      assert.ok(!/chưa mở được vé|chưa xem hoặc gửi được|quá hạn/.test(t), `còn câu khoá: ${t}`);
      await chung(pd, `${kho}-10a`);
      await axeKiem(pd, `${kho}-10a`);
      await chup(pd, `10a-tra-sau-trong-han-${kho}`); await chupKhoi(pd, `10a-tra-sau-trong-han-${kho}-khoi`);
    });
    await buoc(`${kho}-10b`, "Trả sau quá hạn: câu quá hạn, không có nút mở vé chưa mở", async () => {
      await sangTrang(pd, `/order?id=${ts[kho].TS2.id}`);
      await choKhoi(pd);
      const t = await vanBan(pd);
      assert.ok(t.includes("Đơn trả sau đã quá hạn nên chưa mở được thêm vé."), `thiếu câu quá hạn: ${t}`);
      assert.ok(!(await coNut(pd, '#ve-don [data-action="chuan-bi-ve"], #ve-don [data-action="tao-duong-dan"], #ve-don [data-action="gui-zalo"]')), "còn nút mở vé ở đơn quá hạn");
      await chung(pd, `${kho}-10b`);
      await axeKiem(pd, `${kho}-10b`);
      await chup(pd, `10b-tra-sau-qua-han-${kho}`); await chupKhoi(pd, `10b-tra-sau-qua-han-${kho}-khoi`);
    });
    pd.close();
  }
  console.log(`\nkiểm màu axe: đã chạy (AXE_JS=${process.env.AXE_JS ? "có" : "KHÔNG"})`);
} finally {
  await env.stop();
}
ketThuc("DOI-TAC-VE");
