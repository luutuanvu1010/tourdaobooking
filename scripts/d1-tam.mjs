// Dựng NHANH D1 tạm cho e2e và máy đo khung gốc (rút lượt kiểm GitHub, 25/11/2026): gộp mọi migrations/*.sql thành MỘT tệp rồi chạy bằng MỘT lệnh
// `wrangler d1 execute --local --file` (khối ≤ 90 KB, xem khoiGop), thay `wrangler d1 migrations apply --local` (đo: 66 giây mỗi phần e2e trên máy GitHub, 22 giây trên Mac — wrangler xử lý
// từng tệp một; 12 khối: 15 giây trên Mac với wrangler 4.135). Cùng bộ máy D1 cục bộ (workerd), cùng các câu lệnh, cùng thứ tự.
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
 * Các khối SQL gộp, theo thứ tự: từng tệp migration nguyên văn (một tệp không bao giờ bị cắt đôi), khối cuối thêm bảng `d1_migrations` (cùng định nghĩa
 * wrangler tạo) và một dòng cho mỗi tệp. Mỗi khối ≤ `tranByte` (trừ khi một tệp tự nó lớn hơn — đứng riêng một khối): wrangler 4.135 (bản khoá trong
 * package-lock) chạy cả tệp `--file` như MỘT câu, quá ~100 KB thì «statement too long: SQLITE_TOOBIG» (lượt kiểm 45515105882, 25/11/2026: Mac lúc đó chạy
 * wrangler 4.147 sót trong node_modules nên không thấy; dò bằng 4.135: khối 100 KB đạt, 300 KB hỏng). Tệp nào không kết thúc bằng `;` ⇒ ném lỗi.
 */
export const TRAN_KHOI_BYTE = 90_000;
export function khoiGop(goc, tranByte = TRAN_KHOI_BYTE) {
  const ds = tepMigration(goc);
  const khoi = [];
  let dang = [];
  let co = 0;
  const dong = () => { if (dang.length) khoi.push(dang.join("\n")); dang = []; co = 0; };
  const them = (doan) => {
    const n = Buffer.byteLength(doan, "utf8") + 1;
    if (co > 0 && co + n > tranByte) dong();
    dang.push(doan);
    co += n;
  };
  for (const f of ds) {
    const sql = readFileSync(join(goc, "migrations", f), "utf8");
    if (!ketThucBangChamPhay(sql)) throw new Error(`migrations/${f} không kết thúc bằng «;» — không gộp được an toàn`);
    them(`-- ===== ${f}\n${sql}\n`);
  }
  them(['CREATE TABLE IF NOT EXISTS "d1_migrations"(\n\t\tid         INTEGER PRIMARY KEY AUTOINCREMENT,\n\t\tname       TEXT UNIQUE,\n\t\tapplied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL\n);',
    ...ds.map((f) => `INSERT INTO d1_migrations (name) VALUES ('${f.replaceAll("'", "''")}');`)].join("\n"));
  dong();
  return khoi;
}

/** Toàn bộ SQL gộp (nối các khối) — để đọc và cho bài kiểm. */
export function sqlGop(goc) {
  return khoiGop(goc).join("\n");
}

/**
 * Áp mọi migration lên D1 cục bộ ở `persist`: mỗi khối một lệnh `d1 execute --file`, LẦN LƯỢT. `wrangler(args)` là hàm gọi `npx wrangler …` của nơi dùng
 * (đồng bộ hay trả Promise đều được; bất đồng bộ thì trả Promise xong khi khối cuối xong). Tệp khối ghi vào chính thư mục `persist` (D1 tạm, xoá cùng nó).
 */
export function apMigrationNhanh(goc, persist, wrangler) {
  const tep = khoiGop(goc).map((sql, i) => {
    const p = join(persist, `migrations-gop-${i + 1}.sql`);
    writeFileSync(p, sql);
    return p;
  });
  const chay = (i) => {
    if (i >= tep.length) return undefined;
    const r = wrangler(["d1", "execute", "tourdao-sales-db", "--local", "--persist-to", persist, "--file", tep[i]]);
    return r && typeof r.then === "function" ? r.then(() => chay(i + 1)) : chay(i + 1);
  };
  return chay(0);
}
