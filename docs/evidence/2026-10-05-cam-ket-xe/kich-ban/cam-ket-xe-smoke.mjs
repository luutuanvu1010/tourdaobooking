// Đợt 7 Task 8a (ADR-0056 VK3-A): hộp phá lệ nhận mã 409 `can_pha_le_cam_ket` ở màn Điều phối xe; lịch chung trả cờ xeRieng / choToiThieu (không khoá phá lệ).
// Một lần xếp chặng "xe riêng" (1040) và một lần xếp chặng "≥ 16 chỗ vào xe 15 chỗ" (390): Bán hàng bị chặn bằng câu lời thường (không hộp phá lệ), Quản trị
// mở hộp phá lệ, chọn lý do, xếp được; cột phá lệ của chuyến có lý do. Dựng trên dp-lib.mjs (D1 tạm + wrangler dev + Chrome headless qua CDP; không cần mạng ngoài).
// Chạy từ GỐC repo, sau `npm run build:web`:
//   AXE_JS=<…/axe.min.js> CHROME_BIN=docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh OUT=docs/evidence/2026-10-05-cam-ket-xe node docs/evidence/2026-10-05-cam-ket-xe/kich-ban/cam-ket-xe-smoke.mjs
// Kho cookie của Chrome dùng CHUNG: Bán hàng → Quản trị (trang mở sau cùng là của Quản trị).
import { randomUUID } from "node:crypto";
import {
  ACCOUNTS, CHU, DESK, LOC_BEN_TAU, MOB, apiCalls, assert, axe, axeNote, boDem, click, dungDuLieuDieuPhoi, dungMoiTruong, noCode, noOverflowX, shotView, shown, sleep, txt,
} from "../../2026-09-29-adr-0049/kich-ban/dp-lib.mjs";

const { env, call } = await dungMoiTruong([CHU]);
const b = boDem("CAM KET XE SMOKE");
const d = await dungDuLieuDieuPhoi(env, call);

// Hai đơn mới xác nhận, rồi bật cam kết ở chặng (đường thật: PUT /api/orders/:id/legs/:legId): O6 = XE RIÊNG; O7 = tối thiểu 16 chỗ (xe T1 chỉ 15 chỗ).
const NO_TRIP = { departTime: "", pickupTime: "", pickupPlace: "", checkinDate: "", checkinTime: "", checkinPlace: "", note: "" };
let soDon = 0;
const donCamKet = async (gio, noiDon, camKet) => {
  const r = await call(ACCOUNTS.salesA, "POST", "/api/orders", {
    customerName: `Khách Cam Kết ${++soDon}`, customerPhone: `0903 200 ${String(300 + soDon)}`, customerEmail: "", customerNote: "", discount: 0, depositAmount: 0, depositMethod: null, paymentNote: "",
    services: [{
      kind: "catalog", catalogCode: "TD101", pax: { adult: 2, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: 1350000 }, ...NO_TRIP, departDate: d.NGAY_XA,
      legs: [{ direction: "OUT", pickupDate: d.NGAY_XA, pickupTime: gio, pickupLocationId: null, pickupPlace: noiDon, dropoffLocationId: LOC_BEN_TAU, dropoffPlace: "" }],
    }],
    passengers: [0, 1].map((i) => ({ fullName: `Hành Khách Cam Kết ${soDon}-${i + 1}`, birthYear: 1985 + i, paxCode: null })),
  });
  assert.equal(r.status, 201, r.text);
  const c = await call(ACCOUNTS.admin, "POST", `/api/orders/${r.json.order.id}/status`, { status: "confirmed" });
  assert.equal(c.status, 200, c.text);
  const o = c.json.order;
  const leg = o.services[0].legs[0];
  const s = await call(ACCOUNTS.salesA, "PUT", `/api/orders/${o.id}/legs/${leg.id}`, {
    expectedUpdatedAt: leg.updatedAt,
    leg: { pickupDate: d.NGAY_XA, pickupTime: gio, pickupLocationId: null, pickupPlace: noiDon, dropoffLocationId: LOC_BEN_TAU, dropoffPlace: "", ...camKet },
  });
  assert.equal(s.status, 200, s.text);
  return { id: o.id, ma: o.orderCode, legId: leg.id };
};
const O6 = await donCamKet("08:30", "Vinpearl Resort Nha Trang", { exclusiveVehicle: true });
const O7 = await donCamKet("09:00", "InterContinental Nha Trang", { minVehicleSeats: 16 });

