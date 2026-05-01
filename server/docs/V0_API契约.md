# V0 API 契约

本文档面向 V0 前端 UI 真数据落地联调，聚合当前后端已实现接口、字段样例、空值与错误规则，并标记尚未落地的接口缺口。

## 1. 通用约定

### 1.1 基础信息

| 项 | 约定 |
| --- | --- |
| Base URL | 本地默认 `http://localhost:3000` |
| API 前缀 | `/api` |
| 数据格式 | 请求与响应均使用 JSON；`GET` 参数走 query |
| 账号参数 | 当前 V0 暂无 token，所有玩家态接口通过 `account` 定位玩家 |
| 时间字段 | ISO 字符串，由 Prisma `DateTime` 序列化产生 |

### 1.2 成功与失败响应

成功响应统一包含：

```json
{
  "ok": true
}
```

失败响应统一包含：

```json
{
  "ok": false,
  "error": "账号不能为空"
}
```

错误码规则：

| 场景 | HTTP 状态码 | 说明 |
| --- | --- | --- |
| 玩家态接口参数错误或业务校验失败 | `400` | 例如账号为空、账号不存在、目标章节未解锁 |
| 配置读取失败 | `500` | 例如章节配置表未加载 |

### 1.3 通用空值规则

| 字段 | 空值规则 |
| --- | --- |
| `battleSession` / `session` | 玩家尚未开始战斗时返回 `null` |
| `chapter` / `currentChapter` / `justUnlockedChapter` | 对应章节配置不存在时返回 `null` |
| `result` | 会话刚创建或未模拟时为 `null`，完成模拟或结算后为 `victory` / `defeat` |
| `progress` | 后端会自动补齐玩家进度；正常玩家不会返回 `null` |
| `skills[].progress` | 玩家未拥有该功法时为 `null` |
| 展示文案字段 | 后端尽量返回空字符串或默认摘要，前端不需要再拼接兜底文案 |

## 2. 当前已有接口清单

| 方法 | 路径 | 用途 | 主要 UI 使用位置 |
| --- | --- | --- | --- |
| `GET` | `/api/player/profile` | 读取玩家基础资料与章节进度 | 登录后初始化、全局玩家信息、调试面板 |
| `GET` | `/api/player/home` | 读取首页聚合数据 | 主界面、章节入口、顶部玩家信息、战斗入口预览 |
| `GET` | `/api/player/chapters` | 读取章节列表与解锁状态 | 章节页、章节卡片、关卡选择弹层 |
| `GET` | `/api/player/skills` | 读取功法列表与详情展示所需字段 | 功法列表、功法详情、构筑展示只读态 |
| `GET` | `/api/battle/session` | 读取当前战斗会话 | 战斗入口恢复、HUD 初始态、结算后状态回显 |
| `POST` | `/api/battle/session/start` | 创建或重置当前战斗会话 | 章节页点击开战、进入战斗页前置步骤 |
| `POST` | `/api/battle/session/simulate` | 服务端模拟整场战斗并返回 HUD、战报、收益 | 战斗 HUD、文字战报、战斗结果预览 |
| `POST` | `/api/battle/session/settle` | 结算战斗并推进章节进度 | 结算页、返回章节页刷新进度 |
| `GET` | `/api/config/chapter` | 读取章节静态配置 | 无账号配置预览、章节页兜底、联调自查 |

## 3. 玩家与首页接口

### 3.1 GET /api/player/profile

用途：按账号读取玩家基础信息、玩家进度和前端可直接使用的 `profile` 聚合对象。

请求参数：

| 字段 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| `account` | query | 是 | `string` | 玩家账号，后端会转为大写并去除首尾空格 |

核心返回字段：

| 字段 | 类型 | 说明 | UI 使用位置 |
| --- | --- | --- | --- |
| `player.id` | `string` | 玩家数据库 ID | 调试、埋点预留 |
| `player.account` | `string` | 账号 | 顶部玩家信息、调试面板 |
| `player.nickname` | `string` | 昵称 | 顶部玩家信息 |
| `progress.currentChapterId` | `number` | 当前选中章节 | 章节页高亮、战斗入口 |
| `progress.highestUnlockedChapterId` | `number` | 最高已解锁章节 | 章节卡锁定态、首页摘要 |
| `profile` | `object` | `player` 与章节进度合并后的对象 | 前端多数页面推荐使用 |

空值/错误规则：

| 场景 | 响应 |
| --- | --- |
| `account` 为空 | `400`，`error = "账号不能为空"` |
| 玩家不存在 | `400`，`error = "账号不存在"` |
| 玩家缺少进度行 | 后端自动创建默认进度，`currentChapterId = 1`、`highestUnlockedChapterId = 1` |

响应样例：

