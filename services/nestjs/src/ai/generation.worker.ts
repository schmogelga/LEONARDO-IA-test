import { Injectable, Logger } from '@nestjs/common'
import { GenerationRepository } from './generation.repository'
import { GenerationProcessor } from './generation.processor'
import { Interval } from '@nestjs/schedule'

@Injectable()
export class GenerationRetryWorker {
  private readonly logger = new Logger(GenerationRetryWorker.name)

  constructor(
    private readonly generationRepository: GenerationRepository,
    private readonly generationProcessor: GenerationProcessor
  ) {}

  @Interval(5000)
  async run() {
    const pending = await this.generationRepository.findPendingForRetry(new Date())

    for (const gen of pending) {
      const claimed = await this.generationRepository.claimForProcessing(gen.generationId)

      if (!claimed) {
        continue
      }

      this.logger.warn(
        `Processing generation`,
        JSON.stringify({
          generationId: gen.generationId,
          retryCount: gen.retryCount,
          maxRetries: gen.maxRetries,
        })
      )

        try {
            await this.generationProcessor.process(gen.prompt, gen.generationId)
        } finally {
            await this.generationRepository.releaseLock(gen.generationId)
        }    
    }
  }
}