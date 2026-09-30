// Kiểm "Dịch vụ nhập tay" có công tắc của Toàn quyền (ADR-0061) bằng Chrome thật (môi trường A2: D1 tạm + wrangler dev + Chrome headless qua CDP). Không cần
// mạng ngoài. Chạy từ GỐC repo:
//   npm run build:web && CHROME_BIN=docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh node docs/evidence/2026-09-30-adr-0061/kich-ban/nhap-tay-smoke.mjs
//   a  công tắc TẮT (mặc định sau migration): Bán hàng mở /order-form — nút "+ Dịch vụ nhập tay" ẨN; dịch vụ chưa hỗ trợ ghi đúng "chưa hỗ trợ" (bản 1.40)
//   b  trang Tôi: Bán hàng, Quản trị KHÔNG thấy khối "Dịch vụ nhập tay"; Toàn quyền thấy "Đang tắt.", bấm "Bật dịch vụ nhập tay" ⇒ "Đang bật."
//   c  công tắc BẬT: Bán hàng /order-form (390 + 1040) — nút HIỆN; "chưa hỗ trợ — dùng nhập tay"; bấm nút ⇒ thẻ nhập tay có ô Tên dịch vụ, ô gõ 16px
//   d  công tắc BẬT: tài khoản lai Đối tác + Bán hàng, Thực tập — nút ẨN, chữ "chưa hỗ trợ" (máy chủ trả duocDung = false)
//   e  công tắc BẬT: sửa đơn nháp có dịch vụ nhập tay — thẻ SỬA ĐƯỢC (có ô tên, không dòng "chỉ xem")
//   f  Toàn quyền TẮT lại (qua trang Tôi): cùng đơn — thẻ nhập tay CHỈ XEM (dòng chú thích), nút ẨN
//   g  console sạch ở mọi trang đã mở
// Các trang dùng CHUNG kho cookie: mỗi bước mở trang của MỘT tài khoản và làm xong trước khi sang tài khoản khác.
import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { ACCOUNTS, ok, sleep, startEnv, vnDate } from "../../2026-09-20-a2/kich-ban/a2-cdp.mjs";

const OUT = process.env.OUT ?? "docs/evidence/2026-09-30-adr-0061";
mkdirSync(join(OUT, "anh"), { recursive: true });
const M = { width: 390, height: 844, mobile: true };
const DESK = { width: 1040, height: 800, mobile: false };
// startEnv gieo mọi ACCOUNTS vào D1 tạm.
ACCOUNTS.owner = { name: "Chủ Nhập Tay", phone: "0900000611", pin: "135246", permissions: ["SUPER_ADMIN"] };
ACCOUNTS.laiDoiTac = { name: "Đối Tác Lai Bán", phone: "0900000612", pin: "135247", permissions: ["SALES", "PARTNER"] };
ACCOUNTS.thucTap = { name: "Thực Tập Sinh", phone: "0900000613", pin: "135248", permissions: ["INTERN"] };

const failures = [];
async function step(id, name, fn) {
  try {
    await fn();
    ok(`${id}) ${name}`);
  } catch (e) {
    failures.push(id);
    console.log(`✗ ${id}) ${name}\n    ${String(e?.message ?? e).split("\n").slice(0, 12).join("\n    ")}`);
  }
}
const q = (sel) => `document.querySelector(${JSON.stringify(sel)})`;
const tatCa = [];
const env = await startEnv();
// Dịch vụ danh mục CHƯA HỖ TRỢ (đơn vị lạ) để kiểm chữ của ô chọn.
env.sql(`INSERT INTO catalog_item (code,name,unit,price_adult,sheet_row,in_sheet,first_seen_at,updated_at) VALUES ('ZNT1','Thuê cano riêng','theo chuyến lạ',5000000,9,1,'2026-01-01T00:00:00.000Z','2026-01-01T00:00:00.000Z')`);
const api = async (account, method, path, body) => {
  const c = await env.login(account);
  const r = await fetch(env.base + path, { method, headers: { cookie: `${c.name}=${c.value}`, "content-type": "application/json", origin: env.base }, body: body ? JSON.stringify(body) : undefined });
  return { status: r.status, json: await r.json().catch(() => null) };
};
/** Mở /order-form (hoặc sửa đơn) của một tài khoản, chờ ô tìm danh mục dựng xong VÀ công tắc đã đọc (nút có thuộc tính hidden đúng). */
async function moForm(account, vp, path = "/order-form") {
  const p = await env.as(account, path, vp);
  tatCa.push(p);
  await p.waitFor(`!!${q("#catalog-q")}`, "ô tìm danh mục dựng xong", 15000);
  await sleep(600); // chờ GET /api/cai-dat/nhap-tay (song song với danh mục) trả về
  return p;
}
/** Chữ giá của dịch vụ chưa hỗ trợ ZNT1 trong ô chọn. */
async function chuChuaHoTro(p) {
  await p.ev(`(() => { const o = ${q("#catalog-q")}; o.focus(); o.value = 'ZNT1'; o.dispatchEvent(new Event('input', { bubbles: true })); return true; })()`);
  await p.waitFor(`[...document.querySelectorAll('.catalog-pick')].some((b) => b.textContent.includes('ZNT1'))`, "kết quả ZNT1");
  return p.ev(`[...document.querySelectorAll('.catalog-pick')].find((b) => b.textContent.includes('ZNT1')).querySelector('.price').textContent`);
}
let donId = null;

