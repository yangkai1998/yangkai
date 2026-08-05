# 正式上线与首单交付清单

## 1. 当前正式版能力

- 卡密只在服务端核验，数据库仅保存带密钥哈希；
- 一单一码，可配置绑定设备数、有效天数和完成测试次数；
- 使用 HttpOnly、Secure Cookie 保存会话，前端无法读取会话令牌；
- 测试完成时原子扣减次数，同一结果重复提交不会重复扣减；
- 管理台支持批量生成、CSV 下载、库存查看、启用和停用；
- 完整卡密只在生成时返回一次，之后只能看到末四位；
- 用户答案与联系方式不上送服务器，只记录结果人物和完成次数。

## 2. 创建 Supabase 数据库

1. 注册并创建一个 Supabase 项目；
2. 打开 SQL Editor；
3. 完整执行 `supabase/migrations/202608050001_access_system.sql`；
4. 在 Project Settings → API 记录：
   - Project URL；
   - `service_role` key。

`service_role` key 权限很高，只能作为 Cloudflare Secret 保存，不能写入前端环境变量、Git 或聊天记录。

## 3. 创建 Cloudflare Pages 项目

没有域名也可以先使用免费的 `*.pages.dev` 地址。

```bash
npm install
npx wrangler login
npx wrangler pages project create shiguang-persona
```

为 Pages 项目配置四项 Secret：

```bash
npx wrangler pages secret put SUPABASE_URL --project-name shiguang-persona
npx wrangler pages secret put SUPABASE_SERVICE_ROLE_KEY --project-name shiguang-persona
npx wrangler pages secret put CODE_PEPPER --project-name shiguang-persona
npx wrangler pages secret put ADMIN_API_TOKEN --project-name shiguang-persona
```

两个随机密钥分别生成，不要重复使用：

```bash
openssl rand -hex 32
```

部署：

```bash
npm run deploy
```

部署完成后会得到类似 `https://shiguang-persona.pages.dev` 的测试网址。

## 4. 本地联调正式接口

复制示例配置并填入本地测试值：

```bash
cp .dev.vars.example .dev.vars
npm run dev:edge
```

`.dev.vars` 已加入 Git 忽略列表，禁止提交。

## 5. 生成首批卡密

1. 访问 `https://你的网址/admin`；
2. 输入 `ADMIN_API_TOKEN`；
3. 第一批建议生成 20 条：
   - 绑定后有效：7 天；
   - 最多完成：3 次；
   - 最多绑定设备：1 台；
   - 批次标记：`XHS-FIRST-20`；
4. 立即下载 CSV，并保存在只有店主能访问的位置；
5. 用其中一条卡密走完一次真实测试，确认核销、结果保存和重测次数正确。

正式发货不要使用演示码 `SHIGUANG`。

## 6. 小红书首单手动交付

前期采用手动发货，避免自动化工具违反平台规则。每笔订单从 CSV 取一条未发出的卡密，在订单备注中记录对应末四位。

建议发货模板：

```text
感谢购买「拾光人物志」✨

测试网址：https://你的网址
专属卡密：SG-XXXX-XXXX

使用说明：
1. 打开网址并输入卡密；
2. 凭第一直觉完成 24 道题；
3. 结果页可以保存图片；
4. 卡密绑定后 7 天有效，最多完成 3 次测试。

如遇到无法打开或卡密异常，请携带订单截图联系售后。
```

## 7. 首单前必须完成

- 使用手机流量和 Wi-Fi 各测试一次；
- Android 微信内浏览器、iPhone Safari 各测试一次；
- 用错误卡密、已使用卡密和停用卡密分别测试提示；
- 确认管理台不能被普通卡密进入；
- 准备退款、卡密异常和更换设备三类售后话术；
- 商品页明确标注数字内容、使用期限、可测试次数及退款规则；
- 使用原创封面、题目与报告截图，不使用参考产品的品牌和素材；
- 文案注明“娱乐与自我探索用途，不构成心理或医学诊断”；
- 发布前重新核对小红书当时有效的虚拟商品与自动发货规则。

## 8. 规则如何修改

- 新卡密：在管理台生成时直接填写新规则；
- 单张卡密：后端支持修改状态、有效天数、完成次数、绑定设备数和截止时间；
- 已绑定会话：修改“最多完成次数”会即时生效；
- 有效期：修改统一截止时间会即时限制已有会话；修改“绑定后有效天数”只影响后续新绑定。

降低完成次数时，不应设为低于用户已经完成的次数。涉及已售订单的规则调整，应遵守商品页面对用户的原始承诺。
