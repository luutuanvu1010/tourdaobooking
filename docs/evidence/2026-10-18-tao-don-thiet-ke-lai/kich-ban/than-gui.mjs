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
// Task 6 (lưới số khách + dòng tiền, 18/10/2026) thêm hai biến, vắng thì y như trên:
//   THU_MUC=<thư mục>  ghi / so tệp ở thư mục khác (hồ sơ của Task 5 ở the-gap/ không bị ghi lại);
//   CACH=luoi          thao tác QUA GIAO DIỆN thật thay vì điền thẳng vào ô: bấm nút "Tăng …" / "Giảm …" của bộ đếm (khẳng định nút đang HIỆN — thẻ được mở bằng
//                      đầu thẻ trước), mở "Sửa giá" nếu thẻ có (bản trước Task 6 không có: ô đơn giá luôn hiện) rồi mới gõ đơn giá (khẳng định ô HIỆN). Tệp mang tên
//                      than-gui-luoi-<giai đoạn>.json. Cùng chuỗi thao tác cho ra cùng bản nháp nên thân phải giống bản `CACH` mặc định từng byte.
//   vd: THU_MUC=docs/evidence/2026-10-18-tao-don-thiet-ke-lai/luoi-khach-tien CACH=luoi GIAI_DOAN=truoc … (trên 847cd72e), rồi GIAI_DOAN=sau sau khi sửa.
import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ACCOUNTS, ok, setInput, sleep, startEnv, vnDate } from "../../2026-09-20-a2/kich-ban/a2-cdp.mjs";

const GIAI_DOAN = process.env.GIAI_DOAN ?? "truoc";
const LUOI = process.env.CACH === "luoi";
const OUT = process.env.THU_MUC ?? "docs/evidence/2026-10-18-tao-don-thiet-ke-lai/the-gap";
const TEN = LUOI ? "than-gui-luoi" : "than-gui";
mkdirSync(OUT, { recursive: true });
const KHO = [["390", { width: 390, height: 844, mobile: true }], ["1040", { width: 1040, height: 900, mobile: false }]];

const chuanHoa = (txt) =>
  JSON.stringify(JSON.parse(txt), (k, v) => (k === "expectedUpdatedAt" ? "<dau-thoi-gian>" : v)).replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g, "<id>");
const layThan = (p, method) => p.requests.filter((r) => r.method === method && /\/api\/orders(\/[^/]+)?$/.test(new URL(r.url).pathname)).map((r) => chuanHoa(r.postData)).at(-1);

const the = (i) => `document.querySelectorAll('#services .svc')[${i}]`;
const demDem = (i, nhan) => `${the(i)}.querySelector('.counter-field[aria-label=${JSON.stringify(nhan)}]')`;
const hien = (sel) => `(() => { const e = ${sel}; return !!e && e.getClientRects().length > 0; })()`;

