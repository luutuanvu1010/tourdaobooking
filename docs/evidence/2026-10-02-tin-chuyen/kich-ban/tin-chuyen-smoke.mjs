// Tin chuyến + tự tải lại (ADR-0052 D6; kế hoạch docs/superpowers/plans/2026-10-01-van-chuyen-con-lai-02-tin-bao-chuyen.md Task 6 bước 7). Khuôn
// docs/evidence/2026-09-29-adr-0049/kich-ban/cuoc-smoke.mjs + dp-lib.mjs (D1 tạm + wrangler dev + Chrome headless qua CDP; không cần mạng ngoài).
// Chạy từ GỐC repo, sau `npm run build:web`:
//   CHROME_BIN=docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh node docs/evidence/2026-10-02-tin-chuyen/kich-ban/tin-chuyen-smoke.mjs
// Lệnh GHI đi bằng phiên Node riêng (Bán hàng B — ACCOUNTS.salesB; Quản trị / Chủ để dựng xe, tài xế) — trình duyệt chỉ giữ MỘT tài khoản mỗi bước (kho cookie
// dùng chung, CLAUDE.md §10; ADR-0075 một phiên mỗi tài khoản): Tài xế → Bán hàng A → Kế toán. Mỗi bước chạy ở 390 VÀ 1040. Tên, SĐT, số giấy tờ là GIẢ.
import { randomUUID } from "node:crypto";
process.env.OUT ??= "docs/evidence/2026-10-02-tin-chuyen";
const { ACCOUNTS, CHU, DESK, MOB, apiCalls, assert, boDem, click, dungMoiTruong, noCode, noOverflowX, shotFull, shotView, sleep, txt, LOC_BEN_TAU, vnDate } = await import(
  "../../2026-09-29-adr-0049/kich-ban/dp-lib.mjs"
);

const { env, call } = await dungMoiTruong([CHU]);
const b = boDem("TIN CHUYEN SMOKE");
const NGAY = vnDate(2); // "Ngày kia" — trong cửa sổ Cuốc của tôi (hôm nay + 2), ngoài mốc 6 giờ
const han = vnDate(300);
const dung = (r, ma, viec) => assert.equal(r.status, ma, `${viec}: ${r.status} ${r.text}`);
const VP = ACCOUNTS.salesB; // người ghi (Node)

