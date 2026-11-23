// ADR-0224 (đề xuất, Việc 2 kế hoạch 2026-11-21): đối tác dùng được Trả sau chỉ lập được đơn Trả sau; Trả sau khoá / vượt mức / không đọc được thì vẫn lưu được Thanh toán ngay;
// văn phòng không đổi. Phần 1: route thật trên khung thử (tests/audit/harness.mjs) — lập mới và lưu nháp. Phần 2: luật thuần của màn Tạo đơn (`hinhThucDuocNhan`, chưa có ⇒ bài đỏ
// bằng câu khẳng định, không vỡ import). Tên người, SĐT là GIẢ.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { seedStaff } from "../tests/audit/harness.mjs";
import { A, SUP, inDays, setup, svc } from "../tests/audit/xac-nhan-khung.mjs";
import { datQuaHan } from "../tests/audit/tra-sau-moc.mjs";

const DT = "88888888-8888-4888-8888-888888888801"; // Đối tác có hồ sơ mang vai được hưởng ⇒ bên đặt = chính hồ sơ này
const BEN = `pty-${DT}`;
const T_ZB1 = 600_000; // 2 người lớn × 300.000
const MA_BAT_BUOC = "tra_sau_bat_buoc_doi_tac";

type W = ReturnType<typeof setup>;
function dung(tuyChon: Record<string, unknown> = {}): W {
  const w = setup(tuyChon);
  seedStaff(w.sqlite, { id: DT, phone: "0900000021", name: "Đối Tác Hưởng", perms: ["PARTNER"] });
  return w;
}
const hanMuc = (w: W, so: number) => w.call("POST", "/api/tra-sau/han-muc", { as: SUP, body: { partyId: BEN, hanMuc: so, gioTra: 168, gioAnHan: 0, lyDo: "thử" } });
const than = (extra: Record<string, unknown> = {}) => ({ customerName: "Khách Thử", customerPhone: "0912345678", services: [svc("ZB1", inDays(3))], ...extra });
/** Lập đơn nháp. `term` vắng ⇒ thân không có khoá hình thức. Văn phòng thì kèm bên đặt BEN («Qua đối tác»). */
const lap = (w: W, as: string, term?: "PREPAID" | "CREDIT") =>
  w.call("POST", "/api/orders", { as, body: than({ ...(term ? { paymentTerm: term } : {}), ...(as === DT ? {} : { bookerPartyId: BEN }) }) });
const tuChoiBatBuoc = (r: { status: number; text: string; json: { error?: { code?: string; message?: string } } }) => {
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error?.code, MA_BAT_BUOC, r.text);
  const msg = r.json.error?.message ?? "";
  assert.match(msg, /[ạảãáàâầấậẩẫăằắặẳẵđêềếệểễôồốộổỗơờớợởỡưừứựửữ]/i, "câu tiếng Việt có dấu");
  assert.doesNotMatch(msg, /₫|\d{1,3}(\.\d{3})+/, "câu cho đối tác không có số tiền (ADR-0198 Đ1)");
};

test("ADR-0224 Đ2.1: đối tác dùng được Trả sau — lập «Thanh toán ngay» hoặc bỏ trống hình thức ⇒ 409 không số; lập «Trả sau» ⇒ 201 Trả sau", async () => {
  const w = dung();
  assert.equal((await hanMuc(w, 10_000_000)).status, 201);
  tuChoiBatBuoc(await lap(w, DT, "PREPAID"));
  tuChoiBatBuoc(await lap(w, DT));
  const ts = await lap(w, DT, "CREDIT");
  assert.equal(ts.status, 201, ts.text);
  assert.equal(ts.json.order.paymentTerm, "CREDIT");
});

test("ADR-0224 Đ2.1: lưu nháp — đối tác đổi nháp Trả sau sang «Thanh toán ngay» ⇒ 409; nháp cũ đang Thanh toán ngay lưu lại không khoá hình thức ⇒ 409", async () => {
  const w = dung();
  // Nháp Thanh toán ngay lập lúc CHƯA có hạn mức (hợp lệ khi đó), rồi mới được cấp hạn mức.
  const cu = await lap(w, DT, "PREPAID");
  assert.equal(cu.status, 201, cu.text);
  assert.equal((await hanMuc(w, 10_000_000)).status, 201);
  const ts = await lap(w, DT, "CREDIT");
  assert.equal(ts.status, 201, ts.text);
  const sua = (o: { id: string; updatedAt: string }, extra: Record<string, unknown>) =>
    w.call("PUT", `/api/orders/${o.id}`, { as: DT, body: than({ expectedUpdatedAt: o.updatedAt, ...extra }) });
  tuChoiBatBuoc(await sua(ts.json.order, { paymentTerm: "PREPAID" }));
  tuChoiBatBuoc(await sua(cu.json.order, {}));
  assert.equal((await sua(cu.json.order, { paymentTerm: "CREDIT" })).status, 200, "chuyển nháp cũ sang Trả sau thì lưu được");
});

