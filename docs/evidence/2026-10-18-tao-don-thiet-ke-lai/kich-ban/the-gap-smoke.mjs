// Kịch bản Chrome — thẻ dịch vụ GẬP của màn Tạo đơn (thiết kế lại 18/10/2026, Task 5; đặc tả docs/superpowers/specs/2026-10-18-tao-don-thiet-ke-lai/DAC-TA.md mục 3C, tiêu chí 6).
// Kiểm ở hai khổ 390 và 1040 (tài khoản Bán hàng, D1 tạm, không cần mạng ngoài, KHÔNG chụp ảnh):
//   1) thêm 3 dịch vụ → chỉ thẻ vừa thêm mở; dòng gập: tên (không cắt) · số khách gọn · giờ và nơi đón · thành tiền; chip "Chưa chốt giờ đón" / "Chưa có nơi đón";
//   2) chạm (cảm ứng thật ở 390, chuột thật ở 1040) dòng gập của thẻ khác → thẻ đó mở, thẻ đang mở gập; chạm thẻ phía dưới thì đầu thẻ vừa chạm đứng yên (cuộn bù);
//   3) thẻ có lỗi "Tối đa 50 khách." luôn mở kể cả khi mở thẻ khác, bấm đầu thẻ cũng không gập; hết lỗi thì gập được;
//   4) bàn phím thật: Enter mở, Space gập; aria-expanded + aria-controls trỏ đúng thân thẻ;
//   5) thùng rác: chỉ ở thẻ mở, aria-label "Xoá dịch vụ <tên>", ≥ 44px, không còn chữ "Xoá" ở đầu thẻ; bấm thì bỏ thẻ;
//   6) chip cảnh báo trên dòng gập (ngày khởi hành đã qua); Lưu bị từ chối ở máy khách → thẻ gập có lỗi tự mở + tiêu điểm tới ô lỗi; máy chủ 400 nêu "Dịch vụ 2" → thẻ 2 mở;
//   7) nạp lại nháp: nháp sạch → mọi thẻ gập; nháp có giá trị bị giấu (Thông tin chuyến, xe riêng) → các thẻ đó mở sẵn (nhiều thẻ cùng mở được), mở thẻ khác thì chúng gập; `?focus=` mở đúng thẻ.
// Môi trường: D1 tạm + wrangler dev + Chrome headless qua CDP (docs/evidence/2026-09-20-a2/kich-ban/a2-cdp.mjs) — Turnstile TẮT, danh mục giả (TD101, TTB03 Phao chuối, TTB06 Motor nước).
// Chạy từ GỐC repo, sau `npm run build:web`:
//   CHROME_BIN=$PWD/docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh node docs/evidence/2026-10-18-tao-don-thiet-ke-lai/kich-ban/the-gap-smoke.mjs
// Chưa kiểm axe-core (không nạp AXE_JS). Mỗi bước chạy riêng; cuối cùng in "THE GAP SMOKE OK" hoặc danh sách bước đỏ (thoát 1).
import assert from "node:assert/strict";
import { ACCOUNTS, ok, setInput, sleep, startEnv, vnDate } from "../../2026-09-20-a2/kich-ban/a2-cdp.mjs";

const MOB = { width: 390, height: 844, mobile: true };
const DESK = { width: 1040, height: 900, mobile: false };
const env = await startEnv();
const loi = [];
async function buoc(id, ten, fn) {
  try {
    await fn();
    ok(`${id}) ${ten}`);
  } catch (e) {
    loi.push(`${id}) ${ten}: ${String(e?.message ?? e).split("\n")[0]}`);
    console.log(`✗ ${id}) ${ten}\n    ${String(e?.message ?? e).split("\n").slice(0, 8).join("\n    ")}`);
  }
}

