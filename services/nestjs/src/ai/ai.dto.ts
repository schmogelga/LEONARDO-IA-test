import { ApiProperty } from '@nestjs/swagger'
import { generation_status } from '@prisma/client'

export class AiRequestDto {
  @ApiProperty({
    description: 'The text prompt for image generation',
    example: 'A beautiful sunset over a calm ocean',
  })
  prompt: string
}

class GenerationImageDto {
  @ApiProperty({
    example: 'https://cdn.example.com/image.png',
  })
  url: string
}

export class GenerationResponseDto {
  @ApiProperty({ example: 'uuid' })
  generationId: string

  @ApiProperty({ example: 'A beautiful sunset over a calm ocean' })
  prompt: string

  @ApiProperty({
    enum: generation_status,
    example: generation_status.COMPLETE,
  })
  status: generation_status

  @ApiProperty({
    description: 'Generated images',
    type: [GenerationImageDto],
  })
  images: GenerationImageDto[]
}
