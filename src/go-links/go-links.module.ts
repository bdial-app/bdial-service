import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GoLink } from '../entities/go-link.entity';
import { GoLinksController } from './go-links.controller';
import { GoLinksService } from './go-links.service';

/** Global: messages anywhere can create links. */
@Global()
@Module({
  imports: [TypeOrmModule.forFeature([GoLink])],
  controllers: [GoLinksController],
  providers: [GoLinksService],
  exports: [GoLinksService],
})
export class GoLinksModule {}
