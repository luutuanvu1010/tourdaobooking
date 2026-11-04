// Trang "Phân định trách nhiệm" (ADR-0116). Hai khối: «Khoản của tôi» (mọi tài khoản; chỉ khoản của chính hồ sơ, phản hồi trong 3 ngày làm việc) và «Các phiếu» (Kế toán, Quản trị, Toàn quyền; không giữ quyền Đối tác).
// Nút nào hiện do MÁY CHỦ tính trên từng phiếu (coThePhanDinh, coTheGhi, coTheGhiDoi, coTheDoiBenChiu, coTheHuy). Trang không tự cộng trừ tiền, không tự kiểm I1. Chữ và bảng trường hợp ở src/shared/phan-dinh.ts.
import { ApiError, api, type Api } from "./api";
import { guiCoCanhBaoTrung } from "./canh-bao-trung";
import { byId, h, replaceChildren } from "./dom";
import { METHOD_LABEL, dateTime, parseMoney, vnd } from "./format";
import { regroupMoney, setMoneyValue } from "./money-input";
import { initShell, showError } from "./shell";
import { can, holdsPartner } from "../src/shared/permissions";
import { CAU_MAN_HINH, MA_TRUONG_HOP, NHAN_TRANG_THAI_PHIEU, TONG_TRANG_THAI_PHIEU, TRUONG_HOP, laMaTruongHop, type MaTruongHop } from "../src/shared/phan-dinh";

const errorEl = byId("error");
const okEl = byId("ok");
const staff = await initShell();
const coO = (can(staff, "attribution.request") || can(staff, "attribution.decide") || can(staff, "ledger.write")) && !holdsPartner(staff);
byId("pd-giai-thich").textContent = CAU_MAN_HINH;

const reasonOf = (err: unknown): string => (err instanceof ApiError ? err.message : "Không kết nối được máy chủ.");
const nhanTH = (ma: string): string => (laMaTruongHop(ma) ? TRUONG_HOP[ma].nhan : "—");
function hienOk(t: string | null): void {
  okEl.textContent = t ?? "";
  okEl.hidden = !t;
}
const ngayHomNay = (): string => new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);

/** Một lệnh: khoá nút trong lúc gửi; lỗi hiện đúng câu của máy chủ; xong thì tải lại. */
async function chay(viec: () => Promise<unknown>, cauXong: string, nut: HTMLButtonElement): Promise<void> {
  showError(errorEl, null);
  hienOk(null);
  nut.disabled = true;
  try {
    await viec();
    hienOk(cauXong);
    await taiLai();
  } catch (err) {
    showError(errorEl, reasonOf(err));
    errorEl.scrollIntoView({ block: "nearest" });
    nut.disabled = false;
  }
}

