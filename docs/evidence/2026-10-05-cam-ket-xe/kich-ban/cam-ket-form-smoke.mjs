// Đợt 7 Task 8b (ADR-0056 VK3-A, bản vẽ 2/10): hai ô "Xe riêng" / "Xe tối thiểu" ở khối Đưa đón, nhãn "XE RIÊNG" / "≥ N chỗ" ở trang đơn và bảng điều phối.
// Dựng trên dp-lib.mjs (D1 tạm + wrangler dev + Chrome headless qua CDP; không cần mạng ngoài). Mọi tên, SĐT ở đây là GIẢ.
// Chạy từ GỐC repo, sau `npm run build:web`:
//   AXE_JS=<…/axe.min.js> CHROME_BIN=docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh OUT=docs/evidence/2026-10-05-cam-ket-xe node docs/evidence/2026-10-05-cam-ket-xe/kich-ban/cam-ket-form-smoke.mjs
// Kho cookie Chrome dùng CHUNG: Bán hàng → Đối tác → Kế toán (trang mở sau cùng là của tài khoản cuối).
import {
  ACCOUNTS, CHU, DESK, MOB, apiCalls, assert, axe, axeNote, boDem, click, dungDuLieuDieuPhoi, dungMoiTruong, fetchTrang, noCode, noOverflowX, shotFull, shotView, shown, sleep, txt, typeInto,
} from "../../2026-09-29-adr-0049/kich-ban/dp-lib.mjs";
import { chonNoiJs } from "../../2026-10-18-tao-don-thiet-ke-lai/kich-ban/cham-that.mjs";

const DOI_TAC = { name: "Đối Tác Cam Kết", phone: "0900000462", pin: "246462", permissions: ["PARTNER"] };
const { env, call } = await dungMoiTruong([CHU, DOI_TAC]);
const b = boDem("CAM KET FORM SMOKE");
const d = await dungDuLieuDieuPhoi(env, call);
const NGAY = d.NGAY_XA;
const T = "'2026-10-01T00:00:00.000Z'";
const SB = "11111111-aaaa-4aaa-8aaa-000000000002";
env.sql(`INSERT INTO loc_location (id, code, name, location_type_code, sort_order, created_at, updated_at) VALUES ('${SB}', 'SB_CAM_RANH', 'Sân bay Cam Ranh', 'AIRPORT', 21, ${T}, ${T});`);
const KS = env.sql("SELECT id FROM loc_location WHERE location_type_code = 'HOTEL' LIMIT 1")[0]?.id ?? null;
let r = await call(ACCOUNTS.admin, "POST", "/api/van-chuyen/mau-chang/TD101", { mode: "ROUND_TRIP", returnTimeHint: "16:30", noiTraMacDinhId: null });
assert.ok(r.status === 200 || r.status === 201, r.text);

const card = "#services .svc";
const chang = (chieu) => `${card} .dd-chang[data-chieu="${chieu}"]`;
const O = (c) => `${chang(c)} [data-o$=":cho"]`;
const X = (c) => `${chang(c)} [data-o$=":xe-rieng"]`;
const nhanO = (c) => `[...document.querySelectorAll('${chang(c)} .dd-luoi-phu > *')].map((x) => (x.querySelector('.dd-nhan, label') ? x.innerText : x.innerText).split('\\n')[0].trim())`;

