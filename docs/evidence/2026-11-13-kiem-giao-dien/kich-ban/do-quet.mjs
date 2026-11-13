// Quét đo cho KIỂM GIAO DIỆN TOÀN DIỆN 13/11/2026 (bước 0 kế hoạch 2026-11-13). Dựng trên do-trang.mjs (27/10), đổi khổ theo kế hoạch mục 2:
//   ẢNH + đo đủ: 390×844 (iPhone), 820×1180 (iPad đứng, máy iPad), 1280×800 (máy tính).
//   CHỈ SỐ (không ảnh, không axe): 360×780, 430×932 (điện thoại), 1180×820 (iPad nằm), 1024×768, 1440×900 (máy tính).
//   T16 (chữ lớn) hai phép XẤP XỈ (Chrome không giả lập được Dynamic Type của iOS): (a) phóng 200 % kiểu WCAG = khung 640×400 ở tỉ lệ điểm ảnh 2;
//       (b) nhân đôi mọi token cỡ chữ --fs-* ở 390. Ảnh màn đầu cho (b).
//   T15: cây trợ năng của Chrome (Accessibility.getFullAXTree) ở 390 và 1280 — đếm phần tử tương tác KHÔNG có tên.
//   T8: axe-core WCAG 2.0/2.1/2.2 A+AA ở 390 và 1280. Thử Tab 12 lần ở 1280.
// Mỗi bộ quyền × mỗi trang có lối vào (ma-tran-quyen.json 13/11, sinh từ TRANG) + 403 (trang ngoài quyền) + 404 + mất mạng. Bộ «KHACH» (chưa đăng nhập): /login, /404, /ngoai-mang.
// Chạy từ GỐC kho, máy chủ thử đang chạy:
//   AXE_JS=<axe.min.js ngoài kho> node docs/evidence/2026-11-13-kiem-giao-dien/kich-ban/do-quet.mjs --nhan nhieu --base http://localhost:8815 --d1 ~/tourdao-ux-2026-11-13/d1 \
//     --tk ~/tourdao-ux-2026-11-13/tai-khoan.json [--bo SALES,…] [--trang /orders,…] [--nhe]   (--nhe: chỉ 390 + 1280, không chỉ số, không T16 — cho trạng thái rỗng)
// Ảnh: ~/tourdao-ux-2026-11-13/anh/<nhan>/<bo>/<trang>-<khổ>[-man-dau].jpg; số liệu: ~/tourdao-ux-2026-11-13/so-lieu/<nhan>-<bo…>.json (tóm tắt vào kho do tong-hop.mjs).
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { dangNhap, moChrome, sleep } from "./cdp.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const EVID = join(HERE, "..");
const GOC = join(homedir(), "tourdao-ux-2026-11-13");
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const NHAN = arg("--nhan", "nhieu");
const BASE = arg("--base", "http://localhost:8815");
const D1 = arg("--d1", join(GOC, "d1"));
const NHE = process.argv.includes("--nhe");
const CHI_BO = arg("--bo") ? arg("--bo").split(",") : null;
const CHI_TRANG = arg("--trang") ? arg("--trang").split(",") : null;
const ANH = join(GOC, "anh", NHAN);
const AXE = process.env.AXE_JS ? readFileSync(process.env.AXE_JS, "utf8") : null;
if (!AXE) { console.error("Thiếu AXE_JS"); process.exit(2); }
const DO = readFileSync(join(HERE, "do-trong-trang.js"), "utf8");
const DO_LOI = readFileSync(join(EVID, "..", "2026-10-30-danh-gia-khung-giao-dien", "kich-ban", "do-loi-hien-thi.js"), "utf8");
const DO_THEM = readFileSync(join(HERE, "do-them.js"), "utf8");

const maTran = JSON.parse(readFileSync(join(EVID, "ma-tran-quyen.json"), "utf8"));
const dsTk = JSON.parse(readFileSync(arg("--tk", join(GOC, "tai-khoan.json")), "utf8")).taiKhoan;
const tkTheoBo = {};
for (const t of dsTk) { const bo = String(t.bo).split("+")[0]; if (!tkTheoBo[bo]) tkTheoBo[bo] = { phone: t.sdt, pin: t.pin }; }

