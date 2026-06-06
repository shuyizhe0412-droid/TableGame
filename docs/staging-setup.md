---
AIGC:
    Label: "1"
    ContentProducer: 001191440300708461136T1XGW3
    ProduceID: 63a40eebc9086de9f4b13a282409bdeb_16bdeb98615311f18f065254007bceed
    ReservedCode1: SwqPCRKzaw8ZwQRJMdbXwQY+68Bj4s5lWCWZNK3wD4uOFtra1FxvCvcRgSZ49BHjk3+sT4GDAEQyzNHlSM3lALZ7q/nIG1JyPpanFQvpMFAZPTB3QO1ov04FaJaWDhhqYTXbXImP9/CjquOqrjzVqcrba0lNO5E/eweFqEYJjF44kuV3LcJ3Vv/tS34=
    ContentPropagator: 001191440300708461136T1XGW3
    PropagateID: 63a40eebc9086de9f4b13a282409bdeb_16bdeb98615311f18f065254007bceed
    ReservedCode2: SwqPCRKzaw8ZwQRJMdbXwQY+68Bj4s5lWCWZNK3wD4uOFtra1FxvCvcRgSZ49BHjk3+sT4GDAEQyzNHlSM3lALZ7q/nIG1JyPpanFQvpMFAZPTB3QO1ov04FaJaWDhhqYTXbXImP9/CjquOqrjzVqcrba0lNO5E/eweFqEYJjF44kuV3LcJ3Vv/tS34=
---

# Boardgame Hub — Staging 环境搭建操作文档

> **面向对象**：零基础、无后端/DevOps 经验的开发者。
> **阅读方式**：从第 1 步开始，逐条执行，每一步都标明了按钮颜色、位置和精确文字。完成全部 4 个大步骤后，你的 staging 环境即上线可用。

---

## 目录

