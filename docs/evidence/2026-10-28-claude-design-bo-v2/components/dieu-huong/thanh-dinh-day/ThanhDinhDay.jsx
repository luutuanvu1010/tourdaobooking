import React from "react";

export function ThanhDinhDay({ tomTat, children, className = "" }) {
  return (
    <div className={"ib-chan-dinh " + className}>
      <div className="ib-chan-dinh__ruot">
        {tomTat ? <div className="ib-chan-dinh__tom-tat">{tomTat}</div> : null}
        <div className="ib-chan-dinh__nut">{children}</div>
      </div>
    </div>
  );
}
