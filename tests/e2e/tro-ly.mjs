// Trợ lý Hỗ trợ (ADR-0066) trên API THẬT + D1 local, với máy OpenAI GIẢ cục bộ: run.mjs chọn cổng trống, đặt `--var OPENAI_BASE_URL:http://127.0.0.1:<cổng>`
// + khoá giả `OPENAI_API_KEY`, truyền cổng qua E2E_OPENAI_PORT; kịch bản này dựng máy giả trên cổng đó và GHI LẠI thân mọi yêu cầu tới nó.
// Ca "thiếu khoá → 503" KHÔNG chạy ở đây (wrangler dev dùng chung luôn có khoá giả; env không gỡ được lúc chạy) — phủ ở src/modules/tro-ly/tro-ly-route.test.ts.
// Cài đặt bị đổi (tắt, trần) được KHÔI PHỤC ở `finally` bằng một bản mới (bảng chỉ thêm): bật, 5 USD, 30 câu.
// Dấu `TRO_LY_DAU` nằm trong câu hỏi: run.mjs kiểm log wrangler dev KHÔNG BAO GIỜ chứa nó (không nội dung hỏi / đáp ra log — hàng rào ở docs/SO-HANG-RAO.md).
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { ACCOUNTS, TRO_LY_DAU, call, login, randomPhone, session, sqlRows } from "./lib.mjs";

const PORT = Number(process.env.E2E_OPENAI_PORT);
if (!PORT) throw new Error("Thiếu E2E_OPENAI_PORT (chạy qua npm run test:e2e -- tro-ly)");

/** Máy OpenAI giả: trả lời theo khuôn Responses API; dòng Nguồn lấy tên đoạn đầu tiên trong lời nhắc. */
const nhan = [];
let cheDo = "ok";
const may = createServer((req, res) => {
  let raw = "";
  req.on("data", (d) => (raw += d));
  req.on("end", () => {
    const body = JSON.parse(raw || "{}");
    nhan.push({ url: req.url, auth: req.headers.authorization, body });
    if (cheDo === "loi") {
      res.writeHead(500, { "content-type": "application/json" });
      return res.end(JSON.stringify({ error: { message: "Internal error (English)" } }));
    }
    const ten = /\[([^\]]+)\]/.exec(String(body.instructions ?? ""))?.[1] ?? "";
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({
      status: "completed",
      output: [{ type: "reasoning", summary: [] }, { type: "message", content: [{ type: "output_text", text: `1. Vào trang Tôi.\n2. Bấm Đổi PIN.\nNguồn: [${ten}]` }] }],
      usage: { input_tokens: 4200, input_tokens_details: { cached_tokens: 0 }, output_tokens: 600, output_tokens_details: { reasoning_tokens: 100 } },
    }));
  });
});
await new Promise((ok) => may.listen(PORT, "127.0.0.1", ok));

const SALES = await session(ACCOUNTS.salesA);
const ADMIN = await session(ACCOUNTS.admin);
const OWNER = await session(ACCOUNTS.superAdmin);
const hoi = (cookie, cauHoi) => call(cookie, "POST", "/api/tro-ly/hoi", { cauHoi });
const caiDat = (cookie, body) => call(cookie, "POST", "/api/tro-ly/cai-dat", body);
const soDong = async () => (await sqlRows("SELECT count(*) AS n FROM tl_luot_hoi"))[0].n;
const MAC_DINH = { bat: true, tranThangUsd: 5, tranNgay: 30 };

