<?php

function db(): PDO
{
    return Database::pdo();
}

function current_user(): ?array
{
    if (empty($_SESSION['user_id'])) {
        return null;
    }

    static $user = null;
    if ($user !== null && (int) $user['id'] === (int) $_SESSION['user_id']) {
        return $user;
    }

    $stmt = db()->prepare('SELECT id, username, role, locale FROM users WHERE id = ?');
    $stmt->execute([$_SESSION['user_id']]);
    $user = $stmt->fetch() ?: null;

    return $user;
}

function supported_locales(): array
{
    return [
        'de' => 'Deutsch',
        'en' => 'English',
    ];
}

function normalize_locale(?string $locale): string
{
    $locale = strtolower(trim((string) $locale));
    return array_key_exists($locale, supported_locales()) ? $locale : 'de';
}

function current_locale(): string
{
    $user = current_user();
    if ($user !== null) {
        return normalize_locale($user['locale'] ?? 'de');
    }

    if (!empty($_SESSION['locale'])) {
        return normalize_locale($_SESSION['locale']);
    }

    return 'de';
}

function t(string $key, array $replace = []): string
{
    static $translations = [
        'de' => [
            'welcome_user' => 'Willkommen, :username.',
            'login_failed' => 'Login fehlgeschlagen.',
            'login' => 'Login',
            'username' => 'Benutzername',
            'password' => 'Passwort',
            'sign_in' => 'Anmelden',
            'logout' => 'Logout',
            'dashboard' => 'Dashboard',
            'devices' => 'Geräte',
            'users' => 'Benutzer',
            'assignments' => 'Zuweisungen',
            'mqtt' => 'MQTT',
            'logs' => 'Protokoll',
            'settings_language' => 'Sprache',
            'save_language' => 'Sprache speichern',
            'language_saved' => 'Sprache gespeichert.',
            'access_denied' => 'Zugriff verweigert.',
            'invalid_csrf' => 'Ungültiger Sicherheits-Token.',
            'never' => 'noch nie',
            'status_updated' => 'Status aktualisiert.',
            'unknown_command' => 'Unbekannter Befehl.',
            'device_not_found' => 'Gerät nicht gefunden.',
            'device_saved' => 'Gerät gespeichert.',
            'device_created' => 'Gerät angelegt.',
            'device_deleted' => 'Gerät gelöscht.',
            'device_delete_confirm' => 'Gerät wirklich löschen?',
            'device_none_assigned' => 'Keine Geräte zugewiesen.',
            'device_restart_delay_label' => 'Neustart Wartezeit in ms (15000 = 15 Sekunden)',
            'required_device_fields' => 'Name, MQTT An Topic und MQTT Aus Topic sind Pflichtfelder.',
            'user_saved' => 'Benutzer gespeichert.',
            'user_created' => 'Benutzer angelegt.',
            'user_deleted' => 'Benutzer gelöscht.',
            'user_delete_confirm' => 'Benutzer wirklich löschen?',
            'username_required' => 'Benutzername ist erforderlich.',
            'password_required_new_user' => 'Für neue Benutzer ist ein Passwort erforderlich.',
            'username_taken' => 'Benutzername ist bereits vergeben.',
            'cannot_delete_self' => 'Der eigene Benutzer kann nicht gelöscht werden.',
            'assignments_saved' => 'Zuweisungen gespeichert.',
            'save_assignments' => 'Zuweisungen speichern',
            'mqtt_saved' => 'MQTT Einstellungen gespeichert.',
            'mqtt_server_required' => 'MQTT Server ist erforderlich.',
            'dashboard_intro' => 'Schalte zugewiesene Remote-Steckdosen, starte angeschlossene Geräte neu und prüfe MQTT- sowie Ping-Status.',
            'dashboard_auto_refresh' => 'Die Statusanzeige aktualisiert sich automatisch alle 30 Sekunden.',
            'socket' => 'Steckdose',
            'ping' => 'Ping',
            'last_check' => 'Letzte Prüfung',
            'on' => 'An',
            'off' => 'Aus',
            'restart' => 'Neustart',
            'status' => 'Status',
            'cancel' => 'Abbrechen',
            'save' => 'Speichern',
            'edit_device' => 'Gerät bearbeiten',
            'create_device' => 'Gerät anlegen',
            'name' => 'Name',
            'device_ip' => 'IP des angeschlossenen Geräts',
            'description' => 'Beschreibung',
            'mqtt_on_topic' => 'MQTT An Topic',
            'mqtt_on_payload' => 'MQTT An Payload',
            'mqtt_off_topic' => 'MQTT Aus Topic',
            'mqtt_off_payload' => 'MQTT Aus Payload',
            'mqtt_status_topic' => 'MQTT Status Topic',
            'mqtt_status_request_topic' => 'MQTT Status Request Topic',
            'mqtt_status_request_payload' => 'MQTT Status Request Payload',
            'mqtt_status_mode' => 'Status Parser',
            'mqtt_status_mode_plain' => 'Einfaches ON/OFF Payload',
            'mqtt_status_mode_structured' => 'Strukturiertes JSON/YAML Payload',
            'mqtt_status_power_path' => 'Power Key/Pfad',
            'mqtt_status_on_value' => 'Statuswert An',
            'mqtt_status_off_value' => 'Statuswert Aus',
            'ip' => 'IP',
            'edit' => 'Bearbeiten',
            'delete' => 'Löschen',
            'edit_user' => 'Benutzer bearbeiten',
            'create_user' => 'Benutzer anlegen',
            'role' => 'Rolle',
            'password_optional' => 'Passwort (leer lassen = unverändert)',
            'created_at' => 'Erstellt',
            'user' => 'User',
            'admin' => 'Admin',
            'mqtt_server' => 'MQTT Server',
            'server_host' => 'Server / Host',
            'port' => 'Port',
            'status_timeout_seconds' => 'Status Timeout in Sekunden',
            'mqtt_use_credentials' => 'MQTT Login mit Benutzername und Passwort verwenden',
            'show_debug_fields' => 'Debug-Felder im Dashboard anzeigen',
            'save_mqtt' => 'MQTT Einstellungen speichern',
            'current_configuration' => 'Aktuelle Konfiguration',
            'credentials' => 'Credentials',
            'active' => 'aktiv',
            'inactive' => 'nicht aktiv',
            'time' => 'Zeit',
            'action' => 'Aktion',
            'result' => 'Ergebnis',
            'leave_unchanged' => 'Unverändert lassen',
        ],
        'en' => [
            'welcome_user' => 'Welcome, :username.',
            'login_failed' => 'Login failed.',
            'login' => 'Login',
            'username' => 'Username',
            'password' => 'Password',
            'sign_in' => 'Sign in',
            'logout' => 'Logout',
            'dashboard' => 'Dashboard',
            'devices' => 'Devices',
            'users' => 'Users',
            'assignments' => 'Assignments',
            'mqtt' => 'MQTT',
            'logs' => 'Logs',
            'settings_language' => 'Language',
            'save_language' => 'Save language',
            'language_saved' => 'Language saved.',
            'access_denied' => 'Access denied.',
            'invalid_csrf' => 'Invalid security token.',
            'never' => 'never',
            'status_updated' => 'Status updated.',
            'unknown_command' => 'Unknown command.',
            'device_not_found' => 'Device not found.',
            'device_saved' => 'Device saved.',
            'device_created' => 'Device created.',
            'device_deleted' => 'Device deleted.',
            'device_delete_confirm' => 'Delete this device?',
            'device_none_assigned' => 'No devices assigned.',
            'device_restart_delay_label' => 'Restart wait time in ms (15000 = 15 seconds)',
            'required_device_fields' => 'Name, MQTT on topic and MQTT off topic are required.',
            'user_saved' => 'User saved.',
            'user_created' => 'User created.',
            'user_deleted' => 'User deleted.',
            'user_delete_confirm' => 'Delete this user?',
            'username_required' => 'Username is required.',
            'password_required_new_user' => 'A password is required for new users.',
            'username_taken' => 'Username is already in use.',
            'cannot_delete_self' => 'You cannot delete your own user.',
            'assignments_saved' => 'Assignments saved.',
            'save_assignments' => 'Save assignments',
            'mqtt_saved' => 'MQTT settings saved.',
            'mqtt_server_required' => 'MQTT server is required.',
            'dashboard_intro' => 'Control assigned remote sockets, restart connected devices, and check MQTT and ping status.',
            'dashboard_auto_refresh' => 'Status updates automatically every 30 seconds.',
            'socket' => 'Socket',
            'ping' => 'Ping',
            'last_check' => 'Last check',
            'on' => 'On',
            'off' => 'Off',
            'restart' => 'Restart',
            'status' => 'Status',
            'cancel' => 'Cancel',
            'save' => 'Save',
            'edit_device' => 'Edit device',
            'create_device' => 'Create device',
            'name' => 'Name',
            'device_ip' => 'Connected device IP',
            'description' => 'Description',
            'mqtt_on_topic' => 'MQTT on topic',
            'mqtt_on_payload' => 'MQTT on payload',
            'mqtt_off_topic' => 'MQTT off topic',
            'mqtt_off_payload' => 'MQTT off payload',
            'mqtt_status_topic' => 'MQTT status topic',
            'mqtt_status_request_topic' => 'MQTT status request topic',
            'mqtt_status_request_payload' => 'MQTT status request payload',
            'mqtt_status_mode' => 'Status parser',
            'mqtt_status_mode_plain' => 'Plain ON/OFF payload',
            'mqtt_status_mode_structured' => 'Structured JSON/YAML payload',
            'mqtt_status_power_path' => 'Power key/path',
            'mqtt_status_on_value' => 'Status value on',
            'mqtt_status_off_value' => 'Status value off',
            'ip' => 'IP',
            'edit' => 'Edit',
            'delete' => 'Delete',
            'edit_user' => 'Edit user',
            'create_user' => 'Create user',
            'role' => 'Role',
            'password_optional' => 'Password (leave empty to keep unchanged)',
            'created_at' => 'Created',
            'user' => 'User',
            'admin' => 'Admin',
            'mqtt_server' => 'MQTT server',
            'server_host' => 'Server / Host',
            'port' => 'Port',
            'status_timeout_seconds' => 'Status timeout in seconds',
            'mqtt_use_credentials' => 'Use MQTT login with username and password',
            'show_debug_fields' => 'Show debug fields on the dashboard',
            'save_mqtt' => 'Save MQTT settings',
            'current_configuration' => 'Current configuration',
            'credentials' => 'Credentials',
            'active' => 'active',
            'inactive' => 'inactive',
            'time' => 'Time',
            'action' => 'Action',
            'result' => 'Result',
            'leave_unchanged' => 'Leave unchanged',
        ],
    ];

    $locale = current_locale();
    $text = $translations[$locale][$key] ?? $translations['de'][$key] ?? $key;

    foreach ($replace as $replaceKey => $replaceValue) {
        $text = str_replace(':' . $replaceKey, (string) $replaceValue, $text);
    }

    return $text;
}