function oTien(gt: number | null, nhan: string): { el: HTMLElement; doc: () => number } {
  const o = h("input", { type: "text", inputmode: "numeric", autocomplete: "off" }) as HTMLInputElement;
  o.addEventListener("input", () => regroupMoney(o));
  if (gt !== null) setMoneyValue(o, gt);
  return { el: h("label", null, nhan, o), doc: () => parseMoney(o.value) };
}
function oLyDo(nhan = "Lý do (tối thiểu 10 ký tự, không ghi số điện thoại)"): { el: HTMLElement; doc: () => string } {
  const o = h("textarea", { rows: 2, maxlength: 300, autocomplete: "off" }) as HTMLTextAreaElement;
  return { el: h("label", null, nhan, o), doc: () => o.value.trim() };
}
function oHinhThuc(macDinh = "CASH"): { el: HTMLElement; doc: () => string; o: HTMLSelectElement } {
  const o = h("select", null, ...(["CASH", "BANK_TRANSFER", "OTHER"] as const).map((m) => h("option", { value: m }, METHOD_LABEL[m]))) as HTMLSelectElement;
  o.value = macDinh;
  return { el: h("label", null, "Hình thức", o), doc: () => o.value, o };
}
/** Ô mã giao dịch khi chuyển khoản về công ty (ADR-0092 Đ6). */
function oMa(hinhThuc: HTMLSelectElement): { el: HTMLElement; than: () => Record<string, unknown> } {
  const ma = h("input", { type: "text", autocomplete: "off", maxlength: 64 }) as HTMLInputElement;
  const so = oTien(null, "Số thực chuyển (₫)");
  const khoi = h("div", { class: "dc-form", hidden: true }, h("label", null, "Mã giao dịch", ma), so.el);
  const capNhat = (): void => { khoi.hidden = hinhThuc.value !== "BANK_TRANSFER"; };
  hinhThuc.addEventListener("change", capNhat);
  capNhat();
  return { el: khoi, than: () => (hinhThuc.value === "BANK_TRANSFER" ? { maGiaoDich: ma.value.trim(), soThucChuyen: so.doc() } : {}) };
}
/** Ô «gõ rồi chọn» hồ sơ bên chịu (máy chủ từ chối khách thuần, hồ sơ không vai). */
function oBenChiu(): { el: HTMLElement; doc: () => string | null } {
  const q = h("input", { type: "search", autocomplete: "off", placeholder: "Gõ tên rồi chọn" }) as HTMLInputElement;
  const kq = h("ul", { class: "dc-kq", hidden: true });
  let chon: string | null = null;
  let hen = 0;
  q.addEventListener("input", () => {
    chon = null;
    window.clearTimeout(hen);
    const t = q.value.trim();
    if (t.length < 2) { kq.hidden = true; return; }
    hen = window.setTimeout(() => void (async () => {
      try {
        const rows = (await api<Api.PartyListResponse>(`/api/parties?limit=8&q=${encodeURIComponent(t)}`)).parties;
        replaceChildren(kq, ...rows.map((p) => {
          const b = h("button", { type: "button", class: "btn dc-kq-nut" }, p.displayName);
          b.addEventListener("click", () => { chon = p.id; q.value = p.displayName; kq.hidden = true; });
          return h("li", null, b);
        }));
        kq.hidden = rows.length === 0;
      } catch (err) {
        showError(errorEl, reasonOf(err));
      }
    })(), 250);
  });
  return { el: h("div", { class: "dc-form" }, h("label", null, "Bên chịu trách nhiệm", q), kq), doc: () => chon };
}
function oTruongHop(boT11 = false): { el: HTMLElement; doc: () => MaTruongHop; o: HTMLSelectElement; goiY: HTMLElement } {
  const o = h("select", null, ...MA_TRUONG_HOP.filter((m) => !(boT11 && m === "T11")).map((m) => h("option", { value: m }, TRUONG_HOP[m].nhan))) as HTMLSelectElement;
  const goiY = h("p", { class: "muted" });
  const capNhat = (): void => { goiY.textContent = TRUONG_HOP[o.value as MaTruongHop].goiY; };
  o.addEventListener("change", capNhat);
  capNhat();
  return { el: h("label", null, "Trường hợp", o), doc: () => o.value as MaTruongHop, o, goiY };
}
/** Khối mở bằng một nút: `dung` dựng ô + hàm gửi khi người dùng bấm mở. */
function khoiMo(nhan: string, action: string, dung: (nut: HTMLButtonElement) => (HTMLElement | null)[] | Promise<(HTMLElement | null)[]>): HTMLElement {
  const wrap = h("div", { class: "dc-tu-choi", hidden: true });
  const mo = h("button", { type: "button", class: "btn", "data-action": action }, nhan) as HTMLButtonElement;
  mo.addEventListener("click", () => void (async () => {
    if (!wrap.hidden) { wrap.hidden = true; return; }
    try {
      replaceChildren(wrap, ...(await dung(mo)));
      wrap.hidden = false;
    } catch (err) {
      showError(errorEl, reasonOf(err));
    }
  })());
  return h("div", { class: "dc-form" }, mo, wrap);
}
const nutChot = (nhan: string, action: string, bam: (n: HTMLButtonElement) => void): HTMLButtonElement => {
  const n = h("button", { type: "button", class: "btn btn-primary", "data-action": action }, nhan) as HTMLButtonElement;
  n.addEventListener("click", () => bam(n));
  return n;
};

