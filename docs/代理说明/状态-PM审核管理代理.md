# 状态 - PM / 审核管理代理

## 更新规则

- 本文件只记录 PM / 审核管理代理的协作状态。
- PM / 审核管理代理被要求清理上下文、重置对话或开启新对话前，必须先更新本文件。
- 如果 PM / 审核管理代理管理了子代理，必须先要求子代理更新各自状态文件，再更新本文件。
- 新对话开始后，必须读取本文件，再结合 Git 实际状态恢复工作。

## 当前状态

- 当前日期：2026-04-23
- 角色：PM / 审核管理代理
- 工作树：`D:\Doc\codex\TempEx03`
- 分支：`dev`
- 远端分支：`origin/dev`
- 写入本文件前的 `dev` 基线提交：`c4cdf33 增加上下文清理前协作状态记录规则`
- 恢复上下文时如需确认最新状态，应以 `git fetch` 后的 Git 实际状态为准。

## 已派生子代理

- 策划设计代理：`Raman`，ID `019db98c-30d9-74b2-866f-11c5d5c77907`
- UI 设计代理：`Curie`，ID `019db98c-31f4-7141-87c8-59eba1ed819b`
- 程序制作代理：`Boyle`，ID `019db98c-32d6-7633-902b-c53fde5596de`

## 最近集成状态

- `origin/design/planning` 已合并到 `dev`，合并提交 `2fb8a18 合并策划设计分支到 dev`
- `origin/design/ui` 已合并到 `dev`，合并提交 `6e6b9a2 合并UI设计分支到 dev`
- `origin/feature/program` 截至最近检查没有领先 `dev` 的提交
- `dev` 已推送到 `origin/dev`

## 待办与风险

- 清理上下文前，需要再次核对各工作树是否有未提交修改或未合并提交。
- 如果某个角色分支有新提交，应由 PM / 审核管理代理审核目录权限和变更内容后，再决定是否合并到 `dev`。
- 如果本文件与 Git 实际状态不一致，以 Git 实际状态为准，并更新本文件。

## 恢复检查命令

```powershell
git status --short --branch
git branch -a -vv
git worktree list
git fetch origin --prune
git log --oneline --decorate -5
```
