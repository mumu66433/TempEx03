import fs from "node:fs/promises";
import path from "node:path";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const workspace = "D:\\Doc\\codex\\TempEx03";
const sourcePath = path.join(workspace, "docs", "需求文档", "剑侠风云策划案_04211038.xlsx");
const outputPath = path.join(workspace, "docs", "设定规范", "剑侠风云完整策划案_v1.xlsx");

const palette = {
  navy: "#17324D",
  blue: "#2B5A84",
  teal: "#2A7A78",
  gold: "#C18B2F",
  pale: "#F6F1E7",
  soft: "#F3F7FB",
  green: "#EAF5EF",
  orange: "#FFF3E8",
  red: "#FCECEC",
  gray: "#6B7280",
  border: "#D7DEE8",
  white: "#FFFFFF",
};

function a1(row, col) {
  let n = col;
  let letters = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    letters = String.fromCharCode(65 + rem) + letters;
    n = Math.floor((n - 1) / 26);
  }
  return `${letters}${row}`;
}

function writeMatrix(sheet, row, col, matrix, options = {}) {
  const rowCount = matrix.length;
  const colCount = Math.max(...matrix.map((r) => r.length));
  const padded = matrix.map((r) => {
    const next = [...r];
    while (next.length < colCount) next.push("");
    return next;
  });
  const range = sheet.getRange(`${a1(row, col)}:${a1(row + rowCount - 1, col + colCount - 1)}`);
  range.values = padded;
  if (options.format) range.format = options.format;
  return range;
}

function setColumnWidths(sheet, widths) {
  widths.forEach((width, i) => {
    sheet.getRange(`${a1(1, i + 1)}:${a1(300, i + 1)}`).format.columnWidthPx = width;
  });
}

function styleSheet(sheet) {
  sheet.showGridLines = false;
  sheet.freezePanes.freezeRows(1);
}

function addTitle(sheet, title, subtitle) {
  sheet.getRange("A1:H1").merge();
  sheet.getRange("A1").values = [[title]];
  sheet.getRange("A1").format = {
    fill: palette.navy,
    font: { bold: true, color: palette.white, size: 16 },
    horizontalAlignment: "left",
    verticalAlignment: "center",
    rowHeightPx: 28,
  };
  sheet.getRange("A2:H2").merge();
  sheet.getRange("A2").values = [[subtitle]];
  sheet.getRange("A2").format = {
    fill: palette.soft,
    font: { color: palette.gray, italic: true, size: 10 },
    rowHeightPx: 22,
    verticalAlignment: "center",
  };
}

function addSectionHeader(sheet, row, title, fill = palette.blue) {
  sheet.getRange(`A${row}:H${row}`).merge();
  sheet.getRange(`A${row}`).values = [[title]];
  sheet.getRange(`A${row}`).format = {
    fill,
    font: { bold: true, color: palette.white, size: 12 },
    rowHeightPx: 24,
    verticalAlignment: "center",
  };
}

function addTable(sheet, startRow, headers, rows, widths, theme = "soft") {
  const fill = theme === "green" ? palette.green : theme === "orange" ? palette.orange : palette.soft;
  writeMatrix(sheet, startRow, 1, [headers], {
    format: {
      fill,
      font: { bold: true, color: palette.navy },
      verticalAlignment: "center",
      wrapText: true,
    },
  });
  writeMatrix(sheet, startRow + 1, 1, rows, {
    format: {
      verticalAlignment: "top",
      wrapText: true,
    },
  });
  const endRow = startRow + rows.length;
  sheet.getRange(`A${startRow}:${a1(endRow, headers.length).replace(/\d+$/, String(endRow))}`).format.borders = {
    color: palette.border,
    style: "Continuous",
  };
  if (widths) setColumnWidths(sheet, widths);
}

function addBullets(sheet, startRow, title, bullets, fill = palette.teal) {
  addSectionHeader(sheet, startRow, title, fill);
  const rows = bullets.map((text, index) => [index + 1, text]);
  addTable(sheet, startRow + 1, ["序号", "内容"], rows, [70, 760], "soft");
}