const THE = "document.querySelectorAll('#services .svc')";
const the = (i) => `${THE}[${i}]`;
const nut = (i) => `${the(i)}.querySelector('.svc-mo')`;
const demDem = (i, nhan) => `${the(i)}.querySelector('.counter-field[aria-label=${JSON.stringify(nhan)}]')`;
const moRa = `[...${THE}].map((c) => c.querySelector('.svc-mo').getAttribute('aria-expanded'))`;
const hien = (sel) => `(() => { const e = ${sel}; return !!e && e.getClientRects().length > 0; })()`;
const dongGap = (i) => `(() => { const c = ${the(i)}; const t = (s) => c.querySelector(s); const vis = (e) => !!e && e.getClientRects().length > 0;
  return { ten: t('.svc-name').textContent, tomTat: vis(t('.svc-gon-tom-tat')) ? t('.svc-gon-tom-tat').textContent : null, tien: vis(t('.svc-gon-tien')) ? t('.svc-gon-tien').textContent : null,
    chips: [...c.querySelectorAll('.svc-chip-gon')].filter(vis).map((x) => x.textContent) }; })()`;

try {
  const call = async (account, method, path, body) => {
    const c = await env.login(account);
    const r = await fetch(env.base + path, { method, headers: { "content-type": "application/json", origin: env.base, cookie: `${c.name}=${c.value}` }, body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: r.status, json: await r.json().catch(() => null) };
  };
  /** Chạm thật: cảm ứng ở 390 (touchStart/touchEnd → click), chuột ở 1040. `cuon` = cuộn phần tử vào giữa khung trước (tránh thanh dính đầu / đáy che). */
  const cham = async (p, mobile, sel, cuon = true) => {
    if (cuon) {
      await p.ev(`(${sel}).scrollIntoView({ block: 'center' }); true`);
      await sleep(150);
    }
    const { x, y } = await p.ev(`(() => { const r = (${sel}).getBoundingClientRect(); return { x: Math.round(r.left + Math.min(r.width / 2, 48)), y: Math.round(r.top + Math.min(r.height / 2, 20)) }; })()`);
    if (mobile) {
      await p.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
      await p.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    } else {
      await p.send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y });
      await p.send("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", clickCount: 1 });
      await p.send("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", clickCount: 1 });
    }
    await sleep(250);
  };
  const phim = async (p, ten) => {
    const k = ten === "Enter" ? { key: "Enter", code: "Enter", windowsVirtualKeyCode: 13, text: "\r" } : { key: " ", code: "Space", windowsVirtualKeyCode: 32, text: " " };
    await p.send("Input.dispatchKeyEvent", { type: "keyDown", ...k });
    await p.send("Input.dispatchKeyEvent", { type: "keyUp", key: k.key, code: k.code, windowsVirtualKeyCode: k.windowsVirtualKeyCode });
    await sleep(250);
  };
  const chon = async (p, tim, soThe) => {
    await p.ev("document.getElementById('catalog-q').focus(); true");
    await p.ev(setInput("document.getElementById('catalog-q')", tim));
    await p.waitFor("document.querySelectorAll('#catalog-list .catalog-pick').length === 1", `lọc ${tim}`);
    await p.ev("document.querySelector('#catalog-list .catalog-pick').click(); true");
    await p.waitFor(`${THE}.length === ${soThe}`, `thẻ thứ ${soThe}`);
    await sleep(250);
  };
  const themDuaDon = async (p, i) => {
    await p.ev(`${the(i)}.querySelector('[data-action="them-dua-don"]').click(); true`);
    await p.waitFor(`!!${the(i)}.querySelector('select[data-o$=":don"]')`, `chặng đưa đón thẻ ${i + 1}`);
  };
  const datNoiDon = async (p, i, chu) => {
    await p.ev(setInput(`${the(i)}.querySelector('select[data-o$=":don"]')`, "tudo"));
    await p.waitFor(`!!${the(i)}.querySelector('[data-o$=":don-chu"]')`, "ô địa chỉ đón");
    await p.ev(setInput(`${the(i)}.querySelector('[data-o$=":don-chu"]')`, chu));
  };

  // ---- dữ liệu nháp dựng bằng API (bước 7) ----
  const NGAY = vnDate(3);
  const KHONG_CHUYEN = { departTime: "", checkinDate: "", checkinTime: "", checkinPlace: "", note: "" };
  const chang = (p = {}) => ({ direction: "OUT", pickupDate: NGAY, pickupTime: "07:30", pickupLocationId: null, pickupPlace: "12 Trần Phú, Nha Trang", dropoffLocationId: null, dropoffPlace: "", flightCode: "", exclusiveVehicle: false, minVehicleSeats: null, ...p });
  const dv = (code, pax, gia, p = {}) => ({ kind: "catalog", catalogCode: code, pax: { adult: 0, child: 0, senior: 0, infant: 0, ...pax }, unitPrices: gia, catalogPriceSeen: gia, departDate: NGAY, ...KHONG_CHUYEN, legs: [], ...p });
  const taoNhap = async (ten, sdt, services) => {
    const r = await call(ACCOUNTS.salesA, "POST", "/api/orders", { customerName: ten, customerPhone: sdt, customerEmail: "", customerNote: "", discount: 0, paymentNote: "", services });
    assert.equal(r.status, 201, JSON.stringify(r.json));
    return r.json.order;
  };
  // Nháp "giấu giá trị": TD101 có Thông tin chuyến (có mặt tại), TTB06 có chặng xe riêng → hai thẻ đó mở sẵn; TTB03 sạch → gập.
  const nhapGiau = await taoNhap("Khách Nháp Giấu", "0912345681", [
    dv("TD101", { adult: 2 }, { adult: 1350000 }, { checkinPlace: "Cảng Vinpearl", legs: [chang()] }),
    dv("TTB06", { adult: 2 }, { adult: 800000 }, { legs: [chang({ exclusiveVehicle: true })] }),
    dv("TTB03", { adult: 7 }, { adult: 1500000 }),
  ]);

  for (const [kho, vp] of [["390", MOB], ["1040", DESK]]) {
    const mobile = vp.mobile;
    let p = await env.as(ACCOUNTS.salesA, "/order-form", vp);
    await p.waitFor("!!document.getElementById('catalog-q') && !document.getElementById('catalog-q').disabled", "ô tìm danh mục sẵn sàng", 15000);
    await sleep(600);
    await p.ev(setInput("document.getElementById('orderDate')", NGAY));

    await buoc(`${kho}-1`, "thêm 3 dịch vụ → chỉ thẻ vừa thêm mở; thẻ trước tự gập", async () => {
      await chon(p, "TD101", 1);
      assert.deepEqual(await p.ev(moRa), ["true"], "thẻ vừa thêm mở");
      await p.ev(setInput(demDem(0, "Người lớn"), "2"));
      await p.ev(setInput(demDem(0, "Trẻ em"), "1"));
      await p.ev(setInput(demDem(0, "Em bé"), "1"));
      await themDuaDon(p, 0);
      await datNoiDon(p, 0, "Khách sạn Biển Xanh");
      await p.ev(setInput(`${the(0)}.querySelector('[data-o$=":gio"]')`, "07:30"));
      await chon(p, "phao", 2);
      assert.deepEqual(await p.ev(moRa), ["false", "true"]);
      await p.ev(setInput(demDem(1, "Số khách"), "7"));
      await chon(p, "TTB06", 3);
      await p.ev(setInput(demDem(2, "Người lớn"), "2"));
      await themDuaDon(p, 2);
      assert.deepEqual(await p.ev(moRa), ["false", "false", "true"], "chỉ thẻ vừa thêm mở");
      assert.equal(await p.ev(`[...${THE}].filter((c) => c.querySelector('.svc-than').getClientRects().length > 0).length`), 1, "chỉ MỘT thân thẻ đang hiện");
      assert.equal(await p.ev(`${the(0)}.querySelectorAll('.counter-field').length > 0 && ${the(0)}.querySelector('.svc-than').hidden`), true, "thẻ gập: ô vẫn trong cây DOM, thân chỉ ẩn bằng hidden");
    });

    await buoc(`${kho}-2`, "dòng gập: tên không cắt · số khách gọn · giờ và nơi đón · thành tiền; chip thiếu", async () => {
      assert.deepEqual(await p.ev(dongGap(0)), { ten: "Tour 4 đảo Nha Trang", tomTat: "2 NL · 1 TE · 1 EB · đón 07:30 KS Biển Xanh", tien: "3.650.000 ₫", chips: [] });
      assert.deepEqual(await p.ev(dongGap(1)), { ten: "Phao chuối", tomTat: "7 khách", tien: "3.000.000 ₫", chips: [] });
      assert.equal(await p.ev(hien(`${the(0)}.querySelector('.svc-chips')`)), false, "thẻ gập không hiện chip đơn vị / mã");
      assert.equal(await p.ev(hien(`${the(0)}.querySelector('.svc-remove')`)), false, "thẻ gập không có thùng rác");
      const n = await p.ev(`(() => { const e = ${the(0)}.querySelector('.svc-name'); const s = getComputedStyle(e); return { cat: s.textOverflow === 'ellipsis' || e.scrollWidth > e.clientWidth + 1, h: Math.round(${nut(0)}.getBoundingClientRect().height) }; })()`);
      assert.equal(n.cat, false, "tên không bị cắt");
      assert.ok(n.h >= 44, `dòng gập là một vùng chạm ≥ 44px (${n.h})`);
      await cham(p, mobile, nut(0));
      assert.deepEqual(await p.ev(moRa), ["true", "false", "false"], "chạm dòng gập thẻ 1 → thẻ 1 mở, thẻ 3 gập");
      assert.deepEqual(await p.ev(dongGap(2)), { ten: "Motor nước", tomTat: "2 NL", tien: "1.600.000 ₫", chips: ["Chưa chốt giờ đón", "Chưa có nơi đón"] });
    });

    await buoc(`${kho}-3`, "chạm thẻ phía dưới: thẻ trên gập, đầu thẻ vừa chạm đứng yên", async () => {
      await p.ev(`${nut(2)}.scrollIntoView({ block: 'center' }); true`);
      await sleep(200);
      const truoc = await p.ev(`Math.round(${nut(2)}.getBoundingClientRect().top)`);
      await cham(p, mobile, nut(2), false);
      assert.deepEqual(await p.ev(moRa), ["false", "false", "true"]);
      const sau = await p.ev(`Math.round(${nut(2)}.getBoundingClientRect().top)`);
      assert.ok(Math.abs(sau - truoc) <= 2, `đầu thẻ vừa chạm phải đứng yên: trước ${truoc}, sau ${sau}`);
    });

    await buoc(`${kho}-4`, "lỗi \"Tối đa 50 khách.\": thẻ luôn mở kể cả khi mở thẻ khác; hết lỗi thì gập được", async () => {
      await p.ev(setInput(demDem(2, "Người lớn"), "51"));
      await p.waitFor(`/Tối đa 50 khách\\./.test(${the(2)}.querySelector('.field-errors').textContent)`, "lỗi 50 khách");
      assert.equal(await p.ev(`${the(2)}.classList.contains('svc-co-loi')`), true, "viền lỗi");
      await cham(p, mobile, nut(0));
      assert.deepEqual(await p.ev(moRa), ["true", "false", "true"], "thẻ lỗi vẫn mở khi thẻ khác mở");
      await cham(p, mobile, nut(2));
      assert.equal(await p.ev(`${nut(2)}.getAttribute('aria-expanded')`), "true", "bấm đầu thẻ lỗi không gập được");
      assert.equal(await p.ev(hien(`${the(2)}.querySelector('.field-errors')`)), true, "câu lỗi đang thấy");
      await p.ev(setInput(demDem(2, "Người lớn"), "2"));
      await sleep(150);
      assert.equal(await p.ev(`${the(2)}.classList.contains('svc-co-loi')`), false);
      await cham(p, mobile, nut(1));
      assert.deepEqual(await p.ev(moRa), ["false", "true", "false"], "hết lỗi: mở thẻ khác thì gập");
    });

    await buoc(`${kho}-5`, "bàn phím thật: Enter mở, Space gập; aria-controls trỏ đúng thân", async () => {
      await p.ev(`${nut(0)}.scrollIntoView({ block: 'center' }); ${nut(0)}.focus(); true`);
      await phim(p, "Enter");
      assert.deepEqual(await p.ev(moRa), ["true", "false", "false"], "Enter trên dòng gập mở thẻ, gập thẻ khác");
      const ids = await p.ev(`(() => { const b = ${nut(0)}; const t = document.getElementById(b.getAttribute('aria-controls')); return { co: !!t && ${the(0)}.contains(t) && t.classList.contains('svc-than'), hien: !!t && t.getClientRects().length > 0, focus: document.activeElement === b }; })()`);
      assert.deepEqual(ids, { co: true, hien: true, focus: true });
      await phim(p, " ");
      assert.equal(await p.ev(`${nut(0)}.getAttribute('aria-expanded')`), "false", "Space gập thẻ");
      assert.equal(await p.ev(hien(`${the(0)}.querySelector('.svc-than')`)), false);
      await phim(p, "Enter");
      assert.equal(await p.ev(`${nut(0)}.getAttribute('aria-expanded')`), "true");
    });

    await buoc(`${kho}-6`, "thùng rác: chỉ ở thẻ mở, tên \"Xoá dịch vụ <tên>\", ≥ 44px, không còn chữ \"Xoá\"; bấm thì bỏ thẻ", async () => {
      const t = await p.ev(`(() => { const b = ${the(0)}.querySelector('.svc-remove'); const r = b.getBoundingClientRect(); return { nhan: b.getAttribute('aria-label'), w: Math.round(r.width), h: Math.round(r.height), svg: !!b.querySelector('svg'), chu: b.textContent.trim(), dau: ${the(0)}.querySelector('.svc-head').textContent.includes('Xoá'), mau: getComputedStyle(b).color }; })()`);
      assert.equal(t.nhan, "Xoá dịch vụ Tour 4 đảo Nha Trang");
      assert.ok(t.w >= 44 && t.h >= 44, `vùng chạm ${t.w}×${t.h}`);
      assert.equal(t.svg, true);
      assert.equal(t.chu, "", "nút không còn chữ");
      assert.equal(t.dau, false, "đầu thẻ không còn chữ Xoá");
      assert.equal(await p.ev(`[...${THE}].filter((c) => c.querySelector('.svc-remove').getClientRects().length > 0).length`), 1, "thùng rác chỉ ở thẻ đang mở");
    });

    await buoc(`${kho}-7`, "chip cảnh báo trên dòng gập: ngày khởi hành đã qua", async () => {
      await p.ev(setInput("document.getElementById('orderDate')", vnDate(-1)));
      await sleep(200);
      assert.ok((await p.ev(dongGap(1))).chips.includes("Ngày khởi hành đã qua"), "thẻ gập mang chip ngày đã qua");
      await p.ev(setInput("document.getElementById('orderDate')", NGAY));
      await sleep(200);
      assert.deepEqual((await p.ev(dongGap(1))).chips, []);
    });

    await buoc(`${kho}-8`, "Lưu bị từ chối ở máy khách: thẻ gập thiếu nơi đón tự mở, tiêu điểm tới ô lỗi", async () => {
      await p.ev(setInput("document.getElementById('customerName')", "Khách Thẻ Gập"));
      await p.ev(setInput("document.getElementById('customerPhone')", "0912345682"));
      assert.equal(await p.ev(`${nut(2)}.getAttribute('aria-expanded')`), "false", "ĐẦU: thẻ Motor nước (thiếu nơi đón) đang gập");
      await p.ev("document.getElementById('save').click(); true");
      await p.waitFor("!document.getElementById('save-error').hidden", "banner lỗi lưu");
      await sleep(300);
      assert.equal(await p.ev(`${nut(2)}.getAttribute('aria-expanded')`), "true", "thẻ có lỗi tự mở");
      assert.equal(await p.ev(`document.activeElement?.matches('select[data-o$=":don"]') && ${the(2)}.contains(document.activeElement)`), true, "tiêu điểm ở ô nơi đón của thẻ lỗi");
      await cham(p, mobile, nut(0));
      assert.equal(await p.ev(`${nut(2)}.getAttribute('aria-expanded')`), "true", "thẻ còn lỗi không gập khi mở thẻ khác");
      await datNoiDon(p, 2, "15 Trần Phú, Nha Trang");
      await sleep(150);
      await cham(p, mobile, nut(1));
      assert.deepEqual(await p.ev(moRa), ["false", "true", "false"], "hết lỗi thì gập như thường");
    });

    await buoc(`${kho}-9`, "máy chủ 400 nêu \"Dịch vụ 1\" → thẻ 1 (đang gập) mở", async () => {
      assert.equal(await p.ev(`${nut(0)}.getAttribute('aria-expanded')`), "false", "ĐẦU: thẻ 1 gập");
      await p.ev("(() => { const f = window.fetch; let mot = true; window.fetch = (u, o) => { if (mot && String(u).endsWith('/api/orders') && o?.method === 'POST') { mot = false; return Promise.resolve(new Response(JSON.stringify({ error: { code: 'invalid', message: 'Dịch vụ 1: số khách không hợp lệ.' } }), { status: 400, headers: { 'content-type': 'application/json' } })); } return f(u, o); }; return true; })()");
      await p.ev("document.getElementById('save').click(); true");
      await p.waitFor("!document.getElementById('save-error').hidden && /số khách không hợp lệ/.test(document.getElementById('save-error').textContent)", "banner lỗi máy chủ");
      assert.equal(await p.ev(`${nut(0)}.getAttribute('aria-expanded')`), "true", "thẻ được nêu tên mở ra");
    });

    let idDon = null;
    await buoc(`${kho}-10`, "lưu thật; nạp lại nháp sạch → mọi thẻ gập; ?focus= mở đúng thẻ", async () => {
      await p.ev("document.getElementById('save').click(); true");
      await p.waitFor("location.pathname === '/order' && !!new URLSearchParams(location.search).get('id')", "lưu xong", 15000);
      idDon = await p.ev("new URLSearchParams(location.search).get('id')");
      await p.send("Page.navigate", { url: `${env.base}/order-form?id=${idDon}` });
      await p.waitFor(`location.pathname === '/order-form' && ${THE}.length === 3`, "form sửa dựng xong", 15000);
      await sleep(600);
      assert.deepEqual(await p.ev(moRa), ["false", "false", "false"], "nháp sạch: mọi thẻ gập");
      assert.deepEqual((await p.ev(dongGap(2))).tomTat, "2 NL · đón 15 Trần Phú, Nha Trang");
      assert.deepEqual((await p.ev(dongGap(2))).chips, ["Chưa chốt giờ đón"]);
      p.close();
      const don = (await call(ACCOUNTS.admin, "GET", `/api/orders/${idDon}`)).json?.order;
      assert.ok(don?.services?.length === 3, "đọc đơn để lấy id dịch vụ");
      p = await env.as(ACCOUNTS.salesA, `/order-form?id=${idDon}&focus=${don.services[1].id}`, vp);
      await p.waitFor(`${THE}.length === 3`, "form ?focus= dựng xong", 15000);
      await sleep(600);
      assert.deepEqual(await p.ev(moRa), ["false", "true", "false"], "?focus= mở đúng thẻ, thẻ khác gập");
    });

    await buoc(`${kho}-11`, "nạp lại nháp có giá trị bị giấu: các thẻ đó mở sẵn (nhiều thẻ cùng mở), mở thẻ khác thì chúng gập", async () => {
      await p.send("Page.navigate", { url: `${env.base}/order-form?id=${nhapGiau.id}` });
      await p.waitFor(`location.pathname === '/order-form' && ${THE}.length === 3`, "form nháp giấu dựng xong", 15000);
      await sleep(600);
      assert.deepEqual(await p.ev(moRa), ["true", "true", "false"], "Thông tin chuyến / xe riêng: mở sẵn; thẻ sạch: gập");
      assert.equal(await p.ev(hien(`${the(0)}.querySelector('[data-trip="checkinPlace"]')`)), true, "ô 'Có mặt tại' đang có giá trị thì thấy được");
      assert.equal(await p.ev(`${the(0)}.querySelector('[data-trip="checkinPlace"]').value`), "Cảng Vinpearl");
      await cham(p, mobile, nut(2));
      assert.deepEqual(await p.ev(moRa), ["false", "false", "true"], "thao tác đầu tiên của người dùng: chỉ một thẻ mở");
    });

    await buoc(`${kho}-12`, "thùng rác bỏ thẻ (hành vi xoá giữ nguyên)", async () => {
      await p.ev(`${the(2)}.querySelector('.svc-remove').click(); true`);
      await p.waitFor(`${THE}.length === 2`, "còn 2 thẻ");
      assert.deepEqual(await p.ev(`[...${THE}].map((c) => c.querySelector('.svc-name').textContent)`), ["Tour 4 đảo Nha Trang", "Motor nước"]);
    });

    await buoc(`${kho}-13`, "không lỗi console", async () => {
      assert.deepEqual(p.consoleErrors.filter((e) => !/favicon/.test(e)), []);
    });
    p.close();
  }
} finally {
  await env.stop();
}
if (loi.length) {
  console.log(`\nTHE GAP SMOKE ĐỎ (${loi.length} bước):\n- ${loi.join("\n- ")}`);
  process.exit(1);
}
console.log("THE GAP SMOKE OK");
