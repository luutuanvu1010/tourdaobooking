// Trang «Luật bán» (ADR-0146 Đ5; ADR-0152 Đ2 kiểu «Theo đặc điểm»; kế hoạch 2026-10-30 T11). Gọi:
//   GET  /api/pricing/luat-ban            → LuatBanListResponse (đường gọi chính; ô sales.block.write, không giữ quyền Đối tác — Q-2 (a));
//   POST /api/pricing/luat-ban            → thêm luật (201);   POST /api/pricing/luat-ban/:id/ket-thuc → { denNgay? } (không gửi = «Kết thúc ngay»);
//   GET  /api/pricing/loai-doi-tac        → loại đối tác chọn được (đang bật);  GET /api/catalog/dac-diem → dịch vụ, nhóm, đặc điểm, giá trị cho hộp «Thêm luật».
// Ẩn/hiện hỏi bảng quyền (`can`); máy chủ kiểm lại (403 ⇒ trạng thái toàn trang). Không luật nghiệp vụ ở đây: chữ ở src/shared/luat-ban-hien-thi.ts (có bài kiểm), câu lỗi là câu máy chủ.
// R-1: «Kết thúc ngay» = luật thôi chặn từ bây giờ (hỏi bằng hoiXacNhan — gọi từ nút trên dòng, không từ trong bảng trượt); hẹn kết thúc = bảng trượt riêng có dòng phụ
// «Luật vẫn chặn tới hết ngày này».
import {
  CAU_GIOI_THIEU, CAU_RONG_THE, NHAN_PHAM_VI, NHAN_THE_LUAT, NUT_KET_THUC_NGAY, THU_TU_THE, dongPhuDaKetThuc, dongPhuDenNgay, hauQuaKetThucNgay, locTheThe, moTaHieuLuc,
  moTaPhamVi, ngayHenNhoNhat, tongTrangThai,
} from "../src/shared/luat-ban-hien-thi";
import { can } from "../src/shared/permissions";
import { homeRedirect } from "../src/shared/start-page";
import type { TrangThaiLuatBan } from "../src/shared/contracts";
import { ApiError, api, type Api } from "./api";
import { hoiXacNhan, moBangTruot } from "./bang-truot";
import { byId, h, replaceChildren } from "./dom";
import { initShell, showError } from "./shell";
import { hienBaoNgan } from "./toast";
import { trangThaiToanTrang } from "./trang-thai-he-thong";

const errorEl = byId("error");
const noiDungEl = byId("lb-noi-dung");
const nutThemEl = byId<HTMLButtonElement>("lb-them");
const tabEl = Object.fromEntries(THU_TU_THE.map((t) => [t, byId(`lb-tab-${t}`)])) as Record<TrangThaiLuatBan, HTMLElement>;
const theEl = Object.fromEntries(THU_TU_THE.map((t) => [t, byId(`lb-the-${t}`)])) as Record<TrangThaiLuatBan, HTMLElement>;
byId("lb-gioi-thieu").textContent = CAU_GIOI_THIEU;

const staff = await initShell();
const lyDo = (err: unknown): string => (err instanceof ApiError ? err.message : "Không kết nối được máy chủ.");

let ds: Api.LuatBanListResponse = { homNay: "", luat: [] };
let theDangMo: TrangThaiLuatBan = "DANG_AP_DUNG";

/** Dữ liệu cho hộp «Thêm luật» — nạp một lần khi mở hộp lần đầu. `loi` ≠ null ⇒ phần đó không chọn được (câu nêu lý do). */
interface ChoChon {
  loai: Api.LoaiDoiTacDto[];
  dm: Api.CatalogDacDiemResponse | null;
  loi: string | null;
}
let choChon: ChoChon | null = null;
async function napChoChon(): Promise<ChoChon> {
  if (choChon && choChon.loi === null) return choChon;
  const [loai, dm] = await Promise.allSettled([api<Api.LoaiDoiTacListResponse>("/api/pricing/loai-doi-tac"), api<Api.CatalogDacDiemResponse>("/api/catalog/dac-diem")]);
  const loi = [loai, dm].find((r) => r.status === "rejected") as PromiseRejectedResult | undefined;
  choChon = {
    loai: loai.status === "fulfilled" ? loai.value.loai.filter((l) => l.dangBat) : [],
    dm: dm.status === "fulfilled" ? dm.value : null,
    loi: loi ? lyDo(loi.reason) : null,
  };
  return choChon;
}

