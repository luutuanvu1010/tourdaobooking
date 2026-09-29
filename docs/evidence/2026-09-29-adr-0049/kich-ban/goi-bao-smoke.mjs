// B-GB — nhắc "gọi báo khách" khi giờ hẹn đổi sau khi xếp xe (ADR-0051 GB1, GB2; Task A-GB của máy chủ): cột "Cần xử lý" của Điều phối xe (danh sách riêng
// GET /api/van-chuyen/nhac-goi-khach — hiện ở MỌI ngày đang xem), dòng ở điểm dừng của Chi tiết chuyến, lệnh "Đã gọi báo" / "Bỏ đánh dấu". Nhãn là hằng ở
// src/shared/goi-bao.ts. Ba vai: Bán hàng (đơn mình) bấm được; Kế toán thấy, không nút; Tài xế không thấy gì. Thẻ "xe tới muộn" không có nút (Q-GB-1 = b).
// Chạy từ GỐC repo, sau `npm run build:web` (không cần mạng ngoài):
//   AXE_JS=<…/axe.min.js> CHROME_BIN=docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh OUT=<thư mục ảnh> node docs/evidence/2026-09-29-adr-0049/kich-ban/goi-bao-smoke.mjs
// Kho cookie của Chrome dùng CHUNG: Bán hàng → Tài xế → Kế toán (trang mở sau cùng là của Kế toán).
import {
  ACCOUNTS, CHU, DESK, LOC_BEN_TAU, apiCalls, assert, axe, axeNote, boDem, click, dungDuLieuDieuPhoi, dungMoiTruong, noCode, shotFull, sleep, txt,
} from "./dp-lib.mjs";

const { env, call } = await dungMoiTruong([CHU]);
const b = boDem("GOI BAO SMOKE");
const d = await dungDuLieuDieuPhoi(env, call);
const dm = (n) => `${n.slice(8, 10)}/${n.slice(5, 7)}`;
// O1 (đã xếp vào T1) đổi giờ đón 08:00 → 08:30 SAU khi xếp — đường thật (Bán hàng sửa chặng đơn đã xác nhận, ngoài mốc).
const doiGio = async (expectedUpdatedAt, gio) => {
  const r = await call(ACCOUNTS.salesA, "PUT", `/api/orders/${d.O1.id}/legs/${d.O1.legId}`, {
    expectedUpdatedAt, leg: { pickupDate: d.NGAY_XA, pickupTime: gio, pickupLocationId: null, pickupPlace: "Sheraton Nha Trang", dropoffLocationId: LOC_BEN_TAU, dropoffPlace: "" },
  });
  assert.equal(r.status, 200, `đổi giờ O1 → ${gio}: ${r.text}`);
  return r.json.order.services[0].legs.find((l) => l.id === d.O1.legId).updatedAt;
};
let capNhat = await doiGio(d.O1.leg.updatedAt, "08:30");
const SDT_O1 = "0903 100 201";

const viecGb = `[...document.querySelectorAll('#dp-cot-can-xu-ly .dp-cxl')].filter((x) => x.querySelector('.dp-cxl-loai').innerText.trim() === 'GIỜ HẸN ĐỔI — GỌI BÁO KHÁCH').map((x) => ({ tieuDe: x.querySelector('.dp-cxl-tieu-de').innerText.trim(), text: x.querySelector('.dp-cxl-text')?.innerText.trim(), ai: x.querySelector('.dp-cxl-ai').innerText.trim(), nut: [...x.querySelectorAll('.dp-cxl-actions .vc-btn')].map((n) => n.innerText.trim()) }))`;
const dongGb = `[...document.querySelectorAll('.dp-gb')].map((x) => ({ text: x.innerText.replace(/\\s+/g, ' ').trim(), nut: [...x.querySelectorAll('button')].map((n) => n.innerText.trim()) }))`;
const choBang = (p) => p.waitFor(`!document.getElementById('dp-trang').hidden && !!document.querySelector('#dp-cot-can-xu-ly .dp-card-head')`, "bảng điều phối dựng xong");

