// Tạo / sửa chuyến (/chuyen-sua?ngay=YYYY-MM-DD — tạo; /chuyen-sua?id=<chuyến> — sửa) — ADR-0049 V3, route 2 và 4; bản vẽ docs/design/van-chuyen-dieu-phoi/project/
// 03 Tao sua chuyen.dc.html; bản đối chiếu 2.2, 2.3, H18, Q1.
// - Ô: Xe (xe bảo dưỡng không chọn được), Tài xế (nhóm công ty / từng nhà xe), Giờ bắt đầu, Giờ kết thúc (kết thúc ≤ bắt đầu = sang ngày hôm sau). KHÔNG ô "Ghi chú cho tài
//   xế" (chủ trả lời Q1: chưa làm).
// - Lỗi hiện dưới đúng ô sau khi bấm Lưu (409 → `truongLoiChuyen`); tạo mới / dời giờ không bao giờ cần phá lệ mốc (máy chủ quyết — 2.2, 2.3); "cần phá lệ" (khoảng
//   nghỉ; đổi xe / tài xế của chuyến đã vào vùng khoá) → Quản trị, Toàn quyền mở hộp Phá lệ (H18, `canQuyen` của máy chủ); Bán hàng thấy câu dưới ô.
// - Cột phải "<biển số> trong ngày" (máy tính): các chuyến của xe đang chọn trong ngày (từ GET /lich); chuyến máy chủ báo trùng giờ tô đỏ.
import { gioHien, truongLoiChuyen } from "../src/shared/dieu-phoi-man";
import type { ChuyenChiTietResponse, ChuyenTomTatDto, GioVnDto, LichChungResponse, LyDoDangDungDto, TaiXeChonDto, XeChonDto } from "../src/shared/contracts";
import { can } from "../src/shared/permissions";
import { addDays, isISODate, ngayNgan, vnToday } from "../src/shared/vn-date";
import { byId, h, replaceChildren } from "./dom";
import { dai, docLoiLenh, moPhaLe, taoLenh, thuNgay } from "./dieu-phoi-ui";
import { datCrumb, loiCua } from "./giay-to-ui";
import { icon } from "./icons";
import { api } from "./api";
import { initShell, setBarTitle, showError } from "./shell";

const errorEl = byId("error");
const bannerEl = byId("cx-banner");
const layoutEl = byId("cx-layout");
const formEl = byId<HTMLFormElement>("cx-form");
const ngayEl = byId("cx-ngay");
const bottomEl = byId("cx-bottom");
const params = new URLSearchParams(location.search);
const id = params.get("id");

const staff = await initShell();
const lenh = taoLenh();

interface TrangThai {
  ngay: string;
  xeId: string;
  taiXe: string;
  tu: string;
  den: string;
}

async function main(): Promise<void> {
  if (!can(staff, "trip.dispatch")) return showError(errorEl, "Tài khoản này không xếp xe được.");
  let chuyen: ChuyenChiTietResponse["chuyen"] | null = null;
  let xe: XeChonDto[];
  let taiXe: TaiXeChonDto[];
  let lyDo: LyDoDangDungDto[];
  let ngay: string;
  try {
    if (id) {
      const r = await api<ChuyenChiTietResponse>(`/api/van-chuyen/chuyen/${encodeURIComponent(id)}`);
      chuyen = r.chuyen;
      xe = r.xe;
      taiXe = r.taiXe;
      lyDo = r.lyDo;
      ngay = r.chuyen.ngayChay;
    } else {
      ngay = params.get("ngay") ?? vnToday(new Date());
      if (!isISODate(ngay)) return showError(errorEl, "Ngày không hợp lệ.");
      const l = await api<LichChungResponse>(`/api/van-chuyen/lich?ngay=${ngay}`);
      xe = l.xe;
      taiXe = l.taiXe;
      lyDo = l.lyDo;
    }
  } catch (e) {
    return showError(errorEl, loiCua(e));
  }
  const lich = await api<LichChungResponse>(`/api/van-chuyen/lich?ngay=${ngay}`).catch(() => null);
  const quayLai = chuyen ? `/chuyen?id=${encodeURIComponent(chuyen.id)}` : `/dieu-phoi?ngay=${ngay}`;
  const back = byId<HTMLAnchorElement>("cx-back");
  back.href = quayLai;
  back.textContent = chuyen ? `‹ ${chuyen.ma}` : `‹ Điều phối xe ${ngayNgan(ngay, vnToday(new Date()))}`;
  document.body.dataset.back = quayLai;
  const tieuDe = chuyen ? `Sửa chuyến ${chuyen.ma}` : `Chuyến mới · ${ngayNgan(ngay, vnToday(new Date()))}`;
  byId("cx-title").textContent = tieuDe;
  document.title = `${tieuDe} — Island Booking System`;
  setBarTitle(chuyen ? `Sửa chuyến ${chuyen.ma}` : "Chuyến mới");
  datCrumb("Vận chuyển › Điều phối xe", chuyen ? `Sửa ${chuyen.ma}` : "Chuyến mới");
  dung(ngay, chuyen, xe, taiXe, lyDo, lich);
}

