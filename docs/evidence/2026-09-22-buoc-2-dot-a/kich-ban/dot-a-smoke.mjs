// Kiểm 5 trang vừa đổi từ bảng sang thẻ ở khổ điện thoại (Bước 2 Đợt A: Nhân viên/Dịch vụ/Địa điểm/Hồ sơ/Nhật ký).
// Dùng lại đúng cơ chế CDP của A2 (KHÔNG viết lại): startEnv()/ACCOUNTS/ok từ ../../2026-09-20-a2/kich-ban/a2-cdp.mjs.
// Chạy từ GỐC repo, sau `npm run build:web`:
//   AXE_JS=<…/axe/package/axe.min.js> CHROME_BIN=<…/kich-ban/chrome-wrap.sh> node docs/evidence/2026-09-22-buoc-2-dot-a/kich-ban/dot-a-smoke.mjs
// Ghi ảnh vào docs/evidence/2026-09-22-buoc-2-dot-a/anh/*.png (10 ảnh: 5 trang × 2 khổ).
import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ACCOUNTS, ok, startEnv } from "../../2026-09-20-a2/kich-ban/a2-cdp.mjs";

const OUT = process.env.OUT ?? "docs/evidence/2026-09-22-buoc-2-dot-a";
const AXE = readFileSync(process.env.AXE_JS, "utf8");
mkdirSync(join(OUT, "anh"), { recursive: true });

const DESK = { width: 1040, height: 800, mobile: false };
const MOB = { width: 390, height: 844, mobile: true };

// 5 trang của Đợt A, cả 5 đều chỉ ADMIN vào được (staff.ts/catalog.ts/locations.ts/audit.ts chặn ngay ở đầu trang; parties.ts mở cho mọi nhân sự văn phòng nhưng ADMIN vẫn vào được).
const PAGES = [
  ["nhan-vien", "/staff"],
  ["dich-vu", "/catalog"],
  ["dia-diem", "/locations"],
  ["ho-so", "/parties"],
  ["nhat-ky", "/audit"],
];

