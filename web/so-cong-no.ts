// Trang «Sổ công nợ» — Kế toán, Toàn quyền (kế hoạch docs/superpowers/plans/2026-10-24-so-cong-no-doi-tac-ke-hoach-thi-cong.md P1; bản vẽ docs/design/so-cong-no-2026-10-25/ bản 2a).
// CHỈ ĐỌC. Gọi hai route của billing:
//   GET /api/ledger                 → SoCongNoResponse: số dư từng bên, hai ô tổng (máy chủ tính), khoản chờ xác nhận, khoản chưa rõ người thu;
//   GET /api/ledger/ben/:partyId    → SoCongNoBenResponse: từng đơn chia hai nhóm, X − Y, cờ lệch (máy chủ tính).
// Trang KHÔNG cộng trừ tiền — chỉ định dạng, lọc, xếp, đếm. Ẩn/hiện hỏi `can(staff, "ledger.view")` — cùng ô máy chủ hỏi. Chữ ở src/shared/so-cong-no-hien-thi.ts (có bài kiểm).
// Máy tính rộng: danh sách trái + ngăn chi tiết phải; điện thoại / máy tính bảng: chi tiết là «trang con» (thay danh sách, nút Quay lại, nút Back của trình duyệt cũng về).
import { ApiError, api, type Api } from "./api";
import { can } from "../src/shared/permissions";
import {
  BEN_MOI_LAN, CAU_LECH, DON_MOI_LAN, NHAN_LOC, NHAN_XEP, cauSoDu, khopTen, qua, xepBen, type LocSoCongNo, type XepSoCongNo,
} from "../src/shared/so-cong-no-hien-thi";
import { ngayDayDu } from "../src/shared/vn-date";
import { byId, h, replaceChildren } from "./dom";
import { vnd } from "./format";
import { ganDaiTrangAnhEm } from "./dai-trang-anh-em";
import { initShell, showError } from "./shell";

const errorEl = byId("error");
const noiDungEl = byId("scn-noi-dung");
const canhBaoEl = byId("scn-canh-bao");
const tongEl = byId("scn-tong");
const dsKhuEl = byId("scn-ds-khu");
const ctKhuEl = byId("scn-ct-khu");
const dsEl = byId("scn-ds");
const locEl = byId("scn-loc");
const timEl = byId<HTMLInputElement>("scn-tim");
const xepEl = byId<HTMLSelectElement>("scn-xep");

const staff = await initShell();
ganDaiTrangAnhEm("/so-cong-no", staff); // mục gộp «Sổ công nợ & khoá sổ» (25/10): dải chuyển nhanh hai trang
const reasonOf = (err: unknown): string => (err instanceof ApiError ? err.message : "Không kết nối được máy chủ.");
const rong = (): boolean => window.matchMedia("(min-width: 1024px)").matches;

