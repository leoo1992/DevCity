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

  @Get('repositories')
  async repositories(@Query('owner') owner?: string) {
    if (!owner) {
      throw new BadRequestException('Informe owner=usuario.');
    }

    return this.repositoryService.listRepositories(owner);
  }

  @Get('repository')
  async repository(@Query('repo') repo?: string) {
    if (!repo) {
      throw new BadRequestException('Informe repo=owner/repository.');
    }

    return this.repositoryService.readRepository(repo);
  }
}
