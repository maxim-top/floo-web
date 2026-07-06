<template>
  <label :class="['language-switcher', compact ? 'language-switcher--compact' : '']">
    <span class="language-switcher__icon" aria-hidden="true">
      <svg viewBox="0 0 24 24">
        <path d="M4.5 18l3.2-12 3.2 12"></path>
        <path d="M5.8 13h3.8"></path>
        <path d="M13 7h7"></path>
        <path d="M16.5 7v3"></path>
        <path d="M14.2 11.5c.9 2.7 2.4 4.9 4.8 6.5"></path>
        <path d="M18.8 11.5c-.7 2.1-2.1 4.3-4.8 6.5"></path>
      </svg>
    </span>
    <div class="language-switcher__field">
      <select :value="currentLocale" @change="handleChange" class="language-switcher__select" :aria-label="$t('common.language')">
        <option :key="option.value" :value="option.value" v-for="option in languageOptions">
          {{ option.label }}
        </option>
      </select>
      <span class="language-switcher__caret" aria-hidden="true">
        <svg viewBox="0 0 24 24">
          <path d="M7 10l5 5 5-5"></path>
        </svg>
      </span>
    </div>
  </label>
</template>

<script>
import { LANGUAGE_OPTIONS } from '../../i18n';

export default {
  name: 'LanguageSwitcher',
  props: {
    compact: {
      type: Boolean,
      default: false
    }
  },
  computed: {
    currentLocale() {
      return this.$localeState.locale;
    },
    languageOptions() {
      return LANGUAGE_OPTIONS;
    }
  },
  methods: {
    handleChange(event) {
      const locale = event && event.target ? event.target.value : this.currentLocale;
      if (locale === this.currentLocale) {
        return;
      }
      this.$setLocale(locale);
      this.$emit('change', locale);
    }
  }
};
</script>

<style scoped>
.language-switcher {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 4px 6px 4px 4px;
  border: 1px solid rgba(98, 116, 156, 0.14);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 8px 20px rgba(15, 33, 63, 0.06);
  backdrop-filter: blur(8px);
}

.language-switcher__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 10px;
  background: #f1f5fb;
  color: #5a6c82;
  flex-shrink: 0;
}

.language-switcher__icon svg,
.language-switcher__caret svg {
  width: 16px;
  height: 16px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.language-switcher__field {
  position: relative;
  display: inline-flex;
  align-items: center;
}

.language-switcher__select {
  min-width: 112px;
  max-width: 132px;
  padding: 7px 26px 7px 8px;
  border: 0;
  background: transparent;
  color: #24344c;
  font-size: 13px;
  font-weight: 700;
  line-height: 1.2;
  appearance: none;
  -webkit-appearance: none;
  -moz-appearance: none;
  outline: none;
  cursor: pointer;
}

.language-switcher__caret {
  position: absolute;
  right: 6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #8190a3;
  pointer-events: none;
}

.language-switcher--compact {
  gap: 6px;
  padding: 3px 5px 3px 3px;
}

.language-switcher--compact .language-switcher__icon {
  width: 28px;
  height: 28px;
}

.language-switcher--compact .language-switcher__select {
  min-width: 104px;
  max-width: 122px;
  padding: 6px 24px 6px 6px;
  font-size: 12px;
}

@media (max-width: 768px) {
  .language-switcher {
    gap: 6px;
  }

  .language-switcher__select {
    min-width: 104px;
    max-width: 120px;
    font-size: 12px;
  }
}
</style>
