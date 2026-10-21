---
name: MiaoCut
description: 免费、免注册的 AI 抠图工具集；界面像一张安静的工作台，用户的图片是主角。
colors:
  ink: "#111827"
  ink-soft: "#374151"
  body-text: "#1f2937"
  secondary-text: "#4b5563"
  muted-text: "#6b7280"
  canvas: "#f9fafb"
  surface: "#ffffff"
  hairline: "#f3f4f6"
  border: "#e5e7eb"
  border-strong: "#d1d5db"
  brand: "#10b981"
  brand-strong: "#059669"
  brand-text: "#047857"
  brand-tint: "#ecfdf5"
  brand-hover-border: "#34d399"
  error: "#dc2626"
  warning: "#b45309"
  dark-canvas: "#09090b"
  dark-surface: "#18181b"
  dark-raised: "#27272a"
  dark-border: "#27272a"
  dark-border-strong: "#3f3f46"
  dark-ink: "#fafafa"
  dark-body-text: "#e4e4e7"
  dark-secondary-text: "#d4d4d8"
  dark-muted-text: "#a1a1aa"
  dark-brand-text: "#34d399"
typography:
  display:
    fontFamily: "Geist, system-ui, -apple-system, 'Segoe UI', Roboto, 'PingFang SC', 'Microsoft YaHei', sans-serif"
    fontSize: "clamp(2.25rem, 5vw, 3.75rem)"
    fontWeight: 700
    lineHeight: 1.05
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "clamp(1.875rem, 3vw, 2.25rem)"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 700
    lineHeight: 1.55
  body:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  body-small:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.43
  label:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1.33
  mono:
    fontFamily: "'Geist Mono', ui-monospace, SFMono-Regular, Menlo, monospace"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.43
rounded:
  control: "8px"
  card: "12px"
  dialog: "16px"
  pill: "9999px"
spacing:
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "24px"
  xl: "40px"
  section: "64px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.surface}"
    typography: "{typography.body-small}"
    rounded: "{rounded.pill}"
    padding: "10px 20px"
  button-primary-hover:
    backgroundColor: "{colors.ink-soft}"
    textColor: "{colors.surface}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.body-small}"
    rounded: "{rounded.pill}"
    padding: "10px 20px"
  chip-toggle:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.body-text}"
    typography: "{typography.body-small}"
    rounded: "{rounded.pill}"
    padding: "4px 12px"
  chip-toggle-active:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.surface}"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.body-small}"
    rounded: "{rounded.control}"
    padding: "10px 12px"
  card:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: "24px"
  dropzone:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.body-text}"
    rounded: "{rounded.card}"
    padding: "32px"
  icon-tile:
    backgroundColor: "{colors.brand-tint}"
    textColor: "{colors.brand-strong}"
    rounded: "{rounded.card}"
    size: "48px"
  nav-link:
    textColor: "{colors.secondary-text}"
    typography: "{typography.body-small}"
  nav-link-active:
    textColor: "{colors.ink}"
---

# Design System: MiaoCut

## Overview

**Creative North Star: "安静的工作台"（The Quiet Workbench）**

MiaoCut 的界面像一张收拾干净的工作台：工具摆在顺手的位置，台面本身不抢眼，用户放上来的图片和处理结果才是主角。界面整体克制、实用、可信，一眼就能看懂下一步该做什么，不用装饰去争夺注意力。

色彩以中性灰为底，近黑色承担所有主要操作，品牌祖母绿只在少数地方出现（成功状态、图标底色、悬停提示、选中态），因为稀少所以醒目。层次靠浅色底和细边框表达，静止时是平的，只有被鼠标指向、被打开的东西（悬停的卡片、下拉菜单、弹窗）才浮起来。全站深色模式是一等公民，每一处浅色设计都有对应的深色版本。

这套系统来自免费工具页的现有实现（首页、商品图、人像、去水印等）。会员模块（定价、批量、账户）目前偏离了它，重新设计时以本文件为准。

**Key Characteristics:**
- 中性灰底 + 近黑色主操作 + 少量祖母绿点缀
- 静止扁平，交互时才浮起
- 卡片 12px 圆角，操作按钮和切换标签用胶囊形，表单控件 8px
- 全站只用 Geist 一个字体家族，靠字重和字号拉开层级
- 深色模式完整对应，使用 zinc 灰阶

## Colors

中性灰撑起整个台面，近黑色负责“做事”，祖母绿负责“成功和少量重点”。

### Primary
- **工作台墨黑**（ink）：主按钮底色、标题文字、选中的切换标签。深色模式下反转为近白（dark-ink），主按钮变成白底黑字。
- **工作台石墨**（ink-soft）：主按钮悬停色，比墨黑浅一级。

