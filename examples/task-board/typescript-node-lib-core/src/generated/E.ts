import type { Decimal, Long, LocalTime, EntityVersion } from 'teaql-ts';
import { Platform } from './models/Platform';
import { TaskStatus } from './models/TaskStatus';
import { Task } from './models/Task';
import { TaskExecutionLog } from './models/TaskExecutionLog';
import { CheckException, integer32Error, ExpressionPath, TeaQLNotLoadedError } from '../teaql-ts';
export { TeaQLNotLoadedError } from '../teaql-ts';

export class ValueExpression<T> {
    constructor(
        private readonly value: T | null | undefined,
        private readonly present = true,
        private readonly notLoaded?: TeaQLNotLoadedError,
        private readonly invalidValue?: CheckException,
    ) {}

    static missing<T>(): ValueExpression<T> {
        return new ValueExpression<T>(undefined, false);
    }

    static notLoaded<T>(error: TeaQLNotLoadedError): ValueExpression<T> {
        return new ValueExpression<T>(undefined, false, error);
    }

    static invalid<T>(error: CheckException): ValueExpression<T> {
        return new ValueExpression<T>(undefined, false, undefined, error);
    }

    eval(): T | null | undefined {
        if (this.notLoaded) throw this.notLoaded.terminal('eval()');
        if (this.invalidValue) throw this.invalidValue;
        return this.present ? this.value : undefined;
    }

    isPresent(): boolean {
        if (this.notLoaded) throw this.notLoaded.terminal('isPresent()');
        if (this.invalidValue) throw this.invalidValue;
        return this.present;
    }

    orElse(fallback: T): T {
        if (this.notLoaded) throw this.notLoaded.terminal('orElse(<fallback>)');
        if (this.invalidValue) throw this.invalidValue;
        const value = this.value;
        return this.present && value != null ? value : fallback;
    }
}

export class PlatformExpression {
    constructor(
        private readonly value: Platform | null | undefined,
        private readonly root = 'Platform(null)',
        private readonly path = ExpressionPath.root('E.platform(<root>)', 'camelCase'),
        private readonly notLoaded?: TeaQLNotLoadedError,
    ) {}

    eval(): Platform | null | undefined {
        if (this.notLoaded) throw this.notLoaded.terminal('eval()');
        return this.value;
    }

    id(): ValueExpression<string> {
        const path = this.path.member('id', 'id');
        if (this.notLoaded) return ValueExpression.notLoaded<string>(this.notLoaded.withPath(path));
        if (!this.value) return ValueExpression.missing<string>();
        if (!this.value.isLoaded('id')) {
            return ValueExpression.notLoaded<string>(
                new TeaQLNotLoadedError(path.markMissing(), 'id'),
            );
        }
        return new ValueExpression<string>(this.value.id);
    }

    name(): ValueExpression<string> {
        const path = this.path.member('name', 'name');
        if (this.notLoaded) return ValueExpression.notLoaded<string>(this.notLoaded.withPath(path));
        if (!this.value) return ValueExpression.missing<string>();
        if (!this.value.isLoaded('name')) {
            return ValueExpression.notLoaded<string>(
                new TeaQLNotLoadedError(path.markMissing(), 'name'),
            );
        }
        return new ValueExpression<string>(this.value.name);
    }

    founded(): ValueExpression<string> {
        const path = this.path.member('founded', 'founded');
        if (this.notLoaded) return ValueExpression.notLoaded<string>(this.notLoaded.withPath(path));
        if (!this.value) return ValueExpression.missing<string>();
        if (!this.value.isLoaded('founded')) {
            return ValueExpression.notLoaded<string>(
                new TeaQLNotLoadedError(path.markMissing(), 'founded'),
            );
        }
        return new ValueExpression<string>(this.value.founded);
    }

    userEmail(): ValueExpression<string> {
        const path = this.path.member('user_email', 'userEmail');
        if (this.notLoaded) return ValueExpression.notLoaded<string>(this.notLoaded.withPath(path));
        if (!this.value) return ValueExpression.missing<string>();
        if (!this.value.isLoaded('userEmail')) {
            return ValueExpression.notLoaded<string>(
                new TeaQLNotLoadedError(path.markMissing(), 'user_email'),
            );
        }
        return new ValueExpression<string>(this.value.userEmail);
    }

