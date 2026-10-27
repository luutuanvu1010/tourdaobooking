// Quét đo (đánh giá UX 27/10/2026): MỖI bộ quyền × MỖI trang có lối vào (theo ma-tran-quyen.json, sinh từ mã) × khổ 390 và 1040 (+768, 1440 cho họ danh
// sách và bảng điều khiển), cộng một trang ngoài quyền (403) và một đường lạ (404). Mỗi ô: ảnh JPEG 1x, axe (WCAG 2.1 A/AA), số đo trong trang
// (do-trong-trang.js), lỗi console; ở 1040 thêm thử Tab 12 lần đo focus thấy được.
// Chạy từ GỐC kho, máy chủ thử đang chạy (may-chu.mjs):
//   AXE_JS=<…/axe/package/axe.min.js> node docs/evidence/2026-10-27-danh-gia-ux-tong-the/kich-ban/do-trang.mjs --nhan nhieu [--d1 <kho>] [--bo SALES,…] [--trang /orders,…]
// Ảnh: ~/tourdao-ux-2026-10-27/anh-day-du/<nhan>/<bo>/<trang>-<khổ>.jpg; số liệu: docs/evidence/2026-10-27-danh-gia-ux-tong-the/so-lieu/<nhan>.json
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { dangNhap, moChrome, sleep } from "./cdp.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const EVID = join(HERE, "..");
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const NHAN = arg("--nhan", "nhieu");
const BASE = arg("--base", "http://localhost:8790");
const D1 = arg("--d1", join(homedir(), "tourdao-ux-2026-10-27", "d1"));
const CHI_BO = arg("--bo") ? arg("--bo").split(",") : null;
const CHI_TRANG = arg("--trang") ? arg("--trang").split(",") : null;
const ANH = join(homedir(), "tourdao-ux-2026-10-27", "anh-day-du", NHAN);
const AXE = process.env.AXE_JS ? readFileSync(process.env.AXE_JS, "utf8") : null;
if (!AXE) { console.error("Thiếu AXE_JS"); process.exit(2); }
const DO = readFileSync(join(HERE, "do-trong-trang.js"), "utf8");

const maTran = JSON.parse(readFileSync(join(EVID, "ma-tran-quyen.json"), "utf8"));
const taiKhoanTho = JSON.parse(readFileSync(arg("--tk", join(HERE, "tai-khoan.json")), "utf8"));
const dsTk = Array.isArray(taiKhoanTho) ? taiKhoanTho : taiKhoanTho.taiKhoan ?? Object.values(taiKhoanTho);
const tkTheoBo = {};
for (const t of dsTk) { const bo = t.bo ?? t.boQuyen; if (bo && !tkTheoBo[bo]) tkTheoBo[bo] = { phone: t.phone ?? t.sdt, pin: t.pin, ten: t.ten ?? t.name, id: t.id }; }

const sql = (q) => { try { return JSON.parse(execFileSync("npx", ["wrangler", "d1", "execute", "tourdao-sales-db", "--local", "--persist-to", D1, "--json", "--command", q], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], env: { ...process.env, CI: "1" } }))[0].results; } catch { return []; } };
const mot = (q) => sql(q)[0]?.id ?? null;
const ID = {
  order: mot("SELECT id FROM orders WHERE status <> 'draft' ORDER BY created_at DESC LIMIT 1") ?? mot("SELECT id FROM orders LIMIT 1"),
  trip: mot("SELECT id FROM vc_trip ORDER BY created_at DESC LIMIT 1"),
  xe: mot("SELECT id FROM vc_vehicle LIMIT 1"),
  ve: mot("SELECT id FROM fbk_ticket ORDER BY created_at DESC LIMIT 1"),
};
const coId = (p) => ({ "/order": ID.order && `?id=${ID.order}`, "/chuyen": ID.trip && `?id=${ID.trip}`, "/chuyen-sua": "", "/xe-chi-tiet": ID.xe && `?id=${ID.xe}`, "/xe-sua": "", "/cuoc-chuyen": ID.trip && `?id=${ID.trip}` }[p] ?? "");

export const HO = {
  "danh sách": ["/orders", "/cho-xac-nhan", "/parties", "/staff", "/xe", "/cuoc", "/xe-dang-chay", "/giay-to-sap-het-han", "/de-nghi", "/audit", "/sessions", "/feedback"],
  "bảng điều khiển": ["/", "/tai-xe", "/dieu-phoi", "/lich-xe-ban", "/so-cong-no", "/hoa-hong", "/khoa-thang", "/bang-ke-xe"],
  "chi tiết": ["/order", "/chuyen", "/xe-chi-tiet", "/cuoc-chuyen"],
  "biểu mẫu": ["/order-form", "/chuyen-sua", "/xe-sua", "/dieu-chinh-cong-no", "/chup-bu", "/ban"],
};
const hoCua = (p) => Object.entries(HO).find(([, ds]) => ds.includes(p))?.[0] ?? "thiết lập";
const KHO = [[390, 844, true], [1040, 800, false]];
const KHO_THEM = [[768, 1024, true], [1440, 900, false]];
const tenTep = (p) => (p === "/" ? "trang-chu" : p.slice(1).replace(/[^a-z0-9-]/gi, "_"));

