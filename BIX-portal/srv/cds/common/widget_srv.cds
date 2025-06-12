using common.card as card_ from '../../../db/cds/common/card';
using common.card_target as card_target_ from '../../../db/cds/common/card_target';
using common.card_image as card_image_ from '../../../db/cds/common/card_image';
using common.view as common_view from '../../../db/cds/common/_common_view';

@path               : '/odata/v4/widget'
@cds.query.limit.max: 10000
service widgetService {

    entity card        as projection on card_;
    entity card_target as projection on card_target_;
    entity card_image  as projection on card_image_;

    view get_widget_detail(ID:UUID) as select from common_view.get_widget_detail(ID: :ID);

}
