// ADR-0114 (chủ duyệt 2026-10-13) — kiểm phần GIAO DIỆN bằng Chrome thật, 390 + 1040, không cần mạng ngoài. Chạy từ GỐC repo:
//   npm run build:web && CHROME_BIN=<đường dẫn tuyệt đối tới docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh> AXE_JS=<…/axe.min.js> node docs/evidence/2026-10-13-sua-so-khach-adr-0114/kich-ban/adr-0114-smoke.mjs
// Dùng lại thư viện `a2-cdp.mjs` (D1 tạm + wrangler dev + Chrome qua CDP). Các hàm gieo đơn của `sua-so-khach-smoke.mjs` nằm trong khối `try` của chính tệp đó (chạy ngay khi nạp)
// nên KHÔNG import được; ở đây gieo lại bằng vài hàm ngắn cùng khuôn (lập đơn bằng API thật, xác nhận, SQL chỉ khi dựng nháp cũ ở D1 tạm).
// Chín bước (đánh số theo báo cáo thi công B, mục "Các bước tay"):
//   1 đơn 10 người lớn × 500.000, giảm giá 50.000, đã xác nhận → Kế toán bớt còn 2: dải ĐỎ một dòng khuyến mại; tải lại: câu đỏ ở khối Thanh toán, không có câu giảm giá vượt
//   2 cùng đơn (390): 2 → 3 vẫn đỏ; đủ lại 10 thì hết, dải xanh
//   3 đơn giảm giá vượt tạm tính: hai câu cùng hiện (đỏ trên vàng), dải đỏ hai dòng; đơn KHÔNG giảm giá bớt khách: không có câu đỏ, dải xanh
//   4 390 và 1040: không tràn ngang, axe 0 critical/serious (CÓ AXE_JS; thiếu thì in rõ "BỎ QUA" và KHÔNG được coi là xanh)
//   5 lịch sử số khách: đơn sửa hai lần (4 → 3 → 5) ba dòng đúng nhãn và tiền; chưa sửa / nháp / Bán hàng không phải người lập: không có khối
//   6 bảng "Sửa số khách": bớt người lớn về 0 (còn trẻ em) → câu `thieu-nguoi-lon` + nút Lưu khoá; tăng lại → mở
//   7 form lập đơn: chỉ có trẻ em (hoặc em bé) → khung "Chưa lưu được" có câu thiếu người lớn; thêm một người lớn → lưu được
//   8 nháp CŨ không còn người lớn (SQL trên D1 tạm) → "Xác nhận đơn" → dải đỏ câu máy chủ, KHÔNG nút "Tải lại đơn"
//   9 Trợ giúp: Kế toán thấy ba đoạn mới ở mục sửa số khách, Bán hàng thấy câu ở bước nhập số khách, Cập nhật có mục 1.91
// Ảnh vào `${OUT}` (mặc định docs/evidence/2026-10-13-sua-so-khach-adr-0114/anh). Mỗi bước tự bắt lỗi để các bước sau vẫn chạy; thoát ≠ 0 nếu có bước đỏ.
import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ACCOUNTS, ok, setInput, sleep, startEnv, vnDate } from "../../2026-09-20-a2/kich-ban/a2-cdp.mjs";
import { CHANGELOG } from "../../../../src/shared/changelog.ts";

const OUT = process.env.OUT ?? "docs/evidence/2026-10-13-sua-so-khach-adr-0114/anh";
mkdirSync(OUT, { recursive: true });
const AXE = process.env.AXE_JS ? readFileSync(process.env.AXE_JS, "utf8") : null;
const M = { width: 390, height: 844, mobile: true };
const DESK = { width: 1040, height: 900, mobile: false };

// Chữ nguyên văn đã chốt trong mã (src/shared/so-khach-van-phong.ts, nguoi-di-kem.ts, so-khach-hien-thi.ts); kịch bản so chữ, không import để bắt cả lỗi gõ nhầm ở mã.
const CAU_KHUYEN_MAI = "Đơn có giảm giá nhưng số khách đã giảm so với lúc xác nhận, giảm giá vẫn giữ nguyên. Kế toán xem lại khuyến mại.";
const CAU_GIAM_GIA_VUOT = "Giảm giá lớn hơn tiền dịch vụ sau khi bớt khách, nên khách không còn phải trả gì và phần giảm giá vượt không dùng tới. Khách đã trả bao nhiêu thì số đó là tiền trả dư; nếu chưa hoàn thì Kế toán hoàn lại cho khách.";
const CAU_THIEU_NGUOI_LON = "Đơn cần ít nhất một người lớn đi cùng; trẻ em và em bé không đi một mình.";
const TIEU_DE_DO = "Đã lưu số khách mới — đơn có giảm giá, cần xem lại khuyến mại.";
const TIEU_DE_XANH = "Đã lưu số khách mới, Nền tảng đã tính lại tiền.";
const DO = "rgb(142, 14, 43)"; // --c-danger-text (#8e0e2b)
const NUT = "Sửa số khách dịch vụ";

