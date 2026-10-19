// Kịch bản Chrome — đưa đón MỘT ô "Nơi đón" / "Nơi trả" có gợi ý ở thẻ dịch vụ của màn Tạo đơn (thiết kế lại 18/10/2026, việc 7; đặc tả
// docs/superpowers/specs/2026-10-18-tao-don-thiet-ke-lai/DAC-TA.md mục 3C; đề bài PROMPT-CLAUDE-DESIGN.md mục C "Đưa đón"; bản vẽ docs/design/tao-don-2026-10-18/ khung 4).
// Kiểm ở hai khổ 390 (cảm ứng thật) và 1040 (chuột thật), tài khoản Bán hàng, D1 tạm, không cần mạng ngoài, KHÔNG chụp ảnh. Mọi chạm / gõ / phím đi qua CDP thật (cham-that.mjs):
//   1) mỗi chặng đúng MỘT ô Nơi đón + MỘT ô Nơi trả (ô gõ 16px, role combobox, autocomplete off, aria-controls trỏ danh sách); không còn ô tìm / ô chọn / ô địa chỉ riêng;
//      chạm ô → danh sách ngay dưới ô (listbox "Gợi ý nơi đón"), mỗi dòng "tên · loại", ≥ 44px, thứ tự danh mục, dòng cuối "Gõ tự do…"; vẫn còn Giờ đón / Chưa chốt giờ,
//      Đón khác ngày, + Thêm chiều về, + Thêm chặng, Thêm chi tiết (xe riêng, số chỗ), Thông tin chuyến;
//   2) gõ "bien xanh" (không dấu) → còn đúng điểm khớp + "Gõ tự do: “bien xanh”"; chạm điểm → ô hiện nhãn điểm, danh sách đóng; nơi trả chọn sân bay → ô số hiệu chuyến bay hiện;
//   3) gõ tự do ở Nơi trả: dòng "Chưa chốt" đầu danh sách, dòng cuối "Gõ tự do: “…”" kèm câu nhắc chỉ ghi địa chỉ; chạm → ô hiện chữ, câu nhắc dưới ô, ô số hiệu biến mất;
//      "Gõ tự do…" khi chưa gõ gì không lưu gì (ô vẫn mở, vẫn tiêu điểm); "Chưa chốt" trả ô về trống;
//   4) bàn phím thật + rời ô (vòng sửa 1 — người kiểm I-1, chủ chọn phương án A: chữ đã gõ không bao giờ mất lặng lẽ): tiêu điểm vào ô KHÔNG mở danh sách; ↓ mở, ↓ ↑ di chuyển
//      (aria-activedescendant + aria-selected, vòng đầu–cuối), Enter chọn dòng đang trỏ (tiêu điểm ở lại ô); Esc là HUỶ (trả giá trị cũ); gõ rồi chạm ra ngoài / Enter khi chưa trỏ
//      dòng nào / Tab → chữ gõ được GIỮ thành địa chỉ gõ tự do (câu nhắc chỉ ghi địa chỉ gắn vào ô); chạm nhãn của ô không đóng danh sách, không mất chữ; gõ ở Nơi đón rồi chạm
//      ô Nơi trả → chữ ở lại ô đón, ô trả nhận tiêu điểm và mở danh sách (cú chạm không bị nuốt); gõ ở Nơi đón rồi chạm "+ Thêm chiều về" → chiều về được tạo, Nơi trả chiều về = chữ
//      vừa gõ (cú chạm không bị nuốt khi khối dựng lại); Enter không bao giờ gửi form;
//   5) chạm THẬT nút Lưu khi chặng của thẻ ĐANG GẬP thiếu nơi đón → thẻ mở, câu "Lượt 1: chưa có nơi đón." dưới ô (aria-describedby), ô đỏ (aria-invalid), trong khung nhìn,
//      danh sách KHÔNG tự bật; tiêu điểm: 1040 (chuột) ở ô, 390 (cảm ứng — vòng sửa 1, M-1) ở đầu chặng ("Chiều đi · Lượt 1"), KHÔNG ở ô gõ nào (bàn phím ảo iPhone không bật)
//      (luật 14/10: điện thoại chỉ đặt tiêu điểm khi ô nằm trong khối gập vừa mở — ô đang thấy thì cuộn tới dải lỗi);
//   5c) (vòng sửa 2 — Minor d) sau lần Lưu báo lỗi: gõ ở Nơi đón rồi chạm MÉP DƯỚI ô Nơi trả → cú chạm không bị nuốt (câu lỗi dưới ô đón chỉ ẩn sau cú chạm);
//   6) lưu thật, mở lại: chặng đủ gập MỘT dòng ("Chiều đi · Đón 07:30 · Khách sạn Biển Xanh → Cảng Cầu Đá"); chạm dòng → chặng mở, ô Nơi đón hiện trong khung nhìn (danh sách không
//      bật); tiêu điểm: 1040 ở ô Nơi đón, 390 (cảm ứng) ở đầu chặng — không ở ô gõ;
//   7) "Đón khác ngày": ô Ngày đón ẩn tới khi chạm, chạm thì hiện và nhận tiêu điểm;
//   8) không tràn ngang ở 390; không lỗi console;
//   9) (vòng sửa 2 — người kiểm lại, I-1 còn mở) gõ ở Nơi trả rồi chạm NGAY ô Giờ đón / Ngày đón — cùng chặng (9a, 9b) và CHIỀU VỀ (9d; 9f qua "Đón khác ngày"): ô vừa chạm
//      KHÔNG bị thay (cùng phần tử DOM, còn trên trang, giữ tiêu điểm); giá trị "chọn" ghi vào ĐÚNG phần tử đó (như bộ chọn của máy — Chrome không đầu KHÔNG có bộ chọn bật lên, nên
//      hành vi bộ chọn thật trên Android / iPhone CHƯA KIỂM) hiện trong ô, chữ mờ "Chưa chốt giờ" khớp; 9c: thêm chiều về, (390 — Minor c) chạm dòng tóm tắt rồi HUỶ cú chạm, mở
//      bằng bàn phím → tiêu điểm vào ô Nơi đón (kiểu ấn cảm ứng không kẹt lại); 9e (1040, bàn phím): còn lần dựng lại đang hẹn, Tab rời ô giờ sang nút "Đón khác ngày" → tiêu điểm
//      ở lại nút; 9g: ô giờ CŨ đã bị gỡ (khối dựng lại vì chọn dòng gợi ý) mà vẫn nhận giá trị → ô mới hiện đúng giá trị đã vào bản nháp; 9h: chạm Lưu → thân PUT mang đúng ngày /
//      giờ / nơi của cả hai chặng; không lỗi console.
// Thân gửi lên (legs) giữ nguyên từng byte cho cả hai nhánh chọn nơi: than-gui.mjs CACH=noi (thư mục dua-don-mot-o/).
// Môi trường: D1 tạm + wrangler dev + Chrome headless qua CDP (docs/evidence/2026-09-20-a2/kich-ban/a2-cdp.mjs) — Turnstile TẮT, danh mục giả (TD101, TTB06); 8 điểm gieo sẵn
// (migrations/0010_locations.sql) + hai điểm gieo thêm: "Khách sạn Biển Xanh" (khách sạn), "Sân bay Cam Ranh" (sân bay).
// Chạy từ GỐC repo, sau `npm run build:web`:
//   CHROME_BIN=$PWD/docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh node docs/evidence/2026-10-18-tao-don-thiet-ke-lai/kich-ban/dua-don-mot-o-smoke.mjs
// Chưa kiểm axe-core. Mỗi bước chạy riêng; cuối cùng in "DUA DON MOT O SMOKE OK" hoặc danh sách bước đỏ (thoát 1).
import assert from "node:assert/strict";
import { ACCOUNTS, ok, setInput, sleep, startEnv, vnDate } from "../../2026-09-20-a2/kich-ban/a2-cdp.mjs";
import { cham, chonNoiMotO, dongCua, dsCua, goChu, phim } from "./cham-that.mjs";

