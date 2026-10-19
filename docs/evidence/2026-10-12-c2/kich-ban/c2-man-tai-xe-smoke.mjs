// Việc 9 (C2) của gói A+C Vận chuyển — màn tài xế đang chạy (/cuoc-chuyen), đánh giá ERP 7/10: C53 "Đã đón N khách", C54 "Điểm kế tiếp" + nút chính dính đáy +
// điểm xong thu gọn + giờ hẹn ≥ 16px, C56 khoá nút khi đang gửi (chạm đúp), C57 nút "Kết thúc chuyến" khớp máy chủ, C59 đồng hồ chờ, C61 nút "Hỗ trợ".
// Đi đường thật (route API), tên / SĐT / biển số GIẢ. Hai chuyến HÔM NAY (23:00) nên phải chạy trước 22:50 giờ VN:
//   X (Cường, xe 79A-444.44): ba điểm đón (3 + 2 + 1 khách) + một điểm trả chung — C54, C53, C56, C59, C61.
//   Y (Dũng, xe 79A-555.55): một điểm đón 2 khách → cả đoàn Vắng — C57.
// Chạy từ GỐC repo, sau `npm run build:web` (không cần mạng ngoài):
//   AXE_JS=<…/axe.min.js> CHROME_BIN=docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh OUT=docs/evidence/2026-10-12-c2 node docs/evidence/2026-10-12-c2/kich-ban/c2-man-tai-xe-smoke.mjs
// Kho cookie của Chrome dùng CHUNG, mỗi tài khoản một phiên (ADR-0075): đóng trang cũ trước khi mở trang của người khác.
import { randomUUID } from "node:crypto";
import {
  ACCOUNTS, CHU, DESK, MOB, LOC_BEN_TAU, apiCalls, assert, axe, axeNote, boDem, click, dungDuLieuDieuPhoi, dungMoiTruong, fetchTrang, noCode, noOverflowX, shotFull, shotView, sleep, txt, vnDate,
} from "../../2026-09-29-adr-0049/kich-ban/dp-lib.mjs";

const { env, call } = await dungMoiTruong([CHU]);
const b = boDem("C2 MAN TAI XE");
const d = await dungDuLieuDieuPhoi(env, call);
const gioVn = new Date(Date.now() + 7 * 3600_000).toISOString().slice(11, 16);
assert.ok(gioVn < "22:50", `kịch bản cần chạy trước 22:50 giờ VN (chuyến hôm nay 23:00) — bây giờ ${gioVn}`);
const homNay = vnDate(0);
const han = vnDate(300);
const SDT_DON = "0903 100 7";

const taoXe = async (bien) => {
  const v = await call(ACCOUNTS.admin, "POST", "/api/van-chuyen/xe", { plateNumber: bien, chassisNumber: `C2${bien.replace(/\D/g, "")}`, name: `Xe thử ${bien}`, passengerCapacity: 15 });
  assert.equal(v.status, 201, `xe ${bien}: ${v.text}`);
  for (const typeCode of ["INSPECTION", "TPL_INSURANCE"]) {
    const g = await call(ACCOUNTS.admin, "POST", `/api/van-chuyen/xe/${v.json.vehicle.id}/giay-to`, { typeCode, number: `${typeCode}-${bien}`, expiryDate: han });
    assert.equal(g.status, 201, `giấy ${typeCode} ${bien}: ${g.text}`);
  }
  return v.json.vehicle;
};
const taoTaiXe = async (ten, sdt) => {
  const tk = await call(ACCOUNTS.chu, "POST", "/api/staff", { taoHoSoMoi: true, fullName: ten, phone: sdt, roles: ["DRIVER_INTERNAL"] });
  assert.equal(tk.status, 201, `tài xế ${ten}: ${tk.text}`);
  const [{ party_id: partyId }] = env.sql(`SELECT party_id FROM staff WHERE id = '${tk.json.staff.id}'`);
  const gp = await call(ACCOUNTS.admin, "POST", `/api/parties/${partyId}/documents`, { typeCode: "GPLX", number: `79${sdt.slice(-9)}`, classCode: "D2", expiryDate: han });
  assert.equal(gp.status, 201, `GPLX ${ten}: ${gp.text}`);
  return { partyId, account: { name: ten, phone: tk.json.staff.phone, pin: tk.json.pin, permissions: ["DRIVER"] } };
};
/** Đơn hôm nay (đặt gấp — mốc đang 48 giờ — rồi xác nhận): trả legId. */
const dungDon = async (gio, noiDon, ten, sdt) => {
  const o = await call(ACCOUNTS.salesA, "POST", "/api/orders", {
    customerName: `Khách C2 ${noiDon}`, customerPhone: sdt, customerEmail: "", customerNote: "", discount: 0, depositAmount: 0, depositMethod: null, paymentNote: "",
    services: [{
      kind: "catalog", pickupChoice: "DON", catalogCode: "TD101", pax: { adult: ten.length, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: 1350000 },
      departTime: "", pickupTime: "", pickupPlace: "", checkinDate: "", checkinTime: "", checkinPlace: "", note: "", departDate: homNay,
      legs: [{ direction: "OUT", pickupDate: homNay, pickupTime: gio, pickupLocationId: null, pickupPlace: noiDon, dropoffLocationId: LOC_BEN_TAU, dropoffPlace: "" }],
    }],
    passengers: ten.map((fullName, i) => ({ fullName, birthYear: 1980 + i, paxCode: null })),
  });
  assert.equal(o.status, 201, `lập đơn ${noiDon}: ${o.text}`);
  const legId = o.json.order.services[0].legs[0].id;
  const g = await call(ACCOUNTS.admin, "POST", `/api/orders/${o.json.order.id}/legs/${legId}/short-notice`, { lyDo: "KHACH_DOAN_GOI_GAP" });
  assert.equal(g.status, 200, `đặt gấp ${noiDon}: ${g.text}`);
  const c = await call(ACCOUNTS.admin, "POST", `/api/orders/${o.json.order.id}/status`, { status: "confirmed" });
  assert.equal(c.status, 200, `xác nhận ${noiDon}: ${c.text}`);
  return legId;
};
const dungChuyen = async (xe, taiXe, legs) => {
  const t = await call(ACCOUNTS.admin, "POST", "/api/van-chuyen/chuyen", { requestId: randomUUID(), xeId: xe.id, taiXePartyId: taiXe.partyId, batDau: { ngay: homNay, gio: "23:00" }, ketThuc: { ngay: homNay, gio: "23:55" } });
  assert.equal(t.status, 201, `tạo chuyến: ${t.text}`);
  const x = await call(ACCOUNTS.admin, "POST", `/api/van-chuyen/chuyen/${t.json.chuyen.id}/phan-bo`, { version: t.json.chuyen.version, requestId: randomUUID(), chang: legs.map((l) => ({ legId: l.legId, soSuat: l.soSuat })) });
  assert.equal(x.status, 200, `xếp chuyến: ${x.text}`);
  return x.json.chuyen;
};

