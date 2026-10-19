// ADR-0113 (accepted 2026-10-12) Đ3 — màn tài xế đối tác khi chuyến của mình đã nhận khách chuyển từ xe khác sang: không còn "Từ chối chuyến", dải thứ ba
// "Chuyến có khách chuyển từ xe khác sang" (không phải "Đã quá hạn từ chối") + "Gọi văn phòng"; lệnh Từ chối bấm trên trang CŨ (khách chuyển vào SAU khi trang mở)
// bị máy chủ chặn 409 → trang đọc lại và hiện dải, không văng ra "Cuốc của tôi".
// Đi đường thật (route API); tên / SĐT / biển số GIẢ. Chuyến ở NGÀY MAI nên chạy lúc nào cũng được (không cần trước 22:50).
//   X (tài xế công ty Dũng, xe công ty, 06:00 ngày mai): một điểm đón 2 khách; văn phòng bấm Xuất bến sớm.
//   TA (tài xế đối tác Đông, xe nhà xe, 20:00 ngày mai, hạn Từ chối 08:00 ngày mai): xe nhận.
// Thứ tự: cuộc gọi API dựng dữ liệu TRƯỚC khi mở trình duyệt (kho cookie dùng chung, mỗi tài khoản một phiên — ADR-0075); trong trình duyệt chỉ có tài xế đối tác
// (xác nhận Nhận bằng fetch của chính trang đó, để không đá phiên).
//  1) 390 TA trước khi có khách chuyển vào: dải "Từ chối được tới …", có nút "Từ chối chuyến"; không khoá chanTuChoi.
//  2) Cùng trang: Nhận (chuyển khách vào) rồi bấm Từ chối trên trang cũ → 409 → dải cảnh báo, không rời trang, nút Từ chối biến mất; đúng MỘT lệnh POST …/tu-choi.
//  3) 390 mở lại: dải "Chuyến có khách chuyển từ xe khác sang" + "Gọi văn phòng" (tel:), KHÔNG chữ "quá hạn", không nút Từ chối; không mã thô; không tràn ngang; axe.
//  4) 1040 cùng nội dung; axe.
// Chạy từ GỐC repo, sau `npm run build:web` (không cần mạng ngoài):
//   AXE_JS=<…/axe.min.js> CHROME_BIN=docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh OUT=docs/evidence/2026-10-12-adr-0113 node docs/evidence/2026-10-12-adr-0113/kich-ban/adr-0113-chan-tu-choi-smoke.mjs
import { randomUUID } from "node:crypto";
import {
  ACCOUNTS, CHU, DESK, MOB, LOC_BEN_TAU, apiCalls, assert, axe, axeNote, boDem, click, dungMoiTruong, fetchTrang, noCode, noOverflowX, shotFull, shotView, sleep, txt, vnDate,
} from "../../2026-09-29-adr-0049/kich-ban/dp-lib.mjs";

const { env, call } = await dungMoiTruong([CHU]);
const b = boDem("ADR-0113 CHAN TU CHOI");
const dung = (r, ma, viec) => assert.equal(r.status, ma, `${viec}: ${r.status} ${r.text}`);
const SDT_VP = "0905123456";
const TEN_TX = "Lê Văn Đông";
const ngayMai = vnDate(1);
const han = vnDate(300);

// ---- Chính sách (hạn Từ chối 12 giờ, có số văn phòng, cửa sổ xuất bến 48 giờ) ---------------------------------------------------------------------------------
dung(await call(CHU, "POST", "/api/van-chuyen/chinh-sach-dieu-phoi", { minLeadMinutes: 360, warnLeadMinutes: 120, restMinutes: 30, requireManifest: true, proxyBackdateMaxMinutes: 180, dutyDayMaxMinutes: 480, tripNoBreakMaxMinutes: 240, departureWindowMinutes: 2880, refuseLeadMinutes: 720, officePhone: SDT_VP, acceptWaitMinutes: 10, autoConfirmTransfer: true }), 201, "chính sách");

