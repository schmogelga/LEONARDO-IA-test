import { GenerationRepository } from '../generation.repository'
import { PrismaService } from '../../prisma/prisma.service'
import { generation_status } from '@prisma/client'

describe('GenerationRepository', () => {
  let prisma: PrismaService
  let repo: GenerationRepository

  beforeAll(async () => {
    prisma = new PrismaService()
    await prisma.$connect()
    repo = new GenerationRepository(prisma)
  })

  beforeEach(async () => {
    await prisma.generations.deleteMany()
  })

  afterAll(async () => {
    await prisma.generations.deleteMany()
    await prisma.$disconnect()
  })

  describe('scheduleRetry', () => {
    it('should update retryCount, nextRetryAt, failureReason and keep PENDING', async () => {
      const gen = await prisma.generations.create({
        data: {
          prompt: 'retry test',
          imageHeight: 1024,
          imageWidth: 1024,
          coreModel: 'SDXL',
          status: generation_status.PENDING,
          retryCount: 0,
        },
      })

      const nextRetryAt = new Date(Date.now() + 5000)

      await repo.scheduleRetry(gen.generationId, 1, nextRetryAt, 'timeout')

      const updated = await prisma.generations.findUnique({
        where: { generationId: gen.generationId },
      })

      expect(updated.retryCount).toBe(1)
      expect(updated.nextRetryAt).toEqual(nextRetryAt)
      expect(updated.failureReason).toBe('timeout')
      expect(updated.status).toBe(generation_status.PENDING)
    })
  })
})