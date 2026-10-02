// ADR-0052 D6.2 qua route thật GET /api/thong-bao: đổi tài xế, huỷ, gián đoạn, khách vắng; tài khoản bị gỡ quyền không còn thấy tin cũ. Tên/SĐT GIẢ.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { ACC, ADM, DRIVER, DRIVER2, DRIVER_PARTNER, FIELD, SALES, SUP, batDongHo, chuyenSan, denGio, setup, tienDo, uuid } from "../../../tests/audit/dieu-phoi-khung.mjs";

const hopCua = async (w: any, as: string) => (await w.call("GET", "/api/thong-bao?ngan=cua-toi", { as })).json.tin.filter((t: any) => t.loai === "chuyen");

test("đổi tài xế: A thấy 'không còn lái', B thấy 'được xếp'; sau đó huỷ: chỉ B thấy 'đã bị huỷ'; Kế toán, HDV, Tài xế đối tác không thấy gì; người bấm không tự nhận", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const a = await chuyenSan(w);
    denGio("06:10"); // đồng hồ giả đứng yên — tách mốc từng lệnh như giờ thật
    let c = (await w.call("GET", `/api/van-chuyen/chuyen/${a.id}`, { as: SALES })).json;
    const doi = await w.call("PUT", `/api/van-chuyen/chuyen/${a.id}`, { as: SALES, body: { version: c.chuyen.version, requestId: uuid(), taiXePartyId: `pty-${DRIVER2}` } });
    assert.equal(doi.status, 200, doi.text);
    denGio("06:20");
    c = (await w.call("GET", `/api/van-chuyen/chuyen/${a.id}`, { as: SALES })).json;
    assert.equal((await w.call("POST", `/api/van-chuyen/chuyen/${a.id}/huy`, { as: SALES, body: { version: c.chuyen.version, requestId: uuid(), lyDo: "HUY_KHAC" } })).status, 200);
    const cauA = (await hopCua(w, DRIVER)).map((t: any) => t.cau);
    const cauB = (await hopCua(w, DRIVER2)).map((t: any) => t.cau);
    assert.ok(cauA.some((x: string) => x.startsWith("Bạn không còn lái")), JSON.stringify(cauA));
    assert.ok(!cauA.some((x: string) => x.includes("đã bị huỷ")), "A đã bị gỡ trước khi huỷ");
    assert.ok(cauB.some((x: string) => x.startsWith("Bạn được xếp lái")) && cauB.some((x: string) => x.includes("đã bị huỷ")), JSON.stringify(cauB));
    for (const as of [ACC, FIELD, DRIVER_PARTNER, SALES]) assert.deepEqual(await hopCua(w, as), [], `người ${as} không nhận`);
  } finally {
    tat();
  }
});

test("kết thúc giữa chừng (tài xế bấm) → Bán hàng, Quản trị, Toàn quyền nhận; khách vắng → người lập (Bán hàng) nhận kèm mã đơn", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const a = await chuyenSan(w, { soNguoi: 2 });
    denGio("12:40");
    for (const [d, body] of [["xuat-ben", {}], [`diem/${a.diemDon}/da-toi`, {}], [`phan-bo/${a.suat[0]}/vang`, {}]] as const) assert.equal((await tienDo(w, "tai-xe", a.id, d, body)).status, 200, d);
    const vang = await hopCua(w, SALES);
    assert.ok(vang.some((t: any) => t.cau.startsWith("Có khách vắng") && t.cau.includes(a.don.code)), JSON.stringify(vang));
    assert.equal((await tienDo(w, "tai-xe", a.id, "ket-thuc-gian-doan", { lyDo: "GIAN_DOAN_XE_HONG" })).status, 200);
    for (const as of [SALES, ADM, SUP]) assert.ok((await hopCua(w, as)).some((t: any) => t.cau.includes("kết thúc giữa chừng")), `người ${as}`);
    assert.ok(!(await hopCua(w, ACC)).some((t: any) => t.cau.includes("kết thúc giữa chừng")));
  } finally {
    tat();
  }
});

test("gỡ quyền Tài xế → tin cũ biến mất khỏi hộp (người nhận tính lúc đọc)", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    await chuyenSan(w, { taiXe: DRIVER2 });
    assert.ok((await hopCua(w, DRIVER2)).length > 0);
    // Gỡ quyền DRIVER, cho quyền INTERN (tài khoản vẫn đăng nhập được). Mốc lấy trước giờ giả nhưng ≥ valid_from_at của dòng gieo (CHECK ở 0012).
    const gio = new Date().toISOString();
    w.sqlite.exec(`UPDATE stf_permission SET valid_to_at = '${gio}' WHERE staff_id = '${DRIVER2}' AND permission_type_code = 'DRIVER'`);
    w.sqlite.exec(`INSERT INTO stf_permission (id, staff_id, permission_type_code, valid_from_at, created_at, updated_at) VALUES ('${DRIVER2}-INTERN', '${DRIVER2}', 'INTERN', '${gio}', '${gio}', '${gio}')`);
    const r = await w.call("GET", "/api/thong-bao?ngan=cua-toi", { as: DRIVER2 });
    assert.equal(r.status, 200, r.text);
    assert.deepEqual(r.json.tin.filter((t: any) => t.loai === "chuyen"), []);
  } finally {
    tat();
  }
});