function addRoadmapSheet(workbook) {
  const sheet = workbook.worksheets.add("00_完整策划总览");
  styleSheet(sheet);
  setColumnWidths(sheet, [90, 190, 170, 170, 170, 170, 170, 180]);
  addTitle(sheet, "剑侠风云完整策划案", "基于现有原型策划案与公开版本玩法结构补完，供产品、程序、美术与数值共同评审。");
  addSectionHeader(sheet, 4, "项目定义");
  addTable(
    sheet,
    5,
    ["模块", "内容", "说明", "当前建议"],
    [
      ["游戏类型", "武侠 Roguelike + 局外长线养成", "保留原案的功法构筑乐趣，扩充中长期追求", "采用章节爬塔 + 周期活动双线驱动"],
      ["目标平台", "微信小游戏", "碎片时间游玩，强调短局快反馈", "竖屏 750x1624，低门槛回流"],
      ["核心卖点", "门派功法构筑、角色差异、装备法宝联动", "一局一构筑，局外多线成长", "突出门派羁绊与角色专属流派"],
      ["版本目标", "做出可长期运营的武侠放置/构筑产品", "从原型升级到可上线版本设计", "先做主线+挂机+角色+装备+法宝"],
    ],
    [110, 220, 260, 260],
  );
  addSectionHeader(sheet, 11, "与原始策划案相比的重点补完");
  addTable(
    sheet,
    12,
    ["补完方向", "原案现状", "本版补充", "原因"],
    [
      ["角色系统", "仅 1 个示意角色", "补到多角色、天赋、升星、定位", "真实产品已形成角色差异与养成深度"],
      ["装备系统", "缺失", "补装备部位、品质、词条、强化、神器", "支撑战力成长与资源回收"],
      ["法宝系统", "缺失", "补法宝槽位、品质、技能与升阶", "增加战斗策略与长期目标"],
      ["玩法系统", "只有章节爬塔", "补挂机、扫矿、远征、华山论剑、帮派、跑商", "提升留存与社交活跃"],
      ["经济系统", "只有功法升级概念", "补货币、消耗、掉落、活动奖励", "保证数值闭环可落地"],
      ["版本规划", "未拆阶段", "补 M0-M3 范围与研发优先级", "方便项目按阶段推进"],
    ],
    [130, 180, 260, 220],
    "orange",
  );
  addSectionHeader(sheet, 20, "版本里程碑建议");
  addTable(
    sheet,
    21,
    ["阶段", "目标", "必须包含", "可以延后"],
    [
      ["M0 核心可玩", "验证功法构筑战斗", "主线章节、三选一、敌人、结算、功法升级", "帮派、跑商、PVP"],
      ["M1 首发版本", "形成日常循环", "角色、装备、法宝、挂机、扫矿、七日目标", "跨服玩法"],
      ["M2 长线版本", "提高中期留存", "远征、轮回塔、矿点争夺、活动副本", "复杂工会战"],
      ["M3 运营版本", "提升社交与商业化", "帮派、跑商、排位赛、通行证、节日活动", "跨服GVG"],
    ],
    [110, 170, 300, 250],
    "green",
  );
}

function addPositioningSheet(workbook) {
  const sheet = workbook.worksheets.add("01_产品定位");
  styleSheet(sheet);
  addTitle(sheet, "产品定位与用户画像", "明确本项目做给谁、靠什么留住人、与同类差异在哪里。");
  addBullets(sheet, 4, "目标用户", [
    "喜欢武侠题材、收集养成与随机构筑的轻中度玩家。",
    "微信小游戏用户，偏好 3 至 8 分钟单局、随时上线领奖和挂机成长。",
    "曾玩过《弓箭传说》《寻道大千》《咸鱼之王》这类长线养成产品的用户。",
  ]);
  addBullets(sheet, 11, "核心体验", [
    "短局战斗爽感：单局内通过三选一快速成型，形成爆发式成长。",
    "长期追求明确：角色、装备、法宝、功法、挂机资源层层叠加。",
    "武侠辨识度：14 门派与 10 流派交织，形成可读性强的套路组合。",
  ], palette.gold);
  addTable(
    sheet,
    18,
    ["维度", "剑侠风云建议方向", "竞品常见做法", "我们的差异点"],
    [
      ["战斗结构", "章节层波 + 每层结算三选一", "单线闯关或纯放置", "兼顾手动构筑感与轻量自动战斗"],
      ["局外养成", "角色/功法/装备/法宝并行", "单战力树或单卡牌", "用武侠门派关系串联多个系统"],
      ["社交竞争", "华山论剑、矿点争夺、帮派跑商", "单榜单竞争", "轻社交、重资源争夺与协作"],
      ["活动节奏", "周活动 + 节日活动 + 通行证", "单一签到活动", "让回流玩家有明确追赶路径"],
    ],
    [120, 240, 200, 240],
  );
}

