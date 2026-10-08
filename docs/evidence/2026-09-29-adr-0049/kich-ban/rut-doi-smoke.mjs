// Vòng 5b — "Rút khỏi xe" / "Chuyển sang xe khác" trên từng nhóm khách của Chi tiết chuyến (/chuyen). Chủ trả lời lần 15: "Làm ngay, thợ tự đặt nút"; route 6
// `rut`, route 7 `doi` của A13 (không đổi máy chủ). Nút theo ô trip.dispatch + chuyến lên kế hoạch; vùng khoá theo `khoaMoc` (Bán hàng: câu "cần Quản trị phá
// lệ", không nút; Quản trị: hộp Phá lệ khi máy chủ đòi — khuôn huỷ chuyến H17); sau mỗi lệnh đọc lại GET chi tiết (GA-55). KHÔNG sắp lại điểm (Q-B-15).
// Vòng 5c: tên có ngay sau xếp (máy chủ I19(a)); bước 2 + 3 kiểm nhóm CÒN LẠI đúng tên ngay trên cùng trang sau lệnh (P16: `docLai` → `return r` thì đỏ).
// Chạy từ GỐC repo, sau `npm run build:web` (không cần mạng ngoài):
//   AXE_JS=<…/axe.min.js> CHROME_BIN=docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh OUT=<thư mục ảnh> node docs/evidence/2026-09-29-adr-0049/kich-ban/rut-doi-smoke.mjs
// Kho cookie của Chrome dùng CHUNG: Bán hàng → Quản trị → Kế toán (trang mở sau cùng là của Kế toán).
import { randomUUID } from "node:crypto";
import {
  ACCOUNTS, CHU, DESK, MOB, apiCalls, assert, axe, axeNote, boDem, click, dungDuLieuDieuPhoi, dungMoiTruong, noCode, noOverflowX, shotFull, shotView, shown, sleep, txt,
} from "./dp-lib.mjs";

const { env, call } = await dungMoiTruong([CHU]);
const b = boDem("RUT DOI SMOKE");
const d = await dungDuLieuDieuPhoi(env, call);
// Vùng khoá có khách: Quản trị xếp O4 (quá mốc) vào T4 bằng phá lệ (đường thật).
const x4 = await call(ACCOUNTS.admin, "POST", `/api/van-chuyen/chuyen/${d.T4.id}/phan-bo`, { version: d.T4.version, requestId: randomUUID(), chang: [{ legId: d.O4.legId, soSuat: 2 }], phaLe: { lyDo: "PHA_LE_SU_CO" } });
assert.equal(x4.status, 200, x4.text);
// Vòng 5c (máy chủ I19(a), b94963a): lúc xếp máy tự gắn khoá người rảnh của đơn — chuyến lên kế hoạch có TÊN ngay sau xếp, KHÔNG cần gửi khoá người (bỏ
// bước "rút rồi xếp lại kèm khoá đọc bằng SQL" của vòng 5b). Xếp thêm O5 (5 khách đủ tên) vào T1 như màn xếp (không khoá người) → T1 có HAI nhóm CÓ tên, để
// kiểm ngay trên CÙNG trang sau lệnh rút / chuyển: nhóm còn lại vẫn đúng tên (GA-55 — `docLai`; khoảng trống P16 K2c VỪA-1).
{
  const x = await call(ACCOUNTS.admin, "POST", `/api/van-chuyen/chuyen/${d.T1.id}/phan-bo`, { version: d.T1.version, requestId: randomUUID(), chang: [{ legId: d.O5.legId, soSuat: 5 }] });
  assert.equal(x.status, 200, x.text);
}

