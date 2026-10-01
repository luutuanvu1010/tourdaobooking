// Route bắt tay GET /api/bang-tin (BT-1, BT-2) và hai hàm phát/đóng của module bangtin — gọi THẲNG handler của route (mã thật, gói `./index.ts`
// bằng esbuild như route-access.test.ts) với một ctx giả và một trạm giả ghi lại yêu cầu. Cổng của router (401 chưa đăng nhập, 503 bảo trì) KHÔNG ở
// đây — đã có ở router; ở đây là ba cổng của chính route (426, 403, 503) và việc yêu cầu gửi sang trạm được DỰNG MỚI (không chép header trình duyệt).
// Không dựng phản hồi 101 thật (Node không cho status 101): trạm giả trả một đối tượng mốc, test khẳng định route trả NGUYÊN đối tượng đó.
import { test } from "node:test";
import assert from "node:assert/strict";
import * as esbuild from "esbuild";
import { nhanKetNoi, type SuKienDon } from "../../shared/bang-tin.ts";
import type { PermissionCode } from "../../shared/permissions.ts";

type Mod = typeof import("./index.ts");
async function loadModule(): Promise<Mod> {
  const built = await esbuild.build({
    entryPoints: [new URL("./index.ts", import.meta.url).pathname],
    bundle: true,
    format: "esm",
    platform: "neutral",
    target: "es2022",
    write: false,
  });
  const code = Buffer.from(built.outputFiles[0]!.text).toString("base64");
  return (await import(`data:text/javascript;base64,${code}`)) as Mod;
}
const { bangtinModule, phatDon, dongCua } = await loadModule();

const APP = "https://booking.tourdao.vn";
const MOC = { laMoc: true }; // "phản hồi" của trạm giả — route phải trả đúng đối tượng này

interface GhiLai {
  tenTram: string[];
  yeuCau: Request[];
  phat: [SuKienDon, string[]][];
  dongCua: unknown[];
}
function tramGia(): { binding: unknown; ghi: GhiLai } {
  const ghi: GhiLai = { tenTram: [], yeuCau: [], phat: [], dongCua: [] };
  const binding = {
    getByName: (ten: string) => {
      ghi.tenTram.push(ten);
      return {
        fetch: async (req: Request) => {
          ghi.yeuCau.push(req);
          return MOC;
        },
        phat: async (suKien: SuKienDon, nhan: string[]) => void ghi.phat.push([suKien, nhan]),
        dongCua: async (muc: unknown) => void ghi.dongCua.push(muc),
      };
    },
  };
  return { binding, ghi };
}

const staff = (id: string, permissions: PermissionCode[]) => ({ id, permissions, phone: "0900000000", name: "Người thử" });

const route = bangtinModule.routes[0]!;
const PHIEN = "phien-thu-1";
async function goi(headers: Record<string, string>, env: Record<string, unknown>, s = staff("s-ban-hang", ["SALES"]), sessionId: string | null = PHIEN): Promise<unknown> {
  const url = new URL(`${APP}/api/bang-tin`);
  const request = new Request(url, { headers });
  return route.handler({ request, env, url, staff: s, sessionId, params: {} } as never);
}
const DU_HEADER = { upgrade: "websocket", connection: "Upgrade", origin: APP };

test("module bangtin khai đúng MỘT route: GET /api/bang-tin, mức truy cập staff", () => {
  assert.deepEqual(
    bangtinModule.routes.map((r) => [r.method, r.path, r.access]),
    [["GET", "/api/bang-tin", "staff"]],
  );
});

test("thiếu Upgrade: websocket → 426 upgrade_required (kèm header upgrade), không đụng trạm", async () => {
  const { binding, ghi } = tramGia();
  const res = (await goi({ origin: APP }, { BANG_TIN: binding })) as Response;
  assert.equal(res.status, 426);
  assert.equal(res.headers.get("upgrade"), "websocket");
  assert.equal(((await res.json()) as { error: { code: string } }).error.code, "upgrade_required");
  assert.equal(ghi.tenTram.length + ghi.yeuCau.length, 0);
});

test("Origin vắng hoặc lạ → 403 cross_origin (đúng câu của router), không mở kết nối", async () => {
  for (const origin of [undefined, "https://khac.tourdao.vn", "http://booking.tourdao.vn"]) {
    const { binding, ghi } = tramGia();
    const headers: Record<string, string> = { upgrade: "websocket" };
    if (origin) headers.origin = origin;
    const res = (await goi(headers, { BANG_TIN: binding })) as Response;
    assert.equal(res.status, 403, String(origin));
    assert.deepEqual(await res.json(), { error: { code: "cross_origin", message: "Yêu cầu không đến từ trang của hệ thống." } });
    assert.equal(ghi.tenTram.length + ghi.yeuCau.length, 0, `không được đụng trạm (origin ${String(origin)})`);
  }
});

