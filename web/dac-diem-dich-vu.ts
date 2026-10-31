// Trang «Đặc điểm dịch vụ» (ADR-0152 Đ1, Đ3, Đ4 cảnh báo, Đ5; trang ghép 3b; kế hoạch 2026-10-30 T12). Gọi:
//   GET   /api/catalog/dac-diem (đường gọi chính; catalog.attribute.assign hoặc admin.manage, không giữ quyền Đối tác — Q-2 (a));
//   PUT   /api/catalog/:code/dac-diem/:attr { giaTri, dangThay } (gắn cho một dịch vụ — Bán hàng, Quản trị, Toàn quyền);
//   PUT   /api/catalog/groups/:code/dac-diem/:attr { giaTri, dangThay } (giá trị chung của nhóm — admin.manage);
//   POST  /api/catalog/dac-diem, POST /api/catalog/dac-diem/:code/gia-tri, PATCH /api/catalog/dac-diem/:code, PATCH /api/catalog/dac-diem/gia-tri/:code (định nghĩa — admin.manage);
//   GET   /api/pricing/luat-ban (chỉ để CẢNH BÁO trước khi lưu — Đ4 mục 2; lỗi ⇒ dải «chưa kiểm được», hộp xác nhận vẫn hỏi).
// Ẩn/hiện hỏi bảng quyền (`can`); máy chủ kiểm lại. Cảnh báo là giao diện — máy chủ không ép. Hộp hỏi (hoiXacNhan) gọi từ trang, không từ trong bảng trượt.
import { CAU_CHUA_KIEM_LUAT, canhBaoBatLai, canhBaoDoiGiaTri, canhBaoDoiTen, nhanNguon, trangThaiTuMan } from "../src/shared/dac-diem-hien-thi";
import { can } from "../src/shared/permissions";
import { homeRedirect } from "../src/shared/start-page";
import { ApiError, api, type Api } from "./api";
import { hoiXacNhan, moBangTruot } from "./bang-truot";
import { byId, h, replaceChildren } from "./dom";
import { initShell, showError } from "./shell";
import { hienBaoNgan } from "./toast";
import { trangThaiToanTrang } from "./trang-thai-he-thong";

type The = "gan" | "chua-khai" | "moi" | "nhom" | "dinh-nghia";
const errorEl = byId("error");
const daiEl = byId("dd-dai");
const noiDungEl = byId("dd-noi-dung");
const staff = await initShell();
const laQuanTri = can(staff, "admin.manage");
const THE: The[] = ["gan", "chua-khai", "moi", ...(laQuanTri ? (["nhom", "dinh-nghia"] as const) : [])];
const tabEl = (t: The): HTMLElement => byId(`dd-tab-${t}`);
const theEl = (t: The): HTMLElement => byId(`dd-the-${t}`);
const lyDo = (err: unknown): string => (err instanceof ApiError ? err.message : "Không kết nối được máy chủ.");

let dm: Api.CatalogDacDiemResponse;
/** Luật bán còn chặn / sắp chặn để cảnh báo; null = không tải được (hoặc tài khoản không đọc được luật) ⇒ câu «chưa kiểm được». */
let luat: Api.LuatBanDto[] | null = null;
let tim = "";

const ddDung = (): Api.DacDiemDto[] => dm.dacDiem.filter((a) => a.dangDung);
const tenGiaTri = (code: string | undefined | null): string | null => (code ? (dm.dacDiem.flatMap((a) => a.giaTri).find((v) => v.code === code)?.ten ?? null) : null);

async function napLuat(): Promise<void> {
  try {
    luat = can(staff, "sales.block.write") ? (await api<Api.LuatBanListResponse>("/api/pricing/luat-ban")).luat : null;
  } catch {
    luat = null;
  }
  daiEl.hidden = luat !== null;
  daiEl.textContent = luat === null ? CAU_CHUA_KIEM_LUAT : "";
}
async function napLai(): Promise<void> {
  try {
    dm = await api<Api.CatalogDacDiemResponse>("/api/catalog/dac-diem");
  } catch (err) {
    showError(errorEl, lyDo(err));
  }
  await napLuat();
  veTatCa();
}
/** Lỗi ghi: 409 `stale` ⇒ báo «vừa có người đổi», tải lại; lỗi khác ⇒ câu máy chủ (toast đỏ), tải lại để ô về giá trị thật. */
async function loiGhi(err: unknown): Promise<void> {
  if (err instanceof ApiError && err.status === 409 && err.code === "stale") hienBaoNgan("Vừa có người đổi — đã tải lại.", { tong: "bien" });
  else hienBaoNgan(lyDo(err), { tong: "do" });
  await napLai();
}

