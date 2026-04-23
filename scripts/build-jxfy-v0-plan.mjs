import fs from "node:fs/promises";
import path from "node:path";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const workspace = "D:\\Doc\\codex\\TempEx03";
const outputPath = path.join(
  workspace,
  "docs",
  "策划案",
  "版本策划案",
  "V0_原型验证",
  "剑侠风云_V0原型验证策划案_v1.xlsx",
);

const color = {
  navy: "#1E3A5F",
  blue: "#2F6690",
  teal: "#2B7A78",
  gold: "#B8872E",
  mist: "#F4F7FB",
  green: "#ECF7F0",
  orange: "#FFF3E6",
  rose: "#FCEDEE",
  line: "#D7DEE8",
  white: "#FFFFFF",
  gray: "#667085",
  ink: "#1F2937",
};

function cell(row, col) {
  let n = col;
  let s = "";
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
  return `${s}${row}`;
}

function rect(row, col, rowCount, colCount) {
  return `${cell(row, col)}:${cell(row + rowCount - 1, col + colCount - 1)}`;
}

function normalize(matrix) {
  const width = Math.max(...matrix.map((r) => r.length));
  return matrix.map((row) => {
    const next = [...row];
    while (next.length < width) next.push("");
    return next;
  });
}

function write(sheet, row, col, matrix, format) {
  const data = normalize(matrix);
  const range = sheet.getRange(rect(row, col, data.length, data[0].length));
  range.values = data;
  if (format) range.format = format;
  return range;
}

function setupSheet(sheet, title, subtitle, widths = [110, 180, 180, 180, 180, 180, 180, 180]) {
  sheet.showGridLines = false;
  sheet.freezePanes.freezeRows(3);
  widths.forEach((w, i) => {
    sheet.getRange(`${cell(1, i + 1)}:${cell(260, i + 1)}`).format.columnWidthPx = w;
  });
  sheet.getRange("A1:H1").merge();
  sheet.getRange("A1").values = [[title]];
  sheet.getRange("A1").format = {
    fill: color.navy,
    font: { bold: true, color: color.white, size: 16 },
    rowHeightPx: 28,
    verticalAlignment: "center",
  };
  sheet.getRange("A2:H2").merge();
  sheet.getRange("A2").values = [[subtitle]];
  sheet.getRange("A2").format = {
    fill: color.mist,
    font: { color: color.gray, italic: true, size: 10 },
    rowHeightPx: 22,
    verticalAlignment: "center",
  };
}

function section(sheet, row, title, fill = color.blue) {
  sheet.getRange(`A${row}:H${row}`).merge();
  sheet.getRange(`A${row}`).values = [[title]];
  sheet.getRange(`A${row}`).format = {
    fill,
    font: { bold: true, color: color.white, size: 12 },
    rowHeightPx: 24,
    verticalAlignment: "center",
  };
}

function table(sheet, row, headers, rows, theme = "mist") {
  const fill = theme === "green" ? color.green : theme === "orange" ? color.orange : theme === "rose" ? color.rose : color.mist;
  write(sheet, row, 1, [headers], {
    fill,
    font: { bold: true, color: color.ink },
    wrapText: true,
    verticalAlignment: "center",
  });
  write(sheet, row + 1, 1, rows, {
    wrapText: true,
    verticalAlignment: "top",
  });
  const lastCol = headers.length;
  const lastRow = row + rows.length;
  sheet.getRange(`A${row}:${cell(lastRow, lastCol)}`).format.borders = {
    color: color.line,
    style: "Continuous",
  };
}

function bullets(sheet, row, title, items, fill = color.teal) {
  section(sheet, row, title, fill);
  table(
    sheet,
    row + 1,
    ["序号", "内容"],
    items.map((text, index) => [index + 1, text]),
  );
}

const roles = [
  [1, "铁匠之子", "N", "均衡新手", 10, 100, 1.2, 12, "初始角色", "首轮三选一优先出现外功/拳掌/轻功"],
];

