// Gộp số liệu của do-luoi.mjs thành bảng theo khổ (bước 2 lưới bố cục). Chạy: node …/tong-hop-luoi.mjs <luoi-truoc.json> [<luoi-sau.json>] [--ra tệp.json]
import { readFileSync, writeFileSync } from "node:fs";
const tep = process.argv.slice(2).filter((a) => !a.startsWith("--") && a.endsWith(".json") && a !== process.argv[process.argv.indexOf("--ra") + 1]);
const ra = process.argv.includes("--ra") ? process.argv[process.argv.indexOf("--ra") + 1] : null;
const dem = (ds) => { const m = {}; for (const x of ds) m[x] = (m[x] ?? 0) + 1; return Object.fromEntries(Object.entries(m).sort((a, b) => b[1] - a[1])); };
const gop = (f) => {
  const d = JSON.parse(readFileSync(f, "utf8"));
  const theoKho = {};
  for (const o of d.ketQua) { if (!o.do || o.do.loi) continue; (theoKho[o.kho] ??= []).push(o); }
  const kq = {};
  for (const [kho, ds] of Object.entries(theoKho)) {
    const xd = ds.filter((o) => o.xeDich);
    kq[kho] = {
      soO: ds.length, tranNgang: ds.filter((o) => o.do.tranNgang).length,
      // lề = đệm trái của <main>; trang tự đặt khung (đệm 0) tính riêng
      le: dem(ds.map((o) => `${o.do.demTrai}/${o.do.demPhai}`)), soMucLe: new Set(ds.map((o) => o.do.demTrai)).size,
      rongNoiDung: dem(ds.map((o) => o.do.mainRong - o.do.demTrai - o.do.demPhai)), soMucRong: new Set(ds.map((o) => o.do.mainRong - o.do.demTrai - o.do.demPhai)).size,
      nhip: dem(ds.flatMap((o) => o.do.nhip)), soGiaTriNhip: new Set(ds.flatMap((o) => o.do.nhip)).size,
      motDau: ds.reduce((a, o) => a + o.do.motDau, 0), trangCoMotDau: ds.filter((o) => o.do.motDau > 0).length,
      dongDaiMax: Math.max(...ds.map((o) => o.do.dongDai)),
      ...(xd.length ? { xeDich: { soO: xd.length, coXeNgang: xd.filter((o) => new Set(o.xeDich.trai).size > 1).length, clsTren01: xd.filter((o) => o.xeDich.cls >= 0.1).length, clsMax: Math.max(...xd.map((o) => o.xeDich.cls)), clsTrungVi: xd.map((o) => o.xeDich.cls).sort((a, b) => a - b)[Math.floor(xd.length / 2)] } } : {}),
    };
  }
  return { nhan: d.nhan, luc: d.luc, css: d.css, theoKho: kq };
};
const out = tep.map(gop);
for (const g of out) {
  console.log(`\n== ${g.nhan} (${g.luc}${g.css ? ", có lớp xem trước" : ""})`);
  for (const [kho, k] of Object.entries(g.theoKho)) console.log(`${kho}: ${k.soO} ô · tràn ${k.tranNgang} · lề ${JSON.stringify(k.le)} · ${k.soMucRong} mức rộng ${JSON.stringify(k.rongNoiDung)} · nhịp ${JSON.stringify(k.nhip)} · một đầu ${k.motDau} (${k.trangCoMotDau} ô)${k.xeDich ? ` · xê dịch ngang ${k.xeDich.coXeNgang}/${k.xeDich.soO}, CLS ≥ 0,1: ${k.xeDich.clsTren01}, trung vị ${k.xeDich.clsTrungVi}, lớn nhất ${k.xeDich.clsMax}` : ""}`);
}
if (ra) writeFileSync(ra, JSON.stringify(out, null, 1));