function addLoopSheet(workbook) {
  const sheet = workbook.worksheets.add("02_核心循环");
  styleSheet(sheet);
  addTitle(sheet, "核心循环与日常节奏", "把单局构筑、局外养成和活动追求连接成闭环。");
  addTable(
    sheet,
    4,
    ["循环层级", "触发入口", "玩家行为", "主要奖励", "主要消耗"],
    [
      ["单局战斗", "点击章节/玩法进入", "闯层、打波次、三选一功法、击败BOSS", "章节进度、功法星级、战斗爽感", "体力/挑战次数、时间"],
      ["局外养成", "主城各系统入口", "升级功法、角色、装备、法宝", "战力提升、新套路解锁", "铜钱、经验、碎片、材料"],
      ["日常循环", "挂机/扫矿/日常任务", "上线领奖、完成任务、兑换商店", "稳定资源、活跃奖励", "扫荡券、行动次数"],
      ["周常目标", "远征、论剑、帮派活动", "冲层、竞赛、协作", "稀有装备、法宝碎片、称号", "门票、排名压力"],
      ["长线追求", "版本更新与活动", "收集 UR 角色、神器、限定法宝", "收藏满足、长期成长", "时间与高阶材料"],
    ],
    [120, 160, 280, 190, 160],
  );
  addBullets(sheet, 12, "推荐日常 20 分钟节奏", [
    "第 1 次登录：收挂机奖励、强化角色/装备、清主线与日常。",
    "中午回流：扫矿、领取活动奖励、处理跑商和帮派捐献。",
    "晚间主时段：挑战远征/华山论剑/限时活动，冲排名拿周奖励。",
  ], palette.blue);
}

function addSystemSheet(workbook) {
  const sheet = workbook.worksheets.add("03_系统矩阵");
  styleSheet(sheet);
  addTitle(sheet, "系统矩阵与研发优先级", "方便评估研发范围和依赖关系。");
  addTable(
    sheet,
    4,
    ["系统", "分类", "核心功能", "首发优先级", "依赖", "备注"],
    [
      ["章节闯关", "PVE核心", "层波推进、三选一、BOSS 结算", "P0", "战斗框架、功法池", "必须优先完成"],
      ["功法系统", "构筑核心", "解锁、升星、羁绊、局内池子控制", "P0", "角色属性、战斗公式", "延续原案主体"],
      ["角色系统", "成长核心", "角色解锁、天赋、星级、定位差异", "P0", "数值框架、抽卡/碎片", "首发就要有"],
      ["装备系统", "成长核心", "部位、品质、词条、强化、神器", "P0", "掉落、背包、材料", "提高战力层次"],
      ["法宝系统", "成长扩展", "法宝槽位、主动/被动效果、升阶", "P1", "战斗事件、资源投放", "提升后期深度"],
      ["挂机与扫矿", "日常资源", "离线产出、扫荡、矿点挑战", "P0", "章节进度、奖励投放", "承接小游戏习惯"],
      ["远征/轮回塔", "中期玩法", "多层挑战、首通奖励、周重置", "P1", "角色战力、排行榜", "中期留存抓手"],
      ["华山论剑", "PVP", "异步对战、段位、赛季奖励", "P1", "阵容快照、战报", "提升竞争感"],
      ["帮派系统", "社交", "入帮、捐献、商店、帮派任务", "P2", "聊天、红点、活动", "后置但价值高"],
      ["跑商系统", "活动", "接单、派遣、收益波动", "P2", "帮派或个人玩法", "适合做版本亮点"],
      ["通行证/活动", "运营", "活跃任务、积分、奖励档位", "P1", "任务系统、商城", "营收核心之一"],
    ],
    [120, 110, 230, 100, 160, 220],
  );
}

