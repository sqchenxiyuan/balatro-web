# MUNDI Web 接入待办（研究中，未实施）

基线：个人游戏仓库 `sqchenxiyuan/balatro-web` 的 `af9d7bd5cee73ab08d0633c3c2a282081f8721e0`；平台以 `Arkevo-Lab/mundi-web` 的 `dev` `5222ecc169dc7c4f3071256d499656c94a61fb81` 为接入目标。以下改造位置依据该版本源码调研；这是待办，不表示代码已接入、测试已通过或已经部署。

## 已确定的第一阶段边界

- [ ] **本地续玩即可，账号云存档后置**。在 MUNDI 的游戏入口按该站点的浏览器 origin 保存当前局；调用 SDK 的 `getState()` 获取快照，用 `mountBalatro(container, { state })` 恢复。按 `schema`、固定游戏版本和 `revision` 检查恢复与覆盖；本地存储不可用于证明排名成绩。跨设备同步、迁移个人站点旧档及云端归属不属于第一阶段；未来若需要再设计。
- [ ] 本阶段**不添加局外成长**：牌组和注码默认全解锁，新开局重置构筑。账号策略版本、游戏局内存档、局终记录是三种不同数据，不混用。
- [ ] 首先验收“从 MUNDI 目录进入 → 正常玩 → 刷新继续 → 新局重置”，再分别考虑 Agent、账号记录和榜单；发布须另行确认，研究不等于部署授权。

## 接入前检查

- [ ] 确认个人源码向组织项目移交/使用的授权方式、固定版本与产物哈希；避免平台维护第二套分叉规则。
- [ ] 审核 SDK 中原版牌图/消耗品牌图、派生材质与文字的再分发权限；未确认前不将现有资源包作为公开站点产物。保留第三方许可与来源说明。
- [ ] 固定 SDK 的相对目录及资源路径（`sdk.js`、`engine.js`、`chunks/`、`assets/`）；核对生产构建、MUNDI 静态路由和 CSP。MUNDI `scripts/build.mjs` 显式列客户端入口，`src/server/worker.js` 对游戏目录入口设引擎白名单，`src/server/headers.js` 对游戏页面和策略 Worker 选择 CSP；并非拷贝目录即自动接通。`scripts/verify-distribution-assets.mjs` 的 `gameAsset()` 尚未涵盖 Balatro 路径，资源策略与授权需共同调整。

### MUNDI dev 已核对的改造位置

- **目录与导航**：`src/shared/collection-entry.js` 的 ID/引擎/模式/返回路径白名单；`src/client/features/collection-shelf.js` 与 `src/client/features/workspace-views.js` 的游戏目录/启动；若要进入房间卡片/抽屉，还须改 `features/room-card-content.js`、`features/world-drawers.js`。不要把 Balatro 当成 Boomerang Fu 的双人对局接到 `src/client/game-view.js`。
- **首期独立页面**：在 MUNDI 新增 Balatro 页面与控制器，消费固定 SDK；`scripts/build.mjs` 加入该页面入口；`src/server/worker.js` 处理 `/games/<engine>/` 目录入口，`src/server/headers.js` 对页面与 Worker 设适合且最小化的 CSP。宿主本地档采用 Balatro 自己的版本化 key，不复用 `terraria-local-save.js` 的格式。
- **Agent 第二期**：可复用 `src/shared/sandbox.js` / `strategy-vm.js` 的 QuickJS 执行能力，但 `src/client/survivors.worker.js` 与 `terraria-strategy.worker.js` 的动作协议分别写死，须有 Balatro 自己的 observation 投影、动作白名单、Worker 与控制权流程。若需账号策略版本，另接 `src/server/api.js` 的游戏专用路由；第一期不需要。
- **排名第三期**：MUNDI `/api/leaderboard` 在 `src/server/api.js` 只查询对战 `matches`，非 fixture 引擎归 Boomerang Fu；Balatro 应另设结果验证、持久化、资格筛选及展示，不复用现有 Elo 风格榜。`survivors.js` 的重放校验与 `terraria-core.js` 的存档校验都不是通用接口。

## MUNDI 第一阶段：人类玩家

- [ ] 登记 `balatro` 游戏 ID、独立 `engineId`、封面、详情卡和“自己玩”入口；未接通 Agent 前不要显示可用的 Agent 按钮。
- [ ] 将固定 SDK 与资源托管在 MUNDI 对应的游戏版本路径，加载 `mountBalatro()`，提供清晰的开局、继续、返回与销毁流程。
- [ ] 宿主负责本地保存/恢复：保存前确认 `busy`/操作完成；新局、刷新、异常/损坏档、旧版 schema/引擎不匹配分别处理；只声明同浏览器同站点续玩，不声称账号云同步。
- [ ] 检查桌面实际输入、资源加载、浏览器刷新、旧入口兼容及错误恢复；保留游戏自身单独站点的旧档，不静默迁移。

## 第二阶段：Agent（另行验收）

- [ ] 定义可公开的 observation 视图；当前 `getState()` 含隐藏牌堆与 RNG，不可原样交给公平对战 Agent。若选择白盒赛道，必须显式标注且与公平成绩隔离。
- [ ] 将 MUNDI QuickJS 中的用户策略决策映射为 SDK `dispatch(action)`；白名单动作/参数并校验版本 `expectedRevision`。游戏仓库的 `createStrategyRunner()` 只运行可信函数，不能作为未知用户代码沙箱。
- [ ] 处理单一控制者、停止/人工接管、超时、并发旧决策、断页恢复；同一局人类与 Agent 交替时不产生两套状态或重复操作。

## 第三阶段：局终记录与排名（可选，未定规则）

- [ ] 明确 `won/lost` 终局、规则版本、种子、牌组、注码、模式、记录指标与同条件比较集合；不要直接复用 Boomerang Fu 的双人胜负积分榜。
- [ ] 若需公开榜，服务端从固定无界面内核重放动作并核对终局与结果，提供幂等提交、防篡改边界与历史版本隔离；可编辑的浏览器快照不能直接算可信成绩。
- [ ] 独立定义 Agent/人类、白盒/可见信息以及测试/公开比赛的资格，避免不同规则或种子混榜。

## 验收状态

当前仅有本仓库的独立游戏与 SDK，以及 MUNDI Web 的既有游戏接入示例；**本文件未对应任何已完成的 MUNDI 接入、发布或云存档功能**。
