import { generation_status } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { Injectable } from '@nestjs/common'

@Injectable()
export class GenerationRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(prompt: string) {
    return this.prisma.generations.create({
      data: {
        prompt,
        imageHeight: 1024,
        imageWidth: 1024,
        coreModel: 'SDXL',
        status: generation_status.PENDING,
        retryCount: 0,
      },
    })
  }

  findByGenerationId(generationId: string) {
    return this.prisma.generations.findUnique({
      where: { generationId },
    })
  }

  markFailed(generationId: string, failureReason: string) {
    return this.prisma.generations.update({
      where: { generationId },
      data: {
        status: generation_status.FAILED,
        failureReason,
        nextRetryAt: null,
      },
    })
  }

  markCompleted(generationId: string) {
    return this.prisma.generations.update({
      where: { generationId },
      data: {
        status: generation_status.COMPLETE,
        failureReason: null,
        nextRetryAt: null,
      },
    })
  }

  async scheduleRetry(
    id: string,
    retryCount: number,
    nextRetryAt: Date,
    reason: string,
  ) {
    return this.prisma.generations.update({
      where: { generationId: id },
      data: {
        status: generation_status.PENDING,
        retryCount,
        failureReason: reason,
        nextRetryAt,
      },
    })
  }

  async findPendingForRetry(now: Date) {
    return this.prisma.generations.findMany({
      where: {
        status: generation_status.PENDING,
        locked: false,
        nextRetryAt: {
          lte: now,
        },
      },
    })
  }

  async claimForProcessing(generationId: string): Promise<boolean> {
    const result = await this.prisma.generations.updateMany({
      where: {
        generationId,
        status: generation_status.PENDING,
        locked: false,
      },
      data: {
        locked: true,
      },
    })

    return result.count === 1
  }

  async releaseLock(generationId: string): Promise<void> {
  await this.prisma.generations.update({
    where: { generationId },
    data: {
      locked: false
    },
  })
}

}