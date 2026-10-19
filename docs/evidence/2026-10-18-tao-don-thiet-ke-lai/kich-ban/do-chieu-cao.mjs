// Việc 10 (nghiệm thu) — ĐO chiều cao trang Tạo đơn ở 390px với đơn mẫu BA dịch vụ (TD101 + TTB03 + TTB06, mỗi dịch vụ 2 khách, TD101 thêm đưa đón),
// chạy được trên CẢ HAI bản (main = "trước", nhánh thiết kế lại = "sau") vì chỉ dùng chỗ nối chung của hai bản: ô #catalog-q, #catalog-list .catalog-pick, #services .svc,
// .counter-field, [data-action="them-dua-don"], #save. Hai cách đo:
//   (A) "lập" = thao tác thật như người dùng (tìm → chọn → nhập số khách) rồi đo trang đúng lúc đó (không mở thêm khối gập nào);
//   (B) "nháp" = ba dịch vụ dựng bằng API (POST /api/orders, nháp), mở lại ở /order-form?id=… rồi đo (cái người dùng thấy khi sửa nháp).
// Mỗi cách ghi: chiều cao tài liệu (scrollHeight), vị trí đáy nút Lưu theo toạ độ trang. Kết quả ghi ra $OUT/do-chieu-cao-<GIAI_DOAN>.json.
// Chạy từ GỐC repo (hoặc bản chép main), sau `npm run build:web`, không cần mạng ngoài:
//   GIAI_DOAN=truoc|sau OUT=<thư mục> CHROME_BIN=$PWD/docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh node docs/evidence/2026-10-18-tao-don-thiet-ke-lai/kich-ban/do-chieu-cao.mjs
// Dữ liệu: danh mục giả của môi trường thử + tên/số điện thoại giả; không dữ liệu khách thật.
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ACCOUNTS, ok, setInput, sleep, startEnv, vnDate } from "../../2026-09-20-a2/kich-ban/a2-cdp.mjs";

const GIAI_DOAN = process.env.GIAI_DOAN ?? "sau";
const OUT = process.env.OUT ?? "docs/evidence/2026-10-18-tao-don-thiet-ke-lai/do-chieu-cao";
mkdirSync(OUT, { recursive: true });
const MOB = { width: 390, height: 844, mobile: true };
const env = await startEnv();
const kq = {};
try {
  const call = async (account, method, path, body) => {
    const c = await env.login(account);
    const r = await fetch(env.base + path, { method, headers: { "content-type": "application/json", origin: env.base, cookie: `${c.name}=${c.value}` }, body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: r.status, json: await r.json().catch(() => null) };
  };
  const do_ = (p) => p.ev("(() => { const s = document.getElementById('save'); const r = s ? s.getBoundingClientRect() : null; return { cao: document.documentElement.scrollHeight, luuDay: r ? Math.round(r.bottom + scrollY) : null, luuDayTrongKhung: r ? Math.round(r.bottom) : null, soThe: document.querySelectorAll('#services .svc').length }; })()");
  const chon = async (p, tim, soThe) => {
    await p.ev("document.getElementById('catalog-q').focus(); true");
    await p.ev(setInput("document.getElementById('catalog-q')", tim));
    await p.waitFor("document.querySelectorAll('#catalog-list .catalog-pick').length === 1", `lọc ${tim}`);
    await p.ev("document.querySelector('#catalog-list .catalog-pick').click(); true");
    await p.waitFor(`document.querySelectorAll('#services .svc').length === ${soThe}`, `thẻ thứ ${soThe}`);
    await sleep(300);
    // Ô số khách ĐẦU TIÊN của thẻ vừa thêm (nhãn khác nhau theo dịch vụ: "Người lớn" / "Số khách").
    await p.ev(setInput(`document.querySelectorAll('#services .svc')[${soThe - 1}].querySelector('.counter-field')`, "2"));
    await sleep(200);
  };
  // (A) lập bằng thao tác thật
  {
    const p = await env.as(ACCOUNTS.salesA, "/order-form", MOB);
    await p.waitFor("!!document.getElementById('catalog-q') && !document.getElementById('catalog-q').disabled", "ô tìm danh mục sẵn sàng", 15000);
    await sleep(600);
    await p.ev(setInput("document.getElementById('orderDate')", vnDate(3)));
    await sleep(200);
    kq.lapRong = await do_(p);
    await chon(p, "TD101", 1);
    await p.ev("(() => { document.querySelector('#services .svc [data-action=\"them-dua-don\"]')?.click(); return true; })()");
    await sleep(300);
    await chon(p, "phao", 2);
    await chon(p, "TTB06", 3);
    await p.ev("window.scrollTo(0, 0); true");
    await sleep(300);
    kq.lap3 = await do_(p);
    p.close();
    ok(`(A) lập ba dịch vụ: ${JSON.stringify(kq.lap3)}`);
  }
  // (B) nháp dựng bằng API, mở lại
  {
    const NGAY = vnDate(3);
    const KHONG = { departTime: "", checkinDate: "", checkinTime: "", checkinPlace: "", note: "" };
    const chang = { direction: "OUT", pickupDate: NGAY, pickupTime: "07:30", pickupLocationId: null, pickupPlace: "12 Trần Phú, Nha Trang", dropoffLocationId: null, dropoffPlace: "", flightCode: "", exclusiveVehicle: false, minVehicleSeats: null };
    const dv = (code, gia, legs = []) => ({ kind: "catalog", catalogCode: code, pax: { adult: 2, child: 0, senior: 0, infant: 0 }, unitPrices: { adult: gia }, catalogPriceSeen: { adult: gia }, departDate: NGAY, ...KHONG, legs, pickupChoice: legs.length > 0 ? "DON" : "KHONG_DON" });
    const r = await call(ACCOUNTS.salesA, "POST", "/api/orders", { customerName: "Khách Đo Chiều Cao", customerPhone: "0903 555 999", customerEmail: "", customerNote: "", discount: 0, paymentNote: "", services: [dv("TD101", 1350000, [chang]), dv("TTB03", 1500000), dv("TTB06", 800000)] });
    if (r.status !== 201) throw new Error(`dựng nháp: ${r.status} ${JSON.stringify(r.json)}`);
    const p = await env.as(ACCOUNTS.salesA, `/order-form?id=${r.json.order.id}`, MOB);
    await p.waitFor("document.querySelectorAll('#services .svc').length === 3", "nháp ba dịch vụ dựng xong", 15000);
    await sleep(800);
    await p.ev("window.scrollTo(0, 0); true");
    kq.nhap3 = await do_(p);
    p.close();
    ok(`(B) nháp ba dịch vụ: ${JSON.stringify(kq.nhap3)}`);
  }
  writeFileSync(join(OUT, `do-chieu-cao-${GIAI_DOAN}.json`), JSON.stringify(kq, null, 1));
  console.log("DO CHIEU CAO OK");
} finally {
  await env.stop();
}
