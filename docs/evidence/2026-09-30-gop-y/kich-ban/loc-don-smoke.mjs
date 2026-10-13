// Bộ lọc đơn nhiều điều kiện ở /orders (góp ý T4 — chủ duyệt ảnh phác docs/design/gop-y-2026-09-30/a-bo-loc-don.html, 30/9): nút "Lọc" + số điều kiện,
// bảng trượt chọn ngày đi / trạng thái / dịch vụ / người lập, chip "đang lọc" bỏ từng điều kiện, "Xoá lọc", nhớ bộ lọc trên máy, câu lỗi khi Từ > Đến.
// ADR-0067 (30/9): ô "Người lập" = "Mọi người" / "Đơn tôi lập" + ô gõ tìm chọn từng người đã lập đơn (bỏ chính mình); bộ lọc "Đơn tôi lập" nhớ từ bản cũ
// (`cuaToi: true`) vẫn lọc đúng đơn của mình.
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
  await p.waitFor("!!document.querySelector('.sheet .loc-nguoi-dau input[type=radio]')", "ô Người lập có lối tắt");
  assert.deepEqual(await p.ev("[...document.querySelectorAll('.sheet .loc-nguoi-dau label')].map((l) => l.textContent)"), ["Mọi người", "Đơn tôi lập"]);
  await p.ev("document.querySelectorAll('.sheet .loc-nguoi-dau input[type=radio]')[1].click()");
  await p.ev("document.querySelector('.sheet [data-action=\"ap-dung-loc\"]').click()");
  await doiDanhSach(p, [A1, A2], "đơn tôi lập, chờ xác nhận");
  assert.deepEqual(await p.ev(chip), ["Chờ xác nhận", "Đơn tôi lập"]);
  ok("Từ > Đến: câu \"Từ ngày không được sau Đến ngày.\", bảng giữ nguyên; Chờ xác nhận + Đơn tôi lập → 2 đơn của mình");

  // 4b) ADR-0067: gõ tìm một người đã lập đơn (không dấu) → chọn → chỉ đơn người đó, chip đúng tên; chính mình không nằm trong danh sách dưới.
  const dsNguoi = `[...document.querySelectorAll('.sheet [data-ds=\"nguoiLap\"] label')].map((l) => l.textContent)`;
  await moBang(p);
  await p.waitFor(`${dsNguoi}.length > 0`, "danh sách người lập tải xong", 10000);
  assert.ok(!(await p.ev(dsNguoi)).includes(ACCOUNTS.salesA.name), "chính mình không ở danh sách dưới (đã có lối tắt Đơn tôi lập)");
  assert.ok((await p.ev(dsNguoi)).includes(ACCOUNTS.salesB.name), "người đã lập đơn có trong danh sách");
  assert.ok((await p.ev("parseFloat(getComputedStyle(document.querySelector('#loc-nguoi-tim')).fontSize)")) >= 16, "ô tìm người lập ≥ 16px");
  await p.ev(setInput("document.querySelector('#loc-nguoi-tim')", "hai"));
  await p.waitFor(`JSON.stringify(${dsNguoi}) === ${JSON.stringify(JSON.stringify([ACCOUNTS.salesB.name]))}`, "gõ 'hai' chỉ còn Sales Hai");
  await p.ev("document.querySelector('.sheet [data-ds=\"nguoiLap\"] input[type=radio]').click()");
  await p.ev("document.querySelector('.sheet [data-action=\"ap-dung-loc\"]').click()");
  await doiDanhSach(p, [B1], "lọc người lập Sales Hai");
  assert.deepEqual(await p.ev(chip), ["Chờ xác nhận", ACCOUNTS.salesB.name]);
  await p.shot("/tmp/loc-don-390-nguoi-lap.png");
  ok("ADR-0067: ô Người lập — lối tắt Mọi người / Đơn tôi lập; danh sách không có chính mình; gõ 'hai' lọc tại chỗ; chọn Sales Hai → đúng 1 đơn, chip ghi tên");

  // 4c) Bộ lọc "Đơn tôi lập" nhớ từ bản cũ (`cuaToi: true`) → sau khi cập nhật vẫn lọc đúng đơn của mình; bộ nhớ ghi lại dạng mới (mã chính mình).
  await p.ev(`localStorage.setItem('td.locDon.v1', JSON.stringify({ tu: null, den: null, dichVu: [], trangThai: ["draft"], cuaToi: true })); true`);
  await p.send("Page.reload", {});
  await sleep(300);
  await doiDanhSach(p, [A1, A2], "bộ lọc cũ Đơn tôi lập");
  await p.waitFor(`JSON.stringify(${chip}) === ${JSON.stringify(JSON.stringify(["Chờ xác nhận", "Đơn tôi lập"]))}`, "chip của bộ lọc cũ");
  const nhoMoi = JSON.parse(await p.ev("localStorage.getItem('td.locDon.v1')"));
  assert.equal(nhoMoi.cuaToi, undefined, "không còn khoá cũ");
  assert.match(nhoMoi.nguoiLap, /^[0-9a-f-]{36}$/, "nhớ dạng mới: mã chính mình");
  ok("Bộ lọc 'Đơn tôi lập' nhớ từ bản cũ → vẫn 2 đơn của mình, chip 'Đơn tôi lập'; bộ nhớ ghi lại bằng mã chính mình");

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
  // Đợt 1 (13/10, #3): hàng "Lọc sẵn có" đã bỏ — "★ Hay dùng" là chip trong hàng Nhóm dịch vụ; "Theo người" / "Giá theo nhóm" không còn nút.
  await f.waitFor("document.querySelectorAll('.catalog-nhom [data-loc=\"hay-dung\"]').length === 1", "chip ★ Hay dùng", 10000);
  assert.equal(await f.ev("document.querySelectorAll('.catalog-loc, [data-loc=\"theo-nguoi\"], [data-loc=\"theo-nhom\"]').length"), 0, "không còn nút Theo người / Giá theo nhóm"); // ADR-0058 Task A6: chủ chọn đổi chữ "Theo nhóm" → "Giá theo nhóm" (30/9), khoá "theo-nhom" giữ
  await f.ev("document.getElementById('catalog-q').focus(); true");
  await f.waitFor(`${hang}.length === 3`, "3 dịch vụ khi chưa lọc");
  await f.ev("document.querySelector('.catalog-nhom [data-loc=\"hay-dung\"]').click()");
  await f.waitFor("/Chưa ghim dịch vụ nào/.test(document.getElementById('catalog-list').textContent)", "Hay dùng rỗng có câu hướng dẫn");
  await f.ev("document.querySelector('.catalog-nhom [data-loc=\"hay-dung\"]').click()"); // bỏ lọc
  await f.waitFor(`${hang}.length === 3`, "bỏ lọc");
  await f.ev("document.querySelector('#catalog-list [data-ghim=\"TTB06\"]').click()");
  assert.equal(await f.ev("document.querySelector('#catalog-list [data-ghim=\"TTB06\"]').textContent"), "★");
  await f.ev("document.querySelector('.catalog-nhom [data-loc=\"hay-dung\"]').click()");
  await f.waitFor(`JSON.stringify(${hang}) === '["TTB06"]'`, "Hay dùng chỉ còn TTB06");
  await f.send("Page.reload", {});
  await sleep(300);
  await f.waitFor("document.querySelector('.catalog-nhom [data-loc=\"hay-dung\"]')?.getAttribute('aria-pressed') === 'true'", "tải lại vẫn nhớ bộ lọc", 10000);
  await f.ev("document.getElementById('catalog-q').focus(); true");
  await f.waitFor(`JSON.stringify(${hang}) === '["TTB06"]'`, "tải lại: Hay dùng vẫn TTB06");
  assert.ok((await f.ev("document.documentElement.scrollWidth - innerWidth")) <= 0, "form 390: không tràn ngang");
  assert.deepEqual(f.consoleErrors.filter((e) => !/favicon/.test(e)), [], "form: không lỗi console");
  f.close();
  ok("Lập đơn 390: chip ★ Hay dùng trong hàng Nhóm dịch vụ (không còn Theo người / Giá theo nhóm); ghim ☆→★; Hay dùng rỗng có câu hướng dẫn; nhớ bộ lọc + ghim sau tải lại");
  console.log("LOC DON SMOKE OK");
} finally {
  await env.stop();
}