const moForm = async (account, kho) => {
  const f = await env.as(account, "/order-form", kho);
  await f.waitFor(`!!document.getElementById('catalog-q')`, "ô tìm danh mục");
  await f.ev(typeInto("#orderDate", NGAY));
  await f.ev("document.getElementById('catalog-q').focus(); true");
  await f.ev(typeInto("#catalog-q", "TD101"));
  await f.waitFor("document.querySelectorAll('#catalog-list .catalog-pick').length === 1", "TD101 trong danh mục");
  await f.ev("document.querySelector('#catalog-list .catalog-pick').click(); true");
  await f.waitFor(`document.querySelectorAll('${card} .dd-chang').length === 2`, "hai chặng tạo sẵn");
  // 14/10 (bốn bước): hai ô cam kết nằm trong khối gập "Thêm chi tiết" của chặng, mặc định gập khi còn mặc định → mở trước khi kiểm.
  await f.ev(`document.querySelectorAll('${card} button[data-gap^="chi-tiet-"][aria-expanded="false"]').forEach((n) => n.click()); true`);
  await f.waitFor(`document.querySelectorAll('${card} [data-gap-than^="chi-tiet-"]:not([hidden])').length === 2`, "hai khối chi tiết mở");
  return f;
};
const dienKhach = async (f) => {
  await f.ev(typeInto("#customerName", "Khách Cam Kết Form"));
  await f.ev(typeInto("#customerPhone", "0903 444 555"));
  // 18/10 (Tạo đơn thiết kế lại, việc 7): nơi đón / nơi trả của FORM là MỘT ô có gợi ý — bấm ô, gõ, bấm dòng (thay đặt giá trị ô chọn của máy).
  assert.equal(await f.ev(chonNoiJs(`document.querySelector('${chang("OUT")} [data-o$=":don"]')`, "tran phu", "Văn phòng Trần Phú")), true, "chọn nơi đón chiều đi");
  assert.equal(await f.ev(chonNoiJs(`document.querySelector('${chang("OUT")} [data-o$=":tra"]')`, "cam ranh", "Sân bay Cam Ranh")), true, "chọn nơi trả chiều đi"); // chiều về đón ở nơi trả chiều đi → có nơi đón
};
const hauTo = (c) => `((el) => !!el && el.getClientRects().length > 0)(document.querySelector('${chang(c)} .dd-hau-to'))`;
const hintCho = (c) => `((el) => !!el && el.getClientRects().length > 0)([...document.querySelectorAll('${chang(c)} .dd-luoi-phu .hint')].find((x) => x.textContent.startsWith('Không kể tài xế')))`;

