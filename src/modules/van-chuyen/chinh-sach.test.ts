// Chính sách điều phối (ADR-0049 D2; kế hoạch Task A6, TC-4): hàm công bố `mocToiThieuHienHanh` (dòng mới nhất có hiệu lực ≤ bây giờ; dòng tương lai chưa
// hiệu lực; bảng rỗng → null — `orders` sẽ CHẶN, không đoán) và luật thuần kiểm thân yêu cầu chính sách / điều kiện / hạng bằng / lý do (khoảng giá trị;
// hợp đồng phải 0; không nhận ngày hiệu lực từ trình duyệt — I28).
import { test } from "node:test";
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import * as esbuild from "esbuild";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { fakeD1, openDb } from "../../../tests/audit/harness.mjs";
import { chiTietChinhSach, kiemChinhSachMoi, kiemDieuKienMoi, kiemHangBangMoi, kiemLyDoMoi, kiemSuaLyDo } from "./chinh-sach.ts";

// index.ts import module khác KHÔNG đuôi (đúng cho tsc/wrangler) → gói bằng esbuild rồi nạp, như src/route-access.test.ts: vẫn là MÃ THẬT của hàm công bố.
const built = await esbuild.build({ entryPoints: [new URL("./index.ts", import.meta.url).pathname], bundle: true, format: "esm", platform: "neutral", target: "es2022", write: false, logLevel: "silent" });
const vanChuyen = (await import(`data:text/javascript;base64,${Buffer.from(built.outputFiles[0]!.text).toString("base64")}`)) as {
  mocToiThieuHienHanh: (db: unknown) => Promise<{ phut: number; policyId: string; canhBaoPhut: number } | null>;
};

const chen = (sqlite: any, id: string, phut: number, tu: string) =>
  sqlite.prepare(
    `INSERT INTO vc_dispatch_policy (id, min_lead_minutes, warn_lead_minutes, rest_minutes, require_manifest, require_contract, proxy_backdate_max_minutes, valid_from_at, created_at,
       created_by, updated_at, updated_by)
     VALUES (?, ?, 120, 30, 1, 0, 180, ?, ?, 'nv', ?, 'nv')`,
  ).run(id, phut, tu, tu, tu);

test("TC-4 mocToiThieuHienHanh: gieo sẵn 360 phút; dòng mới đã tới hiệu lực thắng; dòng TƯƠNG LAI chưa có hiệu lực; bảng rỗng → null", async () => {
  const sqlite = openDb();
  const db = fakeD1(sqlite);
  const goc = await vanChuyen.mocToiThieuHienHanh(db);
  assert.deepEqual(goc, { phut: 360, policyId: "d53b6dd9-60e2-4644-8e63-9ca7dcff35d0", canhBaoPhut: 120 });
  chen(sqlite, "cs-moi", 240, new Date(Date.now() - 60_000).toISOString());
  chen(sqlite, "cs-tuong-lai", 30, "2099-01-01T00:00:00.000Z");
  assert.deepEqual(await vanChuyen.mocToiThieuHienHanh(db), { phut: 240, policyId: "cs-moi", canhBaoPhut: 120 });
  const rong = openDb();
  rong.exec("DROP TRIGGER vc_dispatch_policy_no_delete; DELETE FROM vc_dispatch_policy");
  assert.equal(await vanChuyen.mocToiThieuHienHanh(fakeD1(rong)), null);
});

const loi = (r: { ok: boolean; message?: string }): string => {
  assert.equal(r.ok, false, "phải bị từ chối");
  return String((r as { message: string }).message);
};

