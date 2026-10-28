// Hàng rào «không tăng» (đợt 0, Task 11): số chỗ gọi confirm()/alert() trong web/*.ts chỉ được giảm. Hộp thật là hoiXacNhan (web/bang-truot.ts)
// và hienBaoNgan (web/toast.ts). Hạ TRAN khi bỏ thêm chỗ; không bao giờ nâng.
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

const TRAN = 16;
const THU_MUC = join(import.meta.dirname, "..", "web");

function chiMa(dong: string): string {
  const t = dong.trim();
  if (t.startsWith("//") || t.startsWith("/*") || t.startsWith("*")) return "";
  const i = dong.search(/(^|\s)\/\//);
  return i >= 0 ? dong.slice(0, i) : dong;
}

test("số chỗ gọi confirm()/alert() trong web/ không vượt trần", () => {
  const chua: string[] = [];
  for (const ten of readdirSync(THU_MUC).filter((f) => f.endsWith(".ts")).sort()) {
    readFileSync(join(THU_MUC, ten), "utf8")
      .split("\n")
      .forEach((dong, i) => {
        const n = chiMa(dong).match(/\b(?:confirm|alert)\(/g)?.length ?? 0;
        for (let k = 0; k < n; k++) chua.push(`web/${ten}:${i + 1}`);
      });
  }
  assert.ok(chua.length <= TRAN, `${chua.length} chỗ gọi confirm()/alert() > trần ${TRAN}. Dùng hoiXacNhan / hienBaoNgan thay vì thêm mới. Danh sách:\n${chua.join("\n")}`);
});
