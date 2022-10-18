import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { OutgoingTaskParam } from './dto/outgoing-task-param';
import { Logger } from '@nestjs/common';

@Injectable()
export default class ParametersService {
  constructor(private readonly http: HttpService) {}

  logger: Logger = new Logger('ParametersService');

  dbApiUrl = process.env.DBAPI_URL || 'http://localhost:3000';

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
        idTarea: taskId,
        NombreParametro: slot,
        Valor: slots[slot],
      });
    });
  }

  updateOrCreateOutgoingTaskParams(uploadParam: OutgoingTaskParam) {
    return this.http.post(
      `${this.dbApiUrl}/outgoing_task_params/update_or_create/`,
      uploadParam,
    );
  }
}
