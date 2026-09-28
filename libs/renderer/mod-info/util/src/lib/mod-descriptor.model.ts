export interface ModDescriptorValues {
  readonly name: string;
  readonly path: string;
  readonly picture: string;
  readonly supportedVersion: string;
  readonly tags: readonly string[];
  readonly version: string;
}

export interface ParserWarning {
  readonly from: number;
  readonly message: string;
  readonly to: number;
}

export const DESCRIPTOR_FILENAME = 'descriptor.mod';

export const DESCRIPTOR_EXTENSION = '.mod';
