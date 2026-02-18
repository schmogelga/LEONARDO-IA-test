import { Module } from '@nestjs/common'
import { AiController } from './ai/ai.controller'
import { AiService } from './ai/ai.service'
import { PrismaModule } from './prisma/prisma.module'
import { GenerationProcessor } from './ai/generation.processor'
import { GenerationRepository } from './ai/generation.repository'
import { ScheduleModule } from '@nestjs/schedule'
import { GenerationRetryWorker } from './ai/generation.worker'

@Module({
  imports: [PrismaModule, ScheduleModule.forRoot()],
    controllers: [AiController],
  providers: [AiService, GenerationProcessor, GenerationRepository, GenerationRetryWorker],
})
export class AppModule {}
