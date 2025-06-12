sap.ui.define([
  "sap/ui/core/mvc/Controller"
], (BaseController) => {
  "use strict";

  return BaseController.extend("project1.controller.App", {
    onInit() {
    },

    _dragEnd: function (oEvent) {
      const that = this;
      const oTreeTable = this.byId("menuFolderTable");
      const oModel = oTreeTable.getBinding().getModel();
      const oDragSession = oEvent.getParameter("dragSession");
      const sDropPosition = oEvent.getParameter("dropPosition");
      const oDroppedRow = oDragSession.getDropControl();
      const aDraggedRowContext = oDragSession.getComplexData("hierarchymaintenance").draggedRowContexts // 옮기려는 node context
      const oDroppedRowContext = oTreeTable.getContextByIndex(oDroppedRow.getIndex()); // 옮겨질 위치의 node context

      // 현재 드랍한 라인 (before || After) 상관없이 그 라인의 아래 , 위 노드의 레벨을 가져옴
      function findLevelBetweenNodes(position, sDroppedPath) {
          const oBinding = that.getView().getModel("menuPathModel").getData();
          const iDropIdx = oBinding.findIndex(child => child.path === sDroppedPath);

          const iPrevIdx = position === "Before" ? iDropIdx - 1 : iDropIdx;
          const iNextIdx = position === "Before" ? iDropIdx : iDropIdx + 1;

          const oPrevContext = oBinding[iPrevIdx] || null;
          const oNextContext = oBinding[iNextIdx] || null;

          const sPrevPath = oPrevContext?.path;
          const sNextPath = oNextContext?.path;
          const iCurrentIdx = sNextPath ? extractLastChildIndex(sNextPath) : oBinding.length - 1;

          const iPrevLevel = sPrevPath ? getNodeDepthbyPath(sPrevPath) : null;  // 현재 드랍한 라인에 바로 상단 Node 레벨 , 최상단 node = null
          const iNextLevel = sNextPath ? getNodeDepthbyPath(sNextPath) : null; // 현재 드랍한 라인에 바로 하단 Node 레벨 , 최하단 node = null
          return {
              iPrevLevel, iNextLevel, iCurrentIdx, sPrevPath, sNextPath
              // retrun 값 between 드랍 시 바로 위 iPrevLevel 레벨, sPrevPath 경로값, 바로 아래 iNextLevel, sNextPath 경로값
          }
      }
      // 드랍 조건 별 분류 통합 함수
      function classifyDropCase(oDraggedContext, oDroppedContext, oModel, position) {
          const sDroppedPath = oDroppedContext.getPath();
          const sDraggedPath = oDraggedContext.getPath()
          const dragNode = oDraggedContext.getProperty();
          const dropNode = oDroppedContext.getProperty();
          const sDraggedParentPath = sDraggedPath.replace(/\/children\/\d+$/, "");
          const sDroppedParentPath = sDroppedPath.replace(/\/children\/\d+$/, "");
          const oDragNodeParent = dragNode['Parent_ID'] ? oModel.getProperty(sDraggedParentPath) : null
          const oDropNodeParent = dropNode['Parent_ID'] ? oModel.getProperty(sDroppedParentPath) : null
          const iPrevIndex = extractLastChildIndex(sDraggedPath);
          const { iPrevLevel, iNextLevel, iCurrentIdx, sPrevPath, sNextPath } = findLevelBetweenNodes(position, sDroppedPath, sDroppedPath);
          return {
              oModel,
              sPrevPath,
              sNextPath,
              sDraggedPath,    // 드래그한 노드의 Path
              sDroppedPath,    // 드랍한 노드의 Path
              dragNode,        // 드래그 노드 객체 데이터
              dropNode,        // 드랍   노드 객체 데이터
              dragLevel: getNodeDepthbyPath(sDraggedPath),  // 드래그 노드의 레벨
              dropLevel: getNodeDepthbyPath(sDroppedPath),  // 드랍 노드의 레벨
              isDescendant: isDescendant(dragNode, dropNode),  // 자기 자신 자식 노드 방지
              parentPath: sDraggedParentPath === sDraggedPath ? null : sDraggedParentPath,  // 부모가 있으면 부모 Path, 없으면 null
              iPrevLevel, // position : After,Before 라인 드랍 시 상단 노드 레벨
              iNextLevel,  // position : After,Before 라인 드랍 시 하단 노드 레벨
              // oDropNodeParent,  // 새로운 부모의 모델 데이터
              // oDragNodeParent,  // 이전 부모의 모델 데이터
              iCurrentIdx,  // 노드를 라인에 옮길시 위치할 index
              iPrevIndex,    // 옮긴 노드의 이전 index
              position,
              family: dragNode.Parent_ID === dropNode.ID,
              sameParent: dropNode.Parent_ID === dragNode.Parent_ID // 같은 부모를 가진 그룹인지
          }
      }
      /**
       * 기존 부모에서 노드 삭제 후 새로운 부모에 노드 추가
       * @param {*} info   node 이동을 위한 정보를 담은 객체
       * @returns 
       */
      function moveNode(info) {
          const { dragLevel, iPrevLevel, iNextLevel, sameParent, position, dropLevel, dragNode, family } = info;
          const blocked = blockMoveToLevel({ dropLevel, dragNode });
          if (blocked) {
              MessageToast.show("2레벨 이상으로 \n이동할 수 없습니다.")
              return;
          }
          if (family && position === "On") {
              MessageToast.show("하위 메뉴에 \n이미 존재합니다.")
              return;
          }
          const isLv1 = dragLevel === 1;     //  드래그 노드 1레벨인지
          const isLv2 = dragLevel === 2;     // 드래그 노드 2레벨인지
          const isPrevLv1 = iPrevLevel === 1; // 드랍한위치에 이전 row 레벨이 1레벨인지
          const isNextLv1 = iNextLevel === 1; // 드랍한위치에 이후 row 레벨이 1레벨인지
          const isPrevLv2 = iPrevLevel === 2;
          const isNextLv2 = iNextLevel === 2;
          const sPosition = position === "On";
          const isBetweenLv1 = isPrevLv1 && isNextLv1;   // 드랍한 위치가 1레벨사이인지
          const isBetweenLv2 = isPrevLv2 && isNextLv2;   // 드랍한 위치가 2레벨 사이인지
          const isFirstToSecond = isPrevLv1 && isNextLv2;  // 1레벨 이전 2레벨 이후 사이인지
          const isSecondToFirst = isPrevLv2 && isNextLv1;  // 2레벨 이전 1레벨 이후 사이인지
          const isTopRow = iPrevLevel === null && isNextLv1;    // 최상단인지
          const isBottomRowLv1 = isPrevLv1 && iNextLevel === null;  // 1레벨 최하단인지
          const isBottomRowLv2 = isPrevLv2 && iNextLevel === null;  // 2레벨 최하단인지

          // 1. 최상단: 이전 노드 없음, 다음 노드가 1레벨
          if (isTopRow && !sPosition) {
              if (isLv1) return spliceNodeFromTo(info, { levelCase: '1to1', positionCase: 'top', sameParent: true });
              if (isLv2) return spliceNodeFromTo(info, { levelCase: '2to1', positionCase: 'top', sameParent: false });
          }
          // 2. 최하단: 다음 노드 없음
          if (isBottomRowLv1 && !sPosition) {
              if (isLv1) return spliceNodeFromTo(info, { levelCase: '1to1', positionCase: 'bottom', sameParent: true });
              if (isLv2) return spliceNodeFromTo(info, { levelCase: '2to1', positionCase: 'bottom', sameParent: false });
          }
          if (isBottomRowLv2 && !sPosition) {
              if (isLv1) return spliceNodeFromTo(info, { levelCase: '1to2', positionCase: 'bottom', sameParent: false });
              if (isLv2) return spliceNodeFromTo(info, { levelCase: '2to2', positionCase: 'bottom', sameParent });
          }
          // 3. 같은 레벨 간 이동
          if (isBetweenLv1 && !sPosition) {
              if (isLv1) return spliceNodeFromTo(info, { levelCase: '1to1', positionCase: 'between', sameParent: true });
              if (isLv2) return spliceNodeFromTo(info, { levelCase: '2to1', positionCase: 'between', sameParent: false });
          }
          if (isBetweenLv2 && !sPosition) {
              if (isLv1) return spliceNodeFromTo(info, { levelCase: '1to2', positionCase: 'between', sameParent: false });
              if (isLv2) return spliceNodeFromTo(info, { levelCase: '2to2', positionCase: 'between', sameParent });
          }
          // 4. 레벨 교차 간 이동
          if (isFirstToSecond && !sPosition) {
              if (isLv1) return spliceNodeFromTo(info, { levelCase: '1to2', positionCase: 'between', sameParent: false });
              if (isLv2 && sameParent) return spliceNodeFromTo(info, { levelCase: '2to2', positionCase: 'between', sameParent: true });
              if (isLv2 && !sameParent) return spliceNodeFromTo(info, { levelCase: '2to2', positionCase: 'between', sameParent: false });
          }
          if (isSecondToFirst && !sPosition) {
              if (isLv1) return spliceNodeFromTo(info, { levelCase: '1to1', positionCase: 'between', sameParent: true });
              if (isLv2 && sameParent) return spliceNodeFromTo(info, { levelCase: '2to2', positionCase: 'between', sameParent: true });
              if (isLv2 && !sameParent) return spliceNodeFromTo(info, { levelCase: '2to1', positionCase: 'between', sameParent: false });
          }
          // 5. position === "On" 일 때: 드롭 노드의 자식으로 들어감
          if (position === "On") {
              if (isLv1) return spliceNodeFromTo(info, { levelCase: '1to1', positionCase: 'On', sameParent: false });
              if (isLv2) return spliceNodeFromTo(info, { levelCase: '2to1', positionCase: 'On', sameParent: false });
          }
      }

      function spliceNodeFromTo(info, { levelCase, positionCase, sameParent }) {
          const { dragNode, dropNode, iPrevIndex, iCurrentidx, dragLevel, dropLevel, oModel, sPrevPath, sNextPath, sDraggedPath, sDroppedPath } = info;
          const sDragPath = sDraggedPath; // 미리 저장해줌
          const sDropPath = sDroppedPath;
          let iPreIdx = dragNode.sort_order;
          let iNextIdx = dropNode.sort_order;
          // Parent_ID 변경
          if (levelCase === "1to2" || positionCase === "On") { dragNode.Parent_ID = dropNode.ID; }
          else if (levelCase === "2to1") { dragNode.Parent_ID === null }
          updateOdata(dragNode);

          // 삭제, 삽입 그룹의 path값 찾기
          function findGroupPath(sDropPath, sDragPath, positionCase, dragLevel) {
              let deletePath, insertPath;
              if (dragLevel === 1) {
                  deletePath = "/";
              } else {
                  deletePath = sDragPath.split("/children")[0] + "/children";
              }

              if (levelCase === "1to2") {
                  insertPath = sDropPath + "/children";
              } else if (levelCase === "1to1") {

                  if (positionCase === "On") {
                      insertPath = sDropPath + "/children";
                  } else {
                      insertPath = sDropPath;
                  }

              } else if (levelCase === "2to1") {
                  if (positionCase === "On") {
                      insertPath = sDropPath + "/children";
                  } else { insertPath = sDropPath }

                  deletePath = sDragPath.split("/children")[0] + "/children";
              } else {
                  insertPath = sDropPath;
              }
              return { deletePath, insertPath };
          }
          const { deletePath, insertPath } = findGroupPath(sDropPath, sDragPath, positionCase, dragLevel);
        
          const oDeleteGroup = oModel.getProperty(deletePath);
          const oInsertGroup = oModel.getProperty(insertPath);
          // 삭제 
          oDeleteGroup.splice(iPrevIndex, 1);
          // 삽입 위치
          let insertIdx = 0;
          switch (positionCase) {
              case "top":
                  insertIdx = 0;
                  break;
              case "bottom":
                  insertIdx = oInsertGroup.length + 1;
                  break;
              case "between":
                  insertIdx = iCurrentidx ?? 0;
                  break;
              case "On":
                  insertIdx = dropNode.children?.length ?? 0;
          }
          // 정렬 및 OData 업데이트
          oInsertGroup.splice(insertIdx, 0, dragNode);
          [oDeleteGroup, oInsertGroup]
              .filter(group => Array.isArray(group) && group.length > 0)
              .forEach(group => {
                  group.forEach((node, idx) => {
                      node.sort_order = idx + 1;
                      updateOdata(node);
                  })
              })
          // 조건 별 모델을 setProperty 할 삽입 path , 삭제 path를 추출하는 방법
          function extractPath(sDragPath, sDropPath, positionCase, dragLevel) {
              let sDeleteGroupPath, sInsertGroupPath;
              let insertIdx = iPreIdx < iNextIdx ? iNextIdx - 1 : iNextIdx;

              if (positionCase === "On") {
                  let dragParts = sDragPath.split("/").filter(Boolean);
                  sDeleteGroupPath = dragLevel === 1 ? "/" : "/" + dragParts.slice(0, dragLevel * 2 - 2).join("/");  //기존 부모에서 삭제 ex) "/10/children
                  // let insertParts = sDropPath.split("/").filter(Boolean);
                  // insertParts[insertParts.length - 1] = insertIdx.toString();
                  // sInsertGroupPath = "/" + insertParts.join("/");
                  sInsertGroupPath = sDropPath + "/children"
                  return { sDeleteGroupPath, sInsertGroupPath }
              } else {
                  const lastDropIndex = sDropPath.lastIndexOf("/");
                  const lastDragIndex = sDragPath.lastIndexOf("/");
                  // let insertParts = sInsertGroupPath.split("/").filter(Boolean);
                  // insertParts[insertParts.length - 1] = insertIdx.toString();
                  // sInsertGroupPath = "/" + insertParts.join("/");
                  sInsertGroupPath = !sDropPath.includes("children") ? "/" : sDropPath.substring(0, lastDropIndex);
                  sDeleteGroupPath = !sDragPath.includes("children") ? "/" : sDragPath.substring(0, lastDragIndex);

                  return { sDeleteGroupPath, sInsertGroupPath }
              }
          }
          const { sDeleteGroupPath } = extractPath(sDragPath, sDragPath, positionCase, dragLevel);  //삭제해야할 그룹 path
          const { sInsertGroupPath } = extractPath(sDragPath, sDragPath, positionCase, dragLevel);  //삽입해야할 그룹 path

          // 모델 반영
          oModel.setProperty(`${sInsertGroupPath}`, oInsertGroup);
          oModel.setProperty(`${sDeleteGroupPath}`, oDeleteGroup);
          // 플랫 모델 갱신
          const refreshPathModel = that.flattenTreeWithPath(oModel.getData())
          that.getView().getModel("menuPathModel").setData(refreshPathModel);
          return;

      }
      // Odata v4 모델 업데이트 함수
      function updateOdata(node) {
          let oDataModel = that.getOwnerComponent().getModel();
          let sBindingPath = `/Menus(ID='${node.ID}')`
          let oContext = oDataModel.bindContext(sBindingPath, undefined, {
              $$updateGroupId: "AddMenuFolder"
          }).getBoundContext();

          oContext.setProperty("Parent_ID", node.Parent_ID ?? null);
          oContext.setProperty("sort_order", node.sort_order);
      }
      // 드래그시 전체 적인 로직 처리 시작 함수
      for (const oDraggedContext of aDraggedRowContext) {
          //oModel = 트리테이블에 바인딩된 모델
          const dropInfo = classifyDropCase(oDraggedContext, oDroppedRowContext, oModel, sDropPosition);
          if (dropInfo.isDescendant) {
              MessageToast.show("같은 레벨 간에는\n이동할 수 없습니다.")
              return;
          }
          moveNode(dropInfo);
      }
      // Path 값으로 인덱스 추출 함수
      function extractLastChildIndex(sPath) {
          let iIndex = sPath.split("/").filter(Boolean);
          let iLasIndex = iIndex.pop();
          if (iLasIndex === "children" && iIndex.length > 0) {
              return iIndex.pop();
          }
          return parseInt(iLasIndex);
      }
      // children 갯수로 해당 노드 레벨 확인 함수
      function getNodeDepthbyPath(sPath) {
          let matches = sPath.match(/children/g);
          return matches ? matches.length + 1 : 1;
      }
      // 참조 순환 방지 함수 (자기 자신의 하위로 들어 갔을 때)
      function isDescendant(parent, target) {
          if (!parent.children) return false;
          return parent.children.some(child => child.ID === target.ID || isDescendant(child, target))
      }
      // 레벨 이동 제한 함수
      function blockMoveToLevel({ dropLevel, dragNode }) {
          const draggedMaxDepth = getMaxDepth(dragNode);
          return dropLevel + draggedMaxDepth > 2;
      }
      function getMaxDepth(node) {
          if (!node.children || node.children.length === 0) return 1;
          const childDepths = node.children.map(getMaxDepth);
          return 1 + Math.max(...childDepths);
      }
      oTreeTable.expand(oDroppedRow.getIndex()); // 옮긴 부모 트리테이블이 접혀져 있을때 자식 옮긴 후 펼침
      that._validCheckAllRows();  // 비어있는 input 있는지 전체 Row 검사 모듈함수
  },
  
  });
});
