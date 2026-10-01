// Kiểm trang "Trợ lý Hỗ trợ" của Toàn quyền (ADR-0069) bằng Chrome thật (môi trường A2: D1 tạm + wrangler dev + Chrome headless qua CDP). KHÔNG cần mạng ngoài:
// máy OpenAI GIẢ chạy ngay trong kịch bản, wrangler dev trỏ vào nó bằng --var OPENAI_BASE_URL + khoá giả đủ dài (≥ 16 ký tự ⇒ hiện 4 ký tự cuối).
// Chạy từ GỐC repo: npm run build:web && CHROME_BIN=docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh node docs/evidence/2026-09-30-bang-dieu-khien-tro-ly/kich-ban/bang-dieu-khien-tro-ly-smoke.mjs
// Làm ĐÚNG mục 6 "Cách kiểm" của đặc tả (docs/superpowers/specs/2026-09-30-bang-dieu-khien-tro-ly-dac-ta.md):
//   a  1040: Toàn quyền thấy mục "Trợ lý Hỗ trợ" ở nhóm QUẢN TRỊ; trang có đủ 5 phần; key "đã đặt (…QZ7K)" — không lộ thêm ký tự; Thử key ⇒ "Key dùng được"
//   b  tắt vai Đối tác trên trang ⇒ tài khoản Đối tác KHÔNG có nút Hỗ trợ; Bán hàng vẫn có
//   c  sửa câu chào + câu hỏi mẫu trên trang ⇒ khung Hỗ trợ của Bán hàng hiện câu mới + nút câu mẫu (chạm để gửi) + dòng "Câu hỏi được lưu…"
//   d  lời dặn có số điện thoại ⇒ câu lỗi lời thường trên trang, không lưu
//   e  hỏi một câu có SĐT ⇒ phần Lịch sử hỏi đáp có dòng đã che, không có số gốc
//   f  thêm đoạn ngữ cảnh ⇒ đoạn hiện trong danh sách, "Đang dùng" được tick
//   g  390 + 320: trang không tràn ngang; ô gõ 16px
//   h  Bán hàng: không có mục ở thanh bên / trang Tôi; mở thẳng trang ⇒ câu từ chối tiếng Việt
//   i  console sạch ở mọi trang đã mở
// Các trang dùng CHUNG kho cookie: mỗi bước mở trang của tài khoản cần dùng ngay trước khi thao tác.
import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { createServer } from "node:http";
import { join } from "node:path";
import { ACCOUNTS, ok, sleep, startEnv } from "../../2026-09-20-a2/kich-ban/a2-cdp.mjs";

const OUT = process.env.OUT ?? "docs/evidence/2026-09-30-bang-dieu-khien-tro-ly";
mkdirSync(join(OUT, "anh"), { recursive: true });
const M = { width: 390, height: 844, mobile: true };
const NARROW = { width: 320, height: 568, mobile: true };
const DESK = { width: 1040, height: 800, mobile: false };
const KHOA = "sk-Xq9Zr7Lw2Vn4Tb8Pk3Jm6QZ7K"; // ngẫu nhiên — tránh chuỗi con trùng chữ thật của trang (bản đầu "…-dieu-…" khớp nhầm "chinh-sach-dieu-phoi")
ACCOUNTS.owner = { name: "Chủ Hệ Thống", phone: "0900000299", pin: "135246", permissions: ["SUPER_ADMIN"] }; // startEnv gieo mọi ACCOUNTS vào D1 tạm
ACCOUNTS.partner = { name: "Đối Tác Thử", phone: "0900000298", pin: "135247", permissions: ["PARTNER"] };

