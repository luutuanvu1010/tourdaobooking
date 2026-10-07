// Kịch bản kiểm UX (người kiểm độc lập, chỉ đọc repo): tình huống của chủ dự án — 10 đơn, 10 nơi đón khác nhau (khách sạn / nhà riêng) cùng một buổi → 2 chuyến
// ghép. Dựng trên dp-lib.mjs (D1 tạm + wrangler dev riêng + Chrome headless). Mọi tên, SĐT, biển số là GIẢ.
// Chạy từ GỐC repo (startEnv lấy cwd làm gốc):
//   CHROME_BIN=docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh OUT=<scratchpad>/ui/anh/ghep-10-don node <scratchpad>/ui/ghep-10-don.mjs
// Giới hạn có chủ đích: giờ đón đặt ở BUỔI CHIỀU hôm nay (≥ bây giờ + 6 giờ 30 phút) chứ không phải buổi sáng — vì (a) mốc tối thiểu gieo sẵn 6 giờ, (b) tài xế chỉ
// thấy tên / SĐT khách TRONG ngày chạy (ADR-0053 D7.2), nên muốn chụp màn tài xế có SĐT thì chuyến phải là hôm nay; sáng nay đã qua.
import { randomUUID } from "node:crypto";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  ACCOUNTS, CHU, DESK, MOB, OUT, apiCalls, assert, boDem, click, dungMoiTruong, fetchTrang, shotFull, shotView, sleep, txt, typeInto, vnDate, LOC_BEN_TAU,
} from "../../../../../docs/evidence/2026-09-29-adr-0049/kich-ban/dp-lib.mjs";

const DO = {}; // số đo + mã HTTP ghi ra tệp JSON cạnh nhật ký
const ghi = (k, v) => { DO[k] = v; console.log(`   [${k}] ${typeof v === "string" ? v : JSON.stringify(v)}`); };

const { env, call } = await dungMoiTruong([CHU]);
const b = boDem("GHEP 10 DON");
const HOM_NAY = vnDate(0);
const han = vnDate(300);
const dung = (r, ma, viec) => assert.equal(r.status, ma, `${viec}: ${r.status} ${r.text}`);
const hhmm = (m) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
const bayGioVn = () => { const d = new Date(Date.now() + 7 * 3600e3); return d.getUTCHours() * 60 + d.getUTCMinutes(); };
// Giờ đón đầu: bây giờ + 6 giờ 30 phút, làm tròn lên 5 phút (mốc gieo sẵn 6 giờ ⇒ xác nhận không cần đặt gấp).
const DAU = Math.ceil((bayGioVn() + 390) / 5) * 5;
assert.ok(DAU + 45 + 60 < 24 * 60, `chạy quá muộn trong ngày: giờ đón đầu ${hhmm(DAU)}`);
ghi("gioDonDau", hhmm(DAU));

let T1, T2, AN, CUONG, PARTNER, O = [];
const tep = (name) => join(OUT, "anh", name);

