// Tầng máy chủ của tìm theo nghĩa (ADR-0082) nạp THẲNG (không qua route): gọi Embeddings (hạn giờ, usage thiếu, thân G2) và repository tl_van_nghia
// trên D1 giả = SQLite thật (tests/audit/harness.mjs). Bài route (V2, V3, V5, L1, L2, P1–P3, H1, G1) ở van-nghia-route.test.ts.
import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { fakeD1, openDb } from "../../../tests/audit/harness.mjs";
import { goiNhung, timDoanTheoNghia, xoaBoNhoVanNghia } from "./van-nghia.ts";
import type { PermissionCode } from "../../shared/permissions.ts";
import { docVanNghia, ghiVanNghia } from "./repository.ts";
import { MAU_NHUNG, SO_CHIEU_NHUNG, blobSangVec, chiPhiNhungMicroUsd, vecSangBlob } from "../../shared/tro-ly-van-nghia.ts";

const fetchThat = globalThis.fetch;
afterEach(() => { globalThis.fetch = fetchThat; });
const ENV = { OPENAI_BASE_URL: "https://may-gia.vn/" } as unknown as Env;
const NOW = "2026-10-01T01:00:00.000Z";
const vec1 = (i: number) => { const e = new Array(SO_CHIEU_NHUNG).fill(0); e[i] = 1; return e; };

test("goiNhung: POST <gốc>/v1/embeddings, Bearer khoá, thân ĐÚNG bốn khoá (G2); xếp theo index; token = usage.prompt_tokens", async () => {
  let url = ""; let auth = ""; let body: Record<string, unknown> = {};
  globalThis.fetch = (async (i: RequestInfo | URL, init?: RequestInit) => {
    url = String(i); auth = new Headers(init?.headers).get("authorization") ?? ""; body = JSON.parse(String(init?.body));
    return new Response(JSON.stringify({ data: [{ index: 1, embedding: vec1(1) }, { index: 0, embedding: vec1(0) }], usage: { prompt_tokens: 9 } }), { status: 200 });
  }) as typeof fetch;
  const kq = await goiNhung(ENV, "khoa-gia", ["a", "b"]);
  assert.equal(url, "https://may-gia.vn/v1/embeddings");
  assert.equal(auth, "Bearer khoa-gia");
  assert.deepEqual(Object.keys(body).sort(), ["dimensions", "encoding_format", "input", "model"]);
  assert.equal(kq!.token, 9);
  assert.equal(kq!.vec[0]![0], 1);
  assert.equal(kq!.vec[1]![1], 1);
});

test("Review Focus 2: phản hồi KHÔNG có usage ⇒ token = ƯỚC (1 token ≈ 3 ký tự), không bao giờ 0", async () => {
  globalThis.fetch = (async () => new Response(JSON.stringify({ data: [{ index: 0, embedding: vec1(0) }] }), { status: 200 })) as typeof fetch;
  assert.equal((await goiNhung(ENV, "k", ["abcdef"]))!.token, 2);
});

test("L1: lỗi HTTP / mạng hỏng / quá hạn giờ ⇒ null (không ném); quá giờ dừng đúng hạn", async () => {
  globalThis.fetch = (async () => new Response("{}", { status: 500 })) as typeof fetch;
  assert.equal(await goiNhung(ENV, "k", ["a"]), null);
  globalThis.fetch = (async () => { throw new TypeError("mạng hỏng"); }) as typeof fetch;
  assert.equal(await goiNhung(ENV, "k", ["a"]), null);
  globalThis.fetch = ((_i: RequestInfo | URL, init?: RequestInit) =>
    new Promise((_ok, loi) => init!.signal!.addEventListener("abort", () => loi(new DOMException("hết giờ", "AbortError"))))) as typeof fetch;
  const t0 = Date.now();
  assert.equal(await goiNhung(ENV, "k", ["a"], 20), null);
  assert.ok(Date.now() - t0 < 1000, "dừng theo hạn giờ");
});

test("V4 + Review Focus 3: ghiVanNghia hai lô CÙNG khoá không lỗi, không trùng; docVanNghia đọc lại BLOB giải mã đúng véc-tơ", async () => {
  const sqlite = openDb();
  const db = fakeD1(sqlite);
  const v = new Float32Array(SO_CHIEU_NHUNG); v[3] = 0.5; v[511] = -2;
  const a = { khoa: "a".repeat(64), mau: MAU_NHUNG, soChieu: SO_CHIEU_NHUNG, vec: vecSangBlob(v) };
  await ghiVanNghia(db, [a], NOW, 50);
  await ghiVanNghia(db, [a, { ...a, khoa: "b".repeat(64) }], NOW, 1);
  assert.equal(sqlite.prepare("SELECT count(*) AS n FROM tl_van_nghia").get().n, 2);
  const [r] = await docVanNghia(db, ["a".repeat(64), "c".repeat(64)]);
  assert.equal(r!.khoa, "a".repeat(64));
  assert.deepEqual([...blobSangVec(r!.vec, r!.soChieu)!], [...v]);
  assert.deepEqual(await docVanNghia(db, []), []);
});