function formPhanDinh(p: Api.PhieuPhanDinhDto): HTMLElement {
  return khoiMo("Phân định", "phan-dinh", () => {
    const th = oTruongHop();
    const ben = oBenChiu();
    const so = oTien(p.soTienDeNghi, "Số giảm trừ (₫)");
    const ra = h("input", { type: "checkbox", checked: true }) as HTMLInputElement;
    const raEl = h("label", { class: "chon-dong" }, ra, " Trả tiền cho khách");
    const lyDo = oLyDo();
    const capNhat = (): void => {
      const t = TRUONG_HOP[th.doc()];
      ben.el.hidden = t.benChiu === "cong_ty";
      raEl.hidden = !t.tienRaDuoc;
    };
    th.o.addEventListener("change", capNhat);
    capNhat();
    return [th.el, th.goiY, ben.el, so.el, raEl, lyDo.el, nutChot("Lưu phân định", "chot-phan-dinh", (n) => {
      const t = TRUONG_HOP[th.doc()];
      const benId = ben.doc();
      if (t.benChiu === "ho_so" && !benId) { showError(errorEl, "Chọn bên chịu trách nhiệm từ danh sách gợi ý."); return; }
      void chay(() => api(`/api/ledger/phan-dinh/${p.id}/quyet`, {
        method: "POST",
        body: { truongHop: th.doc(), soTien: so.doc(), coTienRa: t.tienRaDuoc && ra.checked, lyDo: lyDo.doc(), ...(benId && t.benChiu === "ho_so" ? { benChiuPartyId: benId } : {}) },
      }), "Đã phân định — chờ một người khác ghi sổ.", n);
    })];
  });
}

/** Ghi sổ. Có trả khách: hình thức + người trả (Công ty). Không trả khách: nếu sổ còn ghi đủ thì sửa khoản thu trong chính lần ghi này (T4). */
function formGhi(p: Api.PhieuPhanDinhDto): HTMLElement {
  const pd = p.phanDinh!;
  return khoiMo("Ghi sổ theo phân định", "ghi-so", async () => {
    const ngayThat = h("input", { type: "date" }) as HTMLInputElement;
    const ngayThatEl = h("label", null, "Ngày thật nếu khác hôm nay (chỉ ghi chú)", ngayThat);
    const thanNgay = (): Record<string, unknown> => (ngayThat.value ? { ngayThat: ngayThat.value } : {});
    if (pd.coTienRa) {
      const ht = oHinhThuc();
      return [
        h("p", null, `Trả ${vnd(pd.soTien)} cho khách, người trả: Công ty.`), ht.el, ngayThatEl,
        nutChot("Ghi sổ", "chot-ghi", (n) => void chay(() => api(`/api/ledger/phan-dinh/${pd.id}/ghi`, { method: "POST", body: { hinhThuc: ht.doc(), nguoiTra: "cong_ty", ...thanNgay() } }), "Đã ghi sổ.", n)),
      ];
    }
    const t = await api<Api.OrderPaymentsResponse>(`/api/orders/${encodeURIComponent(p.orderId)}/payments`);
    const conHieuLuc = t.lanThu.filter((l) => !l.traLai && !l.daDao && !l.laDongDao);
    const chon = conHieuLuc.map((l) => ({ l, o: h("input", { type: "checkbox" }) as HTMLInputElement }));
    const moi = oTien(Math.max(0, t.daThu - pd.soTien), "Số khách thật sự đã trả (₫)");
    const ht = oHinhThuc();
    const ma = oMa(ht.o);
    const lyDo = oLyDo("Lý do sửa khoản thu");
    const sua = h("div", { class: "dc-form" },
      h("p", { class: "muted" }, "Khách thật sự chưa trả phần này thì sổ phải ghi đúng số khách đã trả. Chọn khoản thu cần sửa và nhập số đúng; nếu sổ đã đúng thì bỏ qua phần này."),
      ...chon.map((c) => h("label", { class: "chon-dong" }, c.o, ` ${vnd(c.l.soTien)} · ${c.l.hinhThuc} · ${c.l.nguoiThu}`)),
      moi.el, ht.el, ma.el, lyDo.el);
    return [sua, ngayThatEl, nutChot("Ghi sổ", "chot-ghi", (n) => {
      const cu = chon.filter((c) => c.o.checked).map((c) => c.l.id);
      void chay(() => guiCoCanhBaoTrung((boQua) => api(`/api/ledger/phan-dinh/${pd.id}/ghi`, {
        method: "POST",
        body: { ...thanNgay(), ...(cu.length > 0 ? { thay: { cu, lyDo: lyDo.doc(), moi: [{ soTien: moi.doc(), hinhThuc: ht.doc(), nguoiThu: "cong_ty", ...ma.than() }], ...(boQua ? { boQuaTrung: boQua } : {}) } } : {}) },
      }), n), "Đã ghi sổ.", n);
    })];
  });
}

