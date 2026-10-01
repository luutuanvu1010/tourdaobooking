// Route của trợ lý Hỗ trợ (ADR-0066) chạy CẢ ứng dụng trên SQLite thật qua khung tests/audit/harness.mjs; OpenAI thay bằng `globalThis.fetch` giả
// (không mạng). Phủ các ca e2e không dựng được trên `wrangler dev` dùng chung: THIẾU KHOÁ (env không gỡ được lúc chạy), cùng mọi ca trần, che, lưu.
// Hàng rào ghi ở docs/SO-HANG-RAO.md: (1) SĐT/email bị che TRƯỚC khi rời máy chủ; (2) không nội dung hỏi/đáp trong CSDL hay console; (3) trần tháng
// chặn KHÔNG gọi OpenAI, trần ngày chặn đúng số câu.
import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";
import { CAU_HET_TRAN_THANG } from "../../shared/tro-ly.ts";
import { PERMISSION_CODES } from "../../shared/permissions.ts";
import { vnToday } from "../../shared/vn-date.ts";

const SALES = "11111111-1111-4111-8111-111111111111";
const ADM = "33333333-3333-4333-8333-333333333333";
const SUP = "77777777-7777-4777-8777-777777777777";
const DAU = "MOC-KHONG-DUOC-LO-7Q"; // dấu nhận diện nội dung câu hỏi — không được xuất hiện trong CSDL hay console

interface GoiGia { url: string; headers: Record<string, string>; body: Record<string, unknown> }
const fetchThat = globalThis.fetch;
afterEach(() => { globalThis.fetch = fetchThat; });

/** OpenAI giả: ghi lại mọi yêu cầu; trả câu trả lời có dòng Nguồn lấy tên đoạn đầu tiên của khối tài liệu (không có đoạn nào ⇒ không dòng Nguồn). */
function openAiGia(tuyChon: { status?: number; usage?: Record<string, unknown> | null; chu?: string; nem?: boolean } = {}): GoiGia[] {
  const goi: GoiGia[] = [];
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input instanceof Request ? input.url : input);
    const body = JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>;
    goi.push({ url, headers: Object.fromEntries(new Headers(init?.headers).entries()), body });
    if (tuyChon.nem) throw new TypeError("mạng hỏng");
    // Tên đoạn ĐẦU TIÊN của khối "TÀI LIỆU:" CUỐI (máy chủ luôn nối khối này sau lời nhắc — ADR-0073 B4); lời nhắc có "[tên mục]" ở luật Nguồn không tính.
    const ins = String(body.instructions ?? "");
    const ten = /\[([^\]]+)\]/.exec(ins.slice(ins.lastIndexOf("TÀI LIỆU:")))?.[1] ?? "";
    const usage = tuyChon.usage === undefined ? { input_tokens: 4000, input_tokens_details: { cached_tokens: 0 }, output_tokens: 500 } : tuyChon.usage;
    const payload = {
      status: "completed",
      output: [{ type: "message", content: [{ type: "output_text", text: tuyChon.chu ?? `1. Vào trang Tôi.\n2. Bấm Đổi PIN.${ten ? `\nNguồn: [${ten}]` : ""}` }] }],
      ...(usage ? { usage } : {}),
    };
    return new Response(JSON.stringify(payload), { status: tuyChon.status ?? 200, headers: { "content-type": "application/json" } });
  }) as typeof fetch;
  return goi;
}

function setup(khoa: string | null = "khoa-gia") {
  const w = world();
  seedStaff(w.sqlite, { id: SALES, phone: "0900000001", name: "An", perms: ["SALES"] });
  seedStaff(w.sqlite, { id: ADM, phone: "0900000003", name: "Quản trị", perms: ["ADMIN"] });
  seedStaff(w.sqlite, { id: SUP, phone: "0900000007", name: "Chủ", perms: ["SUPER_ADMIN"] });
  if (khoa !== null) (w.env as Record<string, unknown>).OPENAI_API_KEY = khoa;
  return w;
}
const luot = (w: ReturnType<typeof setup>) => w.q("SELECT * FROM tl_luot_hoi ORDER BY created_at");
const hoi = (w: ReturnType<typeof setup>, as: string | undefined, cauHoi: unknown) => w.call("POST", "/api/tro-ly/hoi", { as, body: { cauHoi } });