const TEN_A = ["Khách Một A", "Khách Một B", "Khách Một C"];
const TEN_B = ["Khách Hai A", "Khách Hai B"];
const TEN_C = ["Khách Ba A"];
const TEN_D = ["Khách Vắng A", "Khách Vắng B"];
const XE_X = await taoXe("79A-444.44");
const XE_Y = await taoXe("79A-555.55");
const DUNG = await taoTaiXe("Đỗ Văn Dũng", "0900000471");
const legA = await dungDon("23:10", "InterContinental Nha Trang", TEN_A, `${SDT_DON}01`);
const legB = await dungDon("23:20", "Liberty Central Nha Trang", TEN_B, `${SDT_DON}02`);
const legC = await dungDon("23:30", "Vinpearl Resort Nha Trang", TEN_C, `${SDT_DON}03`);
const legD = await dungDon("23:15", "Hilton Nha Trang", TEN_D, `${SDT_DON}04`);
const X = await dungChuyen(XE_X, d.CUONG, [{ legId: legA, soSuat: 3 }, { legId: legB, soSuat: 2 }, { legId: legC, soSuat: 1 }]);
const Y = await dungChuyen(XE_Y, DUNG, [{ legId: legD, soSuat: 2 }]);

// Chuyến thứ ba (tài xế Tâm, xe 79A-666.66 — người và xe khác để khỏi vướng khoảng nghỉ sau chuyến trước) chỉ để chụp màn đang chạy ở 1040. Dựng SỚM: khi trình duyệt
// đã đăng nhập Bán hàng thì `call(salesA)` bị đá phiên (ADR-0075).
const TAM = await taoTaiXe("Võ Văn Tâm", "0900000472");
const XE_Z = await taoXe("79A-666.66");
const legE = await dungDon("23:12", "Sheraton Nha Trang", ["Khách Máy Tính A", "Khách Máy Tính B"], `${SDT_DON}05`);
const Z = await dungChuyen(XE_Z, TAM, [{ legId: legE, soSuat: 2 }]);

const posts = (p, duoi) => apiCalls(p).filter((r) => r.method === "POST" && r.path.endsWith(duoi));
const sheetOpen = `!!document.querySelector('.sheet-root .sheet[role="dialog"]')`;
const sheetRows = `[...document.querySelectorAll('.sheet .dp-xn-ds dt')].map((dt) => [dt.innerText.trim(), dt.nextElementSibling.innerText.trim()])`;
const net = (p, v) => p.send("Network.emulateNetworkConditions", { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1, ...v });
const hien = (sel) => `[...document.querySelectorAll(${JSON.stringify(sel)})].filter((x) => x.getClientRects().length > 0).length`;
/** Nút (hoặc phần tử) có ĐANG nằm trong khung nhìn và chính nó được trúng ở tâm không (không bị thanh tab / nút nổi che). */
const trungTam = (sel) => `(() => { const el = [...document.querySelectorAll(${JSON.stringify(sel)})].find((x) => x.getClientRects().length > 0); if (!el) return 'không thấy'; const r = el.getBoundingClientRect(); if (r.bottom > window.innerHeight || r.top < 0) return 'ngoài khung nhìn'; const t = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return t && (el === t || el.contains(t)) ? 'ok' : (t ? (t.closest('#tabbar') ? 'thanh tab che' : t.closest('#tl-fab') ? 'nút Hỗ trợ che' : t.tagName + '.' + t.className) : 'ngoài khung'); })()`;
const chiTiet = async (p, id) => (await fetchTrang(p, "GET", `/api/van-chuyen/cuoc-cua-toi/${id}`)).json;