const failures = [];
let axeCoLan = 0;
async function step(id, ten, fn) {
  try {
    await fn();
    ok(`${id}) ${ten}`);
  } catch (e) {
    failures.push(id);
    console.log(`✗ ${id}) ${ten}\n    ${String(e?.message ?? e).split("\n").slice(0, 14).join("\n    ")}`);
  }
}
async function axeKhong(p, nhan) {
  if (!AXE) return "axe: BỎ QUA (thiếu AXE_JS)";
  if (!(await p.ev("typeof axe !== 'undefined'"))) await p.ev(`${AXE}\n;true`);
  const v = await p.ev("axe.run(document).then((r) => r.violations.filter((x) => x.impact === 'critical' || x.impact === 'serious').map((x) => ({ id: x.id, impact: x.impact, mau: x.nodes.slice(0, 2).map((n) => n.target.join(' ')) })))");
  assert.deepEqual(v, [], `axe (${nhan}): ${JSON.stringify(v)}`);
  axeCoLan++;
  return "axe 0 critical/serious";
}
const png = (res, path) => writeFileSync(path, Buffer.from(res.result.data, "base64"));
/** Ảnh ĐÚNG KHUNG NHÌN (không chụp cả trang: trang đơn ở 390 cao gần 4000px, ảnh cả trang bị thu nhỏ tới mức không đọc được chữ). */
const shotKhung = async (p, ten) => png(await p.send("Page.captureScreenshot", { format: "png" }), join(OUT, ten));
/** Ảnh MỘT KHỐI: cuộn khối vào giữa rồi cắt đúng khung của nó (+ lề). `bieuThuc` = biểu thức JS trả phần tử. */
const shotKhoi = async (p, bieuThuc, ten, le = 12) => {
  const r = await p.ev(`(() => { const e = ${bieuThuc}; e.scrollIntoView({ block: "center" }); const b = e.getBoundingClientRect(); return { x: b.left + scrollX, y: b.top + scrollY, w: b.width, h: b.height }; })()`);
  const x = Math.max(0, r.x - le), y = Math.max(0, r.y - le);
  // Khối thấp hơn khung nhìn thì chụp trong khung nhìn (có cả thanh trên cố định đúng chỗ); cao hơn thì chụp vượt khung (thanh cố định có thể chen vào mép dưới ảnh — chỉ là dấu vết chụp, không phải lỗi giao diện).
  const vuot = r.h + 2 * le > (await p.ev("innerHeight"));
  png(await p.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: vuot, clip: { x, y, width: r.w + 2 * le, height: r.h + 2 * le, scale: 1 } }), join(OUT, ten));
};
const cardCo = (h2) => `[...document.querySelectorAll('.card')].find((c) => c.querySelector('h2')?.textContent === ${JSON.stringify(h2)})`;
const tranNgang = (p) => p.ev("document.documentElement.scrollWidth - innerWidth");
const pairs = "[...document.querySelectorAll('.totals .kv')].map((k) => [k.children[0].textContent, k.children[1].textContent])";
/** Các câu `data-canh-bao` ở khối tiền, theo thứ tự trên trang (hai khoá của ADR-0114 / ADR-0109). */
const canhBao = (p) => p.ev("[...document.querySelectorAll('[data-canh-bao=\"khuyen-mai\"], [data-canh-bao=\"tong-am\"]')].map((x) => ({ khoa: x.dataset.canhBao, chu: x.textContent, do: x.classList.contains('is-do'), mau: getComputedStyle(x).color }))");
const dai = (p) => p.ev("(() => { const e = document.getElementById('error'); return { hidden: e.hidden, lop: [...e.classList].filter((c) => c.startsWith('banner-')), tieuDe: e.querySelector('.banner-title')?.textContent ?? null, dong: [...e.querySelectorAll('.banner-lines li')].map((x) => x.textContent), nut: [...e.querySelectorAll('button')].map((b) => b.textContent) }; })()");
const moBang = async (p) => {
  await p.ev(`[...document.querySelectorAll('#actions .btn')].find((b) => b.textContent === ${JSON.stringify(NUT)}).click()`);
  await p.waitFor("document.querySelector('.sheet-root') !== null && document.querySelector('[data-action=\"luu-so-khach\"]') !== null", "bảng Sửa số khách mở");
};
/** Bấm − hoặc + `n` lần ở bộ đếm `loai` ("Người lớn"…) của dịch vụ `dv` trong bảng đang mở. */
const bam = (p, huong, loai, dv, n) => p.ev(`(() => { const b = document.querySelector(${JSON.stringify(`.sheet-root [aria-label="${huong} ${loai} — ${dv}"]`)}); for (let i = 0; i < ${n}; i++) b.click(); return true; })()`);
const chonLyDo = (p, ma) => p.ev(`document.querySelector('.sheet-root input[name="so-khach-ly-do"][value="${ma}"]').click()`);
/** Bấm "Lưu số khách", chờ bảng đóng và dải báo ĐÚNG tiêu đề `tieuDe` hiện ra (không chỉ "có dải": dải của lần lưu trước còn đó tới khi trang tải lại xong). */
const luu = async (p, tieuDe) => {
  await p.ev("document.querySelector('[data-action=\"luu-so-khach\"]').click()");
  await p.waitFor("document.querySelector('.sheet-root') === null", "bảng đóng sau khi lưu");
  try {
    await p.waitFor(`document.querySelector('#error .banner-title')?.textContent === ${JSON.stringify(tieuDe)}`, `dải báo "${tieuDe}"`);
  } catch (e) {
    throw new Error(`${e.message.split("\n")[0]} — dải đang hiện: ${JSON.stringify(await dai(p))}`);
  }
};
const trangDon = async (env, tk, id, vp) => {
  const p = await env.as(tk, `/order?id=${id}`, vp);
  await p.waitFor("document.querySelector('#order .badge') !== null", "đơn nạp xong");
  return p;
};