test("chưa đăng nhập → 401; thiếu Origin cùng site → 403 (như mọi POST)", async () => {
  const w = setup();
  const goi = openAiGia();
  assert.equal((await hoi(w, undefined, "đổi PIN")).status, 401);
  assert.equal((await w.call("POST", "/api/tro-ly/hoi", { as: SALES, body: { cauHoi: "x" }, headers: { origin: "https://ke-la.vn" } })).status, 403);
  assert.equal(goi.length, 0);
});

test("thiếu khoá OPENAI_API_KEY → 503 'Trợ lý chưa bật', không gọi OpenAI, không ghi dòng", async () => {
  for (const khoa of [null, "", "   "]) {
    const w = setup(khoa);
    const goi = openAiGia();
    const r = await hoi(w, SALES, "đổi PIN thế nào");
    assert.equal(r.status, 503, r.text);
    assert.equal(r.json.error.code, "tro_ly_chua_bat");
    assert.match(r.json.error.message, /^Trợ lý chưa bật/);
    assert.equal(goi.length, 0);
    assert.equal(luot(w).length, 0);
  }
});

test("đang tắt (bản cài đặt mới nhất bat = 0) → 503, không gọi OpenAI", async () => {
  const w = setup();
  const goi = openAiGia();
  w.sqlite.exec(`INSERT INTO tl_cai_dat (id, bat, tran_thang_micro_usd, tran_ngay, valid_from_at, created_at, updated_at) VALUES ('t', 0, 5000000, 30, '2999-01-01T00:00:00.000Z', '2999-01-01T00:00:00.000Z', '2999-01-01T00:00:00.000Z')`);
  const r = await hoi(w, SALES, "đổi PIN thế nào");
  assert.equal(r.status, 503);
  assert.equal(r.json.error.code, "tro_ly_chua_bat");
  assert.equal(goi.length, 0);
});

test("hỏi thường → 200 { traLoi, nguon }; gửi đúng Responses API (mẫu, khoá, không id/tên/SĐT người hỏi); ghi MỘT dòng không nội dung, chi phí tính từ usage", async () => {
  const w = setup();
  const goi = openAiGia({ usage: { input_tokens: 5000, input_tokens_details: { cached_tokens: 1000 }, output_tokens: 700 } });
  const r = await hoi(w, SALES, `đổi mã PIN thế nào ${DAU}`);
  assert.equal(r.status, 200, r.text);
  assert.equal(r.json.traLoi, "1. Vào trang Tôi.\n2. Bấm Đổi PIN.");
  assert.equal(goi.length, 1);
  const ins = String(goi[0]!.body.instructions);
  const dau = /\[([^\]]+)\]/.exec(ins.slice(ins.lastIndexOf("TÀI LIỆU:")))![1]!;
  assert.deepEqual(r.json.nguon, [dau], "nguồn = đúng đoạn mẫu ghi ở dòng Nguồn");
  assert.equal(goi[0]!.url, "https://api.openai.com/v1/responses");
  assert.equal(goi[0]!.headers.authorization, "Bearer khoa-gia");
  assert.equal(goi[0]!.body.model, "gpt-5-nano");
  const than = JSON.stringify(goi[0]!.body);
  for (const lo of [SALES, "0900000001", '"An"', "pty-"]) assert.ok(!than.includes(lo), `thân gửi OpenAI lộ ${lo}`);
  const rows = luot(w);
  assert.equal(rows.length, 1);
  assert.deepEqual(
    { ...rows[0], id: "-", created_at: "-", updated_at: "-" },
    { id: "-", staff_id: SALES, ngay_vn: vnToday(new Date()), token_vao: 5000, token_vao_dem: 1000, token_ra: 700, chi_phi_micro_usd: 485, ket_qua: "ok", mau: "gpt-5-nano", la_thu: 0, created_at: "-", created_by: SALES, updated_at: "-", updated_by: SALES },
  );
  assert.ok(!JSON.stringify(w.q("SELECT * FROM tl_luot_hoi")).includes(DAU));
});