try {
  // ---- Chuyến X: Cường ---------------------------------------------------------------------------------------------------------------------------------
  let p = await env.as(d.CUONG.account, `/cuoc-chuyen?id=${X.id}`, MOB);
  await b.step("1", `C61 390: chuyến chưa chạy CÓ nút nổi "Hỗ trợ"; "Xuất bến" xong (đang chạy) thì nút nổi biến mất (body.cc-dang-chay), nút dính đáy là việc chính${axeNote()}`, async () => {
    await p.waitFor(`!!document.querySelector('[data-action="xuat-ben"]:not([disabled])')`, "nút xuất bến", 12000);
    await p.waitFor(`!!document.getElementById('tl-fab')`, "nút Hỗ trợ có mặt (không có nút thì phép kiểm 'ẩn' vô nghĩa)", 12000);
    assert.equal(await p.ev(`document.getElementById('tl-fab').getClientRects().length > 0`), true, "chưa chạy: nút Hỗ trợ hiện");
    // Chuyến chưa chạy: nút nổi vẫn NÉ thanh dính đáy (Kiểu D a, `.thanh-hanh-dong-cuoi`) — không giao nút "Xuất bến".
    await sleep(600);
    assert.equal(await p.ev(`(() => { const a = document.getElementById('tl-fab').getBoundingClientRect(), b = document.querySelector('[data-action="xuat-ben"]').getBoundingClientRect(); return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top; })()`), false, "nút Hỗ trợ không đè nút Xuất bến");
    await p.ev(click('[data-action="xuat-ben"]'));
    await p.waitFor(sheetOpen, "hộp xác nhận xuất bến");
    await p.ev(click('[data-action="xuat-ben-xac-nhan"]'));
    await p.waitFor(`!!document.querySelector('.dp-cc-head')`, "màn đang chạy");
    assert.equal(await p.ev(`document.body.classList.contains('cc-dang-chay')`), true);
    assert.equal(await p.ev(`!!document.getElementById('tl-fab')`), true, "nút vẫn nằm trong trang (chỉ bị ẩn)");
    assert.equal(await p.ev(`document.getElementById('tl-fab').getClientRects().length`), 0, "đang chạy: nút Hỗ trợ ẩn");
    assert.equal(await p.ev(noCode), "");
  });
  const ct = await chiTiet(p, X.id);
  const diemDon = [...ct.diem].filter((x) => x.loai === "PICKUP").sort((a, c) => a.thuTu - c.thuTu);
  const diemTra = ct.diem.find((x) => x.loai === "DROPOFF");
  assert.equal(diemDon.length, 3, JSON.stringify(ct.diem.map((x) => [x.thuTu, x.loai, x.tenNoi])));

  await b.step("2", `C54 390: "Điểm kế tiếp" = đúng MỘT thẻ (điểm đón 1, viền nổi), "Các điểm sau (3)" = 2 điểm đón + điểm trả; giờ hẹn ≥ 16px; nút chính "Đã tới" dính đáy, trúng ngay khi chưa cuộn; thẻ KHÔNG còn nút "Đã tới" trùng; "Kết thúc chuyến" khoá có đúng một nút + câu còn việc`, async () => {
    const muc = await p.ev(`[...document.querySelectorAll('#cc-trang h2.dp-cc-muc')].map((x) => x.innerText.trim())`);
    assert.deepEqual(muc, ["Điểm kế tiếp", "Các điểm sau (3)"]);
    assert.deepEqual(await p.ev(`[...document.querySelectorAll('.dp-cc-ke-tiep .dp-run')].map((x) => [x.dataset.diem, x.classList.contains('is-ke-tiep')])`), [[diemDon[0].id, true]]);
    assert.deepEqual(await p.ev(`[...document.querySelectorAll('.dp-cc-khoi:not(:has(.dp-cc-ke-tiep)) .dp-run')].map((x) => x.dataset.diem)`), [diemDon[1].id, diemDon[2].id, diemTra.id]);
    const px = await p.ev(`[...document.querySelectorAll('#cc-trang .dp-run-loai')].map((x) => parseFloat(getComputedStyle(x).fontSize))`);
    assert.ok(px.length >= 4 && px.every((v) => v >= 16), `giờ hẹn / loại điểm ≥ 16px: ${JSON.stringify(px)}`);
    assert.match(await p.ev(txt(`.dp-run[data-diem="${diemDon[0].id}"] .dp-run-loai`)), /^ĐÓN · HẸN 23:10/);
    assert.equal(await p.ev(txt('#cc-day [data-action="da-toi"]')), "Đã tới");
    assert.equal(await p.ev(`document.querySelector('#cc-day [data-action="da-toi"]').dataset.diem`), diemDon[0].id);
    assert.equal(await p.ev(txt("#cc-day .dp-cc-foot")), `Điểm 1 · InterContinental Nha Trang`);
    assert.equal(await p.ev(`document.querySelectorAll('.dp-run[data-diem="${diemDon[0].id}"] [data-action="da-toi"]').length`), 0, "điểm kế tiếp không vẽ nút Đã tới thứ hai");
    assert.equal(await p.ev(`document.querySelectorAll('.dp-run[data-diem="${diemDon[1].id}"] [data-action="da-toi"]').length`), 1, "điểm sau vẫn có nút của riêng nó");
    assert.equal(await p.ev(trungTam('#cc-day [data-action="da-toi"]')), "ok", "nút chính trúng ngay ở khung đầu, không bị thanh tab che");
    assert.equal(await p.ev(`document.querySelectorAll('[data-action="ket-thuc"]').length`), 1, "đúng một nút Kết thúc chuyến");
    assert.equal(await p.ev(`document.querySelector('[data-action="ket-thuc"]').disabled`), true);
    assert.equal(await p.ev(txt(".dp-run-end .dp-note")), "Bấm được khi xong hết: còn 6 khách và 4 điểm.");
    assert.equal(await p.ev(hien(".dp-cc-xong")), 0, "chưa điểm nào xong: chưa có khối thu gọn");
    assert.ok(await p.ev(noOverflowX));
    await axe(p, "đang chạy 390");
    await p.ev("window.scrollTo(0, 0), true");
    await shotView(p, "c54-diem-ke-tiep-khung-dau-390.png");
    await shotFull(p, "c54-chay-ca-trang-390.png");
  });

  await b.step("3", `C59 390: bấm nút chính "Đã tới" → khách hiện; dòng "Vừa tới" ở điểm đón còn khách chờ; vòng 1 giây tự đổi chữ khi phút trôi (sửa mốc → "Đã chờ 7 phút") KHÔNG vẽ lại trang; bắt đầu không có ngưỡng nào khoá "Vắng"`, async () => {
    await p.ev(click('#cc-day [data-action="da-toi"]'));
    await p.waitFor(`document.querySelectorAll('.dp-khach-btn[data-action="don"]').length === 3`, "ba nút Đã đón");
    await sleep(2500); // chờ tin Bảng tin của chính lệnh "Đã tới" vẽ lại xong, rồi mới chỉnh mốc thử
    assert.match(await p.ev(txt(".dp-cho-vang")), /^(Vừa tới|Đã chờ \d+ phút)$/);
    assert.equal(await p.ev(`document.querySelector('.dp-cho-vang').getAttribute('aria-live')`), null, "không aria-live trên chữ tự đổi");
    const nut = await p.ev(`(() => { const e = document.querySelector('.dp-cho-vang'); e.dataset.daDanhDau = '1'; document.querySelector('[data-cho-tu]').dataset.choTu = String(Date.now() - 7 * 60000); return true; })()`);
    assert.ok(nut);
    await p.waitFor(`document.querySelector('[data-cho-tu]').textContent === 'Đã chờ 7 phút'`, "đồng hồ tự đổi chữ", 4000);
    assert.equal(await p.ev(`document.querySelector('.dp-cho-vang').dataset.daDanhDau`), "1", "chỉ đổi chữ — phần tử không bị dựng lại");
    assert.equal(await p.ev(`document.querySelectorAll('.dp-khach-btn[data-action="vang"]:not([disabled])').length`), 3, "đồng hồ chỉ hiển thị, không khoá nút Vắng");
    assert.equal(await p.ev(txt('#cc-day [data-action="don-tat-ca"]')), "Đã đón 3 khách", "nút chính chuyển sang Đã đón N khách");
    await p.ev("window.scrollTo(0, 0), true");
    await shotView(p, "c59-dong-ho-cho-va-da-don-n-khach-390.png");
  });

  await b.step("4", `C56 390 (mạng chậm 1,2 giây): chạm đúp "Vắng" → đúng MỘT lệnh, KHÔNG dải đỏ; trong lúc bay mọi nút khoá, kể cả khi trang vẽ lại giữa chừng (tin / nối lại mạng); xong thì mở lại`, async () => {
    await net(p, { latency: 1200 });
    const truoc = posts(p, "/vang").length;
    await p.ev(`(() => { const el = [...document.querySelectorAll('.dp-khach-btn[data-action="vang"]')].find((x) => x.getClientRects().length > 0); el.click(); el.click(); return true; })()`);
    assert.equal(await p.ev(`[...document.querySelectorAll('#cc-trang button, #cc-day button')].every((x) => x.disabled)`), true, "đang gửi: mọi nút khoá");
    await p.ev(`window.dispatchEvent(new Event("can-tai-lai")), true`); // vẽ lại giữa chừng (như tin Bảng tin của chính lệnh này)
    await sleep(700);
    assert.equal(await p.ev(`[...document.querySelectorAll('#cc-trang button, #cc-day button')].every((x) => x.disabled)`), true, "vẽ lại giữa chừng vẫn khoá (khoá nằm ở trạng thái vẽ, không chỉ ở thuộc tính nút)");
    await p.waitFor(`document.querySelectorAll('.dp-khach-kq.is-vang').length === 1`, "một khách Vắng", 15000);
    await net(p, { latency: 0 });
    assert.equal(posts(p, "/vang").length - truoc, 1, "chạm đúp = một lệnh");
    assert.equal(await p.ev(hien("#cc-trang .banner-danger")), 0, "không dải đỏ");
    await p.waitFor(`document.querySelectorAll('.dp-khach-btn:disabled, #cc-day button:disabled, .dp-gian-doan:disabled').length === 0`, "mở khoá lại (nút khách, nút chính, Kết thúc gián đoạn)", 6000);
    assert.equal(await p.ev(txt('#cc-day [data-action="don-tat-ca"]')), "Đã đón 2 khách", "khách Vắng không tính vào Đã đón N");
  });

  await b.step("5", `C53 390: "Đã đón 2 khách" mở hộp (nơi + số khách; chưa gửi gì); quay lại không gửi; xác nhận → đúng 2 lệnh /don lần lượt + đọc lại chi tiết ÍT lượt (không 3 lượt mỗi khách); điểm 1 thu gọn vào "Đã xong (1 điểm)" kèm dòng "Vừa ghi"; điểm 2 thành "Điểm kế tiếp"${axeNote()}`, async () => {
    await p.ev(click('#cc-day [data-action="don-tat-ca"]'));
    await p.waitFor(sheetOpen, "hộp Đã đón N khách");
    assert.deepEqual(await p.ev(sheetRows), [["Điểm đón", "InterContinental Nha Trang"], ["Ghi", "2 khách đã lên xe"]]);
    assert.equal(await p.ev(txt('[data-action="don-tat-ca-xac-nhan"]')), "Đã đón 2 khách");
    assert.equal(await p.ev(`[...document.querySelectorAll('.sheet-foot .vc-btn')].every((x) => x.scrollWidth <= x.clientWidth + 1)`), true, "chữ nút chân hộp không tràn");
    const truocDon = posts(p, "/don").length;
    assert.equal(truocDon, 0, "chưa gửi gì khi mới mở hộp");
    await axe(p, "hộp Đã đón N khách 390");
    await shotView(p, "c53-hop-da-don-n-khach-390.png");
    await p.ev(click('[data-action="don-tat-ca-dong"]'));
    await p.waitFor(`!${sheetOpen}`, "đóng hộp");
    assert.equal(posts(p, "/don").length, 0, "quay lại: không gửi");
    const getTruoc = apiCalls(p).filter((r) => r.method === "GET" && r.path === `/api/van-chuyen/cuoc-cua-toi/${X.id}`).length;
    await p.ev(click('#cc-day [data-action="don-tat-ca"]'));
    await p.waitFor(sheetOpen, "mở lại hộp");
    await p.ev(click('[data-action="don-tat-ca-xac-nhan"]'));
    await p.waitFor(`!!document.querySelector('details.dp-cc-xong')`, "điểm 1 thu gọn", 10000);
    assert.equal(posts(p, "/don").length, 2, "đúng 2 lệnh Đã đón");
    const getSau = apiCalls(p).filter((r) => r.method === "GET" && r.path === `/api/van-chuyen/cuoc-cua-toi/${X.id}`).length;
    assert.ok(getSau - getTruoc <= 2, `đọc lại chi tiết ít lượt (không mỗi khách một lần): +${getSau - getTruoc}`);
    assert.equal(await p.ev(txt("details.dp-cc-xong summary")), "Đã xong (1 điểm)");
    assert.equal(await p.ev(`document.querySelector('details.dp-cc-xong').open`), false, "thu gọn");
    assert.match(await p.ev(`document.querySelector('details.dp-cc-xong').textContent.replace(/\\s+/g, ' ')`), /InterContinental Nha Trang.*2 đã đón · 1 vắng/);
    assert.equal(await p.ev(txt(".dp-vua-ghi-dau")), "Vừa ghi: 2 khách ở InterContinental Nha Trang — Đã đón. Sai? Báo văn phòng.", "dòng Vừa ghi vẫn thấy dù điểm đã thu gọn");
    assert.deepEqual(await p.ev(`[...document.querySelectorAll('.dp-cc-ke-tiep .dp-run')].map((x) => x.dataset.diem)`), [diemDon[1].id]);
    assert.equal(await p.ev(txt('#cc-day [data-action="da-toi"]')), "Đã tới");
    assert.match(await p.ev(txt(".dp-cc-head")), / · trên xe 2\/15$/);
    assert.equal(await p.ev(noCode), "");
    await p.ev("window.scrollTo(0, 0), true");
    await shotView(p, "c53-sau-da-don-diem-1-thu-gon-390.png");
    await p.ev(`document.querySelector('details.dp-cc-xong summary').click(), true`);
    await sleep(300);
    await shotFull(p, "c54-diem-xong-mo-ra-390.png");
    await p.ev(`document.querySelector('details.dp-cc-xong summary').click(), true`);
  });

  await b.step("6", `C53 + C56 mất mạng giữa chừng: điểm 2 (2 khách) "Đã tới" → "Đã đón 2 khách" xác nhận khi MẤT MẠNG → dải "Chưa gửi được" + "Bấm lại" (máy KHÔNG tự gửi lại); có mạng, bấm lại → cả hai khách đã đón, lệnh gửi lại CÙNG requestId`, async () => {
    await p.ev(click('#cc-day [data-action="da-toi"]'));
    await p.waitFor(`document.querySelectorAll('.dp-khach-btn[data-action="don"]').length === 2`, "hai khách điểm 2");
    await p.ev(click('#cc-day [data-action="don-tat-ca"]'));
    await p.waitFor(sheetOpen, "hộp");
    await net(p, { offline: true });
    const truoc = posts(p, "/don").length;
    await p.ev(click('[data-action="don-tat-ca-xac-nhan"]'));
    await p.waitFor(`!!document.querySelector('#cc-trang > .dp-khach-cho [data-action="bam-lai"]')`, "dòng chưa gửi được");
    await sleep(2200);
    const thu1 = posts(p, "/don").slice(truoc);
    assert.equal(thu1.length, 1, "chỉ thử MỘT lần (lệnh đầu rớt thì dừng), không tự gửi lại");
    await shotView(p, "c53-mat-mang-bam-lai-390.png");
    await net(p, {});
    await p.ev(click('#cc-trang > .dp-khach-cho [data-action="bam-lai"]'));
    await p.waitFor(`!!document.querySelector('details.dp-cc-xong') && document.querySelectorAll('details.dp-cc-xong li').length === 2`, "điểm 2 xong", 10000);
    const tat = posts(p, "/don").slice(truoc);
    const theoSuat = new Map();
    for (const r of tat) theoSuat.set(r.path, [...(theoSuat.get(r.path) ?? []), JSON.parse(r.body).requestId]);
    assert.equal(theoSuat.size, 2, JSON.stringify([...theoSuat.keys()]));
    const [dau] = [...theoSuat.values()];
    assert.equal(dau.length, 2, "suất đầu: thử lần rớt mạng + bấm lại");
    assert.equal(dau[0], dau[1], "bấm lại dùng CÙNG requestId");
    assert.match(await p.ev(txt(".dp-cc-head")), / · trên xe 4\/15$/);
  });

  await b.step("7", `C54 + C57 + C53 390: điểm 3 (1 khách) "Đã tới" → "Đã đón 1 khách"; rồi điểm trả: nút chính "Đã trả" → xác nhận; khi XONG HẾT thì nút chính dính đáy là "Kết thúc chuyến" (một nút duy nhất, khối cuối chỉ còn hai nút phụ); hộp tóm tắt → kết thúc${axeNote()}`, async () => {
    await p.ev(click('#cc-day [data-action="da-toi"]'));
    await p.waitFor(`document.querySelectorAll('.dp-khach-btn[data-action="don"]').length === 1`, "một khách điểm 3");
    assert.equal(await p.ev(txt('#cc-day [data-action="don-tat-ca"]')), "Đã đón 1 khách");
    await p.ev(click('#cc-day [data-action="don-tat-ca"]'));
    await p.waitFor(sheetOpen, "hộp");
    await p.ev(click('[data-action="don-tat-ca-xac-nhan"]'));
    await p.waitFor(`document.querySelectorAll('details.dp-cc-xong li').length === 3`, "ba điểm đón đã xong", 10000);
    assert.equal(await p.ev(txt('#cc-day [data-action="tra-het"]')), "Đã trả");
    assert.equal(await p.ev(`document.querySelectorAll('.dp-run[data-diem="${diemTra.id}"] [data-action="tra-het"]').length`), 0, "điểm trả: nút Đã trả chỉ ở thanh dính đáy");
    await p.ev(click('#cc-day [data-action="tra-het"]'));
    await p.waitFor(sheetOpen, "hộp Đã trả");
    assert.equal(await p.ev(txt('[data-action="tra-het-xac-nhan"]')), "Đã trả 5 khách");
    await p.ev(click('[data-action="tra-het-xac-nhan"]'));
    await p.waitFor(`!!document.querySelector('#cc-day [data-action="ket-thuc"]:not([disabled])')`, "Kết thúc chuyến sáng ở thanh dính đáy", 10000);
    assert.equal(await p.ev(`document.querySelectorAll('[data-action="ket-thuc"]').length`), 1, "một nút Kết thúc chuyến duy nhất");
    assert.equal(await p.ev(`document.querySelectorAll('.dp-run-end [data-action="ket-thuc"]').length`), 0, "khối cuối không còn nút Kết thúc chuyến thứ hai");
    assert.equal(await p.ev(txt("#cc-day .dp-cc-foot")), "Đã xong mọi điểm.");
    assert.equal(await p.ev(`document.querySelectorAll('.dp-run-end button').length`), 1, "khối cuối chỉ còn Kết thúc gián đoạn (không có xe để nhờ khi hết khách)");
    await axe(p, "xong mọi điểm 390");
    assert.equal(await p.ev(trungTam('#cc-day [data-action="ket-thuc"]')), "ok");
    await p.ev("window.scrollTo(0, 0), true");
    await shotView(p, "c54-xong-het-ket-thuc-chuyen-dinh-day-390.png");
    await p.ev(click('#cc-day [data-action="ket-thuc"]'));
    await p.waitFor(sheetOpen, "hộp Kết thúc");
    assert.deepEqual(await p.ev(sheetRows), [["Đã trả", "5 khách"], ["Vắng", "1 khách"], ["Khách đã huỷ", "0 khách"]]);
    await p.ev(click('[data-action="ket-thuc-xac-nhan"]'));
    await p.waitFor(`/Đã kết thúc/.test(document.querySelector('.dp-cc-head')?.innerText ?? '') && !document.querySelector('#cc-day [data-action]')`, "chuyến đã kết thúc", 10000);
    assert.equal(await p.ev(`document.body.classList.contains('cc-dang-chay')`), false, "hết chạy: nút Hỗ trợ trở lại");
    assert.equal(await p.ev(`document.getElementById('tl-fab').getClientRects().length > 0`), true);
  });
  p.close();

  // ---- Chuyến Y: Dũng — cả đoàn Vắng (C57) ------------------------------------------------------------------------------------------------------------------
  p = await env.as(DUNG.account, `/cuoc-chuyen?id=${Y.id}`, MOB);
  const ctY = await (async () => {
    await p.waitFor(`!!document.querySelector('[data-action="xuat-ben"]:not([disabled])')`, "nút xuất bến Y", 12000);
    await p.ev(click('[data-action="xuat-ben"]'));
    await p.waitFor(sheetOpen, "hộp xuất bến");
    await p.ev(click('[data-action="xuat-ben-xac-nhan"]'));
    await p.waitFor(`!!document.querySelector('.dp-cc-head')`, "Y đang chạy");
    return chiTiet(p, Y.id);
  })();
  const diemTraY = ctY.diem.find((x) => x.loai === "DROPOFF");
  await b.step("8", `C57 390: cả đoàn VẮNG → điểm đón xong nhưng điểm trả còn chưa tới: nút "Kết thúc chuyến" KHOÁ (khớp máy chủ: POST ket-thuc → 409 con_khach_chua_xong), nút chính là "Đã trả"; bấm "Đã trả" → hộp cảnh báo "Vẫn ghi đã tới" → xong thì "Kết thúc chuyến" sáng và kết thúc được`, async () => {
    await p.ev(click('#cc-day [data-action="da-toi"]'));
    await p.waitFor(`document.querySelectorAll('.dp-khach-btn[data-action="vang"]').length === 2`, "hai khách điểm Hilton");
    // Khách đầu: mất mạng → "Chưa gửi được" ở dòng khách → có mạng bấm lại (cùng requestId) → Vắng (kịch bản cuoc-smoke bước 5, nay trên bố cục mới).
    await net(p, { offline: true });
    const truocV = posts(p, "/vang").length;
    await p.ev(click('.dp-khach-btn[data-action="vang"]'));
    await p.waitFor(`!!document.querySelector('.dp-khach.is-cho [data-action="bam-lai"]')`, "dòng khách chưa gửi được");
    await net(p, {});
    await p.ev(click('.dp-khach.is-cho [data-action="bam-lai"]'));
    await p.waitFor(`document.querySelectorAll('.dp-khach-btn[data-action="vang"]:not([disabled])').length === 1`, "còn 1 khách chờ sau bấm lại (nút đã mở khoá)", 10000);
    const idV = posts(p, "/vang").slice(truocV).map((r) => JSON.parse(r.body).requestId);
    assert.equal(idV.length, 2, "một lần rớt mạng + một lần bấm lại");
    assert.equal(idV[0], idV[1], "bấm lại dùng CÙNG requestId");
    await p.ev(click('.dp-khach-btn[data-action="vang"]'));
    await p.waitFor(`document.querySelectorAll('.dp-khach-btn[data-action="vang"]').length === 0`, "hết khách chờ");
    await p.waitFor(`!!document.querySelector('details.dp-cc-xong')`, "điểm đón thu gọn");
    assert.match(await p.ev(`document.querySelector('details.dp-cc-xong').textContent.replace(/\\s+/g, ' ')`), /Hilton Nha Trang.*2 vắng/);
    assert.equal(await p.ev(`document.querySelector('[data-action="ket-thuc"]').disabled`), true, "cả đoàn vắng mà điểm trả chưa tới: nút Kết thúc khoá");
    assert.equal(await p.ev(txt(".dp-run-end .dp-note")), "Bấm được khi xong hết: còn 1 điểm.");
    assert.equal(await p.ev(txt('#cc-day [data-action="tra-het"]')), "Đã trả", "lối ra: ghi đã tới điểm trả");
    const may = await p.ev(`fetch(${JSON.stringify(`/api/van-chuyen/cuoc-cua-toi/${Y.id}/ket-thuc`)}, { method: "POST", headers: { "content-type": "application/json" }, body: ${JSON.stringify(JSON.stringify({ requestId: randomUUID() }))} }).then(async (r) => ({ status: r.status, code: (await r.json()).error?.code }))`);
    assert.deepEqual(may, { status: 409, code: "con_khach_chua_xong" }, "máy chủ cũng từ chối — màn khoá là ĐÚNG");
    await p.ev("window.scrollTo(0, 0), true");
    await shotView(p, "c57-ca-doan-vang-ket-thuc-khoa-390.png");
    await p.ev(click('#cc-day [data-action="tra-het"]'));
    await p.waitFor(sheetOpen, "hộp Đã trả");
    assert.equal(await p.ev(txt('[data-action="tra-het-xac-nhan"]')), "Vẫn ghi đã tới");
    await p.ev(click('[data-action="tra-het-xac-nhan"]'));
    await p.waitFor(`!!document.querySelector('#cc-day [data-action="ket-thuc"]:not([disabled])')`, "Kết thúc chuyến sáng", 10000);
    await p.ev(click('#cc-day [data-action="ket-thuc"]'));
    await p.waitFor(sheetOpen, "hộp Kết thúc");
    await p.ev(click('[data-action="ket-thuc-xac-nhan"]'));
    await p.waitFor(`/Đã kết thúc/.test(document.querySelector('.dp-cc-head')?.innerText ?? '')`, "Y đã kết thúc", 10000);
    void diemTraY;
  });
  p.close();

  // ---- C61: nút Hỗ trợ không che dòng / liên kết cuối trang ở khổ 390 (lỗi cũ BH-23) ------------------------------------------------------------------------
  p = await env.as(ACCOUNTS.salesA, "/orders", MOB);
  // Chữ cuối của trang (lá có chữ) có giao hình chữ nhật của nút nổi không — sau khi cuộn tới ĐÁY trang dài (chèn tạm khối 1200px ĐẦU <main>, khuôn khongBiChe).
  const cheCuoi = `(() => { if (window.innerHeight > 900) return 'khung cao ' + window.innerHeight; const f = document.getElementById('tl-fab'); if (!f) return 'không có nút Hỗ trợ';
    const dem = document.createElement('div'); dem.id = 'c2-dem'; dem.style.height = '1200px'; document.querySelector('main').prepend(dem);
    const cuoi = document.createElement('p'); cuoi.id = 'c2-cuoi'; cuoi.style.cssText = 'margin:0;text-align:right'; cuoi.textContent = 'Dòng cuối thử'; document.querySelector('main').append(cuoi); // dòng cuối sát mép phải, nơi nút nổi nằm
    window.scrollTo(0, document.documentElement.scrollHeight); window.dispatchEvent(new Event('scroll'));
    const fr = f.getBoundingClientRect(); const la = [...document.querySelectorAll('main *')].filter((x) => x.children.length === 0 && x.getClientRects().length > 0 && x.textContent.trim() && x.id !== 'c2-dem');
    const giao = la.filter((x) => { const r = x.getBoundingClientRect(); return r.left < fr.right && r.right > fr.left && r.top < fr.bottom && r.bottom > fr.top; }).map((x) => x.textContent.trim().slice(0, 40));
    document.getElementById('c2-dem').remove(); document.getElementById('c2-cuoi').remove(); window.scrollTo(0, 0); return giao.length ? 'nút Hỗ trợ che: ' + giao.join(' | ') : 'ok'; })()`;
  await b.step("9", `C61 (lỗi cũ BH-23) 390: ở trang Đơn cuộn tới đáy, nút "Hỗ trợ" KHÔNG che dòng cuối (một dòng thử sát mép phải thêm vào cuối trang) (đệm đáy chừa chỗ); gỡ tạm lớp đệm thì BỊ che (phép đo bắt được lỗi cũ)`, async () => {
    await p.waitFor(`!!document.getElementById('tl-fab') && document.body.classList.contains('co-nut-ho-tro')`, "nút Hỗ trợ + lớp chừa đệm", 12000);
    await sleep(800);
    assert.equal(await p.ev(cheCuoi), "ok", "có đệm: nút Hỗ trợ không che phần tử cuối");
    await p.ev(`document.body.classList.remove('co-nut-ho-tro'), true`);
    const khongDem = await p.ev(cheCuoi);
    await p.ev(`document.body.classList.add('co-nut-ho-tro'), true`);
    assert.match(khongDem, /^nút Hỗ trợ che/, "không đệm: phép đo phải thấy bị che (nếu không, phép đo không chứng minh gì)");
    await p.ev(`(() => { const dem = document.createElement('div'); dem.id = 'c2-dem'; dem.style.height = '1200px'; document.querySelector('main').prepend(dem); const cuoi = document.createElement('p'); cuoi.id = 'c2-cuoi'; cuoi.style.cssText = 'margin:0;text-align:right'; cuoi.textContent = 'Dòng cuối thử'; document.querySelector('main').append(cuoi); window.scrollTo(0, document.documentElement.scrollHeight); window.dispatchEvent(new Event('scroll')); return true; })()`);
    await shotView(p, "c61-trang-don-cuon-day-nut-ho-tro-khong-che-390.png");
    await p.ev(`document.getElementById('c2-dem').remove(), document.getElementById('c2-cuoi').remove(), true`);
  });
  p.close();

  // ---- 1040: màn máy tính ---------------------------------------------------------------------------------------------------------------------------------
  p = await env.as(TAM.account, `/cuoc-chuyen?id=${Z.id}`, DESK);
  await b.step("10", `1040: màn đang chạy bố cục máy tính — không tràn ngang, không mã kỹ thuật${axeNote()}`, async () => {
    {
      await p.waitFor(`!!document.querySelector('[data-action="xuat-ben"]:not([disabled])')`, "nút xuất bến Z", 12000);
      await p.ev(click('[data-action="xuat-ben"]'));
      await p.waitFor(sheetOpen, "hộp xuất bến");
      await p.ev(click('[data-action="xuat-ben-xac-nhan"]'));
      await p.waitFor(`!!document.querySelector('.dp-cc-head')`, "Z đang chạy");
      await p.ev(click('#cc-day [data-action="da-toi"]'));
      await p.waitFor(`document.querySelectorAll('.dp-khach-btn[data-action="don"]').length === 2`, "hai khách");
      assert.equal(await p.ev(`getComputedStyle(document.getElementById('cc-day')).position`), "static", "máy tính: thanh nút chính nằm dưới nội dung (không dính đáy)");
      assert.equal(await p.ev(`document.getElementById('tl-fab').getClientRects().length`), 0, "đang chạy: nút Hỗ trợ ẩn");
    }
    assert.ok(await p.ev(noOverflowX));
    assert.equal(await p.ev(noCode), "");
    await axe(p, "đang chạy 1040");
    await shotFull(p, "c54-chay-1040.png");
    {
      await p.ev(click('#cc-day [data-action="don-tat-ca"]'));
      await p.waitFor(sheetOpen, "hộp Đã đón N khách");
      await shotView(p, "c53-hop-da-don-n-khach-1040.png");
    }
  });
  p.close();
} finally {
  b.xong();
  await env.stop();
}
