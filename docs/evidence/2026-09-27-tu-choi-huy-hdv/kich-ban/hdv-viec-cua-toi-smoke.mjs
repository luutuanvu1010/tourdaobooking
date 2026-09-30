// Kịch bản Chrome (bằng chứng giao diện) cho Task 1.8 ADR-0030 — màn "Việc của tôi" của hướng dẫn viên ở trang Tôi (web/viec-cua-toi.ts), dựng theo bản
// thiết kế chủ dự án đã chọn `docs/design/tour-o-booking-hdv/project/Viec cua toi - HDV v2.dc.html`, cộng quyết định A (tiền ở "Đơn của tôi") và C (nút chọn
// nhanh lý do sửa số khách) của chủ dự án 2026-09-27. Kiểm:
//   (1) hàng chờ đúng (phần hẹp: không SĐT khách, không tiền, nơi đón bị che), đúng thứ tự, đúng nhãn ngày; "Đơn của tôi" đúng thứ tự, đúng chip, có tiền
//       trùng API, đơn chờ xác nhận không có nút, đơn đã đi tour không có "Huỷ đơn";
//   (2) HDV khác Nhận một đơn → thẻ biến khỏi hàng chờ LẶNG LẼ (Bảng tin, không thông báo nổi);
//   (3) bấm Nhận đơn vừa có người khác nhận (409 stale) → banner + đơn rời hàng chờ;
//   (4) bấm Nhận → đơn sang "Đơn của tôi", tải lại từ máy chủ;
//   (5) bảng "Sửa số khách" (điện thoại): lý do bắt buộc, nút chọn nhanh điền ô, thân gửi đủ mọi dịch vụ danh mục, tiền trên thẻ cập nhật theo máy chủ;
//   (6) bảng "Huỷ đơn" (điện thoại): hỏi lại, "Giữ đơn" không huỷ, phải chọn lý do, huỷ thật → thẻ biến mất (DK-T4-02 phần giao diện, thay va3-smoke bước 3–6);
//       lý do "Khác" (ADR-0030 điều 2, sửa đổi sau khi duyệt 2026-09-27): gõ số điện thoại → máy chủ chặn (400), không huỷ, không mất nội dung đã gõ;
//       sửa lại lý do thường → huỷ thành công;
//   (7) máy tính: bảng giữa màn hình, Esc đóng không gửi gì.
// Dùng lại cơ chế CDP của A2 (startEnv()/ACCOUNTS/ok/vnDate từ ../../2026-09-20-a2/kich-ban/a2-cdp.mjs), mẫu step() ✓/✗ của va3-smoke.mjs (không dừng ở bước
// hỏng đầu tiên). Mọi trang trình duyệt là CÙNG một tài khoản HDV (kho cookie chung không gây nhầm người); tài khoản khác chỉ gọi API bằng Node (cookie riêng).
// Chạy từ GỐC repo, sau `npm run build:web`:
//   AXE_JS=<…/axe.min.js> CHROME_BIN=docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh node docs/evidence/2026-09-27-tu-choi-huy-hdv/kich-ban/hdv-viec-cua-toi-smoke.mjs
// Không có AXE_JS → bỏ bước axe và in rõ "chưa chạy axe". Ghi ảnh vào $OUT/anh/*.png (mặc định thư mục bằng chứng này).
import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { pathToFileURL } from "node:url";
import { ACCOUNTS, ok, sleep, startEnv, vnDate } from "../../2026-09-20-a2/kich-ban/a2-cdp.mjs";

const OUT = process.env.OUT ?? "docs/evidence/2026-09-27-tu-choi-huy-hdv";
const AXE = process.env.AXE_JS && existsSync(process.env.AXE_JS) ? readFileSync(process.env.AXE_JS, "utf8") : null;
mkdirSync(join(OUT, "anh"), { recursive: true });

const DESK = { width: 1040, height: 900, mobile: false };
const MOB = { width: 390, height: 844, mobile: true };
// Số 0900000201–209, 261, 271 đã có kịch bản khác dùng.
const HDV = { name: "Nguyễn Minh Tâm", phone: "0900000281", pin: "246881", permissions: ["FIELD"] };
const HDV2 = { name: "Trần Văn Hai", phone: "0900000282", pin: "246882", permissions: ["FIELD"] };
const POOL_PHONE = "0912 448 305"; // SĐT khách của đơn chờ nhận — KHÔNG được hiện ở hàng chờ
const PICKUP_WITH_PHONE = "Khách sạn Biển Xanh — gọi 0905 123 456 khi tới";
const nf = new Intl.NumberFormat("vi-VN");
const vnd = (n) => `${nf.format(n)} ₫`;

let passed = 0;
let failures = 0;
async function step(id, name, fn) {
  try {
    await fn();
    ok(`${id}) ${name}`);
    passed++;
  } catch (e) {
    failures++;
    const msg = String(e?.message ?? e).split("\n").slice(0, 12).join("\n    ");
    console.log(`✗ ${id}) ${name}\n    ${msg}`);
  }
}
const axe = async (p, label) => {
  if (!AXE) return;
  if (!(await p.ev("typeof axe !== 'undefined'"))) await p.ev(`${AXE}\n;true`);
  const v = await p.ev(`axe.run(document).then((r) => r.violations.map((x) => ({ id: x.id, impact: x.impact, nodes: x.nodes.length, help: x.help })))`);
  const bad = v.filter((x) => x.impact === "critical" || x.impact === "serious");
  assert.deepEqual(bad, [], `axe (${label}): ${JSON.stringify(bad)}`);
};
const axeNote = () => (AXE ? ", axe không vi phạm critical/serious" : " (chưa chạy axe: thiếu AXE_JS)");
/** Ảnh khung nhìn (không kéo dài trang) — cho bảng trượt đang mở. */
const shotView = async (p, name) => {
  await sleep(450); // chuyển động mở bảng / co thẻ (--m-base 300ms)
  const r = await p.send("Page.captureScreenshot", { format: "png" });
  writeFileSync(join(OUT, "anh", name), Buffer.from(r.result.data, "base64"));
};
const shotFull = async (p, name) => {
  await sleep(450);
  await p.shot(join(OUT, "anh", name));
};

