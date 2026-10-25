// Hai chỗ lệch nhỏ của màn chuyến xe (việc 26/10, sau «tài xế thấy khách» 25/10) — kịch bản Chrome chụp ảnh trước/sau và khoá hành vi:
//   (1) Màn VĂN PHÒNG Chi tiết chuyến: khối «Khách đang chờ» và thẻ điểm đếm «Khách i» CÙNG MỘT LUẬT (theo điểm lên, soKhachTaiDiem) — cùng một khách chưa tên
//       không còn là «Khách 3» ở khối chờ nhưng «Khách 2» ở thẻ điểm (đối chiếu ảnh docs/evidence/2026-10-25-tai-xe-thay-khach/anh/10-van-phong-chi-tiet-chuyen-1040-sau.png).
//   (2) Màn TÀI XẾ công ty: dòng «Dịch vụ: …» dưới tên điểm đón thẳng lề trái với tên nơi (trước chuyến chạy và khi đang chạy). Dòng này chỉ có ở màn tài xế
//       (`dichVuCua` của web/cuoc-chuyen.ts); màn văn phòng /chuyen không vẽ nó.
// ANH=truoc: chạy trên mã CŨ (trước khi sửa) để chụp ảnh «trước» — các bước (1), (2) phải ĐỎ đúng chỗ lệch, ảnh vẫn chụp (chụp TRƯỚC phần kiểm của mỗi bước).
// ANH=sau (mặc định): chạy trên mã mới, phải xanh hết.
// Dữ liệu đi đường thật (route API); tên, SĐT, biển số GIẢ. Chuyến hôm nay tính theo giờ hiện tại (bắt đầu sau ~75 phút, dài 90 phút, phải xong trước nửa đêm) → chạy trước ~21:10 giờ VN.
//   TC  tài xế công ty Tâm, xe 79A-251.25, HÔM NAY: đón Sheraton (đơn A, 2 khách có tên) và Novotel (đơn B, 2 khách: 1 có tên, 1 chưa) → trả Bến tàu (A), Bến cảng Vinpearl (B).
// Trình duyệt (kho cookie chung, một phiên mỗi tài khoản — ADR-0075): dựng dữ liệu bằng API XONG mới mở trang; thứ tự Tâm → Quản trị.
// Chạy từ GỐC repo, sau `npm run build:web` (không cần mạng ngoài):
//   AXE_JS=<…/axe.min.js> CHROME_BIN=docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh OUT=docs/evidence/2026-10-26-hai-lech-man-chuyen-xe ANH=sau node docs/evidence/2026-10-26-hai-lech-man-chuyen-xe/kich-ban/hai-lech-smoke.mjs
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
const vn = new Date(Date.now() + 7 * 3600_000);
const bayGio = vn.getUTCHours() * 60 + vn.getUTCMinutes();
const BD = Math.ceil((bayGio + 75) / 5) * 5;
assert.ok(BD + 90 < 24 * 60, `kịch bản cần chạy trước ~21:10 giờ VN (chuyến hôm nay bắt đầu sau ~75 phút, dài 90 phút, phải xong trước nửa đêm) — bây giờ ${gio(bayGio)}`);

