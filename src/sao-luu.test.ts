// Sao lưu hằng tuần (Đợt 2 sau kiểm toán, docs/superpowers/specs/2026-11-16-dot-2-lay-lai-duoc-du-lieu.md): phần thuần của scripts/sao-luu-lib.mjs
// và một vòng mã hoá → giải mã thật bằng openssl với CHÍNH tham số mà scripts/sao-luu.mjs và scripts/dien-tap-khoi-phuc.mjs dùng.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
// @ts-ignore — tệp .mjs không có kiểu
import { tenBan, docTen, chonXoa, soNgayTuBanMoiNhat, KHUON_TEN, THAM_SO_OPENSSL, BIEN_MAT_KHAU, KHO_R2 } from "../scripts/sao-luu-lib.mjs";

const t = (s: string) => `tourdao-${s}.tar.gz.enc`;

test("tên bản theo giờ Việt Nam và khớp khuôn", () => {
  const ten = tenBan(new Date("2026-11-15T20:30:00Z")); // 03:30 ngày 16/11 giờ VN
  assert.equal(ten, "tourdao-20261116-0330");
  assert.ok(KHUON_TEN.test(`${ten}.tar.gz.enc`));
  assert.equal(docTen(`${ten}.tar.gz.enc`).thang, "2026-11");
  assert.equal(docTen("tourdao-20261116-0330.tar.gz"), null);
});

test("giữ 8 bản tuần mới nhất + bản mới nhất mỗi tháng trong 12 tháng; tệp lạ không bao giờ bị chọn", () => {
  // 70 tuần liên tiếp, mỗi Chủ nhật một bản.
  const ds: string[] = [];
  for (let i = 0; i < 70; i++) {
    const d = new Date(Date.UTC(2025, 8, 7) + i * 7 * 86_400_000);
    ds.push(t(`${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(d.getUTCDate()).padStart(2, "0")}-1000`));
  }
  const la = ["ghi-chu.txt", "tourdao-20250101-1000.tar.gz.enc.dang-chep"];
  const xoa = chonXoa([...la, ...ds]);
  const con = ds.filter((x) => !xoa.includes(x));
  for (const x of la) assert.ok(!xoa.includes(x), `không được xoá ${x}`);
  const moiNhat = [...ds].sort().reverse();
  for (const x of moiNhat.slice(0, 8)) assert.ok(con.includes(x), `phải giữ bản tuần ${x}`);
  const thangCon = new Set(con.map((x: string) => docTen(x).thang));
  assert.equal(thangCon.size, 12, "đúng 12 tháng có bản");
  assert.ok(con.length <= 8 + 12 && con.length >= 12);
  assert.deepEqual(chonXoa([t("20261116-1000")]), [], "một bản duy nhất không bao giờ bị xoá");
  assert.deepEqual(chonXoa([]), []);
});

test("chạy bù: tuổi bản mới nhất tính theo tên tệp", () => {
  const now = new Date("2026-11-16T03:00:00Z"); // 10:00 giờ VN
  assert.equal(soNgayTuBanMoiNhat([], now), Infinity);
  assert.equal(soNgayTuBanMoiNhat(["khac.txt"], now), Infinity);
  assert.equal(Math.round(soNgayTuBanMoiNhat([t("20261109-1000"), t("20261102-1000")], now)), 7);
});