const MOB = { width: 390, height: 844, mobile: true };
const DESK = { width: 1040, height: 900, mobile: false };
const env = await startEnv();
const loi = [];
async function buoc(id, ten, fn) {
  try {
    await fn();
    ok(`${id}) ${ten}`);
  } catch (e) {
    loi.push(`${id}) ${ten}: ${String(e?.message ?? e).split("\n")[0]}`);
    console.log(`✗ ${id}) ${ten}\n    ${String(e?.message ?? e).split("\n").slice(0, 8).join("\n    ")}`);
  }
}

const KS = "b1e5a000-7a57-4d0a-9c1e-000000000001";
const SB = "b1e5a000-7a57-4d0a-9c1e-000000000002";
const T = "'2026-10-18T00:00:00.000Z'";
env.sql(`INSERT INTO loc_location (id, code, name, location_type_code, sort_order, created_at, updated_at) VALUES
  ('${KS}', 'KS_BIEN_XANH', 'Khách sạn Biển Xanh', 'HOTEL', 20, ${T}, ${T}),
  ('${SB}', 'SB_CAM_RANH', 'Sân bay Cam Ranh', 'AIRPORT', 21, ${T}, ${T})`);
const DANH_MUC = [
  "Văn phòng Trần Phú · văn phòng", "Văn phòng 2 tháng 4 · văn phòng", "Quầy vé 01 · quầy vé", "Quầy vé 02 · quầy vé", "Quầy vé 03 · quầy vé", "Quầy vé 04 · quầy vé",
  "Bến tàu du lịch Nha Trang · bến tàu", "Bến cảng Vinpearl · bến cảng", "Khách sạn Biển Xanh · khách sạn", "Sân bay Cam Ranh · sân bay",
];
const CHI_DIA_CHI = "Chỉ ghi địa chỉ — không ghi tên, số điện thoại khách";

const THE = "document.querySelectorAll('#services .svc')";
const the = (i) => `${THE}[${i}]`;
const chang = (i, j = 0) => `${the(i)}.querySelectorAll('.dd-chang')[${j}]`;
const oNoi = (i, j, loai) => `${chang(i, j)}.querySelector('[data-o$=":${loai}"]')`;
const hien = (sel) => `(() => { const e = ${sel}; return !!e && e.getClientRects().length > 0; })()`;
const trongKhung = (sel) => `(() => { const e = ${sel}; if (!e) return false; const r = e.getBoundingClientRect(); return r.height > 0 && r.top >= 0 && r.bottom <= innerHeight; })()`;
const coTieuDiem = (sel) => `(() => { const e = ${sel}; return !!e && document.activeElement === e; })()`;
const moDs = (o) => `(() => { const ds = ${dsCua(o)}; return !!ds && !ds.hidden; })()`;
/** Các dòng của danh sách gợi ý ô `o` đang hiện: chữ, chiều cao, aria-selected. */
const dongDs = (o) => `(() => { const ds = ${dsCua(o)}; if (!ds || ds.hidden) return null; return [...ds.querySelectorAll('[role=option]')].map((x) => ({ chu: x.textContent.trim(), h: Math.round(x.getBoundingClientRect().height), chon: x.getAttribute('aria-selected') })); })()`;
const chuDs = (o) => `(${dongDs(o)} ?? []).map((d) => d.chu)`;
const VINPEARL = "ec67ff94-bb00-4546-842a-aedb5f916b0a"; // "Bến cảng Vinpearl" gieo sẵn (migrations/0010_locations.sql)
/** Chạm thật ở MÉP DƯỚI phần tử (cách đáy 4px — chỗ người dùng vẫn chạm): bố cục xê dịch giữa lúc ấn và lúc nhả thì cú nhả rơi ra ngoài phần tử và `click` không tới nó. */
async function chamDay(p, mobile, sel) {
  await p.ev(`(${sel}).scrollIntoView({ block: 'center' }); true`);
  await sleep(150);
  const { x, y } = await p.ev(`(() => { const r = (${sel}).getBoundingClientRect(); return { x: Math.round(r.left + Math.min(r.width / 2, 48)), y: Math.round(r.bottom - 4) }; })()`);
  if (mobile) {
    await p.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
    await p.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  } else {
    await p.send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y });
    await p.send("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", clickCount: 1 });
    await p.send("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", clickCount: 1 });
  }
  await sleep(250);
}

