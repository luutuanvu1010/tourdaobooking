// Bộ lọc đơn nhiều điều kiện ở /orders (góp ý T4 — chủ duyệt ảnh phác docs/design/gop-y-2026-09-30/a-bo-loc-don.html, 30/9): nút "Lọc" + số điều kiện,
// bảng trượt chọn ngày đi / trạng thái / dịch vụ / người lập, chip "đang lọc" bỏ từng điều kiện, "Xoá lọc", nhớ bộ lọc trên máy, câu lỗi khi Từ > Đến.
// Chạy từ GỐC repo (không cần mạng ngoài): npm run build:web && CHROME_BIN=<…/docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh> node docs/evidence/2026-09-30-gop-y/kich-ban/loc-don-smoke.mjs
// Kho cookie dùng chung: chỉ một tài khoản (Bán hàng A); Bán hàng B chỉ lập đơn qua API.
import assert from "node:assert/strict";
import { ACCOUNTS, ok, setInput, sleep, startEnv, vnDate } from "../../2026-09-20-a2/kich-ban/a2-cdp.mjs";

const env = await startEnv();
try {
  const NO_TRIP = { departTime: "", pickupTime: "", pickupPlace: "", checkinDate: "", checkinTime: "", checkinPlace: "", note: "" };
  const tao = async (acc, name, code, price, days) => {
    const c = await env.login(acc);
    const r = await fetch(`${env.base}/api/orders`, {
      method: "POST", headers: { "content-type": "application/json", origin: env.base, cookie: `${c.name}=${c.value}` },
      body: JSON.stringify({ customerName: name, customerPhone: "0904 444 555", customerEmail: "", customerNote: "", discount: 0, depositAmount: 0, depositMethod: null, paymentNote: "",
        services: [{ kind: "catalog", catalogCode: code, pax: { adult: 2, child: 0, senior: 0, infant: 0 }, unitPrices: { adult: price }, catalogPriceSeen: { adult: price }, ...NO_TRIP, departDate: vnDate(days) }] }),
    });
    const text = await r.text();
    assert.equal(r.status, 201, `tạo đơn ${name}: ${r.status} ${text}`);
    return JSON.parse(text).order.id;
  };
  const A1 = await tao(ACCOUNTS.salesA, "Khách Một", "TD101", 1350000, 3);
  const A2 = await tao(ACCOUNTS.salesA, "Khách Hai", "TTB06", 800000, 4);
  const B1 = await tao(ACCOUNTS.salesB, "Khách Ba", "TD101", 1350000, 4);

  const the = `[...document.querySelectorAll('#list .order-card .order-row')].map((a) => new URL(a.href).searchParams.get('id')).sort()`;
  const chip = `[...document.querySelectorAll('#loc-chip .loc-chip-muc')].map((c) => c.firstChild.textContent)`;
  const doiDanhSach = async (p, ids, what) => {
    const muon = JSON.stringify([...ids].sort());
    await p.waitFor(`JSON.stringify(${the}) === ${JSON.stringify(muon)}`, what, 10000);
  };
  const moBang = async (p) => {
    await p.ev("document.querySelector('#loc-mo').click()");
    await p.waitFor("!!document.querySelector('.sheet [data-action=\"ap-dung-loc\"]')", "bảng Lọc đơn mở");
  };

  const p = await env.as(ACCOUNTS.salesA, "/orders", { width: 390, height: 844, mobile: true });
  await doiDanhSach(p, [A1, A2, B1], "3 đơn, chưa lọc");
  assert.equal(await p.ev("document.querySelector('#loc-dem').hidden && document.querySelector('#loc-chip').hidden"), true, "chưa lọc: không số, không chip");
  ok("390: chưa lọc — 3 đơn, nút Lọc không có số, không hàng chip");

  // 1) Chọn ngày đi (một ngày) + một dịch vụ → Áp dụng.
  await moBang(p);
  await p.waitFor("!!document.querySelector('.sheet input[data-dv=\"TD101\"]')", "danh mục tải xong trong bảng");
  await p.ev(setInput("document.querySelector('#loc-tu')", vnDate(4)));
  await p.ev(setInput("document.querySelector('#loc-den')", vnDate(4)));
  await p.ev("(() => { const o = document.querySelector('.sheet input[data-dv=\"TD101\"]'); o.click(); return true; })()");
  const cao = await p.ev("(() => { const f = [...document.querySelectorAll('.sheet input, .sheet select')].map((x) => parseFloat(getComputedStyle(x).fontSize)); return Math.min(...f); })()");
  assert.ok(cao >= 16, `ô gõ trong bảng lọc ≥ 16px (chống iOS phóng to) — ${cao}`);
  await p.ev("document.querySelector('.sheet [data-action=\"ap-dung-loc\"]').click()");
  await doiDanhSach(p, [B1], "lọc ngày + dịch vụ");
  assert.deepEqual(await p.ev(chip), [`Ngày đi ${vnDate(4).slice(8, 10)}/${vnDate(4).slice(5, 7)}`, "Tour 4 đảo Nha Trang"]);
  assert.equal(await p.ev("document.querySelector('#loc-dem').textContent"), "2");
  assert.ok((await p.ev("document.documentElement.scrollWidth - innerWidth")) <= 0, "390: không tràn ngang");
  ok("390: lọc ngày đi + dịch vụ → đúng 1 đơn; hai chip tiếng Việt (tên dịch vụ, không mã); số 2 trên nút Lọc; không tràn ngang");

  // 2) Nhớ trên máy: tải lại trang vẫn giữ bộ lọc.
  await p.send("Page.reload", {});
  await sleep(300);
  await doiDanhSach(p, [B1], "tải lại vẫn lọc");
  await p.waitFor(`JSON.stringify(${chip}).includes('Tour 4 đảo Nha Trang')`, "chip giữ tên dịch vụ sau tải lại");
  ok("Tải lại trang: bộ lọc được nhớ trên máy (vẫn 1 đơn, vẫn hai chip)");

  // 3) Bỏ một điều kiện bằng × rồi "Xoá lọc".
  await p.ev("document.querySelector('#loc-chip [data-khoa=\"dichVu\"] .loc-chip-bo').click()");
  await doiDanhSach(p, [A2, B1], "bỏ chip dịch vụ");
  await p.ev("document.querySelector('#loc-chip .loc-xoa').click()");
  await doiDanhSach(p, [A1, A2, B1], "xoá lọc");
  assert.equal(await p.ev("localStorage.getItem('td.locDon.v1')"), null, "xoá lọc thì không còn gì nhớ");
  ok("× bỏ riêng điều kiện dịch vụ (2 đơn); \"Xoá lọc\" về 3 đơn, bộ nhớ trên máy được xoá");

  // 4) Từ > Đến → câu lỗi tiếng Việt, bảng không đóng; trạng thái chọn nhiều; "Đơn tôi lập".
  await moBang(p);
  await p.ev(setInput("document.querySelector('#loc-tu')", vnDate(5)));
  await p.ev(setInput("document.querySelector('#loc-den')", vnDate(1)));
  await p.ev("document.querySelector('.sheet [data-action=\"ap-dung-loc\"]').click()");
  await p.waitFor("!document.querySelector('.sheet .vc-field-error').hidden", "câu lỗi hiện");
  assert.equal(await p.ev("document.querySelector('.sheet .vc-field-error').textContent"), "Từ ngày không được sau Đến ngày.");
  await p.ev(setInput("document.querySelector('#loc-tu')", ""));
  await p.ev(setInput("document.querySelector('#loc-den')", ""));
  await p.ev("document.querySelector('.sheet [data-trang-thai=\"draft\"]').click()");
  await p.ev(setInput("document.querySelector('#loc-nguoi')", "toi"));
  await p.ev("document.querySelector('.sheet [data-action=\"ap-dung-loc\"]').click()");
  await doiDanhSach(p, [A1, A2], "đơn tôi lập, chờ xác nhận");
  assert.deepEqual(await p.ev(chip), ["Chờ xác nhận", "Đơn tôi lập"]);
  ok("Từ > Đến: câu \"Từ ngày không được sau Đến ngày.\", bảng giữ nguyên; Chờ xác nhận + Đơn tôi lập → 2 đơn của mình");

  // 5) Chọn nhanh "Ngày mai" đánh dấu nút; khổ máy tính: hộp giữa màn, không tràn.
  await moBang(p);
  await p.ev("document.querySelector('.sheet [data-nhanh=\"ngay-mai\"]').click()");
  assert.equal(await p.ev("document.querySelector('#loc-tu').value"), vnDate(1));
  assert.equal(await p.ev("document.querySelector('.sheet [data-nhanh=\"ngay-mai\"]').getAttribute('aria-pressed')"), "true");
  await p.shot("/tmp/loc-don-390-bang.png");
  await p.ev("document.querySelector('.sheet .sheet-close').click()");
  const errs390 = p.consoleErrors.filter((e) => !/favicon/.test(e));
  p.close();
  ok("\"Ngày mai\" điền Từ/Đến và sáng nút; đóng bằng ✕ không đổi bộ lọc");

  const d = await env.as(ACCOUNTS.salesA, "/orders", { width: 1040, height: 800, mobile: false });
  await doiDanhSach(d, [A1, A2], "1040: vẫn nhớ bộ lọc");
  await d.ev("document.querySelector('#loc-mo').click()");
  await d.waitFor("!!document.querySelector('.sheet [data-action=\"ap-dung-loc\"]')", "1040: bảng mở");
  assert.ok((await d.ev("document.documentElement.scrollWidth - innerWidth")) <= 0, "1040: không tràn ngang");
  await d.shot("/tmp/loc-don-1040-bang.png");
  const errs = [...errs390, ...d.consoleErrors.filter((e) => !/favicon/.test(e))];
  assert.deepEqual(errs, [], "không lỗi console");
  d.close();
  ok("1040: bộ lọc vẫn nhớ, bảng lọc mở dạng hộp, không tràn ngang; không lỗi console");

  // 6) Lọc sản phẩm khi lập đơn (góp ý YC-0003 — chủ duyệt 30/9, câu 4(i)): "★ Hay dùng" ghim trên máy + "Theo người" / "Giá theo nhóm" (chữ cũ "Theo nhóm", đổi ở Task A6 ADR-0058); nhớ sau tải lại.
  const f = await env.as(ACCOUNTS.salesA, "/order-form", { width: 390, height: 844, mobile: true });
  const hang = `[...document.querySelectorAll('#catalog-list .catalog-pick')].map((b) => b.querySelector('strong').textContent)`;
  await f.waitFor("document.querySelectorAll('.catalog-loc .catalog-loc-nut').length === 3", "hàng lọc danh mục", 10000);
  assert.deepEqual(await f.ev("[...document.querySelectorAll('.catalog-loc .catalog-loc-nut')].map((b) => b.textContent)"), ["★ Hay dùng", "Theo người", "Giá theo nhóm"]); // ADR-0058 Task A6: chủ chọn đổi chữ "Theo nhóm" → "Giá theo nhóm" (30/9), khoá "theo-nhom" giữ
  await f.ev("document.getElementById('catalog-q').focus(); true");
  await f.waitFor(`${hang}.length === 3`, "3 dịch vụ khi chưa lọc");
  await f.ev("document.querySelector('.catalog-loc [data-loc=\"hay-dung\"]').click()");
  await f.waitFor("/Chưa ghim dịch vụ nào/.test(document.getElementById('catalog-list').textContent)", "Hay dùng rỗng có câu hướng dẫn");
  await f.ev("document.querySelector('.catalog-loc [data-loc=\"hay-dung\"]').click()"); // bỏ lọc
  await f.waitFor(`${hang}.length === 3`, "bỏ lọc");
  await f.ev("document.querySelector('#catalog-list [data-ghim=\"TTB06\"]').click()");
  assert.equal(await f.ev("document.querySelector('#catalog-list [data-ghim=\"TTB06\"]').textContent"), "★");
  await f.ev("document.querySelector('.catalog-loc [data-loc=\"hay-dung\"]').click()");
  await f.waitFor(`JSON.stringify(${hang}) === '["TTB06"]'`, "Hay dùng chỉ còn TTB06");
  await f.send("Page.reload", {});
  await sleep(300);
  await f.waitFor("document.querySelector('.catalog-loc [data-loc=\"hay-dung\"]')?.getAttribute('aria-pressed') === 'true'", "tải lại vẫn nhớ bộ lọc", 10000);
  await f.ev("document.getElementById('catalog-q').focus(); true");
  await f.waitFor(`JSON.stringify(${hang}) === '["TTB06"]'`, "tải lại: Hay dùng vẫn TTB06");
  await f.ev("document.querySelector('.catalog-loc [data-loc=\"theo-nhom\"]').click()");
  await f.waitFor(`JSON.stringify(${hang}) === '["TTB03"]'`, "Giá theo nhóm: TTB03 (per5Pax)");
  assert.ok((await f.ev("document.documentElement.scrollWidth - innerWidth")) <= 0, "form 390: không tràn ngang");
  assert.deepEqual(f.consoleErrors.filter((e) => !/favicon/.test(e)), [], "form: không lỗi console");
  f.close();
  ok("Lập đơn 390: hàng lọc ★ Hay dùng / Theo người / Giá theo nhóm; ghim ☆→★; Hay dùng rỗng có câu hướng dẫn; nhớ bộ lọc + ghim sau tải lại; Giá theo nhóm lọc theo đơn vị");
  console.log("LOC DON SMOKE OK");
} finally {
  await env.stop();
}
