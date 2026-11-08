# 来源、版本与采集记录

调研日期：2026-11-07（Asia/Shanghai）。Wiki 属于社区资料；官方商店、开发者网站与 Steam 官方公告用于交叉核对产品范围和补丁，不把社区攻略标成官方规则说明。

`source-pages.json` 保存正文、表格和链接；`sources.json` 保存 HTTP 状态、最终跳转 URL、正文哈希及修订号。页面别名可能跳转到同一规范页面，记录数不等于独立文章数。

2026-11-08 新增 [Balatro HQ 整站对照](19-balatrohq-gap-audit.md)：中文 sitemap 的 143 个页面全部成功归档于 [data/balatrohq/pages.json](data/balatrohq/pages.json)，独立保存 URL、时间与 HTML 哈希。该站自述为非官方独立资源站；20 项冲突、漏条件或口径另存 [findings.json](data/balatrohq/findings.json)。没有把其正文覆盖到下方原 45 条来源或 `catalogs.json`，也没有运行其工具来证明 RNG/计分正确。

Steam news API 同时返回官方公告和媒体转载；判断时必须查看 `feedname`。2026-09-16 的 1.1 文章属于 CGMagazine，不能据此证明 1.1 已发布。官方 1.0.1f 公告全文另外保存为 `data/official-1.0.1f-patch.txt`。

