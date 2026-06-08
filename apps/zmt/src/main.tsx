import { StrictMode } from 'react';
import * as ReactDOM from 'react-dom/client';

import { ZmtApp } from './app';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement,
);

root.render(
  <StrictMode>
    <ZmtApp />
  </StrictMode>,
);