### Secondary
- **抠图祖母绿**（brand / brand-strong）：成功状态、图标底板上的图标、上传区悬停时的提示边框（brand-hover-border）、文字选中高亮。它不是操作色。
- **祖母绿文字**（brand-text）：需要用绿色写字时（链接、成功提示、价格强调）一律用这个更深的绿，保证与白底对比度约 5.5:1；深色模式用 dark-brand-text。
- **薄荷底**（brand-tint）：图标底板和极少量的成功提示背景。

### Neutral
- **台面灰**（canvas）：页面背景，以及白色区块里的次级卡片背景。
- **纸白**（surface）：内容区块、上传区、输入框、次按钮的底色。
- **细线灰**（hairline / border / border-strong）：由浅到深三档分隔线和边框；border-strong 用于按钮和输入框的描边。
- **正文三档**（body-text / secondary-text / muted-text）：正文、说明文字、辅助信息。muted-text 是能用于文字的最浅一档（与白底对比度约 4.8:1），不能再浅。
- **深色台面**（dark-canvas / dark-surface / dark-raised）：深色模式下的页面、区块、悬停或浮起层。
- **深色文字与边框**（dark-ink / dark-body-text / dark-secondary-text / dark-muted-text / dark-border / dark-border-strong）：与浅色模式一一对应。

### 状态色
- **错误红**（error）与 **警告琥珀**（warning）只用于状态提示，不做装饰。

### Named Rules
**The One Accent Rule.** 祖母绿在任何一屏上占比不超过约 10%。它出现在成功、选中、图标底板和悬停提示上，不用来做主按钮或大面积背景。

**The Readable Green Rule.** 绿色文字在浅色模式一律用 brand-text（#047857），不用 brand / brand-strong；后两者对白底对比度不足 4.5:1。

**The Single Green Rule.** 品牌绿以祖母绿为准（2026-10-11 确认）。logo 字标里的青绿色（#1eb8a7）是历史遗留，待统一，不得在其他地方使用。

## Typography

**Display Font:** Geist（自托管可变字重，回退 system-ui；中文回退 PingFang SC / Microsoft YaHei）
**Body Font:** Geist
**Label/Mono Font:** Geist Mono（仅用于需要等宽的数字或代码，极少使用）

**Character:** 一个干净的几何无衬线家族贯穿全站，标题粗、略收紧字距，正文舒展。不靠第二种字体制造气氛。

### Hierarchy
- **Display**（700，2.25rem 起、桌面最大 3.75rem，行高约 1.05，字距 -0.02em）：每页唯一的主标题，配合 text-balance 让换行均匀。
- **Headline**（700，1.875rem～2.25rem，字距 -0.025em）：页面中的分区标题。
- **Title**（700，1.125rem）：卡片标题、弹窗标题、工具名称。
- **Body**（400，1rem，行高 1.5）：说明性段落，单行不超过约 70 个字符宽。
- **Body small**（400，0.875rem）：界面里最常用的字号：按钮文字、导航、表单、辅助说明。
- **Label**（600，0.75rem）：徽章、小标签、计数。全大写只用于 4 个词以内的徽章（如 PRO）和页脚分组标题。

### Named Rules
**The One Family Rule.** 全站只用 Geist（加极少量 Geist Mono）。层级靠字重（400 / 500 / 600 / 700）和字号拉开，不引入第二种展示字体。

## Layout

内容居中、宽度受控。页面主容器最大 72rem（max-w-6xl），左右留 20px 边距；工具操作区收窄到 48rem（max-w-3xl），让用户视线集中在上传区和结果上；说明性文字段落最宽约 42rem（max-w-2xl）。

间距节奏以 8px 为基础：控件内 8～12px，卡片内 24px，区块之间 40～64px，页面上下 48～64px。断点沿用 Tailwind 默认（640 / 768 / 1024 / 1280px）：导航在 768px 以下收起，部分次要导航项在 1280px 以上才显示，避免换行。

多列内容优先用自适应网格（2～4 列），手机上一律单列。

## Elevation & Depth

静止扁平，交互时浮起。层级首先靠背景明暗（台面灰与纸白交替）和 1px 细边框表达；阴影只出现在“正在被交互”或“浮在页面之上”的元素上。

### Shadow Vocabulary
- **标记阴影**（`box-shadow: 0 1px 2px rgb(15 23 42 / 0.08)`）：logo 图标这类小元素的轻微托底。
- **悬停浮起**（Tailwind shadow-md：`0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)`）：可点击卡片被悬停时出现。
- **浮层**（`0 18px 45px rgb(15 23 42 / 0.14), 0 4px 12px rgb(15 23 42 / 0.08)`）：下拉菜单。
- **弹窗**（Tailwind shadow-2xl：`0 25px 50px -12px rgb(0 0 0 / 0.25)`）：模态弹窗，配合半透明深色遮罩和轻微背景模糊。

### Named Rules
**The Flat-At-Rest Rule.** 卡片和区块静止时不带阴影。阴影是对交互的回应（悬停、展开、弹出），不是装饰。

## Shapes