const skills = [
  [1, "轻身术", "通用", "轻功", "N", "生命", "10%,20%,50%", "2,4,0", 1, "基础生存", "提升生命并提高闪避手感"],
  [2, "金钟罩", "少林", "外功", "N", "生命", "10%,20%,50%", "2,4,0", 1, "基础生存", "提升生命，2 星后获得减伤"],
  [3, "锻体术", "通用", "外功", "N", "生命", "10%,20%,50%", "2,4,0", 1, "基础生存", "纯防御向成长"],
  [4, "罗汉拳法", "少林", "拳掌", "N", "攻击", "10%,20%,50%", "2,4,0", 1, "近战输出", "稳定近战输出"],
  [5, "餐风饮露", "武当", "内功", "N", "攻击", "10%,20%,50%", "2,4,0", 1, "续航", "攻击成长并附带微量恢复"],
  [6, "峨眉心法", "峨眉", "医术", "N", "生命", "10%,20%,50%", "2,4,0", 2, "恢复", "提高恢复率"],
  [7, "破阵枪法", "六扇门", "枪法", "N", "攻击", "10%,20%,50%", "2,4,0", 2, "穿透", "对精英伤害更高"],
  [8, "铁布衫", "少林", "外功", "N", "生命", "10%,20%,50%", "2,4,0", 2, "坦克", "减伤强化"],
  [9, "疾风剑诀", "华山", "剑法", "R", "攻击", "12%,25%,60%", "2,4,0", 3, "暴击", "提升攻击和暴击收益"],
  [10, "回春诀", "峨眉", "医术", "R", "生命", "12%,25%,60%", "2,4,0", 3, "恢复", "低血量时恢复更强"],
  [11, "缠丝步", "古墓", "轻功", "R", "生命", "12%,25%,60%", "2,4,0", 3, "闪避", "闪避成功后回复少量生命"],
  [12, "伏虎掌", "少林", "拳掌", "R", "攻击", "12%,25%,60%", "2,4,0", 4, "爆发", "对普通怪额外增伤"],
  [13, "断岳刀法", "丐帮", "刀法", "R", "攻击", "12%,25%,60%", "2,4,0", 4, "斩杀", "敌方血量越低伤害越高"],
  [14, "混元功", "武当", "内功", "R", "生命", "12%,25%,60%", "2,4,0", 4, "均衡", "同时提高生命与恢复"],
  [15, "追魂针", "唐门", "奇门", "R", "攻击", "12%,25%,60%", "2,4,0", 5, "异常", "命中后附带中毒"],
  [16, "流云剑法", "华山", "剑法", "R", "攻击", "12%,25%,60%", "2,4,0", 5, "连击", "多次攻击节奏更快"],
  [17, "七伤拳", "丐帮", "拳掌", "SR", "攻击", "15%,30%,70%", "2,4,0", 6, "高爆发", "高伤但自身承压更大"],
  [18, "八卦阵", "武当", "阵法", "SR", "生命", "15%,30%,70%", "2,4,0", 6, "护盾", "开场获得护盾"],
  [19, "暴雨梨花", "唐门", "奇门", "SR", "攻击", "15%,30%,70%", "2,4,0", 7, "远程爆发", "BOSS 波效果明显"],
  [20, "玉女剑法", "古墓", "剑法", "SR", "攻击", "15%,30%,70%", "2,4,0", 7, "高频", "高攻速高命中"],
  [21, "金刚伏魔", "少林", "外功", "SR", "生命", "15%,30%,70%", "2,4,0", 8, "坦克核心", "低血量进入减伤状态"],
  [22, "太极真意", "武当", "内功", "SR", "生命", "15%,30%,70%", "2,4,0", 8, "反击", "受击后有概率回击"],
  [23, "飞鸿踏雪", "古墓", "轻功", "SR", "攻击", "15%,30%,70%", "2,4,0", 9, "闪转", "闪避成功后下一击增伤"],
  [24, "霸王枪诀", "六扇门", "枪法", "SR", "攻击", "15%,30%,70%", "2,4,0", 10, "BOSS向", "对精英/BOSS 有额外倍率"],
];