const cho = (p) => p.waitFor(`!document.getElementById('dp-trang').hidden && !!document.querySelector('#dp-cot-xe .dp-tl-card')`, "bảng điều phối dựng xong");
const ghi = (p) => apiCalls(p).filter((r) => r.method !== "GET" && r.path.startsWith("/api/van-chuyen/chuyen"));
const moThe = (legId) => click(`#dp-cot-chua-xep .dp-leg[data-leg="${legId}"]`);
const camKetChuyen = (tripId) => env.sql(`SELECT commitment_override_reason_code AS r, commitment_override_key AS k FROM vc_trip WHERE id = '${tripId}'`)[0];
const chonXep = async (p, legId, tripId) => {
  await p.ev(moThe(legId));
  await p.waitFor(`!!document.querySelector('[data-action="xep-gui"]')`, "hộp xếp mở");
  await sleep(600);
  await p.ev(click(`.dp-sheet-xep .vc-reason[data-code="${tripId}"]`));
  await p.ev(click('[data-action="xep-gui"]'));
};

try {
  await b.step("1", "lịch chung (API) trả xeRieng / choToiThieu của hai chặng, không có chuỗi khoá phá lệ", async () => {
    const r = await call(ACCOUNTS.salesA, "GET", `/api/van-chuyen/lich?ngay=${d.NGAY_XA}`);
    assert.equal(r.status, 200, r.text);
    const c6 = r.json.chang.find((x) => x.legId === O6.legId);
    const c7 = r.json.chang.find((x) => x.legId === O7.legId);
    assert.deepEqual([c6.xeRieng, c6.choToiThieu, c7.xeRieng, c7.choToiThieu], [true, null, false, 16]);
    assert.ok(!r.text.includes("commitment_override_key") && !/"khoa"\s*:/.test(r.text));
  });

  // ---- Bán hàng, máy tính: bị chặn, không hộp phá lệ --------------------------------------------------------------------------------------------------------
  const p = await env.as(ACCOUNTS.salesA, `/dieu-phoi?ngay=${d.NGAY_XA}`, DESK);
  await b.step("2", `1040 Bán hàng xếp chặng XE RIÊNG ${O6.ma} vào ${d.T1.ma} (đã có khách đơn khác) → câu "cần Quản trị phá lệ" trong hộp, không hộp Phá lệ, chuyến không đổi${axeNote()}`, async () => {
    await cho(p);
    await chonXep(p, O6.legId, d.T1.id);
    await p.waitFor(`!!document.querySelector('.dp-sheet-xep .vc-field-error:not([hidden])')`, "câu lỗi trong hộp");
    const cau = await p.ev(txt(".dp-sheet-xep .vc-field-error"));
    assert.match(cau, /cam kết xe riêng \/ số chỗ/);
    assert.match(cau, /cần Quản trị phá lệ/i);
    assert.equal(await p.ev(`!!document.querySelector('[data-action="pha-le-gui"]')`), false, "Bán hàng không có hộp Phá lệ");
    assert.equal(await p.ev(noCode), "");
    assert.equal(camKetChuyen(d.T1.id).r, null);
    await axe(p, "hộp xếp bị chặn 1040");
    await shotView(p, "cam-ket-ban-hang-bi-chan-may-tinh.png");
  });
  await p.close();

  // ---- Bán hàng, điện thoại -----------------------------------------------------------------------------------------------------------------------------------
  const pm = await env.as(ACCOUNTS.salesA, `/dieu-phoi?ngay=${d.NGAY_XA}`, MOB);
  await b.step("3", `390 Bán hàng xếp chặng ≥ 16 chỗ ${O7.ma} vào ${d.T1.ma} (xe 15 chỗ) → bị chặn bằng câu lời thường, trang không tràn${axeNote()}`, async () => {
    await cho(pm);
    await chonXep(pm, O7.legId, d.T1.id);
    await pm.waitFor(`!!document.querySelector('.dp-sheet-xep .vc-field-error:not([hidden])')`, "câu lỗi trong hộp");
    assert.match(await pm.ev(txt(".dp-sheet-xep .vc-field-error")), /cần Quản trị phá lệ/i);
    assert.equal(await pm.ev(`!!document.querySelector('[data-action="pha-le-gui"]')`), false);
    assert.equal(await pm.ev(noCode), "");
    assert.ok(await pm.ev(noOverflowX));
    await shotView(pm, "cam-ket-ban-hang-bi-chan-dien-thoai.png");
  });
  await pm.close();

  // ---- Quản trị, máy tính: hộp phá lệ → xếp được --------------------------------------------------------------------------------------------------------------
  const pq = await env.as(ACCOUNTS.admin, `/dieu-phoi?ngay=${d.NGAY_XA}`, DESK);
  await b.step("4", `1040 Quản trị xếp ${O6.ma} (XE RIÊNG) vào ${d.T1.ma} → 409 mở hộp Phá lệ với lời cam kết → chọn lý do → "Phá lệ và xếp" gửi camKetPhaLe (không phaLe) → đã xếp, chuyến có dấu phá lệ${axeNote()}`, async () => {
    await cho(pq);
    await chonXep(pq, O6.legId, d.T1.id);
    await pq.waitFor(`!!document.querySelector('[data-action="pha-le-gui"]')`, "hộp phá lệ mở");
    await sleep(500);
    assert.match(await pq.ev(txt(".dp-sheet-pha-le .dp-sheet-sum")), /Trái cam kết xe riêng/);
    assert.equal(await pq.ev(`document.querySelector('[data-action="pha-le-gui"]').disabled`), true, "khoá tới khi chọn lý do");
    await axe(pq, "hộp phá lệ cam kết 1040");
    await pq.ev(click('.dp-sheet-pha-le .vc-reason[data-code="PHA_LE_SU_CO"]'));
    await shotView(pq, "cam-ket-quan-tri-hop-pha-le-may-tinh.png");
    await pq.ev(click('[data-action="pha-le-gui"]'));
    await pq.waitFor(`${txt("#dp-banner .banner-title")}.startsWith('Đã xếp 2 khách vào ${d.T1.ma}')`, "dải đã xếp");
    const thanGui = JSON.parse(ghi(pq).at(-1).body);
    assert.deepEqual(thanGui.camKetPhaLe, { lyDo: "PHA_LE_SU_CO" });
    assert.equal(thanGui.phaLe, undefined, "cam kết không đi bằng khoá phaLe (mốc)");
    assert.equal(camKetChuyen(d.T1.id).r, "PHA_LE_SU_CO");
    assert.ok(camKetChuyen(d.T1.id).k.includes(O6.legId), "khoá phá lệ ở cột chuyến (không ra DTO)");
    assert.equal(await pq.ev(noCode), "");
    await shotView(pq, "cam-ket-quan-tri-da-xep-may-tinh.png");
  });
  await pq.close();

  // ---- Quản trị, điện thoại (trang mở SAU CÙNG) ---------------------------------------------------------------------------------------------------------------
  const pqm = await env.as(ACCOUNTS.admin, `/dieu-phoi?ngay=${d.NGAY_XA}`, MOB);
  await b.step("5", `390 Quản trị xếp ${O7.ma} (≥ 16 chỗ) vào ${d.T1.ma} → hộp Phá lệ → xếp được; trang không tràn${axeNote()}`, async () => {
    await cho(pqm);
    await chonXep(pqm, O7.legId, d.T1.id);
    await pqm.waitFor(`!!document.querySelector('[data-action="pha-le-gui"]')`, "hộp phá lệ mở");
    await sleep(500);
    assert.match(await pqm.ev(txt(".dp-sheet-pha-le .dp-sheet-sum")), /Trái cam kết xe riêng \/ số chỗ/);
    assert.ok(await pqm.ev(noOverflowX));
    await pqm.ev(click('.dp-sheet-pha-le .vc-reason[data-code="PHA_LE_SU_CO"]'));
    await shotView(pqm, "cam-ket-quan-tri-hop-pha-le-dien-thoai.png");
    await pqm.ev(click('[data-action="pha-le-gui"]'));
    await pqm.waitFor(`${txt("#dp-banner .banner-title")}.startsWith('Đã xếp 2 khách vào ${d.T1.ma}')`, "dải đã xếp");
    assert.deepEqual(JSON.parse(ghi(pqm).at(-1).body).camKetPhaLe, { lyDo: "PHA_LE_SU_CO" });
    assert.ok(camKetChuyen(d.T1.id).k.includes(O7.legId), "khoá mới gồm cả chặng O7");
    await shotView(pqm, "cam-ket-quan-tri-da-xep-dien-thoai.png");
  });
  await pqm.close();
} finally {
  await env.stop?.();
  b.xong();
}
