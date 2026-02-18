import { Test } from '@nestjs/testing'
import { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { AppModule } from '../src/app.module'
import { PrismaClient, generation_status } from '@prisma/client'

describe('Generation E2E', () => {
  let app: INestApplication
  let prisma: PrismaClient

    const id = '550e8400-e29b-41d4-a716-446655440000'


  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = moduleRef.createNestApplication()
    await app.init()

    prisma = new PrismaClient()
  })

  afterAll(async () => {
    await prisma.generations.deleteMany()
    await prisma.$disconnect()
    await app.close()
  })

    beforeEach(async () => {
        await prisma.generations.deleteMany()
    })

it('GET /api/generation/:id → PENDING generation', async () => {
  const generation = await prisma.generations.create({
    data: {
      prompt: 'test prompt',
      imageHeight: 1024,
      imageWidth: 1024,
      coreModel: 'SDXL',
      status: generation_status.PENDING,
    },
  })

  const res = await request(app.getHttpServer())
    .get(`/api/generation/${generation.generationId}`)
    .expect(200)

  expect(res.body).toEqual({
    generationId: generation.generationId,
    prompt: 'test prompt',
    status: generation_status.PENDING,
    images: [],
  })
})


it('GET /api/generation/:id → COMPLETE generation', async () => {
  const generation = await prisma.generations.create({
    data: {
      prompt: 'completed image',
      imageHeight: 1024,
      imageWidth: 1024,
      coreModel: 'SDXL',
      status: generation_status.COMPLETE,
    },
  })

  const res = await request(app.getHttpServer())
    .get(`/api/generation/${generation.generationId}`)
    .expect(200)

  expect(res.body.images).toEqual([])
  expect(res.body.status).toBe(generation_status.COMPLETE)
})

})