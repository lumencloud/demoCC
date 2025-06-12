/**
 * 등록일 : 250410
 */

using {common.commitment_item as commitment_item} from '../common/commitment_item';

namespace common;

/**
 * GL 계정 테이블 I/F 테이블
 */
entity if_gl_account {
    key ver                    : String(20)                                                            @title: '인터페이스 버전';
        flag                   : String(10)                                                            @title: '인터페이스 상태';
    key gl_account             : String(10) not null                                                   @title: '계정코드';
    key commitment_item        : String(24) not null                                                   @title: '중계정';
        commitment_item_detail : Association to commitment_item
                                     on commitment_item_detail.commitment_item = $self.commitment_item @title: '중계정 상세';
        description            : String(40)                                                            @title: 'description';
}
