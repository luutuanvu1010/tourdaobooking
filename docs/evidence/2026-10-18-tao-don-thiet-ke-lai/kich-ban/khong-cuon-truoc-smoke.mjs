// Kịch bản Chrome — vị trí thật KHÔNG cuộn trước khi chạm (vòng sửa cuối 19/10/2026 của màn Tạo đơn thiết kế lại; hai phát hiện của rà soát toàn nhánh).
// Vì sao có kịch bản riêng: `cham()` của cham-that.mjs cuộn mục tiêu ra GIỮA khung trước khi chạm, nên không bao giờ thấy được hai lỗi dưới đây (ô nằm sát thanh dính lúc chạm;
// trang đang ở đầu khi khung lỗi hiện). Ở đây ô được đặt đúng chỗ người dùng hay gặp rồi mới chạm, và chỉ đo — không cuộn hộ.
//   D (điện thoại 375×667 và 390×844, chạm cảm ứng thật): ô "Nơi đón" / "Nơi trả" nằm ngay trên thanh Lưu dính đáy (`#order-form .form-actions`), chạm ô → danh sách gợi ý
//     (`ul[role=listbox]`) phải nằm TRỌN trên thanh dính (đáy danh sách ≤ đỉnh thanh) và ô gõ không bị đẩy lên dưới thanh bước / thanh trên. Ca thanh dính CAO (khung lỗi lưu
//     dài đang hiện, 375×667): ô gõ phải trọn trong vùng giữa hai thanh và ít nhất một dòng gợi ý (44px) lộ trên thanh.
//   E (1040×768, chuột): ở ĐẦU trang, khi khung lỗi lưu một dòng đang hiện (chỉ thiếu tên khách), nút "Lưu, chờ xác nhận" của cột phải phải trọn trong khung nhìn
//     (SYSTEM-DESIGN §9 "luôn thấy"). In thêm vị trí nút lúc form trống để so với bản gốc 0780d014 (rà soát đo: 619px gốc, 659px HEAD f56f9ef9; có lỗi một dòng 717–763 → 753–799).
// Môi trường: D1 tạm + wrangler dev + Chrome headless qua CDP (docs/evidence/2026-09-20-a2/kich-ban/a2-cdp.mjs) — Turnstile TẮT, danh mục giả (TD101). Không chụp ảnh, không ghi tệp.
// Chạy từ GỐC repo, sau `npm run build:web`:
//   CHROME_BIN=$PWD/docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh node docs/evidence/2026-10-18-tao-don-thiet-ke-lai/kich-ban/khong-cuon-truoc-smoke.mjs
// Cuối cùng in "KHONG CUON TRUOC SMOKE OK" hoặc danh sách bước đỏ (thoát 1).
import assert from "node:assert/strict";
import { ACCOUNTS, ok, setInput, sleep, startEnv, vnDate } from "../../2026-09-20-a2/kich-ban/a2-cdp.mjs";
import { cham, dsCua, phim } from "./cham-that.mjs";

const env = await startEnv();
const loi = [];
async function buoc(id, ten, fn) {
  try {
    await fn();
    ok(`${id}) ${ten}`);
  } catch (e) {
    loi.push(`${id}) ${ten}: ${String(e?.message ?? e).split("\n")[0]}`);
    console.log(`✗ ${id}) ${ten}\n    ${String(e?.message ?? e).split("\n").slice(0, 8).join("\n    ")}`);
  }
}

const THE = "document.querySelectorAll('#services .svc')";
const oNoi = (loai) => `${THE}[0].querySelectorAll('.dd-chang')[0].querySelector('[data-o$=":${loai}"]')`;
const THANH = "document.querySelector('#order-form .form-actions')";
const NGAY = vnDate(4);

