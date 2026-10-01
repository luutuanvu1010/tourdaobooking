// Tìm theo nghĩa (ADR-0082) qua route THẬT — CẢ ứng dụng trên SQLite (tests/audit/harness.mjs); OpenAI thay bằng `globalThis.fetch` giả HAI cửa:
// /v1/embeddings (véc-tơ một-nóng: chữ có "pin" ⇒ chiều 0, còn lại ⇒ chiều 1; trả `data` theo thứ tự ĐẢO — máy chủ phải xếp theo index) và /v1/responses.
// Phủ V2, V3, V5, L1, L2, P1, P2, P3, H1, G1, G2, C5 (route); Review Focus 1, 4, 5. Hàng rào ở docs/SO-HANG-RAO.md (lùi từ khoá; tiền + trần).
import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";
import { chiaKho, chonDoan, dinhDangDoan, truyVanTim } from "../../shared/tro-ly.ts";
import { MAU_NHUNG, SO_CHIEU_NHUNG, chiPhiNhungMicroUsd, tienBuUoc } from "../../shared/tro-ly-van-nghia.ts";
import { xoaBoNhoVanNghia } from "./van-nghia.ts";

const SALES = "11111111-1111-4111-8111-111111111111";
const SUP = "77777777-7777-4777-8777-777777777777";
const CUOC = "0f1e2d3c-4b5a-4968-8778-a1b2c3d4e5f6";
const SU_KIEN = '{"event":"tro_ly_van_nghia_loi"}';
const fetchThat = globalThis.fetch;
// Bộ nhớ isolate sống theo tiến trình — mỗi bài một CSDL mới nên phải xoá, kẻo bài sau thấy véc-tơ của bài trước và không tính bù.
afterEach(() => { globalThis.fetch = fetchThat; xoaBoNhoVanNghia(); });

interface Goi { url: string; body: Record<string, unknown> }
interface TuyChon { nhung?: "ok" | "loi" | "nem" | "sai_chieu" | "lo_loi"; usageNhung?: number | null; chu?: string }
function openAiGia(t: TuyChon = {}) {
  const nhung: Goi[] = [];
  const traLoi: Goi[] = [];
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input instanceof Request ? input.url : input);
    const body = JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>;
    if (url.endsWith("/v1/embeddings")) {
      nhung.push({ url, body });
      const dau = body.input as string[];
      if (t.nhung === "nem") throw new TypeError("mạng hỏng");
      if (t.nhung === "loi" || (t.nhung === "lo_loi" && dau.length > 1)) return new Response(JSON.stringify({ error: { message: "x" } }), { status: 500 });
      const chieu = t.nhung === "sai_chieu" ? SO_CHIEU_NHUNG - 1 : SO_CHIEU_NHUNG;
      const data = dau.map((s, index) => { const e = new Array(chieu).fill(0); e[/pin/i.test(s) ? 0 : 1] = 1; return { object: "embedding", index, embedding: e }; }).reverse();
      const tok = t.usageNhung ?? 100 * dau.length;
      return new Response(JSON.stringify({ object: "list", data, model: MAU_NHUNG, ...(t.usageNhung === null ? {} : { usage: { prompt_tokens: tok, total_tokens: tok } }) }), { status: 200 });
    }
    traLoi.push({ url, body });
    const ins = String(body.instructions ?? "");
    const ten = /\[([^\]]+)\]/.exec(ins.slice(ins.lastIndexOf("TÀI LIỆU:")))?.[1] ?? "";
    return new Response(JSON.stringify({
      output: [{ type: "message", content: [{ type: "output_text", text: t.chu ?? `Làm theo hướng dẫn.${ten ? `\nNguồn: [${ten}]` : ""}` }] }],
      usage: { input_tokens: 4000, input_tokens_details: { cached_tokens: 0 }, output_tokens: 500 },
    }), { status: 200 });
  }) as typeof fetch;
  return { nhung, traLoi };
}