const enemies = [
  [1, "鸡", "普通", "近战", 1.5, 3, 0.04, 1, "新手近战怪"],
  [2, "精英鸡", "精英", "近战", 1.5, 5, 0.05, 1, "新手精英怪"],
  [3, "鸡王", "BOSS", "近战", 1.5, 40, 0.08, 1, "第 1-2 章 BOSS"],
  [4, "野狗", "普通", "近战", 1.4, 4, 0.045, 2, "中前期近战怪"],
  [5, "精英野狗", "精英", "近战", 1.4, 7, 0.055, 2, "高攻击倾向"],
  [6, "恶犬首领", "BOSS", "近战", 1.4, 48, 0.09, 2, "第 3-4 章 BOSS"],
  [7, "短剑士兵", "普通", "近战", 1.3, 4.5, 0.05, 3, "人形敌人起点"],
  [8, "精英短剑士兵", "精英", "近战", 1.3, 9, 0.06, 3, "更高连击压力"],
  [9, "短剑队长", "BOSS", "近战", 1.3, 55, 0.1, 3, "第 5-6 章 BOSS"],
  [10, "弓箭手", "普通", "远程", 1.7, 4.2, 0.052, 4, "远程消耗怪"],
  [11, "精英弓箭手", "精英", "远程", 1.7, 8.5, 0.064, 4, "远程精英怪"],
  [12, "神射头目", "BOSS", "远程", 1.7, 62, 0.11, 4, "第 7-8 章 BOSS"],
  [13, "狼牙棒胖子", "普通", "近战", 1.8, 5.5, 0.06, 5, "高生命怪"],
  [14, "精英狼牙棒胖子", "精英", "近战", 1.8, 10.5, 0.072, 5, "高生命精英"],
  [15, "巨锤头领", "BOSS", "近战", 1.8, 72, 0.12, 5, "第 9-10 章 BOSS"],
  [16, "匕首刺客", "普通", "近战", 1.1, 5, 0.065, 6, "高攻速怪"],
  [17, "精英匕首刺客", "精英", "近战", 1.1, 9.5, 0.078, 6, "高压迫感"],
  [18, "影刃统领", "BOSS", "近战", 1.1, 85, 0.13, 6, "第 11-12 章 BOSS"],
];

const chapterBases = [
  [1, "银杏村", 100, 10],
  [2, "破庙外道", 120, 12],
  [3, "少林山门", 160, 15],
  [4, "林间小道", 210, 18],
  [5, "华山脚下", 280, 24],
  [6, "古驿栈道", 360, 30],
  [7, "唐门外院", 480, 40],
  [8, "峨眉石阶", 620, 52],
  [9, "古墓前殿", 820, 68],
  [10, "武当后山", 1100, 90],
  [11, "荒岭夜行", 1450, 120],
  [12, "六扇门关隘", 1900, 160],
];

function wavePattern(chapterId) {
  if (chapterId <= 4) return [2, 2, 2, 2, 1];
  if (chapterId <= 8) return [2, 2, 3, 2, 1];
  return [2, 3, 3, 2, 1];
}

function chapterRows() {
  return chapterBases.map(([id, name, life, atk]) => {
    const pattern = wavePattern(id);
    const total = pattern.reduce((sum, n) => sum + n, 0);
    return [
      id,
      `第${id}章`,
      name,
      5,
      pattern.join("/"),
      total,
      life,
      atk,
      id <= 4 ? "N,R" : id <= 8 ? "N,R,SR" : "R,SR",
      id <= 4 ? "鸡/狗/短剑士兵" : id <= 8 ? "短剑士兵/弓箭手/狼牙棒胖子" : "弓箭手/狼牙棒胖子/匕首刺客",
    ];
  });
}