    version(): ValueExpression<EntityVersion> {
        const path = this.path.member('version', 'version');
        if (this.notLoaded) return ValueExpression.notLoaded<EntityVersion>(this.notLoaded.withPath(path));
        if (!this.value) return ValueExpression.missing<EntityVersion>();
        if (!this.value.isLoaded('version')) {
            return ValueExpression.notLoaded<EntityVersion>(
                new TeaQLNotLoadedError(path.markMissing(), 'version'),
            );
        }
        return new ValueExpression<EntityVersion>(this.value.version);
    }



    taskStatusList(): TaskStatusListExpression {
        const path = this.path.member('task_status_list', 'taskStatusList');
        if (this.notLoaded) {
            return new TaskStatusListExpression([], this.root, path, false, this.notLoaded.withPath(path));
        }
        if (!this.value) return TaskStatusListExpression.missing(this.root, path);
        if (!this.value.isLoaded('taskStatusList')) {
            return new TaskStatusListExpression([], this.root, path, false,
                new TeaQLNotLoadedError(path.markMissing(), 'task_status_list'));
        }
        return new TaskStatusListExpression(
            this.value.taskStatusList(), this.root, path,
        );
    }

    taskList(): TaskListExpression {
        const path = this.path.member('task_list', 'taskList');
        if (this.notLoaded) {
            return new TaskListExpression([], this.root, path, false, this.notLoaded.withPath(path));
        }
        if (!this.value) return TaskListExpression.missing(this.root, path);
        if (!this.value.isLoaded('taskList')) {
            return new TaskListExpression([], this.root, path, false,
                new TeaQLNotLoadedError(path.markMissing(), 'task_list'));
        }
        return new TaskListExpression(
            this.value.taskList(), this.root, path,
        );
    }
}

export class TaskStatusExpression {
    constructor(
        private readonly value: TaskStatus | null | undefined,
        private readonly root = 'TaskStatus(null)',
        private readonly path = ExpressionPath.root('E.taskStatus(<root>)', 'camelCase'),
        private readonly notLoaded?: TeaQLNotLoadedError,
    ) {}

    eval(): TaskStatus | null | undefined {
        if (this.notLoaded) throw this.notLoaded.terminal('eval()');
        return this.value;
    }

    id(): ValueExpression<string> {
        const path = this.path.member('id', 'id');
        if (this.notLoaded) return ValueExpression.notLoaded<string>(this.notLoaded.withPath(path));
        if (!this.value) return ValueExpression.missing<string>();
        if (!this.value.isLoaded('id')) {
            return ValueExpression.notLoaded<string>(
                new TeaQLNotLoadedError(path.markMissing(), 'id'),
            );
        }
        return new ValueExpression<string>(this.value.id);
    }

    name(): ValueExpression<string> {
        const path = this.path.member('name', 'name');
        if (this.notLoaded) return ValueExpression.notLoaded<string>(this.notLoaded.withPath(path));
        if (!this.value) return ValueExpression.missing<string>();
        if (!this.value.isLoaded('name')) {
            return ValueExpression.notLoaded<string>(
                new TeaQLNotLoadedError(path.markMissing(), 'name'),
            );
        }
        return new ValueExpression<string>(this.value.name);
    }

    code(): ValueExpression<string> {
        const path = this.path.member('code', 'code');
        if (this.notLoaded) return ValueExpression.notLoaded<string>(this.notLoaded.withPath(path));
        if (!this.value) return ValueExpression.missing<string>();
        if (!this.value.isLoaded('code')) {
            return ValueExpression.notLoaded<string>(
                new TeaQLNotLoadedError(path.markMissing(), 'code'),
            );
        }
        return new ValueExpression<string>(this.value.code);
    }

    color(): ValueExpression<string> {
        const path = this.path.member('color', 'color');
        if (this.notLoaded) return ValueExpression.notLoaded<string>(this.notLoaded.withPath(path));
        if (!this.value) return ValueExpression.missing<string>();
        if (!this.value.isLoaded('color')) {
            return ValueExpression.notLoaded<string>(
                new TeaQLNotLoadedError(path.markMissing(), 'color'),
            );
        }
        return new ValueExpression<string>(this.value.color);
    }

