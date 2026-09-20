import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service.js';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {} // Here we're injecting the AppService

  @Get() // This is a decorator that tells NestJS that this method should be called when a GET request is made to the root URL.
  getHello(): string {
    return this.appService.getHello();
  }
}
