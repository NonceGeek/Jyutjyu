<template>
  <div class="bg-white rounded-lg shadow-lg p-6 w-full">
    <div class="flex items-center gap-3 mb-6">
      <div class="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
        <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      </div>
      <div>
        <h3 class="text-lg font-semibold text-gray-900">{{ t('feedback.title') }}</h3>
        <p class="text-sm text-gray-600">{{ t('feedback.subtitle') }}</p>
      </div>
    </div>

    <form @submit.prevent="submitFeedback" class="space-y-4">
      <!-- 反馈类型 -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">
          {{ t('feedback.type.label') }}
        </label>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <label
            v-for="type in feedbackTypes"
            :key="type.value"
            class="relative flex cursor-pointer rounded-lg border bg-white p-4 shadow-sm focus:outline-none"
            :class="feedbackType === type.value ? 'border-blue-600 ring-2 ring-blue-600' : 'border-gray-300'"
          >
            <input
              v-model="feedbackType"
              type="radio"
              :value="type.value"
              name="feedback-type"
              class="sr-only"
            >
            <span class="flex flex-1">
              <span class="flex flex-col">
                <span class="text-sm font-medium text-gray-900">{{ type.label }}</span>
                <span class="text-sm text-gray-500">{{ type.description }}</span>
              </span>
            </span>
            <svg
              v-if="feedbackType === type.value"
              class="h-5 w-5 text-blue-600"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
            </svg>
          </label>
        </div>
      </div>

      <!-- 标题 -->
      <div>
        <label for="title" class="block text-sm font-medium text-gray-700 mb-2">
          {{ t('feedback.titleField.label') }}
        </label>
        <input
          id="title"
          v-model="title"
          type="text"
          :placeholder="t('feedback.titleField.placeholder')"
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          required
        >
      </div>

      <!-- 描述 -->
      <div>
        <label for="description" class="block text-sm font-medium text-gray-700 mb-2">
          {{ t('feedback.description.label') }}
        </label>
        <textarea
          id="description"
          v-model="description"
          :placeholder="t('feedback.description.placeholder')"
          rows="4"
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-vertical"
          required
        ></textarea>
      </div>

      <!-- 词条相关信息（当反馈类型为词条错误时显示） -->
      <div v-if="feedbackType === 'entry-error'" class="space-y-3">
        <div>
          <label for="entry-word" class="block text-sm font-medium text-gray-700 mb-2">
            {{ t('feedback.entry.word.label') }}
          </label>
          <input
            id="entry-word"
            v-model="entryWord"
            type="text"
            :placeholder="t('feedback.entry.word.placeholder')"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
        </div>
        <div>
          <label for="entry-source" class="block text-sm font-medium text-gray-700 mb-2">
            {{ t('feedback.entry.source.label') }}
          </label>
          <select
            id="entry-source"
            v-model="entrySource"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">{{ t('feedback.entry.source.placeholder') }}</option>
            <option v-for="source in dictionarySources" :key="source.value" :value="source.value">
              {{ source.label }}
            </option>
          </select>
        </div>
      </div>

      <!-- 提交按钮 -->
      <div class="flex justify-end gap-3 pt-4">
        <button
          type="button"
          @click="$emit('close')"
          class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          {{ t('feedback.cancel') }}
        </button>
        <button
          type="submit"
          :disabled="isSubmitting"
          class="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <svg v-if="isSubmitting" class="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {{ isSubmitting ? t('feedback.submitting') : t('feedback.submit') }}
        </button>
      </div>
    </form>

    <!-- 成功提示 -->
    <div v-if="showSuccess" class="mt-4 p-4 bg-green-50 border border-green-200 rounded-md">
      <div class="flex">
        <svg class="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
        </svg>
        <div class="ml-3">
          <p class="text-sm font-medium text-green-800">{{ t('feedback.success.title') }}</p>
          <p class="text-sm text-green-700 mt-1">{{ t('feedback.success.message') }}</p>
        </div>
      </div>
    </div>

    <!-- 错误提示 -->
    <div v-if="errorMessage" class="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
      <div class="flex">
        <svg class="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
        </svg>
        <div class="ml-3">
          <p class="text-sm font-medium text-red-800">{{ t('feedback.error.title') }}</p>
          <p class="text-sm text-red-700 mt-1">{{ errorMessage }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { t } = useI18n()

// Props
interface Props {
  entryData?: {
    word: string
    source?: string
  }
  initialType?: 'bug' | 'feature' | 'entry-error'
}

const props = withDefaults(defineProps<Props>(), {
  entryData: undefined,
  initialType: undefined
})

interface DictionaryIndexItem {
  id: string
  name: string
}

interface DictionaryIndex {
  dictionaries: DictionaryIndexItem[]
}

const { data: dictIndex } = await useAsyncData<DictionaryIndex>('feedback-dictionaries', () =>
  $fetch('/dictionaries/index.json')
)

// Emits
const emit = defineEmits<{
  close: []
  submitted: []
}>()

// 反馈类型
const feedbackTypes = [
  {
    value: 'bug',
    label: t('feedback.type.bug'),
    description: t('feedback.type.bugDesc')
  },
  {
    value: 'feature',
    label: t('feedback.type.feature'),
    description: t('feedback.type.featureDesc')
  },
  {
    value: 'entry-error',
    label: t('feedback.type.entryError'),
    description: t('feedback.type.entryErrorDesc')
  }
]

// 词典来源（动态加载）
const dictionarySources = computed(() =>
  dictIndex.value?.dictionaries?.map((dict) => ({
    value: dict.id,
    label: dict.name
  })) ?? []
)

type FeedbackType = 'bug' | 'feature' | 'entry-error'

// 表单数据
const feedbackType = ref<FeedbackType>('bug')
const title = ref('')
const description = ref('')
const entryWord = ref(props.entryData?.word || '')
const entrySource = ref('')
const contact = ref('')

// 状态
const isSubmitting = ref(false)
const showSuccess = ref(false)
const errorMessage = ref('')

const normalizeEntrySource = (source?: string) => {
  if (!source) return ''
  const sources = dictionarySources.value
  // 若传入的是 value（dict id），直接返回
  if (sources.some((s) => s.value === source)) return source
  // 若传入的是 label（展示名），映射为 value
  const matched = sources.find((s) => s.label === source)
  return matched?.value || ''
}

// 初始化/同步：来自外部上下文时，默认切到“词条纠错”，并预填词语/来源
watchEffect(() => {
  if (props.initialType) {
    feedbackType.value = props.initialType
  } else if (props.entryData) {
    feedbackType.value = 'entry-error'
  }

  if (props.entryData?.word) entryWord.value = props.entryData.word
  entrySource.value = normalizeEntrySource(props.entryData?.source)
})

// 提交反馈
const submitFeedback = async () => {
  if (isSubmitting.value) return

  isSubmitting.value = true
  errorMessage.value = ''

  try {
    // 构建Issue内容
    const issueTitle = `[${feedbackType.value.toUpperCase()}] ${title.value}`
    const issueBody = buildIssueBody()

    // 这里可以调用GitHub API创建Issue
    // 由于前端无法直接调用GitHub API（需要token），我们使用一个简单的方案：
    // 生成预填充的GitHub Issue URL，让用户跳转

    const githubUrl = buildGitHubIssueUrl(issueTitle, issueBody)

    // 在新标签页打开GitHub Issue创建页面
    window.open(githubUrl, '_blank')

    showSuccess.value = true

    // 3秒后关闭
    setTimeout(() => {
      emit('close')
    }, 3000)

  } catch (error) {
    console.error('提交反馈失败:', error)
    errorMessage.value = t('feedback.error.submitFailed')
  } finally {
    isSubmitting.value = false
  }
}

// 构建Issue内容
const buildIssueBody = () => {
  const typeLabels: Record<string, string> = {
    bug: '🐛 Bug Report',
    feature: '✨ Feature Request',
    'entry-error': '📝 Entry Correction'
  }

  let body = `## ${typeLabels[feedbackType.value]}

**Description:**
${description.value}

`

  if (feedbackType.value === 'entry-error') {
    body += `**Entry Details:**
- Word: ${entryWord.value || 'N/A'}
- Source: ${entrySource.value || 'N/A'}

`
  }

  if (contact.value) {
    body += `**Contact:**
${contact.value}

`
  }

  body += `---
*Submitted via Jyutjyu feedback form*`

  return body
}

// 构建GitHub Issue URL
const buildGitHubIssueUrl = (title: string, body: string) => {
  const baseUrl = 'https://github.com/jyutjyucom/jyutjyu/issues/new'
  const params = new URLSearchParams({
    title: title,
    body: body,
    labels: feedbackType.value
  })

  return `${baseUrl}?${params.toString()}`
}
</script>