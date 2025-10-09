export interface PoemOption {
  id: string;
  poem_text: string;
}

export interface ConditionCard {
  id: string;
  category: string;
  condition_text: string;
  strength: number; // -6 to +5: negative = weakness, positive = strength
  poems: PoemOption[];
}

export interface SelectedPair {
  conditionCard: ConditionCard;
  selectedPoem: PoemOption;
}

export interface GameState {
  currentPhase: 'start' | 'game' | 'result';
  dealtCards: ConditionCard[];
  selectedPairs: Record<string, SelectedPair>;
  generatedTitle: string;
  generatedPoem: string;
  isGeneratingPoem: boolean;
  poemGenerationError: string | null;
}
