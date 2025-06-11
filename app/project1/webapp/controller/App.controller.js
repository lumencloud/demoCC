sap.ui.define([
  "sap/ui/core/mvc/Controller"
], (BaseController) => {
  "use strict";

  return BaseController.extend("project1.controller.App", {
      onInit() {
      },

// dropPosition "Before", "After" 조건 분기 처리 함수
function handleDropBeforeAfter(oModel, info, position) {
  const { sDroppedPath, dropLevel, iPrevLevel, iNextLevel } = info;

  // 데이터를 최상단 or 최하단 처리
  const oBinding = that.getView().getModel("menuPathModel").getData();
  const oTableLastIdx = oBinding.length - 1;
  const oTableLastIdxPath = oBinding[oTableLastIdx]['path'];
  const isDropTopRow = iPrevLevel === null && position === "Before" && dropLevel === "1";
  const isDropBottomRow = position === "After" && oTableLastIdxPath === sDroppedPath;

  // 최상단
  if (iPrevLevel === null && isDropTopRow) {
    moveNode(info);
    return;
  }

  // 최하단
  if (iNextLevel === null && isDropBottomRow) {
    moveNode(info);
    return;
  }

  // 같은 레벨 사이
  if (iPrevLevel === iNextLevel) {
    moveNode(info);
    return;
  }

  // 상위레벨 아래 하위레벨 사이
  if (iPrevLevel < iNextLevel) {
    moveNode(info);
    return;
  }

  // 하위레벨 아래 상위레벨 사이
  if (iPrevLevel > iNextLevel) {
    moveNode(info);
    return;
  }
}

// dropPosition "on" 조건 처리 함수
function handleDropOn(oModel, info) {
  const { dragNode, dropNode, dragLevel, dropLevel } = info;
  const blocked = blockMoveToLevel({ dragLevel, dropLevel, dragNode });

  if (blocked) {
    MessageToast.show("2레벨 이상으로 \n이동할 수 없습니다.");
    return;
  }

  moveNode(info);
}

  // 드랍 조건 별 분류 통합 함수
function classifyDropCase(oDraggedContext, oDroppedContext, oModel, position) {
  const sDraggedPath = oDraggedContext.getPath();
  const sDroppedPath = oDroppedContext.getPath();
  const dragNode = oDraggedContext.getProperty();
  const dropNode = oDroppedContext.getProperty();
  const dropNodePath = sDroppedPath.replace(/\/children\/\d+$/, "");
  const sDroppedParentPath = sDroppedPath.replace(/\/children\/\d+$/, "");
  const oDragNodeParent = dragNode['Parent_ID'] ? oModel.getProperty(sDraggedParentPath) : null;
  const oDropNodeParent = dropNode['Parent_ID'] ? oModel.getProperty(sDroppedParentPath) : null;
  const iPrevIndex = extractLastChildIndex(sDraggedPath);
  const { iPrevLevel, iNextLevel, iCurrentIdx } = findLevelBetweenNodes(position, sDroppedPath);

  return {
    sDraggedPath,  // 드래그한 노드의 Path
    sDroppedPath,  // 드랍한 노드의 Path
    dragNode,      // 드래그 노드 객체 데이터
    dropNode,      // 드랍 노드 객체 데이터
    dragLevel: getNodeDepthByPath(sDraggedPath), // 드래그 노드의 레벨
    dropLevel: getNodeDepthByPath(sDroppedPath), // 드랍 노드의 레벨
    isDescendant: isDescendant(dragNode, dropNode), // 자식 노드인지 여부
    parentPath: sDroppedParentPath === sDraggedParentPath, // 부모가 같은지
    iPrevLevel, // position = After, Before 간에 드랍시 이전 노드 레벨
    iNextLevel, // position = After, Before 간에 드랍시 다음 노드 레벨
    oDropNodeParent, // 새로운 부모의 모델 데이터
    oDragNodeParent, // 이전 부모의 모델 데이터
    iCurrentIdx, // 노드를 값에 옮길 위치의 Index
    sameLevel: iPrevLevel === iNextLevel,
    iPrevIndex,
    position,
    sameParent: dropNode.Parent_ID === dragNode.Parent_ID // 같은 부모인지
  };
}

  function spliceNodeFromTo(info, bFlag) {
  const { dropNode, dragNode, sDroppedPath, sDraggedPath, oDropNodeParent, iCurrentIdx, parentPath, iPrevIndex, position, dragLevel } = info;
  const oDeleteSameGroup = dragNode['Parent_ID'] ? oDragNodeParent.children : oModel.getData(); // 조건처리 통해 같은 그룹으로 묶인 처리용 데이터
  const oInsertNewGroup = position === "On" ? dropNode.children : dropNode['Parent_ID'] ? oDropNodeParent.children : oModel.getData();

  // 같은 레벨 간 이동 시 추가 후 삭제 (레벨 변경이 하위레벨인지 조건처리)
  // Parent_ID 변경 -> 모델에 추가 -> 모델에 삭제 -> 정렬하면서 odata 요청 -> 모델 업데이트
  if (bFlag) {
    const sPath = dragNode['Parent_ID'] ? parentPath + "/children" : "/"; // 모델 업데이트를 위한 path 값
    const insertIdx = iCurrentIdx !== undefined ? iCurrentIdx : 0; // 드랍할 위치의 인덱스
    oDeleteSameGroup.splice(insertIdx, 0, dragNode); // 노드 추가

    const iPrevIdx = insertIdx > iPrevIndex ? iPrevIndex : iPrevIndex + 1;
    oDeleteSameGroup.splice(iPrevIdx, 1); // 이전 노드 위치에서 삭제
    oDeleteSameGroup.forEach((node, idx) => {  // 정렬 및 odata 업데이트 처리
      node.sort_order = idx + 1;
      updateOdata(node);
    });

    oModel.setProperty(`${sPath}`, oDeleteSameGroup);
    const refreshPathModel = that.flattenTreeWithPath(oModel.getData());
    that.getView().getModel("menuPathModel").setData(refreshPathModel);
    return;
  }

  // 다른 레벨 간 이동 시 추가 후 삭제 (레벨에서 하위레벨 → 하위에서 1레벨 조건 처리)
  // Parent_ID 변경 -> 모델에 추가 -> 모델에 삭제 -> 정렬하면서 odata 요청 -> 모델 업데이트
  dragNode.Parent_ID = position === "On" ? dropNode.ID : dropNode.Parent_ID || null; // Parent_ID 변경
  updateOdata(dragNode);

  function extractPath(sDraggedPath, sDroppedPath, position, dragLevel, dropLevel) {
    let insertIdx = iCurrentIdx;
    let sDeleteGroupPath, sInsertGroupPath;

    if (position === "On") {
      if (dragLevel === 1) {
        sDeleteGroupPath = "/";
      } else {
        let dragParts = sDraggedPath.split("/").filter(Boolean);
        sDeleteGroupPath = "/" + dragParts.slice(0, dragLevel * 2 - 2).join("/");
      }

      const dropParts = sDroppedPath.split("/").filter(Boolean);
      const insertParts = dropParts.slice(0, dropLevel * 2);
      sInsertGroupPath = "/" + insertParts.join("/") + "/children";
      insertIdx = dropNode.children.length > 0 ? dropNode.children.length + 1 : 0;

      return { sDeleteGroupPath, sInsertGroupPath, insertIdx };
    } else {
      if (!sDraggedPath.includes("children")) { // 드래그 노드가 1레벨인지
        sDeleteGroupPath = "/";
      } else {
        const lastSlashIndex = sDraggedPath.lastIndexOf("/");
        sDeleteGroupPath = sDraggedPath.substring(0, lastSlashIndex);
      }

      if (!sDroppedPath.includes("children")) { // 드랍한 위치의 노드가 1레벨인지
        sInsertGroupPath = "/";
      } else {
        const lastSlashIndex = sDroppedPath.lastIndexOf("/");
        sInsertGroupPath = sDroppedPath.substring(0, lastSlashIndex);
      }

      return { sDeleteGroupPath, sInsertGroupPath, insertIdx };
    }
  }

  const { sDeleteGroupPath } = extractPath(sDraggedPath, sDroppedPath, position, dragLevel, dropLevel); // 삭제해야할 그룹 path
  const { sInsertGroupPath } = extractPath(sDraggedPath, sDroppedPath, position, dragLevel, dropLevel); // 삽입해야할 그룹 path
  const { insertIdx } = extractPath(sDraggedPath, sDroppedPath, position, dragLevel, dropLevel); // 삽입할 index

  oDeleteSameGroup.splice(iPrevIndex, 1); // 정렬 및 odata 업데이트 처리
  oDeleteSameGroup.forEach((node, idx) => {
    node.sort_order = idx + 1;
    updateOdata(node);
  });

  oInsertNewGroup.splice(insertIdx, 0, dragNode);
  oInsertNewGroup.forEach((node, idx) => { // 정렬 및 odata 업데이트 처리
    node.sort_order = idx + 1;
    updateOdata(node);
  });

  oModel.setProperty(`${sDeleteGroupPath}`, oDeleteSameGroup);
  oModel.setProperty(`${sInsertGroupPath}`, oInsertNewGroup);
  const refreshPathModel = that.flattenTreeWithPath(oModel.getData());
  that.getView().getModel("menuPathModel").setData(refreshPathModel);
  return;
}

function moveNode(info) {
  const { sameLevel, dragLevel, iNextLevel, iPrevLevel, dragNode, sameParent } = info;
  const bLevelFirst = dragLevel === 1;       // 선택한 노드가 1레벨인지
  const bLevelSecond = dragLevel === 2;      // 선택한 노드가 2레벨인지
  const bBetweenFirst = iPrevLevel === 1 && iNextLevel === 1; // 1레벨과 1레벨 사이인지
  const bBetweenSecond = iPrevLevel === 2 && iNextLevel === 2; // 2레벨과 2레벨 사이인지
  const bTopRow = iPrevLevel === null && iNextLevel === 1;  // 최상단 1레벨 위인지
  const bBottomRowFirst = iPrevLevel === 1 && iNextLevel === null; // 최하단 row가 1레벨 아래인지
  const bBottomRowSecond = iPrevLevel === 2 && iNextLevel === null; // 최하단 row가 2레벨 아래인지
  const bBetweenFirstSecond = iPrevLevel === 1 && iNextLevel === 2; // 1레벨과 2레벨 사이인지
  const bBetweenSecondFirst = iPrevLevel === 2 && iNextLevel === 1; // 2레벨과 1레벨 사이인지

  // if (dragNode.isApp = "none") {
  //   MessageToast.show("폴더 메뉴는 이동할 수 없습니다.");
  //   return;
  // }

  if (sameLevel) {
    // 1레벨과 1레벨 사이에 (? Level ) 옮길 시 (1Lv : 1레벨 정렬 , 2Lv : 1레벨 정렬)
    if (bLevelFirst && bBetweenFirst) {
      spliceNodeFromTo(info, true);
    } else if (bLevelSecond && bBetweenFirst) {
      spliceNodeFromTo(info, false);
      return;
    }

    // 2레벨과 2레벨 사이 ( ? Level ) 옮길 시 (1Lv : 부모 2레벨 위치정렬 , 2Lv : 부모 2레벨 위치정렬)
    if (bLevelFirst && bBetweenSecond) { // 다른 그룹으로 이동
      spliceNodeFromTo(info, false);
    } else if (bLevelSecond && bBetweenSecond) { // 다른 그룹일수 있고 같은 그룹일수도 있고
      spliceNodeFromTo(info, true);
    }
  } else if (!sameLevel) {
    // 1레벨과 2레벨 사이 ( ? Level ) 옮길 시 (1Lv : 부모 2레벨 최상단정렬 , 2Lv : 부모 2레벨 최상단 정렬)
    if (bBetweenFirstSecond && !bBetweenSecondFirst) {
      if (bLevelFirst) {
        spliceNodeFromTo(info, false);   // 1레벨 옮김시 → 다른 그룹에서 이동
      } else if (bLevelSecond && sameParent) {
        spliceNodeFromTo(info, true);    // 같은 부모 그룹 2레벨 이동
      } else if (bLevelSecond && !sameParent) {
        spliceNodeFromTo(info, false);   // 다른 부모 그룹 2레벨 이동
      }
    }

    // 2레벨과 1레벨 사이 ( ? Level ) 옮길 시 (1Lv : 1레벨까지 위치정렬 , 2Lv : 부모 2레벨 최하단 정렬)
    else if (!bBetweenFirstSecond && bBetweenSecondFirst) {
      if (bLevelFirst) {
        spliceNodeFromTo(info, false);
      } else if (bLevelSecond && sameParent) { // 같은 부모 그룹 2레벨 이동
        spliceNodeFromTo(info, true);
      } else if (bLevelSecond && !sameParent) { // 다른 부모 그룹 2레벨 이동
        spliceNodeFromTo(info, false);
      }
    }
  } else if (bTopRow) {
    // 1레벨 최상단 (? Level ) 옮길 시 (1Lv : 1레벨 최상단 정렬 , 2Lv : 1레벨 최상단 정렬)
    if (bLevelFirst) {
      spliceNodeFromTo(info, true);
    } else if (bLevelSecond) {
      spliceNodeFromTo(info, false);
    }
  } else if (bBottomRowFirst) {
    // 1레벨 최하단 (? Level ) 옮길 시 (1Lv : 1레벨 최하단 정렬 , 2Lv : 최하단 부모 최하단 정렬)
    if (bLevelFirst) {
      spliceNodeFromTo(info, true);
    } else if (bLevelSecond) {
      spliceNodeFromTo(info, false);
    }
  } else if (bBottomRowSecond) {
    // 2레벨 최하단 (? Level ) 옮길 시 (1Lv : 최하단 부모 최하단 정렬 , 2Lv : 최하단 부모 최하단 정렬)
    if (bLevelFirst) {
      spliceNodeFromTo(info, false);
    } else if (bLevelSecond && sameParent) { // 같은 부모 그룹 2레벨 이동
      spliceNodeFromTo(info, true);
    } else if (bLevelSecond && !sameParent) { // 다른 부모 그룹 2레벨 이동
      spliceNodeFromTo(info, false);
    }
  }

  // position "on" → 해당 부모 자식으로
  if (!iNextLevel && !iPrevLevel) { // 이전 노드 이후 노드가 없으니 on
    spliceNodeFromTo(info, false);
    return;
  }
}

function moveNode(info) {
  const { sameLevel, dragLevel, iNextLevel, iPrevLevel, dragNode, sameParent, position } = info;

  const isLv1 = dragLevel === 1;
  const isLv2 = dragLevel === 2;

  const prevLv = iPrevLevel;
  const nextLv = iNextLevel;

  const isPrevLv1 = prevLv === 1;
  const isNextLv1 = nextLv === 1;
  const isPrevLv2 = prevLv === 2;
  const isNextLv2 = nextLv === 2;

  const isBetweenLv1 = isPrevLv1 && isNextLv1;
  const isBetweenLv2 = isPrevLv2 && isNextLv2;
  const isFirstToSecond = isPrevLv1 && isNextLv2;
  const isSecondToFirst = isPrevLv2 && isNextLv1;

  const isTopRow = prevLv === null && isNextLv1;
  const isBottomRowLv1 = isPrevLv1 && nextLv === null;
  const isBottomRowLv2 = isPrevLv2 && nextLv === null;

  const move = (flag) => spliceNodeFromTo(info, flag);

  // position "on"에서 이전/다음 노드가 없는 경우 (자식으로 삽입)
  if (!nextLv && !prevLv) {
    return move(false);
  }

  if (sameLevel) {
    if (isLv1 && isBetweenLv1) return move(true);
    if (isLv2 && isBetweenLv1) return move(false);
    if (isLv1 && isBetweenLv2) return move(false);
    if (isLv2 && isBetweenLv2) return move(true);
  } else {
    if (isFirstToSecond) {
      if (isLv1) return move(false);
      if (isLv2 && sameParent) return move(true);
      if (isLv2 && !sameParent) return move(false);
    }
    if (isSecondToFirst) {
      if (isLv1) return move(false);
      if (isLv2 && sameParent) return move(true);
      if (isLv2 && !sameParent) return move(false);
    }
  }

  if (isTopRow) {
    if (isLv1) return move(true);
    if (isLv2) return move(false);
  }

  if (isBottomRowLv1) {
    if (isLv1) return move(true);
    if (isLv2) return move(false);
  }

  if (isBottomRowLv2) {
    if (isLv1) return move(false);
    if (isLv2 && sameParent) return move(true);
    if (isLv2 && !sameParent) return move(false);
  }
}

  
  
  });
});
