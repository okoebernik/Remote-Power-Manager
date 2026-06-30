<?php

declare(strict_types=1);

session_start();

require_once __DIR__ . '/Database.php';
require_once __DIR__ . '/helpers.php';

try {
    Database::pdo();
} catch (RuntimeException $exception) {
    http_response_code(500);
    ?>
    <!doctype html>
    <html lang="de">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Datenbankfehler</title>
        <style>
            body { font-family: Arial, Helvetica, sans-serif; margin: 40px; line-height: 1.5; color: #17202a; }
            .box { max-width: 860px; border: 1px solid #d9dee7; border-radius: 8px; padding: 20px; }
            code, pre { background: #f4f6f8; border-radius: 6px; }
            code { padding: 2px 5px; }
            pre { padding: 12px; overflow: auto; }
        </style>
    </head>
    <body>
        <div class="box">
            <h1>Datenbankverbindung nicht möglich</h1>
            <p><?= htmlspecialchars($exception->getMessage(), ENT_QUOTES, 'UTF-8') ?></p>
            <p>Prüfe <code>config.php</code>. Wenn SQLite nicht installiert ist, stelle die Anwendung auf MySQL/MariaDB um.</p>
            <pre>'database' =&gt; [
    'driver' =&gt; 'mysql',
    'mysql' =&gt; [
        'host' =&gt; '127.0.0.1',
        'port' =&gt; 3306,
        'database' =&gt; 'remote_power_manager',
        'username' =&gt; 'root',
        'password' =&gt; '',
        'charset' =&gt; 'utf8mb4',
    ],
],</pre>
        </div>
    </body>
    </html>
    <?php
    exit;
}
