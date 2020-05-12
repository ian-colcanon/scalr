const merge = require('webpack-merge');
const common = require('./webpack.common.js');
const paths = require('./paths.js');
module.exports = merge(common, {
    mode: 'development',
    devtool: 'inline-source-map',
    devServer: {
        contentBase: paths.public
    },
    optimization: {
        minimize: false
    }
})