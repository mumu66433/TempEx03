# TempEx03

一个只保留账号登录注册功能的前后端同仓库模板。

## 概览

- 前端：`Vite + Phaser 3`
- 后端：`Node.js + Express`
- 数据库：`SQLite + Prisma`
- 设计分辨率：`750 x 1624`
- 适配方式：等比缩放

## 目录

```txt
client/   前端 Vite
server/   后端 Express + Prisma
server/src/  后端代码
server/src/assets/config 预留目录
server/src/config 后端配置目录
docs/设定规范 规范与示例
```

## 账号规范

- 当前项目只保留账号登录与注册
- 前端不保存任何游戏数据
- 所有游戏数据均由服务端管理
- 账号相关的本地信息仅用于登录体验和历史填充

## 数据规范

- 前端仅保留账号相关数据
- 所有和游戏玩法相关的数据都存储在服务端
- 前端不保留游戏数据
- 页面展示所需数据统一由前端请求后端获取，再组装页面后显示
- 服务端配置统一放在 `server/src/assets/config`，文件命名按规范示例 `C章节配置表.Chapter.xlsx`
- 启动时由 `server/src/config/excelLoader.js` 加载到内存

## 开发

先安装依赖：

```bash
npm install
```

启动前后端：

```bash
npm run dev
```

也可以直接运行根目录脚本：

- macOS / Linux: `./run-dev.js`
- Windows: `run-dev.cmd`

`npm run dev` 会先检查 Node 和 npm 环境，自动补 `server/.env`，必要时安装依赖并生成 Prisma Client，然后同时启动前后端。

默认地址：

- 前端：`http://localhost:5173`
- 后端：`http://localhost:3000`

## 数据库

Prisma 使用 SQLite，默认数据库路径在 `server/.env` 里配置。

```bash
npm run db:generate
```

服务启动时会自动初始化数据库表结构，不需要先手动 `db push`。

## 启动流程

1. 运行 `npm run dev` 或直接执行 `./run-dev.js`
2. 前端会打开一个固定 `750 x 1624` 的竖屏页面
3. 账号登录层仍然使用现有弹窗，游戏主界面由 `Phaser 3` 场景渲染
4. 如果本机没有保存登录信息，会先显示账号登录 / 注册界面
5. 如果本机有保存信息，会直接进入游戏登录界面
6. 账号登录成功后会自动切换到游戏登录界面
7. 游戏主界面会向后端请求章节配置，然后按配置渲染章节名称和 ID
8. 在游戏登录界面右上角点击 `切换账号`，会清除本机保存信息并回到账号登录界面

## 登录与注册

- 登录和注册在同一个弹窗里，通过顶部按钮切换
- 注册时可以手动输入用户名
- 用户名也可以点击“换一个”自动生成
- 注册密码默认填 `123456`
- 注册成功后会自动登录，并把账号密码保存到本机 `localStorage`
- 下次打开网页时，会优先读取本机保存的信息并自动进入游戏登录界面
