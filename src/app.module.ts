import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { AppController } from '@/app.controller';
import { AppService } from '@/app.service';
import { PrismaModule } from '@/prisma/prisma.module';
import { CustomersModule } from '@/modules/customers/customers.module';
import { VehiclesModule } from '@/modules/vehicles/vehicles.module';
import { WorkOrdersModule } from '@/modules/workorders/workorders.module';
import { ServicesModule } from '@/modules/services/services.module';
import { PartsModule } from '@/modules/parts/parts.module';
import { PublicModule } from '@/modules/public/public.module';
import { MetricsModule } from '@/modules/metrics/metrics.module';
import { HealthModule } from '@/modules/health/health.module';
import { AuthModule } from '@/auth/auth.module';
import { JwtAuthGuard } from '@/auth/jwt-auth.guard';
import { CpfAuthGuard } from '@/auth/cpf-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
    }),
    AuthModule,
    PrismaModule,
    CustomersModule,
    VehiclesModule,
    WorkOrdersModule,
    ServicesModule,
    PartsModule,
    PublicModule,
    MetricsModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: CpfAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
