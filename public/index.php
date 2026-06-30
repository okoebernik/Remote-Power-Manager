<?php

require_once __DIR__ . '/../src/bootstrap.php';

$page = $_GET['page'] ?? 'dashboard';
$action = $_POST['action'] ?? '';

if ($action !== '') {
    verify_csrf();
}

if ($action === 'login') {
    $username = trim($_POST['username'] ?? '');
    $password = (string) ($_POST['password'] ?? '');
    $stmt = db()->prepare('SELECT * FROM users WHERE username = ?');
    $stmt->execute([$username]);
    $user = $stmt->fetch();

    if ($user && password_verify($password, $user['password_hash'])) {
        session_regenerate_id(true);
        $_SESSION['user_id'] = $user['id'];
        $_SESSION['locale'] = normalize_locale($user['locale'] ?? 'de');
        flash(t('welcome_user', ['username' => $user['username']]));
        redirect('index.php');
    }

    flash(t('login_failed'), 'error');
    redirect('index.php?page=login');
}

if ($action === 'logout') {
    session_destroy();
    redirect('index.php?page=login');
}

if ($action === 'save_language') {
    require_login();
    $locale = normalize_locale($_POST['locale'] ?? 'de');
    $stmt = db()->prepare('UPDATE users SET locale = ? WHERE id = ?');
    $stmt->execute([$locale, current_user()['id']]);
    $_SESSION['locale'] = $locale;
    flash(t('language_saved'));
    redirect('index.php?page=' . urlencode($page));
}

if ($page === 'status_data') {
    require_login();

    $devices = [];
    foreach (devices_for_current_user() as $device) {
        $refreshed = refresh_device_status($device);
        $devices[] = [
            'id' => (int) $refreshed['id'],
            'socket_status' => (string) $refreshed['last_socket_status'],
            'socket_class' => status_label((string) $refreshed['last_socket_status']),
            'ping_status' => (string) $refreshed['last_ping_status'],
            'ping_class' => status_label((string) $refreshed['last_ping_status']),
            'checked_at' => (string) ($refreshed['last_checked_at'] ?: t('never')),
            'socket_text' => status_text((string) $refreshed['last_socket_status']),
            'ping_text' => status_text((string) $refreshed['last_ping_status']),
            'status_payload' => (string) ($refreshed['last_status_payload'] ?? ''),
            'status_error' => (string) ($refreshed['last_status_error'] ?? ''),
        ];
    }

    header('Content-Type: application/json; charset=utf-8');
    echo json_encode([
        'generated_at' => date('Y-m-d H:i:s'),
        'devices' => $devices,
    ]);
    exit;
}

if ($action === 'switch') {
    require_login();
    $deviceId = (int) ($_POST['device_id'] ?? 0);
    $command = $_POST['command'] ?? '';

    if (!user_can_access_device($deviceId)) {
        http_response_code(403);
        exit(t('access_denied'));
    }

    $stmt = db()->prepare('SELECT * FROM devices WHERE id = ?');
    $stmt->execute([$deviceId]);
    $device = $stmt->fetch();

    if (!$device) {
        flash(t('device_not_found'), 'error');
        redirect('index.php');
    }

    $result = t('unknown_command');
    if ($command === 'on') {
        $result = publish_mqtt($device['mqtt_on_topic'], $device['mqtt_on_payload']);
    } elseif ($command === 'off') {
        $result = publish_mqtt($device['mqtt_off_topic'], $device['mqtt_off_payload']);
    } elseif ($command === 'restart') {
        $off = publish_mqtt($device['mqtt_off_topic'], $device['mqtt_off_payload']);
        usleep(max(0, (int) $device['restart_delay_ms']) * 1000);
        $on = publish_mqtt($device['mqtt_on_topic'], $device['mqtt_on_payload']);
        $result = 'Aus: ' . $off . ' / An: ' . $on;
    } elseif ($command === 'refresh') {
        $device = refresh_device_status($device);
        $result = t('status_updated');
    }

    log_action($deviceId, $command, $result);
    flash($result, strpos($result, 'fehlgeschlagen') !== false ? 'error' : 'success');
    redirect('index.php');
}

