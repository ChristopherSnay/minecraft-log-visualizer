// src/App.tsx
import { Box, createTheme, CssBaseline, ThemeProvider, Typography } from '@mui/material';
import React, { useMemo } from 'react';
import { Outlet } from 'react-router-dom';

import { StatsProvider, useStats } from './context/StatsContext';

const AppInner: React.FC = () => {
  const { stats } = useStats();

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: 'dark',
          primary: {
            main: '#1976d2'
          },
          success: {
            main: '#2e7d32'
          },
          warning: {
            main: '#f57c00'
          },
          error: {
            main: '#d32f2f'
          },
          background: {
            default: '#121212',
            paper: '#1e1e1e'
          }
        },
        components: {
          MuiLink: {
            defaultProps: {
              color: 'primary',
              underline: 'hover'
            }
          }
        },
        typography: {
          fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
          h6: {
            fontWeight: 600
          }
        }
      }),
    []
  );

  if (!stats) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '100vh'
          }}
        >
          <Typography>Loading…</Typography>
        </Box>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Outlet />
    </ThemeProvider>
  );
};

const App: React.FC = () => (
  <StatsProvider>
    <AppInner />
  </StatsProvider>
);

export default App;
