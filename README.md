# 🗓️ Go Holiday - 极简假期日历搜索首页

<div align="center">

一个优雅的浏览器首页，将搜索引擎与假期日历完美融合。支持自定义假期数据，让你的每一天都清晰可见。

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Made with Love](https://img.shields.io/badge/Made%20with-❤️-red.svg)](https://github.com/tagorewang/go-holiday)

[在线演示](#使用方法) • [功能特性](#功能特性) • [快速开始](#快速开始) • [自定义配置](#自定义配置)

</div>

---

## ✨ 功能特性

### 🔍 智能搜索
- **双引擎切换**：一键切换 Google 和 Bing 搜索引擎
- **智能识别**：自动识别网址和搜索关键词
- **快捷操作**：回车即搜，流畅体验

### 📅 假期日历热力图
- **全年视图**：53周 × 7天的完整年度日历
- **多彩标记**：
  - 🔴 **法定假期** - 红色标记
  - 🔵 **个人假期** - 蓝色标记
  - ⚫ **调休工作日** - 深灰色标记
  - 🟢 **当前行程** - 绿色标记
  - 🟡 **计划行程** - 黄色标记
- **交互体验**：
  - 悬停显示详细信息
  - 点击聚焦，周围渐变效果
  - 自动定位到今天
  - 今日高亮蓝色边框

### 🎨 响应式设计
- **桌面端**：横向滚动的完整热力图
- **移动端**：3列 × 4行的月度网格布局
- **自适应**：完美适配各种屏幕尺寸

### ⚙️ 灵活配置
- **自定义数据源**：支持本地或远程 JSON 文件
- **URL 参数**：通过 `?holiday=your-data.json` 快速切换
- **持久化存储**：配置自动保存到浏览器

---

## 🚀 快速开始

### 方法一：直接使用

1. **克隆仓库**
```bash
git clone https://github.com/tagorewang/go-holiday.git
cd go-holiday
```

2. **打开页面**
```bash
# 直接用浏览器打开 index.html
open index.html  # macOS
# 或
start index.html  # Windows
# 或
xdg-open index.html  # Linux
```

### 方法二：本地服务器（推荐）

```bash
# 使用 Python 启动本地服务器
python -m http.server 8000

# 或使用 Node.js
npx serve

# 然后访问 http://localhost:8000
```

### 方法三：设为浏览器首页

1. 将项目部署到 GitHub Pages 或任意静态托管服务
2. 在浏览器设置中将首页设为部署后的 URL
3. 享受每次打开浏览器的愉悦体验 ✨

---

## 🎯 使用方法

### 搜索功能
1. 在搜索框输入关键词或网址
2. 按 `Enter` 键执行搜索或跳转
3. 点击右上角开关切换搜索引擎

### 查看假期
- **桌面端**：鼠标悬停在日期格子上查看详情
- **移动端**：点击日期格子显示信息
- **聚焦效果**：点击任意日期，周围会产生渐变聚焦效果

### 自定义假期数据
1. 点击右上角 ⚙️ 设置按钮
2. 输入你的 `holidays.json` 文件路径或 URL
3. 点击保存，页面自动刷新

---

## 📝 自定义配置

### holidays.json 格式

```json
{
  "2026-01-01": { 
    "type": "holiday", 
    "name": "元旦" 
  },
  "2026-02-14": { 
    "type": "personal", 
    "name": "情人节" 
  },
  "2026-06-15": { 
    "type": "trip_current", 
    "name": "新疆旅行" 
  },
  "2026-09-10": { 
    "type": "trip_next", 
    "name": "新加坡旅行" 
  },
  "2026-01-04": { 
    "type": "workday", 
    "name": "调休补班" 
  }
}
```

### 支持的类型（type）

| 类型 | 说明 | 颜色 |
|------|------|------|
| `holiday` | 法定假期 | 🔴 红色 |
| `personal` | 个人假期 | 🔵 蓝色 |
| `workday` | 调休工作日 | ⚫ 深灰色 |
| `trip_current` | 当前行程 | 🟢 绿色 |
| `trip_next` | 计划行程 | 🟡 黄色 |

### URL 参数配置

```
# 使用自定义数据源
index.html?holiday=https://example.com/my-holidays.json

# 使用本地文件
index.html?holiday=my-custom-holidays.json
```

---

## 🛠️ 技术栈

- **HTML5** - 语义化结构
- **Tailwind CSS** - 原子化样式框架
- **Vanilla JavaScript** - 无依赖纯 JS
- **Font Awesome** - 图标库
- **LocalStorage** - 配置持久化

---

## 📂 项目结构

```
go-holiday/
├── index.html          # 主页面
├── script.js           # 核心逻辑
├── style.css           # 自定义样式
├── holidays.json       # 默认假期数据
├── .gitignore          # Git 忽略配置
└── README.md           # 项目文档
```

---

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'feat: 添加某个很棒的特性'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

---

## 📄 开源协议

本项目采用 [MIT License](https://opensource.org/licenses/MIT) 开源协议。

---

## 💡 灵感来源

这个项目的灵感来自于：
- GitHub 的贡献热力图
- Google 简洁的搜索首页
- 对美好假期的向往 🏖️

---

<div align="center">

**[⬆ 回到顶部](#-go-holiday---极简假期日历搜索首页)**

Made with ❤️ by [tagorewang](https://github.com/wtao901231)

如果这个项目对你有帮助，请给个 ⭐️ Star 支持一下！

</div>
