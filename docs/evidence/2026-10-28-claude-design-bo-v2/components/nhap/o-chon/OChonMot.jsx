import React from "react";
import { BieuTuong } from "../../hien-thi/bieu-tuong/BieuTuong.jsx";

export function OChonMot({ nhan, moTa, chon, macDinh, onDoi, tat, lyDoTat, loi, ten, giaTri, xem = "", className = "" }) {
  const id = React.useId();
  const phu = (tat && lyDoTat) || moTa;
  return (
    <div className={"ib-chon-boc " + className}>
      <label className={"ib-chon" + (tat ? " is-tat" : "") + (loi ? " is-loi" : "")}>
        <input type="radio" className="ib-chon__goc" name={ten} value={giaTri} checked={chon} defaultChecked={macDinh} disabled={tat} aria-invalid={loi ? "true" : undefined} aria-describedby={phu ? id : undefined} onChange={(e) => e.target.checked && onDoi && onDoi(giaTri)} />
        <span className={"ib-chon__hop ib-chon__hop--mot " + xem} aria-hidden="true" />
        <span className="ib-chon__chu">
          <span className="ib-chon__nhan">{nhan}</span>
          {phu ? <span className="ib-chon__mo-ta" id={id}>{phu}</span> : null}
        </span>
      </label>
      {typeof loi === "string" ? <p className="ib-o__loi ib-chon__loi"><BieuTuong ten="alert" co={16} />{loi}</p> : null}
    </div>
  );
}
