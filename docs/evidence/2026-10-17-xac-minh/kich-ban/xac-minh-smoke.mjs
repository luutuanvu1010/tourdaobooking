// Kịch bản Chrome — khối "Hàng chờ xác minh" ở /staff (ADR-0125 đ6; lát H-4 Gói 2). D1 tạm của vc-lib (không đụng dữ liệu thật). Mọi dữ liệu là dữ liệu THỬ (số giấy tờ GIẢ, chữ chính sách THỬ).
// 1) Đối tác thử khai ngày sinh + địa chỉ + giấy tờ (qua API); Toàn quyền thử khai ngày sinh của CHÍNH MÌNH (để thử ca "phiếu của chính bạn").
// 2) Nhân sự (390): /staff thấy hàng chờ 3 phiếu của đối tác; mở phiếu giấy tờ: số che, "Hiện số" → hộp xác nhận → số hiện, ẩn lại; "Chấp nhận" khoá kèm câu "chưa có ảnh"; Từ chối vẫn bấm được.
//    Nhân sự (1040): chấp nhận ngày sinh (có hộp xác nhận), từ chối địa chỉ (chọn lý do trong danh sách, KHÔNG ô chữ tự do); chấp nhận giấy tờ qua API → 409 "chưa có ảnh".
// 3) Nhân sự mở /parties → bị chặn (chưa có quyền Danh bạ).
// 4) Quản trị (390 + 1040): tab "Đã xử lý" có 2 dòng (mã phiếu, kết luận, người xử lý), không bấm xem lại được chi tiết.
// 5) Toàn quyền (mở SAU CÙNG — kho cookie chung): thấy phiếu giấy tờ; phiếu của chính mình: hiện lý do bị chặn bằng lời thường, KHÔNG nút Chấp nhận / Từ chối.
// Chạy từ GỐC repo, sau `npm run build:web`:
//   AXE_JS=<…/axe.min.js> CHROME_BIN=docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh OUT=docs/evidence/2026-10-17-xac-minh node docs/evidence/2026-10-17-xac-minh/kich-ban/xac-minh-smoke.mjs
import { ACCOUNTS, AXE, DESK, MOB, PARTNER, SUPER, assert, axeNote, boDem, dungMoiTruong, shotFull, sleep } from "../../2026-09-28-van-chuyen-1a/kich-ban/vc-lib.mjs";

