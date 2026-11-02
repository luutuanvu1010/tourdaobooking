// Kịch bản Chrome — màn «Phân định trách nhiệm» (ADR-0116, web/phan-dinh.ts) và cột «Khoản phải nộp do phân định» của Sổ công nợ (web/so-cong-no.ts).
// Lối vào của người dùng: nút «Đề nghị phân định» trên trang đơn đã giao, liên kết trên trang Điều chỉnh công nợ, và tin báo; KHÔNG có mục ở thanh bên (trần 10 khối).
// Bước (mỗi khổ 390 và 1040; dữ liệu dựng bằng API TRƯỚC khi mở trang):
//   1  Kế toán: có lối vào từ Điều chỉnh công nợ; thấy ba phiếu (chờ phân định, chờ ghi, đã nộp), axe, bố cục.
//   2  Kế toán: phiếu đã nộp hiện câu «đã nộp», không có nút huỷ, không có đường trả lại.
//   3  Kế toán: «Ghi sổ theo phân định» phiếu chờ ghi ⇒ sang «đã ghi».
//   4  Kế toán: Sổ công nợ hiện «Khoản phải nộp do phân định» tách khỏi «Đang giữ».
//   5  Quản trị: «Phân định» phiếu chờ ⇒ sang «chờ ghi»; không có nút ghi của chính phiếu mình phân định.
//   6  Bán hàng: không có khối phiếu; gọi API danh sách 403.
// Chạy (từ gốc repo, sau `npm run build:web`):
//   AXE_JS=<…/axe.min.js> CHROME_BIN=$PWD/docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh node docs/evidence/2026-11-02-phan-dinh/kich-ban/phan-dinh-smoke.mjs
// Cuối: "PHAN DINH SMOKE OK" hoặc danh sách bước đỏ (thoát 1). LB_KHO=390|1040 chạy một khổ.
import assert from "node:assert/strict";
import { join } from "node:path";

process.env.OUT ??= join(process.cwd(), "docs/evidence/2026-11-02-phan-dinh/anh");
const { ACCOUNTS, KHO, axeKiem, bam, bocucSach, buoc, chup, diToi, goiApi, ketThuc, setInput, sleep, startEnv, taoMoTrang, vnDate } = await import("../../2026-10-30-luat-ban-dac-diem/kich-ban/lb-chung.mjs");

