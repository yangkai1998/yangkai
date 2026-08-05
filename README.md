# 拾光人物志

一个面向移动端传播的原创历史人物人格测试原型。用户通过 24 道情境题，获得历史人物映射、六维人格雷达图、解读建议与可保存的分享卡片。

## 本地运行

```bash
npm install
npm run dev
```

原型体验码为 `SHIGUANG`，也可以通过环境变量覆盖：

```bash
VITE_DEMO_ACCESS_CODE=YOUR_CODE npm run dev
```

## 验证

```bash
npm test
npm run test:e2e
npm run build
```

## 产品边界

当前体验码校验运行在浏览器端，只适合演示。正式销售时，必须由服务端完成卡密签发、核销、次数限制和日志记录，不能把有效卡密或管理员凭据打包进前端代码。

测试文案、人物解读、视觉设计和计分模型均为本项目原创实现。产品拆解与后续扩展建议见 [`docs/product-analysis.md`](docs/product-analysis.md)。
