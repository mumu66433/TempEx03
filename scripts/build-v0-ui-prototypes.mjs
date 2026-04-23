import fs from "node:fs/promises";
import path from "node:path";

const root = "D:\\Doc\\codex\\TempEx03";
const outCommon = path.join(root, "docs", "原型制作", "01_组件示例");
const outV0 = path.join(root, "docs", "原型制作", "版本原型", "V0_原型验证", "02_界面设计");

const c = {
  bg0: "#102033",
  bg1: "#17314A",
  bg2: "#2B5C7A",
  panel: "#FFF8EE",
  panelSoft: "#F4ECE0",
  stroke: "#D7C5AA",
  gold: "#F4C56A",
  goldDeep: "#B78832",
  text: "#1F2937",
  muted: "#667085",
  green: "#5CBF75",
  red: "#D96B6B",
  blue: "#6BB6E8",
  tag: "#FFE7A8",
  nav: "#E9DFC9",
  white: "#FFFFFF",
  n: "#9AA4B2",
  r: "#4C89D9",
  sr: "#8A63D2",
  ssr: "#D99A3D",
};

function screenShell(title, content, subtitle = "") {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="750" height="1624" viewBox="0 0 750 1624" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="750" y2="1624" gradientUnits="userSpaceOnUse">
      <stop stop-color="${c.bg0}"/>
      <stop offset="0.45" stop-color="${c.bg1}"/>
      <stop offset="1" stop-color="${c.bg2}"/>
    </linearGradient>
    <linearGradient id="goldBtn" x1="0" y1="0" x2="0" y2="88" gradientUnits="userSpaceOnUse">
      <stop stop-color="#FFE4A0"/>
      <stop offset="1" stop-color="${c.gold}"/>
    </linearGradient>
    <filter id="shadow" x="-40%" y="-40%" width="180%" height="180%">
      <feDropShadow dx="0" dy="10" stdDeviation="16" flood-color="#09111D" flood-opacity="0.24"/>
    </filter>
  </defs>
  <rect width="750" height="1624" fill="url(#bg)"/>
  <rect x="24" y="24" width="702" height="1576" rx="36" stroke="rgba(255,255,255,0.18)"/>
  <text x="375" y="86" fill="${c.white}" font-size="34" font-weight="700" text-anchor="middle">${title}</text>
  ${subtitle ? `<text x="375" y="126" fill="rgba(255,255,255,0.72)" font-size="20" text-anchor="middle">${subtitle}</text>` : ""}
  ${content}
</svg>`;
}

function button(x, y, w, h, text, primary = true) {
  const fill = primary ? 'url(#goldBtn)' : c.panel;
  const stroke = primary ? c.goldDeep : c.stroke;
  const color = primary ? c.text : c.text;
  return `
  <g filter="url(#shadow)">
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="22" fill="${fill}" stroke="${stroke}" stroke-width="2"/>
  </g>
  <text x="${x + w / 2}" y="${y + h / 2 + 10}" fill="${color}" font-size="28" font-weight="700" text-anchor="middle">${text}</text>`;
}

function topBar(active = "章节") {
  const items = ["章节", "功法", "角色", "商城"];
  return `
  <rect x="24" y="1460" width="702" height="120" rx="30" fill="${c.nav}" stroke="${c.stroke}" stroke-width="2"/>
  ${items.map((item, i) => {
    const x = 82 + i * 168;
    const isActive = item === active;
    return `
      <circle cx="${x}" cy="1520" r="34" fill="${isActive ? c.gold : c.white}" stroke="${isActive ? c.goldDeep : c.stroke}" stroke-width="2"/>
      <text x="${x}" y="1528" fill="${c.text}" font-size="18" font-weight="${isActive ? 700 : 500}" text-anchor="middle">${item}</text>
    `;
  }).join("")}`;
}

function card(x, y, w, h, title, body = "", tag = "") {
  return `
  <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="28" fill="${c.panel}" stroke="${c.stroke}" stroke-width="2"/>
  ${tag ? `<rect x="${x + 24}" y="${y + 22}" width="${92}" height="40" rx="16" fill="${c.tag}"/><text x="${x + 70}" y="${y + 49}" fill="${c.text}" font-size="18" font-weight="700" text-anchor="middle">${tag}</text>` : ""}
  <text x="${x + 28}" y="${y + 96}" fill="${c.text}" font-size="30" font-weight="700">${title}</text>
  ${body ? `<text x="${x + 28}" y="${y + 144}" fill="${c.muted}" font-size="22">${body}</text>` : ""}`;
}

function skillCard(x, y, w, h, quality, name, sect, mold, desc) {
  const colorMap = { N: c.n, R: c.r, SR: c.sr, SSR: c.ssr };
  const qa = colorMap[quality] || c.n;
  return `
  <g filter="url(#shadow)">
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="26" fill="${c.panel}" stroke="${qa}" stroke-width="4"/>
  </g>
  <rect x="${x + 22}" y="${y + 22}" width="78" height="38" rx="14" fill="${qa}"/>
  <text x="${x + 61}" y="${y + 48}" fill="${c.white}" font-size="18" font-weight="700" text-anchor="middle">${quality}</text>
  <text x="${x + 24}" y="${y + 96}" fill="${c.text}" font-size="28" font-weight="700">${name}</text>
  <rect x="${x + 24}" y="${y + 118}" width="86" height="34" rx="12" fill="#E8F2FF"/>
  <text x="${x + 67}" y="${y + 141}" fill="${c.text}" font-size="16" text-anchor="middle">${sect}</text>
  <rect x="${x + 120}" y="${y + 118}" width="86" height="34" rx="12" fill="#F3E8FF"/>
  <text x="${x + 163}" y="${y + 141}" fill="${c.text}" font-size="16" text-anchor="middle">${mold}</text>
  <text x="${x + 24}" y="${y + 192}" fill="${c.muted}" font-size="20">${desc}</text>
  <rect x="${x + 24}" y="${y + h - 70}" width="${w - 48}" height="18" rx="9" fill="#E8E1D5"/>
  <rect x="${x + 24}" y="${y + h - 70}" width="${Math.round((w - 48) * 0.48)}" height="18" rx="9" fill="${qa}"/>
  <text x="${x + 24}" y="${y + h - 86}" fill="${c.muted}" font-size="18">局外等级 1 / 局内 1 星</text>`;
}

async function writeFileSafe(filePath, content) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content, "utf8");
}

async function buildComponentBoard() {
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1600" height="1200" viewBox="0 0 1600 1200" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="1600" height="1200" fill="#F3F0E8"/>
  <text x="70" y="88" fill="${c.text}" font-size="40" font-weight="700">剑侠风云 V0 组件样板</text>
  <text x="70" y="126" fill="${c.muted}" font-size="22">按钮、品质色、标签、卡片与底部导航的共用示例</text>
  <rect x="70" y="180" width="1460" height="950" rx="32" fill="#FFF9F0" stroke="${c.stroke}" stroke-width="2"/>
  <text x="110" y="240" fill="${c.text}" font-size="28" font-weight="700">颜色 Token</text>
  ${[
    ["主背景", c.bg1], ["强调金", c.gold], ["辅助青", c.teal], ["通关绿", c.green], ["失败红", c.red], ["N", c.n], ["R", c.r], ["SR", c.sr], ["SSR", c.ssr],
  ].map((item, i) => `
    <rect x="${110 + i * 150}" y="270" width="110" height="72" rx="18" fill="${item[1]}"/>
    <text x="${165 + i * 150}" y="365" fill="${c.text}" font-size="18" text-anchor="middle">${item[0]}</text>
  `).join("")}
  <text x="110" y="446" fill="${c.text}" font-size="28" font-weight="700">按钮样式</text>
  <g transform="translate(110,480)">
    ${button(0, 0, 220, 88, "主按钮", true)}
    ${button(260, 0, 220, 88, "次按钮", false)}
  </g>
  <text x="110" y="686" fill="${c.text}" font-size="28" font-weight="700">卡片样式</text>
  ${card(110, 720, 320, 220, "章节卡片", "展示章节标题、进度和主入口", "章节")}
  ${skillCard(470, 720, 320, 260, "SR", "太极真意", "武当", "内功", "受击后有概率回击，适合稳扎稳打")}
  <rect x="840" y="720" width="620" height="320" rx="28" fill="${c.panel}" stroke="${c.stroke}" stroke-width="2"/>
  <text x="872" y="780" fill="${c.text}" font-size="28" font-weight="700">底部导航样式</text>
  ${topBar("功法").replace('x="24"', 'x="872"').replace('width="702"', 'width="520"').replace(/cx="(\d+)"/g, (_, n) => `cx="${Number(n) + 610}"`)}
</svg>`;
  await writeFileSafe(path.join(outCommon, "V0_组件与样式板.svg"), svg);
}

