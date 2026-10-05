// Khối "Chi phí chuyến" trong Chi tiết chuyến (ADR-0057 T2 C9, ADR-0095 Q4/Q5/Q9; bản vẽ docs/design/van-chuyen-dot-3-7/Chi phí xe thuê.dc.html màn 1b; kế hoạch Đợt 4
// G2). CHỈ dựng và CHỈ gọi GET …/chi-phi khi người xem có ô transport.cost.view (Kế toán, Quản trị, Toàn quyền) — Bán hàng không có khối, không lời gọi (câu 4.4);
// họ chỉ thấy lý do giữ "Chuyến xe thuê chưa có giá" trong thẻ "Điều kiện xuất bến" có sẵn, không số tiền.
// - Mọi số (tổng, từng dòng, gợi ý giá bảng) do máy chủ trả; khối KHÔNG cộng. Nút theo cờ máy chủ (`coTheNhapThoaThuan`, `coTheChupLai`, `daoDuoc`) + can(adjust).
// - Mọi lệnh ghi gửi `requestId` (taoLenh) + `phienBanChiPhi` của bản đang xem; 409 chi_phi_vua_doi → dải đỏ "tải lại rồi thử lại".
// - ADR-0095 Q4: ô "Ngày phát sinh" của điều chỉnh để TRỐNG mặc định — máy chủ lấy ngày chạy (chuyến đã huỷ: ngày huỷ); chỉ gửi `ngay` khi người dùng chọn.
// - ADR-0095 Q5: chuyến đã đổi sang xe công ty vẫn ghi được "Phí huỷ muộn" cho nhà xe cũ ⇒ nút "Điều chỉnh" theo "chuyến đã có dòng chi phí" (máy chủ quyết lý do).
// - Khối là MỘT phần tử sống qua các lần vẽ lại trang chuyến (form nội tuyến đang mở không bị xoá khi Bảng tin làm mới trang).
import type { ChiPhiChuyenDto, ChiPhiChuyenResponse, DongChiPhiDto } from "../src/shared/contracts";
import { can, type PermissionHolder } from "../src/shared/permissions";
import { chipDongChiPhi, docSoTien, loiSoTien, nhanNguonGia, soTienCoDau } from "../src/shared/tien-xe-hien-thi";
import { ApiError, api } from "./api";
import { moBangTruot } from "./bang-truot";
import { dai, taoLenh } from "./dieu-phoi-ui";
import { h, replaceChildren } from "./dom";
import { dateTime, vnd } from "./format";
import { cauLoi, chipTx, daiLoi, dangGui, loiTai, moForm, nutGui, o, type FormTienXe } from "./tien-xe-ui";

const CAU_VUA_DOI = "Chi phí chuyến vừa thay đổi — tải lại rồi thử lại.";

export interface KhoiChiPhi {
  /** Phần tử khối (null khi người xem không có ô transport.cost.view — trang không đặt gì). */
  el: HTMLElement | null;
  /** Đọc lại chi phí của chuyến (gọi khi trang chuyến vừa đổi). Không có ô → không làm gì. */
  tai(tripId: string): Promise<void>;
}

