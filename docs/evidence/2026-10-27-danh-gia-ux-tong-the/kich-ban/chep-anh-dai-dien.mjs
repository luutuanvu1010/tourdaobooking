// Chép ảnh đại diện từ bộ ảnh đầy đủ ngoài kho (~/tourdao-ux-2026-10-27-v2/anh/) vào docs/evidence/2026-10-27-danh-gia-ux-tong-the/anh/ (trong kho).
// Chép: (1) mọi ảnh được trích dẫn trong các tệp hồ sơ theo quy ước "ảnh <nhan>/<BỘ>/<trang>-<khổ>" (màn đầu) và "ảnh ht/<khổ>/<BỘ>/<NN>" (bước hành trình);
//       (2) ảnh màn đầu 390 + 1040 trạng thái NHIỀU của bộ quyền rộng nhất cho mọi trang (từ so-lieu/tong-hop.json);
//       (3) ảnh 403 / 404 / mất mạng 390 của bộ Bán hàng (NHIỀU).
// Tên tệp đích: <nhan>-<BỘ>-<trang>-<khổ>.jpg và ht-<khổ>-<BỘ>-<NN>.jpg. Chỉ đọc nguồn; ghi đè đích. Chạy từ gốc kho:
//   node docs/evidence/2026-10-27-danh-gia-ux-tong-the/kich-ban/chep-anh-dai-dien.mjs
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const EVID = join(HERE, "..");
const SPEC = join(EVID, "..", "..", "superpowers", "specs", "2026-10-27-danh-gia-ux-tong-the");
const NGUON = join(homedir(), "tourdao-ux-2026-10-27-v2", "anh");
const DICH = join(EVID, "anh");
mkdirSync(DICH, { recursive: true });

const muon = new Map(); // đích → nguồn
const themMan = (nhan, bo, trang, kho) => muon.set(`${nhan}-${bo}-${trang}-${kho}.jpg`, join(NGUON, nhan, bo, `${trang}-${kho}-man-dau.jpg`));

// (1) trích dẫn trong hồ sơ
const tepHoSo = ["PHU-LUC-PHAT-HIEN.md", "BAO-CAO.md", "KIEM-KE.md", "HE-THONG-HOP-NHAT.md", "LO-TRINH.md"].map((t) => join(SPEC, t)).filter(existsSync);
for (const t of tepHoSo) {
  const vb = readFileSync(t, "utf8");
  for (const m of vb.matchAll(/ảnh (nhieu|it|rong)\/([A-Z_]+)\/([a-z0-9-]+?)-(390|768|1040|1440)\b/g)) themMan(m[1], m[2], m[3], m[4]);
  for (const m of vb.matchAll(/ảnh ht\/(390|1040)\/([A-Z_]+)\/(\d\d)\b/g)) {
    const thuMuc = join(NGUON, "hanh-trinh", m[1], m[2]);
    if (!existsSync(thuMuc)) continue;
    const tep = readdirSync(thuMuc).find((f) => f.startsWith(m[3] + "-"));
    if (tep) muon.set(`ht-${m[1]}-${m[2]}-${m[3]}.jpg`, join(thuMuc, tep));
  }
}

// (2) mọi trang: 390 + 1040 NHIỀU, bộ rộng nhất
const th = JSON.parse(readFileSync(join(EVID, "so-lieu", "tong-hop.json"), "utf8"));
for (const [duong, o] of Object.entries(th.trang || {})) {
  for (const k of ["anh390", "anh1040"]) {
    const p = o[k]; if (!p) continue;
    const m = p.match(/anh\/(nhieu|it|rong)\/([A-Z_]+)\/([a-z0-9-]+?)-(390|768|1040|1440)\.jpg$/);
    if (m) themMan(m[1], m[2], m[3], m[4]);
  }
}

// (3) ba trạng thái chung
for (const t of ["403-audit", "404-khong-co-trang-nay", "matmang-trang-chu"]) themMan("nhieu", "SALES", t, "390");

let ok = 0, thieu = [];
for (const [dich, nguon] of muon) {
  if (!existsSync(nguon)) { thieu.push(nguon.replace(homedir(), "~")); continue; }
  copyFileSync(nguon, join(DICH, dich)); ok++;
}
console.log(`Chép ${ok} ảnh vào ${DICH.replace(process.cwd(), ".")}; thiếu nguồn: ${thieu.length}`);
for (const t of thieu) console.log("  thiếu:", t);
