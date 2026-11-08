# 现有复刻、模拟器与 API 项目

调研日期：2026-11-07。用户进一步明确：**游戏在浏览器内运行，对外提供 JavaScript 状态和操作接口；策略注入、调度及批量实验由策略平台负责。** 游戏不需要提供 HTTP 服务。本次检查公开 README、源码结构、部分实际源码、许可证与发布记录；没有安装这些项目，也没有完成浏览器游玩、规则一致性或性能实测。

## 结论

有现成项目值得考察。**优先评估能直接在浏览器运行的 TypeScript/JavaScript 网页复刻，核实规则完整度与许可后决定复用或自研，并向页面暴露统一 JS SDK。** Jackdaw 保留为规则参考或待验证的 WASM 候选；此前“优先接 Jackdaw 并新增会话服务”的建议已被用户澄清后的需求取代。现有项目是否能让页面内调用方通过稳定接口完成整局，仍需实际验证。

## 候选对照

| 项目 | 形态与技术 | 已核对的能力 | 对我们仍缺什么 / 限制 |
| --- | --- | --- | --- |
| [Jackdaw](https://github.com/TylerFlar/jackdaw-balatro) | 独立规则模拟器，Rust + Python；根 LICENSE 为 MIT | 已发布 v0.2.3；状态读取、动作执行、快照、计分事件；HTTP JSON-RPC 与单局/向量化环境 | 未发现可直接游玩的 Web 牌桌，浏览器/WASM 路径未验证；现有 HTTP 接口不是我们需要的页面 JS 接口 |
| [Balatro.ts](https://github.com/swen128/balatro) | TypeScript + React 网页复刻；[试玩链接](https://swen128.github.io/balatro/) | 有牌型、计分、商店、Joker、消耗品和本地存档的源码 | TODO 仍列出优惠券、蜡封、重触发等缺项，部分规则说明与原版不一致；需验证能否抽取完整状态/操作入口；未发现 LICENSE |
| [Webatro](https://github.com/imisaacwu/webatro) | TypeScript + React 网页复刻；[试玩链接](https://imisaacwu.github.io/webatro/) | 源码包含 GameState、GameAction、gameReducer、商店和计分记录界面 | 状态与 reducer 可作为封装 JS SDK 的考察入口；是否覆盖整局、支持实例隔离尚未验证；未发现 LICENSE |
| [Weblatro](https://github.com/TyconXon/Weblatro) | JavaScript/HTML 网页复刻；[试玩链接](https://tyconxon.github.io/Weblatro/main.html) | README 描述本地打开 main.html 游玩、键鼠操作和排序 | 需验证逻辑与 DOM 的耦合、能否封装语义操作和状态接口；未发现 LICENSE |
| [BalatroTUI](https://github.com/Passeriform/BalatroTUI) | Rust 终端复刻 | 有分开的 core 与终端界面；README 明示 WIP | 没有核到 Web 界面/API；根 LICENSE 为 GPL-3.0，而 README 称 MIT，许可声明冲突需澄清 |
| [Balatro-GBA](https://github.com/GBALATRO/balatro-gba) | C / Game Boy Advance 同人 demake | 公开源码与 ROM 构建说明；README 自称 minimal tech-demo | 不适合直接作为网页状态 API 内核；README 声明不可售卖，不能把公开源码直接等同于宽松开源许可 |

表中试玩地址来自项目 README，本次未做浏览器运行验证。没有 LICENSE 的公开仓库不应直接按 MIT 等开源授权处理。项目代码的许可证也不能自动证明其第三方美术和音频可复用。

## Jackdaw 的可参考能力与浏览器适配边界

### 已发布版本和接口

GitHub 发布 API 在本次检查时返回最新发布版 [v0.2.3](https://github.com/TylerFlar/jackdaw-balatro/releases/tag/v0.2.3)，发布时间为 **2026-11-03 UTC**。仓库 README 区分默认开发分支 `dev` 与发布分支 `main`，安装示例仍提到 v0.2.0；评估时应固定 v0.2.3，不直接依赖漂移中的默认分支。

[v0.2.3 Python API 文档](https://github.com/TylerFlar/jackdaw-balatro/blob/v0.2.3/docs/api.md) 提供：

- `Game.new(...)`、`game.step(action)`：创建对局和离散操作。
- `phase`、`hand`、`jokers`、`blind`、`shop_*` 等只读状态。
- `legal_actions()`、`check(action)`：合法操作与操作校验。
- `to_dict()` / `Game.from_dict(...)`、`clone()`、`state_hash()`：快照、复制与状态比较。
- `preview_play(...)`：在副本上计算出牌结果。
- `record_scoring = True` 与 `last_play.events`：按计分顺序记录卡牌、Joker、倍率、重触发等事件，适合转换为前端动画。
- 单局及向量化环境接口，适合无界面脚本和批量实验。

这些是项目已发布文档及源码结构提供的证据，不代表本次已执行并验证每个接口。

### HTTP API 及其边界

[BalatroBot 兼容层说明](https://github.com/TylerFlar/jackdaw-balatro/blob/main/docs/balatrobot.md) 与 `crates/jackdaw-bot/src/server.rs` 对应：

- `jackdaw serve` 在模拟器上提供 JSON-RPC 2.0 HTTP 接口；其运行不依赖原版游戏窗口。
- 包含 `gamestate`、`start`、`select`、`skip`、`play`、`discard`、`buy`、`reroll`、`use`、`sell`、`pack`、`rearrange` 等方法。
- 实际 HTTP 服务是 `POST /`、一次处理一个连接，`Server` 持有一个 `Session`。这不是现成的多用户 Web 游戏服务器。
- 兼容 BalatroBot v1.5.2 的动作范围小于内核的完整操作范围，例如 `RerollBoss`、`BuyAndUse` 没有对应兼容端点；部分时机的消耗品使用与 Joker 排序也受限制。
- 这些接口说明可参考的操作分类与边界，但 HTTP 服务并不满足当前“浏览器内直接调用”的接口要求，不应据此引入服务端。

### 按当前需求的接入条件

```text
鼠标 / 触屏 ──────────┐
                     ├── 页面 JS SDK ── 浏览器内规则实例
平台注入的页面 JS ────┘                       │
                                      网页状态与动画
```

如果复用 Jackdaw，应先验证 Rust 核心及依赖能否在浏览器/WASM 环境独立运行，再验证 JS 绑定能否读取状态、执行全部动作并获取计分事件。现有 Python 接口和服务端运行能力不能证明这些条件成立。当前不搭建 Python/Node 游戏服务。

网页候选优先检查：人工与页面 JS 是否共用规则入口、能否用接口独立完成整局、规则是否完整、是否依赖全局可变状态、是否能脱离渲染器创建实例，以及许可证。策略注入方式、批量调度和平台运行器属于平台工作。

Jackdaw 自称对齐 Balatro 1.0.1o 全规则与 RNG，并报告原版对照和吞吐量结果。**这些是作者声明，本次没有独立复现；不把它们写成我们的测试结论。** Rust/WASM 浏览器构建尚未确认，因此目前保留 TypeScript 浏览器内核作为默认方案。

## 两种容易混淆的项目

- [BalatroBot](https://github.com/coder/balatrobot)：原版游戏 Mod，提供 JSON-RPC 状态和操作接口，适合作为原版对照工具；它需要原版 Balatro，不是独立复刻或网页游戏。Jackdaw 的独立模拟器与它的原版控制功能应区分。
- [web-balatro](https://github.com/W0W53R/web-balatro)：通过 love.js 在浏览器运行用户提供的原版 `Balatro.exe` 内容。它是浏览器运行包装，不是独立重写的规则内核；README 还说明浏览器 RNG 与原生存在差异。

## 研究证据

- [data/opensource-repos.json](data/opensource-repos.json)：8 个候选的 README 与目录树采集；`commit_tree_sha` 是目录树 SHA，不能用作源码提交 SHA。README/目录树主要来自各仓库默认分支。
- [data/opensource-evidence.json](data/opensource-evidence.json)：发布记录、许可证、关键文档及部分源码，逐条保存 URL、采集时间和错误。包括 Jackdaw main 与固定 v0.2.3 路径，不能把两者默认为同一提交。
- 部分原始请求超时，保留在证据中；固定版本的补充请求单独记录。规则完整度、运行性能、演示站可用性与原版一致性均未在本次实测。
