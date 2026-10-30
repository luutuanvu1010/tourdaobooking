// Route LUẬT BÁN theo loại đối tác qua khung thử (ADR-0146 Đ1, Đ5, tiêu chí 5, 8, 10; ADR-0152 Đ2 tiêu chí 12b, 13; kế hoạch 2026-10-30 T6, R-1, R-6; chủ chọn Q-2 (a)).
// Loại đối tác, nhóm dịch vụ tạo bằng ROUTE thật; dịch vụ danh mục chèn thẳng `catalog_item` (không có route tạo dịch vụ — đồng bộ Sheet), như các bài pricing khác.
// Ca theo đặc điểm (cần route của màn Đặc điểm dịch vụ — T7) nằm ở `catalog/dac-diem-route.test.ts`.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";
import { addDays, vnToday } from "../../shared/vn-date.ts";

const SALES = "11111111-1111-4111-8111-111111111111";
const HDV = "22222222-2222-4222-8222-222222222222";
const ADM = "33333333-3333-4333-8333-333333333333";
const KT = "44444444-4444-4444-8444-444444444444";
const DT = "55555555-5555-4555-8555-555555555555";
const HR = "66666666-6666-4666-8666-666666666666";
const SA = "77777777-7777-4777-8777-777777777777";
const SP = "88888888-8888-4888-8888-888888888888"; // tài khoản lai: Bán hàng + Đối tác
const TT = "99999999-9999-4999-8999-999999999999"; // Thực tập
const NOW = "2026-10-01T00:00:00.000Z";
type W = ReturnType<typeof world>;

async function setup(): Promise<{ w: W; loai: string; nhom: string }> {
  const w = world();
  for (const [id, phone, name, perms] of [
    [SALES, "0900000001", "An Bán", ["SALES"]], [HDV, "0900000002", "Nam HDV", ["FIELD"]], [ADM, "0900000003", "Quản Trị", ["ADMIN"]],
    [KT, "0900000005", "Lan Kế Toán", ["ACCOUNTING"]], [DT, "0900000006", "Đại Lý A", ["PARTNER"]], [HR, "0900000008", "Hà Nhân Sự", ["HR"]], [SA, "0900000007", "Chủ", ["SUPER_ADMIN"]],
    [SP, "0900000009", "Sơn Lai Bán", ["SALES", "PARTNER"]], [TT, "0900000010", "Tú Thực Tập", ["INTERN"]],
  ] as const) seedStaff(w.sqlite, { id, phone, name, perms: [...perms] });
  w.sqlite.exec(`INSERT INTO catalog_item (code, name, unit, price_adult, price_child, price_senior, price_infant, sheet_row, in_sheet, first_seen_at, updated_at)
    VALUES ('IRESORT', 'I-Resort', 'perPax', 300000, NULL, NULL, NULL, 1, 1, '${NOW}', '${NOW}')`);
  const l = await w.call("POST", "/api/pricing/loai-doi-tac", { as: KT, body: { ten: "Tài xế taxi thử" } });
  assert.equal(l.status, 201, l.text);
  const g = await w.call("POST", "/api/catalog/groups", { as: ADM, body: { name: "Nhóm thử luật bán" } });
  assert.equal(g.status, 201, g.text);
  return { w, loai: l.json.loai.code, nhom: g.json.group.code };
}
const homNay = () => vnToday(new Date());
const dem = (w: W, action: string) => Number(w.q("SELECT count(*) AS n FROM audit_log WHERE action = ?", action)[0].n);

