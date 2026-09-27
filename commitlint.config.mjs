import { ZMT_PLUGIN } from './tools/commitlint-plugin/index.ts';

export default {
  plugins: [ZMT_PLUGIN],
  rules: {
    'zmt/body-shape': [2, 'always'],
    'zmt/body-symbols': [2, 'always'],
    'zmt/ticket-header': [2, 'always'],
  },
};