async function buildLogin() {
  const content = `
  <text x="375" y="248" fill="rgba(255,255,255,0.78)" font-size="26" text-anchor="middle">江湖风云起，一剑定乾坤</text>
  <circle cx="375" cy="426" r="116" fill="rgba(255,255,255,0.10)" stroke="rgba(255,255,255,0.28)" stroke-width="2"/>
  <text x="375" y="446" fill="${c.white}" font-size="88" font-weight="700" text-anchor="middle">剑</text>
  <text x="375" y="690" fill="${c.white}" font-size="84" font-weight="700" text-anchor="middle">剑侠风云</text>
  <text x="375" y="742" fill="rgba(255,255,255,0.78)" font-size="28" text-anchor="middle">Roguelike 武侠构筑原型</text>
  <rect x="70" y="1130" width="610" height="250" rx="32" fill="rgba(255,248,238,0.94)" stroke="${c.stroke}" stroke-width="2"/>
  <text x="112" y="1194" fill="${c.text}" font-size="26" font-weight="700">当前账号</text>
  <text x="112" y="1238" fill="${c.muted}" font-size="24">paoyou_001</text>
  <text x="112" y="1296" fill="${c.muted}" font-size="22">V0 原型阶段沿用现有账号登录流程</text>
  ${button(112, 1308, 526, 88, "进入游戏", true)}
  ${button(112, 1410, 526, 72, "切换账号", false)}
  `;
  await writeFileSafe(path.join(outV0, "V0_01_登录界面.svg"), screenShell("游戏入口", content, "V0 仅承接登录后的入口，不新增复杂活动入口"));
}

