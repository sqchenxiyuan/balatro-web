# 基础循环、牌型数值与计分顺序

调研日期：2026-11-07。基线与证据边界见 [README](README.md)。

## 一局在做什么

每个 Ante 有 Small Blind、Big Blind、Boss Blind 三关。进入盲注后，玩家用有限次数的出牌和弃牌达到该关累计分数目标。击败盲注后结算收入、进入商店，再选择下一关；击败 Ante 8 的终局 Boss 即赢得标准局，可以继续 Endless。

Small / Big Blind 可以跳过并取得 Tag，但这会放弃该关正常战斗后的收入和商店访问。Boss 不能普通跳过。**每个盲注的得分从 0 开始，跨盲注保留牌堆改造、Joker、资金、牌型等级与已购优惠券。**

来源：[Blinds](https://balatrowiki.org/w/Blinds)、[Shop](https://balatrowiki.org/w/Shop)、[Tags](https://balatrowiki.org/w/Tags)。

## 初始参数

以下是通常的基础配置，牌组、挑战和难度再施加修正。

| 参数 | 基础值 | 说明 |
| --- | --- | --- |
| 扑克牌 | 52 张 | 4 花色 × 13 点数，可在局内增删、复制、改造 |
| 手牌上限 Hand size | 8 | 指手里通常持有几张，不是出牌次数 |
| 每次选牌 | 1–5 张 | 用于出牌或一次标准弃牌 |
| 每关出牌次数 Hands | 4 | Blue Deck 为 5，Black Deck 为 3 |
| 每关弃牌次数 Discards | 3 | Red Deck 额外 +1，因此白注红牌组通常为 4 |
| Joker 槽位 | 5 | Joker 不混进 52 张抽牌堆 |
| 消耗品槽位 | 2 | 普通塔罗、星球等可留待使用；牌组可改变 |
| 起始金钱 | $4 | Yellow Deck 额外 +$10，共 $14 |
| 每种牌型初始等级 | 1 | 每次新开局重置 |

来源：[Playing cards](https://balatrowiki.org/w/Playing_cards)、[Hand size](https://balatrowiki.org/w/Hand_size)、[Hand](https://balatrowiki.org/w/Hand)、[Discard](https://balatrowiki.org/w/Discard)、[Jokers](https://balatrowiki.org/w/Jokers)、[Decks](https://balatrowiki.org/w/Decks)、[Money](https://balatrowiki.org/w/Money)。基础消耗品槽位还可由 Nebula Deck、Crystal Ball 等规则交叉核对。

通常在出牌或弃牌后从剩余牌堆补到手牌上限；牌堆不足时仅抽取剩余牌。The Serpent 是重要例外：每次出牌/弃牌后固定抽 3 张，忽略常规手牌上限。不能擅自加入“牌堆耗尽后自动重洗”的规则。[来源](https://balatrowiki.org/w/Hand_size)

## 十二种牌型与星球升级

以下按识别优先级由低到高排列。若一手符合多种牌型，采用规则中优先级更高的类型，**不是选择当前等级下得分最高的类型**。

| 牌型 | English | Lv.1 筹码 | Lv.1 倍率 | 每级 +筹码 | 每级 +倍率 | 星球 |
| --- | --- | --- | --- | --- | --- | --- |
| 高牌 | High Card | 5 | 1 | 10 | 1 | Pluto |
| 对子 | Pair | 10 | 2 | 15 | 1 | Mercury |
| 两对 | Two Pair | 20 | 2 | 20 | 1 | Uranus |
| 三条 | Three of a Kind | 30 | 3 | 20 | 2 | Venus |
| 顺子 | Straight | 30 | 4 | 30 | 3 | Saturn |
| 同花 | Flush | 35 | 4 | 15 | 2 | Jupiter |
| 葫芦 | Full House | 40 | 4 | 25 | 2 | Earth |
| 四条 | Four of a Kind | 60 | 7 | 30 | 3 | Mars |
| 同花顺 | Straight Flush | 100 | 8 | 40 | 4 | Neptune |
| 五条 | Five of a Kind | 120 | 12 | 35 | 3 | Planet X |
| 同花葫芦 | Flush House | 140 | 14 | 40 | 4 | Ceres |
| 同花五条 | Flush Five | 160 | 16 | 50 | 3 | Eris |

来源：[Poker hands](https://balatrowiki.org/w/Poker_hands)、[Planet cards](https://balatrowiki.org/w/Planet_cards)。顺子、同花顺、同花葫芦、同花五条的成长值已与官方 1.0.1f 补丁交叉核对。

牌型等级为 L 时，常规基础参数是：

```text
hand_chips(L) = chips_at_level_1 + (L - 1) × chips_per_level
hand_mult(L)  = mult_at_level_1  + (L - 1) × mult_per_level
```

例如 Lv.3 顺子基础为 `90 Chips × 10 Mult`，还未计入具体卡牌的筹码。

皇家同花顺 A–K–Q–J–10 使用同花顺的等级和基础参数。五条、同花葫芦、同花五条是三个隐藏牌型：通过复制/改牌等方式组成，本局打出后才使相应星球进入通常的生成范围；Black Hole 可以在发现前提升这些牌型的等级。

## 牌型参与牌与实际出牌必须分开

普通牌提供的基础筹码：2–10 按牌面值；J/Q/K 各 10；A 为 11。A 在顺子中可当低端，但其筹码仍为 11；不能把 Q–K–A–2–3 当普通连续顺子。

例如打出 `A A K 7 2`，牌型是对子，通常只有两张 A 计分，K/7/2 只是随同打出。牌型基础为 10 筹码、2 倍率，因此无其他效果时为：

```text
(10 + 11 + 11) × 2 = 64
```

**played cards、scoring cards、held cards 是三个不同集合。** Splash 可以让全部出牌参与计分；Stone card 通常即使不参与牌型也能计分。Four Fingers、Shortcut、Smeared Joker 又会改变组合识别，不能用普通扑克库的结果替代全部规则。

来源：[Chips](https://balatrowiki.org/w/Chips)、[Poker hands](https://balatrowiki.org/w/Poker_hands)、[Jokers](https://balatrowiki.org/w/Jokers)。

## 计分触发顺序

依据社区 [Scoring / Activation Sequence](https://balatrowiki.org/w/Scoring) 指南整理。它是后续实机对照的预期顺序，不是本次运行验证结果。

1. 判断牌型、计分牌和相应 Boss 限制，应用 The Flint、The Arm 等出牌前效果。
2. 处理 On played 阶段，例如 Green Joker 成长、DNA、To Do List。
3. 从左到右处理实际计分的出牌。每张牌先加基础筹码（Bonus/Hiker 筹码计入相应值），再处理强化、蜡封、版本和该牌触发的 On scored Joker；同一阶段的 Joker 按从左到右执行。
4. 处理该牌的重触发：重复卡牌计分及与该牌对应的 On scored 效果。多个重触发来源按额外次数累加。
5. 从左到右处理留在手中的牌：Steel、Baron、Shoot the Moon 等留手效果，以及 Red Seal / Mime 引起的留手重触发。
6. 从左到右处理 Joker 的独立计分。每张先处理 Foil/Holographic，再处理自身独立效果、Baseball Card 等关联其他 Joker 的效果，最后处理该 Joker 的 Polychrome。
7. 若有 Observatory，处理与本手牌型对应的留存星球带来的每张 ×1.5。
8. 若为 Plasma Deck，平衡 Chips 与 Mult，之后形成手牌分数，加入本关累计分数。
9. 完成手牌后的销毁、成长和胜负流程；例如玻璃碎裂不能放进每次重触发中重复抽签。

“加法 Joker 放乘法 Joker 左边”只在相关效果的触发阶段中适用。不能把所有 +Mult 提前统一相加，再统一处理所有 ×Mult。

### 顺序算例

假定进入独立 Joker 阶段时已有 `40 Chips × 4 Mult`：

```text
左边 +4 Mult，右边 ×2 Mult：40 × ((4 + 4) × 2) = 640
左边 ×2 Mult，右边 +4 Mult：40 × ((4 × 2) + 4) = 480
```

### 重触发算例

在满足各自条件时，同一张计分牌同时有 Red Seal、Hanging Chad、一个额外重触发 Joker：

```text
总计分次数 = 原本 1 次 + Red Seal 1 次 + Hanging Chad 2 次 + 其他 1 次 = 5 次
```

若第一张计分牌是 Glass card，仅 Hanging Chad 就可让其 ×2 效果执行三次，即 `2³ = ×8`；但玻璃在整手计分完成后才按破碎规则检查，重触发不会把 1/4 碎裂抽签重复三次。[Glass cards](https://balatrowiki.org/w/Glass_cards)

### Plasma Deck

```text
普通牌组：score = Chips × Mult
Plasma： score = ((Chips + Mult) / 2)²
```

例如 `70 Chips × 4 Mult` 在普通牌组是 280，在 Plasma 是 `37² = 1,369`；作为代价，Plasma 的盲注目标翻倍。小数、取整和极大数显示的精确实现仍应在原版对照中固定。[Plasma Deck](https://balatrowiki.org/w/Plasma_Deck)