test("OPENAI_BASE_URL đổi được địa chỉ (e2e trỏ máy giả), bỏ dấu / cuối", async () => {
  const w = setup();
  (w.env as Record<string, unknown>).OPENAI_BASE_URL = "http://127.0.0.1:9/";
  const goi = openAiGia();
  assert.equal((await hoi(w, SALES, "đổi PIN")).status, 200);
  assert.equal(goi[0]!.url, "http://127.0.0.1:9/v1/responses");
});

test("HÀNG RÀO che: SĐT, email, số căn cước bị che TRƯỚC khi tới OpenAI; câu dài bị cắt 500 ký tự", async () => {
  const w = setup();
  const goi = openAiGia();
  const r = await hoi(w, SALES, `khách 0905 123 456, mail lan@vidu.vn, căn cước 079123456789 đổi PIN sao ${"x".repeat(800)}`);
  assert.equal(r.status, 200, r.text);
  const input = String(goi[0]!.body.input);
  assert.ok(!/\d{3}/.test(input), input.slice(0, 80));
  assert.ok(!input.includes("@"));
  assert.ok(input.includes("[đã che]"));
  assert.ok([...input].length <= 500);
});

// ADR-0069 điều 5 SỬA ADR-0066 điều 7: nội dung hỏi đáp nay CÓ lưu — nhưng CHỈ ở tl_hoi_dap (câu hỏi đã che). Bài này giữ phần còn đúng: console, nhật ký
// kiểm toán và sổ đếm tl_luot_hoi vẫn không có nội dung; phần "lịch sử chỉ chứa câu đã che" canh ở bài HÀNG RÀO lịch sử bên dưới.
test("HÀNG RÀO không nội dung ngoài lịch sử: câu hỏi / câu trả lời không vào console, audit_log, tl_luot_hoi (kể cả khi lỗi)", async () => {
  const w = setup();
  const log: string[] = [];
  const goc = { log: console.log, warn: console.warn, error: console.error, info: console.info };
  for (const k of ["log", "warn", "error", "info"] as const) console[k] = (...a: unknown[]) => { log.push(a.map(String).join(" ")); };
  try {
    openAiGia({ chu: `Trả lời có dấu ${DAU}-DAP` });
    assert.equal((await hoi(w, SALES, `hỏi ${DAU}`)).status, 200);
    openAiGia({ status: 500 });
    assert.equal((await hoi(w, SALES, `lỗi ${DAU}`)).status, 502);
    openAiGia({ nem: true });
    assert.equal((await hoi(w, SALES, `mạng ${DAU}`)).status, 502);
  } finally {
    Object.assign(console, goc);
  }
  assert.ok(!log.join("\n").includes(DAU), log.join("\n"));
  const dump = JSON.stringify(w.q("SELECT * FROM tl_luot_hoi")) + JSON.stringify(w.q("SELECT * FROM audit_log"));
  assert.ok(!dump.includes(DAU));
  assert.deepEqual(luot(w).map((x) => x.ket_qua), ["ok", "loi", "loi"]);
  assert.equal(w.q("SELECT count(*) AS n FROM tl_hoi_dap")[0]!.n, 3, "mỗi câu tới bước trả lời có MỘT dòng lịch sử");
});

