import { NotFoundException } from '@nestjs/common'
import { generation_status } from '@prisma/client'
import { AiService } from '../ai.service'

describe('AiService', () => {
  let service: AiService

  const repositoryMock = {
    create: jest.fn(),
    findByGenerationId: jest.fn(),
  }

  const processorMock = {
    process: jest.fn(),
  }

  beforeEach(() => {
    service = new AiService(repositoryMock as any, processorMock as any)

    jest.clearAllMocks()
  })

  describe('generateImage', () => {
    it('should create generation and return generationId', async () => {
      repositoryMock.create.mockResolvedValue({
        generationId: 'gen-123',
      })

      const result = await service.generateImage('hello world')

      expect(repositoryMock.create).toHaveBeenCalledWith('hello world')
      expect(result).toEqual({ generationId: 'gen-123' })
    })

    it('should start background processing with GenerationProcessor', async () => {
      repositoryMock.create.mockResolvedValue({
        generationId: 'gen-bg',
      })

      await service.generateImage('background prompt')

      // garante execução do Promise.resolve().then()
      await new Promise(process.nextTick)

      expect(processorMock.process).toHaveBeenCalledWith('background prompt', 'gen-bg')
    })

    it('should not throw if background processing fails', async () => {
      repositoryMock.create.mockResolvedValue({
        generationId: 'gen-error',
      })

      processorMock.process.mockRejectedValue(new Error('processor error'))

      await expect(service.generateImage('fail prompt')).resolves.toEqual({ generationId: 'gen-error' })

      await new Promise(process.nextTick)

      expect(processorMock.process).toHaveBeenCalled()
    })

    it('should throw when repository.create fails', async () => {
      repositoryMock.create.mockRejectedValue(new Error('db error'))

      await expect(service.generateImage('boom')).rejects.toThrow('Failed to initiate image generation')
    })
  })

  describe('getGeneration', () => {
    it('should return generation data when status is PENDING', async () => {
      repositoryMock.findByGenerationId.mockResolvedValue({
        generationId: 'gen-1',
        prompt: 'test prompt',
        status: generation_status.PENDING,
      })

      const result = await service.getGeneration('gen-1')

      expect(result).toEqual({
        generationId: 'gen-1',
        prompt: 'test prompt',
        status: generation_status.PENDING,
        imageUrls: null,
      })
    })

    it('should return imageUrls when status is COMPLETE', async () => {
      repositoryMock.findByGenerationId.mockResolvedValue({
        generationId: 'gen-2',
        prompt: 'done prompt',
        status: generation_status.COMPLETE,
      })

      const result = await service.getGeneration('gen-2')

      expect(result).toEqual({
        generationId: 'gen-2',
        prompt: 'done prompt',
        status: generation_status.COMPLETE,
        imageUrls: [],
      })
    })

    it('should throw NotFoundException when generation does not exist', async () => {
      repositoryMock.findByGenerationId.mockResolvedValue(null)

      await expect(service.getGeneration('invalid-id')).rejects.toThrow(NotFoundException)
    })
  })
})