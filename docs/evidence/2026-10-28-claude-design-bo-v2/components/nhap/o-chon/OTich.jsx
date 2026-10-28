import React from "react";
import { BieuTuong } from "../../hien-thi/bieu-tuong/BieuTuong.jsx";

export function OTich({ nhan, moTa, chon, macDinh, onDoi, tat, lyDoTat, loi, ten, giaTri, xem = "", className = "" }) {
  const id = React.useId();
  const phu = loi || (tat && lyDoTat) || moTa;
  return (
    <div className={"ib-chon-boc " + className}>
      <label className={"ib-chon" + (tat ? " is-tat" : "") + (loi ? " is-loi" : "")}>
        <input type="checkbox" className="ib-chon__goc" name={ten} value={giaTri} checked={chon} defaultChecked={macDinh} disabled={tat} aria-invalid={loi ? "true" : undefined} aria-describedby={phu ? id : undefined} onChange={(e) => onDoi && onDoi(e.target.checked)} />
        <span className={"ib-chon__hop ib-chon__hop--tich " + xem} aria-hidden="true"><BieuTuong ten="check" co={16} /></span>
        <span className="ib-chon__chu">
          <span className="ib-chon__nhan">{nhan}</span>
          {!loi && phu ? <span className="ib-chon__mo-ta" id={id}>{phu}</span> : null}
        </span>
      </label>
      {loi ? <p className="ib-o__loi ib-chon__loi" id={id}><BieuTuong ten="alert" co={16} />{loi}</p> : null}
    </div>
  );
}