| 来源 ID | 网页 | Wiki 修订号 | 采集 UTC | 状态 |
| --- | --- | --- | --- | --- |
| Balatro | [Balatro - Balatro Wiki](https://balatrowiki.org/w/Balatro) | 30054 | 2026-11-07T14:01:58.660109+00:00 | 200 |
| Poker_hands | [Poker hands - Balatro Wiki](https://balatrowiki.org/w/Poker_hands) | 30433 | 2026-11-07T14:06:58.000312+00:00 | 200 |
| Jokers | [Jokers - Balatro Wiki](https://balatrowiki.org/w/Jokers) | 30228 | 2026-11-07T14:06:57.559147+00:00 | 200 |
| Decks | [Decks - Balatro Wiki](https://balatrowiki.org/w/Decks) | 30140 | 2026-11-07T14:06:58.327195+00:00 | 200 |
| Shop | [The Shop - Balatro Wiki](https://balatrowiki.org/w/Shop) | 30020 | 2026-11-07T14:06:58.036317+00:00 | 200 |
| Stakes | [Stakes - Balatro Wiki](https://balatrowiki.org/w/Stakes) | 30019 | 2026-11-07T14:06:57.286381+00:00 | 200 |
| Blinds_and_Antes | [Blinds and Antes - Balatro Wiki](https://balatrowiki.org/w/Blinds_and_Antes) | 30018 | 2026-11-07T14:02:03.188831+00:00 | 200 |
| Blinds | [Blinds and Antes - Balatro Wiki](https://balatrowiki.org/w/Blinds) | 30018 | 2026-11-07T14:07:03.893058+00:00 | 200 |
| Tags | [Tags - Balatro Wiki](https://balatrowiki.org/w/Tags) | 30432 | 2026-11-07T14:07:01.087949+00:00 | 200 |
| Tarot_cards | [Tarot cards - Balatro Wiki](https://balatrowiki.org/w/Tarot_cards) | 29955 | 2026-11-07T14:07:02.367596+00:00 | 200 |
| Planet_cards | [Planet cards - Balatro Wiki](https://balatrowiki.org/w/Planet_cards) | 29933 | 2026-11-07T14:07:08.198947+00:00 | 200 |
| Spectral_cards | [Spectral cards - Balatro Wiki](https://balatrowiki.org/w/Spectral_cards) | 29953 | 2026-11-07T14:07:00.405259+00:00 | 200 |
| Vouchers | [Vouchers - Balatro Wiki](https://balatrowiki.org/w/Vouchers) | 29969 | 2026-11-07T14:07:02.875303+00:00 | 200 |
| Booster_Packs | [Booster Packs - Balatro Wiki](https://balatrowiki.org/w/Booster_Packs) | 29975 | 2026-11-07T14:07:06.562484+00:00 | 200 |
| Card_modifiers | [Card modifiers - Balatro Wiki](https://balatrowiki.org/w/Card_modifiers) | 30141 | 2026-11-07T14:07:05.334705+00:00 | 200 |
| Chips | [Chips - Balatro Wiki](https://balatrowiki.org/w/Chips) | 30436 | 2026-11-07T14:05:18.579918+00:00 | 200 |
| Mult | [Mult - Balatro Wiki](https://balatrowiki.org/w/Mult) | 30094 | 2026-11-07T14:02:08.680591+00:00 | 200 |
| Scoring | [Guide: Activation Sequence - Balatro Wiki](https://balatrowiki.org/w/Scoring) | 29983 | 2026-11-07T14:02:10.199064+00:00 | 200 |
| Money | [Money - Balatro Wiki](https://balatrowiki.org/w/Money) | 30210 | 2026-11-07T14:02:11.984015+00:00 | 200 |
| Playing_cards | [Playing Cards - Balatro Wiki](https://balatrowiki.org/w/Playing_cards) | 29650 | 2026-11-07T14:02:11.845630+00:00 | 200 |
| Challenges | [Challenge Decks - Balatro Wiki](https://balatrowiki.org/w/Challenges) | 27788 | 2026-11-07T14:07:08.782094+00:00 | 200 |
| Updates | [Updates - Balatro Wiki](https://balatrowiki.org/w/Updates) | 30026 | 2026-11-07T14:02:14.426888+00:00 | 200 |
| Probability | [Listed probability - Balatro Wiki](https://balatrowiki.org/w/Probability) | 26525 | 2026-11-07T14:02:14.631789+00:00 | 200 |
| Interest | [Interest - Balatro Wiki](https://balatrowiki.org/w/Interest) | 26521 | 2026-11-07T14:05:17.316239+00:00 | 200 |
| Hand_size | [Hand size - Balatro Wiki](https://balatrowiki.org/w/Hand_size) | 30357 | 2026-11-07T14:05:17.468308+00:00 | 200 |
| Round | [Blinds and Antes - Balatro Wiki](https://balatrowiki.org/w/Round) | 30018 | 2026-11-07T14:05:18.616666+00:00 | 200 |
| Discard | [Discards - Balatro Wiki](https://balatrowiki.org/w/Discard) | 27303 | 2026-11-07T14:05:20.520932+00:00 | 200 |
| Eternal | [Eternal - Balatro Wiki](https://balatrowiki.org/w/Eternal) | 30306 | 2026-11-07T14:05:19.798362+00:00 | 200 |
| Perishable | [Perishable - Balatro Wiki](https://balatrowiki.org/w/Perishable) | 30034 | 2026-11-07T14:05:21.074513+00:00 | 200 |
| Rental | [Rental - Balatro Wiki](https://balatrowiki.org/w/Rental) | 29155 | 2026-11-07T14:05:22.562765+00:00 | 200 |
| Seeded | [Seed - Balatro Wiki](https://balatrowiki.org/w/Seeded) | 30036 | 2026-11-07T14:05:26.422774+00:00 | 200 |
| The_Soul | [The Soul - Balatro Wiki](https://balatrowiki.org/w/The_Soul) | 30364 | 2026-11-07T14:05:22.639951+00:00 | 200 |
| Black_Hole | [Black Hole - Balatro Wiki](https://balatrowiki.org/w/Black_Hole) | 28972 | 2026-11-07T14:05:23.360790+00:00 | 200 |
| Hand | [Hands - Balatro Wiki](https://balatrowiki.org/w/Hand) | 27064 | 2026-11-07T14:09:31.620468+00:00 | 200 |
| Debuffed | [Negative Effects - Balatro Wiki](https://balatrowiki.org/w/Debuffed) | 30318 | 2026-11-07T14:09:32.038388+00:00 | 200 |
| Blueprint | [Blueprint - Balatro Wiki](https://balatrowiki.org/w/Blueprint) | 30339 | 2026-11-07T14:09:32.898910+00:00 | 200 |
| Brainstorm | [Brainstorm - Balatro Wiki](https://balatrowiki.org/w/Brainstorm) | 30178 | 2026-11-07T14:09:31.797620+00:00 | 200 |
| Death | [Death - Balatro Wiki](https://balatrowiki.org/w/Death) | 28491 | 2026-11-07T14:09:32.332433+00:00 | 200 |
| Glass_cards | [Glass cards - Balatro Wiki](https://balatrowiki.org/w/Glass_cards) | 29138 | 2026-11-07T14:09:35.441067+00:00 | 200 |
| Plasma_Deck | [Plasma Deck - Balatro Wiki](https://balatrowiki.org/w/Plasma_Deck) | 29648 | 2026-11-07T14:09:34.899480+00:00 | 200 |
| official_site | [Balatro: Deck-Building Roguelite](https://www.playbalatro.com/) | — | 2026-11-07T14:02:14.253760+00:00 | 200 |
| steam_store | [Balatro on Steam](https://store.steampowered.com/app/2379780/Balatro/?l=english) | — | 2026-11-07T14:02:19.042933+00:00 | 200 |
| steam_news | [steam_news](https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/?appid=2379780&count=30&maxlength=0) | — | 2026-11-07T14:02:17.242409+00:00 | 200 |
| localthunk_blog | [LocalThunk](https://localthunk.com/blog) | — | 2026-11-07T14:05:46.288907+00:00 | 200 |
| update_1_1_preview | [Balatro 1.1 Update Details Have Been Revealed, New Mechanics and New Jokers Await! – CGMagazine](https://www.cgmagonline.com/news/balatro-1-1-update-drops-new-mechanics/) | — | 2026-11-07T14:05:24.327305+00:00 | 200 |

本次只采集公开文字与事实表，没有下载原版美术、音乐或游戏程序。
