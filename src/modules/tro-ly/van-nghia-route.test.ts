// Tìm theo nghĩa (ADR-0082) qua route THẬT — CẢ ứng dụng trên SQLite (tests/audit/harness.mjs); OpenAI thay bằng `globalThis.fetch` giả HAI cửa:
// /v1/embeddings (véc-tơ một-nóng: chữ có "pin" ⇒ chiều 0, còn lại ⇒ chiều 1; trả `data` theo thứ tự ĐẢO — máy chủ phải xếp theo index) và /v1/responses.
// Phủ V2, V3, V5, L1, L2, P1, P2, P3, H1, G1, G2, C5 (route); Review Focus 1, 4, 5. Hàng rào ở docs/SO-HANG-RAO.md (lùi từ khoá; tiền + trần).
import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";
import { NGAN_SACH_TOKEN as NGAN, cheCauHoi, chiaKho, chonDoan, dinhDangDoan, thanYeuCau, truyVanTim, uocToken, uocTokenVao } from "../../shared/tro-ly.ts";
import { chiPhiToiDa, timMau } from "../../shared/tro-ly-mau.ts";
import { MAU_NHUNG, SO_CHIEU_NHUNG, chiPhiNhungMicroUsd, chiaLoNhung, mucTranTren, tienBuUoc } from "../../shared/tro-ly-van-nghia.ts";
import { xoaBoNhoVanNghia } from "./van-nghia.ts";
import { xungHo } from "../../shared/xung-ho.ts";

const SALES = "11111111-1111-4111-8111-111111111111";
const SUP = "77777777-7777-4777-8777-777777777777";
const CUOC = "0f1e2d3c-4b5a-4968-8778-a1b2c3d4e5f6";
const SU_KIEN = '{"event":"tro_ly_van_nghia_loi"}';
const fetchThat = globalThis.fetch;
// Bộ nhớ isolate sống theo tiến trình — mỗi bài một CSDL mới nên phải xoá, kẻo bài sau thấy véc-tơ của bài trước và không tính bù.
afterEach(() => { globalThis.fetch = fetchThat; xoaBoNhoVanNghia(); });
// Bài cố ý làm Embeddings lỗi mà không thu log (vd. L2) ⇒ nuốt riêng dòng sự kiện dự kiến; bài cần soi log thì thu bằng `batLog()` (thay console.error tạm thời).
const errGoc = console.error;
console.error = (...a: unknown[]) => { if (a.length === 1 && a[0] === '{"event":"tro_ly_van_nghia_loi"}') return; errGoc(...a); };

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
/** ADR-0084: người hỏi của bài này chưa ghi giới tính (seedStaff) ⇒ máy chủ nối dòng Mai với "bạn" / "mình" — mức trần tính CẢ dòng đó. */
const BAN = xungHo(null, null);
type BoNaoThu = { mau: string; mucSuyNghi: string; doDai: string; tokenRaToiDa: number; loiNhac: string };
/**
 * Hai mức kiểm trần của MỘT lượt (không nhớ, câu không có gì để che), tính bằng luật thuần:
 * `tren` = mức trần trên ADR-0082 Đ5(1) (thân KHÔNG tài liệu + NGAN_SACH_TOKEN + token ra + embedding truy vấn);
 * `cu` = mức kiểm CŨ (ADR-0073: thân CÓ đoạn từ khoá đã chọn + token ra). Bài P2 đặt trần GIỮA hai mức để phân biệt.
 */
function haiMuc(b: BoNaoThu, perms: string[], cau: string): { tren: number; cu: number } {
  const q = cheCauHoi(cau);
  const tren = mucTranTren(b.mau, uocTokenVao(thanYeuCau(b as never, perms as never, BAN, [], q)), b.tokenRaToiDa, q);
  const cu = chiPhiToiDa(b.mau, uocTokenVao(thanYeuCau(b as never, perms as never, BAN, chonDoan(q, perms as never, chiaKho()), q)), b.tokenRaToiDa);
  return { tren, cu };
}
const datTran = (w: W, microUsd: number) => w.call("POST", "/api/tro-ly/cai-dat", { as: SUP, body: { bat: true, tranThangUsd: microUsd / 1_000_000, tranNgay: 30 } });
const TIEN_BU_KHO = tienBuUoc(chiaKho().map(dinhDangDoan));

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

