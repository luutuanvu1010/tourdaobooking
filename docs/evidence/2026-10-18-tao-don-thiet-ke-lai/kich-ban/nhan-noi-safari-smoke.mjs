// Kịch bản WebKit (bộ máy của Safari) — vòng sửa sau production 19/10/2026 (Việc 12). Chủ dự án thử bằng tài khoản ĐỐI TÁC trên Safari máy Mac, báo hai lỗi:
//   (1) "hiển thị đang bị trùng các dòng": nhãn nổi "Hình thức" / "Người thu tiền" ĐÈ lên chữ giá trị của ô chọn một ở khối Thanh toán. Chỉ WebKit: khuôn ô chọn của máy bỏ
//       đệm trên + chiều cao tối thiểu của tác giả (padding-top 0px, min-height 18px, cao 25px) — Chrome tôn trọng 24px / 52px nên thanh-dinh-smoke (Chrome) không bao giờ đỏ.
//   (2) "không nhìn thấy phần thông tin đưa đón": thẻ gập (chỉ một thẻ mở, mục 3C) của dịch vụ KHÔNG có chặng chỉ còn "1 NL" — không nói gì về đưa đón.
// Kiểm (D1 tạm, không cần mạng ngoài), cho Đối tác rồi Bán hàng, ở iPhone 13 (390, cảm ứng) và máy tính 1040:
//   a) mọi ô nhãn nổi "luôn thu nhỏ" đang hiện (Ngày khởi hành, Giờ đón, Ngày đón, các ô ngày / giờ của Thông tin chuyến): hộp nhãn KHÔNG giao vùng chữ của ô (đáy nhãn ≤ đỉnh
//      vùng nội dung = đỉnh ô + viền + đệm trên) và ô cao ≥ --h-field;
//   b) nhập trả trước 1.000.000 → "Hình thức", "Người thu tiền": như (a), cao ≥ ô "Thanh toán trước", nhãn thẳng mép trái chữ (lệch ≤ 2px), có mũi tên tự vẽ, chừa chỗ phải;
//   c) thêm TD101 (có mẫu chặng), TTB06, TTB03 → thẻ TTB06 gập, dòng gập có "Không đưa đón"; thẻ TD101 gập vẫn có chip "Chưa chốt giờ đón" / "Chưa có nơi đón".
// Ảnh (chụp TRƯỚC khi khẳng định — chạy trên mã cũ với TIEN_TO=truoc cũng có ảnh): $OUT/<TIEN_TO>-<vai>-<khổ>-thanh-toan.png, -the-gap-1.png (TD101 gập), -the-gap-2.png
// (Motor nước gập) — mặc định OUT = docs/evidence/2026-10-18-tao-don-thiet-ke-lai/nhan-noi-safari, TIEN_TO = sau.
// CẦN playwright-core (ngoài repo — dự án không có phụ thuộc) + bản WebKit của nó đã tải: PW_CORE=<đường dẫn thư mục playwright-core>. Thiếu → in "CHƯA CHẠY WebKit" và thoát 2
// (KHÔNG phải xanh). Chạy từ GỐC repo, sau `npm run build:web`:
//   PW_CORE=<…/node_modules/playwright-core> CHROME_BIN=$PWD/docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh node docs/evidence/2026-10-18-tao-don-thiet-ke-lai/kich-ban/nhan-noi-safari-smoke.mjs
// (startEnv của a2-cdp.mjs vẫn mở Chrome headless — không dùng ở đây.) Cuối cùng in "NHAN NOI SAFARI SMOKE OK" hoặc danh sách bước đỏ (thoát 1).
import assert from "node:assert/strict";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { ACCOUNTS, ok, startEnv, vnDate } from "../../2026-09-20-a2/kich-ban/a2-cdp.mjs";

const PW = process.env.PW_CORE;
if (!PW || !existsSync(join(PW, "package.json"))) {
  console.log("CHƯA CHẠY WebKit: thiếu PW_CORE (thư mục playwright-core) — kịch bản này KHÔNG xanh khi chưa chạy.");
  process.exit(2);
}
const { webkit, devices } = await import(pathToFileURL(join(PW, "index.mjs")).href);
const OUT = process.env.OUT ?? "docs/evidence/2026-10-18-tao-don-thiet-ke-lai/nhan-noi-safari";
const TIEN_TO = process.env.TIEN_TO ?? "sau";
mkdirSync(OUT, { recursive: true });
const NGAY = vnDate(5);
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

