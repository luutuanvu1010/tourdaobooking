// Dựng NHANH D1 tạm cho e2e và máy đo khung gốc (rút lượt kiểm GitHub, 25/11/2026): gộp mọi migrations/*.sql thành MỘT tệp rồi chạy bằng MỘT lệnh
// `wrangler d1 execute --local --file`, thay `wrangler d1 migrations apply --local` (đo: 66 giây mỗi phần e2e trên máy GitHub, 22 giây trên Mac — wrangler xử lý
// từng tệp một; một lệnh gộp: ~2 giây). Cùng bộ máy D1 cục bộ (workerd), cùng các câu lệnh, cùng thứ tự.
// Tương đương với `migrations apply` KHÔNG dựa vào lời hứa: bài src/d1-tam.test.ts dựng D1 bằng CẢ HAI cách trong mỗi lượt kiểm và so toàn bộ schema
// (bảng, chỉ mục, view, trigger) và dữ liệu do migration chèn (chỉ bỏ giờ tạo và mã ngẫu nhiên). Lệch ⇒ npm test đỏ. Bảng `d1_migrations` được ghi y như
// wrangler ghi (tên tệp, theo thứ tự) để lệnh `migrations apply` chạy sau trên cùng D1 không áp lại.
// Production KHÔNG dùng tệp này: `migrations apply --remote` vẫn do chủ chạy qua `npm run trien-khai`.
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

/** Tên các tệp migration theo thứ tự wrangler áp (sắp theo tên). */
export function tepMigration(goc) {
  return readdirSync(join(goc, "migrations")).filter((f) => f.endsWith(".sql")).sort();
}

/** Bỏ chú thích `--` cuối dòng và khoảng trắng để biết tệp có kết thúc bằng `;` không (gộp hai tệp mà tệp trước thiếu `;` là nhập hai câu làm một). */
function ketThucBangChamPhay(sql) {
  return sql.replace(/--[^\n]*/g, "").trim().endsWith(";");
}

/**
 * Chuỗi SQL gộp: từng tệp migration nguyên văn, theo thứ tự, rồi bảng `d1_migrations` (cùng định nghĩa wrangler tạo) và một dòng cho mỗi tệp.
 * Tệp nào không kết thúc bằng `;` ⇒ ném lỗi (không đoán cách nối).
 */
export function sqlGop(goc) {
  const ds = tepMigration(goc);
  const phan = [];
  for (const f of ds) {
    const sql = readFileSync(join(goc, "migrations", f), "utf8");
    if (!ketThucBangChamPhay(sql)) throw new Error(`migrations/${f} không kết thúc bằng «;» — không gộp được an toàn`);
    phan.push(`-- ===== ${f}\n${sql}\n`);
  }
  phan.push(
    'CREATE TABLE IF NOT EXISTS "d1_migrations"(\n\t\tid         INTEGER PRIMARY KEY AUTOINCREMENT,\n\t\tname       TEXT UNIQUE,\n\t\tapplied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL\n);',
    ...ds.map((f) => `INSERT INTO d1_migrations (name) VALUES ('${f.replaceAll("'", "''")}');`),
  );
  return phan.join("\n");
}

/**
 * Áp mọi migration lên D1 cục bộ ở `persist` bằng một lệnh. `wrangler(args)` là hàm gọi `npx wrangler …` của nơi dùng (đồng bộ hay bất đồng bộ đều được:
 * hàm này trả về đúng thứ `wrangler` trả). Tệp gộp ghi vào chính thư mục `persist` (D1 tạm, xoá cùng nó).
 */
export function apMigrationNhanh(goc, persist, wrangler) {
  const tep = join(persist, "migrations-gop.sql");
  writeFileSync(tep, sqlGop(goc));
  return wrangler(["d1", "execute", "tourdao-sales-db", "--local", "--persist-to", persist, "--file", tep]);
}