test("ADR-0146 tiêu chí 10: Bán hàng thêm 201 (+ Location, nhật ký) và kết thúc 200 (+ nhật ký); Kế toán, Đối tác, Thực tập, Nhân sự, tài khoản lai 403; HDV bị cổng văn phòng chặn", async () => {
  const { w, loai } = await setup();
  const than = { loai, phamVi: "SERVICE", catalogCode: "IRESORT", ghiChu: "Đối tác này không bán I-Resort" };
  for (const as of [KT, DT, TT, HR, SP, HDV]) assert.equal((await w.call("POST", "/api/pricing/luat-ban", { as, body: than })).status, 403, as);
  const r = await w.call("POST", "/api/pricing/luat-ban", { as: SALES, body: than });
  assert.equal(r.status, 201, r.text);
  assert.equal(r.headers.get("location"), "/luat-ban");
  assert.equal(r.json.luat.trangThai, "DANG_AP_DUNG");
  assert.equal(r.json.luat.tuNgay, homNay());
  assert.equal(dem(w, "prc_sales_block_added"), 1);
  const detail = String(w.q("SELECT detail FROM audit_log WHERE action = 'prc_sales_block_added'")[0].detail);
  assert.ok(detail.includes(loai) && detail.includes("IRESORT") && detail.includes(homNay().split("-").reverse().join("/")), detail);
  const id = r.json.luat.id;
  for (const as of [KT, DT, TT, HR, SP]) assert.equal((await w.call("POST", `/api/pricing/luat-ban/${id}/ket-thuc`, { as, body: {} })).status, 403, as);
  const k = await w.call("POST", `/api/pricing/luat-ban/${id}/ket-thuc`, { as: SALES, body: {} });
  assert.equal(k.status, 200, k.text);
  assert.equal(k.json.luat.denNgay, addDays(homNay(), -1), "R-1: Kết thúc ngay = hôm qua (luật bắt đầu hôm nay ⇒ khoảng rỗng)");
  assert.equal(k.json.luat.trangThai, "DA_KET_THUC");
  assert.equal(dem(w, "prc_sales_block_ended"), 1);
  // Đọc: Bán hàng, Quản trị, Toàn quyền 200; Kế toán, Đối tác, lai 403.
  for (const as of [SALES, ADM, SA]) assert.equal((await w.call("GET", "/api/pricing/luat-ban", { as })).status, 200, as);
  for (const as of [KT, DT, SP, TT, HR]) assert.equal((await w.call("GET", "/api/pricing/luat-ban", { as })).status, 403, as);
  // Quản trị, Toàn quyền cũng thêm được.
  assert.equal((await w.call("POST", "/api/pricing/luat-ban", { as: ADM, body: than })).status, 201);
  assert.equal((await w.call("POST", "/api/pricing/luat-ban", { as: SA, body: than })).status, 201);
});

test("ADR-0146 tiêu chí 5 + R-1: dòng đã kết thúc còn nguyên trong danh sách; kết thúc lần hai 409 stale; hẹn ngày đã qua 400; hẹn tương lai giữ «Đang áp dụng»", async () => {
  const { w, loai, nhom } = await setup();
  const a = (await w.call("POST", "/api/pricing/luat-ban", { as: SALES, body: { loai, phamVi: "GROUP", groupCode: nhom } })).json.luat.id;
  assert.equal((await w.call("POST", `/api/pricing/luat-ban/${a}/ket-thuc`, { as: SALES, body: { denNgay: addDays(homNay(), -2) } })).status, 400);
  const hen = await w.call("POST", `/api/pricing/luat-ban/${a}/ket-thuc`, { as: SALES, body: { denNgay: addDays(homNay(), 5) } });
  assert.equal(hen.status, 200, hen.text);
  assert.equal(hen.json.luat.trangThai, "DANG_AP_DUNG", "hẹn kết thúc tương lai: vẫn chặn tới hết ngày đó");
  const lai = await w.call("POST", `/api/pricing/luat-ban/${a}/ket-thuc`, { as: SALES, body: {} });
  assert.deepEqual([lai.status, lai.json.error.code], [409, "stale"]);
  const ds = await w.call("GET", "/api/pricing/luat-ban", { as: SALES });
  assert.equal(ds.json.luat.length, 1);
  assert.equal(ds.json.luat[0].groupCode, nhom);
  assert.equal(ds.json.luat[0].tenNhom, "Nhóm thử luật bán");
  assert.equal(ds.json.luat[0].tenLoai, "Tài xế taxi thử");
  assert.equal((await w.call("POST", "/api/pricing/luat-ban/khong-co/ket-thuc", { as: SALES, body: {} })).status, 404);
});

