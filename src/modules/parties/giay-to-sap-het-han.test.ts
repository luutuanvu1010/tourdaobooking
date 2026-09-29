// Hàm công bố `expiringDriverDocuments` của parties (ADR-0040 D1; kế hoạch Task A11; giả định G7) — giấy tờ sắp hết / đã hết hạn của TÀI XẾ CÔNG TY cho
// danh sách "sắp hết hạn" của Vận chuyển. "Tài xế" = hồ sơ đang dùng, đang mở vai tài khoản "Tài xế công ty" — lọc BÁO CÁO trong parties (vai hồ sơ không
// bao giờ là điều kiện cho phép, R-N1-12). Chỉ dòng hiện hành có ngày hết hạn ≤ `until`. KHÔNG trả số, nơi cấp, id giấy tờ.
// Gọi đúng hàm xuất ở parties/index.ts (gói bằng esbuild như src/route-access.test.ts) trên SQLite thật (tests/audit/harness.mjs). Số ở đây là số GIẢ.
// ADR-0048 D1 (đổi hợp đồng công bố, cùng commit với test): mở rộng sang hồ sơ đang mở vai "Tài xế đối tác" (DRIVER_EXTERNAL), mỗi dòng thêm `carrierName`
// = tên các nhà xe người đó đang "thuộc" (luật ở view v_pty_carrier_driver), null = tài xế công ty. Hàm công bố MỚI `nhaXeDangHopTac` (một hàm + kiểu).
import { test } from "node:test";
import assert from "node:assert/strict";
import * as esbuild from "esbuild";
import { registeredSql } from "../../shared/sql-registry.ts";
import { addDays } from "../../shared/vn-date.ts";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world } from "../../../tests/audit/harness.mjs";

const built = await esbuild.build({ entryPoints: [new URL("./index.ts", import.meta.url).pathname], bundle: true, format: "esm", platform: "neutral", target: "es2022", write: false });
const parties = (await import(`data:text/javascript;base64,${Buffer.from(built.outputFiles[0]!.text).toString("base64")}`)) as {
  expiringDriverDocuments: (db: unknown, v: { today: string; until: string }) => Promise<Record<string, unknown>[]>;
  nhaXeDangHopTac: (db: unknown) => Promise<Record<string, unknown>[]>;
};
await import("./repository.ts"); // đăng ký câu SQL của parties vào sổ để bài dưới đọc được