    displayOrder(): ValueExpression<Decimal> {
        const path = this.path.member('display_order', 'displayOrder');
        if (this.notLoaded) return ValueExpression.notLoaded<Decimal>(this.notLoaded.withPath(path));
        if (!this.value) return ValueExpression.missing<Decimal>();
        if (!this.value.isLoaded('displayOrder')) {
            return ValueExpression.notLoaded<Decimal>(
                new TeaQLNotLoadedError(path.markMissing(), 'display_order'),
            );
        }
        return new ValueExpression<Decimal>(this.value.displayOrder);
    }

    progress(): ValueExpression<Decimal> {
        const path = this.path.member('progress', 'progress');
        if (this.notLoaded) return ValueExpression.notLoaded<Decimal>(this.notLoaded.withPath(path));
        if (!this.value) return ValueExpression.missing<Decimal>();
        if (!this.value.isLoaded('progress')) {
            return ValueExpression.notLoaded<Decimal>(
                new TeaQLNotLoadedError(path.markMissing(), 'progress'),
            );
        }
        return new ValueExpression<Decimal>(this.value.progress);
    }

    version(): ValueExpression<EntityVersion> {
        const path = this.path.member('version', 'version');
        if (this.notLoaded) return ValueExpression.notLoaded<EntityVersion>(this.notLoaded.withPath(path));
        if (!this.value) return ValueExpression.missing<EntityVersion>();
        if (!this.value.isLoaded('version')) {
            return ValueExpression.notLoaded<EntityVersion>(
                new TeaQLNotLoadedError(path.markMissing(), 'version'),
            );
        }
        return new ValueExpression<EntityVersion>(this.value.version);
    }

    platformId(): ValueExpression<string | number> {
        const path = this.path.member('platform', 'platformId');
        if (this.notLoaded) return ValueExpression.notLoaded<string | number>(this.notLoaded.withPath(path));
        if (!this.value) return ValueExpression.missing<string | number>();
        if (!this.value.isLoaded('platform')) {
            return ValueExpression.notLoaded<string | number>(
                new TeaQLNotLoadedError(path.markMissing(), 'platform'),
            );
        }
        const reference = this.value.platform;
        return new ValueExpression<string | number>(
            reference instanceof Platform
                ? reference.id : reference as string | number | undefined,
        );
    }

    platform(): PlatformExpression {
        const path = this.path.member('platform', 'platform');
        if (this.notLoaded) {
            return new PlatformExpression(undefined, this.root, path, this.notLoaded.withPath(path));
        }
        if (!this.value) return new PlatformExpression(undefined, this.root, path);
        if (!this.value.isLoaded('platform')) {
            return new PlatformExpression(undefined, this.root, path,
                new TeaQLNotLoadedError(path.markMissing(), 'platform'));
        }
        const relation = this.value.platform;
        // An available FK is not an eagerly loaded relation. Keep the FK
        // readable through the Id accessor, without fabricating a child object.
        if (relation != null && !(relation instanceof Platform)) {
            return new PlatformExpression(undefined, this.root, path,
                new TeaQLNotLoadedError(path.markMissing(), 'platform'));
        }
        const target = relation instanceof Platform ? relation : undefined;
        return new PlatformExpression(target, this.root, path);
    }

    taskList(): TaskListExpression {
        const path = this.path.member('task_list', 'taskList');
        if (this.notLoaded) {
            return new TaskListExpression([], this.root, path, false, this.notLoaded.withPath(path));
        }
        if (!this.value) return TaskListExpression.missing(this.root, path);
        if (!this.value.isLoaded('taskList')) {
            return new TaskListExpression([], this.root, path, false,
                new TeaQLNotLoadedError(path.markMissing(), 'task_list'));
        }
        return new TaskListExpression(
            this.value.taskList(), this.root, path,
        );
    }
}