function setup() {
  const w = world();
  seedStaff(w.sqlite, { id: SALES, phone: "0900000001", name: "An", perms: ["SALES"] });
  seedStaff(w.sqlite, { id: SUP, phone: "0900000007", name: "Chủ", perms: ["SUPER_ADMIN"] });
  (w.env as Record<string, unknown>).OPENAI_API_KEY = "khoa-gia-du-dai-0123456789";
  return w;
}
type W = ReturnType<typeof setup>;
const hoi = (w: W, cauHoi: string, cuoc?: string) => w.call("POST", "/api/tro-ly/hoi", { as: SALES, body: cuoc ? { cauHoi, cuocTroChuyen: cuoc } : { cauHoi } });
const soDong = (w: W): number => w.q("SELECT count(*) AS n FROM tl_van_nghia")[0]!.n as number;
const luot = (w: W) => w.q("SELECT chi_phi_micro_usd AS c, token_vao AS v, token_ra AS r, la_thu AS t FROM tl_luot_hoi ORDER BY rowid").map((x) => [x.c, x.v, x.r, x.t]);
/** Đếm câu SELECT tới tl_van_nghia (V5). */
function demDocVanNghia(w: W): () => number {
  let n = 0;
  const db = w.env.DB as { prepare: (s: string) => unknown };
  const goc = db.prepare;
  db.prepare = (sql: string) => { if (/^\s*SELECT\b[\s\S]*\btl_van_nghia\b/i.test(sql)) n++; return goc(sql); };
  return () => n;
}
function batLog(): { dung: () => string[] } {
  const log: string[] = [];
  const goc = console.error;
  console.error = (...a: unknown[]) => { log.push(a.map(String).join(" ")); };
  return { dung: () => { console.error = goc; return log; } };
}
const MO = 400; // tiền mẫu nano của máy giả: 4.000 × 0,05 + 500 × 0,40
const N = chiaKho().length;

test("V2 + V5 + P1: câu 1 tính bù MỌI đoạn (một lô) + câu hỏi; câu 2 chỉ câu hỏi, đọc D1 MỘT lần; câu 3 không đọc D1; tiền lượt = mẫu + embedding, token chỉ của mẫu", async () => {
  const w = setup();
  const g = openAiGia();
  const doc = demDocVanNghia(w);
  assert.equal((await hoi(w, "đổi mã PIN thế nào")).status, 200);
  assert.equal(g.nhung.length, 2);
  assert.deepEqual(g.nhung[0]!.body.input, ["đổi mã PIN thế nào"]);
  assert.deepEqual(new Set(g.nhung[1]!.body.input as string[]), new Set(chiaKho().map(dinhDangDoan)));
  assert.equal((g.nhung[1]!.body.input as string[]).length, N);
  const d = w.q("SELECT count(*) AS n, sum(typeof(vec) = 'blob') AS b, min(length(vec)) AS mn, max(length(vec)) AS mx FROM tl_van_nghia")[0]!;
  assert.deepEqual({ ...d }, { n: N, b: N, mn: SO_CHIEU_NHUNG * 4, mx: SO_CHIEU_NHUNG * 4 });
  assert.equal(doc(), 1, "câu 1: một lần hỏi D1 (chưa có dòng)");
  assert.equal((await hoi(w, "đổi mã PIN thế nào")).status, 200);
  assert.equal(g.nhung.length, 3, "câu 2: chỉ véc-tơ câu hỏi");
  assert.equal(doc(), 2, "câu 2: đọc D1 một lần (véc-tơ vừa tính bù không nạp bộ nhớ — R1)");
  assert.equal((await hoi(w, "đổi mã PIN thế nào")).status, 200);
  assert.equal(g.nhung.length, 4);
  assert.equal(doc(), 2, "câu 3: bộ nhớ isolate, không đọc D1");
  const tienQ = chiPhiNhungMicroUsd(100);
  assert.deepEqual(luot(w), [
    [MO + tienQ + chiPhiNhungMicroUsd(100 * N), 4000, 500, 0],
    [MO + tienQ, 4000, 500, 0],
    [MO + tienQ, 4000, 500, 0],
  ]);
});

test("V3 + Review Focus 4: thêm một đoạn Ngữ cảnh bổ sung ⇒ câu kế tiếp chỉ tính bù ĐÚNG đoạn đó; hai đoạn cùng chữ ⇒ một đầu vào, một dòng", async () => {
  const w = setup();
  const g = openAiGia();
  await hoi(w, "đổi mã PIN thế nào");
  const nc = { tieuDe: "Giờ làm việc văn phòng", noiDung: "Văn phòng mở cửa từ bảy giờ sáng đến năm giờ chiều.", bat: true };
  assert.equal((await w.call("POST", "/api/tro-ly/ngu-canh", { as: SUP, body: nc })).status, 200);
  assert.equal((await w.call("POST", "/api/tro-ly/ngu-canh", { as: SUP, body: nc })).status, 200);
  const truoc = g.nhung.length;
  assert.equal((await hoi(w, "văn phòng mở cửa mấy giờ")).status, 200);
  assert.equal(g.nhung.length, truoc + 2);
  assert.deepEqual(g.nhung.at(-1)!.body.input, [`[Ngữ cảnh bổ sung › ${nc.tieuDe}]\n${nc.noiDung}`]);
  assert.equal(soDong(w), N + 1);
});