const env = await startEnv();
const than = {};
try {
  /** CACH=luoi: bấm nút bộ đếm `nut` ("Tăng" | "Giảm") của loại `nhan` ở thẻ i, `lan` lần — nút phải đang hiện (thẻ mở). */
  const bamDem = async (p, i, nut, nhan, lan) => {
    const sel = `${the(i)}.querySelector('.counter-btn[aria-label=${JSON.stringify(`${nut} ${nhan}`)}]')`;
    assert.equal(await p.ev(hien(sel)), true, `nút "${nut} ${nhan}" của thẻ ${i + 1} đang hiện`);
    for (let k = 0; k < lan; k++) await p.ev(`(${sel}).click(); true`);
    await sleep(100);
  };
  /** CACH=luoi: mở thẻ i bằng đầu thẻ nếu đang gập. */
  const moThe = async (p, i) => {
    if ((await p.ev(`${the(i)}.querySelector('.svc-mo')?.getAttribute('aria-expanded')`)) === "false") await p.ev(`${the(i)}.querySelector('.svc-mo').click(); true`);
    await sleep(150);
  };
  /** Gõ đơn giá người lớn của thẻ 0. CACH=luoi: mở "Sửa giá" nếu thẻ có, khẳng định ô đơn giá HIỆN rồi mới gõ. */
  const goDonGia = async (p, chu) => {
    if (!LUOI) return p.ev(setInput(`${the(0)}.querySelector('.price-field')`, chu)); // y như bản Task 5
    const o = `${the(0)}.querySelector('.price-field[aria-label="Đơn giá người lớn"]')`;
    {
      const suaGia = `${the(0)}.querySelector('[data-action="sua-gia"]')`;
      if (await p.ev(`!!${suaGia}`)) {
        assert.equal(await p.ev(hien(o)), false, "trước khi bấm Sửa giá: ô đơn giá ẩn");
        await p.ev(`(${suaGia}).click(); true`);
        await sleep(150);
      }
      assert.equal(await p.ev(hien(o)), true, "ô đơn giá người lớn đang hiện trước khi gõ");
    }
    await p.ev(setInput(o, chu));
  };
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
    if (LUOI) {
      await bamDem(p, 0, "Tăng", "Người lớn", 1); // thẻ mới: 1 người lớn → 2
      await bamDem(p, 0, "Tăng", "Trẻ em", 1);
    } else {
      await p.ev(setInput(demDem(0, "Người lớn"), "2"));
      await p.ev(setInput(demDem(0, "Trẻ em"), "1"));
    }
    await sleep(200);
    await goDonGia(p, "1.300.000");
    await p.ev(`${the(0)}.querySelector('[data-action="them-dua-don"]').click(); true`);
    await p.waitFor(`!!${the(0)}.querySelector('select[data-o$=":don"]')`, "chặng đưa đón");
    await p.ev(setInput(`${the(0)}.querySelector('select[data-o$=":don"]')`, "tudo"));
    await p.waitFor(`!!${the(0)}.querySelector('[data-o$=":don-chu"]')`, "ô địa chỉ đón");
    await p.ev(setInput(`${the(0)}.querySelector('[data-o$=":don-chu"]')`, "12 Trần Phú, Nha Trang"));
    await p.ev(setInput(`${the(0)}.querySelector('[data-o$=":gio"]')`, "07:30"));
    await chon(p, "phao", 2);
    if (LUOI) await bamDem(p, 1, "Tăng", "Số khách", 6); // 1 → 7
    else await p.ev(setInput(demDem(1, "Số khách"), "7"));
    await chon(p, "TTB06", 3);
    if (GIAI_DOAN === "sau") assert.deepEqual(await p.ev("[...document.querySelectorAll('#services .svc .svc-mo')].map((b) => b.getAttribute('aria-expanded'))"), ["false", "false", "true"], "bản sau: thêm dịch vụ thì thẻ trước gập, thẻ mới mở");
    if (LUOI) await bamDem(p, 2, "Tăng", "Người lớn", 1);
    else await p.ev(setInput(demDem(2, "Người lớn"), "2"));
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
    if (LUOI) {
      await moThe(p, 1); // chạm đầu thẻ Phao chuối (thẻ khác tự gập) — chỉ đổi hiển thị, không đổi bản nháp
      await bamDem(p, 1, "Tăng", "Số khách", 1); // 7 → 8
      await moThe(p, 0);
      await bamDem(p, 0, "Giảm", "Trẻ em", 1); // 1 → 0
    } else {
      await p.ev(setInput(demDem(1, "Số khách"), "8"));
      await p.ev(setInput(demDem(0, "Trẻ em"), "0"));
    }
    await sleep(300);
    await luuXong(p, "lưu thay đổi (đổi số khách)");
    than[`PUT-2-${kho}`] = layThan(p, "PUT");
    for (const k of [`POST-${kho}`, `PUT-1-${kho}`, `PUT-2-${kho}`]) assert.ok(typeof than[k] === "string" && than[k].length > 50, `${k}: không bắt được thân`);
    assert.deepEqual(p.consoleErrors.filter((e) => !/favicon/.test(e)), [], `lỗi console ${kho}`);
    p.close();
    ok(`thân gửi ${kho}: POST, PUT-1, PUT-2`);
  }
  writeFileSync(join(OUT, `${TEN}-${GIAI_DOAN}.json`), JSON.stringify(than, null, 1) + "\n");
  if (GIAI_DOAN === "sau") {
    const truocTep = join(OUT, `${TEN}-truoc.json`);
    assert.ok(existsSync(truocTep), `thiếu ${TEN}-truoc.json (chạy GIAI_DOAN=truoc trên bản trước)`);
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