function baoLoi(err: unknown): void {
  showError(errorEl, lyDo(err));
  errorEl.scrollIntoView({ block: "nearest" });
}

function chonThe(t: TrangThaiLuatBan, lay = false): void {
  theDangMo = t;
  for (const k of THU_TU_THE) {
    const on = k === t;
    tabEl[k].setAttribute("aria-selected", String(on));
    tabEl[k].tabIndex = on ? 0 : -1;
    theEl[k].hidden = !on;
  }
  if (lay) tabEl[t].focus();
}

// ---- Danh sách ----------------------------------------------------------------------------------------------------------------------------------------------
const huyHieu = (l: Api.LuatBanDto): HTMLElement => h("span", { class: "huy-hieu", "data-tong": tongTrangThai(l.trangThai) }, NHAN_THE_LUAT[l.trangThai]);

function viecCua(l: Api.LuatBanDto): HTMLElement | null {
  // Luật đã hẹn ngày kết thúc thì không đặt lại được (bảng chỉ cho đặt ngày kết thúc MỘT lần — ADR-0146 Đ1).
  if (l.denNgay !== null || l.trangThai === "DA_KET_THUC") return null;
  const ten = moTaPhamVi(l);
  const ngay = h("button", { type: "button", class: "nut", "data-viec": "ket-thuc-ngay", "aria-label": `${NUT_KET_THUC_NGAY}: ${l.tenLoai} · ${ten}` }, NUT_KET_THUC_NGAY);
  ngay.addEventListener("click", () => void ketThucNgay(l, ngay));
  const hen = h("button", { type: "button", class: "nut", "data-cap": "phu", "data-viec": "hen", "aria-label": `Hẹn ngày kết thúc: ${l.tenLoai} · ${ten}` }, "Hẹn ngày kết thúc");
  hen.addEventListener("click", () => moHenKetThuc(l, hen));
  return h("div", { class: "lb-viec" }, ngay, hen);
}

function veThe(t: TrangThaiLuatBan): void {
  const dong = locTheThe(ds.luat, t);
  tabEl[t].textContent = `${NHAN_THE_LUAT[t]} (${dong.length})`;
  if (dong.length === 0) {
    replaceChildren(theEl[t], h("p", { class: "rong" }, CAU_RONG_THE[t]));
    return;
  }
  const bang = h(
    "div",
    { class: "table-wrap" },
    h(
      "table",
      { class: "bang" },
      h("thead", null, h("tr", null, h("th", null, "Loại đối tác"), h("th", null, "Không bán"), h("th", null, "Hiệu lực"), h("th", null, "Trạng thái"), h("th", null, "Việc"))),
      h(
        "tbody",
        null,
        ...dong.map((l) => {
          const phu = dongPhuDaKetThuc(l, ds.homNay);
          return h(
            "tr",
            { "data-id": l.id, "data-pham-vi": l.phamVi, "data-khong-phu": l.khongPhu ? "1" : null },
            h("td", null, l.tenLoai),
            h("td", null, h("span", { class: "lb-pv" }, NHAN_PHAM_VI[l.phamVi]), " ", moTaPhamVi(l), l.ghiChu ? h("span", { class: "hint" }, `Ghi chú: ${l.ghiChu}`) : null),
            h("td", null, moTaHieuLuc(l), phu ? h("span", { class: "hint" }, phu) : null),
            h("td", null, huyHieu(l)),
            h("td", null, viecCua(l)),
          );
        }),
      ),
    ),
  );
  const the = h(
    "div",
    { class: "card-list" },
    ...dong.map((l) => {
      const phu = dongPhuDaKetThuc(l, ds.homNay);
      return h(
        "article",
        { class: "the lb-dong", "data-id": l.id, "data-pham-vi": l.phamVi, "data-khong-phu": l.khongPhu ? "1" : null },
        h("div", { class: "lb-dong-dau" }, h("strong", null, l.tenLoai), huyHieu(l)),
        h("p", null, h("span", { class: "lb-pv" }, NHAN_PHAM_VI[l.phamVi]), " ", moTaPhamVi(l)),
        h("p", { class: "muted" }, moTaHieuLuc(l)),
        phu ? h("p", { class: "hint" }, phu) : null,
        l.ghiChu ? h("p", { class: "hint" }, `Ghi chú: ${l.ghiChu}`) : null,
        viecCua(l),
      );
    }),
  );
  replaceChildren(theEl[t], bang, the);
}
function veTatCa(): void {
  for (const t of THU_TU_THE) veThe(t);
}

