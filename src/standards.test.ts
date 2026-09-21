// Bài kiểm chống trôi cho bộ tiêu chuẩn nền tảng (đặc tả docs/superpowers/specs/2026-09-21-bo-tieu-chuan-nen-tang-design.md, mục 4H).
// Nhóm 1: bản ghim playbook/ (ADR-0012). Các nhóm 2–5 (overlay, sơ đồ sinh, mục lục, bộ sinh ER) thêm ở các Task sau.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { MANIFEST_NAME, renderManifest } from "../scripts/playbook-manifest-lib.mjs";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const PIN = join(ROOT, "playbook");
const read = (p: string): string => readFileSync(join(PIN, p), "utf8");
const byteOrder = (a: string, b: string): number => Buffer.compare(Buffer.from(a), Buffer.from(b));

/** Đi cây thư mục ĐỘC LẬP với thư viện sinh manifest, để lỗi của thư viện không che lỗi thật. */
function filesOnDisk(): string[] {
  const entries = readdirSync(PIN, { recursive: true, withFileTypes: true });
  return entries
    .filter((e) => !e.isDirectory() && e.name !== ".DS_Store")
    .map((e) => join(e.parentPath, e.name).slice(PIN.length + 1).split("\\").join("/"))
    .sort(byteOrder);
}

test("playbook/: có bản ghim (PIN-README, manifest, Hiến pháp, Governance, Playbook, Changelog)", () => {
  for (const f of ["PIN-README.md", MANIFEST_NAME, "CONSTITUTION.md", "GOVERNANCE.md", "PLAYBOOK.md", "CHANGELOG.md"]) assert.ok(existsSync(join(PIN, f)), `thiếu playbook/${f}`);
});

test("playbook/: đúng phiên bản Hiến pháp v2.3.0 và Governance v1.0.0", () => {
  assert.match(read("CONSTITUTION.md").slice(0, 1500), /\*\*Phiên bản:\*\* v2\.3\.0/);
  assert.match(read("GOVERNANCE.md").slice(0, 1500), /\*\*Phiên bản:\*\* v1\.0\.0/);
});

test("playbook/: manifest đúng định dạng shasum, sắp theo byte, NFC, không tự liệt kê chính nó", () => {
  const lines = read(MANIFEST_NAME).split("\n");
  assert.equal(lines.pop(), "", "manifest phải kết thúc bằng xuống dòng");
  const paths = lines.map((l) => {
    const m = /^([0-9a-f]{64}) {2}(\S.*)$/.exec(l);
    assert.ok(m, `dòng sai định dạng: ${l}`);
    return m[2]!;
  });
  assert.deepEqual(paths, [...paths].sort(byteOrder), "phải sắp theo byte");
  assert.equal(new Set(paths).size, paths.length, "có đường dẫn trùng");
  for (const p of paths) assert.equal(p, p.normalize("NFC"), `không phải NFC: ${p}`);
  assert.ok(!paths.includes(MANIFEST_NAME), "manifest không được liệt kê chính nó");
});

test("playbook/: tệp trên đĩa = tệp trong manifest ∪ {manifest} (không tệp thừa, không tệp mất)", () => {
  const listed = read(MANIFEST_NAME).split("\n").filter(Boolean).map((l) => l.slice(66)); // 64 hex + 2 khoảng trắng
  assert.deepEqual(filesOnDisk(), [...listed, MANIFEST_NAME].sort(byteOrder));
});

test("playbook/: băm khớp (thư viện VÀ đối chiếu độc lập bằng shasum/sha256sum -c)", () => {
  assert.equal(renderManifest(PIN), read(MANIFEST_NAME), "manifest lệch nội dung tệp — CHỈ chạy lại scripts/pin-playbook-manifest.mjs sau khi chủ dự án duyệt việc sửa/nâng ghim");
  const first = spawnSync("shasum", ["-a", "256", "-c", MANIFEST_NAME], { cwd: PIN, encoding: "utf8" });
  const r = first.error ? spawnSync("sha256sum", ["-c", MANIFEST_NAME], { cwd: PIN, encoding: "utf8" }) : first;
  assert.equal(r.status, 0, `đối chiếu độc lập thất bại:\n${`${r.stdout ?? ""}${r.stderr ?? ""}`.slice(0, 1500)}`);
});

test("playbook/: đã loại CLAUDE.md và archive/ của Core (dạy sai ở nơi bản chép chỉ-đọc)", () => {
  assert.ok(!existsSync(join(PIN, "CLAUDE.md")), "playbook/CLAUDE.md của Core không được chép");
  assert.ok(!existsSync(join(PIN, "archive")), "playbook/archive/ của Core không được chép");
});

test("playbook/: KHÔNG tệp nào có bit thực thi (Core chỉ có init-project.sh thực thi; chạy nhầm nó tạo thư mục dự án rác ngay trong gốc repo)", () => {
  const executable = filesOnDisk().filter((f) => (statSync(join(PIN, f)).mode & 0o111) !== 0);
  assert.deepEqual(executable, [], `tệp có bit thực thi dưới playbook/: ${executable.join(", ")}`);
});

test("playbook/PIN-README.md: nêu nguồn, điều CẤM và điều không áp dụng", () => {
  const t = read("PIN-README.md");
  for (const need of [
    /CoreSchemaProject\/playbook/, /65a3c2b25d9f01b4deaefe1bd81e559aa8fd50e8/, /CHƯA xác nhận cây sạch/, /archive\//, /CLAUDE\.md/,
    /init-project\.sh/, /CẤM chạy/, /\.PINNED_VERSION/, /Sửa thẳng tại đây/, /04-CONSTRAINTS/, /ADR-0012/, /diff -r/, /pin-playbook-manifest/,
  ]) assert.match(t, need, `PIN-README thiếu: ${need}`);
});

test(".gitattributes: playbook/** không bị đổi kiểu xuống dòng (băm phải bền trên mọi hệ) — kiểm dòng khai VÀ hiệu lực thật bằng git check-attr", () => {
  assert.match(readFileSync(join(ROOT, ".gitattributes"), "utf8"), /^playbook\/\*\* -text$/m);
  // Hiệu lực thật: một dòng khác (ví dụ `* text=auto eol=crlf` nối sau) có thể đè dòng trên mà dòng trên vẫn còn nguyên trong tệp.
  const r = spawnSync("git", ["check-attr", "text", "playbook/CONSTITUTION.md"], { cwd: ROOT, encoding: "utf8" });
  assert.equal(r.error, undefined, `không chạy được git check-attr (bài này KHÔNG được âm thầm bỏ qua): ${r.error?.message}`);
  assert.equal(r.status, 0, `git check-attr thoát ${r.status}:\n${r.stderr}`);
  assert.match(r.stdout.trim(), /text: unset$/, `thuộc tính text của playbook/ không còn là unset: ${r.stdout.trim()}`);
});
