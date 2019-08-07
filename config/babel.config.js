module.exports = function (api) {
    api.cache(true);
  
    const presets = [
      [
        '@babel/preset-env',
        {
          useBuiltIns: 'usage',
          corejs: '3.0.0',
        }
      ],
      '@babel/preset-react',
      '@babel/preset-typescript',
      ];
    
    const plugins = [
     '@babel/plugin-proposal-class-properties'
    ];

    return {
      presets,
      plugins
    };
  }