async function napLai(): Promise<void> {
  try {
    ds = await api<Api.LuatBanListResponse>("/api/pricing/luat-ban");
  } catch (err) {
    baoLoi(err);
  }
  veTatCa();
}

/** 409 (luật vừa được người khác kết thúc) ⇒ báo, tải lại; lỗi khác ⇒ câu máy chủ. */
async function xuLyLoiGhi(err: unknown): Promise<void> {
  if (err instanceof ApiError && err.status === 409 && err.code === "stale") {
    hienBaoNgan(`${err.message} Đã tải lại.`, { tong: "bien" });
    await napLai();
    return;
  }
  hienBaoNgan(lyDo(err), { tong: "do" });
}

// ---- Kết thúc ---------------------------------------------------------------------------------------------------------------------------------------------
async function ketThucNgay(l: Api.LuatBanDto, nut: HTMLElement): Promise<void> {
  const dongY = await hoiXacNhan({ tieuDe: `${NUT_KET_THUC_NGAY} luật bán?`, hauQua: hauQuaKetThucNgay(l, ds.homNay), nhanNguyHiem: NUT_KET_THUC_NGAY, opener: nut });
  if (!dongY) return;
  try {
    await api(`/api/pricing/luat-ban/${encodeURIComponent(l.id)}/ket-thuc`, { method: "POST", body: {} });
  } catch (err) {
    await xuLyLoiGhi(err);
    return;
  }
  hienBaoNgan("Đã kết thúc luật. Luật thôi chặn từ bây giờ.");
  await napLai();
}

function moHenKetThuc(l: Api.LuatBanDto, nut: HTMLElement): void {
  const nho = ngayHenNhoNhat(l, ds.homNay);
  const phu = h("span", { class: "hint", id: "lb-hen-phu" }, dongPhuDenNgay("", ds.homNay));
  const o = h("input", { type: "date", class: "o", id: "lb-hen-ngay", min: nho, value: nho, required: true, "aria-describedby": "lb-hen-phu" });
  phu.textContent = dongPhuDenNgay(o.value, ds.homNay);
  o.addEventListener("input", () => (phu.textContent = dongPhuDenNgay(o.value, ds.homNay)));
  const loi = h("p", { class: "o-loi", role: "alert", hidden: true });
  const huy = h("button", { type: "button", class: "nut" }, "Huỷ");
  const luu = h("button", { type: "button", class: "nut", "data-cap": "chinh" }, "Hẹn kết thúc");
  const bang = moBangTruot({
    title: "Hẹn ngày kết thúc",
    body: [h("p", null, `${l.tenLoai} · ${moTaPhamVi(l)}`), h("label", { class: "nhan", for: "lb-hen-ngay" }, "Đến ngày"), o, phu, loi],
    foot: [huy, luu],
    opener: nut,
  });
  if (!bang) return;
  huy.addEventListener("click", () => bang.close());
  luu.addEventListener("click", async () => {
    if (!o.value) {
      loi.textContent = "Chọn ngày kết thúc.";
      loi.hidden = false;
      return;
    }
    bang.setBusy(true);
    luu.disabled = true;
    try {
      await api(`/api/pricing/luat-ban/${encodeURIComponent(l.id)}/ket-thuc`, { method: "POST", body: { denNgay: o.value } });
    } catch (err) {
      bang.setBusy(false);
      luu.disabled = false;
      if (err instanceof ApiError && err.status === 409) {
        bang.close(false);
        await xuLyLoiGhi(err);
        return;
      }
      loi.textContent = lyDo(err);
      loi.hidden = false;
      return;
    }
    bang.setBusy(false);
    bang.close(false);
    hienBaoNgan(`Đã hẹn kết thúc. ${dongPhuDenNgay(o.value, ds.homNay)}`);
    await napLai();
  });
}

