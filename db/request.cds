namespace demo.request;

using {
    cuid,
    managed,
    Currency,
    Country
} from '@sap/cds/common';

entity Request {
    key request_number          : Integer @title: '요청번호';
        request_product         : String  @title: '요청물품';
        request_quantity        : Integer @title: '요청수량';
        requestor               : String  @title: '요청자';
        request_date            : String  @title: '요청날짜';
        request_state           : String  @title: '요청상태';
        request_reason          : String  @title: '요청사유';
        request_estimated_price : Integer @title: '요청예상가격';
        request_reject_reason   : String  @title: '요청거절사유';
};

entity Request_State {
    key request_state_key : String @title: '요청상태 키워드';
        request_state_kor : String @title: '요청상태 한국어';
};
