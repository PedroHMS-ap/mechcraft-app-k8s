type Primitive = string | number | boolean | null;
type Attributes = Record<string, unknown>;

let agent: any = null;

const shouldLoadAgent =
  !process.env.JEST_WORKER_ID &&
  process.env.NODE_ENV !== 'test' &&
  Boolean(process.env.NEW_RELIC_LICENSE_KEY);

if (shouldLoadAgent) {
  try {
    // Loaded lazily so local/test environments can run without a hard runtime failure.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    agent = require('newrelic');
  } catch {
    agent = null;
  }
}

const normalizeValue = (value: unknown): Primitive => {
  if (value === undefined) return null;
  if (value === null) return null;
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return JSON.stringify(value);
  if (typeof value === 'object') return JSON.stringify(value);
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }
  return String(value);
};

const normalizeAttributes = (attributes: Attributes = {}): Record<string, Primitive> => {
  const result: Record<string, Primitive> = {};
  for (const [key, value] of Object.entries(attributes)) {
    if (value === undefined) continue;
    result[key] = normalizeValue(value);
  }
  return result;
};

export const getLinkingMetadata = (): Record<string, Primitive> => {
  if (!agent?.getLinkingMetadata) return {};
  return normalizeAttributes(agent.getLinkingMetadata());
};

export const addCustomAttributes = (attributes: Attributes = {}) => {
  if (!agent?.addCustomAttributes) return;
  agent.addCustomAttributes(normalizeAttributes(attributes));
};

export const setTransactionName = (name: string) => {
  if (!name || !agent?.setTransactionName) return;
  agent.setTransactionName(name);
};

export const recordCustomEvent = (eventType: string, attributes: Attributes = {}) => {
  if (!eventType || !agent?.recordCustomEvent) return;
  agent.recordCustomEvent(eventType, normalizeAttributes(attributes));
};

export const recordMetric = (name: string, value: number) => {
  if (!name || !agent?.recordMetric || !Number.isFinite(value)) return;
  agent.recordMetric(name, value);
};

export const noticeError = (error: unknown, attributes: Attributes = {}) => {
  if (!agent?.noticeError) return;
  const err =
    error instanceof Error
      ? error
      : new Error(typeof error === 'string' ? error : 'Unknown application error');
  agent.noticeError(err, normalizeAttributes(attributes));
};

export const recordStructuredLog = (
  level: 'info' | 'warn' | 'error',
  message: string,
  attributes: Attributes = {},
) => {
  if (!agent?.recordLogEvent) return;

  agent.recordLogEvent({
    level,
    message,
    timestamp: Date.now(),
    ...normalizeAttributes(attributes),
    ...getLinkingMetadata(),
  });
};
