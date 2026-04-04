/**
 * `tsc --noEmit` 전에 Next가 생성한 `.next/types/routes.d.ts` 존재 여부를 확인합니다.
 * (next-env.d.ts가 이 파일을 참조하므로, CI/클론 직후에는 `yarn next build` 한 번 필요)
 */
import { existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const routes = join(root, '.next', 'types', 'routes.d.ts');

if (!existsSync(routes)) {
  console.error(
    '[type-check] .next/types/routes.d.ts 가 없습니다. 다음을 실행한 뒤 다시 시도하세요: yarn next build'
  );
  process.exit(1);
}

execSync('npx tsc --noEmit', { cwd: root, stdio: 'inherit' });
