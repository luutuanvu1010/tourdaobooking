// Chi tiết chuyến (/chuyen?id=<chuyến>) — ADR-0049 V2 (route 3, 4, 8, 40), ADR-0050 thành phần B, C, D, E; bản vẽ docs/design/van-chuyen-dieu-phoi/project/02 Chi tiet
// chuyen.dc.html; bản đối chiếu 2.7, 2.12, H10, H11, H14, H17, R-P16.
// - Đầu: mã, trạng thái (bị giữ đỏ), ngày giờ; nút theo cờ quyền: "Sửa chuyến", "Huỷ chuyến" (chỉ chuyến lên kế hoạch, ô trip.dispatch). Dòng khoá theo `khoaMoc`.
// - "Cập nhật điểm theo đơn" (route 40, lý do giữ "Nơi đón / trả đã đổi"): không cần phá lệ; kết quả: đã cập nhật N / không có gì cần cập nhật / chuyến vừa bị sửa.
// - Bảng điểm dừng (cờ `lechDon` → "Lệch đơn"), điều kiện xuất bến (danh mục cố định từ lý do giữ), nhật ký chuyến (ai bấm hoặc "máy"; hai giờ khi văn phòng khai).
// - CHỜ A15 (chưa có route trên nhánh): "Xuất bến thay tài xế", nút tiến độ bấm thay, "Kết thúc gián đoạn", "Mở màn Xuất bến ›" — chưa dựng (không để nút chết).
import { cauKhoaMoc, dieuKienXuatBen, dongBanChup, dongGoiBao, dongNhatKy, gioHien, kieuChuyen, nhanDiem } from "../src/shared/dieu-phoi-man";
import { NHAN_TU_CHOI_GOI_BAO, type MaTuChoiGoiBao } from "../src/shared/goi-bao";
import { ApiError } from "./api";
import type { CapNhatDiemResponse, ChuyenChiTietResponse } from "../src/shared/contracts";
import { can } from "../src/shared/permissions";
import { api } from "./api";
import { byId, h, replaceChildren, type Child } from "./dom";
import { chip, dai, docLoiLenh, moHuyChuyen, moPhaLe, taoLenh, thuNgay } from "./dieu-phoi-ui";
import { datCrumb, loiCua } from "./giay-to-ui";
import { icon } from "./icons";
import { initShell, setBarTitle, showError } from "./shell";
import { dongMoc, moKhaiGio, veDiemChay, type LenhDiem } from "./tien-do-ui";
import { giuTenKhach, ketThucDuoc } from "../src/shared/tien-do-man";
import type { GioVnDto, GoiBaoChangDto } from "../src/shared/contracts";

const errorEl = byId("error");
const trangEl = byId("ct-trang");
const bottomEl = byId("ct-bottom");
const id = new URLSearchParams(location.search).get("id") ?? "";

const staff = await initShell();
const coDieuPhoi = can(staff, "trip.dispatch");
const coPhaLe = can(staff, "trip.override");
/** Bấm thay tài xế (A15, route 31–39): ô trip.progress — Bán hàng, Quản trị, Toàn quyền; Kế toán không. */
const coTienDo = can(staff, "trip.progress");

let duLieu: ChuyenChiTietResponse | null = null;
let baoCao: HTMLElement | null = null;

async function nap(): Promise<void> {
  duLieu = await api<ChuyenChiTietResponse>(`/api/van-chuyen/chuyen/${encodeURIComponent(id)}`);
}

