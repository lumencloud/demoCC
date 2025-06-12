namespace common;

using {managed} from '@sap/cds/common';

/**
 * 다국어 테이블 - 기본 ko 저장 / 각 언어코드별 localized 저장
 */
entity i18n : managed {
    key i18nKey  : String(50);
        i18nText : localized String(500);
        type     : String(30) enum {
            Text;
            Msg;
        };
        category : String(20);
}
