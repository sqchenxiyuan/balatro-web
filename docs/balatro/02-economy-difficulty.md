# 经济、商店、概率与难度增长

调研日期：2026-11-07。使用 1.0.1 系列规则，完整目录见 [06](06-decks-blinds-progression.md)、[07](07-modifiers-packs.md)。

## 收入与利息

| 项目 | 通常数值 |
| --- | --- |
| Small Blind 奖励 | $3；红注及以上为 $0 |
| Big Blind 奖励 | $4 |
| 普通 Boss 奖励 | $5 |
| 终局 Boss 奖励 | $8 |
| 每次剩余出牌 | $1 |
| 常规利息 | 每持有 $5，得 $1；基础上限 $5 |
| Green Deck | 每次剩余出牌 $2、每次剩余弃牌 $1，不得利息 |
| Seed Money / Money Tree | 将利息上限提高至 $10 / $20 |

基础利息可写为 `min(5, floor(max(0, eligible_money) / 5))`。到 $25 才吃满通常利息，$24 得 $4、$25 得 $5、$100 在没有相关加成时仍为 $5。

**eligible_money 是该轮正确结算时点的资金，不是把 Cash Out 所有收入加完后的金额。** Gold cards、Reserved Parking 等在回合结束前给的钱可影响本轮利息；Golden Joker、Rocket 等在 Cash Out 中支付的钱不计入本轮利息本金。Rental 的 $3 在回合 payout 之前扣除。实现时要把“回合结束效果”和“收款清单”拆开。