test("L1 HÀNG RÀO lùi về từ khoá: embeddings lỗi 500 / mạng hỏng / sai số chiều ⇒ 200, đoạn = chonDoan (luật cũ), 0 dòng tl_van_nghia, log ĐÚNG một sự kiện không nội dung", async () => {
  for (const nhung of ["loi", "nem", "sai_chieu"] as const) {
    const w = setup();
    const g = openAiGia({ nhung });
    const log = batLog();
    let r;
    try { r = await hoi(w, "đổi mã PIN thế nào"); } finally { log.dung(); }
    assert.equal(r.status, 200, `${nhung}: ${r.text}`);
    assert.equal(g.traLoi.length, 1);
    const cu = chonDoan("đổi mã PIN thế nào", ["SALES"], chiaKho());
    assert.ok(String(g.traLoi[0]!.body.instructions).endsWith(["TÀI LIỆU:", ...cu.map(dinhDangDoan)].join("\n")), `${nhung}: đúng luật cũ`);
    assert.equal(soDong(w), 0);
    const ds = log.dung().filter((l) => l.includes("van_nghia"));
    assert.deepEqual(ds, [SU_KIEN], nhung);
    assert.ok(!log.dung().join("\n").includes("PIN"), "log không nội dung");
  }
});

test("L2: lô tính bù lỗi (câu hỏi đã tính được) ⇒ 0 dòng ghi; tiền câu hỏi vẫn vào lượt; lần sau tính lại đủ", async () => {
  const w = setup();
  openAiGia({ nhung: "lo_loi" });
  assert.equal((await hoi(w, "đổi mã PIN thế nào")).status, 200);
  assert.equal(soDong(w), 0);
  assert.deepEqual(luot(w)[0], [MO + chiPhiNhungMicroUsd(100), 4000, 500, 0]);
  const g = openAiGia();
  assert.equal((await hoi(w, "đổi mã PIN thế nào")).status, 200);
  assert.equal(g.nhung.length, 2);
  assert.equal(soDong(w), N);
});

test("P2 + Review Focus 5 HÀNG RÀO trần trước MỌI lần gọi: (1) mức trần trên vượt ⇒ 429, 0 lần embeddings, 0 lần mẫu; (2) qua (1) nhưng tính bù vượt phần còn lại ⇒ 200, lùi từ khoá, 0 lần embeddings", async () => {
  const w = setup();
  const g = openAiGia();
  assert.equal((await w.call("POST", "/api/tro-ly/cai-dat", { as: SUP, body: { bat: true, tranThangUsd: 0.0005, tranNgay: 30 } })).status, 200);
  const r = await hoi(w, "đổi mã PIN thế nào");
  assert.equal(r.status, 429, r.text);
  assert.equal(r.json.error.code, "tro_ly_het_tran_thang");
  assert.deepEqual([g.nhung.length, g.traLoi.length], [0, 0]);

  // Trần 1.000 micro-USD: mức trần trên nano ≥ 6.000 × 0,05 + 1.200 × 0,40 = 780 ⇒ phần còn lại ≤ 220 < tiền tính bù cả kho.
  assert.ok(tienBuUoc(chiaKho().map(dinhDangDoan)) > 220, "tiền đề: tính bù cả kho vượt phần còn lại");
  const w2 = setup();
  const g2 = openAiGia();
  assert.equal((await w2.call("POST", "/api/tro-ly/cai-dat", { as: SUP, body: { bat: true, tranThangUsd: 0.001, tranNgay: 30 } })).status, 200);
  const log = batLog();
  let r2;
  try { r2 = await hoi(w2, "đổi mã PIN thế nào"); } finally { log.dung(); }
  assert.equal(r2.status, 200, r2.text);
  assert.deepEqual([g2.nhung.length, g2.traLoi.length], [0, 1]);
  assert.deepEqual(log.dung().filter((l) => l.includes("van_nghia")), [SU_KIEN]);
  assert.equal(luot(w2)[0]![0], MO, "không gọi embeddings ⇒ không tiền embedding");
});

test("G2 + C5 + G1: thân embeddings ĐÚNG bốn khoá, không SĐT / id người hỏi; truy vấn câu 2 = câu hiện tại + câu trước (đã che); chữ người dùng chỉ ở input; số tiền vẫn bị ẩn", async () => {
  const w = setup();
  const g = openAiGia({ chu: "Phí 500.000 đ.\nNguồn: [Bán hàng › Đổi PIN]" });
  assert.equal((await hoi(w, "khách 0905 123 456 hỏi đổi mã PIN", CUOC)).status, 200);
  const r = await hoi(w, "còn trên điện thoại thì sao", CUOC);
  assert.equal(r.status, 200, r.text);
  for (const x of g.nhung) {
    assert.deepEqual(Object.keys(x.body).sort(), ["dimensions", "encoding_format", "input", "model"]);
    assert.deepEqual([x.body.model, x.body.dimensions, x.body.encoding_format], [MAU_NHUNG, SO_CHIEU_NHUNG, "float"]);
    const s = JSON.stringify(x.body);
    for (const lo of ["0905", "123 456", SALES, "0900000001"]) assert.ok(!s.includes(lo), `thân embeddings lộ ${lo}`);
  }
  const cauTruoc = "khách [đã che] hỏi đổi mã PIN";
  assert.deepEqual(g.nhung[0]!.body.input, [cauTruoc]);
  assert.deepEqual(g.nhung.at(-1)!.body.input, [truyVanTim("còn trên điện thoại thì sao", cauTruoc)]);
  assert.ok(!String(g.traLoi.at(-1)!.body.instructions).includes("điện thoại thì sao"), "chữ người dùng chỉ ở input");
  assert.ok(!/500\.000/.test(r.json.traLoi), r.json.traLoi);
});

