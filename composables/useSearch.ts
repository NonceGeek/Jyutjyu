/**
 * 统一搜索入口
 * 根据配置自动选择使用 MongoDB API 或静态 JSON
 */

import type { DictionaryEntry } from '~/types/dictionary'

export interface SearchOptions {
  /** 返回结果数量限制 */
  limit?: number
  /** 是否搜索释义（反查） */
  searchDefinition?: boolean
  /** 流式结果回调 */
  onResults?: (entries: DictionaryEntry[], isComplete: boolean) => void
}

/**
 * 搜索结果缓存接口
 */
interface CachedSearchResult {
  /** 搜索结果 */
  results: DictionaryEntry[]
  /** 缓存时间戳 */
  timestamp: number
}

/**
 * 搜索缓存管理
 */
class SearchCache {
  private cache = new Map<string, CachedSearchResult>()
  private maxSize = 50 // 最大缓存50个搜索结果
  private maxAge = 30 * 60 * 1000 // 缓存30分钟

  /**
   * 生成缓存键
   */
  private generateKey(query: string, options: SearchOptions): string {
    const { limit = 100, searchDefinition = false } = options
    return `${query.trim().toLowerCase()}:${limit}:${searchDefinition ? 'reverse' : 'normal'}`
  }

  /**
   * 获取缓存
   */
  get(query: string, options: SearchOptions): DictionaryEntry[] | null {
    const key = this.generateKey(query, options)
    const cached = this.cache.get(key)

    if (!cached) {
      return null
    }

    // 检查是否过期
    const age = Date.now() - cached.timestamp
    if (age > this.maxAge) {
      this.cache.delete(key)
      return null
    }

    console.log(`✅ 使用缓存结果: "${query}" (${cached.results.length} 条)`)
    return cached.results
  }

  /**
   * 设置缓存
   */
  set(query: string, options: SearchOptions, results: DictionaryEntry[]): void {
    const key = this.generateKey(query, options)

    // 如果缓存已满,删除最旧的条目
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value
      if (firstKey) {
        this.cache.delete(firstKey)
      }
    }

    this.cache.set(key, {
      results,
      timestamp: Date.now()
    })

    console.log(`💾 缓存搜索结果: "${query}" (${results.length} 条)`)
  }

  /**
   * 清空缓存
   */
  clear(): void {
    this.cache.clear()
    console.log('🗑️ 清空搜索缓存')
  }

  /**
   * 获取缓存统计信息
   */
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      keys: Array.from(this.cache.keys())
    }
  }
}

// 全局缓存实例(在客户端持久化)
let searchCacheInstance: SearchCache | null = null

/**
 * 获取缓存实例
 */
const getSearchCache = (): SearchCache => {
  if (!searchCacheInstance) {
    searchCacheInstance = new SearchCache()
  }
  return searchCacheInstance
}

/**
 * 统一搜索 composable
 * - 当 NUXT_PUBLIC_USE_API=true 时使用 MongoDB API
 * - 否则使用静态 JSON 文件
 * - 自动缓存搜索结果,提升重复搜索性能
 */
export const useSearch = () => {
  const config = useRuntimeConfig()
  // 环境变量可能是字符串 'true' 或布尔值 true，使用 String() 统一处理
  const useApi = config.public.useApi === true || String(config.public.useApi) === 'true'
  
  // 根据配置选择实现
  const apiSearch = useApi ? useDictionaryAPI() : null
  const jsonSearch = !useApi ? useDictionary() : null
  
  // 获取缓存实例
  const cache = getSearchCache()
  
  /**
   * 搜索词条(带缓存)
   */
  const searchBasic = async (
    query: string,
    options: SearchOptions = {}
  ): Promise<DictionaryEntry[]> => {
    // 只在客户端使用缓存
    if (!process.client) {
      // 服务器端直接执行搜索
      if (useApi && apiSearch) {
        return apiSearch.searchBasic(query, {
          limit: options.limit,
          mode: options.searchDefinition ? 'reverse' : 'normal',
          onResults: options.onResults
        })
      } else if (jsonSearch) {
        return jsonSearch.searchBasic(query, options)
      }
      return []
    }

    // 检查缓存
    const cachedResults = cache.get(query, options)
    if (cachedResults) {
      // 如果有缓存,立即调用回调(模拟流式返回完成状态)
      if (options.onResults) {
        // 使用 setTimeout 确保异步行为一致
        setTimeout(() => {
          options.onResults!(cachedResults, true)
        }, 0)
      }
      return cachedResults
    }

    // 执行实际搜索
    let results: DictionaryEntry[] = []
    
    if (useApi && apiSearch) {
      // 使用 MongoDB API
      // 包装 onResults 回调,只缓存最终结果
      const wrappedOnResults = options.onResults 
        ? (entries: DictionaryEntry[], isComplete: boolean) => {
            if (isComplete) {
              results = entries
            }
            options.onResults!(entries, isComplete)
          }
        : undefined

      results = await apiSearch.searchBasic(query, {
        limit: options.limit,
        mode: options.searchDefinition ? 'reverse' : 'normal',
        onResults: wrappedOnResults
      })
    } else if (jsonSearch) {
      // 使用静态 JSON
      // 包装 onResults 回调,只缓存最终结果
      const wrappedOnResults = options.onResults
        ? (entries: DictionaryEntry[], isComplete: boolean) => {
            if (isComplete) {
              results = entries
            }
            options.onResults!(entries, isComplete)
          }
        : undefined

      results = await jsonSearch.searchBasic(query, {
        ...options,
        onResults: wrappedOnResults
      })
    }

    // 缓存结果(只缓存非空结果)
    if (results.length > 0) {
      cache.set(query, options, results)
    }

    return results
  }

  /**
   * 根据 ID 获取词条
   */
  const getEntryById = async (id: string): Promise<DictionaryEntry | null> => {
    if (useApi && apiSearch) {
      return apiSearch.getEntryById(id)
    } else if (jsonSearch) {
      return jsonSearch.getEntryById(id)
    }
    return null
  }

  /**
   * 获取搜索建议
   */
  const getSuggestions = async (query: string): Promise<string[]> => {
    if (useApi && apiSearch) {
      // API 模式：使用搜索结果的词头作为建议
      const results = await apiSearch.search(query, { limit: 10 })
      return results
        .map(e => e.headword.normalized)
        .filter((v, i, a) => a.indexOf(v) === i)
    } else if (jsonSearch) {
      return jsonSearch.getSuggestions(query)
    }
    return []
  }

  /**
   * 获取推荐词条
   */
  const getRandomRecommendedEntries = async (count: number = 3): Promise<DictionaryEntry[]> => {
    if (useApi && apiSearch) {
      return apiSearch.getRandomRecommendedEntries(count)
    } else if (jsonSearch) {
      return jsonSearch.getRandomRecommendedEntries(count)
    }
    return []
  }

  /**
   * 获取当前使用的模式
   */
  const getMode = () => useApi ? 'mongodb' : 'json'

  /**
   * 清空搜索缓存
   */
  const clearCache = () => {
    if (process.client) {
      cache.clear()
    }
  }

  /**
   * 获取缓存统计信息
   */
  const getCacheStats = () => {
    if (process.client) {
      return cache.getStats()
    }
    return { size: 0, maxSize: 0, keys: [] }
  }

  return {
    searchBasic,
    getEntryById,
    getSuggestions,
    getRandomRecommendedEntries,
    getMode,
    clearCache,
    getCacheStats
  }
}
