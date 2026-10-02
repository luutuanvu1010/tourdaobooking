// B8 — V13: Chính sách điều phối (Toàn quyền), Lý do điều phối (Quản trị), Điều kiện xuất bến + hạng bằng (khuôn sẵn). ADR-0049 D2; ADR-0050 VK1-A (thành
// phần F), VK1-C; bản vẽ docs/design/van-chuyen-dieu-phoi/project/08 Chinh sach dieu phoi.dc.html (8a–8d); bản đối chiếu DOI-CHIEU-2026-09-29.md mục 2.4, 2.14,
// H19; chủ trả lời Q3 (29/9): hiệu lực ngay khi lưu — không ô ngày, không dòng "Đang soạn".
// Chạy từ GỐC repo, sau `npm run build:web` (không cần mạng ngoài):
//   AXE_JS=<…/axe.min.js> CHROME_BIN=docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh OUT=<thư mục ảnh> node docs/evidence/2026-09-29-adr-0049/kich-ban/chinh-sach-dieu-phoi-smoke.mjs
// Kho cookie của Chrome dùng CHUNG: làm hết các bước của một tài khoản rồi mới sang tài khoản khác (Toàn quyền → Quản trị → Bán hàng).
import { fetchTrang,
  ACCOUNTS, CHU, DESK, MOB, apiCalls, assert, axe, axeNote, boDem, click, dungMoiTruong, noCode, noOverflowX, shotFull, shotView, shown, sleep, txt, typeInto, vcSub,
} from "./dp-lib.mjs";

const { env, call } = await dungMoiTruong([CHU]);
const b = boDem("CHINH SACH DIEU PHOI SMOKE");
const O = (truong) => `#cs-${truong}`;
const loiO = (truong) => txt(`#cs-${truong}-error`);
const lichSu = `[...document.querySelectorAll('#cs-lich-su .dp-hist-row')].map((r) => r.innerText.replace(/\\s+/g, ' ').trim())`;
// Đợt 4 (migration 0073, ADR-0057 T2): thêm nhóm "Chi phí xe thuê" (lý do điều chỉnh / đảo chi phí xe) ở cuối — do máy chủ gieo, màn Lý do tự hiện.
const NHOM_BAN_VE = ["Phá lệ", "Huỷ chuyến", "Kết thúc gián đoạn", "Bỏ qua điểm", "Đổi giờ xe tới", "Chi phí xe thuê"];

