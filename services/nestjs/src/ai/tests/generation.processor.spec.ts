import { generation_status } from '@prisma/client'
import axios from 'axios'
import { GenerationProcessor } from '../generation.processor'

jest.mock('axios')
const mockedAxios = axios as jest.Mocked<typeof axios>

describe('GenerationProcessor', () => {
  let processor: GenerationProcessor

  const repositoryMock = {
    findByGenerationId: jest.fn(),
    markCompleted: jest.fn(),
    markFailed: jest.fn(),
    scheduleRetry: jest.fn(),
  }

  beforeEach(() => {
    processor = new GenerationProcessor(repositoryMock as any)

    jest.clearAllMocks()
  })

  describe('process', () => {
    it('should process generation successfully and mark as completed', async () => {
      repositoryMock.findByGenerationId.mockResolvedValue({
        status: generation_status.PENDING,
        retryCount: 0,
      })

      mockedAxios.post.mockResolvedValue({
        data: { imageUrl: 'ok' },
      } as any)

      await processor.process('test prompt', 'gen-1')

      let basUrl = process.env.GENERATION_AI_BASE_URL || 'http://localhost:3001'

      expect(mockedAxios.post).toHaveBeenCalledWith(
        `${basUrl}/generate`,
        { prompt: 'test prompt', generationId: 'gen-1' },
        { timeout: 60000 }
      )

      expect(repositoryMock.markCompleted).toHaveBeenCalledWith('gen-1')
    })

    it('should do nothing if generation does not exist', async () => {
      repositoryMock.findByGenerationId.mockResolvedValue(null)

      await processor.process('prompt', 'gen-404')

      expect(mockedAxios.post).not.toHaveBeenCalled()
      expect(repositoryMock.markCompleted).not.toHaveBeenCalled()
      expect(repositoryMock.markFailed).not.toHaveBeenCalled()
    })

    it.each([generation_status.COMPLETE, generation_status.FAILED])('should not process when status is %s', async (status) => {
      repositoryMock.findByGenerationId.mockResolvedValue({
        status,
        retryCount: 0,
      })

      await processor.process('prompt', 'gen-skip')

      expect(mockedAxios.post).not.toHaveBeenCalled()
    })

    it('should schedule retry for retryable axios error', async () => {
      repositoryMock.findByGenerationId.mockResolvedValue({
        status: generation_status.PENDING,
        retryCount: 1,
      })

      jest.spyOn(axios, 'isAxiosError').mockReturnValue(true)

      mockedAxios.post.mockRejectedValue({
        code: 'ECONNREFUSED',
        response: {
          status: 500,
        },
      })

      await processor.process('prompt', 'gen-retry')

      expect(repositoryMock.scheduleRetry).toHaveBeenCalledWith('gen-retry', 2, expect.any(Date), expect.any(String))

      expect(repositoryMock.markFailed).not.toHaveBeenCalled()
    })

    it('should mark as failed for non-retryable error', async () => {
      repositoryMock.findByGenerationId.mockResolvedValue({
        status: generation_status.PENDING,
        retryCount: 0,
      })

      mockedAxios.post.mockRejectedValue(new Error('unexpected error'))

      await processor.process('prompt', 'gen-fail')

      expect(repositoryMock.markFailed).toHaveBeenCalledWith('gen-fail', expect.any(String))

      expect(repositoryMock.scheduleRetry).not.toHaveBeenCalled()
    })

    it('should mark as failed when max retries is exceeded', async () => {
      repositoryMock.findByGenerationId.mockResolvedValue({
        status: generation_status.PENDING,
        retryCount: 5,
      })

      mockedAxios.post.mockRejectedValue({
        isAxiosError: true,
        code: 'ECONNABORTED',
      })

      await processor.process('prompt', 'gen-max')

      expect(repositoryMock.markFailed).toHaveBeenCalledWith('gen-max', expect.any(String))

      expect(repositoryMock.scheduleRetry).not.toHaveBeenCalled()
    })
  })
})
