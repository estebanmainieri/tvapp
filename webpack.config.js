const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  mode: 'development',
  entry: path.resolve(__dirname, 'index.web.js'),
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js',
    publicPath: '/',
  },
  resolve: {
    extensions: ['.web.tsx', '.web.ts', '.web.js', '.tsx', '.ts', '.js'],
    alias: {
      'react-native$': 'react-native-web',
      'react-native-video': path.resolve(__dirname, 'src/web/VideoStub.tsx'),
      '@react-native-async-storage/async-storage': path.resolve(
        __dirname,
        'src/web/AsyncStorageStub.ts',
      ),
    },
  },
  module: {
    rules: [
      // Our source code
      {
        test: /\.[jt]sx?$/,
        include: [
          path.resolve(__dirname, 'src'),
          path.resolve(__dirname, 'index.web.js'),
        ],
        use: {
          loader: 'babel-loader',
          options: {
            configFile: false,
            babelrc: false,
            presets: [
              ['@babel/preset-env', { targets: { browsers: ['last 2 versions'] }, modules: false }],
              '@babel/preset-typescript',
              ['@babel/preset-react', { runtime: 'automatic' }],
            ],
            plugins: [
              'react-native-web',
            ],
          },
        },
      },
      // node_modules that need babel (RN ecosystem packages)
      {
        test: /\.[jt]sx?$/,
        include: [
          path.resolve(__dirname, 'node_modules/react-native-web'),
          path.resolve(__dirname, 'node_modules/react-native-safe-area-context'),
          path.resolve(__dirname, 'node_modules/@react-native'),
          path.resolve(__dirname, 'node_modules/@react-navigation'),
          path.resolve(__dirname, 'node_modules/react-native-screens'),
        ],
        use: {
          loader: 'babel-loader',
          options: {
            configFile: false,
            babelrc: false,
            sourceType: 'unambiguous',
            presets: [
              ['@babel/preset-env', { targets: { browsers: ['last 2 versions'] }, modules: false }],
              '@babel/preset-flow',
              ['@babel/preset-react', { runtime: 'automatic' }],
              '@babel/preset-typescript',
            ],
            plugins: [
              'react-native-web',
            ],
          },
        },
      },
      // Fix for ESM modules without file extensions
      {
        test: /\.js$/,
        resolve: {
          fullySpecified: false,
        },
      },
      {
        test: /\.(png|jpe?g|gif|svg)$/i,
        type: 'asset/resource',
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: path.resolve(__dirname, 'web/index.html'),
    }),
  ],
  devServer: {
    port: 8080,
    hot: true,
    open: false,
    historyApiFallback: {
      disableDotRule: true,
    },
  },
  devtool: 'source-map',
};
