// Thân POST / PUT gửi lên máy chủ cho CÙNG một chuỗi thao tác — trước và sau việc "thẻ dịch vụ gập" (Task 5, 18/10/2026). Phải giống nhau TỪNG BYTE sau khi bỏ
// id ngẫu nhiên (UUID) và dấu khoá lạc quan (`expectedUpdatedAt`) — khuôn T5 của đợt bốn bước (docs/evidence/2026-10-14-tao-don-bon-buoc/kich-ban/chup-anh.mjs, so-sanh.py).
// Mọi ô đều điền bằng `setInput` / `.click()` của JS (chạy được cả khi ô đang nằm trong thẻ gập — `hidden` không chặn sự kiện), nên CÙNG kịch bản chạy được trên bản trước lẫn bản sau.
// Kịch bản (mỗi khổ 390 + 1040, tài khoản Bán hàng, D1 tạm, không cần mạng ngoài):
//   1) lập đơn ba dịch vụ: TD101 (2 người lớn + 1 trẻ em, đơn giá người lớn sửa tay, một chặng đưa đón "Gõ tự do" + giờ đón), TTB03 Phao chuối (7 khách), TTB06 Motor nước (2 người lớn) → POST;
//   2) mở lại đơn, Lưu không đụng gì → PUT-1;
//   3) mở lại đơn, đổi số khách ở thẻ Phao chuối (bản sau: thẻ đang GẬP) và bỏ trẻ em của TD101 → PUT-2.
// Chạy từ GỐC repo, sau `npm run build:web`:
//   GIAI_DOAN=truoc CHROME_BIN=$PWD/docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh node docs/evidence/2026-10-18-tao-don-thiet-ke-lai/kich-ban/than-gui.mjs
//   GIAI_DOAN=sau   … (cùng lệnh) — ghi than-gui-sau.json rồi SO với than-gui-truoc.json, in "THAN GUI GIONG NHAU" hoặc chỗ khác (thoát 1).
import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ACCOUNTS, ok, setInput, sleep, startEnv, vnDate } from "../../2026-09-20-a2/kich-ban/a2-cdp.mjs";

const GIAI_DOAN = process.env.GIAI_DOAN ?? "truoc";
const OUT = "docs/evidence/2026-10-18-tao-don-thiet-ke-lai/the-gap";
mkdirSync(OUT, { recursive: true });
const KHO = [["390", { width: 390, height: 844, mobile: true }], ["1040", { width: 1040, height: 900, mobile: false }]];

const chuanHoa = (txt) =>
  JSON.stringify(JSON.parse(txt), (k, v) => (k === "expectedUpdatedAt" ? "<dau-thoi-gian>" : v)).replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g, "<id>");
const layThan = (p, method) => p.requests.filter((r) => r.method === method && /\/api\/orders(\/[^/]+)?$/.test(new URL(r.url).pathname)).map((r) => chuanHoa(r.postData)).at(-1);

const the = (i) => `document.querySelectorAll('#services .svc')[${i}]`;
const demDem = (i, nhan) => `${the(i)}.querySelector('.counter-field[aria-label=${JSON.stringify(nhan)}]')`;