try {
  // ---- Bán hàng (người lập đơn O1) --------------------------------------------------------------------------------------------------------------------------
  const p = await env.as(ACCOUNTS.salesA, `/dieu-phoi?ngay=${d.NGAY_KHOA}`, DESK);
  await b.step("1", `Cần xử lý (ngày đang xem KHÁC ngày chuyến): mục "Giờ hẹn đổi — gọi báo khách" — mã đơn · nơi đón, "Giờ hẹn đón đổi 08:00 → 08:30 · CX-… · Chuyến ${dm(d.NGAY_XA)}", "Ai xử lý: Người phụ trách đơn", nút "Đã gọi báo"; không SĐT${axeNote()}`, async () => {
    await choBang(p);
    await p.waitFor(`(${viecGb}).length === 1`, "mục gọi báo");
    const v = (await p.ev(viecGb))[0];
    assert.deepEqual(v, {
      tieuDe: `${d.O1.ma} · Sheraton Nha Trang`, text: `Giờ hẹn đón đổi 08:00 → 08:30 · ${d.T1.ma} · Chuyến ${dm(d.NGAY_XA)}`, ai: "Ai xử lý: Người phụ trách đơn", nut: ["Đã gọi báo"],
    });
    assert.ok(!(await p.ev(`document.querySelector('#dp-cot-can-xu-ly').innerText`)).includes(SDT_O1), "không SĐT khách ở danh sách nhắc");
    assert.equal(apiCalls(p).filter((r) => r.path === "/api/van-chuyen/nhac-goi-khach").length, 1, "danh sách riêng, gọi cùng lần tải lịch");
    assert.equal(await p.ev(noCode), "");
    await axe(p, "cần xử lý có mục gọi báo");
    await shotFull(p, "bgb-can-xu-ly-ban-hang-may-tinh.png");
  });

  await b.step("2", `bấm "Đã gọi báo" → thân CHỈ requestId + phienBan + gioMoi; mục biến mất; dải "Đã ghi: đã gọi báo khách …" có "Bỏ đánh dấu" → bấm → mục hiện lại`, async () => {
    await p.ev(click('#dp-cot-can-xu-ly [data-action="da-goi-bao"]'));
    await p.waitFor(`${txt("#dp-banner .dp-banner-ok .banner-title")} === 'Đã ghi: đã gọi báo khách ${d.O1.ma}'`, "dải đã ghi");
    await p.waitFor(`(${viecGb}).length === 0`, "mục biến mất");
    const body = JSON.parse(apiCalls(p).filter((r) => r.path.endsWith("/da-goi-bao")).at(-1).body);
    assert.deepEqual(Object.keys(body).sort(), ["gioMoi", "phienBan", "requestId"]);
    assert.deepEqual(body.gioMoi, { ngay: d.NGAY_XA, gio: "08:30" });
    await shotFull(p, "bgb-da-goi-bao-may-tinh.png");
    await p.ev(click('#dp-banner [data-action="bo-danh-dau"]'));
    await p.waitFor(`(${viecGb}).length === 1`, "mục hiện lại");
    assert.match(await p.ev(txt("#dp-banner .banner-info .banner-title")), /^Đã bỏ đánh dấu/);
  });

  await b.step("3", `Chi tiết chuyến: dòng ở điểm đón "… Giờ hẹn đổi 08:00 → 08:30 — chưa gọi báo" + "Đã gọi báo" → bấm → "— đã gọi báo khách (Sales Một, HH:MM)" + "Bỏ đánh dấu"`, async () => {
    await p.ev(`document.body.dataset.cu = '1'`);
    await p.send("Page.navigate", { url: `${env.base}/chuyen?id=${d.T1.id}` });
    await p.waitFor(`!document.body.dataset.cu && !!document.querySelector('.dp-gb')`, "dòng gọi báo");
    assert.deepEqual(await p.ev(dongGb), [{ text: `${d.O1.ma} · Giờ hẹn đổi 08:00 → 08:30 — chưa gọi báo Đã gọi báo`, nut: ["Đã gọi báo"] }]);
    await p.ev(click('.dp-gb [data-action="da-goi-bao"]'));
    await p.waitFor(`/đã gọi báo khách/.test(document.querySelector('.dp-gb').innerText)`, "đã gọi báo");
    const g = (await p.ev(dongGb))[0];
    assert.match(g.text, new RegExp(`^${d.O1.ma} · Giờ hẹn đổi 08:00 → 08:30 — đã gọi báo khách \\(Sales Một, \\d\\d:\\d\\d\\) Bỏ đánh dấu$`));
    assert.deepEqual(g.nut, ["Bỏ đánh dấu"]);
    await shotFull(p, "bgb-chi-tiet-da-goi-may-tinh.png");
  });

  await b.step("4", `"Bỏ đánh dấu" → "chưa gọi báo"; giờ hẹn đổi TIẾP (08:30 → 08:45) khi màn còn cũ → "Đã gọi báo" (gioMoi cũ) bị từ chối 409 → câu hằng + "Tải lại" → tải lại: "chưa gọi báo" giờ mới`, async () => {
    await p.ev(click('.dp-gb [data-action="bo-danh-dau"]'));
    await p.waitFor(`/chưa gọi báo/.test(document.querySelector('.dp-gb').innerText)`, "đã bỏ đánh dấu");
    capNhat = await doiGio(capNhat, "08:45");
    await p.ev(click('.dp-gb [data-action="da-goi-bao"]'));
    await p.waitFor(`!!document.querySelector('#ct-trang > .banner-warning')`, "dải từ chối");
    assert.match(await p.ev(txt("#ct-trang > .banner-warning .banner-title")), /^(Giờ hẹn vừa đổi hoặc đã có người báo — tải lại\.|Không còn cần gọi báo)/);
    await p.ev(`document.body.dataset.cu = '1'`);
    await p.ev(click('#ct-trang > .banner-warning [data-action="tai-lai"]'));
    await p.waitFor(`!document.body.dataset.cu && !!document.querySelector('.dp-gb')`, "tải lại");
    assert.deepEqual((await p.ev(dongGb))[0].text, `${d.O1.ma} · Giờ hẹn đổi 08:00 → 08:45 — chưa gọi báo Đã gọi báo`);
  });
  await p.close();

  // ---- Tài xế (An lái T1) ------------------------------------------------------------------------------------------------------------------------------------
  const t = await env.as(d.AN.account, `/cuoc-chuyen?id=${d.T1.id}`, DESK);
  await b.step("5", "Tài xế: không thấy gì của phần gọi báo (không route nhắc, không dòng ở chuyến của mình); route nhắc với tài xế → 403", async () => {
    await t.waitFor(`!!document.querySelector('#cc-trang .dp-card-head') || !document.getElementById('error').hidden`, "màn chuyến của tài xế");
    await sleep(800);
    assert.equal(await t.ev(`document.body.innerText.includes('gọi báo')`), false);
    assert.equal(apiCalls(t).filter((r) => r.path.includes("goi") || r.path.includes("nhac")).length, 0);
    assert.equal((await call(d.AN.account, "GET", "/api/van-chuyen/nhac-goi-khach")).status, 403);
  });
  await t.close();

  // ---- Kế toán (thấy, không nút) -------------------------------------------------------------------------------------------------------------------------------
  const k = await env.as(ACCOUNTS.accounting, `/dieu-phoi?ngay=${d.NGAY_XA}`, DESK);
  await b.step("6", "Kế toán: Cần xử lý có mục gọi báo nhưng KHÔNG nút; Chi tiết chuyến: dòng gọi báo không nút; không lệnh ghi", async () => {
    await choBang(k);
    await k.waitFor(`(${viecGb}).length === 1`, "mục gọi báo");
    const v = (await k.ev(viecGb))[0];
    assert.equal(v.text, `Giờ hẹn đón đổi 08:00 → 08:45 · ${d.T1.ma}`, "cùng ngày chuyến → không nhãn 'Chuyến dd/mm'");
    assert.deepEqual(v.nut, [], "Kế toán: baoDuoc = false → không nút");
    await shotFull(k, "bgb-can-xu-ly-ke-toan-may-tinh.png");
    await k.ev(`document.body.dataset.cu = '1'`);
    await k.send("Page.navigate", { url: `${env.base}/chuyen?id=${d.T1.id}` });
    await k.waitFor(`!document.body.dataset.cu && !!document.querySelector('.dp-gb')`, "dòng gọi báo");
    assert.deepEqual((await k.ev(dongGb))[0].nut, []);
    assert.equal(apiCalls(k).filter((r) => r.method === "POST").length, 0);
  });
  await k.close();

  await b.step("7", "không lỗi console ở mọi trang đã mở", async () => {
    for (const pg of [p, t, k]) assert.deepEqual(pg.consoleErrors, []);
  });
} finally {
  b.xong();
  await env.stop();
}
