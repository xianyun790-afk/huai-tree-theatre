# 槐树街小剧场 · 可玩试玩 v0.6

[公开试玩](https://xianyun790-afk.github.io/huai-tree-theatre/) · 无需安装，打开浏览器即可玩。

同一个 Blender 3D 街区，可以切换故事，也可以导入自己的 JSON 剧本。角色有骨骼、权重和 Idle / Walk / Talk / Point 动作。

## 直接玩

在上一级目录双击 `启动试玩.command`，或运行 `python3 scripts/serve.py`。使用已构建的 `dist/`，只需要 Python 3；保持终端打开。默认本机端口 5180，被占用时自动顺延。不能直接打开 `dist/index.html`，模型需要 HTTP 服务。

1. 选一集、填写称呼、点「开始这一集」。
2. 看左上角黄色按钮，点一下会自动走到下一处并互动。
3. 对话里选择行动；线索本记录已取得的信息。
4. 右上角「换剧本」切换或导入故事，各集进度独立保存。

地面点击行走；WASD / 方向键移动；E 键走向任务目标。黄圈表示你控制的角色。

## 当前三集

- **这房子怎么还会骂人？**：进客厅听电视、去厨房查购物袋、上楼比对照片，再到后院归还摆件。没有换身，两种结局。
- **换身事故**：只有你和老何换身。找实验记录和冒签报名表，说服老何，再换回自己。三种谈判结局。
- **谁偷了实验室的钥匙**：所有人身份不变。检查实验台和信箱，用证据问老爸，取回并归还钥匙。三种解释结局。

[剧本导入指南](./剧本导入指南-v0.6.md) 提供字段说明、操作步骤和范围限制。最小模板「午后快递」可在导入页直接填入、下载和试玩，文件也在 `examples/`。

浏览器保存剧本、当前选择和各集进度，包括当前对话。换浏览器、地址或端口会使用另一份存档。旧版换身事故进度迁移，旧存档保留。同 ID 内容更新使用独立版本存档；移出剧本库保留游戏进度。JSON 导出保存故事定义，不包含进度。没有云同步。

## 开发与复现

前端 Vite、React、TypeScript、Tailwind、Three.js；Node.js 22.13+。Blender 资产沿用当前绑定版本。

```sh
npm install
npm test
npm run build
npm run dev -- --port 5178
```

- `src/game/schema.ts`、`validate.ts`：声明式剧本格式、结构和引用检查。
- `src/game/stories/*.json`、`catalog.ts`：内置三集与最小模板。
- `src/game/story.ts`：通用条件、效果、任务、对话与结局推进。
- `src/game/World.ts`：GLB、骨骼动画、剧本演员安排、行走、镜头、标签与释放。
- `src/components/story/`：对白、线索本、剧本库、导入与预览。
- `src/lib/storage.ts`：按剧本与内容版本分开的进度、旧版迁移和自定义库。
- `public/models/`、`public/portraits/`：绑定资产及同源立绘。
- `scripts/serve.py`、`package_demo.py`：本机服务与打包。
- `review/`：实际浏览器检查截图，版本号区分历史版本。

重新生成模型与立绘，在上一级目录运行：

```sh
/Applications/Blender.app/Contents/MacOS/Blender -b -t 4 --python blender/scripts/rig_and_export.py
/Applications/Blender.app/Contents/MacOS/Blender -b -t 4 --python blender/scripts/render_portraits.py
```

## 目前范围

一个室外街区、客厅、厨房、楼上书房、后院，四个人物模型，固定编写的对白。房间采用蓝墙、紫色沙发、椭圆地毯和复古木家具，实时三渲二使用三档光照与深色轮廓。导入是结构化 JSON 数据，最多 200 KB / 10 个自定义剧本。复用现有舞台，不支持直接导入普通文字、新场景或执行脚本。

模型是基础卡通造型，腿部使用两骨混合，其他部件以单骨权重为主；尚无面部骨骼、口型、手指、足部 IK、复杂抓取、自定义外观和声音。四个空间通过门切换，室内行走限制在前方空地。还没有连续上下楼、真实抓取和自由摆放家具。

## 验证

14 项自动检查覆盖：全部内置故事和模板的每个结局可达且任务齐全、证据门槛与问错重试、双人关系、异常导入、独立存档与版本、旧存档迁移、导航，以及 GLB 蒙皮和四段动作。类型检查和生产构建通过，Three.js 主包仍有体积提示。

真实浏览器中验证找钥匙全程、错误询问重试、剧本切换与继续、JSON 错误提示、模板导入及通关、刷新续玩，并检查桌面与手机尺寸布局。手机检查为桌面模拟，未在实体手机上测试。自定义导入仅检查结构，仍需作者试玩每个分支。

房间源文件：`../blender/haunted-house-interiors.blend`。生成脚本 `../blender/scripts/build_haunted_house.py`，物件立绘脚本 `render_house_props.py`；均在后台生成独立文件。实时三渲二由 `src/game/World.ts` 负责，Blender 预览保留平涂材质。

## GitHub Pages 发布

本仓库的 `docs/` 是可直接部署的静态构建，包含 3D 模型、图片和前端资源。GitHub Settings → Pages 选择 Deploy from a branch，分支 `main`、目录 `/docs`。后续修改运行：

```sh
npm test
npm run build:pages
```

然后提交源码与 `docs/` 并推送，GitHub Pages 会更新网页。资源路径兼容仓库子目录。所有进度只保存在访问者自己的浏览器中，不需要账号或服务器；本机旧端口的进度不会自动搬到公开地址。
