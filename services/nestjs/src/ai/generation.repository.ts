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

  //add type
  scheduleRetry(id, retryCount, nextRetryAt, reason) {
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
}