// ---- Thêm luật --------------------------------------------------------------------------------------------------------------------------------------------
const chon = (id: string, nhan: string, luaChon: { code: string; ten: string }[], trong: string | null): { khoi: HTMLElement; o: HTMLSelectElement } => {
  const o = h("select", { class: "o", id }, trong === null ? null : h("option", { value: "" }, trong), ...luaChon.map((x) => h("option", { value: x.code }, x.ten)));
  return { khoi: h("div", { class: "lb-truong" }, h("label", { class: "nhan", for: id }, nhan), o), o };
};
const theoTen = <T extends { ten: string }>(a: T[]): T[] => [...a].sort((x, y) => x.ten.localeCompare(y.ten, "vi"));

async function moThemLuat(): Promise<void> {
  const cc = await napChoChon();
  const dm = cc.dm;
  const coDacDiem = !!dm && dm.dacDiem.some((a) => a.dangDung && a.giaTri.some((v) => v.dangDung));
  const loai = chon("lb-loai", "Loại đối tác", theoTen(cc.loai.map((l) => ({ code: l.code, ten: l.ten }))), "— Chọn loại —");
  const phamVi = chon(
    "lb-pham-vi",
    "Không bán",
    (["SERVICE", "GROUP", "ATTRIBUTE"] as const).filter((p) => p !== "ATTRIBUTE" || coDacDiem).map((p) => ({ code: p, ten: NHAN_PHAM_VI[p] })),
    null,
  );
  const dichVu = chon("lb-dich-vu", "Dịch vụ", theoTen((dm?.dichVu ?? []).filter((d) => d.dangBan)), "— Chọn dịch vụ —");
  const nhomDung = theoTen((dm?.nhom ?? []).filter((g) => g.dangDung));
  const nhom = chon("lb-nhom", "Nhóm dịch vụ", nhomDung, "— Chọn nhóm —");
  const dacDiemDung = (dm?.dacDiem ?? []).filter((a) => a.dangDung && a.giaTri.some((v) => v.dangDung));
  const dacDiem = chon("lb-dac-diem", "Đặc điểm", dacDiemDung, "— Chọn đặc điểm —");
  const giaTri = chon("lb-gia-tri", "Giá trị", [], "— Chọn giá trị —");
  const nhomTuyChon = chon("lb-nhom-dd", "Chỉ trong nhóm (tuỳ chọn)", nhomDung, "Mọi nhóm");
  const veGiaTri = (): void => {
    const a = dacDiemDung.find((x) => x.code === dacDiem.o.value);
    replaceChildren(giaTri.o, h("option", { value: "" }, "— Chọn giá trị —"), ...(a?.giaTri ?? []).filter((v) => v.dangDung).map((v) => h("option", { value: v.code }, v.ten)));
  };
  dacDiem.o.addEventListener("change", veGiaTri);
  const theoPhamVi = (): void => {
    const p = phamVi.o.value;
    dichVu.khoi.hidden = p !== "SERVICE";
    nhom.khoi.hidden = p !== "GROUP";
    for (const k of [dacDiem.khoi, giaTri.khoi, nhomTuyChon.khoi]) k.hidden = p !== "ATTRIBUTE";
  };
  phamVi.o.addEventListener("change", theoPhamVi);
  theoPhamVi();

  const tuNgay = h("input", { type: "date", class: "o", id: "lb-tu-ngay", min: ds.homNay, value: ds.homNay });
  const denPhu = h("span", { class: "hint", id: "lb-den-phu" }, dongPhuDenNgay("", ds.homNay));
  const denNgay = h("input", { type: "date", class: "o", id: "lb-den-ngay", min: ds.homNay, "aria-describedby": "lb-den-phu" });
  denNgay.addEventListener("input", () => (denPhu.textContent = dongPhuDenNgay(denNgay.value, ds.homNay)));
  tuNgay.addEventListener("input", () => (denNgay.min = tuNgay.value || ds.homNay));
  const ghiChu = h("textarea", { class: "o", "data-loai": "nhieu-dong", id: "lb-ghi-chu", maxLength: 200, rows: 2 });
  const loi = h("p", { class: "o-loi", role: "alert", hidden: true });
  const huy = h("button", { type: "button", class: "nut" }, "Huỷ");
  const luu = h("button", { type: "button", class: "nut", "data-cap": "chinh", id: "lb-luu" }, "Thêm luật");
  const bang = moBangTruot({
    title: "Thêm luật bán",
    body: [
      cc.loi ? h("p", { class: "o-loi" }, `Chưa tải đủ danh sách để chọn: ${cc.loi}`) : null,
      !coDacDiem && dm ? h("p", { class: "hint" }, "Chưa có đặc điểm dịch vụ nào đang dùng nên chưa đặt được luật theo đặc điểm.") : null,
      loai.khoi,
      phamVi.khoi,
      dichVu.khoi,
      nhom.khoi,
      dacDiem.khoi,
      giaTri.khoi,
      nhomTuyChon.khoi,
      h("div", { class: "lb-truong" }, h("label", { class: "nhan", for: "lb-tu-ngay" }, "Từ ngày"), tuNgay),
      h("div", { class: "lb-truong" }, h("label", { class: "nhan", for: "lb-den-ngay" }, "Đến ngày (để trống nếu chưa hẹn)"), denNgay, denPhu),
      h("div", { class: "lb-truong" }, h("label", { class: "nhan", for: "lb-ghi-chu" }, "Ghi chú (tuỳ chọn)"), ghiChu),
      loi,
    ],
    foot: [huy, luu],
    opener: nutThemEl,
  });
  if (!bang) return;
  huy.addEventListener("click", () => bang.close());
  luu.addEventListener("click", async () => {
    const p = phamVi.o.value as Api.LuatBanDto["phamVi"];
    const than: Record<string, unknown> = { loai: loai.o.value, phamVi: p, tuNgay: tuNgay.value || undefined, denNgay: denNgay.value || undefined, ghiChu: ghiChu.value.trim() || undefined };
    if (p === "SERVICE") than.catalogCode = dichVu.o.value;
    else if (p === "GROUP") than.groupCode = nhom.o.value;
    else Object.assign(than, { attributeCode: dacDiem.o.value, valueCode: giaTri.o.value, groupCode: nhomTuyChon.o.value || undefined });
    bang.setBusy(true);
    luu.disabled = true;
    let moi: Api.LuatBanResponse;
    try {
      moi = await api<Api.LuatBanResponse>("/api/pricing/luat-ban", { method: "POST", body: than });
    } catch (err) {
      bang.setBusy(false);
      luu.disabled = false;
      loi.textContent = lyDo(err);
      loi.hidden = false;
      loi.scrollIntoView({ block: "nearest" });
      return;
    }
    bang.setBusy(false);
    bang.close(false);
    hienBaoNgan(`Đã thêm luật bán: ${moi.luat.tenLoai} · ${moTaPhamVi(moi.luat)}.`);
    await napLai();
    chonThe(moi.luat.trangThai);
    theEl[moi.luat.trangThai].querySelector<HTMLElement>(`[data-id="${CSS.escape(moi.luat.id)}"]:not([hidden])`)?.scrollIntoView({ block: "nearest" });
  });
}

// ---- Khởi động --------------------------------------------------------------------------------------------------------------------------------------------
async function main(): Promise<void> {
  try {
    ds = await api<Api.LuatBanListResponse>("/api/pricing/luat-ban");
  } catch (err) {
    if (err instanceof ApiError && err.status === 403) trangThaiToanTrang("403", { trangDau: homeRedirect(staff) ?? "/" });
    else baoLoi(err);
    return;
  }
  noiDungEl.hidden = false;
  THU_TU_THE.forEach((k, i) => {
    tabEl[k].addEventListener("click", () => chonThe(k));
    tabEl[k].addEventListener("keydown", (e) => {
      const n = THU_TU_THE.length;
      const toi = e.key === "ArrowRight" ? (i + 1) % n : e.key === "ArrowLeft" ? (i - 1 + n) % n : e.key === "Home" ? 0 : e.key === "End" ? n - 1 : -1;
      if (toi < 0) return;
      e.preventDefault();
      chonThe(THU_TU_THE[toi]!, true);
    });
  });
  if (can(staff, "sales.block.write")) {
    nutThemEl.hidden = false;
    nutThemEl.addEventListener("click", () => void moThemLuat().catch(baoLoi));
  }
  veTatCa();
  chonThe(theDangMo);
}

await main();
