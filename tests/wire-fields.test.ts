import {
  createWireEntityMetadata,
  encodeWireOutput,
  normalizeWireInput,
  retainSubmittedPaths,
  WireInputError,
} from '../src/core/wire-fields';
import { ObjectLocation } from '../src/core/object-location';

describe('generated wire-field metadata reference adapter', () => {
  test.each([
    ['camelCase', 'userUrl', 'apiClientUrl'],
    ['snake_case', 'user_url', 'api_client_url'],
    ['PascalCase', 'UserUrl', 'ApiClientUrl'],
  ] as const)('uses explicit %s metadata without serializer defaults', (profile, userUrl, apiClientUrl) => {
    const metadata = createWireEntityMetadata(
      'UserProfile', ['user_url', 'api_client_url'], profile,
    );
    expect(metadata.fields.user_url.wireName).toBe(userUrl);
    expect(encodeWireOutput({ user_url: '/u', api_client_url: '/api' }, metadata))
      .toEqual({ [userUrl]: '/u', [apiClientUrl]: '/api' });
    expect(normalizeWireInput({ [userUrl]: '/u' }, metadata).values)
      .toEqual({ user_url: '/u' });
  });

  it('retains the exact submitted pointer for a declared legacy alias', () => {
    const metadata = createWireEntityMetadata(
      'UserProfile', ['user_url'], 'camelCase', { user_url: ['user_url'] },
    );
    const normalized = normalizeWireInput({ user_url: '/legacy' }, metadata, '/profile');
    expect(normalized.values).toEqual({ user_url: '/legacy' });
    expect(normalized.sourceInstancePaths).toEqual({ user_url: '/profile/user_url' });
    expect(retainSubmittedPaths([{
      ruleId: 'required', entityType: 'UserProfile',
      location: ObjectLocation.property('user_url'),
    }], normalized)[0]).toMatchObject({
      sourceInstancePath: '/profile/user_url',
      location: ObjectLocation.property('user_url'),
    });
  });

  it('rejects canonical and alias spellings before checker or mutation execution', () => {
    const metadata = createWireEntityMetadata(
      'UserProfile', ['user_url'], 'camelCase', { user_url: ['user_url'] },
    );
    expect(() => normalizeWireInput({ userUrl: '/new', user_url: '/old' }, metadata))
      .toThrow(WireInputError);
    try {
      normalizeWireInput({ userUrl: '/new', user_url: '/old' }, metadata);
    } catch (error) {
      expect(error).toMatchObject({
        code: 'WIRE_FIELD_COLLISION', instancePath: '/user_url',
      });
    }
  });

  it('rejects unknown fields and escapes their submitted JSON pointer', () => {
    const metadata = createWireEntityMetadata('UserProfile', ['user_url']);
    try {
      normalizeWireInput({ 'bad~/name': true }, metadata);
      throw new Error('expected normalization to reject the unknown field');
    } catch (error) {
      expect(error).toMatchObject({
        code: 'WIRE_UNKNOWN_FIELD', instancePath: '/bad~0~1name',
      });
    }
  });

  it('rejects ambiguous metadata before accepting input', () => {
    expect(() => createWireEntityMetadata(
      'Collision', ['user_url', 'legacy'], 'camelCase', { legacy: ['userUrl'] },
    )).toThrow("maps to both 'user_url' and 'legacy'");
  });
});
