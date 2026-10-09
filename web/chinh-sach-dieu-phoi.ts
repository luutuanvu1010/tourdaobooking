// Chính sách điều phối (/chinh-sach-dieu-phoi — ADR-0049 D2, ADR-0050 VK1-A thành phần F; bản vẽ docs/design/van-chuyen-dieu-phoi/project/08 …, khung 8a / 8b).
// Chỉ Toàn quyền (ô settings.ops — máy chủ hỏi lại ở cả route đọc). Mỗi lần lưu là MỘT bản mới, hiệu lực ngay lúc lưu (máy chủ đặt — I28; bản vẽ vẽ ô
// "Ngày hiệu lực của bản mới" nhưng máy chủ từ chối thân có ngày hiệu lực → thay bằng một dòng chữ, xem nhật ký giao diện). Hai ô theo GIỜ (mốc, sát mốc),
// hai ô theo PHÚT (nghỉ, khai lùi); đổi đơn vị và câu báo lỗi ở src/shared/chinh-sach-hien-thi.ts (ruling H19). "Phải có hợp đồng" khoá tắt (ĐP7), không gửi.
// Ô ngày hiệu lực và dòng "Đang soạn" của bản vẽ: CHỜ CHỦ (câu Q3 — docs/design/van-chuyen-dieu-phoi/DOI-CHIEU-2026-09-29.md mục 2.14) → không dựng.
// Điện thoại: lịch sử bản mở trong bảng trượt ("Lịch sử bản (N) ›"), nút "Lưu thành bản mới" dính đáy.
import {
  docFormChinhSach, dongLichSuChinhSach, formTuChinhSach, nhanDieuKien, nhanThoiLuong, thayDoiChinhSach, type DongLichSu, type FormChinhSach, type TruongChinhSach,
} from "../src/shared/chinh-sach-hien-thi";
import { can } from "../src/shared/permissions";
import { ApiError, api, type Api } from "./api";
import { moBangTruot } from "./bang-truot";
import { byId, h, replaceChildren } from "./dom";
import { datCrumb, loiCua } from "./giay-to-ui";
import { icon } from "./icons";
import { initShell, showError } from "./shell";

const errorEl = byId("error");
const okEl = byId("cs-ok");
const layoutEl = byId("cs-layout");
const formEl = byId<HTMLFormElement>("cs-form");
const histEl = byId("cs-lich-su");
const bottomEl = byId("cs-bottom");

const staff = await initShell();
datCrumb("Vận chuyển", "Chính sách điều phối");

let duLieu: Api.DispatchPolicyResponse = { current: null, history: [] };
let dieuKien: Api.DepartureRuleDto[] = [];
let tenGiayToNguoi = new Map<string, string>();
let st: FormChinhSach = formTuChinhSach(null);
let dangGui = false;

async function nap(): Promise<void> {
  const [cs, dk] = await Promise.all([
    api<Api.DispatchPolicyResponse>("/api/van-chuyen/chinh-sach-dieu-phoi"),
    api<Api.DepartureRuleListResponse>("/api/van-chuyen/dieu-kien").catch(() => null), // khối chip là phụ: lỗi thì chỉ còn liên kết
  ]);
  duLieu = cs;
  dieuKien = dk?.rules ?? [];
  if (dieuKien.some((r) => r.active && r.subject === "DRIVER" && r.documentTypeName === null)) {
    const meta = await api<Api.PersonDocumentMetaResponse>("/api/parties/documents/meta").catch(() => null);
    tenGiayToNguoi = new Map((meta?.types ?? []).map((t) => [t.code, t.name]));
  }
  st = formTuChinhSach(duLieu.current);
}

// ---- ô số -------------------------------------------------------------------------------------------------------------------------------------------------
interface O {
  truong: TruongChinhSach;
  input: HTMLInputElement;
  err: HTMLElement;
  hint: HTMLElement;
}
const oSo: O[] = [];

