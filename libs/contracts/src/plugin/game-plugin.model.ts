import { FeatureContribution } from './feature-contribution.model';
import { GameId } from './game-id.const';
import { ParserExtension } from './parser-extension.model';

export interface GamePlugin {
  readonly displayName: string;
  readonly features: readonly FeatureContribution[];
  readonly gameId: GameId;
  readonly modDescriptorSchemaExtension?: ModDescriptorSchemaExtension;
  readonly parserExtension?: ParserExtension;
}

export type ModDescriptorSchemaExtension = Readonly<Record<string, unknown>>;