if ($action === 'save_device') {
    require_admin();
    $id = (int) ($_POST['id'] ?? 0);
    $values = [
        trim($_POST['name'] ?? ''),
        trim($_POST['description'] ?? ''),
        trim($_POST['device_ip'] ?? ''),
        trim($_POST['mqtt_on_topic'] ?? ''),
        trim($_POST['mqtt_on_payload'] ?? 'ON'),
        trim($_POST['mqtt_off_topic'] ?? ''),
        trim($_POST['mqtt_off_payload'] ?? 'OFF'),
        trim($_POST['mqtt_status_topic'] ?? ''),
        trim($_POST['mqtt_status_request_topic'] ?? ''),
        trim($_POST['mqtt_status_request_payload'] ?? ''),
        $_POST['mqtt_status_mode'] === 'structured' ? 'structured' : 'plain',
        trim($_POST['mqtt_status_power_path'] ?? 'POWER'),
        trim($_POST['mqtt_status_on_value'] ?? 'ON'),
        trim($_POST['mqtt_status_off_value'] ?? 'OFF'),
        max(0, (int) ($_POST['restart_delay_ms'] ?? 15000)),
    ];

    if ($values[0] === '' || $values[3] === '' || $values[5] === '') {
        flash(t('required_device_fields'), 'error');
        redirect('index.php?page=devices');
    }

    if ($id > 0) {
        $stmt = db()->prepare(
            'UPDATE devices
             SET name = ?, description = ?, device_ip = ?, mqtt_on_topic = ?, mqtt_on_payload = ?,
                 mqtt_off_topic = ?, mqtt_off_payload = ?, mqtt_status_topic = ?, mqtt_status_request_topic = ?,
                 mqtt_status_request_payload = ?, mqtt_status_mode = ?, mqtt_status_power_path = ?,
                 mqtt_status_on_value = ?, mqtt_status_off_value = ?, restart_delay_ms = ?
             WHERE id = ?'
        );
        $stmt->execute([...$values, $id]);
        flash(t('device_saved'));
    } else {
        $insertValues = [...$values, '', ''];
        $stmt = db()->prepare(
            'INSERT INTO devices (
                name, description, device_ip, mqtt_on_topic, mqtt_on_payload,
                mqtt_off_topic, mqtt_off_payload, mqtt_status_topic, mqtt_status_request_topic,
                mqtt_status_request_payload, mqtt_status_mode, mqtt_status_power_path,
                mqtt_status_on_value, mqtt_status_off_value, restart_delay_ms,
                last_status_payload, last_status_error
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        );
        $stmt->execute($insertValues);
        flash(t('device_created'));
    }

    redirect('index.php?page=devices');
}

if ($action === 'delete_device') {
    require_admin();
    $id = (int) ($_POST['id'] ?? 0);
    $stmt = db()->prepare('DELETE FROM devices WHERE id = ?');
    $stmt->execute([$id]);
    flash(t('device_deleted'));
    redirect('index.php?page=devices');
}

if ($action === 'save_user') {
    require_admin();
    $id = (int) ($_POST['id'] ?? 0);
    $username = trim($_POST['username'] ?? '');
    $password = (string) ($_POST['password'] ?? '');
    $role = $_POST['role'] === 'admin' ? 'admin' : 'user';

    if ($username === '') {
        flash(t('username_required'), 'error');
        redirect('index.php?page=users');
    }

    try {
        if ($id > 0) {
            if ($password !== '') {
                $stmt = db()->prepare('UPDATE users SET username = ?, role = ?, password_hash = ? WHERE id = ?');
                $stmt->execute([$username, $role, password_hash($password, PASSWORD_DEFAULT), $id]);
            } else {
                $stmt = db()->prepare('UPDATE users SET username = ?, role = ? WHERE id = ?');
                $stmt->execute([$username, $role, $id]);
            }
            flash(t('user_saved'));
        } else {
            if ($password === '') {
                flash(t('password_required_new_user'), 'error');
                redirect('index.php?page=users');
            }
            $stmt = db()->prepare('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)');
            $stmt->execute([$username, password_hash($password, PASSWORD_DEFAULT), $role]);
            flash(t('user_created'));
        }
    } catch (PDOException $exception) {
        flash(t('username_taken'), 'error');
    }

    redirect('index.php?page=users');
}

if ($action === 'delete_user') {
    require_admin();
    $id = (int) ($_POST['id'] ?? 0);
    if ($id === (int) current_user()['id']) {
        flash(t('cannot_delete_self'), 'error');
        redirect('index.php?page=users');
    }
    $stmt = db()->prepare('DELETE FROM users WHERE id = ?');
    $stmt->execute([$id]);
    flash(t('user_deleted'));
    redirect('index.php?page=users');
}

