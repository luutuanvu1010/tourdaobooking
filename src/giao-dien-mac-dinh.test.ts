// MAC_DINH của src/shared/giao-dien.ts phải bằng giá trị :root của public/app.css (dò chuỗi var()) — app.css là nguồn, đổi mặc định ở đó thì sửa cả hai.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { CHA, KEO_THEO, MAC_DINH, NUM, PHONG } from "./shared/giao-dien.ts";

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

const tokenCua = (khoa: string): string => NUM.find((n) => n.khoa === khoa)?.token ?? assert.fail(`núm ${khoa} không có trong NUM`);

test("CHA khớp app.css: núm con là var() đúng núm cha; núm khác là var() của núm khác thì phải có trong CHA", () => {
  for (const [con, cha] of Object.entries(CHA)) {
    assert.equal(tokens.get(tokenCua(con)), `var(${tokenCua(cha)})`, `${con} phải trỏ var(${tokenCua(cha)}) trong :root`);
  }
  const theoToken = new Map(NUM.map((n) => [n.token, n.khoa] as const));
  for (const n of NUM) {
    if (n.khoa in CHA) continue;
    const m = /^var\((--[\w-]+)\)$/.exec(tokens.get(n.token) ?? "");
    if (m && theoToken.has(m[1]!)) assert.fail(`thiếu trong CHA: ${n.khoa} (${n.token}) trỏ var(${m[1]}) của núm ${theoToken.get(m[1]!)}`);
  }
});

test("mọi token trong KEO_THEO có khai ở :root", () => {
  for (const [khoa, ds] of Object.entries(KEO_THEO)) {
    tokenCua(khoa);
    for (const t of ds) assert.ok(tokens.has(t), `${t} (kéo theo ${khoa}) chưa khai ở :root`);
  }
});

// Lời chủ khi gửi bản vẽ Đợt 4 (2026-10-02): "nhớ đổi lại nền cho thanh bên trái … thành màu nền toàn trang" — thanh bên máy tính theo núm "Nền trang".
test("nền thanh bên mặc định = nền trang (lời chủ 2/10, Đợt 4 G5): CHA và MAC_DINH theo núm nen-trang", () => {
  assert.equal(CHA["nen-thanh-ben"], "nen-trang");
  assert.equal(MAC_DINH["nen-thanh-ben"], MAC_DINH["nen-trang"]);
});