function addRoleSheet(workbook) {
  const sheet = workbook.worksheets.add("04_角色系统");
  styleSheet(sheet);
  addTitle(sheet, "角色系统", "建议首发至少提供 8-12 名可培养角色，形成不同流派入口。");
  addSectionHeader(sheet, 4, "角色设计原则");
  addTable(
    sheet,
    5,
    ["原则", "说明"],
    [
      ["定位鲜明", "每名角色至少绑定 1 个推荐流派和 1 个门派方向，避免仅数值替换。"],
      ["获取可控", "前 3 名角色通过主线、签到、七日目标免费送，形成稳定体验。"],
      ["培养分层", "角色星级决定成长上限，等级决定即战力，天赋决定玩法差异。"],
      ["专属天赋", "角色必须至少有 1 个常驻天赋和 1 个升星强化点。"],
    ],
    [150, 620],
  );
  addSectionHeader(sheet, 11, "建议首发角色表");
  addTable(
    sheet,
    12,
    ["ID", "角色名", "品质", "定位", "推荐门派", "推荐流派", "基础攻击", "基础生命", "核心天赋", "获取方式"],
    [
      [1, "铁匠之子", "N", "均衡新手", "少林/武当", "拳掌/外功", 10, 100, "前 3 次三选一必出防御向功法", "初始角色"],
      [2, "明日侠", "SR", "爆发输出", "华山/唐门", "剑法/奇门", 16, 92, "暴击后额外追击 1 次", "七日目标"],
      [3, "郭大侠", "SSR", "反击坦克", "丐帮/少林", "拳掌/外功", 13, 140, "受击后概率反震真实伤害", "限时活动/碎片合成"],
      [4, "青女侠", "SR", "持续流血", "古墓/五毒", "剑法/奇门", 15, 96, "对首领额外附加持续伤害", "主线第 8 章"],
      [5, "乔帮主", "SSR", "群体压制", "丐帮", "拳掌/内功", 18, 125, "同门派功法达到 4 本时伤害倍率提升", "赛季兑换"],
      [6, "小师妹", "R", "控制辅助", "峨眉/天龙", "医术/内功", 11, 112, "每层首次三选一额外刷新 1 次", "首充赠送"],
      [7, "毒公子", "SR", "毒伤收割", "五毒/星宿", "奇门/内功", 17, 90, "敌方带毒时自身恢复 5% 生命", "活动卡池"],
      [8, "昆仑剑仙", "UR", "高频连击", "昆仑", "剑法/轻功", 22, 110, "连续选择同流派功法时叠加攻速", "UR 角色活动"],
      [9, "机关术士", "SR", "召唤/陷阱", "唐门/六扇门", "奇门/阵法", 14, 106, "陷阱类效果翻倍持续 1 波", "赛季通行证"],
      [10, "无名老僧", "SSR", "生存核心", "少林", "外功/内功", 12, 168, "生命低于 30% 时进入金刚状态", "高级招募"],
    ],
    [70, 130, 70, 120, 120, 120, 90, 90, 220, 160],
    "green",
  );
}