if ($action === 'save_assignments') {
    require_admin();
    $userId = (int) ($_POST['user_id'] ?? 0);
    $deviceIds = array_map('intval', $_POST['device_ids'] ?? []);

    db()->beginTransaction();
    db()->prepare('DELETE FROM device_user WHERE user_id = ?')->execute([$userId]);
    $stmt = db()->prepare('INSERT INTO device_user (device_id, user_id) VALUES (?, ?)');
    foreach ($deviceIds as $deviceId) {
        $stmt->execute([$deviceId, $userId]);
    }
    db()->commit();

    flash(t('assignments_saved'));
    redirect('index.php?page=assignments&user_id=' . $userId);
}

if ($action === 'save_mqtt_settings') {
    require_admin();

    $host = trim($_POST['mqtt_host'] ?? '');
    $port = max(1, min(65535, (int) ($_POST['mqtt_port'] ?? 1883)));
    $useCredentials = isset($_POST['mqtt_use_credentials']) ? '1' : '0';
    $username = trim($_POST['mqtt_username'] ?? '');
    $password = (string) ($_POST['mqtt_password'] ?? '');
    $timeout = max(1, min(30, (int) ($_POST['mqtt_status_timeout_seconds'] ?? 2)));
    $showDebugFields = isset($_POST['show_debug_fields']) ? '1' : '0';

    if ($host === '') {
        flash(t('mqtt_server_required'), 'error');
        redirect('index.php?page=mqtt');
    }

    save_app_setting('mqtt_host', $host);
    save_app_setting('mqtt_port', (string) $port);
    save_app_setting('mqtt_use_credentials', $useCredentials);
    save_app_setting('mqtt_username', $useCredentials === '1' ? $username : '');
    save_app_setting('show_debug_fields', $showDebugFields);

    if ($useCredentials === '1') {
        if ($password !== '') {
            save_app_setting('mqtt_password', $password);
        }
    } else {
        save_app_setting('mqtt_password', '');
    }

    save_app_setting('mqtt_status_timeout_seconds', (string) $timeout);

    flash(t('mqtt_saved'));
    redirect('index.php?page=mqtt');
}

if ($page !== 'login') {
    require_login();
}

$flash = flash();

function render_header(string $title): void
{
    $user = current_user();
    $locale = current_locale();
    $languages = supported_locales();
    ?>
    <!doctype html>
    <html lang="<?= e($locale) ?>">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title><?= e($title) ?> - Remote Power Manager</title>
        <link rel="stylesheet" href="style.css">
    </head>
    <body>
    <?php if ($user): ?>
        <header class="topbar">
            <div class="brand">Remote Power Manager</div>
            <nav class="nav">
                <a href="index.php"><?= e(t('dashboard')) ?></a>
                <?php if (is_admin()): ?>
                    <a href="index.php?page=devices"><?= e(t('devices')) ?></a>
                    <a href="index.php?page=users"><?= e(t('users')) ?></a>
                    <a href="index.php?page=assignments"><?= e(t('assignments')) ?></a>
                    <a href="index.php?page=mqtt">MQTT</a>
                    <a href="index.php?page=logs"><?= e(t('logs')) ?></a>
                <?php endif; ?>
                <span><?= e($user['username']) ?> (<?= e(t($user['role'])) ?>)</span>
                <form method="post" style="margin:0">
                    <input type="hidden" name="csrf_token" value="<?= e(csrf_token()) ?>">
                    <input type="hidden" name="action" value="save_language">
                    <label for="locale" style="display:none"><?= e(t('settings_language')) ?></label>
                    <select id="locale" name="locale" onchange="this.form.submit()">
                        <?php foreach ($languages as $languageCode => $languageLabel): ?>
                            <option value="<?= e($languageCode) ?>" <?= $locale === $languageCode ? 'selected' : '' ?>><?= e($languageLabel) ?></option>
                        <?php endforeach; ?>
                    </select>
                </form>
                <form method="post" style="margin:0">
                    <input type="hidden" name="csrf_token" value="<?= e(csrf_token()) ?>">
                    <input type="hidden" name="action" value="logout">
                    <button class="button-secondary" type="submit"><?= e(t('logout')) ?></button>
                </form>
            </nav>
        </header>
    <?php endif; ?>
    <main class="shell">
    <?php
}

function render_footer(): void
{
    ?>
    </main>
    </body>
    </html>
    <?php
}

function render_flash(?array $flash): void
{
    if (!$flash) {
        return;
    }
    $class = $flash['type'] === 'error' ? 'flash error' : 'flash';
    echo '<div class="' . e($class) . '">' . e($flash['message']) . '</div>';
}

