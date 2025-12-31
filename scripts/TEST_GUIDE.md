# 脚本测试指南

## 快速测试

### 1. 安装依赖

首先确保已安装项目依赖：

```bash
cd /Users/jyutjyucom/Projects/Jyutjyu
pnpm install
```

### 2. 测试验证脚本

验证示例 CSV 数据：

```bash
# 方式 1: 使用 npm 脚本
pnpm validate:gz

# 方式 2: 直接运行
node scripts/validate.js data/processed/gz-practical-sample.csv
```

**预期输出**:
```
🔍 开始验证...

📄 文件: data/processed/gz-practical-sample.csv

⏳ 检查文件编码...
✅ UTF-8 编码正确

⏳ 解析 CSV...
✅ 成功读取 8 行

⏳ 检查列结构...
   列数: 8
   列名: index, words, jyutping, meanings, note, category_1, category_2, category_3

⏳ 验证数据...

============================================================
📊 验证结果:
============================================================
总行数:          8
有效行数:        8 (100.0%)
错误数:          0
警告数:          2
空字段数:        0
粤拼格式错误:    0
============================================================

⚠️  警告详情:
   行 2, 字段 "words": 包含特殊标记 *

============================================================
✅ 验证通过！数据可以用于转换。
============================================================
```

### 3. 测试转换脚本

将 CSV 转换为 JSON：

```bash
# 方式 1: 使用 npm 脚本
pnpm build:data:gz

# 方式 2: 直接运行
node scripts/csv-to-json.js \
  --dict gz-practical-classified \
  --input data/processed/gz-practical-sample.csv
```

**预期输出**:
```
🚀 开始转换...

📖 词典: gz-practical-classified
📄 输入: data/processed/gz-practical-sample.csv

⏳ 加载适配器...
✅ 适配器加载成功: 实用广州话分类词典

⏳ 读取 CSV 文件...
✅ 读取成功: 8 行

⏳ 验证数据...
✅ 验证通过

⏳ 转换数据格式...
✅ 成功转换 8 个词条

⏳ 聚合多义项...
✅ 聚合完成: 8 → 8 个词条

⏳ 写入 JSON 文件: content/dictionaries/gz-practical-classified.json
✅ 写入成功

⏳ 更新词典索引...
✅ 索引更新成功

==================================================
📊 转换统计:
==================================================
总行数:        8
验证错误:      0
转换错误:      0
成功词条:      8
输出文件:      content/dictionaries/gz-practical-classified.json
文件大小:      8.12 KB
==================================================

✅ 转换完成！
```

### 4. 查看生成的 JSON

```bash
# 使用 cat 查看
cat content/dictionaries/gz-practical-classified.json | head -50

# 或使用编辑器打开
code content/dictionaries/gz-practical-classified.json
```

**预期结构**:
```json
[
  {
    "id": "gz-practical-classified_000001",
    "source_book": "实用广州话分类词典",
    "source_id": "1",
    "dialect": {
      "name": "广州话",
      "region_code": "GZ"
    },
    "headword": {
      "display": "*哋1",
      "search": "哋",
      "normalized": "哋",
      "is_placeholder": false
    },
    "phonetic": {
      "original": "dei6",
      "jyutping": ["dei6"]
    },
    "entry_type": "character",
    "senses": [
      {
        "definition": "詞尾，表示人稱的複數",
        "examples": []
      }
    ],
    "meta": {
      "category": "一、人物 > 一A泛稱 > 一A1人稱、指代",
      "subcategories": ["一、人物", "一A泛稱", "一A1人稱、指代"],
      "notes": "普通話的"們"除用於人稱"我們、你們"等之外..."
    },
    "keywords": [
      "*哋1", "哋", "哋", "dei6", "dei", ...
    ],
    "created_at": "2025-12-31T..."
  },
  ...
]
```

---

## 详细测试场景

### 测试 1: 特殊标记处理

**CSV 行**:
```csv
1,*哋1,dei6,詞尾，表示人稱的複數。,...
```

**验证点**:
- [x] 星号 `*` 应被识别为特殊标记
- [x] 数字 `1` 应被去除
- [x] `normalized` 应为 `"哋"`
- [x] 验证脚本应产生警告

**测试命令**:
```bash
node scripts/validate.js data/processed/gz-practical-sample.csv | grep "特殊标记"
```

### 测试 2: 例句解析

**CSV 行**:
```csv
2,我哋,ngo5 dei6,我們；咱們。你哋去，～唔去。（你們去，我們不去。）...
```

**验证点**:
- [x] 释义应为 `"我們；咱們"`
- [x] 例句应被提取: `"你哋去，～唔去"`
- [x] 翻译应被提取: `"你們去，我們不去"`

**测试命令**:
```bash
node -e "
import('./scripts/utils/text-processor.js').then(m => {
  const result = m.parseExamples('我們；咱們。你哋去，～唔去。（你們去，我們不去。）');
  console.log(JSON.stringify(result, null, 2));
});
"
```

### 测试 3: 分类处理

**CSV 行**:
```csv
1,...,一、人物,一A泛稱,一A1人稱、指代
```

**验证点**:
- [x] 三级分类应合并为路径
- [x] `category` 应为 `"一、人物 > 一A泛稱 > 一A1人稱、指代"`
- [x] `subcategories` 应包含三个元素

