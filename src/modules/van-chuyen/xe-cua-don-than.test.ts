// ADR-0059 — gọi THẲNG thân route `GET /api/van-chuyen/xe-cua-don/:orderId` (BỎ QUA cổng office của router) để canh HAI lời hỏi quyền trong thân.
// Hôm nay mọi mã quyền qua cổng office đều có trip.view = any VÀ order.view = any, nên qua đường thật hai lời hỏi này không đỏ được bằng dữ liệu hợp lệ. Bài
// này nạp route + bản đồ quyền trong CÙNG một gói esbuild (chung một đối tượng MATRIX), đổi tạm ô của SALES trong bộ nhớ, gọi thẳng `handler` với một D1 giả
// NÉM LỖI ở mọi truy vấn: đúng phải là 403 TRƯỚC mọi truy vấn. Đối chứng: bản đồ nguyên vẹn → thân đi tới truy vấn (D1 giả ném).
import { test } from "node:test";
import assert from "node:assert/strict";
import * as esbuild from "esbuild";

const built = await esbuild.build({
  stdin: {
    contents: `export { vanChuyenModule } from "./modules/van-chuyen/index.ts"; export { MATRIX } from "./shared/permissions.ts";`,
    resolveDir: new URL("../../", import.meta.url).pathname,
    loader: "ts",
  },
  bundle: true, format: "esm", platform: "neutral", target: "es2022", write: false,
});
const goi = (await import(`data:text/javascript;base64,${Buffer.from(built.outputFiles[0]!.text).toString("base64")}`)) as {
  vanChuyenModule: { routes: { method: string; path: string; handler: (ctx: unknown) => Promise<Response> }[] };
  MATRIX: Record<string, Record<string, string>>;
};
const r = goi.vanChuyenModule.routes.find((x) => x.method === "GET" && x.path === "/api/van-chuyen/xe-cua-don/:orderId");
assert.ok(r, "có route xe-cua-don");
const TRUY_VAN = "TRUY VẤN TRƯỚC KHI HỎI QUYỀN";
const dbNem = { prepare: () => { throw new Error(TRUY_VAN); }, batch: () => { throw new Error(TRUY_VAN); } };
const SALES = { id: "11111111-1111-4111-8111-111111111111", partyId: null, name: "Bán", permissions: ["SALES"] };
const goiThan = () => r!.handler({ env: { DB: dbNem }, params: { orderId: "22222222-2222-4222-8222-222222222222" }, staff: SALES, url: new URL("http://x/"), request: new Request("http://x/") });

/** Đổi tạm một ô của SALES, gọi thân, trả ô cũ. */
async function voiO(op: string, scope: string): Promise<Response> {
  const cu = goi.MATRIX[op]!.SALES!;
  goi.MATRIX[op]!.SALES = scope;
  try {
    return await goiThan();
  } finally {
    goi.MATRIX[op]!.SALES = cu;
  }
}

test("ADR-0059 thân route: trip.view = any nhưng order.view ≠ any → 403 trước mọi truy vấn", async () => {
  for (const s of ["own", "assigned", "ownOrAssigned", "none"]) {
    const res = await voiO("order.view", s);
    assert.equal(res.status, 403, `order.view = ${s}`);
    assert.match(await res.text(), /không xem được xe đón khách của đơn/);
  }
});

test("ADR-0059 thân route: order.view = any nhưng trip.view ≠ any (vd assigned như Tài xế công ty) → 403 trước mọi truy vấn", async () => {
  for (const s of ["assigned", "own", "none"]) {
    const res = await voiO("trip.view", s);
    assert.equal(res.status, 403, `trip.view = ${s}`);
  }
});

test("đối chứng: bản đồ nguyên vẹn (SALES any/any) → thân đi tới truy vấn (D1 giả ném) — bài trên không xanh vì route không bao giờ truy vấn", async () => {
  assert.equal(goi.MATRIX["trip.view"]!.SALES, "any");
  assert.equal(goi.MATRIX["order.view"]!.SALES, "any");
  await assert.rejects(goiThan(), new RegExp(TRUY_VAN));
});
