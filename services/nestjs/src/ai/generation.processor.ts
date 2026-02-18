import { Injectable, Logger } from '@nestjs/common'
import { generation_status } from '@prisma/client'
import axios from 'axios'
import { GenerationRepository } from './generation.repository'

@Injectable()
export class GenerationProcessor {
  private readonly logger = new Logger(GenerationProcessor.name)

  private readonly baseDelayMs = Number(process.env.GENERATION_RETRY_BASE_DELAY_MS) || 500

  private readonly maxRetries = Number(process.env.GENERATION_MAX_RETRIES) || 4

  private readonly aiBaseUrl = process.env.GENERATION_AI_BASE_URL || 'http://localhost:3001'

  constructor(private readonly generationRepository: GenerationRepository) {}

  async process(prompt: string, generationId: string): Promise<void> {
    const generation = await this.generationRepository.findByGenerationId(generationId)

    if (!this.validateGeneration(generation, generationId)) return

    const attempt = generation.retryCount + 1

    this.logger.log(
      `Processing generation attempt`,
      JSON.stringify({
        generationId,
        attempt,
        maxRetries: this.maxRetries,
      })
    )

    try {
      await this.processImageGeneration(prompt, generationId)

      await this.generationRepository.markCompleted(generationId)

      this.logger.log(`Generation ${generationId} complete`)
    } catch (err) {
      await this.handleFailure(generation, generationId, err)
    }
  }

  private async handleFailure(generation: { retryCount: number }, generationId: string, err: any) {
    const retryable = this.isRetryableError(err)
    const failureReason = this.buildFailureReason(err)

    const nextRetryCount = generation.retryCount + 1

    if (!retryable || nextRetryCount > this.maxRetries) {
      await this.generationRepository.markFailed(generationId, failureReason)

      this.logger.error(`Generation failed permanently`, JSON.stringify({ generationId, nextRetryCount, retryable }))

      return
    }

    const delayMs = this.baseDelayMs * Math.pow(2, generation.retryCount)

    const nextRetryAt = new Date(Date.now() + delayMs)

    await this.generationRepository.scheduleRetry(generationId, nextRetryCount, nextRetryAt, failureReason)
  }

  private validateGeneration(generation: any, generationId: string): generation is { status: generation_status; retryCount: number } {
    if (!generation) {
      this.logger.error(`Generation ${generationId} not found`)
      return false
    }

    if (generation.status === generation_status.COMPLETE) return false
    if (generation.status === generation_status.FAILED) return false

    return true
  }

  private async processImageGeneration(prompt: string, generationId: string) {
    this.logger.log(`Sending generation request to AI`, `generationId=${generationId}`)

    const response = await axios.post(`${this.aiBaseUrl}/generate`, { prompt, generationId }, { timeout: 60000 })

    return response.data
  }

  private buildFailureReason(err: any): string {
    if (axios.isAxiosError(err)) {
      return JSON.stringify({
        message: err.message,
        code: err.code,
        status: err.response?.status,
        data: err.response?.data,
      })
    }

    return err?.message ?? String(err)
  }

  private isRetryableError(err: any): boolean {
    if (!axios.isAxiosError(err)) return false

    return err.code === 'ECONNABORTED' || err.code === 'ECONNREFUSED' || (err.response && err.response.status >= 500)
  }
}
