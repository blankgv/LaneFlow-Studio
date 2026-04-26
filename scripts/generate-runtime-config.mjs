import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const rootDir = process.cwd();
const envPath = resolve(rootDir, '.env');
const outputPath = resolve(rootDir, 'src/app/core/config/generated-runtime-config.ts');

function readDotEnv(filePath) {
  if (!existsSync(filePath)) {
    return {};
  }

  return readFileSync(filePath, 'utf8')
    .split(/\r?\n/)
    .reduce((accumulator, line) => {
      const trimmed = line.trim();

      if (!trimmed || trimmed.startsWith('#')) {
        return accumulator;
      }

      const separatorIndex = trimmed.indexOf('=');
      if (separatorIndex === -1) {
        return accumulator;
      }

      const key = trimmed.slice(0, separatorIndex).trim();
      const value = trimmed.slice(separatorIndex + 1).trim();
      accumulator[key] = value;
      return accumulator;
    }, {});
}

const envValues = readDotEnv(envPath);
const apiBaseUrl = process.env.API_BASE_URL || envValues.API_BASE_URL;
const wsBaseUrl = process.env.WS_BASE_URL || envValues.WS_BASE_URL || '';

if (!apiBaseUrl) {
  throw new Error('API_BASE_URL is required in .env or environment variables.');
}

const fileContent = `import { AppConfig } from './app-config.model';

export const GENERATED_RUNTIME_CONFIG: AppConfig = {
  apiBaseUrl: ${JSON.stringify(apiBaseUrl)},
  wsBaseUrl: ${JSON.stringify(wsBaseUrl)}
};
`;

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, fileContent, 'utf8');
