import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AppProvider } from './app/context/AppContext';
import { AppRouter } from './app/router/AppRouter';
import { GOOGLE_CLIENT_ID } from './shared/config/constants';
import './shared/styles/index.css';

export const App: React.FC = () => {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <AppProvider>
        <BrowserRouter>
          <AppRouter />
        </BrowserRouter>
      </AppProvider>
    </GoogleOAuthProvider>
  );
};

export default App;
