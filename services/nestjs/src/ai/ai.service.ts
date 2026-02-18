import { Injectable, NotFoundException, OnModuleDestroy } from '@nestjs/common'
import { PrismaClient, generation_status } from '@prisma/client'
import { GenerationProcessor } from './generation.processor'
import { GenerationRepository } from './generation.repository'

@Injectable()
export class AiService implements OnModuleDestroy {
  constructor(
    private readonly generationRepository: GenerationRepository,
    private readonly generationProcessor: GenerationProcessor
  ) {}

  async onModuleDestroy() {}

  async generateImage(prompt: string) {
    try {
      const generation = await this.generationRepository.create(prompt)
      const generationId = generation.generationId

      console.log('generationId', generationId)

      // Start the image generation process in the background
      // Using Promise.resolve().then() to ensure it runs in the next tick
      Promise.resolve().then(async () => {
        try {
          await this.generationProcessor.process(prompt, generationId)
        } catch (error) {
          console.error('Background processing failed:', error)
        }
      })

      // Return the generationId immediately
      return { generationId }
    } catch (error) {
      throw new Error(`Failed to initiate image generation: ${error}`)
    }
  }

  async getGeneration(generationId: string) {
    console.log('getting generation for generationId: ', generationId)
    const generation = await this.generationRepository.findByGenerationId(generationId)

    if (!generation) {
      throw new NotFoundException('Generation not found')
    }

    return {
      generationId: generation.generationId,
      prompt: generation.prompt,
      status: generation.status,
      imageUrls: generation.status === generation_status.COMPLETE ? [] : null,
    }
  }
}
