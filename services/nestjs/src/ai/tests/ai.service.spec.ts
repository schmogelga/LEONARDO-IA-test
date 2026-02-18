import { NotFoundException } from '@nestjs/common'
import { AiService } from '../ai.service'
import { generation_status } from '@prisma/client'
import axios from 'axios'

jest.mock('axios')
const mockedAxios = axios as jest.Mocked<typeof axios>

describe('AiService', () => {
  let service: AiService

  const prismaMock = {
    generations: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    $disconnect: jest.fn(),
  }

  beforeEach(() => {

    service = new AiService();
    (service as any).prisma = prismaMock
    jest.clearAllMocks()
  })

  describe('generateImage', () => {
    it('should create generation with PENDING status and return generationId', async () => {
      prismaMock.generations.create.mockResolvedValue({
        generationId: 'gen-789',
      })

      mockedAxios.post.mockResolvedValue({ data: {} })
      
      const result = await service.generateImage('hello world')

      expect(prismaMock.generations.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            prompt: 'hello world',
            status: generation_status.PENDING,
          }),
        }),
      )

      expect(result).toEqual({ generationId: 'gen-789' })
    })

    it('should mark generation as FAILED if background processing fails', async () => {
      prismaMock.generations.create.mockResolvedValue({
        generationId: 'gen-fail',
      })

      mockedAxios.post.mockRejectedValue(new Error('AI error'))

      await service.generateImage('fail prompt')
      await new Promise(process.nextTick)

      expect(prismaMock.generations.update).toHaveBeenCalledWith({
        where: { generationId: 'gen-fail' },
        data: expect.objectContaining({
          status: generation_status.FAILED,
        }),
      })
    })
  })

  describe('getGeneration', () => {
  it('should return generation data when status is PENDING', async () => {
    prismaMock.generations.findUnique.mockResolvedValue({
      generationId: 'gen-123',
      prompt: 'test prompt',
      status: generation_status.PENDING,
      images: [],
    })

    const result = await service.getGeneration('gen-123')

    expect(result).toEqual({
      generationId: 'gen-123',
      prompt: 'test prompt',
      status: generation_status.PENDING,
      images: [],
    })
  })

  it('should return images when status is COMPLETE', async () => {
    prismaMock.generations.findUnique.mockResolvedValue({
      generationId: 'gen-456',
      prompt: 'done prompt',
      status: generation_status.COMPLETE,
      images: [],
    })

    const result = await service.getGeneration('gen-456')

    expect(result).toEqual({
      generationId: 'gen-456',
      prompt: 'done prompt',
      status: generation_status.COMPLETE,
      images: [],
    })
  })

  it('should throw NotFoundException when generation does not exist', async () => {
    prismaMock.generations.findUnique.mockResolvedValue(null)

    await expect(service.getGeneration('invalid-id')).rejects.toThrow(
      NotFoundException,
    )
  })
})

})