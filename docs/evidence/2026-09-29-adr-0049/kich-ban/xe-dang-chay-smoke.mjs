// Vận chuyển Đợt 5 "Xe đang chạy" (ADR-0052 D5; bản vẽ docs/design/van-chuyen-dot-3-7/Điều phối xe đang chạy.dc.html — V11 bảng 11.1–11.6, V6 bổ sung 6.1, 6.2):
// trang /xe-dang-chay, khối "Việc của văn phòng" + "Khách đang chờ" ở Chi tiết chuyến đang chạy, hộp "Báo huỷ một suất", form "Thêm điểm đón / thêm khách"
// (ADR-0104 Đ1: Bán hàng và Quản trị đều qua hộp "Điều chỉnh khẩn cấp" — Bán hàng mở rồi đóng), "Cập nhật điểm theo đơn" khi xe chạy, Kế toán chỉ xem, màn tài xế: dải "Văn phòng vừa thêm điểm" + chip.
// Chạy từ GỐC repo, sau `npm run build:web` (không cần mạng ngoài):
//   AXE_JS=<…/axe.min.js> CHROME_BIN=docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh OUT=<thư mục ảnh> node docs/evidence/2026-09-29-adr-0049/kich-ban/xe-dang-chay-smoke.mjs
// Kho cookie của Chrome dùng CHUNG: Bán hàng → Quản trị → Kế toán → Tài xế (trang mở sau cùng là của tài xế).
import { randomUUID } from "node:crypto";
import {
  ACCOUNTS, CHU, DESK, MOB, apiCalls, assert, axe, axeNote, boDem, click, dungDuLieuDieuPhoi, dungMoiTruong, noCode, noOverflowX, shotFull, shotView, sleep, txt, vcSub, LOC_BEN_TAU,
} from "./dp-lib.mjs";

const { env, call } = await dungMoiTruong([CHU]);
const b = boDem("XE DANG CHAY SMOKE");
const d = await dungDuLieuDieuPhoi(env, call);
const dung = (r, ma, viec) => assert.equal(r.status, ma, `${viec}: ${r.status} ${r.text}`);
// Chuyến chạy: T4 (NGÀY MAI 10:00–11:30, An, 79A-111.11) + O4 (2 khách có tên) xếp bằng phá lệ (đã trong mốc 48 giờ), rồi văn phòng xuất bến thay (sớm) —
// trang Xe đang chạy đọc hôm qua / hôm nay / ngày mai. Mốc trả về 6 giờ để xác nhận được O6 (ngày mai 10:40 ngoài mốc 6 giờ, KHÔNG đặt gấp); xe đang chạy vẫn
// luôn trong mốc ⇒ thêm khách không đặt gấp là điều chỉnh khẩn cấp (ADR-0104 Đ1 — trước đây Bán hàng thấy dòng khoá, Quản trị qua hộp Phá lệ).
dung(await call(ACCOUNTS.admin, "POST", `/api/van-chuyen/chuyen/${d.T4.id}/phan-bo`, { version: d.T4.version, requestId: randomUUID(), chang: [{ legId: d.O4.legId, soSuat: 2 }], phaLe: { lyDo: "PHA_LE_SU_CO" } }), 200, "xếp O4 vào T4");
dung(await call(CHU, "POST", "/api/van-chuyen/chinh-sach-dieu-phoi", { minLeadMinutes: 360, warnLeadMinutes: 120, restMinutes: 30, requireManifest: true, proxyBackdateMaxMinutes: 180, dutyDayMaxMinutes: 480, tripNoBreakMaxMinutes: 240, departureWindowMinutes: 2880 }), 201, "mốc 6 giờ");
const T = d.T4;
const o6 = await call(ACCOUNTS.salesA, "POST", "/api/orders", {
  customerName: "Khách Xe Chạy", customerPhone: "0903 100 296", customerEmail: "", customerNote: "", discount: 0, depositAmount: 0, depositMethod: null, paymentNote: "",
  services: [{
    kind: "catalog", catalogCode: "TD101", pax: { adult: 2, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: 1350000 },
    departTime: "", pickupTime: "", pickupPlace: "", checkinDate: "", checkinTime: "", checkinPlace: "", note: "", departDate: d.NGAY_KHOA,
    legs: [{ direction: "OUT", pickupDate: d.NGAY_KHOA, pickupTime: "10:40", pickupLocationId: null, pickupPlace: "Vinpearl Condotel", dropoffLocationId: LOC_BEN_TAU, dropoffPlace: "" }],
  }],
  passengers: [{ fullName: "Hành Khách Chạy 1", birthYear: 1991, paxCode: null }, { fullName: "Hành Khách Chạy 2", birthYear: 1992, paxCode: null }],
});
dung(o6, 201, "lập đơn O6");
const O6 = (await call(ACCOUNTS.admin, "POST", `/api/orders/${o6.json.order.id}/status`, { status: "confirmed" })).json.order;
const O6_MA = O6.orderCode;
dung(await call(ACCOUNTS.admin, "POST", `/api/van-chuyen/chuyen/${T.id}/xuat-ben`, { requestId: randomUUID() }), 200, "xuất bến T4");
await sleep(1200);

