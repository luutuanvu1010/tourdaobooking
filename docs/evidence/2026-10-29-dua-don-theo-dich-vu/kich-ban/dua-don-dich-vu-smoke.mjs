// Kịch bản Chrome (bằng chứng giao diện) cho ADR-0149 Đ1: ô «Được đón không» (Theo nhóm / Luôn đón / Không đón) trong khung «Đưa đón» của màn Danh mục (/catalog,
// chỉ Quản trị / Toàn quyền). Chọn = lưu ngay; chip «Không đón» / «Luôn đón» ở dòng (1040) và thẻ (390); DTO form đổi theo. Khung «Đưa đón» là khung có sẵn của mẫu gợi ý
// (ADR-0054, ADR-0076) — ô mới đứng TRÊN phần gợi ý (Ruling R-0149-A).
// Dùng lại cơ chế CDP của A2 (startEnv()/ACCOUNTS). Chỉ đụng D1 tạm. Chạy từ GỐC repo (worktree), sau `npm run build:web` (không cần mạng ngoài):
//   node docs/evidence/2026-10-29-dua-don-theo-dich-vu/kich-ban/dua-don-dich-vu-smoke.mjs
// Ảnh ghi vào $OUT (mặc định docs/evidence/2026-10-29-dua-don-theo-dich-vu).
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ACCOUNTS, sleep, startEnv } from "../../2026-09-20-a2/kich-ban/a2-cdp.mjs";

const OUT = process.env.OUT ?? "docs/evidence/2026-10-29-dua-don-theo-dich-vu";
mkdirSync(OUT, { recursive: true });
const MOB = { width: 390, height: 844, mobile: true };
const DESK = { width: 1040, height: 800, mobile: false };
const shot = async (p, name) => {
  await sleep(250);
  writeFileSync(join(OUT, name), Buffer.from((await p.send("Page.captureScreenshot", { format: "png" })).result.data, "base64"));
};
let passed = 0;
async function step(id, name, fn) {
  try {
    await fn();
    passed++;
    console.log(`✓ ${id}) ${name}`);
  } catch (e) {
    console.log(`✗ ${id}) ${name}\n    ${String(e?.message ?? e).split("\n").join("\n    ")}`);
    console.log(`${passed} bước ✓, 1 bước ✗ (dừng ở bước ${id})`);
    throw e;
  }
}

const chip = (noi, code) => `(() => { const c = document.querySelector(${JSON.stringify(`${noi} [data-code="${code}"] [data-quy-tac-chip]`)}); return c ? c.textContent : ''; })()`;
const dangChon = "(() => { const o = document.querySelector('input[data-quy-tac]:checked'); return o ? o.value : ''; })()";
const ghiQuyTac = "(() => { const o = document.querySelector('input[data-quy-tac]'); return o ? o.closest('.dd-nhom').querySelector('.dd-ghi').textContent : ''; })()";
const chon = (m) => `(() => { const o = document.querySelector('input[data-quy-tac="${m}"]'); o.click(); return true; })()`;
const soPut = (p) => p.requests.filter((r) => r.method === "PUT" && r.url.includes("/transfer-rule")).length;
const khongTranNgang = "document.documentElement.scrollWidth - innerWidth <= 0";

