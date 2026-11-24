// «GIÁ MÙA VỤ» (ADR-0229) qua ứng dụng THẬT trên SQLite — route đặt / xem / duyệt / kết thúc / trần của `catalog`: quyền (tiêu chí 5), chồng ngày (6), bảng chỉ thêm (7),
// nhật ký không thông tin cá nhân (9). Phần giá trên đơn: src/modules/orders/gia-mua-vu-don-route.test.ts.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { A, ACC, ADM, INTERN, PARTNER, SUP, inDays, setup } from "../../../tests/audit/xac-nhan-khung.mjs";
import { seedStaff } from "../../../tests/audit/harness.mjs";

type W = any; // eslint-disable-line @typescript-eslint/no-explicit-any
const QL = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"; // Quản lý bán hàng
const HR = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"; // Nhân sự
const URL_Q = "/api/catalog/gia-mua-vu";
const TU = inDays(5);
const DEN = inDays(9);

function the(): W {
  const w = setup();
  seedStaff(w.sqlite, { id: QL, phone: "0900000010", name: "Quản lý", perms: ["SALES", "SALES_MANAGER"] });
  seedStaff(w.sqlite, { id: HR, phone: "0900000011", name: "Nhân sự", perms: ["HR"] });
  return w;
}
const than = (x: Record<string, unknown> = {}) => ({ phamVi: "SERVICE", ma: "ZA1", tuNgay: TU, denNgay: DEN, phanTram: 10, soTien: 20000, ...x });
const dat = (w: W, body: Record<string, unknown>, as: string) => w.call("POST", URL_Q, { as, body });
async function datOk(w: W, body: Record<string, unknown>, as = QL): Promise<string> {
  const r = await dat(w, body, as);
  assert.equal(r.status, 201, r.text);
  return r.json.quyTac.id as string;
}
const duyet = (w: W, id: string, as: string) => w.call("POST", `${URL_Q}/${id}/duyet`, { as, body: {} });
const ketThuc = (w: W, id: string, as: string) => w.call("POST", `${URL_Q}/${id}/ket-thuc`, { as, body: {} });
const nk = (w: W, action: string) => w.q("SELECT detail FROM audit_log WHERE action = ?", action) as { detail: string }[];

test("tiêu chí 5: Bán hàng, Thực tập, Đối tác, Nhân sự ⇒ 403 ở mọi route; Quản lý bán hàng, Quản trị, Kế toán, Toàn quyền đặt được", async () => {
  const w = the();
  for (const as of [A, INTERN, PARTNER, HR]) {
    const r = await dat(w, than(), as);
    assert.ok(r.status === 403, `${as}: ${r.status} ${r.text}`);
    assert.ok((await w.call("GET", URL_Q, { as })).status === 403, as);
  }
  let n = 0;
  for (const as of [QL, ADM, ACC, SUP]) await datOk(w, than({ ma: n++ % 2 ? "ZB1" : "ZA1", tuNgay: inDays(10 * n), denNgay: inDays(10 * n + 2) }), as);
  const id = await datOk(w, than({ tuNgay: inDays(60), denNgay: inDays(61) }), QL);
  for (const as of [A, INTERN, PARTNER, HR]) {
    assert.equal((await duyet(w, id, as)).status, 403, as);
    assert.equal((await ketThuc(w, id, as)).status, 403, as);
  }
});

test("tiêu chí 5 (10c): người đặt tự duyệt ⇒ 409, Toàn quyền tự duyệt cũng không; người khác duyệt ⇒ được; duyệt lần hai ⇒ 409; GET trả cuaToi để ẩn nút", async () => {
  const w = the();
  const id = await datOk(w, than(), QL);
  const tu = await duyet(w, id, QL);
  assert.equal(tu.status, 409, tu.text);
  assert.equal(tu.json.error.code, "seasonal_self_approve");
  const idS = await datOk(w, than({ ma: "ZB1" }), SUP);
  assert.equal((await duyet(w, idS, SUP)).json.error.code, "seasonal_self_approve");
  const ok = await duyet(w, id, ACC);
  assert.equal(ok.status, 200, ok.text);
  assert.equal(ok.json.quyTac.daDuyet, true);
  assert.equal((await duyet(w, id, ADM)).status, 409);
  const ds = (await w.call("GET", URL_Q, { as: QL })).json;
  assert.equal(ds.tranPhanTram, 30);
  assert.equal(ds.quyTac.find((q: { id: string }) => q.id === id).cuaToi, true);
  assert.equal((await w.call("GET", URL_Q, { as: ACC })).json.quyTac.find((q: { id: string }) => q.id === id).cuaToi, false);
});

