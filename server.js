import 'dotenv/config';
import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import session from 'express-session';
import authRouter from './routes/auth.js';
import apiRouter from './routes/api.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;
const certDir = path.join(__dirname, 'certs');

if (!fs.existsSync(path.join(certDir, 'key.pem'))) {
  console.error('No TLS certificate found. Run: npm run setup');
  process.exit(1);
}

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: process.env.SESSION_SECRET || 'dj-swapper-dev-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: true,
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000,
  },
}));

app.use('/auth', authRouter);
app.use('/api', apiRouter);

https.createServer({
  key: fs.readFileSync(path.join(certDir, 'key.pem')),
  cert: fs.readFileSync(path.join(certDir, 'cert.pem')),
}, app).listen(PORT, () => {
  console.log(`\nDJ Swapper → https://localhost:${PORT}`);
  console.log('Cert warning: Chrome → type "thisisunsafe" | Firefox → Accept Risk\n');
});