function is_admin(): bool
{
    $user = current_user();
    return $user !== null && $user['role'] === 'admin';
}

function require_login(): void
{
    if (current_user() === null) {
        redirect('index.php?page=login');
    }
}

function require_admin(): void
{
    require_login();

    if (!is_admin()) {
        http_response_code(403);
        exit(t('access_denied'));
    }
}

function redirect(string $url): void
{
    header('Location: ' . $url);
    exit;
}

function csrf_token(): string
{
    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }

    return $_SESSION['csrf_token'];
}

function verify_csrf(): void
{
    $token = $_POST['csrf_token'] ?? '';
    if (!hash_equals($_SESSION['csrf_token'] ?? '', $token)) {
        http_response_code(419);
        exit(t('invalid_csrf'));
    }
}

function e(?string $value): string
{
    return htmlspecialchars($value ?? '', ENT_QUOTES, 'UTF-8');
}

function flash(?string $message = null, string $type = 'success'): ?array
{
    if ($message !== null) {
        $_SESSION['flash'] = ['message' => $message, 'type' => $type];
        return null;
    }

    $flash = $_SESSION['flash'] ?? null;
    unset($_SESSION['flash']);

    return $flash;
}

function user_can_access_device(int $deviceId): bool
{
    if (is_admin()) {
        return true;
    }

    $user = current_user();
    if ($user === null) {
        return false;
    }

    $stmt = db()->prepare('SELECT 1 FROM device_user WHERE device_id = ? AND user_id = ?');
    $stmt->execute([$deviceId, $user['id']]);

    return (bool) $stmt->fetchColumn();
}

