// Hộp trượt của trang «Hoa hồng đối tác» (PR 2, đợt 2): Thêm mức, Đổi, Ngừng, Sửa (ADR-0148), Đổi cấp, Áp dụng cấp cho loại, Đặt / Sửa / Ngừng cấp riêng của một đối tác (đặc tả
// hoa-hong-cap-dai-ly Q-8). Mỗi hộp là `moBangTruot`; gửi xong thì đóng hộp, `napLai` vẽ lại trang; lỗi máy chủ (400/409) hiện NGUYÊN câu của máy chủ trong hộp (`.sheet-warn`), hộp
// giữ mở, nút bấm lại được. Hộp cấp riêng: route trả `HoaHongHoSoResponse`, trang vẽ lại cụm đối tác từ phản hồi đó (`ctx.hoSoMoi`) TRƯỚC khi `napLai`.
// Gọi (ghi): POST /api/pricing/hoa-hong, /hoa-hong/:id/doi, /hoa-hong/:id/dong, /hoa-hong/:id/sua, /muc-ta/:code/dong, /muc-ta/gan, /muc-ta/gan/:id/doi, /muc-ta/gan/:id/ket-thuc,
// /muc-ta/gan/:id/sua, /ho-so/:id/muc-rieng, /muc-rieng/:id/sua, /muc-rieng/:id/ket-thuc. Đọc trước khi mở hộp Sửa: GET /hoa-hong/:id/sua, /muc-ta/gan/:id/sua, /muc-rieng/:id/sua
// (đường huỷ–thay hay «từ ngày» do máy chủ quyết, giao diện không đoán). Ô tìm đối tác: GET /nguoi-huong (`taoTimDoiTac`, cổng `coTheTimDoiTac`).
// Trang không tính tiền, không chọn mức: ô đọc bằng src/shared/so-dai-ly-nhap.ts, chữ ở src/shared/hoa-hong-hien-thi.ts; máy chủ kiểm lại tất cả.
import {
  CAU_DA_SUA_CAP_RIENG,
  CAU_DAT_CAP_RIENG,
  CAU_THEO_LOAI_KHACH,
  cauCanhBaoDongRieng,
  cauCanhBaoTheoChinhSach,
  cauCapCuDangKhoa,
  cauCapCuSeNgung,
  CAU_CHON_NGAY_BAT_DAU,
  NHAN_CAP_MOI,
  NHAN_TU_NGAY,
  TIEU_DE_DOI_CAP_RIENG,
  cauDaDatCapRieng,
  cauDaDoiCapRieng,
  cauDaNgungCapRieng,
  cauDoiTuNgayMai,
  cauMucCuSeNgung,
  cauNgungCapRieng,
  cauSeTao,
  cauXemTruocSua,
  chinhSachCuaLoai,
  coTheTimDoiTac,
  ngayDoiSomNhat,
  nhanDoiTuong,
  nhanMucDto,
  nhanPhamVi,
} from "../src/shared/hoa-hong-hien-thi";
import type { PermissionHolder } from "../src/shared/permissions";
import { nhanDong, nhanTyLeBp } from "../src/shared/so-dai-ly-nhan";
import { docLyDoSua, docNgayDong, docThanDoiMuc, docThanDongMucTa, docThanGan, docThanGanRieng, docThanMuc, ngayDongMacDinh, type FormMuc, type LoiO, type PhamViForm } from "../src/shared/so-dai-ly-nhap";
import { ngayDayDu } from "../src/shared/vn-date";
import { api, type Api } from "./api";
import { moBangTruot } from "./bang-truot";
import { h, type Child } from "./dom";
import type { DuLieuHoaHong } from "./hoa-hong";
import { lyDoLoi, taoBangLoi, taoChonDichVu, taoTimDoiTac, type BangLoi } from "./so-dai-ly-ui";

export interface MoHop {
  themMuc(dien?: { ai: { loai: "VAI"; code: string } | { loai: "DOI_TAC"; partyId: string; ten: string } | { loai: "MUC"; code: string } }): void;
  doi(d: Api.CommissionRuleDto): void;
  /** ADR-0148 Đ1: hỏi máy chủ đường Sửa (GET …/sua) rồi mở hộp Sửa điền sẵn mức cũ; lý do bắt buộc. */
  sua(d: Api.CommissionRuleDto): void;
  /** ADR-0148 Đ1: Sửa một lần áp dụng cấp đại lý cho loại (cấp + hai ngày), lý do bắt buộc. */
  suaApDung(gan: Api.GanLoaiMucDto): void;
  /** `moTa` thay câu mô tả mặc định khi không có dòng mức để mô tả (vd ngừng một lần áp dụng cấp đại lý cho loại). */
  ngung(d: Api.CommissionRuleDto, url: string, moTa?: string): void;
  /** Ngừng một lần áp dụng cấp đại lý cho loại (R21): chọn ngày cuối, `POST /api/pricing/muc-ta/gan/:id/ket-thuc`. */
  ngungApDung(gan: Api.GanLoaiMucDto): void;
  doiChinhSach(gan: Api.GanLoaiMucDto): void;
  /** `loaiCode` (nếu có) chọn sẵn loại ở ô «Loại đối tác» — dùng khi bấm từ thẻ «Loại đối tác». */
  apDungChinhSach(muc: Api.MucTaDto, loaiCode?: string): void;
  /** Hộp chỉ hỏi tên → thêm loại đối tác (`POST /api/pricing/loai-doi-tac`). */
  themLoai(): void;
  /** Hộp chỉ hỏi tên → thêm cấp đại lý (`POST /api/pricing/muc-ta`). */
  themChinhSach(): void;
  /** Lệnh một bước không cần hộp (Tắt / Bật): gửi, nạp lại trang; trả câu lỗi nguyên văn của máy chủ, hoặc null nếu xong. */
  guiNhanh(path: string, thongBao: string): Promise<string | null>;
  /** Q-8: đặt cấp riêng cho một đối tác (`POST /api/pricing/ho-so/:id/muc-rieng`). `dien` = đối tác đã chọn sẵn (mở từ cụm của đối tác đó); không có thì tìm theo tên. */
  datCapRieng(dien?: { partyId: string; ten: string }): void;
  /** ADR-0148 Đ1: Sửa một lần gắn cấp riêng (GET rồi POST `/api/pricing/muc-rieng/:id/sua`), lý do bắt buộc. */
  suaCapRieng(g: Api.GanRiengLichSuDto, partyId: string): void;
  /** Ngừng một lần gắn cấp riêng: chọn ngày cuối, `POST /api/pricing/muc-rieng/:id/ket-thuc`. */
  ngungCapRieng(g: Api.GanRiengLichSuDto, partyId: string): void;
  /** ADR-0151: đổi cấp riêng một lô, `POST /api/pricing/muc-rieng/:id/doi` thân { muc, tuNgay }; cấp cũ khoá thì hộp nói trước giới hạn Đ8. */
  doiCapRieng(g: Api.GanRiengLichSuDto, partyId: string): void;
}