function taoO(truong: TruongChinhSach, nhan: string, goiY: string, theoGio: boolean): HTMLElement {
  const id = `cs-${truong}`;
  const hint = h("div", { id: `${id}-hint`, class: "vc-hint" }, goiY);
  const err = h("div", { id: `${id}-error`, class: "vc-field-error", role: "alert", hidden: true });
  const input = h("input", {
    id, class: "vc-input", type: "text", inputmode: theoGio ? "decimal" : "numeric", value: st[truong], autocomplete: "off", "aria-describedby": `${id}-hint ${id}-error`,
  });
  input.addEventListener("input", () => {
    st = { ...st, [truong]: input.value };
    baoLoi({ truong, input, err, hint }, null);
    if (truong === "satMocGio") capNhatGoiYSatMoc();
  });
  oSo.push({ truong, input, err, hint });
  return h("div", { class: "vc-field" }, h("label", { for: id }, nhan), input, hint, err);
}
function baoLoi(o: O, cau: string | null): void {
  replaceChildren(o.err, ...(cau ? [icon("alert", 16, 2), cau] : []));
  o.err.hidden = !cau;
  if (cau) o.input.setAttribute("aria-invalid", "true");
  else o.input.removeAttribute("aria-invalid");
}
/** Gợi ý của ô sát mốc nói đúng con số đang gõ (bản vẽ: "Chặng chưa xếp trong 2 giờ trước mốc hiện nhãn “Sát mốc”"). */
function capNhatGoiYSatMoc(): void {
  const o = oSo.find((x) => x.truong === "satMocGio");
  if (!o) return;
  const r = docFormChinhSach({ ...st, mocGio: "1", nghiPhut: "0", khaiLuiPhut: "1", gioLaiGio: "8", chuyenDaiGio: "4", cuaSoGio: "1", choNhanPhut: "10" }); // chỉ đọc ô sát mốc
  const khoang = r.ok ? nhanThoiLuong(r.value.warnLeadMinutes) : "khoảng này";
  o.hint.textContent = `Chặng chưa xếp trong ${khoang} trước mốc hiện nhãn “Sát mốc”.`;
}

// ---- công tắc ---------------------------------------------------------------------------------------------------------------------------------------------
function congTac(id: string, nhan: string, goiY: string, bat: boolean, khoa: boolean, onDoi?: (bat: boolean) => void): HTMLElement {
  const nut = h(
    "button",
    { id, type: "button", role: "switch", class: "dp-switch", "aria-checked": String(bat), "aria-labelledby": `${id}-label`, "aria-describedby": `${id}-hint`, disabled: khoa },
    h("span", { class: "dp-switch-knob" }),
  );
  nut.addEventListener("click", () => {
    const moi = nut.getAttribute("aria-checked") !== "true";
    nut.setAttribute("aria-checked", String(moi));
    onDoi?.(moi);
  });
  return h(
    "div",
    { class: khoa ? "dp-toggle is-locked" : "dp-toggle" },
    h("span", { class: "dp-toggle-text" }, h("span", { id: `${id}-label`, class: "dp-toggle-label" }, nhan), h("span", { id: `${id}-hint`, class: "dp-toggle-hint" }, goiY)),
    nut,
  );
}

// ---- lịch sử bản -------------------------------------------------------------------------------------------------------------------------------------------
// Bản vẽ 8a có dòng "Bản N · Đang soạn · Chưa lưu" — CHỜ CHỦ (bản đối chiếu mục 2.14, câu Q3): tới khi chủ trả lời, lịch sử chỉ gồm các bản đã lưu.
function dongDom(d: DongLichSu): HTMLElement {
  return h(
    "div",
    { class: "dp-hist-row", "data-ban": d.ten },
    h("span", { class: "dp-hist-name" }, h("strong", null, d.ten), h("span", { class: `chip chip-${d.tone}` }, d.trangThai)),
    h("span", null, d.hieuLuc),
    h("span", { class: "dp-hist-sub" }, d.tomTat),
    d.nguoiLuu ? h("span", { class: "dp-hist-sub", "data-nguoi-luu": "1" }, d.nguoiLuu) : null,
  );
}
/** Các bản đã lưu, mới trước (máy chủ trả sẵn thứ tự). */
function dongLichSu(): HTMLElement[] {
  const out = dongLichSuChinhSach(duLieu.history).map(dongDom);
  if (out.length === 0) out.push(h("div", { class: "dp-hist-row dp-hist-sub" }, "Chưa có bản nào."));
  return out;
}
function veLichSu(): void {
  replaceChildren(histEl, h("div", { class: "dp-hist-head" }, icon("history", 16), h("h2", { id: "cs-lich-su-title", class: "dp-hist-title" }, "Lịch sử bản")), ...dongLichSu());
  const mo = document.getElementById("cs-hist-open");
  if (mo) mo.firstChild!.textContent = `Lịch sử bản (${duLieu.history.length})`;
}
function moLichSu(nut: HTMLElement): void {
  const dong = h("button", { type: "button", class: "vc-btn vc-btn-ghost-primary" }, "Đóng");
  const bang = moBangTruot({ title: "Lịch sử bản", body: [h("div", { class: "dp-hist dp-hist-sheet" }, ...dongLichSu())], foot: [dong], opener: nut });
  dong.addEventListener("click", () => bang?.close());
}