function addKungfuSheet(workbook) {
  const sheet = workbook.worksheets.add("05_功法构筑");
  styleSheet(sheet);
  addTitle(sheet, "功法构筑系统", "保留原始策划案的核心，并把规则补齐到可开发状态。");
  addTable(
    sheet,
    4,
    ["规则项", "建议方案", "目的"],
    [
      ["功法总量", "沿用原案 64 本功法，14 门派、10 流派", "与真实产品认知一致，保证构筑多样性"],
      ["局内获取", "每层结束三选一；BOSS 层结算额外增加稀有度权重", "形成高光反馈"],
      ["局内上限", "单局最多记录 20 本不同名功法，满星后移出随机池", "控制构筑收束"],
      ["升星规则", "1 星升 2 星、2 星升 3 星沿用原案 upgradeCond", "兼容现有配置"],
      ["羁绊触发", "门派和流派分别计算，取可并行叠加", "鼓励组合构筑而非单线堆数值"],
      ["稀有度分层", "N/R/SR/SSR/UR 五档，章节推进逐步解锁", "避免前期池子过深"],
      ["局外养成", "功法等级影响基础数值，星级影响局内倍率和附加效果", "让收集与战斗都成立"],
    ],
    [120, 360, 220],
  );
  addSectionHeader(sheet, 13, "流派羁绊建议");
  addTable(
    sheet,
    14,
    ["流派", "2 本效果", "4 本效果", "6 本效果"],
    [
      ["刀法", "攻击 +10%", "暴击率 +8%", "首次出手追加破甲"],
      ["剑法", "攻击速度 +10%", "暴击伤害 +20%", "每第 4 次攻击追加剑气"],
      ["枪法", "攻击 +8%", "对精英/BOSS 伤害 +15%", "贯穿伤害 +1 目标"],
      ["拳掌", "生命 +12%", "反击率 +10%", "每波首次受击后获得护盾"],
      ["阵法", "减伤 +8%", "全局真实伤害 +5%", "进入战斗时布阵触发增益"],
      ["医术", "恢复率 +12%", "每层结算回复 10% 生命", "低血量时每秒回复"],
      ["外功", "基础攻击 +12%", "抗暴 +10%", "普攻附带击退"],
      ["轻功", "闪避 +8%", "攻速 +12%", "闪避成功后反击"],
      ["奇门", "异常命中 +10%", "中毒/流血伤害 +20%", "敌方异常层数上限提高"],
      ["内功", "生命 +10%", "恢复 +10%", "释放绝学时追加内伤"],
    ],
    [120, 200, 200, 220],
    "orange",
  );
  addSectionHeader(sheet, 26, "门派羁绊建议");
  addTable(
    sheet,
    27,
    ["门派", "3 本效果", "5 本效果", "7 本效果"],
    [
      ["少林派", "减伤 +10%", "受击回复 3% 生命", "金钟罩效果持续整层"],
      ["华山派", "暴击率 +8%", "剑法伤害 +20%", "暴击后清空一次攻速 CD"],
      ["古墓派", "闪避 +10%", "持续伤害 +20%", "敌方血量越低伤害越高"],
      ["昆仑派", "攻速 +10%", "连击率 +12%", "每波首次攻击必定连击"],
      ["丐帮", "生命 +12%", "反击伤害 +20%", "生命越低增伤越高"],
      ["唐门", "远程伤害 +15%", "异常命中 +15%", "陷阱额外触发一次"],
      ["武当派", "内功 +15%", "招式触发率 +10%", "每层首次绝学必暴击"],
      ["峨眉派", "治疗量 +20%", "护盾强度 +25%", "每层首波免死一次"],
    ],
    [120, 200, 200, 220],
    "green",
  );
}

function addEquipSheet(workbook) {
  const sheet = workbook.worksheets.add("06_装备系统");
  styleSheet(sheet);
  addTitle(sheet, "装备系统", "作为首发必备成长模块，负责拉开中期战力和资源消耗层次。");
  addTable(
    sheet,
    4,
    ["部位", "基础属性", "常见副词条", "高级词条", "主要来源"],
    [
      ["武器", "攻击", "暴击、攻速、对BOSS增伤", "穿透、连击、真实伤害", "主线、远征、活动副本"],
      ["头盔", "生命", "抗暴、减伤、回复", "免伤、控制抗性", "挂机、装备副本"],
      ["衣服", "生命/减伤", "抗暴、生命%、受疗加成", "反伤、护盾强化", "主线、帮派商店"],
      ["护腕", "攻击/命中", "暴击、异常命中、对精英增伤", "追击率、斩杀", "活动、挑战"],
      ["腰带", "生命/闪避", "闪避、抗闪避、恢复", "减速抗性、护盾", "挂机、矿点商店"],
      ["鞋子", "攻速/闪避", "闪避、攻速、移速表现参数", "起手加速、首击暴击", "轮回塔、活动"],
      ["饰品", "全属性", "最终增伤、最终减伤", "套装词条、神器特效", "高阶玩法与付费活动"],
    ],
    [120, 150, 260, 220, 180],
  );
  addSectionHeader(sheet, 13, "品质与成长");
  addTable(
    sheet,
    14,
    ["品质", "颜色", "词条数量", "可否变异", "升阶材料", "备注"],
    [
      ["普通", "灰", 1, "否", "铜钱", "前期过渡"],
      ["优秀", "绿", 2, "否", "铜钱+强化石", "主线常见"],
      ["稀有", "蓝", 3, "低概率", "强化石+精铁", "中期主力"],
      ["史诗", "紫", 4, "可", "精铁+玄晶", "可洗练"],
      ["传说", "橙", 4, "高概率", "玄晶+神兵石", "可进化为神器"],
      ["神器", "红", 5, "固定", "专属碎片", "提供专属被动"],
    ],
    [110, 90, 100, 100, 160, 200],
    "orange",
  );
}

