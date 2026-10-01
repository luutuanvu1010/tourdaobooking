// Luật thuần tìm theo nghĩa (ADR-0082): khoá đoạn (V1), giá + chi phí embedding (P1), mức trần trên (P2), BLOB float32, chia lô, đọc phản hồi Embeddings.
// Review Focus 1 (phản hồi lệch khuôn), 3 (BLOB nhiều dạng). Bài chọn đoạn trộn (C1–C5) thêm ở Task 2 cùng tệp.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  GIA_NHUNG, HET_GIO_NHUNG_MS, LO_GHI_D1, LO_NHUNG_DAU_VAO, LO_NHUNG_TOKEN_UOC, MAU_NHUNG, NGAY_TRA_GIA_NHUNG, NGUON_GIA_NHUNG, SO_CHIEU_NHUNG,
  blobSangVec, chiaLo, chiaLoNhung, chiPhiNhungMicroUsd, cosin, docPhanHoiNhung, khoaDoan, mucTranTren, thanNhung, tienBuUoc, vecSangBlob,
} from "./tro-ly-van-nghia.ts";
import { chiaKho, dinhDangDoan } from "./tro-ly.ts";
import { GIOI_HAN_TRO_LY as G } from "./tro-ly-gioi-han.ts";

test("hằng embedding: mẫu text-embedding-3-small, 512 chiều, 0,02 USD / 1 triệu token = 20.000 micro-USD, có ngày tra + nguồn; hạn giờ riêng 8 giây", () => {
  assert.equal(MAU_NHUNG, "text-embedding-3-small");
  assert.equal(SO_CHIEU_NHUNG, 512);
  assert.equal(GIA_NHUNG, 20_000);
  assert.match(NGAY_TRA_GIA_NHUNG, /^\d{4}-\d{2}-\d{2}$/);
  assert.match(NGUON_GIA_NHUNG, /^https:\/\/developers\.openai\.com\//);
  assert.equal(HET_GIO_NHUNG_MS, 8_000);
});

test("V1: khoaDoan = SHA-256 hex của 'chữ|mẫu|số chiều'; cùng chữ ⇒ cùng khoá; đổi 1 ký tự / mẫu / số chiều ⇒ khoá khác", async () => {
  const chu = "[Đổi PIN]\nVào trang Tôi.";
  const k = await khoaDoan(chu);
  assert.match(k, /^[0-9a-f]{64}$/);
  assert.equal(k, createHash("sha256").update(`${chu}|${MAU_NHUNG}|${SO_CHIEU_NHUNG}`, "utf8").digest("hex"));
  assert.equal(k, await khoaDoan(chu));
  assert.notEqual(k, await khoaDoan("[Đổi PIN]\nVào trang Tôi!"));
  assert.notEqual(k, await khoaDoan(chu, "text-embedding-3-large"));
  assert.notEqual(k, await khoaDoan(chu, MAU_NHUNG, 256));
});

test("P1: chiPhiNhungMicroUsd làm tròn LÊN — 0 ⇒ 0; 1 ⇒ 1; 50 ⇒ 1; 51 ⇒ 2; 39.329 ⇒ 787; 1 triệu ⇒ 20.000", () => {
  assert.deepEqual([0, 1, 50, 51, 39_329, 1_000_000].map(chiPhiNhungMicroUsd), [0, 1, 1, 2, 787, 20_000]);
});

test("P2: mức trần trên = (token vào chưa tài liệu + 6.000) × giá vào + token ra tối đa × giá ra + embedding ước của truy vấn", () => {
  // nano: 7.000 × 0,05 + 1.200 × 0,40 = 830; truy vấn 300 ký tự = 100 token ⇒ 2
  assert.equal(mucTranTren("gpt-5-nano", 1000, 1200, "a".repeat(300)), 832);
  // mini: 7.000 × 0,25 + 1.500 × 2 = 4.750; truy vấn 3 ký tự = 1 token ⇒ 1
  assert.equal(mucTranTren("gpt-5-mini", 1000, 1500, "abc"), 4751);
});

test("P2: tienBuUoc = tiền embedding ước của các đoạn sẽ tính bù (1 token ≈ 3 ký tự)", () => {
  assert.equal(tienBuUoc([]), 0);
  assert.equal(tienBuUoc(["a".repeat(300), "b".repeat(3000)]), 22); // 1.100 token
});

test("cosin: cùng hướng 1, vuông góc 0, 45° ≈ 0,7071; véc-tơ 0 hoặc khác độ dài ⇒ −1", () => {
  const v = (...x: number[]) => Float32Array.from(x);
  assert.equal(cosin(v(1, 0), v(2, 0)), 1);
  assert.equal(cosin(v(1, 0), v(0, 3)), 0);
  assert.ok(Math.abs(cosin(v(1, 1), v(1, 0)) - Math.SQRT1_2) < 1e-6);
  assert.equal(cosin(v(0, 0), v(1, 0)), -1);
  assert.equal(cosin(v(1, 0), v(1, 0, 0)), -1);
});

test("Review Focus 3: BLOB float32 — vecSangBlob ↔ blobSangVec khứ hồi; nhận ArrayBuffer, Uint8Array, mảng số (D1); sai độ dài / dạng lạ ⇒ null", () => {
  const v = Float32Array.from([0.5, -1.25, 3]);
  const b = vecSangBlob(v);
  assert.ok(b instanceof Uint8Array);
  assert.equal(b.byteLength, 12);
  for (const dang of [b, b.slice().buffer, [...b]]) assert.deepEqual([...blobSangVec(dang, 3)!], [0.5, -1.25, 3]);
  assert.equal(blobSangVec(b, 4), null);
  assert.equal(blobSangVec("abc", 3), null);
  assert.equal(blobSangVec([...b].map((x, i) => (i ? x : 300)), 3), null);
  assert.equal(blobSangVec(null, 3), null);
  // véc-tơ con (byteOffset ≠ 0) vẫn mã hoá đúng
  const con = new Float32Array(Float32Array.from([9, 0.5, -1.25, 3]).buffer, 4, 3);
  assert.deepEqual([...blobSangVec(vecSangBlob(con), 3)!], [0.5, -1.25, 3]);
});

test("chiaLo / chiaLoNhung: theo số đầu vào và theo token ước; một đầu vào lớn hơn trần token vẫn đi riêng một lô", () => {
  assert.deepEqual(chiaLo([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]]);
  assert.deepEqual(chiaLoNhung(Array.from({ length: 600 }, () => "ab")).map((l) => l.length), [256, 256, 88]);
  assert.deepEqual(chiaLoNhung(Array.from({ length: 5 }, () => "x".repeat(3000)), 256, 2500).map((l) => l.length), [2, 2, 1]);
  assert.deepEqual(chiaLoNhung(["x".repeat(9000)], 256, 100).map((l) => l.length), [1]);
  assert.deepEqual(chiaLoNhung([]), []);
});

test("G2: thân yêu cầu Embeddings ĐÚNG bốn khoá — không user / định danh", () => {
  assert.deepEqual(thanNhung(["đổi PIN"]), { model: MAU_NHUNG, input: ["đổi PIN"], dimensions: SO_CHIEU_NHUNG, encoding_format: "float" });
});

test("Review Focus 1: docPhanHoiNhung xếp theo index; thiếu / trùng index, sai số chiều, số không hữu hạn, số phần tử lệch ⇒ null; usage.prompt_tokens hoặc null", () => {
  const e = (i: number, n = 2) => { const x = new Array(n).fill(0); x[i % n] = 1; return x; };
  const ok = docPhanHoiNhung({ data: [{ index: 1, embedding: e(1) }, { index: 0, embedding: e(0) }], usage: { prompt_tokens: 7 } }, 2, 2)!;
  assert.deepEqual(ok.vec.map((v) => [...v]), [[1, 0], [0, 1]]);
  assert.equal(ok.token, 7);
  assert.equal(docPhanHoiNhung({ data: [{ index: 0, embedding: e(0) }, { index: 1, embedding: e(1) }] }, 2, 2)!.token, null);
  assert.equal(docPhanHoiNhung({ data: [{ index: 0, embedding: e(0) }, { index: 0, embedding: e(1) }] }, 2, 2), null);
  assert.equal(docPhanHoiNhung({ data: [{ index: 0, embedding: e(0) }] }, 2, 2), null);
  assert.equal(docPhanHoiNhung({ data: [{ index: 0, embedding: [1, 0, 0] }] }, 1, 2), null);
  assert.equal(docPhanHoiNhung({ data: [{ index: 0, embedding: [1, Number.NaN] }] }, 1, 2), null);
  assert.equal(docPhanHoiNhung({ data: [{ index: 2, embedding: e(0) }] }, 1, 2), null);
  assert.equal(docPhanHoiNhung({ error: { message: "x" } }, 1, 2), null);
  assert.equal(docPhanHoiNhung(null, 1, 2), null);
});

test("hàng rào lô: đoạn dài nhất của kho + đoạn ngữ cảnh tối đa < 8.192 ký tự (an toàn kể cả 1 ký tự = 1 token); lô ≤ 2.048 đầu vào, ≤ 300.000 token kể cả ước thấp 3 lần; kho ≤ 600 đoạn (giữ số câu D1 lần tính bù đầu xa trần 1.000)", () => {
  const kho = chiaKho();
  assert.ok(Math.max(...kho.map((d) => dinhDangDoan(d).length)) < 8192);
  assert.ok(G.tieuDeNguCanh + G.noiDungNguCanh + 40 < 8192);
  assert.ok(LO_NHUNG_DAU_VAO <= 2048 && LO_NHUNG_TOKEN_UOC * 3 <= 300_000);
  assert.ok(kho.length + G.soNguCanh <= 600, `kho ${kho.length} đoạn: tính bù lần đầu ghi mỗi đoạn một câu D1 — xem lại LO_GHI_D1 / cách ghi`);
  assert.equal(LO_GHI_D1, 50);
});