function devices_for_current_user(): array
{
    if (is_admin()) {
        return db()->query('SELECT * FROM devices ORDER BY name')->fetchAll();
    }

    $stmt = db()->prepare(
        'SELECT d.*
         FROM devices d
         JOIN device_user du ON du.device_id = d.id
         WHERE du.user_id = ?
         ORDER BY d.name'
    );
    $stmt->execute([current_user()['id']]);

    return $stmt->fetchAll();
}

function log_action(?int $deviceId, string $action, string $result): void
{
    $user = current_user();
    $stmt = db()->prepare('INSERT INTO action_log (user_id, device_id, action, result) VALUES (?, ?, ?, ?)');
    $stmt->execute([$user['id'] ?? null, $deviceId, $action, substr($result, 0, 1000)]);
}

function app_setting(string $key, ?string $default = ''): string
{
    $stmt = db()->prepare('SELECT setting_value FROM app_settings WHERE setting_key = ?');
    $stmt->execute([$key]);
    $value = $stmt->fetchColumn();

    if ($value === false) {
        return (string) $default;
    }

    return (string) $value;
}

function save_app_setting(string $key, string $value): void
{
    $stmt = db()->prepare('REPLACE INTO app_settings (setting_key, setting_value) VALUES (?, ?)');
    $stmt->execute([$key, $value]);
}

