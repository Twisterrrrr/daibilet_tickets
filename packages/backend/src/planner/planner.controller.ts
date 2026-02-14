import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PlannerService } from './planner.service';
import { CalculatePlanDto } from './dto/calculate-plan.dto';
import { CustomizePlanDto } from './dto/customize-plan.dto';

@ApiTags('planner')
@Controller('planner')
export class PlannerController {
  constructor(private readonly plannerService: PlannerService) {}

  @Post('calculate')
  @ApiOperation({ summary: 'Подобрать программу посещения города' })
  calculate(@Body() dto: CalculatePlanDto) {
    return this.plannerService.calculate(dto);
  }

  @Post('customize')
  @ApiOperation({ summary: 'Заменить событие в программе' })
  customize(@Body() body: CustomizePlanDto) {
    return this.plannerService.customize(body);
  }
}
