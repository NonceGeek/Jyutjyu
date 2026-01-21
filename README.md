# 粵語辭叢 (Jyutjyu)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> 開放粵語詞典聚合平台 | The Open Platform for Cantonese Dictionaries

## 📖 項目簡介

**粵語辭叢**（jyutjyu.com）係一個致力保存同傳播粵語文化嘅開放平台。我哋集合咗各類粵語詞典（分類、俗語、詞源等），為粵語學習者、愛好者同研究人員提供一個統一、方便嘅查詢入口。

### ✨ 核心功能

- 🔍 **智能搜尋**：支援繁簡轉換、粵拼、多音字、模糊匹配
- 📚 **多典聚合**：一次過查晒唔同來源、結構嘅詞典
- 📱 **響應式設計**：手機、電腦都睇得舒服
- 🚀 **雙存儲模式**：支援靜態 JSON（零成本）或 MongoDB（高性能）

## 📚 收錄詞典

目前已收錄多部珍貴詞典：

- ✅ **實用廣州話分類詞典**（7,549 條）
- ✅ **廣州話俗語詞典**（2,516 條）
- ✅ **廣州方言詞典**（7,461 條）
- ✅ **現代粵語詞典**（16,347 條）
- ✅ **廣州話詞典 (第2版)**（10,803 條）
- ✅ **粵典 (words.hk)**（59,019 條，社區協作）
- ✅ **Wiktionary Cantonese**（10萬+ 條，社區協作）
- ✅ **粵語辭源**（3,951 條）

## 📜 內容授權

本平台收錄嘅內容根據來源有唔同授權，請留意：

- **出版詞典**：如《實用廣州話分類詞典》、《廣州方言詞典》等，受著作權法保護，數據源於網絡公開資源，**僅供學術研究同技術演示，不可商用**。
- **粵典 (words.hk)**：採用 [Non-Commercial Open Data License 1.0](https://words.hk/base/hoifong/)，允許非商業使用。
- **Wiktionary**：採用 [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)，允許商用（需署名及相同方式分享）。
- **社區原創**：建議採用 [CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/deed.zh-hant)。

詳情請參閱 [貢獻指南](./CONTRIBUTING.md#內容授權政策)。

## 🛠 技術棧

- **框架**: [Nuxt 3](https://nuxt.com/) (Vue 3 + SSR)
- **UI**: [Tailwind CSS](https://tailwindcss.com/)
- **數據**: 靜態 JSON / [MongoDB Atlas](https://www.mongodb.com/atlas)
- **中文轉換**: [OpenCC.js](https://github.com/nk2028/opencc-js)
- **部署**: [Vercel](https://vercel.com/)

## 🚀 快速開始

### 環境要求

- Node.js >= 18.0.0

### 安裝與運行

```bash
# Clone repo
git clone https://github.com/jyutjyucom/jyutjyu.git
cd jyutjyu

# Install dependencies
npm install

# Start dev server
npm run dev
```

瀏覽 <http://localhost:3002>

### 數據存儲模式

1. **靜態 JSON (預設)**：適合小型項目或測試，無需數據庫，數據喺 `public/dictionaries/`。
2. **MongoDB (生產環境)**：適合大規模數據同高性能搜尋。配置 `.env` 啟用。

詳細配置見 [MongoDB 指南](./docs/MONGODB_SETUP.md)。

### 數據處理

```bash
# 驗證 CSV
npm run validate -- data/processed/your-file.csv

# 轉換為 JSON (通用)
npm run build:data -- --dict <dict-id> --input <file.csv>

# 常用快捷指令
npm run build:data:hkcw   # 粵典
npm run build:data:gzpc   # 分類詞典
```

更多資料：[Wiktionary 指南](./docs/WIKTIONARY_GUIDE.md) | [CSV 規範](./docs/CSV_GUIDE.md)

## 🤝 參與貢獻

歡迎大家幫手校對或提供詞典資料！

- [貢獻指南](./CONTRIBUTING.md)
- [CSV 錄入規範](./docs/CSV_GUIDE.md)

## 📄 許可證

- **代碼**: [MIT License](./LICENSE)
- **數據**: 見上文[內容授權](#-內容授權)

## 🙏 致謝

感謝所有為粵語文化保育做出貢獻嘅學者、編者同義工。

---

**網站**: <https://jyutjyu.com>  
**討論**: [GitHub Discussions](https://github.com/jyutjyucom/jyutjyu/discussions)  
**反饋**: [GitHub Issues](https://github.com/jyutjyucom/jyutjyu/issues)
