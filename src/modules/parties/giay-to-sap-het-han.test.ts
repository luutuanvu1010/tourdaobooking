// Hàm công bố `expiringDriverDocuments` của parties (ADR-0040 D1; kế hoạch Task A11; giả định G7) — giấy tờ sắp hết / đã hết hạn của TÀI XẾ CÔNG TY cho
// danh sách "sắp hết hạn" của Vận chuyển. "Tài xế" = hồ sơ đang dùng, đang mở vai tài khoản "Tài xế công ty" — lọc BÁO CÁO trong parties (vai hồ sơ không
// bao giờ là điều kiện cho phép, R-N1-12). Chỉ dòng hiện hành có ngày hết hạn ≤ `until`. KHÔNG trả số, nơi cấp, id giấy tờ.
// Gọi đúng hàm xuất ở parties/index.ts (gói bằng esbuild như src/route-access.test.ts) trên SQLite thật (tests/audit/harness.mjs). Số ở đây là số GIẢ.
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
};
await import("./repository.ts"); // đăng ký câu SQL của parties vào sổ để bài dưới đọc được

const HOM_NAY = "2026-09-28";
const AT = "2026-09-01T00:00:00.000Z";
let n = 0;
function nguoi(w: any, id: string, ten: string, active = 1) {
  w.sqlite.exec(`INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES ('${id}', 'PERSON', '${ten}', ${active}, '${AT}', '${AT}')`);
  w.sqlite.exec(`INSERT INTO pty_person (party_id, given_name, created_at, updated_at) VALUES ('${id}', '${ten}', '${AT}', '${AT}')`);
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
  return w;
}

test("expiringDriverDocuments: đúng hai dòng hiện hành của tài xế đang mở vai, hạn ≤ until (kể cả đã hết hạn), xếp theo ngày hết hạn — không HDV, vai đã đóng, hồ sơ ngưng, dòng cũ/huỷ, không hạn, 60 ngày", async () => {
  const w = gieo();
  const rows = await parties.expiringDriverDocuments(w.env.DB, { today: HOM_NAY, until: addDays(HOM_NAY, 30) });
  assert.deepEqual(rows, [
    { partyId: "p-a", displayName: "Tài Xế An", typeName: "Giấy phép lái xe", className: "Hạng D2", expiryDate: addDays(HOM_NAY, -3) },
    { partyId: "p-a", displayName: "Tài Xế An", typeName: "Căn cước công dân (CCCD)", className: null, expiryDate: addDays(HOM_NAY, 10) },
  ]);
  for (const r of rows) assert.deepEqual(Object.keys(r), ["partyId", "displayName", "typeName", "className", "expiryDate"], "không số, không nơi cấp, không id giấy tờ");
  assert.ok(!JSON.stringify(rows).includes("0790000000") && !JSON.stringify(rows).includes("Nơi cấp riêng"));
  const hep = await parties.expiringDriverDocuments(w.env.DB, { today: HOM_NAY, until: addDays(HOM_NAY, 7) });
  assert.deepEqual(hep.map((r) => r.typeName), ["Giấy phép lái xe"], "ngưỡng 7 ngày: chỉ còn giấy đã hết hạn");
});

test("câu SQL parties.expiring_driver_documents không chọn cột số, nơi cấp (khoá bằng văn bản câu đã đăng ký)", () => {
  const e = registeredSql().find((x) => x.module === "parties" && x.name === "expiring_driver_documents");
  assert.ok(e, "câu phải được đăng ký bằng defineSql");
  for (const cot of ["document_number", "number_key", "issued_place"]) assert.ok(!e.sql.includes(cot), `không chọn ${cot}`);
});
