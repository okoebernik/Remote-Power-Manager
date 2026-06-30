<?php

final class Database
{
    private static ?PDO $pdo = null;
    private static string $driver = 'sqlite';

    public static function pdo(): PDO
    {
        if (self::$pdo instanceof PDO) {
            return self::$pdo;
        }

        $config = require __DIR__ . '/../config.php';
        $database = self::databaseConfig($config);
        self::$driver = $database['driver'];

        try {
            if (self::$driver === 'mysql') {
                self::$pdo = self::connectMysql($database['mysql']);
            } else {
                self::$pdo = self::connectSqlite($database['sqlite']['path']);
            }
        } catch (PDOException $exception) {
            throw new RuntimeException(self::connectionErrorMessage(self::$driver, $exception), 0, $exception);
        }

        self::$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        self::$pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);

        if (self::$driver === 'sqlite') {
            self::$pdo->exec('PRAGMA foreign_keys = ON');
        }

        self::migrate(self::$pdo);
        self::seedAdmin(self::$pdo, $config);

        return self::$pdo;
    }

    private static function databaseConfig(array $config): array
    {
        if (isset($config['database']) && is_array($config['database'])) {
            $database = $config['database'];
            $database['driver'] = $database['driver'] ?? 'sqlite';
            $database['sqlite']['path'] = $database['sqlite']['path'] ?? (__DIR__ . '/../data/app.sqlite');
            $database['mysql'] = $database['mysql'] ?? [];
            $database['mysql'] += [
                'host' => '127.0.0.1',
                'port' => 3306,
                'database' => 'remote_power_manager',
                'username' => 'root',
                'password' => '',
                'charset' => 'utf8mb4',
            ];

            if (!in_array($database['driver'], ['sqlite', 'mysql'], true)) {
                throw new RuntimeException('Unbekannter Datenbanktreiber: ' . $database['driver']);
            }

            return $database;
        }

        return [
            'driver' => 'sqlite',
            'sqlite' => [
                'path' => $config['database_path'] ?? (__DIR__ . '/../data/app.sqlite'),
            ],
            'mysql' => [],
        ];
    }

    private static function connectSqlite(string $databasePath): PDO
    {
        $databaseDir = dirname($databasePath);

        if (!is_dir($databaseDir)) {
            mkdir($databaseDir, 0775, true);
        }

        return new PDO('sqlite:' . $databasePath);
    }

    private static function connectMysql(array $mysql): PDO
    {
        if (!preg_match('/^[a-zA-Z0-9_]+$/', $mysql['database'])) {
            throw new RuntimeException('Der MySQL-Datenbankname darf nur Buchstaben, Zahlen und Unterstriche enthalten.');
        }

        $dsn = sprintf(
            'mysql:host=%s;port=%d;dbname=%s;charset=%s',
            $mysql['host'],
            (int) $mysql['port'],
            $mysql['database'],
            $mysql['charset']
        );

        try {
            return new PDO($dsn, $mysql['username'], $mysql['password'], [
                PDO::ATTR_EMULATE_PREPARES => false,
            ]);
        } catch (PDOException $exception) {
            if (strpos($exception->getMessage(), 'Unknown database') === false) {
                throw $exception;
            }

            $serverDsn = sprintf(
                'mysql:host=%s;port=%d;charset=%s',
                $mysql['host'],
                (int) $mysql['port'],
                $mysql['charset']
            );
            $server = new PDO($serverDsn, $mysql['username'], $mysql['password']);
            $server->exec(
                'CREATE DATABASE `' . $mysql['database'] . '` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci'
            );

            return new PDO($dsn, $mysql['username'], $mysql['password'], [
                PDO::ATTR_EMULATE_PREPARES => false,
            ]);
        }
    }

    private static function connectionErrorMessage(string $driver, PDOException $exception): string
    {
        if (strpos($exception->getMessage(), 'could not find driver') !== false) {
            if ($driver === 'sqlite') {
                return 'Der PHP-Treiber pdo_sqlite ist nicht aktiviert. Aktiviere pdo_sqlite in der php.ini oder stelle config.php auf MySQL/MariaDB um.';
            }

            return 'Der PHP-Treiber pdo_mysql ist nicht aktiviert. Aktiviere pdo_mysql in der php.ini oder nutze SQLite mit aktivem pdo_sqlite.';
        }

        return 'Datenbankfehler: ' . $exception->getMessage();
    }

    private static function migrate(PDO $pdo): void
    {
        if (self::$driver === 'mysql') {
            self::migrateMysql($pdo);
            return;
        }

        self::migrateSqlite($pdo);
    }

    private static function migrateSqlite(PDO $pdo): void
    {
        $pdo->exec(
            'CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                role TEXT NOT NULL CHECK(role IN ("admin", "user")),
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )'
        );

        self::ensureSqliteUserLocaleColumn($pdo);

        $pdo->exec(
            'CREATE TABLE IF NOT EXISTS devices (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                description TEXT NOT NULL DEFAULT "",
                device_ip TEXT NOT NULL DEFAULT "",
                mqtt_on_topic TEXT NOT NULL,
                mqtt_on_payload TEXT NOT NULL DEFAULT "ON",
                mqtt_off_topic TEXT NOT NULL,
                mqtt_off_payload TEXT NOT NULL DEFAULT "OFF",
                mqtt_status_topic TEXT NOT NULL DEFAULT "",
                mqtt_status_request_topic TEXT NOT NULL DEFAULT "",
                mqtt_status_request_payload TEXT NOT NULL DEFAULT "",
                mqtt_status_mode TEXT NOT NULL DEFAULT "plain",
                mqtt_status_power_path TEXT NOT NULL DEFAULT "POWER",
                mqtt_status_on_value TEXT NOT NULL DEFAULT "ON",
                mqtt_status_off_value TEXT NOT NULL DEFAULT "OFF",
                restart_delay_ms INTEGER NOT NULL DEFAULT 15000,
                last_socket_status TEXT NOT NULL DEFAULT "unknown",
                last_status_payload TEXT NOT NULL DEFAULT "",
                last_status_error TEXT NOT NULL DEFAULT "",
                last_ping_status TEXT NOT NULL DEFAULT "unknown",
                last_checked_at TEXT,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )'
        );

        self::ensureSqliteDeviceStatusColumns($pdo);

        $pdo->exec(
            'CREATE TABLE IF NOT EXISTS device_user (
                device_id INTEGER NOT NULL,
                user_id INTEGER NOT NULL,
                PRIMARY KEY (device_id, user_id),
                FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )'
        );

        $pdo->exec(
            'CREATE TABLE IF NOT EXISTS action_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                device_id INTEGER,
                action TEXT NOT NULL,
                result TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
                FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE SET NULL
            )'
        );

        $pdo->exec(
            'CREATE TABLE IF NOT EXISTS app_settings (
                setting_key TEXT PRIMARY KEY,
                setting_value TEXT NOT NULL DEFAULT ""
            )'
        );

        $pdo->exec('UPDATE devices SET restart_delay_ms = 15000 WHERE restart_delay_ms = 1000');
        $pdo->exec('UPDATE users SET locale = "de" WHERE locale IS NULL OR locale = ""');
    }

    private static function migrateMysql(PDO $pdo): void
    {
        $pdo->exec(
            'CREATE TABLE IF NOT EXISTS users (
                id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(190) NOT NULL UNIQUE,
                password_hash VARCHAR(255) NOT NULL,
                role VARCHAR(20) NOT NULL,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
        );

        self::ensureMysqlUserLocaleColumn($pdo);

        $pdo->exec(
            'CREATE TABLE IF NOT EXISTS devices (
                id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(190) NOT NULL,
                description TEXT NOT NULL,
                device_ip VARCHAR(255) NOT NULL DEFAULT "",
                mqtt_on_topic VARCHAR(255) NOT NULL,
                mqtt_on_payload VARCHAR(255) NOT NULL DEFAULT "ON",
                mqtt_off_topic VARCHAR(255) NOT NULL,
                mqtt_off_payload VARCHAR(255) NOT NULL DEFAULT "OFF",
                mqtt_status_topic VARCHAR(255) NOT NULL DEFAULT "",
                mqtt_status_request_topic VARCHAR(255) NOT NULL DEFAULT "",
                mqtt_status_request_payload VARCHAR(255) NOT NULL DEFAULT "",
                mqtt_status_mode VARCHAR(20) NOT NULL DEFAULT "plain",
                mqtt_status_power_path VARCHAR(255) NOT NULL DEFAULT "POWER",
                mqtt_status_on_value VARCHAR(255) NOT NULL DEFAULT "ON",
                mqtt_status_off_value VARCHAR(255) NOT NULL DEFAULT "OFF",
                restart_delay_ms INT UNSIGNED NOT NULL DEFAULT 15000,
                last_socket_status VARCHAR(255) NOT NULL DEFAULT "unknown",
                last_status_payload TEXT NOT NULL,
                last_status_error TEXT NOT NULL,
                last_ping_status VARCHAR(255) NOT NULL DEFAULT "unknown",
                last_checked_at DATETIME NULL,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
        );

        self::ensureMysqlDeviceStatusColumns($pdo);

        $pdo->exec(
            'CREATE TABLE IF NOT EXISTS device_user (
                device_id INT UNSIGNED NOT NULL,
                user_id INT UNSIGNED NOT NULL,
                PRIMARY KEY (device_id, user_id),
                CONSTRAINT fk_device_user_device FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE,
                CONSTRAINT fk_device_user_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
        );

        $pdo->exec(
            'CREATE TABLE IF NOT EXISTS action_log (
                id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                user_id INT UNSIGNED NULL,
                device_id INT UNSIGNED NULL,
                action VARCHAR(100) NOT NULL,
                result TEXT NOT NULL,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT fk_action_log_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
                CONSTRAINT fk_action_log_device FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE SET NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
        );

        $pdo->exec(
            'CREATE TABLE IF NOT EXISTS app_settings (
                setting_key VARCHAR(190) PRIMARY KEY,
                setting_value TEXT NOT NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
        );

        $pdo->exec('UPDATE devices SET restart_delay_ms = 15000 WHERE restart_delay_ms = 1000');
        $pdo->exec('UPDATE users SET locale = "de" WHERE locale IS NULL OR locale = ""');
    }

    private static function ensureSqliteUserLocaleColumn(PDO $pdo): void
    {
        $columns = $pdo->query('PRAGMA table_info(users)')->fetchAll();
        foreach ($columns as $column) {
            if (($column['name'] ?? '') === 'locale') {
                return;
            }
        }

        $pdo->exec('ALTER TABLE users ADD COLUMN locale TEXT NOT NULL DEFAULT "de"');
    }

    private static function ensureMysqlUserLocaleColumn(PDO $pdo): void
    {
        $columns = $pdo->query('SHOW COLUMNS FROM users LIKE "locale"')->fetchAll();
        if ($columns) {
            return;
        }

        $pdo->exec('ALTER TABLE users ADD COLUMN locale VARCHAR(5) NOT NULL DEFAULT "de"');
    }

    private static function ensureSqliteDeviceStatusColumns(PDO $pdo): void
    {
        $columns = $pdo->query('PRAGMA table_info(devices)')->fetchAll();
        $names = [];
        foreach ($columns as $column) {
            $names[] = $column['name'] ?? '';
        }

        if (!in_array('mqtt_status_mode', $names, true)) {
            $pdo->exec('ALTER TABLE devices ADD COLUMN mqtt_status_mode TEXT NOT NULL DEFAULT "plain"');
        }

        if (!in_array('mqtt_status_request_topic', $names, true)) {
            $pdo->exec('ALTER TABLE devices ADD COLUMN mqtt_status_request_topic TEXT NOT NULL DEFAULT ""');
        }

        if (!in_array('mqtt_status_request_payload', $names, true)) {
            $pdo->exec('ALTER TABLE devices ADD COLUMN mqtt_status_request_payload TEXT NOT NULL DEFAULT ""');
        }

        if (!in_array('mqtt_status_power_path', $names, true)) {
            $pdo->exec('ALTER TABLE devices ADD COLUMN mqtt_status_power_path TEXT NOT NULL DEFAULT "POWER"');
        }

        if (!in_array('last_status_payload', $names, true)) {
            $pdo->exec('ALTER TABLE devices ADD COLUMN last_status_payload TEXT NOT NULL DEFAULT ""');
        }

        if (!in_array('last_status_error', $names, true)) {
            $pdo->exec('ALTER TABLE devices ADD COLUMN last_status_error TEXT NOT NULL DEFAULT ""');
        }
    }

    private static function ensureMysqlDeviceStatusColumns(PDO $pdo): void
    {
        $columns = $pdo->query('SHOW COLUMNS FROM devices')->fetchAll();
        $names = [];
        foreach ($columns as $column) {
            $names[] = $column['Field'] ?? '';
        }

        if (!in_array('mqtt_status_mode', $names, true)) {
            $pdo->exec('ALTER TABLE devices ADD COLUMN mqtt_status_mode VARCHAR(20) NOT NULL DEFAULT "plain"');
        }

        if (!in_array('mqtt_status_request_topic', $names, true)) {
            $pdo->exec('ALTER TABLE devices ADD COLUMN mqtt_status_request_topic VARCHAR(255) NOT NULL DEFAULT ""');
        }

        if (!in_array('mqtt_status_request_payload', $names, true)) {
            $pdo->exec('ALTER TABLE devices ADD COLUMN mqtt_status_request_payload VARCHAR(255) NOT NULL DEFAULT ""');
        }

        if (!in_array('mqtt_status_power_path', $names, true)) {
            $pdo->exec('ALTER TABLE devices ADD COLUMN mqtt_status_power_path VARCHAR(255) NOT NULL DEFAULT "POWER"');
        }

        if (!in_array('last_status_payload', $names, true)) {
            $pdo->exec('ALTER TABLE devices ADD COLUMN last_status_payload TEXT NOT NULL');
        }

        if (!in_array('last_status_error', $names, true)) {
            $pdo->exec('ALTER TABLE devices ADD COLUMN last_status_error TEXT NOT NULL');
        }
    }

    private static function seedAdmin(PDO $pdo, array $config): void
    {
        $count = (int) $pdo->query('SELECT COUNT(*) FROM users')->fetchColumn();

        if ($count > 0) {
            return;
        }

        $admin = $config['initial_admin'];
        $stmt = $pdo->prepare('INSERT INTO users (username, password_hash, role, locale) VALUES (?, ?, ?, ?)');
        $stmt->execute([
            $admin['username'],
            password_hash($admin['password'], PASSWORD_DEFAULT),
            'admin',
            'de',
        ]);
    }
}