- [准备工作](#准备工作)
- [第一步：创建 Supabase Staging 项目](#第一步创建-supabase-staging-项目)
- [第二步：创建 Render Staging 服务](#第二步创建-render-staging-服务)
- [第三步：配置 Cloudflare Pages Staging 部署](#第三步配置-cloudflare-pages-staging-部署)
- [第四步：验证整个 Staging 环境](#第四步验证整个-staging-环境)
- [附录 A：完整建表 SQL](#附录-a完整建表-sql)
- [附录 B：环境变量对照表](#附录-b环境变量对照表)

---

## 准备工作

在开始操作之前，请逐条确认以下条件全部满足。

| 序号 | 检查项 | 操作 |
|------|--------|------|
| 1 | 浏览器已打开 Chrome 或 Edge | 推荐使用 Chrome，版本 120+ |
| 2 | 已登录 Google 账号 | 打开 https://accounts.google.com 确认已登录 |
| 3 | 已用 Google 账号登录 Supabase | 打开 https://supabase.com/dashboard，确认右上角头像已显示 |
| 4 | 已用 GitHub 账号登录 Render | 打开 https://dashboard.render.com，确认右上角头像已显示 |
| 5 | 已登录 Cloudflare Dashboard | 打开 https://dash.cloudflare.com，确认能看到域名列表 |
| 6 | GitHub 仓库已 Fork / 有推送权限 | 确认你能在 https://github.com/shuyizhe0412-droid/TableGame 看到代码，且你有 push 权限或已 fork 到自己的 GitHub 账号下 |

> 以上 6 项全部通过后，进入第一步。

---

## 第一步：创建 Supabase Staging 项目

### 1.1 打开 Supabase Dashboard

1. 在浏览器新标签页中打开 **https://supabase.com/dashboard**。
2. 确认页面加载后，你能看到左侧竖直导航栏（灰色背景），以及主区域的项目列表。
3. 如果这是你第一次登录，项目列表可能为空，这是正常的。

### 1.2 点击 "New project" 按钮

4. 在项目列表区域，找到 **右上角** 的按钮。按钮特征：
   - **颜色**：绿色背景（#3ECF8E），白色文字
   - **文字**：`New project`
   - **图标**：按钮左侧有一个加号（+）图标
5. 点击这个绿色 `New project` 按钮。

### 1.3 填写新建项目表单

6. 点击后，会弹出一个「Create a new project」表单，包含以下字段。请严格按照下表填写：

| 表单字段 | 你需要填入的值 | 说明 |
|----------|---------------|------|
| **Name** | `boardgame-hub-staging` | 小写英文，用连字符分隔，这是项目的唯一标识 |
| **Database Password** | 自己设一个强密码并**记下来** | 至少 8 位，包含大小写字母 + 数字 + 符号。例如 `MyStaging@2026!`。务必在本地记事本或密码管理器中保存！ |
| **Region** | `Southeast Asia` | 点击下拉框，在下拉列表中滚动找到 `Southeast Asia (Singapore)`，点击选中 |
| **Pricing Plan** | `Free` | 弹窗顶部有 Free / Pro / Team / Enterprise 四个 Tab，确认 **Free** 处于选中状态（蓝色高亮下划线） |

7. 核对以上 4 项无误后，点击表单底部的按钮：
   - **颜色**：绿色背景（#3ECF8E）
   - **文字**：`Create new project`
8. 点击后，页面会跳转到项目概览页，顶部出现一个蓝色进度条，显示 `Project is being provisioned`。
9. **等待 1—2 分钟**。进度条消失、页面显示 `Project is ready` 后，进入下一步。

### 1.4 打开 SQL Editor

10. 确认你已在 `boardgame-hub-staging` 项目页面内（左上角面包屑导航显示项目名）。
11. 在页面左侧竖直导航栏中，找到并点击 **SQL Editor**：
    - **图标**：一个数据库圆柱体图标（三个圆柱叠在一起）
    - **文字**：`SQL Editor`
    - **位置**：左侧导航栏中段，在 `Table Editor` 下方、`Database` 上方
12. 点击后，右侧主区域变为 SQL 编辑器界面，左上角有一个绿色按钮。

### 1.5 创建新查询并粘贴建表 SQL

13. 在 SQL Editor 页面，点击左上角的绿色按钮：
    - **颜色**：绿色背景，白色文字
    - **文字**：`New query`
14. 点击后，页面中部打开一个空白查询标签页，中央有一个大型文本编辑区域。
15. 打开本文档末尾的 [附录 A：完整建表 SQL](#附录-a完整建表-sql)，**全选并复制全部 SQL 语句**。
16. 回到 Supabase 的 SQL 编辑区域，清空编辑框内容（如果有默认注释），**粘贴完整的建表 SQL**。
17. 检查粘贴的内容，确认以 `CREATE TABLE IF NOT EXISTS stores` 开头，以最后一条表的 `CREATE INDEX` 结尾。

### 1.6 执行 SQL

18. 点击 SQL 编辑区域右下角的绿色按钮执行：
    - **颜色**：绿色背景（#3ECF8E），白色文字
    - **文字**：`Run`
    - **快捷键提示**：按钮下方灰色小字 `or Ctrl+Enter`
19. 如果 SQL 执行成功，编辑器下方会出现结果面板，显示 `Success. No rows returned` 或类似的成功信息。**如果出现红色错误**，检查是否漏掉了分号或 SQL 语法问题（可对照附录 A 逐行核对），修正后重新执行。
20. 关闭当前查询标签页（点击标签上的 ×），返回项目总览。

### 1.7 获取 API 密钥（极其重要，请仔细记录）

21. 在左侧导航栏最底部，找到齿轮图标下的 **Project Settings**（项目设置），点击。
22. 在弹出的子菜单中，点击 **API**（第三个子项，图标为一把钥匙）。
23. 页面右侧会显示 API 配置信息。你需要记录以下 **3 个值**，建议复制到记事本或密码管理器中：

| 字段名 | 页面上的位置 | 你需要记录的内容 | 后续用途 |
|--------|------------|-----------------|---------|
| **Project URL** | 页面顶部，`URL` 标签下 | 以 `https://` 开头、以 `.supabase.co` 结尾的完整 URL | Render 环境变量 `SUPABASE_URL` |
| **anon public key** | `Project API keys` 区域，第一行，标签 `anon` `public` | 以 `eyJ` 开头的一长串字符 | Render 环境变量 `SUPABASE_ANON_KEY` |
| **service_role key** | `Project API keys` 区域，第二行，标签 `service_role` `secret` | 以 `eyJ` 开头的一长串字符 | Render 环境变量 `SUPABASE_SERVICE_ROLE_KEY`。⚠️ 此密钥拥有最高权限，**绝对不要**泄露或提交到代码仓库 |

> 以上 3 个值记录完毕后，**Supabase Staging 项目创建完成**。进入第二步。

---

## 第二步：创建 Render Staging 服务

### 2.1 打开 Render Dashboard

1. 在浏览器新标签页中打开 **https://dashboard.render.com**。
2. 确认右上角显示你的 GitHub 头像。如果未登录，点击右上角 `Sign In` → 选择 `GitHub` 完成授权登录。

### 2.2 创建新的 Web Service

3. 在 Render Dashboard 主页，找到右上角的按钮：
   - **颜色**：蓝色背景（#4353FF），白色文字
   - **文字**：`New +`
4. 点击 `New +` 按钮，弹出下拉菜单。在下拉菜单中选择：
   - **文字**：`Web Service`
   - **图标**：一个地球/网络图标

### 2.3 连接 GitHub 仓库

5. 页面跳转到 `Create a New Web Service` 页面。在页面中央的 `Connect a repository` 区域：
   - 如果你尚未授权 Render 访问 GitHub，会看到一个绿色按钮 `Connect GitHub`，点击并按提示授权。
   - 如果已授权，会显示 GitHub 仓库列表。
6. 在搜索框中输入 `TableGame`，找到仓库 `shuyizhe0412-droid/TableGame`（或你 fork 后的仓库名）。
7. 点击仓库名右侧的 **`Connect`** 按钮（蓝色文字链接）。

### 2.4 配置 Web Service 参数

8. 进入配置页面后，按以下表格逐项填写/选择：

| 配置项 | 你的操作 |
|--------|---------|
| **Name** | 输入框清空默认值，填入 `boardgame-hub-staging`。输入框下方灰色小字会显示最终访问 URL 预览 |
| **Region** | 下拉框选择 `Singapore (Southeast Asia)`，与 Supabase 同区域，降低延迟 |
| **Branch** | 输入框填入 `staging` |
| **Root Directory** | 输入框填入 `server`（不要带斜杠） |
| **Runtime** | 保持默认 `Node`，不要改动 |
| **Build Command** | 输入框填入 `npm install`（注意是 install，不是 ci） |
| **Start Command** | 输入框填入 `node index.js` |
| **Instance Type** | 选择 `Free`（免费实例，512 MB RAM） |

9. 上表所有字段确认无误后，进入下一步。

### 2.5 配置环境变量

10. 在配置页面往下滚动，找到 **Environment Variables** 区域。
11. 点击 `Add Environment Variable` 按钮（灰色边框，虚线样式）。
12. 对照 [附录 B：环境变量对照表](#附录-b环境变量对照表)，逐个添加所有环境变量。每添加一对（Key + Value），点击 `Add` 按钮后再添加下一对。
13. 特别注意以下 3 个变量的 Value 必须填入你在第一步 1.7 中记录的 Supabase 值：

| Key | Value 来源（第一步 1.7） |
|-----|--------------------------|
| `SUPABASE_URL` | Project URL |
| `SUPABASE_ANON_KEY` | anon public key |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role key |

14. 全部环境变量添加完毕后，检查 `Environment Variables` 区域中每个 Key 和 Value 是否与附录 B 一致（Value 因个人密钥不同会有差异，但 Key 名必须完全一致）。

### 2.6 创建服务并等待部署

15. 滚动到页面最底部，找到蓝色按钮：
    - **颜色**：蓝色背景（#4353FF），白色文字
    - **文字**：`Create Web Service`
16. 点击 `Create Web Service`。
17. 页面跳转到服务详情页。页面中央会出现黑色终端风格的日志面板，实时显示构建和部署日志。你会看到：
    - `==> Cloning repository...`
    - `==> Installing dependencies...`（`npm install` 的输出）
    - `==> Build successful...`
    - `==> Deploying...`
18. **等待 3—5 分钟**，直到日志面板最底部出现绿色文字：
    - `Your service is live 🎉`
    - 此时页面顶部的服务 URL（形如 `https://boardgame-hub-staging.onrender.com`）变为可点击状态。

### 2.7 记录 Render 服务 URL

19. 页面顶部蓝色 URL 链接（`.onrender.com` 结尾的那一串），**复制并记录**。这个 URL 是 staging 后端的完整地址。
20. Render 配置完成，进入第三步。

---

## 第三步：在 Cloudflare Pages 重新部署（生产 + Staging）

> **背景**：之前部署在旧 Cloudflare 账号下的项目已失联（旧账号用 Google 登录，无法绕过）。现在用你的 GitHub 账号 `Shuyizhe0412` 登录的全新 Cloudflare 账号，需要从零创建 Pages 项目，**同时覆盖生产环境（main 分支）和 Staging 环境（staging 分支）**。

---

### 3.1 打开 Cloudflare Dashboard

1. 确认你已在浏览器中登录 Cloudflare：打开 **https://dash.cloudflare.com**。
2. 左侧导航栏找到 **Workers & Pages**（立方体图标），点击进入。
3. 确认页面显示 `No projects found`——这是正常的，因为全新账号还没有任何项目。

---

### 3.2 创建 Pages 项目（连接 GitHub）

4. 在 Workers & Pages 页面，点击右上角的蓝色按钮：
   - **颜色**：蓝色背景，白色文字
   - **文字**：`创建应用程序`
5. 在弹出的创建向导中，点击 **Pages** Tab（蓝色段落卡片，标题 `Pages`，描述是「部署静态站点并自动化 Git 集成」）。
6. 在 Pages Tab 内，点击 `连接到 Git` 按钮（蓝色）。
7. 选择 **GitHub** 作为 Git 提供商。
8. 系统会弹出 GitHub 授权页面。点击 `授权 Cloudflare Pages` 或 `Authorize` 按钮。
9. 授权成功后，回到 Cloudflare 页面，从仓库列表中选择：
   - **账号**：`Shuyizhe0412`（或 `shuyizhe0412-droid`）
   - **仓库**：`boardgame-hub-deploy`（不是 `TableGame`，那个已被旧账号占用）
10. 点击 `开始设置` 按钮。

---

### 3.3 配置构建设置

11. 在构建配置页面填写以下信息：

| 字段 | 值 | 说明 |
|------|----|------|
| **项目名称** | `boardgame-hub` | 小写英文，用连字符分隔。最终生产 URL 为 `boardgame-hub.pages.dev` |
| **生产分支** | `main` | 默认值，不要改 |

12. 往下滚动到「构建设置」区域：

| 字段 | 值 |
|------|-----|
| **Framework preset** | `None` / 空白 |
| **构建命令** | 留空（项目是纯静态 HTML/JS/CSS，无需构建） |
| **构建输出目录** | `boardgame-ai-coach`（前端代码在这个子目录下） |

13. 点击 `保存并部署` 按钮（蓝色）。

14. 等待首次部署完成。Cloudflare 会自动构建 `main` 分支并部署到 `https://boardgame-hub.pages.dev`。
    - 在页面上看到绿色 `✓ Success` 标记 → 生产环境部署成功。
    - **记录这个 URL**：`https://boardgame-hub.pages.dev`

---

### 3.4 配置生产环境变量（Production）

15. 部署成功后，点击左侧 `设置` Tab（或顶部 Settings 菜单）。
16. 在设置页左侧子导航中，点击 **`环境变量`**。
17. 在 **Production** 区域中，添加以下环境变量：

| 变量名 | 值 | 来源 |
|--------|----|------|
| `VITE_API_BASE_URL` | 你的生产 Render URL（如 `https://boardgame-hub.onrender.com`） | 已有的生产 Render 服务 |
| `VITE_SUPABASE_URL` | 你的生产 Supabase Project URL | 已有的生产 Supabase 项目 |
| `VITE_SUPABASE_ANON_KEY` | 你的生产 Supabase anon key | 已有的生产 Supabase 项目 |

18. 每添加一个变量后点击 `保存`。全部添加完毕后，Cloudflare 会自动触发一次重新部署。

---

### 3.5 配置 Staging 分支自动部署

19. 在设置页左侧子导航中，点击 **`构建和部署`**。
20. 找到 **`分支部署控制`** 区域。
21. 在 `预览分支` 部分，找到 `添加分支` 输入框，填入 `staging`。
22. 点击旁边的 `添加` 按钮。
23. 确认列表中出现了 `staging` 分支。

---

### 3.6 配置 Staging 环境变量（Preview）

24. 在设置页左侧子导航中，点击 **`环境变量`**。
25. 页面分为 **Production** 和 **Preview** 两个区域。在 **Preview** 区域中，添加以下环境变量：

| 变量名 | 值 | 来源 |
|--------|----|------|
| `VITE_API_BASE_URL` | 第二步 2.7 中记录的 Render staging URL，形如 `https://boardgame-hub-staging.onrender.com` | 第二步完成后获得 |
| `VITE_SUPABASE_URL` | 第一步 1.7 中记录的 Supabase staging Project URL | 第一步完成后获得 |
| `VITE_SUPABASE_ANON_KEY` | 第一步 1.7 中记录的 Supabase staging anon key | 第一步完成后获得 |

> **注意**：Preview 环境变量中的值**必须与 Production 不同**——它们指向 staging 的 Supabase 和 Render，而不是生产的。

26. 每添加一个变量后点击 `保存`。

---

### 3.7 触发 Staging 首次部署

27. 点击顶部 `部署` Tab 返回部署列表页。
28. 如果 `staging` 分支的部署没有自动开始，可以手动触发：
    - 打开 GitHub → TableGame 仓库 → 切换到 `staging` 分支
    - 对任意文件做一次小改动并提交（如新建一个空文件 `staging-deploy-trigger.txt`）
    - 推送后，Cloudflare 会自动检测到 staging 分支更新并开始部署
29. 部署完成后，staging 会生成一个 Preview URL，格式为 `<hash>.boardgame-hub.pages.dev`。
30. **记录这个 Preview URL**。

---

### 3.8 最终结果

完成以上步骤后，你会有两个 URL：

| 环境 | URL | 分支 | 前端 API 指向 |
|------|-----|------|-------------|
| 生产（Production） | `https://boardgame-hub.pages.dev` | `main` | 生产 Render |
| 预发布（Staging） | `<hash>.boardgame-hub.pages.dev` | `staging` | Staging Render |

Cloudflare Pages 配置完成，进入第四步。

---

## 第四步：验证整个 Staging 环境

### 4.1 验证前端可访问（两个环境都要检查）

#### 生产环境

1. 打开浏览器新标签页，访问生产 URL：**https://boardgame-hub.pages.dev**。
2. 等待页面完全加载，确认不是白屏，能看到首页内容。

#### Staging 环境

3. 打开另一个标签页，访问第三步 3.7 中记录的 staging Preview URL（如 `https://abc123.boardgame-hub.pages.dev`）。
4. 同样确认页面正常加载，无白屏。

5. 两个环境都正常加载后，勾选此项 ☑️。

### 4.2 验证登录/注册流程

4. 在 staging 前端页面中，找到 **登录 / 注册** 入口：
   - 通常在页面右上角，按钮文字为 `登录` 或 `Sign In`
   - 或者在页面中央有一个登录表单
5. 点击登录/注册按钮，进入认证页面。
6. 如果使用 Supabase Auth：
   - 输入一个测试邮箱和密码，点击 `注册` 或 `Sign Up`
   - 检查是否注册成功（页面跳转、出现用户头像或仪表盘等）
   - 如果使用邮箱验证，打开 Supabase Dashboard → Authentication → Users，手动确认该用户的邮箱已验证（勾选用户 → Confirm）
7. 如果使用 OAuth（Google 登录）：
   - 点击 `Continue with Google` 按钮
   - 完成 Google 账号授权流程
   - 确认授权后页面跳转回 staging 前端
8. 登录成功后，勾选此项 ☑️。

### 4.3 验证 API 请求指向 Staging 后端

9. 在已登录的 staging 前端页面中，按 **F12** 打开浏览器开发者工具。
10. 点击 **Network**（网络）Tab。
11. 刷新页面（F5），观察 Network 面板中的请求。
12. 过滤请求类型，点击 **Fetch/XHR** 过滤器（在 Network Tab 中第二行，`Fetch/XHR` 按钮）。
13. 检查发出的 API 请求的域名：
    - 确认请求域名是 Render staging URL（形如 `https://boardgame-hub-staging.onrender.com`）
    - **不是** `localhost` 或其他 URL
14. 点击任意一个 API 请求，查看 Response 标签页，确认返回了有效数据（而非 500 错误或 `{"error":"..."}`）。
15. API 请求正确指向 staging 后端后，勾选此项 ☑️。

### 4.4 最终检查清单

| 检查项 | 状态 |
|--------|------|
| 生产 URL `https://boardgame-hub.pages.dev` 可访问 | ☐ |
| Staging Preview URL 可访问 | ☐ |
| Staging 环境登录/注册流程成功 | ☐ |
| 注册的新用户在 Supabase → Authentication → Users 中可见 | ☐ |
| API 请求指向 Render staging URL | ☐ |
| Supabase 7 张表均存在（SQL Editor → 查看左侧 Tables 列表） | ☐ |

> 以上 6 项全部通过后，你的 staging 环境搭建完毕。

---

## 附录 A：完整建表 SQL

> 以下 SQL 使用 PostgreSQL 语法。直接全选复制到 Supabase SQL Editor 中执行即可。

```sql
-- ============================================================
-- Boardgame Hub Staging 数据库建表脚本
-- 执行环境：Supabase PostgreSQL
-- 包含 7 张核心业务表 + 外键约束 + 索引
-- ============================================================

-- 1. 门店表
CREATE TABLE IF NOT EXISTS stores (
    id              TEXT PRIMARY KEY,
    email           TEXT UNIQUE NOT NULL,
    password_hash   TEXT NOT NULL,
    store_name      TEXT NOT NULL,
    phone           TEXT DEFAULT '',
    address         TEXT DEFAULT '',
    avatar          TEXT DEFAULT '',
    created_at      TEXT DEFAULT now(),
    updated_at      TEXT DEFAULT now()
);

-- 2. 门店游戏表
CREATE TABLE IF NOT EXISTS store_games (
    id              TEXT PRIMARY KEY,
    store_id        TEXT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    category        TEXT DEFAULT '',
    description     TEXT DEFAULT '',
    cover_image     TEXT DEFAULT '',
    tags            TEXT DEFAULT '',
    min_players     INTEGER DEFAULT 1,
    max_players     INTEGER DEFAULT 10,
    duration        INTEGER DEFAULT 30,
    difficulty      INTEGER DEFAULT 1,
    price           NUMERIC(10, 2) DEFAULT 0.00,
    stock           INTEGER DEFAULT 0,
    rating          NUMERIC(3, 2) DEFAULT 0.00,
    source          TEXT DEFAULT 'custom',
    created_at      TEXT DEFAULT now(),
    updated_at      TEXT DEFAULT now()
);

-- 3. 游戏文件表
CREATE TABLE IF NOT EXISTS game_files (
    id              TEXT PRIMARY KEY,
    game_id         TEXT NOT NULL REFERENCES store_games(id) ON DELETE CASCADE,
    store_id        TEXT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    filename        TEXT NOT NULL,
    original_name   TEXT NOT NULL,
    file_type       TEXT NOT NULL,
    file_size       INTEGER DEFAULT 0,
    created_at      TEXT DEFAULT now()
);

-- 4. 全局游戏表
CREATE TABLE IF NOT EXISTS global_games (
    id              TEXT PRIMARY KEY,
    game_name       TEXT NOT NULL,
    cover_url       TEXT DEFAULT '',
    player_min      INTEGER DEFAULT 1,
    player_max      INTEGER DEFAULT 10,
    duration        INTEGER DEFAULT 30,
    difficulty      INTEGER DEFAULT 1,
    tags            TEXT DEFAULT '',
    created_at      TEXT DEFAULT now()
);

-- 5. 游戏会话表
CREATE TABLE IF NOT EXISTS game_sessions (
    id              TEXT PRIMARY KEY,
    store_id        TEXT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    game_name       TEXT NOT NULL,
    table_number    TEXT DEFAULT '',
    start_time      TEXT DEFAULT now(),
    end_time        TEXT DEFAULT '',
    status          TEXT DEFAULT 'active',
    created_at      TEXT DEFAULT now()
);

-- 6. AI 对话表
CREATE TABLE IF NOT EXISTS ai_conversations (
    id              TEXT PRIMARY KEY,
    store_id        TEXT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    role            TEXT NOT NULL,
    content         TEXT NOT NULL,
    created_at      TEXT DEFAULT now()
);

-- 7. 上传文件表
CREATE TABLE IF NOT EXISTS uploaded_files (
    id              TEXT PRIMARY KEY,
    store_id        TEXT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    original_name   TEXT NOT NULL,
    stored_name     TEXT NOT NULL,
    mime_type       TEXT DEFAULT '',
    size            TEXT DEFAULT '0',
    url             TEXT DEFAULT '',
    created_at      TEXT DEFAULT now()
);

-- ============================================================
-- 索引（可选，提升查询性能）
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_store_games_store_id      ON store_games(store_id);
CREATE INDEX IF NOT EXISTS idx_game_files_game_id         ON game_files(game_id);
CREATE INDEX IF NOT EXISTS idx_game_files_store_id        ON game_files(store_id);
CREATE INDEX IF NOT EXISTS idx_game_sessions_store_id     ON game_sessions(store_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_store_id  ON ai_conversations(store_id);
CREATE INDEX IF NOT EXISTS idx_uploaded_files_store_id    ON uploaded_files(store_id);
CREATE INDEX IF NOT EXISTS idx_stores_email               ON stores(email);
```

---

## 附录 B：环境变量对照表

### Render Web Service 环境变量

| Key | Value | 说明 |
|-----|-------|------|
| `NODE_ENV` | `staging` | 运行环境标识 |
| `PORT` | `10000` | Render 自动分配，通常无需手动设置 |
| `SUPABASE_URL` | `[第一步 1.7 记录的 staging Project URL]` | Supabase staging 项目地址 |
| `SUPABASE_ANON_KEY` | `[第一步 1.7 记录的 staging anon key]` | Supabase 匿名密钥 |
| `SUPABASE_SERVICE_ROLE_KEY` | `[第一步 1.7 记录的 staging service_role key]` | Supabase 服务角色密钥 |
| `FRONTEND_URL` | `[第三步 3.7 记录的 Cloudflare Pages staging Preview URL]` | 前端 staging 地址，用于 CORS |
| `DATABASE_URL` | 留空（使用 Supabase 直连，不通过 Render） | - |

### Cloudflare Pages Production 环境变量

| 变量名 | 值 | 说明 |
|--------|----|------|
| `VITE_API_BASE_URL` | 生产 Render URL（已有） | 后端 API 地址 |
| `VITE_SUPABASE_URL` | 生产 Supabase URL（已有） | Supabase 项目地址 |
| `VITE_SUPABASE_ANON_KEY` | 生产 Supabase anon key（已有） | Supabase 匿名密钥 |

### Cloudflare Pages Preview（Staging）环境变量

| 变量名 | 值 | 说明 |
|--------|----|------|
| `VITE_API_BASE_URL` | `[第二步 2.7 记录的 Render staging URL]` | 后端 API 地址 |
| `VITE_SUPABASE_URL` | `[第一步 1.7 记录的 staging Project URL]` | Supabase 项目地址 |
| `VITE_SUPABASE_ANON_KEY` | `[第一步 1.7 记录的 staging anon key]` | Supabase 匿名密钥 |

---

> **文档版本**：v1.1
> **最后更新**：2026-06-06
> **更新内容**：Cloudflare 旧账号失联，改为从零创建 Pages 项目，同时覆盖生产 + staging；附录 B 新增 Production 环境变量表。
> **适用分支**：`staging`
