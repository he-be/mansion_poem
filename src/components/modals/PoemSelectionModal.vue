<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="isOpen" class="modal-overlay" @click="handleClose">
        <div
          class="modal-content"
          @click.stop
          role="dialog"
          aria-modal="true"
          :aria-label="`${conditionCard?.condition_text}のポエムを選択`"
        >
          <div class="modal-header">
            <h2 class="modal-title">ポエムを選んでください</h2>
            <button class="modal-close" @click="handleClose" aria-label="閉じる">×</button>
          </div>

          <div v-if="conditionCard" class="modal-body">
            <div class="condition-info">
              <span class="condition-category">{{ conditionCard.category }}</span>
              <p class="condition-text">{{ conditionCard.condition_text }}</p>
            </div>

            <div class="poem-options">
              <PoemCard
                v-for="poem in conditionCard.poems"
                :key="poem.id"
                :poem="poem"
                @click="handlePoemSelected(poem.id)"
              />
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import type { ConditionCard } from '@/types/card'
import PoemCard from '@/components/cards/PoemCard.vue'

interface Props {
  isOpen: boolean
  conditionCard: ConditionCard | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
  close: []
  'poem-selected': [poemId: string]
}>()

const handleClose = () => {
  emit('close')
}

const handlePoemSelected = (poemId: string) => {
  emit('poem-selected', poemId)
  handleClose()
}

// Escキーで閉じる
const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && props.isOpen) {
    handleClose()
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.modal-content {
  background: white;
  border-radius: 16px;
  max-width: 600px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid #e2e8f0;
}

.modal-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: #2d3748;
  margin: 0;
}

.modal-close {
  background: none;
  border: none;
  font-size: 2rem;
  cursor: pointer;
  color: #718096;
  padding: 0;
  width: 2rem;
  height: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.2s;
}

.modal-close:hover {
  color: #2d3748;
}

.modal-body {
  padding: 1.5rem;
}

.condition-info {
  margin-bottom: 1.5rem;
  padding: 1rem;
  background-color: #f7fafc;
  border-radius: 8px;
}

.condition-category {
  font-size: 0.875rem;
  font-weight: 600;
  color: #718096;
  text-transform: uppercase;
}

.condition-text {
  font-size: 1.1rem;
  font-weight: 500;
  color: #2d3748;
  margin: 0.5rem 0 0 0;
}

.poem-options {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

/* トランジション */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .modal-content,
.modal-leave-active .modal-content {
  transition: transform 0.3s ease;
}

.modal-enter-from .modal-content,
.modal-leave-to .modal-content {
  transform: scale(0.9);
}

@media (max-width: 768px) {
  .modal-content {
    max-width: 100%;
    margin: 1rem;
  }

  .modal-header {
    padding: 1rem;
  }

  .modal-title {
    font-size: 1.25rem;
  }

  .modal-body {
    padding: 1rem;
  }
}
</style>
