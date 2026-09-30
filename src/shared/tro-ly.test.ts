// Luật thuần của trợ lý Hỗ trợ (ADR-0066). Hàng rào ghi ở docs/SO-HANG-RAO.md: "che SĐT trước khi gửi" (cheCauHoi), "trần" (quyetDinhTran),
// "kho chỉ chữ đã qua luật nội dung" (viPhamKho) và "sơ đồ trang sinh lại khớp mã".
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  CAU_CHUA_CO, CAU_HOI_TOI_DA, CAU_TU_CHOI, CHE, MAU_AI, NGAN_SACH_TOKEN, TOKEN_RA_TOI_DA, boDau, cheCauHoi, chiPhiMicroUsd, chiaKho, chonDoan, docPhanHoi,
  dungLoiNhac, khoangThang, kiemCaiDat, quyetDinhTran, tachNguon, tachTu, thanYeuCau, timDoan, uocToken, viPhamKho, dinhDangDoan, type DoanTriThuc,
} from "./tro-ly.ts";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { sinhTep, DICH } from "../../scripts/sinh-so-do-trang.mjs";

// ---- che (ADR-0066 điều 5)

test("cheCauHoi: SĐT (liền, cách, chấm, +84), email, căn cước 12 số, hộ chiếu có chữ đầu → [đã che]; giờ, ngày, số khách giữ nguyên", () => {
  for (const [vao, ra] of [
    ["gọi 0905123456 giúp", `gọi ${CHE} giúp`],
    ["số 0905 123 456 nhé", `số ${CHE} nhé`],
    ["số 0905.123.456", `số ${CHE}`],
    ["khách +84 905 123 456", `khách +${CHE}`],
    ["mail a.b@tourdao.vn hỏi", `mail ${CHE} hỏi`],
    ["căn cước 079123456789", `căn cước ${CHE}`],
    ["hộ chiếu C1234567 bị sai", `hộ chiếu ${CHE} bị sai`],
  ] as const) assert.equal(cheCauHoi(vao), ra, vao);
  for (const ok of ["đón lúc 07:30 ngày 05/10", "xe 16 chỗ, 4 khách", "mã đơn TD-2026", "phòng 1203"]) assert.equal(cheCauHoi(ok), ok, ok);
});

test("cheCauHoi: CHE TRƯỚC rồi mới cắt 500 — SĐT vắt ngang mốc 500 không lọt nửa số", () => {
  const dem = "a".repeat(CAU_HOI_TOI_DA - 4);
  const kq = cheCauHoi(`${dem} 0905123456`);
  assert.ok(!/\d{3,}/.test(kq), `còn dãy số: …${kq.slice(-12)}`);
  assert.ok([...kq].length <= CAU_HOI_TOI_DA);
  assert.equal([...cheCauHoi("x".repeat(900))].length, CAU_HOI_TOI_DA);
});

test("cheCauHoi(2.000 ký tự không '@') chạy dưới 50 ms (kiểm độc lập I-1)", () => {
  for (const s of ["a".repeat(2000), "a.".repeat(1000), "a-b ".repeat(500)]) {
    const t0 = performance.now();
    cheCauHoi(s);
    assert.ok(performance.now() - t0 < 50, JSON.stringify(s.slice(0, 8)));
  }
});

test("cheCauHoi: bỏ ký tự điều khiển / đảo chiều chữ, gộp khoảng trắng", () => {
  assert.equal(cheCauHoi("  lập\u0000 đơn‮ \n\n thế nào  "), "lập đơn thế nào");
});

// ---- kho + tìm (ADR-0066 điều 3)

test("kho: có đủ ba nguồn (hướng dẫn, cách app vận hành, sơ đồ trang); tên mục không trùng, không chứa ngoặc vuông", () => {
  const kho = chiaKho();
  assert.ok(kho.some((d) => d.ten.startsWith("Phần chung › ")));
  assert.ok(kho.some((d) => d.ten.startsWith("Cách app vận hành › ")));
  assert.ok(kho.some((d) => d.ten.startsWith("Sơ đồ trang › ")));
  assert.equal(new Set(kho.map((d) => d.ten)).size, kho.length, "tên mục trùng làm dòng Nguồn mơ hồ");
  for (const d of kho) assert.ok(!/[[\]]/.test(d.ten), d.ten);
});

test("A3 cho kho: mọi chữ gửi đi (hướng dẫn + kiến trúc + sơ đồ trang) không số tiền, không chuỗi giống SĐT, không email", () => {
  assert.deepEqual(viPhamKho(), []);
  const ban: DoanTriThuc = { ten: "x", quyen: [], chu: "gọi 0905 123 456" };
  assert.equal(viPhamKho([ban]).length, 1, "bộ bắt phải bắt được");
});

