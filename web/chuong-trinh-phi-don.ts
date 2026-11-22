// Khối «Chương trình miễn phí đưa đón» ở màn «Phí đưa đón» (ADR-0218 Đ2; chỉ ô admin.manage). Danh sách chương trình còn hiệu lực và vừa kết thúc, nút «Kết thúc», biểu mẫu tạo.
// Gọi: GET/POST /api/pricing/chuong-trinh-phi-don, POST …/:id/ket-thuc, GET /api/parties?q= (ô tìm đối tác). Máy chủ hỏi lại mọi cổng. Giao diện không tính tiền. Không innerHTML.
import { ngayDayDu, vnToday } from "../src/shared/vn-date";
import { ApiError, api, type Api } from "./api";
import { hoiXacNhan } from "./bang-truot";
import { h, replaceChildren } from "./dom";
import { hienBaoNgan } from "./toast";

const URL = "/api/pricing/chuong-trinh-phi-don";
const LOI_MANG = "Không kết nối được máy chủ.";
const loiCua = (err: unknown): string => (err instanceof ApiError ? err.message : LOI_MANG);

const nhanPhamVi = (c: Api.ChuongTrinhPhiDonDto): string =>
  c.phamVi === "ALL" ? "Tất cả dịch vụ" : c.phamVi === "SERVICES" ? `${c.dichVu.length} dịch vụ: ${c.dichVu.map((d) => d.name).join(", ")}` : `${c.doiTac.length} đối tác: ${c.doiTac.map((d) => d.name).join(", ")}`;

export async function khoiChuongTrinhPhiDon(el: HTMLElement, dichVu: readonly { code: string; name: string }[]): Promise<void> {
  const loi = h("p", { class: "alert", role: "alert", hidden: true });
  const baoLoi = (cau: string): void => {
    loi.textContent = cau;
    loi.hidden = false;
    loi.scrollIntoView({ block: "nearest" });
  };

  const ve = async (): Promise<void> => {
    let r: Api.ChuongTrinhPhiDonResponse;
    try {
      r = await api<Api.ChuongTrinhPhiDonResponse>(URL);
    } catch (err) {
      baoLoi(loiCua(err));
      return;
    }
    loi.hidden = true;
    const homNay = vnToday(new Date());
    const dong = r.chuongTrinh.map((c) => {
      const daKetThuc = c.ketThucLuc !== null;
      const nut = h("button", { type: "button", class: "pill-btn", hidden: daKetThuc }, "Kết thúc");
      nut.addEventListener("click", async () => {
        const dongY = await hoiXacNhan({
          tieuDe: "Kết thúc chương trình miễn phí đưa đón?",
          hauQua: `Từ lúc kết thúc, đơn chưa xác nhận không còn được miễn phí theo «${c.ten}». Đơn đã xác nhận giữ số đã tính. Không bật lại được; muốn miễn phí tiếp thì tạo chương trình mới.`,
          nhanNguyHiem: "Kết thúc chương trình",
          opener: nut,
        });
        if (!dongY) return;
        nut.disabled = true;
        try {
          await api<Api.ChuongTrinhPhiDonGhiResponse>(`${URL}/${encodeURIComponent(c.id)}/ket-thuc`, { method: "POST", body: {} });
          hienBaoNgan("Đã kết thúc chương trình.");
          await ve();
        } catch (err) {
          baoLoi(loiCua(err));
          await ve();
        }
      });
      return h("div", { class: "khoi dd-cot", "data-chuong-trinh": c.id },
        h("div", null, h("strong", null, c.ten), daKetThuc ? h("span", { class: "muted" }, " · đã kết thúc") : null),
        h("div", { class: "muted" }, `Ngày đi từ ${ngayDayDu(c.tuNgay)} đến ${ngayDayDu(c.denNgay)}${c.tuNgay > homNay ? " (chưa bắt đầu)" : ""} · ${c.gomXeRieng ? "gồm xe riêng" : "không gồm xe riêng"}`),
        h("div", { class: "muted" }, nhanPhamVi(c)),
        nut);
    });
    replaceChildren(
      el,
      h("h2", { id: "ctpd-heading" }, "Chương trình miễn phí đưa đón"),
      h("p", { class: "muted" }, "Đơn chưa xác nhận có ngày đón nằm trong khoảng ngày đi của chương trình thì phí đưa đón là 0 đồng. Đơn đã xác nhận giữ số đã tính. Xe riêng chỉ được miễn khi tích «gồm xe riêng»."),
      loi,
      dong.length === 0 ? h("p", { class: "muted" }, "Chưa có chương trình nào.") : h("div", { class: "dd-cot" }, ...dong),
      formTao(dichVu, baoLoi, ve),
    );
  };
  await ve();
}

