// CỔNG PHÁT HÀNH GÓI 2 (KE-HOACH-SUY-RA.md "Cổng phát hành"; ruling R1 kế hoạch 2026-10-17-goi-2-h3-tu-khai): KHÔNG BAO GIỜ có bản dựng mang route để NGƯỜI DÙNG tự tải ảnh
// (giấy tờ của mình / ảnh của phiếu tự khai) mà thiếu route THỰC HIỆN PHIẾU XOÁ (lát H-5). Hôm nay chưa có route tải ảnh tự khai nên bài chính xanh "rỗng" — CÓ CHỦ Ý: nó canh
// lát sau. Bài thứ hai ghim bộ nhận diện để bài chính không rỗng về logic. Phá thử: thêm route giả `POST /api/parties/cua-toi/phieu/:pid/tep` vào partiesModule → đỏ → hoàn nguyên.
// Định nghĩa (đổi = sửa bài này, có lý do): "tải ảnh tự khai" = POST có đường bắt đầu /api/parties/cua-toi và chứa /tep; "thực hiện phiếu xoá" = POST khớp DUONG_THUC_HIEN_XOA
// (tên GIỮ CHỖ — lát H-5 đặt tên thật thì sửa hằng này cùng commit).
import { test } from "node:test";
import assert from "node:assert/strict";
import * as esbuild from "esbuild";
import type { AppModule } from "./shared/router.ts";

async function routesOf(entry: string, exportName: string): Promise<string[]> {
  const built = await esbuild.build({ entryPoints: [new URL(entry, import.meta.url).pathname], bundle: true, format: "esm", platform: "neutral", target: "es2022", write: false });
  const mod = (await import(`data:text/javascript;base64,${Buffer.from(built.outputFiles[0]!.text).toString("base64")}`)) as Record<string, AppModule>;
  return mod[exportName]!.routes.map((r) => `${r.method} ${r.path}`);
}
const DUONG_THUC_HIEN_XOA = /^POST \/api\/parties\/phieu-xoa\/:[a-z]+\/thuc-hien$/;
const laTaiAnhTuKhai = (k: string): boolean => /^POST \/api\/parties\/cua-toi(\/|$)/.test(k) && /\/tep(\/|$)/.test(k);

test("không có route tải ảnh tự khai nếu thiếu route thực hiện phiếu xoá", async () => {
  const r = await routesOf("./modules/parties/index.ts", "partiesModule");
  const taiAnh = r.filter(laTaiAnhTuKhai);
  if (taiAnh.length > 0) assert.ok(r.some((k) => DUONG_THUC_HIEN_XOA.test(k)), `có route tải ảnh tự khai (${taiAnh.join(", ")}) mà chưa có route thực hiện phiếu xoá`);
});

test("bộ nhận diện của cổng: nhận đúng đường tự khai, không nhận đường tải ảnh của Toàn quyền (H-2)", () => {
  assert.equal(laTaiAnhTuKhai("POST /api/parties/cua-toi/phieu/:pid/tep"), true);
  assert.equal(laTaiAnhTuKhai("POST /api/parties/cua-toi/tep"), true);
  assert.equal(laTaiAnhTuKhai("POST /api/parties/:id/documents/:did/tep"), false);
  assert.equal(laTaiAnhTuKhai("POST /api/parties/cua-toi/phieu"), false);
  assert.equal(DUONG_THUC_HIEN_XOA.test("POST /api/parties/phieu-xoa/:id/thuc-hien"), true);
});