/** axe-core (WCAG 2 A + AA + best-practice; tắt meta-viewport như mọi kịch bản Chrome của Nền tảng — mọi trang có maximum-scale=1): critical/serious ⇒ đỏ. */
const axe = async (p, nhan) => {
  if (!AXE) return;
  if (!(await p.ev("typeof axe !== 'undefined'"))) await p.ev(`${AXE}\n;true`);
  const vi = await p.ev(`axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'best-practice'], rules: { 'meta-viewport': { enabled: false } } }).then((r) => r.violations.map((v) => ({ impact: v.impact, id: v.id, nodes: v.nodes.slice(0, 4).map((n) => n.target.join(' ')) })))`);
  const nang = vi.filter((v) => v.impact === "critical" || v.impact === "serious");
  assert.deepEqual(nang, [], `axe nghiêm trọng (${nhan}): ${JSON.stringify(nang)}`);
  if (vi.length) console.log(`  (axe nhẹ, ${nhan}: ${vi.map((v) => `${v.impact} ${v.id}`).join(", ")})`);
};
const HR = { name: "Nhân Sự Thử", phone: "0900000511", pin: "246511", permissions: ["HR"] };
const dem = boDem("XAC MINH SMOKE");
const { env, call } = await dungMoiTruong([PARTNER, SUPER, HR]);
const SO = "079777888999"; // số GIẢ
const vung = (p) => p.ev(`(() => {
  const s = document.querySelector('#xac-minh');
  const t = (el) => (el ? el.innerText.replace(/\\s+/g, ' ').trim() : null);
  return s && { hien: !s.hidden && s.getClientRects().length > 0, chu: t(s), the: s.querySelectorAll('.xm-the').length,
    nut: [...s.querySelectorAll('button')].filter((b) => b.getClientRects().length > 0).map((b) => ({ chu: b.innerText.trim(), tat: b.disabled })),
    textarea: s.querySelectorAll('textarea, input[type=text]').length, html: document.documentElement.outerHTML,
    co16: [...s.querySelectorAll('input:not([type=radio])')].filter((e) => e.getClientRects().length > 0).map((e) => getComputedStyle(e).fontSize) };
})()`);
const bam = (p, chu, trong = "#xac-minh") => p.ev(`(() => { const b = [...document.querySelectorAll(${JSON.stringify(trong)} + ' button')].find((x) => x.getClientRects().length > 0 && x.innerText.replace(/\\s+/g, ' ').trim() === ${JSON.stringify(chu)}); if (!b) return false; b.click(); return true; })()`);
const moThe = (p, chuLoai) => p.ev(`(() => { const t = [...document.querySelectorAll('#xac-minh button.xm-the')].find((x) => x.innerText.includes(${JSON.stringify(chuLoai)})); if (!t) return false; t.click(); return true; })()`);
try {
  // ---- Dữ liệu thử qua API ----
  const cs = await call(SUPER, "POST", "/api/parties/chinh-sach-rieng-tu", { mucDich: "THỬ — mục đích thử nghiệm", noiDung: "THỬ — toàn văn thử nghiệm, không phải văn bản pháp lý." });
  assert.equal(cs.status, 201, cs.text);
  for (const [tk, ten] of [[PARTNER, "đối tác"], [SUPER, "toàn quyền"]]) {
    const hs = (await call(tk, "GET", "/api/parties/cua-toi")).json;
    const dy = await call(tk, "POST", "/api/parties/cua-toi/dong-y", { chinhSachId: hs.chinhSach.id, quyetDinh: "DONG_Y" });
    assert.equal(dy.status, 200, `đồng ý (${ten}): ${dy.text}`);
    const gui = async (body) => { const r = await call(tk, "POST", "/api/parties/cua-toi/phieu", { chinhSachId: hs.chinhSach.id, ...body }); assert.equal(r.status, 201, `gửi phiếu (${ten}): ${r.text}`); };
    if (tk === PARTNER) {
      await gui({ loai: "NGAY_SINH", ngaySinh: "1990-05-17" });
      await gui({ loai: "DIA_CHI", diaChi: "THỬ — 12 đường Thử, Nha Trang" });
      await gui({ loai: "GIAY_TO", giayTo: { typeCode: "CCCD", number: SO, classCode: null, issuedDate: null, issuedPlace: null, expiryDate: null } });
    } else await gui({ loai: "NGAY_SINH", ngaySinh: "1985-01-02" });
  }

  for (const [id, ten, vp] of [["2a", "390", MOB]]) {
    await dem.step(id, `Nhân sự (${ten}): hàng chờ 3 phiếu; phiếu giấy tờ: số che, Hiện số có xác nhận, Chấp nhận khoá kèm giải thích` + axeNote(), async () => {
      const p = await env.as(HR, "/staff", vp);
      try {
        await p.waitFor("document.querySelectorAll('#xac-minh .xm-the-cho').length === 3", "3 phiếu chờ", 15000);
        let s = await vung(p);
        assert.ok(s.hien && s.chu.includes("Hàng chờ xác minh") && s.chu.includes("Chuyển") === false, s.chu);
        assert.equal(s.textarea, 0, "không có ô chữ tự do");
        assert.ok(!s.html.includes(SO), "số đủ không có trong DOM khi chưa bấm Hiện số");
        await shotFull(p, `hang-cho-nhan-su-${ten}.png`);
        assert.ok(await moThe(p, "Giấy tờ"), "mở phiếu giấy tờ");
        await p.waitFor("!!document.querySelector('#xm-hien-so')", "nút Hiện số", 8000);
        s = await vung(p);
        assert.ok(s.chu.includes("••••8999") && !s.html.includes(SO), `số che: ${s.chu}`);
        assert.ok(s.chu.includes("chưa có ảnh"), "câu giải thích chưa có ảnh");
        const chap = s.nut.find((b) => b.chu === "Chấp nhận");
        assert.ok(chap && chap.tat === true, "Chấp nhận phải khoá");
        const tu = s.nut.find((b) => b.chu === "Từ chối");
        assert.ok(tu && tu.tat === false, "Từ chối vẫn dùng được");
        assert.ok(await bam(p, "Hiện số"));
        await p.waitFor("!document.querySelector('#xac-minh .xm-xac-nhan').hidden", "hộp xác nhận xem số", 5000);
        assert.ok((await vung(p)).chu.includes("Mỗi lần xem được ghi vào nhật ký. Xem số?"));
        assert.ok(!(await vung(p)).html.includes(SO), "chưa xác nhận thì chưa có số");
        assert.ok(await bam(p, "Xem số"));
        await p.waitFor(`document.querySelector('#xm-so').innerText === '${SO}'`, "số đủ hiện", 8000);
        await shotFull(p, `hang-cho-giay-to-so-hien-${ten}.png`);
        assert.ok(await bam(p, "Ẩn số"));
        s = await vung(p);
        assert.ok(!s.html.includes(SO), "ẩn số xong, DOM không còn số");
        await axe(p, `hang-cho ${ten}`);
        const store = await p.ev("JSON.stringify([Object.entries(localStorage), Object.entries(sessionStorage), location.href])");
        assert.ok(!store.includes(SO), "số không được ở lưu trữ trình duyệt / URL");
      } finally {
        p.close();
      }
    });
  }
  await dem.step("2b", "Nhân sự (1040): chấp nhận ngày sinh (hộp xác nhận), từ chối địa chỉ (danh sách lý do đóng), chấp nhận giấy tờ → 409 chưa có ảnh" + axeNote(), async () => {
    const p = await env.as(HR, "/staff", DESK);
    try {
      await p.waitFor("document.querySelectorAll('#xac-minh .xm-the-cho').length === 3", "3 phiếu chờ", 15000);
      await shotFull(p, "hang-cho-nhan-su-1040.png");
      assert.ok(await moThe(p, "Ngày sinh"));
      await p.waitFor("!!document.querySelector('#xm-chap-nhan')", "chi tiết ngày sinh", 8000);
      let s = await vung(p);
      assert.ok(s.chu.includes("17/05/1990") || s.chu.includes("1990"), s.chu);
      await shotFull(p, "chi-tiet-ngay-sinh-1040.png");
      assert.ok(await bam(p, "Chấp nhận"));
      await p.waitFor("!document.querySelector('#xm-xac-nhan-chap').hidden", "hộp xác nhận chấp nhận", 5000);
      assert.ok((await vung(p)).chu.includes("Chấp nhận nguyên văn thông tin khai? Người xác minh không sửa được thông tin."));
      assert.ok(await p.ev(`(() => { const b = [...document.querySelectorAll('#xm-xac-nhan-chap button')].find((x) => x.innerText.trim() === 'Chấp nhận'); b.click(); return true; })()`));
      await p.waitFor("document.querySelectorAll('#xac-minh .xm-the-cho').length === 2 && !!document.querySelector('#xac-minh .alert.ok:not([hidden])')", "còn 2 phiếu + báo đã chấp nhận", 10000);
      // Từ chối địa chỉ
      assert.ok(await moThe(p, "Địa chỉ"));
      await p.waitFor("!!document.querySelector('#xm-tu-choi')", "chi tiết địa chỉ", 8000);
      assert.ok(await bam(p, "Từ chối"));
      await p.waitFor("!document.querySelector('#xm-khung-tu-choi').hidden", "khung lý do", 5000);
      s = await vung(p);
      assert.equal(s.textarea, 0, "từ chối không có ô chữ tự do");
      assert.equal(s.nut.find((b) => b.chu === "Gửi từ chối").tat, true, "chưa chọn lý do thì chưa gửi được");
      assert.ok(s.chu.includes("Thông tin khai không khớp giấy tờ") && s.chu.includes("Giấy tờ đã hết hạn"), "danh sách lý do");
      await p.ev("document.querySelector('input[name=xm-ly-do][value=KHONG_DOC_DUOC]').click()");
      await shotFull(p, "tu-choi-chon-ly-do-1040.png");
      await axe(p, "hang-cho tu-choi 1040");
      assert.equal((await vung(p)).nut.find((b) => b.chu === "Gửi từ chối").tat, false);
      assert.ok(await bam(p, "Gửi từ chối"));
      await p.waitFor("document.querySelectorAll('#xac-minh .xm-the-cho').length === 1", "còn 1 phiếu", 10000);
      // Chấp nhận giấy tờ qua API: máy chủ chặn bằng câu tiếng Việt (giao diện cũng đã khoá nút).
      const ds = (await call(HR, "GET", "/api/parties/xac-minh?trang=cho")).json.phieu;
      assert.equal(ds.length, 1);
      const r = await call(HR, "POST", `/api/parties/xac-minh/${ds[0].id}/chap-nhan`, {});
      assert.equal(r.status, 409, r.text);
      assert.ok(r.json.error.message.includes("chưa có ảnh"), r.text);
      await axe(p, "hang-cho 1040");
      await shotFull(p, "hang-cho-sau-xu-ly-1040.png");
    } finally {
      p.close();
    }
  });
  await dem.step("3", "Nhân sự mở /parties → bị chặn", async () => {
    const p = await env.as(HR, "/parties", DESK);
    try {
      await sleep(1500);
      const t = await p.ev("JSON.stringify({ url: location.pathname, chu: document.body.innerText.replace(/\\s+/g, ' ').slice(0, 300), bang: !!document.querySelector('#list tr, .card-list .card') })");
      const v = JSON.parse(t);
      assert.ok(v.url !== "/parties" || /không|chưa có quyền|từ chối/i.test(v.chu), t);
      await shotFull(p, "nhan-su-mo-danh-ba-1040.png");
    } finally {
      p.close();
    }
  });
  for (const [id, ten, vp] of [["4a", "390", MOB], ["4b", "1040", DESK]]) {
    await dem.step(id, `Quản trị (${ten}): tab Đã xử lý có 2 dòng, không xem lại được chi tiết` + axeNote(), async () => {
      const p = await env.as(ACCOUNTS.admin, "/staff", vp);
      try {
        await p.waitFor("!!document.querySelector('#xac-minh #xm-tab-xong')", "khối", 15000);
        await p.waitFor("document.querySelectorAll('#xac-minh .xm-the-cho').length === 1", "1 phiếu còn chờ", 10000);
        assert.ok(await bam(p, "Đã xử lý"));
        await p.waitFor("document.querySelectorAll('#xac-minh .xm-the-xong').length === 2", "2 dòng đã xử lý", 10000);
        const s = await vung(p);
        assert.ok(s.chu.includes("Đã xác minh") && s.chu.includes("Bị từ chối · Thông tin không đọc được hoặc không rõ"), s.chu);
        assert.ok(s.chu.includes("Nhân Sự Thử") && /Phiếu [0-9a-f]{6}\b/.test(s.chu), s.chu);
        assert.ok(!s.chu.includes("1990") && !s.chu.includes("Nha Trang") && !s.html.includes(SO), "hàng đã xử lý không lộ giá trị");
        assert.equal(await p.ev("document.querySelectorAll('#xac-minh .xm-the-xong button, #xac-minh .xm-the-xong a').length"), 0, "dòng đã xử lý không bấm được");
        await axe(p, `da-xu-ly ${ten}`);
        await shotFull(p, `da-xu-ly-quan-tri-${ten}.png`);
      } finally {
        p.close();
      }
    });
  }
  await dem.step("5", "Toàn quyền (mở sau cùng): phiếu của chính mình bị chặn bằng lời thường, không nút xử lý" + axeNote(), async () => {
    for (const [ten, vp] of [["1040", DESK], ["390", MOB]]) {
      const p = await env.as(SUPER, "/staff", vp);
      try {
        await p.waitFor("document.querySelectorAll('#xac-minh .xm-the-cho').length === 2", "2 phiếu chờ (giấy tờ của đối tác + của chính mình)", 15000);
        let s = await vung(p);
        assert.ok(s.chu.includes("Đây là phiếu của chính bạn."), s.chu);
        await shotFull(p, `hang-cho-toan-quyen-${ten}.png`);
        assert.ok(await p.ev(`(() => { const t = [...document.querySelectorAll('#xac-minh button.xm-the-cho')].find((x) => x.innerText.includes('chính bạn')); if (!t) return false; t.click(); return true; })()`));
        await p.waitFor("!!document.querySelector('#xm-khong-duoc')", "lý do bị chặn ở chi tiết", 8000);
        s = await vung(p);
        assert.ok(s.chu.includes("Đây là phiếu của chính bạn."), s.chu);
        assert.ok(!s.nut.some((b) => b.chu === "Chấp nhận" || b.chu === "Từ chối"), `không nút xử lý: ${JSON.stringify(s.nut)}`);
        assert.ok(!s.chu.includes("1985") && !s.chu.includes("02/01"), "người bị chặn không thấy giá trị khai");
        await axe(p, `toan-quyen chan ${ten}`);
        await shotFull(p, `chi-tiet-bi-chan-toan-quyen-${ten}.png`);
      } finally {
        p.close();
      }
    }
  });
} finally {
  await env.stop();
}
dem.xong();
