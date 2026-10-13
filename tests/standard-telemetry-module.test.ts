import { startStandardNodeTelemetry } from '../src/telemetry/standard-node';
import { TELEMETRY_ENVIRONMENT } from '../src/core/telemetry-startup';

const mockFlush = jest.fn(async () => {});
const mockShutdown = jest.fn(async () => {});
const mockCreate = jest.fn((..._args: unknown[]) => ({ telemetry: { start: () => ({ success() {}, failure() {} }) },
  flush: mockFlush, shutdown: mockShutdown }));
jest.mock('../src/telemetry/standard-node-sdk', () => ({ createStandardNodePipeline: (...args: unknown[]) => mockCreate(...args) }));

const previous = { ...process.env };
beforeEach(() => {
  for (const name of Object.values(TELEMETRY_ENVIRONMENT)) delete process.env[name];
  mockCreate.mockClear(); mockFlush.mockClear(); mockShutdown.mockClear();
  jest.spyOn(console, 'info').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => { process.env = { ...previous }; jest.restoreAllMocks(); });

test('disabled mode announces support but constructs no SDK pipeline', async () => {
  expect(await startStandardNodeTelemetry()).toBeUndefined();
  expect(mockCreate).not.toHaveBeenCalled();
  expect(console.info).toHaveBeenCalledWith(expect.stringContaining('TEAQL_TELEMETRY_ENABLED=true'));
});

test('matching clients share an owned pipeline; release is reference-counted and idempotent', async () => {
  process.env.TEAQL_TELEMETRY_ENABLED = 'true';
  process.env.TEAQL_TELEMETRY_SERVICE_NAME = 'test-shared';
  process.env.TEAQL_TELEMETRY_OTLP_ENDPOINT = 'http://localhost:4318';
  const [one, two] = await Promise.all([startStandardNodeTelemetry(), startStandardNodeTelemetry()]);
  expect(mockCreate).toHaveBeenCalledTimes(1);
  expect(one!.telemetry).toBe(two!.telemetry);
  await one!.flush(); expect(mockFlush).toHaveBeenCalledTimes(1);
  await one!.release(); await one!.release(); expect(mockShutdown).not.toHaveBeenCalled();
  await two!.release(); expect(mockShutdown).toHaveBeenCalledTimes(1);
});

test('SDK construction failure is fail-open and does not expose its exception', async () => {
  process.env.TEAQL_TELEMETRY_ENABLED = 'true';
  process.env.TEAQL_TELEMETRY_SERVICE_NAME = 'test-failure';
  process.env.TEAQL_TELEMETRY_OTLP_ENDPOINT = 'http://localhost:4318';
  mockCreate.mockImplementationOnce(() => { throw new Error('PRIVATE-CREDENTIAL'); });
  expect(await startStandardNodeTelemetry()).toBeUndefined();
  expect(JSON.stringify((console.warn as jest.Mock).mock.calls)).not.toContain('PRIVATE-CREDENTIAL');
});
