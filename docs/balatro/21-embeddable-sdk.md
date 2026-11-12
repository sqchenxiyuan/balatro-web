# 可嵌入游戏 SDK 与策略函数

更新：2026-11-12。包名 `@game-rebuild/balatro`，版本 `0.2.0`。

SDK 包含完整游戏窗口：流动背景、HUD、小丑/消耗品栏、手牌、选盲、结算、商店、开包及局内菜单。开局菜单和局内左侧均提供图鉴入口，无需宿主添加按钮；浏览图鉴不改变局面；名称和效果支持中文、英文、拼音全拼与首字母搜索，拼音索引在本地缓存，无需查询服务。顶部工具栏、外部导航、存档、策略编辑器和运行记录由宿主平台实现。现有 `#play` 已改为一个接入 SDK 的平台外壳。

## 模块边界

| 层 | 代码 | 职责 |
| --- | --- | --- |
| 正常游玩外壳 | `game-main.ts` / `host.css` | 单实例游戏、存档、图鉴、声音/速度等玩家设置 |
| SDK 平台示例 | `sdk-demo.html` | 双实例嵌入、策略代码编辑/导入、自动/单步/停止与销毁示例 |
| SDK 门面 | `sdk.ts` | 对外导出挂载、内核、策略和类型 |
| 游戏窗口 | `game-view.ts` / `sdk-base.css` / `game.css` | 实例内 DOM、输入、动画和 Shadow DOM；只通过内核实例操作局面 |
| 规则实例 | `run-api.ts` / `run-save.ts` | 独立状态所有权、深拷贝读写、版本校验、存档恢复 |
| 玩法内核 | `run-engine.ts` / `run-score.ts` / `run-jokers.ts` | 所有阶段、经济、卡牌和计分规则，网页与无界面共用 |
| 策略运行器 | `strategy.ts` | 通过 GamePort 两方法执行可信函数，管理步骤、取消、超时和终局 |

## 构建与分发

在仓库根目录执行：

```sh
npm run build:sdk
npm run pack:sdk
```

`dist-sdk/` 可作为静态目录部署到任意 HTTP 路径；必须保留 `sdk.js`、`engine.js`、`strategy.js`、`chunks/`、`assets/` 的相对关系。`types/` 为 TypeScript 声明，`examples/basic-strategy.mjs` 是可替换的策略模块，`sdk-demo.html` 是无框架双实例接入示例。`artifacts/game-rebuild-balatro-0.2.0.tgz` 可供其他项目 `npm install`。包无运行时 npm 依赖，不依赖当前项目外壳。

网页与 Node 使用 ES modules。Npm 项目通过包名导入；资源需由宿主复制到自己的静态目录并传 `assetBaseUrl`，如 Vite 的 `public/balatro/assets/`。直接静态部署默认从 `sdk.js` 同目录的 `assets/` 加载。跨域部署 JS/图片/字体的服务器需提供 CORS 响应头。

```html
<div id="game" style="width:100%;max-width:1280px"></div>
<script type="module">
  import {mountBalatro} from '/balatro/sdk.js';
  const game = mountBalatro(document.querySelector('#game'), {
    seed: 'HELLO', deck: 'red_deck', stake: 0,
    startInMenu: false, speed: 2, sound: false,
    music: true, musicVolume: 0.35,
    // assetBaseUrl: 'https://cdn.example.com/balatro/assets/'
  });
  await game.dispatch({type:'select_blind'});
  console.log(game.getState());
  // 离开页面/组件时调用 game.destroy()
</script>
```

SDK 采用 Shadow DOM，容器宽度决定 1280×800 牌桌的等比缩放。支持同页多个独立实例，每个实例的 RNG、动画、快捷键和资源生命周期各自独立。快捷键仅在对应游戏内部获取焦点时响应。销毁时清理 RAF、观察器、计时器、WebGL、音频、字体引用和实例节点，重复销毁有效，随后可在同容器重新挂载。宿主原有子节点保留。

## 游戏接口与视图控制

游戏交互只有两个方法，不提供 `subscribe`，不需要游戏服务器。

