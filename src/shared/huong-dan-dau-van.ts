// SINH bởi scripts/huong-dan-xem-lai.mjs, không sửa tay. Mỗi bài: dấu vân lúc xem lại gần nhất, kèm bản và ngày.
export interface DauVanBai { readonly neo: string; readonly chu: string; readonly ban: string; readonly ngay: string }
export const DAU_VAN: Readonly<Record<string, DauVanBai>> = {
  "kho-ve": {"neo":"d5f10c5b96d32afd","chu":"c41727f43c655636","ban":"3.19","ngay":"2026-11-20"},
  "quet-ve": {"neo":"76d5aef64e4591a4","chu":"cf6957d677b93d19","ban":"3.17","ngay":"2026-11-18"},
  "doi-chieu-ve": {"neo":"beb10e2c3265ae83","chu":"80947f92445b6340","ban":"3.17","ngay":"2026-11-18"},
  "cai-dat-ve": {"neo":"1a9be7c66766df30","chu":"78895cd744fbcb8b","ban":"2.80","ngay":"2026-11-09"},
  "dich-vu-can-kiem-ve": {"neo":"7472f9f7d97d027a","chu":"b41fe0afa23fe41f","ban":"3.19","ngay":"2026-11-20"},
  "gioi-han-nhap-hoa-hong": {"neo":"5be668561a80de9f","chu":"f2fe829bae2aff80","ban":"2.58","ngay":"2026-11-03"},
  "han-muc-tra-sau": {"neo":"94c777db435d9756","chu":"38ef6594a828abfa","ban":"2.95","ngay":"2026-11-12"},
  "xem-no-tra-sau": {"neo":"4db6f12ce2982896","chu":"fa963bef8425dbf2","ban":"3.6","ngay":"2026-11-15"},
  "giao-dien": {"neo":"7fde36318901a977","chu":"8d315591cb3389c0","ban":"3.6","ngay":"2026-11-15"},
  "phi-don": {"neo":"9669f92be20cba97","chu":"0b5228513697776a","ban":"3.14","ngay":"2026-11-17"},
};
