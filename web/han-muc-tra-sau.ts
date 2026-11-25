// Màn «Hạn mức trả sau» (ADR-0168; ADR-0172 Đ1 mục 3): CHỈ XEM danh sách đối tác đang bật Trả sau hoặc còn nợ, kèm đơn còn nợ của từng đối tác.
// Bật / đổi / ngừng Trả sau nay ở màn «Cấp độ đại lý» (web/o-tra-sau.ts). Kế toán, Quản trị, Toàn quyền xem; máy chủ hỏi lại quyền ở mọi lời gọi.
//   GET /api/tra-sau/han-muc → { danhSach, ... }        GET /api/tra-sau/han-muc/:partyId/don → { partyId, ten, don }
// Số nợ, hạn mức khả dụng, trạng thái hạn của từng đơn do máy chủ tính; trang chỉ hiện, giờ theo giờ Việt Nam (`cauDonNo`). Không innerHTML.
import { ApiError, api, type Api } from "./api";
import { byId, h, replaceChildren } from "./dom";
import { cap } from "./khung";
import { initShell, showError } from "./shell";
import { canhBaoVuotHanMuc, cauDonNo, cauHanMucVanPhong, dongDangNo, nhanAnHan, nhanQuaHan } from "../src/shared/han-muc-tra-sau-hien-thi";
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
      h("div", { class: "dong", "data-trang-thai": x.trangThai }, h("div", { class: "dong-chu" }, h("span", null, h("a", { class: "ts-ma-don", href: `/order?id=${encodeURIComponent(x.orderId)}` }, x.maDon), ` · ${cauDonNo(x)}`)));
    replaceChildren(
      donEl,
      h("header", { class: "khoi-dau" }, h("h2", null, `Đơn còn nợ của ${r.ten}`)),
      r.don.length === 0 ? h("p", { class: "khoi-mo-ta" }, "Không có đơn nào còn nợ.") : h("div", { class: "ds-dong" }, ...r.don.map(dong)),
    );
    donEl.hidden = false;
    donEl.scrollIntoView({ block: "nearest" });
  } catch (err) {
    hienLoi(lyDoLoi(err));
  }
}

const nutXem = (d: Api.HanMucTraSauDto): HTMLElement | null =>
  d.soDonNo > 0 ? h("button", { type: "button", class: "nut", "data-cap": "phu", "data-action": "xem-don-no", onclick: () => void xemDon(d) }, "Xem đơn nợ") : null;

const canhBao = (d: Api.HanMucTraSauDto): HTMLElement | null => {
  const c = canhBaoVuotHanMuc(d);
  return c ? h("div", { class: "alert", role: "status" }, c) : null;
};
const khongNgat = (x: string): string => x.replace(/ đ/g, "\u00a0đ"); // tiền không xuống dòng giữa số và «đ»
const conDuoc = (d: Api.HanMucTraSauDto): string => (d.conDuocDung === null ? "—" : khongNgat(dongTien(d.conDuocDung)));
const cauHan = (d: Api.HanMucTraSauDto): string => [nhanQuaHan(d.soDonQuaHan), nhanAnHan(d.soDonAnHan)].filter((x) => x !== null).join(" · ") || "—";

const hang = (d: Api.HanMucTraSauDto): HTMLElement =>
  h("tr", null,
    h("td", null, d.ten, canhBao(d)),
    h("td", null, cauHanMucVanPhong(d)),
    h("td", { "data-so": "" }, ...dongDangNo(d).map((x) => h("div", null, khongNgat(x)))),
    h("td", { "data-so": "" }, conDuoc(d)),
    h("td", null, cauHan(d)),
    h("td", null, nutXem(d)),
  );

const the = (d: Api.HanMucTraSauDto): HTMLElement =>
  h("div", { class: "dong" },
    h("div", { class: "dong-chu" },
      h("strong", null, d.ten),
      h("div", { class: "o-phu" }, cauHanMucVanPhong(d)),
      cap("Đang nợ", dongDangNo(d).map((x) => h("div", null, khongNgat(x))), { kieu: "so" }),
      cap("Hạn mức khả dụng", conDuoc(d), { kieu: "so" }),
      cauHan(d) !== "—" ? h("div", { class: "o-phu" }, cauHan(d)) : null,
      canhBao(d),
    ),
    nutXem(d),
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