export interface NguCanhHop {
  lay(): DuLieuHoaHong;
  napLai(): Promise<void>;
  nguoiDung: PermissionHolder;
  /** Thông báo thành công ở đầu trang (null = xoá). */
  baoOk(text: string | null): void;
  /** Khung vàng giữ sau khi đóng hộp (null = xoá). */
  canhBao(node: HTMLElement | null): void;
  /** Hộp cấp riêng ghi xong: khối «hoa hồng của hồ sơ» máy chủ trả — trang vẽ lại cụm của đối tác đó từ phản hồi này, rồi mới `napLai`. */
  hoSoMoi(partyId: string, r: Api.HoaHongHoSoResponse): void;
}

const MA_NGAY = (s: string): string => ngayDayDu(s);

/** Mở một hộp một-bước: `chuan` đọc ô (hiện lỗi ô nếu sai, trả null), `truocNap` (nếu có) nhận phản hồi ngay sau khi đóng hộp, TRƯỚC `napLai`; `xong` chạy sau khi đã vẽ lại trang. */
function moHop(ctx: NguCanhHop, o: { title: string; body: Child[]; nhan: string; chuan: () => { path: string; body: unknown } | null; truocNap?: (r: unknown) => void; xong: (r: unknown) => void }): void {
  const loiEl = h("p", { class: "sheet-warn", role: "alert", hidden: true });
  const gui = h("button", { type: "button", class: "btn btn-primary" }, o.nhan);
  const huy = h("button", { type: "button", class: "btn" }, "Huỷ");
  const sheet = moBangTruot({ title: o.title, body: [loiEl, ...o.body], foot: [huy, gui], footClass: "loc-foot", opener: document.activeElement instanceof HTMLElement ? document.activeElement : null });
  if (!sheet) return;
  huy.addEventListener("click", () => sheet.close());
  gui.addEventListener("click", async () => {
    if (gui.disabled) return;
    loiEl.hidden = true;
    const req = o.chuan();
    if (req === null) return;
    gui.disabled = true;
    huy.disabled = true;
    sheet.setBusy(true);
    ctx.canhBao(null);
    ctx.baoOk(null);
    try {
      const r = await api<unknown>(req.path, { method: "POST", body: req.body });
      sheet.setBusy(false);
      sheet.close(false);
      try {
        o.truocNap?.(r);
      } catch (e) {
        // Lần ghi đã thành công: lỗi vẽ trước không được hiện như lỗi ghi. `napLai` ngay dưới vẽ lại từ dữ liệu máy chủ.
        console.error(e);
      }
      await ctx.napLai();
      o.xong(r);
    } catch (err) {
      sheet.setBusy(false);
      gui.disabled = false;
      huy.disabled = false;
      loiEl.textContent = lyDoLoi(err); // nguyên câu của máy chủ
      loiEl.hidden = false;
      loiEl.scrollIntoView({ block: "nearest" });
      if (err instanceof Error && "status" in err && (err as { status: number }).status === 409) void ctx.napLai(); // số liệu phía sau hộp đã cũ
    }
  });
}

// ---------------------------------------------------------------------------------------------------------------------------------------------------------
// Khối «Cách tính» + «Hiệu lực» + «Ghi chú» dùng chung cho Thêm mức và Đổi

interface CachTinh {
  readonly root: HTMLElement;
  doc(): { kieu: "RATE" | "PER_PAX"; tyLe: string; moiKhach: string; theoLoai: boolean; treEm: string; nguoiCaoTuoi: string; tuNgay: string; denNgay: string; ghiChu: string };
  /** Gọi khi bất kỳ ô nào đổi. */
  khiDoi(fn: () => void): void;
}

