import '@mantine/core/styles.css';
import './styles.css';

import { MantineProvider, createTheme } from '@mantine/core';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

const theme = createTheme({
  fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
  headings: {
    fontFamily: '"Space Grotesk", Inter, ui-sans-serif, system-ui, sans-serif',
    fontWeight: '800'
  },
  primaryColor: 'pink',
  defaultRadius: 'sm'
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MantineProvider theme={theme}>
      <App />
    </MantineProvider>
  </StrictMode>
);
