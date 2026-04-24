import { SetMetadata } from '@nestjs/common';

export const ALLOW_PAUSED_KEY = 'allowPaused';
export const AllowPaused = () => SetMetadata(ALLOW_PAUSED_KEY, true);
