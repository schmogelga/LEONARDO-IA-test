import { Controller, Post, Body, Get, Param, ParseUUIDPipe } from '@nestjs/common'
import { AiService } from './ai.service'
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger'
import { AiRequestDto, GenerationResponseDto } from './ai.dto'

@ApiTags('images')
@Controller('api/generation')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post()
  @ApiOperation({ summary: 'Generate images based on a text prompt' })
  @ApiResponse({
    status: 200,
    description: 'The image generation request has been accepted',
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async generateImage(@Body() aiRequest: AiRequestDto) {
    const generation = await this.aiService.generateImage(aiRequest.prompt)
    return generation
  }

  @Get(':generationId')
  @ApiOperation({ summary: 'Get generation status and result' })
  @ApiParam({
    name: 'generationId',
    description: 'Generation identifier',
    required: true,
  })
  @ApiResponse({ status: 200, description: 'Generation data returned successfully', type: GenerationResponseDto })
  @ApiResponse({ status: 404, description: 'Generation not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getGeneration(@Param('generationId', ParseUUIDPipe) generationId: string) {
    return this.aiService.getGeneration(generationId)
  }
}
