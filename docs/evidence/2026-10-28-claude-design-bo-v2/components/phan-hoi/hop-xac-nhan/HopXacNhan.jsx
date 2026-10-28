import React from "react";
import { BangTruot } from "../bang-truot/BangTruot.jsx";
import { BieuTuong } from "../../hien-thi/bieu-tuong/BieuTuong.jsx";

export function HopXacNhan({ mo = true, tieuDe, noiDung, hauQua = "Việc này không hoàn tác được.", nhanXacNhan, nhanHuy = "Không, quay lại", onXacNhan, onHuy, dangTai, tatXacNhan, lyDoTat, trongKhung, children }) {
  return (
    <BangTruot
      mo={mo} tieuDe={tieuDe} onDong={onHuy} trongKhung={trongKhung}
      phu={{ nhan: nhanHuy, onClick: onHuy }}
      chinh={{ cap: "do-dac", nhan: nhanXacNhan, onClick: onXacNhan, dangTai, tat: tatXacNhan, lyDoTat }}
    >
      <div className="ib-xac-nhan">
        <span className="ib-xac-nhan__bt"><BieuTuong ten="alert" co={24} /></span>
        <div className="ib-xac-nhan__chu">
          {noiDung ? <p className="ib-xac-nhan__noi-dung">{noiDung}</p> : null}
          <p className="ib-xac-nhan__hau-qua">{hauQua}</p>
        </div>
      </div>
      {children}
    </BangTruot>
  );
}