/** Đo các ô nhãn nổi "luôn thu nhỏ" đang hiện trong form (chạy trong trang). Trả mỗi ô: id/nhãn, đáy nhãn, đỉnh vùng nội dung, cao, --h-field, đệm trên, kiểu vẽ. */
function doONhanNoi() {
  const hField = (() => { const d = document.createElement("div"); d.style.height = "var(--h-field)"; document.body.append(d); const v = d.getBoundingClientRect().height; d.remove(); return v; })();
  return [...document.querySelectorAll("#order-form .o-noi-khung.o-noi-co-dinh > :is(input, select)")].filter((e) => e.getClientRects().length > 0).map((e) => {
    const r = e.getBoundingClientRect(), s = getComputedStyle(e), nhan = e.parentElement.querySelector(".o-noi-chu"), rn = nhan.getBoundingClientRect();
    const dinhNoiDung = r.top + parseFloat(s.borderTopWidth) + parseFloat(s.paddingTop);
    return { o: e.id || e.getAttribute("data-trip") || e.type, nhan: nhan.textContent, day: Math.round(rn.bottom * 10) / 10, dinhNoiDung: Math.round(dinhNoiDung * 10) / 10, cao: Math.round(r.height), hField, pt: s.paddingTop, ve: s.appearance || s.webkitAppearance,
      lechTrai: Math.round(Math.abs(rn.left - (r.left + parseFloat(s.borderLeftWidth) + parseFloat(s.paddingLeft))) * 10) / 10, nen: s.backgroundImage, pr: parseFloat(s.paddingRight) };
  });
}
const loiChong = (ds) => ds.filter((x) => x.day > x.dinhNoiDung + 0.5 || x.cao < x.hField - 1).map((x) => `${x.o} «${x.nhan}»: đáy nhãn ${x.day} > đỉnh chữ ${x.dinhNoiDung} hoặc cao ${x.cao} < ${x.hField} (đệm trên ${x.pt}, vẽ ${x.ve})`);

