<?php

return [
    'database' => [
        'driver' => 'sqlite',

        'sqlite' => [
            'path' => __DIR__ . '/data/app.sqlite',
        ],

        'mysql' => [
            'host' => '127.0.0.1',
            'port' => 3306,
            'database' => 'remote_power_manager',
            'username' => 'root',
            'password' => '',
            'charset' => 'utf8mb4',
        ],
    ],

    'mqtt' => [
        'host' => '127.0.0.1',
        'port' => 1883,
        'username' => '',
        'password' => '',
        'client_id_prefix' => 'remote-power-manager',
        'status_timeout_seconds' => 2,
    ],

    'initial_admin' => [
        'username' => 'admin',
        'password' => 'admin123',
    ],
];