test("OpenAI lỗi / mạng hỏng → 502 câu tiếng Việt (không lộ chữ Anh của OpenAI), dòng 'loi' chi phí 0; có usage thì vẫn tính tiền", async () => {
  const w = setup();
  openAiGia({ status: 429, usage: null }); // lỗi của OpenAI không kèm usage
  const r = await hoi(w, SALES, "đổi PIN");
  assert.equal(r.status, 502);
  assert.equal(r.json.error.code, "tro_ly_loi");
  assert.match(r.json.error.message, /^Trợ lý đang bận/);
  openAiGia({ chu: "", usage: { input_tokens: 3000, output_tokens: 1200 } }); // hết token ra, không có chữ: vẫn tính tiền
  assert.equal((await hoi(w, SALES, "đổi PIN")).status, 502);
  assert.deepEqual(luot(w).map((x) => [x.ket_qua, x.chi_phi_micro_usd]), [["loi", 0], ["loi", 630]]);
});

test("M1: không đoạn tài liệu nào khớp → VẪN gọi mẫu, khối tài liệu ghi '(không tìm thấy …)'; không trả thẳng câu 'chưa có'; không nguồn", async () => {
  const w = setup();
  const goi = openAiGia({ chu: "Bạn muốn hỏi về việc gì trong app?" });
  const r = await hoi(w, SALES, "zzqx wqpv");
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(r.json, { traLoi: "Bạn muốn hỏi về việc gì trong app?", nguon: [] });
  assert.equal(goi.length, 1);
  assert.ok(String(goi[0]!.body.instructions).endsWith("TÀI LIỆU:\n(không tìm thấy đoạn hướng dẫn liên quan)"));
  assert.equal(String(goi[0]!.body.instructions).split("TÀI LIỆU:").length, 2);
  assert.deepEqual(luot(w).map((x) => [x.ket_qua, x.chi_phi_micro_usd]), [["ok", 400]]);
});

test("S1–S3: mẫu không ghi 'Nguồn:' ⇒ không nguồn; ghi tên không được gửi ⇒ bỏ; câu lỗi (502) không có nguồn", async () => {
  const w = setup();
  openAiGia({ chu: "1. Vào trang Tôi." });
  assert.deepEqual((await hoi(w, SALES, "đổi mã PIN thế nào")).json, { traLoi: "1. Vào trang Tôi.", nguon: [] });
  openAiGia({ chu: "1. Vào trang Tôi.\nNguồn: [Mục bịa ra]" });
  assert.deepEqual((await hoi(w, SALES, "đổi mã PIN thế nào")).json, { traLoi: "1. Vào trang Tôi.", nguon: [] });
  openAiGia({ status: 500 });
  const r = await hoi(w, SALES, "đổi mã PIN thế nào");
  assert.equal(r.status, 502);
  assert.equal(r.json.nguon, undefined);
  assert.deepEqual(Object.keys(r.json), ["error"]);
  const loi = w.q("SELECT nguon FROM tl_hoi_dap WHERE ket_qua = 'loi'");
  assert.equal(loi.length, 1);
  assert.deepEqual(JSON.parse(String(loi[0]!.nguon)), []);
  assert.deepEqual(w.q("SELECT nguon FROM tl_hoi_dap WHERE ket_qua = 'ok'").map((x) => JSON.parse(String(x.nguon))), [[], []]);
});

test("HÀNG RÀO lọc số tiền (P1, Hiến chương 5.15): câu trả lời có số tiền ⇒ ẩn TRƯỚC khi trả VÀ trước khi lưu tl_hoi_dap; mã đơn, giờ giữ nguyên", async () => {
  const w = setup();
  openAiGia({ chu: "Giá tour 500.000 đ, phụ thu 300k. Mã đơn TD-2026 đón 08:30." });
  const r = await hoi(w, SALES, "đổi mã PIN thế nào");
  assert.equal(r.status, 200, r.text);
  assert.equal(r.json.traLoi, "Giá tour [đã ẩn số tiền], phụ thu [đã ẩn số tiền]. Mã đơn TD-2026 đón 08:30.");
  assert.equal(w.q("SELECT tra_loi FROM tl_hoi_dap")[0]!.tra_loi, r.json.traLoi);
  assert.ok(!/500\.000|300k/.test(JSON.stringify(w.q("SELECT * FROM tl_hoi_dap"))));
});

