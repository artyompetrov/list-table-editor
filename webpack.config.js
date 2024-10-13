//@ts-check

'use strict';

const path = require('path');

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
  }

};

/** @type WebpackConfig */
const tableEditor = {
  target: 'web', // Since the code runs in a browser environment
  mode: 'none',
  entry: './src/tableEditor.ts',
  output: {
    path: path.resolve(__dirname, 'media'),
    filename: 'tableEditor.js',
    libraryTarget: 'umd', // Use UMD format for wider compatibility
  },
  externals: {
    vscode: 'commonjs vscode', // Exclude 'vscode' module
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'ts-loader',
            options: {
              configFile: 'tsconfig.webview.json', // Use a separate tsconfig for the webview
            },
          },
        ],
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'], // Handle CSS imports
      },
    ],
  },
  devtool: 'nosources-source-map',
  infrastructureLogging: {
    level: 'info',
  },
};
module.exports = [ extensionConfig, tableEditor ];