const NANO = { mau: "gpt-5-nano", mucSuyNghi: "minimal", doDai: "low", tokenRaToiDa: 1200, loiNhac: "Bạn là trợ lý thử." };
const thu = (w: W, cauHoi = "đổi mã PIN thế nào") => w.call("POST", "/api/tro-ly/thu", { as: SUP, body: { boNao: NANO, cauHoi, vai: "SALES" } });

test("P3 + H1: ô thử đi CÙNG đường tìm; lượt la_thu = 1 có tiền mẫu + embedding; phản hồi tách chiPhiMicroUsd (mẫu) và chiPhiVanNghiaMicroUsd; doanDaChon đúng khối TÀI LIỆU đã gửi", async () => {
  const w = setup();
  const g = openAiGia();
  const r = await thu(w);
  assert.equal(r.status, 200, r.text);
  const tienNhung = chiPhiNhungMicroUsd(100) + chiPhiNhungMicroUsd(100 * N);
  assert.deepEqual([r.json.chiPhiMicroUsd, r.json.chiPhiVanNghiaMicroUsd], [MO, tienNhung]);
  assert.deepEqual(luot(w), [[MO + tienNhung, 4000, 500, 1]]);
  assert.equal(w.q("SELECT count(*) AS n FROM tl_hoi_dap")[0]!.n, 0, "ô thử không ghi lịch sử");
  const ds = r.json.doanDaChon as { ten: string; theoNghia: boolean; theoTuKhoa: boolean }[];
  assert.ok(ds.length > 0 && ds.length <= 12);
  for (const d of ds) assert.deepEqual(Object.keys(d).sort(), ["ten", "theoNghia", "theoTuKhoa"]);
  assert.ok(ds.some((d) => d.theoNghia), "có đoạn khớp nghĩa");
  // mỗi `[tên]\n` có trong khối TÀI LIỆU đã gửi, ĐÚNG thứ tự (so bằng vị trí — dòng "[…]" trong nội dung đoạn không làm lệch)
  const ins = String(g.traLoi[0]!.body.instructions);
  let tu = ins.lastIndexOf("TÀI LIỆU:");
  for (const d of ds) {
    const o = ins.indexOf(`\n[${d.ten}]\n`, tu);
    assert.ok(o > tu, `thiếu hoặc sai thứ tự: ${d.ten}`);
    tu = o + 1;
  }
});

test("P3 + L1: ô thử khi embeddings lỗi ⇒ 200, mọi đoạn cờ khớp từ khoá, chiPhiVanNghiaMicroUsd 0", async () => {
  const w = setup();
  openAiGia({ nhung: "loi" });
  const log = batLog();
  let r;
  try { r = await thu(w); } finally { log.dung(); }
  assert.equal(r.status, 200, r.text);
  assert.equal(r.json.chiPhiVanNghiaMicroUsd, 0);
  assert.ok(r.json.doanDaChon.every((d: { theoNghia: boolean; theoTuKhoa: boolean }) => d.theoTuKhoa && !d.theoNghia));
});

test("P2 ô thử: trần thấp hơn mức trần trên ⇒ 429, 0 lần gọi bất kỳ (MỘT hàm kiểm trần với route hỏi)", async () => {
  const w = setup();
  const g = openAiGia();
  assert.equal((await w.call("POST", "/api/tro-ly/cai-dat", { as: SUP, body: { bat: true, tranThangUsd: 0.0005, tranNgay: 30 } })).status, 200);
  assert.equal((await thu(w)).status, 429);
  assert.deepEqual([g.nhung.length, g.traLoi.length], [0, 0]);
});

test("Review Focus 2 (route): phản hồi embeddings KHÔNG có usage ⇒ tiền lượt tính theo ƯỚC, không 0", async () => {
  const w = setup();
  openAiGia({ usageNhung: null });
  assert.equal((await hoi(w, "đổi mã PIN thế nào")).status, 200);
  assert.ok((luot(w)[0]![0] as number) > MO + tienBuUoc(chiaKho().map(dinhDangDoan)) - 1);
});
