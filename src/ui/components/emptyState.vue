<template>
  <div :class="['ly-empty-state', { 'ly-empty-state--compact': compact }]">
    <div class="ly-empty-state__art" aria-hidden="true">
      <svg v-if="variant === 'chat'" viewBox="0 0 240 180" class="ly-empty-state__svg">
        <defs>
          <linearGradient id="chatGlow" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="rgba(51, 51, 204, 0.14)" />
            <stop offset="100%" stop-color="rgba(0, 200, 220, 0.1)" />
          </linearGradient>
        </defs>
        <circle cx="120" cy="90" r="72" fill="url(#chatGlow)" />
        <path d="M64 108c-10 0-18-8-18-18V72c0-10 8-18 18-18h68c10 0 18 8 18 18v18c0 10-8 18-18 18H96l-20 18v-18H64z" fill="#fff" stroke="#c1c6c8" stroke-width="4" />
        <path d="M144 90c18 0 32 13 32 29v8l-12-9h-22c-10 0-18-8-18-18v-1" fill="none" stroke="#3333cc" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />
        <path d="M74 80h48M74 94h34" fill="none" stroke="#c1c6c8" stroke-width="4" stroke-linecap="round" />
      </svg>
      <svg v-else-if="variant === 'conversation'" viewBox="0 0 180 160" class="ly-empty-state__svg ly-empty-state__svg--small">
        <rect x="32" y="32" width="116" height="86" rx="20" fill="#fff" stroke="#c1c6c8" stroke-width="4" />
        <path d="M58 62h64M58 80h44" fill="none" stroke="#c1c6c8" stroke-width="4" stroke-linecap="round" />
        <path d="M54 118l16-20h56l16 20" fill="none" stroke="#3333cc" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />
        <path d="M96 24v22M84 36h24" fill="none" stroke="#00c8dc" stroke-width="4" stroke-linecap="round" />
      </svg>
      <svg v-else-if="variant === 'contact'" viewBox="0 0 200 170" class="ly-empty-state__svg ly-empty-state__svg--small">
        <circle cx="58" cy="54" r="18" fill="#fff" stroke="#c1c6c8" stroke-width="4" />
        <circle cx="142" cy="48" r="18" fill="#fff" stroke="#c1c6c8" stroke-width="4" />
        <rect x="82" y="96" width="36" height="36" rx="12" fill="rgba(51, 51, 204, 0.08)" stroke="#3333cc" stroke-width="4" />
        <path d="M73 67l18 28M127 64l-16 29" fill="none" stroke="#c1c6c8" stroke-width="4" stroke-linecap="round" />
        <path d="M58 124c8-16 21-24 40-24M142 118c-7-14-18-20-34-20" fill="none" stroke="#00c8dc" stroke-width="4" stroke-linecap="round" />
      </svg>
      <svg v-else-if="variant === 'search'" viewBox="0 0 180 160" class="ly-empty-state__svg ly-empty-state__svg--small">
        <circle cx="78" cy="72" r="28" fill="#fff" stroke="#c1c6c8" stroke-width="4" />
        <path d="M98 92l24 24" fill="none" stroke="#3333cc" stroke-width="4" stroke-linecap="round" />
        <path
          d="M46 120c12-8 22-12 32-12 10 0 20 4 32 12M44 42c14-10 28-14 44-14 14 0 28 4 46 14"
          fill="none"
          stroke="#c1c6c8"
          stroke-width="4"
          stroke-linecap="round"
          stroke-dasharray="3 10"
        />
        <circle cx="78" cy="72" r="8" fill="rgba(51, 51, 204, 0.12)" />
      </svg>
    </div>
    <h2 class="ly-empty-state__title">{{ title }}</h2>
    <p class="ly-empty-state__description">{{ description }}</p>
    <button v-if="buttonText" class="ly-empty-state__button" type="button" @click="$emit('action')">{{ buttonText }}</button>
  </div>
</template>

<script>
export default {
  name: 'EmptyState',
  props: {
    variant: {
      type: String,
      default: 'chat'
    },
    title: {
      type: String,
      required: true
    },
    description: {
      type: String,
      required: true
    },
    buttonText: {
      type: String,
      default: ''
    },
    compact: {
      type: Boolean,
      default: false
    }
  }
};
</script>

<style scoped>
.ly-empty-state {
  width: 100%;
  height: 100%;
  min-height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px;
  box-sizing: border-box;
  text-align: center;
  background: var(--ly-bg-white);
}

.ly-empty-state--compact {
  height: auto;
  min-height: 220px;
  padding: 32px 24px;
  background: transparent;
}

.ly-empty-state__art {
  width: 100%;
  display: flex;
  justify-content: center;
  margin-bottom: 32px;
}

.ly-empty-state__svg {
  width: min(240px, 100%);
  height: auto;
}

.ly-empty-state__svg--small {
  width: min(180px, 100%);
}

.ly-empty-state__title {
  margin: 0 0 8px;
  color: var(--ly-text-dark);
  font-size: 20px;
  line-height: 1.3;
}

.ly-empty-state--compact .ly-empty-state__title {
  font-size: 18px;
}

.ly-empty-state__description {
  max-width: 320px;
  margin: 0;
  color: var(--ly-text-muted);
  font-size: 14px;
  line-height: 1.5;
}

.ly-empty-state__button {
  margin-top: 20px;
  min-height: 38px;
  padding: 0 16px;
  border: none;
  border-radius: 999px;
  background: var(--ly-primary);
  color: var(--ly-bg-white);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: transform var(--ly-transition-fast) var(--ly-ease-ios), box-shadow var(--ly-transition-fast) var(--ly-ease-fade);
}

.ly-empty-state__button:hover {
  box-shadow: 0 10px 20px rgba(19, 41, 75, 0.12);
  transform: translateY(-1px);
}

.ly-empty-state__button:active {
  transform: scale(0.98);
}
</style>
