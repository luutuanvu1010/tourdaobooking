#!/usr/bin/env node
// `npm run lam-moi-dev` — CHỦ DỰ ÁN tự gõ. Xoá sạch D1 của bản Development, áp lại migration, tạo bảy tài khoản thử (ADR-0162 Đ2).
// Logic và bài kiểm nằm ở scripts/moi-truong-lib.mjs. Tệp này chỉ nối I/O thật. Không nhận tham số.
import { readFileSync } from "node:fs";
import { lamMoiDev } from "./moi-truong-lib.mjs";
import { ask, isTTY, log, ROOT, run } from "./release-shell.mjs";
import { insertStaffSql } from "./staff-lib.mjs";
import { taoTaiKhoanThu } from "./tai-khoan-thu.mjs";

if (process.argv.slice(2).filter((a) => a !== "--").length) {
  log("Lệnh này không nhận tham số. Dùng: npm run lam-moi-dev");
  process.exit(1);
}
process.exitCode = await lamMoiDev({
  run,
  ask,
  log,
  isTTY,
  docTep: (ten) => readFileSync(new URL(ten, `file://${ROOT}`), "utf8"),
  taoTaiKhoan: taoTaiKhoanThu,
  sqlTaiKhoan: insertStaffSql,
});
