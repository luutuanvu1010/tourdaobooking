// Kịch bản Chrome — màn «Luật bán» (ADR-0146 Đ5; ADR-0152 Đ2 kiểu «Theo đặc điểm», trang ghép 3b; kế hoạch 2026-10-30 R-1, T11, mục 8.1).
// Rào DUY NHẤT cho phần GIAO DIỆN của trang: `npm test` canh luật thuần (src/shared/luat-ban-hien-thi.ts) và máy chủ, nhưng không bài nào mở trang.
// Mỗi bước chạy ở 390 và 1040. Mỗi bước có trang: không tràn ngang, vùng chạm ≥ 44px, ô gõ ≥ 16px, không chữ Anh / mã thô, axe (critical / serious ⇒ đỏ), ảnh.
// Thứ tự tài khoản (kho cookie dùng chung): Kế toán → Quản trị → Bán hàng (mở sau cùng). Dữ liệu dựng bằng API TRƯỚC khi mở trang (ADR-0075).
// Bước:
//   1  Kế toán: không có lối vào «Luật bán»; mở thẳng /luat-ban ⇒ trạng thái 403 bằng câu tiếng Việt; máy chủ 403.
//   2  Quản trị: có lối vào; ba thẻ «Đang áp dụng / Sắp áp dụng / Đã kết thúc» kèm số; luật theo đặc điểm trỏ giá trị đã tắt hiện «Không phủ dịch vụ nào».
//   3  Quản trị thêm luật ba kiểu bằng bảng trượt («Một dịch vụ», «Cả nhóm», «Theo đặc điểm»); ô «Đến ngày» có dòng phụ R-1 (hẹn hôm nay ⇒ «vẫn chặn tới hết hôm nay»);
//      dòng mới hiện ở «Đang áp dụng».
//   4  «Kết thúc ngay» qua hộp xác nhận (câu «Luật thôi chặn từ bây giờ.») ⇒ dòng sang «Đã kết thúc», có dòng phụ chỉ chỗ tra đơn sáng nay.
//   5  «Hẹn ngày kết thúc» (bảng trượt riêng, dòng phụ R-1) ⇒ dòng ở lại «Đang áp dụng», hiệu lực «đến hết <ngày>», hết nút việc.
//   6  Bán hàng (mở sau cùng): có lối vào; thêm luật và «Kết thúc ngay» được.
// Chạy (từ gốc repo, sau `npm run build:web`):
//   AXE_JS=<…/axe.min.js> CHROME_BIN=$PWD/docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh node docs/evidence/2026-10-30-luat-ban-dac-diem/kich-ban/luat-ban-smoke.mjs
// Cuối: "LUAT BAN SMOKE OK" hoặc danh sách bước đỏ (thoát 1). LB_KHO=390|1040 chạy một khổ.
// PHÁ THỬ (P16, KHÔNG sửa mã sản phẩm): LB_PHA=khong-phu — lớp bọc `fetch` xoá cờ `khongPhu` khỏi phản hồi /api/pricing/luat-ban ⇒ bước 2 ĐỎ;
//   LB_PHA=r1 — lớp bọc thay chữ dòng phụ dưới ô «Đến ngày» (giả một giao diện quên nói R-1) ⇒ bước 3 ĐỎ.
import assert from "node:assert/strict";
import {
  ACCOUNTS, KHO, PHA, axeKiem, bam, bocucSach, buoc, choDongHop, choHop, chonO, chup, coLoiVao, diToi, goiApi, goiTrongTrang, ketThuc, ngayVi, sleep, startEnv, taoMoTrang, vnDate,
} from "./lb-chung.mjs";

const PHA_KHONG_PHU = `{ const f = window.fetch.bind(window);
  window.fetch = async (u, o) => { const r = await f(u, o);
    if (String(u) === '/api/pricing/luat-ban' && (!o || !o.method || o.method === 'GET') && r.ok) { const b = await r.clone().json(); for (const l of b.luat) l.khongPhu = false;
      return new Response(JSON.stringify(b), { status: 200, headers: { 'content-type': 'application/json' } }); }
    return r; }; }`;
const PHA_R1 = `setInterval(() => { for (const e of document.querySelectorAll('#lb-den-phu, #lb-hen-phu')) if (e.textContent !== 'Ngày kết thúc.') e.textContent = 'Ngày kết thúc.'; }, 10);`;
const THEM = PHA === "khong-phu" ? PHA_KHONG_PHU : PHA === "r1" ? PHA_R1 : "";

const HOM_NAY = vnDate(0);
const HOM_QUA = vnDate(-1);
const CAU_403 = "Bạn không có quyền xem trang này.";