function mqtt_config(): array
{
    $config = require __DIR__ . '/../config.php';
    $defaults = $config['mqtt'] ?? [];

    return [
        'host' => app_setting('mqtt_host', (string) ($defaults['host'] ?? '127.0.0.1')),
        'port' => (int) app_setting('mqtt_port', (string) ($defaults['port'] ?? 1883)),
        'use_credentials' => app_setting(
            'mqtt_use_credentials',
            !empty($defaults['username']) || !empty($defaults['password']) ? '1' : '0'
        ) === '1',
        'username' => app_setting('mqtt_username', (string) ($defaults['username'] ?? '')),
        'password' => app_setting('mqtt_password', (string) ($defaults['password'] ?? '')),
        'status_timeout_seconds' => (int) app_setting(
            'mqtt_status_timeout_seconds',
            (string) ($defaults['status_timeout_seconds'] ?? 2)
        ),
    ];
}

function ping_host(string $host): string
{
    $host = trim($host);
    if ($host === '') {
        return 'unknown';
    }

    if (!filter_var($host, FILTER_VALIDATE_IP) && !preg_match('/^[a-z0-9.-]+$/i', $host)) {
        return 'invalid';
    }

    $isWindows = strtoupper(substr(PHP_OS, 0, 3)) === 'WIN';
    $command = $isWindows
        ? 'ping -n 1 -w 1000 ' . escapeshellarg($host)
        : 'ping -c 1 -W 1 ' . escapeshellarg($host);

    exec($command, $output, $exitCode);

    return $exitCode === 0 ? 'online' : 'offline';
}

