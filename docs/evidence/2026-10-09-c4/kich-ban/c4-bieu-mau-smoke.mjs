// Việc 11 — C4 "biểu mẫu" (đánh giá ERP 7/10, C10 + C12; bảng việc docs/superpowers/plans/2026-10-08-van-chuyen-goi-a-c-danh-sach-viec.md):
//   (a) C10 ô tìm điểm ở ô chọn Nơi đón / Nơi trả của khối Đưa đón (form đơn + bảng "Sửa đưa đón"): gõ không dấu vẫn ra, giữ điểm đang chọn, Enter không gửi form,
//       câu "Không thấy điểm nào …" khi không khớp, ô 16px; ô tìm trống → đúng danh sách cũ.
//   (b) C12 cảnh báo dưới nút "Xác nhận đơn" khi có chặng Xe riêng mà đơn chưa có dịch vụ Giá theo nhóm — chỉ cảnh báo, xác nhận vẫn thành công.
// Dựng trên dp-lib.mjs (D1 tạm + wrangler dev + Chrome headless qua CDP; không cần mạng ngoài). Mọi tên, SĐT ở đây là GIẢ.
// Chạy từ GỐC repo, sau `npm run build:web`:
//   AXE_JS=<…/axe.min.js> CHROME_BIN=docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh OUT=docs/evidence/2026-10-09-c4 node docs/evidence/2026-10-09-c4/kich-ban/c4-bieu-mau-smoke.mjs
// Kho cookie Chrome dùng CHUNG: chỉ một tài khoản (Bán hàng).
import {
  ACCOUNTS, CHU, DESK, MOB, apiCalls, assert, axe, axeNote, boDem, click, dungMoiTruong, fetchTrang, noCode, noOverflowX, shotFull, shotView, shown, txt, typeInto, vnDate,
} from "../../2026-09-29-adr-0049/kich-ban/dp-lib.mjs";

const { env } = await dungMoiTruong([CHU]);
const b = boDem("C4 BIEU MAU SMOKE");
const NGAY = vnDate(5); // ngoài mốc 6 giờ — không dính đặt gấp
const T = "'2026-10-01T00:00:00.000Z'";
const HAVANA = "22222222-aaaa-4aaa-8aaa-000000000001";
const MUONG = "22222222-aaaa-4aaa-8aaa-000000000002";
const SB = "22222222-aaaa-4aaa-8aaa-000000000003";
env.sql(`INSERT INTO loc_location (id, code, name, location_type_code, sort_order, created_at, updated_at) VALUES
  ('${HAVANA}', 'KS_HAVANA', 'Khách sạn Havana Nha Trang', 'HOTEL', 20, ${T}, ${T}),
  ('${MUONG}', 'KS_MUONG_THANH', 'Khách sạn Mường Thanh Luxury Nha Trang', 'HOTEL', 21, ${T}, ${T}),
  ('${SB}', 'SB_CAM_RANH', 'Sân bay Cam Ranh', 'AIRPORT', 22, ${T}, ${T});`);
const CAU_XR = "Có lượt đưa đón Xe riêng nhưng đơn chưa có dịch vụ Giá theo nhóm — kiểm lại tiền xe";
const card = "#services .svc";
const chang = `${card} .dd-chang[data-chieu="OUT"]`;
const DON = `${chang} [data-o$=":don"]`;
const TIM = `${chang} [data-o$=":don-tim"]`;
const opts = (sel) => `[...document.querySelector('${sel}').options].map((o) => o.textContent)`;
const base = { customerEmail: "", customerNote: "", discount: 0, paymentNote: "", customerPhone: "0903 111 444" };
const NO_TRIP = { departDate: NGAY, departTime: "", checkinDate: "", checkinTime: "", checkinPlace: "", note: "" };
const leg = (o) => ({ direction: "OUT", pickupDate: NGAY, pickupTime: "07:30", pickupLocationId: HAVANA, pickupPlace: "", dropoffLocationId: SB, dropoffPlace: "", exclusiveVehicle: true, minVehicleSeats: null, ...o });
const td101 = (legs) => ({ kind: "catalog", catalogCode: "TD101", pax: { adult: 2, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: 1350000 }, unitPrices: { adult: 1350000 }, ...NO_TRIP, legs, pickupChoice: legs?.length ? "DON" : "KHONG_DON" });
const ttb03 = { kind: "catalog", pickupChoice: "KHONG_DON", catalogCode: "TTB03", pax: { adult: 2, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: 1500000 }, unitPrices: { adult: 1500000 }, ...NO_TRIP, legs: [] };

