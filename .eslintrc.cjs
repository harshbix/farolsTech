module.exports = {
  root: true,
  env: {
    browser: true,
    node: true,
    es2022: true,
  },
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
  },
  ignorePatterns: [
    '**/node_modules/**',
    'client/dist/**',
    'server/data/**',
    'server/uploads/**',
    'logs/**',
    'client/write_home.js',
    'client/write_login.js',
  ],
  plugins: ['react'],
  rules: {
    'no-undef': 'error',
    'no-unreachable': 'error',
    'no-empty': ['error', { allowEmptyCatch: true }],
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    'react/jsx-uses-vars': 'error',
  },
};
