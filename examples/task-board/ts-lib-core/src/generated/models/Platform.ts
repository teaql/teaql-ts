import { MutationBuilder } from '../../../../../../src';

export class Platform {
        id?: any;
        name?: string;
        founded?: any;
        userEmail?: string;
        version?: any;

    constructor(init?: Partial<Platform>) {
        if (init) Object.assign(this, init);
    }

    auditAs(comment: string): MutationBuilder {
        const action = this.id ? "Update" : "Create";
        return new MutationBuilder("Platform", action, this).auditAs(comment);
    }

    static delete(id: any): MutationBuilder {
        return new MutationBuilder("Platform", "Delete", {}, id);
    }
}