async function moForm(vp) {
  const p = await env.as(ACCOUNTS.salesA, "/order-form", vp);
  await p.waitFor("!!document.getElementById('catalog-q') && !document.getElementById('catalog-q').disabled", "ô tìm danh mục sẵn sàng", 15000);
  await sleep(600);
  await p.ev(setInput("document.getElementById('orderDate')", NGAY));
  return p;
}
async function themTD101(p, coDuaDon) {
  await p.ev("document.getElementById('catalog-q').focus(); true");
  await p.ev(setInput("document.getElementById('catalog-q')", "TD101"));
  await p.waitFor("document.querySelectorAll('#catalog-list .catalog-pick').length === 1", "lọc TD101");
  await p.ev("document.querySelector('#catalog-list .catalog-pick').click(); true");
  await p.waitFor(`${THE}.length === 1`, "thẻ TD101");
  await sleep(250);
  await p.ev(setInput(`${THE}[0].querySelector('.counter-field[aria-label="Người lớn"]')`, "2"));
  if (coDuaDon) {
    await p.ev(`${THE}[0].querySelector('[data-action="them-dua-don"]').click(); true`);
    await p.waitFor(`!!${oNoi("don")}`, "chặng đưa đón");
  }
  await sleep(250);
}

/** Đặt ô `o` sao cho đáy ô cách đỉnh thanh dính `khe` px (cuộn trang bằng mã — người dùng tự cuộn tới đó), rồi đo các mép. */
const datSatThanh = (o, khe = 8) => `(() => { const o = ${o}, t = ${THANH}; window.scrollBy(0, Math.round(o.getBoundingClientRect().bottom - (t.getBoundingClientRect().top - ${khe}))); return true; })()`;
const doViTri = (o) => `(() => { const o = ${o}, ds = document.getElementById(o.getAttribute('aria-controls')), t = ${THANH}, b = document.querySelector('.buoc-thanh');
  const r = (e) => { const x = e.getBoundingClientRect(); return [Math.round(x.top), Math.round(x.bottom)]; };
  return { mo: !!ds && !ds.hidden, o: r(o), ds: ds && !ds.hidden ? r(ds) : null, thanh: r(t), buoc: r(b), khung: innerHeight, cuon: Math.round(scrollY) }; })()`;

async function caDien(kho, vp) {
  const p = await moForm(vp);
  await themTD101(p, true);
  for (const loai of ["don", "tra"]) {
    await buoc(`D-${kho}-${loai}`, `${kho}: ô ${loai === "don" ? "Nơi đón" : "Nơi trả"} sát thanh Lưu dính, chạm (không cuộn trước) → danh sách gợi ý trọn trên thanh, ô không bị đẩy dưới thanh bước`, async () => {
      await p.ev(datSatThanh(oNoi(loai)));
      await sleep(300);
      const truoc = await p.ev(doViTri(oNoi(loai)));
      assert.ok(truoc.o[1] <= truoc.thanh[0] && truoc.o[0] >= truoc.buoc[1], `kịch bản phải đặt được ô ngay trên thanh, giữa hai thanh: ${JSON.stringify(truoc)}`);
      await cham(p, true, oNoi(loai), false);
      try {
        await p.waitFor(`(() => { const ds = ${dsCua(oNoi(loai))}; return !!ds && !ds.hidden; })()`, "danh sách gợi ý mở");
        await sleep(500);
        const v = await p.ev(doViTri(oNoi(loai)));
        console.log(`    số đo ${kho} ${loai}: trước ${JSON.stringify(truoc)} → sau ${JSON.stringify(v)}`);
        assert.ok(v.ds[1] <= v.thanh[0] + 1, `đáy danh sách (${v.ds[1]}) ≤ đỉnh thanh dính (${v.thanh[0]}): ${JSON.stringify(v)}`);
        assert.ok(v.o[0] >= v.buoc[1] - 1, `ô gõ không bị đẩy dưới thanh bước (ô ${v.o[0]}, đáy thanh bước ${v.buoc[1]}): ${JSON.stringify(v)}`);
      } finally {
        // Đóng danh sách CẢ KHI bước đỏ: danh sách còn mở (nằm trong dòng chảy trang) làm sai vị trí của bước sau.
        await phim(p, "Escape");
        await p.waitFor(`(() => { const ds = ${dsCua(oNoi(loai))}; return !ds || ds.hidden; })()`, "Esc đóng danh sách");
      }
    });
  }
  if (kho === "375") {
    await buoc("D-375-thanh-cao", "375: thanh dính CAO (khung lỗi lưu dài đang hiện) — chạm ô Nơi đón sát thanh → ô trọn giữa thanh bước và thanh dính, ít nhất một dòng gợi ý (44px) lộ trên thanh", async () => {
      await p.ev("window.scrollTo(0, 0); true");
      await p.ev("document.getElementById('save').click(); true"); // thiếu tên + SĐT khách → khung lỗi nhiều dòng trong thanh dính
      await p.waitFor("!document.getElementById('save-error').hidden", "khung lỗi lưu");
      await sleep(500);
      const caoThanh = await p.ev(`Math.round(${THANH}.getBoundingClientRect().height)`);
      assert.ok(caoThanh >= 200, `kịch bản phải dựng được thanh dính cao (đang ${caoThanh}px)`);
      await p.ev(datSatThanh(oNoi("don")));
      await sleep(300);
      await cham(p, true, oNoi("don"), false);
      try {
        await p.waitFor(`(() => { const ds = ${dsCua(oNoi("don"))}; return !!ds && !ds.hidden; })()`, "danh sách gợi ý mở");
        await sleep(500);
        const v = await p.ev(doViTri(oNoi("don")));
        console.log(`    số đo 375 thanh cao (${caoThanh}px): ${JSON.stringify(v)}`);
        assert.ok(v.o[0] >= v.buoc[1] - 1 && v.o[1] <= v.thanh[0] + 1, `ô gõ trọn giữa thanh bước và thanh dính: ${JSON.stringify(v)}`);
        assert.ok(v.ds[0] + 44 <= v.thanh[0] + 1, `ít nhất một dòng gợi ý lộ trên thanh: ${JSON.stringify(v)}`);
      } finally {
        await phim(p, "Escape");
      }
    });
  }
  p.close();
}

