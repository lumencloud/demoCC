using {
        cuid,
        managed
} from '@sap/cds/common';
using common.card_target as card_target from './card_target';
using common.card_image as card_image from './card_image';

namespace common;

entity card : cuid, managed {
        name          : String(100) not null;
        category      : String(50) not null;
        description   : String(2000); //info
        useFlag       : Boolean default true;
        // title         : localized String(100);
        contentType   : Integer default 0; // 0: component 1: richText
        cardComponent : String(50) default 'cardcomponent';
        cardFolder    : String(100);
        richText      : LargeString;
        bannerType    : Integer default 0; // 0: normal 1: slide
        bannerTime    : Integer;
        target        : Composition of many card_target
                                on target.card = $self;
        image         : Composition of many card_image //dms file id 저장
                                on image.card = $self;
}