function ve(): void {
  const r = duLieu!;
  const c = r.chuyen;
  const ngay = c.ngayChay;
  const k = kieuChuyen(c);
  const keHoach = c.trangThai === "PLANNED";
  const back = byId<HTMLAnchorElement>("ct-back");
  back.href = `/dieu-phoi?ngay=${ngay}`;
  back.textContent = `‹ Điều phối xe ${ngay.slice(8, 10)}/${ngay.slice(5, 7)}`;
  document.body.dataset.back = back.href;
  document.title = `${c.ma} — Island Booking System`;
  setBarTitle(c.ma);
  datCrumb("Vận chuyển › Điều phối xe", c.ma);

  const nutSua = keHoach && coDieuPhoi ? h("a", { class: "vc-btn vc-btn-ghost-primary", href: `/chuyen-sua?id=${encodeURIComponent(c.id)}`, "data-action": "sua-chuyen" }, "Sửa chuyến") : null;
  // Xuất bến thay tài xế (bản vẽ 2a + 6d): chuyến lên kế hoạch; bị giữ thì khoá (đối chiếu 2.7) — máy chủ vẫn kiểm.
  const nutXuatBen = (lop: string) => {
    if (!(keHoach && coTienDo)) return null;
    const giu = c.lyDoGiu.length > 0;
    const b = h("button", { type: "button", class: `vc-btn ${lop}`, disabled: giu, "data-action": "xuat-ben-thay", title: giu ? "Chưa đủ điều kiện xuất bến" : null }, "Xuất bến thay tài xế");
    b.addEventListener("click", () => xuatBenThay(b));
    return b;
  };
  const nutHuy = (lop: string) => {
    if (!(keHoach && coDieuPhoi)) return null;
    const b = h("button", { type: "button", class: `vc-btn ${lop}`, "data-action": "huy-chuyen" }, "Huỷ chuyến");
    b.addEventListener("click", () => huy(b));
    return b;
  };
  const head = h(
    "div",
    { class: "dp-ct-head" },
    h("h1", { class: "dp-ct-title" }, c.ma),
    chip(k.nhan, k.kieu === "held" ? "danger" : k.kieu === "nodrv" ? "warn" : k.kieu === "run" ? "navy" : k.kieu === "done" ? "ok" : k.kieu === "cancel" ? "muted" : "unit"),
    h("span", { class: "dp-ct-when" }, `${thuNgay(ngay)} · ${gioHien(c.batDau, ngay)}–${gioHien(c.ketThuc, ngay)}`),
    h("div", { class: "dp-ct-actions" }, nutSua, nutXuatBen("vc-btn-ghost-primary"), nutHuy("vc-btn-danger")),
  );
  // Mốc tiến độ đã có (thành phần B): xuất bến / kết thúc — một giờ, hoặc hai giờ khi văn phòng khai.
  const moc = c.xuatBen || c.ketThucThat
    ? h("div", { class: "dp-ct-moc" }, dongMoc("Xuất bến", c.xuatBen, ngay), c.ketThucThat ? dongMoc(c.trangThai === "ENDED_INTERRUPTED" ? "Kết thúc gián đoạn" : "Kết thúc", c.ketThucThat, ngay) : null)
    : null;
  const khoa = c.khoaMoc.dangKhoa && keHoach
    ? h("div", { class: "dg-lock dp-ct-lock" }, icon("lock", 16), cauKhoaMoc(r.mocToiThieuPhut, { phaLe: coPhaLe, dieuPhoi: coDieuPhoi }))
    : null;

  // Dải: lý do giữ "Nơi đón / trả đã đổi" (C) + nút; chuyến đang chạy có nơi hẹn khác điểm (D — chỉ báo).
  const dais: Child[] = [];
  const noiDoi = c.lyDoGiu.filter((l) => l.ma === "NOI_HEN_DOI");
  if (keHoach && noiDoi.length) {
    const nut = coDieuPhoi ? h("button", { type: "button", class: "vc-btn btn btn-primary", "data-action": "cap-nhat-diem" }, "Cập nhật điểm theo đơn") : null;
    nut?.addEventListener("click", () => capNhatDiem(nut));
    dais.push(dai("danger", "Chuyến bị giữ: Nơi đón / trả đã đổi — cập nhật điểm", [
      ...noiDoi.map((l) => l.loiNhan),
      `Ai xử lý: ${noiDoi[0]!.aiXuLyNhan}. Không cần phá lệ, kể cả trong vùng khoá trước giờ xuất bến.`,
    ], undefined, nut ? [h("div", { class: "banner-actions" }, nut)] : []));
  }
  if (c.trangThai === "RUNNING") {
    for (const w of r.canhBao.filter((x) => x.loai === "NOI_HEN_KHAC_DIEM")) {
      dais.push(dai("warning", "Nơi hẹn khác điểm xe", [`Đơn ${w.maDon ?? ""} hẹn khác điểm của xe. Xe đang chạy nên không cập nhật điểm — gọi tài xế${c.taiXe ? ` ${c.taiXe.ten}` : ""}.`]));
    }
  }

  const kv = (nhan: string, giaTri: string, phu: string) => h("div", { class: "dp-kv" }, h("span", { class: "dp-kv-k" }, nhan), h("span", { class: "dp-kv-v" }, giaTri), h("span", { class: "dp-kv-s" }, phu));
  const soLieu = h(
    "div",
    { class: "vc-card dp-kv-strip" },
    kv("XE", c.xe.bienSo, `${c.xe.soCho} chỗ · ${c.xe.chuLaCongTy ? "xe công ty" : `nhà xe ${c.xe.chuXe}`}`),
    kv("TÀI XẾ", c.taiXe?.ten ?? "Chưa có tài xế", c.taiXe ? (c.taiXe.loai === "CONG_TY" ? "Tài xế công ty" : "Tài xế nhà xe") : ""),
    kv("GIỜ", `${gioHien(c.batDau, ngay)}–${gioHien(c.ketThuc, ngay)}`, `Xuất bến dự kiến ${gioHien(c.batDau, ngay)}`),
    kv("TẢI", `${c.tai}/${c.xe.soCho}`, `Còn ${Math.max(0, c.xe.soCho - c.tai)} chỗ`),
  );
  // Điện thoại (bản vẽ 2b): một dòng thay dải bốn ô.
  const dongDt = h("div", { class: "dp-ct-line" }, h("strong", null, c.xe.bienSo), ` · ${c.xe.soCho} chỗ · ${c.taiXe?.ten ?? "Chưa có tài xế"} · tải `, h("strong", null, `${c.tai}/${c.xe.soCho}`));

  const chay = c.trangThai === "RUNNING";
  const diem = chay ? diemChay() : h(
    "section",
    { class: "vc-card dp-stops", "aria-labelledby": "ct-diem-title" },
    h("div", { class: "dp-card-head" }, h("h2", { id: "ct-diem-title", class: "dp-card-title" }, "Điểm dừng"), h("span", { class: "dp-card-note" }, "Tải hiện tại ", h("strong", null, `${c.tai}/${c.xe.soCho}`))),
    h("div", { class: "dp-stop dp-stop-th", "aria-hidden": "true" }, h("span", null, "#"), h("span", null, "ĐÓN / TRẢ"), h("span", null, "NƠI"), h("span", null, "GIỜ HẸN"), h("span", null, "GIỜ XE TỚI"), h("span", null, "KHÁCH"), h("span", null, "TRẠNG THÁI")),
    ...(r.diem.length
      ? r.diem.map((d) => {
          const n = nhanDiem(d);
          const hen = d.gioHen ? gioHien(d.gioHen, ngay) : "—";
          const toi = d.gioXeToi ? gioHien(d.gioXeToi, ngay) : hen;
          // Máy tính: bảng 7 cột (bản vẽ 2a); điện thoại: vòng số + "Đón · nơi" + một dòng "Hẹn · xe tới · khách" (bản vẽ 2b) — hai cách bày, cùng dữ liệu.
          return h(
            "div",
            { class: `dp-stop${d.lechDon && d.trangThai !== "SKIPPED" ? " is-lech" : ""}${d.trangThai === "SKIPPED" ? " is-bo" : ""}`, "data-diem": d.id },
            h("span", { class: "dp-stop-so" }, n.so),
            h("span", { class: "dp-stop-loai" }, n.loai),
            h("span", { class: "dp-stop-noi" }, h("strong", null, h("span", { class: "dp-stop-loai-m" }, `${n.loai} · `), d.tenNoi), n.ghiChu ? h("span", { class: "dp-stop-note" }, n.ghiChu) : null, ...goiBaoCua(d.id)),
            h("span", { class: "dp-stop-hen" }, hen),
            h("span", { class: "dp-stop-toi" }, toi, n.muon ? h("span", { class: "dp-stop-muon" }, n.muon) : null),
            h("span", { class: "dp-stop-khach" }, String(d.soNguoi)),
            h("span", { class: "dp-stop-tom" }, [d.gioHen ? `Hẹn ${hen}` : null, d.gioHen || d.gioXeToi ? `xe tới ${toi}` : null, `${d.soNguoi} khách`].filter(Boolean).join(" · "), n.muon ? h("span", { class: "dp-stop-muon" }, n.muon) : null),
            h("span", { class: "dp-stop-tt" }, chip(n.nhan, n.tone)),
          );
        })
      : [h("div", { class: "dp-stop dp-stop-empty" }, "Chuyến chưa có điểm — xếp khách vào chuyến ở màn Điều phối xe.")]),
  );

  // Điều kiện xuất bến (chuyến lên kế hoạch) / bản chụp lúc xuất bến (sau khi xuất bến).
  let dieuKien: HTMLElement;
  if (keHoach) {
    const dk = dieuKienXuatBen(c.lyDoGiu);
    const soChua = dk.filter((x) => !x.dat).length;
    dieuKien = h(
      "section",
      { class: "vc-card dp-side-card", "aria-labelledby": "ct-dk-title" },
      h("div", { class: "dp-card-head" }, h("h2", { id: "ct-dk-title", class: "dp-card-title" }, "Điều kiện xuất bến"), soChua ? chip(`${soChua} chưa đạt`, "danger") : chip("Đạt hết", "ok")),
      ...dk.map((x) => h("div", { class: "dp-cond", "data-dat": String(x.dat) },
        h("span", { class: x.dat ? "dp-cond-mark is-dat" : "dp-cond-mark is-chua", "aria-label": x.dat ? "Đạt" : "Chưa đạt" }, x.dat ? "✓" : "✕"),
        h("span", { class: "dp-cond-text" }, h("span", { class: "dp-cond-nhan" }, x.nhan), x.chiTiet ? h("span", { class: "dp-cond-sub" }, x.chiTiet) : null))),
    );
  } else if (r.banChup) {
    const b = r.banChup;
    dieuKien = h(
      "section",
      { class: "vc-card dp-side-card", "aria-labelledby": "ct-dk-title" },
      h("div", { class: "dp-card-head" }, h("h2", { id: "ct-dk-title", class: "dp-card-title" }, "Bản chụp lúc xuất bến"), chip(b.ketQua === "DAT" ? "Đạt" : "Chưa đạt", b.ketQua === "DAT" ? "ok" : "danger")),
      h("div", { class: "dp-cond" }, h("span", { class: "dp-cond-text" }, h("span", { class: "dp-cond-nhan" }, `${gioHien(b.luc, ngay)} · ${b.bienSo} · ${b.soCho} chỗ`), h("span", { class: "dp-cond-sub" }, `${b.soNguoiChot} khách · nghỉ ${b.nghiDaDung} phút`))),
      ...b.muc.map((m) => {
        const x = dongBanChup(m);
        return h("div", { class: "dp-cond" }, h("span", { class: "dp-cond-text" }, h("span", { class: "dp-cond-nhan" }, x.nhan), x.phu ? h("span", { class: "dp-cond-sub" }, x.phu) : null));
      }),
    );
  } else {
    dieuKien = h("section", { class: "vc-card dp-side-card" }, h("div", { class: "dp-card-head" }, h("h2", { class: "dp-card-title" }, "Điều kiện xuất bến")), h("div", { class: "dp-cond dp-hist-sub" }, "Chuyến không còn lên kế hoạch."));
  }

  const nhatKy = h(
    "section",
    { class: "vc-card dp-side-card", "aria-labelledby": "ct-nk-title" },
    h("div", { class: "dp-card-head" }, icon("history", 16), h("h2", { id: "ct-nk-title", class: "dp-card-title" }, "Nhật ký chuyến")),
    ...r.nhatKy.map((n) => {
      const d = dongNhatKy(n, ngay);
      return h(
        "div",
        { class: "dp-log" },
        h("span", { class: "dp-log-meta" }, h("span", null, d.gio), h("span", { class: d.laMay ? "dp-log-who is-may" : "dp-log-who" }, d.ai), d.vanPhongKhai ? chip("giờ do văn phòng khai", "warn") : null),
        h("span", null, d.noiDung),
      );
    }),
  );

  replaceChildren(
    trangEl,
    head,
    moc,
    khoa,
    baoCao,
    ...dais,
    h("div", { class: "dp-ct-layout" }, h("div", { class: "dp-ct-main" }, dongDt, soLieu, diem), h("div", { class: "dp-ct-side" }, dieuKien, nhatKy)),
  );
  // Điện thoại: nút ở cuối trang, lưới hai cột (bản vẽ 2b); máy tính: nút ở đầu trang.
  const huyDay = nutHuy("vc-btn-danger");
  const xbDay = nutXuatBen("vc-btn-ghost-primary");
  replaceChildren(bottomEl, nutSua ? h("a", { class: "vc-btn vc-btn-ghost-primary", href: nutSua.getAttribute("href")!, "data-action": "sua-chuyen" }, "Sửa chuyến") : null, xbDay, huyDay);
  bottomEl.hidden = !(nutSua || huyDay || xbDay);
}