function waveRows() {
  const rows = [];
  for (const [id, , name] of chapterBases) {
    const pattern = wavePattern(id);
    pattern.forEach((waveCount, index) => {
      rows.push([
        id,
        name,
        index + 1,
        index === 4 ? "BOSS层" : "普通层",
        waveCount,
        index === 4 ? "BOSS层固定 1 波" : `第${index + 1}层共 ${waveCount} 波`,
      ]);
    });
  }
  return rows;
}

function selectEnemy(chapterId, layerIndex, waveIndex, layerType) {
  if (layerType === "BOSS层") {
    if (chapterId <= 2) return enemies[2];
    if (chapterId <= 4) return enemies[5];
    if (chapterId <= 6) return enemies[8];
    if (chapterId <= 8) return enemies[11];
    if (chapterId <= 10) return enemies[14];
    return enemies[17];
  }
  const chapterTier = chapterId <= 2 ? 0 : chapterId <= 4 ? 1 : chapterId <= 6 ? 2 : chapterId <= 8 ? 3 : chapterId <= 10 ? 4 : 5;
  const base = chapterTier * 3;
  if (waveIndex === 3 || (layerIndex >= 3 && waveIndex === 2 && chapterId >= 8)) {
    return enemies[base + 1];
  }
  return enemies[base];
}

function missionRows() {
  const rows = [];
  let missionId = 1;
  for (const [chapterId, , chapterName, heroLife, heroAtk] of chapterBases) {
    const pattern = wavePattern(chapterId);
    pattern.forEach((waveCount, layerIndex0) => {
      const layerIndex = layerIndex0 + 1;
      const layerType = layerIndex === 5 ? "BOSS层" : "普通层";
      for (let waveIndex = 1; waveIndex <= waveCount; waveIndex += 1) {
        const enemy = selectEnemy(chapterId, layerIndex, waveIndex, layerType);
        const layerProgress = (layerIndex - 1) / 4;
        const waveProgress = waveCount === 1 ? 0 : (waveIndex - 1) / (waveCount - 1);
        let life;
        let atk;
        let count;
        if (layerType === "BOSS层") {
          life = Math.round(heroLife * (2.6 + 1.4 * layerProgress));
          atk = Math.round(heroAtk * (1.3 + 1.0 * layerProgress));
          count = 1;
        } else {
          life = Math.round(heroLife * (0.28 + 0.22 * layerProgress + 0.08 * waveProgress));
          atk = Math.round(heroAtk * (0.2 + 0.16 * layerProgress + 0.06 * waveProgress));
          count = layerIndex <= 2 ? 1 : layerIndex === 3 ? 2 : 2 + (chapterId >= 9 ? 1 : 0);
        }
        const coin = layerType === "BOSS层" ? chapterId * 80 : 18 + chapterId * 8 + layerIndex * 4 + waveIndex * 2;
        const exp = layerType === "BOSS层" ? chapterId * 12 : 4 + chapterId * 2 + layerIndex;
        rows.push([
          missionId,
          chapterId,
          chapterName,
          layerIndex,
          layerType,
          waveIndex,
          layerType === "BOSS层" ? "BOSS" : waveIndex === waveCount && layerIndex >= 3 ? "精英波" : "普通波",
          enemy[0],
          enemy[1],
          count,
          life,
          atk,
          enemy[3],
          coin,
          exp,
        ]);
        missionId += 1;
      }
    });
  }
  return rows;
}

