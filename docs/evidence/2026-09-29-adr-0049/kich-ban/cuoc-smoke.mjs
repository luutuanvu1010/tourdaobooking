// B4–B6 + bấm thay (A15): Cuốc của tôi (/cuoc — V5, trang mở đầu của tài xế công ty, Q5), một chuyến của tài xế (/cuoc-chuyen — V6 Chuyến đang chạy, V7 Xuất
// bến), văn phòng bấm thay ở Chi tiết chuyến (/chuyen — thành phần A "xảy ra lúc"). ADR-0049 D3, ADR-0050 VK1-A; bản vẽ docs/design/van-chuyen-dieu-phoi/
// project/04, 05 (5a, 5b, 5c), 06 (6b, 6c, 6d); bản đối chiếu 2.5, H15; ruling R-P11, R-P14, R-P17; lệnh điều phối vòng 3 (mất mạng: "Chưa gửi được — bấm
// lại", CÙNG requestId, không tự gửi lại).
// Chạy từ GỐC repo, sau `npm run build:web` (không cần mạng ngoài):
//   AXE_JS=<…/axe.min.js> CHROME_BIN=docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh OUT=<thư mục ảnh> node docs/evidence/2026-09-29-adr-0049/kich-ban/cuoc-smoke.mjs
// Kho cookie của Chrome dùng CHUNG: Tài xế → Bán hàng → Kế toán (trang mở sau cùng là của Kế toán).
import { randomUUID } from "node:crypto";
import {
  ACCOUNTS, CHU, DESK, MOB, apiCalls, assert, axe, axeNote, boDem, click, dungDuLieuDieuPhoi, dungMoiTruong, noCode, noOverflowX, shotFull, shotView, shown, sleep, txt,
  typeInto, LOC_BEN_TAU, vnDate, fetchTrang,
} from "./dp-lib.mjs";

// Task 8 Đợt 1 — người đi kèm: hướng dẫn viên (FIELD) giả; tên hiện ở màn tài xế, SĐT thì không.
const HDV = { name: "Hướng Dẫn Đi Kèm", phone: "0900000432", pin: "246432", permissions: ["FIELD"] };
const { env, call } = await dungMoiTruong([CHU, HDV]);
const b = boDem("CUOC SMOKE");
const d = await dungDuLieuDieuPhoi(env, call);
const AN = d.AN.account;
// Ngày mai của An: T4 (10:00, xe đủ giấy) có O4 (2 khách) — xếp bằng phá lệ vì đã trong mốc 48 giờ; T6 (14:00, xe 79A-222.22 THIẾU Bảo hiểm) trống.
const x4 = await call(ACCOUNTS.admin, "POST", `/api/van-chuyen/chuyen/${d.T4.id}/phan-bo`, { version: d.T4.version, requestId: randomUUID(), chang: [{ legId: d.O4.legId, soSuat: 2 }], phaLe: { lyDo: "PHA_LE_SU_CO" } });
assert.equal(x4.status, 200, x4.text);
// Gắn hướng dẫn viên đi kèm T4 bằng route thật (Quản trị, phá lệ vì T4 trong vùng khoá) — màn tài xế phải hiện tên, không SĐT.
const dsHdv = await call(ACCOUNTS.admin, "GET", "/api/van-chuyen/huong-dan-vien");
assert.equal(dsHdv.status, 200, dsHdv.text);
const hdvParty = dsHdv.json.nguoi.find((x) => x.ten === HDV.name);
assert.ok(hdvParty, `danh sách hướng dẫn viên có ${HDV.name}: ${dsHdv.text}`);
const v4 = await call(ACCOUNTS.admin, "GET", `/api/van-chuyen/chuyen/${d.T4.id}`);
const xk = await call(ACCOUNTS.admin, "POST", `/api/van-chuyen/chuyen/${d.T4.id}/phan-bo`, { version: v4.json.chuyen.version, requestId: randomUUID(), nguoiDiKem: [hdvParty.partyId], phaLe: { lyDo: "PHA_LE_SU_CO" } });
assert.equal(xk.status, 200, xk.text);
// Cùng HDV đi kèm T1 (chuyến của An mà văn phòng xuất bến thay ở bước 7): bước 8b kiểm văn phòng bấm thay "Đã lên xe" → "Đã xuống".
const v1 = await call(ACCOUNTS.admin, "GET", `/api/van-chuyen/chuyen/${d.T1.id}`);
const xk1 = await call(ACCOUNTS.admin, "POST", `/api/van-chuyen/chuyen/${d.T1.id}/phan-bo`, { version: v1.json.chuyen.version, requestId: randomUUID(), nguoiDiKem: [hdvParty.partyId], phaLe: { lyDo: "PHA_LE_SU_CO" } });
assert.equal(xk1.status, 200, xk1.text);
const t6 = await call(ACCOUNTS.admin, "POST", "/api/van-chuyen/chuyen", { requestId: randomUUID(), xeId: d.XE_B.id, taiXePartyId: d.AN.partyId, batDau: { ngay: d.NGAY_KHOA, gio: "14:00" }, ketThuc: { ngay: d.NGAY_KHOA, gio: "15:00" } });
assert.equal(t6.status, 201, t6.text);
const T6 = t6.json.chuyen;
const TEN_O4 = ["Hành Khách Thử 5-1", "Hành Khách Thử 5-2"];
const SDT_O4 = "0903 100 205";
// Q-L3-B (ADR-0053 D7.2): tên / liên hệ khách chỉ hiện TRONG ngày chạy — T4 (ngày mai) bấm Xuất bến hôm nay là xuất bến SỚM → màn hiện "Khách N", không
// liên hệ. Phía "có tên" dùng chuyến TH HÔM NAY (23:00–23:50, đơn OH đón 23:10) — dựng bằng route thật SAU bước 1 (bước 1 kỳ vọng "Hôm nay" trống): mốc đang
// 48 giờ nên Quản trị đóng dấu "đặt gấp" lên chặng rồi mới xác nhận, xếp (ĐP2(ii): xếp chính chặng đặt gấp thì qua) — không chèn SQL, không phá lệ.
// TH do CƯỜNG lái trên xe riêng 79A-444.44 (thêm bằng route thật): An vừa kết thúc T4 (ngày mai) ở bước 3 nên lái TH ngay bị chặn "Chưa đủ thời gian
// nghỉ sau chuyến trước" (đúng luật — không chờ 30 phút). Kho cookie dùng CHUNG: đóng trang của An rồi mới mở trang của Cường (bước 3b–6).
const TEN_OH = ["Hành Khách Hôm Nay 1", "Hành Khách Hôm Nay 2"];
const SDT_OH = "0903 100 299";
const LIEN_HE_OH = "Khách Điều Phối Hôm Nay";
const dungChuyenHomNay = async () => {
  const gioVn = new Date(Date.now() + 7 * 3600_000).toISOString().slice(11, 16);
  assert.ok(gioVn < "22:50", `kịch bản cần chạy trước 22:50 giờ VN (chuyến hôm nay 23:00) — bây giờ ${gioVn}`);
  const homNay = vnDate(0);
  const o = await call(ACCOUNTS.salesA, "POST", "/api/orders", {
    customerName: LIEN_HE_OH, customerPhone: SDT_OH, customerEmail: "", customerNote: "", discount: 0, depositAmount: 0, depositMethod: null, paymentNote: "",
    services: [{
      kind: "catalog", catalogCode: "TD101", pax: { adult: 2, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: 1350000 },
      departTime: "", pickupTime: "", pickupPlace: "", checkinDate: "", checkinTime: "", checkinPlace: "", note: "", departDate: homNay,
      legs: [{ direction: "OUT", pickupDate: homNay, pickupTime: "23:10", pickupLocationId: null, pickupPlace: "InterContinental Nha Trang", dropoffLocationId: LOC_BEN_TAU, dropoffPlace: "" }],
    }],
    passengers: TEN_OH.map((fullName, i) => ({ fullName, birthYear: 1990 + i, paxCode: null })),
  });
  assert.equal(o.status, 201, `lập đơn hôm nay: ${o.text}`);
  const legId = o.json.order.services[0].legs[0].id;
  const g = await call(ACCOUNTS.admin, "POST", `/api/orders/${o.json.order.id}/legs/${legId}/short-notice`, { lyDo: "KHACH_DOAN_GOI_GAP" });
  assert.equal(g.status, 200, `đặt gấp: ${g.text}`);
  const c = await call(ACCOUNTS.admin, "POST", `/api/orders/${o.json.order.id}/status`, { status: "confirmed" });
  assert.equal(c.status, 200, `xác nhận đơn hôm nay: ${c.text}`);
  const v = await call(ACCOUNTS.admin, "POST", "/api/van-chuyen/xe", { plateNumber: "79A-444.44", chassisNumber: "DP7944444", name: "Xe thử 79A-444.44", passengerCapacity: 15 });
  assert.equal(v.status, 201, `thêm xe hôm nay: ${v.text}`);
  for (const typeCode of ["INSPECTION", "TPL_INSURANCE"]) {
    const gt = await call(ACCOUNTS.admin, "POST", `/api/van-chuyen/xe/${v.json.vehicle.id}/giay-to`, { typeCode, number: `${typeCode}-79A-444.44`, expiryDate: vnDate(300) });
    assert.equal(gt.status, 201, `giấy ${typeCode} xe hôm nay: ${gt.text}`);
  }
  const t = await call(ACCOUNTS.admin, "POST", "/api/van-chuyen/chuyen", { requestId: randomUUID(), xeId: v.json.vehicle.id, taiXePartyId: d.CUONG.partyId, batDau: { ngay: homNay, gio: "23:00" }, ketThuc: { ngay: homNay, gio: "23:50" } });
  assert.equal(t.status, 201, `tạo chuyến hôm nay: ${t.text}`);
  const x = await call(ACCOUNTS.admin, "POST", `/api/van-chuyen/chuyen/${t.json.chuyen.id}/phan-bo`, { version: t.json.chuyen.version, requestId: randomUUID(), chang: [{ legId, soSuat: 2 }] });
  assert.equal(x.status, 200, `xếp chặng đặt gấp vào chuyến hôm nay: ${x.text}`);
  return x.json.chuyen;
};
let TH = null;

