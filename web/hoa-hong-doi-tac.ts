// Thẻ «Riêng từng đối tác» của trang «Hoa hồng đối tác» (đặc tả hoa-hong-cap-dai-ly §3 bảng vùng, §3.1 hàng «Cấp riêng của đối tác», Q-8, Q-9).
// Danh sách: `ghepDoiTacRieng` (tên, có mức riêng, tên cấp riêng) — KHÔNG cột loại, KHÔNG nhãn xung đột (Q-9); câu `CAU_DUOI_DS_DOI_TAC` dưới danh sách; nút chính «Đặt cấp riêng cho đối tác».
// Mở một đối tác: gọi `GET /api/pricing/ho-so/:id/hoa-hong` MỖI lần mở (và khi trang vẽ lại sau một lần ghi khác) — các loại kèm cấp (`vai`), huy hiệu «Xung đột mức» khi `xungDot`, cấp riêng
// đang / sắp áp và lịch sử (`ganRieng`); dòng mức riêng lấy từ `dong` của trang. Việc của cấp riêng theo `viecLanGan(…, { coDoi: false })` (phần 1 không có «Đổi cấp»).
// Ghi xong một hộp cấp riêng: hộp đưa phản hồi `HoaHongHoSoResponse` qua `nhanHoSoMoi` (vẽ lại cụm từ phản hồi) rồi mới `napLai`. Nút ghi chỉ dựng cho `partner.commission.write`
// (Sửa: `coQuyenSua`); máy chủ kiểm lại. Trang không tính tiền, không chọn mức: chữ ở src/shared/hoa-hong-hien-thi.ts.
import {
  CAU_CAP_RIENG_BO_CAP_LOAI,
  CAU_DT_CHUA_CO_CAP_RIENG,
  CAU_DT_CHUA_CO_MUC_RIENG,
  CAU_DUOI_DS_DOI_TAC,
  CAU_KHONG_CO_DOI_TAC_RIENG,
  CAU_KHONG_KHOP_LOC,
  CAU_XUNG_DOT,
  NHAN_CAP_DA_KHOA,
  NHAN_XUNG_DOT,
  cauVaiHoSo,
  chiaLanGan,
  coQuyenSua,
  dongRiengDoiTac,
  ghepDoiTacRieng,
  nhanCapRieng,
  nhanHieuLuc,
  nhanSapAp,
  tomTatMuc,
  viecLanGan,
  type BoLoc,
} from "../src/shared/hoa-hong-hien-thi";
import { can } from "../src/shared/permissions";
import { api, type Api } from "./api";
import { h, replaceChildren, type Child } from "./dom";
import type { DuLieuHoaHong } from "./hoa-hong";
import { bangDongMuc, oViec } from "./hoa-hong-cap";
import type { MoHop } from "./hoa-hong-hop";
import { khoiLichSuGan } from "./hoa-hong-lich-su";
import { icon } from "./icons";
import { lyDoLoi } from "./so-dai-ly-ui";

type DoiTacRieng = ReturnType<typeof ghepDoiTacRieng>[number];

const chuanTim = (s: string): string => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d").toLowerCase().trim();

// Giữ qua các lần vẽ lại (ghi xong trang nạp lại và vẽ lại; bộ lọc và các đối tác đang mở phải còn).
let loc: BoLoc = { chiConHieuLuc: true, tim: "" };
const moSan = new Set<string>();
/** Khối «hoa hồng của hồ sơ» đã nạp (lần GET gần nhất hoặc phản hồi của lần ghi gần nhất). */
const hoSo = new Map<string, Api.HoaHongHoSoResponse>();
const loiHoSo = new Map<string, string>();
/** Số thứ tự lần nạp của từng hồ sơ: phản hồi về muộn của lần cũ bị bỏ. */
const lanNap = new Map<string, number>();
/** Hồ sơ vừa nhận phản hồi của một lần ghi: lần vẽ lại kế tiếp (`napLai`) không GET lại. */
const vuaGhi = new Set<string>();
let hienTai: { goc: HTMLElement; d: DuLieuHoaHong; mo: MoHop; ds: DoiTacRieng[]; ve: () => void } | null = null;

const selCum = (partyId: string): string => `.hh-dt[data-party="${CSS.escape(partyId)}"]`;
const huyHieu = (tong: "do" | "cat", ten: "alertCircle" | "lock", chu: string): HTMLElement => h("span", { class: "huy-hieu", "data-tong": tong }, icon(ten, 14), chu);