/**
 * GA-55 (máy chủ A18): phản hồi lệnh ghi KHÔNG còn họ tên / năm sinh khách — chỉ GET chi tiết có. Sau mỗi lệnh đọc lại GET; đọc lại hỏng thì giữ tên đã có
 * theo id suất (không ô tên trống, không "undefined").
 */
async function docLai<T extends ChuyenChiTietResponse>(r: T): Promise<T> {
  try {
    return { ...r, ...(await api<ChuyenChiTietResponse>(`/api/van-chuyen/chuyen/${encodeURIComponent(r.chuyen.id)}`)) };
  } catch {
    return giuTenKhach(r, duLieu);
  }
}

// ---- Bấm thay tài xế (A15; bản vẽ 5c, 6d; thành phần A) ------------------------------------------------------------------------------------------------------
/** Mỗi đường lệnh một bộ requestId (bấm lại sau mất mạng cùng thân → cùng id; lệnh nhiều bước như "Đã trả" có một bộ cho từng khách). */
const cacLenh = new Map<string, ReturnType<typeof taoLenh>>();
const lenhCho = (url: string) => {
  let l = cacLenh.get(url);
  if (!l) cacLenh.set(url, (l = taoLenh()));
  return l;
};
const goc = () => `/api/van-chuyen/chuyen/${encodeURIComponent(duLieu!.chuyen.id)}`;
const guiTienDo = async (duoi: string, than: Record<string, unknown>): Promise<void> => {
  duLieu = await docLai(await lenhCho(`${goc()}/${duoi}`).gui<ChuyenChiTietResponse>(`${goc()}/${duoi}`, "POST", than));
};
const moTaBamThay = () => `Ghi thay tài xế ${duLieu!.chuyen.taiXe?.ten ?? "của chuyến"}. Tên bạn được ghi kèm mốc này.`;
const muonHon = (a: GioVnDto | null | undefined, b: GioVnDto | null | undefined): GioVnDto | null => {
  if (!a) return b ?? null;
  if (!b) return a;
  return `${a.ngay} ${a.gio}` >= `${b.ngay} ${b.gio}` ? a : b;
};
const xong = (baoCaoMoi: HTMLElement | null = null) => {
  baoCao = baoCaoMoi;
  ve();
};