async function buildChapter() {
  const content = `
  <rect x="32" y="160" width="686" height="180" rx="32" fill="rgba(255,249,240,0.94)" stroke="${c.stroke}" stroke-width="2"/>
  <circle cx="116" cy="250" r="46" fill="${c.gold}"/><text x="116" y="262" fill="${c.text}" font-size="28" font-weight="700" text-anchor="middle">铁</text>
  <text x="182" y="230" fill="${c.text}" font-size="30" font-weight="700">铁匠之子</text>
  <text x="182" y="272" fill="${c.muted}" font-size="22">当前战力：1280</text>
  <rect x="542" y="210" width="132" height="52" rx="18" fill="${c.tag}"/><text x="608" y="244" fill="${c.text}" font-size="22" font-weight="700" text-anchor="middle">V0 原型</text>
  <rect x="32" y="380" width="686" height="920" rx="36" fill="${c.panel}" stroke="${c.stroke}" stroke-width="2"/>
  <text x="72" y="450" fill="${c.text}" font-size="34" font-weight="700">章节选择</text>
  <text x="72" y="492" fill="${c.muted}" font-size="22">V0 开放 12 章，每章固定 5 层</text>
  ${card(72, 540, 606, 250, "第1章 银杏村", "5 层 / 9 波 / 推荐战力 100", "当前章节")}
  <rect x="408" y="590" width="220" height="150" rx="24" fill="#EDE3D1" stroke="${c.stroke}" stroke-width="2"/>
  <text x="518" y="675" fill="${c.text}" font-size="34" font-weight="700" text-anchor="middle">宗门外围</text>
  ${button(94, 814, 562, 84, "开始战斗", true)}
  ${card(72, 932, 606, 140, "第2章 破庙外道", "已解锁，推荐战力 120", "已解锁")}
  ${card(72, 1094, 606, 140, "第3章 少林山门", "已解锁，推荐战力 160", "已解锁")}
  ${topBar("章节")}
  `;
  await writeFileSafe(path.join(outV0, "V0_02_章节界面.svg"), screenShell("主界面", content, "默认落点页，承接章节推进与底部导航"));
}

