// Gói A5 — chuyển khách giữa hai xe (ADR-0111; bản vẽ V8–V10): tài xế xe nhờ bấm "Nhờ xe khác đón" ở điểm đón → chọn xe → "Gửi đề nghị" (thẻ gửi đi có đếm
// ngược + "Rút lại"); công tắc tự đồng ý TẮT (đường API của Toàn quyền) → tài xế xe nhận bấm "Nhận" → "Chờ văn phòng duyệt"; Bán hàng: Chi tiết chuyến có khối
// "Đề nghị chuyển khách" CHỈ ĐỌC + nút "Gửi đề nghị cứu hộ", menu KHÔNG có "Đề nghị chuyển khách"; Kế toán: màn /de-nghi chỉ đọc (bảng điều kiện, không nút);
// Quản trị: menu có mục, Chi tiết chuyến có "Mở hộp duyệt" → /de-nghi#dn-<id> → "Duyệt" → chọn lý do phá lệ → "Duyệt chuyển khách" → khách sang xe nhận.
// Chạy từ GỐC repo, sau `npm run build:web` (không cần mạng ngoài):
//   AXE_JS=<…/axe.min.js> CHROME_BIN=docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh OUT=docs/evidence/2026-10-09-a5 node docs/evidence/2026-10-09-a5/kich-ban/de-nghi-smoke.mjs
// Kho cookie của Chrome dùng CHUNG: mỗi trang đóng trước khi mở trang tài khoản kế tiếp (Tài xế An → Tài xế Cường → Bán hàng → Kế toán → Quản trị).
import { randomUUID } from "node:crypto";
import {
  ACCOUNTS, CHU, DESK, MOB, apiCalls, assert, axe, axeNote, boDem, click, dungDuLieuDieuPhoi, dungMoiTruong, noCode, noOverflowX, shotFull, shotView, sleep, txt, vcSub, vnDate,
} from "../../2026-09-29-adr-0049/kich-ban/dp-lib.mjs";

const { env, call } = await dungMoiTruong([CHU]);
const b = boDem("DE NGHI SMOKE");
const d = await dungDuLieuDieuPhoi(env, call);
const dung = (r, ma, viec) => assert.equal(r.status, ma, `${viec}: ${r.status} ${r.text}`);
const chinhSach = (autoConfirmTransfer) => call(CHU, "POST", "/api/van-chuyen/chinh-sach-dieu-phoi", {
  minLeadMinutes: 360, warnLeadMinutes: 120, restMinutes: 30, requireManifest: true, proxyBackdateMaxMinutes: 180, dutyDayMaxMinutes: 480, tripNoBreakMaxMinutes: 240,
  departureWindowMinutes: 2880, acceptWaitMinutes: 10, autoConfirmTransfer,
});

// Nền (mọi lệnh API làm TRƯỚC khi mở trình duyệt): xe nhờ T4 (NGÀY MAI 10:00–11:30, An, 79A-111.11) + O4 (Citadines, 2 khách có tên) xếp bằng phá lệ, mốc về
// 6 giờ, xuất bến sớm (cửa sổ 48 giờ). Xe nhận XB: xe mới 15 chỗ đủ giấy tờ, Cường lái, một đơn một khách, cũng xuất bến.
dung(await call(ACCOUNTS.admin, "POST", `/api/van-chuyen/chuyen/${d.T4.id}/phan-bo`, { version: d.T4.version, requestId: randomUUID(), chang: [{ legId: d.O4.legId, soSuat: 2 }], phaLe: { lyDo: "PHA_LE_SU_CO" } }), 200, "xếp O4 vào T4");
dung(await chinhSach(true), 201, "mốc 6 giờ, tự đồng ý bật");
const xe = await call(ACCOUNTS.admin, "POST", "/api/van-chuyen/xe", { plateNumber: "79A-444.44", chassisNumber: "DP44444", name: "Xe thử 79A-444.44", passengerCapacity: 15 });
dung(xe, 201, "thêm xe nhận");
for (const typeCode of ["INSPECTION", "TPL_INSURANCE"]) dung(await call(ACCOUNTS.admin, "POST", `/api/van-chuyen/xe/${xe.json.vehicle.id}/giay-to`, { typeCode, number: `${typeCode}-44444`, expiryDate: vnDate(300) }), 201, `giấy ${typeCode}`);
const o6 = await call(ACCOUNTS.salesA, "POST", "/api/orders", {
  customerName: "Khách Điều Phối 6", customerPhone: "0903 100 306", customerEmail: "", customerNote: "", discount: 0, depositAmount: 0, depositMethod: null, paymentNote: "",
  services: [{
    kind: "catalog", catalogCode: "TD101", pax: { adult: 1, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: 1350000 },
    departTime: "", pickupTime: "", pickupPlace: "", checkinDate: "", checkinTime: "", checkinPlace: "", note: "", departDate: d.NGAY_KHOA,
    legs: [{ direction: "OUT", pickupDate: d.NGAY_KHOA, pickupTime: "10:20", pickupLocationId: null, pickupPlace: "Vinpearl Beachfront", dropoffLocationId: "a941dd7d-faab-4098-9ab9-1df7fa6dd551", dropoffPlace: "" }],
  }],
  passengers: [{ fullName: "Hành Khách Thử 6-1", birthYear: 1985, paxCode: null }],
});
dung(o6, 201, "lập đơn O6");
dung(await call(ACCOUNTS.admin, "POST", `/api/orders/${o6.json.order.id}/status`, { status: "confirmed" }), 200, "xác nhận O6");
const xb = await call(ACCOUNTS.admin, "POST", "/api/van-chuyen/chuyen", { requestId: randomUUID(), xeId: xe.json.vehicle.id, taiXePartyId: d.CUONG.partyId, batDau: { ngay: d.NGAY_KHOA, gio: "10:00" }, ketThuc: { ngay: d.NGAY_KHOA, gio: "11:30" } });
dung(xb, 201, "tạo xe nhận");
const XB = xb.json.chuyen;
dung(await call(ACCOUNTS.admin, "POST", `/api/van-chuyen/chuyen/${XB.id}/phan-bo`, { version: XB.version, requestId: randomUUID(), chang: [{ legId: o6.json.order.services[0].legs[0].id, soSuat: 1 }] }), 200, "xếp O6 vào xe nhận");
const T = d.T4;
for (const id of [T.id, XB.id]) dung(await call(ACCOUNTS.admin, "POST", `/api/van-chuyen/chuyen/${id}/xuat-ben`, { requestId: randomUUID() }), 200, `xuất bến ${id}`);
await sleep(1200);