function chonThe(t: The, lay = false): void {
  for (const k of THE) {
    const on = k === t;
    tabEl(k).setAttribute("aria-selected", String(on));
    tabEl(k).tabIndex = on ? 0 : -1;
    theEl(k).hidden = !on;
  }
  if (lay) tabEl(t).focus();
}

// ---- Gắn cho dịch vụ (ba thẻ đầu dùng chung một khối, khác danh sách dịch vụ) -----------------------------------------------------------------------------
function oGan(dv: Api.DacDiemDichVuDto, a: Api.DacDiemDto, id: string): HTMLElement {
  const hl = dv.giaTri[a.code];
  const rieng = hl?.nguon === "SERVICE" ? hl.valueCode : null;
  const chung = dv.groupCode ? dm.nhom.find((g) => g.code === dv.groupCode && g.dangDung)?.giaTri[a.code] : undefined;
  const o = h(
    "select",
    { class: "o", id, "data-dich-vu": dv.code, "data-dac-diem": a.code, "aria-label": `${a.ten} — ${dv.ten}` },
    h("option", { value: "" }, chung ? `Theo nhóm (${tenGiaTri(chung)})` : "Chưa khai"),
    ...a.giaTri.filter((v) => v.dangDung).map((v) => h("option", { value: v.code }, v.ten)),
  );
  o.value = rieng ?? "";
  o.addEventListener("change", () => void luuGan(dv, a, rieng, o.value || null, o));
  const nguon = hl ? nhanNguon(hl.nguon) : "chưa khai";
  return h("div", { class: "dd-o" }, o, h("span", { class: "hint" }, nguon));
}
async function luuGan(dv: Api.DacDiemDichVuDto, a: Api.DacDiemDto, dangThay: string | null, giaTri: string | null, o: HTMLSelectElement): Promise<void> {
  const cau = canhBaoDoiGiaTri({ luat, truoc: [trangThaiTuMan(dm, dv.code)], sau: [trangThaiTuMan(dm, dv.code, { rieng: { [a.code]: giaTri } })] });
  if (cau && !(await hoiXacNhan({ tieuDe: `Đổi «${a.ten}» của «${dv.ten}»?`, hauQua: cau, nhanNguyHiem: "Vẫn lưu", nhanGiu: "Không đổi", opener: o }))) {
    o.value = dangThay ?? "";
    return;
  }
  try {
    await api(`/api/catalog/${encodeURIComponent(dv.code)}/dac-diem/${encodeURIComponent(a.code)}`, { method: "PUT", body: { giaTri, dangThay } });
  } catch (err) {
    await loiGhi(err);
    return;
  }
  hienBaoNgan(`Đã lưu «${a.ten}» của «${dv.ten}».`);
  await napLai();
}
function khoiGan(dsDv: Api.DacDiemDichVuDto[], the: The, rong: string): HTMLElement[] {
  const dd = ddDung();
  if (dd.length === 0) return [h("p", { class: "rong" }, "Chưa có đặc điểm nào đang dùng.")];
  const loc = tim ? dsDv.filter((d) => d.ten.toLocaleLowerCase("vi").includes(tim)) : dsDv;
  if (loc.length === 0) return [h("p", { class: "rong" }, tim ? "Không có dịch vụ nào khớp ô tìm." : rong)];
  const bang = h(
    "div",
    { class: "table-wrap" },
    h(
      "table",
      { class: "bang dd-bang" },
      h("thead", null, h("tr", null, h("th", null, "Dịch vụ"), ...dd.map((a) => h("th", null, a.ten)))),
      h("tbody", null, ...loc.map((dv) => h("tr", { "data-dich-vu": dv.code }, h("td", null, dv.ten), ...dd.map((a) => h("td", null, oGan(dv, a, `dd-${the}-b-${dv.code}-${a.code}`)))))),
    ),
  );
  const the_ = h(
    "div",
    { class: "card-list" },
    ...loc.map((dv) =>
      h(
        "article",
        { class: "the lb-dong", "data-dich-vu": dv.code },
        h("strong", null, dv.ten),
        ...dd.map((a) => h("div", { class: "lb-truong" }, h("label", { class: "nhan", for: `dd-${the}-t-${dv.code}-${a.code}` }, a.ten), oGan(dv, a, `dd-${the}-t-${dv.code}-${a.code}`))),
      ),
    ),
  );
  return [bang, the_];
}
function veGan(): void {
  const dangBan = dm.dichVu.filter((d) => d.dangBan).sort((x, y) => x.ten.localeCompare(y.ten, "vi"));
  const o = h("input", { type: "search", class: "o", id: "dd-tim", value: tim, placeholder: "Gõ tên dịch vụ", autocomplete: "off" });
  o.addEventListener("input", () => {
    tim = o.value.trim().toLocaleLowerCase("vi");
    replaceChildren(ketQua, ...khoiGan(dangBan, "gan", "Không có dịch vụ đang bán."));
  });
  const ketQua = h("div", null, ...khoiGan(dangBan, "gan", "Không có dịch vụ đang bán."));
  replaceChildren(theEl("gan"), h("div", { class: "lb-truong" }, h("label", { class: "nhan", for: "dd-tim" }, "Tìm dịch vụ"), o), ketQua);
}
function veChuaKhai(): void {
  const ma = new Set(ddDung().flatMap((a) => a.chuaKhai));
  const ds = dm.dichVu.filter((d) => ma.has(d.code)).sort((x, y) => x.ten.localeCompare(y.ten, "vi"));
  tabEl("chua-khai").textContent = `Chưa khai (${ds.length})`;
  replaceChildren(
    theEl("chua-khai"),
    h("p", { class: "hint" }, "Dịch vụ đang bán chưa có giá trị (riêng hay theo nhóm) cho ít nhất một đặc điểm đang dùng. Dịch vụ chưa khai không bị luật bán theo đặc điểm chặn."),
    ...khoiGan(ds, "chua-khai", "Mọi dịch vụ đang bán đã khai đủ."),
  );
}
function veMoi(): void {
  const ma = new Set(dm.moiTheoNhom.map((x) => x.catalogCode));
  const ds = dm.dichVu.filter((d) => ma.has(d.code)).sort((x, y) => x.ten.localeCompare(y.ten, "vi"));
  tabEl("moi").textContent = `Mới, đang theo nhóm (${ds.length})`;
  replaceChildren(
    theEl("moi"),
    h("p", { class: "hint" }, "Dịch vụ mới trong 14 ngày đang lấy giá trị chung của nhóm — rà lại xem có đúng không."),
    ...khoiGan(ds, "moi", "Không có dịch vụ mới nào đang theo nhóm."),
  );
}

