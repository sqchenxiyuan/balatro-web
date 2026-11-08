# 消耗品与优惠券完整目录

调研日期：2026-11-07。以下为公开社区 Wiki 的事实表转录，保留英文名称用于稳定检索；不是原版运行验证。每条 JSON 记录包含来源 URL、页面修订号、表号和行号（表号、行号从 0 开始）。

2026-11-08 补充：[19 号文档](19-balatrohq-gap-audit.md)第 4 节增加 16 组升级券收藏条件的中文对照，并核对 HQ 的差异；收藏解锁和本局兑换前置分开。消耗品实际实现范围见 [18](18-consumables-support.md)。

## 塔罗牌：22 张

来源：[Tarot_cards](https://balatrowiki.org/w/Tarot_cards)。

| 名称 | 效果 / 数值 |
| --- | --- |
| The Fool | Creates the last Tarot or Planet card used during this run The Fool excluded |
| The Magician | Enhances 2 selected cards to Lucky Cards |
| The High Priestess | Creates up to 2 random Planet cards (Must have room) |
| The Empress | Enhances 2 selected cards to Mult Cards |
| The Emperor | Creates up to 2 random Tarot cards (Must have room) |
| The Hierophant | Enhances 2 selected cards to Bonus Cards |
| The Lovers | Enhances 1 selected card into a Wild Card |
| The Chariot | Enhances 1 selected card into a Steel Card |
| Justice | Enhances 1 selected card into a Glass Card |
| The Hermit | Doubles money (Max of $20) |
| The Wheel of Fortune | 1 in 4 chance to add Foil, Holographic, or Polychrome edition to a random Joker |
| Strength | Increases rank of up to 2 selected cards by 1 |
| The Hanged Man | Destroys up to 2 selected cards |
| Death | Select 2 cards, convert the left card into the right card (Drag to rearrange) |
| Temperance | Gives the total sell value of all current Jokers (Max of $50) |
| The Devil | Enhances 1 selected card into a Gold Card |
| The Tower | Enhances 1 selected card into a Stone Card |
| The Star | Converts up to 3 selected cards to Diamonds |
| The Moon | Converts up to 3 selected cards to Clubs |
| The Sun | Converts up to 3 selected cards to Hearts |
| Judgement | Creates a random Joker card (Must have room) |
| The World | Converts up to 3 selected cards to Spades |

## 星球牌：12 张

来源：[Planet_cards](https://balatrowiki.org/w/Planet_cards)。

| 名称 | 效果 / 数值 |
| --- | --- |
| Pluto | Increases High Card hand value by +1 Mult and +10 Chips |
| Mercury | Increases Pair hand value by +1 Mult and +15 Chips |
| Uranus | Increases Two Pair hand value by +1 Mult and +20 Chips |
| Venus | Increases Three of a Kind hand value by +2 Mult and +20 Chips |
| Saturn | Increases Straight hand value by +3 Mult and +30 Chips |
| Jupiter | Increases Flush hand value by +2 Mult and +15 Chips |
| Earth | Increases Full House hand value by +2 Mult and +25 Chips |
| Mars | Increases Four of a Kind hand value by +3 Mult and +30 Chips |
| Neptune | Increases Straight Flush hand value by +4 Mult and +40 Chips |
| Planet X | Increases Five of a Kind hand value by +3 Mult and +35 Chips |
| Ceres | Increases Flush House hand value by +4 Mult and +40 Chips |
| Eris | Increases Flush Five hand value by +3 Mult and +50 Chips |

## 幻灵牌：18 张

来源：[Spectral_cards](https://balatrowiki.org/w/Spectral_cards)。

| 名称 | 效果 / 数值 |
| --- | --- |
| Familiar | Destroy 1 random card in your hand, add 3 random Enhanced face cards to your hand |
| Grim | Destroy 1 random card in your hand, add 2 random Enhanced Aces to your hand |
| Incantation | Destroy 1 random card in your hand, add 4 random Enhanced numbered cards to your hand |
| Talisman | Add a Gold Seal to 1 selected card in your hand |
| Aura | Add Foil, Holographic, or Polychrome effect to 1 selected card in hand |
| Wraith | Creates a random Rare Joker, sets money to $0 |
| Sigil | Converts all cards in hand to a single random suit |
| Ouija | Converts all cards in hand to a single random rank -1 hand size |
| Ectoplasm | Add Negative to a random Joker, -1 hand size |
| Immolate | Destroys 5 random cards in hand, gain $20 |
| Ankh | Create a copy of a random Joker, destroy all other Jokers (Removes Negative from copy) |
| Deja Vu | Add a Red Seal to 1 selected card in your hand |
| Hex | Add Polychrome to a random Joker, destroy all other Jokers |
| Trance | Add a Blue Seal to 1 selected card in your hand |
| Medium | Add a Purple Seal to 1 selected card in your hand |
| Cryptid | Create 2 copies of 1 selected card in your hand |
| The Soul | Creates a Legendary Joker (Must have room) |
| Black Hole | Upgrade every poker hand by 1 level |

## 优惠券：32 张，16 组基础 / 升级

来源：[Vouchers](https://balatrowiki.org/w/Vouchers)。基础价格均为 $10；二级券需满足收藏解锁，并在该局买入对应一级券后进入可选池。Notes 中可能包含社区记录的版本缺陷，实施前应实机核对。

| 名称 | 层级 | 前置券 | 效果 | 收藏解锁 | 备注 |
| --- | --- | --- | --- | --- | --- |
| Overstock | 1 | — | +1 card slot available in shop | Base voucher | Also immediately restocks any empty card slots in the Shop when purchased. |
| Overstock Plus | 2 | overstock | +1 card slot available in shop | Spend a total of $2500 at the shop | Also immediately restocks any empty card slots in the Shop when purchased. |
| Clearance Sale | 1 | — | All cards and packs in shop are 25% off | Base voucher | Also reduces the sell value of your present jokers Prices are rounded half down |
| Liquidation | 2 | clearance_sale | All cards and packs in shop are 50% off | Redeem at least 10 Voucher cards in one run | Also reduces the sell value of your present jokers Prices are rounded half down |
| Hone | 1 | — | Foil, Holographic, and Polychrome cards appear 2X more often | Base voucher | Polychrome on Jokers actually appears 3x more often for Hone and 7x more often for Glow Up |
| Glow Up | 2 | hone | Foil, Holographic, and Polychrome cards appear 4X more often | Have at least 5 Joker cards with Foil, Holographic, or Polychrome (or Negative) effect | Polychrome on Jokers actually appears 3x more often for Hone and 7x more often for Glow Up |
| Reroll Surplus | 1 | — | Rerolls cost $2 less | Base voucher |  |
| Reroll Glut | 2 | reroll_surplus | Rerolls cost an additional $2 less | Reroll the shop a total of 100 times |  |
| Crystal Ball | 1 | — | +1 consumable slot | Base voucher | Omen Globe has a 20% individual chance to replace the Tarot card with a Spectral card for every card in the Arcana Pack |
| Omen Globe | 2 | crystal_ball | Spectral cards may appear in any of the Arcana Packs | Use a total of 25 Tarot cards from booster packs | Omen Globe has a 20% individual chance to replace the Tarot card with a Spectral card for every card in the Arcana Pack |
| Telescope | 1 | — | Celestial Packs always contain the Planet card for your most played poker hand | Base voucher | Telescope picks the higher tier hand in case of multiple most played hands |
| Observatory | 2 | telescope | Planet cards in your consumable area give X1.5 Mult for their specified poker hand | Use a total of 25 Planet cards from any Celestial Pack | Telescope picks the higher tier hand in case of multiple most played hands |
| Grabber | 1 | — | Permanently gain +1 hand per round | Base voucher |  |
| Nacho Tong | 2 | grabber | Permanently gain an additional +1 hand per round | Play a total of 2,500 cards |  |
| Wasteful | 1 | — | Permanently gain +1 discard each round | Base voucher |  |
| Recyclomancy | 2 | wasteful | Permanently gain an additional +1 discard each round | Discard a total of 2500 cards |  |
| Tarot Merchant | 1 | — | Tarot cards appear 2X more frequently in the shop | Base voucher |  |
| Tarot Tycoon | 2 | tarot_merchant | Tarot cards appear 4X more frequently in the shop | Buy a total of 50 Tarot cards from the shop |  |
| Planet Merchant | 1 | — | Planet cards appear 2X more frequently in the shop | Base voucher |  |
| Planet Tycoon | 2 | planet_merchant | Planet cards appear 4X more frequently in the shop | Buy a total of 50 Planet cards from the shop |  |
| Seed Money | 1 | — | Raise the cap on interest earned in each round to $10 | Base voucher | Does nothing when playing on Green Deck or the Mad World challenge. |
| Money Tree | 2 | seed_money | Raise the cap on interest earned in each round to $20 | Max out the interest per round earnings for ten consecutive rounds | Does nothing when playing on Green Deck or the Mad World challenge. |
| Blank | 1 | — | Does nothing? | Base voucher | If all vouchers have been purchased in a run, Blank will appear in the shop. |
| Antimatter | 2 | blank | +1 Joker Slot | Redeem Blank 10 total times | If all vouchers have been purchased in a run, Blank will appear in the shop. |
| Magic Trick | 1 | — | Playing cards can be purchased from the shop | Base voucher | Illusion is currently (v1.0.1o-FULL) bugged, and cards in the shop cannot have seals, only enhancements and/or editions, and is unaffected by Hone/Glow Up. |
| Illusion | 2 | magic_trick | Playing cards in shop may have an Enhancement, Edition, and/or a Seal | Buy a total of 20 Playing cards from the shop | Illusion is currently (v1.0.1o-FULL) bugged, and cards in the shop cannot have seals, only enhancements and/or editions, and is unaffected by Hone/Glow Up. |
| Hieroglyph | 1 | — | -1 Ante, -1 hand each round | Base voucher |  |
| Petroglyph | 2 | hieroglyph | -1 Ante, -1 discard each round | Reach Ante 12 |  |
| Director's Cut | 1 | — | Reroll Boss Blind 1 time per Ante, $10 per roll | Base voucher |  |
| Retcon | 2 | director_s_cut | Reroll Boss Blind unlimited times, $10 per roll | Discover 25 Blinds |  |
| Paint Brush | 1 | — | +1 hand size | Base voucher |  |
| Palette | 2 | paint_brush | +1 hand size | Reduce your hand size down to five cards. |  |
