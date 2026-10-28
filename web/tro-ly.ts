// Trợ lý "Hỗ trợ" (ADR-0066 điều 9): nút «Trợ lý» ở thanh trên mọi trang sau đăng nhập (gắn từ initShell ở web/shell.ts — không ở /login; có cả khi bảo trì cho người được phép) + khung hỏi đáp
// (khung nổi KHÔNG modal ở góc phải dưới mọi khổ — kéo, đổi cỡ, nhớ theo máy; 1/10, docs/superpowers/plans/2026-10-01-khung-tro-ly-keo-doi-co.md). Cài đặt
// của Toàn quyền ở trang riêng /tro-ly-cai-dat (ADR-0069).
// ADR-0069: nút chỉ dựng khi `GET /api/tro-ly/khung` báo tài khoản được dùng (vai đang bật — máy chủ vẫn chặn lại); câu chào + câu hỏi mẫu theo lời dặn
// của Toàn quyền. Tệp này nạp ở MỌI trang: KHÔNG import src/shared/tro-ly.ts / huong-dan.ts (kéo cả kho tri thức vào bundle) — máy chủ gửi chữ sẵn.
// Không innerHTML: câu trả lời hiện bằng nút chữ / h("strong") qua chuInDam (cặp ** → in đậm; xuống dòng giữ bằng CSS). Đoạn hội thoại trên màn hình chỉ nằm trong bộ nhớ của trang (không lưu máy);
// máy chủ lưu câu hỏi ĐÃ CHE + câu trả lời vào lịch sử chỉ Toàn quyền xem (ADR-0069 điều 5) — khung ghi rõ cho người dùng.
// ADR-0073 Đ4: gửi kèm mã cuộc trò chuyện (KHÔNG gửi nội dung lượt trước; mã chỉ trong bộ nhớ trang, mở khung lúc chưa có tin ⇒ mã mới); "Cuộc trò chuyện mới" xoá đoạn trên màn hình và sinh mã mới.
// Vị trí nút: cuối cụm nút phải của #topbar (đợt 0 K6, cổng 1 câu 4); khung mở ở góc phải dưới vùng nội dung, trên thanh tab điện thoại.
import { ApiError, api, type Api, type Staff } from "./api";
import { h, replaceChildren } from "./dom";
import { icon } from "./icons";
import { layCoTuMo } from "./tro-ly-co";
import { chuInDam } from "./tro-ly-in-dam";
import {
  LE, docViTri, doiCo, ghiViTri, hopTuViTri, keo, macDinh, taoMaCuoc, viTriTuHop, type Hop, type KhungNhin, type ViTri, type VungAnToan,
} from "../src/shared/tro-ly-khung";
import { CAU_CHAO_MAC_DINH, thayTen } from "../src/shared/xung-ho";

type Tin = { ai: "nguoi"; chu: string } | { ai: "tro-ly"; chu: string; nguon: string[] } | { ai: "loi"; chu: string };

const LOI_MANG = "Không kết nối được. Kiểm tra mạng rồi thử lại.";
/** Dự phòng khi lời dặn chưa có câu chào (không xảy ra với dữ liệu gieo 0054) = câu chào mặc định Mai (ADR-0084 Đ5). */
const CHAO = CAU_CHAO_MAC_DINH;
const tin: Tin[] = [];
let dangHoi = false;

/** Mã cuộc trò chuyện (ADR-0073 Đ4, R5): sinh mới mỗi lần mở khung lúc chưa có tin và khi bấm "Cuộc trò chuyện mới"; chỉ nằm trong bộ nhớ trang (không lưu máy) để điều người dùng thấy = điều máy chủ nhớ. Khung KHÔNG gửi nội dung lượt trước. */
let cuocTroChuyen: string | null = null;
const maMoi = (): string => taoMaCuoc(crypto.getRandomValues(new Uint8Array(16)));

