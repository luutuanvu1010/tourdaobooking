// Trợ lý Hỗ trợ (ADR-0066) trên API THẬT + D1 local, với máy OpenAI GIẢ cục bộ: run.mjs chọn cổng trống, đặt `--var OPENAI_BASE_URL:http://127.0.0.1:<cổng>`
// + khoá giả `OPENAI_API_KEY`, truyền cổng qua E2E_OPENAI_PORT; kịch bản này dựng máy giả trên cổng đó và GHI LẠI thân mọi yêu cầu tới nó.
// Ca "thiếu khoá → 503" KHÔNG chạy ở đây (wrangler dev dùng chung luôn có khoá giả; env không gỡ được lúc chạy) — phủ ở src/modules/tro-ly/tro-ly-route.test.ts.
// Cài đặt bị đổi (tắt, trần) được KHÔI PHỤC ở `finally` bằng một bản mới (bảng chỉ thêm): bật, 5 USD, 30 câu; ADR-0069: công tắc vai bật lại cả 9, lời dặn
// trả về bản đọc lúc đầu kịch bản (D1 dùng chung với các kịch bản khác).
// Dấu `TRO_LY_DAU` nằm trong câu hỏi: run.mjs kiểm log wrangler dev KHÔNG BAO GIỜ chứa nó (không nội dung hỏi / đáp ra log — hàng rào ở docs/SO-HANG-RAO.md).
import assert from "node:assert/strict";
import { createServer } from "node:http";
import * as esbuild from "esbuild";
import { ACCOUNTS, TRO_LY_DAU, TRO_LY_KHOA, call, login, randomPhone, session, sqlRows } from "./lib.mjs";

const PORT = Number(process.env.E2E_OPENAI_PORT);
if (!PORT) throw new Error("Thiếu E2E_OPENAI_PORT (chạy qua npm run test:e2e -- tro-ly)");