function buildGuide(workbook) {
  const sheet = workbook.worksheets.add("00_阅读指引");
  setupSheet(sheet, "剑侠风云 V0 原型验证策划案", "这是一份直接服务 V0 原型开发的版本策划案，不等同于完整产品规划。");
  table(sheet, 4, ["阅读顺序", "作用", "适合谁看"], [
    ["01-03", "快速理解 V0 要验证什么、不做什么、主循环是什么", "老板、主策、制作人、程序负责人"],
    ["04-06", "明确战斗规则、配置结构和数值公式", "产品、程序、数值、后端配置"],
    ["07-12", "直接查看可落地的原型配置数据", "程序、前后端、测试、配置同学"],
    ["13", "按验收清单判断 V0 是否可以进入开发和联调", "项目负责人、测试"],
  ]);
  bullets(sheet, 11, "V0 文档原则", [
    "只保留验证核心乐趣必须要有的内容，不把完整产品系统一次性塞进原型。",
    "所有规则、配置结构、数值都以“可直接进开发”为目标，减少口头解释空间。",
    "V0 审核通过后，默认以本文件作为原型开发策划依据。"
  ], color.gold);
}

function buildScope(workbook) {
  const sheet = workbook.worksheets.add("01_V0目标与边界");
  setupSheet(sheet, "V0 目标与边界", "先把版本边界说清楚，避免原型阶段需求膨胀。");
  table(sheet, 4, ["维度", "V0 要做", "V0 不做"], [
    ["核心玩法", "章节闯关、层波战斗、三选一功法、BOSS 结算", "PVP、帮派、跑商、法宝、装备"],
    ["局外成长", "1 名基础角色、功法局外升级", "多角色、升星、装备强化、法宝养成"],
    ["内容规模", "12 章主线、24 本功法、18 个敌人模板", "海量章节、赛季内容"],
    ["经济系统", "铜钱、功法经验两种基础资源", "元宝商城、通行证、复杂活动经济"],
    ["验证目标", "验证战斗节奏、三选一质量、构筑收束和章节推进体验", "验证长期留存与商业化"],
  ], "green");
  bullets(sheet, 11, "V0 验证成功标准", [
    "玩家在前 10 分钟内能明显感受到每次三选一都在变强。",
    "章节推进节奏顺畅，普通层与 BOSS 层难度能拉开但不挫败。",
    "24 本功法足以组成多个明显不同的构筑方向。",
    "配置结构能被前后端直接读取，不需要再大改数据模型。"
  ], color.blue);
}

function buildFeatures(workbook) {
  const sheet = workbook.worksheets.add("02_V0功能清单");
  setupSheet(sheet, "V0 功能清单", "把原型开发拆成清晰模块，便于排期和验收。");
  table(sheet, 4, ["模块", "必须有", "说明", "优先级"], [
    ["账号与入口", "登录注册沿用现有模板", "不额外扩展账号体系", "P0"],
    ["章节界面", "展示章节列表与解锁状态", "可进入当前开放章节", "P0"],
    ["战斗场景", "角色、敌人、攻击、受击、死亡、波次切换", "自动战斗表现即可", "P0"],
    ["三选一弹窗", "每层结束弹出 3 本功法", "支持选择 1 本并返回战斗", "P0"],
    ["局内功法状态", "记录本局已获得功法、星级和羁绊", "作为战斗实时属性输入", "P0"],
    ["章节结算", "胜利、失败、章节通关", "通关后解锁下一章", "P0"],
    ["配置加载", "Skill、Enemy、Chapter、Wave、Mission、Role", "启动时加载到内存", "P0"],
    ["调试能力", "可快速切章、查看当前功法和属性", "方便原型验证", "P1"],
  ]);
}

