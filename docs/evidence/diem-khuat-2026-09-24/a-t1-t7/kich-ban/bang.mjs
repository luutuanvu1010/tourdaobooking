// In bảng Markdown từ kết quả do-toc-do.mjs: node bang.mjs <kết-quả.json>
import { readFileSync } from "node:fs";
const r = JSON.parse(readFileSync(process.argv[2], "utf8"));
console.log(`Nguồn: ${process.argv[2]} · ${r.at} · bóp mạng: ${r.throttle ? "Fast 3G + CPU×4" : "không"} · ${r.uptimeStart}`);
console.log("| Trang | viewport | API/tĩnh (lạnh) | byte JS/CSS/font giải nén (lạnh) | chuỗi API nối đuôi | request ra mạng khi mở ấm (tĩnh làm mới ngầm + API) | lượt D1 (tổng · theo request) | DOM | CLS | ready lạnh/ấm ms* |");
console.log("|---|---|---|---|---|---|---|---|---|---|");
for (const p of r.pages) {
  const c = p.cold, w = p.warm;
  const d1 = w.d1.length ? `${w.d1.reduce((a, x) => a + x.d1RoundTrips, 0)} · ` + w.d1.map((x) => `${x.req.replace(/^GET /, "").replace(/\?.*/, "")}=${x.d1RoundTrips}${x.d1SerialRounds !== x.d1RoundTrips ? `(nối ${x.d1SerialRounds})` : ""}`).join(", ") : "—";
  console.log(`| ${p.label} | ${p.viewport} | ${c.requests.api}/${c.requests.static} | ${c.bytes.jsDecoded}/${c.bytes.cssDecoded}/${c.bytes.fontDecoded} | ${w.apiChainDepth} (${w.apiChain.join(" → ")}) | ${w.requests.serverSawRequests ?? "?"} (tĩnh từ SW ${w.requests.staticFromSW}/${w.requests.static}) | ${d1} | ${w.domNodes} | ${c.cls} | ${c.readyAt}/${w.readyAt} |`);
}