export class TaskExpression {
    constructor(
        private readonly value: Task | null | undefined,
        private readonly root = 'Task(null)',
        private readonly path = ExpressionPath.root('E.task(<root>)', 'camelCase'),
        private readonly notLoaded?: TeaQLNotLoadedError,
    ) {}

    eval(): Task | null | undefined {
        if (this.notLoaded) throw this.notLoaded.terminal('eval()');
        return this.value;
    }

    id(): ValueExpression<string> {
        const path = this.path.member('id', 'id');
        if (this.notLoaded) return ValueExpression.notLoaded<string>(this.notLoaded.withPath(path));
        if (!this.value) return ValueExpression.missing<string>();
        if (!this.value.isLoaded('id')) {
            return ValueExpression.notLoaded<string>(
                new TeaQLNotLoadedError(path.markMissing(), 'id'),
            );
        }
        return new ValueExpression<string>(this.value.id);
    }

    name(): ValueExpression<string> {
        const path = this.path.member('name', 'name');
        if (this.notLoaded) return ValueExpression.notLoaded<string>(this.notLoaded.withPath(path));
        if (!this.value) return ValueExpression.missing<string>();
        if (!this.value.isLoaded('name')) {
            return ValueExpression.notLoaded<string>(
                new TeaQLNotLoadedError(path.markMissing(), 'name'),
            );
        }
        return new ValueExpression<string>(this.value.name);
    }

    version(): ValueExpression<EntityVersion> {
        const path = this.path.member('version', 'version');
        if (this.notLoaded) return ValueExpression.notLoaded<EntityVersion>(this.notLoaded.withPath(path));
        if (!this.value) return ValueExpression.missing<EntityVersion>();
        if (!this.value.isLoaded('version')) {
            return ValueExpression.notLoaded<EntityVersion>(
                new TeaQLNotLoadedError(path.markMissing(), 'version'),
            );
        }
        return new ValueExpression<EntityVersion>(this.value.version);
    }

    statusId(): ValueExpression<string | number> {
        const path = this.path.member('status', 'statusId');
        if (this.notLoaded) return ValueExpression.notLoaded<string | number>(this.notLoaded.withPath(path));
        if (!this.value) return ValueExpression.missing<string | number>();
        if (!this.value.isLoaded('status')) {
            return ValueExpression.notLoaded<string | number>(
                new TeaQLNotLoadedError(path.markMissing(), 'status'),
            );
        }
        const reference = this.value.status;
        return new ValueExpression<string | number>(
            reference instanceof TaskStatus
                ? reference.id : reference as string | number | undefined,
        );
    }

    platformId(): ValueExpression<string | number> {
        const path = this.path.member('platform', 'platformId');
        if (this.notLoaded) return ValueExpression.notLoaded<string | number>(this.notLoaded.withPath(path));
        if (!this.value) return ValueExpression.missing<string | number>();
        if (!this.value.isLoaded('platform')) {
            return ValueExpression.notLoaded<string | number>(
                new TeaQLNotLoadedError(path.markMissing(), 'platform'),
            );
        }
        const reference = this.value.platform;
        return new ValueExpression<string | number>(
            reference instanceof Platform
                ? reference.id : reference as string | number | undefined,
        );
    }

    status(): TaskStatusExpression {
        const path = this.path.member('status', 'status');
        if (this.notLoaded) {
            return new TaskStatusExpression(undefined, this.root, path, this.notLoaded.withPath(path));
        }
        if (!this.value) return new TaskStatusExpression(undefined, this.root, path);
        if (!this.value.isLoaded('status')) {
            return new TaskStatusExpression(undefined, this.root, path,
                new TeaQLNotLoadedError(path.markMissing(), 'status'));
        }
        const relation = this.value.status;
        // An available FK is not an eagerly loaded relation. Keep the FK
        // readable through the Id accessor, without fabricating a child object.
        if (relation != null && !(relation instanceof TaskStatus)) {
            return new TaskStatusExpression(undefined, this.root, path,
                new TeaQLNotLoadedError(path.markMissing(), 'status'));
        }
        const target = relation instanceof TaskStatus ? relation : undefined;
        return new TaskStatusExpression(target, this.root, path);
    }

