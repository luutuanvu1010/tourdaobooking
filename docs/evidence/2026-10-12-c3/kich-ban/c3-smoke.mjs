// C3 (gói A+C Vận chuyển; đánh giá ERP 7/10 C32–C37) — kịch bản Chrome cho bảng điều phối /dieu-phoi: chọn nhiều chặng rồi xếp MỘT lệnh (C34), bảng trượt "Chuyến mới" không
// rời bảng (C34), lọc ca / chiều / nơi trả (C35), tổng "khách chưa xếp / ghế trống" (C37), tô màu theo tải, nghe tin `don-thay-doi` (C36), hộp chọn chuyến ưu tiên chuyến
// hợp và làm mờ chuyến lệch giờ (C32), cảnh báo ngay sau xếp (C32), giờ hẹn từng đoàn ở chi tiết chuyến (C33). Dựng trên dp-lib.mjs của lượt ADR-0049 (D1 tạm + wrangler dev
// + Chrome headless qua CDP; không cần mạng ngoài). Mọi tên, SĐT ở đây là GIẢ.
// Chạy từ GỐC repo, sau `npm run build:web`:
//   AXE_JS=<…/axe.min.js> CHROME_BIN=docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh OUT=docs/evidence/2026-10-12-c3 node docs/evidence/2026-10-12-c3/kich-ban/c3-smoke.mjs
// Kho cookie của Chrome dùng CHUNG: Bán hàng (nhiều bước) → Kế toán (trang mở sau cùng là của Kế toán).
import { randomUUID } from "node:crypto";
import {
  ACCOUNTS, CHU, DESK, LOC_BEN_TAU, MOB, apiCalls, assert, axe, axeNote, boDem, click, dungDuLieuDieuPhoi, dungMoiTruong, fetchTrang, noCode, noOverflowX, shotFull, shotView, shown,
  sleep, txt, typeInto,
} from "../../2026-09-29-adr-0049/kich-ban/dp-lib.mjs";

const { env, call } = await dungMoiTruong([CHU]);
const b = boDem("C3 SMOKE");
const d = await dungDuLieuDieuPhoi(env, call);
const NGAY = d.NGAY_XA;
const NO_TRIP = { departTime: "", pickupTime: "", pickupPlace: "", checkinDate: "", checkinTime: "", checkinPlace: "", note: "" };

/** Đơn một chặng, xác nhận — `chieu` OUT (đón tại nơi, trả bến tàu) hoặc RETURN (đón tại bến tàu, trả tại nơi). */
let soDon = 100;
const taoDon = (body) => ({
  customerName: `Khách C3 ${++soDon}`, customerPhone: `0903 200 ${String(soDon)}`, customerEmail: "", customerNote: "", discount: 0, depositAmount: 0, depositMethod: null, paymentNote: "",
  services: [{ kind: "catalog", pickupChoice: "DON", catalogCode: "TD101", pax: { adult: body.soKhach, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: 1350000 }, ...NO_TRIP, departDate: NGAY, legs: [body.leg] }],
  passengers: Array.from({ length: body.soKhach }, (_, i) => ({ fullName: `Hành Khách C3 ${soDon}-${i + 1}`, birthYear: 1980 + i, paxCode: null })),
});
const legOut = (gio, noiDon, noiTra) => ({ direction: "OUT", pickupDate: NGAY, pickupTime: gio, pickupLocationId: null, pickupPlace: noiDon, dropoffLocationId: noiTra === undefined ? LOC_BEN_TAU : noiTra, dropoffPlace: "" });
const legVe = (gio, noiTra) => ({ direction: "RETURN", pickupDate: NGAY, pickupTime: gio, pickupLocationId: LOC_BEN_TAU, pickupPlace: "", dropoffLocationId: null, dropoffPlace: noiTra });
const xacNhan = async (id, viec) => {
  const c = await call(ACCOUNTS.admin, "POST", `/api/orders/${id}/status`, { status: "confirmed" });
  assert.equal(c.status, 200, `xác nhận ${viec}: ${c.text}`);
  return { id: c.json.order.id, ma: c.json.order.orderCode, legId: c.json.order.services[0].legs[0].id };
};
const donMoi = async (viec, soKhach, leg) => {
  const r = await call(ACCOUNTS.salesA, "POST", "/api/orders", taoDon({ soKhach, leg }));
  assert.equal(r.status, 201, `lập ${viec}: ${r.text}`);
  return { ...(await xacNhan(r.json.order.id, viec)), soKhach };
};