const env = await startEnv();
try {
  const call = async (account, method, path, body) => {
    const c = await env.login(account);
    const r = await fetch(env.base + path, { method, headers: { "content-type": "application/json", origin: env.base, cookie: `${c.name}=${c.value}` }, body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: r.status, json: await r.json().catch(() => null) };
  };
  const pax = (adult, child = 0) => ({ adult, child, senior: 0, infant: 0 });
  const ngay = vnDate(5);
  const base = { customerName: "Khách ADR-0114", customerPhone: "0903 222 333", customerEmail: "", customerNote: "", paymentNote: "" };
  // Dịch vụ danh mục thử "500.000 / người lớn" (ví dụ của chủ, ca SV-SK-12), chèn thẳng vào D1 tạm; catalog_sync đã đánh dấu đã đồng bộ nên /api/catalog không tự đồng bộ từ Sheet.
  const T = "'2026-01-01T00:00:00.000Z'";
  env.sql(`INSERT INTO catalog_item (code,name,unit,price_adult,price_child,price_senior,price_infant,note_child,note_senior,note_infant,sheet_row,in_sheet,first_seen_at,updated_at) VALUES ('TD500','Tour thử 500.000','perPax',500000,NULL,NULL,NULL,NULL,NULL,NULL,5,1,${T},${T})`);
  const td500 = (adult) => ({ kind: "catalog", catalogCode: "TD500", pax: pax(adult), catalogPriceSeen: { adult: 500000 }, departDate: ngay });
  const td101 = (adult, child = 0) => ({ kind: "catalog", catalogCode: "TD101", pax: pax(adult, child), unitPrices: child ? { adult: 1350000, child: 950000 } : { adult: 1350000 }, catalogPriceSeen: { adult: 1350000, child: 950000, senior: 1200000, infant: 0 }, departDate: ngay });
  /** Lập (Bán hàng A) rồi, nếu `xacNhan`, xác nhận. Trả { id, svc }. */
  async function don({ services, discount = 0, xacNhan = true }) {
    const r = await call(ACCOUNTS.salesA, "POST", "/api/orders", { ...base, discount, services });
    assert.equal(r.status, 201, JSON.stringify(r.json));
    const o = r.json.order;
    if (xacNhan) {
      const xn = await call(ACCOUNTS.salesA, "POST", `/api/orders/${o.id}/status`, { status: "confirmed" });
      assert.equal(xn.status, 200, JSON.stringify(xn.json));
    }
    return { id: o.id, svc: o.services[0].id };
  }
  const suaApi = async (d, adult, lyDo) => {
    const r = await call(ACCOUNTS.accounting, "POST", `/api/orders/${d.id}/money-edit`, { lyDo, services: [{ id: d.svc, pax: pax(adult) }] });
    assert.equal(r.status, 200, JSON.stringify(r.json));
  };

  // ---- Gieo TẤT CẢ đơn trước khi mở trang nào: từ ADR-0075 một tài khoản chỉ có MỘT phiên, mỗi lần `call` đăng nhập lại sẽ đá phiên của trang đang mở cùng tài khoản ----
  const A = await don({ services: [td500(10)], discount: 50000 }); // bước 1, 2 (ca SV-SK-12)
  const B = await don({ services: [td500(2)], discount: 800000 }); // bước 3: bớt còn 1 → 500.000 < giảm giá 800.000
  const C = await don({ services: [td500(4)] }); // bước 3: không giảm giá
  const D = await don({ services: [td500(4)] }); // bước 5: 4 → 3 → 5
  await suaApi(D, 3, "BOT_NGUOI");
  await suaApi(D, 5, "THEM_NGUOI");
  const E = await don({ services: [td500(2)] }); // bước 5: đã xác nhận, chưa sửa lần nào
  const F = await don({ services: [td500(2)], xacNhan: false }); // bước 5: nháp
  const G = await don({ services: [td101(2, 1)] }); // bước 6: 2 người lớn + 1 trẻ em
  const H = await don({ services: [td500(1)], xacNhan: false }); // bước 8: nháp rồi bị SQL về 0 người lớn
  env.sql(`UPDATE order_service SET pax_adult = 0 WHERE id = '${H.svc}' AND order_id = '${H.id}'`);
  console.log("gieo xong: A (10 NL, giảm 50.000), B (giảm 800.000), C (không giảm), D (đã sửa 4→3→5), E (chưa sửa), F (nháp), G (2 NL + 1 TE), H (nháp 0 người lớn)");

  // ===== 1) 10 → 2 trên đơn có giảm giá: dải đỏ một dòng; tải lại: câu đỏ ở khối Thanh toán =====
  await step("1", "đơn 10 NL × 500.000, giảm 50.000: bớt còn 2 → dải ĐỎ một dòng khuyến mại; khối Thanh toán có câu đỏ, không có câu giảm giá vượt (1040)", async () => {
    const p = await trangDon(env, ACCOUNTS.accounting, A.id, DESK);
    try {
      assert.deepEqual(await canhBao(p), [], "chưa bớt khách: số khách bằng lúc xác nhận ⇒ không nhắc");
      await moBang(p);
      await bam(p, "Giảm", "Người lớn", "Tour thử 500.000", 8);
      await chonLyDo(p, "BOT_NGUOI");
      await luu(p, TIEU_DE_DO);
      const d = await dai(p);
      assert.deepEqual([d.lop, d.tieuDe, d.dong, d.nut], [["banner-danger"], TIEU_DE_DO, [CAU_KHUYEN_MAI], []], `dải sau lệnh: ${JSON.stringify(d)}`);
      await p.waitFor("document.querySelector('[data-canh-bao=\"khuyen-mai\"]') !== null", "câu đỏ hiện ở khối Thanh toán sau khi tải lại đơn");
      const c = await canhBao(p);
      assert.deepEqual(c.map((x) => [x.khoa, x.chu, x.do, x.mau]), [["khuyen-mai", CAU_KHUYEN_MAI, true, DO]], "chỉ câu đỏ, không có tong-am");
      assert.deepEqual((await p.ev(pairs)).slice(0, 3), [["Tạm tính", "1.000.000 ₫"], ["Giảm giá", "50.000 ₫"], ["Tổng cộng", "950.000 ₫"]], "giảm giá giữ nguyên, tiền tính lại");
      assert.deepEqual(p.consoleErrors, []);
      await shotKhung(p, "01-khuyen-mai-sau-luu-1040.png");
      await shotKhoi(p, cardCo("Thanh toán"), "02-thanh-toan-khuyen-mai-1040.png");
      const axe = await axeKhong(p, "1-1040-dai-do-mo");
      console.log(`   dải đỏ nguyên văn: ${JSON.stringify(d)} · ${axe}`);
      // tải lại: dải biến mất (chỉ báo một lần), câu ở khối Thanh toán còn
      await p.send("Page.reload", {});
      await p.waitFor("document.readyState === 'complete' && document.querySelector('[data-canh-bao=\"khuyen-mai\"]') !== null", "tải lại: câu đỏ còn");
      assert.equal((await dai(p)).hidden, true, "tải lại: dải sau lệnh không còn");
      assert.equal(await p.ev("document.querySelector('[data-canh-bao=\"tong-am\"]') === null"), true);
    } finally {
      p.close();
    }
  });

  // ===== 2) 2 → 3 vẫn đỏ; đủ lại 10 thì hết (390) =====
  await step("2", "cùng đơn (390): 2 → 3 vẫn đỏ; đủ lại 10 → hết câu đỏ, dải xanh", async () => {
    const p = await trangDon(env, ACCOUNTS.accounting, A.id, M);
    try {
      await p.waitFor("document.querySelector('[data-canh-bao=\"khuyen-mai\"]') !== null", "đang còn nhắc (2 người)");
      await moBang(p);
      await bam(p, "Tăng", "Người lớn", "Tour thử 500.000", 1);
      await chonLyDo(p, "THEM_NGUOI");
      await luu(p, TIEU_DE_DO);
      const d = await dai(p);
      assert.deepEqual([d.lop, d.tieuDe, d.dong], [["banner-danger"], TIEU_DE_DO, [CAU_KHUYEN_MAI]], "2 → 3 vẫn đỏ (chưa đủ lại 10)");
      await p.waitFor("document.querySelector('[data-canh-bao=\"khuyen-mai\"]') !== null", "câu đỏ còn ở khối Thanh toán");
      assert.ok((await tranNgang(p)) <= 0, "không tràn ngang 390 (dải đỏ)");
      await shotKhung(p, "03-khuyen-mai-sau-luu-390.png");
      await shotKhoi(p, cardCo("Thanh toán"), "04-thanh-toan-khuyen-mai-390.png");
      const axe = await axeKhong(p, "2-390-dai-do-mo");
      // đủ lại 10: Tăng 7 lần (3 → 10)
      await p.ev("window.scrollTo(0, 0), true");
      await moBang(p);
      await bam(p, "Tăng", "Người lớn", "Tour thử 500.000", 7);
      await chonLyDo(p, "THEM_NGUOI");
      await luu(p, TIEU_DE_XANH);
      const x = await dai(p);
      assert.deepEqual([x.lop, x.tieuDe, x.dong], [["banner-info"], TIEU_DE_XANH, []], `đủ lại 10: dải xanh. Thực tế: ${JSON.stringify(x)}`);
      await p.waitFor("[...document.querySelectorAll('.totals .kv')].some((k) => k.children[0].textContent === 'Tạm tính' && k.children[1].textContent === '5.000.000 ₫')", "tiền tính lại 10 người");
      assert.deepEqual(await canhBao(p), [], "đủ lại 10: không còn câu nào");
      assert.deepEqual(p.consoleErrors, []);
      await p.ev("window.scrollTo(0, 0), true");
      await shotKhung(p, "05-het-nhac-dai-xanh-390.png");
      console.log(`   ${axe}`);
    } finally {
      p.close();
    }
  });

  // ===== 3) hai câu cùng hiện (đơn B); đơn không giảm giá (C) không có câu đỏ (1040) =====
  await step("3", "đơn giảm giá vượt tạm tính: hai câu cùng hiện, đỏ trên vàng, dải đỏ hai dòng; đơn không giảm giá: không câu đỏ, dải xanh (1040)", async () => {
    let p = await trangDon(env, ACCOUNTS.accounting, B.id, DESK);
    try {
      await moBang(p);
      await bam(p, "Giảm", "Người lớn", "Tour thử 500.000", 1);
      await chonLyDo(p, "BOT_NGUOI");
      await luu(p, TIEU_DE_DO);
      const d = await dai(p);
      assert.deepEqual([d.lop, d.tieuDe, d.dong], [["banner-danger"], TIEU_DE_DO, [CAU_KHUYEN_MAI, CAU_GIAM_GIA_VUOT]], `dải đỏ hai dòng: ${JSON.stringify(d)}`);
      await p.waitFor("document.querySelector('[data-canh-bao=\"khuyen-mai\"]') !== null && document.querySelector('[data-canh-bao=\"tong-am\"]') !== null", "hai câu ở khối Thanh toán");
      const c = await canhBao(p);
      assert.deepEqual(c.map((x) => [x.khoa, x.chu, x.do]), [["khuyen-mai", CAU_KHUYEN_MAI, true], ["tong-am", CAU_GIAM_GIA_VUOT, false]], "đỏ (khuyến mại) đứng trên vàng (giảm giá vượt)");
      assert.equal(c[0].mau, DO);
      assert.notEqual(c[1].mau, DO, "câu giảm giá vượt giữ màu vàng, không bị đỏ lây");
      assert.deepEqual((await p.ev(pairs)).slice(0, 3), [["Tạm tính", "500.000 ₫"], ["Giảm giá", "800.000 ₫"], ["Tổng cộng", "0 ₫"]]);
      await shotKhung(p, "06-hai-cau-sau-luu-1040.png");
      await shotKhoi(p, cardCo("Thanh toán"), "07-thanh-toan-hai-cau-do-tren-vang-1040.png");
      console.log(`   màu hai câu: khuyến mại ${c[0].mau}, giảm giá vượt ${c[1].mau}`);
      assert.deepEqual(p.consoleErrors, []);
    } finally {
      p.close();
    }
    p = await trangDon(env, ACCOUNTS.accounting, C.id, DESK);
    try {
      await moBang(p);
      await bam(p, "Giảm", "Người lớn", "Tour thử 500.000", 3);
      await chonLyDo(p, "BOT_NGUOI");
      await luu(p, TIEU_DE_XANH);
      const d = await dai(p);
      assert.deepEqual([d.lop, d.tieuDe, d.dong], [["banner-info"], TIEU_DE_XANH, []], `đơn không giảm giá: dải xanh. Thực tế: ${JSON.stringify(d)}`);
      await p.waitFor("[...document.querySelectorAll('.totals .kv')].some((k) => k.children[0].textContent === 'Tạm tính' && k.children[1].textContent === '500.000 ₫')", "tiền tính lại 1 người");
      assert.deepEqual(await canhBao(p), [], "đơn không giảm giá: không có câu nào");
      await shotKhung(p, "08-khong-giam-gia-dai-xanh-1040.png");
    } finally {
      p.close();
    }
  });

  // ===== 4) 390 và 1040: không tràn ngang, axe — đơn B (đang có hai câu ở khối Thanh toán) =====
  await step("4", "đơn B có hai câu: 390 và 1040 không tràn ngang, không lỗi console; axe 0 critical/serious", async () => {
    const kq = [];
    for (const [nhan, vp] of [["390", M], ["1040", DESK]]) {
      const p = await trangDon(env, ACCOUNTS.accounting, B.id, vp);
      try {
        await p.waitFor("document.querySelector('[data-canh-bao=\"khuyen-mai\"]') !== null && document.querySelector('[data-canh-bao=\"tong-am\"]') !== null", "hai câu hiện");
        assert.ok((await tranNgang(p)) <= 0, `không tràn ngang ở ${nhan}`);
        // chữ trong khối không bị cắt: phần tử không có overflow ngang và chiều cao tự nhiên đủ chứa chữ
        const cat = await p.ev("[...document.querySelectorAll('[data-canh-bao]')].map((x) => [x.dataset.canhBao, x.scrollWidth > x.clientWidth + 1, x.scrollHeight > x.clientHeight + 1])");
        assert.deepEqual(cat.map((c) => [c[1], c[2]]), [[false, false], [false, false]], `chữ không bị cắt ở ${nhan}: ${JSON.stringify(cat)}`);
        assert.deepEqual(p.consoleErrors, [], `lỗi console ở ${nhan}`);
        if (nhan === "390") await shotKhoi(p, cardCo("Thanh toán"), "09-thanh-toan-hai-cau-390.png");
        // Số đo để nhìn ảnh có căn cứ (không khẳng định): bề rộng thật của biểu tượng báo động cạnh từng câu (flex có thể làm nó co) và màu số tiền đỏ "Tổng cộng" đứng cạnh câu đỏ.
        console.log(`   ${nhan}: biểu tượng báo động rộng ${JSON.stringify(await p.ev("[...document.querySelectorAll('[data-canh-bao] svg')].map((s) => Math.round(s.getBoundingClientRect().width * 10) / 10)"))}px (khai 16) · màu số "Tổng cộng" ${await p.ev("(() => { const k = [...document.querySelectorAll('.totals .kv')].find((x) => x.children[0].textContent === 'Tổng cộng'); return getComputedStyle(k.children[1]).color; })()")}`);
        kq.push(`${nhan}: ${await axeKhong(p, `4-${nhan}`)}`);
      } finally {
        p.close();
      }
    }
    console.log(`   ${kq.join(" · ")}`);
  });

  // ===== 5) khối "Số khách qua các lần sửa" =====
  await step("5", "lịch sử số khách: đơn sửa 4 → 3 → 5 ba dòng đúng nhãn và tiền; chưa sửa, nháp, Bán hàng không phải người lập: không có khối", async () => {
    const mong = [
      ["khoi_tao", "Lúc xác nhận", "Lúc xác nhận — tạm tính 2.000.000 ₫", ["Tour thử 500.000: 4 người lớn"]],
      ["dieu_chinh", "Lần sửa 1", "Lần sửa 1 — tạm tính 1.500.000 ₫", ["Tour thử 500.000: 3 người lớn"]],
      ["hien_hanh", "Hiện tại · sau lần sửa 2", "Hiện tại · sau lần sửa 2 — tạm tính 2.500.000 ₫", ["Tour thử 500.000: 5 người lớn"]],
    ];
    const docKhoi = (p) => p.ev(`(() => { const k = document.querySelector('[data-khoi="lich-su-so-khach"]'); if (!k) return null; return { tieuDe: k.querySelector('h3').textContent, dong: [...k.querySelectorAll('li[data-buoc]')].map((li) => [li.dataset.buoc, li.querySelector('strong').textContent, [...li.childNodes].filter((n) => n.nodeType === 3 || n.tagName === 'STRONG').map((n) => n.textContent).join(''), [...li.querySelectorAll('.history-detail')].map((x) => x.textContent)]) }; })()`);
    // Kế toán, 1040 và 390
    for (const [nhan, vp] of [["1040", DESK], ["390", M]]) {
      const p = await trangDon(env, ACCOUNTS.accounting, D.id, vp);
      try {
        await p.waitFor("document.querySelector('[data-khoi=\"lich-su-so-khach\"]') !== null", `khối lịch sử hiện (${nhan})`);
        const k = await docKhoi(p);
        assert.equal(k.tieuDe, "Số khách qua các lần sửa");
        assert.deepEqual(k.dong, mong, `ba dòng đúng nhãn và tiền (${nhan}): ${JSON.stringify(k.dong)}`);
        assert.ok((await tranNgang(p)) <= 0, `không tràn ngang (${nhan})`);
        assert.deepEqual(p.consoleErrors, []);
        await shotKhoi(p, cardCo("Lịch sử"), `10-lich-su-so-khach-${nhan}.png`);
        if (nhan === "1040") await axeKhong(p, "5-lich-su-1040");
      } finally {
        p.close();
      }
    }
    // người lập (Bán hàng A) có order.history.view → thấy cùng ba dòng
    let p = await trangDon(env, ACCOUNTS.salesA, D.id, DESK);
    try {
      await p.waitFor("document.querySelector('[data-khoi=\"lich-su-so-khach\"]') !== null", "người lập thấy khối");
      assert.deepEqual((await docKhoi(p)).dong, mong, "người lập: cùng ba dòng");
    } finally {
      p.close();
    }
    // Đơn đã xác nhận nhưng chưa sửa lần nào (Kế toán) và đơn nháp (người lập): không có khối
    for (const [nhan, tk, d] of [["chưa sửa lần nào", ACCOUNTS.accounting, E], ["nháp", ACCOUNTS.salesA, F]]) {
      p = await trangDon(env, tk, d.id, DESK);
      try {
        await p.waitFor("document.querySelectorAll('.card').length > 3", "trang dựng xong");
        assert.equal(await p.ev("document.querySelector('[data-khoi=\"lich-su-so-khach\"]') === null"), true, `đơn ${nhan}: không có khối`);
        if (nhan === "chưa sửa lần nào") await shotKhoi(p, cardCo("Lịch sử"), "11-lich-su-chua-sua-khong-co-khoi-1040.png");
      } finally {
        p.close();
      }
    }
    // Bán hàng KHÔNG phải người lập (B) xem đơn D: không có khối
    p = await trangDon(env, ACCOUNTS.salesB, D.id, DESK);
    try {
      await p.waitFor("document.querySelectorAll('.card').length > 3", "trang dựng xong");
      assert.equal(await p.ev("document.querySelector('[data-khoi=\"lich-su-so-khach\"]') === null"), true, "Bán hàng không phải người lập: không có khối");
      console.log(`   Bán hàng không phải người lập: thẻ "Lịch sử" ${(await p.ev(`${cardCo("Lịch sử")} !== undefined`)) ? "CÓ" : "KHÔNG có"} (khối số khách thì không có)`);
    } finally {
      p.close();
    }
  });

  // ===== 6) bảng "Sửa số khách": bớt người lớn về 0 → báo sớm + khoá Lưu =====
  await step("6", "bảng Sửa số khách (2 NL + 1 TE): bớt người lớn về 0 → câu thiếu người lớn + Lưu khoá; tăng lại 1 → mở (390 và 1040)", async () => {
    for (const [nhan, vp] of [["390", M], ["1040", DESK]]) {
      const p = await trangDon(env, ACCOUNTS.accounting, G.id, vp);
      try {
        await moBang(p);
        const trang = () => p.ev("(() => { const c = document.querySelector('[data-canh-bao=\"thieu-nguoi-lon\"]'); return { coPhanTu: c !== null, hien: c !== null && !c.hidden, chu: c?.textContent ?? null, luuKhoa: document.querySelector('[data-action=\"luu-so-khach\"]').disabled, ng: document.querySelector('.sheet-root .counter-field[aria-label=\"Người lớn — Tour 4 đảo Nha Trang\"]')?.value ?? null, te: document.querySelector('.sheet-root .counter-field[aria-label=\"Trẻ em — Tour 4 đảo Nha Trang\"]')?.value ?? null }; })()");
        const dau = await trang();
        assert.deepEqual([dau.coPhanTu, dau.hien, dau.luuKhoa, dau.ng, dau.te], [true, false, true, "2", "1"], `lúc mở: câu ẩn, Lưu khoá vì chưa chọn lý do. ${JSON.stringify(dau)}`);
        await chonLyDo(p, "BOT_NGUOI");
        assert.equal((await trang()).luuKhoa, false, "chọn lý do, số khách còn người lớn → Lưu mở");
        await bam(p, "Giảm", "Người lớn", "Tour 4 đảo Nha Trang", 1);
        let t = await trang();
        assert.deepEqual([t.hien, t.luuKhoa, t.ng], [false, false, "1"], "còn 1 người lớn: không báo, Lưu mở");
        await bam(p, "Giảm", "Người lớn", "Tour 4 đảo Nha Trang", 1);
        t = await trang();
        assert.deepEqual([t.hien, t.chu, t.luuKhoa, t.ng, t.te], [true, CAU_THIEU_NGUOI_LON, true, "0", "1"], `về 0 người lớn (còn 1 trẻ em): hiện câu, Lưu khoá. ${JSON.stringify(t)}`);
        assert.equal(await p.ev("document.querySelector('[data-canh-bao=\"thieu-nguoi-lon\"]').classList.contains('field-error')"), true);
        assert.ok((await tranNgang(p)) <= 0, `không tràn ngang (${nhan})`);
        await sleep(700); // bảng trượt có hiệu ứng mở: chờ xong rồi mới chụp (lần đầu chụp ở 1040 trúng lúc đang mờ dần)
        await shotKhung(p, `12-bang-thieu-nguoi-lon-${nhan}.png`);
        if (nhan === "390") {
          // chân bảng (nút Huỷ | Lưu số khách) nằm dưới màn hình: cuộn tới để ảnh thấy nút Lưu KHOÁ
          await p.ev("document.querySelector('[data-action=\"luu-so-khach\"]').scrollIntoView({ block: 'end' }), true");
          await sleep(300);
          await shotKhung(p, "12b-bang-thieu-nguoi-lon-nut-luu-khoa-390.png");
          await p.ev("document.querySelector('[data-canh-bao=\"thieu-nguoi-lon\"]').scrollIntoView({ block: 'center' }), true");
          console.log(`   ${await axeKhong(p, "6-bang-390")}`);
        }
        await bam(p, "Tăng", "Người lớn", "Tour 4 đảo Nha Trang", 1);
        t = await trang();
        assert.deepEqual([t.hien, t.luuKhoa, t.ng], [false, false, "1"], "tăng lại 1: câu ẩn, Lưu mở");
        // gõ thẳng số 0 vào ô (đường gõ tay, không qua nút −) cũng phải khoá
        await p.ev(setInput("document.querySelector('.sheet-root .counter-field[aria-label=\"Người lớn — Tour 4 đảo Nha Trang\"]')", "0"));
        t = await trang();
        assert.deepEqual([t.hien, t.luuKhoa], [true, true], "gõ tay 0 vào ô cũng báo và khoá");
        assert.deepEqual(p.consoleErrors, [], `lỗi console (${nhan})`);
      } finally {
        p.close();
      }
    }
  });

  // ===== 7) form lập đơn =====
  await step("7", "form lập đơn (390): chỉ có trẻ em / chỉ em bé → khung \"Chưa lưu được\" có câu thiếu người lớn; thêm một người lớn → lưu được", async () => {
    const p = await env.as(ACCOUNTS.salesA, "/order-form", M);
    try {
      const cards = "document.querySelectorAll('#services .svc')";
      const dem = (nhan) => `${cards}[0].querySelector('.counter-field[aria-label=${JSON.stringify(nhan)}]')`;
      await p.waitFor("document.getElementById('catalog-q')", "form mở");
      await p.ev("document.getElementById('catalog-q').focus(); true");
      await p.ev(setInput("document.getElementById('catalog-q')", "TD101"));
      await p.waitFor("document.querySelectorAll('#catalog-list .catalog-pick').length === 1", "TD101");
      await p.ev("document.querySelector('#catalog-list .catalog-pick').click(); true");
      await p.waitFor(`${cards}.length === 1`, "thẻ dịch vụ");
      await p.ev(setInput("document.getElementById('orderDate')", ngay));
      await p.ev(setInput("document.getElementById('customerName')", "Khách Form ADR-0114"));
      await p.ev(setInput("document.getElementById('customerPhone')", "0902 333 444"));
      const luuLoi = async () => {
        await p.ev("document.getElementById('save').click(); true");
        await p.waitFor("!document.getElementById('save-error').hidden", "khung lỗi hiện");
        return p.ev("(() => { const e = document.getElementById('save-error'); const r = e.getBoundingClientRect(); return { chu: e.textContent, trongKhung: r.top >= 0 && r.bottom <= innerHeight, lop: e.className, dong: [...e.querySelectorAll('li')].map((x) => x.textContent) }; })()");
      };
      // chỉ trẻ em: người lớn 0, trẻ em 1
      await p.ev(setInput(dem("Người lớn"), "0"));
      await p.ev(setInput(dem("Trẻ em"), "1"));
      let l = await luuLoi();
      assert.match(l.chu, /^Chưa lưu được — kiểm tra lại:/);
      assert.ok(l.dong.includes(CAU_THIEU_NGUOI_LON), `thiếu câu người lớn: ${JSON.stringify(l.dong)}`);
      assert.equal(l.trongKhung, true, "khung lỗi nằm trong khung nhìn");
      await shotKhung(p, "13-form-chi-co-tre-em-390.png");
      console.log(`   chỉ trẻ em: ${JSON.stringify(l.dong)} · ${await axeKhong(p, "7-form-390")}`);
      // chỉ em bé: người lớn 0, trẻ em 0, em bé 1 — cả câu từng dịch vụ lẫn câu cấp đơn
      await p.ev(setInput(dem("Trẻ em"), "0"));
      await p.ev(setInput(dem("Em bé"), "1"));
      l = await luuLoi();
      assert.ok(l.dong.includes(CAU_THIEU_NGUOI_LON), `chỉ em bé thiếu câu: ${JSON.stringify(l.dong)}`);
      await shotKhung(p, "14-form-chi-co-em-be-390.png");
      console.log(`   chỉ em bé: ${JSON.stringify(l.dong)}`);
      // thêm một người lớn (và bỏ em bé, loại khách giá 0) → lưu được
      await p.ev(setInput(dem("Em bé"), "0"));
      await p.ev(setInput(dem("Người lớn"), "1"));
      await p.ev("document.getElementById('save').click(); true");
      await p.waitFor("location.pathname === '/order'", "chuyển tới trang đơn sau khi lưu", 15000);
      const id = await p.ev("new URLSearchParams(location.search).get('id')");
      const ct = await p.ev(`fetch('/api/orders/' + ${JSON.stringify(id)}).then((r) => r.json())`);
      assert.deepEqual([ct.order.status, ct.order.services[0].pax.adult, ct.order.services[0].pax.child, ct.order.services[0].pax.infant], ["draft", 1, 0, 0], "thêm 1 người lớn thì lưu được (nháp)");
      assert.deepEqual(p.consoleErrors, []);
    } finally {
      p.close();
    }
  });

  // ===== 8) nháp cũ không người lớn → Xác nhận đơn =====
  await step("8", "nháp cũ không còn người lớn (SQL trên D1 tạm): \"Xác nhận đơn\" → dải đỏ câu máy chủ, KHÔNG có nút \"Tải lại đơn\" (1040)", async () => {
    const p = await trangDon(env, ACCOUNTS.salesA, H.id, DESK);
    try {
      await p.waitFor("[...document.querySelectorAll('#actions .btn')].some((b) => b.textContent === 'Xác nhận đơn')", "nút Xác nhận đơn");
      await p.ev("window.confirm = () => true, true"); // hộp xác nhận gốc của trình duyệt (headless): đồng ý sẵn
      await p.ev("[...document.querySelectorAll('#actions .btn')].find((b) => b.textContent === 'Xác nhận đơn').click()");
      await p.waitFor("!document.getElementById('error').hidden", "dải lỗi hiện");
      const d = await dai(p);
      assert.deepEqual([d.lop, d.tieuDe, d.nut], [["banner-danger"], CAU_THIEU_NGUOI_LON, []], `dải đỏ câu máy chủ, không nút tải lại. Thực tế: ${JSON.stringify(d)}`);
      assert.equal(await p.ev("document.querySelector('#order .badge').textContent"), "Chờ xác nhận", "đơn vẫn là nháp (nhãn \"Chờ xác nhận\"), chưa xác nhận được");
      await shotKhung(p, "15-xac-nhan-nhap-thieu-nguoi-lon-1040.png");
      console.log(`   dải: ${JSON.stringify(d)}`);
    } finally {
      p.close();
    }
  });

  // ===== 9) Trợ giúp và nhật ký thay đổi =====
  await step("9", "Trợ giúp: Kế toán thấy ba đoạn mới ở mục sửa số khách; Bán hàng thấy câu ở bước nhập số khách; Cập nhật có mục 1.93", async () => {
    const moHet = (p) => p.ev("document.querySelectorAll('#huong-dan details').forEach((d) => (d.open = true)), true");
    let p = await env.as(ACCOUNTS.accounting, "/help", DESK);
    try {
      await p.waitFor("document.querySelectorAll('#huong-dan > .hd-nhom').length > 0 && document.querySelector('#changelog')?.children.length > 0", "Trợ giúp hiện", 10000);
      await moHet(p);
      const muc = await p.ev("(() => { const d = [...document.querySelectorAll('#huong-dan details.hd-muc')].find((x) => x.querySelector(':scope > summary')?.textContent === 'Sửa số khách đơn đã xác nhận'); return d ? d.querySelector('.hd-noi-dung').innerText : null; })()");
      assert.ok(muc, "có mục \"Sửa số khách đơn đã xác nhận\"");
      for (const doan of [
        "Bớt khách mà đơn có giảm giá: khối Thanh toán hiện thêm một câu màu đỏ nhắc bạn xem lại khuyến mại. Nền tảng chỉ nhắc, không đổi số tiền và không chặn; câu nhắc còn cho tới khi số khách đủ lại như lúc xác nhận.",
        "Khối Lịch sử có thêm phần Số khách qua các lần sửa: số khách và tạm tính lúc xác nhận, sau từng lần sửa và hiện tại. Phần này chỉ hiện khi đơn đã sửa số khách ít nhất một lần.",
        "Không bớt hết người lớn được: đơn luôn cần ít nhất một người lớn đi cùng.",
      ]) assert.ok(muc.replace(/\s+/g, " ").includes(doan), `thiếu đoạn: ${doan}`);
      const dau = await p.ev("(() => { const n = document.querySelector('.release-note'); return { tieuDe: n.querySelector('h3').textContent, soMuc: n.querySelectorAll('li').length, chu: n.innerText }; })()");
      assert.match(dau.tieuDe, /^Phiên bản 1\.93 — /);
      assert.equal(dau.soMuc, CHANGELOG[0].items.length, "đủ ba mục");
      for (const it of CHANGELOG[0].items) assert.ok(dau.chu.replace(/\s+/g, " ").includes(it.text), `nhật ký thiếu: ${it.text}`);
      assert.equal(CHANGELOG[0].version, "1.93");
      assert.ok((await tranNgang(p)) <= 0);
      assert.deepEqual(p.consoleErrors, []);
      await shotKhoi(p, "[...document.querySelectorAll('#huong-dan details.hd-muc')].find((x) => x.querySelector(':scope > summary')?.textContent === 'Sửa số khách đơn đã xác nhận')", "16-tro-giup-ke-toan-sua-so-khach-1040.png");
      await shotKhoi(p, "document.querySelector('.release-note')", "17-cap-nhat-1-91-1040.png");
    } finally {
      p.close();
    }
    p = await env.as(ACCOUNTS.salesA, "/help", M);
    try {
      await p.waitFor("document.querySelectorAll('#huong-dan > .hd-nhom').length > 0", "Trợ giúp hiện (Bán hàng)", 10000);
      await moHet(p);
      const chu = (await p.ev("document.getElementById('huong-dan').innerText")).replace(/\s+/g, " ");
      assert.ok(chu.includes("Cả đơn cần ít nhất một người lớn."), "Bán hàng: câu ở bước nhập số khách");
      assert.ok((await tranNgang(p)) <= 0, "không tràn ngang 390");
      assert.deepEqual(p.consoleErrors, []);
    } finally {
      p.close();
    }
  });
} finally {
  await env.stop();
}

const tong = 9;
const xanh = tong - failures.length;
console.log(`\nADR-0114 SMOKE: xanh ${xanh} / ${tong} bước · ${AXE ? `CÓ axe (${axeCoLan} lần quét)` : "KHÔNG có axe (thiếu AXE_JS: kiểm màu bị bỏ qua, không phải xanh đầy đủ)"}`);
if (failures.length) {
  console.log(`bước đỏ: ${failures.join(", ")}`);
  process.exitCode = 1;
}