function buildLoop(workbook) {
  const sheet = workbook.worksheets.add("03_核心玩法规则");
  setupSheet(sheet, "核心玩法规则", "这是 V0 原型最重要的体验闭环。");
  table(sheet, 4, ["步骤", "规则说明"], [
    [1, "玩家从章节界面进入当前解锁章节。"],
    [2, "进入第 1 层第 1 波，角色与敌人自动战斗。"],
    [3, "当前波敌人全部死亡后，进入下一波；当前层全部波次完成后，判定本层通关。"],
    [4, "普通层通关后弹出功法三选一，玩家选择 1 本加入本局构筑。"],
    [5, "进入下一层，重复“战斗 -> 通关 -> 三选一”的循环。"],
    [6, "第 5 层固定为 BOSS 层，BOSS 层不再追加普通三选一，只在章节通关后结算奖励。"],
    [7, "角色死亡则本次章节挑战失败，本局功法构筑清空。"],
    [8, "章节通关后解锁下一章节，并发放铜钱与功法经验奖励。"],
  ], "green");
  bullets(sheet, 14, "三选一规则", [
    "随机池只从当前已解锁章节允许出现的功法中抽取。",
    "同一局内已满 3 星的功法，从随机池中移除。",
    "同一局内已获得不同名功法达到 20 本后，随机范围收束在这 20 本内。",
    "原型阶段不做付费刷新，允许 1 次免费刷新以便验证选择体验。"
  ], color.teal);
}

function buildCombat(workbook) {
  const sheet = workbook.worksheets.add("04_战斗规则");
  setupSheet(sheet, "战斗规则", "V0 的战斗规则要尽量简洁，但足够支撑构筑差异。");
  section(sheet, 4, "基础属性");
  table(sheet, 5, ["属性", "说明", "V0 是否启用"], [
    ["攻击", "决定基础伤害", "是"],
    ["生命", "生命归 0 则死亡", "是"],
    ["攻速", "控制攻击间隔，首次攻击无 CD", "是"],
    ["暴击率", "决定是否触发暴击", "是"],
    ["暴击伤害", "V0 固定为 100%", "是"],
    ["减伤率", "降低受到的伤害", "是"],
    ["闪避率", "概率闪避一次攻击", "是"],
    ["恢复率", "受伤后按比例恢复生命", "是"],
    ["抗性类属性", "抗暴、抗闪避、抗恢复", "否，V0 暂不启用"],
    ["真实伤害", "无视减伤直接结算", "可由个别功法预留，默认不启用"],
  ]);
  section(sheet, 17, "结算流程", color.gold);
  table(sheet, 18, ["步骤", "说明"], [
    [1, "攻击方检查攻击 CD，若已就绪则发起攻击。"],
    [2, "防守方先判定闪避，闪避成功则本次伤害为 0。"],
    [3, "未闪避则判定暴击，暴击后伤害乘以 2。"],
    [4, "最终伤害 = 攻击 * (1 + 攻击加成总和) * 暴击系数 * (1 - 目标减伤)。"],
    [5, "目标扣血后，若存在恢复率，则按“本次伤害 * 恢复率”回复生命。"],
    [6, "目标生命 <= 0 时死亡；当前波敌人全灭则切换下一波。"],
  ], "orange");
}

function buildConfigOverview(workbook) {
  const sheet = workbook.worksheets.add("05_配置结构总览");
  setupSheet(sheet, "配置结构总览", "V0 实际开发默认读取这些配置表。");
  table(sheet, 4, ["配置表", "用途", "关键字段", "备注"], [
    ["角色配置-Role", "玩家角色基础属性与原型被动", "id/name/grade/baseAtk/baseLife/atkSpeed/critRate/unlockType", "V0 仅 1 名角色"],
    ["功法配置-Skill", "功法基础配置", "id/name/sectType/moldType/grade/powerType/powerRate/upgradeCond/unlockChapter", "战斗核心表"],
    ["敌人配置-Enemy", "敌人模板", "id/name/enemyType/attackType/coldTime/baseLife/baseAtk/tier", "Mission 会引用该表 ID"],
    ["章节配置-Chapter", "章节入口配置", "id/name/layerCount/wavePattern/guessHeroLife/guessHeroAtk/skillPoolRange", "控制主线节奏"],
    ["层波配置-ChapterWave", "每章每层的波次规则", "chapterId/layerIndex/layerType/waveCount", "便于前后端读取"],
    ["关卡配置-Mission", "最终战斗实例配置", "chapterId/layerIndex/waveIndex/enemyId/enemyCount/life/atk/reward", "战斗直接使用"],
  ], "green");
}