/** Các lần gắn cấp riêng (đang áp, sắp áp) kèm việc, rồi «Xem lịch sử (n)»; hết thì câu «chưa có» và (người ghi) nút đặt cấp riêng điền sẵn đối tác. */
function khoiCapRieng(r: Api.HoaHongHoSoResponse, x: DoiTacRieng, d: DuLieuHoaHong, mo: MoHop, ghi: boolean): Child[] {
  const sua = coQuyenSua(d.nguoiDung);
  const k = chiaLanGan(r.ganRieng, r.homNay);
  const dong = (g: Api.GanRiengLichSuDto, sap: boolean): HTMLElement =>
    h(
      "li",
      { "data-gan-id": g.id, "data-sap-ap": sap ? "" : null },
      h("span", null, h("strong", null, nhanCapRieng(g.muc.ten)), " · ", sap ? h("span", { class: "badge badge-draft" }, nhanSapAp(g)) : h("span", { class: "muted" }, nhanHieuLuc(g))),
      !g.muc.dangBat && huyHieu("cat", "lock", NHAN_CAP_DA_KHOA),
      oViec(nhanCapRieng(g.muc.ten), viecLanGan(g, { homNay: r.homNay, ghi, sua, coDoi: true }), "gan", { DOI: () => mo.doiCapRieng(g, x.partyId), SUA: () => mo.suaCapRieng(g, x.partyId), NGUNG: () => mo.ngungCapRieng(g, x.partyId) }),
    );
  const ds = [...k.dangAp.map((g) => dong(g, false)), ...k.sapAp.map((g) => dong(g, true))];
  const out: Child[] = [ds.length > 0 ? h("ul", { class: "hh-tl-gan" }, ...ds) : h("p", { class: "muted" }, CAU_DT_CHUA_CO_CAP_RIENG)];
  const lichSu = khoiLichSuGan(k.lichSu, r.homNay, (g) => nhanCapRieng(g.muc.ten), `hh-ls-rieng-${x.partyId}`);
  if (lichSu) out.push(lichSu);
  if (ghi && ds.length === 0 && d.mucTa.muc.some((m) => m.dangBat)) {
    const dat = h("button", { type: "button", class: "nut", "data-cap": "phu", "aria-label": `Đặt cấp riêng cho đối tác: ${x.ten}` }, "Đặt cấp riêng cho đối tác");
    dat.addEventListener("click", () => mo.datCapRieng({ partyId: x.partyId, ten: x.ten }));
    out.push(h("div", { class: "hh-cap-nut" }, dat));
  }
  return out;
}

/** Nội dung của một đối tác đang mở (§3 hàng «mở một đối tác»). Phần cần hồ sơ chờ GET; dòng mức riêng có sẵn từ `dong` của trang. */
function noiDungCum(x: DoiTacRieng, d: DuLieuHoaHong, mo: MoHop): Child[] {
  const ghi = can(d.nguoiDung, "partner.commission.write");
  const r = hoSo.get(x.partyId);
  const loi = loiHoSo.get(x.partyId);
  const out: Child[] = [];
  if (loi !== undefined) out.push(h("p", { class: "sheet-warn", role: "alert" }, loi));
  else if (!r) out.push(h("p", { class: "muted", role: "status" }, "Đang tải…"));
  if (r) {
    if (r.xungDot) out.push(h("div", { class: "hh-loai-cap" }, huyHieu("do", "alertCircle", NHAN_XUNG_DOT)), h("p", { class: "hh-cap-nhac" }, CAU_XUNG_DOT));
    if (r.vai.length > 0) {
      out.push(
        h("h3", null, "Loại đối tác"),
        h("ul", { class: "hh-tl-gan" }, ...r.vai.map((v) => h("li", null, h("span", null, h("strong", null, v.loai.ten), " · ", h("span", { class: "muted" }, cauVaiHoSo(v))), v.muc !== null && !v.muc.dangBat && huyHieu("cat", "lock", NHAN_CAP_DA_KHOA)))),
      );
    }
    if (r.mucRieng) out.push(h("p", { class: "hint" }, CAU_CAP_RIENG_BO_CAP_LOAI));
  }
  const tatCa = d.dong.filter((r2) => r2.doiTuong.loai === "DOI_TAC" && r2.doiTuong.partyId === x.partyId);
  const bang = bangDongMuc(dongRiengDoiTac(d.dong, x.partyId, loc, d.homNay, d.ten), null, d, ghi, mo, false);
  out.push(h("h3", null, "Mức riêng của đối tác"), bang ? h("div", { class: "hh-muc-cap-khung" }, bang) : h("p", { class: "muted" }, tatCa.length === 0 ? CAU_DT_CHUA_CO_MUC_RIENG : CAU_KHONG_KHOP_LOC));
  if (r) out.push(h("h3", null, "Cấp riêng"), ...khoiCapRieng(r, x, d, mo, ghi));
  out.push(h("p", { class: "hint" }, h("a", { href: `/parties?id=${encodeURIComponent(x.partyId)}` }, "Mở hồ sơ ở Danh bạ ›")));
  return out;
}

