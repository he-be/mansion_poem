import type { ConditionCard, PoemOption, SelectedPair } from '@/types/card'

/**
 * テスト用のモックPoemOptionを生成
 */
export function createMockPoem(overrides?: Partial<PoemOption>): PoemOption {
  return {
    id: 'poem-001-a',
    poem_text: '静寂に包まれた、都会のオアシス。',
    ...overrides,
  }
}

/**
 * テスト用のモックConditionCardを生成
 */
export function createMockConditionCard(overrides?: Partial<ConditionCard>): ConditionCard {
  const defaultPoems = [
    createMockPoem({ id: 'poem-001-a', poem_text: 'ポエムA' }),
    createMockPoem({ id: 'poem-001-b', poem_text: 'ポエムB' }),
    createMockPoem({ id: 'poem-001-c', poem_text: 'ポエムC' }),
  ]

  return {
    id: 'condition-001',
    category: '周辺環境',
    condition_text: '駅から徒歩15分',
    strength: -3,
    poems: defaultPoems,
    ...overrides,
  }
}

/**
 * テスト用のモックSelectedPairを生成
 */
export function createMockSelectedPair(overrides?: Partial<SelectedPair>): SelectedPair {
  return {
    conditionCard: createMockConditionCard(),
    selectedPoem: createMockPoem(),
    ...overrides,
  }
}

/**
 * 完全なゲーム状態（5つの選択ペア）を生成
 */
export function createMockGameState(): {
  selectedPairs: SelectedPair[]
  generatedTitle: string
  generatedPoem: string
} {
  const selectedPairs: SelectedPair[] = [
    createMockSelectedPair({
      conditionCard: createMockConditionCard({
        id: 'condition-001',
        category: '周辺環境',
        condition_text: '駅から徒歩15分',
      }),
      selectedPoem: createMockPoem({
        id: 'poem-001-a',
        poem_text: '都会の喧騒から、ほど良い距離。',
      }),
    }),
    createMockSelectedPair({
      conditionCard: createMockConditionCard({
        id: 'condition-002',
        category: '交通アクセス',
        condition_text: '最寄り駅まで遠い',
      }),
      selectedPoem: createMockPoem({
        id: 'poem-002-b',
        poem_text: '静寂が、日常になる場所。',
      }),
    }),
    createMockSelectedPair({
      conditionCard: createMockConditionCard({
        id: 'condition-003',
        category: '室内・仕様',
        condition_text: '収納が少ない',
      }),
      selectedPoem: createMockPoem({
        id: 'poem-003-c',
        poem_text: 'ミニマリストのための、洗練された空間。',
      }),
    }),
    createMockSelectedPair({
      conditionCard: createMockConditionCard({
        id: 'condition-004',
        category: '眺望・日照',
        condition_text: '北向き',
      }),
      selectedPoem: createMockPoem({
        id: 'poem-004-a',
        poem_text: '柔らかな光が、一日を包む。',
      }),
    }),
    createMockSelectedPair({
      conditionCard: createMockConditionCard({
        id: 'condition-005',
        category: '立地・アドレス',
        condition_text: '繁華街に近い',
      }),
      selectedPoem: createMockPoem({
        id: 'poem-005-b',
        poem_text: '都市の鼓動を、すぐそばに感じる。',
      }),
    }),
  ]

  return {
    selectedPairs,
    generatedTitle: '都会の喧騒から、ほど良い距離。',
    generatedPoem: `この地に立つとき、都市の鼓動を感じながらも、静寂が包み込む。
駅から続く道のりが、日常と非日常を繋ぐ回廊となる。

柔らかな光が室内を満たし、時の移ろいを優しく告げる。
選ばれたものだけが知る、洗練された暮らしがここにある。

都会の中心でありながら、心に余白を持つ日々。
これは、新しい物語の始まり。`,
  }
}