// ---- Theo nhóm (Quản trị, Toàn quyền) --------------------------------------------------------------------------------------------------------------------------
async function luuNhom(g: Api.DacDiemNhomDto, a: Api.DacDiemDto, dangThay: string | null, giaTri: string | null, o: HTMLSelectElement): Promise<void> {
  const trong = dm.dichVu.filter((d) => d.groupCode === g.code);
  const cau = canhBaoDoiGiaTri({ luat, truoc: trong.map((d) => trangThaiTuMan(dm, d.code)), sau: trong.map((d) => trangThaiTuMan(dm, d.code, { nhomGiaTri: { [a.code]: giaTri } })) });
  if (cau && !(await hoiXacNhan({ tieuDe: `Đổi «${a.ten}» chung của nhóm «${g.ten}»?`, hauQua: cau, nhanNguyHiem: "Vẫn lưu", nhanGiu: "Không đổi", opener: o }))) {
    o.value = dangThay ?? "";
    return;
  }
  try {
    await api(`/api/catalog/groups/${encodeURIComponent(g.code)}/dac-diem/${encodeURIComponent(a.code)}`, { method: "PUT", body: { giaTri, dangThay } });
  } catch (err) {
    await loiGhi(err);
    return;
  }
  hienBaoNgan(`Đã lưu «${a.ten}» chung của nhóm «${g.ten}».`);
  await napLai();
}
function veNhom(): void {
  const dd = ddDung();
  const ds = dm.nhom.filter((g) => g.dangDung).sort((x, y) => x.ten.localeCompare(y.ten, "vi"));
  if (dd.length === 0 || ds.length === 0) {
    replaceChildren(theEl("nhom"), h("p", { class: "rong" }, dd.length === 0 ? "Chưa có đặc điểm nào đang dùng." : "Chưa có nhóm dịch vụ nào đang dùng."));
    return;
  }
  const oNhom = (g: Api.DacDiemNhomDto, a: Api.DacDiemDto): HTMLElement => {
    const cu = g.giaTri[a.code] ?? null;
    const o = h(
      "select",
      { class: "o", id: `dd-nhom-${g.code}-${a.code}`, "data-nhom": g.code, "data-dac-diem": a.code },
      h("option", { value: "" }, "Không có giá trị chung"),
      ...a.giaTri.filter((v) => v.dangDung).map((v) => h("option", { value: v.code }, v.ten)),
    );
    o.value = cu ?? "";
    o.addEventListener("change", () => void luuNhom(g, a, cu, o.value || null, o));
    return o;
  };
  replaceChildren(
    theEl("nhom"),
    h("p", { class: "hint" }, "Giá trị chung của nhóm áp cho mọi dịch vụ trong nhóm chưa có giá trị riêng, kể cả dịch vụ mới vào nhóm sau này."),
    h("div", { class: "card-list dd-nhom" }, ...ds.map((g) => h("article", { class: "the lb-dong", "data-nhom": g.code }, h("strong", null, g.ten), ...dd.map((a) => h("div", { class: "lb-truong" }, h("label", { class: "nhan", for: `dd-nhom-${g.code}-${a.code}` }, a.ten), oNhom(g, a)))))),
  );
}