function addArtifactSheet(workbook) {
  const sheet = workbook.worksheets.add("07_法宝系统");
  styleSheet(sheet);
  addTitle(sheet, "法宝系统", "用于提供战斗内的第二决策层和高价值收集目标。");
  addTable(
    sheet,
    4,
    ["规则项", "建议"],
    [
      ["携带数量", "默认 1 个，主线第 15/30 章分别解锁第 2、第 3 槽。"],
      ["法宝分类", "输出、护盾、恢复、控制、经济五类。"],
      ["触发方式", "开场触发、普攻触发、受击触发、层结算触发四大类。"],
      ["成长方式", "升阶、升星、共鸣；优先避免额外复杂附魔。"],
      ["投放节奏", "首个法宝通过主线送，之后由活动、商店、远征、充值获得。"],
    ],
    [150, 620],
  );
  addSectionHeader(sheet, 11, "建议首发法宝");
  addTable(
    sheet,
    12,
    ["ID", "法宝名", "品质", "定位", "效果摘要", "获取方式"],
    [
      [1, "青玉葫芦", "SR", "恢复", "每波开始回复 8% 生命，溢出转护盾", "主线第 12 章"],
      [2, "玄铁飞剑", "SSR", "输出", "每 4 次攻击额外释放飞剑斩击", "活动卡池"],
      [3, "伏魔金印", "SSR", "控制", "对 BOSS 首次命中时降低其攻速", "远征商店"],
      [4, "九转金丹", "SR", "保命", "生命首次低于 25% 时立即恢复", "七日活跃"],
      [5, "万毒古幡", "SSR", "异常", "所有中毒伤害提升并延长 1 波", "限时活动"],
      [6, "天机罗盘", "UR", "经济", "主线与挂机收益额外提高 12%", "赛季通行证"],
      [7, "镇岳钟", "SSR", "坦克", "开场获得高额护盾并提升减伤", "帮派商店"],
      [8, "流云靴印", "SR", "轻功", "闪避成功后下一击必暴击", "华山论剑兑换"],
    ],
    [70, 140, 80, 100, 300, 150],
    "green",
  );
}

function addPveSheet(workbook) {
  const sheet = workbook.worksheets.add("08_PVE玩法");
  styleSheet(sheet);
  addTitle(sheet, "PVE 玩法规划", "从主线单局扩展到日常、周常和中期目标。");
  addTable(
    sheet,
    4,
    ["玩法", "解锁条件", "核心规则", "主要奖励", "重置周期"],
    [
      ["主线章节", "默认开启", "章节-层-波推进，层后功法三选一", "角色经验、装备、挂机效率", "永久进度"],
      ["挂机收益", "通关第 2 章", "按当前章节离线累计奖励，上限 12 小时", "铜钱、功法经验、强化石", "随时间累积"],
      ["扫矿", "通关第 5 章", "占领矿点并定时收菜，可被挑战", "铜钱、玄铁、矿票", "每日"],
      ["远征副本", "通关第 10 章", "多节点挑战，消耗远征令", "法宝碎片、稀有装备", "每周"],
      ["轮回塔", "通关第 15 章", "单层挑战，无三选一，纯战力验证", "神器材料、称号", "长期/赛季"],
      ["生肖禁地", "通关第 20 章", "主题 BOSS 挑战，考验指定流派", "高阶洗练材料", "每周"],
      ["活动副本", "活动期间", "按主题提供专属增益和掉落", "限定头像框、皮肤、碎片", "活动期"],
    ],
    [140, 140, 250, 180, 120],
  );
}