test("Đ1: kiểm lúc nhập theo thứ tự; vượt trần ⇒ 400; trần chỉ Toàn quyền đặt; hạ trần thì lần duyệt sau bị chặn", async () => {
  const w = the();
  for (const [x, cau] of [
    [{ phanTram: -5 }, /Phần trăm/], [{ soTien: 1500.5 }, /Số tiền/], [{ phanTram: 0, soTien: 0 }, /ít nhất một/], [{ phanTram: 31 }, /tối đa 30 %/],
    [{ tuNgay: DEN, denNgay: TU }, /ngày cuối không được trước/], [{ tuNgay: inDays(-5), denNgay: inDays(-1) }, /đã qua/], [{ ma: "KHONG_CO" }, /không có trong danh mục/],
  ] as const) {
    const r = await dat(w, than(x), QL);
    assert.equal(r.status, 400, r.text);
    assert.match(r.json.error.message, cau);
  }
  const id = await datOk(w, than({ phanTram: 30 }), QL);
  for (const as of [ADM, ACC, QL]) assert.equal((await w.call("POST", `${URL_Q}/tran`, { as, body: { tranPhanTram: 20 } })).status, 403, as);
  assert.equal((await w.call("POST", `${URL_Q}/tran`, { as: SUP, body: { tranPhanTram: 20 } })).status, 200);
  const r = await duyet(w, id, ACC);
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.code, "seasonal_over_cap");
  assert.equal(nk(w, "catalog_seasonal_cap_set").length, 1);
});

test("tiêu chí 6: hai quy tắc cùng nhóm chồng một ngày ⇒ 409 (kể cả bản chờ duyệt); dịch vụ chồng nhóm ⇒ được; kết thúc bản chờ duyệt thì đặt lại được", async () => {
  const w = the();
  const g = (await w.call("POST", "/api/catalog/groups", { as: ADM, body: { name: "Tour đảo xa" } })).json.group.code as string;
  const id = await datOk(w, than({ phamVi: "GROUP", ma: g }), QL);
  const r = await dat(w, than({ phamVi: "GROUP", ma: g, tuNgay: DEN, denNgay: inDays(12) }), ADM);
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.code, "seasonal_overlap");
  await datOk(w, than({ phamVi: "SERVICE", ma: "ZA1" }), ADM);
  assert.equal((await ketThuc(w, id, ACC)).status, 200);
  await datOk(w, than({ phamVi: "GROUP", ma: g, tuNgay: DEN, denNgay: inDays(12) }), ADM);
});

test("tiêu chí 7 + 9: quy tắc đã kết thúc không duyệt được, kết thúc lần hai ⇒ 409 với một dòng nhật ký; nhật ký nêu mã, khoảng, mức tăng, không SĐT", async () => {
  const w = the();
  const id = await datOk(w, than(), QL);
  assert.equal((await ketThuc(w, id, QL)).status, 200);
  assert.equal((await ketThuc(w, id, ADM)).status, 409);
  assert.equal((await duyet(w, id, ACC)).status, 409);
  assert.equal(nk(w, "catalog_seasonal_ended").length, 1);
  const d = nk(w, "catalog_seasonal_added")[0]!.detail;
  assert.match(d, /Dịch vụ ZA1/);
  assert.match(d, /\+10 % \+20\.000 đ/);
  assert.doesNotMatch(d, /09\d{8}/);
  assert.throws(() => w.sqlite.exec(`DELETE FROM ctl_seasonal_price WHERE id = '${id}'`), /ctl_append_only/);
  assert.equal((await w.call("GET", URL_Q, { as: QL })).json.quyTac.length, 0, "quy tắc đã kết thúc không còn trong danh sách");
});

test("chủ 23/11 (mở màn hẹp cho người giữ ô giá mùa vụ): Kế toán đọc được danh sách màn hẹp (không giá) và thấy mục Dịch vụ & giá; Bán hàng thường, Đối tác vẫn không; Kế toán vẫn không Ngừng bán", async () => {
  const w = the();
  assert.equal((await w.call("GET", "/api/catalog/quan-ly-ban", { as: ACC })).status, 200);
  for (const as of [A, PARTNER]) assert.equal((await w.call("GET", "/api/catalog/quan-ly-ban", { as })).status, 403, as);
  assert.equal((await w.call("PUT", "/api/catalog/ZA1/ngung-ban", { as: ACC, body: { ngungBan: true } })).status, 403, "ô Ngừng bán vẫn riêng");
  assert.equal((await w.call("GET", "/api/catalog/ngung-ban-ngay", { as: ACC })).status, 403);
  const { TRANG } = await import("../../shared/muc-giao-dien.ts");
  const nguoi = (permissions: string[]) => ({ id: "x", permissions }) as never;
  assert.equal(TRANG.dichVu.hien(nguoi(["ACCOUNTING"])), true);
  assert.equal(TRANG.dichVu.hien(nguoi(["SALES"])), false);
});