// HÀNG RÀO cỡ câu hỏi (kiểm độc lập I-1, 30/9): biểu thức che email từng chạy bậc hai với chuỗi dài không có "@" (100k ký tự ≈ 4,4 s) — máy chủ phải từ chối
// câu hỏi thô quá CAU_HOI_THO_TOI_DA ký tự TRƯỚC khi che: 400 lời thường, không ghi dòng, không gọi mạng, nhanh.
test("HÀNG RÀO cỡ: câu hỏi thô 200.000 ký tự → 400 'Câu hỏi quá dài' dưới 200 ms, không ghi dòng, không gọi OpenAI; 2.000 ký tự vẫn được", async () => {
  const w = setup();
  const goi = openAiGia();
  const t0 = performance.now();
  const r = await hoi(w, SALES, "a".repeat(200_000));
  const ms = performance.now() - t0;
  assert.equal(r.status, 400, r.text.slice(0, 200));
  assert.equal(r.json.error.message, "Câu hỏi quá dài — tối đa 500 ký tự.");
  assert.ok(ms < 200, `mất ${Math.round(ms)} ms`);
  assert.equal(goi.length, 0);
  assert.equal(luot(w).length, 0);
  assert.equal((await hoi(w, SALES, `đổi PIN ${"x".repeat(1990)}`)).status, 200, "2.000 ký tự: che rồi cắt 500 như cũ");
});

test("đầu vào sai → 400 (không phải chuỗi, rỗng, chỉ khoảng trắng); không ghi dòng", async () => {
  const w = setup();
  openAiGia();
  for (const bad of [undefined, 5, "", "   "]) assert.equal((await hoi(w, SALES, bad)).status, 400, String(bad));
  assert.equal(luot(w).length, 0);
});

test("HÀNG RÀO trần ngày: đủ 30 câu hôm nay → 429, dòng het_tran; dòng het_tran và của ngày khác không tính vào trần", async () => {
  const w = setup();
  const goi = openAiGia();
  const ngay = vnToday(new Date());
  const chen = (i: number, ngayVn: string, kq: string) =>
    w.sqlite.exec(`INSERT INTO tl_luot_hoi (id, staff_id, ngay_vn, ket_qua, created_at, updated_at) VALUES ('g${i}', '${SALES}', '${ngayVn}', '${kq}', 'x', 'x')`);
  for (let i = 0; i < 29; i++) chen(i, ngay, i % 2 ? "ok" : "loi");
  for (let i = 100; i < 105; i++) chen(i, ngay, "het_tran");
  chen(200, "2000-01-01", "ok");
  assert.equal((await hoi(w, SALES, "đổi PIN")).status, 200, "câu thứ 30 vẫn được");
  const r = await hoi(w, SALES, "đổi PIN");
  assert.equal(r.status, 429);
  assert.equal(r.json.error.code, "tro_ly_het_tran_ngay");
  assert.match(r.json.error.message, /30 câu/);
  assert.equal(goi.length, 1);
  const cuoi = luot(w).filter((x) => x.created_at !== "x").at(-1)!;
  assert.deepEqual([cuoi.ket_qua, cuoi.mau, cuoi.chi_phi_micro_usd], ["het_tran", null, 0], "het_tran: không gọi mẫu ⇒ mau null");
  assert.equal((await hoi(w, ADM, "đổi PIN")).status, 200, "trần ngày là của TỪNG người");
});