| 方法 | 行为 |
| --- | --- |
| `getState()` | 返回深拷贝，包括 phase、revision、busy、所有牌堆、RNG、商店、包、计分步骤、limits、legalActions |
| `await dispatch(action)` | 成功 `{ok:true,revision}`；拒绝 `{ok:false,revision,error,message}`，拒绝不会改变局面 |

视图另有 `setOptions({speed,reducedMotion,sound,music,musicVolume})`、`showMenu()`、`showCollection()` 和 `destroy()`。这些只控制呈现与生命周期。`showMenu()` 不改变规则状态，继续当前局只是关闭菜单。挂载默认显示开局菜单；传 `state` 时默认直接恢复局面，显式 `startInMenu:true` 可先显示继续菜单。

`sound` 控制计分、开包音效；`music` 独立控制原创合成器爵士 BGM，SDK 中两者默认关闭。`musicVolume` 为 0～1，默认 0.35，可实时调整。音乐在浏览器内合成并连续循环，无需音频文件或额外请求，不受游戏速度影响。浏览器要求用户先与页面交互：点击游戏窗口，或在宿主按钮事件中调用 `game.setOptions({music:true})` 即可启动。切后台或页面隐藏时暂停，返回前台继续；实例销毁时关闭音频和调度器。多实例各自拥有混音器，宿主可只为当前游戏开启音乐。

正常游玩页默认开启音乐，第一次点击后播放；顶部有独立音乐、音效按钮及音乐音量滑杆，偏好由外壳保存在本地。SDK 本身不保存声音偏好。SDK 示例中每个实例都有音乐开关。

动画期间 `busy:true`，其他操作返回 `BUSY`。`await dispatch()` 等待动画结束；`play`、`open_pack` 支持 `animate:false`。`expectedRevision` 可随任何操作传入，状态版本不同返回 `STALE_STATE`。销毁后 `dispatch` 返回 `DESTROYED`，旧 handle 仍可读取最后状态；销毁不会回滚此前已提交的操作。

`legalActions` 是阶段允许的操作类别，不代表资金、容量、目标等一定满足。具体操作：

| type | 参数 |
| --- | --- |
| `new_run` | `seed?`, `deck?`, `stake?:0..7` |
| `select_blind`, `skip_blind` | 操作当前盲注 |
| `select_cards` | `cardIds:string[]` |
| `clear_selection` | 无 |
| `play`, `discard` | `cardIds?:string[]`，省略则使用当前选择 |
| `sort_hand` | `by:'rank'|'suit'` |
| `reorder_hand`, `reorder_jokers` | `cardIds` 或 `jokerIds`，完整排列 |
| `cash_out`, `next_round`, `continue_endless` | 无 |
| `buy`, `open_pack` | `offerId` |
| `reroll`, `reroll_boss` | 无 |
| `redeem_voucher` | `voucherId` |
| `pick_pack` | `optionId`, `cardIds?` |
| `skip_pack` | 无 |
| `use_consumable` | `consumableId`, `cardIds?` |
| `sell_consumable`, `sell_joker` | `consumableId` 或 `jokerId` |

## 注入策略

策略是一个函数，无需服务器、模型 SDK 或特定平台。平台可以让 AI 生成 ES module，再把它的 `default` 函数交给运行器：

```js
import {createStrategyRunner} from '/balatro/strategy.js';
import strategy from '/my-ai-strategy.mjs';

const runner = createStrategyRunner(game, strategy, {
  intervalMs: 120, decisionTimeoutMs: 10000,
  maxSteps: 1000, animate: false
});
await runner.step();             // 一次决策与操作
const running = runner.start();  // Promise，结束时返回状态
runner.getStatus();             // 平台自行刷新日志/状态
runner.stop();                  // 取消等待中的决策，不再提交后续动作
await running;
await runner.setStrategy(otherStrategy);
runner.destroy();
```

`my-ai-strategy.mjs`：

