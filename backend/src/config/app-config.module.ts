import path from 'path';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { appConfigSchema } from './app-config.schema';
import { AppConfigService } from './app-config.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // Try local .env first, then fall back to monorepo root .env
      envFilePath: ['.env', path.resolve(__dirname, '../../../../.env')],
      validate: (env: Record<string, unknown>) => {
        const result = appConfigSchema.safeParse(env);
        if (!result.success) {
          const issues = result.error.issues
            .map((i) => `  ${i.path.join('.') || i.code}: ${i.message}`)
            .join('\n');
          throw new Error(`\nConfig validation failed:\n${issues}\n`);
        }
        return result.data;
      },
    }),
  ],
  providers: [AppConfigService],
  exports: [AppConfigService],
})
export class AppConfigModule {}
