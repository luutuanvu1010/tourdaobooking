// Kịch bản Chrome — trang «Hỗ trợ» làm lại (PR 3, đặc tả 2026-10-25 mục B, C, E). Đây là rào DUY NHẤT cho phần GIAO DIỆN của trang: `npm test` canh luật thuần
// (src/shared/ve-ho-tro-hien-thi.ts…) và máy chủ, `npm run test:e2e` canh HTTP, nhưng không bài nào mở trang. THAY bảy kịch bản cũ (dot-c-smoke, v1-bao-tri,
// ve-ho-tro-smoke, ve-ho-tro-2a-smoke, help-smoke, trang-chu-smoke, quyen-thieu-quan-tri-smoke — phần trang /feedback) từ 2026-10-27. Chín bước, mỗi khổ 390 và 1040:
//   1) Bán hàng gửi yêu cầu từ trang đơn CỦA MÌNH (`?new=1&from=/order?id=<đơn mình>`) → đơn điền sẵn, gửi được; từ đơn NGƯỜI KHÁC → «Không gắn đơn»;
//   2) Bán hàng mở yêu cầu của mình (đã có nhận việc + giao + ghi chú nội bộ): KHÔNG chip quyền, KHÔNG nút «Ghi chú nội bộ», KHÔNG dòng hệ thống, KHÔNG ghi chú nội bộ;
//      thấy «Người xử lý: <tên>» (M-1);
//   3) Kế toán (thành viên): «Việc của nhóm» với hơn 50 yêu cầu dựng sẵn → số trên ba nút khớp máy chủ và đổi theo bộ lọc trạng thái; «Tải thêm» không lặp dòng;
//      «Nhận việc» → chip «Đã tiếp nhận»; ba dòng hệ thống đúng thứ tự (một dòng tới sau khi trang đã mở, qua vòng làm mới); ghi chú nội bộ nền riêng; «Chi tiết» có dòng email;
//   4) Từ chối: bước 2 lỗi → câu CAU_TU_CHOI_LOI_BUOC_2; bấm lại → thành công; luồng có ĐÚNG MỘT tin lý do; người gửi thấy «Từ chối» + lý do;
//   5) Người gửi trả lời yêu cầu đã từ chối → dòng «Gửi sẽ mở lại yêu cầu này» hiện TRƯỚC khi bấm; gửi → «Đã tiếp nhận»;
//   6) Trưởng nhóm giao việc; chuyển nhóm (lý do để trống → không gửi gì); thành viên nhóm mới KHÔNG thấy ghi chú nội bộ của nhóm cũ;
//   7) Toàn quyền: bảng nhóm; «Thêm nhóm» không có ô mã; công tắc «Nhạy cảm» giữ sau khi tải lại, vùng chạm ≥ 44px; nhóm Kỹ thuật KHÔNG có «Ngưng nhóm», nhóm khác có;
//   8) (390) mở yêu cầu → thanh tab ẩn; đóng bằng nút «‹», nút quay lại của trình duyệt, phím Esc → thanh tab hiện lại; hit-test tâm «Gửi», «Nhận việc», «＋ Gửi yêu cầu»
//      không trúng `.tl-fab`; ô trả lời 16px;
//   9) Chuỗi cấm không có trong chữ nhìn thấy: «Hàng đợi nhóm», «Trợ giúp», «phiếu/Phiếu», «Mozilla/5.0» (khi «chuỗi gốc» chưa mở); mở «chuỗi gốc» thì có.
// Thêm 2026-10-28 (tệp kèm, ADR-0144; chạy TRƯỚC bước 1 nên `HT_DUNG=T2` chạy riêng phần tệp):
//   T1) Bán hàng Hai chọn cùng lúc ảnh PNG 3000×1500, PDF, tệp chữ đổi đuôi .png → tệp giả bị từ chối bằng câu tiếng Việt, hai tệp vào danh sách; «Bỏ» rồi chọn lại
//       đúng tệp; tệp mà để trống mô tả → «Hãy viết vài chữ kèm tệp.»; gửi → ảnh lưu ở dạng JPG cạnh dài 2000 (đã thu nhỏ trên máy), thẻ «Tệp PDF» có «Tải về»,
//       không nút «Gỡ tệp»; MỖI ẢNH TẢI ĐÚNG MỘT LẦN (đếm yêu cầu của trình duyệt + dòng nhật ký «xem tệp») qua hai vòng tự làm mới VÀ sau khi gửi thêm một tin;
//   T2) Toàn quyền gỡ ảnh: hộp xác nhận → tin còn dòng «Tệp đã được gỡ», máy chủ trả 404 cho tệp đó, PDF vẫn tải được.
// Mỗi bước: không tràn ngang, ô gõ ≥ 16px, không chữ Anh / mã thô, không chuỗi cấm, axe-core (critical / serious ⇒ đỏ; thiếu AXE_JS ⇒ dừng ngay), chụp ảnh.
// PHÁ THỬ (P16, KHÔNG sửa mã sản phẩm — chỉ bọc trình duyệt):
//   HT_PHA=lo-noi-bo — lớp bọc `fetch` đổi `perms.xuLy` thành true ở chi tiết yêu cầu của người gửi ⇒ giao diện dựng nút «Ghi chú nội bộ» + chip ⇒ bước 2 ĐỎ;
//   HT_PHA=tab — chặn `classList.toggle('tabbar-an', false)` (tức bỏ `datThanhTab(true)` khi đóng) ⇒ thanh tab không hiện lại ⇒ bước 8 ĐỎ;
//   HT_PHA=ngung-ky-thuat — đổi mã nhóm Kỹ thuật trong phản hồi bảng nhóm ⇒ hộp «Sửa» dựng nút «Ngưng nhóm» cho nhóm Kỹ thuật ⇒ bước 7 ĐỎ.
// Bước 4 luôn bơm lỗi giả cho lần PATCH …/xu-ly {status: DECLINED} đầu tiên (đó chính là kịch bản «bước 2 lỗi»).
// HT_KHO=390|1040 chạy một khổ; HT_DUNG=<mã bước> dừng sau bước đó. Chạy từ GỐC repo, sau `npm run build:web`:
//   AXE_JS=<…/axe.min.js> CHROME_BIN=… node docs/evidence/2026-10-27-ho-tro-thiet-ke-lai/kich-ban/ho-tro-smoke.mjs
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ACCOUNTS, docAxe, ok, setInput, sleep, startEnv } from "../../2026-10-08-qr-thanh-toan/kich-ban/qr-chung.mjs";

const AXE = docAxe();
const OUT = process.env.OUT ?? join(process.cwd(), "docs/evidence/2026-10-27-ho-tro-thiet-ke-lai/anh");
mkdirSync(OUT, { recursive: true });
const MOB = { width: 390, height: 844, mobile: true };
const DESK = { width: 1040, height: 900, mobile: false };
const KHO = [["390", MOB], ["1040", DESK]].filter(([ten]) => !process.env.HT_KHO || process.env.HT_KHO === ten);
const DUNG = process.env.HT_DUNG ?? "";
const PHA = process.env.HT_PHA ?? "";
const KY_THUAT = "fbk-team-ky-thuat";