```js
export default async function decide(state, {signal, step}) {
  if (signal.aborted) return null;
  if (state.phase === 'blind_select') return {type:'select_blind'};
  if (state.phase === 'playing')
    return {type:'play', cardIds:state.hand.slice(0,5).map(c=>c.id)};
  if (state.phase === 'cash_out') return {type:'cash_out'};
  if (state.phase === 'shop') return {type:'next_round'};
  if (state.phase === 'pack') return {type:'skip_pack'};
  return null;
}
```

函数接收状态副本，返回一个操作或 `null`，支持 Promise。每次动作都通过游戏的 `dispatch` 验证并自动附上决策时的版本号。异步决策期间有人操作，旧决策被丢弃并重新读取局面。同一游戏 handle 同时仅允许一个运行器控制；同一运行器重复 `start` 不会产生两条循环。

终局、返回 null、到达步数上限会结束本次运行；错误、超时、非法动作会记录为 `error` 并停止。`stop()` 会触发策略的 AbortSignal；已经提交的出牌仍完成，不做回滚。超时/取消可结束异步等待，无法抢占同一 JS 线程里不让出的死循环。这里接收的是**可信函数**，没有隔离执行未知代码；策略平台需要隔离不可信代码时，应使用 Worker/沙箱，通过消息转发这两个游戏方法。Shadow DOM 负责样式隔离，不是安全沙箱。

`/` 与 `#play` 为正常游玩页，仅保留游戏和玩家设置；`sdk-demo.html` 提供可折叠策略控制台：粘贴 AI 生成的模块、应用代码、导入 `.mjs`、自动、单步和停止。SDK 本身不使用 `eval` 或加载用户代码。示例策略仅用于证明控制链路，不保证通关。

## 无界面、存档与平台职责

```js
import {createGame} from '@game-rebuild/balatro/engine';
const game = createGame({seed:'BATCH'}); // 默认直接进入选盲，dispatch 同步
game.dispatch({type:'select_blind'});
const checkpoint = game.getState();
const restored = createGame({state:checkpoint});
// 也可以 mountBalatro(element, {state:checkpoint}) 恢复为可见游戏。
```

网页视图内部使用同一 `createGame`，没有第二套状态机。`engine` 和 `strategy` 子路径可在 Node、Worker 中导入，不访问 DOM、window 或 localStorage。SDK 不读写 localStorage、不修改 document.title/hash、不绑定 window.balatro；演示外壳保留两方法兼容全局并自行定期保存。平台可定期读取状态并按 revision 去重，再将 JSON 写入自己的存储；恢复时校验 schema 并深拷贝。存档用于可信 checkpoint 恢复，不是防篡改协议。

状态目前包含完整隐藏牌堆与 RNG；平台自行决定给策略开放哪些字段。默认全解锁，无局外成长。原版同种子不兼容、无尽曲线/大数及复杂联动仍沿用玩法初版的限制。本轮只改变接入架构，不代表新增原版一致性证明。参考卡图属于 LocalThunk / Playstack，包内 `assets/THIRD-PARTY.md` 保留来源；公开分发美术需有相应权限。

## 验证

`npm run test:game` 验证原玩法规则；`npm run test:sdk` 验证独立内核、恢复、策略流程、取消/超时/异常/并发；`npm run test:sdk:host` 验证主页面正常游玩及 SDK 示例中的代码粘贴、异步单步、停止和错误显示；`npm run test:sdk:browser` 验证可分发产物在不同路径/跨域宿主接入、资源加载、样式/键盘隔离、双实例、销毁/重挂载与策略。报告写入 `artifacts/sdk-*-report.json`。`npm run test:game:browser` 继续验证完整游玩外壳。

当前验证：玩法规则 **259 项**，SDK 内核/策略 **12 组**，SDK 浏览器 **13 组**，npm 包独立消费者 **4 组**、主页面/SDK 策略控制台 **4 组**。独立消费者包括真实安装 `.tgz`、NodeNext 类型检查、无 DOM lib 的内核类型检查，以及独立 Node 进程运行。24 盲注通关策略检查使用高等级 fixture；普通示例策略仅验证合法运行至胜负终局。
