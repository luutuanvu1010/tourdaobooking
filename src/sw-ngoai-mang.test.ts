// Hành vi thật của service worker khi mất mạng: đóng gói web/sw/sw.ts bằng esbuild, chạy trong `vm` với self/caches/fetch giả (fetch ném TypeError).
// Biến SW_NGUON (chỉ để thử đột biến) trỏ tới bản sao khác của sw.ts, phải nằm trong web/sw/ để import tương đối còn đúng.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { buildSync } from "esbuild";

const nguon = process.env.SW_NGUON ?? new URL("../web/sw/sw.ts", import.meta.url).pathname;
const ma = buildSync({ entryPoints: [nguon], bundle: true, format: "iife", write: false, define: { __BUILD_ID__: '"test"' } }).outputFiles[0]!.text;
const GOC = "https://booking.tourdao.vn";

type Nghe = (ev: unknown) => void;
function dungSw(bo: Record<string, Response>) {
  const nghe: Record<string, Nghe> = {};
  const cache = {
    match: async (k: string) => bo[k]?.clone(),
    put: async (k: string, r: Response) => void (bo[k] = r),
    add: async () => undefined,
  };
  const self = { location: { origin: GOC }, addEventListener: (t: string, f: Nghe) => (nghe[t] = f), skipWaiting: async () => undefined, clients: {}, registration: {} };
  const ctx = vm.createContext({
    self,
    caches: { open: async () => cache, keys: async () => [], delete: async () => true },
    fetch: async () => {
      throw new TypeError("Failed to fetch");
    },
    Request,
    Response,
    URL,
    Promise,
    console,
    setTimeout,
    AbortSignal,
  });
  vm.runInContext(ma, ctx);
  return async (duong: string, mode: string): Promise<Response | undefined> => {
    let kq: Promise<Response> | undefined;
    nghe.fetch!({ request: { method: "GET", url: GOC + duong, mode }, respondWith: (p: Promise<Response>) => (kq = p), waitUntil: () => undefined });
    return kq && (await kq);
  };
}
const trang = (chu: string) => new Response(chu, { status: 200, headers: { "content-type": "text/html" } });

test("mở trang (navigate) chưa có trong bộ đệm, mất mạng, /ngoai-mang đã nhớ ⇒ trả trang /ngoai-mang", async () => {
  const lay = dungSw({ [GOC + "/ngoai-mang"]: trang("NGOAI-MANG") });
  assert.equal(await (await lay("/xe", "navigate"))!.text(), "NGOAI-MANG");
});

test("navigate, mất mạng, /ngoai-mang cũng chưa nhớ ⇒ 503 chữ (không ném, không undefined)", async () => {
  const lay = dungSw({});
  const r = await lay("/xe", "navigate");
  assert.equal(r?.status, 503);
  assert.match(await r!.text(), /Không có kết nối mạng/);
});

test("không phải navigate (script, ảnh…) mất mạng ⇒ 503 chữ dù /ngoai-mang đã nhớ", async () => {
  const lay = dungSw({ [GOC + "/ngoai-mang"]: trang("NGOAI-MANG") });
  const r = await lay("/js/xe.js", "no-cors");
  assert.equal(r?.status, 503);
});

test("trang đã có trong bộ đệm vẫn được phục vụ từ bộ đệm khi mất mạng", async () => {
  const lay = dungSw({ [GOC + "/xe"]: trang("XE-NHO"), [GOC + "/ngoai-mang"]: trang("NGOAI-MANG") });
  assert.equal(await (await lay("/xe", "navigate"))!.text(), "XE-NHO");
});

test("install vẫn allSettled", () => {
  assert.match(readFileSync(nguon, "utf8"), /allSettled/);
});

test("api.ts: lỗi mạng hoặc hết giờ phát tín hiệu «ngoai-mang» trước khi ném lại", () => {
  assert.match(readFileSync(new URL("../web/api.ts", import.meta.url), "utf8"), /new Event\("ngoai-mang"\)/);
});
