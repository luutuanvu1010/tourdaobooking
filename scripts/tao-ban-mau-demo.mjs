#!/usr/bin/env node
// Dựng phần tĩnh của BẢN DÙNG THỬ (ADR-0223): node scripts/tao-ban-mau-demo.mjs <mã-commit-40-hex>
// Gieo dữ liệu mẫu trên khung thử (cả ứng dụng, SQLite trong máy, không mạng) → xuất bản mẫu → sao public/ sang dist-demo/ kèm bản mẫu. Không chạm Cloudflare.
import { readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { gieoDuLieuMau, xuatBanMau } from "./ban-mau-lib.mjs";
import { dungTaiSanDemo } from "./demo-lib.mjs";
import { docBanMau } from "../src/shared/ban-dung-thu.ts";

const goc = join(dirname(fileURLToPath(import.meta.url)), "..");
const commit = process.argv[2];
try {
  const { world, seedStaff } = await import("../tests/audit/harness.mjs");
  const w = world();
  await gieoDuLieuMau(w, seedStaff);
  const tenMigration = readdirSync(join(goc, "migrations")).filter((f) => f.endsWith(".sql")).sort();
  const banMau = xuatBanMau(w.sqlite, { commit, tenMigration });
  if (!docBanMau(banMau, tenMigration.length)) throw new Error("bản mẫu sinh ra không đạt kiểm (dạng, bảng dấu, số migration).");
  dungTaiSanDemo({ goc: join(goc, "public"), dich: join(goc, "dist-demo"), commit, banMau });
  console.log(`Đã dựng dist-demo/ (commit ${commit}, bản mẫu ${banMau.cau.length} câu, ${Math.round(Buffer.byteLength(JSON.stringify(banMau)) / 1024)} KB).`);
  process.exit(0);
} catch (e) {
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
}