test("ADR-0224 Đ2.1: đối tác vượt mức, không có hạn mức ⇒ «Thanh toán ngay» vẫn lập được", async () => {
  const w = dung();
  assert.equal((await lap(w, DT, "PREPAID")).status, 201, "không có hạn mức");
  assert.equal((await hanMuc(w, T_ZB1 - 1)).status, 201);
  const r = await lap(w, DT, "PREPAID");
  assert.equal(r.status, 201, `vượt mức: ${r.text}`);
  assert.equal(r.json.order.paymentTerm, "PREPAID");
});

test("ADR-0224 Đ2.1: đối tác có đơn quá hạn ⇒ «Thanh toán ngay» vẫn lập được", async () => {
  const w = dung();
  assert.equal((await hanMuc(w, 10_000_000)).status, 201);
  const cu = await lap(w, A, "CREDIT");
  assert.equal(cu.status, 201, cu.text);
  assert.equal((await w.call("POST", `/api/orders/${cu.json.order.id}/status`, { as: A, body: { status: "confirmed" } })).status, 200);
  datQuaHan(w.sqlite, cu.json.order.id);
  const r = await lap(w, DT, "PREPAID");
  assert.equal(r.status, 201, r.text);
});

test("ADR-0224 Đ2.2: gốc lắp ráp không tiêm cổng hạn mức (không đọc được) ⇒ đối tác vẫn lập được «Thanh toán ngay»", async () => {
  const w = dung({ khongTiemTraSau: true });
  assert.equal((await lap(w, DT, "PREPAID")).status, 201);
});

test("ADR-0224 Đ1.3: văn phòng lập «Qua đối tác» khi bên đặt dùng được Trả sau ⇒ «Thanh toán ngay» vẫn 201", async () => {
  const w = dung();
  assert.equal((await hanMuc(w, 10_000_000)).status, 201);
  const r = await lap(w, A, "PREPAID");
  assert.equal(r.status, 201, r.text);
  assert.equal(r.json.order.paymentTerm, "PREPAID");
});

// ---- Luật thuần của màn Tạo đơn (ADR-0224 Đ2.4, Đ3) --------------------------------------------------------------------------------------------------------------------
type TrangThai = "dung_duoc" | "qua_han" | "vuot" | "khong_co" | "chua_biet";
type Luat = (i: { laDoiTac: boolean; traSau: TrangThai }) => { chonDuoc: readonly ("PREPAID" | "CREDIT")[]; lyDo: string | null };
async function luat(): Promise<Luat> {
  const m = (await import("./shared/han-muc-tra-sau-hien-thi.ts")) as { hinhThucDuocNhan?: Luat };
  assert.equal(typeof m.hinhThucDuocNhan, "function", "chưa có luật thuần `hinhThucDuocNhan` ở src/shared/han-muc-tra-sau-hien-thi.ts (ADR-0224 Đ2.4)");
  return m.hinhThucDuocNhan!;
}

test("ADR-0224 Đ3: đối tác dùng được Trả sau ⇒ chỉ «Trả sau», không câu lý do", async () => {
  assert.deepEqual((await luat())({ laDoiTac: true, traSau: "dung_duoc" }), { chonDuoc: ["CREDIT"], lyDo: null });
});

test("ADR-0224 Đ3: đối tác có đơn quá hạn ⇒ chọn được «Thanh toán ngay», kèm câu lý do không số", async () => {
  const r = (await luat())({ laDoiTac: true, traSau: "qua_han" });
  assert.deepEqual([...r.chonDuoc], ["PREPAID"]);
  assert.ok(r.lyDo && !/₫|\d/.test(r.lyDo), "có câu lý do, không số");
});

test("ADR-0224 Đ3: đối tác vừa bị máy chủ báo vượt mức ⇒ hiện lại «Thanh toán ngay» kèm câu lý do", async () => {
  const r = (await luat())({ laDoiTac: true, traSau: "vuot" });
  assert.ok(r.chonDuoc.includes("PREPAID"));
  assert.ok(r.lyDo && !/₫|\d/.test(r.lyDo));
});

test("ADR-0224 Đ1.3: văn phòng có hạn mức dùng được ⇒ vẫn hai lựa chọn, như hôm nay", async () => {
  const r = (await luat())({ laDoiTac: false, traSau: "dung_duoc" });
  assert.deepEqual([...r.chonDuoc].sort(), ["CREDIT", "PREPAID"]);
  assert.equal(r.lyDo, null);
});
