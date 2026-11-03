// Kịch bản kiểm độc lập: đo lỗi hiển thị Trang chủ (cắt/tràn/che) ở 4 khổ x 3 vai. Chạy từ gốc worktree: node /tmp/kd/do.mjs <nhãn>
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { randomUUID } from "node:crypto";
const A2 = process.cwd() + "/docs/evidence/2026-09-20-a2/kich-ban/a2-cdp.mjs";
const { ACCOUNTS, ok, sleep, startEnv, vnDate } = await import(A2);
const nhan = process.argv[2];
const OUT = `/tmp/kd/out-${nhan}`; mkdirSync(OUT, { recursive: true });
const DO_LOI = readFileSync("docs/evidence/2026-10-30-danh-gia-khung-giao-dien/kich-ban/do-loi-hien-thi.js", "utf8");
const TODAY = vnDate(0), TOMORROW = vnDate(1), LATER = vnDate(10);
const env = await startEnv();
try {
  const call = async (account, method, path, body) => {
    const c = await env.login(account);
    const r = await fetch(env.base + path, { method, headers: { "content-type": "application/json", origin: env.base, cookie: `${c.name}=${c.value}` }, body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: r.status, json: await r.json().catch(() => null) };
  };
  const svc = ({ departDate, pickupTime, pickupPlace, adult }) => ({ kind: "catalog", pickupChoice: pickupTime ? "DON" : "KHONG_DON", catalogCode: "TTB06", pax: { adult, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: 800_000 }, departDate, departTime: "", pickupTime: pickupTime ?? "", pickupPlace: pickupPlace ?? "", checkinDate: "", checkinTime: "", checkinPlace: "", note: "" });
  const input = (n, p, s) => ({ customerName: n, customerPhone: p, customerEmail: "", customerNote: "", services: s, discount: 0, paymentNote: "" });
  const draft = async (...a) => { const r = await call(ACCOUNTS.admin, "POST", "/api/orders", input(...a)); if (r.status !== 201) throw new Error(JSON.stringify(r.json)); return r.json.order; };
  const confirm = async (o) => { let c = await call(ACCOUNTS.admin, "POST", `/api/orders/${o.id}/status`, { status: "confirmed" }); if (c.status === 409) { for (const sv of o.services) for (const leg of sv.legs ?? []) await call(ACCOUNTS.admin, "POST", `/api/orders/${o.id}/legs/${leg.id}/short-notice`, { lyDo: "KHAC", ghiChu: null }); c = await call(ACCOUNTS.admin, "POST", `/api/orders/${o.id}/status`, { status: "confirmed" }); } return c.json.order; };
  const DC = "Khách sạn Mường Thanh Luxury Nha Trang, 60 Trần Phú, phường Lộc Thọ, thành phố Nha Trang, tỉnh Khánh Hòa";
  const chuyen = [["Nguyễn Thị Phương Anh Thư Trần Lê Hoàng Gia Bảo","0900000401","06:30","Bến Cầu Đá",4,3_200_000],["Trần Thị Bích","0900000402","07:15",DC,2,0],["Lê Quốc Cường","0900000403","08:00","Resort Mường Thanh",6,1_000_000],["Phạm Minh Dũng","0900000404","09:30","Bãi Dài",3,0],["Hoàng Văn Em","0900000405","23:30","Sân bay Cam Ranh",12,12_345_000]];
  for (const [t, s, g, n, nl, da] of chuyen) { const o = await confirm(await draft(t, s, [svc({ departDate: TODAY, pickupTime: g, pickupPlace: n, adult: nl })])); if (da > 0) await call(ACCOUNTS.admin, "POST", `/api/orders/${o.id}/payments`, { soTien: da, hinhThuc: "CASH", nguoiThu: "toi" }); }
  await confirm(await draft("Khách Ngày Mai", "0900000406", [svc({ departDate: TOMORROW, pickupTime: "07:00", pickupPlace: "Bến Cầu Đá", adult: 2 })]));
  const staffId = env.sql(`SELECT id FROM staff WHERE phone = '${ACCOUNTS.admin.phone}'`)[0].id;
  const iso = (ms) => new Date(Date.now() - ms).toISOString();
  const cho = async (t, s, ngay, ms) => { const o = await draft(t, s, [svc({ departDate: ngay, pickupTime: "07:00", pickupPlace: "Bến Cầu Đá", adult: 2 })]); const g = iso(ms), han = new Date(Date.now() - ms + 900000).toISOString(); env.sql(`INSERT INTO ord_confirm_request (id, order_id, submitted_at, submitted_by, deadline_at, created_at, created_by, updated_at, updated_by) VALUES ('${randomUUID()}','${o.id}','${g}','${staffId}','${han}','${g}','${staffId}','${g}','${staffId}')`); return o; };
  // Biên đúng 2 giờ (không quá) + biên ngày: D đúng 2h00 trừ 1 giây trước (còn trong ngưỡng) , E đi xa gửi 2h01
  await cho("Cho A hom nay", "0900000411", TODAY, 10 * 60_000);
  await cho("Cho B gui 3 gio", "0900000412", LATER, 3 * 3600_000);
  await cho("Cho C vua gui", "0900000413", LATER, 5 * 60_000);
  const VAI = { "Quan tri": ACCOUNTS.admin, "Ke toan": ACCOUNTS.accounting, "Nhan vien lap don": ACCOUNTS.salesA };
  const KHO = [[1366,650],[1440,900],[1100,800],[900,800]];
  const bc = [];
  for (const [vai, acc] of Object.entries(VAI)) for (const [w, h] of KHO) {
    const p = await env.as(acc, "/", { width: w, height: h, mobile: false });
    try {
      await p.waitFor("!document.querySelector('#dash-grid')?.hidden", `luoi ${vai} ${w}`, 20000);
      await sleep(500);
      const x = await p.ev(`(() => { const t=(s)=>{const e=document.querySelector(s);return !!e && e.getClientRects().length>0}; return { vw: innerWidth, scrollW: document.documentElement.scrollWidth, gap: t('#dash-gap')?document.querySelector('#dash-gap').innerText.replace(/\\s+/g,' ').trim():null, dangCho: t('#dash-dang-cho')?[...document.querySelectorAll('#dash-dang-cho-ds .dash-dc-dong')].map(d=>d.textContent.replace(/\\s+/g,' ').trim()):null, viec: t('#dash-viec') }; })()`);
      const loi = await p.ev(DO_LOI);
      bc.push({ vai, kho: `${w}x${h}`, ...x, cat: loi.cat, che: loi.che, tran: loi.tran, rong: loi.rong });
      console.log(`${nhan} ${vai} ${w}x${h}: cat=${loi.cat.length} che=${loi.che.length} tran=${loi.tran.length} tranTrang=${x.scrollW > x.vw} gap=${x.gap ? 1 : 0}`);
      if (!process.env.KHONG_ANH) { const r = await p.send("Page.captureScreenshot", { format: "png" }); writeFileSync(`${OUT}/${vai.replace(/ /g,"_")}-${w}x${h}.png`, Buffer.from(r.result.data, "base64")); }
    } finally { p.close(); }
  }
  writeFileSync(`${OUT}/so-lieu.json`, JSON.stringify(bc, null, 1));
} finally { await env.stop(); }
