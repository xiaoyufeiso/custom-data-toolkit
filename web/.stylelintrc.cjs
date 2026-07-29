module.exports = {
  extends: [
    'stylelint-config-standard',
    'stylelint-config-css-modules',
  ],
  customSyntax: 'postcss-less',
  rules: {
    // 允许 CSS Modules 的 :global / :local 伪类
    'selector-pseudo-class-no-unknown': [
      true,
      { ignorePseudoClasses: ['global', 'local', 'export'] },
    ],
    // 允许 Less 的自定义函数
    'function-no-unknown': [true, { ignoreFunctions: ['fade', 'darken', 'lighten', 'mix'] }],
    // 允许 Less 的 @变量 和 mixin 规则
    'at-rule-no-unknown': null,
    // 颜色格式不强制
    'color-function-notation': null,
    // alpha 值格式不强制
    'alpha-value-notation': null,
    // 不限制选择器类名格式（兼容 camelCase CSS Modules）
    'selector-class-pattern': null,
    // 不限制自定义属性格式
    'custom-property-pattern': null,
    // 不限制 keyframes 命名格式
    'keyframes-name-pattern': null,
    // 不强制简写属性
    'declaration-block-no-redundant-longhand-properties': null,
    // 允许空源文件
    'no-empty-source': null,
    // 不强制 rgba() → rgb() 等别名写法
    'color-function-alias-notation': null,
    // 导入路径不要求扩展名
    'import-notation': null,
  },
  ignoreFiles: ['node_modules/**', 'dist/**', '**/*.tsx', '**/*.ts', '**/*.js'],
};
