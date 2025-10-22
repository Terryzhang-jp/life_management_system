# 🚨 安全事件报告：Google API Key 泄露

**创建时间**: 2025-10-22
**严重程度**: 🔴 高危
**状态**: 已识别，待修复

---

## 📊 问题概述

**泄露的API Key**: `AIzaSyDmDHk_Ep3NAFn8QrvIIvuNHT2xP-8YAkU`

### 泄露位置
- **文件**: `test-gemini.mjs` (第4行)
- **提交**: `5aa76b3` - "feat: 重大功能更新 - Quest系统、生活记录、语音识别等"
- **时间**: 最近的推送
- **仓库**: GitHub - Terryzhang-jp/life_management_system

---

## 🔍 详细分析

### 1. 泄露的代码
```javascript
// test-gemini.mjs (第4行)
const apiKey = 'AIzaSyDmDHk_Ep3NAFn8QrvIIvuNHT2xP-8YAkU';  // ❌ 硬编码
```

### 2. Git历史确认
```bash
$ git show 5aa76b3:test-gemini.mjs
# 确认：API Key 已经被推送到 GitHub
```

### 3. 影响范围
- ✅ **.env.local 配置正确** - 已在 .gitignore 中排除
- ✅ **其他测试文件安全** - test-google-search.js 使用环境变量
- ❌ **test-gemini.mjs 硬编码** - 已被推送到公开仓库

---

## ⚠️ 安全风险

### 高风险
1. **API Key 已公开** - 任何人都可以在 GitHub 上看到
2. **可能被滥用** - 他人可以使用此 Key 调用 Google Gemini API
3. **费用风险** - 可能产生意外的 API 使用费用
4. **配额消耗** - 可能耗尽你的 API 配额

### 潜在后果
- 💰 **财务损失** - 恶意使用可能产生大量费用
- 📊 **配额耗尽** - 影响你的正常开发和使用
- 🔒 **账户安全** - Google 可能检测到异常使用并封锁账户

---

## 🛠️ 紧急修复方案

### 第一步：立即撤销泄露的API Key ⏰ 立即执行

1. **访问 Google AI Studio**
   - 前往：https://aistudio.google.com/app/apikey
   - 登录你的 Google 账户

2. **撤销旧Key**
   - 找到 Key：`AIzaSyDmDHk_Ep3NAFn8QrvIIvuNHT2xP-8YAkU`
   - 点击"Delete"或"Revoke"按钮
   - 确认删除

3. **生成新Key**
   - 点击"Create API Key"
   - 保存新的 Key（不要分享！）

### 第二步：修复代码 🔧

#### 2.1 删除硬编码的API Key
```bash
# 删除 test-gemini.mjs 文件（建议）
rm test-gemini.mjs

# 或者修改为使用环境变量
```

#### 2.2 修改文件内容（如果保留）
```javascript
// test-gemini.mjs - 修复后
import { google } from '@ai-sdk/google';
import { streamText } from 'ai';

// ✅ 从环境变量读取
const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

if (!apiKey) {
  console.error('❌ 缺少 GOOGLE_GENERATIVE_AI_API_KEY 环境变量');
  console.error('请在 .env.local 文件中设置');
  process.exit(1);
}

// ... 其余代码
```

#### 2.3 更新 .env.local
```bash
# .env.local
GOOGLE_GENERATIVE_AI_API_KEY=your_new_api_key_here
```

### 第三步：清理Git历史 🧹

⚠️ **警告**: 这会重写 Git 历史，需要强制推送！

#### 选项A: 使用 git-filter-repo（推荐）
```bash
# 安装 git-filter-repo
pip install git-filter-repo

# 删除包含敏感信息的文件
git filter-repo --invert-paths --path test-gemini.mjs

# 强制推送
git push origin --force --all
```

#### 选项B: 使用 BFG Repo-Cleaner（更快）
```bash
# 下载 BFG
# https://rtyley.github.io/bfg-repo-cleaner/

# 删除敏感文件
java -jar bfg.jar --delete-files test-gemini.mjs

# 清理和压缩
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# 强制推送
git push origin --force --all
```

