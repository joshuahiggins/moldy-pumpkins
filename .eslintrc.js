module.exports = {
  extends: 'airbnb',
  rules: {
    camelcase: ['warn', {
      properties: 'never',
    }],
    'no-param-reassign': ['error', {
      props: false,
    }],
    'no-unused-vars': 'warn',
  },
  env: {
    mocha: true,
  },
};
