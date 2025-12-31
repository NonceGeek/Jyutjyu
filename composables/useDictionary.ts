/**
 * 词典数据查询 Composable
 * 封装 Nuxt Content API，提供统一的数据访问接口
 */

import type { DictionaryEntry, SearchOptions, SearchResult } from '~/types/dictionary'

/**
 * 词典数据管理
 */
export const useDictionary = () => {
  /**
   * 获取所有词条
   */
  const getAllEntries = async (): Promise<DictionaryEntry[]> => {
    try {
      // 直接读取 JSON 文件（因为 Nuxt Content 对数组的处理可能有问题）
      // 在浏览器端，我们使用 fetch API
      if (process.client) {
        const response = await fetch('/dictionaries/gz-practical-classified.json')
        if (response.ok) {
          const data = await response.json()
          return Array.isArray(data) ? data : []
        }
        return []
      }
      
      // 在服务端，使用 Nuxt Content
      const files = await queryContent('dictionaries')
        .where({ _extension: 'json', _path: { $ne: '/dictionaries/index' } })
        .find()
      
      // 读取每个 JSON 文件的内容
      const allEntries: DictionaryEntry[] = []
      for (const file of files) {
        try {
          // 使用 $fetch 读取文件内容
          const content = await $fetch(file._path + '.json')
          if (Array.isArray(content)) {
            allEntries.push(...content)
          }
        } catch (err) {
          console.warn(`读取文件失败: ${file._path}`, err)
        }
      }
      
      return allEntries
    } catch (error) {
      console.error('获取词条失败:', error)
      return []
    }
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
   * 基础搜索（精确匹配）
   * @param query 搜索关键词
   * @returns 匹配的词条数组
   */
  const searchBasic = async (query: string): Promise<DictionaryEntry[]> => {
    if (!query || query.trim() === '') {
      return []
    }

    const normalizedQuery = query.trim().toLowerCase()

    try {
      const entries = await getAllEntries()
      
      // 精确匹配：词头、粤拼、关键词
      return entries.filter(entry => {
        // 1. 匹配词头
        if (entry.headword.normalized?.toLowerCase().includes(normalizedQuery)) {
          return true
        }
        if (entry.headword.display?.toLowerCase().includes(normalizedQuery)) {
          return true
        }
        
        // 2. 匹配粤拼
        if (entry.phonetic?.jyutping) {
          const jyutpingMatch = entry.phonetic.jyutping.some(jp =>
            jp.toLowerCase().includes(normalizedQuery)
          )
          if (jyutpingMatch) return true
        }
        
        // 3. 匹配关键词
        if (entry.keywords) {
          const keywordMatch = entry.keywords.some(kw =>
            kw.toLowerCase().includes(normalizedQuery)
          )
          if (keywordMatch) return true
        }
        
        // 4. 匹配释义（权重较低）
        if (entry.senses) {
          const definitionMatch = entry.senses.some(sense =>
            sense.definition?.toLowerCase().includes(normalizedQuery)
          )
          if (definitionMatch) return true
        }
        
        return false
      })
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
   * TODO: Phase 3 实现
   */
  const getSuggestions = async (query: string): Promise<string[]> => {
    if (!query || query.length < 2) {
      return []
    }

    const entries = await searchBasic(query)
    
    // 提取词头作为建议
    const suggestions = entries
      .slice(0, 10) // 最多 10 个建议
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

