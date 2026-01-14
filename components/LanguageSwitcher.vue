<template>
  <div class="flex items-center gap-2">
    <span class="text-sm text-gray-500">
      {{ t('common.languageSwitcherLabel') }}
    </span>
    <select
      v-model="currentLocale"
      class="text-sm border border-gray-300 rounded-md px-2 py-1 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
    >
      <option
        v-for="locale in locales"
        :key="locale.code"
        :value="locale.code"
      >
        {{ localeLabel(locale.code) }}
      </option>
    </select>
  </div>
</template>

<script setup lang="ts">
const { locale, locales, t, setLocale } = useI18n()

const currentLocale = computed({
  get: () => locale.value,
  set: async (value: string) => {
    await setLocale(value)
  }
})

const localeLabel = (code: string) => {
  switch (code) {
    case 'zh-Hans':
      return t('common.langZhHans')
    case 'zh-Hant':
      return t('common.langZhHant')
    case 'yue-Hans':
      return t('common.langYueHans')
    case 'yue-Hant':
      return t('common.langYueHant')
    default:
      return code
  }
}
</script>