/** `sauGhi` chạy sau mỗi lệnh ghi thành công (trang chuyến đọc lại: lý do giữ "thiếu giá" có thể vừa hết). */
export function taoKhoiChiPhi(staff: PermissionHolder, sauGhi: () => Promise<void>): KhoiChiPhi {
  if (!can(staff, "transport.cost.view")) return { el: null, tai: async () => undefined };
  const coSua = can(staff, "transport.cost.adjust");
  const el = h("div", { class: "cp-khoi", id: "ct-chi-phi", hidden: true });
  const formHost = h("div", { class: "tx-form-host", hidden: true });
  let tripId = "";
  let cp: ChiPhiChuyenDto | null = null;
  let loiTaiCau: string | null = null;
  let vuaDoi = false;
  let baoLoi: string | null = null;
  let form: FormTienXe | null = null;

  async function tai(id: string): Promise<void> {
    tripId = id;
    try {
      cp = (await api<ChiPhiChuyenResponse>(`/api/van-chuyen/chuyen/${encodeURIComponent(id)}/chi-phi`)).chiPhi;
      loiTaiCau = null;
    } catch (e) {
      loiTaiCau = cauLoi(e);
    }
    ve();
  }

  /** Gửi một lệnh ghi chi phí; trả câu lỗi cho form (null = xong). 409 chi_phi_vua_doi → đóng form, dải đỏ ở đầu khối. */
  async function gui(lenh: ReturnType<typeof taoLenh>, duoi: string, than: Record<string, unknown>): Promise<string | null> {
    try {
      const r = await lenh.gui<ChiPhiChuyenResponse>(`/api/van-chuyen/chuyen/${encodeURIComponent(tripId)}/chi-phi/${duoi}`, "POST", { phienBanChiPhi: cp!.phienBanChiPhi, ...than });
      cp = r.chiPhi;
      vuaDoi = false;
      baoLoi = null;
      form?.setBusy(false);
      form?.close();
      form = null;
      ve();
      await sauGhi();
      return null;
    } catch (e) {
      if (e instanceof ApiError && e.code === "chi_phi_vua_doi") {
        vuaDoi = true;
        form?.setBusy(false);
        form?.close();
        form = null;
        ve();
        return CAU_VUA_DOI;
      }
      return cauLoi(e);
    }
  }

  function ve(): void {
    if (loiTaiCau !== null && cp === null) {
      el.hidden = false;
      replaceChildren(el, h("section", { class: "vc-card cp-the" }, dauKhoi(), h("div", { class: "cp-than" }, loiTai(`Chưa tải được chi phí chuyến: ${loiTaiCau}`, () => void tai(tripId)))));
      return;
    }
    const c = cp;
    // Xe công ty thuần (chưa từng có dòng chi phí): không có khối.
    if (!c || (!c.thue && c.dong.length === 0)) {
      el.hidden = true;
      replaceChildren(el);
      return;
    }
    el.hidden = false;
    const thieuGia = c.thue && c.trangThai === "PLANNED" && c.nguonGia === null;
    const nutThoaThuan = (lop: string) => {
      if (!(coSua && c.coTheNhapThoaThuan)) return null;
      const b = h("button", { type: "button", class: `vc-btn ${lop}`, "data-action": "nhap-thoa-thuan" }, "Nhập giá thoả thuận");
      b.addEventListener("click", () => moThoaThuan(b));
      return b;
    };
    // Dải cảnh báo thiếu giá (chỉ người có ô cost.view — câu 4.4).
    const daiThieu = thieuGia
      ? dai("warning", "Chuyến xe thuê chưa có giá — chưa được xuất bến", ["Nhập giá thoả thuận với nhà xe, hoặc bổ sung giá vào Bảng giá thuê xe rồi lấy lại giá bảng."], undefined,
        coSua && c.coTheNhapThoaThuan ? [h("div", { class: "banner-actions" }, nutThoaThuan("btn btn-primary btn-chinh"))] : [])
      : null;
    daiThieu?.classList.add("cp-dai-thieu");
    const nguon = nhanNguonGia(c.nguonGia, c.trangThai === "CANCELLED"); // L2: chuyến huỷ không có giá → tông trung tính
    const tomTat = h(
      "div",
      { class: "cp-tom-tat" },
      o2("NHÀ XE", c.nhaXe?.ten ?? "—"),
      o2("TUYẾN", c.tuyen?.ten ?? "Chưa chọn tuyến"),
      h("div", { class: "cp-o" }, h("span", { class: "dp-kv-k" }, "NGUỒN GIÁ"), h("span", null, chipTx(nguon.nhan, nguon.tone))),
      h("div", { class: "cp-o" }, h("span", { class: "dp-kv-k" }, "TỔNG CHI PHÍ"), h("span", { class: "cp-tong", "data-tong": String(c.tong) }, c.nguonGia === null && c.tong === 0 ? "—" : vnd(c.tong))),
    );
    const dong = c.dong.length ? h("div", { class: "cp-ds" }, ...c.dong.map(dongEl)) : h("div", { class: "cp-trong" }, "Chưa có dòng chi phí nào.");
    // Hàng nút cuối khối (chỉ ô transport.cost.adjust).
    const nut: HTMLElement[] = [];
    const goiY: string[] = [];
    if (coSua) {
      const tt = nutThoaThuan("btn btn-primary btn-chinh");
      if (tt) nut.push(tt);
      if (c.coTheChupLai) {
        const b = h("button", { type: "button", class: "vc-btn vc-btn-ghost-primary", "data-action": "chup-lai" }, "Lấy lại giá bảng");
        b.addEventListener("click", () => void chupLai(b));
        nut.push(b);
        if (c.giaBangCoThe !== null) goiY.push(`Bảng giá vừa có giá ${vnd(c.giaBangCoThe)} cho tuyến và cỡ xe này — bấm “Lấy lại giá bảng” để dùng.`);
      }
      if (c.dong.length > 0) {
        const b = h("button", { type: "button", class: `vc-btn ${nut.length ? "vc-btn-ghost-primary" : "btn btn-primary btn-chinh"}`, "data-action": "dieu-chinh" }, "Điều chỉnh");
        b.addEventListener("click", () => moDieuChinh(b));
        nut.push(b);
        goiY.push("Điều chỉnh cộng hoặc trừ vào tổng; ghi sai thì “Đảo dòng”.");
        if (c.trangThai === "CANCELLED") goiY.push("Chuyến đã huỷ vẫn ghi được phí huỷ.");
      }
    }
    replaceChildren(
      el,
      daiThieu,
      h(
        "section",
        { class: "vc-card cp-the", "aria-labelledby": "cp-title" },
        dauKhoi(),
        h(
          "div",
          { class: "cp-than" },
          vuaDoi ? dai("danger", CAU_VUA_DOI, [], () => void taiLaiGiuCuon()) : null,
          baoLoi ? dai("danger", baoLoi) : null,
          tomTat,
          dong,
          formHost,
          nut.length ? h("div", { class: "cp-nut" }, ...nut) : null,
          ...goiY.map((g) => h("div", { class: "vc-hint cp-goi-y" }, g)),
        ),
      ),
    );
  }

  const dauKhoi = () => h("div", { class: "dp-card-head" }, h("h2", { id: "cp-title", class: "dp-card-title cp-title" }, "Chi phí chuyến"), h("span", { class: "chip dp-chip-unit cp-chip-ai" }, "Chỉ Kế toán · Quản trị"));
  const o2 = (k: string, v: string) => h("div", { class: "cp-o" }, h("span", { class: "dp-kv-k" }, k), h("span", { class: "cp-v" }, v));

  function dongEl(d: DongChiPhiDto): HTMLElement {
    const loai = chipDongChiPhi(d);
    const daoNut = coSua && d.daoDuoc ? h("button", { type: "button", class: "vc-btn vc-btn-text cp-dao", "data-action": "dao-dong" }, "Đảo dòng") : null;
    daoNut?.addEventListener("click", () => moDao(d, daoNut));
    return h(
      "div",
      { class: `cp-dong${d.daDao ? " is-dao" : ""}`, "data-dong": d.id, "data-loai": d.loai },
      h(
        "div",
        { class: "cp-dong-dau" },
        h("span", { class: "cp-chips" }, chipTx(loai.nhan, loai.tone), d.daDao ? h("span", { class: "chip cp-chip-vien" }, "đã đảo") : null, d.daoDoDoiChuyen ? chipTx("đảo do đổi chuyến", "warn") : null),
        h("span", { class: `cp-so${d.soTien < 0 ? " is-am" : ""}` }, soTienCoDau(d.soTien)),
      ),
      d.lyDo ? h("div", { class: "cp-ly-do" }, d.lyDo.nhan) : null,
      d.ghiChu ? h("div", { class: "tx-phu" }, d.ghiChu) : null,
      h("div", { class: "cp-ai" }, `${d.tuDong ? "Hệ thống" : (d.nguoi ?? "—")} · ${dateTime(d.luc)}`),
      daoNut,
    );
  }

  async function taiLaiGiuCuon(): Promise<void> {
    const y = scrollY;
    vuaDoi = false;
    await tai(tripId);
    scrollTo(0, y);
  }

  async function chupLai(b: HTMLButtonElement): Promise<void> {
    b.disabled = true;
    const cau = await gui(taoLenh(), "chup-lai", {});
    if (cau && cau !== CAU_VUA_DOI) {
      baoLoi = cau;
      ve();
    }
  }

  /** Mở form; nút chính gọi `layThan` (null = không gửi). */
  function moFormChiPhi(tieuDe: string, body: HTMLElement[], nhanNut: string, action: string, duoi: string, layThan: () => Record<string, unknown> | string, opener: HTMLElement): void {
    const lenh = taoLenh();
    const loi = daiLoi();
    const nut = nutGui(nhanNut, "btn btn-primary btn-chinh", action);
    form = moForm({ tieuDe, body: [...body, loi.el], nut: [nut], host: formHost, opener, onClosed: () => (form = null) });
    if (!form) return;
    const f = form;
    nut.addEventListener("click", async () => {
      loi.hien(null);
      const than = layThan();
      // L3: số gõ sai định dạng → báo ngay, không gửi (layThan trả câu thay vì thân lệnh).
      if (typeof than === "string") return loi.hien(than);
      f.setBusy(true);
      dangGui(nut, true);
      const cau = await gui(lenh, duoi, than);
      if (cau && cau !== CAU_VUA_DOI) {
        loi.hien(cau);
        f.setBusy(false);
        dangGui(nut, false);
      }
    });
  }

  function moThoaThuan(opener: HTMLElement): void {
    const tien = h("input", { class: "vc-input", type: "text", inputmode: "numeric", autocomplete: "off", placeholder: "Ví dụ: 1.250.000" });
    const ghi = h("textarea", { class: "vc-input", maxLength: 300, rows: 3, placeholder: "Thoả thuận với ai, ngày nào" });
    moFormChiPhi("Nhập giá thoả thuận", [o("cp-tt-tien", "Số tiền (₫)", tien, { batBuoc: true }), o("cp-tt-ghi", "Ghi chú thoả thuận", ghi, { batBuoc: true, rong: true })],
      "Lưu giá thoả thuận", "luu-thoa-thuan", "gia-thoa-thuan", () => loiSoTien(tien.value) ?? { soTien: docSoTien(tien.value), ghiChu: ghi.value }, opener);
  }

  const chonLyDo = (): HTMLSelectElement => h("select", { class: "vc-input" }, h("option", { value: "" }, "Chọn lý do"), ...(cp?.lyDoChon ?? []).map((l) => h("option", { value: l.ma }, l.nhan)));

  function moDieuChinh(opener: HTMLElement): void {
    const tien = h("input", { class: "vc-input", type: "text", inputmode: "text", autocomplete: "off", placeholder: "Ví dụ: + 150.000 hoặc − 700.000" });
    const lyDo = chonLyDo();
    const ngay = h("input", { class: "vc-input", type: "date" });
    const ghi = h("input", { class: "vc-input", type: "text", maxLength: 300 });
    const goiYNgay = cp?.trangThai === "CANCELLED" ? "Để trống: ngày huỷ chuyến." : "Để trống: ngày chạy chuyến.";
    moFormChiPhi("Điều chỉnh chi phí", [
      o("cp-dc-tien", "Số tiền (+ hoặc −)", tien, { batBuoc: true }),
      o("cp-dc-ly-do", "Lý do", lyDo, { batBuoc: true }),
      o("cp-dc-ngay", "Ngày phát sinh", ngay, { goiY: goiYNgay }),
      o("cp-dc-ghi", "Ghi chú", ghi, { rong: true }),
    ], "Lưu điều chỉnh", "luu-dieu-chinh", "dieu-chinh", () => loiSoTien(tien.value, { coDau: true }) ?? ({ soTien: docSoTien(tien.value, { coDau: true }), lyDo: lyDo.value, ghiChu: ghi.value.trim() || null, ...(ngay.value ? { ngay: ngay.value } : {}) }), opener);
  }

  /** Hộp "Đảo dòng" (bản vẽ thiếu): lý do + ghi chú; không ô ngày (dòng đảo mang ngày của dòng gốc — ADR-0095 Q2). */
  function moDao(d: DongChiPhiDto, opener: HTMLElement): void {
    const lenh = taoLenh();
    const loi = daiLoi();
    const lyDo = chonLyDo();
    const ghi = h("input", { class: "vc-input", type: "text", maxLength: 300 });
    const nut = nutGui("Đảo dòng", "vc-btn-danger", "dao-gui");
    const dong = h("button", { type: "button", class: "vc-btn vc-btn-ghost-primary" }, "Đóng");
    const loai = chipDongChiPhi(d);
    const bang = moBangTruot({
      title: "Đảo dòng chi phí",
      body: [h("p", { class: "dp-sheet-text" }, `${loai.nhan} ${soTienCoDau(d.soTien)}${d.lyDo ? ` · ${d.lyDo.nhan}` : ""}`), o("cp-dao-ly-do", "Lý do", lyDo, { batBuoc: true }), o("cp-dao-ghi", "Ghi chú", ghi), loi.el],
      foot: [dong, nut],
      footClass: "vc-foot-2",
      opener,
    });
    if (!bang) return;
    dong.addEventListener("click", () => bang.close());
    nut.addEventListener("click", async () => {
      loi.hien(null);
      bang.setBusy(true);
      dangGui(nut, true);
      const cau = await gui(lenh, "dao", { dongId: d.id, lyDo: lyDo.value, ghiChu: ghi.value.trim() || null });
      bang.setBusy(false);
      if (cau === null || cau === CAU_VUA_DOI) bang.close(false);
      else {
        loi.hien(cau);
        dangGui(nut, false);
      }
    });
  }

  return { el, tai };
}
