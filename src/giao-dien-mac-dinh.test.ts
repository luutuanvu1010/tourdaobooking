// MAC_DINH của src/shared/giao-dien.ts phải bằng giá trị :root của public/app.css (dò chuỗi var()) — app.css là nguồn, đổi mặc định ở đó thì sửa cả hai.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { MAC_DINH, NUM, PHONG } from "./shared/giao-dien.ts";

const css = readFileSync(new URL("../public/app.css", import.meta.url), "utf8");
const root = css.slice(css.indexOf(":root"), css.indexOf("\n}", css.indexOf(":root")));
const tokens = new Map([...root.matchAll(/\n\s*(--[\w-]+):\s*([^;]+);/g)].map((m) => [m[1]!, m[2]!.trim()] as const));
const doRa = (v: string, sau = 0): string => {
  const m = /^var\((--[\w-]+)\)$/.exec(v);
  if (!m) return v;
  assert.ok(sau < 10);
  return doRa(tokens.get(m[1]!) ?? assert.fail(`${m[1]} chưa khai`), sau + 1);
};

test("mọi núm trỏ token có thật ở :root và MAC_DINH khớp giá trị app.css", () => {
  for (const n of NUM) {
    const v = tokens.get(n.token);
    assert.ok(v, `${n.token} chưa khai ở :root`);
    const that = doRa(v!);
    const mong = MAC_DINH[n.khoa]!;
    if (n.loai === "mau") assert.equal(that.toLowerCase(), mong, n.khoa);
    else if (n.loai === "phong") assert.equal(that, PHONG[mong]!.stack, n.khoa);
    else if (n.loai === "dam") assert.equal(that, mong, n.khoa);
    else {
      const px = /^(\d+(?:\.\d+)?)px$/.exec(that)?.[1] ?? String(Number(/^([\d.]+)rem$/.exec(that)?.[1]) * 16);
      assert.equal(String(Math.round(Number(px))), mong, n.khoa);
    }
  }
});
