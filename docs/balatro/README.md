# Balatro（小丑牌）复刻调研资料

初始调研：**2026-11-07，Asia/Shanghai**；最新玩法初版：**2026-11-08**。已完成资料收集、视觉样片，以及可完成 Ante 1–8 单局流程的 Web 初版；尚未进行全量原版实机差分对照。

最新架构见 [21：可嵌入 SDK 与策略函数](21-embeddable-sdk.md)，玩法范围见 [20：玩法复刻初版](20-first-playable.md)，[直接游玩](http://127.0.0.1:5192/#play)。依用户要求默认全解锁，不做局外解锁成长；已接入完整盲注循环、商店/优惠券、全部包规格、牌组/难度等。资料对照见 [19：Balatro HQ 整站查漏](19-balatrohq-gap-audit.md)，其中覆盖矩阵为改版前样片的历史状态。

Balatro 的核心是：**用扑克组合取得基础筹码与倍率，再通过 Joker、改牌、牌型升级和经济循环，构建能追上盲注增长的计分系统。** 出牌顺序、Joker 顺序和触发阶段都是规则的一部分。

## 版本口径

本资料以 **1.0.1 系列的公开规则**为复刻基线：数值来自当前社区 Wiki，与 2024-05-01 的官方 **1.0.1f** 平衡补丁交叉核对。Wiki 的 Joker 页面明确以 **1.0.1o-FULL** 描述 150 张 Joker。

截至本次采集，Wiki 更新页仍将 1.1 列为无确认日期；2026-09-16 的 CGMagazine 报道描述了新触发事件、新 Joker、优惠券抽取和蓝注重做等预告，**该报道不能证明 1.1 已正式发布，也没有完整正式数值**。因此不将这些预告混入本次数值表。这里没有通过各平台客户端核实最新版本号。

## 阅读顺序

| 文档 | 内容 |
| --- | --- |
| [01：基础循环与计分](01-gameplay-scoring.md) | 初始参数、12 种牌型、升级公式、结算顺序、算例 |
| [02：经济、商店与关卡增长](02-economy-difficulty.md) | 利息、价格、刷新、权重、补充包、Ante 1–8、难度 |
| [03：构筑机制与复刻边界](03-mechanics-reconstruction.md) | Joker 机制分类、强化叠加、复制、随机性、待验证项 |
| [04：150 张 Joker](04-joker-catalog.md) | 全部名称、效果数值、基础价、稀有度、触发类别、解锁 |
| [05：消耗品与优惠券](05-consumables-vouchers.md) | 22 塔罗、12 星球、18 幻灵、32 优惠券 |
| [06：牌组、盲注、难度、标签与挑战](06-decks-blinds-progression.md) | 15 牌组、30 盲注、8 难度、24 标签、20 挑战 |
| [07：卡牌修饰与补充包](07-modifiers-packs.md) | 8 增强、4 蜡封、5 版本（含基础）、3 功能贴纸、15 类别/规格组合 |
| [08：来源与版本记录](08-sources-versioning.md) | 来源 URL、修订号、采集时间、官方与社区资料的区别 |
| [09：Web 技术选型与浏览器 JS API](09-technical-selection.md) | 页面内规则实例、状态/操作接口、平台分工与内核独立运行 |
| [10：开源复刻与模拟器对比](10-open-source-alternatives.md) | Jackdaw、网页复刻、原版 API Mod、复用建议与验证边界 |
| [11：界面、交互与视觉反馈研究](11-ui-interaction-research.md) | 官方截图、分区、输入、商店/开包、材质方向与原版差异 |
| [12：样片确认与物料规格](12-lookdev-review.md) | 4 组可交互 demo、215 张物料、动效参数、待确认项与验证结果 |
| [13：第二轮视觉调整](13-lookdev-v2-review.md) | 流动背景、六种材质同卡对照、150 张小丑完整视觉图鉴 |
| [14：玻璃与卡包工艺](14-material-pack-polish.md) | 透明玻璃牌体、五类像素卡包、折边厚度与撕封动效 |
| [15：全息投影与原色立体层次（试验记录）](15-hologram-projection.md) | 自定义投影演绎，现界面名为“镭射”；原色主体、40 像素悬浮视差、扫描光与信号扰动 |
| [16：16 项卡牌修饰对齐](16-modifier-alignment.md) | 原版简体名称、8 增强 + 4 版本 + 4 蜡封分类、组合预览及适用范围 |
| [17：四种版本的原版风格对齐](17-original-edition-finishes.md) | 原版参考与前后对照、同心环、三角镭射纹、浅纸面色相变化、深蓝负像及表面着色器 |
| [18：52 张消耗品支持](18-consumables-support.md) | 独立卡图、购买/使用/出售、目标选择、真实牌组变化、规则与接口边界 |
| [19：Balatro HQ 整站查漏](19-balatrohq-gap-audit.md) | 143 页归档、数值对照、规则冲突、16 组券解锁与 20 挑战中文校正版、实施缺口 |
| [21：可嵌入 SDK 与策略函数](21-embeddable-sdk.md) | Shadow DOM 游戏窗口、任意宿主接入、多实例/销毁、可信策略运行器、npm 分发与独立消费者验证 |
| [20：玩法复刻初版](20-first-playable.md) | 默认全解锁、Ante 1–8 单局、全量内容事件、浏览器/Worker/Node 操作接口、验证与初版边界 |

## 可用于后续实现的数据

- [data/catalogs.json](data/catalogs.json)：结构化研究数据，每条目录记录附来源、修订号、表号和行号。复杂效果保留英文原文；可执行规则另在 [run-engine.ts](../../src/run-engine.ts)、[run-score.ts](../../src/run-score.ts) 和 [run-jokers.ts](../../src/run-jokers.ts) 中实现。
- [data/source-pages.json](data/source-pages.json)：公开网页正文、表格、链接及 Steam 新闻内容的采集快照。
- [data/sources.json](data/sources.json)：HTTP 状态、最终 URL、内容哈希及采集时间。
- [data/coverage.json](data/coverage.json)：目录数量、Joker 稀有度分布与采集错误检查。
- [data/official-1.0.1f-patch.txt](data/official-1.0.1f-patch.txt)：通过 Steam 官方新闻 API 取得的官方补丁原文。
- [data/balatrohq/inventory.json](data/balatrohq/inventory.json)、[正文快照](data/balatrohq/pages.json)、[比较报告](data/balatrohq/comparison-report.json)：新增的 HQ 参考集合，独立于原 45 条来源与 449 条目录；具体边界见 19 号文档。

目录数量已校验：Joker **150 = 61 Common + 64 Uncommon + 20 Rare + 5 Legendary**；12 种独立牌型；30 种盲注包含 **2 普通盲注 + 23 普通 Boss + 5 终局 Boss**。皇家同花顺是同花顺的显示变体，不额外占用一个牌型升级槽。

本次采集成功保存 45 条来源记录（包含跳转到同一文章的别名），449 条结构化目录记录的来源指针已核验；中文报告的 12 行牌型数值、8 行 Ante 表与 JSON 一致，文档本地链接检查通过。这些检查验证资料转录一致性，不代表已验证原版运行行为。

## 主要来源

- [官方站点](https://www.playbalatro.com/)与 [Steam 商店](https://store.steampowered.com/app/2379780/Balatro/)：产品描述与内容范围。
- [Steam 官方新闻 API](https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/?appid=2379780&count=30&maxlength=0)：其中 `steam_community_announcements` 是官方公告，其他 feed 可能是媒体转载。
- [Balatro Wiki](https://balatrowiki.org/)：详细数值与交互；`balatro.wiki` 在本次访问中跳转到此站。
- [计分触发顺序](https://balatrowiki.org/w/Scoring)、[商店](https://balatrowiki.org/w/Shop)、[盲注与 Ante](https://balatrowiki.org/w/Blinds)。计分指南由社区撰写，需作为后续实机对照的参考。
- [1.1 预告报道，2026-09-16](https://www.cgmagonline.com/news/balatro-1-1-update-drops-new-mechanics/)：仅用于版本边界提示。
- [Balatro HQ 中文站](https://balatrohq.com/zh/)：非官方资料与工具站；已交叉核对数量和主要规则，部分攻略/工具说明存在冲突，按 19 号文档裁决。

## 刷新资料

脚本位于仓库的 `scripts/research/collect-balatro.py` 与 `scripts/research/build-balatro-reference.py`，需要 Python 与 `lxml`：

```powershell
python scripts/research/collect-balatro.py
python scripts/research/build-balatro-reference.py
# 只刷新指定来源，保留其他快照：
python scripts/research/collect-balatro.py --ids Jokers Shop
```

脚本不依赖原版安装包。生成器会检查各类目录数量与名称唯一性；若页面结构或正式内容数量改变，应先复查版本，再修改期望数量。刷新采集时间不会自动更新这组中文研究说明的日期、版本判断与文字结论，需人工复核。