const { env, call } = await dungMoiTruong([CHU]);
const b = boDem(`HAI LECH MAN CHUYEN XE (${ANH})`);
// Cả phần dựng dữ liệu nằm trong try: hỏng giữa chừng vẫn tắt máy chủ thử + Chrome (`env.stop()` ở finally cuối tệp) và thoát 1, không in "OK (0 bước)".
let dungXong = false;
try {
const dung = (r, ma, viec) => assert.equal(r.status, ma, `${viec}: ${r.status} ${r.text}`);
const homNay = vnDate(0);
const han = vnDate(300);

// ---- Chính sách: mốc chốt 60 phút (xác nhận đơn hôm nay không cần đặt gấp), không bắt đủ tên, cửa sổ cho xe chạy 48 giờ ------------------------------------------
dung(await call(CHU, "POST", "/api/van-chuyen/chinh-sach-dieu-phoi", { minLeadMinutes: 60, warnLeadMinutes: 30, restMinutes: 30, requireManifest: false, proxyBackdateMaxMinutes: 180, dutyDayMaxMinutes: 480, tripNoBreakMaxMinutes: 240, departureWindowMinutes: 2880, refuseLeadMinutes: 720, officePhone: "0905123456", acceptWaitMinutes: 10, autoConfirmTransfer: true }), 201, "chính sách");

// ---- Tài xế công ty, xe, đơn, chuyến ------------------------------------------------------------------------------------------------------------------------------
const tk = await call(CHU, "POST", "/api/staff", { taoHoSoMoi: true, fullName: "Trần Văn Tâm", phone: "0900000261", roles: ["DRIVER_INTERNAL"] });
dung(tk, 201, "tài khoản Tâm");
const [{ party_id: tamParty }] = env.sql(`SELECT party_id FROM staff WHERE id = '${tk.json.staff.id}'`);
const TAM = { name: "Trần Văn Tâm", phone: tk.json.staff.phone, pin: tk.json.pin, permissions: ["DRIVER"] };
dung(await call(ACCOUNTS.admin, "POST", `/api/parties/${tamParty}/documents`, { typeCode: "GPLX", number: "790100000261", classCode: "D2", expiryDate: han }), 201, "GPLX Tâm");
const xr = await call(ACCOUNTS.admin, "POST", "/api/van-chuyen/xe", { plateNumber: "79A-261.26", chassisNumber: "TK79A26126", name: "Xe thử 79A-261.26", passengerCapacity: 15 });
dung(xr, 201, "xe");
for (const typeCode of ["INSPECTION", "TPL_INSURANCE"]) {
  dung(await call(ACCOUNTS.admin, "POST", `/api/van-chuyen/xe/${xr.json.vehicle.id}/giay-to`, { typeCode, number: `${typeCode}-79A-261.26`, expiryDate: han }), 201, `giấy ${typeCode}`);
}
const DON = {
  A: { noi: "Sheraton Nha Trang", tra: LOC_BEN_TAU, lienHe: "Chị Hoa Đặt Tour", sdt: "0903 261 001", soKhach: 2, ten: [["Nguyễn Thị Hoa", 1985], ["Trần Minh Khang", 1990]] },
  B: { noi: "Novotel Nha Trang", tra: CANG_VINPEARL, lienHe: "Anh Phúc Đặt Tour", sdt: "0903 261 002", soKhach: 2, ten: [["Lê Văn Phúc", 1978]] },
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
const chang = [await lapDon("A", homNay, gio(BD + 10)), await lapDon("B", homNay, gio(BD + 25))];
const t = await call(ACCOUNTS.admin, "POST", "/api/van-chuyen/chuyen", { requestId: randomUUID(), xeId: xr.json.vehicle.id, taiXePartyId: tamParty, batDau: { ngay: homNay, gio: gio(BD) }, ketThuc: { ngay: homNay, gio: gio(BD + 90) } });
dung(t, 201, "tạo chuyến");
const px = await call(ACCOUNTS.admin, "POST", `/api/van-chuyen/chuyen/${t.json.chuyen.id}/phan-bo`, { version: t.json.chuyen.version, requestId: randomUUID(), chang });
dung(px, 200, "xếp khách vào chuyến");
const TC = px.json.chuyen;
dungXong = true;

// ---- Công cụ màn -----------------------------------------------------------------------------------------------------------------------------------------------
/** Ảnh cả trang: kéo khung nhìn cao bằng trang rồi chụp, xong trả khung cũ. Chụp TRƯỚC phần kiểm của mỗi bước để bước đỏ vẫn có ảnh. */
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
const doiKhung = async (p, khung) => {
  await p.send("Emulation.setDeviceMetricsOverride", { width: khung.width, height: khung.height, deviceScaleFactor: khung.mobile ? 2 : 1, mobile: khung.mobile });
  await p.send("Emulation.setTouchEmulationEnabled", { enabled: khung.mobile });
  await p.send("Page.reload", {});
  await sleep(300);
  await p.waitFor("document.readyState === 'complete'", "tải lại theo khổ mới");
};
const DA_VE = (id) => `location.search.includes('${id}') && (!!document.querySelector('[data-action="xuat-ben"]') || !!document.querySelector('.dp-cc-head'))`;
const loiConsole = (p, ten) => assert.deepEqual(p.consoleErrors, [], `${ten}: lỗi console ${JSON.stringify(p.consoleErrors)}`);
/** Lề trái của CHỮ (không phải của khung): hộp bao quanh nội dung văn bản của phần tử. */
const LE_CHU = `(el) => { const r = document.createRange(); r.selectNodeContents(el); return r.getBoundingClientRect().left; }`;
/** Với mỗi dòng «Dịch vụ: …»: chênh lề trái so với tên nơi đón của CÙNG thẻ điểm (px, làm tròn 0,1). */
const CHENH_DICH_VU = `(() => { const le = ${LE_CHU}; return [...document.querySelectorAll('[data-dich-vu]')].map((d) => Math.round((le(d) - le(d.closest('.dp-run').querySelector('.dp-run-noi'))) * 10) / 10); })()`;
const DICH_VU_THANG_COT = async (p, soDong, viec) => {
  const chenh = await p.ev(CHENH_DICH_VU);
  assert.equal(chenh.length, soDong, `${viec}: có ${soDong} dòng «Dịch vụ» (đang ${chenh.length})`);
  assert.ok(chenh.every((x) => Math.abs(x) <= 1), `${viec}: «Dịch vụ: …» thẳng cột với tên nơi đón — chênh lề trái ${JSON.stringify(chenh)} px`);
};
/** «Khách i» chưa tên: khối «Khách đang chờ» (màn văn phòng) so với thẻ điểm — hai danh sách phải CÙNG nhau. */
const KHACH_CHUA_TEN_KHOI = `[...document.querySelectorAll('.dp-kc strong')].map((x) => x.innerText.trim()).filter((x) => /^Khách \\d+$/.test(x)).sort()`;
const KHACH_CHUA_TEN_THE = `[...document.querySelectorAll('.dp-khach-ten')].map((x) => x.innerText.trim()).filter((x) => /^Khách \\d+$/.test(x)).sort()`;
const DON_VAN_PHONG = async (p, viec) => {
  await p.waitFor(`document.querySelectorAll('.dp-khach').length >= 4 && document.querySelectorAll('.dp-kc').length === 4`, "khối Khách đang chờ + dòng khách ở Chi tiết chuyến", 12000);
  await chup(p, viec.anh, viec.khung);
  const khoi = await p.ev(KHACH_CHUA_TEN_KHOI);
  const the = await p.ev(KHACH_CHUA_TEN_THE);
  assert.deepEqual(khoi, ["Khách 2"], `${viec.ten}: khối «Khách đang chờ» ghi «Khách 2» (đếm theo điểm lên), không phải đếm cả chuyến — đang ${JSON.stringify(khoi)}`);
  assert.deepEqual(khoi, the, `${viec.ten}: khối chờ và thẻ điểm ghi CÙNG số cho cùng một khách (khối ${JSON.stringify(khoi)}, thẻ ${JSON.stringify(the)})`);
  assert.equal(await p.ev(noOverflowX), true, `${viec.ten}: không tràn ngang`);
  assert.equal(await p.ev("document.querySelectorAll('[data-dich-vu]').length"), 0, `${viec.ten}: màn văn phòng không có dòng «Dịch vụ» (chỉ màn tài xế)`);
  assert.equal(await p.ev(noCode), "");
  await axe(p, viec.ten);
};

  // ---- Tài xế công ty Tâm ----------------------------------------------------------------------------------------------------------------------------------------
  let p = await env.as(TAM, `/cuoc-chuyen?id=${TC.id}`, MOB);
  await b.step("1", `390 tài xế công ty, chuyến HÔM NAY chưa chạy: «Dịch vụ: …» (2 dòng, mỗi điểm đón một) thẳng cột với tên nơi đón${axeNote()}`, async () => {
    await p.waitFor(DA_VE(TC.id), "màn chuyến TC", 12000);
    await chup(p, "1-tai-xe-truoc-chay-390", MOB);
    const ct = (await fetchTrang(p, "GET", `/api/van-chuyen/cuoc-cua-toi/${TC.id}`)).json; // phiên của chính trang (ADR-0075)
    assert.ok(ct.trongNgayChay && ct.suat.some((s) => s.tenDichVu), "ca phân biệt được: máy chủ gửi tên dịch vụ trong ngày chạy");
    await DICH_VU_THANG_COT(p, 2, "390 chưa chạy");
    assert.equal(await p.ev(noOverflowX), true, "390 không tràn ngang");
    assert.equal(await p.ev(noCode), "");
    await axe(p, "tài xế trước khi chạy 390");
  });

  await b.step("2", `1040 cùng chuyến: «Dịch vụ: …» thẳng cột với tên nơi đón${axeNote()}`, async () => {
    await doiKhung(p, DESK);
    await p.waitFor(DA_VE(TC.id), "màn chuyến TC 1040", 12000);
    await chup(p, "2-tai-xe-truoc-chay-1040", DESK);
    await DICH_VU_THANG_COT(p, 2, "1040 chưa chạy");
    assert.equal(await p.ev(noOverflowX), true, "1040 không tràn ngang");
    await axe(p, "tài xế trước khi chạy 1040");
  });

  await b.step("3", `390 tài xế bấm «Cho xe chạy» → đang chạy: «Dịch vụ: …» vẫn thẳng cột${axeNote()}`, async () => {
    await doiKhung(p, MOB);
    await p.waitFor(DA_VE(TC.id), "màn chuyến TC 390", 12000);
    await p.ev(click('[data-action="xuat-ben"]'));
    await p.waitFor(`!!document.querySelector('[data-action="xuat-ben-xac-nhan"]')`, "hộp xác nhận cho xe chạy");
    await p.ev(click('[data-action="xuat-ben-xac-nhan"]'));
    await p.waitFor(`!!document.querySelector('.dp-cc-head')`, "màn đang chạy TC", 12000);
    await chup(p, "3-tai-xe-dang-chay-390", MOB);
    await DICH_VU_THANG_COT(p, 2, "390 đang chạy");
    assert.equal(await p.ev(noOverflowX), true);
    assert.equal(await p.ev(noCode), "");
    await axe(p, "tài xế đang chạy 390");
    loiConsole(p, "trang tài xế");
  });
  await p.close();

  // ---- Văn phòng (Quản trị) ------------------------------------------------------------------------------------------------------------------------------------------
  p = await env.as(ACCOUNTS.admin, `/chuyen?id=${TC.id}`, DESK);
  await b.step("4", `1040 văn phòng mở Chi tiết chuyến TC (đang chạy): khối «Khách đang chờ» ghi «Khách 2» cho khách chưa tên ở Novotel, CÙNG số với thẻ điểm${axeNote()}`, async () => {
    await DON_VAN_PHONG(p, { anh: "4-van-phong-chi-tiet-1040", khung: DESK, ten: "văn phòng 1040" });
  });
  await b.step("5", `390 văn phòng cùng chuyến: như khổ máy tính${axeNote()}`, async () => {
    await doiKhung(p, MOB);
    await DON_VAN_PHONG(p, { anh: "5-van-phong-chi-tiet-390", khung: MOB, ten: "văn phòng 390" });
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