/** Bong bóng "đang trả lời" của trợ lý (ba chấm nhấp nháy + chữ nhỏ; người bật giảm chuyển động chỉ thấy chữ — CSS). Dựng lại mỗi lần vẽ, bỏ đi khi có trả lời hoặc lỗi. */
function bongBongDangTra(): HTMLElement {
  return h(
    "li",
    { class: "tl-tin tl-tin-tro-ly tl-dang-tra", "data-tl": "dang-tra" },
    h("span", { class: "tl-cham", "aria-hidden": "true" }, h("i", null), h("i", null), h("i", null)),
    h("span", { class: "tl-dang-tra-chu" }, "Mai đang trả lời…"),
  );
}

function dongTin(t: Tin): HTMLElement {
  if (t.ai === "nguoi") return h("li", { class: "tl-tin tl-tin-nguoi" }, h("p", { class: "tl-chu" }, t.chu));
  if (t.ai === "loi") return h("li", { class: "tl-tin tl-tin-loi", role: "alert" }, h("p", { class: "tl-chu" }, t.chu));
  return h(
    "li",
    { class: "tl-tin tl-tin-tro-ly" },
    h("p", { class: "tl-chu" }, ...chuInDam(t.chu)),
    t.nguon.length ? h("p", { class: "tl-nguon" }, `Nguồn: ${t.nguon.join("; ")}`) : null,
  );
}

const KHOA_VI_TRI = "td_tro_ly_khung";
/** Vị trí đã lưu của máy này; null = mặc định (bám theo nút "Hỗ trợ", kể cả khi nút được nâng lên). */
function docLuu(): ViTri | null {
  try {
    return docViTri(localStorage.getItem(KHOA_VI_TRI));
  } catch {
    return null;
  }
}
function ghiLuu(v: ViTri | null): void {
  try {
    if (v) localStorage.setItem(KHOA_VI_TRI, ghiViTri(v));
    else localStorage.removeItem(KHOA_VI_TRI);
  } catch {
    // không có bộ nhớ (chế độ riêng tư, bị chặn): chỉ nhớ trong trang đang mở
  }
}

/** Khung nhìn đang thấy (bàn phím ảo iPhone làm visualViewport co lại). */
function khungNhin(): KhungNhin {
  const vv = window.visualViewport;
  return vv ? { x: vv.offsetLeft, y: vv.offsetTop, w: vv.width, h: vv.height } : { x: 0, y: 0, w: document.documentElement.clientWidth, h: innerHeight };
}

/** Vùng an toàn đo từ phần tử dò (padding = env(safe-area-inset-*) ở CSS `.tl-do-an-toan`). */
function vungAnToan(dau: HTMLElement): VungAnToan {
  const c = getComputedStyle(dau);
  const so = (v: string): number => parseFloat(v) || 0;
  return { tren: so(c.paddingTop), phai: so(c.paddingRight), duoi: so(c.paddingBottom), trai: so(c.paddingLeft) };
}

/** Bước dời / đổi cỡ bằng phím mũi tên (điểm ảnh CSS, giá trị lúc chạy). */
const BUOC_PHIM = 16;
const MUI_TEN: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
type Tinh = (b0: Hop, dx: number, dy: number, kn: KhungNhin, at: VungAnToan) => Hop;

let dongKhungDangMo: ((traTieuDiem?: boolean) => void) | null = null;
let kepKhungDangMo: (() => void) | null = null;

/**
 * Khung hỏi đáp KHÔNG modal, nổi ở góc phải dưới: kéo bằng thanh tiêu đề, đổi cỡ bằng tay nắm góc trên-trái, nhớ vị trí / cỡ theo máy (localStorage),
 * nút "Về góc". Toạ độ tính ở src/shared/tro-ly-khung.ts, đặt qua biến CSS --tl-x/--tl-y/--tl-w/--tl-h (giá trị lúc chạy).
 * KHÔNG dùng bảng trượt dùng chung (.sheet-root): bảng đó chặn mọi bảng khác mở cùng lúc và khoá trang phía sau.
 */
