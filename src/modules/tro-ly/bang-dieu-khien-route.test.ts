// Route bảng điều khiển trợ lý (ADR-0069) chạy CẢ ứng dụng trên SQLite thật qua khung tests/audit/harness.mjs; OpenAI thay bằng `globalThis.fetch` giả.
// Hàng rào ghi ở docs/SO-HANG-RAO.md: (1) vai tắt bị chặn ở MÁY CHỦ (403, không gọi OpenAI, không ghi dòng); (2) lịch sử chỉ chứa câu ĐÃ CHE (đúng chuỗi đã
// gửi OpenAI); (3) khoá không lộ quá 4 ký tự ở MỌI phản hồi quản lý (không cửa sổ 5 ký tự nào của khoá). Ca "luật lõi đứng trước phần tuỳ chỉnh"
// (ca này đã BỎ theo ADR-0073 — chủ duyệt 1/10). Cùng: chỉ Toàn quyền (lặp MỌI route cổng office của module — không danh sách viết tay), nhật ký không nội dung.
import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";
import { PERMISSION_CODES } from "../../shared/permissions.ts";
import { LOI_NHAC_MAC_DINH } from "../../shared/tro-ly-bo-nao.ts";
import type { AppModule } from "../../shared/router.ts";
import * as esbuild from "esbuild";

// Danh sách route lấy từ CHÍNH module (đóng gói bằng esbuild như src/tai-xe-cong.test.ts) — không danh sách viết tay.
const built = await esbuild.build({ entryPoints: [new URL("./index.ts", import.meta.url).pathname], bundle: true, format: "esm", platform: "neutral", target: "es2022", write: false, logLevel: "silent" });
const { troLyModule } = (await import(`data:text/javascript;base64,${Buffer.from(built.outputFiles[0]!.text).toString("base64")}`)) as { troLyModule: AppModule };

const SALES = "11111111-1111-4111-8111-111111111111";
const ADM = "33333333-3333-4333-8333-333333333333";
const SUP = "77777777-7777-4777-8777-777777777777";
const DOITAC = "55555555-5555-4555-8555-555555555555";
const LAI = "66666666-6666-4666-8666-666666666666"; // Đối tác + Bán hàng
const KHOA = "sk-proj-THU-abcdefghijklmnopqrstuvwxyz0123456789-QZ7K";

interface GoiGia { body: Record<string, unknown> }
const fetchThat = globalThis.fetch;
afterEach(() => { globalThis.fetch = fetchThat; });
// Máy giả TẮT /v1/embeddings ⇒ mỗi câu lùi về từ khoá và máy chủ ghi đúng một dòng sự kiện này (ADR-0082 Đ4) — dự kiến, không phải lỗi; nuốt riêng dòng đó cho đầu ra sạch.
const errGoc = console.error;
console.error = (...a: unknown[]) => { if (a.length === 1 && a[0] === '{"event":"tro_ly_van_nghia_loi"}') return; errGoc(...a); };

type CheDo = { status?: number; loi?: Record<string, unknown>; nem?: boolean };
function openAiGia(cheDo: CheDo = {}): GoiGia[] {
  const goi: GoiGia[] = [];
  globalThis.fetch = (async (i: RequestInfo | URL, init?: RequestInit) => {
    // ADR-0082: cửa /v1/embeddings TẮT (503) ⇒ lùi từ khoá = luật cũ; `goi` chỉ ghi /v1/responses (đường mới canh ở van-nghia-route.test.ts).
    if (String(i instanceof Request ? i.url : i).endsWith("/v1/embeddings")) return new Response(JSON.stringify({ error: { message: "tắt" } }), { status: 503 });
    const body = JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>;
    goi.push({ body });
    if (cheDo.nem) throw new TypeError("mạng hỏng");
    if (cheDo.status && cheDo.status >= 400) {
      return new Response(JSON.stringify({ error: { message: `Incorrect API key provided: ${KHOA.slice(0, 12)}****${KHOA.slice(-4)}`, ...cheDo.loi } }), { status: cheDo.status });
    }
    // Tên đoạn ĐẦU TIÊN của khối "TÀI LIỆU:" CUỐI (máy chủ luôn nối khối này sau lời nhắc — ADR-0073 B4); lời nhắc có "[tên mục]" ở luật Nguồn không tính.
    const ins = String(body.instructions ?? "");
    const ten = /\[([^\]]+)\]/.exec(ins.slice(ins.lastIndexOf("TÀI LIỆU:")))?.[1] ?? "";
    return new Response(JSON.stringify({
      output: [{ type: "message", content: [{ type: "output_text", text: `Làm theo hướng dẫn.${ten ? `\nNguồn: [${ten}]` : ""}` }] }],
      usage: { input_tokens: 1000, output_tokens: 100 },
    }), { status: 200 });
  }) as typeof fetch;
  return goi;
}