const env = await startEnv();
try {
  const { call } = goiApi(env);
  const moTrang = taoMoTrang(env);
  const phai = (r, status, nhan) => { assert.equal(r.status, status, `${nhan}: ${r.status} ${JSON.stringify(r.json)}`); return r.json; };
  const CHU = String(Date.now()).slice(-5);

  // ---- Dữ liệu chung (Quản trị, TRƯỚC mọi trang) ----
  const loai = phai(await call(ACCOUNTS.admin, "GET", "/api/pricing/loai-doi-tac"), 200, "loại đối tác").loai.filter((l) => l.dangBat);
  assert.ok(loai.length > 0, "D1 tạm phải có ít nhất một loại đối tác đang bật");
  const L = loai[0];
  const nhom = phai(await call(ACCOUNTS.admin, "POST", "/api/catalog/groups", { name: `Nhóm luật bán ${CHU}` }), 201, "tạo nhóm").group;
  const dd = phai(await call(ACCOUNTS.admin, "POST", "/api/catalog/dac-diem", { ten: `Vận chuyển cảng–đảo ${CHU}`, giaTri: [{ ten: "Gồm" }, { ten: "Không gồm" }, { ten: "Tắt thử" }] }), 201, "tạo đặc điểm").dacDiem;
  const [GOM, , TAT] = dd.giaTri;
  phai(await call(ACCOUNTS.admin, "POST", "/api/pricing/luat-ban", { loai: L.code, phamVi: "ATTRIBUTE", attributeCode: dd.code, valueCode: TAT.code }), 201, "luật trỏ giá trị sẽ tắt");
  phai(await call(ACCOUNTS.admin, "PATCH", `/api/catalog/dac-diem/gia-tri/${TAT.code}`, { dangDung: false, expectedUpdatedAt: TAT.capNhatLuc }), 200, "tắt giá trị «Tắt thử»");

  /** Dòng luật ĐANG HIỆN theo id (thẻ ở điện thoại, hàng bảng ở máy tính). */
  const dong = (p, id) => p.ev(`(() => { const e = [...document.querySelectorAll('[data-id="${id}"]')].find((x) => x.offsetParent !== null); if (!e) return null;
    return { the: e.closest('[role=tabpanel]')?.id ?? null, chu: e.innerText, nut: [...e.querySelectorAll('button')].filter((b) => b.offsetParent !== null).map((b) => b.textContent.trim()) }; })()`);
  const soTrongThe = (p) => p.ev("Object.fromEntries([...document.querySelectorAll('[role=tab][id^=lb-tab-]')].map((t) => [t.id.slice(7), Number(/\\((\\d+)\\)/.exec(t.textContent)?.[1] ?? -1)]))");
  const chuyenThe = async (p, t) => { assert.equal(await bam(p, `#lb-tab-${t}`), true, `thẻ ${t}`); await p.waitFor(`!document.getElementById('lb-the-${t}').hidden`, `thẻ ${t} hiện`); };
  const choTrang = (p) => p.waitFor("!document.getElementById('lb-noi-dung').hidden && /\\(\\d+\\)/.test(document.getElementById('lb-tab-DANG_AP_DUNG').textContent)", "trang Luật bán đã vẽ");
  /** Mở «Thêm luật», điền, lưu; trả id luật mới (đọc từ máy chủ qua fetch trong trang). */
  const themLuat = async (p, o) => {
    const truoc = new Set((await goiTrongTrang(p, "GET", "/api/pricing/luat-ban")).json.luat.map((l) => l.id));
    assert.equal(await bam(p, "#lb-them"), true, "nút «＋ Thêm luật»");
    await choHop(p);
    await p.waitFor("document.querySelectorAll('#lb-loai option').length > 1", "danh sách loại đối tác");
    assert.equal(await chonO(p, "#lb-loai", L.code), true, "chọn loại");
    assert.equal(await chonO(p, "#lb-pham-vi", o.phamVi), true, `chọn phạm vi ${o.phamVi}`);
    if (o.phamVi === "SERVICE") assert.equal(await chonO(p, "#lb-dich-vu", "TD101"), true, "chọn dịch vụ");
    if (o.phamVi === "GROUP") assert.equal(await chonO(p, "#lb-nhom", nhom.code), true, "chọn nhóm");
    if (o.phamVi === "ATTRIBUTE") {
      assert.equal(await chonO(p, "#lb-dac-diem", dd.code), true, "chọn đặc điểm");
      assert.equal(await p.ev(`[...document.querySelectorAll('#lb-gia-tri option')].some((x) => x.value === ${JSON.stringify(TAT.code)})`), false, "giá trị đã tắt không chọn được");
      assert.equal(await chonO(p, "#lb-gia-tri", GOM.code), true, "chọn giá trị");
    }
    if (o.kiemR1) await o.kiemR1();
    await bocucSach(p, `hộp Thêm luật ${o.phamVi}`);
    if (o.anh) await chup(p, o.anh, false);
    if (o.anh) await axeKiem(p, `hộp Thêm luật ${o.phamVi}`);
    assert.equal(await bam(p, "#lb-luu"), true, "nút «Thêm luật» của hộp");
    await choDongHop(p);
    const sau = (await goiTrongTrang(p, "GET", "/api/pricing/luat-ban")).json.luat.filter((l) => !truoc.has(l.id));
    assert.equal(sau.length, 1, "đúng một luật mới");
    await p.waitFor(`!!document.querySelector('[data-id="${sau[0].id}"]')`, "dòng luật mới đã vẽ");
    return sau[0];
  };
  const ketThucNgay = async (p, id, ten) => {
    assert.ok((await dong(p, id))?.nut.includes("Kết thúc ngay"), `${ten}: có nút «Kết thúc ngay»`);
    assert.equal(await p.ev(`(() => { const e = [...document.querySelectorAll('[data-id="${id}"] [data-viec="ket-thuc-ngay"]')].find((x) => x.offsetParent !== null); e.click(); return true; })()`), true);
    await choHop(p);
    const hop = await p.ev("document.querySelector('.sheet').innerText");
    assert.match(hop, /Luật thôi chặn từ bây giờ\./, "hộp xác nhận nói «Luật thôi chặn từ bây giờ.»");
    assert.match(hop, new RegExp(`ghi ngày kết thúc ${ngayVi(HOM_QUA).replaceAll("/", "\\/")} \\(hôm qua\\)`), "hộp nói ngày ghi là hôm qua");
    return hop;
  };

  for (const [tenKho, vp] of KHO) {
    const kho = `[${tenKho}]`;

    // ======================= Kế toán =======================
    {
      const p = await moTrang(ACCOUNTS.accounting, "/account", vp, { them: THEM });
      try {
        await buoc(`1${kho}`, "Kế toán: không có lối vào «Luật bán»; mở thẳng /luat-ban ⇒ trạng thái 403 bằng câu tiếng Việt; máy chủ 403", async () => {
          await p.waitFor("document.querySelectorAll('a[href]').length > 3", "khung trang Tôi");
          await sleep(500);
          assert.equal(await coLoiVao(p, "/luat-ban"), false, "Kế toán không thấy lối vào");
          await diToi(p, env, "/luat-ban");
          await p.waitFor("document.body.dataset.trangThai === '403'", "trạng thái 403", 12000);
          assert.equal(await p.ev("document.querySelector('.trang-thai[data-loai=\"403\"] .trang-thai-tieu-de')?.textContent.trim()"), CAU_403);
          assert.equal((await goiTrongTrang(p, "GET", "/api/pricing/luat-ban")).status, 403);
          await bocucSach(p, `bước 1 ${kho}`);
          await axeKiem(p, `bước 1 ${kho}`);
          await chup(p, `luat-ban-1-ke-toan-403-${tenKho}`);
        });
        if (p.consoleErrors.length) console.log(`    (console Kế toán ${kho}: ${p.consoleErrors.join(" | ").slice(0, 200)})`);
      } finally {
        p.close();
      }
    }

    // ======================= Quản trị =======================
    {
      const p = await moTrang(ACCOUNTS.admin, "/account", vp, { them: THEM });
      try {
        let luatDV = null;
        let luatNhom = null;
        let luatDD = null;
        await buoc(`2${kho}`, "Quản trị: có lối vào; ba thẻ kèm số; luật trỏ giá trị đã tắt hiện «Không phủ dịch vụ nào»", async () => {
          await p.waitFor("document.querySelectorAll('a[href]').length > 3", "khung trang Tôi");
          await sleep(500);
          assert.equal(await coLoiVao(p, "/luat-ban"), true, "Quản trị thấy lối vào «Luật bán»");
          await diToi(p, env, "/luat-ban");
          await choTrang(p);
          const tab = await p.ev("[...document.querySelectorAll('[role=tab][id^=lb-tab-]')].map((t) => t.textContent.replace(/ \\(\\d+\\)$/, ''))");
          assert.deepEqual(tab, ["Đang áp dụng", "Sắp áp dụng", "Đã kết thúc"]);
          const kp = await p.ev("[...document.querySelectorAll('#lb-the-DANG_AP_DUNG [data-khong-phu=\"1\"]')].filter((e) => e.offsetParent !== null).map((e) => e.innerText)");
          assert.ok(kp.length >= 1, "có dòng luật «không phủ»");
          assert.ok(kp.every((t) => t.includes("Không phủ dịch vụ nào") && t.includes("Tắt thử")), `dòng «không phủ» ghi rõ: ${kp[0]}`);
          await bocucSach(p, `bước 2 ${kho}`);
          await axeKiem(p, `bước 2 ${kho}`);
          await chup(p, `luat-ban-2-quan-tri-${tenKho}`);
        });

        await buoc(`3${kho}`, "Quản trị thêm luật ba kiểu bằng bảng trượt; dòng phụ R-1 dưới ô «Đến ngày»; dòng mới ở «Đang áp dụng»", async () => {
          const so0 = await soTrongThe(p);
          luatDV = await themLuat(p, {
            phamVi: "SERVICE", anh: `luat-ban-3-hop-them-${tenKho}`,
            kiemR1: async () => {
              assert.equal(await p.ev("document.getElementById('lb-den-phu').textContent"), "Luật vẫn chặn tới hết ngày này.", "dòng phụ khi chưa chọn ngày");
              assert.equal(await chonO(p, "#lb-den-ngay", HOM_NAY), true);
              assert.match(await p.ev("document.getElementById('lb-den-phu').textContent"), /vẫn chặn tới hết hôm nay.*Kết thúc ngay/, "hẹn hôm nay ⇒ vẫn chặn hết hôm nay");
              assert.equal(await p.ev("document.getElementById('lb-den-ngay').getAttribute('aria-describedby')"), "lb-den-phu", "dòng phụ gắn với ô");
              assert.equal(await chonO(p, "#lb-den-ngay", ""), true);
            },
          });
          luatNhom = await themLuat(p, { phamVi: "GROUP" });
          luatDD = await themLuat(p, { phamVi: "ATTRIBUTE" });
          for (const [l, chu] of [[luatDV, "Dịch vụ: Tour 4 đảo Nha Trang"], [luatNhom, `Nhóm: Nhóm luật bán ${CHU}`], [luatDD, `Vận chuyển cảng–đảo ${CHU}: Gồm`]]) {
            const d = await dong(p, l.id);
            assert.equal(d?.the, "lb-the-DANG_AP_DUNG", `${chu}: ở thẻ «Đang áp dụng»`);
            assert.ok(d.chu.includes(chu) && d.chu.includes(L.ten), `${chu}: dòng ghi tên — ${d.chu}`);
            assert.ok(d.chu.includes(`Từ ${ngayVi(HOM_NAY)} · chưa hẹn ngày kết thúc`), `${chu}: hiệu lực`);
          }
          const so1 = await soTrongThe(p);
          assert.equal(so1.DANG_AP_DUNG, so0.DANG_AP_DUNG + 3, "số ở thẻ «Đang áp dụng» tăng 3");
          await bocucSach(p, `bước 3 ${kho}`);
          await axeKiem(p, `bước 3 ${kho}`);
          await chup(p, `luat-ban-3-sau-them-${tenKho}`);
        });

        await buoc(`4${kho}`, "«Kết thúc ngay» qua hộp xác nhận ⇒ dòng sang «Đã kết thúc», có dòng phụ chỉ chỗ tra đơn sáng nay", async () => {
          assert.ok(luatNhom, "cần luật nhóm của bước 3");
          await ketThucNgay(p, luatNhom.id, "luật nhóm");
          await axeKiem(p, `bước 4 hộp ${kho}`);
          await chup(p, `luat-ban-4-hop-ket-thuc-${tenKho}`, false);
          assert.equal(await bam(p, ".sheet-foot .btn-danger"), true, "nút «Kết thúc ngay» của hộp");
          await choDongHop(p);
          await p.waitFor(`!document.querySelector('#lb-the-DANG_AP_DUNG [data-id="${luatNhom.id}"]')`, "dòng rời «Đang áp dụng»");
          await chuyenThe(p, "DA_KET_THUC");
          const d = await dong(p, luatNhom.id);
          assert.equal(d?.the, "lb-the-DA_KET_THUC");
          assert.ok(d.chu.includes("đã kết thúc, không còn chặn"), `hiệu lực khoảng rỗng: ${d.chu}`);
          assert.ok(/kết thúc trong hôm nay.*Nhật ký/s.test(d.chu), `dòng phụ chỉ chỗ tra: ${d.chu}`);
          assert.deepEqual(d.nut, [], "luật đã kết thúc không còn nút việc");
          await bocucSach(p, `bước 4 ${kho}`);
          await axeKiem(p, `bước 4 ${kho}`);
          await chup(p, `luat-ban-4-da-ket-thuc-${tenKho}`);
          await chuyenThe(p, "DANG_AP_DUNG");
        });

        await buoc(`5${kho}`, "«Hẹn ngày kết thúc» (bảng trượt riêng, dòng phụ R-1) ⇒ dòng ở lại «Đang áp dụng», «đến hết <ngày>», hết nút việc", async () => {
          assert.ok(luatDD, "cần luật đặc điểm của bước 3");
          assert.equal(await p.ev(`(() => { const e = [...document.querySelectorAll('[data-id="${luatDD.id}"] [data-viec="hen"]')].find((x) => x.offsetParent !== null); e.click(); return true; })()`), true);
          await choHop(p);
          assert.match(await p.ev("document.getElementById('lb-hen-phu').textContent"), /vẫn chặn tới hết hôm nay/, "mặc định hôm nay ⇒ vẫn chặn hết hôm nay");
          assert.equal(await chonO(p, "#lb-hen-ngay", vnDate(5)), true);
          assert.equal(await p.ev("document.getElementById('lb-hen-phu').textContent"), `Luật vẫn chặn tới hết ngày này (${ngayVi(vnDate(5))}), thôi chặn từ ${ngayVi(vnDate(6))}.`);
          await bocucSach(p, `bước 5 hộp ${kho}`);
          await axeKiem(p, `bước 5 hộp ${kho}`);
          await chup(p, `luat-ban-5-hop-hen-${tenKho}`, false);
          assert.equal(await p.ev("(() => { const b = [...document.querySelectorAll('.sheet-foot button')].find((x) => x.textContent.trim() === 'Hẹn kết thúc'); b.click(); return true; })()"), true);
          await choDongHop(p);
          await p.waitFor(`(() => { const e = [...document.querySelectorAll('[data-id="${luatDD.id}"]')].find((x) => x.offsetParent !== null); return !!e && e.innerText.includes('đến hết'); })()`, "dòng đã hẹn kết thúc");
          const d = await dong(p, luatDD.id);
          assert.equal(d.the, "lb-the-DANG_AP_DUNG");
          assert.ok(d.chu.includes(`đến hết ${ngayVi(vnDate(5))}`), d.chu);
          assert.deepEqual(d.nut, [], "đã hẹn ngày kết thúc thì không đặt lại được");
          await bocucSach(p, `bước 5 ${kho}`);
          await chup(p, `luat-ban-5-sau-hen-${tenKho}`);
        });
        if (p.consoleErrors.length) console.log(`    (console Quản trị ${kho}: ${p.consoleErrors.join(" | ").slice(0, 200)})`);
      } finally {
        p.close();
      }
    }

    // ======================= Bán hàng (mở sau cùng) =======================
    {
      const p = await moTrang(ACCOUNTS.salesA, "/account", vp, { them: THEM });
      try {
        await buoc(`6${kho}`, "Bán hàng: có lối vào; thêm luật và «Kết thúc ngay» được", async () => {
          await p.waitFor("document.querySelectorAll('a[href]').length > 3", "khung trang Tôi");
          await sleep(500);
          assert.equal(await coLoiVao(p, "/luat-ban"), true, "Bán hàng thấy lối vào «Luật bán»");
          await diToi(p, env, "/luat-ban");
          await choTrang(p);
          const l = await themLuat(p, { phamVi: "SERVICE" });
          assert.equal((await dong(p, l.id))?.the, "lb-the-DANG_AP_DUNG");
          await ketThucNgay(p, l.id, "luật của Bán hàng");
          assert.equal(await bam(p, ".sheet-foot .btn-danger"), true);
          await choDongHop(p);
          await p.waitFor(`!document.querySelector('#lb-the-DANG_AP_DUNG [data-id="${l.id}"]')`, "dòng rời «Đang áp dụng»");
          await chuyenThe(p, "DA_KET_THUC");
          assert.equal((await dong(p, l.id))?.the, "lb-the-DA_KET_THUC");
          await bocucSach(p, `bước 6 ${kho}`);
          await axeKiem(p, `bước 6 ${kho}`);
          await chup(p, `luat-ban-6-ban-hang-${tenKho}`);
        });
        if (p.consoleErrors.length) console.log(`    (console Bán hàng ${kho}: ${p.consoleErrors.join(" | ").slice(0, 200)})`);
      } finally {
        p.close();
      }
    }
  }
} finally {
  await env.stop();
}
ketThuc("LUAT BAN");
