// Cảnh báo sớm LÚC XẾP XE (lời chủ 1/10 "có cảnh báo sớm, chỉ cảnh báo, không chặn" — kế hoạch docs/superpowers/plans/2026-10-01-giao-dien-dua-don-hanh-khach.md
// tiêu chí 6, phần xếp). Bảng điều phối /dieu-phoi: xếp chặng O5 (nơi trả CHƯA chốt, đủ 5 tên) → máy chủ VẪN xếp (200), dải VÀNG "Đã xếp … " kèm câu
// "Chặng chưa có nơi trả: <mã đơn> — cần bổ sung ở đơn trước khi xe chạy."; không dải xanh. Hai khổ: 390 (thẻ "Chưa xếp" → nút viên "Xếp vào chuyến…") và
// 1040 (bấm thẻ chặng). Dùng lại dữ liệu thử của dp-lib (ADR-0049 B1–B3). Bán hàng thao tác; Kế toán không liên quan.
// Chạy từ GỐC repo, sau `npm run build:web` (không cần mạng ngoài):
//   AXE_JS=<…/axe.min.js> CHROME_BIN=docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh node docs/evidence/2026-10-01-dua-don-hanh-khach/kich-ban/canh-bao-xep-smoke.mjs
// Ảnh ghi vào $OUT (mặc định docs/evidence/2026-10-01-dua-don-hanh-khach). Lưu ý: axe của kịch bản cũ quét CẢ trang và đang đỏ sẵn ở chữ thương hiệu thanh bên
// (1040) — không thuộc việc này; ở đây axe chỉ quét dải kết quả.
import { randomUUID } from "node:crypto";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { ACCOUNTS, CHU, DESK, MOB, assert, boDem, click, dungDuLieuDieuPhoi, dungMoiTruong, noOverflowX, sleep, txt } from "../../2026-09-29-adr-0049/kich-ban/dp-lib.mjs";
import { readFileSync, mkdirSync } from "node:fs";

const OUT = process.env.OUT ?? "docs/evidence/2026-10-01-dua-don-hanh-khach";
mkdirSync(OUT, { recursive: true });
const AXE = process.env.AXE_JS ? readFileSync(process.env.AXE_JS, "utf8") : null;
const axeVung = async (p, label, vung) => {
  if (!AXE) return console.log(`  (axe bỏ qua ở ${label}: chưa đặt AXE_JS)`);
  if (!(await p.ev("typeof axe !== 'undefined'"))) await p.ev(`${AXE}\n;true`);
  const v = await p.ev(`axe.run(document.querySelector(${JSON.stringify(vung)})).then((r) => r.violations.map((x) => ({ id: x.id, impact: x.impact })))`);
  assert.deepEqual(v.filter((x) => x.impact === "critical" || x.impact === "serious"), [], `axe (${label}): ${JSON.stringify(v)}`);
};
const anh = async (p, name) => {
  await p.ev("document.querySelector('#dp-banner').scrollIntoView({ block: 'start' }); if (innerWidth < 700) scrollBy(0, -72); true");
  await sleep(300);
  writeFileSync(join(OUT, name), Buffer.from((await p.send("Page.captureScreenshot", { format: "png" })).result.data, "base64"));
};

