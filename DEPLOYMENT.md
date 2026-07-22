# AI Chat Web 版本部署指南

## 概述

AI Chat 现在支持 Web 版本，可以部署到任何静态网站托管服务，分享给你的朋友使用。

## 功能特性

- ✅ 完整的 AI 对话功能
- ✅ 角色管理系统
- ✅ 自定义壁纸
- ✅ 美观的玻璃拟态 UI
- ✅ 数据存储在浏览器 localStorage 中
- ✅ 响应式设计

## 构建步骤

### 1. 构建 Web 版本

```bash
npm run build:web
```

构建完成后，静态文件将生成在 `dist/web` 目录中。

### 2. 本地测试构建结果

你可以使用任何静态文件服务器来测试构建结果：

```bash
# 使用 Python
cd dist/web
python -m http.server 8000

# 或使用 Node.js 的 serve
npx serve dist/web
```

## 部署选项

### 选项 1: Vercel (推荐)

Vercel 是一个免费的静态网站托管服务，部署非常简单。

1. **安装 Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **部署**
   ```bash
   cd dist/web
   vercel
   ```

3. 按照提示操作，Vercel 会自动部署并提供一个 HTTPS 链接。

### 选项 2: Netlify

Netlify 也是一个优秀的静态网站托管服务。

1. **安装 Netlify CLI**
   ```bash
   npm install -g netlify-cli
   ```

2. **部署**
   ```bash
   cd dist/web
   netlify deploy --prod
   ```

### 选项 3: GitHub Pages

如果你有 GitHub 账号，可以使用 GitHub Pages 免费托管。

1. 创建一个新的 GitHub 仓库
2. 将 `dist/web` 目录的内容推送到仓库
3. 在仓库设置中启用 GitHub Pages
4. 选择 `main` 分支作为源

### 选项 4: 自有服务器

如果你有自己的服务器，可以使用 Nginx 或 Apache 部署。

#### Nginx 配置示例

```nginx
server {
    listen 80;
    server_name your-domain.com;

    root /path/to/dist/web;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

## 注意事项

### 数据存储

- Web 版本使用浏览器 localStorage 存储数据
- 数据存储在用户的浏览器中，不会上传到服务器
- 清除浏览器缓存会丢失所有数据
- 不同浏览器/设备之间数据不共享

### API Key 安全

- 用户需要在设置中配置自己的 OpenAI API Key
- API Key 存储在用户的浏览器 localStorage 中
- 不会发送到你的服务器，相对安全
- 建议提醒用户使用有使用限制的 API Key

### CORS 问题

- OpenAI API 可能会有 CORS 限制
- 如果遇到 CORS 问题，用户可能需要配置代理服务器
- 或者使用支持 CORS 的 OpenAI 兼容 API

## 自定义域名

如果你使用 Vercel 或 Netlify，可以很容易地绑定自定义域名：

1. 在域名提供商处添加 CNAME 记录
2. 在托管平台的设置中添加域名
3. 等待 DNS 生效

## 性能优化

- 构建后的文件已经过压缩和优化
- 使用了现代的构建工具，加载速度很快
- 建议启用 CDN 加速

## 更新部署

当你更新应用后：

1. 重新构建：`npm run build:web`
2. 重新部署到你的托管平台
3. 用户刷新页面即可获得更新

## 故障排除

### 构建失败

确保安装了所有依赖：
```bash
npm install
```

### 部署后页面空白

检查浏览器控制台是否有错误，可能是：
- 路由配置问题
- API 调用失败
- CORS 问题

### API Key 不工作

- 确认 API Key 格式正确
- 检查 API Key 是否有足够的余额
- 确认 API Base URL 配置正确

## 技术支持

如果遇到问题，请检查：
1. 浏览器控制台错误信息
2. 网络请求是否正常
3. localStorage 是否可用

## 许可证

请根据你的需求选择合适的开源许可证。
