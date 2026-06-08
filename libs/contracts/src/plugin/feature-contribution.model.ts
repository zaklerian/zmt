import { FeatureId } from './feature-id.const';

export interface FeatureContribution {
  readonly enabled: boolean;
  readonly featureId: FeatureId;
  readonly label: string;
}
