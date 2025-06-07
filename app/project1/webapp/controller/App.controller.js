sap.ui.define([
  "sap/ui/core/mvc/Controller"
], (BaseController) => {
  "use strict";

  return BaseController.extend("project1.controller.App", {
      onInit() {
      },
    function handleDropBeforeAfter(oModel, info, position) {
  const {
    dragNode,
    dropNode,
    sDraggedPath,
    sDroppedPath,
    parentPath,
    dragLevel,
    dropLevel
  } = info;

  const isDragTop = dragNode.Parent_ID === null;
  const isDropTop = dropNode.Parent_ID === null;

  const dropParentPath = sDroppedPath.replace(/\/children\/\d+$/, "");
  const dropParent = oModel.getProperty(dropParentPath);
  const dropSiblings = isDropTop ? oModel.getProperty("/") : dropParent.children;

  const dragParent = oModel.getProperty(parentPath);
  const dragSiblings = dragParent.children;

  const dragIdx = extractLastChildIndex(sDraggedPath);
  const dropIdx = extractLastChildIndex(sDroppedPath);

  // 1. 드래그한 노드 제거
  dragSiblings.splice(dragIdx, 1);

  // 2. drop index 계산
  let insertIdx = dropIdx;
  if (position === "After") {
    insertIdx = dragIdx < dropIdx ? dropIdx : dropIdx + 1;
  }

  // === 분기 처리 시작 ===

  // 📌 테이블 최상단 드롭 (before + dropIdx === 0)
  if (position === "Before" && isDropTop && dropIdx === 0) {
    dragNode.Parent_ID = null;
    dropSiblings.unshift(dragNode);
  }

  // 📌 테이블 최하단 드롭 (after + 마지막 row)
  else if (position === "After" && isDropTop && dropIdx === dropSiblings.length) {
    dragNode.Parent_ID = null;
    dropSiblings.push(dragNode);
  }

  // 📌 1레벨 → 1레벨 간 정렬
  else if (isDragTop && isDropTop) {
    dragNode.Parent_ID = null;
    dropSiblings.splice(insertIdx, 0, dragNode);
  }

  // 📌 2레벨 → 1레벨 노드 자식으로 이동
  else if (!isDragTop && isDropTop) {
    moveChildToAnotherParent({
      draggedNode: dragNode,
      oldParent: dragParent,
      newParent: dropNode,
      model: oModel,
      oldParentPath: parentPath,
      newParentPath: sDroppedPath
    });
    return;
  }

  // 📌 2레벨 → 같은 부모 내 정렬
  else if (!isDragTop && !isDropTop && dragNode.Parent_ID === dropNode.Parent_ID) {
    dropSiblings.splice(insertIdx, 0, dragNode);
  }

  // 📌 2레벨 → 다른 1레벨 자식으로 이동
  else if (!isDragTop && !isDropTop && dragNode.Parent_ID !== dropNode.Parent_ID) {
    moveChildToAnotherParent({
      draggedNode: dragNode,
      oldParent: dragParent,
      newParent: dropNode,
      model: oModel,
      oldParentPath: parentPath,
      newParentPath: sDroppedPath
    });
    return;
  }

  // 3. sort_order 재정렬
  dropSiblings.forEach((node, idx) => {
    node.sort_order = idx + 1;
    updateODataAfterDrop(node);
  });

  // 4. 모델 반영
  const dropTargetPath = isDropTop ? "/" : `${dropParentPath}/children`;
  oModel.setProperty(dropTargetPath, dropSiblings);

  // 5. 드래그한 부모도 정렬 정리 필요
  if (!isDragTop && dragParent !== dropParent) {
    dragParent.children.forEach((child, idx) => {
      child.sort_order = idx + 1;
      updateODataAfterDrop(child);
    });
    oModel.setProperty(`${parentPath}/children`, dragParent.children);
  }
}

function moveChildToAnotherParent({ draggedNode, oldParent, newParent, model, oldParentPath, newParentPath }) {
  // 1. 기존 부모에서 제거
  oldParent.children = oldParent.children.filter(child => child.ID !== draggedNode.ID);
  oldParent.children.forEach((child, idx) => {
    child.sort_order = idx + 1;
    updateODataAfterDrop(child);
  });
  model.setProperty(`${oldParentPath}/children`, oldParent.children);

  // 2. 새 부모로 이동
  if (!newParent.children) {
    newParent.children = [];
  }

  draggedNode.Parent_ID = newParent.ID;
  draggedNode.sort_order = newParent.children.length + 1;
  newParent.children.push(draggedNode);

  model.setProperty(`${newParentPath}/children`, newParent.children);
  updateODataAfterDrop(draggedNode);
} 

  });
});