    platform(): PlatformExpression {
        const path = this.path.member('platform', 'platform');
        if (this.notLoaded) {
            return new PlatformExpression(undefined, this.root, path, this.notLoaded.withPath(path));
        }
        if (!this.value) return new PlatformExpression(undefined, this.root, path);
        if (!this.value.isLoaded('platform')) {
            return new PlatformExpression(undefined, this.root, path,
                new TeaQLNotLoadedError(path.markMissing(), 'platform'));
        }
        const relation = this.value.platform;
        // An available FK is not an eagerly loaded relation. Keep the FK
        // readable through the Id accessor, without fabricating a child object.
        if (relation != null && !(relation instanceof Platform)) {
            return new PlatformExpression(undefined, this.root, path,
                new TeaQLNotLoadedError(path.markMissing(), 'platform'));
        }
        const target = relation instanceof Platform ? relation : undefined;
        return new PlatformExpression(target, this.root, path);
    }

    taskExecutionLogList(): TaskExecutionLogListExpression {
        const path = this.path.member('task_execution_log_list', 'taskExecutionLogList');
        if (this.notLoaded) {
            return new TaskExecutionLogListExpression([], this.root, path, false, this.notLoaded.withPath(path));
        }
        if (!this.value) return TaskExecutionLogListExpression.missing(this.root, path);
        if (!this.value.isLoaded('taskExecutionLogList')) {
            return new TaskExecutionLogListExpression([], this.root, path, false,
                new TeaQLNotLoadedError(path.markMissing(), 'task_execution_log_list'));
        }
        return new TaskExecutionLogListExpression(
            this.value.taskExecutionLogList(), this.root, path,
        );
    }
}

export class TaskExecutionLogExpression {
    constructor(
        private readonly value: TaskExecutionLog | null | undefined,
        private readonly root = 'TaskExecutionLog(null)',
        private readonly path = ExpressionPath.root('E.taskExecutionLog(<root>)', 'camelCase'),
        private readonly notLoaded?: TeaQLNotLoadedError,
    ) {}

    eval(): TaskExecutionLog | null | undefined {
        if (this.notLoaded) throw this.notLoaded.terminal('eval()');
        return this.value;
    }

    id(): ValueExpression<string> {
        const path = this.path.member('id', 'id');
        if (this.notLoaded) return ValueExpression.notLoaded<string>(this.notLoaded.withPath(path));
        if (!this.value) return ValueExpression.missing<string>();
        if (!this.value.isLoaded('id')) {
            return ValueExpression.notLoaded<string>(
                new TeaQLNotLoadedError(path.markMissing(), 'id'),
            );
        }
        return new ValueExpression<string>(this.value.id);
    }

    action(): ValueExpression<string> {
        const path = this.path.member('action', 'action');
        if (this.notLoaded) return ValueExpression.notLoaded<string>(this.notLoaded.withPath(path));
        if (!this.value) return ValueExpression.missing<string>();
        if (!this.value.isLoaded('action')) {
            return ValueExpression.notLoaded<string>(
                new TeaQLNotLoadedError(path.markMissing(), 'action'),
            );
        }
        return new ValueExpression<string>(this.value.action);
    }

    detail(): ValueExpression<string> {
        const path = this.path.member('detail', 'detail');
        if (this.notLoaded) return ValueExpression.notLoaded<string>(this.notLoaded.withPath(path));
        if (!this.value) return ValueExpression.missing<string>();
        if (!this.value.isLoaded('detail')) {
            return ValueExpression.notLoaded<string>(
                new TeaQLNotLoadedError(path.markMissing(), 'detail'),
            );
        }
        return new ValueExpression<string>(this.value.detail);
    }

    version(): ValueExpression<EntityVersion> {
        const path = this.path.member('version', 'version');
        if (this.notLoaded) return ValueExpression.notLoaded<EntityVersion>(this.notLoaded.withPath(path));
        if (!this.value) return ValueExpression.missing<EntityVersion>();
        if (!this.value.isLoaded('version')) {
            return ValueExpression.notLoaded<EntityVersion>(
                new TeaQLNotLoadedError(path.markMissing(), 'version'),
            );
        }
        return new ValueExpression<EntityVersion>(this.value.version);
    }