// ---- Định nghĩa (Quản trị, Toàn quyền) -------------------------------------------------------------------------------------------------------------------------
type MucSua = { la: "DAC_DIEM"; dd: Api.DacDiemDto } | { la: "GIA_TRI"; dd: Api.DacDiemDto; gt: Api.DacDiemGiaTriDto };
const duongSua = (m: MucSua): string => (m.la === "DAC_DIEM" ? `/api/catalog/dac-diem/${encodeURIComponent(m.dd.code)}` : `/api/catalog/dac-diem/gia-tri/${encodeURIComponent(m.gt.code)}`);
const banGhi = (m: MucSua): Api.DacDiemGiaTriDto => (m.la === "DAC_DIEM" ? m.dd : m.gt);
const cai = (m: MucSua): string => (m.la === "DAC_DIEM" ? "đặc điểm" : "giá trị");

/** Bảng trượt nhập: các ô chữ / số; `canhBao(giá trị)` cập nhật dòng cảnh báo dưới ô đầu; `gui` trả lỗi (chữ) hoặc null khi xong. */
function moNhap(o: { tieuDe: string; nut: string; o: { id: string; nhan: string; loai?: "so" | "nhieu-dong"; giaTri?: string }[]; canhBao?: (v: string) => string | null; gui: (v: string[]) => Promise<string | null>; opener: HTMLElement }): void {
  const ois = o.o.map((x) =>
    x.loai === "nhieu-dong"
      ? h("textarea", { class: "o", "data-loai": "nhieu-dong", id: x.id, rows: 4 }, x.giaTri ?? "")
      : h("input", { class: "o", id: x.id, type: x.loai === "so" ? "number" : "text", inputMode: x.loai === "so" ? "numeric" : undefined, value: x.giaTri ?? "", autocomplete: "off" }),
  );
  const canh = h("p", { class: "sheet-warn", role: "status", hidden: true });
  const loi = h("p", { class: "o-loi", role: "alert", hidden: true });
  const capNhat = (): void => {
    const c = o.canhBao?.(ois[0]!.value.trim()) ?? null;
    canh.textContent = c ?? "";
    canh.hidden = !c;
  };
  ois[0]!.addEventListener("input", capNhat);
  capNhat();
  const huy = h("button", { type: "button", class: "nut" }, "Huỷ");
  const luu = h("button", { type: "button", class: "nut", "data-cap": "chinh", id: "dd-luu" }, o.nut);
  const bang = moBangTruot({
    title: o.tieuDe,
    body: [...o.o.map((x, i) => h("div", { class: "lb-truong" }, h("label", { class: "nhan", for: x.id }, x.nhan), ois[i]!)), canh, loi],
    foot: [huy, luu],
    opener: o.opener,
  });
  if (!bang) return;
  huy.addEventListener("click", () => bang.close());
  luu.addEventListener("click", async () => {
    bang.setBusy(true);
    luu.disabled = true;
    const l = await o.gui(ois.map((x) => x.value));
    bang.setBusy(false);
    luu.disabled = false;
    if (l) {
      loi.textContent = l;
      loi.hidden = false;
      return;
    }
    bang.close(false);
  });
}
async function goi(duong: string, method: string, body: unknown): Promise<string | null> {
  try {
    await api(duong, { method, body });
    return null;
  } catch (err) {
    return lyDo(err);
  }
}
function moSua(m: MucSua, nut: HTMLElement): void {
  const b = banGhi(m);
  moNhap({
    tieuDe: `Sửa ${cai(m)} «${b.ten}»`,
    nut: "Lưu",
    o: [{ id: "dd-sua-ten", nhan: `Tên ${cai(m)}`, giaTri: b.ten }, { id: "dd-sua-thu-tu", nhan: "Thứ tự (số nhỏ đứng trước)", loai: "so", giaTri: String(b.thuTu) }],
    canhBao: (v) => (v && v !== b.ten ? canhBaoDoiTen({ luat, ma: b.code, la: m.la, tenCu: b.ten, tenMoi: v }) : null),
    opener: nut,
    gui: async ([ten, thuTu]) => {
      const so = Number(thuTu);
      const l = await goi(duongSua(m), "PATCH", { ten: ten!.trim(), thuTu: Number.isInteger(so) ? so : thuTu, expectedUpdatedAt: b.capNhatLuc });
      if (!l) {
        hienBaoNgan(`Đã lưu ${cai(m)} «${ten!.trim()}».`);
        await napLai();
      }
      return l;
    },
  });
}
async function batTat(m: MucSua, nut: HTMLElement): Promise<void> {
  const b = banGhi(m);
  const bat = !b.dangDung;
  const hauQua = bat
    ? canhBaoBatLai({ luat, ma: b.code, la: m.la })
    : `${m.la === "DAC_DIEM" ? "Đặc điểm" : "Giá trị"} tắt thì không gắn được cho dịch vụ hay nhóm nào; luật bán trỏ tới nó thành «Không phủ dịch vụ nào» cho tới khi bật lại. Chỉ tắt được khi không còn dịch vụ hay nhóm nào đang mang.`;
  if (hauQua && !(await hoiXacNhan({ tieuDe: `${bat ? "Bật lại" : "Tắt"} ${cai(m)} «${b.ten}»?`, hauQua, nhanNguyHiem: bat ? "Bật lại" : "Tắt", opener: nut }))) return;
  const l = await goi(duongSua(m), "PATCH", { dangDung: bat, expectedUpdatedAt: b.capNhatLuc });
  if (l) {
    hienBaoNgan(l, { tong: "do" });
    await napLai();
    return;
  }
  hienBaoNgan(`Đã ${bat ? "bật lại" : "tắt"} ${cai(m)} «${b.ten}».`);
  await napLai();
}
const huyHieuDung = (dung: boolean): HTMLElement => h("span", { class: "huy-hieu", "data-tong": dung ? "la" : "xam" }, dung ? "Đang dùng" : "Đã tắt");
function nutViec(m: MucSua): HTMLElement {
  const b = banGhi(m);
  const ten = `${cai(m)} «${b.ten}»`;
  const sua = h("button", { type: "button", class: "nut", "data-cap": "phu", "data-viec": "sua", "aria-label": `Sửa ${ten}` }, "Sửa");
  sua.addEventListener("click", () => moSua(m, sua));
  const bt = h("button", { type: "button", class: "nut", "data-viec": b.dangDung ? "tat" : "bat", "aria-label": `${b.dangDung ? "Tắt" : "Bật lại"} ${ten}` }, b.dangDung ? "Tắt" : "Bật lại");
  bt.addEventListener("click", () => void batTat(m, bt));
  return h("div", { class: "lb-viec" }, sua, bt);
}
function veDinhNghia(): void {
  const them = h("button", { type: "button", class: "nut", "data-cap": "chinh", id: "dd-them-dac-diem" }, "＋ Thêm đặc điểm");
  them.addEventListener("click", () =>
    moNhap({
      tieuDe: "Thêm đặc điểm",
      nut: "Thêm đặc điểm",
      o: [{ id: "dd-moi-ten", nhan: "Tên đặc điểm" }, { id: "dd-moi-gia-tri", nhan: "Các giá trị (mỗi dòng một giá trị)", loai: "nhieu-dong" }],
      opener: them,
      gui: async ([ten, ds]) => {
        const giaTri = ds!.split("\n").map((x) => x.trim()).filter(Boolean).map((t) => ({ ten: t }));
        const l = await goi("/api/catalog/dac-diem", "POST", { ten: ten!.trim(), giaTri });
        if (!l) {
          hienBaoNgan(`Đã thêm đặc điểm «${ten!.trim()}».`);
          await napLai();
        }
        return l;
      },
    }),
  );
  const ds = [...dm.dacDiem].sort((x, y) => Number(y.dangDung) - Number(x.dangDung) || x.thuTu - y.thuTu);
  replaceChildren(
    theEl("dinh-nghia"),
    h("div", { class: "lb-viec" }, them),
    ds.length === 0 ? h("p", { class: "rong" }, "Chưa có đặc điểm nào.") : null,
    h(
      "div",
      { class: "dd-dinh-nghia" },
      ...ds.map((a) => {
        const themGt = h("button", { type: "button", class: "nut", "data-cap": "phu", "data-viec": "them-gia-tri", "aria-label": `Thêm giá trị cho «${a.ten}»`, hidden: !a.dangDung }, "＋ Thêm giá trị");
        themGt.addEventListener("click", () =>
          moNhap({
            tieuDe: `Thêm giá trị cho «${a.ten}»`,
            nut: "Thêm giá trị",
            o: [{ id: "dd-gt-ten", nhan: "Tên giá trị" }],
            opener: themGt,
            gui: async ([ten]) => {
              const l = await goi(`/api/catalog/dac-diem/${encodeURIComponent(a.code)}/gia-tri`, "POST", { ten: ten!.trim() });
              if (!l) {
                hienBaoNgan(`Đã thêm giá trị «${ten!.trim()}».`);
                await napLai();
              }
              return l;
            },
          }),
        );
        return h(
          "article",
          { class: "the lb-dong", "data-dac-diem": a.code },
          h("div", { class: "lb-dong-dau" }, h("strong", null, a.ten), huyHieuDung(a.dangDung)),
          nutViec({ la: "DAC_DIEM", dd: a }),
          h(
            "ul",
            { class: "dd-gia-tri" },
            ...[...a.giaTri].sort((x, y) => Number(y.dangDung) - Number(x.dangDung) || x.thuTu - y.thuTu).map((v) =>
              h("li", { "data-gia-tri": v.code }, h("div", { class: "lb-dong-dau" }, h("span", null, v.ten), huyHieuDung(v.dangDung)), nutViec({ la: "GIA_TRI", dd: a, gt: v })),
            ),
          ),
          themGt,
        );
      }),
    ),
  );
}

function veTatCa(): void {
  veGan();
  veChuaKhai();
  veMoi();
  if (laQuanTri) {
    veNhom();
    veDinhNghia();
  }
}

async function main(): Promise<void> {
  try {
    dm = await api<Api.CatalogDacDiemResponse>("/api/catalog/dac-diem");
  } catch (err) {
    if (err instanceof ApiError && err.status === 403) trangThaiToanTrang("403", { trangDau: homeRedirect(staff) ?? "/" });
    else showError(errorEl, lyDo(err));
    return;
  }
  await napLuat();
  noiDungEl.hidden = false;
  THE.forEach((k, i) => {
    tabEl(k).hidden = false;
    tabEl(k).addEventListener("click", () => chonThe(k));
    tabEl(k).addEventListener("keydown", (e) => {
      const n = THE.length;
      const toi = e.key === "ArrowRight" ? (i + 1) % n : e.key === "ArrowLeft" ? (i - 1 + n) % n : e.key === "Home" ? 0 : e.key === "End" ? n - 1 : -1;
      if (toi < 0) return;
      e.preventDefault();
      chonThe(THE[toi]!, true);
    });
  });
  veTatCa();
  chonThe("gan");
}

await main();
