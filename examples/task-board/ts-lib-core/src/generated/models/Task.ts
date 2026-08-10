import { MutationBuilder } from '../../../../../../src';

export class Task {
        id?: any;
        name?: string;
        status?: any;
        platform?: any;
        version?: any;

    constructor(init?: Partial<Task>) {
        if (init) Object.assign(this, init);
    }

    auditAs(comment: string): MutationBuilder {
        const action = this.id ? "Update" : "Create";
        return new MutationBuilder("Task", action, this).auditAs(comment);
    }

    static delete(id: any): MutationBuilder {
        return new MutationBuilder("Task", "Delete", {}, id);
    }
}