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

  describe('findPendingForRetry', () => {
    it('should return pending generations with locked=false and nextRetryAt <= now', async () => {
      const now = new Date()
      const past = new Date(now.getTime() - 1000)
      const future = new Date(now.getTime() + 10000)

      // geração pendente e desbloqueada → deve ser retornada
      await prisma.generations.create({
        data: {
          prompt: 'pending1',
          imageHeight: 1024,
          imageWidth: 1024,
          coreModel: 'SDXL',
          status: generation_status.PENDING,
          retryCount: 0,
          locked: false,
          nextRetryAt: past,
        },
      })

      // geração bloqueada → não deve retornar
      await prisma.generations.create({
        data: {
          prompt: 'locked',
          imageHeight: 1024,
          imageWidth: 1024,
          coreModel: 'SDXL',
          status: generation_status.PENDING,
          retryCount: 0,
          locked: true,
          nextRetryAt: past,
        },
      })

      // geração com nextRetryAt no futuro → não deve retornar
      await prisma.generations.create({
        data: {
          prompt: 'future',
          imageHeight: 1024,
          imageWidth: 1024,
          coreModel: 'SDXL',
          status: generation_status.PENDING,
          retryCount: 0,
          locked: false,
          nextRetryAt: future,
        },
      })

      const result = await repo.findPendingForRetry(now)

      expect(result).toHaveLength(1)
      expect(result[0].prompt).toBe('pending1')
    })
  })

  describe('claimForProcessing', () => {
    it('should claim a pending, unlocked generation', async () => {
      const gen = await prisma.generations.create({
        data: {
          prompt: 'claim test',
          imageHeight: 1024,
          imageWidth: 1024,
          coreModel: 'SDXL',
          status: generation_status.PENDING,
          retryCount: 0,
          locked: false,
        },
      })

      const claimed = await repo.claimForProcessing(gen.generationId)
      const updated = await prisma.generations.findUnique({
        where: { generationId: gen.generationId },
      })

      expect(claimed).toBe(true)
      expect(updated.locked).toBe(true)
    })

    it('should return false if generation is already locked', async () => {
      const gen = await prisma.generations.create({
        data: {
          prompt: 'already locked',
          imageHeight: 1024,
          imageWidth: 1024,
          coreModel: 'SDXL',
          status: generation_status.PENDING,
          retryCount: 0,
          locked: true,
        },
      })

      const claimed = await repo.claimForProcessing(gen.generationId)
      expect(claimed).toBe(false)
    })
  })

  describe('releaseLock', () => {
    it('should release the lock on a generation', async () => {
      const gen = await prisma.generations.create({
        data: {
          prompt: 'release lock test',
          imageHeight: 1024,
          imageWidth: 1024,
          coreModel: 'SDXL',
          status: generation_status.PENDING,
          retryCount: 0,
          locked: true,
        },
      })

      await repo.releaseLock(gen.generationId)
      const updated = await prisma.generations.findUnique({
        where: { generationId: gen.generationId },
      })

      expect(updated.locked).toBe(false)
    })
  })
})