function moKhung(fab: HTMLElement, khung: Api.TroLyKhungResponse): void {
  if (dongKhungDangMo) return;
  if (!tin.length || !cuocTroChuyen) cuocTroChuyen = maMoi();
  const ds = h("ol", { class: "tl-ds", "aria-live": "polite", "aria-label": "Hỏi đáp" });
  const o = h("textarea", { class: "tl-o", rows: 2, maxlength: 500, placeholder: "Hãy hỏi Mai tại đây nhé!", "aria-label": "Câu hỏi" });
  const gui = h("button", { class: "btn btn-primary tl-gui", type: "submit" }, "Gửi");
  const form = h("form", { class: "tl-form" }, o, gui);
  const mau = (): HTMLElement | null =>
    tin.length || !khung.cauHoiMau.length
      ? null
      : h(
        "li",
        { class: "tl-mau" },
        ...khung.cauHoiMau.map((c) => {
          const b = h("button", { class: "tl-mau-nut", type: "button" }, c);
          b.addEventListener("click", () => {
            o.value = c;
            void guiCauHoi();
          });
          return b;
        }),
      );
  // ADR-0084 Đ5 (+ Đ2): lời chào dựng ngay ở trình duyệt (không gọi AI) — thay MỌI {ten} / {xung} bằng cách gọi / cách xưng máy chủ đã tính;
  // câu không có chỗ thay giữ nguyên văn.
  const loiChao = thayTen(khung.cauChao || CHAO, { goi: khung.goi || "bạn", xung: khung.xung || "mình" });
  const veLai = (): void => {
    replaceChildren(ds, h("li", { class: "tl-tin tl-tin-tro-ly", "data-tl": "loi-chao" }, h("p", { class: "tl-chu" }, loiChao)), mau(), ...tin.map(dongTin), dangHoi ? bongBongDangTra() : null);
    gui.disabled = dangHoi;
    ds.lastElementChild?.scrollIntoView({ block: "nearest" });
  };

  const co = h("button", { class: "tl-co", type: "button", "aria-label": "Đổi cỡ khung Trợ lý: kéo góc này, hoặc dùng phím mũi tên" }, icon("resize", 16));
  const keoThanh = h(
    "div",
    { class: "tl-keo", role: "button", tabindex: 0, "aria-label": "Di chuyển khung Trợ lý: kéo thanh này, hoặc dùng phím mũi tên" },
    h("h2", { id: "tl-khung-tieu-de", class: "tl-tieu-de" }, "Trợ lý"),
  );
  const veGoc = h("button", { class: "btn btn-link tl-ve-goc", type: "button" }, "Về góc");
  const dong = h("button", { class: "btn btn-link tl-dong", type: "button", "aria-label": "Đóng" }, icon("close", 20));
  const nutMoi = h("button", { class: "btn btn-link tl-cuoc-moi", type: "button" }, "Cuộc trò chuyện mới");
  const dau = h("div", { class: "tl-dau" }, co, keoThanh, veGoc, dong);
  const hop = h(
    "div",
    { id: "tl-khung", class: "tl-khung", role: "dialog", "aria-labelledby": "tl-khung-tieu-de" },
    dau,
    h("div", { class: "tl-than" }, ds),
    h("div", { class: "tl-chan" }, form, nutMoi),
  );
  const doAnToan = h("div", { class: "tl-do-an-toan", "aria-hidden": "true" });

  let luu = docLuu();
  let hienTai: Hop = { x: 0, y: 0, w: 0, h: 0 };
  const ve = (b: Hop): void => {
    hienTai = b;
    hop.style.setProperty("--tl-x", `${b.x}px`);
    hop.style.setProperty("--tl-y", `${b.y}px`);
    hop.style.setProperty("--tl-w", `${b.w}px`);
    hop.style.setProperty("--tl-h", `${b.h}px`);
  };
  /** Vị trí mặc định: góc phải dưới vùng nội dung; điện thoại thì nằm trên thanh tab (K6 — nút Trợ lý nay ở thanh trên nên không còn bám nút). */
  const macDinhGocDuoi = (kn: KhungNhin, at: VungAnToan): ViTri => {
    const tab = document.getElementById("tabbar")?.getBoundingClientRect();
    const chua = tab && tab.height && tab.top > kn.y + kn.h / 2 ? Math.round(kn.y + kn.h - tab.top + LE) : LE;
    return macDinh(kn, at, chua, LE);
  };
  /** Kẹp lại vào khung nhìn (xoay máy, đổi cỡ cửa sổ, bàn phím ảo) — KHÔNG ghi bộ nhớ; bỏ qua khi đang kéo. */
  const kepLai = (): void => {
    if (hop.classList.contains("is-keo")) return;
    const kn = khungNhin();
    const at = vungAnToan(doAnToan);
    ve(hopTuViTri(luu ?? macDinhGocDuoi(kn, at), kn, at));
  };
  const chot = (): void => {
    luu = viTriTuHop(hienTai, khungNhin());
    ghiLuu(luu);
  };

  /** Kéo bằng con trỏ (chuột, ngón tay, bút): nghe move/up/cancel trên window để không phụ thuộc việc bắt con trỏ. */
  const batDau = (e: PointerEvent, tinh: Tinh): void => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    e.preventDefault();
    const x0 = e.clientX;
    const y0 = e.clientY;
    const b0 = hienTai;
    const at = vungAnToan(doAnToan);
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      // không bắt được (sự kiện giả lập): vẫn kéo được nhờ trình nghe trên window
    }
    hop.classList.add("is-keo");
    const move = (ev: PointerEvent): void => {
      if (ev.pointerId === e.pointerId) ve(tinh(b0, ev.clientX - x0, ev.clientY - y0, khungNhin(), at));
    };
    const xong = (ev: PointerEvent): void => {
      if (ev.pointerId !== e.pointerId) return;
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", xong);
      window.removeEventListener("pointercancel", xong);
      hop.classList.remove("is-keo");
      if (hienTai !== b0) chot();
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", xong);
    window.addEventListener("pointercancel", xong);
  };
  dau.addEventListener("pointerdown", (e) => {
    if ((e.target as Element).closest("button")) return; // "Về góc", ✕, tay nắm giữ việc của mình
    batDau(e, keo);
  });
  co.addEventListener("pointerdown", (e) => batDau(e, doiCo));
  const phim = (tinh: Tinh) => (e: KeyboardEvent): void => {
    const m = MUI_TEN[e.key];
    if (!m) return;
    e.preventDefault();
    ve(tinh(hienTai, m[0] * BUOC_PHIM, m[1] * BUOC_PHIM, khungNhin(), vungAnToan(doAnToan)));
    chot();
  };
  keoThanh.addEventListener("keydown", phim(keo));
  co.addEventListener("keydown", phim(doiCo));
  // Điều tra 1/10: bấm thật (chuột và chạm, 1040 + 390) đã về đúng vị trí + cỡ mặc định và xoá bộ nhớ; chỗ "bấm không thấy gì" còn lại là khung ĐANG ở mặc định
  // (mở khung luôn ở mặc định) ⇒ không có gì dời. Nên mỗi lần bấm khung nháy viền một nhịp: luôn thấy nút đã nhận.
  // Gỡ lớp nháy khi hiệu ứng chạy xong (`animationend`); dự phòng (giảm chuyển động tắt hiệu ứng ⇒ không có animationend) hẹn đúng thời lượng token
  // `--tl-nhay` của public/app.css — không số cứng (kiểm độc lập T-5).
  let henNhay = 0;
  const thoiNhayMs = (): number => {
    const v = getComputedStyle(hop).getPropertyValue("--tl-nhay").trim();
    const n = parseFloat(v);
    return Number.isFinite(n) ? (v.endsWith("ms") ? n : n * 1000) : 0;
  };
  const tatNhay = (): void => {
    clearTimeout(henNhay);
    hop.classList.remove("is-ve-goc");
  };
  hop.addEventListener("animationend", (e) => {
    if (e.animationName === "tl-ve-goc-nhay") tatNhay();
  });
  veGoc.addEventListener("click", () => {
    luu = null;
    ghiLuu(null);
    kepLai();
    hop.classList.remove("is-ve-goc");
    void hop.offsetWidth; // khởi động lại hiệu ứng khi bấm liên tiếp
    hop.classList.add("is-ve-goc");
    clearTimeout(henNhay);
    henNhay = window.setTimeout(tatNhay, thoiNhayMs());
  });
  nutMoi.addEventListener("click", () => {
    if (dangHoi) return;
    tin.length = 0;
    cuocTroChuyen = maMoi();
    veLai();
    o.focus();
  });

  const vv = window.visualViewport;
  let moi: (() => void) | null = veLai;
  function dongKhung(traTieuDiem = true): void {
    window.removeEventListener("resize", kepLai);
    vv?.removeEventListener("resize", kepLai);
    vv?.removeEventListener("scroll", kepLai);
    hop.remove();
    doAnToan.remove();
    fab.setAttribute("aria-expanded", "false");
    dongKhungDangMo = null;
    kepKhungDangMo = null;
    moi = null;
    if (traTieuDiem && fab.isConnected) fab.focus();
  }
  dong.addEventListener("click", () => dongKhung());
  // Esc chỉ khi tiêu điểm trong khung (khung không modal — không tranh Esc với bảng khác của trang).
  hop.addEventListener("keydown", (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      dongKhung();
    }
  });
  window.addEventListener("resize", kepLai);
  vv?.addEventListener("resize", kepLai);
  vv?.addEventListener("scroll", kepLai);
  document.body.append(doAnToan, hop);
  kepLai();
  fab.setAttribute("aria-expanded", "true");
  dongKhungDangMo = dongKhung;
  kepKhungDangMo = kepLai;

  const guiCauHoi = async (): Promise<void> => {
    const cauHoi = o.value.trim();
    if (!cauHoi || dangHoi) return;
    tin.push({ ai: "nguoi", chu: cauHoi });
    o.value = "";
    dangHoi = true;
    moi?.();
    try {
      const r = await api<Api.TroLyHoiResponse>("/api/tro-ly/hoi", { method: "POST", body: { cauHoi, cuocTroChuyen } satisfies Api.TroLyHoiRequest });
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

/**
 * Gắn nút "Hỗ trợ" (một lần mỗi trang) SAU KHI máy chủ báo tài khoản được dùng (ADR-0069 điều 3 — vai tắt: không có nút, không nhấp nháy); có cờ một-lần sau
 * đăng nhập thì tự mở khung. Cờ luôn được đọc (và xoá) kể cả khi không dựng nút. Lỗi mạng khi hỏi cờ ⇒ không dựng nút (không đoán).
 */
export async function ganTroLy(_staff: Staff): Promise<void> {
  if (document.getElementById("tl-nut")) return;
  const tuMo = layCoTuMo();
  let khung: Api.TroLyKhungResponse;
  try {
    khung = await api<Api.TroLyKhungResponse>("/api/tro-ly/khung");
  } catch {
    return;
  }
  if (!khung.duocDung || document.getElementById("tl-nut")) return;
  const fab = h("button", { id: "tl-nut", class: "bar-tro-ly", type: "button", "aria-haspopup": "dialog", "aria-expanded": "false", "aria-label": "Trợ lý", title: "Trợ lý" }, icon("chat", 22));
  // Bấm nút khi khung đang mở = đóng khung.
  fab.addEventListener("click", () => (dongKhungDangMo ? dongKhungDangMo() : moKhung(fab, khung)));
  const thanhTren = document.getElementById("topbar");
  if (!thanhTren) return;
  thanhTren.append(fab); // cuối cụm nút phải: sau chuông (đặc tả 5.1, 5.8)
  window.addEventListener("resize", () => kepKhungDangMo?.());
  if (tuMo) moKhung(fab, khung);
}
