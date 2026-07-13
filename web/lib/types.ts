export type Role = 'admin' | 'user';
export type Locale = 'de' | 'en';
export type MqttStatusMode = 'plain' | 'structured';

export interface User {
  id: number;
  username: string;
  password_hash: string;
  role: Role;
  created_at: string;
  locale: Locale;
}

export interface Device {
  id: number;
  name: string;
  description: string;
  device_ip: string;
  mqtt_on_topic: string;
  mqtt_on_payload: string;
  mqtt_off_topic: string;
  mqtt_off_payload: string;
  mqtt_status_topic: string;
  mqtt_status_request_topic: string;
  mqtt_status_request_payload: string;
  mqtt_status_mode: MqttStatusMode;
  mqtt_status_power_path: string;
  mqtt_status_on_value: string;
  mqtt_status_off_value: string;
  restart_delay_ms: number;
  last_socket_status: string;
  last_status_payload: string;
  last_status_error: string;
  last_ping_status: string;
  last_checked_at: string | null;
  created_at: string;
}

export interface ActionLogEntry {
  id: number;
  user_id: number | null;
  device_id: number | null;
  action: string;
  result: string;
  created_at: string;
  username?: string | null;
  device_name?: string | null;
}

export interface MqttConfig {
  host: string;
  port: number;
  use_credentials: boolean;
  username: string;
  password: string;
  status_timeout_seconds: number;
}
