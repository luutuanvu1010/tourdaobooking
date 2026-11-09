// Kịch bản Chrome Đợt 2 (ADR-0189, ADR-0190 — kế hoạch con docs/superpowers/plans/ Đợt 2), hai hành vi giao diện mới:
//   A  ADR-0189 Quyết định 4 — màn chuyến của tài xế (/cuoc-chuyen): chuyến ĐANG CHẠY đã quá khung xem khách (xuất bến ngày D, hôm nay D+2, quên bấm Kết thúc)
//      hiện ĐÚNG câu nhắc «Chuyến chưa bấm Kết thúc — tên khách đã ẩn. Bấm Kết thúc khi xong hoặc báo văn phòng.», không tên khách, nút Kết thúc vẫn còn.
//      Ca đối chứng: chuyến đang chạy, hôm nay = ngày chạy → có tên khách, KHÔNG có câu nhắc.
//   B  ADR-0190 — form sửa hồ sơ khách (không gắn tài khoản) ở Danh bạ: Bán hàng thấy ô «Đang dùng» bị khoá, ô tên vẫn sửa và lưu được; Quản trị thấy ô mở.
// Giả "hôm nay = D+2": chuyến dựng bằng ĐƯỜNG THẬT (route API) cho NGÀY MAI rồi tài xế bấm Cho xe chạy (route tài xế, cửa sổ xuất bến 2880 phút), sau đó DỜI LÙI
//   cột ngày / giờ của chính dòng vc_trip trong D1 TẠM (không trigger nào chặn: xe, tài xế không chồng chuyến khác; CHECK service_date = ngày VN của giờ bắt đầu vẫn giữ):
//     TQ (quên Kết thúc): ngày chạy, giờ dự kiến lùi 3 ngày (→ D = hôm nay − 2), giờ xuất bến lùi 2 ngày (→ cùng ngày D). Máy chủ: trongNgayChay = false.
//     TT (trong khung): ngày chạy, giờ dự kiến lùi 1 ngày (→ hôm nay), giờ xuất bến giữ nguyên (hôm nay). Máy chủ: trongNgayChay = true.
//   Không phụ thuộc giờ trong ngày (đơn ngày mai 10:00 luôn cách bây giờ hơn mốc 60 phút; chỉ tránh chạy sát nửa đêm). Chỉ đụng D1 tạm của lần chạy.
// Kho cookie chung, một phiên mỗi tài khoản (ADR-0075): dựng dữ liệu bằng API XONG mới mở trang; thứ tự Tài xế Quân → Tài xế Tú → Bán hàng → Quản trị (mở sau cùng).
// Ảnh 390 và 1280 cho mỗi màn ở OUT/anh/. Chạy từ GỐC repo, sau `npm run build:web` (không cần mạng ngoài):
//   AXE_JS=<…/axe.min.js> CHROME_BIN=docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh OUT=docs/evidence/2026-11-09-dot-2-adr-luot-a node docs/evidence/2026-11-09-dot-2-adr-luot-a/kich-ban/dot-2-smoke.mjs
// Tên, SĐT, biển số, số giấy tờ ở đây là GIẢ (SĐT 0900000891–0900000899).
import { randomUUID } from "node:crypto";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { ACCOUNTS, CHU, LOC_BEN_TAU, OUT, assert, axe, axeNote, boDem, dungMoiTruong, fetchTrang, noCode, noOverflowX, sleep, vnDate } from "../../2026-09-29-adr-0049/kich-ban/dp-lib.mjs";

const OUT_DIR = OUT;
const MOB = { width: 390, height: 844, mobile: true };
const DESK = { width: 1280, height: 820, mobile: false };
const CAU_NHAC = "Chuyến chưa bấm Kết thúc — tên khách đã ẩn. Bấm Kết thúc khi xong hoặc báo văn phòng.";
const NGAY_MS = 86_400_000;
const TEN_KHACH_Q = [["Phan Thị Quỳnh", 1986], ["Đỗ Minh Quang", 1991]];
const TEN_KHACH_T = [["Lâm Thị Thu", 1984], ["Trịnh Văn Toàn", 1979]];
const TEN_HO_SO = "Khách Lẻ Ngừng Dùng 0190";