/** Máy OpenAI giả: trả lời theo khuôn Responses API; dòng Nguồn lấy tên đoạn đầu tiên của khối tài liệu (không đoạn nào ⇒ không dòng Nguồn). */
const nhan = [];
let cheDo = "ok";
/** ADR-0082: cửa /v1/embeddings của máy giả — ghi RIÊNG (`nhan` vẫn chỉ /v1/responses); véc-tơ một-nóng: chữ có "pin" ⇒ chiều 0, còn lại ⇒ chiều 1. */
const nhung = [];
let cheDoNhung = "ok";
const may = createServer((req, res) => {
  let raw = "";
  req.on("data", (d) => (raw += d));
  req.on("end", () => {
    const body = JSON.parse(raw || "{}");
    if (req.url === "/v1/embeddings") {
      nhung.push({ auth: req.headers.authorization, body });
      if (cheDoNhung === "loi") {
        res.writeHead(500, { "content-type": "application/json" });
        return res.end(JSON.stringify({ error: { message: "Embeddings down (English)" } }));
      }
      const dau = Array.isArray(body.input) ? body.input : [];
      const data = dau.map((s, index) => { const e = new Array(body.dimensions).fill(0); e[/pin/i.test(String(s)) ? 0 : 1] = 1; return { object: "embedding", index, embedding: e }; });
      res.writeHead(200, { "content-type": "application/json" });
      return res.end(JSON.stringify({ object: "list", data, model: body.model, usage: { prompt_tokens: 10 * dau.length, total_tokens: 10 * dau.length } }));
    }
    nhan.push({ url: req.url, auth: req.headers.authorization, body });
    if (cheDo === "loi") {
      res.writeHead(500, { "content-type": "application/json" });
      return res.end(JSON.stringify({ error: { message: "Internal error (English)" } }));
    }
    // ADR-0069 điều 2 (Thử key): 401 sai khoá — chữ lỗi LẶP LẠI một phần khoá như OpenAI thật; 429 hết hạn mức.
    if (cheDo === "401" || cheDo === "429q") {
      res.writeHead(cheDo === "401" ? 401 : 429, { "content-type": "application/json" });
      return res.end(JSON.stringify({ error: { message: `Incorrect API key provided: ${TRO_LY_KHOA.slice(0, 10)}***${TRO_LY_KHOA.slice(-4)}`, code: cheDo === "401" ? "invalid_api_key" : "insufficient_quota" } }));
    }
    // Tên đoạn ĐẦU TIÊN của khối "TÀI LIỆU:" CUỐI (máy chủ luôn nối khối này sau lời nhắc — ADR-0073 B4); lời nhắc có "[tên mục]" ở luật Nguồn không tính.
    // ADR-0073 Đ7a: câu trả lời có số tiền — máy chủ phải ẩn trước khi trả / lưu.
    if (cheDo === "tien") {
      res.writeHead(200, { "content-type": "application/json" });
      return res.end(JSON.stringify({ status: "completed", output: [{ type: "message", content: [{ type: "output_text", text: "Giá tour 500.000 đ, phụ thu 300k. Mã đơn TD-2026." }] }], usage: { input_tokens: 100, output_tokens: 20 } }));
    }
    const ins = String(body.instructions ?? "");
    const ten = /\[([^\]]+)\]/.exec(ins.slice(ins.lastIndexOf("TÀI LIỆU:")))?.[1] ?? "";
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({
      status: "completed",
      output: [{ type: "reasoning", summary: [] }, { type: "message", content: [{ type: "output_text", text: `1. Vào trang Tôi.\n2. Bấm Đổi PIN.${ten ? `\nNguồn: [${ten}]` : ""}` }] }],
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
const PERMS = ["SALES", "ACCOUNTING", "ADMIN", "FIELD", "PARTNER", "SUPER_ADMIN", "INTERN", "DRIVER", "DRIVER_PARTNER", "HR"]; // HR: ADR-0071
const tatCaVai = (bat) => Object.fromEntries(PERMS.map((p) => [p, bat]));
const datVai = (vai) => call(OWNER, "POST", "/api/tro-ly/vai", { vai });
const loiDanDau = (await call(OWNER, "GET", "/api/tro-ly/loi-dan")).body.hienHanh;
assert.ok(loiDanDau?.cauChao, "đọc được lời dặn đầu kịch bản (để khôi phục)");
const boNaoDau = (await call(OWNER, "GET", "/api/tro-ly/bo-nao")).body.hienHanh;
assert.ok(boNaoDau?.loiNhac, "đọc được bộ não đầu kịch bản (để khôi phục)");

// Route quản lý lấy từ CHÍNH module (esbuild như src/tai-xe-cong.test.ts) — không danh sách viết tay.
const built = await esbuild.build({ entryPoints: [new URL("../../src/modules/tro-ly/index.ts", import.meta.url).pathname], bundle: true, format: "esm", platform: "neutral", target: "es2022", write: false, logLevel: "silent" });
const { troLyModule } = await import(`data:text/javascript;base64,${Buffer.from(built.outputFiles[0].text).toString("base64")}`);
const QUAN_LY = troLyModule.routes.filter((x) => x.access === "office");

let r;
try {
  // 1) chưa đăng nhập → 401
  r = await call(null, "POST", "/api/tro-ly/hoi", { cauHoi: "đổi PIN" });
  assert.equal(r.status, 401);
  console.log("✓ chưa đăng nhập → 401");

  // 2) hỏi thường → 200 + nguồn; đúng MỘT dòng tl_luot_hoi, không nội dung; máy giả nhận đúng mẫu + khoá + không id/SĐT người hỏi
  const truoc = await soDong();
  const m0 = nhung.length;
  r = await hoi(SALES, `đổi mã PIN thế nào ${TRO_LY_DAU}`);
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.traLoi, "1. Vào trang Tôi.\n2. Bấm Đổi PIN.");
  assert.ok(Array.isArray(r.body.nguon) && r.body.nguon.length === 1, JSON.stringify(r.body));
  assert.equal(nhan.length, 1);
  assert.equal(nhan[0].url, "/v1/responses");
  assert.equal(nhan[0].auth, `Bearer ${TRO_LY_KHOA}`);
  assert.equal(nhan[0].body.model, "gpt-5-nano");
  assert.equal(nhan[0].body.store, false);
  for (const lo of [ACCOUNTS.salesA.phone, ACCOUNTS.salesA.name]) assert.ok(!JSON.stringify(nhan[0].body).includes(lo), `thân gửi đi lộ ${lo}`);
  assert.equal(await soDong(), truoc + 1);
  const dong = (await sqlRows("SELECT * FROM tl_luot_hoi ORDER BY created_at DESC LIMIT 1"))[0];
  assert.deepEqual(Object.keys(dong).sort(), ["chi_phi_micro_usd", "created_at", "created_by", "id", "ket_qua", "la_thu", "mau", "ngay_vn", "staff_id", "token_ra", "token_vao", "token_vao_dem", "updated_at", "updated_by"]);
  assert.equal(dong.ket_qua, "ok");
  assert.equal(dong.mau, "gpt-5-nano");
  assert.equal(dong.la_thu, 0);
  // ADR-0082 P1: tiền lượt = mẫu (4200 × 0,05 + 600 × 0,40 = 450) + embedding của MỌI lần gọi /v1/embeddings trong lượt
  // (máy giả: 10 token / đầu vào; 0,02 USD / 1 triệu token, làm tròn lên từng lần gọi). Kho có thể đã được tính bù bởi kịch bản chạy trước ⇒ đếm theo lần gọi thật.
  const tienNhung = nhung.slice(m0).reduce((a, x) => a + Math.ceil((10 * x.body.input.length * 20_000) / 1_000_000), 0);
  assert.ok(tienNhung >= 1, "lượt có gọi embeddings");
  assert.equal(dong.chi_phi_micro_usd, 450 + tienNhung);
  assert.deepEqual([dong.token_vao, dong.token_ra], [4200, 600], "token chỉ của mẫu trả lời");
  assert.ok(!JSON.stringify(await sqlRows("SELECT * FROM tl_luot_hoi")).includes(TRO_LY_DAU), "nội dung câu hỏi lọt vào CSDL");
  console.log("✓ hỏi thường → 200 + nguồn; một dòng tl_luot_hoi không nội dung, chi phí = mẫu 450 + embedding micro-USD");

  // 2b) ADR-0082: dấu vân nghĩa ghi vào D1 THẬT (wrangler dev) dạng BLOB đúng độ dài; thân embeddings ĐÚNG bốn khoá, không SĐT người hỏi;
  //     câu kế tiếp chỉ tính véc-tơ câu hỏi; ô thử có đoạn "khớp nghĩa" ⇒ véc-tơ đoạn đã được ĐỌC LẠI từ D1 và giải mã đúng (bộ nhớ isolate chỉ nạp từ D1 — R1).
  const vn = (await sqlRows("SELECT count(*) AS n, sum(typeof(vec) = 'blob') AS b, min(length(vec)) AS mn, max(length(vec)) AS mx, min(so_chieu) AS sc FROM tl_van_nghia"))[0];
  console.log("  vn =", JSON.stringify(vn), "| lần gọi embeddings:", nhung.length, "| tiền embeddings lượt đầu:", tienNhung, "| chi phí lượt:", dong.chi_phi_micro_usd);
  assert.ok(vn.n >= 200, JSON.stringify(vn));
  assert.equal(vn.b, vn.n, "mọi véc-tơ là BLOB");
  assert.deepEqual([vn.mn, vn.mx], [vn.sc * 4, vn.sc * 4]);
  assert.ok(nhung.length >= 1);
  for (const x of nhung) {
    assert.equal(x.auth, `Bearer ${TRO_LY_KHOA}`);
    assert.deepEqual(Object.keys(x.body).sort(), ["dimensions", "encoding_format", "input", "model"]);
    for (const lo of [ACCOUNTS.salesA.phone, ACCOUNTS.salesA.name]) assert.ok(!JSON.stringify(x.body).includes(lo), `thân embeddings lộ ${lo}`);
  }
  let m = nhung.length;
  r = await hoi(SALES, "đổi mã PIN thế nào");
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(nhung.length, m + 1, "câu kế tiếp chỉ tính véc-tơ câu hỏi");
  assert.equal(nhung.at(-1).body.input.length, 1);
  r = await call(OWNER, "POST", "/api/tro-ly/thu", { boNao: boNaoDau, cauHoi: "đổi mã PIN thế nào", vai: "SALES" });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.ok(r.body.doanDaChon.some((d) => d.theoNghia), JSON.stringify(r.body.doanDaChon));
  assert.ok(r.body.chiPhiVanNghiaMicroUsd >= 1);
  console.log("✓ dấu vân nghĩa: BLOB trên D1 thật, câu sau không tính lại đoạn, ô thử có đoạn khớp nghĩa (đọc lại BLOB)");

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

  // 4b) ADR-0082 L1: Embeddings lỗi ⇒ vẫn trả lời (lùi về từ khoá), mẫu trả lời vẫn được gọi
  cheDoNhung = "loi";
  m = nhan.length;
  r = await hoi(SALES, "đổi PIN thế nào");
  cheDoNhung = "ok";
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(nhan.length, m + 1);
  console.log("✓ Embeddings lỗi → vẫn trả lời (lùi về từ khoá)");

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
  const daHoi = (await sqlRows(`SELECT count(*) AS n FROM tl_luot_hoi t JOIN staff s ON s.id = t.staff_id WHERE s.phone = '${ACCOUNTS.salesA.phone}' AND t.ket_qua <> 'het_tran' AND t.la_thu = 0`))[0].n;
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
    const t = await call(OWNER, "POST", "/api/staff", { taoHoSoMoi: true, fullName: `Trợ Lý ${permissions[0]} E2E`, phone: randomPhone(), permissions });
    assert.equal(t.status, 201, `${permissions}: ${JSON.stringify(t.body)}`);
    taiKhoan.push([permissions[0], t.body]);
  }
  const tx = await call(OWNER, "POST", "/api/staff", { taoHoSoMoi: true, fullName: "Trợ Lý Tài Xế Đối Tác E2E", phone: randomPhone(), roles: ["DRIVER_EXTERNAL"] });
  assert.equal(tx.status, 201, JSON.stringify(tx.body));
  taiKhoan.push(["DRIVER_PARTNER", tx.body]);
  for (const [ma, t] of taiKhoan) {
    const lg = await login(t.staff.phone, t.pin);
    assert.equal(lg.status, 200, `${ma}: ${JSON.stringify(lg.body)}`);
    r = await hoi(lg.cookie, "đổi PIN thế nào");
    assert.equal(r.status, 200, `${ma}: ${JSON.stringify(r.body)}`);
  }
  console.log(`✓ mọi mã quyền hỏi được (${taiKhoan.map(([m]) => m).join(", ")})`);

  // ---- ADR-0069: bảng điều khiển của Toàn quyền ----

  // 10) Quản trị, Bán hàng: 403 ở MỌI route quản lý (lặp troLyModule.routes)
  assert.ok(QUAN_LY.length >= 9, `chống bài rỗng: ${QUAN_LY.length}`);
  for (const rt of QUAN_LY) {
    const path = rt.path.replace(":id", "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
    for (const c of [ADMIN, SALES]) assert.equal((await call(c, rt.method, path, rt.method === "GET" ? undefined : {})).status, 403, `${rt.method} ${rt.path}`);
  }
  console.log(`✓ Quản trị, Bán hàng 403 ở cả ${QUAN_LY.length} route quản lý`);

  // 11) vai tắt ⇒ 403 lời thường, KHÔNG gọi máy giả; khung báo không dùng; tài khoản lai (Bán hàng + Kế toán) vẫn hỏi được khi chỉ Kế toán bật
  const lai = await call(OWNER, "POST", "/api/staff", { taoHoSoMoi: true, fullName: "Trợ Lý Lai E2E", phone: randomPhone(), permissions: ["SALES", "ACCOUNTING"] });
  assert.equal(lai.status, 201, JSON.stringify(lai.body));
  const laiCookie = (await login(lai.body.staff.phone, lai.body.pin)).cookie;
  assert.equal((await datVai({ ...tatCaVai(true), SALES: false })).status, 200);
  n = nhan.length;
  r = await hoi(SALES, "đổi PIN thế nào");
  assert.equal(r.status, 403, JSON.stringify(r.body));
  assert.equal(r.body.error.code, "tro_ly_vai_tat");
  assert.match(r.body.error.message, /^Trợ lý Hỗ trợ đang tắt với vai của bạn/);
  assert.equal(nhan.length, n, "vai tắt không được gọi OpenAI");
  assert.equal((await call(SALES, "GET", "/api/tro-ly/khung")).body.duocDung, false);
  assert.equal((await hoi(laiCookie, "đổi PIN thế nào")).status, 200, "ít nhất một vai bật là được");
  assert.equal((await datVai(tatCaVai(true))).status, 200);
  assert.equal((await call(SALES, "GET", "/api/tro-ly/khung")).body.duocDung, true);
  console.log("✓ vai tắt → 403, không gọi OpenAI, nút ẩn; tài khoản lai vẫn hỏi được");

  // 12) lời dặn có SĐT ⇒ 400; lời dặn hợp lệ ⇒ khung hiện câu chào + câu hỏi mẫu mới
  r = await call(OWNER, "POST", "/api/tro-ly/loi-dan", { ...loiDanDau, cauChao: "Cần gì gọi 0905 123 456" });
  assert.equal(r.status, 400, JSON.stringify(r.body));
  assert.match(r.body.error.message, /không được chứa/);
  r = await call(OWNER, "POST", "/api/tro-ly/loi-dan", { cauChao: "Chào bạn, hỏi mình nhé (e2e).", giong: "ngắn gọn", loiDanThem: "", cauHoiMau: ["Đổi mã PIN thế nào?"] });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.deepEqual((await call(SALES, "GET", "/api/tro-ly/khung")).body, { duocDung: true, cauChao: "Chào bạn, hỏi mình nhé (e2e).", cauHoiMau: ["Đổi mã PIN thế nào?"] });
  console.log("✓ lời dặn có SĐT → 400; lời dặn mới hiện ở khung");

  // 13) lịch sử có câu ĐÃ CHE, không có SĐT gốc
  r = await hoi(SALES, "khách 0905 777 888 hỏi đổi mã PIN thế nào E2E-LS");
  assert.equal(r.status, 200, JSON.stringify(r.body));
  r = await call(OWNER, "GET", "/api/tro-ly/lich-su?q=E2E-LS");
  assert.equal(r.status, 200);
  assert.equal(r.body.dong.length >= 1, true, JSON.stringify(r.body));
  assert.ok(r.body.dong[0].cauHoi.includes("[đã che]"), r.body.dong[0].cauHoi);
  assert.ok(!JSON.stringify(r.body).includes("777 888") && !JSON.stringify(r.body).includes("0905777888"));
  const lsDb = await sqlRows("SELECT cau_hoi FROM tl_hoi_dap WHERE cau_hoi LIKE '%E2E-LS%'");
  assert.ok(lsDb.length >= 1 && lsDb.every((x) => !x.cau_hoi.includes("777")), JSON.stringify(lsDb));
  console.log("✓ lịch sử có câu đã che, không có SĐT gốc (cả phản hồi lẫn CSDL)");

  // 14) tình trạng key: tối đa 4 ký tự cuối, KHÔNG cửa sổ 5 ký tự nào của khoá; Thử key 401 ⇒ sai key, 429 insufficient_quota ⇒ hết tiền
  r = await call(OWNER, "GET", "/api/tro-ly/cai-dat");
  assert.equal(r.body.khoaCuoi, "QZ7K");
  const chu = [JSON.stringify(r.body)];
  cheDo = "401";
  r = await call(OWNER, "POST", "/api/tro-ly/thu-khoa", {});
  assert.equal(r.status, 200);
  assert.equal(r.body.ma, "sai_khoa", JSON.stringify(r.body));
  assert.match(r.body.cau, /^Sai key/);
  chu.push(JSON.stringify(r.body));
  cheDo = "429q";
  r = await call(OWNER, "POST", "/api/tro-ly/thu-khoa", {});
  assert.equal(r.body.ma, "het_tien", JSON.stringify(r.body));
  chu.push(JSON.stringify(r.body));
  cheDo = "ok";
  r = await call(OWNER, "POST", "/api/tro-ly/thu-khoa", {});
  assert.equal(r.body.ma, "duoc");
  const tat = chu.join("\n");
  for (let i = 0; i + 5 <= TRO_LY_KHOA.length; i++) assert.ok(!tat.includes(TRO_LY_KHOA.slice(i, i + 5)), `lộ "${TRO_LY_KHOA.slice(i, i + 5)}"`);
  console.log("✓ key chỉ lộ 4 ký tự cuối; Thử key: sai key (401), hết tiền (429), được");
  // ---- ADR-0073: bộ não, nhớ, ô thử, ẩn tiền, trần trước khi gọi ----

  // 15) B1: GET bộ não — danh sách 3 mẫu có giá; B2: PUT sai ⇒ 400; B3: PUT đúng ⇒ câu hỏi kế tiếp gửi đúng mẫu / mức / độ dài / token / lời nhắc
  r = await call(OWNER, "GET", "/api/tro-ly/bo-nao");
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.deepEqual(r.body.danhSachMau.map((m) => m.ma), ["gpt-5-nano", "gpt-5-mini", "gpt-5"]);
  const MINI = { mau: "gpt-5-mini", mucSuyNghi: "low", doDai: "medium", tokenRaToiDa: 1500, loiNhac: "Lời nhắc e2e.\nTrả lời ngắn." };
  r = await call(OWNER, "PUT", "/api/tro-ly/bo-nao", { ...MINI, mau: "gpt-4o" });
  assert.equal(r.status, 400, JSON.stringify(r.body));
  r = await call(OWNER, "PUT", "/api/tro-ly/bo-nao", MINI);
  assert.equal(r.status, 200, JSON.stringify(r.body));
  r = await hoi(SALES, "đổi mã PIN thế nào");
  assert.equal(r.status, 200, JSON.stringify(r.body));
  const b15 = nhan.at(-1).body;
  assert.deepEqual([b15.model, b15.reasoning, b15.text, b15.max_output_tokens], ["gpt-5-mini", { effort: "low" }, { verbosity: "medium" }, 1500]);
  assert.ok(String(b15.instructions).startsWith(MINI.loiNhac));
  assert.equal((await sqlRows(`SELECT t.mau FROM tl_luot_hoi t JOIN staff s ON s.id = t.staff_id WHERE s.phone = '${ACCOUNTS.salesA.phone}' AND t.la_thu = 0 ORDER BY t.created_at DESC, t.rowid DESC LIMIT 1`))[0].mau, "gpt-5-mini");
  console.log("✓ bộ não: danh sách mẫu, PUT sai 400, PUT đúng ⇒ câu hỏi dùng đúng cấu hình");

  // 16) N1–N4: nhớ 3 lượt cùng người cùng mã; người khác cùng mã không nhận; mã sai ⇒ 400
  const CUOC = crypto.randomUUID();
  assert.equal((await call(SALES, "POST", "/api/tro-ly/hoi", { cauHoi: "đổi mã PIN thế nào E2E-NHO", cuocTroChuyen: CUOC })).status, 200);
  assert.equal((await call(SALES, "POST", "/api/tro-ly/hoi", { cauHoi: "còn trên điện thoại thì sao", cuocTroChuyen: CUOC })).status, 200);
  const inp = nhan.at(-1).body.input;
  assert.ok(Array.isArray(inp) && inp.length === 3, JSON.stringify(inp));
  assert.deepEqual(inp.map((x) => x.role), ["user", "assistant", "user"], JSON.stringify(inp));
  assert.ok(inp[0].content.includes("E2E-NHO"), "mục 1 = câu hỏi đầu");
  assert.ok(inp[1].content.includes("Bấm Đổi PIN"), "mục 2 = câu trả lời đầu");
  assert.ok(inp[2].content.includes("còn trên điện thoại thì sao"), "mục 3 = câu hỏi thứ hai");
  assert.equal((await call(ADMIN, "POST", "/api/tro-ly/hoi", { cauHoi: "còn cách khác không", cuocTroChuyen: CUOC })).status, 200);
  assert.equal(nhan.at(-1).body.input, "còn cách khác không", "người khác cùng mã KHÔNG nhận lượt của người trước");
  assert.equal((await call(SALES, "POST", "/api/tro-ly/hoi", { cauHoi: "x", cuocTroChuyen: "khong-phai-ma" })).status, 400);
  console.log("✓ nhớ 3 lượt: cùng người cùng mã có nhớ; người khác không; mã sai 400");

  // 17) T1–T5: ô thử — cấu hình chưa lưu, vai giả định; la_thu = 1; không ghi lịch sử; không đổi cấu hình đang dùng
  const soHoiDap = (await sqlRows("SELECT count(*) AS n FROM tl_hoi_dap"))[0].n;
  const soBan = (await sqlRows("SELECT count(*) AS n FROM tl_bo_nao"))[0].n;
  r = await call(OWNER, "POST", "/api/tro-ly/thu", { boNao: { ...MINI, mau: "gpt-5", loiNhac: "Lời nhắc đang soạn e2e." }, cauHoi: "đổi mã PIN thế nào", vai: "ACCOUNTING" });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.mau, "gpt-5");
  assert.ok(r.body.chiPhiMicroUsd > 0);
  assert.equal(nhan.at(-1).body.model, "gpt-5");
  assert.match(String(nhan.at(-1).body.instructions), /Người hỏi thuộc nhóm vai: Kế toán\./);
  assert.equal((await sqlRows(`SELECT t.la_thu FROM tl_luot_hoi t JOIN staff s ON s.id = t.staff_id WHERE s.phone = '${ACCOUNTS.superAdmin.phone}' AND t.mau = 'gpt-5' ORDER BY t.created_at DESC, t.rowid DESC LIMIT 1`))[0].la_thu, 1);
  assert.ok(String(nhan.at(-1).body.instructions).startsWith("Lời nhắc đang soạn e2e."), "ô thử dùng lời nhắc chưa lưu");
  assert.equal((await sqlRows("SELECT count(*) AS n FROM tl_hoi_dap"))[0].n, soHoiDap, "thử không ghi lịch sử");
  assert.equal((await sqlRows("SELECT count(*) AS n FROM tl_bo_nao"))[0].n, soBan, "thử không đổi cấu hình");
  console.log("✓ ô thử: cấu hình chưa lưu, la_thu = 1, không lịch sử, không đổi cấu hình");

  // 18) P1: câu trả lời có số tiền ⇒ ẩn trước khi trả VÀ trong CSDL
  cheDo = "tien";
  r = await hoi(SALES, "đổi mã PIN thế nào E2E-TIEN");
  cheDo = "ok";
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.traLoi, "Giá tour [đã ẩn số tiền], phụ thu [đã ẩn số tiền]. Mã đơn TD-2026.");
  const luuTien = await sqlRows("SELECT tra_loi FROM tl_hoi_dap WHERE cau_hoi LIKE '%E2E-TIEN%'");
  assert.ok(luuTien.length === 1 && !/500\.000|300k/.test(luuTien[0].tra_loi), JSON.stringify(luuTien));
  console.log("✓ số tiền bị ẩn ở câu trả lời và lịch sử");

  // 19) P2: mẫu đắt + trần thấp ⇒ 429 TRƯỚC khi gọi mẫu
  assert.equal((await call(OWNER, "PUT", "/api/tro-ly/bo-nao", { ...MINI, mau: "gpt-5", mucSuyNghi: "high", tokenRaToiDa: 4000 })).status, 200);
  const daDungThang = (await call(OWNER, "GET", "/api/tro-ly/cai-dat")).body.chiPhiThangUsd;
  assert.equal((await caiDat(OWNER, { ...MAC_DINH, tranThangUsd: Math.round((daDungThang + 0.01) * 1e6) / 1e6 })).status, 200);
  n = nhan.length;
  r = await hoi(SALES, "đổi mã PIN thế nào");
  assert.equal(r.status, 429, JSON.stringify(r.body));
  assert.equal(r.body.error.code, "tro_ly_het_tran_thang");
  assert.equal(nhan.length, n, "không gọi mẫu");
  // đối chứng: cùng trần thấp, mẫu rẻ + token nhỏ ⇒ qua (429 ở trên đến từ chi phí tối đa của mẫu đắt)
  assert.equal((await call(OWNER, "PUT", "/api/tro-ly/bo-nao", { ...MINI, mau: "gpt-5-nano", mucSuyNghi: "minimal", tokenRaToiDa: 1200 })).status, 200);
  n = nhan.length;
  r = await hoi(SALES, "đổi mã PIN thế nào");
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(nhan.length, n + 1, "mẫu rẻ được gọi");
  assert.equal((await caiDat(OWNER, MAC_DINH)).status, 200);
  console.log("✓ trần tháng kiểm bằng chi phí tối đa trước khi gọi mẫu");

  // 20) B6: lịch sử bản có phần đổi; chỉ Toàn quyền
  r = await call(OWNER, "GET", "/api/tro-ly/bo-nao/lich-su");
  assert.equal(r.status, 200);
  assert.ok(r.body.cacBan.length >= 2 && typeof r.body.cacBan[0].phanDoi === "string", JSON.stringify(r.body).slice(0, 200));
  console.log("✓ lịch sử bản bộ não");
} finally {
  // Khôi phục D1 dùng chung: bước nào không trả 200 thì báo to và làm kịch bản đỏ (không để cấu hình đắt / trần thấp nằm lại).
  const loiKhoiPhuc = [];
  const khoiPhuc = async (ten, p) => { const x = await p.catch((e) => ({ status: String(e) })); if (x.status !== 200) loiKhoiPhuc.push(`${ten}: ${x.status}`); };
  await khoiPhuc("cài đặt", caiDat(OWNER, MAC_DINH));
  await khoiPhuc("vai", datVai(tatCaVai(true)));
  await khoiPhuc("lời dặn", call(OWNER, "POST", "/api/tro-ly/loi-dan", loiDanDau));
  if (boNaoDau) await khoiPhuc("bộ não", call(OWNER, "PUT", "/api/tro-ly/bo-nao", boNaoDau));
  if (loiKhoiPhuc.length) { console.error(`KHÔI PHỤC THẤT BẠI — D1 có thể còn cấu hình thử: ${loiKhoiPhuc.join("; ")}`); process.exitCode = 1; }
  may.close();
}