const tt = (p) => p.ev(`[...document.querySelectorAll('#tabbar a')].filter((a) => a.getClientRects().length).map((a) => [a.getAttribute('href'), a.innerText.trim(), a.getAttribute('aria-current')])`);
const html = (p) => p.ev(`document.querySelector('main').innerHTML`);
// Nút CUỐI của trang không bị thanh tab che (điều phối vòng 5): cuộn tới đáy, `elementFromPoint` ở tâm nút phải trúng chính nút.
// Khung phải đúng 844 cao (kiểm TRƯỚC khi chụp cả trang). Dữ liệu thử ngắn (trang không cuộn) nên chèn tạm một khối 1200px ĐẦU <main> để nút cuối
// nằm ở đáy trang dài — đo đúng khoảng đệm đáy dành cho thanh tab, rồi gỡ khối.
const khongBiChe = (sel) => `(() => { if (window.innerHeight > 900) return 'khung cao ' + window.innerHeight; const dem = document.createElement('div'); dem.style.height = '1200px'; document.querySelector('main').prepend(dem); try { window.scrollTo(0, document.documentElement.scrollHeight); const el = [...document.querySelectorAll(${JSON.stringify(sel)})].filter((x) => x.getClientRects().length).at(-1); if (!el) return 'không thấy'; const r = el.getBoundingClientRect(); const t = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); if (!t) return 'ngoài khung'; return el === t || el.contains(t) ? 'ok' : t.closest('#tabbar') ? 'thanh tab che' : t.tagName + '.' + t.className; } finally { dem.remove(); window.scrollTo(0, 0); } })()`;
const posts = (p, duoi) => apiCalls(p).filter((r) => r.method === "POST" && r.path.endsWith(duoi));

