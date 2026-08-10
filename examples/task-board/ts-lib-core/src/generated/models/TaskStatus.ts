import { MutationBuilder } from '../../../../../../src';

export class TaskStatus {
        id?: any;
        name?: string;
        code?: string;
        color?: string;
        displayOrder?: number;
        progress?: number;
        platform?: any;
        version?: any;

    constructor(init?: Partial<TaskStatus>) {
        if (init) Object.assign(this, init);
    }

    auditAs(comment: string): MutationBuilder {
        const action = this.id ? "Update" : "Create";
        return new MutationBuilder("TaskStatus", action, this).auditAs(comment);
    }

    static delete(id: any): MutationBuilder {
        return new MutationBuilder("TaskStatus", "Delete", {}, id);
    }
}