function mqtt_encode_length(int $length): string
{
    $encoded = '';

    do {
        $digit = $length % 128;
        $length = intdiv($length, 128);

        if ($length > 0) {
            $digit = $digit | 128;
        }

        $encoded .= chr($digit);
    } while ($length > 0);

    return $encoded;
}

function mqtt_string(string $value): string
{
    return pack('n', strlen($value)) . $value;
}

function mqtt_read_bytes($socket, int $length): string
{
    $buffer = '';

    while (strlen($buffer) < $length && !feof($socket)) {
        $chunk = fread($socket, $length - strlen($buffer));

        if ($chunk === false || $chunk === '') {
            break;
        }

        $buffer .= $chunk;
    }

    return $buffer;
}

function mqtt_read_packet($socket): ?array
{
    $header = mqtt_read_bytes($socket, 1);
    if ($header === '') {
        return null;
    }

    $multiplier = 1;
    $remainingLength = 0;

    do {
        $encodedByteRaw = mqtt_read_bytes($socket, 1);
        if ($encodedByteRaw === '') {
            return null;
        }

        $encodedByte = ord($encodedByteRaw);
        $remainingLength += ($encodedByte & 127) * $multiplier;
        $multiplier *= 128;
    } while (($encodedByte & 128) !== 0);

    return [
        'type' => ord($header) >> 4,
        'flags' => ord($header) & 15,
        'payload' => mqtt_read_bytes($socket, $remainingLength),
    ];
}

function mqtt_open_socket(array $mqtt)
{
    $errorNumber = 0;
    $errorMessage = '';
    $timeout = max(1, (int) $mqtt['status_timeout_seconds']);
    $socket = @fsockopen(
        (string) $mqtt['host'],
        (int) $mqtt['port'],
        $errorNumber,
        $errorMessage,
        $timeout
    );

    if (!$socket) {
        throw new RuntimeException('MQTT Verbindung fehlgeschlagen: ' . $errorMessage);
    }

    stream_set_timeout($socket, $timeout);

    return $socket;
}

function mqtt_connect($socket, array $mqtt): void
{
    $clientId = 'remote-power-manager-' . bin2hex(random_bytes(4));
    $flags = 2;
    $payload = mqtt_string($clientId);

    if ($mqtt['use_credentials']) {
        if ($mqtt['username'] !== '') {
            $flags |= 128;
            $payload .= mqtt_string((string) $mqtt['username']);
        }

        if ($mqtt['password'] !== '') {
            $flags |= 64;
            $payload .= mqtt_string((string) $mqtt['password']);
        }
    }

    $variableHeader = mqtt_string('MQTT') . chr(4) . chr($flags) . pack('n', 30);
    $packet = chr(16) . mqtt_encode_length(strlen($variableHeader . $payload)) . $variableHeader . $payload;

    fwrite($socket, $packet);

    $response = mqtt_read_packet($socket);
    if (!$response || $response['type'] !== 2 || strlen($response['payload']) < 2) {
        throw new RuntimeException('MQTT Broker hat keine gültige CONNACK Antwort gesendet.');
    }

    $returnCode = ord($response['payload'][1]);
    if ($returnCode !== 0) {
        $messages = [
            1 => 'Protokollversion nicht akzeptiert.',
            2 => 'Client ID wurde abgelehnt.',
            3 => 'MQTT Server nicht verfügbar.',
            4 => 'MQTT Benutzername oder Passwort ungültig.',
            5 => 'Nicht autorisiert.',
        ];
        throw new RuntimeException($messages[$returnCode] ?? ('MQTT Verbindung abgelehnt, Code ' . $returnCode . '.'));
    }
}

function mqtt_disconnect($socket): void
{
    @fwrite($socket, chr(224) . chr(0));
    @fclose($socket);
}