```json
{
  "ok": true,
  "player": {
    "id": "cmf0player001",
    "account": "PABC1234",
    "nickname": "少侠",
    "lastLoginAt": "2026-05-01T02:30:00.000Z",
    "createdAt": "2026-05-01T02:00:00.000Z",
    "updatedAt": "2026-05-01T02:30:00.000Z"
  },
  "progress": {
    "currentChapterId": 1,
    "highestUnlockedChapterId": 2,
    "createdAt": "2026-05-01T02:00:00.000Z",
    "updatedAt": "2026-05-01T02:20:00.000Z"
  },
  "profile": {
    "id": "cmf0player001",
    "account": "PABC1234",
    "nickname": "少侠",
    "lastLoginAt": "2026-05-01T02:30:00.000Z",
    "createdAt": "2026-05-01T02:00:00.000Z",
    "updatedAt": "2026-05-01T02:30:00.000Z",
    "currentChapterId": 1,
    "highestUnlockedChapterId": 2
  }
}
```

### 3.2 GET /api/player/home

用途：读取首页 / 主界面可直接消费的聚合数据，减少前端首次进入主流程时的多接口拼装。

请求参数：

| 字段 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| `account` | query | 是 | `string` | 玩家账号 |

核心返回字段：

| 字段 | 类型 | 说明 | UI 使用位置 |
| --- | --- | --- | --- |
| `profile` | `object` | 玩家基础信息与进度 | 顶部玩家信息、全局状态 |
| `role` | `object \| null` | 默认角色配置 | 首页角色面板、战斗 HUD 英雄兜底 |
| `currentChapter` | `object \| null` | 当前章节配置 | 首页章节卡、开战入口 |
| `chapterOverview` | `object` | 当前章节、最高解锁、章节总数 | 章节进度摘要 |
| `skillSummary` | `object` | 功法数量统计 | 首页功法入口红点 / 数量展示 |
| `battleSession` | `object \| null` | 当前战斗会话预览 | 继续战斗按钮、战斗入口恢复 |
| `display.playerMeta` | `string` | 后端拼好的玩家摘要 | 顶部副标题 |
| `display.chapterSummary` | `string` | 后端拼好的章节摘要 | 首页章节说明 |

空值/错误规则：

| 场景 | 响应 |
| --- | --- |
| 玩家未开始战斗 | `battleSession = null` |
| 当前章节配置缺失 | `currentChapter = null`，`chapterOverview.currentChapterTitle = ""` |
| 默认角色配置缺失 | `role = null` |
| 账号错误 | `400`，沿用 profile 错误 |

响应样例：

```json
{
  "ok": true,
  "profile": {
    "account": "PABC1234",
    "nickname": "少侠",
    "currentChapterId": 1,
    "highestUnlockedChapterId": 2
  },
  "role": {
    "id": 1,
    "name": "铁匠之子",
    "grade": "N",
    "position": "前排",
    "baseAtk": 10,
    "baseLife": 100,
    "atkSpeed": 1.2,
    "critRate": 0.12,
    "unlockType": "default",
    "passiveDesc": "每轮战斗后恢复少量生命"
  },
  "currentChapter": {
    "id": 1,
    "chapter": "第1章",
    "name": "银杏村",
    "missionId": 1,
    "missionCount": 5,
    "guessHeroLife": 100,
    "guessHeroAtk": 10,
    "normalWaveRule": "2,3,4",
    "bossWaveCount": 1,
    "waveCycle": "2 3 4",
    "totalWaveEstimate": 9,
    "skillPoolRange": ["1", "8"],
    "enemyTheme": ["村口", "野怪"],
    "waveTemplate": "前两层普通波 / 第三层精英波 / 第五层 BOSS 波",
    "title": "第1章 · 银杏村",
    "description": "第1章 · 银杏村 / 关卡数 5 / 预计波次 9 / 推荐生命 100 / 推荐攻击 10"
  },
  "chapterOverview": {
    "currentChapterId": 1,
    "highestUnlockedChapterId": 2,
    "totalChapters": 3,
    "currentChapterTitle": "第1章 · 银杏村"
  },
  "skillSummary": {
    "total": 24,
    "unlocked": 16,
    "owned": 0,
    "upgradeable": 0
  },
  "battleSession": null,
  "display": {
    "playerMeta": "PABC1234 / 已解锁至第2章",
    "chapterSummary": "第1章 · 银杏村 / 关卡数 5 / 预计波次 9 / 推荐生命 100 / 推荐攻击 10"
  }
}
```

## 4. 章节与配置接口

### 4.1 GET /api/player/chapters

用途：按账号读取章节列表，并按玩家进度补充 `unlocked` 与 `isCurrent`，用于章节页真实数据渲染。

请求参数：

| 字段 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| `account` | query | 是 | `string` | 玩家账号 |

核心返回字段：

| 字段 | 类型 | 说明 | UI 使用位置 |
| --- | --- | --- | --- |
| `currentChapterId` | `number` | 当前选中章节 | 当前章节高亮 |
| `highestUnlockedChapterId` | `number` | 最高已解锁章节 | 章节锁定判断 |
| `chapters[]` | `array` | 章节卡列表 | 章节页主体 |
| `chapters[].unlocked` | `boolean` | 是否可进入 | 章节卡锁 / 按钮状态 |
| `chapters[].isCurrent` | `boolean` | 是否当前选中 | 当前标记 |
| `chapters[].skillPoolRange` | `string[]` | 本章功法池范围 | 章节详情、功法掉落预览 |
| `chapters[].enemyTheme` | `string[]` | 敌人主题标签 | 章节详情、怪物预览 |

空值/错误规则：