test("kiến trúc lời thường: không tên bảng / đường dẫn API / tệp mã", () => {
  for (const d of chiaKho().filter((x) => x.ten.startsWith("Cách app vận hành"))) {
    assert.ok(!/\/api\/|\.ts\b|\.sql\b|[a-z]+_[a-z]+\b|SELECT|INSERT/.test(d.chu), `${d.ten}: có chữ kỹ thuật`);
  }
});

test("tachTu / boDau: bỏ dấu, bỏ từ dừng, có cụm hai âm tiết", () => {
  assert.equal(boDau("Đặt gấp ĐƠN"), "dat gap don");
  const t = tachTu("Làm sao để đặt gấp?");
  assert.ok(t.includes("dat") && t.includes("gap") && t.includes("dat_gap"));
  assert.ok(!t.includes("lam") && !t.includes("de"));
});

test("timDoan: câu hỏi về đổi PIN ra mục đổi PIN; về đặt gấp ra mục đặt gấp", () => {
  assert.ok(timDoan("đổi mã PIN thế nào", ["SALES"]).slice(0, 3).some((x) => /đổi PIN/.test(x.doan.ten)));
  assert.match(timDoan("đặt gấp là gì", ["ADMIN"])[0]!.doan.ten, /Đặt gấp|6 giờ/);
});

test("timDoan: ưu tiên nhóm vai của người hỏi (Kế toán hỏi 'Menu của bạn' → nhóm Kế toán đứng đầu; Tài xế → nhóm Tài xế)", () => {
  assert.equal(timDoan("menu của tôi có gì", ["ACCOUNTING"])[0]!.doan.ten, "Kế toán › Menu của bạn");
  assert.equal(timDoan("menu của tôi có gì", ["DRIVER"])[0]!.doan.ten, "Tài xế › Menu của bạn");
});

test("chonDoan: tổng ước ≤ ngân sách ~6.000 token (1 token ≈ 3 ký tự); câu vô nghĩa → không đoạn nào", () => {
  const ds = chonDoan("đơn hàng khách xác nhận sửa huỷ thông báo xe tài xế giấy tờ", ["SUPER_ADMIN"]);
  assert.ok(ds.length > 0);
  assert.ok(ds.reduce((a, d) => a + uocToken(dinhDangDoan(d)), 0) <= NGAN_SACH_TOKEN);
  assert.deepEqual(chonDoan("zzqx wqpv", ["SALES"]), []);
  assert.deepEqual(chonDoan("đơn", ["SALES"], undefined, 10), [], "ngân sách nhỏ hơn mọi đoạn → rỗng");
});

// ---- lời nhắc + thân yêu cầu (ADR-0066 điều 2, 4, 5)

test("thanYeuCau: đúng mẫu, mức suy luận thấp nhất, giới hạn token ra, store false; KHÔNG gửi id / tên / SĐT người hỏi (không user, safety_identifier, metadata)", () => {
  const doan = chonDoan("đổi PIN", ["SALES"]);
  const than = thanYeuCau(["SALES"], doan, "đổi PIN thế nào");
  assert.equal(than.model, MAU_AI);
  assert.equal(MAU_AI, "gpt-5-nano");
  assert.deepEqual(than.reasoning, { effort: "minimal" });
  assert.equal(than.max_output_tokens, TOKEN_RA_TOI_DA);
  assert.equal(than.store, false);
  assert.equal(than.input, "đổi PIN thế nào");
  for (const k of ["user", "safety_identifier", "metadata", "previous_response_id"]) assert.ok(!(k in than), k);
  assert.match(String(than.instructions), /Người hỏi thuộc nhóm vai: Bán hàng\./);
});

test("dungLoiNhac: có luật chỉ-dùng-tài-liệu, câu 'chưa có' và câu từ chối nguyên văn, luật không nêu tiền, dòng Nguồn", () => {
  const p = dungLoiNhac(["FIELD"], []);
  assert.ok(p.includes(CAU_CHUA_CO) && p.includes(CAU_TU_CHOI));
  assert.match(p, /bí mật/);
  assert.match(p, /mã nguồn/);
  assert.match(p, /số tiền/);
  assert.match(p, /Nguồn: \[tên mục\]/);
});

// ---- đọc phản hồi, nguồn

test("docPhanHoi: gộp output_text của phần tử message; usage kể cả khi incomplete; thân lạ → rỗng", () => {
  const j = {
    status: "incomplete",
    output: [{ type: "reasoning", summary: [] }, { type: "message", content: [{ type: "output_text", text: "Bước 1." }, { type: "output_text", text: " Bước 2." }] }],
    usage: { input_tokens: 5000, input_tokens_details: { cached_tokens: 1000 }, output_tokens: 700, output_tokens_details: { reasoning_tokens: 200 } },
  };
  assert.deepEqual(docPhanHoi(j), { chu: "Bước 1. Bước 2.", suDung: { vao: 5000, vaoDem: 1000, ra: 700 } });
  assert.deepEqual(docPhanHoi(null), { chu: "", suDung: null });
  assert.deepEqual(docPhanHoi({ output: "x", usage: { input_tokens: -3, output_tokens: "9" } }), { chu: "", suDung: { vao: 0, vaoDem: 0, ra: 0 } });
});

