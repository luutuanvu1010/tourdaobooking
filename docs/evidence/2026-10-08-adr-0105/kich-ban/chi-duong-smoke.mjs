// ADR-0105 — nhóm "Chỉ đường" trên màn tài xế (/cuoc-chuyen): hai liên kết Google Maps / Apple Maps (Apple chỉ trên máy Apple — G13), chỉ ở điểm chưa xong
// (PENDING / ARRIVED) của chuyến kế hoạch / đang chạy TRONG ngày chạy (G18-A, khoá DTO chỉ ở GET — G18-B). Kế hoạch `docs/superpowers/plans/2026-10-08-adr-0105-ke-hoach.md`
// T6b, NT-8 … NT-10. Dựng trên dp-lib.mjs (D1 tạm + wrangler dev + Chrome headless qua CDP; không cần mạng ngoài). Mọi tên, SĐT, địa chỉ ở đây là GIẢ.
// Chạy từ GỐC repo, sau `npm run build:web`, TRƯỚC 22:50 giờ VN (chuyến hôm nay 23:00):
//   AXE_JS=<…/axe.min.js> CHROME_BIN=docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh OUT=docs/evidence/2026-10-08-adr-0105 node docs/evidence/2026-10-08-adr-0105/kich-ban/chi-duong-smoke.mjs
// Kho cookie dùng CHUNG: An (chuyến ngày mai) → đóng → Cường (chuyến hôm nay). Mọi lời gọi của tài xế đi bằng phiên CỦA TRANG (`fetchTrang`) — đăng nhập thêm
// sẽ đá phiên (ADR-0075). Chuỗi nhận dạng trình duyệt đặt bằng CDP (không dựa vào chuỗi mặc định của máy chạy); phiên không gắn với chuỗi nhận dạng.
import { randomUUID } from "node:crypto";
import {
  ACCOUNTS, CHU, DESK, MOB, assert, axe, axeNote, boDem, click, dungDuLieuDieuPhoi, dungMoiTruong, fetchTrang, noCode, noOverflowX, shotFull, sleep, txt, LOC_BEN_TAU, vnDate,
} from "../../2026-09-29-adr-0049/kich-ban/dp-lib.mjs";

const UA_IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.4 Mobile/15E148 Safari/604.1";
const UA_ANDROID = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36";
const DIA_CHI_H1 = "Số 7 Đường Thử Chỉ Đường, Lộc Thọ, Nha Trang";
const NOI_H2 = "Nhà nghỉ Chỉ Đường 0905 123 456 hẻm 3";
const TEN_H = ["Khách Chỉ Đường 1", "Khách Chỉ Đường 2", "Khách Chỉ Đường 3"];
const SDT_LIEN_HE = "0903 100 391";

const gioVn = new Date(Date.now() + 7 * 3600_000).toISOString().slice(11, 16);
assert.ok(gioVn < "22:50", `kịch bản cần chạy trước 22:50 giờ VN (chuyến hôm nay 23:00) — bây giờ ${gioVn}`);

const { env, call: goiGoc } = await dungMoiTruong([CHU]);
// Kết nối giữ-sống của fetch Node có khi đã chết sau một lệnh `wrangler d1 execute` dài (máy tải cao) → ECONNRESET / UND_ERR_SOCKET ngay lần gửi đầu; máy chủ KHÔNG
// nhận yêu cầu (a2-cdp.mjs đã đo, `login` thử lại cùng cách) nên gửi lại là an toàn. Chỉ bọc ở kịch bản này, không đổi dp-lib dùng chung.
const call = async (...a) => {
  for (let i = 0; ; i++) {
    try {
      return await goiGoc(...a);
    } catch (e) {
      if (i >= 2 || (e?.cause?.code !== "ECONNRESET" && e?.cause?.code !== "UND_ERR_SOCKET")) throw e;
      await sleep(200);
    }
  }
};
const b = boDem("CHI DUONG SMOKE");
const d = await dungDuLieuDieuPhoi(env, call);
// T4 ngày mai của An có O4 (2 khách) — xếp bằng phá lệ (đã trong mốc 48 giờ), khuôn cuoc-smoke.
const x4 = await call(ACCOUNTS.admin, "POST", `/api/van-chuyen/chuyen/${d.T4.id}/phan-bo`, { version: d.T4.version, requestId: randomUUID(), chang: [{ legId: d.O4.legId, soSuat: 2 }], phaLe: { lyDo: "PHA_LE_SU_CO" } });
assert.equal(x4.status, 200, x4.text);