function formDoiBen(p: Api.PhieuPhanDinhDto): HTMLElement {
  return khoiMo("Đổi bên chịu", "doi-ben-chiu", () => {
    const th = oTruongHop(true);
    const ben = oBenChiu();
    const lyDo = oLyDo();
    const capNhat = (): void => { ben.el.hidden = TRUONG_HOP[th.doc()].benChiu === "cong_ty"; };
    th.o.addEventListener("change", capNhat);
    capNhat();
    return [h("p", { class: "muted" }, "Giảm trừ và tiền đã trả khách không đổi. Một người khác ghi sổ lần đổi này."), th.el, ben.el, lyDo.el, nutChot("Lưu phân định mới", "chot-doi-ben", (n) => {
      const t = TRUONG_HOP[th.doc()];
      const benId = ben.doc();
      if (t.benChiu === "ho_so" && !benId) { showError(errorEl, "Chọn bên chịu trách nhiệm từ danh sách gợi ý."); return; }
      void chay(() => api(`/api/ledger/phan-dinh/${p.ghi!.id}/doi-ben-chiu`, { method: "POST", body: { truongHop: th.doc(), lyDo: lyDo.doc(), ...(benId && t.benChiu === "ho_so" ? { benChiuPartyId: benId } : {}) } }), "Đã phân định mới — chờ một người khác ghi sổ.", n);
    })];
  });
}

/** Ghi khoản thu đòi được (khách trả phần đã giảm trừ): ghi khoản thu mới và huỷ giảm trừ, nợ trong cùng lần ghi; được huỷ một phần. */
function formHuy(p: Api.PhieuPhanDinhDto): HTMLElement {
  const g = p.ghi!;
  return khoiMo("Ghi khoản thu đòi được", "huy-khoan", () => {
    const so = oTien(g.conHieuLuc, "Số đòi được (₫)");
    const ht = oHinhThuc();
    const ma = oMa(ht.o);
    const lyDo = oLyDo();
    return [so.el, ht.el, ma.el, lyDo.el, nutChot("Ghi khoản thu và huỷ phần này", "chot-huy", (n) => {
      void chay(() => guiCoCanhBaoTrung((boQua) => api(`/api/ledger/phan-dinh/${g.id}/huy`, {
        method: "POST",
        body: { soTien: so.doc(), lyDo: lyDo.doc(), moi: [{ soTien: so.doc(), hinhThuc: ht.doc(), nguoiThu: "cong_ty", ngayPhatSinh: ngayHomNay(), ...ma.than() }], ...(boQua ? { boQuaTrung: boQua } : {}) },
      }), n), "Đã ghi khoản thu và huỷ phần giảm trừ.", n);
    })];
  });
}

function thePhieu(p: Api.PhieuPhanDinhDto): HTMLElement {
  const pd = p.phanDinh;
  const ghiDoi = p.coTheGhiDoi && p.dangDoiBenChiu
    ? nutChot("Ghi sổ lần đổi bên chịu", "ghi-doi", (n) => void chay(() => api(`/api/ledger/phan-dinh/${p.dangDoiBenChiu!.id}/ghi`, { method: "POST", body: {} }), "Đã ghi sổ lần đổi bên chịu.", n))
    : null;
  return h("li", { class: "dc-the", "data-id": p.id, "data-trang-thai": p.trangThai },
    h("div", { class: "dc-dau" },
      h("a", { href: `/order?id=${encodeURIComponent(p.orderId)}` }, h("strong", null, p.maDon || "—")),
      h("span", { class: "huy-hieu", "data-tong": TONG_TRANG_THAI_PHIEU[p.trangThai] }, NHAN_TRANG_THAI_PHIEU[p.trangThai]),
      p.quaHanNhac ? h("span", { class: "huy-hieu", "data-tong": "cat" }, "Đơn đã giao quá 60 ngày") : null,
      p.t11QuaHan ? h("span", { class: "huy-hieu", "data-tong": "do", "data-khoi": "t11-qua-han" }, "Quá 7 ngày chưa rõ ai chịu") : null),
    h("p", { class: "dc-tien" }, `Đề nghị ${vnd(p.soTienDeNghi)}`),
    h("p", { class: "muted" }, `${p.nguoiDeNghi} · ${dateTime(p.luc)} · ${p.lyDoDeNghi}`),
    pd ? h("p", null, `Phân định: ${nhanTH(pd.truongHop)} · ${pd.benChiu} chịu ${vnd(pd.soTien)}${pd.coTienRa ? " · có trả tiền cho khách" : " · không trả tiền cho khách"}`) : null,
    pd ? h("p", { class: "muted" }, `${pd.nguoiPhanDinh} · ${dateTime(pd.luc)} · ${pd.lyDo}`) : null,
    p.benChiuKhongTaiKhoan ? h("p", { "data-khoi": "ben-chiu-khong-tai-khoan" }, "Bên này chưa có tài khoản nên không nhận được tin và không phản hồi trên Nền tảng; văn phòng cần báo trực tiếp.") : null,
    p.ghi ? h("p", null, `Đã ghi sổ: ${vnd(p.ghi.conHieuLuc)} còn hiệu lực · ${p.ghi.nguoiGhi} · ${dateTime(p.ghi.luc)}`) : null,
    p.ghi && p.ghi.daNop > 0 ? h("p", { "data-khoi": "da-nop" }, `Bên chịu đã nộp ${vnd(p.ghi.daNop)} cho khoản này nên không đổi hay huỷ được trên Nền tảng. Cần xử lý thì báo Toàn quyền.`) : null,
    p.dangDoiBenChiu ? h("p", null, `Đổi bên chịu chờ ghi: ${nhanTH(p.dangDoiBenChiu.truongHop)} · ${p.dangDoiBenChiu.benChiu} · ${p.dangDoiBenChiu.lyDo}`) : null,
    ...p.phanHoi.map((r) => h("p", { class: "muted" }, `Phản hồi của ${r.nguoi} (${dateTime(r.luc)}): ${r.noiDung}`)),
    h("div", { class: "dc-nut" }, p.coThePhanDinh ? formPhanDinh(p) : null, p.coTheGhi ? formGhi(p) : null, ghiDoi, p.coTheDoiBenChiu ? formDoiBen(p) : null, p.coTheHuy ? formHuy(p) : null));
}