// timDoanTheoNghia nạp thẳng, OpenAI giả ĐẾM lần gọi /v1/embeddings (số đầu vào mỗi lần), D1 giả ĐẾM câu đọc tl_van_nghia. Bài route đầy đủ ở Task 5.
// Hai đoạn cuối TRÙNG chữ đã định dạng ("[tên]\n chữ") ⇒ cùng khoá ⇒ một đầu vào tính bù.
const KHO = [
  { ten: "Đổi PIN", quyen: [], chu: "Vào trang Tôi để đổi mã PIN." },
  { ten: "Lập đơn", quyen: [], chu: "Bấm nút Lập đơn mới ở Trang chủ." },
  { ten: "Lập đơn", quyen: [], chu: "Bấm nút Lập đơn mới ở Trang chủ." },
] as const;
function moiTruong(tuyChon: { hongLanThu?: number; ghiHong?: boolean } = {}) {
  const sqlite = openDb();
  const d1 = fakeD1(sqlite);
  let docVan = 0;
  const db = {
    ...d1,
    prepare: (sql: string) => { if (/FROM tl_van_nghia/.test(sql)) docVan++; return d1.prepare(sql); },
    // ghiHong: D1 từ chối mọi lô ghi (giả lập D4 — CHECK typeof(vec)='blob' từ chối trên D1 thật)
    batch: tuyChon.ghiHong ? async () => { throw new Error("CHECK constraint failed"); } : d1.batch,
  };
  const goi: number[] = [];
  globalThis.fetch = (async (i: RequestInfo | URL, init?: RequestInit) => {
    assert.ok(String(i).endsWith("/v1/embeddings"));
    const dauVao = JSON.parse(String(init?.body)).input as string[];
    goi.push(dauVao.length);
    if (tuyChon.hongLanThu === goi.length) return new Response("{}", { status: 500 });
    return new Response(JSON.stringify({ data: dauVao.map((_, index) => ({ index, embedding: vec1(0) })), usage: { prompt_tokens: 10 } }), { status: 200 });
  }) as typeof fetch;
  const env = { DB: db, OPENAI_BASE_URL: "https://may-gia.vn" } as unknown as Env;
  return { sqlite, env, goi, docVan: () => docVan, soDong: () => Number(sqlite.prepare("SELECT count(*) AS n FROM tl_van_nghia").get().n) };
}
const DAU_VAO = { truyVan: "đổi mã PIN", perms: ["SALES"] as PermissionCode[], kho: KHO, conLaiMicroUsd: 1_000_000 };
/** Chạy `f` với console.error bị bắt; trả các dòng log. */
async function batLog(f: () => Promise<void>): Promise<string[]> {
  const loiCu = console.error;
  const log: string[] = [];
  console.error = (s: string) => { log.push(s); };
  try { await f(); } finally { console.error = loiCu; }
  return log;
}
const LOG_LOI = '{"event":"tro_ly_van_nghia_loi"}';
type KQ = Awaited<ReturnType<typeof timDoanTheoNghia>>;

test("V2 + Review Focus 4: lần đầu tính bù MỌI đoạn thiếu (hai đoạn cùng chữ = một đầu vào) + một lần cho câu hỏi; lần hai chỉ gọi cho câu hỏi", async () => {
  xoaBoNhoVanNghia();
  const m = moiTruong();
  const kq = await timDoanTheoNghia(m.env, "k", DAU_VAO);
  assert.deepEqual(m.goi, [1, 2], "câu hỏi riêng một yêu cầu; tính bù 2 chữ khác nhau");
  assert.equal(m.soDong(), 2);
  assert.equal(kq.tienNhungMicroUsd, 2 * chiPhiNhungMicroUsd(10));
  assert.ok(kq.daChon.some((d) => d.theoNghia));
  xoaBoNhoVanNghia(); // isolate mới: phải đọc lại từ D1 và giải mã BLOB thật
  await timDoanTheoNghia(m.env, "k", DAU_VAO);
  assert.deepEqual(m.goi, [1, 2, 1]);
  assert.equal(m.soDong(), 2);
});