function dung(ngay: string, chuyen: ChuyenChiTietResponse["chuyen"] | null, xe: XeChonDto[], taiXe: TaiXeChonDto[], lyDo: LyDoDangDungDto[], lich: LichChungResponse | null): void {
  const st: TrangThai = { ngay, xeId: chuyen?.xe.id ?? "", taiXe: chuyen?.taiXe?.partyId ?? "", tu: chuyen?.batDau.gio ?? "", den: chuyen?.ketThuc.gio ?? "" };
  let dangGui = false;
  let loiTruong: string[] = [];

  const truong = (idO: string, nhan: string, o: HTMLElement, goiY: HTMLElement | null, loi: HTMLElement) =>
    h("div", { class: "vc-field" }, h("label", { for: idO }, nhan), o, goiY, loi);
  const oLoi = (idO: string) => h("div", { id: `${idO}-error`, class: "vc-field-error", role: "alert", hidden: true });
  const baoLoi = (o: HTMLElement, el: HTMLElement, cau: readonly string[]) => {
    replaceChildren(el, ...(cau.length ? [icon("alert", 16, 2), cau.join(" ")] : []));
    el.hidden = cau.length === 0;
    if (cau.length) o.setAttribute("aria-invalid", "true");
    else o.removeAttribute("aria-invalid");
  };

  // Xe — xe bảo dưỡng hiện nhưng không chọn được (bản vẽ V3 / [MH]:69).
  const selXe = h("select", { id: "cx-xe", class: "vc-input", "aria-describedby": "cx-xe-hint cx-xe-error" },
    h("option", { value: "" }, "Chọn xe"),
    ...xe.map((x) => h("option", { value: x.id, disabled: x.trangThai !== "active" }, `${x.bienSo} · ${x.soCho} chỗ · ${x.chuLaCongTy ? "xe công ty" : x.chuXe}${x.trangThai !== "active" ? " · đang bảo dưỡng" : ""}`)));
  selXe.value = st.xeId;
  const hintXe = h("div", { id: "cx-xe-hint", class: "vc-hint" });
  const loiXe = oLoi("cx-xe");
  const veGoiYXe = (): void => {
    const x = xe.find((v) => v.id === st.xeId);
    hintXe.textContent = x ? `${x.soCho} chỗ · ${x.chuLaCongTy ? "xe công ty" : `nhà xe ${x.chuXe}`}${chuyen && x.id === chuyen.xe.id ? ` · đang có ${chuyen.tai} khách xếp` : ""}` : "";
    veNgay();
  };
  selXe.addEventListener("change", () => {
    st.xeId = selXe.value;
    baoLoi(selXe, loiXe, []);
    veGoiYXe();
  });

  // Tài xế — nhóm "Tài xế công ty" rồi từng nhà xe (không lọc theo tên — máy chủ báo chéo xe / tài xế dưới ô).
  const congTy = taiXe.filter((t) => t.loai === "CONG_TY");
  const nhaXe = new Map<string, TaiXeChonDto[]>();
  for (const t of taiXe.filter((x) => x.loai === "NHA_XE")) {
    const n = t.nhaXe[0] ?? "Nhà xe";
    nhaXe.set(n, [...(nhaXe.get(n) ?? []), t]);
  }
  const opt = (t: TaiXeChonDto) => h("option", { value: t.partyId }, t.ten);
  const selTx = h("select", { id: "cx-tai-xe", class: "vc-input", "aria-describedby": "cx-tai-xe-error" },
    h("option", { value: "" }, "Chọn tài xế"),
    congTy.length ? h("optgroup", { label: "Tài xế công ty" }, ...congTy.map(opt)) : null,
    ...[...nhaXe.entries()].map(([n, ds]) => h("optgroup", { label: `Nhà xe ${n}` }, ...ds.map(opt))));
  selTx.value = st.taiXe;
  const loiTx = oLoi("cx-tai-xe");
  selTx.addEventListener("change", () => {
    st.taiXe = selTx.value;
    baoLoi(selTx, loiTx, []);
  });

  // Giờ
  const oTu = h("input", { id: "cx-tu", class: "vc-input", type: "time", value: st.tu, "aria-describedby": "cx-tu-error" });
  const oDen = h("input", { id: "cx-den", class: "vc-input", type: "time", value: st.den, "aria-describedby": "cx-den-hint cx-den-error" });
  const loiTu = oLoi("cx-tu");
  const loiDen = oLoi("cx-den");
  const hintDen = h("div", { id: "cx-den-hint", class: "vc-hint" });
  const veGoiYDen = () => (hintDen.textContent = st.tu && st.den && st.den <= st.tu ? "Kết thúc sang ngày hôm sau." : "");
  oTu.addEventListener("input", () => {
    st.tu = oTu.value;
    baoLoi(oTu, loiTu, []);
    veGoiYDen();
  });
  oDen.addEventListener("input", () => {
    st.den = oDen.value;
    baoLoi(oDen, loiDen, []);
    veGoiYDen();
  });
  veGoiYDen();

  const luuMay = h("button", { type: "submit", class: "vc-btn btn btn-accent", "data-action": "luu-chuyen" }, "Lưu chuyến");
  const huyMay = h("a", { class: "vc-btn vc-btn-ghost-primary", href: document.body.dataset.back ?? "/dieu-phoi" }, "Huỷ bỏ");
  replaceChildren(
    formEl,
    truong("cx-xe", "Xe", selXe, hintXe, loiXe),
    truong("cx-tai-xe", "Tài xế", selTx, null, loiTx),
    h("div", { class: "dp-cx-gio" }, truong("cx-tu", "Giờ bắt đầu", oTu, null, loiTu), truong("cx-den", "Giờ kết thúc", oDen, hintDen, loiDen)),
    chuyen?.khoaMoc.dangKhoa
      ? dai("warning", "Chuyến đã vào vùng khoá trước giờ xuất bến", [`Đổi xe, đổi tài xế cần Quản trị phá lệ${can(staff, "trip.override") ? " — khi lưu, bạn sẽ chọn lý do phá lệ" : ""}. Đổi giờ không cần phá lệ.`])
      : null,
    h("div", { class: "dp-cx-actions" }, huyMay, luuMay),
  );
  const luuDay = h("button", { type: "button", class: "vc-btn btn btn-accent", "data-action": "luu-chuyen-day" }, "Lưu chuyến");
  luuDay.addEventListener("click", () => formEl.requestSubmit());
  replaceChildren(bottomEl, h("a", { class: "vc-btn vc-btn-ghost-primary", href: document.body.dataset.back ?? "/dieu-phoi" }, "Huỷ bỏ"), luuDay);

  // Cột phải: chuyến của xe đang chọn trong ngày.
  function veNgay(): void {
    const x = xe.find((v) => v.id === st.xeId);
    const cua: ChuyenTomTatDto[] = (lich?.chuyen ?? []).filter((c) => c.xe.id === st.xeId && c.trangThai !== "CANCELLED").sort((a, b) => a.batDauMs - b.batDauMs);
    const trung = new Set(loiTruong.flatMap((c) => c.match(/CX-[0-9]{4}-[0-9]+/g) ?? []));
    replaceChildren(
      ngayEl,
      h("div", { class: "dp-hist-head" }, h("h2", { id: "cx-ngay-title", class: "dp-hist-title" }, x ? `${x.bienSo} trong ngày` : "Xe trong ngày")),
      ...(cua.length
        ? cua.map((c) => h("div", { class: trung.has(c.ma) ? "dp-hist-row is-trung" : "dp-hist-row", "data-ma": c.ma },
            h("span", { class: "dp-hist-name" }, h("strong", null, c.ma), h("span", null, `${gioHien(c.batDau, st.ngay)}–${gioHien(c.ketThuc, st.ngay)}`)),
            h("span", { class: trung.has(c.ma) ? "dp-hist-sub is-trung" : "dp-hist-sub" }, trung.has(c.ma) ? "Trùng với giờ bạn chọn" : c.id === chuyen?.id ? "Chuyến đang sửa" : c.trangThaiNhan)))
        : [h("div", { class: "dp-hist-row dp-hist-sub" }, x ? "Xe chưa có chuyến nào trong ngày." : "Chọn xe để xem các chuyến trong ngày.")]),
    );
  }
  veGoiYXe();

  const gio = (g: string, ngayG: string): GioVnDto => ({ ngay: ngayG, gio: g });
  const than = (): { tao: Record<string, unknown> } | { sua: Record<string, unknown> } => {
    const batDau = gio(st.tu, st.ngay);
    const ketThuc = gio(st.den, st.den <= st.tu ? addDays(st.ngay, 1) : st.ngay);
    if (!chuyen) return { tao: { xeId: st.xeId, taiXePartyId: st.taiXe, batDau, ketThuc } };
    const b: Record<string, unknown> = { version: chuyen.version };
    if (st.xeId !== chuyen.xe.id) b.xeId = st.xeId;
    if (st.taiXe !== (chuyen.taiXe?.partyId ?? "")) b.taiXePartyId = st.taiXe;
    if (st.tu !== chuyen.batDau.gio || ketThuc.ngay !== chuyen.ketThuc.ngay || st.den !== chuyen.ketThuc.gio) {
      b.batDau = batDau;
      b.ketThuc = ketThuc;
    }
    return { sua: b };
  };

  const hienLoi = (ds: Parameters<typeof truongLoiChuyen>[0], tieuDe: string, dongThem: string[] = []): void => {
    const t = than();
    const doiXe = "tao" in t || "xeId" in t.sua;
    const doiTaiXe = "tao" in t || "taiXePartyId" in t.sua;
    const r = truongLoiChuyen(ds, { doiXe, doiTaiXe });
    loiTruong = r.gioKetThuc;
    baoLoi(selXe, loiXe, r.xe);
    baoLoi(selTx, loiTx, r.taiXe);
    baoLoi(oTu, loiTu, r.gioBatDau);
    baoLoi(oDen, loiDen, r.gioKetThuc);
    const soO = [r.xe, r.taiXe, r.gioBatDau, r.gioKetThuc].filter((x) => x.length > 0).length;
    replaceChildren(bannerEl, soO > 0 ? dai("danger", `Chưa lưu được — sửa ${soO} ô có đánh dấu bên dưới.`, [...r.khac, ...dongThem]) : dai("danger", tieuDe, [...r.khac, ...dongThem]));
    veNgay();
    (selXe.getAttribute("aria-invalid") ? selXe : selTx.getAttribute("aria-invalid") ? selTx : oTu.getAttribute("aria-invalid") ? oTu : oDen.getAttribute("aria-invalid") ? oDen : bannerEl).scrollIntoView({ block: "center" });
  };

  async function gui(phaLe?: string): Promise<void> {
    const t = than();
    let body: Record<string, unknown>;
    let url: string;
    let method: string;
    if ("tao" in t) {
      body = { ...t.tao, ...(phaLe ? { nghiPhaLe: { lyDo: phaLe } } : {}) };
      url = "/api/van-chuyen/chuyen";
      method = "POST";
    } else {
      body = { ...t.sua, ...(phaLe ? phaLeCho(phaLe) : {}) };
      url = `/api/van-chuyen/chuyen/${encodeURIComponent(chuyen!.id)}`;
      method = "PUT";
    }
    const r = await lenh.gui<ChuyenChiTietResponse>(url, method, body);
    location.replace(`/chuyen?id=${encodeURIComponent(r.chuyen.id)}`);
  }
  let lyDoCanPhaLe: string[] = [];
  const phaLeCho = (code: string): Record<string, unknown> => ({
    ...(lyDoCanPhaLe.includes("MOC_TOI_THIEU") ? { phaLe: { lyDo: code } } : {}),
    ...(lyDoCanPhaLe.includes("KHOANG_NGHI") ? { nghiPhaLe: { lyDo: code } } : {}),
  });

  formEl.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (dangGui) return;
    replaceChildren(bannerEl);
    const thieu = { xe: st.xeId ? [] : ["Chọn xe."], taiXe: st.taiXe ? [] : ["Chọn tài xế."], tu: st.tu ? [] : ["Nhập giờ bắt đầu."], den: st.den ? [] : ["Nhập giờ kết thúc."] };
    baoLoi(selXe, loiXe, thieu.xe);
    baoLoi(selTx, loiTx, thieu.taiXe);
    baoLoi(oTu, loiTu, thieu.tu);
    baoLoi(oDen, loiDen, thieu.den);
    const soThieu = Object.values(thieu).filter((x) => x.length).length;
    if (soThieu) {
      replaceChildren(bannerEl, dai("danger", `Chưa lưu được — sửa ${soThieu} ô có đánh dấu bên dưới.`));
      return;
    }
    const t = than();
    if ("sua" in t && Object.keys(t.sua).length === 1) {
      replaceChildren(bannerEl, dai("info", "Chưa đổi gì — không cần lưu."));
      return;
    }
    dangGui = true;
    for (const b of [luuMay, luuDay]) {
      b.disabled = true;
      b.textContent = "Đang lưu…";
    }
    try {
      await gui();
    } catch (err) {
      const l = docLoiLenh(err);
      if (l.cu) replaceChildren(bannerEl, dai("warning", l.tieuDe, [], () => location.reload()));
      else if (l.mang) replaceChildren(bannerEl, dai("danger", l.tieuDe));
      else if (l.canPhaLe && l.duocPhaLe) {
        lyDoCanPhaLe = l.lyDo.map((x) => x.ma);
        hienLoi(l.lyDo, l.tieuDe);
        moPhaLe({
          lyDo,
          tomTat: [h("div", { class: "dp-sheet-sum-title" }, chuyen ? `${chuyen.ma} · ${thuNgay(st.ngay)}` : `Chuyến mới · ${thuNgay(st.ngay)}`), h("div", { class: "dp-note" }, l.lyDo.map((x) => x.loiNhan).join("; "))],
          nutChinh: "Phá lệ và lưu",
          opener: luuMay,
          onXacNhan: (code) => gui(code),
        });
      } else hienLoi(l.lyDo, l.tieuDe, l.lyDo.length ? [] : l.dong);
      dangGui = false;
      for (const b of [luuMay, luuDay]) {
        b.disabled = false;
        b.textContent = "Lưu chuyến";
      }
    }
  });

  layoutEl.hidden = false;
  bottomEl.hidden = false;
}

await main();