function addPvpSheet(workbook) {
  const sheet = workbook.worksheets.add("09_PVP与社交");
  styleSheet(sheet);
  addTitle(sheet, "PVP 与社交系统", "用于提升留存、付费转化和社群氛围。");
  addTable(
    sheet,
    4,
    ["系统", "形式", "建议规则", "奖励"],
    [
      ["华山论剑", "异步 PVP", "玩家提交阵容快照，挑战对手提升段位", "段位币、称号、赛季头像"],
      ["矿点争夺", "资源争夺", "抢占高等级矿点并防守，失败掉落占领时间", "矿石、强化石、荣誉"],
      ["帮派", "弱社交", "成员捐献、帮派任务、帮派商店、帮派 BOSS", "帮贡、限定装备、法宝碎片"],
      ["跑商", "派遣经营", "接取订单，按路线与时间结算收益，可被截获", "铜钱、稀有货票、通行证积分"],
      ["排行榜", "展示", "按主线、战力、论剑、塔层分榜", "钻石、展示荣誉"],
    ],
    [120, 120, 330, 180],
    "orange",
  );
  addBullets(sheet, 11, "社交设计原则", [
    "不强制实时在线，尽量采用异步挑战、异步协作和可追赶机制。",
    "帮派收益以资源加成和商店兑换为主，避免强绑死社交。",
    "PVP 奖励做荣誉和赛季资源，不直接压垮 PVE 玩家。",
  ], palette.blue);
}

function addEconomySheet(workbook) {
  const sheet = workbook.worksheets.add("10_资源经济");
  styleSheet(sheet);
  addTitle(sheet, "资源经济与投放", "保证角色、功法、装备、法宝四条线都能形成清晰闭环。");
  addTable(
    sheet,
    4,
    ["资源", "主要用途", "主要来源", "稀缺度", "备注"],
    [
      ["铜钱", "角色升级、装备强化、基础养成", "挂机、主线、跑商", "低", "最基础货币"],
      ["元宝", "通用高级货币", "任务、活动、充值", "中", "用于商店与抽卡"],
      ["万能元宝", "高价值兑换", "赛季、礼包、活动", "高", "尽量少量投放"],
      ["功法经验", "功法升级", "分解重复功法、挂机", "中", "绑定同名功法逻辑"],
      ["角色碎片", "角色升星", "主线、招募、活动", "中高", "用于非付费成长"],
      ["强化石", "装备强化", "扫矿、装备副本", "中", "日常大量消耗"],
      ["玄晶", "装备升阶/洗练", "轮回塔、活动", "高", "后期成长门槛"],
      ["法宝碎片", "法宝解锁与升星", "远征、活动、商店", "高", "拉长成长线"],
      ["荣誉币", "PVP 商店", "华山论剑、矿点争夺", "中", "偏竞赛产出"],
      ["帮贡", "帮派商店", "帮派捐献/任务", "中", "社交专属资源"],
    ],
    [120, 220, 220, 90, 170],
  );
  addSectionHeader(sheet, 16, "日常投放原则");
  addTable(
    sheet,
    17,
    ["原则", "说明"],
    [
      ["基础养成保底", "挂机 + 日常任务足够支撑 1 名主力角色与一套核心装备持续成长。"],
      ["稀缺资源靠活动拉开", "玄晶、神器石、UR 碎片由周玩法和活动提供，形成目标感。"],
      ["付费不破坏构筑乐趣", "付费提高养成效率与收藏速度，不直接替代单局构筑决策。"],
    ],
    [170, 600],
    "green",
  );
}

