import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { CreateOutgoingTaskParamDto } from './dto/create-outgoing-task-param.dto';
import { Logger } from '@nestjs/common';

@Injectable()
export default class ParametersService {
  constructor(private readonly http: HttpService) {}

  logger: Logger = new Logger('ParametersService');

  dbApiUrl = process.env.DBAPI_URL || 'http://localhost:4000';

  uploadPrefixedSlots(slots: object) {
    const taskId = slots['idTarea'];
    const prefix = process.env.OUTGOING_TASK_PARAM_PREFIX || 'pts_';
    // Filter the slots that start with 'pts_'
    const outgoingSlotKeys = Object.keys(slots).filter((slot) =>
      slot.startsWith(prefix),
    );
    // Log the value of the slots that start with 'pts_'
    outgoingSlotKeys.forEach((slot) => {
      this.logger.debug({ taskId, slot, value: slots[slot] }, 'Outgoing slot');
      this.updateOrCreateOutgoingTaskParams({
        task_id: taskId,
        key: slot,
        value: slots[slot],
      });
    });
  }

  updateOrCreateOutgoingTaskParams(
    createOutgoingTaskParamDto: CreateOutgoingTaskParamDto,
  ) {
    return this.http.post(
      `${this.dbApiUrl}/v3/parameters/outgoing`,
      createOutgoingTaskParamDto,
    );
  }
}