test("V5: véc-tơ đọc từ D1 giữ trong bộ nhớ isolate — lần kế không đọc lại D1; véc-tơ vừa tính bù và véc-tơ câu hỏi KHÔNG vào bộ nhớ", async () => {
  xoaBoNhoVanNghia();
  const m = moiTruong();
  await timDoanTheoNghia(m.env, "k", DAU_VAO); // tính bù: đọc D1 1 lần (thiếu), không nạp bộ nhớ
  assert.equal(m.docVan(), 1);
  await timDoanTheoNghia(m.env, "k", DAU_VAO); // đọc D1 lần 2 (nạp bộ nhớ)
  assert.equal(m.docVan(), 2);
  await timDoanTheoNghia(m.env, "k", { ...DAU_VAO, truyVan: "câu khác" }); // mọi khoá đã ở bộ nhớ ⇒ không đọc D1
  assert.equal(m.docVan(), 2);
  assert.deepEqual(m.goi, [1, 2, 1, 1], "câu hỏi luôn gọi lại (không nhớ véc-tơ câu hỏi)");
});

test("L2: một lô tính bù hỏng ⇒ lùi về từ khoá, KHÔNG ghi dòng nào; lần sau tính lại", async () => {
  xoaBoNhoVanNghia();
  const m = moiTruong({ hongLanThu: 2 });
  const loiCu = console.error;
  const log: string[] = [];
  console.error = (s: string) => { log.push(s); };
  try {
    const kq = await timDoanTheoNghia(m.env, "k", DAU_VAO);
    assert.equal(m.soDong(), 0);
    assert.ok(kq.daChon.every((d) => !d.theoNghia && d.theoTuKhoa));
    assert.equal(kq.tienNhungMicroUsd, chiPhiNhungMicroUsd(10), "tiền thật của lần gọi câu hỏi thành công vẫn tính");
    assert.deepEqual(log, ['{"event":"tro_ly_van_nghia_loi"}']);
  } finally {
    console.error = loiCu;
  }
  await timDoanTheoNghia(m.env, "k", DAU_VAO);
  assert.equal(m.soDong(), 2);
});

test("Đ5(2): tiền tính bù ước vượt phần còn lại ⇒ lùi về từ khoá, KHÔNG gọi API nào, tiền 0, log sự kiện", async () => {
  xoaBoNhoVanNghia();
  const m = moiTruong();
  let kq: KQ | undefined;
  const log = await batLog(async () => { kq = await timDoanTheoNghia(m.env, "k", { ...DAU_VAO, conLaiMicroUsd: 0 }); });
  assert.deepEqual(m.goi, []);
  assert.equal(kq!.tienNhungMicroUsd, 0);
  assert.ok(kq!.daChon.every((d) => !d.theoNghia));
  assert.deepEqual(log, [LOG_LOI]);
});

test("Đ4: khoá OpenAI thiếu / rỗng ⇒ lùi về từ khoá, KHÔNG gọi API nào, log sự kiện", async () => {
  xoaBoNhoVanNghia();
  const m = moiTruong();
  let kq: KQ | undefined;
  const log = await batLog(async () => { kq = await timDoanTheoNghia(m.env, "  ", DAU_VAO); });
  assert.deepEqual(m.goi, []);
  assert.equal(kq!.tienNhungMicroUsd, 0);
  assert.ok(kq!.daChon.every((d) => !d.theoNghia && d.theoTuKhoa));
  assert.deepEqual(log, [LOG_LOI]);
});

test("Câu hỏi rỗng (sau khi che) ⇒ lùi về từ khoá, KHÔNG gọi API, KHÔNG log lỗi (không phải lỗi)", async () => {
  xoaBoNhoVanNghia();
  const m = moiTruong();
  let kq: KQ | undefined;
  const log = await batLog(async () => { kq = await timDoanTheoNghia(m.env, "k", { ...DAU_VAO, truyVan: "   " }); });
  assert.deepEqual(m.goi, []);
  assert.deepEqual(log, []);
  assert.equal(kq!.tienNhungMicroUsd, 0);
  assert.ok(kq!.daChon.every((d) => !d.theoNghia));
});

test("Kho rỗng ⇒ không gọi API nào (kể cả câu hỏi), không log, không đoạn nào", async () => {
  xoaBoNhoVanNghia();
  const m = moiTruong();
  let kq: KQ | undefined;
  const log = await batLog(async () => { kq = await timDoanTheoNghia(m.env, "k", { ...DAU_VAO, kho: [] }); });
  assert.deepEqual(m.goi, []);
  assert.deepEqual(log, []);
  assert.deepEqual(kq, { daChon: [], tienNhungMicroUsd: 0 });
});