const nhom = `[...document.querySelectorAll('.dp-khach-nhom')].map((x) => ({ khoa: x.dataset.nhom, text: x.querySelector('.dp-khach-nhom-t').innerText.replace(/\\s+/g, ' ').trim(), ten: x.querySelector('.dp-khach-nhom-ten').innerText.trim(), nut: [...x.querySelectorAll('button')].map((n) => n.innerText.trim()) }))`;
const ghi = (p, duoi) => apiCalls(p).filter((r) => r.method === "POST" && r.path.endsWith(duoi)).map((r) => JSON.parse(r.body));
const moChuyen = async (p, id) => {
  await p.ev(`document.body.dataset.cu = '1'`);
  await p.send("Page.navigate", { url: `${env.base}/chuyen?id=${id}` });
  await p.waitFor(`!document.body.dataset.cu && !!document.querySelector('.dp-ct-title')`, `mở chuyến ${id}`);
};
const TEN_O1 = ["Hành Khách Thử 1-1 1980", "Hành Khách Thử 1-2 1981", "Hành Khách Thử 1-3 1982"];
const TEN_O5 = ["Hành Khách Thử 4-1 1980", "Hành Khách Thử 4-2 1981", "Hành Khách Thử 4-3 1982", "Hành Khách Thử 4-4 1983", "Hành Khách Thử 4-5 1984"];
const TEN_O3 = ["Hành Khách Thử 3-1 1980", "Hành Khách Thử 3-2 1981", "Hành Khách Thử 3-3 1982", "Hành Khách Thử 3-4 1983"];
const tenCua = (g, legId) => g.find((x) => x.khoa === legId)?.ten.split(" · ").sort();
// Gọi bằng phiên CỦA TRANG (ADR-0075: mỗi tài khoản một phiên — `call` đăng nhập lại làm cookie cũ hết hiệu lực sau khi trang mở).
const chang = async (pg, legId, ngay) => (await pg.ev(`fetch(${JSON.stringify(`/api/van-chuyen/lich?ngay=${ngay}`)}).then((r) => r.json())`)).chang.find((c) => c.legId === legId);