test("tachNguon: chỉ giữ tên có trong đoạn đã gửi (mẫu bịa tên không lọt); thiếu nguồn → đoạn đầu; câu 'chưa có' / từ chối → không nguồn", () => {
  const gui: DoanTriThuc[] = [{ ten: "Phần chung › Đăng nhập", quyen: [], chu: "" }, { ten: "Bán hàng › Lập đơn mới", quyen: ["SALES"], chu: "" }];
  assert.deepEqual(tachNguon("1. Bấm Đăng nhập.\nNguồn: [Phần chung › Đăng nhập], [Mục bịa]", gui), { traLoi: "1. Bấm Đăng nhập.", nguon: ["Phần chung › Đăng nhập"] });
  assert.deepEqual(tachNguon("Làm thế này.", gui), { traLoi: "Làm thế này.", nguon: ["Phần chung › Đăng nhập"] });
  assert.deepEqual(tachNguon(`${CAU_CHUA_CO}\nNguồn: [Bán hàng › Lập đơn mới]`, gui), { traLoi: CAU_CHUA_CO, nguon: [] });
  assert.deepEqual(tachNguon(CAU_TU_CHOI, gui), { traLoi: CAU_TU_CHOI, nguon: [] });
});

// ---- chi phí + trần (ADR-0066 điều 6)

test("chiPhiMicroUsd: (vào − đệm) × 0,05 + đệm × 0,005 + ra × 0,40, làm tròn LÊN, số nguyên", () => {
  assert.equal(chiPhiMicroUsd({ vao: 6000, vaoDem: 0, ra: 1500 }), 900); // 300 + 600
  assert.equal(chiPhiMicroUsd({ vao: 5000, vaoDem: 1000, ra: 700 }), 485); // 200 + 5 + 280
  assert.equal(chiPhiMicroUsd({ vao: 1, vaoDem: 0, ra: 0 }), 1, "0,05 → làm tròn lên 1");
  assert.equal(chiPhiMicroUsd(null), 0);
  assert.ok(Number.isInteger(chiPhiMicroUsd({ vao: 12345, vaoDem: 777, ra: 999 })));
});

test("quyetDinhTran: tắt → hết trần tháng (cả công ty) → hết trần ngày (người hỏi) → được", () => {
  const c = { bat: true, tranThangMicroUsd: 5_000_000, tranNgay: 30 };
  assert.equal(quyetDinhTran({ ...c, bat: false }, { soCauHomNay: 0, chiPhiThang: 0 }), "tat");
  assert.equal(quyetDinhTran(c, { soCauHomNay: 0, chiPhiThang: 5_000_000 }), "het_tran_thang");
  assert.equal(quyetDinhTran(c, { soCauHomNay: 30, chiPhiThang: 5_000_000 }), "het_tran_thang", "tháng đứng trước ngày");
  assert.equal(quyetDinhTran(c, { soCauHomNay: 30, chiPhiThang: 4_999_999 }), "het_tran_ngay");
  assert.equal(quyetDinhTran(c, { soCauHomNay: 29, chiPhiThang: 4_999_999 }), "duoc");
  assert.equal(quyetDinhTran({ ...c, tranNgay: 0 }, { soCauHomNay: 0, chiPhiThang: 0 }), "het_tran_ngay");
});

test("khoangThang + kiemCaiDat", () => {
  assert.deepEqual(khoangThang("2026-09-30"), { tu: "2026-09-01", den: "2026-09-31" });
  assert.deepEqual(kiemCaiDat({ bat: true, tranThangUsd: 5, tranNgay: 30 }), { ok: true, value: { bat: true, tranThangMicroUsd: 5_000_000, tranNgay: 30 } });
  assert.deepEqual(kiemCaiDat({ bat: false, tranThangUsd: 2.5, tranNgay: 0 }), { ok: true, value: { bat: false, tranThangMicroUsd: 2_500_000, tranNgay: 0 } });
  for (const bad of [null, {}, { bat: "1", tranThangUsd: 5, tranNgay: 3 }, { bat: true, tranThangUsd: -1, tranNgay: 3 }, { bat: true, tranThangUsd: 500, tranNgay: 3 }, { bat: true, tranThangUsd: 5, tranNgay: 2.5 }]) {
    assert.equal(kiemCaiDat(bad as Record<string, unknown> | null).ok, false, JSON.stringify(bad));
  }
});

// ---- sơ đồ trang tự sinh (ADR-0066 điều 3(c))

test("sơ đồ trang: chạy lại bộ sinh ra ĐÚNG tệp đang có (sửa giao diện mà quên `node scripts/sinh-so-do-trang.mjs` ⇒ đỏ)", async () => {
  assert.equal(readFileSync(new URL(`../../${DICH}`, import.meta.url), "utf8"), await sinhTep());
});
