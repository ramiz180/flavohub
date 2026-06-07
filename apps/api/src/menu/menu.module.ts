import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { MenuController } from './menu.controller';
import { MenuService } from './menu.service';

@Module({
  imports: [AuditModule],
  controllers: [MenuController],
  providers: [MenuService],
})
export class MenuModule {}
