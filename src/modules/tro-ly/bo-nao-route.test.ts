// Route bộ não của trợ lý (ADR-0073 Đ1, Đ2, Đ5, Đ7) chạy CẢ ứng dụng trên SQLite thật qua tests/audit/harness.mjs; OpenAI thay bằng `globalThis.fetch` giả.
// Phủ: B1–B8, B10, T6 (Task 6); N1–N5 (Task 7); P2 (Task 8); T1–T5 (Task 9). Review Focus 1, 3, 4.
import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";
import { LOI_NHAC_MAC_DINH } from "../../shared/tro-ly-bo-nao.ts";
import { vnToday } from "../../shared/vn-date.ts";

const SALES = "11111111-1111-4111-8111-111111111111";
const SALES2 = "22222222-2222-4222-8222-222222222222";
const ADM = "33333333-3333-4333-8333-333333333333";
const SUP = "77777777-7777-4777-8777-777777777777";
const CUOC = "0f1e2d3c-4b5a-4968-8778-a1b2c3d4e5f6";
const CUOC2 = "9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d";

interface GoiGia { body: Record<string, unknown> }
const fetchThat = globalThis.fetch;
afterEach(() => { globalThis.fetch = fetchThat; });

/** OpenAI giả: ghi thân mọi yêu cầu; trả `chu` (mặc định: câu có dòng Nguồn = đoạn đầu của khối TÀI LIỆU cuối). */
function openAiGia(tuyChon: { chu?: string; usage?: Record<string, unknown>; status?: number } = {}): GoiGia[] {
  const goi: GoiGia[] = [];
  globalThis.fetch = (async (_i: RequestInfo | URL, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>;
    goi.push({ body });
    if (tuyChon.status && tuyChon.status >= 400) return new Response(JSON.stringify({ error: { message: "lỗi" } }), { status: tuyChon.status });
    const ins = String(body.instructions ?? "");
    const ten = /\[([^\]]+)\]/.exec(ins.slice(ins.lastIndexOf("TÀI LIỆU:")))?.[1] ?? "";
    return new Response(JSON.stringify({
      output: [{ type: "message", content: [{ type: "output_text", text: tuyChon.chu ?? `Làm theo hướng dẫn.${ten ? `\nNguồn: [${ten}]` : ""}` }] }],
      usage: tuyChon.usage ?? { input_tokens: 4000, input_tokens_details: { cached_tokens: 0 }, output_tokens: 500 },
    }), { status: 200 });
  }) as typeof fetch;
  return goi;
}

function setup(khoa: string | null = "khoa-gia-du-dai-0123456789") {
  const w = world();
  seedStaff(w.sqlite, { id: SALES, phone: "0900000001", name: "An", perms: ["SALES"] });
  seedStaff(w.sqlite, { id: SALES2, phone: "0900000002", name: "Bình", perms: ["SALES"] });
  seedStaff(w.sqlite, { id: ADM, phone: "0900000003", name: "Quản trị", perms: ["ADMIN"] });
  seedStaff(w.sqlite, { id: SUP, phone: "0900000007", name: "Chủ", perms: ["SUPER_ADMIN"] });
  if (khoa !== null) (w.env as Record<string, unknown>).OPENAI_API_KEY = khoa;
  return w;
}
type W = ReturnType<typeof setup>;
const boNao = (w: W) => w.call("GET", "/api/tro-ly/bo-nao", { as: SUP });
const luuBoNao = (w: W, body: Record<string, unknown>) => w.call("PUT", "/api/tro-ly/bo-nao", { as: SUP, body });
const hoi = (w: W, as: string, cauHoi: string, cuocTroChuyen?: unknown) =>
  w.call("POST", "/api/tro-ly/hoi", { as, body: cuocTroChuyen === undefined ? { cauHoi } : { cauHoi, cuocTroChuyen } });
const MINI = { mau: "gpt-5-mini", mucSuyNghi: "low", doDai: "medium", tokenRaToiDa: 1500, loiNhac: "Bạn là trợ lý thử nghiệm.\nTrả lời thật ngắn." };