test("ADR-0146 tiêu chí 8 + Đ1: tắt loại còn luật đang hoặc SẮP áp dụng ⇒ 409 loai_con_luat_ban (câu nêu số luật, ai làm được); kết thúc hết rồi tắt ⇒ 200", async () => {
  const { w, loai } = await setup();
  const dang = (await w.call("POST", "/api/pricing/luat-ban", { as: SALES, body: { loai, phamVi: "SERVICE", catalogCode: "IRESORT" } })).json.luat.id;
  const sap = await w.call("POST", "/api/pricing/luat-ban", { as: SALES, body: { loai, phamVi: "SERVICE", catalogCode: "IRESORT", tuNgay: addDays(homNay(), 3) } });
  assert.equal(sap.json.luat.trangThai, "SAP_AP_DUNG");
  const tat = await w.call("POST", `/api/pricing/loai-doi-tac/${loai}/tat`, { as: KT });
  assert.deepEqual([tat.status, tat.json.error.code], [409, "loai_con_luat_ban"]);
  assert.match(tat.json.error.message, /2 luật bán/);
  assert.match(tat.json.error.message, /Bán hàng, Quản trị hoặc Toàn quyền/);
  assert.doesNotMatch(tat.json.error.message, /chính sách/);
  assert.equal(dem(w, "prc_partner_type_off"), 0, "409 không ghi gì");
  await w.call("POST", `/api/pricing/luat-ban/${dang}/ket-thuc`, { as: SALES, body: {} });
  const conMot = await w.call("POST", `/api/pricing/loai-doi-tac/${loai}/tat`, { as: KT });
  assert.match(conMot.json.error.message, /1 luật bán/, "luật sắp áp dụng vẫn chặn tắt loại (cùng vị từ R-PRC-8)");
  // GHI NHẬN (sổ thi công T6, câu chờ chủ): luật SẮP áp dụng bấm «Kết thúc ngay» ⇒ ngày kết thúc = ngày bắt đầu − 1 (khoảng rỗng, không bao giờ chặn) nhưng vẫn ≥ hôm nay ⇒
  // theo vị từ R-PRC-8 (điều phối chốt dùng CÙNG vị từ) vẫn tính «chưa hết hạn» ⇒ chưa tắt được loại tới ngày bắt đầu cũ. Bài ghim hành vi hôm nay để đổi là có chủ ý.
  const kt = await w.call("POST", `/api/pricing/luat-ban/${sap.json.luat.id}/ket-thuc`, { as: SALES, body: {} });
  assert.equal(kt.json.luat.denNgay, addDays(homNay(), 2));
  assert.equal((await w.call("POST", `/api/pricing/loai-doi-tac/${loai}/tat`, { as: KT })).status, 409);
  // Loại chỉ có luật đang áp dụng: kết thúc ngay (hôm qua) rồi tắt ⇒ 200; thêm luật cho loại đang tắt ⇒ từ chối (ADR-0146 Đ1), không ghi.
  const loai2 = (await w.call("POST", "/api/pricing/loai-doi-tac", { as: KT, body: { ten: "Lễ tân thử" } })).json.loai.code;
  const l2 = (await w.call("POST", "/api/pricing/luat-ban", { as: SALES, body: { loai: loai2, phamVi: "SERVICE", catalogCode: "IRESORT" } })).json.luat.id;
  await w.call("POST", `/api/pricing/luat-ban/${l2}/ket-thuc`, { as: SALES, body: {} });
  const ok = await w.call("POST", `/api/pricing/loai-doi-tac/${loai2}/tat`, { as: KT });
  assert.equal(ok.status, 200, ok.text);
  const tren = await w.call("POST", "/api/pricing/luat-ban", { as: SALES, body: { loai: loai2, phamVi: "SERVICE", catalogCode: "IRESORT" } });
  assert.equal(tren.status, 400, tren.text);
  assert.equal(dem(w, "prc_sales_block_added"), 3);
});

test("kiểm thân: thiếu loại / phạm vi lạ / dịch vụ không có trong danh mục / nhóm không có / ngày bắt đầu đã qua ⇒ 400, không ghi; loại không được hưởng ⇒ 400", async () => {
  const { w, loai } = await setup();
  const sai = [
    {}, { loai, phamVi: "ALL" }, { loai, phamVi: "SERVICE", catalogCode: "KHONGCO" }, { loai, phamVi: "GROUP", groupCode: "gkhongco00000" },
    { loai, phamVi: "SERVICE", catalogCode: "IRESORT", tuNgay: addDays(homNay(), -1) }, { loai: "SUPPLIER", phamVi: "SERVICE", catalogCode: "IRESORT" },
  ];
  for (const body of sai) {
    const r = await w.call("POST", "/api/pricing/luat-ban", { as: SALES, body });
    assert.equal(r.status, 400, `${JSON.stringify(body)} → ${r.text}`);
    assert.doesNotMatch(r.json.error.message, /chính sách/);
  }
  assert.equal(Number(w.q("SELECT count(*) AS n FROM prc_sales_block")[0].n), 0);
});