// ---- Tài xế đối tác + nhà xe + xe + chuyến TA ------------------------------------------------------------------------------------------------------------------
const nx = await call(ACCOUNTS.admin, "POST", "/api/parties", { kind: "ORGANIZATION", displayName: "Nhà Xe Đông Chrome 113" });
dung(nx, 201, "nhà xe");
const nhaXe = nx.json.party.id;
dung(await call(ACCOUNTS.admin, "POST", `/api/parties/${nhaXe}/roles`, { roleTypeCode: "CARRIER" }), 201, "vai nhà xe");
const tk = await call(CHU, "POST", "/api/staff", { taoHoSoMoi: true, fullName: TEN_TX, phone: "0900000113", roles: ["DRIVER_EXTERNAL"] });
dung(tk, 201, "tài xế đối tác");
const TX = { name: TEN_TX, phone: tk.json.staff.phone, pin: tk.json.pin, permissions: ["DRIVER_PARTNER"] };
const [{ party_id: txParty }] = env.sql(`SELECT party_id FROM staff WHERE id = '${tk.json.staff.id}'`);
dung(await call(ACCOUNTS.admin, "POST", `/api/parties/${nhaXe}/relationships`, { fromPartyId: txParty, toPartyId: nhaXe, relationshipTypeCode: "DRIVES_FOR" }), 201, "Tài xế của");
dung(await call(ACCOUNTS.admin, "POST", `/api/parties/${txParty}/documents`, { typeCode: "GPLX", number: "790100000113", classCode: "D2", expiryDate: han }), 201, "GPLX đối tác");
const xeDt = await call(ACCOUNTS.admin, "POST", "/api/van-chuyen/xe", { plateNumber: "79B-113.13", chassisNumber: "KHUNGDONG113", name: "Xe thử nhà xe Đông", passengerCapacity: 15, ownerPartyId: nhaXe });
dung(xeDt, 201, "xe nhà xe");
for (const typeCode of ["INSPECTION", "TPL_INSURANCE"]) {
  dung(await call(ACCOUNTS.admin, "POST", `/api/van-chuyen/xe/${xeDt.json.vehicle.id}/giay-to`, { typeCode, number: `${typeCode}-DT113`, expiryDate: han }), 201, `giấy ${typeCode} xe nhà xe`);
}
const ta = await call(ACCOUNTS.admin, "POST", "/api/van-chuyen/chuyen", { requestId: randomUUID(), xeId: xeDt.json.vehicle.id, taiXePartyId: txParty, batDau: { ngay: ngayMai, gio: "20:00" }, ketThuc: { ngay: ngayMai, gio: "21:30" } });
dung(ta, 201, "tạo chuyến TA");
const TA = ta.json.chuyen;

// ---- Tài xế công ty + xe + đơn + chuyến X (xuất bến sớm) -------------------------------------------------------------------------------------------------------
const xeCt = await call(ACCOUNTS.admin, "POST", "/api/van-chuyen/xe", { plateNumber: "79A-113.13", chassisNumber: "KHUNGCTY113", name: "Xe thử công ty", passengerCapacity: 15 });
dung(xeCt, 201, "xe công ty");
for (const typeCode of ["INSPECTION", "TPL_INSURANCE"]) {
  dung(await call(ACCOUNTS.admin, "POST", `/api/van-chuyen/xe/${xeCt.json.vehicle.id}/giay-to`, { typeCode, number: `${typeCode}-113`, expiryDate: han }), 201, `giấy ${typeCode}`);
}
const tkCt = await call(CHU, "POST", "/api/staff", { taoHoSoMoi: true, fullName: "Đỗ Văn Dũng", phone: "0900000114", roles: ["DRIVER_INTERNAL"] });
dung(tkCt, 201, "tài xế công ty");
const [{ party_id: dungParty }] = env.sql(`SELECT party_id FROM staff WHERE id = '${tkCt.json.staff.id}'`);
dung(await call(ACCOUNTS.admin, "POST", `/api/parties/${dungParty}/documents`, { typeCode: "GPLX", number: "790100000114", classCode: "D2", expiryDate: han }), 201, "GPLX công ty");
const DUNG = { name: "Đỗ Văn Dũng", phone: tkCt.json.staff.phone, pin: tkCt.json.pin, permissions: ["DRIVER"] };
const don = await call(ACCOUNTS.salesA, "POST", "/api/orders", {
  customerName: "Khách ADR113", customerPhone: "0903 113 113", customerEmail: "", customerNote: "", discount: 0, depositAmount: 0, depositMethod: null, paymentNote: "",
  services: [{
    kind: "catalog", pickupChoice: "DON", catalogCode: "TD101", pax: { adult: 2, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: 1350000 },
    departTime: "", pickupTime: "", pickupPlace: "", checkinDate: "", checkinTime: "", checkinPlace: "", note: "", departDate: ngayMai,
    legs: [{ direction: "OUT", pickupDate: ngayMai, pickupTime: "06:30", pickupLocationId: null, pickupPlace: "Khách sạn Nguồn 113", dropoffLocationId: LOC_BEN_TAU, dropoffPlace: "" }],
  }],
  passengers: [{ fullName: "Khách Một ADR113", birthYear: 1980, paxCode: null }, { fullName: "Khách Hai ADR113", birthYear: 1981, paxCode: null }],
});
dung(don, 201, "lập đơn");
const legId = don.json.order.services[0].legs[0].id;
dung(await call(ACCOUNTS.admin, "POST", `/api/orders/${don.json.order.id}/status`, { status: "confirmed" }), 200, "xác nhận đơn");
const x0 = await call(ACCOUNTS.admin, "POST", "/api/van-chuyen/chuyen", { requestId: randomUUID(), xeId: xeCt.json.vehicle.id, taiXePartyId: dungParty, batDau: { ngay: ngayMai, gio: "06:00" }, ketThuc: { ngay: ngayMai, gio: "08:00" } });
dung(x0, 201, "tạo chuyến X");
const x1 = await call(ACCOUNTS.admin, "POST", `/api/van-chuyen/chuyen/${x0.json.chuyen.id}/phan-bo`, { version: x0.json.chuyen.version, requestId: randomUUID(), chang: [{ legId, soSuat: 2 }] });
dung(x1, 200, "xếp chuyến X");
const X = x1.json.chuyen;
dung(await call(ACCOUNTS.admin, "POST", `/api/van-chuyen/chuyen/${X.id}/xuat-ben`, { requestId: randomUUID() }), 200, "văn phòng xuất bến X");
const xCt = await call(DUNG, "GET", `/api/van-chuyen/cuoc-cua-toi/${X.id}`);
dung(xCt, 200, "tài xế công ty xem X");
const diemDon = xCt.json.diem.find((d) => d.loai === "PICKUP").id;
const gui = await call(DUNG, "POST", `/api/van-chuyen/cuoc-cua-toi/${X.id}/de-nghi`, { requestId: randomUUID(), denChuyenId: TA.id, phamVi: "STOP", diemId: diemDon });
dung(gui, 200, "gửi đề nghị X → TA");
const idDeNghi = gui.json.deNghi.id;

