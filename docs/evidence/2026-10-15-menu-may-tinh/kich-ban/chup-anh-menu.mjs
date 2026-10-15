// Chụp ảnh THẬT (Việc 7b, 15/10) của thanh bên mới + Trang chủ "Việc của bạn" + dải anh em, theo vai và khổ, từ D1 local tạm (không đụng production). KHÔNG khẳng định gì:
// đây là bằng chứng để NHÌN bằng mắt (ảnh ở docs/evidence/2026-10-15-menu-may-tinh/anh/) và để in các số đo vài chi tiết thị giác (cỡ chữ nút Thiết lập / Đăng xuất,
// số ô bộ xương, vị trí dải anh em so với tiêu đề). Chạy từ GỐC repo, sau `npm run build:web`:
//   OUT=<thư mục> node docs/evidence/2026-10-15-menu-may-tinh/kich-ban/chup-anh-menu.mjs
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { ACCOUNTS, THEM, dungMoiTruong, gieoDuLieu, tiemDieuChinh } from "./menu-lib.mjs";

const OUT = process.env.OUT ?? "docs/evidence/2026-10-15-menu-may-tinh";
mkdirSync(join(OUT, "anh"), { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const KHO = (w, h = 900) => ({ width: w, height: h, mobile: false });
const { env, call } = await dungMoiTruong();
try {
  await gieoDuLieu(env, call);
  const mo = async (acc, path, vp, truoc = null) => {
    const p = await env.openPage(vp);
    const c = await env.login(acc);
    await p.send("Network.setCookie", { name: c.name, value: c.value, url: env.base, httpOnly: true });
    if (truoc) await truoc(p);
    await p.send("Page.navigate", { url: env.base + path });
    await p.waitFor("document.readyState === 'complete'", "tải xong");
    return p;
  };
  const chup = async (p, ten) => { await sleep(500); await p.shot(join(OUT, "anh", ten)); };
  const VAN_PHONG = [
    ["ban-hang", ACCOUNTS.salesA],
    ["ke-toan", ACCOUNTS.accounting],
    ["quan-tri", ACCOUNTS.admin],
    ["toan-quyen", THEM.toanQuyen],
  ];
  // 1) Trang chủ bốn vai văn phòng: 1440, 1024, 800, 660 (thanh bên hiện từ 641px)
  for (const [ten, acc] of VAN_PHONG) {
    for (const w of [1440, 1024, 800, 660]) {
      const p = await mo(acc, "/", KHO(w), (pg) => tiemDieuChinh(pg, 2));
      try {
        await p.waitFor("!document.querySelector('#dash-grid').hidden", "Trang chủ", 15000);
        await sleep(700);
        await chup(p, `trang-chu-${ten}-${w}.png`);
        if (w === 1440) {
          const d = await p.ev(`(() => { const cs = (s) => { const e = document.querySelector(s); return e ? { px: getComputedStyle(e).fontSize, w: getComputedStyle(e).fontWeight, h: Math.round(e.getBoundingClientRect().height) } : null; };
            return { thietLap: cs('.sidebar-group-toggle'), dangXuat: cs('.sidebar-logout'), muc: cs('.sidebar-item'), nhom: cs('.sidebar-group-title'), taoDon: cs('.sidebar-new'), nhanThe: cs('.dash-viec-nhan'), soThe: cs('.dash-viec-so') }; })()`);
          console.log(`   · cỡ chữ (${ten}, 1440): ${JSON.stringify(d)}`);
        }
      } finally {
        p.close();
      }
    }
  }
  // 2) Vai ngoài văn phòng: trang đầu của họ ở 1440 và 800
  for (const [ten, acc] of [["hdv", THEM.hdv], ["tai-xe", THEM.taiXe], ["nhan-su", THEM.nhanSu], ["doi-tac", THEM.doiTac]]) {
    for (const w of [1440, 800]) {
      const p = await mo(acc, "/", KHO(w));
      try {
        await sleep(3500);
        console.log(`   · ${ten} ${w}: trang đầu = ${await p.ev("location.pathname")}`);
        await chup(p, `vai-${ten}-${w}.png`);
      } finally {
        p.close();
      }
    }
  }
  // 3) Nhóm Thiết lập mở (Quản trị, 1440): ở /staff nhóm tự mở; ở / bấm nút mở
  {
    const p = await mo(ACCOUNTS.admin, "/staff", KHO(1440));
    try { await p.waitFor("document.querySelectorAll('#sidebar .sidebar-item').length > 5", "thanh bên", 15000); await sleep(800); await chup(p, "thiet-lap-tu-mo-quan-tri-1440.png"); } finally { p.close(); }
    const q = await mo(THEM.toanQuyen, "/", KHO(1440, 1000), (pg) => tiemDieuChinh(pg, 2));
    try {
      await q.waitFor("!document.querySelector('#dash-grid').hidden", "Trang chủ", 15000);
      await q.ev("document.querySelector('#sidebar .sidebar-group-toggle').click(); true");
      await sleep(600);
      await chup(q, "thiet-lap-bam-mo-toan-quyen-1440.png");
      // tiêu điểm bàn phím vào nút Thiết lập (vòng tiêu điểm)
      await q.ev("document.querySelector('#sidebar .sidebar-group-toggle').focus(); true");
      await chup(q, "thiet-lap-tieu-diem-toan-quyen-1440.png");
    } finally { q.close(); }
  }
  // 4) Bộ xương khi đang tải: làm chậm /api/orders/dashboard 9 giây để chụp khung xương (máy tính 1440, Quản trị)
  {
    const p = await mo(ACCOUNTS.admin, "/", KHO(1440), (pg) =>
      pg.send("Page.addScriptToEvaluateOnNewDocument", { source: `(() => { const f = window.fetch; window.fetch = async (...a) => { const u = String(a[0]?.url ?? a[0]); if (u.includes('/api/orders/dashboard')) await new Promise((r) => setTimeout(r, 9000)); return f(...a); }; })();` }));
    try {
      await p.waitFor("!!document.querySelector('.dash-xuong-mt') && document.querySelector('.dash-xuong-mt').offsetParent !== null", "khung xương hiện", 8000);
      await sleep(600);
      const x = await p.ev(`({ oSo: document.querySelectorAll('.dash-xuong-mt-so > div').length, viecHien: document.querySelector('#dash-viec').offsetParent !== null })`);
      console.log(`   · bộ xương máy tính: ${JSON.stringify(x)}`);
      await chup(p, "bo-xuong-quan-tri-1440.png");
    } finally { p.close(); }
  }
  // 5) Dải anh em: /xe và /bang-gia-xe (Quản trị) ở 1440, 1024, 800 — dải TRÊN tiêu đề (hiện trạng) và thử dưới tiêu đề (đổi DOM tạm, chỉ để so ảnh)
  for (const [ten, path] of [["xe", "/xe"], ["lich-xe-ban", "/lich-xe-ban"], ["bang-gia-xe", "/bang-gia-xe"]]) {
    for (const w of [1440, 1024, 800]) {
      const p = await mo(ACCOUNTS.admin, path, KHO(w, 700));
      try {
        await p.waitFor("!!document.querySelector('nav.dai-anh-em')", "dải", 15000);
        await sleep(900);
        await chup(p, `dai-anh-em-tren-${ten}-${w}.png`);
        if (w === 1440) {
          await p.ev("document.querySelector('nav.dai-anh-em a:not([aria-current])').focus(); true");
          await chup(p, `dai-anh-em-tieu-diem-${ten}-${w}.png`);
        }
        if (w === 1440 || w === 800) {
          const co = await p.ev(`(() => { const n = document.querySelector('nav.dai-anh-em'); const h1 = document.querySelector('main h1'); if (!h1) return false; (h1.closest('.vc-page-head') ?? h1.parentElement.closest('div') ?? h1).after(n); return true; })()`);
          if (co) { await sleep(300); await chup(p, `dai-anh-em-duoi-${ten}-${w}.png`); }
        }
      } finally { p.close(); }
    }
  }
} finally {
  await env.stop();
}
console.log("CHUP ANH XONG");
