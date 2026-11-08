# 消耗品：52 张卡图、交互与规则接入

更新：2026-11-08。本轮在现有浏览器视觉交互样片内接入全部消耗牌的使用效果；样片仍不等于完整 Balatro。没有增加服务端、订阅接口或策略平台。

## 如何确认

打开 [商店](http://127.0.0.1:5192/#shop)：右上消耗品槽中已有木星。点击卡牌，显示「使用 / 出售」。商店购买的目标型消耗牌需要到下一回合选择手牌后使用。

点击商店右侧或牌桌上的「消耗品图鉴」，可查看 **塔罗 22、星球 12、幻灵 18** 张独立原版参考卡图，按类别、中文名、英文名和效果筛选。每张都有「加入试用槽」；这是明确标出的免费调试操作，满槽时会拒绝，已有局面会保留。「返回当前局」回到原来的牌桌或商店。

物料页增加独立「消耗品 52」页签；原来的 150 小丑、65 其他物料、16 修饰仍分别保留。65 其他物料中的两张通用消耗牌是旧自绘研究稿，实际游戏槽位、商店和开包使用新收录的 52 张独立卡图。

商店现在有天体包、幻术包、幻灵包。前两种为 3 选 1，幻灵包为 2 选 1。包内牌直接使用，不占消耗品库存槽；生成其他消耗牌时仍检查库存空间。保留像素包装、撕封、错峰出现、速度设置与减少动态支持。

## 实际规则范围

| 类别 | 已接入行为 |
| --- | --- |
| 塔罗 22 | 8 类增强、4 类花色转换、升点数、毁牌、死神完整复制、生成消耗牌/小丑、金钱、命运之轮、愚者历史 |
| 星球 12 | 所有 12 种计分牌型的永久等级与筹码/倍率增长，含五条、同花葫芦、同花五条 |
| 幻灵 18 | 随机毁牌/造牌、4 蜡封、随机版本、全手花色/点数转换、负片和递增手牌惩罚、小丑复制/摧毁/生成、神秘生物复制、黑洞全牌型升级 |
| 8 增强 | 奖励 +30 筹码、倍率 +4、万能任意花色、玻璃 ×2 与破碎、留手钢铁 ×1.5、无花色点数且始终计分的石头 +50、回合末黄金 $3、幸运的两次独立概率 |
| 版本 | 扑克牌与小丑的闪箔 +50、镭射 +10、多彩 ×1.5；负片增加对应槽位 |
| 蜡封 | 金封计分 $3；红封重触打出与适用留手效果；蓝封回合末生成最后牌型对应星球；紫封被弃时生成塔罗。生成均受槽位限制 |
| 牌组 | 从 52 张实体牌建立抽牌堆、手牌、出牌堆、弃牌堆；复制/摧毁永久改变本局牌组，弃牌后抽取真实牌，跨商店/回合保留修饰 |

关键约束与细节：

- 死神按**手牌中的左右位置**复制，和 `cardIds` 参数顺序无关。复制点数、花色、增强、版本、蜡封；保留被改造牌的实例 ID，来源没有的修饰也会清除。
- 力量将 A 变为 2。增强、版本、蜡封分别最多一种；改增强不会抹掉蜡封或版本。
- 光环只接受基础版本扑克牌；命运之轮、灵质和妖法只选基础版本小丑。光环/命运之轮生成的版本权重为闪箔 50%、镭射 35%、多彩 15%；命运之轮另有独立的 1/4 成功率。
- 灵质使用次数依次造成手牌上限 −1、−2、−3……，不是每次都 −1。
- 使魔、严峻、咒语、火祭至少需要 2 张手牌；火祭不足 5 张时摧毁现有手牌，仍获得 $20。生成增强牌时不生成石头牌，也不顺带生成版本/蜡封。
- 生命十字章需要一个空小丑槽，保留原小丑并复制，复制体去除负片；其余小丑被摧毁。
- 愚者记录最后使用的非愚者塔罗或星球；幻灵不覆盖这段历史。库存使用前先释放自身槽位，再判断生成空间。
- 黑洞升级所有 12 种计分牌型，但不直接解锁隐藏星球的随机掉落池。隐藏牌型实际打出后才进入对应星球池。
- 灵魂可在幻术/幻灵包中替代普通候选，黑洞可在天体/幻灵包中替代普通候选，各为每槽 0.3%；普通生成效果不生成这两张。
- 得分达到本样片的小盲注要求，或出牌次数用尽时，结算留手黄金和蓝封；只结算一次。随后「前往商店 → 下一回合」会用实际剩余牌组洗牌。还没有完整的胜负、盲注递进和奖励经济系统。

## 小丑牌依赖边界

完整 150 张小丑仍是参考图鉴，**没有实现全部 150 张能力**。审判、幽灵、灵魂会实际生成小丑，但生成池限于以下 16 种样片支持卡牌，不能作为原版完整抽取池来测胜率：

- 普通/罕见：小丑、狡猾小丑、半张小丑。
- 稀有池 8：蓝图、头脑风暴、二重奏、三重奏、一家人、秩序、部落、男爵。
- 传奇池 5：卡尼奥、特里布莱、约里克、奇科、佩尔科。

蓝图/头脑风暴有循环复制保护；男爵、特里布莱、卡尼奥毁人头成长、约里克每弃 23 张成长、佩尔科离店复制负片消耗牌均有规则。奇科保留原有的 Boss 限定语义，当前没有 Boss 系统可让它发挥效果；不提供虚构的加分。

不含优惠券、永恒/易腐/租用等小丑贴纸、所有盲注和完整牌组/注码系统；这些不是消耗品目录的一部分。随机数使用样片自己的可复现算法，不兼容原版同名种子。

## 操作接口

继续只暴露 `window.balatro.getState()` 与 `dispatch(action)`。状态版本提升为 `lookdev/2`，仍有 `isDemo: true`。

新状态字段：

- `consumables: { id, kind, edition? }[]`，替代旧的 `['planet', 'tarot']` 占位字符串。
- `consumableCatalog`：52 个稳定定义 ID、名称、类别、规则说明、图片路径、目标数量和星球对应牌型。
- `limits.consumables / limits.jokers`：计入负片后的槽位数。
- `handLevels`：全部 12 种计分牌型等级。
- `hand / drawPile / playedPile / discardPile`：真实牌实体，每张可带 `enhancement / edition / seal`。
- `handSize / ectoplasmUses / lastUsedConsumable / lastHand / roundEnded / round / lastEffect`。
- `rngState` 用于检查可复现性；读取状态返回深拷贝。

新增动作：

| 动作 | 参数与说明 |
| --- | --- |
| `use_consumable` | `consumableId` 为库存实例 ID；可传 `cardIds`，省略则使用当前选牌 |
| `sell_consumable` | `consumableId`；出售一次后移除实例 |
| `sell_joker` | `jokerId`；释放槽位，节制也使用同一出售价值算法 |
| `grant_consumable` | `kind` 为目录定义 ID；**样片免费试用专用**，不会成为正式经济中的免费领取 |
| `enter_shop` | 仅限 `round_end`；之后使用既有 `next_round` |
| `new_game` | 可选 `seed`，1–4294967295 的整数；用于本样片复现，不对应原版种子 |

既有 `open_pack` 增加 `offerId: 'spectral'`；实际候选见 `packOptions`。`pick_pack` 的 `optionId` 是该数组索引，也可传目标 `cardIds`。错误目标、错误阶段、满槽、重复使用/出售都返回 `{ ok: false, error, revision }`，不扣牌、不扣钱、不推进随机状态或修订号。

示例（在牌桌运行）：

```js
const game = window.balatro;
await game.dispatch({ type: 'new_game', seed: 12345 });
await game.dispatch({ type: 'grant_consumable', kind: 'justice' });
const card = game.getState().consumables.find(c => c.kind === 'justice');
await game.dispatch({
  type: 'use_consumable',
  consumableId: card.id,
  cardIds: ['h-10'],
});
console.log(game.getState().hand.find(c => c.id === 'h-10').enhancement); // glass
await game.dispatch({ type: 'play_hand', cardIds: ['h-10', 'c-10'] });
```

消耗牌效果在不依赖 DOM 的 `src/consumable-engine.ts` 与 `src/scoring.ts` 中计算，网页仍按现有方式播放计分动画；没有新增网络调用。`dispatch(play_hand)` 仍会等待整段动画完成，尚未提供最终策略平台的批量执行适配。

## 验证与证据

```powershell
npm run build
npm run test:rules
npm run test:consumables
npm run test:browser
```

- 规则验证 83 项：覆盖全部 52 张、独立数值断言、复制/销毁、跨回合、失败事务与随机概率。
- 消耗品浏览器验证 66 项：通过公开 API 逐张使用全部 52 张，以及真实鼠标选牌、试用、使用、出售、跨回合与布局检查。
- 原有浏览器回归 51 项：背景流动、四种版本、玻璃、透明轮廓、所有小丑卡图、拖拽和开包动效等。
- 报告：`research/consumable-rules-verification.json`、`consumable-browser-verification.json`、`browser-verification.json`。
- 截图：同目录 `previews/consumables-catalog.png`、`consumables-targeting.png`、`consumable-glass-edition-seal.png`、`consumable-spectral-pack.png`。

自动检查证明的是本样片行为和公开资料规则的一致性，没有声称运行原版做了逐帧或原版种子对照。

## 资料与物料来源

- [Balatro Wiki：塔罗](https://balatrowiki.org/w/Tarot_cards)、[星球](https://balatrowiki.org/w/Planet_cards)、[幻灵](https://balatrowiki.org/w/Spectral_cards)。
- [消耗牌中文资料](https://balatrohq.com/zh/consumables/)；52 个简体名称另逐张核对 Wiki 的 In other languages 表，记录在 `research/consumable-localization-reference.json`。
- 细节核对：[光环](https://balatrowiki.org/w/Aura)、[灵质](https://balatrowiki.org/w/Ectoplasm)、[生命十字章](https://balatrowiki.org/w/Ankh)、[火祭](https://balatrowiki.org/w/Immolate)、[灵魂](https://balatrowiki.org/w/The_Soul)、[黑洞](https://balatrowiki.org/w/Black_Hole)。
- 52 张图保存在 `public/assets/consumables/`；来源 URL、采集时间、142×190 尺寸和 SHA-256 见 `research/consumable-art-manifest.json`。
- 原版美术版权归 LocalThunk / Playstack；此处为本地研究参考，不宣称取得开源美术授权。文字资料的 Wiki 来源与条款继续见 `public/assets/THIRD-PARTY.md`。

本文件更新了早期样片文档中“消耗牌只是占位”和“修饰尚未计分”的状态描述；旧文档保留其历史阶段意义。
