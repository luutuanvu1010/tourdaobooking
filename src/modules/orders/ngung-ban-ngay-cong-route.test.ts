// «NGỪNG BÁN THEO NGÀY» (ADR-0220) qua ứng dụng THẬT trên SQLite: route đặt / xem / kết thúc của `catalog`, cổng 409 `sales_paused_date` ở các cửa ghi đơn của `orders`,
// quyền (ô `catalog.hidden.write`), bảng chỉ thêm (trigger), nhật ký. Tiêu chí nghiệm thu 1–8 của ADR. Cửa Gửi đơn / Còn vé đi qua `kiemCongXacNhan` (cùng dòng cổng với `/status`
// — bài lưới src/ngung-ban-ngay-moi-cua.test.ts canh lời gọi).
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { A, ACC, ADM, B, INTERN, PARTNER, SUP, datCo, inDays, setup, svc } from "../../../tests/audit/xac-nhan-khung.mjs";
import { seedStaff } from "../../../tests/audit/harness.mjs";

type W = any; // eslint-disable-line @typescript-eslint/no-explicit-any
const QL = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"; // Quản lý bán hàng
const URL_K = "/api/catalog/ngung-ban-ngay";
const TU = inDays(5);
const DEN = inDays(9);
const TRONG = inDays(7);
const NGOAI = inDays(10);
const TRUOC = inDays(4);

