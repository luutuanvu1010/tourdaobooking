// Vận chuyển Đợt 5 A-1b — TÀI XẾ BỔ SUNG TÊN khách chưa có tên (ADR-0052 D5b — chủ duyệt 5/10, chỉ tài xế công ty; bản vẽ docs/design/van-chuyen-dot-3-7/Điều phối xe đang chạy.dc.html
// V6 6.3 "Suất của khách", 6.4 "Bổ sung tên — Suất N"): chuyến HÔM NAY (trong ngày chạy) có một suất chưa tên → khối "Suất của khách" (không tên khách), link
// "Bổ sung tên" → hộp Họ tên / Năm sinh (16px) → Lưu → máy chủ ghi, màn đọc lại: khối ẩn, điều kiện "thiếu tên" hết.
// Chạy từ GỐC repo, sau `npm run build:web` (không cần mạng ngoài). Dựng chuyến HÔM NAY lúc bây giờ + 2 giờ 30 ⇒ chạy TRƯỚC 19:00 giờ VN:
//   AXE_JS=<…/axe.min.js> CHROME_BIN=docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh OUT=<thư mục chứa anh/> node docs/evidence/2026-09-29-adr-0049/kich-ban/bo-sung-ten-smoke.mjs
import { randomUUID } from "node:crypto";
import {
  ACCOUNTS, CHU, MOB, apiCalls, assert, axe, axeNote, boDem, click, dungDuLieuDieuPhoi, dungMoiTruong, noCode, noOverflowX, shotFull, shotView, sleep, txt, vnDate, LOC_BEN_TAU,
} from "./dp-lib.mjs";

const vnGioSau = (phut) => new Date(Date.now() + 7 * 3600e3 + phut * 60e3).toISOString().slice(11, 16);
if (vnGioSau(270) < vnGioSau(0)) throw new Error("Kịch bản dựng chuyến HÔM NAY (bây giờ + 2 giờ 30 tới + 4 giờ 30) — chạy trước 19:00 giờ VN.");

const { env, call } = await dungMoiTruong([CHU]);
const b = boDem("BO SUNG TEN SMOKE");
const d = await dungDuLieuDieuPhoi(env, call);
const dung = (r, ma, viec) => assert.equal(r.status, ma, `${viec}: ${r.status} ${r.text}`);
const HOM_NAY = vnDate(0);
// Mốc về 60 phút (dữ liệu dựng để mốc 48 giờ) — đơn đón sau 3 giờ xác nhận được, xếp được không phá lệ.
dung(await call(CHU, "POST", "/api/van-chuyen/chinh-sach-dieu-phoi", { minLeadMinutes: 60, warnLeadMinutes: 30, restMinutes: 30, requireManifest: true, proxyBackdateMaxMinutes: 180, dutyDayMaxMinutes: 480, tripNoBreakMaxMinutes: 240, departureWindowMinutes: 2880, refuseLeadMinutes: 720, officePhone: null, acceptWaitMinutes: 10, autoConfirmTransfer: true }), 201, "mốc 60 phút");
const o = await call(ACCOUNTS.salesA, "POST", "/api/orders", {
  customerName: "Khách Bổ Sung", customerPhone: "0903 100 297", customerEmail: "", customerNote: "", discount: 0, depositAmount: 0, depositMethod: null, paymentNote: "",
  services: [{
    kind: "catalog", catalogCode: "TD101", pax: { adult: 2, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: 1350000 },
    departTime: "", pickupTime: "", pickupPlace: "", checkinDate: "", checkinTime: "", checkinPlace: "", note: "", departDate: HOM_NAY,
    legs: [{ direction: "OUT", pickupDate: HOM_NAY, pickupTime: vnGioSau(180), pickupLocationId: null, pickupPlace: "Sheraton Nha Trang", dropoffLocationId: LOC_BEN_TAU, dropoffPlace: "" }],
  }],
  passengers: [{ fullName: "Hành Khách Đủ Tên", birthYear: 1985, paxCode: null }],
});
dung(o, 201, "lập đơn một tên / hai khách");
const don = (await call(ACCOUNTS.admin, "POST", `/api/orders/${o.json.order.id}/status`, { status: "confirmed" })).json.order;
const t = await call(ACCOUNTS.admin, "POST", "/api/van-chuyen/chuyen", { requestId: randomUUID(), xeId: d.XE_B.id, taiXePartyId: d.CUONG.partyId, batDau: { ngay: HOM_NAY, gio: vnGioSau(150) }, ketThuc: { ngay: HOM_NAY, gio: vnGioSau(270) } });
dung(t, 201, "tạo chuyến hôm nay");
const T = t.json.chuyen;
dung(await call(ACCOUNTS.admin, "POST", `/api/van-chuyen/chuyen/${T.id}/phan-bo`, { version: T.version, requestId: randomUUID(), chang: [{ legId: don.services[0].legs[0].id, soSuat: 2 }] }), 200, "xếp hai suất");
const posts = (p) => apiCalls(p).filter((r) => r.method === "POST" && r.path.endsWith("/hanh-khach"));