const env = await startEnv();
const pages = [];
try {
  const call = async (account, method, path, body) => {
    const c = await env.login(account);
    const r = await fetch(env.base + path, {
      method,
      headers: { "content-type": "application/json", origin: env.base, cookie: `${c.name}=${c.value}` },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { status: r.status, json: await r.json().catch(() => null) };
  };
  const open = async (viewport) => {
    const p = await env.as(HDV, "/account", viewport);
    pages.push(p);
    await p.waitFor("!document.querySelector('#myjobs').hidden && document.querySelectorAll('#cua-toi .hdv-card').length > 0", "khối Việc của tôi dựng xong", 15000);
    return p;
  };

  // ---- Dữ liệu (API thật + SQL trên D1 tạm; KHÔNG dùng để kiểm giao diện) ----
  const { insertStaffSql } = await import(pathToFileURL(join(process.cwd(), "scripts", "staff-lib.mjs")).href);
  for (const a of [HDV, HDV2]) for (const stmt of (await insertStaffSql(a)).split("\n")) if (stmt.trim()) env.sql(stmt);
  const [hdv] = env.sql(`SELECT id, party_id FROM staff WHERE phone = '${HDV.phone}'`);
  const [hdv2] = env.sql(`SELECT id, party_id FROM staff WHERE phone = '${HDV2.phone}'`);
  const NO_TRIP = { departDate: "", departTime: "", pickupTime: "", pickupPlace: "", checkinDate: "", checkinTime: "", checkinPlace: "", note: "" };
  const td101 = (pax, trip) => ({ kind: "catalog", catalogCode: "TD101", pax: { adult: 0, child: 0, senior: 0, infant: 0, ...pax }, catalogPriceSeen: { adult: 1350000, child: 950000, senior: 1200000, infant: 0 }, ...NO_TRIP, ...trip });
  const ttb06 = (adult, trip) => ({ kind: "catalog", catalogCode: "TTB06", pax: { adult, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: 800000 }, ...NO_TRIP, ...trip });
  const newOrder = async (customerName, services, extra = {}) => {
    const r = await call(ACCOUNTS.salesA, "POST", "/api/orders", {
      customerName, customerPhone: POOL_PHONE, customerEmail: "", customerNote: "", discount: 0, depositAmount: 0, depositMethod: null, paymentNote: "", services, ...extra,
    });
    assert.equal(r.status, 201, `lập đơn ${customerName}: ${r.status} ${JSON.stringify(r.json)}`);
    return r.json.order;
  };
  const confirm = async (o) => assert.equal((await call(ACCOUNTS.salesA, "POST", `/api/orders/${o.id}/status`, { status: "confirmed" })).status, 200, `xác nhận ${o.orderCode}`);
  const detail = async (o) => (await call(ACCOUNTS.salesA, "GET", `/api/orders/${o.id}`)).json.order;

  // Hàng chờ (không chọn HDV lúc lập): P1 ngày mai, hai dịch vụ, nơi đón có SĐT; P2 còn 3 ngày; P3 còn 5 ngày.
  const P1 = await newOrder("Khách Chờ Một", [td101({ adult: 2, child: 1 }, { departDate: vnDate(1), pickupTime: "07:15", pickupPlace: PICKUP_WITH_PHONE }), ttb06(2, { departDate: vnDate(1), pickupTime: "13:30", pickupPlace: "Cảng Cầu Đá" })]);
  const P2 = await newOrder("Khách Chờ Hai", [td101({ adult: 4 }, { departDate: vnDate(3), pickupTime: "07:00", pickupPlace: "Sảnh khách sạn Sheraton" })]);
  const P3 = await newOrder("Khách Chờ Ba", [td101({ adult: 3, senior: 1 }, { departDate: vnDate(5), pickupTime: "06:45", pickupPlace: "Nhà nghỉ Sao Biển" })]);
  // Đơn của HDV (chọn HDV ngay lúc lập — ADR-0030 S20-4): M1 chờ xác nhận; M2 đã xác nhận, HAI dịch vụ danh mục, có cọc; M3 đã xác nhận rồi đẩy ngày đi về
  // quá khứ (đã đi tour); M4 đã xác nhận để huỷ.
  const M1 = await newOrder("Đỗ Minh Châu", [td101({ adult: 4, child: 1 }, { departDate: vnDate(2), departTime: "07:45", pickupTime: "07:15", pickupPlace: "Khách sạn Novotel", checkinTime: "08:15", checkinPlace: "Cảng Cầu Đá", note: "Khách ăn chay" })], { handlerStaffId: hdv.id });
  const M2 = await newOrder("Vũ Thanh Hương", [td101({ adult: 2, child: 1 }, { departDate: vnDate(4), pickupTime: "06:30", pickupPlace: PICKUP_WITH_PHONE }), ttb06(2, { departDate: vnDate(4), pickupTime: "17:30", pickupPlace: "Bến Bình Ba" })], { handlerStaffId: hdv.id, depositAmount: 500000, depositMethod: "cash" });
  const M3 = await newOrder("Hoàng Gia Linh", [td101({ adult: 3 }, { departDate: vnDate(3), pickupTime: "08:00", pickupPlace: "Cảng Cầu Đá, quầy số 3" })], { handlerStaffId: hdv.id });
  const M4 = await newOrder("Phạm Quốc Bảo", [td101({ adult: 2 }, { departDate: vnDate(6), pickupTime: "07:30", pickupPlace: "Homestay Mộc" })], { handlerStaffId: hdv.id, depositAmount: 300000, depositMethod: "cash" });
  for (const o of [M2, M3, M4]) await confirm(o);
  env.sql(`UPDATE order_service SET depart_date = '${vnDate(-2)}' WHERE order_id = '${M3.id}'`);
  console.log(`  (dữ liệu: hàng chờ ${P1.orderCode} ${P2.orderCode} ${P3.orderCode}; của HDV ${M1.orderCode} (chờ xác nhận) ${M2.orderCode} ${M3.orderCode} (đã đi tour) ${M4.orderCode})`);

  const poolCard = (code) => `[...document.querySelectorAll('#cho-nhan .hdv-collapse:not(.is-leaving) .hdv-card')].find((c) => c.textContent.includes(${JSON.stringify(code)}))`;
  const mineCard = (o) => `document.querySelector('#cua-toi .hdv-card[data-order-id="${o.id}"]')`;
  const state = (p) =>
    p.ev(`(() => {
      const t = (el) => (el ? el.innerText.replace(/\\s+/g, " ").trim() : null);
      const pool = [...document.querySelectorAll('#cho-nhan .hdv-collapse:not(.is-leaving) .hdv-card')];
      const mine = [...document.querySelectorAll('#cua-toi .hdv-card')];
      return {
        eyebrow: t(document.querySelector('.hdv-eyebrow')), title: t(document.querySelector('.hdv-title')),
        tiles: [...document.querySelectorAll('.hdv-tile')].map((a) => ({ text: t(a), href: a.getAttribute('href'), hidden: a.hidden })),
        poolCount: t(document.querySelector('.hdv-tile-queue .hdv-count')), mineCount: t(document.querySelector('.hdv-tile-mine .hdv-count')),
        poolEmptyShown: !document.querySelector('#cho-nhan .hdv-empty').hidden,
        poolText: t(document.querySelector('#cho-nhan')),
        pool: pool.map((c) => ({ date: t(c.querySelector('.hdv-date')), code: t(c.querySelector('.hdv-code')), chip: t(c.querySelector('.hdv-chip')), buttons: [...c.querySelectorAll('button')].map(t), svcs: [...c.querySelectorAll('.hdv-svc')].map(t) })),
        mine: mine.map((c) => ({
          id: c.dataset.orderId, date: t(c.querySelector('.hdv-date')), code: t(c.querySelector('.hdv-code')), chip: t(c.querySelector('.hdv-chip')), chipClass: c.querySelector('.hdv-chip')?.className ?? null,
          customer: t(c.querySelector('.hdv-customer')), tel: c.querySelector('.hdv-call')?.getAttribute('href') ?? null, me: t(c.querySelector('.hdv-me')), xem: c.querySelector('a.hdv-xem')?.getAttribute('href') ?? null, xemH: Math.round(c.querySelector('a.hdv-xem')?.getBoundingClientRect().height ?? 0),
          money: [...c.querySelectorAll('.hdv-money > div')].map((d) => [t(d.querySelector('dt')), t(d.querySelector('dd'))]),
          note: t(c.querySelector('.hdv-note')), buttons: [...c.querySelectorAll('button')].map(t), svcs: [...c.querySelectorAll('.hdv-svc')].map(t),
        })),
        toasts: document.querySelectorAll('.toast').length,
        mineOrder: [...document.querySelectorAll('#cua-toi .hdv-mine-list > *')].map((el) => el.matches('.hdv-nhom') ? '# ' + t(el) : el.dataset.orderId),
        poolBanner: document.querySelector('#cho-nhan .banner:not([hidden])') ? t(document.querySelector('#cho-nhan .banner')) : null,
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      };
    })()`);
  const moneyOf = (d) => [["Tổng tiền", vnd(d.total)], ["Thanh toán trước", vnd(d.depositAmount)], ["Còn lại", vnd(d.remainingAmount)]] // bản 1.39: trước "Đã cọc / Còn thu";

  // ==================================================================================================
  // Máy tính 1040 — hàng chờ, Nhận, cập nhật lặng lẽ
  // ==================================================================================================
  const desk = await open(DESK);
  await step("1", "Máy tính: đầu khối + hai ô điều hướng; hàng chờ = 3 đơn đúng thứ tự ngày đi, phần hẹp (không SĐT khách, không tiền, nơi đón che dãy số); “Đơn của tôi” = 4 đơn đúng thứ tự, đúng chip, tiền trùng API, nút đúng trạng thái; khối trải hết bề ngang" + axeNote(), async () => {
    const s = await state(desk);
    assert.equal(s.eyebrow, "Island Booking System · Việc của tôi"); // bản 1.39: trước còn tên cũ "Tour Đảo Booking"
    assert.equal(s.title, `HDV: ${HDV.name}`);
    assert.deepEqual(s.tiles.map((x) => [x.href, x.hidden]), [["#cho-nhan", false], ["#cua-toi", false]]);
    assert.equal(s.poolCount, "3", JSON.stringify(s.tiles));
    const claimH = await desk.ev("Math.round(document.querySelector('#cho-nhan .hdv-claim').getBoundingClientRect().height)");
    assert.equal(claimH, 52, "nút Nhận cao 52px như bản thiết kế");
    assert.equal(s.mineCount, "4", JSON.stringify(s.tiles));
    assert.deepEqual(s.pool.map((c) => c.code), [`${P1.orderCode} · Ngày mai`, `${P2.orderCode} · Còn 3 ngày`, `${P3.orderCode} · Còn 5 ngày`], JSON.stringify(s.pool));
    for (const c of s.pool) {
      assert.equal(c.chip, "Chờ nhận");
      assert.deepEqual(c.buttons, ["Nhận"]);
    }
    assert.equal(s.pool[0].svcs.length, 2, "P1 có hai dịch vụ");
    assert.match(s.pool[0].svcs[0], /^07:15 Tour 4 đảo Nha Trang 3 khách · 2 người lớn, 1 trẻ em Đón: Khách sạn Biển Xanh — gọi •••• ••• ••• khi tới$/, s.pool[0].svcs[0]);
    assert.ok(!s.poolText.includes("0905") && !s.poolText.includes(POOL_PHONE) && !s.poolText.includes("0912"), `hàng chờ KHÔNG có SĐT: ${s.poolText}`);
    assert.ok(!s.poolText.includes("₫") && !/Tổng tiền|Còn thu/.test(s.poolText), "hàng chờ KHÔNG có tiền");
    assert.ok(!s.poolText.includes("Khách Chờ"), "hàng chờ KHÔNG có tên khách");
    // Đơn của tôi: chưa đi tour theo ngày gần nhất (M1 +2, M2 +4, M4 +6), đã đi tour cuối (M3).
    assert.deepEqual(s.mine.map((c) => c.id), [M1.id, M2.id, M4.id, M3.id], JSON.stringify(s.mine.map((c) => c.code)));
    const [m1, m2, m4, m3] = s.mine;
    assert.deepEqual([m1.chip, m2.chip, m4.chip, m3.chip], ["Chờ xác nhận", "Đã xác nhận", "Đã xác nhận", "Đã đi tour"]);
    assert.equal(m3.code, `${M3.orderCode} · Đã đi 2 ngày trước`);
    assert.equal(m1.note, "Đơn đang chờ xác nhận — chưa thể huỷ hay sửa số khách.");
    assert.deepEqual(m1.buttons, [], "đơn chờ xác nhận: KHÔNG nút nào");
    assert.deepEqual(m2.buttons, ["Sửa số khách", "Huỷ đơn"]);
    assert.deepEqual(m3.buttons, ["Sửa số khách"], "đã đi tour: không “Huỷ đơn”");
    assert.equal(m2.note, null);
    for (const [c, o] of [[m1, M1], [m2, M2], [m4, M4], [m3, M3]]) {
      assert.deepEqual(c.money, moneyOf(await detail(o)), `${o.orderCode}: Tổng tiền/Đã cọc/Còn thu trùng GET /api/orders/:id`);
      assert.equal(c.me, null, "bản 1.39: không lặp dòng HDV: <tên> ở từng thẻ");
      assert.equal(c.xem, `/order?id=${encodeURIComponent(o.id)}`, "liên kết Xem đơn");
      assert.ok(c.xemH >= 44, `Xem đơn cao ${c.xemH}px`);
      assert.equal(c.tel, "tel:0912448305");
      assert.ok(c.customer.includes(POOL_PHONE) && c.customer.includes("Gọi"), c.customer);
    }
    assert.ok(m2.svcs[0].includes(PICKUP_WITH_PHONE), `đơn ĐÃ giao: nơi đón KHÔNG bị che — ${m2.svcs[0]}`);
    // bản 1.39: dưới "Đón:" có giờ khởi hành, check-in, ghi chú dịch vụ (chỉ "Đơn của tôi"); tiêu đề nhóm "Đã đi tour" trước đơn đã đi
    assert.match(m1.svcs[0], /Đón: Khách sạn Novotel Khởi hành: 07:45 Check-in: 08:15 · Cảng Cầu Đá Ghi chú: Khách ăn chay$/, m1.svcs[0]);
    assert.deepEqual(s.mineOrder, [M1.id, M2.id, M4.id, "# Đã đi tour", M3.id]);
    const w = await desk.ev("(() => { const a = document.querySelector('.account-layout').getBoundingClientRect(); const m = document.querySelector('#myjobs').getBoundingClientRect(); return { layout: Math.round(a.width), myjobs: Math.round(m.width) }; })()");
    assert.equal(w.myjobs, w.layout, `#myjobs trải hết bề ngang lưới 2 cột — ${JSON.stringify(w)}`);
    assert.equal(s.overflow <= 1, true, `không tràn ngang — ${s.overflow}px`);
    await shotFull(desk, "hdv-viec-cua-toi-1040.png");
    await axe(desk, "Việc của tôi máy tính");
  });

  await step("1b", "bản 1.39: HDV bấm được “Xem đơn” — trang đơn mở được cả đơn chờ xác nhận lẫn đơn đã xác nhận; đơn đã xác nhận KHÔNG ghi “Chỉ sửa được thông tin chuyến” (HDV không có nút sửa chuyến)", async () => {
    for (const [o, daXacNhan] of [[M1, false], [M2, true]]) {
      const q = await env.as(HDV, `/order?id=${encodeURIComponent(o.id)}`, DESK);
      pages.push(q);
      await q.waitFor("!!document.querySelector('.order-summary-band') || !document.getElementById('error')?.hidden", `trang đơn ${o.orderCode}`, 15000);
      const r = await q.ev("({ band: !!document.querySelector('.order-summary-band'), lock: document.querySelector('.lock-note')?.textContent ?? null, editTrip: !!document.querySelector('[data-action=\"edit-trip\"]') })");
      assert.equal(r.band, true, `${o.orderCode}: HDV mở được trang đơn`);
      assert.equal(r.editTrip, false, "HDV không có nút sửa chuyến");
      if (daXacNhan) assert.equal(r.lock, "Đơn đã xác nhận: dịch vụ, số khách và tiền đã khoá.", r.lock);
      else assert.equal(r.lock, null);
    }
  });

  await step("2", "HDV khác Nhận một đơn (API, cookie riêng) → thẻ biến khỏi hàng chờ LẶNG LẼ qua Bảng tin: không thông báo nổi, không banner; số “Chờ nhận” còn 2", async () => {
    const r = await call(HDV2, "PUT", `/api/orders/${P2.id}/handler`, { staffId: hdv2.id });
    assert.equal(r.status, 200, JSON.stringify(r.json));
    await desk.waitFor(`!(${poolCard(P2.orderCode)})`, "thẻ P2 rời hàng chờ", 10000);
    await sleep(600);
    const s = await state(desk);
    assert.equal(s.poolCount, "2");
    assert.deepEqual(s.pool.map((c) => c.code.split(" ·")[0]), [P1.orderCode, P3.orderCode]);
    assert.equal(s.toasts, 0, "KHÔNG có thông báo nổi cho HDV không liên quan (quyết định của chủ dự án)");
    assert.equal(s.poolBanner, null);
    assert.equal(s.mineCount, "4", "đơn của mình không đổi");
  });

  await step("3", "Bấm Nhận đơn vừa có người khác nhận (ghi thẳng D1, không có tin Bảng tin) → 409 → banner “vừa có người khác nhận”, đơn rời hàng chờ, nút mở khoá lại", async () => {
    const at = new Date().toISOString();
    env.sql(`INSERT INTO dsp_assignment (id, order_id, task_kind_code, party_id, valid_from_at, created_at, updated_at) VALUES ('${randomUUID()}', '${P1.id}', 'HANDLE', '${hdv2.party_id}', '${at}', '${at}', '${at}')`);
    assert.ok(await desk.ev(`!!(${poolCard(P1.orderCode)})`), "P1 vẫn còn trên màn hình (chưa có tin)");
    assert.ok(await desk.ev(`(() => { const b = (${poolCard(P1.orderCode)}).querySelector('button'); b.click(); return true; })()`));
    await desk.waitFor("!!document.querySelector('#cho-nhan .banner:not([hidden])')", "banner thua đua", 10000);
    await desk.waitFor(`!(${poolCard(P1.orderCode)})`, "P1 rời hàng chờ sau khi tải lại", 10000);
    const s = await state(desk);
    assert.match(s.poolBanner ?? "", /vừa có người khác nhận/, JSON.stringify(s.poolBanner));
    assert.deepEqual(s.pool.map((c) => c.code.split(" ·")[0]), [P3.orderCode]);
    assert.deepEqual(s.pool[0].buttons, ["Nhận"], "nút Nhận của thẻ còn lại mở khoá lại");
    assert.equal(await desk.ev(`(${poolCard(P3.orderCode)}).querySelector('button').disabled`), false);
    const puts = desk.requests.filter((x) => x.method === "PUT" && x.url.includes(`/api/orders/${P1.id}/handler`));
    assert.equal(puts.length, 1);
    assert.deepEqual(JSON.parse(puts[0].postData), { staffId: hdv.id }, "thân Nhận = { staffId: chính mình }");
  });

  await step("4", "Bấm Nhận → đơn sang “Đơn của tôi” (tải lại từ máy chủ: đủ SĐT, nơi đón, tiền, chip “Chờ xác nhận”), hàng chờ trống “Không có đơn nào đang chờ nhận.”, banner cũ biến mất" + axeNote(), async () => {
    assert.ok(await desk.ev(`(() => { const b = (${poolCard(P3.orderCode)}).querySelector('button'); b.click(); return true; })()`));
    await desk.waitFor(`!!(${mineCard(P3)})`, "P3 hiện trong Đơn của tôi", 10000);
    await desk.waitFor(`!(${poolCard(P3.orderCode)})`, "P3 rời hàng chờ", 10000);
    await sleep(500);
    const s = await state(desk);
    assert.equal(s.poolEmptyShown, true, "dòng trống của hàng chờ");
    assert.ok(s.poolText.includes("Không có đơn nào đang chờ nhận."));
    assert.equal(s.poolBanner, null, "banner thua đua đã xoá khi bấm Nhận lần sau");
    assert.equal(s.poolCount, "0");
    assert.equal(s.mineCount, "5");
    const p3 = s.mine.find((c) => c.id === P3.id);
    assert.equal(p3.chip, "Chờ xác nhận");
    assert.deepEqual(p3.buttons, []);
    assert.deepEqual(p3.money, moneyOf(await detail(P3)));
    assert.ok(p3.customer.includes("Khách Chờ Ba") && p3.customer.includes(POOL_PHONE), "sau khi nhận: thấy tên + SĐT khách");
    assert.equal((await call(ACCOUNTS.salesA, "GET", `/api/dispatch/handlers?orderIds=${P3.id}`)).json.handlers[P3.id]?.staffId, hdv.id, "máy chủ: HDV là người phụ trách P3");
    assert.equal(s.toasts, 0, "việc chính mình làm: không thông báo nổi");
    await shotFull(desk, "hdv-viec-cua-toi-sau-khi-nhan-1040.png");
    await axe(desk, "Việc của tôi máy tính sau khi nhận");
    assert.deepEqual(desk.consoleErrors, [], `lỗi console: ${desk.consoleErrors}`);
  });

  await step("5", "Máy tính: bảng “Sửa số khách” là hộp giữa màn hình (role=dialog), Esc đóng, không gửi gì" + axeNote(), async () => {
    assert.ok(await desk.ev(`(() => { const b = [...(${mineCard(M2)}).querySelectorAll('button')].find((x) => x.textContent.trim() === 'Sửa số khách'); b.click(); return true; })()`));
    await desk.waitFor("!!document.querySelector('.sheet-root.open .sheet[role=dialog]')", "bảng sửa mở");
    await sleep(450);
    const box = await desk.ev("(() => { const r = document.querySelector('.sheet').getBoundingClientRect(); return { left: Math.round(r.left), right: Math.round(innerWidth - r.right), top: Math.round(r.top), bottom: Math.round(innerHeight - r.bottom) }; })()");
    assert.ok(Math.abs(box.left - box.right) <= 2 && box.bottom > 0, `hộp giữa màn hình — ${JSON.stringify(box)}`);
    await shotView(desk, "hdv-sua-so-khach-1040.png");
    await axe(desk, "bảng sửa số khách máy tính");
    await desk.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
    await desk.waitFor("!document.querySelector('.sheet-root')", "Esc đóng bảng");
    assert.equal(desk.requests.filter((x) => x.method === "POST" && x.url.includes("handler-money-edit")).length, 0);
  });
  desk.close();

  // ==================================================================================================
  // Điện thoại 390 — bảng sửa số khách, bảng huỷ đơn
  // ==================================================================================================
  const mob = await open(MOB);
  await step("6", "Điện thoại: khối dựng đủ, không tràn ngang" + axeNote(), async () => {
    const s = await state(mob);
    assert.ok(s.overflow <= 1, `tràn ngang ${s.overflow}px`);
    assert.equal(s.mineCount, "5");
    // Số đo của bản thiết kế thắng các quy tắc chung khai sau trong app.css (`.chip` 12px bo tròn; `.btn:not(.btn-link)` 44px ở điện thoại).
    const m = await mob.ev(`(() => {
      const cs = (el) => getComputedStyle(el);
      const chip = document.querySelector('#cua-toi .hdv-chip');
      const act = document.querySelector('#cua-toi .hdv-act');
      return { chipFont: cs(chip).fontSize, chipRadius: cs(chip).borderTopLeftRadius, chipBorder: cs(chip).borderTopWidth, actH: Math.round(act.getBoundingClientRect().height), title: cs(document.querySelector('.hdv-title')).fontSize };
    })()`);
    assert.deepEqual(m, { chipFont: "14px", chipRadius: "12px", chipBorder: "1px", actH: 48, title: "22px" }, JSON.stringify(m));
    await shotFull(mob, "hdv-viec-cua-toi-390.png");
    await axe(mob, "Việc của tôi điện thoại");
  });

  await step("7", "Điện thoại: “Sửa số khách” đơn hai dịch vụ — bảng trượt đáy; thiếu lý do → “Cần nhập lý do sửa.” không gửi; nút “Khách thêm người” điền ô; +1 người lớn dịch vụ đầu → gửi ĐỦ hai dịch vụ danh mục; tiền trên thẻ = máy chủ" + axeNote(), async () => {
    const before = await detail(M2);
    assert.ok(await mob.ev(`(() => { const b = [...(${mineCard(M2)}).querySelectorAll('button')].find((x) => x.textContent.trim() === 'Sửa số khách'); b.click(); return true; })()`));
    await mob.waitFor("!!document.querySelector('.sheet-root.open .sheet[role=dialog]')", "bảng sửa mở");
    await sleep(450); // chuyển động trượt lên (--m-base) xong rồi mới đo vị trí
    const sh = await mob.ev(`(() => {
      const d = document.querySelector('.sheet');
      const r = d.getBoundingClientRect();
      return { title: d.querySelector('.sheet-title').textContent, sub: d.querySelector('.hdv-sheet-sub')?.textContent ?? null, names: [...d.querySelectorAll('.hdv-edit-name')].map((x) => x.textContent),
        rows: [...d.querySelectorAll('.hdv-pax-row')].map((x) => x.querySelector('.hdv-pax-label').textContent), quick: [...d.querySelectorAll('.hdv-quick button')].map((x) => x.textContent),
        foot: [...d.querySelectorAll('.sheet-foot button')].map((x) => x.textContent), bottomGap: Math.round(innerHeight - r.bottom), inputFont: getComputedStyle(d.querySelector('#hdv-edit-reason')).fontSize };
    })()`);
    assert.equal(sh.title, "Sửa số khách");
    assert.equal(sh.sub, M2.orderCode);
    assert.deepEqual(sh.names, ["Tour 4 đảo Nha Trang · 06:30", "Motor nước · 17:30"]);
    assert.ok(sh.rows.includes("Người lớn"), JSON.stringify(sh.rows));
    assert.deepEqual(sh.quick, ["Khách thêm người", "Khách bớt người", "Đổi dịch vụ"]);
    assert.deepEqual(sh.foot, ["Đóng", "Xác nhận"]);
    assert.ok(Math.abs(sh.bottomGap) <= 1, `bảng trượt sát đáy — ${sh.bottomGap}`);
    assert.equal(sh.inputFont, "16px", "ô gõ 16px");
    // thiếu lý do
    assert.ok(await mob.ev("(() => { [...document.querySelectorAll('.sheet-foot button')].find((x) => x.textContent === 'Xác nhận').click(); return true; })()"));
    await sleep(300);
    assert.equal(await mob.ev("document.querySelector('.sheet .alert:not([hidden])')?.textContent ?? null"), "Cần nhập lý do sửa.");
    assert.equal(mob.requests.filter((x) => x.method === "POST" && x.url.includes("handler-money-edit")).length, 0, "không gửi khi thiếu lý do");
    // chọn nhanh + tăng người lớn của dịch vụ đầu
    assert.ok(await mob.ev("(() => { [...document.querySelectorAll('.hdv-quick button')].find((x) => x.textContent === 'Khách thêm người').click(); return true; })()"));
    assert.equal(await mob.ev("document.querySelector('#hdv-edit-reason').value"), "Khách thêm người", "nút chọn nhanh điền sẵn ô (vẫn sửa được)");
    assert.ok(await mob.ev("(() => { document.querySelector('.hdv-edit-svc .hdv-pax-row .counter-btn[aria-label^=\"Tăng Người lớn\"]').click(); return true; })()"));
    await shotView(mob, "hdv-sua-so-khach-390.png");
    await axe(mob, "bảng sửa số khách điện thoại");
    assert.ok(await mob.ev("(() => { [...document.querySelectorAll('.sheet-foot button')].find((x) => x.textContent === 'Xác nhận').click(); return true; })()"));
    await mob.waitFor("!document.querySelector('.sheet-root')", "bảng đóng sau khi lưu", 10000);
    const posts = mob.requests.filter((x) => x.method === "POST" && x.url.includes(`/api/orders/${M2.id}/handler-money-edit`));
    assert.equal(posts.length, 1);
    const body = JSON.parse(posts[0].postData);
    assert.equal(body.reason, "Khách thêm người");
    assert.deepEqual(body.services.map((x) => x.id), before.services.map((x) => x.id), "thân gửi ĐỦ mọi dịch vụ danh mục (máy chủ đòi không thiếu không thừa)");
    assert.equal(body.services[0].pax.adult, before.services[0].pax.adult + 1);
    assert.deepEqual(body.services[1].pax, before.services[1].pax, "dịch vụ không sửa gửi y nguyên");
    const after = await detail(M2);
    assert.equal(after.total, before.total + 1350000, "máy chủ: tổng tăng đúng một người lớn TD101");
    await mob.waitFor(`(() => { const c = ${mineCard(M2)}; return !!c && c.querySelector('.hdv-money dd').textContent === ${JSON.stringify(vnd(after.total))}; })()`, "thẻ hiện tổng tiền mới", 10000);
    const s = await state(mob);
    assert.deepEqual(s.mine.find((c) => c.id === M2.id).money, moneyOf(after));
    console.log(`    tổng tiền ${M2.orderCode}: ${vnd(before.total)} → ${vnd(after.total)}; còn thu ${vnd(after.remainingAmount)}`);
  });

  // Bước trước hỏng giữa chừng có thể để bảng mở → đóng trước (Esc) để bước sau không đổ lỗi dây chuyền.
  const closeLeftover = async (p) => {
    if (await p.ev("!!document.querySelector('.sheet-root')")) {
      await p.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
      await sleep(400);
    }
  };
  await closeLeftover(mob);
  await step("8", "Điện thoại: “Huỷ đơn” — hộp hỏi lại (mã đơn, tên khách, ngày đi, “không hoàn tác”); “Huỷ đơn” khoá tới khi chọn lý do; “Giữ đơn” đóng không gửi; chọn lý do + xác nhận → đúng 1 POST, đơn huỷ, thẻ biến mất" + axeNote(), async () => {
    const openCancel = () => mob.ev(`(() => { const b = [...(${mineCard(M4)}).querySelectorAll('button')].find((x) => x.textContent.trim() === 'Huỷ đơn'); b.click(); return true; })()`);
    assert.ok(await openCancel());
    await mob.waitFor("!!document.querySelector('.sheet-root.open .sheet[role=dialog]')", "bảng huỷ mở");
    const sh = await mob.ev(`(() => { const d = document.querySelector('.sheet'); return { title: d.querySelector('.sheet-title').textContent, text: d.querySelector('.hdv-cancel-text').textContent,
      reasons: [...d.querySelectorAll('.pick-name')].map((x) => x.textContent), foot: [...d.querySelectorAll('.sheet-foot button')].map((x) => [x.textContent, x.disabled]) }; })()`);
    assert.equal(sh.title, `Huỷ đơn ${M4.orderCode}?`);
    assert.equal(await mob.ev("document.querySelector('.sheet-title .hdv-nowrap').getClientRects().length"), 1, "mã đơn trong tiêu đề không bị ngắt dòng");
    assert.ok(sh.text.startsWith("Đơn của Phạm Quốc Bảo, đi ") && sh.text.endsWith("Thao tác này không hoàn tác được."), sh.text);
    assert.deepEqual(sh.reasons, ["Không liên hệ được với khách", "Khách yêu cầu huỷ", "Khác"]);
    assert.deepEqual(sh.foot, [["Giữ đơn", false], ["Huỷ đơn", true]], "“Huỷ đơn” khoá tới khi chọn lý do");
    await shotView(mob, "hdv-huy-don-390.png");
    await axe(mob, "bảng huỷ đơn điện thoại");
    assert.ok(await mob.ev("(() => { [...document.querySelectorAll('.sheet-foot button')].find((x) => x.textContent === 'Giữ đơn').click(); return true; })()"));
    await mob.waitFor("!document.querySelector('.sheet-root')", "“Giữ đơn” đóng bảng");
    assert.equal(mob.requests.filter((x) => x.method === "POST" && x.url.includes("handler-cancel")).length, 0, "“Giữ đơn” không gửi gì");
    assert.equal((await detail(M4)).status, "confirmed");
    assert.ok(await openCancel());
    await mob.waitFor("!!document.querySelector('.sheet-root.open .sheet[role=dialog]')", "bảng huỷ mở lại");
    assert.ok(await mob.ev("(() => { const i = [...document.querySelectorAll('.sheet .pick')].find((x) => x.textContent.includes('Khách yêu cầu huỷ')).querySelector('input'); i.click(); return true; })()"));
    assert.equal(await mob.ev("[...document.querySelectorAll('.sheet-foot button')].find((x) => x.textContent === 'Huỷ đơn').disabled"), false);
    assert.ok(await mob.ev("(() => { [...document.querySelectorAll('.sheet-foot button')].find((x) => x.textContent === 'Huỷ đơn').click(); return true; })()"));
    await mob.waitFor(`!document.querySelector('.sheet-root') && !(${mineCard(M4)})`, "bảng đóng, thẻ biến khỏi Đơn của tôi", 10000);
    const posts = mob.requests.filter((x) => x.method === "POST" && x.url.includes(`/api/orders/${M4.id}/handler-cancel`));
    assert.equal(posts.length, 1);
    assert.deepEqual(JSON.parse(posts[0].postData), { reason: "customer_requested" });
    assert.equal((await detail(M4)).status, "cancelled");
    const s = await state(mob);
    assert.equal(s.mineCount, "4");
    assert.deepEqual(mob.consoleErrors, [], `lỗi console: ${mob.consoleErrors}`);
  });
  mob.close();

  // Lý do "Khác" (ADR-0030 điều 2, sửa đổi sau khi duyệt 2026-09-27): ô chữ tự do, máy chủ (không phải giao diện) chặn số điện thoại. Đơn RIÊNG (M5,
  // lập sau khi mob đã đóng) để không đụng các khẳng định số đếm/thứ tự "Đơn của tôi" đã kiểm ở bước 6 — mở trang MỚI (mob2) để tải đơn này.
  const M5 = await newOrder("Bùi Thu Trang", [td101({ adult: 2 }, { departDate: vnDate(7), pickupTime: "07:00", pickupPlace: "Khách sạn Sunrise" })], { handlerStaffId: hdv.id, depositAmount: 400000, depositMethod: "cash" });
  await confirm(M5);
  const mob2 = await open(MOB);
  await step("9", "Điện thoại: “Huỷ đơn” lý do “Khác” — gõ số điện thoại → máy chủ chặn (400), lỗi hiện trong bảng, không huỷ, không mất chữ đã gõ; sửa lại lý do thường → huỷ thành công" + axeNote(), async () => {
    const openCancel5 = () => mob2.ev(`(() => { const b = [...(${mineCard(M5)}).querySelectorAll('button')].find((x) => x.textContent.trim() === 'Huỷ đơn'); b.click(); return true; })()`);
    const pickOther = () => mob2.ev("(() => { const i = [...document.querySelectorAll('.sheet .pick')].find((x) => x.querySelector('.pick-name').textContent === 'Khác').querySelector('input'); i.click(); return true; })()");
    const typeOther = (text) => mob2.ev(`(() => { const i = document.querySelector('.sheet input[aria-label="Lý do khác"]'); i.value = ${JSON.stringify(text)}; i.dispatchEvent(new Event('input', { bubbles: true })); return true; })()`);
    const clickCancel = () => mob2.ev("(() => { [...document.querySelectorAll('.sheet-foot button')].find((x) => x.textContent === 'Huỷ đơn').click(); return true; })()");

    assert.ok(await openCancel5());
    await mob2.waitFor("!!document.querySelector('.sheet-root.open .sheet[role=dialog]')", "bảng huỷ mở");
    assert.ok(await pickOther());
    assert.equal(await mob2.ev("document.querySelector('.sheet input[aria-label=\"Lý do khác\"]').hidden"), false, "ô lý do khác hiện ra khi chọn Khác");
    assert.equal(await mob2.ev("[...document.querySelectorAll('.sheet-foot button')].find((x) => x.textContent === 'Huỷ đơn').disabled"), true, "khoá tới khi có chữ");
    await typeOther("Gọi lại số 0905 123 456 để xác nhận");
    assert.equal(await mob2.ev("[...document.querySelectorAll('.sheet-foot button')].find((x) => x.textContent === 'Huỷ đơn').disabled"), false, "có chữ thì mở khoá (giao diện không tự lọc số — máy chủ mới kiểm)");
    assert.ok(await clickCancel());
    await mob2.waitFor("!!document.querySelector('.sheet .alert:not([hidden])')", "máy chủ báo lỗi ngay trong bảng", 10000);
    const err = await mob2.ev("document.querySelector('.sheet .alert').textContent");
    assert.match(err, /không được chứa số điện thoại/, err);
    assert.ok(await mob2.ev("!!document.querySelector('.sheet-root')"), "bảng vẫn mở, chưa huỷ");
    assert.equal(await mob2.ev('document.querySelector(\'.sheet input[aria-label="Lý do khác"]\').value'), "Gọi lại số 0905 123 456 để xác nhận", "không mất nội dung đã gõ");
    assert.equal((await detail(M5)).status, "confirmed", "chưa huỷ");
    await shotView(mob2, "hdv-huy-don-khac-loi-390.png");
    // Sửa lại — văn bản thường, không dãy số dài → huỷ thành công.
    await typeOther("Khách đổi lịch bất ngờ, xin huỷ");
    assert.ok(await clickCancel());
    await mob2.waitFor(`!document.querySelector('.sheet-root') && !(${mineCard(M5)})`, "bảng đóng, thẻ biến khỏi Đơn của tôi", 10000);
    const posts = mob2.requests.filter((x) => x.method === "POST" && x.url.includes(`/api/orders/${M5.id}/handler-cancel`));
    assert.equal(posts.length, 2, "một lần bị 400, một lần thành công");
    assert.deepEqual(JSON.parse(posts[0].postData), { reason: "other", note: "Gọi lại số 0905 123 456 để xác nhận" });
    assert.deepEqual(JSON.parse(posts[1].postData), { reason: "other", note: "Khách đổi lịch bất ngờ, xin huỷ" });
    assert.equal((await detail(M5)).status, "cancelled");
    assert.deepEqual(mob2.consoleErrors, [], `lỗi console: ${mob2.consoleErrors}`);
  });
  mob2.close();
} finally {
  for (const p of pages) try { p.close(); } catch { /* đã đóng */ }
  await env.stop();
}
console.log(`${passed} bước ✓, ${failures} bước ✗${AXE ? "" : " — CHƯA CHẠY AXE (thiếu AXE_JS)"}`);
if (failures) {
  console.log("HDV VIEC CUA TOI SMOKE HỎNG");
  process.exit(1);
}
console.log("HDV VIEC CUA TOI SMOKE OK");