// ---- dựng form -------------------------------------------------------------------------------------------------------------------------------------------
function dung(): void {
  oSo.length = 0;
  const nums = h(
    "div",
    { class: "dp-cs-nums" },
    taoO("mocGio", "Mốc tối thiểu (giờ)", "Trong mốc này trước giờ xuất bến: khoá xếp khách, đổi xe, đổi tài xế.", true),
    taoO("satMocGio", "Cảnh báo sát mốc (giờ)", "", true),
    taoO("nghiPhut", "Khoảng nghỉ tài xế (phút)", "Giữa hai chuyến của cùng tài xế.", false),
    taoO("khaiLuiPhut", "Khai lùi tối đa (phút)", "Từ 1 đến 1440, mặc định 180.", false),
    // ADR-0055 VK2-B: hai con số giờ lái — chỉ nhắc, không chặn (khuôn ô có sẵn; không cần bản vẽ).
    taoO("gioLaiGio", "Giờ lái tối đa một ngày (giờ)", "Vượt thì chỉ cảnh báo, không chặn. Mặc định 8.", true),
    taoO("chuyenDaiGio", "Nhắc nghỉ khi chuyến dài hơn (giờ)", "Chỉ nhắc. Mặc định 4.", true),
    // ADR-0096 Đ2.3: cửa sổ xuất bến — không ai phá lệ; xe thật sự chạy sớm thì văn phòng sửa giờ chuyến. Gợi ý KHÔNG ghi con số mặc định (con số ở bảng).
    taoO("cuaSoGio", "Cửa sổ xuất bến (giờ)", "Chỉ xuất bến được từ giờ khởi hành trừ số giờ này, từ 1 đến 48. Không ai phá lệ.", true),
    // ADR-0111 Đ3 (c): chuyển khách giữa hai xe — hết giờ chờ thì tài xế nhờ thấy "hết giờ chờ", không ai nhận tin lúc hết giờ.
    taoO("choNhanPhut", "Chờ tài xế xe nhận trả lời (phút)", "Quá số phút này mà tài xế xe nhận chưa bấm thì lần nhờ hết hạn. Từ 1 đến 120.", false),
  );
  capNhatGoiYSatMoc();
  const toggles = h(
    "div",
    { class: "dp-toggles" },
    congTac("cs-du-danh-sach", "Phải đủ danh sách khách", "Thiếu tên thì chưa xuất bến được.", st.duDanhSach, false, (bat) => {
      st = { ...st, duDanhSach: bat };
    }),
    congTac("cs-hop-dong", "Phải có hợp đồng", "Khoá tắt — chưa dùng ở lượt này.", false, true),
    // ADR-0052 D4.1 + ADR-0111 Đ3 (c): công tắc an toàn — tắt thì mọi lần nhờ tài xế xe nhận đã bấm Nhận đều chờ Quản trị, kể cả lần gửi trước khi tắt.
    congTac("cs-tu-dong-y", "Tự đồng ý chuyển khách", "Đạt mọi điều kiện thì khách sang xe nhận ngay. Tắt thì mọi lần nhờ chờ Quản trị duyệt.", st.tuDongY, false, (bat) => {
      st = { ...st, tuDongY: bat };
    }),
  );
  const dangAp = dieuKien.filter((r) => r.active);
  const rules = h(
    "div",
    { class: "dp-cs-rules" },
    h("span", { id: "cs-rules-label", class: "dp-cs-rules-label" }, "Điều kiện xuất bến có sẵn"),
    dangAp.length > 0
      ? h("div", { class: "dp-chips", role: "list", "aria-labelledby": "cs-rules-label" }, ...dangAp.map((r) => h("span", { class: "chip chip-unit", role: "listitem" }, nhanDieuKien(r, (c) => tenGiayToNguoi.get(c)))))
      : h("span", { class: "dp-hist-sub" }, "Chưa có điều kiện nào đang áp."),
    h("a", { class: "dp-link", href: "/dieu-kien-xuat-ben" }, "Điều kiện theo cỡ xe, hạng bằng ›"),
  );
  const luuMay = h("button", { type: "submit", class: "vc-btn btn btn-primary" }, "Lưu thành bản mới");
  replaceChildren(
    formEl,
    nums,
    toggles,
    rules,
    h("p", { class: "vc-hint dp-cs-note" }, "Bản mới có hiệu lực ngay khi lưu; bản đang dùng chuyển vào lịch sử."),
    h("div", { class: "dp-cs-actions" }, luuMay),
  );
  const moLs = h("button", { id: "cs-hist-open", type: "button", class: "dp-hist-open" }, `Lịch sử bản (${duLieu.history.length})`, " ›");
  moLs.addEventListener("click", () => moLichSu(moLs));
  document.getElementById("cs-hist-open")?.remove();
  layoutEl.after(moLs);
  const luuDay = h("button", { type: "button", class: "vc-btn btn btn-primary btn-chinh" }, "Lưu thành bản mới");
  luuDay.addEventListener("click", () => formEl.requestSubmit());
  replaceChildren(bottomEl, luuDay);
  veLichSu();
  layoutEl.hidden = false;
  bottomEl.hidden = false;
}