let r;
try {
  // 1) chưa đăng nhập → 401
  r = await call(null, "POST", "/api/tro-ly/hoi", { cauHoi: "đổi PIN" });
  assert.equal(r.status, 401);
  console.log("✓ chưa đăng nhập → 401");

  // 2) hỏi thường → 200 + nguồn; đúng MỘT dòng tl_luot_hoi, không nội dung; máy giả nhận đúng mẫu + khoá + không id/SĐT người hỏi
  const truoc = await soDong();
  r = await hoi(SALES, `đổi mã PIN thế nào ${TRO_LY_DAU}`);
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.traLoi, "1. Vào trang Tôi.\n2. Bấm Đổi PIN.");
  assert.ok(Array.isArray(r.body.nguon) && r.body.nguon.length === 1, JSON.stringify(r.body));
  assert.equal(nhan.length, 1);
  assert.equal(nhan[0].url, "/v1/responses");
  assert.equal(nhan[0].auth, "Bearer e2e-khoa-gia");
  assert.equal(nhan[0].body.model, "gpt-5-nano");
  assert.equal(nhan[0].body.store, false);
  for (const lo of [ACCOUNTS.salesA.phone, ACCOUNTS.salesA.name]) assert.ok(!JSON.stringify(nhan[0].body).includes(lo), `thân gửi đi lộ ${lo}`);
  assert.equal(await soDong(), truoc + 1);
  const dong = (await sqlRows("SELECT * FROM tl_luot_hoi ORDER BY created_at DESC LIMIT 1"))[0];
  assert.deepEqual(Object.keys(dong).sort(), ["chi_phi_micro_usd", "created_at", "created_by", "id", "ket_qua", "ngay_vn", "staff_id", "token_ra", "token_vao", "token_vao_dem", "updated_at", "updated_by"]);
  assert.equal(dong.ket_qua, "ok");
  assert.equal(dong.chi_phi_micro_usd, 450); // 4200 × 0,05 + 600 × 0,40
  assert.ok(!JSON.stringify(await sqlRows("SELECT * FROM tl_luot_hoi")).includes(TRO_LY_DAU), "nội dung câu hỏi lọt vào CSDL");
  console.log("✓ hỏi thường → 200 + nguồn; một dòng tl_luot_hoi không nội dung, chi phí 450 micro-USD");

  // 3) SĐT / email trong câu hỏi bị che TRƯỚC khi tới máy giả
  r = await hoi(SALES, "khách 0905 123 456 và lan@vidu.vn hỏi đổi PIN thế nào");
  assert.equal(r.status, 200);
  const input = String(nhan.at(-1).body.input);
  assert.ok(!/\d{3}/.test(input) && !input.includes("@"), input);
  assert.ok(input.includes("[đã che]"), input);
  console.log("✓ SĐT, email bị che trước khi rời máy chủ");

  // 4) OpenAI lỗi → 502 câu tiếng Việt, dòng 'loi'
  cheDo = "loi";
  r = await hoi(SALES, "đổi PIN");
  assert.equal(r.status, 502);
  assert.match(r.body.error.message, /^Trợ lý đang bận/);
  assert.ok(!r.body.error.message.includes("English"));
  cheDo = "ok";
  console.log("✓ OpenAI lỗi → 502 câu tiếng Việt");

  // 5) Toàn quyền đổi cài đặt; Quản trị, Bán hàng bị từ chối
  r = await call(OWNER, "GET", "/api/tro-ly/cai-dat");
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.coKhoa, true);
  assert.ok(r.body.chiPhiThangUsd > 0);
  for (const c of [ADMIN, SALES]) {
    assert.equal((await call(c, "GET", "/api/tro-ly/cai-dat")).status, 403);
    assert.equal((await caiDat(c, { bat: false, tranThangUsd: 1, tranNgay: 1 })).status, 403);
  }
  console.log("✓ cài đặt: Toàn quyền 200, Quản trị / Bán hàng 403");

  // 6) tắt → 503, không gọi máy giả
  assert.equal((await caiDat(OWNER, { ...MAC_DINH, bat: false })).status, 200);
  let n = nhan.length;
  r = await hoi(SALES, "đổi PIN");
  assert.equal(r.status, 503);
  assert.equal(r.body.error.code, "tro_ly_chua_bat");
  assert.equal(nhan.length, n);
  console.log("✓ tắt → 503 'Trợ lý chưa bật', không gọi OpenAI");

  // 7) trần tháng: trần 0 USD ⇒ tổng tháng ≥ trần → 429 câu nguyên văn ADR, KHÔNG gọi máy giả
  assert.equal((await caiDat(OWNER, { ...MAC_DINH, tranThangUsd: 0 })).status, 200);
  n = nhan.length;
  r = await hoi(SALES, "đổi PIN");
  assert.equal(r.status, 429);
  assert.equal(r.body.error.code, "tro_ly_het_tran_thang");
  assert.equal(r.body.error.message, "Trợ lý tạm nghỉ tới tháng sau — xem Trợ giúp");
  assert.equal(nhan.length, n, "chạm trần tháng không được gọi OpenAI");
  console.log("✓ trần tháng → 429, không gọi OpenAI");

  // 8) trần ngày: đặt trần = số câu salesA đã hỏi hôm nay ⇒ câu kế → 429; người khác vẫn hỏi được
  const daHoi = (await sqlRows(`SELECT count(*) AS n FROM tl_luot_hoi t JOIN staff s ON s.id = t.staff_id WHERE s.phone = '${ACCOUNTS.salesA.phone}' AND t.ket_qua <> 'het_tran'`))[0].n;
  assert.equal((await caiDat(OWNER, { ...MAC_DINH, tranNgay: daHoi })).status, 200);
  n = nhan.length;
  r = await hoi(SALES, "đổi PIN");
  assert.equal(r.status, 429, JSON.stringify(r.body));
  assert.equal(r.body.error.code, "tro_ly_het_tran_ngay");
  assert.equal(nhan.length, n);
  assert.equal((await hoi(ADMIN, "đổi PIN")).status, 200, "trần ngày là của TỪNG người");
  assert.equal((await caiDat(OWNER, MAC_DINH)).status, 200);
  console.log("✓ trần ngày → 429 cho người đã đủ câu; người khác vẫn hỏi được");

  // 9) mọi mã quyền hỏi được (tài khoản dùng một lần; Tài xế đối tác tạo theo vai như tai-xe-doi-tac.mjs)
  const cacMa = [["SALES"], ["ACCOUNTING"], ["ADMIN"], ["FIELD"], ["PARTNER"], ["SUPER_ADMIN"], ["INTERN"], ["DRIVER"]];
  const taiKhoan = [];
  for (const permissions of cacMa) {
    const t = await call(OWNER, "POST", "/api/staff", { fullName: `Trợ Lý ${permissions[0]} E2E`, phone: randomPhone(), permissions });
    assert.equal(t.status, 201, `${permissions}: ${JSON.stringify(t.body)}`);
    taiKhoan.push([permissions[0], t.body]);
  }
  const tx = await call(OWNER, "POST", "/api/staff", { fullName: "Trợ Lý Tài Xế Đối Tác E2E", phone: randomPhone(), roles: ["DRIVER_EXTERNAL"] });
  assert.equal(tx.status, 201, JSON.stringify(tx.body));
  taiKhoan.push(["DRIVER_PARTNER", tx.body]);
  for (const [ma, t] of taiKhoan) {
    const lg = await login(t.staff.phone, t.pin);
    assert.equal(lg.status, 200, `${ma}: ${JSON.stringify(lg.body)}`);
    r = await hoi(lg.cookie, "đổi PIN thế nào");
    assert.equal(r.status, 200, `${ma}: ${JSON.stringify(r.body)}`);
  }
  console.log(`✓ mọi mã quyền hỏi được (${taiKhoan.map(([m]) => m).join(", ")})`);
} finally {
  await caiDat(OWNER, MAC_DINH).catch(() => undefined);
  may.close();
}