// ---- dữ liệu: xe, hai tài xế, đơn ----------------------------------------------------------------------------------------------------------------------------
const xe = async (plateNumber) => {
  const r = await call(ACCOUNTS.admin, "POST", "/api/van-chuyen/xe", { plateNumber, chassisNumber: `TC${plateNumber.replace(/\D/g, "")}`, name: `Xe thử ${plateNumber}`, passengerCapacity: 15 });
  dung(r, 201, `thêm xe ${plateNumber}`);
  for (const typeCode of ["INSPECTION", "TPL_INSURANCE"]) dung(await call(ACCOUNTS.admin, "POST", `/api/van-chuyen/xe/${r.json.vehicle.id}/giay-to`, { typeCode, number: `${typeCode}-${plateNumber}`, expiryDate: han }), 201, `giấy ${typeCode}`);
  return r.json.vehicle;
};
let soDt = 0;
const taiXe = async (fullName) => {
  const r = await call(CHU, "POST", "/api/staff", { taoHoSoMoi: true, fullName, phone: `09000005${String(10 + ++soDt).padStart(2, "0")}`, roles: ["DRIVER_INTERNAL"] });
  dung(r, 201, `tài xế ${fullName}`);
  const [{ party_id: partyId }] = env.sql(`SELECT party_id FROM staff WHERE id = '${r.json.staff.id}'`);
  dung(await call(ACCOUNTS.admin, "POST", `/api/parties/${partyId}/documents`, { typeCode: "GPLX", number: `79${String(2e9 + soDt)}`, classCode: "D2", expiryDate: han }), 201, `GPLX ${fullName}`);
  return { partyId, account: { name: fullName, phone: r.json.staff.phone, pin: r.json.pin, permissions: ["DRIVER"] } };
};
const XE_A = await xe("79B-111.11");
const XE_B = await xe("79B-222.22");
const AN = await taiXe("Trần Văn An");
const BAO = await taiXe("Đỗ Văn Bảo");
const TEN_KHACH = "Hành Khách Tin Chuyến";
const SDT_KHACH = "0903 100 777";
const don = async (gio) => {
  const r = await call(ACCOUNTS.salesA, "POST", "/api/orders", {
    customerName: "Khách Tin Chuyến", customerPhone: SDT_KHACH, customerEmail: "", customerNote: "", discount: 0, depositAmount: 0, depositMethod: null, paymentNote: "",
    services: [{
      kind: "catalog", catalogCode: "TD101", pax: { adult: 2, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: 1350000 },
      departTime: "", pickupTime: "", pickupPlace: "", checkinDate: "", checkinTime: "", checkinPlace: "", note: "", departDate: NGAY,
      legs: [{ direction: "OUT", pickupDate: NGAY, pickupTime: gio, pickupLocationId: null, pickupPlace: "Khách sạn Tin Chuyến", dropoffLocationId: LOC_BEN_TAU, dropoffPlace: "" }],
    }],
    passengers: [0, 1].map((i) => ({ fullName: `${TEN_KHACH} ${gio} ${i + 1}`, birthYear: 1985 + i, paxCode: null })),
  });
  dung(r, 201, `lập đơn ${gio}`);
  const c = await call(ACCOUNTS.admin, "POST", `/api/orders/${r.json.order.id}/status`, { status: "confirmed" });
  dung(c, 200, `xác nhận đơn ${gio}`);
  return { id: c.json.order.id, legId: c.json.order.services[0].legs[0].id };
};
const g = (gio) => ({ ngay: NGAY, gio });
const taoChuyen = async (x, tx, tu, den) => {
  const r = await call(VP, "POST", "/api/van-chuyen/chuyen", { requestId: randomUUID(), xeId: x.id, taiXePartyId: tx.partyId, batDau: g(tu), ketThuc: g(den) });
  dung(r, 201, `tạo chuyến ${tu}`);
  return r.json.chuyen;
};
const banMoi = async (id) => (await call(VP, "GET", `/api/van-chuyen/chuyen/${id}`)).json.chuyen;
const suaChuyen = async (id, than, viec) => {
  const c = await banMoi(id);
  dung(await call(VP, "PUT", `/api/van-chuyen/chuyen/${id}`, { version: c.version, requestId: randomUUID(), ...than }), 200, viec);
};