try {
  // ---- Tài xế (điện thoại) -----------------------------------------------------------------------------------------------------------------------------------
  let p = await env.as(AN, "/", MOB);
  await b.step("1", `4a 390 tài xế mở "/" → /cuoc: "Hôm nay" (trống) + "Ngày mai" (2 chuyến theo giờ) + "Ngày kia" (trống — góp ý T3); chuyến thiếu giấy xe "Bị giữ" + "(văn phòng lo)"; KHÔNG tên / SĐT khách; ba tab${axeNote()}`, async () => {
    await p.waitFor(`location.pathname === '/cuoc' && document.querySelectorAll('.dp-cuoc-day').length === 3`, "Cuốc của tôi dựng xong", 12000);
    const g = await p.ev(`[...document.querySelectorAll('.dp-cuoc-day')].map((x) => ({ t: x.querySelector('.dp-cuoc-day-title').innerText, n: x.querySelectorAll('.dp-cuoc-the').length, trong: x.querySelector('.dp-cuoc-trong')?.innerText ?? null }))`);
    assert.deepEqual(g, [{ t: "Hôm nay", n: 0, trong: "Không có cuốc nào." }, { t: "Ngày mai", n: 2, trong: null }, { t: "Ngày kia", n: 0, trong: "Không có cuốc nào." }]);
    const the = await p.ev(`[...document.querySelectorAll('.dp-cuoc-the')].map((x) => ({ href: x.getAttribute('href'), text: x.innerText.replace(/\\s+/g, ' ').trim() }))`);
    assert.equal(the[0].href, `/cuoc-chuyen?id=${d.T4.id}`);
    assert.match(the[0].text, new RegExp(`^10:00 ${d.T4.ma} Đã lên kế hoạch 79A-111\\.11 · 2 khách · 1 điểm đón · 1 điểm trả$`));
    assert.match(the[1].text, new RegExp(`^14:00 ${T6.ma} Bị giữ 79A-222\\.22 · 0 khách · 0 điểm đón · 0 điểm trả .*\\(văn phòng lo\\)`));
    const h = await html(p);
    for (const x of [...TEN_O4, SDT_O4]) assert.ok(!h.includes(x), `không tên / SĐT khách ở Cuốc của tôi: ${x}`);
    assert.deepEqual(await tt(p), [["/tai-xe", "Trang chủ", null], ["/cuoc", "Cuốc của tôi", "page"], ["/account", "Tôi", null]]);
    assert.deepEqual(apiCalls(p).filter((r) => r.path.startsWith("/api/van-chuyen") && !r.path.startsWith("/api/van-chuyen/cuoc-cua-toi")), [], "chỉ route tài xế");
    assert.equal(await p.ev(noCode), "");
    assert.ok(await p.ev(noOverflowX));
    await axe(p, "Cuốc của tôi 390");
    assert.equal(await p.ev(khongBiChe(".dp-cuoc-the")), "ok", "390: thẻ cuối không bị thanh tab che");
    await shotFull(p, "b4-cuoc-cua-toi-dien-thoai.png");
  });
  // Chuyến HÔM NAY cho phía "có tên" của Q-L3-B — dựng SAU bước 1 (bước 1 kỳ vọng "Hôm nay" trống).
  TH = await dungChuyenHomNay();

  await b.step("2", `6b 390 chuyến bị giữ: CHỈ điều kiện còn thiếu "(văn phòng lo)", không hạn giấy tờ; "Xuất bến" khoá + "Chưa xuất bến được — văn phòng đang lo."`, async () => {
    await p.ev(click(`.dp-cuoc-the[data-chuyen="${T6.id}"]`));
    await p.waitFor(`location.pathname === '/cuoc-chuyen' && !!document.querySelector('[data-action="xuat-ben"]')`, "màn xuất bến");
    const dk = await p.ev(`[...document.querySelectorAll('.dp-cond')].map((x) => x.innerText.replace(/\\s+/g, ' ').trim())`);
    assert.ok(dk.length >= 1 && dk.every((x) => x.endsWith("(văn phòng lo)")), JSON.stringify(dk));
    assert.ok(dk.some((x) => x.includes("79A-222.22")), JSON.stringify(dk));
    assert.ok(!(await html(p)).match(/hạn \d\d\/\d\d\/\d{4}/), "không hạn giấy tờ ở màn tài xế");
    assert.equal(await p.ev(`document.querySelector('[data-action="xuat-ben"]').disabled`), true);
    assert.equal(await p.ev(txt(".dp-cc-foot")), "Chưa xuất bến được — văn phòng đang lo.");
    assert.equal(await p.ev(txt(".bar-title")), `Xuất bến ${T6.ma}`);
    assert.equal(await p.ev(khongBiChe("#cc-day .vc-btn")), "ok", "390: nút Xuất bến dính đáy không bị thanh tab che");
    await shotFull(p, "b6-xuat-ben-chua-dat-dien-thoai.png");
  });

  await b.step("3", `6c → 5a 390, Q-L3-B phía "không tên": chuyến NGÀY MAI (T4) đủ điều kiện ("Đủ điều kiện xuất bến"), trước xuất bến KHÔNG tên khách; bấm "Xuất bến" (không ô giờ, thân không có xayRaLuc) = xuất bến SỚM → đang chạy nhưng màn hiện "Khách N", KHÔNG tên, năm sinh, liên hệ`, async () => {
    await p.send("Page.navigate", { url: `${env.base}/cuoc-chuyen?id=${d.T4.id}` });
    await p.waitFor(`!!document.querySelector('[data-action="xuat-ben"]') && location.search.includes('${d.T4.id}')`, "màn xuất bến T4");
    assert.deepEqual(await p.ev(`[...document.querySelectorAll('.dp-cond')].map((x) => x.innerText.replace(/\\s+/g, ' ').trim())`), ["✓ Đủ điều kiện xuất bến"]);
    assert.equal(await p.ev(`document.querySelector('[data-action="xuat-ben"]').disabled`), false);
    assert.match(await p.ev(txt(".dp-cc-foot")), /^Bấm lúc xe lăn bánh — giờ ghi là lúc bấm \(\d\d:\d\d\)\.$/);
    for (const x of TEN_O4) assert.ok(!(await html(p)).includes(x), "trước xuất bến (ngoài ngày chạy) không tên khách");
    // bản 1.39 (chủ quyết 30/9): trước xuất bến tài xế thấy các điểm — thứ tự, loại, tên nơi, giờ hẹn, số người — KHÔNG nút tiến độ, KHÔNG khách từng người
    // gọi bằng phiên CỦA TRANG (ADR-0075: mỗi tài khoản một phiên — đăng nhập thêm bằng `call` làm trang bị đá ra)
    const ct4 = await p.ev(`fetch(${JSON.stringify(`/api/van-chuyen/cuoc-cua-toi/${d.T4.id}`)}).then((r) => r.json())`);
    const diemMan = await p.ev(`[...document.querySelectorAll('.dp-cc-diem .dp-run')].map((x) => x.innerText.replace(/\\s+/g, ' ').trim())`);
    const diemApi = [...ct4.diem].sort((x, y) => x.thuTu - y.thuTu);
    assert.ok(diemApi.length >= 2, `T4 có điểm: ${JSON.stringify(diemApi)}`);
    assert.equal(diemMan.length, diemApi.length, JSON.stringify(diemMan));
    diemApi.forEach((x, i) => {
      assert.ok(diemMan[i].startsWith(String(x.thuTu)), `thứ tự: ${diemMan[i]}`);
      assert.ok(diemMan[i].includes(x.loai === "PICKUP" ? "ĐÓN" : "TRẢ") && diemMan[i].includes(x.tenNoi), `loại + nơi: ${diemMan[i]}`);
      if (x.gioHen) assert.ok(diemMan[i].includes(x.gioHen.gio), `giờ hẹn ${x.gioHen.gio}: ${diemMan[i]}`);
      assert.ok(diemMan[i].endsWith(`${x.soNguoi} khách`), `số người ${x.soNguoi}: ${diemMan[i]}`);
    });
    assert.ok(diemApi.some((x) => x.loai === "PICKUP" && x.gioHen), "có ít nhất một điểm đón có giờ hẹn");
    assert.match(await p.ev(txt(".dp-cc-meta")), /^79A-111\.11 · \d\d\/\d\d \d\d:\d\d · 2 khách$/, "dòng đầu có ngày chạy; người đi kèm KHÔNG tính vào số khách");
    assert.equal(await p.ev(txt(".dp-cc-di-kem")), `Người đi kèm: ${HDV.name}`, "trước xuất bến: tên người đi kèm (mọi lúc)");
    assert.ok(!(await html(p)).includes(HDV.phone.slice(1)), "không lộ SĐT hướng dẫn viên");
    assert.equal(await p.ev("document.querySelectorAll('.dp-cc-diem .dp-run-btn, .dp-cc-diem .dp-khach, .dp-cc-diem .dp-khach-btn').length"), 0, "trước xuất bến: không nút tiến độ, không khách từng người");
    assert.equal(await p.ev("!!document.querySelector('.dp-cc-diem + .dp-side-card')"), true, "điểm nằm TRƯỚC khối điều kiện xuất bến");
    await shotFull(p, "b6-xuat-ben-dat-dien-thoai.png");
    await p.ev(click('[data-action="xuat-ben"]'));
    // V1.3 HT-03 (lộ trình kiểm theo vai 3/10): "Xuất bến" chỉ mở hộp xác nhận — bấm nút trong hộp mới gửi lệnh.
    await p.waitFor(`!!document.querySelector('[data-action="xuat-ben-xac-nhan"]')`, "hộp xác nhận xuất bến");
    assert.deepEqual(posts(p, "/xuat-ben"), [], "một chạm chỉ mở hộp");
    await p.ev(click('[data-action="xuat-ben-xac-nhan"]'));
    await p.waitFor(`!!document.querySelector('.dp-cc-head')`, "màn đang chạy"); // bản 1.39: .dp-run nay có cả trước xuất bến → chờ đầu trang "Đang chạy"
    const body = JSON.parse(posts(p, "/xuat-ben").at(-1).body);
    assert.deepEqual(Object.keys(body), ["requestId"], "tài xế tự bấm: không xayRaLuc");
    assert.match(await p.ev(txt(".dp-cc-head")), /^Đang chạy 79A-111\.11 · xuất bến \d\d:\d\d · trên xe 0\/15$/);
    assert.equal(await p.ev(txt(".dp-cc-di-kem")), `Người đi kèm: ${HDV.name}`, "đang chạy: dòng người đi kèm; không SĐT");
    assert.ok(!(await html(p)).includes(HDV.phone.slice(1)));
    assert.equal(await p.ev(`document.querySelectorAll('.dp-khach-ten').length`), 2, "người đi kèm không thành dòng khách");
    // Ruling 2/10: người đi kèm phải "Đã lên xe" → "Đã xuống" (máy chủ đếm như khách khi kết thúc thường).
    assert.equal(await p.ev(`document.querySelector('.dp-cc-di-kem-viec').innerText.replace(/\\s+/g, ' ').trim()`), `${HDV.name} — chưa lên xe Đã lên xe`);
    await p.ev(click('[data-action="di-kem-don"]'));
    await p.waitFor(`!!document.querySelector('[data-action="di-kem-tra"]')`, "sau 'Đã lên xe' hiện 'Đã xuống'");
    assert.match(await p.ev(txt(".dp-cc-di-kem-viec")), /đang trên xe/);
    await p.ev(click('[data-action="di-kem-tra"]'));
    await p.waitFor(`!document.querySelector('[data-action="di-kem-tra"]') && /đã xuống/.test(document.querySelector('.dp-cc-di-kem-viec').innerText)`, "sau 'Đã xuống' hết nút");
    assert.equal(await p.ev(noCode), "");
    // Q-L3-B: chuyến ngày mai đã xuất bến sớm — màn tài xế hiện "Khách N", không tên / năm sinh / liên hệ (mở từ 00:00 ngày chạy).
    const k = await p.ev(`[...document.querySelectorAll('.dp-khach-ten')].map((x) => x.innerText)`);
    assert.deepEqual([...k].sort(), ["Khách 1", "Khách 2"], "chuyến NGÀY MAI đã xuất bến sớm: màn tài xế hiện 'Khách N', KHÔNG tên");
    const h = await html(p);
    for (const x of [...TEN_O4, SDT_O4, "0903100205", "Khách Điều Phối 5"]) assert.ok(!h.includes(x), `xuất bến sớm: không lộ ${x}`);
    assert.equal(await p.ev(`!!document.querySelector('.dp-run-lien-he')`), false, "xuất bến sớm: không dòng liên hệ");
    assert.equal(await p.ev(noCode), "");
    await shotFull(p, "b5-xuat-ben-som-khong-ten-dien-thoai.png");
    // Kết thúc T4 (gián đoạn, bằng route tài xế) — trả An về trạng thái không chạy cho bước 7 (văn phòng xuất bến thay T1 của An).
    const kt = await p.ev(`fetch(${JSON.stringify(`/api/van-chuyen/cuoc-cua-toi/${d.T4.id}/ket-thuc-gian-doan`)}, { method: "POST", headers: { "content-type": "application/json" }, body: ${JSON.stringify(JSON.stringify({ requestId: randomUUID(), lyDo: "GIAN_DOAN_KHAC" }))} }).then(async (r) => ({ status: r.status, text: await r.text() }))`);
    assert.equal(kt.status, 200, `kết thúc T4: ${kt.text}`);
  });

  await p.close();
  p = await env.as(d.CUONG.account, "/", MOB);
  await b.step("3b", `5a 390, Q-L3-B phía "có tên": chuyến HÔM NAY (TH, tài xế Cường) — bấm "Xuất bến" → đang chạy: tên + năm sinh + liên hệ của đơn hiện${axeNote()}`, async () => {
    await p.send("Page.navigate", { url: `${env.base}/cuoc-chuyen?id=${TH.id}` });
    await p.waitFor(`!!document.querySelector('[data-action="xuat-ben"]') && location.search.includes('${TH.id}')`, "màn xuất bến TH");
    // bản 1.39: chuyến HÔM NAY trước xuất bến — máy chủ ĐÃ gửi tên khách (trong ngày chạy) nhưng danh sách điểm trước xuất bến KHÔNG vẽ tên / SĐT / liên hệ
    const cth = (await fetchTrang(p, "GET", `/api/van-chuyen/cuoc-cua-toi/${TH.id}`)).json; // phiên của chính trang: đăng nhập thêm bằng dòng lệnh sẽ đá phiên đang mở (ADR-0075, một phiên mỗi tài khoản)
    assert.ok(cth.suat.some((x) => x.hoTen), "ca này phân biệt được: máy chủ có gửi tên khách");
    assert.ok((await p.ev("document.querySelectorAll('.dp-cc-diem .dp-run').length")) >= 2, "có danh sách điểm trước xuất bến");
    const hTruoc = await html(p);
    for (const x of [...TEN_OH, SDT_OH, SDT_OH.replace(/\s/g, ""), LIEN_HE_OH]) assert.ok(!hTruoc.includes(x), `trước xuất bến (hôm nay): không lộ ${x}`);
    assert.equal(await p.ev("document.querySelectorAll('.dp-cc-diem .dp-khach, .dp-run-lien-he').length"), 0, "trước xuất bến: không khách từng người, không liên hệ");
    assert.deepEqual(await p.ev(`[...document.querySelectorAll('.dp-cond')].map((x) => x.innerText.replace(/\\s+/g, ' ').trim())`), ["✓ Đủ điều kiện xuất bến"]);
    await p.ev(click('[data-action="xuat-ben"]'));
    await p.waitFor(`!!document.querySelector('[data-action="xuat-ben-xac-nhan"]')`, "hộp xác nhận xuất bến TH"); // V1.3: cùng ngày → nút "Xuất bến"
    assert.equal(await p.ev(txt('[data-action="xuat-ben-xac-nhan"]')), "Xuất bến");
    await p.ev(click('[data-action="xuat-ben-xac-nhan"]'));
    await p.waitFor(`!!document.querySelector('.dp-cc-head')`, "màn đang chạy TH").catch(async (e) => { throw new Error(`${e.message}\n    trang: ${await p.ev(txt("#cc-trang"))}\n    POST: ${JSON.stringify(apiCalls(p).filter((r) => r.method === "POST").map((r) => r.path))}`); });
    assert.deepEqual(Object.keys(JSON.parse(posts(p, "/xuat-ben").at(-1).body)), ["requestId"], "tài xế tự bấm: không xayRaLuc");
    assert.match(await p.ev(txt(".dp-cc-head")), /^Đang chạy 79A-444\.44 · xuất bến \d\d:\d\d · trên xe 0\/15$/);
    const k = await p.ev(`[...document.querySelectorAll('.dp-khach-ten')].map((x) => x.innerText)`);
    assert.deepEqual([...k].sort(), TEN_OH, "đang chạy (trong ngày chạy): có tên khách");
    assert.match(await p.ev(txt(".dp-run-lien-he")), new RegExp(`^Liên hệ: ${LIEN_HE_OH} ${SDT_OH}$`));
    assert.equal(await p.ev(`document.querySelector('.dp-run-lien-he a').getAttribute('href')`), "tel:0903100299");
    assert.equal(await p.ev(txt('.dp-run [data-action="da-toi"]')), "Đã tới");
    assert.equal(await p.ev(`document.querySelectorAll('.dp-khach-btn').length`), 0, "chưa tới điểm: chưa đánh dấu khách");
    assert.equal(await p.ev(`document.querySelector('[data-action="ket-thuc"]').disabled`), true);
    assert.equal(await p.ev(`document.querySelectorAll('.dp-thu-tu').length`), 4, "hai điểm chưa tới: nút lên / xuống (không kéo)");
    assert.equal(await p.ev(noCode), "");
    await axe(p, "chuyến đang chạy 390");
    assert.equal(await p.ev(khongBiChe(".dp-run-end .vc-btn")), "ok", "390: nút cuối (Kết thúc gián đoạn) không bị thanh tab che");
    // bản 1.39: "Kết thúc gián đoạn" viền đỏ, nhỏ hơn "Kết thúc chuyến" (vẫn ≥ 44px); "Kết thúc chuyến" khoá vẫn giữ hình nút (nền màu nút, mờ)
    const nut = await p.ev(`(() => { const k = document.querySelector('[data-action="ket-thuc"]'), g = document.querySelector('[data-action="ket-thuc-gian-doan"]'); const ks = getComputedStyle(k), gs = getComputedStyle(g), kr = k.getBoundingClientRect(), gr = g.getBoundingClientRect();
      return { gStop: g.classList.contains('vc-btn-stop'), gBg: gs.backgroundColor, gBorder: gs.borderTopColor, gH: gr.height, gW: gr.width, kH: kr.height, kW: kr.width, kBg: ks.backgroundColor, kOp: ks.opacity, trang: getComputedStyle(document.body).backgroundColor }; })()`);
    assert.equal(nut.gStop, true, JSON.stringify(nut));
    assert.ok(nut.gH >= 44 && nut.gH < nut.kH && nut.gW < nut.kW, `gián đoạn nhỏ hơn: ${JSON.stringify(nut)}`);
    assert.notEqual(nut.kBg, nut.trang, `Kết thúc chuyến khoá vẫn có nền nút: ${JSON.stringify(nut)}`);
    assert.equal(nut.kOp, "0.5");
    await shotFull(p, "b5-chuyen-dang-chay-dien-thoai.png");
    await p.ev("window.scrollTo(0, 0), true");
  });

  await b.step("4", `5a: "Đã tới" → khách có Đã đón / Vắng / Khách đã huỷ; "Đã đón" khách 1 → "Đã đón"; phản hồi lệnh không kèm liên hệ — màn GIỮ dòng liên hệ của lần tải`, async () => {
    await p.ev(click('.dp-run [data-action="da-toi"]'));
    await p.waitFor(`document.querySelectorAll('.dp-khach-btn[data-action="don"]').length === 2`, "nút khách").catch(async (e) => {
      throw new Error(`${e.message}\n    trang: ${await p.ev(txt("#cc-trang"))}\n    console: ${JSON.stringify(p.consoleErrors)}\n    POST: ${JSON.stringify(apiCalls(p).filter((r) => r.method === "POST").map((r) => r.path))}`);
    });
    await p.ev(click('.dp-khach-btn[data-action="don"]'));
    await p.waitFor(`document.querySelectorAll('.dp-khach-kq.is-ok').length === 1`, "một khách đã đón");
    // GA-55: phản hồi lệnh không còn tên / liên hệ — màn đọc lại chi tiết: tên vẫn đúng, không "Khách 1", không ô trống.
    assert.deepEqual((await p.ev(`[...document.querySelectorAll('.dp-khach-ten')].map((x) => x.innerText)`)).sort(), TEN_OH);
    assert.match(await p.ev(txt(".dp-run-lien-he")), new RegExp(`^Liên hệ: ${LIEN_HE_OH}`));
    assert.match(await p.ev(txt(".dp-cc-head")), / · trên xe 1\/15$/);
  });

  await b.step("5", `mất mạng: bấm "Vắng" → dòng "Chưa gửi được" + "Bấm lại" + dải "Mất mạng — 1 thao tác chưa gửi được"; máy KHÔNG tự gửi lại; có mạng, bấm lại → "Vắng", CÙNG requestId`, async () => {
    await p.send("Network.emulateNetworkConditions", { offline: true, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
    const truoc = posts(p, "/vang").length;
    await p.ev(click('.dp-khach-btn[data-action="vang"]'));
    await p.waitFor(`!!document.querySelector('.dp-khach.is-cho [data-action="bam-lai"]')`, "dòng chưa gửi được");
    assert.equal(await p.ev(txt("#cc-trang > .banner-warning .banner-title")), "Mất mạng — 1 thao tác chưa gửi được");
    await shotFull(p, "b5-mat-mang-dien-thoai.png");
    await sleep(2500);
    assert.equal(posts(p, "/vang").length, truoc + 1, "không tự gửi lại");
    await p.send("Network.emulateNetworkConditions", { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
    await p.ev(click('.dp-khach.is-cho [data-action="bam-lai"]'));
    await p.waitFor(`!!document.querySelector('.dp-khach-kq.is-vang')`, "khách vắng");
    const ids = posts(p, "/vang").slice(truoc).map((r) => JSON.parse(r.body).requestId);
    assert.equal(ids.length, 2);
    assert.equal(ids[0], ids[1], "bấm lại dùng CÙNG requestId");
    assert.equal(await p.ev(`!!document.querySelector('#cc-trang > .banner-warning')`), false);
  });

  await b.step("5b", `C55 (đánh giá ERP 7/10): mất mạng mà trang tự tải lại (tin chuyến / nối lại) → trang KHÔNG ẩn: còn tên khách, số liên hệ, nút; dải "Mất mạng — dữ liệu lúc HH:MM"; có mạng tải lại → dải mất`, async () => {
    const tenTruoc = (await p.ev(`[...document.querySelectorAll('.dp-khach-ten')].map((x) => x.innerText)`)).sort();
    await p.send("Network.emulateNetworkConditions", { offline: true, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
    await p.ev(`window.dispatchEvent(new Event("can-tai-lai")), true`);
    await p.waitFor(`/^Mất mạng — dữ liệu lúc \\d\\d:\\d\\d$/.test(document.querySelector('#cc-trang > .banner-warning .banner-title')?.textContent ?? '')`, "dải dữ liệu cũ");
    assert.equal(await p.ev(`document.querySelector('#cc-trang').hidden`), false, "trang chuyến không bị ẩn khi mất mạng");
    assert.equal(await p.ev(`document.querySelector('#error')?.hidden !== false`), true, "không câu lỗi che trang");
    assert.deepEqual((await p.ev(`[...document.querySelectorAll('.dp-khach-ten')].map((x) => x.innerText)`)).sort(), tenTruoc, "tên khách còn");
    assert.ok(await p.ev(`document.querySelectorAll('.dp-run-lien-he a[href^="tel:"]').length > 0`), "số liên hệ (gọi một chạm) còn");
    await shotFull(p, "b5-mat-mang-tai-nen-dien-thoai.png");
    await p.send("Network.emulateNetworkConditions", { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
    await p.ev(`window.dispatchEvent(new Event("can-tai-lai")), true`);
    await p.waitFor(`!document.querySelector('#cc-trang > .banner-warning')`, "dải dữ liệu cũ mất khi có mạng");
  });

  await b.step("6", `5a: điểm trả "Đã trả" (tới điểm rồi trả khách trên xe) → "Kết thúc chuyến" mở → kết thúc; hộp "Kết thúc gián đoạn" có lý do nhóm Kết thúc gián đoạn, KHÔNG ô ghi chú`, async () => {
    await p.ev(click('[data-action="ket-thuc-gian-doan"]'));
    await p.waitFor(`!!document.querySelector('[data-action="gian-doan-gui"]')`, "hộp gián đoạn");
    await sleep(600);
    assert.deepEqual(await p.ev(`[...document.querySelectorAll('.sheet .vc-reason')].map((x) => x.textContent)`), ["Xe hỏng", "Tai nạn", "Khác"]);
    assert.equal(await p.ev(`document.querySelectorAll('.sheet textarea').length`), 0);
    assert.equal(await p.ev(`document.querySelector('[data-action="gian-doan-gui"]').disabled`), true);
    await shotView(p, "b5-ket-thuc-gian-doan-dien-thoai.png");
    await p.ev(click(".sheet .vc-btn-ghost-primary"));
    await sleep(500);
    await p.ev(click('.dp-run [data-action="tra-het"]'));
    // Kiểu A (V1.4, 3/10): "Đã trả" cả điểm và "Kết thúc chuyến" mở hộp xác nhận — lệnh chỉ gửi khi bấm nút trong hộp.
    await p.waitFor(`!!document.querySelector('[data-action="tra-het-xac-nhan"]')`, "hộp xác nhận đã trả");
    await p.ev(click('[data-action="tra-het-xac-nhan"]'));
    await p.waitFor(`!document.querySelector('[data-action="ket-thuc"]').disabled`, "kết thúc mở");
    await p.ev(click('[data-action="ket-thuc"]'));
    await p.waitFor(`!!document.querySelector('[data-action="ket-thuc-xac-nhan"]')`, "hộp xác nhận kết thúc");
    await p.ev(click('[data-action="ket-thuc-xac-nhan"]'));
    await p.waitFor(`/^Hoàn tất|^Đã kết thúc|^Kết thúc/.test(${txt(".dp-cc-head .chip")} ?? '')`, "chuyến đã kết thúc");
    assert.ok(await p.ev(`!!document.querySelector('.dp-ct-moc')`), "có mốc kết thúc");
    assert.equal(await p.ev(`document.querySelectorAll('.dp-run-btn, .dp-khach-btn').length`), 0);
    assert.deepEqual(p.consoleErrors, []);
  });
  await p.close();

  // ---- Bán hàng bấm thay (máy tính) --------------------------------------------------------------------------------------------------------------------------
  // Chờ hơn HAI phút kể từ lệnh cuối (T4 của An kết thúc ở bước 3; TH của Cường ở bước 6): giờ sớm nhất khai được làm tròn LÊN phút, chờ một phút có khi vẫn trùng
  // phút lúc bấm (lần chạy thứ hai đã trùng) — hơn hai phút thì chắc chắn có một phút khai lùi hợp lệ khác lúc bấm.
  await sleep(125_000);
  const s = await env.as(ACCOUNTS.salesA, `/chuyen?id=${d.T1.id}`, DESK);
  await b.step("7", `6d 1040 Bán hàng: "Xuất bến thay tài xế" → hộp: "Đạt đủ … điều kiện", "Ghi thay tài xế …", ô "Xảy ra lúc" mặc định lúc bấm + "Sớm nhất" của máy chủ; giờ ngoài khoảng → câu dưới ô; khai đúng "Sớm nhất" → gửi xayRaLuc, mốc xuất bến HAI giờ + "giờ do văn phòng khai"${axeNote()}`, async () => {
    await s.waitFor(`!!document.querySelector('.dp-ct-actions [data-action="xuat-ben-thay"]')`, "nút xuất bến thay");
    await s.ev(click('.dp-ct-actions [data-action="xuat-ben-thay"]'));
    await s.waitFor(`!!document.querySelector('[data-action="khai-gio-gui"]')`, "hộp khai giờ");
    await sleep(600);
    assert.equal(await s.ev(txt(".sheet-title")), `Xuất bến ${d.T1.ma} — bấm thay tài xế`);
    assert.match(await s.ev(txt(".dp-sheet-khai-gio .dp-banner-ok")), /^Đạt đủ \d+ điều kiện xuất bến$/);
    assert.equal(await s.ev(txt(".dp-sheet-khai-gio .dp-sheet-text")), "Ghi thay tài xế Nguyễn Văn An. Tên bạn được ghi kèm mốc này.");
    const mac = await s.ev(`document.querySelector('#tdo-gio').value`);
    assert.match(await s.ev(txt("#tdo-gio-hint")), new RegExp(`^Để nguyên là lúc bấm \\(${mac}\\)\\. Sớm nhất: \\d\\d:\\d\\d( \\d\\d/\\d\\d)?\\.$`));
    await axe(s, "hộp khai giờ 1040");
    await shotView(s, "b2-xuat-ben-thay-may-tinh.png");
    // Giờ gõ nhầm 5 phút SAU lúc bấm → hôm nay (xayRaLucTu chọn ngày gần lúc bấm nhất) → máy chủ từ chối "chưa tới" (bản vẽ 6d); câu dưới ô (sát nửa đêm cũng vậy — xayRaLucTu xét cả ngày mai).
    const [gh, gm] = mac.split(":").map(Number);
    const sau = `${String(Math.floor(((gh * 60 + gm + 5) % 1440) / 60)).padStart(2, "0")}:${String((gm + 5) % 60).padStart(2, "0")}`;
    await s.ev(typeInto("#tdo-gio", sau));
    await s.ev(click('[data-action="khai-gio-gui"]'));
    await s.waitFor(`!document.querySelector('#tdo-gio-error').hidden`, "câu lỗi dưới ô");
    assert.match(await s.ev(txt("#tdo-gio-error")), /^Giờ này chưa tới — bây giờ là \d\d:\d\d\.$/);
    assert.equal(await s.ev(`document.querySelector('#tdo-gio').getAttribute('aria-invalid')`), "true");
    await shotView(s, "b2-khai-gio-loi-may-tinh.png");
    // Khai đúng giờ sớm nhất máy chủ cho (≥ 1 phút trước lúc bấm nhờ chờ hơn hai phút) → qua; mốc hiện hai giờ + dấu "giờ do văn phòng khai" (thành phần B).
    const som = (await s.ev(txt("#tdo-gio-hint"))).match(/Sớm nhất: (\d\d:\d\d)/)[1];
    assert.notEqual(som, mac, "giờ sớm nhất khác lúc bấm (đã chờ hơn hai phút)");
    await s.ev(typeInto("#tdo-gio", som));
    await s.ev(click('[data-action="khai-gio-gui"]'));
    await s.waitFor(`${txt(".dp-ct-head .chip")} === 'Đang chạy'`, "đã xuất bến");
    const bodies = posts(s, "/xuat-ben").map((r) => JSON.parse(r.body));
    assert.equal(bodies.length, 2);
    assert.ok(bodies.every((x) => typeof x.xayRaLuc === "string" && x.xayRaLuc.endsWith("Z")), "đã đổi giờ → gửi xayRaLuc (ISO có múi giờ)");
    assert.match(await s.ev(txt(".dp-ct-moc")), new RegExp(`^Xuất bến ${som}( \\d\\d/\\d\\d)? · ghi lúc \\d\\d:\\d\\d( \\d\\d/\\d\\d)? — Sales Một giờ do văn phòng khai$`));
  });

  // Bước 7b (Task 3 Đợt 1, Q-B-15): văn phòng đổi thứ tự điểm CHƯA TỚI khi xe đang chạy (route 39). T1 vừa xuất bến: 2 điểm chưa tới (đón, trả).
  const tenDiem = `[...document.querySelectorAll('.dp-run .dp-run-noi')].map((x) => x.innerText.trim())`;
  await b.step("7b", `5c 1040 Bán hàng: nút ↑/↓ ở điểm chưa tới (4 nút, ↑ điểm đầu + ↓ điểm cuối khoá); bấm ↓ điểm đầu → POST /thu-tu thân chỉ requestId + diem (không xayRaLuc), thứ tự đảo, dải báo; bấm ↑ trả lại${axeNote()}`, async () => {
    await s.waitFor(`document.querySelectorAll('.dp-run .dp-thu-tu').length === 4`, "4 nút đổi thứ tự");
    assert.equal(await s.ev(`document.querySelector('.dp-run .dp-thu-tu[data-action="len"]').disabled`), true, "↑ của điểm đầu khoá");
    assert.equal(await s.ev(`[...document.querySelectorAll('.dp-run .dp-thu-tu[data-action="xuong"]')].at(-1).disabled`), true, "↓ của điểm cuối khoá");
    const truoc = await s.ev(tenDiem);
    assert.equal(truoc.length, 2);
    await s.ev(`document.querySelector('.dp-run .dp-thu-tu[data-action="xuong"]').click()`);
    await s.waitFor(`/^(Đã đổi thứ tự điểm|Chưa đổi được thứ tự điểm)$/.test(document.querySelector('.banner .banner-title')?.innerText ?? '')`, "dải báo sau khi đổi thứ tự");
    const tieuDe = await s.ev(txt(".banner .banner-title"));
    console.log(`   [7b] dải sau ↓ điểm đầu: "${tieuDe}" — ${await s.ev(txt(".banner"))}`);
    const thanTT = posts(s, "/thu-tu").map((r) => Object.keys(JSON.parse(r.body)).sort());
    assert.deepEqual(thanTT[0], ["diem", "requestId"], "thân route 39 không có xayRaLuc");
    assert.equal(await s.ev(noCode), "");
    // Đo thật (Task 3 Đợt 1): máy chủ KHÔNG cấm "trả trước đón" khi đổi thứ tự (route 39 / trigger không có luật đó) → ↓ điểm đón được chấp nhận.
    assert.equal(tieuDe, "Đã đổi thứ tự điểm");
    assert.deepEqual(await s.ev(tenDiem), [truoc[1], truoc[0]], "thứ tự chữ đảo");
    await shotFull(s, "b2-doi-thu-tu-van-phong.png");
    await s.ev(`[...document.querySelectorAll('.dp-run .dp-thu-tu[data-action="len"]')].at(-1).click()`);
    await s.waitFor(`${tenDiem}[0] === ${JSON.stringify(truoc[0])} && document.querySelector('.banner .banner-title')?.innerText === 'Đã đổi thứ tự điểm'`, "đã trả lại thứ tự cũ");
    assert.equal(posts(s, "/thu-tu").length, 2);
  });
  // Bước 7c (Review Focus 4): tài xế vừa "Đã tới" điểm đầu (ghi bằng API) mà trang văn phòng chưa tải lại → bấm ↓ điểm đó → 409 → dải "Chưa đổi được…" +
  // câu của máy chủ; màn đọc lại → điểm đó hết nút. T1 chỉ có 2 điểm chưa tới nên API ghi "Đã tới" điểm CUỐI (điểm trả — máy chủ không bắt thứ tự tới) để bước 8
  // vẫn bấm "Đã tới" ở điểm đón như cũ; trang chưa tải lại bấm ↓ ở điểm đón (đổi chỗ với điểm trả vừa tới) → 409.
  await b.step("7c", `5c 1040: điểm trả vừa được ghi "Đã tới" bằng API, trang chưa tải lại → bấm ↓ ở điểm đón → "Chưa đổi được thứ tự điểm" + "Điểm đã tới hoặc đã bỏ qua…"; sau đó điểm đã tới không còn nút, điểm đón còn hai nút khoá`, async () => {
    const r = await call(ACCOUNTS.admin, "GET", `/api/van-chuyen/chuyen/${d.T1.id}`);
    assert.equal(r.status, 200, r.text);
    const idDiemCuoi = [...r.json.diem].sort((x, y) => x.thuTu - y.thuTu).filter((x) => x.trangThai === "PENDING").at(-1).id;
    const da = await call(ACCOUNTS.admin, "POST", `/api/van-chuyen/chuyen/${d.T1.id}/diem/${idDiemCuoi}/da-toi`, { requestId: randomUUID() });
    assert.equal(da.status, 200, da.text);
    const soTruoc = posts(s, "/thu-tu").length;
    await s.ev(`document.querySelector('.dp-run .dp-thu-tu[data-action="xuong"]').click()`);
    await s.waitFor(`document.querySelector('.banner .banner-title')?.innerText === 'Chưa đổi được thứ tự điểm'`, "dải 'Chưa đổi được…'");
    assert.equal(posts(s, "/thu-tu").length, soTruoc + 1, "có gửi lệnh");
    assert.match(await s.ev(txt(".banner li")), /^Điểm đã tới hoặc đã bỏ qua/);
    assert.deepEqual(await s.ev(`[...document.querySelectorAll('.dp-run .dp-thu-tu')].map((x) => x.disabled)`), [true, true], "chỉ còn điểm đón (chờ một mình): hai nút khoá; điểm đã tới hết nút");
    assert.equal(await s.ev(noCode), "");
    await shotFull(s, "b2-doi-thu-tu-409-van-phong.png");
  });
  await b.step("8b", "Ruling 2/10 — văn phòng bấm thay người đi kèm (T1 đang chạy): dòng 'chưa lên xe' + nút 'Đã lên xe' → 'đang trên xe' + 'Đã xuống' → 'đã xuống', hết nút; dòng giải thích 'Kết thúc chuyến' nhắc người đi kèm", async () => {
    assert.equal(await s.ev(`!!document.querySelector('[data-action="di-kem-don"]')`), true);
    assert.match(await s.ev(txt(".dp-cc-di-kem-viec")), new RegExp(`Người đi kèm ${HDV.name} — chưa lên xe`));
    await s.ev(click('[data-action="di-kem-don"]'));
    await s.waitFor(`!!document.querySelector('[data-action="di-kem-tra"]')`, "văn phòng: hiện 'Đã xuống'");
    assert.match(await s.ev(txt(".dp-cc-di-kem-viec")), /đang trên xe/);
    await s.ev(click('[data-action="di-kem-tra"]'));
    await s.waitFor(`!document.querySelector('[data-action="di-kem-tra"]') && /đã xuống/.test(document.querySelector('.dp-cc-di-kem-viec').innerText)`, "văn phòng: xong, hết nút");
    assert.equal(await s.ev(noCode), "");
    assert.ok(!(await s.ev(`document.querySelector('main').innerText`)).includes(HDV.phone.slice(1)));
  });
  await b.step("8", `5c 1040 Bán hàng: chuyến đang chạy — "Đã tới" để nguyên giờ → thân KHÔNG có xayRaLuc (I34), mốc MỘT giờ; GA-55: sau lệnh tên khách vẫn hiện đúng`, async () => {
    await s.waitFor(`!!document.querySelector('.dp-run [data-action="da-toi"]')`, "nút đã tới");
    await s.ev(click('.dp-run [data-action="da-toi"]'));
    await s.waitFor(`!!document.querySelector('[data-action="khai-gio-gui"]')`, "hộp khai giờ");
    const tenTruoc = await s.ev(`[...document.querySelectorAll('.dp-khach-ten')].map((x) => x.innerText)`);
    assert.deepEqual([...tenTruoc].sort(), ["Hành Khách Thử 1-1", "Hành Khách Thử 1-2", "Hành Khách Thử 1-3"], "thứ tự khách theo máy chủ");
    await s.ev(click('[data-action="khai-gio-gui"]'));
    await s.waitFor(`!document.querySelector('.sheet-root') && !!document.querySelector('.dp-run .dp-moc')`, "mốc đã tới");
    assert.match(await s.ev(txt(".dp-run .dp-moc")), /^Đã tới \d\d:\d\d( \d\d\/\d\d)?$/, "để nguyên → một giờ, không dấu văn phòng khai");
    assert.deepEqual(Object.keys(JSON.parse(posts(s, "/da-toi").at(-1).body)), ["requestId"], "để nguyên → không xayRaLuc (I34)");
    // GA-55: phản hồi lệnh không còn tên khách — màn đọc lại chi tiết, tên vẫn đúng (không "Khách 1", không ô trống, không "undefined").
    assert.deepEqual(await s.ev(`[...document.querySelectorAll('.dp-khach-ten')].map((x) => x.innerText)`), tenTruoc);
    assert.equal(await s.ev(`document.querySelectorAll('.dp-khach-btn[data-action="don"]').length`), 3, "đã tới → nút khách");
    assert.equal(await s.ev(noCode), "");
    await shotFull(s, "b2-dang-chay-bam-thay-may-tinh.png");
  });
  await s.close();

  // ---- Tài khoản vừa tài xế công ty vừa Bán hàng (kiểm độc lập K2b T2 — giả định bề mặt GA-K2b-T2 do điều phối chốt) ------------------------------------
  const tl = await call(ACCOUNTS.chu, "POST", "/api/staff", { // ADR-0071: chỉ Nhân sự / Toàn quyền tạo tài khoản
    taoHoSoMoi: true, fullName: "Lai Tài Xế Bán Hàng", phone: "0900000469", roles: ["DRIVER_INTERNAL", "SALES_STAFF"] });
  assert.equal(tl.status, 201, `tạo tài khoản lai: ${tl.text}`);
  const LAI = { name: "Lai Tài Xế Bán Hàng", phone: tl.json.staff.phone, pin: tl.json.pin, permissions: ["DRIVER", "SALES"] };
  const l = await env.as(LAI, "/", DESK);
  await b.step("9b", "K2b T2: tài khoản DRIVER + SALES — trang đầu KHÔNG đổi (ở Trang chủ); thanh bên có \"Cuốc của tôi\" → mở /cuoc; điện thoại: trang Tôi có dòng \"Cuốc của tôi\", thanh tab KHÔNG thêm tab, ở /cuoc tab \"Tôi\" sáng", async () => {
    await l.waitFor(`!!document.querySelector('#sidebar .sidebar-item')`, "thanh bên");
    await sleep(800);
    assert.equal(await l.ev("location.pathname"), "/", "trang đầu của tổ hợp này không đổi (Q5 chỉ cho tài khoản chỉ tài xế)");
    const muc = await l.ev(`[...document.querySelectorAll('#sidebar .sidebar-item')].map((a) => [a.innerText.trim(), a.getAttribute('href')])`);
    assert.ok(muc.some(([t, h]) => t === "Cuốc của tôi" && h === "/cuoc"), JSON.stringify(muc));
    await l.ev(click('#sidebar a[href="/cuoc"]'));
    await l.waitFor(`location.pathname === '/cuoc' && document.querySelectorAll('.dp-cuoc-day').length === 3`, "mở /cuoc");
    assert.equal(await l.ev(`document.querySelector('#sidebar a[href="/cuoc"]').getAttribute('aria-current')`), "page");
    assert.equal(await l.ev("!document.getElementById('error').hidden"), false);
    await l.send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
    await l.send("Page.navigate", { url: env.base + "/account" });
    await l.waitFor(`!!document.querySelector('#vc-links')`, "trang Tôi");
    assert.deepEqual(await l.ev(`[...document.querySelectorAll('#vc-links .row-link')].map((a) => [a.innerText.trim(), a.getAttribute('href')])`), [["Điều phối xe", "/dieu-phoi"], ["Xe đang chạy", "/xe-dang-chay"], ["Cuốc của tôi", "/cuoc"]]); // + Xe đang chạy (Đợt 5)
    const tabs = await tt(l);
    assert.ok(!tabs.some(([h]) => h === "/cuoc"), `không tab Cuốc của tôi: ${JSON.stringify(tabs)}`);
    await l.ev(click('#vc-links a[href="/cuoc"]'));
    await l.waitFor(`location.pathname === '/cuoc' && document.querySelectorAll('.dp-cuoc-day').length === 3`, "mở /cuoc (điện thoại)");
    assert.deepEqual((await tt(l)).filter(([, , c]) => c === "page").map(([h]) => h), ["/account"], "tab Tôi sáng ở /cuoc");
    await shotFull(l, "b4-cuoc-tai-khoan-lai-dien-thoai.png");
  });
  await l.close();

  // ---- Kế toán (chỉ xem) ---------------------------------------------------------------------------------------------------------------------------------------
  const k = await env.as(ACCOUNTS.accounting, `/chuyen?id=${d.T1.id}`, DESK);
  await b.step("9", "Kế toán mở chuyến đang chạy: thấy điểm, mốc; KHÔNG nút bấm thay nào (ô trip.progress)", async () => {
    await k.waitFor(`!!document.querySelector('.dp-run')`, "điểm dừng đang chạy");
    assert.equal(await k.ev(`document.querySelectorAll('.dp-run-btn, .dp-khach-btn, .dp-thu-tu, [data-action="ket-thuc"], [data-action="ket-thuc-gian-doan"], [data-action="xuat-ben-thay"]').length`), 0);
    assert.equal(apiCalls(k).filter((r) => r.method === "POST").length, 0);
  });
  await k.close();

  await b.step("10", "không lỗi console ở mọi trang đã mở", async () => {
    for (const pg of [s, l, k]) assert.deepEqual(pg.consoleErrors, []);
  });
} finally {
  b.xong();
  await env.stop();
}
