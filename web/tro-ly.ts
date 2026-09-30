// Trợ lý "Hỗ trợ" (ADR-0066 điều 9): nút nổi ở mọi trang sau đăng nhập (gắn từ initShell ở web/shell.ts — không ở /login; có cả khi bảo trì cho người được phép) + khung hỏi đáp
// (bảng trượt dùng chung web/bang-truot.ts: điện thoại trượt từ đáy, máy tính hộp giữa). Khối cài đặt cho Toàn quyền ở trang Tôi (`ganCaiDatTroLy`).
// Không innerHTML: câu trả lời hiện bằng textContent (xuống dòng giữ bằng CSS). Lịch sử hỏi đáp CHỈ nằm trong bộ nhớ của trang (không lưu máy, không lưu máy chủ).
// Vị trí nút: góc phải dưới, trên thanh tab điện thoại; khi thanh nút dính đáy của trang (`.form-actions`, `.vc-bottom-bar`) đè vùng của nút thì nút nâng
// lên khỏi thanh đó (đo lúc chạy — giả định bề mặt ghi ở đặc tả, đảo ngược được).
import { ApiError, api, type Api, type Staff } from "./api";
import { moBangTruot } from "./bang-truot";
import { h, replaceChildren } from "./dom";
import { icon } from "./icons";
import { layCoTuMo } from "./tro-ly-co";

type Tin = { ai: "nguoi"; chu: string } | { ai: "tro-ly"; chu: string; nguon: string[] } | { ai: "loi"; chu: string };

const LOI_MANG = "Không kết nối được. Kiểm tra mạng rồi thử lại.";
const CHAO = "Chào bạn! Hỏi mình cách dùng app, ví dụ: “Đổi mã PIN thế nào?” hoặc “Lập đơn mới ra sao?”.";
const tin: Tin[] = [];
let dangHoi = false;

function dongTin(t: Tin): HTMLElement {
  if (t.ai === "nguoi") return h("li", { class: "tl-tin tl-tin-nguoi" }, h("p", { class: "tl-chu" }, t.chu));
  if (t.ai === "loi") return h("li", { class: "tl-tin tl-tin-loi", role: "alert" }, h("p", { class: "tl-chu" }, t.chu));
  return h(
    "li",
    { class: "tl-tin tl-tin-tro-ly" },
    h("p", { class: "tl-chu" }, t.chu),
    t.nguon.length ? h("p", { class: "tl-nguon" }, `Nguồn: ${t.nguon.join("; ")}`) : null,
  );
}

function moKhung(fab: HTMLElement): void {
  const ds = h("ol", { class: "tl-ds", "aria-live": "polite", "aria-label": "Hỏi đáp" });
  const trangThai = h("p", { class: "tl-trang-thai", role: "status" });
  const o = h("textarea", { class: "tl-o", rows: 2, maxlength: 500, placeholder: "Gõ câu hỏi về cách dùng app…", "aria-label": "Câu hỏi" });
  const gui = h("button", { class: "btn btn-primary tl-gui", type: "submit" }, "Gửi");
  const form = h("form", { class: "tl-form" }, o, gui);
  const veLai = (): void => {
    replaceChildren(ds, h("li", { class: "tl-tin tl-tin-tro-ly" }, h("p", { class: "tl-chu" }, CHAO)), ...tin.map(dongTin));
    trangThai.textContent = dangHoi ? "Đang trả lời…" : "";
    gui.disabled = dangHoi;
    ds.lastElementChild?.scrollIntoView({ block: "nearest" });
  };
  const bang = moBangTruot({
    title: "Hỗ trợ",
    body: [ds, trangThai, h("p", { class: "tl-luu-y" }, "Trả lời do AI, có thể sai — đối chiếu màn hình.")],
    foot: [form],
    footClass: "tl-foot",
    opener: fab,
    onClosed: () => (moi = null),
  });
  if (!bang) return;
  let moi: (() => void) | null = veLai;
  bang.dialog.classList.add("tl-khung");
  const guiCauHoi = async (): Promise<void> => {
    const cauHoi = o.value.trim();
    if (!cauHoi || dangHoi) return;
    tin.push({ ai: "nguoi", chu: cauHoi });
    o.value = "";
    dangHoi = true;
    moi?.();
    try {
      const r = await api<Api.TroLyHoiResponse>("/api/tro-ly/hoi", { method: "POST", body: { cauHoi } satisfies Api.TroLyHoiRequest });
      tin.push({ ai: "tro-ly", chu: r.traLoi, nguon: r.nguon });
    } catch (err) {
      // 503 chưa bật, 429 hết trần, 502 lỗi: máy chủ đã soạn câu tiếng Việt cho người dùng.
      tin.push({ ai: "loi", chu: err instanceof ApiError ? err.message : LOI_MANG });
    } finally {
      dangHoi = false;
      moi?.();
      if (moi) o.focus();
    }
  };
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    void guiCauHoi();
  });
  o.addEventListener("keydown", (e: KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey && !e.isComposing) {
      e.preventDefault();
      void guiCauHoi();
    }
  });
  veLai();
  o.focus();
}

