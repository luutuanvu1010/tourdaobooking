// Luật thuần tìm theo nghĩa (ADR-0082): khoá đoạn (V1), giá + chi phí embedding (P1), mức trần trên (P2), BLOB float32, chia lô, đọc phản hồi Embeddings.
// Review Focus 1 (phản hồi lệch khuôn), 3 (BLOB nhiều dạng). Bài chọn đoạn trộn (C1–C5) thêm ở Task 2 cùng tệp.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  GIA_NHUNG, HET_GIO_NHUNG_MS, LO_GHI_D1, LO_NHUNG_DAU_VAO, LO_NHUNG_TOKEN_UOC, MAU_NHUNG, NGAY_TRA_GIA_NHUNG, NGUON_GIA_NHUNG, SO_CHIEU_NHUNG,
  K_RRF, NGUONG_COSIN, blobSangVec, chiaLo, chiaLoNhung, chiPhiNhungMicroUsd, chonDoanTron, cosin, daChonTuKhoa, docPhanHoiNhung, khoaDoan, khopManh, mucTranTren, thanNhung, tienBuUoc, vecSangBlob,
} from "./tro-ly-van-nghia.ts";
import { KHONG_TIM_THAY, SO_DOAN_TOI_DA, chiaKho, dinhDangDoan, dungLoiNhac, truyVanTim, uocToken, type DoanTriThuc } from "./tro-ly.ts";
import { GIOI_HAN_TRO_LY as G } from "./tro-ly-gioi-han.ts";
import { xungHo } from "./xung-ho.ts";

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
  // thứ tự byte khoá cứng: float32 LITTLE-ENDIAN như migration ghi (1.0 = 0x3f800000 ⇒ 00 00 80 3f)
  assert.deepEqual([...vecSangBlob(Float32Array.from([1]))], [0x00, 0x00, 0x80, 0x3f]);
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

// ---- Chọn đoạn trộn (Đ3: C1–C5) ----
const mot = (i: number): Float32Array => { const v = new Float32Array(SO_CHIEU_NHUNG); v[i] = 1; return v; };
/** Véc-tơ có cô-sin với mot(0) ĐÚNG bằng x. */
const coSin = (x: number): Float32Array => { const v = new Float32Array(SO_CHIEU_NHUNG); v[0] = x; v[1] = Math.sqrt(1 - x * x); return v; };
const KHO: DoanTriThuc[] = [
  { ten: "Đặt gấp", quyen: [], chu: "Bấm nút Đặt gấp khi chặng dưới mốc sáu giờ." },
  { ten: "Trang chủ", quyen: [], chu: "Trang chủ dùng để xem việc hôm nay." },
  { ten: "Đổi PIN", quyen: [], chu: "Vào trang Tôi, bấm Đổi PIN, gõ mã mới hai lần." },
  { ten: "Xe", quyen: [], chu: "Danh sách xe của công ty và giấy tờ xe." },
];
const tom = (ds: ReturnType<typeof chonDoanTron>) => ds.map((x) => [x.doan.ten, x.theoNghia, x.theoTuKhoa]);

test("C1: RRF — đoạn có CẢ hai tín hiệu đứng trước đoạn chỉ khớp nghĩa; ngưỡng cô-sin 0,3 (0,29 bỏ, 0,31 giữ); vecDoan null = không có nghĩa", () => {
  assert.equal(NGUONG_COSIN, 0.3);
  assert.equal(K_RRF, 60);
  const ds = chonDoanTron("đổi PIN", mot(0), KHO, [null, coSin(0.29), mot(0), coSin(0.31)], ["SALES"]);
  assert.deepEqual(tom(ds), [["Đổi PIN", true, true], ["Xe", true, false]]);
});

test("C1: giữ trọng số vai — hai đoạn cùng chữ, đoạn của nhóm vai người hỏi đứng trước; đoạn vai khác vẫn được chọn (xếp sau)", () => {
  const kho: DoanTriThuc[] = [
    { ten: "Kế toán › Đổi PIN", quyen: ["ACCOUNTING"], chu: "Vào trang Tôi, bấm Đổi PIN." },
    { ten: "Bán hàng › Đổi PIN", quyen: ["SALES"], chu: "Vào trang Tôi, bấm Đổi PIN." },
  ];
  assert.deepEqual(chonDoanTron("đổi PIN", mot(0), kho, [mot(0), mot(0)], ["SALES"]).map((x) => x.doan.ten), ["Bán hàng › Đổi PIN", "Kế toán › Đổi PIN"]);
});