function the(): W {
  const w = setup();
  seedStaff(w.sqlite, { id: QL, phone: "0900000010", name: "Quản lý", perms: ["SALES", "SALES_MANAGER"] });
  return w;
}
const dat = (w: W, body: Record<string, unknown>, as = ADM) => w.call("POST", URL_K, { as, body });
async function datOk(w: W, body: Record<string, unknown>, as = ADM) {
  const r = await dat(w, body, as);
  assert.equal(r.status, 201, r.text);
  return r.json as { khoang: { id: string }; soDonDaXacNhan: number | null };
}
const ketThuc = (w: W, id: string, as = ADM) => w.call("POST", `${URL_K}/${id}/ket-thuc`, { as, body: {} });
const than = (services: unknown[]) => ({ customerName: "Khách Thử", customerPhone: "0912345678", services });
const lap = (w: W, services: unknown[], as = A) => w.call("POST", "/api/orders", { as, body: than(services) });
async function lapOk(w: W, services: unknown[], as = A) {
  const r = await lap(w, services, as);
  assert.equal(r.status, 201, r.text);
  return String(r.json.order.id);
}
const moc = (w: W, id: string) => w.q("SELECT updated_at AS u FROM orders WHERE id = ?", id)[0].u as string;
const luu = (w: W, id: string, services: unknown[], as = A) => w.call("PUT", `/api/orders/${id}`, { as, body: { ...than(services), expectedUpdatedAt: moc(w, id) } });
const xacNhan = (w: W, id: string, as = A) => w.call("POST", `/api/orders/${id}/status`, { as, body: { status: "confirmed" } });
const demDon = (w: W) => Number(w.q("SELECT count(*) AS n FROM orders")[0].n);
const nk = (w: W, action: string) => (w.q("SELECT target_id, detail FROM audit_log WHERE action = ?", action) as { target_id: string | null; detail: string }[]).map((r) => ({ target_id: r.target_id, detail: r.detail }));
const dmy = (iso: string) => `${iso.slice(8)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
const biChan = (r: { status: number; text: string; json: any }, ten = /Tour đảo/) => {
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.code, "sales_paused_date", r.text);
  assert.match(r.json.error.message, ten);
  assert.ok(r.json.error.message.includes(`ngừng bán từ ${dmy(TU)} đến ${dmy(DEN)}`), r.json.error.message);
};

test("tiêu chí 1: đặt khoảng cho dịch vụ ⇒ lập đơn ngày trong khoảng 409 nêu tên và khoảng, không ghi; hai đầu khoảng cũng chặn; ngày trước, ngày sau, dịch vụ khác ⇒ 201", async () => {
  const w = the();
  await datOk(w, { phamVi: "SERVICE", ma: "ZA1", tuNgay: TU, denNgay: DEN, ghiChu: "Tàu bảo dưỡng" });
  const truoc = demDon(w);
  for (const ngay of [TU, TRONG, DEN]) biChan(await lap(w, [svc("ZA1", ngay)]));
  biChan(await lap(w, [svc("ZB1", TRONG), svc("ZA1", TRONG)]));
  biChan(await lap(w, [svc("ZA1", TRONG)], ADM), /Tour đảo/); // không ai bán vượt
  biChan(await lap(w, [svc("ZA1", TRONG)], SUP), /Tour đảo/);
  assert.equal(demDon(w), truoc, "409 không ghi dòng nào");
  await lapOk(w, [svc("ZA1", TRUOC)]);
  await lapOk(w, [svc("ZA1", NGOAI)]);
  await lapOk(w, [svc("ZB1", TRONG)]);
});

test("tiêu chí 2: đặt cho nhóm ⇒ dịch vụ đang thuộc nhóm bị chặn, dịch vụ ngoài nhóm không; chuyển dịch vụ ra khỏi nhóm thì thôi bị chặn", async () => {
  const w = the();
  const g = (await w.call("POST", "/api/catalog/groups", { as: ADM, body: { name: "Tour đảo xa" } })).json.group.code as string;
  assert.equal((await w.call("PUT", "/api/catalog/group-assignments", { as: ADM, body: { codes: ["ZA1"], groupCode: g } })).status, 200);
  await datOk(w, { phamVi: "GROUP", ma: g, tuNgay: TU, denNgay: DEN }, QL); // Quản lý bán hàng đặt được cho cả nhóm (chủ chọn 20/11)
  biChan(await lap(w, [svc("ZA1", TRONG)]));
  await lapOk(w, [svc("ZB1", TRONG)]);
  assert.equal((await w.call("PUT", "/api/catalog/group-assignments", { as: ADM, body: { codes: ["ZA1"], groupCode: null } })).status, 200);
  await lapOk(w, [svc("ZA1", TRONG)]);
});

test("tiêu chí 3 (lưu nháp, /status, Gửi xác nhận): nháp lập TRƯỚC khi đặt khoảng bị chặn ở lần lưu, xác nhận, gửi xác nhận kế tiếp; đổi ngày ra ngoài khoảng thì lưu và xác nhận được", async () => {
  const w = the();
  const id = await lapOk(w, [svc("ZA1", TRONG)]);
  await datOk(w, { phamVi: "SERVICE", ma: "ZA1", tuNgay: TU, denNgay: DEN });
  biChan(await luu(w, id, [svc("ZA1", TRONG)]));
  biChan(await xacNhan(w, id));
  biChan(await w.call("POST", `/api/orders/${id}/gui-xac-nhan`, { as: A, body: {} }));
  assert.equal(w.q("SELECT status FROM orders WHERE id = ?", id)[0].status, "draft");
  assert.equal(w.q("SELECT count(*) AS n FROM ord_confirm_request WHERE order_id = ?", id)[0].n, 0, "không mở yêu cầu xác nhận");
  assert.equal((await luu(w, id, [svc("ZA1", NGOAI)])).status, 200);
  assert.equal((await xacNhan(w, id)).status, 200);
});

test("tiêu chí 4: đơn đã xác nhận từ trước giữ nguyên; đổi ngày khởi hành của nó VÀO khoảng ⇒ 409, ngày không đổi; đổi sang ngày ngoài khoảng ⇒ 200; đếm đúng số đơn đã xác nhận trong khoảng", async () => {
  const w = the();
  const trong = await lapOk(w, [svc("ZA1", TRONG)]);
  const ngoai = await lapOk(w, [svc("ZA1", NGOAI)]);
  for (const id of [trong, ngoai]) assert.equal((await xacNhan(w, id)).status, 200);
  await lapOk(w, [svc("ZA1", TRONG)]); // nháp: không đếm
  const r = await datOk(w, { phamVi: "SERVICE", ma: "ZA1", tuNgay: TU, denNgay: DEN });
  assert.equal(r.soDonDaXacNhan, 1, "chỉ đơn ĐÃ XÁC NHẬN có ngày trong khoảng");
  assert.equal(w.q("SELECT status FROM orders WHERE id = ?", trong)[0].status, "confirmed", "đơn đã xác nhận không bị huỷ");
  const xem = async (id: string) => (await w.call("GET", `/api/orders/${id}`, { as: A })).json.order;
  const doi = async (id: string, ngay: string) => {
    const o = await xem(id);
    return w.call("PUT", `/api/orders/${id}/trip`, { as: A, body: { expectedUpdatedAt: o.updatedAt, services: [{ id: o.services[0].id, departDate: ngay }] } });
  };
  biChan(await doi(ngoai, TRONG));
  assert.equal((await xem(ngoai)).services[0].departDate, NGOAI, "409 không đổi ngày");
  assert.equal((await doi(ngoai, inDays(11))).status, 200);
  assert.equal((await doi(trong, NGOAI)).status, 200, "dời đơn đang nằm trong khoảng ra ngoài: được");
});

test("tiêu chí 5: kết thúc khoảng ⇒ bán lại ngay; kết thúc lần hai ⇒ 409, vẫn một dòng nhật ký; GET chỉ trả khoảng còn chặn", async () => {
  const w = the();
  const { khoang } = await datOk(w, { phamVi: "SERVICE", ma: "ZA1", tuNgay: TU, denNgay: DEN, ghiChu: "Tàu bảo dưỡng" });
  const ds = (await w.call("GET", URL_K, { as: QL })).json.khoang;
  assert.deepEqual(ds.map((k: any) => [k.id, k.phamVi, k.ma, k.ten, k.tuNgay, k.denNgay, k.ghiChu]), [[khoang.id, "SERVICE", "ZA1", "Tour đảo", TU, DEN, "Tàu bảo dưỡng"]]);
  biChan(await lap(w, [svc("ZA1", TRONG)]));
  assert.equal((await ketThuc(w, khoang.id, QL)).status, 200);
  await lapOk(w, [svc("ZA1", TRONG)]);
  const lan2 = await ketThuc(w, khoang.id);
  assert.equal(lan2.status, 409, lan2.text);
  assert.equal(nk(w, "catalog_pause_ended").length, 1);
  assert.deepEqual((await w.call("GET", URL_K, { as: ADM })).json.khoang, []);
  assert.equal((await ketThuc(w, "khong-phai-id")).status, 404);
  assert.equal((await ketThuc(w, crypto.randomUUID())).status, 404);
});

test("tiêu chí 6: Bán hàng, Kế toán, Thực tập, Đối tác 403 ở cả ba route, không ghi; Quản lý bán hàng, Quản trị, Toàn quyền đặt và kết thúc được", async () => {
  const w = the();
  const body = { phamVi: "SERVICE", ma: "ZA1", tuNgay: TU, denNgay: DEN };
  const { khoang } = await datOk(w, body, SUP);
  for (const as of [A, ACC, INTERN, PARTNER]) {
    assert.equal((await dat(w, body, as)).status, 403, as);
    assert.equal((await w.call("GET", URL_K, { as })).status, 403, as);
    assert.equal((await ketThuc(w, khoang.id, as)).status, 403, as);
  }
  assert.equal(w.q("SELECT count(*) AS n FROM ctl_sales_pause WHERE ended_at IS NULL")[0].n, 1);
  for (const as of [QL, ADM, SUP]) {
    const k = await datOk(w, body, as);
    assert.equal((await ketThuc(w, k.khoang.id, as)).status, 200, as);
  }
});

test("thân sai ⇒ 400, không ghi: mã không có, nhóm không có, ngày ngược, ngày cuối đã qua, thiếu phạm vi", async () => {
  const w = the();
  for (const b of [
    { phamVi: "SERVICE", ma: "KHONGCO", tuNgay: TU, denNgay: DEN }, { phamVi: "GROUP", ma: "gkhongco", tuNgay: TU, denNgay: DEN }, { phamVi: "SERVICE", ma: "ZA1", tuNgay: DEN, denNgay: TU },
    { phamVi: "SERVICE", ma: "ZA1", tuNgay: inDays(-5), denNgay: inDays(-1) }, { ma: "ZA1", tuNgay: TU, denNgay: DEN }, { phamVi: "SERVICE", ma: "ZA1", tuNgay: TU },
  ]) assert.equal((await dat(w, b)).status, 400, JSON.stringify(b));
  assert.equal(w.q("SELECT count(*) AS n FROM ctl_sales_pause")[0].n, 0);
  assert.equal(nk(w, "catalog_pause_added").length, 0);
});

test("tiêu chí 7: bảng chỉ thêm — DELETE và UPDATE thẳng bị trigger từ chối, trừ đặt mốc kết thúc một lần", async () => {
  const w = the();
  const { khoang } = await datOk(w, { phamVi: "SERVICE", ma: "ZA1", tuNgay: TU, denNgay: DEN });
  const chay = (sql: string) => w.sqlite.prepare(sql).run(khoang.id);
  assert.throws(() => chay("DELETE FROM ctl_sales_pause WHERE id = ?"), /ctl_append_only/);
  assert.throws(() => chay("UPDATE ctl_sales_pause SET to_date = '2099-01-01' WHERE id = ?"), /ctl_append_only/);
  assert.throws(() => chay("UPDATE ctl_sales_pause SET catalog_code = 'ZB1' WHERE id = ?"), /ctl_append_only/);
  assert.throws(() => chay("UPDATE ctl_sales_pause SET note = 'x', ended_at = '2026-11-20T00:00:00.000Z' WHERE id = ?"), /ctl_append_only/);
  chay("UPDATE ctl_sales_pause SET ended_at = '2026-11-20T00:00:00.000Z', updated_at = '2026-11-20T00:00:00.000Z', updated_by = 'x' WHERE id = ?");
  assert.throws(() => chay("UPDATE ctl_sales_pause SET ended_at = '2026-11-21T00:00:00.000Z' WHERE id = ?"), /ctl_append_only/);
  assert.throws(() => chay("UPDATE ctl_sales_pause SET ended_at = NULL WHERE id = ?"), /ctl_append_only/);
  assert.throws(() => w.sqlite.exec("INSERT INTO ctl_sales_pause (id, scope, from_date, to_date, created_at, updated_at) VALUES ('x', 'ALL', '2026-01-01', '2026-01-02', 'x', 'x')"), /CHECK/);
  assert.throws(() => w.sqlite.exec("INSERT INTO ctl_sales_pause (id, scope, catalog_code, from_date, to_date, created_at, updated_at) VALUES ('y', 'SERVICE', 'ZA1', '2026-01-03', '2026-01-02', 'x', 'x')"), /CHECK/);
});

test("tiêu chí 8: nhật ký đặt và kết thúc chỉ có mã dịch vụ / tên nhóm và khoảng ngày", async () => {
  const w = the();
  const { khoang } = await datOk(w, { phamVi: "SERVICE", ma: "ZA1", tuNgay: TU, denNgay: DEN, ghiChu: "Gọi anh Ba 0912345678" });
  assert.equal((await ketThuc(w, khoang.id)).status, 200);
  const mong = `Dịch vụ ZA1: ${dmy(TU)} – ${dmy(DEN)}`;
  assert.deepEqual(nk(w, "catalog_pause_added"), [{ target_id: "ZA1", detail: mong }]);
  assert.deepEqual(nk(w, "catalog_pause_ended"), [{ target_id: "ZA1", detail: mong }], "ghi chú tự do không vào nhật ký");
});

test("Còn vé kèm ngày đi MỚI rơi vào khoảng ⇒ 409, đơn vẫn nháp, ngày không đổi; ngày mới ngoài khoảng ⇒ xác nhận được; đơn chờ có ngày CŨ trong khoảng ⇒ Còn vé 409, dời ra ngoài khoảng thì được", async () => {
  const w = the();
  datCo(w, "SERVICE", "ZA1", true);
  const cho = async (ngay: string) => {
    const id = await lapOk(w, [svc("ZA1", ngay)]);
    assert.equal((await w.call("POST", `/api/orders/${id}/gui-xac-nhan`, { as: A, body: {} })).status, 201);
    return id;
  };
  const qd = (id: string, extra: Record<string, unknown>) => {
    const yc = w.q("SELECT id FROM ord_confirm_request WHERE order_id = ? AND decided_at IS NULL", id)[0];
    return w.call("POST", `/api/orders/${id}/quyet-dinh`, { as: B, body: { yeuCauId: yc.id, updatedAt: moc(w, id), ...extra } });
  };
  const ngoai = await cho(TRUOC);
  const trong = await cho(TRONG);
  await datOk(w, { phamVi: "SERVICE", ma: "ZA1", tuNgay: TU, denNgay: DEN });
  biChan(await qd(ngoai, { ketQua: "CON_VE", ngayDi: TRONG }));
  assert.equal(w.q("SELECT status FROM orders WHERE id = ?", ngoai)[0].status, "draft");
  assert.equal(w.q("SELECT depart_date d FROM order_service WHERE order_id = ?", ngoai)[0].d, TRUOC, "409 không đổi ngày");
  biChan(await qd(trong, { ketQua: "CON_VE" }));
  const dung = await qd(ngoai, { ketQua: "CON_VE", ngayDi: NGOAI });
  assert.equal(dung.status, 200, dung.text);
  assert.equal(w.q("SELECT status FROM orders WHERE id = ?", ngoai)[0].status, "confirmed");
  const doiRa = await qd(trong, { ketQua: "CON_VE", ngayDi: NGOAI });
  assert.equal(doiRa.status, 200, doiRa.text); // dời đơn đang chờ ra ngoài khoảng: được
});

test("nhật ký của khoảng theo nhóm ghi TÊN nhóm ở cả lúc đặt lẫn lúc kết thúc", async () => {
  const w = the();
  const g = (await w.call("POST", "/api/catalog/groups", { as: ADM, body: { name: "Tour đảo xa" } })).json.group.code as string;
  const { khoang } = await datOk(w, { phamVi: "GROUP", ma: g, tuNgay: TU, denNgay: DEN });
  assert.equal((await ketThuc(w, khoang.id)).status, 200);
  const mong = [{ target_id: null, detail: `Nhóm Tour đảo xa: ${dmy(TU)} – ${dmy(DEN)}` }];
  assert.deepEqual(nk(w, "catalog_pause_added"), mong);
  assert.deepEqual(nk(w, "catalog_pause_ended"), mong);
});