const env = await startEnv();
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

  // Dữ liệu tối thiểu để MỖI trang có ít nhất 1 thẻ ở khổ điện thoại: Dịch vụ (3 mục) và Nhân viên (4 tài khoản) đã có sẵn từ
  // seed của startEnv() (CATALOG_SQL + ACCOUNTS); Địa điểm, Hồ sơ và Nhật ký thì trống nên phải tạo trước bằng API thật (không phải
  // để kiểm giao diện lập đơn/địa điểm — chỉ để có dữ liệu cho trang danh sách render ra thẻ).
  const loc = await call(ACCOUNTS.admin, "POST", "/api/locations", { code: "VP_KIEM_THE", name: "Văn phòng kiểm thẻ", locationTypeCode: "OFFICE", address: null, sortOrder: 0 });
  assert.equal(loc.status, 201, JSON.stringify(loc.json));
  const party = await call(ACCOUNTS.admin, "POST", "/api/parties", { kind: "PERSON", fullName: "Khách Kiểm Thẻ", contacts: [] });
  assert.equal(party.status, 201, JSON.stringify(party.json));
  // Tạo một đơn (ADMIN có quyền order.create) chỉ để sinh một dòng nhật ký "created" — trang /audit đọc bảng audit_log, seed
  // insertStaffSql không đi qua logic ứng dụng nên không tự sinh nhật ký nào.
  // 2026-09-26 (DK-T3-01 R1, chủ dự án "loại bỏ hoàn toàn dịch vụ nhập tay"): API không nhận dịch vụ nhập tay MỚI (400) → đơn dùng dịch vụ danh mục
  // giả TTB06 của a2-cdp.mjs (trước: dịch vụ nhập tay "Xe đưa đón"). Loại dịch vụ không liên quan điều kịch bản khẳng định (5 trang bảng → thẻ).
  const order = await call(ACCOUNTS.admin, "POST", "/api/orders", {
    customerName: "Khách Kiểm Nhật Ký",
    customerPhone: "0909 000 111",
    customerEmail: "",
    customerNote: "",
    discount: 0,
    depositAmount: 0,
    depositMethod: null,
    paymentNote: "",
    services: [
      {
        kind: "catalog", pickupChoice: "KHONG_DON",
        catalogCode: "TTB06",
        pax: { adult: 1, child: 0, senior: 0, infant: 0 },
        catalogPriceSeen: { adult: 800000 },
        departDate: "",
        departTime: "",
        pickupTime: "",
        pickupPlace: "",
        checkinDate: "",
        checkinTime: "",
        checkinPlace: "",
        note: "",
      },
    ],
  });
  assert.equal(order.status, 201, JSON.stringify(order.json));

  const write = (name, r) => writeFileSync(join(OUT, "anh", name), Buffer.from(r.result.data, "base64"));
  const shot = async (p, name) => write(name, await p.send("Page.captureScreenshot", { format: "png" }));

  /** axe-core: 0 vi phạm mức critical/serious. */
  const axe = async (p, label) => {
    if (!(await p.ev("typeof axe !== 'undefined'"))) await p.ev(`${AXE}\n;true`);
    const v = await p.ev(
      `axe.run(document).then((r) => r.violations.map((x) => ({ id: x.id, impact: x.impact, nodes: x.nodes.length, help: x.help })))`,
    );
    const bad = v.filter((x) => x.impact === "critical" || x.impact === "serious");
    assert.deepEqual(bad, [], `axe (${label}): ${JSON.stringify(bad)}`);
  };

  // `table.items` nằm TRONG `.table-wrap` — mốc bảng→thẻ (app.css) đặt `display:none` lên `.table-wrap` dưới 900px, không phải
  // lên chính bảng, nên đọc getComputedStyle(table).display sẽ luôn ra "table" bất kể khổ nào. offsetParent === null là cách
  // đáng tin để biết một phần tử có đang thật sự HIỆN RA hay không (kể cả khi display:none nằm ở tổ tiên). `.card-list` thì
  // ngược lại — nó TỰ mang class có display:none ở khổ máy tính — nên đọc thẳng getComputedStyle cho đúng cơ chế thật của mốc.
  const measure = (p) =>
    p.ev(`(() => {
      const table = document.querySelector('table.items');
      const cardList = document.querySelector('.card-list');
      return {
        tableVisible: table !== null && table.offsetParent !== null,
        cardListDisplay: cardList ? getComputedStyle(cardList).display : null,
        cardListVisible: cardList !== null && cardList.offsetParent !== null,
        cardCount: document.querySelectorAll('.card-list .card').length,
      };
    })()`);

  for (const [label, path] of PAGES) {
    // ---- khổ máy tính (1040×800): table.items HIỆN, .card-list ẨN ----
    let p = await env.as(ACCOUNTS.admin, path, DESK);
    await p.waitFor("document.querySelectorAll('.card-list .card').length >= 1", `${label}: thẻ đã dựng xong (máy tính)`);
    const desk = await measure(p);
    assert.equal(desk.tableVisible, true, `${label} (máy tính): table.items phải HIỆN — ${JSON.stringify(desk)}`);
    assert.equal(desk.cardListDisplay, "none", `${label} (máy tính): .card-list phải có display:none — ${JSON.stringify(desk)}`);
    assert.equal(desk.cardListVisible, false, `${label} (máy tính): .card-list phải ẨN — ${JSON.stringify(desk)}`);
    assert.deepEqual(p.consoleErrors, [], `lỗi console (${label} máy tính): ${p.consoleErrors}`);
    await shot(p, `${label}-may-tinh.png`);
    p.close();
    ok(`${label} (máy tính, 1040×800): table.items hiện, .card-list ẩn`);

    // ---- khổ điện thoại (390×844): table.items ẨN, .card-list HIỆN với ≥1 .card, axe không critical/serious ----
    p = await env.as(ACCOUNTS.admin, path, MOB);
    await p.waitFor("document.querySelectorAll('.card-list .card').length >= 1", `${label}: thẻ đã dựng xong (điện thoại)`);
    const mob = await measure(p);
    assert.equal(mob.tableVisible, false, `${label} (điện thoại): table.items phải ẨN — ${JSON.stringify(mob)}`);
    assert.notEqual(mob.cardListDisplay, "none", `${label} (điện thoại): .card-list phải HIỆN — ${JSON.stringify(mob)}`);
    assert.equal(mob.cardListVisible, true, `${label} (điện thoại): .card-list phải HIỆN — ${JSON.stringify(mob)}`);
    assert.ok(mob.cardCount >= 1, `${label} (điện thoại): .card-list phải có ít nhất 1 .card — có ${mob.cardCount}`);
    await shot(p, `${label}-dien-thoai.png`);
    await axe(p, label);
    assert.deepEqual(p.consoleErrors, [], `lỗi console (${label} điện thoại): ${p.consoleErrors}`);
    p.close();
    ok(`${label} (điện thoại, 390×844): table.items ẩn, .card-list hiện với ${mob.cardCount} thẻ, axe không vi phạm critical/serious`);
  }
} finally {
  await env.stop();
}
console.log("DOT A SMOKE OK");
