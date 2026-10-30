// Biểu thức đo «lưới bố cục» CHẠY TRONG TRANG (Chặng 3, 30/10/2026). Chỉ đọc DOM + getComputedStyle + getBoundingClientRect, không sửa gì.
// Trả một đối tượng: a) bề rộng vùng nội dung + quy tắc max-width, b) hàng «chữ một đầu, nút một đầu», c) ô nhập lệch độ dài dữ liệu,
// d) vùng trống chiếm chỗ, e) (390) tràn ngang + hàng nút lộn xộn, f) tên trang lặp giữa thanh trên và thân.
(() => {
  const vw = innerWidth, vh = innerHeight;
  const cs = (el) => getComputedStyle(el);
  const R = (el) => el.getBoundingClientRect();
  const r0 = (n) => Math.round(n);
  const thay = (el) => { const r = R(el); if (r.width < 1 || r.height < 1) return false; const s = cs(el); return s.visibility !== "hidden" && s.display !== "none" && Number(s.opacity) !== 0; };
  const chon = (el) => { if (!el || el === document.body) return "body"; const id = el.id ? `#${el.id}` : ""; const c = (typeof el.className === "string" ? el.className : "").trim().split(/\s+/).filter(Boolean).slice(0, 3).map((x) => "." + x).join(""); return `${el.tagName.toLowerCase()}${id}${c}`; };
  const duong = (el) => { const p = []; let e = el; for (let i = 0; e && e !== document.body && i < 4; i++, e = e.parentElement) p.unshift(chon(e)); return p.join(" > "); };
  const chu = (el) => (el.innerText || "").trim().replace(/\s+/g, " ");
  const main = document.querySelector("main");
  if (!main) return { loi: "không có main" };
  scrollTo(0, 0);
  // Trang rất dài (Dịch vụ, Hướng dẫn, Nhật ký…): b/c/d chỉ xét phần tử nằm trong 6 màn đầu để một lần đo không vượt hạn 45 s của CDP.
  const TRAN_DOC = 6 * vh; const catDoc = document.documentElement.scrollHeight > TRAN_DOC;
  const trongTam = (el) => R(el).top < TRAN_DOC;

  // ---------- Bảng token --w-* (tên → px) để gọi tên quy tắc max-width ----------
  const tenToken = new Set();
  for (const ss of document.styleSheets) { let rules; try { rules = ss.cssRules; } catch { continue; } for (const ru of rules) { const st = ru.style; if (!st) continue; for (let i = 0; i < st.length; i++) if (st[i].startsWith("--w-") || st[i].startsWith("--price") ) tenToken.add(st[i]); } }
  const goc = cs(document.documentElement);
  const doi = document.createElement("div"); doi.style.cssText = "position:absolute;visibility:hidden;height:0"; document.body.appendChild(doi);
  const pxCua = (v) => { doi.style.width = v; return Math.round(parseFloat(cs(doi).width)); };
  const tokenTheoPx = {};
  for (const t of tenToken) { const v = goc.getPropertyValue(t).trim(); if (!v || !/px|rem|var\(|calc/.test(v)) continue; const px = pxCua(`var(${t})`); if (px > 0) (tokenTheoPx[px] ||= []).push(t); }
  doi.remove();
  // Quy tắc CSS khớp phần tử mà khai max-width (để ghi tên lớp/chọn lọc thật).
  const quyTacMaxWidth = (el) => { const ra = []; for (const ss of document.styleSheets) { let rules; try { rules = ss.cssRules; } catch { continue; } const duyet = (list, mq) => { for (const ru of list) { if (ru.cssRules && !ru.selectorText) { if (ru.media && !matchMedia(ru.media.mediaText).matches) continue; duyet(ru.cssRules, ru.media?.mediaText ?? mq); continue; } if (!ru.selectorText || !ru.style?.maxWidth) continue; try { if (el.matches(ru.selectorText)) ra.push({ sel: ru.selectorText.slice(0, 120), maxWidth: ru.style.maxWidth, mq: mq ?? null }); } catch { /* chọn lọc lạ */ } } }; duyet(ss.cssRules, null); } return ra; };

  const mucMain = () => { const range0 = document.createRange(); let l = 1e9, r = 0; const tw = document.createTreeWalker(main, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT); for (let n = tw.currentNode; n; n = tw.nextNode()) { let q = null; if (n.nodeType === 3) { if (!n.data.trim() || !n.parentElement || !thay(n.parentElement) || cs(n.parentElement).position === "fixed") continue; range0.selectNodeContents(n); q = range0.getBoundingClientRect(); } else if (/^(INPUT|SELECT|TEXTAREA|BUTTON|IMG)$/i.test(n.tagName) && thay(n)) q = R(n); if (q && q.width > 0 && q.top < TRAN_DOC) { l = Math.min(l, q.left); r = Math.max(r, q.right); } } return r ? { l, r } : null; };
  // ---------- a) Vùng nội dung ----------
  const sb = document.querySelector(".sidebar");
  const cotTrai = sb && thay(sb) ? r0(R(sb).right) : 0;
  const cotRong = vw - cotTrai; // bề rộng cột nội dung (sau thanh bên)
  const mr = R(main), ms = cs(main);
  const conDau = [...main.children].find((c) => thay(c) && !c.classList.contains("xuong-trang") && chu(c).length > 0 && R(c).height > 20);
  // Chuỗi tổ tiên từ khối con đầu tới main có max-width (cái hẹp nhất quyết định).
  const xich = [];
  for (let e = conDau; e; e = e.parentElement) { const mw = cs(e).maxWidth; if (mw !== "none") xich.push({ phanTu: chon(e), maxWidth: mw, rong: r0(R(e).width), token: tokenTheoPx[r0(parseFloat(mw))] ?? null, quyTac: quyTacMaxWidth(e).slice(-2) }); if (e === main) break; }
  // Mức chữ/ô thật xa nhất bên phải trong main (đo «mực», không đo hộp).
  const mm = mucMain(); const mucPhai = mm ? mm.r : 0, mucTrai = mm ? mm.l : 1e9;
  // Khối cấp một của main (bỏ tiêu đề, dải anh em, đoạn chú thích, thông báo, phần ẩn): bề rộng từng khối.
  const BO_QUA = (c) => /^(H1|H2|H3|NAV|P|SCRIPT|A)$/.test(c.tagName) || c.matches(".dai-anh-em, .alert, .banner, .visually-hidden, .xuong-trang, #error, .bo-qua");
  const khoiCap1 = [...main.children].filter((c) => thay(c) && !BO_QUA(c) && R(c).height > 30).map((c) => ({ phanTu: chon(c), rong: r0(R(c).width), cao: r0(R(c).height), maxWidth: cs(c).maxWidth }));
  // Trần bề rộng ĐANG CHẶN: phần tử trong main (rộng ≥ 200) có max-width bằng px và bề rộng thật = trần (±2 px), tức nội dung bị bó lại ở đó.
  const tranChan = [];
  for (const e of [main, ...main.querySelectorAll("*")]) { if (!thay(e) || !trongTam(e)) continue; const mw = cs(e).maxWidth; if (!mw.endsWith("px")) continue; const w = R(e).width; const px = parseFloat(mw); if (w < 200 || Math.abs(w - px - (cs(e).boxSizing === "content-box" ? parseFloat(cs(e).paddingLeft) + parseFloat(cs(e).paddingRight) + parseFloat(cs(e).borderLeftWidth) + parseFloat(cs(e).borderRightWidth) : 0)) > 2) continue; tranChan.push({ phanTu: duong(e), maxWidth: mw, token: tokenTheoPx[r0(px)] ?? null, quyTac: quyTacMaxWidth(e).slice(-2), styleNoiTuyen: e.getAttribute("style")?.includes("max-width") ? e.getAttribute("style") : null, trongPhai: r0(mr.right - parseFloat(ms.paddingRight) - R(e).right) }); }
  const a = {
    vw, cotTrai, cotRong, khoiCap1, tranChan: tranChan.slice(0, 12),
    rongKhoiLonNhat: khoiCap1.length ? Math.max(...khoiCap1.map((k) => k.rong)) : null,
    main: { trai: r0(mr.left), rong: r0(mr.width), maxWidth: ms.maxWidth, token: tokenTheoPx[r0(parseFloat(ms.maxWidth))] ?? null, dem: `${ms.paddingLeft}/${ms.paddingRight}`, lop: chon(main), khuonData: document.body.dataset.khuon ?? main.dataset.khuon ?? null, quyTac: quyTacMaxWidth(main).slice(-3), styleNoiTuyen: main.getAttribute("style") },
    conDau: conDau ? { phanTu: duong(conDau), trai: r0(R(conDau).left), rong: r0(R(conDau).width), maxWidth: cs(conDau).maxWidth } : null,
    xichMaxWidth: xich,
    trongTraiMain: r0(mr.left - cotTrai), trongPhaiMain: r0(vw - mr.right), // phần cột nội dung main KHÔNG dùng
    trongPhaiConDau: conDau ? r0(mr.right - parseFloat(ms.paddingRight) - R(conDau).right) : null,
    mucPhai: r0(mucPhai), trongPhaiMuc: r0(vw - mucPhai), tiLeMucDung: +(((mucPhai - (mucTrai === 1e9 ? cotTrai : mucTrai)) / cotRong) || 0).toFixed(2),
  };

  // ---------- b) Hàng «chữ một đầu, nút một đầu» ----------
  // «Mực» của một phần tử = hợp các hộp lá thấy được bên trong (chữ, ô, nút, ảnh) — ô lưới rộng mà chữ ngắn vẫn tính đúng khoảng trống.
  // Mực = hợp hộp CHỮ THẬT (Range trên nút chữ, không phải hộp khối của phần tử chứa) + hộp ô/nút/ảnh/biểu tượng thấy được.
  const range = document.createRange();
  const mucRects = (el) => { const out = []; const tw = document.createTreeWalker(el, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT); for (let n = tw.currentNode; n; n = tw.nextNode()) { if (n.nodeType === 3) { if (!n.data.trim() || !n.parentElement || !thay(n.parentElement)) continue; range.selectNodeContents(n); const r = range.getBoundingClientRect(); if (r.width > 0) out.push(r); } else if (/^(INPUT|SELECT|TEXTAREA|BUTTON|IMG|svg|CANVAS)$/i.test(n.tagName) && thay(n)) out.push(R(n)); } return out; };
  const muc = (el) => { const ds = mucRects(el); if (!ds.length) return null; let l = 1e9, rr = -1e9, t = 1e9, b = -1e9; for (const r of ds) { l = Math.min(l, r.left); rr = Math.max(rr, r.right); t = Math.min(t, r.top); b = Math.max(b, r.bottom); } return { l, r: rr, t, b }; };
  const hang = [];
  for (const el of main.querySelectorAll("*")) {
    if (!thay(el) || !trongTam(el)) continue; const s = cs(el);
    const laFlexHang = (s.display.includes("flex") && !s.flexDirection.startsWith("column")) || s.display.includes("grid");
    if (!laFlexHang || R(el).width < 300) continue;
    const con = [...el.children].filter((c) => thay(c) && !["absolute", "fixed"].includes(cs(c).position));
    if (con.length < 2 || con.length > 6) continue;
    const mucs = con.map((c) => ({ c, m: muc(c) })).filter((x) => x.m);
    if (mucs.length < 2) continue;
    // chỉ xét các cụm cùng một dòng (chồng nhau theo chiều dọc)
    mucs.sort((x, y) => x.m.l - y.m.l);
    let gapMax = 0, viTri = -1;
    for (let i = 1; i < mucs.length; i++) { const p = mucs[i - 1].m, q = mucs[i].m; const cungDong = Math.min(p.b, q.b) - Math.max(p.t, q.t) > 4; if (!cungDong) continue; const g = q.l - p.r; if (g > gapMax) { gapMax = g; viTri = i; } }
    if (gapMax <= 120) continue; // ghi từ 120 px; bảng tóm tắt đếm > 240 px theo đề bài
    const phai = mucs[viTri].c; const trai = mucs[viTri - 1].c;
    if (!chu(trai) && !chu(phai)) continue;
    const coNut = [phai, trai].some((x) => x.matches("button, a, .btn, input, select") || x.querySelector("button, a.btn, .btn, input, select"));
    hang.push({ phanTu: duong(el), display: s.display, jc: s.justifyContent, khoang: r0(gapMax), soCum: mucs.length, coNut, trai: chu(trai).slice(0, 40), phai: chu(phai).slice(0, 40), mlAutoPhai: parseFloat(cs(phai).marginLeft) > 40 });
  }
  // Bỏ trùng: cha và con báo cùng một khoảng trống (lệch ≤ 8 px) → giữ phần tử trong cùng.
  const hangGon = hang.filter((h, i) => !hang.some((k, j) => j > i && Math.abs(k.khoang - h.khoang) <= 8 && (k.trai.startsWith(h.trai) || h.trai.startsWith(k.trai)) && (k.phai.endsWith(h.phai) || h.phai.endsWith(k.phai))));
  hangGon.sort((x, y) => y.khoang - x.khoang);

  // ---------- c) Ô nhập so với độ dài dữ liệu ----------
  const nhanCua = (el) => { const l = (el.id && document.querySelector(`label[for="${CSS.escape(el.id)}"]`)) || el.closest("label"); return [el.getAttribute("aria-label"), l && chu(l), el.getAttribute("placeholder"), el.name, el.id].filter(Boolean).join(" | ").slice(0, 80); };
  const oNhap = [...main.querySelectorAll("input:not([type=hidden]):not([type=checkbox]):not([type=radio]):not([type=file]), select, textarea")].filter((e) => thay(e) && trongTam(e));
  // Thứ tự xếp loại: thẻ (ô nhiều dòng, ô chọn) → kiểu ô → chữ nhãn. Ô chọn và ô nhiều dòng không xét lệch độ dài.
  const loaiO = (el) => { const t = (el.type || "").toLowerCase(); const n = nhanCua(el).toLowerCase(); const im = el.inputMode || el.getAttribute("inputmode") || ""; const dau = n.split(" | ")[0];
    if (el.tagName === "TEXTAREA") return "dai"; if (el.tagName === "SELECT") return "chon";
    if (t === "search" || /tìm/.test(dau) || /(^|\| )q$/.test(n)) return "tim";
    if (t === "tel" || /sđt|điện thoại|phone|số đt/.test(dau)) return "sdt";
    if (/^(date|datetime-local|time|month|week)$/.test(t)) return "ngay";
    if (t === "number" || /numeric|decimal/.test(im) || /tiền|giá|số lượng|\bsl\b|%|hoa hồng|phí|cọc|vnđ|đơn giá|usd|token|số câu|hạn/.test(dau)) return "so";
    if (/\bngày\b|\bgiờ\b/.test(dau)) return "ngay";
    if (/(họ )?tên|name/.test(dau) && !/tên đăng nhập/.test(dau)) return "ten";
    return "khac"; };
  const oDo = oNhap.map((el) => ({ loai: loaiO(el), rong: r0(R(el).width), nhan: nhanCua(el), phanTu: chon(el) }));
  // Khung ô bỏ trống phải: form/thẻ có ô nhập mà mép phải ô/nhãn/nút xa nhất còn cách mép trong khung > 240 px (ô ngắn, nửa phải trống).
  const khungO = [];
  for (const k of [...main.querySelectorAll("form, fieldset, .card, section")].filter((e) => thay(e) && trongTam(e))) {
    const os = oNhap.filter((o) => k.contains(o)); if (!os.length) continue;
    const kr = R(k); const trongK = kr.right - parseFloat(cs(k).paddingRight) - parseFloat(cs(k).borderRightWidth);
    const cac = [...k.querySelectorAll("input, select, textarea, button, label, .btn")].filter(thay); const phai = Math.max(...cac.map((e) => R(e).right));
    const gap = trongK - phai; if (gap > 240) khungO.push({ phanTu: duong(k), rongKhung: r0(kr.width), mepPhaiO: r0(phai - kr.left), trongPhai: r0(gap), o: os.slice(0, 4).map((o) => `${nhanCua(o).split(" | ")[0].slice(0, 24)} ${r0(R(o).width)}`) });
  }
  // Thêm: lưới ô (grid/flex có ô nhập) mà DÒNG đầu chỉ lấp một phần — dòng ô nhập ngắn, phần phải dòng trống > 240 px.
  for (const g of [...main.querySelectorAll("*")].filter((e) => thay(e) && trongTam(e) && cs(e).display.includes("grid") && e.querySelector("input, select, textarea"))) {
    const con = [...g.children].filter((c) => thay(c) && c.querySelector("input:not([type=checkbox]):not([type=radio]), select, textarea, button") ); if (!con.length) continue;
    const gr = R(g); const theoDong = {}; for (const c of con) { const k = r0(R(c).top / 8); (theoDong[k] ||= []).push(c); }
    for (const ds of Object.values(theoDong)) { const phai = Math.max(...ds.map((c) => { const m = muc(c); return m ? m.r : R(c).left; })); const gap = gr.right - parseFloat(cs(g).paddingRight) - phai; if (gap > 240) { khungO.push({ phanTu: duong(g) + " (một dòng lưới)", rongKhung: r0(gr.width), mepPhaiO: r0(phai - gr.left), trongPhai: r0(gap), o: ds.slice(0, 4).map((c) => { const o = c.querySelector("input, select, textarea, button"); return `${(o ? nhanCua(o) : chu(c)).split(" | ")[0].slice(0, 24)} ${o ? r0(R(o).width) : ""}`; }) }); break; } }
  }
  const khungOGon = khungO.filter((v, i) => !khungO.some((k2, j) => j > i && k2.phanTu.startsWith(v.phanTu.split(" > ")[0]) && Math.abs(k2.trongPhai - v.trongPhai) < 24 && k2.phanTu.length > v.phanTu.length));
  const oLech = oDo.filter((o) => (["sdt", "ngay", "so"].includes(o.loai) && o.rong > 480) || (o.loai === "ten" && o.rong < 200));

  // ---------- d) Vùng trống chiếm chỗ ----------
  const nguong = 0.2 * (mr.width - parseFloat(ms.paddingLeft) - parseFloat(ms.paddingRight));
  const GOI_Y = /^(chọn|chưa có|không có|trống|chưa|hãy|bấm|—|-|…)/i;
  const demNoiDung = (el) => [...el.querySelectorAll("*")].filter((e) => thay(e) && ((e.children.length === 0 && chu(e)) || /^(INPUT|SELECT|TEXTAREA|BUTTON|IMG)$/.test(e.tagName))).length;
  const vung = [];
  for (const el of main.querySelectorAll("*")) {
    if (!thay(el) || !trongTam(el)) continue; const p = el.parentElement; if (!p || !thay(p)) continue; const ps = cs(p);
    if (el.matches("input, select, textarea, button, label") || el.querySelector("input, select, textarea, button")) continue; // ô của biểu mẫu không phải «vùng trống»
    const canhNhau = (ps.display.includes("grid") || (ps.display.includes("flex") && !ps.flexDirection.startsWith("column")));
    if (!canhNhau) continue;
    const anhEm = [...p.children].filter((c) => c !== el && thay(c) && Math.min(R(c).bottom, R(el).bottom) - Math.max(R(c).top, R(el).top) > 20);
    if (!anhEm.length) continue; // không có ngăn bên cạnh cùng hàng → không phải «cột/ngăn»
    const r = R(el); const caoHang = Math.max(r.height, ...anhEm.map((c) => R(c).height)); // ngăn ngắn cạnh ngăn dài: chỗ chiếm = chiều cao hàng
    if (r.width < nguong || caoHang < 100) continue;
    const n = demNoiDung(el); const t = chu(el);
    const goiY = t.length > 0 && t.length < 120 && GOI_Y.test(t);
    if (n < 3 || goiY) vung.push({ phanTu: duong(el), rong: r0(r.width), cao: r0(r.height), caoHang: r0(caoHang), tiLe: +(r.width / (mr.width || 1)).toFixed(2), soNoiDung: n, chu: t.slice(0, 80) });
  }
  // Cột bảng: cột rộng ≥ 20% bề rộng bảng mà ô có chữ < 3 hoặc ≥ 50% ô trống/«—».
  for (const tb of [...main.querySelectorAll("table")].filter(thay)) {
    const ths = [...tb.querySelectorAll("thead th")]; const rows = [...tb.querySelectorAll("tbody tr")].filter(thay); const tr = R(tb);
    ths.forEach((th, i) => { const w = R(th).width; if (w < 0.2 * tr.width) return; const o = rows.map((rw) => rw.children[i]).filter(Boolean); const day = o.filter((td) => { const x = chu(td); return x && !/^[—–-]$/.test(x); }).length; if (o.length && (day < 3 || day / o.length <= 0.5)) vung.push({ phanTu: `${chon(tb)} cột «${chu(th).slice(0, 30)}»`, rong: r0(w), cao: r0(tr.height), tiLe: +(w / tr.width).toFixed(2), soNoiDung: day, chu: `${day}/${o.length} ô có chữ`, cotBang: true }); });
  }
  // Bỏ trùng lồng nhau: giữ ngoài cùng nếu con cùng bề rộng.
  const vungGon = vung.filter((v, i) => !vung.some((k, j) => j < i && v.phanTu.startsWith(k.phanTu) && Math.abs(k.rong - v.rong) < 24));

  // ---------- e) Tràn ngang + hàng nút lộn xộn (dùng ở 390, đo ở mọi khổ) ----------
  const trongCuonNgang = (e) => { for (let x = e.parentElement; x && x !== document.body; x = x.parentElement) { const s = cs(x); if (/(auto|scroll|hidden)/.test(s.overflowX) && x.scrollWidth > x.clientWidth + 1) return true; } return false; };
  const tranNgang = document.documentElement.scrollWidth > vw + 1;
  const thoRa = [...document.querySelectorAll("body *")].filter((e) => thay(e) && cs(e).position !== "fixed" && R(e).right > vw + 2 && !trongCuonNgang(e)).map((e) => ({ phanTu: duong(e), phai: r0(R(e).right) }));
  const thoRaGon = thoRa.filter((t, i) => !thoRa.some((k, j) => j !== i && t.phanTu.startsWith(k.phanTu) && t.phanTu !== k.phanTu)).slice(0, 12);
  const laNut = (e) => e.matches("button, a.btn, .btn, input[type=submit], input[type=button], a[role=button]");
  const hangNut = [];
  for (const el of document.querySelectorAll("main *, .form-actions, .vc-bottom-bar")) {
    if (!thay(el) || !main.contains(el) && !el.matches(".form-actions, .vc-bottom-bar")) continue;
    const s = cs(el); if (!s.display.includes("flex") && !s.display.includes("grid")) continue;
    const nut = [...el.children].filter((c) => thay(c) && laNut(c)); if (nut.length < 2) continue;
    const rs = nut.map(R); const dong = [...new Set(rs.map((r) => r0(r.top / 6)))].length; const caos = rs.map((r) => r0(r.height)); const khacCao = Math.max(...caos) - Math.min(...caos) > 4;
    const soMoiDong = {}; rs.forEach((r) => { const k = r0(r.top / 6); soMoiDong[k] = (soMoiDong[k] || 0) + 1; }); const dem = Object.values(soMoiDong);
    const xuongDongLe = dong > 1 && new Set(dem).size > 1; // xuống dòng mà các dòng không đều số nút
    if (khacCao || xuongDongLe) hangNut.push({ phanTu: duong(el), soNut: nut.length, dong, cao: caos, nut: nut.map((n) => chu(n).slice(0, 18)) });
  }

  // ---------- f) Tên trang lặp ---------- (bỏ h1 «ẩn khỏi mắt» kiểu hộp 1×1 px + clip, vd .visually-hidden, .detail-head h1)
  const bt = document.getElementById("bar-title"); const btChu = bt && thay(bt) ? chu(bt) : "";
  const doanCuoi = btChu.split(/[›>\/]/).map((x) => x.trim()).filter(Boolean).pop() ?? "";
  const chuan = (x) => x.toLowerCase().replace(/[^\p{L}\p{N} ]/gu, "").replace(/\s+/g, " ").trim();
  const tieuDeThan = [...main.querySelectorAll("h1, h2, .page-title, [class*=tieu-de], [class*=title]")].filter((e) => thay(e) && R(e).width > 4 && R(e).height > 4 && !/rect\(0px,? 0px,? 0px,? 0px\)/.test(cs(e).clip) && R(e).top < mr.top + 260 && parseFloat(cs(e).fontSize) >= 20 && chu(e).length < 80).map((e) => ({ phanTu: chon(e), chu: chu(e), co: cs(e).fontSize, dam: cs(e).fontWeight }));
  const lap = tieuDeThan.filter((t) => doanCuoi && (chuan(t.chu) === chuan(doanCuoi) || chuan(btChu).endsWith(chuan(t.chu)) || chuan(t.chu).startsWith(chuan(doanCuoi))));

  return {
    vw, vh, caoTrang: document.documentElement.scrollHeight, url: location.pathname,
    a, b: { so: hangGon.filter((h) => h.khoang > 240).length, so160: hangGon.filter((h) => h.khoang > 160).length, ds: hangGon.slice(0, 15) },
    c: { soO: oDo.length, so: oLech.length, ds: oLech.slice(0, 15), soKhungTrongPhai: khungOGon.length, khungTrongPhai: khungOGon.slice(0, 8), tatCa: oDo.slice(0, 40) },
    d: { so: vungGon.length, ds: vungGon.slice(0, 10) },
    e: { tranNgang, scrollWidth: document.documentElement.scrollWidth, thoRa: thoRaGon, soHangNutLon: hangNut.length, hangNut: hangNut.slice(0, 10) },
    f: { thanhTren: btChu, tieuDeThan, coTieuDeLonTrongThan: tieuDeThan.some((t) => /^h1/.test(t.phanTu) || parseFloat(t.co) >= 22), lap: lap.length > 0, lapChu: lap.map((x) => x.chu) },
    catDoc,
  };
})()