/** Vẽ lại phần trong của cụm `partyId` nếu cụm còn trên trang (tìm lại trong `goc` hiện tại — `napLai` có thể đã thay nút cũ). */
function veLaiCum(partyId: string): void {
  if (!hienTai) return;
  const x = hienTai.ds.find((k) => k.partyId === partyId);
  const ct = hienTai.goc.querySelector<HTMLElement>(`${selCum(partyId)} .hh-lo-ct`);
  if (x && ct) replaceChildren(ct, ...noiDungCum(x, hienTai.d, hienTai.mo));
}

/** GET khối hoa hồng của hồ sơ rồi vẽ lại cụm. Lỗi (403, 404, mất mạng) hiện nguyên câu trong cụm, không làm hỏng thẻ. */
async function napHoSo(partyId: string): Promise<void> {
  const so = (lanNap.get(partyId) ?? 0) + 1;
  lanNap.set(partyId, so);
  try {
    const r = await api<Api.HoaHongHoSoResponse>(`/api/pricing/ho-so/${encodeURIComponent(partyId)}/hoa-hong`);
    if (lanNap.get(partyId) !== so) return;
    hoSo.set(partyId, r);
    loiHoSo.delete(partyId);
  } catch (err) {
    if (lanNap.get(partyId) !== so) return;
    loiHoSo.set(partyId, lyDoLoi(err));
  }
  veLaiCum(partyId);
}

/** Hộp cấp riêng (web/hoa-hong-hop.ts) ghi xong: giữ phản hồi của route, mở cụm của đối tác đó và vẽ lại cụm ngay; `napLai` theo sau không GET lại. */
export function nhanHoSoMoi(partyId: string, r: Api.HoaHongHoSoResponse): void {
  lanNap.set(partyId, (lanNap.get(partyId) ?? 0) + 1); // bỏ lần GET đang chờ (số cũ hơn phản hồi này)
  hoSo.set(partyId, r);
  loiHoSo.delete(partyId);
  moSan.add(partyId);
  vuaGhi.add(partyId);
  veLaiCum(partyId);
}

function cumDoiTac(x: DoiTacRieng, d: DuLieuHoaHong, mo: MoHop): HTMLElement {
  const dangMo = moSan.has(x.partyId);
  const tom = tomTatMuc(d.dong.filter((r) => r.doiTuong.loai === "DOI_TAC" && r.doiTuong.partyId === x.partyId), d.ten);
  const ct = h("div", { class: "hh-lo-ct", id: `hh-dt-ct-${x.partyId}`, hidden: !dangMo }, ...(dangMo ? noiDungCum(x, d, mo) : []));
  const nut = h(
    "button",
    { type: "button", class: "hh-loai-nut", "aria-expanded": String(dangMo), "aria-controls": ct.id, "aria-label": `${x.ten}${x.mucRieng ? ", mức riêng" : ""}${x.chinhSach !== null ? `, ${nhanCapRieng(x.chinhSach)}` : ""}` },
    h("span", { class: "hh-lo-ten" }, h("strong", null, x.ten), x.mucRieng && h("span", { class: "badge badge-confirmed" }, "Mức riêng"), x.chinhSach !== null && h("span", { class: "badge badge-delivered" }, nhanCapRieng(x.chinhSach))),
    tom !== "" && h("span", { class: "hh-tom-tat muted" }, tom),
  );
  nut.addEventListener("click", () => {
    const moRoi = nut.getAttribute("aria-expanded") !== "true";
    nut.setAttribute("aria-expanded", String(moRoi));
    ct.hidden = !moRoi;
    if (!moRoi) {
      moSan.delete(x.partyId);
      return;
    }
    moSan.add(x.partyId);
    replaceChildren(ct, ...noiDungCum(x, d, mo));
    void napHoSo(x.partyId);
  });
  return h("article", { class: "hh-lo hh-dt", "data-party": x.partyId }, nut, ct);
}