function buildNumericRules(workbook) {
  const sheet = workbook.worksheets.add("06_数值规则总览");
  setupSheet(sheet, "数值规则总览", "V0 的数值应尽量简单可控，可直接映射为代码。");
  table(sheet, 4, ["项目", "公式 / 规则", "说明"], [
    ["普通怪生命", "round(guessHeroLife * (0.28 + 0.22*layerProgress + 0.08*waveProgress))", "随着层数和波次递增"],
    ["普通怪攻击", "round(guessHeroAtk * (0.20 + 0.16*layerProgress + 0.06*waveProgress))", "控制普通波压力"],
    ["BOSS 生命", "round(guessHeroLife * (2.6 + 1.4*layerProgress))", "突出 BOSS 压迫感"],
    ["BOSS 攻击", "round(guessHeroAtk * (1.3 + 1.0*layerProgress))", "避免 BOSS 纯刮痧"],
    ["层进度 layerProgress", "(layerIndex - 1) / 4", "V0 每章固定 5 层"],
    ["波进度 waveProgress", "单波层记为 0；否则为 (waveIndex - 1) / (waveCount - 1)", "用于同层内递增"],
    ["角色基础伤害", "baseAtk * (1 + 功法攻击加成 + 羁绊攻击加成)", "V0 不额外接装备"],
    ["角色基础生命", "baseLife * (1 + 功法生命加成 + 羁绊生命加成)", "V0 不额外接装备"],
  ], "orange");
  bullets(sheet, 14, "V0 数值控制原则", [
    "前 4 章只投放 N / R 功法，确保玩家先理解构筑逻辑。",
    "第 5-8 章开始稳定出现 SR 功法，形成中期明显提升。",
    "BOSS 以高生命为主，高攻击为辅，避免前期连续秒杀玩家。",
    "每章波次尽量控制在 9-11 波之间，保证单章体验可在短时间完成。"
  ], color.blue);
}

function buildRoleSheet(workbook) {
  const sheet = workbook.worksheets.add("07_角色配置-Role");
  setupSheet(sheet, "角色配置-Role", "V0 仅保留 1 名主角，目的是验证战斗与构筑，而不是验证角色养成。", [70, 120, 80, 120, 90, 90, 90, 90, 110, 260]);
  table(sheet, 4, ["id", "name", "grade", "position", "baseAtk", "baseLife", "atkSpeed", "critRate", "unlockType", "passiveDesc"], roles);
}

function buildSkillSheet(workbook) {
  const sheet = workbook.worksheets.add("08_功法配置-Skill");
  setupSheet(sheet, "功法配置-Skill", "V0 保留 24 本功法，足够覆盖多条构筑路径。", [60, 130, 90, 90, 70, 80, 120, 90, 90, 100, 260]);
  table(
    sheet,
    4,
    ["id", "name", "sectType", "moldType", "grade", "powerType", "powerRate", "upgradeCond", "unlockChapter", "designTag", "desc"],
    skills,
  );
}

function buildEnemySheet(workbook) {
  const sheet = workbook.worksheets.add("09_敌人配置-Enemy");
  setupSheet(sheet, "敌人配置-Enemy", "按普通 / 精英 / BOSS 三类模板划分。", [60, 130, 80, 80, 80, 80, 80, 70, 220]);
  table(
    sheet,
    4,
    ["id", "name", "enemyType", "attackType", "coldTime", "baseLife", "baseAtk", "tier", "desc"],
    enemies,
  );
}

function buildChapterSheet(workbook) {
  const sheet = workbook.worksheets.add("10_章节配置-Chapter");
  setupSheet(sheet, "章节配置-Chapter", "V0 采用 12 章，每章固定 5 层。", [60, 80, 140, 80, 100, 90, 100, 100, 120, 180]);
  table(
    sheet,
    4,
    ["id", "chapterIndex", "name", "layerCount", "wavePattern", "totalWave", "guessHeroLife", "guessHeroAtk", "skillPoolRange", "enemyTheme"],
    chapterRows(),
  );
}

