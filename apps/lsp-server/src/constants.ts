import { fileURLToPath } from 'url';
import path, { dirname } from 'path';

export const PROJECT_ROOT_PATH  = dirname(fileURLToPath(import.meta.url));
export const PUBLIC_DIR_PATH  = path.join(PROJECT_ROOT_PATH, 'public')
