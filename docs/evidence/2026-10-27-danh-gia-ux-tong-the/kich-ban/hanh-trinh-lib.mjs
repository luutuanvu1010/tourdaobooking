// Bộ đếm hành trình (đánh giá UX 27/10/2026): bấm/gõ/cuộn như người thật trên một ngăn trình duyệt, đếm số chạm, số lần cuộn (phần tử ngoài màn
// phải cuộn tới), số lần "phải đoán" (chữ người dùng sẽ tìm không có trên màn → kịch bản phải dùng đường khác, ghi lý do). Chụp ảnh từng bước (màn đầu).
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { sleep } from "./cdp.mjs";

export function hanhTrinh(ngan, { ten, thuMuc }) {
  mkdirSync(thuMuc, { recursive: true });
  const nk = { ten, cham: 0, go: 0, cuon: 0, doan: [], buoc: [], loi: [] };
  let n = 0;
  const ghi = async (moTa) => { n++; const anh = join(thuMuc, `${String(n).padStart(2, "0")}.jpg`); await ngan.chup(anh, false); nk.buoc.push({ n, moTa, url: await ngan.ev("location.pathname"), anh }); };
  const cho = async (ms = 700) => { await sleep(ms); };
  /** Tìm phần tử bấm được có chữ (khớp đủ hoặc bắt đầu bằng) `chu`, trong `pham` (bộ chọn CSS). Trả "ok" | "cuon" | null. */
  const tim = (chu, pham = "body") => ngan.ev(`(() => {
    const ok = (e) => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && s.display !== "none"; };
    const ds = [...document.querySelectorAll(${JSON.stringify(pham)} + " :is(a,button,[role=button],[role=tab],label,summary,li,input[type=submit],.chip,[tabindex])")].filter(ok);
    const t = (e) => (e.getAttribute("aria-label") || e.innerText || e.value || "").trim().replace(/\\s+/g, " ");
    const e = ds.find((x) => t(x) === ${JSON.stringify(chu)}) || ds.find((x) => t(x).startsWith(${JSON.stringify(chu)}));
    if (!e) return null;
    const r = e.getBoundingClientRect();
    const ngoai = r.top < 0 || r.bottom > innerHeight;
    if (ngoai) e.scrollIntoView({ block: "center" });
    window.__ux_el = e;
    return ngoai ? "cuon" : "ok";
  })()`);
  /** Bấm như ngón tay: chạm vào tâm phần tử (Input.dispatchMouseEvent), không gọi .click() — bị phủ là bấm trượt thật. */
  const bamEl = async () => {
    const p = await ngan.ev(`(() => { const r = window.__ux_el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);
    for (const type of ["mousePressed", "mouseReleased"]) await ngan.s("Input.dispatchMouseEvent", { type, x: p.x, y: p.y, button: "left", clickCount: 1 });
  };
  const bam = async (chu, { pham, moTa, khongCo } = {}) => {
    const r = await tim(chu, pham);
    if (!r) { if (khongCo) { nk.doan.push(`${chu}: ${khongCo}`); return false; } throw new Error(`không thấy «${chu}» trên ${await ngan.ev("location.pathname")}`); }
    if (r === "cuon") { nk.cuon++; await sleep(250); }
    await bamEl(); nk.cham++;
    await cho();
    if (moTa) await ghi(moTa);
    return true;
  };
  /** Gõ vào ô (bộ chọn CSS hoặc nhãn): chạm 1 lần + gõ. */
  const go = async (sel, giaTri, moTa) => {
    const r = await ngan.ev(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return null; const b = e.getBoundingClientRect(); const ngoai = b.top < 0 || b.bottom > innerHeight; if (ngoai) e.scrollIntoView({ block: "center" }); window.__ux_el = e; return ngoai ? "cuon" : "ok"; })()`);
    if (!r) throw new Error(`không thấy ô ${sel}`);
    if (r === "cuon") nk.cuon++;
    await bamEl(); nk.cham++;
    await ngan.s("Input.insertText", { text: String(giaTri) }); nk.go++;
    await cho(400);
    if (moTa) await ghi(moTa);
  };
  const doan = (ly) => nk.doan.push(ly);
  return { nk, ghi, bam, go, tim, doan, cho };
}
