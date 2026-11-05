# 🎯 FocusTask

轻量、高效、完全离线可用的个人桌面待办管理工具。

## 技术栈

- **桌面框架**: Tauri v2 (Rust + WebView)
- **前端**: React 18 + TypeScript + Vite + Tailwind CSS
- **状态管理**: Zustand
- **数据库**: SQLite (rusqlite, FTS5 全文搜索)

## 开发环境要求

- Node.js ≥ 18
- Rust ≥ 1.77 (with `wasm32-unknown-unknown` not required)
- 系统依赖（Linux）:
  ```bash
  sudo apt install libwebkit2gtk-4.1-dev build-essential libssl-dev \
    libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev \
    libjavascriptcoregtk-4.1-dev libsoup-3.0-dev libsqlite3-dev
  ```

## 快速开始

```bash
# 安装前端依赖
npm install

# 启动开发模式（前端热更新 + Tauri 窗口）
npm run tauri dev

# 生产构建
npm run tauri build
```

## 项目结构

```
focus-task/
├── src/                    # React 前端
│   ├── components/         # UI 组件
│   │   ├── sidebar/        # 侧边栏（清单、智能列表）
│   │   └── tasks/          # 任务列表、任务项、快速输入
│   ├── stores/             # Zustand 状态管理
│   ├── lib/                # API 封装、类型定义
│   └── hooks/              # React Hooks
├── src-tauri/              # Tauri Rust 后端
│   ├── src/
│   │   ├── main.rs         # 入口
│   │   ├── lib.rs          # Tauri Builder 配置
│   │   ├── db.rs           # SQLite 数据库初始化
│   │   └── commands/       # Tauri 命令
│   │       ├── tasks.rs    # 任务 CRUD
│   │       └── lists.rs    # 清单管理
│   ├── Cargo.toml
│   └── tauri.conf.json
└── package.json
```

## 里程碑

| 阶段 | 目标 | 状态 |
|------|------|------|
| M1 | 基础骨架、SQLite 集成、任务 CRUD、清单管理、列表视图 | ✅ 完成 |
| M2 | 优先级、日期、子任务、提醒通知、全局快捷键、快速添加窗 | ✅ 完成 |
| M3 | 看板视图、日历视图、全文搜索、标签过滤、拖拽排序、命令面板 | ✅ 完成 |
| M4 | 导入导出、主题个性化、托盘运行、安装包构建、测试与优化 | 🚧 进行中 |

## 功能清单

- [x] 项目骨架搭建（Tauri + React + Tailwind）
- [x] SQLite 数据库设计与初始化（FTS5）
- [x] Rust 命令层：任务 CRUD、清单管理
- [x] 前端类型定义与 API 封装
- [x] Zustand 状态管理（任务 + 清单）
- [x] 侧边栏（清单 + 智能列表）
- [x] 任务列表视图（快速添加、完成任务、删除）
- [x] Rust 编译验证（Windows/macOS/Linux）
- [x] 重复任务调度
- [x] 系统通知提醒
- [x] 全局快捷键快速添加
- [x] 看板视图
- [x] 日历视图
- [x] 全文搜索
- [x] 标签过滤
- [x] 拖拽排序
- [x] 命令面板 (Ctrl+K)
- [x] 系统托盘运行
- [x] 主题切换（浅色/深色/跟随系统）
- [x] 数据导入导出（JSON + CSV）
- [x] 安装包构建配置
- [ ] 云同步（可选）
