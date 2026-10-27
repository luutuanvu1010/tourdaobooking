// Tệp dò tạm (xoá khi xong).
process.env.E2E_BASE_URL ??= "http://127.0.0.1:8790";
const L = await import("../../../../tests/e2e/lib.mjs");
const r = await L.login("0900000900", "739184");
console.log(r.status, JSON.stringify(r.body).slice(0, 500));
const c = r.cookie;
for (const p of process.argv.slice(2)) {
  const g = await L.call(c, "GET", p);
  console.log(p, g.status, JSON.stringify(g.body).slice(0, 2500));
}