来源：[Money](https://balatrowiki.org/w/Money)、[Interest](https://balatrowiki.org/w/Interest)、[Rental](https://balatrowiki.org/w/Rental)。特殊场景中的逐项执行时点仍需原版固定案例复验。

## 商店结构与刷新

通常商店有 **2 个随机卡槽、2 个补充包槽、1 个优惠券位**。第一家商店保证含一个 Normal Buffoon Pack，Jokerless 等挑战有例外。

- 商店刷新初始 $5，每刷新一次涨 $1，进入新商店重置。Reroll Surplus / Reroll Glut 将初始价格降到 $3 / $1。
- 刷新只重置随机卡槽，**不补货补充包与优惠券**。
- 补充包进入新商店才重置；优惠券按 Ante 更新。买过优惠券的同一 Ante 后续商店不会普通刷新出下一张。
- 通常不能再次生成当前已持有的同名 Joker；Showman 等规则可改变重复限制。概率采样必须经过解锁、持有和内容池资格检查。

来源：[Shop](https://balatrowiki.org/w/Shop)、[Jokers](https://balatrowiki.org/w/Jokers)。

## 基础价格与卖价

| 内容 | 基础价格 |
| --- | --- |
| Common Joker | $1–6，具体按卡定义 |
| Uncommon Joker | $4–8 |
| Rare Joker | $7–10 |
| Legendary Joker | 不在商店普通出售；通用经济定义的基础价为 $20 |
| 塔罗 / 星球 | 各 $3 |
| 幻灵 | $4；普通商店不出现，Ghost Deck 等规则例外 |
| 普通扑克牌 | $1；需 Magic Trick 等开启 |
| Normal / Jumbo / Mega Pack | $4 / $6 / $8 |
| 优惠券 | $10 |

版本附加价：Foil +$2、Holographic +$3、Polychrome +$5、Negative +$5。Rental Joker 的购买价最终设为 $1。

按社区商店条目的详细定价规则：

```text
raw = (基础价 + 版本附加价 + Inflation 加价) × 折扣系数
normal_buy_price = max(1, round_half_down(raw))
之后再应用 Astronomer / Coupon Tag / Rental 等特殊规则

sell_price = max(1, floor(重新计算后的购买价 / 2)) + Egg/Gift Card 等额外卖价
```

`round_half_down` 的 .5 向下，例如 8.5 → 8；不要使用编程语言默认的银行家舍入。Clearance Sale / Liquidation 的折扣系数为 0.75 / 0.5，卖价也会受到重新计算价格的影响。额外卖价在折扣之后加入。

来源：[Shop](https://balatrowiki.org/w/Shop)。商店 Wiki 对该算法注明参考 1.0.1f；本次没有读取原版程序。

## 随机卡槽权重

| 类别 | 基础权重 | 仅默认三类时概率 |
| --- | --- | --- |
| Joker | 20 | 20/28 ≈ 71.43% |
| 塔罗 | 4 | 4/28 ≈ 14.29% |
| 星球 | 4 | 4/28 ≈ 14.29% |

Magic Trick 增加普通扑克牌权重 4；Ghost Deck 增加幻灵权重 2。Tarot Merchant / Tycoon 将塔罗权重分别设为 9.6 / 32，Planet 对应券同理。券文字的“2X / 4X 更频繁”不等于简单将基础概率乘 2 / 4，采样应使用更新后的权重重新归一化。

**在已经决定生成 Joker 的条件下**，Common / Uncommon / Rare 为 **70% / 25% / 5%**；Legendary 不参与这次普通稀有度抽取。不能把 5% Rare 解读为每个商店卡槽都有 5% Rare。

The Soul 在 Arcana / Spectral Pack 的每个合适卡位有 0.3% 替换机会，而不是每次整包只有 0.3%。它创建 Legendary；Black Hole 是幻灵类别，虽可出现在星球包中，仍不算星球牌。

来源：[Shop](https://balatrowiki.org/w/Shop)、[Jokers](https://balatrowiki.org/w/Jokers)、[The Soul](https://balatrowiki.org/w/The_Soul)、[Black Hole](https://balatrowiki.org/w/Black_Hole)。

## 补充包规格与权重

| 类别 | Normal $4 | Jumbo $6 | Mega $8 |
| --- | --- | --- | --- |
| Arcana / Celestial / Standard | 3 选 1 | 5 选 1 | 5 选 2 |
| Buffoon / Spectral | 2 选 1 | 4 选 1 | 4 选 2 |

Standard 把卡加入永久牌堆，Buffoon 加 Joker；其余主要当场使用。Arcana / Spectral 开包会临时发一手牌作为施法目标，不能将其中卡牌一律塞进消耗品栏。

| 类别 | Normal 权重 | Jumbo 权重 | Mega 权重 | 合计权重 |
| --- | --- | --- | --- | --- |
| Standard | 4 | 2 | 0.5 | 6.5 |
| Arcana | 4 | 2 | 0.5 | 6.5 |
| Celestial | 4 | 2 | 0.5 | 6.5 |
| Buffoon | 1.2 | 0.6 | 0.15 | 1.95 |
| Spectral | 0.6 | 0.3 | 0.07 | 0.97 |

总权重 22.42。前三类各约 28.99%，Buffoon 约 8.70%，Spectral 约 4.33%；第一家商店保证包、挑战禁用、标签生成属于额外规则。

来源：[Booster Packs](https://balatrowiki.org/w/Booster_Packs)。

## Ante 1–8 目标分数

下表的三列是不同难度段使用的**基础盲注分数**。Small ×1，Big ×1.5，通常 Boss ×2；The Needle ×1，The Wall ×4，Violet Vessel ×6。Plasma Deck 再将盲注目标 ×2。

| Ante | 白 / 红注 | 绿 / 黑 / 蓝注 | 紫 / 橙 / 金注 |
| --- | --- | --- | --- |
| 1 | 300 | 300 | 300 |
| 2 | 800 | 900 | 1,000 |
| 3 | 2,000 | 2,600 | 3,200 |
| 4 | 5,000 | 8,000 | 9,000 |
| 5 | 11,000 | 20,000 | 25,000 |
| 6 | 20,000 | 36,000 | 60,000 |
| 7 | 35,000 | 60,000 | 110,000 |
| 8 | 50,000 | 100,000 | 200,000 |

白注 Ante 8：Small 50,000、Big 75,000、通常终局 Boss 100,000、Violet Vessel 300,000。不能把普通终局 Boss 的分数写成固定 50,000。

Endless 的 Ante 9 以后增长表已保存在 `data/source-pages.json` 的 `Blinds` 第 1 张表中，但高 Ante 是科学计数法展示近似值；本次结构化目录只将 Ante 1–8 作为可直接使用的精确分数表，不能据近似展示值猜测原版的增长与取整公式。

来源：[Blinds](https://balatrowiki.org/w/Blinds)，与官方 1.0.1f Ante 调整逐项交叉核对。

## 八个难度的新增规则

高难度**累加继承**之前的限制。这里的贴纸是影响 Joker 功能的贴纸，与收藏界面的通关难度徽章不同。

| 难度 | 新增规则 |
| --- | --- |
| White | 基础 |
| Red | Small Blind 没有盲注奖励金；其他收入不是全部归零 |
| Green | 第一次提高 Ante 增长 |
| Black | 合格 Joker 可带 Eternal，不能出售或销毁 |
| Blue | 每关弃牌次数 -1 |
| Purple | 再次提高 Ante 增长 |
| Orange | 合格 Joker 可带 Perishable，5 个回合后失效 |
| Gold | Joker 可带 Rental，买入 $1，每回合扣 $3 |

本系列中 Eternal、Perishable、Rental 的标称出现率各为 30%，但 **Eternal 与 Perishable 互斥**，还存在 Joker 兼容名单；Rental 可叠加。不能把三种贴纸当作对所有 Joker 都独立的三次 30% 掷骰。

官方 1.0.1f 已移除旧橙注的“补充包随 Ante 涨价”和旧金注的“-1 手牌上限”。保留旧规则会导致经济与构筑难度偏离本次基线。

来源：[Stakes](https://balatrowiki.org/w/Stakes)、[Eternal](https://balatrowiki.org/w/Eternal)、[Perishable](https://balatrowiki.org/w/Perishable)、[Rental](https://balatrowiki.org/w/Rental)、官方补丁快照。