const moChuyen = (p) => p.waitFor(`!!document.querySelector('.dp-run')`, "chuyến dựng xong", 12000);
const posts = (p, duoi) => apiCalls(p).filter((r) => r.method === "POST" && r.path.endsWith(duoi));
let rid = null;

try {
  // ---- Tài xế xe nhờ (điện thoại) -----------------------------------------------------------------------------------------------------------------------------
  const a = await env.as(d.AN.account, `/cuoc-chuyen?id=${T.id}`, MOB);
  await b.step("1", `V8 390 tài xế xe nhờ: điểm Citadines có "Nhờ xe khác đón" → bảng chọn xe (${XB.ma} · Phạm Văn Cường) → "Gửi đề nghị" → dải "Đã gửi đề nghị"; thẻ gửi đi có đếm ngược + "Rút lại"; không tràn ngang${axeNote()}`, async () => {
    await moChuyen(a);
    await a.waitFor(`!!document.querySelector('[data-action="nho-xe-don"]')`, "nút nhờ xe khác đón");
    await a.ev(click('[data-action="nho-xe-don"]'));
    await a.waitFor(`!!document.querySelector('.sheet [data-action="de-nghi-gui"]')`, "bảng nhờ xe");
    await sleep(500);
    assert.equal(await a.ev(txt(".sheet-title")), "Nhờ xe khác đón");
    const xeNhan = await a.ev(`[...document.querySelectorAll('.sheet .vc-reason')].map((x) => [x.dataset.code, x.innerText.replace(/\\s+/g, ' ').trim()])`);
    assert.equal(xeNhan.length, 1, JSON.stringify(xeNhan));
    assert.equal(xeNhan[0][0], XB.id);
    assert.match(xeNhan[0][1], new RegExp(`^${XB.ma} · Phạm Văn Cường`));
    assert.equal(await a.ev(`document.querySelector('.sheet').innerText.includes('Hành Khách Thử')`), false, "bảng không tên khách");
    await axe(a, "Bảng nhờ xe 390");
    await shotView(a, "a5-nho-xe-bang-dien-thoai.png");
    await a.ev(click(".sheet .vc-reason"));
    await a.ev(click('.sheet [data-action="de-nghi-gui"]'));
    await a.waitFor(`!document.querySelector('.sheet') && !!document.querySelector('[data-action="de-nghi-rut"]')`, "thẻ gửi đi", 12000);
    assert.equal(posts(a, "/de-nghi").length, 1);
    const than = JSON.parse(posts(a, "/de-nghi")[0].body);
    assert.deepEqual([than.denChuyenId, than.phamVi], [XB.id, "STOP"]);
    rid = (await call(ACCOUNTS.admin, "GET", `/api/van-chuyen/de-nghi?ngay=${d.NGAY_KHOA}`)).json.deNghi[0].id;
    assert.ok(rid);
    assert.match(await a.ev(`document.querySelector('[data-dem]').innerText`), /^\d{2}:\d{2}$/, "đếm ngược mm:ss");
    assert.ok(await a.ev(noOverflowX));
    assert.equal(await a.ev(noCode), "");
    await axe(a, "Thẻ gửi đi 390");
    await shotFull(a, "a5-gui-di-tai-xe-dien-thoai.png");
  });
  await a.close();

  dung(await chinhSach(false), 201, "tắt tự đồng ý (đề nghị đang chờ)");

  // ---- Tài xế xe nhận (điện thoại) ----------------------------------------------------------------------------------------------------------------------------
  const c = await env.as(d.CUONG.account, `/cuoc-chuyen?id=${XB.id}`, MOB);
  await b.step("2", `V9 390 tài xế xe nhận: thẻ đề nghị từ ${T.ma} (điểm, số khách, đếm ngược) có "Nhận" / "Không nhận"; bấm Nhận (tự đồng ý đang tắt) → "Chờ văn phòng duyệt"; khách chưa vào chuyến${axeNote()}`, async () => {
    await moChuyen(c);
    await c.waitFor(`!!document.querySelector('[data-action="de-nghi-nhan"]')`, "thẻ gửi tới", 12000);
    assert.ok((await c.ev(`document.querySelector('[data-action="de-nghi-nhan"]').closest('.banner').innerText`)).includes(T.ma));
    assert.ok(await c.ev(`!!document.querySelector('[data-action="de-nghi-khong-nhan"]')`));
    await axe(c, "Thẻ gửi tới 390");
    await shotView(c, "a5-gui-toi-tai-xe-dien-thoai.png");
    await c.ev(click('[data-action="de-nghi-nhan"]'));
    await c.waitFor(`[...document.querySelectorAll('.banner-title')].some((x) => x.innerText.trim() === 'Chờ văn phòng duyệt')`, "dải leo thang", 12000);
    assert.equal(posts(c, "/nhan").length, 1);
    assert.equal(await c.ev(`document.querySelector('[data-action="de-nghi-nhan"]')`), null, "hết nút Nhận");
    assert.ok(await c.ev(noOverflowX));
    await shotFull(c, "a5-leo-thang-tai-xe-dien-thoai.png");
  });
  await c.close();
  dung(await chinhSach(true), 201, "bật lại tự đồng ý");

  // ---- Bán hàng (máy tính): khối chỉ đọc, nút gửi cứu hộ, KHÔNG menu duyệt ----------------------------------------------------------------------------------------
  const s = await env.as(ACCOUNTS.salesA, `/chuyen?id=${T.id}`, DESK);
  await b.step("3", `CH 1040 Bán hàng: khối "Đề nghị chuyển khách" (${T.ma} → ${XB.ma}, Chờ văn phòng duyệt) KHÔNG có "Mở hộp duyệt"; "Việc của văn phòng" có "Gửi đề nghị cứu hộ"; menu Vận chuyển KHÔNG có "Đề nghị chuyển khách"${axeNote()}`, async () => {
    await moChuyen(s);
    await s.waitFor(`!!document.querySelector('.dp-de-nghi-chuyen')`, "khối đề nghị");
    assert.equal(await s.ev(txt("#ct-dn-title")), "Đề nghị chuyển khách");
    assert.match(await s.ev(txt(".dp-de-nghi-chuyen [data-de-nghi]")), new RegExp(`^${T.ma} → ${XB.ma} .*Chờ văn phòng duyệt`));
    assert.equal(await s.ev(`!!document.querySelector('[data-action="mo-duyet-de-nghi"]')`), false);
    assert.ok(await s.ev(`!!document.querySelector('[data-action="gui-de-nghi-cuu-ho"]')`));
    assert.equal((await s.ev(vcSub)).items.includes("Đề nghị chuyển khách"), false);
    assert.equal(await s.ev(noCode), "");
    await axe(s, "Chi tiết chuyến Bán hàng 1040");
    await shotFull(s, "a5-khoi-de-nghi-ban-hang-may-tinh.png");
  });
  await s.close();

  // ---- Kế toán (máy tính): màn /de-nghi chỉ đọc -----------------------------------------------------------------------------------------------------------------
  const k = await env.as(ACCOUNTS.accounting, `/de-nghi?ngay=${d.NGAY_KHOA}`, DESK);
  await b.step("4", `V10 1040 Kế toán: /de-nghi có thẻ leo thang (bảng 11 điều kiện, tầng Bắt buộc / Cấu hình) KHÔNG nút Duyệt / Bác; menu không có mục${axeNote()}`, async () => {
    await k.waitFor(`!!document.querySelector('.dn-leo-thang')`, "thẻ leo thang", 12000);
    assert.equal(await k.ev(`document.querySelectorAll('.dn-leo-thang .dn-kiem .dp-kc').length`), 11);
    assert.equal(await k.ev(`document.querySelectorAll('[data-action="duyet"], [data-action="bac"]').length`), 0);
    assert.equal((await k.ev(vcSub)).items.includes("Đề nghị chuyển khách"), false);
    assert.equal(await k.ev(noCode), "");
    await axe(k, "Đề nghị Kế toán 1040");
    await shotFull(k, "a5-de-nghi-ke-toan-may-tinh.png");
  });
  await k.close();

  // ---- Quản trị (máy tính → điện thoại): mở hộp duyệt từ Chi tiết chuyến, Duyệt ----------------------------------------------------------------------------------
  const q = await env.as(ACCOUNTS.admin, `/chuyen?id=${T.id}`, DESK);
  await b.step("5", `V10 1040 Quản trị: menu có "Đề nghị chuyển khách" ngay sau "Xe đang chạy"; Chi tiết chuyến → "Mở hộp duyệt" → /de-nghi#dn-<id>; Duyệt → lý do phá lệ → "Duyệt chuyển khách" → "Đã duyệt — khách đã sang xe nhận"${axeNote()}`, async () => {
    await moChuyen(q);
    const menu = (await q.ev(vcSub)).items;
    assert.equal(menu[menu.indexOf("Xe đang chạy") + 1], "Đề nghị chuyển khách", JSON.stringify(menu));
    await q.waitFor(`!!document.querySelector('[data-action="mo-duyet-de-nghi"]')`, "link mở hộp duyệt");
    assert.equal(await q.ev(`document.querySelector('[data-action="mo-duyet-de-nghi"]').getAttribute('href')`), `/de-nghi?ngay=${d.NGAY_KHOA}#dn-${rid}`);
    await q.ev(click('[data-action="mo-duyet-de-nghi"]'));
    await q.waitFor(`location.pathname === '/de-nghi' && !!document.querySelector('[data-action="duyet"]')`, "màn duyệt", 12000);
    assert.equal(await q.ev(`document.querySelector('.dn-leo-thang').id`), `dn-${rid}`);
    await axe(q, "Đề nghị Quản trị 1040");
    await shotFull(q, "a5-de-nghi-quan-tri-may-tinh.png");
    await q.ev(click('[data-action="duyet"]'));
    await q.waitFor(`!!document.querySelector('.sheet [data-action="duyet-gui"]')`, "hộp duyệt");
    await sleep(500);
    assert.equal(await q.ev(txt(".sheet-title")), "Duyệt đề nghị");
    assert.ok((await q.ev(`[...document.querySelectorAll('.sheet .vc-reason')].length`)) >= 1, "có lý do nhóm phá lệ");
    await axe(q, "Hộp duyệt 1040");
    await shotView(q, "a5-hop-duyet-may-tinh.png");
    await q.ev(click(".sheet .vc-reason"));
    await q.ev(click('.sheet [data-action="duyet-gui"]'));
    await q.waitFor(`[...document.querySelectorAll('.banner-title')].some((x) => x.innerText.trim() === 'Đã duyệt — khách đã sang xe nhận')`, "đã duyệt", 12000);
    assert.equal(JSON.parse(posts(q, "/duyet")[0].body).lyDo !== undefined, true);
    assert.equal(await q.ev(`document.querySelectorAll('.dn-leo-thang').length`), 0, "hết thẻ chờ duyệt");
    // Đăng nhập trình duyệt của Quản trị thay phiên API của chính tài khoản đó (ADR-0075) → đọc lại bằng tài khoản Toàn quyền.
    const g = await call(CHU, "GET", `/api/van-chuyen/de-nghi?ngay=${d.NGAY_KHOA}`);
    assert.equal(g.json.deNghi.find((x) => x.id === rid).trangThai, "CONFIRMED");
    await shotFull(q, "a5-da-duyet-may-tinh.png");
  });
  await b.step("6", `390 Quản trị: màn /de-nghi không tràn ngang sau khi duyệt${axeNote()}`, async () => {
    await q.send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
    await q.send("Page.reload", {});
    await q.waitFor(`!!document.querySelector('#dn-trang .dp-ct-title')`, "màn sau tải lại", 12000);
    assert.ok(await q.ev(noOverflowX));
    await axe(q, "Đề nghị 390");
    await shotFull(q, "a5-de-nghi-dien-thoai.png");
  });
  await q.close();

  await b.step("7", "không lỗi console ở mọi trang đã mở", async () => {
    for (const pg of [a, c, s, k, q]) assert.deepEqual(pg.consoleErrors, []);
  });
} finally {
  b.xong();
  await env.stop();
}