function xuatBenThay(nut: HTMLButtonElement): void {
  const r = duLieu!;
  const dk = dieuKienXuatBen(r.chuyen.lyDoGiu);
  moKhaiGio({
    tieuDe: `Xuất bến ${r.chuyen.ma} — bấm thay tài xế`,
    dauHop: [dai("ok", `Đạt đủ ${dk.length} điều kiện xuất bến`)],
    moTa: moTaBamThay(),
    nutChinh: "Xuất bến",
    nutLop: "btn btn-accent",
    somNhat: r.gioSomNhatKhai.xuatBen,
    ngayXem: r.chuyen.ngayChay,
    opener: nut,
    onGui: async (xayRaLuc) => {
      await guiTienDo("xuat-ben", xayRaLuc ? { xayRaLuc } : {});
      xong(dai("ok", `Đã ghi xuất bến ${duLieu!.chuyen.ma}`));
    },
  });
}

function diemChay(): HTMLElement {
  const r = duLieu!;
  const c = r.chuyen;
  const ketThuc = h("button", { type: "button", class: "vc-btn btn btn-accent", disabled: !ketThucDuoc(r.suat), "data-action": "ket-thuc" }, "Kết thúc chuyến");
  const gianDoan = h("button", { type: "button", class: "vc-btn vc-btn-danger", "data-action": "ket-thuc-gian-doan" }, "Kết thúc gián đoạn");
  ketThuc.addEventListener("click", () => moKhaiGio({
    tieuDe: `Kết thúc ${c.ma} — bấm thay tài xế`, moTa: moTaBamThay(), nutChinh: "Kết thúc chuyến", nutLop: "btn btn-accent",
    somNhat: r.gioSomNhatKhai.ketThuc, ngayXem: c.ngayChay, opener: ketThuc,
    onGui: async (xayRaLuc) => {
      await guiTienDo("ket-thuc", xayRaLuc ? { xayRaLuc } : {});
      xong(dai("ok", `Đã kết thúc ${duLieu!.chuyen.ma}`));
    },
  }));
  gianDoan.addEventListener("click", () => moKhaiGio({
    tieuDe: `Kết thúc gián đoạn ${c.ma} — bấm thay tài xế`,
    moTa: `${moTaBamThay()} Khách còn trên xe và khách chưa đón sẽ báo về văn phòng.`,
    nutChinh: "Kết thúc gián đoạn", nutLop: "vc-btn-danger",
    lyDo: r.lyDo.filter((l) => l.nhom === "KET_THUC_GIAN_DOAN"),
    somNhat: r.gioSomNhatKhai.ketThuc, ngayXem: c.ngayChay, opener: gianDoan,
    onGui: async (xayRaLuc, lyDo) => {
      await guiTienDo("ket-thuc-gian-doan", { lyDo, ...(xayRaLuc ? { xayRaLuc } : {}) });
      xong(dai("info", `Đã kết thúc gián đoạn ${duLieu!.chuyen.ma}`));
    },
  }));
  return h(
    "section",
    { class: "dp-run-list", "aria-labelledby": "ct-diem-title" },
    h("div", { class: "dp-card-head dp-run-list-head" }, h("h2", { id: "ct-diem-title", class: "dp-card-title" }, "Điểm dừng"), h("span", { class: "dp-card-note" }, "Tải hiện tại ", h("strong", null, `${c.tai}/${c.xe.soCho}`))),
    ...veDiemChay({ diem: r.diem, suat: r.suat, trangThai: c.trangThai, ngayXem: c.ngayChay, coNut: coTienDo, onLenh: lenhDiemChay, phuDiem: (b) => ({ duoi: goiBaoCua(b.diem.id).map((x) => h("div", { class: "dp-gb-dong" }, x)) }) }),
    coTienDo ? h("div", { class: "dp-run-end" }, ketThuc, ketThuc.disabled ? h("span", { class: "dp-note" }, "Bấm được khi đã trả hết khách.") : null, gianDoan) : null,
  );
}