| 场景 | 响应 |
| --- | --- |
| 章节配置为空 | `chapters = []`，`count = 0` |
| 玩家不存在或账号为空 | `400` |

章节页响应样例：

```json
{
  "ok": true,
  "currentChapterId": 1,
  "highestUnlockedChapterId": 2,
  "chapters": [
    {
      "id": 1,
      "chapter": "第1章",
      "name": "银杏村",
      "missionId": 1,
      "missionCount": 5,
      "guessHeroLife": 100,
      "guessHeroAtk": 10,
      "normalWaveRule": "2,3,4",
      "bossWaveCount": 1,
      "waveCycle": "2 3 4",
      "totalWaveEstimate": 9,
      "skillPoolRange": ["1", "8"],
      "enemyTheme": ["村口", "野怪"],
      "waveTemplate": "前两层普通波 / 第三层精英波 / 第五层 BOSS 波",
      "title": "第1章 · 银杏村",
      "description": "第1章 · 银杏村 / 关卡数 5 / 预计波次 9 / 推荐生命 100 / 推荐攻击 10",
      "unlocked": true,
      "isCurrent": true
    },
    {
      "id": 2,
      "chapter": "第2章",
      "name": "破庙外道",
      "missionId": 101,
      "missionCount": 6,
      "guessHeroLife": 160,
      "guessHeroAtk": 18,
      "normalWaveRule": "2,3,4",
      "bossWaveCount": 1,
      "waveCycle": "2 3 4",
      "totalWaveEstimate": 12,
      "skillPoolRange": ["9", "16"],
      "enemyTheme": ["外道", "破庙"],
      "waveTemplate": "普通波 / 精英波 / BOSS 波",
      "title": "第2章 · 破庙外道",
      "description": "第2章 · 破庙外道 / 关卡数 6 / 预计波次 12 / 推荐生命 160 / 推荐攻击 18",
      "unlocked": true,
      "isCurrent": false
    }
  ],
  "count": 2
}
```

### 4.2 GET /api/config/chapter

用途：读取章节静态配置，不依赖账号，适合配置自查、无玩家态章节预览和联调兜底。

请求参数：无。

核心返回字段：

| 字段 | 类型 | 说明 | UI 使用位置 |
| --- | --- | --- | --- |
| `chapters[]` | `array` | 章节静态配置列表 | 配置预览、章节页兜底 |
| `count` | `number` | 章节数量 | 配置加载校验 |
| `chapters[].title` | `string` | 后端拼好的标题 | 章节卡标题 |
| `chapters[].description` | `string` | 后端拼好的摘要 | 章节详情 |

空值/错误规则：

| 场景 | 响应 |
| --- | --- |
| 配置表存在但无记录 | `chapters = []`，`count = 0` |
| 配置表未加载 | `500`，`error = "章节配置未加载，请检查 server/src/assets/config/C章节配置表.Chapter.xlsx"` |

响应样例：

```json
{
  "ok": true,
  "chapters": [
    {
      "id": 1,
      "chapter": "第1章",
      "name": "银杏村",
      "missionId": 1,
      "missionCount": 5,
      "guessHeroLife": 100,
      "guessHeroAtk": 10,
      "normalWaveRule": "2,3,4",
      "bossWaveCount": 1,
      "waveCycle": "2 3 4",
      "totalWaveEstimate": 9,
      "skillPoolRange": ["1", "8"],
      "enemyTheme": ["村口", "野怪"],
      "waveTemplate": "前两层普通波 / 第三层精英波 / 第五层 BOSS 波",
      "title": "第1章 · 银杏村",
      "description": "第1章 · 银杏村 / 关卡数 5 / 预计波次 9 / 推荐生命 100 / 推荐攻击 10"
    }
  ],
  "count": 1
}
```

## 5. 功法接口

### 5.1 GET /api/player/skills

用途：按账号读取功法列表、解锁态、拥有态、升级展示态和详情页所需配置字段。当前接口只读。

请求参数：

| 字段 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| `account` | query | 是 | `string` | 玩家账号 |

核心返回字段：

| 字段 | 类型 | 说明 | UI 使用位置 |
| --- | --- | --- | --- |
| `player` | `object` | 玩家 profile | 功法页顶部玩家态 |
| `summary.total` | `number` | 总功法数量 | 功法页统计 |
| `summary.unlocked` | `number` | 已开放功法数量 | 功法页统计 |
| `summary.owned` | `number` | 已拥有功法数量 | 构筑入口数量 |
| `summary.upgradeable` | `number` | 可升级功法数量 | 升级红点，仅展示 |
| `filters.grades` | `string[]` | 品质筛选项 | 功法列表筛选 |
| `filters.states` | `string[]` | 状态筛选项 | 功法列表筛选 |
| `skills[]` | `array` | 功法列表 | 功法列表、详情页 |
| `skills[].powerRateText` | `string[]` | 效果倍率展示文本 | 功法详情 |
| `skills[].upgradeCondText` | `string[]` | 升级条件展示文本 | 功法详情 |
| `skills[].statusText` | `string` | 后端拼好的状态文案 | 功法卡状态 |
| `skills[].metaText` | `string` | 品质 / 门派 / 类型摘要 | 功法卡副标题 |
| `skills[].canUpgrade` | `boolean` | 是否满足升级展示条件 | 升级态标识，不代表 V0 可调用升级接口 |