const nhan = [];
const may = createServer((req, res) => {
  let raw = "";
  req.on("data", (d) => (raw += d));
  req.on("end", () => {
    const body = JSON.parse(raw || "{}");
    nhan.push(body);
    // Tên đoạn ĐẦU TIÊN của khối "TÀI LIỆU:" CUỐI (máy chủ luôn nối khối này sau lời nhắc — ADR-0073 B4); lời nhắc có "[tên mục]" ở luật Nguồn không tính.
    const ins = String(body.instructions ?? "");
    const ten = /\[([^\]]+)\]/.exec(ins.slice(ins.lastIndexOf("TÀI LIỆU:")))?.[1] ?? "";
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({
      status: "completed",
      output: [{ type: "message", content: [{ type: "output_text", text: `1. Vào trang Tôi.\n2. Bấm Đổi PIN.${ten ? `\nNguồn: [${ten}]` : ""}` }] }],
      usage: { input_tokens: 1000, output_tokens: 100 },
    }));
  });
});
await new Promise((r) => may.listen(0, "127.0.0.1", r));
const PORT = may.address().port;

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
const khungMo = `!!${q("#tl-khung.tl-khung")}`;
const tatCa = [];
const trangDung = `!${q("#tl-trang")}.hidden && !!${q("#tl-lich-su .tl-ls-ds")}`;
const env = await startEnv({ vars: { OPENAI_API_KEY: KHOA, OPENAI_BASE_URL: `http://127.0.0.1:${PORT}` } });
const moTrang = async (vp = DESK) => {
  const p = await env.as(ACCOUNTS.owner, "/tro-ly-cai-dat", vp);
  tatCa.push(p);
  await p.waitFor(trangDung, "trang Trợ lý Hỗ trợ dựng xong", 15000);
  return p;
};
/** Đặt giá trị một ô rồi phát sự kiện như người gõ. */
const go = (sel, v) => `(() => { const el = ${q(sel)}; el.value = ${JSON.stringify(v)}; el.dispatchEvent(new Event('input', { bubbles: true })); return true; })()`;