#### 选项C: 简单方案（如果提交很新）
```bash
# 1. 删除文件
rm test-gemini.mjs
git add test-gemini.mjs
git commit -m "security: 删除包含泄露API Key的测试文件"

# 2. 重置到泄露之前的提交（如果可能）
git reset --hard <commit_before_leak>
git push origin --force

# 3. 重新应用其他改动（手动）
```

### 第四步：更新 .gitignore 📝

确保所有测试文件都被忽略：

```bash
# .gitignore
# 添加以下规则
test-*.mjs
test-*.js
*.test.js
*.test.mjs
```

### 第五步：通知 GitHub 🔔

虽然你删除了文件，但 GitHub 可能已经缓存：

1. **联系 GitHub Support**
   - 访问：https://support.github.com/
   - 报告泄露的 API Key
   - 请求清除缓存

2. **使用 GitHub 的密钥扫描报告**
   - 访问：https://github.com/settings/security_analysis
   - 查看是否有警告

---

## ✅ 验证清单

执行完修复后，确认以下项：

- [ ] 旧 API Key 已在 Google AI Studio 中撤销
- [ ] 生成了新的 API Key
- [ ] 新 Key 已添加到 .env.local
- [ ] test-gemini.mjs 已删除或修复
- [ ] Git 历史已清理（没有硬编码的 Key）
- [ ] .gitignore 已更新
- [ ] 代码推送到 GitHub（强制推送）
- [ ] 测试应用功能正常
- [ ] 监控 API 使用情况（几天内）

---

## 📚 预防措施

### 1. 代码审查规则
- ❌ 永远不要硬编码 API Keys
- ✅ 始终使用环境变量
- ✅ 使用 .env.local (已在 .gitignore 中)

### 2. Git Hooks（建议）
安装 pre-commit hook 检查敏感信息：

```bash
# 安装 pre-commit
pip install pre-commit

# 创建 .pre-commit-config.yaml
cat > .pre-commit-config.yaml <<EOF
repos:
  - repo: https://github.com/Yelp/detect-secrets
    rev: v1.4.0
    hooks:
      - id: detect-secrets
        args: ['--baseline', '.secrets.baseline']
EOF

# 安装 hooks
pre-commit install
```

### 3. GitHub 密钥扫描
启用 GitHub 的密钥扫描功能：
- 前往：Settings → Security → Code security and analysis
- 启用：Secret scanning

### 4. 环境变量最佳实践
```javascript
// ✅ 正确方式
const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

if (!apiKey) {
  throw new Error('Missing GOOGLE_GENERATIVE_AI_API_KEY');
}

// ❌ 错误方式
const apiKey = 'AIzaSy...';  // 永远不要这样做！
```

---

## 📞 紧急联系

如果发现 API 被滥用：

1. **Google Cloud Console**
   - https://console.cloud.google.com/
   - 查看 API 使用情况
   - 设置预算警报

2. **Google Support**
   - https://support.google.com/

---

## 📊 执行命令汇总

```bash
# 1. 删除泄露的文件
rm test-gemini.mjs

# 2. 更新 .gitignore
echo "test-*.mjs" >> .gitignore
echo "test-*.js" >> .gitignore

# 3. 提交修复
git add .gitignore test-gemini.mjs
git commit -m "security: 删除泄露API Key的测试文件并更新.gitignore"

# 4. 清理Git历史（选择一种方法）
# 方法A: git-filter-repo
git filter-repo --invert-paths --path test-gemini.mjs

# 方法B: BFG
java -jar bfg.jar --delete-files test-gemini.mjs
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# 5. 强制推送
git push origin --force --all
git push origin --force --tags
```

---

## 🎓 经验教训

1. **测试文件也要审查** - 不要认为测试文件不重要
2. **使用环境变量** - 即使是临时测试，也要使用 .env.local
3. **提交前检查** - 养成 `git diff` 的习惯
4. **自动化检查** - 使用 pre-commit hooks
5. **定期审计** - 定期检查代码中的敏感信息

---

**最后更新**: 2025-10-22
**处理状态**: ⚠️ 待用户执行修复步骤