function publish_mqtt(string $topic, string $payload): string
{
    $topic = trim($topic);
    if ($topic === '') {
        return 'Kein MQTT Topic konfiguriert.';
    }

    try {
        $mqtt = mqtt_config();
        $socket = mqtt_open_socket($mqtt);
        mqtt_connect($socket, $mqtt);

        $body = mqtt_string($topic) . $payload;
        $packet = chr(48) . mqtt_encode_length(strlen($body)) . $body;
        fwrite($socket, $packet);
        mqtt_disconnect($socket);

        return 'OK';
    } catch (RuntimeException $exception) {
        if (isset($socket) && is_resource($socket)) {
            @fclose($socket);
        }

        return $exception->getMessage();
    }
}

function mqtt_publish_packet($socket, string $topic, string $payload): void
{
    $body = mqtt_string($topic) . $payload;
    $packet = chr(48) . mqtt_encode_length(strlen($body)) . $body;
    fwrite($socket, $packet);
}

function read_mqtt_status_result(array $device): array
{
    $topic = trim((string) $device['mqtt_status_topic']);
    if ($topic === '') {
        return [
            'status' => 'unknown',
            'payload' => '',
            'error' => 'No MQTT status topic configured.',
        ];
    }

    try {
        $mqtt = mqtt_config();
        $socket = mqtt_open_socket($mqtt);
        mqtt_connect($socket, $mqtt);

        $packetId = random_int(1, 65535);
        $body = pack('n', $packetId) . mqtt_string($topic) . chr(0);
        $packet = chr(130) . mqtt_encode_length(strlen($body)) . $body;
        fwrite($socket, $packet);

        $requestTopic = trim((string) ($device['mqtt_status_request_topic'] ?? ''));
        if ($requestTopic !== '') {
            mqtt_publish_packet(
                $socket,
                $requestTopic,
                (string) ($device['mqtt_status_request_payload'] ?? '')
            );
        }

        $deadline = time() + max(1, (int) $mqtt['status_timeout_seconds']);
        $message = '';

        while (time() <= $deadline) {
            $response = mqtt_read_packet($socket);
            if (!$response) {
                break;
            }

            if ($response['type'] !== 3) {
                continue;
            }

            $payload = $response['payload'];
            if (strlen($payload) < 2) {
                continue;
            }

            $topicLength = unpack('n', substr($payload, 0, 2))[1];
            $message = substr($payload, 2 + $topicLength);
            break;
        }

        mqtt_disconnect($socket);
    } catch (RuntimeException $exception) {
        if (isset($socket) && is_resource($socket)) {
            @fclose($socket);
        }

        return [
            'status' => 'unknown',
            'payload' => '',
            'error' => $exception->getMessage(),
        ];
    }

    $rawMessage = trim($message);
    if ($rawMessage === '') {
        return [
            'status' => 'unknown',
            'payload' => '',
            'error' => 'No MQTT payload received for the configured status topic.',
        ];
    }

    $message = mqtt_extract_status_value($device, $rawMessage);

    if (strcasecmp($message, (string) $device['mqtt_status_on_value']) === 0) {
        return [
            'status' => 'on',
            'payload' => $rawMessage,
            'error' => '',
        ];
    }

    if (strcasecmp($message, (string) $device['mqtt_status_off_value']) === 0) {
        return [
            'status' => 'off',
            'payload' => $rawMessage,
            'error' => '',
        ];
    }

    return [
        'status' => $message !== '' ? $message : 'unknown',
        'payload' => $rawMessage,
        'error' => $message !== '' ? 'MQTT payload received, but the extracted power value does not match the configured ON/OFF values.' : 'Unable to extract a power value from the MQTT payload.',
    ];
}