const HOM_NAY = "2026-09-28";
const AT = "2026-09-01T00:00:00.000Z";
let n = 0;
function nguoi(w: any, id: string, ten: string, active = 1) {
  w.sqlite.exec(`INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES ('${id}', 'PERSON', '${ten}', ${active}, '${AT}', '${AT}')`);
  w.sqlite.exec(`INSERT INTO pty_person (party_id, given_name, created_at, updated_at) VALUES ('${id}', '${ten}', '${AT}', '${AT}')`);
}
function toChuc(w: any, id: string, ten: string) {
  w.sqlite.exec(`INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES ('${id}', 'ORGANIZATION', '${ten}', 1, '${AT}', '${AT}')`);
  w.sqlite.exec(`INSERT INTO pty_organization (party_id, created_at, updated_at) VALUES ('${id}', '${AT}', '${AT}')`);
}
/** Quan hệ "Tài xế của" đang mở (người → nhà xe). */
function taiXeCua(w: any, taiXe: string, nhaXe: string) {
  w.sqlite.exec(`INSERT INTO pty_party_relationship (id, from_party_id, to_party_id, relationship_type_code, valid_from_date, created_at, updated_at)
    VALUES ('q-${++n}', '${taiXe}', '${nhaXe}', 'DRIVES_FOR', '2026-09-01', '${AT}', '${AT}')`);
}
function vai(w: any, party: string, code: string, den: string | null = null) {
  w.sqlite.exec(`INSERT INTO pty_party_role (id, party_id, role_type_code, location_id, valid_from_date, valid_to_date, created_at, updated_at)
    VALUES ('r-${++n}', '${party}', '${code}', NULL, '2026-09-01', ${den ? `'${den}'` : "NULL"}, '${AT}', '${AT}')`);
}
function giayTo(w: any, o: { party: string; type: string; so?: string; cls?: string; het?: string | null; truoc?: string; huy?: boolean; noi?: string }): string {
  const id = `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`;
  w.sqlite
    .prepare(
      `INSERT INTO pty_person_document (id, party_id, document_type_code, document_number, number_key, license_class_code, issued_place, expiry_date, previous_id,
         voided_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(id, o.party, o.type, o.so ?? null, o.so ?? null, o.cls ?? null, o.noi ?? null, o.het ?? null, o.truoc ?? null, o.huy ? AT : null, AT, AT);
  return id;
}

function gieo() {
  const w = world();
  nguoi(w, "p-a", "Tài Xế An");
  vai(w, "p-a", "DRIVER_INTERNAL");
  giayTo(w, { party: "p-a", type: "CCCD", so: "079000000011", het: addDays(HOM_NAY, 10), noi: "Nơi cấp riêng" }); // (a) sau 10 ngày
  giayTo(w, { party: "p-a", type: "GPLX", so: "790000000011", cls: "D2", het: addDays(HOM_NAY, -3) }); // (a) đã hết hạn 3 ngày
  const cu = giayTo(w, { party: "p-a", type: "HEALTH_CHECK", het: addDays(HOM_NAY, 2) }); // (e) dòng đã được gia hạn
  giayTo(w, { party: "p-a", type: "HEALTH_CHECK", het: addDays(HOM_NAY, 400), truoc: cu });
  giayTo(w, { party: "p-a", type: "TRANSPORT_TRAINING", het: addDays(HOM_NAY, 4), huy: true }); // (e) dòng đã huỷ
  giayTo(w, { party: "p-a", type: "TRANSPORT_TRAINING", het: addDays(HOM_NAY, 60) }); // (g) 60 ngày
  nguoi(w, "p-b", "Hướng Dẫn Bình");
  vai(w, "p-b", "GUIDE_INTERNAL");
  giayTo(w, { party: "p-b", type: "CCCD", so: "079000000012", het: addDays(HOM_NAY, 5) }); // (b) không phải tài xế
  nguoi(w, "p-c", "Tài Xế Cũ");
  vai(w, "p-c", "DRIVER_INTERNAL", addDays(HOM_NAY, -1));
  giayTo(w, { party: "p-c", type: "CCCD", so: "079000000013", het: addDays(HOM_NAY, 5) }); // (c) vai đã kết thúc hôm qua
  nguoi(w, "p-d", "Tài Xế Ngưng", 0);
  vai(w, "p-d", "DRIVER_INTERNAL");
  giayTo(w, { party: "p-d", type: "CCCD", so: "079000000014", het: addDays(HOM_NAY, 5) }); // (d) hồ sơ ngưng dùng
  nguoi(w, "p-e", "Tài Xế Không Hạn");
  vai(w, "p-e", "DRIVER_INTERNAL");
  giayTo(w, { party: "p-e", type: "HEALTH_CHECK", het: null }); // (f) không hạn
  // ADR-0048 D1: nhà xe tổ chức X có tài xế đối tác E; nhà xe CÁ NHÂN F tự lái (vai Nhà xe + vai Tài xế đối tác); G đã thôi vai Tài xế đối tác.
  toChuc(w, "p-x", "Nhà Xe Xuân");
  vai(w, "p-x", "CARRIER");
  nguoi(w, "p-tx-e", "Tài Xế Em");
  vai(w, "p-tx-e", "DRIVER_EXTERNAL");
  taiXeCua(w, "p-tx-e", "p-x");
  giayTo(w, { party: "p-tx-e", type: "GPLX", so: "790000000021", cls: "D2", het: addDays(HOM_NAY, 7) });
  nguoi(w, "p-f", "Nhà Xe Phúc");
  vai(w, "p-f", "CARRIER");
  vai(w, "p-f", "DRIVER_EXTERNAL");
  giayTo(w, { party: "p-f", type: "CCCD", so: "079000000022", het: addDays(HOM_NAY, 3), noi: "Nơi cấp riêng" });
  nguoi(w, "p-g", "Tài Xế Giang");
  vai(w, "p-g", "DRIVER_EXTERNAL", addDays(HOM_NAY, -1));
  giayTo(w, { party: "p-g", type: "CCCD", so: "079000000023", het: addDays(HOM_NAY, 5) });
  return w;
}

test("expiringDriverDocuments: dòng hiện hành của tài xế CÔNG TY và tài xế ĐỐI TÁC đang mở vai, hạn ≤ until (kể cả đã hết hạn), xếp theo ngày hết hạn, có tên nhà xe — không HDV, vai đã đóng, hồ sơ ngưng, dòng cũ/huỷ, không hạn, 60 ngày", async () => {
  const w = gieo();
  const rows = await parties.expiringDriverDocuments(w.env.DB, { today: HOM_NAY, until: addDays(HOM_NAY, 30) });
  assert.deepEqual(rows, [
    { partyId: "p-a", displayName: "Tài Xế An", typeName: "Giấy phép lái xe", className: "Hạng D2", expiryDate: addDays(HOM_NAY, -3), carrierName: null },
    { partyId: "p-f", displayName: "Nhà Xe Phúc", typeName: "Căn cước công dân (CCCD)", className: null, expiryDate: addDays(HOM_NAY, 3), carrierName: "Nhà Xe Phúc" },
    { partyId: "p-tx-e", displayName: "Tài Xế Em", typeName: "Giấy phép lái xe", className: "Hạng D2", expiryDate: addDays(HOM_NAY, 7), carrierName: "Nhà Xe Xuân" },
    { partyId: "p-a", displayName: "Tài Xế An", typeName: "Căn cước công dân (CCCD)", className: null, expiryDate: addDays(HOM_NAY, 10), carrierName: null },
  ], "tài xế đối tác G đã thôi vai → không có");
  for (const r of rows) assert.deepEqual(Object.keys(r), ["partyId", "displayName", "typeName", "className", "expiryDate", "carrierName"], "đúng sáu khoá — không số, không nơi cấp, không id giấy tờ");
  assert.ok(!JSON.stringify(rows).includes("0790000000") && !JSON.stringify(rows).includes("7900000000") && !JSON.stringify(rows).includes("Nơi cấp riêng"));
  const hep = await parties.expiringDriverDocuments(w.env.DB, { today: HOM_NAY, until: addDays(HOM_NAY, 2) });
  assert.deepEqual(hep.map((r) => r.typeName), ["Giấy phép lái xe"], "ngưỡng 2 ngày: chỉ còn giấy đã hết hạn");
});

test("nhaXeDangHopTac (ADR-0048 D1): nhà xe đang mở vai — tổ chức hai tài xế, cá nhân tự lái một; nhà xe đã thôi không có; xếp theo tên; KHÔNG liên hệ, MST", async () => {
  const w = gieo();
  nguoi(w, "p-tx-h", "Tài Xế Hoà");
  taiXeCua(w, "p-tx-h", "p-x");
  toChuc(w, "p-cu", "Nhà Xe Cũ");
  vai(w, "p-cu", "CARRIER", addDays(HOM_NAY, -1));
  const list = await parties.nhaXeDangHopTac(w.env.DB);
  assert.deepEqual(list, [
    { partyId: "p-f", displayName: "Nhà Xe Phúc", kind: "PERSON", driverCount: 1 },
    { partyId: "p-x", displayName: "Nhà Xe Xuân", kind: "ORGANIZATION", driverCount: 2 },
  ]);
});

test("câu SQL parties.expiring_driver_documents và parties.carriers không chọn cột số, nơi cấp, liên hệ, MST (khoá bằng văn bản câu đã đăng ký)", () => {
  const e = registeredSql().find((x) => x.module === "parties" && x.name === "expiring_driver_documents");
  assert.ok(e, "câu phải được đăng ký bằng defineSql");
  for (const cot of ["document_number", "number_key", "issued_place"]) assert.ok(!e.sql.includes(cot), `không chọn ${cot}`);
  const c = registeredSql().find((x) => x.module === "parties" && x.name === "carriers");
  assert.ok(c, "câu nhà xe phải được đăng ký bằng defineSql");
  for (const cot of ["pty_contact_point", "tax_code", "legal_name", "document_number"]) assert.ok(!c.sql.includes(cot), `câu nhà xe không chọn ${cot}`);
});