try {
  const NGAY = vnDate(4);
  for (const [kho, vp] of [["390", MOB], ["1040", DESK]]) {
    const mobile = vp.mobile;
    let p = await env.as(ACCOUNTS.salesA, "/order-form", vp);
    await p.waitFor("!!document.getElementById('catalog-q') && !document.getElementById('catalog-q').disabled", "ô tìm danh mục sẵn sàng", 15000);
    await sleep(600);
    await p.ev(setInput("document.getElementById('orderDate')", NGAY));
    const chon = async (tim, soThe) => {
      await p.ev("document.getElementById('catalog-q').focus(); true");
      await p.ev(setInput("document.getElementById('catalog-q')", tim));
      await p.waitFor("document.querySelectorAll('#catalog-list .catalog-pick').length === 1", `lọc ${tim}`);
      await p.ev("document.querySelector('#catalog-list .catalog-pick').click(); true");
      await p.waitFor(`${THE}.length === ${soThe}`, `thẻ thứ ${soThe}`);
      await sleep(250);
    };

    await buoc(`${kho}-1`, "mỗi chặng một ô Nơi đón + một ô Nơi trả; chạm ô → danh sách ngay dưới, dòng 'tên · loại' ≥ 44px, thứ tự danh mục, dòng cuối 'Gõ tự do…'", async () => {
      await chon("TD101", 1);
      await p.ev(setInput(`${the(0)}.querySelector('.counter-field[aria-label="Người lớn"]')`, "2"));
      await p.ev(`${the(0)}.querySelector('[data-action="them-dua-don"]').click(); true`);
      await p.waitFor(`!!${oNoi(0, 0, "don")}`, "chặng đưa đón");
      const cau = await p.ev(`(() => { const c = ${chang(0)}; const o = c.querySelector('[data-o$=":don"]'); const t = c.querySelector('[data-o$=":tra"]'); const cs = getComputedStyle(o);
        return { soDon: c.querySelectorAll('[data-o$=":don"]').length, soTra: c.querySelectorAll('[data-o$=":tra"]').length, tag: [o.tagName, t.tagName], type: [o.type, t.type],
          role: [o.getAttribute('role'), t.getAttribute('role')], ac: [o.getAttribute('autocomplete'), t.getAttribute('autocomplete')], ds: !!document.getElementById(o.getAttribute('aria-controls')) && !!document.getElementById(t.getAttribute('aria-controls')),
          mo: o.getAttribute('aria-expanded'), fs: cs.fontSize, h: Math.round(o.getBoundingClientRect().height),
          cu: c.querySelectorAll('.dd-luoi-noi select, [data-o$=":don-tim"], [data-o$=":tra-tim"], [data-o$=":don-chu"], [data-o$=":tra-chu"]').length,
          nhan: [...c.querySelectorAll('.dd-luoi-noi .o-noi-chu')].map((x) => x.textContent) }; })()`);
      assert.deepEqual(cau, { soDon: 1, soTra: 1, tag: ["INPUT", "INPUT"], type: ["text", "text"], role: ["combobox", "combobox"], ac: ["off", "off"], ds: true, mo: "false", fs: "16px", h: cau.h, cu: 0, nhan: ["Nơi đón", "Nơi trả"] });
      assert.ok(cau.h >= 44, `ô cao ≥ 44px (${cau.h})`);
      const conLai = await p.ev(`(() => { const c = ${the(0)}; const t = (s) => c.textContent.includes(s); return { gio: !!c.querySelector('[data-o$=":gio"]'), chuaChot: t('Chưa chốt giờ'), khacNgay: !!c.querySelector('[data-action="don-khac-ngay"]'), chieuVe: !!c.querySelector('[data-action="them-chieu-ve"]'), themChang: !!c.querySelector('[data-action="them-chang"]'), chiTiet: t('Thêm chi tiết (xe riêng, số chỗ)'), chuyen: !!c.querySelector('details.trip') }; })()`);
      assert.deepEqual(conLai, { gio: true, chuaChot: true, khacNgay: true, chieuVe: true, themChang: true, chiTiet: true, chuyen: true }, "các phần khác của chặng còn nguyên");
      await cham(p, mobile, oNoi(0, 0, "don"));
      assert.equal(await p.ev(moDs(oNoi(0, 0, "don"))), true, "chạm ô → danh sách mở");
      const ds = await p.ev(`(() => { const o = ${oNoi(0, 0, "don")}; const ds = ${dsCua(oNoi(0, 0, "don"))}; const a = o.getBoundingClientRect(), b = ds.getBoundingClientRect();
        return { mo: o.getAttribute('aria-expanded'), role: ds.getAttribute('role'), nhan: ds.getAttribute('aria-label'), duoi: Math.round(b.top - a.bottom), trai: Math.round(b.left - a.left), focus: document.activeElement === o, trongLabel: !!ds.closest('label') }; })()`);
      assert.equal(ds.mo, "true");
      assert.equal(ds.role, "listbox");
      assert.equal(ds.nhan, "Gợi ý nơi đón");
      assert.ok(ds.duoi >= 0 && ds.duoi <= 24, `danh sách NGAY dưới ô (cách ${ds.duoi}px)`);
      assert.ok(Math.abs(ds.trai) <= 2, `danh sách thẳng mép trái ô (${ds.trai}px)`);
      assert.equal(ds.focus, true, "tiêu điểm vẫn ở ô gõ");
      assert.equal(ds.trongLabel, false, "danh sách không nằm trong <label>");
      const dong = await p.ev(dongDs(oNoi(0, 0, "don")));
      assert.deepEqual(dong.map((d) => d.chu), [...DANH_MUC, "Gõ tự do…" + CHI_DIA_CHI], "thứ tự danh mục, dòng cuối Gõ tự do…");
      assert.ok(dong.every((d) => d.h >= 44), `mọi dòng ≥ 44px: ${JSON.stringify(dong.map((d) => d.h))}`);
    });

    await buoc(`${kho}-2`, "gõ 'bien xanh' → điểm khớp + 'Gõ tự do: “bien xanh”'; chạm điểm → ô hiện nhãn, danh sách đóng; nơi trả sân bay → ô số hiệu chuyến bay", async () => {
      await goChu(p, "bien xanh");
      assert.deepEqual(await p.ev(chuDs(oNoi(0, 0, "don"))), ["Khách sạn Biển Xanh · khách sạn", `Gõ tự do: “bien xanh”${CHI_DIA_CHI}`]);
      await cham(p, mobile, dongCua(oNoi(0, 0, "don"), "Khách sạn Biển Xanh"));
      await p.waitFor(`!${moDs(oNoi(0, 0, "don"))}`, "danh sách đóng sau khi chọn");
      assert.equal(await p.ev(`(${oNoi(0, 0, "don")}).value`), "Khách sạn Biển Xanh · khách sạn");
      assert.equal(await p.ev(`(${oNoi(0, 0, "don")}).getAttribute('aria-expanded')`), "false");
      // cảm ứng: bỏ tiêu điểm để bàn phím ảo không bật lại; chuột: tiêu điểm ở lại ô (đã dựng lại)
      assert.equal(await p.ev(coTieuDiem(oNoi(0, 0, "don"))), !mobile, mobile ? "chạm cảm ứng: ô không giữ tiêu điểm" : "chuột: tiêu điểm ở lại ô");
      assert.equal(await p.ev(`!!${chang(0)}.querySelector('[data-o$=":bay"]')`), false, "chưa có sân bay → chưa có ô số hiệu");
      await chonNoiMotO(p, mobile, oNoi(0, 0, "tra"), { tim: "cam ranh", dong: "Sân bay Cam Ranh" });
      assert.equal(await p.ev(`(${oNoi(0, 0, "tra")}).value`), "Sân bay Cam Ranh · sân bay");
      assert.equal(await p.ev(hien(`${chang(0)}.querySelector('[data-o$=":bay"]')`)), true, "nơi trả sân bay → ô số hiệu chuyến bay hiện");
    });

    await buoc(`${kho}-3`, "gõ tự do ở Nơi trả: 'Chưa chốt' đầu, 'Gõ tự do: “…”' cuối kèm câu nhắc; chạm → chữ trong ô + câu nhắc dưới ô; 'Gõ tự do…' khi chưa gõ không lưu; 'Chưa chốt' trả về trống", async () => {
      const tra = oNoi(0, 0, "tra");
      await cham(p, mobile, tra);
      assert.equal(await p.ev(`(${tra}).value`), "", "mở ô đang là điểm danh mục: ô trống để gõ tìm");
      assert.equal(await p.ev(`(${tra}).placeholder`), "Sân bay Cam Ranh · sân bay", "điểm đang chọn thành chữ mờ");
      assert.equal((await p.ev(chuDs(tra)))[0], "Chưa chốt", "ô Nơi trả đang có giá trị → dòng 'Chưa chốt' đầu danh sách");
      await goChu(p, "Cảng Cầu Đá");
      assert.deepEqual(await p.ev(chuDs(tra)), ["Chưa chốt", `Gõ tự do: “Cảng Cầu Đá”${CHI_DIA_CHI}`]);
      await cham(p, mobile, dongCua(tra, "Gõ tự do: "));
      await p.waitFor(`!${moDs(tra)}`, "danh sách đóng");
      assert.equal(await p.ev(`(${tra}).value`), "Cảng Cầu Đá", "ô hiện đúng chữ tự do");
      assert.equal(await p.ev(`[...${chang(0)}.querySelectorAll('.dd-cot')[1].querySelectorAll('.hint')].map((x) => x.textContent).includes(${JSON.stringify(CHI_DIA_CHI)})`), true, "câu nhắc chỉ ghi địa chỉ dưới ô");
      assert.equal(await p.ev(`(${tra}).getAttribute('aria-describedby')?.split(' ').some((id) => document.getElementById(id)?.textContent === ${JSON.stringify(CHI_DIA_CHI)})`), true, "câu nhắc gắn vào ô bằng aria-describedby");
      assert.equal(await p.ev(`!!${chang(0)}.querySelector('[data-o$=":bay"]')`), false, "không còn sân bay → ô số hiệu biến mất");
      // "Chưa chốt": ô về trống
      await chonNoiMotO(p, mobile, tra, { dong: "Chưa chốt" });
      assert.equal(await p.ev(`(${tra}).value`), "", "Chưa chốt → ô trống");
      // "Gõ tự do…" khi chưa gõ gì: không lưu, ô vẫn mở và giữ tiêu điểm, chữ mờ nhắc gõ địa chỉ
      await cham(p, mobile, tra);
      assert.equal(await p.ev(`${chuDs(tra)}[0]`), DANH_MUC[0], "ô trống → không có dòng 'Chưa chốt'");
      await cham(p, mobile, dongCua(tra, "Gõ tự do…"));
      assert.equal(await p.ev(moDs(tra)), true, "danh sách vẫn mở");
      assert.equal(await p.ev(coTieuDiem(tra)), true, "tiêu điểm ở ô để gõ địa chỉ");
      assert.equal(await p.ev(`(${tra}).placeholder`), "Số nhà, đường, phường…");
      await goChu(p, "Cảng Cầu Đá");
      await cham(p, mobile, dongCua(tra, "Gõ tự do: "));
      await p.waitFor(`!${moDs(tra)}`, "danh sách đóng");
      assert.equal(await p.ev(`(${tra}).value`), "Cảng Cầu Đá");
    });

    await buoc(`${kho}-4`, "bàn phím + rời ô: tiêu điểm không mở; ↓ ↑ vòng, Enter chọn; Esc huỷ; gõ rồi chạm ra ngoài / Enter chưa trỏ dòng / Tab → GIỮ chữ thành gõ tự do; chạm nhãn không đóng; chạm ô trả / '+ Thêm chiều về' không bị nuốt; Enter không gửi form", async () => {
      const don = oNoi(0, 0, "don");
      // Đếm lần form đơn bị GỬI (Enter trong ô gõ của <form> gửi ngầm form qua nút Lưu mặc định — dù dải lỗi chặn lại thì vẫn là gửi nhầm).
      await p.ev("window.__guiForm = 0; document.getElementById('order-form').addEventListener('submit', () => { window.__guiForm++; }, true); true");
      const soGui = () => p.ev("window.__guiForm");
      await p.ev(`(${don}).scrollIntoView({ block: 'center' }); (${don}).focus(); true`);
      assert.equal(await p.ev(moDs(don)), false, "chỉ nhận tiêu điểm: danh sách không mở");
      await phim(p, "Enter");
      assert.equal(await soGui(), 0, "Enter ở ô đóng không gửi form");
      await phim(p, "ArrowDown");
      assert.equal(await p.ev(moDs(don)), true, "↓ mở danh sách");
      assert.equal(await p.ev(`(${don}).getAttribute('aria-activedescendant')`), null, "vừa mở: chưa trỏ dòng nào");
      await phim(p, "ArrowDown");
      const tro = () => p.ev(`(() => { const o = ${don}; const id = o.getAttribute('aria-activedescendant'); const x = id && document.getElementById(id); return x ? [x.textContent.trim(), x.getAttribute('aria-selected'), x.getAttribute('role')] : null; })()`);
      assert.deepEqual(await tro(), [DANH_MUC[0], "true", "option"], "↓ trỏ dòng đầu (aria-activedescendant + aria-selected)");
      await phim(p, "ArrowUp");
      assert.deepEqual(await tro(), ["Gõ tự do…" + CHI_DIA_CHI, "true", "option"], "↑ ở dòng đầu vòng về dòng cuối");
      await phim(p, "ArrowDown");
      assert.deepEqual((await tro())[0], DANH_MUC[0], "↓ ở dòng cuối vòng về dòng đầu");
      await goChu(p, "quay ve 03");
      assert.equal(await p.ev(`(${don}).getAttribute('aria-activedescendant')`), null, "gõ chữ: bỏ trỏ cũ");
      await phim(p, "ArrowDown");
      assert.deepEqual((await tro())[0], "Quầy vé 03 · quầy vé");
      await phim(p, "Enter");
      assert.equal(await p.ev(moDs(don)), false, "Enter chọn → danh sách đóng");
      assert.equal(await p.ev(`(${don}).value`), "Quầy vé 03 · quầy vé", "Enter chọn đúng dòng đang trỏ");
      assert.equal(await p.ev(coTieuDiem(don)), true, "bàn phím: tiêu điểm ở lại ô sau khi chọn");
      assert.equal(await soGui(), 0, "Enter chọn dòng không gửi form");
      // Esc: HUỶ có chủ đích — chữ gõ dở không được lưu
      await phim(p, "ArrowDown");
      await goChu(p, "abc");
      await phim(p, "Escape");
      assert.equal(await p.ev(moDs(don)), false, "Esc đóng");
      assert.equal(await p.ev(`(${don}).value`), "Quầy vé 03 · quầy vé", "Esc trả ô về giá trị đã chọn");
      /** Ô đang là chữ gõ tự do ĐÃ LƯU vào bản nháp: sau khi khối dựng lại, câu nhắc "chỉ ghi địa chỉ" gắn vào ô (chỉ có khi giá trị là gõ tự do). */
      const laTuDo = (o) => p.ev(`(${o}).getAttribute('aria-describedby')?.split(' ').some((id) => document.getElementById(id)?.textContent === ${JSON.stringify(CHI_DIA_CHI)}) ?? false`);
      // chạm nhãn của ô khi đang gõ: không đóng, không mất chữ
      await cham(p, mobile, don);
      await goChu(p, "Bến Cá");
      await cham(p, mobile, `(${don}).closest('label').querySelector('.o-noi-chu')`, false);
      assert.equal(await p.ev(moDs(don)), true, "chạm nhãn của ô: danh sách vẫn mở");
      assert.equal(await p.ev(`(${don}).value`), "Bến Cá", "chạm nhãn của ô: chữ đang gõ còn nguyên");
      // chạm ra ngoài sau khi gõ: GIỮ chữ thành gõ tự do (không trả về điểm cũ)
      await cham(p, mobile, `${chang(0)}.querySelector('.dd-chang-so')`);
      await sleep(200);
      assert.equal(await p.ev(moDs(don)), false, "chạm ra ngoài → đóng");
      assert.equal(await p.ev(`(${don}).value`), "Bến Cá", "chạm ra ngoài sau khi gõ → chữ được giữ");
      assert.equal(await laTuDo(don), true, "chữ được lưu thành gõ tự do (câu nhắc chỉ ghi địa chỉ gắn vào ô)");
      // Enter khi chưa trỏ dòng nào: GIỮ chữ
      await cham(p, mobile, don);
      assert.equal(await p.ev(`(${don}).value`), "Bến Cá", "mở ô đang là chữ tự do: giữ chữ để sửa");
      await p.ev(`(${don}).select(); true`);
      await goChu(p, "Bến Cá Hòn Chồng");
      assert.equal(await p.ev(`(${don}).getAttribute('aria-activedescendant')`), null, "chưa trỏ dòng nào");
      await phim(p, "Enter");
      await sleep(150);
      assert.equal(await p.ev(moDs(don)), false, "Enter (chưa trỏ dòng) → đóng");
      assert.equal(await p.ev(`(${don}).value`), "Bến Cá Hòn Chồng", "Enter (chưa trỏ dòng) → chữ được giữ");
      assert.equal(await p.ev(coTieuDiem(don)), true, "Enter: tiêu điểm ở lại ô");
      assert.equal(await soGui(), 0, "Enter giữ chữ không gửi form");
      // Tab sau khi gõ: GIỮ chữ, tiêu điểm sang ô Nơi trả
      await phim(p, "ArrowDown");
      await p.ev(`(${don}).select(); true`);
      await goChu(p, "Hòn Chồng, Nha Trang");
      await phim(p, "Tab");
      await sleep(150);
      assert.equal(await p.ev(`(${don}).value`), "Hòn Chồng, Nha Trang", "Tab sau khi gõ → chữ được giữ");
      assert.equal(await p.ev(coTieuDiem(oNoi(0, 0, "tra"))), true, "Tab → tiêu điểm sang ô Nơi trả");
      assert.equal(await p.ev(moDs(oNoi(0, 0, "tra"))), false, "Tab tới ô: danh sách ô trả không tự bật");
      // gõ ở Nơi đón rồi CHẠM ô Nơi trả (cùng chặng): chữ ở lại ô đón; ô trả nhận tiêu điểm và mở danh sách
      await cham(p, mobile, don);
      await p.ev(`(${don}).select(); true`);
      await goChu(p, "Bãi Tiên, Nha Trang");
      await cham(p, mobile, oNoi(0, 0, "tra"));
      assert.equal(await p.ev(`(${don}).value`), "Bãi Tiên, Nha Trang", "chạm ô Nơi trả → chữ ô đón được giữ");
      assert.equal(await p.ev(coTieuDiem(oNoi(0, 0, "tra"))), true, "cú chạm ô Nơi trả không bị nuốt: tiêu điểm ở ô trả");
      assert.equal(await p.ev(moDs(oNoi(0, 0, "tra"))), true, "cú chạm ô Nơi trả không bị nuốt: danh sách ô trả mở");
      await phim(p, "Escape");
      assert.equal(await p.ev(`(${oNoi(0, 0, "tra")}).value`), "Cảng Cầu Đá", "Esc ở ô trả: giữ giá trị cũ");
      // gõ ở Nơi đón rồi CHẠM "+ Thêm chiều về": chiều về được tạo, Nơi trả chiều về = chữ vừa gõ (khối dựng lại không nuốt cú chạm)
      await cham(p, mobile, don);
      await p.ev(`(${don}).select(); true`);
      await goChu(p, "Bãi Dương, Nha Trang");
      await cham(p, mobile, `${the(0)}.querySelector('[data-action="them-chieu-ve"]')`);
      await sleep(150);
      assert.equal(await p.ev(`${THE}.length`), 1, `vẫn ở form, một thẻ (đang ở ${await p.ev("location.pathname + location.search")}, gửi form ${await p.ev("window.__guiForm ?? 'mất đếm'")} lần)`);
      assert.equal(await p.ev(`${the(0)}.querySelectorAll('.dd-chang').length`), 2, "cú chạm '+ Thêm chiều về' không bị nuốt: có chiều về");
      assert.equal(await p.ev(`(${don}).value`), "Bãi Dương, Nha Trang", "chữ ô đón được giữ");
      assert.equal(await p.ev(`(${oNoi(0, 1, "tra")}).value`), "Bãi Dương, Nha Trang", "Nơi trả chiều về = chữ vừa gõ ở Nơi đón chiều đi");
      // bỏ chiều về vừa thêm (trả trạng thái cho các bước sau). Chiều về đủ nơi đón nên hiện GỌN một dòng: chạm dòng tóm tắt để mở rồi mới chạm "Bỏ chặng".
      const ttVe = `${chang(0, 1)}.closest('.dd-chang-khung').querySelector('.dd-tom-tat')`;
      if (await p.ev(hien(ttVe))) await cham(p, mobile, ttVe);
      assert.equal(await p.ev(hien(`${chang(0, 1)}.querySelector('[data-action="bo-chang"]')`)), true, "nút 'Bỏ lượt' của chiều về đang hiện");
      await cham(p, mobile, `${chang(0, 1)}.querySelector('[data-action="bo-chang"]')`);
      assert.equal(await p.ev(`${the(0)}.querySelectorAll('.dd-chang').length`), 1, "bỏ chiều về");
      assert.equal(await soGui(), 0, "không lần gửi form nào trong lúc thao tác");
      // trả về điểm cho các bước sau (ô đang là chữ tự do: mở ra vẫn giữ chữ → chọn hết rồi gõ tìm)
      await chonNoiMotO(p, mobile, don, { tim: "bien xanh", dong: "Khách sạn Biển Xanh", xoaTruoc: true });
      assert.equal(await p.ev(`(${don}).value`), "Khách sạn Biển Xanh · khách sạn");
      await p.ev(setInput(`${chang(0)}.querySelector('[data-o$=":gio"]')`, "07:30"));
    });

    await buoc(`${kho}-5`, `chạm Lưu khi chặng thiếu nơi đón: câu lỗi dưới ô, ô đỏ, trong khung nhìn, danh sách không tự bật; tiêu điểm ${mobile ? "ở đầu chặng (cảm ứng: không ô gõ nào)" : "ở ô"}`, async () => {
      await chon("TTB06", 2);
      await p.ev(setInput(`${the(1)}.querySelector('.counter-field[aria-label="Người lớn"]')`, "2"));
      await p.ev(`${the(1)}.querySelector('[data-action="them-dua-don"]').click(); true`);
      await p.waitFor(`!!${oNoi(1, 0, "don")}`, "chặng TTB06");
      await p.ev(setInput("document.getElementById('customerName')", "Khách Một Ô"));
      await p.ev(setInput("document.getElementById('customerPhone')", "0912345684"));
      // Luật 14/10 của màn Tạo đơn: điện thoại chỉ cuộn + đặt tiêu điểm vào ô lỗi khi ô đó nằm trong khối GẬP vừa mở (ô đang thấy thì cuộn tới dải lỗi). Gập thẻ TTB06 (chạm đầu
      // thẻ TD101) để cả hai khổ đi đúng nhánh "ô lỗi nằm trong khối gập" — nhánh mà ô một ô phải nhận tiêu điểm.
      await cham(p, mobile, `${the(0)}.querySelector('.svc-mo')`);
      assert.deepEqual(await p.ev(`[...${THE}].map((c) => c.querySelector('.svc-mo').getAttribute('aria-expanded'))`), ["true", "false"], "ĐẦU: thẻ TTB06 (thiếu nơi đón) đang gập");
      await p.ev("window.scrollTo(0, 0); true");
      await cham(p, mobile, "document.getElementById('save')"); // chạm THẬT (cảm ứng ở 390): nhánh "Lưu bằng chạm" của M-1
      await p.waitFor("!document.getElementById('save-error').hidden", "banner lỗi lưu");
      await sleep(400);
      const don = oNoi(1, 0, "don");
      const dangO = await p.ev("document.activeElement?.outerHTML.slice(0, 90) ?? null");
      if (mobile) {
        // Vòng sửa 1 (M-1): Lưu bằng chạm — tiêu điểm ở ĐẦU chặng lỗi (không phải ô gõ: bàn phím ảo iPhone không bật), ô lỗi vẫn được cuộn vào khung nhìn.
        assert.equal(await p.ev(coTieuDiem(`${chang(1)}.querySelector('.dd-chang-dau')`)), true, `cảm ứng: tiêu điểm ở đầu chặng lỗi (đang ở: ${dangO})`);
        assert.equal(await p.ev("['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)"), false, "cảm ứng: tiêu điểm không ở ô gõ nào");
      } else assert.equal(await p.ev(coTieuDiem(don)), true, `chuột: tiêu điểm ở ô Nơi đón của chặng lỗi (đang ở: ${dangO})`);
      assert.equal(await p.ev(`(${don}).getAttribute('aria-invalid')`), "true", "ô đỏ");
      assert.equal(await p.ev(trongKhung(don)), true, "ô trong khung nhìn");
      assert.equal(await p.ev(moDs(don)), false, "tiêu điểm do Lưu đặt: danh sách không tự bật");
      const loiId = await p.ev(`(${don}).getAttribute('aria-describedby')?.split(' ').find((id) => document.getElementById(id)?.classList.contains('field-error'))`);
      assert.ok(loiId, "câu lỗi gắn vào ô bằng aria-describedby");
      assert.equal(await p.ev(`document.getElementById(${JSON.stringify(loiId)}).textContent.trim()`), "Lượt 1: chưa có nơi đón.");
      assert.equal(await p.ev(hien(`document.getElementById(${JSON.stringify(loiId)})`)), true, "câu lỗi đang hiện");
    });

    // Vòng sửa 2 (Minor d): rời ô nơi sau khi gõ thì câu lỗi "chưa có nơi đón" dưới ô chỉ ẩn SAU cú chạm — ẩn ngay lúc ấn thì ô Nơi trả bên dưới (390: một cột) dời lên và cú nhả
    // ở mép dưới ô rơi ra ngoài.
    await buoc(`${kho}-5c`, "sau lần Lưu báo lỗi: gõ ở Nơi đón rồi chạm MÉP DƯỚI ô Nơi trả → cú chạm không bị nuốt (tiêu điểm ở ô trả, danh sách mở); câu lỗi ẩn sau đó", async () => {
      const don = oNoi(1, 0, "don");
      const tra = oNoi(1, 0, "tra");
      assert.equal(await p.ev(`(${don}).getAttribute('aria-invalid')`), "true", "ĐẦU: ô Nơi đón đang báo lỗi (câu lỗi hiện dưới ô)");
      await cham(p, mobile, don);
      await p.waitFor(moDs(don), "danh sách ô Nơi đón mở");
      await goChu(p, "15 Trần Phú, Nha Trang");
      await chamDay(p, mobile, tra);
      await sleep(200);
      assert.equal(await p.ev(`(${don}).value`), "15 Trần Phú, Nha Trang", "chữ ô đón được giữ");
      assert.equal(await p.ev(coTieuDiem(tra)), true, `cú chạm mép dưới ô Nơi trả không bị nuốt: tiêu điểm ở ô trả (đang ở: ${await p.ev("document.activeElement?.outerHTML.slice(0, 90) ?? null")})`);
      assert.equal(await p.ev(moDs(tra)), true, "cú chạm mép dưới ô Nơi trả không bị nuốt: danh sách ô trả mở");
      await phim(p, "Escape");
      assert.equal(await p.ev(`(${don}).getAttribute('aria-invalid')`), "false", "đã có nơi đón → hết báo lỗi");
    });

    let idDon = null;
    await buoc(`${kho}-6`, `lưu thật, mở lại: chặng đủ gập một dòng; chạm dòng → chặng mở, ô Nơi đón trong khung nhìn, danh sách không bật; tiêu điểm ${mobile ? "ở đầu chặng (cảm ứng)" : "ở ô Nơi đón"}`, async () => {
      await chonNoiMotO(p, mobile, oNoi(1, 0, "don"), { tim: "15 Trần Phú, Nha Trang", dong: "Gõ tự do: ", xoaTruoc: true }); // 5c đã gõ chữ này (ô chữ tự do: chọn hết rồi gõ lại)
      await cham(p, mobile, "document.getElementById('save')");
      await p.waitFor("location.pathname === '/order' && !!new URLSearchParams(location.search).get('id')", "lưu xong", 15000);
      idDon = await p.ev("new URLSearchParams(location.search).get('id')");
      await p.send("Page.navigate", { url: `${env.base}/order-form?id=${idDon}` });
      await p.waitFor(`location.pathname === '/order-form' && ${THE}.length === 2`, "form sửa dựng xong", 15000);
      await sleep(600);
      await cham(p, mobile, `${the(0)}.querySelector('.svc-mo')`);
      const tt = `${chang(0)}.closest('.dd-chang-khung').querySelector('.dd-tom-tat')`;
      assert.equal(await p.ev(hien(tt)), true, "chặng đủ: dòng tóm tắt");
      assert.equal(await p.ev(hien(oNoi(0, 0, "don"))), false, "chặng gọn: ô ẩn");
      assert.equal(await p.ev(`(${tt}).textContent.trim()`), `Chiều đi · Đón 07:30 · Khách sạn Biển Xanh → Cảng Cầu Đá`);
      await cham(p, mobile, tt);
      assert.equal(await p.ev(hien(oNoi(0, 0, "don"))), true, "chạm dòng → chặng mở");
      assert.equal(await p.ev(trongKhung(oNoi(0, 0, "don"))), true, "ô Nơi đón trong khung nhìn");
      if (mobile) {
        // Vòng sửa 1 (M-1): chạm bằng cảm ứng → tiêu điểm ở đầu chặng, không ở ô gõ (bàn phím ảo không bật)
        assert.equal(await p.ev(coTieuDiem(`${chang(0)}.querySelector('.dd-chang-dau')`)), true, `cảm ứng: tiêu điểm ở đầu chặng (đang ở: ${await p.ev("document.activeElement?.outerHTML.slice(0, 90) ?? null")})`);
        assert.equal(await p.ev("['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)"), false, "cảm ứng: tiêu điểm không ở ô gõ nào");
      } else assert.equal(await p.ev(coTieuDiem(oNoi(0, 0, "don"))), true, "chuột: tiêu điểm ở ô Nơi đón");
      assert.equal(await p.ev(moDs(oNoi(0, 0, "don"))), false, "danh sách không tự bật");
      assert.equal(await p.ev(`(${oNoi(0, 0, "don")}).value`), "Khách sạn Biển Xanh · khách sạn");
      assert.equal(await p.ev(`(${oNoi(0, 0, "tra")}).value`), "Cảng Cầu Đá");
    });

    await buoc(`${kho}-7`, "'Đón khác ngày': ô Ngày đón ẩn tới khi chạm; chạm → hiện và nhận tiêu điểm", async () => {
      const ngay = `${chang(0)}.querySelector('[data-o$=":ngay"]')`;
      assert.equal(await p.ev(hien(ngay)), false, "Ngày đón ẩn");
      await cham(p, mobile, `${chang(0)}.querySelector('[data-action="don-khac-ngay"]')`);
      assert.equal(await p.ev(hien(ngay)), true, "Ngày đón hiện");
      assert.equal(await p.ev(coTieuDiem(ngay)), true, "tiêu điểm ở ô Ngày đón");
    });

    await buoc(`${kho}-8`, "không tràn ngang; không lỗi console", async () => {
      assert.ok(await p.ev("document.documentElement.scrollWidth <= innerWidth + 1"), "không tràn ngang");
      assert.deepEqual(p.consoleErrors.filter((e) => !/favicon/.test(e)), []);
    });

    // ---- 9) Vòng sửa 2 (người kiểm lại — I-1 còn mở): gõ ở ô nơi rồi chạm NGAY ô Giờ đón / Ngày đón. Lần dựng lại khối đã hẹn từng gỡ đúng ô ngày / giờ vừa nhận cú chạm: bộ chọn
    // của máy gắn với ô cũ bị đóng (cú chạm mất), hoặc ghi vào ô đã gỡ trong khi ô mới hiện trống. Chrome không đầu không có bộ chọn bật lên: kịch bản ghi giá trị vào ĐÚNG phần tử đã
    // nhận cú chạm (`window.__dich`) như bộ chọn sẽ làm — hành vi bộ chọn thật trên Android / iPhone vẫn CHƯA KIỂM, chủ cần thử trên điện thoại. Tiếp nối bước 6–8: form sửa đơn,
    // thẻ TD101 mở, chặng chiều đi mở, ô Ngày đón chiều đi đang hiện (bước 7).
    const gio = (j) => `${chang(0, j)}.querySelector('[data-o$=":gio"]')`;
    const ngay = (j) => `${chang(0, j)}.querySelector('[data-o$=":ngay"]')`;
    const gioMo = (j) => `${chang(0, j)}.querySelector('.dd-gio-mo')`;
    const traDi = oNoi(0, 0, "tra");
    const D1 = vnDate(5);
    const D2 = vnDate(6);
    const dangO = () => p.ev("document.activeElement?.outerHTML.slice(0, 90) ?? null");
    /** Gõ `chu` vào ô Nơi trả chiều đi (chọn hết chữ cũ), giữ phần tử `dich` vào `window.__dich`, rồi chạm THẬT `nut` (mặc định chính `dich`) ngay — không chạm dòng gợi ý nào. */
    const goRoiCham = async (chu, dich, nut = dich) => {
      await cham(p, mobile, traDi);
      await p.waitFor(moDs(traDi), "danh sách ô Nơi trả chiều đi mở");
      await p.ev(`(${traDi}).select(); true`);
      await goChu(p, chu);
      await p.ev(`window.__dich = ${dich}; true`);
      await cham(p, mobile, nut);
      await sleep(300); // các lượt hẹn sau cú chạm đã chạy xong
    };
    const kiemGiu = async (dich, ten) => {
      const r = await p.ev(`(() => { const d = window.__dich; return { cung: (${dich}) === d, conTrenTrang: d.isConnected, tieuDiem: document.activeElement === d }; })()`);
      assert.deepEqual(r, { cung: true, conTrenTrang: true, tieuDiem: true }, `${ten}: ô vừa chạm KHÔNG bị thay — cùng phần tử, còn trên trang, giữ tiêu điểm (đang ở: ${await dangO()})`);
    };
    /** Như bộ chọn ngày / giờ của máy: ghi giá trị vào ĐÚNG phần tử đã nhận cú chạm, bắn input + change. */
    const chonNhuMay = (gt) =>
      p.ev(`(() => { const d = window.__dich; d.value = ${JSON.stringify(gt)}; d.dispatchEvent(new Event('input', { bubbles: true })); d.dispatchEvent(new Event('change', { bubbles: true })); return d.value; })()`);
    const oGio = (j) => p.ev(`({ gt: (${gio(j)}).value, mo: (${gioMo(j)}).hidden })`);

    await buoc(`${kho}-9a`, "gõ Nơi trả rồi chạm NGAY ô Giờ đón cùng chặng: ô giờ không bị thay; giờ chọn hiện trong ô", async () => {
      await goRoiCham("Bến Cá, Nha Trang", gio(0));
      await kiemGiu(gio(0), "Giờ đón chiều đi");
      assert.equal(await p.ev(`(${traDi}).value`), "Bến Cá, Nha Trang", "chữ ô Nơi trả được giữ");
      await chonNhuMay("09:45");
      await sleep(150);
      assert.deepEqual(await oGio(0), { gt: "09:45", mo: true }, "ô giờ đang thấy hiện đúng giờ vừa chọn; chữ mờ ẩn");
    });

    await buoc(`${kho}-9b`, "gõ Nơi trả rồi chạm NGAY ô Ngày đón cùng chặng: ô ngày không bị thay; ngày chọn hiện trong ô", async () => {
      assert.equal(await p.ev(hien(ngay(0))), true, "ĐẦU: ô Ngày đón chiều đi đang hiện (bước 7)");
      await goRoiCham("Bến Cá Hòn Chồng", ngay(0));
      await kiemGiu(ngay(0), "Ngày đón chiều đi");
      await chonNhuMay(D1);
      await sleep(150);
      assert.equal(await p.ev(`(${ngay(0)}).value`), D1, "ô ngày đang thấy hiện đúng ngày vừa chọn");
    });

    // 9c — Minor c của vòng sửa 2: kiểu ấn của dòng tóm tắt chặng (và nút Lưu — cùng một hàm `nhoChamKichHoat`) nhớ từ `pointerdown`; cú chạm bị HUỶ (pointercancel: vuốt cuộn, kéo
    // ra ngoài) hay một lần bấm phím sau đó phải xoá nó — nếu không, lần mở bằng BÀN PHÍM kế tiếp đặt tiêu điểm vào đầu chặng thay vì ô Nơi đón.
    await buoc(`${kho}-9c`, `thêm chiều về (gọn một dòng)${mobile ? "; chạm dòng tóm tắt rồi HUỶ cú chạm (pointercancel), sau đó mở bằng BÀN PHÍM → tiêu điểm vào ô Nơi đón, không phải đầu chặng" : ""}`, async () => {
      await cham(p, mobile, `${the(0)}.querySelector('[data-action="them-chieu-ve"]')`);
      await p.waitFor(`${the(0)}.querySelectorAll('.dd-chang').length === 2`, "có chiều về");
      const ttVe = `${chang(0, 1)}.closest('.dd-chang-khung').querySelector('.dd-tom-tat')`;
      assert.equal(await p.ev(hien(ttVe)), true, "ĐẦU: chiều về (đủ nơi đón) hiện gọn một dòng");
      if (!mobile) await cham(p, mobile, ttVe);
      else {
        await p.ev(`(${ttVe}).scrollIntoView({ block: 'center' }); true`);
        await sleep(150);
        const { x, y } = await p.ev(`(() => { const r = (${ttVe}).getBoundingClientRect(); return { x: Math.round(r.left + Math.min(r.width / 2, 48)), y: Math.round(r.top + Math.min(r.height / 2, 20)) }; })()`);
        await p.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
        await p.send("Input.dispatchTouchEvent", { type: "touchCancel", touchPoints: [] });
        await sleep(150);
        assert.equal(await p.ev(hien(ttVe)), true, "cú chạm bị huỷ: chặng vẫn gọn");
        await p.ev(`(${ttVe}).focus(); true`);
        await phim(p, "Enter");
        await sleep(200);
        assert.equal(await p.ev(coTieuDiem(oNoi(0, 1, "don"))), true, `mở bằng bàn phím: tiêu điểm ở ô Nơi đón chiều về (đang ở: ${await dangO()})`);
      }
      assert.equal(await p.ev(hien(gio(1))), true, "chiều về mở: ô Giờ đón hiện");
    });

    await buoc(`${kho}-9d`, "gõ Nơi trả chiều đi rồi chạm NGAY ô Giờ đón CHIỀU VỀ: ô giờ không bị thay; giờ chọn hiện, chữ mờ 'Chưa chốt giờ' ẩn; Nơi đón chiều về theo chữ vừa gõ", async () => {
      assert.deepEqual(await oGio(1), { gt: "", mo: false }, "ĐẦU: chiều về chưa chốt giờ (chữ mờ hiện)");
      await goRoiCham("Cảng Cầu Đá, Nha Trang", gio(1));
      await kiemGiu(gio(1), "Giờ đón chiều về");
      await chonNhuMay("18:15");
      await sleep(150);
      assert.deepEqual(await oGio(1), { gt: "18:15", mo: true }, "ô giờ chiều về hiện đúng giờ vừa chọn; chữ mờ ẩn");
      assert.equal(await p.ev(`(${oNoi(0, 1, "don")}).value`), "Cảng Cầu Đá, Nha Trang", "Nơi đón chiều về theo chữ vừa gõ ở Nơi trả chiều đi");
    });

    if (!mobile) await buoc(`${kho}-9e`, "bàn phím: còn lần dựng lại đang hẹn, Tab rời ô Giờ đón chiều về sang nút 'Đón khác ngày' (nút không có khoá trả tiêu điểm) → tiêu điểm ở lại nút, không rơi về trang", async () => {
      await goRoiCham("Cảng Cầu Đá 2, Nha Trang", gio(1));
      assert.equal(await p.ev(coTieuDiem(gio(1))), true, `ĐẦU: tiêu điểm ở ô Giờ đón chiều về (đang ở: ${await dangO()})`);
      for (let k = 0; k < 6 && (await p.ev(coTieuDiem(gio(1)))); k++) await phim(p, "Tab"); // ô giờ của Chrome: Tab đi qua từng phần (giờ, phút, SA/CH) rồi mới rời ô
      await sleep(300);
      const r = await p.ev(`(() => { const a = document.activeElement; return { the: a?.tagName ?? null, conTrenTrang: !!a?.isConnected, action: a?.getAttribute('data-action') ?? null, trongChangVe: !!a && (${chang(0, 1)}).contains(a) }; })()`);
      assert.deepEqual(r, { the: "BUTTON", conTrenTrang: true, action: "don-khac-ngay", trongChangVe: true }, `tiêu điểm ở nút 'Đón khác ngày' chiều về, còn trên trang (đang ở: ${await dangO()})`);
    });

    await buoc(`${kho}-9f`, "gõ Nơi trả chiều đi rồi chạm NGAY 'Đón khác ngày' CHIỀU VỀ: ô Ngày đón hiện, nhận tiêu điểm và không bị thay; ngày chọn hiện trong ô", async () => {
      assert.equal(await p.ev(hien(ngay(1))), false, "ĐẦU: ô Ngày đón chiều về đang ẩn");
      await goRoiCham("Hòn Chồng, Nha Trang", ngay(1), `${chang(0, 1)}.querySelector('[data-action="don-khac-ngay"]')`);
      assert.equal(await p.ev(hien(ngay(1))), true, "ô Ngày đón chiều về hiện");
      await kiemGiu(ngay(1), "Ngày đón chiều về (vừa hiện)");
      await chonNhuMay(D2);
      await sleep(150);
      assert.equal(await p.ev(`(${ngay(1)}).value`), D2, "ô ngày chiều về hiện đúng ngày vừa chọn");
    });

    await buoc(`${kho}-9g`, "ô Giờ đón bị gỡ khi khối dựng lại (chọn dòng gợi ý) mà vẫn nhận giá trị: giờ vào bản nháp VÀ ô giờ mới hiện đúng giờ đó, chữ mờ khớp (khối luôn đồng bộ ô giờ với bản nháp)", async () => {
      await p.ev(`window.__dich = ${gio(1)}; true`);
      await chonNoiMotO(p, mobile, oNoi(0, 1, "tra"), { tim: "vinpearl", dong: "Bến cảng Vinpearl" });
      assert.equal(await p.ev("window.__dich.isConnected"), false, "ĐẦU: chọn dòng gợi ý → khối dựng lại, ô giờ cũ đã bị gỡ");
      await chonNhuMay("19:05");
      await sleep(150);
      assert.deepEqual(await oGio(1), { gt: "19:05", mo: true }, "ô giờ mới hiện giờ đã vào bản nháp; chữ mờ ẩn");
    });

    await buoc(`${kho}-9h`, "chạm Lưu: thân PUT mang đúng ngày / giờ / nơi đã chọn ở cả hai chặng; không lỗi console", async () => {
      const truoc = p.requests.length;
      await cham(p, mobile, "document.getElementById('save')");
      await p.waitFor("location.pathname === '/order'", "lưu xong", 15000);
      const than = p.requests.slice(truoc).filter((r) => r.method === "PUT" && /^\/api\/orders\/[^/]+$/.test(new URL(r.url).pathname)).map((r) => r.postData).at(-1);
      assert.ok(than, "có thân PUT");
      const legs = JSON.parse(than).services[0].legs;
      const K = ["direction", "pickupDate", "pickupTime", "pickupLocationId", "pickupPlace", "dropoffLocationId", "dropoffPlace"];
      const lay = (l) => Object.fromEntries(K.map((k) => [k, l?.[k]]));
      assert.equal(legs.length, 2, "hai chặng");
      assert.deepEqual(lay(legs[0]), { direction: "OUT", pickupDate: D1, pickupTime: "09:45", pickupLocationId: KS, pickupPlace: "", dropoffLocationId: null, dropoffPlace: "Hòn Chồng, Nha Trang" }, "chặng chiều đi");
      assert.deepEqual(lay(legs[1]), { direction: "RETURN", pickupDate: D2, pickupTime: "19:05", pickupLocationId: null, pickupPlace: "Hòn Chồng, Nha Trang", dropoffLocationId: VINPEARL, dropoffPlace: "" }, "chặng chiều về");
      assert.deepEqual(p.consoleErrors.filter((e) => !/favicon/.test(e)), []);
    });
    p.close();
  }
} finally {
  await env.stop();
}
if (loi.length) {
  console.log(`\nDUA DON MOT O SMOKE ĐỎ (${loi.length} bước):\n- ${loi.join("\n- ")}`);
  process.exit(1);
}
console.log("DUA DON MOT O SMOKE OK");