function addMonetizationSheet(workbook) {
  const sheet = workbook.worksheets.add("11_活动与商业化");
  styleSheet(sheet);
  addTitle(sheet, "活动与商业化规划", "首发版本就要考虑拉新、转化和回流。");
  addTable(
    sheet,
    4,
    ["项目", "形式", "主要内容", "目的"],
    [
      ["七日目标", "新手活动", "送 SR 角色、法宝、强化材料", "拉新和前期留存"],
      ["月卡", "持续付费", "每日元宝、挂机加速、扫荡特权", "稳定付费"],
      ["战令通行证", "赛季活动", "日常任务积分、免费/付费双轨奖励", "提高活跃和 ARPU"],
      ["限时卡池", "活动招募", "UP 角色、UP 法宝、保底机制", "版本营收高峰"],
      ["节日活动", "主题玩法", "限定副本、兑换商店、装扮奖励", "回流与话题传播"],
      ["首充礼包", "低门槛付费", "送强力 R/SR 角色和资源", "提高首付率"],
    ],
    [130, 110, 330, 180],
  );
}

function addScheduleSheet(workbook) {
  const sheet = workbook.worksheets.add("12_研发排期");
  styleSheet(sheet);
  addTitle(sheet, "研发排期建议", "便于从策划案过渡到开发执行。");
  addTable(
    sheet,
    4,
    ["阶段", "周期", "产出", "负责人关注点"],
    [
      ["需求定稿", "1 周", "完整策划案、字段定义、原型图", "产品与程序确认边界"],
      ["M0 开发", "2-3 周", "章节、战斗、功法、基础 UI", "把核心循环跑通"],
      ["M1 开发", "3-4 周", "角色、装备、挂机、扫矿、基础活动", "形成首发闭环"],
      ["M2 开发", "2-3 周", "法宝、远征、论剑、排行榜", "提升中期留存"],
      ["联调与压测", "1-2 周", "数值校准、埋点、性能优化", "保证微信小游戏可上线"],
      ["首发准备", "1 周", "活动排期、商店、审核包、运营素材", "上线准备"],
    ],
    [120, 100, 330, 220],
  );
  addSectionHeader(sheet, 12, "需要额外落表的数据清单");
  addTable(
    sheet,
    13,
    ["建议 Sheet", "用途", "关键字段"],
    [
      ["角色配置-Role", "角色基础配置", "id/name/quality/baseAtk/baseHp/talent/unlockType"],
      ["装备配置-Equip", "装备与词条池", "slot/quality/mainAttr/subAttrPool/evolveRule"],
      ["法宝配置-Artifact", "法宝效果", "id/type/quality/trigger/effect/value"],
      ["资源投放-Economy", "产出消耗表", "resource/source/dailyCap/storePrice"],
      ["玩法配置-Mode", "玩法规则", "modeId/unlock/challengeCost/rewardGroup"],
      ["活动配置-Activity", "活动与赛季", "activityId/openRule/taskGroup/shopGroup"],
    ],
    [170, 180, 360],
    "orange",
  );
}

async function main() {
  const input = await FileBlob.load(sourcePath);
  const workbook = await SpreadsheetFile.importXlsx(input);

  addRoadmapSheet(workbook);
  addPositioningSheet(workbook);
  addLoopSheet(workbook);
  addSystemSheet(workbook);
  addRoleSheet(workbook);
  addKungfuSheet(workbook);
  addEquipSheet(workbook);
  addArtifactSheet(workbook);
  addPveSheet(workbook);
  addPvpSheet(workbook);
  addEconomySheet(workbook);
  addMonetizationSheet(workbook);
  addScheduleSheet(workbook);

  const summary = await workbook.inspect({
    kind: "sheet",
    include: "id,name",
    maxChars: 4000,
  });
  console.log(summary.ndjson);

  const overviewCheck = await workbook.inspect({
    kind: "table",
    range: "00_完整策划总览!A1:H24",
    include: "values",
    tableMaxRows: 24,
    tableMaxCols: 8,
  });
  console.log(overviewCheck.ndjson);

  const renderBlob = await workbook.render({
    sheetName: "00_完整策划总览",
    autoCrop: "all",
    scale: 1,
    format: "png",
  });
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  const renderPath = outputPath.replace(/\.xlsx$/i, ".png");
  await fs.writeFile(renderPath, new Uint8Array(await renderBlob.arrayBuffer()));

  const out = await SpreadsheetFile.exportXlsx(workbook);
  await out.save(outputPath);

  console.log(`OUTPUT=${outputPath}`);
}

await main();