/** Khoảng hở giữa nút và thanh bị né (đơn vị điểm ảnh CSS của trình duyệt — đo lúc chạy, không phải giá trị CSS). */
const HO = 8;

/**
 * Nâng nút lên khỏi thanh nút dính đáy của trang (`.form-actions`, `.vc-bottom-bar`) NẾU thanh đang đè vùng của nút: đo vị trí nút ở chỗ mặc định, đo thanh,
 * có giao nhau thì đặt `--tl-nang` = phần cần nâng. Thanh dính thay đổi vị trí khi cuộn (cột tóm tắt của form lập đơn ở máy tính) nên đo lại khi cuộn.
 */
function nangTheoThanhDay(fab: HTMLElement): void {
  fab.style.removeProperty("--tl-nang");
  const f = fab.getBoundingClientRect();
  let nang = 0;
  for (const el of document.querySelectorAll<HTMLElement>(".form-actions, .vc-bottom-bar")) {
    if (el.offsetParent === null || el.closest(".sheet-root")) continue;
    const b = el.getBoundingClientRect();
    const ngang = b.left < f.right && b.right > f.left;
    const doc = b.top < f.bottom + HO && b.bottom > f.top - HO;
    if (ngang && doc) nang = Math.max(nang, Math.ceil(f.bottom - b.top + HO));
  }
  if (nang > 0) fab.style.setProperty("--tl-nang", `${nang}px`);
}

/** Gắn nút "Hỗ trợ" (một lần mỗi trang); có cờ một-lần sau đăng nhập thì tự mở khung. */
export function ganTroLy(_staff: Staff): void {
  if (document.getElementById("tl-fab")) return;
  const fab = h("button", { id: "tl-fab", class: "tl-fab", type: "button", "aria-haspopup": "dialog" }, icon("chat", 20), h("span", null, "Hỗ trợ"));
  fab.addEventListener("click", () => moKhung(fab));
  document.body.append(fab);
  let hen = 0;
  const doLai = (): void => {
    cancelAnimationFrame(hen);
    hen = requestAnimationFrame(() => nangTheoThanhDay(fab));
  };
  new MutationObserver(doLai).observe(document.body, { childList: true, subtree: true });
  window.addEventListener("resize", doLai);
  window.addEventListener("scroll", doLai, { passive: true });
  doLai();
  if (layCoTuMo()) moKhung(fab);
}

// ---- Khối cài đặt cho Toàn quyền ở trang Tôi (ô settings.ops — máy chủ kiểm lại) ----

const usd = (n: number): string => `${n.toLocaleString("vi-VN", { maximumFractionDigits: 4 })} USD`;

export async function ganCaiDatTroLy(el: HTMLElement): Promise<void> {
  let s: Api.TroLyCaiDatResponse;
  try {
    s = await api<Api.TroLyCaiDatResponse>("/api/tro-ly/cai-dat");
  } catch {
    return; // không có quyền hoặc lỗi mạng: khối ẩn, phần còn lại của trang không ảnh hưởng
  }
  const loi = h("p", { class: "tl-cd-loi", role: "alert", hidden: true });
  const ve = (s: Api.TroLyCaiDatResponse): void => {
    const bat = h("input", { type: "checkbox", checked: s.bat });
    const tran = h("input", { type: "number", min: 0, max: 100, step: 0.5, value: String(s.tranThangUsd), inputmode: "decimal" });
    const ngay = h("input", { type: "number", min: 0, max: 200, step: 1, value: String(s.tranNgay), inputmode: "numeric" });
    const luu = h("button", { class: "btn btn-primary", type: "submit" }, "Lưu cài đặt trợ lý");
    const [nam, thang] = s.thang.split("-");
    const form = h(
      "form",
      { class: "tl-cd-form" },
      h("label", { class: "tl-cd-bat" }, bat, "Bật trợ lý"),
      h("label", null, "Trần chi phí mỗi tháng (USD)", tran),
      h("label", null, "Số câu mỗi người mỗi ngày", ngay),
      loi,
      luu,
    );
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      loi.hidden = true;
      luu.disabled = true;
      try {
        const body: Api.TroLyCaiDatRequest = { bat: bat.checked, tranThangUsd: Number(tran.value), tranNgay: Number(ngay.value) };
        ve(await api<Api.TroLyCaiDatResponse>("/api/tro-ly/cai-dat", { method: "POST", body }));
      } catch (err) {
        loi.textContent = err instanceof ApiError ? err.message : LOI_MANG;
        loi.hidden = false;
        luu.disabled = false;
      }
    });
    replaceChildren(
      el,
      h("h2", { id: "tro-ly-cai-dat-heading" }, "Trợ lý Hỗ trợ"),
      h("p", null, s.bat ? "Đang bật." : "Đang tắt.", " ", s.coKhoa ? "Đã có khoá OpenAI." : "Chưa có khoá OpenAI — trợ lý báo “chưa bật” tới khi có khoá."),
      h("p", { class: "muted" }, `Tháng ${thang}/${nam}: đã dùng ${usd(s.chiPhiThangUsd)} trên trần ${usd(s.tranThangUsd)} · ${s.soCauThang} câu.`),
      form,
    );
  };
  ve(s);
  el.hidden = false;
}
