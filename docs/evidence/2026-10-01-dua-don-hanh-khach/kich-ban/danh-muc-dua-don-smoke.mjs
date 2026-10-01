// Kịch bản Chrome (bằng chứng giao diện) cho bản vẽ M7 "Danh mục — ô Đưa đón của một dịch vụ" (docs/design/2026-10-01-dua-don-hanh-khach/M7 Danh muc - dua don.dc.html;
// kế hoạch docs/superpowers/plans/2026-10-01-giao-dien-dua-don-hanh-khach.md tiêu chí 8, 9). Trang /catalog (web/catalog.ts): chip chế độ ở mỗi dòng / thẻ, nút
// "Đưa đón" cạnh "Sửa giá", khung (1040: ở chỗ khung "Sửa giá"; 390: bảng trượt) — chọn Không / Một / Hai chiều, "Giờ về gợi ý", "Nơi trả gợi ý" (điểm đang
// dùng của GET /api/locations), "Lưu bản mới", lịch sử "Lúc · Cũ → mới" (cột "Người đổi" CHƯA vẽ — DTO chưa mang người ghi, xem nhật ký thi công).
// Dùng lại cơ chế CDP của A2 (startEnv()/ACCOUNTS ở ../../2026-09-20-a2/kich-ban/a2-cdp.mjs). Chỉ đụng D1 tạm. Chạy từ GỐC repo (worktree), sau `npm run build:web`
// (không cần mạng ngoài):   AXE_JS=<…/axe.min.js> node docs/evidence/2026-10-01-dua-don-hanh-khach/kich-ban/danh-muc-dua-don-smoke.mjs
// Ảnh ghi vào $OUT (mặc định docs/evidence/2026-10-01-dua-don-hanh-khach). Thứ tự tài khoản: Quản trị (1040) → Quản trị + Toàn quyền (390) → Bán hàng (cuối).
import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ACCOUNTS, setInput, sleep, startEnv } from "../../2026-09-20-a2/kich-ban/a2-cdp.mjs";