const sql = (q) => { try { return JSON.parse(execFileSync("npx", ["wrangler", "d1", "execute", "tourdao-sales-db", "--local", "--persist-to", D1, "--json", "--command", q], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], env: { ...process.env, CI: "1" } }))[0].results; } catch { return []; } };
const mot = (q) => sql(q)[0]?.id ?? null;
const ID = {
  order: mot("SELECT id FROM orders WHERE status <> 'draft' ORDER BY created_at DESC LIMIT 1") ?? mot("SELECT id FROM orders LIMIT 1"),
  trip: mot("SELECT id FROM vc_trip ORDER BY created_at DESC LIMIT 1"),
  xe: mot("SELECT id FROM vc_vehicle LIMIT 1"),
  ve: mot("SELECT id FROM fbk_ticket ORDER BY created_at DESC LIMIT 1"),
};
const coId = (p) => ({ "/order": ID.order && `?id=${ID.order}`, "/chuyen": ID.trip && `?id=${ID.trip}`, "/xe-chi-tiet": ID.xe && `?id=${ID.xe}`, "/feedback": ID.ve && `?id=${ID.ve}` }[p] ?? "");

const HO = {
  "danh sách": ["/orders", "/cho-xac-nhan", "/parties", "/staff", "/xe", "/cuoc", "/xe-dang-chay", "/giay-to-sap-het-han", "/de-nghi", "/audit", "/sessions", "/feedback", "/huong-dan", "/ve-kho", "/ve-doi-chieu", "/catalog"],
  "bảng điều khiển": ["/", "/tai-xe", "/dieu-phoi", "/lich-xe-ban", "/so-cong-no", "/hoa-hong", "/khoa-thang", "/bang-ke-xe"],
  "chi tiết": ["/order", "/chuyen", "/xe-chi-tiet", "/cuoc-chuyen"],
  "biểu mẫu": ["/order-form", "/chuyen-sua", "/xe-sua", "/dieu-chinh-cong-no", "/chup-bu", "/ban", "/quet-ve"],
};
const hoCua = (p) => Object.entries(HO).find(([, ds]) => ds.includes(p))?.[0] ?? "thiết lập";
// [rộng, cao, mobile, dpr, máy, ảnh?]
const KHO_ANH = [[390, 844, true, 1, "iphone"], [820, 1180, true, 1, "ipad"], [1280, 800, false, 1, "may-tinh"]];
const KHO_SO = [[360, 780, true, 1, "iphone"], [430, 932, true, 1, "iphone"], [1180, 820, true, 1, "ipad"], [1024, 768, false, 1, "may-tinh"], [1440, 900, false, 1, "may-tinh"]];
const tenTep = (p) => (p === "/" ? "trang-chu" : p.slice(1).replace(/[^a-z0-9-]/gi, "_"));
const VAI_TUONG_TAC = new Set(["button", "link", "textbox", "searchbox", "combobox", "checkbox", "radio", "tab", "menuitem", "switch", "spinbutton", "listbox", "slider", "option", "menuitemcheckbox", "menuitemradio"]);
const NHAN_DOI_CO = `(() => { const ds = []; for (const sh of document.styleSheets) { let rs; try { rs = sh.cssRules; } catch { continue; } for (const r of rs) if (r.selectorText === ":root") for (const k of r.style) if (k.startsWith("--fs-")) ds.push(k); }
  const st = getComputedStyle(document.documentElement); const doi = {}; for (const k of new Set(ds)) { const v = st.getPropertyValue(k).trim(); const m = v.match(/^([\\d.]+)px$/); if (m) { document.documentElement.style.setProperty(k, (2 * +m[1]) + "px"); doi[k] = v; } } return Object.keys(doi).length; })()`;

const ketQua = [];
mkdirSync(join(GOC, "so-lieu"), { recursive: true });
const RA = join(GOC, "so-lieu", `${NHAN}${CHI_BO ? "-" + CHI_BO.join("_") : ""}${CHI_TRANG ? "-tung-trang" : ""}.json`);
const ghiKetQua = (xong) => writeFileSync(RA, JSON.stringify({ nhan: NHAN, luc: new Date().toISOString(), base: BASE, id: Object.fromEntries(Object.entries(ID).map(([k, v]) => [k, !!v])), xong, ketQua }, null, 1));

