import { MutationBuilder } from '../../../../../../src';

export class TaskExecutionLog {
        id?: any;
        task?: any;
        action?: string;
        detail?: string;
        version?: any;

    constructor(init?: Partial<TaskExecutionLog>) {
        if (init) Object.assign(this, init);
    }

    auditAs(comment: string): MutationBuilder {
        const action = this.id ? "Update" : "Create";
        return new MutationBuilder("TaskExecutionLog", action, this).auditAs(comment);
    }

    static delete(id: any): MutationBuilder {
        return new MutationBuilder("TaskExecutionLog", "Delete", {}, id);
    }
}