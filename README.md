# 拾光人物志

一个面向移动端传播的原创历史人物人格测试产品。用户通过 24 道情境题，获得历史人物映射、六维人格雷达图、解读建议与可保存的分享卡片。

## 本地运行

```bash
npm install
npm run dev
```

原型体验码为 `SHIGUANG`，也可以通过环境变量覆盖：

```bash
VITE_DEMO_ACCESS_CODE=YOUR_CODE npm run dev
```

`npm run dev` 只用于本地界面开发。生产构建默认启用服务端卡密核销，不接受演示码。

## 正式卡密系统

正式版使用 Cloudflare Pages Functions 与 Supabase，包含：

- 服务端卡密核销与安全 Cookie 会话；
- 可配置的有效天数、绑定设备数和测试次数；
- 完成次数原子扣减和重复提交保护；
- `/admin` 管理台批量生成、下载、启用和停用卡密；
- 数据库仅保存卡密哈希，不保存可还原的完整卡密。

完整配置、部署和首单交付流程见 [`docs/go-live-checklist.md`](docs/go-live-checklist.md)。

## 验证

```bash
npm test
npm run test:e2e
npm run build
```

## 产品边界

测试文案、人物解读、视觉设计和计分模型均为本项目原创实现。产品拆解与后续扩展建议见 [`docs/product-analysis.md`](docs/product-analysis.md)。
