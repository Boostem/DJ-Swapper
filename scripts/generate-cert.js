import { execSync } from 'child_process';
import { mkdirSync, existsSync, writeFileSync, unlinkSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const certsDir = join(__dirname, '..', 'certs');

if (!existsSync(certsDir)) mkdirSync(certsDir, { recursive: true });

// Write a config file for cross-platform SAN support (works with LibreSSL on macOS)
const cfgPath = join(certsDir, 'openssl.cnf');
writeFileSync(cfgPath, [
  '[req]',
  'prompt = no',
  'distinguished_name = dn',
  'x509_extensions = v3_req',
  '',
  '[dn]',
  'CN = localhost',
  '',
  '[v3_req]',
  'subjectAltName = @alt_names',
  '',
  '[alt_names]',
  'DNS.1 = localhost',
  'IP.1 = 127.0.0.1',
].join('\n'));

try {
  execSync(
    `openssl req -x509 -newkey rsa:2048 \
      -keyout "${certsDir}/key.pem" \
      -out "${certsDir}/cert.pem" \
      -days 365 -nodes \
      -config "${cfgPath}"`,
    { stdio: 'inherit' }
  );
  console.log('\nCertificate generated in certs/ (valid 365 days)');
} catch {
  console.error('\nFailed. Make sure openssl is installed:');
  console.error('  macOS:  brew install openssl');
  console.error('  Linux:  apt install openssl');
  process.exit(1);
} finally {
  unlinkSync(cfgPath);
}
