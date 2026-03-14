// src/modules/public/public.module.ts
import { Module } from '@nestjs/common';
import { PublicController } from './public.controller'; // <— ajuste o nome aqui

@Module({
  controllers: [PublicController], // <— e aqui
})
export class PublicModule {}
