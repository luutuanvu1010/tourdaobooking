// Đo thời gian phản hồi GET CÔNG KHAI trên production (chỉ đọc): tệp tĩnh (không qua Worker) vs API công khai (Worker + 1 câu D1).
// Chạy: node prod-rtt.mjs [số vòng=20]. Kết nối giữ sống (undici) nên thời gian ≈ 1 RTT + thời gian xử lý phía Cloudflare.
const N = Number(process.argv[2] ?? 20);
const base = "https://booking.tourdao.vn";
const paths = ["/app.css", "/icons/logo-96.png", "/api/auth/config", "/api/company"];
const res = Object.fromEntries(paths.map((p) => [p, []]));
await fetch(base + "/app.css").then((r) => r.arrayBuffer()); // mở kết nối
let ray = {};
for (let i = 0; i < N; i++) for (const p of paths) {
  const t0 = performance.now();
  const r = await fetch(base + p, { headers: { "accept-encoding": "br" } });
  const t1 = performance.now();
  await r.arrayBuffer();
  res[p].push(t1 - t0);
  ray[p] = r.headers.get("cf-ray");
}
const q = (a, f) => a.slice().sort((x, y) => x - y)[Math.min(a.length - 1, Math.floor(a.length * f))];
const out = Object.fromEntries(paths.map((p) => [p, { n: res[p].length, min: +q(res[p], 0).toFixed(1), median: +q(res[p], 0.5).toFixed(1), p90: +q(res[p], 0.9).toFixed(1), cfRay: ray[p] }]));
console.log(JSON.stringify({ at: new Date().toISOString(), out }, null, 1));