function mqtt_extract_status_value(array $device, string $message): string
{
    $mode = trim((string) ($device['mqtt_status_mode'] ?? 'plain'));
    if ($mode !== 'structured') {
        return $message;
    }

    $path = trim((string) ($device['mqtt_status_power_path'] ?? 'POWER'));
    if ($path === '') {
        $path = 'POWER';
    }

    $parsed = mqtt_parse_structured_payload($message);
    if (is_array($parsed)) {
        $value = mqtt_get_path_value($parsed, $path);
        if ($value !== null && !is_array($value) && !is_object($value)) {
            return trim((string) $value);
        }
    }

    $fallback = mqtt_extract_key_by_regex($message, $path);
    return $fallback !== null ? $fallback : $message;
}

function mqtt_parse_structured_payload(string $message): ?array
{
    $decoded = json_decode($message, true);
    if (is_array($decoded)) {
        return $decoded;
    }

    if (function_exists('yaml_parse')) {
        $yaml = @yaml_parse($message);
        if (is_array($yaml)) {
            return $yaml;
        }
    }

    return null;
}

function mqtt_get_path_value(array $data, string $path)
{
    $current = $data;
    foreach (explode('.', $path) as $segment) {
        $segment = trim($segment);
        if ($segment === '' || !is_array($current) || !array_key_exists($segment, $current)) {
            return null;
        }

        $current = $current[$segment];
    }

    return $current;
}

function mqtt_extract_key_by_regex(string $message, string $path): ?string
{
    $segments = explode('.', $path);
    $key = trim((string) end($segments));
    if ($key === '') {
        return null;
    }

    $patterns = [
        '/"' . preg_quote($key, '/') . '"\s*:\s*"([^"]+)"/i',
        '/"' . preg_quote($key, '/') . '"\s*:\s*([A-Za-z0-9._-]+)/i',
        '/^' . preg_quote($key, '/') . '\s*:\s*"([^"]+)"/im',
        '/^' . preg_quote($key, '/') . '\s*:\s*([A-Za-z0-9._-]+)/im',
    ];

    foreach ($patterns as $pattern) {
        if (preg_match($pattern, $message, $matches) === 1) {
            return trim((string) $matches[1]);
        }
    }

    return null;
}

function refresh_device_status(array $device): array
{
    $statusResult = read_mqtt_status_result($device);
    $socketStatus = $statusResult['status'];
    $pingStatus = ping_host((string) $device['device_ip']);

    $stmt = db()->prepare(
        'UPDATE devices
         SET last_socket_status = ?, last_status_payload = ?, last_status_error = ?, last_ping_status = ?, last_checked_at = CURRENT_TIMESTAMP
         WHERE id = ?'
    );
    $stmt->execute([
        $socketStatus,
        substr((string) $statusResult['payload'], 0, 4000),
        substr((string) $statusResult['error'], 0, 1000),
        $pingStatus,
        $device['id']
    ]);

    $device['last_socket_status'] = $socketStatus;
    $device['last_status_payload'] = $statusResult['payload'];
    $device['last_status_error'] = $statusResult['error'];
    $device['last_ping_status'] = $pingStatus;
    $device['last_checked_at'] = date('Y-m-d H:i:s');

    return $device;
}

function status_label(string $status): string
{
    if ($status === 'on' || $status === 'online') {
        return 'status-ok';
    }

    if ($status === 'off' || $status === 'offline') {
        return 'status-warn';
    }

    if ($status === 'invalid') {
        return 'status-bad';
    }

    return 'status-unknown';
}

function status_text(string $status): string
{
    $map = [
        'on' => ['de' => 'an', 'en' => 'on'],
        'off' => ['de' => 'aus', 'en' => 'off'],
        'online' => ['de' => 'online', 'en' => 'online'],
        'offline' => ['de' => 'offline', 'en' => 'offline'],
        'unknown' => ['de' => 'unbekannt', 'en' => 'unknown'],
        'invalid' => ['de' => 'ungueltig', 'en' => 'invalid'],
    ];

    $locale = current_locale();
    return $map[$status][$locale] ?? $status;
}