async function buildBattle() {
  const content = `
  <rect x="32" y="146" width="686" height="148" rx="30" fill="rgba(255,248,238,0.94)" stroke="${c.stroke}" stroke-width="2"/>
  <text x="70" y="204" fill="${c.text}" font-size="26" font-weight="700">第1章 银杏村</text>
  <text x="70" y="242" fill="${c.muted}" font-size="22">第2层 第1波 / 共2波</text>
  <rect x="70" y="260" width="258" height="14" rx="7" fill="#E4DACC"/><rect x="70" y="260" width="182" height="14" rx="7" fill="${c.green}"/>
  <text x="372" y="204" fill="${c.text}" font-size="26" font-weight="700">敌方</text>
  <rect x="420" y="260" width="258" height="14" rx="7" fill="#E4DACC"/><rect x="420" y="260" width="212" height="14" rx="7" fill="${c.red}"/>
  <text x="70" y="1160" fill="${c.white}" font-size="28" font-weight="700">自动战斗中</text>
  <rect x="56" y="360" width="210" height="460" rx="30" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.18)"/>
  <text x="160" y="610" fill="${c.white}" font-size="42" font-weight="700" text-anchor="middle">我方角色</text>
  <rect x="484" y="290" width="182" height="182" rx="28" fill="rgba(255,255,255,0.10)" stroke="rgba(255,255,255,0.18)"/>
  <text x="575" y="394" fill="${c.white}" font-size="34" font-weight="700" text-anchor="middle">鸡</text>
  <rect x="430" y="560" width="236" height="236" rx="30" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.2)"/>
  <text x="548" y="688" fill="${c.white}" font-size="36" font-weight="700" text-anchor="middle">下波预留</text>
  <rect x="32" y="1220" width="686" height="200" rx="34" fill="rgba(255,248,238,0.94)" stroke="${c.stroke}" stroke-width="2"/>
  <text x="72" y="1280" fill="${c.text}" font-size="28" font-weight="700">本局构筑</text>
  <rect x="72" y="1310" width="116" height="72" rx="18" fill="${c.tag}"/><text x="130" y="1356" fill="${c.text}" font-size="20" font-weight="700" text-anchor="middle">罗汉拳法 1星</text>
  <rect x="206" y="1310" width="116" height="72" rx="18" fill="#E8F2FF"/><text x="264" y="1356" fill="${c.text}" font-size="20" font-weight="700" text-anchor="middle">轻身术 1星</text>
  <rect x="340" y="1310" width="116" height="72" rx="18" fill="#F3E8FF"/><text x="398" y="1356" fill="${c.text}" font-size="20" font-weight="700" text-anchor="middle">金钟罩 2星</text>
  ${button(540, 1306, 138, 74, "暂停", false)}
  `;
  await writeFileSafe(path.join(outV0, "V0_03_战斗界面.svg"), screenShell("战斗界面", content, "中心区域留给战斗表现，信息集中在顶部和底部"));
}