test("chưa có trạm (không binding BANG_TIN) → 503 unavailable", async () => {
  const res = (await goi(DU_HEADER, {})) as Response;
  assert.equal(res.status, 503);
  assert.equal(((await res.json()) as { error: { code: string } }).error.code, "unavailable");
});

test("BT-2: yêu cầu gửi trạm được DỰNG MỚI — chỉ 3 header máy chủ đặt; nhãn/id giả của trình duyệt bị bỏ; trả NGUYÊN phản hồi của trạm", async () => {
  for (const s of [staff("s-doi-tac", ["PARTNER"]), staff("s-ban-hang", ["SALES"]), staff("s-hdv", ["FIELD"])]) {
    const { binding, ghi } = tramGia();
    const tra = await goi(
      { ...DU_HEADER, upgrade: "WebSocket", cookie: "td_session=bi-mat", "x-bang-tin-nhan": '["tat-ca","cho-nhan"]', "x-bang-tin-nguoi": "nguoi-khac" },
      { BANG_TIN: binding },
      s,
    );
    assert.equal(tra, MOC, "route phải trả nguyên phản hồi của trạm (bọc lại là mất webSocket)");
    assert.deepEqual(ghi.tenTram, ["cong-ty"]);
    assert.equal(ghi.yeuCau.length, 1);
    const req = ghi.yeuCau[0]!;
    assert.equal(req.method, "GET");
    assert.equal(req.url, "https://bang-tin/ket-noi");
    assert.deepEqual([...req.headers.keys()].sort(), ["upgrade", "x-bang-tin-nguoi", "x-bang-tin-nhan"], "chỉ đúng 3 header, không cookie/origin");
    assert.equal(req.headers.get("upgrade"), "websocket");
    assert.equal(req.headers.get("x-bang-tin-nguoi"), s.id);
    assert.deepEqual(JSON.parse(req.headers.get("x-bang-tin-nhan")!), [...nhanKetNoi(s), `phien:${PHIEN}`], `nhãn của ${s.id} tính ở máy chủ, kèm mã phiên (ADR-0075 điều 6a)`);
  }
});

test("ADR-0075 điều 6a: nhãn phiên lấy từ ctx.sessionId của máy chủ — mỗi phiên một nhãn riêng; thiếu mã phiên → 401, không đụng trạm", async () => {
  const { binding, ghi } = tramGia();
  await goi(DU_HEADER, { BANG_TIN: binding }, staff("s-ban-hang", ["SALES"]), "phien-A");
  await goi(DU_HEADER, { BANG_TIN: binding }, staff("s-ban-hang", ["SALES"]), "phien-B");
  assert.deepEqual(ghi.yeuCau.map((r) => JSON.parse(r.headers.get("x-bang-tin-nhan")!).filter((x: string) => x.startsWith("phien:"))), [["phien:phien-A"], ["phien:phien-B"]]);
  const g2 = tramGia();
  const res = (await goi(DU_HEADER, { BANG_TIN: g2.binding }, staff("s-ban-hang", ["SALES"]), null)) as Response;
  assert.equal(res.status, 401);
  assert.equal(g2.ghi.tenTram.length + g2.ghi.yeuCau.length, 0);
});

test("phatDon/dongCua: không có trạm → không làm gì, không ném; có trạm → gọi đúng RPC của trạm 'cong-ty'", async () => {
  const suKien: SuKienDon = { loai: "don", orderId: "o-1", maDon: "TD-1", thayDoi: "sua", luc: "2026-09-26T00:00:00.000Z" };
  await assert.doesNotReject(phatDon({} as Env, suKien, ["tat-ca"]));
  await assert.doesNotReject(dongCua({} as Env, "tat-ca"));
  const { binding, ghi } = tramGia();
  const env = { BANG_TIN: binding } as unknown as Env;
  await phatDon(env, suKien, ["tat-ca", "nguoi:s-a"]);
  await dongCua(env, { staffId: "s-a" });
  await dongCua(env, "tat-ca");
  await dongCua(env, { sessionIds: ["p-1", "p-2"] });
  await dongCua(env, { sessionIds: [] }); // không có phiên nào bị thay → không gọi trạm
  assert.deepEqual(ghi.tenTram, ["cong-ty", "cong-ty", "cong-ty", "cong-ty"]);
  assert.deepEqual(ghi.phat, [[suKien, ["tat-ca", "nguoi:s-a"]]]);
  assert.deepEqual(ghi.dongCua, [{ staffId: "s-a" }, "tat-ca", { sessionIds: ["p-1", "p-2"] }]);
});
