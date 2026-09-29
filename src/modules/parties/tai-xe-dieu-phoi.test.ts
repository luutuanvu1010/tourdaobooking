// Hàm công bố `taiXeChoDieuPhoi` của parties (ADR-0049 D2: "giấy tờ đọc qua hàm công bố của parties, không lấy số"; kế hoạch mục 1.1, Task A5, TC-3) — danh
// sách tài xế cho điều phối xe: tài xế CÔNG TY (hồ sơ đang mở vai tài khoản `DRIVER_INTERNAL`) và tài xế NHÀ XE (có trong view `v_pty_carrier_driver` — kể cả
// người CHƯA có tài khoản, chỉ có quan hệ "Tài xế của"; kể cả nhà xe cá nhân tự lái), mỗi người: loại, các nhà xe đang "thuộc", giấy tờ HIỆN HÀNH (khoá dòng,
// mã loại, hạng, hạn). KHÔNG số giấy tờ, khoá số, nơi cấp. Đúng MỘT hàm mới xuất ra ngoài ở parties/index.ts. Chạy MÃ THẬT (gói esbuild) trên SQLite thật.
// Số và nơi cấp ở đây là GIẢ.
import { test } from "node:test";
import assert from "node:assert/strict";
import * as esbuild from "esbuild";
import { registeredSql } from "../../shared/sql-registry.ts";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world } from "../../../tests/audit/harness.mjs";

const built = await esbuild.build({ entryPoints: [new URL("./index.ts", import.meta.url).pathname], bundle: true, format: "esm", platform: "neutral", target: "es2022", write: false });
const parties = (await import(`data:text/javascript;base64,${Buffer.from(built.outputFiles[0]!.text).toString("base64")}`)) as Record<string, unknown> & {
  taiXeChoDieuPhoi: (db: unknown, v: { today: string }) => Promise<Record<string, unknown>[]>;
};
await import("./repository.ts"); // đăng ký câu SQL của parties vào sổ để bài văn bản câu đọc được