空值/错误规则：

| 场景 | 响应 |
| --- | --- |
| 玩家未拥有功法 | `owned = false`，`level = 0`，`stars = 0`，`progress = null` |
| 章节未开放 | `unlocked = false`，`chapterUnlocked = false`，`statusText` 提示解锁章节 |
| 配置表为空 | `skills = []`，统计为 0 |
| 账号错误 | `400` |

功法列表 / 详情响应样例：

```json
{
  "ok": true,
  "player": {
    "account": "PABC1234",
    "nickname": "少侠",
    "currentChapterId": 1,
    "highestUnlockedChapterId": 2
  },
  "summary": {
    "total": 24,
    "unlocked": 16,
    "owned": 2,
    "upgradeable": 1
  },
  "filters": {
    "grades": ["N", "R", "SR"],
    "states": ["upgrade", "locked"]
  },
  "skills": [
    {
      "id": 1,
      "name": "轻身术",
      "sectType": "通用",
      "moldType": "轻功",
      "grade": "N",
      "powerType": "dodge",
      "powerRate": [0.1, 0.2, 0.5],
      "powerRateText": ["10%", "20%", "50%"],
      "upgradeCond": [10, 20],
      "upgradeCondText": ["10", "20"],
      "unlockChapter": 1,
      "designTag": "生存",
      "desc": "提高闪避与机动能力，适合前期过渡。",
      "unlocked": true,
      "chapterUnlocked": true,
      "owned": true,
      "level": 1,
      "exp": 12,
      "stars": 1,
      "nextUpgradeNeed": 10,
      "canUpgrade": true,
      "progress": {
        "level": 1,
        "exp": 12,
        "stars": 1,
        "createdAt": "2026-05-01T02:10:00.000Z",
        "updatedAt": "2026-05-01T02:25:00.000Z"
      },
      "statusText": "已拥有 · 可升级 · 当前经验 12/10",
      "metaText": "N / 通用 / 轻功"
    },
    {
      "id": 9,
      "name": "破庙剑诀",
      "sectType": "剑",
      "moldType": "攻击",
      "grade": "R",
      "powerType": "atk",
      "powerRate": [0.12, 0.24, 0.48],
      "powerRateText": ["12%", "24%", "48%"],
      "upgradeCond": [20, 40],
      "upgradeCondText": ["20", "40"],
      "unlockChapter": 2,
      "designTag": "输出",
      "desc": "提升基础攻击，适合快速清普通波。",
      "unlocked": true,
      "chapterUnlocked": true,
      "owned": false,
      "level": 0,
      "exp": 0,
      "stars": 0,
      "nextUpgradeNeed": 0,
      "canUpgrade": false,
      "progress": null,
      "statusText": "章节已开放 · 尚未拥有",
      "metaText": "R / 剑 / 攻击"
    }
  ]
}
```

功法升级 V0 结论：

V0 仅展示升级状态，不开放升级接口。当前 `canUpgrade`、`nextUpgradeNeed`、`statusText` 只用于 UI 展示和一致性自查，不允许前端发起真实升级写库。

如果后续要新增升级接口，需要同时补齐经验来源、消耗规则、等级上限、幂等策略、失败回滚、战力重算和 UI 二次确认，风险是会扩大 V0 范围并影响战斗数值闭环，建议放到 V1 或独立任务评审。

## 6. 战斗接口

### 6.1 GET /api/battle/session

用途：读取当前账号最近一条战斗会话，支持战斗入口恢复、HUD 初始态和结算后状态回显。

请求参数：

| 字段 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| `account` | query | 是 | `string` | 玩家账号 |

核心返回字段：

| 字段 | 类型 | 说明 | UI 使用位置 |
| --- | --- | --- | --- |
| `session.status` | `string` | `active` / `settled` | HUD 状态、按钮状态 |
| `session.result` | `string \| null` | `victory` / `defeat` / `null` | 结果预览、结算入口 |
| `session.chapter` | `object \| null` | 当前章节配置 | 战斗标题、章节副标题 |
| `session.statusText` | `string` | 状态文案 | 战斗页状态条 |
| `session.display` | `object` | 标题、副标题、敌人摘要 | 战斗 HUD |
| `session.actions` | `object` | 可操作按钮状态 | 开始 / 模拟 / 结算 / 重试按钮 |

空值/错误规则：

| 场景 | 响应 |
| --- | --- |
| 玩家尚未开始战斗 | `200`，`session = null` |
| 玩家不存在或账号为空 | `400` |
| 会话章节配置缺失 | `session.chapter = null`，标题使用后端兜底文案 |

战斗 HUD 初始态样例：

