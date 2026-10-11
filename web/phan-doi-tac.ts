// Khối "Phần đối tác" ở trang chi tiết đơn (sổ đại lý đợt 1, Task 11; đặc tả §6, §11) + bảng trượt "Ghi mức tay". Gọi GET /api/orders/:id/thuong-mai và vẽ ĐÚNG dạng máy chủ trả (không suy theo quyền ở giao diện):
//  - `vanPhong`: người hưởng, từng dịch vụ (thành tiền, số khách tính, mức, hoa hồng, giá đại lý, người bán), dòng thiếu mức tô cảnh báo, tổng; nút "Ghi mức tay" cho người có ô `order.terms.override`;
//  - `doiTac`: "Hoa hồng của bạn" — chỉ SỐ TIỀN hoa hồng và giá đại lý của mình (không tỷ lệ, không người bán).
// 404 ⇒ ẩn khối LẶNG LẼ (Đối tác không có phần ở đơn này, hoặc đơn không có phần đối tác — Ruling 18); lỗi khác ⇒ dòng lỗi trong khối kèm nút tải lại.
// Quyết định ẩn/hiện, chữ và dựng thân ghi tay ở src/shared/phan-doi-tac-hien-thi.ts (có bài, và bài nối với route thật); tệp này chỉ dựng DOM. Không innerHTML.
import {
  CAU_CHO_CAI_MUC, TIEU_DE_DOI_TAC, TIEU_DE_VAN_PHONG, canhBaoThieuMuc, chuHoaHongDoiTac, chuNhaCungCap, chuTongHoaHong, demLyDo, docThanGhiTay, ghiChuTrangThai, hienNutGhiTay, nhanNguoiHuong,
  type FormGhiTay, type LoiGhiTay, type NguoiBanForm, type TruongGhiTay,
} from "../src/shared/phan-doi-tac-hien-thi";
import { ApiError, api, type Api } from "./api";
import { moBangTruot } from "./bang-truot";
import { h, replaceChildren, type Child } from "./dom";
import { vnd } from "./format";

export interface PhanDoiTacVao {
  orderId: string;
  /** Người xem được phép ghi mức tay VÀ đơn đã xác nhận, chưa Đã giao (nơi gọi tính bằng `duocGhiTay`); khối còn tự ẩn nút khi đơn nháp / chưa có bản chụp. */
  coGhiTay: boolean;
  /** Người xem có ô `supply.terms.view` (`coXemNguoiBan`): mới có khối "Người bán" trong bảng ghi tay và mới gọi GET /api/pricing/cung-ung. */
  xemNguoiBan: boolean;
}

type Ket = { kieu: "co"; res: Api.ThuongMaiResponse } | { kieu: "an" } | { kieu: "loi"; message: string };

async function doc(orderId: string): Promise<Ket> {
  try {
    return { kieu: "co", res: await api<Api.ThuongMaiResponse>(`/api/orders/${encodeURIComponent(orderId)}/thuong-mai`) };
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return { kieu: "an" };
    return { kieu: "loi", message: err instanceof ApiError ? err.message : "Không tải được phần đối tác — kiểm tra mạng rồi thử lại." };
  }
}

/** Một ô "nhãn — giá trị" của lưới dòng dịch vụ. */
const o = (nhan: string, ...noiDung: Child[]): HTMLElement => h("div", { class: "pdt-o" }, h("dt", { class: "muted" }, nhan), h("dd", null, ...noiDung));

