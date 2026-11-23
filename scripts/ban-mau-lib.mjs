// Bản mẫu của BẢN DÙNG THỬ (ADR-0223 Đ2.1): gieo dữ liệu mẫu lên một CSDL dựng từ migration (khung thử tests/audit/harness.mjs — chạy CẢ ứng dụng, không mạng),
// rồi xuất thành danh sách câu lệnh để Worker dùng thử nạp lại mỗi 2 giờ. Dùng chung cho scripts/tao-ban-mau-demo.mjs và bài src/ban-dung-thu.test.ts.
// Không có PIN thật: hai tài khoản mang băm giả, Worker đặt PIN từ bí mật ngay trong lô làm mới.
import { readdirSync } from "node:fs";
import { BANG_DAU, GIA_TRI_DAU, ID_DUNG_THU, ID_TOAN_QUYEN_DEMO, SDT_DUNG_THU, SDT_TOAN_QUYEN_DEMO } from "../src/shared/ban-dung-thu.ts";

const q = (n) => `"${n.replaceAll('"', '""')}"`;
const lit = (v) => (v === null ? "NULL" : typeof v === "number" || typeof v === "bigint" ? String(v) : v instanceof Uint8Array ? `X'${Buffer.from(v).toString("hex")}'` : `'${String(v).replaceAll("'", "''")}'`);
const noiBo = (n) => n.startsWith("sqlite_") || n.startsWith("_cf_");
/** Trần một câu của D1 là 100 KB (tính BYTE); để 60 KB cho chắc. */
const TRAN_CAU_BYTE = 60_000;
/** Dữ liệu của lúc gieo, không mang vào bản mẫu. */
const BO_DU_LIEU = new Set(["aut_session", "login_attempt", "lg_lan_gui"]);

export const soMigrationCuaMa = (thuMucMigration) => readdirSync(thuMucMigration).filter((f) => f.endsWith(".sql")).length;

/**
 * Xuất CSDL (`node:sqlite` DatabaseSync) thành bản mẫu. Thứ tự: bảng → dữ liệu (gộp nhiều dòng một câu) → chỉ mục → view → trigger (trigger sau cùng để luật
 * vòng đời không chặn gieo). Thêm bảng `d1_migrations` (tên các tệp migration — như wrangler ghi) và bảng dấu.
 */
export function xuatBanMau(sqlite, { commit, tenMigration }) {
  const obj = sqlite.prepare("SELECT type, name, sql FROM sqlite_master WHERE sql IS NOT NULL").all().filter((r) => !noiBo(r.name) && r.name !== "d1_migrations" && r.name !== BANG_DAU);
  const bang = obj.filter((r) => r.type === "table");
  const cau = bang.map((t) => t.sql);
  cau.push("CREATE TABLE d1_migrations(\n\t\tid         INTEGER PRIMARY KEY AUTOINCREMENT,\n\t\tname       TEXT UNIQUE,\n\t\tapplied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL\n)");
  cau.push(`CREATE TABLE ${BANG_DAU} (gia_tri TEXT NOT NULL)`);
  for (const t of bang) {
    if (BO_DU_LIEU.has(t.name)) continue;
    let dau = null;
    let gom = [];
    let dai = 0;
    const day = () => {
      if (gom.length) cau.push(dau + gom.join(","));
      gom = [];
      dai = 0;
    };
    for (const row of sqlite.prepare(`SELECT * FROM ${q(t.name)}`).all()) {
      const cols = Object.keys(row);
      dau ??= `INSERT INTO ${q(t.name)} (${cols.map(q).join(",")}) VALUES `;
      const v = `(${cols.map((c) => lit(row[c])).join(",")})`;
      const b = Buffer.byteLength(v);
      if (dai + b > TRAN_CAU_BYTE) day();
      gom.push(v);
      dai += b;
    }
    day();
  }
  for (let i = 0; i < tenMigration.length; i += 200) cau.push(`INSERT INTO d1_migrations (name) VALUES ${tenMigration.slice(i, i + 200).map((n) => `(${lit(n)})`).join(",")}`);
  cau.push(`INSERT INTO ${BANG_DAU} (gia_tri) VALUES ('${GIA_TRI_DAU}')`);
  for (const k of ["index", "view", "trigger"]) for (const t of obj.filter((r) => r.type === k)) cau.push(t.sql);
  const dai = Math.max(...cau.map((c) => Buffer.byteLength(c)));
  if (dai > 100_000) throw new Error(`bản mẫu có câu dài ${dai} byte (trần D1 100 KB)`);
  return { phienBan: 1, commit, soMigration: tenMigration.length, cau };
}

const NGAY = () => new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);

/**
 * Gieo dữ liệu mẫu lên một `world()` của khung thử: hai tài khoản cố định (dùng thử: quyền Đối tác + vai Công ty lữ hành; Toàn quyền của chủ), chính sách
 * phiên Đối tác = nhiều máy (ADR-0085, dữ liệu — không rẽ nhánh mã), ba hồ sơ đối tác giả, mức hoa hồng giả qua ROUTE THẬT. Tên đều ghi «mẫu».
 */
export async function gieoDuLieuMau(w, seedStaff) {
  seedStaff(w.sqlite, { id: ID_DUNG_THU, phone: SDT_DUNG_THU, name: "Dùng Thử", perms: ["PARTNER"], vai: "TRAVEL_AGENCY" });
  seedStaff(w.sqlite, { id: ID_TOAN_QUYEN_DEMO, phone: SDT_TOAN_QUYEN_DEMO, name: "Toàn Quyền Mẫu", perms: ["SUPER_ADMIN"] });
  const at = new Date().toISOString();
  w.sqlite.prepare("UPDATE staff SET mfa_grace_until = NULL WHERE id IN (?, ?)").run(ID_DUNG_THU, ID_TOAN_QUYEN_DEMO);
  w.sqlite.prepare("INSERT INTO aut_session_policy (id, permission_code, multi, valid_from_at, created_at, updated_at) VALUES ('dt-pol-partner', 'PARTNER', 1, ?1, ?1, ?1)").run(at);
  for (const [id, ten, vai] of [["dt-dl-a", "Đại lý mẫu Biển Xanh", "TRAVEL_AGENCY"], ["dt-dl-b", "Đại lý mẫu Hòn Tre", "TRAVEL_AGENCY"], ["dt-dl-c", "Công ty mẫu Trầm Hương", "TRAVEL_AGENCY"]]) {
    w.sqlite.prepare("INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES (?1, 'ORGANIZATION', ?2, 1, ?3, ?3)").run(id, ten, at);
    w.sqlite.prepare("INSERT INTO pty_party_role (id, party_id, role_type_code, valid_from_date, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?5)").run(`r-${id}`, id, vai, NGAY(), at);
  }
  const r = await w.call("POST", "/api/pricing/hoa-hong", { as: ID_TOAN_QUYEN_DEMO, body: { tuNgay: NGAY(), doiTuong: { loai: "VAI", code: "TRAVEL_AGENCY" }, phamVi: "ALL", kieu: "RATE", tyLeBp: 1000 } });
  if (r.status !== 201) throw new Error(`gieo mức hoa hồng mẫu lỗi ${r.status}: ${r.text.slice(0, 300)}`);
  // Danh mục để trống hạn đồng bộ: lượt lịch chạy ngay sau lần làm mới đọc Sheet thật.
  w.sqlite.exec("UPDATE catalog_sync SET last_attempt_at = NULL, last_success_at = NULL");
}