function theKhoanCuaToi(k: Api.KhoanTrachNhiemDto): HTMLElement {
  const noiDung = oLyDo("Nội dung phản hồi");
  return h("li", { class: "dc-the", "data-id": k.id },
    h("div", { class: "dc-dau" }, h("strong", null, k.maDon), h("span", { class: "huy-hieu", "data-tong": "cat" }, nhanTH(k.truongHop))),
    h("p", { class: "dc-tien" }, vnd(k.soTien)),
    h("p", { class: "muted" }, `${dateTime(k.luc)} · ${k.lyDo}`),
    h("p", { class: "muted" }, `Phản hồi trong 3 ngày làm việc, trước hết ngày ${k.hanPhanHoi}. Trả khoản này bằng cách nộp về công ty, Kế toán ghi nhận.`),
    ...k.phanHoi.map((r) => h("p", { class: "muted" }, `Bạn đã phản hồi (${dateTime(r.luc)}): ${r.noiDung}`)),
    khoiMo("Phản hồi", "phan-hoi", () => [noiDung.el, nutChot("Gửi phản hồi", "chot-phan-hoi", (n) => void chay(() => api(`/api/ledger/phan-dinh-cua-toi/${k.id}/phan-hoi`, { method: "POST", body: { noiDung: noiDung.doc() } }), "Đã gửi phản hồi.", n))]));
}

async function taiLai(): Promise<void> {
  const cuaToi: Api.KhoanCuaToiResponse = can(staff, "ledger.view", { ownerId: staff.id }) ? await api<Api.KhoanCuaToiResponse>("/api/ledger/phan-dinh-cua-toi") : { khoan: [] };
  byId("pd-khoi-toi").hidden = cuaToi.khoan.length === 0;
  replaceChildren(byId("pd-toi-ds"), ...cuaToi.khoan.map(theKhoanCuaToi));
  if (!coO) {
    if (cuaToi.khoan.length === 0) byId("pd-rong").hidden = false;
    return;
  }
  const ds = await api<Api.DanhSachPhanDinhResponse>("/api/ledger/phan-dinh");
  byId("pd-khoi-phieu").hidden = false;
  byId("pd-dem").textContent = `${ds.choPhanDinh} phiếu chờ phân định · ${ds.choGhi} phiếu chờ ghi sổ`;
  replaceChildren(byId("pd-phieu-ds"), ...ds.phieu.map(thePhieu));
  const rong = byId("pd-phieu-rong");
  rong.hidden = ds.phieu.length > 0;
  rong.textContent = ds.phieu.length > 0 ? "" : "Chưa có phiếu nào. Mở đề nghị ở trang đơn đã giao.";
}

try {
  await taiLai();
} catch (err) {
  showError(errorEl, reasonOf(err));
}
