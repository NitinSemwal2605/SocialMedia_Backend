import { Injectable } from '@nestjs/common';

@Injectable() // decorator for Addding this class to the AppModule
export class AppService {
  getHello(): string {
    return 'Hello World!';
  }
}