```json
{
  "ok": true,
  "session": {
    "id": "cmf0battle001",
    "playerId": "cmf0player001",
    "chapterId": 1,
    "layerIndex": 1,
    "waveIndex": 1,
    "missionId": 1,
    "waveType": "普通波",
    "enemyId": 1,
    "enemyName": "山鸡",
    "enemyCount": 1,
    "enemyLife": 3,
    "enemyAtk": 2,
    "status": "active",
    "result": null,
    "startedAt": "2026-05-01T02:32:00.000Z",
    "settledAt": null,
    "createdAt": "2026-05-01T02:32:00.000Z",
    "updatedAt": "2026-05-01T02:32:00.000Z",
    "chapter": {
      "id": 1,
      "chapter": "第1章",
      "name": "银杏村",
      "title": "第1章 · 银杏村"
    },
    "statusText": "战斗会话进行中",
    "display": {
      "title": "银杏村 战斗准备",
      "subtitle": "第1层 · 第1波 · 普通波",
      "enemySummary": "山鸡 x 1",
      "enemyStats": {
        "life": 3,
        "atk": 2
      }
    },
    "actions": {
      "canStart": false,
      "canSimulate": true,
      "canSettle": true,
      "canRetry": true
    }
  }
}
```

### 6.2 POST /api/battle/session/start

用途：基于指定章节或当前章节创建 / 重置战斗会话。该接口不返回战斗日志，只负责进入战斗前初始化。

请求体：

| 字段 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- |
| `account` | 是 | `string` | 玩家账号 |
| `chapterId` | 否 | `number` | 目标章节；为空时使用玩家 `profile.currentChapterId` |

核心返回字段：

| 字段 | 类型 | 说明 | UI 使用位置 |
| --- | --- | --- | --- |
| `profile` | `object` | 玩家当前进度 | 战斗页玩家态 |
| `session` | `object` | 初始化后的会话 | 战斗 HUD 初始渲染 |
| `session.display` | `object` | 标题、副标题、敌人摘要 | 战斗页标题与敌方卡片 |
| `session.actions` | `object` | 操作按钮状态 | 进入战斗后的按钮控制 |

空值/错误规则：

| 场景 | 响应 |
| --- | --- |
| `chapterId` 为空 | 使用玩家当前章节 |
| `chapterId` 非正整数 | `400`，`error = "chapterId 必须是正整数"` |
| 章节尚未解锁 | `400`，`error = "目标章节尚未解锁"` |
| 当前章节没有 Mission | `400`，`error = "当前章节缺少可用战斗关卡"` |

响应样例：

```json
{
  "ok": true,
  "profile": {
    "account": "PABC1234",
    "nickname": "少侠",
    "currentChapterId": 1,
    "highestUnlockedChapterId": 2
  },
  "session": {
    "id": "cmf0battle001",
    "chapterId": 1,
    "layerIndex": 1,
    "waveIndex": 1,
    "missionId": 1,
    "waveType": "普通波",
    "enemyId": 1,
    "enemyName": "山鸡",
    "enemyCount": 1,
    "enemyLife": 3,
    "enemyAtk": 2,
    "status": "active",
    "result": null,
    "statusText": "战斗会话进行中",
    "display": {
      "title": "银杏村 战斗准备",
      "subtitle": "第1层 · 第1波 · 普通波",
      "enemySummary": "山鸡 x 1",
      "enemyStats": {
        "life": 3,
        "atk": 2
      }
    },
    "actions": {
      "canStart": false,
      "canSimulate": true,
      "canSettle": true,
      "canRetry": true
    }
  }
}
```

### 6.3 POST /api/battle/session/simulate

用途：由服务端按当前章节全部 Mission 波次连续模拟战斗，返回战斗 HUD 快照、文字战报、胜负和收益预览。

请求体：

| 字段 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- |
| `account` | 是 | `string` | 玩家账号 |

核心返回字段：

| 字段 | 类型 | 说明 | UI 使用位置 |
| --- | --- | --- | --- |
| `profile` | `object` | 玩家当前进度 | HUD 顶部玩家信息 |
| `session` | `object` | 更新后的会话，`result` 已写入 | 结果按钮状态 |
| `hero` | `object` | 英雄最终快照 | 战斗 HUD、角色血量、伤害统计 |
| `enemy` | `object` | 敌方与当前波次最终快照 | 战斗 HUD、波次进度、敌方卡 |
| `roundLogs` | `string[]` | 文字战报 | 战报滚动列表 |
| `result` | `string` | `victory` / `defeat` | 结果页状态 |
| `summaryText` | `string` | 后端生成的战斗总结 | 结算页摘要 |
| `rewards` | `object` | 预估收益 | 结算页奖励区 |

空值/错误规则：

| 场景 | 响应 |
| --- | --- |
| 没有 active 会话 | `400`，`error = "当前没有进行中的战斗会话"` |
| 当前章节缺少 Mission | `400`，`error = "当前章节缺少可模拟的 Mission 波次"` |
| 已 simulate 未 settle 再次调用 | 允许，服务端会重算并覆盖 `session.result` |

战斗 HUD / 文字战报样例：