test("năm kho R2 khớp wrangler.jsonc", () => {
  const cauHinh = readFileSync(new URL("../wrangler.jsonc", import.meta.url), "utf8");
  const kho = [...cauHinh.matchAll(/"bucket_name"\s*:\s*"([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual([...new Set(kho)].sort(), [...KHO_R2].sort());
});

test("mã hoá rồi giải mã bằng cùng tham số ra đúng nội dung; sai mật khẩu thì không mở được", () => {
  const d = mkdtempSync(join(tmpdir(), "tourdao-sao-luu-test-"));
  try {
    writeFileSync(join(d, "a.txt"), "dữ liệu thử 123");
    const env = (mk: string) => ({ ...process.env, [BIEN_MAT_KHAU]: mk });
    const ma = spawnSync("openssl", [...THAM_SO_OPENSSL, "-salt", "-in", join(d, "a.txt"), "-out", join(d, "a.enc")], { env: env("mat-khau-thu-dai") });
    assert.equal(ma.status, 0, String(ma.stderr));
    assert.ok(!readFileSync(join(d, "a.enc")).includes(Buffer.from("123")), "tệp mã hoá không lộ chữ gốc");
    const giai = spawnSync("openssl", [...THAM_SO_OPENSSL, "-d", "-in", join(d, "a.enc")], { env: env("mat-khau-thu-dai"), encoding: "utf8" });
    assert.equal(giai.stdout, "dữ liệu thử 123");
    const sai = spawnSync("openssl", [...THAM_SO_OPENSSL, "-d", "-in", join(d, "a.enc")], { env: env("mat-khau-sai-roi"), encoding: "utf8" });
    assert.notEqual(sai.stdout, "dữ liệu thử 123");
  } finally {
    rmSync(d, { recursive: true, force: true });
  }
});

// ---- Tách bản xuất D1 (scripts/tach-ban-xuat-d1.mjs) — diễn tập thử 16/11 bắt lỗi bản cũ cắt đôi trigger có `CASE … END;` giữa thân.
// @ts-ignore — tệp .mjs không có kiểu
import { tachBanXuat } from "../scripts/tach-ban-xuat-d1.mjs";
import { DatabaseSync } from "node:sqlite";
import { readdirSync } from "node:fs";

test("trigger có CASE … END; giữa thân, chuỗi chứa ; và END, chú thích: tách đúng", () => {
  const sql = [
    "PRAGMA defer_foreign_keys=TRUE;",
    "CREATE TABLE a (x TEXT, y INTEGER); -- chú thích có ; END;",
    "CREATE TRIGGER t1 BEFORE INSERT ON a",
    "BEGIN",
    "  SELECT CASE WHEN NEW.y < 0 THEN RAISE(ABORT, 'âm; END;')",
    "  END;",
    "  SELECT 1;",
    "END;",
    "CREATE INDEX a_ix ON a(x);",
    "CREATE TRIGGER t2 BEFORE DELETE ON a BEGIN SELECT RAISE(ABORT, \"không xoá\"); END;",
    "/* khối ; END; */ CREATE VIEW v AS SELECT x FROM a;",
    "",
  ].join("\n");
  const r = tachBanXuat(sql);
  assert.equal(r.soTrigger, 2);
  assert.equal(r.soCauTruc, 4);
  const db = new DatabaseSync(":memory:");
  db.exec(r.cauTruc);
  db.exec(r.trigger);
  assert.throws(() => db.exec("INSERT INTO a VALUES ('k', -1)"), /âm/);
});

test("schema đầy đủ từ mọi migration: tách xong nạp lại được theo cấu trúc → trigger, đủ số trigger", () => {
  const DIR = new URL("../migrations/", import.meta.url);
  const goc = new DatabaseSync(":memory:");
  goc.exec("PRAGMA foreign_keys = ON");
  for (const f of readdirSync(DIR).filter((x) => x.endsWith(".sql")).sort()) goc.exec(readFileSync(new URL(f, DIR), "utf8"));
  const rows = goc.prepare("SELECT type, sql FROM sqlite_master WHERE sql IS NOT NULL AND name NOT LIKE 'sqlite_%' ORDER BY rowid").all() as { type: string; sql: string }[];
  const soTrigger = rows.filter((x) => x.type === "trigger").length;
  const r = tachBanXuat(rows.map((x) => `${x.sql};\n`).join(""));
  assert.equal(r.soTrigger, soTrigger);
  assert.equal(r.soCauTruc, rows.length - soTrigger);
  const moi = new DatabaseSync(":memory:");
  moi.exec(r.cauTruc);
  moi.exec(r.trigger);
  assert.equal((moi.prepare("SELECT count(*) AS n FROM sqlite_master WHERE type = 'trigger'").get() as { n: number }).n, soTrigger);
});