function buildWaveSheet(workbook) {
  const sheet = workbook.worksheets.add("11_层波配置-ChapterWave");
  setupSheet(sheet, "层波配置-ChapterWave", "把每章每层的波次拆平，便于战斗侧直接读取。", [70, 140, 80, 90, 80, 220]);
  table(
    sheet,
    4,
    ["chapterId", "chapterName", "layerIndex", "layerType", "waveCount", "desc"],
    waveRows(),
  );
}

function buildMissionSheet(workbook) {
  const sheet = workbook.worksheets.add("12_关卡配置-Mission");
  setupSheet(sheet, "关卡配置-Mission", "这是战斗侧最直接读取的实例配置。", [60, 70, 140, 70, 90, 70, 90, 70, 120, 80, 80, 80, 80, 80, 80]);
  table(
    sheet,
    4,
    ["id", "chapterId", "chapterName", "layerIndex", "layerType", "waveIndex", "waveType", "enemyId", "enemyName", "enemyCount", "enemyLife", "enemyAtk", "attackType", "coinDrop", "expDrop"],
    missionRows(),
  );
}

function buildAcceptance(workbook) {
  const sheet = workbook.worksheets.add("13_开发验收清单");
  setupSheet(sheet, "开发验收清单", "V0 通过审核后，默认按此清单验收。");
  table(sheet, 4, ["验收项", "通过标准"], [
    ["章节流程", "玩家可从章节界面进入已解锁章节，并按层波正常推进。"],
    ["战斗逻辑", "攻击、受击、死亡、波次切换、BOSS 结算均正确执行。"],
    ["三选一", "每层结束必定弹出 3 本功法，选择后立即影响后续战斗属性。"],
    ["构筑收束", "满星功法会从随机池移除，已获得 20 本不同名功法后池子收束。"],
    ["配置读取", "Role、Skill、Enemy、Chapter、Wave、Mission 可被服务端正确加载。"],
    ["数值体验", "前 3 章玩家稳定通关；第 4-8 章开始出现构筑与数值压力；第 12 章有明显挑战。"],
    ["开发调试", "可查看当前章节、层波、已持有功法和角色实时属性。"],
  ], "green");
  bullets(sheet, 13, "审核重点", [
    "如果战斗节奏和构筑乐趣未达标，不进入 V1 首发版本规划。",
    "如果配置结构仍需大改，应先回修 V0 策划案，再进入开发收尾。",
    "V0 审核通过后，后续新增系统一律进入更高版本目录，不反向污染 V0 边界。"
  ], color.gold);
}

async function main() {
  const workbook = Workbook.create();

  buildGuide(workbook);
  buildScope(workbook);
  buildFeatures(workbook);
  buildLoop(workbook);
  buildCombat(workbook);
  buildConfigOverview(workbook);
  buildNumericRules(workbook);
  buildRoleSheet(workbook);
  buildSkillSheet(workbook);
  buildEnemySheet(workbook);
  buildChapterSheet(workbook);
  buildWaveSheet(workbook);
  buildMissionSheet(workbook);
  buildAcceptance(workbook);

  const inspect = await workbook.inspect({
    kind: "sheet,table",
    maxChars: 8000,
    tableMaxRows: 12,
    tableMaxCols: 10,
  });
  console.log(inspect.ndjson);

  const preview = await workbook.render({
    sheetName: "01_V0目标与边界",
    autoCrop: "all",
    scale: 1,
    format: "png",
  });
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath.replace(/\.xlsx$/i, ".png"), new Uint8Array(await preview.arrayBuffer()));

  const out = await SpreadsheetFile.exportXlsx(workbook);
  await out.save(outputPath);
  console.log(`OUTPUT=${outputPath}`);
}

await main();