function datDangGui(v: boolean): void {
  dangGui = v;
  for (const b of [...formEl.querySelectorAll<HTMLButtonElement>("button[type=submit]"), ...bottomEl.querySelectorAll<HTMLButtonElement>("button")]) {
    b.disabled = v;
    b.textContent = v ? "Đang lưu…" : "Lưu thành bản mới";
  }
}

formEl.addEventListener("submit", (e) => {
  e.preventDefault();
  void luu();
});

async function luu(): Promise<void> {
  if (dangGui) return;
  errorEl.className = "alert";
  showError(errorEl, null);
  showError(okEl, null);
  const r = docFormChinhSach(st);
  if (!r.ok) {
    for (const o of oSo) baoLoi(o, r.loi[o.truong] ?? null);
    oSo.find((o) => r.loi[o.truong])?.input.focus();
    return;
  }
  if (thayDoiChinhSach(duLieu.current, r.value).length === 0) {
    showError(errorEl, "Chưa đổi gì so với bản đang dùng — không cần lưu bản mới.");
    errorEl.className = "alert warn";
    return;
  }
  datDangGui(true);
  try {
    duLieu = await api<Api.DispatchPolicyResponse>("/api/van-chuyen/chinh-sach-dieu-phoi", { method: "POST", body: r.value });
    st = formTuChinhSach(duLieu.current);
    dung();
    showError(okEl, "Đã lưu bản mới — có hiệu lực từ bây giờ.");
    okEl.scrollIntoView({ block: "nearest" });
  } catch (err) {
    datDangGui(false);
    if (err instanceof ApiError && err.code === "stale") {
      await nap().then(dung).catch(() => undefined);
      showError(errorEl, `${err.message} Đã nạp bản mới nhất.`);
    } else showError(errorEl, loiCua(err));
    errorEl.scrollIntoView({ block: "nearest" });
  }
}

async function main(): Promise<void> {
  if (!can(staff, "settings.ops")) return showError(errorEl, "Chỉ Toàn quyền xem và đổi được chính sách điều phối.");
  try {
    await nap();
  } catch (err) {
    return showError(errorEl, loiCua(err));
  }
  dung();
}
await main();
