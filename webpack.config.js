//@ts-check

'use strict';

const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');

//@ts-check
/** @typedef {import('webpack').Configuration} WebpackConfig **/

/** @type WebpackConfig */
const extensionConfig = {
  target: 'node',
	mode: 'none',

  entry: './src/extension.ts',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'extension.js',
    libraryTarget: 'commonjs2'
  },
  externals: {
    vscode: 'commonjs vscode'
  },
  resolve: {
    extensions: ['.ts', '.js']
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'ts-loader'
          }
        ]
      }
    ]
  },
  devtool: 'nosources-source-map',
  infrastructureLogging: {
    level: "info",
  },
  plugins: [
    new CopyWebpackPlugin({
      patterns: [
        {
          from: path.resolve(__dirname, 'node_modules/tabulator-tables/dist/js/tabulator.min.js'),
          to: path.resolve(__dirname, 'media'),
          noErrorOnMissing: false,
        },
        {
          from: path.resolve(__dirname, 'node_modules/tabulator-tables/dist/css/tabulator.min.css'),
          to: path.resolve(__dirname, 'media'),
          noErrorOnMissing: false,
        },
      ],
    }),
  ],
  
};

/** @type WebpackConfig */
const tableEditor = {
  target: 'node',
	mode: 'none',

  entry: './src/tableEditor.ts',
  output: {
    path: path.resolve(__dirname, 'media'),
    filename: 'tableEditor.js',
    libraryTarget: 'commonjs2'
  },
  externals: {
    vscode: 'commonjs'
  },
  resolve: {
    extensions: ['.ts', '.js']
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'ts-loader'
          }
        ]
      }
    ]
  },
  devtool: 'nosources-source-map',
  infrastructureLogging: {
    level: "info", // enables logging required for problem matchers
  }
  
};
module.exports = [ extensionConfig, tableEditor ];