const ketQua = [];
const chrome = await moChrome();
try {
  for (const [bo, info] of Object.entries(maTran.bo)) {
    if (CHI_BO && !CHI_BO.includes(bo)) continue;
    const tk = tkTheoBo[bo];
    if (!tk) { console.log(`⚠ thiếu tài khoản cho bộ ${bo}`); ketQua.push({ bo, loi: "thiếu tài khoản" }); continue; }
    const c = await dangNhap(BASE, tk.phone, tk.pin);
    const ngan = await chrome.moNgan();
    await ngan.cookie(c, BASE);
    // Một trang ngoài quyền (trang quyền rộng nhất mà bộ này không có lối vào) + một đường lạ.
    const ngoai = ["/audit", "/staff", "/so-cong-no", "/dieu-phoi", "/orders"].find((p) => !info.trang.includes(p));
    const dsTrang = [...info.trang.filter((p) => !["/home", "/danh-muc-giay-to"].includes(p)), ...(ngoai ? [`403:${ngoai}`] : []), "404:/khong-co-trang-nay"];
    for (const muc of dsTrang) {
      const [loai, duong] = muc.includes(":") ? muc.split(":") : ["", muc];
      if (CHI_TRANG && !CHI_TRANG.includes(duong)) continue;
      const ho = loai ? `trạng thái ${loai}` : hoCua(duong);
      const kho = ["danh sách", "bảng điều khiển"].includes(ho) ? [...KHO, ...KHO_THEM] : KHO;
      for (const [w, h, mobile] of kho) {
        const dir = join(ANH, bo); mkdirSync(dir, { recursive: true });
        const anh = join(dir, `${loai ? loai + "-" : ""}${tenTep(duong)}-${w}.jpg`);
        const o = { bo, trang: duong, loai: loai || null, ho, kho: w };
        try {
          await ngan.khung(w, h, mobile);
          await ngan.di(BASE + duong + coId(duong));
          await sleep(300);
          o.url = (await ngan.ev("location.pathname + location.search")).replace(/id=[^&]+/, "id=…");
          await ngan.ev(`window.__UX_MOBILE = ${mobile}; 0`);
          o.do = await ngan.ev(DO);
          await ngan.ev(AXE + ";0");
          o.axe = await ngan.ev(`axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] }, resultTypes: ["violations"] }).then((r) => r.violations.map((v) => ({ id: v.id, impact: v.impact, n: v.nodes.length, vd: v.nodes.slice(0, 2).map((x) => x.target.join(" ")) })))`);
          await ngan.ev("scrollTo(0,0);0");
          // Ảnh "màn đầu" (đúng như mắt thấy, thanh dính ở đúng chỗ) + ảnh cả trang (thanh dính/nút nổi hiện lơ lửng ở vị trí chụp — đừng đọc là lỗi).
          await ngan.chup(anh.replace(/\.jpg$/, "-man-dau.jpg"), false);
          await ngan.chup(anh);
          o.anh = anh.replace(homedir(), "~");
          if (!mobile && w === 1040) {
            // Focus: Tab 12 lần từ đầu trang; ghi phần tử nhận focus có viền/bóng thấy được không.
            await ngan.ev("document.activeElement && document.activeElement.blur(); 0");
            const f = [];
            for (let i = 0; i < 12; i++) {
              await ngan.phim("Tab", "Tab", 9);
              f.push(await ngan.ev(`(() => { const e = document.activeElement; if (!e || e === document.body) return null; const s = getComputedStyle(e); const vien = s.outlineStyle !== "none" && parseFloat(s.outlineWidth) > 0; const bong = s.boxShadow !== "none"; return { ten: (e.getAttribute("aria-label") || e.innerText || e.tagName).trim().slice(0, 30), thay: vien || bong, vien: vien ? s.outlineWidth + " " + s.outlineColor : null }; })()`));
            }
            o.focus = f.filter(Boolean);
          }
          o.loiConsole = [...ngan.loi];
          console.log(`✓ ${bo} ${muc} ${w} → ${o.url} axe ${o.axe.length} nhỏ44 ${o.do.soNhoHon44} tràn ${o.do.tranNgang}`);
        } catch (e) {
          o.loi = String(e).slice(0, 400);
          console.log(`✗ ${bo} ${muc} ${w}: ${o.loi}`);
        }
        ketQua.push(o);
      }
    }
    await ngan.dong();
  }
} finally {
  await chrome.tat();
  mkdirSync(join(EVID, "so-lieu"), { recursive: true });
  const ra = join(EVID, "so-lieu", `${NHAN}${CHI_BO ? "-" + CHI_BO.join("_") : ""}${CHI_TRANG ? "-tung-trang" : ""}.json`);
  writeFileSync(ra, JSON.stringify({ nhan: NHAN, luc: new Date().toISOString(), base: BASE, ketQua }, null, 1));
  console.log(`Ghi ${ra} (${ketQua.length} ô)`);
}