test("I1: Embeddings thành công nhưng GHI D1 hỏng ⇒ lượt này VẪN chọn theo nghĩa, tiền tính bù vẫn cộng, log sự kiện; câu sau cùng isolate KHÔNG tính bù lại", async () => {
  xoaBoNhoVanNghia();
  const m = moiTruong({ ghiHong: true });
  let kq: KQ | undefined;
  const log = await batLog(async () => { kq = await timDoanTheoNghia(m.env, "k", DAU_VAO); });
  assert.deepEqual(m.goi, [1, 2]);
  assert.equal(m.soDong(), 0);
  assert.ok(kq!.daChon.some((d) => d.theoNghia), "dùng véc-tơ vừa tính, không lùi");
  assert.equal(kq!.tienNhungMicroUsd, 2 * chiPhiNhungMicroUsd(10));
  assert.deepEqual(log, [LOG_LOI]);
  const log2 = await batLog(async () => { kq = await timDoanTheoNghia(m.env, "k", DAU_VAO); });
  assert.deepEqual(m.goi, [1, 2, 1], "câu hai chỉ gọi cho câu hỏi — đoạn đã nằm trong bộ nhớ isolate");
  assert.deepEqual(log2, []);
  assert.ok(kq!.daChon.some((d) => d.theoNghia));
  assert.equal(kq!.tienNhungMicroUsd, chiPhiNhungMicroUsd(10));
});

/*
 * HÀNG RÀO (ruling điều phối): câu SQL nào chạm tl_van_nghia cũng KHÔNG được có `OR REPLACE` / `REPLACE INTO` — REPLACE của SQLite xoá dòng xung đột
 * mà KHÔNG chạy trigger chặn DELETE (recursive_triggers tắt mặc định) ⇒ lách được luật chỉ-thêm. Quét CHUỖI trong mã nguồn src/ (không quét chú thích:
 * chú thích được phép nhắc "cấm OR REPLACE"). Đã thấy chặn thật: nhật ký thi công, mục "Đột biến hàng rào" (Task 4).
 */
const SRC = join(import.meta.dirname, "..", "..");
function tepNguon(thuMuc: string): string[] {
  return readdirSync(thuMuc, { withFileTypes: true }).flatMap((d) => {
    const p = join(thuMuc, d.name);
    if (d.isDirectory()) return tepNguon(p);
    return /\.ts$/.test(d.name) && !/\.test\.ts$/.test(d.name) ? [p] : [];
  });
}
// Bỏ dòng chú thích TRỌN DÒNG trước (dấu nháy lạc trong chú thích làm lệch cặp nháy), rồi lấy các chuỗi "…" / '…' / `…`.
const boChuThich = (ma: string): string => ma.split("\n").filter((d) => !/^\s*(\/\/|\/\*|\*)/.test(d)).join("\n");
const chuoiTrong = (ma: string): string[] => [...boChuThich(ma).matchAll(/(["'`])((?:\\[\s\S]|(?!\1)[^\\])*)\1/g)].map((m) => m[2]!);
const viPhamReplace = (ma: string): string[] =>
  chuoiTrong(ma).filter((s) => /\btl_van_nghia\b/i.test(s) && /\bOR\s+REPLACE\b|\bREPLACE\s+INTO\b/i.test(s));

test("HÀNG RÀO: bộ quét bắt đúng `INSERT OR REPLACE` / `REPLACE INTO` chạm tl_van_nghia, bỏ qua chú thích và bảng khác", () => {
  assert.equal(viPhamReplace(`const X = defineSql("tro-ly", "x", "INSERT OR REPLACE INTO tl_van_nghia (khoa) VALUES (?1)");`).length, 1);
  assert.equal(viPhamReplace("const X = `REPLACE INTO tl_van_nghia (khoa) VALUES (?1)`;").length, 1);
  assert.equal(viPhamReplace(`// cấm OR REPLACE vào tl_van_nghia\nconst X = "INSERT INTO tl_van_nghia (khoa) VALUES (?1) ON CONFLICT(khoa) DO NOTHING";`).length, 0);
  assert.equal(viPhamReplace(`const X = "INSERT OR REPLACE INTO tl_khac (id) VALUES (?1)";`).length, 0);
});

test("HÀNG RÀO: không câu SQL nào trong src/ chạm tl_van_nghia bằng OR REPLACE / REPLACE INTO (chỉ ON CONFLICT(khoa) DO NOTHING)", () => {
  const tep = tepNguon(SRC);
  assert.ok(tep.some((p) => p.endsWith(join("tro-ly", "repository.ts"))), "bộ quét phải thấy repository của tro-ly");
  const loi = tep.flatMap((p) => viPhamReplace(readFileSync(p, "utf8")).map((s) => `${p}: ${s}`));
  assert.deepEqual(loi, []);
});