test("C1: ngân sách token và tối đa 12 đoạn như chonDoan", () => {
  const kho: DoanTriThuc[] = Array.from({ length: 20 }, (_, i) => ({ ten: `Mục ${String.fromCharCode(65 + i)}`, quyen: [], chu: `Đổi PIN cách ${String.fromCharCode(65 + i)}.` }));
  const vec = kho.map(() => mot(0));
  assert.equal(chonDoanTron("đổi PIN", mot(0), kho, vec, ["SALES"]).length, SO_DOAN_TOI_DA);
  const motDoan = uocToken(dinhDangDoan(kho[0]!));
  assert.equal(chonDoanTron("đổi PIN", mot(0), kho, vec, ["SALES"], motDoan * 3).length, 3);
});

test("C2: đoạn khớp CẶP âm tiết (tên nút 'Đặt gấp') được giữ dù cô-sin thấp; đoạn chỉ khớp lẻ chữ phổ biến 'dùng' mà cô-sin thấp bị bỏ", () => {
  assert.deepEqual(tom(chonDoanTron("cách dùng nút đặt gấp", mot(0), KHO, KHO.map(() => mot(1)), ["SALES"])), [["Đặt gấp", false, true]]);
});

test("C3: câu không khớp từ khoá nào nhưng gần nghĩa một đoạn ⇒ đoạn đó được chọn, cờ khớp nghĩa", () => {
  assert.deepEqual(tom(chonDoanTron("quên mật khẩu đăng nhập", mot(0), KHO, [mot(1), mot(1), mot(0), mot(1)], ["SALES"])), [["Đổi PIN", true, false]]);
});