const env = await startEnv();
const than = {};
try {
  const chon = async (p, tim, soThe) => {
    await p.ev("document.getElementById('catalog-q').focus(); true");
    await p.ev(setInput("document.getElementById('catalog-q')", tim));
    await p.waitFor("document.querySelectorAll('#catalog-list .catalog-pick').length === 1", `lọc ${tim}`);
    await p.ev("document.querySelector('#catalog-list .catalog-pick').click(); true");
    await p.waitFor(`document.querySelectorAll('#services .svc').length === ${soThe}`, `thẻ thứ ${soThe}`);
    await sleep(200);
  };
  const moLai = async (p, id) => {
    await p.send("Page.navigate", { url: `${env.base}/order-form?id=${id}` });
    await sleep(500);
    await p.waitFor("location.pathname === '/order-form' && document.querySelectorAll('#services .svc').length === 3", "form sửa đơn dựng xong", 15000);
    await sleep(600);
  };
  const luuXong = async (p, nhan) => {
    await p.ev("document.getElementById('save').click(); true");
    await p.waitFor("location.pathname === '/order' && !!new URLSearchParams(location.search).get('id')", nhan, 15000);
  };
  for (const [kho, vp] of KHO) {
    const p = await env.as(ACCOUNTS.salesA, "/order-form", vp);
    await p.waitFor("!!document.getElementById('catalog-q') && !document.getElementById('catalog-q').disabled", "ô tìm danh mục sẵn sàng", 15000);
    await sleep(600);
    await p.ev(setInput("document.getElementById('orderDate')", vnDate(3)));
    await chon(p, "TD101", 1);
    await p.ev(setInput(demDem(0, "Người lớn"), "2"));
    await p.ev(setInput(demDem(0, "Trẻ em"), "1"));
    await sleep(200);
    await p.ev(setInput(`${the(0)}.querySelector('.price-field')`, "1.300.000"));
    await p.ev(`${the(0)}.querySelector('[data-action="them-dua-don"]').click(); true`);
    await p.waitFor(`!!${the(0)}.querySelector('select[data-o$=":don"]')`, "chặng đưa đón");
    await p.ev(setInput(`${the(0)}.querySelector('select[data-o$=":don"]')`, "tudo"));
    await p.waitFor(`!!${the(0)}.querySelector('[data-o$=":don-chu"]')`, "ô địa chỉ đón");
    await p.ev(setInput(`${the(0)}.querySelector('[data-o$=":don-chu"]')`, "12 Trần Phú, Nha Trang"));
    await p.ev(setInput(`${the(0)}.querySelector('[data-o$=":gio"]')`, "07:30"));
    await chon(p, "phao", 2);
    await p.ev(setInput(demDem(1, "Số khách"), "7"));
    await chon(p, "TTB06", 3);
    if (GIAI_DOAN === "sau") assert.deepEqual(await p.ev("[...document.querySelectorAll('#services .svc .svc-mo')].map((b) => b.getAttribute('aria-expanded'))"), ["false", "false", "true"], "bản sau: thêm dịch vụ thì thẻ trước gập, thẻ mới mở");
    await p.ev(setInput(demDem(2, "Người lớn"), "2"));
    await p.ev(setInput("document.getElementById('customerName')", "Khách Thân Gửi"));
    await p.ev(setInput("document.getElementById('customerPhone')", "0912345670"));
    await sleep(300);
    await luuXong(p, "lưu đơn mới");
    than[`POST-${kho}`] = layThan(p, "POST");
    const id = await p.ev("new URLSearchParams(location.search).get('id')");
    // PUT-1: mở lại, không đụng gì
    await moLai(p, id);
    await luuXong(p, "lưu thay đổi (không đụng gì)");
    than[`PUT-1-${kho}`] = layThan(p, "PUT");
    // PUT-2: mở lại, đổi số khách thẻ 2 (Phao chuối) + bỏ trẻ em của thẻ 1
    await moLai(p, id);
    if (GIAI_DOAN === "sau") {
      // Bản sau: nháp "sạch" nạp lại → cả ba thẻ GẬP (thân chỉ ẩn bằng `hidden`); thao tác dưới đây đi vào ô của thẻ đang gập — thân gửi vẫn phải giống bản trước.
      assert.deepEqual(await p.ev("[...document.querySelectorAll('#services .svc .svc-mo')].map((b) => b.getAttribute('aria-expanded'))"), ["false", "false", "false"], "bản sau: ba thẻ của nháp sạch đang gập");
      assert.equal(await p.ev(`${demDem(1, "Số khách")}.getClientRects().length`), 0, "ô số khách của thẻ gập đang ẩn (vẫn trong cây DOM)");
    }
    await p.ev(setInput(demDem(1, "Số khách"), "8"));
    await p.ev(setInput(demDem(0, "Trẻ em"), "0"));
    await sleep(300);
    await luuXong(p, "lưu thay đổi (đổi số khách)");
    than[`PUT-2-${kho}`] = layThan(p, "PUT");
    for (const k of [`POST-${kho}`, `PUT-1-${kho}`, `PUT-2-${kho}`]) assert.ok(typeof than[k] === "string" && than[k].length > 50, `${k}: không bắt được thân`);
    assert.deepEqual(p.consoleErrors.filter((e) => !/favicon/.test(e)), [], `lỗi console ${kho}`);
    p.close();
    ok(`thân gửi ${kho}: POST, PUT-1, PUT-2`);
  }
  writeFileSync(join(OUT, `than-gui-${GIAI_DOAN}.json`), JSON.stringify(than, null, 1) + "\n");
  if (GIAI_DOAN === "sau") {
    const truocTep = join(OUT, "than-gui-truoc.json");
    assert.ok(existsSync(truocTep), "thiếu than-gui-truoc.json (chạy GIAI_DOAN=truoc trên bản trước)");
    const truoc = JSON.parse(readFileSync(truocTep, "utf8"));
    const khac = Object.keys({ ...truoc, ...than }).filter((k) => truoc[k] !== than[k]);
    if (khac.length) {
      for (const k of khac) console.log(`✗ ${k}\n  trước: ${truoc[k]}\n  sau:   ${than[k]}`);
      process.exitCode = 1;
    } else console.log(`THAN GUI GIONG NHAU (${Object.keys(than).length} thân: ${Object.keys(than).join(", ")})`);
  } else console.log("THAN GUI DA GHI");
} finally {
  await env.stop();
}