function lenhDiemChay(l: LenhDiem, nut: HTMLButtonElement): void {
  const r = duLieu!;
  const d = l.buoc.diem;
  const som = r.gioSomNhatKhai;
  if (l.loai === "da-toi") {
    moKhaiGio({
      tieuDe: `Đã tới ${d.tenNoi} — bấm thay tài xế`, moTa: moTaBamThay(), nutChinh: "Ghi “Đã tới”",
      somNhat: som.diem.find((x) => x.id === d.id)?.daToi ?? null, ngayXem: r.chuyen.ngayChay, opener: nut,
      onGui: async (xayRaLuc) => {
        await guiTienDo(`diem/${encodeURIComponent(d.id)}/da-toi`, xayRaLuc ? { xayRaLuc } : {});
        xong();
      },
    });
    return;
  }
  if (l.loai === "tra-het") {
    const traCho = l.buoc.traCho;
    const somTra = traCho.reduce<GioVnDto | null>((m, id) => muonHon(m, som.suat.find((x) => x.id === id)?.tra), d.trangThai === "PENDING" ? som.diem.find((x) => x.id === d.id)?.daToi ?? null : null);
    moKhaiGio({
      tieuDe: `Đã trả ở ${d.tenNoi} — bấm thay tài xế`, moTa: `${moTaBamThay()} Trả ${traCho.length} khách đang trên xe ở điểm này.`, nutChinh: "Ghi “Đã trả”",
      somNhat: somTra, ngayXem: r.chuyen.ngayChay, opener: nut,
      onGui: async (xayRaLuc) => {
        const than = xayRaLuc ? { xayRaLuc } : {};
        // Nhiều lệnh nối nhau (tới điểm, rồi trả từng khách): hỏng giữa chừng thì tải lại — bấm lại làm nốt phần còn lại.
        try {
          if (duLieu!.diem.find((x) => x.id === d.id)?.trangThai === "PENDING") await guiTienDo(`diem/${encodeURIComponent(d.id)}/da-toi`, than);
          for (const id of traCho) {
            if (duLieu!.suat.find((x) => x.id === id)?.trangThai !== "BOARDED") continue;
            await guiTienDo(`phan-bo/${encodeURIComponent(id)}/tra`, than);
          }
        } finally {
          ve();
        }
        xong();
      },
    });
    return;
  }
  const lenh = l.loai;
  const nhan = { don: "Đã đón", vang: "Vắng", "khach-huy": "Khách đã huỷ" }[lenh];
  moKhaiGio({
    tieuDe: `${nhan} — ${l.ten} — bấm thay tài xế`, moTa: moTaBamThay(), nutChinh: `Ghi “${nhan}”`,
    somNhat: som.suat.find((x) => x.id === l.suatId)?.lenXe ?? null, ngayXem: r.chuyen.ngayChay, opener: nut,
    onGui: async (xayRaLuc) => {
      await guiTienDo(`phan-bo/${encodeURIComponent(l.suatId)}/${lenh}`, xayRaLuc ? { xayRaLuc } : {});
      xong();
    },
  });
}