try {
  await caDien("375", { width: 375, height: 667, mobile: true });
  await caDien("390", { width: 390, height: 844, mobile: true });

  const p = await moForm({ width: 1040, height: 768, mobile: false });
  const doLuu = `(() => { const s = document.getElementById('save').getBoundingClientRect(), e = document.getElementById('save-error'); const re = e.hidden ? null : e.getBoundingClientRect();
    return { luu: [Math.round(s.top), Math.round(s.bottom)], loi: re ? [Math.round(re.top), Math.round(re.bottom)] : null, khung: innerHeight, cuon: Math.round(scrollY) }; })()`;
  await buoc("E-1040-yen", "1040×768, form vừa mở, đầu trang: nút Lưu trọn trong khung (in số đo để so với bản gốc 619px)", async () => {
    await p.ev("window.scrollTo(0, 0); true");
    await sleep(300);
    const v = await p.ev(doLuu);
    console.log(`    số đo 1040 đứng yên: ${JSON.stringify(v)}`);
    assert.ok(v.luu[1] <= v.khung, `nút Lưu trọn trong khung: ${JSON.stringify(v)}`);
  });
  await buoc("E-1040-loi", "1040×768, đầu trang, khung lỗi lưu MỘT dòng (chỉ thiếu tên khách) đang hiện: nút Lưu trọn trong khung", async () => {
    await themTD101(p, false);
    await p.ev(setInput("document.getElementById('customerPhone')", "0912345697"));
    await p.ev("document.getElementById('save').click(); true");
    await p.waitFor("!document.getElementById('save-error').hidden", "khung lỗi lưu");
    await sleep(400);
    await p.ev("window.scrollTo(0, 0); true");
    await sleep(300);
    const v = await p.ev(doLuu);
    const dong = await p.ev("[...document.querySelectorAll('#save-error li')].map((x) => x.textContent.trim())");
    console.log(`    số đo 1040 có lỗi một dòng: ${JSON.stringify(v)} — dòng lỗi: ${JSON.stringify(dong)}`);
    assert.equal(dong.length, 1, `khung lỗi đúng MỘT dòng: ${JSON.stringify(dong)}`);
    assert.ok(v.luu[1] <= v.khung, `nút Lưu trọn trong khung 1040×768: ${JSON.stringify(v)}`);
  });
  p.close();
} finally {
  await env.stop();
}
if (loi.length) {
  console.log(`\nKHONG CUON TRUOC SMOKE ĐỎ (${loi.length} bước):\n- ${loi.join("\n- ")}`);
  process.exit(1);
}
console.log("KHONG CUON TRUOC SMOKE OK");
