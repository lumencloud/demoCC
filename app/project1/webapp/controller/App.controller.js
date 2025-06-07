sap.ui.define([
  "sap/ui/core/mvc/Controller"
], (BaseController) => {
  "use strict";

  return BaseController.extend("project1.controller.App", {
      onInit() {
      },
   function handleDropBeforeAfter(oModel, info, position) {
  const {
    dragNode, dropNode,
    sDraggedPath, sDroppedPath,
    parentPath, dragLevel, dropLevel
  } = info;

  const isDragTop = dragNode.Parent_ID === null;
  const isDropTop = dropNode.Parent_ID === null;

  const dragIdx = extractLastChildIndex(sDraggedPath);
  const dropIdx = extractLastChildIndex(sDroppedPath);

  // 테이블 최상단 or 최하단 처리
  const isDropTopRow = dropIdx === 0 && position === "Before";
  const isDropBottom = position === "After" && dropNode.children == null;

  const topPath = "/"; // 최상위 노드 배열 경로
  const topNodes = oModel.getProperty(topPath);

  if (isDropTopRow) {
    // 최상단: 1레벨/2레벨 둘 다 최상위로 이동
    dragNode.Parent_ID = null;
    topNodes.splice(0, 0, dragNode);
    topNodes.forEach((node, idx) => {
      node.sort_order = idx + 1;
      updateODataAfterDrop(node);
    });
    oModel.setProperty(topPath, topNodes);
    return;
  }

  if (isDropBottom && isDropTop) {
    // 최하단: 1레벨 → 1레벨 맨 아래로
    dragNode.Parent_ID = null;
    topNodes.splice(topNodes.length, 0, dragNode);
    topNodes.forEach((node, idx) => {
      node.sort_order = idx + 1;
      updateODataAfterDrop(node);
    });
    oModel.setProperty(topPath, topNodes);
    return;
  }

  if (!isDragTop && isDropTop) {
    // 2레벨 → 1레벨 사이: dropNode 자식으로 이동
    moveChildToAnotherParent({
      draggedNode: dragNode,
      oldParent: oModel.getProperty(parentPath),
      newParent: dropNode,
      model: oModel,
      oldParentPath: parentPath,
      newParentPath: sDroppedPath
    });
    return;
  }

  if (isDragTop && isDropTop) {
    // 1레벨 → 1레벨 재정렬
    topNodes.splice(dragIdx, 1);
    let insertIdx = dropIdx;
    if (position === "After") {
      insertIdx = dragIdx < dropIdx ? dropIdx : dropIdx + 1;
    }
    topNodes.splice(insertIdx, 0, dragNode);
    topNodes.forEach((node, idx) => {
      node.sort_order = idx + 1;
      updateODataAfterDrop(node);
    });
    oModel.setProperty(topPath, topNodes);
    return;
  }

  if (!isDragTop && !isDropTop) {
    // 2레벨 → 2레벨: 같은 부모 내 정렬
    if (dragNode.Parent_ID === dropNode.Parent_ID) {
      const parent = oModel.getProperty(parentPath);
      const children = parent.children;

      children.splice(dragIdx, 1);
      let insertIdx = dropIdx;
      if (position === "After") {
        insertIdx = dragIdx < dropIdx ? dropIdx : dropIdx + 1;
      }
      children.splice(insertIdx, 0, dragNode);
      children.forEach((child, idx) => {
        child.sort_order = idx + 1;
        updateODataAfterDrop(child);
      });
      oModel.setProperty(`${parentPath}/children`, children);
    } else {
      // 부모 다를 경우: 자식으로 이동
      moveChildToAnotherParent({
        draggedNode: dragNode,
        oldParent: oModel.getProperty(parentPath),
        newParent: dropNode,
        model: oModel,
        oldParentPath: parentPath,
        newParentPath: sDroppedPath
      });
    }
    return;
  }
}


  });
});
