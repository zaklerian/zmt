import { EntityTableRecognizer } from './recognizer.model';

export interface RecognizerRegistry {
  recognize: (filePath: string) => EntityTableRecognizer | null;
  register: (recognizer: EntityTableRecognizer) => void;
}

export function createRecognizerRegistry(): RecognizerRegistry {
  const recognizers: EntityTableRecognizer[] = [];

  return {
    recognize: (filePath) =>
      recognizers.find((recognizer) => recognizer.matches(filePath)) ?? null,
    register: (recognizer) => {
      recognizers.push(recognizer);
    },
  };
}

export const recognizerRegistry = createRecognizerRegistry();