const { env, call: goi } = await dungMoiTruong([CHU]);
// Sau mỗi lệnh `wrangler d1 execute` (vài giây) kết nối giữ-sống của fetch tới máy chủ có thể đã chết → lần gửi đầu hỏng mà máy chủ KHÔNG nhận (cùng hiện tượng
// đã ghi ở `login` của a2-cdp.mjs) — gửi lại tối đa hai lần là an toàn.
const call = async (...a) => {
  for (let i = 0; ; i++) {
    try { return await goi(...a); } catch (e) {
      if (i >= 2 || (e?.cause?.code !== "ECONNRESET" && e?.cause?.code !== "UND_ERR_SOCKET")) throw e;
      await sleep(200);
    }
  }
};
const b = boDem("DOT 2 (ADR-0189, ADR-0190)");
let dungXong = false;
let QUAN, TU, TQ, TT, HO_SO;
try {
  const dung = (r, ma, viec) => assert.equal(r.status, ma, `${viec}: ${r.status} ${r.text}`);
  const ngayMai = vnDate(1);
  const homNay = vnDate(0);
  const D = vnDate(-2);
  const han = vnDate(300);

  // Chính sách: mốc chốt 60 phút, không bắt đủ tên, cửa sổ cho xe chạy 48 giờ (xuất bến được chuyến ngày mai ngay bây giờ).
  dung(await call(CHU, "POST", "/api/van-chuyen/chinh-sach-dieu-phoi", { minLeadMinutes: 60, warnLeadMinutes: 30, restMinutes: 30, requireManifest: false, proxyBackdateMaxMinutes: 180, dutyDayMaxMinutes: 480, tripNoBreakMaxMinutes: 240, departureWindowMinutes: 2880, refuseLeadMinutes: 720, officePhone: "0905123456", acceptWaitMinutes: 10, autoConfirmTransfer: true }), 201, "chính sách");

  const taiXe = async (fullName, phone, soGplx) => {
    const r = await call(CHU, "POST", "/api/staff", { taoHoSoMoi: true, fullName, phone, roles: ["DRIVER_INTERNAL"] });
    dung(r, 201, `tài khoản ${fullName}`);
    const [{ party_id: partyId }] = env.sql(`SELECT party_id FROM staff WHERE id = '${r.json.staff.id}'`);
    dung(await call(ACCOUNTS.admin, "POST", `/api/parties/${partyId}/documents`, { typeCode: "GPLX", number: soGplx, classCode: "D2", expiryDate: han }), 201, `GPLX ${fullName}`);
    return { partyId, account: { name: fullName, phone: r.json.staff.phone, pin: r.json.pin, permissions: ["DRIVER"] } };
  };
  QUAN = await taiXe("Hồ Văn Quân", "0900000891", "790100000891");
  TU = await taiXe("Mai Văn Tú", "0900000892", "790100000892");
  const xe = async (plateNumber) => {
    const r = await call(ACCOUNTS.admin, "POST", "/api/van-chuyen/xe", { plateNumber, chassisNumber: `D2${plateNumber.replace(/[^0-9A-Z]/g, "")}`, name: `Xe thử ${plateNumber}`, passengerCapacity: 15 });
    dung(r, 201, `xe ${plateNumber}`);
    for (const typeCode of ["INSPECTION", "TPL_INSURANCE"]) dung(await call(ACCOUNTS.admin, "POST", `/api/van-chuyen/xe/${r.json.vehicle.id}/giay-to`, { typeCode, number: `${typeCode}-${plateNumber}`, expiryDate: han }), 201, `giấy ${typeCode} ${plateNumber}`);
    return r.json.vehicle.id;
  };
  const XE_Q = await xe("79A-189.01");
  const XE_T = await xe("79A-189.02");
  let soDon = 0;
  const lapDon = async (noi, ten) => {
    soDon++;
    const r = await call(ACCOUNTS.salesA, "POST", "/api/orders", {
      customerName: `Người Đặt Đợt Hai ${soDon}`, customerPhone: `0903 189 00${soDon}`, customerEmail: "", customerNote: "", discount: 0, depositAmount: 0, depositMethod: null, paymentNote: "",
      services: [{
        kind: "catalog", pickupChoice: "DON", catalogCode: "TD101", pax: { adult: ten.length, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: 1350000 },
        departTime: "", pickupTime: "", pickupPlace: "", checkinDate: "", checkinTime: "", checkinPlace: "", note: "", departDate: ngayMai,
        legs: [{ direction: "OUT", pickupDate: ngayMai, pickupTime: "10:15", pickupLocationId: null, pickupPlace: noi, dropoffLocationId: LOC_BEN_TAU, dropoffPlace: "" }],
      }],
      passengers: ten.map(([fullName, birthYear]) => ({ fullName, birthYear, paxCode: null })),
    });
    dung(r, 201, `lập đơn ${noi}`);
    // Nháp là của riêng người lập (ADR-0135): chính người lập xác nhận.
    dung(await call(ACCOUNTS.salesA, "POST", `/api/orders/${r.json.order.id}/status`, { status: "confirmed" }), 200, `xác nhận đơn ${noi}`);
    return { legId: r.json.order.services[0].legs[0].id, soSuat: ten.length };
  };
  const chuyen = async (xeId, tx, chang) => {
    const t = await call(ACCOUNTS.admin, "POST", "/api/van-chuyen/chuyen", { requestId: randomUUID(), xeId, taiXePartyId: tx.partyId, batDau: { ngay: ngayMai, gio: "10:00" }, ketThuc: { ngay: ngayMai, gio: "11:30" } });
    dung(t, 201, `tạo chuyến ${tx.account.name}`);
    const x = await call(ACCOUNTS.admin, "POST", `/api/van-chuyen/chuyen/${t.json.chuyen.id}/phan-bo`, { version: t.json.chuyen.version, requestId: randomUUID(), chang });
    dung(x, 200, `xếp khách ${tx.account.name}`);
    return x.json.chuyen;
  };
  TQ = await chuyen(XE_Q, QUAN, [await lapDon("Sheraton Nha Trang", TEN_KHACH_Q)]);
  TT = await chuyen(XE_T, TU, [await lapDon("Novotel Nha Trang", TEN_KHACH_T)]);
  // Tài xế bấm Cho xe chạy (route tài xế). `call` đăng nhập phiên riêng; trang mở SAU sẽ đăng nhập phiên mới (ADR-0075) — không dùng `call` của tài xế nữa.
  for (const [t, tx] of [[TQ, QUAN], [TT, TU]]) dung(await call(tx.account, "POST", `/api/van-chuyen/cuoc-cua-toi/${t.id}/xuat-ben`, { requestId: randomUUID() }), 200, `cho xe chạy ${tx.account.name}`);
  // Dời lùi trên D1 tạm (xem đầu tệp). departed_at tính lại từ departed_ms CŨ (vế phải của UPDATE đọc giá trị cũ).
  const doi = (id, ngay, lui, luiXuatBen) => env.sql(`UPDATE vc_trip SET service_date = '${ngay}', planned_start_ms = planned_start_ms - ${lui}, planned_end_ms = planned_end_ms - ${lui}, earliest_start_ms = earliest_start_ms - ${lui}, departed_ms = departed_ms - ${luiXuatBen}, departed_at = strftime('%Y-%m-%dT%H:%M:%fZ', (departed_ms - ${luiXuatBen}) / 1000.0, 'unixepoch') WHERE id = '${id}' AND status = 'RUNNING'`);
  doi(TQ.id, D, 3 * NGAY_MS, 2 * NGAY_MS);
  doi(TT.id, homNay, 1 * NGAY_MS, 0);
  const [q] = env.sql(`SELECT service_date, status, date(departed_ms / 1000, 'unixepoch', '+7 hours') AS ngay_xb FROM vc_trip WHERE id = '${TQ.id}'`);
  assert.deepEqual({ ...q }, { service_date: D, status: "RUNNING", ngay_xb: D }, "TQ: ngày chạy và ngày xuất bến = D (hôm nay − 2), vẫn đang chạy");
  const [t2] = env.sql(`SELECT service_date, status FROM vc_trip WHERE id = '${TT.id}'`);
  assert.deepEqual({ ...t2 }, { service_date: homNay, status: "RUNNING" }, "TT: ngày chạy hôm nay, đang chạy");

  // Hồ sơ khách (không gắn tài khoản) do Bán hàng tạo — cho phần B.
  const hs = await call(ACCOUNTS.salesA, "POST", "/api/parties", { kind: "PERSON", fullName: TEN_HO_SO, contacts: [{ kind: "PHONE", value: "0912 189 190" }] });
  dung(hs, 201, "hồ sơ khách");
  HO_SO = hs.json.party.id;
  dungXong = true;
} catch (e) {
  console.log(`✗ dựng dữ liệu hỏng — không chạy bước nào:\n    ${String(e?.stack ?? e).split("\n").slice(0, 10).join("\n    ")}`);
  process.exitCode = 1;
}

