# 独立仓库验证快照

本目录保存 2026-11-08 整理独立仓库时的验证报告和少量展示截图。它们是特定代码版本和环境的验收记录，重新运行测试会将新报告写入被忽略的 `artifacts/`。

规则检查、浏览器交互、SDK 隔离和 npm 包消费是不同层次的证据；它们不等于与原版游戏的全量行为一致性校验。

- [玩法规则](game-rules-report.json)
- [消耗品与共享计分规则](consumable-rules-report.json)
- [游玩页面与输入法](game-browser-report.json)
- [SDK 内核和策略](sdk-rules-report.json)
- [跨域独立宿主与双实例](sdk-browser-report.json)
- [正常主页面和策略控制台](sdk-host-report.json)
- [真实 npm 包安装与独立消费者](sdk-package-report.json)

复现命令见[仓库说明](../../README.md#验证)。