test("HÀNG RÀO trần tháng: tổng chi phí tháng VN chạm 5 USD → 429 câu nguyên văn ADR, KHÔNG gọi OpenAI; tháng trước không tính", async () => {
  const w = setup();
  const goi = openAiGia();
  const ngay = vnToday(new Date());
  w.sqlite.exec(`INSERT INTO tl_luot_hoi (id, staff_id, ngay_vn, chi_phi_micro_usd, ket_qua, created_at, updated_at) VALUES ('cu', '${ADM}', '2000-01-01', 9999999, 'ok', 'x', 'x')`);
  assert.equal((await hoi(w, SALES, "đổi PIN")).status, 200, "tháng trước không tính");
  w.sqlite.exec(`INSERT INTO tl_luot_hoi (id, staff_id, ngay_vn, chi_phi_micro_usd, ket_qua, created_at, updated_at) VALUES ('nay', '${ADM}', '${ngay}', 5000000, 'ok', 'x', 'x')`);
  const n = goi.length;
  const r = await hoi(w, SALES, "đổi PIN");
  assert.equal(r.status, 429);
  assert.equal(r.json.error.code, "tro_ly_het_tran_thang");
  assert.equal(r.json.error.message, CAU_HET_TRAN_THANG);
  assert.equal(goi.length, n, "chạm trần tháng không được gọi OpenAI");
});

test("mọi mã quyền (kể cả Đối tác, Tài xế đối tác) hỏi được", async () => {
  const w = setup();
  openAiGia();
  let i = 0;
  for (const p of PERMISSION_CODES) {
    const id = `aaaaaaaa-aaaa-4aaa-8aaa-${String(++i).padStart(12, "0")}`;
    seedStaff(w.sqlite, { id, phone: `09100000${String(i).padStart(2, "0")}`, name: `N${i}`, perms: [p] });
    const r = await hoi(w, id, "đổi PIN");
    assert.equal(r.status, 200, `${p}: ${r.text}`);
  }
});

test("cài đặt: Toàn quyền xem + lưu bản mới (chỉ thêm), Quản trị / Bán hàng bị từ chối; chi phí tháng tính đúng", async () => {
  const w = setup();
  const ngay = vnToday(new Date());
  w.sqlite.exec(`INSERT INTO tl_luot_hoi (id, staff_id, ngay_vn, chi_phi_micro_usd, ket_qua, created_at, updated_at) VALUES ('a', '${ADM}', '${ngay}', 1234567, 'ok', 'x', 'x'), ('b', '${ADM}', '${ngay}', 0, 'het_tran', 'x', 'x')`);
  let r = await w.call("GET", "/api/tro-ly/cai-dat", { as: SUP });
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(
    { ...r.json, vai: undefined, theoVai: undefined },
    { bat: true, tranThangUsd: 5, tranNgay: 30, coKhoa: true, khoaCuoi: null, thang: ngay.slice(0, 7), chiPhiThangUsd: 1.234567, soCauThang: 1, soCauHomNay: 1, vai: undefined, theoVai: undefined },
  );
  assert.deepEqual(Object.values(r.json.vai), PERMISSION_CODES.map(() => true), "gieo 0054: bật cả 9 vai");
  for (const as of [ADM, SALES]) {
    assert.equal((await w.call("GET", "/api/tro-ly/cai-dat", { as })).status, 403, as);
    assert.equal((await w.call("POST", "/api/tro-ly/cai-dat", { as, body: { bat: false, tranThangUsd: 1, tranNgay: 1 } })).status, 403, as);
  }
  assert.equal((await w.call("POST", "/api/tro-ly/cai-dat", { as: SUP, body: { bat: true, tranThangUsd: -1, tranNgay: 1 } })).status, 400);
  r = await w.call("POST", "/api/tro-ly/cai-dat", { as: SUP, body: { bat: false, tranThangUsd: 2.5, tranNgay: 10 } });
  assert.equal(r.status, 200, r.text);
  assert.equal(r.json.bat, false);
  assert.equal(r.json.tranThangUsd, 2.5);
  const ban = w.q("SELECT bat, tran_thang_micro_usd, tran_ngay, created_by FROM tl_cai_dat ORDER BY created_by IS NOT NULL");
  assert.equal(ban.length, 2, "chỉ thêm bản mới, bản gieo còn nguyên");
  assert.deepEqual({ ...ban[1] }, { bat: 0, tran_thang_micro_usd: 2_500_000, tran_ngay: 10, created_by: SUP });
  openAiGia();
  assert.equal((await hoi(w, SALES, "đổi PIN")).status, 503, "tắt có hiệu lực ngay, không cần deploy");
});