async function doO(ngan, o, { w, mobile, chupAnh, axe, ax, tab, anh }) {
  o.url = (await ngan.ev("location.pathname + location.search").catch(() => "(không đọc được)")).replace(/id=[^&]+/, "id=…");
  await ngan.ev(`window.__UX_MOBILE = ${mobile}; 0`);
  o.do = await ngan.ev(DO);
  o.loiHt = await ngan.ev(DO_LOI);
  o.them = await ngan.ev(DO_THEM);
  if (axe) {
    await ngan.ev(AXE + ";0");
    o.axe = await ngan.ev(`axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] }, resultTypes: ["violations"] }).then((r) => r.violations.map((v) => ({ id: v.id, impact: v.impact, n: v.nodes.length, vd: v.nodes.slice(0, 3).map((x) => x.target.join(" ")) })))`);
  }
  if (ax) {
    const nodes = await ngan.cayTroNang();
    const tuongTac = nodes.filter((n) => !n.ignored && VAI_TUONG_TAC.has(n.role?.value));
    const khongTen = tuongTac.filter((n) => !String(n.name?.value ?? "").trim());
    o.t15 = { soTuongTac: tuongTac.length, soKhongTen: khongTen.length, vd: khongTen.slice(0, 8).map((n) => ({ vai: n.role?.value, id: n.backendDOMNodeId })), anhKhongTen: nodes.filter((n) => !n.ignored && n.role?.value === "image" && !String(n.name?.value ?? "").trim()).length };
    if (khongTen.length) {
      // Lấy mô tả DOM của tối đa 8 nút không tên để người đọc biết là cái gì.
      o.t15.mota = [];
      for (const n of khongTen.slice(0, 8)) {
        const r = await ngan.s("DOM.describeNode", { backendNodeId: n.backendDOMNodeId }).catch(() => null);
        const nd = r?.result?.node; if (!nd) continue;
        const at = {}; for (let i = 0; i < (nd.attributes ?? []).length; i += 2) at[nd.attributes[i]] = nd.attributes[i + 1];
        o.t15.mota.push(`${n.role?.value}:${nd.localName}${at.id ? "#" + at.id : ""}${at.class ? "." + at.class.split(/\s+/).slice(0, 2).join(".") : ""}${at.type ? "[" + at.type + "]" : ""}`);
      }
    }
  }
  await ngan.ev("scrollTo(0,0);0");
  if (chupAnh) {
    await ngan.chup(anh.replace(/\.jpg$/, "-man-dau.jpg"), false);
    await ngan.chup(anh);
    o.anh = anh.replace(homedir(), "~");
  }
  if (tab) {
    await ngan.ev("document.activeElement && document.activeElement.blur(); 0");
    const f = [];
    for (let i = 0; i < 12; i++) {
      await ngan.phim("Tab", "Tab", 9);
      f.push(await ngan.ev(`(() => { const e = document.activeElement; if (!e || e === document.body) return null; const s = getComputedStyle(e); const vien = s.outlineStyle !== "none" && parseFloat(s.outlineWidth) > 0; const bong = s.boxShadow !== "none"; return { ten: (e.getAttribute("aria-label") || e.innerText || e.tagName).trim().slice(0, 30), thay: vien || bong }; })()`));
    }
    o.focus = f.filter(Boolean);
  }
}