// ---- ADR-0051: "Đã gọi báo" / "Bỏ đánh dấu" ở dòng điểm dừng (V2) ----------------------------------------------------------------------------------------
/** Dòng gọi báo của các chặng có khách LÊN ở điểm này (chặng ↔ điểm qua suất). Nút theo `baoDuoc` / `boDuoc` của máy chủ. */
function goiBaoCua(diemId: string): HTMLElement[] {
  const r = duLieu!;
  const legs = new Set(r.suat.filter((x) => x.diemLen === diemId && x.legId).map((x) => x.legId));
  return (r.goiBao ?? []).filter((g) => legs.has(g.legId)).flatMap((g) => {
    const d = dongGoiBao(g);
    if (!d) return [];
    const nut = d.nut ? h("button", { type: "button", class: "vc-btn vc-btn-ghost-primary dp-gb-btn", "data-action": d.nut.kieu === "da-goi" ? "da-goi-bao" : "bo-danh-dau", "data-leg": g.legId }, d.nut.nhan) : null;
    const x = d.nut;
    nut?.addEventListener("click", () => void goiBao(g.legId, x!.kieu === "da-goi" ? { url: "da-goi-bao", than: { phienBan: x!.phienBan, gioMoi: (x as { gioMoi: unknown }).gioMoi } } : { url: "bo-danh-dau-goi-bao", than: { phienBan: x!.phienBan } }, nut));
    return [h("span", { class: `dp-gb${g.gioHenDoi ? " is-chua" : ""}`, "data-leg": g.legId }, icon("handset", 14), h("span", null, d.chu), nut)];
  });
}
async function goiBao(legId: string, lenh: { url: string; than: Record<string, unknown> }, nut: HTMLButtonElement): Promise<void> {
  nut.disabled = true;
  try {
    const g = await lenhCho(`/api/van-chuyen/chang/${legId}/${lenh.url}`).gui<GoiBaoChangDto>(`/api/van-chuyen/chang/${encodeURIComponent(legId)}/${lenh.url}`, "POST", lenh.than);
    duLieu = { ...duLieu!, goiBao: (duLieu!.goiBao ?? []).map((x) => (x.legId === legId ? g : x)) };
    xong();
  } catch (e) {
    if (e instanceof ApiError && e.code in NHAN_TU_CHOI_GOI_BAO) xong(dai("warning", NHAN_TU_CHOI_GOI_BAO[e.code as MaTuChoiGoiBao], [], () => location.reload()));
    else {
      const l = docLoiLenh(e);
      xong(dai("danger", l.tieuDe, l.dong));
    }
  }
}

