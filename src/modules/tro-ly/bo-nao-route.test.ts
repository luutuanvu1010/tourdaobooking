// Route bộ não của trợ lý (ADR-0073 Đ1, Đ2, Đ5, Đ7) chạy CẢ ứng dụng trên SQLite thật qua tests/audit/harness.mjs; OpenAI thay bằng `globalThis.fetch` giả.
// Phủ: B1–B8, B10, T6 (Task 6); N1–N5 (Task 7); P2 (Task 8); T1–T5 (Task 9). Review Focus 1, 3, 4.
import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";
import { LOI_NHAC_MAC_DINH } from "../../shared/tro-ly-bo-nao.ts";

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
