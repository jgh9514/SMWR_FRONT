/**
 * `tsc --noEmit` 전에 Next가 생성한 라우트 타입이 있는지 확인합니다.
 * - `yarn build` → `.next/types/routes.d.ts`
 * - `yarn dev` (한 번 기동) → `.next/dev/types/routes.d.ts`
 * next-env.d.ts가 이 중 하나를 참조하므로, CI에서는 보통 `yarn build` 후에 실행합니다.
 */
import { existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const routesProd = join(root, '.next', 'types', 'routes.d.ts');
const routesDev = join(root, '.next', 'dev', 'types', 'routes.d.ts');

if (!existsSync(routesProd) && !existsSync(routesDev)) {
  console.error(
    '[type-check] Next 라우트 타입이 없습니다 (.next/types/routes.d.ts 또는 .next/dev/types/routes.d.ts).\n' +
      '  CI: 워크플로에서 `yarn build` 다음에 `yarn type-check`를 실행하거나, 로컬에서는 다음 중 하나를 실행하세요:\n' +
      '  yarn build\n' +
      '  또는: yarn dev (한 번 기동해 타입 생성)',
  );
  process.exit(1);
}

execSync('npx tsc --noEmit', { cwd: root, stdio: 'inherit' });
