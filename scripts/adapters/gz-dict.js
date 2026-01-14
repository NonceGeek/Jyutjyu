/**
 * 《广州话词典（第2版）》数据适配器
 *
 * 原始 CSV 格式:
 * index, entry_type, headword, pronunciation, jyutping, definition, page, source_file
 *
 * 特点:
 * - pronunciation 为原书拼音标注
 * - jyutping 为转换后的粤拼（用于词典展示和搜索优化）
 * - definition 常见结构：词性/说明 + ❶❷ 多义项 + 冒号后的例句（用 | 分隔），例句翻译用 〔〕
 *
 * 数据处理规则:
 * - 忽略 entry_type、source_file 字段（不写入 metadata）
 */

import { generateKeywords, cleanHeadword } from '../utils/text-processor.js'

/**
 * 词典元数据
 */
export const DICTIONARY_INFO = {
  id: 'gz-dict',
  name: '广州话词典（第2版）',
  dialect: {
    name: '广州话',
    region_code: 'GZ'
  },
  source_book: '广州话词典（第2版）',
  author: '饶秉才、欧阳觉亚、周无忌',
  publisher: '广东人民出版社',
  year: 2020,
  version: new Date().toISOString().slice(0, 10),
  description: '系统收录广州话词汇，包含释义、读音与用例。',
  source: 'scanned_from_internet',
  license: 'Copyrighted. For technical demonstration only.',
  usage_restriction:
    '此词表内容受版权保护，来源于互联网公开扫描资源，仅用于本项目原型验证和技术演示，不得用于商业用途或二次分发。',
  attribution: '《广州话词典（第2版）》，饶秉才、欧阳觉亚、周无忌编，广东人民出版社，2020年版'
}

/**
 * 必填字段验证
 */
export const REQUIRED_FIELDS = ['index', 'headword', 'jyutping', 'definition']

/**
 * 猜测词条类型（character/word/phrase）
 * @param {string} word - 词头（normalized）
 */
function guessEntryType(word) {
  const chineseChars = word?.match(/[\u4e00-\u9fa5]/g) || []
  const length = chineseChars.length

  if (length === 0) return 'word' // 外来词或符号
  if (length === 1) return 'character'
  if (length <= 4) return 'word'
  return 'phrase'
}

/**
 * 解析释义中的多义项（❶❷❸… 或 ①②③…）和例句
 * @param {string} definition - 释义文本
 * @returns {Array<Object>} senses
 */
function parseSenses(definition) {
  if (!definition || !definition.trim()) {
    return [{ definition: '', examples: [] }]
  }

  const text = definition.trim()

  // 支持两种编号：❶❷❸… 以及 ①②③…
  const markerPattern = /[❶❷❸❹❺❻❼❽❾❿①②③④⑤⑥⑦⑧⑨⑩]/g
  const matches = [...text.matchAll(markerPattern)]

  if (matches.length === 0) {
    return parseExamplesInSenseText(text)
  }

  const senses = []
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index + 1
    const end = i < matches.length - 1 ? matches[i + 1].index : text.length
    const senseText = text.substring(start, end).trim()
    if (!senseText) continue
    senses.push(...parseExamplesInSenseText(senseText))
  }

  return senses.length > 0 ? senses : [{ definition: text, examples: [] }]
}

/**
 * 从单个义项文本中提取释义与例句
 * - 例句通常以冒号分隔：释义: 例句1〔翻译〕 | 例句2〔翻译〕
 * - 例句分隔符兼容：| ｜ 丨
 * - 翻译括号兼容：〔〕 或 ［］
 * @param {string} text
 */
function parseExamplesInSenseText(text) {
  if (!text || !text.trim()) return [{ definition: '', examples: [] }]

  const sense = { definition: '', examples: [] }

  const exampleSplit = text.split(/[:：]/)
  if (exampleSplit.length > 1) {
    sense.definition = exampleSplit[0].trim()

    const exampleText = exampleSplit.slice(1).join('：').trim()
    const exampleParts = exampleText
      .split(/[丨｜|]/)
      .map(part => part.trim())
      .filter(Boolean)

    exampleParts.forEach(part => {
      const parsed = parseExampleWithTranslation(part)
      if (parsed.text || parsed.translation) {
        sense.examples.push(parsed)
      }
    })
  } else {
    sense.definition = text.trim()
  }

  return [sense]
}

function parseExampleWithTranslation(part) {
  if (!part) return { text: '' }

  // 〔译文〕 或 ［译文］
  const bracketMatch = part.match(/(?:〔([^〕]+)〕|［([^］]+)］)/)
  if (bracketMatch) {
    const translation = (bracketMatch[1] || bracketMatch[2] || '').trim()
    const text = part.replace(/〔[^〕]+〕|［[^］]+］/, '').trim()
    return translation
      ? { text, translation }
      : { text }
  }

  return { text: part.trim() }
}

/**
 * 转换单个 CSV 行为标准 DictionaryEntry
 * @param {Object} row - CSV 行数据
 * @returns {Object} DictionaryEntry
 */
export function transformRow(row) {
  // 1. 清理词头
  const headwordInfo = cleanHeadword(row.headword)

  // 2. 处理粤拼（已是转换后的格式）
  const jyutpingArray = row.jyutping
    ? row.jyutping
        .split(/[,;/]/)
        .map(j => j.trim())
        .filter(Boolean)
    : []

  // 3. 解析释义（多义项+例句）
  const senses = parseSenses(row.definition)

  // 4. 构建标准词条
  const entry = {
    id: `${DICTIONARY_INFO.id}_${String(row.index).padStart(6, '0')}`,
    source_book: DICTIONARY_INFO.source_book,
    source_id: String(row.index),

    dialect: DICTIONARY_INFO.dialect,

    headword: {
      display: row.headword,
      search: headwordInfo.normalized,
      normalized: headwordInfo.normalized,
      is_placeholder: headwordInfo.isPlaceholder || false
    },

    phonetic: {
      original: row.pronunciation || '', // 原书拼音
      jyutping: jyutpingArray // 转换后的粤拼
    },

    entry_type: guessEntryType(headwordInfo.normalized),

    senses,

    meta: {
      page: row.page || null
      // 注：entry_type, source_file 字段按要求忽略，不写入 metadata
    },

    created_at: new Date().toISOString()
  }

  // 5. 生成搜索关键词
  entry.keywords = generateKeywords(entry)

  return entry
}

/**
 * 批量转换
 * @param {Array<Object>} rows - CSV 行数组
 * @returns {Object} { entries, errors }
 */
export function transformAll(rows) {
  const entries = []
  const errors = []

  rows.forEach((row, index) => {
    try {
      const entry = transformRow(row)
      entries.push(entry)
    } catch (error) {
      errors.push({
        row: index + 2, // +2 因为有表头且从1开始计数
        error: error.message,
        data: row
      })
    }
  })

  return { entries, errors }
}

/**
 * 特殊字段处理说明
 */
export const FIELD_NOTES = {
  headword: '词头，主词条',
  pronunciation: '原书拼音标注（保存到 phonetic.original）',
  jyutping: '转换后的粤拼（保存到 phonetic.jyutping，用于词典展示和搜索优化）',
  definition: '释义，可能包含多义项（❶❷❸ 或 ①②③）与例句；例句翻译常用〔〕表示',
  page: '词典页码',
  entry_type: '已忽略（不写入 metadata）',
  source_file: '已忽略（不写入 metadata）'
}