/** Mở form, chọn TD101, thêm một chặng đưa đón. */
const moForm = async (kho) => {
  const f = await env.as(ACCOUNTS.salesA, "/order-form", kho);
  await f.waitFor(`!!document.getElementById('catalog-q')`, "ô tìm danh mục");
  await f.ev(typeInto("#orderDate", NGAY));
  await f.ev("document.getElementById('catalog-q').focus(); true");
  await f.ev(typeInto("#catalog-q", "TD101"));
  await f.waitFor("document.querySelectorAll('#catalog-list .catalog-pick').length === 1", "TD101 trong danh mục");
  await f.ev("document.querySelector('#catalog-list .catalog-pick').click(); true");
  if (!(await f.ev(`!!document.querySelector('${chang}')`))) {
    await f.ev(click(`${card} [data-action="them-dua-don"]`));
    await f.waitFor(`!!document.querySelector('${chang}')`, "chặng đi");
  }
  return f;
};
/** Gõ vào ô tìm ĐÚNG như người dùng: chỉ sự kiện input (ô tìm không bắn change). */
const goTim = (sel, v) => `(() => { const el = document.querySelector('${sel}'); el.value = ${JSON.stringify(v)}; el.dispatchEvent(new Event('input', { bubbles: true })); return true; })()`;