// ---- trình duyệt -----------------------------------------------------------------------------------------------------------------------------------------------
const soDo = (p) => p.ev(`((el) => el && !el.hidden ? Number(el.textContent) : 0)(document.querySelector('.bell-count'))`);
const moChuong = async (p) => {
  await p.ev(click(".bell"));
  await p.waitFor(`document.querySelectorAll('.ntf-panel .ntf-list-slot .ntf-item, .ntf-panel .ntf-list-slot .ntf-empty').length > 0 && !document.querySelector('.ntf-panel .ntf-list-slot').innerText.includes('Đang tải')`, "ngăn thông báo tải xong");
  return p.ev(`[...document.querySelectorAll('.ntf-panel .ntf-item')].map((x) => ({ cau: x.querySelector('.ntf-txt').innerText, xe: !!x.querySelector('.ntf-badge svg') }))`);
};
const dongChuong = (p) => p.ev(`(document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })), true)`);
const KHONG_LO = (h) => {
  for (const x of [TEN_KHACH, SDT_KHACH, SDT_KHACH.replace(/\s/g, "")]) assert.ok(!h.includes(x), `không lộ ${x}`);
  assert.doesNotMatch(h, /"[LT]:/, "không lộ khoá nơi");
};

const VIEW = [["390", MOB, "08:00", "09:00", "08:15"], ["1040", DESK, "10:30", "11:30", "10:45"]];
// Đơn lập TRƯỚC khi trình duyệt đăng nhập Bán hàng A (ADR-0075: phiên mới của trình duyệt đá phiên Node cùng tài khoản).
const DON = new Map();
for (const [, , , , gioDon] of VIEW) DON.set(gioDon, await don(gioDon));
try {
  for (const [ten, vp, tu, den, gioDon] of VIEW) {
    const O = DON.get(gioDon);
    let X = null;
    // ---- 1–3: Tài xế An ----------------------------------------------------------------------------------------------------------------------------------
    let p = await env.as(AN.account, "/cuoc", vp);
    await b.step(`1-${ten}`, `${ten} Tài xế ở /cuoc; văn phòng (Node) tạo chuyến gán An → thẻ hiện ≤ 3 giây KHÔNG bấm tải lại; chuông có số đỏ; ngăn "Của tôi" có "Bạn được xếp lái chuyến …" kèm biểu tượng xe`, async () => {
      await p.waitFor(`document.querySelectorAll('.dp-cuoc-day').length === 3`, "Cuốc của tôi dựng xong", 12000);
      await sleep(800); // Bảng tin mở kết nối
      const truoc = await soDo(p);
      X = await taoChuyen(XE_A, AN, tu, den);
      await p.waitFor(`!!document.querySelector('.dp-cuoc-the[data-chuyen="${X.id}"]')`, "thẻ chuyến mới tự hiện", 3000);
      await p.waitFor(`((el) => el && !el.hidden && Number(el.textContent) > ${truoc})(document.querySelector('.bell-count'))`, "số đỏ tăng", 3000);
      const ds = await moChuong(p);
      const tin = ds.find((x) => x.cau === `Bạn được xếp lái chuyến ${X.ma} ngày ${NGAY.slice(8, 10)}/${NGAY.slice(5, 7)}`);
      assert.ok(tin, JSON.stringify(ds));
      assert.ok(tin.xe, "biểu tượng tin chuyến");
      KHONG_LO(await p.ev(`document.body.innerText`));
      assert.equal(await p.ev(noCode), "");
      assert.ok(await p.ev(noOverflowX));
      await shotView(p, `1-cuoc-tin-xep-lai-${ten}.png`);
      await dongChuong(p);
    });
    await b.step(`2-${ten}`, `${ten} /cuoc-chuyen?id=…; văn phòng sửa giờ → màn tự cập nhật giờ; hộp có "Văn phòng vừa sửa chuyến …"`, async () => {
      await p.send("Page.navigate", { url: `${env.base}/cuoc-chuyen?id=${X.id}` });
      await p.waitFor(`!!document.querySelector('.dp-cc-meta')`, "màn chuyến của tài xế", 8000);
      assert.match(await p.ev(txt(".dp-cc-meta")), new RegExp(` ${tu} · `));
      await sleep(800);
      const moi = `${String(Number(tu.slice(0, 2)) + 0).padStart(2, "0")}:${tu.slice(3) === "00" ? "20" : "50"}`;
      await suaChuyen(X.id, { batDau: g(moi), ketThuc: g(den) }, "sửa giờ");
      await p.waitFor(`(document.querySelector('.dp-cc-meta')?.innerText ?? '').includes(' ${moi} · ')`, "giờ trên màn tự đổi", 3000);
      const ds = await moChuong(p);
      assert.ok(ds.some((x) => x.cau.startsWith(`Văn phòng vừa sửa chuyến ${X.ma} `)), JSON.stringify(ds));
      await shotView(p, `2-cuoc-chuyen-sua-gio-${ten}.png`);
      await dongChuong(p);
    });
    await b.step(`3-${ten}`, `${ten} văn phòng đổi tài xế sang Bảo → hộp An có "Bạn không còn lái …"; bấm tin → /cuoc, thẻ chuyến đã biến mất`, async () => {
      await suaChuyen(X.id, { taiXePartyId: BAO.partyId }, "đổi tài xế");
      await p.waitFor(`!document.querySelector('.dp-cc-meta') || document.querySelector('#cc-trang')?.hidden === true`, "màn chuyến không còn mở được", 4000);
      const ds = await moChuong(p);
      assert.ok(ds.some((x) => x.cau.startsWith(`Bạn không còn lái chuyến ${X.ma} `)), JSON.stringify(ds));
      await p.ev(`(() => { const b = [...document.querySelectorAll('.ntf-panel .ntf-item')].find((x) => x.innerText.includes('Bạn không còn lái chuyến ${X.ma}')); b.click(); return true; })()`);
      await p.waitFor(`location.pathname === '/cuoc' && document.querySelectorAll('.dp-cuoc-day').length === 3`, "về /cuoc", 8000);
      assert.equal(await p.ev(`!!document.querySelector('.dp-cuoc-the[data-chuyen="${X.id}"]')`), false, "thẻ chuyến đã đổi tài xế không còn");
      await shotFull(p, `3-cuoc-sau-doi-tai-xe-${ten}.png`);
    });
    p.close();

    // ---- 4–5: Bán hàng A ----------------------------------------------------------------------------------------------------------------------------------
    const Y = await taoChuyen(XE_B, AN, tu, den); // chuyến KHÁC (bước 5)
    p = await env.as(ACCOUNTS.salesA, `/dieu-phoi?ngay=${NGAY}`, vp);
    await b.step(`4-${ten}`, `${ten} Bán hàng A ở /dieu-phoi; văn phòng (Node) xếp khách vào chuyến → khối chuyến tự đổi tải; KHÔNG có thông báo nổi`, async () => {
      await p.waitFor(`!!document.querySelector('.dp-khoi[data-chuyen="${X.id}"]')`, "khối chuyến", 10000);
      const truoc = await p.ev(`document.querySelector('.dp-khoi[data-chuyen="${X.id}"]').getAttribute('aria-label')`);
      await sleep(800);
      const c = await banMoi(X.id);
      dung(await call(VP, "POST", `/api/van-chuyen/chuyen/${X.id}/phan-bo`, { version: c.version, requestId: randomUUID(), chang: [{ legId: O.legId, soSuat: 2 }] }), 200, "xếp khách");
      await p.waitFor(`document.querySelector('.dp-khoi[data-chuyen="${X.id}"]')?.getAttribute('aria-label') !== ${JSON.stringify(truoc)}`, "khối chuyến tự đổi", 3000);
      await sleep(1200);
      assert.equal(await p.ev(`document.querySelectorAll('.toast-vung .toast').length`), 0, "không thông báo nổi cho sự kiện chuyến");
      KHONG_LO(await p.ev(`document.body.innerText`));
      await shotFull(p, `4-dieu-phoi-tu-tai-${ten}.png`);
    });
    await b.step(`5-${ten}`, `${ten} /chuyen?id=X; văn phòng sửa chuyến KHÁC (Y) → màn X không tải lại (đếm GET /api/van-chuyen/chuyen/X); sửa X → tải lại`, async () => {
      await p.send("Page.navigate", { url: `${env.base}/chuyen?id=${X.id}` });
      await p.waitFor(`!!document.querySelector('#ct-trang') && !document.querySelector('#ct-trang').hidden && document.body.innerText.includes(${JSON.stringify(X.ma)})`, "chi tiết chuyến", 10000);
      await sleep(800);
      const dem = () => apiCalls(p).filter((r) => r.method === "GET" && r.path === `/api/van-chuyen/chuyen/${X.id}`).length;
      const n0 = dem();
      await suaChuyen(Y.id, { batDau: g(tu), ketThuc: g(`${String(Number(den.slice(0, 2))).padStart(2, "0")}:${den.slice(3) === "00" ? "10" : "40"}`) }, "sửa chuyến khác");
      await sleep(2500);
      assert.equal(dem(), n0, "sửa chuyến khác: màn X không tải lại");
      await suaChuyen(X.id, { batDau: g(tu), ketThuc: g(den) }, "sửa chuyến đang xem");
      const het = Date.now() + 3000;
      while (dem() === n0 && Date.now() < het) await sleep(100);
      assert.ok(dem() > n0, "sửa chuyến đang xem: màn tự tải lại");
      await shotFull(p, `5-chi-tiet-chuyen-${ten}.png`);
    });
    p.close();

    // ---- 6: Kế toán ---------------------------------------------------------------------------------------------------------------------------------------
    p = await env.as(ACCOUNTS.accounting, "/orders", vp);
    await b.step(`6-${ten}`, `${ten} Kế toán mở chuông: không có tin chuyến nào`, async () => {
      await p.waitFor(`!!document.querySelector('.bell')`, "chuông", 8000);
      const ds = await moChuong(p);
      assert.ok(!ds.some((x) => /chuyến CX-/.test(x.cau)), JSON.stringify(ds));
      const hop = await p.ev(`fetch('/api/thong-bao?ngan=tat-ca').then((r) => r.json())`);
      assert.deepEqual(hop.tin.filter((t) => t.loai === "chuyen"), []);
      await shotView(p, `6-ke-toan-chuong-${ten}.png`);
    });
    p.close();
  }
} finally {
  await env.stop();
  b.xong();
}
