// Chính sách điều phối (ADR-0049 D2; kế hoạch Task A6, TC-4): hàm công bố `mocToiThieuHienHanh` (dòng mới nhất có hiệu lực ≤ bây giờ; dòng tương lai chưa
// hiệu lực; bảng rỗng → null — `orders` sẽ CHẶN, không đoán) và luật thuần kiểm thân yêu cầu chính sách / điều kiện / hạng bằng / lý do (khoảng giá trị;
// hợp đồng phải 0; không nhận ngày hiệu lực từ trình duyệt — I28).
import { test } from "node:test";
import assert from "node:assert/strict";
import * as esbuild from "esbuild";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { fakeD1, openDb } from "../../../tests/audit/harness.mjs";
import { kiemChinhSachMoi, kiemDieuKienMoi, kiemHangBangMoi, kiemLyDoMoi, kiemSuaLyDo } from "./chinh-sach.ts";

// index.ts import module khác KHÔNG đuôi (đúng cho tsc/wrangler) → gói bằng esbuild rồi nạp, như src/route-access.test.ts: vẫn là MÃ THẬT của hàm công bố.
const built = await esbuild.build({ entryPoints: [new URL("./index.ts", import.meta.url).pathname], bundle: true, format: "esm", platform: "neutral", target: "es2022", write: false, logLevel: "silent" });
const vanChuyen = (await import(`data:text/javascript;base64,${Buffer.from(built.outputFiles[0]!.text).toString("base64")}`)) as {
  mocToiThieuHienHanh: (db: unknown) => Promise<{ phut: number; policyId: string } | null>;
};

const chen = (sqlite: any, id: string, phut: number, tu: string) =>
  sqlite.prepare(
    `INSERT INTO vc_dispatch_policy (id, min_lead_minutes, warn_lead_minutes, rest_minutes, require_manifest, require_contract, valid_from_at, created_at, created_by, updated_at, updated_by)
     VALUES (?, ?, 120, 30, 1, 0, ?, ?, 'nv', ?, 'nv')`,
  ).run(id, phut, tu, tu, tu);

test("TC-4 mocToiThieuHienHanh: gieo sẵn 360 phút; dòng mới đã tới hiệu lực thắng; dòng TƯƠNG LAI chưa có hiệu lực; bảng rỗng → null", async () => {
  const sqlite = openDb();
  const db = fakeD1(sqlite);
  const goc = await vanChuyen.mocToiThieuHienHanh(db);
  assert.deepEqual(goc, { phut: 360, policyId: "d53b6dd9-60e2-4644-8e63-9ca7dcff35d0" });
  chen(sqlite, "cs-moi", 240, new Date(Date.now() - 60_000).toISOString());
  chen(sqlite, "cs-tuong-lai", 30, "2099-01-01T00:00:00.000Z");
  assert.deepEqual(await vanChuyen.mocToiThieuHienHanh(db), { phut: 240, policyId: "cs-moi" });
  const rong = openDb();
  rong.exec("DROP TRIGGER vc_dispatch_policy_no_delete; DELETE FROM vc_dispatch_policy");
  assert.equal(await vanChuyen.mocToiThieuHienHanh(fakeD1(rong)), null);
});

const loi = (r: { ok: boolean; message?: string }): string => {
  assert.equal(r.ok, false, "phải bị từ chối");
  return String((r as { message: string }).message);
};

test("kiemChinhSachMoi: đủ bốn giá trị trong khoảng; mốc KHÔNG tắt được (> 0 — chủ trả lời lần 9, GA-5); hợp đồng chỉ nhận false; không nhận ngày hiệu lực (I28); thiếu / sai kiểu → từ chối", () => {
  const du = { minLeadMinutes: 360, warnLeadMinutes: 120, restMinutes: 30, requireManifest: true };
  assert.deepEqual(kiemChinhSachMoi(du), { ok: true, value: du });
  assert.deepEqual(kiemChinhSachMoi({ ...du, minLeadMinutes: 1, warnLeadMinutes: 0, restMinutes: 0, requireManifest: false, requireContract: false }), {
    ok: true, value: { minLeadMinutes: 1, warnLeadMinutes: 0, restMinutes: 0, requireManifest: false },
  });
  assert.match(loi(kiemChinhSachMoi({ ...du, minLeadMinutes: 0 })), /không tắt được/, "mốc 0 bị từ chối với câu nói rõ");
  assert.match(loi(kiemChinhSachMoi({ ...du, requireContract: true })), /hợp đồng/i);
  for (const k of ["validFrom", "validFromAt", "valid_from_at", "hieuLucTu", "effectiveFrom"]) assert.match(loi(kiemChinhSachMoi({ ...du, [k]: "2026-01-01" })), /hiệu lực/, k);
  for (const [k, v] of [["minLeadMinutes", 2881], ["minLeadMinutes", -1], ["minLeadMinutes", 1.5], ["minLeadMinutes", "360"], ["warnLeadMinutes", 1441], ["restMinutes", 481], ["requireManifest", 1]] as const) {
    loi(kiemChinhSachMoi({ ...du, [k]: v }));
  }
  for (const k of Object.keys(du)) {
    const thieu: Record<string, unknown> = { ...du };
    delete thieu[k];
    loi(kiemChinhSachMoi(thieu));
  }
  loi(kiemChinhSachMoi(null));
});

