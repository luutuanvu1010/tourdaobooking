// CANH MẪU LIKE (2026-10-13): D1 từ chối mẫu LIKE dài hơn 50 BYTE ⇒ route 500. Mọi mẫu dựng từ chữ người gõ phải qua `mauLikeChua` (src/shared/http.ts),
// nên `escapeLike` thô (thoát nhưng KHÔNG cắt) chỉ được dùng bên trong chính `http.ts`. Dựng mẫu bằng cách khác (nối chuỗi tay) bài này KHÔNG bắt được —
// khung thử (`kiemMauLike`, tests/audit/harness.mjs) và bài route "chữ tìm dài" mới là lớp bắt thứ hai (docs/SO-HANG-RAO.md, dòng "Giới hạn mẫu LIKE 50 byte").
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

function tepNguon(dir: string, ra: string[] = []): string[] {
  for (const ten of readdirSync(dir)) {
    const p = join(dir, ten);
    if (statSync(p).isDirectory()) tepNguon(p, ra);
    else if (p.endsWith(".ts") && !p.endsWith(".test.ts")) ra.push(p);
  }
  return ra;
}

test("không nơi nào ngoài src/shared/http.ts gọi escapeLike thô — mẫu LIKE dựng từ chữ gõ phải dùng mauLikeChua", () => {
  const viPham: string[] = [];
  for (const dir of ["src", "web"]) {
    for (const p of tepNguon(dir)) {
      if (p === join("src", "shared", "http.ts")) continue;
      readFileSync(p, "utf8").split("\n").forEach((dong, i) => {
        const code = dong.replace(/\/\/.*$/, ""); // lời chú thích nhắc tên hàm không tính
        if (/\bescapeLike\b/.test(code)) viPham.push(`${p}:${i + 1}`);
      });
    }
  }
  assert.deepEqual(viPham, [], "dùng mauLikeChua(chữ) thay cho `%${escapeLike(chữ)}%`");
});
