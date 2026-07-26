import React from 'react';
import { AuthContainer } from './AuthContainer';

export const Login: React.FC = () => {
  return <AuthContainer initialMode="login" />;
};

export default Login;
