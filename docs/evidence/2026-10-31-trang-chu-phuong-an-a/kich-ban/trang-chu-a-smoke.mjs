// Kịch bản Chrome cho Trang chủ máy tính Phương án A (31/10/2026): đo thật, in số liệu — không chữ định danh bị cắt, không tràn ngang, dải việc gấp đúng luật, một nút san hô, biểu đồ giãn, bảng thẳng cột.
// Dùng lại cơ chế CDP của A2 (startEnv: D1 tạm + wrangler dev --var, Turnstile tắt, KHÔNG đọc .env / .dev.vars). Chạy từ GỐC worktree, sau `npm run build:web`:
//   CHROME_BIN=… node docs/evidence/2026-10-31-trang-chu-phuong-an-a/kich-ban/trang-chu-a-smoke.mjs
// Kèm dò lỗi hiển thị của phiên đánh giá khung (docs/evidence/2026-10-30-danh-gia-khung-giao-dien/kich-ban/do-loi-hien-thi.js). Ảnh: ../anh/*.png. Kết quả JSON: ../so-lieu.json.
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { ACCOUNTS, ok, sleep, startEnv, vnDate } from "../../2026-09-20-a2/kich-ban/a2-cdp.mjs";

const DO_LOI = readFileSync("docs/evidence/2026-10-30-danh-gia-khung-giao-dien/kich-ban/do-loi-hien-thi.js", "utf8");
const OUT = "docs/evidence/2026-10-31-trang-chu-phuong-an-a";
ACCOUNTS.field = { name: "Hướng Dẫn Viên", phone: "0900000205", pin: "246813", permissions: ["FIELD"] };
const TODAY = vnDate(0), TOMORROW = vnDate(1), LATER = vnDate(10);
const KQ = {};

