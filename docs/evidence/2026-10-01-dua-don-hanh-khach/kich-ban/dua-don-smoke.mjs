// ADR-0047 Phần B — giao diện "Đưa đón" + "Hành khách" (bản vẽ docs/design/2026-10-01-dua-don-hanh-khach M1–M6) + cảnh báo sớm lúc xác nhận đơn.
// Kế hoạch docs/superpowers/plans/2026-10-01-giao-dien-dua-don-hanh-khach.md, tiêu chí 1–4, 6, 7, 9 (phần trang đơn); D1 tạm + wrangler dev + Chrome headless (khuôn
// docs/evidence/2026-09-29-adr-0049/kich-ban/dp-lib.mjs — không cần mạng ngoài). Mọi tên, SĐT, địa chỉ ở đây là GIẢ.
// Chạy từ GỐC repo, sau `npm run build:web`:
//   AXE_JS=<…/axe.min.js> CHROME_BIN=docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh OUT=docs/evidence/2026-10-01-dua-don-hanh-khach node docs/evidence/2026-10-01-dua-don-hanh-khach/kich-ban/dua-don-smoke.mjs
// Kho cookie Chrome dùng CHUNG: Bán hàng → Kế toán → Đối tác (trang của tài khoản nào mở SAU CÙNG).
import {
  ACCOUNTS, CHU, DESK, MOB, apiCalls, assert, axe, axeNote, boDem, click, dungMoiTruong, fetchTrang, noCode, noOverflowX, shotFull, shotView, shown, sleep, txt, typeInto, vnDate,
} from "../../2026-09-29-adr-0049/kich-ban/dp-lib.mjs";
import { chonNoiJs } from "../../2026-10-18-tao-don-thiet-ke-lai/kich-ban/cham-that.mjs";

const DOI_TAC = { name: "Đối Tác Đưa Đón", phone: "0900000452", pin: "246452", permissions: ["PARTNER"] };
const { env, call } = await dungMoiTruong([CHU, DOI_TAC]);
const b = boDem("DUA DON SMOKE");
const NGAY = vnDate(5); // ngoài mốc 6 giờ — không dính đặt gấp
const T = "'2026-10-01T00:00:00.000Z'";
const KS = "11111111-aaaa-4aaa-8aaa-000000000001";
const SB = "11111111-aaaa-4aaa-8aaa-000000000002";
const GA = "11111111-aaaa-4aaa-8aaa-000000000003";
env.sql(`INSERT INTO loc_location (id, code, name, location_type_code, sort_order, created_at, updated_at) VALUES
  ('${KS}', 'KS_MUONG_THANH', 'Khách sạn Mường Thanh Luxury Nha Trang', 'HOTEL', 20, ${T}, ${T}),
  ('${SB}', 'SB_CAM_RANH', 'Sân bay Cam Ranh', 'AIRPORT', 21, ${T}, ${T}),
  ('${GA}', 'GA_CAP_TREO', 'Ga cáp treo Vinpearl', 'CABLE_CAR', 22, ${T}, ${T});`);
// Luật "một máy" (ADR-0075, ADR-0085): mỗi lần đăng nhập đóng phiên cũ của cùng tài khoản — `call()` (đăng nhập riêng, giữ cookie) và Chrome (`env.as`,
// mỗi lần một phiên mới) sẽ đá nhau (bước 6 và 12 từng đỏ 401, 2026-10-08). Nên: tài khoản ĐANG MỞ TRANG thì gọi API bằng PHIÊN CỦA TRANG (`fetchTrang`,
// khuôn dp-lib.mjs — kho cookie Chrome dùng chung nên trang nào của tài khoản đó cũng mang phiên mới nhất); `call()` chỉ cho tài khoản chưa / không mở
// trang (Quản trị; Đối tác lúc lập đơn TRƯỚC khi mở trang — sau đó chỉ gọi qua trang).
const goiTrang = (pg) => (method, path, body) => fetchTrang(pg, method, path, body);
const goiApi = (ai) => (method, path, body) => call(ai, method, path, body);
const NO_TRIP = { departDate: NGAY, departTime: "", checkinDate: "", checkinTime: "", checkinPlace: "", note: "" };
const base = { customerEmail: "", customerNote: "", discount: 0, paymentNote: "" };
const leg = (o) => ({ direction: "OUT", pickupDate: NGAY, pickupTime: "07:30", pickupLocationId: KS, pickupPlace: "", dropoffLocationId: null, dropoffPlace: "", ...o });
const svc = (adult, legs) => ({ kind: "catalog", catalogCode: "TD101", pax: { adult, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: 1350000 }, unitPrices: { adult: 1350000 }, ...NO_TRIP, legs });
const donApi = async (goi, ten, adult, legs, passengers) => {
  const r = await goi("POST", "/api/orders", { ...base, customerName: ten, customerPhone: "0903 111 222", services: [svc(adult, legs)], ...(passengers ? { passengers } : {}) });
  assert.equal(r.status, 201, r.text);
  return r.json.order;
};
const card = "#services .svc";
const chang = (chieu) => `${card} .dd-chang[data-chieu="${chieu}"]`;
// 14/10 (Tạo đơn bốn bước): chặng đã đủ thông tin gập thành MỘT dòng tóm tắt và ô ít dùng (chuyến bay, xe riêng, số chỗ) nằm trong khối "Thêm chi tiết" — mở hết trước khi thao tác / đọc chữ trong đó.
const moHetKhoiGap = `document.querySelectorAll('${card} button[data-gap][aria-expanded="false"]').forEach((n) => n.click()); true`;
// 18/10 (Tạo đơn thiết kế lại, việc 7): ở FORM, nơi đón / nơi trả là MỘT ô gõ có gợi ý (`data-o` giữ `:don` / `:tra`) — giá trị của ô là NHÃN điểm (không còn id của ô chọn), chọn
// bằng cách bấm ô, gõ, bấm dòng (`chonNoiJs`); không còn ô tìm điểm (`:don-tim`) và ô "Địa chỉ đón / trả" (`:don-chu`). Bảng "Sửa đưa đón" của trang đơn (bước 5+) vẫn là ô chọn.
const NHAN = { [KS]: "Khách sạn Mường Thanh Luxury Nha Trang · khách sạn", [SB]: "Sân bay Cam Ranh · sân bay", [GA]: "Ga cáp treo Vinpearl · ga cáp treo" };
const TIM = { [KS]: "muong", [SB]: "cam ranh", [GA]: "cap treo" };
const chonForm = (pg, sel, id) => pg.ev(chonNoiJs(`document.querySelector('${sel}')`, TIM[id], NHAN[id].split(" · ")[0]));
const goTuDoForm = (pg, sel, chu) => pg.ev(chonNoiJs(`document.querySelector('${sel}')`, chu, "Gõ tự do: "));
/** Mở danh sách gợi ý của ô `sel` (bấm ô), gõ `kim` (rỗng = không gõ); trả chữ các dòng (tên + loại, không kèm câu nhắc) rồi đóng (Esc) — ô trở về giá trị đã chọn. */
const dongGoiY = (pg, sel, kim = "") => pg.ev(`(() => { const o = document.querySelector('${sel}'); o.focus(); o.click(); if (${JSON.stringify(kim)} !== '') { o.value = ${JSON.stringify(kim)}; o.dispatchEvent(new Event('input', { bubbles: true })); }
  const r = [...document.getElementById(o.getAttribute('aria-controls')).querySelectorAll('[role=option]')].map((x) => x.querySelector('.dd-goi-y-ten').textContent + (x.querySelector('.dd-goi-y-loai')?.textContent ?? ''));
  o.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); return r; })()`);

