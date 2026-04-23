import fs from "node:fs/promises";
import path from "node:path";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const workspace = "D:\\Doc\\codex\\TempEx03";
const outputPath = path.join(workspace, "docs", "设定规范", "剑侠风云策划案_重构版_v2.xlsx");

const color = {
  ink: "#1F2A37",
  navy: "#1E3A5F",
  blue: "#2D5B88",
  teal: "#2B7A78",
  gold: "#B8872E",
  sand: "#F7F1E5",
  mist: "#F4F7FB",
  green: "#ECF7F0",
  orange: "#FFF3E6",
  rose: "#FCEDEE",
  line: "#D7DEE8",
  white: "#FFFFFF",
  gray: "#667085",
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

function rangeAddr(row, col, rowCount, colCount) {
  return `${cell(row, col)}:${cell(row + rowCount - 1, col + colCount - 1)}`;
}

function pad(matrix) {
  const width = Math.max(...matrix.map((r) => r.length));
  return matrix.map((row) => {
    const next = [...row];
    while (next.length < width) next.push("");
    return next;
  });
}

function write(sheet, row, col, matrix, format) {
  const data = pad(matrix);
  const addr = rangeAddr(row, col, data.length, data[0].length);
  const r = sheet.getRange(addr);
  r.values = data;
  if (format) r.format = format;
  return r;
}

function baseSheet(sheet, title, subtitle, cols = [120, 180, 180, 180, 180, 180, 180, 180]) {
  sheet.showGridLines = false;
  sheet.freezePanes.freezeRows(3);
  cols.forEach((w, i) => {
    sheet.getRange(`${cell(1, i + 1)}:${cell(260, i + 1)}`).format.columnWidthPx = w;
  });
  sheet.getRange("A1:H1").merge();
  sheet.getRange("A1").values = [[title]];
  sheet.getRange("A1").format = {
    fill: color.navy,
    font: { bold: true, color: color.white, size: 17 },
    rowHeightPx: 30,
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
    items.map((text, i) => [i + 1, text]),
  );
}

function buildCover(workbook) {
  const sheet = workbook.worksheets.add("00_阅读指引");
  baseSheet(sheet, "剑侠风云策划案（重构版）", "面向产品评审、研发排期和后续配置落表的结构化版本。", [110, 220, 220, 220, 220, 220, 220, 220]);
  section(sheet, 4, "这份策划案怎么读");
  table(sheet, 5, ["阅读层级", "适合谁看", "重点看什么", "预计耗时"], [
    ["第 1 层：执行摘要", "老板、制作人、主策", "项目定位、核心卖点、首发边界、版本路线", "5 分钟"],
    ["第 2 层：系统设计", "产品、程序、数值、UI", "核心循环、战斗构筑、局外成长、玩法矩阵", "15-20 分钟"],
    ["第 3 层：落地清单", "程序、后端、配置、测试", "配置表建议、开发顺序、风险点、待确认项", "10 分钟"],
  ]);
  section(sheet, 11, "本版重构目标", color.gold);
  table(sheet, 12, ["目标", "说明"], [
    ["可读性更强", "按“先总后分”的阅读顺序重组内容，先让人看懂项目，再看细节。"],
    ["分类更清晰", "把角色、功法、装备、法宝、PVE、PVP、经济、活动拆成明确模块。"],
    ["版本规划更合理", "不再直接铺满所有系统，而是按原型、首发、小版本、赛季版本逐步放量。"],
    ["能直接转开发", "补充配置表建议、系统依赖与优先级，方便后续拆任务。"],
  ], "orange");
  section(sheet, 18, "一句话定义");
  table(sheet, 19, ["项目定义"], [[
    "《剑侠风云》是一款面向微信小游戏用户的武侠 Roguelike 构筑产品：单局里通过门派/流派功法三选一形成套路，局外通过角色、装备、法宝、挂机和活动持续成长，目标是做出“短局爽 + 长线留”的可运营版本。"
  ]], "green");
}

function buildExecutive(workbook) {
  const sheet = workbook.worksheets.add("01_执行摘要");
  baseSheet(sheet, "执行摘要", "先看这 1 页，就能快速理解项目值不值得做、首发要做到什么。");
  section(sheet, 4, "项目判断");
  table(sheet, 5, ["维度", "结论", "解释"], [
    ["核心方向", "成立", "“武侠题材 + 单局构筑 + 局外长线”在小游戏生态里有明确用户盘。"],
    ["原型基础", "可用", "现有策划案已覆盖功法、章节、敌人、波次和基础战斗逻辑。"],
    ["当前短板", "局外成长与中长期内容不足", "缺角色、装备、法宝、挂机、社交与活动体系。"],
    ["首发策略", "先做主线闭环，再逐步加中期系统", "避免首发过重导致研发周期失控。"],
  ]);
  section(sheet, 11, "首发版本目标");
  table(sheet, 12, ["目标", "首发必须有", "首发可以不做"], [
    ["让玩家玩得懂", "新手引导、章节闯关、三选一、功法升星", "复杂社交系统"],
    ["让玩家养得动", "角色、装备、挂机、扫矿、基础法宝", "过多高阶洗练分支"],
    ["让玩家愿意回来", "日常任务、七日目标、华山论剑基础版", "大型公会战"],
    ["让项目能运营", "月卡、首充、活动副本、通行证雏形", "跨服玩法"],
  ], "green");
  section(sheet, 18, "建议版本路线");
  table(sheet, 19, ["版本", "周期", "关键词", "核心目的"], [
    ["V0 原型验证", "2-3 周", "章节 + 功法构筑 + 战斗结算", "验证乐趣是否成立"],
    ["V1 首发版本", "4-6 周", "角色 + 装备 + 挂机 + 日常", "形成完整留存闭环"],
    ["V1.1 内容版本", "2-3 周", "法宝 + 远征 + 活动副本", "补中期追求"],
    ["V1.2 社交版本", "2-3 周", "帮派 + 跑商 + 论剑扩展", "提高活跃和付费"],
    ["V2 赛季版本", "长期", "赛季主题 + 新角色/新流派", "形成内容更新节奏"],
  ], "orange");
}

function buildPositioning(workbook) {
  const sheet = workbook.worksheets.add("02_产品定位");
  baseSheet(sheet, "产品定位", "从用户、体验和差异化三个角度解释这个项目。");
  bullets(sheet, 4, "目标用户", [
    "喜欢武侠题材、收集养成、轻策略构筑的微信小游戏用户。",
    "接受自动战斗，但希望每一局都有明显成长反馈的玩家。",
    "偏好 3-8 分钟单局，同时愿意为角色、装备和活动做长期投入的轻中度用户。",
  ]);
  bullets(sheet, 11, "核心体验", [
    "短局里爽：每层三选一不断成型，战斗中能明显感受到套路变强。",
    "局外里稳：角色、装备、法宝、挂机四条成长线持续给反馈。",
    "武侠味够足：门派与流派交织，而不是单纯的数值换皮。"
  ], color.gold);
  table(sheet, 18, ["维度", "本项目方向", "差异点"], [
    ["题材", "武侠", "门派、绝学、法宝都更容易做认知包装"],
    ["战斗", "章节层波 + 自动战斗 + 三选一构筑", "兼顾低门槛与策略感"],
    ["成长", "角色/功法/装备/法宝并行", "比单战力线更耐玩"],
    ["运营", "日常 + 周常 + 赛季活动", "适合小游戏长线运营"],
  ]);
}

function buildLoop(workbook) {
  const sheet = workbook.worksheets.add("03_核心循环");
  baseSheet(sheet, "核心循环", "把玩法循环拆清楚，方便后续拆系统和数值。");
  table(sheet, 4, ["循环层", "玩家动作", "产出", "消耗", "设计目的"], [
    ["单局循环", "进章节、打层波、选功法、打 BOSS", "构筑快感、章节推进", "时间、体力/挑战次数", "建立核心爽点"],
    ["日常循环", "挂机领奖、扫矿、任务、强化", "铜钱、经验、强化石、碎片", "扫荡券、日常次数", "形成回流理由"],
    ["周常循环", "远征、论剑、活动副本", "稀有材料、法宝碎片、荣誉", "挑战令、排名压力", "提高中期留存"],
    ["长线循环", "角色升星、装备进阶、法宝养成", "战力成长、套路丰富", "高阶资源", "形成付费与长期目标"],
  ]);
  bullets(sheet, 11, "推荐日活节奏", [
    "上午登录 3 分钟：领取挂机、强化养成、完成一轮轻量日常。",
    "中午回流 5 分钟：扫矿、清体力、领取活动奖励。",
    "晚间主时段 10-15 分钟：推进主线、打远征/论剑、处理帮派和跑商。"
  ], color.blue);
}

function buildCombat(workbook) {
  const sheet = workbook.worksheets.add("04_战斗与构筑");
  baseSheet(sheet, "战斗与构筑", "保留原案最有价值的部分，并把构筑规则补完整。");
  section(sheet, 4, "战斗结构");
  table(sheet, 5, ["项目", "设计"], [
    ["战斗表现", "自动战斗为主，强化数值反馈和技能触发反馈。"],
    ["章节结构", "章节 -> 层 -> 波；普通层清波，关键层打 BOSS。"],
    ["局内节点", "每层结束触发三选一，BOSS 层后可追加稀有奖励。"],
    ["失败反馈", "失败后保留局外成长，不保留单局功法构筑。"],
  ]);
  section(sheet, 11, "功法构筑规则", color.teal);
  table(sheet, 12, ["规则项", "建议"], [
    ["功法总量", "沿用 64 本功法、14 门派、10 流派的基础设定。"],
    ["三选一规则", "默认随机 3 本；支持 1 次免费刷新；首轮偏新手向。"],
    ["升星规则", "重复获得同名功法即可升星，满星后移出随机池。"],
    ["构筑收束", "单局记录最多 20 本不同名功法，避免池子过散。"],
    ["羁绊并行", "门派羁绊和流派羁绊分别结算，可同时成立。"],
    ["稀有度解锁", "随章节进度开放高稀有功法，避免前期认知过载。"],
  ], "green");
  section(sheet, 20, "战斗数值原则", color.gold);
  table(sheet, 21, ["原则", "说明"], [
    ["前 10 分钟变强明显", "前几章必须让玩家明显感受到“每次三选一都更强”。"],
    ["BOSS 有门槛但不恶心", "首发版本 BOSS 强在血量和机制，不强在纯超模数值。"],
    ["局外养成不替代构筑", "角色/装备提供下限，构筑决定上限和爽点。"],
  ], "orange");
}

function buildGrowth(workbook) {
  const sheet = workbook.worksheets.add("05_局外成长");
  baseSheet(sheet, "局外成长", "这是原案最缺的部分，也是首发必须补齐的部分。");
  table(sheet, 4, ["成长线", "作用", "首发是否必须", "说明"], [
    ["角色", "提供定位差异和长期培养目标", "必须", "至少准备 6-8 名角色形成流派入口"],
    ["功法等级", "提高单本功法的局外基础倍率", "必须", "沿用原案逻辑"],
    ["装备", "形成稳定战力和资源消耗", "必须", "首发建议先做 6-7 部位"],
    ["法宝", "提供高价值效果与中期追求", "建议有", "首发先做 1-2 槽位"],
    ["经脉/天赋", "做角色深度差异", "可后置", "V1.1 再开更稳"],
  ]);
  section(sheet, 11, "首发角色建议");
  table(sheet, 12, ["角色定位", "数量建议", "目的"], [
    ["新手均衡", 1, "保证第一天体验平滑"],
    ["高爆发输出", 2, "满足爽感和追伤害需求"],
    ["坦克/反击", 1, "支撑生存流玩法"],
    ["恢复/辅助", 1, "让防守流也能成立"],
    ["异常/毒伤", 1, "提供明显不同的构筑方向"],
    ["高稀有角色", 1, "作为版本付费与收集目标"],
  ], "green");
  section(sheet, 20, "装备与法宝策略", color.teal);
  table(sheet, 21, ["系统", "首发做法", "后续扩展"], [
    ["装备", "先做品质、强化、基础词条", "后续增加神器、洗练、套装"],
    ["法宝", "先做固定效果和升阶", "后续增加共鸣、联动和限定法宝"],
  ]);
}

function buildModes(workbook) {
  const sheet = workbook.worksheets.add("06_玩法矩阵");
  baseSheet(sheet, "玩法矩阵", "按首发优先级拆玩法，避免系统过多失焦。");
  table(sheet, 4, ["玩法", "分类", "首发优先级", "作用", "备注"], [
    ["主线章节", "PVE核心", "P0", "验证构筑战斗，承接一切解锁", "必须先完成"],
    ["挂机收益", "日常", "P0", "形成基础回流", "小游戏标配"],
    ["扫矿", "日常", "P0", "补稳定资源产出", "兼顾轻竞争"],
    ["日常任务", "运营", "P0", "形成每日目标", "承接通行证"],
    ["角色养成", "成长", "P0", "支撑中长期战力线", "必须首发有"],
    ["装备系统", "成长", "P0", "提供资源消耗和掉落期待", "必须首发有"],
    ["华山论剑", "PVP", "P1", "提供段位和荣誉目标", "先做异步版"],
    ["远征副本", "周常", "P1", "提供稀有产出", "适合 V1.1"],
    ["法宝系统", "成长", "P1", "增加中期成长深度", "建议 V1 或 V1.1"],
    ["帮派", "社交", "P2", "提高留存与协作", "社交后置更稳"],
    ["跑商", "活动/社交", "P2", "做版本亮点", "适合内容版本上线"],
  ]);
}

function buildEconomy(workbook) {
  const sheet = workbook.worksheets.add("07_经济与商业化");
  baseSheet(sheet, "经济与商业化", "先明确资源闭环，再决定商业化插在哪里。");
  section(sheet, 4, "资源闭环");
  table(sheet, 5, ["资源", "主要产出", "主要消耗", "定位"], [
    ["铜钱", "挂机、主线、跑商", "角色升级、装备强化", "基础货币"],
    ["元宝", "任务、活动、充值", "商店、抽卡、加速", "高级通用货币"],
    ["功法经验", "重复功法分解、挂机", "功法升级", "构筑养成资源"],
    ["强化石", "扫矿、活动、副本", "装备强化", "日常核心消耗"],
    ["角色碎片", "活动、主线、招募", "角色升星", "长线资源"],
    ["法宝碎片", "远征、商店、活动", "法宝解锁/升星", "中高阶资源"],
  ]);
  section(sheet, 13, "商业化建议", color.gold);
  table(sheet, 14, ["项目", "首发是否建议", "作用"], [
    ["首充", "建议", "快速拉起首日付费率"],
    ["月卡", "建议", "稳定日常付费"],
    ["通行证", "建议", "绑定日常活跃和赛季目标"],
    ["限定角色/法宝卡池", "建议", "作为版本付费点"],
    ["高复杂礼包矩阵", "不建议过早", "首发太重会伤体验"],
  ], "orange");
}

function buildVersion(workbook) {
  const sheet = workbook.worksheets.add("08_版本规划");
  baseSheet(sheet, "版本规划", "按研发风险和用户感知价值排序，确保每一步都合理。");
  section(sheet, 4, "为什么这样排版本");
  table(sheet, 5, ["原则", "说明"], [
    ["先做乐趣验证，再做留存", "如果单局构筑不爽，后面所有系统都会失去意义。"],
    ["首发闭环必须完整，但不能过胖", "首发版本要能玩、能养、能回流、能付费，但不需要一口气做完所有社交和赛季系统。"],
    ["中期系统按用户反馈追加", "法宝、远征、帮派、跑商更适合在玩法成立后逐步加入。"],
  ], "green");
  section(sheet, 11, "详细版本拆分", color.teal);
  table(sheet, 12, ["版本", "目标", "必须交付", "暂不做", "风险控制"], [
    ["V0 原型验证", "验证核心乐趣", "主线 10-20 章、基础敌人、三选一、功法升级、结算", "装备、法宝、PVP、帮派", "尽快拿到可玩反馈"],
    ["V1 首发版本", "形成留存闭环", "角色、装备、挂机、扫矿、日常任务、首充、月卡、基础活动", "复杂社交、跨服玩法", "控制研发范围，保证可上线"],
    ["V1.1 内容版本", "补中期追求", "法宝、远征、副本、活动卡池、更多章节", "帮派战、跑商博弈", "用新系统延长生命周期"],
    ["V1.2 社交版本", "提高活跃和竞争", "帮派、跑商、论剑扩展、排行榜优化", "超重度 GVG", "先做弱社交，避免门槛太高"],
    ["V2 赛季版本", "建立长期更新机制", "赛季主题、赛季任务、赛季商店、新角色新流派", "过多常驻玩法叠加", "以赛季替代无序堆系统"],
  ]);
  section(sheet, 20, "推荐研发顺序", color.gold);
  table(sheet, 21, ["顺序", "模块"], [
    [1, "战斗框架 + 主线章节 + 功法三选一"],
    [2, "角色基础养成 + 装备基础养成"],
    [3, "挂机、扫矿、日常任务、基础活动"],
    [4, "商业化基础（首充、月卡、通行证）"],
    [5, "法宝、远征、PVP"],
    [6, "帮派、跑商、赛季扩展"],
  ], "orange");
}

function buildTables(workbook) {
  const sheet = workbook.worksheets.add("09_配置落表建议");
  baseSheet(sheet, "配置落表建议", "这页直接服务研发和配置同学。");
  table(sheet, 4, ["建议 Sheet", "用途", "关键字段"], [
    ["角色配置-Role", "角色基础配置", "id/name/quality/position/baseAtk/baseHp/talent/unlockRule"],
    ["功法配置-Skill", "功法主表", "id/name/sectType/moldType/grade/powerType/powerRate/upgradeCond"],
    ["门派羁绊-SectBuff", "门派羁绊", "sectId/needCount/buffType/buffValue"],
    ["流派羁绊-MoldBuff", "流派羁绊", "moldId/needCount/buffType/buffValue"],
    ["装备配置-Equip", "装备和词条", "slot/quality/mainAttr/subAttrPool/upgradeCost"],
    ["法宝配置-Artifact", "法宝效果", "id/type/quality/trigger/effect/value"],
    ["玩法配置-Mode", "玩法规则", "modeId/unlockRule/cost/rewardGroup/resetType"],
    ["资源经济-Economy", "产出和消耗", "resourceId/source/sink/dailyCap/storePrice"],
    ["活动配置-Activity", "活动任务和奖励", "activityId/taskGroup/rewardGroup/openTime"],
  ]);
}

function buildRisk(workbook) {
  const sheet = workbook.worksheets.add("10_风险与待确认");
  baseSheet(sheet, "风险与待确认", "尽量在开发前把容易返工的点提前挑出来。");
  table(sheet, 4, ["类型", "问题", "建议"], [
    ["玩法风险", "如果单局构筑反馈不够爽，局外成长越多越像在给空心系统加壳。", "优先打磨战斗节奏、BOSS 体验和三选一质量。"],
    ["研发风险", "首发同时上太多系统会拉长周期。", "首发只做 P0 与必要 P1，P2 全部后置。"],
    ["数值风险", "角色、功法、装备、法宝四线成长容易膨胀。", "首发控制线数深度，优先做广度，再慢慢加深。"],
    ["运营风险", "如果活动系统太轻，首发后 2-3 周内容消耗很快。", "V1.1 提前准备活动副本和限时卡池。"],
  ], "rose");
  bullets(sheet, 11, "建议优先确认的 5 件事", [
    "首发到底要不要上法宝系统，如果上，槽位和数量做到什么程度。",
    "角色获取是碎片合成还是招募卡池为主，二者比例怎么配。",
    "华山论剑首发是否上线，如果上，只做异步对战，不做复杂战报。",
    "装备是否首发就开放洗练，建议先不上，避免系统过重。",
    "章节规模首发做多少最合适，建议首发先保证 20-30 章内容质量。"
  ], color.blue);
}

async function main() {
  const workbook = Workbook.create();

  buildCover(workbook);
  buildExecutive(workbook);
  buildPositioning(workbook);
  buildLoop(workbook);
  buildCombat(workbook);
  buildGrowth(workbook);
  buildModes(workbook);
  buildEconomy(workbook);
  buildVersion(workbook);
  buildTables(workbook);
  buildRisk(workbook);

  const check = await workbook.inspect({
    kind: "sheet,table",
    maxChars: 6000,
    tableMaxRows: 16,
    tableMaxCols: 8,
  });
  console.log(check.ndjson);

  const render = await workbook.render({
    sheetName: "01_执行摘要",
    autoCrop: "all",
    scale: 1,
    format: "png",
  });
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath.replace(/\.xlsx$/i, ".png"), new Uint8Array(await render.arrayBuffer()));

  const out = await SpreadsheetFile.exportXlsx(workbook);
  await out.save(outputPath);
  console.log(`OUTPUT=${outputPath}`);
}

await main();