// Dữ liệu: nền ADR-0049 (T1 07:30–09:30 · T2 07:30–09:30 bị giữ · T3 14:30–16:30; chưa xếp O5 11:00 5 khách nơi trả chưa chốt) + 4 đơn mới cùng ngày:
//   DA 10:15 "Khách sạn Chung" 3 khách (sáng) · DB 10:30 "Khách sạn Chung" 2 khách (sáng; cùng nơi → một điểm đón hai đoàn) · DC 13:00 "Khách sạn Riêng" 3 khách (chiều)
//   · DV 19:00 chặng VỀ 2 khách (tối) → "Khách sạn Về". Chuyến T6 (XE_A, Cường) 10:00–14:00: chuyến HỢP cho DA, DB, DC, O5; lệch giờ với DV.
const DA = await donMoi("DA", 3, legOut("10:15", "Khách sạn Chung"));
const DB = await donMoi("DB", 2, legOut("10:30", "Khách sạn Chung"));
const DC = await donMoi("DC", 3, legOut("13:00", "Khách sạn Riêng"));
const DV = await donMoi("DV", 2, legVe("19:00", "Khách sạn Về"));
const t6 = await call(ACCOUNTS.admin, "POST", "/api/van-chuyen/chuyen", { requestId: randomUUID(), xeId: d.XE_A.id, taiXePartyId: d.CUONG.partyId, batDau: { ngay: NGAY, gio: "10:00" }, ketThuc: { ngay: NGAY, gio: "14:00" } });
assert.equal(t6.status, 201, `tạo T6: ${t6.text}`);
const T6 = t6.json.chuyen;

const cho = (p) => p.waitFor(`!document.getElementById('dp-trang').hidden && !!document.querySelector('#dp-cot-xe .dp-tl-card')`, "bảng điều phối dựng xong");
const ghi = (p) => apiCalls(p).filter((r) => r.method !== "GET" && r.path.startsWith("/api/van-chuyen/chuyen"));
const soGetLich = (p) => apiCalls(p).filter((r) => r.method === "GET" && r.path === "/api/van-chuyen/lich").length;
const hangChang = `[...document.querySelectorAll('#dp-cot-chua-xep .dp-leg')].map((x) => x.dataset.leg)`;
const tong = txt("#dp-cot-chua-xep .dp-tong");
const thanhChon = txt("#dp-cot-chua-xep .dp-nhieu");
const chonO = (legId) => click(`#dp-cot-chua-xep .dp-leg-hang[data-hang="${legId}"] .dp-leg-chon`);
const daTich = `[...document.querySelectorAll('#dp-cot-chua-xep .dp-leg-chon')].filter((x) => x.checked).length`;
const lopKhoi = (id) => `[...document.querySelector('.dp-khoi[data-chuyen="${id}"]').classList].filter((c) => c.startsWith('is-tai-')).join(' ')`;
const hopXep = `[...document.querySelectorAll('.dp-sheet-xep .vc-reason')].map((x) => ({ code: x.dataset.code, mo: x.classList.contains('is-mo'), text: x.innerText.replace(/\\s+/g, ' ').trim() }))`;
const locDat = (id, v) => typeInto(`#${id}`, v);
let TIN = null; // đơn lập giữa chừng ở bước 4 (15:30, 2 khách) — còn lại ở cột Chưa xếp tới hết kịch bản