/** Ảnh cả trang: kéo khung nhìn cao bằng trang rồi chụp, xong trả khung cũ (khuôn tai-xe-thay-khach-smoke). */
const chup = async (p, ten, khung) => {
  await sleep(400);
  const cao = await p.ev("Math.ceil(document.documentElement.scrollHeight)");
  const dat = (h) => p.send("Emulation.setDeviceMetricsOverride", { width: khung.width, height: h, deviceScaleFactor: khung.mobile ? 2 : 1, mobile: khung.mobile });
  await dat(Math.max(khung.height, cao));
  await sleep(350);
  const r = await p.send("Page.captureScreenshot", { format: "png" });
  writeFileSync(join(OUT_DIR, "anh", `${ten}.png`), Buffer.from(r.result.data, "base64"));
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
const loiConsole = (p, ten) => assert.deepEqual(p.consoleErrors, [], `${ten}: lỗi console ${JSON.stringify(p.consoleErrors)}`);
const DA_VE = `!!document.querySelector('.dp-cc-head')`;
/** Các dải cảnh báo có tiêu đề đúng câu nhắc. */
const SO_NHAC = `[...document.querySelectorAll('#cc-trang .banner .banner-title')].filter((x) => x.textContent.trim() === ${JSON.stringify(CAU_NHAC)}).length`;
const CO_CHU_NHAC = `document.querySelector('main').innerText.includes('Chuyến chưa bấm Kết thúc')`;
const TEN_TREN_MAN = `[...document.querySelectorAll('.dp-khach-ten')].map((x) => x.innerText.trim())`;
const MAIN_TEXT = `document.querySelector('main').innerText`;
/** Chữ các nút «Kết thúc chuyến» đang hiện (nút chính dính đáy hoặc nút khoá cuối danh sách — không tính «Kết thúc gián đoạn»). */
const NUT_KET_THUC = `[...document.querySelectorAll('[data-action="ket-thuc"]')].filter((x) => x.getClientRects().length > 0).map((x) => x.textContent.trim())`;

try {
if (dungXong) {
  try {
    // ---- A1. Tài xế Quân — chuyến quên Kết thúc (D+2) ------------------------------------------------------------------------------------------------------
    let p = await env.as(QUAN.account, `/cuoc-chuyen?id=${TQ.id}`, MOB);
    await b.step("A1", `390 tài xế CÔNG TY, chuyến đang chạy xuất bến ngày D, hôm nay D+2: đúng một câu nhắc «${CAU_NHAC}», không tên khách, nút Kết thúc còn${axeNote()}`, async () => {
      await p.waitFor(DA_VE, "màn chuyến TQ", 12000);
      await chup(p, "a1-quen-ket-thuc-390", MOB);
      const ct = (await fetchTrang(p, "GET", `/api/van-chuyen/cuoc-cua-toi/${TQ.id}`)).json;
      assert.equal(ct.chuyen.trangThai, "RUNNING", "chống bài rỗng: chuyến vẫn đang chạy");
      assert.equal(ct.trongNgayChay, false, "máy chủ: ngoài khung xem khách");
      assert.equal(await p.ev(SO_NHAC), 1, "đúng một dải có tiêu đề là câu nhắc");
      const chu = await p.ev(MAIN_TEXT);
      for (const [ten] of TEN_KHACH_Q) assert.ok(!chu.includes(ten), `màn lộ tên khách "${ten}"`);
      assert.ok(!(await p.ev(TEN_TREN_MAN)).some((t) => TEN_KHACH_Q.some(([x]) => t.includes(x))), "dòng khách không có tên");
      assert.ok((await p.ev(NUT_KET_THUC)).includes("Kết thúc chuyến"), "còn nút «Kết thúc chuyến» (khoá hay mở đều được)");
      assert.equal(await p.ev(noCode), "");
      assert.equal(await p.ev(noOverflowX), true, "390 không tràn ngang");
      await axe(p, "quên Kết thúc 390");
      loiConsole(p, "A1");
    });
    await b.step("A2", `1280 cùng chuyến: câu nhắc, không tên khách, nút Kết thúc còn; không tràn ngang${axeNote()}`, async () => {
      await doiKhung(p, DESK);
      await p.waitFor(DA_VE, "màn chuyến TQ 1280", 12000);
      await chup(p, "a2-quen-ket-thuc-1280", DESK);
      assert.equal(await p.ev(SO_NHAC), 1);
      const chu = await p.ev(MAIN_TEXT);
      for (const [ten] of TEN_KHACH_Q) assert.ok(!chu.includes(ten), `màn lộ tên khách "${ten}"`);
      assert.ok((await p.ev(NUT_KET_THUC)).includes("Kết thúc chuyến"), "còn nút «Kết thúc chuyến»");
      assert.equal(await p.ev(noOverflowX), true, "1280 không tràn ngang");
      await axe(p, "quên Kết thúc 1280");
      loiConsole(p, "A2");
    });
    p.close();

    // ---- A3. Tài xế Tú — chuyến đang chạy trong khung (hôm nay = ngày chạy) --------------------------------------------------------------------------------
    p = await env.as(TU.account, `/cuoc-chuyen?id=${TT.id}`, MOB);
    await b.step("A3", `390 đối chứng: chuyến đang chạy, hôm nay = ngày chạy → có tên khách, KHÔNG có câu nhắc${axeNote()}`, async () => {
      await p.waitFor(DA_VE, "màn chuyến TT", 12000);
      await chup(p, "a3-trong-khung-390", MOB);
      const ct = (await fetchTrang(p, "GET", `/api/van-chuyen/cuoc-cua-toi/${TT.id}`)).json;
      assert.equal(ct.chuyen.trangThai, "RUNNING");
      assert.equal(ct.trongNgayChay, true, "máy chủ: trong khung");
      assert.equal(await p.ev(CO_CHU_NHAC), false, "không có câu nhắc");
      assert.deepEqual((await p.ev(TEN_TREN_MAN)).sort(), TEN_KHACH_T.map(([t]) => t).sort(), "chống bài rỗng: thấy đủ tên khách");
      assert.equal(await p.ev(noOverflowX), true);
      await axe(p, "trong khung 390");
      loiConsole(p, "A3");
    });
    await b.step("A4", `1280 đối chứng: có tên khách, không câu nhắc${axeNote()}`, async () => {
      await doiKhung(p, DESK);
      await p.waitFor(DA_VE, "màn chuyến TT 1280", 12000);
      await chup(p, "a4-trong-khung-1280", DESK);
      assert.equal(await p.ev(CO_CHU_NHAC), false);
      assert.deepEqual((await p.ev(TEN_TREN_MAN)).sort(), TEN_KHACH_T.map(([t]) => t).sort());
      assert.equal(await p.ev(noOverflowX), true);
      await axe(p, "trong khung 1280");
      loiConsole(p, "A4");
    });
    p.close();

    // ---- B. Danh bạ — form sửa hồ sơ khách -------------------------------------------------------------------------------------------------------------------
    const MO_HO_SO = `!document.querySelector('#detail').hidden && (document.querySelector('#detail h2')?.textContent ?? '').includes(${JSON.stringify(TEN_HO_SO)}) && [...document.querySelectorAll('#detail label.check')].some((l) => l.textContent.includes('Đang dùng'))`;
    const O_DANG_DUNG = `[...document.querySelectorAll('#detail label.check')].find((l) => l.textContent.includes('Đang dùng')).querySelector('input')`;
    const O_TEN = `[...document.querySelectorAll('#detail label')].find((l) => l.textContent.trim().startsWith('Họ và tên'))?.querySelector('input')`;
    const trangThaiO = `(() => { const a = ${O_DANG_DUNG}; const t = ${O_TEN}; return { dangDungKhoa: a.disabled, dangDungChon: a.checked, tenKhoa: t ? t.disabled : null, tenGiaTri: t ? t.value : null }; })()`;
    p = await env.as(ACCOUNTS.salesA, `/parties?id=${HO_SO}`, MOB);
    await b.step("B1", `390 Bán hàng mở hồ sơ khách (không gắn tài khoản): ô «Đang dùng» khoá (vẫn đang chọn), ô Họ và tên sửa được${axeNote()}`, async () => {
      await p.waitFor(MO_HO_SO, "hồ sơ mở (Bán hàng)", 12000);
      const r = (await fetchTrang(p, "GET", `/api/parties/${HO_SO}`)).json.party;
      assert.deepEqual({ accountLinked: r.accountLinked, activeEditable: r.activeEditable, editable: r.editable }, { accountLinked: false, activeEditable: false, editable: true }, "máy chủ: Bán hàng sửa được hồ sơ nhưng không đổi được cờ Đang dùng");
      await chup(p, "b1-ban-hang-ho-so-390", MOB);
      assert.deepEqual(await p.ev(trangThaiO), { dangDungKhoa: true, dangDungChon: true, tenKhoa: false, tenGiaTri: TEN_HO_SO });
      assert.equal(await p.ev(noOverflowX), true);
      await axe(p, "Bán hàng hồ sơ 390");
      loiConsole(p, "B1");
    });
    await b.step("B2", `1280 Bán hàng: ô «Đang dùng» khoá, đổi tên rồi bấm «Lưu thông tin» → lưu được, hồ sơ vẫn đang dùng${axeNote()}`, async () => {
      await doiKhung(p, DESK);
      await p.waitFor(MO_HO_SO, "hồ sơ mở (Bán hàng 1280)", 12000);
      await chup(p, "b2-ban-hang-ho-so-1280", DESK);
      assert.deepEqual(await p.ev(trangThaiO), { dangDungKhoa: true, dangDungChon: true, tenKhoa: false, tenGiaTri: TEN_HO_SO });
      await p.ev(`(() => { const t = ${O_TEN}; t.value = ${JSON.stringify(`${TEN_HO_SO} Sửa`)}; t.dispatchEvent(new Event('input', { bubbles: true })); return true; })()`);
      await p.ev(`[...document.querySelectorAll('#detail button')].find((x) => x.textContent.trim() === 'Lưu thông tin').click(), true`);
      await p.waitFor(`(document.querySelector('#detail h2')?.textContent ?? '').includes(${JSON.stringify(`${TEN_HO_SO} Sửa`)})`, "tên mới hiện sau khi lưu", 10000);
      const [row] = env.sql(`SELECT display_name, active FROM pty_party WHERE id = '${HO_SO}'`);
      assert.deepEqual({ ...row }, { display_name: `${TEN_HO_SO} Sửa`, active: 1 }, "D1: tên đã đổi, hồ sơ vẫn đang dùng");
      assert.equal(await p.ev(`document.querySelector('#error')?.hidden ?? true`), true, "không báo lỗi");
      assert.equal(await p.ev(noOverflowX), true);
      await axe(p, "Bán hàng hồ sơ 1280");
      loiConsole(p, "B2");
    });
    p.close();

    // Quản trị mở SAU CÙNG (kho cookie chung).
    // Tên hiện hành đọc từ D1 (B2 hỏng thì B3, B4 vẫn kiểm được ô của Quản trị, không đỏ dây chuyền).
    const TEN_SAU = env.sql(`SELECT display_name FROM pty_party WHERE id = '${HO_SO}'`)[0].display_name;
    const MO_HO_SO_2 = MO_HO_SO.replace(JSON.stringify(TEN_HO_SO), JSON.stringify(TEN_SAU));
    p = await env.as(ACCOUNTS.admin, `/parties?id=${HO_SO}`, MOB);
    await b.step("B3", `390 Quản trị mở cùng hồ sơ: ô «Đang dùng» MỞ, ô Họ và tên sửa được${axeNote()}`, async () => {
      await p.waitFor(MO_HO_SO_2, "hồ sơ mở (Quản trị)", 12000);
      const r = (await fetchTrang(p, "GET", `/api/parties/${HO_SO}`)).json.party;
      assert.equal(r.activeEditable, true, "máy chủ: Quản trị đổi được cờ Đang dùng");
      await chup(p, "b3-quan-tri-ho-so-390", MOB);
      assert.deepEqual(await p.ev(trangThaiO), { dangDungKhoa: false, dangDungChon: true, tenKhoa: false, tenGiaTri: TEN_SAU });
      assert.equal(await p.ev(noOverflowX), true);
      await axe(p, "Quản trị hồ sơ 390");
      loiConsole(p, "B3");
    });
    await b.step("B4", `1280 Quản trị: ô «Đang dùng» mở${axeNote()}`, async () => {
      await doiKhung(p, DESK);
      await p.waitFor(MO_HO_SO_2, "hồ sơ mở (Quản trị 1280)", 12000);
      await chup(p, "b4-quan-tri-ho-so-1280", DESK);
      assert.deepEqual(await p.ev(trangThaiO), { dangDungKhoa: false, dangDungChon: true, tenKhoa: false, tenGiaTri: TEN_SAU });
      assert.equal(await p.ev(noOverflowX), true);
      await axe(p, "Quản trị hồ sơ 1280");
      loiConsole(p, "B4");
    });
    p.close();
  } finally {
    b.xong();
  }
}
} finally {
  await env.stop();
}
