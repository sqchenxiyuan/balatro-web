# 牌组、难度、盲注、标签与挑战目录

调研日期：2026-11-07。以下为公开社区 Wiki 的事实表转录，保留英文名称用于稳定检索；不是原版运行验证。每条 JSON 记录包含来源 URL、页面修订号、表号和行号（表号、行号从 0 开始）。

2026-11-08 补充：[19 号文档](19-balatrohq-gap-audit.md)第 5 节增加 20 个挑战的中文校正版摘要，修正 HQ 挑战攻略里规则与初始物品的串项；完整禁用配置仍以本目录和结构化数据为准。

## 15 种牌组

来源：[Decks](https://balatrowiki.org/w/Decks)。

| 名称 | 规则 | 解锁 |
| --- | --- | --- |
| Red Deck | +1 discard every round | Unlocked from start |
| Blue Deck | +1 hand every round | Discover at least 20 items from your collection |
| Yellow Deck | Start with extra $10 | Discover at least 50 items from your collection |
| Green Deck | At end of each Round: $2 per remaining Hand $1 per remaining Discard Earn no Interest | Discover at least 75 items from your collection |
| Black Deck | +1 Joker slot -1 hand every round | Discover at least 100 items from your collection |
| Magic Deck | Start run with the Crystal Ball voucher and 2 copies of The Fool | Win a run with the Red Deck on any difficulty |
| Nebula Deck | Start run with the Telescope voucher -1 consumable slot | Win a run with the Blue Deck on any difficulty |
| Ghost Deck | Spectral cards may appear in the shop, start with a Hex card | Win a run with the Yellow Deck on any difficulty |
| Abandoned Deck | Start run with no Face Cards in your deck | Win a run with the Green Deck on any difficulty |
| Checkered Deck | Start run with 26 Spades and 26 Hearts in deck | Win a run with the Black Deck on any difficulty |
| Zodiac Deck | Start run with Tarot Merchant, Planet Merchant, and Overstock | Win a run with any deck on the Red Stake difficulty or harder |
| Painted Deck | +2 hand size, -1 Joker slot | Win a run with any deck on the Green Stake difficulty or harder |
| Anaglyph Deck | After defeating each Boss Blind, gain a Double Tag | Win a run with any deck on the Black Stake difficulty or harder |
| Plasma Deck | Balance Chips and Mult when calculating score for played hand X2 base Blind size | Win a run with any deck on the Blue Stake difficulty or harder |
| Erratic Deck | All Ranks and Suits in deck are randomized | Win a run with any deck on the Orange Stake difficulty or harder |

## 8 种难度：效果逐级累加

来源：[Stakes](https://balatrowiki.org/w/Stakes)。

| 名称 | 新增规则 | 胜利解锁牌组 |
| --- | --- | --- |
| White Stake | Base difficulty | None |
| Red Stake | Small Blind gives no reward money | Zodiac Deck |
| Green Stake | Required score scales faster for each Ante | Painted Deck |
| Black Stake | Shop can have Eternal Jokers (Can't be sold or destroyed) | Anaglyph Deck |
| Blue Stake | -1 Discard | Plasma Deck |
| Purple Stake | Required score scales faster for each Ante | None |
| Orange Stake | Shop can have Perishable Jokers (Debuffed after 5 Rounds) | Erratic Deck |
| Gold Stake | Shop can have Rental Jokers (Costs $3 per round) | None |

## 30 种盲注：2 普通 + 23 普通 Boss + 5 终局 Boss

来源：[Blinds](https://balatrowiki.org/w/Blinds)。

| 名称 | 效果 | 最低 Ante | 目标倍率 | 奖励 $ | Matador 兼容 |
| --- | --- | --- | --- | --- | --- |
| Small Blind | No special effects - can be skipped to receive a Tag | Any | 1.0 | 3 | ✗ No |
| Big Blind | No special effects - can be skipped to receive a Tag | Any | 1.5 | 4 | ✗ No |
| The Hook | Discards 2 random cards per hand played | Any | 2.0 | 5 | ✗ No |
| The Ox | Playing a (most played hand) sets money to $0 | 6 | 2.0 | 5 | ✓ Yes |
| The House | First hand is drawn face down | 2 | 2.0 | 5 | ✗ No |
| The Wall | Extra large blind | 2 | 4.0 | 5 | ✗ No |
| The Wheel | 1 in 7 cards get drawn face down | 2 | 2.0 | 5 | ✗ No |
| The Arm | Decrease level of played poker hand | 2 | 2.0 | 5 | ✓ Yes |
| The Club | All Club cards are debuffed | Any | 2.0 | 5 | ✓ Yes |
| The Fish | Cards drawn face down after each hand played | 2 | 2.0 | 5 | ✗ No |
| The Psychic | Must play 5 cards | Any | 2.0 | 5 | ✓ Yes |
| The Goad | All Spade cards are debuffed | Any | 2.0 | 5 | ✓ Yes |
| The Water | Start with 0 discards | 2 | 2.0 | 5 | ✗ No |
| The Window | All Diamond cards are debuffed | Any | 2.0 | 5 | ✓ Yes |
| The Manacle | -1 Hand Size | Any | 2.0 | 5 | ✗ No |
| The Eye | No repeat hand types this round | 3 | 2.0 | 5 | ✓ Yes |
| The Mouth | Play only 1 hand type this round | 2 | 2.0 | 5 | ✓ Yes |
| The Plant | All face cards are debuffed | 4 | 2.0 | 5 | ✓ Yes |
| The Serpent | After Play or Discard, always draw 3 cards | 5 | 2.0 | 5 | ✗ No |
| The Pillar | Cards played previously this Ante are debuffed | Any | 2.0 | 5 | ✓ Yes |
| The Needle | Play only 1 hand | 2 | 1.0 | 5 | ✗ No |
| The Head | All Heart cards are debuffed | Any | 2.0 | 5 | ✓ Yes |
| The Tooth | Lose $1 per card played | 3 | 2.0 | 5 | ✗ No |
| The Flint | Base Chips and Mult are halved | 2 | 2.0 | 5 | ✓ Yes |
| The Mark | All face cards are drawn face down | 2 | 2.0 | 5 | ✗ No |
| Amber Acorn | Flips and shuffles all Joker cards | 8 | 2.0 | 8 | ✗ No |
| Verdant Leaf | All cards debuffed until 1 Joker sold | 8 | 2.0 | 8 | ✓ Yes |
| Violet Vessel | Very large blind | 8 | 6.0 | 8 | ✗ No |
| Crimson Heart | One random Joker disabled every hand | 8 | 2.0 | 8 | ✗ No |
| Cerulean Bell | Forces 1 card to always be selected | 8 | 2.0 | 8 | ✗ No |

## 24 种跳关标签

来源：[Tags](https://balatrowiki.org/w/Tags)。

| 名称 | 效果 | Ante 限制 |
| --- | --- | --- |
| Uncommon Tag | Shop has a free Uncommon Joker | Any |
| Rare Tag | Shop has a free Rare Joker | Any |
| Negative Tag | Next base edition shop Joker is free and becomes Negative | 2+ |
| Foil Tag | Next base edition shop Joker is free and becomes Foil | Any |
| Holographic Tag | Next base edition shop Joker is free and becomes Holographic | Any |
| Polychrome Tag | Next base edition shop Joker is free and becomes Polychrome | Any |
| Investment Tag | After defeating the Boss Blind, gain $25. | Any |
| Voucher Tag | Adds one Voucher to the next shop | Any |
| Boss Tag | Rerolls the Boss Blind | Any |
| Standard Tag | Gives a free Mega Standard Pack | 2+ |
| Charm Tag | Gives a free Mega Arcana Pack | Any |
| Meteor Tag | Gives a free Mega Celestial Pack | 2+ |
| Buffoon Tag | Gives a free Mega Buffoon Pack | 2+ |
| Handy Tag | Gives $1 per played hand this run (Will give $0) | 2+ |
| Garbage Tag | Gives $1 per unused discard this run (Will give $0) | 2+ |
| Ethereal Tag | Gives a free Spectral Pack | 2+ |
| Coupon Tag | Initial cards and booster packs in next shop are free | Any |
| Double Tag | Gives a copy of the next selected Tag Double Tag excluded | Any |
| Juggle Tag | +3 hand size next round | Any |
| D6 Tag | Rerolls in next shop start at $0 | Any |
| Top-up Tag | Create up to 2 Common Jokers (Must have room) | 2+ |
| Speed Tag | Gives $5 per skipped Blind this run (Will give $5) | Any |
| Orbital Tag | Upgrade [poker hand] by 3 levels | 2+ |
| Economy Tag | Doubles your money (Max of $40) | Any |

## 20 种挑战

来源：[Challenges](https://balatrowiki.org/w/Challenges)。

| 名称 | 定制规则 | 起始道具 | 起始牌堆 | 限制 |
| --- | --- | --- | --- | --- |
| The Omelette | All Blinds give no reward money Extra Hands no longer earn money Earn no Interest at end of round | 5x Egg | Standard 52 cards | Banned Vouchers: Seed Money Money Tree Banned Jokers: To the Moon Rocket Golden Joker Satellite |
| 15 Minute City | None | Eternal Ride the Bus Eternal Shortcut | Two copies of every face card; no Aces, 2s, or 3s | None |
| Rich get Richer | Chips cannot exceed the current $ Start with $100 | Seed Money Money Tree | Standard 52 cards | None |
| On a Knife's Edge | None | Eternal, Pinned Ceremonial Dagger The Pinned Joker is always in the leftmost position | Standard 52 cards | None |
| X-ray Vision | 1 in 4 cards are drawn face down | None | Standard 52 cards | None |
| Mad World | Extra Hands no longer earn money Earn no Interest at end of round | Eternal, Negative Pareidolia Eternal Business Card | Ranks 2 through 9 only, 32 cards total | Banned Blinds: The Plant |
| Luxury Tax | Hold -1 cards in hand for every $5 you have 10 hand size | None | Standard 52 cards | None |
| Non-Perishable | All Jokers are Eternal | None | Standard 52 cards | Banned Jokers: Gros Michel, Cavendish Ice Cream; Turtle Bean, Ramen, Diet Cola; Seltzer; Popcorn, Mr. Bones, Invisible Joker and Luchador Banned Blinds: Verdant Leaf |
| Medusa | None | Eternal Marble Joker | 52 cards, with all face cards replaced by Stone cards | None |
| Double or Nothing | All Played cards become debuffed after scoring | None | Standard 52-card deck, all with a Red Seal | None |
| Typecast | When ante 4 boss is defeated: - all Jokers become eternal - set Joker slots to 0 | None | Standard 52 cards | Banned Blinds: Verdant Leaf |
| Inflation | Permanently raise prices by $1 on every purchase | Credit Card | Standard 52 cards | Banned Vouchers: Clearance Sale, Liquidation |
| Bram Poker | Jokers no longer appear in the shop | Eternal Vampire The Emperor, The Empress Magic Trick, Illusion | Standard 52 cards | None |
| Fragile | None | 2x Eternal, Negative Oops! All 6s | Standard 52-card deck, all glass | All methods of adding non-glass cards or removing glass enhancements are banned: Jokers: Marble Joker, Vampire, Midas Mask and Certificate Tarot cards: The Magician, The Empress, The Hierophant, The Chariot, The Devil, The Tower, and The Lovers Spectral cards: Incantation, Grim, and Familiar Vouchers: Magic Trick and Illusion Booster Packs: All Standard Packs Tags: Standard Tag |
| Monolith | None | Eternal Obelisk Eternal Negative Marble Joker | Standard 52 cards | None |
| Blast Off | 2 hands per round 2 discards per round 4 Joker Slots | Eternal Constellation Eternal Rocket Planet Merchant Planet Tycoon | Standard 52 cards | Banned Vouchers: Grabber, Nacho Tong Banned Jokers: Burglar |
| Five-Card Draw | 6 discards per round 5 hand size 7 Joker slots | Card Sharp Joker | Standard 52 cards | Banned Jokers: Juggler, Troubadour, Turtle Bean |
| Golden Needle | Discards each cost $1 1 hands per round 6 discards per round Start with $10 | Credit Card | Standard 52 cards | Banned Jokers: Burglar Banned Vouchers: Grabber, Nacho Tong |
| Cruelty | Small Blinds give no reward money Big Blinds give no reward money 3 Joker Slots | None | Standard 52 cards | None |
| Jokerless | Jokers no longer appear in the shop 0 Joker Slots | None | Standard 52 cards | All methods of acquiring Jokers: Tarot cards: Judgement Spectral cards: Wraith and The Soul Tags: Uncommon Tag, Rare Tag, Negative Tag, Foil Tag, Holographic Tag, Polychrome Tag, Buffoon Tag, Top-up Tag Blinds: Crimson Heart, Verdant Leaf, Amber Acorn Vouchers: Antimatter Booster Packs: All Buffoon Packs |