try {
  const p = await env.as(ACCOUNTS.salesA, `/dieu-phoi?ngay=${NGAY}`, DESK);

  await b.step("1", `C37 + C35 máy tính: cột "Chưa xếp" có dòng tổng "khách chưa xếp · ghế trống", ba ô lọc (ca đón, chiều, nơi trả), mỗi thẻ chặng có ô chọn đứng cạnh (không nằm trong nút)${axeNote()}`, async () => {
    await cho(p);
    // Chưa xếp: O5 5 + DA 3 + DB 2 + DC 3 + DV 2 = 15 khách; ghế trống chuyến lên kế hoạch: T1 15-3, T2 29-2, T3 15-4, T6 15 = 12+27+11+15 = 65 ở 4 chuyến.
    assert.equal(await p.ev(tong), "15 khách chưa xếp · 65 ghế trống ở 4 chuyến chưa chạy");
    assert.deepEqual(await p.ev(`[...document.querySelectorAll('#dp-cot-chua-xep .dp-loc-o')].map((x) => x.firstChild.textContent.trim())`), ["Ca đón", "Chiều", "Nơi trả"]);
    assert.deepEqual(await p.ev(`[...document.querySelectorAll('#dp-loc-ca option')].map((x) => x.innerText.trim())`), ["Tất cả", "Sáng (trước 12:00)", "Chiều (12:00–17:59)", "Tối (từ 18:00)", "Chưa chốt giờ"]);
    assert.deepEqual(await p.ev(`[...document.querySelectorAll('#dp-loc-chieu option')].map((x) => x.innerText.trim())`), ["Tất cả", "Chiều đi", "Chiều về"]);
    assert.deepEqual(await p.ev(`[...document.querySelectorAll('#dp-loc-noi-tra option')].map((x) => x.innerText.trim())`), ["Tất cả", "Bến tàu du lịch Nha Trang", "Khách sạn Về", "Nơi trả chưa chốt"]);
    const ds = await p.ev(hangChang);
    assert.equal(ds.length, 5);
    assert.equal(await p.ev(`document.querySelectorAll('#dp-cot-chua-xep .dp-leg-hang .dp-leg-chon').length`), 5);
    assert.equal(await p.ev(`document.querySelectorAll('#dp-cot-chua-xep .dp-leg .dp-leg-chon').length`), 0, "ô chọn KHÔNG lồng trong nút (nút = xếp một chặng)");
    assert.match(await p.ev(`document.querySelector('.dp-leg-chon').getAttribute('aria-label')`), /^Chọn lượt đưa đón .+ để xếp cùng lúc$/);
    assert.equal(await p.ev(txt("#dp-cot-chua-xep .dp-nhieu-chu")), "Tích ô bên trái thẻ để chọn nhiều lượt rồi xếp một lần.");
    assert.equal(await p.ev(`document.querySelectorAll('#dp-cot-chua-xep .dp-nhieu .vc-btn').length`), 1, "chưa chọn: chỉ nút 'Chọn hết'");
    assert.ok(await p.ev(noOverflowX));
    await axe(p, "điều phối 1040 cột Chưa xếp có lọc + ô chọn");
  });

  await b.step("2", "C35: lọc Sáng → 3 chặng sáng (O5, DA, DB); thêm Nơi trả 'chưa chốt' → chỉ O5; Chiều về → rỗng-khớp; 'Bỏ lọc' trả đủ 5 chặng; tiêu điểm ở ô vừa đổi; khách tổng KHÔNG đổi theo lọc", async () => {
    await p.ev(locDat("dp-loc-ca", "SANG"));
    await p.waitFor(`document.querySelectorAll('#dp-cot-chua-xep .dp-leg').length === 3`, "lọc Sáng");
    assert.equal(await p.ev(`document.activeElement.id`), "dp-loc-ca", "tiêu điểm ở lại ô lọc");
    assert.equal(await p.ev(txt('#dp-cot-chua-xep [data-action="bo-loc"]')), "Bỏ lọc · đang hiện 3/5 lượt");
    assert.equal(await p.ev(tong), "15 khách chưa xếp · 65 ghế trống ở 4 chuyến chưa chạy", "tổng là của cả ngày, không theo lọc");
    await p.ev(locDat("dp-loc-noi-tra", "__chua-chot__"));
    await p.waitFor(`document.querySelectorAll('#dp-cot-chua-xep .dp-leg').length === 1`, "lọc thêm nơi trả chưa chốt");
    assert.deepEqual(await p.ev(hangChang), [d.O5.legId]);
    await p.ev(locDat("dp-loc-chieu", "RETURN"));
    await p.waitFor(`!!document.querySelector('#dp-cot-chua-xep .dp-col-empty')`, "không chặng khớp");
    assert.equal(await p.ev(txt("#dp-cot-chua-xep .dp-col-empty")), "Không có lượt đưa đón nào khớp bộ lọc.");
    await p.ev(click('#dp-cot-chua-xep [data-action="bo-loc"]'));
    await p.waitFor(`document.querySelectorAll('#dp-cot-chua-xep .dp-leg').length === 5`, "bỏ lọc");
    assert.equal(await p.ev(`document.querySelector('#dp-loc-ca').value + '|' + document.querySelector('#dp-loc-chieu').value + '|' + document.querySelector('#dp-loc-noi-tra').value`), "||");
    // Chiều về một mình → đúng chặng VỀ.
    await p.ev(locDat("dp-loc-chieu", "RETURN"));
    await p.waitFor(`document.querySelectorAll('#dp-cot-chua-xep .dp-leg').length === 1`, "lọc chiều về");
    assert.deepEqual(await p.ev(hangChang), [DV.legId]);
    await p.ev(click('#dp-cot-chua-xep [data-action="bo-loc"]'));
    await p.waitFor(`document.querySelectorAll('#dp-cot-chua-xep .dp-leg').length === 5`, "bỏ lọc lần hai");
  });

  await b.step("3", "C34: tích 3 chặng → thanh chọn 'Đã chọn 3 chặng · 8 khách' + nút 'Xếp 3 chặng vào chuyến…'; chọn rồi lọc ẩn bớt → chặng bị ẩn rời lựa chọn; 'Bỏ chọn' xoá hết", async () => {
    for (const x of [DA, DB, DC]) await p.ev(chonO(x.legId));
    await p.waitFor(`${thanhChon}.startsWith('Đã chọn 3 lượt')`, "thanh chọn 3 chặng");
    assert.equal(await p.ev(txt("#dp-cot-chua-xep .dp-nhieu-chu")), "Đã chọn 3 lượt · 8 khách");
    assert.equal(await p.ev(txt('[data-action="xep-nhieu"]')), "Xếp 3 lượt vào chuyến…");
    assert.equal(await p.ev(`document.querySelectorAll('#dp-cot-chua-xep .dp-leg-hang.is-chon').length`), 3);
    // Lọc Sáng: DC (13:00) bị ẩn → rời lựa chọn; còn DA, DB.
    await p.ev(locDat("dp-loc-ca", "SANG"));
    await p.waitFor(`document.querySelectorAll('#dp-cot-chua-xep .dp-leg').length === 3`, "lọc Sáng");
    assert.equal(await p.ev(txt("#dp-cot-chua-xep .dp-nhieu-chu")), "Đã chọn 2 lượt · 5 khách", "chặng bị lọc ẩn rời lựa chọn");
    await p.ev(click('#dp-cot-chua-xep [data-action="bo-loc"]'));
    await p.waitFor(`document.querySelectorAll('#dp-cot-chua-xep .dp-leg').length === 5`, "bỏ lọc");
    assert.equal(await p.ev(daTich), 2, "DA, DB còn tích sau khi bỏ lọc");
    await p.ev(click('#dp-cot-chua-xep [data-action="bo-chon"]'));
    await p.waitFor(`${daTich} === 0`, "bỏ chọn");
    assert.equal(await p.ev(txt("#dp-cot-chua-xep .dp-nhieu-chu")), "Tích ô bên trái thẻ để chọn nhiều lượt rồi xếp một lần.");
  });

  await b.step("4", "C36: tin `don-thay-doi` → tải lại lịch, chặng đang tích và bộ lọc GIỮ NGUYÊN; đơn mới tạo từ phiên khác hiện ngay trong cột (không tải lại trang)", async () => {
    await p.ev(chonO(DC.legId));
    await p.ev(locDat("dp-loc-ca", "CHIEU"));
    await p.waitFor(`document.querySelectorAll('#dp-cot-chua-xep .dp-leg').length === 1`, "lọc Chiều");
    const truoc = soGetLich(p);
    // Một đơn mới (chiều 15:30) lập bằng PHIÊN TRÌNH DUYỆT rồi xác nhận bằng Quản trị, sau đó bắn tin như Bảng tin sẽ bắn.
    const r = await fetchTrang(p, "POST", "/api/orders", taoDon({ soKhach: 2, leg: legOut("15:30", "Khách sạn Tin") }));
    assert.equal(r.status, 201, r.text);
    TIN = await xacNhan(r.json.order.id, "đơn tin");
    await p.ev(`window.dispatchEvent(new CustomEvent('don-thay-doi', { detail: { orderId: ${JSON.stringify(r.json.order.id)} } })), true`);
    await p.waitFor(`document.querySelectorAll('#dp-cot-chua-xep .dp-leg').length === 2`, "đơn mới hiện sau tin");
    assert.ok(soGetLich(p) > truoc, "có tải lại lịch");
    assert.equal(await p.ev(`document.querySelector('#dp-loc-ca').value`), "CHIEU", "bộ lọc giữ");
    assert.equal(await p.ev(daTich), 1, "chặng đang tích giữ");
    assert.equal(await p.ev(`document.querySelector('#dp-cot-chua-xep .dp-leg-hang[data-hang="${DC.legId}"] .dp-leg-chon').checked`), true);
    assert.equal(await p.ev(tong), "17 khách chưa xếp · 65 ghế trống ở 4 chuyến chưa chạy");
    await p.ev(click('#dp-cot-chua-xep [data-action="bo-loc"]'));
    await p.ev(click('#dp-cot-chua-xep [data-action="bo-chon"]'));
    await p.waitFor(`document.querySelectorAll('#dp-cot-chua-xep .dp-leg').length === 6 && ${daTich} === 0`, "về trạng thái sạch");
  });

  await b.step("5", `C32 + C34: chọn O5, DA, DB, DC → hộp 'Xếp vào chuyến': chuyến hợp ${T6.ma} LÊN ĐẦU, các chuyến lệch giờ sau và MỜ kèm chữ lý do; chọn chuyến mờ có nhắc; tóm tắt liệt kê từng chặng; không ô số khách${axeNote()}`, async () => {
    for (const x of [d.O5, DA, DB, DC]) await p.ev(chonO(x.legId));
    await p.waitFor(`${thanhChon}.startsWith('Đã chọn 4 lượt')`, "4 chặng");
    assert.equal(await p.ev(txt("#dp-cot-chua-xep .dp-nhieu-chu")), "Đã chọn 4 lượt · 13 khách");
    await p.ev(click('[data-action="xep-nhieu"]'));
    await p.waitFor(`!!document.querySelector('[data-action="xep-gui"]')`, "hộp xếp mở");
    await sleep(600);
    assert.equal(await p.ev(txt(".dp-sheet-xep .dp-sheet-sum-title")), "4 lượt · 13 khách");
    assert.equal(await p.ev(`document.querySelectorAll('.dp-sheet-xep .dp-xep-ds li').length`), 4);
    assert.equal(await p.ev(`!!document.querySelector('#dp-xep-so')`), false, "nhiều chặng: xếp TRỌN, không ô số khách");
    const ds = await p.ev(hopXep);
    assert.equal(ds[0].code, T6.id, `chuyến hợp lên đầu: ${JSON.stringify(ds)}`);
    assert.equal(ds[0].mo, false);
    assert.ok(ds.slice(1).every((x) => x.mo), `các chuyến còn lại mờ: ${JSON.stringify(ds)}`);
    assert.match(ds[1].text, /giờ hẹn ngoài khung giờ chuyến/, JSON.stringify(ds));
    assert.match(ds.find((x) => x.code === d.T3.id).text, /chỉ còn 11 chỗ/, "chuyến T3 chỉ còn 11 chỗ < 13 khách");
    await axe(p, "hộp xếp nhiều chặng 1040");
    await p.ev(click(`.dp-sheet-xep .vc-reason[data-code="${d.T1.id}"]`));
    assert.match(await p.ev(txt(".dp-sheet-xep .dp-xep-nhac")), /^Lưu ý: .*giờ hẹn ngoài khung giờ chuyến/);
    assert.equal(await p.ev(`document.querySelector('.dp-sheet-xep .dp-xep-nhac').hidden`), false);
    await shotView(p, "c3-xep-nhieu-chuyen-hop-may-tinh.png");
    await p.ev(click(`.dp-sheet-xep .vc-reason[data-code="${T6.id}"]`));
    assert.equal(await p.ev(`document.querySelector('.dp-sheet-xep .dp-xep-nhac').hidden`), true, "chuyến hợp: không nhắc");
  });

  await b.step("6", `C34: bấm 'Xếp vào chuyến' → MỘT lệnh phan-bo với 4 chặng (soSuat = còn lại) → dải 'Đã xếp 4 chặng (13 khách) vào ${T6.ma}' (+ nhắc O5 thiếu nơi trả); cột Chưa xếp còn đơn tin + DV; khối ${T6.ma} tô mức tải 'gần đầy' 13/15`, async () => {
    const truoc = ghi(p).length;
    await p.ev(click('[data-action="xep-gui"]'));
    await p.waitFor(`!!document.querySelector('#dp-banner .banner-title') && ${txt("#dp-banner .banner-title")}.startsWith('Đã xếp 4 lượt')`, "dải đã xếp");
    assert.equal(ghi(p).length - truoc, 1, "đúng MỘT lệnh ghi");
    const body = JSON.parse(ghi(p).at(-1).body);
    const theoLeg = (a, c) => a.legId.localeCompare(c.legId);
    assert.deepEqual({ ...body, requestId: "x", chang: [...body.chang].sort(theoLeg) }, {
      requestId: "x", version: T6.version,
      chang: [d.O5, DA, DB, DC].map((x) => ({ legId: x.legId, soSuat: x === d.O5 ? 5 : x.soKhach })).sort(theoLeg),
    });
    assert.deepEqual(body.chang.map((x) => x.legId), [DA, DB, d.O5, DC].map((x) => x.legId), "thứ tự gửi = thứ tự hiện trong cột (giờ đón)");
    assert.equal(await p.ev(txt("#dp-banner .banner-title")), `Đã xếp 4 lượt (13 khách) vào ${T6.ma}`);
    assert.ok((await p.ev(`[...document.querySelectorAll('#dp-banner li')].map((x) => x.innerText.trim())`)).some((x) => x.startsWith(`Lượt đưa đón chưa có nơi trả: ${d.O5.ma}`)));
    assert.deepEqual(await p.ev(hangChang), [TIN.legId, DV.legId]);
    assert.equal(await p.ev(lopKhoi(T6.id)), "is-tai-gan-day");
    assert.match(await p.ev(`document.querySelector('.dp-khoi[data-chuyen="${T6.id}"]').getAttribute('aria-label')`), /tải 13\/15 \(gần đầy\)/);
    assert.ok(await p.ev(`parseFloat(document.querySelector('.dp-khoi[data-chuyen="${T6.id}"]').style.getPropertyValue('--dp-tai')) > 0.8`));
    assert.match(await p.ev(txt(".dp-chon-head")), new RegExp(`^${T6.ma} .*Gần đầy Đang chọn$`), "thẻ đang chọn nhắc 'Gần đầy'");
    assert.equal((await p.ev(`[...document.querySelectorAll('.dp-tl-legend .dp-lg')].map((x) => x.innerText.trim())`)).filter((x) => x.startsWith("Tải:")).length, 4, "chú giải 4 mức tải");
    assert.equal(await p.ev(tong), "4 khách chưa xếp · 52 ghế trống ở 4 chuyến chưa chạy");
    await shotFull(p, "c3-dieu-phoi-tai-sau-xep-may-tinh.png");
  });

  await b.step("7", `C32 + C34: chặng VỀ 19:00 (DV) — mọi chuyến đều lệch giờ (mờ); '+ Chuyến mới' ngay trong hộp xếp mở bảng trượt; bỏ trống → lỗi dưới từng ô; tạo xe An 18:00–21:00 → hộp xếp MỞ LẠI với chuyến mới đã chọn, không mờ${axeNote()}`, async () => {
    await p.ev(click(`#dp-cot-chua-xep .dp-leg[data-leg="${DV.legId}"]`));
    await p.waitFor(`!!document.querySelector('[data-action="xep-gui"]')`, "hộp xếp một chặng");
    await sleep(500);
    assert.equal(await p.ev(`!!document.querySelector('#dp-xep-so')`), true, "một chặng 2 khách: có ô số khách (tách đoàn)");
    const ds = await p.ev(hopXep);
    assert.ok(ds.length >= 3 && ds.every((x) => x.mo), `mọi chuyến lệch giờ → mờ hết: ${JSON.stringify(ds)}`);
    await p.ev(click('.dp-sheet-xep [data-action="tao-chuyen"]'));
    await p.waitFor(`!!document.querySelector('.dp-sheet-tao') && !document.querySelector('.dp-sheet-xep')`, "bảng tạo chuyến thay hộp xếp");
    await sleep(600);
    assert.match(await p.ev(txt(".dp-sheet-tao .sheet-title")), /^Chuyến mới · /);
    await axe(p, "bảng trượt Chuyến mới 1040");
    await shotView(p, "c3-chuyen-moi-bang-truot-may-tinh.png");
    await p.ev(click('[data-action="tao-chuyen-gui"]'));
    assert.equal(await p.ev(txt("#dp-tao-xe-error")), "Chọn xe.");
    assert.equal(await p.ev(txt("#dp-tao-tai-xe-error")), "Chọn tài xế.");
    assert.equal(await p.ev(txt("#dp-tao-tu-error")), "Nhập giờ bắt đầu.");
    assert.equal(await p.ev(txt("#dp-tao-den-error")), "Nhập giờ kết thúc.");
    assert.equal(ghi(p).filter((r) => r.method === "POST" && r.path === "/api/van-chuyen/chuyen").length, 0, "thiếu ô: chưa gửi");
    await p.ev(typeInto("#dp-tao-xe", d.XE_A.id));
    await p.ev(typeInto("#dp-tao-tai-xe", d.AN.partyId));
    await p.ev(typeInto("#dp-tao-tu", "18:00"));
    await p.ev(typeInto("#dp-tao-den", "21:00"));
    await p.ev(click('[data-action="tao-chuyen-gui"]'));
    await p.waitFor(`!!document.querySelector('[data-action="xep-gui"]') && !document.querySelector('.dp-sheet-tao')`, "hộp xếp mở lại sau khi tạo");
    await sleep(600);
    const taoReq = ghi(p).filter((r) => r.method === "POST" && r.path === "/api/van-chuyen/chuyen").at(-1);
    const tb = JSON.parse(taoReq.body);
    assert.deepEqual({ ...tb, requestId: "x" }, { requestId: "x", xeId: d.XE_A.id, taiXePartyId: d.AN.partyId, batDau: { ngay: NGAY, gio: "18:00" }, ketThuc: { ngay: NGAY, gio: "21:00" } });
    const sau = await p.ev(hopXep);
    const moi = sau.find((x) => /18:00–21:00/.test(x.text));
    assert.ok(moi, JSON.stringify(sau));
    assert.equal(moi.mo, false, "chuyến mới 18:00–21:00 chứa giờ hẹn 19:00 → hợp, không mờ");
    assert.equal(sau[0].code, moi.code, "chuyến hợp lên đầu");
    assert.equal(await p.ev(`document.querySelector('.dp-sheet-xep .vc-reason[aria-checked="true"]')?.dataset.code`), moi.code, "chuyến vừa tạo đã được chọn");
    assert.equal(await p.ev(`document.querySelector('[data-action="xep-gui"]').disabled`), false);
    assert.equal(await p.ev(`location.pathname`), "/dieu-phoi", "không rời bảng điều phối");
    await p.ev(click('[data-action="xep-gui"]'));
    await p.waitFor(`${txt("#dp-banner .banner-title")} === 'Đã xếp 2 khách vào ${moi.text.split(" · ")[0]}'`, "xếp DV vào chuyến mới");
    assert.deepEqual(await p.ev(hangChang), [TIN.legId], "còn đúng đơn tin 15:30");
    assert.equal(await p.ev(`!!document.querySelector('#dp-banner .banner-warning')`), false, "chuyến hợp: không cảnh báo giờ hẹn");
  });

  await b.step("8", `C32: xếp chặng vào chuyến LỆCH giờ → máy chủ vẫn xếp, dải VÀNG nhắc 'Giờ hẹn nằm ngoài khung giờ chuyến: <mã đơn>' ngay trong phản hồi (chỉ nhắc, ADR-0096 Đ3.5)`, async () => {
    const r = await fetchTrang(p, "POST", "/api/orders", taoDon({ soKhach: 1, leg: legOut("07:00", "Khách sạn Sớm") }));
    assert.equal(r.status, 201, r.text);
    const x = await xacNhan(r.json.order.id, "đơn sớm");
    await p.ev(`window.dispatchEvent(new CustomEvent('don-thay-doi', { detail: { orderId: ${JSON.stringify(r.json.order.id)} } })), true`);
    await p.waitFor(`!!document.querySelector('#dp-cot-chua-xep .dp-leg[data-leg="${x.legId}"]')`, "đơn sớm hiện");
    await p.ev(click(`#dp-cot-chua-xep .dp-leg[data-leg="${x.legId}"]`));
    await p.waitFor(`!!document.querySelector('[data-action="xep-gui"]')`, "hộp xếp");
    await sleep(500);
    await p.ev(click(`.dp-sheet-xep .vc-reason[data-code="${T6.id}"]`));
    assert.match(await p.ev(txt(".dp-sheet-xep .dp-xep-nhac")), /giờ hẹn ngoài khung giờ chuyến/);
    await p.ev(click('[data-action="xep-gui"]'));
    await p.waitFor(`${txt("#dp-banner .banner-title")} === 'Đã xếp 1 khách vào ${T6.ma}'`, "đã xếp");
    assert.ok((await p.ev(`[...document.querySelectorAll('#dp-banner .banner-warning li')].map((x) => x.innerText.trim())`)).some((l) => l === `Giờ hẹn nằm ngoài khung giờ chuyến: ${x.ma} — chỉ nhắc, chuyến đã xếp.`));
    await shotView(p, "c3-xep-canh-bao-gio-hen-may-tinh.png");
  });

  await b.step("9", `'+ Chuyến mới' ở đầu trang mở bảng trượt (không đi trang khác); đóng bằng Đóng → không gửi gì, tiêu điểm về nút${axeNote()}`, async () => {
    const truoc = ghi(p).length;
    await p.ev(click("#dp-moi"));
    await p.waitFor(`!!document.querySelector('.dp-sheet-tao')`, "bảng tạo chuyến");
    assert.equal(await p.ev(`location.pathname`), "/dieu-phoi");
    await sleep(500);
    await p.ev(`[...document.querySelectorAll('.dp-sheet-tao button')].find((x) => x.innerText.trim() === 'Đóng').click()`);
    await p.waitFor(`!document.querySelector('.dp-sheet-tao')`, "đã đóng");
    assert.equal(ghi(p).length, truoc);
    assert.equal(await p.ev(`document.activeElement.id`), "dp-moi");
    assert.equal(await p.ev(noCode), "");
    assert.ok(await p.ev(noOverflowX));
  });
  await p.close();

  // ---- C33: chi tiết chuyến ---------------------------------------------------------------------------------------------------------------------------------
  const ct = await env.as(ACCOUNTS.salesA, `/chuyen?id=${T6.id}`, DESK);
  await b.step("10", `C33: chi tiết ${T6.ma} — điểm đón 'Khách sạn Chung' gộp hai đơn: giờ hẹn của điểm là sớm nhất (10:15), và DƯỚI tên điểm có từng đoàn 'mã đơn · hẹn giờ · số khách'; điểm một đoàn thì không dòng đoàn${axeNote()}`, async () => {
    await ct.waitFor(`!!document.querySelector('.dp-stop[data-diem]')`, "bảng điểm dừng");
    const hang = await ct.ev(`[...document.querySelectorAll('.dp-stop[data-diem]')].map((r) => ({ noi: r.querySelector('.dp-stop-noi strong')?.innerText.replace(/\\s+/g, ' ').trim(), hen: r.querySelector('.dp-stop-hen')?.innerText.trim(), doan: [...r.querySelectorAll('.dp-doan')].map((x) => x.innerText.trim()) }))`);
    const chung = hang.find((x) => /Khách sạn Chung/.test(x.noi));
    assert.ok(chung, JSON.stringify(hang));
    assert.equal(chung.hen, "10:15");
    assert.deepEqual(chung.doan, [`${DA.ma} · hẹn 10:15 · 3 khách`, `${DB.ma} · hẹn 10:30 · 2 khách`]);
    for (const x of hang.filter((v) => !/Khách sạn Chung/.test(v.noi))) assert.deepEqual(x.doan, [], `điểm một đoàn không dòng đoàn: ${JSON.stringify(x)}`);
    assert.doesNotMatch(await ct.ev(txt(".dp-stop[data-diem] .dp-doan")), /Hành Khách|Khách C3/, "không tên khách ở dòng đoàn");
    assert.equal(await ct.ev(noCode), "");
    assert.ok(await ct.ev(noOverflowX));
    await axe(ct, "chi tiết chuyến 1040 có dòng đoàn");
    await shotFull(ct, "c3-chi-tiet-chuyen-doan-may-tinh.png");
  });

  // ---- Điện thoại ------------------------------------------------------------------------------------------------------------------------------------------------
  // Dựng thêm vài chặng chưa xếp để thấy ô chọn + thanh chọn dính đáy ở 390.
  // (lập bằng phiên của trang đang mở — `call()` đăng nhập riêng sẽ đá phiên trình duyệt của cùng tài khoản; xác nhận do Quản trị)
  const donQuaTrang = async (pg, viec, soKhach, leg) => {
    const r = await fetchTrang(pg, "POST", "/api/orders", taoDon({ soKhach, leg }));
    assert.equal(r.status, 201, `lập ${viec}: ${r.text}`);
    return { ...(await xacNhan(r.json.order.id, viec)), soKhach };
  };
  const DX = await donQuaTrang(ct, "DX", 2, legOut("08:45", "Khách sạn Đông"));
  const DY = await donQuaTrang(ct, "DY", 4, legOut("09:15", "Khách sạn Tây"));
  await ct.close();
  const pm = await env.as(ACCOUNTS.salesA, `/dieu-phoi?ngay=${NGAY}`, MOB);
  await b.step("11", `390 Bán hàng: ô chọn đủ vùng chạm (≥ 44px), ba ô lọc 16px, thanh chọn hiện khi tích, hộp xếp nhiều chặng dùng được; trang không tràn ngang${axeNote()}`, async () => {
    await cho(pm);
    assert.match(await pm.ev(tong), /^8 khách chưa xếp · /);
    const kt = await pm.ev(`(() => { const o = document.querySelector('.dp-leg-o').getBoundingClientRect(); return { w: Math.round(o.width), h: Math.round(o.height) }; })()`);
    assert.ok(kt.w >= 44 && kt.h >= 44, `vùng chạm ô chọn: ${JSON.stringify(kt)}`);
    const cs = await pm.ev(`[...document.querySelectorAll('.dp-loc select')].map((x) => parseFloat(getComputedStyle(x).fontSize))`);
    assert.ok(cs.every((x) => x >= 16), `ô lọc ≥ 16px: ${JSON.stringify(cs)}`);
    await pm.ev(chonO(DX.legId));
    await pm.ev(chonO(DY.legId));
    await pm.waitFor(`${txt("#dp-cot-chua-xep .dp-nhieu-chu")} === 'Đã chọn 2 lượt · 6 khách'`, "thanh chọn");
    assert.ok(await pm.ev(noOverflowX));
    await axe(pm, "điều phối 390 có ô chọn");
    await shotFull(pm, "c3-chua-xep-chon-dien-thoai.png");
    await pm.ev(click('[data-action="xep-nhieu"]'));
    await pm.waitFor(`!!document.querySelector('[data-action="xep-gui"]')`, "hộp xếp");
    await sleep(600);
    const dsM = await pm.ev(hopXep);
    assert.ok([d.T1.id, d.T2.id].includes(dsM[0].code) && !dsM[0].mo, `chuyến hợp (07:30–09:30) lên đầu: ${JSON.stringify(dsM)}`);
    await axe(pm, "hộp xếp nhiều chặng 390");
    await shotView(pm, "c3-xep-nhieu-dien-thoai.png");
    await pm.ev(`[...document.querySelectorAll('.dp-sheet-xep button')].find((x) => x.innerText.trim() === 'Đóng').click()`);
    await pm.waitFor(`!document.querySelector('.dp-sheet-xep')`, "đóng hộp");
    assert.equal(await pm.ev(daTich), 2, "đóng hộp không mất lựa chọn");
  });
  await pm.close();

  // ---- Kế toán (chỉ xem) ---------------------------------------------------------------------------------------------------------------------------------------
  const k = await env.as(ACCOUNTS.accounting, `/dieu-phoi?ngay=${NGAY}`, DESK);
  await b.step("12", `Kế toán: thấy tổng và bộ lọc, KHÔNG ô chọn, KHÔNG thanh chọn, KHÔNG nút '+ Chuyến mới'; lọc dùng được; khối chuyến có mức tải${axeNote()}`, async () => {
    await cho(k);
    assert.match(await k.ev(tong), /khách chưa xếp · .* ghế trống ở \d+ chuyến chưa chạy/);
    assert.equal(await k.ev(`document.querySelectorAll('#dp-cot-chua-xep .dp-leg-chon, #dp-cot-chua-xep .dp-nhieu, #dp-cot-chua-xep button').length`), 0);
    assert.equal(await k.ev(shown("#dp-moi")), false);
    await k.ev(locDat("dp-loc-ca", "SANG"));
    await k.waitFor(`document.querySelectorAll('#dp-cot-chua-xep .dp-leg').length === 2`, "Kế toán lọc Sáng (DX, DY)");
    assert.ok((await k.ev(`document.querySelectorAll('.dp-khoi[class*="is-tai-"]').length`)) >= 1, "khối chuyến có mức tải");
    assert.equal(ghi(k).length, 0);
    assert.equal(await k.ev(noCode), "");
    await axe(k, "điều phối 1040 Kế toán có lọc");
    await shotFull(k, "c3-dieu-phoi-ke-toan-may-tinh.png");
  });
  await k.close();

  await b.step("13", "không lỗi console ở mọi trang đã mở", async () => {
    for (const pg of [p, ct, pm, k]) assert.deepEqual(pg.consoleErrors, []);
  });
} finally {
  b.xong();
  await env.stop();
}
