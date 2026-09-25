import {
  BadRequestException,
  Controller,
  Get,
  Query,
} from '@nestjs/common';
import { RepositoryService } from './repository.service';

@Controller('api')
export class RepositoryController {
  constructor(private readonly repositoryService: RepositoryService) {}

  @Get('health')
  health() {
    return {
      ok: true,
      service: 'devcity-api',
    };
  }

  @Get('repository')
  async repository(@Query('repo') repo?: string) {
    if (!repo) {
      throw new BadRequestException('Informe repo=owner/repository.');
    }

    return this.repositoryService.readRepository(repo);
  }
}
