using common.card as card from './card';

namespace common;

entity card_image {
  key card      : Association to card;
  key dmsFileId    : String(50);
      actionType   : String(50);
      dmsFileIdSet : String(50);
      actionUrl    : String(200);
}