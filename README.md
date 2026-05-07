# CartesianVectors

中文 3D 笛卡尔坐标系向量教学演示应用。第一版使用 Vite、TypeScript 和 Three.js 实现，支持在浏览器中查看空间向量、XYZ 分量、分解辅助线、角度关系和方向余弦。

## 功能目标

- 中文控制面板和教学信息。
- 3D 坐标轴、参考网格、可旋转缩放视角。
- 添加、删除、选中和隐藏多个向量。
- 通过分量模式编辑 `x/y/z`，或通过方向模式编辑 `|v|`、Yaw、Pitch。
- 编辑向量颜色、粗细。
- 独立显示或隐藏分量箭头、分解辅助线、角度关系、名称标签、分量长度标签、模长标签。
- 显示长度、单位向量、方向余弦和方向余弦恒等式。
- 零向量显示中文提示，不产生无效数值。

## 参数模式

- 分量模式：直接设置 `x/y/z`，这是应用内部保存向量的主状态。
- 方向模式：实时设置 `|v|`、Yaw、Pitch，并立即换算回 `x/y/z` 后重绘。
- Yaw 控制向量在 XY 平面的朝向，Pitch 控制相对 XY 平面的仰角。单个向量的 Roll 不改变方向，通常用于刚体姿态。
- `α/β/γ` 作为教学派生量显示，表示向量与 X/Y/Z 正方向的夹角。

## 开发环境

本仓库提供 Conda 环境文件。为尽量减少对本机系统环境的影响，本地调试和演示推荐优先使用 Conda 环境，不建议直接依赖系统 Node/npm：

```bash
conda env create -f environment.yml
conda activate cartesian-vectors
npm install
npm run dev
```

如果环境已经创建过，并且只在当前机器浏览器访问，可直接运行：

```bash
conda activate cartesian-vectors
npm run dev
```

如果通过 SSH、远程服务器、局域网设备或 Codex app 右侧浏览器访问，请监听所有网卡：

```bash
conda activate cartesian-vectors
npm run dev -- --host 0.0.0.0
```

Vite 会输出类似：

```text
Local:   http://localhost:5173/
Network: http://192.168.x.x:5173/
```

其中 `0.0.0.0` 只是监听地址，不是浏览器访问地址；浏览器应打开 `Local` 或 `Network` 后面的具体 URL。

也可以不激活 shell，直接用 `conda run`：

```bash
conda run -n cartesian-vectors npm install
conda run -n cartesian-vectors npm run dev
conda run -n cartesian-vectors npm run dev -- --host 0.0.0.0
```

使用本机已有 Node/npm 只建议作为临时排障手段：

```bash
npm install
npm run dev
```

## 常用命令

```bash
npm run dev
npm run dev -- --host 0.0.0.0
npm run build
npm run preview
npm run preview -- --host 0.0.0.0
```

推荐在 Conda 环境内执行：

```bash
conda run -n cartesian-vectors npm run build
```

## 浏览器与图形加速

完整 3D 视图依赖浏览器支持 WebGL。可在 Chrome/Chromium 地址栏打开 `chrome://gpu` 检查：

- `WebGL: Hardware accelerated` 或 `OpenGL: Enabled`：通常可以正常显示 3D。
- `WebGL: Unavailable` 或 `OpenGL: Unavailable`：浏览器无法创建 WebGL 上下文，应用会降级到 2D 等轴测预览。

远程桌面环境可能影响图形加速。例如 xrdp 会话经常无法透传本地 GPU/OpenGL 能力，导致 Chrome 显示 `WebGL: Unavailable`；同一台机器在本地桌面登录时可能正常显示 `WebGL: Hardware accelerated`。这属于远程桌面图形栈限制，不是应用逻辑错误。

排障建议：

- 优先使用本地桌面浏览器或支持 WebGL 的客户端浏览器访问局域网地址。
- 在 Linux Chrome/Chromium 中确认“使用图形加速功能”已开启，并重启浏览器。
- 如必须在远程桌面中测试，可尝试 Firefox，或用 Chrome 参数 `--ignore-gpu-blocklist --enable-unsafe-swiftshader` 临时验证软件 WebGL。

## GitHub Pages 部署

仓库已包含 `.github/workflows/deploy.yml`。推送到 `main` 或 `master` 后，GitHub Actions 会执行：

```bash
npm ci
npm run build
```

构建产物 `dist/` 会发布到 GitHub Pages。首次使用时，需要在 GitHub 仓库设置中启用 Pages，并将来源设为 GitHub Actions。

## 开发约束

后续开发请先阅读 `AGENTS.md`。第一版默认中文 UI，主状态使用笛卡尔分量 `x/y/z`，不引入后端或大型 UI 框架。