/** `denMacDinh` (hộp Sửa): điền sẵn ngày kết thúc cũ — thiếu nó, sửa riêng con số sẽ lặng lẽ biến dòng có hạn thành không thời hạn. `tuMax`: ngày bắt đầu muộn nhất (Sửa «từ ngày»). */
function dungCachTinh(o: { tienTo: string; loi: BangLoi; homNay: string; tuMacDinh: string; tuMin: string | null; tuMax?: string | null; denMacDinh?: string | null; san: Api.CommissionRuleDto | null }): CachTinh {
  const p = o.tienTo;
  const kieu = h("select", { id: `${p}-kieu`, "aria-label": "Cách tính" }, h("option", { value: "RATE" }, "Phần trăm"), h("option", { value: "PER_PAX" }, "Số tiền mỗi khách"));
  const tyLe = h("input", { id: `${p}-ty-le`, type: "text", inputMode: "decimal", maxLength: 7, placeholder: "12,5", autocomplete: "off" });
  const moiKhach = h("input", { id: `${p}-moi-khach`, type: "text", inputMode: "numeric", maxLength: 12, placeholder: "50.000", autocomplete: "off" });
  const nhanMoiKhach = h("span", null, "Số tiền mỗi khách (đồng)");
  const bat = h("input", { id: `${p}-theo-loai`, type: "checkbox", class: "o-tick" });
  const treEm = h("input", { id: `${p}-tre-em`, type: "text", inputMode: "numeric", maxLength: 12, placeholder: "Bắt buộc", autocomplete: "off" });
  const nguoiCaoTuoi = h("input", { id: `${p}-nguoi-cao-tuoi`, type: "text", inputMode: "numeric", maxLength: 12, placeholder: "Bắt buộc", autocomplete: "off" });
  const khuTyLe = h("label", null, "Phần trăm (%)", tyLe);
  const haiO = h("div", null, h("div", { class: "grid two" }, h("label", null, "Trẻ em (đồng)", treEm), h("label", null, "Người cao tuổi (đồng)", nguoiCaoTuoi)), h("p", { class: "hint" }, CAU_THEO_LOAI_KHACH));
  const khuTien = h("div", null, h("label", null, nhanMoiKhach, moiKhach), h("label", { class: "check" }, bat, "Tách theo loại khách"), haiO);
  const tu = h("input", { id: `${p}-tu-ngay`, type: "date", value: o.tuMacDinh });
  if (o.tuMin !== null) tu.min = o.tuMin;
  if (o.tuMax) tu.max = o.tuMax;
  const denChon = h("select", { id: `${p}-den-chon`, "aria-label": "Đến ngày" }, h("option", { value: "" }, "không thời hạn"), h("option", { value: "NGAY" }, "chọn ngày…"));
  const den = h("input", { id: `${p}-den-ngay`, type: "date", "aria-label": "Ngày cuối hiệu lực", hidden: true });
  if (o.denMacDinh) {
    denChon.value = "NGAY";
    den.value = o.denMacDinh;
  }
  const ghiChu = h("input", { id: `${p}-ghi-chu`, type: "text", maxLength: 200, autocomplete: "off" });

  const ve = (): void => {
    const rate = kieu.value === "RATE";
    khuTyLe.hidden = !rate;
    khuTien.hidden = rate;
    haiO.hidden = !bat.checked;
    nhanMoiKhach.textContent = bat.checked ? "Người lớn (đồng)" : "Số tiền mỗi khách (đồng)";
    den.hidden = denChon.value !== "NGAY";
  };
  if (o.san) {
    kieu.value = o.san.kieu;
    if (o.san.kieu === "RATE") tyLe.value = nhanTyLeBp(o.san.tyLeBp ?? 0).replace("%", "");
    else {
      moiKhach.value = nhanDong(o.san.moiKhach ?? 0);
      if (o.san.theoLoai) {
        bat.checked = true;
        treEm.value = nhanDong(o.san.theoLoai.treEm);
        nguoiCaoTuoi.value = nhanDong(o.san.theoLoai.nguoiCaoTuoi);
      }
    }
    ghiChu.value = o.san.ghiChu ?? "";
  }
  for (const e of [kieu, bat, denChon]) e.addEventListener("change", ve);
  ve();

  const root = h(
    "div",
    { class: "hh-hop-khoi" },
    h("div", null, h("label", null, "Cách tính", kieu), khuTyLe, khuTien, o.loi.dong("muc")),
    h(
      "fieldset",
      { class: "hh-nhom" },
      h("legend", null, "Thời gian áp dụng"),
      h("div", { class: "grid two" }, h("div", null, h("label", null, "Từ ngày", tu), o.loi.dong("tuNgay")), h("div", null, h("label", null, "Đến ngày", denChon), den, o.loi.dong("denNgay"))),
    ),
    h("div", null, h("label", null, "Ghi chú (không bắt buộc)", ghiChu), o.loi.dong("ghiChu")),
  );
  return {
    root,
    doc: () => ({
      kieu: kieu.value === "PER_PAX" ? "PER_PAX" : "RATE",
      tyLe: tyLe.value,
      moiKhach: moiKhach.value,
      theoLoai: bat.checked,
      treEm: treEm.value,
      nguoiCaoTuoi: nguoiCaoTuoi.value,
      tuNgay: tu.value,
      denNgay: denChon.value === "NGAY" ? den.value : "",
      ghiChu: ghiChu.value,
    }),
    khiDoi(fn) {
      root.addEventListener("input", fn);
      root.addEventListener("change", fn);
    },
  };
}

// ---------------------------------------------------------------------------------------------------------------------------------------------------------

/** Khung vàng sau khi áp dụng cấp đại lý mà máy chủ báo còn mức riêng thắng (`dongRieng`). */
function khungDongRieng(r: Api.GanLoaiMucResponse, d: DuLieuHoaHong): HTMLElement {
  return h(
    "div",
    { class: "sheet-warn", role: "status" },
    h("div", null, h("p", null, h("strong", null, cauCanhBaoDongRieng(r.gan.loai.ten, r.gan.muc.ten, r.dongRieng.length))), h("ul", { class: "hh-mucta-dong-rieng" }, ...r.dongRieng.map((x) => h("li", null, `${nhanDoiTuong(x.doiTuong).ten} · ${nhanPhamVi(x, d.ten)} · ${nhanMucDto(x)}`))), h("p", null, "Ngừng các mức riêng đó ở thẻ «Loại đối tác».")),
  );
}

