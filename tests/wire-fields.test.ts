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

  it('preserves the complete child alias pointer after canonical graph prefixing', () => {
    const parent = createWireEntityMetadata('Order', ['order_item_list'], 'camelCase', {
      order_item_list: ['legacy/items'],
    });
    const child = createWireEntityMetadata('OrderItem', ['product_name'], 'camelCase', {
      product_name: ['legacy~name'],
    });
    const parentInput = normalizeWireInput({'legacy/items': [{}, {}, {'legacy~name': null}]}, parent);
    const childInput = normalizeWireInput({'legacy~name': null}, child, '/legacy~1items/2');
    const leaf = retainSubmittedPaths([{
      ruleId: 'required', entityType: 'OrderItem', location: ObjectLocation.property('product_name'),
    }], childInput)[0];
    const prefixed = {...leaf, location: leaf.location.prefixedBy(ObjectLocation.property('order_item_list').index(2))};
    const actual = retainSubmittedPaths([prefixed], parentInput)[0];
    expect(actual.sourceInstancePath).toBe('/legacy~1items/2/legacy~0name');
    expect(actual.location.instancePath()).toBe('/orderItemList/2/productName');
    expect(actual.entityType).toBe('OrderItem');
    expect(prefixed.sourceInstancePath).toBe('/legacy~1items/2/legacy~0name');
  });

  test.each(['camelCase', 'snake_case', 'PascalCase'] as const)(
    'retains an ancestor alias when the child uses its standard %s spelling', profile => {
      const parent = createWireEntityMetadata('Order', ['order_item_list'], 'camelCase', {
        order_item_list: ['legacy/items~'],
      });
      const child = createWireEntityMetadata('OrderItem', ['product_name', 'unit_count'], profile);
      const fieldName = child.fields.product_name.wireName;
      for (const value of [null, 'submitted item']) {
        const childObject = {[fieldName]: value};
        const parentInput = normalizeWireInput({'legacy/items~': [{}, {}, childObject]}, parent);
        const boundary = `${parentInput.sourceInstancePaths.order_item_list}/2`;
        const normalized = normalizeWireInput(childObject, child, boundary);
        expect(normalized.values).toEqual({product_name: value});
        expect(normalized.sourceInstancePaths).toEqual({product_name: `${boundary}/${fieldName}`});
        const original = {ruleId: 'required', entityType: 'OrderItem', location: ObjectLocation.property('product_name')};
        const leaf = retainSubmittedPaths([original], normalized)[0];
        const location = ObjectLocation.property('order_item_list').index(2).property('product_name');
        const result = retainSubmittedPaths([{...leaf, location}], parentInput)[0];
        expect(result.sourceInstancePath).toBe(`/legacy~1items~0/2/${fieldName}`);
        expect(result.location).toBe(location);
        expect(original).not.toHaveProperty('sourceInstancePath');
      }
      // No ancestor or leaf alias: keep the existing sparse root-level map.
      expect(normalizeWireInput({[fieldName]: null}, child).sourceInstancePaths).toEqual({});
    },
  );

  it('does not invent a leaf pointer from a parent-only alias map', () => {
    const parent = createWireEntityMetadata('Order', ['order_item_list'], 'camelCase', {
      order_item_list: ['legacy/items'],
    });
    const normalized = normalizeWireInput({'legacy/items': [{}]}, parent);
    const location = ObjectLocation.property('order_item_list').index(0).property('product_name');
    const actual = retainSubmittedPaths([{ruleId: 'required', location}], normalized)[0];
    expect(actual.sourceInstancePath).toBeUndefined();
    expect(actual.location).toBe(location);
  });

  it('does not treat an indexed descendant as the current object property', () => {
    const metadata = createWireEntityMetadata('OrderItem', ['product_name'], 'camelCase', {
      product_name: ['legacy~name'],
    });
    const normalized = normalizeWireInput({'legacy~name': null}, metadata);
    const location = ObjectLocation.root().index(2).property('product_name');
    expect(retainSubmittedPaths([{ruleId: 'required', location}], normalized)[0].sourceInstancePath)
      .toBeUndefined();
  });

  it('still annotates an error on the entire current-level collection', () => {
    const parent = createWireEntityMetadata('Order', ['order_item_list'], 'camelCase', {
      order_item_list: ['legacy/items'],
    });
    const normalized = normalizeWireInput({'legacy/items': null}, parent);
    const actual = retainSubmittedPaths([{
      ruleId: 'required', location: ObjectLocation.property('order_item_list'), sourceInstancePath: '/stale',
    }], normalized)[0];
    expect(actual.sourceInstancePath).toBe('/legacy~1items');
  });
});