try {
  // ---- Bán hàng, máy tính ------------------------------------------------------------------------------------------------------------------------------------
  const p = await env.as(ACCOUNTS.salesA, `/chuyen?id=${d.T1.id}`, DESK);
  await b.step("1", `1040 Bán hàng ${d.T1.ma}: thẻ "Khách trong chuyến" — hai nhóm theo đơn (tuyến, tên + năm sinh CÓ NGAY sau xếp — I19(a)), nút "Rút khỏi xe" + "Chuyển sang xe khác"${axeNote()}`, async () => {
    await p.waitFor(`!!document.querySelector('.dp-khach-nhom')`, "thẻ khách");
    const g = await p.ev(nhom);
    const nut2 = ["Rút khỏi xe", "Chuyển sang xe khác"];
    assert.deepEqual(g.map((x) => [x.khoa, x.text, x.nut]).sort(), [
      [d.O1.legId, `${d.O1.ma} · 3 khách Sheraton Nha Trang → Bến tàu du lịch Nha Trang`, nut2],
      [d.O5.legId, `${d.O5.ma} · 5 khách Mường Thanh Luxury → nơi trả chưa chốt`, nut2],
    ].sort());
    assert.deepEqual(tenCua(g, d.O1.legId), TEN_O1);
    assert.deepEqual(tenCua(g, d.O5.legId), TEN_O5, "xếp KHÔNG gửi khoá người vẫn có tên (máy chủ I19(a))");
    assert.equal(await p.ev(`document.querySelector('.dp-khach-nhom-the').innerText.includes('chưa gắn tên')`), false);
    assert.equal(await p.ev(noCode), "");
    assert.ok(await p.ev(noOverflowX));
    await axe(p, "khách trong chuyến 1040");
    await shotFull(p, "b5b-khach-trong-chuyen-may-tinh.png");
  });

  await b.step("2", `"Chuyển sang xe khác" → hộp chọn chuyến đích CÙNG NGÀY (danh sách máy chủ, trừ chuyến này; nút khoá tới khi chọn) → chuyển O1 sang ${d.T2.ma} (cùng khung giờ) → CÙNG trang: O1 biến mất, O5 còn lại vẫn đúng tên; ở chuyến đích O1 ĐÚNG tên, O2 "1 tên · 1 khách chưa gắn tên"${axeNote()}`, async () => {
    await p.ev(click('.dp-khach-nhom [data-action="doi"]'));
    await p.waitFor(`!!document.querySelector('.dp-sheet-khach [data-action="khach-gui"]')`, "hộp chuyển");
    await sleep(600);
    assert.equal(await p.ev(txt(".dp-sheet-khach .sheet-title")), "Chuyển sang xe khác");
    const ds = await p.ev(`[...document.querySelectorAll('.dp-sheet-khach .vc-reason')].map((x) => x.dataset.code)`);
    assert.ok(ds.includes(d.T2.id) && ds.includes(d.T3.id) && !ds.includes(d.T1.id), JSON.stringify(ds));
    assert.equal(await p.ev(`document.querySelector('.dp-sheet-khach [data-action="khach-gui"]').disabled`), true);
    await axe(p, "hộp chuyển 1040");
    await shotView(p, "b5b-chuyen-xe-hop-may-tinh.png");
    await p.ev(click(`.dp-sheet-khach .vc-reason[data-code="${d.T2.id}"]`));
    await p.ev(click('.dp-sheet-khach [data-action="khach-gui"]'));
    await p.waitFor(`/^Đã chuyển 3 khách sang /.test(${txt("#ct-trang > .dp-banner-ok .banner-title")} ?? '')`, "đã chuyển");
    const body = ghi(p, "/doi").at(-1);
    assert.deepEqual(Object.keys(body).sort(), ["denChuyenId", "denVersion", "requestId", "suatIds", "version"]);
    assert.equal(body.denChuyenId, d.T2.id);
    // CÙNG trang, chưa điều hướng (K2c VỪA-1): O1 biến mất, O5 còn lại vẫn ĐÚNG tên — phản hồi lệnh không có tên (GA-55), phải là tên của GET đọc lại.
    const conLai = await p.ev(nhom);
    assert.deepEqual(conLai.map((x) => x.khoa), [d.O5.legId], "chuyến nguồn chỉ còn O5");
    assert.deepEqual(tenCua(conLai, d.O5.legId), TEN_O5, "sau chuyển, nhóm còn lại vẫn đúng tên ngay trên trang (đọc lại GET)");
    assert.equal(await p.ev(`document.querySelector('.dp-khach-nhom-the').innerText.includes('chưa gắn tên')`), false);
    await moChuyen(p, d.T2.id);
    const g = await p.ev(nhom);
    assert.deepEqual(g.map((x) => x.khoa).sort(), [d.O1.legId, d.O2.legId].sort());
    assert.deepEqual(tenCua(g, d.O1.legId), TEN_O1, "tên đúng ở chuyến đích (GA-55 — đọc từ GET)");
    // O2: 2 khách, đơn chỉ có 1 tên → máy gắn 1 khoá lúc xếp (I19(a)), suất còn lại null → tên + đếm phần chưa gắn (không ô trống / "undefined" / tên bịa).
    assert.equal(g.find((x) => x.khoa === d.O2.legId).ten, "Hành Khách Thử 2-1 1980 · 1 khách chưa gắn tên");
  });

  await b.step("3", `ngoài vùng khoá: "Rút khỏi xe" O2 khỏi ${d.T2.ma} → CÙNG trang: O2 biến mất, O1 còn lại vẫn đúng tên; khách về cột "Chưa xếp" trên bảng Điều phối xe; thân không kèm phá lệ`, async () => {
    await moChuyen(p, d.T2.id); // tự mở lại chuyến — bước này không dựa vào trang bước 2 để lại (P16 thấy đỏ ĐÚNG ở phép kiểm của bước này)
    await p.waitFor(`!!document.querySelector('.dp-khach-nhom[data-nhom="${d.O2.legId}"] [data-action="rut"]')`, "nút rút O2");
    await p.ev(click(`.dp-khach-nhom[data-nhom="${d.O2.legId}"] [data-action="rut"]`));
    await p.waitFor(`!!document.querySelector('.dp-sheet-khach [data-action="khach-gui"]')`, "hộp rút");
    await sleep(600);
    assert.equal(await p.ev(txt(".dp-sheet-khach .dp-sheet-text")), "2 khách trở về cột “Chưa xếp” của Điều phối xe. Điểm dừng không còn khách sẽ bỏ qua.");
    await p.ev(click('.dp-sheet-khach [data-action="khach-gui"]'));
    await p.waitFor(`/^Đã rút 2 khách khỏi /.test(${txt("#ct-trang > .dp-banner-ok .banner-title")} ?? '')`, "đã rút");
    const body = ghi(p, "/rut").at(-1);
    assert.deepEqual(Object.keys(body).sort(), ["requestId", "suatIds", "version"]);
    // CÙNG trang, chưa điều hướng (K2c VỪA-1): O2 biến mất, O1 còn lại vẫn ĐÚNG tên, không "chưa gắn tên".
    const conLai = await p.ev(nhom);
    assert.deepEqual(conLai.map((x) => x.khoa), [d.O1.legId]);
    assert.deepEqual(tenCua(conLai, d.O1.legId), TEN_O1, "sau rút, nhóm còn lại vẫn đúng tên ngay trên trang (đọc lại GET)");
    assert.equal(await p.ev(`document.querySelector('.dp-khach-nhom-the').innerText.includes('chưa gắn tên')`), false);
    assert.equal((await chang(p, d.O2.legId, d.NGAY_XA)).trangThai, "CHUA_XEP");
    await p.ev(`document.body.dataset.cu = '1'`);
    await p.send("Page.navigate", { url: `${env.base}/dieu-phoi?ngay=${d.NGAY_XA}` });
    await p.waitFor(`!document.body.dataset.cu && !!document.querySelector('#dp-cot-chua-xep .dp-leg[data-leg="${d.O2.legId}"]')`, "O2 ở cột Chưa xếp");
  });
  await p.close();

  // ---- Bán hàng, điện thoại (vùng khoá) ----------------------------------------------------------------------------------------------------------------------
  const pm = await env.as(ACCOUNTS.salesA, `/chuyen?id=${d.T4.id}`, MOB);
  // ADR-0104 Đ1 (NỚI có tên, 2026-10-08): rút / chuyển trong vùng khoá = điều chỉnh khẩn cấp — Bán hàng có ô trip.urgent_adjust: KHÔNG còn câu khoá, CÓ nút;
  // bấm rút → máy chủ đòi điều chỉnh khẩn cấp → hộp "Điều chỉnh khẩn cấp" (Bán hàng chỉ mở rồi đóng; Quản trị rút thật ở bước 5).
  await b.step("4", `390 Bán hàng ${d.T4.ma} (trong vùng khoá): KHÔNG câu khoá, CÓ nút rút / chuyển (ADR-0104 Đ1); "Rút khỏi xe" → hộp "Điều chỉnh khẩn cấp" ("Điều chỉnh khẩn cấp và rút"); đóng, không gửi; không tràn ngang${axeNote()}`, async () => {
    await pm.waitFor(`!!document.querySelector('.dp-khach-nhom [data-action="rut"]')`, "thẻ khách có nút");
    assert.equal(await pm.ev(`!!document.querySelector('.dp-khach-khoa')`), false, "Bán hàng: không câu khoá (có ô điều chỉnh khẩn cấp)");
    assert.deepEqual((await pm.ev(nhom)).map((x) => x.nut), [["Rút khỏi xe", "Chuyển sang xe khác"]]);
    assert.ok(await pm.ev(noOverflowX));
    await axe(pm, "khách trong chuyến khoá 390");
    await shotFull(pm, "b5b-vung-khoa-ban-hang-dien-thoai.png");
    await pm.ev(click('.dp-khach-nhom [data-action="rut"]'));
    await pm.waitFor(`!!document.querySelector('.dp-sheet-khach [data-action="khach-gui"]')`, "hộp rút");
    await pm.ev(click('.dp-sheet-khach [data-action="khach-gui"]'));
    await pm.waitFor(`!!document.querySelector('[data-action="pha-le-gui"]') && !document.querySelector('.dp-sheet-khach')`, "hộp điều chỉnh khẩn cấp thay hộp rút");
    await sleep(600);
    assert.equal(await pm.ev(txt('[data-action="pha-le-gui"]')), "Điều chỉnh khẩn cấp và rút");
    assert.equal(await pm.ev(txt("#dp-pha-le-label")), "Lý do điều chỉnh khẩn cấp");
    await shotView(pm, "b5b-khan-cap-rut-ban-hang-dien-thoai.png");
    await pm.ev(`[...document.querySelectorAll('.dp-sheet-pha-le button')].find((x) => x.innerText.trim() === 'Đóng').click()`);
    await pm.waitFor(`!document.querySelector('[data-action="pha-le-gui"]')`, "đóng hộp, không gửi");
    assert.equal(ghi(pm, "/rut").filter((x) => x.phaLe).length, 0, "Bán hàng đóng hộp: không lệnh rút kèm lý do");
  });
  await pm.close();
  const pm2 = await env.as(ACCOUNTS.salesA, `/chuyen?id=${d.T3.id}`, MOB);
  await b.step("4b", `390 Bán hàng ${d.T3.ma} (ngoài khoá): nhóm khách + hai nút lưới hai cột; hộp chọn chuyến đích ở điện thoại${axeNote()}`, async () => {
    await pm2.waitFor(`!!document.querySelector('.dp-khach-nhom [data-action="doi"]')`, "nút chuyển");
    assert.deepEqual(tenCua(await pm2.ev(nhom), d.O3.legId), TEN_O3, "390: tên có ngay sau xếp (I19(a))");
    assert.ok(await pm2.ev(noOverflowX));
    await shotFull(pm2, "b5b-khach-trong-chuyen-dien-thoai.png");
    // Ảnh gửi chủ (vòng 5c): ảnh cả trang dời thanh tab cố định vào giữa ảnh (nhật ký 12) — chụp THÊM khung nhìn với thẻ khách ở giữa màn cho thấy rõ tên.
    await pm2.ev(`document.querySelector('.dp-khach-nhom-the').scrollIntoView({ block: 'center' })`);
    await sleep(300);
    await shotView(pm2, "b5c-khach-co-ten-dien-thoai.png");
    await pm2.ev(`window.scrollTo(0, 0)`);
    await pm2.ev(click('.dp-khach-nhom [data-action="doi"]'));
    await pm2.waitFor(`!!document.querySelector('.dp-sheet-khach [data-action="khach-gui"]')`, "hộp chuyển");
    await sleep(600);
    await axe(pm2, "hộp chuyển 390");
    await shotView(pm2, "b5b-chuyen-xe-hop-dien-thoai.png");
  });
  await pm2.close();

  // ---- Quản trị, máy tính (vùng khoá → phá lệ) ----------------------------------------------------------------------------------------------------------------
  const q = await env.as(ACCOUNTS.admin, `/chuyen?id=${d.T4.id}`, DESK);
  await b.step("5", `1040 Quản trị ${d.T4.ma} (trong vùng khoá): có nút; "Rút khỏi xe" → máy chủ đòi điều chỉnh khẩn cấp → hộp rút đóng, hộp "Điều chỉnh khẩn cấp" mở → "Điều chỉnh khẩn cấp và rút" gửi lại kèm phaLe (requestId mới) → rút được, O4 về "Chưa xếp"${axeNote()}`, async () => {
    await q.waitFor(`!!document.querySelector('.dp-khach-nhom [data-action="rut"]')`, "nút rút");
    assert.equal(await q.ev(`!!document.querySelector('.dp-khach-khoa')`), false, "Quản trị: không câu khoá (có ô phá lệ)");
    await q.ev(click('.dp-khach-nhom [data-action="rut"]'));
    await q.waitFor(`!!document.querySelector('.dp-sheet-khach [data-action="khach-gui"]')`, "hộp rút");
    await q.ev(click('.dp-sheet-khach [data-action="khach-gui"]'));
    await q.waitFor(`!!document.querySelector('[data-action="pha-le-gui"]') && !document.querySelector('.dp-sheet-khach')`, "hộp phá lệ thay hộp rút");
    await sleep(600);
    assert.equal(await q.ev(txt('[data-action="pha-le-gui"]')), "Điều chỉnh khẩn cấp và rút"); // ADR-0104 Đ1: rút chỉ vượt mốc ⇒ lớp khẩn cấp
    assert.match(await q.ev(txt(".dp-sheet-pha-le .dp-sheet-sum")), new RegExp(`^Rút khỏi xe · ${d.O4.ma} · 2 khách `));
    await axe(q, "hộp phá lệ rút 1040");
    await shotView(q, "b5b-pha-le-rut-may-tinh.png");
    await q.ev(click('.dp-sheet-pha-le .vc-reason[data-code="PHA_LE_SU_CO"]'));
    await q.ev(click('[data-action="pha-le-gui"]'));
    await q.waitFor(`/^Đã rút 2 khách khỏi /.test(${txt("#ct-trang > .dp-banner-ok .banner-title")} ?? '')`, "đã rút");
    const rut = ghi(q, "/rut");
    assert.equal(rut.length, 2);
    assert.equal(rut[0].phaLe, undefined);
    assert.deepEqual(rut[1].phaLe, { lyDo: "PHA_LE_SU_CO" });
    assert.notEqual(rut[0].requestId, rut[1].requestId);
    assert.equal(await q.ev(`document.querySelectorAll('.dp-khach-nhom').length`), 0);
    assert.equal((await chang(q, d.O4.legId, d.NGAY_KHOA)).trangThai, "CHUA_XEP");
  });
  await q.close();

  // ---- Kế toán (chỉ xem) ---------------------------------------------------------------------------------------------------------------------------------------
  const k = await env.as(ACCOUNTS.accounting, `/chuyen?id=${d.T3.id}`, DESK);
  await b.step("6", "Kế toán: thấy thẻ khách trong chuyến nhưng KHÔNG nút rút / chuyển, không câu khoá; không lệnh ghi", async () => {
    await k.waitFor(`!!document.querySelector('.dp-khach-nhom')`, "thẻ khách");
    assert.deepEqual((await k.ev(nhom)).map((x) => x.nut), [[]]);
    assert.equal(await k.ev(`!!document.querySelector('.dp-khach-khoa')`), false);
    assert.equal(apiCalls(k).filter((r) => r.method === "POST").length, 0);
  });
  await k.close();

  await b.step("7", "không lỗi console ở mọi trang đã mở", async () => {
    for (const pg of [p, pm, pm2, q, k]) assert.deepEqual(pg.consoleErrors, []);
  });
} finally {
  b.xong();
  await env.stop();
}
