import { Body, Controller, Get, Put } from '@nestjs/common';
import { IsNumber, IsOptional, Min } from 'class-validator';
import { AdminOnly, Public } from '../../auth/http/decorators';
import { PricingService } from '../application/PricingService';

class UpdatePricingDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  normal?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  premiere?: number;
}

@Controller()
export class PricingController {
  constructor(private readonly service: PricingService) {}

  /** Tarifas públicas (landing/admin). */
  @Public()
  @Get('pricing')
  async get() {
    const rates = await this.service.getRates();
    return rates.map((r) => r.toJSON());
  }

  /** Actualiza normal/premiere (sólo admin). */
  @AdminOnly()
  @Put('admin/pricing')
  async update(@Body() dto: UpdatePricingDto) {
    const rates = await this.service.updateRates(dto);
    return rates.map((r) => r.toJSON());
  }
}
