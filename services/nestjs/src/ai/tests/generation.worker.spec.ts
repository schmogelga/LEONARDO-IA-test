import { GenerationRetryWorker } from '../generation.worker'

describe('GenerationRetryWorker', () => {
  let worker: GenerationRetryWorker

  const repositoryMock = {
    findPendingForRetry: jest.fn(),
    claimForProcessing: jest.fn(),
    releaseLock: jest.fn(),
  }

  const processorMock = {
    process: jest.fn(),
  }

  beforeEach(() => {
    worker = new GenerationRetryWorker(repositoryMock as any, processorMock as any)
    jest.clearAllMocks()
  })

  describe('run', () => {
    it('should do nothing when there are no pending generations', async () => {
      repositoryMock.findPendingForRetry.mockResolvedValue([])

      await worker.run()

      expect(repositoryMock.findPendingForRetry).toHaveBeenCalledWith(expect.any(Date))
      expect(repositoryMock.claimForProcessing).not.toHaveBeenCalled()
      expect(processorMock.process).not.toHaveBeenCalled()
    })

    it('should process a claimed generation', async () => {
      repositoryMock.findPendingForRetry.mockResolvedValue([
        {
          generationId: 'gen-1',
          prompt: 'test prompt',
          retryCount: 1,
          maxRetries: 4,
          locked: false,
        },
      ])

      repositoryMock.claimForProcessing.mockResolvedValue(true)

      await worker.run()

      expect(repositoryMock.claimForProcessing).toHaveBeenCalledWith('gen-1')
      expect(processorMock.process).toHaveBeenCalledWith('test prompt', 'gen-1')
      expect(repositoryMock.releaseLock).toHaveBeenCalledWith('gen-1')
    })

    it('should skip generation when it cannot be claimed', async () => {
      repositoryMock.findPendingForRetry.mockResolvedValue([
        {
          generationId: 'gen-2',
          prompt: 'skip prompt',
          retryCount: 2,
          maxRetries: 4,
          locked: false,
        },
      ])

      repositoryMock.claimForProcessing.mockResolvedValue(false)

      await worker.run()

      expect(repositoryMock.claimForProcessing).toHaveBeenCalledWith('gen-2')
      expect(processorMock.process).not.toHaveBeenCalled()
      expect(repositoryMock.releaseLock).not.toHaveBeenCalled()
    })

    it('should process multiple pending generations', async () => {
      repositoryMock.findPendingForRetry.mockResolvedValue([
        {
          generationId: 'gen-1',
          prompt: 'prompt 1',
          retryCount: 0,
          maxRetries: 4,
          locked: false,
        },
        {
          generationId: 'gen-2',
          prompt: 'prompt 2',
          retryCount: 1,
          maxRetries: 4,
          locked: false,
        },
      ])

      repositoryMock.claimForProcessing
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(true)

      await worker.run()

      expect(processorMock.process).toHaveBeenNthCalledWith(1, 'prompt 1', 'gen-1')
      expect(processorMock.process).toHaveBeenNthCalledWith(2, 'prompt 2', 'gen-2')

      expect(repositoryMock.releaseLock).toHaveBeenCalledTimes(2)
    })

    it('should continue processing when one generation is not claimed', async () => {
      repositoryMock.findPendingForRetry.mockResolvedValue([
        {
          generationId: 'gen-1',
          prompt: 'first',
          retryCount: 0,
          maxRetries: 4,
          locked: false,
        },
        {
          generationId: 'gen-2',
          prompt: 'second',
          retryCount: 1,
          maxRetries: 4,
          locked: false,
        },
      ])

      repositoryMock.claimForProcessing
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(true)

      await worker.run()

      expect(processorMock.process).toHaveBeenCalledTimes(1)
      expect(processorMock.process).toHaveBeenCalledWith('second', 'gen-2')
      expect(repositoryMock.releaseLock).toHaveBeenCalledWith('gen-2')
    })
  })
})
