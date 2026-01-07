/**
 * 词典数据查询 Composable
 * 封装 Nuxt Content API，提供统一的数据访问接口
 */

import type { DictionaryEntry, SearchOptions, SearchResult } from '~/types/dictionary'

// 全局缓存，在客户端持久化词典数据
let cachedEntries: DictionaryEntry[] | null = null
let cachePromise: Promise<DictionaryEntry[]> | null = null

// 分片缓存（用于大型词典）
interface ChunkCache {
  [initial: string]: DictionaryEntry[]
}
const chunkCache: ChunkCache = {}
let chunkManifest: any = null

/**
 * 词典数据管理
 */
export const useDictionary = () => {
  /**
   * 加载分片 manifest
   */
  const loadChunkManifest = async (dictId: string): Promise<any> => {
    // 只在客户端运行
    if (!process.client) {
      return null
    }
    
    try {
      const response = await fetch(`/dictionaries/${dictId}/manifest.json`)
      if (response.ok) {
        return await response.json()
      }
    } catch (error) {
      console.error(`加载 ${dictId} manifest 失败:`, error)
    }
    return null
  }

  /**
   * 根据查询词确定需要加载的分片
   * 
   * 策略说明：
   * - 分片按粤拼首字母存储（如 GDP 的粤拼 zi1，存在 z.json）
   * - 但用户可能按词头搜索（如搜索 "GDP"，首字母是 G）
   * - 因此需要智能加载多个可能的分片
   */
  const getRequiredChunks = (query: string, manifest: any): string[] => {
    if (!manifest || !manifest.chunks) return []
    
    const chunks = new Set<string>()
    const normalizedQuery = query.toLowerCase().trim()
    
    if (!normalizedQuery) return []
    
    const firstChar = normalizedQuery[0]
    const isLongQuery = normalizedQuery.length > 4
    
    // 检查是否为汉字
    const hasChineseChar = /[\u4e00-\u9fa5]/.test(normalizedQuery)
    
    // 策略1: 非常短的查询（1-2字符）或英文/数字查询 → 加载所有分片
    // 原因：不确定是按词头还是按拼音匹配，且数据量小
    if (normalizedQuery.length <= 2 || (!hasChineseChar && normalizedQuery.length <= 4)) {
      // 对于很短的查询，加载所有分片以确保找到结果
      Object.keys(manifest.chunks).forEach(initial => {
        chunks.add(initial)
      })
      return Array.from(chunks)
    }
    
    // 策略2: 中等长度的查询（3-4字符）→ 加载首字母相关的多个分片
    if (!isLongQuery) {
      // 添加查询词首字母对应的分片
      if (manifest.chunks[firstChar]) {
        chunks.add(firstChar)
      }
      
      // 如果是汉字查询，也尝试加载其他常见拼音首字母
      // （因为不同输入法可能有不同拼音）
      if (hasChineseChar) {
        // 加载一些常见的相关分片
        // 这是一个启发式策略，可以根据实际情况调整
        const relatedInitials = [firstChar]
        relatedInitials.forEach(initial => {
          if (manifest.chunks[initial]) {
            chunks.add(initial)
          }
        })
      }
      
      return Array.from(chunks)
    }
    
    // 策略3: 长查询（5+字符）→ 只加载首字母分片
    // 原因：长查询通常能精确匹配，不需要加载所有分片
    if (manifest.chunks[firstChar]) {
      chunks.add(firstChar)
    }
    
    return Array.from(chunks)
  }

  /**
   * 加载指定的分片
   */
  const loadChunks = async (dictId: string, chunks: string[]): Promise<DictionaryEntry[]> => {
    // 只在客户端运行
    if (!process.client) {
      return []
    }
    
    const entries: DictionaryEntry[] = []
    
    await Promise.all(
      chunks.map(async (chunk) => {
        // 检查缓存
        if (chunkCache[`${dictId}_${chunk}`]) {
          entries.push(...chunkCache[`${dictId}_${chunk}`])
          return
        }
        
        // 加载分片
        try {
          const response = await fetch(`/dictionaries/${dictId}/${chunk}.json`)
          if (response.ok) {
            const data = await response.json()
            if (Array.isArray(data)) {
              chunkCache[`${dictId}_${chunk}`] = data
              entries.push(...data)
            }
          }
        } catch (error) {
          console.error(`加载分片失败 ${dictId}/${chunk}.json:`, error)
        }
      })
    )
    
    return entries
  }

  /**
   * 获取所有词条（带缓存）
   * 注意：搜索功能只在客户端运行，不需要 SSR
   */
  const getAllEntries = async (): Promise<DictionaryEntry[]> => {
    // 只在客户端运行
    if (!process.client) {
      return []
    }
    
    // 如果已有缓存，直接返回
    if (cachedEntries) {
      return cachedEntries
    }
    
    // 如果正在加载中，等待加载完成
    if (cachePromise) {
      return cachePromise
    }
    
    // 开始加载数据
    cachePromise = (async () => {
      try {
        // 1. 先获取词典索引
        const indexResponse = await fetch('/dictionaries/index.json')
        if (!indexResponse.ok) {
          console.error('获取词典索引失败')
          return []
        }
        
        const indexData = await indexResponse.json()
        const dictionaries = indexData.dictionaries || []
        
        if (dictionaries.length === 0) {
          console.warn('词典索引为空')
          return []
        }
        
        // 2. 并行加载所有词典的数据
        const allEntries: DictionaryEntry[] = []
        
        await Promise.all(
          dictionaries.map(async (dict: any) => {
            try {
              // 检查是否为分片词典（wiktionary）
              if (dict.id === 'wiktionary-cantonese') {
                // 分片词典：不在这里加载，而是在搜索时按需加载
                console.log(`⏭️ 跳过分片词典: ${dict.id} (按需加载)`)
                return
              }
              
              // 普通词典：全量加载
              const response = await fetch(`/dictionaries/${dict.file}`)
              if (response.ok) {
                const data = await response.json()
                if (Array.isArray(data)) {
                  allEntries.push(...data)
                }
              } else {
                console.warn(`加载词典失败: ${dict.file}`)
              }
            } catch (error) {
              console.error(`加载词典 ${dict.file} 时出错:`, error)
            }
          })
        )
        
        // 缓存结果
        cachedEntries = allEntries
        console.log(`✅ 词典数据已加载并缓存: ${allEntries.length} 条`)
        return allEntries
      } catch (error) {
        console.error('获取词条失败:', error)
        return []
      } finally {
        cachePromise = null
      }
    })()
    
    return cachePromise
  }

  /**
   * 根据 ID 获取词条
   */
  const getEntryById = async (id: string): Promise<DictionaryEntry | null> => {
    try {
      const entries = await getAllEntries()
      return entries.find(e => e.id === id) || null
    } catch (error) {
      console.error('获取词条失败:', error)
      return null
    }
  }

  /**
   * 基础搜索（精确匹配，支持简繁体）
   * @param query 搜索关键词
   * @param limit 返回结果数量限制，默认100
   * @returns 匹配的词条数组，按相关度排序
   */
  const searchBasic = async (query: string, limit: number = 100): Promise<DictionaryEntry[]> => {
    // 只在客户端运行
    if (!process.client) {
      console.log('⏭️  服务器端跳过搜索')
      return []
    }
    
    if (!query || query.trim() === '') {
      return []
    }

    const normalizedQuery = query.trim().toLowerCase()
    
    // 获取简繁体转换器并确保已初始化
    const { toSimplified, toTraditional, ensureInitialized } = useChineseConverter()
    await ensureInitialized()
    
    // 生成搜索词的所有变体（原文、简体、繁体）
    const queryVariants = [
      normalizedQuery,
      toSimplified(normalizedQuery).toLowerCase(),
      toTraditional(normalizedQuery).toLowerCase()
    ].filter((v, i, arr) => arr.indexOf(v) === i) // 去重

    try {
      // 1. 获取基础词典数据（已缓存，不包含 wiktionary）
      const baseEntries = await getAllEntries()
      // 创建新数组，避免修改缓存
      const entries = [...baseEntries]
      
      // 2. 加载 wiktionary 分片数据
      if (!chunkManifest) {
        chunkManifest = await loadChunkManifest('wiktionary')
      }
      
      if (chunkManifest) {
        // 确定需要加载的分片
        const requiredChunks = getRequiredChunks(normalizedQuery, chunkManifest)
        
        if (requiredChunks.length > 0) {
          // 加载分片数据
          const wiktionaryEntries = await loadChunks('wiktionary', requiredChunks)
          entries.push(...wiktionaryEntries)
        }
      }
      
      /**
       * 计算次要排序分数（在相同优先级内使用）
       * 用于在两个词典的结果中进行更细致的排序
       */
      const calculateSecondaryScore = (entry: DictionaryEntry): number => {
        let score = 0
        
        // 1. 词条长度匹配度 (0-30分)
        // 越接近查询词长度的词条越相关
        const headwordLength = entry.headword.display.length
        const queryLength = normalizedQuery.length
        if (headwordLength === queryLength) {
          score += 30 // 长度完全匹配
        } else {
          // 长度差距越小，得分越高
          const lengthDiff = Math.abs(headwordLength - queryLength)
          score += Math.max(0, 30 - lengthDiff * 3)
        }
        
        // 2. 释义详细程度 (0-20分)
        // 释义越详细说明词条质量越高
        if (entry.senses && entry.senses.length > 0) {
          const firstSense = entry.senses[0]
          const definitionLength = firstSense.definition?.length || 0
          
          // 根据释义长度给分
          if (definitionLength > 50) {
            score += 20
          } else if (definitionLength > 20) {
            score += 15
          } else if (definitionLength > 0) {
            score += 10
          }
          
          // 有例句加分
          if (firstSense.examples && firstSense.examples.length > 0) {
            score += 5
          }
        }
        
        // 3. 词典来源权重 (0-10分)
        // 根据词典特点调整权重
        if (entry.source_book === '广州话俗语词典') {
          // 俗语词典收录的多为成语、俗语，通常更具特色
          score += 8
        } else if (entry.source_book === '实用广州话分类词典') {
          // 实用词典收录的词条更基础、更常用
          score += 10
        } else if (entry.source_book === '粵典 (words.hk)' || entry.source_book === '粵典') {
          // 粵典词条数量庞大，需要降低权重
          score += 4
        }
        
        return score
      }
      
      // 带优先级的过滤和评分
      const resultsWithPriority: Array<{entry: DictionaryEntry, priority: number, secondaryScore: number}> = []
      
      // 优化：边遍历边评分和筛选，避免处理所有数据
      for (const entry of entries) {
        let priority = 0
        
        const normalizedHeadword = entry.headword.normalized?.toLowerCase() || ''
        const displayHeadword = entry.headword.display?.toLowerCase() || ''
        
        // 生成词条的所有变体（用于词头匹配）
        const headwordVariants = [
          normalizedHeadword,
          displayHeadword,
          toSimplified(normalizedHeadword).toLowerCase(),
          toSimplified(displayHeadword).toLowerCase(),
          toTraditional(normalizedHeadword).toLowerCase(),
          toTraditional(displayHeadword).toLowerCase()
        ].filter((v, i, arr) => arr.indexOf(v) === i) // 去重
        
        // 1. 完全匹配词头 - 最高优先级
        const exactMatch = queryVariants.some(qv => 
          headwordVariants.some(hv => hv === qv)
        )
        if (exactMatch) {
          priority = 100
        }
        // 2. 词头以搜索词开头
        else {
          const startsWithMatch = queryVariants.some(qv =>
            headwordVariants.some(hv => hv.startsWith(qv))
          )
          if (startsWithMatch) {
            priority = 90
          }
          // 3. 词头包含搜索词
          else {
            const includesMatch = queryVariants.some(qv =>
              headwordVariants.some(hv => hv.includes(qv))
            )
            if (includesMatch) {
              priority = 80
            }
          }
        }
        
        // 4. 粤拼完全匹配
        if (priority === 0 && entry.phonetic?.jyutping) {
          const exactJyutpingMatch = entry.phonetic.jyutping.some(jp =>
            queryVariants.includes(jp.toLowerCase())
          )
          if (exactJyutpingMatch) {
            priority = 70
          }
          // 5. 粤拼包含搜索词
          else {
            const partialJyutpingMatch = entry.phonetic.jyutping.some(jp =>
              queryVariants.some(qv => jp.toLowerCase().includes(qv))
            )
            if (partialJyutpingMatch) {
              priority = 60
            }
          }
        }
        
        // 6. 关键词匹配（支持简繁体）
        if (priority === 0 && entry.keywords) {
          const keywordMatch = entry.keywords.some(kw => {
            const kwLower = kw.toLowerCase()
            return queryVariants.some(qv => kwLower.includes(qv))
          })
          if (keywordMatch) {
            priority = 50
          }
        }
        
        // 7. 释义匹配（支持简繁体） - 最低优先级
        if (priority === 0 && entry.senses) {
          const definitionMatch = entry.senses.some(sense => {
            if (!sense.definition) return false
            const defVariants = [
              sense.definition.toLowerCase(),
              toSimplified(sense.definition).toLowerCase(),
              toTraditional(sense.definition).toLowerCase()
            ]
            return queryVariants.some(qv =>
              defVariants.some(dv => dv.includes(qv))
            )
          })
          if (definitionMatch) {
            priority = 40
          }
        }
        
        // 只保存有匹配的条目
        if (priority > 0) {
          resultsWithPriority.push({
            entry,
            priority,
            secondaryScore: calculateSecondaryScore(entry)
          })
        }
      }
      
      // 排序并限制返回数量
      resultsWithPriority.sort((a, b) => {
        // 先按主优先级降序排序
        if (a.priority !== b.priority) {
          return b.priority - a.priority
        }
        // 优先级相同时，按次要分数排序
        if (a.secondaryScore !== b.secondaryScore) {
          return b.secondaryScore - a.secondaryScore
        }
        // 次要分数也相同时，按ID排序（保持稳定排序）
        return a.entry.id.localeCompare(b.entry.id)
      })
      
      // 只返回前 limit 个结果
      return resultsWithPriority.slice(0, limit).map(item => item.entry)
    } catch (error) {
      console.error('搜索失败:', error)
      return []
    }
  }

  /**
   * 高级搜索（支持多种选项）
   * TODO: Phase 3 实现模糊搜索、权重排序
   */
  const searchAdvanced = async (options: SearchOptions): Promise<SearchResult[]> => {
    // 目前使用基础搜索
    const entries = await searchBasic(options.query)
    
    // 筛选方言
    let filteredEntries = entries
    if (options.dialect) {
      filteredEntries = entries.filter(e => 
        e.dialect.name === options.dialect
      )
    }
    
    // 筛选词典
    if (options.source_book) {
      filteredEntries = filteredEntries.filter(e => 
        e.source_book === options.source_book
      )
    }
    
    // 筛选词条类型
    if (options.entry_type) {
      filteredEntries = filteredEntries.filter(e => 
        e.entry_type === options.entry_type
      )
    }
    
    // 分页
    const page = options.page || 1
    const limit = options.limit || 20
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    const paginatedEntries = filteredEntries.slice(startIndex, endIndex)
    
    // 转换为 SearchResult
    const results: SearchResult[] = paginatedEntries.map(entry => ({
      entry,
      score: 1.0, // TODO: Phase 3 实现相关度评分
      match_fields: ['headword'] // TODO: Phase 3 记录匹配字段
    }))
    
    return results
  }

  /**
   * 获取词典列表
   */
  const getDictionaries = async () => {
    try {
      const index = await queryContent('dictionaries/index')
        .findOne()
      
      return index?.dictionaries || []
    } catch (error) {
      console.error('获取词典列表失败:', error)
      return []
    }
  }

  /**
   * 获取搜索建议（自动补全）
   * 限制返回数量以提高性能
   */
  const getSuggestions = async (query: string): Promise<string[]> => {
    if (!query || query.length < 2) {
      return []
    }

    // 只获取前10个搜索结果用于建议
    const entries = await searchBasic(query, 10)
    
    // 提取词头作为建议
    const suggestions = entries
      .map(e => e.headword.normalized)
      .filter((v, i, a) => a.indexOf(v) === i) // 去重
    
    return suggestions
  }

  /**
   * 获取热门词条
   * TODO: 未来可以基于访问统计
   */
  const getPopularEntries = async (limit: number = 10): Promise<DictionaryEntry[]> => {
    try {
      const entries = await getAllEntries()
      // 目前随机返回
      return entries.slice(0, limit)
    } catch (error) {
      console.error('获取热门词条失败:', error)
      return []
    }
  }

  return {
    getAllEntries,
    getEntryById,
    searchBasic,
    searchAdvanced,
    getDictionaries,
    getSuggestions,
    getPopularEntries
  }
}

