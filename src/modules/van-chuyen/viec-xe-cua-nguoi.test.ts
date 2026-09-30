// ADR-0068 Đ2 + [Dừng Q2]: việc xe đang mở của một hồ sơ — tài xế / tổ lái / nhà xe của chuyến chưa chốt (PLANNED, RUNNING) + số xe đứng tên.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { DRIVER, batDongHo, setup, taoChuyen, xe } from "../../../tests/audit/dieu-phoi-khung.mjs";
import { viecXeCuaNguoi } from "./chuyen-repo.ts";

test("tài xế chuyến PLANNED đếm 1; công ty chủ là nhà xe của chuyến + đứng tên xe; chuyến huỷ không tính", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const c = await taoChuyen(w, { xe: xe(w), taiXe: `pty-${DRIVER}` });
    const chu = w.q("SELECT party_id FROM v_pty_owner_company")[0].party_id as string;
    assert.deepEqual(await viecXeCuaNguoi(w.env.DB, `pty-${DRIVER}`), { laiChuyen: 1, toLaiChuyen: 0, chuXeChuyen: 0, soXe: 0 });
    assert.deepEqual(await viecXeCuaNguoi(w.env.DB, chu), { laiChuyen: 0, toLaiChuyen: 0, chuXeChuyen: 1, soXe: 1 });
    w.sqlite.prepare("UPDATE vc_trip SET status = 'CANCELLED', cancel_reason_code = 'HUY_KHAC' WHERE id = ?").run(c.chuyen.id);
    assert.equal((await viecXeCuaNguoi(w.env.DB, `pty-${DRIVER}`)).laiChuyen, 0);
  } finally {
    tat();
  }
});
