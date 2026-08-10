import { TeaQLClient } from '../index';
import { PlatformRequest } from './requests/PlatformRequest';
import { TaskStatusRequest } from './requests/TaskStatusRequest';
import { TaskRequest } from './requests/TaskRequest';
import { TaskExecutionLogRequest } from './requests/TaskExecutionLogRequest';

export class Q {
    static platforms(): PlatformRequest {
        return new PlatformRequest();
    }
    static taskStatuses(): TaskStatusRequest {
        return new TaskStatusRequest();
    }
    static tasks(): TaskRequest {
        return new TaskRequest();
    }
    static taskExecutionLogs(): TaskExecutionLogRequest {
        return new TaskExecutionLogRequest();
    }
}