// Chữ phải KHỚP NGUYÊN VĂN với src/shared/ve-ho-tro-hien-thi.ts (viết lại có chủ đích: đổi chữ mà quên kịch bản ⇒ đỏ).
const CAU_MO_LAI = "Gửi sẽ mở lại yêu cầu này";
const CAU_TU_CHOI_LOI_BUOC_2 = "Đã gửi lý do nhưng chưa đổi được trạng thái. Bấm Từ chối lại.";
const CHU_ANH = /\b(fbk_\w+|CLAIMED|ASSIGNED|TEAM_CHANGED|DECLINED|IN_PROGRESS|UNASSIGNED|NEW|ACK|URGENT|HIGH|MEMBER|LEAD|stale|invalid_input|forbidden|undefined|null|NaN|Internal Server Error)\b|\[object/;
const CHU_CAM = [/Hàng đợi nhóm/, /Trợ giúp/, /[Pp]hiếu/, /Mozilla\/5\.0/];

const PHA_TRANG = `
  window.confirm = () => true; window.alert = () => {};
  window.__htTaiTep = [];
  try { new PerformanceObserver((l) => { for (const e of l.getEntries()) { const d = new URL(e.name).pathname; if (d.startsWith('/api/feedback/') && d.split('/').length === 6 && d.split('/')[4] === 'tep') window.__htTaiTep.push(d); } }).observe({ type: 'resource', buffered: true }); } catch {}
  ${PHA === "tab" ? "{ const t = DOMTokenList.prototype.toggle; DOMTokenList.prototype.toggle = function (tok, force) { if (tok === 'tabbar-an' && force === false) return false; return t.call(this, tok, force); }; }" : ""}
  { const f = window.fetch.bind(window);
    window.fetch = async (u, o) => {
      const url = String(u); const m = String((o && o.method) || 'GET').toUpperCase();
      if (window.__htLoiBuoc2 && m === 'PATCH' && /\\/api\\/feedback\\/[^/]+\\/xu-ly$/.test(url) && String((o && o.body) || '').includes('DECLINED')) {
        window.__htLoiBuoc2 = false;
        return new Response(JSON.stringify({ error: { code: 'internal', message: 'Lỗi giả lập' } }), { status: 500, headers: { 'content-type': 'application/json' } });
      }
      const r = await f(u, o);
      const goc = url.split('?')[0];
      ${PHA === "lo-noi-bo" ? "if (m === 'GET' && /\\/api\\/feedback\\/[0-9a-f-]{36}$/.test(goc) && r.ok) { const b = await r.clone().json(); if (b.perms) b.perms.xuLy = true; return new Response(JSON.stringify(b), { status: 200, headers: { 'content-type': 'application/json' } }); }" : ""}
      ${PHA === "ngung-ky-thuat" ? `if (m === 'GET' && goc.endsWith('/api/feedback/admin/teams') && r.ok) { const b = await r.clone().json(); for (const t of b.teams) if (t.id === '${KY_THUAT}') t.id = 'x-ky-thuat'; return new Response(JSON.stringify(b), { status: 200, headers: { 'content-type': 'application/json' } }); }` : ""}
      return r; }; }`;

const loi = [];
const axeNhe = [];
const anh = [];
async function buoc(id, ten, fn) {
  try {
    await fn();
    ok(`${id}) ${ten}`);
  } catch (e) {
    const msg = String(e?.message ?? e).split("\n").slice(0, 12).join("\n    ");
    loi.push(`${id}) ${ten}: ${msg.split("\n")[0]}`);
    console.log(`✗ ${id}) ${ten}\n    ${msg}`);
  }
  if (id.replace(/\[.*$/, "") === DUNG) throw new Error("DUNG");
}
async function chup(p, ten, toanTrang = true) {
  await sleep(700);
  if (toanTrang) await p.ev("(() => { for (const e of document.querySelectorAll('#tabbar, .tl-fab')) { e.dataset.anTam = e.style.display; e.style.display = 'none'; } return true; })()");
  const r = await p.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: toanTrang });
  if (toanTrang) await p.ev("(() => { for (const e of document.querySelectorAll('#tabbar, .tl-fab')) { e.style.display = e.dataset.anTam ?? ''; } return true; })()");
  writeFileSync(join(OUT, `${ten}.png`), Buffer.from(r.result.data, "base64"));
  anh.push(ten);
}
async function axeKiem(p, nhan) {
  if (!(await p.ev("typeof axe !== 'undefined'"))) await p.ev(`${AXE}\n;true`);
  const vi = await p.ev(`axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'best-practice'], rules: { 'meta-viewport': { enabled: false } } }).then((r) => r.violations.map((v) => ({ impact: v.impact, id: v.id, nodes: v.nodes.slice(0, 4).map((n) => n.target.join(' ')) })))`);
  const nang = vi.filter((v) => v.impact === "critical" || v.impact === "serious");
  for (const v of vi.filter((x) => !nang.includes(x))) axeNhe.push(`${nhan}: ${v.impact} ${v.id} — ${v.nodes.join(" | ")}`);
  assert.deepEqual(nang, [], `axe nghiêm trọng (${nhan}): ${JSON.stringify(nang)}`);
}
/** Không tràn ngang; ô gõ đang hiện ≥ 16px (cả trong hộp trượt); không chữ Anh / mã thô; không chuỗi cấm. */
async function bocucSach(p, nhan) {
  const m = await p.ev(`(() => {
    const nho = [...document.querySelectorAll('main input, main select, main textarea, .sheet input, .sheet select, .sheet textarea')].filter((e) => e.offsetParent !== null && e.type !== 'hidden' && e.type !== 'radio' && e.type !== 'checkbox' && parseFloat(getComputedStyle(e).fontSize) < 16)
      .map((e) => (e.id || e.tagName) + ':' + getComputedStyle(e).fontSize);
    const cuonNgang = (e) => { for (let a = e.parentElement; a && a !== document.body; a = a.parentElement) { const o = getComputedStyle(a).overflowX; if ((o === 'auto' || o === 'scroll') && a.getBoundingClientRect().right <= innerWidth + 1) return true; } return false; };
    const ra = [...document.querySelectorAll('main *')].filter((e) => e.offsetParent !== null && !cuonNgang(e) && e.getBoundingClientRect().right > innerWidth + 1).map((e) => e.tagName + '.' + (e.className || e.id || '')).slice(0, 5);
    return { sw: document.documentElement.scrollWidth, iw: innerWidth, nho, ra, chu: document.body.innerText };
  })()`);
  assert.ok(m.sw <= m.iw + 1, `${nhan}: tràn ngang (scrollWidth ${m.sw} > innerWidth ${m.iw}; phần tử ra ngoài: ${m.ra.join(", ")})`);
  assert.deepEqual(m.ra, [], `${nhan}: phần tử vượt mép phải`);
  assert.deepEqual(m.nho, [], `${nhan}: ô gõ nhỏ hơn 16px`);
  assert.ok(!CHU_ANH.test(m.chu), `${nhan}: lộ chữ Anh / mã thô: ${CHU_ANH.exec(m.chu)?.[0]}`);
  for (const re of CHU_CAM) assert.ok(!re.test(m.chu), `${nhan}: còn chữ cấm «${re.exec(m.chu)?.[0]}»`);
}
const kiem = async (p, nhan) => { await bocucSach(p, nhan); await axeKiem(p, nhan); };

