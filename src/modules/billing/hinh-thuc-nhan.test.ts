// Nhãn hình thức thu giữ ở HAI nơi: máy chủ dịch mã → nhãn trong `LanThuDto.hinhThuc` (`HINH_THUC`, billing/service.ts), còn trình duyệt tự giữ `METHOD_LABEL`
// (web/format.ts) cho ô chọn hình thức VÀ để SO NHÃN nhận về: `web/order.ts` hiện ô mã giao dịch ở "Xác nhận đã nhận" khi `l.hinhThuc === METHOD_LABEL.BANK_TRANSFER`.
// Hai nơi lệch nhau thì ô mã biến mất lặng lẽ (Kế toán xác nhận khoản chuyển khoản mà không thấy chỗ nhập mã). Bài này khoá: mọi khoá và mọi nhãn bằng nhau.
// Hai tệp import nhau không đuôi nên nạp bằng esbuild (như tests/audit/harness.mjs), không import tĩnh.
import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import * as esbuild from "esbuild";

const GOC = fileURLToPath(new URL("../../../", import.meta.url));

async function nap(entry: string): Promise<Record<string, Record<string, string>>> {
  const built = await esbuild.build({
    stdin: { contents: entry, resolveDir: GOC, loader: "ts" },
    bundle: true, format: "esm", platform: "neutral", target: "es2022", write: false, logLevel: "silent",
  });
  return import(`data:text/javascript;base64,${Buffer.from(built.outputFiles[0]!.text).toString("base64")}`);
}

test("HINH_THUC của máy chủ khớp METHOD_LABEL của trình duyệt: cùng khoá, cùng nhãn (ô mã giao dịch so nhãn)", async () => {
  const { HINH_THUC } = await nap('export { HINH_THUC } from "./src/modules/billing/service";');
  const { METHOD_LABEL } = await nap('export { METHOD_LABEL } from "./web/format";');
  assert.deepEqual(Object.keys(HINH_THUC!).sort(), ["BANK_TRANSFER", "CASH", "OTHER"], "máy chủ có đúng ba hình thức");
  assert.deepStrictEqual(HINH_THUC, METHOD_LABEL, "nhãn hình thức ở máy chủ (billing/service.ts) lệch METHOD_LABEL (web/format.ts)");
});