const chrome = await moChrome();
try {
  const boList = [...Object.keys(maTran.bo), "KHACH"];
  for (const bo of boList) {
    if (CHI_BO && !CHI_BO.includes(bo)) continue;
    const info = maTran.bo[bo];
    const ngan = await chrome.moNgan();
    let dsTrang;
    if (bo === "KHACH") dsTrang = ["/login", "404:/khong-co-trang-nay", "/ngoai-mang"];
    else {
      const tk = tkTheoBo[bo];
      if (!tk) { ketQua.push({ bo, loi: "thiếu tài khoản" }); continue; }
      await ngan.cookie(await dangNhap(BASE, tk.phone, tk.pin), BASE);
      const ngoai = ["/audit", "/staff", "/so-cong-no", "/dieu-phoi", "/orders"].find((p) => !info.trang.includes(p));
      dsTrang = [...info.trang.filter((p) => !["/home", "/danh-muc-giay-to"].includes(p)), ...(ngoai ? [`403:${ngoai}`] : []), "404:/khong-co-trang-nay", `matmang:${info.trangDau ?? "/"}`];
    }
    // /cuoc-chuyen: lấy chuyến CỦA CHÍNH tài khoản từ thẻ đầu ở /cuoc (27/10 lấy chuyến đầu của kho ⇒ «Không tìm thấy chuyến» giả).
    let cuocId = "";
    if (dsTrang.includes("/cuoc-chuyen")) {
      await ngan.khung(390, 844, true); await ngan.di(BASE + "/cuoc");
      cuocId = (await ngan.ev(`(document.querySelector('a[href^="/cuoc-chuyen?id="]')?.getAttribute("href") ?? "").split("?")[1] ?? ""`).catch(() => "")) || "";
    }
    for (const muc of dsTrang) {
      const [loai, duong] = muc.includes(":") ? muc.split(":") : ["", muc];
      if (CHI_TRANG && !CHI_TRANG.includes(duong) && !CHI_TRANG.includes(loai)) continue;
      const ho = loai ? `trạng thái ${loai}` : hoCua(duong);
      const url = BASE + duong + (duong === "/cuoc-chuyen" ? (cuocId ? "?" + cuocId : "") : coId(duong));
      const cacKho = [...KHO_ANH.map((k) => [...k, true]), ...(NHE || loai ? [] : KHO_SO.map((k) => [...k, false]))].filter((k) => !NHE || k[0] !== 820);
      for (const [w, h, mobile, dpr, may, coAnh] of cacKho) {
        const dir = join(ANH, bo); mkdirSync(dir, { recursive: true });
        const anh = join(dir, `${loai ? loai + "-" : ""}${tenTep(duong)}-${w}.jpg`);
        const o = { bo, trang: duong, loai: loai || null, ho, kho: w, may, anh: null };
        try {
          await ngan.khung(w, h, mobile, dpr, may);
          if (loai === "matmang") { await ngan.di(BASE + duong); await sleep(400); await ngan.matMang(true); await ngan.di(BASE + duong); await sleep(800); }
          else await ngan.di(url);
          await sleep(coAnh ? 700 : 300);
          await doO(ngan, o, { w, mobile, chupAnh: coAnh, axe: coAnh && w !== 820, ax: coAnh && w !== 820, tab: w === 1280, anh });
          console.log(`✓ ${bo} ${muc} ${w} tràn ${o.do.tranNgang} nhỏ44 ${o.do.soNhoHon44} t3 ${o.them.t3.length} chồng ${o.them.chong.length} cắt ${o.loiHt.cat.length}${o.axe ? " axe " + o.axe.length : ""}${o.t15 ? " khôngTên " + o.t15.soKhongTen : ""}`);
        } catch (e) { o.loi = String(e).slice(0, 400); console.log(`✗ ${bo} ${muc} ${w}: ${o.loi}`); }
        finally { if (loai === "matmang") await ngan.matMang(false).catch(() => {}); }
        ketQua.push(o);
      }
      // T16 — hai phép xấp xỉ, chỉ trang thật (không 403/404/mất mạng), trạng thái đủ.
      if (!NHE && !loai) {
        for (const [kieu, w, h, mobile, dpr, may] of [["zoom200", 640, 400, false, 2, "may-tinh"], ["chu-x2", 390, 844, true, 1, "iphone"]]) {
          const o = { bo, trang: duong, loai: null, ho, kho: `t16-${kieu}`, may, anh: null };
          try {
            await ngan.khung(w, h, mobile, dpr, may);
            await ngan.di(url); await sleep(500);
            if (kieu === "chu-x2") { o.soTokenDoi = await ngan.ev(NHAN_DOI_CO); await sleep(200); }
            o.url = (await ngan.ev("location.pathname").catch(() => ""));
            o.loiHt = await ngan.ev(DO_LOI);
            o.them = await ngan.ev(DO_THEM);
            o.tranNgang = await ngan.ev("document.documentElement.scrollWidth > innerWidth + 1");
            if (kieu === "chu-x2") { const a = join(ANH, bo, `t16-${tenTep(duong)}-390.jpg`); await ngan.ev("scrollTo(0,0);0"); await ngan.chup(a, false); o.anh = a.replace(homedir(), "~"); }
            console.log(`✓ ${bo} ${duong} T16 ${kieu} tràn ${o.tranNgang} chồng ${o.them.chong.length} cắt ${o.loiHt.cat.length}`);
          } catch (e) { o.loi = String(e).slice(0, 400); console.log(`✗ ${bo} ${duong} T16 ${kieu}: ${o.loi}`); }
          ketQua.push(o);
        }
      }
    }
    await ngan.dong().catch(() => {});
    ghiKetQua(false);
    console.log(`— xong bộ ${bo}: ${ketQua.length} ô`);
  }
} finally {
  await chrome.tat();
  ghiKetQua(true);
  console.log(`Ghi ${RA} (${ketQua.length} ô)`);
}
