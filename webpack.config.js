const path = require('path');
const http = require('http');
const https = require('https');
const url = require('url');
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
    host: '0.0.0.0',
    port: 8080,
    hot: true,
    open: false,
    allowedHosts: 'all',
    historyApiFallback: {
      disableDotRule: true,
    },
    setupMiddlewares: (middlewares, devServer) => {
      // CORS proxy: /stream-proxy/<encoded-url> → fetches the real stream URL
      // and rewrites m3u8 content so relative URLs also go through the proxy
      devServer.app.use('/stream-proxy', (req, res) => {
        const targetUrl = decodeURIComponent(req.url.slice(1)); // remove leading /
        if (!targetUrl || (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://'))) {
          res.status(400).send('Invalid target URL');
          return;
        }

        const parsed = new URL(targetUrl);
        const client = parsed.protocol === 'https:' ? https : http;

        const proxyReq = client.get(targetUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (proxyRes) => {
          // Follow redirects
          if (proxyRes.statusCode >= 300 && proxyRes.statusCode < 400 && proxyRes.headers.location) {
            const redirectUrl = new URL(proxyRes.headers.location, targetUrl).href;
            res.redirect(`/stream-proxy/${encodeURIComponent(redirectUrl)}`);
            return;
          }

          const contentType = proxyRes.headers['content-type'] || '';
          const isM3U8 = targetUrl.includes('.m3u8') || targetUrl.includes('m3u') ||
            contentType.includes('mpegurl') || contentType.includes('m3u');

          // Set CORS headers
          res.set('Access-Control-Allow-Origin', '*');
          res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');

          if (isM3U8) {
            // Buffer m3u8 response and rewrite URLs
            const chunks = [];
            proxyRes.on('data', chunk => chunks.push(chunk));
            proxyRes.on('end', () => {
              let body = Buffer.concat(chunks).toString('utf-8');
              const baseUrl = targetUrl.substring(0, targetUrl.lastIndexOf('/') + 1);

              // Rewrite URLs in the m3u8: absolute and relative
              body = body.replace(/^((?!#).+\.(?:m3u8|ts|aac|mp4|fmp4|cmfv|cmfa|vtt|key).*)$/gm, (match) => {
                const line = match.trim();
                let absoluteUrl;
                if (line.startsWith('http://') || line.startsWith('https://')) {
                  absoluteUrl = line;
                } else if (line.startsWith('/')) {
                  absoluteUrl = `${parsed.protocol}//${parsed.host}${line}`;
                } else {
                  absoluteUrl = baseUrl + line;
                }
                return `/stream-proxy/${encodeURIComponent(absoluteUrl)}`;
              });

              // Also rewrite URI= values (e.g. for encryption keys)
              body = body.replace(/URI="([^"]+)"/g, (match, uri) => {
                let absoluteUrl;
                if (uri.startsWith('http://') || uri.startsWith('https://')) {
                  absoluteUrl = uri;
                } else if (uri.startsWith('/')) {
                  absoluteUrl = `${parsed.protocol}//${parsed.host}${uri}`;
                } else {
                  absoluteUrl = baseUrl + uri;
                }
                return `URI="/stream-proxy/${encodeURIComponent(absoluteUrl)}"`;
              });

              res.set('Content-Type', 'application/vnd.apple.mpegurl');
              res.send(body);
            });
          } else {
            // Binary content (ts segments, etc) — pipe directly
            Object.entries(proxyRes.headers).forEach(([key, value]) => {
              if (key !== 'transfer-encoding') res.set(key, value);
            });
            res.set('Access-Control-Allow-Origin', '*');
            proxyRes.pipe(res);
          }
        });

        proxyReq.on('error', (err) => {
          console.error('[stream-proxy] Error:', err.message, targetUrl);
          if (!res.headersSent) {
            res.status(502).send('Proxy error: ' + err.message);
          }
        });

        proxyReq.setTimeout(10000, () => {
          proxyReq.destroy();
          if (!res.headersSent) {
            res.status(504).send('Proxy timeout');
          }
        });
      });

      return middlewares;
    },
  },
  devtool: 'source-map',
};