try {
  for (const [id, kho, ten] of [["1", DESK, "1040"], ["2", MOB, "390"]]) {
    const f = await moForm(ACCOUNTS.salesA, kho);
    await b.step(id, `${ten} form đơn: chiều đi chỉ có hai ô cam kết (không sân bay); chiều về có "Số người chiều về" rồi hai ô; sân bay → "Số hiệu chuyến bay" rồi hai ô; mặc định Tắt / trống${axeNote()}`, async () => {
      assert.deepEqual(await f.ev(nhanO("OUT")), ["Xe riêng", "Xe tối thiểu"]);
      assert.deepEqual((await f.ev(nhanO("RETURN"))).map((x) => x.replace(/\s+/g, " ").slice(0, 8)), ["Số người", "Xe riêng", "Xe tối t"]);
      assert.equal(await f.ev(chonNoiJs(`document.querySelector('${chang("OUT")} [data-o$=":tra"]')`, "cam ranh", "Sân bay Cam Ranh")), true, "chọn sân bay ở ô Nơi trả (việc 7: một ô có gợi ý)");
      await f.waitFor(`!!document.querySelector('${chang("OUT")} [data-o$=":bay"]')`, "ô số hiệu chuyến bay");
      assert.deepEqual(await f.ev(nhanO("OUT")), ["Số hiệu chuyến bay", "Xe riêng", "Xe tối thiểu"]);
      assert.equal(await f.ev(chonNoiJs(`document.querySelector('${chang("OUT")} [data-o$=":tra"]')`, "", "Chưa chốt")), true, "Nơi trả về 'Chưa chốt'");
      assert.equal(await f.ev(`document.querySelector('${X("OUT")}').getAttribute('aria-checked')`), "false");
      assert.equal(await f.ev(txt(`${chang("OUT")} .dd-switch-chu`)), "Tắt");
      assert.equal(await f.ev(`document.querySelector('${O("OUT")}').value`), "");
      assert.equal(await f.ev(`document.querySelector('${O("OUT")}').placeholder`), "Để trống = không yêu cầu");
      assert.equal(await f.ev(`parseFloat(getComputedStyle(document.querySelector('${O("OUT")}')).fontSize) >= 16`), true, "ô gõ 16px");
      assert.equal(await f.ev(hauTo("OUT")), false, "trống: không hậu tố");
      assert.ok(await f.ev(hintCho("OUT")));
      await shotFull(f, `cam-ket-form-de-trong-${ten}.png`);
    });
    await b.step(`${id}b`, `${ten} Bật + 15 → hậu tố "chỗ"; gõ chữ bị lọc; 0 và 120 → "Số chỗ từ 1 đến 100", ẩn gợi ý, aria-invalid; Lưu bị chặn không gửi; xoá trống → hết lỗi${axeNote()}`, async () => {
      await f.ev(click(X("OUT")));
      assert.equal(await f.ev(`document.querySelector('${X("OUT")}').getAttribute('aria-checked')`), "true");
      assert.equal(await f.ev(txt(`${chang("OUT")} .dd-switch-chu`)), "Bật");
      await f.ev(typeInto(O("OUT"), "1a5"));
      assert.equal(await f.ev(`document.querySelector('${O("OUT")}').value`), "15");
      assert.ok(await f.ev(hauTo("OUT")));
      await shotFull(f, `cam-ket-form-bat-15-${ten}.png`);
      await dienKhach(f);
      for (const xau of ["0", "120"]) {
        await f.ev(typeInto(O("OUT"), xau));
        await f.waitFor(`document.querySelector('${chang("OUT")}').innerText.includes('Số chỗ từ 1 đến 100')`, `lỗi ${xau}`);
        assert.equal(await f.ev(`document.querySelector('${O("OUT")}').getAttribute('aria-invalid')`), "true");
        assert.equal(await f.ev(hintCho("OUT")), false, "có lỗi: ẩn gợi ý");
        const truoc = apiCalls(f).filter((c) => c.method === "POST" && c.path === "/api/orders").length;
        await f.ev(click("#save"));
        await sleep(500);
        assert.equal(apiCalls(f).filter((c) => c.method === "POST" && c.path === "/api/orders").length, truoc, "không gửi khi còn lỗi");
        if (xau === "120") await shotFull(f, `cam-ket-form-loi-120-${ten}.png`);
      }
      await f.ev(typeInto(O("OUT"), ""));
      await f.waitFor(`!document.querySelector('${chang("OUT")}').innerText.includes('Số chỗ từ 1 đến 100')`, "hết lỗi");
      assert.ok(await f.ev(hintCho("OUT")));
      await f.ev(typeInto(O("OUT"), "15"));
      assert.ok(await f.ev(noOverflowX), `${ten}: không tràn ngang`);
      assert.equal(await f.ev(noCode), "");
      await axe(f, `form cam kết ${ten}`);
    });
    await b.step(`${id}c`, `${ten} Lưu nháp: POST có chặng đi exclusiveVehicle=true/minVehicleSeats=15, chặng về false/null ("Để trống" gửi null); trang đơn nhãn XE RIÊNG rồi ≥ 15 chỗ`, async () => {
      await f.ev(click("#save"));
      await f.waitFor("location.pathname === '/order'", "sang trang đơn", 15000);
      const than = JSON.parse(apiCalls(f).filter((c) => c.method === "POST" && c.path === "/api/orders").at(-1).body);
      const legs = than.services[0].legs;
      const di = legs.find((l) => l.direction === "OUT");
      const ve = legs.find((l) => l.direction === "RETURN");
      assert.deepEqual([di.exclusiveVehicle, di.minVehicleSeats, ve.exclusiveVehicle, ve.minVehicleSeats], [true, 15, false, null]);
      await f.waitFor(`!!document.querySelector('[data-khoi="dua-don"] .dd-dong')`, "khối Đưa đón");
      const chu = await f.ev(`[...document.querySelectorAll('[data-khoi="dua-don"] .dd-dong')].map((x) => [...x.querySelectorAll('.dd-dong-dau .chip')].map((c) => c.textContent))`);
      assert.deepEqual(chu.find((x) => x[0] === "Chiều đi"), ["Chiều đi", "XE RIÊNG", "≥ 15 chỗ"], JSON.stringify(chu));
      assert.deepEqual(chu.find((x) => x[0] === "Chiều về"), ["Chiều về"], "chiều về không cam kết → không nhãn");
      await shotFull(f, `cam-ket-trang-don-${ten}.png`);
    });
    f.close();
  }

  // Thứ tự nhãn ở trang đơn khi có ✈︎ (đơn xác nhận, Quản trị mở): [XE RIÊNG][≥ N chỗ][✈︎].
  env.sql(`UPDATE ord_transfer_leg SET exclusive_vehicle = 1, min_vehicle_seats = 15, flight_code = 'VN1553' WHERE id = '${d.O5.legId}'`);
  const pd = await env.as(ACCOUNTS.admin, `/order?id=${d.O5.id}`, DESK);
  await b.step("3", `1040 trang đơn (Quản trị) có ✈︎: thứ tự [Chiều đi][XE RIÊNG][≥ 15 chỗ][✈︎ VN1553]${axeNote()}`, async () => {
    await pd.waitFor(`!!document.querySelector('[data-khoi="dua-don"] .dd-dong')`, "khối Đưa đón");
    const chu = await pd.ev(`[...[...document.querySelectorAll('[data-khoi="dua-don"] .dd-dong')][0].querySelectorAll('.dd-dong-dau .chip')].map((c) => c.textContent)`);
    assert.deepEqual(chu, ["Chiều đi", "XE RIÊNG", "≥ 15 chỗ", "✈︎ VN1553"]);
    await axe(pd, "trang đơn nhãn cam kết");
    await shotFull(pd, "cam-ket-trang-don-co-bay-1040.png");
  });
  pd.close();

  // Bảng điều phối: [✈︎][XE RIÊNG][≥ N chỗ] — SAU ✈︎. Bán hàng (xếp được), 1040 + 390; Kế toán (chỉ xem) cũng hiện.
  const chipDp = `[...document.querySelectorAll('#dp-cot-chua-xep [data-leg="${d.O5.legId}"] .dp-leg-top .chip')].map((c) => c.textContent)`;
  for (const [id, kho, ten, tk] of [["4", DESK, "1040", ACCOUNTS.salesA], ["5", MOB, "390", ACCOUNTS.salesA], ["6", DESK, "1040", ACCOUNTS.accounting]]) {
    const p = await env.as(tk, `/dieu-phoi?ngay=${NGAY}`, kho);
    await b.step(id, `${ten} bảng điều phối (${tk === ACCOUNTS.accounting ? "Kế toán, chỉ xem" : "Bán hàng"}): thẻ chặng chờ xếp có [✈︎ VN1553][XE RIÊNG][≥ 15 chỗ]; không tràn ngang${axeNote()}`, async () => {
      await p.waitFor(`!document.getElementById('dp-trang').hidden && !!document.querySelector('#dp-cot-chua-xep [data-leg="${d.O5.legId}"]')`, "thẻ chặng");
      const chu = await p.ev(chipDp);
      assert.deepEqual(chu.slice(-3), ["✈︎ VN1553", "XE RIÊNG", "≥ 15 chỗ"], JSON.stringify(chu));
      if (tk !== ACCOUNTS.accounting) assert.match(await p.ev(`document.querySelector('#dp-cot-chua-xep button.dp-leg[data-leg="${d.O5.legId}"]').getAttribute('aria-label')`), /xe riêng, tối thiểu 15 chỗ/);
      assert.ok(await p.ev(noOverflowX));
      assert.equal(await p.ev(noCode), "");
      await shotView(p, `cam-ket-dieu-phoi-${ten}${tk === ACCOUNTS.accounting ? "-ke-toan" : ""}.png`);
    });
    p.close();
  }

  // Đối tác lập nháp bật xe riêng.
  const dt = await moForm(DOI_TAC, DESK);
  await b.step("7", `1040 Đối tác lập nháp: bật Xe riêng + số chỗ 7 (ô sửa được, không ổ khoá) → POST có exclusiveVehicle=true, minVehicleSeats=7; đơn lưu đúng${axeNote()}`, async () => {
    assert.equal(await dt.ev(`!!document.querySelector('${chang("OUT")} .dd-luoi-phu .dd-xem-khoa')`), false, "không dùng khuôn ổ khoá cho hai ô");
    await dt.ev(click(X("OUT")));
    await dt.ev(typeInto(O("OUT"), "7"));
    await dienKhach(dt);
    await dt.ev(click("#save"));
    await dt.waitFor("location.pathname === '/order'", "sang trang đơn", 15000);
    const than = JSON.parse(apiCalls(dt).filter((c) => c.method === "POST" && c.path === "/api/orders").at(-1).body);
    const di = than.services[0].legs.find((l) => l.direction === "OUT");
    assert.deepEqual([di.exclusiveVehicle, di.minVehicleSeats], [true, 7]);
    const id = new URL(await dt.ev("location.href")).searchParams.get("id");
    const o = (await call(DOI_TAC, "GET", `/api/orders/${id}`)).json.order;
    const l = o.services[0].legs.find((x) => x.direction === "OUT");
    assert.deepEqual([l.exclusiveVehicle, l.minVehicleSeats], [true, 7]);
    await shotFull(dt, "cam-ket-doi-tac-trang-don-1040.png");
  });
  dt.close();

  // "Sửa đưa đón" chỉ đổi cam kết ở chặng DƯỚI MỐC (O4: NGAY_KHOA 10:00, mốc 48 giờ của dữ liệu thử) → KHÔNG bật khung đặt gấp; đối chứng: đổi giờ thì có.
  const m = await env.as(ACCOUNTS.salesA, `/order?id=${d.O4.id}`, DESK);
  await b.step("8", `1040 "Sửa đưa đón" đơn ${d.O4.ma} dưới mốc: chỉ bật Xe riêng + 9 chỗ → PUT 200, KHÔNG khung đặt gấp; đối chứng đổi giờ đón → bị mốc chặn${axeNote()}`, async () => {
    await m.waitFor(shown('[data-action="sua-dua-don"]'), "nút Sửa đưa đón");
    await m.ev(click('[data-action="sua-dua-don"]'));
    await m.waitFor(shown(".sheet[role=dialog] .dd-chang"), "bảng Sửa đưa đón");
    await sleep(600);
    await m.ev(click(`.sheet .dd-chang [data-o$=":xe-rieng"]`));
    await m.ev(typeInto(`.sheet .dd-chang [data-o$=":cho"]`, "9"));
    await axe(m, "bảng Sửa đưa đón có hai ô cam kết");
    await shotView(m, "cam-ket-sua-dua-don-1040.png");
    await m.ev(click('.sheet [data-action="luu-dua-don"]'));
    await m.waitFor(`!document.querySelector('.sheet[role=dialog]')`, "bảng đóng sau khi lưu", 15000);
    const put = apiCalls(m).filter((c) => c.method === "PUT" && /\/legs\/[^/]+$/.test(c.path)).at(-1);
    const than = JSON.parse(put.body);
    assert.equal(than.datGap, undefined, "không gửi dấu đặt gấp");
    assert.deepEqual([than.leg.exclusiveVehicle, than.leg.minVehicleSeats], [true, 9]);
    const g = await fetchTrang(m, "GET", `/api/orders/${d.O4.id}`); // qua phiên của trình duyệt (sổ phiên một máy, ADR-0075: đăng nhập mới làm phiên API cũ hết hạn)
    assert.equal(g.status, 200, g.text);
    const l = g.json.order.services[0].legs[0];
    assert.deepEqual([l.exclusiveVehicle, l.minVehicleSeats, l.datGap], [true, 9, null]);
    assert.equal(await m.ev(`!!document.querySelector('.dg-sheet-slot:not([hidden])')`), false);
    // Đối chứng: đổi giờ đón dưới mốc → máy chủ đòi đặt gấp.
    await m.waitFor(shown('[data-action="sua-dua-don"]'), "nút Sửa đưa đón");
    await sleep(800);
    await m.ev(click('[data-action="sua-dua-don"]'));
    await m.waitFor(shown(".sheet[role=dialog] .dd-chang"), "bảng Sửa đưa đón lần 2");
    await sleep(600);
    await m.ev(typeInto(`.sheet .dd-chang [data-o$=":gio"]`, "10:30"));
    await m.ev(click('.sheet [data-action="luu-dua-don"]'));
    await m.waitFor(`!!document.querySelector('.sheet .dg-sheet-slot:not([hidden])') || document.querySelector('.sheet .banner:not([hidden])')?.innerText.length > 0`, "dải lỗi mốc hoặc khung đặt gấp", 15000);
    // Bán hàng không có ô duyệt đặt gấp → máy chủ từ chối bằng dải lỗi mốc (không có khung); đối chứng này chứng tỏ mốc VẪN chặn đổi giờ, nên bước trên đúng là "không xét mốc" cho hai ô cam kết.
    const dai = await m.ev(txt(".sheet .banner:not([hidden])"));
    console.log("    đối chứng đổi giờ → dải:", dai);
    assert.ok(dai && dai.length > 0, "đổi giờ dưới mốc phải bị chặn");
    const put2 = apiCalls(m).filter((c) => c.method === "PUT" && /\/legs\/[^/]+$/.test(c.path)).at(-1);
    assert.notEqual(put2.body, put.body, "lần 2 là lệnh đổi giờ");
    await shotView(m, "cam-ket-sua-dua-don-doi-gio-dat-gap-1040.png");
  });
  m.close();
} finally {
  await env.stop?.();
  b.xong();
}