    taskId(): ValueExpression<string | number> {
        const path = this.path.member('task', 'taskId');
        if (this.notLoaded) return ValueExpression.notLoaded<string | number>(this.notLoaded.withPath(path));
        if (!this.value) return ValueExpression.missing<string | number>();
        if (!this.value.isLoaded('task')) {
            return ValueExpression.notLoaded<string | number>(
                new TeaQLNotLoadedError(path.markMissing(), 'task'),
            );
        }
        const reference = this.value.task;
        return new ValueExpression<string | number>(
            reference instanceof Task
                ? reference.id : reference as string | number | undefined,
        );
    }

    task(): TaskExpression {
        const path = this.path.member('task', 'task');
        if (this.notLoaded) {
            return new TaskExpression(undefined, this.root, path, this.notLoaded.withPath(path));
        }
        if (!this.value) return new TaskExpression(undefined, this.root, path);
        if (!this.value.isLoaded('task')) {
            return new TaskExpression(undefined, this.root, path,
                new TeaQLNotLoadedError(path.markMissing(), 'task'));
        }
        const relation = this.value.task;
        // An available FK is not an eagerly loaded relation. Keep the FK
        // readable through the Id accessor, without fabricating a child object.
        if (relation != null && !(relation instanceof Task)) {
            return new TaskExpression(undefined, this.root, path,
                new TeaQLNotLoadedError(path.markMissing(), 'task'));
        }
        const target = relation instanceof Task ? relation : undefined;
        return new TaskExpression(target, this.root, path);
    }

}

export class PlatformListExpression {
    constructor(
        private readonly items: readonly Platform[],
        private readonly root = 'Platform(null)',
        private readonly path = ExpressionPath.root('E.entity(<root>)', 'camelCase'),
        private readonly present = true,
        private readonly notLoaded?: TeaQLNotLoadedError,
    ) {}

    static missing(root?: string, path = ExpressionPath.root('E.entity(<root>)', 'camelCase')): PlatformListExpression {
        return new PlatformListExpression([], root, path, false);
    }

    size(): ValueExpression<number> {
        if (this.notLoaded) return ValueExpression.notLoaded<number>(this.notLoaded.withPath(this.path.operation('size()')));
        return this.present
            ? new ValueExpression<number>(this.items.length)
            : ValueExpression.missing<number>();
    }

    first(): PlatformExpression {
        return this.item(0, true);
    }

    get(index: number): PlatformExpression {
        return this.item(index, false);
    }

    private item(index: number, first: boolean): PlatformExpression {
        const itemPath = this.path.index(index, first);
        if (this.notLoaded) {
            return new PlatformExpression(undefined, this.root, itemPath, this.notLoaded.withPath(itemPath));
        }
        return !this.present || index < 0 || index >= this.items.length
            ? new PlatformExpression(undefined, this.root, itemPath)
            : new PlatformExpression(this.items[index], this.root, itemPath);
    }
}

export class TaskStatusListExpression {
    constructor(
        private readonly items: readonly TaskStatus[],
        private readonly root = 'TaskStatus(null)',
        private readonly path = ExpressionPath.root('E.entity(<root>)', 'camelCase'),
        private readonly present = true,
        private readonly notLoaded?: TeaQLNotLoadedError,
    ) {}

    static missing(root?: string, path = ExpressionPath.root('E.entity(<root>)', 'camelCase')): TaskStatusListExpression {
        return new TaskStatusListExpression([], root, path, false);
    }

    size(): ValueExpression<number> {
        if (this.notLoaded) return ValueExpression.notLoaded<number>(this.notLoaded.withPath(this.path.operation('size()')));
        return this.present
            ? new ValueExpression<number>(this.items.length)
            : ValueExpression.missing<number>();
    }

    first(): TaskStatusExpression {
        return this.item(0, true);
    }

    get(index: number): TaskStatusExpression {
        return this.item(index, false);
    }