function setup(khoa: string | null = KHOA) {
  const w = world();
  seedStaff(w.sqlite, { id: SALES, phone: "0900000001", name: "An", perms: ["SALES"] });
  seedStaff(w.sqlite, { id: ADM, phone: "0900000003", name: "Quản trị", perms: ["ADMIN"] });
  seedStaff(w.sqlite, { id: SUP, phone: "0900000007", name: "Chủ", perms: ["SUPER_ADMIN"] });
  seedStaff(w.sqlite, { id: DOITAC, phone: "0900000005", name: "Đối tác", perms: ["PARTNER"] });
  seedStaff(w.sqlite, { id: LAI, phone: "0900000006", name: "Lai", perms: ["PARTNER", "SALES"] });
  if (khoa !== null) (w.env as Record<string, unknown>).OPENAI_API_KEY = khoa;
  return w;
}
type W = ReturnType<typeof setup>;
const hoi = (w: W, as: string, cauHoi: string) => w.call("POST", "/api/tro-ly/hoi", { as, body: { cauHoi } });
const tatCa = (bat: boolean) => Object.fromEntries(PERMISSION_CODES.map((p) => [p, bat]));
const datVai = (w: W, vai: Record<string, boolean>) => w.call("POST", "/api/tro-ly/vai", { as: SUP, body: { vai } });
const LOI_DAN = { cauChao: "Xin chào, cần gì cứ hỏi.", giong: "ngắn, thân thiện", loiDanThem: "Gọi người dùng là bạn.", cauHoiMau: ["Đổi mã PIN thế nào?"] };

const QUAN_LY = troLyModule.routes.filter((r) => r.access === "office");

