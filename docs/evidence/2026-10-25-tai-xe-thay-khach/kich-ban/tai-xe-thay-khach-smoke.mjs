// Đề xuất 25/10 (docs/superpowers/specs/2026-10-25-de-xuat-tai-xe-thay-khach-truoc-khi-cho-xe-chay.md — chủ duyệt Q1 a, Q2 a), màn chuyến của tài xế (/cuoc-chuyen):
//   - Tài xế CÔNG TY, trong ngày chạy, thấy tên + năm sinh từng khách và dòng "Liên hệ" (bấm là gọi) TRƯỚC khi bấm "Cho xe chạy"; chưa có nút tiến độ.
//   - Chuyến có từ hai điểm trả: dưới tên mỗi khách có chữ "Trả khách ở: <nơi>" (chỉ tài xế công ty), trước và trong khi chạy.
//   - Tài xế ĐỐI TÁC giữ như cũ: máy chủ đã gửi tên + liên hệ từ lúc qua hạn Từ chối nhưng màn KHÔNG vẽ trước khi bấm "Cho xe chạy"; không có chữ "Trả khách ở:".
//   - Dòng hứa "Bạn thấy tên khách …" chia theo loại tài xế, bỏ chữ "mã đơn". Khối "Suất của khách" đếm "Điểm M · Khách i" như dòng khách. Màn văn phòng (/chuyen) không đổi.
// ANH=truoc: chạy trên bản CŨ (commit 1c036383, trước khi sửa) để chụp ảnh "trước". Ảnh chụp TRƯỚC phần kiểm của mỗi bước, nên bước đỏ vẫn có ảnh. Bản cũ phải
//   ĐỎ đúng các bước hành vi mới (1, 2, 3, 4, 5, 8) và XANH các bước hành vi giữ nguyên (6, 7, 9, 10) — bằng chứng kịch bản phân biệt được hai bản (P16).
// ANH=sau (mặc định): chạy trên bản mới, phải xanh hết.
// Dữ liệu đi đường thật (route API); tên, SĐT, biển số GIẢ. Giờ chuyến hôm nay tính theo giờ hiện tại (bắt đầu sau ~75 phút, dài 90 phút, phải xong trước nửa đêm) → chạy trước ~21:10 giờ VN.
//   TC  tài xế công ty Tâm, xe 79A-251.25, HÔM NAY: đón Sheraton (đơn A, 2 khách có tên) và Novotel (đơn B, 2 khách: 1 có tên, 1 chưa) → trả Bến tàu (A), Bến cảng Vinpearl (B).
//   CM  Tâm, NGÀY MAI 07:00: đón Citadines (đơn F, 2 khách) → trả Bến tàu.
//   TD  tài xế đối tác Đông, xe nhà xe 79B-251.25, HÔM NAY (đã qua hạn Từ chối 12 giờ): đón InterContinental (C, 2 khách), Liberty (D, 1 khách) → trả Bến tàu (C),
//       Vinpearl (D); hướng dẫn viên đi kèm (tên hiện, SĐT không). Kế toán nhập giá thoả thuận (chuyến xe thuê phải có giá mới cho xe chạy được).
//   TM  Đông, NGÀY MAI 20:00 (còn hạn Từ chối tới 08:00 ngày mai): đón Mường Thanh (E, 2 khách) → trả Bến tàu.
// Trình duyệt (kho cookie chung, một phiên mỗi tài khoản — ADR-0075): dựng dữ liệu bằng API XONG mới mở trang; thứ tự Tâm → Đông → Quản trị.
// Chạy từ GỐC repo, sau `npm run build:web` (không cần mạng ngoài):
//   AXE_JS=<…/axe.min.js> CHROME_BIN=docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh OUT=docs/evidence/2026-10-25-tai-xe-thay-khach ANH=sau node docs/evidence/2026-10-25-tai-xe-thay-khach/kich-ban/tai-xe-thay-khach-smoke.mjs
import { randomUUID } from "node:crypto";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  ACCOUNTS, CHU, DESK, MOB, LOC_BEN_TAU, OUT, assert, axe, axeNote, boDem, click, dungMoiTruong, fetchTrang, noCode, noOverflowX, sleep, vnDate,
} from "../../2026-09-29-adr-0049/kich-ban/dp-lib.mjs";

const ANH = process.env.ANH ?? "sau";
assert.ok(ANH === "truoc" || ANH === "sau", `ANH phải là truoc hoặc sau — đang là ${ANH}`);
const CANG_VINPEARL = "ec67ff94-bb00-4546-842a-aedb5f916b0a"; // Bến cảng Vinpearl (migration 0010)
const gio = (m) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
const dm = (iso) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
const vn = new Date(Date.now() + 7 * 3600_000);
const bayGio = vn.getUTCHours() * 60 + vn.getUTCMinutes();
const BD = Math.ceil((bayGio + 75) / 5) * 5;
assert.ok(BD + 90 < 24 * 60, `kịch bản cần chạy trước ~21:10 giờ VN (chuyến hôm nay bắt đầu sau ~75 phút, dài 90 phút, phải xong trước nửa đêm) — bây giờ ${gio(bayGio)}`);

