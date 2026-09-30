// ADR-0068 Đ2 + [Dừng Q2]: việc xe đang mở của một hồ sơ — tài xế / tổ lái / nhà xe của chuyến chưa chốt (PLANNED, RUNNING) + số xe đứng tên.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { DRIVER, DRIVER2, batDongHo, setup, taoChuyen, xe } from "../../../tests/audit/dieu-phoi-khung.mjs";
import { viecXeCuaNguoi } from "./chuyen-repo.ts";

test("tài xế chuyến PLANNED đếm 1; công ty chủ là nhà xe của chuyến + đứng tên xe; chuyến huỷ không tính", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const c = await taoChuyen(w, { xe: xe(w), taiXe: `pty-${DRIVER}` });
    const xeHuu = xe(w); // xe thứ hai, sẽ cho nghỉ hẳn: không được tính là "đang đứng tên"
    const chu = w.q("SELECT party_id FROM v_pty_owner_company")[0].party_id as string;
    assert.deepEqual(await viecXeCuaNguoi(w.env.DB, `pty-${DRIVER}`), { laiChuyen: 1, toLaiChuyen: 0, chuXeChuyen: 0, soXe: 0 });
    assert.equal((await viecXeCuaNguoi(w.env.DB, chu)).soXe, 2, "hai xe đang hoạt động");
    w.sqlite.prepare("UPDATE vc_vehicle SET status = 'retired', valid_to_date = '2026-09-30' WHERE id = ?").run(xeHuu);
    assert.deepEqual(await viecXeCuaNguoi(w.env.DB, chu), { laiChuyen: 0, toLaiChuyen: 0, chuXeChuyen: 1, soXe: 1 });
    // đường tổ lái (CREW): dòng suất CREW đang mở của hồ sơ trên chuyến PLANNED → 1; đóng dòng → 0
    const crew = `pty-${DRIVER2}`;
    const AT = "2027-03-11T00:00:00.000Z";
    w.sqlite.prepare("INSERT INTO vc_trip_allocation (id, trip_id, kind, crew_party_id, status, valid_from_at, created_at, updated_at) VALUES ('al1', ?, 'CREW', ?, 'WAITING', ?, ?, ?)")
      .run(c.chuyen.id, crew, AT, AT, AT);
    assert.equal((await viecXeCuaNguoi(w.env.DB, crew)).toLaiChuyen, 1);
    w.sqlite.prepare("UPDATE vc_trip_allocation SET valid_to_at = ?, close_reason = 'REMOVED' WHERE id = 'al1'").run(AT);
    assert.equal((await viecXeCuaNguoi(w.env.DB, crew)).toLaiChuyen, 0);
    w.sqlite.prepare("UPDATE vc_trip SET status = 'CANCELLED', cancel_reason_code = 'HUY_KHAC' WHERE id = ?").run(c.chuyen.id);
    assert.equal((await viecXeCuaNguoi(w.env.DB, `pty-${DRIVER}`)).laiChuyen, 0);
  } finally {
    tat();
  }
});