const env = await startEnv();
try {
  const call = async (account, method, path, body) => {
    const c = await env.login(account);
    const r = await fetch(env.base + path, { method, headers: { "content-type": "application/json", origin: env.base, cookie: `${c.name}=${c.value}` }, body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: r.status, json: await r.json().catch(() => null) };
  };
  const svc = ({ departDate, pickupTime, pickupPlace, adult }) => ({
    kind: "catalog", pickupChoice: pickupTime ? "DON" : "KHONG_DON", catalogCode: "TTB06", pax: { adult, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: 800_000 },
    departDate, departTime: "", pickupTime: pickupTime ?? "", pickupPlace: pickupPlace ?? "", checkinDate: "", checkinTime: "", checkinPlace: "", note: "",
  });
  const input = (customerName, customerPhone, services) => ({ customerName, customerPhone, customerEmail: "", customerNote: "", services, discount: 0, paymentNote: "" });
  const draft = async (...a) => { const r = await call(ACCOUNTS.admin, "POST", "/api/orders", input(...a)); assert.equal(r.status, 201, JSON.stringify(r.json)); return r.json.order; };
  const confirm = async (o) => {
    let c = await call(ACCOUNTS.admin, "POST", `/api/orders/${o.id}/status`, { status: "confirmed" });
    if (c.status === 409) {
      for (const sv of o.services) for (const leg of sv.legs ?? []) await call(ACCOUNTS.admin, "POST", `/api/orders/${o.id}/legs/${leg.id}/short-notice`, { lyDo: "KHAC", ghiChu: null });
      c = await call(ACCOUNTS.admin, "POST", `/api/orders/${o.id}/status`, { status: "confirmed" });
    }
    assert.equal(c.status, 200, `xác nhận ${o.id}: ${JSON.stringify(c.json)}`);
    return c.json.order;
  };
  const DIA_CHI_DAI = "Khách sạn Mường Thanh Luxury Nha Trang, 60 Trần Phú, phường Lộc Thọ, thành phố Nha Trang, tỉnh Khánh Hòa";
  const chuyen = [
    ["Nguyễn Thị Phương Anh Thư Trần Lê Hoàng Gia Bảo", "0900000401", "06:30", "Bến Cầu Đá", 4, 3_200_000],
    ["Trần Thị Bích", "0900000402", "07:15", DIA_CHI_DAI, 2, 0],
    ["Lê Quốc Cường", "0900000403", "08:00", "Resort Mường Thanh", 6, 1_000_000],
    ["Phạm Minh Dũng", "0900000404", "09:30", "Bãi Dài", 3, 0],
    ["Hoàng Văn Em", "0900000405", "23:30", "Sân bay Cam Ranh", 12, 12_345_000],
  ];
  for (const [ten, sdt, gio, noi, nl, daThu] of chuyen) {
    const o = await confirm(await draft(ten, sdt, [svc({ departDate: TODAY, pickupTime: gio, pickupPlace: noi, adult: nl })]));
    if (daThu > 0) assert.equal((await call(ACCOUNTS.admin, "POST", `/api/orders/${o.id}/payments`, { soTien: daThu, hinhThuc: "CASH", nguoiThu: "toi" })).status, 201);
  }
  await confirm(await draft("Khách Ngày Mai", "0900000406", [svc({ departDate: TOMORROW, pickupTime: "07:00", pickupPlace: "Bến Cầu Đá", adult: 2 })]));
  ok(`dữ liệu: ${chuyen.length} chuyến hôm nay (tên dài, địa chỉ dài, 12 khách, còn thu hàng chục triệu) + 1 chuyến ngày mai`);

  // Đơn chờ xác nhận: chèn thẳng yêu cầu mở (bảng ord_confirm_request) cho 3 đơn nháp — A đi hôm nay (gấp vì ngày), B đi xa nhưng gửi 3 giờ trước (gấp vì chờ), C đi xa vừa gửi (không gấp).
  const staffId = env.sql(`SELECT id FROM staff WHERE phone = '${ACCOUNTS.admin.phone}'`)[0].id;
  const iso = (msTruoc) => new Date(Date.now() - msTruoc).toISOString();
  const cho = async (ten, sdt, ngay, msTruoc) => {
    const o = await draft(ten, sdt, [svc({ departDate: ngay, pickupTime: "07:00", pickupPlace: "Bến Cầu Đá", adult: 2 })]);
    const g = iso(msTruoc), han = new Date(Date.now() - msTruoc + 15 * 60_000).toISOString();
    env.sql(`INSERT INTO ord_confirm_request (id, order_id, submitted_at, submitted_by, deadline_at, created_at, created_by, updated_at, updated_by) VALUES ('${randomUUID()}','${o.id}','${g}','${staffId}','${han}','${g}','${staffId}','${g}','${staffId}')`);
    return o;
  };
  const choA = await cho("Chờ A đi hôm nay", "0900000411", TODAY, 10 * 60_000);
  const choB = await cho("Chờ B gửi 3 giờ trước", "0900000412", LATER, 3 * 3600_000);
  const choC = await cho("Chờ C vừa gửi", "0900000413", LATER, 5 * 60_000);
  ok("3 đơn chờ xác nhận: A (đi hôm nay), B (gửi 3 giờ trước), C (vừa gửi, đi xa)");

  const chup = async (p, ten) => { const r = await p.send("Page.captureScreenshot", { format: "png" }); writeFileSync(`${OUT}/anh/${ten}.png`, Buffer.from(r.result.data, "base64")); };
  const DO = (p) => p.ev(`${DO_LOI}`);
  const dem = (kq) => ({ cat: kq.cat.length, che: kq.che.length, tran: kq.tran.length, rong: kq.rong.length });
  const XEM = `(() => {
    const thay = (el) => !!el && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';
    const $ = (s) => document.querySelector(s);
    const gap = $('#dash-gap');
    const hang = [...document.querySelectorAll('#dash-today-list .dash-today-row')];
    const toa = (sel, f) => [...new Set(hang.map((r) => Math.round(r.querySelector(sel)?.getBoundingClientRect()[f] ?? -1)))];
    const bars = [...document.querySelectorAll('.dash-chart-bar')].map((b) => Math.round(b.getBoundingClientRect().height));
    const chart = $('.dash-chart-bars');
    const dc = [...document.querySelectorAll('#dash-dang-cho-ds .dash-dc-dong')].map((d) => d.textContent.replace(/\\s+/g, ' ').trim());
    const accent = [...document.querySelectorAll('main .btn-accent, main .btn.btn-accent')].filter(thay).map((b) => b.textContent.trim());
    const grid = $('#dash-grid');
    return {
      vw: innerWidth, scrollW: document.documentElement.scrollWidth,
      gap: thay(gap) ? gap.innerText.replace(/\\s+/g, ' ').trim() : null,
      dangCho: thay($('#dash-dang-cho')) ? dc : null,
      cotPhu: thay($('#dash-cot-phu')), review: thay($('#dash-review')), soMt: thay($('#dash-so-mt')), loiTat: thay($('#dash-loi-tat')),
      hangChuyen: hang.length,
      cotGio_left: toa('.dash-today-time', 'left'), cotGiua_left: toa('.dash-today-name', 'left'), cotTien_right: toa('.dash-today-money', 'right'),
      bieuDo: { cao: chart ? Math.round(chart.getBoundingClientRect().height) : null, cotCao: bars, cotKhacKhong: bars.filter((x) => x > 0).length },
      nutSanHo: accent,
      luoiCot: grid ? getComputedStyle(grid).gridTemplateColumns : null,
      thuTuDoc: ['#dash-gap', '#dash-today', '#dash-review', '#dash-dang-cho', '#dash-so-mt', '#dash-loi-tat'].filter((s) => thay($(s))).map((s) => [s, Math.round($(s).getBoundingClientRect().top)]),
      loiTat_hang: thay($('#dash-loi-tat-luoi')) ? new Set([...document.querySelectorAll('#dash-loi-tat-luoi > *')].map((x) => Math.round(x.getBoundingClientRect().top))).size : null,
      tenCat: hang.flatMap((r) => [...r.querySelectorAll('.dash-today-name,.dash-today-money b')].filter((e) => e.scrollWidth > e.clientWidth + 1 || e.scrollHeight > e.clientHeight + 2).map((e) => e.textContent.trim())),
    };
  })()`;

  const VAI = { "Quản trị": ACCOUNTS.admin, "Chủ (Quản trị + Toàn quyền)": ACCOUNTS.chu, "Kế toán": ACCOUNTS.accounting, "Nhân viên lập đơn": ACCOUNTS.salesA, "Hướng dẫn viên": ACCOUNTS.field };
  const KHO = [[1366, 650], [1440, 900], [1100, 800], [900, 800]];
  const baoCao = [];
  for (const [vai, acc] of Object.entries(VAI)) {
    for (const [w, hgt] of KHO) {
      const p = await env.as(acc, "/", { width: w, height: hgt, mobile: false });
      try {
        await p.waitFor("!document.querySelector('#dash-grid')?.hidden", `lưới hiện (${vai} ${w})`, 15000);
        await sleep(400);
        const x = await p.ev(XEM);
        const loi = await DO(p);
        const dong = { vai, kho: `${w}x${hgt}`, ...x, loi: dem(loi), chiTietLoi: { cat: loi.cat, tran: loi.tran } };
        baoCao.push(dong);
        console.log(`· ${vai} ${w}x${hgt}: gap=${x.gap ? "CÓ" : "không"} dangCho=${x.dangCho ? x.dangCho.length : "ẩn"} cắt=${loi.cat.length} tràn=${loi.tran.length} tràn_trang=${x.scrollW > x.vw} cột=${x.luoiCot}`);
        if (vai === "Quản trị" || vai === "Kế toán" || vai === "Nhân viên lập đơn") await chup(p, `${vai.replace(/[^A-Za-z]/g, "").slice(0, 6)}-${w}x${hgt}`);
      } finally { p.close(); }
    }
  }
  KQ.baoCao = baoCao;

  // Đúng luật dải: Quản trị thấy dải; điền số.
  const qt = baoCao.find((d) => d.vai === "Quản trị" && d.kho === "1440x900");
  assert.ok(qt.gap, "Quản trị: dải việc gấp phải hiện");
  assert.match(qt.gap, /^3 đơn chờ xác nhận, 1 đơn quá 2 giờ/, "câu dải: tổng 3, quá 2 giờ 1");
  assert.deepEqual(qt.nutSanHo, ["Xác nhận ngay"], "nút san hô duy nhất của màn là «Xác nhận ngay»");
  ok(`dải gấp: «${qt.gap}»; nút san hô duy nhất = «Xác nhận ngay»`);
  const kt = baoCao.find((d) => d.vai === "Kế toán" && d.kho === "1440x900");
  assert.ok(kt.gap, "Kế toán giữ ô xét duyệt nên cũng thấy dải");

  // Đóng A và B → chỉ còn C (không gấp) → dải ẩn, thẻ vẫn có dòng «Chờ xác nhận 1».
  for (const o of [choA, choB]) env.sql(`UPDATE ord_confirm_request SET decided_at = '${new Date().toISOString()}', decided_by = '${staffId}', outcome = 'RUT_LAI' WHERE order_id = '${o.id}'`);
  {
    const p = await env.as(ACCOUNTS.admin, "/", { width: 1440, height: 900, mobile: false });
    try {
      await p.waitFor("!document.querySelector('#dash-grid')?.hidden", "lưới", 15000);
      await sleep(300);
      const x = await p.ev(XEM);
      assert.equal(x.gap, null, "chỉ còn đơn C (không gấp) ⇒ dải ẩn hẳn");
      assert.ok(x.dangCho?.some((t) => /chờ xác nhận/i.test(t)), "thẻ Đang chờ bạn vẫn có dòng chờ xác nhận");
      ok(`không đơn gấp ⇒ dải ẩn hẳn; Đang chờ bạn: ${JSON.stringify(x.dangCho)}`);
      KQ.khongGap = x;
    } finally { p.close(); }
  }

  // Điện thoại: dải và thẻ «Đang chờ bạn» ẩn, có #dash-so bốn ô như cũ.
  {
    const p = await env.as(ACCOUNTS.admin, "/", { width: 390, height: 844, mobile: true });
    try {
      await p.waitFor("!document.querySelector('#dash-grid')?.hidden", "lưới", 15000);
      await sleep(300);
      const m = await p.ev(`(() => { const v = (s) => { const e = document.querySelector(s); return !!e && e.getClientRects().length > 0; }; const r = (s) => { const e = document.querySelector(s); const b = e?.getBoundingClientRect(); return b ? [Math.round(b.width), Math.round(b.height)] : null; };
        return { gap: v('#dash-gap'), dangCho: v('#dash-dang-cho'), soMt: v('#dash-so-mt'), loiTat: v('#dash-loi-tat'), dashSo: v('#dash-so'), choDt: v('#dash-cho-dt'), o: v('#dash-o'), review: v('#dash-review'), today: v('#dash-today'),
          kich: { dashSo: r('#dash-so'), o: r('#dash-o'), today: r('#dash-today'), review: r('#dash-review') }, scrollW: document.documentElement.scrollWidth, vw: innerWidth,
          thuTu: ['#dash-so', '#dash-o', '#dash-review', '#dash-today'].filter(v).map((s) => [s, Math.round(document.querySelector(s).getBoundingClientRect().top)]) }; })()`);
      const loi = await DO(p);
      console.log("· điện thoại 390:", JSON.stringify(m), "cắt/tràn:", loi.cat.length, loi.tran.length);
      assert.equal(m.gap, false); assert.equal(m.dangCho, false); assert.equal(m.soMt, false); assert.equal(m.loiTat, false);
      assert.ok(m.dashSo && m.today, "điện thoại vẫn có ô số 2×2 và Chuyến đón");
      assert.ok(m.scrollW <= m.vw, "điện thoại không tràn ngang");
      KQ.dienThoai = { ...m, loi: dem(loi) };
      await chup(p, "dienthoai-390");
    } finally { p.close(); }
  }
  writeFileSync(`${OUT}/so-lieu.json`, JSON.stringify(KQ, null, 1));
  const tong = baoCao.reduce((a, d) => ({ cat: a.cat + d.loi.cat, tran: a.tran + d.loi.tran, che: a.che + d.loi.che, tranTrang: a.tranTrang + (d.scrollW > d.vw ? 1 : 0), tenCat: a.tenCat + d.tenCat.length }), { cat: 0, tran: 0, che: 0, tranTrang: 0, tenCat: 0 });
  console.log("TỔNG trên", baoCao.length, "lượt đo:", JSON.stringify(tong));
} finally {
  await env.stop();
}
