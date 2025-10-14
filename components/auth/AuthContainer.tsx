'use client';

import { useState } from 'react';
import { AuthForm } from './AuthForm';

export function AuthContainer() {
  const [authType, setAuthType] = useState<'login' | 'register'>('login');

  const toggleAuthType = () => {
    setAuthType(current => current === 'login' ? 'register' : 'login');
  };

  return (
    <AuthForm 
      type={authType} 
      onToggle={toggleAuthType} 
    />
  );
}