test("kiemDieuKienMoi / kiemHangBangMoi: khuôn mã, khoảng số, đối tượng tập đóng; không nhận ngày hiệu lực", () => {
  assert.deepEqual(kiemDieuKienMoi({ minCapacity: 16, subject: "VEHICLE", documentTypeCode: "CONTRACT_BADGE" }), { ok: true, value: { minCapacity: 16, subject: "VEHICLE", documentTypeCode: "CONTRACT_BADGE" } });
  assert.deepEqual(kiemDieuKienMoi({ minCapacity: 1, subject: "DRIVER", documentTypeCode: "HEALTH_CHECK" }).ok, true);
  for (const bad of [
    { minCapacity: 0, subject: "VEHICLE", documentTypeCode: "X_Y" }, { minCapacity: 101, subject: "VEHICLE", documentTypeCode: "X_Y" },
    { minCapacity: 16, subject: "OTHER", documentTypeCode: "X_Y" }, { minCapacity: 16, subject: "VEHICLE", documentTypeCode: "thuong" },
    { minCapacity: 16, subject: "VEHICLE" }, { minCapacity: 16, subject: "VEHICLE", documentTypeCode: "X_Y", validFrom: "2026-01-01" },
  ]) loi(kiemDieuKienMoi(bad));
  assert.deepEqual(kiemHangBangMoi({ classCode: "D2", maxPassengers: 30 }), { ok: true, value: { classCode: "D2", maxPassengers: 30 } });
  assert.deepEqual(kiemHangBangMoi({ classCode: "D", maxPassengers: null }), { ok: true, value: { classCode: "D", maxPassengers: null } }, "null = không giới hạn");
  for (const bad of [{ classCode: "D2", maxPassengers: 0 }, { classCode: "D2", maxPassengers: 101 }, { classCode: "d2", maxPassengers: 29 }, { classCode: "D2" }, { classCode: "D2", maxPassengers: 29, validFromAt: "x" }]) {
    loi(kiemHangBangMoi(bad));
  }
});

test("kiemLyDoMoi / kiemSuaLyDo: mã chữ HOA; nhóm thuộc NHOM_LY_DO (kiểm ở mã — I7); nhãn 1–80 ký tự; sửa kèm mốc cập nhật", () => {
  assert.deepEqual(kiemLyDoMoi({ code: "PHA_LE_MUA_LON", group: "PHA_LE", label: "  Mưa   lớn ", sortOrder: 3 }), {
    ok: true, value: { code: "PHA_LE_MUA_LON", group: "PHA_LE", label: "Mưa lớn", sortOrder: 3 },
  });
  assert.equal(kiemLyDoMoi({ code: "PHA_LE_MUA_LON", group: "PHA_LE", label: "Mưa lớn" }).ok, true, "thiếu thứ tự = 0");
  for (const bad of [
    { code: "pha_le", group: "PHA_LE", label: "x" }, { code: "PHA_LE_X", group: "KHONG_CO", label: "x" }, { code: "PHA_LE_X", group: "PHA_LE", label: " " },
    { code: "PHA_LE_X", group: "PHA_LE", label: "x".repeat(81) }, { code: "A", group: "PHA_LE", label: "x" },
  ]) loi(kiemLyDoMoi(bad));
  assert.deepEqual(kiemSuaLyDo({ label: "Khác (ghi rõ)", sortOrder: 99, active: false, expectedUpdatedAt: "2026-09-29T00:00:00.000Z" }), {
    ok: true, value: { label: "Khác (ghi rõ)", sortOrder: 99, active: false, expectedUpdatedAt: "2026-09-29T00:00:00.000Z" },
  });
  for (const bad of [{ label: "x", sortOrder: 1, active: "no", expectedUpdatedAt: "x" }, { label: "x", sortOrder: 1, active: true }, { label: "x", sortOrder: 1, active: true, expectedUpdatedAt: "x", group: "HUY_CHUYEN" }]) {
    loi(kiemSuaLyDo(bad));
  }
});