function formTao(dichVu: readonly { code: string; name: string }[], baoLoi: (cau: string) => void, lamMoi: () => Promise<void>): HTMLElement {
  const homNay = vnToday(new Date());
  const ten = h("input", { class: "o", type: "text", id: "ctpd-ten", maxlength: 120, autocomplete: "off", "aria-label": "Tên chương trình" });
  const phamVi = h("select", { class: "o", id: "ctpd-pham-vi", "aria-label": "Áp cho" },
    h("option", { value: "ALL" }, "Tất cả dịch vụ"), h("option", { value: "SERVICES" }, "Một số dịch vụ"), h("option", { value: "PARTNERS" }, "Một số đối tác"));
  const tu = h("input", { class: "o", type: "date", id: "ctpd-tu", min: homNay, value: homNay, "aria-label": "Ngày đi từ" });
  const den = h("input", { class: "o", type: "date", id: "ctpd-den", min: homNay, "aria-label": "Ngày đi đến" });
  const xeRieng = h("input", { type: "checkbox", id: "ctpd-xe-rieng" });

  const chonDv = new Set<string>();
  const boLocDv = h("input", { class: "o", type: "search", id: "ctpd-loc-dv", placeholder: "Tìm dịch vụ", autocomplete: "off", "aria-label": "Tìm dịch vụ" });
  const dsDv = h("div", { class: "dd-cot" });
  const veDv = (): void => {
    const t = boLocDv.value.trim().toLowerCase();
    replaceChildren(dsDv, ...dichVu.filter((d) => !t || d.name.toLowerCase().includes(t) || d.code.toLowerCase().includes(t)).slice(0, 60).map((d) => {
      const cb = h("input", { type: "checkbox", checked: chonDv.has(d.code) });
      cb.addEventListener("change", () => (cb.checked ? chonDv.add(d.code) : chonDv.delete(d.code)));
      return h("label", { class: "pd-o" }, cb, " ", d.name);
    }));
  };
  boLocDv.addEventListener("input", veDv);
  veDv();
  const khoiDv = h("div", { id: "ctpd-khoi-dv", hidden: true }, boLocDv, dsDv);

  const chonDt = new Map<string, string>();
  const oTimDt = h("input", { class: "o", type: "search", id: "ctpd-tim-dt", placeholder: "Gõ tên đối tác rồi chọn", autocomplete: "off", "aria-label": "Tìm đối tác" });
  const goiYDt = h("div", { class: "dd-cot" });
  const daChonDt = h("div", { class: "dd-cot", id: "ctpd-da-chon-dt" });
  const veDaChon = (): void => {
    replaceChildren(daChonDt, ...[...chonDt].map(([id, name]) => {
      const bo = h("button", { type: "button", class: "pill-btn" }, `${name} ✕`);
      bo.addEventListener("click", () => { chonDt.delete(id); veDaChon(); });
      return bo;
    }));
  };
  let tre: ReturnType<typeof setTimeout> | undefined;
  oTimDt.addEventListener("input", () => {
    if (tre !== undefined) clearTimeout(tre);
    tre = setTimeout(async () => {
      const q = oTimDt.value.trim();
      if (q.length < 2) return replaceChildren(goiYDt);
      try {
        const rows = (await api<Api.PartyListResponse>(`/api/parties?limit=8&q=${encodeURIComponent(q)}`)).parties;
        replaceChildren(goiYDt, ...rows.map((p) => {
          const nut = h("button", { type: "button", class: "pill-btn" }, p.displayName);
          nut.addEventListener("click", () => { chonDt.set(p.id, p.displayName); veDaChon(); replaceChildren(goiYDt); oTimDt.value = ""; });
          return nut;
        }));
      } catch (err) {
        baoLoi(loiCua(err));
      }
    }, 250);
  });
  const khoiDt = h("div", { id: "ctpd-khoi-dt", hidden: true }, oTimDt, goiYDt, daChonDt);

  phamVi.addEventListener("change", () => {
    khoiDv.hidden = phamVi.value !== "SERVICES";
    khoiDt.hidden = phamVi.value !== "PARTNERS";
  });

  const luu = h("button", { type: "button", class: "nut", "data-cap": "chinh", id: "ctpd-luu" }, "Tạo chương trình");
  luu.addEventListener("click", async () => {
    if (luu.disabled) return;
    if (!ten.value.trim()) return baoLoi("Nhập tên chương trình.");
    if (!tu.value || !den.value) return baoLoi("Chọn khoảng ngày đi.");
    const scope = phamVi.value as Api.ChuongTrinhPhiDonRequest["scope"];
    const body: Api.ChuongTrinhPhiDonRequest = {
      name: ten.value, scope, tripFrom: tu.value, tripTo: den.value, includePrivate: xeRieng.checked,
      ...(scope === "SERVICES" ? { services: [...chonDv] } : {}), ...(scope === "PARTNERS" ? { parties: [...chonDt.keys()] } : {}),
    };
    luu.disabled = true;
    try {
      await api<Api.ChuongTrinhPhiDonGhiResponse>(URL, { method: "POST", body });
      hienBaoNgan("Đã tạo chương trình miễn phí đưa đón.");
      await lamMoi();
    } catch (err) {
      baoLoi(loiCua(err));
      luu.disabled = false;
    }
  });

  return h("div", { class: "khoi dd-cot", id: "ctpd-form" },
    h("strong", null, "Tạo chương trình mới"),
    h("label", { class: "pd-o" }, h("span", { class: "muted" }, "Tên chương trình"), ten),
    h("label", { class: "pd-o" }, h("span", { class: "muted" }, "Áp cho"), phamVi),
    khoiDv, khoiDt,
    h("label", { class: "pd-o" }, h("span", { class: "muted" }, "Ngày đi từ"), tu),
    h("label", { class: "pd-o" }, h("span", { class: "muted" }, "Ngày đi đến"), den),
    h("label", { class: "pd-o" }, xeRieng, " Gồm xe riêng"),
    luu);
}