const env = await startEnv();
try {
  const goiCk = async (ck, method, path, body) => {
    const r = await fetch(env.base + path, { method, headers: { "content-type": "application/json", origin: env.base, cookie: `${ck.name}=${ck.value}` }, body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: r.status, json: await r.json().catch(() => null) };
  };
  const call = async (account, method, path, body) => goiCk(await env.login(account), method, path, body);
  const phai = (r, status, nhan) => { assert.equal(r.status, status, `${nhan}: ${r.status} ${JSON.stringify(r.json)}`); return r.json; };
  const CHU = String(Date.now()).slice(-6).replace(/\d/g, (d) => "ABCDEGHKLM"[d]);
  const dsNv = phai(await call(ACCOUNTS.chu, "GET", "/api/staff"), 200, "danh sách nhân viên").staff;
  const idCua = (a) => dsNv.find((s) => s.phone === a.phone).id;
  const ID = { chu: idCua(ACCOUNTS.chu), kt: idCua(ACCOUNTS.accounting), sB: idCua(ACCOUNTS.salesB), sA: idCua(ACCOUNTS.salesA), ad: idCua(ACCOUNTS.admin) };

  const moTrang = async (account, path, vp) => {
    const p = await env.openPage(vp);
    p.vp = vp;
    await p.send("Page.addScriptToEvaluateOnNewDocument", { source: PHA_TRANG });
    const c = await env.login(account);
    await p.send("Network.setCookie", { name: c.name, value: c.value, url: env.base, httpOnly: true });
    await p.send("Page.navigate", { url: env.base + path });
    await p.waitFor("document.readyState === 'complete'", `trang ${path} tải xong`);
    return p;
  };
  const diDen = async (p, path) => {
    await p.send("Page.navigate", { url: env.base + path });
    await p.waitFor("document.readyState === 'complete'", `trang ${path} tải xong`);
  };
  const bam = (p, selector) => p.ev(`(() => { const e = document.querySelector(${JSON.stringify(selector)}); if (!e) return false; e.click(); return true; })()`);
  const bamChu = (p, scope, chu) => p.ev(`(() => { const b = [...document.querySelectorAll(${JSON.stringify(scope)} + ' button')].find((x) => x.textContent.trim() === ${JSON.stringify(chu)} && x.offsetParent !== null); if (!b) return false; b.click(); return true; })()`);
  const choLuong = (p) => p.waitFor("!!document.querySelector('#ht-luong .ht-tieu-de-luong') && !!document.getElementById('fb-tin-ds')", "luồng đã dựng");
  const moLuongTuUrl = async (p, id) => { await diDen(p, `/feedback?id=${id}`); await choLuong(p); };
  const goiTrongTrang = (p, method, path, body) => p.ev(`fetch(${JSON.stringify(path)}, { method: ${JSON.stringify(method)}, headers: { 'content-type': 'application/json' }, body: ${body === undefined ? "undefined" : JSON.stringify(JSON.stringify(body))} }).then(async (r) => ({ status: r.status, json: await r.json().catch(() => null) }))`);
  const choSheet = (p, sel) => p.waitFor(`!!document.querySelector(${JSON.stringify(".sheet " + sel)})`, `hộp có ${sel}`);
  const choDongSheet = (p) => p.waitFor("!document.querySelector('.sheet-root')", "hộp đã đóng");
  const text = (p, sel) => p.ev(`document.querySelector(${JSON.stringify(sel)})?.innerText ?? null`);
  const chuyenGhiChu = (p, sel) => p.ev(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); return e ? e.innerText : ''; })()`);

  let dauTien = true;
  try {
    for (const [tenKho, vp] of KHO) {
      const kho = `[${tenKho}]`;
      const D = tenKho === "390" ? "M" : "D";
      const moi = tenKho === "390";

      // ================= dựng dữ liệu bằng API + SQL (CHƯA mở trang nào: luật một máy ADR-0075) =================
      // Trần 5 yêu cầu / giờ / người gửi: đẩy ngày tạo của các yêu cầu cũ của Bán hàng Một về quá khứ để mỗi khổ có đủ 5 lần gửi.
      env.sql(`UPDATE fbk_ticket SET created_at = '2026-01-01T00:00:00.000Z' WHERE submitter_id = '${ID.sA}'`);
      const nhomMoi = async (ten) => phai(await call(ACCOUNTS.chu, "POST", "/api/feedback/admin/teams", { name: `${ten} ${CHU} ${D}`, description: `Nhóm thử ${ten}` }), 201, `nhóm ${ten}`).team;
      const X = await nhomMoi("Hỗ trợ thử");
      const Y = await nhomMoi("Nhóm đích");
      const themTv = async (nhom, id, role) => phai(await call(ACCOUNTS.chu, "PUT", `/api/feedback/admin/teams/${nhom.id}/members/${id}`, { role }), 200, "thêm thành viên");
      await themTv(X, ID.kt, "MEMBER"); await themTv(X, ID.sB, "LEAD"); await themTv(X, ID.chu, "MEMBER"); await themTv(Y, ID.ad, "MEMBER");
      const donMoi = async (account, ten) => {
        const r = phai(await call(account, "POST", "/api/orders", {
          customerName: ten, customerPhone: "0909 000 222", customerEmail: "", customerNote: "", discount: 0, depositAmount: 0, depositMethod: null, paymentNote: "",
          services: [{ kind: "catalog", pickupChoice: "KHONG_DON", catalogCode: "TTB06", pax: { adult: 1, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: 800000 }, departDate: "", departTime: "", pickupTime: "", pickupPlace: "", checkinDate: "", checkinTime: "", checkinPlace: "", note: "" }],
        }), 201, `lập đơn ${ten}`);
        return { id: r.order?.id ?? r.id, ma: r.order?.orderCode ?? r.orderCode };
      };
      const DON_A = await donMoi(ACCOUNTS.salesA, `Khách Hỗ Trợ A ${D}`);
      const DON_B = await donMoi(ACCOUNTS.salesB, `Khách Hỗ Trợ B ${D}`);
      assert.ok(DON_A.id && DON_A.ma && DON_B.id, "hai đơn có id + mã");
      // Bán hàng Một gửi bốn yêu cầu bằng API (thứ năm là lần gửi ở bước 1).
      const ckA = await env.login(ACCOUNTS.salesA);
      const guiYc = async (tieuDe, thong, nhom) => phai(await goiCk(ckA, "POST", "/api/feedback", { kind: "BUG", title: tieuDe, body: thong, clientRequestId: crypto.randomUUID(), teamId: nhom.id, context: { device: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Safari", standalone: false } }), 201, `gửi ${tieuDe}`).ticket;
      const T2 = await guiYc(`Đơn này tính sai tiền cọc ${D}`, "Tiền cọc hiện 0 đ nhưng khách đã chuyển.", X);
      const T3 = await guiYc(`Nút lưu bị che bàn phím ${D}`, "Trên iPhone nhỏ, bàn phím che mất nút lưu.", Y);
      const T4 = await guiYc(`Xin thêm mục báo cáo tuần ${D}`, "Cần một báo cáo gom theo tuần.", X);
      const T6 = await guiYc(`Hỏi về quyền xem đơn ${D}`, "Ai xem được đơn của người khác?", X);
      // T2: Kế toán nhận việc, trả lời công khai + ghi chú nội bộ, rồi Trưởng nhóm giao cho Chủ Thử. T4: Kế toán nhận việc (để từ chối được). T6: Kế toán ghi chú nội bộ.
      const ckKt = await env.login(ACCOUNTS.accounting);
      phai(await goiCk(ckKt, "POST", `/api/feedback/${T2.id}/claim`), 200, "Kế toán nhận T2");
      phai(await goiCk(ckKt, "POST", `/api/feedback/${T2.id}/messages`, { body: "Kế toán đã nhận, đang kiểm sổ.", internal: false }), 201, "trả lời công khai T2");
      phai(await goiCk(ckKt, "POST", `/api/feedback/${T2.id}/messages`, { body: `NOIBO-T2 đối chiếu sao kê ${D}`, internal: true }), 201, "ghi chú nội bộ T2");
      phai(await goiCk(ckKt, "POST", `/api/feedback/${T4.id}/claim`), 200, "Kế toán nhận T4");
      const NOTE_T6 = `NOIBO-T6 ghi chú của nhóm cũ ${D}`;
      phai(await goiCk(ckKt, "POST", `/api/feedback/${T6.id}/messages`, { body: NOTE_T6, internal: true }), 201, "ghi chú nội bộ T6");
      const ckSb = await env.login(ACCOUNTS.salesB);
      phai(await goiCk(ckSb, "PATCH", `/api/feedback/${T2.id}/xu-ly`, { assigneeId: ID.chu }), 200, "Trưởng nhóm giao T2 cho Chủ Thử");
      // T3 gửi nhóm Y rồi Toàn quyền chuyển sang X (sự kiện «Chuyển sang nhóm …» đứng đầu luồng).
      phai(await call(ACCOUNTS.chu, "POST", `/api/feedback/${T3.id}/transfer`, { teamId: X.id, reason: "Đúng việc của nhóm này" }), 200, "chuyển T3 sang X");
      env.sql(`UPDATE fbk_ticket SET notified_at = NULL WHERE id = '${T3.id}'`); // «Chi tiết» có dòng «Email báo nhóm: chưa gửi được»
      // 60 yêu cầu dựng sẵn bằng SQL (qua trần gửi): 60 Mới chưa ai nhận, 6 Đã tiếp nhận do Kế toán giữ, 4 Đã xong, 3 Từ chối.
      const [{ mx }] = env.sql("SELECT MAX(seq) AS mx FROM fbk_ticket");
      const hang = [];
      const them = (n, status, giu) => { for (let i = 0; i < n; i++) hang.push({ status, giu }); };
      them(60, "NEW", null); them(6, "ACK", ID.kt); them(4, "DONE", null); them(3, "DECLINED", null);
      const gio = (i) => new Date(Date.UTC(2026, 9, 20, 0, 0, 0) + i * 60_000).toISOString();
      env.sql(`INSERT INTO fbk_ticket (id, seq, kind_code, status_code, title, submitter_id, assignee_id, client_request_id, last_activity_at, created_at, updated_at, team_id) VALUES ${hang.map((d, i) =>
        `('${crypto.randomUUID()}', ${mx + 1 + i}, 'QUESTION', '${d.status}', 'Hỏi về công nợ số ${i + 1}', '${ID.sA}', ${d.giu ? `'${d.giu}'` : "NULL"}, '${crypto.randomUUID()}', '${gio(i)}', '2026-01-01T00:00:00.000Z', '${gio(i)}', '${X.id}')`).join(",")}`);

      // ======================= Tệp kèm (ADR-0144): T1 Bán hàng Hai gửi + xem, T2 Toàn quyền gỡ =======================
      // Bán hàng HAI gửi: Bán hàng Một dùng đủ trần 5 yêu cầu / giờ cho bước 1. Yêu cầu đi nhóm Kỹ thuật (mặc định), không chạm số đếm của nhóm X ở bước 3.
      const CAU_SAI_LOAI = "Chỉ nhận ảnh JPG, PNG, HEIC hoặc tệp PDF."; // khớp NGUYÊN VĂN src/shared/tep-dinh-kem.ts
      const CAU_CAN_CHU = "Hãy viết vài chữ kèm tệp."; // khớp NGUYÊN VĂN src/shared/tep-hien-thi.ts
      let VE_TEP = null;
      let TEP_ANH = null;
      let TEP_PDF = null;
      {
        const p = await moTrang(ACCOUNTS.salesB, "/feedback?new=1", vp);
        try {
          await buoc(`T1${kho}`, "Gửi kèm ảnh + PDF: tệp sai loại bị từ chối, ảnh thu nhỏ còn JPG cạnh dài 2000, mỗi ảnh tải MỘT lần qua làm mới và gửi thêm tin", async () => {
            await choSheet(p, "#new-tep-nut");
            const chonTep = (ds) => p.ev(`(async () => {
              const c = document.createElement('canvas'); c.width = 3000; c.height = 1500;
              const g = c.getContext('2d'); g.fillStyle = '#0a6'; g.fillRect(0, 0, 1500, 1500); // nửa phải trong suốt: phải ra nền trắng
              const png = await new Promise((r) => c.toBlob(r, 'image/png'));
              const tep = { png: new File([png], 'man-hinh.png', { type: 'image/png' }), pdf: new File(['%PDF-1.4\\n1 0 obj<<>>endobj\\ntrailer<<>>\\n%%EOF\\n'], 'bien-nhan.pdf', { type: 'application/pdf' }), gia: new File(['xin chao'], 'gia-anh.png', { type: 'image/png' }) };
              const dt = new DataTransfer(); for (const k of ${JSON.stringify(ds)}) dt.items.add(tep[k]);
              const i = document.getElementById('new-tep-input'); i.files = dt.files; i.dispatchEvent(new Event('change')); return true; })()`);
            const dsChon = () => p.ev("[...document.querySelectorAll('#new-tep-ds [data-tep-chon]')].map((e) => e.firstElementChild.textContent)");
            const xongChon = (n) => p.waitFor(`document.querySelectorAll('#new-tep-ds [data-tep-chon]').length === ${n} && !document.getElementById('new-tep-nut').disabled`, `${n} tệp trong danh sách`);
            await chonTep(["png", "pdf", "gia"]);
            await xongChon(2);
            assert.equal(await text(p, ".sheet p.alert"), CAU_SAI_LOAI, "tệp chữ đổi đuôi .png bị từ chối bằng câu tiếng Việt");
            let nhan = await dsChon();
            assert.match(nhan[0], /^Ảnh 1 · \d+ KB$/, `nhãn ảnh: ${nhan[0]}`);
            assert.equal(nhan[1], "Tệp PDF · 1 KB");
            // «Bỏ» PDF rồi chọn lại đúng tệp đó (ô chọn được đặt lại sau mỗi lần chọn)
            assert.equal(await p.ev("(() => { const b = document.querySelector('#new-tep-ds [data-tep-chon]:nth-child(2) .ht-tep-bo'); b.click(); return true; })()"), true);
            await xongChon(1);
            await chonTep(["pdf"]);
            await xongChon(2);
            nhan = await dsChon();
            assert.equal(nhan[1], "Tệp PDF · 1 KB");
            assert.equal(await p.ev("[...document.querySelectorAll('.sheet [role=status]')].some((e) => e.offsetParent !== null && e.textContent.includes('chuẩn bị'))"), false, "chuẩn bị xong thì không còn dòng «Đang chuẩn bị tệp…»");
            await kiem(p, `bước T1 hộp gửi ${kho}`);
            await chup(p, `20-hop-gui-kem-tep-${tenKho}`, false);
            // tệp mà mô tả trống ⇒ câu riêng, không gửi gì
            await p.ev(setInput("document.getElementById('new-title')", `Màn hình báo lỗi lạ ${D}`));
            assert.equal(await bam(p, "#new-submit"), true);
            await p.waitFor(`document.querySelector('.sheet p.alert')?.textContent === ${JSON.stringify(CAU_CAN_CHU)}`, "câu «Hãy viết vài chữ kèm tệp.»");
            await p.ev(setInput("document.getElementById('new-body')", "Ảnh màn hình và biên nhận đính kèm."));
            assert.equal(await bam(p, "#new-submit"), true);
            await p.waitFor("/[?&]id=/.test(location.search) && !!document.querySelector('#fb-tin-ds .ht-tep-anh img') && document.querySelector('#fb-tin-ds .ht-tep-anh img').complete && document.querySelector('#fb-tin-ds .ht-tep-anh img').naturalWidth > 0", "luồng mở, ảnh xem trước đã tải", 60_000);
            const id = await p.ev("new URLSearchParams(location.search).get('id')");
            assert.equal(await p.ev("new URLSearchParams(location.search).has('tepLoi')"), false, "không tệp lỗi ⇒ địa chỉ không mang tepLoi");
            const d = (await goiTrongTrang(p, "GET", `/api/feedback/${id}`)).json;
            const tepTin = d.messages[0].tep;
            assert.deepEqual(tepTin.map((t) => [t.loai, t.trangThai]), [["jpg", "DA_LUU"], ["pdf", "DA_LUU"]], "PNG gửi lên đã thành JPG (vẽ lại trên máy), cả hai đã lưu");
            [TEP_ANH, TEP_PDF] = tepTin;
            VE_TEP = d.ticket;
            const coAnh = await p.ev("(() => { const i = document.querySelector('#fb-tin-ds .ht-tep-anh img'); return [i.naturalWidth, i.naturalHeight]; })()");
            assert.deepEqual(coAnh, [2000, 1000], "ảnh đã lưu có cạnh dài 2000 (từ 3000×1500)");
            assert.match(await text(p, `#fb-tin-ds [data-tep="${TEP_PDF.id}"]`), /Tệp PDF · 1 KB/);
            assert.equal(await p.ev(`document.querySelector('#fb-tin-ds [data-tep="${TEP_PDF.id}"] a').getAttribute('href')`), `/api/feedback/${id}/tep/${TEP_PDF.id}`);
            assert.equal(await p.ev("document.querySelector('[data-go-tep]')"), null, "người gửi không có nút «Gỡ tệp»");
            await kiem(p, `bước T1 luồng ${kho}`);
            await p.ev("document.querySelector('#fb-tin-ds .ht-tep-tin').scrollIntoView({ block: 'center' }), true");
            await chup(p, `21-luong-co-tep-${tenKho}`, false);
            // hai vòng tự làm mới (5 giây / vòng) rồi gửi thêm một tin (dựng lại cả luồng): ảnh vẫn chỉ tải MỘT lần, và vẫn là ĐÚNG thẻ ảnh cũ (bảng cấp trang
            // theo mã tệp, đặc tả 3.6). Chrome tự dùng lại ảnh cùng địa chỉ trong một trang nên chỉ đếm yêu cầu thì không bắt được việc bỏ bảng — phá thử 28/10.
            await p.ev("(document.querySelector('#fb-tin-ds .ht-tep-anh img').__htDau = 'cu', true)");
            await sleep(11_000);
            await p.ev(setInput("document.querySelector('#fb-tra-loi textarea')", `Bổ sung thêm thông tin ${D}`));
            assert.equal(await bam(p, "#fb-tra-loi .btn-chinh"), true);
            await p.waitFor(`[...document.querySelectorAll('#fb-tin-ds .fb-tin p')].some((e) => e.textContent === ${JSON.stringify(`Bổ sung thêm thông tin ${D}`)})`, "tin thứ hai đã vào luồng");
            await sleep(6_000);
            assert.equal(await p.ev("document.querySelector('#fb-tin-ds .ht-tep-anh img').__htDau ?? null"), "cu", "luồng dựng lại phải gắn lại ĐÚNG thẻ ảnh cũ, không tạo thẻ mới");
            const duongAnh = `/api/feedback/${id}/tep/${TEP_ANH.id}`;
            const lanTai = await p.ev("window.__htTaiTep");
            assert.equal(lanTai.filter((x) => x === duongAnh).length, 1, `ảnh tải đúng một lần (trình duyệt): ${JSON.stringify(lanTai)}`);
            assert.equal(await p.ev("document.querySelectorAll('#fb-tin-ds .ht-tep-anh img').length"), 1);
            const [{ n }] = env.sql(`SELECT count(*) AS n FROM audit_log WHERE action = 'feedback_attachment_viewed' AND detail LIKE '%${TEP_ANH.id}'`);
            assert.equal(Number(n), 1, "đúng một dòng nhật ký «xem tệp» cho ảnh");
          });
          if (p.consoleErrors.length) loi.push(`lỗi console (Bán hàng Hai, tệp ${kho}): ${p.consoleErrors.join(" | ").slice(0, 300)}`);
        } finally {
          p.close();
        }
      }
      if (VE_TEP) {
        const p = await moTrang(ACCOUNTS.chu, `/feedback?id=${VE_TEP.id}`, vp);
        try {
          await buoc(`T2${kho}`, "Toàn quyền gỡ ảnh gửi nhầm: hộp xác nhận, tin còn «Tệp đã được gỡ», máy chủ trả 404, PDF vẫn tải được", async () => {
            await choLuong(p);
            await p.waitFor(`!!document.querySelector('[data-go-tep="${TEP_ANH.id}"]')`, "nút «Gỡ tệp» của ảnh");
            assert.equal(await bam(p, `[data-go-tep="${TEP_ANH.id}"]`), true);
            await choSheet(p, `[data-xac-nhan-go="${TEP_ANH.id}"]`);
            await bocucSach(p, `bước T2 hộp gỡ ${kho}`);
            await chup(p, `22-hop-go-tep-${tenKho}`, false);
            assert.equal(await bam(p, `[data-xac-nhan-go="${TEP_ANH.id}"]`), true);
            await choDongSheet(p);
            await p.waitFor(`document.querySelector('#fb-tin-ds [data-tep="${TEP_ANH.id}"]')?.textContent === 'Tệp đã được gỡ'`, "dòng «Tệp đã được gỡ»");
            assert.equal(await p.ev("document.querySelectorAll('#fb-tin-ds .ht-tep-anh img').length"), 0, "không còn ảnh");
            assert.equal((await goiTrongTrang(p, "GET", `/api/feedback/${VE_TEP.id}/tep/${TEP_ANH.id}`)).status, 404, "máy chủ không trả tệp đã gỡ");
            assert.equal(await p.ev(`fetch('/api/feedback/${VE_TEP.id}/tep/${TEP_PDF.id}').then((r) => r.status)`), 200, "PDF vẫn tải được");
            await kiem(p, `bước T2 ${kho}`);
            await p.ev("document.querySelector('#fb-tin-ds .ht-tep-tin').scrollIntoView({ block: 'center' }), true");
            await chup(p, `23-da-go-tep-${tenKho}`, false);
          });
          if (p.consoleErrors.length) loi.push(`lỗi console (Toàn quyền, gỡ tệp ${kho}): ${p.consoleErrors.join(" | ").slice(0, 300)}`);
        } finally {
          p.close();
        }
      }

      // ======================= Bán hàng Một: bước 1, 2, 8, 9 =======================
      let T1 = null;
      {
        const p = await moTrang(ACCOUNTS.salesA, `/feedback?new=1&from=${encodeURIComponent(`/order?id=${DON_A.id}`)}`, vp);
        try {
          await buoc(`1${kho}`, "Bán hàng: gửi từ đơn của mình → đơn điền sẵn; từ đơn người khác → «Không gắn đơn»", async () => {
            await p.waitFor("!!document.querySelector('.sheet #new-order') && document.querySelectorAll('.sheet #new-order option').length >= 2", "hộp Gửi yêu cầu, có ô đơn");
            assert.equal(await p.ev("document.getElementById('new-order').value"), DON_A.id, "đơn của mình điền sẵn");
            const nhanDon = await p.ev("[...document.querySelectorAll('#new-order option')].map((o) => o.textContent)");
            assert.ok(nhanDon.some((x) => x.startsWith(DON_A.ma)), `ô đơn có mã ${DON_A.ma}: ${JSON.stringify(nhanDon)}`);
            await p.ev(setInput("document.getElementById('new-team')", X.id));
            await p.ev(setInput("document.getElementById('new-title')", `Màn hình chậm khi lưu ${D}`));
            await p.ev(setInput("document.getElementById('new-body')", "Bấm lưu mất hơn năm giây."));
            await sleep(700); // hộp trượt chạy xong chuyển động rồi mới đo màu (axe đo giữa chừng cho kết quả sai)
            await kiem(p, `bước 1 hộp gửi ${kho}`);
            await chup(p, `01-gui-tu-don-cua-minh-${tenKho}`, false);
            assert.equal(await bam(p, "#new-submit"), true);
            await p.waitFor("location.search.includes('id=') && !!document.querySelector('#ht-luong .ht-tieu-de-luong')", "mở luồng sau khi gửi", 12000);
            const guiDi = JSON.parse(p.requests.filter((r) => r.method === "POST" && r.url.endsWith("/api/feedback")).at(-1).postData);
            assert.equal(guiDi.orderId, DON_A.id, "thân gửi có orderId của đơn mình");
            T1 = new URLSearchParams(await p.ev("location.search")).get("id");
            // từ đơn NGƯỜI KHÁC: đơn không nằm trong danh sách của mình ⇒ «Không gắn đơn»
            await diDen(p, `/feedback?new=1&from=${encodeURIComponent(`/order?id=${DON_B.id}`)}`);
            await p.waitFor("!!document.querySelector('.sheet #new-order') && document.querySelectorAll('.sheet #new-order option').length >= 2", "hộp gửi lần hai");
            assert.equal(await p.ev("document.getElementById('new-order').value"), "", "đơn người khác: không điền");
            assert.equal(await p.ev("document.getElementById('new-order').selectedOptions[0].textContent"), "Không gắn đơn");
            assert.ok(!(await p.ev("[...document.querySelectorAll('#new-order option')].map((o) => o.value)")).includes(DON_B.id), "đơn người khác không có trong danh sách");
            await chup(p, `02-gui-tu-don-nguoi-khac-${tenKho}`, false);
            assert.equal(await bam(p, "#new-cancel"), true);
            await choDongSheet(p);
          });

          await buoc(`2${kho}`, "Bán hàng mở yêu cầu của mình: không chip, không «Ghi chú nội bộ», không dòng hệ thống; thấy người xử lý", async () => {
            await moLuongTuUrl(p, T2.id);
            await p.waitFor("!!document.querySelector('#fb-tin-ds .ht-cum')", "có tin trong luồng");
            const k = await p.ev(`(() => {
              const hien = (e) => e.offsetParent !== null;
              return {
                chip: document.querySelectorAll('#ht-luong .ht-chips, #ht-luong .ht-chip').length,
                nutNoiBo: [...document.querySelectorAll('#ht-luong button')].filter((b) => b.textContent.trim() === 'Ghi chú nội bộ' && hien(b)).length,
                heThong: document.querySelectorAll('#ht-luong .ht-he-thong').length,
                tinNoiBo: document.querySelectorAll('#ht-luong .is-noi-bo, #ht-luong .ht-noi-bo').length,
                chu: document.getElementById('ht-luong').innerText,
                nguoiXuLy: document.getElementById('ht-nguoi-xu-ly')?.innerText ?? '',
              }; })()`);
            assert.equal(k.chip, 0, "người gửi không có chip quyền");
            assert.equal(k.nutNoiBo, 0, "người gửi không có nút «Ghi chú nội bộ»");
            assert.equal(k.heThong, 0, "người gửi không có dòng hệ thống");
            assert.equal(k.tinNoiBo, 0, "người gửi không thấy ghi chú nội bộ");
            assert.ok(!k.chu.includes("NOIBO-T2"), "nội dung ghi chú nội bộ không lộ");
            assert.ok(k.chu.includes("Kế toán đã nhận, đang kiểm sổ."), "tin công khai của Kế toán hiện");
            assert.match(k.nguoiXuLy, /Người xử lý: Chủ Thử/, `M-1 người gửi thấy ai đang xử lý: ${JSON.stringify(k.nguoiXuLy)}`);
            await kiem(p, `bước 2 ${kho}`);
            await chup(p, `03-ban-hang-xem-yeu-cau-cua-minh-${tenKho}`);
          });

          await buoc(`9${kho}`, "Chuỗi cấm không có trong chữ nhìn thấy; «chuỗi gốc» chỉ hiện khi bấm", async () => {
            await moLuongTuUrl(p, T2.id);
            assert.equal(await bam(p, ".ht-nut-chi-tiet"), true, "mở Chi tiết");
            const truoc = await p.ev("document.body.innerText");
            for (const re of CHU_CAM) assert.ok(!re.test(truoc), `còn chữ cấm «${re.exec(truoc)?.[0]}» khi «chuỗi gốc» chưa mở`);
            assert.match(await p.ev("document.getElementById('fb-chi-tiet').innerText"), /Thiết bị\s*iPhone|Thiết bị\s*[^\n]+/, "dòng Thiết bị tóm tắt");
            assert.equal(await bam(p, ".ht-nut-goc"), true, "mở «chuỗi gốc»");
            assert.match(await p.ev("document.body.innerText"), /Mozilla\/5\.0/, "mở chuỗi gốc thì thấy chuỗi");
            await bocucSach(p, `bước 9 trừ chuỗi gốc ${kho}`).catch((e) => { if (!/Mozilla/.test(String(e.message))) throw e; });
            await chup(p, `04-chi-tiet-chuoi-goc-${tenKho}`);
          });

          if (moi) {
            await buoc(`8${kho}`, "Điện thoại: mở yêu cầu → thanh tab ẩn; ba đường đóng đều làm thanh tab hiện lại; hit-test không trúng nút nổi; ô trả lời 16px", async () => {
              const thanhTabHien = () => p.ev("(() => { const t = document.getElementById('tabbar'); return !!t && getComputedStyle(t).display !== 'none' && t.getBoundingClientRect().height > 0 && !document.body.classList.contains('tabbar-an'); })()");
              const moDong = async () => {
                await p.waitFor(`!!document.querySelector('.ht-dong[data-ticket="${T2.id}"] a.ht-dong-noi')`, "dòng của T2 trong danh sách");
                await bam(p, `.ht-dong[data-ticket="${T2.id}"] a.ht-dong-noi`);
                await choLuong(p);
              };
              await diDen(p, "/feedback");
              await p.waitFor("!!document.getElementById('tabbar')", "có thanh tab");
              assert.equal(await thanhTabHien(), true, "ban đầu thanh tab hiện");
              // hit-test «＋ Gửi yêu cầu» ở danh sách
              const vaoFab = (sel) => p.ev(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return 'không có'; e.scrollIntoView({ block: 'center' }); const r = e.getBoundingClientRect(); const t = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return t && (t === e || e.contains(t)) && !t.closest('.tl-fab') ? 'ok' : 'trúng ' + (t ? t.tagName + '.' + (t.className || t.id) : 'không gì'); })()`);
              assert.equal(await vaoFab("#ht-gui"), "ok", "tâm «＋ Gửi yêu cầu» trúng đúng nút");
              await moDong();
              assert.equal(await p.ev("document.body.classList.contains('tabbar-an')"), true, "mở yêu cầu: thanh tab ẩn");
              assert.equal(await p.ev("getComputedStyle(document.getElementById('tabbar')).display"), "none");
              assert.ok(parseFloat(await p.ev("getComputedStyle(document.querySelector('#fb-tra-loi textarea')).fontSize")) >= 16, "ô trả lời ≥ 16px (chống zoom iOS; token --fs-field)");
              assert.equal(await vaoFab("#fb-tra-loi .btn-chinh"), "ok", "tâm «Gửi» trúng đúng nút");
              await chup(p, `05-dien-thoai-mo-yeu-cau-${tenKho}`, false);
              // (a) nút «‹ Danh sách»
              await bam(p, ".ht-quay");
              await p.waitFor("!document.body.classList.contains('tabbar-an')", "nút «‹» gỡ tabbar-an");
              assert.equal(await thanhTabHien(), true, "đóng bằng nút «‹»: thanh tab hiện lại");
              // (b) nút quay lại của trình duyệt
              await moDong();
              assert.equal(await p.ev("document.body.classList.contains('tabbar-an')"), true);
              await p.ev("history.back(), true");
              await p.waitFor("!document.body.classList.contains('tabbar-an')", "history.back() gỡ tabbar-an");
              assert.equal(await thanhTabHien(), true, "đóng bằng nút quay lại: thanh tab hiện lại");
              // (c) phím Esc
              await moDong();
              assert.equal(await p.ev("document.body.classList.contains('tabbar-an')"), true);
              await p.ev("(document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })), true)");
              await p.waitFor("!document.body.classList.contains('tabbar-an')", "phím Esc gỡ tabbar-an");
              assert.equal(await thanhTabHien(), true, "đóng bằng phím Esc: thanh tab hiện lại");
            });
          }
          if (p.consoleErrors.length) loi.push(`lỗi console (Bán hàng ${kho}): ${p.consoleErrors.join(" | ").slice(0, 300)}`);
        } finally {
          p.close();
        }
      }

      // ======================= Kế toán: bước 3, 4 (và hit-test «Nhận việc» của bước 8) =======================
      {
        const p = await moTrang(ACCOUNTS.accounting, "/feedback", vp);
        try {
          const dem = async (loc, status) => (await goiTrongTrang(p, "GET", `/api/feedback/queue?team=${X.id}&loc=${loc}&status=${status}&limit=1`)).json.dem;
          const soTrenNut = () => p.ev("Object.fromEntries([...document.querySelectorAll('.ht-loc-nut [data-loc]')].map((b) => [b.dataset.loc, b.querySelector('.ht-so')?.textContent ?? null]))");
          const choDsXong = (loc) => p.waitFor(`document.querySelector('.ht-loc-nut [data-loc="${loc}"]')?.getAttribute('aria-pressed') === 'true' && document.querySelectorAll('#ht-ds .ht-dong').length > 0`, `danh sách lọc ${loc}`);
          await buoc(`3${kho}`, "Kế toán: Việc của nhóm — số trên ba nút, Tải thêm, Nhận việc, dòng hệ thống, ghi chú nội bộ, Chi tiết", async () => {
            await p.waitFor("!!document.getElementById('ht-tab-queue')", "có thẻ «Việc của nhóm»");
            assert.deepEqual(await p.ev("[...document.querySelectorAll('[role=tab]')].map((t) => t.textContent.replace(/\\d+$/, '').trim())"), ["Yêu cầu của tôi", "Việc của nhóm"], "Kế toán thấy hai thẻ, không thấy «Nhóm hỗ trợ»");
            await bam(p, "#ht-tab-queue");
            await choDsXong("UNASSIGNED");
            if (await p.ev("!!document.getElementById('ht-loc-nhom')")) await p.ev(setInput("document.getElementById('ht-loc-nhom')", X.id));
            await choDsXong("UNASSIGNED");
            // số trên ba nút = số của máy chủ (trạng thái «Đang mở»)
            const moDs = "NEW,ACK,IN_PROGRESS";
            const expMo = { UNASSIGNED: String((await dem("UNASSIGNED", moDs)).chuaAiNhan), MINE: String((await dem("MINE", moDs)).cuaToi), ALL: String((await dem("ALL", moDs)).tatCa) };
            await p.waitFor(`JSON.stringify(Object.entries(Object.fromEntries([...document.querySelectorAll('.ht-loc-nut [data-loc]')].map((b) => [b.dataset.loc, b.querySelector('.ht-so')?.textContent]))).sort()) === ${JSON.stringify(JSON.stringify(Object.entries(expMo).sort()))}`, `ba nút đúng số của máy chủ ${JSON.stringify(expMo)}`);
            assert.ok(Number(expMo.UNASSIGNED) > 50, `đủ để có «Tải thêm»: ${expMo.UNASSIGNED}`);
            assert.equal(await p.ev("document.querySelectorAll('#ht-ds .ht-dong').length"), 50, "trang đầu 50 dòng");
            await bocucSach(p, `bước 3 danh sách ${kho}`);
            await chup(p, `06-viec-cua-nhom-${tenKho}`);
            // Tải thêm: không lặp dòng
            assert.equal(await bam(p, "#ht-tai-them"), true, "nút Tải thêm");
            await p.waitFor("document.querySelectorAll('#ht-ds .ht-dong').length > 50", "đã tải thêm");
            const ids = await p.ev("[...document.querySelectorAll('#ht-ds .ht-dong')].map((e) => e.dataset.ticket)");
            assert.equal(new Set(ids).size, ids.length, "Tải thêm không lặp dòng");
            assert.equal(ids.length, Number(expMo.UNASSIGNED), "đủ số dòng chưa ai nhận");
            // đổi bộ lọc trạng thái → số trên nút đổi theo, rồi «Tải thêm» (nếu còn) cũng không lặp
            await p.ev(setInput("document.getElementById('ht-loc-trang-thai')", "xong"));
            const expXong = { UNASSIGNED: String((await dem("UNASSIGNED", "DONE")).chuaAiNhan), MINE: String((await dem("MINE", "DONE")).cuaToi), ALL: String((await dem("ALL", "DONE")).tatCa) };
            await p.waitFor(`JSON.stringify(Object.entries(Object.fromEntries([...document.querySelectorAll('.ht-loc-nut [data-loc]')].map((b) => [b.dataset.loc, b.querySelector('.ht-so')?.textContent]))).sort()) === ${JSON.stringify(JSON.stringify(Object.entries(expXong).sort()))}`, `ba nút đổi theo «Đã xong» ${JSON.stringify(expXong)}`);
            assert.notEqual(expXong.ALL, expMo.ALL, "số khác nhau giữa hai bộ lọc");
            await p.ev(setInput("document.getElementById('ht-loc-trang-thai')", "mo"));
            await choDsXong("UNASSIGNED");
            await p.waitFor("document.querySelectorAll('#ht-ds .ht-dong').length === 50 && !!document.querySelector('[data-nhan-viec]')", "danh sách «Đang mở» nạp lại đủ 50 dòng");
            if (moi) {
              // hit-test «Nhận việc» (bước 8): tâm nút không trúng nút nổi Trợ lý
              await p.waitFor("!!document.querySelector('[data-nhan-viec]')", "có nút Nhận việc");
              const r = await p.ev(`(() => { const e = document.querySelector('[data-nhan-viec]'); if (!e) return 'không có'; e.scrollIntoView({ block: 'center' }); const b = e.getBoundingClientRect(); const t = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2); return t && (t === e || e.contains(t)) && !t.closest('.tl-fab') ? 'ok' : 'trúng ' + (t ? t.tagName + '.' + (t.className || t.id) : 'không gì'); })()`);
              assert.equal(r, "ok", "tâm «Nhận việc» trúng đúng nút");
            }
            // Nhận việc ở danh sách (T3) → sang «Tôi đang xử lý» → mở T3
            assert.equal(await bam(p, `[data-nhan-viec="${T3.id}"]`) || await (async () => { while (await p.ev("!!document.getElementById('ht-tai-them')")) { await bam(p, "#ht-tai-them"); await sleep(400); } return bam(p, `[data-nhan-viec="${T3.id}"]`); })(), true, "bấm «Nhận việc» của T3");
            await p.waitFor(`!document.querySelector('.ht-dong[data-ticket="${T3.id}"]')`, "T3 rời «Chưa ai nhận»");
            assert.equal(await bam(p, '.ht-loc-nut [data-loc="MINE"]'), true);
            await choDsXong("MINE");
            await p.waitFor(`!!document.querySelector('.ht-dong[data-ticket="${T3.id}"] a.ht-dong-noi')`, "T3 trong «Tôi đang xử lý»");
            await bam(p, `.ht-dong[data-ticket="${T3.id}"] a.ht-dong-noi`);
            await choLuong(p);
            assert.match(await p.ev("document.querySelector('.ht-chip[aria-label^=\"Trạng thái\"]')?.innerText ?? ''"), /Đã tiếp nhận/, "chip trạng thái «Đã tiếp nhận»");
            // một dòng hệ thống tới SAU khi trang đã mở: Trưởng nhóm giao T3 cho Chủ Thử (vòng làm mới 5 giây)
            phai(await call(ACCOUNTS.salesB, "PATCH", `/api/feedback/${T3.id}/xu-ly`, { assigneeId: ID.chu }), 200, "giao T3");
            await p.waitFor("document.querySelectorAll('#fb-tin-ds .ht-he-thong').length === 3", "ba dòng hệ thống", 15000);
            const dong = await p.ev("[...document.querySelectorAll('#fb-tin-ds .ht-he-thong')].map((e) => e.innerText)");
            assert.match(dong[0], new RegExp(`^Chuyển sang nhóm ${X.name} · \\d{2}:\\d{2}$`), `dòng 1: ${dong[0]}`);
            assert.match(dong[1], /^Kế Toán đã nhận việc · \d{2}:\d{2}$/, `dòng 2: ${dong[1]}`);
            assert.match(dong[2], /^Sales Hai giao cho Chủ Thử · \d{2}:\d{2}$/, `dòng 3: ${dong[2]}`);
            // ghi chú nội bộ: nền riêng + khoá «người gửi không thấy»
            assert.equal(await bamChu(p, "#fb-tra-loi", "Ghi chú nội bộ"), true, "chuyển sang kiểu ghi chú nội bộ");
            await p.ev(setInput("document.querySelector('#fb-tra-loi textarea')", `Đã hỏi lại người gửi ${D}`));
            await bam(p, "#fb-tra-loi .btn-chinh");
            await p.waitFor("!!document.querySelector('#fb-tin-ds .ht-cum.is-noi-bo')", "ghi chú nội bộ hiện trong luồng");
            const sac = await p.ev(`(() => { const nb = document.querySelector('#fb-tin-ds .fb-tin.is-noi-bo'); const cum = document.querySelector('.ht-cum.is-noi-bo'); const thuong = document.querySelector('#fb-tin-ds .fb-tin:not(.is-noi-bo)'); return { nb: nb && getComputedStyle(nb).backgroundColor, thuong: thuong && getComputedStyle(thuong).backgroundColor, khoa: cum.innerText }; })()`);
            assert.ok(sac.nb && sac.thuong && sac.nb !== sac.thuong, `ghi chú nội bộ có nền riêng: ${JSON.stringify(sac)}`);
            assert.match(sac.khoa, /người gửi không thấy/, "khoá «người gửi không thấy»");
            // Chi tiết có dòng email
            assert.equal(await bam(p, ".ht-nut-chi-tiet"), true);
            const ct = await p.ev("document.getElementById('fb-chi-tiet').innerText");
            assert.match(ct, /Email báo nhóm\s*chưa gửi được/, `Chi tiết có dòng email: ${ct}`);
            await kiem(p, `bước 3 luồng ${kho}`);
            await chup(p, `07-ke-toan-nhan-viec-ghi-chu-noi-bo-${tenKho}`);
          });

          await buoc(`4${kho}`, "Từ chối: bước 2 lỗi → câu báo; bấm lại → thành công; đúng một tin lý do", async () => {
            await moLuongTuUrl(p, T4.id);
            const LY_DO = `Chưa làm được trong tháng này ${D}`;
            const soTinLyDo = () => p.ev(`[...document.querySelectorAll('#fb-tin-ds .fb-tin')].filter((e) => e.innerText.includes(${JSON.stringify(LY_DO)})).length`);
            assert.equal(await bam(p, '.ht-chip[aria-label^="Trạng thái"]'), true, "chip trạng thái");
            await choSheet(p, "[data-to='DECLINED']");
            assert.equal(await p.ev(`(() => { const b = document.querySelector('.sheet [data-to="DECLINED"]'); b.click(); return true; })()`), true);
            await choSheet(p, "#ht-ly-do");
            await p.ev("window.__htLoiBuoc2 = true, true");
            await p.ev(setInput("document.getElementById('ht-ly-do')", LY_DO));
            await chup(p, `08-tu-choi-hop-ly-do-${tenKho}`, false);
            assert.equal(await bam(p, ".sheet [data-tu-choi]"), true, "bấm Từ chối lần 1");
            await p.waitFor("[...document.querySelectorAll('.sheet p.alert')].some((e) => !e.hidden && e.textContent.length > 0)", "câu lỗi bước 2");
            assert.equal(await p.ev("[...document.querySelectorAll('.sheet p.alert')].find((e) => !e.hidden).textContent"), CAU_TU_CHOI_LOI_BUOC_2);
            assert.equal(await p.ev("document.getElementById('ht-ly-do-da-gui').hidden"), false, "hộp ghi «Lý do đã gửi»");
            await p.waitFor(`document.querySelectorAll('#fb-tin-ds .fb-tin').length >= 2`, "luồng nạp lại sau bước 2 lỗi");
            assert.equal(await soTinLyDo(), 1, "sau lần 1: đúng một tin lý do");
            await chup(p, `09-tu-choi-buoc-2-loi-${tenKho}`, false);
            assert.equal(await bam(p, ".sheet [data-tu-choi]"), true, "bấm Từ chối lần 2");
            await choDongSheet(p);
            await p.waitFor(`/Từ chối/.test(document.querySelector('.ht-chip[aria-label^="Trạng thái"]')?.innerText ?? '')`, "chip đổi sang «Từ chối»");
            assert.equal(await soTinLyDo(), 1, "sau lần 2: vẫn đúng MỘT tin lý do");
            await kiem(p, `bước 4 ${kho}`);
            await chup(p, `10-ke-toan-da-tu-choi-${tenKho}`);
          });
        } finally {
          p.close();
        }
      }

      // ======================= Bán hàng Một lần hai: bước 4 (phía người gửi), 5 =======================
      {
        const p = await moTrang(ACCOUNTS.salesA, `/feedback?id=${T4.id}`, vp);
        try {
          await choLuong(p);
          await buoc(`5${kho}`, "Người gửi: thấy «Từ chối» + lý do; trả lời → dòng «mở lại» hiện trước khi bấm; gửi → «Đã tiếp nhận»", async () => {
            assert.match(await p.ev("document.querySelector('#ht-luong .ht-buoc strong')?.innerText ?? ''"), /Từ chối/, "người gửi thấy «Từ chối»");
            assert.ok((await p.ev("document.getElementById('fb-tin-ds').innerText")).includes(`Chưa làm được trong tháng này ${D}`), "người gửi thấy lý do");
            assert.equal(await p.ev("document.getElementById('ht-mo-lai').hidden"), false, "dòng «mở lại» hiện TRƯỚC khi bấm");
            assert.equal(await p.ev("document.getElementById('ht-mo-lai').innerText"), CAU_MO_LAI);
            await chup(p, `11-nguoi-gui-thay-tu-choi-${tenKho}`);
            await p.ev(setInput("document.querySelector('#fb-tra-loi textarea')", `Em xin bổ sung thông tin ${D}`));
            await bam(p, "#fb-tra-loi .btn-chinh");
            await p.waitFor("/Đã tiếp nhận/.test(document.querySelector('#ht-luong .ht-buoc strong')?.innerText ?? '')", "trạng thái đổi sang «Đã tiếp nhận»");
            assert.equal(await p.ev("document.getElementById('ht-mo-lai').hidden"), true, "đã mở lại: dòng báo ẩn");
            assert.ok((await p.ev("document.getElementById('fb-tin-ds').innerText")).includes(`Em xin bổ sung thông tin ${D}`), "tin trả lời hiện");
            await kiem(p, `bước 5 ${kho}`);
          });
        } finally {
          p.close();
        }
      }

      // ======================= Trưởng nhóm (Bán hàng Hai): bước 6 =======================
      {
        const p = await moTrang(ACCOUNTS.salesB, `/feedback?id=${T6.id}`, vp);
        try {
          await choLuong(p);
          await buoc(`6${kho}`, "Trưởng nhóm: giao việc; chuyển nhóm bắt lý do; nhóm mới không thấy ghi chú cũ", async () => {
            assert.ok((await p.ev("document.getElementById('fb-tin-ds').innerText")).includes(NOTE_T6), "Trưởng nhóm thấy ghi chú nội bộ của nhóm mình");
            assert.equal(await bam(p, '.ht-chip[aria-label="Người xử lý"]'), true, "chip người xử lý");
            await choSheet(p, "#fb-giao-chon");
            await p.ev(setInput("document.getElementById('fb-giao-chon')", ID.kt));
            assert.equal(await bamChu(p, ".sheet", "Giao"), true);
            await choDongSheet(p);
            await p.waitFor("/Người xử lý: Kế Toán/.test(document.querySelector('.ht-chip[aria-label=\"Người xử lý\"]')?.innerText ?? '')", "chip «Người xử lý: Kế Toán»");
            // chuyển nhóm: lý do để trống → không gửi gì
            assert.equal(await bam(p, '.ht-chip[aria-label="Chuyển nhóm"]'), true, "chip nhóm");
            await choSheet(p, "#fb-chuyen-ly-do");
            await p.ev(setInput("document.getElementById('fb-chuyen-nhom')", Y.id));
            const truoc = p.requests.filter((r) => r.method === "POST" && r.url.endsWith("/transfer")).length;
            assert.equal(await bamChu(p, ".sheet", "Chuyển"), true);
            await p.waitFor("[...document.querySelectorAll('.sheet p.alert')].some((e) => !e.hidden && e.textContent === 'Ghi lý do chuyển nhóm.')", "câu bắt lý do");
            await sleep(400);
            assert.equal(p.requests.filter((r) => r.method === "POST" && r.url.endsWith("/transfer")).length, truoc, "lý do trống: không gửi lệnh chuyển");
            await chup(p, `12-chuyen-nhom-bat-ly-do-${tenKho}`, false);
            await p.ev(setInput("document.getElementById('fb-chuyen-ly-do')", "Việc này của bộ phận đích"));
            assert.equal(await bamChu(p, ".sheet", "Chuyển"), true);
            await p.waitFor("location.search.includes('chuyen=1') && !!document.getElementById('fb-da-chuyen')", "về danh sách kèm «Đã chuyển nhóm.»", 12000);
            assert.equal(await text(p, "#fb-da-chuyen"), "Đã chuyển nhóm.");
          });
        } finally {
          p.close();
        }
      }
      {
        const p = await moTrang(ACCOUNTS.admin, `/feedback?id=${T6.id}`, vp);
        try {
          await choLuong(p);
          await buoc(`6b${kho}`, "Thành viên nhóm mới (Quản trị) không thấy ghi chú nội bộ của nhóm cũ", async () => {
            const chu = await p.ev("document.getElementById('ht-luong').innerText");
            assert.ok(!chu.includes("NOIBO-T6"), "ghi chú nội bộ của nhóm cũ không lộ cho nhóm mới");
            assert.ok(chu.includes("Ai xem được đơn của người khác?"), "tin đầu của người gửi hiện");
            assert.match(await p.ev("[...document.querySelectorAll('#fb-tin-ds .ht-he-thong')].map((e) => e.innerText).join(' | ')"), /Chuyển sang nhóm/, `dòng chuyển nhóm; máy chủ trả ${JSON.stringify((await goiTrongTrang(p, "GET", `/api/feedback/${T6.id}`)).json?.suKien)}`);
            await kiem(p, `bước 6b ${kho}`);
            await chup(p, `13-nhom-moi-khong-thay-ghi-chu-cu-${tenKho}`);
          });
        } finally {
          p.close();
        }
      }

      // ======================= Toàn quyền: bước 7 =======================
      {
        const p = await moTrang(ACCOUNTS.chu, "/feedback", vp);
        try {
          await p.waitFor("!!document.getElementById('ht-tab-teams')", "có thẻ «Nhóm hỗ trợ»");
          const choBang = () => p.waitFor(`!!document.querySelector('[data-team="${X.id}"]')`, "bảng có nhóm thử");
          const nutHien = (sel) => `[...document.querySelectorAll(${JSON.stringify(sel)})].find((e) => e.offsetParent !== null)`;
          await buoc(`7${kho}`, "Toàn quyền: bảng nhóm, Thêm nhóm không có ô mã, công tắc Nhạy cảm, nhóm Kỹ thuật không có «Ngưng nhóm»", async () => {
            await bam(p, "#ht-tab-teams");
            await choBang();
            await p.waitFor(`!!document.querySelector('[data-team="${KY_THUAT}"], [data-team="x-ky-thuat"]')`, "bảng có nhóm Kỹ thuật");
            await kiem(p, `bước 7 bảng ${kho}`);
            await chup(p, `14-toan-quyen-bang-nhom-${tenKho}`);
            // Thêm nhóm: chỉ tên + mô tả
            await bam(p, "#ht-nhom-them");
            await choSheet(p, "#ht-nhom-ten-moi");
            const oGo = await p.ev("[...document.querySelectorAll('.sheet input, .sheet select, .sheet textarea')].map((e) => e.id || e.name || e.tagName)");
            assert.deepEqual(oGo, ["ht-nhom-ten-moi", "ht-nhom-mo-ta-moi"], "hộp Thêm nhóm chỉ có tên và mô tả (không ô mã)");
            const TEN_Z = `Nhóm tạo từ hộp ${CHU} ${D}`;
            await p.ev(setInput("document.getElementById('ht-nhom-ten-moi')", TEN_Z));
            await p.ev(setInput("document.getElementById('ht-nhom-mo-ta-moi')", "Nhóm thử tạo bằng giao diện"));
            await chup(p, `15-them-nhom-${tenKho}`, false);
            assert.equal(await bamChu(p, ".sheet-foot", "Thêm nhóm"), true);
            await choDongSheet(p);
            await p.waitFor(`[...document.querySelectorAll('tr[data-team], section[data-team]')].some((e) => e.innerText.includes(${JSON.stringify(TEN_Z)}))`, "nhóm mới trong bảng");
            const Z = (await goiTrongTrang(p, "GET", "/api/feedback/admin/teams")).json.teams.find((t) => t.name === TEN_Z);
            assert.ok(Z, "máy chủ có nhóm mới");
            // công tắc Nhạy cảm: vùng chạm ≥ 44px, lưu, tải lại vẫn giữ
            const cong = `[data-nhay-cam="${Z.id}"]`;
            const diem = await p.ev(`(() => { const e = ${nutHien(cong)}; e.scrollIntoView({ block: 'center' }); const r = e.getBoundingClientRect(); const x = r.left + r.width / 2; const tren = document.elementFromPoint(x, r.top - 8); const duoi = document.elementFromPoint(x, r.bottom + 8); return { cao: r.height, tren: tren === e, duoi: duoi === e }; })()`);
            assert.ok(diem.tren && diem.duoi, `vùng chạm công tắc cao ≥ 44px (cao ${diem.cao}): ${JSON.stringify(diem)}`);
            assert.equal(await p.ev(`${nutHien(cong)}.getAttribute('aria-checked')`), "false");
            await p.ev(`${nutHien(cong)}.click(), true`);
            await p.waitFor(`${nutHien(cong)}.getAttribute('aria-checked') === 'true' && [...document.querySelectorAll('.ht-da-luu')].some((e) => e.textContent === 'Đã lưu')`, "công tắc bật + «Đã lưu»");
            await diDen(p, "/feedback");
            await p.waitFor("!!document.getElementById('ht-tab-teams')", "thẻ Nhóm hỗ trợ sau khi tải lại");
            await bam(p, "#ht-tab-teams");
            await p.waitFor(`!!${nutHien(cong)}`, "bảng sau khi tải lại");
            assert.equal(await p.ev(`${nutHien(cong)}.getAttribute('aria-checked')`), "true", "Nhạy cảm giữ sau khi tải lại");
            assert.equal((await goiTrongTrang(p, "GET", "/api/feedback/admin/teams")).json.teams.find((t) => t.id === Z.id).sensitive, true, "máy chủ cũng ghi nhận");
            // «Ngưng nhóm»: nhóm Kỹ thuật KHÔNG có, nhóm khác CÓ
            const sua = (id) => `[data-sua-nhom="${id}"]`;
            await p.waitFor(`!!${nutHien(sua(KY_THUAT) + ", " + sua("x-ky-thuat"))}`, "nút Sửa của nhóm Kỹ thuật");
            await p.ev(`${nutHien(sua(KY_THUAT) + ", " + sua("x-ky-thuat"))}.click(), true`);
            await choSheet(p, "#ht-nhom-ten");
            assert.equal(await p.ev("document.getElementById('ht-nhom-ngung-nut')"), null, "nhóm Kỹ thuật: KHÔNG có «Ngưng nhóm»");
            assert.equal(await bamChu(p, ".sheet-foot", "Đóng"), true);
            await choDongSheet(p);
            await p.ev(`${nutHien(sua(Z.id))}.click(), true`);
            await choSheet(p, "#ht-nhom-ten");
            assert.equal(await p.ev("!!document.getElementById('ht-nhom-ngung-nut')"), true, "nhóm khác: CÓ «Ngưng nhóm»");
            await bocucSach(p, `bước 7 hộp Sửa ${kho}`);
            await chup(p, `16-hop-sua-nhom-${tenKho}`, false);
            assert.equal(await bamChu(p, ".sheet-foot", "Đóng"), true);
            await choDongSheet(p);
          });
          if (p.consoleErrors.length) loi.push(`lỗi console (Toàn quyền ${kho}): ${p.consoleErrors.join(" | ").slice(0, 300)}`);
        } finally {
          p.close();
        }
      }
      dauTien = false;
    }
  } catch (e) { if (e?.message !== "DUNG") throw e; console.log(`(dừng theo HT_DUNG=${DUNG})`); }
} finally {
  await env.stop();
}

console.log(`\nẢnh: ${anh.length} tệp trong ${OUT}`);
if (axeNhe.length) console.log(`\naxe nhẹ (ghi vào báo cáo, không đỏ):\n  ${[...new Set(axeNhe)].join("\n  ")}`);
if (loi.length) {
  console.log(`\nHO TRO SMOKE ĐỎ — ${loi.length} bước:\n  ${loi.join("\n  ")}`);
  process.exit(1);
}
console.log("\nHO TRO SMOKE OK");