圆角克制、按用途分三档：表单控件和小按钮 8px，卡片、上传区、图标底板 12px，弹窗 16px；独立的操作按钮、切换标签、徽章用胶囊形（全圆角）。边框统一 1px，上传区例外，用 2px 虚线表示“可以放东西进来”。

用户图片的透明区域用浅灰棋盘格表示，这是工作台上最重要的“台面纹理”。

### Named Rules
**The No Over-Round Rule.** 卡片和区块的圆角不超过 16px。

## Components

### Buttons
干净、安静、一眼可点。
- **Shape:** 胶囊形（9999px）；放在表单或弹窗里、需要撑满宽度的按钮可用 8px 圆角。
- **Primary:** 墨黑底白字（ink / surface），文字 0.875rem 半粗（600），内边距约 10px 20px。深色模式反转为近白底黑字。
- **Hover / Focus:** 悬停底色变为石墨（ink-soft），只做颜色过渡（约 150ms）；键盘聚焦显示 2px 墨黑描边环，深色模式为近白。
- **Secondary:** 纸白底、墨黑字、border-strong 1px 描边，悬停时描边加深。
- **Text button:** 无底无框，灰色文字，悬停变墨黑，用于“取消 / 稍后再说”这类次要动作。

### Chips
- **Style:** 胶囊形切换标签，纸白底、正文色文字、border-strong 描边。
- **State:** 选中时变为墨黑底白字（深色模式反转）；用于质量档位、画幅比例、导出格式等互斥选项。

### Cards / Containers
- **Corner Style:** 12px。
- **Background:** 白色区块里用台面灰（canvas），灰色页面上用纸白（surface）；深色模式用 dark-surface。
- **Shadow Strategy:** 静止无阴影，可点击时悬停浮起（见 Elevation & Depth）。
- **Border:** 1px hairline 或 border。
- **Internal Padding:** 24px。

### Inputs / Fields
- **Style:** 纸白底、border-strong 1px 描边、8px 圆角，内边距约 10px 12px。
- **Focus:** 描边变为墨黑并加一圈淡墨黑光晕（约 2px，15% 透明度）。
- **Error / Disabled:** 错误时下方显示错误红小字；禁用时降低不透明度并改为不可点光标。

### Navigation
- **Style:** 顶栏白底（深色模式 dark-surface 半透明）+ 底部细线，吸顶。左侧 logo，右侧导航链接为 body-small 中等字重、说明文字色，悬停和当前页为墨黑。
- **Mobile / Tablet:** 1024px 以下，工具链接放入顶栏下方的横向导航；顶栏保留 logo、GitHub、主题切换和语言下拉菜单，避免较长的翻译挤出屏幕。
- **会员页面:** 与首页使用相同的顶栏结构、工具入口和 `language-menu.js` 八语言下拉交互。批量、定价和账户入口放在次级导航；会员语言切换保留当前路径和业务参数，工具链接进入对应语言的静态页面。

### Dropzone（标志性组件）
工作台上“放东西的地方”。纸白底、2px 虚线 border-strong、12px 圆角、最小高度约 320px，居中放上传图标和一句提示；悬停时虚线变为祖母绿（brand-hover-border）、背景透出极淡的薄荷色。处理中、完成、出错都在同一块区域里原地切换，不跳页面。

### Icon Tile
48px 方形、12px 圆角、薄荷底（brand-tint）+ 祖母绿图标（brand-strong），用于工具卡片和功能说明前的图标。

## Do's and Don'ts

### Do:
- **Do** 主操作一律用墨黑胶囊按钮（深色模式反转为近白），一屏只有一个最主要的操作。
- **Do** 绿色文字在浅色模式用 brand-text（#047857），深色模式用 dark-brand-text（#34d399）。
- **Do** 每个浅色样式都写出对应的深色样式（zinc 灰阶），深色模式与浅色模式同等完整。
- **Do** 层级先用台面灰 / 纸白交替和 1px 细线表达，阴影只给悬停、下拉、弹窗。
- **Do** 卡片 12px、控件 8px、操作按钮和切换标签胶囊形。
- **Do** 透明图一律放在浅灰棋盘格上展示。
- **Do** 所有页面（包括会员模块）共用同一套 Tailwind 样式和顶栏，不另起一套独立 CSS。

### Don't:
- **Don't** 用祖母绿做主按钮或大面积背景；绿色只表示成功、选中和少量重点（The One Accent Rule）。
- **Don't** 在 logo 字标以外使用青绿色 #1eb8a7。
- **Don't** 引入第二种强调色（蓝、紫、粉等）做装饰；红色和琥珀色只用于错误和警告。
- **Don't** 让卡片静止时带阴影，也不要“1px 边框 + 大范围柔和阴影”叠在一起。
- **Don't** 卡片和区块圆角超过 16px。
- **Don't** 引入 Geist 以外的展示字体。
- **Don't** 用比 muted-text（#6b7280）更浅的灰色写正文或说明文字。
