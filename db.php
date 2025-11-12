<?php
$conn = new mysqli(
    getenv('DB_HOST'),
    getenv('DB_NAME'),
    getenv('DB_PASSWORD'),
    getenv('DB_PORT'),
    getenv('DB_USER')
);

if ($conn->connect_error) {
    die("Error de conexión: " . $conn->connect_error);
}
}
?>