// Chuyến HÔM NAY của Cường (đường thật): Quản trị tạo địa điểm có địa chỉ; H1 đón ở địa điểm đó (1 khách), H2 đón chữ tự do có dãy số (2 khách); cả hai trả ở
// bến tàu (chưa có địa chỉ → bản đồ nhận TÊN). Mốc 48 giờ → đặt gấp rồi xác nhận; xe đủ giấy; chuyến 23:00–23:55; xếp cả hai.
const homNay = vnDate(0);
const loc = await call(ACCOUNTS.admin, "POST", "/api/locations", { code: "KS_CHI_DUONG_THU", name: "Khách sạn Chỉ Đường Thử", locationTypeCode: "HOTEL", address: DIA_CHI_H1 });
assert.equal(loc.status, 201, `tạo địa điểm: ${loc.text}`);
const LOC_H1 = loc.json.location.id;
const donHomNay = async (gio, noiDon, ten) => {
  const o = await call(ACCOUNTS.salesA, "POST", "/api/orders", {
    customerName: "Khách Liên Hệ Chỉ Đường", customerPhone: SDT_LIEN_HE, customerEmail: "", customerNote: "", discount: 0, depositAmount: 0, depositMethod: null, paymentNote: "",
    services: [{
      kind: "catalog", pickupChoice: "DON", catalogCode: "TD101", pax: { adult: ten.length, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: 1350000 },
      departTime: "", pickupTime: "", pickupPlace: "", checkinDate: "", checkinTime: "", checkinPlace: "", note: "", departDate: homNay,
      legs: [{ direction: "OUT", pickupDate: homNay, pickupTime: gio, ...noiDon, dropoffLocationId: LOC_BEN_TAU, dropoffPlace: "" }],
    }],
    passengers: ten.map((fullName, i) => ({ fullName, birthYear: 1985 + i, paxCode: null })),
  });
  assert.equal(o.status, 201, `lập đơn ${gio}: ${o.text}`);
  const legId = o.json.order.services[0].legs[0].id;
  const g = await call(ACCOUNTS.admin, "POST", `/api/orders/${o.json.order.id}/legs/${legId}/short-notice`, { lyDo: "KHACH_DOAN_GOI_GAP" });
  assert.equal(g.status, 200, `đặt gấp ${gio}: ${g.text}`);
  const c = await call(ACCOUNTS.admin, "POST", `/api/orders/${o.json.order.id}/status`, { status: "confirmed" });
  assert.equal(c.status, 200, `xác nhận ${gio}: ${c.text}`);
  return legId;
};
const legH1 = await donHomNay("23:05", { pickupLocationId: LOC_H1, pickupPlace: "" }, TEN_H.slice(0, 1));
const legH2 = await donHomNay("23:15", { pickupLocationId: null, pickupPlace: NOI_H2 }, TEN_H.slice(1));
const xe = await call(ACCOUNTS.admin, "POST", "/api/van-chuyen/xe", { plateNumber: "79A-666.66", chassisNumber: "DP7966666", name: "Xe thử 79A-666.66", passengerCapacity: 15 });
assert.equal(xe.status, 201, xe.text);
for (const typeCode of ["INSPECTION", "TPL_INSURANCE"]) {
  const gt = await call(ACCOUNTS.admin, "POST", `/api/van-chuyen/xe/${xe.json.vehicle.id}/giay-to`, { typeCode, number: `${typeCode}-79A-666.66`, expiryDate: vnDate(300) });
  assert.equal(gt.status, 201, gt.text);
}
const tTao = await call(ACCOUNTS.admin, "POST", "/api/van-chuyen/chuyen", { requestId: randomUUID(), xeId: xe.json.vehicle.id, taiXePartyId: d.CUONG.partyId, batDau: { ngay: homNay, gio: "23:00" }, ketThuc: { ngay: homNay, gio: "23:55" } });
assert.equal(tTao.status, 201, tTao.text);
const tXep = await call(ACCOUNTS.admin, "POST", `/api/van-chuyen/chuyen/${tTao.json.chuyen.id}/phan-bo`, { version: tTao.json.chuyen.version, requestId: randomUUID(), chang: [{ legId: legH1, soSuat: 1 }, { legId: legH2, soSuat: 2 }] });
assert.equal(tXep.status, 200, tXep.text);
const TH = tXep.json.chuyen;

