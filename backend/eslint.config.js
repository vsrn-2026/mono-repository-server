const js = require('@eslint/js');
const tsParser = require('@typescript-eslint/parser');
const tsPlugin = require('@typescript-eslint/eslint-plugin');

module.exports = [
    js.configs.recommended,
    {
        files: ['src/**/*.ts', 'src/__tests__/**/*.ts'],
        languageOptions: {
            parser: tsParser,
            parserOptions: {
                ecmaVersion: 'latest',
                sourceType: 'module'
            },
            globals: {
                process: 'readonly',
                module: 'readonly',
                require: 'readonly',
                global: 'readonly',
                globalThis: 'readonly',
                setTimeout: 'readonly',
                clearTimeout: 'readonly',
                setInterval: 'readonly',
                clearInterval: 'readonly',
                jest: 'readonly',
                describe: 'readonly',
                it: 'readonly',
                test: 'readonly',
                expect: 'readonly',
                beforeEach: 'readonly',
                afterEach: 'readonly',
                beforeAll: 'readonly',
                afterAll: 'readonly'
            }
        },
        plugins: {
            '@typescript-eslint': tsPlugin
        },
        rules: {
            ...tsPlugin.configs.recommended.rules,
            'indent': ['error', 4],
            'linebreak-style': ['error', 'windows'],
            'quotes': ['error', 'single'],
            'semi': ['error', 'always'],
            '@typescript-eslint/no-unused-vars': ['warn', { 'argsIgnorePattern': '^_' }],
            '@typescript-eslint/no-explicit-any': ['warn'],
            'no-console': 'off'
        }
    },
    {
        files: ['src/__tests__/**/*.ts'],
        rules: {
            '@typescript-eslint/no-explicit-any': 'off'
        }
    }
];
