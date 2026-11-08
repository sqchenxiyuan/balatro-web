# 玩法复刻初版

更新：2026-11-08。入口：[开始游玩](http://127.0.0.1:5192/#play)，[物料实验室](http://127.0.0.1:5192/#materials)。

本轮将视觉样片扩展成可以完成一局的 Web 游戏。主流程是：选牌组与注码 → 选小盲/大盲/Boss → 出牌/弃牌 → 达标领取奖励 → 商店构筑 → 下一盲注 → Ante 8 通关或失败。

## 范围与默认全解锁

- 15 牌组、8 注码直接开放；150 小丑、52 消耗品、32 优惠券都没有资料档解锁门槛。
- 不做局外成长、收藏发现进度、累计胜场解锁或注码通关解锁。重新开局会重置金钱、构筑、升级、牌组修改和局内券。
- 保留局内条件：二级券需要本局先兑换基础券；Cavendish 需要本局 Gros Michel 消失；钢铁/玻璃/石头/黄金/幸运相关小丑依据当前牌组进入生成池；隐藏牌型的星球依据本局实际打出的牌型进入池。这些是构筑和生成规则。
- 自动保存当前一局，包括 RNG、卡牌唯一 ID、永久改牌、当前商店与开包选择。刷新页面后可“继续当前局”。不保存跨局奖励。

## 已接入的玩法

| 系统 | 初版行为 |
| --- | --- |
| 开局 | 初始 $4、真实牌组、零小丑；各牌组分别应用初始钱、手牌/出牌/弃牌、槽位、卡组构成和开局券/消耗品 |
| 牌桌 | 选择至多 5 张、点击取消、右键清空、按点数/花色排序、拖动手牌与小丑改变顺序；Enter 出牌，D 弃牌 |
| 计分 | 12 独立牌型、皇家同花顺显示；逐牌 → 留手 → 小丑，版本/增强/蜡封、复制、重触发、成长与计分步骤 |
| 小丑 | 为 150 种接入计分、选盲、弃牌、回合末、离店、卖牌及被动等事件；全量池按稀有度生成，不局限于旧样片的 16 种 |
| 消耗品 | 22 塔罗、12 星球、18 幻灵；目标选择、库存购买/使用/卖出，改动永久牌组、等级、槽位和经济 |
| 盲注 | 30 种普通/Boss/终局 Boss，目标分数、Boss 前瞻、失效牌、背牌、限制牌型/抽牌/出牌、强制选牌、禁用/解除 |
| 经济 | 达标结算、剩余出牌、利息与上限、卡牌/小丑收入、租金、绿色牌组结算；领取一次后才能进入商店 |
| 商店 | 默认 2 普通商品 + 2 包 + 1 券；购买、卖出、刷新、信用额度、折扣和免费商品；首店保底普通丑角包 |
| 优惠券 | 32 券可兑换，局内前置、槽位/手牌/次数、利息、价格/刷新、商品池、天体包/库存星球、Boss 重抽等；券按 Ante 更新，已购券不在同 Ante 补货 |
| 卡包 | 幻术/天体/幻灵/标准/丑角 × 普通/巨型/超级，共 15 组合；候选数、选 1/选 2、提前跳过、容量验证、临时手牌和永久入组 |
| 跳关 | 24 标签的即时或延后效果、双倍标签及免费包连续选择；Boss 不能跳过 |
| 难度 | 8 注码累加，三条 Ante 1–8 数值曲线、永恒/易腐/租用及其排斥条件 |
| 视听 | 延续流动背景、像素卡图、玻璃和四种版本材质；卡包撕封、逐项计分、高亮、速度/即时和减少动态；合成音效默认关 |

普通扑克牌仍不能获得负片；负片小丑与消耗品分别增加对应容量。天青之铃的强制牌单独记录，取消选择、直接 API 出牌或弃牌不能绕过；用消耗品摧毁它后会重新强制选择。

## 浏览器内接口

游玩入口的 `window.balatro` 仅有两个方法：

```js
const game = window.balatro;
await game.dispatch({type: 'new_run', seed: 'JIMBO', deck: 'red_deck', stake: 0});
await game.dispatch({type: 'select_blind'});
const state = game.getState();
console.log(state.phase, state.hand, state.jokers, state.legalActions);

// 使用当前牌的唯一 ID。此处只是操作示例，不代表合理打法。
const cardIds = state.hand.slice(0, 5).map(c => c.id);
const result = await game.dispatch({type: 'play', cardIds, animate: false});
if (!result.ok) console.log(result.error, result.message);
console.log(game.getState().lastScore);
```

成功结果：`{ok:true, revision}`。拒绝结果：`{ok:false, revision, error, message}`，局面、资金、库存、ID 和随机状态都保持原样。页面动画期间拒绝并发操作，返回 `BUSY`；`await dispatch(...)` 会等待该操作的动画结束。`play` 与 `open_pack` 可传 `animate:false`。

状态包含 `apiVersion:'game/1'`、`schema:'balatro-run/1'`、`allUnlocked:true`、`isDemo:false`、`phase`、`revision`、`busy`、实体牌组四区域、手牌、小丑/消耗品实例、局内升级与券、商店/包/标签、分数、计分步骤和 RNG。`getState()` 返回深拷贝，修改返回值不能改变游戏。`legalActions` 列出阶段允许的操作类别；具体资金、容量、目标等由 `dispatch` 再验证。状态会提供完整牌堆顺序，策略可见性约束由平台决定。

| 操作 | 参数 |
| --- | --- |
| `new_run` | `seed?:string, deck?:string, stake?:0..7` |
| `select_blind`, `skip_blind` | 操作当前盲注，无需传索引 |
| `select_cards` | `cardIds:string[]`，替换当前选择 |
| `clear_selection` | 清空可取消的选择；保留 Boss 强制牌 |
| `play`, `discard` | `cardIds?:string[]`，省略时使用当前选择；`play` 可传 `animate:false` |
| `sort_hand` | `by:'rank'|'suit'` |
| `reorder_hand`, `reorder_jokers` | `cardIds` 或 `jokerIds`，必须是完整排列 |
| `cash_out`, `next_round`, `continue_endless` | 对应结算、离店和通关后继续 |
| `buy`, `open_pack` | 当前商品/卡包的 `offerId`；开包可传 `animate:false` |
| `reroll`, `reroll_boss` | 无参数 |
| `redeem_voucher` | `voucherId` |
| `pick_pack` | `optionId, cardIds?`；超级包每次选择消耗一次剩余次数 |
| `skip_pack` | 放弃剩余选择 |
| `use_consumable` | `consumableId, cardIds?` |
| `sell_consumable`, `sell_joker` | `consumableId` 或 `jokerId` |

没有 `subscribe` 或游戏后端。后续已在 [21：可嵌入 SDK](21-embeddable-sdk.md) 拆出独立挂载视图和策略函数运行器；当前页面是 SDK 宿主。策略生成、编辑、沙箱和批量调度归平台处理。正式游玩接口也没有样片的 `grant_consumable`、直接入店或修改局面接口。

## 无界面实例

[`src/run-api.ts`](../../src/run-api.ts) 导出 `createGame()`；规则不依赖 DOM、窗口、存储或定时器。构建后产生 `dist/engine.js` 和共享模块，可在浏览器/Worker/Node 中导入；发布时保留完整 `dist`。

```js
// 在构建后的目录，或从静态站点的 /engine.js 导入。
import {createGame} from './dist/engine.js';
const game = createGame({seed: 'BATCH-1', deck: 'blue_deck', stake: 0});
game.dispatch({type: 'select_blind'}); // 同步执行，无动画
console.log(game.getState());
```

每个实例拥有独立状态。接口形状与网页一致；网页 dispatch 为 Promise，无界面 dispatch 同步返回，调用方统一使用 `await` 即可。

## 验证证据

- `npm run build`：TypeScript 与静态生产构建通过，另产出无界面模块。
- `npm run test:game`：**259 项通过**。其中 150 项是逐小丑事件冒烟检查，其余覆盖明确数值和阶段/经济/牌组不变量。覆盖 12 牌型、修饰、复制顺序、重触发、成长、30 Boss 的开局与合法操作、15 包组合、Bell/Serpent 边界、单次结算、券补货、标签、贴纸、负片和确定性。
- 24 回合流程用高等级受控 fixture 验证 Ante 1→8→通关；它证明阶段推进，不证明正常难度下某策略能稳定通关。
- `npm run test:game:browser`：**14 组通过**。真实点击、拖动、正常种子出牌/弃牌获胜、领取首轮奖励、购买丑角包、选牌、离店、刷新恢复、Worker 无界面运行与布局。开发页和构建后的生产预览均验证。
- 旧样片回归：83 项消耗品规则、66 项消耗品浏览器、51 项视觉/交互浏览器检查通过。它们继续针对 `#table/#shop/#materials` 的样片协议，不能算成 150 小丑原版等价证明。
- 当前结果：[`game-rules-report.json`](../verification/game-rules-report.json)、[`game-browser-report.json`](../verification/game-browser-report.json)。截图见 [验证快照](../verification/)。

## 初版边界

1. 尚未完成与原版运行结果的全量差分验证。150 张有事件实现和基本检查，复杂复制/成长/回合末时序、少数 Boss 联动、标签与生成概率仍需逐项核对，不能称作严格等价模拟器。
2. RNG 为本复刻自己的种子 hash 与 xorshift。本站相同种子和操作可重放；不兼容原版种子结果。
3. Ante 1–8 使用研究记录的三条数值表。通关后的无尽模式使用临时增长公式，未按原版公式对齐；大数采用 JavaScript Number，极端构筑精度与溢出未保证。
4. 本轮开放普通单局，不含 20 个挑战配置。跨局收藏、解锁成长与胜场统计依用户要求不做。
5. 优惠券现为程序绘制的区分色票面；小丑中文说明沿用研究目录/HQ 的社区翻译，尚未逐项校订原版简中用词。原版卡图版权和现有物料来源见 [THIRD-PARTY.md](../../public/assets/THIRD-PARTY.md)。
6. 牌桌按固定比例缩放；桌面交互已验证，窄屏可显示，但未单独制作移动端大触控布局。

本轮范围覆盖并替代 19 号文档中有关完整单局、商店、包规格和局内券的旧缺口；19 中“资料档解锁成长”不再是实施目标。
