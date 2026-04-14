// src/layouts/AuthLayout.jsx
import React from 'react';

const AuthLayout = ({ children }) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-tr from-blue-100 via-purple-100 to-white dark:from-gray-800 dark:to-gray-900">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 shadow-md rounded-md p-6">
        {children}
      </div>
    </div>
  );
};

export default AuthLayout;
