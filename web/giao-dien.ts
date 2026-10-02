// Màn "Giao diện" (ADR-0087, chỉ Toàn quyền — ô settings.ops): chỉnh núm → xem trước NGAY trên chính trang (style.setProperty trên <html>,
// chỉ máy này) → "Áp dụng cho mọi người" (PUT /api/giao-dien, khoá lạc quan version). Kiểm bằng CÙNG tệp thuần với máy chủ.
// Form dựng MỘT lần (dungForm); mỗi lần chỉnh chỉ cập nhật xem trước, lớp is-doi, câu lỗi và nút — để ô chọn màu đang mở không bị đóng khi kéo.
import { NUM, PHONG, bienCss, giaTriHieuLuc, giaTriKhiBoGhiDe, kiemGiaoDien, type Num } from "../src/shared/giao-dien";
import { can } from "../src/shared/permissions";
import { ApiError, api, type Api } from "./api";
import { byId, h, replaceChildren } from "./dom";
import { orderCard } from "./order-card";
import { initShell, showError } from "./shell";

const NHOM: readonly [Num["nhom"], string][] = [["nen-chu", "Màu nền và chữ"], ["thanh", "Thanh tác vụ"], ["nut", "Nút"], ["chu", "Phông và cỡ chữ"]];
const errorEl = byId("error");
const formEl = byId("gd-form") as HTMLFormElement;
const xemEl = byId("gd-xem-truoc");
const apDungBtn = byId("gd-ap-dung") as HTMLButtonElement;
const boBtn = byId("gd-bo") as HTMLButtonElement;
const macDinhBtn = byId("gd-mac-dinh") as HTMLButtonElement;
const xacNhanEl = byId("gd-xac-nhan");

let daLuu: Record<string, string> = {}; // bản trên máy chủ
let dangSua: Record<string, string> = {}; // bản đang chỉnh (ghi đè)
let version = 0;
const daApLenTrang = new Set<string>();
/** Phần tử của từng dòng — để capNhat() sửa tại chỗ thay vì dựng lại. */
const dong = new Map<string, { hang: HTMLElement; input: HTMLElement; veMacDinh: HTMLButtonElement; loi: HTMLElement }>();