try {
  // ---- Toàn quyền, máy tính ----------------------------------------------------------------------------------------------------------------------------------
  const p = await env.as(CHU, "/chinh-sach-dieu-phoi", DESK);
  await p.waitFor(shown("#cs-form .dp-cs-nums"), "form chính sách dựng xong");

  await b.step("1", "8a 1040 Toàn quyền: bốn ô theo bản gieo (6 giờ, 2 giờ, 30 phút, 180 phút), công tắc đủ danh sách BẬT, hợp đồng KHOÁ TẮT, hai điều kiện gieo sẵn, KHÔNG ô ngày, KHÔNG 'Đang soạn'; thanh bên có Chính sách + Lý do dưới Vận chuyển, KHÔNG 'Điều phối xe'", async () => {
    const v = await p.ev(`[${["mocGio", "satMocGio", "nghiPhut", "khaiLuiPhut"].map((t) => `document.querySelector('${O(t)}').value`).join(",")}]`);
    assert.deepEqual(v, ["6", "2", "30", "180"]);
    const nhan = await p.ev(`[...document.querySelectorAll('#cs-form .vc-field > label')].map((l) => l.textContent)`);
    assert.deepEqual(nhan, ["Mốc tối thiểu (giờ)", "Cảnh báo sát mốc (giờ)", "Khoảng nghỉ tài xế (phút)", "Khai lùi tối đa (phút)"]);
    assert.equal(await p.ev(txt(`#cs-satMocGio-hint`)), "Chặng chưa xếp trong 2 giờ trước mốc hiện nhãn “Sát mốc”.");
    assert.equal(await p.ev(txt("#cs-khaiLuiPhut-hint")), "Từ 1 đến 1440, mặc định 180.");
    const sw = await p.ev(`[...document.querySelectorAll('.dp-switch')].map((s) => ({ checked: s.getAttribute('aria-checked'), disabled: s.disabled, label: document.getElementById(s.getAttribute('aria-labelledby')).textContent }))`);
    assert.deepEqual(sw, [{ checked: "true", disabled: false, label: "Phải đủ danh sách khách" }, { checked: "false", disabled: true, label: "Phải có hợp đồng" }]);
    const chips = await p.ev(`[...document.querySelectorAll('.dp-chips .chip')].map((c) => c.textContent)`);
    assert.deepEqual(chips, ["Kiểm định — mọi xe", "Bảo hiểm trách nhiệm dân sự — mọi xe"]);
    assert.equal(await p.ev(`document.querySelector('.dp-link').getAttribute('href')`), "/dieu-kien-xuat-ben");
    assert.equal(await p.ev(`document.querySelectorAll('main input[type=date]').length`), 0, "không có ô ngày hiệu lực (chủ Q3)");
    assert.match(await p.ev(txt(".dp-cs-note")), /hiệu lực ngay khi lưu/);
    assert.equal(await p.ev(`document.body.innerText.includes('Đang soạn')`), false);
    assert.ok(await p.ev(shown("#cs-lich-su")), "cột lịch sử hiện ở máy tính");
    assert.deepEqual(await p.ev(lichSu), ["Bản 1 Đang dùng Hiệu lực từ 01/09/2026 Mốc 6 giờ · sát mốc 2 giờ · nghỉ 30 phút · khai lùi 180 phút · phải đủ danh sách khách"]);
    const nav = await p.ev(vcSub);
    assert.deepEqual(nav.items.slice(-3), ["Loại giấy tờ xe", "Chính sách điều phối", "Lý do điều phối"]);
    assert.equal(nav.items[0], "Điều phối xe", "B1 (vòng 3): mục con đầu dưới Vận chuyển");
    assert.equal(nav.current, "Chính sách điều phối");
    assert.equal(await p.ev(noCode), "");
    assert.ok(await p.ev(noOverflowX));
    await axe(p, "chính sách 1040");
    await shotFull(p, "b8-chinh-sach-may-tinh.png");
  });

  await b.step("2", `F + H19: ô ngoài khoảng báo lời thường dưới ô, không gửi gì (khai lùi 1441, 0; mốc 0, 49 giờ)${axeNote()}`, async () => {
    const truoc = apiCalls(p).filter((r) => r.method === "POST").length;
    for (const [t, v, cau] of [
      ["khaiLuiPhut", "1441", "Khai lùi tối đa là số phút nguyên từ 1 đến 1440."],
      ["khaiLuiPhut", "0", "Khai lùi tối đa là số phút nguyên từ 1 đến 1440."],
      ["mocGio", "0", "Mốc tối thiểu là số giờ lớn hơn 0, tối đa 48 — không tắt được; muốn nới thì giảm con số."],
      ["mocGio", "49", "Mốc tối thiểu là số giờ lớn hơn 0, tối đa 48 — không tắt được; muốn nới thì giảm con số."],
    ]) {
      await p.ev(typeInto(O(t), v));
      await p.ev(click(".dp-cs-actions button[type=submit]"));
      await p.waitFor(`${loiO(t)} === ${JSON.stringify(cau)}`, `câu lỗi ${t}=${v}`);
      assert.equal(await p.ev(`document.querySelector('${O(t)}').getAttribute('aria-invalid')`), "true");
      if (t === "khaiLuiPhut" && v === "1441") {
        await axe(p, "chính sách — ô lỗi");
        await shotFull(p, "b8-chinh-sach-loi-khai-lui-may-tinh.png");
      }
    }
    await sleep(300);
    assert.equal(apiCalls(p).filter((r) => r.method === "POST").length, truoc, "ô sai thì không gửi lệnh lưu");
    // Gõ lại thì câu lỗi của ô đó tắt.
    await p.ev(typeInto(O("mocGio"), "6"));
    assert.equal(await p.ev(`document.querySelector('#cs-mocGio-error').hidden`), true);
  });

  await b.step("3", "Không đổi gì → không lưu bản giống hệt (câu nhắc, không gửi)", async () => {
    await p.ev(typeInto(O("khaiLuiPhut"), "180"));
    const truoc = apiCalls(p).filter((r) => r.method === "POST").length;
    await p.ev(click(".dp-cs-actions button[type=submit]"));
    await p.waitFor(`${txt("#error")} === 'Chưa đổi gì so với bản đang dùng — không cần lưu bản mới.'`, "câu nhắc không đổi gì");
    assert.equal(apiCalls(p).filter((r) => r.method === "POST").length, truoc);
  });

  await b.step("4", "Lưu bản mới (mốc 5 giờ, khai lùi 240 phút, tắt đủ danh sách): thân đúng năm khoá theo PHÚT; lịch sử hai bản khác nhau ở ô F; máy chủ lưu đúng", async () => {
    await p.ev(typeInto(O("mocGio"), "5"));
    await p.ev(typeInto(O("khaiLuiPhut"), "240"));
    await p.ev(click("#cs-du-danh-sach"));
    await p.ev(click(".dp-cs-actions button[type=submit]"));
    await p.waitFor(`${txt("#cs-ok")} === 'Đã lưu bản mới — có hiệu lực từ bây giờ.'`, "báo đã lưu");
    const post = apiCalls(p).filter((r) => r.method === "POST" && r.path === "/api/van-chuyen/chinh-sach-dieu-phoi").at(-1);
    assert.deepEqual(JSON.parse(post.body), { minLeadMinutes: 300, warnLeadMinutes: 120, restMinutes: 30, requireManifest: false, proxyBackdateMaxMinutes: 240 });
    const rows = await p.ev(lichSu);
    assert.equal(rows.length, 2);
    // R-P23: bản vừa lưu có "ai lưu" (tên tài khoản Toàn quyền + lúc lưu); bản gieo (không người lưu) không có dòng đó.
    assert.match(rows[0], /^Bản 2 Đang dùng Hiệu lực từ \d\d\/\d\d\/\d{4} Mốc 5 giờ · sát mốc 2 giờ · nghỉ 30 phút · khai lùi 240 phút Chủ Điều Phối lưu \d\d\/\d\d \d\d:\d\d$/);
    assert.equal(await p.ev(`document.querySelectorAll('#cs-lich-su [data-nguoi-luu]').length`), 1, "chỉ bản có người lưu mới có dòng ai lưu");
    assert.match(rows[1], /^Bản 1 Hết hiệu lực Hiệu lực 01\/09 – \d\d\/\d\d\/\d{4} Mốc 6 giờ · sát mốc 2 giờ · nghỉ 30 phút · khai lùi 180 phút · phải đủ danh sách khách$/);
    const g = await call(CHU, "GET", "/api/van-chuyen/chinh-sach-dieu-phoi");
    assert.equal(g.json.current.minLeadMinutes, 300);
    assert.equal(g.json.current.proxyBackdateMaxMinutes, 240);
    assert.equal(g.json.current.requireManifest, false);
    assert.equal(await p.ev(`document.querySelector('#cs-hop-dong').disabled`), true, "hợp đồng vẫn khoá tắt sau khi lưu");
    await axe(p, "chính sách sau lưu");
    await shotFull(p, "b8-chinh-sach-hai-ban-may-tinh.png");
  });

  await b.step("5", "Điều kiện xuất bến (khuôn sẵn, mở từ liên kết): hai điều kiện gieo 'Đang áp'; thêm 'Phù hiệu xe hợp đồng — xe chở từ 9 người', đóng nó; hạng D1 đổi 16 → 15; không lộ mã", async () => {
    await p.ev(click(".dp-link"));
    await p.waitFor(`location.pathname === '/dieu-kien-xuat-ben' && !!document.querySelector('#dk-dieu-kien:not([hidden]) .dp-reason')`, "trang điều kiện dựng xong");
    const dong = `[...document.querySelectorAll('#dk-dieu-kien .dp-reason')].map((r) => r.innerText.replace(/\\s+/g, ' ').trim())`;
    const truoc = await p.ev(dong);
    assert.equal(truoc.length, 2);
    assert.match(truoc[0], /^Kiểm định — mọi xe Áp từ 01\/09\/2026 Đang áp Đóng$/);
    assert.match(truoc[1], /^Bảo hiểm trách nhiệm dân sự — mọi xe Áp từ 01\/09\/2026 Đang áp Đóng$/);
    assert.equal((await p.ev(vcSub)).current, "Chính sách điều phối", "trang con vẫn sáng mục Chính sách");
    await p.ev(typeInto("#dk-co-xe", "9"));
    await p.ev(`(() => { const s = document.querySelector('#dk-loai'); s.value = 'CONTRACT_BADGE'; s.dispatchEvent(new Event('change')); return true; })()`);
    await p.ev(click('[data-action="them-dieu-kien"]'));
    await p.waitFor(`${txt("#dk-ok")} === 'Đã thêm điều kiện xuất bến — áp ngay từ bây giờ.'`, "báo đã thêm điều kiện");
    const sau = await p.ev(dong);
    assert.ok(sau.some((t) => t.startsWith("Phù hiệu xe hợp đồng — xe chở từ 9 người") && t.includes("Đang áp")), JSON.stringify(sau));
    await p.ev("window.confirm = () => true; true");
    await p.ev(`[...document.querySelectorAll('#dk-dieu-kien .dp-reason')].find((r) => r.innerText.includes('Phù hiệu')).querySelector('[data-action="dong-dieu-kien"]').click()`);
    await p.waitFor(`${txt("#dk-ok")} === 'Đã đóng điều kiện “Phù hiệu xe hợp đồng — xe chở từ 9 người”.'`, "báo đã đóng");
    assert.ok((await p.ev(dong)).some((t) => t.startsWith("Phù hiệu xe hợp đồng") && t.includes("Đã đóng")));
    const hang = `[...document.querySelectorAll('#dk-hang-bang [data-hang]')].map((r) => r.innerText.replace(/\\s+/g, ' ').trim())`;
    await p.ev(`document.querySelector('#dk-hang-bang [data-hang="D1"] [data-action="doi-hang"]').click()`);
    await p.waitFor(shown("#dk-hang-o"), "ô đổi hạng D1");
    assert.equal(await p.ev(`document.querySelector('#dk-hang-o').value`), "16");
    await p.ev(typeInto("#dk-hang-o", "15"));
    await p.ev(click('[data-action="luu-hang"]'));
    await p.waitFor(`(${hang}).some((t) => t.includes('Tối đa 15 khách'))`, "hạng D1 thành 15 khách");
    const g = await call(CHU, "GET", "/api/van-chuyen/hang-bang");
    assert.equal(g.json.current.find((c) => c.classCode === "D1").maxPassengers, 15);
    assert.equal(await p.ev(noCode), "");
    assert.ok(await p.ev(noOverflowX));
    await axe(p, "điều kiện xuất bến 1040");
    await shotFull(p, "b8-dieu-kien-xuat-ben-may-tinh.png");
  });
  p.close();

  // ---- Toàn quyền, điện thoại ----------------------------------------------------------------------------------------------------------------------------------
  const m = await env.as(CHU, "/chinh-sach-dieu-phoi", MOB);
  await m.waitFor(shown("#cs-form .dp-cs-nums"), "form chính sách (390) dựng xong");
  await b.step("6", "8b 390 Toàn quyền: một cột, cột lịch sử ẩn, 'Lịch sử bản (2) ›' mở bảng trượt hai bản, nút 'Lưu thành bản mới' dính đáy, ô gõ ≥ 16px, không tràn ngang", async () => {
    assert.equal(await m.ev(shown("#cs-lich-su")), false);
    assert.equal(await m.ev(shown(".dp-cs-actions")), false);
    assert.ok(await m.ev(shown("#cs-bottom button")));
    assert.equal(await m.ev(txt("#cs-bottom button")), "Lưu thành bản mới");
    assert.equal(await m.ev(txt("#cs-hist-open")), "Lịch sử bản (2) ›");
    const co = await m.ev(`[...document.querySelectorAll('#cs-form input')].map((i) => parseFloat(getComputedStyle(i).fontSize))`);
    assert.ok(co.every((x) => x >= 16), JSON.stringify(co));
    assert.ok(await m.ev(noOverflowX));
    await axe(m, "chính sách 390");
    await shotFull(m, "b8-chinh-sach-dien-thoai.png");
    await m.ev(click("#cs-hist-open"));
    await m.waitFor(`document.querySelectorAll('.sheet .dp-hist-row').length === 2`, "bảng trượt lịch sử có hai bản");
    assert.match(await m.ev(txt(".sheet .dp-hist-row")), /^Bản 2 Đang dùng/);
    await axe(m, "lịch sử bản 390");
    await shotView(m, "b8-chinh-sach-lich-su-dien-thoai.png");
    await m.ev(click(".sheet .sheet-close"));
  });
  await b.step("7", "Trang Tôi (390) của Toàn quyền: nhóm VẬN CHUYỂN có 'Chính sách điều phối' và 'Lý do điều phối'", async () => {
    await m.send("Page.navigate", { url: env.base + "/account" });
    await m.waitFor(shown("#vc-links"), "nhóm Vận chuyển ở trang Tôi");
    const rows = await m.ev(`[...document.querySelectorAll('#vc-links a')].map((a) => a.innerText.replace(/\\s+/g, ' ').trim())`);
    assert.deepEqual(rows.slice(-3), ["Loại giấy tờ xe", "Chính sách điều phối", "Lý do điều phối"]);
  });
  m.close();

  // ---- Quản trị ----------------------------------------------------------------------------------------------------------------------------------------------
  const a = await env.as(ACCOUNTS.admin, "/ly-do-dieu-phoi", DESK);
  await a.waitFor(`document.querySelectorAll('.dp-group').length > 0`, "danh mục lý do dựng xong");
  const nhom = `[...document.querySelectorAll('.dp-group')].map((g) => ({ nhom: g.querySelector('.dp-group-title').textContent, dem: g.querySelector('.dp-count').textContent, dong: [...g.querySelectorAll('.dp-reason-label')].map((l) => l.firstChild.textContent) }))`;
  await b.step("8", "8c 1040 Quản trị: năm nhóm (Phá lệ, Huỷ chuyến, Kết thúc gián đoạn, Bỏ qua điểm, Đổi giờ xe tới) — KHÔNG 'Đặt gấp', 'Bỏ chặng'; số đếm; không lộ mã; thanh bên có 'Lý do điều phối', KHÔNG 'Chính sách điều phối'", async () => {
    const n = await a.ev(nhom);
    assert.deepEqual(n.map((x) => x.nhom), NHOM_BAN_VE);
    assert.deepEqual(n[0], { nhom: "Phá lệ", dem: "3", dong: ["Sự cố vận hành", "Đơn đặt gấp", "Khác"] });
    assert.deepEqual(n[3].dong, ["Không còn khách ở điểm", "Khác"]);
    // R-P22 (Q-B-3): lý do HỆ THỐNG "Không còn khách ở điểm" — không có nút "Ngưng", có ghi chú; lý do thường cùng nhóm vẫn có "Ngưng".
    const heThong = '.dp-reason[data-code="BO_QUA_KHONG_CON_KHACH"]';
    assert.equal(await a.ev(`!!document.querySelector('${heThong} [data-action="ngung"]')`), false, "lý do hệ thống không có nút Ngưng");
    assert.equal(await a.ev(txt(`${heThong} [data-he-thong]`)), "Hệ thống tự dùng — không ngưng được");
    assert.equal(await a.ev(`!!document.querySelector('.dp-reason[data-code="BO_QUA_KHAC"] [data-action="ngung"]')`), true, "lý do thường vẫn có Ngưng");
    assert.equal(await a.ev(`document.body.innerText.includes('Đặt gấp') || document.body.innerText.includes('Bỏ chặng')`), false);
    assert.equal(await a.ev(txt(".dp-head-note")), "Hiện trong các hộp chọn lý do");
    const nav = await a.ev(vcSub);
    assert.ok(nav.items.includes("Lý do điều phối") && !nav.items.includes("Chính sách điều phối"), JSON.stringify(nav));
    assert.equal(nav.current, "Lý do điều phối");
    assert.equal(await a.ev(noCode), "");
    assert.ok(await a.ev(noOverflowX));
    await axe(a, "lý do 1040");
    await shotFull(a, "b8-ly-do-may-tinh.png");
  });

  await b.step("9", "Thêm 'Khách tự đi' vào Bỏ qua điểm (mã sinh từ nhãn, đứng trước 'Khác'); thêm trùng tên → mã hậu tố _2; sửa tên; Ngưng → 'Đã ngưng' + 'Dùng lại'", async () => {
    const themVao = async (nhan) => {
      await a.ev(`document.querySelector('.dp-group[data-nhom="BO_QUA_DIEM"] [data-action="them"]').click()`);
      await a.waitFor(shown('.dp-group[data-nhom="BO_QUA_DIEM"] .dp-panel input'), "khung thêm mở");
      assert.equal(await a.ev(`document.activeElement.id`), "ld-moi-BO_QUA_DIEM", "focus vào ô lý do mới");
      await a.ev(typeInto('.dp-group[data-nhom="BO_QUA_DIEM"] .dp-panel input', nhan));
      await a.ev(`document.querySelector('.dp-group[data-nhom="BO_QUA_DIEM"] [data-action="luu-them"]').click()`);
      await a.waitFor(`${txt("#ld-ok")} === 'Đã thêm lý do “${nhan}” vào nhóm Bỏ qua điểm.'`, `báo đã thêm ${nhan}`);
    };
    await themVao("Khách tự đi");
    let n = (await a.ev(nhom))[3];
    assert.deepEqual(n, { nhom: "Bỏ qua điểm", dem: "3", dong: ["Không còn khách ở điểm", "Khách tự đi", "Khác"] });
    await themVao("Khách tự đi");
    const ds = (await fetchTrang(a, "GET", "/api/van-chuyen/ly-do")).json.reasons.filter((r) => r.label === "Khách tự đi").map((r) => [r.code, r.group, r.sortOrder]);
    assert.deepEqual(ds, [["BO_QUA_KHACH_TU_DI", "BO_QUA_DIEM", 2], ["BO_QUA_KHACH_TU_DI_2", "BO_QUA_DIEM", 3]]);
    // ADR-0075 (một phiên mỗi tài khoản): đọc bằng phiên của trang — call() của Quản trị đá phiên trình duyệt (đỏ sẵn trước Đợt 4, sửa 2/10).
    // Sửa tên lý do thứ hai.
    await a.ev(`document.querySelector('.dp-reason[data-code="BO_QUA_KHACH_TU_DI_2"] [data-action="sua"]').click()`);
    await a.waitFor(shown('.dp-panel[data-khung="sua"] input'), "khung sửa mở");
    await a.ev(typeInto('.dp-panel[data-khung="sua"] input', "Khách tự đến bến"));
    await a.ev(click('[data-action="luu-sua"]'));
    await a.waitFor(`${txt("#ld-ok")} === 'Đã sửa lý do “Khách tự đến bến”.'`, "báo đã sửa");
    // Ngưng lý do vừa sửa.
    await a.ev(`document.querySelector('.dp-reason[data-code="BO_QUA_KHACH_TU_DI_2"] [data-action="ngung"]').click()`);
    await a.waitFor(`${txt('.dp-reason[data-code="BO_QUA_KHACH_TU_DI_2"]')} === 'Khách tự đến bến Đã ngưng Sửa Dùng lại'`, "dòng đã ngưng");
    n = (await a.ev(nhom))[3];
    assert.equal(n.dem, "4");
    const r = (await fetchTrang(a, "GET", "/api/van-chuyen/ly-do")).json.reasons.find((x) => x.code === "BO_QUA_KHACH_TU_DI_2");
    assert.deepEqual([r.label, r.active], ["Khách tự đến bến", false]);
    assert.equal(await a.ev(noCode), "");
    await axe(a, "lý do sau sửa");
  });

  await b.step("9b", "R-P22: trang cũ vẫn hiện nút Ngưng cho lý do hệ thống (giả lập dữ liệu cũ thiếu cờ heThong) → bấm → máy chủ 409 `ly_do_he_thong` → dải lỗi câu lời thường; lý do vẫn đang dùng", async () => {
    const ax = await env.openPage(DESK);
    // Chỉ trang này: bọc fetch để GET danh mục lý do trả heThong = false (như bản app cũ / dữ liệu cũ) — máy chủ KHÔNG đổi; lệnh PUT đi thẳng tới máy chủ thật.
    await ax.send("Page.addScriptToEvaluateOnNewDocument", {
      source: `(() => { const f = window.fetch; window.fetch = async (u, init) => { const r = await f(u, init); if (String(u).endsWith('/api/van-chuyen/ly-do') && (!init || !init.method || init.method === 'GET')) { const j = await r.clone().json(); for (const x of j.reasons) x.heThong = false; return new Response(JSON.stringify(j), { status: r.status, headers: r.headers }); } return r; }; })();`,
    });
    const c = await env.login(ACCOUNTS.admin);
    await ax.send("Network.setCookie", { name: c.name, value: c.value, url: env.base, httpOnly: true });
    await ax.send("Page.navigate", { url: env.base + "/ly-do-dieu-phoi" });
    await ax.waitFor(`!!document.querySelector('.dp-reason[data-code="BO_QUA_KHONG_CON_KHACH"] [data-action="ngung"]')`, "trang giả lập cũ có nút Ngưng ở lý do hệ thống");
    await ax.ev(`document.querySelector('.dp-reason[data-code="BO_QUA_KHONG_CON_KHACH"] [data-action="ngung"]').click(); true`);
    await ax.waitFor(`${txt("#error")} === 'Lý do này do hệ thống tự dùng nên không ngưng được — chỉ sửa được tên và thứ tự.'`, "câu 409 ly_do_he_thong");
    const put = apiCalls(ax).filter((x) => x.method === "PUT");
    assert.equal(put.length, 1);
    const r = (await fetchTrang(ax, "GET", "/api/van-chuyen/ly-do")).json.reasons.find((x) => x.code === "BO_QUA_KHONG_CON_KHACH");
    // Đọc bằng phiên của trang giả lập (fetch bị bọc làm heThong = false) — chỉ khẳng định cờ đang dùng; cờ hệ thống có bài máy chủ riêng.
    assert.equal(r.active, true, "máy chủ không ngưng");
    assert.equal(await ax.ev(noCode), "");
    await shotView(ax, "b8-ly-do-he-thong-409-may-tinh.png");
    ax.close();
  });

  await b.step("10", "Quản trị mở thẳng /chinh-sach-dieu-phoi → câu tiếng Việt, không form; /dieu-kien-xuat-ben cũng vậy", async () => {
    await a.send("Page.navigate", { url: env.base + "/chinh-sach-dieu-phoi" });
    await a.waitFor(`${txt("#error")} === 'Chỉ Toàn quyền xem và đổi được chính sách điều phối.'`, "câu từ chối");
    assert.equal(await a.ev(shown("#cs-form")), false);
    await a.send("Page.navigate", { url: env.base + "/dieu-kien-xuat-ben" });
    await a.waitFor(`${txt("#error")} === 'Chỉ Toàn quyền xem và đổi được điều kiện xuất bến.'`, "câu từ chối điều kiện");
    assert.equal(await a.ev(shown("#dk-dieu-kien")), false);
  });
  a.close();

  const am = await env.as(ACCOUNTS.admin, "/ly-do-dieu-phoi", MOB);
  await am.waitFor(`document.querySelectorAll('.dp-group').length > 0`, "danh mục lý do (390) dựng xong");
  await b.step("11", "8d 390 Quản trị 'đang thêm': khung thêm trong nhóm, bộ đếm n/80, Thêm / Đóng; Đóng trả focus về nút thêm; không tràn; trang Tôi có 'Lý do điều phối', KHÔNG 'Chính sách điều phối'", async () => {
    await am.ev(`document.querySelector('.dp-group[data-nhom="BO_QUA_DIEM"] [data-action="them"]').click()`);
    await am.waitFor(shown('.dp-group[data-nhom="BO_QUA_DIEM"] .dp-panel input'), "khung thêm mở (390)");
    await am.ev(typeInto('.dp-group[data-nhom="BO_QUA_DIEM"] .dp-panel input', "Khách tự đi"));
    assert.equal(await am.ev(txt('.dp-group[data-nhom="BO_QUA_DIEM"] .dp-count-text')), "11/80");
    assert.ok(await am.ev(noOverflowX));
    assert.ok(parseFloat(await am.ev(`getComputedStyle(document.querySelector('.dp-panel input')).fontSize`)) >= 16);
    await axe(am, "lý do 390 đang thêm");
    await am.ev(`document.querySelector('.dp-group[data-nhom="BO_QUA_DIEM"]').scrollIntoView()`);
    await shotView(am, "b8-ly-do-dang-them-dien-thoai.png");
    await am.ev(click('.dp-panel [data-action="dong"]'));
    assert.equal(await am.ev(`document.activeElement.getAttribute('data-action')`), "them");
    await shotFull(am, "b8-ly-do-dien-thoai.png");
    await am.send("Page.navigate", { url: env.base + "/account" });
    await am.waitFor(shown("#vc-links"), "nhóm Vận chuyển ở trang Tôi (Quản trị)");
    const rows = await am.ev(`[...document.querySelectorAll('#vc-links a')].map((a) => a.innerText.replace(/\\s+/g, ' ').trim())`);
    assert.ok(rows.includes("Lý do điều phối") && !rows.includes("Chính sách điều phối"), JSON.stringify(rows));
  });
  am.close();

  // ---- Bán hàng ----------------------------------------------------------------------------------------------------------------------------------------------
  const s = await env.as(ACCOUNTS.salesA, "/ly-do-dieu-phoi", DESK);
  await b.step("12", "Bán hàng: nhóm Vận chuyển chỉ có \"Điều phối xe\" (B1, Q-B-4) — không Chính sách, không Lý do; mở thẳng hai trang → câu tiếng Việt, không dựng gì", async () => {
    await s.waitFor(`${txt("#error")} === 'Chỉ Quản trị, Toàn quyền xem và sửa được lý do điều phối.'`, "câu từ chối lý do");
    assert.equal(await s.ev(`document.querySelectorAll('.dp-group').length`), 0);
    assert.deepEqual((await s.ev(vcSub)).items, ["Điều phối xe"]);
    await s.send("Page.navigate", { url: env.base + "/chinh-sach-dieu-phoi" });
    await s.waitFor(`${txt("#error")} === 'Chỉ Toàn quyền xem và đổi được chính sách điều phối.'`, "câu từ chối chính sách");
  });
  await b.step("13", "Không lỗi console ở mọi trang đã mở", async () => {
    for (const [ten, pg] of [["toàn quyền 1040", p], ["toàn quyền 390", m], ["quản trị 1040", a], ["quản trị 390", am], ["bán hàng", s]]) {
      const loi = pg.consoleErrors.filter((e) => !/Failed to load resource: the server responded with a status of 40[13]/.test(e));
      assert.deepEqual(loi, [], ten);
    }
  });
  s.close();
} finally {
  b.xong();
  await env.stop();
}
