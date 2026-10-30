// Quét «lưới bố cục» (Chặng 3, 30/10/2026): mỗi trang × khổ 1040×900, 1440×900, 390×844, bộ quyền rộng nhất có lối vào (ma-tran-quyen.json 29/10),
// trạng thái NHIỀU (kho ~/tourdao-ux-luoi/d1 = bản chép kho 27/10 v2 + migration 0120–0127). Mỗi ô chạy do-luoi.js; trang đại diện chụp PNG (tối đa 2 màn).
// Chạy từ GỐC worktree, máy chủ thử đang chạy (may-chu.mjs --port 8810 --d1 ~/tourdao-ux-luoi/d1):
//   node docs/evidence/2026-10-30-luoi-bo-cuc/kich-ban/do-luoi.mjs [--base http://localhost:8810] [--trang /orders,…] [--khong-anh]
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { dangNhap, moChrome, sleep } from "./cdp.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const EVID = join(HERE, "..");
const ROOT = join(EVID, "..", "..", "..");
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const BASE = arg("--base", "http://localhost:8810");
const D1 = arg("--d1", join(homedir(), "tourdao-ux-luoi", "d1"));
const CHI_TRANG = arg("--trang") ? arg("--trang").split(",") : null;
const KHONG_ANH = process.argv.includes("--khong-anh");
const DO = readFileSync(join(HERE, "do-luoi.js"), "utf8");
const maTran = JSON.parse(readFileSync(join(ROOT, "docs/evidence/2026-10-29-dot-0-khung-chung/ma-tran-quyen.json"), "utf8"));
const tk = JSON.parse(readFileSync(join(ROOT, "docs/evidence/2026-10-27-danh-gia-ux-tong-the/kich-ban/tai-khoan.json"), "utf8")).taiKhoan;
const tkCua = (bo) => tk.find((t) => t.bo.split("+")[0] === bo);

// Khuôn trang: KIEM-KE.md mục 5 (27/10) + /thiet-lap = thiết lập (kế hoạch 0b Task 6).
const KHUON = {
  "bảng điều khiển": ["/", "/bang-ke-xe", "/dieu-phoi", "/hoa-hong", "/khoa-thang", "/lich-xe-ban", "/so-cong-no", "/tai-xe"],
  "danh sách": ["/audit", "/cho-xac-nhan", "/cuoc", "/de-nghi", "/feedback", "/giay-to-sap-het-han", "/orders", "/parties", "/sessions", "/staff", "/xe", "/xe-dang-chay"],
  "chi tiết": ["/chuyen", "/cuoc-chuyen", "/order", "/xe-chi-tiet"],
  "biểu mẫu": ["/ban", "/chup-bu", "/chuyen-sua", "/dieu-chinh-cong-no", "/order-form", "/xe-sua"],
  "thiết lập": ["/account", "/bang-gia-xe", "/catalog", "/chinh-sach-dieu-phoi", "/dieu-kien-xuat-ben", "/giao-dien", "/gui-thong-bao", "/help", "/loai-giay-to-nguoi", "/loai-giay-to-xe", "/locations", "/ly-do-dieu-phoi", "/nguoi-ban", "/tro-ly-cai-dat", "/thiet-lap"],
};
const khuonCua = (p) => Object.entries(KHUON).find(([, ds]) => ds.includes(p))?.[0] ?? "?";
// Bộ quyền rộng nhất có lối vào: SUPER_ADMIN cho mọi trang của nó; trang tài xế lấy DRIVER, /ban lấy DRIVER_PARTNER.
const THU_TU_BO = ["SUPER_ADMIN", "DRIVER", "DRIVER_PARTNER"];
const boCua = (p) => THU_TU_BO.find((b) => maTran.bo[b].trang.includes(p));

const sql = (q) => { try { return JSON.parse(execFileSync("npx", ["wrangler", "d1", "execute", "tourdao-sales-db", "--local", "--persist-to", D1, "--json", "--command", q], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], env: { ...process.env, CI: "1" } }))[0].results; } catch { return []; } };
const mot = (q) => sql(q)[0]?.id ?? null;
const pTaiXe = tkCua("DRIVER")?.partyId ?? mot("SELECT party_id id FROM staff WHERE phone='0900000909'");
const ID = {
  // đơn nhiều dòng dịch vụ nhất (chi tiết đơn «NHIỀU»)
  order: mot("SELECT o.id FROM orders o JOIN order_item l ON l.order_id=o.id WHERE o.status<>'draft' GROUP BY o.id ORDER BY count(*) DESC, o.created_at DESC LIMIT 1") ?? mot("SELECT id FROM orders WHERE status<>'draft' ORDER BY created_at DESC LIMIT 1"),
  trip: mot("SELECT id FROM vc_trip WHERE status='RUNNING' ORDER BY created_at DESC LIMIT 1") ?? mot("SELECT id FROM vc_trip ORDER BY created_at DESC LIMIT 1"),
  tripTaiXe: mot(`SELECT t.id FROM vc_trip t JOIN vc_trip_driver d ON d.trip_id=t.id WHERE d.driver_party_id='${pTaiXe}' AND d.valid_to_at IS NULL ORDER BY (t.status='RUNNING') DESC, t.created_at DESC LIMIT 1`),
  xe: mot("SELECT id FROM vc_vehicle LIMIT 1"),
};
console.log("ID:", JSON.stringify(ID));
const thamSo = (p) => ({ "/order": ID.order && `?id=${ID.order}`, "/chuyen": ID.trip && `?id=${ID.trip}`, "/xe-chi-tiet": ID.xe && `?id=${ID.xe}`, "/cuoc-chuyen": ID.tripTaiXe && `?id=${ID.tripTaiXe}` }[p] ?? "");

