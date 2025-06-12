using common.commitment_item as common_commitment_item from '../../common/commitment_item';
using common.version as common_version from '../../common/version';

namespace common;

view commitment_item_view as
    select from (
        select * from common_commitment_item
        where
            ver = (
                select ver from common_version
                where
                       tag = 'C'
                limit 1
            )
    ) {
        key ver,
        key commitment_item,
            description
    }