try {
  await step("a", "1040: mục ở nhóm QUẢN TRỊ; đủ 5 phần; key chỉ hiện 4 ký tự cuối; Thử key ⇒ dùng được", async () => {
    const p = await moTrang();
    const nhom = await p.ev(`[...document.querySelectorAll('#sidebar a')].map((a) => a.textContent.trim())`);
    assert.ok(nhom.some((t) => t.includes("Trợ lý Hỗ trợ")), nhom.join(" | "));
    const h2 = await p.ev(`[...document.querySelectorAll('#tl-trang h2')].map((x) => x.textContent)`);
    assert.deepEqual(h2, ["Tình trạng", "Ai được dùng", "Lời dặn", "Ngữ cảnh bổ sung", "Lịch sử hỏi đáp"]);
    const chu = await p.ev(`${q("#tl-tinh-trang")}.innerText`);
    assert.match(chu, /Key: đã đặt \(kết thúc bằng …QZ7K\)/);
    const html = await p.ev("document.documentElement.outerHTML");
    for (let i = 0; i + 5 <= KHOA.length; i++) assert.ok(!html.includes(KHOA.slice(i, i + 5)), `trang lộ "${KHOA.slice(i, i + 5)}"`);
    const n = nhan.length;
    await p.ev(`[...${q("#tl-tinh-trang")}.querySelectorAll('button')].find((b) => b.textContent === 'Thử key').click(), true`);
    await p.waitFor(`[...document.querySelectorAll('#tl-tinh-trang .tl-cd-bao')].some((x) => !x.hidden && /Key dùng được/.test(x.textContent))`, "báo Key dùng được", 10000);
    assert.equal(nhan.length, n + 1);
    assert.equal(nhan.at(-1).input, "Thử kết nối.");
    await p.shot(join(OUT, "anh/a-trang-1040.png"));
  });

  await step("b", "tắt vai Đối tác trên trang ⇒ tài khoản Đối tác không có nút Hỗ trợ; Bán hàng vẫn có", async () => {
    const p = await moTrang();
    await p.ev(`(() => { ${q("#tl-vai-PARTNER")}.checked = false; ${q("#tl-ai-dung form")}.requestSubmit(); return true; })()`);
    await p.waitFor(`!!${q("#tl-ai-dung .tl-cd-bao")} && /Đã lưu/.test(${q("#tl-ai-dung .tl-cd-bao")}.textContent)`, "đã lưu công tắc", 10000);
    assert.equal(await p.ev(`${q("#tl-vai-PARTNER")}.checked`), false);
    const d = await env.as(ACCOUNTS.partner, "/orders", M);
    tatCa.push(d);
    await d.waitFor(`document.readyState === 'complete' && !!${q("#topbar")}`, "trang Đối tác dựng xong", 10000);
    await sleep(1500);
    assert.equal(await d.ev(`!!${q("#tl-fab")}`), false, "Đối tác không được có nút Hỗ trợ");
    await d.shot(join(OUT, "anh/b-doi-tac-khong-nut-390.png"));
    const s = await env.as(ACCOUNTS.salesA, "/orders", M);
    tatCa.push(s);
    await s.waitFor(`!!${q("#tl-fab")}`, "Bán hàng vẫn có nút", 10000);
  });

  await step("c", "sửa câu chào + câu hỏi mẫu ⇒ khung của Bán hàng hiện câu mới, nút câu mẫu gửi được, có dòng 'Câu hỏi được lưu…'", async () => {
    const p = await moTrang();
    await p.ev(go("#tl-cau-chao", "Chào bạn, mình là trợ lý của Tour Đảo. Hỏi gì cứ hỏi nhé."));
    await p.ev(go("#tl-cau-mau", "Đổi mã PIN thế nào?\nLập đơn mới ra sao?"));
    await p.ev(`${q("#tl-loi-dan form")}.requestSubmit(), true`);
    await p.waitFor(`!!${q("#tl-loi-dan .tl-cd-bao")} && /Đã lưu/.test(${q("#tl-loi-dan .tl-cd-bao")}.textContent)`, "đã lưu lời dặn", 10000);
    assert.match(await p.ev(`${q("#tl-loi-dan summary")}.textContent`), /Lịch sử bản \(2\)/);
    const s = await env.as(ACCOUNTS.salesA, "/orders", M);
    tatCa.push(s);
    await s.waitFor(`!!${q("#tl-fab")}`, "có nút", 10000);
    await s.ev(`${q("#tl-fab")}.click(), true`);
    await s.waitFor(khungMo, "mở khung");
    assert.equal(await s.ev(`${q(".tl-khung .tl-tin-tro-ly .tl-chu")}.textContent`), "Chào bạn, mình là trợ lý của Tour Đảo. Hỏi gì cứ hỏi nhé.");
    assert.deepEqual(await s.ev(`[...document.querySelectorAll('.tl-mau-nut')].map((b) => b.textContent)`), ["Đổi mã PIN thế nào?", "Lập đơn mới ra sao?"]);
    const luuY = await s.ev(`[...document.querySelectorAll('.tl-khung .tl-luu-y')].map((x) => x.textContent)`);
    assert.ok(luuY.includes("Câu hỏi được lưu để cải thiện trợ lý — đừng gõ thông tin khách"), luuY.join(" | "));
    await s.shot(join(OUT, "anh/c-khung-cau-chao-390.png"));
    const n = nhan.length;
    await s.ev(`${q(".tl-mau-nut")}.click(), true`);
    await s.waitFor(`document.querySelectorAll('.tl-tin-tro-ly').length >= 2`, "câu mẫu gửi được, có trả lời", 15000);
    assert.equal(nhan.length, n + 1);
    assert.equal(nhan.at(-1).input, "Đổi mã PIN thế nào?");
    assert.equal(await s.ev(`!!${q(".tl-mau-nut")}`), false, "câu mẫu ẩn sau khi đã hỏi");
  });

  await step("d", "lời dặn có số điện thoại ⇒ câu lỗi lời thường, không thêm bản", async () => {
    const p = await moTrang();
    await p.ev(go("#tl-loi-dan-them", "Khách cần gấp thì gọi 0905 123 456."));
    await p.ev(`${q("#tl-loi-dan form")}.requestSubmit(), true`);
    await p.waitFor(`!!${q("#tl-loi-dan .tl-cd-loi")} && !${q("#tl-loi-dan .tl-cd-loi")}.hidden`, "có câu lỗi", 10000);
    assert.match(await p.ev(`${q("#tl-loi-dan .tl-cd-loi")}.textContent`), /^Lời dặn thêm không được chứa chuỗi số dài/);
    assert.match(await p.ev(`${q("#tl-loi-dan summary")}.textContent`), /Lịch sử bản \(2\)/, "không thêm bản");
    await p.shot(join(OUT, "anh/d-loi-sdt-1040.png"));
  });

  await step("e", "hỏi câu có SĐT ⇒ Lịch sử hỏi đáp có dòng đã che, không có số gốc", async () => {
    const s = await env.as(ACCOUNTS.salesA, "/orders", M);
    tatCa.push(s);
    await s.waitFor(`!!${q("#tl-fab")}`, "có nút", 10000);
    await s.ev(`${q("#tl-fab")}.click(), true`);
    await s.waitFor(khungMo, "mở khung");
    await s.ev(`(() => { ${q(".tl-o")}.value = 'Khách 0905 777 888 hỏi đổi mã PIN thế nào CHROME-LS'; ${q(".tl-gui")}.click(); return true; })()`);
    await s.waitFor(`document.querySelectorAll('.tl-tin-tro-ly').length >= 2`, "có trả lời", 15000);
    const p = await moTrang();
    await p.ev(go("#tl-ls-q", "CHROME-LS"));
    await p.ev(`${q("#tl-lich-su form")}.requestSubmit(), true`);
    await p.waitFor(`/CHROME-LS/.test(${q("#tl-lich-su .tl-ls-ds")}.innerText) && document.querySelectorAll('#tl-lich-su .tl-ls-ds > li').length === 1`, "lọc ra đúng một dòng", 10000);
    const dong = await p.ev(`${q("#tl-lich-su .tl-ls-ds")}.innerText`);
    assert.match(dong, /\[đã che\]/);
    assert.ok(!/777|0905/.test(dong), dong);
    assert.match(dong, /Sales Một/);
    assert.match(dong, /Bán hàng/);
    await p.ev(`${q("#tl-lich-su")}.scrollIntoView(), true`);
    await p.shot(join(OUT, "anh/e-lich-su-1040.png"));
  });

  await step("f", "thêm đoạn ngữ cảnh ⇒ đoạn hiện, đang dùng", async () => {
    const p = await moTrang();
    await p.ev(go("#tl-nc-tieu-de", "Giờ làm việc văn phòng"));
    await p.ev(go("#tl-nc-noi-dung", "Văn phòng làm việc từ 7 giờ 30 tới 17 giờ, nghỉ trưa một tiếng."));
    await p.ev(`${q("#tl-ngu-canh form")}.requestSubmit(), true`);
    await p.waitFor(`!!${q("#tl-ngu-canh .tl-cd-tieu-de")}`, "đoạn hiện trong danh sách", 10000);
    assert.equal(await p.ev(`${q("#tl-ngu-canh .tl-cd-tieu-de")}.textContent`), "Giờ làm việc văn phòng");
    assert.equal(await p.ev(`${q("#tl-ngu-canh .tl-cd-ban-dong input[type=checkbox]")}.checked`), true);
    await p.ev(`${q("#tl-ngu-canh")}.scrollIntoView(), true`);
    await p.shot(join(OUT, "anh/f-ngu-canh-1040.png"));
  });

  await step("g", "390 + 320: trang không tràn ngang; ô gõ 16px", async () => {
    for (const vp of [M, NARROW]) {
      const p = await moTrang(vp);
      await sleep(400);
      assert.equal(await p.ev("document.documentElement.scrollWidth - innerWidth"), 0, `${vp.width}: trang tràn ngang`);
      const co = await p.ev(`[...document.querySelectorAll('#tl-trang input:not([type=checkbox]), #tl-trang textarea, #tl-trang select')].map((x) => getComputedStyle(x).fontSize)`);
      assert.ok(co.length >= 8 && co.every((c) => c === "16px"), co.join(","));
      await p.shot(join(OUT, `anh/g-trang-${vp.width}.png`));
    }
  });

  await step("h", "Bán hàng: không mục ở thanh bên / trang Tôi; mở thẳng ⇒ câu từ chối tiếng Việt", async () => {
    const d = await env.as(ACCOUNTS.salesA, "/account", DESK);
    tatCa.push(d);
    await d.waitFor(`!!${q("#links")} && ${q("#links")}.children.length > 0`, "trang Tôi dựng xong", 10000);
    assert.equal(await d.ev(`[...document.querySelectorAll('a')].some((a) => a.getAttribute('href') === '/tro-ly-cai-dat')`), false);
    const p = await env.as(ACCOUNTS.salesA, "/tro-ly-cai-dat", DESK);
    tatCa.push(p);
    await p.waitFor(`!${q("#error")}.hidden`, "có câu từ chối", 10000);
    assert.match(await p.ev(`${q("#error")}.textContent`), /Chỉ người phụ trách hệ thống/);
    assert.equal(await p.ev(`${q("#tl-trang")}.hidden`), true);
    const o = await env.as(ACCOUNTS.owner, "/account", M);
    tatCa.push(o);
    await o.waitFor(`[...document.querySelectorAll('#links a')].some((a) => a.getAttribute('href') === '/tro-ly-cai-dat')`, "Toàn quyền có dòng ở trang Tôi", 10000);
    assert.equal(await o.ev(`!!document.getElementById('tro-ly-cai-dat')`), false, "khối cài đặt cũ ở trang Tôi đã bỏ");
  });

  await step("i", "console sạch ở mọi trang đã mở", async () => {
    const loi = tatCa.flatMap((p) => p.consoleErrors).filter((e) => !/Failed to load resource: the server responded with a status of 40[03]/.test(e));
    assert.deepEqual(loi, []);
  });
} finally {
  for (const p of tatCa) p.close();
  may.close();
  await env.stop();
}
if (failures.length) {
  console.log(`\n${failures.length} bước lỗi: ${failures.join(", ")}`);
  process.exit(1);
}
console.log("\nTất cả bước đạt.");