export function taoMoHop(ctx: NguCanhHop): MoHop {
  const duocTimTen = coTheTimDoiTac(ctx.nguoiDung);

  function themMuc(dien?: Parameters<MoHop["themMuc"]>[0]): void {
    const d = ctx.lay();
    const loi = taoBangLoi();
    const dich = dien?.ai;
    const laMuc = dich?.loai === "MUC";
    // ---- Ai được hưởng
    let ai: HTMLElement;
    let docAi: () => FormMuc["doiTuong"] = () => null;
    let tenAi: () => string = () => "";
    let tuLoai: () => string | null = () => null;
    if (dich?.loai === "MUC") {
      const tenMuc = d.mucTa.muc.find((m) => m.code === dich.code)?.ten ?? "";
      ai = h("p", null, h("strong", null, `Cấp ${tenMuc}`));
      tenAi = () => `Cấp ${tenMuc}`;
    } else {
      const loaiVai = h("input", { type: "radio", class: "o-tick", name: "hh-hop-ai", value: "VAI", checked: dich?.loai !== "DOI_TAC" });
      const loaiDt = h("input", { type: "radio", class: "o-tick", name: "hh-hop-ai", value: "DOI_TAC", checked: dich?.loai === "DOI_TAC" });
      const vai = h("select", { id: "hh-hop-vai", "aria-label": "Loại đối tác" }, h("option", { value: "" }, "— Chọn loại đối tác —"), ...d.vai.map((v) => h("option", { value: v.code }, v.ten)));
      if (dich?.loai === "VAI") vai.value = dich.code;
      const tim = taoTimDoiTac({ choPhep: true, id: "hh-hop-doi-tac" });
      if (dich?.loai === "DOI_TAC") tim.datChon({ partyId: dich.partyId, ten: dich.ten });
      const khuVai = h("div", null, vai);
      const khuDt = h("div", null, tim.root);
      const veAi = (): void => {
        khuVai.hidden = !loaiVai.checked;
        khuDt.hidden = !loaiDt.checked;
      };
      loaiVai.addEventListener("change", veAi);
      loaiDt.addEventListener("change", veAi);
      veAi();
      ai = h(
        "div",
        null,
        duocTimTen && h("div", { class: "hh-radio" }, h("label", { class: "check" }, loaiVai, "Loại đối tác"), h("label", { class: "check" }, loaiDt, "Một đối tác")),
        khuVai,
        duocTimTen && khuDt,
      );
      docAi = () => (loaiDt.checked && duocTimTen ? { loai: "DOI_TAC", partyId: tim.chon()?.partyId ?? "" } : { loai: "VAI", code: vai.value });
      tenAi = () => (loaiDt.checked && duocTimTen ? (tim.chon()?.ten ?? "") : (d.vai.find((v) => v.code === vai.value)?.ten ?? ""));
      tuLoai = () => (loaiDt.checked && duocTimTen ? null : vai.value || null);
      tim.khiDoi(() => {
        loi.xoa();
        veCau();
      });
    }
    // ---- Dịch vụ
    const pv = h("select", { id: "hh-hop-pham-vi", "aria-label": "Dịch vụ" }, h("option", { value: "ALL" }, "Tất cả dịch vụ"), h("option", { value: "GROUP" }, "Một nhóm"), h("option", { value: "SERVICE" }, "Một dịch vụ"));
    pv.value = "SERVICE";
    const nhom = h("select", { id: "hh-hop-nhom", "aria-label": "Nhóm dịch vụ" }, h("option", { value: "" }, "— Chọn nhóm —"), ...d.dm.nhom.map((g) => h("option", { value: g.code }, g.name)));
    const dv = taoChonDichVu(d.dm, "hh-hop-dich-vu");
    const khuNhom = h("div", null, nhom);
    const khuDv = h("div", null, dv.root);
    const vePv = (): void => {
      khuNhom.hidden = pv.value !== "GROUP";
      khuDv.hidden = pv.value !== "SERVICE";
    };
    pv.addEventListener("change", vePv);
    vePv();
    const dichVu = h("div", { class: "hh-pham-vi" }, h("label", null, "Dịch vụ", pv), khuNhom, khuDv, loi.dong("phamVi"));

    const ct = dungCachTinh({ tienTo: "hh-hop", loi, homNay: d.homNay, tuMacDinh: d.homNay, tuMin: null, san: null });
    const cau = h("p", { class: "hint", "aria-live": "polite", hidden: true });
    const canh = h("p", { class: "sheet-warn", hidden: true });

    const docDichVu = (): { phamVi: PhamViForm; catalogCode: string; groupCode: string } => ({ phamVi: pv.value as PhamViForm, catalogCode: pv.value === "SERVICE" ? dv.ma() : "", groupCode: pv.value === "GROUP" ? nhom.value : "" });
    const docThan = (): ReturnType<typeof docThanMuc> | ReturnType<typeof docThanDongMucTa> => {
      const f = { ...docDichVu(), ...ct.doc() };
      return dich?.loai === "MUC" ? docThanDongMucTa(f) : docThanMuc({ doiTuong: docAi(), ...f });
    };
    const veCau = (): void => {
      const kq = docThan();
      if (kq.ok) {
        const b = kq.body;
        const muc = nhanMucDto({ kieu: b.kieu, tyLeBp: "tyLeBp" in b ? b.tyLeBp : null, moiKhach: "moiKhach" in b ? b.moiKhach : null, theoLoai: "theoLoai" in b && b.theoLoai ? { nguoiLon: "moiKhach" in b ? b.moiKhach : 0, treEm: b.theoLoai.treEm, nguoiCaoTuoi: b.theoLoai.nguoiCaoTuoi } : null });
        cau.textContent = cauSeTao({ ai: tenAi(), dichVu: nhanPhamVi({ phamVi: b.phamVi, catalogCode: b.catalogCode ?? null, groupCode: b.groupCode ?? null }, d.ten), muc, tu: b.tuNgay, den: b.denNgay ?? null });
        cau.hidden = false;
      } else cau.hidden = true;
      const code = tuLoai();
      const cs = code === null ? null : chinhSachCuaLoai(ctx.lay().mucTa, code);
      canh.textContent = cs ? cauCanhBaoTheoChinhSach(cs.muc.ten) : "";
      canh.hidden = cs === null;
    };
    moHop(ctx, {
      title: laMuc ? "Thêm hoa hồng cho dịch vụ" : "Thêm mức hoa hồng",
      body: [
        h("fieldset", { class: "hh-nhom" }, h("legend", null, "Ai được hưởng"), ai, loi.dong("doiTuong")),
        dichVu,
        ct.root,
        cau,
        canh,
      ],
      nhan: "Thêm mức",
      chuan() {
        const kq = docThan();
        if (!kq.ok) {
          loi.hien(kq.loi);
          return null;
        }
        loi.xoa();
        const path = dich?.loai === "MUC" ? `/api/pricing/muc-ta/${encodeURIComponent(dich.code)}/dong` : "/api/pricing/hoa-hong";
        return { path, body: kq.body };
      },
      xong: () => ctx.baoOk("Đã thêm mức."),
    });
    // Câu «Sẽ tạo» và cảnh báo cấp đại lý cập nhật theo mọi thay đổi ở ba khối ô.
    for (const k of [ai, dichVu, ct.root]) {
      k.addEventListener("input", veCau);
      k.addEventListener("change", veCau);
    }
    veCau();
  }

  function doi(dong: Api.CommissionRuleDto): void {
    const d = ctx.lay();
    const loi = taoBangLoi();
    const tuSom = ngayDoiSomNhat(dong.tuNgay, d.homNay); // mức cũ bắt đầu hôm nay ⇒ ngày mai (chủ dự án 28/10)
    const ct = dungCachTinh({ tienTo: "hh-doi", loi, homNay: d.homNay, tuMacDinh: tuSom, tuMin: tuSom, san: dong });
    const mucCu = nhanMucDto(dong);
    const cauCu = h("p", { class: "hint", "aria-live": "polite" }, cauMucCuSeNgung(mucCu, tuSom));
    const cauMai = cauDoiTuNgayMai(dong.tuNgay, d.homNay);
    ct.khiDoi(() => {
      const tu = ct.doc().tuNgay;
      cauCu.textContent = /^\d{4}-\d{2}-\d{2}$/.test(tu) ? cauMucCuSeNgung(mucCu, tu) : "";
    });
    const ten = nhanDoiTuong(dong.doiTuong);
    moHop(ctx, {
      title: "Đổi mức",
      body: [
        h("p", null, h("span", { class: "hh-nhan-nho" }, "Ai được hưởng"), h("strong", null, ten.ten), " ", h("span", { class: "muted" }, ten.loai)),
        h("p", null, h("span", { class: "hh-nhan-nho" }, "Dịch vụ"), h("strong", null, nhanPhamVi(dong, d.ten))),
        ct.root,
        cauCu,
        ...(cauMai ? [h("p", { class: "hint" }, cauMai)] : []),
      ],
      nhan: "Đổi mức",
      chuan() {
        const kq = docThanDoiMuc(ct.doc());
        if (!kq.ok) {
          loi.hien(kq.loi);
          return null;
        }
        loi.xoa();
        return { path: `/api/pricing/hoa-hong/${encodeURIComponent(dong.id)}/doi`, body: kq.body };
      },
      xong: () => ctx.baoOk("Đã đổi mức."),
    });
  }

  /** GET xem trước của Sửa; lỗi (400 đã huỷ / hết hạn, 403, 503) hiện nguyên câu máy chủ ở khung vàng đầu trang, không mở hộp. */
  async function xemTruocSua(url: string): Promise<Api.SuaXemTruocResponse | null> {
    ctx.baoOk(null);
    ctx.canhBao(null);
    try {
      return await api<Api.SuaXemTruocResponse>(url);
    } catch (err) {
      ctx.canhBao(h("p", { class: "sheet-warn", role: "alert" }, lyDoLoi(err)));
      return null;
    }
  }
  /** Ô «Lý do sửa» (bắt buộc, 10–300 ký tự — `docLyDoSua`, cùng luật với máy chủ). */
  const oLyDo = (id: string, loi: BangLoi): { root: HTMLElement; doc: () => ReturnType<typeof docLyDoSua> } => {
    const o = h("input", { id, type: "text", maxLength: 300, autocomplete: "off", required: true });
    return { root: h("div", null, h("label", null, "Lý do sửa (bắt buộc)", o), loi.dong("lyDo")), doc: () => docLyDoSua(o.value) };
  };

  async function sua(dong: Api.CommissionRuleDto): Promise<void> {
    const url = `/api/pricing/hoa-hong/${encodeURIComponent(dong.id)}/sua`;
    const xt = await xemTruocSua(url);
    if (!xt) return;
    const d = ctx.lay();
    const loi = taoBangLoi();
    const tuNgay = xt.duong === "HUY_THAY" ? dong.tuNgay : xt.tuNgaySomNhat; // huỷ–thay: giữ được ngày bắt đầu cũ (Q5)
    const ct = dungCachTinh({ tienTo: "hh-sua", loi, homNay: d.homNay, tuMacDinh: tuNgay, tuMin: xt.duong === "TU_NGAY" ? xt.tuNgaySomNhat : null, tuMax: xt.duong === "TU_NGAY" ? xt.denNgayToiDa : null,
      denMacDinh: dong.denNgay, san: dong });
    const mucCu = nhanMucDto(dong);
    const cauCu = h("p", { class: "hint", "aria-live": "polite", hidden: xt.duong === "HUY_THAY" }, xt.duong === "TU_NGAY" ? cauMucCuSeNgung(mucCu, tuNgay) : "");
    if (xt.duong === "TU_NGAY") {
      ct.khiDoi(() => {
        const tu = ct.doc().tuNgay;
        cauCu.textContent = /^\d{4}-\d{2}-\d{2}$/.test(tu) ? cauMucCuSeNgung(mucCu, tu) : "";
      });
    }
    const lyDo = oLyDo("hh-sua-ly-do", loi);
    const ten = nhanDoiTuong(dong.doiTuong);
    moHop(ctx, {
      title: "Sửa mức",
      body: [
        h("p", { class: "hint", role: "status" }, h("strong", null, cauXemTruocSua(xt))),
        h("p", null, h("span", { class: "hh-nhan-nho" }, "Ai được hưởng"), h("strong", null, ten.ten), " ", h("span", { class: "muted" }, ten.loai)),
        h("p", null, h("span", { class: "hh-nhan-nho" }, "Dịch vụ"), h("strong", null, nhanPhamVi(dong, d.ten))),
        ct.root,
        cauCu,
        lyDo.root,
      ],
      nhan: "Lưu sửa",
      chuan() {
        const kq = docThanDoiMuc(ct.doc());
        const ld = lyDo.doc();
        if (!kq.ok || !ld.ok) {
          loi.hien([...(kq.ok ? [] : kq.loi), ...(ld.ok ? [] : [{ truong: "lyDo", message: ld.message } satisfies LoiO])]);
          return null;
        }
        loi.xoa();
        return { path: url, body: { ...kq.body, lyDo: ld.value } };
      },
      xong: () => ctx.baoOk("Đã sửa mức."),
    });
  }

  async function suaApDung(gan: Api.GanLoaiMucDto): Promise<void> {
    const url = `/api/pricing/muc-ta/gan/${encodeURIComponent(gan.id)}/sua`;
    const xt = await xemTruocSua(url);
    if (!xt) return;
    const d = ctx.lay();
    const loi = taoBangLoi();
    const chon = h("select", { id: "hh-sua-gan-muc", "aria-label": "Cấp đại lý" }, h("option", { value: "" }, "— Chọn cấp đại lý —"), ...d.mucTa.muc.filter((m) => m.dangBat).map((m) => h("option", { value: m.code }, m.ten)));
    chon.value = d.mucTa.muc.some((m) => m.dangBat && m.code === gan.muc.code) ? gan.muc.code : "";
    const tu = h("input", { id: "hh-sua-gan-tu", type: "date", value: xt.duong === "HUY_THAY" ? gan.tuNgay : xt.tuNgaySomNhat });
    if (xt.duong === "TU_NGAY") {
      tu.min = xt.tuNgaySomNhat;
      if (xt.denNgayToiDa) tu.max = xt.denNgayToiDa;
    }
    const denChon = h("select", { id: "hh-sua-gan-den-chon", "aria-label": "Đến ngày" }, h("option", { value: "" }, "không thời hạn"), h("option", { value: "NGAY" }, "chọn ngày…"));
    const den = h("input", { id: "hh-sua-gan-den", type: "date", "aria-label": "Ngày cuối hiệu lực", value: gan.denNgay ?? "", hidden: gan.denNgay === null });
    denChon.value = gan.denNgay === null ? "" : "NGAY";
    denChon.addEventListener("change", () => (den.hidden = denChon.value !== "NGAY"));
    const lyDo = oLyDo("hh-sua-gan-ly-do", loi);
    moHop(ctx, {
      title: "Sửa áp dụng cấp",
      body: [
        h("p", { class: "hint", role: "status" }, h("strong", null, cauXemTruocSua(xt, "cấp đại lý này"))),
        h("p", null, h("span", { class: "hh-nhan-nho" }, "Loại đối tác"), h("strong", null, gan.loai.ten)),
        h("div", null, h("label", null, "Cấp đại lý", chon), loi.dong("mucTa")),
        h("fieldset", { class: "hh-nhom" }, h("legend", null, "Thời gian áp dụng"),
          h("div", { class: "grid two" }, h("div", null, h("label", null, "Từ ngày", tu), loi.dong("tuNgay")), h("div", null, h("label", null, "Đến ngày", denChon), den, loi.dong("denNgay")))),
        lyDo.root,
      ],
      nhan: "Lưu sửa",
      chuan() {
        const kq = docThanGan({ loai: gan.loai.code, muc: chon.value, tuNgay: tu.value, denNgay: denChon.value === "NGAY" ? den.value : "" });
        const ld = lyDo.doc();
        if (!kq.ok || !ld.ok) {
          loi.hien([...(kq.ok ? [] : kq.loi), ...(ld.ok ? [] : [{ truong: "lyDo", message: ld.message } satisfies LoiO])]);
          return null;
        }
        loi.xoa();
        const { loai: _loai, ...than } = kq.body; // đích (loại) giữ nguyên — máy chủ đọc từ dòng cũ
        return { path: url, body: { ...than, lyDo: ld.value } };
      },
      xong: (r) => {
        const x = r as Api.SuaGanLoaiResponse;
        if (x.dongRieng.length > 0) ctx.canhBao(khungDongRieng({ gan: x.moi, dongRieng: x.dongRieng }, ctx.lay()));
        else ctx.baoOk(`Đã sửa: loại «${x.moi.loai.ten}» theo cấp «${x.moi.muc.ten}» từ ngày ${MA_NGAY(x.moi.tuNgay)}.`);
      },
    });
  }

  /** Hộp «chọn ngày cuối hiệu lực» dùng chung cho Ngừng một mức và Ngừng áp dụng một cấp đại lý. */
  function hopNgay(o: { tuNgay: string; moTa: string; url: string; title: string; nhan: string; daXong: string; truocNap?: (r: unknown) => void }): void {
    const d = ctx.lay();
    const ngay = h("input", { id: "hh-ngung-ngay", type: "date", value: ngayDongMacDinh(d.homNay, o.tuNgay), min: o.tuNgay });
    const loi = h("p", { class: "field-error", role: "alert", hidden: true });
    moHop(ctx, {
      title: o.title,
      body: [h("p", null, h("strong", null, o.moTa)), h("label", null, "Ngày cuối hiệu lực", ngay), loi],
      nhan: o.nhan,
      chuan() {
        const kq = docNgayDong(ngay.value, o.tuNgay);
        if (!kq.ok) {
          loi.textContent = kq.message;
          loi.hidden = false;
          return null;
        }
        loi.hidden = true;
        return { path: o.url, body: kq.body };
      },
      truocNap: o.truocNap,
      xong: () => ctx.baoOk(o.daXong),
    });
  }

  function ngung(dong: Api.CommissionRuleDto, url: string, moTa?: string): void {
    const ten = nhanDoiTuong(dong.doiTuong);
    hopNgay({ tuNgay: dong.tuNgay, moTa: moTa ?? `Ngừng mức: ${ten.ten} · ${nhanPhamVi(dong, ctx.lay().ten)} · ${nhanMucDto(dong)}`, url, title: "Ngừng", nhan: "Ngừng", daXong: "Đã ngừng." });
  }

  function ngungApDung(gan: Api.GanLoaiMucDto): void {
    hopNgay({
      tuNgay: gan.tuNgay,
      moTa: `Loại «${gan.loai.ten}» thôi theo cấp «${gan.muc.ten}» đến hết ngày:`,
      url: `/api/pricing/muc-ta/gan/${encodeURIComponent(gan.id)}/ket-thuc`,
      title: "Thôi theo cấp này",
      nhan: "Lưu",
      daXong: `Loại «${gan.loai.ten}» đã thôi theo cấp «${gan.muc.ten}».`,
    });
  }

  function doiChinhSach(gan: Api.GanLoaiMucDto): void {
    const d = ctx.lay();
    const chon = h("select", { id: "hh-dcs-muc", "aria-label": "Cấp đại lý" }, h("option", { value: "" }, "— Chọn cấp đại lý —"), ...d.mucTa.muc.filter((m) => m.dangBat && m.code !== gan.muc.code).map((m) => h("option", { value: m.code }, m.ten)));
    const tu = h("input", { id: "hh-dcs-tu", type: "date", value: d.homNay, min: d.homNay });
    const loi = h("p", { class: "field-error", role: "alert", hidden: true });
    const cauCu = (t: string): string => cauCapCuSeNgung(gan.muc.ten, t);
    const dong = h("p", { class: "hint", "aria-live": "polite" }, cauCu(d.homNay));
    tu.addEventListener("input", () => (dong.textContent = cauCu(tu.value)));
    moHop(ctx, {
      title: "Đổi cấp",
      body: [h("p", null, h("span", { class: "hh-nhan-nho" }, "Loại đối tác"), h("strong", null, gan.loai.ten)), h("label", null, NHAN_CAP_MOI, chon), h("label", null, NHAN_TU_NGAY, tu), dong, loi],
      nhan: "Lưu",
      chuan() {
        if (chon.value === "" || !/^\d{4}-\d{2}-\d{2}$/.test(tu.value)) {
          loi.textContent = chon.value === "" ? "Chọn cấp đại lý." : CAU_CHON_NGAY_BAT_DAU;
          loi.hidden = false;
          return null;
        }
        loi.hidden = true;
        return { path: `/api/pricing/muc-ta/gan/${encodeURIComponent(gan.id)}/doi`, body: { muc: chon.value, tuNgay: tu.value } };
      },
      xong: (r) => ketQuaGan(r as Api.GanLoaiMucResponse),
    });
  }

  function apDungChinhSach(muc: Api.MucTaDto, loaiCode?: string): void {
    const d = ctx.lay();
    const loai = h("select", { id: "hh-adcs-loai", "aria-label": "Loại đối tác" }, h("option", { value: "" }, "— Chọn loại đối tác —"), ...d.mucTa.loai.map((l) => h("option", { value: l.code }, l.ten)));
    if (loaiCode !== undefined && d.mucTa.loai.some((l) => l.code === loaiCode)) loai.value = loaiCode;
    const tu = h("input", { id: "hh-adcs-tu", type: "date", value: d.homNay });
    const loi = h("p", { class: "field-error", role: "alert", hidden: true });
    moHop(ctx, {
      title: loaiCode === undefined ? "Thêm loại vào cấp" : "Chọn cấp cho loại",
      body: [h("p", null, h("span", { class: "hh-nhan-nho" }, "Cấp đại lý"), h("strong", null, muc.ten)), h("label", null, "Loại đối tác", loai), h("label", null, "Từ ngày", tu), loi],
      nhan: "Lưu",
      chuan() {
        const kq = docThanGan({ loai: loai.value, muc: muc.code, tuNgay: tu.value, denNgay: "" });
        if (!kq.ok) {
          loi.textContent = kq.loi.map((x) => x.message).join(" ");
          loi.hidden = false;
          return null;
        }
        loi.hidden = true;
        return { path: "/api/pricing/muc-ta/gan", body: kq.body };
      },
      xong: (r) => ketQuaGan(r as Api.GanLoaiMucResponse),
    });
  }

  // ---- Cấp riêng của một đối tác (Q-8, §3.1 hàng «Cấp riêng của đối tác»). Ô cấp chỉ liệt kê cấp đang mở (§3.1 «Cấp đang khoá»).
  const tenDoiTac = (partyId: string): string => {
    const d = ctx.lay();
    return d.mucTa.ganRieng.find((g) => g.partyId === partyId)?.ten ?? d.dong.find((r) => r.doiTuong.loai === "DOI_TAC" && r.doiTuong.partyId === partyId)?.doiTuong.ten ?? "";
  };
  const oCapMo = (id: string, chonSan: string): HTMLSelectElement => {
    const mo = ctx.lay().mucTa.muc.filter((m) => m.dangBat);
    const s = h("select", { id, "aria-label": "Cấp đại lý" }, h("option", { value: "" }, "— Chọn cấp đại lý —"), ...mo.map((m) => h("option", { value: m.code }, m.ten)));
    s.value = mo.some((m) => m.code === chonSan) ? chonSan : "";
    return s;
  };
  /** Hai ô «Từ» / «Đến» (không thời hạn hoặc chọn ngày) dùng chung cho Đặt và Sửa cấp riêng. */
  const oHieuLuc = (p: string, loi: BangLoi, tuMacDinh: string, denMacDinh: string | null): { root: HTMLElement; tu: HTMLInputElement; den: () => string } => {
    const tu = h("input", { id: `${p}-tu`, type: "date", value: tuMacDinh });
    const denChon = h("select", { id: `${p}-den-chon`, "aria-label": "Đến ngày" }, h("option", { value: "" }, "không thời hạn"), h("option", { value: "NGAY" }, "chọn ngày…"));
    const den = h("input", { id: `${p}-den`, type: "date", "aria-label": "Ngày cuối hiệu lực", value: denMacDinh ?? "", hidden: denMacDinh === null });
    denChon.value = denMacDinh === null ? "" : "NGAY";
    denChon.addEventListener("change", () => (den.hidden = denChon.value !== "NGAY"));
    const root = h("fieldset", { class: "hh-nhom" }, h("legend", null, "Thời gian áp dụng"),
      h("div", { class: "grid two" }, h("div", null, h("label", null, "Từ ngày", tu), loi.dong("tuNgay")), h("div", null, h("label", null, "Đến ngày", denChon), den, loi.dong("denNgay"))));
    return { root, tu, den: () => (denChon.value === "NGAY" ? den.value : "") };
  };

  function datCapRieng(dien?: { partyId: string; ten: string }): void {
    const d = ctx.lay();
    const loi = taoBangLoi();
    const tim = dien ? null : taoTimDoiTac({ choPhep: duocTimTen, id: "hh-dcr-doi-tac" });
    tim?.khiDoi(() => loi.xoa());
    const doc = (): { partyId: string; ten: string } => dien ?? { partyId: tim?.chon()?.partyId ?? "", ten: tim?.chon()?.ten ?? "" };
    const cap = oCapMo("hh-dcr-muc", "");
    const hl = oHieuLuc("hh-dcr", loi, d.homNay, null);
    let gui = "";
    moHop(ctx, {
      title: "Chọn cấp riêng cho đối tác",
      body: [
        dien
          ? h("p", null, h("span", { class: "hh-nhan-nho" }, "Đối tác"), h("strong", null, dien.ten))
          : h("fieldset", { class: "hh-nhom" }, h("legend", null, "Đối tác"), tim!.root, loi.dong("doiTuong")),
        h("div", null, h("label", null, "Cấp đại lý", cap), loi.dong("mucTa")),
        hl.root,
        h("p", { class: "hint" }, CAU_DAT_CAP_RIENG),
      ],
      nhan: "Lưu",
      chuan() {
        const dt = doc();
        const kq = docThanGanRieng({ partyId: dt.partyId, muc: cap.value, tuNgay: hl.tu.value, denNgay: hl.den() });
        if (!kq.ok) {
          loi.hien(kq.loi);
          return null;
        }
        loi.xoa();
        gui = dt.partyId;
        return { path: `/api/pricing/ho-so/${encodeURIComponent(dt.partyId)}/muc-rieng`, body: kq.body };
      },
      truocNap: (r) => ctx.hoSoMoi(gui, r as Api.HoaHongHoSoResponse),
      xong: () => {
        const tenCap = cap.selectedOptions[0]?.textContent ?? "";
        ctx.baoOk(cauDaDatCapRieng(tenCap, doc().ten, hl.tu.value));
      },
    });
  }

  async function suaCapRieng(g: Api.GanRiengLichSuDto, partyId: string): Promise<void> {
    const url = `/api/pricing/muc-rieng/${encodeURIComponent(g.id)}/sua`;
    const xt = await xemTruocSua(url);
    if (!xt) return;
    const loi = taoBangLoi();
    const cap = oCapMo("hh-scr-muc", g.muc.code);
    const hl = oHieuLuc("hh-scr", loi, xt.duong === "HUY_THAY" ? g.tuNgay : xt.tuNgaySomNhat, g.denNgay);
    if (xt.duong === "TU_NGAY") {
      hl.tu.min = xt.tuNgaySomNhat;
      if (xt.denNgayToiDa) hl.tu.max = xt.denNgayToiDa;
    }
    const lyDo = oLyDo("hh-scr-ly-do", loi);
    moHop(ctx, {
      title: "Sửa cấp riêng",
      body: [
        h("p", { class: "hint", role: "status" }, h("strong", null, cauXemTruocSua(xt, "cấp riêng này"))),
        h("p", null, h("span", { class: "hh-nhan-nho" }, "Đối tác"), h("strong", null, tenDoiTac(partyId))),
        h("div", null, h("label", null, "Cấp đại lý", cap), loi.dong("mucTa")),
        hl.root,
        lyDo.root,
      ],
      nhan: "Lưu sửa",
      chuan() {
        const kq = docThanGanRieng({ partyId, muc: cap.value, tuNgay: hl.tu.value, denNgay: hl.den() });
        const ld = lyDo.doc();
        if (!kq.ok || !ld.ok) {
          loi.hien([...(kq.ok ? [] : kq.loi), ...(ld.ok ? [] : [{ truong: "lyDo", message: ld.message } satisfies LoiO])]);
          return null;
        }
        loi.xoa();
        return { path: url, body: { ...kq.body, lyDo: ld.value } };
      },
      truocNap: (r) => ctx.hoSoMoi(partyId, r as Api.HoaHongHoSoResponse),
      xong: () => ctx.baoOk(CAU_DA_SUA_CAP_RIENG),
    });
  }

  function ngungCapRieng(g: Api.GanRiengLichSuDto, partyId: string): void {
    const ten = tenDoiTac(partyId);
    hopNgay({
      tuNgay: g.tuNgay,
      moTa: cauNgungCapRieng(g.muc.ten, ten),
      url: `/api/pricing/muc-rieng/${encodeURIComponent(g.id)}/ket-thuc`,
      title: "Ngừng áp dụng",
      nhan: "Ngừng áp dụng",
      daXong: cauDaNgungCapRieng(g.muc.ten, ten),
      truocNap: (r) => ctx.hoSoMoi(partyId, r as Api.HoaHongHoSoResponse),
    });
  }

  function doiCapRieng(g: Api.GanRiengLichSuDto, partyId: string): void {
    const d = ctx.lay();
    const ten = tenDoiTac(partyId);
    const tuSom = ngayDoiSomNhat(g.tuNgay, d.homNay);
    const chon = h("select", { id: "hh-dcr2-muc", "aria-label": NHAN_CAP_MOI }, h("option", { value: "" }, "— Chọn cấp đại lý —"), ...d.mucTa.muc.filter((m) => m.dangBat && m.code !== g.muc.code).map((m) => h("option", { value: m.code }, m.ten)));
    const tu = h("input", { id: "hh-dcr2-tu", type: "date", value: tuSom, min: tuSom });
    const loi = h("p", { class: "field-error", role: "alert", hidden: true });
    const cauCu = (t: string): string => cauCapCuSeNgung(g.muc.ten, t);
    const dong = h("p", { class: "hint", "aria-live": "polite" }, cauCu(tuSom));
    tu.addEventListener("input", () => (dong.textContent = cauCu(tu.value)));
    const cauMai = cauDoiTuNgayMai(g.tuNgay, d.homNay);
    moHop(ctx, {
      title: TIEU_DE_DOI_CAP_RIENG,
      body: [
        h("p", null, h("span", { class: "hh-nhan-nho" }, "Đối tác"), h("strong", null, ten)),
        ...(g.muc.dangBat ? [] : [h("p", { class: "hint", role: "status" }, h("strong", null, cauCapCuDangKhoa(g.muc.ten)))]),
        h("label", null, NHAN_CAP_MOI, chon),
        h("label", null, NHAN_TU_NGAY, tu),
        dong,
        ...(cauMai ? [h("p", { class: "hint" }, cauMai)] : []),
        loi,
      ],
      nhan: "Lưu",
      chuan() {
        if (chon.value === "" || !/^\d{4}-\d{2}-\d{2}$/.test(tu.value)) {
          loi.textContent = chon.value === "" ? "Chọn cấp đại lý." : CAU_CHON_NGAY_BAT_DAU;
          loi.hidden = false;
          return null;
        }
        loi.hidden = true;
        return { path: `/api/pricing/muc-rieng/${encodeURIComponent(g.id)}/doi`, body: { muc: chon.value, tuNgay: tu.value } };
      },
      truocNap: (r) => ctx.hoSoMoi(partyId, r as Api.HoaHongHoSoResponse),
      xong: () => ctx.baoOk(cauDaDoiCapRieng(chon.selectedOptions[0]?.textContent ?? "", ten, tu.value)),
    });
  }

  function hoiTen(o: { title: string; nhan: string; nhanO: string; path: string; xong: string }): void {
    const ten = h("input", { id: "hh-hoi-ten", type: "text", maxLength: 80, autocomplete: "off" });
    const loi = h("p", { class: "field-error", role: "alert", hidden: true });
    moHop(ctx, {
      title: o.title,
      body: [h("label", null, o.nhanO, ten), loi],
      nhan: o.nhan,
      chuan() {
        if (ten.value.trim() === "") {
          loi.textContent = "Nhập tên.";
          loi.hidden = false;
          return null;
        }
        loi.hidden = true;
        return { path: o.path, body: { ten: ten.value } };
      },
      xong: () => ctx.baoOk(o.xong),
    });
  }
  const themLoai = (): void => hoiTen({ title: "Thêm loại", nhan: "Thêm loại", nhanO: "Tên loại đối tác", path: "/api/pricing/loai-doi-tac", xong: "Đã thêm loại." });
  const themChinhSach = (): void => hoiTen({ title: "Thêm cấp đại lý", nhan: "Thêm cấp đại lý", nhanO: "Tên cấp đại lý", path: "/api/pricing/muc-ta", xong: "Đã thêm cấp đại lý." });
  async function guiNhanh(path: string, thongBao: string): Promise<string | null> {
    ctx.baoOk(null);
    try {
      await api<unknown>(path, { method: "POST", body: {} });
    } catch (err) {
      return lyDoLoi(err);
    }
    await ctx.napLai();
    ctx.baoOk(thongBao);
    return null;
  }

  function ketQuaGan(r: Api.GanLoaiMucResponse): void {
    if (r.dongRieng.length > 0) ctx.canhBao(khungDongRieng(r, ctx.lay()));
    else ctx.baoOk(`Loại «${r.gan.loai.ten}» đã theo cấp «${r.gan.muc.ten}» từ ngày ${MA_NGAY(r.gan.tuNgay)}.`);
  }

  return {
    themMuc, doi, sua: (x) => void sua(x), suaApDung: (x) => void suaApDung(x), ngung, ngungApDung, doiChinhSach, apDungChinhSach, themLoai, themChinhSach, guiNhanh,
    datCapRieng, suaCapRieng: (g, partyId) => void suaCapRieng(g, partyId), ngungCapRieng, doiCapRieng,
  };
}