export async function initPhanDoiTac(host: HTMLElement, v: PhanDoiTacVao): Promise<void> {
  /** Danh sách nhà cung cấp + hồ sơ Tour Đảo cho khối "Người bán": chỉ gọi khi có `supply.terms.view`; lỗi ⇒ null (bảng chỉ còn phần hoa hồng). Gọi nền một lần, dùng lại ở mọi lần mở bảng. */
  let nguoiBan: Promise<Api.SupplyTermListResponse | null> | null = null;
  const layNguoiBan = (): Promise<Api.SupplyTermListResponse | null> => (nguoiBan ??= api<Api.SupplyTermListResponse>("/api/pricing/cung-ung").catch(() => null));
  if (v.coGhiTay && v.xemNguoiBan) void layNguoiBan();

  function veLoi(message: string): void {
    const thu = h("button", { type: "button", class: "btn", "data-action": "tai-lai-phan-doi-tac" }, "Tải lại");
    thu.addEventListener("click", () => void napLai());
    replaceChildren(host, h("h2", null, TIEU_DE_VAN_PHONG), h("p", { class: "alert", role: "alert" }, message), thu);
    host.hidden = false;
  }

  function ve(res: Api.ThuongMaiResponse): void {
    replaceChildren(host, ...("vanPhong" in res ? veVanPhong(res.vanPhong) : veDoiTac(res.doiTac)));
    host.hidden = false;
  }

  async function napLai(): Promise<void> {
    const r = await doc(v.orderId);
    if (r.kieu === "co") ve(r.res);
    else if (r.kieu === "an") {
      replaceChildren(host);
      host.hidden = true;
    } else veLoi(r.message);
  }

  // ---- dạng văn phòng ----
  function dongVanPhong(d: Api.ThuongMaiDongVanPhong, coNut: boolean): HTMLElement {
    const canh = canhBaoThieuMuc(d.thieu);
    const nut = coNut ? h("button", { type: "button", class: "btn pdt-nut", "data-action": "ghi-tay", "data-service-id": d.serviceId }, "Ghi mức tay") : null;
    nut?.addEventListener("click", () => void moGhiTay(d, nut));
    return h(
      "article",
      { class: canh ? "pdt-dong is-thieu" : "pdt-dong", "data-service-id": d.serviceId },
      h("div", { class: "pdt-dong-dau" }, h("h3", { class: "pdt-ten" }, d.ten), d.ghiTay ? h("span", { class: "chip chip-muted" }, "ghi tay") : null),
      h(
        "dl",
        { class: "pdt-luoi" },
        o("Thành tiền", vnd(d.thanhTien)),
        o("Khách tính", String(d.soKhachTinh)),
        o("Mức", d.muc ?? "—"),
        o("Hoa hồng", d.hoaHong === null ? "—" : vnd(d.hoaHong)),
        o("Giá đại lý", d.giaDaiLy === null ? "—" : vnd(d.giaDaiLy)),
        o("Người bán", d.nguoiBan ? d.nguoiBan.ten : "—"),
      ),
      canh ? h("p", { class: "pdt-canh" }, canh) : null,
      d.nhaCungCap ? h("p", { class: "pdt-ncc muted" }, chuNhaCungCap(d.nhaCungCap, vnd)) : null,
      nut,
    );
  }

  function veVanPhong(d: Api.ThuongMaiVanPhongDto): Child[] {
    const trangThai = ghiChuTrangThai(d);
    const coNut = hienNutGhiTay(v.coGhiTay, d);
    return [
      h("h2", null, TIEU_DE_VAN_PHONG),
      h("p", { class: "pdt-nguoi-huong" }, nhanNguoiHuong(d)),
      trangThai ? h("p", { class: "pdt-trang-thai" }, h("span", { class: "chip chip-muted" }, trangThai)) : null,
      h("div", { class: "pdt-ds" }, ...d.dong.map((x) => dongVanPhong(x, coNut))),
      h(
        "dl",
        { class: "pdt-luoi pdt-tong" },
        o("Tổng thành tiền", vnd(d.tong.thanhTien)),
        o("Tổng hoa hồng", chuTongHoaHong(d.tong.hoaHong, vnd)),
        o("Tổng giá đại lý", d.tong.giaDaiLy === null ? "Chưa đủ mức" : vnd(d.tong.giaDaiLy)),
      ),
    ];
  }

  // ---- dạng Đối tác: chỉ số tiền của mình ----
  function veDoiTac(d: Api.ThuongMaiDoiTacDto): Child[] {
    return [
      h("h2", null, TIEU_DE_DOI_TAC),
      d.duKien ? h("p", { class: "pdt-trang-thai" }, h("span", { class: "chip chip-muted" }, "Dự kiến — tính theo bảng mức hôm nay, chưa lưu")) : null,
      d.choCongTyCaiMuc ? h("p", { class: "pdt-cho-muc" }, CAU_CHO_CAI_MUC) : null,
      h(
        "div",
        { class: "pdt-ds" },
        ...d.dong.map((x) =>
          h(
            "article",
            { class: "pdt-dong", "data-service-id": x.serviceId },
            h("div", { class: "pdt-dong-dau" }, h("h3", { class: "pdt-ten" }, x.ten)),
            h("dl", { class: "pdt-luoi pdt-luoi-doi-tac" }, o("Thành tiền", vnd(x.thanhTien)), o("Hoa hồng", chuHoaHongDoiTac(x.hoaHong, vnd)), o("Giá đại lý", x.giaDaiLy === null ? "—" : vnd(x.giaDaiLy))),
          ),
        ),
      ),
      h(
        "dl",
        { class: "pdt-luoi pdt-luoi-doi-tac pdt-tong" },
        o("Tổng thành tiền", vnd(d.tong.thanhTien)),
        o("Tổng hoa hồng", chuTongHoaHong(d.tong.hoaHong, vnd)),
        o("Tổng giá đại lý", d.tong.giaDaiLy === null ? "Chưa đủ mức" : vnd(d.tong.giaDaiLy)),
      ),
    ];
  }

  // ---- bảng trượt "Ghi mức tay" ----
  async function moGhiTay(d: Api.ThuongMaiDongVanPhong, opener: HTMLElement): Promise<void> {
    const nb = v.xemNguoiBan ? await layNguoiBan() : null; // đã gọi nền từ lúc dựng khối nên thường có sẵn
    const congTyChuId = nb?.congTyChu?.partyId ?? null;
    const dsNhaCungCap = nb?.nhaCungCap ?? [];
    const coKhoiNguoiBan = nb !== null && (congTyChuId !== null || dsNhaCungCap.length > 0);

    let kieu: FormGhiTay["kieu"] = "RATE";
    let loaiNguoiBan: NguoiBanForm["loai"] = "KHONG_DOI";
    const tyLe = h("input", { type: "text", inputMode: "decimal", autocomplete: "off", placeholder: "vd 12,5", id: "ghi-tay-ty-le" });
    const moiKhach = h("input", { type: "text", inputMode: "numeric", autocomplete: "off", placeholder: "vd 50.000", id: "ghi-tay-moi-khach" });
    const chonNcc = h("select", { id: "ghi-tay-ncc", "aria-label": "Nhà cung cấp" }, h("option", { value: "" }, "— Chọn nhà cung cấp —"), ...dsNhaCungCap.map((n) => h("option", { value: n.partyId }, n.ten)));
    const tyLeMua = h("input", { type: "text", inputMode: "decimal", autocomplete: "off", placeholder: "vd 70", id: "ghi-tay-ty-le-mua" });
    const lyDo = h("textarea", { rows: 3, autocomplete: "off", id: "ghi-tay-ly-do", "aria-describedby": "ghi-tay-dem" });
    const dem = h("p", { class: "muted", id: "ghi-tay-dem", "aria-live": "polite" }, demLyDo(""));
    const loi: Record<TruongGhiTay, HTMLElement> = {
      muc: h("p", { class: "field-error", role: "alert", hidden: true }),
      nguoiBan: h("p", { class: "field-error", role: "alert", hidden: true }),
      tyLeMua: h("p", { class: "field-error", role: "alert", hidden: true }),
      lyDo: h("p", { class: "field-error", role: "alert", hidden: true }),
      chung: h("p", { class: "field-error", role: "alert", hidden: true }),
    };
    const loiMay = h("p", { class: "alert", role: "alert", hidden: true });

    const khoiTyLe = h("label", null, "Tỷ lệ hoa hồng (%)", tyLe);
    const khoiMoiKhach = h("label", null, "Số tiền mỗi khách (₫)", moiKhach);
    const khoiNcc = h("div", { class: "pdt-ncc-o" }, h("label", null, "Nhà cung cấp", chonNcc), h("label", null, "Tỷ lệ mua lại (%)", tyLeMua), loi.tyLeMua);
    const capNhatHienThi = (): void => {
      khoiTyLe.hidden = kieu !== "RATE";
      khoiMoiKhach.hidden = kieu !== "PER_PAX";
      khoiNcc.hidden = loaiNguoiBan !== "NHA_CUNG_CAP";
    };
    const radio = (name: string, value: string, nhan: string, checked: boolean, onChange: () => void): HTMLElement => {
      const r = h("input", { type: "radio", name, value, checked });
      r.addEventListener("change", onChange);
      return h("label", { class: "pick" }, r, h("span", { class: "pick-mark", "aria-hidden": "true" }), h("span", { class: "pick-name" }, nhan));
    };
    const nhomMuc = h(
      "fieldset",
      { class: "pick-list" },
      h("legend", { class: "pick-legend" }, "Hoa hồng"),
      radio("ghi-tay-kieu", "RATE", "Phần trăm", true, () => ((kieu = "RATE"), capNhatHienThi())),
      radio("ghi-tay-kieu", "PER_PAX", "Số tiền mỗi khách", false, () => ((kieu = "PER_PAX"), capNhatHienThi())),
      radio("ghi-tay-kieu", "KHONG_DOI", "Không đổi hoa hồng", false, () => ((kieu = "KHONG_DOI"), capNhatHienThi())),
    );
    const nhomNguoiBan = coKhoiNguoiBan
      ? h(
          "fieldset",
          { class: "pick-list", id: "ghi-tay-nguoi-ban" },
          h("legend", { class: "pick-legend" }, "Người bán"),
          radio("ghi-tay-ban", "KHONG_DOI", "Không đổi", true, () => ((loaiNguoiBan = "KHONG_DOI"), capNhatHienThi())),
          congTyChuId !== null ? radio("ghi-tay-ban", "TOUR_DAO", "Tour Đảo", false, () => ((loaiNguoiBan = "TOUR_DAO"), capNhatHienThi())) : null,
          dsNhaCungCap.length > 0 ? radio("ghi-tay-ban", "NHA_CUNG_CAP", "Nhà cung cấp", false, () => ((loaiNguoiBan = "NHA_CUNG_CAP"), capNhatHienThi())) : null,
        )
      : null;
    capNhatHienThi();

    const docForm = (): FormGhiTay => ({
      kieu,
      tyLe: tyLe.value,
      moiKhach: moiKhach.value,
      nguoiBan: loaiNguoiBan === "NHA_CUNG_CAP" ? { loai: "NHA_CUNG_CAP", partyId: chonNcc.value, tyLeMua: tyLeMua.value } : { loai: loaiNguoiBan },
      lyDo: lyDo.value,
    });
    const hienLoi = (ds: readonly LoiGhiTay[]): void => {
      for (const [truong, el] of Object.entries(loi) as [TruongGhiTay, HTMLElement][]) {
        const cau = ds.filter((l) => l.truong === truong).map((l) => l.message).join(" ");
        el.textContent = cau;
        el.hidden = cau === "";
      }
    };

    const nutGui = h("button", { type: "button", class: "btn btn-primary btn-block", "data-action": "ghi-tay-gui" }, "Ghi mức");
    const bang = moBangTruot({
      title: "Ghi mức tay",
      opener,
      body: [
        h("p", { class: "muted" }, "Dịch vụ: ", h("strong", null, d.ten), ` · Mức hiện tại: ${d.muc ?? "chưa có"}`),
        loiMay,
        nhomMuc,
        khoiTyLe,
        khoiMoiKhach,
        loi.muc,
        nhomNguoiBan,
        nhomNguoiBan ? khoiNcc : null,
        nhomNguoiBan ? loi.nguoiBan : null,
        h("label", null, "Lý do (bắt buộc)", lyDo),
        dem,
        loi.lyDo,
        loi.chung,
      ],
      foot: [nutGui],
    });
    if (!bang) return;
    bang.dialog.id = "ghi-tay-sheet";
    lyDo.addEventListener("input", () => (dem.textContent = demLyDo(lyDo.value)));
    // Lỗi nào có thì nhảy tới ô đó, để người dùng sửa ngay.
    const oCuaTruong = (truong: TruongGhiTay): HTMLElement => (truong === "muc" ? (kieu === "RATE" ? tyLe : moiKhach) : truong === "nguoiBan" ? chonNcc : truong === "tyLeMua" ? tyLeMua : truong === "lyDo" ? lyDo : nutGui);

    nutGui.addEventListener("click", async () => {
      loiMay.hidden = true;
      const kq = docThanGhiTay(docForm(), congTyChuId);
      hienLoi(kq.ok ? [] : kq.loi);
      if (!kq.ok) {
        const dau = kq.loi[0]!;
        oCuaTruong(dau.truong).focus();
        return;
      }
      bang.setBusy(true);
      nutGui.disabled = true;
      nutGui.textContent = "Đang ghi…";
      try {
        const res = await api<Api.ThuongMaiResponse>(`/api/orders/${encodeURIComponent(v.orderId)}/thuong-mai/${encodeURIComponent(d.serviceId)}`, { method: "POST", body: kq.body });
        bang.setBusy(false);
        bang.close(false); // khối sắp được vẽ lại (nút mở bị thay) — tiêu điểm trả về nút mới ngay dưới
        ve(res);
        [...host.querySelectorAll<HTMLElement>('[data-action="ghi-tay"]')].find((b) => b.dataset.serviceId === d.serviceId)?.focus();
      } catch (err) {
        bang.setBusy(false);
        nutGui.disabled = false;
        nutGui.textContent = "Ghi mức";
        loiMay.textContent = err instanceof ApiError ? err.message : "Không có kết nối mạng — kiểm tra rồi bấm Ghi mức lại.";
        loiMay.hidden = false;
        loiMay.scrollIntoView({ block: "nearest" });
        if (err instanceof ApiError && err.status === 409) void napLai(); // người khác vừa đổi mức / đơn: nạp lại khối phía sau cho khớp sổ
      }
    });
  }

  const r = await doc(v.orderId);
  if (r.kieu === "co") ve(r.res);
  else if (r.kieu === "loi") veLoi(r.message);
  // "an": 404 — khối giữ nguyên trạng thái ẩn, không hiện gì
}
