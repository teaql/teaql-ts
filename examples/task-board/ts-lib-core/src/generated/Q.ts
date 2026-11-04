import { TeaQLClient } from '../teaql-ts';
import { PlatformRequest } from './requests/PlatformRequest';
import { TaskStatusRequest } from './requests/TaskStatusRequest';
import { TaskRequest } from './requests/TaskRequest';
import { TaskExecutionLogRequest } from './requests/TaskExecutionLogRequest';

export class Q {
    static platforms(): PlatformRequest {
        return new PlatformRequest(false);
    }

    static platformsWithMinimalFields(): PlatformRequest {
        return new PlatformRequest(true);
    }
    static taskStatuses(): TaskStatusRequest {
        return new TaskStatusRequest(false);
    }

    static taskStatusesWithMinimalFields(): TaskStatusRequest {
        return new TaskStatusRequest(true);
    }
    static tasks(): TaskRequest {
        return new TaskRequest(false);
    }

    static tasksWithMinimalFields(): TaskRequest {
        return new TaskRequest(true);
    }
    static taskExecutionLogs(): TaskExecutionLogRequest {
        return new TaskExecutionLogRequest(false);
    }

    static taskExecutionLogsWithMinimalFields(): TaskExecutionLogRequest {
        return new TaskExecutionLogRequest(true);
    }
}