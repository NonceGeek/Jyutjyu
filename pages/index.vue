<template>
  <div class="min-h-screen bg-gradient-to-b from-blue-50 to-white" style="color-scheme: light; background-color: #ffffff;">
    <!-- Hero Section -->
    <div class="container mx-auto px-4 py-16 md:py-24">
      <!-- Logo & Title -->
      <div class="text-center mb-12">
        <h1 class="text-4xl md:text-6xl font-bold text-gray-900 mb-4">
          粤语辞丛
        </h1>
        <h2 class="text-xl md:text-2xl text-gray-600 mb-2">
          The Jyut Collection
        </h2>
        <p class="text-base md:text-lg text-gray-500">
          开放的粤语词典聚合平台
        </p>
      </div>

      <!-- Search Bar -->
      <div class="max-w-3xl mx-auto mb-12">
        <div class="relative">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="搜索词语或粤拼..."
            class="w-full px-6 py-4 text-lg border-2 border-gray-300 rounded-full focus:outline-none focus:border-blue-500 shadow-lg"
            @keyup.enter="handleSearch"
          >
          <button
            class="absolute right-3 top-1/2 -translate-y-1/2 px-6 py-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors"
            @click="handleSearch"
          >
            搜索
          </button>
        </div>
        <div class="mt-4 text-sm text-gray-500 text-center">
          支持繁简体、粤拼搜索，如：<span class="text-blue-600 cursor-pointer hover:underline" @click="searchExample('阿Sir')">阿Sir</span>、
          <span class="text-blue-600 cursor-pointer hover:underline" @click="searchExample('aa3 soe4')">aa3 soe4</span>
        </div>
      </div>

      <!-- Features -->
      <div class="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto mb-16">
        <div class="text-center p-6 bg-white rounded-lg shadow-md">
          <div class="text-4xl mb-4">🔍</div>
          <h3 class="text-xl font-semibold mb-2">智能搜索</h3>
          <p class="text-gray-600">支持繁简体、粤拼、多音字、模糊匹配</p>
        </div>
        <div class="text-center p-6 bg-white rounded-lg shadow-md">
          <div class="text-4xl mb-4">📚</div>
          <h3 class="text-xl font-semibold mb-2">多词典聚合</h3>
          <p class="text-gray-600">统一查询不同来源和结构的词典</p>
        </div>
        <div class="text-center p-6 bg-white rounded-lg shadow-md">
          <div class="text-4xl mb-4">📱</div>
          <h3 class="text-xl font-semibold mb-2">多端适配</h3>
          <p class="text-gray-600">手机、平板、电脑完美显示</p>
        </div>
      </div>

      <!-- Dictionary Status -->
      <div class="max-w-3xl mx-auto bg-white rounded-lg shadow-md p-8">
        <h3 class="text-2xl font-semibold mb-6 text-center">收录词典</h3>
        <div v-if="dictionariesData" class="space-y-4">
          <div 
            v-for="dict in dictionariesData.dictionaries" 
            :key="dict.id"
            class="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
          >
            <div>
              <h4 class="font-semibold text-lg">{{ dict.name }}</h4>
              <p class="text-sm text-gray-600">
                {{ dict.author }} · {{ dict.publisher }} · {{ dict.year }}
              </p>
              <p v-if="dict.description" class="text-xs text-gray-500 mt-1">
                {{ dict.description }}
              </p>
            </div>
            <span 
              :class="{
                'bg-green-100 text-green-800': dict.entries_count > 0,
                'bg-yellow-100 text-yellow-800': dict.entries_count === 0
              }"
              class="px-4 py-1 rounded-full text-sm"
            >
              {{ dict.entries_count > 0 ? `${dict.entries_count.toLocaleString()} 条` : '数据整理中' }}
            </span>
          </div>
        </div>
        <div class="mt-6 text-center text-gray-500 text-sm">
          更多词典陆续上架...
        </div>
      </div>

      <!-- Call to Action -->
      <div class="mt-16 text-center">
        <h3 class="text-2xl font-semibold mb-4">参与贡献</h3>
        <p class="text-gray-600 mb-6">
          这是一个开源项目，欢迎贡献数据、代码或建议
        </p>
        <div class="flex gap-4 justify-center">
          <a
            href="https://github.com/jyutjyucom/jyutjyu"
            target="_blank"
            class="px-6 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            GitHub
          </a>
          <a
            href="https://github.com/jyutjyucom/jyutjyu/blob/main/docs/CSV_GUIDE.md"
            target="_blank"
            class="px-6 py-3 border-2 border-gray-900 text-gray-900 rounded-lg hover:bg-gray-50 transition-colors"
          >
            贡献数据
          </a>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <footer class="border-t border-gray-200 py-8 mt-16">
      <div class="container mx-auto px-4 text-center text-gray-600 text-sm">
        <p class="mb-2">
          粤语辞丛 © 2025 · 开源于
          <a href="https://github.com/jyutjyucom/jyutjyu" class="text-blue-600 hover:underline" target="_blank">
            GitHub
          </a>
        </p>
        <p>为粤语文化保育与传承贡献力量</p>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import dictionariesIndex from '~/content/dictionaries/index.json'

const searchQuery = ref('')
const router = useRouter()
const dictionariesData = ref(dictionariesIndex)

const handleSearch = () => {
  if (searchQuery.value.trim()) {
    router.push(`/search?q=${encodeURIComponent(searchQuery.value)}`)
  }
}

const searchExample = (query: string) => {
  searchQuery.value = query
  handleSearch()
}

// SEO
useHead({
  title: '粤语辞丛 | The Jyut Collection - 开放的粤语词典聚合平台',
  meta: [
    {
      name: 'description',
      content: '粤语辞丛是一个开放的粤语词典聚合平台，支持多词典统一查询、粤拼搜索，为粤语学习者和研究者提供便捷的工具。'
    }
  ]
})
</script>