const OUT = process.env.OUT ?? "docs/evidence/2026-10-01-dua-don-hanh-khach";
mkdirSync(OUT, { recursive: true });
const MOB = { width: 390, height: 844, mobile: true };
const DESK = { width: 1040, height: 900, mobile: false };
const shot = async (p, name, sel) => {
  if (sel) await p.ev(`document.querySelector(${JSON.stringify(sel)}).scrollIntoView({ block: 'start' }); if (innerWidth < 700) scrollBy(0, -72); true`);
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

const khongTranNgang = "document.documentElement.scrollWidth - innerWidth <= 0";
const chipBang = (code) => `document.querySelector('#list tr[data-code="${code}"] [data-dua-don-chip]')?.textContent ?? null`;
const chipThe = (code) => `document.querySelector('#list-cards [data-code="${code}"] [data-dua-don-chip]')?.textContent ?? null`;
const nutHang = (code) => `[...document.querySelectorAll('#list tr[data-code="${code}"] .row-actions button')].map((b) => b.textContent)`;
const nutThe = (code) => `[...document.querySelectorAll('#list-cards [data-code="${code}"] button')].map((b) => b.textContent)`;
const bamDuaDon = (code, noi) => `(() => { const b = [...document.querySelectorAll('[data-dua-don]')].find((x) => x.dataset.duaDon === ${JSON.stringify(code)} && x.dataset.noi === ${JSON.stringify(noi)}); b.click(); return true; })()`;
const chonCheDo = (m) => `(() => { const o = document.querySelector('input[data-che-do="${m}"]'); o.click(); return o.checked; })()`;
const cheDoChon = "document.querySelector('input[data-che-do]:checked')?.value ?? null";
const nhanCheDo = "[...document.querySelectorAll('.dd-che-do')].map((l) => l.textContent.trim())";
const hien = (sel) => `(() => { const e = document.querySelector(${JSON.stringify(sel)}); return !!e && e.offsetParent !== null; })()`;
const dongLs = "[...document.querySelectorAll('.dd-bang-ls tbody tr')].map((r) => [...r.cells].map((c) => c.textContent))";
const dongLsDt = "[...document.querySelectorAll('.dd-ds-ls li')].map((li) => [li.querySelector('.dd-luc').textContent, li.querySelector('.dd-doi').textContent])";
const coChu = (sel) => `(() => { const a = [...document.querySelectorAll(${JSON.stringify(sel)})].filter((e) => e.offsetParent !== null).map((e) => parseFloat(getComputedStyle(e).fontSize)); return a.length ? Math.min(...a) : 0; })()`;
const vungBam = (sel) => `(() => { const r = [...document.querySelectorAll(${JSON.stringify(sel)})].filter((e) => e.offsetParent !== null).map((e) => e.getBoundingClientRect()); return r.length ? Math.min(...r.map((x) => x.height)) : 0; })()`;
/** axe-core (khi có AXE_JS): 0 vi phạm critical/serious TRONG khung mới (`vung`; thanh bên có lỗi tương phản sẵn ở ảnh cuộn — không thuộc việc này). Không có AXE_JS → bỏ qua, ghi rõ. */
const AXE = process.env.AXE_JS ? readFileSync(process.env.AXE_JS, "utf8") : null;
const axe = async (p, label, vung) => {
  if (!AXE) return console.log(`  (axe bỏ qua ở ${label}: chưa đặt AXE_JS)`);
  if (!(await p.ev("typeof axe !== 'undefined'"))) await p.ev(`${AXE}\n;true`);
  const v = await p.ev(`axe.run(document.querySelector(${JSON.stringify(vung)})).then((r) => r.violations.map((x) => ({ id: x.id, impact: x.impact, nodes: x.nodes.length, help: x.help, target: x.nodes.map((n) => n.target.join(' ') + ' :: ' + (n.failureSummary || '').slice(0, 160)) })))`);
  const bad = v.filter((x) => x.impact === "critical" || x.impact === "serious");
  assert.deepEqual(bad, [], `axe (${label}): ${JSON.stringify(bad)}`);
};
const CHU_ANH = /\b(NONE|ONE_WAY|ROUND_TRIP|returnTimeHint|noiTra|invalid_input|forbidden|undefined|null)\b/;

const env = await startEnv();
const loiConsole = [];
const dong = (p) => {
  loiConsole.push(...p.consoleErrors.filter((e) => !/favicon/.test(e)));
  p.close();
};
try {
  const ad = await env.login(ACCOUNTS.admin);
  const apiGet = async (path, who = ad) => {
    const r = await fetch(`${env.base}${path}`, { headers: { cookie: `${who.name}=${who.value}` } });
    return { status: r.status, body: await r.json() };
  };
  const dsDiem = (await apiGet("/api/locations")).body.locations.filter((l) => l.active).sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, "vi"));
  assert.ok(dsDiem.length >= 2, "cần ít nhất hai điểm đang dùng (gieo ở migration)");
  const [diemA, diemB] = dsDiem;
  console.log(`  (điểm thử: ${diemA.name} · ${diemA.locationTypeName}; ${diemB.name})`);

  // ================= 1040 — Quản trị =================
  const d = await env.as(ACCOUNTS.admin, "/catalog", DESK);

  await step("1", "1040 Quản trị: mỗi dòng có chip chế độ (chưa cài = 'Không đưa đón'), nút 'Đưa đón' đứng NGAY SAU 'Sửa giá'; không tràn ngang", async () => {
    await d.waitFor(`${chipBang("TD101")} !== null`, "chip ở dòng TD101", 10000);
    assert.equal(await d.ev(chipBang("TD101")), "Không đưa đón");
    assert.equal(await d.ev(`document.querySelector('#list tr[data-code="TD101"] [data-dua-don-chip]').className`), "chip chip-muted dd-chip");
    const nut = await d.ev(nutHang("TD101"));
    assert.deepEqual(nut.slice(0, 2), ["Sửa giá", "Đưa đón"], nut.join("|"));
    assert.ok(await d.ev(khongTranNgang), "1040: không tràn ngang");
  });

  await step("2", "1040: bấm 'Đưa đón' TD101 → khung ở chỗ khung 'Sửa giá' (#edit): tiêu đề, ba thẻ chọn đúng chữ, 'Không đưa đón' đang chọn, hai ô ẩn, lịch sử trống", async () => {
    await d.ev(bamDuaDon("TD101", "bang"));
    await d.waitFor("!document.getElementById('edit').hidden && !document.querySelector('[data-action=\"dd-luu\"]').disabled", "khung Đưa đón tải xong");
    assert.equal(await d.ev("document.querySelector('#edit h2').textContent"), "Đưa đón: TD101 — Tour 4 đảo Nha Trang");
    assert.equal(await d.ev("document.querySelector('.dd-nhan').textContent"), "Khi lập đơn có dịch vụ này (chọn một)");
    assert.deepEqual(await d.ev(nhanCheDo), ["Không đưa đón", "Một chiều", "Hai chiều"]);
    assert.equal(await d.ev(cheDoChon), "NONE");
    assert.equal(await d.ev(hien("[id^='dd-gio-']")), false, "giờ về ẩn khi Không đưa đón");
    assert.equal(await d.ev(hien("select[id^='dd-tra-']")), false, "nơi trả ẩn khi Không đưa đón");
    assert.deepEqual(await d.ev("[...document.querySelectorAll('#edit .actions button')].map((b) => b.textContent)"), ["Lưu bản mới", "Đóng"]);
    assert.equal(await d.ev("document.querySelector('#edit .dd-hanh-dong .dd-ghi').textContent"), "Áp dụng cho đơn lập từ bây giờ; đơn đã có không đổi.");
    assert.equal(await d.ev("document.querySelector('.dd-lich-su p').textContent"), "Chưa có lần đổi nào.");
    // Ô "Nơi trả gợi ý": "Không gợi ý" + điểm ĐANG DÙNG dạng "Tên · loại".
    const opts = await d.ev("[...document.querySelector('select[id^=\"dd-tra-\"]').options].map((o) => o.textContent)");
    assert.equal(opts[0], "Không gợi ý");
    assert.equal(opts.length, dsDiem.length + 1);
    assert.equal(opts[1], `${diemA.name} · ${diemA.locationTypeName.toLocaleLowerCase("vi")}`);
  });

  await step("3", "1040: chọn 'Một chiều' → hiện 'Nơi trả gợi ý' (giờ về vẫn ẩn) → chọn điểm → 'Lưu bản mới' → lịch sử 'Không đưa đón → Một chiều, nơi trả gợi ý …'; chip dòng đổi 'Một chiều'; máy chủ có bản mới", async () => {
    assert.equal(await d.ev(chonCheDo("ONE_WAY")), true);
    assert.equal(await d.ev(hien("select[id^='dd-tra-']")), true);
    assert.equal(await d.ev(hien("[id^='dd-gio-']")), false);
    assert.equal(await d.ev("document.querySelector('label.dd-chon').textContent.trim()"), "Một chiều");
    await d.ev(setInput("document.querySelector('select[id^=\"dd-tra-\"]')", diemA.id));
    await d.ev("document.querySelector('[data-action=\"dd-luu\"]').click(); true");
    await d.waitFor(`${dongLs}.length === 1`, "lịch sử 1 dòng");
    const [[luc, doi]] = await d.ev(dongLs);
    assert.match(luc, /^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/);
    assert.equal(doi, `Không đưa đón → Một chiều, nơi trả gợi ý ${diemA.name}`);
    assert.deepEqual(await d.ev("[...document.querySelectorAll('.dd-bang-ls th')].map((t) => t.textContent)"), ["Lúc", "Cũ → mới"]);
    assert.equal(await d.ev("document.querySelector('.dd-xong').textContent"), "Đã lưu bản mới.");
    assert.equal(await d.ev(chipBang("TD101")), "Một chiều");
    const r = await apiGet("/api/van-chuyen/mau-chang/TD101");
    assert.deepEqual([r.body.hienHanh.mode, r.body.hienHanh.returnTimeHint, r.body.hienHanh.noiTraMacDinh?.id], ["ONE_WAY", null, diemA.id]);
  });

  await step("4", "1040: chọn 'Hai chiều' → hiện 'Giờ về gợi ý' (gõ '1630' bằng bàn phím số) → lưu → dòng đầu 'Một chiều → Hai chiều, giờ về 16:30'; máy chủ 16:30, giữ nơi trả; ô gõ 16px; nút ≥ 44px", async () => {
    assert.equal(await d.ev(chonCheDo("ROUND_TRIP")), true);
    assert.equal(await d.ev(hien("[id^='dd-gio-']")), true);
    assert.equal(await d.ev("document.querySelector('input[id^=\"dd-gio-\"]').placeholder"), "Để trống nếu không có");
    assert.deepEqual(await d.ev("[...document.querySelectorAll('.dd-goi-y')].map((x) => x.textContent)"), ["Chỉ dùng khi Hai chiều", "Để trống nếu không gợi ý"]);
    await d.ev(setInput("document.querySelector('input[id^=\"dd-gio-\"]')", "1630"));
    await d.ev("document.querySelector('[data-action=\"dd-luu\"]').click(); true");
    await d.waitFor(`${dongLs}.length === 2`, "lịch sử 2 dòng");
    assert.deepEqual((await d.ev(dongLs)).map((x) => x[1]), ["Một chiều → Hai chiều, giờ về 16:30", `Không đưa đón → Một chiều, nơi trả gợi ý ${diemA.name}`]);
    assert.equal(await d.ev("document.querySelector('input[id^=\"dd-gio-\"]').value"), "16:30", "ô hiện lại đúng giờ máy chủ lưu");
    assert.equal(await d.ev(chipBang("TD101")), "Hai chiều");
    const r = await apiGet("/api/van-chuyen/mau-chang/TD101");
    assert.deepEqual([r.body.hienHanh.mode, r.body.hienHanh.returnTimeHint, r.body.hienHanh.noiTraMacDinh?.id], ["ROUND_TRIP", "16:30", diemA.id]);
    assert.equal(await d.ev(coChu("#edit input[type=text], #edit select")), 16, "ô gõ 16px");
    assert.ok((await d.ev(vungBam(".dd-che-do"))) >= 44, "thẻ chọn ≥ 44px");
    assert.ok(await d.ev(khongTranNgang), "1040: không tràn ngang");
    await shot(d, "m7-1040-khung-dua-don.png", "#edit");
    await axe(d, "1040 khung Đưa đón", "#edit");
  });

  await step("5", "1040: giờ sai '25:99' → câu tiếng Việt của máy chủ, không lộ mã; 'Đóng' ẩn khung", async () => {
    await d.ev(setInput("document.querySelector('input[id^=\"dd-gio-\"]')", "25:99"));
    await d.ev("document.querySelector('[data-action=\"dd-luu\"]').click(); true");
    await d.waitFor("!document.querySelector('#edit .alert').hidden", "báo lỗi");
    const loi = await d.ev("document.querySelector('#edit .alert').textContent");
    assert.match(loi, /Giờ đón gợi ý chiều về không hợp lệ/);
    assert.doesNotMatch(loi, CHU_ANH);
    assert.equal((await d.ev(dongLs)).length, 2, "không thêm bản");
    await d.ev("document.querySelector('[data-action=\"dd-dong\"]').click(); true");
    assert.equal(await d.ev("document.getElementById('edit').hidden"), true);
  });
  dong(d);

  // ================= 390 — Quản trị + Toàn quyền =================
  const m = await env.as(ACCOUNTS.chu, "/catalog", MOB);

  await step("6", "390 Quản trị + Toàn quyền: thẻ dịch vụ có chip ('Hai chiều' cho TD101, 'Không đưa đón' cho TTB03) cạnh tên, nút viên 'Đưa đón' sau 'Sửa giá'; không tràn ngang", async () => {
    await m.waitFor(`${chipThe("TD101")} !== null`, "chip ở thẻ TD101", 10000);
    assert.equal(await m.ev(chipThe("TD101")), "Hai chiều");
    assert.equal(await m.ev(chipThe("TTB03")), "Không đưa đón");
    assert.deepEqual((await m.ev(nutThe("TD101"))).slice(0, 2), ["Sửa giá", "Đưa đón"]);
    assert.ok(await m.ev(khongTranNgang), "390: không tràn ngang");
    await shot(m, "m7-390-the-dich-vu.png", '#list-cards [data-code="TD101"]');
  });

  await step("7", "390: bấm 'Đưa đón' → bảng trượt 'Đưa đón: Tour 4 đảo Nha Trang', Hai chiều đang chọn, giờ 16:30, nơi trả đã chọn, lịch sử 2 dòng (Lúc · trên, câu đổi dưới), nút đáy 'Lưu bản mới'; không tràn ngang", async () => {
    await m.ev(bamDuaDon("TD101", "the"));
    await m.waitFor("!!document.querySelector('.dd-sheet') && !document.querySelector('[data-action=\"dd-luu\"]').disabled", "bảng trượt tải xong");
    assert.equal(await m.ev("document.querySelector('.dd-sheet .sheet-title').textContent"), "Đưa đón: Tour 4 đảo Nha Trang");
    assert.equal(await m.ev(cheDoChon), "ROUND_TRIP");
    assert.equal(await m.ev("document.querySelector('input[id^=\"dd-gio-\"]').value"), "16:30");
    assert.equal(await m.ev("document.querySelector('select[id^=\"dd-tra-\"]').value"), diemA.id);
    assert.equal((await m.ev(dongLsDt)).length, 2);
    assert.equal((await m.ev(dongLsDt))[0][1], "Một chiều → Hai chiều, giờ về 16:30");
    assert.deepEqual(await m.ev("[...document.querySelectorAll('.dd-sheet .sheet-foot button')].map((b) => b.textContent)"), ["Lưu bản mới"]);
    assert.equal(await m.ev(coChu(".dd-sheet input[type=text], .dd-sheet select")), 16, "ô gõ 16px");
    assert.ok(await m.ev(khongTranNgang), "390: không tràn ngang");
    await sleep(400);
    await shot(m, "m7-390-bang-truot.png");
    await axe(m, "390 bảng trượt Đưa đón", ".dd-sheet");
  });

  await step("8", "390: đổi nơi trả sang điểm khác → lưu → dòng đầu 'Nơi trả gợi ý A → B'; rồi 'Không đưa đón' → lưu → 'Hai chiều → Không đưa đón', chip thẻ về 'Không đưa đón'", async () => {
    await m.ev(setInput("document.querySelector('select[id^=\"dd-tra-\"]')", diemB.id));
    await m.ev("document.querySelector('[data-action=\"dd-luu\"]').click(); true");
    await m.waitFor(`${dongLsDt}.length === 3`, "lịch sử 3 dòng");
    assert.equal((await m.ev(dongLsDt))[0][1], `Nơi trả gợi ý ${diemA.name} → ${diemB.name}`);
    assert.equal(await m.ev(chonCheDo("NONE")), true);
    assert.equal(await m.ev(hien("select[id^='dd-tra-']")), false);
    await m.ev("document.querySelector('[data-action=\"dd-luu\"]').click(); true");
    await m.waitFor(`${dongLsDt}.length === 4`, "lịch sử 4 dòng");
    assert.equal((await m.ev(dongLsDt))[0][1], "Hai chiều → Không đưa đón");
    assert.equal(await m.ev(chipThe("TD101")), "Không đưa đón");
    const r = await apiGet("/api/van-chuyen/mau-chang/TD101");
    assert.deepEqual([r.body.hienHanh.mode, r.body.hienHanh.returnTimeHint, r.body.hienHanh.noiTraMacDinh], ["NONE", null, null]);
    assert.doesNotMatch(await m.ev("document.querySelector('.dd-sheet').innerText"), CHU_ANH, "không chữ Anh / mã thô");
  });
  dong(m);

  // ================= Bán hàng (cuối cùng) =================
  const s = await env.as(ACCOUNTS.salesA, "/catalog", DESK);
  await step("9", "Bán hàng: /catalog bị từ chối bằng câu tiếng Việt, không có nút 'Đưa đón'; API lịch sử mẫu → 403", async () => {
    await s.waitFor("!document.getElementById('error').hidden", "câu từ chối");
    assert.equal(await s.ev("document.getElementById('error').textContent"), "Chỉ quản trị viên được vào trang này.");
    assert.equal(await s.ev("document.querySelectorAll('[data-dua-don]').length"), 0);
    const sa = await env.login(ACCOUNTS.salesA);
    assert.equal((await apiGet("/api/van-chuyen/mau-chang/TD101", sa)).status, 403);
  });
  dong(s);

  assert.deepEqual(loiConsole, [], `lỗi console: ${loiConsole.join(" | ")}`);
  console.log(`${passed} bước ✓ — ảnh ở ${OUT}`);
} finally {
  await env.stop();
}
