import React from "react";

export function CongTac({ nhan, moTa, bat, macDinh, onDoi, tat, lyDoTat, ten, xem = "", className = "" }) {
  const id = React.useId();
  const phu = (tat && lyDoTat) || moTa;
  return (
    <label className={"ib-chon ib-chon--cong-tac" + (tat ? " is-tat" : "") + " " + className}>
      <input type="checkbox" role="switch" className="ib-chon__goc" name={ten} checked={bat} defaultChecked={macDinh} disabled={tat} aria-describedby={phu ? id : undefined} onChange={(e) => onDoi && onDoi(e.target.checked)} />
      <span className={"ib-chon__hop ib-chon__hop--cong-tac " + xem} aria-hidden="true" />
      <span className="ib-chon__chu">
        <span className="ib-chon__nhan">{nhan}</span>
        {phu ? <span className="ib-chon__mo-ta" id={id}>{phu}</span> : null}
      </span>
    </label>
  );
}