test("chỉ Toàn quyền: Quản trị, Bán hàng nhận 403 ở MỌI route cổng office của module (lặp troLyModule.routes); Đối tác bị cổng chặn", async () => {
  const w = setup();
  assert.ok(QUAN_LY.length >= 9, `chống bài rỗng: ${QUAN_LY.length} route quản lý`);
  for (const r of QUAN_LY) {
    const path = r.path.replace(":id", "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
    for (const as of [ADM, SALES, DOITAC]) {
      const res = await w.call(r.method, path, { as, body: r.method === "GET" ? undefined : {} });
      assert.equal(res.status, 403, `${r.method} ${r.path} as ${as}: ${res.text}`);
    }
  }
  assert.equal(w.q("SELECT count(*) AS n FROM audit_log WHERE action = 'tro_ly_settings_changed'")[0]!.n, 0);
});

test("HÀNG RÀO vai tắt: tắt Đối tác ⇒ tài khoản chỉ-Đối tác 403 lời thường, KHÔNG gọi OpenAI, KHÔNG ghi dòng; khung báo duocDung false; tài khoản lai (Đối tác + Bán hàng) vẫn hỏi được", async () => {
  const w = setup();
  const goi = openAiGia();
  let r = await w.call("GET", "/api/tro-ly/khung", { as: DOITAC });
  assert.equal(r.json.duocDung, true, "gieo 0054: bật cả 9");
  assert.equal((await datVai(w, { ...tatCa(true), PARTNER: false })).status, 200);
  r = await hoi(w, DOITAC, "đổi mã PIN thế nào");
  assert.equal(r.status, 403, r.text);
  assert.equal(r.json.error.code, "tro_ly_vai_tat");
  assert.match(r.json.error.message, /^Trợ lý Hỗ trợ đang tắt với vai của bạn/);
  assert.equal(goi.length, 0);
  assert.equal(w.q("SELECT count(*) AS n FROM tl_luot_hoi")[0]!.n, 0);
  assert.equal(w.q("SELECT count(*) AS n FROM tl_hoi_dap")[0]!.n, 0);
  assert.deepEqual((await w.call("GET", "/api/tro-ly/khung", { as: DOITAC })).json, { duocDung: false, cauChao: "", cauHoiMau: [] });
  assert.equal((await hoi(w, LAI, "đổi mã PIN thế nào")).status, 200, "ít nhất một quyền bật là được");
  assert.equal((await w.call("GET", "/api/tro-ly/khung", { as: LAI })).json.duocDung, true);
  assert.equal((await datVai(w, tatCa(false))).status, 200);
  assert.equal((await hoi(w, SALES, "đổi PIN")).status, 403);
  assert.equal((await hoi(w, SUP, "đổi PIN")).status, 403, "Toàn quyền cũng bị chặn khi vai của mình tắt");
});

test("vai tắt được chặn TRƯỚC trần: tắt vai + đã chạm trần ngày ⇒ vẫn 403 (không phải 429), không thêm dòng het_tran", async () => {
  const w = setup();
  openAiGia();
  assert.equal((await w.call("POST", "/api/tro-ly/cai-dat", { as: SUP, body: { bat: true, tranThangUsd: 5, tranNgay: 0 } })).status, 200);
  assert.equal((await datVai(w, { ...tatCa(true), SALES: false })).status, 200);
  const r = await hoi(w, SALES, "đổi PIN");
  assert.equal(r.status, 403);
  assert.equal(w.q("SELECT count(*) AS n FROM tl_luot_hoi")[0]!.n, 0);
});

test("POST /api/tro-ly/vai: thiếu mã / mã lạ ⇒ 400; chỉ ghi bản mới cho mã ĐỔI; một dòng nhật ký 'công tắc theo vai' không nội dung", async () => {
  const w = setup();
  assert.equal((await w.call("POST", "/api/tro-ly/vai", { as: SUP, body: { vai: { SALES: true } } })).status, 400);
  const truoc = w.q("SELECT count(*) AS n FROM tl_vai")[0]!.n;
  const r = await datVai(w, { ...tatCa(true), DRIVER: false, INTERN: false });
  assert.equal(r.status, 200, r.text);
  assert.equal(r.json.vai.DRIVER, false);
  assert.equal(r.json.vai.SALES, true);
  assert.equal(w.q("SELECT count(*) AS n FROM tl_vai")[0]!.n, truoc + 2);
  assert.equal((await datVai(w, { ...tatCa(true), DRIVER: false, INTERN: false })).status, 200);
  assert.equal(w.q("SELECT count(*) AS n FROM tl_vai")[0]!.n, truoc + 2, "không đổi gì ⇒ không thêm bản");
  const nk = w.q("SELECT staff_id, detail, target_type, target_id FROM audit_log WHERE action = 'tro_ly_settings_changed'");
  assert.deepEqual(nk.map((x) => ({ ...x })), [{ staff_id: SUP, detail: "công tắc theo vai", target_type: "system", target_id: "tro-ly" }]);
});

test("lời dặn: lưu bản mới (chỉ thêm) → khung hiện câu chào + câu hỏi mẫu mới; SĐT / email / số tiền ⇒ 400 không ghi; quay lại = lưu lại bản cũ", async () => {
  const w = setup();
  let r = await w.call("GET", "/api/tro-ly/loi-dan", { as: SUP });
  assert.equal(r.status, 200);
  const goc = r.json.hienHanh;
  assert.match(goc.cauChao, /^Chào bạn! Hỏi mình cách dùng app/);
  r = await w.call("POST", "/api/tro-ly/loi-dan", { as: SUP, body: LOI_DAN });
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(r.json.hienHanh, LOI_DAN);
  assert.equal(r.json.cacBan.length, 2);
  assert.equal(r.json.cacBan[0].nguoi !== undefined, true);
  assert.deepEqual((await w.call("GET", "/api/tro-ly/khung", { as: SALES })).json, { duocDung: true, cauChao: LOI_DAN.cauChao, cauHoiMau: LOI_DAN.cauHoiMau });
  for (const bad of [{ cauChao: "Gọi hotline 0905 123 456" }, { loiDanThem: "gửi mail lan@vidu.vn" }, { giong: "phí 200.000 đ" }, { cauHoiMau: ["khách 0905123456?"] }]) {
    const x = await w.call("POST", "/api/tro-ly/loi-dan", { as: SUP, body: { ...LOI_DAN, ...bad } });
    assert.equal(x.status, 400, JSON.stringify(bad));
    assert.match(x.json.error.message, /không được chứa/);
  }
  assert.equal(w.q("SELECT count(*) AS n FROM tl_loi_dan")[0]!.n, 2, "400 không ghi bản");
  const cu = r.json.cacBan[1];
  r = await w.call("POST", "/api/tro-ly/loi-dan", { as: SUP, body: { cauChao: cu.cauChao, giong: cu.giong, loiDanThem: cu.loiDanThem, cauHoiMau: cu.cauHoiMau } });
  assert.equal(r.status, 200);
  assert.deepEqual(r.json.hienHanh, goc, "quay lại bản cũ");
  assert.equal(r.json.cacBan.length, 3, "quay lại = thêm bản mới");
  const nk = w.q("SELECT detail FROM audit_log WHERE action = 'tro_ly_settings_changed'").map((x) => x.detail);
  assert.deepEqual(nk, ["lời dặn", "lời dặn"]);
  assert.ok(!JSON.stringify(w.q("SELECT * FROM audit_log")).includes("Xin chào, cần gì"), "nhật ký không chứa nội dung lời dặn");
});

test("B5: chưa có bản bộ não ⇒ lời nhắc gửi đi = bản mặc định + 'Giọng: …' / 'Lời dặn: …' của lời dặn hiện hành; khối TÀI LIỆU ở cuối; câu hỏi là input", async () => {
  const w = setup();
  const goi = openAiGia();
  assert.equal((await w.call("POST", "/api/tro-ly/loi-dan", { as: SUP, body: LOI_DAN })).status, 200);
  assert.equal((await hoi(w, SALES, "đổi mã PIN thế nào")).status, 200);
  const ins = String(goi[0]!.body.instructions);
  assert.ok(ins.startsWith(`${LOI_NHAC_MAC_DINH}\n\nGiọng: ngắn, thân thiện\nLời dặn: Gọi người dùng là bạn.\n\nNgười hỏi thuộc nhóm vai: Bán hàng.`), ins.slice(0, 80));
  assert.ok(ins.lastIndexOf("TÀI LIỆU:") > ins.indexOf("Lời dặn: Gọi người dùng là bạn."));
  assert.equal(ins.split("TÀI LIỆU:").length, 2, "đúng MỘT khối tài liệu");
  assert.equal(goi[0]!.body.input, "đổi mã PIN thế nào");
});

test("ngữ cảnh: thêm đoạn → vào kho tìm đoạn (nguồn 'Ngữ cảnh bổ sung › …'); tắt (= bản mới) → không còn; chữ vi phạm ⇒ 400; sửa id lạ ⇒ 404", async () => {
  const w = setup();
  const goi = openAiGia();
  const doan = { tieuDe: "Quy trình khách huỷ sát giờ", noiDung: "Khi khách huỷ sát giờ, báo điều hành ngay và ghi lý do vào đơn.", bat: true };
  let r = await w.call("POST", "/api/tro-ly/ngu-canh", { as: SUP, body: doan });
  assert.equal(r.status, 200, r.text);
  const id = r.json.doan[0].doanId;
  r = await hoi(w, SALES, "khách huỷ sát giờ thì làm sao");
  assert.equal(r.status, 200);
  assert.ok(String(goi.at(-1)!.body.instructions).includes("[Ngữ cảnh bổ sung › Quy trình khách huỷ sát giờ]"));
  assert.deepEqual(r.json.nguon, ["Ngữ cảnh bổ sung › Quy trình khách huỷ sát giờ"]);
  r = await w.call("PUT", `/api/tro-ly/ngu-canh/${id}`, { as: SUP, body: { ...doan, bat: false } });
  assert.equal(r.status, 200);
  assert.equal(r.json.doan.length, 1);
  assert.equal(r.json.doan[0].bat, false);
  await hoi(w, SALES, "khách huỷ sát giờ thì làm sao");
  assert.ok(!String(goi.at(-1)?.body.instructions ?? "").includes("Ngữ cảnh bổ sung"), "đoạn tắt không vào lời nhắc");
  assert.equal(w.q("SELECT count(*) AS n FROM tl_ngu_canh")[0]!.n, 2, "tắt = thêm bản mới");
  assert.equal((await w.call("POST", "/api/tro-ly/ngu-canh", { as: SUP, body: { ...doan, noiDung: "Hotline 0905 123 456" } })).status, 400);
  assert.equal((await w.call("PUT", "/api/tro-ly/ngu-canh/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", { as: SUP, body: doan })).status, 404);
  assert.equal((await w.call("PUT", "/api/tro-ly/ngu-canh/khong-phai-id", { as: SUP, body: doan })).status, 404);
});

test("HÀNG RÀO lịch sử chỉ chứa câu đã che: mỗi câu (ok, chưa có, lỗi) ghi MỘT dòng tl_hoi_dap cùng lô với tl_luot_hoi; câu hỏi = đúng chuỗi đã gửi OpenAI, không SĐT / email gốc", async () => {
  const w = setup();
  const goi = openAiGia();
  const r = await hoi(w, SALES, "khách 0905 123 456, mail lan@vidu.vn, đổi mã PIN thế nào");
  assert.equal(r.status, 200);
  const h = w.q("SELECT h.*, l.chi_phi_micro_usd AS cp_luot FROM tl_hoi_dap h JOIN tl_luot_hoi l ON l.id = h.luot_id");
  assert.equal(h.length, 1);
  assert.equal(h[0]!.cau_hoi, goi[0]!.body.input, "lịch sử lưu ĐÚNG chuỗi đã che gửi đi");
  assert.ok(String(h[0]!.cau_hoi).includes("[đã che]"));
  const dump = JSON.stringify(w.q("SELECT * FROM tl_hoi_dap"));
  for (const lo of ["0905", "123 456", "lan@vidu.vn", "vidu"]) assert.ok(!dump.includes(lo), `lịch sử lộ ${lo}`);
  assert.equal(h[0]!.chi_phi_micro_usd, h[0]!.cp_luot);
  assert.deepEqual(JSON.parse(String(h[0]!.vai)), ["SALES"]);
  assert.equal(h[0]!.tra_loi, "Làm theo hướng dẫn.");
  assert.equal((await hoi(w, SALES, "zzqx wqpv")).status, 200, "M1: không khớp vẫn gọi mẫu");
  openAiGia({ status: 500 });
  assert.equal((await hoi(w, SALES, "đổi mã PIN thế nào")).status, 502);
  assert.deepEqual(w.q("SELECT ket_qua FROM tl_hoi_dap ORDER BY created_at, rowid").map((x) => x.ket_qua), ["ok", "ok", "loi"]);
});

test("lịch sử: chỉ Toàn quyền; lọc người / vai / ngày / tìm chữ; vai hiện nhãn tiếng Việt; phân trang 30", async () => {
  const w = setup();
  openAiGia();
  await hoi(w, SALES, "đổi mã PIN thế nào");
  await hoi(w, LAI, "lập đơn mới ra sao");
  let r = await w.call("GET", "/api/tro-ly/lich-su", { as: SUP });
  assert.equal(r.status, 200, r.text);
  assert.equal(r.json.dong.length, 2);
  assert.equal(r.json.coThem, false);
  assert.deepEqual([...r.json.dong[0].vai].sort(), ["Bán hàng", "Đối tác"]);
  assert.equal(r.json.dong[0].ketQua, "Đã trả lời");
  assert.equal(r.json.nguoi.length, 2);
  r = await w.call("GET", `/api/tro-ly/lich-su?nguoi=${SALES}`, { as: SUP });
  assert.deepEqual(r.json.dong.map((d: { cauHoi: string }) => d.cauHoi), ["đổi mã PIN thế nào"]);
  r = await w.call("GET", "/api/tro-ly/lich-su?vai=PARTNER", { as: SUP });
  assert.deepEqual(r.json.dong.map((d: { cauHoi: string }) => d.cauHoi), ["lập đơn mới ra sao"]);
  r = await w.call("GET", "/api/tro-ly/lich-su?q=PIN", { as: SUP });
  assert.equal(r.json.dong.length, 1);
  r = await w.call("GET", "/api/tro-ly/lich-su?q=%25", { as: SUP });
  assert.equal(r.json.dong.length, 0, "ký tự % được thoát, không khớp mọi dòng");
  r = await w.call("GET", "/api/tro-ly/lich-su?tu=2000-01-01&den=2000-01-02", { as: SUP });
  assert.equal(r.json.dong.length, 0);
  for (const bad of ["tu=30/09/2026", "vai=LA", "nguoi=khong-id"]) assert.equal((await w.call("GET", `/api/tro-ly/lich-su?${bad}`, { as: SUP })).status, 400, bad);
  for (let i = 0; i < 30; i++) assert.equal((await hoi(w, SUP, "đổi mã PIN thế nào")).status, 200); // trần ngày 30 câu / người
  r = await w.call("GET", "/api/tro-ly/lich-su", { as: SUP });
  assert.equal(r.json.dong.length, 30);
  assert.equal(r.json.coThem, true);
  assert.equal((await w.call("GET", "/api/tro-ly/lich-su?trang=2", { as: SUP })).json.dong.length, 2);
});

test("cài đặt: số câu hôm nay + chi phí theo vai (tài khoản lai tính cho mỗi quyền)", async () => {
  const w = setup();
  openAiGia();
  await hoi(w, SALES, "đổi mã PIN thế nào");
  await hoi(w, LAI, "đổi mã PIN thế nào");
  const r = await w.call("GET", "/api/tro-ly/cai-dat", { as: SUP });
  assert.equal(r.json.soCauHomNay, 2);
  const tv = Object.fromEntries(r.json.theoVai.map((x: { vai: string; soCau: number }) => [x.vai, x.soCau]));
  assert.deepEqual(tv, { SALES: 2, PARTNER: 1 });
});

test("HÀNG RÀO khoá: khoaCuoi = 4 ký tự cuối; KHÔNG cửa sổ 5 ký tự liền nào của khoá nằm trong MỌI phản hồi của route quản lý (kể cả Thử key sai key)", async () => {
  const w = setup();
  const r = await w.call("GET", "/api/tro-ly/cai-dat", { as: SUP });
  assert.equal(r.json.coKhoa, true);
  assert.equal(r.json.khoaCuoi, "QZ7K");
  const texts: string[] = [];
  for (const cheDo of [{}, { status: 401, loi: { code: "invalid_api_key" } }, { status: 429, loi: { code: "insufficient_quota" } }] as CheDo[]) {
    openAiGia(cheDo);
    for (const rt of QUAN_LY) {
      const path = rt.path.replace(":id", "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
      const body = rt.path.endsWith("/vai") ? { vai: tatCa(true) } : rt.path.endsWith("/cai-dat") ? { bat: true, tranThangUsd: 5, tranNgay: 30 }
        : rt.path.includes("/loi-dan") ? LOI_DAN : rt.path.includes("/ngu-canh") ? { tieuDe: "Giờ làm", noiDung: "Tám giờ sáng", bat: true } : {};
      texts.push((await w.call(rt.method, path, { as: SUP, body: rt.method === "GET" ? undefined : body })).text);
    }
  }
  const tatCaChu = texts.join("\n");
  for (let i = 0; i + 5 <= KHOA.length; i++) assert.ok(!tatCaChu.includes(KHOA.slice(i, i + 5)), `lộ "${KHOA.slice(i, i + 5)}" của khoá`);
});

test("Thử key: được / sai key (401) / hết tiền (429 insufficient_quota) / giới hạn / lỗi mạng — lời thường; mỗi lần gọi ghi MỘT dòng tl_luot_hoi (chi phí thật), không dòng lịch sử; câu cố định không dữ liệu công ty", async () => {
  const w = setup();
  const thu = async () => (await w.call("POST", "/api/tro-ly/thu-khoa", { as: SUP, body: {} })).json;
  let goi = openAiGia();
  assert.equal((await thu()).ma, "duoc");
  assert.equal(goi[0]!.body.input, "Thử kết nối.");
  assert.ok(!JSON.stringify(goi[0]!.body).includes("TÀI LIỆU"));
  goi = openAiGia({ status: 401, loi: { code: "invalid_api_key" } });
  const sai = await thu();
  assert.equal(sai.ma, "sai_khoa");
  assert.match(sai.cau, /^Sai key/);
  openAiGia({ status: 429, loi: { code: "insufficient_quota" } });
  assert.equal((await thu()).ma, "het_tien");
  openAiGia({ status: 429, loi: { code: "rate_limit_exceeded" } });
  assert.equal((await thu()).ma, "gioi_han");
  openAiGia({ nem: true });
  assert.equal((await thu()).ma, "loi_mang");
  const rows = w.q("SELECT staff_id, ket_qua, chi_phi_micro_usd FROM tl_luot_hoi ORDER BY created_at, rowid");
  assert.deepEqual(rows.map((x) => [x.staff_id, x.ket_qua]), [[SUP, "ok"], [SUP, "loi"], [SUP, "loi"], [SUP, "loi"], [SUP, "loi"]]);
  assert.equal(rows[0]!.chi_phi_micro_usd, 90, "1000 × 0,05 + 100 × 0,40");
  assert.ok(w.q("SELECT la_thu, mau FROM tl_luot_hoi").every((x) => x.la_thu === 1 && x.mau === "gpt-5-nano"), "B10: lượt Thử key là lượt thử, mẫu đang chọn (mặc định nano)");
  assert.equal(w.q("SELECT count(*) AS n FROM tl_hoi_dap")[0]!.n, 0);
});

test("Thử key khi chưa đặt khoá: 'chưa đặt', không gọi mạng, không ghi dòng; cai-dat báo coKhoa false, khoaCuoi null", async () => {
  const w = setup(null);
  const goi = openAiGia();
  const r = await w.call("POST", "/api/tro-ly/thu-khoa", { as: SUP, body: {} });
  assert.equal(r.json.ma, "chua_dat");
  assert.equal(goi.length, 0);
  assert.equal(w.q("SELECT count(*) AS n FROM tl_luot_hoi")[0]!.n, 0);
  const c = (await w.call("GET", "/api/tro-ly/cai-dat", { as: SUP })).json;
  assert.equal(c.coKhoa, false);
  assert.equal(c.khoaCuoi, null);
});