/** Hướng dẫn viên (FIELD) giả đi kèm TD — màn tài xế đối tác hiện tên, KHÔNG SĐT (ADR-0139: SĐT người đi kèm chỉ cho tài xế công ty). */
const HDV = { name: "Hướng Dẫn Đi Kèm 251", phone: "0900000253", pin: "246253", permissions: ["FIELD"] };
const { env, call } = await dungMoiTruong([CHU, HDV]);
const b = boDem(`TAI XE THAY KHACH (${ANH})`);
// Cả phần dựng dữ liệu nằm trong try: hỏng giữa chừng vẫn tắt máy chủ thử + Chrome (`env.stop()` ở finally cuối tệp) và thoát 1, không in "OK (0 bước)".
let dungXong = false;
try {
const dung = (r, ma, viec) => assert.equal(r.status, ma, `${viec}: ${r.status} ${r.text}`);
const SDT_VP = "0905123456";
const homNay = vnDate(0);
const ngayMai = vnDate(1);
const han = vnDate(300);

// ---- Chính sách: mốc chốt 60 phút (xác nhận đơn hôm nay không cần đặt gấp), không bắt đủ tên, hạn Từ chối 12 giờ, cửa sổ cho xe chạy 48 giờ ----------------
dung(await call(CHU, "POST", "/api/van-chuyen/chinh-sach-dieu-phoi", { minLeadMinutes: 60, warnLeadMinutes: 30, restMinutes: 30, requireManifest: false, proxyBackdateMaxMinutes: 180, dutyDayMaxMinutes: 480, tripNoBreakMaxMinutes: 240, departureWindowMinutes: 2880, refuseLeadMinutes: 720, officePhone: SDT_VP, acceptWaitMinutes: 10, autoConfirmTransfer: true }), 201, "chính sách");

// ---- Người lái, nhà xe, xe ----------------------------------------------------------------------------------------------------------------------------------------
const taiKhoan = async (fullName, phone, vai, quyen, soGplx) => {
  const r = await call(CHU, "POST", "/api/staff", { taoHoSoMoi: true, fullName, phone, roles: [vai] });
  dung(r, 201, `tài khoản ${fullName}`);
  const [{ party_id: partyId }] = env.sql(`SELECT party_id FROM staff WHERE id = '${r.json.staff.id}'`);
  return { partyId, soGplx, account: { name: fullName, phone: r.json.staff.phone, pin: r.json.pin, permissions: [quyen] } };
};
const gplx = async (tx) => dung(await call(ACCOUNTS.admin, "POST", `/api/parties/${tx.partyId}/documents`, { typeCode: "GPLX", number: tx.soGplx, classCode: "D2", expiryDate: han }), 201, `GPLX ${tx.account.name}`);
const TAM = await taiKhoan("Trần Văn Tâm", "0900000251", "DRIVER_INTERNAL", "DRIVER", "790100000251");
await gplx(TAM);
const nx = await call(ACCOUNTS.admin, "POST", "/api/parties", { kind: "ORGANIZATION", displayName: "Nhà Xe Đông Chrome 251" });
dung(nx, 201, "nhà xe");
const nhaXe = nx.json.party.id;
dung(await call(ACCOUNTS.admin, "POST", `/api/parties/${nhaXe}/roles`, { roleTypeCode: "CARRIER" }), 201, "vai nhà xe");
const DONG = await taiKhoan("Lê Văn Đông", "0900000252", "DRIVER_EXTERNAL", "DRIVER_PARTNER", "790100000252");
dung(await call(ACCOUNTS.admin, "POST", `/api/parties/${nhaXe}/relationships`, { fromPartyId: DONG.partyId, toPartyId: nhaXe, relationshipTypeCode: "DRIVES_FOR" }), 201, "Tài xế của");
await gplx(DONG);
const xe = async (plateNumber, ownerPartyId) => {
  const r = await call(ACCOUNTS.admin, "POST", "/api/van-chuyen/xe", { plateNumber, chassisNumber: `TK${plateNumber.replace(/[^0-9A-Z]/g, "")}`, name: `Xe thử ${plateNumber}`, passengerCapacity: 15, ...(ownerPartyId ? { ownerPartyId } : {}) });
  dung(r, 201, `xe ${plateNumber}`);
  for (const typeCode of ["INSPECTION", "TPL_INSURANCE"]) {
    dung(await call(ACCOUNTS.admin, "POST", `/api/van-chuyen/xe/${r.json.vehicle.id}/giay-to`, { typeCode, number: `${typeCode}-${plateNumber}`, expiryDate: han }), 201, `giấy ${typeCode} ${plateNumber}`);
  }
  return r.json.vehicle.id;
};
const XE_CT = await xe("79A-251.25", null);
const XE_DT = await xe("79B-251.25", nhaXe);

// ---- Đơn (xác nhận thẳng — chặng nào cũng cách giờ hiện tại hơn mốc 60 phút) + chuyến -----------------------------------------------------------------------------
const DON = {
  A: { noi: "Sheraton Nha Trang", tra: LOC_BEN_TAU, lienHe: "Chị Hoa Đặt Tour", sdt: "0903 251 001", soKhach: 2, ten: [["Nguyễn Thị Hoa", 1985], ["Trần Minh Khang", 1990]] },
  B: { noi: "Novotel Nha Trang", tra: CANG_VINPEARL, lienHe: "Anh Phúc Đặt Tour", sdt: "0903 251 002", soKhach: 2, ten: [["Lê Văn Phúc", 1978]] },
  C: { noi: "InterContinental Nha Trang", tra: LOC_BEN_TAU, lienHe: "Chị Trang Đặt Tour", sdt: "0903 251 003", soKhach: 2, ten: [["Phạm Thu Trang", 1992], ["Vũ Đức Anh", 1988]] },
  D: { noi: "Liberty Central Nha Trang", tra: CANG_VINPEARL, lienHe: "Anh Bảo Đặt Tour", sdt: "0903 251 004", soKhach: 1, ten: [["Đặng Quốc Bảo", 1975]] },
  E: { noi: "Mường Thanh Luxury", tra: LOC_BEN_TAU, lienHe: "Chị Mai Đặt Tour", sdt: "0903 251 005", soKhach: 2, ten: [["Hồ Thị Mai", 1983], ["Hồ Văn Nam", 1981]] },
  F: { noi: "Citadines Bayfront", tra: LOC_BEN_TAU, lienHe: "Anh Sơn Đặt Tour", sdt: "0903 251 006", soKhach: 2, ten: [["Ngô Thanh Sơn", 1979], ["Ngô Thị Lan", 1982]] },
};
const lapDon = async (k, ngay, gioDon) => {
  const o = DON[k];
  const r = await call(ACCOUNTS.salesA, "POST", "/api/orders", {
    customerName: o.lienHe, customerPhone: o.sdt, customerEmail: "", customerNote: "", discount: 0, depositAmount: 0, depositMethod: null, paymentNote: "",
    services: [{
      kind: "catalog", pickupChoice: "DON", catalogCode: "TD101", pax: { adult: o.soKhach, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: 1350000 },
      departTime: "", pickupTime: "", pickupPlace: "", checkinDate: "", checkinTime: "", checkinPlace: "", note: "", departDate: ngay,
      legs: [{ direction: "OUT", pickupDate: ngay, pickupTime: gioDon, pickupLocationId: null, pickupPlace: o.noi, dropoffLocationId: o.tra, dropoffPlace: "" }],
    }],
    passengers: o.ten.map(([fullName, birthYear]) => ({ fullName, birthYear, paxCode: null })),
  });
  dung(r, 201, `lập đơn ${k}`);
  dung(await call(ACCOUNTS.admin, "POST", `/api/orders/${r.json.order.id}/status`, { status: "confirmed" }), 200, `xác nhận đơn ${k}`);
  return { legId: r.json.order.services[0].legs[0].id, soSuat: o.soKhach };
};
const chuyen = async (xeId, tx, ngay, tu, den, chang) => {
  const t = await call(ACCOUNTS.admin, "POST", "/api/van-chuyen/chuyen", { requestId: randomUUID(), xeId, taiXePartyId: tx.partyId, batDau: { ngay, gio: tu }, ketThuc: { ngay, gio: den } });
  dung(t, 201, `tạo chuyến ${tx.account.name} ${ngay} ${tu}`);
  const x = await call(ACCOUNTS.admin, "POST", `/api/van-chuyen/chuyen/${t.json.chuyen.id}/phan-bo`, { version: t.json.chuyen.version, requestId: randomUUID(), chang });
  dung(x, 200, `xếp khách vào chuyến ${tx.account.name} ${ngay} ${tu}`);
  return x.json.chuyen;
};
const TC = await chuyen(XE_CT, TAM, homNay, gio(BD), gio(BD + 90), [await lapDon("A", homNay, gio(BD + 10)), await lapDon("B", homNay, gio(BD + 25))]);
const CM = await chuyen(XE_CT, TAM, ngayMai, "07:00", "08:30", [await lapDon("F", ngayMai, "07:15")]);
const TD = await chuyen(XE_DT, DONG, homNay, gio(BD), gio(BD + 90), [await lapDon("C", homNay, gio(BD + 10)), await lapDon("D", homNay, gio(BD + 20))]);
const dsHdv = await call(ACCOUNTS.admin, "GET", "/api/van-chuyen/huong-dan-vien");
dung(dsHdv, 200, "danh sách hướng dẫn viên");
const hdvParty = dsHdv.json.nguoi.find((x) => x.ten === HDV.name)?.partyId;
assert.ok(hdvParty, `danh sách hướng dẫn viên có ${HDV.name}: ${dsHdv.text}`);
dung(await call(ACCOUNTS.admin, "POST", `/api/van-chuyen/chuyen/${TD.id}/phan-bo`, { version: TD.version, requestId: randomUUID(), nguoiDiKem: [hdvParty] }), 200, "người đi kèm TD");
const TM = await chuyen(XE_DT, DONG, ngayMai, "20:00", "21:30", [await lapDon("E", ngayMai, "20:10")]);
const cp = await call(ACCOUNTS.accounting, "GET", `/api/van-chuyen/chuyen/${TD.id}/chi-phi`);
dung(cp, 200, "chi phí TD");
dung(await call(ACCOUNTS.accounting, "POST", `/api/van-chuyen/chuyen/${TD.id}/chi-phi/gia-thoa-thuan`, { requestId: randomUUID(), phienBanChiPhi: cp.json.chiPhi.phienBanChiPhi, soTien: 900_000, ghiChu: "Giá thử kịch bản 25/10" }), 201, "giá thoả thuận TD");
dungXong = true;

// ---- Công cụ màn -----------------------------------------------------------------------------------------------------------------------------------------------
/** Ảnh cả trang: kéo khung nhìn cao bằng trang rồi chụp (thanh dính đáy nằm đúng đáy ảnh, không lơ lửng giữa trang), xong trả khung cũ. */
const chup = async (p, ten, khung) => {
  await sleep(400);
  const cao = await p.ev("Math.ceil(document.documentElement.scrollHeight)");
  const dat = (h) => p.send("Emulation.setDeviceMetricsOverride", { width: khung.width, height: h, deviceScaleFactor: khung.mobile ? 2 : 1, mobile: khung.mobile });
  await dat(Math.max(khung.height, cao));
  await sleep(350);
  const r = await p.send("Page.captureScreenshot", { format: "png" });
  writeFileSync(join(OUT, "anh", `${ten}-${ANH}.png`), Buffer.from(r.result.data, "base64"));
  await dat(khung.height);
  await sleep(200);
};
/** Đổi khổ trên cùng trang (cùng phiên) rồi tải lại để màn dựng theo khổ mới. */
const doiKhung = async (p, khung) => {
  await p.send("Emulation.setDeviceMetricsOverride", { width: khung.width, height: khung.height, deviceScaleFactor: khung.mobile ? 2 : 1, mobile: khung.mobile });
  await p.send("Emulation.setTouchEmulationEnabled", { enabled: khung.mobile });
  await p.send("Page.reload", {});
  await sleep(300);
  await p.waitFor("document.readyState === 'complete'", "tải lại theo khổ mới");
};
const DA_VE = (id) => `location.search.includes('${id}') && (!!document.querySelector('[data-action="xuat-ben"]') || !!document.querySelector('.dp-cc-head'))`;
const moChuyen = async (p, id) => {
  await p.send("Page.navigate", { url: `${env.base}/cuoc-chuyen?id=${id}` });
  await p.waitFor(DA_VE(id), `màn chuyến ${id}`, 12000);
};
const dsChu = (sel) => `[...document.querySelectorAll(${JSON.stringify(sel)})].map((x) => x.innerText.replace(/\\s+/g, ' ').trim())`;
const html = (p) => p.ev("document.querySelector('main').innerHTML");
/** Mỗi dòng khách: [tên, năm sinh, chữ "Trả khách ở:"] (null khi không có). */
const DONG_KHACH = `[...document.querySelectorAll('.dp-cc-diem .dp-khach, #cc-trang .dp-khach')].map((k) => [k.querySelector('.dp-khach-ten')?.innerText.trim() ?? null, k.querySelector('.dp-khach-nam')?.innerText.trim() ?? null, k.querySelector('.dp-khach-tra')?.innerText.trim() ?? null])`;
const xepDong = (ds) => [...ds].map((d) => [/^Khách \d+$/.test(d[0]) ? "Khách ?" : d[0], d[1], d[2]]).sort((x, y) => `${x}`.localeCompare(`${y}`));
/** Dòng khách mong đợi của một chuyến, đọc tên nơi trả từ chính chi tiết máy chủ trả cho trang (một nguồn với màn). */
const mongDoi = (ct, coTra) => xepDong(ct.suat.filter((s) => (s.loai ?? "PASSENGER") === "PASSENGER").map((s) => [s.hoTen ?? "Khách ?", s.namSinh ? String(s.namSinh) : null, coTra ? `Trả khách ở: ${ct.diem.find((d) => d.id === s.diemXuong).tenNoi}` : null]));
// Nút / phần cuối của trang không bị thanh dính đáy hay thanh tab che (khuôn cuoc-smoke): chèn tạm khối 1200px đầu <main>, cuộn tới đáy, `elementFromPoint` ở tâm phần tử.
const khongBiChe = (sel) => `(() => { if (window.innerHeight > 900) return 'khung cao ' + window.innerHeight; const dem = document.createElement('div'); dem.style.height = '1200px'; document.querySelector('main').prepend(dem); try { window.scrollTo(0, document.documentElement.scrollHeight); const el = [...document.querySelectorAll(${JSON.stringify(sel)})].filter((x) => x.getClientRects().length).at(-1); if (!el) return 'không thấy'; const r = el.getBoundingClientRect(); const t = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); if (!t) return 'ngoài khung'; return el === t || el.contains(t) ? 'ok' : t.closest('#tabbar') ? 'thanh tab che' : t.closest('#cc-day') ? 'thanh nút đáy che' : t.tagName + '.' + t.className; } finally { dem.remove(); window.scrollTo(0, 0); } })()`;
const loiConsole = (p, ten) => assert.deepEqual(p.consoleErrors, [], `${ten}: lỗi console ${JSON.stringify(p.consoleErrors)}`);
const LIEN_HE = (k) => `Liên hệ: ${DON[k].lienHe} ${DON[k].sdt}`;
const TEL = (k) => `tel:${DON[k].sdt.replace(/\s/g, "")}`;
const KHONG_LO = (ks) => ks.flatMap((k) => [...DON[k].ten.map(([t]) => t), DON[k].lienHe, DON[k].sdt, DON[k].sdt.replace(/\s/g, "")]);
/** Chữ số SĐT của hướng dẫn viên (bỏ số 0 đầu — bắt cả dạng có dấu cách). */
const SDT_HDV = HDV.phone.slice(1);

  // ---- Tài xế công ty Tâm ----------------------------------------------------------------------------------------------------------------------------------------
  let p = await env.as(TAM.account, `/cuoc-chuyen?id=${TC.id}`, MOB);
  let ctTC = null;
  await b.step("1", `390 tài xế CÔNG TY, chuyến HÔM NAY chưa chạy: tên + năm sinh từng khách, "Trả khách ở: …" (hai điểm trả), dòng "Liên hệ" bấm gọi được; chưa có nút tiến độ; khối "Suất của khách" đếm "Điểm M · Khách i" trùng dòng khách${axeNote()}`, async () => {
    await p.waitFor(DA_VE(TC.id), "màn chuyến TC", 12000);
    await chup(p, "1-cong-ty-truoc-chay-390", MOB);
    ctTC = (await fetchTrang(p, "GET", `/api/van-chuyen/cuoc-cua-toi/${TC.id}`)).json; // phiên của chính trang (ADR-0075)
    assert.ok(ctTC.trongNgayChay && ctTC.suat.some((s) => s.hoTen) && ctTC.lienHe?.length === 2, "ca phân biệt được: máy chủ gửi tên + liên hệ trong ngày chạy");
    assert.deepEqual(new Set(ctTC.diem.filter((d) => d.loai === "DROPOFF").map((d) => d.tenNoi)).size, 2, "chuyến có hai điểm trả khác nhau");
    assert.deepEqual(xepDong(await p.ev(DONG_KHACH)), mongDoi(ctTC, true), "trước khi chạy: đủ tên, năm sinh, chữ Trả của từng khách");
    assert.deepEqual(await p.ev(dsChu(".dp-run-lien-he")), [LIEN_HE("A"), LIEN_HE("B")]);
    assert.deepEqual(await p.ev(`[...document.querySelectorAll('.dp-run-lien-he a')].map((a) => a.getAttribute('href'))`), [TEL("A"), TEL("B")]);
    assert.equal(await p.ev("document.querySelectorAll('.dp-khach-btn, .dp-run-btn').length"), 0, "trước khi chạy: không nút tiến độ");
    assert.deepEqual(await p.ev(dsChu(".dp-cond")), ["✓ Đủ điều kiện cho xe chạy"]);
    // Khối "Suất của khách": dòng "Chưa có tên" ghi đúng "Điểm M · Khách i" của dòng khách chưa tên dưới điểm M (một cách đếm).
    const chuaTen = await p.ev(`(() => { const k = [...document.querySelectorAll('.dp-cc-diem .dp-khach')].find((x) => /^Khách \\d+$/.test(x.querySelector('.dp-khach-ten').innerText.trim())); const run = k.closest('.dp-run'); return [run.querySelector('.dp-run-so').innerText.trim(), k.querySelector('.dp-khach-ten').innerText.trim(), run.querySelector('.dp-run-noi').innerText.trim()]; })()`);
    const dongKhoi = (await p.ev(dsChu(".dp-suat-khach .dp-kc"))).filter((x) => x.includes("Chưa có tên"));
    assert.deepEqual(dongKhoi, [`Điểm ${chuaTen[0]} · ${chuaTen[1]} · ${chuaTen[2]} Chưa có tên Bổ sung tên`], `khối Suất của khách trùng dòng khách: ${JSON.stringify(chuaTen)}`);
    assert.equal(await p.ev(noCode), "");
    assert.equal(await p.ev(noOverflowX), true, "390 không tràn ngang");
    assert.equal(await p.ev(khongBiChe("#cc-trang .dp-side-card")), "ok", "390: thẻ cuối (Điều kiện cho xe chạy) không bị thanh nút đáy / thanh tab che");
    assert.equal(await p.ev(khongBiChe('[data-action="xuat-ben"]')), "ok", "390: nút Cho xe chạy không bị thanh tab che");
    await axe(p, "công ty trước khi chạy 390");
  });

  await b.step("2", `1040 cùng chuyến: tên, năm sinh, "Trả khách ở: …", "Liên hệ" như khổ điện thoại; không tràn ngang${axeNote()}`, async () => {
    await doiKhung(p, DESK);
    await p.waitFor(DA_VE(TC.id), "màn chuyến TC 1040", 12000);
    await chup(p, "2-cong-ty-truoc-chay-1040", DESK);
    assert.deepEqual(xepDong(await p.ev(DONG_KHACH)), mongDoi(ctTC, true));
    assert.deepEqual(await p.ev(dsChu(".dp-run-lien-he")), [LIEN_HE("A"), LIEN_HE("B")]);
    assert.equal(await p.ev(noOverflowX), true, "1040 không tràn ngang");
    await axe(p, "công ty trước khi chạy 1040");
  });

  await b.step("3", `390 tài xế công ty, chuyến NGÀY MAI: chưa thấy khách; dòng hứa "Bạn thấy tên khách và số liên hệ từ 00:00 ${dm(ngayMai)}." (không còn chữ "mã đơn")`, async () => {
    await doiKhung(p, MOB);
    await moChuyen(p, CM.id);
    await chup(p, "3-cong-ty-ngay-mai-390", MOB);
    assert.equal(await p.ev("document.querySelectorAll('.dp-cc-diem .dp-khach, .dp-run-lien-he, .dp-khach-tra').length"), 0, "ngày mai: không dòng khách, không liên hệ");
    const h = await html(p);
    for (const x of KHONG_LO(["F"])) assert.ok(!h.includes(x), `ngày mai: không lộ ${x}`);
    assert.deepEqual(await p.ev(dsChu('[data-cau="thay-khach"]')), [`Bạn thấy tên khách và số liên hệ từ 00:00 ${dm(ngayMai)}.`]);
    assert.equal(await p.ev(noCode), "");
  });

  await b.step("4", `390 tài xế công ty bấm "Cho xe chạy" → đang chạy: dưới tên mỗi khách vẫn có "Trả khách ở: …"; tới điểm đầu ("Đã tới") thì chữ "Trả khách ở:" nằm trên hàng nút, đủ ngang dòng${axeNote()}`, async () => {
    await moChuyen(p, TC.id);
    await p.ev(click('[data-action="xuat-ben"]'));
    await p.waitFor(`!!document.querySelector('[data-action="xuat-ben-xac-nhan"]')`, "hộp xác nhận cho xe chạy");
    await p.ev(click('[data-action="xuat-ben-xac-nhan"]'));
    await p.waitFor(`!!document.querySelector('.dp-cc-head')`, "màn đang chạy TC", 12000);
    await chup(p, "4-cong-ty-dang-chay-390", MOB);
    assert.deepEqual(xepDong(await p.ev(DONG_KHACH)), mongDoi(ctTC, true), "đang chạy: đủ tên + chữ Trả");
    await p.ev(click('#cc-day [data-action="da-toi"]'));
    await p.waitFor(`document.querySelectorAll('.dp-khach-btn[data-action="don"]').length === 2`, "nút khách ở điểm đầu");
    await chup(p, "4b-cong-ty-da-toi-390", MOB);
    const hinh = await p.ev(`[...document.querySelectorAll('.dp-khach')].filter((k) => k.querySelector('.dp-khach-btn')).map((k) => { const t = k.querySelector('.dp-khach-tra'), n = k.querySelector('.dp-khach-nut'), b = k.querySelector('.dp-khach-btn'); if (!t) return 'thiếu Trả'; const tr = t.getBoundingClientRect(), nr = n.getBoundingClientRect(), br = b.getBoundingClientRect(); return tr.bottom <= br.top + 1 && Math.abs(tr.width - nr.width) <= 1 ? 'ok' : JSON.stringify({ tr, nr, br }); })`);
    assert.deepEqual(hinh, ["ok", "ok"], "chữ Trả nằm trên hàng nút, rộng đủ dòng");
    assert.equal(await p.ev(noOverflowX), true);
    assert.equal(await p.ev(noCode), "");
    assert.equal(await p.ev(khongBiChe(".dp-run-end .vc-btn")), "ok", "390: nút cuối (Kết thúc gián đoạn) không bị che");
    await axe(p, "công ty đang chạy 390");
  });

  await b.step("5", `1040 đang chạy: "Trả khách ở: …" dưới tên mỗi khách; không tràn ngang${axeNote()}`, async () => {
    await doiKhung(p, DESK);
    await p.waitFor(`!!document.querySelector('.dp-cc-head') && document.querySelectorAll('.dp-khach').length === 4`, "màn đang chạy TC 1040", 12000);
    await chup(p, "5-cong-ty-dang-chay-1040", DESK);
    assert.deepEqual(xepDong(await p.ev(DONG_KHACH)), mongDoi(ctTC, true));
    assert.equal(await p.ev(noOverflowX), true);
    await axe(p, "công ty đang chạy 1040");
    loiConsole(p, "trang tài xế công ty");
  });
  await p.close();

  // ---- Tài xế đối tác Đông -----------------------------------------------------------------------------------------------------------------------------------------
  p = await env.as(DONG.account, `/cuoc-chuyen?id=${TD.id}`, MOB);
  await b.step("6", `390 tài xế ĐỐI TÁC, chuyến hôm nay đã qua hạn Từ chối, chưa chạy: máy chủ ĐÃ gửi tên + liên hệ nhưng màn KHÔNG vẽ (như cũ) — không dòng khách, không liên hệ, không "Trả khách ở:", không dòng dịch vụ, không SĐT người đi kèm${axeNote()}`, async () => {
    await p.waitFor(DA_VE(TD.id), "màn chuyến TD", 12000);
    await chup(p, "6-doi-tac-qua-han-chua-chay-390", MOB);
    const ct = (await fetchTrang(p, "GET", `/api/van-chuyen/cuoc-cua-toi/${TD.id}`)).json;
    assert.ok(ct.trongNgayChay && ct.suat.some((s) => s.hoTen) && ct.lienHe?.length === 2, `ca phân biệt được: máy chủ đã gửi tên + liên hệ cho tài xế đối tác — ${JSON.stringify({ trongNgayChay: ct.trongNgayChay, lienHe: ct.lienHe?.length })}`);
    assert.ok(ct.suat.every((s) => s.tenDichVu === undefined && s.sdtNguoiDiKem === undefined), "đối tác: máy chủ không gửi tên dịch vụ, SĐT người đi kèm");
    assert.equal(await p.ev("document.querySelectorAll('.dp-khach, .dp-run-lien-he, .dp-khach-tra, [data-dich-vu]').length"), 0, "đối tác chưa chạy: không khách, không liên hệ, không Trả, không dịch vụ");
    assert.equal(await p.ev("document.querySelector('.dp-cc-di-kem')?.innerText.replace(/\\s+/g, ' ').trim() ?? null"), `Người đi kèm: ${HDV.name}`, "đối tác: tên người đi kèm, không SĐT");
    const h = await html(p);
    for (const x of [...KHONG_LO(["C", "D"]), SDT_HDV]) assert.ok(!h.includes(x), `đối tác chưa chạy: không lộ ${x}`);
    assert.equal(await p.ev(`!!document.querySelector('[data-cau="thay-khach"]')`), false, "đã trong khung xem khách: không dòng hứa");
    assert.equal(await p.ev(`document.querySelector('[data-action="goi-van-phong"]')?.getAttribute('href') ?? null`), `tel:${SDT_VP}`, "quá hạn Từ chối: nút Gọi văn phòng");
    assert.equal(await p.ev(noCode), "");
    assert.equal(await p.ev(noOverflowX), true);
    await axe(p, "đối tác quá hạn chưa chạy 390");
  });

  await b.step("7", `1040 cùng chuyến đối tác: như khổ điện thoại${axeNote()}`, async () => {
    await doiKhung(p, DESK);
    await p.waitFor(DA_VE(TD.id), "màn chuyến TD 1040", 12000);
    await chup(p, "7-doi-tac-qua-han-chua-chay-1040", DESK);
    assert.equal(await p.ev("document.querySelectorAll('.dp-khach, .dp-run-lien-he, .dp-khach-tra').length"), 0);
    assert.equal(await p.ev(noOverflowX), true);
    await axe(p, "đối tác quá hạn chưa chạy 1040");
  });

  await b.step("8", `390 tài xế đối tác, chuyến NGÀY MAI còn hạn Từ chối: dòng hứa "Bạn thấy tên khách và số liên hệ sau khi bấm “Cho xe chạy”, sớm nhất từ 08:00 ${dm(ngayMai)}."`, async () => {
    await doiKhung(p, MOB);
    await moChuyen(p, TM.id);
    await chup(p, "8-doi-tac-ngay-mai-390", MOB);
    assert.equal(await p.ev(`!!document.querySelector('[data-action="tu-choi"]')`), true, "còn hạn: có nút Từ chối chuyến");
    assert.deepEqual(await p.ev(dsChu('[data-cau="thay-khach"]')), [`Bạn thấy tên khách và số liên hệ sau khi bấm “Cho xe chạy”, sớm nhất từ 08:00 ${dm(ngayMai)}.`]);
    assert.equal(await p.ev("document.querySelectorAll('.dp-khach, .dp-run-lien-he').length"), 0);
  });

  await b.step("9", `390 tài xế đối tác bấm "Cho xe chạy" (chuyến hôm nay): thấy tên khách + liên hệ (như cũ), KHÔNG có chữ "Trả khách ở:" dù chuyến có hai điểm trả; không SĐT người đi kèm, không dòng dịch vụ${axeNote()}`, async () => {
    await moChuyen(p, TD.id);
    await p.ev(click('[data-action="xuat-ben"]'));
    await p.waitFor(`!!document.querySelector('[data-action="xuat-ben-xac-nhan"]')`, "hộp xác nhận cho xe chạy TD");
    await p.ev(click('[data-action="xuat-ben-xac-nhan"]'));
    await p.waitFor(`!!document.querySelector('.dp-cc-head') && document.querySelectorAll('.dp-khach').length === 3`, "màn đang chạy TD", 12000);
    await chup(p, "9-doi-tac-dang-chay-390", MOB);
    const ct = (await fetchTrang(p, "GET", `/api/van-chuyen/cuoc-cua-toi/${TD.id}`)).json;
    assert.deepEqual(xepDong(await p.ev(DONG_KHACH)), mongDoi(ct, false), "đối tác đang chạy: có tên, không chữ Trả");
    assert.deepEqual(await p.ev(dsChu(".dp-run-lien-he")), [LIEN_HE("C"), LIEN_HE("D")]);
    assert.ok(!(await html(p)).includes(SDT_HDV), "đối tác đang chạy: không SĐT người đi kèm");
    assert.equal(await p.ev("document.querySelectorAll('[data-dich-vu]').length"), 0, "đối tác đang chạy: không dòng dịch vụ");
    assert.equal(await p.ev(noCode), "");
    await axe(p, "đối tác đang chạy 390");
    loiConsole(p, "trang tài xế đối tác");
  });
  await p.close();

  // ---- Văn phòng (Quản trị) ------------------------------------------------------------------------------------------------------------------------------------------
  p = await env.as(ACCOUNTS.admin, `/chuyen?id=${TC.id}`, DESK);
  await b.step("10", `1040 văn phòng mở Chi tiết chuyến TC (đang chạy): màn văn phòng KHÔNG có chữ "Trả khách ở:" (không đổi)${axeNote()}`, async () => {
    await p.waitFor(`document.querySelectorAll('.dp-khach').length >= 4`, "dòng khách ở Chi tiết chuyến", 12000);
    await chup(p, "10-van-phong-chi-tiet-chuyen-1040", DESK);
    assert.equal(await p.ev("document.querySelectorAll('.dp-khach-tra').length"), 0);
    assert.equal(await p.ev("/Trả khách ở: /.test(document.querySelector('main').innerText)"), false, "không chữ Trả ở màn văn phòng");
    await axe(p, "văn phòng chi tiết chuyến 1040");
    loiConsole(p, "trang văn phòng");
  });
  await p.close();
} catch (e) {
  if (dungXong) throw e;
  console.log(`✗ dựng dữ liệu hỏng — không chạy bước nào:\n    ${String(e?.stack ?? e).split("\n").slice(0, 8).join("\n    ")}`);
  process.exitCode = 1;
} finally {
  await env.stop();
  if (dungXong) b.xong();
}
