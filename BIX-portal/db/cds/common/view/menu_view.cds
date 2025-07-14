using common.menu as common_menu from '../menu';

namespace common;

view menu_view as
        select from (
            select
                menu.*,
                (
                    '/main/index.html#/' || menu.category || '/' || menu.code
                )    as url         : String(200)     @title: '딥링크 url',
                null as page_type   : String(10)      @title: '좌측 영역 table/grid 구분',
                null as detail_type : String(10)      @title: '우측 영역 detail/chart 구분'
            from common_menu as menu
            where
                isApp <> 'sub'
        union
            select
                menu.*,
                (
                    '/main/index.html#/' || menu.category || '/' || menu.code || '/' || '&/#/' || menu.page_path || '/table/' || menu.detail_path || '/detail'
                )        as url         : String(200) @title: '딥링크 url',
                'table'  as page_type   : String(10)  @title: '좌측 영역 table/grid 구분',
                'detail' as detail_type : String(10)  @title: '우측 영역 detail/chart 구분'
            from common_menu as menu
            where
                isApp = 'sub'
        union
            select
                menu.*,
                (
                    '/main/index.html#/' || menu.category || '/' || menu.code || '/' || '&/#/' || menu.page_path || '/table/' || menu.detail_path || '/chart'
                )       as url         : String(200)  @title: '딥링크 url',
                'table' as page_type   : String(10)   @title: '좌측 영역 table/grid 구분',
                'chart' as detail_type : String(10)   @title: '우측 영역 detail/chart 구분'
            from common_menu as menu
            where
                isApp = 'sub'
        union
            select
                menu.*,
                (
                    '/main/index.html#/' || menu.category || '/' || menu.code || '/' || '&/#/' || menu.page_path || '/grid/' || menu.detail_path || '/detail'
                )        as url         : String(200) @title: '딥링크 url',
                'grid'   as page_type   : String(10)  @title: '좌측 영역 table/grid 구분',
                'detail' as detail_type : String(10)  @title: '우측 영역 detail/chart 구분'
            from common_menu as menu
            where
                isApp = 'sub'
        union
            select
                menu.*,
                (
                    '/main/index.html#/' || menu.category || '/' || menu.code || '/' || '&/#/' || menu.page_path || '/grid/' || menu.detail_path || '/chart'
                )       as url         : String(200)  @title: '딥링크 url',
                'grid'  as page_type   : String(10)   @title: '좌측 영역 table/grid 구분',
                'chart' as detail_type : String(10)   @title: '우측 영역 detail/chart 구분'
            from common_menu as menu
            where
                isApp = 'sub'
        ) {
            key ID,
            key page_type,
            key detail_type,
                name,
                url,
                trigger_patterns,
                system_yn,
                description,
                i18nTitle,
                sort_order,
                iconSrc,
                use_yn,
                delete_yn,
                isApp,
                category,
                code,
                page_path,
                detail_path
        };