const HOM_NAY = "2026-09-29";
const AT = "2026-09-01T00:00:00.000Z";
const SO = "790000000077";
const NOI = "Nơi cấp riêng A5";
let n = 0;
function nguoi(w: any, id: string, ten: string, active = 1) {
  w.sqlite.exec(`INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES ('${id}', 'PERSON', '${ten}', ${active}, '${AT}', '${AT}')`);
  w.sqlite.exec(`INSERT INTO pty_person (party_id, given_name, created_at, updated_at) VALUES ('${id}', '${ten}', '${AT}', '${AT}')`);
}
function toChuc(w: any, id: string, ten: string) {
  w.sqlite.exec(`INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES ('${id}', 'ORGANIZATION', '${ten}', 1, '${AT}', '${AT}')`);
  w.sqlite.exec(`INSERT INTO pty_organization (party_id, created_at, updated_at) VALUES ('${id}', '${AT}', '${AT}')`);
}
function vai(w: any, party: string, code: string, den: string | null = null) {
  w.sqlite.exec(`INSERT INTO pty_party_role (id, party_id, role_type_code, location_id, valid_from_date, valid_to_date, created_at, updated_at)
    VALUES ('r-${++n}', '${party}', '${code}', NULL, '2026-09-01', ${den ? `'${den}'` : "NULL"}, '${AT}', '${AT}')`);
}
function taiXeCua(w: any, taiXe: string, nhaXe: string) {
  w.sqlite.exec(`INSERT INTO pty_party_relationship (id, from_party_id, to_party_id, relationship_type_code, valid_from_date, created_at, updated_at)
    VALUES ('q-${++n}', '${taiXe}', '${nhaXe}', 'DRIVES_FOR', '2026-09-01', '${AT}', '${AT}')`);
}
function giayTo(w: any, o: { id: string; party: string; type: string; cls?: string; het?: string | null; truoc?: string; huy?: boolean }): string {
  w.sqlite
    .prepare(
      `INSERT INTO pty_person_document (id, party_id, document_type_code, document_number, number_key, license_class_code, issued_place, expiry_date, previous_id,
         voided_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(o.id, o.party, o.type, SO, SO, o.cls ?? null, NOI, o.het ?? null, o.truoc ?? null, o.huy ? AT : null, AT, AT);
  return o.id;
}

function gieo() {
  const w = world();
  // Tài xế công ty: bốn loại giấy — HEALTH_CHECK có dòng cũ đã gia hạn, TRANSPORT_TRAINING có dòng đã huỷ.
  nguoi(w, "p-a", "Tài Xế An");
  vai(w, "p-a", "DRIVER_INTERNAL");
  giayTo(w, { id: "g-a-cccd", party: "p-a", type: "CCCD", het: "2035-01-01" });
  giayTo(w, { id: "g-a-gplx", party: "p-a", type: "GPLX", cls: "D2", het: "2028-06-30" });
  const cu = giayTo(w, { id: "g-a-ksk-cu", party: "p-a", type: "HEALTH_CHECK", het: "2026-09-30" });
  giayTo(w, { id: "g-a-ksk", party: "p-a", type: "HEALTH_CHECK", het: "2027-09-30", truoc: cu });
  giayTo(w, { id: "g-a-th-huy", party: "p-a", type: "TRANSPORT_TRAINING", het: "2027-01-01", huy: true });
  giayTo(w, { id: "g-a-th", party: "p-a", type: "TRANSPORT_TRAINING", het: null });
  // Không phải tài xế: HDV; tài xế công ty đã thôi vai hôm qua; tài xế công ty có hồ sơ ngưng dùng.
  nguoi(w, "p-b", "Hướng Dẫn Bình");
  vai(w, "p-b", "GUIDE_INTERNAL");
  nguoi(w, "p-c", "Tài Xế Cũ");
  vai(w, "p-c", "DRIVER_INTERNAL", "2026-09-28");
  nguoi(w, "p-d", "Tài Xế Ngưng", 0);
  vai(w, "p-d", "DRIVER_INTERNAL");
  // Nhà xe tổ chức X: tài xế đối tác có tài khoản (E), tài xế CHƯA có tài khoản (H — chỉ quan hệ), tài xế vừa là tài xế công ty vừa "Tài xế của" X (K — T-2).
  toChuc(w, "p-x", "Nhà Xe Xuân");
  vai(w, "p-x", "CARRIER");
  nguoi(w, "p-e", "Tài Xế Em");
  vai(w, "p-e", "DRIVER_EXTERNAL");
  taiXeCua(w, "p-e", "p-x");
  giayTo(w, { id: "g-e-gplx", party: "p-e", type: "GPLX", cls: "D", het: "2029-01-01" });
  nguoi(w, "p-h", "Tài Xế Hoà");
  taiXeCua(w, "p-h", "p-x");
  nguoi(w, "p-k", "Tài Xế Kép");
  vai(w, "p-k", "DRIVER_INTERNAL");
  taiXeCua(w, "p-k", "p-x");
  // Nhà xe CÁ NHÂN tự lái (F): tài xế của chính mình (luật ở v_pty_carrier_driver).
  nguoi(w, "p-f", "Nhà Xe Phúc");
  vai(w, "p-f", "CARRIER");
  // Nhà xe đã thôi hợp tác (Y): tài xế M chỉ có quan hệ tới Y → không còn "thuộc" ai → không có mặt.
  toChuc(w, "p-y", "Nhà Xe Yên");
  vai(w, "p-y", "CARRIER");
  nguoi(w, "p-m", "Tài Xế Minh");
  taiXeCua(w, "p-m", "p-y");
  w.sqlite.exec("UPDATE pty_party_role SET valid_to_date = '2026-09-28' WHERE party_id = 'p-y' AND role_type_code = 'CARRIER'");
  return w;
}

test("TC-3 taiXeChoDieuPhoi: tài xế công ty → CONG_TY; tài xế nhà xe (kể cả chưa có tài khoản, nhà xe cá nhân tự lái) → NHA_XE + các nhà xe đang thuộc; không HDV, vai đã thôi, hồ sơ ngưng, nhà xe đã thôi", async () => {
  const w = gieo();
  const ds = await parties.taiXeChoDieuPhoi(w.env.DB, { today: HOM_NAY });
  assert.deepEqual(ds.map((x) => [x.partyId, x.loai, x.carrierPartyIds]), [
    ["p-f", "NHA_XE", ["p-f"]],
    ["p-a", "CONG_TY", []],
    ["p-e", "NHA_XE", ["p-x"]],
    ["p-h", "NHA_XE", ["p-x"]],
    ["p-k", "CONG_TY", ["p-x"]],
  ]);
  assert.equal(ds.find((x) => x.partyId === "p-a")!.displayName, "Tài Xế An");
});

test("TC-3 giấy tờ chỉ dòng HIỆN HÀNH (không dòng đã gia hạn, không dòng đã huỷ), đủ mọi loại (điều kiện xuất bến có thể đòi giấy tài xế bất kỳ), xếp theo thứ tự loại", async () => {
  const w = gieo();
  const a = (await parties.taiXeChoDieuPhoi(w.env.DB, { today: HOM_NAY })).find((x) => x.partyId === "p-a")!;
  assert.deepEqual(a.giayTo, [
    { rowId: "g-a-cccd", typeCode: "CCCD", classCode: null, expiryDate: "2035-01-01" },
    { rowId: "g-a-gplx", typeCode: "GPLX", classCode: "D2", expiryDate: "2028-06-30" },
    { rowId: "g-a-ksk", typeCode: "HEALTH_CHECK", classCode: null, expiryDate: "2027-09-30" },
    { rowId: "g-a-th", typeCode: "TRANSPORT_TRAINING", classCode: null, expiryDate: null },
  ]);
  const h = (await parties.taiXeChoDieuPhoi(w.env.DB, { today: HOM_NAY })).find((x) => x.partyId === "p-h")!;
  assert.deepEqual(h.giayTo, [], "tài xế nhà xe chưa nhập giấy tờ: mảng rỗng (điều phối sẽ chặn vì thiếu GPLX)");
});

test("TC-3 liệt kê khoá: đúng năm khoá mỗi tài xế, đúng bốn khoá mỗi giấy — KHÔNG number / numberKey / documentNumber / issuedPlace; thân không chứa số hay nơi cấp", async () => {
  const w = gieo();
  const ds = await parties.taiXeChoDieuPhoi(w.env.DB, { today: HOM_NAY });
  assert.ok(ds.length > 0);
  for (const x of ds) {
    assert.deepEqual(Object.keys(x), ["partyId", "displayName", "loai", "carrierPartyIds", "giayTo"]);
    for (const g of x.giayTo as Record<string, unknown>[]) assert.deepEqual(Object.keys(g), ["rowId", "typeCode", "classCode", "expiryDate"]);
  }
  const text = JSON.stringify(ds);
  for (const cam of [SO, NOI, "number", "numberKey", "documentNumber", "issuedPlace", "number_key", "issued_place"]) assert.ok(!text.includes(cam), `không lộ ${cam}`);
});

test("TC-3 câu SQL của taiXeChoDieuPhoi (đã đăng ký defineSql) không chọn document_number, number_key, issued_place", () => {
  const cau = registeredSql().filter((x) => x.module === "parties" && /cho_dieu_phoi/.test(x.name));
  assert.deepEqual(cau.map((x) => x.name).sort(), ["giay_to_tai_xe_cho_dieu_phoi", "tai_xe_cho_dieu_phoi"]);
  for (const c of cau) for (const cot of ["document_number", "number_key", "issued_place", "issued_date"]) assert.ok(!c.sql.includes(cot), `${c.name}: không chọn ${cot}`);
});

test("TC-3 parties/index.ts xuất ĐÚNG MỘT hàm mới (taiXeChoDieuPhoi) so với trước ADR-0049 — mọi tên khác giữ nguyên (thêm tên = đổi hợp đồng công bố, sửa bài có chủ đích)", () => {
  const TRUOC_ADR_0049 = [
    "accountRolesOf", "closeAccountRoleStatement", "composePersonName", "expiringDriverDocuments", "findPartiesByPhone", "newOrganizationStatements", "newPersonStatements",
    "nhaXeDangHopTac", "openAccountRoleStatement", "openRoleCodesByParty", "ownerCompany", "partiesModule", "partySummary", "renamePersonStatements",
    "reopenAccountRoleStatement", "splitPersonName", "validatePersonFullName",
  ];
  assert.deepEqual(Object.keys(parties).sort(), [...TRUOC_ADR_0049, "taiXeChoDieuPhoi"].sort());
});
