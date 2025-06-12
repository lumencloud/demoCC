using common as commonService from './service';

annotate commonService.TestHierarchy with {
    id              @sap.hierarchy.node.for;
    parentId        @sap.hierarchy.parent.node.for;
    hierarchy_level @sap.hierarchy.level.for;
    drill_state     @sap.hierarchy.drill.state.for;
}