const { env, call } = await dungMoiTruong([CHU]);
const b = boDem("CANH BAO XEP SMOKE");
const d = await dungDuLieuDieuPhoi(env, call);
// T5 như dieu-phoi-smoke: chuyến trống 10:30–12:30 cho chặng O5 (11:00, nơi trả chưa chốt).
const t5 = await call(ACCOUNTS.admin, "POST", "/api/van-chuyen/chuyen", { requestId: randomUUID(), xeId: d.XE_A.id, taiXePartyId: d.CUONG.partyId, batDau: { ngay: d.NGAY_XA, gio: "10:30" }, ketThuc: { ngay: d.NGAY_XA, gio: "12:30" } });
assert.equal(t5.status, 201, `tạo T5: ${t5.text}`);
const T5 = t5.json.chuyen;
const cho = (p) => p.waitFor(`!document.getElementById('dp-trang').hidden && !!document.querySelector('#dp-cot-xe .dp-tl-card')`, "bảng điều phối dựng xong");
const dongCanhBao = "[...document.querySelectorAll('#dp-banner .banner-warning li')].map((x) => x.innerText.trim())";
const CAU = `Lượt đưa đón chưa có nơi trả: ${d.O5.ma} — cần bổ sung ở đơn trước khi xe chạy.`;
const xepQuaHop = async (p, so) => {
  await p.waitFor(`!!document.querySelector('[data-action="xep-gui"]')`, "hộp xếp mở");
  await sleep(500);
  await p.ev(click(`.dp-sheet-xep .vc-reason[data-code="${T5.id}"]`));
  if (so !== null) await p.ev(`(() => { const o = document.querySelector('#dp-xep-so'); o.value = '${so}'; o.dispatchEvent(new Event('input', { bubbles: true })); return true; })()`);
  await p.ev(click('[data-action="xep-gui"]'));
};

try {
  const pm = await env.as(ACCOUNTS.salesA, `/dieu-phoi?ngay=${d.NGAY_XA}`, MOB);
  await b.step("1", `390 Bán hàng: thẻ "Chưa xếp" → "Xếp vào chuyến…" chặng O5 (nơi trả chưa chốt) → xếp 2/5 vào ${T5.ma} → dải VÀNG "Đã xếp 2 khách…" + câu nhắc nơi trả + câu còn lại; không dải xanh; không tràn ngang`, async () => {
    await cho(pm);
    await pm.ev(click(`#dp-cot-chua-xep .dp-leg[data-leg="${d.O5.legId}"] .dp-leg-pill`));
    await xepQuaHop(pm, 2);
    await pm.waitFor(`${txt("#dp-banner .banner-warning .banner-title")} === 'Đã xếp 2 khách vào ${T5.ma}'`, "dải đã xếp (cảnh báo)");
    assert.deepEqual(await pm.ev(dongCanhBao), [CAU, `Còn 3 khách của ${d.O5.ma} ở cột “Chưa xếp”.`]);
    assert.equal(await pm.ev("document.querySelector('#dp-banner .banner-warning').getAttribute('role')"), "alert");
    assert.equal(await pm.ev("!!document.querySelector('#dp-banner .dp-banner-ok')"), false);
    assert.doesNotMatch(await pm.ev("document.querySelector('#dp-banner').innerText"), /CHUA_CO_NOI_TRA|THIEU_TEN|Hành Khách Thử/, "không mã thô, không tên khách");
    assert.ok(await pm.ev(noOverflowX), "390: không tràn ngang");
    await axeVung(pm, "390 dải cảnh báo", "#dp-banner");
    await anh(pm, "canh-bao-xep-390.png");
  });
  pm.close();

  const p = await env.as(ACCOUNTS.salesA, `/dieu-phoi?ngay=${d.NGAY_XA}`, DESK);
  await b.step("2", `1040 Bán hàng: bấm thẻ chặng O5 (còn 3) → xếp nốt vào ${T5.ma} → dải VÀNG chỉ câu nhắc nơi trả; chuyến vẫn nhận khách (cột Chưa xếp trống)`, async () => {
    await cho(p);
    await p.ev(click(`#dp-cot-chua-xep .dp-leg[data-leg="${d.O5.legId}"]`));
    await xepQuaHop(p, null);
    await p.waitFor(`${txt("#dp-banner .banner-warning .banner-title")} === 'Đã xếp 3 khách vào ${T5.ma}'`, "dải đã xếp (cảnh báo)");
    assert.deepEqual(await p.ev(dongCanhBao), [CAU]);
    await p.waitFor("!!document.querySelector('#dp-cot-chua-xep .dp-col-empty')", "cột Chưa xếp trống");
    assert.ok(await p.ev(noOverflowX), "1040: không tràn ngang");
    await axeVung(p, "1040 dải cảnh báo", "#dp-banner");
    await anh(p, "canh-bao-xep-1040.png");
  });
  p.close();
  b.xong();
} finally {
  await env.stop();
}