const lenhDiem = taoLenh();
async function capNhatDiem(nut: HTMLButtonElement): Promise<void> {
  const c = duLieu!.chuyen;
  nut.disabled = true;
  try {
    const r = await lenhDiem.gui<CapNhatDiemResponse>(`/api/van-chuyen/chuyen/${encodeURIComponent(c.id)}/cap-nhat-diem`, "POST", { version: c.version });
    duLieu = await docLai(r);
    baoCao = r.daCapNhat > 0
      ? dai("ok", "Đã cập nhật điểm theo đơn", [`Đổi điểm cho ${r.daCapNhat} khách theo nơi đón / trả mới của đơn; điểm không còn khách chuyển “bỏ qua — không còn khách”.`])
      : dai("info", "Không có điểm nào cần cập nhật", ["Điểm dừng đã khớp các đơn trong chuyến."]);
  } catch (e) {
    const l = docLoiLenh(e);
    baoCao = l.cu ? dai("warning", "Chuyến vừa được người khác sửa — tải lại", ["Tải lại để xem bản mới rồi bấm lại."], () => location.reload()) : dai("danger", l.tieuDe, l.dong);
  }
  ve();
  (baoCao ?? trangEl).scrollIntoView({ block: "nearest" });
}

const lenhHuy = taoLenh();
function huy(nut: HTMLButtonElement): void {
  const r = duLieu!;
  const c = r.chuyen;
  const gui = async (lyDo: string, phaLe?: string) => {
    const kq = await lenhHuy.gui<ChuyenChiTietResponse>(`/api/van-chuyen/chuyen/${encodeURIComponent(c.id)}/huy`, "POST", { version: c.version, lyDo, ...(phaLe ? { phaLe: { lyDo: phaLe } } : {}) });
    duLieu = await docLai(kq);
    baoCao = dai("info", "Đã huỷ chuyến", [c.tai > 0 ? "Khách trong chuyến đã trở về cột “Chưa xếp”." : "Chuyến không bị xoá, vẫn xem được trong nhật ký."]);
    ve();
  };
  moHuyChuyen({
    ma: c.ma, soKhach: c.tai, lyDo: r.lyDo, opener: nut,
    onXacNhan: async (code) => {
      try {
        await gui(code);
      } catch (e) {
        const l = docLoiLenh(e);
        if (l.cu) {
          baoCao = dai("warning", "Chuyến vừa được người khác sửa — tải lại", ["Tải lại để xem bản mới rồi làm lại."], () => location.reload());
          ve();
          return;
        }
        if (!(l.canPhaLe && l.duocPhaLe)) throw e;
        // H17: huỷ chuyến trong vùng khoá khi còn khách → phá lệ (khuôn 1f). Đóng hộp huỷ, mở hộp phá lệ, gửi lại cùng lệnh kèm phá lệ.
        setTimeout(() => moPhaLe({
          lyDo: r.lyDo, opener: nut, nutChinh: "Phá lệ và huỷ",
          tomTat: [h("div", { class: "dp-sheet-sum-title" }, `Huỷ ${c.ma} · ${c.tai} khách`), h("div", { class: "dp-note" }, l.lyDo.map((x) => x.loiNhan).join("; "))],
          onXacNhan: (p) => gui(code, p),
        }), 0);
      }
    },
  });
}

async function main(): Promise<void> {
  if (!can(staff, "trip.view")) return showError(errorEl, "Tài khoản này không xem được lịch xe.");
  if (!id) return showError(errorEl, "Thiếu mã chuyến.");
  try {
    await nap();
  } catch (e) {
    return showError(errorEl, loiCua(e));
  }
  ve();
}
await main();
