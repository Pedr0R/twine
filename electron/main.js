const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const url = require('url');
const http = require('http');
const https = require('https');
const FormData = require('form-data');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false // Necessary if we want fetch from renderer to bypass CORS, but we will use IPC anyway
    }
  });
  const isDev = process.argv.includes('--dev');

  if (isDev) {
    mainWindow.loadURL('http://localhost:5200');
    // mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadURL(
      url.format({
        pathname: path.join(__dirname, '../dist/twine/browser/index.html'),
        protocol: 'file:',
        slashes: true
      })
    );
  }

  mainWindow.removeMenu();

  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

app.on('ready', createWindow);

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', function () {
  if (mainWindow === null) createWindow();
});

// Request Engine via IPC
ipcMain.handle('send-request', async (event, config) => {
  const { url: requestUrl, method, headers, body, formDataPayload } = config;
  const startTime = Date.now();

  return new Promise((resolve, reject) => {
    try {
      const parsedUrl = new URL(requestUrl);
      const isHttps = parsedUrl.protocol === 'https:';
      const requestModule = isHttps ? https : http;

      const options = {
        method: method || 'GET',
        headers: headers || {}
      };

      let form = null;
      if (formDataPayload) {
        form = new FormData();
        Object.entries(formDataPayload).forEach(([key, value]) => {
          form.append(key, String(value));
        });
        Object.assign(options.headers, form.getHeaders());
      } else if (body) {
        options.headers['Content-Length'] = Buffer.byteLength(body);
      }

      const req = requestModule.request(parsedUrl, options, (res) => {
        let data = [];
        let size = 0;

        res.on('data', (chunk) => {
          data.push(chunk);
          size += chunk.length;
        });

        res.on('end', () => {
          const endTime = Date.now();
          const buffer = Buffer.concat(data);
          let responseBody = buffer.toString('utf-8');

          resolve({
            statusCode: res.statusCode,
            time: endTime - startTime,
            size,
            headers: res.headers,
            body: responseBody
          });
        });
      });

      req.on('error', (e) => {
        const endTime = Date.now();
        resolve({
          error: e.message,
          time: endTime - startTime,
          size: 0
        });
      });

      if (form) {
        form.pipe(req);
      } else {
        if (body) {
          req.write(body);
        }
        req.end();
      }
    } catch (err) {
      resolve({
        error: err.message,
        time: 0,
        size: 0
      });
    }
  });
});
