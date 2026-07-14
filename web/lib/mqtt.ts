import mqtt, { type MqttClient } from 'mqtt';
import crypto from 'node:crypto';
import type { Device, MqttConfig } from './types';
import { extractStatusValue } from './mqttStatusParser';

export interface StatusResult {
  status: string;
  payload: string;
  error: string;
}

function brokerUrl(config: MqttConfig): string {
  return `mqtt://${config.host}:${config.port}`;
}

function connectClient(config: MqttConfig): Promise<MqttClient> {
  return new Promise((resolve, reject) => {
    const client = mqtt.connect(brokerUrl(config), {
      clientId: `remote-power-manager-${crypto.randomBytes(4).toString('hex')}`,
      username: config.use_credentials && config.username !== '' ? config.username : undefined,
      password: config.use_credentials && config.password !== '' ? config.password : undefined,
      connectTimeout: Math.max(1, config.status_timeout_seconds) * 1000,
      reconnectPeriod: 0,
    });

    const onConnect = () => {
      client.removeListener('error', onError);
      resolve(client);
    };
    const onError = (error: Error) => {
      client.removeListener('connect', onConnect);
      client.end(true);
      reject(error);
    };

    client.once('connect', onConnect);
    client.once('error', onError);
  });
}

export async function checkBrokerConnection(config: MqttConfig): Promise<boolean> {
  try {
    const client = await connectClient(config);
    client.end(true);
    return true;
  } catch {
    return false;
  }
}

export async function publish(config: MqttConfig, topic: string, payload: string): Promise<string> {
  const trimmedTopic = topic.trim();
  if (trimmedTopic === '') {
    return 'Kein MQTT Topic konfiguriert.';
  }

  let client: MqttClient | undefined;
  try {
    client = await connectClient(config);
    await new Promise<void>((resolve, reject) => {
      client!.publish(trimmedTopic, payload, { qos: 0 }, (error) => {
        if (error) reject(error);
        else resolve();
      });
    });
    return 'OK';
  } catch (error) {
    return error instanceof Error ? error.message : 'MQTT Verbindung fehlgeschlagen.';
  } finally {
    // Graceful (non-forced) close: waits for the just-published packet to actually
    // flush to the socket before disconnecting. A forced close here raced with the
    // TCP write and could drop the publish before it left the process.
    if (client) {
      await new Promise<void>((resolve) => client!.end(false, {}, () => resolve()));
    }
  }
}

export async function readStatusOnce(config: MqttConfig, device: Device): Promise<StatusResult> {
  const topic = (device.mqtt_status_topic ?? '').trim();
  if (topic === '') {
    return { status: 'unknown', payload: '', error: 'No MQTT status topic configured.' };
  }

  let client: MqttClient | undefined;
  let rawMessage = '';

  try {
    client = await connectClient(config);

    const messagePromise = new Promise<string | null>((resolve) => {
      client!.once('message', (_receivedTopic, payload) => resolve(payload.toString()));
      const timeoutMs = Math.max(1, config.status_timeout_seconds) * 1000;
      setTimeout(() => resolve(null), timeoutMs);
    });

    await new Promise<void>((resolve, reject) => {
      client!.subscribe(topic, { qos: 0 }, (error) => (error ? reject(error) : resolve()));
    });

    const requestTopic = (device.mqtt_status_request_topic ?? '').trim();
    if (requestTopic !== '') {
      client.publish(requestTopic, device.mqtt_status_request_payload ?? '');
    }

    const message = await messagePromise;
    rawMessage = (message ?? '').trim();
  } catch (error) {
    return {
      status: 'unknown',
      payload: '',
      error: error instanceof Error ? error.message : 'MQTT Verbindung fehlgeschlagen.',
    };
  } finally {
    client?.end(true);
  }

  if (rawMessage === '') {
    return {
      status: 'unknown',
      payload: '',
      error: 'No MQTT payload received for the configured status topic.',
    };
  }

  const extracted = extractStatusValue(device, rawMessage);

  if (extracted.toLowerCase() === device.mqtt_status_on_value.toLowerCase()) {
    return { status: 'on', payload: rawMessage, error: '' };
  }
  if (extracted.toLowerCase() === device.mqtt_status_off_value.toLowerCase()) {
    return { status: 'off', payload: rawMessage, error: '' };
  }

  return {
    status: extracted !== '' ? extracted : 'unknown',
    payload: rawMessage,
    error:
      extracted !== ''
        ? 'MQTT payload received, but the extracted power value does not match the configured ON/OFF values.'
        : 'Unable to extract a power value from the MQTT payload.',
  };
}

export async function restartDevice(
  config: MqttConfig,
  device: Device,
): Promise<string> {
  const off = await publish(config, device.mqtt_off_topic, device.mqtt_off_payload);
  await new Promise((resolve) => setTimeout(resolve, Math.max(0, device.restart_delay_ms)));
  const on = await publish(config, device.mqtt_on_topic, device.mqtt_on_payload);
  return `Aus: ${off} / An: ${on}`;
}