```json
{
  "ok": true,
  "profile": {
    "account": "PABC1234",
    "nickname": "少侠",
    "currentChapterId": 1,
    "highestUnlockedChapterId": 2
  },
  "session": {
    "chapterId": 1,
    "status": "active",
    "result": "victory",
    "statusText": "战斗已完成模拟，等待结算",
    "actions": {
      "canStart": false,
      "canSimulate": true,
      "canSettle": true,
      "canRetry": true
    }
  },
  "hero": {
    "roleId": 1,
    "name": "铁匠之子",
    "grade": "N",
    "position": "前排",
    "maxLife": 100,
    "currentLife": 25,
    "atk": 10,
    "critRate": 0.12,
    "atkSpeed": 1.2,
    "critMultiplier": 1.5,
    "guard": 4,
    "totalDamageDealt": 141,
    "totalDamageTaken": 75,
    "derivedFromChapterId": 2,
    "passiveDesc": "每轮战斗后恢复少量生命",
    "status": "survived",
    "previewText": "铁匠之子 / 生命 25/100 / 攻击 10"
  },
  "enemy": {
    "chapterId": 1,
    "chapterName": "银杏村",
    "totalWaveCount": 9,
    "clearedWaveCount": 9,
    "remainingWaveCount": 0,
    "totalEnemyCount": 13,
    "remainingEnemyCount": 0,
    "totalEnemyLife": 90,
    "remainingEnemyLife": 0,
    "currentWave": {
      "missionId": 9,
      "layerIndex": 5,
      "waveIndex": 1,
      "waveType": "BOSS",
      "enemyId": 99,
      "enemyName": "山鸡王",
      "enemyCount": 1,
      "enemyLife": 40,
      "enemyAtk": 23,
      "attackType": "melee",
      "totalLife": 40,
      "remainingCount": 0,
      "remainingLife": 0,
      "cleared": true
    },
    "previewText": "银杏村 / 已清 9/9 波"
  },
  "roundLogs": [
    "第1层第1波开始：遭遇山鸡 x 1，敌方总生命 3，总攻击 2。",
    "第1层第1波 第1回合：英雄造成 10 点伤害，敌方剩余 0 个，生命池 0。",
    "第1层第1波结束：山鸡 全部被击败。",
    "波次间隙：英雄恢复 6 点生命，当前生命 100/100。",
    "第5层第1波开始：遭遇山鸡王 x 1，敌方总生命 40，总攻击 23。"
  ],
  "result": "victory",
  "summaryText": "铁匠之子 成功打通 银杏村 全部 9 波，剩余生命 25/100。预计收益：铜钱 392，经验 80",
  "rewards": {
    "coin": 392,
    "exp": 80
  }
}
```

### 6.4 POST /api/battle/session/settle

用途：服务端重新模拟并结算当前 active 会话，把结果写入会话状态，并在胜利时推进玩家章节进度。

请求体：

| 字段 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- |
| `account` | 是 | `string` | 玩家账号 |

核心返回字段：

| 字段 | 类型 | 说明 | UI 使用位置 |
| --- | --- | --- | --- |
| `profile` | `object` | 结算后的玩家进度 | 结算页、返回章节页刷新 |
| `progress` | `object` | 结算后的进度记录 | 章节页状态同步 |
| `session` | `object` | 已结算会话，`status = settled` | 结算状态 |
| `settlement.result` | `string` | `victory` / `defeat` | 结算页主状态 |
| `settlement.currentChapter` | `object \| null` | 结算后当前章节 | 下一步按钮 |
| `settlement.justUnlockedChapter` | `object \| null` | 本次胜利解锁章节 | 解锁提示 |
| `settlement.summaryText` | `string` | 战斗总结 | 结算页摘要 |
| `settlement.nextAction` | `string` | 后端建议下一步文案 | 结算页按钮说明 |

空值/错误规则：

| 场景 | 响应 |
| --- | --- |
| 没有 active 会话 | `400`，`error = "当前没有进行中的战斗会话"` |
| 失败结算 | `justUnlockedChapter = null`，`currentChapterId` 保持当前失败章节 |
| 已 settle 后重复调用 | `400`，因为不再是 active 会话 |
| 胜利时已经在最后一章 | `currentChapterId` 与 `highestUnlockedChapterId` 不超过最大章节 ID |

结算页样例：

```json
{
  "ok": true,
  "profile": {
    "account": "PABC1234",
    "nickname": "少侠",
    "currentChapterId": 2,
    "highestUnlockedChapterId": 2
  },
  "progress": {
    "currentChapterId": 2,
    "highestUnlockedChapterId": 2,
    "createdAt": "2026-05-01T02:00:00.000Z",
    "updatedAt": "2026-05-01T02:40:00.000Z"
  },
  "session": {
    "chapterId": 1,
    "status": "settled",
    "result": "victory",
    "settledAt": "2026-05-01T02:40:00.000Z",
    "statusText": "本局已通关结算",
    "display": {
      "title": "银杏村 战斗准备",
      "subtitle": "结算结果：victory",
      "enemySummary": "山鸡王 x 1",
      "enemyStats": {
        "life": 40,
        "atk": 23
      }
    },
    "actions": {
      "canStart": true,
      "canSimulate": false,
      "canSettle": false,
      "canRetry": true
    }
  },
  "settlement": {
    "result": "victory",
    "currentChapter": {
      "id": 2,
      "chapter": "第2章",
      "name": "破庙外道",
      "title": "第2章 · 破庙外道"
    },
    "justUnlockedChapter": {
      "id": 2,
      "chapter": "第2章",
      "name": "破庙外道",
      "title": "第2章 · 破庙外道"
    },
    "summaryText": "铁匠之子 成功打通 银杏村 全部 9 波，剩余生命 25/100。预计收益：铜钱 392，经验 80",
    "nextAction": "返回章节页并刷新到最新解锁进度"
  }
}
```