const env = await startEnv();
const loiConsole = [];
const dong = (p) => {
  loiConsole.push(...p.consoleErrors.filter((e) => !/favicon/.test(e)));
  p.close();
};
try {
  // TD101 vào nhóm Hòn Tằm (HTA, đang có đưa đón); TTB03 giữ Chưa phân loại.
  env.sql(`INSERT INTO ctl_service_group (id,service_code,group_code,seq,valid_from_at,created_at,created_by,updated_at,updated_by) VALUES ('s-td101','TD101','HTA',1,'2026-10-29T01:00:00.000Z','2026-10-29T01:00:00.000Z',NULL,'2026-10-29T01:00:00.000Z',NULL)`);
  const ad = await env.login(ACCOUNTS.admin);
  const sa = await env.login(ACCOUNTS.salesA);
  const choForm = async () => {
    const r = await fetch(`${env.base}/api/catalog/for-order`, { headers: { cookie: `${sa.name}=${sa.value}` } });
    assert.equal(r.status, 200);
    return Object.fromEntries((await r.json()).items.map((i) => [i.code, i.transferEnabled]));
  };
  assert.equal((await choForm()).TD101, true, "ban đầu theo nhóm Hòn Tằm: có đưa đón");
  void ad;

  // ================= Máy tính 1040 =================
  const d = await env.as(ACCOUNTS.admin, "/catalog", DESK);
  await step("1", "1040: mở «Đưa đón» của TD101 — ô «Được đón không» đứng trên phần gợi ý, đang «Theo nhóm», câu nói nhóm Hòn Tằm đang có đưa đón; dòng chưa có chip", async () => {
    await d.waitFor("!!document.querySelector('#list tr[data-code=\"TD101\"] [data-dua-don]')", "nút Đưa đón của TD101", 10000);
    assert.equal(await d.ev(chip("#list", "TD101")), "");
    await d.ev("document.querySelector('#list tr[data-code=\"TD101\"] [data-dua-don]').click(); true");
    await d.waitFor("document.querySelectorAll('input[data-quy-tac]').length === 3", "ba lựa chọn");
    assert.deepEqual(await d.ev("[...document.querySelectorAll('input[data-quy-tac]')].map((o) => o.closest('label').textContent)"), ["Theo nhóm", "Luôn đón", "Không đón"]);
    assert.equal(await d.ev(dangChon), "GROUP");
    assert.equal(await d.ev(ghiQuyTac), "Nhóm “Hòn Tằm” đang có đưa đón.");
    assert.ok(await d.ev("(() => { const a = document.querySelector('input[data-quy-tac]').closest('.dd-nhom'); const b = document.querySelector('input[data-che-do]').closest('.dd-nhom'); return !!(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING); })()"), "ô mới đứng TRƯỚC phần gợi ý");
  });

  await step("2", "1040: chọn «Không đón» → lưu ngay (một PUT), chip «Không đón» ở dòng TD101, câu giải thích đổi; DTO form của Bán hàng: TD101 không có đưa đón", async () => {
    const truoc = soPut(d);
    await d.ev(chon("NEVER"));
    await d.waitFor(`${JSON.stringify("Không đón")} === ${chip("#list", "TD101")}`, "chip Không đón");
    assert.equal(soPut(d) - truoc, 1);
    assert.equal(await d.ev(dangChon), "NEVER");
    assert.match(await d.ev(ghiQuyTac), /không được ghi đưa đón, dù nhóm có bật/);
    assert.equal((await choForm()).TD101, false);
    assert.ok(await d.ev(khongTranNgang), "1040: không tràn ngang");
    await shot(d, "1040-khong-don.png");
  });
  dong(d);

  // ================= Điện thoại 390 =================
  const m = await env.as(ACCOUNTS.admin, "/catalog", MOB);
  await step("3", "390: thẻ TD101 có chip «Không đón»; mở «Đưa đón» trên thẻ (bảng trượt) — đang «Không đón»; chọn «Luôn đón» rồi «Theo nhóm» → chip đổi rồi mất; không tràn ngang", async () => {
    await m.waitFor(`${JSON.stringify("Không đón")} === ${chip("#list-cards", "TD101")}`, "chip trên thẻ", 10000);
    await m.ev("document.querySelector('#list-cards [data-code=\"TD101\"] [data-dua-don]').click(); true");
    await m.waitFor("document.querySelectorAll('input[data-quy-tac]').length === 3", "ba lựa chọn trên điện thoại");
    assert.equal(await m.ev(dangChon), "NEVER");
    await shot(m, "390-khong-don.png");
    await m.ev(chon("ALWAYS"));
    await m.waitFor(`${JSON.stringify("Luôn đón")} === ${chip("#list-cards", "TD101")}`, "chip Luôn đón");
    assert.equal((await choForm()).TD101, true);
    await m.ev(chon("GROUP"));
    await m.waitFor(`'' === ${chip("#list-cards", "TD101")}`, "chip mất khi về Theo nhóm");
    assert.equal(await m.ev(dangChon), "GROUP");
    assert.ok(await m.ev(khongTranNgang), "390: không tràn ngang");
  });
  dong(m);

  await step("4", "không lỗi console ở cả hai khổ", async () => {
    assert.deepEqual(loiConsole, []);
  });
  console.log(`SMOKE OK — ${passed} bước`);
} finally {
  await env.stop();
}
