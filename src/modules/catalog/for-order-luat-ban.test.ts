// DANH MỤC LẬP ĐƠN BỎ DỊCH VỤ BỊ LUẬT BÁN CHẶN (ADR-0146 Đ4, tiêu chí 1, 4, 11; ADR-0152 tiêu chí 8; kế hoạch 2026-10-30 T9, R-3). Chạy CẢ ứng dụng trên SQLite thật
// (tests/audit/harness.mjs) — gốc lắp ráp tiêm `dichVuBiChanChoToi`. Lọc chỉ áp cho tài khoản mà máy chủ ÉP bên đặt (giữ quyền Đối tác, kể cả lai, có hồ sơ mang vai được hưởng —
// cùng điều kiện `benDatCuaToi`); văn phòng thấy đủ (cổng 409 ở đơn vẫn chặn khi lập hộ bên đặt bị chặn — bài T8). Loại, vai, nhóm, đặc điểm, luật dựng bằng ROUTE thật.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { A, ADM, INTERN, LAI, PARTNER, SUP, setup } from "../../../tests/audit/xac-nhan-khung.mjs";

type W = any; // eslint-disable-line @typescript-eslint/no-explicit-any
const doc = async (w: W, as: string) => {
  const r = await w.call("GET", "/api/catalog/for-order", { as });
  assert.equal(r.status, 200, r.text);
  return { ma: (r.json.items as { code: string }[]).map((i) => i.code).sort(), nhom: (r.json.groups as { code: string }[]).map((g) => g.code) };
};
const loai = async (w: W, ten: string) => String((await w.call("POST", "/api/pricing/loai-doi-tac", { as: SUP, body: { ten } })).json.loai.code);
const hoSoCua = (w: W, staffId: string) => String(w.q("SELECT party_id AS p FROM staff WHERE id = ?", staffId)[0].p);
const ganVai = async (w: W, party: string, code: string) => {
  const r = await w.call("POST", `/api/parties/${party}/roles`, { as: SUP, body: { roleTypeCode: code } });
  assert.equal(r.status, 201, r.text);
};
const luat = async (w: W, body: Record<string, unknown>) => assert.equal((await w.call("POST", "/api/pricing/luat-ban", { as: A, body })).status, 201);

test("luật GROUP: Đối tác mang loại không thấy dịch vụ của nhóm, không thấy chip nhóm; trước khi mang loại thấy đủ; Bán hàng, Thực tập, Quản trị thấy đủ", async () => {
  const w = setup();
  const L = await loai(w, "Tài xế taxi thử");
  const g = (await w.call("POST", "/api/catalog/groups", { as: ADM, body: { name: "Nhóm đảo" } })).json.group.code as string;
  assert.equal((await w.call("PUT", "/api/catalog/group-assignments", { as: ADM, body: { codes: ["ZA1"], groupCode: g } })).status, 200);
  await luat(w, { loai: L, phamVi: "GROUP", groupCode: g });
  const du = await doc(w, PARTNER);
  assert.deepEqual(du.ma, ["ZA1", "ZB1"], "Đối tác chưa mang loại ⇒ đủ");
  assert.deepEqual(du.nhom, [g]);
  await ganVai(w, hoSoCua(w, PARTNER), L);
  assert.deepEqual(await doc(w, PARTNER), { ma: ["ZB1"], nhom: [] }, "bỏ dịch vụ nhóm bị chặn và chip nhóm (nhóm không còn dịch vụ nào)");
  for (const ai of [A, INTERN, ADM]) assert.deepEqual((await doc(w, ai)).ma, ["ZA1", "ZB1"], `${ai} thấy đủ`);
});

test("luật ATTRIBUTE bỏ đúng dịch vụ mang giá trị; luật một dịch vụ bỏ đúng dịch vụ đó; tài khoản lai Bán hàng + Đối tác không mang được loại ⇒ không bị ép bên đặt ⇒ thấy đủ", async () => {
  const w = setup();
  const L2 = await loai(w, "Lễ tân thử");
  const dd = (await w.call("POST", "/api/catalog/dac-diem", { as: ADM, body: { ten: "Vận chuyển cảng–đảo", giaTri: [{ ten: "Gồm" }, { ten: "Không gồm" }] } })).json.dacDiem;
  assert.equal((await w.call("PUT", `/api/catalog/ZB1/dac-diem/${dd.code}`, { as: A, body: { giaTri: dd.giaTri[0].code, dangThay: null } })).status, 200);
  await ganVai(w, hoSoCua(w, PARTNER), L2);
  await luat(w, { loai: L2, phamVi: "ATTRIBUTE", attributeCode: dd.code, valueCode: dd.giaTri[0].code });
  assert.deepEqual((await doc(w, PARTNER)).ma, ["ZA1"]);
  const L3 = await loai(w, "Tài xế taxi thử");
  await ganVai(w, hoSoCua(w, PARTNER), L3);
  await luat(w, { loai: L3, phamVi: "SERVICE", catalogCode: "ZA1" });
  assert.deepEqual((await doc(w, PARTNER)).ma, [], "hai loại, hai luật ⇒ hợp hai tập bỏ");
  // Kế hoạch T9 muốn ca «lai bị lọc»: route thật KHÔNG dựng được — hồ sơ của tài khoản nội bộ không mang loại đối tác được hưởng (409). Ghi ở sổ thi công.
  const lai = await w.call("POST", `/api/parties/${hoSoCua(w, LAI)}/roles`, { as: SUP, body: { roleTypeCode: L2 } });
  assert.equal(lai.json.error.code, "role_partner_label_conflict", lai.text);
  assert.deepEqual((await doc(w, LAI)).ma, ["ZA1", "ZB1"]);
  assert.deepEqual((await doc(w, A)).ma, ["ZA1", "ZB1"]);
});