/** Tắt thẻ link /api/giao-dien.css của trang này: bản đã lưu không được che bản đang chỉnh. */
function tatBanDaLuu(): void {
  for (const l of document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')) if (l.getAttribute("href")?.startsWith("/api/giao-dien.css")) l.disabled = true;
}

/** Giá trị đang HIỆU LỰC của núm (ghi đè riêng, nếu không thì theo núm cha, nếu không thì mặc định) — ô hiện đúng thứ trang đang dùng. */
const giaTri = (k: string): string => giaTriHieuLuc(dangSua, k);
const giongNhau = (a: Record<string, string>, b: Record<string, string>) => JSON.stringify(Object.entries(a).sort()) === JSON.stringify(Object.entries(b).sort());

/** Áp bản đang chỉnh lên CHÍNH trang này (xem trước thật) — gỡ token cũ trước rồi đặt lại. Trang này TẮT tệp giao diện công ty (xem tatBanDaLuu),
 *  nên nó hiện đúng "app.css mặc định + các chỉnh sửa hiện tại" — chính là thứ sẽ được áp dụng; không đặt cứng giá trị mặc định (làm gãy quan hệ cha→con của token). */
function apXemTruoc(): void {
  const root = document.documentElement;
  for (const t of daApLenTrang) root.style.removeProperty(t);
  daApLenTrang.clear();
  for (const [t, v] of bienCss(dangSua)) { root.style.setProperty(t, v); daApLenTrang.add(t); }
}

function oNhap(n: Num): HTMLElement {
  const id = `gd-${n.khoa}`;
  // Chỉ bỏ ghi đè khi giá trị bằng thứ núm SẼ có nếu không ghi đè (núm con: giá trị của núm cha), nếu không thì đổi núm cha sau đó sẽ lặng lẽ kéo núm con đi theo.
  const doi = (v: string) => { if (v === giaTriKhiBoGhiDe(dangSua, n.khoa)) delete dangSua[n.khoa]; else dangSua[n.khoa] = v; capNhat(); };
  let input: HTMLElement;
  if (n.loai === "mau") input = h("input", { id, type: "color", value: giaTri(n.khoa), oninput: (e: Event) => doi((e.target as HTMLInputElement).value) });
  else if (n.loai === "phong") input = h("select", { id, onchange: (e: Event) => doi((e.target as HTMLSelectElement).value) },
    ...Object.entries(PHONG).map(([ma, p]) => h("option", { value: ma, selected: ma === giaTri(n.khoa) }, p.ten)));
  else if (n.loai === "dam") input = h("select", { id, onchange: (e: Event) => doi((e.target as HTMLSelectElement).value) },
    ...[400, 500, 600, 700].filter((d) => d >= n.min! && d <= n.max!).map((d) => h("option", { value: String(d), selected: String(d) === giaTri(n.khoa) }, String(d))));
  else input = h("input", { id, type: "number", inputmode: "numeric", min: String(n.min), max: String(n.max), step: "1", value: giaTri(n.khoa),
    oninput: (e: Event) => doi((e.target as HTMLInputElement).value) });
  const veMacDinh = h("button", { type: "button", class: "btn-link", hidden: true, onclick: () => { delete dangSua[n.khoa]; dungForm(); capNhat(); } }, "Về mặc định");
  const loi = h("p", { class: "gd-loi", role: "alert", hidden: true });
  const hang = h("div", { class: "gd-dong" },
    h("label", { for: id }, n.nhan, n.loai === "co" && h("span", { class: "muted" }, ` (${n.min}–${n.max}px)`)),
    input, veMacDinh, loi);
  dong.set(n.khoa, { hang, input, veMacDinh, loi });
  return hang;
}

/** Dựng form MỘT lần theo `dangSua` hiện tại (gọi lại chỉ khi đổi nguồn: nạp, bỏ thay đổi, về mặc định). */
function dungForm(): void {
  dong.clear();
  replaceChildren(formEl, ...NHOM.map(([nhom, ten]) => h("fieldset", { class: "card gd-nhom" }, h("legend", null, ten),
    ...NUM.filter((n) => n.nhom === nhom).map((n) => oNhap(n)))));
}

function capNhat(): void {
  apXemTruoc();
  const loi = kiemGiaoDien(dangSua);
  const loiTheoO = new Map<string, string>();
  for (const l of loi) if (l.khoa) loiTheoO.set(l.khoa, l.message);
  for (const [khoa, d] of dong) {
    const doi = dangSua[khoa] !== undefined;
    d.hang.classList.toggle("is-doi", doi);
    d.veMacDinh.hidden = !doi;
    const m = loiTheoO.get(khoa);
    d.loi.textContent = m ?? "";
    d.loi.hidden = !m;
    // Núm con chưa ghi đè riêng đi theo núm cha: làm tươi giá trị hiện ở ô (không dựng lại ô, không đụng ô đang được gõ).
    if (!doi && d.input instanceof HTMLInputElement && d.input !== document.activeElement) {
      const hl = giaTri(khoa);
      if (d.input.value !== hl) d.input.value = hl;
    }
  }
  const coDoi = !giongNhau(dangSua, daLuu);
  apDungBtn.disabled = !coDoi || loi.length > 0;
  boBtn.disabled = !coDoi;
}

/** Một thẻ đơn mẫu dựng bằng ĐÚNG thành phần thẻ đơn của app (web/order-card.ts) — chữ tĩnh, bấm vào không đi đâu cả. */
function theDonMau(): HTMLElement {
  const { el } = orderCard({
    id: "mau", href: "#", orderCode: "TD-MAU", status: "confirmed", departDate: "2026-10-05", pickupTime: "07:30",
    customerName: "Chị Nguyễn Thu Hà", customerPhone: "0901 234 567", pax: { adult: 6, child: 0, senior: 0, infant: 0 },
    total: 7_200_000, serviceNames: ["Tour 4 đảo"], staffName: "Nhân viên mẫu", createdAt: "2026-10-01T03:00:00.000Z",
    customerNote: null, pickupPlace: "Khách sạn mẫu", index: 1,
  });
  el.addEventListener("click", (e) => { if ((e.target as Element).closest("a, .order-row-phone")) { e.preventDefault(); e.stopPropagation(); } }, true);
  return el;
}

function dungXemTruoc(): void {
  replaceChildren(xemEl,
    h("div", { class: "gd-xem-thanh" }, h("span", null, "Thanh trên"), h("span", { class: "gd-xem-chuong" }, "Thông báo")),
    h("div", { class: "gd-xem-ben" }, h("span", { class: "sidebar-item" }, "Trang chủ"), h("span", { class: "sidebar-item", "aria-current": "page" }, "Đơn hàng")),
    h("h2", null, "Tiêu đề mục"),
    h("p", null, "Chữ nội dung: Chị Nguyễn Thu Hà · Tour 4 đảo · 6 khách."),
    h("p", { class: "muted" }, "Chữ phụ: Đón tại khách sạn lúc 07:30."),
    theDonMau(),
    h("div", { class: "gd-xem-nut" }, h("button", { type: "button", class: "btn btn-primary" }, "Nút chính"), h("button", { type: "button", class: "btn" }, "Nút phụ"),
      h("button", { type: "button", class: "btn btn-accent" }, "Xác nhận đơn")));
}

async function napLai(): Promise<void> {
  const r = await api<Api.GiaoDienDto>("/api/giao-dien");
  daLuu = { ...r.tokens };
  dangSua = { ...r.tokens };
  version = r.version;
  dungForm();
  capNhat();
}

function hoiXacNhan(): void {
  replaceChildren(xacNhanEl,
    h("p", null, "Áp dụng giao diện này cho mọi người? Mọi người sẽ thấy ở lần mở trang kế tiếp."),
    h("div", { class: "actions" },
      h("button", { type: "button", class: "btn btn-primary", onclick: () => void apDung() }, "Áp dụng"),
      h("button", { type: "button", class: "btn", onclick: () => { xacNhanEl.hidden = true; } }, "Thôi")));
  xacNhanEl.hidden = false;
}

async function apDung(): Promise<void> {
  xacNhanEl.hidden = true;
  showError(errorEl, null);
  apDungBtn.disabled = true;
  try {
    const r = await api<Api.GiaoDienDto>("/api/giao-dien", { method: "PUT", body: { tokens: dangSua, version } });
    daLuu = { ...r.tokens };
    version = r.version;
    showError(errorEl, null);
  } catch (err) {
    if (err instanceof ApiError && err.code === "stale") {
      try { await napLai(); showError(errorEl, err.message); } catch { showError(errorEl, "Không tải được cài đặt giao diện."); }
    }
    else showError(errorEl, err instanceof ApiError ? err.message : "Không kết nối được máy chủ.");
  } finally { capNhat(); }
}

void (async () => {
  const staff = await initShell();
  if (!staff) return;
  if (!can(staff, "settings.ops")) {
    showError(errorEl, "Chỉ người phụ trách hệ thống được đổi giao diện.");
    for (const el of [formEl, xemEl, apDungBtn.parentElement!]) el.hidden = true;
    return;
  }
  tatBanDaLuu();
  dungXemTruoc();
  apDungBtn.onclick = hoiXacNhan;
  boBtn.onclick = () => { dangSua = { ...daLuu }; dungForm(); capNhat(); };
  macDinhBtn.onclick = () => { dangSua = {}; dungForm(); capNhat(); };
  try { await napLai(); } catch (err) { showError(errorEl, err instanceof ApiError ? err.message : "Không tải được cài đặt giao diện."); }
})();