const CAU_DAI = "Chuyến có khách chuyển từ xe khác sang";
const tieuDe = (p) => p.ev("[...document.querySelectorAll('.banner .banner-title')].map((x) => x.innerText.trim())");

try {
  let p = await env.as(TX, `/cuoc-chuyen?id=${TA.id}`, MOB);
  try {
    await b.step("1", "390 TA CHƯA có khách chuyển vào: dải 'Từ chối được tới …', có nút 'Từ chối chuyến'" + axeNote(), async () => {
      await p.waitFor("!!document.querySelector('[data-action=\"tu-choi\"]')", "nút Từ chối của TA", 12000);
      const t = await tieuDe(p);
      assert.ok(t.includes(`Từ chối được tới 08:00 ${ngayMai.slice(8, 10)}/${ngayMai.slice(5, 7)}`), JSON.stringify(t));
      assert.equal(await p.ev("document.querySelector('[data-action=\"goi-van-phong\"]')"), null, "còn hạn: chưa có nút Gọi văn phòng");
      assert.ok(await p.ev(noOverflowX), "không tràn ngang");
      await axe(p, "TA còn hạn 390");
      await shotView(p, "adr0113-1-con-han-390.png");
    });

    await b.step("2", "trang CŨ: khách chuyển vào sau khi trang mở → bấm Từ chối → 409, không rời trang, dải cảnh báo, nút Từ chối biến mất; một lệnh POST …/tu-choi", async () => {
      // Ổn định (VỪA-1 người kiểm 12/10): màn tự đọc lại chuyến khi bảng tin phát `chuyen-thay-doi` / `can-tai-lai` (bangtin.ts → window.dispatchEvent) nên nút Từ chối
      // có thể biến mất TRƯỚC khi script bấm. Nuốt đúng hai sự kiện đó ở `window.dispatchEvent` (không phụ thuộc thứ tự trình nghe) để trang giữ nguyên bản CŨ — đúng
      // tình huống "mở trang trước, khách chuyển vào sau". Các sự kiện khác vẫn đi qua.
      await p.ev("(() => { const goc = window.dispatchEvent.bind(window); window.dispatchEvent = (e) => (e.type === 'chuyen-thay-doi' || e.type === 'can-tai-lai') ? true : goc(e); return true; })()");
      const nhan = await fetchTrang(p, "POST", `/api/van-chuyen/de-nghi/${idDeNghi}/nhan`, { requestId: randomUUID() });
      dung(nhan, 200, "Nhận (trong trang)");
      if (nhan.json.ketQua === "LEO_THANG") {
        // Xe nhận (20:00 ngày mai) chưa chạy nên có thể rơi dưới một điều kiện cấu hình → văn phòng (Toàn quyền) Duyệt: vẫn là đường thật tới "khách chuyển vào".
        console.log("  (Nhận → Leo thang; điều kiện không đạt:", JSON.stringify(env.sql(`SELECT rule_code FROM vc_transfer_check WHERE transfer_id = '${idDeNghi}' AND ket_qua = 'KHONG_DAT'`)), "→ Toàn quyền Duyệt)");
        dung(await call(CHU, "POST", `/api/van-chuyen/de-nghi/${idDeNghi}/duyet`, { requestId: randomUUID(), lyDo: "PHA_LE_SU_CO" }), 200, "Duyệt");
      }
      assert.equal(env.sql(`SELECT count(*) AS n FROM vc_trip_allocation WHERE trip_id = '${TA.id}' AND transfer_id IS NOT NULL AND valid_to_at IS NULL`)[0].n, 2, "khách đã chuyển vào TA");
      assert.ok(await p.ev(click("[data-action='tu-choi']")), "trang cũ còn nút Từ chối");
      await p.waitFor("!!document.querySelector('.sheet[role=\"dialog\"] [data-action=\"tu-choi-gui\"]')", "tấm Từ chối", 5000);
      assert.ok(await p.ev(click(".sheet[role='dialog'] .vc-reason")));
      assert.ok(await p.ev(click("[data-action='tu-choi-gui']")));
      await p.waitFor(`[...document.querySelectorAll('.banner .banner-title')].some((x) => x.innerText.includes('${CAU_DAI}'))`, "dải bi_chan sau khi đọc lại", 12000);
      assert.equal(await p.ev("location.pathname"), "/cuoc-chuyen", "không văng ra danh sách Cuốc");
      const t = await tieuDe(p);
      assert.ok(t.some((x) => x.startsWith("Chuyến này có khách được chuyển từ xe khác sang nên chưa từ chối được")), `dải cảnh báo của lệnh bị chặn: ${JSON.stringify(t)}`);
      assert.equal(await p.ev("document.querySelector('[data-action=\"tu-choi\"]')"), null, "hết nút Từ chối");
      assert.equal(apiCalls(p).filter((c) => c.method === "POST" && c.path.endsWith("/tu-choi")).length, 1, "đúng một lệnh Từ chối");
      assert.equal(await p.ev(noCode), "", "không mã thô");
      await shotView(p, "adr0113-2-trang-cu-bi-chan-390.png");
    });
  } finally {
    p.close();
  }

  p = await env.as(TX, `/cuoc-chuyen?id=${TA.id}`, MOB);
  try {
    await b.step("3", "390 mở lại: dải 'Chuyến có khách chuyển từ xe khác sang' + 'Gọi văn phòng' (tel:), không chữ 'quá hạn', không nút Từ chối" + axeNote(), async () => {
      await p.waitFor(`[...document.querySelectorAll('.banner .banner-title')].some((x) => x.innerText.includes('${CAU_DAI}'))`, "dải bi_chan", 12000);
      const t = await tieuDe(p);
      assert.ok(!t.some((x) => /quá hạn/i.test(x)), `không hiện nhầm 'Đã quá hạn': ${JSON.stringify(t)}`);
      assert.equal(await p.ev("document.querySelector('[data-action=\"tu-choi\"]')"), null);
      assert.equal(await p.ev("document.querySelector('[data-action=\"goi-van-phong\"]')?.getAttribute('href')"), `tel:${SDT_VP}`);
      assert.equal(await p.ev(txt("[data-action='goi-van-phong']")), "Gọi văn phòng");
      const dai = await p.ev(txt("main"));
      assert.ok(dai.includes("Không từ chối được — gọi văn phòng để đổi người."), dai);
      assert.equal(await p.ev(noCode), "", "không mã thô");
      assert.ok(await p.ev(noOverflowX), "không tràn ngang");
      assert.deepEqual(p.consoleErrors, [], `lỗi console: ${JSON.stringify(p.consoleErrors)}`);
      await axe(p, "TA bị chặn từ chối 390");
      await shotFull(p, "adr0113-3-bi-chan-390.png");
    });
  } finally {
    p.close();
  }

  p = await env.as(TX, `/cuoc-chuyen?id=${TA.id}`, DESK);
  try {
    await b.step("4", "1040 cùng nội dung (dải + 'Gọi văn phòng'), không nút Từ chối" + axeNote(), async () => {
      await p.waitFor(`[...document.querySelectorAll('.banner .banner-title')].some((x) => x.innerText.includes('${CAU_DAI}'))`, "dải bi_chan", 12000);
      await sleep(400);
      assert.equal(await p.ev("document.querySelector('[data-action=\"tu-choi\"]')"), null);
      assert.equal(await p.ev(txt("[data-action='goi-van-phong']")), "Gọi văn phòng");
      assert.equal(await p.ev(noCode), "", "không mã thô");
      assert.ok(await p.ev(noOverflowX), "không tràn ngang");
      await axe(p, "TA bị chặn từ chối 1040");
      await shotFull(p, "adr0113-4-bi-chan-1040.png");
    });
  } finally {
    p.close();
  }
} finally {
  await env.stop();
}
b.xong();