## 7. V0 缺口评估与建议契约草案

当前后端没有以下真实写库接口：

| 缺口 | 当前状态 | 对前端影响 |
| --- | --- | --- |
| 候选功法接口 | 未实现 | 战斗结算后的“选择功法”只能用静态展示或前端假数据 |
| 刷新候选功法接口 | 未实现 | 无法服务端扣资源 / 记录刷新次数 |
| 确认选择功法接口 | 未实现 | 无法把选择结果写入 `PlayerSkillProgress` |
| 本局构筑条接口 | 未实现 | 无法持久化本局已选功法、槽位、临时增益 |

三选一评估：

| 方案 | 内容 | 优点 | 风险 | 建议 |
| --- | --- | --- | --- | --- |
| A | V0 不新增接口，只展示 `GET /api/player/skills` 只读功法状态 | 范围最小，不影响当前战斗闭环 | 选择功法、刷新、构筑条只能做假态 | 若 PM 要求快速联调 UI，选择 A |
| B | 新增候选、刷新、确认选择三个接口，但不做完整构筑条 | 可支持结算页真实选择功法 | 需要补随机池、幂等、重复选择规则 | 若 PM 确认 V0 要真实获得功法，选择 B |
| C | 新增完整本局构筑条、候选、刷新、确认选择与战斗加成联动 | 最接近正式玩法 | 涉及战斗数值、数据库 schema、前端状态机，范围明显扩大 | 不建议 V0 当前阶段采用 |

后端建议：当前 V0 真数据落地优先选择方案 A；如 PM 明确要求“结算页真实获得功法”，再以方案 B 单独开后端任务。

### 7.1 待新增：GET /api/battle/session/skill-candidates

用途：读取当前战斗结算后的候选功法列表。

建议请求参数：

| 字段 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| `account` | query | 是 | `string` | 玩家账号 |
| `sessionId` | query | 否 | `string` | 指定战斗会话；为空时取当前玩家最近会话 |

建议响应：

```json
{
  "ok": true,
  "sessionId": "cmf0battle001",
  "candidateRound": 1,
  "refreshCount": 0,
  "refreshCost": {
    "coin": 20
  },
  "candidates": [
    {
      "candidateId": "cand_001",
      "skillId": 1,
      "name": "轻身术",
      "grade": "N",
      "sectType": "通用",
      "moldType": "轻功",
      "desc": "提高闪避与机动能力，适合前期过渡。",
      "owned": false,
      "levelPreview": 1,
      "powerRateText": ["10%", "20%", "50%"],
      "selectState": "available"
    }
  ]
}
```

关键规则草案：

| 规则 | 建议 |
| --- | --- |
| 候选池 | 从当前章节 `skillPoolRange` 内抽取，过滤未开放章节以外的功法 |
| 候选数量 | V0 建议固定 3 个 |
| 幂等 | 同一 `sessionId` 未刷新前重复 GET 返回同一批候选 |
| 空候选 | 返回 `candidates = []`，前端展示“暂无可选功法” |

### 7.2 待新增：POST /api/battle/session/skill-candidates/refresh

用途：刷新当前战斗结算候选功法。

建议请求体：

| 字段 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- |
| `account` | 是 | `string` | 玩家账号 |
| `sessionId` | 否 | `string` | 指定战斗会话 |

建议响应：

```json
{
  "ok": true,
  "sessionId": "cmf0battle001",
  "candidateRound": 2,
  "refreshCount": 1,
  "refreshCost": {
    "coin": 20
  },
  "remainingCurrency": {
    "coin": 372
  },
  "candidates": [
    {
      "candidateId": "cand_004",
      "skillId": 9,
      "name": "破庙剑诀",
      "grade": "R",
      "selectState": "available"
    }
  ]
}
```

关键规则草案：

| 规则 | 建议 |
| --- | --- |
| 刷新消耗 | V0 若没有货币表，不建议真实扣费；可先返回 `refreshCost` 但不落库 |
| 刷新上限 | V0 建议每次结算最多 3 次 |
| 幂等 | 每次 POST 创建新候选批次，需记录 `candidateRound` |
| 错误 | 无 active / settled 结算上下文时返回 `400` |

### 7.3 待新增：POST /api/battle/session/skill-candidates/confirm

用途：确认选择一个候选功法，并写入玩家功法进度。

建议请求体：

| 字段 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- |
| `account` | 是 | `string` | 玩家账号 |
| `sessionId` | 否 | `string` | 指定战斗会话 |
| `candidateId` | 是 | `string` | 候选项 ID |
| `skillId` | 是 | `number` | 功法 ID，服务端需与候选记录校验一致 |

建议响应：

```json
{
  "ok": true,
  "selected": {
    "skillId": 1,
    "name": "轻身术",
    "ownedBefore": false,
    "level": 1,
    "exp": 0,
    "stars": 1
  },
  "skillSummary": {
    "total": 24,
    "unlocked": 16,
    "owned": 3,
    "upgradeable": 0
  },
  "buildBar": {
    "slots": [
      {
        "slotIndex": 1,
        "skillId": 1,
        "name": "轻身术",
        "grade": "N",
        "level": 1
      }
    ],
    "capacity": 5
  }
}
```

