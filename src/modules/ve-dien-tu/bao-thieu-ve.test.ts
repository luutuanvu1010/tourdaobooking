// Tin «thiếu vé» (ADR-0175 Đ1.5a) — vòng sửa 1 (I-2): gộp một dòng mỗi nguồn vé, chống lặp 12 giờ, đường cấp bù chỉ báo mã dịch vụ của lô. SQLite thật (src/khung-thu-ve.test.ts).
import { test } from "node:test";
import assert from "node:assert/strict";
import { AT, d1That, nhatKyThu, taoCsdl } from "../../khung-thu-ve.test.ts";
import { capVeChoDon, GIO_CHONG_LAP_THIEU_VE } from "./noi-orders.ts";

const dv = (ma: string, sid: string, nguonVe: "TOUR_DAO" | "HANG_NGOAI" = "TOUR_DAO") =>
  ({ orderId: "o1", serviceId: sid, catalogCode: ma, ngayDi: "2026-11-05", nguonVe, pax: { adult: 1, child: 0, senior: 0, infant: 0 }, coVe: true });
const dong = (d: ReturnType<typeof taoCsdl>) => d.prepare("SELECT target_id, detail FROM audit_log WHERE action = 've_thieu' ORDER BY created_at, rowid").all() as { target_id: string; detail: string }[];
const sau = (gio: number) => new Date(Date.parse(AT) + gio * 3600 * 1000).toISOString();

test("cấp bù (chiBaoMa): đơn hai dịch vụ cùng thiếu vé Tour Đảo chỉ báo mã của lô", async () => {
  const d = taoCsdl();
  const db = d1That(d);
  await capVeChoDon(db, [dv("ZA1", "s1"), dv("ZB1", "s2")], "u1", nhatKyThu(db), AT, "ZA1");
  const r = dong(d);
  assert.equal(r.length, 1);
  assert.match(r[0]!.detail, /ZA1/);
  assert.doesNotMatch(r[0]!.detail, /ZB1/);
  assert.match(r[0]!.detail, /thiếu 1$/);
});

test("xác nhận đơn (không chiBaoMa): báo mọi dịch vụ, gộp một dòng mỗi nguồn vé", async () => {
  const d = taoCsdl();
  const db = d1That(d);
  await capVeChoDon(db, [dv("ZA1", "s1"), dv("ZB1", "s2"), dv("ZC1", "s3", "HANG_NGOAI")], "u1", nhatKyThu(db), AT);
  const r = dong(d);
  assert.deepEqual(r.map((x) => x.target_id).sort(), ["HANG_NGOAI", "TOUR_DAO"]);
  const td = r.find((x) => x.target_id === "TOUR_DAO")!;
  assert.match(td.detail, /ZA1, ZB1/);
  assert.match(td.detail, /thiếu 2$/);
});

test(`chống lặp: cùng đơn, cùng nguồn vé, trong ${GIO_CHONG_LAP_THIEU_VE} giờ không ghi lại; nguồn khác vẫn ghi; quá cửa sổ ghi lại`, async () => {
  const d = taoCsdl();
  const db = d1That(d);
  await capVeChoDon(db, [dv("ZA1", "s1")], "u1", nhatKyThu(db), AT);
  await capVeChoDon(db, [dv("ZA1", "s1")], "u1", nhatKyThu(db), sau(GIO_CHONG_LAP_THIEU_VE - 1));
  assert.equal(dong(d).length, 1, "trong cửa sổ: không ghi lại");
  await capVeChoDon(db, [dv("ZA1", "s1"), dv("ZC1", "s3", "HANG_NGOAI")], "u1", nhatKyThu(db), sau(GIO_CHONG_LAP_THIEU_VE - 1));
  assert.deepEqual(dong(d).map((x) => x.target_id), ["TOUR_DAO", "HANG_NGOAI"], "nguồn hãng ngoài chưa báo: ghi");
  await capVeChoDon(db, [dv("ZA1", "s1")], "u1", nhatKyThu(db), sau(GIO_CHONG_LAP_THIEU_VE + 1));
  assert.equal(dong(d).length, 3, "quá cửa sổ: ghi lại");
});