test("kiemChinhSachMoi: đủ NĂM giá trị trong khoảng (kẹp lùi giờ khai 1…1440 — ADR-0050 VK1-A, BẮT BUỘC — I43); mốc KHÔNG tắt được (> 0 — chủ trả lời lần 9, GA-5); hợp đồng chỉ nhận false; không nhận ngày hiệu lực (I28); thiếu / sai kiểu → từ chối", () => {
  const du = { minLeadMinutes: 360, warnLeadMinutes: 120, restMinutes: 30, requireManifest: true, proxyBackdateMaxMinutes: 180, dutyDayMaxMinutes: 480, tripNoBreakMaxMinutes: 240, departureWindowMinutes: 720, refuseLeadMinutes: 720, officePhone: null, acceptWaitMinutes: 10, autoConfirmTransfer: true };
  assert.deepEqual(kiemChinhSachMoi(du), { ok: true, value: du });
  assert.deepEqual(kiemChinhSachMoi({ ...du, minLeadMinutes: 1, warnLeadMinutes: 0, restMinutes: 0, requireManifest: false, requireContract: false, proxyBackdateMaxMinutes: 1 }), {
    ok: true, value: { minLeadMinutes: 1, warnLeadMinutes: 0, restMinutes: 0, requireManifest: false, proxyBackdateMaxMinutes: 1, dutyDayMaxMinutes: 480, tripNoBreakMaxMinutes: 240, departureWindowMinutes: 720, refuseLeadMinutes: 720, officePhone: null, acceptWaitMinutes: 10, autoConfirmTransfer: true },
  });
  assert.deepEqual(kiemChinhSachMoi({ ...du, proxyBackdateMaxMinutes: 1440 }), { ok: true, value: { ...du, proxyBackdateMaxMinutes: 1440 } });
  for (const v of [0, 1441, -1, 1.5, "180", null]) assert.match(loi(kiemChinhSachMoi({ ...du, proxyBackdateMaxMinutes: v })), /khai lùi/, `kẹp lùi ${String(v)}`);
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

test("VK2-B B1 (khuôn I43): thân THIẾU dutyDayMaxMinutes hoặc tripNoBreakMaxMinutes → 400 câu 'tải lại trang' (Review Focus 5); ngoài khoảng → 400; đủ → ok", () => {
  const GOC = { minLeadMinutes: 360, warnLeadMinutes: 120, restMinutes: 30, requireManifest: true, proxyBackdateMaxMinutes: 180, dutyDayMaxMinutes: 480, tripNoBreakMaxMinutes: 240, departureWindowMinutes: 720, refuseLeadMinutes: 720, officePhone: null, acceptWaitMinutes: 10, autoConfirmTransfer: true };
  assert.equal(kiemChinhSachMoi(GOC).ok, true);
  for (const k of ["dutyDayMaxMinutes", "tripNoBreakMaxMinutes"] as const) {
    const { [k]: _bo, ...thieu } = GOC;
    assert.match(loi(kiemChinhSachMoi(thieu)), /tải lại trang/, k);
  }
  for (const sai of [{ dutyDayMaxMinutes: 59 }, { dutyDayMaxMinutes: 1441 }, { dutyDayMaxMinutes: 480.5 }, { tripNoBreakMaxMinutes: 29 }, { tripNoBreakMaxMinutes: 721 }, { tripNoBreakMaxMinutes: "240" }]) {
    assert.equal(kiemChinhSachMoi({ ...GOC, ...sai }).ok, false, JSON.stringify(sai));
  }
  assert.equal(kiemChinhSachMoi({ ...GOC, dutyDayMaxMinutes: 60, tripNoBreakMaxMinutes: 720 }).ok, true);
});

test("bù lệch I43 (0071 thêm cột bằng ADD COLUMN có DEFAULT): câu chèn chính sách liệt kê ĐỦ mọi cột của vc_dispatch_policy (không cột nào sống nhờ DEFAULT)", () => {
  const cotBang = (openDb().prepare("PRAGMA table_info(vc_dispatch_policy)").all() as { name: string }[]).map((c) => c.name).sort();
  const src = readFileSync(new URL("./repository.ts", import.meta.url), "utf8");
  const m = /"insert_dispatch_policy",\s*`INSERT INTO vc_dispatch_policy \(([^)]+)\)/.exec(src);
  assert.ok(m, "không tìm thấy câu insert_dispatch_policy");
  assert.deepEqual(m[1]!.split(",").map((s) => s.trim()).sort(), cotBang);
});

test("ADR-0096 Đ2.3 (khuôn I43): thân THIẾU departureWindowMinutes → 400 'tải lại trang'; ngoài 60…2880 phút / không nguyên / chuỗi → 400; biên → ok; nhật ký ghi trước → sau", () => {
  const GOC = { minLeadMinutes: 360, warnLeadMinutes: 120, restMinutes: 30, requireManifest: true, proxyBackdateMaxMinutes: 180, dutyDayMaxMinutes: 480, tripNoBreakMaxMinutes: 240, departureWindowMinutes: 720, refuseLeadMinutes: 720, officePhone: null, acceptWaitMinutes: 10, autoConfirmTransfer: true };
  const { departureWindowMinutes: _bo, ...thieu } = GOC;
  assert.match(loi(kiemChinhSachMoi(thieu)), /cửa sổ cho xe chạy.*tải lại trang/i);
  for (const v of [59, 2881, 90.5, "720", null]) assert.match(loi(kiemChinhSachMoi({ ...GOC, departureWindowMinutes: v })), /Cửa sổ cho xe chạy/, String(v));
  assert.equal(kiemChinhSachMoi({ ...GOC, departureWindowMinutes: 60 }).ok, true);
  assert.equal(kiemChinhSachMoi({ ...GOC, departureWindowMinutes: 2880 }).ok, true);
  assert.match(chiTietChinhSach(GOC, { ...GOC, departureWindowMinutes: 1440 }), /cửa sổ cho xe chạy 720 → 1440 phút/);
});

test("ADR-0111 Đ3 (c) / ADR-0052 D4.1 (khuôn I43): thân THIẾU acceptWaitMinutes hoặc autoConfirmTransfer → 'tải lại trang'; chờ ngoài 1…120 phút / không nguyên / công tắc không phải đúng-sai → từ chối; biên → ok; nhật ký trước → sau", () => {
  const GOC = { minLeadMinutes: 360, warnLeadMinutes: 120, restMinutes: 30, requireManifest: true, proxyBackdateMaxMinutes: 180, dutyDayMaxMinutes: 480, tripNoBreakMaxMinutes: 240,
    departureWindowMinutes: 720, refuseLeadMinutes: 720, officePhone: null, acceptWaitMinutes: 10, autoConfirmTransfer: true };
  for (const k of ["acceptWaitMinutes", "autoConfirmTransfer"] as const) {
    const { [k]: _bo, ...thieu } = GOC;
    assert.match(loi(kiemChinhSachMoi(thieu)), /chuyển khách.*tải lại trang/i, k);
  }
  for (const v of [0, 121, 5.5, "10", null]) assert.match(loi(kiemChinhSachMoi({ ...GOC, acceptWaitMinutes: v })), /chờ tài xế xe nhận/i, String(v));
  for (const v of [1, 0, "true", null]) assert.match(loi(kiemChinhSachMoi({ ...GOC, autoConfirmTransfer: v })), /tự đồng ý/i, String(v));
  assert.equal(kiemChinhSachMoi({ ...GOC, acceptWaitMinutes: 1 }).ok, true);
  assert.equal(kiemChinhSachMoi({ ...GOC, acceptWaitMinutes: 120, autoConfirmTransfer: false }).ok, true);
  assert.match(chiTietChinhSach(GOC, { ...GOC, acceptWaitMinutes: 15, autoConfirmTransfer: false }), /chờ nhận chuyển khách 10 → 15 phút; tự đồng ý chuyển khách có → không/);
});