if (!can(staff, "ledger.view")) {
  showError(errorEl, "Trang Sổ công nợ chỉ Kế toán và Toàn quyền xem được.");
} else {
  noiDungEl.hidden = false;
  let so: Api.SoCongNoResponse | null = null;
  let loc: LocSoCongNo = "tat_ca";
  let xep: XepSoCongNo = "so_tien";
  let soBenHien = BEN_MOI_LAN;
  let dangChon: string | null = null;
  let ct: Api.SoCongNoBenResponse | null = null;
  let ctLoi: string | null = null;
  const soDonHien = { dangGiu: DON_MOI_LAN, congTyNo: DON_MOI_LAN };

  for (const k of Object.keys(NHAN_XEP) as XepSoCongNo[]) xepEl.append(h("option", { value: k }, NHAN_XEP[k]));
  xepEl.addEventListener("change", () => { xep = xepEl.value as XepSoCongNo; soBenHien = BEN_MOI_LAN; veDanhSach(); });
  timEl.addEventListener("input", () => { soBenHien = BEN_MOI_LAN; veDanhSach(); });

  function veCanhBao(s: Api.SoCongNoResponse): void {
    const phan = [s.choXacNhan.length > 0 && `${s.choXacNhan.length} khoản chờ xác nhận`, s.chuaRo.length > 0 && `${s.chuaRo.length} khoản chưa rõ người thu tiền`].filter(Boolean);
    replaceChildren(canhBaoEl, phan.length > 0 && h("a", { class: "alert warn scn-canh-bao", href: "/" }, `${phan.join(" · ")} — xử lý ở Trang chủ ›`));
  }

  function veTong(s: Api.SoCongNoResponse): void {
    const o = (nhan: string, so: string) => h("div", { class: "scn-o-tong" }, h("span", { class: "muted" }, nhan), h("strong", null, so));
    replaceChildren(tongEl, o("Các bên đang giữ", vnd(s.tongDangGiu)), o("Công ty đang nợ", vnd(s.tongCongTyNo)), o("Số bên", String(s.soDu.length)));
  }

  function veLoc(s: Api.SoCongNoResponse): void {
    replaceChildren(locEl, ...(Object.keys(NHAN_LOC) as LocSoCongNo[]).map((k) => {
      const dem = s.soDu.filter((b) => qua(k, b.dangGiu)).length;
      const b = h("button", { type: "button", class: "scn-loc-nut", "aria-pressed": String(loc === k) }, `${NHAN_LOC[k]} (${dem})`);
      b.addEventListener("click", () => { loc = k; soBenHien = BEN_MOI_LAN; veLoc(s); veDanhSach(); });
      return b;
    }));
  }

  function veDanhSach(): void {
    if (!so) return;
    const tim = timEl.value;
    const loc2 = xepBen(so.soDu.filter((b) => qua(loc, b.dangGiu) && (!tim.trim() || khopTen(b.ten, tim))), xep);
    if (so.soDu.length === 0) { replaceChildren(dsEl, h("p", { class: "muted" }, "Chưa bên nào có số dư với công ty.")); return; }
    if (loc2.length === 0) { replaceChildren(dsEl, h("p", { class: "muted" }, tim.trim() ? `Không tìm thấy bên nào tên «${tim.trim()}».` : "Không có bên nào trong nhóm này.")); return; }
    const hien = loc2.slice(0, soBenHien);
    const ul = h("ul", { class: "scn-ds" }, ...hien.map((b) => {
      const nut = h("button", { type: "button", class: "scn-ben", "aria-current": String(b.partyId === dangChon), "data-ben": b.partyId },
        h("span", { class: "scn-ben-ten" }, b.ten),
        h("span", { class: b.dangGiu > 0 ? "scn-so scn-giu" : "scn-so scn-no" }, cauSoDu(b.dangGiu, vnd)));
      nut.addEventListener("click", () => void chon(b.partyId));
      return h("li", null, nut);
    }));
    const con = loc2.length - hien.length;
    const them = con > 0 && h("button", { type: "button", class: "btn scn-them" }, `Xem thêm ${Math.min(BEN_MOI_LAN, con)} bên`);
    if (them) them.addEventListener("click", () => { soBenHien += BEN_MOI_LAN; veDanhSach(); });
    replaceChildren(dsEl, ul, them);
  }

  function nhom(tieuDe: string, khoa: "dangGiu" | "congTyNo", n: Api.SoCongNoBenResponse["dangGiu"]): HTMLElement | false {
    if (n.don.length === 0) return false;
    const hien = n.don.slice(0, soDonHien[khoa]);
    const con = n.don.length - hien.length;
    const them = con > 0 && h("button", { type: "button", class: "btn scn-them" }, `Xem thêm ${Math.min(DON_MOI_LAN, con)} đơn`);
    if (them) them.addEventListener("click", () => { soDonHien[khoa] += DON_MOI_LAN; veChiTiet(); });
    return h("div", { class: "scn-nhom", "data-nhom": khoa },
      h("h3", { class: "scn-nhom-dau" }, h("span", null, `${tieuDe} · ${n.don.length} đơn`), h("strong", null, vnd(n.tong))),
      h("ul", { class: "scn-don-ds" }, ...hien.map((d) => h("li", { class: "scn-don" },
        h("span", { class: "scn-don-ma" }, d.orderId ? h("a", { href: `/order?id=${encodeURIComponent(d.orderId)}` }, d.maDon ?? "—") : (d.maDon ?? "—")),
        h("span", { class: d.daHuy ? "scn-don-tt scn-huy" : "scn-don-tt muted" }, d.trangThai),
        h("span", { class: "scn-don-ngay muted" }, `Phát sinh ${ngayDayDu(d.ngayGanNhat)}`),
        h("strong", { class: "scn-don-tien" }, vnd(d.soTien))))),
      them);
  }

  function veChiTiet(): void {
    const quay = !rong() && h("button", { type: "button", class: "btn scn-quay" }, "‹ Danh sách");
    if (quay) quay.addEventListener("click", () => history.back());
    if (!dangChon) {
      replaceChildren(ctKhuEl, h("p", { class: "muted" }, "Chọn một bên ở danh sách để xem từng đơn."));
      return;
    }
    if (ctLoi) { replaceChildren(ctKhuEl, quay, h("div", { class: "alert", role: "alert" }, ctLoi)); return; }
    if (!ct || ct.partyId !== dangChon) { replaceChildren(ctKhuEl, quay, h("p", { class: "muted" }, "Đang tải…")); return; }
    const c = ct;
    const lech = c.lech !== 0;
    replaceChildren(ctKhuEl,
      quay,
      h("div", { class: "scn-ct-dau" }, h("h2", null, c.ten), h("p", { class: c.soDu > 0 ? "scn-ct-so scn-giu" : "scn-ct-so scn-no" }, cauSoDu(c.soDu, vnd))),
      lech && h("div", { class: "alert scn-lech", role: "alert" }, CAU_LECH(vnd(Math.abs(c.lech)))),
      nhom("Bên này đang giữ", "dangGiu", c.dangGiu),
      nhom("Công ty nợ bên này", "congTyNo", c.congTyNo),
      h("div", { class: lech ? "scn-phep-tinh scn-phep-lech" : "scn-phep-tinh" },
        h("span", null, `Đang giữ ${vnd(c.dangGiu.tong)}`),
        h("span", null, `Công ty nợ ${vnd(c.congTyNo.tong)}`),
        h("span", null, `Cộng các đơn ${vnd(c.congCacDon)}`),
        h("strong", null, lech ? `Số dư sổ ${vnd(c.soDu)} — lệch ${vnd(Math.abs(c.lech))}` : `= Số dư ${vnd(c.soDu)} ✓ Khớp`)),
    );
  }

  function veBo(): void {
    const coCt = dangChon !== null;
    // Hẹp: chi tiết là «trang con» — ẩn danh sách, ba ô tổng và dòng cảnh báo; rộng: hai cột cùng lúc.
    dsKhuEl.hidden = !rong() && coCt;
    tongEl.hidden = !rong() && coCt;
    canhBaoEl.hidden = !rong() && coCt;
    ctKhuEl.hidden = !rong() && !coCt;
    veChiTiet();
    veDanhSach();
  }

  async function chon(partyId: string, tuLichSu = false): Promise<void> {
    dangChon = partyId;
    ct = null;
    ctLoi = null;
    soDonHien.dangGiu = DON_MOI_LAN;
    soDonHien.congTyNo = DON_MOI_LAN;
    if (!tuLichSu) history.pushState({ ben: partyId }, "", `#ben=${encodeURIComponent(partyId)}`);
    veBo();
    try {
      const r = await api<Api.SoCongNoBenResponse>(`/api/ledger/ben/${encodeURIComponent(partyId)}`);
      if (dangChon === partyId) ct = r;
    } catch (err) {
      if (dangChon === partyId) ctLoi = reasonOf(err);
    }
    veChiTiet();
    if (!rong()) ctKhuEl.scrollIntoView({ block: "start" });
  }

  const tuHash = (): string | null => {
    const m = /^#ben=(.+)$/.exec(location.hash);
    return m ? decodeURIComponent(m[1]!) : null;
  };
  window.addEventListener("popstate", () => {
    const p = tuHash();
    if (p) void chon(p, true);
    else { dangChon = null; ct = null; veBo(); }
  });
  window.matchMedia("(min-width: 1024px)").addEventListener("change", veBo);

  replaceChildren(dsEl, h("p", { class: "muted" }, "Đang tải…"));
  try {
    so = await api<Api.SoCongNoResponse>("/api/ledger");
    veCanhBao(so);
    veTong(so);
    veLoc(so);
  } catch (err) {
    replaceChildren(dsEl, h("div", { class: "alert", role: "alert" }, `Không tải được sổ: ${reasonOf(err)}`));
  }
  const dau = tuHash();
  if (dau) void chon(dau, true);
  else veBo();
}
