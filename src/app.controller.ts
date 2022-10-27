import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get('version')
  getVersion(): string {
    return '1.0.2';
  }
}