test("B1: GET bộ não — chưa có bản ⇒ thông số mặc định + bản mặc định, cờ mặc định; danh sách 3 mẫu có giá, mức (nhãn tiếng Việt), ngày tra, ước tính một câu; ghi chú ước tính", async () => {
  const w = setup();
  const r = await boNao(w);
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(r.json.hienHanh, { mau: "gpt-5-nano", mucSuyNghi: "minimal", doDai: "low", tokenRaToiDa: 1200, loiNhac: LOI_NHAC_MAC_DINH });
  assert.equal(r.json.macDinh, true);
  assert.equal(r.json.loiNhacMacDinh, LOI_NHAC_MAC_DINH);
  assert.deepEqual(r.json.danhSachMau.map((m: { ma: string }) => m.ma), ["gpt-5-nano", "gpt-5-mini", "gpt-5"]);
  const nano = r.json.danhSachMau[0];
  assert.deepEqual(nano.gia, { vao: 50_000, vaoDem: 5_000, ra: 400_000 });
  assert.deepEqual(nano.mucSuyNghi[0], { ma: "minimal", nhan: "Tối thiểu" });
  assert.match(nano.ngayTraGia, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(nano.uocMotCauUsd, 0.00078, "6.000 × 0,05 + 1.200 × 0,40 micro-USD");
  assert.deepEqual(r.json.doDai, [{ ma: "low", nhan: "Ngắn" }, { ma: "medium", nhan: "Vừa" }, { ma: "high", nhan: "Dài" }]);
  assert.match(r.json.ghiChuUocTinh, /chưa tính token suy nghĩ và phần nhớ/);
  assert.equal((await w.call("GET", "/api/tro-ly/bo-nao", { as: ADM })).status, 403, "B7: chỉ Toàn quyền");
});

test("B2: PUT sai (mẫu lạ, mức không nhận, token ngoài khoảng, Cao < 2000, lời nhắc rỗng / quá dài / có SĐT) ⇒ 400 câu tiếng Việt, KHÔNG thêm bản, không nhật ký", async () => {
  const w = setup();
  for (const sai of [{ mau: "gpt-4o" }, { mucSuyNghi: "xhigh" }, { tokenRaToiDa: 100 }, { mucSuyNghi: "high", tokenRaToiDa: 1500 }, { loiNhac: "" }, { loiNhac: "a".repeat(12_001) }, { loiNhac: "Gọi 0905 123 456" }]) {
    const r = await luuBoNao(w, { ...MINI, ...sai });
    assert.equal(r.status, 400, JSON.stringify(sai));
    assert.ok(!/[a-z]+_[a-z]+/.test(r.json.error.message), r.json.error.message);
  }
  assert.equal(w.q("SELECT count(*) AS n FROM tl_bo_nao")[0]!.n, 0);
  assert.equal(w.q("SELECT count(*) AS n FROM audit_log WHERE action = 'tro_ly_settings_changed'")[0]!.n, 0);
});

test("B3 + B7 + B8: PUT hợp lệ ⇒ MỘT bản; câu hỏi kế tiếp gửi đúng mẫu / mức / độ dài / token ra / lời nhắc; chi phí theo giá mẫu đó, ghi mã mẫu; nhật ký nêu phần đổi, không nội dung", async () => {
  const w = setup();
  const goi = openAiGia({ usage: { input_tokens: 4000, input_tokens_details: { cached_tokens: 0 }, output_tokens: 500 } });
  const r = await luuBoNao(w, MINI);
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(r.json.hienHanh, MINI);
  assert.equal(r.json.macDinh, false);
  assert.equal(w.q("SELECT count(*) AS n FROM tl_bo_nao")[0]!.n, 1);
  assert.equal((await hoi(w, SALES, "đổi mã PIN thế nào")).status, 200);
  const b = goi[0]!.body;
  assert.deepEqual([b.model, b.reasoning, b.text, b.max_output_tokens], ["gpt-5-mini", { effort: "low" }, { verbosity: "medium" }, 1500]);
  assert.ok(String(b.instructions).startsWith(MINI.loiNhac));
  const l = w.q("SELECT mau, la_thu, chi_phi_micro_usd FROM tl_luot_hoi")[0]!;
  assert.deepEqual({ ...l }, { mau: "gpt-5-mini", la_thu: 0, chi_phi_micro_usd: 2000 }); // 4000 × 0,25 + 500 × 2
  const nk = w.q("SELECT detail FROM audit_log WHERE action = 'tro_ly_settings_changed'").map((x) => x.detail);
  assert.deepEqual(nk, ["bộ não: mẫu, mức suy nghĩ, độ dài, token trả lời tối đa, lời nhắc"]);
  assert.ok(!JSON.stringify(w.q("SELECT * FROM audit_log")).includes("thử nghiệm"), "nhật ký không chứa nội dung lời nhắc");
});

test("B6: lịch sử bản — thời điểm, người lưu (tên), phần đổi; 'Quay lại bản này' = PUT lại nội dung bản cũ ⇒ bản MỚI giống bản cũ; 'Khôi phục mặc định' ⇒ cờ mặc định", async () => {
  const w = setup();
  assert.equal((await luuBoNao(w, MINI)).status, 200);
  assert.equal((await luuBoNao(w, { ...MINI, mau: "gpt-5" })).status, 200);
  let ls = await w.call("GET", "/api/tro-ly/bo-nao/lich-su", { as: SUP });
  assert.equal(ls.status, 200, ls.text);
  assert.deepEqual(ls.json.cacBan.map((b: { mau: string; phanDoi: string; nguoi: string }) => [b.mau, b.phanDoi, b.nguoi]), [["gpt-5", "mẫu", "Chủ"], ["gpt-5-mini", "bản đầu tiên", "Chủ"]]);
  const cu = ls.json.cacBan[1];
  assert.equal((await luuBoNao(w, { mau: cu.mau, mucSuyNghi: cu.mucSuyNghi, doDai: cu.doDai, tokenRaToiDa: cu.tokenRaToiDa, loiNhac: cu.loiNhac })).status, 200);
  ls = await w.call("GET", "/api/tro-ly/bo-nao/lich-su", { as: SUP });
  assert.equal(ls.json.cacBan.length, 3, "quay lại = thêm bản mới");
  assert.deepEqual((await boNao(w)).json.hienHanh, MINI);
  const r = await luuBoNao(w, { ...MINI, loiNhac: LOI_NHAC_MAC_DINH });
  assert.equal(r.json.macDinh, true, "khôi phục mặc định");
  assert.equal((await w.call("GET", "/api/tro-ly/bo-nao/lich-su", { as: ADM })).status, 403);
});

test("Review Focus 1: bản đã lưu trỏ mẫu không còn trong danh sách ⇒ câu hỏi vẫn 200 bằng thông số mặc định, GIỮ lời nhắc đã lưu", async () => {
  const w = setup();
  const goi = openAiGia();
  w.sqlite.exec(`INSERT INTO tl_bo_nao (id, mau, muc_suy_nghi, do_dai, token_ra_toi_da, loi_nhac, valid_from_at, created_at, created_by, updated_at, updated_by)
    VALUES ('cu', 'gpt-4-cu', 'xhigh', 'low', 1200, 'Lời nhắc cũ còn dùng.', '2999-01-01T00:00:00.000Z', '2999-01-01T00:00:00.000Z', '${SUP}', '2999-01-01T00:00:00.000Z', '${SUP}')`);
  const r = await hoi(w, SALES, "đổi mã PIN thế nào");
  assert.equal(r.status, 200, r.text);
  assert.equal(goi[0]!.body.model, "gpt-5-nano");
  assert.deepEqual(goi[0]!.body.reasoning, { effort: "minimal" });
  assert.ok(String(goi[0]!.body.instructions).startsWith("Lời nhắc cũ còn dùng."));
  assert.equal((await boNao(w)).status, 200, "GET bộ não không sập");
});

test("B10 + T6: Thử key dùng MẪU ĐANG CHỌN, ghi la_thu = 1; lượt thử KHÔNG tính trần ngày, KHÔNG vào số câu hôm nay / tháng; CÓ vào tiền tháng; có dòng lượt thử tháng", async () => {
  const w = setup();
  const goi = openAiGia({ usage: { input_tokens: 1000, output_tokens: 100 } });
  assert.equal((await luuBoNao(w, MINI)).status, 200);
  assert.equal((await w.call("POST", "/api/tro-ly/cai-dat", { as: SUP, body: { bat: true, tranThangUsd: 5, tranNgay: 1 } })).status, 200);
  assert.equal((await w.call("POST", "/api/tro-ly/thu-khoa", { as: SUP, body: {} })).json.ma, "duoc");
  assert.equal(goi[0]!.body.model, "gpt-5-mini");
  assert.deepEqual(goi[0]!.body.reasoning, { effort: "minimal" });
  assert.deepEqual({ ...w.q("SELECT mau, la_thu, chi_phi_micro_usd FROM tl_luot_hoi")[0]! }, { mau: "gpt-5-mini", la_thu: 1, chi_phi_micro_usd: 450 }); // 1000 × 0,25 + 100 × 2
  assert.equal((await hoi(w, SUP, "đổi mã PIN thế nào")).status, 200, "trần ngày 1: lượt thử không bị đếm");
  const c = (await w.call("GET", "/api/tro-ly/cai-dat", { as: SUP })).json;
  assert.equal(c.soCauHomNay, 1);
  assert.equal(c.soCauThang, 1);
  assert.equal(c.soLuotThuThang, 1);
  assert.equal(c.chiPhiThangUsd, (450 + 450) / 1_000_000, "tiền tháng GỒM lượt thử");
});

test("B10: OpenAI trả 400 cho Thử key (vd. mẫu không nhận mức suy nghĩ) ⇒ 200 câu tiếng Việt dễ hiểu, KHÔNG 500; lượt ghi loi + la_thu = 1", async () => {
  const w = setup();
  openAiGia({ status: 400 });
  assert.equal((await luuBoNao(w, MINI)).status, 200);
  const r = await w.call("POST", "/api/tro-ly/thu-khoa", { as: SUP, body: {} });
  assert.equal(r.status, 200, r.text);
  assert.equal(r.json.ma, "mau_tu_choi");
  assert.match(r.json.cau, /^Mẫu AI đang chọn không nhận/);
  assert.deepEqual({ ...w.q("SELECT mau, la_thu, ket_qua FROM tl_luot_hoi")[0]! }, { mau: "gpt-5-mini", la_thu: 1, ket_qua: "loi" });
});

const chenLuotCu = (w: W, id: string, staffId: string, cuoc: string, createdAt: string, ketQua: "ok" | "loi", cauHoi: string) => {
  w.sqlite.exec(`INSERT INTO tl_luot_hoi (id, staff_id, ngay_vn, ket_qua, created_at, updated_at) VALUES ('l-${id}', '${staffId}', '2026-10-01', '${ketQua}', '${createdAt}', '${createdAt}')`);
  w.sqlite.exec(`INSERT INTO tl_hoi_dap (id, luot_id, staff_id, vai, ngay_vn, cau_hoi, tra_loi, nguon, ket_qua, cuoc_tro_chuyen, created_at, created_by, updated_at, updated_by)
    VALUES ('h-${id}', 'l-${id}', '${staffId}', '["SALES"]', '2026-10-01', '${cauHoi}', 'Đáp ${id}', '[]', '${ketQua}', '${cuoc}', '${createdAt}', '${staffId}', '${createdAt}', '${staffId}')`);
};

test("N1 + N2: cùng mã cuộc trò chuyện ⇒ input = TỐI ĐA 3 lượt user / assistant gần nhất (cũ → mới) rồi câu mới; mã lưu vào tl_hoi_dap", async () => {
  const w = setup();
  const goi = openAiGia();
  for (const c of ["đổi mã PIN thế nào", "bật thông báo ra sao", "lập đơn mới ra sao", "xác nhận đơn thế nào"]) assert.equal((await hoi(w, SALES, c, CUOC)).status, 200);
  assert.equal(goi[0]!.body.input, "đổi mã PIN thế nào", "lượt đầu: chuỗi như cũ");
  assert.equal((await hoi(w, SALES, "còn trên điện thoại thì sao", CUOC)).status, 200);
  const input = goi.at(-1)!.body.input as { role: string; content: string }[];
  assert.ok(Array.isArray(input), JSON.stringify(input));
  assert.deepEqual(input.map((x) => x.role), ["user", "assistant", "user", "assistant", "user", "assistant", "user"]);
  assert.deepEqual(input.filter((x) => x.role === "user").map((x) => x.content), ["bật thông báo ra sao", "lập đơn mới ra sao", "xác nhận đơn thế nào", "còn trên điện thoại thì sao"]);
  assert.equal(input[1]!.content, "Làm theo hướng dẫn.", "câu trả lời trước lấy từ tl_hoi_dap (đã bỏ dòng Nguồn, đã ẩn tiền)");
  assert.deepEqual(w.q("SELECT DISTINCT cuoc_tro_chuyen AS c FROM tl_hoi_dap").map((x) => x.c), [CUOC]);
});

test("N6: lượt trước mang chữ '[đã che]' đi nguyên vào phần nhớ", async () => {
  const w = setup();
  const goi = openAiGia();
  await hoi(w, SALES, "khách 0905 123 456 hỏi đổi mã PIN thế nào", CUOC);
  await hoi(w, SALES, "còn cách khác không", CUOC);
  const input = goi.at(-1)!.body.input as { role: string; content: string }[];
  assert.equal(input[0]!.content, "khách [đã che] hỏi đổi mã PIN thế nào");
  assert.ok(!JSON.stringify(goi.map((g) => g.body)).includes("0905"));
});

test("HÀNG RÀO nhớ chỉ cùng người (N3): người B gửi mã cuộc trò chuyện của người A ⇒ KHÔNG nhận lượt nào của A", async () => {
  const w = setup();
  const goi = openAiGia();
  await hoi(w, SALES, "đổi mã PIN thế nào MOC-RIENG-A", CUOC);
  assert.equal((await hoi(w, SALES2, "còn cách khác không", CUOC)).status, 200);
  assert.equal(goi.at(-1)!.body.input, "còn cách khác không");
  assert.ok(!JSON.stringify(goi.at(-1)!.body).includes("MOC-RIENG-A"));
});

test("N4: mã sai dạng ⇒ 400 lời thường, không gọi mẫu, không ghi dòng; thiếu / null ⇒ hỏi như câu đầu", async () => {
  const w = setup();
  const goi = openAiGia();
  for (const sai of ["abc", 5, "x".repeat(36), { a: 1 }]) {
    const r = await hoi(w, SALES, "đổi mã PIN thế nào", sai);
    assert.equal(r.status, 400, JSON.stringify(sai));
    assert.match(r.json.error.message, /cuộc trò chuyện/);
  }
  assert.equal(goi.length, 0);
  assert.equal(w.q("SELECT count(*) AS n FROM tl_luot_hoi")[0]!.n, 0);
  assert.equal((await hoi(w, SALES, "đổi mã PIN thế nào", null)).status, 200);
  assert.equal(goi.at(-1)!.body.input, "đổi mã PIN thế nào");
  assert.equal(w.q("SELECT cuoc_tro_chuyen AS c FROM tl_hoi_dap")[0]!.c, null);
});

test("Review Focus 3: lượt LỖI, lượt quá 2 giờ, lượt của cuộc trò chuyện KHÁC không vào phần nhớ", async () => {
  const w = setup();
  const goi = openAiGia();
  const cu = new Date(Date.now() - 3 * 3600_000).toISOString();
  const moi = new Date(Date.now() - 60_000).toISOString();
  chenLuotCu(w, "qua-gio", SALES, CUOC, cu, "ok", "CAU-QUA-2-GIO");
  chenLuotCu(w, "loi", SALES, CUOC, moi, "loi", "CAU-LOI");
  chenLuotCu(w, "khac", SALES, CUOC2, moi, "ok", "CAU-CUOC-KHAC");
  chenLuotCu(w, "dung", SALES, CUOC, moi, "ok", "CAU-DUNG");
  assert.equal((await hoi(w, SALES, "còn gì nữa không", CUOC)).status, 200);
  const s = JSON.stringify(goi[0]!.body.input);
  assert.ok(s.includes("CAU-DUNG"), s);
  for (const khong of ["CAU-QUA-2-GIO", "CAU-LOI", "CAU-CUOC-KHAC"]) assert.ok(!s.includes(khong), khong);
});

test("N5 route: câu nối tiếp không khớp đoạn nào vẫn tìm được đoạn nhờ câu hỏi lượt trước", async () => {
  const w = setup();
  const goi = openAiGia();
  await hoi(w, SALES, "đổi mã PIN thế nào", CUOC);
  await hoi(w, SALES, "zzqx wqpv", CUOC);
  assert.ok(!String(goi.at(-1)!.body.instructions).endsWith("(không tìm thấy đoạn hướng dẫn liên quan)"));
});

test("Phòng thủ (ADR-0073 Đ4, điểm OpenAI chưa kiểm): OpenAI trả 400 cho yêu cầu NHIỀU LƯỢT ⇒ gọi lại ĐÚNG MỘT lần không phần nhớ; 200; log chỉ tên sự kiện", async () => {
  const w = setup();
  openAiGia();
  assert.equal((await hoi(w, SALES, "đổi mã PIN thế nào", CUOC)).status, 200);
  const goi: GoiGia[] = [];
  globalThis.fetch = (async (_i: RequestInfo | URL, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>;
    goi.push({ body });
    if (Array.isArray(body.input)) return new Response(JSON.stringify({ error: { message: "input lạ" } }), { status: 400 });
    return new Response(JSON.stringify({ output: [{ type: "message", content: [{ type: "output_text", text: "Trả lời một lượt." }] }], usage: { input_tokens: 100, output_tokens: 10 } }), { status: 200 });
  }) as typeof fetch;
  const log: string[] = [];
  const errCu = console.error;
  console.error = (...a: unknown[]) => { log.push(a.map(String).join(" ")); };
  let r;
  try { r = await hoi(w, SALES, "còn cách khác không", CUOC); } finally { console.error = errCu; }
  assert.equal(r.status, 200, r.text);
  assert.equal(r.json.traLoi, "Trả lời một lượt.");
  assert.equal(goi.length, 2, "đúng một lần gọi lại");
  assert.ok(Array.isArray(goi[0]!.body.input));
  assert.equal(goi[1]!.body.input, "còn cách khác không");
  assert.ok(log.some((l) => l.includes("tro_ly_nho_bi_tu_choi")), JSON.stringify(log));
  assert.ok(!log.join("\n").includes("cách khác") && !log.join("\n").includes("PIN"), "log không nội dung");
  // hai lần gọi đều tính tiền: lượt ok gộp mức dùng của cả hai
  const l = w.q("SELECT ket_qua FROM tl_luot_hoi ORDER BY created_at DESC, rowid DESC LIMIT 1")[0]!;
  assert.equal(l.ket_qua, "ok");
});

test("HÀNG RÀO kiểm trần trước khi gọi (P2): đã dùng + chi phí TỐI ĐA của lượt > trần ⇒ 429 het_tran_thang, KHÔNG gọi mẫu, ghi dòng het_tran; mẫu rẻ cùng trần vẫn được", async () => {
  const w = setup();
  const goi = openAiGia();
  assert.equal((await w.call("POST", "/api/tro-ly/cai-dat", { as: SUP, body: { bat: true, tranThangUsd: 0.04, tranNgay: 30 } })).status, 200);
  assert.equal((await luuBoNao(w, { ...MINI, mau: "gpt-5", mucSuyNghi: "high", tokenRaToiDa: 4000 })).status, 200);
  const r = await hoi(w, SALES, "đổi mã PIN thế nào");
  assert.equal(r.status, 429, r.text);
  assert.equal(r.json.error.code, "tro_ly_het_tran_thang");
  assert.equal(goi.length, 0, "không được gọi mẫu");
  assert.deepEqual(w.q("SELECT ket_qua, chi_phi_micro_usd FROM tl_luot_hoi").map((x) => [x.ket_qua, x.chi_phi_micro_usd]), [["het_tran", 0]]);
  assert.equal((await luuBoNao(w, { ...MINI, mau: "gpt-5-nano", mucSuyNghi: "minimal", tokenRaToiDa: 1200 })).status, 200);
  assert.equal((await hoi(w, SALES, "đổi mã PIN thế nào")).status, 200, "nano: tối đa < 0,04 USD");
  assert.equal(goi.length, 1);
});

// ---- Ô thử (ADR-0073 Đ5: T1–T5) ----
const thu = (w: W, body: Record<string, unknown>, as = SUP) => w.call("POST", "/api/tro-ly/thu", { as, body });
const THU = { boNao: { ...MINI, mau: "gpt-5-nano", mucSuyNghi: "minimal", tokenRaToiDa: 1200 }, cauHoi: "khách 0905 123 456 hỏi đổi mã PIN thế nào", vai: "ACCOUNTING" };

test("T1 + T5: ô thử chạy đúng đường ống thật với cấu hình CHƯA lưu + vai giả định; trả câu trả lời, nguồn, token, tiền, mẫu; KHÔNG đổi cấu hình đang dùng", async () => {
  const w = setup();
  const goi = openAiGia({ usage: { input_tokens: 3000, input_tokens_details: { cached_tokens: 0 }, output_tokens: 400 } });
  const truoc = w.q("SELECT count(*) AS n FROM tl_bo_nao")[0]!.n;
  const r = await thu(w, { ...THU, boNao: { ...THU.boNao, mau: "gpt-5-mini", loiNhac: "Lời nhắc ĐANG SOẠN." } });
  assert.equal(r.status, 200, r.text);
  assert.equal(goi[0]!.body.model, "gpt-5-mini");
  assert.ok(String(goi[0]!.body.instructions).startsWith("Lời nhắc ĐANG SOẠN."));
  assert.match(String(goi[0]!.body.instructions), /Người hỏi thuộc nhóm vai: Kế toán\./);
  assert.equal(goi[0]!.body.input, "khách [đã che] hỏi đổi mã PIN thế nào", "che như hỏi thật");
  assert.deepEqual({ ...r.json, traLoi: "-", nguon: "-" }, { traLoi: "-", nguon: "-", tokenVao: 3000, tokenRa: 400, chiPhiMicroUsd: 1550, chiPhiUsd: 0.00155, mau: "gpt-5-mini" }); // 3000 × 0,25 + 400 × 2
  assert.equal(r.json.nguon.length, 1);
  assert.equal(w.q("SELECT count(*) AS n FROM tl_bo_nao")[0]!.n, truoc, "T5: thử không thêm bản");
  assert.equal((await boNao(w)).json.hienHanh.mau, "gpt-5-nano");
  assert.equal(w.q("SELECT count(*) AS n FROM audit_log WHERE action = 'tro_ly_settings_changed'")[0]!.n, 0, "thử không ghi nhật ký đổi cài đặt");
});

test("T2: cấu hình thử sai ⇒ 400 như khi lưu; vai lạ / câu rỗng ⇒ 400; không gọi mẫu, không ghi dòng", async () => {
  const w = setup();
  const goi = openAiGia();
  for (const sai of [{ boNao: { ...THU.boNao, mau: "gpt-4o" } }, { boNao: { ...THU.boNao, loiNhac: "mail lan@vidu.vn" } }, { boNao: null }, { vai: "KHACH" }, { vai: ["SALES"] }, { cauHoi: "  " }, { cauHoi: "a".repeat(2001) }]) {
    const r = await thu(w, { ...THU, ...sai });
    assert.equal(r.status, 400, JSON.stringify(sai).slice(0, 60));
    assert.ok(!/[a-z]+_[a-z]+/.test(r.json.error.message), r.json.error.message);
  }
  assert.equal(goi.length, 0);
  assert.equal(w.q("SELECT count(*) AS n FROM tl_luot_hoi")[0]!.n, 0);
});

test("T3: lượt thử ghi tl_luot_hoi (la_thu = 1, có mẫu), KHÔNG ghi tl_hoi_dap, KHÔNG tính trần lượt ngày; HÀNG RÀO lượt thử TÍNH vào trần tiền tháng", async () => {
  const w = setup();
  openAiGia();
  assert.equal((await w.call("POST", "/api/tro-ly/cai-dat", { as: SUP, body: { bat: true, tranThangUsd: 5, tranNgay: 1 } })).status, 200);
  for (let i = 0; i < 3; i++) assert.equal((await thu(w, THU)).status, 200);
  const rows = w.q("SELECT la_thu, mau, chi_phi_micro_usd FROM tl_luot_hoi");
  assert.ok(rows.length === 3 && rows.every((x) => x.la_thu === 1 && x.mau === "gpt-5-nano"), JSON.stringify(rows));
  assert.equal(w.q("SELECT count(*) AS n FROM tl_hoi_dap")[0]!.n, 0);
  assert.equal((await hoi(w, SUP, "đổi mã PIN thế nào")).status, 200, "trần ngày 1: ba lượt thử không bị đếm");
  const daDung = Number(w.q("SELECT SUM(chi_phi_micro_usd) AS s FROM tl_luot_hoi")[0]!.s);
  assert.equal((await w.call("POST", "/api/tro-ly/cai-dat", { as: SUP, body: { bat: true, tranThangUsd: daDung / 1_000_000, tranNgay: 30 } })).status, 200);
  const r = await hoi(w, SALES, "đổi mã PIN thế nào");
  assert.equal(r.status, 429, "tiền của lượt thử làm chạm trần tháng");
  assert.equal(r.json.error.code, "tro_ly_het_tran_thang");
  const t = await thu(w, THU);
  assert.equal(t.status, 429, "ô thử cũng bị trần tháng chặn");
  assert.equal(t.json.error.code, "tro_ly_het_tran_thang");
});

test("T4: thử chạy được khi trợ lý đang TẮT; thiếu khoá ⇒ 503 như hỏi thường", async () => {
  const w = setup();
  openAiGia();
  assert.equal((await w.call("POST", "/api/tro-ly/cai-dat", { as: SUP, body: { bat: false, tranThangUsd: 5, tranNgay: 30 } })).status, 200);
  assert.equal((await thu(w, THU)).status, 200);
  const w2 = setup(null);
  const r = await thu(w2, THU);
  assert.equal(r.status, 503);
  assert.equal(r.json.error.code, "tro_ly_chua_bat");
});

test("Review Focus 4: trợ lý TẮT + có khoá + trần tháng đã chạm ⇒ ô thử 429, không gọi mẫu (tắt không miễn trần tháng)", async () => {
  const w = setup();
  const goi = openAiGia();
  assert.equal((await w.call("POST", "/api/tro-ly/cai-dat", { as: SUP, body: { bat: false, tranThangUsd: 1, tranNgay: 30 } })).status, 200);
  const ngay = vnToday(new Date());
  w.sqlite.exec(`INSERT INTO tl_luot_hoi (id, staff_id, ngay_vn, chi_phi_micro_usd, ket_qua, created_at, updated_at) VALUES ('day', '${ADM}', '${ngay}', 1000000, 'ok', 'x', 'x')`);
  const r = await thu(w, THU);
  assert.equal(r.status, 429, r.text);
  assert.equal(goi.length, 0);
});

test("HÀNG RÀO kiểm trần trước khi gọi ở ô thử (P2, ruling F7): đã dùng + chi phí TỐI ĐA của cấu hình thử > trần ⇒ 429, KHÔNG gọi mẫu; cấu hình rẻ cùng trần vẫn chạy", async () => {
  const w = setup();
  const goi = openAiGia();
  assert.equal((await w.call("POST", "/api/tro-ly/cai-dat", { as: SUP, body: { bat: true, tranThangUsd: 0.04, tranNgay: 30 } })).status, 200);
  const r = await thu(w, { ...THU, boNao: { ...THU.boNao, mau: "gpt-5", mucSuyNghi: "high", tokenRaToiDa: 4000 } });
  assert.equal(r.status, 429, r.text);
  assert.equal(r.json.error.code, "tro_ly_het_tran_thang");
  assert.equal(goi.length, 0, "không được gọi mẫu");
  assert.equal((await thu(w, THU)).status, 200, "nano: tối đa < 0,04 USD");
  assert.equal(goi.length, 1);
});

test("Ô thử: OpenAI trả 400 (vd. mẫu không nhận mức suy nghĩ) ⇒ câu tiếng Việt dễ hiểu mã mau_tu_choi, KHÔNG 500; lượt ghi loi + la_thu = 1; log không nội dung", async () => {
  const w = setup();
  openAiGia({ status: 400 });
  const log: string[] = [];
  const errCu = console.error;
  console.error = (...a: unknown[]) => { log.push(a.map(String).join(" ")); };
  let r;
  try { r = await thu(w, THU); } finally { console.error = errCu; }
  assert.equal(r.status, 502, r.text);
  assert.equal(r.json.error.code, "mau_tu_choi");
  assert.match(r.json.error.message, /Mẫu AI đang chọn không nhận/);
  assert.deepEqual(w.q("SELECT ket_qua, la_thu, mau FROM tl_luot_hoi").map((x) => [x.ket_qua, x.la_thu, x.mau]), [["loi", 1, "gpt-5-nano"]]);
  assert.equal(w.q("SELECT count(*) AS n FROM tl_hoi_dap")[0]!.n, 0);
  assert.ok(!log.join("\n").includes("PIN") && !log.join("\n").includes("[đã che]"), "log không nội dung");
});

test("Ô thử: chỉ Toàn quyền (Quản trị, Bán hàng 403)", async () => {
  const w = setup();
  const goi = openAiGia();
  for (const as of [ADM, SALES]) assert.equal((await thu(w, THU, as)).status, 403);
  assert.equal(goi.length, 0);
  assert.equal(w.q("SELECT count(*) AS n FROM tl_luot_hoi")[0]!.n, 0);
});