// Ảnh đại diện (thứ tự hai chữ số theo đề bài); 390 chỉ cho Đơn hàng, Chi tiết đơn, Tạo đơn.
const ANH = [["/orders", "orders"], ["/parties", "parties"], ["/xe", "xe"], ["/order", "order"], ["/chuyen", "chuyen"], ["/order-form", "order-form"], ["/staff", "staff"], ["/so-cong-no", "so-cong-no"], ["/hoa-hong", "hoa-hong"], ["/catalog", "catalog"], ["/", "trang-chu"]];
const ANH_390 = ["/orders", "/order", "/order-form"];
const soAnh = (p) => String(ANH.findIndex(([x]) => x === p) + 1).padStart(2, "0");
const KHO = [[1040, 900, false], [1440, 900, false], [390, 844, true]];

const tatCaTrang = [...new Set(THU_TU_BO.flatMap((b) => maTran.bo[b].trang))].filter((p) => !["/home", "/danh-muc-giay-to", "/login"].includes(p));
const dsTrang = tatCaTrang.filter((p) => !CHI_TRANG || CHI_TRANG.includes(p));
mkdirSync(join(EVID, "so-lieu"), { recursive: true }); mkdirSync(join(EVID, "anh"), { recursive: true });
const RA = join(EVID, "so-lieu", CHI_TRANG ? "luoi-tung-trang.json" : "luoi.json");
const ketQua = [];
const ghi = (xong) => writeFileSync(RA, JSON.stringify({ luc: new Date().toISOString(), base: BASE, kho: "~/tourdao-ux-luoi/d1", xong, ketQua }, null, 1));

const chrome = await moChrome();
const ngan = {};
try {
  for (const p of dsTrang) {
    const bo = boCua(p); const t = tkCua(bo);
    if (!ngan[bo]) { const c = await dangNhap(BASE, t.sdt, t.pin); ngan[bo] = await chrome.moNgan(); await ngan[bo].cookie(c, BASE); }
    const n = ngan[bo];
    for (const [w, h, mobile] of KHO) {
      const o = { trang: p, khuon: khuonCua(p), bo, kho: w };
      try {
        await n.khung(w, h, mobile);
        await n.di(BASE + p + thamSo(p)); await sleep(500);
        o.url = (await n.ev("location.pathname + location.search")).replace(/id=[^&]+/, "id=…");
        const t0 = Date.now(); o.do = await n.ev(DO); o.msDo = Date.now() - t0;
        const chupKhong = !KHONG_ANH && ANH.some(([x]) => x === p) && (w !== 390 || ANH_390.includes(p));
        if (chupKhong) {
          await n.ev("scrollTo(0,0);0");
          const cao = await n.ev(`Math.min(document.documentElement.scrollHeight, ${2 * h})`);
          const tep = join(EVID, "anh", `${soAnh(p)}-${ANH.find(([x]) => x === p)[1]}-${w}.png`);
          const r = await n.s("Page.captureScreenshot", { format: "png", captureBeyondViewport: true, clip: { x: 0, y: 0, width: w, height: cao, scale: 1 } });
          if (!r.result?.data) throw new Error("chụp lỗi: " + JSON.stringify(r.error ?? r).slice(0, 200));
          writeFileSync(tep, Buffer.from(r.result.data, "base64")); o.anh = tep.slice(EVID.length + 1);
        }
        const d = o.do;
        console.log(`✓ ${p} ${w} main ${d.a?.main?.rong} (max ${d.a?.main?.maxWidth}) con ${d.a?.conDau?.rong} b${d.b?.so} c${d.c?.so} d${d.d?.so} tràn ${d.e?.tranNgang} nút ${d.e?.soHangNutLon} lặp ${d.f?.lap} ${o.msDo}ms${o.anh ? " ảnh" : ""}`);
      } catch (e) { o.loi = String(e).slice(0, 400); console.log(`✗ ${p} ${w}: ${o.loi}`); }
      ketQua.push(o);
    }
    ghi(false);
  }
} finally {
  for (const n of Object.values(ngan)) await n.dong().catch(() => {});
  await chrome.tat(); ghi(true); console.log(`Ghi ${RA} (${ketQua.length} ô)`);
}