try {
  // ================= DỰNG DỮ LIỆU QUA ROUTE THẬT (call) =================
  const xe = async (plateNumber, cho) => {
    const r = await call(ACCOUNTS.admin, "POST", "/api/van-chuyen/xe", { plateNumber, chassisNumber: `GH${plateNumber.replace(/\D/g, "")}`, name: `Xe ghép ${plateNumber}`, passengerCapacity: cho });
    dung(r, 201, `thêm xe ${plateNumber}`);
    for (const typeCode of ["INSPECTION", "TPL_INSURANCE"]) dung(await call(ACCOUNTS.admin, "POST", `/api/van-chuyen/xe/${r.json.vehicle.id}/giay-to`, { typeCode, number: `${typeCode}-${plateNumber}`, expiryDate: han }), 201, `giấy ${typeCode}`);
    return r.json.vehicle;
  };
  const XE_A = await xe("79B-161.61", 15); // "xe 16 chỗ nhập 15" (gợi ý của biểu mẫu): C = 15
  const XE_B = await xe("79B-162.62", 15);
  let soDt = 0;
  const taiXe = async (fullName) => {
    const r = await call(ACCOUNTS.chu, "POST", "/api/staff", { taoHoSoMoi: true, fullName, phone: `09000004${String(70 + ++soDt).padStart(2, "0")}`, roles: ["DRIVER_INTERNAL"] });
    dung(r, 201, `tài xế ${fullName}`);
    const [{ party_id: partyId }] = env.sql(`SELECT party_id FROM staff WHERE id = '${r.json.staff.id}'`);
    dung(await call(ACCOUNTS.admin, "POST", `/api/parties/${partyId}/documents`, { typeCode: "GPLX", number: `79${String(2e9 + soDt)}`, classCode: "D2", expiryDate: han }), 201, `GPLX ${fullName}`);
    return { partyId, account: { name: fullName, phone: r.json.staff.phone, pin: r.json.pin, permissions: ["DRIVER"] } };
  };
  AN = await taiXe("Trần Văn Tài");
  CUONG = await taiXe("Võ Văn Lái");
  // Tài xế đối tác (ADR-0048): tạo theo vai DRIVER_EXTERNAL bằng Toàn quyền (ADR-0071)
  const rp = await call(ACCOUNTS.chu, "POST", "/api/staff", { taoHoSoMoi: true, fullName: "Đối Tác Lái Thuê", phone: "0900000489", roles: ["DRIVER_EXTERNAL"] });
  ghi("taoTaiXeDoiTac", { status: rp.status, permissions: rp.json?.staff?.permissions ?? null });
  if (rp.status === 201) {
    const [{ party_id }] = env.sql(`SELECT party_id FROM staff WHERE id = '${rp.json.staff.id}'`);
    PARTNER = { partyId: party_id, account: { name: "Đối Tác Lái Thuê", phone: rp.json.staff.phone, pin: rp.json.pin, permissions: ["DRIVER_PARTNER"] } };
  }
  // Hai khách sạn trong danh mục địa điểm (loại HOTEL có từ migration 0034) — có ô ĐỊA CHỈ; xem địa chỉ có tới màn tài xế không.
  const ks = async (code, name, address) => {
    const r = await call(ACCOUNTS.chu, "POST", "/api/locations", { code, name, locationTypeCode: "HOTEL", address });
    ghi(`taoDiaDiem_${code}`, { status: r.status, text: r.status === 201 ? "ok" : r.text });
    return r.status === 201 ? r.json.location.id : null;
  };
  const KS1 = await ks("KS_SHERATON_NT", "Sheraton Nha Trang", "26–28 Trần Phú, Lộc Thọ, Nha Trang");
  const KS2 = await ks("KS_INTERCON_NT", "InterContinental Nha Trang", "32–34 Trần Phú, Lộc Thọ, Nha Trang");
  // 10 đơn: [nơi đón, id danh mục, số khách]
  const NOI = [
    ["Sheraton Nha Trang", KS1, 2],
    ["InterContinental Nha Trang", KS2, 3],
    ["Mường Thanh Luxury, 60 Trần Phú", null, 4],
    ["Novotel, 50 Trần Phú", null, 2],
    ["Nhà riêng 12 Trần Phú, Lộc Thọ", null, 1],
    ["Ana Mandara, 86 Trần Phú", null, 3],
    ["Liberty Central, 9 Biệt Thự", null, 2],
    ["Nhà riêng hẻm 15/7 Nguyễn Thiện Thuật, gọi 0905 123 456 khi tới", null, 4],
    ["Citadines Bayfront, 62 Trần Phú", null, 3],
    ["Premier Havana, 38 Trần Phú", null, 2],
  ];
  for (let i = 0; i < NOI.length; i++) {
    const [noi, locId, so] = NOI[i];
    const gio = hhmm(DAU + i * 5);
    const r = await call(ACCOUNTS.salesA, "POST", "/api/orders", {
      customerName: `Khách Ghép ${i + 1}`, customerPhone: `0903 200 ${String(300 + i)}`, customerEmail: "", customerNote: "", discount: 0, depositAmount: 0, depositMethod: null, paymentNote: "",
      services: [{
        kind: "catalog", catalogCode: "TD101", pax: { adult: so, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: 1350000 },
        departTime: "", pickupTime: "", pickupPlace: "", checkinDate: "", checkinTime: "", checkinPlace: "", note: "", departDate: HOM_NAY,
        legs: [{ direction: "OUT", pickupDate: HOM_NAY, pickupTime: gio, pickupLocationId: locId, pickupPlace: locId ? "" : noi, dropoffLocationId: LOC_BEN_TAU, dropoffPlace: "" }],
      }],
      passengers: Array.from({ length: so }, (_, j) => ({ fullName: `Khách Ghép ${i + 1}-${j + 1}`, birthYear: 1985 + j, paxCode: null })),
    });
    dung(r, 201, `lập đơn ${i + 1}`);
    const c = await call(ACCOUNTS.admin, "POST", `/api/orders/${r.json.order.id}/status`, { status: "confirmed" });
    dung(c, 200, `xác nhận đơn ${i + 1}`);
    O.push({ id: c.json.order.id, ma: c.json.order.orderCode, legId: c.json.order.services[0].legs[0].id, so, noi, gio, sdt: `0903 200 ${String(300 + i)}` });
  }
  ghi("donDaLap", O.map((o) => `${o.ma} ${o.gio} ${o.so}k`));
  const taoChuyen = async (xeId, tx) => {
    const r = await call(ACCOUNTS.admin, "POST", "/api/van-chuyen/chuyen", { requestId: randomUUID(), xeId, taiXePartyId: tx.partyId, batDau: { ngay: HOM_NAY, gio: hhmm(DAU - 20) }, ketThuc: { ngay: HOM_NAY, gio: hhmm(DAU + 105) } });
    dung(r, 201, "tạo chuyến");
    return r.json.chuyen;
  };
  T1 = await taoChuyen(XE_A.id, AN);
  T2 = await taoChuyen(XE_B.id, CUONG);
  ghi("chuyen", { T1: T1.ma, T2: T2.ma, khung: `${hhmm(DAU - 20)}–${hhmm(DAU + 105)}` });
  if (PARTNER) {
    const xeP = await xe("79B-163.63", 15);
    const r = await call(ACCOUNTS.admin, "POST", "/api/van-chuyen/chuyen", { requestId: randomUUID(), xeId: xeP.id, taiXePartyId: PARTNER.partyId, batDau: { ngay: HOM_NAY, gio: hhmm(DAU - 20) }, ketThuc: { ngay: HOM_NAY, gio: hhmm(DAU + 105) } });
    ghi("taoChuyenTaiXeDoiTac", { status: r.status, code: r.json?.error?.code ?? null, message: r.json?.error?.message ?? null });
  }

  // ================= BẢNG ĐIỀU PHỐI 1040 — 10 nhu cầu chưa xếp =================
  let s = await env.as(ACCOUNTS.salesA, `/dieu-phoi?ngay=${HOM_NAY}`, DESK);
  await b.step("1", "Bảng điều phối 1040: cột Chưa xếp có 10 chặng; khối chuyến hiện tải 0/15; công cụ lọc chỉ có ô ngày", async () => {
    await s.waitFor(`document.querySelectorAll('#dp-cot-chua-xep .dp-leg').length === 10`, "10 chặng chưa xếp", 12000);
    const the = await s.ev(`[...document.querySelectorAll('#dp-cot-chua-xep .dp-leg')].map((x) => x.innerText.replace(/\\s+/g, ' ').trim())`);
    ghi("bang1040_theChang", the);
    ghi("bang1040_khoiTai", await s.ev(`[...document.querySelectorAll('.dp-khoi')].map((x) => x.getAttribute('aria-label'))`));
    ghi("bang1040_oDieuKhien", await s.ev(`[...document.querySelectorAll('main input, main select')].filter((x) => x.getClientRects().length).map((x) => (x.id || x.name || x.type) + ':' + x.type)`));
    ghi("bang1040_coCheckbox", await s.ev(`document.querySelectorAll('main input[type=checkbox]').length`));
    ghi("bang1040_soLieu", await s.ev(txt("#dp-so")));
    ghi("bang1040_cotChuaXepCao", await s.ev(`(() => { const c = document.getElementById('dp-cot-chua-xep'); return { scrollHeight: c.scrollHeight, clientHeight: c.clientHeight, docH: document.documentElement.scrollHeight, viewH: innerHeight }; })()`));
    await shotView(s, "g10-dieu-phoi-chua-xep-khung-may-tinh.png");
    await shotFull(s, "g10-dieu-phoi-chua-xep-may-tinh.png");
  });
  await b.step("2", "Hộp 'Xếp vào chuyến' (1040) cho đơn 1: danh sách chuyến có 'tải x/15'; xếp bằng giao diện O1 → T1", async () => {
    await s.ev(click(`.dp-leg[data-leg="${O[0].legId}"]`));
    await s.waitFor(`!!document.querySelector('.sheet .vc-reason[data-code="${T1.id}"]')`, "hộp xếp");
    ghi("hopXep_dsChuyen", await s.ev(`[...document.querySelectorAll('.sheet .vc-reason')].map((x) => x.innerText.replace(/\\s+/g, ' ').trim())`));
    await s.ev(click(`.sheet .vc-reason[data-code="${T1.id}"]`));
    await shotView(s, "g10-hop-xep-may-tinh.png");
    await s.ev(click('[data-action="xep-gui"]'));
    await s.waitFor(`/Đã xếp/.test(document.querySelector('#dp-banner')?.innerText ?? '')`, "dải đã xếp");
    ghi("hopXep_ketQua", await s.ev(txt("#dp-banner")));
  });
  await s.close();

  // ================= BẢNG ĐIỀU PHỐI 390 =================
  s = await env.as(ACCOUNTS.salesA, `/dieu-phoi?ngay=${HOM_NAY}`, MOB);
  await b.step("3", "Bảng điều phối 390: thẻ Chưa xếp (9 chặng), thẻ Xe; đo chiều dài cuộn", async () => {
    await s.waitFor(`document.querySelectorAll('#dp-cot-chua-xep .dp-leg').length === 9`, "9 chặng chưa xếp", 12000);
    ghi("bang390_tabs", await s.ev(`[...document.querySelectorAll('.dp-tab')].map((x) => x.innerText.replace(/\\s+/g, ' ').trim())`));
    ghi("bang390_cao", await s.ev(`({ docH: document.documentElement.scrollHeight, viewH: innerHeight, tranNgang: document.documentElement.scrollWidth > innerWidth + 1 })`));
    ghi("bang390_keoTha_note", await s.ev(`(() => { const n = document.querySelector('.dp-chi-may-tinh'); return n ? getComputedStyle(n).display : 'không có'; })()`));
    await shotView(s, "g10-dieu-phoi-chua-xep-dien-thoai.png");
    await shotFull(s, "g10-dieu-phoi-chua-xep-ca-trang-dien-thoai.png");
    await s.ev(click('#dp-tab-xe'));
    await sleep(500);
    await shotView(s, "g10-dieu-phoi-xe-dien-thoai.png");
  });
  await s.close();

  // ================= XẾP QUA API: lô nhiều chặng, rồi thử C+1 / C+2 =================
  await b.step("4", "API: một lệnh phân bổ nhiều chặng (O2–O5) vào T1; O6 → đầy 15/15; thử C+1, C+2 (đơn 7)", async () => {
    const ver = async (t) => (await call(ACCOUNTS.admin, "GET", `/api/van-chuyen/chuyen/${t.id}`)).json.chuyen.version;
    const lo = await call(ACCOUNTS.admin, "POST", `/api/van-chuyen/chuyen/${T1.id}/phan-bo`, { version: await ver(T1), requestId: randomUUID(), chang: O.slice(1, 5).map((o) => ({ legId: o.legId, soSuat: o.so })) });
    ghi("phanBoLo_O2_O5", { status: lo.status, code: lo.json?.error?.code ?? null, tai: lo.json?.chuyen?.tai ?? null });
    const o6 = await call(ACCOUNTS.admin, "POST", `/api/van-chuyen/chuyen/${T1.id}/phan-bo`, { version: await ver(T1), requestId: randomUUID(), chang: [{ legId: O[5].legId, soSuat: O[5].so }] });
    ghi("phanBo_O6", { status: o6.status, code: o6.json?.error?.code ?? null });
    const [{ n }] = env.sql(`SELECT count(*) AS n FROM vc_trip_allocation WHERE trip_id = '${T1.id}' AND valid_to_at IS NULL AND status IN ('WAITING','BOARDED')`);
    ghi("T1_soSuatSQL_sauO6", n);
    for (const them of [1, 2]) {
      const r = await call(ACCOUNTS.admin, "POST", `/api/van-chuyen/chuyen/${T1.id}/phan-bo`, { version: await ver(T1), requestId: randomUUID(), chang: [{ legId: O[6].legId, soSuat: them }] });
      ghi(`thu_C_cong_${them}`, { status: r.status, code: r.json?.error?.code ?? null, message: r.json?.error?.message ?? null, details: r.json?.error?.details ?? null });
    }
    const [{ n: n2 }] = env.sql(`SELECT count(*) AS n FROM vc_trip_allocation WHERE trip_id = '${T1.id}' AND valid_to_at IS NULL AND status IN ('WAITING','BOARDED')`);
    ghi("T1_soSuatSQL_sauThuC2", n2);
    assert.equal(lo.status, 200);
    assert.equal(o6.status, 200);
  });

  // ================= Bảng sau khi xếp: hộp xếp vào chuyến đầy (giao diện) =================
  s = await env.as(ACCOUNTS.salesA, `/dieu-phoi?ngay=${HOM_NAY}`, DESK);
  await b.step("5", "1040: T1 đầy 15/15 — hộp xếp vẫn liệt kê T1? bấm xếp đơn 7 (2 khách) vào T1 → câu lỗi hiện gì", async () => {
    await s.waitFor(`document.querySelectorAll('#dp-cot-chua-xep .dp-leg').length === 4`, "4 chặng chưa xếp", 12000);
    await s.ev(click(`.dp-khoi[data-chuyen="${T1.id}"]`));
    await sleep(300);
    ghi("theChon_T1", await s.ev(txt(".dp-chon")));
    await shotView(s, "g10-dieu-phoi-t1-day-may-tinh.png");
    await s.ev(click(`.dp-leg[data-leg="${O[6].legId}"]`));
    await s.waitFor(`!!document.querySelector('.sheet .vc-reason[data-code="${T1.id}"]')`, "hộp xếp có T1");
    ghi("hopXep_dsChuyen_khiDay", await s.ev(`[...document.querySelectorAll('.sheet .vc-reason')].map((x) => x.innerText.replace(/\\s+/g, ' ').trim())`));
    await s.ev(click(`.sheet .vc-reason[data-code="${T1.id}"]`));
    await s.ev(click('[data-action="xep-gui"]'));
    await s.waitFor(`(() => { const e = document.querySelector('.sheet .vc-field-error'); return e && !e.hidden; })() || /Chưa|Không/.test(document.querySelector('#dp-banner')?.innerText ?? '')`, "câu lỗi vượt chỗ", 8000);
    ghi("hopXep_loiVuotCho", await s.ev(`(() => { const e = document.querySelector('.sheet .vc-field-error'); return (e && !e.hidden ? e.innerText : '') + ' | ' + (document.querySelector('#dp-banner')?.innerText ?? ''); })()`));
    await shotView(s, "g10-hop-xep-vuot-cho-may-tinh.png");
    await s.ev(`document.querySelector('.sheet .vc-btn-ghost-primary')?.click(); true`);
  });
  await b.step("6", "API: T2 nhận O7–O10 (11 khách) một lệnh", async () => {
    const v = (await call(ACCOUNTS.admin, "GET", `/api/van-chuyen/chuyen/${T2.id}`)).json.chuyen.version;
    const r = await call(ACCOUNTS.admin, "POST", `/api/van-chuyen/chuyen/${T2.id}/phan-bo`, { version: v, requestId: randomUUID(), chang: O.slice(6).map((o) => ({ legId: o.legId, soSuat: o.so })) });
    ghi("phanBoLo_O7_O10", { status: r.status, code: r.json?.error?.code ?? null });
    const t2 = await call(ACCOUNTS.admin, "GET", `/api/van-chuyen/chuyen/${T2.id}`);
    ghi("T2_tenNoi", [...t2.json.diem].sort((x, y) => x.thuTu - y.thuTu).map((d) => d.tenNoi));
    assert.equal(r.status, 200, r.text);
  });
  await b.step("7", "1040: bảng sau xếp + Chi tiết chuyến T1 (6 điểm đón + 1 điểm trả)", async () => {
    await s.send("Page.navigate", { url: `${env.base}/dieu-phoi?ngay=${HOM_NAY}` });
    await s.waitFor(`document.querySelectorAll('#dp-cot-chua-xep .dp-leg').length === 0 && document.querySelectorAll('.dp-khoi').length >= 2`, "bảng sau xếp", 12000);
    await s.ev(click(`.dp-khoi[data-chuyen="${T1.id}"]`));
    await sleep(300);
    await shotView(s, "g10-dieu-phoi-sau-xep-may-tinh.png");
    await s.send("Page.navigate", { url: `${env.base}/chuyen?id=${T1.id}` });
    await s.waitFor(`document.querySelectorAll('.dp-run, .dp-diem, [data-diem]').length >= 7`, "chi tiết chuyến", 12000);
    ghi("chiTiet_diem", await s.ev(`[...document.querySelectorAll('[data-diem]')].map((x) => x.innerText.replace(/\\s+/g, ' ').trim().slice(0, 140))`));
    ghi("chiTiet_coDiaChiKS", await s.ev(`document.querySelector('main').innerText.includes('26–28 Trần Phú')`));
    await shotFull(s, "g10-chi-tiet-chuyen-may-tinh.png");
  });
  await s.close();

  // ================= MÀN TÀI XẾ 390 =================
  let p = await env.as(AN.account, "/", MOB);
  await b.step("8", "Tài xế 390: Cuốc của tôi (hôm nay có T1)", async () => {
    await p.waitFor(`location.pathname === '/cuoc' && document.querySelectorAll('.dp-cuoc-the').length >= 1`, "Cuốc của tôi", 12000);
    ghi("cuoc_the", await p.ev(`[...document.querySelectorAll('.dp-cuoc-the')].map((x) => x.innerText.replace(/\\s+/g, ' ').trim())`));
    await shotFull(p, "g10-cuoc-cua-toi-dien-thoai.png");
  });
  await b.step("9", "Tài xế 390: trước xuất bến — danh sách điểm, nút Xuất bến dính đáy", async () => {
    await p.send("Page.navigate", { url: `${env.base}/cuoc-chuyen?id=${T1.id}` });
    await p.waitFor(`!!document.querySelector('[data-action="xuat-ben"]')`, "màn xuất bến", 12000);
    ghi("truoc_diem", await p.ev(`[...document.querySelectorAll('.dp-cc-diem .dp-run')].map((x) => x.innerText.replace(/\\s+/g, ' ').trim())`));
    ghi("truoc_nutXuatBen", await p.ev(`(() => { const b = document.querySelector('[data-action="xuat-ben"]'); const r = b.getBoundingClientRect(); const bar = document.getElementById('cc-day'); return { h: Math.round(r.height), top: Math.round(r.top), bottom: Math.round(r.bottom), viewH: innerHeight, barPosition: getComputedStyle(bar).position, disabled: b.disabled }; })()`));
    ghi("truoc_docH", await p.ev(`document.documentElement.scrollHeight`));
    await shotView(p, "g10-xuat-ben-khung-dien-thoai.png");
    await shotFull(p, "g10-xuat-ben-ca-trang-dien-thoai.png");
  });
  await b.step("10", "Tài xế 390: bấm Xuất bến → hộp xác nhận → đang chạy", async () => {
    await p.ev(click('[data-action="xuat-ben"]'));
    await p.waitFor(`!!document.querySelector('[data-action="xuat-ben-xac-nhan"]')`, "hộp xác nhận xuất bến");
    ghi("hopXuatBen", await p.ev(txt(".sheet")));
    await shotView(p, "g10-hop-xuat-ben-dien-thoai.png");
    await p.ev(click('[data-action="xuat-ben-xac-nhan"]'));
    await p.waitFor(`!!document.querySelector('.dp-cc-head') || !!document.querySelector('#cc-trang .banner-danger')`, "đang chạy hoặc lỗi", 12000);
    ghi("sauXuatBen", await p.ev(`(document.querySelector('.dp-cc-head')?.innerText ?? '') + ' | ' + (document.querySelector('#cc-trang .banner')?.innerText ?? '')`));
    assert.ok(await p.ev(`!!document.querySelector('.dp-cc-head')`), "đã sang màn đang chạy");
  });
  await b.step("11", "Tài xế 390 đang chạy: đo cỡ chữ, cỡ nút, vị trí nút chính, tel:, bản đồ, chiều dài trang", async () => {
    await sleep(500);
    ghi("chay_diem", await p.ev(`[...document.querySelectorAll('.dp-run')].map((x) => x.querySelector('.dp-run-loai')?.innerText + ' | ' + x.querySelector('.dp-run-noi')?.innerText + ' | ' + [...x.querySelectorAll('.dp-run-lien-he')].map((l) => l.innerText.replace(/\\s+/g, ' ')).join(' / '))`));
    ghi("chay_do", await p.ev(`(() => {
      const fs = (sel) => { const e = document.querySelector(sel); return e ? getComputedStyle(e).fontSize : null; };
      const hh = (sel) => { const e = [...document.querySelectorAll(sel)].find((x) => x.getClientRects().length); if (!e) return null; const r = e.getBoundingClientRect(); return { h: Math.round(r.height), w: Math.round(r.width) }; };
      const end = document.querySelector('.dp-run-end');
      const kt = document.querySelector('[data-action="ket-thuc"]');
      const r = kt ? kt.getBoundingClientRect() : null;
      return {
        fsNoi: fs('.dp-run-noi'), fsLoai: fs('.dp-run-loai'), fsKhachTen: fs('.dp-khach-ten'), fsLienHe: fs('.dp-run-lien-he'), fsNote: fs('.dp-note'), fsBody: getComputedStyle(document.body).fontSize,
        nutDaToi: hh('[data-action="da-toi"]'), nutKetThuc: hh('[data-action="ket-thuc"]'), nutGianDoan: hh('[data-action="ket-thuc-gian-doan"]'), linkTel: hh('.dp-run-lien-he a'), nutThuTu: hh('.dp-thu-tu'),
        endPosition: end ? getComputedStyle(end).position : null, ketThucTopTrongTrang: r ? Math.round(r.top + scrollY) : null, viewH: innerHeight, docH: document.documentElement.scrollHeight,
        soTel: document.querySelectorAll('a[href^="tel:"]').length, soBanDo: document.querySelectorAll('a[href*="maps"], a[href^="geo:"], a[href*="map"]').length,
        soDiem: document.querySelectorAll('.dp-run').length,
        mauNoi: getComputedStyle(document.querySelector('.dp-run-noi')).color, nenThe: getComputedStyle(document.querySelector('.dp-run')).backgroundColor,
        mauNote: document.querySelector('.dp-note') ? getComputedStyle(document.querySelector('.dp-note')).color : null,
      }; })()`));
    ghi("chay_coDiaChiKS", await p.ev(`document.querySelector('main').innerText.includes('26–28 Trần Phú')`));
    await shotView(p, "g10-dang-chay-khung-dau-dien-thoai.png");
    await shotFull(p, "g10-dang-chay-ca-trang-dien-thoai.png");
  });
  const diemCua = async (i) => p.ev(`(() => { const ds = [...document.querySelectorAll('.dp-run')]; return ds[${i}]?.getAttribute('data-diem') ?? null; })()`);
  const coHop = () => p.ev(`!!document.querySelector('.sheet[role="dialog"]')`);
  await b.step("12", "Điểm 1: Đã tới → Đã đón 2 khách (một chạm, không hộp xác nhận?)", async () => {
    const d1 = await diemCua(0);
    await p.ev(click(`.dp-run[data-diem="${d1}"] [data-action="da-toi"]`));
    await sleep(250);
    ghi("daToi_coHopXacNhan", await coHop());
    await p.waitFor(`document.querySelectorAll('.dp-run[data-diem="${d1}"] .dp-khach-btn[data-action="don"]').length >= 1`, "nút khách điểm 1");
    await p.ev(click(`.dp-run[data-diem="${d1}"] .dp-khach-btn[data-action="don"]`));
    await sleep(250);
    ghi("daDon_coHopXacNhan", await coHop());
    await p.waitFor(`document.querySelectorAll('.dp-run[data-diem="${d1}"] .dp-khach-kq.is-ok').length === 1`, "một khách đã đón");
    ghi("vuaGhi", await p.ev(txt(".dp-vua-ghi")));
    await p.ev(click(`.dp-run[data-diem="${d1}"] .dp-khach-btn[data-action="don"]`));
    await p.waitFor(`document.querySelectorAll('.dp-run[data-diem="${d1}"] .dp-khach-kq.is-ok').length === 2`, "hai khách đã đón");
  });
  await b.step("13", "Điểm 2: Đã tới → suất A Vắng, suất B Khách đã huỷ, suất C Đã đón (nhắm theo id suất); ghi nút còn lại sau mỗi kết quả; chụp", async () => {
    const d2 = await diemCua(1);
    await p.ev(click(`.dp-run[data-diem="${d2}"] [data-action="da-toi"]`));
    await p.waitFor(`document.querySelectorAll('.dp-run[data-diem="${d2}"] .dp-khach-btn[data-action="vang"]').length >= 3`, "nút khách điểm 2");
    const ids = await p.ev(`[...new Set([...document.querySelectorAll('.dp-run[data-diem="${d2}"] .dp-khach-btn')].map((x) => x.dataset.suat))]`);
    const [A, B, C] = ids;
    const nutCua = (id) => p.ev(`[...document.querySelectorAll('.dp-run[data-diem="${d2}"] .dp-khach-btn[data-suat="${id}"]')].map((x) => x.innerText.trim())`);
    const kqCua = (id) => p.ev(`document.querySelector('.dp-run[data-diem="${d2}"] .dp-khach[data-suat="${id}"] .dp-khach-kq')?.innerText ?? null`);
    await p.ev(click(`.dp-khach-btn[data-suat="${A}"][data-action="vang"]`));
    await sleep(250);
    ghi("vang_coHopXacNhan", await coHop());
    await p.waitFor(`!!document.querySelector('.dp-khach[data-suat="${A}"] .dp-khach-kq.is-vang')`, "suất A vắng");
    ghi("vang_vuaGhi", await p.ev(txt(".dp-vua-ghi")));
    ghi("vang_nutConLai", await nutCua(A));
    await p.ev(click(`.dp-khach-btn[data-suat="${B}"][data-action="khach-huy"]`));
    await sleep(250);
    ghi("huy_coHopXacNhan", await coHop());
    await p.waitFor(`!!document.querySelector('.dp-khach[data-suat="${B}"] .dp-khach-kq')`, "suất B có kết quả");
    ghi("huy_vuaGhi", await p.ev(txt(".dp-vua-ghi")));
    ghi("huy_kq", await kqCua(B));
    ghi("huy_nutConLai", await nutCua(B));
    await p.ev(click(`.dp-khach-btn[data-suat="${C}"][data-action="don"]`));
    await p.waitFor(`!!document.querySelector('.dp-khach[data-suat="${C}"] .dp-khach-kq.is-ok')`, "suất C đã đón");
    ghi("don_nutConLai", await nutCua(C));
    ghi("diem2_ketQua", await p.ev(`[...document.querySelectorAll('.dp-run[data-diem="${d2}"] .dp-khach')].map((x) => x.innerText.replace(/\\s+/g, ' ').trim())`));
    ghi("SQL_diem2", env.sql(`SELECT id, status FROM vc_trip_allocation WHERE id IN ('${A}','${B}','${C}') AND valid_to_at IS NULL`));
    await p.ev(`document.querySelector('.dp-run[data-diem="${d2}"]').scrollIntoView({ block: 'start' }); scrollBy(0, -56); true`);
    await shotView(p, "g10-diem-2-vang-huy-don-dien-thoai.png");
    // Vắng có đảo được bằng "Đã đón" (đón muộn — trigger 0042 cho NO_SHOW → BOARDED)? bấm thật:
    const conDon = await p.ev(`!!document.querySelector('.dp-khach-btn[data-suat="${A}"][data-action="don"]')`);
    ghi("vang_conNutDaDon", conDon);
    if (conDon) {
      await p.ev(click(`.dp-khach-btn[data-suat="${A}"][data-action="don"]`));
      await p.waitFor(`!!document.querySelector('.dp-khach[data-suat="${A}"] .dp-khach-kq.is-ok')`, "suất A đón muộn");
      ghi("vang_sauDonMuon", { kq: await kqCua(A), sql: env.sql(`SELECT status FROM vc_trip_allocation WHERE id = '${A}' AND valid_to_at IS NULL`) });
    }
  });
  await b.step("14", "Điểm 3 mất mạng: Vắng khi offline → 'Chưa gửi được'; online → Bấm lại; chẩn đoán kết quả (DOM + SQL + mạng)", async () => {
    const d3 = await diemCua(2);
    await p.ev(click(`.dp-run[data-diem="${d3}"] [data-action="da-toi"]`));
    await p.waitFor(`document.querySelectorAll('.dp-run[data-diem="${d3}"] .dp-khach-btn[data-action="vang"]').length >= 1`, "nút khách điểm 3");
    const suat = await p.ev(`document.querySelector('.dp-run[data-diem="${d3}"] .dp-khach-btn[data-action="vang"]').dataset.suat`);
    await p.send("Network.emulateNetworkConditions", { offline: true, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
    const truoc = p.requests.length;
    await p.ev(click(`.dp-run[data-diem="${d3}"] .dp-khach-btn[data-action="vang"]`));
    await p.waitFor(`!!document.querySelector('.dp-khach.is-cho [data-action="bam-lai"]')`, "dòng chưa gửi được");
    ghi("matMang_dai", await p.ev(txt("#cc-trang > .banner-warning")));
    await p.ev(`document.querySelector('.dp-khach.is-cho').scrollIntoView({ block: 'center' }); true`);
    await shotView(p, "g10-mat-mang-dien-thoai.png");
    await p.send("Network.emulateNetworkConditions", { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
    await p.ev(click('.dp-khach.is-cho [data-action="bam-lai"]')); // NGAY sau khi có mạng — đúng nhịp của cuoc-smoke bước 5
    await sleep(3000);
    ghi("matMang_lan1_dom", await p.ev(`(() => ({ isVang: document.querySelectorAll('.dp-run[data-diem="${d3}"] .dp-khach-kq.is-vang').length, conCho: document.querySelectorAll('.dp-khach.is-cho').length, dai: [...document.querySelectorAll('#cc-trang > .banner')].map((x) => x.innerText.replace(/\\s+/g, ' ')) }))()`));
    ghi("matMang_lan1_SQL", env.sql(`SELECT status FROM vc_trip_allocation WHERE id = '${suat}' AND valid_to_at IS NULL`));
    if (await p.ev(`!!document.querySelector('.dp-khach.is-cho [data-action="bam-lai"]')`)) {
      await shotView(p, "g10-mat-mang-bam-lai-lan-1-dien-thoai.png");
      await sleep(1000);
      await p.ev(click('.dp-khach.is-cho [data-action="bam-lai"]'));
      await sleep(4000);
    }
    const reqs = p.requests.slice(truoc).map((r) => ({ m: r.method, path: new URL(r.url).pathname, body: r.postData }));
    ghi("matMang_yeuCauSau", reqs);
    ghi("matMang_failed", p.failed.slice(-6));
    ghi("matMang_domSau", await p.ev(`(() => ({ isVang: document.querySelectorAll('.dp-run[data-diem="${d3}"] .dp-khach-kq.is-vang').length, conCho: document.querySelectorAll('.dp-khach.is-cho').length, dai: [...document.querySelectorAll('#cc-trang > .banner')].map((x) => x.innerText.replace(/\\s+/g, ' ')) }))()`));
    ghi("matMang_SQL", env.sql(`SELECT status FROM vc_trip_allocation WHERE id = '${suat}' AND valid_to_at IS NULL`));
    ghi("matMang_console", p.consoleErrors.slice(-5));
    await shotView(p, "g10-mat-mang-sau-bam-lai-dien-thoai.png");
    // Tải lại trang: máy chủ có ghi không?
    await p.send("Page.navigate", { url: `${env.base}/cuoc-chuyen?id=${T1.id}` });
    await p.waitFor(`!!document.querySelector('.dp-cc-head')`, "tải lại màn đang chạy", 12000);
    ghi("matMang_sauTaiLai_isVang", await p.ev(`document.querySelectorAll('.dp-run[data-diem="${d3}"] .dp-khach-kq.is-vang').length`));
  });
  await b.step("15", "Hộp Kết thúc gián đoạn (390) — xem lý do; đóng", async () => {
    await p.ev(click('[data-action="ket-thuc-gian-doan"]'));
    await p.waitFor(`!!document.querySelector('[data-action="gian-doan-gui"]')`, "hộp gián đoạn");
    ghi("gianDoan", await p.ev(txt(".sheet")));
    await shotView(p, "g10-ket-thuc-gian-doan-dien-thoai.png");
    await p.ev(`document.querySelector('.sheet .vc-btn-ghost-primary')?.click(); true`);
  });
  await p.close();

  // ================= TÀI XẾ ĐỐI TÁC =================
  if (PARTNER) {
    const q = await env.as(PARTNER.account, "/", MOB);
    await b.step("16", "Tài xế đối tác 390: trang đầu có gì; mở /cuoc", async () => {
      await sleep(2500);
      ghi("doiTac_trangDau", { path: await q.ev("location.pathname"), text: await q.ev(`document.querySelector('main')?.innerText.replace(/\\s+/g, ' ').trim().slice(0, 400)`) });
      await shotView(q, "g10-tai-xe-doi-tac-trang-dau-dien-thoai.png");
      await q.send("Page.navigate", { url: `${env.base}/cuoc` });
      await sleep(2500);
      ghi("doiTac_cuoc", { path: await q.ev("location.pathname"), text: await q.ev(`document.querySelector('main')?.innerText.replace(/\\s+/g, ' ').trim().slice(0, 300)`), loi: await q.ev(txt("#error")) });
      await shotView(q, "g10-tai-xe-doi-tac-cuoc-dien-thoai.png");
      const rr = await fetchTrang(q, "GET", "/api/van-chuyen/cuoc-cua-toi");
      ghi("doiTac_routeCuoc", { status: rr.status, code: rr.json?.error?.code ?? null });
    });
    await q.close();
  }

  // ================= BIỂU MẪU ĐƠN 390 — khối Đưa đón =================
  const f = await env.as(ACCOUNTS.salesB, "/order-form", MOB);
  await b.step("17", "Biểu mẫu đơn 390: thêm TD101, + Thêm đưa đón; liệt kê lựa chọn Nơi đón; Gõ tự do; ô SĐT, số khách", async () => {
    await f.waitFor(`!!document.getElementById('catalog-q')`, "ô tìm danh mục", 12000);
    await f.ev("document.getElementById('catalog-q').focus(); true");
    await f.ev(typeInto("#catalog-q", "TD101"));
    await f.waitFor("document.querySelectorAll('#catalog-list .catalog-pick').length === 1", "TD101 trong danh mục");
    await f.ev("document.querySelector('#catalog-list .catalog-pick').click(); true");
    await f.waitFor(`document.querySelectorAll('#services .svc').length === 1`, "thẻ dịch vụ");
    await f.ev(click('#services .svc [data-action="them-dua-don"]'));
    await f.waitFor(`!!document.querySelector('#services .svc .dd-chang [data-o$=":don"]')`, "chặng đưa đón");
    ghi("form_luaChonNoiDon", await f.ev(`[...document.querySelector('#services .svc .dd-chang [data-o$=":don"]').options].map((o) => o.text)`));
    ghi("form_oKhach", await f.ev(`(() => { const cp = document.getElementById('customerPhone'); return { sdtType: cp?.type, sdtInputmode: cp?.getAttribute('inputmode'), sdtFont: cp ? getComputedStyle(cp).fontSize : null, soKhachO: [...document.querySelectorAll('#services .svc input')].filter((x) => /pax|adult|nguoi|khach/i.test(x.id + x.name + (x.getAttribute('aria-label') ?? ''))).map((x) => x.id || x.getAttribute('aria-label')), fontSelect: getComputedStyle(document.querySelector('#services .svc .dd-chang [data-o$=":don"]')).fontSize }; })()`));
    await f.ev(`document.querySelector('#services .svc .dd-chang').scrollIntoView({ block: 'start' }); scrollBy(0, -60); true`);
    await shotView(f, "g10-bieu-mau-dua-don-dien-thoai.png");
    await f.ev(typeInto(`#services .svc .dd-chang [data-o$=":don"]`, "tudo"));
    await f.waitFor(`!!document.querySelector('#services .svc .dd-chang [data-o$=":don-chu"]')`, "ô Địa chỉ đón");
    ghi("form_oTuDo", await f.ev(`(() => { const i = document.querySelector('#services .svc .dd-chang [data-o$=":don-chu"]'); return { placeholder: i.placeholder, font: getComputedStyle(i).fontSize, goiY: i.closest('label')?.innerText.replace(/\\s+/g, ' '), list: i.getAttribute('list') }; })()`));
    await f.ev(`document.querySelector('#services .svc .dd-chang').scrollIntoView({ block: 'start' }); scrollBy(0, -60); true`);
    await shotView(f, "g10-bieu-mau-dia-chi-tu-do-dien-thoai.png");
    await shotFull(f, "g10-bieu-mau-ca-trang-dien-thoai.png");
  });
  await f.close();
} finally {
  writeFileSync(join(OUT, "ghep-10-don-do.json"), JSON.stringify(DO, null, 2));
  b.xong();
  await env.stop();
}