const env = await startEnv();
try {
  const { call } = goiApi(env);
  const moTrang = taoMoTrang(env);
  const phai = (r, status, nhan) => { assert.equal(r.status, status, `${nhan}: ${r.status} ${JSON.stringify(r.json)}`); return r.json; };
  const me = (a) => call(a, "GET", "/api/auth/me").then((r) => r.json.staff);
  const benB = (await me(ACCOUNTS.salesB)).partyId;
  assert.ok(benB, "tài khoản Bán hàng hai phải có hồ sơ");
  const KT = ACCOUNTS.accounting, QT = ACCOUNTS.admin, CHU = ACCOUNTS.chu;
  let so = 0;

  /** Đơn đi hôm nay, khách trả đủ công ty, đã giao. */
  const donDaGiao = async () => {
    so += 1;
    const r = phai(await call(ACCOUNTS.salesA, "POST", "/api/orders", {
      customerName: `Khách Phân Định ${so}`, customerPhone: `09111${String(10000 + so).slice(-5)}`, customerEmail: "", customerNote: "", discount: 0, paymentNote: "",
      services: [{ kind: "catalog", pickupChoice: "KHONG_DON", catalogCode: "TD101", pax: { adult: 1, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: 1350000, child: 950000, senior: 1200000, infant: 0 }, departDate: vnDate(0), departTime: "", pickupTime: "", pickupPlace: "", checkinDate: "", checkinTime: "", checkinPlace: "", note: "" }],
    }), 201, "lập đơn");
    const id = r.order.id;
    phai(await call(ACCOUNTS.salesA, "POST", `/api/orders/${id}/status`, { status: "confirmed" }), 200, "xác nhận");
    const t = phai(await call(KT, "GET", `/api/orders/${id}/payments`), 200, "đọc tiền");
    phai(await call(KT, "POST", `/api/orders/${id}/payments`, { soTien: t.phaiThu, hinhThuc: "CASH", nguoiThu: "cong_ty" }), 201, "ghi thu");
    phai(await call(CHU, "POST", `/api/orders/${id}/delivered`, {}), 200, "đã giao");
    return { id, maDon: r.order.orderCode };
  };
  const deNghi = async (id, soTien = 100000) => phai(await call(KT, "POST", "/api/ledger/phan-dinh", { orderId: id, soTien, lyDo: "Khách phản ánh quên đón tại khách sạn" }), 201, "đề nghị").id;
  const quyet = async (qId, soTien = 100000) => phai(await call(QT, "POST", `/api/ledger/phan-dinh/${qId}/quyet`, { truongHop: "T6", benChiuPartyId: benB, soTien, coTienRa: true, lyDo: "Đã nghe hai bên, người bán nhận lỗi" }), 201, "phân định").id;
  const the = (id) => `li.dc-the[data-id="${id}"]`;

  for (const [kho, vp] of KHO) {
    const a = await donDaGiao();
    const qA = await deNghi(a.id);
    const b = await donDaGiao();
    const qB = await deNghi(b.id);
    await quyet(qB);
    const c = await donDaGiao();
    const qC = await deNghi(c.id);
    const rC = await quyet(qC);
    phai(await call(KT, "POST", `/api/ledger/phan-dinh/${rC}/ghi`, { hinhThuc: "CASH", nguoiTra: "cong_ty" }), 201, "ghi khoản C");
    phai(await call(KT, "POST", "/api/ledger/settlements", { chieu: "nop", partyId: benB, phanBo: [{ orderId: c.id, soTien: 40000 }] }), 201, "bên chịu nộp");
    const d = await donDaGiao();
    const qD = await deNghi(d.id);
    const rD = await quyet(qD);
    phai(await call(KT, "POST", `/api/ledger/phan-dinh/${rD}/ghi`, { hinhThuc: "CASH", nguoiTra: "cong_ty" }), 201, "ghi khoản D");

    let p = await moTrang(KT, "/dieu-chinh-cong-no", vp);
    await buoc(`${kho}.1`, "Kế toán: có lối vào từ Điều chỉnh công nợ; thấy đủ phiếu; axe, bố cục", async () => {
      await p.waitFor(`!!document.querySelector('a[href="/phan-dinh"]')`, "liên kết sang màn phân định");
      assert.equal(await bam(p, 'a[href="/phan-dinh"]'), true);
      await sleep(300);
      await p.waitFor(`location.pathname === '/phan-dinh' && !document.getElementById('pd-khoi-phieu').hidden`, "khối phiếu hiện");
      await p.waitFor(`!!document.querySelector(${JSON.stringify(the(qC))})`, "phiếu đã nộp hiện");
      for (const [q, tt] of [[qA, "cho_phan_dinh"], [qB, "cho_ghi"], [qC, "da_ghi"]]) assert.equal(await p.ev(`document.querySelector(${JSON.stringify(the(q))}).dataset.trangThai`), tt);
      assert.match(await p.ev("document.getElementById('pd-dem').textContent"), /chờ phân định.*chờ ghi sổ/);
      await axeKiem(p, `${kho} Kế toán /phan-dinh`);
      await bocucSach(p, `${kho} Kế toán /phan-dinh`);
      await chup(p, `${kho}-1-ke-toan`);
    });
    await buoc(`${kho}.2`, "Kế toán: phiếu đã nộp có câu báo Toàn quyền, không có nút huỷ, không có đường trả lại", async () => {
      const s = the(qC);
      await p.waitFor(`!!document.querySelector(${JSON.stringify(`${s} [data-khoi="da-nop"]`)})`, "câu đã nộp");
      assert.match(await p.ev(`document.querySelector(${JSON.stringify(`${s} [data-khoi="da-nop"]`)}).textContent`), /báo Toàn quyền/);
      assert.equal(await p.ev(`!!document.querySelector(${JSON.stringify(`${s} [data-action="huy-khoan"]`)})`), false, "nút huỷ phải ẩn");
      assert.equal(await p.ev(`!!document.querySelector(${JSON.stringify(`${s} [data-action="tra-lai"]`)})`), false, "không có đường trả lại");
      assert.equal(await p.ev(`!!document.querySelector(${JSON.stringify(`${the(qD)} [data-action="huy-khoan"]`)})`), true, "khoản chưa nộp vẫn huỷ được");
      await chup(p, `${kho}-2-da-nop`);
    });
    await buoc(`${kho}.3`, "Kế toán: ghi sổ phiếu chờ ghi ⇒ sang đã ghi", async () => {
      const s = the(qB);
      assert.equal(await bam(p, `${s} [data-action="ghi-so"]`), true);
      await p.waitFor(`!!document.querySelector(${JSON.stringify(`${s} [data-action="chot-ghi"]`)})`, "nút chốt ghi");
      assert.equal(await bam(p, `${s} [data-action="chot-ghi"]`), true);
      await p.waitFor(`document.querySelector(${JSON.stringify(s)})?.dataset.trangThai === 'da_ghi'`, "phiếu đã ghi");
      await bocucSach(p, `${kho} sau ghi sổ`);
    });
    await buoc(`${kho}.4`, "Kế toán: Sổ công nợ tách «Khoản phải nộp do phân định» khỏi «Đang giữ»", async () => {
      await diToi(p, env, "/so-cong-no");
      await p.waitFor(`document.body.innerText.includes('Khoản phải nộp do phân định')`, "nhãn riêng hiện");
      assert.equal(await p.ev(`!!document.querySelector('[data-khoi="khoan-phan-dinh"]')`), true, "dòng của bên có khoản");
      await axeKiem(p, `${kho} /so-cong-no`);
      await bocucSach(p, `${kho} /so-cong-no`);
      await chup(p, `${kho}-4-so-cong-no`);
    });
    p.close();

    p = await moTrang(QT, "/phan-dinh", vp);
    await buoc(`${kho}.5`, "Quản trị: phân định phiếu chờ ⇒ chờ ghi; không có nút ghi phiếu mình phân định", async () => {
      const s = the(qA);
      await p.waitFor(`!!document.querySelector(${JSON.stringify(`${s} [data-action="phan-dinh"]`)})`, "nút phân định");
      assert.equal(await bam(p, `${s} [data-action="phan-dinh"]`), true);
      await p.waitFor(`!!document.querySelector(${JSON.stringify(`${s} select`)})`, "form phân định");
      assert.equal(await p.ev(`(() => { const o = document.querySelector(${JSON.stringify(`${s} select`)}); o.value = 'T10'; o.dispatchEvent(new Event('change', { bubbles: true })); return o.value; })()`), "T10");
      await p.ev(setInput(`document.querySelector(${JSON.stringify(`${s} textarea`)})`, "Do bão, không ai có lỗi trong việc này"));
      await axeKiem(p, `${kho} form phân định`);
      await bocucSach(p, `${kho} form phân định`);
      await chup(p, `${kho}-5-phan-dinh`);
      assert.equal(await bam(p, `${s} [data-action="chot-phan-dinh"]`), true);
      await p.waitFor(`document.querySelector(${JSON.stringify(s)})?.dataset.trangThai === 'cho_ghi'`, "phiếu chờ ghi");
      assert.equal(await p.ev(`!!document.querySelector(${JSON.stringify(`${s} [data-action="ghi-so"]`)})`), false);
    });
    p.close();

    p = await moTrang(ACCOUNTS.salesA, "/phan-dinh", vp);
    await buoc(`${kho}.6`, "Bán hàng: không có khối phiếu; API danh sách 403", async () => {
      await p.waitFor("!document.getElementById('pd-rong').hidden", "câu không có khoản");
      assert.equal(await p.ev("document.getElementById('pd-khoi-phieu').hidden"), true);
      phai(await call(ACCOUNTS.salesA, "GET", "/api/ledger/phan-dinh"), 403, "Bán hàng xem danh sách");
      await axeKiem(p, `${kho} Bán hàng /phan-dinh`);
    });
    p.close();
  }
} finally {
  await env.stop();
}
ketThuc("PHAN DINH");
