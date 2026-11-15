// Bài dựng tài sản riêng cho bản Development (ADR-0162). Dựng từ public/ thật vào thư mục tạm; không ghi vào public/.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

type Lib = {
  dungTaiSanDev: (o: { goc: string; dich: string; commit: string }) => void;
  quetBanChinh: (dich: string) => string[];
};
const lib = (await import(new URL("../scripts/dung-tai-san-dev.mjs", import.meta.url).href)) as Lib;

const GOC = new URL("../public", import.meta.url).pathname;
const COMMIT = "0123456789abcdef0123456789abcdef01234567";
const tam = () => mkdtempSync(join(tmpdir(), "tourdao-dev-"));
const doc = (d: string, t: string) => readFileSync(join(d, t), "utf8");

const dung = () => {
  const dich = join(tam(), "dist-dev");
  lib.dungTaiSanDev({ goc: GOC, dich, commit: COMMIT });
  return dich;
};

test("mọi trang html mang tên cài Tour Đảo Dev", () => {
  const dich = dung();
  try {
    const trang = readdirSync(dich).filter((t) => t.endsWith(".html"));
    assert.equal(trang.length, readdirSync(GOC).filter((t) => t.endsWith(".html")).length);
    assert.ok(trang.length > 0);
    for (const t of trang) {
      const h = doc(dich, t);
      assert.ok(h.includes('apple-mobile-web-app-title" content="Tour Đảo Dev"'), t);
      assert.ok(!h.includes('apple-mobile-web-app-title" content="Island Booking"'), t);
    }
  } finally {
    rmSync(join(dich, ".."), { recursive: true, force: true });
  }
});

test("manifest, _headers, robots.txt, app.css, ban-thu.json", () => {
  const dich = dung();
  try {
    const m = JSON.parse(doc(dich, "manifest.webmanifest"));
    assert.equal(m.name, "Tour Đảo Dev");
    assert.equal(m.short_name, "Tour Đảo Dev");
    const hd = doc(dich, "_headers");
    assert.ok(hd.includes("wss://dev.tourdao.vn"));
    assert.ok(!hd.includes("booking.tourdao.vn"));
    const khoiChung = hd.split("\n").slice(hd.split("\n").findIndex((d) => d === "/*") + 1).join("\n").split(/\n(?=\S)/)[0];
    assert.ok(khoiChung.includes("X-Robots-Tag: noindex"));
    assert.equal(doc(dich, "robots.txt").trim(), "User-agent: *\nDisallow: /");
    assert.ok(doc(dich, "app.css").includes("BẢN THỬ"));
    assert.deepEqual(JSON.parse(doc(dich, "ban-thu.json")), { commit: COMMIT });
    // Bản gốc không đổi
    assert.ok(readFileSync(join(GOC, "_headers"), "utf8").includes("wss://booking.tourdao.vn"));
    assert.ok(!readFileSync(join(GOC, "app.css"), "utf8").includes("BẢN THỬ"));
  } finally {
    rmSync(join(dich, ".."), { recursive: true, force: true });
  }
});

test("commit sai khuôn thì ném lỗi", () => {
  for (const c of ["", "abc", "G".repeat(40), COMMIT.toUpperCase(), COMMIT + "0"]) {
    const dich = join(tam(), "dist-dev");
    assert.throws(() => lib.dungTaiSanDev({ goc: GOC, dich, commit: c }), /commit/i, c);
  }
});

test("tệp văn bản cài sẵn chứa booking.tourdao.vn thì ném lỗi", () => {
  const goc = join(tam(), "goc");
  mkdirSync(goc);
  for (const t of readdirSync(GOC)) {
    if (t === "fonts" || t === "icons") continue;
    if (t.endsWith(".html") || t === "_headers" || t === "app.css" || t === "manifest.webmanifest") writeFileSync(join(goc, t), readFileSync(join(GOC, t)));
  }
  writeFileSync(join(goc, "la.js"), "fetch(\"https://booking.tourdao.vn/x\")\n");
  const dich = join(tam(), "dist-dev");
  assert.throws(() => lib.dungTaiSanDev({ goc, dich, commit: COMMIT }), /booking\.tourdao\.vn/);
});

test("quetBanChinh trả danh sách tệp còn chứa miền chính thức", () => {
  const d = tam();
  writeFileSync(join(d, "a.txt"), "ok");
  writeFileSync(join(d, "b.js"), "x booking.tourdao.vn y");
  assert.deepEqual(lib.quetBanChinh(d), ["b.js"]);
  assert.ok(existsSync(d));
});

test("chốt chặn xoá: dich là thư mục cha của goc, hoặc tên khác dist-dev, thì ném lỗi và goc còn nguyên", () => {
  const cha = tam();
  const goc = join(cha, "public");
  mkdirSync(goc);
  writeFileSync(join(goc, "a.txt"), "giữ");
  for (const dich of [cha, goc, join(goc, "dist-dev"), join(tam(), "khac")]) {
    mkdirSync(dich, { recursive: true });
    writeFileSync(join(dich, "x.txt"), "giữ");
    assert.throws(() => lib.dungTaiSanDev({ goc, dich, commit: COMMIT }), /dist-dev|thư mục/i, dich);
    assert.equal(readFileSync(join(goc, "a.txt"), "utf8"), "giữ");
    assert.ok(existsSync(join(dich, "x.txt")), dich);
  }
});
