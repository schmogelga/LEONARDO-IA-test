import { Module } from '@nestjs/common'
import { AiController } from './ai/ai.controller'
import { AiService } from './ai/ai.service'
import { PrismaModule } from './prisma/prisma.module'
import { GenerationProcessor } from './ai/generation.processor'
import { GenerationRepository } from './ai/generation.repository'

@Module({
    imports: [PrismaModule],
  controllers: [AiController],
  providers: [AiService, GenerationProcessor, GenerationRepository],
})
export class AppModule {}
