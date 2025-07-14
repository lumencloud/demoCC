using common.gl_account as common_gl_account from '../../common/gl_account';
using common.version as common_version from '../../common/version';

namespace common;

view gl_account_view as
    select from (
        select * from common_gl_account
        where
            ver = (
                select ver from common_version
                where
                       tag = 'C'
                limit 1
            )
    ) {
        key ver,
        key gl_account,
        key commitment_item,
            name
    }