try {
  await b.step("1", `C10 (1040, form đơn): ô tìm điểm trên ô Nơi đón — 16px, tên đọc được; ô trống = danh sách cũ; 'havana' / 'muong' (không dấu) thu hẹp, giữ dòng đầu + 'Gõ tự do…'; điểm đang chọn không mất; Enter không gửi form; không khớp → câu 'Không thấy điểm nào'${axeNote()}`, async () => {
    const f = await moForm(DESK);
    const tim = await f.ev(`(() => { const el = document.querySelector('${TIM}'); return el && { type: el.type, font: getComputedStyle(el).fontSize, ten: el.getAttribute('aria-label'), ph: el.placeholder, trong: el.value }; })()`);
    assert.deepEqual(tim, { type: "search", font: "16px", ten: "Tìm nơi đón", ph: "Tìm điểm…", trong: "" });
    assert.equal(await f.ev(`document.querySelector('${chang} [data-o$=":tra-tim"]').getAttribute('aria-label')`), "Tìm nơi trả");
    const goc = await f.ev(opts(DON));
    assert.equal(goc[0], "Chọn nơi đón…");
    assert.equal(goc.at(-1), "Gõ tự do…");
    assert.ok(goc.includes("Khách sạn Havana Nha Trang · khách sạn") && goc.includes("Văn phòng Trần Phú · văn phòng"), goc.join(" | "));
    await f.ev(goTim(TIM, "havana"));
    assert.deepEqual(await f.ev(opts(DON)), ["Chọn nơi đón…", "Khách sạn Havana Nha Trang · khách sạn", "Gõ tự do…"]);
    assert.equal(await f.ev(txt(`${chang} .dd-luoi-noi .dd-cot [role=status]:not([hidden])`)), "1 điểm khớp — chọn ở ô bên dưới");
    await shotFull(f, "c10-o-tim-diem-1040.png"); // lúc chưa chọn điểm: ô chọn "Chọn nơi đón…", danh sách đã thu hẹp còn Havana
    await f.ev(goTim(TIM, "muong thanh"));
    assert.deepEqual(await f.ev(opts(DON)), ["Chọn nơi đón…", "Khách sạn Mường Thanh Luxury Nha Trang · khách sạn", "Gõ tự do…"]);
    // Chọn trong danh sách đã lọc → khối dựng lại, ô tìm trống, giá trị đúng, danh sách đầy đủ trở lại.
    await f.ev(typeInto(DON, MUONG));
    await f.waitFor(`document.querySelector('${DON}').value === '${MUONG}' && document.querySelector('${TIM}').value === ''`, "đã chọn Mường Thanh, ô tìm trống");
    assert.deepEqual(await f.ev(opts(DON)), goc);
    // Gõ thứ không khớp: điểm đang chọn vẫn còn (ô chọn không rơi về trống), câu nhắc Gõ tự do.
    await f.ev(goTim(TIM, "xyz không có"));
    assert.deepEqual(await f.ev(opts(DON)), ["Chọn nơi đón…", "Khách sạn Mường Thanh Luxury Nha Trang · khách sạn", "Gõ tự do…"]);
    assert.equal(await f.ev(`document.querySelector('${DON}').value`), MUONG);
    assert.equal(await f.ev(txt(`${chang} .dd-luoi-noi .dd-cot [role=status]:not([hidden])`)), "Không thấy điểm nào — chọn “Gõ tự do…” để ghi địa chỉ");
    // Enter trong ô tìm KHÔNG gửi form đơn.
    const truoc = apiCalls(f).filter((c) => c.method === "POST" && c.path === "/api/orders").length;
    const chan = await f.ev(`(() => { const e = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }); document.querySelector('${TIM}').dispatchEvent(e); return e.defaultPrevented; })()`);
    assert.equal(chan, true, "Enter bị chặn ở ô tìm");
    assert.equal(apiCalls(f).filter((c) => c.method === "POST" && c.path === "/api/orders").length, truoc, "không gửi đơn");
    assert.equal(await f.ev(noCode), "");
    await axe(f, "form có ô tìm điểm");
    await shotFull(f, "c10-khong-thay-diem-1040.png");
    f.close();
  });

  await b.step("2", `C10 (390, form đơn): ô tìm điểm ở cả Nơi đón và Nơi trả, không tràn ngang; 'cam ranh' ở Nơi trả ra Sân bay${axeNote()}`, async () => {
    const f = await moForm(MOB);
    await f.ev(goTim(`${chang} [data-o$=":tra-tim"]`, "cam ranh"));
    assert.deepEqual(await f.ev(opts(`${chang} [data-o$=":tra"]`)), ["Chưa chốt", "Sân bay Cam Ranh · sân bay", "Gõ tự do…"]);
    assert.ok(await f.ev(noOverflowX), "390 không tràn ngang");
    const w = await f.ev(`(() => { const a = document.querySelector('${TIM}').getBoundingClientRect(); const s = document.querySelector('${DON}').getBoundingClientRect(); return { cung: Math.abs(a.width - s.width) < 2, tren: a.bottom <= s.top + 1 }; })()`);
    assert.deepEqual(w, { cung: true, tren: true }, "ô tìm cùng bề rộng, nằm ngay trên ô chọn");
    await axe(f, "form 390 có ô tìm điểm");
    await f.ev(`document.querySelector('${DON}').scrollIntoView({ block: 'center' }); true`);
    await shotView(f, "c10-o-tim-diem-390.png"); // ảnh khung nhìn: ảnh cả trang ở 390 vẽ thanh đầu / thanh lưu dính đè giữa ảnh
    f.close();
  });

  // Đơn nháp qua API (phiên trang — ADR-0075 một phiên mỗi tài khoản).
  const p = await env.as(ACCOUNTS.salesA, "/orders", DESK);
  const tao = async (ten, services) => {
    const r = await fetchTrang(p, "POST", "/api/orders", { ...base, customerName: ten, services });
    assert.equal(r.status, 201, r.text);
    return r.json.order;
  };
  const oXR = await tao("Khách Xe Riêng", [td101([leg()])]);
  const oNhom = await tao("Khách Xe Nhóm", [td101([leg()]), ttb03]);
  const oThuong = await tao("Khách Xe Ghép", [td101([leg({ exclusiveVehicle: false })])]);
  p.close();

  await b.step("3", `C12 (1040, trang đơn nháp): chặng Xe riêng + chỉ dịch vụ theo người → câu cảnh báo dưới nút Xác nhận đơn; đơn có thêm dịch vụ Giá theo nhóm (Phao chuối, theo nhóm 5) → không câu này; xe ghép → không${axeNote()}`, async () => {
    const q = await env.as(ACCOUNTS.salesA, `/order?id=${oNhom.id}`, DESK);
    await q.waitFor(`[...document.querySelectorAll('#actions button')].some((x) => x.textContent === 'Xác nhận đơn')`, "nút Xác nhận đơn (đơn có giá theo nhóm)");
    await q.waitFor(shown('[data-canh-bao="xac-nhan"]'), "câu thiếu tên (đối chứng: khu cảnh báo đã dựng)");
    assert.deepEqual(await q.ev(`[...document.querySelectorAll('[data-canh-bao="xac-nhan"]')].map((x) => x.innerText.trim())`), ["Còn 2 khách chưa có tên — cần đủ trước khi xe chạy"], "có dịch vụ giá theo nhóm → không câu xe riêng");
    q.close();
    const g = await env.as(ACCOUNTS.salesA, `/order?id=${oThuong.id}`, DESK);
    await g.waitFor(`[...document.querySelectorAll('#actions button')].some((x) => x.textContent === 'Xác nhận đơn')`, "nút Xác nhận đơn (xe ghép)");
    await g.waitFor(shown('[data-canh-bao="xac-nhan"]'), "câu thiếu tên (đối chứng)");
    assert.deepEqual(await g.ev(`[...document.querySelectorAll('[data-canh-bao="xac-nhan"]')].map((x) => x.innerText.trim())`), ["Còn 2 khách chưa có tên — cần đủ trước khi xe chạy"], "không xe riêng → không câu xe riêng");
    g.close();
    const m = await env.as(ACCOUNTS.salesA, `/order?id=${oXR.id}`, DESK);
    await m.waitFor(shown('[data-canh-bao="xac-nhan"]'), "câu cảnh báo dưới nút Xác nhận đơn");
    assert.deepEqual(await m.ev(`[...document.querySelectorAll('[data-canh-bao="xac-nhan"]')].map((x) => x.innerText.trim())`), ["Còn 2 khách chưa có tên — cần đủ trước khi xe chạy", CAU_XR]);
    assert.equal(await m.ev(noCode), "");
    await axe(m, "trang đơn có cảnh báo xe riêng");
    await m.ev(`document.getElementById('actions').scrollIntoView({ block: 'center' }); true`);
    await shotFull(m, "c12-canh-bao-xe-rieng-1040.png");
    m.close();
  });

  await b.step("4", `C12 (390, trang đơn nháp): câu cảnh báo hiện đủ, không tràn ngang; bấm Xác nhận đơn → câu hỏi có câu xe riêng, xác nhận VẪN thành công${axeNote()}`, async () => {
    const m = await env.as(ACCOUNTS.salesA, `/order?id=${oXR.id}`, MOB);
    await m.waitFor(shown('[data-canh-bao="xac-nhan"]'), "câu cảnh báo (390)");
    assert.ok((await m.ev(`[...document.querySelectorAll('[data-canh-bao="xac-nhan"]')].map((x) => x.innerText.trim())`)).includes(CAU_XR));
    assert.ok(await m.ev(noOverflowX), "390 không tràn ngang");
    await axe(m, "trang đơn 390 có cảnh báo xe riêng");
    await m.ev(`document.getElementById('actions').scrollIntoView({ block: 'center' }); true`);
    await shotFull(m, "c12-canh-bao-xe-rieng-390.png");
    await m.ev("window.__hoi = ''; window.confirm = (s) => { window.__hoi = s; return true; }; true");
    await m.ev(`[...document.querySelectorAll('#actions button')].find((x) => x.textContent === 'Xác nhận đơn').click(); true`);
    await m.waitFor(`document.getElementById('error').innerText.includes('Đã xác nhận đơn.')`, "dải sau xác nhận", 10000);
    assert.ok((await m.ev("window.__hoi")).includes(CAU_XR), "câu hỏi xác nhận có câu xe riêng");
    assert.equal((await fetchTrang(m, "GET", `/api/orders/${oXR.id}`)).json.order.status, "confirmed", "chỉ cảnh báo — vẫn xác nhận được");
    m.close();
  });
} finally {
  b.xong();
  await env.stop();
}