test("P2 + Review Focus 5 HÀNG RÀO trần trước MỌI lần gọi: (1) trần = mức trần trên − 1 (cao hơn mức kiểm cũ) ⇒ 429, 0 lần embeddings, 0 lần mẫu; (2) trần = mức trần trên + tiền tính bù − 1 ⇒ 200, lùi từ khoá, 0 lần embeddings", async () => {
  const w = setup();
  const g = openAiGia();
  // Bộ não hiện hành của route hỏi (mặc định) — đọc qua route, không chép giá trị.
  const bn = (await w.call("GET", "/api/tro-ly/bo-nao", { as: SUP })).json.hienHanh as BoNaoThu;
  const { tren, cu } = haiMuc(bn, ["SALES"], "đổi mã PIN thế nào");
  assert.ok(cu < tren - 1, `tiền đề: mức cũ ${cu} < trần ${tren - 1} — bài phân biệt được mức cũ với mức trần trên (khoá NGAN_SACH_TOKEN)`);
  assert.equal((await datTran(w, tren - 1)).status, 200);
  const r = await hoi(w, "đổi mã PIN thế nào");
  assert.equal(r.status, 429, r.text);
  assert.equal(r.json.error.code, "tro_ly_het_tran_thang");
  assert.deepEqual([g.nhung.length, g.traLoi.length], [0, 0]);

  // Trần = mức trần trên + tiền tính bù cả kho − 1 ⇒ qua (1), phần còn lại (conLai) = tiền tính bù − 1 < tiền tính bù ⇒ lùi, KHÔNG gọi embeddings.
  const w2 = setup();
  const g2 = openAiGia();
  assert.equal((await datTran(w2, tren + TIEN_BU_KHO - 1)).status, 200);
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
  // khối TÀI LIỆU đã gửi = ĐÚNG và ĐỦ các đoạn trong doanDaChon, cùng thứ tự (dựng lại từ kho theo tên rồi so đuôi lời nhắc — như bài L1)
  const ins = String(g.traLoi[0]!.body.instructions);
  const theoTen = new Map(chiaKho().map((d) => [d.ten, d]));
  assert.ok(ds.every((d) => theoTen.has(d.ten)), "tên đoạn có trong kho");
  assert.ok(ins.endsWith(["TÀI LIỆU:", ...ds.map((d) => dinhDangDoan(theoTen.get(d.ten)!))].join("\n")), "doanDaChon khớp đúng và đủ khối TÀI LIỆU");
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

test("P2 ô thử HÀNG RÀO: trần = mức trần trên − 1 (cao hơn mức kiểm cũ) ⇒ 429, 0 lần gọi; trần = mức trần trên + tiền tính bù ⇒ 200, tính bù đủ (conLai = trần − mức trần trên)", async () => {
  const { tren, cu } = haiMuc(NANO, ["SALES"], "đổi mã PIN thế nào");
  assert.ok(cu < tren - 1, `tiền đề: mức cũ ${cu} < trần ${tren - 1} — bài phân biệt được mức cũ với mức trần trên`);
  const w = setup();
  const g = openAiGia();
  assert.equal((await datTran(w, tren - 1)).status, 200);
  const r = await thu(w);
  assert.equal(r.status, 429, r.text);
  assert.equal(r.json.error.code, "tro_ly_het_tran_thang");
  assert.deepEqual([g.nhung.length, g.traLoi.length], [0, 0]);

  const w2 = setup();
  const g2 = openAiGia();
  assert.equal((await datTran(w2, tren + TIEN_BU_KHO)).status, 200);
  const r2 = await thu(w2);
  assert.equal(r2.status, 200, r2.text);
  assert.deepEqual([g2.nhung.length, g2.traLoi.length], [2, 1], "conLai = tiền tính bù ⇒ không lùi: câu hỏi + một lô kho");
  assert.equal(soDong(w2), N);
});

test("Review Focus 2 (route): phản hồi embeddings KHÔNG có usage ⇒ tiền lượt tính theo ƯỚC, không 0", async () => {
  const w = setup();
  openAiGia({ usageNhung: null });
  assert.equal((await hoi(w, "đổi mã PIN thế nào")).status, 200);
  // Kho nằm trong MỘT lô (tiền đề) ⇒ tiền ước lô = tienBuUoc(kho); câu hỏi không có gì để che ⇒ ước bằng uocToken(câu).
  assert.equal(chiaLoNhung(chiaKho().map(dinhDangDoan)).length, 1, "tiền đề: kho một lô");
  assert.equal(luot(w)[0]![0], MO + chiPhiNhungMicroUsd(uocToken("đổi mã PIN thế nào")) + TIEN_BU_KHO);
});

test("T-1 (kiểm độc lập 1/10) HÀNG RÀO ADR-0084: mức trần trên tính CẢ dòng Mai của CHÍNH người hỏi — trần = mức của người thật − 1 ⇒ 429 (hỏi VÀ ô thử); kiểm bằng 'bạn' sẽ lọt", async () => {
  // Tên gọi dài + mẫu GPT-5 (giá vào cao) để phần chữ thêm của dòng Mai đổi mức trần trên ít nhất vài micro-USD — đủ để bài phân biệt người thật với "bạn".
  const TEN = "Ánhnguyệtthiênhươngngọcdiệpkimchiphươngthảo";
  const g5 = timMau("gpt-5")!;
  const q = "đổi mã PIN thế nào";
  for (const duong of ["hoi", "thu"] as const) {
    const w = setup();
    const g = openAiGia();
    const ai = duong === "hoi" ? SALES : SUP;
    w.sqlite.prepare("UPDATE pty_person SET given_name = ?, gender = 'NU' WHERE party_id = ?").run(TEN, `pty-${ai}`);
    const mac = (await w.call("GET", "/api/tro-ly/bo-nao", { as: SUP })).json.hienHanh as BoNaoThu;
    const bn: BoNaoThu = { mau: "gpt-5", mucSuyNghi: g5.mucSuyNghi[0]!, doDai: "low", tokenRaToiDa: 1200, loiNhac: mac.loiNhac };
    const perms = duong === "hoi" ? ["SALES"] : ["ACCOUNTING"];
    const muc = (nguoi: ReturnType<typeof xungHo>) => mucTranTren(bn.mau, uocTokenVao(thanYeuCau(bn as never, perms as never, nguoi, [], q)), bn.tokenRaToiDa, q);
    const that = muc(xungHo(TEN, "NU"));
    const ban = muc(BAN);
    // Phần chữ thêm của dòng Mai ("chị <tên>" / "em" thay "bạn" / "mình") ⇒ mức trần tăng ĐÚNG bằng tiền tối đa của số token thêm.
    const tokThem = uocTokenVao(thanYeuCau(bn as never, perms as never, xungHo(TEN, "NU"), [], q)) - uocTokenVao(thanYeuCau(bn as never, perms as never, BAN, [], q));
    assert.ok(tokThem > 0, `tokThem ${tokThem}`);
    assert.equal(that - ban, chiPhiToiDa(bn.mau, uocTokenVao(thanYeuCau(bn as never, perms as never, BAN, [], q)) + NGAN + tokThem, bn.tokenRaToiDa) - chiPhiToiDa(bn.mau, uocTokenVao(thanYeuCau(bn as never, perms as never, BAN, [], q)) + NGAN, bn.tokenRaToiDa));
    assert.ok(that - ban >= 2, `tiền đề: mức người thật ${that} cao hơn mức "bạn" ${ban} ít nhất 2 micro-USD`);
    if (duong === "hoi") assert.equal((await w.call("PUT", "/api/tro-ly/bo-nao", { as: SUP, body: bn })).status, 200);
    assert.equal((await datTran(w, that - 1)).status, 200);
    const r = duong === "hoi" ? await hoi(w, q) : await w.call("POST", "/api/tro-ly/thu", { as: SUP, body: { boNao: bn, cauHoi: q, vai: "ACCOUNTING" } });
    assert.equal(r.status, 429, `${duong}: ${r.text}`);
    assert.deepEqual([g.nhung.length, g.traLoi.length], [0, 0], duong);
  }
});