const posts = (p, duoi) => apiCalls(p).filter((r) => r.method === "POST" && r.path.endsWith(duoi));
const moChuyen = (p) => p.waitFor(`!!document.querySelector('.dp-run') && !!document.querySelector('.dp-khach-cho-the')`, "chuyến đang chạy dựng xong", 12000);

try {
  // ---- Bán hàng (máy tính) -------------------------------------------------------------------------------------------------------------------------------------
  const s = await env.as(ACCOUNTS.salesA, "/xe-dang-chay", DESK);
  await b.step("1", `11.1 1040 Bán hàng: trang Xe đang chạy — một thẻ T4 "mã · Đang chạy · 79A-111.11 · 2/15 chỗ", tài xế, điểm kế tiếp; mục con "Xe đang chạy" sáng${axeNote()}`, async () => {
    await s.waitFor(`document.querySelectorAll('.xdc-the').length === 1`, "thẻ xe đang chạy", 12000);
    const t = await s.ev(txt(".xdc-the"));
    assert.match(t, new RegExp(`^${T.ma} Đang chạy 79A-111\\.11 · 2/15 chỗ Nguyễn Văn An · xuất bến \\d\\d:\\d\\d · tiếp theo: Citadines Bayfront$`));
    assert.equal(await s.ev(`document.querySelector('.xdc-the').getAttribute('href')`), `/chuyen?id=${T.id}`);
    const sub = await s.ev(vcSub);
    assert.ok(sub.items.includes("Xe đang chạy"), JSON.stringify(sub));
    assert.equal(sub.current, "Xe đang chạy");
    assert.equal(await s.ev(noCode), "");
    assert.ok(await s.ev(noOverflowX));
    await axe(s, "Xe đang chạy 1040");
    await shotView(s, "d5-xe-dang-chay-may-tinh.png");
  });

  await b.step("2", `11.2 + 11.3 1040 Bán hàng mở T4: "Việc của văn phòng" (Thêm điểm đón / thêm khách, Cập nhật điểm theo đơn, Cứu hộ), "Khách đang chờ" 2 dòng có "Báo huỷ"${axeNote()}`, async () => {
    await s.ev(click(".xdc-the"));
    await moChuyen(s);
    // A-1b (cứu hộ đơn giản): nút "Cứu hộ" ở cuối khối — kịch bản riêng cuu-ho-smoke.mjs kiểm hộp + khối CH.2.
    assert.deepEqual(await s.ev(`[...document.querySelectorAll('.dp-viec-vp button')].map((x) => x.innerText.trim())`), ["Thêm điểm đón / thêm khách", "Cập nhật điểm theo đơn", "Cứu hộ"]);
    assert.equal(await s.ev(`document.querySelectorAll('.dp-kc').length`), 2);
    assert.equal(await s.ev(`document.querySelectorAll('.dp-kc [data-action="bao-huy"]').length`), 2);
    assert.match(await s.ev(txt(".dp-kc")), /^Hành Khách Thử 5-1 TD-\d{8}-\d{4} · Điểm 1 · Citadines Bayfront · 10:00 Báo huỷ$/);
    assert.equal(await s.ev(noCode), "");
    await axe(s, "Chi tiết chuyến đang chạy 1040");
    await shotFull(s, "d5-chuyen-dang-chay-ban-hang-may-tinh.png");
  });

  // ADR-0104 Đ1 (NỚI có tên, 2026-10-08): xe đang chạy luôn dưới mốc ⇒ thêm khách không đặt gấp = điều chỉnh khẩn cấp — Bán hàng có ô trip.urgent_adjust:
  // KHÔNG dòng khoá, nút gửi mở; máy chủ 409 lớp KHAN_CAP → hộp "Điều chỉnh khẩn cấp" (Bán hàng mở rồi đóng — không gửi kèm lý do; Quản trị thêm thật ở bước 5).
  await b.step("3", `11.4 Bán hàng "Thêm điểm đón / thêm khách": chọn chặng ${O6_MA} → điểm đón chỉ đọc, số khách 2; chặng không đặt gấp → KHÔNG dòng khoá (ADR-0104 Đ1); gửi → hộp "Điều chỉnh khẩn cấp" ("Điều chỉnh khẩn cấp và thêm"); đóng, không gửi kèm lý do${axeNote()}`, async () => {
    await s.ev(click('[data-action="them-diem"]'));
    await s.waitFor(`!!document.querySelector('.dp-sheet-them-diem')`, "bảng thêm điểm");
    await sleep(500);
    assert.equal(await s.ev(txt(".sheet-title")), "Thêm điểm đón / thêm khách");
    const ds = await s.ev(`[...document.querySelectorAll('.dp-sheet-them-diem .vc-reason')].map((x) => x.innerText.replace(/\\s+/g, ' ').trim())`);
    assert.ok(ds.some((x) => x.startsWith(`${O6_MA} · `) && x.includes("10:40 · còn 2 người")), JSON.stringify(ds));
    await s.ev(`[...document.querySelectorAll('.dp-sheet-them-diem .vc-reason')].find((x) => x.innerText.includes(${JSON.stringify(O6_MA)})).click()`);
    await sleep(300);
    assert.equal(await s.ev(txt(".dp-them-noi")), "Vinpearl Condotel · 10:40");
    assert.equal(await s.ev(`document.querySelector('.dp-sheet-them-diem .counter-field').value`), "2");
    assert.equal(await s.ev(`getComputedStyle(document.querySelector('.dp-sheet-them-diem .counter-field')).fontSize`), "16px");
    assert.equal(await s.ev(`document.querySelector('.dp-them-khoa').hidden`), true, "Bán hàng: không dòng khoá");
    assert.equal(await s.ev(`document.querySelector('[data-action="them-diem-gui"]').disabled`), false);
    await axe(s, "Thêm điểm 1040");
    await shotView(s, "d5-them-diem-ban-hang-may-tinh.png");
    await s.ev(click('[data-action="them-diem-gui"]'));
    await s.waitFor(`!!document.querySelector('[data-action="pha-le-gui"]')`, "hộp điều chỉnh khẩn cấp", 8000);
    await sleep(500);
    assert.equal(await s.ev(txt('[data-action="pha-le-gui"]')), "Điều chỉnh khẩn cấp và thêm");
    assert.equal(await s.ev(txt(".dp-sheet-pha-le .sheet-title")), "Điều chỉnh khẩn cấp");
    await shotView(s, "d5-them-diem-khan-cap-ban-hang-may-tinh.png");
    await s.ev(`[...document.querySelectorAll('.dp-sheet-pha-le button')].find((x) => x.innerText.trim() === 'Đóng').click()`);
    await s.waitFor(`!document.querySelector('[data-action="pha-le-gui"]')`, "đóng hộp, không gửi");
    const gui = posts(s, "/them-diem").map((r) => JSON.parse(r.body));
    assert.equal(gui.length, 1, "một lệnh không kèm lý do (409)");
    assert.equal(gui[0].phaLe, undefined);
  });

  await b.step("4", `11.5 Bán hàng "Báo huỷ" dòng đầu: hộp 4 lý do + "Thẻ vẫn chiếm chỗ…", nút Báo huỷ khoá tới khi chọn; gửi { version, lyDo, requestId } → dòng có chip "Văn phòng đã báo huỷ" + "Vẫn chiếm chỗ…", hết link; điểm đón hiện "1/2 khách văn phòng đã báo huỷ — vẫn tới điểm"${axeNote()}`, async () => {
    await s.ev(click('.dp-kc [data-action="bao-huy"]'));
    await s.waitFor(`!!document.querySelector('[data-action="bao-huy-gui"]')`, "hộp báo huỷ");
    await sleep(500);
    assert.equal(await s.ev(txt(".sheet-title")), "Báo huỷ một suất");
    assert.equal(await s.ev(`document.querySelectorAll('.sheet .vc-reason').length`), 4);
    assert.ok((await s.ev(txt(".sheet-body"))).includes("Thẻ vẫn chiếm chỗ và hiện nhãn “Văn phòng đã báo huỷ” cho tài xế."));
    assert.equal(await s.ev(`document.querySelector('[data-action="bao-huy-gui"]').disabled`), true);
    await axe(s, "Báo huỷ 1040");
    await shotView(s, "d5-bao-huy-may-tinh.png");
    await s.ev(click(".sheet .vc-reason"));
    await s.ev(click('[data-action="bao-huy-gui"]'));
    await s.waitFor(`!document.querySelector('.sheet') && document.querySelectorAll('.dp-kc-bh').length === 1`, "đã báo huỷ");
    const body = JSON.parse(posts(s, "/bao-huy").at(-1).body);
    assert.deepEqual(Object.keys(body).sort(), ["lyDo", "requestId", "version"]);
    assert.match(await s.ev(txt(".dp-kc-bh")), /^Văn phòng đã báo huỷ Vẫn chiếm chỗ cho đến khi tài xế xác nhận · \d\d:\d\d( \d\d\/\d\d)? · .+$/);
    assert.equal(await s.ev(`document.querySelectorAll('.dp-kc [data-action="bao-huy"]').length`), 1);
    assert.ok((await s.ev(txt(".dp-run-chip"))).includes("1/2 khách văn phòng đã báo huỷ — vẫn tới điểm"));
    assert.match(await s.ev(txt(".banner")), /^Đã báo huỷ /);
    await shotFull(s, "d5-da-bao-huy-may-tinh.png");
  });
  await s.close();

  // ---- Quản trị (máy tính → điện thoại) --------------------------------------------------------------------------------------------------------------------------
  const q = await env.as(ACCOUNTS.admin, `/chuyen?id=${T.id}`, DESK);
  await b.step("5", `11.4 Quản trị thêm ${O6_MA} (2 khách) vào xe đang chạy: không dòng khoá; máy chủ đòi điều chỉnh khẩn cấp → hộp "Điều chỉnh khẩn cấp và thêm" (ADR-0104 Đ1) → gửi lại kèm phaLe → báo "Đã thêm 2 khách…", điểm mới có chip "Mới thêm"${axeNote()}`, async () => {
    await moChuyen(q);
    await q.ev(click('[data-action="them-diem"]'));
    await q.waitFor(`!!document.querySelector('.dp-sheet-them-diem')`, "bảng thêm điểm");
    await sleep(500);
    await q.ev(`[...document.querySelectorAll('.dp-sheet-them-diem .vc-reason')].find((x) => x.innerText.includes(${JSON.stringify(O6_MA)})).click()`);
    await sleep(300);
    assert.equal(await q.ev(`document.querySelector('.dp-them-khoa').hidden`), true);
    await q.ev(click('[data-action="them-diem-gui"]'));
    await q.waitFor(`!!document.querySelector('[data-action="pha-le-gui"]')`, "hộp phá lệ", 8000);
    await sleep(500);
    assert.equal(await q.ev(txt('[data-action="pha-le-gui"]')), "Điều chỉnh khẩn cấp và thêm");
    await shotView(q, "d5-them-diem-pha-le-may-tinh.png");
    await q.ev(click(".dp-sheet-pha-le .vc-reason"));
    await q.ev(click('[data-action="pha-le-gui"]'));
    await q.waitFor(`!document.querySelector('.sheet') && [...document.querySelectorAll('.dp-run-chip')].some((x) => x.innerText.includes('Mới thêm'))`, "điểm mới thêm", 8000);
    const gui = posts(q, "/them-diem").map((r) => JSON.parse(r.body));
    assert.equal(gui.length, 2);
    assert.equal(gui[0].phaLe, undefined);
    assert.ok(gui[1].phaLe?.lyDo, JSON.stringify(gui[1]));
    assert.deepEqual(gui[1].chang, [{ legId: O6.services[0].legs[0].id, soSuat: 2 }]);
    assert.match(await q.ev(txt(".banner")), new RegExp(`^Đã thêm 2 khách của ${O6_MA} vào ${T.ma} — tài xế nhận tin ngay\\.$`));
    assert.equal(await q.ev(`document.querySelectorAll('.dp-kc').length`), 4, "Khách đang chờ: 2 cũ + 2 mới");
    await axe(q, "Chuyến sau thêm điểm 1040");
    await shotFull(q, "d5-them-diem-xong-may-tinh.png");
  });

  await b.step("6", `11.6 O4 đổi nơi đón (đơn) → Quản trị "Cập nhật điểm theo đơn" trên xe đang chạy: "Đã cập nhật 1 · bỏ qua 0 khách đã lên xe / điểm đã tới" (khách đã báo huỷ không dời)`, async () => {
    // CHU (chưa mở trình duyệt): đăng nhập trình duyệt của Bán hàng / Quản trị đã thay phiên API của họ (sổ phiên một máy — ADR-0075).
    dung(await call(CHU, "PUT", `/api/orders/${d.O4.id}/legs/${d.O4.legId}`, {
      expectedUpdatedAt: d.O4.leg.updatedAt,
      leg: { pickupDate: d.NGAY_KHOA, pickupTime: "10:00", pickupLocationId: null, pickupPlace: "Citadines Bayfront cổng sau", dropoffLocationId: LOC_BEN_TAU, dropoffPlace: "" },
    }), 200, "đổi nơi đón O4");
    await q.send("Page.reload", {});
    await moChuyen(q);
    await q.ev(click('.dp-viec-vp [data-action="cap-nhat-diem"]'));
    await q.waitFor(`[...document.querySelectorAll('.banner-title')].some((x) => x.innerText.startsWith('Đã cập nhật'))`, "kết quả cập nhật điểm", 8000);
    assert.equal(await q.ev(txt(".banner-title")), "Đã cập nhật 1 · bỏ qua 0 khách đã lên xe / điểm đã tới");
    assert.equal(await q.ev(`document.querySelectorAll('.dp-kc-bh').length`), 1, "khách đã báo huỷ giữ nguyên");
    await shotFull(q, "d5-cap-nhat-diem-dang-chay-may-tinh.png");
  });

  await b.step("7", `390 Quản trị: Chi tiết chuyến đang chạy + trang Xe đang chạy không tràn ngang; mục "Xe đang chạy" ở trang Tôi${axeNote()}`, async () => {
    await q.send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
    await q.send("Page.reload", {});
    await moChuyen(q);
    assert.ok(await q.ev(noOverflowX));
    await axe(q, "Chi tiết chuyến đang chạy 390");
    await shotFull(q, "d5-chuyen-dang-chay-dien-thoai.png");
    await q.send("Page.navigate", { url: env.base + "/account" });
    await q.waitFor(`!!document.querySelector('#vc-links')`, "trang Tôi");
    const links = await q.ev(`[...document.querySelectorAll('#vc-links .row-link')].map((a) => [a.innerText.trim(), a.getAttribute('href')])`);
    const i = links.findIndex(([, h]) => h === "/dieu-phoi");
    assert.deepEqual(links[i + 1], ["Xe đang chạy", "/xe-dang-chay"], JSON.stringify(links));
    await q.ev(click('#vc-links a[href="/xe-dang-chay"]'));
    await q.waitFor(`location.pathname === '/xe-dang-chay' && document.querySelectorAll('.xdc-the').length === 1`, "Xe đang chạy 390");
    assert.ok(await q.ev(noOverflowX));
    await axe(q, "Xe đang chạy 390");
    await shotFull(q, "d5-xe-dang-chay-dien-thoai.png");
  });
  await q.close();

  // ---- Kế toán (chỉ xem) ---------------------------------------------------------------------------------------------------------------------------------------
  const k = await env.as(ACCOUNTS.accounting, `/chuyen?id=${T.id}`, DESK);
  await b.step("8", "Kế toán mở chuyến đang chạy: thấy Khách đang chờ (có chip báo huỷ), KHÔNG khối Việc của văn phòng, KHÔNG link Báo huỷ; trang Xe đang chạy mở được", async () => {
    await moChuyen(k);
    assert.equal(await k.ev(`document.querySelectorAll('.dp-viec-vp, [data-action="bao-huy"], [data-action="them-diem"]').length`), 0);
    assert.equal(await k.ev(`document.querySelectorAll('.dp-kc-bh').length`), 1);
    await k.send("Page.navigate", { url: env.base + "/xe-dang-chay" });
    await k.waitFor(`document.querySelectorAll('.xdc-the').length === 1`, "Xe đang chạy (Kế toán)");
    assert.equal(apiCalls(k).filter((r) => r.method === "POST").length, 0);
  });
  await k.close();

  // ---- Tài xế (điện thoại) — mở SAU CÙNG ----------------------------------------------------------------------------------------------------------------------
  const t = await env.as(d.AN.account, `/cuoc-chuyen?id=${T.id}`, MOB);
  await b.step("9", `6.1 + 6.2 390 tài xế: dải "Văn phòng vừa thêm điểm" — "Điểm N · Vinpearl Condotel · 10:40 · 2 khách." + "Đã nằm trong lộ trình của bạn."; chip "Mới thêm"; điểm cũ "Văn phòng đã báo huỷ — vẫn tới điểm"; "Đã xem" ẩn dải, tải lại vẫn ẩn${axeNote()}`, async () => {
    await t.waitFor(`!!document.querySelector('.dp-run') && [...document.querySelectorAll('.banner-title')].some((x) => x.innerText === 'Văn phòng vừa thêm điểm')`, "dải điểm mới", 12000);
    const dai = await t.ev(`[...document.querySelectorAll('.banner')].find((x) => x.querySelector('.banner-title').innerText === 'Văn phòng vừa thêm điểm').innerText.replace(/\\s+/g, ' ').trim()`);
    // Điểm mới do "Cập nhật điểm theo đơn" (bước 6) cũng mang cờ thêm-khi-chạy ⇒ cùng dải (6.5 chưa có dải riêng "Đổi điểm đón X → Y" — nợ ghi ở nhật ký).
    assert.match(dai, /^Văn phòng vừa thêm điểm Điểm \d+ · Vinpearl Condotel · 10:40 · 2 khách\. Điểm \d+ · Citadines Bayfront cổng sau · 10:00 · 1 khách\. Đã nằm trong lộ trình của bạn\. Đã xem$/);
    const chips = await t.ev(`[...document.querySelectorAll('.dp-run-chip')].map((x) => x.innerText.replace(/\\s+/g, ' ').trim())`);
    assert.ok(chips.includes("Mới thêm"), JSON.stringify(chips));
    // Sau bước 6, điểm cũ chỉ còn khách đã báo huỷ (khách kia dời sang "cổng sau") ⇒ câu đủ, không còn "1/2".
    assert.ok(chips.includes("Văn phòng đã báo huỷ — vẫn tới điểm"), JSON.stringify(chips));
    assert.equal(await t.ev(`[...document.querySelectorAll('.dp-khach .dp-chip-warn')].filter((x) => x.innerText === 'Văn phòng đã báo huỷ').length`), 1);
    assert.equal(await t.ev(noCode), "");
    assert.ok(await t.ev(noOverflowX));
    await axe(t, "Chuyến tài xế 390");
    await shotFull(t, "d5-tai-xe-diem-moi-dien-thoai.png");
    await t.ev(click('[data-action="da-xem-diem-moi"]'));
    await sleep(300);
    assert.equal(await t.ev(`[...document.querySelectorAll('.banner-title')].some((x) => x.innerText === 'Văn phòng vừa thêm điểm')`), false);
    await t.send("Page.reload", {});
    await t.waitFor(`!!document.querySelector('.dp-run')`, "tải lại");
    await sleep(500);
    assert.equal(await t.ev(`[...document.querySelectorAll('.banner-title')].some((x) => x.innerText === 'Văn phòng vừa thêm điểm')`), false, "máy nhớ đã xem");
  });
  await t.close();

  await b.step("10", "không lỗi console ở mọi trang đã mở", async () => {
    for (const pg of [s, q, k, t]) assert.deepEqual(pg.consoleErrors, []);
  });
} finally {
  b.xong();
  await env.stop();
}