    private item(index: number, first: boolean): TaskStatusExpression {
        const itemPath = this.path.index(index, first);
        if (this.notLoaded) {
            return new TaskStatusExpression(undefined, this.root, itemPath, this.notLoaded.withPath(itemPath));
        }
        return !this.present || index < 0 || index >= this.items.length
            ? new TaskStatusExpression(undefined, this.root, itemPath)
            : new TaskStatusExpression(this.items[index], this.root, itemPath);
    }
}

export class TaskListExpression {
    constructor(
        private readonly items: readonly Task[],
        private readonly root = 'Task(null)',
        private readonly path = ExpressionPath.root('E.entity(<root>)', 'camelCase'),
        private readonly present = true,
        private readonly notLoaded?: TeaQLNotLoadedError,
    ) {}

    static missing(root?: string, path = ExpressionPath.root('E.entity(<root>)', 'camelCase')): TaskListExpression {
        return new TaskListExpression([], root, path, false);
    }

    size(): ValueExpression<number> {
        if (this.notLoaded) return ValueExpression.notLoaded<number>(this.notLoaded.withPath(this.path.operation('size()')));
        return this.present
            ? new ValueExpression<number>(this.items.length)
            : ValueExpression.missing<number>();
    }

    first(): TaskExpression {
        return this.item(0, true);
    }

    get(index: number): TaskExpression {
        return this.item(index, false);
    }

    private item(index: number, first: boolean): TaskExpression {
        const itemPath = this.path.index(index, first);
        if (this.notLoaded) {
            return new TaskExpression(undefined, this.root, itemPath, this.notLoaded.withPath(itemPath));
        }
        return !this.present || index < 0 || index >= this.items.length
            ? new TaskExpression(undefined, this.root, itemPath)
            : new TaskExpression(this.items[index], this.root, itemPath);
    }
}

export class TaskExecutionLogListExpression {
    constructor(
        private readonly items: readonly TaskExecutionLog[],
        private readonly root = 'TaskExecutionLog(null)',
        private readonly path = ExpressionPath.root('E.entity(<root>)', 'camelCase'),
        private readonly present = true,
        private readonly notLoaded?: TeaQLNotLoadedError,
    ) {}

    static missing(root?: string, path = ExpressionPath.root('E.entity(<root>)', 'camelCase')): TaskExecutionLogListExpression {
        return new TaskExecutionLogListExpression([], root, path, false);
    }

    size(): ValueExpression<number> {
        if (this.notLoaded) return ValueExpression.notLoaded<number>(this.notLoaded.withPath(this.path.operation('size()')));
        return this.present
            ? new ValueExpression<number>(this.items.length)
            : ValueExpression.missing<number>();
    }

    first(): TaskExecutionLogExpression {
        return this.item(0, true);
    }

    get(index: number): TaskExecutionLogExpression {
        return this.item(index, false);
    }

    private item(index: number, first: boolean): TaskExecutionLogExpression {
        const itemPath = this.path.index(index, first);
        if (this.notLoaded) {
            return new TaskExecutionLogExpression(undefined, this.root, itemPath, this.notLoaded.withPath(itemPath));
        }
        return !this.present || index < 0 || index >= this.items.length
            ? new TaskExecutionLogExpression(undefined, this.root, itemPath)
            : new TaskExecutionLogExpression(this.items[index], this.root, itemPath);
    }
}

export class E {
    static platform(
        value: Platform | null | undefined,
    ): PlatformExpression {
        return new PlatformExpression(
            value, 'Platform', ExpressionPath.root('E.platform(<root>)', 'camelCase'),
        );
    }

    static taskStatus(
        value: TaskStatus | null | undefined,
    ): TaskStatusExpression {
        return new TaskStatusExpression(
            value, 'TaskStatus', ExpressionPath.root('E.taskStatus(<root>)', 'camelCase'),
        );
    }

    static task(
        value: Task | null | undefined,
    ): TaskExpression {
        return new TaskExpression(
            value, 'Task', ExpressionPath.root('E.task(<root>)', 'camelCase'),
        );
    }

    static taskExecutionLog(
        value: TaskExecutionLog | null | undefined,
    ): TaskExecutionLogExpression {
        return new TaskExecutionLogExpression(
            value, 'TaskExecutionLog', ExpressionPath.root('E.taskExecutionLog(<root>)', 'camelCase'),
        );
    }
}