关键规则草案：

| 规则 | 建议 |
| --- | --- |
| 重复确认 | 同一会话只能确认一次；重复提交返回已确认结果或 `409`，需 PM 定规则 |
| 已拥有功法 | 可转为经验或升星，但 V0 需要 PM 明确转换规则 |
| 写库目标 | `PlayerSkillProgress`，必要时新增候选记录表保证幂等 |
| 与 settle 关系 | 建议必须在 `settle` 成功后才能选择，避免失败局也获得功法 |

### 7.4 待新增：GET /api/player/build

用途：读取玩家当前构筑条 / 已装配功法槽位。

建议请求参数：

| 字段 | 位置 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| `account` | query | 是 | `string` | 玩家账号 |

建议响应：

```json
{
  "ok": true,
  "capacity": 5,
  "slots": [
    {
      "slotIndex": 1,
      "skillId": 1,
      "name": "轻身术",
      "grade": "N",
      "level": 1,
      "stars": 1,
      "powerType": "dodge",
      "powerRateText": ["10%", "20%", "50%"],
      "statusText": "已装配"
    }
  ],
  "effectsPreview": [
    {
      "powerType": "dodge",
      "valueText": "10%"
    }
  ]
}
```

关键规则草案：

| 规则 | 建议 |
| --- | --- |
| V0 范围 | 只读展示即可，不建议加入拖拽换位、卸下、替换 |
| 数据来源 | 可由 `PlayerSkillProgress` 推导，也可新增装配表 |
| 战斗联动 | 若要影响战斗，需要同步修改 `battleSessionService` 的英雄快照计算 |

## 8. 前端一致性自查样例需求

前端 UI 真数据自查建议至少准备以下接口样例：

| 自查页面 / 状态 | 必需接口样例 | 校验点 |
| --- | --- | --- |
| 登录后主界面 | `GET /api/player/home` | 顶部玩家信息、当前章节摘要、功法统计、无战斗时 `battleSession = null` |
| 章节页正常态 | `GET /api/player/chapters` | 当前章节高亮、已解锁章节可点、未解锁章节置灰 |
| 章节页配置兜底 | `GET /api/config/chapter` | 无账号时仍能看到章节标题、摘要、敌人主题、功法池范围 |
| 功法列表 | `GET /api/player/skills` | 品质、门派、类型、锁定态、拥有态、升级展示态 |
| 功法详情 | `GET /api/player/skills` 中单个 `skills[]` | `desc`、`powerRateText`、`upgradeCondText`、`statusText` 完整显示 |
| 战斗入口恢复 | `GET /api/battle/session` | 无会话、active 会话、已模拟未结算、settled 会话四种状态 |
| 战斗 HUD | `POST /api/battle/session/start` 与 `POST /api/battle/session/simulate` | 英雄血量、敌方血量、波次进度、按钮状态 |
| 文字战报 | `POST /api/battle/session/simulate` | `roundLogs` 顺序渲染、长列表滚动、空数组兜底 |
| 胜利结算页 | `POST /api/battle/session/settle` | `justUnlockedChapter`、`currentChapter`、`summaryText`、下一步文案 |
| 失败结算页 | `POST /api/battle/session/settle` | `result = defeat`、`justUnlockedChapter = null`、章节不推进 |
| 候选功法选择页 | 待新增候选接口样例 | 当前无真实接口，必须使用 mock 或等待后端新增 |
| 构筑条 | 待新增构筑条接口样例 | 当前无真实接口，必须使用 mock 或等待后端新增 |

建议联调流程：

1. 登录或注册账号，保存 `account`。
2. 调用 `GET /api/player/home` 渲染主界面。
3. 调用 `GET /api/player/chapters` 渲染章节页。
4. 对当前可进入章节调用 `POST /api/battle/session/start`。
5. 调用 `POST /api/battle/session/simulate` 渲染 HUD 与文字战报。
6. 调用 `POST /api/battle/session/settle` 渲染结算页并刷新章节进度。
7. 调用 `GET /api/player/skills` 检查功法列表与详情页展示态。

## 9. V0 当前边界结论

| 模块 | V0 结论 |
| --- | --- |
| 章节真数据 | 已有接口支持，使用 `GET /api/player/chapters` 和 `GET /api/config/chapter` |
| 首页聚合数据 | 已有接口支持，使用 `GET /api/player/home` |
| 战斗 HUD | 已有接口支持，使用 `start` 与 `simulate` 返回的 `session`、`hero`、`enemy` |
| 文字战报 | 已有接口支持，使用 `simulate.roundLogs` |
| 结算页 | 已有接口支持，使用 `settle.settlement` |
| 功法列表 / 详情 | 已有只读接口支持，使用 `GET /api/player/skills` |
| 功法升级 | V0 仅展示升级状态，不开放升级接口 |
| 候选功法 / 刷新 / 确认选择 | 当前无真实接口，需 PM 在 A/B/C 方案中确认是否新增 |
| 本局构筑条 | 当前无真实接口，V0 如需真实构筑需新增契约与数据结构 |