try {
  await step("a", "công tắc TẮT: Bán hàng — nút '+ Dịch vụ nhập tay' ẩn, dịch vụ chưa hỗ trợ ghi 'chưa hỗ trợ'", async () => {
    const p = await moForm(ACCOUNTS.salesA, M);
    assert.equal(await p.ev(`${q("#add-manual")}.hidden`), true);
    assert.equal(await chuChuaHoTro(p), "chưa hỗ trợ");
    await p.shot(join(OUT, "anh/a-tat-ban-hang-390.png"));
  });

  await step("b", "trang Tôi: Bán hàng, Quản trị không thấy khối; Toàn quyền thấy 'Đang tắt.', bấm Bật ⇒ 'Đang bật.'", async () => {
    for (const acc of [ACCOUNTS.salesA, ACCOUNTS.admin]) {
      const s = await env.as(acc, "/account", M);
      tatCa.push(s);
      await s.waitFor(`!!${q("#links")} && ${q("#links")}.children.length > 0`, "trang Tôi dựng xong", 10000);
      await sleep(600);
      assert.equal(await s.ev(`${q("#nhap-tay-cai-dat")}.hidden`), true, `${acc.name} không thấy khối`);
    }
    const o = await env.as(ACCOUNTS.owner, "/account", M);
    tatCa.push(o);
    await o.waitFor(`${q("#nhap-tay-cai-dat")} && !${q("#nhap-tay-cai-dat")}.hidden`, "khối hiện cho Toàn quyền", 10000);
    assert.equal(await o.ev(`${q("#nhap-tay-heading")}.textContent`), "Dịch vụ nhập tay");
    assert.equal(await o.ev(`${q("#nhap-tay-trang-thai")}.textContent`), "Đang tắt.");
    await o.ev(`${q("#nhap-tay-cai-dat")}.scrollIntoView(), true`);
    await o.shot(join(OUT, "anh/b-toan-quyen-tat-390.png"));
    assert.equal(await o.ev(`${q("#nhap-tay-doi")}.textContent`), "Bật dịch vụ nhập tay");
    await o.ev(`${q("#nhap-tay-doi")}.click(), true`);
    await o.waitFor(`${q("#nhap-tay-trang-thai")}?.textContent === 'Đang bật.'`, "đã bật", 10000);
    assert.equal(await o.ev(`${q("#nhap-tay-doi")}.textContent`), "Tắt dịch vụ nhập tay");
    await o.shot(join(OUT, "anh/b-toan-quyen-bat-390.png"));
  });

  await step("c", "công tắc BẬT: Bán hàng (390 + 1040) — nút hiện, 'chưa hỗ trợ — dùng nhập tay', bấm nút ⇒ thẻ có ô Tên dịch vụ (16px)", async () => {
    for (const vp of [M, DESK]) {
      const p = await moForm(ACCOUNTS.salesA, vp);
      assert.equal(await p.ev(`${q("#add-manual")}.hidden`), false, `${vp.width}: nút hiện`);
      assert.equal(await chuChuaHoTro(p), "chưa hỗ trợ — dùng nhập tay");
      await p.ev(`document.body.click(), ${q("#add-manual")}.click(), true`);
      await p.waitFor(`[...document.querySelectorAll('#services .svc input[type=text]')].some((i) => i.placeholder === 'Vd: Xe đưa đón riêng')`, "thẻ nhập tay có ô tên", 8000);
      const co = await p.ev(`getComputedStyle([...document.querySelectorAll('#services .svc input[type=text]')].find((i) => i.placeholder === 'Vd: Xe đưa đón riêng')).fontSize`);
      assert.equal(co, "16px");
      assert.equal(await p.ev("document.documentElement.scrollWidth - innerWidth"), 0, "không tràn ngang");
      await p.shot(join(OUT, `anh/c-bat-ban-hang-${vp.width}.png`));
    }
  });

  await step("d", "công tắc BẬT: lai Đối tác + Bán hàng, Thực tập — nút ẩn, chữ 'chưa hỗ trợ'", async () => {
    for (const acc of [ACCOUNTS.laiDoiTac, ACCOUNTS.thucTap]) {
      const p = await moForm(acc, M);
      assert.equal(await p.ev(`${q("#add-manual")}.hidden`), true, `${acc.name}: nút ẩn`);
      assert.equal(await chuChuaHoTro(p), "chưa hỗ trợ", acc.name);
      await p.shot(join(OUT, `anh/d-${acc.permissions.join("-").toLowerCase()}-390.png`));
    }
  });

  await step("e", "công tắc BẬT: sửa đơn nháp có dịch vụ nhập tay — thẻ sửa được (có ô tên, không dòng 'chỉ xem')", async () => {
    const r = await api(ACCOUNTS.salesA, "POST", "/api/orders", {
      customerName: "Khách Nhập Tay", customerPhone: "0912345678",
      services: [{ kind: "manual", name: "Xe đưa đón riêng", pax: { adult: 2 }, departDate: vnDate(5), items: [{ description: "Xe 7 chỗ", detail: "2 chiều", quantity: 2, unitPrice: 400000 }] }],
    });
    assert.equal(r.status, 201, JSON.stringify(r.json));
    donId = r.json.order.id;
    const p = await moForm(ACCOUNTS.salesA, M, `/order-form?id=${donId}`);
    await p.waitFor(`document.querySelectorAll('#services .svc').length === 1`, "thẻ đã lưu dựng xong", 10000);
    assert.equal(await p.ev(`!!${q("#services .svc .svc-locked")}`), false, "không có dòng chỉ xem");
    assert.equal(await p.ev(`[...document.querySelectorAll('#services .svc input[type=text]')].some((i) => i.value === 'Xe đưa đón riêng')`), true, "ô tên có giá trị đã lưu");
    await p.shot(join(OUT, "anh/e-sua-bat-390.png"));
  });

  await step("f", "Toàn quyền TẮT lại (trang Tôi): cùng đơn — thẻ nhập tay chỉ xem, nút ẩn", async () => {
    const o = await env.as(ACCOUNTS.owner, "/account", M);
    tatCa.push(o);
    await o.waitFor(`${q("#nhap-tay-trang-thai")}?.textContent === 'Đang bật.'`, "khối đang bật", 10000);
    await o.ev(`${q("#nhap-tay-doi")}.click(), true`);
    await o.waitFor(`${q("#nhap-tay-trang-thai")}?.textContent === 'Đang tắt.'`, "đã tắt", 10000);
    const p = await moForm(ACCOUNTS.salesA, M, `/order-form?id=${donId}`);
    await p.waitFor(`!!${q("#services .svc .svc-locked")}`, "thẻ chỉ xem", 10000);
    assert.equal(await p.ev(`${q("#services .svc .svc-locked")}.textContent`), "Dịch vụ nhập tay chỉ xem (đang tắt hoặc tài khoản này không được nhập tay); muốn đổi thì xoá và chọn từ danh mục.");
    assert.equal(await p.ev(`${q("#add-manual")}.hidden`), true);
    await p.shot(join(OUT, "anh/f-tat-lai-390.png"));
  });

  await step("g", "console sạch ở mọi trang đã mở", async () => {
    assert.deepEqual(tatCa.flatMap((p) => p.consoleErrors), []);
  });
} finally {
  for (const p of tatCa) p.close();
  await env.stop();
}
if (failures.length) {
  console.log(`\nĐỎ: ${failures.join(", ")}`);
  process.exit(1);
}
console.log("\nCHROME NHẬP TAY (ADR-0061) OK");
