// Gom các dòng PHÁT HIỆN trong báo cáo của trợ lý (mỗi lượt một tệp .md ở <ra>/bao-cao/) thành MỘT bảng: <ra>/phat-hien-gop.json và .md.
// Dùng nguyên hàm đọc có sẵn `docPhatHien` (scripts/giao-dien/cham-vi-du.mjs). Chạy từ GỐC kho:
//   node docs/evidence/2026-11-20-danh-gia-lai-giao-dien/kich-ban/gom-phat-hien.mjs [--ra ~/tourdao-danh-gia-2026-11-20]
import { readFileSync, readdirSync, writeFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const GOC = process.cwd();
const { docPhatHien } = await import(join(GOC, "scripts/giao-dien/cham-vi-du.mjs")).catch(() => ({}));
const lay = (k) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : undefined; };
const ra = resolve((lay("--ra") ?? join(homedir(), "tourdao-danh-gia-2026-11-20")).replace(/^~/, homedir()));
const bangTep = [join(HERE, "bang-man.json"), join(GOC, "docs/evidence/2026-11-20-danh-gia-lai-giao-dien/kich-ban/bang-man.json")].find(existsSync);
const man = JSON.parse(readFileSync(bangTep, "utf8")).man;
const khoa = (bo, trang) => `${bo}:${trang.split("?")[0]}`;
// Một (bộ, trang) có thể có hai màn (Tạo đơn mới và mở nháp): tệp báo cáo man-NNN.md quyết định màn; lượt gộp thì tra theo ô.
const theoKhoa = new Map(); for (const m of man) if (!theoKhoa.has(khoa(m.bo, m.trang))) theoKhoa.set(khoa(m.bo, m.trang), m);
const theoSo = new Map(man.map((m) => [m.so, m]));
const tatCa = [], luot = [];
for (const tep of readdirSync(join(ra, "bao-cao")).filter((t) => t.endsWith(".md")).sort()) {
  const chu = readFileSync(join(ra, "bao-cao", tep), "utf8");
  const { phatHien, dongSaiKhuon, soDongGop } = docPhatHien(chu);
  const soTep = /^man-(\d+)\.md$/.exec(tep)?.[1];
  const sanSang = (chu.match(/Sẵn sàng đưa chủ xem\?\**[:\s]*\**\s*([^\n]{0,160})/g) ?? []).map((x) => x.replace(/\*/g, "").replace(/^Sẵn sàng đưa chủ xem\?[:\s]*/, "").trim());
  luot.push({ tep, soPhatHien: phatHien.length, dongSaiKhuon, soDongGop, sanSang, coBangS: /S10/.test(chu), coKhongKiem: /Không kiểm được/i.test(chu) });
  const coTepRieng = (so) => so != null && !soTep && existsSync(join(ra, "bao-cao", `man-${String(so).padStart(3, "0")}.md`));
  for (const p of phatHien) {
    const mm = /^([A-Z_]+):(\/[^\s@]*)\s*@?\s*(\d+)?/.exec(p.o.replace(/`/g, ""));
    const m = soTep ? theoSo.get(+soTep) : mm ? theoKhoa.get(khoa(mm[1], mm[2])) : null;
    if (coTepRieng(m?.so)) continue; // màn đã được giao chấm lại riêng: dùng báo cáo riêng, bỏ phần của lượt gộp
    tatCa.push({ so: m?.so ?? null, ho: m?.ho ?? "?", bo: m?.bo ?? mm?.[1] ?? "?", trang: (m?.trang ?? mm?.[2] ?? "?").split("?")[0], kho: mm?.[3] ?? "", tep, ma: p.ma.join(","), muc: p.muc, anh: p.anh.replace(/`/g, ""), cho: p.cho, thay: p.thay, vi: p.vi, huong: p.huong });
  }
}
writeFileSync(join(ra, "phat-hien-gop.json"), JSON.stringify({ luot, phatHien: tatCa }, null, 1));
const dem = (f) => tatCa.reduce((a, p) => { const k = f(p); a[k] = (a[k] ?? 0) + 1; return a; }, {});
const md = [`# Bảng gộp phát hiện của trợ lý — ${luot.length} tệp báo cáo, ${tatCa.length} phát hiện`, "", `Theo mức: ${JSON.stringify(dem((p) => p.muc))}`, `Theo mã: ${JSON.stringify(dem((p) => p.ma))}`, `Dòng sai khuôn: ${luot.reduce((a, l) => a + l.dongSaiKhuon, 0)}; tệp không có phát hiện: ${luot.filter((l) => !l.soPhatHien).map((l) => l.tep).join(", ") || "không"}`, "", "| Màn | Họ | Ô | Mã | Mức | Ảnh | Chỗ | Điều thấy |", "|---|---|---|---|---|---|---|---|"];
const thuTu = { "Chặn việc": 0, "Nặng": 1, "Nhỏ": 2 };
for (const p of [...tatCa].sort((a, b) => thuTu[a.muc] - thuTu[b.muc] || (a.so ?? 999) - (b.so ?? 999))) md.push(`| ${p.so ?? "?"} | ${p.ho} | ${p.bo}:${p.trang} @${p.kho} | ${p.ma} | ${p.muc} | ${p.anh} | ${p.cho} | ${p.thay} |`);
writeFileSync(join(ra, "phat-hien-gop.md"), md.join("\n") + "\n");
console.log(md.slice(0, 5).join("\n"));
for (const l of luot) if (l.dongSaiKhuon || !l.coBangS || !l.sanSang.length) console.log(`SAI KHUÔN? ${l.tep}: dòng sai ${l.dongSaiKhuon}, có bảng S ${l.coBangS}, dòng «Sẵn sàng» ${l.sanSang.length}`);