/** Nhóm chỉ đường theo id điểm: nhãn, href, target, rel, destination giải mã, tập tham số. */
const nhom = (p) => p.ev(`[...document.querySelectorAll('.dp-run[data-diem]')].map((el) => ({ id: el.dataset.diem, noi: el.querySelector('.dp-run-noi')?.innerText.trim() ?? null,
  nut: [...el.querySelectorAll('.dp-run-chi-duong a')].map((a) => ({ nhan: a.innerText.trim(), href: a.getAttribute('href'), target: a.getAttribute('target'), rel: a.getAttribute('rel'), banDo: a.dataset.banDo,
    dich: new URL(a.href).searchParams.get('destination'), thamSo: [...new URL(a.href).searchParams.keys()].sort() })) }))`);
const datUa = async (p, ua) => p.send("Emulation.setUserAgentOverride", { userAgent: ua });
const moLai = async (p, url, cho) => {
  await p.send("Page.navigate", { url });
  await p.waitFor(cho, "màn chuyến tải xong", 12000);
  await sleep(300);
};

try {
  // ---- An: chuyến NGÀY MAI (ngoài ngày chạy) ---------------------------------------------------------------------------------------------------------------
  let p = await env.as(d.AN.account, "/", MOB);
  await b.step("1", `390 An: chuyến NGÀY MAI trước xuất bến KHÔNG nhóm Chỉ đường; xuất bến SỚM (Q-L3-B) vẫn không; GET không có khoá diaChiChiDuong`, async () => {
    await datUa(p, UA_IPHONE);
    await moLai(p, `${env.base}/cuoc-chuyen?id=${d.T4.id}`, `!!document.querySelector('[data-action="xuat-ben"]') && document.querySelectorAll('.dp-cc-diem .dp-run').length >= 2`);
    assert.equal(await p.ev("navigator.userAgent.includes('iPhone')"), true, "chống bài rỗng: máy giả lập là iPhone (nút Apple sẽ hiện nếu có khoá)");
    assert.equal(await p.ev("document.querySelectorAll('.dp-run-chi-duong').length"), 0, "ngày mai: không nhóm");
    const x = await fetchTrang(p, "POST", `/api/van-chuyen/cuoc-cua-toi/${d.T4.id}/xuat-ben`, { requestId: randomUUID() });
    assert.equal(x.status, 200, x.text);
    assert.equal(x.json.chuyen.trangThai, "RUNNING", "chống bài rỗng: đã xuất bến sớm");
    await moLai(p, `${env.base}/cuoc-chuyen?id=${d.T4.id}`, `!!document.querySelector('.dp-cc-head')`);
    assert.equal(await p.ev("document.querySelectorAll('.dp-run-chi-duong, a[data-ban-do]').length"), 0, "xuất bến sớm: không nhóm");
    const g = await fetchTrang(p, "GET", `/api/van-chuyen/cuoc-cua-toi/${d.T4.id}`);
    assert.equal(g.json.trongNgayChay, false);
    assert.ok(g.json.diem.length >= 2 && g.json.diem.every((x) => !("diaChiChiDuong" in x)), "GET ngày mai: không khoá");
  });
  await p.close();

  // ---- Cường: chuyến HÔM NAY ------------------------------------------------------------------------------------------------------------------------------------
  p = await env.as(d.CUONG.account, "/", MOB);
  const URL_TH = `${env.base}/cuoc-chuyen?id=${TH.id}`;
  let api = null;
  const diemCua = () => ({
    h1: api.diem.find((x) => x.loai === "PICKUP" && x.tenNoi === "Khách sạn Chỉ Đường Thử"),
    h2: api.diem.find((x) => x.loai === "PICKUP" && x.tenNoi !== "Khách sạn Chỉ Đường Thử"),
    tra: api.diem.find((x) => x.loai === "DROPOFF"),
  });
  await b.step("2", `390 iPhone, chuyến hôm nay TRƯỚC xuất bến: mọi điểm có "Google Maps" + "Apple Maps"; điểm đến = địa chỉ (H1) / tên đã che (H2) / tên bến tàu; chỉ tham số đích; _blank + noreferrer noopener; không tên / SĐT khách${axeNote()}`, async () => {
    await datUa(p, UA_IPHONE);
    await moLai(p, URL_TH, `!!document.querySelector('[data-action="xuat-ben"]') && document.querySelectorAll('.dp-cc-diem .dp-run').length >= 3`);
    api = (await fetchTrang(p, "GET", `/api/van-chuyen/cuoc-cua-toi/${TH.id}`)).json;
    assert.equal(api.trongNgayChay, true);
    const { h1, h2, tra } = diemCua();
    assert.ok(h1 && h2 && tra, `ba điểm: ${JSON.stringify(api.diem)}`);
    const n = await nhom(p);
    assert.equal(n.length, 3, JSON.stringify(n));
    for (const x of n) {
      assert.deepEqual(x.nut.map((k) => k.nhan), ["Google Maps", "Apple Maps"], `điểm ${x.noi}`);
      for (const k of x.nut) {
        assert.equal(k.target, "_blank");
        assert.equal(k.rel, "noreferrer noopener");
        assert.deepEqual(k.thamSo, k.banDo === "google" ? ["api", "destination", "travelmode"] : ["destination", "mode"]);
        assert.ok(k.banDo === "google" ? k.href.startsWith("https://www.google.com/maps/dir/?api=1&destination=") : k.href.startsWith("https://maps.apple.com/directions?destination="), k.href);
        for (const cam of [...TEN_H, "0905123456", "0905 123 456", "0903100391", SDT_LIEN_HE, "Khách Liên Hệ"]) assert.ok(!decodeURIComponent(k.href).includes(cam), `href lộ ${cam}`);
      }
      assert.equal(x.nut[0].dich, x.nut[1].dich, "hai nút cùng điểm đến");
    }
    const theoId = new Map(n.map((x) => [x.id, x]));
    assert.equal(theoId.get(h1.id).nut[0].dich, DIA_CHI_H1, "H1: địa chỉ danh mục");
    assert.equal(theoId.get(h2.id).nut[0].dich, theoId.get(h2.id).noi, "H2: đúng tên nơi đang hiện (đã che)");
    assert.ok(theoId.get(h2.id).noi.includes("•") && !theoId.get(h2.id).noi.includes("0905"), `H2 đã che: ${theoId.get(h2.id).noi}`);
    assert.equal(theoId.get(tra.id).nut[0].dich, "Bến tàu du lịch Nha Trang", "điểm trả chưa có địa chỉ: tên");
    assert.equal(await p.ev(`document.querySelectorAll('form a[data-ban-do]').length`), 0, "liên kết không nằm trong form");
    assert.equal(await p.ev(noOverflowX), true, "390 không tràn ngang");
    assert.equal(await p.ev(noCode), "");
    await axe(p, "trước xuất bến 390 iPhone");
    await shotFull(p, "chi-duong-truoc-xuat-ben-dien-thoai.png");
  });

  await b.step("3", `390 iPhone: Xuất bến (hộp xác nhận) → đang chạy, nhóm còn đủ; "Đã tới" H1 → vẫn có; "Đã đón" hết khách H1 (điểm DONE) → điểm H1 hết nhóm, điểm khác còn`, async () => {
    const { h1 } = diemCua();
    await p.ev(click('[data-action="xuat-ben"]'));
    await p.waitFor(`!!document.querySelector('[data-action="xuat-ben-xac-nhan"]')`, "hộp xác nhận xuất bến");
    await p.ev(click('[data-action="xuat-ben-xac-nhan"]'));
    await p.waitFor(`!!document.querySelector('.dp-cc-head')`, "màn đang chạy");
    await p.waitFor(`document.querySelectorAll('.dp-run-chi-duong').length === 3`, "đang chạy: ba nhóm");
    await p.ev(click(`#cc-day [data-action="da-toi"][data-diem="${h1.id}"]`));
    await p.waitFor(`document.querySelectorAll('.dp-run[data-diem="${h1.id}"] .dp-khach-btn[data-action="don"]').length === 1`, "nút khách H1");
    assert.equal(await p.ev(`!!document.querySelector('.dp-run[data-diem="${h1.id}"] .dp-run-chi-duong')`), true, "đã tới (ARRIVED): còn nhóm");
    await p.ev(click(`.dp-run[data-diem="${h1.id}"] .dp-khach-btn[data-action="don"]`));
    for (let i = 0; i < 40; i++) {
      const g = await fetchTrang(p, "GET", `/api/van-chuyen/cuoc-cua-toi/${TH.id}`);
      if (g.json.diem.find((x) => x.id === h1.id)?.trangThai === "DONE") break;
      await sleep(250);
    }
    await p.waitFor(`!document.querySelector('.dp-run[data-diem="${h1.id}"] .dp-run-chi-duong')`, "điểm H1 xong → hết nhóm");
    assert.equal(await p.ev("document.querySelectorAll('.dp-run-chi-duong').length"), 2, "hai điểm chưa xong còn nhóm");
  });

  await b.step("4", `390 Android (đặt chuỗi nhận dạng Android, tải lại): mỗi nhóm còn lại CHỈ "Google Maps"`, async () => {
    await datUa(p, UA_ANDROID);
    await moLai(p, URL_TH, `!!document.querySelector('.dp-cc-head') && document.querySelectorAll('.dp-run-chi-duong').length === 2`);
    assert.equal(await p.ev("navigator.userAgent.includes('Android')"), true);
    const n = (await nhom(p)).filter((x) => x.nut.length);
    assert.equal(n.length, 2);
    for (const x of n) assert.deepEqual(x.nut.map((k) => k.nhan), ["Google Maps"], `Android: ${x.noi}`);
    await axe(p, "đang chạy 390 Android");
    await shotFull(p, "chi-duong-android-dien-thoai.png");
  });

  await b.step("5", `1040 (máy Mac / iPhone giả lập): bố cục máy tính, nhóm hai nút, không tràn ngang${axeNote()}`, async () => {
    await p.send("Emulation.setDeviceMetricsOverride", { width: DESK.width, height: DESK.height, deviceScaleFactor: 1, mobile: false });
    await datUa(p, UA_IPHONE);
    await moLai(p, URL_TH, `!!document.querySelector('.dp-cc-head') && document.querySelectorAll('.dp-run-chi-duong').length === 2`);
    for (const x of (await nhom(p)).filter((y) => y.nut.length)) assert.deepEqual(x.nut.map((k) => k.nhan), ["Google Maps", "Apple Maps"]);
    assert.equal(await p.ev(noOverflowX), true);
    await axe(p, "đang chạy 1040");
    await shotFull(p, "chi-duong-dang-chay-may-tinh.png");
    await p.send("Emulation.setDeviceMetricsOverride", { width: MOB.width, height: MOB.height, deviceScaleFactor: 2, mobile: true });
    await moLai(p, URL_TH, `!!document.querySelector('.dp-cc-head') && document.querySelectorAll('.dp-run-chi-duong').length === 2`);
    await shotFull(p, "chi-duong-dang-chay-dien-thoai.png");
  });

  await b.step("6", `mất mạng: "Đã tới" H2 (có mạng) → tắt mạng, "Đã đón" một khách H2 (lệnh không tới máy chủ, dòng "Chưa gửi được") → nhóm của điểm chưa xong vẫn còn; có mạng, bấm lại`, async () => {
    const { h2 } = diemCua();
    await p.ev(click(`#cc-day [data-action="da-toi"][data-diem="${h2.id}"]`));
    await p.waitFor(`document.querySelectorAll('.dp-run[data-diem="${h2.id}"] .dp-khach-btn[data-action="don"]').length === 2`, "nút khách H2");
    await p.send("Network.emulateNetworkConditions", { offline: true, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
    await p.ev(click(`.dp-run[data-diem="${h2.id}"] .dp-khach-btn[data-action="don"]`));
    await p.waitFor(`!!document.querySelector('.dp-khach.is-cho [data-action="bam-lai"]')`, "dòng chưa gửi được");
    assert.equal(await p.ev("document.querySelectorAll('.dp-run-chi-duong').length"), 2, "mất mạng: nhóm của hai điểm chưa xong còn");
    await shotFull(p, "chi-duong-mat-mang-dien-thoai.png");
    await p.send("Network.emulateNetworkConditions", { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
    await p.ev(click('.dp-khach.is-cho [data-action="bam-lai"]'));
    await p.waitFor(`!document.querySelector('.dp-khach.is-cho') && document.querySelectorAll('.dp-khach-kq.is-ok').length === 1`, "đã gửi lại"); // điểm H1 đã xong → thu gọn, dòng khách của nó không còn (việc 9, 12/10)
    assert.equal(await p.ev("document.querySelectorAll('.dp-run-chi-duong').length"), 2);
  });

  await b.step("7", `"Đã đón" khách còn lại → "Đã trả" (hộp) → "Kết thúc chuyến" (hộp): chuyến đã kết thúc hôm nay (vẫn trong ngày chạy) → KHÔNG còn nhóm nào`, async () => {
    const { h2 } = diemCua();
    await p.waitFor(`document.querySelectorAll('.dp-run[data-diem="${h2.id}"] .dp-khach-btn[data-action="don"]:not([disabled])').length === 1`, "nút khách mở khoá");
    await p.ev(click(`.dp-run[data-diem="${h2.id}"] .dp-khach-btn[data-action="don"]`));
    await p.waitFor(`document.querySelectorAll('details.dp-cc-xong li').length === 2`, "đón đủ ba khách (hai điểm đón xong, thu gọn)");
    await p.waitFor(`document.querySelectorAll('.dp-run-chi-duong').length === 1`, "chỉ còn điểm trả có nhóm");
    await p.ev(click('#cc-day [data-action="tra-het"]'));
    await p.waitFor(`!!document.querySelector('[data-action="tra-het-xac-nhan"]')`, "hộp xác nhận đã trả");
    await p.ev(click('[data-action="tra-het-xac-nhan"]'));
    await p.waitFor(`!document.querySelector('[data-action="ket-thuc"]').disabled`, "kết thúc mở");
    await p.ev(click('[data-action="ket-thuc"]'));
    await p.waitFor(`!!document.querySelector('[data-action="ket-thuc-xac-nhan"]')`, "hộp xác nhận kết thúc");
    await p.ev(click('[data-action="ket-thuc-xac-nhan"]'));
    await p.waitFor(`/^Hoàn tất|^Đã kết thúc|^Kết thúc/.test(${txt(".dp-cc-head .chip")} ?? '')`, "chuyến đã kết thúc");
    const g = await fetchTrang(p, "GET", `/api/van-chuyen/cuoc-cua-toi/${TH.id}`);
    assert.equal(g.json.trongNgayChay, true, "chống bài rỗng: chuyến kết thúc hôm nay vẫn trong ngày chạy (DTO còn khoá)");
    assert.ok(g.json.diem.every((x) => "diaChiChiDuong" in x));
    assert.equal(await p.ev("document.querySelectorAll('.dp-run-chi-duong, a[data-ban-do]').length"), 0, "chuyến đã kết thúc: không nhóm");
    await shotFull(p, "chi-duong-ket-thuc-dien-thoai.png");
  });

  await b.step("8", `cả phiên: trang KHÔNG gọi miền google / apple nào; không lỗi console; không mã thô`, async () => {
    const ngoai = p.requests.map((r) => r.url).filter((u) => /google|apple/i.test(new URL(u).hostname));
    assert.deepEqual(ngoai, []);
    assert.deepEqual(p.consoleErrors, []);
    assert.equal(await p.ev(noCode), "");
  });
  await p.close();
} finally {
  b.xong();
  await env.stop();
}
