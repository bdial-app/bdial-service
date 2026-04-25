import { Global, Module } from '@nestjs/common';
import { ContentSanitizerService } from './content-sanitizer.service';

@Global()
@Module({
  providers: [ContentSanitizerService],
  exports: [ContentSanitizerService],
})
export class ContentSanitizerModule {}