test("C4: kho THẬT + mọi véc-tơ đoạn trực giao câu hỏi ⇒ chỉ còn đoạn khớp MẠNH — đo 2026-10-18, vai Bán hàng: than phiền 18, đổi PIN 10, lập đơn 45 (trần 12); không còn đoạn ⇒ khối tài liệu 'không tìm thấy'", () => {
  // Hướng dẫn đổi chữ ⇒ con số có thể đổi: đo lại (nhật ký thi công "Số đo luật khớp mạnh"), sửa số ở đây kèm lý do — không nới luật để giữ số.
  const kho = chiaKho();
  const vec = kho.map(() => mot(1));
  const dem = (c: string) => khopManh(c, kho, ["SALES"]).filter(Boolean).length;
  // 2026-10-02 (1.77): bỏ đoạn "Điều phối xe — chưa dùng cho chuyến thật" (Trợ giúp + kho "Cách app vận hành") — đoạn đó lặp chữ "dùng" nên đè điểm cao nhất,
  // chỉ MÌNH nó vượt 0,7 × max (1 khớp). Bỏ đi ⇒ max thấp xuống ⇒ 15 đoạn có "app" + "dùng" vượt ngưỡng tương đối; luật không đổi. Câu than phiền nay ra
  // đoạn Câu hỏi thường gặp thay vì đoạn Điều phối xe (đúng hơn); trần 12 đoạn cắt bớt.
  // 2026-10-05 (năm lỗi tiền, Đợt 1 ADR-0089): ba ô quyền mới (chọn lý do "Công ty huỷ" / phân loại, duyệt hoàn cọc, ghi đã hoàn ngoài hệ thống) có tên lời
  // thường chứa "đơn" / "lập lại đơn" ⇒ một đoạn "Cấu trúc app" nữa vượt ngưỡng của câu lập đơn (41 → 42); luật không đổi, trần 12 vẫn cắt.
  // 2026-10-08 (gói A2, ADR-0063 D1 — văn phòng sửa số khách): hướng dẫn HDV / Kế toán và ô "sửa số khách sau xác nhận" nay nói "nhờ văn phòng (người lập đơn,
  // Kế toán hoặc Quản trị)" / "người lập đơn (Bán hàng)" ⇒ thêm đoạn chứa "lập đơn" vượt ngưỡng của câu lập đơn (42 → 46); điểm cao nhất đổi nên câu than phiền
  // bớt một đoạn sát ngưỡng (17 → 16). Luật không đổi, trần 12 vẫn cắt; các tên đoạn khoá dưới đây giữ nguyên.
  // 2026-10-12 (ghép main 1c471990 vào gói A+C): hai nhánh cùng đổi chữ Trợ giúp / kho cấu trúc — nhánh A+C một mình: 16 / 10 / 46 (đoạn trên); main một mình (sổ đại lý
  // đợt 1: mô tả phân hệ pricing và ky-so, thêm gạch «Đặt qua đối tác», cắt một câu hỏi thường gặp): 17 / 10 / 42. Chạy THẬT trên bản ghép (đo bằng chính bài này): 17 / 10 / 46 —
  // lập đơn giữ +4 của gói A2 (42 → 46); than phiền 17 khi chưa cắt chữ. Rồi hướng dẫn Quản trị phải cắt 29 chữ (bỏ câu «lượt thử tính vào trần…» và câu «Key chỉ hiện…») và hướng dẫn Bán hàng cắt 8 chữ để
  // «Phần chung + một nhóm vai» còn ≤ 30 phút (huong-dan.test.ts A4; ghép hai nhánh cùng dài thêm) ⇒ đo lại: 16 / 10 / 46. Số đo, không suy ra từng đoạn. Luật không đổi, trần 12 vẫn cắt; các tên đoạn khoá dưới đây giữ nguyên.
  // 2026-10-13 (đợt 1 giao diện Tạo đơn, 1.91 tạm): hướng dẫn Bán hàng/Đối tác đổi chữ theo form mới (ô danh mục mở khi chạm, «Đón khác ngày», hàng «Khách tự đặt | Đặt qua đối tác»)
  // ⇒ đo lại bằng chính bài này: 17 / 10 / 46 — thêm MỘT đoạn sát ngưỡng ở câu than phiền; luật không đổi, trần 12 vẫn cắt; các tên đoạn khoá dưới đây giữ nguyên.
  // 2026-10-17 (ADR-0125, lát H-4 việc 3): hai ô quyền mới `party.verify` / `party.verify.attachment` thêm hai dòng lời thường vào kho cấu trúc app (bảng tên tro-ly-cau-truc-ten.ts)
  // ⇒ đo lại bằng chính bài này: 18 / 10 / 46 — MỘT đoạn nữa sát ngưỡng ở câu than phiền; luật không đổi, trần 12 vẫn cắt; các tên đoạn khoá dưới đây giữ nguyên.
  // 2026-10-18 (ADR-0131, Task 4): câu về lịch sử đơn trong hướng dẫn Kế toán và trợ lý nay nói «đổi gì, lúc nào; tên người sửa chỉ … xem được» (bỏ «ai sửa») ⇒ MỘT đoạn
  // chứa «lập đơn» rơi khỏi ngưỡng của câu lập đơn; đo lại bằng chính bài này: 18 / 10 / 45. Luật không đổi, trần 12 vẫn cắt; các tên đoạn khoá dưới đây giữ nguyên.
  assert.deepEqual([dem("sao app khó dùng thế"), dem("đổi mã PIN thế nào"), dem("lập đơn mới ra sao")], [18, 10, 45]);
  // 2026-10-05 (1.81, Đợt 7): Trợ giúp thêm câu về hai ô "Xe riêng" / "Xe tối thiểu" (Bán hàng, Quản trị) và bỏ vài dòng trùng ý ⇒ hai đoạn nữa vượt ngưỡng tương đối của câu than phiền (15 → 17); luật không đổi, trần 12 vẫn cắt.
  const thanPhien = chonDoanTron("sao app khó dùng thế", mot(0), kho, vec, ["SALES"]).map((x) => x.doan.ten);
  assert.equal(thanPhien.length, SO_DOAN_TOI_DA);
  assert.ok(thanPhien.includes("Phần chung › Câu hỏi thường gặp"), JSON.stringify(thanPhien));
  assert.ok(!thanPhien.some((t) => t.includes("Điều phối xe")), JSON.stringify(thanPhien));
  // 45 khớp mạnh ⇒ RRF + trần 12 đoạn / 6.000 token chọn tiếp (F7: khoá tên cụ thể, không chỉ "có đoạn").
  const lapDon = chonDoanTron("lập đơn mới ra sao", mot(0), kho, vec, ["SALES"]).map((x) => x.doan.ten);
  assert.equal(lapDon.length, SO_DOAN_TOI_DA);
  assert.equal(lapDon[0], "Cấu trúc app › Việc: lập đơn mới");
  assert.ok(lapDon.includes("Bán hàng › Lập đơn mới"), JSON.stringify(lapDon));
  const doiPin = chonDoanTron("đổi mã PIN thế nào", mot(0), kho, vec, ["SALES"]).map((x) => x.doan.ten);
  assert.equal(doiPin.length, 10);
  assert.ok(doiPin.includes("Phần chung › Trang Tôi, đổi PIN, đăng xuất"), JSON.stringify(doiPin));
  assert.deepEqual(chonDoanTron("zzqx wqpv", mot(0), kho, vec, ["SALES"]), []);
  assert.ok(dungLoiNhac("Bạn là trợ lý.", ["SALES"], xungHo(null, null), []).endsWith(`TÀI LIỆU:\n${KHONG_TIM_THAY}`));
});

