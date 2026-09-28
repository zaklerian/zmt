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

export const DESCRIPTOR_KEYS = {
  name: 'name',
  path: 'path',
  picture: 'picture',
  supportedVersion: 'supported_version',
  tags: 'tags',
  version: 'version',
} as const satisfies Record<keyof ModDescriptorValues, string>;

export const EMPTY_DESCRIPTOR_VALUES: ModDescriptorValues = {
  name: '',
  path: '',
  picture: '',
  supportedVersion: '',
  tags: [],
  version: '',
};

export interface DescriptorSpan {
  readonly from: number;
  readonly to: number;
}

export interface DescriptorScalar extends DescriptorSpan {
  readonly kind: 'scalar';
  readonly text: string;
}

export interface DescriptorList extends DescriptorSpan {
  readonly items: readonly DescriptorScalar[];
  readonly kind: 'list';
}

export type DescriptorValue = DescriptorList | DescriptorScalar;

export interface DescriptorStatement extends DescriptorSpan {
  readonly key: string;
  readonly value: DescriptorValue;
}

export interface DescriptorDocument {
  readonly source: string;
  readonly statements: readonly DescriptorStatement[];
  readonly warnings: readonly ParserWarning[];
}