try {
  const p = await env.as(d.CUONG.account, `/cuoc-chuyen?id=${T.id}`, MOB);
  await b.step("1", `6.3 390 tài xế (chuyến hôm nay, chưa xuất bến): "Suất của khách" + "Thiếu tên 1"; hai dòng "Suất N · Điểm 1 · Sheraton Nha Trang" (Đã có tên / Chưa có tên), KHÔNG tên khách; link "Bổ sung tên" chỉ ở dòng chưa tên${axeNote()}`, async () => {
    await p.waitFor(`!!document.querySelector('.dp-suat-khach')`, "khối suất của khách", 12000);
    assert.equal(await p.ev(txt(".dp-suat-khach .dp-card-head")), "Suất của khách Thiếu tên 1");
    const dong = await p.ev(`[...document.querySelectorAll('.dp-suat-khach .dp-kc')].map((x) => x.innerText.replace(/\\s+/g, ' ').trim())`);
    assert.equal(dong.length, 2, JSON.stringify(dong));
    assert.ok(dong.every((x) => /^Suất [12] · Điểm 1 · Sheraton Nha Trang (Đã có tên|Chưa có tên( Bổ sung tên)?)$/.test(x)), JSON.stringify(dong));
    assert.equal(await p.ev(`document.querySelectorAll('.dp-suat-khach [data-action="bo-sung-ten"]').length`), 1);
    assert.equal(await p.ev(`document.querySelector('.dp-suat-khach').innerText.includes('Hành Khách Đủ Tên')`), false, "khối không hiện tên");
    // Nợ L4 (dot5-tang3): tài xế công ty trong ngày chạy — dòng điều kiện thiếu tên chỉ chỗ tự bổ sung, không chỉ "(văn phòng lo)".
    const dk = await p.ev(`[...document.querySelectorAll('.dp-cond-nhan')].map((x) => x.innerText.trim())`);
    assert.ok(dk.some((x) => /^Chưa đủ tên khách.* \(bấm Bổ sung tên ở khối Suất của khách, hoặc văn phòng lo\)$/.test(x)), JSON.stringify(dk));
    assert.equal(await p.ev(noCode), "");
    assert.ok(await p.ev(noOverflowX));
    await axe(p, "Suất của khách 390");
    await shotFull(p, "d5-bo-sung-ten-khoi-dien-thoai.png");
  });

  await b.step("2", `6.4 "Bổ sung tên — Suất N": câu "Nhập tên cho khách chưa có tên trong đơn.", ô ≥ 16px; Lưu khi trống → câu lỗi tại chỗ, không gửi${axeNote()}`, async () => {
    await p.ev(click('[data-action="bo-sung-ten"]'));
    await p.waitFor(`!!document.querySelector('[data-action="bo-sung-ten-luu"]')`, "hộp bổ sung tên");
    await sleep(500);
    assert.match(await p.ev(txt(".sheet-title")), /^Bổ sung tên — Suất [12]$/);
    assert.ok((await p.ev(txt(".sheet-body"))).includes("Nhập tên cho khách chưa có tên trong đơn."));
    // Token --fs-field "≥ 16px nên iOS không tự phóng to" (web/CLAUDE.md "Ô gõ 16px").
    for (const sel of ["#cc-bs-ten", "#cc-bs-nam"]) assert.ok(parseFloat(await p.ev(`getComputedStyle(document.querySelector(${JSON.stringify(sel)})).fontSize`)) >= 16, `${sel} ≥ 16px`);
    await p.ev(click('[data-action="bo-sung-ten-luu"]'));
    await sleep(300);
    assert.equal(await p.ev(txt(".sheet .vc-field-error")), "Nhập họ tên và năm sinh (4 chữ số).");
    assert.deepEqual(posts(p), []);
    await axe(p, "Hộp bổ sung tên 390");
    await shotView(p, "d5-bo-sung-ten-hop-dien-thoai.png");
  });

  await b.step("3", `Nhập "Hành Khách Bổ Sung" / 1992 → Lưu → gửi ĐÚNG { suatId, fullName, birthYear, paxCode: null, requestId } → "Đã bổ sung tên khách"; khối ẩn (đủ tên); điều kiện "thiếu tên" không còn${axeNote()}`, async () => {
    await p.ev(`(() => { const set = (s, v) => { const el = document.querySelector(s); el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); }; set('#cc-bs-ten', 'Hành Khách Bổ Sung'); set('#cc-bs-nam', '1992'); })()`);
    await p.ev(click('[data-action="bo-sung-ten-luu"]'));
    await p.waitFor(`!document.querySelector('.sheet') && [...document.querySelectorAll('.banner-title')].some((x) => x.innerText === 'Đã bổ sung tên khách')`, "đã lưu", 8000);
    const body = JSON.parse(posts(p).at(-1).body);
    assert.deepEqual(Object.keys(body).sort(), ["birthYear", "fullName", "paxCode", "requestId", "suatId"]);
    assert.deepEqual([body.fullName, body.birthYear, body.paxCode], ["Hành Khách Bổ Sung", 1992, null]);
    assert.equal(await p.ev(`!!document.querySelector('.dp-suat-khach')`), false, "đủ tên → khối ẩn");
    assert.equal(await p.ev(`[...document.querySelectorAll('.dp-cond-nhan')].some((x) => /tên/.test(x.innerText))`), false, "điều kiện thiếu tên đã hết");
    assert.ok(await p.ev(noOverflowX));
    await axe(p, "Sau bổ sung tên 390");
    await shotFull(p, "d5-bo-sung-ten-xong-dien-thoai.png");
  });
  await p.close();

  await b.step("4", "không lỗi console", async () => {
    assert.deepEqual(p.consoleErrors, []);
  });
} finally {
  b.xong();
  await env.stop();
}
