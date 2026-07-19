import { createBrowserRouter } from 'react-router-dom';
import App from './App';
import HomePage from './pages/HomePage';
import PlayerDetailPage from './pages/PlayerDetailPage';

const isDev = import.meta.env.MODE === 'development';
export const router = createBrowserRouter(
  [
    {
      path: '/',
      element: <App />,
      children: [
        { index: true, element: <HomePage /> },
        { path: 'player/:playerId', element: <PlayerDetailPage /> }
      ]
    }
  ],
  {
    basename: isDev ? '/' : '/minecraft-log-visualizer/'
  }
);
