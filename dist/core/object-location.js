"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ObjectLocation = void 0;
function lowerCamel(name) {
    const parts = name.split('_');
    return parts[0] + parts.slice(1).map(part => part ? part[0].toUpperCase() + part.slice(1) : '').join('');
}
function escapeJsonPointer(value) {
    return value.replace(/~/g, '~0').replace(/\//g, '~1');
}
/** A casing-neutral location expressed with canonical KSML property names. */
class ObjectLocation {
    constructor(segments) {
        this.segments = segments;
    }
    static root() { return new ObjectLocation([]); }
    static property(name) { return ObjectLocation.root().property(name); }
    property(name) {
        return new ObjectLocation([...this.segments, { kind: 'property', name }]);
    }
    index(index) {
        return new ObjectLocation([...this.segments, { kind: 'index', index }]);
    }
    modelPath() {
        return this.render(name => name);
    }
    nativePath() {
        return this.render(lowerCamel);
    }
    instancePath() {
        return this.segments.map(segment => segment.kind === 'index'
            ? String(segment.index)
            : escapeJsonPointer(lowerCamel(segment.name))).map(value => `/${value}`).join('');
    }
    toString() { return this.nativePath(); }
    render(propertyName) {
        let result = '';
        for (const segment of this.segments) {
            if (segment.kind === 'index')
                result += `[${segment.index}]`;
            else
                result += `${result ? '.' : ''}${propertyName(segment.name)}`;
        }
        return result;
    }
}
exports.ObjectLocation = ObjectLocation;
//# sourceMappingURL=object-location.js.map