async function buildSkillChoice() {
  const content = `
  <rect x="0" y="0" width="750" height="1624" fill="rgba(9,17,29,0.42)"/>
  <rect x="42" y="180" width="666" height="1180" rx="36" fill="${c.panel}" stroke="${c.stroke}" stroke-width="2"/>
  <text x="375" y="266" fill="${c.text}" font-size="40" font-weight="700" text-anchor="middle">功法三选一</text>
  <text x="375" y="308" fill="${c.muted}" font-size="22" text-anchor="middle">第2层通关，选择 1 本功法加入本局构筑</text>
  ${skillCard(76, 380, 598, 218, "N", "罗汉拳法", "少林", "拳掌", "稳定近战输出，适合新手起手")}
  ${skillCard(76, 630, 598, 218, "R", "回春诀", "峨眉", "医术", "低血量时恢复更强，提升容错")}
  ${skillCard(76, 880, 598, 218, "R", "追魂针", "唐门", "奇门", "命中附带中毒，适合异常流")}
  ${button(92, 1146, 260, 84, "刷新一次", false)}
  ${button(388, 1146, 260, 84, "确认选择", true)}
  <text x="375" y="1286" fill="${c.muted}" font-size="20" text-anchor="middle">已获得 3 / 20 本不同名功法</text>
  `;
  await writeFileSafe(path.join(outV0, "V0_04_功法三选一弹窗.svg"), screenShell("功法选择", content, "原型阶段默认单屏展示 3 张卡，避免滚动"));
}

async function buildKungfuList() {
  const content = `
  <rect x="32" y="160" width="686" height="146" rx="30" fill="rgba(255,248,238,0.94)" stroke="${c.stroke}" stroke-width="2"/>
  <text x="72" y="216" fill="${c.text}" font-size="34" font-weight="700">功法图鉴</text>
  <text x="72" y="260" fill="${c.muted}" font-size="22">查看已解锁功法与局外升级信息</text>
  <rect x="542" y="198" width="136" height="54" rx="18" fill="${c.tag}"/><text x="610" y="233" fill="${c.text}" font-size="22" font-weight="700" text-anchor="middle">24 / 24</text>
  ${skillCard(52, 356, 310, 236, "N", "轻身术", "通用", "轻功", "提升生命并提高闪避手感")}
  ${skillCard(388, 356, 310, 236, "R", "疾风剑诀", "华山", "剑法", "提升攻击和暴击收益")}
  ${skillCard(52, 624, 310, 236, "SR", "太极真意", "武当", "内功", "受击后有概率回击")}
  ${skillCard(388, 624, 310, 236, "R", "追魂针", "唐门", "奇门", "命中后附带中毒")}
  ${skillCard(52, 892, 310, 236, "N", "金钟罩", "少林", "外功", "提升生命，2星后获得减伤")}
  ${skillCard(388, 892, 310, 236, "SR", "八卦阵", "武当", "阵法", "开场获得护盾")}
  ${topBar("功法")}
  `;
  await writeFileSafe(path.join(outV0, "V0_05_功法列表界面.svg"), screenShell("功法界面", content, "V0 保留图鉴与查看功能，不做复杂养成树"));
}