**测试命令**:
```bash
pnpm build:data:gz
grep -A 5 '"category"' content/dictionaries/gz-practical-classified.json | head -10
```

### 测试 4: 粤拼验证

**有效格式**:
```
✅ dei6
✅ ngo5 dei6
✅ aa3 soe4
```

**无效格式**:
```
❌ dei (缺少声调)
❌ dei7 (声调超出范围)
❌ DEI6 (大写)
```

**测试命令**:
```bash
# 创建测试文件
echo "index,words,jyutping,meanings
1,测试,dei,测试
2,测试2,dei7,测试
3,测试3,DEI6,测试" > /tmp/test-invalid.csv

# 运行验证
node scripts/validate.js /tmp/test-invalid.csv
```

### 测试 5: 繁简转换

**测试命令**:
```bash
node -e "
import('./scripts/utils/text-processor.js').then(m => {
  console.log('繁体:', '實用廣州話分類詞典');
  console.log('简体:', m.toSimplified('實用廣州話分類詞典'));
});
"
```

**预期输出**:
```
繁体: 實用廣州話分類詞典
简体: 实用广州话分类词典
```

---

## 性能测试

### 测试大文件处理

```bash
# 生成 1000 行测试数据
node -e "
const fs = require('fs');
const header = 'index,words,jyutping,meanings,note,category_1,category_2,category_3\n';
let rows = '';
for (let i = 1; i <= 1000; i++) {
  rows += \`\${i},测试\${i},ce5 si6,测试释义,,分类1,分类2,分类3\n\`;
}
fs.writeFileSync('data/processed/test-large.csv', header + rows);
console.log('✅ 生成 1000 行测试数据');
"

# 测试验证速度
time node scripts/validate.js data/processed/test-large.csv

# 测试转换速度
time node scripts/csv-to-json.js \
  --dict gz-practical-classified \
  --input data/processed/test-large.csv \
  --output content/dictionaries/test-large.json

# 清理
rm data/processed/test-large.csv content/dictionaries/test-large.json
```

---

## 错误场景测试

### 测试 1: 缺少必填字段

```bash
# 创建错误数据
echo "index,words,jyutping,meanings
1,测试,,缺少粤拼" > /tmp/test-missing.csv

# 运行验证（应失败）
node scripts/validate.js /tmp/test-missing.csv
# 预期: ❌ 验证失败
```

### 测试 2: 文件不存在

```bash
node scripts/validate.js /path/not/exist.csv
# 预期: ❌ 文件不存在
```

### 测试 3: 未知适配器

```bash
node scripts/csv-to-json.js \
  --dict unknown-dict \
  --input data/processed/gz-practical-sample.csv
# 预期: ❌ 未找到词典适配器
```

---

## 集成测试

### 完整流程测试

```bash
#!/bin/bash
echo "🧪 开始集成测试..."

# 1. 验证
echo "Step 1: 验证数据"
pnpm validate:gz
if [ $? -ne 0 ]; then
  echo "❌ 验证失败"
  exit 1
fi

# 2. 转换
echo "Step 2: 转换数据"
pnpm build:data:gz
if [ $? -ne 0 ]; then
  echo "❌ 转换失败"
  exit 1
fi

# 3. 检查输出
echo "Step 3: 检查输出文件"
if [ ! -f "content/dictionaries/gz-practical-classified.json" ]; then
  echo "❌ 输出文件不存在"
  exit 1
fi

# 4. 验证 JSON 格式
echo "Step 4: 验证 JSON 格式"
node -e "
const fs = require('fs');
const json = JSON.parse(fs.readFileSync('content/dictionaries/gz-practical-classified.json', 'utf-8'));
console.log('✅ JSON 格式正确, 词条数:', json.length);
"

# 5. 检查索引更新
echo "Step 5: 检查词典索引"
node -e "
const fs = require('fs');
const index = JSON.parse(fs.readFileSync('content/dictionaries/index.json', 'utf-8'));
const dict = index.dictionaries.find(d => d.id === 'gz-practical-classified');
console.log('✅ 索引已更新, 词条数:', dict.entries_count);
"

echo "✅ 集成测试通过！"
```

保存为 `scripts/test-integration.sh` 并运行：

```bash
chmod +x scripts/test-integration.sh
./scripts/test-integration.sh
```

---

## 常见问题排查

### 问题 1: `papaparse` not found

**解决**:
```bash
pnpm install papaparse
```

### 问题 2: `opencc-js` not found

**解决**:
```bash
pnpm install opencc-js
```

### 问题 3: CSV 编码问题

**检查编码**:
```bash
file -I data/processed/your-file.csv
```

**转换为 UTF-8**:
```bash
iconv -f GB2312 -t UTF-8 input.csv > output.csv
```

### 问题 4: JSON 文件过大

**解决**: 使用压缩（未来实现）
```bash
gzip content/dictionaries/large-dict.json
```

---

## 下一步

测试通过后，可以：

1. ✅ 使用真实的词典数据
2. ✅ 开发前端搜索功能（Phase 1 继续）
3. ✅ 为其他词典开发适配器

---

**需要帮助？** 查看 [scripts/adapters/README.md](./adapters/README.md)

