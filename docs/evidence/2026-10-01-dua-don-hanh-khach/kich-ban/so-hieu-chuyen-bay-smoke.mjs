// Số hiệu chuyến bay trên bảng điều phối + thẻ chuyến tài xế (nợ nhỏ 2026-10-01, docs/superpowers/plans/2026-10-01-dua-don-no-nho-nhat-ky.md việc 3; ADR-0055 C3 —
// số hiệu không chỉ ra người nên hiện như giờ, nơi hẹn). Dữ liệu thử của dp-lib (ADR-0049 B1–B3); số hiệu đặt thẳng vào chặng trên D1 tạm (O5 chưa xếp, O1 ở T1).
//   1) 390 Bán hàng /dieu-phoi: thẻ chặng O5 ở cột "Chưa xếp" có chip "✈︎ VN1553"; thẻ chặng không có số hiệu thì không chip; không tràn ngang.
//   2) 1040 Bán hàng: như trên ở cột "Chưa xếp" máy tính.
//   3) 390 tài xế An (mở SAU CÙNG — các trang dùng chung kho cookie) /cuoc-chuyen T1 (chưa xuất bến): dưới điểm đón có "✈︎ QH201", điểm trả không có.
// Chạy từ GỐC repo, sau `npm run build:web` (không cần mạng ngoài):
//   AXE_JS=<…/axe.min.js> CHROME_BIN=docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh node docs/evidence/2026-10-01-dua-don-hanh-khach/kich-ban/so-hieu-chuyen-bay-smoke.mjs
// Ảnh ghi vào $OUT (mặc định docs/evidence/2026-10-01-dua-don-hanh-khach). axe chỉ quét vùng đổi (thanh bên đỏ sẵn ở tương phản chữ thương hiệu — không thuộc việc này).
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ACCOUNTS, CHU, DESK, MOB, assert, boDem, dungDuLieuDieuPhoi, dungMoiTruong, noOverflowX, sleep } from "../../2026-09-29-adr-0049/kich-ban/dp-lib.mjs";

const OUT = process.env.OUT ?? "docs/evidence/2026-10-01-dua-don-hanh-khach";
mkdirSync(OUT, { recursive: true });
const AXE = process.env.AXE_JS ? readFileSync(process.env.AXE_JS, "utf8") : null;
const axeVung = async (p, label, vung) => {
  if (!AXE) return console.log(`  (axe bỏ qua ở ${label}: chưa đặt AXE_JS)`);
  if (!(await p.ev("typeof axe !== 'undefined'"))) await p.ev(`${AXE}\n;true`);
  const v = await p.ev(`axe.run(document.querySelector(${JSON.stringify(vung)})).then((r) => r.violations.map((x) => ({ id: x.id, impact: x.impact })))`);
  assert.deepEqual(v.filter((x) => x.impact === "critical" || x.impact === "serious"), [], `axe (${label}): ${JSON.stringify(v)}`);
};
const anh = async (p, name, sel) => {
  await p.ev(`document.querySelector(${JSON.stringify(sel)}).scrollIntoView({ block: 'start' }); if (innerWidth < 700) scrollBy(0, -72); true`);
  await sleep(300);
  writeFileSync(join(OUT, name), Buffer.from((await p.send("Page.captureScreenshot", { format: "png" })).result.data, "base64"));
};

const { env, call } = await dungMoiTruong([CHU]);
const b = boDem("SO HIEU CHUYEN BAY SMOKE");
const d = await dungDuLieuDieuPhoi(env, call);
env.sql(`UPDATE ord_transfer_leg SET flight_code = 'VN1553' WHERE id = '${d.O5.legId}'`);
env.sql(`UPDATE ord_transfer_leg SET flight_code = 'QH201' WHERE id = '${d.O1.legId}'`);
const cho = (p) => p.waitFor(`!document.getElementById('dp-trang').hidden && !!document.querySelector('#dp-cot-xe .dp-tl-card')`, "bảng điều phối dựng xong");
const chipChang = (legId) => `[...document.querySelectorAll('#dp-cot-chua-xep .dp-leg[data-leg="${legId}"] .chip-code')].map((x) => x.textContent)`;

try {
  for (const [id, kho, ten] of [["1", MOB, "390"], ["2", DESK, "1040"]]) {
    const p = await env.as(ACCOUNTS.salesA, `/dieu-phoi?ngay=${d.NGAY_XA}`, kho);
    await b.step(id, `${ten} Bán hàng /dieu-phoi: thẻ chặng O5 (cột "Chưa xếp") có chip "✈︎ VN1553"; chặng O4 (không số hiệu) không chip; không tràn ngang`, async () => {
      await cho(p);
      await p.waitFor(`!!document.querySelector('#dp-cot-chua-xep .dp-leg[data-leg="${d.O5.legId}"]')`, "thẻ O5");
      assert.deepEqual(await p.ev(chipChang(d.O5.legId)), ["✈︎ VN1553"]);
      const o4 = await p.ev(`!!document.querySelector('#dp-cot-chua-xep .dp-leg[data-leg="${d.O4.legId}"]')`);
      if (o4) assert.deepEqual(await p.ev(chipChang(d.O4.legId)), [], "chặng không số hiệu: không chip");
      assert.ok(await p.ev(noOverflowX), `${ten}: không tràn ngang`);
      await axeVung(p, `${ten} cột Chưa xếp`, "#dp-cot-chua-xep");
      await anh(p, `so-hieu-dieu-phoi-${ten}.png`, `#dp-cot-chua-xep .dp-leg[data-leg="${d.O5.legId}"]`);
    });
    p.close();
  }

  const t = await env.as(d.AN.account, `/cuoc-chuyen?id=${d.T1.id}`, MOB);
  await b.step("3", `390 tài xế An /cuoc-chuyen ${d.T1.ma} (chưa xuất bến): dưới điểm đón có "✈︎ QH201", điểm trả không; không tên khách; không tràn ngang`, async () => {
    await t.waitFor("document.querySelectorAll('.dp-cc-diem .dp-run').length > 0", "điểm của chuyến");
    const diem = await t.ev(`[...document.querySelectorAll('.dp-cc-diem .dp-run')].map((x) => ({ chu: x.innerText.replace(/\\s+/g, ' ').trim(), bay: [...x.querySelectorAll('.dp-run-bay .chip-code')].map((c) => c.textContent) }))`);
    const don = diem.filter((x) => /ĐÓN/.test(x.chu));
    const tra = diem.filter((x) => /TRẢ/.test(x.chu));
    assert.ok(don.length >= 1 && tra.length >= 1, JSON.stringify(diem));
    assert.deepEqual(don.map((x) => x.bay), don.map(() => ["✈︎ QH201"]), JSON.stringify(diem));
    assert.deepEqual(tra.flatMap((x) => x.bay), [], "điểm trả không chip số hiệu");
    assert.doesNotMatch(await t.ev("document.querySelector('main').innerText"), /Hành Khách Thử/, "không tên khách trước ngày chạy");
    assert.ok(await t.ev(noOverflowX), "390: không tràn ngang");
    await axeVung(t, "390 điểm của chuyến", ".dp-cc-diem");
    await anh(t, "so-hieu-tai-xe-390.png", ".dp-cc-diem");
  });
  t.close();
  b.xong();
} finally {
  await env.stop();
}
