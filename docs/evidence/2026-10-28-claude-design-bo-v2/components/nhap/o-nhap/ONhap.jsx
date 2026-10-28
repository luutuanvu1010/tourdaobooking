import React from "react";
import { BieuTuong } from "../../hien-thi/bieu-tuong/BieuTuong.jsx";

const KIEU = {
  chu: { type: "text" },
  so: { type: "text", inputMode: "numeric" },
  tien: { type: "text", inputMode: "numeric", donVi: "₫" },
  sdt: { type: "tel", inputMode: "tel", autoComplete: "tel" },
  ngay: { type: "text", inputMode: "numeric", goiY: "dd/mm/yyyy" },
  gio: { type: "text", inputMode: "numeric", goiY: "hh:mm" },
};

export function ONhap({ nhan, kieu = "chu", tuyChon, goiY, giaTri, macDinh, onDoi, loi, huongDan, tat, lyDoTat, dangTai, luaChon = [], co = "thuong", id, ten, xem = "", className = "" }) {
  const tuDong = React.useId();
  const oid = id || tuDong;
  const moTaId = oid + "-mo-ta";
  const k = KIEU[kieu] || {};
  const moTa = loi ? null : tat && lyDoTat ? lyDoTat : huongDan;
  const chung = {
    id: oid, name: ten, disabled: tat, value: giaTri, defaultValue: macDinh,
    "aria-invalid": loi ? "true" : undefined,
    "aria-describedby": loi || moTa ? moTaId : undefined,
    onChange: (e) => onDoi && onDoi(e.target.value),
  };
  const dk = "ib-o__dieu-khien " + xem;
  let o;
  if (kieu === "chon") {
    o = (
      <div className="ib-o__khung">
        <select className={dk + " ib-o__chon"} {...chung}>
          {goiY ? <option value="">{goiY}</option> : null}
          {luaChon.map((l) => typeof l === "string" ? <option key={l} value={l}>{l}</option> : <option key={l.giaTri} value={l.giaTri}>{l.nhan}</option>)}
        </select>
        <BieuTuong ten="chevron-down" className="ib-o__mui" />
      </div>
    );
  } else if (kieu === "nhieu-dong") {
    o = <textarea className={dk + " ib-o__nhieu-dong"} rows={4} placeholder={goiY} {...chung} />;
  } else {
    o = (
      <div className="ib-o__khung">
        <input className={dk + (k.donVi ? " ib-o__tien" : "") + (dangTai ? " ib-o__co-quay" : "")} type={k.type} inputMode={k.inputMode} autoComplete={k.autoComplete} placeholder={goiY ?? k.goiY} {...chung} />
        {k.donVi ? <span className="ib-o__don-vi" aria-hidden="true">{k.donVi}</span> : null}
        {dangTai ? <span className="ib-o__quay" aria-label="Đang tải" role="status" /> : null}
      </div>
    );
  }
  return (
    <div className={"ib-o" + (loi ? " is-loi" : "") + (tat ? " is-tat" : "") + (co === "lon" ? " ib-o--lon" : "") + " " + className}>
      <label className="ib-o__nhan" htmlFor={oid}>
        {nhan}{tuyChon ? <span className="ib-o__tuy-chon"> (tuỳ chọn)</span> : null}
      </label>
      {o}
      {loi ? <p className="ib-o__loi" id={moTaId}><BieuTuong ten="alert" co={16} />{loi}</p> : moTa ? <p className="ib-o__huong-dan" id={moTaId}>{moTa}</p> : null}
    </div>
  );
}

/** Ghi tiền đủ "1.080.000 ₫" ở mọi khổ. */
export function ghiTien(so) {
  const n = Math.round(Number(so) || 0);
  return n.toLocaleString("vi-VN").replace(/,/g, ".") + " ₫";
}