if ($page === 'login') {
    render_header(t('login'));
    render_flash($flash);
    ?>
    <section class="panel login">
        <h1><?= e(t('login')) ?></h1>
        <form method="post">
            <input type="hidden" name="csrf_token" value="<?= e(csrf_token()) ?>">
            <input type="hidden" name="action" value="login">
            <label for="username"><?= e(t('username')) ?></label>
            <input id="username" name="username" required autocomplete="username">
            <label for="password"><?= e(t('password')) ?></label>
            <input id="password" name="password" type="password" required autocomplete="current-password">
            <div class="actions">
                <button type="submit"><?= e(t('sign_in')) ?></button>
            </div>
        </form>
    </section>
    <?php
    render_footer();
    exit;
}

$pageTitle = t('dashboard');
if ($page === 'devices') {
    $pageTitle = t('devices');
} elseif ($page === 'users') {
    $pageTitle = t('users');
} elseif ($page === 'assignments') {
    $pageTitle = t('assignments');
} elseif ($page === 'mqtt') {
    $pageTitle = 'MQTT';
} elseif ($page === 'logs') {
    $pageTitle = t('logs');
}
render_header($pageTitle);
render_flash($flash);

if ($page === 'dashboard') {
    $devices = devices_for_current_user();
    $showDebugFields = app_setting('show_debug_fields', '0') === '1';
    ?>
    <section class="panel">
        <h1><?= e(t('dashboard')) ?></h1>
        <p class="muted"><?= e(t('dashboard_intro')) ?></p>
        <p class="muted"><?= e(t('dashboard_auto_refresh')) ?></p>
    </section>
    <section class="grid">
        <?php foreach ($devices as $device): ?>
            <article class="panel device-card" data-device-id="<?= (int) $device['id'] ?>">
                <div>
                    <h2><?= e($device['name']) ?></h2>
                    <?php if ($device['description'] !== ''): ?>
                        <p class="muted"><?= e($device['description']) ?></p>
                    <?php endif; ?>
                    <div class="meta">
                        <div><?= e(t('socket')) ?>: <span class="badge <?= e(status_label($device['last_socket_status'])) ?>" data-role="socket-status"><?= e(status_text($device['last_socket_status'])) ?></span></div>
                        <div><?= e(t('ping')) ?> <?= e($device['device_ip'] ?: '-') ?>: <span class="badge <?= e(status_label($device['last_ping_status'])) ?>" data-role="ping-status"><?= e(status_text($device['last_ping_status'])) ?></span></div>
                        <div class="muted"><?= e(t('last_check')) ?>: <span data-role="checked-at"><?= e($device['last_checked_at'] ?: t('never')) ?></span></div>
                        <?php if ($showDebugFields): ?>
                            <div class="muted">MQTT Raw: <span data-role="status-payload"><?= e($device['last_status_payload'] ?: '-') ?></span></div>
                            <div class="muted">MQTT Info: <span data-role="status-error"><?= e($device['last_status_error'] ?: '-') ?></span></div>
                        <?php endif; ?>
                    </div>
                </div>
                <form method="post">
                    <input type="hidden" name="csrf_token" value="<?= e(csrf_token()) ?>">
                    <input type="hidden" name="action" value="switch">
                    <input type="hidden" name="device_id" value="<?= (int) $device['id'] ?>">
                    <div class="actions">
                        <button name="command" value="on" type="submit"><?= e(t('on')) ?></button>
                        <button name="command" value="off" class="button-secondary" type="submit"><?= e(t('off')) ?></button>
                        <button name="command" value="restart" class="button-danger" type="submit"><?= e(t('restart')) ?></button>
                        <button name="command" value="refresh" class="button-secondary" type="submit"><?= e(t('status')) ?></button>
                    </div>
                </form>
            </article>
        <?php endforeach; ?>
        <?php if (!$devices): ?>
            <div class="panel"><?= e(t('device_none_assigned')) ?></div>
        <?php endif; ?>
    </section>
    <script>
        (function () {
            var refreshUrl = 'index.php?page=status_data';
            var knownStatusClasses = ['status-ok', 'status-warn', 'status-bad', 'status-unknown'];

            function setBadgeState(node, nextClass, nextText) {
                if (!node) {
                    return;
                }

                knownStatusClasses.forEach(function (className) {
                    node.classList.remove(className);
                });

                node.classList.add(nextClass);
                node.textContent = nextText;
            }

            function refreshStatuses() {
                fetch(refreshUrl, {
                    headers: {
                        'X-Requested-With': 'XMLHttpRequest'
                    },
                    credentials: 'same-origin'
                })
                    .then(function (response) {
                        if (!response.ok) {
                            throw new Error('Statusabruf fehlgeschlagen');
                        }

                        return response.json();
                    })
                    .then(function (payload) {
                        (payload.devices || []).forEach(function (device) {
                            var card = document.querySelector('[data-device-id="' + device.id + '"]');
                            if (!card) {
                                return;
                            }

                            setBadgeState(card.querySelector('[data-role="socket-status"]'), device.socket_class, device.socket_text);
                            setBadgeState(card.querySelector('[data-role="ping-status"]'), device.ping_class, device.ping_text);

                            var checkedAt = card.querySelector('[data-role="checked-at"]');
                            if (checkedAt) {
                                checkedAt.textContent = device.checked_at;
                            }

                            var statusPayload = card.querySelector('[data-role="status-payload"]');
                            if (statusPayload) {
                                statusPayload.textContent = device.status_payload || '-';
                            }

                            var statusError = card.querySelector('[data-role="status-error"]');
                            if (statusError) {
                                statusError.textContent = device.status_error || '-';
                            }
                        });
                    })
                    .catch(function () {
                    });
            }

            refreshStatuses();
            window.setInterval(refreshStatuses, 30000);
        })();
    </script>
    <?php
} elseif ($page === 'devices') {
    require_admin();
    $editId = (int) ($_GET['edit'] ?? 0);
    $editDevice = [
        'id' => 0,
        'name' => '',
        'description' => '',
        'device_ip' => '',
        'mqtt_on_topic' => '',
        'mqtt_on_payload' => 'ON',
        'mqtt_off_topic' => '',
        'mqtt_off_payload' => 'OFF',
        'mqtt_status_topic' => '',
        'mqtt_status_request_topic' => '',
        'mqtt_status_request_payload' => '',
        'mqtt_status_mode' => 'plain',
        'mqtt_status_power_path' => 'POWER',
        'mqtt_status_on_value' => 'ON',
        'mqtt_status_off_value' => 'OFF',
        'restart_delay_ms' => 15000,
    ];
    if ($editId > 0) {
        $stmt = db()->prepare('SELECT * FROM devices WHERE id = ?');
        $stmt->execute([$editId]);
        $editDevice = $stmt->fetch() ?: $editDevice;
    }
    $devices = db()->query('SELECT * FROM devices ORDER BY name')->fetchAll();
    ?>
    <section class="panel">
        <h1><?= e($editId > 0 ? t('edit_device') : t('create_device')) ?></h1>
        <form method="post">
            <input type="hidden" name="csrf_token" value="<?= e(csrf_token()) ?>">
            <input type="hidden" name="action" value="save_device">
            <input type="hidden" name="id" value="<?= (int) $editDevice['id'] ?>">
            <div class="form-grid">
                <div>
                    <label for="name"><?= e(t('name')) ?></label>
                    <input id="name" name="name" value="<?= e($editDevice['name']) ?>" required>
                </div>
                <div>
                    <label for="device_ip"><?= e(t('device_ip')) ?></label>
                    <input id="device_ip" name="device_ip" value="<?= e($editDevice['device_ip']) ?>" placeholder="192.168.1.20">
                </div>
            </div>
            <label for="description"><?= e(t('description')) ?></label>
            <textarea id="description" name="description"><?= e($editDevice['description']) ?></textarea>
            <div class="form-grid">
                <div>
                    <label for="mqtt_on_topic"><?= e(t('mqtt_on_topic')) ?></label>
                    <input id="mqtt_on_topic" name="mqtt_on_topic" value="<?= e($editDevice['mqtt_on_topic']) ?>" required>
                </div>
                <div>
                    <label for="mqtt_on_payload"><?= e(t('mqtt_on_payload')) ?></label>
                    <input id="mqtt_on_payload" name="mqtt_on_payload" value="<?= e($editDevice['mqtt_on_payload']) ?>">
                </div>
                <div>
                    <label for="mqtt_off_topic"><?= e(t('mqtt_off_topic')) ?></label>
                    <input id="mqtt_off_topic" name="mqtt_off_topic" value="<?= e($editDevice['mqtt_off_topic']) ?>" required>
                </div>
                <div>
                    <label for="mqtt_off_payload"><?= e(t('mqtt_off_payload')) ?></label>
                    <input id="mqtt_off_payload" name="mqtt_off_payload" value="<?= e($editDevice['mqtt_off_payload']) ?>">
                </div>
                <div>
                    <label for="mqtt_status_topic"><?= e(t('mqtt_status_topic')) ?></label>
                    <input id="mqtt_status_topic" name="mqtt_status_topic" value="<?= e($editDevice['mqtt_status_topic']) ?>">
                </div>
                <div>
                    <label for="mqtt_status_request_topic"><?= e(t('mqtt_status_request_topic')) ?></label>
                    <input id="mqtt_status_request_topic" name="mqtt_status_request_topic" value="<?= e($editDevice['mqtt_status_request_topic']) ?>" placeholder="36/Hobbyraum/Lasercutter1/cmnd/STATE">
                </div>
                <div>
                    <label for="mqtt_status_request_payload"><?= e(t('mqtt_status_request_payload')) ?></label>
                    <input id="mqtt_status_request_payload" name="mqtt_status_request_payload" value="<?= e($editDevice['mqtt_status_request_payload']) ?>" placeholder="optional">
                </div>
                <div>
                    <label for="mqtt_status_mode"><?= e(t('mqtt_status_mode')) ?></label>
                    <select id="mqtt_status_mode" name="mqtt_status_mode">
                        <option value="plain" <?= $editDevice['mqtt_status_mode'] === 'plain' ? 'selected' : '' ?>><?= e(t('mqtt_status_mode_plain')) ?></option>
                        <option value="structured" <?= $editDevice['mqtt_status_mode'] === 'structured' ? 'selected' : '' ?>><?= e(t('mqtt_status_mode_structured')) ?></option>
                    </select>
                </div>
                <div>
                    <label for="mqtt_status_power_path"><?= e(t('mqtt_status_power_path')) ?></label>
                    <input id="mqtt_status_power_path" name="mqtt_status_power_path" value="<?= e($editDevice['mqtt_status_power_path']) ?>" placeholder="POWER">
                </div>
                <div>
                    <label for="restart_delay_ms"><?= e(t('device_restart_delay_label')) ?></label>
                    <input id="restart_delay_ms" name="restart_delay_ms" type="number" min="0" value="<?= (int) $editDevice['restart_delay_ms'] ?>">
                </div>
                <div>
                    <label for="mqtt_status_on_value"><?= e(t('mqtt_status_on_value')) ?></label>
                    <input id="mqtt_status_on_value" name="mqtt_status_on_value" value="<?= e($editDevice['mqtt_status_on_value']) ?>">
                </div>
                <div>
                    <label for="mqtt_status_off_value"><?= e(t('mqtt_status_off_value')) ?></label>
                    <input id="mqtt_status_off_value" name="mqtt_status_off_value" value="<?= e($editDevice['mqtt_status_off_value']) ?>">
                </div>
            </div>
            <div class="actions">
                <button type="submit"><?= e(t('save')) ?></button>
                <?php if ($editId > 0): ?>
                    <a class="button button-secondary" href="index.php?page=devices"><?= e(t('cancel')) ?></a>
                <?php endif; ?>
            </div>
        </form>
    </section>
    <section class="panel">
        <h2><?= e(t('devices')) ?></h2>
        <table>
            <thead><tr><th><?= e(t('name')) ?></th><th><?= e(t('ip')) ?></th><th>MQTT On/Off</th><th><?= e(t('status')) ?></th><th></th></tr></thead>
            <tbody>
            <?php foreach ($devices as $device): ?>
                <tr>
                    <td><?= e($device['name']) ?></td>
                    <td><?= e($device['device_ip']) ?></td>
                    <td><?= e($device['mqtt_on_topic']) ?><br><?= e($device['mqtt_off_topic']) ?></td>
                    <td><?= e($device['mqtt_status_topic'] ?: '-') ?></td>
                    <td>
                        <div class="actions">
                            <a class="button button-secondary" href="index.php?page=devices&edit=<?= (int) $device['id'] ?>"><?= e(t('edit')) ?></a>
                            <form method="post" onsubmit="return confirm('<?= e(t('device_delete_confirm')) ?>')">
                                <input type="hidden" name="csrf_token" value="<?= e(csrf_token()) ?>">
                                <input type="hidden" name="action" value="delete_device">
                                <input type="hidden" name="id" value="<?= (int) $device['id'] ?>">
                                <button class="button-danger" type="submit"><?= e(t('delete')) ?></button>
                            </form>
                        </div>
                    </td>
                </tr>
            <?php endforeach; ?>
            </tbody>
        </table>
    </section>
    <?php
} elseif ($page === 'users') {
    require_admin();
    $editId = (int) ($_GET['edit'] ?? 0);
    $editUser = ['id' => 0, 'username' => '', 'role' => 'user'];
    if ($editId > 0) {
        $stmt = db()->prepare('SELECT id, username, role FROM users WHERE id = ?');
        $stmt->execute([$editId]);
        $editUser = $stmt->fetch() ?: $editUser;
    }
    $users = db()->query('SELECT id, username, role, created_at FROM users ORDER BY username')->fetchAll();
    ?>
    <section class="panel">
        <h1><?= e($editId > 0 ? t('edit_user') : t('create_user')) ?></h1>
        <form method="post">
            <input type="hidden" name="csrf_token" value="<?= e(csrf_token()) ?>">
            <input type="hidden" name="action" value="save_user">
            <input type="hidden" name="id" value="<?= (int) $editUser['id'] ?>">
            <div class="form-grid">
                <div>
                    <label for="username"><?= e(t('username')) ?></label>
                    <input id="username" name="username" value="<?= e($editUser['username']) ?>" required>
                </div>
                <div>
                    <label for="role"><?= e(t('role')) ?></label>
                    <select id="role" name="role">
                        <option value="user" <?= $editUser['role'] === 'user' ? 'selected' : '' ?>><?= e(t('user')) ?></option>
                        <option value="admin" <?= $editUser['role'] === 'admin' ? 'selected' : '' ?>><?= e(t('admin')) ?></option>
                    </select>
                </div>
                <div>
                    <label for="password"><?= e($editId > 0 ? t('password_optional') : t('password')) ?></label>
                    <input id="password" name="password" type="password" <?= $editId > 0 ? '' : 'required' ?>>
                </div>
            </div>
            <div class="actions">
                <button type="submit"><?= e(t('save')) ?></button>
                <?php if ($editId > 0): ?>
                    <a class="button button-secondary" href="index.php?page=users"><?= e(t('cancel')) ?></a>
                <?php endif; ?>
            </div>
        </form>
    </section>
    <section class="panel">
        <h2><?= e(t('users')) ?></h2>
        <table>
            <thead><tr><th><?= e(t('name')) ?></th><th><?= e(t('role')) ?></th><th><?= e(t('created_at')) ?></th><th></th></tr></thead>
            <tbody>
            <?php foreach ($users as $user): ?>
                <tr>
                    <td><?= e($user['username']) ?></td>
                    <td><?= e(t($user['role'])) ?></td>
                    <td><?= e($user['created_at']) ?></td>
                    <td>
                        <div class="actions">
                            <a class="button button-secondary" href="index.php?page=users&edit=<?= (int) $user['id'] ?>"><?= e(t('edit')) ?></a>
                            <form method="post" onsubmit="return confirm('<?= e(t('user_delete_confirm')) ?>')">
                                <input type="hidden" name="csrf_token" value="<?= e(csrf_token()) ?>">
                                <input type="hidden" name="action" value="delete_user">
                                <input type="hidden" name="id" value="<?= (int) $user['id'] ?>">
                                <button class="button-danger" type="submit"><?= e(t('delete')) ?></button>
                            </form>
                        </div>
                    </td>
                </tr>
            <?php endforeach; ?>
            </tbody>
        </table>
    </section>
    <?php
} elseif ($page === 'assignments') {
    require_admin();
    $users = db()->query('SELECT id, username, role FROM users ORDER BY username')->fetchAll();
    $devices = db()->query('SELECT id, name FROM devices ORDER BY name')->fetchAll();
    $selectedUserId = (int) ($_GET['user_id'] ?? ($users[0]['id'] ?? 0));
    $assigned = [];
    if ($selectedUserId > 0) {
        $stmt = db()->prepare('SELECT device_id FROM device_user WHERE user_id = ?');
        $stmt->execute([$selectedUserId]);
        $assigned = array_map('intval', array_column($stmt->fetchAll(), 'device_id'));
    }
    ?>
    <section class="panel">
        <h1><?= e(t('assignments')) ?></h1>
        <form method="get">
            <input type="hidden" name="page" value="assignments">
            <label for="user_id"><?= e(t('users')) ?></label>
            <select id="user_id" name="user_id" onchange="this.form.submit()">
                <?php foreach ($users as $user): ?>
                    <option value="<?= (int) $user['id'] ?>" <?= $selectedUserId === (int) $user['id'] ? 'selected' : '' ?>>
                        <?= e($user['username']) ?> (<?= e(t($user['role'])) ?>)
                    </option>
                <?php endforeach; ?>
            </select>
        </form>
        <?php if ($selectedUserId > 0): ?>
            <form method="post">
                <input type="hidden" name="csrf_token" value="<?= e(csrf_token()) ?>">
                <input type="hidden" name="action" value="save_assignments">
                <input type="hidden" name="user_id" value="<?= $selectedUserId ?>">
                <div class="grid" style="margin-top:16px">
                    <?php foreach ($devices as $device): ?>
                        <label class="assignment-item">
                            <input type="checkbox" name="device_ids[]" value="<?= (int) $device['id'] ?>" <?= in_array((int) $device['id'], $assigned, true) ? 'checked' : '' ?>>
                            <?= e($device['name']) ?>
                        </label>
                    <?php endforeach; ?>
                </div>
                <div class="actions">
                    <button type="submit"><?= e(t('save_assignments')) ?></button>
                </div>
            </form>
        <?php endif; ?>
    </section>
    <?php
} elseif ($page === 'mqtt') {
    require_admin();
    $mqtt = mqtt_config();
    $showDebugFields = app_setting('show_debug_fields', '0') === '1';
    ?>
    <section class="panel">
        <h1><?= e(t('mqtt_server')) ?></h1>
        <form method="post">
            <input type="hidden" name="csrf_token" value="<?= e(csrf_token()) ?>">
            <input type="hidden" name="action" value="save_mqtt_settings">
            <div class="form-grid">
                <div>
                    <label for="mqtt_host"><?= e(t('server_host')) ?></label>
                    <input id="mqtt_host" name="mqtt_host" value="<?= e($mqtt['host']) ?>" placeholder="127.0.0.1" required>
                </div>
                <div>
                    <label for="mqtt_port"><?= e(t('port')) ?></label>
                    <input id="mqtt_port" name="mqtt_port" type="number" min="1" max="65535" value="<?= (int) $mqtt['port'] ?>" required>
                </div>
                <div>
                    <label for="mqtt_status_timeout_seconds"><?= e(t('status_timeout_seconds')) ?></label>
                    <input id="mqtt_status_timeout_seconds" name="mqtt_status_timeout_seconds" type="number" min="1" max="30" value="<?= (int) $mqtt['status_timeout_seconds'] ?>">
                </div>
            </div>
            <label class="assignment-item" style="margin-top:16px">
                <input type="checkbox" name="mqtt_use_credentials" value="1" <?= $mqtt['use_credentials'] ? 'checked' : '' ?>>
                <?= e(t('mqtt_use_credentials')) ?>
            </label>
            <label class="assignment-item" style="margin-top:16px">
                <input type="checkbox" name="show_debug_fields" value="1" <?= $showDebugFields ? 'checked' : '' ?>>
                <?= e(t('show_debug_fields')) ?>
            </label>
            <div class="form-grid">
                <div>
                    <label for="mqtt_username"><?= e(t('username')) ?></label>
                    <input id="mqtt_username" name="mqtt_username" value="<?= e($mqtt['username']) ?>" autocomplete="off">
                </div>
                <div>
                    <label for="mqtt_password"><?= e(t('password')) ?></label>
                    <input id="mqtt_password" name="mqtt_password" type="password" placeholder="<?= $mqtt['password'] !== '' ? e(t('leave_unchanged')) : '' ?>" autocomplete="new-password">
                </div>
            </div>
            <div class="actions">
                <button type="submit"><?= e(t('save_mqtt')) ?></button>
            </div>
        </form>
    </section>
    <section class="panel">
        <h2><?= e(t('current_configuration')) ?></h2>
        <div class="meta">
            <div>Broker: <strong><?= e($mqtt['host']) ?>:<?= (int) $mqtt['port'] ?></strong></div>
            <div><?= e(t('credentials')) ?>: <strong><?= $mqtt['use_credentials'] ? e(t('active')) : e(t('inactive')) ?></strong></div>
            <div><?= e(t('status')) ?> Timeout: <strong><?= (int) $mqtt['status_timeout_seconds'] ?> s</strong></div>
        </div>
    </section>
    <?php
} elseif ($page === 'logs') {
    require_admin();
    $logs = db()->query(
        'SELECT l.*, u.username, d.name AS device_name
         FROM action_log l
         LEFT JOIN users u ON u.id = l.user_id
         LEFT JOIN devices d ON d.id = l.device_id
         ORDER BY l.created_at DESC
         LIMIT 100'
    )->fetchAll();
    ?>
    <section class="panel">
        <h1><?= e(t('logs')) ?></h1>
        <table>
            <thead><tr><th><?= e(t('time')) ?></th><th><?= e(t('users')) ?></th><th><?= e(t('devices')) ?></th><th><?= e(t('action')) ?></th><th><?= e(t('result')) ?></th></tr></thead>
            <tbody>
            <?php foreach ($logs as $log): ?>
                <tr>
                    <td><?= e($log['created_at']) ?></td>
                    <td><?= e($log['username'] ?? '-') ?></td>
                    <td><?= e($log['device_name'] ?? '-') ?></td>
                    <td><?= e($log['action']) ?></td>
                    <td><?= e($log['result']) ?></td>
                </tr>
            <?php endforeach; ?>
            </tbody>
        </table>
    </section>
    <?php
}

render_footer();