test("C5: truy vấn = câu hiện tại + câu trước gần nhất — câu nối tiếp không khớp gì vẫn ra đoạn nhờ câu trước", () => {
  const vec = KHO.map(() => mot(1));
  assert.deepEqual(chonDoanTron("còn trên điện thoại thì sao", mot(0), KHO, vec, ["SALES"]), []);
  assert.deepEqual(tom(chonDoanTron(truyVanTim("còn trên điện thoại thì sao", "đổi PIN thế nào"), mot(0), KHO, vec, ["SALES"])), [["Đổi PIN", false, true]]);
});

test("daChonTuKhoa (đường lùi): mọi đoạn cờ khớp từ khoá, không khớp nghĩa", () => {
  assert.deepEqual(tom(daChonTuKhoa([KHO[2]!])), [["Đổi PIN", false, true]]);
});

test("biên: đoạn vecDoan null nhưng khớp từ khoá mạnh vẫn được giữ — cờ [không nghĩa, có từ khoá]", () => {
  assert.deepEqual(tom(chonDoanTron("cách dùng nút đặt gấp", mot(0), KHO, [null, null, null, null], ["SALES"])), [["Đặt gấp", false, true]]);
});

test("biên: véc-tơ toàn 0 (câu hỏi hoặc đoạn) và vecDoan ngắn hơn kho ⇒ không lỗi, coi như không có tín hiệu nghĩa", () => {
  const khong = new Float32Array(SO_CHIEU_NHUNG);
  assert.deepEqual(tom(chonDoanTron("đổi PIN", mot(0), KHO, [khong, khong, khong, khong], ["SALES"])), [["Đổi PIN", false, true]]);
  assert.deepEqual(tom(chonDoanTron("đổi PIN", khong, KHO, KHO.map(() => mot(0)), ["SALES"])), [["Đổi PIN", false, true]]);
  assert.deepEqual(tom(chonDoanTron("đổi PIN", mot(0), KHO, [mot(1)], ["SALES"])), [["Đổi PIN", false, true]]);
  assert.deepEqual(chonDoanTron("quên mật khẩu", mot(0), KHO, [], ["SALES"]), []);
});

test("khớp mạnh nhánh CẶP âm tiết: đoạn chỉ khớp một cặp liền nhau + một âm tiết đơn (không đủ nhánh điểm cao) vẫn được giữ; đoạn khớp lẻ âm tiết bị bỏ", () => {
  const kho: DoanTriThuc[] = [
    { ten: "Kho", quyen: [], chu: "Xe có hàng sẵn ở bến." },
    { ten: "Khác", quyen: [], chu: "Hàng mới về kho hôm qua." },
  ];
  assert.deepEqual(khopManh("có hàng", kho, ["SALES"]), [true, false]);
  assert.deepEqual(tom(chonDoanTron("có hàng", mot(0), kho, [mot(1), mot(1)], ["SALES"])), [["Kho", false, true]]);
});
