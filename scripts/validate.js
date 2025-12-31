#!/usr/bin/env node

/**
 * CSV 数据验证脚本
 * 
 * 用法:
 *   node scripts/validate.js data/processed/gz-practical.csv
 */

import fs from 'fs'
import { parseCSV } from './utils/csv-parser.js'

// 粤拼格式正则（音节 + 1-6 声调）
const JYUTPING_REGEX = /^[a-z]+[1-6](\s+[a-z]+[1-6])*$/

/**
 * 验证粤拼格式
 */
function validateJyutping(jyutping) {
  if (!jyutping) return { valid: false, message: '粤拼为空' }
  
  const syllables = jyutping.split(/[,;]/).map(s => s.trim())
  
  for (const syllable of syllables) {
    if (!JYUTPING_REGEX.test(syllable)) {
      return {
        valid: false,
        message: `粤拼格式错误: "${syllable}" (应为: aa3 soe4 格式)`
      }
    }
  }
  
  return { valid: true }
}

/**
 * 检查编码
 */
function checkEncoding(filePath) {
  const buffer = fs.readFileSync(filePath)
  const str = buffer.toString('utf-8')
  
  // 检查是否有乱码（常见乱码特征）
  const hasGarbled = str.includes('�') || str.includes('\ufffd')
  
  return {
    valid: !hasGarbled,
    encoding: 'utf-8',
    message: hasGarbled ? '文件可能不是 UTF-8 编码，或存在乱码' : 'UTF-8 编码正确'
  }
}

/**
 * 主验证函数
 */
async function validate(filePath) {
  console.log('🔍 开始验证...\n')
  console.log(`📄 文件: ${filePath}\n`)

  const errors = []
  const warnings = []
  let stats = {
    totalRows: 0,
    validRows: 0,
    emptyFields: 0,
    invalidJyutping: 0
  }

  try {
    // 1. 检查文件存在
    if (!fs.existsSync(filePath)) {
      console.error(`❌ 文件不存在: ${filePath}`)
      process.exit(1)
    }

    // 2. 检查编码
    console.log('⏳ 检查文件编码...')
    const encodingCheck = checkEncoding(filePath)
    if (encodingCheck.valid) {
      console.log(`✅ ${encodingCheck.message}\n`)
    } else {
      console.error(`❌ ${encodingCheck.message}\n`)
      errors.push({
        row: 0,
        field: 'file',
        type: 'encoding_error',
        message: encodingCheck.message
      })
    }

    // 3. 解析 CSV
    console.log('⏳ 解析 CSV...')
    const data = await parseCSV(filePath)
    stats.totalRows = data.length
    console.log(`✅ 成功读取 ${data.length} 行\n`)

    if (data.length === 0) {
      console.error('❌ CSV 文件为空')
      process.exit(1)
    }

    // 4. 检查列名
    console.log('⏳ 检查列结构...')
    const firstRow = data[0]
    const columns = Object.keys(firstRow)
    console.log(`   列数: ${columns.length}`)
    console.log(`   列名: ${columns.join(', ')}\n`)

    // 5. 逐行验证
    console.log('⏳ 验证数据...\n')
    
    data.forEach((row, index) => {
      const rowNum = index + 2 // +2 因为有表头，索引从0开始
      let rowValid = true

      // 5.1 检查必填字段
      const requiredFields = ['words', 'jyutping', 'meanings']
      requiredFields.forEach(field => {
        if (!row[field] || row[field].trim() === '') {
          errors.push({
            row: rowNum,
            field,
            type: 'missing_field',
            message: `必填字段 "${field}" 为空`
          })
          rowValid = false
          stats.emptyFields++
        }
      })

      // 5.2 验证粤拼格式
      if (row.jyutping) {
        const jpValidation = validateJyutping(row.jyutping)
        if (!jpValidation.valid) {
          errors.push({
            row: rowNum,
            field: 'jyutping',
            type: 'invalid_format',
            message: jpValidation.message
          })
          rowValid = false
          stats.invalidJyutping++
        }
      }

      // 5.3 检查开天窗字
      if (row.words && row.words.includes('□')) {
        warnings.push({
          row: rowNum,
          field: 'words',
          type: 'placeholder',
          message: '包含开天窗字 □'
        })
      }

      // 5.4 检查特殊标记
      if (row.words && row.words.startsWith('*')) {
        warnings.push({
          row: rowNum,
          field: 'words',
          type: 'marker',
          message: '包含特殊标记 *'
        })
      }

      if (rowValid) {
        stats.validRows++
      }
    })

    // 6. 输出结果
    console.log('\n' + '='.repeat(60))
    console.log('📊 验证结果:')
    console.log('='.repeat(60))
    console.log(`总行数:          ${stats.totalRows}`)
    console.log(`有效行数:        ${stats.validRows} (${(stats.validRows/stats.totalRows*100).toFixed(1)}%)`)
    console.log(`错误数:          ${errors.length}`)
    console.log(`警告数:          ${warnings.length}`)
    console.log(`空字段数:        ${stats.emptyFields}`)
    console.log(`粤拼格式错误:    ${stats.invalidJyutping}`)
    console.log('='.repeat(60))

    // 7. 显示错误详情
    if (errors.length > 0) {
      console.log('\n❌ 错误详情:')
      errors.slice(0, 10).forEach(err => {
        console.log(`   行 ${err.row}, 字段 "${err.field}": ${err.message}`)
      })
      if (errors.length > 10) {
        console.log(`   ... 还有 ${errors.length - 10} 个错误`)
      }
    }

    // 8. 显示警告详情
    if (warnings.length > 0) {
      console.log('\n⚠️  警告详情:')
      warnings.slice(0, 5).forEach(warn => {
        console.log(`   行 ${warn.row}, 字段 "${warn.field}": ${warn.message}`)
      })
      if (warnings.length > 5) {
        console.log(`   ... 还有 ${warnings.length - 5} 个警告`)
      }
    }

    // 9. 最终结论
    console.log('\n' + '='.repeat(60))
    if (errors.length === 0) {
      console.log('✅ 验证通过！数据可以用于转换。')
    } else {
      console.log('❌ 验证失败！请修复错误后再转换。')
    }
    console.log('='.repeat(60) + '\n')

    // 返回状态码
    process.exit(errors.length === 0 ? 0 : 1)

  } catch (error) {
    console.error('\n❌ 验证失败:', error.message)
    console.error(error.stack)
    process.exit(1)
  }
}

// 解析命令行参数
const args = process.argv.slice(2)

if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
  console.log(`
CSV 数据验证工具

用法:
  node scripts/validate.js <csv-file-path>

示例:
  node scripts/validate.js data/processed/gz-practical.csv
  `)
  process.exit(0)
}

const filePath = args[0]
validate(filePath)

