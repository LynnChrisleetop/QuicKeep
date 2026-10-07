# QuicKeep

QuicKeep 是一个 Edge Manifest V3 扩展，配合本地 Node.js 桥接服务，把当前网页截图和网址保存到 Obsidian Markdown 文件。

## 功能

- 截取当前标签页的网页可见区域并保存为 PNG。
- 保存当前网页网址。
- 按“图片在前、网址在后”的顺序追加到 Markdown 文件。
- 为一组 Markdown 路径和图片路径保存标签，之后从下拉框快速切换。
- 图片目录留空时，自动使用 Markdown 文件同目录下的 assets 文件夹。

## 工作逻辑

假设你选择的 Markdown 文件是：

~~~text
Notes/
├─ Inbox.md
└─ assets/
~~~

第一次保存时，QuicKeep 会自动创建 assets 文件夹，并把图片写入其中。Markdown 文件会追加类似内容：

~~~markdown
![页面标题](assets/20261007-120000-页面标题.png)
https://example.com/article
~~~

图片链接会根据 Markdown 文件所在目录自动生成相对路径，因此把 Markdown 文件和 assets 文件夹一起放在 Obsidian Vault 中即可正常使用。

如果你填写了自定义图片目录，图片会保存到指定目录，Markdown 中仍会写入相对于 Markdown 文件的图片路径。图片目录和 Markdown 文件夹不存在时会自动创建。

## 安装要求

- Microsoft Edge
- Node.js 18 或更高版本
- Windows、macOS 或 Linux 均可运行桥接服务；Windows 用户可以直接使用 start-quicKeep.cmd。

## 安装与启动

### 1. 获取项目

~~~powershell
git clone https://github.com/LynnChrisleetop/QuicKeep.git
cd QuicKeep
~~~

### 2. 启动本地桥接服务

Windows 用户可以双击项目根目录里的 start-quicKeep.cmd，并保持服务窗口开启。

也可以手动运行：

~~~powershell
node bridge/server.mjs
~~~

服务只监听本机地址：

~~~text
http://127.0.0.1:28765
~~~

### 3. 加载 Edge 扩展

1. 在 Edge 地址栏打开 edge://extensions。
2. 开启“开发人员模式”。
3. 点击“加载解压缩的扩展”。
4. 选择项目中的 extension 文件夹。

## 配置与使用

1. 点击 QuicKeep 扩展图标。
2. 在 Markdown 文件路径中填写一个绝对路径，例如：

   C:\Users\YourName\Documents\Notes\Inbox.md

3. 图片保存目录可以留空；留空时会使用 Markdown 文件同目录下的 assets 文件夹。也可以填写自定义目录。
4. 点击“保存当前路径”，在弹窗中输入一个标签名称并确认。
5. 以后从“路径配置”下拉框选择标签，路径会自动填入。
6. 点击“保存当前页面”。

标签配置保存在当前 Edge 用户配置的扩展本地存储中，不会上传到云端。删除标签只删除配置记录，不会删除已经保存的图片或 Markdown。

## 测试

项目不依赖额外的 npm 包。运行测试：

~~~powershell
cd QuicKeep/bridge
npm run test:fixture
~~~

测试会在项目的 tests 文件夹中生成测试 Markdown 和图片。也可以通过环境变量指定测试目录：

~~~powershell
$env:QUICKEEP_TEST_DIR = "C:\Temp\QuicKeepTests"
npm run test:fixture
~~~

## 限制

浏览器扩展只能截取当前标签页的网页可见区域，不能截取 Edge 的标签栏、地址栏、窗口边框或其他浏览器界面。

扩展不能直接写入任意本地路径，因此需要同时运行本地 bridge 服务。bridge 只监听 127.0.0.1，不接受局域网访问。