const env = await startEnv();
const browser = await webkit.launch();
try {
  const { insertStaffSql } = await import(pathToFileURL(join(process.cwd(), "scripts", "staff-lib.mjs")).href);
  // Đối tác gieo thẳng quyền PARTNER (như nhánh dự phòng của doi-tac-lap-don-smoke.mjs): holdsPartner / chiGiaDanhMuc chỉ xét quyền nên đủ cho kiểm giao diện.
  const PARTNER = { name: "Đối Tác Safari", phone: "0900000281", pin: "246881", permissions: ["PARTNER"] };
  for (const stmt of (await insertStaffSql(PARTNER)).split("\n")) if (stmt.trim()) env.sql(stmt);
  const T = "'2026-10-01T00:00:00.000Z'";
  const GA = "11111111-aaaa-4aaa-8aaa-000000000003";
  env.sql(`INSERT INTO loc_location (id, code, name, location_type_code, sort_order, created_at, updated_at) VALUES ('${GA}', 'GA_CAP_TREO', 'Ga cáp treo Vinpearl', 'CABLE_CAR', 22, ${T}, ${T});`);
  const ad = await env.login(ACCOUNTS.admin);
  const rm = await fetch(`${env.base}/api/van-chuyen/mau-chang/TD101`, { method: "POST", headers: { "content-type": "application/json", origin: env.base, cookie: `${ad.name}=${ad.value}` }, body: JSON.stringify({ mode: "ROUND_TRIP", returnTimeHint: "16:30", noiTraMacDinhId: GA }) });
  assert.ok(rm.status === 200 || rm.status === 201, `mẫu chặng TD101: ${rm.status}`);

  for (const [vai, acc] of [["doi-tac", PARTNER], ["ban-hang", ACCOUNTS.salesA]]) {
    for (const [kho, vp] of [["390", { ...devices["iPhone 13"] }], ["1040", { viewport: { width: 1040, height: 768 }, deviceScaleFactor: 1 }]]) {
      const ctx = await browser.newContext(vp);
      const page = await ctx.newPage();
      const loiTrang = [];
      page.on("pageerror", (e) => loiTrang.push(e.message));
      const id = `${vai}-${kho}`;
      try {
        const c = await env.login(acc);
        await ctx.addCookies([{ name: c.name, value: c.value, url: env.base, httpOnly: true }]);
        await page.goto(env.base + "/order-form", { waitUntil: "load" });
        await page.waitForFunction(() => !!document.getElementById("catalog-q") && !document.getElementById("catalog-q").disabled, null, { timeout: 20000 });
        await page.waitForTimeout(600);
        const dat = (sel, v) => page.evaluate(([s, val]) => { const el = document.querySelector(s); el.value = val; el.dispatchEvent(new Event("input", { bubbles: true })); el.dispatchEvent(new Event("change", { bubbles: true })); }, [sel, v]);
        await dat("#orderDate", NGAY);
        const chon = async (tim, n) => {
          await page.evaluate(() => document.getElementById("catalog-q").focus());
          await dat("#catalog-q", tim);
          await page.waitForFunction(() => document.querySelectorAll("#catalog-list .catalog-pick").length === 1);
          await page.locator("#catalog-list .catalog-pick").first().click();
          await page.waitForFunction((k) => document.querySelectorAll("#services .svc").length === k, n);
          await page.waitForTimeout(300);
        };

        await buoc(`${id}-a`, "ô ngày / giờ nhãn nổi (Ngày khởi hành, Giờ đón, Ngày đón, Thông tin chuyến): nhãn không đè chữ, ô cao ≥ --h-field", async () => {
          await chon("TD101", 1);
          await page.locator('#services .svc [data-action="don-khac-ngay"]').first().click();
          await page.evaluate(() => { const d = document.querySelector("#services .svc details.trip"); if (d) d.open = true; });
          await page.waitForTimeout(200);
          const ds = await page.evaluate(doONhanNoi);
          const ten = ds.map((x) => x.nhan);
          for (const can of ["Ngày khởi hành", "Giờ đón", "Ngày đón"]) assert.ok(ten.includes(can), `không đo được ô «${can}» (đang hiện: ${ten.join(", ")})`);
          assert.deepEqual(loiChong(ds), [], "nhãn nổi đè chữ / ô thấp");
        });

        await buoc(`${id}-b`, "trả trước 1.000.000 → «Hình thức», «Người thu tiền»: nhãn không đè chữ, cao ≥ ô «Thanh toán trước», nhãn thẳng mép chữ, có mũi tên tự vẽ", async () => {
          await dat("#prepaidAmount", "1000000");
          await page.waitForTimeout(200);
          const ds = (await page.evaluate(doONhanNoi)).filter((x) => x.o === "prepaidMethod" || x.o === "prepaidCollector");
          assert.equal(ds.length, 2, `hai ô chọn của trả trước phải hiện: ${JSON.stringify(ds.map((x) => x.o))}`);
          const caoTien = await page.evaluate(() => Math.round(document.getElementById("prepaidAmount").getBoundingClientRect().height));
          await page.locator("#pay-card").evaluate((e) => e.scrollIntoView({ block: "center" }));
          await page.waitForTimeout(150);
          await page.locator("#pay-card").screenshot({ path: join(OUT, `${TIEN_TO}-${id}-thanh-toan.png`) }); // chụp TRƯỚC khi khẳng định: ảnh "trước" cũng có
          assert.deepEqual(loiChong(ds), [], "nhãn nổi đè chữ / ô thấp");
          for (const x of ds) {
            assert.ok(x.cao >= caoTien - 1, `${x.o} cao ${x.cao} < ô Thanh toán trước ${caoTien}`);
            assert.ok(x.lechTrai <= 2, `${x.o}: nhãn lệch mép trái chữ ${x.lechTrai}px`);
            assert.match(x.nen, /gradient/, `${x.o}: không có mũi tên tự vẽ (${x.nen})`);
            assert.ok(x.pr >= 28, `${x.o}: đệm phải ${x.pr}px không đủ chỗ mũi tên`);
          }
        });

        await buoc(`${id}-c`, "thẻ gập của dịch vụ không có chặng nêu «Không đưa đón»; thẻ gập có chặng vẫn có chip giờ / nơi đón", async () => {
          await chon("TTB06", 2);
          await chon("TTB03", 3);
          const dong = await page.evaluate(() => [...document.querySelectorAll("#services .svc")].map((c) => ({ ten: c.querySelector(".svc-name").textContent, gap: c.classList.contains("svc-dang-gap"),
            tomTat: c.querySelector(".svc-gon-tom-tat").getClientRects().length ? c.querySelector(".svc-gon-tom-tat").textContent : null, chips: [...c.querySelectorAll(".svc-gon-chips > *")].map((x) => x.textContent) })));
          // Hai thẻ gập (thẻ đầu, thẻ giữa), chụp TỪNG thẻ sau khi cuộn thẻ vào giữa khung — thanh dính cuối trang không che (ảnh cả khung dài thì thanh dính chồng lên).
          for (const [i, ten] of [[0, "the-gap-1"], [1, "the-gap-2"]]) {
            const the = page.locator("#services .svc").nth(i);
            await the.evaluate((e) => e.scrollIntoView({ block: "center" }));
            await page.waitForTimeout(150);
            await the.screenshot({ path: join(OUT, `${TIEN_TO}-${id}-${ten}.png`) });
          }
          assert.deepEqual(dong.map((x) => x.gap), [true, true, false], `chỉ thẻ vừa thêm mở: ${JSON.stringify(dong)}`);
          assert.match(dong[1].tomTat ?? "", /Không đưa đón/, `thẻ gập Motor nước (không chặng): ${JSON.stringify(dong[1])}`);
          assert.deepEqual(dong[0].chips, ["Chưa chốt giờ đón", "Chưa có nơi đón"], `thẻ gập TD101 (có chặng): ${JSON.stringify(dong[0])}`);
          assert.doesNotMatch(dong[0].tomTat ?? "", /Không đưa đón/, "thẻ có chặng không được ghi «Không đưa đón»");
        });
        await buoc(`${id}-d`, "không lỗi JavaScript", async () => assert.deepEqual(loiTrang, []));
      } finally {
        await ctx.close();
      }
    }
  }
} finally {
  await browser.close();
  await env.stop();
}
if (loi.length) {
  console.log(`\nNHAN NOI SAFARI SMOKE ĐỎ (${loi.length}):\n  ${loi.join("\n  ")}`);
  process.exit(1);
}
console.log("\nNHAN NOI SAFARI SMOKE OK");