try {
  // ---- dữ liệu: mẫu chặng TD101 = Hai chiều, giờ về 16:30, nơi trả gợi ý Ga cáp treo (route của Quản trị) -------------------------------------------------
  let r = await call(ACCOUNTS.admin, "POST", "/api/van-chuyen/mau-chang/TD101", { mode: "ROUND_TRIP", returnTimeHint: "16:30", noiTraMacDinhId: GA });
  assert.ok(r.status === 200 || r.status === 201, r.text);

  // ---- Bán hàng: form lập đơn (M6, M1, M2) ----------------------------------------------------------------------------------------------------------------------
  const f = await env.as(ACCOUNTS.salesA, "/order-form", DESK);
  let donId = null;
  await b.step("1", `M6 (1040): chọn dịch vụ Hai chiều → tạo sẵn chiều đi + chiều về, câu ghi chú đúng bản vẽ, nơi trả gợi ý Ga cáp treo, giờ về 16:30; chọn nơi đón chiều đi → chiều về tự đảo${axeNote()}`, async () => {
    await f.waitFor(`!!document.getElementById('catalog-q')`, "ô tìm danh mục");
    await f.ev(typeInto("#orderDate", NGAY));
    await f.ev("document.getElementById('catalog-q').focus(); true");
    await f.ev(typeInto("#catalog-q", "TD101"));
    await f.waitFor("document.querySelectorAll('#catalog-list .catalog-pick').length === 1", "TD101 trong danh mục");
    await f.ev("document.querySelector('#catalog-list .catalog-pick').click(); true");
    await f.waitFor(`document.querySelectorAll('${card} .dd-chang').length === 2`, "hai chặng tạo sẵn");
    assert.equal(await f.ev(txt(`${card} .dd .dd-ghi-tao`)), "Đã tạo sẵn chiều đi và chiều về theo dịch vụ — sửa hoặc bỏ nếu khác.");
    assert.equal(await f.ev(txt(`${chang("OUT")} .chip`)), "Chiều đi");
    assert.equal(await f.ev(txt(`${chang("RETURN")} .chip`)), "Chiều về");
    assert.equal(await f.ev(`document.querySelector('${chang("OUT")} [data-o$=":tra"]').value`), NHAN[GA]);
    assert.match(await f.ev(txt(`${chang("OUT")} .dd-luoi-noi`)), /gợi ý theo dịch vụ/);
    assert.equal(await f.ev(`document.querySelector('${chang("RETURN")} [data-o$=":gio"]').value`), "16:30");
    assert.match(await f.ev(txt(`${chang("RETURN")}`)), /theo nơi trả chiều đi/);
    // Đợt 1 (13/10, #9): form Tạo đơn ẩn ô "Ngày đón" khi chặng cùng ngày đi; chữ gợi ý "Bằng ngày đi" vẫn nằm trong ô ẩn; lối "Đón khác ngày" mở ô.
    const ngayOut = `document.querySelector('${chang("OUT")} [data-o$=":ngay"]').closest('label')`;
    assert.equal(await f.ev(`${ngayOut}.hidden`), true, "Ngày đón ẩn khi cùng ngày đi");
    assert.match(await f.ev(`${ngayOut}.textContent`), /Bằng ngày đi/);
    assert.equal(await f.ev(shown(`${chang("OUT")} [data-action="don-khac-ngay"]`)), true, "có lối 'Đón khác ngày'");
    assert.equal(await f.ev(txt(`${chang("OUT")} [data-action="don-khac-ngay"]`)), "Đón khác ngày");
    await f.ev(click(`${chang("OUT")} [data-action="don-khac-ngay"]`));
    assert.equal(await f.ev(shown(`${chang("OUT")} [data-o$=":ngay"]`)), true, "bấm 'Đón khác ngày' → ô Ngày đón hiện");
    assert.equal(await f.ev(shown(`${chang("OUT")} [data-action="don-khac-ngay"]`)), false, "lối nhỏ ẩn đi khi ô đã mở");
    assert.match(await f.ev(txt(`${chang("OUT")}`)), /Bằng ngày đi/);
    assert.equal(await f.ev(`document.activeElement === document.querySelector('${chang("OUT")} [data-o$=":ngay"]')`), true, "tiêu điểm vào ô Ngày đón vừa mở");
    // chặng chiều về còn ẩn (chưa bấm); đặt ngày đón KHÁC ngày đi → ô tự hiện, không cần bấm
    await f.ev(moHetKhoiGap); // chiều về đã đủ giờ + nơi đón (đảo từ chiều đi) nên đang gập một dòng; người dùng phải mở ra mới sửa được
    assert.equal(await f.ev(`document.querySelector('${chang("RETURN")} [data-o$=":ngay"]').closest('label').hidden`), true, "chiều về: Ngày đón vẫn ẩn");
    await f.ev(typeInto(`${chang("RETURN")} [data-o$=":ngay"]`, vnDate(6)));
    assert.equal(await f.ev(shown(`${chang("RETURN")} [data-o$=":ngay"]`)), true, "ngày đón khác ngày đi → ô hiện");
    assert.match(await f.ev(txt(`${chang("RETURN")}`)), /Khác ngày đi/);
    await f.ev(typeInto(`${chang("RETURN")} [data-o$=":ngay"]`, NGAY));
    assert.equal(await f.ev(shown(`${chang("RETURN")} [data-o$=":ngay"]`)), true, "gõ lại đúng ngày đi: ô không tự ẩn giữa chừng");
    assert.equal(await chonForm(f, `${chang("OUT")} [data-o$=":don"]`, KS), true, "chọn Mường Thanh ở ô Nơi đón");
    await f.waitFor(`document.querySelector('${chang("RETURN")} [data-o$=":tra"]').value === ${JSON.stringify(NHAN[KS])}`, "chiều về trả tại nơi đón chiều đi");
    // Danh sách gợi ý (việc 7 thay ô chọn của máy): dòng đầu là điểm danh mục (không còn dòng "Chọn nơi đón…"), dòng cuối "Gõ tự do…"; ô Nơi trả đang có giá trị → dòng đầu "Chưa chốt".
    const opts = await dongGoiY(f, `${chang("OUT")} [data-o$=":don"]`);
    assert.notEqual(opts[0], "Chọn nơi đón…");
    assert.equal(opts.at(-1), "Gõ tự do…");
    assert.ok(opts.includes(NHAN[KS]), opts.join(" | "));
    assert.equal((await dongGoiY(f, `${chang("OUT")} [data-o$=":tra"]`))[0], "Chưa chốt");
    // Việc 11 — C4 (C10), nay trong chính ô gõ: gõ không dấu thu hẹp danh sách, Esc trả ô về điểm đang chọn (kịch bản riêng: docs/evidence/2026-10-18-tao-don-thiet-ke-lai/kich-ban/dua-don-mot-o-smoke.mjs).
    assert.deepEqual(await dongGoiY(f, `${chang("OUT")} [data-o$=":don"]`, "muong"), [NHAN[KS], "Gõ tự do: “muong”"]);
    assert.deepEqual(await dongGoiY(f, `${chang("OUT")} [data-o$=":don"]`), opts);
    assert.equal(await f.ev(`document.querySelector('${chang("OUT")} [data-o$=":don"]').value`), NHAN[KS]);
    assert.equal(await f.ev(noCode), "");
    await axe(f, "form M6");
    await shotFull(f, "m6-form-hai-chieu-1040.png");
  });

  await b.step("2", "M1 (1040): đổi ngày đi → 'Đã dời ngày đón của 2 lượt đưa đón theo ngày đi mới'; Gõ tự do → chữ trong ô + câu nhắc chỉ ghi địa chỉ; Sân bay → ô Số hiệu chuyến bay; thêm lượt thiếu nơi đón → Lưu báo 'Lượt 3: chưa có nơi đón.' và KHÔNG gửi; bỏ lượt", async () => {
    await f.ev(typeInto("#orderDate", vnDate(6)));
    await f.waitFor(`document.getElementById('orderDate-moved').textContent === 'Đã dời ngày đón của 2 lượt đưa đón theo ngày đi mới'`, "câu dời ngày");
    assert.match(await f.ev(`document.querySelector('${chang("OUT")} [data-o$=":ngay"]').closest('label').textContent`), /Bằng ngày đi/, "chặng dời theo ngày đi mới: vẫn 'Bằng ngày đi' (ô ngày có thể đang ẩn)");
    await f.ev(typeInto("#orderDate", NGAY));
    assert.equal(await goTuDoForm(f, `${chang("OUT")} [data-o$=":tra"]`, "12 Trần Phú"), true, "Gõ tự do ở ô Nơi trả");
    await f.waitFor(`document.querySelector('${chang("OUT")} [data-o$=":tra"]').value === '12 Trần Phú'`, "ô Nơi trả mang chữ tự do");
    // ADR-0105 mục 7 (tự áp G18-C): chữ tự do đi tới tài xế và tới bản đồ (nút "Chỉ đường") — dòng nhắc thay câu sai "Chỉ hiện trong trang đơn.". Việc 7: dòng nhắc nằm dưới chính ô Nơi trả.
    assert.match(await f.ev(txt(`${chang("OUT")} .dd-luoi-noi .dd-cot:nth-child(2)`)), /Chỉ ghi địa chỉ — không ghi tên, số điện thoại khách/);
    assert.equal(await goTuDoForm(f, `${chang("OUT")} [data-o$=":don"]`, "15 Trần Phú"), true, "Gõ tự do ở ô Nơi đón");
    await f.waitFor(`document.querySelector('${chang("OUT")} [data-o$=":don"]').value === '15 Trần Phú'`, "ô Nơi đón mang chữ tự do");
    assert.match(await f.ev(txt(`${chang("OUT")} .dd-luoi-noi .dd-cot:nth-child(1)`)), /Chỉ ghi địa chỉ — không ghi tên, số điện thoại khách/);
    assert.doesNotMatch(await f.ev(txt(`${chang("OUT")}`)), /Chỉ hiện trong trang đơn/);
    assert.equal(await chonForm(f, `${chang("OUT")} [data-o$=":don"]`, KS), true);
    assert.equal(await chonForm(f, `${chang("OUT")} [data-o$=":tra"]`, SB), true);
    await f.waitFor(`!!document.querySelector('${chang("OUT")} [data-o$=":bay"]')`, "ô số hiệu chuyến bay khi nơi trả là sân bay");
    await f.ev(moHetKhoiGap); // ô chuyến bay nằm trong "Thêm chi tiết"
    assert.match(await f.ev(txt(`${chang("OUT")}`)), /Số hiệu chuyến bay.*Tài xế tự tra giờ bay/);
    await f.ev(typeInto(`${chang("OUT")} [data-o$=":bay"]`, "vn1553"));
    await f.ev(click(`${card} [data-action="them-chang"]`));
    await f.waitFor(`document.querySelectorAll('${card} .dd-chang').length === 3`, "chặng 3");
    await f.ev(typeInto("#customerName", "Khách Đưa Đón"));
    await f.ev(typeInto("#customerPhone", "0903 222 333"));
    const truoc = apiCalls(f).filter((c) => c.method === "POST" && c.path === "/api/orders").length;
    await f.ev(click("#save"));
    await f.waitFor(`[...document.querySelectorAll('${card} .dd-chang')][2].innerText.includes('Lượt 3: chưa có nơi đón.')`, "lỗi chặng 3");
    assert.equal(apiCalls(f).filter((c) => c.method === "POST" && c.path === "/api/orders").length, truoc, "không gửi khi còn lỗi");
    await shotFull(f, "m1-form-loi-1040.png");
    await f.ev(`[...document.querySelectorAll('${card} .dd-chang')][2].querySelector('[data-action="bo-chang"]').click(); true`);
    await f.waitFor(`document.querySelectorAll('${card} .dd-chang').length === 2`, "bỏ chặng 3");
    assert.equal(await chonForm(f, `${chang("OUT")} [data-o$=":tra"]`, GA), true);
  });

  await b.step("3", `M2 (1040): khối Hành khách dạng bảng trải ngang dưới hàng 'thẻ dịch vụ | Tóm tắt'; 4 khách; dòng năm sinh sai → 'Dòng 3: năm sinh phải từ 1906 đến 2026.'; 3/4 nhắc vàng; nhập khách thứ 4 → 4/4${axeNote()}`, async () => {
    for (let i = 0; i < 3; i++) await f.ev(`document.querySelector('${card} .counter-btn[aria-label^="Tăng"]').click(); true`);
    await f.waitFor(shown("#hk-card"), "khối hành khách");
    assert.equal(await f.ev(txt("#hk-card .hk-trong")), "Chưa có hành khách nào.");
    assert.equal(await f.ev(txt("#hk-card .hk-dem")), "0/4 khách đã có tên");
    const w = await f.ev(`(() => { const a = document.getElementById('hk-card').getBoundingClientRect(); const m = document.querySelector('.form-main').getBoundingClientRect(); const s = document.querySelector('.form-side').getBoundingClientRect(); return { hk: Math.round(a.width), main: Math.round(m.width), top: a.top >= Math.max(m.bottom, s.bottom) - 1 }; })()`);
    assert.ok(w.hk > w.main + 200 && w.top, JSON.stringify(w));
    const ten = ["Nguyễn Văn An", "Trần Thị Bình", "Nguyễn Minh Khôi"];
    const nam = ["1985", "1988", "2051"];
    for (let i = 0; i < 3; i++) {
      await f.ev(click("#hk-card [data-action='them-khach']"));
      await f.waitFor(`document.querySelectorAll('#hk-card .hk-hang').length === ${i + 1}`, `dòng ${i + 1}`);
      await f.ev(`(() => { const r = document.querySelectorAll('#hk-card .hk-hang')[${i}]; for (const [s, v] of [['[data-o$=":ten"]', ${JSON.stringify(ten[i])}], ['[data-o$=":nam"]', ${JSON.stringify(nam[i])}]]) { const el = r.querySelector(s); el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); } return true; })()`);
    }
    assert.ok(await f.ev(shown("#hk-card .hk-bang")), "máy tính: dạng bảng");
    await f.waitFor(`document.querySelector('#hk-card').innerText.includes('Dòng 3: năm sinh phải từ 1906 đến 2026.')`, "lỗi năm sinh dòng 3");
    await f.ev(`(() => { const el = document.querySelectorAll('#hk-card .hk-hang')[2].querySelector('[data-o$=":nam"]'); el.value = '2015'; el.dispatchEvent(new Event('input', { bubbles: true })); el.closest('.hk-hang').querySelector('select').value = 'child'; el.closest('.hk-hang').querySelector('select').dispatchEvent(new Event('change', { bubbles: true })); return true; })()`);
    await f.waitFor(`!document.querySelector('#hk-card').innerText.includes('Dòng 3:')`, "hết lỗi");
    assert.equal(await f.ev(txt("#hk-card .hk-dem")), "3/4 khách đã có tên");
    assert.equal(await f.ev(txt("#hk-card .hk-nhac:not([hidden])")), "Còn 1 khách chưa có tên — cần đủ trước khi xe chạy");
    assert.deepEqual(await f.ev(`[...document.querySelectorAll('#hk-card .hk-dau-cot span')].map((s) => s.textContent)`), ["#", "Họ tên", "Năm sinh", "Loại khách (tuỳ chọn)", ""]);
    await shotFull(f, "m2-form-3-tren-4-1040.png");
    // Khách thứ 4 → 4/4, hết câu nhắc (tiêu chí 3: nhập 4 hành khách).
    await f.ev(click("#hk-card [data-action='them-khach']"));
    await f.waitFor(`document.querySelectorAll('#hk-card .hk-hang').length === 4`, "dòng 4");
    await f.ev(`(() => { const r = document.querySelectorAll('#hk-card .hk-hang')[3]; for (const [s, v] of [['[data-o$=":ten"]', 'Lê Thị Hồng'], ['[data-o$=":nam"]', '1952']]) { const el = r.querySelector(s); el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); } const l = r.querySelector('select'); l.value = 'senior'; l.dispatchEvent(new Event('change', { bubbles: true })); return true; })()`);
    assert.equal(await f.ev(txt("#hk-card .hk-dem")), "4/4 khách đã có tên");
    assert.equal(await f.ev(`!!document.querySelector('#hk-card .hk-nhac:not([hidden])')`), false, "đủ tên → không nhắc");
    assert.ok(await f.ev(noOverflowX));
    await axe(f, "form M2");
    await shotFull(f, "m1-m2-form-day-du-1040.png");
  });

  await b.step("4", "Lưu nháp: POST /api/orders có legs (không pickupTime/pickupPlace) và passengers; GET /api/orders/:id có 2 chặng đúng nơi; GET /passengers trả 4 (tiêu chí 1, 2, 3)", async () => {
    await f.ev(click("#save"));
    await f.waitFor("location.pathname === '/order'", "sang trang đơn", 15000);
    const post = apiCalls(f).filter((c) => c.method === "POST" && c.path === "/api/orders").at(-1);
    const than = JSON.parse(post.body);
    const s0 = than.services[0];
    assert.ok(!("pickupTime" in s0) && !("pickupPlace" in s0), "không gửi hai khoá cũ");
    assert.equal(s0.legs.length, 2);
    assert.equal(than.passengers.length, 4);
    donId = new URL(await f.ev("location.href")).searchParams.get("id");
    const o = (await fetchTrang(f, "GET", `/api/orders/${donId}`)).json.order;
    const legs = [...o.services[0].legs].sort((a, b) => (a.direction < b.direction ? -1 : 1));
    assert.deepEqual(legs.map((l) => [l.direction, l.pickupDate, l.pickupTime, l.pickupLabel, l.dropoffLabel, l.flightCode]), [
      ["OUT", NGAY, null, "Khách sạn Mường Thanh Luxury Nha Trang", "Ga cáp treo Vinpearl", "VN1553"],
      ["RETURN", NGAY, "16:30", "Ga cáp treo Vinpearl", "Khách sạn Mường Thanh Luxury Nha Trang", null],
    ], JSON.stringify(legs));
    const p = (await fetchTrang(f, "GET", `/api/orders/${donId}/passengers`)).json;
    assert.equal(p.passengers.length, 4);
    // Mở lại form sửa nháp: còn đủ chặng + hành khách.
    await f.ev(`document.querySelector('.sheet[role=dialog] .sheet-close')?.click(); true`);
  });

  await b.step("5", `M3 (1040, Bán hàng, đơn nháp): hai khối mới sau 'Khách hàng'; chặng không giờ → 'Chưa chốt giờ' + 'Cần giờ đón trước khi xếp xe'; 'Đơn nháp — sửa trong biểu mẫu đơn.'; thẻ dịch vụ KHÔNG còn dòng 'Đón'; 4/4 khách đã có tên; đủ nơi trả + đủ tên → KHÔNG cảnh báo dưới nút Xác nhận${axeNote()}`, async () => {
    await f.waitFor(shown('[data-khoi="dua-don"]'), "khối Đưa đón");
    const thuTu = await f.ev(`[...document.querySelectorAll('.order-layout > div:first-child > section > h2, .order-layout > div:first-child > .services > h2')].map((x) => x.textContent)`);
    assert.deepEqual(thuTu.filter((x) => ["Khách hàng", "Đưa đón", "Hành khách", "Dịch vụ"].includes(x)), ["Khách hàng", "Đưa đón", "Hành khách", "Dịch vụ"]);
    const dd = await f.ev(txt('[data-khoi="dua-don"]'));
    assert.match(dd, /Chiều đi .* Chưa chốt giờ .*✈︎ VN1553/);
    assert.match(dd, /Cần giờ đón trước khi xếp xe/);
    assert.match(dd, /Đơn nháp — sửa trong biểu mẫu đơn\./);
    assert.match(await f.ev(txt('[data-khoi="hanh-khach"]')), /^Hành khách 4\/4 khách đã có tên 1\. .*Lê Thị Hồng 1952 · Người cao tuổi.*Sửa danh sách$/);
    assert.equal(await f.ev(`[...document.querySelectorAll('.svc-view .kv .muted')].some((x) => x.textContent === 'Đón')`), false, "D4: thẻ dịch vụ bỏ dòng Đón");
    assert.equal(await f.ev(`!!document.querySelector('[data-canh-bao="xac-nhan"]')`), false, "đủ nơi trả, đủ tên → không cảnh báo dưới nút Xác nhận");
    assert.equal(await f.ev(noCode), "");
    await axe(f, "trang đơn nháp");
    await shotFull(f, "m3-don-nhap-1040.png");
  });

  await b.step("6", "Tiêu chí 6: xác nhận đơn thiếu nơi trả + thiếu tên → câu hỏi kèm cảnh báo, xác nhận VẪN thành công, dải vàng 'Đã xác nhận đơn.' liệt kê hai câu", async () => {
    const o = await donApi(goiTrang(f), "Khách Thiếu", 2, [leg({ dropoffLocationId: null })], []);
    const p = await env.as(ACCOUNTS.salesA, `/order?id=${o.id}`, DESK);
    await p.waitFor(shown('[data-canh-bao="xac-nhan"]'), "câu cảnh báo dưới nút xác nhận");
    assert.deepEqual(await p.ev(`[...document.querySelectorAll('[data-canh-bao="xac-nhan"]')].map((x) => x.innerText.trim())`), ["Cần nơi trả trước khi xếp xe", "Còn 2 khách chưa có tên — cần đủ trước khi xe chạy"]);
    await p.ev("window.__hoi = ''; window.confirm = (m) => { window.__hoi = m; return true; }; true");
    await p.ev(`[...document.querySelectorAll('#actions button')].find((x) => x.textContent === 'Xác nhận đơn').click(); true`);
    await p.waitFor(`document.getElementById('error').innerText.includes('Đã xác nhận đơn.')`, "dải sau xác nhận", 10000);
    assert.match(await p.ev("window.__hoi"), /Cần nơi trả trước khi xếp xe\nCòn 2 khách chưa có tên/);
    assert.match(await p.ev(txt("#error")), /Cần nơi trả trước khi xếp xe .*Còn 2 khách chưa có tên/);
    assert.equal((await fetchTrang(p, "GET", `/api/orders/${o.id}`)).json.order.status, "confirmed");
    await shotFull(p, "tc6-xac-nhan-canh-bao-1040.png");
    p.close();
  });

  // Đơn đã xác nhận cho M4/M5: 2 chặng, chiều về 2 người, 3 tên.
  const o2 = await donApi(goiTrang(f), "Khách Đã Xác Nhận", 4, [leg({ dropoffLocationId: GA }), leg({ direction: "RETURN", pickupTime: "16:30", pickupLocationId: GA, dropoffLocationId: KS, paxOverride: 2 })], [
    { fullName: "Nguyễn Văn An", birthYear: 1985, paxCode: "adult" }, { fullName: "Trần Thị Bình", birthYear: 1988, paxCode: "adult" }, { fullName: "Nguyễn Minh Khôi", birthYear: 2015, paxCode: "child" },
  ]);
  r = await fetchTrang(f, "POST", `/api/orders/${o2.id}/status`, { status: "confirmed" });
  assert.equal(r.status, 200, r.text);

  const m = await env.as(ACCOUNTS.salesA, `/order?id=${o2.id}`, DESK);
  await b.step("7", `M3 + M4 (1040, Bán hàng, đơn đã xác nhận): câu khoá theo vai; 'Sửa đưa đón' mở bảng — đổi nơi trả chiều đi, bỏ chiều về phải chọn lý do ('Chọn lý do bỏ chặng.'), Lưu → PUT /legs/:id + POST /legs/:id/close (tiêu chí 4)${axeNote()}`, async () => {
    await m.waitFor(shown('[data-action="sua-dua-don"]'), "nút Sửa đưa đón");
    assert.equal(await m.ev(txt(".lock-note")), "Đơn đã xác nhận: dịch vụ và đơn giá đã khoá. Còn sửa được số khách (nút “Sửa số khách dịch vụ”), thông tin chuyến, đưa đón và danh sách hành khách."); // người lập: có nút sửa số khách (ADR-0063 D1)
    assert.match(await m.ev(txt('[data-khoi="dua-don"]')), /Chiều về .*16:30 2 người về/);
    await shotFull(m, "m3-don-xac-nhan-1040.png");
    await m.ev(click('[data-action="sua-dua-don"]'));
    await m.waitFor(shown('.sheet[role=dialog] .dd-chang'), "bảng Sửa đưa đón");
    assert.equal(await m.ev(txt(".sheet-title")), "Sửa đưa đón");
    assert.equal(await m.ev(txt(".sheet .sheet-warn")), "Bản xác nhận đã gửi khách trước đó có thể lỗi thời — cần gửi lại.");
    await m.ev(typeInto(`.sheet .dd-chang[data-chieu="OUT"] [data-o$=":tra"]`, SB));
    await m.ev(click(`.sheet .dd-chang[data-chieu="RETURN"] [data-action="bo-chang"]`));
    await m.waitFor(shown(".sheet .dd-bo"), "hộp lý do bỏ chặng");
    assert.match(await m.ev(txt(".sheet .dd-bo")), /^Bỏ lượt 2 · Chiều về Lý do \(bắt buộc, chọn một\) Khách không cần đưa đón nữa Nhập nhầm Đổi sang lượt đưa đón khác Lượt đã bỏ không mất — xem trong lịch sử đơn\. Bỏ lượt Thôi$/);
    await m.ev(click('.sheet [data-action="xac-nhan-bo"]'));
    await m.waitFor(`document.querySelector('.sheet .dd-bo').innerText.includes('Chọn lý do bỏ lượt.')`, "bắt chọn lý do");
    await sleep(600); // chờ hết chuyển động mở bảng (độ mờ) rồi mới đo tương phản
    await axe(m, "bảng Sửa đưa đón");
    await shotView(m, "m4-sua-dua-don-ly-do-1040.png");
    await m.ev(`(() => { const r = document.querySelector('.sheet .dd-bo input[value="NOT_NEEDED"]'); r.checked = true; r.dispatchEvent(new Event('change', { bubbles: true })); return true; })()`);
    await m.ev(click('.sheet [data-action="xac-nhan-bo"]'));
    await m.waitFor(`document.querySelectorAll('.sheet .dd-chang').length === 1`, "đã bỏ chiều về");
    await m.ev(click('.sheet [data-action="luu-dua-don"]'));
    await m.waitFor(`!document.querySelector('.sheet[role=dialog]')`, "bảng đóng sau khi lưu", 15000);
    const calls = apiCalls(m).filter((c) => c.path.includes("/legs"));
    assert.ok(calls.some((c) => c.method === "POST" && /\/legs\/[^/]+\/close$/.test(c.path) && JSON.parse(c.body).reasonCode === "NOT_NEEDED"), "đóng chặng có lý do");
    assert.ok(calls.some((c) => c.method === "PUT" && /\/legs\/[^/]+$/.test(c.path) && JSON.parse(c.body).leg.dropoffLocationId === SB), "sửa nơi trả");
    const o = (await fetchTrang(m, "GET", `/api/orders/${o2.id}`)).json.order;
    assert.deepEqual(o.services[0].legs.map((l) => [l.direction, l.dropoffLabel]), [["OUT", "Sân bay Cam Ranh"]]);
    await m.waitFor(`document.getElementById('error').innerText.includes('Đã lưu đưa đón.')`, "báo đã lưu");
  });

  await b.step("7b", "C14 (1040, Bán hàng): bỏ chiều đi với lý do 'Đổi sang chặng khác' + thêm chặng mới trong cùng lần Lưu → ĐÚNG MỘT lệnh POST /legs/:id/replace (reasonCode REPLACED), không gửi /close, không gửi POST /legs; đơn còn đúng chặng mới; lịch sử có 'bỏ — Đổi sang chặng khác'", async () => {
    await m.waitFor(shown('[data-action="sua-dua-don"]'), "nút Sửa đưa đón (sau khi tải lại)");
    await m.ev(click('[data-action="sua-dua-don"]'));
    await m.waitFor(shown('.sheet[role=dialog] .dd-chang[data-chieu="OUT"]'), "bảng Sửa đưa đón");
    await m.ev(click(`.sheet .dd-chang[data-chieu="OUT"] [data-action="bo-chang"]`));
    await m.waitFor(shown(".sheet .dd-bo"), "hộp lý do bỏ chặng");
    await m.ev(`(() => { const r = document.querySelector('.sheet .dd-bo input[value="REPLACED"]'); r.checked = true; r.dispatchEvent(new Event('change', { bubbles: true })); return true; })()`);
    await m.ev(click('.sheet [data-action="xac-nhan-bo"]'));
    await m.waitFor(`document.querySelectorAll('.sheet .dd-chang').length === 0`, "đã bỏ chiều đi");
    await m.ev(click('.sheet [data-action="them-dua-don"]'));
    await m.waitFor(`document.querySelectorAll('.sheet .dd-chang[data-chieu="OUT"]').length === 1`, "chặng đi mới");
    await m.ev(typeInto(`.sheet .dd-chang[data-chieu="OUT"] [data-o$=":don"]`, SB));
    await m.ev(typeInto(`.sheet .dd-chang[data-chieu="OUT"] [data-o$=":tra"]`, KS));
    await m.ev(typeInto(`.sheet .dd-chang[data-chieu="OUT"] [data-o$=":gio"]`, "09:15"));
    const truoc = apiCalls(m).filter((c) => c.path.includes("/legs")).length;
    await m.ev(click('.sheet [data-action="luu-dua-don"]'));
    await m.waitFor(`!document.querySelector('.sheet[role=dialog]')`, "bảng đóng sau khi lưu", 15000);
    const calls = apiCalls(m).filter((c) => c.path.includes("/legs")).slice(truoc);
    assert.deepEqual(calls.map((c) => `${c.method} ${c.path.replace(/[0-9a-f-]{36}/g, ":id")}`), ["POST /api/orders/:id/legs/:id/replace"], JSON.stringify(calls.map((c) => c.path)));
    const than = JSON.parse(calls[0].body);
    assert.equal(than.reasonCode, "REPLACED");
    assert.equal(than.leg.pickupLocationId, SB);
    const { order: o, history } = (await fetchTrang(m, "GET", `/api/orders/${o2.id}`)).json;
    assert.deepEqual(o.services[0].legs.map((l) => [l.direction, l.pickupTime, l.pickupLabel]), [["OUT", "09:15", "Sân bay Cam Ranh"]]);
    assert.ok(history.some((e) => e.action === "order_leg_closed" && /bỏ — Đổi sang lượt đưa đón khác$/.test(e.detail ?? "")), "lịch sử: bỏ — Đổi sang chặng khác");
    assert.ok(history.some((e) => e.action === "order_leg_added" && /nơi đón Sân bay Cam Ranh/.test(e.detail ?? "")), "lịch sử: thêm chặng mới");
    await m.waitFor(`document.getElementById('error').innerText.includes('Đã lưu đưa đón.')`, "báo đã lưu");
  });

  await b.step("8", "Sửa thông tin chuyến: không còn ô Giờ đón / Điểm đón; PUT /trip KHÔNG gửi pickupTime / pickupPlace (tiêu chí 20 kế hoạch ADR-0047)", async () => {
    await m.ev(click('[data-action="edit-trip"]'));
    await m.waitFor(shown(".sheet[role=dialog]"), "bảng Sửa thông tin chuyến");
    assert.equal(await m.ev(`!!document.querySelector('.sheet [data-trip="pickupTime"], .sheet [data-trip="pickupPlace"]')`), false);
    await m.ev(typeInto('.sheet [data-trip="note"]', "Ghi chú mới"));
    await m.ev(`[...document.querySelectorAll('.sheet button')].find((x) => x.textContent === 'Lưu thông tin chuyến').click(); true`);
    await m.waitFor(`!document.querySelector('.sheet[role=dialog]')`, "đóng bảng", 15000);
    const put = apiCalls(m).filter((c) => c.method === "PUT" && c.path.endsWith("/trip")).at(-1);
    const s0 = JSON.parse(put.body).services[0];
    assert.ok(!("pickupTime" in s0) && !("pickupPlace" in s0), put.body);
    assert.equal(s0.note, "Ghi chú mới");
  });

  await b.step("8b", `M5 (1040): bảng 'Sửa danh sách hành khách' rộng 640px (token --w-sheet-hk), mỗi người một thẻ; 'Huỷ' đóng không gửi${axeNote()}`, async () => {
    await m.ev(click('[data-action="sua-danh-sach"]'));
    await m.waitFor(shown(".sheet[role=dialog] .hk-the"), "bảng thẻ");
    await sleep(600);
    assert.equal(await m.ev(`Math.round(document.querySelector('.sheet[role=dialog]').getBoundingClientRect().width)`), 640);
    assert.equal(await m.ev(`document.querySelectorAll('.sheet .hk-the').length`), 3);
    await axe(m, "bảng Sửa danh sách 1040");
    await shotView(m, "m5-sua-danh-sach-1040.png");
    const truoc = apiCalls(m).filter((c) => c.method === "POST" && c.path.endsWith("/passengers")).length;
    await m.ev(`[...document.querySelectorAll('.sheet .sheet-foot button')].find((x) => x.textContent === 'Huỷ').click(); true`);
    await m.waitFor(`!document.querySelector('.sheet[role=dialog]')`, "đóng bảng");
    assert.equal(apiCalls(m).filter((c) => c.method === "POST" && c.path.endsWith("/passengers")).length, truoc);
  });
  m.close();

  const m5 = await env.as(ACCOUNTS.salesA, `/order?id=${o2.id}`, MOB);
  await b.step("8c", `M4 (390): bảng 'Sửa đưa đón' trượt từ đáy, không tràn ngang, chân 'Huỷ | Lưu'${axeNote()}`, async () => {
    await m5.waitFor(shown('[data-action="sua-dua-don"]'), "nút Sửa đưa đón");
    await m5.ev(click('[data-action="sua-dua-don"]'));
    await m5.waitFor(shown(".sheet[role=dialog] .dd-chang"), "bảng Sửa đưa đón");
    await sleep(600);
    assert.ok(await m5.ev(`document.querySelector('.sheet').scrollWidth <= document.querySelector('.sheet').clientWidth + 1`), "bảng không tràn ngang");
    assert.deepEqual(await m5.ev(`[...document.querySelectorAll('.sheet .sheet-foot button')].map((x) => x.textContent)`), ["Huỷ", "Lưu"]);
    await axe(m5, "bảng Sửa đưa đón 390");
    await shotView(m5, "m4-sua-dua-don-390.png");
    await m5.ev(`[...document.querySelectorAll('.sheet .sheet-foot button')].find((x) => x.textContent === 'Huỷ').click(); true`);
    await m5.waitFor(`!document.querySelector('.sheet[role=dialog]')`, "đóng bảng");
  });
  await b.step("9", `M5 (390, Bán hàng): 'Sửa danh sách' mở bảng thẻ; 'Huỷ người' hỏi lại trong thẻ; thêm Lê Thị Hồng; Lưu → POST /passengers {them 1, huy 1}; 390 không tràn ngang${axeNote()}`, async () => {
    await m5.waitFor(shown('[data-action="sua-danh-sach"]'), "nút Sửa danh sách");
    assert.ok(await m5.ev(noOverflowX), "trang đơn 390 không tràn ngang");
    await shotFull(m5, "m3-don-xac-nhan-390.png");
    await m5.ev(click('[data-action="sua-danh-sach"]'));
    await m5.waitFor(shown(".sheet[role=dialog] .hk-the"), "bảng thẻ");
    assert.equal(await m5.ev(txt(".sheet-title")), "Sửa danh sách hành khách");
    assert.match(await m5.ev(txt(".sheet .hk")), /^Không xoá hẳn; mọi lần sửa đều được lưu lại\. 3\/4 khách đã có tên/);
    await m5.ev(`[...document.querySelectorAll('.sheet .hk-the')].find((c) => c.querySelector('[data-o$=":ten"]').value === 'Trần Thị Bình').querySelector('[data-action="huy-nguoi"]').click(); true`);
    await m5.waitFor(`document.querySelector('.sheet').innerText.includes('Huỷ Trần Thị Bình khỏi danh sách? (dùng khi nhập nhầm)')`, "hỏi huỷ");
    await shotView(m5, "m5-huy-nguoi-390.png");
    await m5.ev(click('.sheet [data-action="xac-nhan-huy"]'));
    await m5.waitFor(`document.querySelectorAll('.sheet .hk-the').length === 2`, "đã huỷ khỏi bảng");
    await m5.ev(click('.sheet [data-action="them-khach"]'));
    await m5.waitFor(`document.querySelectorAll('.sheet .hk-the').length === 3`, "thêm dòng");
    await m5.ev(`(() => { const r = document.querySelectorAll('.sheet .hk-the')[2]; for (const [s, v] of [['[data-o$=":ten"]', 'Lê Thị Hồng'], ['[data-o$=":nam"]', '1952']]) { const el = r.querySelector(s); el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); } return true; })()`);
    assert.ok(await m5.ev(`document.querySelector('.sheet').scrollWidth <= document.querySelector('.sheet').clientWidth + 1`), "bảng không tràn ngang");
    await sleep(600);
    await axe(m5, "bảng Sửa danh sách 390");
    await m5.ev(click('.sheet [data-action="luu-hanh-khach"]'));
    await m5.waitFor(`!document.querySelector('.sheet[role=dialog]')`, "đóng bảng", 15000);
    const post = apiCalls(m5).filter((c) => c.method === "POST" && c.path.endsWith("/passengers")).at(-1);
    const than = JSON.parse(post.body);
    assert.equal(than.them.length, 1);
    assert.equal(than.huy.length, 1);
    const p = (await fetchTrang(m5, "GET", `/api/orders/${o2.id}/passengers`)).json;
    assert.deepEqual(p.passengers.map((x) => x.fullName).sort(), ["Lê Thị Hồng", "Nguyễn Minh Khôi", "Nguyễn Văn An"]);
  });
  m5.close();

  await b.step("9b", `M6 (390): dịch vụ 'Một chiều' (mẫu TTB06) → chỉ tạo sẵn chiều đi, câu 'Đã tạo sẵn chiều đi theo dịch vụ — sửa hoặc bỏ nếu khác.'; thanh lưu dính đáy; không tràn ngang${axeNote()}`, async () => {
    const rm = await call(ACCOUNTS.admin, "POST", "/api/van-chuyen/mau-chang/TTB06", { mode: "ONE_WAY", returnTimeHint: null, noiTraMacDinhId: GA });
    assert.ok(rm.status === 200 || rm.status === 201, rm.text);
    const p = await env.as(ACCOUNTS.salesA, "/order-form", MOB);
    await p.waitFor(`!!document.getElementById('catalog-q')`, "ô tìm danh mục");
    await p.ev(typeInto("#orderDate", NGAY));
    await p.ev("document.getElementById('catalog-q').focus(); true");
    await p.ev(typeInto("#catalog-q", "TTB06"));
    await p.waitFor("document.querySelectorAll('#catalog-list .catalog-pick').length === 1", "TTB06 trong danh mục");
    await p.ev("document.querySelector('#catalog-list .catalog-pick').click(); true");
    await p.waitFor(`document.querySelectorAll('${card} .dd-chang').length === 1`, "một chặng tạo sẵn");
    assert.equal(await p.ev(txt(`${card} .dd .dd-ghi-tao`)), "Đã tạo sẵn chiều đi theo dịch vụ — sửa hoặc bỏ nếu khác.");
    assert.equal(await p.ev(`document.querySelector('${chang("OUT")} [data-o$=":tra"]').value`), NHAN[GA]);
    assert.ok(await p.ev(noOverflowX), "form 390 không tràn ngang");
    assert.equal(await p.ev(`getComputedStyle(document.querySelector('.form-actions')).position`), "sticky", "thanh lưu dính đáy");
    await axe(p, "form M6 390");
    await shotFull(p, "m6-form-mot-chieu-390.png");
    p.close();
  });

  await b.step("10", "Form 390 (Bán hàng, sửa nháp): mở lại đơn nháp còn đủ chặng + 4 hành khách (dạng thẻ); thanh lưu dính đáy; không tràn ngang", async () => {
    const p = await env.as(ACCOUNTS.salesA, `/order-form?id=${donId}`, MOB);
    await p.waitFor(`document.querySelectorAll('${card} .dd-chang').length === 2 && document.querySelectorAll('#hk-card .hk-the').length === 4`, "nháp mở lại đủ");
    assert.equal(await p.ev(`document.querySelector('${chang("OUT")} [data-o$=":bay"]').value`), "VN1553");
    assert.ok(await p.ev(noOverflowX), "form 390 không tràn ngang");
    await shotFull(p, "m1-m2-form-sua-nhap-390.png");
    p.close();
  });

  // ---- Kế toán: xem đủ, không nút sửa ----------------------------------------------------------------------------------------------------------------------------
  await b.step("11", "M3 (390, Kế toán): thấy hai khối, KHÔNG nút 'Sửa đưa đón' / 'Sửa danh sách', câu khoá không hứa sửa", async () => {
    const p = await env.as(ACCOUNTS.accounting, `/order?id=${o2.id}`, MOB);
    await p.waitFor(shown('[data-khoi="dua-don"]'), "khối Đưa đón");
    assert.equal(await p.ev(`!!document.querySelector('[data-action="sua-dua-don"], [data-action="sua-danh-sach"]')`), false);
    assert.equal(await p.ev(txt(".lock-note")), "Đơn đã xác nhận: dịch vụ và đơn giá đã khoá. Còn sửa được số khách (nút “Sửa số khách dịch vụ”)."); // Kế toán: chỉ nút sửa số khách (ADR-0063 D1)
    assert.ok(await p.ev(shown('[data-khoi="hanh-khach"]')));
    await shotFull(p, "m3-ke-toan-390.png");
    p.close();
  });

  // ---- Đối tác (mở SAU CÙNG): Số người chiều về chỉ xem; gửi khoá này → 403 (tiêu chí 7) ---------------------------------------------------------------------------
  await b.step("12", `Tiêu chí 7 (390, Đối tác): form có chiều về → 'Số người chiều về' chỉ xem ('Cả đoàn' + 'Văn phòng điều chỉnh số người về'); khối Hành khách nhập được; API gửi paxOverride khác → 403; đơn đã xác nhận: có 'Sửa danh sách', KHÔNG 'Sửa đưa đón', câu khoá D5${axeNote()}`, async () => {
    const od = await donApi(goiApi(DOI_TAC), "Khách Đối Tác", 2, [leg({ dropoffLocationId: GA }), leg({ direction: "RETURN", pickupTime: "16:30", pickupLocationId: GA, dropoffLocationId: KS })]);
    const p = await env.as(DOI_TAC, `/order-form?id=${od.id}`, MOB);
    await p.waitFor(`document.querySelectorAll('${card} .dd-chang').length === 2`, "hai chặng của đơn mở lại");
    await p.ev(moHetKhoiGap); // đơn đủ thông tin: chặng gập một dòng (14/10) — mở ra để thấy ô chỉ xem
    await p.waitFor(shown(`${chang("RETURN")} .dd-xem`), "ô chỉ xem");
    assert.equal(await p.ev(txt(`${chang("RETURN")} .dd-xem`)), "Số người chiều về Cả đoàn Văn phòng điều chỉnh số người về");
    assert.equal(await p.ev(`!!document.querySelector('${chang("RETURN")} [data-o$=":so-ve"]')`), false);
    await p.waitFor(shown("#hk-card"), "Đối tác nhập được hành khách");
    assert.ok(await p.ev(noOverflowX));
    await axe(p, "form Đối tác 390");
    await shotFull(p, "tc7-doi-tac-form-390.png");
    // Lưu bằng form (không gửi paxOverride) → 200.
    await p.ev(click("#save"));
    await p.waitFor("location.pathname === '/order'", "lưu được", 15000);
    const put = apiCalls(p).filter((c) => c.method === "PUT" && c.path === `/api/orders/${od.id}`).at(-1);
    assert.ok(JSON.parse(put.body).services[0].legs.every((l) => !("paxOverride" in l)), "Đối tác không gửi khoá paxOverride");
    const cur = (await fetchTrang(p, "GET", `/api/orders/${od.id}`)).json.order;
    const legs = cur.services[0].legs.map((l) => ({ id: l.id, direction: l.direction, pickupDate: l.pickupDate, pickupTime: l.pickupTime ?? "", pickupLocationId: l.pickupLocationId, pickupPlace: "", dropoffLocationId: l.dropoffLocationId, dropoffPlace: "", ...(l.direction === "RETURN" ? { paxOverride: 1 } : {}) }));
    const r403 = await fetchTrang(p, "PUT", `/api/orders/${od.id}`, { ...base, customerName: "Khách Đối Tác", customerPhone: "0903 111 222", services: [{ ...svc(2, legs), id: cur.services[0].id }], expectedUpdatedAt: cur.updatedAt });
    assert.equal(r403.status, 403, r403.text);
    // Đơn đã xác nhận: Đối tác thấy 'Sửa danh sách' (order.passenger.write own) nhưng KHÔNG 'Sửa đưa đón' (order.trip.edit none); câu khoá D5.
    const cur2 = (await fetchTrang(p, "GET", `/api/orders/${od.id}`)).json.order;
    const xn = await fetchTrang(p, "POST", `/api/orders/${od.id}/status`, { status: "confirmed" });
    assert.equal(xn.status, 200, xn.text);
    void cur2;
    await p.send("Page.navigate", { url: `${env.base}/order?id=${od.id}` });
    await p.waitFor(shown('[data-khoi="hanh-khach"]'), "khối Hành khách");
    assert.equal(await p.ev(`!!document.querySelector('[data-action="sua-danh-sach"]')`), true, "Đối tác có Sửa danh sách");
    assert.equal(await p.ev(`!!document.querySelector('[data-action="sua-dua-don"]')`), false, "Đối tác không có Sửa đưa đón");
    assert.equal(await p.ev(txt(".lock-note")), "Đơn đã xác nhận: dịch vụ và đơn giá đã khoá. Còn sửa được danh sách hành khách.");
    assert.ok(await p.ev(noOverflowX));
    await shotFull(p, "tc7-doi-tac-don-xac-nhan-390.png");
    p.close();
  });
} finally {
  b.xong();
  await env.stop();
}