async function buildSkillDetail() {
  const content = `
  <rect x="0" y="0" width="750" height="1624" fill="rgba(9,17,29,0.46)"/>
  <rect x="52" y="166" width="646" height="1220" rx="36" fill="${c.panel}" stroke="${c.stroke}" stroke-width="2"/>
  <rect x="84" y="206" width="120" height="48" rx="16" fill="${c.sr}"/><text x="144" y="237" fill="${c.white}" font-size="20" font-weight="700" text-anchor="middle">SR</text>
  <text x="84" y="316" fill="${c.text}" font-size="42" font-weight="700">太极真意</text>
  <rect x="84" y="342" width="94" height="36" rx="12" fill="#E8F2FF"/><text x="131" y="366" fill="${c.text}" font-size="18" text-anchor="middle">武当</text>
  <rect x="190" y="342" width="94" height="36" rx="12" fill="#F3E8FF"/><text x="237" y="366" fill="${c.text}" font-size="18" text-anchor="middle">内功</text>
  <text x="84" y="442" fill="${c.muted}" font-size="24">当前等级：1   当前局内星级：2</text>
  <rect x="84" y="488" width="582" height="120" rx="24" fill="${c.panelSoft}" stroke="${c.stroke}" stroke-width="2"/>
  <text x="112" y="546" fill="${c.text}" font-size="28" font-weight="700">基础效果</text>
  <text x="112" y="586" fill="${c.muted}" font-size="22">生命 +15%，受击后有 20% 概率触发回击</text>
  <rect x="84" y="642" width="582" height="276" rx="24" fill="${c.panelSoft}" stroke="${c.stroke}" stroke-width="2"/>
  <text x="112" y="700" fill="${c.text}" font-size="28" font-weight="700">升星效果</text>
  <text x="112" y="748" fill="${c.muted}" font-size="22">1星：生命 +15%</text>
  <text x="112" y="792" fill="${c.muted}" font-size="22">2星：生命 +30%，解锁回击效果</text>
  <text x="112" y="836" fill="${c.muted}" font-size="22">3星：生命 +70%，回击伤害提升</text>
  <rect x="84" y="954" width="582" height="190" rx="24" fill="${c.panelSoft}" stroke="${c.stroke}" stroke-width="2"/>
  <text x="112" y="1012" fill="${c.text}" font-size="28" font-weight="700">羁绊提示</text>
  <text x="112" y="1056" fill="${c.muted}" font-size="22">门派：武当</text>
  <text x="112" y="1096" fill="${c.muted}" font-size="22">流派：内功</text>
  <text x="112" y="1136" fill="${c.muted}" font-size="22">适合稳扎稳打的防守型构筑</text>
  ${button(84, 1192, 582, 88, "关闭", false)}
  `;
  await writeFileSafe(path.join(outV0, "V0_06_功法详情浮层.svg"), screenShell("功法详情", content, "点击功法卡弹出，展示品质、分类、等级和升星收益"));
}

async function buildResult(success = true) {
  const title = success ? "章节通关" : "挑战失败";
  const file = success ? "V0_07_通关结算界面.svg" : "V0_08_失败结算界面.svg";
  const tag = success ? "通关奖励" : "失败复盘";
  const fill = success ? c.green : c.red;
  const content = `
  <rect x="66" y="220" width="618" height="1040" rx="40" fill="${c.panel}" stroke="${c.stroke}" stroke-width="2"/>
  <circle cx="375" cy="390" r="88" fill="${fill}" opacity="0.14" stroke="${fill}" stroke-width="3"/>
  <text x="375" y="412" fill="${success ? c.green : c.red}" font-size="56" font-weight="700" text-anchor="middle">${success ? "胜利" : "失败"}</text>
  <text x="375" y="520" fill="${c.text}" font-size="42" font-weight="700" text-anchor="middle">${title}</text>
  <text x="375" y="566" fill="${c.muted}" font-size="24" text-anchor="middle">${success ? "第1章 银杏村 已解锁下一章节" : "止步于第4层第2波，可返回继续养成"}</text>
  <rect x="110" y="654" width="530" height="256" rx="28" fill="${c.panelSoft}" stroke="${c.stroke}" stroke-width="2"/>
  <text x="142" y="716" fill="${c.text}" font-size="28" font-weight="700">${tag}</text>
  <text x="142" y="772" fill="${c.muted}" font-size="24">${success ? "铜钱 +120" : "铜钱 +36"}</text>
  <text x="142" y="818" fill="${c.muted}" font-size="24">${success ? "功法经验 +18" : "功法经验 +6"}</text>
  <text x="142" y="864" fill="${c.muted}" font-size="24">${success ? "章节进度：第2章已开放" : "建议提升：生命向功法优先"}</text>
  ${button(110, 990, 530, 88, success ? "返回章节" : "再试一次", true)}
  ${button(110, 1092, 530, 72, success ? "继续查看功法" : "返回章节", false)}
  `;
  await writeFileSafe(path.join(outV0, file), screenShell(title, content, "结算页用于承接挑战结果与下一步行动"));
}

async function main() {
  await buildComponentBoard();
  await buildLogin();
  await buildChapter();
  await buildBattle();
  await buildSkillChoice();
  await buildKungfuList();
  await buildSkillDetail();
  await buildResult(true);
  await buildResult(false);
}

await main();