/** Vẽ thẻ «Riêng từng đối tác» vào `goc`. Đối tác đang mở vẽ ngay từ hồ sơ đã nạp, rồi GET lại (trừ hồ sơ vừa nhận phản hồi của một lần ghi). */
export function veTheDoiTac(goc: HTMLElement, d: DuLieuHoaHong, mo: MoHop): void {
  const ghi = can(d.nguoiDung, "partner.commission.write");
  const dau = h("div", { class: "hh-cap-dau" }, h("h2", { class: "hh-muc-ten" }, "Riêng từng đối tác"));
  if (ghi && d.mucTa.muc.some((m) => m.dangBat)) {
    const dat = h("button", { type: "button", class: "nut", "data-cap": "chinh" }, "Đặt cấp riêng cho đối tác");
    dat.addEventListener("click", () => mo.datCapRieng());
    dau.append(dat);
  }
  const tatCa = ghepDoiTacRieng(d.dong, d.mucTa.ganRieng, d.homNay);
  const o = h("input", { id: "hh-loc-tim-doi-tac", type: "search", autocomplete: "off", placeholder: "Tìm đối tác, cấp hoặc dịch vụ", "aria-label": "Tìm đối tác, cấp hoặc dịch vụ", value: loc.tim });
  const tt = h("select", { id: "hh-loc-tt-doi-tac", "aria-label": "Trạng thái" }, h("option", { value: "ap" }, "Đang và sắp áp dụng"), h("option", { value: "tat-ca" }, "Tất cả"));
  const noi = h("div", null);
  const ve = (): void => {
    o.value = loc.tim;
    tt.value = loc.chiConHieuLuc ? "ap" : "tat-ca";
    const tim = chuanTim(loc.tim);
    const ds = tatCa.filter((x) => tim === "" || chuanTim(x.ten).includes(tim) || chuanTim(x.chinhSach ?? "").includes(tim) || dongRiengDoiTac(d.dong, x.partyId, loc, d.homNay, d.ten).length > 0);
    replaceChildren(noi, tatCa.length === 0 ? h("p", { class: "muted" }, CAU_KHONG_CO_DOI_TAC_RIENG) : ds.length === 0 ? h("p", { class: "muted" }, CAU_KHONG_KHOP_LOC) : h("div", { class: "hh-bang" }, ...ds.map((x) => cumDoiTac(x, d, mo))));
  };
  o.addEventListener("input", () => {
    loc = { ...loc, tim: o.value };
    ve();
  });
  o.addEventListener("keydown", (e) => {
    if (e.key === "Enter") e.preventDefault();
  });
  tt.addEventListener("change", () => {
    loc = { ...loc, chiConHieuLuc: tt.value !== "tat-ca" };
    ve();
  });
  hienTai = { goc, d, mo, ds: tatCa, ve };
  replaceChildren(
    goc,
    h("section", { class: "hh-dt-vung" }, dau, h("div", { class: "hh-loc" }, h("label", null, "Tìm", o), h("label", null, "Trạng thái", tt)), noi, h("p", { class: "hint" }, CAU_DUOI_DS_DOI_TAC)),
  );
  ve();
  for (const x of tatCa) {
    if (!moSan.has(x.partyId)) continue;
    if (vuaGhi.delete(x.partyId)) continue;
    void napHoSo(x.partyId);
  }
  vuaGhi.clear();
}

/** Đưa bộ lọc của thẻ về mặc định («Đang và sắp áp dụng», ô tìm rỗng) và vẽ lại — `nhayToiDong` (web/hoa-hong.ts) gọi khi «Xem dòng ↓» không thấy dòng. */
export function datLaiLocDoiTac(): void {
  loc = { chiConHieuLuc: true, tim: "" };
  hienTai?.ve();
}

/** Mở cụm của đối tác `partyId` (đưa bộ lọc về mặc định nếu đang giấu nó), chờ GET hồ sơ xong, trả cụm — `nhayToiDong` (web/hoa-hong.ts) dùng. Null khi thẻ chưa vẽ hay đối tác không có trong danh sách. */
export async function moDoiTac(partyId: string): Promise<HTMLElement | null> {
  if (!hienTai) return null;
  const tim = (): HTMLElement | null => hienTai?.goc.querySelector<HTMLElement>(selCum(partyId)) ?? null;
  if (!tim()) datLaiLocDoiTac();
  const cum = tim();
  const x = hienTai.ds.find((k) => k.partyId === partyId);
  if (!cum || !x) return null;
  const nut = cum.querySelector<HTMLButtonElement>(".hh-loai-nut");
  const ct = cum.querySelector<HTMLElement>(".hh-lo-ct");
  if (nut && ct && nut.getAttribute("aria-expanded") !== "true") {
    nut.setAttribute("aria-expanded", "true");
    ct.hidden = false;
    moSan.add(partyId);
    replaceChildren(ct, ...noiDungCum(x, hienTai.d, hienTai.mo));
  }
  await napHoSo(partyId);
  return tim();
}
