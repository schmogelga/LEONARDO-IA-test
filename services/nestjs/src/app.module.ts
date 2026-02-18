import { Module } from '@nestjs/common'
import { AiController } from './ai/ai.controller'
import { AiService } from './ai/ai.service'
import { PrismaModule } from './prisma/prisma.module'

@Module({
    imports: [PrismaModule],
  controllers: [AiController],
  providers: [AiService],
})
export class AppModule {}
