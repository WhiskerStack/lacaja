import { AUDIOVISUAL_TYPES } from '@dahem/domain';
import { Body, Controller, Get, Put } from '@nestjs/common';
import { Type } from 'class-transformer';
import { ArrayNotEmpty, IsIn, IsNumber, Min, ValidateNested } from 'class-validator';
import { AdminOnly, Public } from '../../auth/http/decorators';
import { PricingService } from '../application/PricingService';

class PriceRateRowDto {
  @IsIn(AUDIOVISUAL_TYPES)
  type!: (typeof AUDIOVISUAL_TYPES)[number];

  @IsIn(['normal', 'premiere'])
  key!: 'normal' | 'premiere';

  @IsNumber()
  @Min(0)
  priceCup!: number;
}

class UpdatePricingDto {
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => PriceRateRowDto)
  rates!: PriceRateRowDto[];
}

@Controller()
export class PricingController {
  constructor(private readonly service: PricingService) {}

  /** Tarifas públicas por tipo (landing/admin). */
  @Public()
  @Get('pricing')
  async get() {
    const rates = await this.service.getRates();
    return rates.map((r) => r.toJSON());
  }

  /** Actualiza las tarifas por tipo (sólo admin). */
  @AdminOnly()
  @Put('admin/pricing')
  async update(@Body() dto: UpdatePricingDto) {
    const rates = await this.service.updateRates(dto.rates);
    return rates.map((r) => r.toJSON());
  }
}
