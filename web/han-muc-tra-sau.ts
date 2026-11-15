// Màn «Hạn mức trả sau» (ADR-0168; ADR-0172 Đ1 mục 3): CHỈ XEM danh sách đối tác đang bật Trả sau hoặc còn nợ, kèm đơn còn nợ của từng đối tác.
// Bật / đổi / ngừng Trả sau nay ở màn «Cấp độ đại lý» (web/o-tra-sau.ts). Kế toán, Quản trị, Toàn quyền xem; máy chủ hỏi lại quyền ở mọi lời gọi.
//   GET /api/tra-sau/han-muc → { danhSach, ... }        GET /api/tra-sau/han-muc/:partyId/don → { partyId, ten, don }
// Số nợ, hạn mức khả dụng, trạng thái hạn của từng đơn do máy chủ tính; trang chỉ hiện, giờ theo giờ Việt Nam (`cauDonNo`). Không innerHTML.
import { ApiError, api, type Api } from "./api";
import { byId, h, replaceChildren } from "./dom";
import { initShell, showError } from "./shell";
import { canhBaoVuotHanMuc, cauDonNo, cauHanMuc, nhanAnHan, nhanQuaHan } from "../src/shared/han-muc-tra-sau-hien-thi";
import { dongTien } from "../src/shared/tra-sau";
import { moTrang } from "../src/shared/muc-giao-dien";

const errorEl = byId("error");
const khungEl = byId("hm-khung");
const bangEl = byId("hm-bang");
const theEl = byId("hm-the");
const rongEl = byId("hm-rong");
const donEl = byId("hm-don");

const lyDoLoi = (err: unknown): string => (err instanceof ApiError ? err.message : "Không kết nối được máy chủ.");
const hienLoi = (cau: string): void => {
  showError(errorEl, cau);
  errorEl.scrollIntoView({ block: "nearest" });
};

let danhSach: Api.HanMucTraSauDto[] = [];

async function nap(): Promise<boolean> {
  try {
    danhSach = (await api<Api.HanMucTraSauListResponse>("/api/tra-sau/han-muc")).danhSach;
    showError(errorEl, null);
    return true;
  } catch (err) {
    hienLoi(lyDoLoi(err));
    return false;
  }
}

async function xemDon(d: Api.HanMucTraSauDto): Promise<void> {
  try {
    const r = await api<Api.DonNoTraSauResponse>(`/api/tra-sau/han-muc/${encodeURIComponent(d.partyId)}/don`);
    const dong = (x: Api.DonNoTraSauDto): HTMLElement =>
      h("li", { "data-trang-thai": x.trangThai }, h("a", { href: `/order?id=${encodeURIComponent(x.orderId)}` }, x.maDon), ` · ${cauDonNo(x)}`);
    replaceChildren(donEl, h("h2", null, `Đơn còn nợ của ${r.ten}`), r.don.length === 0 ? h("p", { class: "muted" }, "Không có đơn nào còn nợ.") : h("ul", null, ...r.don.map(dong)));
    donEl.hidden = false;
    donEl.scrollIntoView({ block: "nearest" });
  } catch (err) {
    hienLoi(lyDoLoi(err));
  }
}

const nutXem = (d: Api.HanMucTraSauDto): HTMLElement | null =>
  d.soDonNo > 0 ? h("button", { type: "button", class: "btn", "data-action": "xem-don-no", onclick: () => void xemDon(d) }, "Xem đơn nợ") : null;

const canhBao = (d: Api.HanMucTraSauDto): HTMLElement | null => {
  const c = canhBaoVuotHanMuc(d);
  return c ? h("div", { class: "alert", role: "status" }, c) : null;
};
const conDuoc = (d: Api.HanMucTraSauDto): string => (d.conDuocDung === null ? "—" : dongTien(d.conDuocDung));
const cauHan = (d: Api.HanMucTraSauDto): string => [nhanQuaHan(d.soDonQuaHan), nhanAnHan(d.soDonAnHan)].filter((x) => x !== null).join(" · ") || "—";

const hang = (d: Api.HanMucTraSauDto): HTMLElement =>
  h("tr", null,
    h("td", null, d.ten, canhBao(d)),
    h("td", null, cauHanMuc(d)),
    h("td", null, dongTien(d.dangNo)),
    h("td", null, conDuoc(d)),
    h("td", null, cauHan(d)),
    h("td", null, h("div", { class: "handler-actions" }, nutXem(d))),
  );

const the = (d: Api.HanMucTraSauDto): HTMLElement =>
  h("div", { class: "card card-col" },
    h("div", null, h("strong", null, d.ten)),
    h("div", { class: "muted" }, cauHanMuc(d)),
    h("div", null, `Đang nợ ${dongTien(d.dangNo)} · Hạn mức khả dụng ${conDuoc(d)}`),
    cauHan(d) !== "—" ? h("div", { class: "muted" }, cauHan(d)) : null,
    canhBao(d),
    h("div", { class: "handler-actions" }, nutXem(d)),
  );

function ve(): void {
  replaceChildren(bangEl, ...danhSach.map(hang));
  replaceChildren(theEl, ...danhSach.map(the));
  const rong = danhSach.length === 0;
  byId("hm-bang-wrap").hidden = rong;
  rongEl.textContent = rong ? "Chưa có đối tác nào được bật Trả sau hoặc đang nợ." : "";
  rongEl.hidden = !rong;
  khungEl.hidden = false;
}

const staff = await initShell();
if (!moTrang("hanMucTraSau", staff)) {
  hienLoi("Trang này chỉ Kế toán, Quản trị và Toàn quyền dùng được.");
} else if (await nap()) {
  ve();
}
