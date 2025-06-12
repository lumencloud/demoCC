using common.card as card from './card';

namespace common;

entity card_target {
  key card      : Association to card;
  key targetSeq : String(50);
}